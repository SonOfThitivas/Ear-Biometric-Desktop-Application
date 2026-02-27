import pyrealsense2 as rs
import numpy as np
import cv2
import base64
import time
import json
import sys
import os
import threading
import logging
import traceback
from datetime import datetime, timedelta, timezone
from ultralytics import YOLO
from PIL import Image
from dotenv import load_dotenv

global save_in_prog
save_in_prog = False

sys.stdout.reconfigure(line_buffering=True)
# --- SETUP LOGGING ---
logging.basicConfig(
    filename='camera_debug.log', 
    level=logging.DEBUG, 
    format='%(asctime)s - [%(levelname)s] - %(message)s'
)

def log_console(msg):
    sys.stderr.write(f"[DEBUG] {msg}\n")
    sys.stderr.flush()

def log_error(e, context=""):
    err_msg = f"ERROR in {context}: {str(e)}"
    logging.error(err_msg)
    logging.error(traceback.format_exc())
    log_console(err_msg)

load_dotenv()

# --- Folders ---
RGB_FOLDER = os.getenv("VITE_RGB_FOLDER", "rgb_captures")
DEPTH_FOLDER = os.getenv("VITE_DEPTH_FOLDER", "depth_captures")
PLY_FOLDER = os.getenv("VITE_PLY_FOLDER", "ply_models")
EMBED_FOLDER = os.getenv("VITE_EMBED_FOLDER", "embeddings")
PATIENTS_FOLDER = os.getenv("VITE_PATIENTS_FOLDER", "patients")
DEBUG_FOLDER = os.getenv("VITE_DEBUG_FOLDER", "debug")

try:
    for folder in [RGB_FOLDER, DEPTH_FOLDER, PLY_FOLDER, EMBED_FOLDER, PATIENTS_FOLDER, DEBUG_FOLDER]:
        if folder: os.makedirs(folder, exist_ok=True)
except Exception as e:
    log_error(e, "Folder Creation")

# --- Model ---
try:
    logging.info("Loading models...")
    # 1. Detection Model
    DETECT_MODEL_PATH = os.getenv("VITE_YOLO_MODEL_DETECT") 
    logging.debug(f"Loading Detection Model from: {DETECT_MODEL_PATH}")
    yolo_detect = YOLO(DETECT_MODEL_PATH)

    # 2. Segmentation Model
    SEG_MODEL_PATH = os.getenv("VITE_YOLO_MODEL") 
    logging.debug(f"Loading Segmentation Model from: {SEG_MODEL_PATH}")
    yolo_seg = YOLO(SEG_MODEL_PATH)
    
    logging.info("Models loaded successfully.")
except Exception as e:
    log_error(e, "Model Loading")
    sys.exit(1)

# Flags
save_flag = False
hn_value = None
mode_value = None
frame_count = 0
YOLO_INTERVAL = 10
last_bbox = None

# --- THREAD LOCK FOR PRINTING (Crucial for Frontend Stability) ---
print_lock = threading.Lock()

def safe_print(data_dict):
    """Thread-safe print function to prevent JSON collision"""
    with print_lock:
        log_data = data_dict.copy()
        if "saved" in log_data:
            logging.info(f"STDOUT: {json.dumps(log_data)}")
            print(json.dumps(data_dict), flush=True)
        
        print(json.dumps(data_dict), flush=True)
        

def listen_to_nodejs():
    global save_flag, hn_value, mode_value
    logging.info("Started Node.js listener thread.")
    while True:
        try:
            line = sys.stdin.readline()
            if line:
                data = json.loads(line)
                if data.get("cmd") == "save":
                    logging.info(f"Received SAVE command for HN: {data.get('hn')}")
                    save_flag = True
                    hn_value = data.get("hn")
                    mode_value = data.get("mode")
        except Exception as e:
            log_error(e, "NodeJS Listener")

input_thread = threading.Thread(target=listen_to_nodejs, daemon=True)
input_thread.start()

# --- RealSense ---
try:
    logging.info("Starting RealSense Pipeline...")
    pipeline = rs.pipeline()
    config = rs.config()
    config.enable_stream(rs.stream.depth, 640, 480, rs.format.z16, 30)
    config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)
    align = rs.align(rs.stream.color)
    pc = rs.pointcloud()
    logging.info("RealSense configured.")
