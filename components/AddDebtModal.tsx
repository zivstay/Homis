import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Debt } from './DebtCard';
import { ThemedText } from './ThemedText';

interface AddDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id' | 'date'>) => void;
  debt?: Debt;
  isEditing?: boolean;
  availableUsers: string[];
  currentUser: string;
}

export function AddDebtModal({
  visible,
  onClose,
  onSave,
  debt,
  isEditing = false,
  availableUsers,
  currentUser,
}: AddDebtModalProps) {
  const [fromUser, setFromUser] = useState('');
  const [toUser, setToUser] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [debtType, setDebtType] = useState<'i-owe' | 'owe-me'>('i-owe');

  useEffect(() => {
    if (debt && isEditing) {
      setFromUser(debt.fromUser);
      setToUser(debt.toUser);
      setAmount(debt.amount.toString());
      setDescription(debt.description);
      setDebtType(debt.fromUser === currentUser ? 'i-owe' : 'owe-me');
    } else {
      resetForm();
    }
  }, [debt, isEditing, visible, currentUser]);

  const resetForm = () => {
    setFromUser('');
    setToUser('');
    setAmount('');
    setDescription('');
    setDebtType('i-owe');
  };

  const handleSave = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('שגיאה', 'אנא הכנס סכום תקין');
      return;
    }

    let finalFromUser = fromUser;
    let finalToUser = toUser;

    if (debtType === 'i-owe') {
      finalFromUser = currentUser;
      if (!finalToUser.trim()) {
        Alert.alert('שגיאה', 'אנא בחר למי אתה צריך להחזיר');
        return;
      }
    } else {
      finalToUser = currentUser;
      if (!finalFromUser.trim()) {
        Alert.alert('שגיאה', 'אנא בחר מי צריך להחזיר לך');
        return;
      }
    }

    const debtData: Omit<Debt, 'id' | 'date'> = {
      fromUser: finalFromUser,
      toUser: finalToUser,
      amount: parseFloat(amount),
      description: description.trim() || 'חוב',
      isPaid: false,
    };

    onSave(debtData);
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const otherUsers = availableUsers.filter(user => user !== currentUser);

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
          <ThemedText type="subtitle" style={styles.title}>
            {isEditing ? 'ערוך חוב' : 'הוסף חוב חדש'}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={styles.saveButtonText}>שמור</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Debt Type Selection */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>סוג החוב</ThemedText>
            <View style={styles.debtTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.debtTypeButton,
                  debtType === 'i-owe' && styles.debtTypeButtonActive,
                ]}
                onPress={() => setDebtType('i-owe')}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={debtType === 'i-owe' ? '#FFFFFF' : '#FF5722'}
                />
                <ThemedText
                  style={[
                    styles.debtTypeText,
                    debtType === 'i-owe' && styles.debtTypeTextActive,
                  ]}
                >
                  אני צריך להחזיר
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.debtTypeButton,
                  debtType === 'owe-me' && styles.debtTypeButtonActive,
                ]}
                onPress={() => setDebtType('owe-me')}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={debtType === 'owe-me' ? '#FFFFFF' : '#4CAF50'}
                />
                <ThemedText
                  style={[
                    styles.debtTypeText,
                    debtType === 'owe-me' && styles.debtTypeTextActive,
                  ]}
                >
                  צריך להחזיר לי
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* User Selection */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>
              {debtType === 'i-owe' ? 'אני צריך להחזיר ל:' : 'צריך להחזיר לי:'}
            </ThemedText>
            <View style={styles.userGrid}>
              {otherUsers.map((user) => (
                <TouchableOpacity
                  key={user}
                  style={[
                    styles.userButton,
                    (debtType === 'i-owe' ? toUser : fromUser) === user && styles.userButtonActive,
                  ]}
                  onPress={() => {
                    if (debtType === 'i-owe') {
                      setToUser(user);
                    } else {
                      setFromUser(user);
                    }
                  }}
                >
                  <ThemedText
                    style={[
                      styles.userButtonText,
                      (debtType === 'i-owe' ? toUser : fromUser) === user && styles.userButtonTextActive,
                    ]}
                  >
                    {user}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>סכום (₪)</ThemedText>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="הכנס סכום"
              placeholderTextColor="#999"
              textAlign="center"
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>תיאור (אופציונלי)</ThemedText>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="הוסף תיאור לחוב"
              placeholderTextColor="#999"
              textAlign="right"
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
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
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  debtTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  debtTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E1E5E9',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  debtTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  debtTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  debtTypeTextActive: {
    color: '#FFFFFF',
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    alignItems: 'center',
  },
  userButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  userButtonText: {
    fontSize: 16,
    color: '#333',
  },
  userButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  amountInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
}); 