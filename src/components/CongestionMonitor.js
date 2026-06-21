import React, { useEffect, useState } from 'react';
import './CongestionMonitor.css';

const CongestionMonitor = ({ detectionData }) => {
  const [metrics, setMetrics] = useState({
    currentCongestion: 'Low',
    avgDensity: 25,
    peakTime: '8:30 AM',
    trend: 'stable',
    alertLevel: 'green'
  });

  const [historyData, setHistoryData] = useState([
    { time: '12:00 PM', density: 30 },
    { time: '12:15 PM', density: 35 },
    { time: '12:30 PM', density: 42 },
    { time: '12:45 PM', density: 38 },
    { time: '1:00 PM', density: 45 }
  ]);

  useEffect(() => {
    if (detectionData) {
      const total = Object.values(detectionData.vehicle_counts || {}).reduce((a, b) => a + b, 0);
      
      let congestion = 'Low';
      let density = 25;
      let trend = 'stable';
      let alertLevel = 'green';
      
      if (total > 35) {
        congestion = 'Critical';
        density = 90;
        alertLevel = 'red';
        trend = 'increasing';
      } else if (total > 25) {
        congestion = 'High';
        density = 70;
        alertLevel = 'orange';
        trend = 'increasing';
      } else if (total > 15) {
        congestion = 'Moderate';
        density = 50;
        alertLevel = 'yellow';
        trend = 'stable';
      }
      
      setMetrics({
        currentCongestion: congestion,
        avgDensity: density,
        peakTime: '12:45 PM',
        trend,
        alertLevel
      });

      // Update history
      setHistoryData(prev => [
        ...prev.slice(1),
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          density: density
        }
      ]);
    }
  }, [detectionData]);

  const getTrendIcon = () => {
    if (metrics.trend === 'increasing') return '📈';
    if (metrics.trend === 'decreasing') return '📉';
    return '➡️';
  };

  return (
    <div className="congestion-monitor">
      <h3>📊 Congestion Analysis</h3>
      
      <div className="monitor-grid">
        {/* Current Status */}
        <div className={`monitor-card status-card alert-${metrics.alertLevel}`}>
          <h4>Current Status</h4>
          <div className="status-display">
            <div className={`status-indicator ${metrics.alertLevel}`}></div>
            <p className="status-value">{metrics.currentCongestion}</p>
          </div>
          <p className="status-subtext">
            {metrics.alertLevel === 'red' ? '🚨 Action Required' : 
             metrics.alertLevel === 'orange' ? '⚠️ Monitor Closely' : 
             '✓ Normal Operation'}
          </p>
        </div>

        {/* Density Meter */}
        <div className="monitor-card density-card">
          <h4>Road Density</h4>
          <div className="density-meter">
            <div className="density-bar">
              <div 
                className="density-fill"
                style={{ width: `${metrics.avgDensity}%` }}
              ></div>
            </div>
            <p className="density-text">{metrics.avgDensity}%</p>
          </div>
          <p className="density-label">
            {metrics.avgDensity > 70 ? 'Very High' :
             metrics.avgDensity > 50 ? 'High' :
             metrics.avgDensity > 25 ? 'Moderate' :
             'Low'}
          </p>
        </div>

        {/* Trend */}
        <div className="monitor-card trend-card">
          <h4>Traffic Trend</h4>
          <div className="trend-display">
            <span className="trend-icon">{getTrendIcon()}</span>
            <p className="trend-value">{metrics.trend}</p>
          </div>
          <p className="trend-label">Over last 15 minutes</p>
        </div>

        {/* Peak Time */}
        <div className="monitor-card peak-card">
          <h4>Peak Time Today</h4>
          <p className="peak-value">{metrics.peakTime}</p>
          <p className="peak-label">Highest congestion</p>
        </div>
      </div>

      {/* Congestion Timeline */}
      <div className="congestion-timeline">
        <h4>Timeline (Last 1 Hour)</h4>
        <div className="timeline-chart">
          {historyData.map((point, index) => (
            <div key={index} className="timeline-point">
              <div className="point-bar">
                <div 
                  className="point-fill"
                  style={{ 
                    height: `${(point.density / 100) * 60}px`,
                    backgroundColor: point.density > 70 ? '#ff4444' :
                                    point.density > 50 ? '#ffc107' :
                                    '#4CAF50'
                  }}
                ></div>
              </div>
              <p className="point-time">{point.time}</p>
              <p className="point-value">{point.density}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations">
        <h4>🎯 Recommendations</h4>
        <ul className="recommendation-list">
          {metrics.alertLevel === 'red' ? (
            <>
              <li>Activate emergency signal management</li>
              <li>Divert traffic to alternate routes</li>
              <li>Increase police presence for traffic control</li>
              <li>Issue real-time alerts to commuters</li>
            </>
          ) : metrics.alertLevel === 'orange' ? (
            <>
              <li>Increase green light duration for main lanes</li>
              <li>Monitor pedestrian crossings closely</li>
              <li>Prepare alternate routes for quick deployment</li>
            </>
          ) : (
            <>
              <li>System operating within normal parameters</li>
              <li>Continue standard signal timing</li>
              <li>Monitor for upcoming peak hours</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CongestionMonitor;
