import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Expense } from './ExpenseCard';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface RecurringExpensesSectionProps {
  recurringExpenses: Expense[];
  onEditRecurring: (expense: Expense) => void;
  onDeleteRecurring: (expenseId: string) => void;
  onAddRecurring: () => void;
}

export function RecurringExpensesSection({
  recurringExpenses,
  onEditRecurring,
  onDeleteRecurring,
  onAddRecurring,
}: RecurringExpensesSectionProps) {
  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`;
  };

  const totalRecurring = recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText type="subtitle" style={styles.title}>
            הוצאות חודשיות קבועות
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            סה"כ: {formatCurrency(totalRecurring)}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={onAddRecurring} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {recurringExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="refresh-outline" size={48} color="#CCC" />
          <ThemedText style={styles.emptyText}>
            אין הוצאות חודשיות קבועות
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            הוסף הוצאות חודשיות קבועות כדי שיתווספו אוטומטית בכל חודש
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.expensesList} showsVerticalScrollIndicator={false}>
          {recurringExpenses.map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseInfo}>
                <View style={styles.expenseHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.expenseCategory}>
                    {expense.category}
                  </ThemedText>
                  <ThemedText type="title" style={styles.expenseAmount}>
                    {formatCurrency(expense.amount)}
                  </ThemedText>
                </View>
                
                {expense.description && (
                  <ThemedText style={styles.expenseDescription} numberOfLines={1}>
                    {expense.description}
                  </ThemedText>
                )}
                
                <ThemedText style={styles.expensePaidBy}>
                  שולם על ידי: {expense.paidBy}
                </ThemedText>
              </View>

              <View style={styles.expenseActions}>
                <TouchableOpacity
                  onPress={() => onEditRecurring(expense)}
                  style={styles.actionButton}
                >
                  <Ionicons name="pencil" size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDeleteRecurring(expense.id)}
                  style={[styles.actionButton, styles.deleteButton]}
                >
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  expensesList: {
    maxHeight: 300,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  expensePaidBy: {
    fontSize: 12,
    color: '#999',
  },
  expenseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
}); 