"""
Domain Setup API Routes
"""

import os
from venv import logger
from flask import Blueprint, current_app, json, request, jsonify
from modules import domain
import logging
logger = logging.getLogger(__name__)

# Create blueprint
domain_bp = Blueprint('domain', __name__)

@domain_bp.route('/status', methods=['GET'])
def get_status():
    """Get the status of the domain setup module"""
    return jsonify({
        "status": "active",
        "module": "domain_setup"
    })

@domain_bp.route('/setup', methods=['POST'])
def setup_domain():
    """Set up a domain with DNS and web server"""
    data = request.json
    
    if not data or 'domain' not in data:
        return jsonify({
            "status": "error",
            "message": "Missing required parameter: domain"
        }), 400
    
    domain_name = data['domain']
    ip_input = data.get('ip', '')
    
    result = domain.setup_domain(domain_name, ip_input)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)
    

@domain_bp.route('/list', methods=['GET'])
def list_domains():
    """List all configured domains"""
    try:
        # Get the uploads folder path from config
        uploads_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        domains_file = os.path.join(uploads_folder, 'domains.json')
        
        # Check if domains file exists, if not create it with empty array
        if not os.path.exists(domains_file):
            os.makedirs(os.path.dirname(domains_file), exist_ok=True)
            with open(domains_file, 'w') as f:
                json.dump([], f)
        
        # Read the domains from file
        with open(domains_file, 'r') as f:
            try:
                domains = json.load(f)
            except json.JSONDecodeError:
                domains = []
        
        return jsonify({
            "status": "success",
            "domains": domains
        })
    except Exception as e:
        logger.error(f"Error listing domains: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to list domains: {str(e)}"
        }), 500

@domain_bp.route('/public-ip', methods=['GET'])
def get_public_ip():
    """Get the server's public IP address"""
    ip = domain.get_public_ip()
    
    if ip:
        return jsonify({
            "status": "success",
            "ip": ip
        })
    else:
        return jsonify({
            "status": "error",
            "message": "Failed to determine public IP address"
        }), 500

@domain_bp.route('/dns/add-record', methods=['POST'])
def add_dns_record():
    """Add a DNS record to Cloudflare"""
    data = request.json
    
    if not data or 'domain' not in data or 'ip' not in data:
        return jsonify({
            "status": "error",
            "message": "Missing required parameters: domain and ip"
        }), 400
    
    domain_name = data['domain']
    ip = data['ip']
    
    # Get zone ID
    zone_id = domain.get_zone_id(domain_name)
    
    if not zone_id:
        return jsonify({
            "status": "error",
            "message": f"Zone ID not found for {domain_name}. Make sure the domain is added to Cloudflare."
        }), 400
    
    result = domain.add_dns_record(domain_name, ip, zone_id)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)

@domain_bp.route('/apache/install', methods=['POST'])
def install_apache():
    """Install Apache web server"""
    result = domain.install_apache()
    
    if result['status'] == 'error':
        return jsonify(result), 500
    else:
        return jsonify(result)

@domain_bp.route('/apache/start', methods=['POST'])
def start_apache():
    """Start and enable Apache web server"""
    result = domain.start_apache()
    
    if result['status'] == 'error':
        return jsonify(result), 500
    else:
        return jsonify(result)