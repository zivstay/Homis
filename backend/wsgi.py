#!/usr/bin/env python3
"""
WSGI entry point for Heroku deployment
"""
import os
from app import create_app

# Create the Flask application instance
application = create_app(os.getenv('FLASK_ENV', 'production'))
app = application

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)