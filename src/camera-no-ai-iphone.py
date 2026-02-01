import numpy as np
import cv2
import base64
import time
import json
import sys
import os
import threading
from ultralytics import YOLO
from dotenv import load_dotenv
from PIL import Image

# --- Load environment variables ---
load_dotenv()

# --- Configuration: Folders ---
RGB_FOLDER = os.getenv("VITE_RGB_FOLDER", "rgb_captures")
EMBED_FOLDER = os.getenv("VITE_EMBED_FOLDER", "embeddings")
PATIENTS_FOLDER = os.getenv("VITE_PATIENTS_FOLDER", "patients")
DEBUG_FOLDER = os.getenv("VITE_DEBUG_FOLDER", "debug")

for folder in [RGB_FOLDER, EMBED_FOLDER, PATIENTS_FOLDER, DEBUG_FOLDER]:
    if folder:
        os.makedirs(folder, exist_ok=True)

CAMERA_SOURCE = 1 
YOLO_MODEL_PATH = os.getenv("VITE_YOLO_MODEL")
yolo_model = YOLO(YOLO_MODEL_PATH)

save_flag = False
hn_value = None
mode_value = None
frame_count = 0
YOLO_INTERVAL = 5
last_bbox = None

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
        except: pass

input_thread = threading.Thread(target=listen_to_nodejs, daemon=True)
input_thread.start()

# ---------------------------------------------------------
# ALIGNMENT & SCALING LOGIC (The Fix)
# ---------------------------------------------------------
def pad_to_square(image):
    h, w = image.shape[:2]
    if h == w: return image
    size = max(h, w)
    top = (size - h) // 2
    bottom = size - h - top
    left = (size - w) // 2
    right = size - w - left
    return cv2.copyMakeBorder(image, top, bottom, left, right, cv2.BORDER_CONSTANT, value=[0, 0, 0])

def rotate_image_square(image, angle):
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0))

def scale_crop_pad(image, target_h=256, target_w=128):
    """
    Finds the ear content, crops it tightly, and resizes it to fill the 
    target dimensions (128x256) while maintaining aspect ratio.
    This fixes the "Small Ear vs Big Ear" problem.
    """
    # 1. Find bounding box of non-black pixels
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    x, y, w, h = cv2.boundingRect(thresh)
    
    if w == 0 or h == 0: return cv2.resize(image, (target_w, target_h))
    
    # 2. Crop tightly
    crop = image[y:y+h, x:x+w]
    
    # 3. Resize to fit target box (with 5% padding safety)
    padding_pct = 0.05
    avail_w = int(target_w * (1 - 2*padding_pct))
    avail_h = int(target_h * (1 - 2*padding_pct))
    
    scale = min(avail_w / w, avail_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    
    resized = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    
    # 4. Paste into center of black canvas
    canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
    start_x = (target_w - new_w) // 2
    start_y = (target_h - new_h) // 2
    canvas[start_y:start_y+new_h, start_x:start_x+new_w] = resized
    
    return canvas

def align_ear_robust(image, mask):
    # 1. Pad to Square & Rotate
    image_sq = pad_to_square(image)
    mask_sq = pad_to_square(mask)
    contours, _ = cv2.findContours(mask_sq, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return image
    c = max(contours, key=cv2.contourArea)
    if len(c) < 5: return image
    (center_x, center_y), (MA, ma), angle = cv2.fitEllipse(c)
    
    rotation_angle = angle if angle < 90 else angle - 180
    rotated_ear = rotate_image_square(image_sq, rotation_angle)
    
    # 2. SCALE NORMALIZATION (New Step)
    # Instead of random crop, we now force it to fit 128x256 perfectly
    final_ear = scale_crop_pad(rotated_ear, target_h=256, target_w=128)
    
    return final_ear

# ---------------------------------------------------------
# HIGH-FIDELITY EMBEDDING LOGIC (4608 Dims)
# ---------------------------------------------------------
def apply_clahe_hsv(bgr_image):
    if bgr_image.shape[2] == 4:
        bgr_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGRA2BGR)
    hsv = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2HSV)
    v_channel = hsv[:, :, 2]
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    v_clahe = clahe.apply(v_channel)
    return cv2.cvtColor(v_clahe, cv2.COLOR_GRAY2BGR)

def get_high_fidelity_embedding(image):
    """
    Generates a 1152-dimension vector.
    This is the "Goldilocks" configuration:
    - High Res Input (128x256) for sharp edges
    - Large Stride (16x16) to reduce redundancy/noise
    """
    # 1. Use Higher Resolution (Captures curves well)
    resize_dim = (128, 256) 
    img_resized = cv2.resize(image, resize_dim)
    
    # 2. Convert to Grayscale
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
    
    # 3. HOG Configuration (TUNED FOR 1152)
    # WinSize=128x256
    # BlockSize=32x32 (Larger blocks = more robust to noise)
    # BlockStride=32x32 (No overlap = clean signals)
    # CellSize=16x16 (Captures main shape, ignores skin texture)
    # Bins=9
    hog = cv2.HOGDescriptor(
        _winSize=(128, 256),
        _blockSize=(32, 32),  # Increased to filter noise
        _blockStride=(32, 32), # Increased to lower dimension count
        _cellSize=(16, 16),   # Increased to ignore micro-details
        _nbins=9
    )
    
    # Math:
    # Width Blocks = (128-32)/32 + 1 = 4
    # Height Blocks = (256-32)/32 + 1 = 8
    # Total Blocks = 4 * 8 = 32
    # Features = 32 blocks * (4 cells * 9 bins) = 1152 features
    features = hog.compute(gray).flatten()
    
    # 4. Normalize
    norm = np.linalg.norm(features)
    if norm > 0:
        features /= norm
        
    return features

