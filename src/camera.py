import pyrealsense2 as rs
import numpy as np
import cv2
import base64
import time
import json
import sys
import os
import threading

from ultralytics import YOLO
from PIL import Image
import onnxruntime as ort
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv()

# --- Configuration: Folders ---
RGB_FOLDER = os.getenv("VITE_RGB_FOLDER")
DEPTH_FOLDER = os.getenv("VITE_DEPTH_FOLDER")
PLY_FOLDER = os.getenv("VITE_PLY_FOLDER")
EMBED_FOLDER = os.getenv("VITE_EMBED_FOLDER")
PATIENTS_FOLDER = os.getenv("VITE_PATIENTS_FOLDER")
DEBUG_FOLDER = os.getenv("VITE_DEBUG_FOLDER")

for folder in [RGB_FOLDER, DEPTH_FOLDER, PLY_FOLDER, EMBED_FOLDER, PATIENTS_FOLDER, DEBUG_FOLDER]:
    if folder:
        os.makedirs(folder, exist_ok=True)

# --- Model paths ---
CHILD_MODEL_PATH = os.getenv("VITE_CHILD_MODEL")
MOM_MODEL_PATH   = os.getenv("VITE_MOM_MODEL")
YOLO_MODEL_PATH  = os.getenv("VITE_YOLO_MODEL")

embed_session_child = ort.InferenceSession(CHILD_MODEL_PATH)
embed_session_mom   = ort.InferenceSession(MOM_MODEL_PATH)
yolo_model          = YOLO(YOLO_MODEL_PATH)

# Global flags
save_flag = False
hn_value = None
mode_value = None

frame_count = 0
YOLO_INTERVAL = 10
last_bbox = None

# --- Helper Function: Listen for Node.js ---
def listen_to_nodejs():
    global save_flag, hn_value, mode_value
    while True:
        try:
            line = sys.stdin.readline()
            if line:
                data = json.loads(line)
                if data.get("cmd") == "save":
                    save_flag = True
                    hn_value = data.get("hn")
                    mode_value = data.get("mode")
        except:
            pass

input_thread = threading.Thread(target=listen_to_nodejs, daemon=True)
input_thread.start()

# --- RealSense Setup ---
pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.depth, 640, 480, rs.format.z16, 30)
config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)
align = rs.align(rs.stream.color)
pc = rs.pointcloud()

# ---------------------------------------------------------
# 1. ROTATION & ALIGNMENT LOGIC
# ---------------------------------------------------------
def rotate_image(image, cx, cy, angle):
    h, w = image.shape[:2]
    M = cv2.getRotationMatrix2D((cx, cy), angle, 1.0)
    
    # Calculate New Canvas Size to avoid clipping
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))
    
    # Adjust matrix to center in new canvas
    M[0, 2] += (new_w / 2) - cx
    M[1, 2] += (new_h / 2) - cy
    
    # Rotate (Use BORDER_CONSTANT to fill background with black)
    return cv2.warpAffine(image, M, (new_w, new_h), 
                         flags=cv2.INTER_CUBIC, 
                         borderMode=cv2.BORDER_CONSTANT, 
                         borderValue=(0,0,0)) 

def align_ear_robust(image, mask):
    # Find Contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return image
    
    c = max(contours, key=cv2.contourArea)
    if len(c) < 5: return image
    
    # Fit Ellipse & Get Angle
    (center_x, center_y), (MA, ma), angle = cv2.fitEllipse(c)
    
    # Calculate Rotation (Force Vertical)
    if angle < 90:
        rotation_angle = angle - 90
    else:
        rotation_angle = angle - 270 
        
    rotated_img = rotate_image(image, center_x, center_y, rotation_angle)
    
    # Portrait Check (If width > height, rotate 90 deg)
    h, w = rotated_img.shape[:2]
    
    # Quick mask of rotated image to check valid area
    gray = cv2.cvtColor(rotated_img, cv2.COLOR_BGR2GRAY)
    _, new_mask = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    x, y, w_rect, h_rect = cv2.boundingRect(new_mask)
    
    if w_rect > h_rect:
        center = (w // 2, h // 2)
        rotated_img = rotate_image(rotated_img, center[0], center[1], 90)

    return rotated_img

# ---------------------------------------------------------
# 2. PREPROCESSING LOGIC (Exact Match to Training)
# ---------------------------------------------------------
def apply_clahe_hsv(bgr_image):
    """
    Simulates HSV_CLAHE_Transform from training.
    """
    # Ensure input is 3 channels (BGR)
    if bgr_image.shape[2] == 4:
        bgr_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGRA2BGR)

    hsv = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    v_clahe = clahe.apply(v_channel)
    
    # Reconstruct BGR image from just the V channel
    img_final = cv2.cvtColor(v_clahe, cv2.COLOR_GRAY2BGR)
    return img_final

