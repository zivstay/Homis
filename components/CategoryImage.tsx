import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageStyle, StyleSheet, Text, View } from 'react-native';
import { API_CONFIG } from '../config/api';
import { apiService } from '../services/api';

interface CategoryImageProps {
  categoryId?: string;  // Add categoryId prop for API call
  imageUrl?: string;    // Keep imageUrl for backward compatibility
  style?: ImageStyle;
  placeholder?: React.ReactNode;
}

export const CategoryImage: React.FC<CategoryImageProps> = ({
  categoryId,
  imageUrl,
  style,
  placeholder,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  console.log('🖼️ CategoryImage: Props received:', {
    categoryId,
    imageUrl,
    hasStyle: !!style
  });

  useEffect(() => {
    // If we have a categoryId, use the API to get the image
    if (categoryId) {
      console.log('🖼️ CategoryImage: Using API for categoryId:', categoryId);
      fetchImageFromAPI();
    } 
    // Otherwise, use the direct imageUrl (backward compatibility)
    else if (imageUrl) {
      console.log('🖼️ CategoryImage: Using direct imageUrl:', imageUrl);
      // Fix typo in URL if it exists
      const correctedImageUrl = imageUrl.replace('/api/uploads/expeense_images/', '/api/uploads/expense_images/');
      console.log('🖼️ CategoryImage: Corrected imageUrl:', correctedImageUrl);
      
      // Add BASE_URL prefix if the URL starts with /api/
      const fullImageUrl = correctedImageUrl.startsWith('/api/') 
        ? `${API_CONFIG.BASE_URL}${correctedImageUrl}`
        : correctedImageUrl;
      console.log('🖼️ CategoryImage: Full imageUrl with BASE_URL:', fullImageUrl);
      
      setImageDataUrl(fullImageUrl);
      setLoading(false);
    } 
    // No image source provided
    else {
      console.log('🟡 CategoryImage: No categoryId or imageUrl provided');
      setError(true);
      setLoading(false);
    }
  }, [categoryId, imageUrl]);

  const fetchImageFromAPI = async () => {
    if (!categoryId) return;

    let isMounted = true; // Flag to prevent state updates if component unmounts
    
    try {
      setLoading(true);
      setError(false);
      
      console.log('🖼️ CategoryImage: Fetching image for category:', categoryId);
      
      // Use the API service method
      const result = await apiService.getCategoryImage(categoryId);
      
      // Check if component is still mounted before updating state
      if (!isMounted) return;
      
      if (result.success && result.data?.image) {
        // Backend returns base64 data, create data URL for display
        const dataUrl = `data:image/jpeg;base64,${result.data.image}`;
        console.log('✅ CategoryImage: Successfully loaded image for category:', categoryId);
        setImageDataUrl(dataUrl);
      } else {
        console.log('🟡 CategoryImage: Image not available for category:', categoryId, '(this is normal)');
        setError(true);
      }
    } catch (err) {
      console.log('🟡 CategoryImage: Network error for category:', categoryId, '(this is normal)');
      if (isMounted) {
        setError(true);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  };

  if (loading) {
    return (
      <View style={[style, styles.loadingContainer]}>
        {placeholder || <ActivityIndicator size="small" color="#007AFF" />}
      </View>
    );
  }

  if (error || !imageDataUrl) {
    return (
      <View style={[style, styles.errorContainer]}>
        <Text style={styles.errorText}>🖼️</Text>
      </View>
    );
  }
  console.log('🖼️ CategoryImage: Rendering with URL:', imageDataUrl);
  return (
    <Image
      source={{ uri: imageDataUrl }}
      style={style}
      contentFit="cover"
      onError={(e) => {
        console.error('❌ CategoryImage: Failed to display image',e);
        
        setError(true);
      }}
      transition={200}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});
