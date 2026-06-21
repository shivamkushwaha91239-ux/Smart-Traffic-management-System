"""
Smart Traffic Management System - Enhanced Configuration
Includes video capture, ROI management, YOLO detection, and real-time signal control
"""

# ==================== FastAPI Server Configuration ====================
FASTAPI_HOST = "127.0.0.1"
FASTAPI_PORT = 8001
DEBUG = True
ENV = "development"

# CORS Configuration for React
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*"
]

# ==================== Database Configuration ====================
DB_FILE = "traffic_data.db"
DB_BACKUP_INTERVAL_HOURS = 24

# ==================== Video Capture Configuration ====================
# Camera sources: 0 = local webcam, RTSP URL for network cameras
CAMERA_SOURCES = {
    "Junction-01": {
        "source": 0,  # Real webcam/camera hardware
        "resolution": (1280, 720),
        "fps": 30,
        "buffer_size": 30,
        "description": "Main intersection - North-South traffic"
    },
    "Junction-02": {
        "source": "rtsp://user:password@192.168.1.100:554/stream1",
        "resolution": (1280, 720),
        "fps": 30,
        "buffer_size": 30,
        "description": "Secondary junction - East-West traffic"
    },
    "Junction-03": {
        "source": "rtsp://user:password@192.168.1.101:554/stream2",
        "resolution": (1280, 720),
        "fps": 30,
        "buffer_size": 30,
        "description": "Tertiary junction - Central intersection"
    },
    "Hazratganj": {
        "source": "rtsp://user:password@192.168.1.102:554/stream3",
        "resolution": (1280, 720),
        "fps": 30,
        "buffer_size": 30,
        "description": "Hazratganj Circle - North-South traffic"
    },
    "Thandi-Sarak": {
        "source": "rtsp://user:password@192.168.1.103:554/stream4",
        "resolution": (1280, 720),
        "fps": 30,
        "buffer_size": 30,
        "description": "Thandi Sarak - East-West traffic"
    }
}

# ==================== ROI (Region of Interest) Configuration ====================
# Define lane boundaries using 4-point polygons for each camera
ROI_DEFINITIONS = {
    "Junction-01": {
        "lanes": {
            "Lane-A": {
                "name": "North-Bound",
                "points": [(50, 50), (250, 100), (250, 400), (50, 350)],
                "description": "Traffic flowing northbound",
                "color": [0, 255, 0]
            },
            "Lane-B": {
                "name": "South-Bound",
                "points": [(300, 50), (500, 100), (500, 400), (300, 350)],
                "description": "Traffic flowing southbound",
                "color": [255, 0, 0]
            },
            "Lane-C": {
                "name": "East-Bound",
                "points": [(550, 50), (750, 100), (750, 400), (550, 350)],
                "description": "Traffic flowing eastbound",
                "color": [0, 0, 255]
            },
            "Lane-D": {
                "name": "West-Bound",
                "points": [(800, 50), (1000, 100), (1000, 400), (800, 350)],
                "description": "Traffic flowing westbound",
                "color": [255, 255, 0]
            }
        }
    }
}

# YOLO Model Configuration
YOLO_MODEL = "yolov8n.pt"  # Options: yolov8n, yolov8s, yolov8m, yolov8l, yolov8x
YOLO_CONFIDENCE_THRESHOLD = 0.45
YOLO_NMS_THRESHOLD = 0.5
YOLO_DEVICE = "cpu"  # Options: cpu, cuda, mps

# Traffic Signal Configuration
SIGNAL_CYCLE_TIME = 120  # seconds
MIN_GREEN_TIME = 12
MAX_GREEN_TIME = 80
YELLOW_TIME = 5
RED_TIME = 15

# Emergency Vehicle Configuration
EMERGENCY_GREEN_TIME = 75
EMERGENCY_PRIORITY_VEHICLES = ["ambulance", "fire", "police", "vip"]

# Lane Configuration
NUM_LANES = 4
LANE_IDS = ["A", "B", "C", "D"]
LANE_NAMES = ["North-Bound", "South-Bound", "East-Bound", "West-Bound"]
LANE_COLORS = {
    "A": [0, 255, 0],      # Green
    "B": [255, 0, 0],      # Red
    "C": [0, 0, 255],      # Blue
    "D": [255, 255, 0]     # Yellow
}

# Weather-Based Control
WEATHER_MULTIPLIERS = {
    "normal": 1.0,
    "rain": 1.15,
    "fog": 1.15,
    "storm": 1.20
}

# Night Mode Configuration
NIGHT_MODE_START_HOUR = 22  # 10 PM
NIGHT_MODE_END_HOUR = 5     # 5 AM
NIGHT_MODE_MULTIPLIER = 0.75

