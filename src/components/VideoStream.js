import React, { useEffect, useRef, useState } from 'react';
import './VideoStream.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001/api';

const VideoStream = ({ cameraId, onToggle }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [timestamp, setTimestamp] = useState(new Date());

  // Check camera status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/video/status/${cameraId}`);
        const data = await response.json();
        setStatus(data);
        console.log(`Camera ${cameraId} status:`, data);
      } catch (err) {
        console.error('Status check failed:', err);
      }
    };

    if (cameraId) {
      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [cameraId]);

  // Update timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cameraId || !isVisible) return;

    const container = videoRef.current;
    if (!container) return;

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.maxHeight = '600px';
    canvas.style.borderRadius = '8px';
    canvas.style.display = 'block';
    canvas.style.backgroundColor = '#000';

    const ctx = canvas.getContext('2d');
    let isActive = true;
    const streamUrl = `${API_BASE_URL}/video/stream/${cameraId}`;

    const loadMJPEG = async () => {
      try {
        const response = await fetch(streamUrl);
        
        if (!response.ok) {
          throw new Error(`Stream error: ${response.status}`);
        }

        const reader = response.body.getReader();
        let buffer = new Uint8Array(0);
        let frameLoaded = false;

        while (isActive) {
          const { done, value } = await reader.read();
          
          if (done) break;

          // Append to buffer
          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;

          // Find JPEG markers: FFD8 (start) and FFD9 (end)
          let startIdx = -1;
          let endIdx = -1;

          for (let i = 0; i < buffer.length - 1; i++) {
            if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
              startIdx = i;
            }
            if (startIdx !== -1 && buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
              endIdx = i + 1;
              break;
            }
          }

          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            try {
              // Extract JPEG data
              const jpegData = buffer.slice(startIdx, endIdx + 1);
              
              // Create blob and display
              const blob = new Blob([jpegData], { type: 'image/jpeg' });
              const imgUrl = URL.createObjectURL(blob);
              const img = new Image();

              img.onload = () => {
                if (isActive && ctx) {
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  
                  if (!frameLoaded) {
                    frameLoaded = true;
                    setIsLoading(false);
                    setError(null);
                    setRetryCount(0);
                    console.log('✅ Video stream connected!');
                  }
                }
                URL.revokeObjectURL(imgUrl);
              };

              img.onerror = () => {
                URL.revokeObjectURL(imgUrl);
              };

              img.src = imgUrl;

              // Remove processed frame
              buffer = buffer.slice(endIdx + 1);
            } catch (e) {
              console.debug('Frame error:', e);
              buffer = buffer.slice(startIdx + 1);
            }
          }
        }
      } catch (err) {
        console.error('❌ Stream error:', err.message);
        
        if (retryCount < 5) {
          console.log(`⚠️  Retrying... (${retryCount + 1}/5)`);
          setRetryCount(retryCount + 1);
          setTimeout(loadMJPEG, 2000);
        } else {
          setError('Cannot connect to video stream');
          setIsLoading(false);
        }
      }
    };

    container.appendChild(canvas);
    loadMJPEG();

    return () => {
      isActive = false;
    };

  }, [cameraId, isVisible, retryCount]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    if (onToggle) {
      onToggle(!isVisible);
    }
  };

  return (
    <div className="video-stream-wrapper">
      <div className="video-controls">
        <button 
          className="toggle-camera-btn"
          onClick={toggleVisibility}
          title={isVisible ? "Hide camera feed" : "Show camera feed"}
        >
          {isVisible ? '👁️ Hide Feed' : '👁️ Show Feed'}
        </button>
      </div>

      {isVisible && (
        <>
          {isLoading && <div className="video-loading">⏳ Connecting to camera...</div>}
          {error && <div className="video-error">⚠️ {error}</div>}
          <div className="video-stream-container">
            <div 
              ref={videoRef}
              className="video-stream"
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000'
              }}
            />
          </div>
          <div className="video-info">
            <span className="camera-id">📹 {cameraId}</span>
            <span className={`stream-status ${isLoading ? 'loading' : error ? 'error' : 'live'}`}>
              {isLoading ? '⏳' : error ? '🔴' : '🟢'} 
              {isLoading ? ' Connecting' : error ? ' Error' : ' Live'}
            </span>
            <span className="video-timestamp">
              🕒 {timestamp.toLocaleTimeString('en-US', { hour12: false })}
            </span>
            {status && !error && (
              <span className="camera-details">
                {status.resolution} @ {status.fps} FPS | Frames: {status.frame_count}
              </span>
            )}
          </div>
        </>
      )}

      {!isVisible && (
        <div className="video-hidden-message">
          <div className="hidden-icon">📹</div>
          <p>Camera feed is hidden. Click "Show Feed" to view.</p>
        </div>
      )}
    </div>
  );
};

export default VideoStream;
