#!/usr/bin/env python3
"""
Simple script to add budget_reset_time column
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy()
db.init_app(app)

def add_column():
    with app.app_context():
        try:
            print("Adding budget_reset_time column...")
            db.session.execute(db.text("ALTER TABLE boards ADD COLUMN IF NOT EXISTS budget_reset_time TIME;"))
            db.session.commit()
            print("Column added successfully!")
            return True
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()
            return False
        finally:
            db.session.close()

if __name__ == "__main__":
    add_column()
