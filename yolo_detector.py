"""
YOLO Vehicle Detection Module
Real-time vehicle detection using YOLOv8 with multi-class support.
"""

import numpy as np
import logging
from typing import List, Dict, Tuple
import threading
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("ultralytics not installed. Using mock detections.")


class YOLODetector:
    """
    Real-time vehicle detection using YOLOv8.
    Detects and classifies: cars, buses, trucks, bikes, ambulances, pedestrians.
    """
    
    # COCO classes we care about
    VEHICLE_CLASSES = {
        'car': 2,
        'motorcycle': 3,
        'bus': 5,
        'truck': 7,
        'person': 0,  # For pedestrians
        'bicycle': 1,
    }
    
    def __init__(self, model_name="yolov8n.pt", confidence=0.5, device=0):
        """
        Initialize YOLO detector.
        
        Args:
            model_name: YOLOv8 model (nano, small, medium, large, xlarge)
            confidence: Detection confidence threshold (0-1)
            device: GPU device ID or 'cpu'
        """
        self.model_name = model_name
        self.confidence = confidence
        self.device = device
        self.model = None
        self.is_loaded = False
        self.lock = threading.Lock()
        self.last_results = None
        
        self.load_model()
    
    def load_model(self):
        """Load YOLO model."""
        if not YOLO_AVAILABLE:
            logger.warning("YOLO not available, using mock detector")
            self.is_loaded = True
            return
        
        try:
            logger.info(f"Loading YOLO model: {self.model_name}")
            
            # Fix PyTorch 2.6+ weights_only issue by patching torch.load
            import torch
            original_load = torch.load
            
            def patched_load(f, *args, **kwargs):
                """Wrapper to disable weights_only for YOLO compatibility"""
                if 'weights_only' not in kwargs:
                    kwargs['weights_only'] = False
                try:
                    return original_load(f, *args, **kwargs)
                except Exception:
                    # If that fails, try with weights_only=False explicitly
                    kwargs['weights_only'] = False
                    return original_load(f, *args, **kwargs)
            
            # Temporarily replace torch.load
            torch.load = patched_load
            
            # Now load the model
            self.model = YOLO(self.model_name)
            
            # Restore original torch.load
            torch.load = original_load
            
            self.is_loaded = True
            logger.info("YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {str(e)}")
            self.is_loaded = False
    
    def detect(self, frame, conf_threshold=None):
        """
        Detect vehicles in frame - REAL DETECTION ONLY (no mock fallback).
        
        Args:
            frame: OpenCV image frame
            conf_threshold: Override confidence threshold
        
        Returns:
            List of detection dicts with 'box', 'class', 'confidence'
        """
        if frame is None:
            return []
        
        # If YOLO not loaded, return empty list (no detections without real model)
        if not self.is_loaded or self.model is None:
            logger.debug("YOLO model not loaded - real detections unavailable")
            return []
        
        conf = conf_threshold or self.confidence
        
        try:
            # Ensure frame is in correct format
            if not isinstance(frame, np.ndarray):
                logger.error(f"Invalid frame type: {type(frame)}")
                return []
            
            if frame.size == 0:
                logger.error("Empty frame received")
                return []
            
            # Run YOLO inference
            with self.lock:
                results = self.model(frame, conf=conf, verbose=False)
                self.last_results = results
            
            detections = self._parse_results(results)
            
            if detections:
                logger.debug(f"YOLO detected {len(detections)} objects: {[d['class'] for d in detections]}")
            
            return detections
        
        except Exception as e:
            logger.error(f"YOLO Detection error: {str(e)}", exc_info=True)
            return []
    
    def _parse_results(self, results):
        """
        Parse YOLO results into detection list.
        
        Args:
            results: YOLOv8 results object
        
        Returns:
            List of detection dicts
        """
        detections = []
        
        for result in results:
            boxes = result.boxes
            
            for i, box in enumerate(boxes):
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                
                # Get class and confidence
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = result.names[class_id]
                
                # Map to vehicle class
                vehicle_class = self._map_class(class_name)
                
                detection = {
                    'box': (x1, y1, x2, y2),
                    'class': vehicle_class,
                    'confidence': confidence,
                    'yolo_class': class_name,
                    'class_id': class_id
                }
                
                detections.append(detection)
        
        return detections
    
    def _map_class(self, yolo_class):
        """
        Map YOLO class name to vehicle type.
        
        Args:
            yolo_class: YOLO class name
        
        Returns:
            Vehicle type string
        """
        yolo_class = yolo_class.lower()
        
        if 'car' in yolo_class:
            return 'car'
        elif 'motorcycle' in yolo_class or 'bike' in yolo_class:
            return 'bike'
        elif 'bus' in yolo_class:
            return 'bus'
        elif 'truck' in yolo_class:
            return 'truck'
        elif 'ambulance' in yolo_class:
            return 'ambulance'
        elif 'person' in yolo_class:
            return 'pedestrian'
        else:
            return 'vehicle'
    
    def get_mock_detections(self, frame):
        """
        Generate mock detections for testing without YOLO.
        Includes vehicles and pedestrians.
        
        Args:
            frame: OpenCV frame
        
        Returns:
            List of mock detection dicts
        """
        h, w = frame.shape[:2]
        num_vehicles = np.random.randint(3, 12)
        num_pedestrians = np.random.randint(0, 6)  # 0-5 pedestrians
        
        detections = []
        vehicle_classes = ['car', 'car', 'car', 'bike', 'bike', 'bus', 'truck', 'ambulance']
        
        # Generate vehicle detections
        for _ in range(num_vehicles):
            x1 = np.random.randint(0, w - 80)
            y1 = np.random.randint(0, h - 60)
            x2 = x1 + np.random.randint(40, 100)
            y2 = y1 + np.random.randint(30, 80)
            
            detection = {
                'box': (x1, y1, x2, y2),
                'class': np.random.choice(vehicle_classes),
                'confidence': np.random.uniform(0.7, 0.99)
            }
            detections.append(detection)
        
        # Generate pedestrian detections (people)
        for _ in range(num_pedestrians):
            x1 = np.random.randint(0, w - 40)
            y1 = np.random.randint(0, h - 60)
            x2 = x1 + np.random.randint(20, 50)
            y2 = y1 + np.random.randint(40, 100)
            
            detection = {
                'box': (x1, y1, x2, y2),
                'class': 'pedestrian',
                'confidence': np.random.uniform(0.7, 0.99)
            }
            detections.append(detection)
        
        return detections
    
    def get_class_counts(self, detections):
        """
        Count vehicles by class.
        
        Args:
            detections: List of detections
        
        Returns:
            Dict with vehicle type counts
        """
        counts = {
            'car': 0,
            'bike': 0,
            'bus': 0,
            'truck': 0,
            'ambulance': 0,
            'pedestrian': 0,
            'total': len(detections)
        }
        
        for det in detections:
            class_name = det.get('class', 'vehicle')
            if class_name in counts:
                counts[class_name] += 1
        
        return counts


