"""
Evilginx API Routes
"""

from flask import Blueprint, request, jsonify
import os
from modules import evilginx
import json

# Create blueprint
evilginx_bp = Blueprint('evilginx', __name__)
CERTS_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../certs'))


@evilginx_bp.route('/status', methods=['GET'])
def get_status():
    """Get the status of the Evilginx module"""
    return jsonify({
        "status": "active",
        "module": "evilginx",
        "active_instances": len(evilginx.active_evilginx)
    })

@evilginx_bp.route('/install', methods=['POST'])
def install_evilginx():
    """Install Evilginx"""
    result = evilginx.install_evilginx()
    
    if result['status'] == 'error':
        return jsonify(result), 500
    else:
        return jsonify(result)



@evilginx_bp.route('/setup', methods=['POST'])
def setup_evilginx():
    """Set up and start Evilginx"""
    data = request.json
    
    if not data or 'domain' not in data or 'phishlet' not in data:
        return jsonify({
            "status": "error",
            "message": "Missing required parameters: domain and phishlet"
        }), 400
    
    domain = data['domain']
    phishlet = data['phishlet']
    ip = data.get('ip', '')
    redirect_url = data.get('redirectUrl', 'https://google.com')
    
    result = evilginx.setup_evilginx(domain, phishlet, ip, redirect_url)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)
    
@evilginx_bp.route('/upload-certs', methods=['POST'])
def upload_certs():
    try:
        domain = request.form.get('domain')
        phishlet = request.form.get('phishlet')
        crt_file = request.files.get('crt')
        key_file = request.files.get('key')

        if not domain or not phishlet or not crt_file or not key_file:
            return jsonify({
                "status": "error",
                "message": "Missing required fields or files."
            }), 400

        domain_folder = os.path.join(CERTS_UPLOAD_FOLDER, domain)
        os.makedirs(domain_folder, exist_ok=True)

        crt_dest = os.path.join(domain_folder, f"{phishlet}.crt")
        key_dest = os.path.join(domain_folder, f"{phishlet}.key")

        crt_file.save(crt_dest)
        key_file.save(key_dest)

        return jsonify({
            "status": "success",
            "message": f"Certificates uploaded successfully for domain {domain}."
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to upload certificates: {str(e)}"
        }), 500
    

@evilginx_bp.route('/free-ports', methods=['POST'])
def free_ports():
    """Free ports used by Evilginx"""
    result = evilginx.free_ports()
    
    if result['status'] == 'error':
        return jsonify(result), 500
    else:
        return jsonify(result)

@evilginx_bp.route('/instances', methods=['GET'])
def get_instances():
    try:
        formatted = [
            {"id": eid, **details} for eid, details in evilginx.active_evilginx.items()
        ]
        return jsonify({ "status": "success", "instances": formatted })
    except Exception as e:
        return jsonify({ "status": "error", "message": str(e) }), 500


@evilginx_bp.route('/instances/<evilginx_id>', methods=['DELETE'])
def stop_instance(evilginx_id):
    """Stop a specific Evilginx instance"""
    result = evilginx.stop_evilginx_instance(evilginx_id)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)

@evilginx_bp.route('/phishlets', methods=['GET'])
def get_phishlets():
    print(f"PHISHLETS_PATH: {evilginx.PHISHLETS_PATH}")

    """Get all available phishlets"""
    phishlets = []
    
    try:
        if os.path.exists(evilginx.PHISHLETS_PATH):
            phishlets = [f.replace('.yaml', '') for f in os.listdir(evilginx.PHISHLETS_PATH) if f.endswith('.yaml')]
        
        return jsonify({
            "status": "success",
            "phishlets": phishlets
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to get phishlets: {str(e)}"
        }), 500

@evilginx_bp.route('/certificates', methods=['POST'])
def generate_certificates():
    """Generate SSL certificates for a domain"""
    data = request.json
    
    if not data or 'domain' not in data or 'phishlet' not in data:
        return jsonify({
            "status": "error",
            "message": "Missing required parameters: domain and phishlet"
        }), 400
    
    domain = data['domain']
    phishlet = data['phishlet']
    force = data.get('force', False)
    
    result = evilginx.copy_cert_files(domain, phishlet, not force)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)