import { useExpenses } from '@/contexts/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface MonthlyBalanceProps {
  totalExpenses: number;
  month: string;
  year: number;
  expenseCount: number;
  onMonthPress?: () => void;
}

export function MonthlyBalance({ 
  totalExpenses, 
  month, 
  year, 
  expenseCount, 
  onMonthPress 
}: MonthlyBalanceProps) {
  const { onboardingConfig } = useExpenses();

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`;
  };

  const getMonthName = (month: string) => {
    const months: { [key: string]: string } = {
      '01': 'ינואר',
      '02': 'פברואר',
      '03': 'מרץ',
      '04': 'אפריל',
      '05': 'מאי',
      '06': 'יוני',
      '07': 'יולי',
      '08': 'אוגוסט',
      '09': 'ספטמבר',
      '10': 'אוקטובר',
      '11': 'נובמבר',
      '12': 'דצמבר',
    };
    return months[month] || month;
  };

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

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={onMonthPress}
        activeOpacity={0.7}
      >
        <View style={styles.monthInfo}>
          <ThemedText type="subtitle" style={styles.monthText}>
            {getMonthName(month)} {year}
          </ThemedText>
          <ThemedText style={styles.expenseCount}>
            {expenseCount} הוצאות
          </ThemedText>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={24} color="#007AFF" />
        </View>
      </TouchableOpacity>

      <View style={styles.balanceContainer}>
        <View style={styles.balanceHeader}>
          <ThemedText style={styles.balanceLabel}>סה"כ הוצאות חודשיות</ThemedText>
          <Ionicons name="trending-up" size={20} color="#FF3B30" />
        </View>
        <ThemedText type="title" style={styles.balanceAmount}>
          {formatCurrency(totalExpenses)}
        </ThemedText>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {expenseCount}
          </ThemedText>
          <ThemedText style={styles.statLabel}>הוצאות</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {expenseCount > 0 ? formatCurrency(totalExpenses / expenseCount) : '₪0'}
          </ThemedText>
          <ThemedText style={styles.statLabel}>ממוצע להוצאה</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {formatCurrency(totalExpenses / 30)}
          </ThemedText>
          <ThemedText style={styles.statLabel}>ליום</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthInfo: {
    flex: 1,
  },
  monthText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expenseCount: {
    fontSize: 14,
    color: '#666',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E1E5E9',
  },
}); 