except Exception as e:
    log_error(e, "RealSense Setup")
    sys.exit(1)

# ---------------------------------------------------------
# HELPER FUNCTIONS (DEPTH & REALTIME)
# ---------------------------------------------------------
def get_robust_center_distance(depth_image):
    try:
        h, w = depth_image.shape
        cx, cy = w // 2, h // 2
        crop = depth_image[cy-10:cy+10, cx-10:cx+10].astype(float)
        valid_pixels = crop[(crop > 0) & (crop < 3000)]
        if valid_pixels.size == 0: return 0.0
        return np.median(valid_pixels) / 1000.0
    except Exception as e: 
        return 0.0

def depth_gradient_check_fast(depth_image, bbox):
    try:
        x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
        h, w = depth_image.shape
        x1, x2 = max(0, x1), min(w, x2)
        y1, y2 = max(0, y1), min(h, y2)

        if x2 <= x1 or y2 <= y1: return None

        crop = depth_image[y1:y2, x1:x2].astype(float)
        valid_mask = (crop > 0) & (crop < 1000)
        
        valid_count = np.sum(valid_mask)
        if valid_count < 50: return None

        cx = (x2 - x1) // 2
        cy = (y2 - y1) // 2

        l_mean = np.mean(crop[:, :cx][valid_mask[:, :cx]]) if np.any(valid_mask[:, :cx]) else 0
        r_mean = np.mean(crop[:, cx:][valid_mask[:, cx:]]) if np.any(valid_mask[:, cx:]) else 0
        t_mean = np.mean(crop[:cy, :][valid_mask[:cy, :]]) if np.any(valid_mask[:cy, :]) else 0
        b_mean = np.mean(crop[cy:, :][valid_mask[cy:, :]]) if np.any(valid_mask[cy:, :]) else 0

        if l_mean == 0 or r_mean == 0 or t_mean == 0 or b_mean == 0: return None

        h_diff = (l_mean - r_mean) / 1000.0
        v_diff = (t_mean - b_mean) / 1000.0

        if frame_count % 30 == 0:
            logging.debug(f"Depth Grads -> H: {h_diff:.4f}, V: {v_diff:.4f}")

        TH = 0.005
        h_msg = "OK"
        if abs(h_diff) > TH:
            h_msg = "ขยับ ซ้าย" if h_diff > 0 else "ขยับ ขวา"

        v_msg = "OK"
        if abs(v_diff) > TH:
            v_msg = "ขยับ ขึ้น ถ่ายกดลง" if v_diff > 0 else "ขยับ ลง ถ่ายเสย"

        return h_diff, v_diff, h_msg, v_msg

    except Exception as e: 
        log_error(e, "depth_gradient_check_fast")
        return None

# ---------------------------------------------------------
# NEW: INTELLIGENT ALIGNMENT & PREPROCESSING LOGIC
# ---------------------------------------------------------
def pad_to_square_replicate(image):
    """ Pads image to square using REPLICATE (smearing edges) instead of black pixels. """
    h, w = image.shape[:2]
    if h == w: return image
    size = max(h, w)
    top = (size - h) // 2
    bottom = size - h - top
    left = (size - w) // 2
    right = size - w - left
    return cv2.copyMakeBorder(image, top, bottom, left, right, cv2.BORDER_REPLICATE)

def rotate_image_replicate(image, angle):
    """ Rotates image filling corners with smeared pixels. """
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

