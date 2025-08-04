import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface DebtSummaryProps {
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  unpaidDebtsCount: number;
}

export function DebtSummary({
  totalOwedToMe,
  totalIOwe,
  netBalance,
  unpaidDebtsCount,
}: DebtSummaryProps) {
  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`;
  };

  const getNetBalanceColor = () => {
    if (netBalance > 0) return '#4CAF50'; // Green - positive balance
    if (netBalance < 0) return '#FF5722'; // Red - negative balance
    return '#666'; // Gray - zero balance
  };

  const getNetBalanceIcon = () => {
    if (netBalance > 0) return 'arrow-up-circle';
    if (netBalance < 0) return 'arrow-down-circle';
    return 'remove-circle';
  };

  const getBalanceDescription = (balance: number) => {
    if (balance > 0) return 'צריכים להחזיר לי';
    if (balance < 0) return 'אני צריך להחזיר';
    return 'מאוזן';
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          סיכום חובות
        </ThemedText>
        <View style={styles.balanceContainer}>
          <Ionicons
            name={getNetBalanceIcon() as any}
            size={24}
            color={getNetBalanceColor()}
          />
          <ThemedText
            type="title"
            style={[styles.netBalance, { color: getNetBalanceColor() }]}
          >
            {formatCurrency(Math.abs(netBalance))}
          </ThemedText>
        </View>
        <ThemedText style={[styles.balanceText, { color: getNetBalanceColor() }]}>
          {getBalanceDescription(netBalance)}
        </ThemedText>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Ionicons name="arrow-down-circle" size={20} color="#4CAF50" />
            <ThemedText style={styles.statLabel}>מגיע לי</ThemedText>
          </View>
          <ThemedText type="title" style={[styles.statAmount, { color: '#4CAF50' }]}>
            {formatCurrency(totalOwedToMe)}
          </ThemedText>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Ionicons name="arrow-up-circle" size={20} color="#FF5722" />
            <ThemedText style={styles.statLabel}>אני חייב</ThemedText>
          </View>
          <ThemedText type="title" style={[styles.statAmount, { color: '#FF5722' }]}>
            {formatCurrency(totalIOwe)}
          </ThemedText>
        </View>
      </View>

      {unpaidDebtsCount > 0 && (
        <View style={styles.unpaidContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF9800" />
          <ThemedText style={styles.unpaidText}>
            {unpaidDebtsCount} חובות לא שולמו
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  netBalance: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E1E5E9',
  },
  unpaidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
  },
  unpaidText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
}); 