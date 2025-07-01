import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddExpenseModal } from '@/components/AddExpenseModal';
import { Expense, ExpenseCard } from '@/components/ExpenseCard';
import { MonthlyBalance } from '@/components/MonthlyBalance';
import { MonthPickerModal } from '@/components/MonthPickerModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { QuickAmountModal } from '@/components/QuickAmountModal';
import { QuickCategoryButtons } from '@/components/QuickCategoryButtons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useExpenses } from '@/contexts/ExpenseContext';

export default function HomeScreen() {
  const {
    addExpense,
    updateExpense,
    deleteExpense,
    getCurrentMonthExpenses,
    getTotalMonthlyExpenses,
    getCurrentMonthAndYear,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    isOnboardingComplete,
    completeOnboarding,
    onboardingConfig,
    users,
  } = useExpenses();

  const [isAmountModalVisible, setIsAmountModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();

  const currentMonthExpenses = getCurrentMonthExpenses();
  const totalExpenses = getTotalMonthlyExpenses();
  const { month, year } = getCurrentMonthAndYear();

  const getPersonalizedTitle = () => {
    if (!onboardingConfig) return 'מנהל הוצאות הבית';
    
    switch (onboardingConfig.type) {
      case 'roommates':
        return 'מנהל הוצאות שותפים';
      case 'travelers':
        return 'מנהל הוצאות טיול';
      case 'couple':
        return 'מנהל הוצאות זוגי';
      case 'family':
        return 'מנהל הוצאות משפחתי';
      case 'custom':
        return 'מנהל הוצאות מותאם';
      default:
        return 'מנהל הוצאות הבית';
    }
  };

  const getPersonalizedEmptyMessage = () => {
    if (!onboardingConfig) {
      return {
        title: 'אין הוצאות החודש',
        subtitle: 'הוסף הוצאה ראשונה כדי להתחיל לעקוב אחר ההוצאות שלך'
      };
    }
    
    switch (onboardingConfig.type) {
      case 'roommates':
        return {
          title: 'אין הוצאות משותפות החודש',
          subtitle: 'הוסף הוצאה משותפת ראשונה עם השותפים שלך'
        };
      case 'travelers':
        return {
          title: 'אין הוצאות טיול החודש',
          subtitle: 'הוסף הוצאה ראשונה מהטיול שלך'
        };
      case 'couple':
        return {
          title: 'אין הוצאות זוגיות החודש',
          subtitle: 'הוסף הוצאה משותפת ראשונה עם בן/בת הזוג'
        };
      case 'family':
        return {
          title: 'אין הוצאות משפחתיות החודש',
          subtitle: 'הוסף הוצאה משפחתית ראשונה'
        };
      case 'custom':
        return {
          title: 'אין הוצאות החודש',
          subtitle: 'הוסף הוצאה ראשונה כדי להתחיל לעקוב אחר ההוצאות שלך'
        };
      default:
        return {
          title: 'אין הוצאות החודש',
          subtitle: 'הוסף הוצאה ראשונה כדי להתחיל לעקוב אחר ההוצאות שלך'
        };
    }
  };

  const handleCategoryPress = (category: string) => {
    setSelectedCategory(category);
    setIsAmountModalVisible(true);
  };

  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    addExpense(expenseData);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddModalVisible(true);
  };

  const handleUpdateExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
      setEditingExpense(undefined);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'מחיקת הוצאה',
      'האם אתה בטוח שברצונך למחוק הוצאה זו?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteExpense(expenseId),
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

  const handleOnboardingComplete = (config: any, categories: string[], usersList: string[]) => {
    completeOnboarding(config, categories, usersList);
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <ExpenseCard
      expense={item}
      onEdit={() => handleEditExpense(item)}
      onDelete={() => handleDeleteExpense(item.id)}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            {getPersonalizedTitle()}
          </ThemedText>
        </View>

        <FlatList
          data={currentMonthExpenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <MonthlyBalance
                totalExpenses={totalExpenses}
                month={month}
                year={year}
                expenseCount={currentMonthExpenses.length}
                onMonthPress={handleMonthPress}
              />
              <QuickCategoryButtons onCategoryPress={handleCategoryPress} />
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                {getPersonalizedEmptyMessage().title}
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                {getPersonalizedEmptyMessage().subtitle}
              </ThemedText>
            </View>
          }
        />

        <QuickAmountModal
          visible={isAmountModalVisible}
          onClose={handleCloseAmountModal}
          onSave={handleAddExpense}
          selectedCategory={selectedCategory}
          availableUsers={users}
        />

        <AddExpenseModal
          visible={isAddModalVisible}
          onClose={handleCloseModal}
          onSave={handleUpdateExpense}
          expense={editingExpense}
          isEditing={!!editingExpense}
        />

        <MonthPickerModal
          visible={isMonthPickerVisible}
          onClose={() => setIsMonthPickerVisible(false)}
          currentMonth={parseInt(month) - 1}
          currentYear={year}
        />

        <OnboardingModal
          visible={!isOnboardingComplete}
          onComplete={handleOnboardingComplete}
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
});