# Peak Hour Configuration
PEAK_HOURS = [
    (6, 8),    # 6-8 AM
    (17, 20)   # 5-8 PM
]
PEAK_HOUR_WEIGHT = 1.35

# Prediction Configuration
PREDICTION_WINDOW_MINUTES = 30
PREDICTION_CONFIDENCE_MIN = 58
PREDICTION_CONFIDENCE_MAX = 98

# Pollution Monitoring
CO2_REFERENCE = 400  # ppm baseline
AQI_REFERENCE = 100
POLLUTION_REDUCTION_PER_SIGNAL = 0.05  # percentage

# Efficiency Metrics
FUEL_PRICE_PER_LITER = 1.2  # USD
FUEL_CONSUMPTION_IDLE = 0.08  # L/min
FUEL_CONSUMPTION_MOVING = 0.15  # L/min

# API Rate Limiting
API_RATE_LIMIT = "100 per minute"

# City Configuration
CITY_NAME = "Smart City Traffic Network"
CITY_CENTER_LAT = 26.8467
CITY_CENTER_LNG = 80.9462
CITY_ZOOM_LEVEL = 13

# Junctions
JUNCTIONS = {
    "hazratganj": {"lat": 26.8467, "lng": 80.9462, "lanes": 3},
    "charbagh": {"lat": 26.8358, "lng": 80.9248, "lanes": 4},
    "gomti_nagar": {"lat": 26.8523, "lng": 81.0081, "lanes": 3},
    "aliganj": {"lat": 26.8901, "lng": 80.9539, "lanes": 3},
    "railway_station": {"lat": 26.8214, "lng": 80.9252, "lanes": 4},
}

# Parking Configuration
TOTAL_PARKING_SLOTS = 500
PARKING_ZONES = {
    "central_market": {"total": 200, "reserved": 20},
    "hospital_district": {"total": 150, "reserved": 30},
    "commercial_hub": {"total": 150, "reserved": 15},
}

# Email Notifications (Optional)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "your_email@gmail.com"
EMAIL_PASSWORD = "your_app_password"

# Logging Configuration
LOG_LEVEL = "INFO"
LOG_FILE = "traffic_system.log"
LOG_MAX_SIZE_MB = 100
LOG_BACKUP_COUNT = 5

# API Documentation
API_TITLE = "Smart Traffic Management System API"
API_VERSION = "1.0.0"
API_DESCRIPTION = "Real-time vehicle detection and adaptive traffic signal control"

# Feature Flags
FEATURE_ANPR = True
FEATURE_PEDESTRIAN_DETECTION = True
FEATURE_PARKING_MANAGEMENT = True
FEATURE_WEATHER_CONTROL = True
FEATURE_NIGHT_OPTIMIZATION = True
FEATURE_AI_PREDICTION = True
FEATURE_EMERGENCY_PRIORITY = True
FEATURE_POLLUTION_MONITORING = True

# Development Settings
MOCK_DATA = True  # Use simulated data when camera/YOLO unavailable
VERBOSE_LOGGING = False
ENABLE_PROFILING = False

# ==================== Video Processing Performance ====================
VIDEO_PROCESSING = {
    "enable_frame_caching": True,
    "cache_size_mb": 500,
    "max_threads": 10,
    "detection_cache_frames": 3,  # Skip detection on some frames for speed
    "encoding_quality": 80  # JPEG quality 0-100
}

# ==================== YOLO Model Configuration ====================
YOLO_MODEL = "yolov8n.pt"  # Options: yolov8n, yolov8s, yolov8m, yolov8l, yolov8x
YOLO_CONFIDENCE_THRESHOLD = 0.45
YOLO_NMS_THRESHOLD = 0.5
YOLO_DEVICE = "cpu"  # Options: cpu, cuda, mps
YOLO_CLASSES = {
    "car": 2,
    "motorcycle": 3,
    "bus": 5,
    "truck": 7,
    "person": 0,
    "bicycle": 1
}

# ==================== Traffic Signal Configuration ====================
SIGNAL_CYCLE_TIME = 120  # seconds
MIN_GREEN_TIME = 12
MAX_GREEN_TIME = 80
YELLOW_TIME = 5
RED_TIME = 15

# Emergency Vehicle Configuration
EMERGENCY_GREEN_TIME = 75
EMERGENCY_PRIORITY_VEHICLES = ["ambulance", "fire", "police", "vip"]

# ==================== Lane Configuration ====================
NUM_LANES = 3
LANE_IDS = ["A", "B", "C"]
LANE_NAMES = ["North-Bound", "South-Bound", "East-West"]

# ==================== Weather-Based Control ====================
WEATHER_MULTIPLIERS = {
    "normal": 1.0,
    "rain": 1.15,
    "fog": 1.15,
    "storm": 1.20
}

