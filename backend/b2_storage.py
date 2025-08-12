"""
Backblaze B2 Storage Service
Handles file uploads to Backblaze B2 cloud storage
"""

import os
import uuid
import logging
from typing import Optional, Tuple
from io import BytesIO
from werkzeug.datastructures import FileStorage

try:
    # Try newer B2SDK versions first (2.0+)
    try:
        from b2sdk.v2 import InMemoryAccountInfo, B2Api
        from b2sdk.v2.exception import B2Error, BucketIdNotFound, NonExistentBucket
        B2_VERSION = "v2"
    except ImportError:
        # Fallback to v1
        try:
            from b2sdk.v1 import InMemoryAccountInfo, B2Api
            from b2sdk.v1.exception import B2Error, BucketIdNotFound, NonExistentBucket
            B2_VERSION = "v1"
        except ImportError:
            # Try older import style
            try:
                from b2sdk.account_info.in_memory import InMemoryAccountInfo
                from b2sdk.api import B2Api
                from b2sdk.exception import B2Error, BucketIdNotFound, NonExistentBucket
                B2_VERSION = "legacy"
            except ImportError:
                # Try even older import style
                from b2sdk.account_info import InMemoryAccountInfo
                from b2sdk.b2_api import B2Api
                from b2sdk.exception import B2Error, BucketIdNotFound, NonExistentBucket
                B2_VERSION = "old"
    
    B2_AVAILABLE = True
    logging.info(f"B2SDK loaded successfully (version compatibility: {B2_VERSION})")
except ImportError as e:
    B2_AVAILABLE = False
    B2_VERSION = None
    logging.warning(f"B2SDK not available. Install with: pip install b2sdk. Error: {e}")

# Use a more specific logger name to avoid conflicts
logger = logging.getLogger('b2_storage')

