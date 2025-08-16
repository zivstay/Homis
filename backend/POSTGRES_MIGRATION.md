# PostgreSQL Migration Guide

This guide explains how to migrate your Homis application from TinyDB (SQLite) to PostgreSQL for Heroku deployment.

## Overview

The application now supports both TinyDB (SQLite) and PostgreSQL databases. The database type is determined by the `DATABASE_URL` environment variable:

- If `DATABASE_URL` contains `postgresql://` or `postgres://` → PostgreSQL is used
- Otherwise → TinyDB (SQLite) is used for backward compatibility

## Files Added

### Core Files
- `postgres_models.py` - SQLAlchemy models and PostgreSQL database manager
- `init_db.py` - Database initialization script
- `migrate_data.py` - Data migration script from TinyDB to PostgreSQL
- `migrations_config.py` - Flask-Migrate configuration

### Updated Files
- `requirements.txt` - Added PostgreSQL dependencies
- `config.py` - Added PostgreSQL configuration
- `app.py` - Added conditional database initialization

## Local Development Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Local PostgreSQL (Optional)

For local testing with PostgreSQL:

```bash
# Install PostgreSQL locally (example for Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create a database
sudo -u postgres createdb homis_dev

# Set environment variable
export DATABASE_URL="postgresql://postgres:password@localhost/homis_dev"
```

### 3. Initialize Database

```bash
# Initialize PostgreSQL database
python init_db.py init

# Or check database status
python init_db.py check
```

### 4. Migrate Existing Data (if you have TinyDB data)

```bash
# Create backup first
python migrate_data.py backup

# Migrate data to PostgreSQL
python migrate_data.py migrate
```

## Heroku Deployment

### 1. Add PostgreSQL Add-on

```bash
# Add Heroku Postgres (Hobby Dev - free tier)
heroku addons:create heroku-postgresql:hobby-dev

# Check the database URL
heroku config:get DATABASE_URL
```

### 2. Initialize Database on Heroku

```bash
# Run database initialization
heroku run python init_db.py init

# Check database status
heroku run python init_db.py check
```

### 3. Migrate Data (if you have existing data)

If you have existing data in your current Heroku deployment:

```bash
# First, backup your current data locally
python migrate_data.py backup

# Then migrate to PostgreSQL on Heroku
heroku run python migrate_data.py migrate
```

### 4. Deploy Application

```bash
git add .
git commit -m "Add PostgreSQL support"
git push heroku main
```

## Environment Variables

### Required for PostgreSQL

```bash
# Heroku automatically sets this when you add the postgres add-on
DATABASE_URL=postgresql://user:password@host:port/database
```

### Optional (will fallback to TinyDB if not set)

```bash
# For local development
SQLALCHEMY_DATABASE_URI=postgresql://postgres:password@localhost/homis_dev

# Flask environment
FLASK_ENV=production  # or development
```

## Database Management Commands

### Initialize Database
```bash
python init_db.py init
```

### Reset Database (⚠️ Destructive)
```bash
python init_db.py reset
```

### Check Database Status
```bash
python init_db.py check
```

### Backup TinyDB Data
```bash
python migrate_data.py backup
```

### Migrate Data from TinyDB to PostgreSQL
```bash
python migrate_data.py migrate
```

## Migration Features

### Automatic Database Detection
The application automatically detects which database to use based on the `DATABASE_URL`:

```python
# In app.py
database_url = app.config.get('DATABASE_URL')
use_postgres = database_url and ('postgresql://' in database_url or 'postgres://' in database_url)

if use_postgres:
    # Use PostgreSQL with SQLAlchemy
    postgres_db.init_app(app)
    db_manager = PostgreSQLDatabaseManager(app)
else:
    # Use TinyDB (backward compatibility)
    db_manager = DatabaseManager(app.config['DATABASE_PATH'])
```

### Data Compatibility
The PostgreSQL models maintain full compatibility with the existing TinyDB data structure:

- All dataclasses remain unchanged
- API responses are identical
- Data migration preserves all relationships
- Same business logic and validation

### Schema Features
The PostgreSQL schema includes:

- **Primary Keys**: UUID strings for all entities
- **Foreign Keys**: Proper relationships between tables
- **Indexes**: Optimized queries for email, username, board access
- **JSON Fields**: Settings, permissions, tags stored as JSON
- **Timestamps**: Automatic created_at/updated_at handling
- **Constraints**: Data integrity and validation

## Heroku PostgreSQL Limits

### Hobby Dev Plan (Free)
- 10,000 rows
- 1 GB storage
- 20 connections
- No backups

### Hobby Basic Plan ($9/month)
- 10,000,000 rows
- 10 GB storage
- 20 connections
- Daily backups

## Troubleshooting

### Database Connection Issues

```bash
# Check Heroku database status
heroku pg:info

# Check database URL
heroku config:get DATABASE_URL

# Test database connection
heroku run python init_db.py check
```

### Migration Issues

```bash
# Check if TinyDB file exists
ls -la expenses_db.json*

# Verify PostgreSQL tables
heroku run python -c "from postgres_models import *; from flask import Flask; app = Flask(__name__); app.config['SQLALCHEMY_DATABASE_URI'] = 'your_url'; db.init_app(app); print('Tables:', db.engine.table_names())"
```

### Common Errors

1. **"relation does not exist"** - Run `python init_db.py init`
2. **"database does not exist"** - Check DATABASE_URL and ensure Postgres add-on is added
3. **"permission denied"** - Check database user permissions
4. **"too many connections"** - Restart your Heroku dynos or upgrade plan

## Performance Considerations

### Indexing
The PostgreSQL schema includes indexes on:
- `users.email`
- `users.username`
- `board_members.user_id`
- `board_members.board_id`
- `expenses.board_id`
- `expenses.date`

### Connection Pooling
SQLAlchemy is configured with:
- `pool_pre_ping=True` - Validates connections
- `pool_recycle=300` - Recycles connections every 5 minutes

### Query Optimization
- Uses SQLAlchemy ORM with lazy loading
- Proper JOIN queries for relationships
- Pagination for large datasets (if needed)

## Rollback Plan

If you need to rollback to TinyDB:

1. Remove or comment out `DATABASE_URL` environment variable
2. Restore from TinyDB backup if needed
3. Restart the application

The application will automatically fall back to TinyDB mode.

## Next Steps

After successful migration:

1. Monitor database performance in Heroku dashboard
2. Set up regular backups (available in paid plans)
3. Consider upgrading to Hobby Basic plan if you exceed free tier limits
4. Monitor connection usage and optimize queries if needed

## Support

For migration issues:
1. Check the troubleshooting section above
2. Review Heroku logs: `heroku logs --tail`
3. Test database connectivity: `heroku run python init_db.py check`