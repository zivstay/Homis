# Heroku Deployment Guide for Homis Backend

This guide walks you through deploying the Homis expense manager backend to Heroku using the standard Python buildpack with Gunicorn.

## Prerequisites

1. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
2. Git installed
3. Heroku account created

## Files Created for Deployment

- `Procfile` - Defines how Heroku runs your app with Gunicorn
- `runtime.txt` - Specifies Python version
- `wsgi.py` - WSGI entry point for production
- `app.json` - Heroku app configuration and environment variables
- `requirements.txt` - Updated with production dependencies (gunicorn, psutil)

## Deployment Steps

### Option 1: Quick Deploy with Heroku Button

1. Push your code to GitHub
2. Add a "Deploy to Heroku" button to your README:
```markdown
[![Deploy](https://www.herokuapp.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/your-username/your-repo)
```

### Option 2: Manual Deployment

1. **Login to Heroku**:
```bash
heroku login
```

2. **Create a new Heroku app**:
```bash
cd backend
heroku create your-app-name
```

3. **Set environment variables**:
```bash
# Required variables
heroku config:set SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
heroku config:set JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
heroku config:set FLASK_ENV=production

# Optional variables
heroku config:set CORS_ORIGINS="https://your-frontend-domain.com,https://your-app.vercel.app"
heroku config:set UPLOAD_METHOD=local

# If using Backblaze B2 for file storage
heroku config:set B2_APPLICATION_KEY_ID=your-key-id
heroku config:set B2_APPLICATION_KEY=your-application-key
heroku config:set B2_BUCKET_NAME=your-bucket-name
heroku config:set B2_BUCKET_ID=your-bucket-id
heroku config:set UPLOAD_METHOD=b2
```

4. **Deploy the application**:
```bash
git add .
git commit -m "Add Heroku deployment files"
git push heroku main
```

5. **Open your app**:
```bash
heroku open
```



## Environment Variables

Set these in the Heroku dashboard or via CLI:

### Required
- `SECRET_KEY` - Flask secret key for sessions
- `JWT_SECRET_KEY` - JWT token signing key
- `FLASK_ENV` - Set to "production"

### Optional
- `CORS_ORIGINS` - Comma-separated allowed origins
- `DATABASE_PATH` - JSON database file path (default: expenses_db.json)
- `UPLOAD_METHOD` - "local" or "b2" for file storage
- `RATELIMIT_DEFAULT` - Rate limiting rules
- `B2_*` variables - For Backblaze B2 integration

## Database Considerations

The app uses TinyDB with JSON file storage. For production:

1. **File Storage**: Heroku's ephemeral filesystem means files are lost on dyno restart
2. **Recommended**: Use PostgreSQL addon for persistent storage:
```bash
heroku addons:create heroku-postgresql:mini
```

3. **Migration**: You'll need to modify the app to use PostgreSQL instead of JSON files

## Monitoring and Logs

- **View logs**: `heroku logs --tail`
- **Monitor app**: Use Heroku dashboard or CLI
- **Health check**: Visit `/api/health` endpoint

## Scaling

- **Scale dynos**: `heroku ps:scale web=1`
- **Upgrade dyno type**: Change in Heroku dashboard

## Troubleshooting

### Common Issues

1. **Port binding errors**: Ensure the app uses `$PORT` environment variable
2. **Static files**: Configure static file serving for production
3. **Database persistence**: Consider PostgreSQL for production data
4. **CORS errors**: Set appropriate `CORS_ORIGINS`

### Debug Commands

```bash
# Check dyno status
heroku ps

# View configuration
heroku config

# Restart dynos
heroku restart

# Run one-off commands
heroku run python clean_db_simple.py
```

## Production Recommendations

1. **Use PostgreSQL** instead of JSON files
2. **Set up monitoring** with Heroku metrics or external services
3. **Configure logging** for better debugging
4. **Use Redis** for rate limiting storage
5. **Set up backup strategy** for database
6. **Configure SSL** and security headers
7. **Monitor costs** and optimize dyno usage

## Security Notes

- Never commit sensitive environment variables to Git
- Use strong, randomly generated secret keys
- Configure CORS properly for your frontend domains
- Consider implementing additional security headers
- Regular security updates for dependencies

## Support

For deployment issues:
- Check Heroku documentation
- Review application logs
- Test locally with production configuration
- Consider using staging environment first