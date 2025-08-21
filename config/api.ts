// API Configuration
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  BASE_URL: isDev ? 'http://192.168.7.9:5000' : 'https://your-production-domain.com',
  // BASE_URL: isDev ? 'https://homis-backend-06302e58f4ca.herokuapp.com' : 'https://homis-backend-06302e58f4ca.herokuapp.com',

  UPLOAD_ENDPOINT: '/api/upload/expense-image',
  EXPENSES_ENDPOINT: '/api/boards',
  TERMS_ENDPOINT: '/terms',
};

// Upload function that can be used across components
export const uploadExpenseImage = async (imageUri: string, authToken?: string): Promise<string | null> => {
  try {
    console.log('🔄 Starting image upload to:', `${API_CONFIG.BASE_URL}${API_CONFIG.UPLOAD_ENDPOINT}`);
    console.log('🔄 Image URI:', imageUri);
    
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'expense_image.jpg',
    } as any);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    console.log('🔄 Making request with headers:', headers);

    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.UPLOAD_ENDPOINT}`, {
      method: 'POST',
      body: formData,
      headers,
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);

    const result = await response.json();
    console.log('📡 Response body:', result);
    
    if (response.ok) {
      console.log('✅ Upload successful:', result.image_url);
      return result.image_url;
    } else {
      console.error('❌ Upload failed:', result);
      throw new Error(result.error || 'שגיאה בהעלאת התמונה');
    }
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

 