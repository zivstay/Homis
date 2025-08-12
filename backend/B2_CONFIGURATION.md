# Backblaze B2 Storage Configuration

This document explains how to configure the application to use Backblaze B2 for image storage instead of local file storage.

## Prerequisites

1. **Backblaze B2 Account**: You need a Backblaze B2 account
2. **B2 Bucket**: Create a bucket in your B2 account
3. **Application Keys**: Generate application keys with appropriate permissions

## Required Environment Variables

Add these environment variables to your `.env` file:

```bash
# Set upload method to use B2 storage
UPLOAD_METHOD=b2

# Backblaze B2 Configuration
B2_APPLICATION_KEY_ID=your_b2_application_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_NAME=homis-bucket
B2_BUCKET_ID=your_bucket_id_optional
```

## Getting Your B2 Credentials

### 1. Create a B2 Account
- Go to [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html)
- Sign up for an account

### 2. Create a Bucket
- Log into your B2 account
- Go to "Buckets" and create a new bucket
- **Bucket Name**: `homis-bucket` (or if this name is taken, use `homis-bucket-{your-suffix}`)
- **Bucket Type**: Choose "Public" for direct image access, or "Private" if you prefer controlled access
- **Region**: Choose the region closest to your users
- Note down the bucket name and bucket ID after creation

### 3. Create Application Keys
- Go to "App Keys" in your B2 account
- Create a new application key
- Choose appropriate permissions (listFiles, readFiles, writeFiles, deleteFiles)
- Note down the Key ID and Application Key

## Configuration Options

### Required Settings
- `UPLOAD_METHOD=b2` - Enables B2 storage
- `B2_APPLICATION_KEY_ID` - Your B2 application key ID
- `B2_APPLICATION_KEY` - Your B2 application key
- `B2_BUCKET_NAME` - Name of your B2 bucket

### Optional Settings
- `B2_BUCKET_ID` - Bucket ID for faster access (recommended)
- `B2_ENDPOINT_URL` - Custom endpoint URL (usually not needed)

## Installation

1. Install the B2 SDK:
   ```bash
   pip install -r requirements.txt
   ```

2. Set your environment variables in `.env` file

3. Restart your Flask application

## Testing the Configuration

You can test your B2 configuration by calling the admin endpoint:

```bash
GET /api/admin/storage-info
```

This will return information about your storage configuration and test the B2 connection.

## Fallback Behavior

The application is designed with fallback behavior:

1. **Primary**: If `UPLOAD_METHOD=b2` and B2 is properly configured, files will be uploaded to B2
2. **Fallback**: If B2 upload fails or is not configured, files will be saved locally

## File URLs

- **B2 Files**: Return direct B2 download URLs (e.g., `https://f000.backblazeb2.com/file/...`)
- **Local Files**: Return local API URLs (e.g., `/api/uploads/expense_images/...`)

## Security Considerations

1. **Bucket Permissions**: Make sure your bucket has appropriate public/private settings
2. **Application Key Permissions**: Use least-privilege principle for application keys
3. **Environment Variables**: Keep your B2 credentials secure and never commit them to version control

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your Key ID and Application Key are correct
   - Check that the application key has the required permissions

2. **Bucket Not Found**
   - Verify the bucket name is correct
   - Check that the bucket exists in the same region as your application key

3. **Upload Failures**
   - Check your application key has `writeFiles` permission
   - Verify the bucket allows file uploads

### Debug Mode

The application will log B2 operations to help with debugging:
- ✅ Successful uploads
- ❌ Failed uploads with error messages
- ⚠️ Fallback to local storage

## Migration from Local Storage

If you're migrating from local storage to B2:

1. Set up B2 configuration
2. New uploads will go to B2
3. Existing local files will continue to be served from local storage
4. Optionally, you can manually migrate existing files to B2

## Cost Considerations

- B2 charges for storage and bandwidth
- Consider your usage patterns and compare costs
- You can implement file lifecycle policies in B2 to manage costs