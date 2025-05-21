"""
WSGI entry point for gunicorn
"""

from app import create_app
from cors_middleware import CORSMiddleware

# Create the application for WSGI servers (e.g. gunicorn)
app = create_app()
# Wrap with CORS middleware
application = CORSMiddleware(app)

if __name__ == "__main__":
    application.run()