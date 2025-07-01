import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddDebtModal } from '@/components/AddDebtModal';
import { Debt, DebtCard } from '@/components/DebtCard';
import { DebtSummary } from '@/components/DebtSummary';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useDebts } from '@/contexts/ExpenseContext';

export default function DebtsScreen() {
  const {
    debts,
    users,
    addDebt,
    updateDebt,
    deleteDebt,
    markDebtAsPaid,
    getDebtsForUser,
    getTotalOwedToMe,
    getTotalIOwe,
    getNetBalance,
  } = useDebts();

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>();
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const currentUser = 'אני'; // In a real app, this would come from user authentication
  const myDebts = getDebtsForUser(currentUser);
  const totalOwedToMe = getTotalOwedToMe(currentUser);
  const totalIOwe = getTotalIOwe(currentUser);
  const netBalance = getNetBalance(currentUser);
  const unpaidDebtsCount = myDebts.filter(debt => !debt.isPaid).length;

  // Filter debts based on current filter
  const filteredDebts = myDebts.filter(debt => {
    if (filter === 'unpaid') return !debt.isPaid;
    if (filter === 'paid') return debt.isPaid;
    return true; // 'all'
  });

  const handleAddDebt = (debtData: Omit<Debt, 'id' | 'date'>) => {
    addDebt(debtData);
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setIsAddModalVisible(true);
  };

  const handleUpdateDebt = (debtData: Omit<Debt, 'id' | 'date'>) => {
    if (editingDebt) {
      updateDebt(editingDebt.id, debtData);
      setEditingDebt(undefined);
    }
  };

  const handleDeleteDebt = (debtId: string) => {
    Alert.alert(
      'מחיקת חוב',
      'האם אתה בטוח שברצונך למחוק חוב זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteDebt(debtId),
        },
      ]
    );
  };

  const handleMarkAsPaid = (debtId: string) => {
    Alert.alert(
      'סימון כשולם',
      'האם אתה בטוח שברצונך לסמן חוב זה כשולם?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'סמן כשולם',
          style: 'default',
          onPress: () => markDebtAsPaid(debtId),
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setIsAddModalVisible(false);
    setEditingDebt(undefined);
  };

  const renderDebtItem = ({ item }: { item: Debt }) => (
    <DebtCard
      debt={item}
      currentUser={currentUser}
      onMarkAsPaid={() => handleMarkAsPaid(item.id)}
      onDelete={() => handleDeleteDebt(item.id)}
    />
  );

  const renderFilterButton = (
    filterType: 'all' | 'unpaid' | 'paid',
    label: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
      onPress={() => setFilter(filterType)}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={filter === filterType ? '#FFFFFF' : '#666'}
      />
      <ThemedText
        style={[styles.filterButtonText, filter === filterType && styles.filterButtonTextActive]}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            מעקב חובות
          </ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredDebts}
          renderItem={renderDebtItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <DebtSummary
                totalOwedToMe={totalOwedToMe}
                totalIOwe={totalIOwe}
                netBalance={netBalance}
                unpaidDebtsCount={unpaidDebtsCount}
              />
              
              {/* Filter Buttons */}
              <View style={styles.filterContainer}>
                {renderFilterButton('all', 'הכל', 'list')}
                {renderFilterButton('unpaid', 'לא שולמו', 'alert-circle')}
                {renderFilterButton('paid', 'שולמו', 'checkmark-circle')}
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={64} color="#CCC" />
              <ThemedText style={styles.emptyText}>
                {filter === 'all' 
                  ? 'אין חובות להצגה'
                  : filter === 'unpaid'
                    ? 'אין חובות לא שולמו'
                    : 'אין חובות שולמו'
                }
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                {filter === 'all' 
                  ? 'הוסף חוב ראשון כדי להתחיל לעקוב אחר החובות שלך'
                  : 'כל החובות כבר שולמו'
                }
              </ThemedText>
            </View>
          }
        />

        <AddDebtModal
          visible={isAddModalVisible}
          onClose={handleCloseModal}
          onSave={editingDebt ? handleUpdateDebt : handleAddDebt}
          debt={editingDebt}
          isEditing={!!editingDebt}
          availableUsers={users}
          currentUser={currentUser}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
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
}); 