def extract_embedding(ear_crop, model_type="child"):
    if ear_crop is None: return None
    clahe_img = apply_clahe_hsv(ear_crop)
    embedding = get_high_fidelity_embedding(clahe_img)
    return embedding

def detect_ear(color_image):
    rgb = cv2.cvtColor(color_image, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    results = yolo_model.predict(source=pil_img, verbose=False)[0]
    if len(results.boxes) == 0: return None
    box = results.boxes[0]
    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(float)
    return {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2), "score": float(box.conf[0])}

def expand_bbox(bbox, scale, img_width, img_height):
    x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
    w, h = x2 - x1, y2 - y1
    cx, cy = x1 + w / 2, y1 + h / 2
    new_w, new_h = w * scale, h * scale
    return (max(0, int(cx - new_w / 2)), max(0, int(cy - new_h / 2)), 
            min(img_width - 1, int(cx + new_w / 2)), min(img_height - 1, int(cy + new_h / 2)))

def main():
    global save_flag, frame_count, last_bbox
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    if not cap.isOpened():
        print(json.dumps({"error": f"Cannot open camera {CAMERA_SOURCE}."}), flush=True)
        return

    print(json.dumps({"status": "ready"}), flush=True)
    embedding = None

    try:
        while True:
            ret, color_image = cap.read()
            if not ret: continue

            if save_flag:
                folder_path = f"{PATIENTS_FOLDER}/{hn_value}_{mode_value}"
                os.makedirs(folder_path, exist_ok=True)
                timestamp = int(time.time())
                
                print(json.dumps({"info": "Processing High-Fidelity Data with Scale Norm..."}), flush=True)
                cv2.imwrite(f"{RGB_FOLDER}/rgb_{timestamp}.jpg", color_image)

                current_bbox = last_bbox if last_bbox else detect_ear(color_image)
                if current_bbox:
                    h, w, _ = color_image.shape
                    x1, y1, x2, y2 = expand_bbox(current_bbox, 1.5, w, h)
                    ear_crop = color_image[y1:y2, x1:x2]
                    
                    if DEBUG_FOLDER: cv2.imwrite(f"{DEBUG_FOLDER}/debug_01_crop_{timestamp}.jpg", ear_crop)

                    results = yolo_model(ear_crop, verbose=False, retina_masks=True)
                    if results[0].masks:
                        mask_data = results[0].masks.data[0].cpu().numpy()
                        mask = cv2.resize(mask_data, (ear_crop.shape[1], ear_crop.shape[0]))
                        mask_binary = (mask > 0.5).astype(np.uint8) * 255
                        masked_crop = cv2.bitwise_and(ear_crop, ear_crop, mask=mask_binary)
                        
                        try:
                            # This now returns a perfectly scaled 128x256 image
                            aligned_ear = align_ear_robust(masked_crop, mask_binary)
                            
                            if DEBUG_FOLDER: cv2.imwrite(f"{DEBUG_FOLDER}/debug_02_aligned_{timestamp}.png", aligned_ear)
                            
                            embedding_input = aligned_ear
                            cv2.imwrite(f"{RGB_FOLDER}/ear_{timestamp}.png", aligned_ear)
                            cv2.imwrite(f"{folder_path}/ear_{timestamp}.png", aligned_ear)
                        except Exception as e:
                            embedding_input = ear_crop 
                    else:
                        embedding_input = ear_crop
                        cv2.imwrite(f"{RGB_FOLDER}/ear_{timestamp}.jpg", ear_crop)

                    if DEBUG_FOLDER:
                        try:
                            # Debug 3 will now show the perfectly standardized input
                            clahe_debug = apply_clahe_hsv(embedding_input)
                            cv2.imwrite(f"{DEBUG_FOLDER}/debug_03_final_input_{timestamp}.jpg", clahe_debug)
                        except: pass

                    # Extract 4608-dim Vector
                    embedding = extract_embedding(embedding_input, model_type=mode_value)
                    
                    if embedding is not None:
                        embed_list = embedding.tolist()
                        with open(f"{EMBED_FOLDER}/embed_{timestamp}.json", "w") as f: json.dump(embed_list, f)
                        with open(f"{folder_path}/embed_{timestamp}.json", "w") as f: json.dump(embed_list, f)
                
                print(json.dumps({
                    "event": "saved",
                    "folder": folder_path,
                    "embedding": embedding.tolist() if embedding is not None else []
                }), flush=True)
                save_flag = False

            frame_count += 1
            if frame_count % YOLO_INTERVAL == 0: last_bbox = detect_ear(color_image)
            
            small_frame = cv2.resize(color_image, (0,0), fx=0.5, fy=0.5)
            _, buffer = cv2.imencode('.jpg', small_frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            print(json.dumps({
                "distance": 0.0,
                "image": jpg_as_text,
                "bbox": last_bbox,
                "embeddings": embedding.tolist() if embedding is not None else None
            }), flush=True)

    except Exception as e: print(json.dumps({"error": str(e)}), flush=True)
    finally: cap.release()

if __name__ == "__main__":
    main()