"""
Phishing Site API Routes
"""

import shutil
from flask import Blueprint, request, jsonify
import os
import tempfile
import werkzeug
from modules import phishing_site

# Create blueprint
phishing_bp = Blueprint('phishing', __name__)

@phishing_bp.route('/status', methods=['GET'])
def get_status():
    """Get the status of the phishing site module"""
    return jsonify({
        "status": "active",
        "module": "phishing_site"
    })

@phishing_bp.route('/setup-folder', methods=['POST'])
def setup_folder():
    """Set up a phishing site from a folder path"""
    data = request.json
    
    if not data or 'folderPath' not in data:
        return jsonify({
            "status": "error",
            "message": "Missing required parameter: folderPath"
        }), 400
    
    folder_path = data['folderPath']
    domain_name = data.get('domainName')
    
    result = phishing_site.setup_phishing_site_folder(folder_path, domain_name)
    
    if result['status'] == 'error':
        return jsonify(result), 400
    else:
        return jsonify(result)

@phishing_bp.route('/upload', methods=['POST'])
def upload_site():
    """Upload and deploy a phishing site with multiple files"""
    if 'files' not in request.files:
        return jsonify({
            "status": "error",
            "message": "No files were uploaded"
        }), 400

    files = request.files.getlist('files')
    domain_name = request.form.get('domainName')

    if not domain_name:
        return jsonify({
            "status": "error",
            "message": "Missing required parameter: domainName"
        }), 400

    try:
        # Create temporary directory
        temp_upload_dir = tempfile.mkdtemp(prefix="incoming_upload_")

        saved_file_paths = []

        for file in files:
            original_filename = file.filename
            saved_path = os.path.join(temp_upload_dir, original_filename)
            file.save(saved_path)
            saved_file_paths.append(saved_path)

        # Process files
        result = phishing_site.setup_phishing_site_uploaded_multiple(saved_file_paths, domain_name)

        # Cleanup: remove temp upload folder
        shutil.rmtree(temp_upload_dir)

        if result['status'] == 'error':
            return jsonify(result), 400
        else:
            return jsonify(result)

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to process uploaded files: {str(e)}"
        }), 500
    

@phishing_bp.route('/listfiles', methods=['GET'])
def list_phishing_files():
    """List files in phishing site folder"""
    domain_name = request.args.get('domainName')
    if not domain_name:
        return jsonify({"status": "error", "message": "Missing domain name"}), 400

    domain_slug = domain_name.replace(".", "_")
    target_path = f"/var/www/html/{domain_slug}"

    if not os.path.exists(target_path):
        return jsonify({"status": "error", "message": "Domain folder not found"}), 404

    files = []
    for filename in os.listdir(target_path):
        full_path = os.path.join(target_path, filename)
        if os.path.isfile(full_path):
            files.append(filename)

    return jsonify({ "status": "success", "files": files })


@phishing_bp.route('/deletefile', methods=['POST'])
def delete_phishing_file():
    data = request.json
    domain_name = data.get('domainName')
    file_name = data.get('fileName')

    if not domain_name or not file_name:
        return jsonify({"status": "error", "message": "Missing data"}), 400

    domain_slug = domain_name.replace(".", "_")
    file_path = os.path.join("/var/www/html", domain_slug, file_name)

    if not os.path.exists(file_path):
        return jsonify({"status": "error", "message": "File not found"}), 404

    try:
        os.remove(file_path)
        return jsonify({"status": "success", "message": f"{file_name} deleted"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


    

@phishing_bp.route('/restart-apache', methods=['POST'])
def restart_apache():
    """Restart the Apache web server"""
    result = phishing_site.restart_apache()
    
    if result['status'] == 'error':
        return jsonify(result), 500
    else:
        return jsonify(result)