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

load_dotenv()

# --- Configuration ---
# Folders to store output files
RGB_FOLDER = os.getenv("VITE_RGB_FOLDER")
DEPTH_FOLDER = os.getenv("VITE_DEPTH_FOLDER")
PLY_FOLDER = os.getenv("VITE_PLY_FOLDER")
EMBED_FOLDER = os.getenv("VITE_EMBED_FOLDER")
# RGB_FOLDER = "saved_images/RGB"
# DEPTH_FOLDER = "saved_images/Depth"
# PLY_FOLDER = "saved_images/PLY"
# EMBED_FOLDER = "saved_images/Embeddings"

# Create directories if they don't exist
for folder in [RGB_FOLDER, DEPTH_FOLDER, PLY_FOLDER,EMBED_FOLDER]:
    os.makedirs(folder, exist_ok=True)

CHILD_MODEL_PATH = os.getenv("VITE_CHILD_MODEL")
YOLO_MODEL_PATH = os.getenv("VITE_YOLO_MODEL")
embed_session = ort.InferenceSession(CHILD_MODEL_PATH)
yolo_model = YOLO(YOLO_MODEL_PATH)
# embed_session = ort.InferenceSession("src/model/child_model.onnx")
# yolo_model = YOLO("src/model/best.pt")
input_name = embed_session.get_inputs()[0].name
output_name = embed_session.get_outputs()[0].name
# Global flag to trigger image capture
save_flag = False
hn_value = None
mode_value = None

frame_count = 0
YOLO_INTERVAL = 10   # run YOLO every 10 frames
last_bbox = None

# --- Helper Function: Listen for Node.js Commands ---
# This runs in a separate thread to prevent blocking the main camera loop
def listen_to_nodejs():
    global save_flag, hn_value, mode_value
    while True:
        try:
            # Read line from Standard Input (stdin) sent by Node.js
            line = sys.stdin.readline()
            if line:
                data = json.loads(line)
                # Check if the command is "save"
                if data.get("cmd") == "save":
                    save_flag = True
                    hn_value = data.get("hn")
                    mode_value = data.get("mode")

        except:
            pass # Ignore errors during reading

# Start the listener thread
input_thread = threading.Thread(target=listen_to_nodejs, daemon=True)
input_thread.start()

# --- RealSense Setup ---
pipeline = rs.pipeline()
config = rs.config()

# Enable Depth and Color streams (640x480 resolution at 30 FPS)
config.enable_stream(rs.stream.depth, 640, 480, rs.format.z16, 30)
config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)

# **CRITICAL**: Create an align object.
# This aligns the depth frame to the color frame so pixels match perfectly.
align = rs.align(rs.stream.color)

# Create PointCloud object for 3D calculation
pc = rs.pointcloud()


# --- Preprocessing Function for Embedding Model ---
def preprocess_ear(ear_crop):
    # BGR → RGB
    img = cv2.cvtColor(ear_crop, cv2.COLOR_BGR2RGB)

    # Resize to model input size
    img = cv2.resize(img, (224, 224))

    # Normalize to [0,1]
    img = img.astype(np.float32) / 255.0

    # ImageNet normalization
    img -= np.array([0.485, 0.456, 0.406], dtype=np.float32)
    img /= np.array([0.229, 0.224, 0.225], dtype=np.float32)

    # HWC → CHW
    img = np.transpose(img, (2, 0, 1))

    # Add batch dimension
    img = np.expand_dims(img, axis=0)

    return img

# --- Embedding Extraction Function ---
def extract_embedding(ear_crop):
    img = preprocess_ear(ear_crop)

    embedding = embed_session.run(
        [output_name],
        {input_name: img}
    )[0].flatten()

    # L2 normalize
    embedding = embedding / np.linalg.norm(embedding)

    return embedding


# --- YOLO Detection Function ---
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
        "x1": int(x1),
        "y1": int(y1),
        "x2": int(x2),
        "y2": int(y2),
        "score": float(score)
    }

# --- Bounding Box Expansion Function ---
def expand_bbox(bbox, scale, img_width, img_height):
    x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]

    # Current width/height
    w = x2 - x1
    h = y2 - y1

    # Center of the box
    cx = x1 + w / 2
    cy = y1 + h / 2

    # New scaled size
    new_w = w * scale
    new_h = h * scale

    # New coordinates
    new_x1 = int(cx - new_w / 2)
    new_y1 = int(cy - new_h / 2)
    new_x2 = int(cx + new_w / 2)
    new_y2 = int(cy + new_h / 2)

    # Clamp to image boundaries
    new_x1 = max(0, new_x1)
    new_y1 = max(0, new_y1)
    new_x2 = min(img_width - 1, new_x2)
    new_y2 = min(img_height - 1, new_y2)

    return new_x1, new_y1, new_x2, new_y2



