import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    InteractionManager,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { showAdConsentModal } from '../components/AdConsentModal';
// DISABLED: BudgetEditModal temporarily removed
// import { BudgetEditModal } from '../components/BudgetEditModal';
import { CategoryImage } from '../components/CategoryImage';
import { ExpenseDetailsModal } from '../components/ExpenseDetailsModal';
import { ExpenseImage } from '../components/ExpenseImage';
import ShoppingListModal from '../components/ShoppingListModal';
import { getBoardTypeById } from '../constants/boardTypes';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { useTutorial } from '../contexts/TutorialContext';
import { adManager } from '../services/adManager';
import { apiService, Category, Expense } from '../services/api';
import { formatCurrency } from '../utils/currencyUtils';

// DISABLED: BudgetStatus interface temporarily removed
// TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת

// COMMENTED OUT - BudgetStatus interface (needs work)
// interface BudgetStatus {
//   has_budget: boolean;
//   budget_amount: number | null;
//   current_expenses: number;
//   percentage_used: number;
//   alerts: number[];
//   triggered_alerts: Array<{
//     percentage: number;
//     current_percentage: number;
//     budget_amount: number;
//     current_expenses: number;
//   }>;
//   was_reset?: boolean;
// }

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedBoard, boardMembers, boardExpenses, refreshBoardExpenses, updateSelectedBoard, boards } = useBoard();
  const { user, logout } = useAuth();
  const { refreshBoardCategories, quickCategories } = useExpenses();
  const { isGuestMode } = useAuth();
  const { setCurrentScreen, checkScreenTutorial, startTutorial, forceStartTutorial } = useTutorial();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedExportOption, setSelectedExportOption] = useState<string | null>(null);
  const [exportData, setExportData] = useState<{blob: Blob, filename: string} | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  // DISABLED: Budget-related states temporarily removed
  // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
  
  // COMMENTED OUT - Budget states (needs work)
  // const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  // const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'month' | 'total'>('month');

  // Check if this is a work management board
  const boardType = selectedBoard ? getBoardTypeById(selectedBoard.board_type) : null;
  const isWorkManagement = selectedBoard?.board_type === 'work_management';
  
  // Check if current user is the board owner
  const isBoardOwner = selectedBoard?.user_role === 'owner';

  // פונקציה לניקוי מלא של כל ה-states
  const resetAllExportStates = () => {
    console.log('🎯 Reset: Clearing all export states');
    setShowDateModal(false);
    setIsExporting(false);
    setSelectedExportOption(null);
    setExportData(null);
    setShowDownloadModal(false);
    setIsLoading(false);
    setRefreshing(false);
  };


  // Update tutorial context when this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎓 HomeScreen: Setting tutorial screen to Home');
      setCurrentScreen('Home');
      
      // Refresh categories when screen is focused (in case they were updated in settings)
      if (selectedBoard) {
        console.log('🔄 HomeScreen: Refreshing categories on focus...');
        loadCategories();
        // DISABLED: loadBudgetStatus() temporarily removed
        // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
        refreshBoardCategories();
      }
      
      // Check if we should show tutorial for this screen
      const checkAndStartTutorial = async () => {
        try {
          console.log('🎓 HomeScreen: About to check tutorial for Home screen');
          const shouldShow = await checkScreenTutorial('Home');
          console.log('🎓 HomeScreen: checkScreenTutorial returned:', shouldShow);
          
          if (shouldShow) {
            console.log('🎓 HomeScreen: Starting tutorial now');
            startTutorial();
          } else {
            console.log('🎓 HomeScreen: Not starting tutorial - already completed or error');
          }
        } catch (error) {
          console.error('🎓 HomeScreen: Error in checkAndStartTutorial:', error);
        }
      };
      
      // Add a small delay to let the screen settle
      setTimeout(() => {
        checkAndStartTutorial();
      }, 500);
    }, [setCurrentScreen, checkScreenTutorial, startTutorial, selectedBoard, refreshBoardCategories])
  );

  useEffect(() => {
    if (selectedBoard) {
      console.log('🔄 HomeScreen: Board changed, loading categories...');
      loadCategories();
      // DISABLED: loadBudgetStatus() temporarily removed
      // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
      // Also refresh ExpenseContext categories when board changes
      refreshBoardCategories();
    }
  }, [selectedBoard, refreshBoardCategories]);

  // Additional effect to listen for board data changes (e.g., after category updates)
  useEffect(() => {
    if (selectedBoard) {
      console.log('🔄 HomeScreen: Board data may have changed, reloading categories...');
      loadCategories();
      // DISABLED: loadBudgetStatus() temporarily removed
      // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
    }
  }, [selectedBoard?.updated_at]); // This will trigger when board data is updated

  // DISABLED: Effect to reload budget when expenses change temporarily removed
  // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
  
  // COMMENTED OUT - Budget reload on expenses change (needs work)
  // useEffect(() => {
  //   if (selectedBoard && boardExpenses.length >= 0 && !isGuestMode) {
  //     console.log('🔄 HomeScreen: Expenses changed, reloading budget status...');
  //     loadBudgetStatus();
  //   }
  // }, [boardExpenses, selectedBoard?.id]); // Reload when expenses or board changes

  const loadCategories = async () => {
    if (!selectedBoard) return;

    setIsLoading(true);
    try {
      const categoriesResult = await apiService.getBoardCategories(selectedBoard.id);

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת הקטגוריות');
    } finally {
      setIsLoading(false);
    }
  };

  // DISABLED: Budget loading function temporarily removed
  // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
  
  // COMMENTED OUT - Budget loading function (needs work)
  // const loadBudgetStatus = async () => {
  //   if (!selectedBoard || isGuestMode) return;

  //   try {
  //     console.log('🔄 Loading budget status for board:', selectedBoard.id);
  //     const budgetResult = await apiService.getBoardBudgetStatus(selectedBoard.id);
  //     if (budgetResult.success && budgetResult.data) {
  //       console.log('✅ Budget status loaded:', budgetResult.data);
  //       setBudgetStatus(budgetResult.data);
        
  //       // DISABLED: Budget reset notifications temporarily disabled
  //       // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
        
  //       // COMMENTED OUT - Budget reset notification (needs work)
  //       // // אם התקציב אופס זה עתה, הצג הודעה
  //       // if ((budgetResult.data as any).was_reset) {
  //       //   console.log('💰 Budget was reset - showing notification');
  //       //   // הצג התראה על איפוס התקציב
  //       //   Alert.alert(
  //       //     '🔄 התקציב אופס',
  //       //     'התקציב שלכם אופס אוטומטית בהתאם להגדרות האיפוס. ההוצאות והחריגות מתחילות מחדש.',
  //       //     [{ text: 'הבנתי', style: 'default' }]
  //       //   );
  //       // }
  //     } else {
  //       console.log('❌ Failed to load budget status:', budgetResult.error);
  //       setBudgetStatus(null);
  //     }
  //   } catch (error) {
  //     console.error('Error loading budget status:', error);
  //     setBudgetStatus(null);
  //   }
  // };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshBoardExpenses(),
      loadCategories(),
      refreshBoardCategories() // Also refresh ExpenseContext categories
      // DISABLED: loadBudgetStatus() temporarily removed
      // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
    ]);
    setRefreshing(false);
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#3498db';
  };

  const getMemberName = (userId: string) => {
    const member = boardMembers.find(m => m.user_id === userId);
    return member ? `${member.user.first_name} ${member.user.last_name}` : 'לא ידוע';
  };

  // Get categories selected in board settings (max 7)
  const getSelectedCategories = () => {
    // In guest mode, use quickCategories from ExpenseContext
    if (isGuestMode) {
      if (quickCategories.length === 0) {
        return [];
      }
      
      // Limit to max 7 categories (keeping space for "אחר" button)
      const maxCategories = 7;
      const selectedCategories = quickCategories
        .filter(cat => cat.name !== 'אחר') // Exclude "אחר" as it's added separately
        .slice(0, maxCategories)
        .map(cat => ({
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          imageUrl: cat.imageUrl, // Include imageUrl if exists
        }));

      return selectedCategories;
    }

    // For authenticated users, use API categories
    if (categories.length === 0) {
      return [];
    }

    // Limit to max 7 categories (keeping space for "אחר" button)
    const maxCategories = 7;
    const selectedCategories = categories.slice(0, maxCategories).map(cat => ({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      imageUrl: cat.image_url, // Include imageUrl if exists
    }));

    return selectedCategories;
  };

  const handleQuickAddExpense = (categoryName: string) => {
    (navigation as any).navigate('AddExpense', { preselectedCategory: categoryName });
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!selectedBoard) return;
    
    // In guest mode, allow deleting any expense
    if (isGuestMode) {
      // Guest mode deletion logic will be handled below
    } else if (!user) {
      return; // No user and not guest mode
    } else {
      // Check if user can delete this expense (only the creator can delete)
      if (expense.created_by !== user.id) {
        Alert.alert('שגיאה', 'ניתן למחוק רק הוצאות שיצרת בעצמך');
        return;
      }
    }

    Alert.alert(
      'מחיקת הוצאה',
      `האם אתה בטוח שברצונך למחוק את ההוצאה "${expense.description || expense.category}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiService.deleteExpense(selectedBoard.id, expense.id);
              if (result.success) {
                await refreshBoardExpenses();
                Alert.alert('הצלחה', 'ההוצאה נמחקה בהצלחה');
              } else {
                // Handle different error types
                let errorMessage = result.error || 'שגיאה במחיקת ההוצאה';
                if (result.error?.includes('payments have already been made')) {
                  errorMessage = 'לא ניתן למחוק הוצאה שכבר בוצעו עליה תשלומים. פנה לתמיכה אם יש צורך בשינוי';
                }
                Alert.alert('שגיאה', errorMessage);
              }
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('שגיאה', 'שגיאה במחיקת ההוצאה');
            }
          },
        },
      ]
    );
  };

  const getFilteredExpenses = () => {
    if (timeFilter === 'total') {
      return boardExpenses;
    }
    
    // Filter for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return boardExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
    });
  };

  const calculateTotalExpenses = () => {
    const filteredExpenses = getFilteredExpenses();
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const calculateMyExpenses = () => {
    const filteredExpenses = getFilteredExpenses();
    
    if (isGuestMode) {
      // In guest mode, all expenses are "mine"
      return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
    }
    if (!user) return 0;
    return filteredExpenses.reduce((total, expense) => {
      if (expense.paid_by === user.id) {
        return total + expense.amount;
      }
      return total;
    }, 0);
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={styles.expenseItem}
      onPress={() => setSelectedExpense(item)}
      onLongPress={() => handleDeleteExpense(item)}
    >
      <View style={styles.expenseMain}>
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
                          <Text style={styles.expenseAmount}>
                  {formatCurrency(item.amount, selectedBoard?.currency || 'ILS')}
                </Text>
        </View>
        
        {item.description && (
          <Text style={styles.expenseDescription}>{item.description}</Text>
        )}
        
        <View style={styles.expenseFooter}>
          <Text style={styles.paidByText}>
            {isWorkManagement ? 'בוצע על ידי:' : 'שולם על ידי:'} {getMemberName(item.paid_by)}
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
      
      {item.has_image && (
        <View style={styles.imageContainer}>
          <ExpenseImage expenseId={item.id} style={styles.expenseImage} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      {/* Time Filter & Shopping List */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.shoppingListButtonTop}
          onPress={() => setShowShoppingList(true)}
        >
          <Ionicons name="cart" size={18} color="white" />
          <Text style={styles.shoppingListLabel}>רשימת קניות</Text>
        </TouchableOpacity>
        
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              timeFilter === 'month' && styles.filterButtonActive
            ]}
            onPress={() => setTimeFilter('month')}
          >
            <Text style={[
              styles.filterButtonText,
              timeFilter === 'month' && styles.filterButtonTextActive
            ]}>
              החודש
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              timeFilter === 'total' && styles.filterButtonActive
            ]}
            onPress={() => setTimeFilter('total')}
          >
            <Text style={[
              styles.filterButtonText,
              timeFilter === 'total' && styles.filterButtonTextActive
            ]}>
              סה"כ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Row - Budget column removed */}
      <View style={styles.summaryRow}>
        {/* Total Expenses/Works - Only for board owners */}
        {isBoardOwner && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>
              {isWorkManagement ? 'סה"כ עבודות' : 'סה"כ הוצאות'}
            </Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(calculateTotalExpenses(), selectedBoard?.currency || 'ILS')}
            </Text>
          </View>
        )}
        
        {/* My Expenses/Works */}
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>
            {isWorkManagement ? 'העבודות שלי' : 'ההוצאות שלי'}
          </Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(calculateMyExpenses(), selectedBoard?.currency || 'ILS')}
          </Text>
        </View>
      </View>
      
      {/* DISABLED: Budget alerts temporarily disabled */}
      {/* TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת */}
      
      {/* COMMENTED OUT - Budget alerts display (needs work) */}
      {/* Budget alerts disclaimer */}
      {/* {budgetStatus?.triggered_alerts && budgetStatus.triggered_alerts.length > 0 && (
        <View style={styles.budgetAlertContainer}>
          {budgetStatus.triggered_alerts.map((alert, index) => {
            const isExceeded = (alert as any).is_exceeded;
            return (
              <Text 
                key={index} 
                style={[
                  styles.budgetAlertText,
                  isExceeded && styles.budgetExceededText
                ]}
              >
                {isExceeded 
                  ? `🚨 חריגה מהתקציב! (${Math.round(alert.current_percentage)}% בשימוש)`
                  : `⚠️ עברתם ${alert.percentage}% מהתקציב (${Math.round(alert.current_percentage)}% בשימוש)`
                }
              </Text>
            );
          })}
        </View>
      )} */}
    </View>
  );

  const renderQuickCategories = () => {
    const selectedCategories = getSelectedCategories();
    
    return (
      <View style={styles.quickCategoriesContainer}>
        {selectedCategories.map((category, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickCategoryButton, { backgroundColor: category.color }]}
            onPress={() => handleQuickAddExpense(category.name)}
          >
        {category.imageUrl ? (
          <CategoryImage imageUrl={category.imageUrl} style={styles.quickCategoryImage} />
        ) : (
          <Text style={styles.quickCategoryIcon}>{category.icon}</Text>
        )}
            <Text style={styles.quickCategoryText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Always show "אחר" as the last option */}
        <TouchableOpacity
          style={[styles.quickCategoryButton, { backgroundColor: '#95a5a6' }]}
          onPress={() => navigation.navigate('AddExpense' as never)}
        >
          <Text style={styles.quickCategoryIcon}>➕</Text>
          <Text style={styles.quickCategoryText}>אחר</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleExportExpenses = () => {
    if (!selectedBoard || boardExpenses.length === 0) {
      Alert.alert('שגיאה', 'אין הוצאות לייצא');
      return;
    }
    setShowDateModal(true);
  };

  // פונקציה נפרדת להורדת הקובץ
  const downloadExportFile = async () => {
    console.log('🎯 Download: Function called - START OF FUNCTION');
    console.log('🎯 Download: exportData exists:', !!exportData);
    console.log('🎯 Download: selectedBoard exists:', !!selectedBoard);
    if (!exportData || !selectedBoard) {
      console.log('🎯 Download: Missing data or board - EXITING');
      return;
    }

    console.log('🎯 Download: Starting download process');
    try {
      const { blob, filename } = exportData;
      
      // Create file path in app documents directory
      const fileUri = FileSystem.documentDirectory + filename;
      
      // Convert blob to base64 and write to file system
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix to get just the base64 data
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Write Excel content to file as base64
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('✅ Excel file saved to:', fileUri);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('שגיאה', 'שיתוף לא זמין במכשיר זה');
        return;
      }
      
      // Share the saved file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `דוח הוצאות - ${selectedBoard.name}`,
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      });
      
      // נקה את הדוח אחרי השיתוף
      console.log('🎯 Download: Process completed successfully');
      
      // ניקוי מלא של כל ה-states ו-force refresh
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          resetAllExportStates();
          // כפה רענון של הקומפוננטה
          setForceUpdate(prev => prev + 1);
        }, 200);
      });
      
    } catch (error) {
      console.error('🎯 Download: Error occurred:', error);
      setTimeout(() => {
        resetAllExportStates();
      }, 100);
      Alert.alert('שגיאה', 'שגיאה בהורדת הקובץ');
    }
    
    console.log('🎯 Download: Function ended');
  };

  // DISABLED: Budget update function temporarily removed
  // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
  
  // COMMENTED OUT - Budget update function (needs work)
  // const handleBudgetUpdate = async (budgetAmount: number | null, alerts: number[], autoReset: boolean, resetDay: number | null, resetTime: string | null) => {
  //   if (!selectedBoard) return;

  //   try {
  //     console.log('💰 Updating budget:', { budgetAmount, alerts, autoReset, resetDay, resetTime });
  //     const updateData = {
  //       budget_amount: budgetAmount,
  //       budget_alerts: alerts,
  //       budget_auto_reset: autoReset,
  //       budget_reset_day: resetDay,
  //       budget_reset_time: resetTime
  //     };

  //     const result = await apiService.updateBoard(selectedBoard.id, updateData);
  //     console.log('💰 Budget update result:', result);
      
  //     if (result.success) {
  //       console.log('✅ Budget updated successfully, refreshing data...');
        
  //       // Refresh budget status
  //       await loadBudgetStatus();
        
  //       // Update the selected board with fresh data from API
  //       await updateSelectedBoard(selectedBoard.id);
        
  //       setShowBudgetModal(false);
  //       Alert.alert('הצלחה', 'התקציב עודכן בהצלחה');
  //     } else {
  //       console.log('❌ Budget update failed:', result.error);
  //       Alert.alert('שגיאה', result.error || 'שגיאה בעדכון התקציב');
  //     }
  //   } catch (error) {
  //     console.error('Error updating budget:', error);
  //     Alert.alert('שגיאה', 'שגיאה בעדכון התקציב');
  //   }
  // };

  const handleDateRangeExport = async (startDate?: string, endDate?: string, optionName?: string) => {
    if (!selectedBoard) return;

    setIsExporting(true);
    setSelectedExportOption(optionName || null);
    try {
      // בדוק אם ניתן להציג פרסומת (תמיד true עבור ייצוא)
      console.log('🎯 Export: Checking if we can show ad for export');
      
      // הצג הודעה למשתמש לפני הפרסומת
      const userConsent = await showAdConsentModal({
        title: '🎉 תודה על השימוש',
        message: 'בשביל שתוכל להוריד קובץ הוצאות, נשמח שתצפה בפרסומת קטנה שתעזור לנו להמשיך לפתח את Homeis!\n\n**חשוב לדעת:**\n•תצטרך לצפות בה עד הסוף כדי שהקובץ יורד',
        alwaysRequireAd: true
      });

      if (!userConsent) {
        // המשתמש לא הסכים לצפות בפרסומת - לא מייצאים
        Alert.alert(
          'אוקיי, לא נורא! 😊',
          'הייצוא לא יתבצע כרגע. תוכל לנסות שוב בהמשך! 😊'
        );
        setIsExporting(false);
        setSelectedExportOption(null);
        setShowDateModal(false);
        return;
      }

      // המשתמש הסכים - מציגים פרסומת
      console.log('🎯 Export: User agreed, showing ad...');
      
      try {
        // הצגת פרסומת ללא קשר לקירור עבור ייצוא לאקסל
        console.log('🎯 Export: Attempting to show ad with force=true');
        const adShown = await adManager.showAdIfAllowed('export_report', true);
        console.log(`🎯 Export: Interstitial ad result: ${adShown}`);
        
        // המתנה קצרה לוודא שהפרסומת הסתיימה לפני המשך
        if (adShown) {
          console.log('🎯 Export: Ad was shown successfully, waiting a moment before proceeding');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('🎯 Export: Ad was not shown, proceeding anyway');
        }
      } catch (error) {
        console.error('🎯 Export: Error showing ad:', error);
      }

      // רק אחרי שהפרסומת הושלמה - מתחילים את הייצוא
      console.log('🎯 Export: Starting export process...');
      const result = await apiService.exportBoardExpenses(selectedBoard.id, startDate, endDate);
      
      if (result.success && result.data) {
        const { blob, filename } = result.data;
        
        // שמירת הדוח במצב State ללא שיתוף אוטומטי
        setExportData({ blob, filename });
        
        // סגירת המודל והצגת Modal ההורדה
        setShowDateModal(false);
        setIsExporting(false);
        setSelectedExportOption(null);
        
        // פתיחת Modal ההורדה
        setTimeout(() => {
          setShowDownloadModal(true);
        }, 300);
        
      } else {
        // סגירת המודל גם במקרה של שגיאת API
        setShowDateModal(false);
        setIsExporting(false);
        setSelectedExportOption(null);
        Alert.alert('שגיאה', result.error || 'שגיאה בייצוא הדוח');
      }
    } catch (error) {
      console.error('Error exporting expenses:', error);
      // סגירת המודל גם במקרה של שגיאה כללית
      setShowDateModal(false);
      setIsExporting(false);
      setSelectedExportOption(null);
      Alert.alert('שגיאה', 'שגיאה בייצוא הדוח');
    } finally {
      setIsExporting(false);
      setSelectedExportOption(null);
      setShowDateModal(false);
    }
  };

  // If no board is selected, show board selection screen
  if (!selectedBoard) {
    return (
      <View style={styles.container}>
        <View style={styles.noBoardContainer}>
          <Text style={styles.noBoardTitle}>
            {boards.length === 0 ? 'צור לוח ראשון' : 'בחר לוח להתחלה'}
          </Text>
          <Text style={styles.noBoardSubtitle}>
            {boards.length === 0 
              ? 'צור לוח חדש כדי להתחיל לנהל הוצאות משותפות'
              : 'בחר לוח קיים או צור לוח חדש כדי להתחיל לנהל הוצאות'
            }
          </Text>
          <TouchableOpacity
            style={styles.selectBoardButton}
            onPress={() => navigation.navigate('BoardSelection' as never)}
          >
            <Text style={styles.selectBoardButtonText}>
              {boards.length === 0 ? 'צור לוח חדש' : 'בחר לוח'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} key={`home-${forceUpdate}`}>
      {renderSummary()}
      
      <View style={styles.headerContainer}>
        <View style={styles.quickCategoriesWrapper}>
          {renderQuickCategories()}
        </View>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isWorkManagement ? 'עבודות אחרונות' : 'הוצאות אחרונות'}
          </Text>
          {boardExpenses.length > 0 && isBoardOwner && (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
                onPress={handleExportExpenses}
                disabled={isExporting}
              >
                <Text style={styles.exportButtonText}>
                  {isExporting ? 'מייצא...' : '📊 אקסל'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {boardExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>
            {isWorkManagement ? 'אין עבודות עדיין' : 'אין הוצאות עדיין'}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {isWorkManagement ? 'הוסף עבודה ראשונה כדי להתחיל' : 'הוסף הוצאה ראשונה כדי להתחיל'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={boardExpenses}
          renderItem={renderExpenseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.expenseList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {selectedExpense && (
        <ExpenseDetailsModal
          visible={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          getMemberName={getMemberName}
          getCategoryColor={getCategoryColor}
          onDelete={handleDeleteExpense}
          canDelete={isGuestMode || !!(user && selectedExpense.created_by === user.id)}
        />
      )}

      {/* Shopping List Modal */}
      {selectedBoard && (
        <ShoppingListModal
          visible={showShoppingList}
          onClose={() => setShowShoppingList(false)}
          boardId={selectedBoard.id}
          isAdmin={isBoardOwner}
        />
      )}

      {/* Date Range Selection Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>בחר טווח תאריכים לייצוא</Text>
            
            <TouchableOpacity
              style={[styles.dateOption, isExporting && styles.dateOptionDisabled]}
              onPress={() => {
                const now = new Date();
                const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                handleDateRangeExport(oneMonthAgo.toISOString(), now.toISOString(), 'החודש האחרון');
              }}
              disabled={isExporting}
            >
              <Text style={styles.dateOptionText}>
                {isExporting && selectedExportOption === 'החודש האחרון' ? '⏳ מכין דוח...' : 'החודש האחרון'}
              </Text>
              {!(isExporting && selectedExportOption === 'החודש האחרון') && (
                <Text style={styles.dateOptionSubtext}>30 ימים אחרונים</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dateOption, isExporting && styles.dateOptionDisabled]}
              onPress={() => {
                const now = new Date();
                const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                handleDateRangeExport(threeMonthsAgo.toISOString(), now.toISOString(), '3 חודשים אחרונים');
              }}
              disabled={isExporting}
            >
              <Text style={styles.dateOptionText}>
                {isExporting && selectedExportOption === '3 חודשים אחרונים' ? '⏳ מכין דוח...' : '3 חודשים אחרונים'}
              </Text>
              {!(isExporting && selectedExportOption === '3 חודשים אחרונים') && (
                <Text style={styles.dateOptionSubtext}>90 ימים אחרונים</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dateOption, isExporting && styles.dateOptionDisabled]}
              onPress={() => {
                const now = new Date();
                const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                handleDateRangeExport(sixMonthsAgo.toISOString(), now.toISOString(), 'חצי שנה');
              }}
              disabled={isExporting}
            >
              <Text style={styles.dateOptionText}>
                {isExporting && selectedExportOption === 'חצי שנה' ? '⏳ מכין דוח...' : 'חצי שנה'}
              </Text>
              {!(isExporting && selectedExportOption === 'חצי שנה') && (
                <Text style={styles.dateOptionSubtext}>6 חודשים אחרונים</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton, 
                styles.cancelButton,
                isExporting && styles.cancelButtonDisabled
              ]}
              onPress={() => setShowDateModal(false)}
              disabled={isExporting}
            >
              <Text style={[
                styles.cancelButtonText,
                isExporting && styles.cancelButtonTextDisabled
              ]}>
                ביטול
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Download Ready Modal */}
      <Modal
        visible={showDownloadModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowDownloadModal(false);
          resetAllExportStates();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModalContent}>
            <Text style={styles.downloadModalTitle}>הדוח מוכן! 🎉</Text>
            <Text style={styles.downloadModalMessage}>
              הדוח נוצר בהצלחה ומוכן להורדה
            </Text>
            
            <View style={styles.downloadModalButtons}>
              <TouchableOpacity
                style={styles.downloadModalCancelButton}
                onPress={() => {
                  console.log('🎯 Modal: User cancelled download');
                  setShowDownloadModal(false);
                  resetAllExportStates();
                }}
              >
                <Text style={styles.downloadModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.downloadModalDownloadButton}
                onPress={() => {
                  console.log('🎯 Modal: User chose to download');
                  setShowDownloadModal(false);
                  downloadExportFile();
                }}
              >
                <Text style={styles.downloadModalDownloadText}>📥 הורד עכשיו</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DISABLED: Budget Edit Modal temporarily removed */}
      {/* TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת */}
      
      {/* COMMENTED OUT - Budget Edit Modal (needs work) */}
      {/* <BudgetEditModal
        visible={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        onSave={handleBudgetUpdate}
        currentBudget={budgetStatus?.budget_amount}
        currentAlerts={budgetStatus?.alerts || []}
        currentAutoReset={selectedBoard?.budget_auto_reset}
        currentResetDay={selectedBoard?.budget_reset_day}
        currentResetTime={selectedBoard?.budget_reset_time}
        currency={selectedBoard?.currency || 'ILS'}
      /> */}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
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
  expenseMain: {
    flex: 1,
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
  imageContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  expenseImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  quickCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCategoryButton: {
    width: '23%', // 4 buttons per row with some margin
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 70, // Ensure consistent height
  },
  quickCategoryIcon: {
    fontSize: 18,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickCategoryImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickCategoryText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 14,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickCategoriesWrapper: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonDisabled: {
    backgroundColor: '#bdc3c7',
    opacity: 0.7,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  shoppingListButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shoppingListButtonText: {
    fontSize: 20,
  },
  downloadButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 24,
  },
  dateOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e6ed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dateOptionDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
    opacity: 0.7,
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateOptionSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonTextDisabled: {
    color: '#bdc3c7',
  },
  // Download Modal Styles
  downloadModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  downloadModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 16,
  },
  downloadModalMessage: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  downloadModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  downloadModalCancelButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  downloadModalCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadModalDownloadButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  downloadModalDownloadText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  // DISABLED: Budget styles temporarily removed
  // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
  
  // COMMENTED OUT - Budget styles (needs work)
  // budgetActiveValue: {
  //   color: '#27ae60',
  // },
  // budgetInactiveValue: {
  //   color: '#95a5a6',
  //   fontSize: 14,
  // },
  // budgetPercentage: {
  //   fontSize: 12,
  //   color: '#7f8c8d',
  //   textAlign: 'center',
  //   marginTop: 2,
  // },
  // budgetAlertContainer: {
  //   backgroundColor: '#fff3cd',
  //   borderColor: '#ffeaa7',
  //   borderWidth: 1,
  //   borderRadius: 8,
  //   padding: 12,
  //   marginTop: 12,
  // },
  // budgetAlertTitle: {
  //   fontSize: 14,
  //   fontWeight: 'bold',
  //   color: '#856404',
  //   textAlign: 'center',
  //   marginBottom: 4,
  // },
  // budgetAlertText: {
  //   fontSize: 12,
  //   color: '#856404',
  //   textAlign: 'center',
  // },
  // budgetExceededText: {
  //   color: '#dc3545',
  //   fontWeight: 'bold',
  //   fontSize: 13,
  // },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  // Shopping List Button (Top)
  shoppingListButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  shoppingListLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },

});

export default HomeScreen; 