"""
Complete shopping list migration script
Creates and upgrades:
- shopping_lists: Multiple shopping lists per board
- shopping_list_items: Items in shopping lists (with completion status)
- shopping_list_quick_items: Quick access items (unlimited per board)
Handles migration from old structure to new structure
"""

import os
import sys
from sqlalchemy import text, inspect
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import config
from postgres_models import db, ShoppingList, ShoppingListItem, ShoppingListQuickItem
from flask import Flask

# Load environment variables
load_dotenv()


def create_complete_shopping_list_tables(app):
    """Create and upgrade shopping list tables to complete structure"""
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("🔍 Checking existing tables...")
        print(f"   Found tables: {existing_tables}")
        
        try:
            print("\n📝 Creating/Upgrading shopping list tables...")
            
            # Step 1: Create shopping_lists table if it doesn't exist
            if 'shopping_lists' not in existing_tables:
                print("   Creating shopping_lists table...")
                create_lists_table = text("""
                    CREATE TABLE IF NOT EXISTS shopping_lists (
                        id VARCHAR(255) PRIMARY KEY,
                        board_id VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        date DATE,
                        created_by VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                db.session.execute(create_lists_table)
                
                # Create index
                create_lists_index = text("""
                    CREATE INDEX IF NOT EXISTS idx_shopping_lists_board_id 
                    ON shopping_lists(board_id)
                """)
                db.session.execute(create_lists_index)
                print("   ✅ shopping_lists table created")
            else:
                print("   ⏭️  shopping_lists table already exists")
            
            # Step 2: Handle shopping_list_items table
            if 'shopping_list_items' in existing_tables:
                print("\n🔄 Checking shopping_list_items structure...")
                
                # Get current columns
                columns_result = db.session.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'shopping_list_items'
                    ORDER BY ordinal_position
                """))
                existing_columns = [row[0] for row in columns_result.fetchall()]
                print(f"   Current columns: {existing_columns}")
                
                has_board_id = 'board_id' in existing_columns
                has_shopping_list_id = 'shopping_list_id' in existing_columns
                has_description = 'description' in existing_columns
                
                if has_board_id and not has_shopping_list_id:
                    print("   ⚠️  Old structure detected - migrating data...")
                    
                    # Create default lists for existing items
                    print("   Creating default lists for existing items...")
                    
                    # Get all unique board_ids from shopping_list_items
                    result = db.session.execute(text("""
                        SELECT DISTINCT board_id, created_by 
                        FROM shopping_list_items 
                        GROUP BY board_id, created_by
                    """))
                    boards_with_items = result.fetchall()
                    
                    if boards_with_items:
                        for board_id, created_by in boards_with_items:
                            # Create a default shopping list for this board
                            list_id = str(__import__('uuid').uuid4())
                            db.session.execute(text("""
                                INSERT INTO shopping_lists 
                                (id, board_id, name, created_by, created_at, updated_at, is_active)
                                VALUES (:id, :board_id, 'רשימת קניות ראשית', :created_by, NOW(), NOW(), TRUE)
                            """), {
                                'id': list_id,
                                'board_id': board_id,
                                'created_by': created_by
                            })
                            print(f"   ✅ Created default list for board {board_id}")
                    
                    # Add new columns to existing table
                    print("   Adding new columns...")
                    
                    if not has_shopping_list_id:
                        db.session.execute(text("""
                            ALTER TABLE shopping_list_items 
                            ADD COLUMN shopping_list_id VARCHAR(255)
                        """))
                        print("   ✅ Added shopping_list_id column")
                    
                    if not has_description:
                        db.session.execute(text("""
                            ALTER TABLE shopping_list_items 
                            ADD COLUMN description TEXT
                        """))
                        print("   ✅ Added description column")
                    
                    # Migrate existing items to default lists
                    print("   Migrating existing items to default lists...")
                    db.session.execute(text("""
                        UPDATE shopping_list_items sli
                        SET shopping_list_id = (
                            SELECT id FROM shopping_lists sl 
                            WHERE sl.board_id = sli.board_id 
                            LIMIT 1
                        )
                        WHERE shopping_list_id IS NULL
                    """))
                    print("   ✅ Migrated items to lists")
                    
                    # Make shopping_list_id NOT NULL
                    db.session.execute(text("""
                        ALTER TABLE shopping_list_items 
                        ALTER COLUMN shopping_list_id SET NOT NULL
                    """))
                    print("   ✅ Set shopping_list_id as NOT NULL")
                    
                    # Add foreign key constraint
                    db.session.execute(text("""
                        ALTER TABLE shopping_list_items 
                        ADD CONSTRAINT fk_shopping_list_items_list_id 
                        FOREIGN KEY (shopping_list_id) 
                        REFERENCES shopping_lists(id) 
                        ON DELETE CASCADE
                    """))
                    print("   ✅ Added foreign key constraint")
                    
                    # Drop old board_id column and constraint
                    print("   Removing old board_id column...")
                    db.session.execute(text("""
                        ALTER TABLE shopping_list_items 
                        DROP CONSTRAINT IF EXISTS shopping_list_items_board_id_fkey
                    """))
                    db.session.execute(text("""
                        ALTER TABLE shopping_list_items 
                        DROP COLUMN IF EXISTS board_id
                    """))
                    print("   ✅ Removed board_id column")
                    
                elif not has_shopping_list_id:
                    print("   🗑️  Dropping and recreating shopping_list_items table...")
                    db.session.execute(text("DROP TABLE IF EXISTS shopping_list_items CASCADE"))
                    
                    # Create new table with correct structure
                    print("   Creating shopping_list_items table with correct structure...")
                    create_items_table = text("""
                        CREATE TABLE shopping_list_items (
                            id VARCHAR(255) PRIMARY KEY,
                            shopping_list_id VARCHAR(255) NOT NULL,
                            item_name VARCHAR(255) NOT NULL,
                            description TEXT,
                            is_completed BOOLEAN NOT NULL DEFAULT FALSE,
                            created_by VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            completed_at TIMESTAMP NULL,
                            completed_by VARCHAR(255) NULL,
                            FOREIGN KEY (shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
                            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                            FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
                        )
                    """)
                    db.session.execute(create_items_table)
                    print("   ✅ shopping_list_items table created")
                else:
                    print("   ✅ Structure already correct")
                    
                    # Just add description if missing
                    if not has_description:
                        db.session.execute(text("""
                            ALTER TABLE shopping_list_items 
                            ADD COLUMN description TEXT
                        """))
                        print("   ✅ Added description column")
            else:
                print("   Creating shopping_list_items table...")
                create_items_table = text("""
                    CREATE TABLE shopping_list_items (
                        id VARCHAR(255) PRIMARY KEY,
                        shopping_list_id VARCHAR(255) NOT NULL,
                        item_name VARCHAR(255) NOT NULL,
                        description TEXT,
                        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
                        created_by VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP NULL,
                        completed_by VARCHAR(255) NULL,
                        FOREIGN KEY (shopping_list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
                    )
                """)
                db.session.execute(create_items_table)
                print("   ✅ shopping_list_items table created")
            
            # Step 3: Handle shopping_list_quick_items table
            if 'shopping_list_quick_items' not in existing_tables:
                print("   Creating shopping_list_quick_items table...")
                create_quick_items_table = text("""
                    CREATE TABLE shopping_list_quick_items (
                        id VARCHAR(255) PRIMARY KEY,
                        board_id VARCHAR(255) NOT NULL,
                        item_name VARCHAR(255) NOT NULL,
                        icon VARCHAR(10) NULL,
                        display_order INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
                    )
                """)
                db.session.execute(create_quick_items_table)
                print("   ✅ shopping_list_quick_items table created")
            else:
                print("   ⏭️  shopping_list_quick_items table already exists")
                
                # Check if icon column exists and add it if missing
                columns_result = db.session.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'shopping_list_quick_items' 
                    AND column_name = 'icon'
                """))
                
                if not columns_result.fetchone():
                    print("   Adding icon column to shopping_list_quick_items...")
                    add_icon_column = text("""
                        ALTER TABLE shopping_list_quick_items 
                        ADD COLUMN icon VARCHAR(10) NULL
                    """)
                    db.session.execute(add_icon_column)
                    print("   ✅ Icon column added to shopping_list_quick_items")
                else:
                    print("   ✅ Icon column already exists in shopping_list_quick_items")
            
            # Create indexes for better performance
            print("\n📝 Creating indexes...")
            
            # Index on shopping_list_id for shopping_list_items
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_shopping_list_items_shopping_list_id 
                ON shopping_list_items(shopping_list_id)
            """))
            print("   ✅ Index on shopping_list_items.shopping_list_id created")
            
            # Index on created_by for shopping_list_items
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_shopping_list_items_created_by 
                ON shopping_list_items(created_by)
            """))
            print("   ✅ Index on shopping_list_items.created_by created")
            
            # Index on board_id for shopping_list_quick_items
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_shopping_list_quick_items_board_id 
                ON shopping_list_quick_items(board_id)
            """))
            print("   ✅ Index on shopping_list_quick_items.board_id created")
            
            # Commit all changes
            db.session.commit()
            print("\n✅ Migration completed successfully!")
            return True
            
        except Exception as e:
            print(f"\n❌ Error during migration: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return False


def main():
    """Main migration function"""
    print("🚀 Starting complete shopping list migration...")
    
    # Initialize Flask app
    app = Flask(__name__)
    
    # Use the config from environment
    env = os.getenv('FLASK_ENV', 'development')
    try:
        app_config = config[env]
        app.config.from_object(app_config)
    except Exception as e:
        print(f"⚠️  Configuration error: {e}")
        print("   Using default configuration...")
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///expenses.db')
        app.config['SECRET_KEY'] = 'dev-secret-key'
    
    # Initialize database
    db.init_app(app)
    
    # Run migration
    success = create_complete_shopping_list_tables(app)
    
    if success:
        print("\n✅ Shopping list migration completed successfully!")
        return 0
    else:
        print("\n❌ Shopping list migration failed!")
        return 1


if __name__ == '__main__':
    sys.exit(main())

