import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, FlatList, Keyboard, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppTutorial from './components/AppTutorial';
import NotificationModal from './components/NotificationModal';
import { BOARD_TYPES, BoardType, QuickCategory } from './constants/boardTypes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BoardProvider, useBoard } from './contexts/BoardContext';
import { ExpenseProvider, useExpenses } from './contexts/ExpenseContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { TutorialProvider, useTutorial } from './contexts/TutorialContext';
import AddExpenseScreen from './screens/AddExpenseScreen';
import BoardSelectionScreen from './screens/BoardSelectionScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SettingsScreen from './screens/SettingsScreen';
import SummaryScreen from './screens/SummaryScreen';
import { Board } from './services/api';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function BoardSwitcherHeader() {
  const { boards, selectedBoard, selectBoard, createBoard, setDefaultBoard, clearDefaultBoard, deleteBoard, refreshBoardData } = useBoard();
  const { unreadCount } = useNotifications();
  const { refreshBoardCategories } = useExpenses();
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: פרטים, 2: סוג לוח, 3: קטגוריות
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<QuickCategory[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleBoardSelect = (board: Board) => {
    selectBoard(board);
    setShowBoardModal(false);
  };

  const handleSetDefaultBoard = async (board: Board) => {
    Alert.alert(
      'הגדרת לוח ברירת מחדל',
      `האם ברצונך להגדיר את "${board.name}" כלוח ברירת מחדל?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן',
          onPress: async () => {
            const result = await setDefaultBoard(board.id);
            if (!result.success) {
              Alert.alert('שגיאה', result.error || 'שגיאה בהגדרת לוח ברירת מחדל');
            }
          },
        },
      ]
    );
  };

  const handleClearDefaultBoard = () => {
    Alert.alert(
      'ביטול לוח ברירת מחדל',
      'האם ברצונך לבטל את לוח ברירת המחדל?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן',
          onPress: async () => {
            const result = await clearDefaultBoard();
            if (!result.success) {
              Alert.alert('שגיאה', result.error || 'שגיאה בביטול לוח ברירת מחדל');
            }
          },
        },
      ]
    );
  };

  const handleDeleteBoard = (board: Board) => {
    Alert.alert(
      'מחיקת לוח',
      `האם אתה בטוח שברצונך למחוק את הלוח "${board.name}"? פעולה זו תמחק את כל ההוצאות וההתחשבנויות הקשורות ללוח ואינה ניתנת לביטול.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteBoard(board.id);
            if (result.success) {
              setShowBoardModal(false);
              // If the deleted board was the selected board, we need to let the context handle selection
            } else {
              Alert.alert('שגיאה', result.error || 'שגיאה במחיקת הלוח');
            }
          },
        },
      ]
    );
  };

  const resetWizard = () => {
    setWizardStep(1);
    setNewBoardName('');
    setNewBoardDescription('');
    setSelectedBoardType(null);
    setSelectedCategories([]);
  };

  const handleBoardTypeSelect = (boardType: BoardType) => {
    setSelectedBoardType(boardType);
    // Set default categories for the selected board type
    setSelectedCategories([...boardType.quickCategories]);
  };

  const handleCategoryToggle = (category: QuickCategory) => {
    setSelectedCategories(prev => {
      const isSelected = prev.some(cat => cat.name === category.name);
      if (isSelected) {
        return prev.filter(cat => cat.name !== category.name);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם ללוח');
      return;
    }

    if (!selectedBoardType) {
      Alert.alert('שגיאה', 'נא לבחור סוג לוח');
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert('שגיאה', 'נא לבחור לפחות קטגוריה אחת');
      return;
    }

    setIsCreating(true);
    const boardData = {
      name: newBoardName.trim(),
      description: newBoardDescription.trim(),
      currency: 'ILS',
      timezone: 'Asia/Jerusalem',
      board_type: selectedBoardType.id,
      custom_categories: selectedCategories,
    };
    
    const result = await createBoard(boardData);
    setIsCreating(false);

    if (result.success) {
      setShowCreateWizard(false);
      setShowBoardModal(false);
      resetWizard();
      
      // Wait 300ms and then refresh board data to ensure categories are updated
      setTimeout(async () => {
        try {
          console.log('🔄 App: Refreshing board data after board creation...');
          if (refreshBoardData) {
            await refreshBoardData();
            console.log('✅ App: Board data refreshed successfully');
          }
          
          // Also refresh the expense context categories (for quick categories)
          if (refreshBoardCategories) {
            await refreshBoardCategories();
            console.log('✅ App: Expense categories refreshed successfully');
          }
        } catch (error) {
          console.error('❌ App: Error refreshing board data:', error);
        }
      }, 300);
    } else {
      Alert.alert('שגיאה', result.error || 'שגיאה ביצירת לוח');
    }
  };

  const nextStep = () => {
    if (wizardStep === 1) {
      if (!newBoardName.trim()) {
        Alert.alert('שגיאה', 'נא להזין שם ללוח');
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!selectedBoardType) {
        Alert.alert('שגיאה', 'נא לבחור סוג לוח');
        return;
      }
      setWizardStep(3);
    }
  };

  const previousStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const renderBoardItem = ({ item }: { item: Board }) => (
    <View style={[
      styles.boardSwitcherItem,
      selectedBoard?.id === item.id && styles.selectedBoardSwitcherItem,
    ]}>
      <TouchableOpacity
        style={styles.boardSwitcherItemContent}
        onPress={() => handleBoardSelect(item)}
      >
        <View style={styles.boardSwitcherTextContainer}>
          <View style={styles.boardSwitcherNameRow}>
            <Text style={styles.boardSwitcherName}>{item.name}</Text>
          </View>
          <Text style={styles.boardSwitcherRole}>{item.user_role}</Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.boardActionsContainer}>
        <TouchableOpacity
          style={styles.defaultBoardButton}
          onPress={() => {
            if (item.is_default_board) {
              handleClearDefaultBoard();
            } else {
              handleSetDefaultBoard(item);
            }
          }}
        >
          <Text style={[
            styles.defaultBoardIcon,
            item.is_default_board && styles.defaultBoardIconActive
          ]}>
            {item.is_default_board ? '⭐' : '☆'}
          </Text>
        </TouchableOpacity>
        
        {item.user_role === 'owner' && (
          <TouchableOpacity
            style={styles.deleteBoardButton}
            onPress={() => handleDeleteBoard(item)}
          >
            <Text style={styles.deleteBoardIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderBoardTypeItem = ({ item }: { item: BoardType }) => (
    <TouchableOpacity
      style={[
        styles.boardTypeItem,
        selectedBoardType?.id === item.id && styles.selectedBoardTypeItem,
      ]}
      onPress={() => handleBoardTypeSelect(item)}
    >
      <Text style={styles.boardTypeIcon}>{item.icon}</Text>
      <Text style={styles.boardTypeName}>{item.name}</Text>
      <Text style={styles.boardTypeDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }: { item: QuickCategory }) => {
    const isSelected = selectedCategories.some(cat => cat.name === item.name);
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.selectedCategoryItem,
        ]}
        onPress={() => handleCategoryToggle(item)}
      >
        <Text style={styles.categoryIcon}>{item.icon}</Text>
        <Text style={[
          styles.categoryName,
          isSelected && styles.selectedCategoryName
        ]}>{item.name}</Text>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  const renderWizardStep1 = () => (
    <View style={styles.wizardContent}>
      <Text style={styles.wizardTitle}>שלב 1: פרטי הלוח</Text>
      
      <TextInput
        style={styles.boardSwitcherModalInput}
        placeholder="שם הלוח"
        value={newBoardName}
        onChangeText={setNewBoardName}
        textAlign="right"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
      
      <TextInput
        style={styles.boardSwitcherModalInput}
        placeholder="תיאור (אופציונלי)"
        value={newBoardDescription}
        onChangeText={setNewBoardDescription}
        multiline
        numberOfLines={3}
        textAlign="right"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        blurOnSubmit={true}
      />
    </View>
  );

  const renderWizardStep2 = () => (
    <View style={styles.wizardContent}>
      <Text style={styles.wizardTitle}>שלב 2: בחר סוג לוח</Text>
      
      <FlatList
        data={BOARD_TYPES}
        renderItem={renderBoardTypeItem}
        keyExtractor={(item) => item.id}
        style={styles.boardTypeList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const renderWizardStep3 = () => {
    // Get all available categories (current board type first, then all others)
    const getAllAvailableCategories = () => {
      if (!selectedBoardType) return [];
      
      const allCategories: QuickCategory[] = [];
      const addedNames = new Set<string>();
      
      // First: Add categories from selected board type (priority)
      selectedBoardType.quickCategories.forEach(category => {
        if (!addedNames.has(category.name)) {
          allCategories.push(category);
          addedNames.add(category.name);
        }
      });
      
      // Second: Add categories from all other board types
      BOARD_TYPES.forEach(boardType => {
        if (boardType.id !== selectedBoardType.id) {
          boardType.quickCategories.forEach(category => {
            if (!addedNames.has(category.name)) {
              allCategories.push(category);
              addedNames.add(category.name);
            }
          });
        }
      });
      
      // Third: Add additional common/useful categories
      const additionalCategories = [
        { name: 'תחזוקה', icon: '🔧', color: '#FF8C00' },
        { name: 'ביטוח', icon: '🛡️', color: '#F7DC6F' },
        { name: 'מיסים', icon: '📋', color: '#95A5A6' },
        { name: 'תרומות', icon: '💝', color: '#FF69B4' },
        { name: 'חיות מחמד', icon: '🐕', color: '#98D8C8' },
        { name: 'טכנולוגיה', icon: '📱', color: '#4ECDC4' },
        { name: 'ספרים', icon: '📚', color: '#E74C3C' },
        { name: 'מתנות', icon: '🎁', color: '#9B59B6' },
        { name: 'עבודה', icon: '💼', color: '#3498DB' },
        { name: 'חינוך', icon: '🎓', color: '#E67E22' },
        { name: 'בריאות', icon: '🏥', color: '#E74C3C' },
        { name: 'ספורט', icon: '⚽', color: '#2ECC71' },
        { name: 'נסיעות', icon: '✈️', color: '#9B59B6' },
        { name: 'תחביבים', icon: '🎨', color: '#F39C12' },
        { name: 'קניות', icon: '🛒', color: '#8E44AD' },
        { name: 'תקשורת', icon: '📞', color: '#34495E' },
        { name: 'משפט', icon: '⚖️', color: '#2C3E50' },
        { name: 'יופי', icon: '💄', color: '#EC7063' },
        { name: 'משחקים', icon: '🎮', color: '#AF7AC5' },
        { name: 'אירועים', icon: '🎉', color: '#F1C40F' },
      ];
      
      additionalCategories.forEach(category => {
        if (!addedNames.has(category.name)) {
          allCategories.push(category);
          addedNames.add(category.name);
        }
      });
      
      return allCategories;
    };

    return (
      <View style={styles.wizardContent}>
        <Text style={styles.wizardTitle}>שלב 3: בחר קטגוריות</Text>
        
        {selectedBoardType && (
          <Text style={styles.wizardSubtitle}>
            קטגוריות עבור לוח "{selectedBoardType.name}"
          </Text>
        )}
        
        <Text style={styles.selectedCountText}>
          נבחרו: {selectedCategories.length} קטגוריות
        </Text>
        
        <Text style={styles.wizardHelpText}>
          הקטגוריות של סוג הלוח נבחרו אוטומטיית. למעלה: קטגוריות מתאימות לסוג הלוח. למטה: כל הקטגוריות הזמינות.
        </Text>
        
        <FlatList
          data={getAllAvailableCategories()}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.name}
          style={styles.categoriesList}
          numColumns={2}
          columnWrapperStyle={styles.categoriesRow}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const renderCreateWizard = () => (
    <Modal
      visible={showCreateWizard}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowCreateWizard(false);
        resetWizard();
      }}
    >
      <View style={styles.boardSwitcherModalOverlay}>
        <View style={styles.wizardModalContent}>
          <View style={styles.wizardHeader}>
            <Text style={styles.boardSwitcherModalTitle}>צור לוח חדש</Text>
            <View style={styles.wizardSteps}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.wizardStepIndicator,
                    wizardStep >= step && styles.wizardStepActive,
                  ]}
                >
                  <Text style={[
                    styles.wizardStepNumber,
                    wizardStep >= step && styles.wizardStepNumberActive,
                  ]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {wizardStep === 1 && renderWizardStep1()}
          {wizardStep === 2 && renderWizardStep2()}
          {wizardStep === 3 && renderWizardStep3()}
          
          <View style={styles.wizardButtons}>
            {wizardStep > 1 && (
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCancelButton]}
                onPress={previousStep}
              >
                <Text style={styles.boardSwitcherCancelText}>חזור</Text>
              </TouchableOpacity>
            )}
            
            {wizardStep < 3 ? (
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCreateButton]}
                onPress={nextStep}
              >
                <Text style={styles.boardSwitcherCreateText}>המשך</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCreateButton]}
                onPress={handleCreateBoard}
                disabled={isCreating || selectedCategories.length === 0}
              >
                <Text style={styles.boardSwitcherCreateText}>
                  {isCreating ? 'יוצר...' : 'צור לוח'}
                </Text>
              </TouchableOpacity>
            )}
            
            {wizardStep === 1 && (
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCancelButton]}
                onPress={() => {
                  setShowCreateWizard(false);
                  resetWizard();
                }}
              >
                <Text style={styles.boardSwitcherCancelText}>ביטול</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCategoryModal = () => null; // Old modal is replaced by wizard
  
  const renderCreateModal = () => null; // Old modal is replaced by wizard

  return (
    <View style={styles.boardSwitcherContainer}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.boardSwitcherIconButton}
          onPress={() => setShowBoardModal(true)}
        >
          <Text style={styles.boardSwitcherIcon}>📊</Text>
          {boards.length > 1 && (
            <View style={styles.boardSwitcherBadge}>
              <Text style={styles.boardSwitcherBadgeText}>{boards.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.currentBoardContainer}>
          <Text style={styles.currentBoardName}>
            {selectedBoard ? selectedBoard.name : 'אין לוח נבחר'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notificationIconButton}
          onPress={() => setShowNotificationModal(true)}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showBoardModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBoardModal(false)}
      >
        <View style={styles.boardSwitcherModalOverlay}>
          <View style={styles.boardSwitcherModalContent}>
            <Text style={styles.boardSwitcherModalTitle}>בחר לוח</Text>
            
            <FlatList
              data={boards}
              renderItem={renderBoardItem}
              keyExtractor={(item) => item.id}
              style={styles.boardSwitcherList}
            />
            
            <View style={styles.boardHelpContainer}>
              <Text style={styles.boardHelpText}>
                לברירת מחדל לחץ על ⭐ | למחיקה לחץ על 🗑️
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.boardSwitcherCreateNewButton}
              onPress={() => {
                setShowBoardModal(false);
                setShowCreateWizard(true);
              }}
            >
              <Text style={styles.boardSwitcherCreateNewText}>+ צור לוח חדש</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.boardSwitcherCancelButton}
              onPress={() => setShowBoardModal(false)}
            >
              <Text style={styles.boardSwitcherCancelText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderCreateWizard()}
      
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </View>
  );
}

