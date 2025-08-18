import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ExpenseDetailsModal } from '../components/ExpenseDetailsModal';
import { ExpenseImage } from '../components/ExpenseImage';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { useTutorial } from '../contexts/TutorialContext';
import { adManager } from '../services/adManager';
import { apiService, Category, Expense } from '../services/api';
import { formatCurrency } from '../utils/currencyUtils';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedBoard, boardMembers, boardExpenses, refreshBoardExpenses } = useBoard();
  const { user } = useAuth();
  const { refreshBoardCategories } = useExpenses();
  const { setCurrentScreen, checkScreenTutorial, startTutorial, forceStartTutorial } = useTutorial();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Update tutorial context when this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎓 HomeScreen: Setting tutorial screen to Home');
      setCurrentScreen('Home');
      
      // Refresh categories when screen is focused (in case they were updated in settings)
      if (selectedBoard) {
        console.log('🔄 HomeScreen: Refreshing categories on focus...');
        loadCategories();
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
      // Also refresh ExpenseContext categories when board changes
      refreshBoardCategories();
    }
  }, [selectedBoard, refreshBoardCategories]);

  // Additional effect to listen for board data changes (e.g., after category updates)
  useEffect(() => {
    if (selectedBoard) {
      console.log('🔄 HomeScreen: Board data may have changed, reloading categories...');
      loadCategories();
    }
  }, [selectedBoard?.updated_at]); // This will trigger when board data is updated

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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshBoardExpenses(),
      loadCategories(),
      refreshBoardCategories() // Also refresh ExpenseContext categories
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
    // Only show categories that are configured for this board
    if (categories.length === 0) {
      return [];
    }

    // Limit to max 7 categories (keeping space for "אחר" button)
    const maxCategories = 7;
    const selectedCategories = categories.slice(0, maxCategories).map(cat => ({
      name: cat.name,
      icon: cat.icon,
      color: cat.color
    }));

    return selectedCategories;
  };

  const handleQuickAddExpense = (categoryName: string) => {
    (navigation as any).navigate('AddExpense', { preselectedCategory: categoryName });
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!selectedBoard || !user) return;
    
    // Check if user can delete this expense (only the creator can delete)
    if (expense.created_by !== user.id) {
      Alert.alert('שגיאה', 'ניתן למחוק רק הוצאות שיצרת בעצמך');
      return;
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

  const calculateTotalExpenses = () => {
    return boardExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const calculateMyExpenses = () => {
    if (!user) return 0;
    return boardExpenses.reduce((total, expense) => {
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
      
      {item.has_image && (
        <View style={styles.imageContainer}>
          <ExpenseImage expenseId={item.id} style={styles.expenseImage} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>סה"כ הוצאות</Text>
                          <Text style={styles.summaryValue}>
                  {formatCurrency(calculateTotalExpenses(), selectedBoard?.currency || 'ILS')}
                </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>ההוצאות שלי</Text>
                          <Text style={styles.summaryValue}>
                  {formatCurrency(calculateMyExpenses(), selectedBoard?.currency || 'ILS')}
                </Text>
        </View>
      </View>
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
            <Text style={styles.quickCategoryIcon}>{category.icon}</Text>
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

  const handleDateRangeExport = async (startDate?: string, endDate?: string) => {
    if (!selectedBoard) return;

    setIsExporting(true);
    try {
      // הצגת פרסומת תגמול לפני התחלת הייצוא
      console.log('🎯 Export: Showing rewarded ad before export process');
      const adShown = await adManager.showAdIfAllowed('export_report');
      console.log(`🎯 Export: Rewarded ad completed: ${adShown}`);

      // רק אחרי שהפרסומת הושלמה - מתחילים את הייצוא
      const result = await apiService.exportBoardExpenses(selectedBoard.id, startDate, endDate);
      if (result.success && result.data) {
        const { blob, filename } = result.data;
        
        try {
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
          
        } catch (fileError) {
          console.error('Error saving/sharing file:', fileError);
          Alert.alert('שגיאה', 'שגיאה בשמירת הקובץ');
        }
        
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בייצוא הדוח');
      }
    } catch (error) {
      console.error('Error exporting expenses:', error);
      Alert.alert('שגיאה', 'שגיאה בייצוא הדוח');
    } finally {
      setIsExporting(false);
      setShowDateModal(false);
    }
  };

  return (
    <View style={styles.container}>
      {renderSummary()}
      
      <View style={styles.headerContainer}>
        <View style={styles.quickCategoriesWrapper}>
          {renderQuickCategories()}
        </View>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>הוצאות אחרונות</Text>
          {boardExpenses.length > 0 && (
            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
              onPress={handleExportExpenses}
              disabled={isExporting}
            >
              <Text style={styles.exportButtonText}>
                {isExporting ? 'מייצא...' : '📊 אקסל'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {boardExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>אין הוצאות עדיין</Text>
          <Text style={styles.emptyStateSubtitle}>
            הוסף הוצאה ראשונה כדי להתחיל
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
                handleDateRangeExport(oneMonthAgo.toISOString(), now.toISOString());
              }}
              disabled={isExporting}
            >
              <Text style={styles.dateOptionText}>
                {isExporting ? '⏳ מכין דוח...' : 'החודש האחרון'}
              </Text>
              {!isExporting && (
                <Text style={styles.dateOptionSubtext}>30 ימים אחרונים</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dateOption, isExporting && styles.dateOptionDisabled]}
              onPress={() => {
                const now = new Date();
                const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                handleDateRangeExport(threeMonthsAgo.toISOString(), now.toISOString());
              }}
              disabled={isExporting}
            >
              <Text style={styles.dateOptionText}>
                {isExporting ? '⏳ מכין דוח...' : '3 חודשים אחרונים'}
              </Text>
              {!isExporting && (
                <Text style={styles.dateOptionSubtext}>90 ימים אחרונים</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dateOption, isExporting && styles.dateOptionDisabled]}
              onPress={() => {
                const now = new Date();
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                handleDateRangeExport(oneYearAgo.toISOString(), now.toISOString());
              }}
              disabled={isExporting}
            >
              <Text style={styles.dateOptionText}>
                {isExporting ? '⏳ מכין דוח...' : 'השנה האחרונה'}
              </Text>
              {!isExporting && (
                <Text style={styles.dateOptionSubtext}>365 ימים אחרונים</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dateOption, isExporting && styles.dateOptionDisabled]}
              onPress={() => handleDateRangeExport()}
              disabled={isExporting}
            >
              <Text style={styles.dateOptionText}>
                {isExporting ? '⏳ מכין דוח...' : 'כל ההוצאות'}
              </Text>
              {!isExporting && (
                <Text style={styles.dateOptionSubtext}>ללא הגבלת זמן</Text>
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
                {isExporting ? '⏳ מכין דוח...' : 'ביטול'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  debugButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
});

export default HomeScreen; 