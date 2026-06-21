import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import './SignalControl.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const SIGNAL_STATES = {
  'RED': { color: '#FF4444', icon: '🔴', label: 'Stop' },
  'YELLOW': { color: '#FFBB33', icon: '🟡', label: 'Caution' },
  'GREEN': { color: '#00C851', icon: '🟢', label: 'Go' }
};

const LANE_NAMES = {
  'A': 'North-Bound',
  'B': 'South-Bound',
  'C': 'East-Bound',
  'D': 'West-Bound'
};

const SignalControl = ({ signals, junction }) => {
  const theme = useTheme();
  const [timers, setTimers] = useState({});
  const [selectedLane, setSelectedLane] = useState(null);
  const [localSignals, setLocalSignals] = useState({});
  const [liveData, setLiveData] = useState(null);
  const [selectedArea, setSelectedArea] = useState(junction || 'Junction-01');
  const [predictions, setPredictions] = useState({});
  const [customDurations, setCustomDurations] = useState({
    GREEN: 45,
    YELLOW: 5,
    RED: 30
  });
  const [showDurationSettings, setShowDurationSettings] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [signalHistory, setSignalHistory] = useState({});
  const [congestionAlerts, setCongestionAlerts] = useState([]);
  const [systemEfficiency, setSystemEfficiency] = useState(0);

  // Available areas/junctions
  const AVAILABLE_AREAS = [
    { id: 'Junction-01', name: '🚦 Junction-01 (Main Highway)' },
    { id: 'Junction-02', name: '🛣️ Junction-02 (Downtown)' },
    { id: 'Junction-03', name: '🚗 Junction-03 (Residential)' }
  ];

  // Extract lane letter from "Lane-A" format
  const getLaneLetter = (laneId) => {
    return laneId.replace('Lane-', '');
  };

  // Calculate system efficiency (how well signals match traffic)
  const calculateEfficiency = (predData, signals) => {
    let matchCount = 0;
    let totalLanes = 0;

    Object.entries(predData).forEach(([laneId, pred]) => {
      totalLanes++;
      const currentSignal = signals[laneId]?.state;
      if (currentSignal === pred.predictedState) {
        matchCount += pred.confidence;
      }
    });

    return totalLanes > 0 ? Math.round((matchCount / totalLanes) * 100) : 0;
  };

  // Check for congestion alerts
  const checkCongestionAlerts = (vehicleCounts, laneAnalytics) => {
    const newAlerts = [];
    const totalVehicles = Object.values(vehicleCounts).reduce((a, b) => a + b, 0);

    if (totalVehicles > 20) {
      newAlerts.push({
        id: 'high-traffic',
        level: 'critical',
        message: `🚨 CRITICAL: ${totalVehicles} vehicles detected - Heavy congestion`,
        timestamp: new Date()
      });
    } else if (totalVehicles > 15) {
      newAlerts.push({
        id: 'moderate-traffic',
        level: 'warning',
        message: `⚠️ WARNING: ${totalVehicles} vehicles detected - Moderate congestion`,
        timestamp: new Date()
      });
    }

    Object.entries(laneAnalytics).forEach(([laneId, laneData]) => {
      if (laneData.density_percent > 85) {
        const laneLetter = laneId;
        newAlerts.push({
          id: `lane-${laneLetter}`,
          level: 'critical',
          message: `🛑 Lane ${laneLetter}: Density ${Math.round(laneData.density_percent)}% - SEVERE`,
          timestamp: new Date()
        });
      }
    });

    // Only update state if alerts have changed in count or severity
    setCongestionAlerts(prev => {
      if (newAlerts.length !== prev.length) {
        return newAlerts;
      }
      return prev;
    });
  };

  // Generate predictions based on vehicle counts
  const generatePredictions = (vehicleCounts, laneAnalytics) => {
    const newPredictions = {};
    
    // Get total vehicles
    const totalVehicles = Object.values(vehicleCounts).reduce((a, b) => a + b, 0);

    // Predict signal timing for each lane based on density
    Object.entries(laneAnalytics).forEach(([laneId, laneData]) => {
      const density = laneData.density_percent || 0;
      const vehicleCount = laneData.vehicle_count || 0;
      
      let predictedState = 'RED';
      let confidence = 0;
      let reason = 'Low traffic';

      if (density > 70 && vehicleCount > 4) {
        predictedState = 'GREEN';
        confidence = Math.min(100, 50 + density / 2);
        reason = `High congestion (${Math.round(density)}%) with ${vehicleCount} vehicles`;
      } else if ((density >= 40 && density <= 70) || (vehicleCount >= 2 && vehicleCount <= 4)) {
        predictedState = 'YELLOW';
        confidence = Math.min(100, 40 + vehicleCount * 10);
        reason = `Moderate traffic (${Math.round(density)}%) with ${vehicleCount} vehicles`;
      } else {
        predictedState = 'RED';
        confidence = Math.min(100, 30 + (100 - density) / 3);
        reason = `Light traffic (${Math.round(density)}%) with ${vehicleCount} vehicles`;
      }

      newPredictions[laneId] = {
        predictedState,
        confidence: Math.round(confidence),
        reason,
        vehicleCount,
        density: Math.round(density)
      };
    });

    // Only update state if predictions have changed
    setPredictions(prev => {
      const hasChanged = JSON.stringify(prev) !== JSON.stringify(newPredictions);
      return hasChanged ? newPredictions : prev;
    });
  };

  // Fetch live video stream data and predict signal timing
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/detection/current/${selectedArea}`);
        if (response.data.status === 'success') {
          const vehicleCounts = response.data.vehicle_counts || {};
          const laneAnalytics = response.data.lane_analytics || {};
          
          setLiveData({
            vehicles: vehicleCounts,
            lanes: laneAnalytics,
            timestamp: response.data.timestamp
          });

          // Generate predictions based on live data
          generatePredictions(vehicleCounts, laneAnalytics);
          
          // Check for congestion alerts
          checkCongestionAlerts(vehicleCounts, laneAnalytics);
        }
      } catch (error) {
        console.error('Failed to fetch live data:', error);
      }
    };

    const interval = setInterval(fetchLiveData, 2000);
    fetchLiveData();

    return () => clearInterval(interval);
  }, [selectedArea]);

  // Update efficiency when predictions change
  useEffect(() => {
    if (Object.keys(predictions).length > 0 && Object.keys(localSignals).length > 0) {
      const newEfficiency = calculateEfficiency(predictions, localSignals);
      setSystemEfficiency(newEfficiency);
    }
  }, [predictions]);

  // Timer countdown for green lights
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((lane) => {
          if (updated[lane] > 0) {
            updated[lane] -= 1;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update timers and signals when they change
  useEffect(() => {
    const initializeSignals = async () => {
      // First try to use signals from props
      if (signals && Object.keys(signals).length > 0) {
        const newTimers = {};
        const filtered = {};
        
        // Only keep 4 lanes (A, B, C, D)
        const laneOrder = ['Lane-A', 'Lane-B', 'Lane-C', 'Lane-D'];
        
        laneOrder.forEach((lane) => {
          if (signals[lane]) {
            filtered[lane] = signals[lane];
            newTimers[lane] = signals[lane].duration || 0;
          }
        });
        
        if (Object.keys(filtered).length > 0) {
          setLocalSignals(filtered);
          setTimers(newTimers);
          return;
        }
      }
      
      // If props are empty, fetch from API
      try {
        const response = await axios.get(`${API_BASE_URL}/signal/status/${selectedArea}`);
        if (response.data && response.data.signals) {
          const newTimers = {};
          const filtered = {};
          const laneOrder = ['Lane-A', 'Lane-B', 'Lane-C', 'Lane-D'];
          
          laneOrder.forEach((lane) => {
            if (response.data.signals[lane]) {
              filtered[lane] = response.data.signals[lane];
              newTimers[lane] = response.data.signals[lane].duration || 0;
            }
          });
          
          if (Object.keys(filtered).length > 0) {
            setLocalSignals(filtered);
            setTimers(newTimers);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch signals from API:', error);
      }
      
      // Fallback: Initialize with default signals if both prop and API fail
      const defaultSignals = {
        'Lane-A': { state: 'GREEN', duration: 45 },
        'Lane-B': { state: 'RED', duration: 0 },
        'Lane-C': { state: 'RED', duration: 0 },
        'Lane-D': { state: 'RED', duration: 0 }
      };
      
      setLocalSignals(defaultSignals);
      setTimers({
        'Lane-A': 45,
        'Lane-B': 0,
        'Lane-C': 0,
        'Lane-D': 0
      });
    };

    initializeSignals();
  }, [signals, selectedArea]);

  const handleManualSignalChange = async (laneId, newState) => {
    try {
      const duration = customDurations[newState] || 0;
      
      console.log(`Changing signal: ${laneId} to ${newState} with duration ${duration}s`);
      
      const response = await axios.post(
        `${API_BASE_URL}/signal/set/${junction}/${laneId}`,
        {
          signal_state: newState,
          duration: duration
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Signal change response:', response.data);
      
      // Update local state immediately for better UX
      setLocalSignals(prev => ({
        ...prev,
        [laneId]: {
          state: newState,
          duration: duration
        }
      }));
      
      setTimers(prev => ({
        ...prev,
        [laneId]: duration
      }));
      
      setSelectedLane(null);
    } catch (error) {
      console.error('Failed to change signal:', error);
      console.error('Error response:', error.response);
      alert(`Failed to change signal: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDurationChange = (state, value) => {
    setCustomDurations({
      ...customDurations,
      [state]: Math.max(1, parseInt(value) || 0)
    });
  };

  if (!localSignals || Object.keys(localSignals).length === 0) {
    return (
      <div className="signal-control-empty">
        <p>Loading signal data...</p>
      </div>
    );
  }

  return (
    <div className="signal-control">
      {/* Area Selection & Emergency Mode */}
      <div className="area-selection-panel">
        <div className="area-selector-header">
          <div className="header-left">
            <h2>🚦 Signal Status</h2>
            <span className="live-badge">● LIVE</span>
          </div>
          <div className="header-right">
            <div className="efficiency-display">
              <span className="efficiency-label">System Efficiency</span>
              <div className="efficiency-bar">
                <div className="efficiency-fill" style={{width: `${systemEfficiency}%`}}></div>
              </div>
              <span className="efficiency-percent">{systemEfficiency}%</span>
            </div>
          </div>
        </div>

        <div className="junction-controls">
          <div className="control-group">
            <label>Select Area / Junction</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="area-selector"
            >
              {AVAILABLE_AREAS.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <button
              className={`emergency-btn ${emergencyMode ? 'active' : ''}`}
              onClick={() => setEmergencyMode(!emergencyMode)}
              title="Activate emergency mode for ambulance/fire vehicles"
            >
              {emergencyMode ? '🚨 EMERGENCY ACTIVE' : '🚑 Emergency Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Data & Predictions */}
      {liveData && (
        <div className="live-predictions-panel">
          <div className="predictions-header">
            <h3>🎯 Live Traffic Predictions</h3>
            <span className="live-indicator">● LIVE</span>
          </div>

          <div className="predictions-stats">
            <div className="stat-card">
              <span className="stat-icon">🚗</span>
              <span className="stat-value">{liveData.vehicles.total || 0}</span>
              <span className="stat-label">Total Vehicles</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">👥</span>
              <span className="stat-value">{liveData.vehicles.pedestrian || 0}</span>
              <span className="stat-label">Pedestrians</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⏱️</span>
              <span className="stat-value">
                {liveData.timestamp ? new Date(liveData.timestamp).toLocaleTimeString() : 'N/A'}
              </span>
              <span className="stat-label">Last Updated</span>
            </div>
          </div>

          {/* Lane Predictions */}
          <div className="lane-predictions">
            <p className="predictions-subtitle">Signal Recommendations by Lane:</p>
            <div className="predictions-grid">
              {Object.entries(predictions).map(([laneId, pred]) => {
                const laneLetter = laneId;
                const laneName = LANE_NAMES[laneLetter];
                const predSignalInfo = SIGNAL_STATES[pred.predictedState] || SIGNAL_STATES['RED'];
                
                return (
                  <div key={laneId} className="prediction-card">
                    <div className="prediction-lane-header">
                      <span className="prediction-lane-id">{laneLetter}</span>
                      <span className="prediction-lane-name">{laneName}</span>
                    </div>
                    
                    <div className="prediction-indicator">
                      <div
                        className="prediction-light"
                        style={{
                          backgroundColor: predSignalInfo.color,
                          boxShadow: `0 0 15px ${predSignalInfo.color}`
                        }}
                      >
                        {predSignalInfo.icon}
                      </div>
                      <span className="prediction-state">{pred.predictedState}</span>
                    </div>

                    <div className="prediction-details">
                      <div className="prediction-metric">
                        <span className="metric-label">Confidence:</span>
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${pred.confidence}%`,
                              backgroundColor: pred.confidence > 70 ? '#4CAF50' : pred.confidence > 40 ? '#FFC107' : '#F44336'
                            }}
                          ></div>
                        </div>
                        <span className="metric-value">{pred.confidence}%</span>
                      </div>

                      <div className="prediction-metric">
                        <span className="metric-label">Vehicles: {pred.vehicleCount}</span>
                        <span className="metric-label">Density: {pred.density}%</span>
                      </div>

                      <p className="prediction-reason">
                        💡 {pred.reason}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Duration Settings Panel */}
      <div className="duration-settings-panel">
        <button
          className="settings-toggle-btn"
          onClick={() => setShowDurationSettings(!showDurationSettings)}
        >
          ⚙️ Signal Timing Settings {showDurationSettings ? '▼' : '▶'}
        </button>

        {showDurationSettings && (
          <div className="duration-settings-content">
            <div className="duration-row">
              <label>
                <span className="duration-label">🟢 Green Light Duration (seconds):</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customDurations.GREEN}
                  onChange={(e) => handleDurationChange('GREEN', e.target.value)}
                  className="duration-input"
                />
              </label>
            </div>

            <div className="duration-row">
              <label>
                <span className="duration-label">🟡 Yellow Light Duration (seconds):</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={customDurations.YELLOW}
                  onChange={(e) => handleDurationChange('YELLOW', e.target.value)}
                  className="duration-input"
                />
              </label>
            </div>

            <div className="duration-row">
              <label>
                <span className="duration-label">🔴 Red Light Duration (seconds):</span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customDurations.RED}
                  onChange={(e) => handleDurationChange('RED', e.target.value)}
                  className="duration-input"
                />
              </label>
            </div>

            <div className="duration-info">
              <p>💡 <strong>Cycle Time:</strong> {customDurations.GREEN + customDurations.YELLOW + customDurations.RED}s total</p>
              <p>These settings will apply when you change signals manually</p>
            </div>
          </div>
        )}
      </div>

      {/* Congestion Alerts & System Efficiency */}
      {(congestionAlerts.length > 0 || systemEfficiency !== null) && (
        <div className="alerts-and-efficiency-panel">
          {congestionAlerts.length > 0 && (
            <div className="congestion-alerts">
              <h3>⚠️ Active Alerts</h3>
              <div className="alerts-list">
                {congestionAlerts.map((alert) => (
                  <div key={alert.id} className={`alert-item alert-${alert.level}`}>
                    <span className="alert-message">{alert.message}</span>
                    <span className="alert-time">{alert.timestamp.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {systemEfficiency !== null && (
            <div className="efficiency-metrics">
              <h3>📊 System Efficiency</h3>
              <div className="efficiency-bar">
                <div
                  className="efficiency-fill"
                  style={{
                    width: `${systemEfficiency}%`,
                    backgroundColor: systemEfficiency > 80 ? '#4caf50' : systemEfficiency > 50 ? '#ff9800' : '#f44336'
                  }}
                />
              </div>
              <p className="efficiency-text">{systemEfficiency}% - Signals match traffic predictions</p>
            </div>
          )}
        </div>
      )}

      <div className="signal-grid">
        {Object.entries(localSignals).map(([laneId, data]) => {
          const signalInfo = SIGNAL_STATES[data.state] || SIGNAL_STATES['RED'];
          const timer = timers[laneId] || 0;
          const laneLetter = getLaneLetter(laneId);
          const laneName = LANE_NAMES[laneLetter];

          return (
            <div
              key={laneId}
              className={`signal-card signal-${data.state.toLowerCase()}`}
              onClick={() => setSelectedLane(selectedLane === laneId ? null : laneId)}
            >
              <div className="signal-header">
                <span className="lane-id">{laneLetter}</span>
                <span className="lane-name">{laneName}</span>
              </div>

              {/* Signal Light */}
              <div className="signal-light-container">
                <div
                  className="signal-light"
                  style={{
                    backgroundColor: signalInfo.color,
                    boxShadow: `0 0 20px ${signalInfo.color}`
                  }}
                >
                  {signalInfo.icon}
                </div>
              </div>

              {/* Signal Label */}
              <div className="signal-label">{signalInfo.label}</div>

              {/* Timer */}
              {data.state === 'GREEN' && (
                <div className="signal-timer">{timer}s</div>
              )}

              {/* Manual Control */}
              {selectedLane === laneId && (
                <div className="signal-control-panel" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="control-btn red"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualSignalChange(laneId, 'RED');
                    }}
                  >
                    🔴 Red ({customDurations.RED}s)
                  </button>
                  <button
                    className="control-btn yellow"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualSignalChange(laneId, 'YELLOW');
                    }}
                  >
                    🟡 Yellow ({customDurations.YELLOW}s)
                  </button>
                  <button
                    className="control-btn green"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleManualSignalChange(laneId, 'GREEN');
                    }}
                  >
                    🟢 Green ({customDurations.GREEN}s)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="signal-info">
        <p>📌 Click on a signal to manually control. Set custom timing above (use with caution)</p>
      </div>
    </div>
  );
};

export default SignalControl;
