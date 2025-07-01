import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Expense } from './ExpenseCard';
import { ThemedText } from './ThemedText';

interface QuickAddExpenseWizardProps {
  visible: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'date'>) => void;
}

const PREDEFINED_CATEGORIES = ['חשמל', 'מים', 'ארנונה', 'סופר'];

type WizardStep = 'category' | 'amount' | 'paidBy' | 'notes' | 'confirm';

export function QuickAddExpenseWizard({
  visible,
  onClose,
  onSave,
}: QuickAddExpenseWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('אני');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      resetWizard();
    }
  }, [visible]);

  const resetWizard = () => {
    setCurrentStep('category');
    setSelectedCategory('');
    setAmount('');
    setPaidBy('אני');
    setNotes('');
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'category':
        if (!selectedCategory) {
          Alert.alert('שגיאה', 'אנא בחר קטגוריה');
          return;
        }
        setCurrentStep('amount');
        break;
      case 'amount':
        if (!amount || parseFloat(amount) <= 0) {
          Alert.alert('שגיאה', 'אנא הכנס סכום תקין');
          return;
        }
        setCurrentStep('paidBy');
        break;
      case 'paidBy':
        if (!paidBy.trim()) {
          Alert.alert('שגיאה', 'אנא הכנס מי שילם');
          return;
        }
        setCurrentStep('notes');
        break;
      case 'notes':
        setCurrentStep('confirm');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'amount':
        setCurrentStep('category');
        break;
      case 'paidBy':
        setCurrentStep('amount');
        break;
      case 'notes':
        setCurrentStep('paidBy');
        break;
      case 'confirm':
        setCurrentStep('notes');
        break;
    }
  };

  const handleSave = () => {
    const expenseData: Omit<Expense, 'id' | 'date'> = {
      amount: parseFloat(amount),
      category: selectedCategory,
      description: notes.trim() || undefined,
      paidBy,
      isRecurring: false,
    };

    onSave(expenseData);
    resetWizard();
    onClose();
  };

  const handleCancel = () => {
    resetWizard();
    onClose();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'category':
        return 'בחר קטגוריה';
      case 'amount':
        return 'הכנס סכום';
      case 'paidBy':
        return 'מי שילם?';
      case 'notes':
        return 'הערות (אופציונלי)';
      case 'confirm':
        return 'אישור';
      default:
        return '';
    }
  };

  const getStepNumber = () => {
    const steps: WizardStep[] = ['category', 'amount', 'paidBy', 'notes', 'confirm'];
    return steps.indexOf(currentStep) + 1;
  };

  const renderCategoryStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.categoryGrid}>
        {PREDEFINED_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <ThemedText
              style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.categoryButtonTextActive,
              ]}
            >
              {category}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAmountStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.amountContainer}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="הכנס סכום"
          placeholderTextColor="#999"
          textAlign="center"
          autoFocus
        />
        <ThemedText style={styles.currencyLabel}>₪</ThemedText>
      </View>
    </View>
  );

  const renderPaidByStep = () => (
    <View style={styles.stepContent}>
      <TextInput
        style={styles.textInput}
        value={paidBy}
        onChangeText={setPaidBy}
        placeholder="שם המשלם"
        placeholderTextColor="#999"
        textAlign="center"
        autoFocus
      />
    </View>
  );

  const renderNotesStep = () => (
    <View style={styles.stepContent}>
      <TextInput
        style={[styles.textInput, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="הערות (אופציונלי)"
        placeholderTextColor="#999"
        textAlign="center"
        multiline
        numberOfLines={3}
        autoFocus
      />
    </View>
  );

  const renderConfirmStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <ThemedText style={styles.confirmLabel}>קטגוריה:</ThemedText>
          <ThemedText style={styles.confirmValue}>{selectedCategory}</ThemedText>
        </View>
        <View style={styles.confirmRow}>
          <ThemedText style={styles.confirmLabel}>סכום:</ThemedText>
          <ThemedText style={styles.confirmValue}>₪{parseFloat(amount).toLocaleString('he-IL')}</ThemedText>
        </View>
        <View style={styles.confirmRow}>
          <ThemedText style={styles.confirmLabel}>שולם על ידי:</ThemedText>
          <ThemedText style={styles.confirmValue}>{paidBy}</ThemedText>
        </View>
        {notes && (
          <View style={styles.confirmRow}>
            <ThemedText style={styles.confirmLabel}>הערות:</ThemedText>
            <ThemedText style={styles.confirmValue}>{notes}</ThemedText>
          </View>
        )}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'category':
        return renderCategoryStep();
      case 'amount':
        return renderAmountStep();
      case 'paidBy':
        return renderPaidByStep();
      case 'notes':
        return renderNotesStep();
      case 'confirm':
        return renderConfirmStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="subtitle" style={styles.title}>
              הוסף הוצאה חדשה
            </ThemedText>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(getStepNumber() / 5) * 100}%` }]} />
            </View>
            <ThemedText style={styles.stepIndicator}>
              שלב {getStepNumber()} מתוך 5
            </ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.stepTitle}>
            {getStepTitle()}
          </ThemedText>
          
          {renderCurrentStep()}
        </View>

        <View style={styles.footer}>
          {currentStep !== 'category' && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#007AFF" />
              <ThemedText style={styles.backButtonText}>חזור</ThemedText>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={currentStep === 'confirm' ? handleSave : handleNext}
            style={styles.nextButton}
          >
            <ThemedText style={styles.nextButtonText}>
              {currentStep === 'confirm' ? 'שמור' : 'המשך'}
            </ThemedText>
            {currentStep !== 'confirm' && (
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E1E5E9',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  stepContent: {
    alignItems: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  categoryButton: {
    width: 120,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E1E5E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    minWidth: 200,
    borderWidth: 2,
    borderColor: '#E1E5E9',
  },
  currencyLabel: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 12,
  },
  textInput: {
    fontSize: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E1E5E9',
    minWidth: 250,
    textAlign: 'center',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  confirmLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
}); 