class DetectionCache:
    """
    Cache detection results to avoid redundant processing.
    Useful for reducing YOLO inference load on consecutive frames.
    """
    
    def __init__(self, cache_frames=3):
        """
        Initialize cache.
        
        Args:
            cache_frames: Number of frames to cache
        """
        self.cache_frames = cache_frames
        self.cache = {}
        self.frame_counter = 0
    
    def should_detect(self, frame_id):
        """
        Check if we should run detection on this frame.
        
        Args:
            frame_id: Frame identifier or counter
        
        Returns:
            True if detection should run, False to use cached result
        """
        return (frame_id % self.cache_frames) == 0
    
    def get_cached(self, frame_id):
        """Get cached detections."""
        return self.cache.get(frame_id)
    
    def set_cached(self, frame_id, detections):
        """Cache detections."""
        self.cache[frame_id] = detections
        
        # Limit cache size
        if len(self.cache) > 10:
            oldest_key = min(self.cache.keys())
            del self.cache[oldest_key]


class MultiDetector:
    """
    Run detection on multiple camera feeds concurrently.
    """
    
    def __init__(self, model_name="yolov8n.pt", confidence=0.2):
        """Initialize multi-detector with low default confidence."""
        self.detector = YOLODetector(model_name, confidence=confidence)
        self.results = {}
        self.lock = threading.Lock()
    
    def detect(self, frame):
        """
        Detect vehicles in frame (delegates to underlying YOLODetector).
        
        Args:
            frame: OpenCV frame
        
        Returns:
            List of detection dicts
        """
        return self.detector.detect(frame)
    
    def detect_frame(self, camera_id, frame):
        """
        Detect in frame and cache result.
        
        Args:
            camera_id: Camera identifier
            frame: OpenCV frame
        
        Returns:
            Detection results
        """
        detections = self.detector.detect(frame)
        
        with self.lock:
            self.results[camera_id] = {
                'detections': detections,
                'timestamp': time.time(),
                'vehicle_counts': self.detector.get_class_counts(detections)
            }
        
        return self.results[camera_id]
    
    def get_result(self, camera_id):
        """Get cached detection result."""
        with self.lock:
            return self.results.get(camera_id)
    
    def get_all_results(self):
        """Get all camera results."""
        with self.lock:
            return dict(self.results)
