import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { apiService, Category, Expense } from '../services/api';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedBoard, boardMembers } = useBoard();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedBoard) {
      loadData();
    }
  }, [selectedBoard]);

  const loadData = async () => {
    if (!selectedBoard) return;

    setIsLoading(true);
    try {
      // Load expenses and categories in parallel
      const [expensesResult, categoriesResult] = await Promise.all([
        apiService.getBoardExpenses(selectedBoard.id),
        apiService.getBoardCategories(selectedBoard.id),
      ]);

      if (expensesResult.success && expensesResult.data) {
        setExpenses(expensesResult.data.expenses);
      }

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data.categories);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || '#9370DB';
  };

  const getMemberName = (userId: string) => {
    const member = boardMembers.find(m => m.user_id === userId);
    return member ? `${member.user.first_name} ${member.user.last_name}` : 'לא ידוע';
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const calculateMyExpenses = () => {
    return expenses.reduce((total, expense) => {
      if (expense.paid_by === user?.id) {
        return total + expense.amount;
      }
      return total;
    }, 0);
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseHeader}>
        <View style={styles.categoryContainer}>
          <View
            style={[
              styles.categoryIndicator,
              { backgroundColor: getCategoryColor(item.category) },
            ]}
          />
          <Text style={styles.categoryName}>{item.category}</Text>
        </View>
        <Text style={styles.expenseAmount}>₪{item.amount.toFixed(2)}</Text>
      </View>
      
      {item.description && (
        <Text style={styles.expenseDescription}>{item.description}</Text>
      )}
      
      <View style={styles.expenseFooter}>
        <Text style={styles.paidByText}>
          שולם על ידי: {getMemberName(item.paid_by)}
        </Text>
        <Text style={styles.expenseDate}>
          {new Date(item.date).toLocaleDateString('he-IL')}
        </Text>
      </View>
      
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>סה"כ הוצאות</Text>
        <Text style={styles.summaryValue}>₪{calculateTotalExpenses().toFixed(2)}</Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>ההוצאות שלי</Text>
        <Text style={styles.summaryValue}>₪{calculateMyExpenses().toFixed(2)}</Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>מספר חברים</Text>
        <Text style={styles.summaryValue}>{boardMembers.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSummary()}
      
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>הוצאות אחרונות</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddExpense' as never)}
        >
          <Text style={styles.addButtonText}>+ הוסף</Text>
        </TouchableOpacity>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>אין הוצאות עדיין</Text>
          <Text style={styles.emptyStateSubtitle}>
            הוסף הוצאה ראשונה כדי להתחיל
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.expenseList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  expenseList: {
    padding: 16,
  },
  expenseItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paidByText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  expenseDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});

export default HomeScreen; 