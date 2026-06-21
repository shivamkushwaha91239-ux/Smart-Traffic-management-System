import React, { useEffect, useRef, useState } from 'react';
import './VideoStream.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001/api';

const VideoStream = ({ cameraId }) => {
  const imgRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  // Check camera status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/video/status/${cameraId}`);
        const data = await response.json();
        setStatus(data);
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

  useEffect(() => {
    if (!cameraId || !imgRef.current) return;

    const streamUrl = `${API_BASE_URL}/video/stream/${cameraId}`;
    console.log('Loading MJPEG stream from:', streamUrl);

    // Direct MJPEG streaming via img tag (simplest and most reliable)
    imgRef.current.src = streamUrl;
    
    imgRef.current.onload = () => {
      setIsLoading(false);
      setError(null);
      console.log('Stream loaded successfully');
    };

    imgRef.current.onerror = () => {
      setError('Failed to load video stream');
      setIsLoading(false);
      console.error('Stream load error');
    };

  }, [cameraId]);

  return (
    <div className="video-stream-wrapper">
      {isLoading && <div className="video-loading">⏳ Loading camera stream...</div>}
      {error && <div className="video-error">⚠️ {error}</div>}
      <img
        ref={imgRef}
        className="video-stream"
        alt="Live Video Stream"
        style={{ 
          display: isLoading ? 'none' : 'block',
          width: '100%',
          height: 'auto',
          maxHeight: '600px'
        }}
      />
      {status && (
        <div className="video-status">
          <span>Frames: {status.frame_count || 0}</span>
          {status.resolution && <span> | {status.resolution}</span>}
        </div>
      )}
    </div>
  );
};

export default VideoStream;
