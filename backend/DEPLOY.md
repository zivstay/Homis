# Simple Heroku Deployment - Homis Backend

Quick deployment guide for the Homis expense manager backend using Heroku's Python buildpack and Gunicorn.

## Files for Deployment

✅ `Procfile` - Runs your app with Gunicorn  
✅ `runtime.txt` - Python 3.11.7  
✅ `wsgi.py` - Production entry point  
✅ `requirements.txt` - Includes Gunicorn  
✅ `app.json` - One-click deploy configuration  

## Quick Deploy Steps

### 1. Login to Heroku
```bash
heroku login
```

### 2. Create App
```bash
cd backend
heroku create your-app-name
```

### 3. Set Required Environment Variables
```bash
# Generate secure keys
heroku config:set SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
heroku config:set JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
heroku config:set FLASK_ENV=production
```

### 4. Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 5. Test
```bash
heroku open
# Visit: /api/health
```

## Optional Configuration

### CORS for Frontend
```bash
heroku config:set CORS_ORIGINS="https://your-frontend-domain.com"
```

### File Storage (Backblaze B2)
```bash
heroku config:set UPLOAD_METHOD=b2
heroku config:set B2_APPLICATION_KEY_ID=your-key-id
heroku config:set B2_APPLICATION_KEY=your-application-key
heroku config:set B2_BUCKET_NAME=your-bucket-name
heroku config:set B2_BUCKET_ID=your-bucket-id
```

## Monitoring

```bash
# View logs
heroku logs --tail

# Check status
heroku ps

# Restart if needed
heroku restart
```

## One-Click Deploy

Add this button to your GitHub README:

```markdown
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/your-username/your-repo)
```

That's it! Your API will be running at `https://your-app-name.herokuapp.com`