def preprocess_ear(ear_crop):
    if ear_crop is None: return None

    # Step A: Apply Lighting Fix (CLAHE)
    img = apply_clahe_hsv(ear_crop)

    # Step B: Resize to Model Input (224x224)
    img = cv2.resize(img, (224, 224))

    # Step C: ToTensor (Scale 0-1)
    img = img.astype(np.float32) / 255.0

    # Step D: Normalize (Mean 0.5, Std 0.5) => Range -1 to 1
    img = (img - 0.5) / 0.5

    # Step E: Transpose & Batch
    img = np.transpose(img, (2, 0, 1)) # HWC -> CHW
    img = np.expand_dims(img, axis=0)  # Add Batch Dim

    return img

def extract_embedding(ear_crop, model_type="child"):
    if ear_crop is None:
        return None
    embed_session = embed_session_child if model_type == "child" else embed_session_mom
    input_name = embed_session.get_inputs()[0].name
    output_name = embed_session.get_outputs()[0].name
    
    # Preprocess handles CLAHE + Normalize
    img = preprocess_ear(ear_crop)
    
    embedding = embed_session.run([output_name], {input_name: img})[0].flatten()
    embedding = embedding / np.linalg.norm(embedding)
    return embedding

def detect_ear(color_image):
    rgb = cv2.cvtColor(color_image, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    results = yolo_model.predict(source=pil_img, verbose=False)[0]

    if len(results.boxes) == 0:
        return None

    box = results.boxes[0]
    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(float)
    score = float(box.conf[0])

    return {
        "x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2), "score": float(score)
    }

def expand_bbox(bbox, scale, img_width, img_height):
    x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
    w = x2 - x1
    h = y2 - y1
    cx = x1 + w / 2
    cy = y1 + h / 2
    new_w = w * scale
    new_h = h * scale
    new_x1 = int(cx - new_w / 2)
    new_y1 = int(cy - new_h / 2)
    new_x2 = int(cx + new_w / 2)
    new_y2 = int(cy + new_h / 2)
    new_x1 = max(0, new_x1)
    new_y1 = max(0, new_y1)
    new_x2 = min(img_width - 1, new_x2)
    new_y2 = min(img_height - 1, new_y2)
    return new_x1, new_y1, new_x2, new_y2

def main():
    global save_flag, frame_count, last_bbox
    try:
        pipeline.start(config)
        print(json.dumps({"status": "ready"}), flush=True)
        embedding = None
        ear_crop = None

        while True:
            frames = pipeline.wait_for_frames()
            aligned_frames = align.process(frames)
            depth_frame = aligned_frames.get_depth_frame()
            color_frame = aligned_frames.get_color_frame()

            if not depth_frame or not color_frame:
                continue

            depth_image = np.asanyarray(depth_frame.get_data())
            color_image = np.asanyarray(color_frame.get_data())

            # --- CAPTURE LOGIC ---
            if save_flag:
                folder_path = f"{PATIENTS_FOLDER}/{hn_value}_{mode_value}"
                os.makedirs(folder_path, exist_ok=True)
                timestamp = int(time.time())
                
                print(json.dumps({"info": "Processing 3D data..."}), flush=True)

                # Save basic files
                cv2.imwrite(f"{RGB_FOLDER}/rgb_{timestamp}.jpg", color_image)
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                cv2.imwrite(f"{DEPTH_FOLDER}/depth_{timestamp}.png", depth_colormap)
                
                # 3. Generate & Save PLY Pointcloud
                try:
                    print(json.dumps({"info": "Starting PLY generation..."}), flush=True)
                    
                    pc.map_to(color_frame)
                    points = pc.calculate(depth_frame)
                    ply_filename = f"{PLY_FOLDER}/model_{timestamp}.ply"
                    points.export_to_ply(ply_filename, color_frame)
                    
                    # Verify the OS actually wrote it to the disk
                    if os.path.exists(ply_filename):
                        file_size = os.path.getsize(ply_filename)
                        print(json.dumps({
                            "info": f"SUCCESS: PLY generated! Saved at {ply_filename} (Size: {file_size} bytes)"
                        }), flush=True)
                    else:
                        print(json.dumps({
                            "error": f"FAIL: Code ran, but file is missing from {ply_filename}"
                        }), flush=True)

                except Exception as ply_err:
                    print(json.dumps({"error": f"PLY Generation CRASHED: {str(ply_err)}"}), flush=True)
                
                # --- [DEBUG 1/3] Save Raw Image ---
                if DEBUG_FOLDER:
                    cv2.imwrite(f"{DEBUG_FOLDER}/debug_01_raw_{timestamp}.jpg", color_image)

                # --- PIPELINE: DETECT -> SEGMENT -> ROTATE -> PREPROCESS -> EMBED ---
                if last_bbox: 
                    bbox = last_bbox
                else:
                    bbox = detect_ear(color_image)

                if bbox:
                    h, w, _ = color_image.shape
                    # 1. Expand Box
                    x1, y1, x2, y2 = expand_bbox(bbox, 1.5, w, h)
                    ear_crop = color_image[y1:y2, x1:x2]
                    
                    # 2. Get Mask (YOLO)
                    results = yolo_model(ear_crop, verbose=False, retina_masks=True)
                    
                    if results[0].masks:
                        mask_data = results[0].masks.data[0].cpu().numpy()
                        mask = cv2.resize(mask_data, (ear_crop.shape[1], ear_crop.shape[0]))
                        mask_binary = (mask > 0.5).astype(np.uint8) * 255
                        
                        # 3. Create Segmented Crop (Remove Background)
                        masked_crop = cv2.bitwise_and(ear_crop, ear_crop, mask=mask_binary)
                        
                        try:
                            # 4. Rotate/Align
                            aligned_ear = align_ear_robust(masked_crop, mask_binary)
                            
                            # --- [DEBUG 2/3] Save Aligned Ear ---
                            if DEBUG_FOLDER:
                                cv2.imwrite(f"{DEBUG_FOLDER}/debug_02_aligned_{timestamp}.png", aligned_ear)
                            
                            # Use Aligned Ear for Final Output
                            cv2.imwrite(f"{RGB_FOLDER}/ear_{timestamp}.png", aligned_ear)
                            cv2.imwrite(f"{folder_path}/ear_{timestamp}.png", aligned_ear)
                            embedding_input = aligned_ear

                        except Exception as e:
                            print(json.dumps({"warning": f"Rotation failed: {e}"}), flush=True)
                            embedding_input = ear_crop # Fallback
                    else:
                        # No mask found
                        embedding_input = ear_crop
                        cv2.imwrite(f"{RGB_FOLDER}/ear_{timestamp}.jpg", ear_crop)
                        cv2.imwrite(f"{folder_path}/ear_{timestamp}.jpg", ear_crop)

                    # --- [DEBUG 3/3] Save Final Input (CLAHE + Resized) ---
                    if DEBUG_FOLDER:
                        try:
                            # We reproduce the visible part of preprocessing here
                            clahe_debug = apply_clahe_hsv(embedding_input)
                            clahe_debug_resized = cv2.resize(clahe_debug, (224, 224))
                            cv2.imwrite(f"{DEBUG_FOLDER}/debug_03_final_input_{timestamp}.jpg", clahe_debug_resized)
                        except Exception as e:
                            pass
                    # ---------------------------------------------

                    # 5. Extract Embedding (Includes CLAHE & Normalize internally)
                    embedding = extract_embedding(embedding_input, model_type=mode_value)
                    
                    if embedding is not None:
                        with open(f"{EMBED_FOLDER}/embed_{timestamp}.json", "w") as f:
                            json.dump(embedding.tolist(), f)
                        with open(f"{folder_path}/embed_{timestamp}.json", "w") as f:
                            json.dump(embedding.tolist(), f)
                # ------------------------------------------------------------------

                print(json.dumps({
                    "event": "saved",
                    "folder": folder_path,
                    "embedding": embedding.tolist() if embedding is not None else []
                }), flush=True)

                save_flag = False

            # --- Background Detection ---
            frame_count += 1
            if frame_count % YOLO_INTERVAL == 0:
                last_bbox = detect_ear(color_image)
            bbox = last_bbox

            # --- Preview ---
            small_frame = cv2.resize(color_image, (0,0), fx=0.5, fy=0.5) 
            _, buffer = cv2.imencode('.jpg', small_frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            dist = depth_frame.get_distance(320, 240)

            print(json.dumps({
                "distance": round(dist, 3),
                "image": jpg_as_text,
                "bbox": bbox,
                "embeddings": embedding.tolist() if embedding is not None else None
            }), flush=True)

    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
    finally:
        pipeline.stop()

if __name__ == "__main__":
    main()