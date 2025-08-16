# Quick PostgreSQL Setup for Heroku

## TL;DR - For Heroku Deployment

### 1. Add PostgreSQL to Heroku
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

### 2. Deploy Your Updated Code
```bash
git add .
git commit -m "Add PostgreSQL support"
git push heroku main
```

### 3. Initialize Database
```bash
heroku run python init_db.py init
```

### 4. (Optional) Migrate Existing Data
```bash
heroku run python migrate_data.py migrate
```

That's it! Your app is now using PostgreSQL. 🎉

## Automated Deployment

Run the automated deployment script:
```bash
python deploy_postgres.py
```

This will guide you through all the steps automatically.

## What Changed

✅ **Added PostgreSQL support** - Your app now automatically detects and uses PostgreSQL when `DATABASE_URL` is set  
✅ **Backward compatible** - Still works with TinyDB if no PostgreSQL is configured  
✅ **Data migration** - Script to migrate existing TinyDB data to PostgreSQL  
✅ **Heroku ready** - Optimized for Heroku PostgreSQL addon  

## Files Added
- `postgres_models.py` - PostgreSQL database models
- `init_db.py` - Database initialization script
- `migrate_data.py` - Data migration script
- `deploy_postgres.py` - Automated deployment script
- `POSTGRES_MIGRATION.md` - Detailed documentation

## Environment Variables

Your Heroku app will automatically get:
```
DATABASE_URL=postgresql://...
```

This tells the app to use PostgreSQL instead of TinyDB.

## Database Limits (Heroku)

**Free Tier (hobby-dev):**
- 10,000 rows
- 1 GB storage
- No backups

**$9/month (hobby-basic):**
- 10,000,000 rows  
- 10 GB storage
- Daily backups

## Troubleshooting

```bash
# Check database status
heroku run python init_db.py check

# Check app logs
heroku logs --tail

# Check database info
heroku pg:info
```

## Need Help?

1. Read the detailed guide: `POSTGRES_MIGRATION.md`
2. Use the automated script: `python deploy_postgres.py`
3. Check Heroku PostgreSQL docs: https://devcenter.heroku.com/articles/heroku-postgresql