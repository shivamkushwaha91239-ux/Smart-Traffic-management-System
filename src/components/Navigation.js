import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './Navigation.css';

const Navigation = ({ activeJunction, onJunctionChange, isConnected, vehicleCount }) => {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Status is LIVE when camera is connected/streaming, OFFLINE otherwise
  const isLive = isConnected;

  const navItems = [
    { label: '📊 Dashboard', path: '/', icon: '📊' },
    { label: '🗺️ Traffic Maps', path: '/maps', icon: '🗺️' },
    { label: '🛣️ Route Planner', path: '/routes', icon: '🛣️' },
    { label: '🚦 Signal Control', path: '/signals', icon: '🚦' },
    { label: '📈 Predictions', path: '/predictions', icon: '📈' },
    { label: '🎯 ROI Editor', path: '/roi-editor', icon: '🎯' },
    { label: '📊 Analytics', path: '/analytics', icon: '📊' },
  ];

  const navStyle = {
    background: theme.isDarkMode 
      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.99) 0%, rgba(15, 23, 42, 0.99) 100%)'
      : 'linear-gradient(135deg, rgba(248, 250, 252, 0.99) 0%, rgba(241, 245, 249, 0.99) 100%)',
    borderBottomColor: theme.isDarkMode ? 'rgba(0, 212, 255, 0.4)' : 'rgba(59, 130, 246, 0.3)',
  };

  const sidebarStyle = {
    background: theme.isDarkMode 
      ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
      : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    color: theme.colors.text,
  };

  const separatorStyle = {
    background: theme.isDarkMode 
      ? 'rgba(0, 212, 255, 0.2)' 
      : 'rgba(59, 130, 246, 0.2)',
  };

  return (
    <>
      <nav className="navbar-enhanced" style={navStyle}>
        {/* Hamburger Menu */}
        <button
          className={`hamburger-menu ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        {/* Brand/Logo */}
        <Link to="/" className="navbar-brand-enhanced">
          <span className="brand-icon">⚙️</span>
          <span className="brand-text">Smart Traffic Management System</span>
        </Link>

        {/* Right Section - Status & Controls */}
        <div className="navbar-right-section">
          <div className="status-display">
            <div className={`status-badge ${isLive ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span>{isLive ? 'LIVE' : 'OFFLINE'}</span>
            </div>
            <div className="vehicle-count-badge">
              <span className="vehicle-icon">🚗</span>
              <span>{vehicleCount}</span>
            </div>
          </div>

          <button
            className="theme-toggle-btn"
            onClick={theme.toggleTheme}
            title={theme.isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {theme.isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Sidebar Navigation Menu */}
      <div className={`sidebar-menu ${menuOpen ? 'open' : ''}`} style={sidebarStyle}>
        <div className="sidebar-header">
          <h2 style={{ color: theme.colors.text }}>Menu</h2>
          <button
            className="close-menu-btn"
            onClick={() => setMenuOpen(false)}
            style={{ color: theme.colors.text }}
          >
            ✕
          </button>
        </div>

        <div className="sidebar-separator" style={separatorStyle}></div>

        {/* Junction Selector */}
        <div className="sidebar-section">
          <label className="sidebar-label" style={{ color: theme.colors.textSecondary }}>📍 Junction</label>
          <select
            value={activeJunction}
            onChange={(e) => onJunctionChange(e.target.value)}
            className="sidebar-select"
            style={{
              background: theme.colors.surface,
              color: theme.colors.text,
              border: `2px solid ${theme.colors.border}`,
            }}
          >
            <option value="Junction-01">Junction 01</option>
            <option value="Junction-02">Junction 02</option>
            <option value="Junction-03">Junction 03</option>
          </select>
        </div>

        <div className="sidebar-separator" style={separatorStyle}></div>

        {/* Navigation Links */}
        <div className="sidebar-nav-links">
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              className="sidebar-nav-link"
              onClick={() => setMenuOpen(false)}
              style={{
                color: theme.colors.text,
              }}
            >
              <span className="link-icon">{item.icon}</span>
              <span className="link-text">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar-separator" style={separatorStyle}></div>

        {/* System Status in Sidebar */}
        <div className="sidebar-section">
          <div className="system-status">
            <span className="status-title" style={{ color: theme.colors.textSecondary }}>System Status</span>
            <div className="status-info">
              <span className={`status-badge-small ${isLive ? 'connected' : 'disconnected'}`}>
                {isLive ? '🟢 Live Detecting' : '🔴 No Detection'}
              </span>
              <span className="vehicle-info" style={{ color: theme.colors.text }}>🚗 {vehicleCount} Vehicles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when menu is open */}
      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default Navigation;