# ==================== Night Mode Configuration ====================
NIGHT_MODE_START_HOUR = 22  # 10 PM
NIGHT_MODE_END_HOUR = 5     # 5 AM
NIGHT_MODE_MULTIPLIER = 0.75

# ==================== Peak Hour Configuration ====================
PEAK_HOURS = [
    (6, 8),    # 6-8 AM
    (17, 20)   # 5-8 PM
]
PEAK_HOUR_WEIGHT = 1.35

# ==================== Prediction Configuration ====================
PREDICTION_WINDOW_MINUTES = 30
PREDICTION_CONFIDENCE_MIN = 58
PREDICTION_CONFIDENCE_MAX = 98
HISTORICAL_DATA_WEIGHT = 0.40
LIVE_DATA_WEIGHT = 0.60

# ==================== Pollution Monitoring ====================
CO2_REFERENCE = 400  # ppm baseline
AQI_REFERENCE = 100
POLLUTION_REDUCTION_PER_SIGNAL = 0.05  # percentage
CO2_REDUCTION_PER_OPTIMIZED_CYCLE = 5  # kg

# ==================== Efficiency Metrics ====================
FUEL_PRICE_PER_LITER = 1.2  # USD
FUEL_CONSUMPTION_IDLE = 0.08  # L/min
FUEL_CONSUMPTION_MOVING = 0.15  # L/min
CO2_PER_LITER_FUEL = 2.31  # kg CO2

# ==================== API Rate Limiting ====================
API_RATE_LIMIT = "100 per minute"
API_TIMEOUT_SECONDS = 30

# ==================== City Configuration ====================
CITY_NAME = "Smart City Traffic Network"
CITY_CENTER_LAT = 26.8467
CITY_CENTER_LNG = 80.9462
CITY_ZOOM_LEVEL = 13

# Junctions Configuration with ROI and camera settings
JUNCTIONS = {
    "Junction-01": {
        "id": "Junction-01",
        "name": "Hazratganj",
        "lat": 26.8467,
        "lng": 80.9462,
        "lanes": 3,
        "camera_id": "Junction-01"
    },
    "Junction-02": {
        "id": "Junction-02",
        "name": "Station Road",
        "lat": 26.8437,
        "lng": 80.8267,
        "lanes": 3,
        "camera_id": "Junction-02"
    },
    "Junction-03": {
        "id": "Junction-03",
        "name": "Aishbagh",
        "lat": 26.8485,
        "lng": 80.8151,
        "lanes": 3,
        "camera_id": "Junction-03"
    },
    "Junction-04": {
        "id": "Junction-04",
        "name": "Aminabad",
        "lat": 26.8375,
        "lng": 80.8408,
        "lanes": 4
    },
    "Junction-05": {
        "id": "Junction-05",
        "name": "Charbagh",
        "lat": 26.8234,
        "lng": 80.8354,
        "lanes": 4
    }
}

# ==================== Parking Configuration ====================
TOTAL_PARKING_SLOTS = 500
PARKING_ZONES = {
    "central_market": {"total": 200, "reserved": 20},
    "hospital_district": {"total": 150, "reserved": 30},
    "commercial_hub": {"total": 150, "reserved": 15},
}
PARKING_UPDATE_INTERVAL_SECONDS = 30

# ==================== ANPR (License Plate Recognition) ====================
ANPR_CONFIG = {
    "enabled": True,
    "confidence_threshold": 0.7,
    "database_integration": False,
    "toll_integration": False,
    "police_watchlist": False
}

# ==================== Email Notifications (Optional) ====================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "your_email@gmail.com"
EMAIL_PASSWORD = "your_app_password"

# ==================== Logging Configuration ====================
LOG_LEVEL = "INFO"
LOG_FILE = "traffic_system.log"
LOG_MAX_SIZE_MB = 100
LOG_BACKUP_COUNT = 5

# ==================== API Documentation ====================
API_TITLE = "Smart Traffic Management System API"
API_VERSION = "2.0"
API_DESCRIPTION = "Real-time vehicle detection, ROI-based lane analysis, and adaptive traffic signal control"

# ==================== Feature Flags ====================
FEATURE_ANPR = True
FEATURE_PEDESTRIAN_DETECTION = True
FEATURE_PARKING_MANAGEMENT = True
FEATURE_WEATHER_CONTROL = True
FEATURE_NIGHT_OPTIMIZATION = True
FEATURE_AI_PREDICTION = True
FEATURE_EMERGENCY_PRIORITY = True
FEATURE_POLLUTION_MONITORING = True
FEATURE_VIDEO_STREAMING = True
FEATURE_ROI_BASED_ANALYSIS = True
FEATURE_REAL_TIME_SIGNALS = True
