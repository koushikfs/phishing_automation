import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS, fetchApi } from '../api';

function PhishingSiteSetup() {
  const [phishingSites, setPhishingSites] = useState([]);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [domains, setDomains] = useState([]);
  const [formData, setFormData] = useState({
    domain_name: '',
    folder_path: ''
  });
  const [uploadFormData, setUploadFormData] = useState({
    domain_name: '',
    file: null
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'path'
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [fileList, setFileList] = useState([]);



  useEffect(() => {
    if (uploadFormData.domain_name) {
      fetchFiles();
    }
    // Fetch existing phishing sites and domains
    fetchPhishingSites();
    fetchDomains();
  }, []);


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

  const deleteFile = (fileName) => {
    fetchApi(API_ENDPOINTS.phishing.deleteFile, 'POST', {
      domainName: uploadFormData.domain_name,
      fileName: fileName
    })
      .then(data => {
        if (data.status === 'success') {
          fetchFiles(); // refresh list
        }
      });
  };
  
  

  const fetchFiles = (domain = uploadFormData.domain_name) => {
    if (!domain) return;
  
    fetchApi(`${API_ENDPOINTS.phishing.listFiles}?domainName=${domain}`, 'GET')
      .then(data => {
        if (data.status === 'success') {
          setFileList(data.files);
        }
      });
  };
  
  
  

  const handleUpload = () => {
    if (!uploadFormData.domain_name || files.length === 0) {
      console.error('Please select domain and files first');
      return;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('domainName', uploadFormData.domain_name);

    fetch(API_ENDPOINTS.phishing.upload, {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        console.log('Upload success', data);
      })
      .catch(error => {
        console.error('Upload error', error);
      });
  };

  const fetchPhishingSites = () => {
    setLoading(true);
    fetchApi(API_ENDPOINTS.phishing.list)
      .then(data => {
        if (data.status === 'success') {
          setPhishingSites(data.sites);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching phishing sites:', error);
        setLoading(false);
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

  const handleUploadChange = (e) => {
    const { name, value } = e.target;
    setUploadFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    fetchFiles(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    fetchApi(API_ENDPOINTS.phishing.setupFolder, {
      method: 'POST',
      body: JSON.stringify(formData),
    })
      .then(data => {
        setSubmitting(false);
        if (data.status === 'success') {
          setMessage({
            type: 'success',
            text: 'Phishing site setup successfully!'
          });
          
          // Reset form
          setFormData({
            domain_name: '',
            folder_path: ''
          });
          
          // Refresh site list
          fetchPhishingSites();
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to setup phishing site.'
          });
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setSubmitting(false);
        setMessage({
          type: 'error',
          text: 'An error occurred while setting up the phishing site.'
        });
      });
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
  
    if (!uploadFormData.domain_name || files.length === 0) {
      console.error('Please select domain and upload files');
      return;
    }
  
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('domainName', uploadFormData.domain_name);
  
    setSubmitting(true);
  
    fetch(API_ENDPOINTS.phishing.upload, {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          setUploadStatus({ type: 'success', message: 'Upload Successful!' });
          setFiles([]);
          fetchFiles(); 
          setTimeout(() => {
            setUploadStatus({ type: '', message: '' });
          }, 3000);
        } else {
          setUploadStatus({ type: 'error', message: data.message || 'Upload failed.' });
        }
        setSubmitting(false);
      })
      .catch(error => {
        setUploadStatus({ type: 'error', message: error.message || 'Upload error occurred.' });
        setSubmitting(false);
      });
  };
  

  return (
    <div className="phishing-site-setup">
      <h1>Phishing Site Setup</h1>
      <p>Configure phishing sites for your campaigns.</p>

      {/* Phishing Site Setup Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Add New Phishing Site</h2>
          <div className="tab-buttons">
            <button 
              className={`btn ${activeTab === 'upload' ? 'btn-active' : 'btn-secondary'}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Files
            </button>
            {/* <button 
              className={`btn ${activeTab === 'path' ? 'btn-active' : 'btn-secondary'}`}
              onClick={() => setActiveTab('path')}
            >
              Use Server Path
            </button> */}
          </div>
        </div>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        {uploadStatus.message && (
          <div
            style={{
              backgroundColor: uploadStatus.type === 'error' ? '#fdecea' : '#e6ffed',
              border: `1px solid ${uploadStatus.type === 'error' ? '#f5c6cb' : '#a3d9a5'}`,
              color: uploadStatus.type === 'error' ? '#721c24' : '#155724',
              padding: '10px 15px',
              borderRadius: '5px',
              marginBottom: '15px',
              fontSize: '14px'
            }}
          >
            {uploadStatus.message}
          </div>
        )}
        
        {activeTab === 'upload' ? (
          <form onSubmit={handleUploadSubmit}>
          <div className="form-group">
            <label htmlFor="upload-domain">Domain Name</label>
            <select
              id="upload-domain"
              name="domain_name"
              value={uploadFormData.domain_name}
              onChange={handleUploadChange}
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
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: '2px dashed gray',
                backgroundColor: isDragging ? '#f0f8ff' : 'transparent',  // light blue on hover
                boxShadow: isDragging ? '0 0 10px #00f' : 'none',          // glow effect
                padding: '20px',
                marginBottom: '20px',
                position: 'relative',
                transition: 'all 0.3s ease'  // smooth animation
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


            {/* ✅ Remove extra Upload Files button here */}
          </div>
          
          <button
            type="submit"
            className="btn"
            disabled={submitting || files.length === 0}
          >
            {submitting ? 'Uploading...' : 'Upload & Setup Site'}
          </button>
        </form>
        
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="domain_name">Domain Name</label>
              <select
                id="domain_name"
                name="domain_name"
                value={formData.domain_name}
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
              <label htmlFor="folder_path">Server Folder Path</label>
              <input
                type="text"
                id="folder_path"
                name="folder_path"
                value={formData.folder_path}
                onChange={handleChange}
                placeholder="e.g. /home/user/phishing_site"
                required
              />
            </div>
            
            <button
              type="submit"
              className="btn"
              disabled={submitting}
            >
              {submitting ? 'Setting Up...' : 'Setup Phishing Site'}
            </button>
          </form>
        )}
      </div>

      {/* Phishing Site Files List */}
      {fileList.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h2 className="card-title">Files in {uploadFormData.domain_name}</h2>
            </div>
            <ul style={{ listStyleType: 'none', paddingLeft: '10px', margin: 0 }}>
              {fileList.map((file, idx) => (
                <li key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: '5px',
                  fontSize: '14px',
                  color: '#333'
                }}>
                  <span>📄 {file}</span>
                  <button
                    type="button"
                    onClick={() => deleteFile(file)}
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
  );
}

export default PhishingSiteSetup;