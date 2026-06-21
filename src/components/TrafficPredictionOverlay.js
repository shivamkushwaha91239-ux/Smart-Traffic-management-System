import React, { useEffect, useState } from 'react';
import './TrafficPredictionOverlay.css';

const TrafficPredictionOverlay = ({ detectionData, visible = true }) => {
  const [predictions, setPredictions] = useState({
    nextSignalChange: '45s',
    predictedFlow: 'Moderate',
    bottleneck: 'Lane 2',
    recommendation: 'Increase green time for Lane 1'
  });

  useEffect(() => {
    if (detectionData) {
      // Calculate predictions based on detection data
      const total = Object.values(detectionData.vehicle_counts || {}).reduce((a, b) => a + b, 0);
      
      let flowPrediction = 'Light';
      let signalTime = 35;
      let bottleneck = 'None';
      let recommendation = 'System running optimally';
      
      if (total > 30) {
        flowPrediction = 'Heavy';
        signalTime = 60;
        bottleneck = 'Multiple lanes';
        recommendation = 'Activate emergency signal management';
      } else if (total > 20) {
        flowPrediction = 'Moderate-High';
        signalTime = 50;
        bottleneck = 'Lane 2 & 3';
        recommendation = 'Adjust signal timing for affected lanes';
      } else if (total > 10) {
        flowPrediction = 'Moderate';
        signalTime = 40;
        bottleneck = 'Lane 2';
        recommendation = 'Monitor traffic trends';
      }
      
      setPredictions({
        nextSignalChange: `${signalTime}s`,
        predictedFlow: flowPrediction,
        bottleneck,
        recommendation
      });
    }
  }, [detectionData]);

  if (!visible) return null;

  return (
    <div className="prediction-overlay">
      {/* Traffic Flow Indicator */}
      <div className="prediction-card traffic-flow">
        <div className="card-icon">🔮</div>
        <h4>Predicted Flow</h4>
        <p className="prediction-value">{predictions.predictedFlow}</p>
        <div className="flow-meter">
          <div className="flow-bar"></div>
        </div>
      </div>

      {/* Next Signal Change */}
      <div className="prediction-card signal-change">
        <div className="card-icon">⏱️</div>
        <h4>Signal Change In</h4>
        <p className="prediction-value">{predictions.nextSignalChange}</p>
        <p className="card-detail">Countdown to next phase</p>
      </div>

      {/* Bottleneck Detection */}
      <div className="prediction-card bottleneck">
        <div className="card-icon">⚠️</div>
        <h4>Bottleneck</h4>
        <p className="prediction-value">{predictions.bottleneck}</p>
        <p className="card-detail">Potential congestion point</p>
      </div>

      {/* AI Recommendation */}
      <div className="prediction-card recommendation">
        <div className="card-icon">💡</div>
        <h4>AI Recommendation</h4>
        <p className="recommendation-text">{predictions.recommendation}</p>
      </div>
    </div>
  );
};

export default TrafficPredictionOverlay;
