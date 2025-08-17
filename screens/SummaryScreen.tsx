import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import BarChart from '../components/BarChart';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { useTutorial } from '../contexts/TutorialContext';
import { apiService, Debt } from '../services/api';
import { formatCurrency } from '../utils/currencyUtils';

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
  from_user_name?: string;
  to_user_name?: string;
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

interface BarChartData {
  key: string;
  value: number;
  color: string;
  label: string;
}

const SummaryScreen: React.FC = () => {
  const { user } = useAuth();
  const { boards, selectedBoard } = useBoard();
  const { setCurrentScreen, checkScreenTutorial, startTutorial } = useTutorial();
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [debts, setDebts] = useState<DebtWithBoard[]>([]);
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isDebtsLoading, setIsDebtsLoading] = useState(false);
  const summaryTimeoutRef = useRef<any>(null);
  const debtsTimeoutRef = useRef<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter | null>(null);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'expenses' | 'debts'>('expenses');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showCharts, setShowCharts] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [boardScrollRef, setBoardScrollRef] = useState<any>(null);
  const [customPeriod, setCustomPeriod] = useState<{ startDate: string; endDate: string } | null>(null);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateValue, setStartDateValue] = useState(new Date());
  const [endDateValue, setEndDateValue] = useState(new Date());

  // Function to get current period filters with fresh dates
  const getCurrentPeriodFilters = (): PeriodFilter[] => [
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
    {
      label: 'טווח מותאם',
      startDate: '',
      endDate: '',
    },
  ];

  const periodFilters: PeriodFilter[] = useMemo(() => getCurrentPeriodFilters(), []);

  // Set default filters when component mounts or when selectedBoard changes
  useEffect(() => {
    if (!isInitialized && selectedBoard) {
      console.log('🔧 SummaryScreen: Initializing with default filters');
      setSelectedPeriod(periodFilters[0]); // Set default to "החודש" (current month)
      setSelectedBoards([selectedBoard.id]); // Set default to current selected board
      setIsInitialized(true);
    }
  }, [selectedBoard, isInitialized]); // Removed periodFilters from dependencies since it's memoized and won't change

  // Force load data when component first initializes
  useEffect(() => {
    if (isInitialized && selectedPeriod && selectedBoards.length > 0) {
      console.log('🔧 SummaryScreen: Component initialized, loading initial data');
      if (activeTab === 'expenses') {
        loadSummary();
      } else if (activeTab === 'debts') {
        loadDebts();
      }
    }
  }, [isInitialized]); // Only run when isInitialized changes from false to true

  // Only update board filter when switching to a completely different board (not just deselecting)
  useEffect(() => {
    if (isInitialized && selectedBoard) {
      // Only auto-select if no boards are currently selected AND we just switched boards
      if (selectedBoards.length === 0) {
        setSelectedBoards([selectedBoard.id]);
      }
    }
  }, [selectedBoard, isInitialized]); // Removed selectedBoards from dependencies to prevent interference

  // Check scrollability when boards data changes
  useEffect(() => {
    if (boards && boards.length > 0) {
      // If we have more than 3 boards, likely needs scrolling
      if (boards.length > 3) {
        setCanScrollLeft(false);
        setCanScrollRight(true);
      } else {
        setCanScrollLeft(false);
        setCanScrollRight(false);
      }
    }
  }, [boards]);

  // Load expenses when on expenses tab and filters change
  useEffect(() => {
    if (activeTab === 'expenses' && selectedPeriod && isInitialized) {
      console.log('🔄 SummaryScreen: Loading summary due to filter change');
      loadSummary();
    }
  }, [selectedPeriod, selectedBoards, customPeriod, isInitialized, activeTab]);

  const loadSummary = async () => {
    // Don't try to load if no period is selected
    if (!selectedPeriod) {
      console.log('🟡 SummaryScreen: No period selected, skipping summary load');
      return;
    }

    // Prevent concurrent calls
    if (isSummaryLoading) {
      console.log('🟡 SummaryScreen: Summary already loading, skipping duplicate call');
      return;
    }

    // Cancel any pending timeout
    if (summaryTimeoutRef.current) {
      clearTimeout(summaryTimeoutRef.current);
    }

    // Debounce the call to prevent rapid successive calls
    summaryTimeoutRef.current = setTimeout(async () => {
      setIsSummaryLoading(true);
      setIsLoading(true);
      try {
        const filters: any = {};
        
        // Use custom period if available, otherwise use selected period
        if (customPeriod && selectedPeriod?.label === 'טווח מותאם') {
          filters.start_date = customPeriod.startDate;
          filters.end_date = customPeriod.endDate;
        } else if (selectedPeriod && selectedPeriod.label !== 'טווח מותאם') {
          // Get fresh dates for current period filters
          const currentFilters = getCurrentPeriodFilters();
          const currentPeriod = currentFilters.find(p => p.label === selectedPeriod.label);
          
          if (currentPeriod) {
            filters.start_date = currentPeriod.startDate;
            filters.end_date = currentPeriod.endDate;
            console.log('📅 SummaryScreen: Using fresh dates:', { 
              start: currentPeriod.startDate, 
              end: currentPeriod.endDate,
              label: selectedPeriod.label 
            });
          } else {
            // Fallback to stored dates
            filters.start_date = selectedPeriod.startDate;
            filters.end_date = selectedPeriod.endDate;
          }
        }
        
        if (selectedBoards.length > 0) {
          filters.board_ids = selectedBoards;
        }

        console.log('🔵 SummaryScreen: Loading summary with filters:', filters);
        const result = await apiService.getExpensesSummary(filters);
        
        if (result.success && result.data) {
          console.log('📈 SummaryScreen: New summary data received:', result.data);
          setSummary(result.data);
          console.log('✅ SummaryScreen: Summary state updated successfully');
        } else {
          console.error('Failed to load summary:', result.error);
        }
      } catch (error) {
        console.error('Error loading summary:', error);
      } finally {
        setIsSummaryLoading(false);
        setIsLoading(false);
      }
    }, 200); // 200ms debounce
  };

  const loadDebts = async () => {
    // Don't try to load if no period is selected
    if (!selectedPeriod) {
      console.log('🟡 SummaryScreen: No period selected, skipping debts load');
      return;
    }

    // Prevent concurrent calls
    if (isDebtsLoading) {
      console.log('🟡 SummaryScreen: Debts already loading, skipping duplicate call');
      return;
    }

    // Cancel any pending timeout
    if (debtsTimeoutRef.current) {
      clearTimeout(debtsTimeoutRef.current);
    }

    // Debounce the call to prevent rapid successive calls
    debtsTimeoutRef.current = setTimeout(async () => {
      setIsDebtsLoading(true);
      setIsLoading(true);
      try {
        const filters: any = {};
        
        // Use custom period if available, otherwise use selected period
        if (customPeriod && selectedPeriod?.label === 'טווח מותאם') {
          filters.start_date = customPeriod.startDate;
          filters.end_date = customPeriod.endDate;
        } else if (selectedPeriod && selectedPeriod.label !== 'טווח מותאם') {
          // Get fresh dates for current period filters
          const currentFilters = getCurrentPeriodFilters();
          const currentPeriod = currentFilters.find(p => p.label === selectedPeriod.label);
          
          if (currentPeriod) {
            filters.start_date = currentPeriod.startDate;
            filters.end_date = currentPeriod.endDate;
            console.log('📅 SummaryScreen: Using fresh dates for debts:', { 
              start: currentPeriod.startDate, 
              end: currentPeriod.endDate,
              label: selectedPeriod.label 
            });
          } else {
            // Fallback to stored dates
            filters.start_date = selectedPeriod.startDate;
            filters.end_date = selectedPeriod.endDate;
          }
        }
        
        if (selectedBoards.length > 0) {
          filters.board_ids = selectedBoards;
        }
        if (paidFilter !== 'all') {
          filters.is_paid = paidFilter === 'paid';
        }

        console.log('🔵 SummaryScreen: Loading debts with filters:', filters);
        const result = await apiService.getAllDebts(filters);
        if (result.success && result.data) {
          setDebts(result.data.debts as DebtWithBoard[]);
          setDebtSummary(result.data.summary);
          console.log('✅ SummaryScreen: Debts loaded successfully');
        } else {
          console.error('Failed to load debts:', result.error);
        }
      } catch (error) {
        console.error('Error loading debts:', error);
      } finally {
        setIsDebtsLoading(false);
        setIsLoading(false);
      }
    }, 200); // 200ms debounce
  };

  // Handle tab switching - load data when switching tabs
  const handleTabSwitch = (tab: 'expenses' | 'debts') => {
    console.log('🔄 SummaryScreen: Tab switched to:', tab);
    setActiveTab(tab);
    if (selectedPeriod && isInitialized) {
      if (tab === 'expenses') {
        console.log('🔄 SummaryScreen: Loading expenses for new tab');
        loadSummary();
      } else if (tab === 'debts') {
        console.log('🔄 SummaryScreen: Loading debts for new tab');
        loadDebts();
      }
    }
  };

  // Reload debts when filters change AND we're on debts tab
  useEffect(() => {
    if (activeTab === 'debts' && selectedPeriod && isInitialized) {
      console.log('🔄 SummaryScreen: Loading debts due to filter change');
      loadDebts();
    }
  }, [paidFilter, selectedPeriod, selectedBoards, customPeriod, activeTab, isInitialized]);

  // Refresh data when screen comes into focus (returning from other screens)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 SummaryScreen: Screen focused, refreshing data');
      if (isInitialized && selectedPeriod) {
        if (activeTab === 'expenses') {
          console.log('🔄 SummaryScreen: Refreshing expenses data on focus');
          loadSummary();
        } else if (activeTab === 'debts') {
          console.log('🔄 SummaryScreen: Refreshing debts data on focus');
          loadDebts();
        }
      }
    }, [activeTab, isInitialized]) // Removed selectedPeriod from dependencies to prevent infinite loop
  );

  // Note: Removed auto-refresh interval to prevent infinite loops
  // Dates are now updated only when loading data, which is safer

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (summaryTimeoutRef.current) {
        clearTimeout(summaryTimeoutRef.current);
      }
      if (debtsTimeoutRef.current) {
        clearTimeout(debtsTimeoutRef.current);
      }
    };
  }, []);

  const handlePeriodSelect = (period: PeriodFilter) => {
    if (period.label === 'טווח מותאם') {
      // Initialize date values to current date when opening modal
      const today = new Date();
      setStartDateValue(today);
      setEndDateValue(today);
      setCustomStartDate(today.toISOString().split('T')[0]);
      setCustomEndDate(today.toISOString().split('T')[0]);
      setShowCustomDateModal(true);
    } else {
      setSelectedPeriod(selectedPeriod?.label === period.label ? null : period);
      setCustomPeriod(null); // Clear custom period when selecting predefined period
    }
  };

  const handleCustomDateSave = () => {
    if (!customStartDate || !customEndDate) {
      Alert.alert('שגיאה', 'יש לבחור תאריך התחלה וסיום');
      return;
    }

    // Validate dates
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    
    if (start > end) {
      Alert.alert('שגיאה', 'תאריך ההתחלה חייב להיות לפני תאריך הסיום');
      return;
    }

    // Set custom period
    const customPeriodData = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
    
    setCustomPeriod(customPeriodData);
    setSelectedPeriod({
      label: 'טווח מותאם',
      startDate: customPeriodData.startDate,
      endDate: customPeriodData.endDate,
    });
    setShowCustomDateModal(false);
    
    // Reset date picker states
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDateValue(selectedDate);
      setCustomStartDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDateValue(selectedDate);
      setCustomEndDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const openStartDatePicker = () => {
    setShowStartDatePicker(true);
  };

  const openEndDatePicker = () => {
    setShowEndDatePicker(true);
  };

  const getMemberName = (userId: string) => {
    return userId === user?.id ? 'אני' : 'חבר';
  };

  // Sort boards with current selected board first
  const getSortedBoards = () => {
    if (!boards || !selectedBoard) return boards || [];
    
    const currentBoard = boards.find(board => board.id === selectedBoard.id);
    const otherBoards = boards.filter(board => board.id !== selectedBoard.id);
    
    return currentBoard ? [currentBoard, ...otherBoards] : boards;
  };

  const handleBoardToggle = (boardId: string) => {
    setSelectedBoards(prev => {
      if (prev.includes(boardId)) {
        // If board is already selected, remove it (deselect)
        return prev.filter(id => id !== boardId);
      } else {
        // If board is not selected, add it
        return [...prev, boardId];
      }
    });
  };

  const handleScroll = (event: any) => {
    if (!event || !event.nativeEvent) return;
    
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (!contentOffset || !contentSize || !layoutMeasurement) return;
    
    const isAtLeft = contentOffset.x <= 0;
    const isAtRight = contentOffset.x >= contentSize.width - layoutMeasurement.width - 1;
    
    setCanScrollLeft(!isAtLeft);
    setCanScrollRight(!isAtRight);
  };

  const checkScrollability = (event: any) => {
    if (!event || !event.nativeEvent) return;
    
    const { contentSize, layoutMeasurement } = event.nativeEvent;
    if (!contentSize || !layoutMeasurement) return;
    
    const canScroll = contentSize.width > layoutMeasurement.width;
    
    if (canScroll) {
      // When content is scrollable, initially show right arrow and hide left arrow
      setCanScrollLeft(false);
      setCanScrollRight(true);
    } else {
      // When content fits, hide both arrows
      setCanScrollLeft(false);
      setCanScrollRight(false);
    }
  };

  const scrollLeft = () => {
    if (boardScrollRef && boardScrollRef.scrollToOffset) {
      boardScrollRef.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const scrollRight = () => {
    if (boardScrollRef && boardScrollRef.scrollToEnd) {
      boardScrollRef.scrollToEnd({ animated: true });
    }
  };

  const handleMarkAsPaid = async (debtId: string, boardId: string) => {
    try {
      const result = await apiService.markDebtAsPaid(boardId, debtId);
      if (result.success) {
        await loadDebts();
        Alert.alert('הצלחה', 'ההתחשבנות סומנה כשולמה');
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בסימון ההתחשבנות');
      }
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      Alert.alert('שגיאה', 'שגיאה בסימון ההתחשבנות');
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return formatCurrency(amount, selectedBoard?.currency || 'ILS');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  // Calculate per-person debt summaries for people who owe the current user money
  const calculatePersonalDebtSummary = () => {
    if (!debts || !user) return [];
    
    const personalDebts: { [personName: string]: number } = {};
    
    debts.forEach(debt => {
      // Only include unpaid debts where someone owes the current user money
      if (!debt.is_paid && debt.to_user_id === user.id && debt.from_user_id !== user.id) {
        const debtorName = debt.from_user_name || 'משתמש לא ידוע';
        if (personalDebts[debtorName]) {
          personalDebts[debtorName] += debt.amount;
        } else {
          personalDebts[debtorName] = debt.amount;
        }
      }
    });
    
    // Convert to array and sort by amount (highest first)
    return Object.entries(personalDebts)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Generate bar chart data for expenses by board
  const boardChartData = useMemo((): BarChartData[] => {
    console.log('📊 SummaryScreen: Generating board chart data:', { summary, boards });
    if (!summary || !summary.expenses_by_board || !boards || boards.length === 0) {
      console.log('📊 SummaryScreen: No data available for board chart');
      return [];
    }
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    const chartData = Object.entries(summary.expenses_by_board).map(([boardId, amount], index) => {
      const board = boards.find(b => b && b.id === boardId);
      
      return {
        key: boardId,
        value: amount,
        color: colors[index % colors.length],
        label: board?.name || `לוח ${boardId}`,
      };
    });
    
    console.log('📊 SummaryScreen: Generated board chart data:', chartData);
    return chartData;
  }, [summary, boards]);

  // Generate bar chart data for expenses by category
  const categoryChartData = useMemo((): BarChartData[] => {
    console.log('📊 SummaryScreen: Generating category chart data:', { summary });
    if (!summary || !summary.expenses_by_category) {
      console.log('📊 SummaryScreen: No data available for category chart');
      return [];
    }
    
    const colors = [
      '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
      '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#8E44AD'
    ];
    
    const chartData = Object.entries(summary.expenses_by_category).map(([category, amount], index) => {
      return {
        key: category,
        value: amount,
        color: colors[index % colors.length],
        label: category,
      };
    });
    
    console.log('📊 SummaryScreen: Generated category chart data:', chartData);
    return chartData;
  }, [summary]);

  const renderBarChart = (data: BarChartData[], title: string, colors: string[]) => {
    console.log('📊 SummaryScreen: Rendering bar chart:', { title, dataLength: data.length, data });
    if (data.length === 0) {
      console.log('📊 SummaryScreen: No data for chart, returning null');
      return null;
    }
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.chartWrapper}>
          <BarChart
            key={`${title}-${data.length}-${JSON.stringify(data.map(d => d.value))}`}
            data={data}
            width={screenWidth - 40}
            height={200}
            showLabels={showCharts}
            showValues={true}
          />
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
        {selectedBoards.includes(item.id) ? '✓ ' : ''}{item.name}
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

  const renderDebtItem = ({ item }: { item: DebtWithBoard }) => {
    // Don't show debts with yourself
    if (item.from_user_id === item.to_user_id) {
      return null;
    }

    const isIOwe = item.from_user_id === user?.id;
    const otherUserName = isIOwe ? item.to_user_name : item.from_user_name;

    return (
      <View style={[styles.debtItem, item.is_paid && styles.paidDebtItem]}>
        <View style={styles.debtHeader}>
          <Text style={styles.debtBoard}>{item.board_name}</Text>
          <Text style={[styles.debtStatus, item.is_paid && styles.paidStatus]}>
            {item.is_paid ? 'שולם' : 'טרם שולם'}
          </Text>
        </View>
        
        <Text style={styles.debtDescription}>{item.description}</Text>
        
        <View style={styles.debtDetails}>
                          <Text style={styles.debtAmount}>{formatCurrencyLocal(item.amount)}</Text>
          <Text style={styles.debtDate}>{formatDate(item.created_at)}</Text>
        </View>
        
        <View style={styles.debtDirection}>
          <Text style={styles.debtDirectionText}>
            {isIOwe ? `אני צריך להחזיר ל${otherUserName}` : `${otherUserName} צריך להחזיר לי`}
          </Text>
        </View>
        
        {!item.is_paid && !isIOwe && (
          <TouchableOpacity
            style={styles.markPaidButton}
            onPress={() => handleMarkAsPaid(item.id, item.board_id)}
          >
            <Text style={styles.markPaidButtonText}>
              אשר קבלת תשלום
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Update tutorial context when this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎓 SummaryScreen: Setting tutorial screen to Summary');
      setCurrentScreen('Summary');
      
      // Check if we should show tutorial for this screen
      const checkAndStartTutorial = async () => {
        try {
          console.log('🎓 SummaryScreen: About to check tutorial for Summary screen');
          const shouldShow = await checkScreenTutorial('Summary');
          console.log('🎓 SummaryScreen: checkScreenTutorial returned:', shouldShow);
          
          if (shouldShow) {
            console.log('🎓 SummaryScreen: Starting tutorial now');
            startTutorial();
          } else {
            console.log('🎓 SummaryScreen: Not starting tutorial - already completed or error');
          }
        } catch (error) {
          console.error('🎓 SummaryScreen: Error in checkAndStartTutorial:', error);
        }
      };
      
      // Add a small delay to let the screen settle
      setTimeout(() => {
        checkAndStartTutorial();
      }, 500);
    }, [setCurrentScreen, checkScreenTutorial, startTutorial])
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>סיכום</Text>
        <Text style={styles.subtitle}>
          {selectedPeriod ? 
            (selectedPeriod.label === 'טווח מותאם' && customPeriod ? 
              `${formatDateForInput(customPeriod.startDate)} - ${formatDateForInput(customPeriod.endDate)}` : 
              selectedPeriod.label) : 
            'כל התקופות'}
        </Text>
        {isLoading && (
          <View style={styles.inlineLoadingContainer}>
            <Text style={styles.inlineLoadingText}>מעדכן נתונים...</Text>
          </View>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expenses' && styles.activeTabButton]}
          onPress={() => handleTabSwitch('expenses')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'expenses' && styles.activeTabButtonText]}>
            הוצאות
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'debts' && styles.activeTabButton]}
          onPress={() => handleTabSwitch('debts')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'debts' && styles.activeTabButtonText]}>
            התחשבנויות
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
        <Text style={styles.filterHelpText}>לחץ על לוח לבחירה, לחץ שוב לביטול</Text>
        {boards && boards.length > 0 ? (
          <View style={styles.scrollContainer}>
            {canScrollLeft && (
              <TouchableOpacity style={styles.scrollArrowLeft} onPress={scrollLeft}>
                <Text style={styles.scrollArrowText}>‹</Text>
              </TouchableOpacity>
            )}
            
            <FlatList
              ref={(ref) => setBoardScrollRef(ref)}
              data={getSortedBoards()}
              renderItem={renderBoardFilter}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterList}
              onScroll={handleScroll}
              onContentSizeChange={checkScrollability}
              scrollEventThrottle={16}
            />
            
            {canScrollRight && (
              <TouchableOpacity style={styles.scrollArrowRight} onPress={scrollRight}>
                <Text style={styles.scrollArrowText}>›</Text>
              </TouchableOpacity>
            )}
            
            {canScrollRight && (
              <View
                style={styles.fadeRight}
              />
            )}
          </View>
        ) : (
          <Text style={styles.noDataText}>טוען לוחות...</Text>
        )}
        {selectedBoards.length === 0 && (
          <Text style={styles.allBoardsSelectedText}>מציג נתונים מכל הלוחות</Text>
        )}
      </View>

      {/* Paid Status Filters - Only for settlements tab */}
      {activeTab === 'debts' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס תשלום</Text>
          <FlatList
            data={[
              { label: 'הכל', value: 'all' as const },
              { label: 'שולם', value: 'paid' as const },
              { label: 'טרם שולם', value: 'unpaid' as const },
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
          {summary && (
            <>
              {/* Summary Cards */}
              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>סה"כ הוצאות</Text>
                  <Text style={styles.summaryCardAmount}>
                    {formatCurrencyLocal(summary.total_amount)}
                  </Text>
                  <Text style={styles.summaryCardSubtitle}>
                    {summary.total_expenses} הוצאות
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardTitle}>ממוצע להוצאה</Text>
                  <Text style={styles.summaryCardAmount}>
                    {summary.total_expenses > 0 
                      ? formatCurrencyLocal(summary.total_amount / summary.total_expenses)
                      : formatCurrencyLocal(0)
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
                    renderBarChart(categoryChartData, 'הוצאות לפי קטגוריה', ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#8E44AD'])
                  ) : (
                    <View style={styles.listContainer}>
                      {Object.entries(summary.expenses_by_category)
                        .sort(([,a], [,b]) => b - a)
                        .map(([category, amount], index) => (
                          <View key={index} style={styles.categoryItem}>
                            <Text style={styles.categoryName}>{category}</Text>
                            <Text style={styles.categoryAmount}>{formatCurrencyLocal(amount)}</Text>
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
                    renderBarChart(boardChartData, 'הוצאות לפי לוח', ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'])
                  ) : (
                    <View style={styles.listContainer}>
                      {Object.entries(summary.expenses_by_board)
                        .sort(([,a], [,b]) => b - a)
                        .map(([boardId, amount], index) => {
                          const board = boards.find(b => b && b.id === boardId);
                          return (
                            <View key={index} style={styles.boardItem}>
                              <Text style={styles.boardName}>{board?.name || `לוח ${boardId}`}</Text>
                              <Text style={styles.boardAmount}>{formatCurrencyLocal(amount)}</Text>
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
                          <Text style={styles.monthlyAmount}>{formatCurrencyLocal(amount)}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* Settlements Tab Content */}
      {activeTab === 'debts' && (
        <>
          {/* Settlement Summary Cards */}
          {debtSummary && (
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>אני צריך להחזיר</Text>
                <Text style={styles.summaryCardAmount}>
                  {formatCurrencyLocal(debtSummary.total_owed)}
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>צריכים להחזיר לי</Text>
                <Text style={styles.summaryCardAmount}>
                  {formatCurrencyLocal(debtSummary.total_owed_to_me)}
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>טרם שולם</Text>
                <Text style={styles.summaryCardAmount}>
                  {formatCurrencyLocal(debtSummary.total_unpaid)}
                </Text>
              </View>
            </View>
          )}

          {/* Personal Debt Summary - Who owes me money */}
          {(() => {
            const personalDebtSummary = calculatePersonalDebtSummary();
            return personalDebtSummary.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>סיכום יתרות אישי</Text>
                <View style={styles.personalDebtSummary}>
                  {personalDebtSummary.map((debt, index) => (
                    <View key={index} style={styles.personalDebtItem}>
                      <Text style={styles.personalDebtText}>
                        <Text style={styles.personalDebtName}>{debt.name}</Text>
                        <Text style={styles.personalDebtDescription}> צריך להחזיר לך סה"כ </Text>
                        <Text style={styles.personalDebtAmount}>{formatCurrencyLocal(debt.amount)}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null;
          })()}

          {/* Settlements List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>רשימת התחשבנויות</Text>
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
                <Text style={styles.emptyStateText}>אין התחשבנויות להצגה</Text>
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

      {/* Loading indicator at bottom */}
      {isLoading && (
        <View style={styles.bottomLoadingContainer}>
          <Text style={styles.bottomLoadingText}>טוען...</Text>
        </View>
      )}

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCustomDateModal(false);
          setShowStartDatePicker(false);
          setShowEndDatePicker(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>בחירת טווח תאריכים</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowCustomDateModal(false);
                  setShowStartDatePicker(false);
                  setShowEndDatePicker(false);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>תאריך התחלה:</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={openStartDatePicker}
              >
                <Text style={styles.datePickerText}>
                  {customStartDate || 'בחר תאריך התחלה'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>תאריך סיום:</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={openEndDatePicker}
              >
                <Text style={styles.datePickerText}>
                  {customEndDate || 'בחר תאריך סיום'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCustomDateModal(false);
                  setShowStartDatePicker(false);
                  setShowEndDatePicker(false);
                }}
              >
                <Text style={styles.modalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleCustomDateSave}
              >
                <Text style={styles.modalSaveText}>אישור</Text>
              </TouchableOpacity>
            </View>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDateValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(2020, 0, 1)}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={endDateValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(2020, 0, 1)}
              />
            )}
          </View>
        </View>
      </Modal>
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
  chartSection: {
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
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  scrollArrowLeft: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  scrollArrowRight: {
    position: 'absolute',
    right: 0,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  scrollArrowText: {
    fontSize: 24,
    color: '#333',
  },
  fadeRight: {
    position: 'absolute',
    right: 40, // Position it to not overlap with the arrow
    top: 0,
    bottom: 0,
    width: 30,
    backgroundColor: 'rgba(255,255,255,0.8)',
    pointerEvents: 'none',
  },
  noDataText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingVertical: 20,
  },
  inlineLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  inlineLoadingText: {
    fontSize: 14,
    color: '#333',
  },
  bottomLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  bottomLoadingText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#7f8c8d',
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '500',
  },
  modalSaveButton: {
    flex: 1,
    marginLeft: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterHelpText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    marginBottom: 12,
  },
  allBoardsSelectedText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
  },
  personalDebtSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  personalDebtItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  personalDebtText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  personalDebtName: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  personalDebtDescription: {
    color: '#7f8c8d',
  },
  personalDebtAmount: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  datePickerText: {
    color: '#2c3e50',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default SummaryScreen; 