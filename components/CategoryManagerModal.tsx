import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { uploadExpenseImage } from '../config/api';
import { BOARD_TYPES, QuickCategory } from '../constants/boardTypes';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { CategoryImage } from './CategoryImage';

interface CategoryManagerModalProps {
  isVisible: boolean;
  onClose: () => void;
  boardId: string;
  boardType: string;
  onCategoriesUpdated: () => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isVisible,
  onClose,
  boardId,
  boardType,
  onCategoriesUpdated,
}) => {
  const { user } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<QuickCategory[]>([]);
  const [customCategories, setCustomCategories] = useState<QuickCategory[]>([]);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [selectedCustomIcon, setSelectedCustomIcon] = useState('📝');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const availableIcons = [
    '📝', '💰', '🛒', '🍕', '⛽', '🏠', '🚗', '📱', '🎬', '👕',
    '🏥', '💊', '🎓', '📚', '✈️', '🏖️', '🎁', '🎉', '⚽', '🎮',
    '🍷', '☕', '🍔', '🍜', '🛍️', '💄', '🔧', '🏦', '📊', '💼',
    '🎨', '🎵', '📷', '🌱', '🐕', '🐱', '🚲', '🏃', '💪', '🧘',
    '🍎', '🥗', '🍰', '🧸', '📦', '🔑', '🛡️', '⚖️', '📋', '💝'
  ];

  const resetModal = () => {
    setSelectedCategories([]);
    setCustomCategories([]);
    setShowCustomCategoryModal(false);
    setNewCustomCategoryName('');
    setSelectedCustomIcon('📝');
    setSelectedImageUri(null);
    setIsUploadingImage(false);
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('הרשאה נדרשת', 'נדרשת הרשאה לגישה לגלריית התמונות');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('🖼️ Selected image URI for preview:', asset.uri);
        setSelectedImageUri(asset.uri);
        setSelectedCustomIcon('');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('שגיאה', 'שגיאה בבחירת התמונה');
    }
  };

  const handleClearImage = () => {
    setSelectedImageUri(null);
    setSelectedCustomIcon('📝');
  };

  const handleAddCustomCategory = async () => {
    if (!newCustomCategoryName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם לקטגוריה');
      return;
    }

    const allCategories = [...selectedCategories, ...customCategories];
    if (allCategories.some(cat => cat.name.toLowerCase() === newCustomCategoryName.trim().toLowerCase())) {
      Alert.alert('שגיאה', 'קטגוריה עם השם הזה כבר קיימת');
      return;
    }

    const totalSelected = selectedCategories.length + customCategories.length;
    if (totalSelected >= 7) {
      Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד');
      return;
    }

    setIsUploadingImage(true);
    let imageUrl = null;
    let filename = null;

    // Upload image if selected
    if (selectedImageUri) {
      try {
        const token = await AsyncStorage.getItem('access_token');
        
        console.log('📤 Uploading image for category:', newCustomCategoryName.trim());
        imageUrl = await uploadExpenseImage(selectedImageUri, token || undefined);
        
        if (imageUrl) {
          const urlParts = imageUrl.split('/');
          filename = urlParts[urlParts.length - 1];
          console.log('✅ Image uploaded successfully, URL:', imageUrl, 'Filename:', filename);
        } else {
          console.error('❌ Failed to upload image - no URL returned');
          Alert.alert('שגיאה', 'שגיאה בהעלאת התמונה');
          setIsUploadingImage(false);
          return;
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('שגיאה', 'שגיאה בהעלאת התמונה');
        setIsUploadingImage(false);
        return;
      }
    }

    // Create category via API
    try {
      const categoryData = {
        name: newCustomCategoryName.trim(),
        icon: imageUrl ? '' : selectedCustomIcon,
        color: '#9370DB',
        image_url: imageUrl || undefined,
      };

      const result = await apiService.createCategory(boardId, categoryData);
      
      if (result.success) {
        console.log('✅ Category created successfully:', result.data);
        
        // Add to local state for immediate UI update
        const newCategory: QuickCategory = {
          name: newCustomCategoryName.trim(),
          icon: imageUrl ? '' : selectedCustomIcon,
          color: '#9370DB',
          imageUrl: imageUrl || undefined,
          filename: filename || undefined,
          id: result.data?.id,
        };

        setCustomCategories(prev => [...prev, newCategory]);
        setShowCustomCategoryModal(false);
        setNewCustomCategoryName('');
        setSelectedCustomIcon('📝');
        setSelectedImageUri(null);
        setIsUploadingImage(false);

        // Notify parent to refresh
        onCategoriesUpdated();
      } else {
        console.error('❌ Failed to create category:', result.error);
        Alert.alert('שגיאה', result.error || 'שגיאה ביצירת קטגוריה');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('שגיאה', 'שגיאה ביצירת קטגוריה');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveCustomCategory = (categoryName: string) => {
    setCustomCategories(prev => prev.filter(cat => cat.name !== categoryName));
  };

  const handleCategoryToggle = (category: QuickCategory) => {
    setSelectedCategories(prev => {
      const isSelected = prev.some(cat => cat.name === category.name);
      if (isSelected) {
        return prev.filter(cat => cat.name !== category.name);
      } else {
        const totalSelected = prev.length + customCategories.length;
        if (totalSelected >= 7) {
          Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד. בטל בחירה של קטגוריה אחרת כדי להוסיף חדשה.');
          return prev;
        }
        return [...prev, category];
      }
    });
  };

  const handleOpenCustomCategoryModal = () => {
    const totalSelected = selectedCategories.length + customCategories.length;
    if (totalSelected >= 7) {
      Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד. בטל בחירה של קטגוריה אחרת כדי להוסיף חדשה.');
      return;
    }
    setShowCustomCategoryModal(true);
  };

  const handleSaveCategories = async () => {
    try {
      // Here we would save the selected categories to the board
      // For now, just close and notify parent
      onClose();
      resetModal();
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error saving categories:', error);
      Alert.alert('שגיאה', 'שגיאה בשמירת קטגוריות');
    }
  };

  // Get all available categories based on board type
  const getAllAvailableCategories = () => {
    const selectedBoardType = BOARD_TYPES.find(bt => bt.id === boardType);
    if (!selectedBoardType) return [];
    
    const allCategories: QuickCategory[] = [];
    const addedNames = new Set<string>();
    
    // First: Add categories from selected board type (priority) - excluding "אחר"
    selectedBoardType.quickCategories.forEach(category => {
      if (!addedNames.has(category.name) && category.name !== 'אחר') {
        allCategories.push(category);
        addedNames.add(category.name);
      }
    });
    
    // Second: Add categories from all other board types - excluding "אחר"
    BOARD_TYPES.forEach(boardTypeItem => {
      if (boardTypeItem.id !== selectedBoardType.id) {
        boardTypeItem.quickCategories.forEach(category => {
          if (!addedNames.has(category.name) && category.name !== 'אחר') {
            allCategories.push(category);
            addedNames.add(category.name);
          }
        });
      }
    });
    
    return allCategories;
  };

  const renderCategoryItem = ({ item }: { item: QuickCategory }) => {
    const isSelected = selectedCategories.some(cat => cat.name === item.name);
    const totalSelected = selectedCategories.length + customCategories.length;
    const isDisabled = !isSelected && totalSelected >= 7;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.selectedCategoryItem,
          isDisabled && styles.disabledCategoryItem,
        ]}
        onPress={() => {
          if (!isDisabled) {
            handleCategoryToggle(item);
          }
        }}
        disabled={isDisabled}
      >
        <Text style={[
          styles.categoryIcon,
          isDisabled && { opacity: 0.5 }
        ]}>
          {item.icon}
        </Text>
        <Text 
          style={[
            styles.categoryName,
            isSelected && styles.selectedCategoryName,
            isDisabled && styles.disabledCategoryName
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {item.name}
        </Text>
        
        {isSelected && (
          <Text style={styles.checkmark}>✓</Text>
        )}
        
        {isDisabled && (
          <Text style={styles.disabledIndicator}>🔒</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderCustomCategoryItem = ({ item }: { item: QuickCategory }) => {
    return (
      <View style={[styles.categoryItem, styles.customCategoryItem]}>
        {item.imageUrl ? (
          <CategoryImage imageUrl={item.imageUrl} style={styles.categoryImage} />
        ) : (
          <Text style={styles.categoryIcon}>{item.icon}</Text>
        )}
        <Text style={[styles.categoryName, styles.customCategoryName]}>
          {item.name}
        </Text>
        <TouchableOpacity
          onPress={() => handleRemoveCustomCategory(item.name)}
          style={styles.removeCustomCategoryButton}
        >
          <Text style={styles.removeCustomCategoryIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderIconItem = ({ item }: { item: string }) => {
    const isSelected = selectedCustomIcon === item;
    return (
      <TouchableOpacity
        style={[
          styles.iconItem,
          isSelected && styles.selectedIconItem
        ]}
        onPress={() => setSelectedCustomIcon(item)}
      >
        <Text style={styles.iconText}>{item}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        onClose();
        resetModal();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>בחר קטגוריות ללוח</Text>
            <Text style={styles.selectedCountText}>
              נבחרו: {selectedCategories.length + customCategories.length}/7 קטגוריות
            </Text>
          </View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {/* Custom Categories Section */}
            {customCategories.length > 0 && (
              <View style={styles.customCategoriesSection}>
                <Text style={styles.customCategoriesTitle}>קטגוריות מותאמות אישית:</Text>
                <FlatList
                  data={customCategories}
                  renderItem={renderCustomCategoryItem}
                  keyExtractor={(item) => item.name}
                  style={styles.customCategoriesList}
                  numColumns={2}
                  columnWrapperStyle={customCategories.length > 1 ? styles.categoriesRow : undefined}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            )}
            
            {/* Add Custom Category Button */}
            <TouchableOpacity
              style={[
                styles.addCustomCategoryButton,
                (selectedCategories.length + customCategories.length >= 7) && styles.disabledAddButton
              ]}
              onPress={handleOpenCustomCategoryModal}
              disabled={selectedCategories.length + customCategories.length >= 7}
            >
              <Text style={styles.addCustomCategoryIcon}>+</Text>
              <Text style={styles.addCustomCategoryText}>הוסף קטגוריה מותאמת אישית</Text>
            </TouchableOpacity>
            
            <FlatList
              data={getAllAvailableCategories()}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.name}
              style={styles.categoriesList}
              numColumns={2}
              columnWrapperStyle={styles.categoriesRow}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </ScrollView>
          
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                onClose();
                resetModal();
              }}
            >
              <Text style={styles.cancelText}>ביטול</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveCategories}
            >
              <Text style={styles.saveText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Custom Category Modal */}
      <Modal
        visible={showCustomCategoryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCustomCategoryModal(false)}
      >
        <View style={styles.customCategoryModalOverlay}>
          <View style={styles.customCategoryModalContent}>
            <Text style={styles.customCategoryModalTitle}>הוסף קטגוריה מותאמת אישית</Text>
            
            <TextInput
              style={styles.customCategoryInput}
              placeholder="שם הקטגוריה"
              value={newCustomCategoryName}
              onChangeText={setNewCustomCategoryName}
              textAlign="right"
              maxLength={20}
            />
            
            <Text style={styles.iconSelectorTitle}>בחר אייקון:</Text>
            
            {/* Image upload section */}
            <View style={styles.imageUploadSection}>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={handleImagePicker}
                disabled={isUploadingImage}
              >
                <Text style={styles.imageUploadButtonText}>
                  {isUploadingImage ? '🔄 מעלה...' : '📷 העלה תמונה'}
                </Text>
              </TouchableOpacity>
              
              {selectedImageUri && (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImageUri }} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.clearImageButton}
                    onPress={handleClearImage}
                  >
                    <Text style={styles.clearImageButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <ScrollView style={styles.iconSelector} showsVerticalScrollIndicator={false}>
              <FlatList
                data={availableIcons}
                renderItem={renderIconItem}
                keyExtractor={(item) => item}
                numColumns={5}
                columnWrapperStyle={styles.iconRow}
                scrollEnabled={false}
              />
            </ScrollView>
            
            <View style={styles.customCategoryModalButtons}>
              <TouchableOpacity
                style={[styles.customCategoryButton, styles.customCategoryCancelButton]}
                onPress={() => {
                  setShowCustomCategoryModal(false);
                  setNewCustomCategoryName('');
                  setSelectedCustomIcon('📝');
                  setSelectedImageUri(null);
                  setIsUploadingImage(false);
                }}
              >
                <Text style={styles.customCategoryCancelText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.customCategoryButton, 
                  styles.customCategoryAddButton,
                  (!newCustomCategoryName.trim() || isUploadingImage) && styles.disabledCustomCategoryButton
                ]}
                onPress={handleAddCustomCategory}
                disabled={!newCustomCategoryName.trim() || isUploadingImage}
              >
                <Text style={styles.customCategoryAddText}>
                  {isUploadingImage ? 'מעלה...' : 'הוסף'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  selectedCountText: {
    fontSize: 16,
    color: '#4caf50',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#e8f5e8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  scrollContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  customCategoriesSection: {
    marginBottom: 16,
  },
  customCategoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  customCategoriesList: {
    maxHeight: 80,
  },
  categoriesRow: {
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginVertical: 6,
    backgroundColor: '#fafbfc',
    borderWidth: 2,
    borderColor: '#e0e6ed',
    width: '48%',
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCategoryItem: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOpacity: 0.2,
  },
  customCategoryItem: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  disabledCategoryItem: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 6,
    minWidth: 22,
  },
  categoryImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  selectedCategoryName: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  customCategoryName: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  disabledCategoryName: {
    color: '#999',
  },
  checkmark: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledIndicator: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
  removeCustomCategoryButton: {
    padding: 4,
    marginLeft: 8,
  },
  removeCustomCategoryIcon: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  addCustomCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  disabledAddButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
  },
  addCustomCategoryIcon: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  addCustomCategoryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesList: {
    maxHeight: 200,
    marginTop: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2ecc71',
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Custom Category Modal Styles
  customCategoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCategoryModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  customCategoryModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  customCategoryInput: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafbfc',
  },
  iconSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'right',
  },
  imageUploadSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  imageUploadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  imageUploadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedImageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
  },
  clearImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearImageButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  iconSelector: {
    maxHeight: 200,
    marginBottom: 20,
  },
  iconRow: {
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e6ed',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  selectedIconItem: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  iconText: {
    fontSize: 24,
  },
  customCategoryModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customCategoryButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  customCategoryCancelButton: {
    backgroundColor: '#ecf0f1',
  },
  customCategoryCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customCategoryAddButton: {
    backgroundColor: '#2ecc71',
  },
  customCategoryAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledCustomCategoryButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
  },
});

export default CategoryManagerModal;
