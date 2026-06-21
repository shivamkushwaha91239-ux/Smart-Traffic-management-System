import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import './RoutePlanner.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001/api';

const RoutePlanner = () => {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [preferredRoute, setPreferredRoute] = useState('fastest');
  const [routes, setRoutes] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [departureTime, setDepartureTime] = useState('now');
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [liveTraffic, setLiveTraffic] = useState({});

  const lucknowLocations = [
    { id: 'charbagh', name: 'Charbagh Station', type: 'Station' },
    { id: 'hazratganj', name: 'Hazratganj Circle', type: 'Commercial' },
    { id: 'kaiserbagh', name: 'Kaiserbagh Junction', type: 'Junction' },
    { id: 'gomti-nagar', name: 'Gomti Nagar', type: 'Residential' },
    { id: 'alambagh', name: 'Alambagh Junction', type: 'Junction' },
    { id: 'north-avenue', name: 'North Avenue Road', type: 'Street' },
    { id: 'ashok-marg', name: 'Ashok Marg', type: 'Street' },
    { id: 'thandi-sarak', name: 'Thandi Sarak', type: 'Street' },
    { id: 'aminabad', name: 'Aminabad Market', type: 'Market' },
    { id: 'lucknow-mall', name: 'Lucknow Mall', type: 'Shopping' },
  ];

  const mockRoutes = {
    fastest: {
      name: 'Fastest Route',
      distance: '5.2 km',
      duration: '12 mins',
      traffic: 'Moderate',
      steps: [
        'Head north on Ashok Marg',
        'Turn right at Kaiserbagh Junction (Go at Green Signal)',
        'Continue on North Avenue Road',
        'Turn left at Hazratganj Circle',
        'Destination on your right',
      ],
      congestion: 35,
      color: '#eab308',
      safetyRating: 4.2,
      incidents: 'None',
    },
    safest: {
      name: 'Safest Route',
      distance: '6.8 km',
      duration: '18 mins',
      traffic: 'Light',
      steps: [
        'Start on Ashok Marg heading west',
        'Continue on Thandi Sarak (Avoid peak hours)',
        'Turn right at Gomti Nagar',
        'Use North Avenue bypass route',
        'Arrive at destination',
      ],
      congestion: 15,
      color: '#10b981',
      safetyRating: 4.8,
      incidents: 'None',
    },
    scenic: {
      name: 'Scenic Route',
      distance: '7.5 km',
      duration: '20 mins',
      traffic: 'Light',
      steps: [
        'Head towards Gomti River',
        'Follow scenic river road',
        'Continue through Lucknow parks',
        'Exit via North Gate',
        'Destination nearby',
      ],
      congestion: 10,
      color: '#10b981',
      safetyRating: 4.5,
      incidents: 'None',
    },
  };

  const handleFindRoute = async () => {
    if (!fromLocation || !toLocation) {
      alert('Please select both From and To locations');
      return;
    }

    setLoading(true);
    setBlockchainStatus('Finding route and recording to blockchain...');
    
    try {
      const formData = new FormData();
      formData.append('from_location', fromLocation);
      formData.append('to_location', toLocation);
      formData.append('route_type', preferredRoute);

      const response = await axios.post(
        `${API_BASE_URL}/routes/find`,
        formData
      );

      if (response.data.status === 'success') {
        // Convert API response to match expected format
        const routeData = {
          name: `${response.data.route_type.charAt(0).toUpperCase() + response.data.route_type.slice(1)} Route`,
          distance: `${response.data.distance} km`,
          duration: `${response.data.duration} mins`,
          traffic: response.data.congestion_level,
          congestion: response.data.congestion_level,
          safetyRating: response.data.safety_rating,
          incidents: 'None',
          vehicle_counts: response.data.vehicle_counts,
          blockchain_hash: response.data.blockchain_hash,
          route_id: response.data.route_id,
          steps: [
            `Start from ${fromLocation}`,
            `Route type: ${response.data.route_type}`,
            `Distance: ${response.data.distance} km (${response.data.duration} mins)`,
            `Current congestion: ${response.data.congestion_level}%`,
            `Destination: ${toLocation}`
          ]
        };

        setRoutes({ [preferredRoute]: routeData });
        setSelectedRoute(routeData);
        setRouteId(response.data.route_id);
        
        if (response.data.blockchain_verified) {
          setBlockchainStatus(`✅ Route recorded on blockchain\nBlock Hash: ${response.data.blockchain_hash?.substring(0, 16)}...`);
        } else {
          setBlockchainStatus('⚠️ Blockchain recording pending');
        }
      }
    } catch (err) {
      console.error('Route finding error:', err);
      setBlockchainStatus('❌ Error recording route to blockchain');
      
      // Fallback to mock routes
      const mockRoutes = {
        fastest: {
          name: 'Fastest Route',
          distance: '5.2 km',
          duration: '12 mins',
          traffic: 'Moderate',
          steps: [
            'Head north on Ashok Marg',
            'Turn right at Kaiserbagh Junction (Go at Green Signal)',
            'Continue on North Avenue Road',
            'Turn left at Hazratganj Circle',
            'Destination on your right',
          ],
          congestion: 35,
          color: '#eab308',
          safetyRating: 4.2,
          incidents: 'None',
        },
        safest: {
          name: 'Safest Route',
          distance: '6.8 km',
          duration: '18 mins',
          traffic: 'Light',
          steps: [
            'Start on Ashok Marg heading west',
            'Continue on Thandi Sarak (Avoid peak hours)',
            'Turn right at Gomti Nagar',
            'Use North Avenue bypass route',
            'Arrive at destination',
          ],
          congestion: 15,
          color: '#10b981',
          safetyRating: 4.8,
          incidents: 'None',
        }
      };

      setRoutes(mockRoutes);
      setSelectedRoute(mockRoutes[preferredRoute] || mockRoutes.fastest);
    } finally {
      setLoading(false);
    }
  };

  const getTrafficColor = (congestion) => {
    if (congestion > 70) return '#ef4444';
    if (congestion > 40) return '#f59e0b';
    if (congestion > 20) return '#eab308';
    return '#10b981';
  };

  // Fetch live traffic data
  useEffect(() => {
    if (selectedRoute) {
      const fetchTrafficData = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/traffic/overview`);
          if (response.data?.data?.junctions) {
            setLiveTraffic(response.data.data.junctions);
          }
        } catch (err) {
          console.log('Could not fetch live traffic');
        }
      };
      fetchTrafficData();
      const interval = setInterval(fetchTrafficData, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedRoute]);

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
    formContainer: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '25px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '15px',
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
      transition: 'all 0.3s ease',
    },
    optionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '10px',
      marginBottom: '15px',
    },
    optionButton: (isSelected) => ({
      padding: '10px',
      borderRadius: '8px',
      border: isSelected ? '2px solid #3b82f6' : '1px solid #cbd5e1',
      background: isSelected ? '#eff6ff' : '#f8fafc',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: isSelected ? '600' : '500',
      color: isSelected ? '#3b82f6' : '#64748b',
      transition: 'all 0.3s ease',
    }),
    buttonContainer: {
      display: 'flex',
      gap: '10px',
    },
    button: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    findButton: {
      background: '#3b82f6',
      color: '#ffffff',
      flex: 1,
    },
    clearButton: {
      background: '#e2e8f0',
      color: '#64748b',
    },
    routesContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '25px',
    },
    routeCard: (isSelected) => ({
      padding: '20px',
      borderRadius: '12px',
      border: isSelected ? '3px solid #3b82f6' : '1px solid #e2e8f0',
      background: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
    }),
    routeName: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: '12px',
    },
    routeInfo: {
      fontSize: '13px',
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      color: '#64748b',
    },
    routeValue: {
      fontWeight: 'bold',
      color: '#1e293b',
    },
    detailsContainer: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
    },
    detailsTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#1e293b',
    },
    safetySection: {
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '15px',
      border: '1px solid #e2e8f0',
    },
    safetyLabel: {
      fontSize: '13px',
      color: '#64748b',
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: '8px',
    },
    safetyItem: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '14px',
      color: '#1e293b',
    },
    stepsContainer: {
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '15px',
      border: '1px solid #e2e8f0',
    },
    stepsList: {
      listStyle: 'none',
      padding: 0,
    },
    stepItem: {
      padding: '10px 0',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '13px',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    },
    stepNumber: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: '#3b82f6',
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: '12px',
      flexShrink: 0,
    },
    googleMapsLink: {
      display: 'inline-block',
      marginTop: '15px',
      padding: '10px 16px',
      background: '#4f46e5',
      color: '#ffffff',
      borderRadius: '8px',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    blockchainCard: {
      background: '#f0f9ff',
      border: '2px solid #0ea5e9',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '20px',
      marginTop: '15px',
    },
    blockchainHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '10px',
    },
    blockchainMessage: {
      background: '#ffffff',
      padding: '10px',
      borderRadius: '6px',
      fontSize: '12px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      margin: '0',
      border: '1px solid #cbd5e1',
    },
    blockchainHash: {
      fontSize: '11px',
      marginTop: '10px',
      color: '#475569',
      wordBreak: 'break-all',
    },
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)', minHeight: '100vh', padding: '20px' }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <div style={{ fontSize: '40px' }}>🛣️</div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Safe Route Planner</h1>
              <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Real-time traffic-aware navigation with safety analytics</p>
            </div>
          </div>
        </div>

        {/* Main Container - Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', alignItems: 'start' }}>
          
          {/* Left Column - Route Planner */}
          <div>
            {/* Input Section */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '25px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>📍 From Location</label>
                <select
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#1e293b', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.3s', fontWeight: '500' }}
                >
                  <option value="">Select starting location...</option>
                  {lucknowLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} • {loc.type}</option>
                  ))}
                </select>
              </div>

              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', left: '50%', top: '-12px', transform: 'translateX(-50%)', background: '#3b82f6', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: 10 }}>⇅</div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>📍 To Location</label>
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#1e293b', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.3s', fontWeight: '500' }}
                >
                  <option value="">Select destination...</option>
                  {lucknowLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} • {loc.type}</option>
                  ))}
                </select>
              </div>

              {/* Route Preference */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>🎯 Route Preference</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                {[
                  { id: 'fastest', icon: '⚡', label: 'Fastest' },
                  { id: 'safest', icon: '🛡️', label: 'Safest' },
                  { id: 'scenic', icon: '🌳', label: 'Scenic' }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setPreferredRoute(option.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: preferredRoute === option.id ? '3px solid #3b82f6' : '2px solid #cbd5e1',
                      background: preferredRoute === option.id ? '#eff6ff' : '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: preferredRoute === option.id ? '700' : '600',
                      color: preferredRoute === option.id ? '#3b82f6' : '#64748b',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{option.icon}</span> {option.label}
                  </button>
                ))}
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '4px 0',
                  marginBottom: '15px',
                  textDecoration: 'underline'
                }}
              >
                {showAdvancedOptions ? '▼ Hide' : '▶ Show'} Advanced Options
              </button>

              {showAdvancedOptions && (
                <div style={{ background: '#f0f9ff', borderRadius: '10px', padding: '15px', marginBottom: '18px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>🕐 Departure Time</label>
                    <select
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', background: 'white' }}
                    >
                      <option value="now">Now</option>
                      <option value="1hour">In 1 hour</option>
                      <option value="2hours">In 2 hours</option>
                      <option value="morning-rush">Morning Rush (7-9 AM)</option>
                      <option value="evening-rush">Evening Rush (5-7 PM)</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}>
                    <input type="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <span>Avoid Tolls</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={avoidHighways} onChange={(e) => setAvoidHighways(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <span>Avoid Highways</span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={handleFindRoute}
                  disabled={loading || !fromLocation || !toLocation}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: loading || !fromLocation || !toLocation ? '#cbd5e1' : '#3b82f6',
                    color: 'white',
                    cursor: loading || !fromLocation || !toLocation ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '700',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                  }}
                >
                  {loading ? '🔄 Searching...' : '🔍 Find Routes'}
                </button>
                <button
                  onClick={() => {
                    setFromLocation('');
                    setToLocation('');
                    setRoutes(null);
                    setSelectedRoute(null);
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700',
                    transition: 'all 0.3s'
                  }}
                >
                  🔄 Clear
                </button>
              </div>
            </div>

            {/* Live Traffic Summary */}
            {liveTraffic.length > 0 && (
              <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 Live Traffic on Route</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {liveTraffic.slice(0, 3).map((junction, idx) => (
                    <div key={idx} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>{junction.name || 'Junction'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: getTrafficColor(junction.density) }}>{Math.round(junction.density)}%</div>
                        <div style={{ width: '30px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${junction.density}%`, height: '100%', background: getTrafficColor(junction.density) }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Routes and Details */}
          <div>
            {routes ? (
              <>
                {/* Route Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                  {Object.entries(routes).map(([key, route]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedRoute(route)}
                      style={{
                        padding: '18px',
                        borderRadius: '12px',
                        border: selectedRoute?.name === route.name ? '3px solid #3b82f6' : '2px solid #e2e8f0',
                        background: selectedRoute?.name === route.name ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: selectedRoute?.name === route.name ? '0 6px 20px rgba(59,130,246,0.15)' : '0 2px 8px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0 }}>{route.name}</h3>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px' }}>
                          {'⭐'.repeat(Math.floor(route.safetyRating))}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>DISTANCE</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{route.distance}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>TIME</div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{route.duration}</div>
                        </div>
                      </div>

                      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{ height: '100%', width: `${route.congestion}%`, background: getTrafficColor(route.congestion), transition: 'width 0.5s ease' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Traffic</span>
                        <span style={{ fontWeight: '700', color: getTrafficColor(route.congestion) }}>{route.congestion}% • {route.traffic}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detailed Route Info */}
                {selectedRoute && (
                  <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📋 {selectedRoute.name}
                    </h2>

                    {/* Key Metrics */}
                    <div style={{ background: '#f0f9ff', borderRadius: '10px', padding: '14px', marginBottom: '18px', borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Safety Rating</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{selectedRoute.safetyRating}/5.0</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Congestion</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: getTrafficColor(selectedRoute.congestion) }}>{selectedRoute.congestion}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Blockchain Status */}
                    {blockchainStatus && (
                      <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px', marginBottom: '18px', fontSize: '12px', color: '#92400e' }}>
                        🔐 {blockchainStatus.split('\n')[0]}
                      </div>
                    )}

                    {/* Directions */}
                    <div>
                      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📍 Turn-by-Turn Directions
                      </h3>
                      <ol style={{ margin: 0, paddingLeft: '20px' }}>
                        {selectedRoute.steps.map((step, idx) => (
                          <li key={idx} style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', lineHeight: '1.5', fontWeight: '500' }}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Open in Maps */}
                    <a
                      href={`https://www.google.com/maps/search/lucknow`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        marginTop: '18px',
                        padding: '12px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '10px',
                        textAlign: 'center',
                        fontSize: '13px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                      }}
                    >
                      📱 Open Full Map View
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div style={{ background: 'white', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
                <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Select locations and click "Find Routes" to see available routes with real-time traffic information</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
