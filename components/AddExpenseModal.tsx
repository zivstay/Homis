import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { uploadExpenseImage } from '../config/api';
import { apiService } from '../services/api';
import { Expense } from './ExpenseCard';
import { ThemedText } from './ThemedText';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'date'>) => void;
  expense?: Expense;
  isEditing?: boolean;
}

const PREDEFINED_CATEGORIES = ['חשמל', 'מים', 'ארנונה', 'סופר'];

export function AddExpenseModal({
  visible,
  onClose,
  onSave,
  expense,
  isEditing = false,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('אני');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCategoryType, setSelectedCategoryType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Use centralized upload function
  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const token = apiService.getAccessToken();
      return await uploadExpenseImage(imageUri, token || undefined);
    } catch (error) {
      Alert.alert('שגיאה', error instanceof Error ? error.message : 'שגיאה בהעלאת התמונה');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (expense && isEditing) {
      setAmount(expense.amount.toString());
      setDescription(expense.description || '');
      setPaidBy(expense.paidBy);
      setIsRecurring(expense.isRecurring);
      setFrequency(expense.frequency || 'monthly');
      setStartDate(expense.startDate || new Date());
      setSelectedImage(expense.imageUri || null);
      
      if (PREDEFINED_CATEGORIES.includes(expense.category)) {
        setCategory(expense.category);
        setSelectedCategoryType('predefined');
      } else {
        setCustomCategory(expense.category);
        setSelectedCategoryType('custom');
      }
    } else {
      resetForm();
    }
  }, [expense, isEditing, visible]);

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setCustomCategory('');
    setDescription('');
    setPaidBy('אני');
    setIsRecurring(false);
    setFrequency('monthly');
    setStartDate(new Date());
    setSelectedCategoryType('predefined');
    setSelectedImage(null);
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('שגיאה', 'אנא הכנס סכום תקין');
      return;
    }

    const finalCategory = selectedCategoryType === 'predefined' ? category : customCategory;
    if (!finalCategory.trim()) {
      Alert.alert('שגיאה', 'אנא בחר קטגוריה או הכנס קטגוריה מותאמת אישית');
      return;
    }

    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (selectedImage && !imageUrl) {
        // Upload failed, but user can choose to continue without image
        return;
      }
    }

    const expenseData: Omit<Expense, 'id' | 'date'> = {
      amount: parseFloat(amount),
      category: finalCategory,
      description: description.trim() || undefined,
      paidBy,
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
      startDate: isRecurring ? startDate : undefined,
      imageUri: imageUrl || undefined,
    };

    onSave(expenseData);
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getFrequencyText = (freq: string) => {
    switch (freq) {
      case 'daily':
        return 'יומי';
      case 'weekly':
        return 'שבועי';
      case 'monthly':
        return 'חודשי';
      default:
        return 'חודשי';
    }
  };

  const showDatePickerModal = () => {
    if (Platform.OS === 'ios') {
      setShowDatePicker(true);
    } else {
      // For Android, show the picker immediately
      setShowDatePicker(true);
    }
  };

  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('הרשאה נדרשת', 'אנא אפשר גישה לגלריה כדי לבחור תמונה');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('הרשאה נדרשת', 'אנא אפשר גישה למצלמה כדי לצלם תמונה');
      return;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'הוסף תמונה',
      'בחר אופציה',
      [
        { text: 'מצלמה', onPress: takePhoto },
        { text: 'גלריה', onPress: pickImage },
        { text: 'בטל', style: 'cancel' },
      ]
    );
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
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
            {isEditing ? 'ערוך הוצאה' : 'הוסף הוצאה חדשה'}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={styles.saveButtonText}>שמור</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              textAlign="right"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              blurOnSubmit={true}
            />
          </View>

          {/* Category Selection */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>קטגוריה</ThemedText>
            
            <View style={styles.categoryTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.categoryTypeButton,
                  selectedCategoryType === 'predefined' && styles.categoryTypeButtonActive,
                ]}
                onPress={() => setSelectedCategoryType('predefined')}
              >
                <ThemedText
                  style={[
                    styles.categoryTypeText,
                    selectedCategoryType === 'predefined' && styles.categoryTypeTextActive,
                  ]}
                >
                  קטגוריות מוגדרות
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryTypeButton,
                  selectedCategoryType === 'custom' && styles.categoryTypeButtonActive,
                ]}
                onPress={() => setSelectedCategoryType('custom')}
              >
                <ThemedText
                  style={[
                    styles.categoryTypeText,
                    selectedCategoryType === 'custom' && styles.categoryTypeTextActive,
                  ]}
                >
                  מותאם אישית
                </ThemedText>
              </TouchableOpacity>
            </View>

            {selectedCategoryType === 'predefined' ? (
              <View style={styles.categoryGrid}>
                {PREDEFINED_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <ThemedText
                      style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="הכנס קטגוריה מותאמת אישית"
                placeholderTextColor="#999"
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            )}
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>תיאור (אופציונלי)</ThemedText>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="הוסף תיאור להוצאה"
              placeholderTextColor="#999"
              textAlign="right"
              multiline
              numberOfLines={3}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              blurOnSubmit={true}
            />
          </View>

          {/* Paid By Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>שולם על ידי</ThemedText>
            <TextInput
              style={styles.textInput}
              value={paidBy}
              onChangeText={setPaidBy}
              placeholder="שם המשלם"
              placeholderTextColor="#999"
              textAlign="right"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              blurOnSubmit={true}
            />
          </View>

          {/* Image Upload Section */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>תמונה (אופציונלי)</ThemedText>
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity onPress={removeImage} style={styles.removeImageButton}>
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.imageUploadButton} 
                onPress={showImageOptions}
                disabled={isUploading}
              >
                <Ionicons name="camera" size={24} color="#007AFF" />
                <ThemedText style={styles.imageUploadText}>
                  {isUploading ? 'מעלה...' : 'הוסף תמונה'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Recurring Toggle */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.recurringToggle}
              onPress={() => setIsRecurring(!isRecurring)}
            >
              <View style={styles.recurringToggleContent}>
                <Ionicons
                  name={isRecurring ? 'refresh' : 'refresh-outline'}
                  size={20}
                  color={isRecurring ? '#007AFF' : '#666'}
                />
                <ThemedText style={styles.recurringLabel}>
                  הוצאה קבועה
                </ThemedText>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  isRecurring && styles.toggleSwitchActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    isRecurring && styles.toggleKnobActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Frequency Selection - Only show when recurring is enabled */}
          {isRecurring && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>תדירות</ThemedText>
              <View style={styles.frequencyGrid}>
                {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      frequency === freq && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setFrequency(freq)}
                  >
                    <ThemedText
                      style={[
                        styles.frequencyButtonText,
                        frequency === freq && styles.frequencyButtonTextActive,
                      ]}
                    >
                      {getFrequencyText(freq)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Start Date - Only show when recurring is enabled */}
          {isRecurring && (
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>תאריך התחלה</ThemedText>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={showDatePickerModal}
              >
                <ThemedText style={styles.dateButtonText}>
                  {formatDate(startDate)}
                </ThemedText>
                <Ionicons name="calendar" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date(2030, 11, 31)}
            minimumDate={new Date(2020, 0, 1)}
          />
        )}
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
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
  categoryTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
    padding: 4,
  },
  categoryTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  categoryTypeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryTypeText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTypeTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
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
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#333',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  recurringToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  recurringToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recurringLabel: {
    fontSize: 16,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: '#E1E5E9',
    borderRadius: 12,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#007AFF',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
    backgroundColor: '#007AFF',
  },
  frequencyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyButtonText: {
    fontSize: 16,
    color: '#333',
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  // Image upload styles
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 8,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  imageUploadText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 