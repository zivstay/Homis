import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { apiService, Debt } from '../services/api';

const screenWidth = Dimensions.get('window').width;

interface ExpenseSummary {
  total_amount: number;
  total_expenses: number;
  expenses_by_category: { [category: string]: number };
  expenses_by_board: { [board_id: string]: number };
  monthly_trend: { [month: string]: number };
}

interface DebtWithBoard extends Debt {
  board_name: string;
}

interface DebtSummary {
  total_owed: number;
  total_owed_to_me: number;
  total_unpaid: number;
  total_paid: number;
}

interface PeriodFilter {
  label: string;
  startDate: string;
  endDate: string;
}

interface PieChartData {
  key: string;
  value: number;
  svg: { fill: string };
  arc: { cornerRadius: number };
  label: string;
  amount: number;
}

const SummaryScreen: React.FC = () => {
  const { user } = useAuth();
  const { boards } = useBoard();
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [debts, setDebts] = useState<DebtWithBoard[]>([]);
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter | null>(null);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'debts'>('expenses');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showCharts, setShowCharts] = useState(true);

  const periodFilters: PeriodFilter[] = [
    {
      label: 'החודש',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      label: 'השבוע',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      label: 'השנה',
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
      endDate: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    if (activeTab === 'expenses') {
      loadSummary();
    } else {
      loadDebts();
    }
  }, [selectedPeriod, selectedBoards, activeTab, paidFilter]);

  // Debug effect to check boards loading
  useEffect(() => {
    console.log('🔍 Debug - Boards changed:', boards);
    console.log('🔍 Debug - Summary changed:', summary);
  }, [boards, summary]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (selectedPeriod) {
        filters.start_date = selectedPeriod.startDate;
        filters.end_date = selectedPeriod.endDate;
      }
      if (selectedBoards.length > 0) {
        filters.board_ids = selectedBoards;
      }

      console.log('🔍 Debug - Loading summary with filters:', filters);
      const result = await apiService.getExpensesSummary(filters);
      console.log('🔍 Debug - Summary result:', result);
      
      if (result.success && result.data) {
        console.log('🔍 Debug - Setting summary data:', result.data);
        setSummary(result.data);
      } else {
        console.error('Failed to load summary:', result.error);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDebts = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (selectedPeriod) {
        filters.start_date = selectedPeriod.startDate;
        filters.end_date = selectedPeriod.endDate;
      }
      if (selectedBoards.length > 0) {
        filters.board_ids = selectedBoards;
      }
      if (paidFilter !== 'all') {
        filters.is_paid = paidFilter === 'paid';
      }

      const result = await apiService.getAllDebts(filters);
      if (result.success && result.data) {
        setDebts(result.data.debts as DebtWithBoard[]);
        setDebtSummary(result.data.summary);
      } else {
        console.error('Failed to load debts:', result.error);
      }
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodSelect = (period: PeriodFilter) => {
    setSelectedPeriod(selectedPeriod?.label === period.label ? null : period);
  };

  const handleBoardToggle = (boardId: string) => {
    setSelectedBoards(prev => 
      prev.includes(boardId) 
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  const handleMarkAsPaid = async (debtId: string, boardId: string) => {
    try {
      const result = await apiService.markDebtAsPaid(boardId, debtId);
      if (result.success) {
        await loadDebts();
        Alert.alert('הצלחה', 'החוב סומן כשולם');
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בסימון החוב');
      }
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      Alert.alert('שגיאה', 'שגיאה בסימון החוב');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const getMemberName = (userId: string) => {
    return userId === user?.id ? 'אני' : 'חבר';
  };

  // Generate pie chart data for expenses by board
  const generatePieChartData = (): PieChartData[] => {
    if (!summary || !summary.expenses_by_board) return [];
    
    console.log('🔍 Debug - Summary data:', summary);
    console.log('🔍 Debug - Boards:', boards);
    console.log('🔍 Debug - Expenses by board:', summary.expenses_by_board);
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    return Object.entries(summary.expenses_by_board).map(([boardId, amount], index) => {
      console.log('🔍 Debug - Looking for board with ID:', boardId);
      const board = boards.find(b => b.id === boardId);
      console.log('🔍 Debug - Found board:', board);
      
      return {
        key: boardId,
        value: amount,
        svg: { fill: colors[index % colors.length] },
        arc: { cornerRadius: 5 },
        label: board?.name || `לוח ${boardId}`,
        amount: amount,
      };
    });
  };

  // Generate pie chart data for expenses by category
  const generateCategoryPieChartData = (): PieChartData[] => {
    if (!summary || !summary.expenses_by_category) return [];
    
    console.log('🔍 Debug - Category data:', summary.expenses_by_category);
    
    const colors = [
      '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
      '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#8E44AD'
    ];
    
    return Object.entries(summary.expenses_by_category).map(([category, amount], index) => {
      console.log('🔍 Debug - Category:', category, 'Amount:', amount);
      return {
        key: category,
        value: amount,
        svg: { fill: colors[index % colors.length] },
        arc: { cornerRadius: 5 },
        label: category,
        amount: amount,
      };
    });
  };

  const renderPieChart = (data: PieChartData[], title: string, colors: string[]) => {
    if (data.length === 0) return null;
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.chartWrapper}>
          {/* Simple visual representation with circles */}
          <View style={styles.circlesContainer}>
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const circleSize = Math.max(30, Math.min(80, percentage * 1.5));
              
              return (
                <View key={item.key} style={styles.circleItem}>
                  <View 
                    style={[
                      styles.dataCircle,
                      {
                        backgroundColor: item.svg.fill,
                        width: circleSize,
                        height: circleSize,
                      }
                    ]}
                  />
                  <Text style={styles.circlePercentage}>{percentage.toFixed(1)}%</Text>
                </View>
              );
            })}
          </View>
          
          <View style={styles.chartCenter}>
            <Text style={styles.chartCenterTotal}>{formatCurrency(total)}</Text>
            <Text style={styles.chartCenterLabel}>סה"כ</Text>
          </View>
        </View>
        
        {/* Legend */}
        <View style={styles.legendContainer}>
          {data.map((item, index) => (
            <View key={item.key} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.svg.fill }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendAmount}>{formatCurrency(item.amount)}</Text>
                <Text style={styles.legendPercentage}>
                  ({((item.amount / total) * 100).toFixed(1)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPeriodFilter = ({ item }: { item: PeriodFilter }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedPeriod?.label === item.label && styles.selectedFilterButton,
      ]}
      onPress={() => handlePeriodSelect(item)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedPeriod?.label === item.label && styles.selectedFilterButtonText,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderBoardFilter = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.boardFilterButton,
        selectedBoards.includes(item.id) && styles.selectedBoardFilterButton,
      ]}
      onPress={() => handleBoardToggle(item.id)}
    >
      <Text
        style={[
          styles.boardFilterText,
          selectedBoards.includes(item.id) && styles.selectedBoardFilterText,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPaidFilter = ({ item }: { item: { label: string; value: 'all' | 'paid' | 'unpaid' } }) => (
    <TouchableOpacity
      style={[
        styles.paidFilterButton,
        paidFilter === item.value && styles.selectedPaidFilterButton,
      ]}
      onPress={() => setPaidFilter(item.value)}
    >
      <Text
        style={[
          styles.paidFilterText,
          paidFilter === item.value && styles.selectedPaidFilterText,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderDebtItem = ({ item }: { item: DebtWithBoard }) => (
    <View style={[styles.debtItem, item.is_paid && styles.paidDebtItem]}>
      <View style={styles.debtHeader}>
        <Text style={styles.debtBoard}>{item.board_name}</Text>
        <Text style={[styles.debtStatus, item.is_paid && styles.paidStatus]}>
          {item.is_paid ? 'שולם' : 'לא שולם'}
        </Text>
      </View>
      
      <Text style={styles.debtDescription}>{item.description}</Text>
      
      <View style={styles.debtDetails}>
        <Text style={styles.debtAmount}>{formatCurrency(item.amount)}</Text>
        <Text style={styles.debtDate}>{formatDate(item.created_at)}</Text>
      </View>
      
      <View style={styles.debtDirection}>
        <Text style={styles.debtDirectionText}>
          {item.from_user_id === user?.id ? 'אני חייב ל' : 'אני חייב ל'}
          {getMemberName(item.to_user_id)}
        </Text>
      </View>
      
      {!item.is_paid && item.from_user_id === user?.id && (
        <TouchableOpacity
          style={styles.markPaidButton}
          onPress={() => handleMarkAsPaid(item.id, item.board_id)}
        >
          <Text style={styles.markPaidButtonText}>סמן כשולם</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>סיכום</Text>
        <Text style={styles.subtitle}>
          {selectedPeriod ? selectedPeriod.label : 'כל התקופות'}
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expenses' && styles.activeTabButton]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'expenses' && styles.activeTabButtonText]}>
            הוצאות
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'debts' && styles.activeTabButton]}
          onPress={() => setActiveTab('debts')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'debts' && styles.activeTabButtonText]}>
            חובות
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Toggle - Only for expenses tab */}
      {activeTab === 'expenses' && (
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[styles.viewToggleButton, showCharts && styles.activeViewToggleButton]}
            onPress={() => setShowCharts(true)}
          >
            <Text style={[styles.viewToggleText, showCharts && styles.activeViewToggleText]}>
              📊 תרשימים
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, !showCharts && styles.activeViewToggleButton]}
            onPress={() => setShowCharts(false)}
          >
            <Text style={[styles.viewToggleText, !showCharts && styles.activeViewToggleText]}>
              📋 רשימה
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Period Filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סינון לפי תקופה</Text>
        <FlatList
          data={periodFilters}
          renderItem={renderPeriodFilter}
          keyExtractor={(item) => item.label}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
        />
      </View>

      {/* Board Filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סינון לפי לוח</Text>
        <FlatList
          data={boards}
          renderItem={renderBoardFilter}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
        />
      </View>

      {/* Paid Status Filters - Only for debts tab */}
      {activeTab === 'debts' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס תשלום</Text>
          <FlatList
            data={[
              { label: 'הכל', value: 'all' as const },
              { label: 'שולם', value: 'paid' as const },
              { label: 'לא שולם', value: 'unpaid' as const },
            ]}
            renderItem={renderPaidFilter}
            keyExtractor={(item) => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterList}
          />
        </View>
      )}

      {/* Expenses Tab Content */}
      {activeTab === 'expenses' && (
        <>
          {/* Debug Info */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>Debug Info:</Text>
            <Text style={styles.debugText}>Boards loaded: {boards.length}</Text>
            <Text style={styles.debugText}>Summary loaded: {summary ? 'Yes' : 'No'}</Text>
            {summary && (
              <>
                <Text style={styles.debugText}>Total amount: {summary.total_amount}</Text>
                <Text style={styles.debugText}>Categories: {Object.keys(summary.expenses_by_category).length}</Text>
                <Text style={styles.debugText}>Boards: {Object.keys(summary.expenses_by_board).length}</Text>
              </>
            )}
          </View>

          {summary && (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>סה"כ הוצאות</Text>
                  <Text style={styles.summaryCardAmount}>
                    {formatCurrency(summary.total_amount)}
                  </Text>
                  <Text style={styles.summaryCardSubtitle}>
                    {summary.total_expenses} הוצאות
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>ממוצע להוצאה</Text>
                  <Text style={styles.summaryCardAmount}>
                    {summary.total_expenses > 0 
                      ? formatCurrency(summary.total_amount / summary.total_expenses)
                      : formatCurrency(0)
                    }
                  </Text>
                  <Text style={styles.summaryCardSubtitle}>לכל הוצאה</Text>
                </View>
              </View>

              {/* Categories Breakdown */}
              {Object.keys(summary.expenses_by_category).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>הוצאות לפי קטגוריה</Text>
                  {showCharts ? (
                    renderPieChart(generateCategoryPieChartData(), 'הוצאות לפי קטגוריה', ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#8E44AD'])
                  ) : (
                    <View style={styles.listContainer}>
                      {Object.entries(summary.expenses_by_category)
                        .sort(([,a], [,b]) => b - a)
                        .map(([category, amount], index) => (
                          <View key={index} style={styles.categoryItem}>
                            <Text style={styles.categoryName}>{category}</Text>
                            <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              )}

              {/* Boards Breakdown */}
              {Object.keys(summary.expenses_by_board).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>הוצאות לפי לוח</Text>
                  {showCharts ? (
                    renderPieChart(generatePieChartData(), 'הוצאות לפי לוח', ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'])
                  ) : (
                    <View style={styles.listContainer}>
                      {Object.entries(summary.expenses_by_board)
                        .sort(([,a], [,b]) => b - a)
                        .map(([boardId, amount], index) => {
                          const board = boards.find(b => b.id === boardId);
                          return (
                            <View key={index} style={styles.boardItem}>
                              <Text style={styles.boardName}>{board?.name || `לוח ${boardId}`}</Text>
                              <Text style={styles.boardAmount}>{formatCurrency(amount)}</Text>
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              )}

              {/* Monthly Trend */}
              {Object.keys(summary.monthly_trend).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>מגמה חודשית</Text>
                  <View style={styles.listContainer}>
                    {Object.entries(summary.monthly_trend)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([month, amount], index) => (
                        <View key={index} style={styles.monthlyItem}>
                          <Text style={styles.monthlyLabel}>{month}</Text>
                          <Text style={styles.monthlyAmount}>{formatCurrency(amount)}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* Debts Tab Content */}
      {activeTab === 'debts' && (
        <>
          {/* Debt Summary Cards */}
          {debtSummary && (
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>אני חייב</Text>
                <Text style={styles.summaryCardAmount}>
                  {formatCurrency(debtSummary.total_owed)}
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>חייבים לי</Text>
                <Text style={styles.summaryCardAmount}>
                  {formatCurrency(debtSummary.total_owed_to_me)}
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>לא שולם</Text>
                <Text style={styles.summaryCardAmount}>
                  {formatCurrency(debtSummary.total_unpaid)}
                </Text>
              </View>
            </View>
          )}

          {/* Debts List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>רשימת חובות</Text>
            {debts.length > 0 ? (
              <View style={styles.debtsList}>
                {debts.map((debt, index) => (
                  <View key={debt.id} style={styles.debtItemContainer}>
                    {renderDebtItem({ item: debt })}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>אין חובות להצגה</Text>
              </View>
            )}
          </View>
        </>
      )}

      {!summary && !debtSummary && !isLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>אין נתונים להצגה</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  filterList: {
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedFilterButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterButtonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFilterButtonText: {
    color: 'white',
  },
  boardFilterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedBoardFilterButton: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  boardFilterText: {
    color: '#2c3e50',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedBoardFilterText: {
    color: 'white',
  },
  summaryCards: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  summaryCardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  summaryCardSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
  },
  listContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryName: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  boardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  boardName: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  boardAmount: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: 'bold',
  },
  monthlyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  monthlyLabel: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  monthlyAmount: {
    fontSize: 16,
    color: '#e67e22',
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  tabButtonText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabButtonText: {
    color: 'white',
  },
  debtsList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  debtItemContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  debtItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  paidDebtItem: {
    borderLeftColor: '#27ae60',
    opacity: 0.7,
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debtBoard: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
  },
  debtStatus: {
    fontSize: 12,
    color: '#e74c3c',
    backgroundColor: '#fdf2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidStatus: {
    color: '#27ae60',
    backgroundColor: '#f0f9f0',
  },
  debtDescription: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
  },
  debtDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  debtDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  debtDirection: {
    marginBottom: 8,
  },
  debtDirectionText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  markPaidButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  markPaidButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  paidFilterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPaidFilterButton: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  paidFilterText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedPaidFilterText: {
    color: 'white',
  },
  chartContainer: {
    backgroundColor: 'white',
    padding: 16,
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
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chartCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  chartCenterLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  legendContainer: {
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 2,
  },
  legendAmount: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  legendPercentage: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
  },
  viewToggleButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  activeViewToggleButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  viewToggleText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeViewToggleText: {
    color: 'white',
  },
  debugContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debugText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  circleItem: {
    marginHorizontal: 4,
  },
  dataCircle: {
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  circlePercentage: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default SummaryScreen; 