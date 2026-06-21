"""
Flask Backend for Smart Traffic Management System
With Real Camera Integration and YOLO Vehicle Detection
"""

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import numpy as np
import logging
import json
from datetime import datetime, timedelta
import threading
import time
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Try to import YOLO
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    logger.info("YOLO imported successfully")
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("YOLO not available - using mock detections")

# Function to detect available cameras
def detect_available_cameras(max_cameras=3):
    """Detect available cameras on the system"""
    available_cameras = []
    for i in range(max_cameras):
        try:
            # Just check if camera can be opened, don't try to read frames
            # (reading can interfere with Windows MSMF camera access)
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                # Check basic properties
                width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                if width > 0 and height > 0:
                    available_cameras.append(i)
                    logger.info(f"Found camera at index {i} (resolution: {width}x{height})")
                cap.release()
                time.sleep(0.2)  # Small delay between checks
            else:
                cap.release()
        except Exception as e:
            logger.debug(f"Camera detection error for index {i}: {e}")
    return available_cameras

# Test Camera class - generates synthetic traffic video
class TestCamera:
    def __init__(self, camera_id):
        """Initialize test camera with synthetic frames"""
        self.camera_id = camera_id
        self.frame_count = 0
        self.is_streaming = False
        self.last_frame_time = None
        self.detection_data = {
            'cars': 0, 'bikes': 0, 'buses': 0, 
            'trucks': 0, 'ambulances': 0, 'pedestrians': 0
        }
        self.thread = None
        self.lock = threading.Lock()
        self.yolo = None
        
    def start_streaming(self):
        """Start synthetic frame generation"""
        if self.is_streaming:
            return
        
        self.is_streaming = True
        self.last_frame_time = time.time()
        
        # Start synthetic frame generation thread
        self.thread = threading.Thread(target=self._generate_frames, daemon=True)
        self.thread.start()
        logger.info(f"Test camera {self.camera_id} started (synthetic mode)")
        return True
    
    def _generate_frames(self):
        """Generate synthetic traffic video frames"""
        frame_idx = 0
        while self.is_streaming:
            try:
                # Create synthetic frame
                frame = np.zeros((720, 1280, 3), dtype=np.uint8)
                
                # Add dark background (asphalt)
                frame[:, :] = [50, 50, 60]
                
                # Add road markings
                cv2.line(frame, (0, 360), (1280, 360), (255, 255, 100), 3)  # Center line
                for x in range(0, 1280, 100):
                    cv2.line(frame, (x, 360), (min(x+50, 1280), 360), (255, 255, 100), 2)
                
                # Simulate moving traffic (rectangles representing vehicles)
                frame_offset = (frame_idx * 5) % 1280
                
                # Car 1
                cv2.rectangle(frame, (frame_offset, 300), (frame_offset + 120, 380), (0, 0, 255), -1)
                cv2.putText(frame, "Car", (frame_offset + 30, 345), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                # Car 2
                car2_offset = (frame_offset + 400) % 1280
                cv2.rectangle(frame, (car2_offset, 300), (car2_offset + 120, 380), (0, 255, 0), -1)
                cv2.putText(frame, "Car", (car2_offset + 30, 345), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                # Truck
                truck_offset = (frame_offset + 800) % 1280
                cv2.rectangle(frame, (truck_offset, 250), (truck_offset + 150, 420), (255, 0, 0), -1)
                cv2.putText(frame, "Truck", (truck_offset + 30, 335), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                
                # Bus
                bus_offset = (frame_offset - 300) % 1280
                cv2.rectangle(frame, (bus_offset, 200), (bus_offset + 140, 400), (0, 165, 255), -1)
                cv2.putText(frame, "Bus", (bus_offset + 35, 305), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                
                # Update synthetic detection data
                with self.lock:
                    self.detection_data = {
                        'cars': 2,
                        'bikes': 1,
                        'buses': 1,
                        'trucks': 1,
                        'ambulances': 0,
                        'pedestrians': 2
                    }
                
                self.frame_count += 1
                self.last_frame_time = time.time()
                frame_idx += 1
                time.sleep(0.033)  # ~30 FPS
                
                # Store current frame for retrieval
                self.current_frame = frame.copy()
                
            except Exception as e:
                logger.error(f"Test frame generation error: {e}")
                break
    
    def stop_streaming(self):
        """Stop synthetic frame generation"""
        self.is_streaming = False
        if self.thread:
            self.thread.join(timeout=2)
        logger.info(f"Test camera {self.camera_id} stopped")
    
    def get_frame(self):
        """Get current synthetic frame"""
        if not self.is_streaming:
            return None
        
        try:
            if hasattr(self, 'current_frame'):
                return self.current_frame.copy()
        except Exception as e:
            logger.error(f"Error getting test frame: {e}")
        
        return None
    
    def get_status(self):
        """Get camera status"""
        with self.lock:
            is_actually_streaming = (
                self.is_streaming and 
                self.frame_count > 0
            )
            
            return {
                'is_streaming': is_actually_streaming,
                'frame_count': self.frame_count,
                'detections': self.detection_data,
                'total_vehicles': sum(self.detection_data.values()),
                'last_frame_time': self.last_frame_time
            }

# Real Camera class with YOLO detection
class RealCamera:
    def __init__(self, camera_id, source=0):
        """
        Initialize real camera with YOLO detection.
        
        Args:
            camera_id: Camera identifier (e.g., 'Junction-01')
            source: Camera source (0 for USB, RTSP URL, or file path)
        """
        self.camera_id = camera_id
        self.source = source
        self.cap = None
        self.current_frame = None
        self.frame_count = 0
        self.is_streaming = False
        self.last_frame_time = None
        self.detection_data = {
            'cars': 0, 'bikes': 0, 'buses': 0, 
            'trucks': 0, 'ambulances': 0, 'pedestrians': 0
        }
        self.thread = None
        self.lock = threading.Lock()
        
        # Load YOLO model if available
        self.yolo = None
        if YOLO_AVAILABLE:
            try:
                self.yolo = YOLO('yolov8n.pt')
                logger.info(f"Loaded YOLO model for {camera_id}")
            except Exception as e:
                logger.warning(f"Failed to load YOLO: {e}")
        
    def start_streaming(self):
        """Start camera stream and detection thread"""
        if self.is_streaming:
            return
            
        try:
            # Retry opening the camera a few times (in case it's in use)
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    self.cap = cv2.VideoCapture(self.source)
                    if self.cap.isOpened():
                        break
                    else:
                        self.cap.release()
                        if attempt < max_retries - 1:
                            logger.warning(f"Camera open attempt {attempt + 1} failed, retrying...")
                            time.sleep(1)
                except Exception as e:
                    logger.warning(f"Camera open attempt {attempt + 1} error: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(1)
            
            if not self.cap or not self.cap.isOpened():
                logger.error(f"Failed to open camera {self.camera_id} from source {self.source} after {max_retries} attempts")
                self.cap = None
                return False
            
            # Set camera properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer to reduce lag
            
            self.is_streaming = True
            self.last_frame_time = time.time()
            
            # Start detection thread
            self.thread = threading.Thread(target=self._capture_and_detect, daemon=True)
            self.thread.start()
            logger.info(f"Camera {self.camera_id} started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error starting camera: {e}")
            self.is_streaming = False
            return False
    
    def _capture_and_detect(self):
        """Capture frames and run YOLO detection"""
        consecutive_failures = 0
        max_failures = 15  # Allow more failures before stopping (camera needs time to stabilize)
        
        while self.is_streaming:
            try:
                ret, frame = self.cap.read()
                if not ret:
                    consecutive_failures += 1
                    if consecutive_failures >= max_failures:
                        logger.warning(f"Too many frame read failures from {self.camera_id}, stopping stream")
                        self.is_streaming = False
                        break
                    time.sleep(0.1)
                    continue
                
                consecutive_failures = 0  # Reset on successful frame
                
                # Resize frame
                frame = cv2.resize(frame, (1280, 720))
                
                # Store current frame for get_frame() method
                self.current_frame = frame.copy()
                
                # Run YOLO detection
                if self.yolo:
                    try:
                        results = self.yolo(frame, conf=0.5, verbose=False)
                        self._process_detections(results[0])
                    except Exception as e:
                        logger.warning(f"YOLO detection warning: {e}")
                
                self.frame_count += 1
                self.last_frame_time = time.time()
                time.sleep(0.033)  # ~30 FPS
                
            except Exception as e:
                logger.error(f"Capture error in {self.camera_id}: {e}")
                self.is_streaming = False
                break
    
    def _process_detections(self, results):
        """Process YOLO detection results"""
        try:
            with self.lock:
                # Reset counts
                self.detection_data = {
                    'cars': 0, 'bikes': 0, 'buses': 0,
                    'trucks': 0, 'ambulances': 0, 'pedestrians': 0
                }
                
                # Process detections
                for box in results.boxes:
                    class_id = int(box.cls[0])
                    class_name = results.names[class_id].lower()
                    confidence = float(box.conf[0])
                    
                    # Map YOLO classes to our categories
                    if 'car' in class_name and 'truck' not in class_name and 'bus' not in class_name:
                        self.detection_data['cars'] += 1
                        logger.debug(f"{self.camera_id}: Detected CAR (confidence: {confidence:.2f})")
                    elif 'motorcycle' in class_name or 'bicycle' in class_name or 'bike' in class_name:
                        self.detection_data['bikes'] += 1
                        logger.debug(f"{self.camera_id}: Detected BIKE (confidence: {confidence:.2f})")
                    elif 'bus' in class_name:
                        self.detection_data['buses'] += 1
                        logger.debug(f"{self.camera_id}: Detected BUS (confidence: {confidence:.2f})")
                    elif 'truck' in class_name:
                        self.detection_data['trucks'] += 1
                        logger.debug(f"{self.camera_id}: Detected TRUCK (confidence: {confidence:.2f})")
                    elif 'person' in class_name or 'pedestrian' in class_name:
                        self.detection_data['pedestrians'] += 1
                        logger.debug(f"{self.camera_id}: Detected PEDESTRIAN (confidence: {confidence:.2f})")
                    # Ambulances and emergency vehicles are typically detected as cars
                    # Check the bounding box location or other heuristics
                
                # Log detection summary
                total = sum(self.detection_data.values())
                if total > 0:
                    logger.info(f"{self.camera_id} Detections: Cars={self.detection_data['cars']}, Buses={self.detection_data['buses']}, Trucks={self.detection_data['trucks']}, Pedestrians={self.detection_data['pedestrians']}, Total={total}")
                        
        except Exception as e:
            logger.error(f"Error processing detections: {e}")
    
    def stop_streaming(self):
        """Stop camera stream"""
        self.is_streaming = False
        if self.cap:
            self.cap.release()
        if self.thread:
            self.thread.join(timeout=2)
        logger.info(f"Camera {self.camera_id} stopped")
    
    def get_frame(self):
        """Get latest frame from camera"""
        if not self.is_streaming or not hasattr(self, 'current_frame'):
            return None
        
        try:
            if self.current_frame is not None:
                return self.current_frame.copy()
        except Exception as e:
            logger.error(f"Error getting frame from {self.camera_id}: {e}")
        
        return None
    
    def get_status(self):
        """Get camera status with detection data"""
        with self.lock:
            # Camera is only streaming if cap is open AND actively reading frames
            is_actually_streaming = (
                self.is_streaming and 
                self.cap is not None and 
                self.cap.isOpened() and
                self.frame_count > 0
            )
            
            return {
                'is_streaming': is_actually_streaming,
                'frame_count': self.frame_count,
                'detections': self.detection_data,
                'total_vehicles': sum(self.detection_data.values()),
                'last_frame_time': self.last_frame_time
            }

# Initialize cameras - Try real camera first, fall back to test mode
logger.info("Detecting available cameras...")
available_cameras = []  # Skip detection - just assume camera 0 exists
# Try to directly use camera 0 without detection
logger.info("Skipping camera detection - will attempt direct camera 0 access")
logger.info(f"Found {len(available_cameras)} camera(s): {available_cameras}")

cameras = {}
for idx, junction_id in enumerate(['Junction-01', 'Junction-02', 'Junction-03']):
    camera = None
    
    # Only Junction-01 gets the real camera to avoid hardware contention
    # Other junctions use test cameras (synthetic video)
    if idx == 0:  # Only first junction tries real camera
        logger.info(f"Attempting to initialize real camera for {junction_id}...")
        camera = RealCamera(junction_id, source=0)  # Try camera 0 directly
        
        if camera.start_streaming():
            # Give it time to start reading frames
            time.sleep(3)  # Wait 3 seconds for frames to be captured
            status = camera.get_status()
            
            logger.info(f"{junction_id}: Real camera started - Frames: {status['frame_count']}, Streaming: {status['is_streaming']}")
            
            # Check if camera actually started capturing frames
            if status['frame_count'] > 0:
                logger.info(f"✓ {junction_id} using REAL CAMERA (Real frames captured!)")
                cameras[junction_id] = camera
                continue
            else:
                logger.warning(f"✗ {junction_id}: Camera failed to capture frames, switching to test camera")
                camera.stop_streaming()
    
    # Fall back to test camera (synthetic video) if real camera fails
    logger.info(f"Using test camera (synthetic video) for {junction_id}")
    camera = TestCamera(junction_id)
    camera.start_streaming()
    cameras[junction_id] = camera
    time.sleep(0.5)

# Global vehicle count for status
vehicle_count = 45

# ==================== Video Streaming ====================
def generate_frames(camera_id):
    """Generate MJPEG frames from real camera"""
    if camera_id not in cameras:
        return
    
    camera = cameras[camera_id]
    
    # Check if camera is actually streaming (not just marked as streaming, but actively capturing frames)
    status = camera.get_status()
    if not status['is_streaming']:
        logger.warning(f"Cannot stream from {camera_id} - camera is offline")
        return
    
    while camera.is_streaming:
        frame = camera.get_frame()
        
        if frame is None:
            time.sleep(0.1)
            continue
        
        # Draw detection results on frame
        status = camera.get_status()
        detections = status.get('detections', {})
        total = status.get('total_vehicles', 0)
        
        # Add detection info to frame
        y_offset = 30
        cv2.putText(frame, f"Detections: {total} vehicles", (10, y_offset),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        y_offset += 40
        
        for vehicle_type, count in detections.items():
            if count > 0:
                text = f"{vehicle_type.capitalize()}: {count}"
                cv2.putText(frame, text, (10, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                y_offset += 35
        
        # Encode frame
        ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n'
                   b'Content-Length: ' + str(len(jpeg)).encode() + b'\r\n\r\n' + 
                   jpeg.tobytes() + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

@app.route('/api/video/stream/<camera_id>')
def video_stream(camera_id):
    """Stream video from camera"""
    if camera_id not in cameras:
        return jsonify({'error': f'Camera {camera_id} not found'}), 404
    
    camera = cameras[camera_id]
    status = camera.get_status()
    
    # Don't serve stream if camera is offline
    if not status['is_streaming']:
        return jsonify({'error': f'Camera {camera_id} is offline'}), 503
    
    return Response(generate_frames(camera_id),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/video/status/<camera_id>')
def video_status(camera_id):
    """Get camera status with detection data"""
    if camera_id not in cameras:
        return jsonify({'error': f'Camera {camera_id} not found'}), 404
    
    camera = cameras[camera_id]
    status = camera.get_status()
    
    return jsonify({
        'camera_id': camera_id,
        'is_streaming': status['is_streaming'],
        'status': 'streaming' if status['is_streaming'] else 'offline',
        'resolution': '1280x720',
        'fps': 30,
        'frame_count': status['frame_count'],
        'detections': status['detections'],
        'total_vehicles': status['total_vehicles'],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/camera/start/<camera_id>', methods=['POST'])
def start_camera(camera_id):
    """Start camera stream"""
    if camera_id not in cameras:
        return jsonify({'error': f'Camera {camera_id} not found'}), 404
    
    camera = cameras[camera_id]
    success = camera.start_streaming()
    
    return jsonify({
        'status': 'success' if success else 'failed',
        'message': f'Camera {camera_id} started' if success else 'Failed to start camera',
        'is_streaming': camera.is_streaming
    })

@app.route('/api/camera/stop/<camera_id>', methods=['POST'])
def stop_camera(camera_id):
    """Stop camera stream"""
    if camera_id not in cameras:
        return jsonify({'error': f'Camera {camera_id} not found'}), 404
    
    cameras[camera_id].stop_streaming()
    return jsonify({
        'status': 'success',
        'message': f'Camera {camera_id} stopped',
        'is_streaming': False
    })

# ==================== Traffic Data ====================
@app.route('/api/traffic/overview')
def traffic_overview():
    """Get traffic overview with real detection data"""
    global vehicle_count
    
    junctions = []
    
    for camera_id, camera in cameras.items():
        status = camera.get_status()
        detections = status['detections']
        total_vehicles = status['total_vehicles']
        is_streaming = status['is_streaming']
        
        # Only count vehicles if camera is streaming
        if is_streaming:
            vehicle_count = total_vehicles
        else:
            vehicle_count = 0
        
        junctions.append({
            'id': camera_id,
            'name': f'{camera_id} Junction',
            'density': vehicle_count / 100,
            'vehicles': vehicle_count,
            'is_streaming': is_streaming,
            'traffic_level': 'Heavy' if vehicle_count > 50 else 'Moderate' if vehicle_count > 30 else 'Light',
            'detection_counts': {
                'cars': detections.get('cars', 0),
                'bikes': detections.get('bikes', 0),
                'buses': detections.get('buses', 0),
                'trucks': detections.get('trucks', 0),
                'ambulances': detections.get('ambulances', 0),
                'pedestrians': detections.get('pedestrians', 0)
            },
            'timestamp': datetime.now().isoformat()
        })
    
    return jsonify({
        'status': 'success',
        'timestamp': datetime.now().isoformat(),
        'data': {'junctions': junctions}
    })

@app.route('/api/detection/latest/<camera_id>')
def detection_latest(camera_id):
    """Get latest real-time detection data from camera"""
    if camera_id not in cameras:
        return jsonify({'error': f'Camera {camera_id} not found'}), 404
    
    camera = cameras[camera_id]
    status = camera.get_status()
    detections = status['detections']
    
    return jsonify({
        'status': 'success',
        'camera_id': camera_id,
        'is_streaming': status['is_streaming'],
        'frame_count': status['frame_count'],
        'timestamp': datetime.now().isoformat(),
        'detections': {
            'cars': detections.get('cars', 0),
            'bikes': detections.get('bikes', 0),
            'buses': detections.get('buses', 0),
            'trucks': detections.get('trucks', 0),
            'ambulances': detections.get('ambulances', 0),
            'pedestrians': detections.get('pedestrians', 0),
            'total': status['total_vehicles']
        }
    })

@app.route('/api/predictions/traffic/<junction_id>')
def traffic_predictions(junction_id):
    """Get traffic predictions"""
    
    hourly_forecast = []
    for hour in range(24):
        hourly_forecast.append({
            'hour': hour,
            'predicted_congestion': np.random.rand() * 0.8,
            'confidence': 0.75
        })
    
    return jsonify({
        'status': 'success',
        'data': {
            'junction_id': junction_id,
            'current_prediction': {
                'congestion_level': np.random.rand() * 0.5,
                'confidence': 0.85,
                'timestamp': datetime.now().isoformat()
            },
            'hourly_forecast': hourly_forecast,
            'daily_summary': {
                'peak_hours': ['6-8', '17-20'],
                'expected_peak_congestion': 0.8,
                'best_travel_time': '10:00-16:00'
            }
        }
    })

# ==================== Health Check ====================
@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/')
def root():
    """Root endpoint"""
    return jsonify({
        'service': 'Smart Traffic Management System',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'traffic_overview': '/api/traffic/overview',
            'predictions': '/api/predictions/traffic/{junction_id}',
            'video_stream': '/api/video/stream/{camera_id}',
            'video_status': '/api/video/status/{camera_id}'
        }
    })

if __name__ == '__main__':
    logger.info("Starting Flask Server on http://127.0.0.1:8001")
    app.run(host='127.0.0.1', port=8001, debug=False, threaded=True)
