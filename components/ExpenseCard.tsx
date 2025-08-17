import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useBoard } from '../contexts/BoardContext';
import { formatCurrency } from '../utils/currencyUtils';
import { ExpenseImage } from './ExpenseImage';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  has_image?: boolean;
  paidBy: string;
  date: Date;
  isRecurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  startDate?: Date;
}

interface ExpenseCardProps {
  expense: Expense;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ExpenseCard({ expense, onPress, onEdit, onDelete }: ExpenseCardProps) {
  const { selectedBoard } = useBoard();
  
  const formatCurrencyLocal = (amount: number) => {
    return formatCurrency(amount, selectedBoard?.currency || 'ILS');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getFrequencyText = (frequency?: string) => {
    switch (frequency) {
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

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedView style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.header}>
            <View style={styles.categoryContainer}>
              <ThemedText type="defaultSemiBold" style={styles.category}>
                {expense.category}
              </ThemedText>
              {expense.isRecurring && (
                <View style={styles.recurringBadge}>
                  <Ionicons name="refresh" size={12} color="#007AFF" />
                  <ThemedText style={styles.recurringText}>
                    {getFrequencyText(expense.frequency)}
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="title" style={styles.amount}>
              {formatCurrencyLocal(expense.amount)}
            </ThemedText>
          </View>

          {expense.description && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {expense.description}
            </ThemedText>
          )}

          <View style={styles.footer}>
            <ThemedText style={styles.paidBy}>
              שולם על ידי: {expense.paidBy}
            </ThemedText>
            <ThemedText style={styles.date}>
              {formatDate(expense.date)}
            </ThemedText>
          </View>

          {/* Recurring expense indicator */}
          {expense.isRecurring && (
            <View style={styles.recurringIndicator}>
              <Ionicons name="refresh-circle" size={16} color="#007AFF" />
              <ThemedText style={styles.recurringIndicatorText}>
                הוצאה קבועה
              </ThemedText>
            </View>
          )}
        </View>

        {expense.has_image && (
          <View style={styles.imageContainer}>
            <ExpenseImage expenseId={expense.id} style={styles.image} />
          </View>
        )}

        {(onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
                <Ionicons name="pencil" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    fontSize: 18,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recurringText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidBy: {
    fontSize: 12,
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  imageContainer: {
    marginLeft: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  recurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recurringIndicatorText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
}); 