def scale_crop_pad_replicate(image, target_h=256, target_w=128):
    """ Resizes and pads to final dimensions maximizing the ear size (No 5% padding). """
    h, w = image.shape[:2]
    
    # --- FIX: Removed padding_pct to stop shrinking the ear ---
    avail_w = target_w
    avail_h = target_h
    
    scale = min(avail_w / w, avail_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    
    mean_color = cv2.mean(resized)[:3]
    canvas = np.full((target_h, target_w, 3), mean_color, dtype=np.uint8)
    
    start_x = (target_w - new_w) // 2
    start_y = (target_h - new_h) // 2
    canvas[start_y:start_y+new_h, start_x:start_x+new_w] = resized
    return canvas

def clean_mask_background_soft(image, mask):
    """
    Advanced blending: 
    1. Erodes (Shaves) the mask to remove dark 'shadow rims'.
    2. Uses a SOFT mask to blend the ear into the background.
    """
    # 1. Morphological OPEN: Removes thin spikes/hair
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask_clean = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)
    
    # --- NEW: AGGRESSIVE EROSION (The "Shave") ---
    # Shrink mask by 4 pixels to cut off the dark shadow edges
    erode_kernel = np.ones((3, 3), np.uint8)
    mask_clean = cv2.erode(mask_clean, erode_kernel, iterations=4) 
    # ---------------------------------------------
    
    # 2. Gaussian Blur the MASK to create soft edges (Feathering)
    mask_soft = cv2.GaussianBlur(mask_clean, (9, 9), 0)
    
    # Normalize mask to 0.0 - 1.0 range
    alpha = mask_soft.astype(float) / 255.0

    # Ensure Alpha is 3-Channels to match Image (H,W,3)
    if len(alpha.shape) == 2:
        alpha = cv2.merge([alpha, alpha, alpha])
    
    # 3. Create the solid Skin-Tone background
    # Compute mean color only from the BRIGHT part of the ear (mask_clean)
    mean_color = cv2.mean(image, mask=mask_clean)[:3]
    background = np.full_like(image, mean_color, dtype=np.uint8)
    
    # 4. Standard Alpha Blending Equation
    foreground = image.astype(float)
    background = background.astype(float)
    
    foreground_part = cv2.multiply(alpha, foreground)
    beta = 1.0 - alpha
    background_part = cv2.multiply(beta, background)
    
    combined = cv2.add(foreground_part, background_part)
    return combined.astype(np.uint8), mask_clean

def align_ear_robust(image, mask):
    try:
        # 1. Apply Soft Blending and get the cleaned mask
        clean_image, clean_mask = clean_mask_background_soft(image, mask)
        
        # 2. Pad to square using replicate
        mask_sq = pad_to_square_replicate(clean_mask)
        image_sq = pad_to_square_replicate(clean_image)
        
        contours, _ = cv2.findContours(mask_sq, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours: return clean_image
        
        c = max(contours, key=cv2.contourArea)
        if len(c) < 5: return clean_image
        
        (center_x, center_y), (MA, ma), angle = cv2.fitEllipse(c)
        rotation_angle = angle if angle < 90 else angle - 180
        
        # 3. Rotate Image AND Mask
        rotated_ear = rotate_image_replicate(image_sq, rotation_angle)
        rotated_mask = rotate_image_replicate(mask_sq, rotation_angle)
        
        # --- NEW STEP: TIGHT CROP AFTER ROTATION ---
        # Get bounding box of the actual ear content (ignoring the massive padded background)
        x, y, w, h = cv2.boundingRect(rotated_mask)
        if w > 0 and h > 0:
            rotated_ear = rotated_ear[y:y+h, x:x+w]
        
        # 4. Final Scale (Scales the EAR CONTENT to fit the frame)
        final_ear = scale_crop_pad_replicate(rotated_ear, target_h=256, target_w=128)
        
        return final_ear
    except Exception as e:
        log_error(e, "align_ear_robust")
        return image

# ---------------------------------------------------------
# NEW: EMBEDDING EXTRACTION LOGIC
# ---------------------------------------------------------
def apply_preprocessing(bgr_image):
    """ CLAHE + Gaussian Blur to reduce noise """
    if bgr_image.shape[2] == 4: bgr_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGRA2BGR)
    hsv = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    v_clahe = clahe.apply(v_channel)
    processed = cv2.cvtColor(v_clahe, cv2.COLOR_GRAY2BGR)
    
    # GAUSSIAN BLUR (Crucial for noise reduction)
    processed = cv2.GaussianBlur(processed, (5, 5), 0)
    return processed

def get_hog_embedding_high_dim(image):
    """ High Dimension HOG (approx 3780 dims) with 50% Overlap """
    resize_dim = (128, 256) 
    img_resized = cv2.resize(image, resize_dim)
    
    if len(img_resized.shape) == 3:
        gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_resized

    hog = cv2.HOGDescriptor(
        _winSize=(128, 256),
        _blockSize=(32, 32),
        _blockStride=(16, 16), # 50% Overlap
        _cellSize=(16, 16),
        _nbins=9
    )
    
    features = hog.compute(gray).flatten()
    norm = np.linalg.norm(features)
    if norm > 0: features /= norm
    return features

