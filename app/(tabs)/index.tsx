import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddExpenseModal } from '@/components/AddExpenseModal';
import { Expense, ExpenseCard } from '@/components/ExpenseCard';
import { MonthlyBalance } from '@/components/MonthlyBalance';
import { MonthPickerModal } from '@/components/MonthPickerModal';
import { QuickAmountModal } from '@/components/QuickAmountModal';
import { QuickCategoryButtons } from '@/components/QuickCategoryButtons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useBoard } from '@/contexts/BoardContext';

import { Expense as ApiExpense, apiService, Category } from '@/services/api';

export default function HomeScreen() {
  const { selectedBoard, boardMembers, boardExpenses, refreshBoardExpenses } = useBoard();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [isAmountModalVisible, setIsAmountModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  // Convert API Expense to component Expense
  const convertApiExpenseToExpense = (apiExpense: ApiExpense): Expense => ({
    id: apiExpense.id,
    amount: apiExpense.amount,
    category: apiExpense.category,
    description: apiExpense.description,
    imageUri: apiExpense.image_url, // Map image_url to imageUri
    paidBy: apiExpense.paid_by,
    date: new Date(apiExpense.date),
    isRecurring: apiExpense.is_recurring,
    frequency: apiExpense.frequency as 'daily' | 'weekly' | 'monthly',
    startDate: apiExpense.start_date ? new Date(apiExpense.start_date) : undefined,
  });

  // Filter expenses for current month/year from boardExpenses
  const getCurrentMonthExpenses = () => {
    return boardExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
  };

  // Load data when board changes or month/year changes
  useEffect(() => {
    if (selectedBoard) {
      loadCategories();
    }
  }, [selectedBoard, currentMonth, currentYear]);

  // Refresh data when screen comes into focus (e.g., after adding expense)
  useFocusEffect(
    useCallback(() => {
      if (selectedBoard) {
        refreshBoardExpenses();
      }
    }, [selectedBoard, currentMonth, currentYear])
  );

  const loadCategories = async () => {
    if (!selectedBoard) return;

    setIsLoading(true);
    try {
      const categoriesResult = await apiService.getBoardCategories(selectedBoard.id);

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data.categories);
      } else {
        console.error('Failed to load categories:', categoriesResult.error);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshBoardExpenses(),
      loadCategories()
    ]);
    setRefreshing(false);
  };

  // Calculate monthly totals from filtered expenses
  const getTotalExpenses = () => {
    const currentMonthExpenses = getCurrentMonthExpenses();
    return currentMonthExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getCurrentMonthAndYear = () => ({
    month: currentMonth,
    year: currentYear,
  });

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const getPersonalizedTitle = () => {
    return 'Homeis - מנהל ההוצאות שלך';
  };

  const getPersonalizedEmptyMessage = () => {
    return {
      title: 'אין הוצאות החודש',
      subtitle: 'הוסף הוצאה ראשונה כדי להתחיל לעקוב אחר ההוצאות',
    };
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
    if (!selectedBoard) return;

    try {
      const apiExpenseData = {
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description || '',
        paid_by: expenseData.paidBy,
        is_recurring: expenseData.isRecurring,
        frequency: expenseData.frequency || 'monthly',
      };

      const result = await apiService.createExpense(selectedBoard.id, apiExpenseData);
      if (result.success) {
        // Optimistic update - add expense to local state immediately
        const newExpense: Expense = {
          id: result.data?.id || Date.now().toString(), // Use server ID if available, fallback to timestamp
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description,
          paidBy: expenseData.paidBy,
          date: new Date(),
          isRecurring: expenseData.isRecurring,
          frequency: expenseData.frequency,
          startDate: expenseData.startDate,
        };
        
        // Add to the beginning of the list
        // setExpenses(prev => [newExpense, ...prev]); // This line is removed as expenses are now managed by BoardContext
        
        Alert.alert('', 'ההוצאה נוספה בהצלחה');
        
        // Sync with server in background - ensure loadData is called
        setTimeout(async () => {
          console.log('Background sync: loading expenses from server...');
          await refreshBoardExpenses(); // Use refreshBoardExpenses from BoardContext
        }, 500);
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בהוספת ההוצאה');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('שגיאה', 'שגיאה בהוספת ההוצאה');
    }
  };

  const handleUpdateExpense = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
    if (!editingExpense || !selectedBoard) return;

    try {
      const result = await apiService.updateExpense(selectedBoard.id, editingExpense.id, {
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description || '',
        paid_by: expenseData.paidBy,
        is_recurring: expenseData.isRecurring,
        frequency: expenseData.frequency || 'monthly',
      });

      if (result.success) {
        // Optimistic update - update expense in local state immediately
        const updatedExpense: Expense = {
          ...editingExpense,
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description,
          paidBy: expenseData.paidBy,
          isRecurring: expenseData.isRecurring,
          frequency: expenseData.frequency,
          startDate: expenseData.startDate,
        };
        
        // setExpenses(prev => prev.map(expense => 
        //   expense.id === editingExpense.id ? updatedExpense : expense
        // )); // This line is removed as expenses are now managed by BoardContext
        
        setEditingExpense(undefined);
        Alert.alert('הצלחה', 'ההוצאה עודכנה בהצלחה');
        
        // Sync with server in background - ensure loadData is called
        setTimeout(async () => {
          console.log('Background sync: loading expenses from server...');
          await refreshBoardExpenses(); // Use refreshBoardExpenses from BoardContext
        }, 1000);
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בעדכון ההוצאה');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      Alert.alert('שגיאה', 'שגיאה בעדכון ההוצאה');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddModalVisible(true);
  };

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category);
    setIsAmountModalVisible(true);
  };

  const handleDeleteExpense = async (expense: ApiExpense) => {
    if (!selectedBoard || !user) return;
    
    // Check if user can delete this expense (only the creator can delete)
    if (expense.created_by !== user.id) {
      Alert.alert('שגיאה', 'ניתן למחוק רק הוצאות שיצרת בעצמך');
      return;
    }

    Alert.alert(
      'מחק הוצאה',
      `האם אתה בטוח שברצונך למחוק את ההוצאה "${expense.description || expense.category}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiService.deleteExpense(selectedBoard.id, expense.id);
              if (result.success) {
                await refreshBoardExpenses(); // Use refreshBoardExpenses from BoardContext
                Alert.alert('הצלחה', 'ההוצאה נמחקה בהצלחה');
              } else {
                // Handle different error types
                let errorMessage = result.error || 'שגיאה במחיקת ההוצאה';
                if (result.error?.includes('payments have already been made')) {
                  errorMessage = 'לא ניתן למחוק הוצאה שכבר בוצעו עליה תשלומים. פנה לתמיכה אם יש צורך בשינוי';
                }
                Alert.alert('שגיאה', errorMessage);
              }
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('שגיאה', 'שגיאה במחיקת ההוצאה');
            }
          },
        },
      ]
    );
  };

  const handleCloseAmountModal = () => {
    setIsAmountModalVisible(false);
    setSelectedCategory('');
  };

  const handleCloseModal = () => {
    setIsAddModalVisible(false);
    setEditingExpense(undefined);
  };

  const handleMonthPress = () => {
    setIsMonthPickerVisible(true);
  };

  const handleAmountModalSave = (amount: number) => {
    const expenseData: Omit<Expense, 'id' | 'date'> = {
      amount,
      category: selectedCategory,
      description: '',
      paidBy: boardMembers[0]?.user_id || '',
      isRecurring: false,
    };
    handleAddExpense(expenseData);
    setIsAmountModalVisible(false);
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <ExpenseCard
      expense={item}
      onEdit={() => handleEditExpense(item)}
      onDelete={() => handleDeleteExpense(item)}
    />
  );

  const emptyMessage = getPersonalizedEmptyMessage();

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.header}>{getPersonalizedTitle()}</ThemedText>

        <FlatList
          data={getCurrentMonthExpenses()} // Use getCurrentMonthExpenses()
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              <MonthlyBalance
                totalExpenses={getTotalExpenses()}
                month={(currentMonth + 1).toString()}
                year={currentYear}
                expenseCount={getCurrentMonthExpenses().length} // Use getCurrentMonthExpenses()
                onMonthPress={handleMonthPress}
              />

              <QuickCategoryButtons onCategoryPress={handleCategoryPress} />
            </>
          }
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateTitle}>{emptyMessage.title}</ThemedText>
              <ThemedText style={styles.emptyStateSubtitle}>{emptyMessage.subtitle}</ThemedText>
            </ThemedView>
          }
          contentContainerStyle={getCurrentMonthExpenses().length === 0 ? styles.emptyContainer : undefined} // Use getCurrentMonthExpenses()
        />

        <QuickAmountModal
          visible={isAmountModalVisible}
          onClose={() => setIsAmountModalVisible(false)}
          onSave={handleAmountModalSave}
          category={selectedCategory}
        />

        <AddExpenseModal
          visible={isAddModalVisible}
          onClose={() => {
            setIsAddModalVisible(false);
            setEditingExpense(undefined);
          }}
          onSave={editingExpense ? handleUpdateExpense : handleAddExpense}
          selectedCategory={selectedCategory}
          availableUsers={boardMembers.map(member => `${member.user.first_name} ${member.user.last_name}`)}
          editingExpense={editingExpense}
        />

        <MonthPickerModal
          visible={isMonthPickerVisible}
          onClose={() => setIsMonthPickerVisible(false)}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onMonthSelect={(month, year) => {
            setCurrentMonth(month);
            setCurrentYear(year);
            setIsMonthPickerVisible(false);
          }}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onCurrentMonth={goToCurrentMonth}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
