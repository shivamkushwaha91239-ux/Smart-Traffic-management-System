import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './components/Dashboard';
import ROIEditor from './components/ROIEditor';
import Analytics from './components/Analytics';
import Navigation from './components/Navigation';
import TrafficMaps from './components/TrafficMaps';
import RoutePlanner from './components/RoutePlanner';
import SignalManagementAdvanced from './components/SignalManagementAdvanced';
import TrafficPrediction from './components/TrafficPrediction';
import GuideAssistant from './components/GuideAssistant';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001/api';

function AppContent() {
  const [activeJunction, setActiveJunction] = useState('Junction-01');
  const [detectionData, setDetectionData] = useState(null);
  const [signals, setSignals] = useState({});
  const [rois, setROIs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [cameraStreaming, setCameraStreaming] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // WebSocket connection for real-time updates
  useEffect(() => {
    try {
      const socket = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      });

      socket.on('detection_update', (data) => {
        setDetectionData(data);
        setVehicleCount(Object.values(data.vehicle_counts || {}).reduce((a, b) => a + b, 0));
        setSignals(data.signals);
      });

      socket.on('signal_update', (data) => {
        setSignals(data.signals);
      });

      socket.on('emergency_alert', (data) => {
        console.log('Emergency Alert:', data);
        // Show emergency notification
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      return () => {
        socket.disconnect();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    }
  }, []);

  // Polling mechanism for vehicle count updates
  useEffect(() => {
    const pollVehicleCount = async () => {
      try {
        // Fetch current detection data from API
        const response = await axios.get(`${API_BASE_URL}/detection/current/${activeJunction}`);
        if (response.data && response.data.vehicle_counts) {
          const counts = response.data.vehicle_counts;
          // Directly use the counts from the API
          const mappedCounts = {
            car: counts.car || 0,
            bike: counts.bike || 0,
            bus: counts.bus || 0,
            truck: counts.truck || 0,
            ambulance: counts.ambulance || 0,
            pedestrian: counts.pedestrian || 0
          };
          const totalCount = counts.total || Object.values(mappedCounts).reduce((a, b) => a + b, 0);
          setVehicleCount(totalCount);
          setDetectionData({
            vehicle_counts: mappedCounts,
            lane_analytics: response.data.lane_analytics || {
              'A': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
              'B': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
              'C': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
              'D': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45}
            },
            timestamp: response.data.timestamp
          });
          console.log('✅ Counts updated:', mappedCounts);
          return;
        }
      } catch (error) {
        console.debug('Detection API error:', error.message);
      }

      try {
        // Fallback to traffic overview API
        const response = await axios.get(`${API_BASE_URL}/traffic/overview`);
        if (response.data.status === 'success' && response.data.data.junctions) {
          // Find current junction data
          const junctionData = response.data.data.junctions.find(j => j.id === activeJunction);
          if (junctionData) {
            const counts = junctionData.detection_counts;
            // Map plural form to singular for Dashboard
            const mappedCounts = {
              car: counts.cars || 0,
              bike: counts.bikes || 0,
              bus: counts.buses || 0,
              truck: counts.trucks || 0,
              ambulance: counts.ambulances || 0,
              pedestrian: counts.pedestrians || 0
            };
            const totalCount = Object.values(mappedCounts).reduce((a, b) => a + b, 0);
            setVehicleCount(totalCount);
            setDetectionData({
              vehicle_counts: mappedCounts,
              lane_analytics: {
                'A': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                'B': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                'C': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45},
                'D': {'vehicle_count': 0, 'density_percent': 0, 'traffic_level': 'LIGHT', 'green_time': 45}
              },
              timestamp: junctionData.timestamp
            });
          }
        }
      } catch (error) {
        console.debug('Failed to fetch vehicle count:', error.message);
      }
    };

    // Poll every 1 second for real-time updates
    const interval = setInterval(pollVehicleCount, 1000);
    
    // Initial fetch
    pollVehicleCount();

    return () => clearInterval(interval);
  }, [activeJunction]);

  // Poll camera streaming status
  useEffect(() => {
    const pollCameraStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/video/status/${activeJunction}`);
        if (response.data) {
          setCameraStreaming(response.data.is_streaming);
        }
      } catch (error) {
        console.debug('Failed to fetch camera status:', error.message);
        setCameraStreaming(false);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollCameraStatus, 2000);
    
    // Initial fetch
    pollCameraStatus();

    return () => clearInterval(interval);
  }, [activeJunction]);

  // Fetch ROIs on mount and when junction changes
  const fetchROIs = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/roi/get_all/${activeJunction}`);
      setROIs(Object.values(response.data.rois || {}));
    } catch (error) {
      console.error('Failed to fetch ROIs:', error);
    }
  }, [activeJunction]);

  // Fetch initial signal status
  const fetchSignalStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/signal/status/${activeJunction}`);
      if (response.data && response.data.signals) {
        setSignals(response.data.signals);
      }
    } catch (error) {
      console.error('Failed to fetch signal status:', error);
      // Set default signals on error to prevent loading state
      setSignals({
        'Lane-A': { state: 'GREEN', duration: 45 },
        'Lane-B': { state: 'RED', duration: 0 },
        'Lane-C': { state: 'RED', duration: 0 },
        'Lane-D': { state: 'RED', duration: 0 }
      });
    } finally {
      setLoading(false);
    }
  }, [activeJunction]);

  // Poll signal status every 2 seconds
  useEffect(() => {
    fetchSignalStatus();
    const interval = setInterval(fetchSignalStatus, 2000);
    return () => clearInterval(interval);
  }, [activeJunction, fetchSignalStatus]);

  // Fetch ROIs when junction changes
  useEffect(() => {
    fetchROIs();
  }, [activeJunction, fetchROIs]);

  return (
    <Router>
      <div className="App">
        <Navigation 
          activeJunction={activeJunction}
          onJunctionChange={setActiveJunction}
          isConnected={cameraStreaming}
          vehicleCount={vehicleCount}
        />
        
        <main className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard 
                  junction={activeJunction}
                  detectionData={detectionData}
                  signals={signals}
                  rois={rois}
                  loading={loading}
                />
              }
            />
            
            <Route 
              path="/maps" 
              element={<TrafficMaps />}
            />
            
            <Route 
              path="/routes" 
              element={<RoutePlanner />}
            />
            
            <Route 
              path="/signals" 
              element={<SignalManagementAdvanced />}
            />
            
            <Route 
              path="/predictions" 
              element={<TrafficPrediction />}
            />
            
            <Route 
              path="/roi-editor" 
              element={
                <ROIEditor 
                  junction={activeJunction}
                  rois={rois}
                  onROIsUpdated={fetchROIs}
                />
              }
            />
            
            <Route 
              path="/analytics" 
              element={
                <Analytics 
                  junction={activeJunction}
                />
              }
            />
          </Routes>
        </main>

        {/* Guide Assistant */}
        <GuideAssistant />
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
