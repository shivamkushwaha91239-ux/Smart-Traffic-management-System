"""Simple real-time detection test"""
import cv2
from yolo_detector import YOLODetector
import time

print("Starting Real-Time YOLO Detection Test...")
print("Move in front of camera to test detection")
print("Press 'q' to quit\n")

# Initialize camera
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
if not cap.isOpened():
    cap = cv2.VideoCapture(0)

# Initialize YOLO
detector = YOLODetector(model_name="yolov8n.pt", confidence=0.3)

if not detector.is_loaded:
    print("ERROR: YOLO model not loaded!")
    cap.release()
    exit(1)

print("✅ YOLO ready! Monitoring for detections...\n")

detections_count = 0
frame_count = 0

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Run YOLO detection
        detections = detector.detect(frame, conf_threshold=0.25)  # Lower threshold
        
        if detections and len(detections) > 0:
            detections_count += 1
            print(f"🚨 FRAME {frame_count}: DETECTED {len(detections)} objects")
            for det in detections:
                print(f"   ✅ {det['class'].upper()} (confidence: {det['confidence']:.2f})")
        
        # Exit after 100 frames
        if frame_count >= 100:
            break
        
        time.sleep(0.05)

except KeyboardInterrupt:
    pass

cap.release()

print(f"\n{'='*60}")
print(f"Results: {detections_count} detections in {frame_count} frames")
print(f"Detection rate: {(detections_count/max(frame_count, 1))*100:.1f}%")
print(f"{'='*60}")
