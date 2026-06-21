"""Debug script to test camera and YOLO detection"""
import cv2
import numpy as np
from yolo_detector import YOLODetector
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

print("=" * 60)
print("CAMERA & YOLO DEBUG TEST")
print("=" * 60)

# Test 1: Can we open the camera?
print("\n[TEST 1] Opening camera device 0...")
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if not cap.isOpened():
    print("❌ FAILED: Camera not opening!")
    cap.release()
    # Try without DSHOW
    print("[RETRY] Trying without DSHOW...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ FAILED AGAIN: Camera device 0 not available")
        exit(1)

print("✅ Camera opened successfully")

# Test 2: Can we get frames?
print("\n[TEST 2] Reading frames from camera...")
frames_read = 0
for i in range(10):
    ret, frame = cap.read()
    if ret and frame is not None:
        frames_read += 1
        print(f"  Frame {i+1}: {frame.shape}, dtype={frame.dtype}")
    else:
        print(f"  Frame {i+1}: FAILED to read")

print(f"✅ Successfully read {frames_read}/10 frames")

# Test 3: Is YOLO loaded?
print("\n[TEST 3] Loading YOLO model...")
detector = YOLODetector(model_name="yolov8n.pt", confidence=0.3)

if not detector.is_loaded or detector.model is None:
    print("❌ FAILED: YOLO model not loaded!")
    exit(1)

print("✅ YOLO model loaded successfully")
print(f"   Model: {detector.model}")
print(f"   Confidence threshold: {detector.confidence}")

# Test 4: Can YOLO detect on a real frame?
print("\n[TEST 4] Running YOLO detection on real camera frames...")
print("  [Please move in front of camera, detection will start in 3 seconds...]")

import time
time.sleep(3)

detections_found = 0
for i in range(30):  # Try 30 frames
    ret, frame = cap.read()
    if not ret:
        print(f"  Frame {i+1}: Failed to capture")
        continue
    
    print(f"\n  Frame {i+1}: Testing YOLO detection...")
    print(f"    Frame shape: {frame.shape}")
    
    detections = detector.detect(frame, conf_threshold=0.3)
    
    print(f"    Detections: {len(detections) if detections else 0}")
    
    if detections and len(detections) > 0:
        detections_found += 1
        for det in detections:
            print(f"      ✅ {det['class']} (confidence: {det['confidence']:.2f})")
    else:
        print(f"      No detections")
    
    time.sleep(0.1)

print(f"\n✅ Detection test complete: Found objects in {detections_found}/30 frames")

if detections_found == 0:
    print("\n⚠️  WARNING: YOLO detected 0 objects in 30 frames!")
    print("    Possible causes:")
    print("    1. Camera not actually opening (using mock frames)")
    print("    2. YOLO model not detecting properly")
    print("    3. Confidence threshold too high")
    print("    4. Lighting/angle issues in real world")

cap.release()
print("\n" + "=" * 60)
print("DEBUG TEST COMPLETE")
print("=" * 60)
