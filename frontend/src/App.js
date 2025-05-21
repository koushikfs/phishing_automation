import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import DomainSetup from './pages/DomainSetup';
import PhishingSiteSetup from './pages/PhishingSiteSetup';
import EvilginxSetup from './pages/EvilginxSetup';
import Monitoring from './pages/Monitoring';
// import StartPhishing from './pages/StartPhishing';

// Define API base URL - adjust this based on your setup
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [status, setStatus] = useState({
    domains_count: 0,
    phishing_sites_count: 0,
    evilginx_instances_count: 0,
    monitors_count: 0,
    credentials_count: 0
  });

  useEffect(() => {
    // Fetch application status when component mounts
    fetch(`${API_BASE_URL}/api/status`)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          setStatus(data);
        }
      })
      .catch(error => console.error('Error fetching status:', error));
  }, []);

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="logo">PhishForge</div>
          <nav>
            <ul>
              <li><NavLink to="/" className={({isActive}) => isActive ? 'active' : ''}>Dashboard</NavLink></li>
              {/* <li><NavLink to="/start" className={({isActive}) => isActive ? 'active' : ''}>Start Phishing</NavLink></li> */}
              <li><NavLink to="/domains" className={({isActive}) => isActive ? 'active' : ''}>Domain Setup</NavLink></li>
              <li><NavLink to="/phishing" className={({isActive}) => isActive ? 'active' : ''}>Phishing Site</NavLink></li>
              <li><NavLink to="/evilginx" className={({isActive}) => isActive ? 'active' : ''}>Evilginx</NavLink></li>
              <li><NavLink to="/monitoring" className={({isActive}) => isActive ? 'active' : ''}>Monitoring</NavLink></li>
            </ul>
          </nav>
        </header>

        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard status={status} />} />
            {/* <Route path="/start" element={<StartPhishing />} /> */}
            <Route path="/domains" element={<DomainSetup />} />
            <Route path="/phishing" element={<PhishingSiteSetup />} />
            <Route path="/evilginx" element={<EvilginxSetup />} />
            <Route path="/monitoring" element={<Monitoring />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>PhishForge Framework &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;