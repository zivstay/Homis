import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageStyle, StyleSheet, Text, View } from 'react-native';
import { apiService } from '../services/api';

interface ExpenseImageProps {
  expenseId: string;
  style?: ImageStyle;
  placeholder?: React.ReactNode;
}

export const ExpenseImage: React.FC<ExpenseImageProps> = ({
  expenseId,
  style,
  placeholder,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Validate expense ID
    if (!expenseId || typeof expenseId !== 'string' || expenseId.length === 0) {
      console.log('🟡 ExpenseImage: Invalid expenseId provided:', expenseId);
      setError(true);
      setLoading(false);
      return;
    }
    
    let isMounted = true; // Flag to prevent state updates if component unmounts
    
    const fetchImageData = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Use the API service method
        const result = await apiService.getExpenseImage(expenseId);
        
        // Check if component is still mounted before updating state
        if (!isMounted) return;
        
        if (result.success && result.data?.image) {
          // Backend returns base64 data, create data URL for display
          const dataUrl = `data:image/jpeg;base64,${result.data.image}`;
          setImageDataUrl(dataUrl);
        } else {
          // Don't log errors for missing images - this is normal
          if (result.error !== 'Image not found') {
            console.log('🟡 ExpenseImage: Image not available for expense:', expenseId, '(this is normal)');
          }
          setError(true);
        }
      } catch (err) {
        // Don't log network errors for images - they're usually temporary
        console.log('🟡 ExpenseImage: Network error for expense:', expenseId, '(this is normal)');
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchImageData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [expenseId]);

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
        <Text style={styles.errorText}>שגיאה בטעינת התמונה</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageDataUrl }}
      style={style}
      contentFit="cover"
      onError={() => setError(true)}
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