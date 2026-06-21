"""
ROI (Region of Interest) Management Module
Handles lane definition using 4-point polygons, ROI storage, and lane-based analysis.
"""

import json
import numpy as np
import cv2
import logging
from typing import List, Dict, Tuple
from pathlib import Path
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ROI:
    """
    Represents a Region of Interest (lane) defined by a 4-point polygon.
    """
    
    def __init__(self, roi_id, lane_name, points, junction_id="Main"):
        """
        Initialize ROI.
        
        Args:
            roi_id: Unique identifier (e.g., 'Lane-A')
            lane_name: Display name (e.g., 'North-Bound')
            points: List of 4 (x, y) tuples defining polygon vertices
            junction_id: Parent junction identifier
        """
        if len(points) != 4:
            raise ValueError("ROI must have exactly 4 points")
        
        self.roi_id = roi_id
        self.lane_name = lane_name
        self.points = [tuple(p) for p in points]
        self.junction_id = junction_id
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        self.is_active = True
        
    def to_dict(self):
        """Convert ROI to dictionary."""
        return {
            "roi_id": self.roi_id,
            "lane_name": self.lane_name,
            "points": self.points,
            "junction_id": self.junction_id,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create ROI from dictionary."""
        roi = cls(
            roi_id=data['roi_id'],
            lane_name=data['lane_name'],
            points=data['points'],
            junction_id=data.get('junction_id', 'Main')
        )
        roi.is_active = data.get('is_active', True)
        roi.created_at = data.get('created_at', roi.created_at)
        roi.updated_at = data.get('updated_at', roi.updated_at)
        return roi
    
    def point_in_roi(self, point):
        """
        Check if point is inside ROI polygon.
        
        Args:
            point: (x, y) tuple
        
        Returns:
            True if point is inside, False otherwise
        """
        points_array = np.array(self.points, dtype=np.float32)
        x, y = point
        return cv2.pointPolygonTest(points_array, (x, y), False) >= 0
    
    def get_mask(self, frame_width, frame_height):
        """
        Get binary mask for ROI in frame.
        
        Args:
            frame_width: Frame width
            frame_height: Frame height
        
        Returns:
            Binary mask (0 outside ROI, 255 inside)
        """
        mask = np.zeros((frame_height, frame_width), dtype=np.uint8)
        points = np.array(self.points, dtype=np.int32)
        cv2.fillPoly(mask, [points], 255)
        return mask
    
    def draw(self, frame, color=(0, 255, 0), thickness=2):
        """
        Draw ROI on frame.
        
        Args:
            frame: OpenCV frame
            color: BGR color tuple
            thickness: Line thickness
        
        Returns:
            Frame with drawn ROI
        """
        frame = frame.copy()
        points = np.array(self.points, dtype=np.int32)
        
        # Draw polygon
        cv2.polylines(frame, [points], True, color, thickness)
        
        # Draw vertices
        for i, point in enumerate(self.points):
            cv2.circle(frame, point, 6, color, -1)
            cv2.putText(frame, str(i), (point[0] + 10, point[1] + 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Draw label
        center = tuple(np.mean(self.points, axis=0).astype(int))
        cv2.putText(frame, self.lane_name, center,
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        return frame


class ROIManager:
    """
    Manages multiple ROIs for a traffic junction.
    Handles storage, retrieval, and updates of lane definitions.
    """
    
    def __init__(self, junction_id="Main", storage_file="roi_config.json"):
        """
        Initialize ROI Manager.
        
        Args:
            junction_id: Junction identifier
            storage_file: JSON file for persisting ROI data
        """
        self.junction_id = junction_id
        self.storage_file = storage_file
        self.rois = {}  # Dict[roi_id, ROI]
        self.load_from_file()
    
    def add_roi(self, roi_id, lane_name, points):
        """
        Add new ROI.
        
        Args:
            roi_id: Unique identifier
            lane_name: Display name
            points: List of 4 (x, y) points
        
        Returns:
            Created ROI object
        """
        if roi_id in self.rois:
            logger.warning(f"ROI {roi_id} already exists, replacing")
        
        roi = ROI(roi_id, lane_name, points, self.junction_id)
        self.rois[roi_id] = roi
        logger.info(f"ROI {roi_id} added: {lane_name}")
        self.save_to_file()
        return roi
    
    def update_roi(self, roi_id, points):
        """
        Update ROI points.
        
        Args:
            roi_id: ROI identifier
            points: New list of 4 (x, y) points
        
        Returns:
            True if successful, False if ROI not found
        """
        if roi_id not in self.rois:
            logger.error(f"ROI {roi_id} not found")
            return False
        
        self.rois[roi_id].points = [tuple(p) for p in points]
        self.rois[roi_id].updated_at = datetime.now().isoformat()
        logger.info(f"ROI {roi_id} updated")
        self.save_to_file()
        return True
    
    def delete_roi(self, roi_id):
        """
        Delete ROI.
        
        Args:
            roi_id: ROI identifier
        
        Returns:
            True if successful
        """
        if roi_id not in self.rois:
            logger.error(f"ROI {roi_id} not found")
            return False
        
        del self.rois[roi_id]
        logger.info(f"ROI {roi_id} deleted")
        self.save_to_file()
        return True
    
    def get_roi(self, roi_id):
        """Get specific ROI."""
        return self.rois.get(roi_id)
    
    def get_all_rois(self):
        """Get all ROIs."""
        return list(self.rois.values())
    
    def get_rois_dict(self):
        """Get ROIs as dictionary."""
        return {rid: roi.to_dict() for rid, roi in self.rois.items()}
    
    def toggle_roi(self, roi_id):
        """Toggle ROI active status."""
        if roi_id not in self.rois:
            return False
        self.rois[roi_id].is_active = not self.rois[roi_id].is_active
        self.save_to_file()
        return True
    
    def save_to_file(self):
        """Save all ROIs to JSON file."""
        try:
            data = {
                "junction_id": self.junction_id,
                "timestamp": datetime.now().isoformat(),
                "rois": self.get_rois_dict()
            }
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"ROIs saved to {self.storage_file}")
            return True
        except Exception as e:
            logger.error(f"Save error: {str(e)}")
            return False
    
    def load_from_file(self):
        """Load ROIs from JSON file."""
        try:
            if not Path(self.storage_file).exists():
                logger.info(f"No ROI file found: {self.storage_file}")
                return False
            
            with open(self.storage_file, 'r') as f:
                data = json.load(f)
            
            self.junction_id = data.get('junction_id', self.junction_id)
            self.rois = {}
            
            for roi_id, roi_data in data.get('rois', {}).items():
                roi = ROI.from_dict(roi_data)
                self.rois[roi_id] = roi
            
            logger.info(f"Loaded {len(self.rois)} ROIs from {self.storage_file}")
            return True
        except Exception as e:
            logger.error(f"Load error: {str(e)}")
            return False
    
    def draw_all_rois(self, frame):
        """
        Draw all active ROIs on frame.
        
        Args:
            frame: OpenCV frame
        
        Returns:
            Frame with drawn ROIs
        """
        frame = frame.copy()
        colors = [
            (0, 255, 0),    # Green - Lane A
            (255, 0, 0),    # Blue - Lane B
            (0, 165, 255),  # Orange - Lane C
            (255, 0, 255)   # Magenta - Lane D
        ]
        
        for i, roi in enumerate(self.get_all_rois()):
            if roi.is_active:
                color = colors[i % len(colors)]
                frame = roi.draw(frame, color=color)
        
        return frame


class LaneAnalyzer:
    """
    Analyzes detections within lane ROIs.
    Calculates density, vehicle counts, and traffic metrics per lane.
    """
    
    def __init__(self, roi_manager):
        """
        Initialize Lane Analyzer.
        
        Args:
            roi_manager: ROIManager instance
        """
        self.roi_manager = roi_manager
    
    def analyze_detections(self, frame, detections):
        """
        Assign detections to lanes and calculate metrics.
        
        Args:
            frame: OpenCV frame
            detections: List of detection dicts with 'box', 'class', 'confidence'
        
        Returns:
            Dict with lane-wise analysis
        """
        frame_height, frame_width = frame.shape[:2]
        lane_stats = {}
        
        for roi in self.roi_manager.get_all_rois():
            if not roi.is_active:
                continue
            
            roi_id = roi.roi_id
            lane_stats[roi_id] = {
                'lane_name': roi.lane_name,
                'vehicle_count': 0,
                'vehicles': [],
                'density_percent': 0,
                'traffic_level': 'LIGHT',
                'roi_area': self._calculate_roi_area(roi)
            }
            
            # Get ROI mask
            roi_mask = roi.get_mask(frame_width, frame_height)
            
            # Check which detections are in this ROI
            for det in detections:
                x1, y1, x2, y2 = det.get('box', (0, 0, 0, 0))
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2
                
                # Check if center point is in ROI
                if roi_mask[center_y, center_x] > 0:
                    lane_stats[roi_id]['vehicles'].append(det)
                    lane_stats[roi_id]['vehicle_count'] += 1
            
            # Calculate density
            roi_area = lane_stats[roi_id]['roi_area']
            if roi_area > 0:
                density = (lane_stats[roi_id]['vehicle_count'] * 100) / (roi_area / 10000)
                lane_stats[roi_id]['density_percent'] = min(100, density)
            
            # Determine traffic level
            density = lane_stats[roi_id]['density_percent']
            if density < 30:
                lane_stats[roi_id]['traffic_level'] = 'LIGHT'
            elif density < 60:
                lane_stats[roi_id]['traffic_level'] = 'MODERATE'
            else:
                lane_stats[roi_id]['traffic_level'] = 'HEAVY'
        
        return lane_stats
    
    def _calculate_roi_area(self, roi):
        """Calculate area of ROI polygon."""
        points = np.array(roi.points, dtype=np.float32)
        area = cv2.contourArea(points)
        return area
    
    def get_highest_density_lane(self, lane_stats):
        """
        Get lane with highest traffic density.
        
        Args:
            lane_stats: Dictionary from analyze_detections()
        
        Returns:
            (roi_id, density_percent) tuple
        """
        if not lane_stats:
            return None, 0
        
        max_lane = max(lane_stats.items(),
                      key=lambda x: x[1]['density_percent'])
        return max_lane[0], max_lane[1]['density_percent']
    
    def get_signal_allocation(self, lane_stats, total_time=120):
        """
        Calculate signal timing for each lane based on density.
        
        Args:
            lane_stats: Dictionary from analyze_detections()
            total_time: Total cycle time in seconds
        
        Returns:
            Dict mapping roi_id to green time allocation
        """
        densities = {rid: stats['density_percent'] 
                    for rid, stats in lane_stats.items()}
        
        total_density = sum(densities.values()) or 1
        
        signal_allocation = {}
        min_green = 12  # Minimum green time
        
        for roi_id, density in densities.items():
            # Allocate proportional to density
            green_time = int((density / total_density) * total_time)
            # Ensure minimum
            green_time = max(min_green, green_time)
            signal_allocation[roi_id] = green_time
        
        return signal_allocation
