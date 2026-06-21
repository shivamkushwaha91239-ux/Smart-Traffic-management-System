import React, { useState, useRef } from 'react';
import axios from 'axios';
import './ROIEditor.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const LANE_NAMES = {
  'A': 'North-Bound',
  'B': 'South-Bound',
  'C': 'East-Bound',
  'D': 'West-Bound'
};

const ROIEditor = ({ junction, rois, onROIsUpdated }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [mode, setMode] = useState('view'); // 'view' or 'edit'
  const [selectedROI, setSelectedROI] = useState(null);
  const [points, setPoints] = useState([]);
  const [laneId, setLaneId] = useState('');
  const [laneName, setLaneName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Draw ROIs on canvas
  const drawROIs = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current.src) return;

    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw existing ROIs
      rois.forEach((roi, index) => {
        ctx.strokeStyle = '#00FF00';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.lineWidth = 2;

        if (roi.points && roi.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(roi.points[0][0], roi.points[0][1]);
          for (let i = 1; i < roi.points.length; i++) {
            ctx.lineTo(roi.points[i][0], roi.points[i][1]);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw label
          ctx.fillStyle = '#00FF00';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(roi.roi_id, roi.points[0][0] + 5, roi.points[0][1] + 20);
        }
      });

      // Draw current editing points
      if (mode === 'edit') {
        ctx.fillStyle = '#FF0000';
        points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Draw lines between points
        if (points.length > 1) {
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(points[0][0], points[0][1]);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };

    img.src = `${API_BASE_URL}/video/snapshot/${junction}`;
  };

  // Handle canvas click to add points
  const handleCanvasClick = (e) => {
    if (mode !== 'edit' || points.length >= 4) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints([...points, [x, y]]);
  };

  // Create new ROI
  const handleCreateROI = async () => {
    if (points.length < 4) {
      alert('Please select 4 points for the ROI');
      return;
    }

    if (!laneId || !laneName) {
      alert('Please enter lane ID and name');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/roi/add/${junction}`, {
        roi_id: laneId,
        lane_name: laneName,
        points: points,
        description: description
      });

      // Reset form
      setPoints([]);
      setLaneId('');
      setLaneName('');
      setDescription('');
      setMode('view');

      // Refresh ROIs
      onROIsUpdated();
    } catch (error) {
      alert('Failed to create ROI: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete ROI
  const handleDeleteROI = async (roiId) => {
    if (!window.confirm(`Delete ROI ${roiId}?`)) return;

    try {
      await axios.delete(`${API_BASE_URL}/roi/delete/${junction}/${roiId}`);
      onROIsUpdated();
    } catch (error) {
      alert('Failed to delete ROI: ' + error.message);
    }
  };

  // Reset editing
  const handleReset = () => {
    setPoints([]);
    setMode('view');
    setLaneId('');
    setLaneName('');
    setDescription('');
  };

  React.useEffect(() => {
    drawROIs();
  }, [rois, mode, points, junction]);

  return (
    <div className="roi-editor">
      <h1>ROI Editor - {junction}</h1>

      <div className="editor-container">
        {/* Canvas */}
        <div className="canvas-section">
          <h2>Lane Editor Canvas</h2>
          <p className="instructions">
            {mode === 'view'
              ? 'Click "New ROI" to create a lane, or select an existing lane'
              : `Click canvas to place points (${points.length}/4)`}
          </p>
          <canvas
            ref={canvasRef}
            className="roi-canvas"
            onClick={handleCanvasClick}
          />
          <img
            ref={imageRef}
            style={{ display: 'none' }}
            alt="Reference"
          />
        </div>

        {/* Controls */}
        <div className="control-section">
          {mode === 'view' ? (
            <>
              <div className="roi-list-section">
                <h3>Configured Lanes</h3>
                {rois.length === 0 ? (
                  <p className="empty-list">No lanes configured</p>
                ) : (
                  <div className="roi-list">
                    {rois.map((roi) => (
                      <div key={roi.roi_id} className="roi-item">
                        <div className="roi-info">
                          <strong>{roi.roi_id}</strong>
                          <p>{roi.lane_name}</p>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteROI(roi.roi_id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="new-roi-btn"
                onClick={() => setMode('edit')}
              >
                + New Lane (ROI)
              </button>
            </>
          ) : (
            <>
              <h3>Create New Lane</h3>

              <div className="form-group">
                <label>Lane ID</label>
                <select
                  value={laneId}
                  onChange={(e) => setLaneId(e.target.value)}
                >
                  <option value="">Select Lane</option>
                  <option value="Lane-A">Lane A (North-Bound)</option>
                  <option value="Lane-B">Lane B (South-Bound)</option>
                  <option value="Lane-C">Lane C (East-Bound)</option>
                  <option value="Lane-D">Lane D (West-Bound)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Lane Name</label>
                <input
                  type="text"
                  value={laneName}
                  onChange={(e) => setLaneName(e.target.value)}
                  placeholder="e.g., North-Bound, Main Street"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows="3"
                />
              </div>

              <div className="points-display">
                <h4>Selected Points: {points.length}/4</h4>
                {points.length > 0 && (
                  <div className="points-list">
                    {points.map((point, i) => (
                      <div key={i} className="point-item">
                        Point {i + 1}: ({Math.round(point[0])}, {Math.round(point[1])})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="button-group">
                <button
                  className="create-btn"
                  onClick={handleCreateROI}
                  disabled={saving || points.length < 4}
                >
                  {saving ? 'Creating...' : '✓ Create Lane'}
                </button>
                <button
                  className="cancel-btn"
                  onClick={handleReset}
                >
                  ✕ Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ROIEditor;
