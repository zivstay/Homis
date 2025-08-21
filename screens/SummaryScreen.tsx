import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
  TextInput,
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
  const navigation = useNavigation();
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
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<{name: string; amount: number; fromUserId: string} | null>(null);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentResults, setPaymentResults] = useState<any>(null);
  const [debtFilter, setDebtFilter] = useState<'all' | 'i_owe' | 'owe_me'>('all');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'unpaid' | 'paid' | 'all'>('all');

  // Function to get current period filters with fresh dates
  const getCurrentPeriodFilters = (): PeriodFilter[] => [
    {
      label: 'השבוע',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      label: 'החודש',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      label: '3 חודשים אחרונים',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
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
      setSelectedPeriod(periodFilters[0]); // Set default to "השבוע" (current week)
      setSelectedBoards([selectedBoard.id]); // Set default to current selected board
      setIsInitialized(true);
    }
  }, [selectedBoard, isInitialized]); // Removed periodFilters from dependencies since it's memoized and won't change

  // Force load data when component first initializes
  useEffect(() => {
    if (isInitialized && selectedPeriod) {
      console.log('🔧 SummaryScreen: Component initialized, loading initial data');
      if (activeTab === 'expenses') {
        loadSummary();
      } else if (activeTab === 'debts') {
        loadDebts();
      }
    }
  }, [isInitialized]); // Only run when isInitialized changes from false to true

  // Update board filter when selectedBoard changes
  useEffect(() => {
    if (isInitialized && selectedBoard) {
      console.log('🔄 SummaryScreen: Selected board changed to:', selectedBoard.name);
      // Always update the selected boards when the selected board changes
      setSelectedBoards([selectedBoard.id]);
      
      // Clear any existing data to force reload
      setSummary(null);
      setDebts([]);
      setDebtSummary(null);
      
      // Reset to default period filter when board changes
      if (periodFilters.length > 0) {
        setSelectedPeriod(periodFilters[0]); // Reset to current week
        setCustomPeriod(null); // Clear custom period
      }
    }
  }, [selectedBoard, isInitialized]);

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

  // Reload data when selectedBoard changes
  useEffect(() => {
    if (isInitialized && selectedBoard && selectedPeriod) {
      console.log('🔄 SummaryScreen: Reloading data due to board change');
      if (activeTab === 'expenses') {
        loadSummary();
      } else if (activeTab === 'debts') {
        loadDebts();
      }
    }
  }, [selectedBoard, isInitialized, activeTab]);

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
        console.log('📅 SummaryScreen: Selected period label:', selectedPeriod.label);
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
        if (paymentStatusFilter !== 'all') {
          filters.is_paid = paymentStatusFilter === 'paid';
        }

        console.log('🔵 SummaryScreen: Loading debts with filters:', filters);
        console.log('📅 SummaryScreen: Selected period label for debts:', selectedPeriod.label);
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
  }, [paymentStatusFilter, selectedPeriod, selectedBoards, customPeriod, activeTab, isInitialized]);

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
        const newSelection = prev.filter(id => id !== boardId);
        // If no boards are selected after removal, show all boards
        return newSelection.length === 0 ? [] : newSelection;
      } else {
        // If board is not selected, add it
        // If currently showing all boards (empty array), switch to only this board
        if (prev.length === 0) {
          return [boardId];
        } else {
          return [...prev, boardId];
        }
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

  const handlePartialPaymentPress = (debtor: {name: string; amount: number; fromUserId: string}) => {
    setSelectedDebtor(debtor);
    setPartialPaymentAmount('');
    setShowPartialPaymentModal(true);
  };

  const handlePartialPaymentSubmit = async () => {
    if (!selectedDebtor || !partialPaymentAmount) {
      Alert.alert('שגיאה', 'יש למלא סכום תשלום');
      return;
    }

    const amount = parseFloat(partialPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('שגיאה', 'יש להזין סכום תקין');
      return;
    }

    if (amount > selectedDebtor.amount) {
      Alert.alert('שגיאה', `לא ניתן לרשום תשלום גבוה מהסכום הכולל (${formatCurrencyLocal(selectedDebtor.amount)})`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Get current filter board IDs or all user boards
      const boardIds = selectedBoards.length > 0 ? selectedBoards : undefined;
      
      const result = await apiService.processPartialPayment(
        selectedDebtor.fromUserId,
        amount,
        boardIds
      );

      if (result.success && result.data) {
        await loadDebts(); // Reload debts to show updated data
        
        // Store results for success modal
        setPaymentResults(result.data);
        
        // Close partial payment modal and show success modal
        setShowPartialPaymentModal(false);
        setSelectedDebtor(null);
        setPartialPaymentAmount('');
        setShowSuccessModal(true);
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בעיבוד התשלום');
      }
    } catch (error) {
      console.error('Error processing partial payment:', error);
      Alert.alert('שגיאה', 'שגיאה בעיבוד התשלום');
    } finally {
      setIsProcessingPayment(false);
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
    
    const personalDebts: { [personName: string]: { amount: number; fromUserId: string } } = {};
    
    debts.forEach(debt => {
      // Only include unpaid debts where someone owes the current user money
      if (!debt.is_paid && debt.to_user_id === user.id && debt.from_user_id !== user.id) {
        const debtorName = debt.from_user_name || 'משתמש לא ידוע';
        if (personalDebts[debtorName]) {
          personalDebts[debtorName].amount += debt.amount;
        } else {
          personalDebts[debtorName] = {
            amount: debt.amount,
            fromUserId: debt.from_user_id
          };
        }
      }
    });
    
    // Convert to array and sort by amount (highest first)
    return Object.entries(personalDebts)
      .map(([name, data]) => ({ 
        name, 
        amount: data.amount, 
        fromUserId: data.fromUserId 
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Calculate per-person debt summaries for people the current user owes money to
  const calculateMyDebtSummary = () => {
    if (!debts || !user) return [];
    
    console.log('🔍 calculateMyDebtSummary: Total debts in array:', debts.length);
    
    const myDebts: { [personName: string]: { amount: number; toUserId: string } } = {};
    
    debts.forEach(debt => {
      // Only include unpaid debts where the current user owes money to someone
      if (!debt.is_paid && debt.from_user_id === user.id && debt.to_user_id !== user.id) {
        const creditorName = debt.to_user_name || 'משתמש לא ידוע';
        console.log(`🔍 Found MY unpaid debt: I owe ${debt.amount} to ${creditorName}`);
        if (myDebts[creditorName]) {
          myDebts[creditorName].amount += debt.amount;
        } else {
          myDebts[creditorName] = {
            amount: debt.amount,
            toUserId: debt.to_user_id
          };
        }
      } else if (debt.is_paid && debt.from_user_id === user.id && debt.to_user_id !== user.id) {
        const creditorName = debt.to_user_name || 'משתמש לא ידוע';
        console.log(`🔍 Found MY PAID debt: I owed ${debt.amount} to ${creditorName} (now paid)`);
      }
    });
    
    // Convert to array and sort by amount (highest first)
    return Object.entries(myDebts)
      .map(([name, data]) => ({ 
        name, 
        amount: data.amount, 
        toUserId: data.toUserId 
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Get list of all unique people in debts for filtering
  const getAllPeopleInDebts = () => {
    if (!debts || !user) return [];
    
    const people = new Set<string>();
    
    debts.forEach(debt => {
      if (debt.from_user_id !== debt.to_user_id) { // Skip self-debts
        if (debt.from_user_id === user.id) {
          // I owe money to this person
          const personName = debt.to_user_name || 'משתמש לא ידוע';
          people.add(personName);
        } else if (debt.to_user_id === user.id) {
          // This person owes me money
          const personName = debt.from_user_name || 'משתמש לא ידוע';
          people.add(personName);
        }
      }
    });
    
    return Array.from(people).sort();
  };

  // Filter debts based on current filters
  const getFilteredDebts = () => {
    if (!debts || !user) return [];
    
    let filtered = debts.filter(debt => {
      // Skip self-debts
      if (debt.from_user_id === debt.to_user_id) return false;
      
      // Apply payment status filter
      if (paymentStatusFilter === 'paid' && !debt.is_paid) return false;
      if (paymentStatusFilter === 'unpaid' && debt.is_paid) return false;
      
      // Apply debt direction filter
      if (debtFilter === 'i_owe' && debt.from_user_id !== user.id) return false;
      if (debtFilter === 'owe_me' && debt.to_user_id !== user.id) return false;
      
      // Apply person filter
      if (selectedPerson) {
        const isIOwe = debt.from_user_id === user.id;
        const otherUserName = isIOwe ? debt.to_user_name : debt.from_user_name;
        if (otherUserName !== selectedPerson) return false;
      }
      
      return true;
    });
    
    return filtered;
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

  const renderBoardFilter = ({ item }: { item: any }) => {
    // Handle "All Boards" special case
    if (item.isAllBoards) {
      const isSelected = selectedBoards.length === 0;
      return (
        <TouchableOpacity
          style={[
            styles.boardFilterButton,
            isSelected && styles.selectedAllBoardsFilterButton,
          ]}
          onPress={() => setSelectedBoards([])}
        >
          <Text
            style={[
              styles.boardFilterText,
              isSelected && styles.selectedAllBoardsFilterText,
            ]}
          >
            {isSelected ? '✓ ' : ''}{item.name}
          </Text>
        </TouchableOpacity>
      );
    }

    // Handle regular board
    return (
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
  };



  const renderDebtItem = ({ item }: { item: DebtWithBoard }) => {
    // Don't show debts with yourself
    if (item.from_user_id === item.to_user_id) {
      return null;
    }

    const isIOwe = item.from_user_id === user?.id;
    const otherUserName = isIOwe ? item.to_user_name : item.from_user_name;

    return (
      <View style={[styles.debtItem, item.is_paid && styles.paidDebtItem]}>
        {/* Header Row - Board Name, Date and Status */}
        <View style={styles.debtHeader}>
          <View style={styles.debtHeaderLeft}>
            <Text style={styles.debtBoard}>{item.board_name}</Text>
            <Text style={styles.debtDate}>{formatDate(item.created_at)}</Text>
          </View>
          <Text style={[styles.debtStatus, item.is_paid && styles.paidStatus]}>
            {item.is_paid ? 'שולם' : 'טרם שולם'}
          </Text>
        </View>
        
        {/* Divider Line */}
        <View style={styles.debtDivider} />
        
        {/* Description */}
        <Text style={styles.debtDescription}>{item.description}</Text>
        
        {/* Amount Row */}
        <View style={styles.debtDetails}>
          <View style={styles.debtAmountContainer}>
            <Text style={styles.debtAmount}>{formatCurrencyLocal(item.amount)}</Text>
            {item.original_amount && item.original_amount !== item.amount && (
              <Text style={styles.partialPaymentInfo}>
                מתוך {formatCurrencyLocal(item.original_amount)} מקורי, שולם {formatCurrencyLocal(item.paid_amount || 0)}
              </Text>
            )}
          </View>
        </View>
        
        {/* Direction Text */}
        <View style={styles.debtDirection}>
          <Text style={styles.debtDirectionText}>
            {item.is_paid 
              ? (isIOwe ? `שולם ע"י: אני` : `שולם ע"י: ${otherUserName}`)
              : (isIOwe ? `אני חייב ל${otherUserName}` : `${otherUserName} חייב לי`)
            }
          </Text>
        </View>
        
        {/* Action Button */}
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

  // If no board is selected, show board selection screen
  if (!selectedBoard) {
    return (
      <View style={styles.container}>
        <View style={styles.noBoardContainer}>
          <Text style={styles.noBoardTitle}>בחר לוח לסיכום</Text>
          <Text style={styles.noBoardSubtitle}>
            בחר לוח קיים או צור לוח חדש כדי לראות סיכום הוצאות והתחשבנויות
          </Text>
          <TouchableOpacity
            style={styles.selectBoardButton}
            onPress={() => navigation.navigate('BoardSelection' as never)}
          >
            <Text style={styles.selectBoardButtonText}>בחר לוח</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>סיכום</Text>
        <Text style={styles.subtitle}>
          {selectedBoard ? `${selectedBoard.name} - ` : ''}
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
        <Text style={styles.filterHelpText}>בחר לוחות להצגה. אפשר לבחור מספר לוחות או את כולם</Text>
        
        {boards && boards.length > 0 ? (
          <View style={styles.scrollContainer}>
            {canScrollLeft && (
              <TouchableOpacity style={styles.scrollArrowLeft} onPress={scrollLeft}>
                <Text style={styles.scrollArrowText}>‹</Text>
              </TouchableOpacity>
            )}
            
            <FlatList
              ref={(ref) => setBoardScrollRef(ref)}
              data={[{ id: 'all', name: 'כל הלוחות', isAllBoards: true }, ...getSortedBoards()]}
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
      {/* 
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
      */}

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

              {/* Boards Breakdown - Only show when multiple boards are selected or all boards */}
              {Object.keys(summary.expenses_by_board).length > 1 && (selectedBoards.length === 0 || selectedBoards.length > 1) && (
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
                <Text style={styles.summaryCardTitle}>אני חייב</Text>
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
                <Text style={styles.sectionTitle}>צריכים להחזיר לי</Text>
                <View style={styles.personalDebtSummary}>
                  {personalDebtSummary.map((debt, index) => (
                    <View key={index} style={styles.personalDebtItem}>
                      <View style={styles.personalDebtRow}>
                        <Text style={styles.personalDebtText}>
                          <Text style={styles.personalDebtName}>{debt.name}</Text>
                          <Text style={styles.personalDebtDescription}> צריך להחזיר לך סה"כ </Text>
                          <Text style={styles.personalDebtAmount}>{formatCurrencyLocal(debt.amount)}</Text>
                        </Text>
                        <TouchableOpacity
                          style={styles.partialPaymentButton}
                          onPress={() => handlePartialPaymentPress(debt)}
                        >
                          <Text style={styles.partialPaymentButtonText}>
                            💰 קיבלתי תשלום
                            </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null;
          })()}

          {/* My Debt Summary - Who I owe money to */}
          {(() => {
            const myDebtSummary = calculateMyDebtSummary();
            return myDebtSummary.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>אני צריך להחזיר</Text>
                <View style={styles.personalDebtSummary}>
                  {myDebtSummary.map((debt, index) => (
                    <View key={index} style={styles.personalDebtItem}>
                      <View style={styles.personalDebtRowInfo}>
                        <Text style={styles.personalDebtText}>
                          <Text style={styles.personalDebtDescription}>אני צריך להחזיר ל: </Text>
                          <Text style={styles.personalDebtName}>{debt.name}</Text>
                          <Text style={styles.personalDebtDescription}> סה"כ </Text>
                          <Text style={styles.personalDebtAmount}>{formatCurrencyLocal(debt.amount)}</Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null;
          })()}

                      {/* Settlements List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>רשימת התחשבנויות</Text>
            
            {/* Auto Offset Info Message */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>💡 קיזוז אוטומטי</Text>
              <Text style={styles.infoText}>
                המערכת מבצעת קיזוז אוטומטי של התחשבנויות הדדיות. 
                התחשבנויות שקוזזו מסומנות כ"שולם" ומופיעות רק בסינון "שולם" או "הכל".
              </Text>
            </View>
            
            {/* Payment Status Filter */}
            <View style={styles.filterSubsection}>
              <Text style={styles.filterSubtitle}>סטטוס תשלום:</Text>
              <View style={styles.filterRowContainer}>
                <TouchableOpacity
                  style={[styles.paymentStatusFilterButton, paymentStatusFilter === 'unpaid' && styles.selectedPaymentStatusFilterButton]}
                  onPress={() => setPaymentStatusFilter('unpaid')}
                >
                  <Text style={[styles.paymentStatusFilterText, paymentStatusFilter === 'unpaid' && styles.selectedPaymentStatusFilterText]}>
                    טרם שולם
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentStatusFilterButton, paymentStatusFilter === 'paid' && styles.selectedPaymentStatusFilterButton]}
                  onPress={() => setPaymentStatusFilter('paid')}
                >
                  <Text style={[styles.paymentStatusFilterText, paymentStatusFilter === 'paid' && styles.selectedPaymentStatusFilterText]}>
                    שולם
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentStatusFilterButton, paymentStatusFilter === 'all' && styles.selectedPaymentStatusFilterButton]}
                  onPress={() => setPaymentStatusFilter('all')}
                >
                  <Text style={[styles.paymentStatusFilterText, paymentStatusFilter === 'all' && styles.selectedPaymentStatusFilterText]}>
                    הכל
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Debt Direction Filter */}
            <View style={styles.filterSubsection}>
              <Text style={styles.filterSubtitle}>הצג התחשבנויות:</Text>
              <View style={styles.filterRowContainer}>
                <TouchableOpacity
                  style={[styles.debtFilterButton, debtFilter === 'all' && styles.selectedDebtFilterButton]}
                  onPress={() => setDebtFilter('all')}
                >
                  <Text style={[styles.debtFilterText, debtFilter === 'all' && styles.selectedDebtFilterText]}>
                    הכל
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.debtFilterButton, debtFilter === 'owe_me' && styles.selectedDebtFilterButton]}
                  onPress={() => setDebtFilter('owe_me')}
                >
                  <Text style={[styles.debtFilterText, debtFilter === 'owe_me' && styles.selectedDebtFilterText]}>
                    צריכים להחזיר לי
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.debtFilterButton, debtFilter === 'i_owe' && styles.selectedDebtFilterButton]}
                  onPress={() => setDebtFilter('i_owe')}
                >
                  <Text style={[styles.debtFilterText, debtFilter === 'i_owe' && styles.selectedDebtFilterText]}>
                    אני צריך להחזיר
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Person Filter */}
            {getAllPeopleInDebts().length > 0 && (
              <View style={styles.filterSubsection}>
                <Text style={styles.filterSubtitle}>סנן לפי אדם:</Text>
                <View style={styles.filterRowContainer}>
                  <TouchableOpacity
                    style={[styles.personFilterButton, !selectedPerson && styles.selectedPersonFilterButton]}
                    onPress={() => setSelectedPerson(null)}
                  >
                    <Text style={[styles.personFilterText, !selectedPerson && styles.selectedPersonFilterText]}>
                      כולם
                    </Text>
                  </TouchableOpacity>
                  {getAllPeopleInDebts().map((person, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.personFilterButton, selectedPerson === person && styles.selectedPersonFilterButton]}
                      onPress={() => setSelectedPerson(selectedPerson === person ? null : person)}
                    >
                      <Text style={[styles.personFilterText, selectedPerson === person && styles.selectedPersonFilterText]}>
                        {person}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {getFilteredDebts().length > 0 ? (
              <View style={styles.debtsList}>
                {getFilteredDebts().map((debt, index) => (
                  <View key={debt.id} style={styles.debtItemContainer}>
                    {renderDebtItem({ item: debt })}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {debts.length > 0 
                    ? 'אין התחשבנויות התואמות לפילטר הנבחר'
                    : 'אין התחשבנויות להצגה'
                  }
                </Text>
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

      {/* Partial Payment Modal */}
      <Modal
        visible={showPartialPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPartialPaymentModal(false);
          setSelectedDebtor(null);
          setPartialPaymentAmount('');
        }}
      >
        <View style={styles.professionalModalOverlay}>
          <View style={styles.professionalModalContent}>
            {/* Header with Icon */}
            <View style={styles.professionalModalHeader}>
              <View style={styles.paymentIconContainer}>
                <Text style={styles.paymentIcon}>💰</Text>
              </View>
              <Text style={styles.professionalModalTitle}>רישום תשלום</Text>
              <Text style={styles.professionalModalSubtitle}>עדכון יתרת חשבון</Text>
            </View>

            {selectedDebtor && (
              <View style={styles.professionalModalBody}>
                {/* Debtor Info Card */}
                <View style={styles.debtorInfoCard}>
                  <View style={styles.debtorCardHeader}>
                    <View style={styles.debtorAvatar}>
                      <Text style={styles.debtorAvatarText}>
                        {selectedDebtor.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.debtorInfo}>
                      <Text style={styles.debtorName}>{selectedDebtor.name}</Text>
                      <Text style={styles.debtorStatus}>חייב לך</Text>
                    </View>
                  </View>
                  <View style={styles.debtorAmountContainer}>
                    <Text style={styles.debtorAmountLabel}>סה"כ חשבון</Text>
                    <Text style={styles.debtorAmount}>{formatCurrencyLocal(selectedDebtor.amount)}</Text>
                  </View>
                </View>

                {/* Payment Input */}
                <View style={styles.paymentInputSection}>
                  <Text style={styles.paymentInputLabel}>סכום שקיבלת</Text>
                  <View style={styles.paymentInputContainer}>
                    <Text style={styles.currencySymbol}>₪</Text>
                    <TextInput
                      style={styles.professionalPaymentInput}
                      value={partialPaymentAmount}
                      onChangeText={setPartialPaymentAmount}
                      placeholder="0"
                      placeholderTextColor="#a0a0a0"
                      keyboardType="numeric"
                      textAlign="center"
                      selectionColor="#3498db"
                    />
                  </View>
                </View>

                {/* Info Box */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>💡 מידע נוסף</Text>
                  <Text style={styles.infoText}>
                    המערכת תסגור קודם התחשבנויות קטנות ולאחר מכן תעדכן את הגדולה ביותר
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.professionalModalActions}>
              <TouchableOpacity
                style={styles.professionalCancelButton}
                onPress={() => {
                  setShowPartialPaymentModal(false);
                  setSelectedDebtor(null);
                  setPartialPaymentAmount('');
                }}
              >
                <Text style={styles.professionalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.professionalConfirmButton, 
                  isProcessingPayment && styles.processingButton,
                  !partialPaymentAmount && styles.disabledConfirmButton
                ]}
                onPress={handlePartialPaymentSubmit}
                disabled={isProcessingPayment || !partialPaymentAmount}
              >
                {isProcessingPayment ? (
                  <View style={styles.processingContainer}>
                    <Text style={styles.processingDot}>•</Text>
                    <Text style={styles.processingDot}>•</Text>
                    <Text style={styles.processingDot}>•</Text>
                  </View>
                ) : (
                  <Text style={styles.professionalConfirmText}>✓ אישור תשלום</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          setPaymentResults(null);
        }}
      >
        <View style={styles.professionalModalOverlay}>
          <View style={styles.successModalContent}>
            {/* Success Header */}
            <View style={styles.successHeader}>
              <View style={styles.successIconContainer}>
                <Text style={styles.successIcon}>✅</Text>
              </View>
              <Text style={styles.successTitle}>תשלום נקלט בהצלחה!</Text>
              <Text style={styles.successSubtitle}>יתרת החשבון עודכנה</Text>
            </View>

            {/* Payment Summary */}
            {paymentResults && (
              <View style={styles.successBody}>
                {/* Total remaining debt */}
                <View style={styles.processedAmountCard}>
                  <Text style={styles.processedAmountLabel}>יתרת החשבון הכולל</Text>
                  <Text style={styles.processedAmount}>
                    {(() => {
                      if (!paymentResults) return formatCurrencyLocal(0);
                      
                      // Calculate total remaining debt from payment results
                      let totalRemainingDebt = 0;
                      
                      // Add remaining amounts from updated debts
                      if (paymentResults.debts_updated) {
                        paymentResults.debts_updated.forEach((debt: any) => {
                          totalRemainingDebt += debt.remaining_amount;
                        });
                      }
                      
                      return formatCurrencyLocal(totalRemainingDebt);
                    })()}
                  </Text>
                </View>

                {/* Debts closed completely */}
                {paymentResults.debts_closed && paymentResults.debts_closed.length > 0 && (
                  <View style={styles.resultSection}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultIcon}>🎉</Text>
                      <Text style={styles.resultTitle}>התחשבנויות שנסגרו לגמרי</Text>
                    </View>
                    {paymentResults.debts_closed.map((debt: any, index: number) => (
                      <View key={index} style={styles.resultItem}>
                        <Text style={styles.resultDescription}>{debt.description}</Text>
                        <Text style={styles.resultAmount}>{formatCurrencyLocal(debt.amount_paid)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Debts updated */}
                {paymentResults.debts_updated && paymentResults.debts_updated.length > 0 && (
                  <View style={styles.resultSection}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultIcon}>📝</Text>
                      <Text style={styles.resultTitle}>התחשבנויות שעודכנו</Text>
                    </View>
                    {paymentResults.debts_updated.map((debt: any, index: number) => (
                      <View key={index} style={styles.updatedDebtItem}>
                        <Text style={styles.resultDescription}>{debt.description}</Text>
                        <View style={styles.updatedDebtAmounts}>
                          <Text style={styles.paidAmountText}>
                            שולם: {formatCurrencyLocal(debt.amount_paid)}
                          </Text>
                          <Text style={styles.remainingAmountText}>
                            נותר: {formatCurrencyLocal(debt.remaining_amount)}
                          </Text>
                        </View>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { width: `${(debt.amount_paid / debt.original_amount) * 100}%` }
                            ]} 
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.successCloseButton}
              onPress={() => {
                setShowSuccessModal(false);
                setPaymentResults(null);
              }}
            >
              <Text style={styles.successCloseText}>סגור</Text>
            </TouchableOpacity>
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
  selectedAllBoardsFilterButton: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  selectedAllBoardsFilterText: {
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
    fontSize: 18,
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
    borderRadius: 12,
    padding: 16,
  },
  debtItemContainer: {
    paddingVertical: 4,
  },
  debtItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paidDebtItem: {
    borderLeftColor: '#27ae60',
    opacity: 0.8,
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  debtHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  debtBoard: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  debtDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 12,
  },
  debtStatus: {
    fontSize: 11,
    color: '#e74c3c',
    backgroundColor: '#fdf2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'center',
  },
  paidStatus: {
    color: '#27ae60',
    backgroundColor: '#f0f9f0',
  },
  debtDescription: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 12,
    fontWeight: '500',
    lineHeight: 22,
  },
  debtDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  debtDate: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  debtDirection: {
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  debtDirectionText: {
    fontSize: 13,
    color: '#5a6c7d',
    textAlign: 'center',
    fontWeight: '500',
  },
  markPaidButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  markPaidButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
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
  personalDebtRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  personalDebtRowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  partialPaymentButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  partialPaymentButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debtAmountContainer: {
    flex: 1,
    minWidth: 0, // Allow container to shrink
  },
  partialPaymentInfo: {
    fontSize: 11,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partialPaymentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    textAlign: 'right',
    fontFamily: 'System',
  },
  partialPaymentDebtorName: {
    fontWeight: 'bold',
    color: '#e74c3c',
    fontSize: 16,
  },
  partialPaymentTotalAmount: {
    fontWeight: 'bold',
    color: '#27ae60',
    fontSize: 16,
  },
  partialPaymentExplanation: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'right',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Professional Modal Styles
  professionalModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  professionalModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  professionalModalHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIcon: {
    fontSize: 28,
  },
  professionalModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  professionalModalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  professionalModalBody: {
    padding: 24,
  },
  debtorInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  debtorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debtorAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  debtorInfo: {
    flex: 1,
  },
  debtorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  debtorStatus: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  debtorAmountContainer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  debtorAmountLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  debtorAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  paymentInputSection: {
    marginBottom: 20,
  },
  paymentInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
    marginRight: 8,
  },
  professionalPaymentInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    paddingVertical: 16,
    textAlign: 'center',
  },

  professionalModalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  professionalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  professionalCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  professionalConfirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#27ae60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledConfirmButton: {
    backgroundColor: '#bdc3c7',
  },
  processingButton: {
    backgroundColor: '#3498db',
  },
  professionalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingDot: {
    color: 'white',
    fontSize: 20,
    marginHorizontal: 2,
    opacity: 0.7,
  },
  // Success Modal Styles
  successModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  successIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  successBody: {
    padding: 24,
    maxHeight: 400,
  },
  processedAmountCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  processedAmountLabel: {
    fontSize: 14,
    color: '#27ae60',
    marginBottom: 4,
    fontWeight: '600',
  },
  processedAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  resultSection: {
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 6,
  },
  resultDescription: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    marginRight: 12,
  },
  resultAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  updatedDebtItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  updatedDebtAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  paidAmountText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  remainingAmountText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 2,
  },
  successCloseButton: {
    margin: 24,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  successCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Filter Styles
  filterSubsection: {
    marginBottom: 16,
  },
  filterSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  filterRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  debtFilterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDebtFilterButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  debtFilterText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedDebtFilterText: {
    color: 'white',
  },
  personFilterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 4,
  },
  selectedPersonFilterButton: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  personFilterText: {
    color: '#2c3e50',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedPersonFilterText: {
    color: 'white',
  },
  paymentStatusFilterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPaymentStatusFilterButton: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  paymentStatusFilterText: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedPaymentStatusFilterText: {
    color: 'white',
  },
  noBoardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  noBoardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  noBoardSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  selectBoardButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  selectBoardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

});

export default SummaryScreen; 