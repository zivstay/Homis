import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BOARD_TYPES, BoardType, QuickCategory } from '../constants/boardTypes';

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
  const [wizardStep, setWizardStep] = useState(1); // 1: פרטים, 2: סוג לוח, 3: קטגוריות
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<QuickCategory[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const resetWizard = () => {
    setWizardStep(1);
    setNewBoardName('');
    setNewBoardDescription('');
    setSelectedBoardType(null);
    setSelectedCategories([]);
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
        // Check if we're at the limit of 7 categories
        if (prev.length >= 7) {
          Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד. בטל בחירה של קטגוריה אחרת כדי להוסיף חדשה.');
          return prev;
        }
        return [...prev, category];
      }
    });
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

    if (selectedCategories.length === 0) {
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
      custom_categories: selectedCategories,
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

  const renderCategoryItem = ({ item }: { item: QuickCategory }) => {
    const isSelected = selectedCategories.some(cat => cat.name === item.name);
    const isDisabled = !isSelected && selectedCategories.length >= 7;
    
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
      
      <FlatList
        data={BOARD_TYPES}
        renderItem={renderBoardTypeItem}
        keyExtractor={(item) => item.id}
        style={styles.boardTypeList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const renderWizardStep3 = () => {
    // Get all available categories (current board type first, then all others)
    const getAllAvailableCategories = () => {
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
      BOARD_TYPES.forEach(boardType => {
        if (boardType.id !== selectedBoardType.id) {
          boardType.quickCategories.forEach(category => {
            if (!addedNames.has(category.name) && category.name !== 'אחר') {
              allCategories.push(category);
              addedNames.add(category.name);
            }
          });
        }
      });
      
      // Third: Add additional common/useful categories (excluding "אחר")
      const additionalCategories = [
        { name: 'תחזוקה', icon: '🔧', color: '#FF8C00' },
        { name: 'ביטוח', icon: '🛡️', color: '#F7DC6F' },
        { name: 'מיסים', icon: '📋', color: '#95A5A6' },
        { name: 'תרומות', icon: '💝', color: '#FF69B4' },
        { name: 'חיות מחמד', icon: '🐕', color: '#98D8C8' },
        { name: 'טכנולוגיה', icon: '📱', color: '#4ECDC4' },
        { name: 'ספרים', icon: '📚', color: '#E74C3C' },
        { name: 'מתנות', icon: '🎁', color: '#9B59B6' },
        { name: 'עבודה', icon: '💼', color: '#3498DB' },
        { name: 'חינוך', icon: '🎓', color: '#E67E22' },
        { name: 'בריאות', icon: '🏥', color: '#E74C3C' },
        { name: 'ספורט', icon: '⚽', color: '#2ECC71' },
        { name: 'נסיעות', icon: '✈️', color: '#9B59B6' },
        { name: 'תחביבים', icon: '🎨', color: '#F39C12' },
        { name: 'קניות', icon: '🛒', color: '#8E44AD' },
        { name: 'תקשורת', icon: '📞', color: '#34495E' },
        { name: 'משפט', icon: '⚖️', color: '#2C3E50' },
        { name: 'יופי', icon: '💄', color: '#EC7063' },
        { name: 'משחקים', icon: '🎮', color: '#AF7AC5' },
        { name: 'אירועים', icon: '🎉', color: '#F1C40F' },
      ];
      
      additionalCategories.forEach(category => {
        if (!addedNames.has(category.name) && category.name !== 'אחר') {
          allCategories.push(category);
          addedNames.add(category.name);
        }
      });
      
      return allCategories;
    };

    return (
      <View style={styles.wizardContent}>
        <Text style={styles.wizardTitle}>שלב 3: בחר קטגוריות</Text>
        
        {selectedBoardType && (
          <Text style={styles.wizardSubtitle}>
            קטגוריות עבור לוח "{selectedBoardType.name}"
          </Text>
        )}
        
        <Text style={styles.selectedCountText}>
          נבחרו: {selectedCategories.length}/7 קטגוריות
        </Text>
        
        <Text style={styles.wizardHelpText}>
          בחר עד 7 קטגוריות עבור הלוח שלך. הקטגוריות של סוג הלוח מוצגות בראש הרשימה.
        </Text>
        
        <FlatList
          data={getAllAvailableCategories()}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.name}
          style={styles.categoriesList}
          numColumns={2}
          columnWrapperStyle={styles.categoriesRow}
          showsVerticalScrollIndicator={false}
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
        <View style={styles.wizardModalContent}>
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

          {wizardStep === 1 && renderWizardStep1()}
          {wizardStep === 2 && renderWizardStep2()}
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
                  (isCreating || selectedCategories.length === 0) && styles.disabledWizardButton
                ]}
                onPress={handleCreateBoard}
                disabled={isCreating || selectedCategories.length === 0}
              >
                <Text style={styles.wizardCreateText}>
                  {isCreating ? 'יוצר...' : 'צור לוח'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
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
    padding: 28,
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
  wizardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wizardModalTitle: {
    fontSize: 24,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardStepActive: {
    borderColor: '#2ecc71',
  },
  wizardStepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0e0e0',
  },
  wizardStepNumberActive: {
    color: '#2ecc71',
  },
  wizardContent: {
    marginBottom: 20,
  },
  wizardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
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
  },
  boardTypeList: {
    maxHeight: 220,
  },
  boardTypeItem: {
    padding: 18,
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#fafbfc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedBoardTypeItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    shadowColor: '#2196f3',
    shadowOpacity: 0.2,
  },
  boardTypeIcon: {
    fontSize: 32,
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  boardTypeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 6,
  },
  boardTypeDescription: {
    fontSize: 15,
    color: '#7f8c8d',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
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
  wizardHelpText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  categoriesList: {
    maxHeight: 280,
    marginTop: 12,
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
  categoryIcon: {
    fontSize: 18,
    marginRight: 6,
    minWidth: 22,
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
  disabledCategoryItem: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
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
  wizardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  wizardButton: {
    width: '48%',
    paddingVertical: 16,
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
});

export default CreateBoardWizard; 