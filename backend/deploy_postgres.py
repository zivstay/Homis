#!/usr/bin/env python3
"""
PostgreSQL deployment script for Heroku.
This script helps automate the PostgreSQL deployment process.
"""
import os
import sys
import subprocess
import time

def run_command(command, description=None):
    """Run a shell command and return success status"""
    if description:
        print(f"🔧 {description}...")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout.strip())
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stderr:
            print(f"Error details: {e.stderr.strip()}")
        return False

def check_heroku_cli():
    """Check if Heroku CLI is installed"""
    print("🔍 Checking Heroku CLI...")
    return run_command("heroku --version", "Checking Heroku CLI")

def check_git():
    """Check if git is available and repo is initialized"""
    print("🔍 Checking Git...")
    if not run_command("git --version", "Checking Git"):
        return False
    
    if not run_command("git status", "Checking Git repository"):
        print("💡 Make sure you're in a Git repository directory")
        return False
    
    return True

def add_postgres_addon():
    """Add PostgreSQL addon to Heroku"""
    print("🐘 Adding PostgreSQL addon...")
    success = run_command("heroku addons:create heroku-postgresql:hobby-dev", "Adding PostgreSQL addon")
    
    if success:
        print("⏳ Waiting for database to be ready...")
        time.sleep(10)  # Wait for database to be provisioned
        
        # Check database URL
        run_command("heroku config:get DATABASE_URL", "Getting database URL")
    
    return success

def deploy_code():
    """Deploy code to Heroku"""
    print("🚀 Deploying code to Heroku...")
    
    # Add all changes
    if not run_command("git add .", "Adding changes to Git"):
        return False
    
    # Commit changes
    commit_msg = "Add PostgreSQL support for Homis backend"
    if not run_command(f'git commit -m "{commit_msg}"', "Committing changes"):
        print("ℹ️  No changes to commit or already committed")
    
    # Push to Heroku
    return run_command("git push heroku main", "Pushing to Heroku")

def initialize_database():
    """Initialize the PostgreSQL database on Heroku"""
    print("🗄️ Initializing database...")
    
    success = run_command("heroku run python init_db.py init", "Initializing database")
    
    if success:
        # Check database status
        run_command("heroku run python init_db.py check", "Checking database status")
    
    return success

def migrate_data():
    """Migrate data from TinyDB to PostgreSQL"""
    answer = input("📤 Do you want to migrate existing data from TinyDB? (y/N): ")
    
    if answer.lower() == 'y':
        print("📋 Migrating data...")
        
        # Create backup first
        if run_command("python migrate_data.py backup", "Creating local backup"):
            # Run migration on Heroku
            return run_command("heroku run python migrate_data.py migrate", "Migrating data on Heroku")
    
    return True

def check_deployment():
    """Check if deployment was successful"""
    print("✅ Checking deployment...")
    
    # Check app status
    if not run_command("heroku ps", "Checking app status"):
        return False
    
    # Check logs for any errors
    print("📝 Recent logs:")
    run_command("heroku logs --tail --num=20", "Checking recent logs")
    
    return True

def main():
    """Main deployment function"""
    print("🚀 Homis PostgreSQL Deployment Script")
    print("=" * 50)
    
    # Pre-deployment checks
    if not check_heroku_cli():
        print("❌ Please install Heroku CLI first: https://devcenter.heroku.com/articles/heroku-cli")
        return False
    
    if not check_git():
        print("❌ Git is required for deployment")
        return False
    
    # Check if we're in a Heroku app
    app_name = subprocess.run("heroku apps:info --json", shell=True, capture_output=True, text=True)
    if app_name.returncode != 0:
        print("❌ Not in a Heroku app directory. Run 'heroku create your-app-name' first")
        return False
    
    # Step 1: Add PostgreSQL addon
    print("\n📦 Step 1: Adding PostgreSQL addon")
    if not add_postgres_addon():
        print("❌ Failed to add PostgreSQL addon")
        return False
    
    # Step 2: Deploy code
    print("\n🚀 Step 2: Deploying application code")
    if not deploy_code():
        print("❌ Failed to deploy code")
        return False
    
    # Step 3: Initialize database
    print("\n🗄️ Step 3: Initializing database")
    if not initialize_database():
        print("❌ Failed to initialize database")
        return False
    
    # Step 4: Migrate data (optional)
    print("\n📤 Step 4: Data migration (optional)")
    if not migrate_data():
        print("❌ Failed to migrate data")
        return False
    
    # Step 5: Check deployment
    print("\n✅ Step 5: Checking deployment")
    if not check_deployment():
        print("⚠️  Deployment may have issues, check logs")
    
    print("\n🎉 PostgreSQL deployment completed!")
    print("💡 Your app is now using PostgreSQL database")
    print("📊 Check your database: heroku pg:info")
    print("🔍 Monitor logs: heroku logs --tail")
    
    return True

if __name__ == '__main__':
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'check':
            check_heroku_cli()
            check_git()
        elif command == 'addon':
            add_postgres_addon()
        elif command == 'deploy':
            deploy_code()
        elif command == 'init':
            initialize_database()
        elif command == 'migrate':
            migrate_data()
        elif command == 'status':
            check_deployment()
        else:
            print("Usage: python deploy_postgres.py [check|addon|deploy|init|migrate|status]")
            print("  check   - Check prerequisites")
            print("  addon   - Add PostgreSQL addon")
            print("  deploy  - Deploy code to Heroku")
            print("  init    - Initialize database")
            print("  migrate - Migrate existing data")
            print("  status  - Check deployment status")
            print("  (no args) - Run full deployment process")
    else:
        main()