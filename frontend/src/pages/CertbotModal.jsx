import React, { useState } from 'react';

const CertbotModal = ({ domain, phishlet }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
      <button
        onClick={() => setShowModal(true)}
        style={{
          backgroundColor: '#1f6feb',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        How to Generate Cert?
      </button>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90%',
            overflowY: 'auto',
            fontFamily: 'Arial, sans-serif',
            color: '#333',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <h2 style={{ color: '#1f6feb' }}>How to Upload SSL Certificates</h2>

            <ol style={{ lineHeight: '1.8' }}>
              <li>
                <strong>Generate SSL Certificate:</strong><br />
                <pre style={{
                  backgroundColor: '#eee',
                  padding: '10px',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
{`sudo certbot certonly --manual --preferred-challenges dns \\
  --non-interactive --agree-tos --register-unsafely-without-email \\
  -d ${domain || 'yourdomain.com'} -d '*.${domain || 'yourdomain.com'}'`}
                </pre>
              </li>

              <li>
                <strong>Complete DNS Challenge:</strong><br />
                Add the DNS TXT record as instructed by Certbot.
              </li>

              <li>
                <strong>Locate Files:</strong><br />
                <ul>
                  <li><code>/etc/letsencrypt/live/{domain || 'yourdomain.com'}/fullchain.pem</code></li>
                  <li><code>/etc/letsencrypt/live/{domain || 'yourdomain.com'}/privkey.pem</code></li>
                </ul>
              </li>

              <li>
                <strong>Rename Files:</strong><br />
                <ul>
                  <li><code>fullchain.pem → {phishlet || 'yourphishlet'}.crt</code></li>
                  <li><code>privkey.pem → {phishlet || 'yourphishlet'}.key</code></li>
                </ul>
              </li>

              <li>
                <strong>Upload Files:</strong><br />
                Upload the <code>.crt</code> and <code>.key</code> files using the upload form.
              </li>

              <li>
                <strong>Start Evilginx:</strong><br />
                After successful upload, launch your Evilginx instance.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertbotModal;
