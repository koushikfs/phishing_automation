# PhishForge Framework

PhishForge is a centralized phishing campaign management platform that integrates domain setup, phishing site deployment, Evilginx proxy configuration, and credential monitoring.

## Features

- **Domain Setup**: Configure domains with automatic DNS record creation via Cloudflare API
- **Phishing Site Deployment**: Deploy custom phishing sites via file upload or server paths
- **Evilginx Integration**: Launch and manage Evilginx phishing proxies
- **Credential Monitoring**: Real-time monitoring and capture of phishing credentials
- **Unified Dashboard**: Centralized management of your phishing infrastructure

## Installation

### Prerequisites

- Python 3.8+
- Node.js 14+
- Apache2 web server
- Evilginx2 v2.4.0
- Cloudflare account with API key (for domain management)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/phishforge.git
   cd phishforge
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your Cloudflare credentials:
   ```
   CLOUDFLARE_API_KEY=your_api_key_here
   CLOUDFLARE_EMAIL=your_email_here
   ```

4. Create the necessary directories:
   ```bash
   mkdir -p phishlets uploads assets
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the frontend:
   ```bash
   npm run build
   ```

## Usage

### Running the Application

1. Start the backend server:
   ```bash
   cd /path/to/phishforge
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python app.py
   ```

2. The application will be available at `http://localhost:5000`

### Workflow

1. **Domain Setup**:
   - Add a new domain via the Domain Setup page
   - The system will configure DNS records and set up a basic web server

2. **Phishing Site Setup**:
   - Upload your phishing site files or specify a server path
   - The system will deploy the site to Apache

3. **Evilginx Setup**:
   - Select a domain and phishlet
   - Configure redirect URL
   - Launch Evilginx instance and get the lure URL

4. **Monitoring**:
   - Start a monitoring session
   - View captured credentials in real-time

## Project Structure

```
phishforge/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── scripts/               # Backend scripts
│   ├── setup_domain.py    # Domain setup module
│   ├── phishing_site_setup.py # Phishing site deployment module
│   ├── start_evilginx.py  # Evilginx management module
│   └── watch_and_extract.py # Credential monitoring module
├── assets/                # Static assets and templates
├── phishlets/             # Evilginx phishlet configurations
├── uploads/               # Temporary directory for uploads
└── frontend/              # React frontend
    ├── public/            # Static files
    └── src/               # React components and styles
        ├── App.js         # Main React application
        ├── App.css        # Global styles
        └── pages/         # Application pages
            ├── Dashboard.js
            ├── DomainSetup.js
            ├── PhishingSiteSetup.js
            ├── EvilginxSetup.js
            └── Monitoring.js
```

## Security Considerations

- This framework is intended for legitimate security testing and phishing awareness training only
- Always obtain proper authorization before conducting phishing campaigns
- Ensure data handling complies with relevant privacy regulations
- Do not store real credentials in plaintext for longer than necessary

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.