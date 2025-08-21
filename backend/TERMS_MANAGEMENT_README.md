# Terms and Conditions Management System

This document explains how to use the new Terms and Conditions management system in Homis.

## Overview

The system now supports versioned terms and conditions stored in the database. Users must sign the latest version, and the app will automatically prompt them when new versions are available.

## Database Changes

### New Table: `terms_versions`
- `id`: Unique identifier
- `version_number`: Integer version number (1, 2, 3...)
- `title`: Title of the terms
- `content_hebrew`: Hebrew HTML content
- `content_english`: English HTML content
- `created_at`: Creation timestamp
- `created_by`: User who created this version
- `is_active`: Only one version can be active at a time
- `change_description`: Optional description of changes

### Updated Table: `users`
- `terms_version_signed`: Integer indicating which version the user signed (NULL if not signed)

## Setup Instructions

### 1. Update Database Schema

Run the database migration script:

```bash
cd backend
python fix_database.py
```

This will:
- Add the `terms_version_signed` column to the `users` table
- Create the new `terms_versions` table
- Migrate existing data

### 2. Upload Initial Terms

Upload your first version of terms and conditions:

```bash
# Method 1: Use the demo script
chmod +x demo_upload_terms.sh
./demo_upload_terms.sh

# Method 2: Use the upload script directly
python upload_terms.py --hebrew sample_terms_he.html --english sample_terms_en.html --title "תנאי שימוש v1.0" --description "Initial terms"
```

### 3. Test the System

Start your Flask app and test the endpoints:

- **Hebrew terms**: `GET /terms/he`
- **English terms**: `GET /terms/en`  
- **Default terms**: `GET /terms`
- **Latest terms info**: `GET /api/terms/latest`
- **User terms status**: `GET /api/auth/terms-status` (requires auth)
- **Accept terms**: `POST /api/auth/accept-terms` (requires auth)

## API Endpoints

### Public Endpoints

#### `GET /terms/latest`
Get information about the latest terms version.

**Response:**
```json
{
  "version_number": 1,
  "title": "תנאי שימוש v1.0",
  "created_at": "2024-12-15T10:00:00",
  "change_description": "Initial terms",
  "endpoints": {
    "hebrew": "/terms/he",
    "english": "/terms/en", 
    "default": "/terms"
  }
}
```

#### `GET /terms`, `GET /terms/he`, `GET /terms/en`
Get the HTML content of the latest terms in Hebrew or English.

### Protected Endpoints (Require Authentication)

#### `GET /api/auth/terms-status`
Check if the current user has signed the latest terms.

**Response:**
```json
{
  "user_terms_status": {
    "accepted_terms": true,
    "terms_accepted_at": "2024-12-15T10:00:00",
    "terms_version_signed": 1,
    "is_up_to_date": true
  },
  "latest_terms": {
    "version_number": 1,
    "title": "תנאי שימוש v1.0",
    "created_at": "2024-12-15T10:00:00",
    "change_description": "Initial terms"
  },
  "requires_acceptance": false
}
```

#### `POST /api/auth/accept-terms`
Accept the latest terms version.

**Response:**
```json
{
  "message": "Terms accepted successfully",
  "accepted_at": "2024-12-15T10:00:00",
  "terms_version_signed": 1
}
```

## Upload Script Usage

The `upload_terms.py` script allows you to upload new versions of terms:

```bash
python upload_terms.py --help

# Basic usage
python upload_terms.py --hebrew terms_he.html --english terms_en.html

# With title and description
python upload_terms.py \
  --hebrew terms_he.html \
  --english terms_en.html \
  --title "תנאי שימוש v2.0" \
  --description "Updated privacy policy section"
```

### Script Features:
- Automatically increments version number
- Deactivates previous versions
- Validates HTML files
- Shows upload progress and verification

## Frontend Integration

The React Native app now:

1. **Checks terms status on login** - Automatically checks if user needs to sign new terms
2. **Shows modal when required** - Forces user to accept new terms before using the app
3. **Blocks app usage** - User cannot close the terms modal until they accept
4. **Supports both languages** - Hebrew and English terms with language toggle

### Key Components:

