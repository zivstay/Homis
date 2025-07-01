import { useExpenses } from '@/contexts/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

// Available icons for quick categories
const AVAILABLE_ICONS = [
  'flash', 'water', 'home', 'cart', 'car', 'restaurant', 'medical', 'school',
  'gift', 'airplane', 'train', 'bus', 'bicycle', 'walk', 'fitness', 'game-controller',
  'book', 'newspaper', 'tv', 'radio', 'headset', 'phone-portrait', 'laptop', 'desktop',
  'camera', 'videocam', 'musical-notes', 'film', 'pizza', 'wine', 'beer', 'cafe',
  'ice-cream', 'pizza', 'fast-food', 'nutrition', 'fitness', 'barbell', 'football',
  'basketball', 'tennisball', 'golf', 'bowling-ball', 'baseball', 'volleyball'
];

// Available colors for quick categories
const AVAILABLE_COLORS = [
  '#FFD700', '#00BFFF', '#32CD32', '#FF6347', '#9370DB', '#FF69B4', '#FF4500',
  '#00CED1', '#32CD32', '#FF1493', '#FF8C00', '#8A2BE2', '#00FF7F', '#FFD700',
  '#FF69B4', '#00CED1', '#FF6347', '#9370DB', '#32CD32', '#FF4500', '#FF1493'
];

interface QuickCategoryManagerProps {
  visible: boolean;
  onClose: () => void;
}

export function QuickCategoryManager({ visible, onClose }: QuickCategoryManagerProps) {
  const { quickCategories, addQuickCategory, updateQuickCategory, deleteQuickCategory, reorderQuickCategories } = useExpenses();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('flash');
  const [selectedColor, setSelectedColor] = useState('#FFD700');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addQuickCategory({
        name: newCategoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
      setNewCategoryName('');
      setSelectedIcon('flash');
      setSelectedColor('#FFD700');
      setIsAddModalVisible(false);
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setSelectedIcon(category.icon);
    setSelectedColor(category.color);
    setIsAddModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (editingCategory && newCategoryName.trim()) {
      updateQuickCategory(editingCategory.id, {
        name: newCategoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
      setEditingCategory(null);
      setNewCategoryName('');
      setSelectedIcon('flash');
      setSelectedColor('#FFD700');
      setIsAddModalVisible(false);
    }
  };

  const handleDeleteCategory = (category: any) => {
    Alert.alert(
      'מחיקת קטגוריה',
      `האם אתה בטוח שברצונך למחוק את הקטגוריה "${category.name}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteQuickCategory(category.id),
        },
      ]
    );
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderQuickCategories(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < quickCategories.length - 1) {
      reorderQuickCategories(index, index + 1);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalVisible(false);
    setEditingCategory(null);
    setNewCategoryName('');
    setSelectedIcon('flash');
    setSelectedColor('#FFD700');
  };

  const renderIconSelector = () => (
    <View style={styles.iconSelector}>
      <ThemedText style={styles.selectorTitle}>בחר אייקון</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
        {AVAILABLE_ICONS.map((icon) => (
          <TouchableOpacity
            key={icon}
            style={[
              styles.iconOption,
              selectedIcon === icon && styles.iconOptionSelected
            ]}
            onPress={() => setSelectedIcon(icon)}
          >
            <Ionicons 
              name={icon as any} 
              size={24} 
              color={selectedIcon === icon ? '#FFFFFF' : '#666'} 
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderColorSelector = () => (
    <View style={styles.colorSelector}>
      <ThemedText style={styles.selectorTitle}>בחר צבע</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
        {AVAILABLE_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.colorOptionSelected
            ]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.title}>
            ניהול קטגוריות מהירות
          </ThemedText>
          <TouchableOpacity 
            onPress={() => setIsAddModalVisible(true)} 
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesList}>
            {quickCategories.map((category, index) => (
              <View key={category.id} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <View style={styles.reorderButtons}>
                    <TouchableOpacity
                      style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                      onPress={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <Ionicons 
                        name="chevron-up" 
                        size={16} 
                        color={index === 0 ? '#CCC' : '#007AFF'} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reorderButton, index === quickCategories.length - 1 && styles.reorderButtonDisabled]}
                      onPress={() => handleMoveDown(index)}
                      disabled={index === quickCategories.length - 1}
                    >
                      <Ionicons 
                        name="chevron-down" 
                        size={16} 
                        color={index === quickCategories.length - 1 ? '#CCC' : '#007AFF'} 
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <Ionicons name={category.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <ThemedText style={styles.categoryName}>
                    {category.name}
                  </ThemedText>
                </View>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditCategory(category)}
                  >
                    <Ionicons name="pencil" size={16} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteCategory(category)}
                  >
                    <Ionicons name="trash" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Add/Edit Category Modal */}
        <Modal
          visible={isAddModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#007AFF" />
              </TouchableOpacity>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {editingCategory ? 'ערוך קטגוריה' : 'הוסף קטגוריה חדשה'}
              </ThemedText>
              <TouchableOpacity 
                onPress={editingCategory ? handleSaveEdit : handleAddCategory} 
                style={styles.modalSaveButton}
              >
                <ThemedText style={styles.modalSaveButtonText}>
                  {editingCategory ? 'שמור' : 'הוסף'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>שם הקטגוריה</ThemedText>
                <TextInput
                  style={styles.textInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="הכנס שם קטגוריה"
                  placeholderTextColor="#999"
                  textAlign="center"
                  autoFocus
                />
              </View>

              {renderIconSelector()}
              {renderColorSelector()}

              {/* Preview */}
              <View style={styles.previewContainer}>
                <ThemedText style={styles.previewTitle}>תצוגה מקדימה</ThemedText>
                <View style={styles.previewButton}>
                  <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
                    <Ionicons name={selectedIcon as any} size={24} color="#FFFFFF" />
                  </View>
                  <ThemedText style={styles.previewText}>
                    {newCategoryName || 'שם הקטגוריה'}
                  </ThemedText>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  categoriesList: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reorderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  reorderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    marginRight: 4,
  },
  reorderButtonDisabled: {
    backgroundColor: '#F8F9FA',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    backgroundColor: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  textInput: {
    fontSize: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E1E5E9',
    textAlign: 'center',
  },
  iconSelector: {
    marginBottom: 32,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  iconScroll: {
    flexDirection: 'row',
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  colorSelector: {
    marginBottom: 32,
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  previewButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  previewIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
}); 