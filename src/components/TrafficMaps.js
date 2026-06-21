import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import './TrafficMaps.css';

const TrafficMaps = () => {
  const API_BASE_URL = 'http://localhost:8001';
  const mapRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState('Junction-01');
  const [trafficData, setTrafficData] = useState({});
  const [predictions, setPredictions] = useState({});
  const [mapLoading, setMapLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(null);

  // Lucknow major junctions with coordinates
  const lucknowLocations = {
    'Junction-01': { lat: 26.8467, lng: 80.9462, name: 'Charbagh Junction' },
    'Junction-02': { lat: 26.8469, lng: 80.9282, name: 'Kaiserbagh Junction' },
    'Junction-03': { lat: 26.8471, lng: 80.9368, name: 'Lucknow Central Junction' },
    'Hazratganj': { lat: 26.8494, lng: 80.9410, name: 'Hazratganj Circle' },
    'Thandi-Sarak': { lat: 26.8480, lng: 80.9250, name: 'Thandi Sarak' },
  };

  // Initialize map and fetch data
  useEffect(() => {
    initializeMap();
    fetchAllData();
    // Update every 2 seconds for real-time density updates
    const interval = setInterval(fetchAllData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update markers when traffic data changes
  useEffect(() => {
    updateMapMarkers();
  }, [trafficData, predictions, selectedLocation]);

  const fetchAllData = async () => {
    try {
      setMapLoading(true);
      setError(null);

      // Fetch real-time detection data for each junction
      const trafficMap = {};
      for (const [junctionKey, location] of Object.entries(lucknowLocations)) {
        try {
          const detectionResponse = await axios.get(`${API_BASE_URL}/api/detection/current/${junctionKey}`);
          if (detectionResponse.data?.lane_analytics) {
            // Calculate average density from all lanes
            const laneAnalytics = detectionResponse.data.lane_analytics;
            const densities = Object.values(laneAnalytics)
              .map(lane => lane.density_percent || 0)
              .filter(d => typeof d === 'number');
            const avgDensity = densities.length > 0 
              ? densities.reduce((a, b) => a + b, 0) / densities.length 
              : 0;

            // Get total vehicles
            const totalVehicles = Object.values(detectionResponse.data.vehicle_counts || {})
              .reduce((a, b) => typeof a === 'number' && typeof b === 'number' ? a + b : 0, 0);

            // Determine traffic level based on density
            let trafficLevel = 'LIGHT';
            if (avgDensity > 75) trafficLevel = 'CRITICAL';
            else if (avgDensity > 50) trafficLevel = 'HEAVY';
            else if (avgDensity > 25) trafficLevel = 'MODERATE';

            trafficMap[junctionKey] = {
              density: avgDensity,
              vehicles: totalVehicles,
              traffic_level: trafficLevel,
              name: location.name,
            };
          }
        } catch (err) {
          console.log(`Detection data not available for ${junctionKey}`);
          trafficMap[junctionKey] = {
            density: 0,
            vehicles: 0,
            traffic_level: 'LIGHT',
            name: location.name,
          };
        }
      }
      setTrafficData(trafficMap);

      // Fetch predictions for each junction
      const predMap = {};
      for (const junctionId of Object.keys(lucknowLocations)) {
        try {
          const predResponse = await axios.get(`${API_BASE_URL}/api/predictions/traffic/${junctionId}`);
          if (predResponse.data?.data) {
            predMap[junctionId] = predResponse.data.data;
          }
        } catch (err) {
          console.log(`Predictions not available for ${junctionId}`);
        }
      }
      setPredictions(predMap);

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Data fetch error:', err);
      setError('Failed to fetch traffic data');
    } finally {
      setMapLoading(false);
    }
  };

  const initializeMap = () => {
    if (mapRef.current) {
      mapRef.current.innerHTML = `
        <div id="map-canvas" style="width: 100%; height: 100%; position: relative; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; background: #1a1a2e;">
          <!-- Satellite Map Background using Tiles -->
          <div id="tile-layer" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); z-index: 1;">
            <svg style="width: 100%; height: 100%; position: absolute;" id="map-svg">
              <defs>
                <pattern id="satellite-grid" patternUnits="userSpaceOnUse" width="100" height="100">
                  <rect width="100" height="100" fill="#0f3460"/>
                  <circle cx="20" cy="20" r="8" fill="#00d4ff" opacity="0.3"/>
                  <circle cx="80" cy="80" r="6" fill="#00d4ff" opacity="0.2"/>
                  <circle cx="50" cy="50" r="10" fill="#0088ff" opacity="0.25"/>
                  <path d="M 0 50 Q 50 40 100 50" stroke="#00d4ff" stroke-width="1" fill="none" opacity="0.2"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#satellite-grid)"/>
              <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#4a5568" opacity="0.3" font-size="60" font-weight="bold">LUCKNOW</text>
            </svg>
          </div>
          <!-- Traffic Overlay -->
          <div id="traffic-overlay" style="position: absolute; width: 100%; height: 100%; z-index: 10;"></div>
          <!-- Prediction Panel -->
          <div id="prediction-panel" style="position: absolute; top: 10px; left: 10px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); padding: 16px; border-radius: 10px; color: white; z-index: 25; border: 2px solid rgba(0, 212, 255, 0.3); max-width: 280px; font-size: 12px; box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);">
            <div style="font-weight: bold; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">🔮 <span>Live Prediction</span></div>
            <div id="prediction-content" style="opacity: 0.95; line-height: 1.6; font-size: 11px;">No junction selected</div>
          </div>
          <!-- Map Legend -->
          <div id="map-legend" style="position: absolute; bottom: 10px; right: 10px; background: rgba(255,255,255,0.98); padding: 16px; border-radius: 10px; font-size: 11px; z-index: 20; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="margin-bottom: 10px; font-weight: bold; color: #1f2937;">📊 Traffic Density Scale</div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><span style="width: 16px; height: 16px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981;"></span><span style="color: #374151;"><strong>Light</strong> 0-25%</span></div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><span style="width: 16px; height: 16px; background: #eab308; border-radius: 50%; box-shadow: 0 0 8px #eab308;"></span><span style="color: #374151;"><strong>Moderate</strong> 25-50%</span></div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;"><span style="width: 16px; height: 16px; background: #f59e0b; border-radius: 50%; box-shadow: 0 0 8px #f59e0b;"></span><span style="color: #374151;"><strong>Heavy</strong> 50-75%</span></div>
            <div style="display: flex; align-items: center; gap: 10px;"><span style="width: 16px; height: 16px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 8px #ef4444;"></span><span style="color: #374151;"><strong>Critical</strong> 75%+</span></div>
          </div>
          <!-- Update Info -->
          <div id="update-info" style="position: absolute; bottom: 10px; left: 10px; background: rgba(15, 23, 42, 0.95); padding: 10px 14px; border-radius: 8px; color: #00d4ff; z-index: 20; font-size: 10px; border: 1px solid rgba(0, 212, 255, 0.2);">
            <span id="update-time">Last updated: now</span>
          </div>
        </div>
      `;
      updateMapMarkers();
    }
  };

  const updateMapMarkers = () => {
    const overlay = document.getElementById('traffic-overlay');
    if (!overlay) return;

    overlay.innerHTML = '';

    const minLat = 26.84, maxLat = 26.86;
    const minLng = 80.92, maxLng = 80.96;

    Object.entries(lucknowLocations).forEach(([key, location]) => {
      const data = trafficData[key] || { density: 0, vehicles: 0, traffic_level: 'Unknown', name: location.name };
      const prediction = predictions[key] || {};
      
      const percentX = ((location.lng - minLng) / (maxLng - minLng)) * 100;
      const percentY = ((maxLat - location.lat) / (maxLat - minLat)) * 100;

      const density = data.density || 0;
      const color = getTrafficColor(density);
      const size = 12 + (density / 100) * 22;

      // Create marker container
      const markerContainer = document.createElement('div');
      markerContainer.style.cssText = `
        position: absolute;
        left: ${percentX}%;
        top: ${percentY}%;
        transform: translate(-50%, -50%);
        z-index: 15;
        cursor: pointer;
      `;

      // Create actual marker circle
      const marker = document.createElement('div');
      marker.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 ${size}px ${color}80, inset 0 0 ${size/2}px rgba(255,255,255,0.3);
        animation: pulse-marker 2.5s infinite;
        transition: all 0.3s ease;
      `;

      // Create density label inside/near marker
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        pointer-events: none;
        white-space: nowrap;
        min-width: 35px;
        text-align: center;
      `;
      label.textContent = `${Math.round(density)}%`;

      // Create junction name tooltip
      const tooltip = document.createElement('div');
      tooltip.style.cssText = `
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #00d4ff;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        border: 1px solid rgba(0, 212, 255, 0.3);
        white-space: nowrap;
      `;
      tooltip.textContent = `${data.name || location.name}`;

      markerContainer.appendChild(marker);
      marker.appendChild(label);
      markerContainer.appendChild(tooltip);

      markerContainer.onmouseover = () => {
        marker.style.transform = `scale(1.5)`;
        marker.style.zIndex = '20';
        tooltip.style.opacity = '1';
      };

      markerContainer.onmouseout = () => {
        marker.style.transform = `scale(1)`;
        marker.style.zIndex = '15';
        tooltip.style.opacity = '0';
      };

      markerContainer.onclick = (e) => {
        e.stopPropagation();
        setSelectedLocation(key);
      };

      overlay.appendChild(markerContainer);
    });

    // Update prediction panel
    if (selectedLocation) {
      const selectedData = trafficData[selectedLocation];
      const pred = predictions[selectedLocation];
      const panel = document.getElementById('prediction-content');
      if (panel && selectedData) {
        const nextHour = pred?.next_hour || {};
        const bestTime = pred?.best_travel_time || {};
        const peakHours = pred?.peak_hours || [];
        
        let html = `
          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <div style="color: #00d4ff; font-weight: 600; margin-bottom: 4px;">📍 ${selectedData.name}</div>
            <div style="font-size: 20px; font-weight: bold; color: ${getTrafficColor(selectedData.density)};">${Math.round(selectedData.density)}% ${selectedData.traffic_level}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">🚗 ${selectedData.vehicles || 0} vehicles</div>
          </div>
          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <div style="color: #fbbf24; font-size: 10px; margin-bottom: 4px;">⏱️ NEXT HOUR</div>
            <div style="font-size: 14px; font-weight: bold;">${Math.round(nextHour.density || 0)}%</div>
            <div style="font-size: 9px; color: #cbd5e1;">${nextHour.traffic_level || 'N/A'}</div>
          </div>
          <div>
            <div style="color: #34d399; font-size: 10px; margin-bottom: 4px;">🎯 BEST TRAVEL TIME</div>
            <div style="font-size: 14px; font-weight: bold;">${bestTime.time || 'N/A'}</div>
            <div style="font-size: 9px; color: #cbd5e1;">📊 ${Math.round(bestTime.density || 0)}% density</div>
          </div>
        `;
        panel.innerHTML = html;
      }
    }

    const timeEl = document.getElementById('update-time');
    if (timeEl) {
      timeEl.textContent = `Last updated: ${lastUpdate.toLocaleTimeString()}`;
    }

    if (!document.getElementById('pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'pulse-animation';
      style.innerHTML = `
        @keyframes pulse-marker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
      `;
      document.head.appendChild(style);
    }
  };

  const getTrafficColor = (density) => {
    if (density > 75) return '#ef4444';
    if (density > 50) return '#f59e0b';
    if (density > 25) return '#eab308';
    return '#10b981';
  };

  const getTrafficLevel = (density) => {
    if (density > 75) return 'Critical';
    if (density > 50) return 'Heavy';
    if (density > 25) return 'Moderate';
    return 'Light';
  };

  const styles = {
    container: {
      padding: '20px',
      background: '#f8fafc',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '20px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: '5px',
    },
    subtitle: {
      color: '#64748b',
      fontSize: '14px',
    },
    mapContainer: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '20px',
      marginBottom: '30px',
    },
    mapBox: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
      height: '500px',
    },
    mapVisualization: {
      width: '100%',
      height: '100%',
      borderRadius: '8px',
    },
    locationsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    locationCard: (isSelected) => ({
      padding: '15px',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: '#ffffff',
      border: isSelected ? '3px solid #3b82f6' : '1px solid #e2e8f0',
      boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
    }),
  };

  const selectedJunction = lucknowLocations[selectedLocation];
  const selectedDensity = ((trafficData[selectedLocation] || {}).density) || 0;
  const selectedLevel = getTrafficLevel(selectedDensity);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🛰️ Real-time Satellite Traffic Maps - Lucknow</h1>
        <p style={styles.subtitle}>Live satellite view with AI predictions • Real-time vehicle tracking • Updates every 30 seconds</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#7f1d1d', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {mapLoading && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          ⏳ Loading traffic data...
        </div>
      )}

      <div style={styles.mapContainer}>
        <div style={styles.mapBox}>
          <div style={styles.mapVisualization} ref={mapRef}></div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>📍 Selected Junction</h3>
          {selectedJunction && (
            <div>
              <p style={{ marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>{selectedJunction.name}</p>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: getTrafficColor(selectedDensity), marginBottom: '8px' }}>
                {Math.round(selectedDensity)}%
              </div>
              <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: getTrafficColor(selectedDensity) + '20', color: getTrafficColor(selectedDensity) }}>
                {selectedLevel} Traffic
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>VEHICLE COUNT</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                  {trafficData[selectedLocation]?.vehicles || 0} vehicles
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>📍 All Junctions</h2>
        <div style={styles.locationsGrid}>
          {Object.entries(lucknowLocations).map(([key, location]) => {
            const data = trafficData[key] || { density: 0 };
            const isSelected = key === selectedLocation;
            return (
              <div
                key={key}
                style={styles.locationCard(isSelected)}
                onClick={() => setSelectedLocation(key)}
              >
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                  {location.name}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  Density: <strong>{Math.round(data.density || 0)}%</strong>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${data.density || 0}%`,
                      background: getTrafficColor(data.density || 0),
                      transition: 'width 0.3s ease',
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrafficMaps;