- `TermsAndConditionsModal.tsx` - Updated modal component
- `App.tsx` - Terms checking logic in `AppContent`
- `config/api.ts` - New API endpoints configuration

## User Flow

### New Users:
1. Register account with `terms_version_signed: NULL`
2. On first app use, terms modal appears
3. User must accept terms to continue
4. `terms_version_signed` is set to current version

### Existing Users (New Terms Version):
1. Developer uploads new terms version
2. User opens app
3. App checks terms status via API
4. If user's signed version < latest version:
   - Terms modal appears automatically
   - User must accept new terms
   - App updates `terms_version_signed`

## Development Workflow

### Updating Terms:

1. **Create new HTML files** with updated content
2. **Upload using script**:
   ```bash
   python upload_terms.py --hebrew new_terms_he.html --english new_terms_en.html --title "תנאי שימוש v2.0" --description "Updated for new features"
   ```
3. **Test in app** - All users will be prompted to accept new terms
4. **Monitor acceptance** - Check database for user acceptance rates

### Testing:

1. **Backend testing**:
   ```bash
   # Test endpoints
   curl http://localhost:5000/terms/latest
   curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/auth/terms-status
   ```

2. **Frontend testing**:
   - Reset user's `terms_version_signed` to NULL in database
   - Open app to see terms modal
   - Test acceptance flow

## Database Queries

### Check user terms status:
```sql
SELECT u.email, u.terms_version_signed, tv.version_number as latest_version
FROM users u
CROSS JOIN (SELECT version_number FROM terms_versions WHERE is_active = true ORDER BY version_number DESC LIMIT 1) tv
WHERE u.email = 'user@example.com';
```

### Get users who need to accept new terms:
```sql
SELECT u.email, u.terms_version_signed, tv.version_number as latest_version
FROM users u
CROSS JOIN (SELECT version_number FROM terms_versions WHERE is_active = true ORDER BY version_number DESC LIMIT 1) tv
WHERE u.terms_version_signed IS NULL OR u.terms_version_signed < tv.version_number;
```

### Get terms acceptance statistics:
```sql
SELECT 
  tv.version_number as latest_version,
  COUNT(CASE WHEN u.terms_version_signed = tv.version_number THEN 1 END) as signed_latest,
  COUNT(CASE WHEN u.terms_version_signed < tv.version_number OR u.terms_version_signed IS NULL THEN 1 END) as needs_update,
  COUNT(*) as total_users
FROM users u
CROSS JOIN (SELECT version_number FROM terms_versions WHERE is_active = true ORDER BY version_number DESC LIMIT 1) tv
GROUP BY tv.version_number;
```

## Security Notes

- Terms content is stored as HTML in the database
- HTML is served directly to browsers (ensure content is safe)
- User acceptance is tracked with timestamps and version numbers
- Only authenticated users can check/accept terms
- Terms acceptance is required for app functionality

## Troubleshooting

### Common Issues:

1. **"No active terms version found"**
   - Solution: Upload terms using the upload script

2. **"Terms modal doesn't appear"**
   - Check user's `terms_version_signed` in database
   - Verify API endpoints are working
   - Check React Native console logs

3. **"Upload script fails"**
   - Ensure you're in the backend directory
   - Check database connection
   - Verify HTML files exist and are valid

4. **"Database migration fails"**
   - Run `fix_database.py` manually
   - Check PostgreSQL connection
   - Verify table permissions

### Debug Commands:

```bash
# Check database schema
python -c "
from postgres_models import db, TermsVersion, User
from app import create_app
app = create_app()
with app.app_context():
    print('Terms versions:')
    for t in TermsVersion.query.all():
        print(f'  v{t.version_number}: {t.title} (active: {t.is_active})')
"

# Check user terms status
python -c "
from postgres_models import db, User
from app import create_app
app = create_app()
with app.app_context():
    user = User.query.filter_by(email='YOUR_EMAIL').first()
    if user:
        print(f'User signed version: {user.terms_version_signed}')
    else:
        print('User not found')
"
```

## Next Steps

1. **Monitor user acceptance** rates after uploading new terms
2. **Add admin dashboard** to view terms statistics
3. **Implement email notifications** for terms updates
4. **Add terms diff view** to show what changed between versions
5. **Consider legal review** process for terms updates
