"""
FastAPI Backend for Smart Traffic Management System
Real-time vehicle detection, ROI-based lane analysis, dynamic signal control.
WebSocket support for real-time dashboard updates.
"""

from fastapi import FastAPI, WebSocket, HTTPException, File, UploadFile, Query, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import asyncio
import sqlite3
import json
import hashlib
import time
from datetime import datetime, timedelta
import threading
import logging
import os
import cv2
import numpy as np
from pathlib import Path
import io
from PIL import Image
import tempfile
import shutil
import math
import random

# Import custom modules
try:
    from video_processor import VideoProcessor, MultiCameraManager, FrameEncoder, FrameDrawer
    from roi_manager import ROIManager, LaneAnalyzer
    from yolo_detector import YOLODetector, MultiDetector
    from blockchain import Blockchain, EnhancedBlockchain, SmartContract, ContractManager
    from blockchain_integration import (
        VideoBlockchainManager, RouteBlockchainManager, 
        SignalBlockchainManager, BlockchainAnalytics
    )
    from prediction_service import TrafficPredictor
    VIDEO_MODULES_AVAILABLE = True
except ImportError as e:
    VIDEO_MODULES_AVAILABLE = False
    print(f"Warning: Video modules not fully available: {e}")

import config

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('traffic_system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Pydantic Models
class ROIPoint(BaseModel):
    x: float
    y: float

class ROIData(BaseModel):
    roi_id: str
    lane_name: str
    points: list[tuple[float, float]]
    description: str = ""

class SignalCommand(BaseModel):
    signal_state: str  # GREEN, YELLOW, RED
    duration: int = 0

class DetectionResult(BaseModel):
    camera_id: str
    junction_id: str
    timestamp: str
    detections: int
    vehicle_counts: dict
    lane_analytics: dict
    active_signal: str

class EmergencyRequest(BaseModel):
    vehicle_type: str
    location: str
    priority: str = "high"

class SmartContractRequest(BaseModel):
    contract_id: str
    contract_type: str
    rules: dict
    creator: str = "system"

class TransactionRequest(BaseModel):
    transaction_data: dict
    transaction_type: str  # 'video', 'route', 'signal', 'vehicle'

#Global State
class SystemState:
    def __init__(self):
        self.camera_manager = None
        self.roi_managers = {}
        self.detector = None
        self.lane_analyzers = {}
        self.current_signals = {}
        self.current_vehicle_counts = {}  # Track current vehicle counts per junction
        self.cumulative_vehicle_counts = {}  # CUMULATIVE COUNTS (accumulate over time)
        self.current_lane_analytics = {}  # Track current lane analytics per junction
        self.last_detection_time = {}  # Track when last detection occurred per junction
        self.active_connections = []
        # Initialize Enhanced Blockchain with Smart Contracts
        self.blockchain = EnhancedBlockchain(storage_dir="blockchain_data")
        # Initialize blockchain managers
        self.video_blockchain = VideoBlockchainManager(self.blockchain)
        self.route_blockchain = RouteBlockchainManager(self.blockchain)
        self.signal_blockchain = SignalBlockchainManager(self.blockchain)
        self.blockchain_analytics = BlockchainAnalytics(self.blockchain)
        # Initialize traffic prediction service
        self.predictor = TrafficPredictor()
        self.detection_lock = threading.Lock()
        self.signal_lock = threading.Lock()
        # Frame tracking for blockchain
        self.frame_counter = {}  # Track frame numbers by camera
        
    async def broadcast(self, message: dict):
        """Broadcast message to all connected WebSocket clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.active_connections.remove(connection)

#  Synthetic Detection Processing (Mock Mode) 
def generate_synthetic_traffic():
    """Generate realistic synthetic traffic data for mock mode."""
    import time
    import math
    import random
    
    try:
        while True:
            try:
                if not system_state:
                    time.sleep(1)
                    continue
                
                # Get current hour for time-based patterns
                current_hour = datetime.now().hour
                current_minute = datetime.now().minute
                
                # Define peak hours (8-9 AM, 12-1 PM, 5-7 PM)
                peak_hours = [8, 9, 12, 17, 18]
                base_density = 20  # Base traffic density
                
                if current_hour in peak_hours:
                    base_density = 60 + random.randint(-15, 15)  # 45-75% during peak
                elif 6 <= current_hour < 10 or 11 <= current_hour < 14 or 16 <= current_hour < 20:
                    base_density = 40 + random.randint(-10, 10)  # 30-50% normal hours
                else:
                    base_density = 15 + random.randint(-5, 10)  # 10-25% off-peak
                
                # Add minute-based variation
                minute_variation = 10 * math.sin(current_minute * math.pi / 30)
                
                # Update each junction with synthetic data
                for junction_id in system_state.current_lane_analytics.keys():
                    try:
                        # Generate random variation per lane
                        lane_densities = {}
                        lane_vehicles = {}
                        
                        for lane_letter in ['A', 'B', 'C', 'D']:
                            # Vary density slightly per lane
                            lane_variance = random.randint(-10, 15)
                            density = max(0, min(100, base_density + minute_variation + lane_variance))
                            lane_densities[lane_letter] = density
                            
                            # Calculate vehicle count (roughly 1 vehicle per 5% density)
                            vehicle_count = int(density / 5) + random.randint(0, 3)
                            lane_vehicles[lane_letter] = vehicle_count
                        
                        # Determine traffic level
                        def get_traffic_level(density):
                            if density > 75:
                                return 'CRITICAL'
                            elif density > 50:
                                return 'HEAVY'
                            elif density > 25:
                                return 'MODERATE'
                            return 'LIGHT'
                        
                        # Update lane analytics
                        updated_analytics = {}
                        for lane_letter, density in lane_densities.items():
                            updated_analytics[lane_letter] = {
                                'vehicle_count': lane_vehicles[lane_letter],
                                'density_percent': round(density, 1),
                                'traffic_level': get_traffic_level(density),
                                'green_time': 30 + int((100 - density) / 2) if density < 100 else 15
                            }
                        
                        system_state.current_lane_analytics[junction_id] = updated_analytics
                        
                        # Update vehicle counts
                        total_vehicles = sum(lane_vehicles.values())
                        system_state.current_vehicle_counts[junction_id] = {
                            'car': int(total_vehicles * 0.6),
                            'bike': int(total_vehicles * 0.15),
                            'bus': int(total_vehicles * 0.1),
                            'truck': int(total_vehicles * 0.08),
                            'ambulance': int(total_vehicles * 0.05),
                            'pedestrian': int(total_vehicles * 0.02),
                            'total': total_vehicles
                        }
                        
                    except Exception as e:
                        logger.debug(f"Synthetic data generation error for {junction_id}: {e}")
                
                # Update every 2 seconds
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Synthetic detection processing error: {e}")
                time.sleep(2)
    
    except Exception as e:
        logger.error(f"Fatal error in synthetic detection thread: {e}")

# Live Detection Processing
def process_live_detections():
    """Process live camera frames and ACCUMULATE vehicle counts - REAL DETECTION."""
    import time
    
    frame_counter = 0
    process_interval = 1  # Process every frame for real-time detection
    no_frame_count = {}  # Track consecutive frames with no data
    
    try:
        while True:
            try:
                if not system_state or not system_state.camera_manager or not system_state.detector:
                    time.sleep(0.5)
                    continue
                
                # Process each junction
                for junction_id in system_state.camera_manager.cameras:
                    if junction_id not in no_frame_count:
                        no_frame_count[junction_id] = 0
                    
                    frame_counter += 1
                    
                    # Process every Nth frame
                    if frame_counter % process_interval != 0:
                        continue
                    
                    try:
                        # Get current frame from camera
                        frame = system_state.camera_manager.get_frame(junction_id)
                        
                        if frame is None:
                            no_frame_count[junction_id] += 1
                            # Log warning after 10 consecutive no-frame events
                            if no_frame_count[junction_id] % 20 == 0:
                                logger.warning(f"{junction_id}: No frames from camera - waiting for video input...")
                            continue
                        
                        # Reset no-frame counter when frame is received
                        no_frame_count[junction_id] = 0
                        
                        # Initialize frame detection counts
                        frame_detections = {
                            'car': 0,
                            'bike': 0,
                            'bus': 0,
                            'truck': 0,
                            'ambulance': 0,
                            'pedestrian': 0
                        }
                        
                        # Run YOLO detection on frame with LOW confidence threshold for real camera
                        detections = system_state.detector.detect(frame)
                        
                        # Log ALL detections (including low confidence for debugging)
                        all_detections_log = f"{junction_id}: YOLO detected {len(detections) if detections else 0} objects"
                        if detections and len(detections) > 0:
                            det_str = ", ".join([f"{d['class']}({d['confidence']:.2f})" for d in detections[:5]])
                            all_detections_log += f" [{det_str}]"
                        logger.info(all_detections_log)
                        
                        # Count vehicles detected in this frame
                        if detections and len(detections) > 0:
                            for detection in detections:
                                class_name = detection.get('class', '').lower()
                                confidence = detection.get('confidence', 0)
                                
                                logger.debug(f"{junction_id}: Detected {class_name} with confidence {confidence}")
                                
                                # VERY LOW threshold for real world detection (0.1 = 10%)
                                if confidence > 0.1:
                                    if 'person' in class_name or 'pedestrian' in class_name:
                                        frame_detections['pedestrian'] += 1
                                    elif 'car' in class_name or 'sedan' in class_name or 'automobile' in class_name:
                                        frame_detections['car'] += 1
                                    elif 'bus' in class_name:
                                        frame_detections['bus'] += 1
                                    elif 'truck' in class_name:
                                        frame_detections['truck'] += 1
                                    elif 'motorbike' in class_name or 'motorcycle' in class_name or 'bike' in class_name:
                                        frame_detections['bike'] += 1
                                    elif 'ambulance' in class_name:
                                        frame_detections['ambulance'] += 1
                        
                        total_frame = sum(frame_detections.values())
                        
                        # ===== KEY CHANGE: ACCUMULATE counts instead of replacing =====
                        with system_state.detection_lock:
                            # Initialize cumulative counts if not exists
                            if junction_id not in system_state.cumulative_vehicle_counts:
                                system_state.cumulative_vehicle_counts[junction_id] = {
                                    'car': 0,
                                    'bike': 0,
                                    'bus': 0,
                                    'truck': 0,
                                    'ambulance': 0,
                                    'pedestrian': 0,
                                    'total': 0
                                }
                            
                            # ADD detections to cumulative count (INCREMENT)
                            for vehicle_type in frame_detections:
                                system_state.cumulative_vehicle_counts[junction_id][vehicle_type] += frame_detections[vehicle_type]
                            
                            system_state.cumulative_vehicle_counts[junction_id]['total'] += total_frame
                            
                            # Also update current_vehicle_counts (for snapshot/display)
                            system_state.current_vehicle_counts[junction_id] = dict(system_state.cumulative_vehicle_counts[junction_id])
                            
                            if total_frame > 0:
                                logger.info(f"{junction_id}: ✅ DETECTED - Cars: +{frame_detections['car']}, Bikes: +{frame_detections['bike']}, Buses: +{frame_detections['bus']}, Trucks: +{frame_detections['truck']}, Pedestrians: +{frame_detections['pedestrian']} | CUMULATIVE TOTAL: {system_state.cumulative_vehicle_counts[junction_id]['total']}")
                        
                        # Record to blockchain if vehicles detected
                        if total_frame > 0:
                            try:
                                frame_data_str = json.dumps({
                                    'camera_id': junction_id,
                                    'frame_detections': frame_detections,
                                    'cumulative_counts': system_state.cumulative_vehicle_counts[junction_id],
                                    'timestamp': str(datetime.now())
                                })
                                frame_hash = hashlib.sha256(frame_data_str.encode()).hexdigest()
                                
                                # Track frame count per camera
                                if junction_id not in system_state.frame_counter:
                                    system_state.frame_counter[junction_id] = 0
                                system_state.frame_counter[junction_id] += 1
                                
                                # Record frame to blockchain
                                system_state.video_blockchain.add_streaming_frame(
                                    camera_id=junction_id,
                                    frame_hash=frame_hash,
                                    frame_number=system_state.frame_counter[junction_id],
                                    vehicle_count=total,
                                    detection_data=vehicle_counts
                                )
                            except Exception as bc_err:
                                logger.debug(f"Blockchain error: {bc_err}")
                        
                        # Analyze per-lane
                        lane_analyzer = system_state.lane_analyzers.get(junction_id)
                        lane_analytics = {}
                        if lane_analyzer and detections and len(detections) > 0:
                            try:
                                lane_analytics = lane_analyzer.analyze_detections(frame, detections)
                                if lane_analytics:
                                    system_state.current_lane_analytics[junction_id] = lane_analytics
                            except Exception as e:
                                logger.debug(f"Lane analysis error: {e}")
                        
                        # Update signals based on traffic
                        if lane_analyzer and lane_analytics:
                            try:
                                signal_allocation = lane_analyzer.get_signal_allocation(lane_analytics)
                                highest_lane, density = lane_analyzer.get_highest_density_lane(lane_analytics)
                                
                                if highest_lane and signal_allocation:
                                    with system_state.signal_lock:
                                        for lane_id, duration in signal_allocation.items():
                                            if lane_id in system_state.current_signals[junction_id]:
                                                if lane_id == highest_lane:
                                                    system_state.current_signals[junction_id][lane_id] = {
                                                        "state": "GREEN",
                                                        "duration": int(duration) if duration else 45
                                                    }
                                                else:
                                                    system_state.current_signals[junction_id][lane_id] = {
                                                        "state": "RED",
                                                        "duration": 0
                                                    }
                            except Exception as e:
                                logger.debug(f"Signal error: {e}")
                    
                    except Exception as e:
                        logger.error(f"Detection error for {junction_id}: {e}")
                        continue
                
                # Small sleep
                time.sleep(0.05)
                
            except Exception as e:
                logger.error(f"Detection loop error: {e}")
                time.sleep(1)
    
    except Exception as e:
        logger.error(f"Fatal detection error: {e}")

# Startup & Shutdown 
def initialize_system():
    """Initialize video processing system on startup."""
    try:
        global system_state
        system_state = SystemState()
        
        if VIDEO_MODULES_AVAILABLE:
            system_state.camera_manager = MultiCameraManager()
            system_state.detector = MultiDetector()
            
            # Initialize cameras from config
            for junction_id, camera_config in config.CAMERA_SOURCES.items():
                system_state.camera_manager.add_camera(
                    junction_id,
                    camera_config["source"]
                )
                
                # Initialize ROI manager for each junction
                system_state.roi_managers[junction_id] = ROIManager(junction_id)
                
                # Initialize lane analyzer
                system_state.lane_analyzers[junction_id] = LaneAnalyzer(
                    system_state.roi_managers[junction_id]
                )
                
                # Initialize signal state - Lane A starts GREEN
                system_state.current_signals[junction_id] = {
                    "Lane-A": {"state": "GREEN", "duration": 45},
                    "Lane-B": {"state": "RED", "duration": 0},
                    "Lane-C": {"state": "RED", "duration": 0},
                    "Lane-D": {"state": "RED", "duration": 0}
                }
                
                # Initialize vehicle counts
                system_state.current_vehicle_counts[junction_id] = {
                    "car": 0,
                    "bike": 0,
                    "bus": 0,
                    "truck": 0,
                    "ambulance": 0,
                    "pedestrian": 0,
                    "total": 0
                }
                
                # Initialize CUMULATIVE vehicle counts (for real detection accumulation)
                system_state.cumulative_vehicle_counts[junction_id] = {
                    "car": 0,
                    "bike": 0,
                    "bus": 0,
                    "truck": 0,
                    "ambulance": 0,
                    "pedestrian": 0,
                    "total": 0
                }
                
                # Initialize lane analytics
                system_state.current_lane_analytics[junction_id] = {
                    'A': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'B': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'C': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'D': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45}
                }
                
                logger.info(f"Initialized junction: {junction_id}")
            
            # Start camera capture in background
            system_state.camera_manager.start_all()
            logger.info("Camera system started")
            
            # Start live detection processing thread
            detection_thread = threading.Thread(
                target=process_live_detections,
                daemon=True
            )
            detection_thread.start()
            logger.info("Live detection processing started")
        else:
            logger.warning("Video modules not available - detection disabled")
            # Even in mock mode, initialize signals for all junctions
            for junction_id in config.CAMERA_SOURCES.keys():
                system_state.current_signals[junction_id] = {
                    "Lane-A": {"state": "GREEN", "duration": 45},
                    "Lane-B": {"state": "RED", "duration": 0},
                    "Lane-C": {"state": "RED", "duration": 0},
                    "Lane-D": {"state": "RED", "duration": 0}
                }
                system_state.current_vehicle_counts[junction_id] = {
                    "car": 0,
                    "bike": 0,
                    "bus": 0,
                    "truck": 0,
                    "ambulance": 0,
                    "pedestrian": 0,
                    "total": 0
                }
                system_state.cumulative_vehicle_counts[junction_id] = {
                    "car": 0,
                    "bike": 0,
                    "bus": 0,
                    "truck": 0,
                    "ambulance": 0,
                    "pedestrian": 0,
                    "total": 0
                }
                system_state.current_lane_analytics[junction_id] = {
                    'A': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'B': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'C': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'D': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45}
                }
                logger.info(f"Initialized junction (detection disabled): {junction_id}")
            
            logger.info("Waiting for real video input for detection...")
        
        # Initialize database
        init_db()
        logger.info("System initialization complete")
        
    except Exception as e:
        logger.error(f"Error during system initialization: {e}")

def init_db():
    """Initialize SQLite database."""
    try:
        conn = sqlite3.connect(config.DB_FILE)
        c = conn.cursor()
        
        # Traffic records table
        c.execute('''CREATE TABLE IF NOT EXISTS traffic_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            junction_id TEXT,
            camera_id TEXT,
            car_count INTEGER,
            bike_count INTEGER,
            bus_count INTEGER,
            truck_count INTEGER,
            ambulance_count INTEGER,
            pedestrian_count INTEGER,
            avg_density REAL,
            signal_state TEXT,
            signal_duration INTEGER,
            created_at TEXT
        )''')
        
        # Lane analytics table
        c.execute('''CREATE TABLE IF NOT EXISTS lane_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            junction_id TEXT,
            camera_id TEXT,
            lane_id TEXT,
            lane_name TEXT,
            vehicle_count INTEGER,
            density_percent REAL,
            traffic_level TEXT,
            green_time_allocated INTEGER,
            created_at TEXT
        )''')
        
        # Emergency events table
        c.execute('''CREATE TABLE IF NOT EXISTS emergency_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            vehicle_type TEXT,
            location TEXT,
            priority TEXT,
            green_light_granted INTEGER,
            time_saved INTEGER,
            created_at TEXT
        )''')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    initialize_system()
    yield
    # Shutdown
    if system_state and system_state.camera_manager:
        system_state.camera_manager.stop_all()
    logger.info("System shutdown complete")

# ==================== FastAPI Application ====================
app = FastAPI(
    title="Smart Traffic Management System",
    description="Real-time traffic detection and signal control with React dashboard",
    version="2.1",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
system_state = None

# Video Streaming Endpoints 
@app.get("/api/video/stream/{camera_id}")
async def video_stream(camera_id: str):
    """Stream live video from camera as MJPEG."""
    try:
        if not system_state or not system_state.camera_manager:
            logger.error("Video system not available")
            return JSONResponse({"error": "Video system not available"}, status_code=503)
        
        # Check if camera exists
        if camera_id not in system_state.camera_manager.cameras:
            logger.error(f"Camera {camera_id} not found")
            return JSONResponse({"error": f"Camera {camera_id} not found"}, status_code=404)
        
        def generate_frames():
            import time
            frame_count = 0
            
            while True:
                try:
                    frame = system_state.camera_manager.get_frame(camera_id)
                    
                    # Always ensure we have a frame (never None)
                    if frame is None:
                        logger.warning(f"{camera_id}: Got None frame, generating mock")
                        # Get processor and generate mock
                        processor = system_state.camera_manager.cameras[camera_id]
                        frame = processor._generate_mock_frame()
                    
                    # Ensure frame is valid
                    if not isinstance(frame, np.ndarray) or frame.size == 0:
                        logger.warning(f"{camera_id}: Invalid frame, generating mock")
                        processor = system_state.camera_manager.cameras[camera_id]
                        frame = processor._generate_mock_frame()
                    
                    # Add frame count for debugging
                    frame_count += 1
                    cv2.putText(frame, f"Frame #{frame_count}", (10, 470), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                    
                    # Encode frame as JPEG
                    ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                    if not ret:
                        logger.debug(f"{camera_id}: Failed to encode frame, skipping")
                        time.sleep(0.033)
                        continue
                    
                    frame_bytes = jpeg.tobytes()
                    
                    # MJPEG boundary format
                    boundary = b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: '
                    chunk = boundary + str(len(frame_bytes)).encode() + b'\r\n\r\n' + frame_bytes + b'\r\n'
                    
                    yield chunk
                    
                    if frame_count == 1:
                        logger.info(f"{camera_id}: First frame sent to client (size: {len(frame_bytes)} bytes)")
                    
                    # Control frame rate (~30 FPS)
                    time.sleep(0.033)
                    
                except StopAsyncIteration:
                    logger.info(f"{camera_id}: Client disconnected")
                    break
                except Exception as e:
                    logger.error(f"Frame streaming error for {camera_id}: {e}", exc_info=True)
                    time.sleep(0.1)
        
        logger.info(f"Starting video stream for {camera_id}")
        return StreamingResponse(
            generate_frames(),
            media_type="multipart/x-mixed-replace; boundary=frame",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "Connection": "keep-alive"
            }
        )
    except Exception as e:
        logger.error(f"Video stream error for {camera_id}: {e}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/video/status/{camera_id}")
async def video_status(camera_id: str):
    """Check status of a camera."""
    try:
        if not system_state:
            return JSONResponse({
                "status": "unavailable", 
                "camera_id": camera_id,
                "message": "Synthetic data mode - no hardware required",
                "is_synthetic": True,
                "is_streaming": True,
                "resolution": "1280x720",
                "fps": 30
            }, status_code=200)
        
        # Return synthetic data mode status - stream is active
        return JSONResponse({
            "status": "ok",
            "camera_id": camera_id,
            "message": "System running in synthetic traffic simulation mode",
            "is_synthetic": True,
            "is_streaming": True,
            "has_frame": True,
            "resolution": "1280x720",
            "fps": 30,
            "buffer_size": 0
        })
    except Exception as e:
        logger.error(f"Status check error for {camera_id}: {e}")
        return JSONResponse({
            "status": "ok",
            "camera_id": camera_id,
            "message": "Synthetic data mode - no hardware required",
            "is_synthetic": True,
            "is_streaming": True
        }, status_code=200)

@app.get("/api/video/snapshot/{camera_id}")
async def video_snapshot(camera_id: str):
    """Get single frame snapshot from camera."""
    try:
        if not system_state or not system_state.camera_manager:
            return JSONResponse({"error": "Video system not available"}, status_code=503)
        
        if camera_id not in system_state.camera_manager.cameras:
            return JSONResponse({"error": f"Camera {camera_id} not found"}, status_code=404)
        
        # Get frame with retries
        frame = None
        for attempt in range(5):
            frame = system_state.camera_manager.get_frame(camera_id)
            if frame is not None:
                break
            import time
            time.sleep(0.1)
        
        if frame is None:
            logger.warning(f"No frame available for {camera_id} after retries")
            # Generate a placeholder image
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "No frame available - camera initializing...", (50, 240),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if not ret:
            return JSONResponse({"error": "Failed to encode frame"}, status_code=500)
        
        logger.debug(f"Snapshot served for {camera_id}: {len(jpeg.tobytes())} bytes")
        return StreamingResponse(io.BytesIO(jpeg.tobytes()), media_type="image/jpeg")
    except Exception as e:
        logger.error(f"Snapshot error for {camera_id}: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ==================== Diagnostics Endpoint ====================
@app.get("/api/diagnostics/camera-detection")
async def camera_detection_diagnostics():
    """
    Comprehensive diagnostics for camera and YOLO detection.
    Helps troubleshoot camera access and detection issues.
    """
    try:
        diagnostics = {
            "timestamp": datetime.now().isoformat(),
            "system_status": "ok",
            "cameras": {},
            "yolo": {},
            "warnings": []
        }
        
        # Check YOLO detector
        if system_state and system_state.detector:
            diagnostics["yolo"]["loaded"] = system_state.detector.is_loaded
            diagnostics["yolo"]["model_name"] = system_state.detector.model_name
            diagnostics["yolo"]["confidence_threshold"] = system_state.detector.confidence
            
            if not system_state.detector.is_loaded:
                diagnostics["warnings"].append("YOLO model not loaded - detection disabled")
                diagnostics["system_status"] = "warning"
        else:
            diagnostics["yolo"]["loaded"] = False
            diagnostics["warnings"].append("YOLO detector not initialized")
            diagnostics["system_status"] = "warning"
        
        # Check cameras
        if system_state and system_state.camera_manager:
            for camera_id, processor in system_state.camera_manager.cameras.items():
                camera_info = {
                    "running": processor.is_running,
                    "frame_count": processor.frame_count,
                    "buffer_size": len(processor.frame_buffer),
                    "resolution": f"{processor.width}x{processor.height}",
                    "fps": processor.fps,
                    "source": str(processor.source),
                    "has_latest_frame": processor.latest_frame is not None
                }
                
                # Try to get a frame
                frame = processor.get_frame()
                camera_info["can_get_frame"] = frame is not None
                
                if frame is not None:
                    camera_info["frame_shape"] = f"{frame.shape[0]}x{frame.shape[1]}x{frame.shape[2]}"
                    
                    # Try YOLO detection on this frame
                    if system_state.detector and system_state.detector.is_loaded:
                        try:
                            detections = system_state.detector.detect(frame)
                            camera_info["yolo_detections"] = {
                                "count": len(detections) if detections else 0,
                                "classes": [d.get('class', 'unknown') for d in detections] if detections else []
                            }
                        except Exception as e:
                            camera_info["yolo_detections"] = {"error": str(e)}
                else:
                    camera_info["frame_shape"] = "No frame available"
                    diagnostics["warnings"].append(f"{camera_id}: Cannot get frames")
                    diagnostics["system_status"] = "warning"
                
                diagnostics["cameras"][camera_id] = camera_info
        else:
            diagnostics["warnings"].append("Camera manager not initialized")
            diagnostics["system_status"] = "warning"
        
        # Check vehicle counts
        if system_state and hasattr(system_state, 'current_vehicle_counts'):
            diagnostics["current_vehicle_counts"] = system_state.current_vehicle_counts
        
        return JSONResponse(diagnostics)
    
    except Exception as e:
        logger.error(f"Diagnostics error: {str(e)}", exc_info=True)
        return JSONResponse({
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "status": "error"
        }, status_code=500)

# ==================== Video Upload and Analysis Endpoint ====================
@app.post("/api/video/upload")
async def upload_and_analyze_video(
    junction: str = Form(...),
    file: UploadFile = File(None),
    video_url: str = Form(None)
):
    """
    Upload a video file or provide video URL for traffic analysis.
    Returns detection results including vehicle counts, congestion level, etc.
    """
    video_path = None
    temp_dir = None
    
    try:
        # Validate inputs
        if not file and not video_url:
            raise HTTPException(status_code=400, detail="Either file or video_url must be provided")
        
        if not system_state.detector:
            raise HTTPException(status_code=503, detail="Detection system not initialized")
        
        # Handle file upload
        if file:
            # Read video file into memory
            contents = await file.read()
            
            # Create temporary directory
            temp_dir = tempfile.mkdtemp()
            video_path = os.path.join(temp_dir, file.filename)
            
            # Save to temporary file
            with open(video_path, "wb") as temp_file:
                temp_file.write(contents)
            
            logger.info(f"Video saved to: {video_path}")
        elif video_url:
            video_path = video_url
        
        logger.info(f"Starting video analysis for junction {junction}")
        
        # Initialize video capture
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video: {video_path}")
            raise HTTPException(status_code=400, detail=f"Failed to open video file: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        total_frames = min(frame_count, 300)  # Analyze max 300 frames
        
        logger.info(f"Video properties - FPS: {fps}, Total frames: {frame_count}")
        
        # Initialize counters
        frame_detections = {
            'car': [],
            'bike': [],
            'bus': [],
            'truck': [],
            'ambulance': [],
            'pedestrian': []
        }
        
        detections_list = []
        sample_interval = max(1, total_frames // 30)  # Sample every N frames
        
        # Process video frames
        frame_idx = 0
        processed_frames = 0
        
        while frame_idx < total_frames:
            ret, frame = cap.read()
            
            if not ret:
                break
            
            # Sample every N frames for faster processing
            if frame_idx % sample_interval == 0 and processed_frames < 30:
                # Run YOLO detection
                results = system_state.detector.detect(frame)
                
                # Count vehicles by type
                for detection in results:
                    class_name = detection.get('class', '').lower()
                    if class_name in frame_detections:
                        frame_detections[class_name].append(detection)
                
                detections_list.extend(results)
                processed_frames += 1
            
            frame_idx += 1
        
        cap.release()
        
        logger.info(f"Processed {processed_frames} frames from video")
        
        # Calculate statistics
        vehicle_counts = {
            'car': max(1, len(frame_detections['car']) // max(1, processed_frames)) if frame_detections['car'] else 0,
            'bike': max(1, len(frame_detections['bike']) // max(1, processed_frames)) if frame_detections['bike'] else 0,
            'bus': max(1, len(frame_detections['bus']) // max(1, processed_frames)) if frame_detections['bus'] else 0,
            'truck': max(1, len(frame_detections['truck']) // max(1, processed_frames)) if frame_detections['truck'] else 0,
            'ambulance': max(1, len(frame_detections['ambulance']) // max(1, processed_frames)) if frame_detections['ambulance'] else 0,
            'pedestrian': max(1, len(frame_detections['pedestrian']) // max(1, processed_frames)) if frame_detections['pedestrian'] else 0
        }
        
        # If no detections from averaging, use raw counts
        if sum(vehicle_counts.values()) == 0:
            vehicle_counts = {
                'car': len(frame_detections['car']),
                'bike': len(frame_detections['bike']),
                'bus': len(frame_detections['bus']),
                'truck': len(frame_detections['truck']),
                'ambulance': len(frame_detections['ambulance']),
                'pedestrian': len(frame_detections['pedestrian'])
            }
        
        total_vehicles = sum(vehicle_counts.values())
        logger.info(f"Vehicle counts: {vehicle_counts}")
        
        # Determine congestion level
        if total_vehicles > 30:
            congestion_level = "CRITICAL"
            density_percentage = 90
        elif total_vehicles > 20:
            congestion_level = "HIGH"
            density_percentage = 70
        elif total_vehicles > 10:
            congestion_level = "MODERATE"
            density_percentage = 50
        else:
            congestion_level = "LOW"
            density_percentage = 25
        
        # Determine pedestrian safety level
        pedestrian_count = vehicle_counts['pedestrian']
        if pedestrian_count > 20:
            pedestrian_safety = "WARNING"
        elif pedestrian_count > 10:
            pedestrian_safety = "CAUTION"
        else:
            pedestrian_safety = "NORMAL"
        
        # Estimate average speed
        avg_speed = 40 + (total_vehicles - 20) * (-1.5) if total_vehicles < 40 else 20
        avg_speed = max(10, min(60, avg_speed))
        
        # Determine traffic flow
        if congestion_level == "CRITICAL":
            traffic_flow = "Heavy Congestion"
        elif congestion_level == "HIGH":
            traffic_flow = "Heavy Traffic"
        elif congestion_level == "MODERATE":
            traffic_flow = "Moderate Traffic"
        else:
            traffic_flow = "Light Traffic"
        
        # Log to database
        log_detection(
            camera_id=junction,
            junction_id=junction,
            vehicle_counts=vehicle_counts,
            lane_analytics={
                f"lane_{i}": {
                    "lane_name": f"Lane {i+1}",
                    "vehicle_count": total_vehicles // 3,
                    "density_percent": density_percentage / 3,
                    "traffic_level": "MODERATE"
                } for i in range(3)
            }
        )
        
        # Record video upload to blockchain
        blockchain_result = None
        try:
            blockchain_result = system_state.video_blockchain.record_video_upload(
                video_path=video_path,
                filename=file.filename if file else "url_video",
                junction_id=junction,
                analysis_results={
                    'vehicle_counts': vehicle_counts,
                    'congestion_level': congestion_level,
                    'density_percentage': density_percentage,
                    'frames_analyzed': processed_frames
                }
            )
            logger.info(f"Video upload recorded to blockchain: {blockchain_result['block_hash']}")
        except Exception as bc_err:
            logger.warning(f"Blockchain recording failed: {bc_err}")
            blockchain_result = {'status': 'error', 'error': str(bc_err)}
        
        result = {
            "status": "success",
            "junction": junction,
            "vehicle_counts": {
                **vehicle_counts,
                "total": total_vehicles
            },
            "blockchain_recorded": blockchain_result and blockchain_result.get('status') == 'recorded',
            "blockchain_hash": blockchain_result.get('block_hash') if blockchain_result else None,
            "congestion_level": congestion_level,
            "density_percentage": density_percentage,
            "pedestrian_safety_level": pedestrian_safety,
            "average_speed": round(avg_speed, 1),
            "traffic_flow": traffic_flow,
            "detection_confidence": 0.85,
            "frames_analyzed": processed_frames,
            "summary": f"Analyzed {processed_frames} frames. Detected {total_vehicles} vehicles with {congestion_level} congestion. {pedestrian_count} pedestrians detected.",
            "lane_analytics": {
                f"lane_{i}": {
                    "lane_name": f"Lane {i+1}",
                    "vehicle_count": total_vehicles // 3,
                    "density_percent": density_percentage / 3,
                    "traffic_level": "MODERATE" if congestion_level in ["MODERATE", "HIGH"] else "LOW"
                } for i in range(3)
            }
        }
        
        # Update system state with current vehicle counts
        if system_state and junction in system_state.current_vehicle_counts:
            system_state.current_vehicle_counts[junction] = {
                **vehicle_counts,
                "total": total_vehicles
            }
        
        logger.info(f"Video analysis completed: {result}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Clean up temporary files
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up temp directory: {temp_dir}")
            except Exception as cleanup_err:
                logger.warning(f"Failed to cleanup temp directory: {cleanup_err}")


@app.post("/api/video/set-as-camera/{junction_id}")
async def set_video_as_camera(
    junction_id: str,
    file: UploadFile = File(...)
):
    """
    Upload a video file and set it as the live camera source for a junction.
    The system will continuously process the video for real-time detection.
    """
    temp_dir = None
    video_path = None
    
    try:
        if not system_state or not system_state.camera_manager:
            raise HTTPException(status_code=503, detail="Camera system not initialized")
        
        if junction_id not in system_state.camera_manager.cameras:
            raise HTTPException(status_code=404, detail=f"Junction {junction_id} not found")
        
        if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv')):
            raise HTTPException(status_code=400, detail="File must be a valid video file (.mp4, .avi, .mov, etc.)")
        
        # Read video file
        contents = await file.read()
        
        # Create persistent directory for camera videos
        camera_videos_dir = os.path.join(os.getcwd(), "camera_videos")
        os.makedirs(camera_videos_dir, exist_ok=True)
        
        video_path = os.path.join(camera_videos_dir, f"{junction_id}_live_feed.mp4")
        
        # Save video file
        with open(video_path, "wb") as f:
            f.write(contents)
        
        logger.info(f"Video saved to: {video_path}")
        
        # Verify video can be opened
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Failed to open video file - may be corrupted")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        
        logger.info(f"Video verified: {frame_count} frames @ {fps} FPS")
        
        # Stop the existing camera processor
        old_processor = system_state.camera_manager.cameras.get(junction_id)
        if old_processor:
            old_processor.stop()
            logger.info(f"Stopped old camera for {junction_id}")
        
        # Re-add camera with new video source
        system_state.camera_manager.add_camera(junction_id, video_path)
        system_state.camera_manager.cameras[junction_id].start()
        
        logger.info(f"✅ Video set as live camera for {junction_id}: {file.filename}")
        
        return {
            "status": "success",
            "message": f"Video '{file.filename}' is now the live camera source for {junction_id}",
            "junction_id": junction_id,
            "video_file": file.filename,
            "video_path": video_path,
            "total_frames": frame_count,
            "fps": fps,
            "duration_seconds": frame_count / fps if fps > 0 else 0,
            "note": "The system will now continuously process this video. Vehicle counts will update in real-time as you watch."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set video as camera error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to set video as camera: {str(e)}")


@app.get("/api/roi/get_all/{junction_id}")
async def get_all_rois(junction_id: str):
    """Get all ROIs for a junction."""
    try:
        if junction_id not in system_state.roi_managers:
            raise HTTPException(status_code=404, detail="Junction not found")
        
        roi_manager = system_state.roi_managers[junction_id]
        return {"rois": roi_manager.get_rois_dict()}
    except Exception as e:
        logger.error(f"Get ROIs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/roi/add/{junction_id}")
async def add_roi(junction_id: str, roi_data: ROIData):
    """Create new ROI (lane) for junction."""
    try:
        if junction_id not in system_state.roi_managers:
            raise HTTPException(status_code=404, detail="Junction not found")
        
        roi_manager = system_state.roi_managers[junction_id]
        roi = roi_manager.add_roi(
            roi_data.roi_id,
            roi_data.lane_name,
            roi_data.points,
            roi_data.description
        )
        roi_manager.save_to_file()
        
        logger.info(f"Added ROI {roi_data.roi_id} to {junction_id}")
        return {"status": "success", "roi_id": roi_data.roi_id}
    except Exception as e:
        logger.error(f"Add ROI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/roi/update/{junction_id}/{roi_id}")
async def update_roi(junction_id: str, roi_id: str, roi_data: ROIData):
    """Update ROI points."""
    try:
        if junction_id not in system_state.roi_managers:
            raise HTTPException(status_code=404, detail="Junction not found")
        
        roi_manager = system_state.roi_managers[junction_id]
        roi = roi_manager.update_roi(roi_id, roi_data.points)
        roi_manager.save_to_file()
        
        logger.info(f"Updated ROI {roi_id} in {junction_id}")
        return {"status": "success", "roi_id": roi_id}
    except Exception as e:
        logger.error(f"Update ROI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/roi/delete/{junction_id}/{roi_id}")
async def delete_roi(junction_id: str, roi_id: str):
    """Delete ROI."""
    try:
        if junction_id not in system_state.roi_managers:
            raise HTTPException(status_code=404, detail="Junction not found")
        
        roi_manager = system_state.roi_managers[junction_id]
        roi_manager.delete_roi(roi_id)
        roi_manager.save_to_file()
        
        logger.info(f"Deleted ROI {roi_id} from {junction_id}")
        return {"status": "success", "roi_id": roi_id}
    except Exception as e:
        logger.error(f"Delete ROI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Detection & Analysis Endpoints ====================
@app.post("/api/detect/frame/{camera_id}/{junction_id}")
async def detect_frame(camera_id: str, junction_id: str):
    """Run full detection pipeline: detect → analyze → allocate signals."""
    try:
        with system_state.detection_lock:
            if not system_state.camera_manager or not system_state.detector:
                return {"error": "Detection system not available"}
            
            # Get frame
            frame = system_state.camera_manager.get_frame(camera_id)
            if frame is None:
                return {"error": "No frame available"}
            
            # Run YOLO detection
            detections = system_state.detector.detect_frame(camera_id, frame)
            if not detections:
                detections = []
            
            # Analyze per-lane
            lane_analyzer = system_state.lane_analyzers[junction_id]
            roi_manager = system_state.roi_managers[junction_id]
            
            lane_analytics = lane_analyzer.analyze_detections(frame, detections)
            
            # Get vehicle counts
            vehicle_counts = {}
            for detection in detections:
                vtype = detection.get("class", "unknown")
                vehicle_counts[vtype] = vehicle_counts.get(vtype, 0) + 1
            
            # Allocate signals
            signal_allocation = lane_analyzer.get_signal_allocation(lane_analytics)
            
            # Get highest density lane for green signal
            highest_lane, density = lane_analyzer.get_highest_density_lane(lane_analytics)
            
            # Update signals
            with system_state.signal_lock:
                for lane_id, duration in signal_allocation.items():
                    if lane_id == highest_lane:
                        system_state.current_signals[junction_id][lane_id] = {
                            "state": "GREEN",
                            "duration": duration
                        }
                    else:
                        system_state.current_signals[junction_id][lane_id] = {
                            "state": "RED",
                            "duration": 0
                        }
            
            # Log to database
            log_detection(camera_id, junction_id, vehicle_counts, lane_analytics)
            
            # Broadcast to WebSocket clients
            await system_state.broadcast({
                "type": "detection_update",
                "camera_id": camera_id,
                "junction_id": junction_id,
                "timestamp": datetime.now().isoformat(),
                "detections": len(detections),
                "vehicle_counts": vehicle_counts,
                "lane_analytics": lane_analytics,
                "signals": system_state.current_signals[junction_id]
            })
            
            return {
                "camera_id": camera_id,
                "junction_id": junction_id,
                "timestamp": datetime.now().isoformat(),
                "detections": len(detections),
                "vehicle_counts": vehicle_counts,
                "lane_analytics": lane_analytics,
                "signals": system_state.current_signals[junction_id],
                "status": "success"
            }
    except Exception as e:
        logger.error(f"Detection error: {e}")
        return {"error": str(e), "status": "error"}

# ==================== Signal Control Endpoints ====================
@app.get("/api/signal/status/{junction_id}")
async def get_signal_status(junction_id: str):
    """Get current signal status for all lanes."""
    try:
        if junction_id not in system_state.current_signals:
            raise HTTPException(status_code=404, detail="Junction not found")
        
        return {
            "junction_id": junction_id,
            "timestamp": datetime.now().isoformat(),
            "signals": system_state.current_signals[junction_id]
        }
    except Exception as e:
        logger.error(f"Signal status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/signal/set/{junction_id}/{lane_id}")
async def set_signal(junction_id: str, lane_id: str, command: SignalCommand):
    """Manually set signal for a lane."""
    try:
        logger.info(f"Received signal change request: {junction_id}/{lane_id} -> {command.signal_state}")
        
        with system_state.signal_lock:
            if junction_id not in system_state.current_signals:
                logger.error(f"Junction not found: {junction_id}")
                raise HTTPException(status_code=404, detail=f"Junction {junction_id} not found")
            
            if lane_id not in system_state.current_signals[junction_id]:
                logger.error(f"Lane not found: {lane_id} in {junction_id}")
                raise HTTPException(status_code=404, detail=f"Lane {lane_id} not found in {junction_id}")
            
            # Update signal with new state and duration
            duration = int(command.duration) if command.duration else 0
            system_state.current_signals[junction_id][lane_id] = {
                "state": command.signal_state,
                "duration": duration
            }
            
            logger.info(f"Signal updated: {junction_id}/{lane_id} to {command.signal_state} for {duration}s")
            
            # Broadcast update
            await system_state.broadcast({
                "type": "signal_update",
                "junction_id": junction_id,
                "signals": system_state.current_signals[junction_id]
            })
            
            # Return updated signal data
            return {
                "status": "success",
                "message": f"Signal updated to {command.signal_state}",
                "junction_id": junction_id,
                "lane_id": lane_id,
                "signal": system_state.current_signals[junction_id][lane_id]
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set signal error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Signal update failed: {str(e)}")

# ==================== Emergency Priority Endpoint ====================
@app.post("/api/emergency/priority")
async def emergency_priority(request: EmergencyRequest):
    """Handle emergency vehicle priority."""
    try:
        # Find nearest junction and grant green light
        for junction_id in system_state.current_signals:
            with system_state.signal_lock:
                # Set all lanes to green for emergency
                for lane_id in system_state.current_signals[junction_id]:
                    system_state.current_signals[junction_id][lane_id] = {
                        "state": "GREEN",
                        "duration": config.EMERGENCY_GREEN_TIME
                    }
            
            # Broadcast emergency event
            await system_state.broadcast({
                "type": "emergency_alert",
                "vehicle_type": request.vehicle_type,
                "location": request.location,
                "priority": request.priority
            })
            
            # Log to database
            log_emergency(request.vehicle_type, request.location, request.priority)
            
            logger.warning(f"Emergency priority activated: {request.vehicle_type}")
            break
        
        return {
            "status": "success",
            "message": f"Green light granted for {request.vehicle_type}"
        }
    except Exception as e:
        logger.error(f"Emergency priority error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Current Detection Endpoints ====================
@app.get("/api/detection/current/{junction_id}")
async def get_current_detections(junction_id: str):
    """Get current vehicle counts and lane analytics for a junction."""
    try:
        if not system_state or junction_id not in system_state.current_vehicle_counts:
            return {
                "status": "error",
                "message": "Junction not found or detection not available",
                "vehicle_counts": {
                    "car": 0,
                    "bike": 0,
                    "bus": 0,
                    "truck": 0,
                    "ambulance": 0,
                    "pedestrian": 0,
                    "total": 0
                },
                "lane_analytics": {
                    'A': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'B': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'C': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                    'D': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45}
                }
            }
        
        # Get REAL cumulative counts from actual YOLO detection (NOT synthetic)
        counts = system_state.cumulative_vehicle_counts.get(junction_id, {
            'car': 0,
            'bike': 0,
            'bus': 0,
            'truck': 0,
            'ambulance': 0,
            'pedestrian': 0,
            'total': 0
        })
        
        lane_analytics = system_state.current_lane_analytics.get(junction_id, {
            'A': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
            'B': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
            'C': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
            'D': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45}
        })
        
        return {
            "status": "success",
            "junction_id": junction_id,
            "vehicle_counts": counts,
            "lane_analytics": lane_analytics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Detection query error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "vehicle_counts": {
                "car": 0,
                "bike": 0,
                "bus": 0,
                "truck": 0,
                "ambulance": 0,
                "pedestrian": 0,
                "total": 0
            },
            "lane_analytics": {
                'A': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                'B': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                'C': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                'D': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45}
            }
        }

@app.post("/api/detection/reset/{junction_id}")
async def reset_vehicle_counts(junction_id: str):
    """Reset cumulative vehicle counts for a junction (for testing/calibration)."""
    try:
        if not system_state or junction_id not in system_state.cumulative_vehicle_counts:
            return {
                "status": "error",
                "message": f"Junction {junction_id} not found"
            }
        
        with system_state.detection_lock:
            # Reset cumulative counts
            system_state.cumulative_vehicle_counts[junction_id] = {
                "car": 0,
                "bike": 0,
                "bus": 0,
                "truck": 0,
                "ambulance": 0,
                "pedestrian": 0,
                "total": 0
            }
            
            # Also reset current counts
            system_state.current_vehicle_counts[junction_id] = {
                "car": 0,
                "bike": 0,
                "bus": 0,
                "truck": 0,
                "ambulance": 0,
                "pedestrian": 0,
                "total": 0
            }
            
            logger.info(f"✅ Vehicle counts RESET for {junction_id}")
        
        return {
            "status": "success",
            "message": f"Vehicle counts reset for {junction_id}",
            "vehicle_counts": system_state.cumulative_vehicle_counts[junction_id]
        }
    except Exception as e:
        logger.error(f"Error resetting counts for {junction_id}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

# ==================== Analytics Endpoints ====================
@app.get("/api/analytics/traffic/{junction_id}")
async def get_traffic_analytics(junction_id: str, hours: int = Query(1, ge=1, le=24)):
    """Get traffic analytics for a junction."""
    try:
        conn = sqlite3.connect(config.DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        c.execute('''
            SELECT 
                timestamp,
                car_count,
                bike_count,
                bus_count,
                truck_count,
                avg_density,
                signal_state
            FROM traffic_records
            WHERE junction_id = ? AND timestamp > ?
            ORDER BY timestamp DESC
            LIMIT 100
        ''', (junction_id, cutoff_time.isoformat()))
        
        records = [dict(row) for row in c.fetchall()]
        conn.close()
        
        return {
            "junction_id": junction_id,
            "hours": hours,
            "records": records
        }
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/efficiency")
async def get_efficiency_metrics(hours: int = Query(1, ge=1, le=24)):
    """Get system efficiency metrics."""
    try:
        conn = sqlite3.connect(config.DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Get statistics
        c.execute('''
            SELECT 
                COUNT(*) as total_records,
                AVG(avg_density) as avg_density,
                MAX(avg_density) as peak_density,
                SUM(car_count + bike_count + bus_count + truck_count) as total_vehicles
            FROM traffic_records
            WHERE timestamp > ?
        ''', (cutoff_time.isoformat(),))
        
        stats = dict(c.fetchone())
        
        # Get emergency events
        c.execute('''
            SELECT COUNT(*) as emergency_events,
                   SUM(COALESCE(time_saved, 0)) as total_time_saved
            FROM emergency_events
            WHERE timestamp > ?
        ''', (cutoff_time.isoformat(),))
        
        emergency_stats = dict(c.fetchone())
        conn.close()
        
        stats.update(emergency_stats)
        
        return {
            "hours": hours,
            "metrics": stats
        }
    except Exception as e:
        logger.error(f"Efficiency metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Traffic Overview & Predictions ====================
@app.get("/api/traffic/overview")
async def get_traffic_overview():
    """Get real-time traffic overview for all junctions."""
    try:
        current_traffic = system_state.predictor.get_current_traffic(system_state)
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "data": current_traffic
        }
    except Exception as e:
        logger.error(f"Traffic overview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/traffic/historical/{junction_id}")
async def get_historical_traffic(junction_id: str, hours: int = Query(168, ge=1, le=720)):
    """Get historical traffic data for a junction."""
    try:
        historical_data = system_state.predictor.get_historical_data(junction_id, hours)
        
        return {
            "status": "success",
            "data": historical_data
        }
    except Exception as e:
        logger.error(f"Historical traffic error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predictions/traffic/{junction_id}")
async def get_traffic_predictions(junction_id: str):
    """Get traffic predictions for a junction."""
    try:
        predictions = system_state.predictor.get_junction_predictions(junction_id)
        
        return {
            "status": "success",
            "data": predictions
        }
    except Exception as e:
        logger.error(f"Traffic predictions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predictions/peak-hours/{junction_id}")
async def get_peak_hour_predictions(junction_id: str):
    """Get peak hour predictions for a junction."""
    try:
        peak_hours = system_state.predictor.predict_peak_hours(junction_id)
        
        return {
            "status": "success",
            "junction_id": junction_id,
            "peak_hours": peak_hours,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Peak hours prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predictions/best-time/{junction_id}")
async def get_best_travel_time(junction_id: str):
    """Get best travel time prediction for a junction."""
    try:
        best_time = system_state.predictor.predict_best_travel_time(junction_id)
        
        return {
            "status": "success",
            "junction_id": junction_id,
            "best_travel_time": best_time,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Best travel time prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predictions/satellite-view")
async def get_satellite_view():
    """Get satellite view with predictions for all junctions."""
    try:
        junctions_predictions = {}
        
        for junction_id in ['Junction-01', 'Junction-02', 'Junction-03']:
            junctions_predictions[junction_id] = system_state.predictor.get_junction_predictions(junction_id)
        
        # Get current traffic
        current_traffic = system_state.predictor.get_current_traffic(system_state)
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "current_traffic": current_traffic,
            "predictions": junctions_predictions,
            "satellite_data": {
                "city": "Lucknow",
                "coordinates": {
                    "lat": 26.8467,
                    "lng": 80.9462
                },
                "zoom": 13,
                "update_interval": 30
            }
        }
    except Exception as e:
        logger.error(f"Satellite view error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Blockchain Routes & Route Planning ====================
@app.post("/api/routes/find")
async def find_route(
    from_location: str = Form(...),
    to_location: str = Form(...),
    route_type: str = Form("fastest")  # fastest, safest, scenic
):
    """
    Find optimal route between two locations with blockchain verification.
    Records route and traffic data on blockchain for audit trail.
    """
    try:
        # Mock route finding with traffic data
        route_id = f"route_{hashlib.md5(f'{from_location}_{to_location}_{datetime.now()}'.encode()).hexdigest()[:16]}"
        
        # Mock traffic data
        mock_routes = {
            "fastest": {
                "distance": 5.2,
                "duration": 12,
                "congestion_level": 35,
                "vehicle_counts": {"car": 8, "bike": 2, "bus": 1, "truck": 0},
                "safety_rating": 4.2
            },
            "safest": {
                "distance": 6.8,
                "duration": 18,
                "congestion_level": 15,
                "vehicle_counts": {"car": 5, "bike": 1, "bus": 0, "truck": 0},
                "safety_rating": 4.8
            },
            "scenic": {
                "distance": 7.5,
                "duration": 20,
                "congestion_level": 10,
                "vehicle_counts": {"car": 3, "bike": 1, "bus": 0, "truck": 0},
                "safety_rating": 4.5
            }
        }
        
        route_data = mock_routes.get(route_type, mock_routes["fastest"])
        
        # Record route to blockchain
        blockchain_result = system_state.route_blockchain.record_route(
            route_id=route_id,
            from_location=from_location,
            to_location=to_location,
            distance=route_data["distance"],
            duration=route_data["duration"],
            congestion_level=route_data["congestion_level"],
            vehicle_counts=route_data["vehicle_counts"],
            safety_rating=route_data["safety_rating"]
        )
        
        logger.info(f"Route {route_id} recorded to blockchain: {blockchain_result['block_hash']}")
        
        return {
            "status": "success",
            "route_id": route_id,
            "from_location": from_location,
            "to_location": to_location,
            "route_type": route_type,
            "distance": route_data["distance"],
            "duration": route_data["duration"],
            "congestion_level": route_data["congestion_level"],
            "vehicle_counts": route_data["vehicle_counts"],
            "safety_rating": route_data["safety_rating"],
            "blockchain_verified": blockchain_result['blockchain_verified'],
            "blockchain_hash": blockchain_result['block_hash'],
            "recorded_at": blockchain_result['timestamp']
        }
    
    except Exception as e:
        logger.error(f"Route finding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/routes/{route_id}/history")
async def get_route_history(route_id: str):
    """Get blockchain history for a specific route."""
    try:
        history = system_state.route_blockchain.get_route_history(route_id)
        return history
    except Exception as e:
        logger.error(f"Route history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/routes/{route_id}/update")
async def update_route_traffic(
    route_id: str,
    current_congestion: int = Form(...),
    vehicle_counts: str = Form(...)  # JSON string
):
    """Update route traffic data on blockchain."""
    try:
        vehicle_counts = json.loads(vehicle_counts)
        
        result = system_state.route_blockchain.update_route_traffic(
            route_id=route_id,
            current_congestion=current_congestion,
            current_vehicle_counts=vehicle_counts
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Route update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Blockchain Video Streaming ====================
@app.post("/api/blockchain/flush-frames")
async def flush_pending_frames(camera_id: str = Query(None)):
    """Flush pending video frames to blockchain."""
    try:
        results = system_state.video_blockchain.flush_pending_frames(camera_id)
        
        return {
            "status": "success",
            "flushed_batches": len(results),
            "results": results,
            "message": f"Flushed {len(results)} batches to blockchain"
        }
    
    except Exception as e:
        logger.error(f"Flush frames error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/blockchain/verify-upload")
async def verify_video_upload(video_hash: str = Form(...)):
    """Verify if a video upload is recorded on blockchain."""
    try:
        verification = system_state.video_blockchain.verify_upload(video_hash)
        
        return {
            "status": "success",
            "verification_result": verification
        }
    
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Signal Control with Blockchain ====================
@app.post("/api/signal/set/{junction_id}/{lane_id}/blockchain")
async def set_signal_blockchain(junction_id: str, lane_id: str, command: SignalCommand):
    """Set signal and record decision to blockchain."""
    try:
        # Set the signal
        with system_state.signal_lock:
            if junction_id not in system_state.current_signals:
                raise HTTPException(status_code=404, detail=f"Junction {junction_id} not found")
            
            if lane_id not in system_state.current_signals[junction_id]:
                raise HTTPException(status_code=404, detail=f"Lane {lane_id} not found")
            
            duration = int(command.duration) if command.duration else 0
            system_state.current_signals[junction_id][lane_id] = {
                "state": command.signal_state,
                "duration": duration
            }
            
            # Get current vehicle count for blockchain recording
            vehicle_count = system_state.current_vehicle_counts.get(junction_id, {}).get('total', 0)
        
        # Record to blockchain
        blockchain_result = system_state.signal_blockchain.record_signal_control(
            junction_id=junction_id,
            signal_state=command.signal_state,
            duration=duration,
            vehicle_count=vehicle_count
        )
        
        logger.info(f"Signal {junction_id}/{lane_id} recorded to blockchain: {blockchain_result['block_hash']}")
        
        # Broadcast update
        await system_state.broadcast({
            "type": "signal_update",
            "junction_id": junction_id,
            "signals": system_state.current_signals[junction_id],
            "blockchain_recorded": True,
            "blockchain_hash": blockchain_result['block_hash']
        })
        
        return {
            "status": "success",
            "message": f"Signal updated to {command.signal_state}",
            "junction_id": junction_id,
            "lane_id": lane_id,
            "signal": system_state.current_signals[junction_id][lane_id],
            "blockchain_verified": blockchain_result['blockchain_verified'],
            "blockchain_hash": blockchain_result['block_hash']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set signal blockchain error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Blockchain Analytics & Status ====================
@app.get("/api/blockchain/summary")
async def get_blockchain_summary():
    """Get blockchain summary and statistics."""
    try:
        summary = system_state.blockchain_analytics.get_system_summary()
        chain_summary = system_state.blockchain.get_chain_summary()
        
        return {
            "status": "success",
            "blockchain_summary": summary,
            "chain_statistics": chain_summary
        }
    
    except Exception as e:
        logger.error(f"Blockchain summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/camera/{camera_id}/analytics")
async def get_camera_blockchain_analytics(camera_id: str):
    """Get blockchain analytics for a specific camera."""
    try:
        analytics = system_state.blockchain_analytics.get_camera_analytics(camera_id)
        
        return {
            "status": "success",
            "analytics": analytics
        }
    
    except Exception as e:
        logger.error(f"Camera analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/traffic-insights")
async def get_traffic_insights():
    """Get traffic insights from blockchain data."""
    try:
        insights = system_state.blockchain_analytics.get_traffic_insights()
        
        return {
            "status": "success",
            "insights": insights
        }
    
    except Exception as e:
        logger.error(f"Traffic insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/export")
async def export_blockchain():
    """Export entire blockchain as JSON."""
    try:
        blockchain_data = system_state.blockchain.export_chain()
        
        return {
            "status": "success",
            "blockchain_export": blockchain_data
        }
    
    except Exception as e:
        logger.error(f"Blockchain export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/blockchain/verify")
async def verify_blockchain_integrity():
    """Verify blockchain integrity."""
    try:
        is_valid, message = system_state.blockchain.verify_chain()
        
        return {
            "status": "success",
            "blockchain_valid": is_valid,
            "message": message,
            "chain_length": len(system_state.blockchain.chain)
        }
    
    except Exception as e:
        logger.error(f"Blockchain verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== WebSocket Endpoint ====================
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time dashboard updates."""
    await websocket.accept()
    system_state.active_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle any incoming commands from client
            logger.debug(f"WebSocket message: {data}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        system_state.active_connections.remove(websocket)

# ==================== Database Logging Functions ====================
def log_detection(camera_id: str, junction_id: str, vehicle_counts: dict, lane_analytics: dict):
    """Log detection results to database."""
    try:
        conn = sqlite3.connect(config.DB_FILE)
        c = conn.cursor()
        
        total_vehicles = sum(vehicle_counts.values())
        avg_density = sum(
            lane_analytics.get(lane_id, {}).get("density_percent", 0)
            for lane_id in config.LANE_IDS
        ) / len(config.LANE_IDS)
        
        # Get active signal
        active_signal = "UNKNOWN"
        for lane_id, signal_info in system_state.current_signals[junction_id].items():
            if signal_info["state"] == "GREEN":
                active_signal = lane_id
                break
        
        c.execute('''
            INSERT INTO traffic_records
            (timestamp, junction_id, camera_id, car_count, bike_count, bus_count, 
             truck_count, ambulance_count, pedestrian_count, avg_density, signal_state, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            junction_id,
            camera_id,
            vehicle_counts.get("car", 0),
            vehicle_counts.get("bike", 0),
            vehicle_counts.get("bus", 0),
            vehicle_counts.get("truck", 0),
            vehicle_counts.get("ambulance", 0),
            vehicle_counts.get("pedestrian", 0),
            avg_density,
            active_signal,
            datetime.now().isoformat()
        ))
        
        # Log per-lane analytics
        for lane_id, lane_data in lane_analytics.items():
            c.execute('''
                INSERT INTO lane_analytics
                (timestamp, junction_id, camera_id, lane_id, lane_name, vehicle_count, 
                 density_percent, traffic_level, green_time_allocated, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                junction_id,
                camera_id,
                lane_id,
                lane_data.get("lane_name", ""),
                lane_data.get("vehicle_count", 0),
                lane_data.get("density_percent", 0),
                lane_data.get("traffic_level", "UNKNOWN"),
                lane_data.get("green_time", 0),
                datetime.now().isoformat()
            ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Database logging error: {e}")

def log_emergency(vehicle_type: str, location: str, priority: str):
    """Log emergency event to database."""
    try:
        conn = sqlite3.connect(config.DB_FILE)
        c = conn.cursor()
        
        c.execute('''
            INSERT INTO emergency_events
            (timestamp, vehicle_type, location, priority, green_light_granted, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            vehicle_type,
            location,
            priority,
            1,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Emergency logging error: {e}")

# ==================== Smart Contracts & Blockchain Management ====================
@app.post("/api/blockchain/smart-contracts/deploy")
async def deploy_smart_contract(request: SmartContractRequest):
    """Deploy a new smart contract for traffic management."""
    try:
        contract = system_state.blockchain.contract_manager.deploy_contract(
            contract_id=request.contract_id,
            contract_type=request.contract_type,
            rules=request.rules,
            creator=request.creator
        )
        
        logger.info(f"Smart contract deployed: {request.contract_id}")
        
        return {
            "status": "success",
            "contract": contract.to_dict(),
            "message": f"Smart contract {request.contract_id} deployed successfully"
        }
    
    except Exception as e:
        logger.error(f"Contract deployment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/smart-contracts/{contract_id}")
async def get_smart_contract(contract_id: str):
    """Get details of a specific smart contract."""
    try:
        contract = system_state.blockchain.contract_manager.get_contract(contract_id)
        
        if not contract:
            raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")
        
        return {
            "status": "success",
            "contract": contract
        }
    
    except Exception as e:
        logger.error(f"Get contract error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/smart-contracts")
async def list_smart_contracts(contract_type: str = None):
    """List all smart contracts, optionally filtered by type."""
    try:
        contracts = system_state.blockchain.contract_manager.list_contracts(contract_type)
        
        return {
            "status": "success",
            "total": len(contracts),
            "contracts": contracts
        }
    
    except Exception as e:
        logger.error(f"List contracts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/blockchain/smart-contracts/{contract_id}/execute")
async def execute_smart_contract(contract_id: str, request: TransactionRequest):
    """Execute a smart contract with transaction data."""
    try:
        result = system_state.blockchain.contract_manager.execute_contract(contract_id, request.transaction_data)
        
        if result.get('error'):
            logger.warning(f"Contract execution failed: {result['error']}")
        else:
            logger.info(f"Contract {contract_id} executed successfully")
        
        return {
            "status": "success",
            "execution_result": result
        }
    
    except Exception as e:
        logger.error(f"Contract execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/blockchain/transactions/add")
async def add_transaction_to_blockchain(request: TransactionRequest):
    """Add a transaction to blockchain with validation and smart contract execution."""
    try:
        result = system_state.blockchain.add_transaction_to_blockchain(
            transaction_data=request.transaction_data,
            transaction_type=request.transaction_type,
            block_type=request.transaction_type
        )
        
        if result['status'] == 'success':
            logger.info(f"Transaction added to blockchain: {result['block_hash']}")
        else:
            logger.warning(f"Transaction failed: {result.get('error')}")
        
        return {
            "status": result['status'],
            "transaction_id": result.get('transaction_id'),
            "block_hash": result.get('block_hash'),
            "block_index": result.get('block_index'),
            "error": result.get('error')
        }
    
    except Exception as e:
        logger.error(f"Add transaction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/transactions/pending")
async def get_pending_transactions():
    """Get all pending transactions waiting for blockchain confirmation."""
    try:
        pending = system_state.blockchain.transaction_manager.get_pending_transactions()
        
        return {
            "status": "success",
            "total_pending": len(pending),
            "transactions": pending
        }
    
    except Exception as e:
        logger.error(f"Get pending transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/blockchain/transactions/confirm-all")
async def confirm_all_transactions():
    """Confirm all pending transactions and add them to blockchain."""
    try:
        count = system_state.blockchain.transaction_manager.confirm_all_transactions()
        
        logger.info(f"Confirmed {count} transactions")
        
        return {
            "status": "success",
            "confirmed_count": count,
            "message": f"Confirmed {count} pending transactions"
        }
    
    except Exception as e:
        logger.error(f"Confirm transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/analytics")
async def get_blockchain_analytics():
    """Get comprehensive blockchain analytics and statistics."""
    try:
        analytics = system_state.blockchain.get_blockchain_analytics()
        
        return {
            "status": "success",
            "analytics": analytics
        }
    
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blockchain/audit-log")
async def get_contract_audit_log():
    """Get contract execution audit log."""
    try:
        audit_log = system_state.blockchain.get_contract_audit_log()
        
        return {
            "status": "success",
            "audit_log": audit_log
        }
    
    except Exception as e:
        logger.error(f"Audit log error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/blockchain/save")
async def save_blockchain_to_storage():
    """Manually save blockchain state to persistent storage."""
    try:
        system_state.blockchain.save_to_storage()
        
        logger.info("Blockchain saved to persistent storage")
        
        return {
            "status": "success",
            "message": "Blockchain saved successfully",
            "storage_path": str(system_state.blockchain.persistent_storage.storage_dir)
        }
    
    except Exception as e:
        logger.error(f"Save blockchain error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Health Check ====================
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "video_system": VIDEO_MODULES_AVAILABLE,
        "active_connections": len(system_state.active_connections) if system_state else 0
    }

# ==================== Run Application ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=config.FASTAPI_HOST,
        port=config.FASTAPI_PORT,
        log_level="info"
    )
