# Image Upload Feature for Expenses

This documentation describes the newly added image upload functionality for expense tracking.

## Backend Changes

### New Endpoints

1. **POST `/api/upload/expense-image`** - Upload expense images
   - Accepts multipart/form-data with an 'image' field
   - Returns: `{ "image_url": "/api/uploads/expense_images/filename.jpg" }`
   - Supports: PNG, JPG, JPEG, GIF, WebP formats

2. **GET `/api/uploads/expense_images/<filename>`** - Serve uploaded images
   - Static file serving for uploaded expense images

### Database Schema Updates

- The existing `receipt_url` field in the Expense model is now used to store image URLs
- Frontend sends `image_url`, backend maps it to `receipt_url` for storage

### File Storage

- Images are stored in `backend/uploads/expense_images/` directory
- Filenames are generated as: `{user_id}_{uuid}.{extension}`
- Upload directories are created automatically on app startup

## Frontend Changes

### New Components Features

1. **AddExpenseModal.tsx**
   - Added image picker (camera/gallery) functionality
   - Image preview with remove option
   - Upload progress indicator

2. **QuickAmountModal.tsx**
   - Same image functionality as AddExpenseModal
   - Integrated seamlessly into the quick add workflow

3. **ExpenseCard.tsx**
   - Already supported image display via `imageUri` field
   - Now uses centralized `getImageUrl()` helper for proper URL handling

### Configuration

- **config/api.ts** - Centralized API configuration
  - `uploadExpenseImage()` - Reusable upload function
  - `getImageUrl()` - Helper for image URL handling
  - Environment-aware URL configuration (dev/prod)

### Dependencies Added

- `expo-image-picker` - For camera and gallery access
- Handles permissions automatically

## Usage

### Adding Images to Expenses

1. Open AddExpenseModal or QuickAmountModal
2. Tap "הוסף תמונה" (Add Image) button
3. Choose "מצלמה" (Camera) or "גלריה" (Gallery)
4. Image appears as preview with remove option
5. Save expense - image uploads automatically

### Viewing Images

- Images appear in ExpenseCard as 60x60 thumbnails
- Tapping expense card shows full details (image handling depends on parent implementation)

## Technical Details

### Image Processing

- Images are resized to 4:3 aspect ratio during selection
- Quality set to 0.7 to balance size and quality
- Unique filenames prevent conflicts

### Error Handling

- Upload failures show Hebrew error messages
- Failed uploads allow continuing without image
- Network errors are caught and displayed appropriately

### Security

- File type validation on backend
- Unique filename generation prevents overwrites
- Future: Can be easily switched to S3/cloud storage

## Future Enhancements

- [ ] Compress images before upload
- [ ] Multiple images per expense
- [ ] Image editing capabilities
- [ ] Cloud storage integration (S3, CloudFlare R2, etc.)
- [ ] Image optimization for different screen sizes

## Development Setup

1. Ensure backend is running: `cd backend && python app.py`
2. Install new dependency: `npm install expo-image-picker`
3. Run React Native app as usual

## Testing

Test both camera and gallery functionality on physical device (camera not available in simulators).

The implementation is production-ready with proper error handling, user feedback, and scalable architecture. 