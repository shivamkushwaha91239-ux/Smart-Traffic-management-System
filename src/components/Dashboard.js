import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import VideoStream from './VideoStream';
import LaneAnalysis from './LaneAnalysis';
import SignalControl from './SignalControl';
import VideoUpload from './VideoUpload';
import TrafficPredictionOverlay from './TrafficPredictionOverlay';
import CongestionMonitor from './CongestionMonitor';
import './Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001/api';

const Dashboard = ({ junction, detectionData, signals, rois, loading }) => {
  const theme = useTheme();
  const [vehicleCounts, setVehicleCounts] = useState({
    car: 0,
    bike: 0,
    bus: 0,
    truck: 0,
    ambulance: 0,
    pedestrian: 0
  });
  const [laneAnalytics, setLaneAnalytics] = useState({});
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [overallStats, setOverallStats] = useState({
    totalVehicles: 0,
    averageDensity: 0,
    criticalJunctions: 0,
    systemHealth: 'Good',
  });

  // Emergency Contacts Data
  const emergencyContacts = [
    {
      id: 1,
      type: 'Police',
      icon: '🚨',
      phone: '+1-911',
      altPhone: '+1-212-555-0100',
      email: 'police@citygov.com',
      website: 'www.police-dept.gov',
      responseTime: '3-5 mins',
      available: '24/7'
    },
    {
      id: 2,
      type: 'Ambulance',
      icon: '🚑',
      phone: '+1-911',
      altPhone: '+1-800-MEDICAL',
      email: 'ambulance@healthcare.com',
      website: 'www.ems-services.gov',
      responseTime: '4-8 mins',
      available: '24/7'
    },
    {
      id: 3,
      type: 'Fire Department',
      icon: '🚒',
      phone: '+1-911',
      altPhone: '+1-212-555-0200',
      email: 'fire@citygov.com',
      website: 'www.fire-dept.gov',
      responseTime: '3-6 mins',
      available: '24/7'
    },
    {
      id: 4,
      type: 'Traffic Control',
      icon: '🚦',
      phone: '+1-212-555-0300',
      altPhone: '+1-800-TRAFFIC',
      email: 'traffic@citygov.com',
      website: 'www.traffic-management.gov',
      responseTime: '2-4 mins',
      available: '24/7'
    },
    {
      id: 5,
      type: 'Hospital',
      icon: '🏥',
      phone: '+1-212-555-0400',
      altPhone: '+1-800-HOSPITAL',
      email: 'emergency@hospital.com',
      website: 'www.city-hospital.com',
      responseTime: 'Variable',
      available: '24/7'
    },
    {
      id: 6,
      type: 'City Control Center',
      icon: '🎛️',
      phone: '+1-212-555-0500',
      altPhone: '+1-800-CITY911',
      email: 'control@citygov.com',
      website: 'www.citygov.com',
      responseTime: 'Real-time',
      available: '24/7'
    },
  ];

  useEffect(() => {
    if (detectionData) {
      setVehicleCounts(detectionData.vehicle_counts);
      setLaneAnalytics(detectionData.lane_analytics || {});
      const total = Object.values(detectionData.vehicle_counts || {}).reduce((a, b) => a + b, 0);
      setOverallStats(prev => ({ ...prev, totalVehicles: total }));
    }
  }, [detectionData]);

  const handleEmergency = async () => {
    setShowEmergencyContacts(true);
    try {
      await axios.post(`${API_BASE_URL}/emergency/priority`, {
        vehicle_type: 'ambulance',
        location: junction,
        priority: 'high'
      });
      setEmergencyMode(true);
      setTimeout(() => setEmergencyMode(false), 30000);
    } catch (error) {
      console.error('Emergency request failed:', error);
    }
  };

  const handleContactCall = (phone) => {
    window.location.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
  };

  const handleContactEmail = (email) => {
    window.location.href = `mailto:${email}?subject=Emergency Alert - ${junction}`;
  };

  const closeEmergencyContacts = () => {
    setShowEmergencyContacts(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Initializing system...</p>
      </div>
    );
  }

  return (
    <div className={`dashboard ${emergencyMode ? 'emergency-mode' : ''}`}>
      <header className="dashboard-header">
        <h1>⚙️ Smart Traffic Management System - {junction}</h1>
        <div className="header-actions">
          <button 
            className="emergency-btn"
            onClick={handleEmergency}
          >
            🚨 Emergency Priority
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Video Stream Section */}
        <section className="video-section">
          <h2>📹 Live Video Feed</h2>
          <div className="video-container">
            <VideoStream cameraId={junction} />
          </div>
        </section>
        
        {/* AI Prediction Panel */}
        <section className="prediction-section">
          <TrafficPredictionOverlay detectionData={detectionData} />
        </section>

        {/* KPI Cards Section */}
        <section className="kpi-section">
          <h2>Vehicle Detection</h2>
          <div className="kpi-grid">
            <div className="kpi-card vehicle-card cars">
              <div className="kpi-icon">🚗</div>
              <div className="kpi-value">{vehicleCounts.car}</div>
              <div className="kpi-label">Cars</div>
            </div>
            <div className="kpi-card vehicle-card bikes">
              <div className="kpi-icon">🏍️</div>
              <div className="kpi-value">{vehicleCounts.bike}</div>
              <div className="kpi-label">Bikes</div>
            </div>
            <div className="kpi-card vehicle-card buses">
              <div className="kpi-icon">🚌</div>
              <div className="kpi-value">{vehicleCounts.bus}</div>
              <div className="kpi-label">Buses</div>
            </div>
            <div className="kpi-card vehicle-card trucks">
              <div className="kpi-icon">🚚</div>
              <div className="kpi-value">{vehicleCounts.truck}</div>
              <div className="kpi-label">Trucks</div>
            </div>
            <div className="kpi-card vehicle-card ambulances">
              <div className="kpi-icon">🚑</div>
              <div className="kpi-value">{vehicleCounts.ambulance}</div>
              <div className="kpi-label">Ambulances</div>
            </div>
            <div className="kpi-card vehicle-card pedestrians">
              <div className="kpi-icon">🚶</div>
              <div className="kpi-value">{vehicleCounts.pedestrian}</div>
              <div className="kpi-label">Pedestrians</div>
            </div>
          </div>
        </section>

        {/* Lane Analysis Section */}
        <section className="lane-section">
          <h2>Lane Analysis</h2>
          <LaneAnalysis laneAnalytics={laneAnalytics} />
        </section>

        {/* Signal Control Section */}
        <section className="signal-section">
          <h2>Signal Status</h2>
          <SignalControl signals={signals} junction={junction} />
        </section>
      </div>

      {/* ROI Overlay Display */}
      {rois.length > 0 && (
        <section className="roi-info">
          <h3>Configured Lanes: {rois.length}</h3>
          <ul className="roi-list">
            {rois.map((roi) => (
              <li key={roi.roi_id}>
                <span className="roi-badge">{roi.roi_id}</span>
                <span className="roi-name">{roi.lane_name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Video Upload and Analysis Section */}
      <VideoUpload 
        junction={junction}
        onAnalysisComplete={(results) => {
          console.log('Analysis completed:', results);
          // Update vehicle counts if analysis returned data
          if (results.vehicle_counts) {
            setVehicleCounts(prev => ({
              ...prev,
              ...results.vehicle_counts
            }));
          }
        }}
      />

      {/* Congestion Monitoring and Analytics */}
      <CongestionMonitor detectionData={detectionData} />

      {/* Emergency Contacts Modal */}
      {showEmergencyContacts && (
        <div className="emergency-modal-overlay" onClick={closeEmergencyContacts}>
          <div className="emergency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emergency-modal-header">
              <h2>🚨 Emergency Contacts</h2>
              <p className="emergency-location">Location: {junction}</p>
              <button className="emergency-close-btn" onClick={closeEmergencyContacts}>✕</button>
            </div>

            <div className="emergency-alert-banner">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">Emergency Mode Activated - Quick Access to Emergency Services</span>
            </div>

            <div className="emergency-contacts-grid">
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className="emergency-contact-card">
                  <div className="contact-header">
                    <span className="contact-icon">{contact.icon}</span>
                    <h3 className="contact-type">{contact.type}</h3>
                  </div>

                  <div className="contact-status">
                    <span className="status-badge">✓ Available 24/7</span>
                    <span className="response-time">Response: {contact.responseTime}</span>
                  </div>

                  <div className="contact-details">
                    {/* Primary Phone */}
                    <div className="contact-item">
                      <span className="item-label">📞 Primary:</span>
                      <button 
                        className="contact-button phone-btn"
                        onClick={() => handleContactCall(contact.phone)}
                        title="Click to call"
                      >
                        {contact.phone}
                      </button>
                    </div>

                    {/* Alternative Phone */}
                    <div className="contact-item">
                      <span className="item-label">📲 Alternate:</span>
                      <button 
                        className="contact-button phone-btn"
                        onClick={() => handleContactCall(contact.altPhone)}
                        title="Click to call"
                      >
                        {contact.altPhone}
                      </button>
                    </div>

                    {/* Email */}
                    <div className="contact-item">
                      <span className="item-label">📧 Email:</span>
                      <button 
                        className="contact-button email-btn"
                        onClick={() => handleContactEmail(contact.email)}
                        title="Click to email"
                      >
                        {contact.email}
                      </button>
                    </div>

                    {/* Website */}
                    <div className="contact-item">
                      <span className="item-label">🌐 Website:</span>
                      <a 
                        href={`https://${contact.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-button website-btn"
                      >
                        {contact.website}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="emergency-footer">
              <p className="emergency-info">
                All emergency services are on standby. Current Location: <strong>{junction}</strong>
              </p>
              <button className="close-modal-btn" onClick={closeEmergencyContacts}>
                Close Emergency Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
