# Quick B2 Setup for Homis App

## Step 1: Create Your `.env` File

Create or update your `.env` file in the `backend` directory with these settings:

```bash
# Enable B2 storage
UPLOAD_METHOD=b2

# Your B2 credentials (replace with your actual values)
B2_APPLICATION_KEY_ID=your_actual_key_id_here
B2_APPLICATION_KEY=your_actual_application_key_here
B2_BUCKET_NAME=homis-bucket
B2_BUCKET_ID=your_actual_bucket_id_here
```

## Step 2: Set Up Your B2 Bucket

1. **Login to Backblaze B2**: https://secure.backblaze.com/b2_buckets.htm

2. **Create Bucket**:
   - Click "Create a Bucket"
   - **Bucket Name**: `homis-bucket` (if taken, try `homis-bucket-yourname` or `homis-bucket-2024`)
   - **Bucket Type**: Choose "Public" (recommended for direct image access)
   - Click "Create Bucket"

3. **Note Your Bucket ID**: After creation, you'll see the Bucket ID - copy this for your `.env` file

4. **Create Application Key**:
   - Go to "App Keys" tab
   - Click "Add a New Application Key"
   - **Key Name**: `homis-app-key`
   - **Allow access to Bucket(s)**: Select your `homis-bucket`
   - **Type of Access**: Select "Read and Write"
   - **Allow List All Bucket Names**: ✓ (checked)
   - Click "Create New Key"

5. **Save Your Credentials**: You'll see:
   - **Application Key ID** - copy to `B2_APPLICATION_KEY_ID`
   - **Application Key** - copy to `B2_APPLICATION_KEY`

## Step 3: Test Your Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start Your App**:
   ```bash
   python app.py
   ```

3. **Test Storage Info** (optional):
   ```bash
   # After logging in, call this endpoint to test B2 connection
   GET http://localhost:5000/api/admin/storage-info
   ```

## Your Final `.env` Should Look Like:

```bash
# Flask Configuration
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production

# Database
DATABASE_PATH=expenses_db.json

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# B2 Storage Configuration
UPLOAD_METHOD=b2
B2_APPLICATION_KEY_ID=0031a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9
B2_APPLICATION_KEY=K001a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
B2_BUCKET_NAME=homis-bucket
B2_BUCKET_ID=a1b2c3d4e5f6g7h8i9j0k1l2
```

## What Happens Next?

- ✅ New image uploads will go to your B2 bucket
- ✅ Images will be accessible via direct B2 URLs
- ✅ If B2 fails, uploads automatically fall back to local storage
- ✅ Existing local images continue to work normally

## Troubleshooting

If uploads fail:
1. Check your B2 credentials are correct
2. Verify bucket name matches exactly
3. Ensure your application key has Read/Write permissions
4. Check the app logs for specific error messages

The app will show messages like:
- ✅ `Successfully uploaded to B2: https://...`
- ❌ `B2 upload failed: ..., falling back to local storage`