def main():
    global save_flag, frame_count, last_bbox
    try:
        # Start streaming
        pipeline.start(config)
        
        # Send a "ready" signal to Node.js
        print(json.dumps({"status": "ready"}), flush=True)
        embedding = None
        ear_crop = None

        while True:
            # 1. Wait for a coherent pair of frames: depth and color
            frames = pipeline.wait_for_frames()
            
            # 2. Align depth frame to color frame
            aligned_frames = align.process(frames)
            
            depth_frame = aligned_frames.get_depth_frame()
            color_frame = aligned_frames.get_color_frame()

            # Validate that both frames are available
            if not depth_frame or not color_frame:
                continue

            # Convert images to numpy arrays for OpenCV processing
            depth_image = np.asanyarray(depth_frame.get_data())
            color_image = np.asanyarray(color_frame.get_data())

            # --- CAPTURE LOGIC ---
            if save_flag:

                folder_path = f"patients/{hn_value}_{mode_value}"
                os.makedirs(folder_path, exist_ok=True)
                timestamp = int(time.time())
                
                # Notify Node.js that saving has started
                print(json.dumps({"info": "Processing 3D data..."}), flush=True)

                # A. Save RGB Image
                cv2.imwrite(f"{RGB_FOLDER}/rgb_{timestamp}.jpg", color_image)
                
                # B. Save Depth Map (Colorized for visualization)
                # Convert 16-bit depth to 8-bit color map
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                cv2.imwrite(f"{DEPTH_FOLDER}/depth_{timestamp}.png", depth_colormap)
                
                # C. Save 3D Point Cloud (.ply)
                # Map the color frame to the point cloud (Texture Mapping)
                pc.map_to(color_frame)
                # Calculate XYZ coordinates
                points = pc.calculate(depth_frame)
                # Export to .ply file
                ply_filename = f"{PLY_FOLDER}/model_{timestamp}.ply"
                points.export_to_ply(ply_filename, color_frame)

                # D. Crop and Save Detected Ear Region
            
                if bbox:
                    h, w, _ = color_image.shape

                    # Expand bbox by 1.5x
                    x1, y1, x2, y2 = expand_bbox(bbox, 1.5, w, h)

                    ear_crop = color_image[y1:y2, x1:x2]
                    ear_path = f"{RGB_FOLDER}/ear_{timestamp}.jpg"
                    ear_path = f"{folder_path}/ear_{timestamp}.jpg"
                    cv2.imwrite(ear_path, ear_crop)
                else:
                    ear_path = None

                # E. Extract and Save Embedding
                embedding = extract_embedding(ear_crop)

                embed_path = f"{EMBED_FOLDER}/embed_{timestamp}.json"
                embed_path = f"{folder_path}/embed_{timestamp}.json"

                with open(embed_path, "w") as f:
                    json.dump(embedding.tolist(), f)

                

                # Send success event back to Node.js
                # print(json.dumps({"event": "saved", "path": ply_filename, "embeddings": embedding.tolist()}), flush=True)
                print(json.dumps({
                                    "event": "saved",
                                    "folder": folder_path,
                                    "embedding": embedding.tolist()
                                }), flush=True)

                # Reset flag
                save_flag = False
            

        
            # --- DETECTION LOGIC ---
            frame_count += 1

            # Run YOLO only every N frames
            if frame_count % YOLO_INTERVAL == 0:
                last_bbox = detect_ear(color_image)

            bbox = last_bbox


            # Draw bounding box on the preview frame
            # if bbox:
            #     cv2.rectangle(color_image, (bbox["x1"], bbox["y1"]), (bbox["x2"], bbox["y2"]), (0, 255, 0), 2)
            #     cv2.putText(color_image, f"{bbox['score']:.2f}", (bbox["x1"], bbox["y1"] - 10),
            #                 cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)


            # --- PREVIEW STREAM LOGIC ---
            # Resize image to 50% to reduce bandwidth and latency
            small_frame = cv2.resize(color_image, (0,0), fx=0.5, fy=0.5) 
            
            # Encode image to JPEG (Memory buffer)
            _, buffer = cv2.imencode('.jpg', small_frame)
            
            # Convert JPEG buffer to Base64 string for Web display
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')

            # Get distance at the center of the frame
            dist = depth_frame.get_distance(320, 240)

            # Create JSON payload
            payload = {
                "distance": round(dist, 3), # Distance in meters
                "image": jpg_as_text,        # Base64 Image
                "bbox": bbox,                # Detected bounding box
                "embeddings": embedding.tolist() if embedding is not None else None  # Embeddings if ear detected
            }
            
            # Send data to Node.js (flush=True is required!)
            print(json.dumps(payload), flush=True)

    except Exception as e:
        # Report any errors to Node.js
        print(json.dumps({"error": str(e)}), flush=True)

    finally:
        # Stop the camera pipeline when exiting
        pipeline.stop()

if __name__ == "__main__":
    main()