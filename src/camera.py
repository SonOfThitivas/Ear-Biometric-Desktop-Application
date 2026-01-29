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

# --- Functions ---
def preprocess_ear(ear_crop):
    img = cv2.cvtColor(ear_crop, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (224, 224))
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))
    img = np.expand_dims(img, axis=0)
    return img

def extract_embedding(ear_crop, model_type="child"):
    if ear_crop is None:
        return None
    embed_session = embed_session_child if model_type == "child" else embed_session_mom
    input_name = embed_session.get_inputs()[0].name
    output_name = embed_session.get_outputs()[0].name
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
                
                pc.map_to(color_frame)
                points = pc.calculate(depth_frame)
                ply_filename = f"{PLY_FOLDER}/model_{timestamp}.ply"
                points.export_to_ply(ply_filename, color_frame)

                # --- DEBUG: SEGMENTATION VISUALIZATION ---
                if DEBUG_FOLDER:
                    # Run prediction
                    debug_results = yolo_model.predict(source=color_image, verbose=False, retina_masks=True)[0]
                    
                    # 1. Plot Overlay WITHOUT Boxes (Cleaner view)
                    annotated_frame_clean = debug_results.plot(boxes=False, labels=False)
                    cv2.imwrite(f"{DEBUG_FOLDER}/debug_overlay_{timestamp}.jpg", annotated_frame_clean)

                    # 2. Extract & Save Binary Mask
                    if debug_results.masks is not None:
                        # Get the first mask (assuming main object)
                        raw_mask = debug_results.masks[0].data[0].cpu().numpy()
                        
                        # Resize mask to match original image dimensions
                        img_h, img_w = color_image.shape[:2]
                        mask_resized = cv2.resize(raw_mask, (img_w, img_h))
                        
                        # Create binary mask (0 or 255)
                        mask_binary = (mask_resized > 0.5).astype(np.uint8) * 255
                        cv2.imwrite(f"{DEBUG_FOLDER}/debug_mask_binary_{timestamp}.png", mask_binary)
                        
                        # 3. Create "Cutout" (Ear only, black background)
                        cutout = cv2.bitwise_and(color_image, color_image, mask=mask_binary)
                        cv2.imwrite(f"{DEBUG_FOLDER}/debug_cutout_{timestamp}.jpg", cutout)

                        # Update bbox to match this specific segmentation frame
                        if len(debug_results.boxes) > 0:
                            box = debug_results.boxes[0]
                            bx1, by1, bx2, by2 = box.xyxy[0].cpu().numpy().astype(float)
                            bbox = {
                                "x1": int(bx1), "y1": int(by1), 
                                "x2": int(bx2), "y2": int(by2), 
                                "score": float(box.conf[0])
                            }
                # -----------------------------------------

                # Crop and Save Ear (using bbox)
                if bbox:
                    h, w, _ = color_image.shape
                    x1, y1, x2, y2 = expand_bbox(bbox, 1.5, w, h)
                    ear_crop = color_image[y1:y2, x1:x2]
                    cv2.imwrite(f"{RGB_FOLDER}/ear_{timestamp}.jpg", ear_crop)
                    cv2.imwrite(f"{folder_path}/ear_{timestamp}.jpg", ear_crop)
                
                # Extract Embedding
                embedding = extract_embedding(ear_crop, model_type=mode_value)
                if embedding is not None:
                    with open(f"{EMBED_FOLDER}/embed_{timestamp}.json", "w") as f:
                        json.dump(embedding.tolist(), f)
                    with open(f"{folder_path}/embed_{timestamp}.json", "w") as f:
                        json.dump(embedding.tolist(), f)

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