function TabNavigatorWithTutorial({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const { setCurrentScreen } = useTutorial();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <BoardSwitcherHeader />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'בית',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>🏠</Text>
            ),
          }}
          listeners={{
            focus: () => {
              setCurrentScreen('Home');
              setActiveTab('Home');
            },
          }}
        />
        <Tab.Screen 
          name="Summary" 
          component={SummaryScreen}
          options={{
            tabBarLabel: 'סיכום',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>📊</Text>
            ),
          }}
          listeners={{
            focus: () => {
              setCurrentScreen('Summary');
              setActiveTab('Summary');
            },
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            tabBarLabel: 'הגדרות',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>⚙️</Text>
            ),
          }}
          listeners={{
            focus: () => {
              setCurrentScreen('Settings');
              setActiveTab('Settings');
            },
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { selectedBoard } = useBoard();
  const { showTutorial, currentScreen, completeTutorial, setCurrentScreen } = useTutorial();
  const [activeTab, setActiveTab] = React.useState('Home');

  console.log('🔍 AppContent - Auth status:', { isAuthenticated, isLoading, selectedBoard });
  console.log('🔍 AppContent - User object:', user);

  // Note: Tutorial screen setting is now handled by individual screens
  // to avoid overriding specific screen tutorial contexts

  // Handle tutorial navigation - simplified to just update screen
  const handleTutorialNavigation = (screen: string) => {
    console.log('🎓 AppContent: Tutorial navigation to:', screen);
    
    // Handle special navigation cases
    if (screen === 'Summary') {
      console.log('🎓 AppContent: Switching to Summary tab');
      setActiveTab('Summary');
      setCurrentScreen('Summary');
      
      // Clear Summary tutorial completion so it can start automatically
      setTimeout(async () => {
        try {
          const AsyncStorage = await import('@react-native-async-storage/async-storage');
          await AsyncStorage.default.removeItem('tutorial_completed_Summary');
          console.log('🎓 AppContent: Cleared Summary tutorial completion');
        } catch (error) {
          console.error('Error clearing Summary tutorial:', error);
        }
      }, 100);
    } else {
      // Just update the tutorial screen
      setCurrentScreen(screen);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !selectedBoard ? (
          <Stack.Screen name="BoardSelection" component={BoardSelectionScreen} />
        ) : (
          <>
            <Stack.Screen name="Main">
              {() => <TabNavigatorWithTutorial activeTab={activeTab} setActiveTab={setActiveTab} />}
            </Stack.Screen>
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
          </>
        )}
      </Stack.Navigator>
      
      {/* Tutorial Modal */}
      <AppTutorial
        isVisible={showTutorial}
        onComplete={completeTutorial}
        currentScreen={currentScreen}
        onNavigateToScreen={handleTutorialNavigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  boardSwitcherContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  boardSwitcherIconButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  boardSwitcherIcon: {
    fontSize: 18,
    color: '#2c3e50',
  },
  boardSwitcherBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 16,
    alignItems: 'center',
  },
  boardSwitcherBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationIconButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notificationIcon: {
    fontSize: 18,
    color: '#2c3e50',
  },
  notificationBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 16,
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  boardSwitcherModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardSwitcherModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  boardSwitcherModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  boardSwitcherList: {
    maxHeight: 300,
  },
  boardSwitcherItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedBoardSwitcherItem: {
    backgroundColor: '#ebf3fd',
  },
  boardSwitcherItemContent: {
    flex: 1,
  },
  boardSwitcherTextContainer: {
    flex: 1,
  },
  boardSwitcherNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  boardSwitcherName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  boardSwitcherRole: {
    fontSize: 12,
    color: '#3498db',
    backgroundColor: '#ebf3fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  boardActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  defaultBoardButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultBoardIcon: {
    fontSize: 24,
    color: '#bdc3c7',
  },
  defaultBoardIconActive: {
    color: '#f39c12',
  },
  deleteBoardButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBoardIcon: {
    fontSize: 18,
    color: '#e74c3c',
  },
  boardSwitcherCancelButton: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  boardSwitcherCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardSwitcherCreateNewButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  boardSwitcherCreateNewText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardSwitcherModalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  boardSwitcherModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  boardSwitcherModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  boardSwitcherCreateButton: {
    backgroundColor: '#2ecc71',
  },
  boardSwitcherCreateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    height: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  boardTypeList: {
    maxHeight: 100,
  },
  boardTypeItem: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginRight: 8,
  },
  selectedBoardTypeItem: {
    backgroundColor: '#ebf3fd',
  },
  boardTypeIcon: {
    fontSize: 20,
    color: '#2c3e50',
  },
  boardTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  boardTypeDescription: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  currentBoardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  currentBoardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  boardHelpContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  boardHelpText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
  categoriesList: {
    maxHeight: 200,
    marginTop: 10,
  },
  categoriesRow: {
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryItem: {
    backgroundColor: '#ebf3fd',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  selectedCategoryName: {
    color: '#2ecc71',
  },
  checkmark: {
    fontSize: 20,
    marginLeft: 10,
    color: '#2ecc71',
  },
  selectedCountText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  wizardModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  wizardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wizardSteps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  wizardStepIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardStepActive: {
    borderColor: '#2ecc71',
  },
  wizardStepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e0e0e0',
  },
  wizardStepNumberActive: {
    color: '#2ecc71',
  },
  wizardContent: {
    marginBottom: 20,
  },
  wizardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  wizardSubtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 10,
  },
  wizardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  wizardHelpText: {
    fontSize: 12,
    color: '#777',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default function App() {
  return (
    <AuthProvider>
      <BoardProvider>
        <ExpenseProvider>
          <NotificationProvider>
            <TutorialProvider>
              <NavigationContainer>
                <AppContent />
              </NavigationContainer>
            </TutorialProvider>
          </NotificationProvider>
        </ExpenseProvider>
      </BoardProvider>
    </AuthProvider>
  );
} 