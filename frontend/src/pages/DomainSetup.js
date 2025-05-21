import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, fetchApi } from '../api';

function DomainSetup() {
  const [domains, setDomains] = useState([]);
  const [formData, setFormData] = useState({
    domain: '',
    ip: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Fetch existing domains
    fetchDomains();
  }, []);

  const fetchDomains = () => {
    setLoading(true);
    fetchApi(API_ENDPOINTS.domain.list)
      .then(data => {
        if (data.status === 'success') {
          setDomains(data.domains);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching domains:', error);
        setLoading(false);
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Fixed: Explicitly set method to POST and ensure correct endpoint
    fetch(API_ENDPOINTS.domain.setup, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    })
      .then(response => response.json())
      .then(data => {
        setSubmitting(false);
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: `Domain ${formData.domain} setup successfully!`
          });
          
          // Reset form
          setFormData({
            domain: '',
            ip: ''
          });
          
          // Refresh domain list
          fetchDomains();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to setup domain.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setSubmitting(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while setting up the domain.'
        });
      });
  };

  return (
    <div className="domain-setup">
      <h1>Domain Setup</h1>
      <p>Configure domains for your phishing campaigns.</p>

      {/* Domain Setup Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Add New Domain</h2>
        </div>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="domain">Domain Name</label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              placeholder="e.g. login.example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="ip">IP Address (Optional)</label>
            <input
              type="text"
              id="ip"
              name="ip"
              value={formData.ip}
              onChange={handleChange}
              placeholder="Leave blank to use server's public IP"
            />
          </div>
          
          <button
            type="submit"
            className="btn"
            disabled={submitting}
          >
            {submitting ? 'Setting Up...' : 'Setup Domain'}
          </button>
        </form>
      </div>

      {/* Domains List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Configured Domains</h2>
        </div>
        
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : domains.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain, index) => (
                <tr key={index}>
                  <td>{domain.domain}</td>
                  <td>{domain.ip}</td>
                  <td>Active</td>
                  <td>{new Date(domain.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No domains configured yet.</p>
        )}
      </div>
    </div>
  );
}

export default DomainSetup;