def extract_embedding(ear_crop):
    try:
        if ear_crop is None: return None
        preprocessed_img = apply_preprocessing(ear_crop)
        embedding = get_hog_embedding_high_dim(preprocessed_img)
        return embedding
    except Exception as e:
        log_error(e, "extract_embedding")
        return None

# ---------------------------------------------------------
# WORKER FUNCTIONS
# ---------------------------------------------------------
def detect_ear(color_image):
    try:
        rgb = cv2.cvtColor(color_image, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        
        results = yolo_detect.predict(source=pil_img, verbose=False)[0]
        
        if len(results.boxes) == 0: return None
            
        box = results.boxes[0]
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(float)
        score = float(box.conf[0])
        
        if frame_count % 30 == 0:
            logging.debug(f"Ear Detected: Score {score:.2f}")
            
        return {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2), "score": score}
    except Exception as e:
        log_error(e, "detect_ear")
        return None

def expand_bbox(bbox, scale, img_width, img_height):
    x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
    w, h = x2 - x1, y2 - y1
    cx, cy = x1 + w / 2, y1 + h / 2
    new_w, new_h = w * scale, h * scale
    return (max(0, int(cx - new_w / 2)), max(0, int(cy - new_h / 2)), 
            min(img_width - 1, int(cx + new_w / 2)), min(img_height - 1, int(cy + new_h / 2)))

def save_worker_thread(color_img, depth_img, points_ply, timestamp, hn, mode, bbox):
    try:
        logging.info(f"Save Worker Started for TS: {timestamp}")

        # --- NEW DATE FORMATTING LOGIC ---
        now_utc = datetime.now(timezone.utc)
        tz_offset = timedelta(hours=7)
        now_bkk = now_utc + tz_offset
        formatted_date = now_bkk.strftime("%d-%m-%Y_%H-%M-%S")
        
        folder_path = f"{PATIENTS_FOLDER}/{hn}_{mode}/{formatted_date}"
        os.makedirs(folder_path, exist_ok=True)
        # --------------------------------

        # 1. Save Raw Images
        cv2.imwrite(f"{RGB_FOLDER}/rgb_{timestamp}.jpg", color_img)
        depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_img, alpha=0.03), cv2.COLORMAP_JET)
        cv2.imwrite(f"{DEPTH_FOLDER}/depth_{timestamp}.png", depth_colormap)

        if DEBUG_FOLDER:
            cv2.imwrite(f"{DEBUG_FOLDER}/raw_{timestamp}.jpg", color_img)

        if bbox:
            h, w, _ = color_img.shape
            x1, y1, x2, y2 = expand_bbox(bbox, 1.5, w, h)
            ear_crop = color_img[y1:y2, x1:x2]
            
            if ear_crop.size > 0:
                logging.debug("Running Segmentation on crop...")
                results = yolo_seg(ear_crop, verbose=False, retina_masks=True)
                embedding_input = ear_crop
                
                if results[0].masks:
                    try:
                        mask_data = results[0].masks.data[0].cpu().numpy()
                        mask = cv2.resize(mask_data, (ear_crop.shape[1], ear_crop.shape[0]))
                        mask_binary = (mask > 0.5).astype(np.uint8) * 255
                        
                        # --- UPDATED: Pass raw crop + mask to robust alignment ---
                        embedding_input = align_ear_robust(ear_crop, mask_binary)
                        
                        # Debug: Save clean background check
                        if DEBUG_FOLDER:
                            check_bg, _ = clean_mask_background_soft(ear_crop, mask_binary)
                            cv2.imwrite(f"{DEBUG_FOLDER}/clean_bg_{timestamp}.png", check_bg)

                    except Exception as align_e:
                        log_error(align_e, "Alignment inside worker")

                # Save Aligned Ear
                cv2.imwrite(f"{RGB_FOLDER}/ear_{timestamp}.png", embedding_input)
                cv2.imwrite(f"{folder_path}/ear_{timestamp}.png", embedding_input)

                # --- DEBUG: Save HOG Input (Pre-processed) ---
                if DEBUG_FOLDER:
                    try:
                        debug_input = apply_preprocessing(embedding_input)
                        cv2.imwrite(f"{DEBUG_FOLDER}/hog_input_{timestamp}.png", debug_input)
                    except Exception as e:
                        log_error(e, "Saving Debug Input")

                logging.debug("Extracting embedding...")
                embedding = extract_embedding(embedding_input)
                
                if embedding is not None:
                    embed_list = embedding.tolist()

                    # with open("file.txt", "w") as debug_file:
                    #     debug_file.write(str(embed_list))
                    
                    with open(f"{EMBED_FOLDER}/embed_{timestamp}.json", "w") as f: json.dump(embed_list, f)
                    with open(f"{EMBED_FOLDER}/embed_{timestamp}.json", "w") as f: json.dump(embed_list, f)
                    with open(f"{folder_path}/embed_{timestamp}.json", "w") as f: json.dump(embed_list, f)
                    
                    logging.info("Save Worker Completed Successfully.")
                    
                    embed_bytes = np.array(embed_list, dtype=np.float32).tobytes()
                    embed_b64 = base64.b64encode(embed_bytes).decode('utf-8')
                    safe_print({"event": "saved", "folder": folder_path, "embedding": embed_b64})
                    return

        logging.warning("Save Worker: No embedding generated.")
        # USE SAFE PRINT
        safe_print({"event": "saved", "status": "no_embedding"})

    except Exception as e:
        log_error(e, "Save Worker Thread")

