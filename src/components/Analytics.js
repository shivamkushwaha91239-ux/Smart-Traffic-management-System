import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const Analytics = ({ junction }) => {
  const [trafficData, setTrafficData] = useState([]);
  const [efficiency, setEfficiency] = useState(null);
  const [timeRange, setTimeRange] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch traffic analytics
        const trafficResponse = await axios.get(
          `${API_BASE_URL}/analytics/traffic/${junction}?hours=${timeRange}`
        );
        setTrafficData(trafficResponse.data.records || []);

        // Fetch efficiency metrics
        const efficiencyResponse = await axios.get(
          `${API_BASE_URL}/analytics/efficiency?hours=${timeRange}`
        );
        setEfficiency(efficiencyResponse.data.metrics);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [junction, timeRange]);

  // Prepare chart data
  const chartData = {
    labels: trafficData.map((record) => {
      const date = new Date(record.timestamp);
      return date.toLocaleTimeString();
    }),
    datasets: [
      {
        label: 'Cars',
        data: trafficData.map((record) => record.car_count || 0),
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Bikes',
        data: trafficData.map((record) => record.bike_count || 0),
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Buses',
        data: trafficData.map((record) => record.bus_count || 0),
        borderColor: '#45B7D1',
        backgroundColor: 'rgba(69, 183, 209, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Trucks',
        data: trafficData.map((record) => record.truck_count || 0),
        borderColor: '#F7B731',
        backgroundColor: 'rgba(247, 183, 49, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const densityChartData = {
    labels: trafficData.map((record) => {
      const date = new Date(record.timestamp);
      return date.toLocaleTimeString();
    }),
    datasets: [
      {
        label: 'Average Density %',
        data: trafficData.map((record) => (record.avg_density || 0).toFixed(1)),
        borderColor: '#FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        font: {
          size: 14,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#999',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#999',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics">
      <h1>Traffic Analytics - {junction}</h1>

      {/* Time Range Selector */}
      <div className="time-range-selector">
        <button
          className={timeRange === 1 ? 'active' : ''}
          onClick={() => setTimeRange(1)}
        >
          1 Hour
        </button>
        <button
          className={timeRange === 3 ? 'active' : ''}
          onClick={() => setTimeRange(3)}
        >
          3 Hours
        </button>
        <button
          className={timeRange === 6 ? 'active' : ''}
          onClick={() => setTimeRange(6)}
        >
          6 Hours
        </button>
        <button
          className={timeRange === 24 ? 'active' : ''}
          onClick={() => setTimeRange(24)}
        >
          24 Hours
        </button>
      </div>

      {/* Efficiency Metrics */}
      {efficiency && (
        <div className="efficiency-metrics">
          <h2>System Efficiency</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Records</h3>
              <p className="metric-value">{efficiency.total_records || 0}</p>
            </div>
            <div className="metric-card">
              <h3>Average Density</h3>
              <p className="metric-value">
                {(efficiency.avg_density || 0).toFixed(1)}%
              </p>
            </div>
            <div className="metric-card">
              <h3>Peak Density</h3>
              <p className="metric-value">
                {(efficiency.peak_density || 0).toFixed(1)}%
              </p>
            </div>
            <div className="metric-card">
              <h3>Total Vehicles</h3>
              <p className="metric-value">{efficiency.total_vehicles || 0}</p>
            </div>
            <div className="metric-card">
              <h3>Emergency Events</h3>
              <p className="metric-value">{efficiency.emergency_events || 0}</p>
            </div>
            <div className="metric-card">
              <h3>Time Saved</h3>
              <p className="metric-value">
                {(efficiency.total_time_saved || 0).toFixed(0)} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-container">
        {/* Vehicle Count Chart */}
        <div className="chart-section">
          <h2>Vehicle Count Trends</h2>
          <div className="chart-wrapper">
            <Line
              data={chartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { display: true, text: 'Vehicle Counts Over Time' },
                },
              }}
            />
          </div>
        </div>

        {/* Density Chart */}
        <div className="chart-section">
          <h2>Traffic Density</h2>
          <div className="chart-wrapper">
            <Line
              data={densityChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { display: true, text: 'Average Density Over Time' },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-section">
        <h2>Detailed Records</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Cars</th>
                <th>Bikes</th>
                <th>Buses</th>
                <th>Trucks</th>
                <th>Density</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {trafficData.slice(0, 20).map((record, index) => (
                <tr key={index}>
                  <td>{new Date(record.timestamp).toLocaleTimeString()}</td>
                  <td>{record.car_count || 0}</td>
                  <td>{record.bike_count || 0}</td>
                  <td>{record.bus_count || 0}</td>
                  <td>{record.truck_count || 0}</td>
                  <td>{(record.avg_density || 0).toFixed(1)}%</td>
                  <td>
                    <span className={`signal-badge ${record.signal_state}`}>
                      {record.signal_state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
