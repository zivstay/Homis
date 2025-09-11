import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ImageStyle, StyleSheet, Text, View } from 'react-native';

interface CategoryImageProps {
  imageUrl: string;
  style?: ImageStyle;
  placeholder?: React.ReactNode;
}

export const CategoryImage: React.FC<CategoryImageProps> = ({
  imageUrl,
  style,
  placeholder,
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  console.log('🖼️ CategoryImage: Rendering with URL:', imageUrl);

  if (!imageUrl) {
    console.log('🟡 CategoryImage: No imageUrl provided');
    return null;
  }

  if (error) {
    console.log('❌ CategoryImage: Error loading image:', imageUrl);
    return (
      <View style={[style, styles.errorContainer]}>
        <Text style={styles.errorText}>🖼️</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      contentFit="cover"
      onLoad={() => {
        console.log('✅ CategoryImage: Successfully loaded:', imageUrl);
        setLoading(false);
      }}
      onError={(error) => {
        console.error('❌ CategoryImage: Failed to load:', imageUrl, error);
        setError(true);
        setLoading(false);
      }}
      transition={200}
    />
  );
};

const styles = StyleSheet.create({
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
