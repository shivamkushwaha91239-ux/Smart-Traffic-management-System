import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import './TrafficPrediction.css';

const TrafficPrediction = () => {
  const API_BASE_URL = 'http://localhost:8001';

  const [selectedJunction, setSelectedJunction] = useState('Junction-01');
  const [predictions, setPredictions] = useState(null);
  const [currentTraffic, setCurrentTraffic] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('hourly');
  const [refreshTime, setRefreshTime] = useState(new Date());

  const junctions = [
    { id: 'Junction-01', name: 'Charbagh Junction' },
    { id: 'Junction-02', name: 'Kaiserbagh Junction' },
    { id: 'Junction-03', name: 'Lucknow Central Junction' },
  ];

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      fetchAllData();
      setRefreshTime(new Date());
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedJunction]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current traffic
      const currentResponse = await axios.get(`${API_BASE_URL}/api/traffic/overview`);
      if (currentResponse.data.data?.junctions) {
        const junctionData = currentResponse.data.data.junctions.find(
          j => j.id === selectedJunction
        );
        setCurrentTraffic(junctionData);
      }

      // Fetch predictions
      const predictionsResponse = await axios.get(
        `${API_BASE_URL}/api/predictions/traffic/${selectedJunction}`
      );
      setPredictions(predictionsResponse.data.data);

      // Extract hourly and daily patterns
      if (predictionsResponse.data.data?.hourly_pattern) {
        const hourlyPattern = predictionsResponse.data.data.hourly_pattern;
        const hourlyArray = Object.entries(hourlyPattern).map(([hour, data]) => ({
          time: `${String(hour).padStart(2, '0')}:00`,
          traffic: Math.round(data.density || 0),
          label: data.traffic_level,
          confidence: data.confidence,
        }));
        setHourlyData(hourlyArray);
      }

      if (predictionsResponse.data.data?.daily_pattern) {
        const dailyPattern = predictionsResponse.data.data.daily_pattern;
        const dailyArray = Object.entries(dailyPattern).map(([day, data]) => ({
          time: day,
          traffic: Math.round(data.density || 0),
          label: data.traffic_level,
          confidence: data.confidence,
        }));
        setDailyData(dailyArray);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch predictions. Using sample data.');
      // Fallback to mock data
      setHourlyData(generateMockHourlyData());
      setDailyData(generateMockDailyData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockHourlyData = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push({
        time: `${String(i).padStart(2, '0')}:00`,
        traffic: Math.round(Math.random() * 80 + 20),
        label: 'Moderate',
        confidence: 0.87,
      });
    }
    return hours;
  };

  const generateMockDailyData = () => {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days.map(day => ({
      time: day,
      traffic: Math.round(Math.random() * 80 + 20),
      label: 'Moderate',
      confidence: 0.87,
    }));
  };

  const getTrafficColor = (traffic) => {
    if (traffic > 75) return '#ef4444';
    if (traffic > 50) return '#f59e0b';
    if (traffic > 25) return '#eab308';
    return '#10b981';
  };

  const getTrafficLevel = (traffic) => {
    if (traffic > 75) return 'Critical';
    if (traffic > 50) return 'Heavy';
    if (traffic > 25) return 'Moderate';
    return 'Light';
  };

  const styles = {
    container: {
      padding: '20px',
      background: '#f8fafc',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '25px',
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
    controlsContainer: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '25px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '6px',
      textTransform: 'uppercase',
    },
    select: {
      padding: '10px 12px',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#1e293b',
      background: '#f8fafc',
      cursor: 'pointer',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
    },
    button: (isActive) => ({
      padding: '10px 15px',
      borderRadius: '8px',
      border: isActive ? '2px solid #3b82f6' : '1px solid #cbd5e1',
      background: isActive ? '#eff6ff' : '#f8fafc',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: isActive ? '600' : '500',
      color: isActive ? '#3b82f6' : '#64748b',
      transition: 'all 0.3s ease',
    }),
    chartContainer: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '25px',
      marginBottom: '25px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
    },
    chartTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#1e293b',
    },
    chart: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: '300px',
      gap: '10px',
      paddingBottom: '20px',
      borderBottom: '1px solid #e2e8f0',
      overflowX: 'auto',
    },
    barContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: '0 0 auto',
      gap: '8px',
      minWidth: '40px',
    },
    bar: (height, color) => ({
      width: '35px',
      height: `${(height / 100) * 250}px`,
      background: color,
      borderRadius: '8px 8px 0 0',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'relative',
      minHeight: '5px',
    }),
    barLabel: {
      fontSize: '11px',
      color: '#64748b',
      textAlign: 'center',
      fontWeight: '500',
    },
    barValue: {
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#1e293b',
      marginTop: '4px',
    },
    legend: {
      display: 'flex',
      gap: '20px',
      marginTop: '20px',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: '#64748b',
    },
    legendColor: (color) => ({
      width: '16px',
      height: '16px',
      borderRadius: '4px',
      background: color,
    }),
    insightsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
    },
    insightCard: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '18px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    insightTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '8px',
    },
    insightText: {
      fontSize: '13px',
      color: '#64748b',
      lineHeight: '1.5',
    },
    peakHours: {
      background: '#fef3c7',
      borderRadius: '8px',
      padding: '12px',
      marginTop: '10px',
      fontSize: '13px',
      color: '#92400e',
      fontWeight: '500',
    },
    currentTrafficBox: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '20px',
      color: '#ffffff',
      marginBottom: '25px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    },
    trafficMetric: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '15px',
      marginTop: '15px',
    },
    metricBox: {
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '12px',
      backdropFilter: 'blur(10px)',
    },
    metricLabel: {
      fontSize: '12px',
      opacity: 0.9,
      marginBottom: '5px',
    },
    metricValue: {
      fontSize: '24px',
      fontWeight: 'bold',
    },
    refreshInfo: {
      fontSize: '12px',
      color: '#94a3b8',
      marginTop: '15px',
      textAlign: 'right',
    },
  };

  const displayData = timeframe === 'hourly' ? hourlyData : dailyData;

  if (loading && !displayData) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📊 Traffic Prediction</h1>
          <p style={styles.subtitle}>AI-powered traffic forecasting</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          ⏳ Loading real-time predictions...
        </div>
      </div>
    );
  }

  const avgTraffic = Math.round(
    (displayData?.reduce((a, p) => a + p.traffic, 0) || 0) / (displayData?.length || 1)
  );
  const peakTraffic = Math.max(...(displayData?.map(p => p.traffic) || [0]));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Traffic Prediction & Forecasting</h1>
        <p style={styles.subtitle}>Real-time predictions based on live data and historical patterns</p>
      </div>

      {/* Current Traffic Status */}
      {currentTraffic && (
        <div style={styles.currentTrafficBox}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
            📍 {currentTraffic.name}
          </h3>
          <div style={styles.trafficMetric}>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Current Density</div>
              <div style={styles.metricValue}>{Math.round(currentTraffic.density || 0)}%</div>
            </div>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Traffic Level</div>
              <div style={styles.metricValue}>{currentTraffic.traffic_level || 'N/A'}</div>
            </div>
            <div style={styles.metricBox}>
              <div style={styles.metricLabel}>Active Vehicles</div>
              <div style={styles.metricValue}>{currentTraffic.vehicles || 0}</div>
            </div>
          </div>
          <div style={styles.refreshInfo}>
            Last updated: {refreshTime.toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={styles.controlsContainer}>
        <div style={styles.formGroup}>
          <label style={styles.label}>📍 Select Junction</label>
          <select
            value={selectedJunction}
            onChange={e => setSelectedJunction(e.target.value)}
            style={styles.select}
          >
            {junctions.map(j => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>⏰ Time Frame</label>
          <div style={styles.buttonGroup}>
            {['hourly', 'daily'].map(tf => (
              <button
                key={tf}
                style={styles.button(timeframe === tf)}
                onClick={() => setTimeframe(tf)}
              >
                {tf === 'hourly' ? '⏱️ Hourly' : '📅 Daily'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 15px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          ℹ️ {error}
        </div>
      )}

      {/* Chart */}
      {displayData && displayData.length > 0 && (
        <div style={styles.chartContainer}>
          <h3 style={styles.chartTitle}>
            {timeframe === 'hourly' ? '⏱️ Hourly Traffic Prediction (24H)' : '📅 Weekly Traffic Forecast'}
          </h3>

          <div style={styles.chart}>
            {displayData.map((pred, idx) => (
              <div key={idx} style={styles.barContainer}>
                <div
                  style={styles.bar(pred.traffic, getTrafficColor(pred.traffic))}
                  title={`${pred.label}: ${pred.traffic}%`}
                />
                <div style={styles.barLabel}>{pred.time}</div>
              </div>
            ))}
          </div>

          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={styles.legendColor('#10b981')} />
              <span>Light (0-25%)</span>
            </div>
            <div style={styles.legendItem}>
              <div style={styles.legendColor('#eab308')} />
              <span>Moderate (25-50%)</span>
            </div>
            <div style={styles.legendItem}>
              <div style={styles.legendColor('#f59e0b')} />
              <span>Heavy (50-75%)</span>
            </div>
            <div style={styles.legendItem}>
              <div style={styles.legendColor('#ef4444')} />
              <span>Critical (75-100%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', marginBottom: '15px' }}>
        💡 Predictive Insights
      </h3>
      <div style={styles.insightsGrid}>
        <div style={styles.insightCard}>
          <div style={styles.insightTitle}>📈 Peak Traffic Time</div>
          <div style={styles.insightText}>
            Highest congestion: <strong>{peakTraffic}%</strong>
          </div>
          {predictions?.peak_hours && predictions.peak_hours.length > 0 && (
            <div style={styles.peakHours}>
              ⚠️ Peak hours: {predictions.peak_hours
                .slice(0, 2)
                .map(h => h.time)
                .join(', ')}
            </div>
          )}
        </div>

        <div style={styles.insightCard}>
          <div style={styles.insightTitle}>🎯 Best Travel Time</div>
          {predictions?.best_travel_time && (
            <>
              <div style={styles.insightText}>
                Lowest traffic: <strong>{predictions.best_travel_time.time}</strong>
              </div>
              <div style={{...styles.peakHours, background: '#dcfce7', color: '#166534' }}>
                ✅ Density at this time: {Math.round(predictions.best_travel_time.density)}%
              </div>
            </>
          )}
        </div>

        <div style={styles.insightCard}>
          <div style={styles.insightTitle}>📊 Average Traffic</div>
          <div style={styles.insightText}>
            Average density: <strong>{avgTraffic}%</strong>
          </div>
          <div style={styles.peakHours}>
            📌 Expected traffic level: {getTrafficLevel(avgTraffic)}
          </div>
        </div>

        <div style={styles.insightCard}>
          <div style={styles.insightTitle}>🔮 AI Prediction Confidence</div>
          <div style={styles.insightText}>
            Confidence Score: <strong>87%</strong>
          </div>
          <div style={styles.peakHours}>
            ✨ Based on 7 days of historical data
          </div>
        </div>

        <div style={styles.insightCard}>
          <div style={styles.insightTitle}>🛣️ Alternative Routes</div>
          <div style={styles.insightText}>
            During peak hours, consider alternate routes to reduce travel time.
          </div>
          <div style={styles.peakHours}>
            💡 Check Route Planner for alternatives
          </div>
        </div>

        <div style={styles.insightCard}>
          <div style={styles.insightTitle}>🔄 Live Satellite Maps</div>
          <div style={styles.insightText}>
            View real-time traffic on satellite maps with live vehicle tracking.
          </div>
          <div style={styles.peakHours}>
            🗺️ Go to Traffic Maps to see live updates
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficPrediction;
