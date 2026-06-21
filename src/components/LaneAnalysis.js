import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './LaneAnalysis.css';

const LANE_NAMES = {
  'A': 'North-Bound',
  'B': 'South-Bound',
  'C': 'East-Bound',
  'D': 'West-Bound'
};

const LANE_COLORS = {
  'A': '#00FF00',
  'B': '#FF0000',
  'C': '#0000FF',
  'D': '#FFFF00'
};

const getTrafficColor = (level) => {
  switch (level) {
    case 'LIGHT':
      return '#4CAF50';
    case 'MODERATE':
      return '#FFC107';
    case 'HEAVY':
      return '#F44336';
    default:
      return '#999';
  }
};

const LaneAnalysis = ({ laneAnalytics }) => {
  const theme = useTheme();
  const lanes = Object.entries(laneAnalytics).map(([laneId, data]) => ({
    id: laneId,
    name: LANE_NAMES[laneId] || `Lane ${laneId}`,
    ...data
  }));

  if (lanes.length === 0) {
    return (
      <div className="lane-analysis-empty" style={{ color: theme.colors.text }}>
        <p>Initializing lane analysis...</p>
      </div>
    );
  }

  return (
    <div className="lane-analysis" style={{ color: theme.colors.text }}>
      {lanes.map((lane) => (
        <div key={lane.id} className="lane-card" style={{
          background: theme.colors.surface,
          border: `2px solid ${theme.colors.border}`,
          color: theme.colors.text
        }}>
          <div className="lane-header">
            <div 
              className="lane-color-indicator"
              style={{ backgroundColor: LANE_COLORS[lane.id] }}
            ></div>
            <h3>{lane.name}</h3>
          </div>

          <div className="lane-metrics">
            {/* Vehicle Count */}
            <div className="metric-item">
              <span className="metric-label">Vehicles</span>
              <span className="metric-value">{lane.vehicle_count || 0}</span>
            </div>

            {/* Density Bar */}
            <div className="metric-item">
              <span className="metric-label">Density</span>
              <div className="density-bar">
                <div
                  className="density-fill"
                  style={{
                    width: `${Math.min(100, lane.density_percent || 0)}%`,
                    backgroundColor: getTrafficColor(lane.traffic_level)
                  }}
                ></div>
              </div>
              <span className="metric-value">{(lane.density_percent || 0).toFixed(1)}%</span>
            </div>

            {/* Traffic Level */}
            <div className="metric-item">
              <span className="metric-label">Level</span>
              <span
                className={`traffic-level level-${(lane.traffic_level || 'UNKNOWN').toLowerCase()}`}
              >
                {lane.traffic_level || 'UNKNOWN'}
              </span>
            </div>

            {/* Suggested Green Time */}
            <div className="metric-item">
              <span className="metric-label">Suggested Green</span>
              <span className="metric-value">{lane.green_time || 0}s</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LaneAnalysis;