# ---------------------------------------------------------
# 5. MAIN LOOP
# ---------------------------------------------------------
def main():
    global save_flag, frame_count, last_bbox
    try:
        pipeline.start(config)
        logging.info("Pipeline started. Loop begin.")
        safe_print({"status": "ready"})

        while True:
            try:
                frames = pipeline.wait_for_frames()
                aligned_frames = align.process(frames)
                depth_frame = aligned_frames.get_depth_frame()
                color_frame = aligned_frames.get_color_frame()
                if not depth_frame or not color_frame: continue

                depth_image = np.asanyarray(depth_frame.get_data())
                color_image = np.asanyarray(color_frame.get_data())

                if save_flag:
                    timestamp = int(time.time())
                    safe_print({"info": "Saving in background..."})
                    t = threading.Thread(
                        target=save_worker_thread,
                        args=(color_image.copy(), depth_image.copy(), None, timestamp, hn_value, mode_value, last_bbox)
                    )
                    t.start()
                    t.join()
                    # save_worker_thread(color_image.copy(), depth_image.copy(), None, timestamp, hn_value, mode_value, last_bbox)
                    save_flag = False

                frame_count += 1
                
                if frame_count % YOLO_INTERVAL == 0:
                    last_bbox = detect_ear(color_image)
                
                horiz_ok, vert_ok = False, False
                h_diff, v_diff = 0.0, 0.0
                h_msg, v_msg = "", ""

                if last_bbox:
                    res = depth_gradient_check_fast(depth_image, last_bbox)
                    if res:
                        h_diff, v_diff, h_msg, v_msg = res
                        horiz_ok = (h_msg == "OK")
                        vert_ok = (v_msg == "OK")

                small_frame = cv2.resize(color_image, (0,0), fx=0.5, fy=0.5) 
                _, buffer = cv2.imencode('.jpg', small_frame)
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                
                dist = get_robust_center_distance(depth_image)

                # USE SAFE PRINT
                if not save_in_prog:
                    safe_print({
                        "distance": round(dist, 3),
                        "image": jpg_as_text,
                        "bbox": last_bbox,
                        "horiz_status": horiz_ok,
                        "vert_status": vert_ok,
                        "horiz_diff": round(h_diff, 4),
                        "vert_diff": round(v_diff, 4),
                        "horiz_msg": h_msg, 
                        "vert_msg": v_msg
                    })

            except Exception as loop_e:
                if frame_count % 100 == 0:
                    log_error(loop_e, "Main Loop Inner")
                continue

    except Exception as e: 
        log_error(e, "Main Loop Critical")
    finally: 
        try: pipeline.stop()
        except: pass
        logging.info("Pipeline stopped.")

if __name__ == "__main__":
    main()