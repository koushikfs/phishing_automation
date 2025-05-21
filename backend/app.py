"""
Main Flask Application Entry Point
"""
from flask import Flask, jsonify, request
import os
import logging
from config import get_config

# Import routes from modules
from cors_middleware import CORSMiddleware
from routes.phishing_site import phishing_bp
from routes.domain import domain_bp
from routes.evilginx import evilginx_bp
from routes.credentials import credentials_bp

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_object=None):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    if config_object is None:
        config_object = get_config()
    app.config.from_object(config_object)
    
    # Ensure upload directories exist
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)
    os.makedirs(app.config.get('ASSETS_FOLDER', 'assets'), exist_ok=True)
    os.makedirs(app.config.get('PHISHLETS_FOLDER', 'phishlets'), exist_ok=True)
    
    # Register blueprints
    app.register_blueprint(phishing_bp, url_prefix='/api/phishing')
    app.register_blueprint(domain_bp, url_prefix='/api/domain')
    app.register_blueprint(evilginx_bp, url_prefix='/api/evilginx')
    app.register_blueprint(credentials_bp, url_prefix='/api/credentials')
    
    
    # Root route for API status
    @app.route('/')
    def index():
        return jsonify({
            "status": "online",
            "version": "1.0.0",
            "api": "Phishing Toolkit API"
        })
    
    @app.route('/list', methods=['GET'])
    def redirect_to_domain_list():
        """Redirect /list to /api/domain/list"""
        return jsonify({
            "status": "success",
            "message": "Please use /api/domain/list for domain listing",
            "domains": []
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        logger.warning(f"404 error: {request.path}")
        return jsonify({"error": "Not found", "status": 404}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"500 error: {str(error)}")
        return jsonify({"error": "Internal server error", "status": 500}), 500
        
    return app



if __name__ == "__main__":
    app = create_app()
    # Get port from environment or use default
    app.wsgi_app = CORSMiddleware(app.wsgi_app)
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config.get('DEBUG', True))