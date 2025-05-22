// API configuration
export const API_BASE = 'http://localhost:5000';

// API endpoints by module
export const API_ENDPOINTS = {
  status: `${API_BASE}/api/status`,
  
  // Domain endpoints
  domain: {
    status: `${API_BASE}/api/domain/status`,
    setup: `${API_BASE}/api/domain/setup`,
    publicIp: `${API_BASE}/api/domain/public-ip`,
    addRecord: `${API_BASE}/api/domain/dns/add-record`,
    list: `${API_BASE}/api/domain/list`
  },
  
  // Phishing site endpoints
  phishing: {
    status: `${API_BASE}/api/phishing/status`,
    setupFolder: `${API_BASE}/api/phishing/setup-folder`,
    upload: `${API_BASE}/api/phishing/upload`,
    restartApache: `${API_BASE}/api/phishing/restart-apache`,
    list: `${API_BASE}/api/phishing/list`,
    listFiles: `${API_BASE}/api/phishing/listfiles`,
    deleteFile: `${API_BASE}/api/phishing/deletefile`
  },
  
  // Evilginx endpoints
  evilginx: {
    status: `${API_BASE}/api/evilginx/status`,
    install: `${API_BASE}/api/evilginx/install`,
    setup: `${API_BASE}/api/evilginx/setup`,
    freePorts: `${API_BASE}/api/evilginx/free-ports`,
    instances: `${API_BASE}/api/evilginx/instances`,
    phishlets: `${API_BASE}/api/evilginx/phishlets`,
    certificates: `${API_BASE}/api/evilginx/certificates`,
    uploadCerts: `${API_BASE}/api/evilginx/upload-certs`,
  },
  
  // Credentials monitoring endpoints
  credentials: {
    status: `${API_BASE}/api/credentials/status`,
    start: `${API_BASE}/api/credentials/start`,
    stop: `${API_BASE}/api/credentials/stop`,
    list: `${API_BASE}/api/credentials/list`,
    clear: `${API_BASE}/api/credentials/clear`,
    monitors: `${API_BASE}/api/credentials/monitors`,
    activate: `${API_BASE}/api/credentials/activate`,
    extract: `${API_BASE}/api/credentials/extract`,
    reload: `${API_BASE}/api/credentials/reload`
  }
};

// Helper functions for common API operations
export function fetchApi(url, method = 'GET', body = null, isFormData = false) {
  const options = {
    method: typeof method === 'string' ? method.toUpperCase() : 'GET',
    headers: isFormData
      ? {}
      : {
          'Content-Type': 'application/json',
        },
    body: body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : null
  };

  return fetch(url, options).then(res => res.json());
}



export default {
  API_BASE,
  API_ENDPOINTS,
  fetchApi
};