import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface Debt {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: Date;
  isPaid: boolean;
  expenseId?: string; // Reference to the original expense
}

interface DebtCardProps {
  debt: Debt;
  onMarkAsPaid?: () => void;
  onDelete?: () => void;
  currentUser: string;
}

export function DebtCard({ debt, onMarkAsPaid, onDelete, currentUser }: DebtCardProps) {
  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isOwedToMe = debt.toUser === currentUser;
  const isOwedByMe = debt.fromUser === currentUser;

  const getDebtType = () => {
    if (isOwedToMe) return 'מגיע לי';
    if (isOwedByMe) return 'אני חייב';
    return 'חוב אחר';
  };

  const getDebtTypeColor = () => {
    if (isOwedToMe) return '#4CAF50'; // Green - money owed to me
    if (isOwedByMe) return '#FF5722'; // Red - I owe money
    return '#FF9800'; // Orange - other debts
  };

  const getDebtTypeIcon = () => {
    if (isOwedToMe) return 'arrow-down-circle';
    if (isOwedByMe) return 'arrow-up-circle';
    return 'remove-circle';
  };

  return (
    <TouchableOpacity activeOpacity={0.7}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.debtInfo}>
            <View style={styles.debtTypeContainer}>
              <Ionicons 
                name={getDebtTypeIcon() as any} 
                size={20} 
                color={getDebtTypeColor()} 
              />
              <ThemedText style={[styles.debtType, { color: getDebtTypeColor() }]}>
                {getDebtType()}
              </ThemedText>
            </View>
            <ThemedText type="title" style={[styles.amount, { color: getDebtTypeColor() }]}>
              {formatCurrency(debt.amount)}
            </ThemedText>
          </View>
          {debt.isPaid && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <ThemedText style={styles.paidText}>שולם</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.debtDetails}>
          <ThemedText style={styles.debtDescription}>
            {isOwedToMe 
              ? `${debt.fromUser} חייב לי`
              : isOwedByMe 
                ? `אני חייב ל${debt.toUser}`
                : `${debt.fromUser} חייב ל${debt.toUser}`
            }
          </ThemedText>
          
          {debt.description && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {debt.description}
            </ThemedText>
          )}
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.date}>
            {formatDate(debt.date)}
          </ThemedText>
          
          {!debt.isPaid && (onMarkAsPaid || onDelete) && (
            <View style={styles.actions}>
              {onMarkAsPaid && (
                <TouchableOpacity onPress={onMarkAsPaid} style={styles.actionButton}>
                  <Ionicons name="checkmark" size={18} color="#4CAF50" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  debtInfo: {
    flex: 1,
  },
  debtTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  debtType: {
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paidText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  debtDetails: {
    marginBottom: 12,
  },
  debtDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
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
}); 