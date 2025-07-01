import { useExpenses } from '@/contexts/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface QuickCategoryButtonsProps {
  onCategoryPress: (category: string) => void;
}

export function QuickCategoryButtons({ onCategoryPress }: QuickCategoryButtonsProps) {
  const { quickCategories } = useExpenses();

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        הוסף הוצאה מהירה
      </ThemedText>
      <View style={styles.buttonGrid}>
        {quickCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryButton}
            onPress={() => onCategoryPress(category.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
              <Ionicons name={category.icon as any} size={24} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.categoryText}>
              {category.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
}); 