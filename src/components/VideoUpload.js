import React, { useState, useRef } from 'react';
import axios from 'axios';
import './VideoUpload.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001/api';

const VideoUpload = ({ junction = 'Junction-01', onAnalysisComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [analyzeMode, setAnalyzeMode] = useState('file'); // 'file' or 'url'
  const [videoUrl, setVideoUrl] = useState('');
  const [blockchainStatus, setBlockchainStatus] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-active');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-active');
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPreviewUrl(evt.target.result);
      };
      reader.readAsDataURL(droppedFile);
    } else {
      setError('Please drop a valid video file');
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file && !videoUrl) {
      setError('Please select a video file or enter a video URL');
      return;
    }

    if (!junction) {
      setError('Junction not specified. Please refresh the page.');
      return;
    }

    setUploading(true);
    setError(null);
    setBlockchainStatus('Processing...');

    try {
      const formData = new FormData();
      
      if (analyzeMode === 'file' && file) {
        formData.append('file', file);
      } else if (analyzeMode === 'url' && videoUrl) {
        formData.append('video_url', videoUrl);
      }
      
      formData.append('junction', junction);
      
      // Debug logging
      console.log('Uploading video with junction:', junction);
      console.log('Mode:', analyzeMode);

      const response = await axios.post(
        `${API_BASE_URL}/video/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      console.log('Upload response:', response.data);
      setAnalysisResults(response.data);
      setFile(null);
      setVideoUrl('');
      setPreviewUrl(null);
      setUploadProgress(0);
      
      // Set blockchain status
      if (response.data.blockchain_recorded) {
        setBlockchainStatus(`✅ Recorded on blockchain\nHash: ${response.data.blockchain_hash?.substring(0, 16)}...`);
      } else {
        setBlockchainStatus('⏳ Blockchain recording pending');
      }
      
      if (onAnalysisComplete) {
        onAnalysisComplete(response.data);
      }
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to upload and analyze video');
      setBlockchainStatus('❌ Blockchain recording failed');
    } finally {
      setUploading(false);
    }
  };

  const clearResults = () => {
    setAnalysisResults(null);
    setFile(null);
    setVideoUrl('');
    setPreviewUrl(null);
    setUploadProgress(0);
    setError(null);
  };

  return (
    <div className="video-upload-container">
      {/* Mode Selector */}
      <div className="upload-mode-selector">
        <button 
          className={`mode-btn ${analyzeMode === 'file' ? 'active' : ''}`}
          onClick={() => {
            setAnalyzeMode('file');
            setVideoUrl('');
            setError(null);
          }}
        >
          📁 Upload File
        </button>
        <button 
          className={`mode-btn ${analyzeMode === 'url' ? 'active' : ''}`}
          onClick={() => {
            setAnalyzeMode('url');
            setFile(null);
            setPreviewUrl(null);
            setError(null);
          }}
        >
          🔗 Video URL
        </button>
      </div>

      {!analysisResults ? (
        <div className="upload-section">
          <h3>📹 Upload Video for Traffic Analysis</h3>
          <p className="upload-description">
            Upload a traffic video file to get instant predictions on vehicle types, pedestrian counts, and congestion levels
          </p>

          {analyzeMode === 'file' ? (
            // File Upload Area
            <div 
              className="upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📹</div>
              <h4>Drag and Drop Video Here</h4>
              <p>or click to select from computer</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button 
                className="select-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Video File
              </button>
              <p className="file-info">Supported: MP4, WebM, MOV, AVI (Max 500MB)</p>
            </div>
          ) : (
            // URL Input Area
            <div className="url-input-area">
              <input
                type="text"
                placeholder="Enter video URL (e.g., https://example.com/traffic.mp4)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="url-input"
              />
              <p className="url-info">Enter a direct link to a publicly accessible video</p>
            </div>
          )}

          {file && (
            <div className="file-selected">
              <div className="file-info-card">
                <span className="file-icon">✓</span>
                <div className="file-details">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {videoUrl && (
            <div className="url-selected">
              <div className="url-info-card">
                <span className="url-icon">✓</span>
                <p className="url-text">{videoUrl}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing video...'}
              </p>
            </div>
          )}

          <button 
            className="analyze-btn"
            onClick={handleUploadAndAnalyze}
            disabled={(!file && !videoUrl) || uploading}
          >
            {uploading ? '⏳ Processing...' : (file || videoUrl) ? '✅ Video Uploaded - Analyzing...' : '🔍 Analyze Video'}
          </button>
        </div>
      ) : (
        // Analysis Results Display
        <div className="analysis-results">
          <div className="results-header">
            <h3>✨ Analysis Results</h3>
            <button className="close-results-btn" onClick={clearResults}>✕</button>
          </div>

          {/* Main Metrics */}
          <div className="results-grid">
            {/* Vehicle Count */}
            <div className="result-card primary">
              <div className="result-icon">🚗</div>
              <h4>Total Vehicles</h4>
              <p className="result-value">{analysisResults.vehicle_counts?.total || 0}</p>
              <div className="vehicle-breakdown">
                <span className="breakdown-item">🚙 Cars: {analysisResults.vehicle_counts?.car || 0}</span>
                <span className="breakdown-item">🏎️ Bikes: {analysisResults.vehicle_counts?.bike || 0}</span>
                <span className="breakdown-item">🚌 Buses: {analysisResults.vehicle_counts?.bus || 0}</span>
                <span className="breakdown-item">🚚 Trucks: {analysisResults.vehicle_counts?.truck || 0}</span>
              </div>
            </div>

            {/* Pedestrians */}
            <div className="result-card success">
              <div className="result-icon">👥</div>
              <h4>Pedestrians Detected</h4>
              <p className="result-value">{analysisResults.vehicle_counts?.pedestrian || 0}</p>
              <p className="result-detail">
                Safety Level: <strong>{analysisResults.pedestrian_safety_level || 'Normal'}</strong>
              </p>
            </div>

            {/* Congestion Level */}
            <div className="result-card warning">
              <div className="result-icon">🚦</div>
              <h4>Congestion Level</h4>
              <p className="result-value">{analysisResults.congestion_level || 'Normal'}</p>
              <p className="result-detail">
                Density: <strong>{analysisResults.density_percentage?.toFixed(1)}%</strong>
              </p>
            </div>

            {/* Average Speed */}
            <div className="result-card info">
              <div className="result-icon">⚡</div>
              <h4>Avg Speed</h4>
              <p className="result-value">{analysisResults.average_speed || 'N/A'} km/h</p>
              <p className="result-detail">
                Traffic Flow: <strong>{analysisResults.traffic_flow || 'Moderate'}</strong>
              </p>
            </div>

            {/* Ambulance Detection */}
            <div className="result-card emergency">
              <div className="result-icon">🚑</div>
              <h4>Emergency Vehicles</h4>
              <p className="result-value">{analysisResults.vehicle_counts?.ambulance || 0}</p>
              <p className="result-detail">
                Status: {(analysisResults.vehicle_counts?.ambulance || 0) > 0 ? '⚠️ Detected' : '✓ None'}
              </p>
            </div>

            {/* Analysis Confidence */}
            <div className="result-card neutral">
              <div className="result-icon">🎯</div>
              <h4>Detection Confidence</h4>
              <p className="result-value">{(analysisResults.detection_confidence || 0.85 * 100).toFixed(1)}%</p>
              <p className="result-detail">
                Model: YOLOv8 Nano
              </p>
            </div>
          </div>

          {/* Blockchain Verification */}
          {blockchainStatus && (
            <div className={`blockchain-status-card ${blockchainStatus.includes('✅') ? 'success' : blockchainStatus.includes('⏳') ? 'pending' : 'error'}`}>
              <div className="blockchain-header">
                <span className="blockchain-icon">🔐</span>
                <h4>Blockchain Verification</h4>
              </div>
              <pre className="blockchain-message">{blockchainStatus}</pre>
              {analysisResults.blockchain_hash && (
                <p className="blockchain-hash">
                  <strong>Block Hash:</strong> <code>{analysisResults.blockchain_hash}</code>
                </p>
              )}
            </div>
          )}

          {/* Lane Analysis */}
          {analysisResults.lane_analytics && Object.keys(analysisResults.lane_analytics).length > 0 && (
            <div className="lane-analysis-section">
              <h4>📊 Lane-by-Lane Analysis</h4>
              <div className="lanes-grid">
                {Object.entries(analysisResults.lane_analytics).map(([laneId, laneData]) => (
                  <div key={laneId} className="lane-card">
                    <h5>{laneData.lane_name || `Lane ${laneId}`}</h5>
                    <div className="lane-metrics">
                      <div className="metric">
                        <span className="metric-label">Vehicles:</span>
                        <span className="metric-value">{laneData.vehicle_count || 0}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Density:</span>
                        <span className="metric-value">{laneData.density_percent?.toFixed(1)}%</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Status:</span>
                        <span className={`traffic-level ${laneData.traffic_level?.toLowerCase()}`}>
                          {laneData.traffic_level || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="analysis-summary">
            <h4>📋 Analysis Summary</h4>
            <p className="summary-text">
              {analysisResults.summary || 
                `Traffic analysis complete. Detected ${analysisResults.vehicle_counts?.total || 0} vehicles and ${analysisResults.vehicle_counts?.pedestrian || 0} pedestrians. Current congestion level: ${analysisResults.congestion_level || 'Normal'}.`}
            </p>
          </div>

          <button className="analyze-another-btn" onClick={clearResults}>
            📹 Analyze Another Video
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
