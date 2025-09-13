import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { BOARD_TYPES, BoardType, QuickCategory } from '../constants/boardTypes';
import { useAuth } from '../contexts/AuthContext';
import CategorySelector from './CategorySelector';

interface CreateBoardWizardProps {
  isVisible: boolean;
  onClose: () => void;
  onBoardCreated: (newBoard?: any) => void;
  createBoard: (boardData: any) => Promise<{ success: boolean; error?: string; board?: any }>;
}

const CreateBoardWizard: React.FC<CreateBoardWizardProps> = ({
  isVisible,
  onClose,
  onBoardCreated,
  createBoard,
}) => {
  const { user } = useAuth(); // Remove token since it doesn't exist
  const [wizardStep, setWizardStep] = useState(1); // 1: פרטים, 2: סוג לוח, 3: קטגוריות
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<QuickCategory[]>([]);
  const [customCategories, setCustomCategories] = useState<QuickCategory[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [selectedCustomIcon, setSelectedCustomIcon] = useState('📝');
  const [selectedCategoryImage, setSelectedCategoryImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });

    return () => subscription?.remove();
  }, []);

  const resetWizard = () => {
    setWizardStep(1);
    setNewBoardName('');
    setNewBoardDescription('');
    setSelectedBoardType(null);
    setSelectedCategories([]);
    setCustomCategories([]);
    setShowCustomCategoryModal(false);
    setNewCustomCategoryName('');
    setSelectedCustomIcon('📝');
    // DISABLED: setSelectedCategoryImage(null);
    // DISABLED: setIsUploadingImage(false);
  };

  const handleBoardTypeSelect = (boardType: BoardType) => {
    setSelectedBoardType(boardType);
    // Don't auto-select any categories - let user choose manually
    setSelectedCategories([]);
  };

  const handleCategoryToggle = (category: QuickCategory) => {
    setSelectedCategories(prev => {
      const isSelected = prev.some(cat => cat.name === category.name);
      if (isSelected) {
        return prev.filter(cat => cat.name !== category.name);
      } else {
        // Check if we're at the limit of 7 categories (including custom ones)
        const totalSelected = prev.length + customCategories.length;
        if (totalSelected >= 7) {
          Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד. בטל בחירה של קטגוריה אחרת כדי להוסיף חדשה.');
          return prev;
        }
        return [...prev, category];
      }
    });
  };

  const availableIcons = [
    '📝', '💰', '🛒', '🍕', '⛽', '🏠', '🚗', '📱', '🎬', '👕',
    '🏥', '💊', '🎓', '📚', '✈️', '🏖️', '🎁', '🎉', '⚽', '🎮',
    '🍷', '☕', '🍔', '🍜', '🛍️', '💄', '🔧', '🏦', '📊', '💼',
    '🎨', '🎵', '📷', '🌱', '🐕', '🐱', '🚲', '🏃', '💪', '🧘',
    '🍎', '🥗', '🍰', '🧸', '📦', '🔑', '🛡️', '⚖️', '📋', '💝'
  ];

  // DISABLED: Image upload functionality for categories
  /*
  const handleImagePicker = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('הרשאה נדרשת', 'נדרשת הרשאה לגישה לגלריית התמונות');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploadingImage(true);
        
        try {
          // Get token from AsyncStorage
          const token = await AsyncStorage.getItem('access_token');
          
          // Upload image using config API
          console.log('🖼️ Selected image URI:', asset.uri);
          console.log('🔑 Token exists:', !!token);
          
          const imageUrl = await uploadExpenseImage(asset.uri, token || undefined);
          console.log('📤 Upload result - imageUrl:', imageUrl);
          
          if (imageUrl) {
            setSelectedCategoryImage(imageUrl);
            setSelectedCustomIcon(''); // Clear icon when image is selected
            console.log('✅ Image uploaded successfully, URL set to:', imageUrl);
            Alert.alert('הצלחה', 'התמונה הועלתה בהצלחה');
          } else {
            console.error('❌ Failed to upload image - no URL returned');
            Alert.alert('שגיאה', 'שגיאה בהעלאת התמונה');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('שגיאה', 'שגיאה בהעלאת התמונה');
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('שגיאה', 'שגיאה בבחירת התמונה');
    }
  };
  */

  // DISABLED: Clear image functionality
  /*
  const handleClearImage = () => {
    setSelectedCategoryImage(null);
    setSelectedCustomIcon('📝'); // Reset to default icon
  };
  */

  const handleAddCustomCategory = () => {
    if (!newCustomCategoryName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם לקטגוריה');
      return;
    }

    // Check if category name already exists
    const allCategories = [...selectedCategories, ...customCategories];
    if (allCategories.some(cat => cat.name.toLowerCase() === newCustomCategoryName.trim().toLowerCase())) {
      Alert.alert('שגיאה', 'קטגוריה עם השם הזה כבר קיימת');
      return;
    }

    // Check if we're at the limit
    const totalSelected = selectedCategories.length + customCategories.length;
    if (totalSelected >= 7) {
      Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד');
      return;
    }

    const newCategory: QuickCategory = {
      name: newCustomCategoryName.trim(),
      icon: selectedCustomIcon, // Always use selected icon (no image support)
      color: '#9370DB', // Default purple color
      // DISABLED: imageUrl: selectedCategoryImage || undefined, // Image upload disabled
    };

    console.log('📝 Creating new category:', newCategory);
    console.log('🖼️ Selected category image:', selectedCategoryImage);

    setCustomCategories(prev => [...prev, newCategory]);
    setShowCustomCategoryModal(false);
    setNewCustomCategoryName('');
    setSelectedCustomIcon('📝');
    setSelectedCategoryImage(null);
    setIsUploadingImage(false);
  };

  const handleRemoveCustomCategory = (categoryName: string) => {
    setCustomCategories(prev => prev.filter(cat => cat.name !== categoryName));
  };

  const handleOpenCustomCategoryModal = () => {
    const totalSelected = selectedCategories.length + customCategories.length;
    if (totalSelected >= 7) {
      Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד. בטל בחירה של קטגוריה אחרת כדי להוסיף חדשה.');
      return;
    }
    setShowCustomCategoryModal(true);
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם ללוח');
      return;
    }

    if (!selectedBoardType) {
      Alert.alert('שגיאה', 'נא לבחור סוג לוח');
      return;
    }

    const totalCategories = selectedCategories.length + customCategories.length;
    if (totalCategories === 0) {
      Alert.alert('שגיאה', 'נא לבחור לפחות קטגוריה אחת');
      return;
    }

    setIsCreating(true);
    const boardData = {
      name: newBoardName.trim(),
      description: newBoardDescription.trim(),
      currency: 'ILS',
      timezone: 'Asia/Jerusalem',
      board_type: selectedBoardType.id,
      custom_categories: [...selectedCategories, ...customCategories],
    };
    
    const result = await createBoard(boardData);
    setIsCreating(false);

    if (result.success) {
      onClose();
      resetWizard();
      onBoardCreated(result.board);
    } else {
      Alert.alert('שגיאה', result.error || 'שגיאה ביצירת לוח');
    }
  };

  const nextStep = () => {
    if (wizardStep === 1) {
      if (!newBoardName.trim()) {
        Alert.alert('שגיאה', 'נא להזין שם ללוח');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!selectedBoardType) {
        Alert.alert('שגיאה', 'נא לבחור סוג לוח');
        return;
      }
      setWizardStep(3);
    }
  };

  const previousStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const renderBoardTypeItem = ({ item }: { item: BoardType }) => (
    <TouchableOpacity
      style={[
        styles.boardTypeItem,
        selectedBoardType?.id === item.id && styles.selectedBoardTypeItem,
      ]}
      onPress={() => handleBoardTypeSelect(item)}
    >
      <Text style={styles.boardTypeIcon}>{item.icon}</Text>
      <Text style={styles.boardTypeName}>{item.name}</Text>
      <Text style={styles.boardTypeDescription}>{item.description}</Text>
    </TouchableOpacity>
  );


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

  const renderWizardStep1 = () => (
    <View style={styles.wizardContent}>
      <Text style={styles.wizardTitle}>שלב 1: פרטי הלוח</Text>
      
      <TextInput
        style={styles.wizardInput}
        placeholder="שם הלוח"
        value={newBoardName}
        onChangeText={setNewBoardName}
        textAlign="right"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      <TextInput
        style={styles.wizardInput}
        placeholder="תיאור (אופציונלי)"
        value={newBoardDescription}
        onChangeText={setNewBoardDescription}
        multiline
        numberOfLines={3}
        textAlign="right"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
    </View>
  );

  const renderWizardStep2 = () => (
    <View style={styles.wizardContent}>
      <Text style={styles.wizardTitle}>שלב 2: בחר סוג לוח</Text>
      
      <ScrollView 
        style={styles.boardTypeList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.boardTypeScrollContent}
      >
        {BOARD_TYPES.map((item) => (
          <View key={item.id}>
            {renderBoardTypeItem({ item })}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderWizardStep3 = () => {
    return (
      <View style={styles.wizardContent}>
        <CategorySelector
          selectedBoardType={selectedBoardType}
          selectedCategories={selectedCategories}
          customCategories={customCategories}
          onCategoryToggle={handleCategoryToggle}
          onRemoveCustomCategory={handleRemoveCustomCategory}
          onAddCustomCategory={handleOpenCustomCategoryModal}
          maxCategories={7}
          showCustomCategories={true}
          showAddCustomButton={true}
          showHeader={true}
          headerTitle="שלב 3: בחר קטגוריות"
          headerSubtitle={selectedBoardType ? `קטגוריות עבור לוח "${selectedBoardType.name}"` : undefined}
          helpText="בחר עד 7 קטגוריות עבור הלוח שלך. הקטגוריות של סוג הלוח מוצגות בראש הרשימה."
        />
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.wizardModalOverlay}>
        <KeyboardAvoidingView 
          style={[styles.wizardModalContent, { height: screenHeight * 0.9 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.wizardHeader}>
            <Text style={styles.wizardModalTitle}>צור לוח חדש</Text>
            <View style={styles.wizardSteps}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.wizardStepIndicator,
                    wizardStep >= step && styles.wizardStepActive,
                  ]}
                >
                  <Text style={[
                    styles.wizardStepNumber,
                    wizardStep >= step && styles.wizardStepNumberActive,
                  ]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {wizardStep === 1 && (
            <ScrollView 
              style={styles.wizardScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.wizardScrollContentContainer}
            >
              {renderWizardStep1()}
            </ScrollView>
          )}
          {wizardStep === 2 && (
            <ScrollView 
              style={styles.wizardScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.wizardScrollContentContainer}
            >
              {renderWizardStep2()}
            </ScrollView>
          )}
          {wizardStep === 3 && renderWizardStep3()}
          
          <View style={styles.wizardButtons}>
            {/* Left button - Back or Cancel */}
            {wizardStep > 1 ? (
              <TouchableOpacity
                style={[styles.wizardButton, styles.wizardCancelButton]}
                onPress={previousStep}
              >
                <Text style={styles.wizardCancelText}>חזור</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.wizardButton, styles.wizardCancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.wizardCancelText}>ביטול</Text>
              </TouchableOpacity>
            )}
            
            {/* Right button - Next or Create */}
            {wizardStep < 3 ? (
              <TouchableOpacity
                style={[styles.wizardButton, styles.wizardCreateButton]}
                onPress={nextStep}
              >
                <Text style={styles.wizardCreateText}>המשך</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.wizardButton, 
                  styles.wizardCreateButton,
                  (isCreating || (selectedCategories.length + customCategories.length === 0)) && styles.disabledWizardButton
                ]}
                onPress={handleCreateBoard}
                disabled={isCreating || (selectedCategories.length + customCategories.length === 0)}
              >
                <Text style={styles.wizardCreateText}>
                  {isCreating ? 'יוצר...' : 'צור לוח'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
      
      {/* Custom Category Modal */}
      <Modal
        visible={showCustomCategoryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCustomCategoryModal(false)}
      >
        <View style={styles.customCategoryModalOverlay}>
          <KeyboardAvoidingView 
            style={[styles.customCategoryModalContent, { height: screenHeight * 0.8 }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
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
            
            {/* DISABLED: Image upload section */}
            {/*
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
              
              {selectedCategoryImage && (
                <View style={styles.selectedImageContainer}>
                  <CategoryImage imageUrl={selectedCategoryImage} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.clearImageButton}
                    onPress={handleClearImage}
                  >
                    <Text style={styles.clearImageButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            */}
            
            <ScrollView style={styles.iconSelector} showsVerticalScrollIndicator={false}>
              <View style={styles.iconGrid}>
                {availableIcons.reduce((rows: any[], item, index) => {
                  if (index % 5 === 0) {
                    const rowIcons = availableIcons.slice(index, index + 5);
                    rows.push(
                      <View key={`icon-row-${index}`} style={styles.iconRow}>
                        {rowIcons.map((icon, iconIndex) => (
                          <View key={`icon-${index + iconIndex}`} style={styles.iconItemContainer}>
                            {renderIconItem({ item: icon })}
                          </View>
                        ))}
                      </View>
                    );
                  }
                  return rows;
                }, [])}
              </View>
            </ScrollView>
            
            <View style={styles.customCategoryModalButtons}>
              <TouchableOpacity
                style={[styles.customCategoryButton, styles.customCategoryCancelButton]}
                onPress={() => {
                  setShowCustomCategoryModal(false);
                  setNewCustomCategoryName('');
                  setSelectedCustomIcon('📝');
                  // DISABLED: setSelectedCategoryImage(null);
                  // DISABLED: setIsUploadingImage(false);
                }}
              >
                <Text style={styles.customCategoryCancelText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.customCategoryButton, 
                  styles.customCategoryAddButton,
                  !newCustomCategoryName.trim() && styles.disabledCustomCategoryButton
                ]}
                onPress={handleAddCustomCategory}
                disabled={!newCustomCategoryName.trim()}
              >
                <Text style={styles.customCategoryAddText}>הוסף</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wizardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  wizardScrollContent: {
    flex: 1,
    marginBottom: 20,
  },
  wizardScrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  wizardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  wizardModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  wizardSteps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  wizardStepIndicator: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardStepActive: {
    borderColor: '#2ecc71',
  },
  wizardStepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0e0e0',
  },
  wizardStepNumberActive: {
    color: '#2ecc71',
  },
  wizardContent: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  wizardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  wizardSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  wizardInput: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 18,
    backgroundColor: '#fafbfc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 50,
  },
  boardTypeList: {
    flex: 1,
  },
  boardTypeScrollContent: {
    paddingBottom: 10,
  },
  boardTypeItem: {
    padding: 14,
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fafbfc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
  },
  selectedBoardTypeItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    shadowColor: '#2196f3',
    shadowOpacity: 0.2,
  },
  boardTypeIcon: {
    fontSize: 28,
    color: '#2c3e50',
    marginBottom: 6,
    textAlign: 'center',
  },
  boardTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 3,
  },
  boardTypeDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 16,
  },
  wizardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  wizardButton: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  wizardCancelButton: {
    backgroundColor: '#ecf0f1',
  },
  wizardCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  wizardCreateButton: {
    backgroundColor: '#2ecc71',
  },
  wizardCreateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledWizardButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.7,
  },
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
  iconSelector: {
    maxHeight: 200,
    marginBottom: 20,
  },
  iconGrid: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  iconItemContainer: {
    flex: 1,
    alignItems: 'center',
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
  categoryImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
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
});

export default CreateBoardWizard; 