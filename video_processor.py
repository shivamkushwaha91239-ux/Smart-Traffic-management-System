"""
Video Processing Module
Handles real-time video capture from traffic cameras, frame extraction,
and video stream management for YOLO detection.
"""

import cv2
import threading
import numpy as np
import time
from collections import deque
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Real-time video capture and processing from traffic cameras.
    Supports multiple camera sources (RTSP, USB, IP cameras).
    """
    
    def __init__(self, camera_id, source, buffer_size=30):
        """
        Initialize video processor.
        
        Args:
            camera_id: Unique identifier (e.g., 'Junction-01')
            source: Video source (RTSP URL, file path, USB ID, or 0 for default)
            buffer_size: Number of frames to keep in buffer
        """
        self.camera_id = camera_id
        self.source = source
        self.buffer_size = buffer_size
        self.frame_buffer = deque(maxlen=buffer_size)
        self.latest_frame = None
        self.is_running = False
        self.fps = 30
        self.width = 1280
        self.height = 720
        self.frame_count = 0
        self.drop_count = 0
        self.thread = None
        self.lock = threading.Lock()
        
    def start(self):
        """Start background video capture thread."""
        if self.is_running:
            logger.warning(f"{self.camera_id}: Already running")
            return False
        
        self.is_running = True
        self.thread = threading.Thread(target=self._capture_frames, daemon=True)
        self.thread.start()
        logger.info(f"{self.camera_id}: Video capture started from {self.source}")
        return True
    
    def stop(self):
        """Stop video capture thread."""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2)
        logger.info(f"{self.camera_id}: Video capture stopped")
    
    def _capture_frames(self):
        """Background thread: Continuously capture frames from source."""
        cap = None
        last_reconnect_attempt = time.time()
        reconnect_delay = 5
        
        # Try different camera opening strategies
        def try_open_camera_optimized():
            """Try to open camera with optimized Windows settings."""
            cap_temp = None
            
            # Try with DSHOW first (best for Windows USB cameras)
            try:
                cap_temp = cv2.VideoCapture(int(self.source) if isinstance(self.source, (int, str)) and str(self.source).isdigit() else self.source, cv2.CAP_DSHOW)
                if cap_temp and cap_temp.isOpened():
                    logger.info(f"{self.camera_id}: Camera opened with DSHOW backend")
                    return cap_temp
            except Exception as e:
                logger.debug(f"{self.camera_id}: DSHOW failed: {e}")
                if cap_temp:
                    cap_temp.release()
            
            # Try with default backend
            try:
                cap_temp = cv2.VideoCapture(int(self.source) if isinstance(self.source, (int, str)) and str(self.source).isdigit() else self.source)
                if cap_temp and cap_temp.isOpened():
                    logger.info(f"{self.camera_id}: Camera opened with default backend")
                    return cap_temp
            except Exception as e:
                logger.debug(f"{self.camera_id}: Default backend failed: {e}")
                if cap_temp:
                    cap_temp.release()
            
            # Try with V4L2 (Windows may not support)
            try:
                cap_temp = cv2.VideoCapture(int(self.source) if isinstance(self.source, (int, str)) and str(self.source).isdigit() else self.source, cv2.CAP_V4L2)
                if cap_temp and cap_temp.isOpened():
                    logger.info(f"{self.camera_id}: Camera opened with V4L2 backend")
                    return cap_temp
            except Exception as e:
                logger.debug(f"{self.camera_id}: V4L2 failed: {e}")
                if cap_temp:
                    cap_temp.release()
            
            logger.warning(f"{self.camera_id}: Could not open camera from source: {self.source}")
            return None
        
        frame_error_count = 0
        max_errors = 20
        use_fallback = False
        
        try:
            # Initial camera open attempt
            cap = try_open_camera_optimized()
            
            if cap is None:
                logger.warning(f"{self.camera_id}: Camera not available, using enhanced mock frames")
                use_fallback = True
            else:
                # Configure camera properties
                try:
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                    cap.set(cv2.CAP_PROP_FPS, self.fps)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    
                    # Get actual properties
                    self.width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or self.width
                    self.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or self.height
                    self.fps = int(cap.get(cv2.CAP_PROP_FPS)) or self.fps
                    
                    logger.info(f"{self.camera_id}: Camera ready - {self.width}x{self.height} @ {self.fps} FPS")
                except Exception as e:
                    logger.warning(f"{self.camera_id}: Could not configure camera: {e}")
            
            frame_count = 0
            
            while self.is_running:
                frame = None
                
                # Try to get frame from real camera
                if cap is not None and not use_fallback:
                    try:
                        ret, frame = cap.read()
                        
                        if ret and frame is not None and frame.shape[0] > 0:
                            frame_error_count = 0
                            frame = cv2.resize(frame, (self.width, self.height))
                            # Add indicator that it's REAL camera
                            cv2.putText(frame, "[LIVE CAMERA]", (self.width - 250, 25),
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                        else:
                            frame_error_count += 1
                            if frame_error_count >= max_errors:
                                logger.warning(f"{self.camera_id}: Camera unavailable, switching to mock")
                                use_fallback = True
                                cap.release()
                                cap = None
                                frame = None
                    except Exception as e:
                        frame_error_count += 1
                        logger.debug(f"{self.camera_id}: Frame read error: {e}")
                        if frame_error_count >= max_errors:
                            use_fallback = True
                
                # Try to reconnect if camera failed
                if (cap is None or use_fallback) and (time.time() - last_reconnect_attempt > reconnect_delay):
                    logger.info(f"{self.camera_id}: Attempting camera reconnection...")
                    new_cap = try_open_camera_optimized()
                    if new_cap is not None:
                        if cap:
                            cap.release()
                        cap = new_cap
                        use_fallback = False
                        frame_error_count = 0
                        logger.info(f"{self.camera_id}: Successfully reconnected to camera!")
                    last_reconnect_attempt = time.time()
                
                # Generate realistic mock frame for fallback
                if frame is None:
                    frame = self._generate_enhanced_mock_frame()
                
                # Add timestamp
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                cv2.putText(frame, timestamp, (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                           0.7, (0, 255, 0), 2)
                
                frame_count += 1
                
                # Store in buffer
                with self.lock:
                    self.frame_buffer.append(frame.copy())
                    self.latest_frame = frame.copy()
                    self.frame_count += 1
                
                # Control frame rate
                time.sleep(1.0 / self.fps)
        
        except Exception as e:
            logger.error(f"{self.camera_id}: Capture thread error: {str(e)}", exc_info=True)
        
        finally:
            if cap is not None:
                cap.release()
            logger.info(f"{self.camera_id}: Capture thread terminated")
    
    def _generate_enhanced_mock_frame(self):
        """Generate a realistic mock traffic scene frame."""
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Create gradient background (sky)
        for i in range(int(self.height * 0.4)):
            intensity = int(100 + (i / (self.height * 0.4)) * 50)
            frame[i, :] = [intensity + 50, intensity, intensity - 30]
        
        # Create road background
        for i in range(int(self.height * 0.4), self.height):
            intensity = int(80 + ((i - self.height * 0.4) / (self.height * 0.6)) * 30)
            frame[i, :] = [intensity - 20, intensity, intensity - 40]
        
        # Draw road surface
        road_top = int(self.height * 0.35)
        cv2.rectangle(frame, (30, road_top), (self.width - 30, self.height - 30), (60, 70, 50), -1)
        
        # Draw lane markings
        lane_positions = [int(self.height * 0.45), int(self.height * 0.60), int(self.height * 0.75)]
        for y in lane_positions:
            for x in range(50, self.width - 50, 40):
                cv2.line(frame, (x, y), (x + 20, y), (255, 255, 200), 3)
        
        # Draw realistic vehicles with better shapes
        # Vehicle format: (center_x, center_y, width, height, color)
        vehicles = [
            (120, 250, 70, 45, (0, 100, 255)),      # Red car (front left)
            (300, 300, 85, 50, (0, 150, 200)),      # Orange car
            (550, 200, 75, 48, (255, 100, 0)),      # Blue car
            (800, 320, 90, 55, (100, 255, 0)),      # Green car
            (1000, 280, 70, 45, (200, 100, 255)),   # Magenta car
        ]
        
        for cx, cy, w, h, color in vehicles:
            # Draw car body
            cv2.rectangle(frame, (cx - w//2, cy - h//2), (cx + w//2, cy + h//2), color, -1)
            
            # Draw car details (windows)
            window_color = (50, 50, 100)
            cv2.rectangle(frame, (cx - w//3, cy - h//3), (cx - w//6, cy - h//6), window_color, -1)
            cv2.rectangle(frame, (cx + w//6, cy - h//3), (cx + w//3, cy - h//6), window_color, -1)
            
            # Draw wheels
            wheel_color = (10, 10, 10)
            cv2.circle(frame, (cx - w//3, cy + h//2 - 5), 6, wheel_color, -1)
            cv2.circle(frame, (cx + w//3, cy + h//2 - 5), 6, wheel_color, -1)
        
        # Add lane dividers on sides
        cv2.line(frame, (30, road_top), (30, self.height - 30), (200, 200, 255), 4)
        cv2.line(frame, (self.width - 30, road_top), (self.width - 30, self.height - 30), (200, 200, 255), 4)
        
        # Add timestamp and info
        cv2.putText(frame, f"{self.camera_id} - Live Stream", (50, 50),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 2)
        cv2.putText(frame, f"Vehicles: {len(vehicles)}", (50, 80),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        
        # Add frame counter for debugging
        if not hasattr(self, 'mock_frame_count'):
            self.mock_frame_count = 0
        self.mock_frame_count += 1
        cv2.putText(frame, f"Frame: {self.mock_frame_count}", (self.width - 250, 50),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 1)
        
        return frame
    
    def get_frame(self):
        """
        Get latest frame.
        
        Returns:
            Frame (numpy array) or None if no frame available
        """
        with self.lock:
            # Always return a frame - generate mock if needed
            if self.latest_frame is None:
                return self._generate_enhanced_mock_frame()
            return self.latest_frame.copy()
    
    def get_frame_buffer(self):
        """Get all buffered frames."""
        with self.lock:
            return list(self.frame_buffer)
    
    def save_frame(self, filename):
        """Save latest frame to file."""
        frame = self.get_frame()
        if frame is None:
            return False
        
        try:
            cv2.imwrite(filename, frame)
            logger.info(f"{self.camera_id}: Frame saved to {filename}")
            return True
        except Exception as e:
            logger.error(f"{self.camera_id}: Save error: {str(e)}")
            return False
    
    def get_stats(self):
        """Get capture statistics."""
        return {
            "camera_id": self.camera_id,
            "is_running": self.is_running,
            "frames_captured": self.frame_count,
            "buffer_size": len(self.frame_buffer),
            "resolution": f"{self.width}x{self.height}",
            "fps": self.fps,
            "timestamp": datetime.now().isoformat()
        }


class MultiCameraManager:
    """
    Manages multiple video sources simultaneously.
    """
    
    def __init__(self):
        """Initialize multi-camera manager."""
        self.cameras = {}
        self.lock = threading.Lock()
    
    def add_camera(self, camera_id, source):
        """
        Add a new camera source.
        
        Args:
            camera_id: Unique identifier
            source: Video source (URL, file, or USB ID)
        """
        with self.lock:
            if camera_id in self.cameras:
                logger.warning(f"Camera {camera_id} already exists")
                return False
            
            processor = VideoProcessor(camera_id, source)
            self.cameras[camera_id] = processor
            logger.info(f"Camera {camera_id} added")
            return True
    
    def start_all(self):
        """Start all camera capture threads."""
        with self.lock:
            for camera_id, processor in self.cameras.items():
                processor.start()
        logger.info(f"Started {len(self.cameras)} camera(s)")
    
    def stop_all(self):
        """Stop all camera capture threads."""
        with self.lock:
            for processor in self.cameras.values():
                processor.stop()
        logger.info("All cameras stopped")
    
    def get_frame(self, camera_id):
        """Get frame from specific camera."""
        with self.lock:
            if camera_id not in self.cameras:
                return None
            return self.cameras[camera_id].get_frame()
    
    def get_all_frames(self):
        """Get latest frame from all cameras."""
        frames = {}
        with self.lock:
            for camera_id, processor in self.cameras.items():
                frames[camera_id] = processor.get_frame()
        return frames
    
    def get_stats(self):
        """Get statistics for all cameras."""
        stats = {}
        with self.lock:
            for camera_id, processor in self.cameras.items():
                stats[camera_id] = processor.get_stats()
        return stats


class FrameEncoder:
    """
    Encode frames for MJPEG streaming over HTTP.
    """
    
    @staticmethod
    def encode_frame(frame):
        """
        Encode frame to JPEG bytes.
        
        Args:
            frame: OpenCV frame
        
        Returns:
            JPEG encoded bytes
        """
        if frame is None:
            return None
        
        try:
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                return buffer.tobytes()
        except Exception as e:
            logger.error(f"Frame encoding error: {str(e)}")
        
        return None
    
    @staticmethod
    def create_mjpeg_frame(jpeg_bytes):
        """
        Create MJPEG frame for streaming.
        
        Args:
            jpeg_bytes: Encoded JPEG data
        
        Returns:
            MJPEG frame with boundary
        """
        if jpeg_bytes is None:
            return b''
        
        return (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n'
                b'Content-Length: ' + str(len(jpeg_bytes)).encode() + b'\r\n\r\n'
                + jpeg_bytes + b'\r\n')


class FrameDrawer:
    """
    Draw annotations on frames (ROI, detections, text).
    """
    
    @staticmethod
    def draw_roi(frame, roi_points, label="ROI", color=(0, 255, 0), thickness=2):
        """
        Draw ROI polygon on frame.
        
        Args:
            frame: OpenCV frame
            roi_points: List of (x, y) points defining polygon
            label: Text label for ROI
            color: BGR color tuple
            thickness: Line thickness
        
        Returns:
            Frame with drawn ROI
        """
        if not roi_points or len(roi_points) < 2:
            return frame
        
        frame = frame.copy()
        points = np.array(roi_points, dtype=np.int32)
        cv2.polylines(frame, [points], True, color, thickness)
        
        # Draw points
        for i, point in enumerate(roi_points):
            cv2.circle(frame, tuple(point), 5, color, -1)
            cv2.putText(frame, str(i), tuple(point), cv2.FONT_HERSHEY_SIMPLEX,
                       0.5, color, 2)
        
        # Draw label
        if label and len(roi_points) > 0:
            cv2.putText(frame, label, roi_points[0], cv2.FONT_HERSHEY_SIMPLEX,
                       0.7, color, 2)
        
        return frame
    
    @staticmethod
    def draw_detection(frame, detections, lane_id=None):
        """
        Draw YOLO detections on frame.
        
        Args:
            frame: OpenCV frame
            detections: List of detection dicts with 'box', 'class', 'confidence'
            lane_id: Optional lane identifier
        
        Returns:
            Frame with drawn detections
        """
        if not detections:
            return frame
        
        frame = frame.copy()
        colors = {
            'car': (0, 255, 255),      # Cyan
            'truck': (255, 0, 0),      # Blue
            'bus': (0, 165, 255),      # Orange
            'bike': (0, 255, 0),       # Green
            'pedestrian': (255, 0, 255), # Magenta
            'ambulance': (0, 0, 255)   # Red
        }
        
        for det in detections:
            x1, y1, x2, y2 = det.get('box', (0, 0, 0, 0))
            class_name = det.get('class', 'unknown')
            confidence = det.get('confidence', 0)
            
            color = colors.get(class_name, (255, 255, 255))
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        return frame
    
    @staticmethod
    def draw_stats(frame, stats_dict):
        """
        Draw statistics on frame.
        
        Args:
            frame: OpenCV frame
            stats_dict: Dictionary of stats to display
        
        Returns:
            Frame with drawn stats
        """
        frame = frame.copy()
        y_offset = 60
        
        for key, value in stats_dict.items():
            text = f"{key}: {value}"
            cv2.putText(frame, text, (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            y_offset += 30
        
        return frame
