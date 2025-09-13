import React, { useState } from 'react';
import {
  Alert,
  FlatList,
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
import { BOARD_TYPES, BoardType } from '../constants/boardTypes';

interface CreateBoardWizardProps {
  isVisible: boolean;
  onClose: () => void;
  onBoardCreated: (newBoard?: any, shouldOpenCategories?: boolean) => void;
  createBoard: (boardData: any) => Promise<{ success: boolean; error?: string; board?: any }>;
}

const CreateBoardWizard: React.FC<CreateBoardWizardProps> = ({
  isVisible,
  onClose,
  onBoardCreated,
  createBoard,
}) => {
  const [wizardStep, setWizardStep] = useState(1); // 1: פרטים, 2: סוג לוח
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const resetWizard = () => {
    setWizardStep(1);
    setNewBoardName('');
    setNewBoardDescription('');
    setSelectedBoardType(null);
  };

  const handleBoardTypeSelect = (boardType: BoardType) => {
    setSelectedBoardType(boardType);
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

    setIsCreating(true);
    const boardData = {
      name: newBoardName.trim(),
      description: newBoardDescription.trim(),
      currency: 'ILS',
      timezone: 'Asia/Jerusalem',
      board_type: selectedBoardType.id,
    };
    
    const result = await createBoard(boardData);
    setIsCreating(false);

    if (result.success) {
      onClose();
      resetWizard();
      // Pass a flag to indicate we should open categories modal
      onBoardCreated(result.board, true); // true = should open categories modal
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
      // Create board immediately after step 2
      handleCreateBoard();
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
      {selectedBoardType?.id === item.id && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderWizardStep1 = () => (
    <ScrollView style={styles.wizardContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.wizardTitle}>שלב 1: פרטי הלוח</Text>
      
      <TextInput
        style={styles.input}
        placeholder="שם הלוח"
        value={newBoardName}
        onChangeText={setNewBoardName}
        textAlign="right"
        maxLength={50}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="תיאור הלוח (אופציונלי)"
        value={newBoardDescription}
        onChangeText={setNewBoardDescription}
        textAlign="right"
        multiline
        numberOfLines={3}
        maxLength={200}
      />
    </ScrollView>
  );

  const renderWizardStep2 = () => (
    <View style={styles.wizardContent}>
      <Text style={styles.wizardTitle}>שלב 2: בחר סוג לוח</Text>
      
      <FlatList
        data={BOARD_TYPES}
        renderItem={renderBoardTypeItem}
        keyExtractor={(item) => item.id}
        style={styles.boardTypesList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.wizardModalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.wizardModalContent}>
          <View style={styles.wizardHeader}>
            <Text style={styles.wizardModalTitle}>צור לוח חדש</Text>
            <View style={styles.wizardSteps}>
              {[1, 2].map((step) => (
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
          
          <View style={styles.wizardButtons}>
            {/* Left button - Back or Cancel */}
            {wizardStep > 1 ? (
              <TouchableOpacity
                style={[styles.wizardButton, styles.wizardBackButton]}
                onPress={previousStep}
              >
                <Text style={styles.wizardBackText}>חזור</Text>
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
            {wizardStep < 2 ? (
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
                  isCreating && styles.disabledWizardButton
                ]}
                onPress={handleCreateBoard}
                disabled={isCreating}
              >
                <Text style={styles.wizardCreateText}>
                  {isCreating ? 'יוצר...' : 'צור לוח'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
    minHeight: '60%',
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
    marginBottom: 16,
  },
  wizardModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 16,
  },
  wizardSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  wizardStepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bdc3c7',
  },
  wizardStepActive: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  wizardStepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  wizardStepNumberActive: {
    color: 'white',
  },
  wizardContent: {
    flex: 1,
    minHeight: 200,
    maxHeight: 380,
  },
  wizardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafbfc',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  boardTypesList: {
    maxHeight: 300,
  },
  boardTypeItem: {
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e6ed',
    alignItems: 'center',
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
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOpacity: 0.2,
  },
  boardTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  boardTypeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  boardTypeDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 20,
    color: '#4caf50',
    fontWeight: 'bold',
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
  wizardBackButton: {
    backgroundColor: '#ecf0f1',
  },
  wizardBackText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
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
    opacity: 0.6,
  },
});

export default CreateBoardWizard;
