#!/usr/bin/env python3
"""
Debug script to check budget_reset_time column and test saving
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize SQLAlchemy
db = SQLAlchemy()
db.init_app(app)

def debug_budget_reset_time():
    """Debug budget_reset_time functionality"""
    
    print("🔍 Debugging budget_reset_time functionality...")
    
    with app.app_context():
        try:
            # Check if column exists
            result = db.session.execute(db.text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'boards' AND column_name = 'budget_reset_time';
            """))
            
            column_info = result.fetchone()
            
            if column_info:
                print(f"✅ Column exists: {column_info[0]} ({column_info[1]})")
            else:
                print("❌ Column does not exist - adding it...")
                db.session.execute(db.text("""
                    ALTER TABLE boards 
                    ADD COLUMN budget_reset_time TIME;
                """))
                db.session.commit()
                print("✅ Column added!")
            
            # Test updating a board with time
            print("\n🧪 Testing board update with time...")
            
            # Get first board
            result = db.session.execute(db.text("SELECT id, name FROM boards LIMIT 1;"))
            board = result.fetchone()
            
            if board:
                board_id, board_name = board
                print(f"📋 Testing with board: {board_name} (ID: {board_id})")
                
                # Update with time
                db.session.execute(db.text("""
                    UPDATE boards 
                    SET budget_reset_time = :time 
                    WHERE id = :board_id;
                """), {"time": "14:30", "board_id": board_id})
                
                db.session.commit()
                print("✅ Updated board with time 14:30")
                
                # Check if it was saved
                result = db.session.execute(db.text("""
                    SELECT budget_reset_time FROM boards WHERE id = :board_id;
                """), {"board_id": board_id})
                
                saved_time = result.fetchone()
                if saved_time:
                    print(f"✅ Time saved successfully: {saved_time[0]}")
                else:
                    print("❌ Time not found after save")
            else:
                print("❌ No boards found to test with")
                
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()
            return False
        finally:
            db.session.close()

if __name__ == "__main__":
    success = debug_budget_reset_time()
    if success:
        print("\n🎉 Debug completed!")
        sys.exit(0)
    else:
        print("\n💥 Debug failed!")
        sys.exit(1)
