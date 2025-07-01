import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getBoardTypeById } from '../constants/boardTypes';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { apiService, Category } from '../services/api';

const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedBoard, boardMembers } = useBoard();
  const { user } = useAuth();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaidBy, setSelectedPaidBy] = useState('');
  const [tags, setTags] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const boardType = selectedBoard ? getBoardTypeById(selectedBoard.board_type) : null;
  const quickCategories = boardType?.quickCategories || [];

  useEffect(() => {
    if (selectedBoard) {
      loadCategories();
      // Set current user as default payer
      if (user) {
        setSelectedPaidBy(user.id);
      }
    }
  }, [selectedBoard, user]);

  const loadCategories = async () => {
    if (!selectedBoard) return;

    try {
      const result = await apiService.getBoardCategories(selectedBoard.id);
      if (result.success && result.data) {
        setCategories(result.data.categories);
        // Set first quick category as default if available
        if (quickCategories.length > 0) {
          setSelectedCategory(quickCategories[0].name);
        } else if (result.data.categories.length > 0) {
          setSelectedCategory(result.data.categories[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    // Set description to category name if description is empty
    if (!description.trim()) {
      setDescription(categoryName);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBoard || !user) return;

    if (!amount || !selectedCategory || !selectedPaidBy) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('שגיאה', 'נא להזין סכום תקין');
      return;
    }

    setIsLoading(true);
    try {
      const expenseData = {
        amount: amountValue,
        category: selectedCategory,
        description: description.trim(),
        paid_by: selectedPaidBy,
        date: new Date().toISOString(),
        is_recurring: isRecurring,
        frequency: 'monthly',
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : [],
      };

      const result = await apiService.createExpense(selectedBoard.id, expenseData);
      
      if (result.success) {
        Alert.alert('הצלחה', 'ההוצאה נוספה בהצלחה', [
          { text: 'אישור', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בהוספת ההוצאה');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      Alert.alert('שגיאה', 'שגיאה בהוספת ההוצאה');
    } finally {
      setIsLoading(false);
    }
  };

  const getMemberName = (userId: string) => {
    const member = boardMembers.find(m => m.user_id === userId);
    return member ? `${member.user.first_name} ${member.user.last_name}` : 'לא ידוע';
  };

  const renderCategoryButtons = () => {
    if (quickCategories.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>קטגוריה</Text>
        <View style={styles.quickButtonsContainer}>
          {quickCategories.map((quickCategory, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickButton,
                { backgroundColor: quickCategory.color },
                selectedCategory === quickCategory.name && styles.selectedQuickButton,
              ]}
              onPress={() => handleCategorySelect(quickCategory.name)}
            >
              <Text style={styles.quickButtonIcon}>{quickCategory.icon}</Text>
              <Text style={styles.quickButtonText}>{quickCategory.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPaidBySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>שולם על ידי</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.memberContainer}>
          {boardMembers.map((member) => (
            <TouchableOpacity
              key={member.user_id}
              style={[
                styles.memberButton,
                selectedPaidBy === member.user_id && styles.selectedMemberButton,
              ]}
              onPress={() => setSelectedPaidBy(member.user_id)}
            >
              <Text
                style={[
                  styles.memberButtonText,
                  selectedPaidBy === member.user_id && styles.selectedMemberButtonText,
                ]}
              >
                {member.user.first_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>סכום</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              textAlign="right"
            />
          </View>

          {renderCategoryButtons()}
          {renderPaidBySelector()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>תיאור (אופציונלי)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="תיאור ההוצאה..."
              multiline
              numberOfLines={3}
              textAlign="right"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>תגיות (אופציונלי)</Text>
            <TextInput
              style={styles.tagsInput}
              value={tags}
              onChangeText={setTags}
              placeholder="תגיות מופרדות בפסיקים..."
              textAlign="right"
            />
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.recurringContainer}
              onPress={() => setIsRecurring(!isRecurring)}
            >
              <View style={[styles.checkbox, isRecurring && styles.checkedCheckbox]}>
                {isRecurring && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.recurringText}>הוצאה חוזרת</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'מוסיף...' : 'הוסף הוצאה'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  tagsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  quickButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickButton: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedQuickButton: {
    borderWidth: 3,
    borderColor: '#2c3e50',
  },
  quickButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  memberContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  memberButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: 'white',
  },
  selectedMemberButton: {
    borderColor: '#3498db',
    backgroundColor: '#ebf3fd',
  },
  memberButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  selectedMemberButtonText: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  recurringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recurringText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddExpenseScreen; 