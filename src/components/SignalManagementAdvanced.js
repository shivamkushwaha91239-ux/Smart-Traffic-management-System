import React, { useState, useEffect } from 'react';
import './SignalControl.css';

const SignalManagementAdvanced = () => {
  const [junctions, setJunctions] = useState([
    {
      id: 'Junction-01',
      name: 'Charbagh',
      lanes: ['North', 'South', 'East', 'West'],
      signals: { North: 'RED', South: 'GREEN', East: 'RED', West: 'RED' },
      durations: { North: 0, South: 45, East: 0, West: 0 },
      vehicleCount: { North: 12, South: 28, East: 8, West: 15 },
      density: { North: 35, South: 65, East: 28, West: 45 },
    },
    {
      id: 'Junction-02',
      name: 'Kaiserbagh',
      lanes: ['North', 'South', 'East', 'West'],
      signals: { North: 'GREEN', South: 'RED', East: 'RED', West: 'RED' },
      durations: { North: 38, South: 0, East: 0, West: 0 },
      vehicleCount: { North: 35, South: 18, East: 12, West: 22 },
      density: { North: 72, South: 38, East: 32, West: 52 },
    },
  ]);

  const [selectedJunction, setSelectedJunction] = useState(junctions[0].id);
  const [manualMode, setManualMode] = useState(false);

  const colors = {
    red: '#ef4444',
    yellow: '#f59e0b',
    green: '#10b981',
  };

  const handleSignalChange = (junctionId, lane, newSignal) => {
    setJunctions(junctions.map(j => {
      if (j.id === junctionId) {
        return {
          ...j,
          signals: { ...j.signals, [lane]: newSignal },
          durations: { ...j.durations, [lane]: newSignal === 'GREEN' ? 45 : newSignal === 'YELLOW' ? 5 : 0 },
        };
      }
      return j;
    }));
  };

  const getSignalColor = (signal) => {
    if (signal === 'GREEN') return colors.green;
    if (signal === 'YELLOW') return colors.yellow;
    return colors.red;
  };

  const optimizeSignals = async (junctionId) => {
    // Simulate optimization based on traffic density
    const junction = junctions.find(j => j.id === junctionId);
    const lanes = Object.entries(junction.density)
      .sort(([, a], [, b]) => b - a)
      .map(([lane]) => lane);

    setJunctions(junctions.map(j => {
      if (j.id === junctionId) {
        const newSignals = {};
        const newDurations = {};
        
        lanes.forEach((lane, idx) => {
          if (idx === 0) {
            newSignals[lane] = 'GREEN';
            newDurations[lane] = 50;
          } else if (idx === 1) {
            newSignals[lane] = 'RED';
            newDurations[lane] = 0;
          } else {
            newSignals[lane] = 'RED';
            newDurations[lane] = 0;
          }
        });

        return { ...j, signals: newSignals, durations: newDurations };
      }
      return j;
    }));
  };

  const currentJunction = junctions.find(j => j.id === selectedJunction);

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
    controlsBar: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '15px 20px',
      marginBottom: '20px',
      display: 'flex',
      gap: '15px',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
      flexWrap: 'wrap',
    },
    selector: {
      padding: '8px 12px',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      fontSize: '14px',
      background: '#f8fafc',
      cursor: 'pointer',
    },
    button: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    primaryButton: {
      background: '#3b82f6',
      color: '#ffffff',
    },
    toggleButton: (isActive) => ({
      background: isActive ? '#ef4444' : '#10b981',
      color: '#ffffff',
    }),
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '20px',
    },
    signalPanel: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
    },
    panelTitle: {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#1e293b',
    },
    lanesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '15px',
    },
    laneCard: {
      padding: '15px',
      borderRadius: '10px',
      background: '#f8fafc',
      border: '2px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    laneName: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#1e293b',
    },
    signalDisplay: (color) => ({
      height: '60px',
      borderRadius: '8px',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: '18px',
      transition: 'all 0.3s ease',
    }),
    buttonGroup: {
      display: 'flex',
      gap: '5px',
      flexWrap: 'wrap',
    },
    signalButton: (isActive, color) => ({
      flex: 1,
      minWidth: '50px',
      padding: '6px 8px',
      borderRadius: '6px',
      border: isActive ? `2px solid ${color}` : '1px solid #cbd5e1',
      background: isActive ? color : '#f8fafc',
      color: isActive ? '#ffffff' : '#64748b',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: isActive ? '600' : '500',
      transition: 'all 0.3s ease',
    }),
    infoPanel: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '15px',
    },
    infoItem: {
      padding: '15px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    },
    infoLabel: {
      fontSize: '12px',
      color: '#64748b',
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: '8px',
    },
    infoValue: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1e293b',
    },
    statisticsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
    },
    statCard: {
      background: '#ffffff',
      borderRadius: '12px',
      padding: '18px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🚦 Traffic Signal Management</h1>
        <p style={styles.subtitle}>Control and optimize traffic signals across junctions</p>
      </div>

      {/* Control Bar */}
      <div style={styles.controlsBar}>
        <select
          value={selectedJunction}
          onChange={(e) => setSelectedJunction(e.target.value)}
          style={styles.selector}
        >
          {junctions.map(j => (
            <option key={j.id} value={j.id}>{j.name} Junction</option>
          ))}
        </select>

        <button
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={() => optimizeSignals(selectedJunction)}
        >
          ⚡ Auto-Optimize
        </button>

        <button
          style={{ ...styles.button, ...styles.toggleButton(manualMode) }}
          onClick={() => setManualMode(!manualMode)}
        >
          {manualMode ? '🔒 Auto Mode' : '🔓 Manual Mode'}
        </button>
      </div>

      {/* Main Panels */}
      <div style={styles.mainGrid}>
        {/* Signal Control Panel */}
        <div style={styles.signalPanel}>
          <h3 style={styles.panelTitle}>
            🚦 Signal Controls - {currentJunction.name}
          </h3>
          <div style={styles.lanesGrid}>
            {currentJunction.lanes.map(lane => {
              const signal = currentJunction.signals[lane];
              const duration = currentJunction.durations[lane];
              const color = getSignalColor(signal);

              return (
                <div key={lane} style={styles.laneCard}>
                  <div style={styles.laneName}>{lane} Lane</div>
                  
                  <div style={styles.signalDisplay(color)}>
                    {signal}
                  </div>

                  {signal === 'GREEN' && (
                    <div style={{
                      fontSize: '12px',
                      color: '#64748b',
                      textAlign: 'center',
                    }}>
                      ⏱️ {duration}s remaining
                    </div>
                  )}

                  {manualMode && (
                    <div style={styles.buttonGroup}>
                      <button
                        style={styles.signalButton(signal === 'RED', colors.red)}
                        onClick={() => handleSignalChange(selectedJunction, lane, 'RED')}
                      >
                        RED
                      </button>
                      <button
                        style={styles.signalButton(signal === 'YELLOW', colors.yellow)}
                        onClick={() => handleSignalChange(selectedJunction, lane, 'YELLOW')}
                      >
                        YELLOW
                      </button>
                      <button
                        style={styles.signalButton(signal === 'GREEN', colors.green)}
                        onClick={() => handleSignalChange(selectedJunction, lane, 'GREEN')}
                      >
                        GREEN
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Traffic Info Panel */}
        <div style={styles.infoPanel}>
          <h3 style={styles.panelTitle}>📊 Traffic Information</h3>
          <div style={styles.infoGrid}>
            {currentJunction.lanes.map(lane => (
              <div key={lane} style={styles.infoItem}>
                <div style={styles.infoLabel}>{lane} Lane</div>
                <div style={styles.infoValue}>
                  {currentJunction.vehicleCount[lane]} Vehicles
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <div style={{
                    height: '4px',
                    flex: 1,
                    background: '#e2e8f0',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${currentJunction.density[lane]}%`,
                      background: currentJunction.density[lane] > 70 ? colors.red :
                                 currentJunction.density[lane] > 40 ? colors.yellow : colors.green,
                    }} />
                  </div>
                  {currentJunction.density[lane]}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#1e293b' }}>
          📈 Junction Statistics
        </h3>
        <div style={styles.statisticsGrid}>
          <div style={styles.statCard}>
            <div style={styles.infoLabel}>Total Vehicles</div>
            <div style={styles.infoValue}>
              {Object.values(currentJunction.vehicleCount).reduce((a, b) => a + b, 0)}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.infoLabel}>Average Density</div>
            <div style={styles.infoValue}>
              {Math.round(Object.values(currentJunction.density).reduce((a, b) => a + b, 0) / currentJunction.lanes.length)}%
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.infoLabel}>Active Green Signals</div>
            <div style={styles.infoValue}>
              {Object.values(currentJunction.signals).filter(s => s === 'GREEN').length}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.infoLabel}>Max Wait Time</div>
            <div style={styles.infoValue}>
              ~45 seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalManagementAdvanced;