class B2StorageService:
    """Service for handling Backblaze B2 storage operations"""
    
    def __init__(self, application_key_id: str, application_key: str, 
                 bucket_name: str, bucket_id: Optional[str] = None):
        """
        Initialize B2 storage service
        
        Args:
            application_key_id: B2 application key ID
            application_key: B2 application key
            bucket_name: Name of the B2 bucket
            bucket_id: Optional bucket ID for faster access
        """
        if not B2_AVAILABLE:
            raise ImportError("B2SDK is required for B2 storage. Install with: pip install b2sdk")
        
        self.application_key_id = application_key_id
        self.application_key = application_key
        self.bucket_name = bucket_name
        self.bucket_id = bucket_id
        
        # Initialize B2 API
        self.info = InMemoryAccountInfo()
        self.api = B2Api(self.info)
        self._bucket = None
        self._authenticated = False
        
    def authenticate(self) -> bool:
        """
        Authenticate with B2 service
        
        Returns:
            bool: True if authentication successful, False otherwise
        """
        try:
            # Different authentication methods for different B2SDK versions
            if B2_VERSION in ["v2", "v1"]:
                self.api.authorize_account("production", self.application_key_id, self.application_key)
            else:
                # Older version might use different method
                self.api.authorize_account("production", self.application_key_id, self.application_key)
            
            self._authenticated = True
            logger.info(f"Successfully authenticated with Backblaze B2 (B2SDK {B2_VERSION})")
            return True
        except B2Error as e:
            logger.error(f"Failed to authenticate with B2: {e}")
            self._authenticated = False
            return False
        except Exception as e:
            logger.error(f"Unexpected error during B2 authentication: {e}")
            self._authenticated = False
            return False
    
    def _get_bucket(self):
        """Get or cache the B2 bucket"""
        if self._bucket is None:
            if not self._authenticated:
                if not self.authenticate():
                    raise Exception("Failed to authenticate with B2")
            
            try:
                if self.bucket_id:
                    # Use bucket ID for faster access
                    self._bucket = self.api.get_bucket_by_id(self.bucket_id)
                else:
                    # Find bucket by name
                    self._bucket = self.api.get_bucket_by_name(self.bucket_name)
                    
                logger.info(f"Successfully connected to bucket: {self.bucket_name}")
            except (BucketIdNotFound, NonExistentBucket) as e:
                logger.error(f"Bucket not found: {e}")
                raise Exception(f"Bucket '{self.bucket_name}' not found")
            except B2Error as e:
                logger.error(f"Error accessing bucket: {e}")
                raise Exception(f"Failed to access bucket: {e}")
        
        return self._bucket
    
    def upload_file(self, file_obj: FileStorage, folder: str, user_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Upload a file to B2 storage
        
        Args:
            file_obj: The file object to upload
            folder: Folder path within the bucket (e.g., 'expense_images')
            user_id: User ID for unique filename generation
            
        Returns:
            Tuple[bool, Optional[str], Optional[str]]: (success, file_url, error_message)
        """
        try:
            if not file_obj or not file_obj.filename:
                return False, None, "No file provided"
            
            # Generate unique filename
            file_extension = file_obj.filename.rsplit('.', 1)[1].lower() if '.' in file_obj.filename else 'jpg'
            unique_filename = f"{user_id}_{uuid.uuid4().hex}.{file_extension}"
            
            # Construct full path in bucket
            file_path = f"{folder}/{unique_filename}"
            
            # Get bucket
            bucket = self._get_bucket()
            
            # Read file content
            file_obj.seek(0)  # Reset file pointer
            file_content = file_obj.read()
            
            # Upload to B2
            file_info = bucket.upload_bytes(
                data_bytes=file_content,
                file_name=file_path,
                content_type=file_obj.content_type or 'application/octet-stream'
            )
            
            # Return a URL that points to the public uploads endpoint
            # This endpoint automatically handles B2 or local storage without requiring auth
            public_url = f"/api/uploads/expense_images/{unique_filename}"
            
            logger.info(f"Successfully uploaded file: {file_path} -> {public_url} (via public endpoint)")
            return True, public_url, None
            
        except Exception as e:
            error_msg = f"Failed to upload file to B2: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg
    
    def download_file(self, file_path: str) -> Tuple[bool, Optional[bytes], Optional[str]]:
        """
        Download a file from B2 storage
        
        Args:
            file_path: The path of the file in the bucket (e.g., 'expense_images/user123_abc.jpg')
            
        Returns:
            Tuple[bool, Optional[bytes], Optional[str]]: (success, file_content, error_message)
        """
        try:
            bucket = self._get_bucket()
            
            # Download the file
            downloaded_file = bucket.download_file_by_name(file_path)
            
            # Always get content from response
            file_content = downloaded_file.response.content
            
            if not file_content:
                raise Exception("Downloaded file is empty")
            
            logger.info(f"Successfully downloaded file: {file_path} ({len(file_content)} bytes)")
            return True, file_content, None
            
        except Exception as e:
            error_msg = f"Failed to download file from B2: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg

    def delete_file(self, file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Delete a file from B2 storage
        
        Args:
            file_path: The path of the file in the bucket (e.g., 'expense_images/user123_abc.jpg')
            
        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
        """
        try:
            bucket = self._get_bucket()
            
            # Get file info first
            file_version = bucket.get_file_info_by_name(file_path)
            
            # Delete the file
            bucket.delete_file_version(file_version.id_, file_version.file_name)
            
            logger.info(f"Successfully deleted file: {file_path}")
            return True, None
            
        except Exception as e:
            error_msg = f"Failed to delete file from B2: {str(e)}"
            logger.error(error_msg)
            return False, error_msg
    
    def list_recent_files(self, folder: str = "expense_images", limit: int = 10) -> Tuple[bool, list, Optional[str]]:
        """
        List recent files in the bucket
        
        Args:
            folder: Folder to list files from
            limit: Maximum number of files to return
            
        Returns:
            Tuple[bool, list, Optional[str]]: (success, file_list, error_message)
        """
        try:
            bucket = self._get_bucket()
            
            # List files in the folder
            file_versions = bucket.ls(folder_to_list=folder, latest_only=True, recursive=True)
            
            files = []
            count = 0
            for file_version, _ in file_versions:
                if count >= limit:
                    break
                files.append({
                    'name': file_version.file_name,
                    'size': file_version.size,
                    'upload_timestamp': file_version.upload_timestamp,
                    'file_id': file_version.id_
                })
                count += 1
            
            return True, files, None
            
        except Exception as e:
            return False, [], f"Failed to list files: {str(e)}"

    def test_connection(self) -> Tuple[bool, str]:
        """
        Test the connection to B2 storage
        
        Returns:
            Tuple[bool, str]: (success, message)
        """
        try:
            if not self.authenticate():
                return False, "Authentication failed"
            
            bucket = self._get_bucket()
            
            # Try to list a few files to verify access
            success, files, error = self.list_recent_files(limit=3)
            if success:
                file_count = len(files)
                return True, f"Successfully connected to bucket: {bucket.name} (found {file_count} recent files)"
            else:
                return True, f"Connected to bucket: {bucket.name} (but couldn't list files: {error})"
            
        except Exception as e:
            return False, f"Connection test failed: {str(e)}"

def create_b2_service(config) -> Optional[B2StorageService]:
    """
    Create B2 storage service from configuration
    
    Args:
        config: Flask configuration object
        
    Returns:
        B2StorageService instance or None if not configured
    """
    try:
        if not all([
            config.get('B2_APPLICATION_KEY_ID'),
            config.get('B2_APPLICATION_KEY'),
            config.get('B2_BUCKET_NAME')
        ]):
            logger.warning("B2 configuration incomplete. Required: B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME")
            return None
        
        service = B2StorageService(
            application_key_id=config['B2_APPLICATION_KEY_ID'],
            application_key=config['B2_APPLICATION_KEY'],
            bucket_name=config['B2_BUCKET_NAME'],
            bucket_id=config.get('B2_BUCKET_ID')
        )
        
        # Test the connection
        success, message = service.test_connection()
        if success:
            logger.info(f"B2 Storage Service initialized: {message}")
            return service
        else:
            logger.error(f"B2 Storage Service failed to initialize: {message}")
            return None
            
    except Exception as e:
        logger.error(f"Failed to create B2 storage service: {e}")
        return None