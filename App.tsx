import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
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
import { adManager } from './services/adManager';
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
  const [newBoardCurrency, setNewBoardCurrency] = useState('ILS');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<QuickCategory[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  useEffect(() => {
    console.log('🔄 App: Selected categories:', selectedCategories);
  }, [selectedCategories]);
  const handleBoardSelect = async (board: Board) => {
    // הצגת פרסומת אם מחליפים לוח אחר (לא אותו לוח)
    if (selectedBoard && selectedBoard.id !== board.id) {
      await adManager.showAdIfAllowed('board_switch');
    }
    
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
              
              // Check if the deleted board was the currently selected board
              if (selectedBoard && selectedBoard.id === board.id) {
                console.log('🗑️ App: Deleted board was the selected board, clearing selection');
                // Clear the selected board to trigger navigation to BoardSelectionScreen
                // The BoardContext will handle this automatically
              }
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
    setNewBoardCurrency('ILS');
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
        // Check if we're at the limit of 7 categories (excluding "אחר")
        const nonOtherCategories = prev.filter(cat => cat.name !== 'אחר');
        if (nonOtherCategories.length >= 7) {
          Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד. בטל בחירה של קטגוריה אחרת כדי להוסיף חדשה.');
          return prev;
        }
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

    if (selectedCategories.filter(cat => cat.name !== 'אחר').length === 0) {
      Alert.alert('שגיאה', 'נא לבחור לפחות קטגוריה אחת');
      return;
    }

    setIsCreating(true);
    const boardData = {
      name: newBoardName.trim(),
      description: newBoardDescription.trim(),
      currency: newBoardCurrency,
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
          
          // Auto-select the newly created board
          if (result.board && selectBoard) {
            console.log('🎯 App: Auto-selecting newly created board:', result.board.name);
            selectBoard(result.board);
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
    const nonOtherCategories = selectedCategories.filter(cat => cat.name !== 'אחר');
    const isDisabled = !isSelected && nonOtherCategories.length >= 7;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.selectedCategoryItem,
          isDisabled && styles.disabledCategoryItem,
        ]}
        onPress={() => {
          if (!isDisabled) {
            handleCategoryToggle(item);
          }
        }}
        disabled={isDisabled}
      >
        <Text style={[
          styles.categoryIcon,
          isDisabled && styles.disabledCategoryIcon
        ]}>
          {item.icon}
        </Text>
        <Text 
          style={[
            styles.categoryName,
            isSelected && styles.selectedCategoryName,
            isDisabled && styles.disabledCategoryName
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {item.name}
        </Text>
        
        {isSelected && (
          <Text style={styles.checkmark}>✓</Text>
        )}
        
        {isDisabled && (
          <Text style={styles.disabledIndicator}>🔒</Text>
        )}
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
      
      <Text style={styles.currencyLabel}>מטבע:</Text>
      <View style={styles.currencyContainer}>
        {[
          { code: 'ILS', symbol: '₪', name: 'שקל' },
          { code: 'USD', symbol: '$', name: 'דולר' },
          { code: 'EUR', symbol: '€', name: 'יורו' }
        ].map((currency) => (
          <TouchableOpacity
            key={currency.code}
            style={[
              styles.currencyOption,
              (newBoardCurrency === currency.code) && styles.selectedCurrencyOption
            ]}
            onPress={() => setNewBoardCurrency(currency.code)}
          >
            <Text style={[
              styles.currencySymbol,
              (newBoardCurrency === currency.code) && styles.selectedCurrencySymbol
            ]}>
              {currency.symbol}
            </Text>
            <Text style={[
              styles.currencyName,
              (newBoardCurrency === currency.code) && styles.selectedCurrencyName
            ]}>
              {currency.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
      
      // First: Add categories from selected board type (priority) - excluding "אחר"
      selectedBoardType.quickCategories.forEach(category => {
        if (!addedNames.has(category.name) && category.name !== 'אחר') {
          allCategories.push(category);
          addedNames.add(category.name);
        }
      });
      
      // Second: Add categories from all other board types - excluding "אחר"
      BOARD_TYPES.forEach(boardType => {
        if (boardType.id !== selectedBoardType.id) {
          boardType.quickCategories.forEach(category => {
            if (!addedNames.has(category.name) && category.name !== 'אחר') {
              allCategories.push(category);
              addedNames.add(category.name);
            }
          });
        }
      });
      
      // Third: Add additional common/useful categories (excluding "אחר")
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
        if (!addedNames.has(category.name) && category.name !== 'אחר') {
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
          נבחרו: {selectedCategories.filter(cat => cat.name !== 'אחר').length}/7 קטגוריות
        </Text>
        
        <Text style={styles.wizardHelpText}>
          הקטגוריות של סוג הלוח נבחרו אוטומטיית. בחר עד 7 קטגוריות נוספות.
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
            {/* Left button - Back or Cancel */}
            {wizardStep > 1 ? (
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCancelButton]}
                onPress={previousStep}
              >
                <Text style={styles.boardSwitcherCancelText}>חזור</Text>
              </TouchableOpacity>
            ) : (
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
            
            {/* Right button - Next or Create */}
            {wizardStep < 3 ? (
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCreateButton]}
                onPress={nextStep}
              >
                <Text style={styles.boardSwitcherCreateText}>המשך</Text>
              </TouchableOpacity>
            ) : (
                              <TouchableOpacity
                  style={[
                    styles.boardSwitcherModalButton, 
                    styles.boardSwitcherCreateButton,
                    (isCreating || selectedCategories.filter(cat => cat.name !== 'אחר').length === 0) && styles.disabledWizardButton
                  ]}
                  onPress={handleCreateBoard}
                  disabled={isCreating || selectedCategories.filter(cat => cat.name !== 'אחר').length === 0}
                >
                  <Text style={styles.boardSwitcherCreateText}>
                    {isCreating ? 'יוצר...' : 'צור לוח'}
                  </Text>
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
            
            <View style={styles.boardSwitcherModalButtons}>
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCreateNewButton]}
                onPress={() => {
                  setShowBoardModal(false);
                  setShowCreateWizard(true);
                }}
              >
                <Text style={styles.boardSwitcherCreateNewText}>+ צור לוח חדש</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.boardSwitcherModalButton, styles.boardSwitcherCancelButton]}
                onPress={() => setShowBoardModal(false)}
              >
                <Text style={styles.boardSwitcherCancelText}>סגור</Text>
              </TouchableOpacity>
            </View>
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

  // Clear tutorial reset pending flag when app starts
  React.useEffect(() => {
    const clearTutorialResetFlag = async () => {
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.removeItem('tutorial_reset_pending');
        console.log('🎓 AppContent: Cleared tutorial reset pending flag');
      } catch (error) {
        console.error('Error clearing tutorial reset flag:', error);
      }
    };
    
    clearTutorialResetFlag();
  }, []);

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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 24,
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
  },
  boardSwitcherCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardSwitcherCreateNewButton: {
    backgroundColor: '#2ecc71',
  },
  boardSwitcherCreateNewText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardSwitcherModalInput: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 18,
    backgroundColor: '#fafbfc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  boardSwitcherModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  boardSwitcherModalButton: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  boardSwitcherCreateButton: {
    backgroundColor: '#2ecc71',
  },
  boardSwitcherCreateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  boardTypeList: {
    maxHeight: 220,
  },
  boardTypeItem: {
    padding: 18,
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#fafbfc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedBoardTypeItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    shadowColor: '#2196f3',
    shadowOpacity: 0.2,
  },
  boardTypeIcon: {
    fontSize: 32,
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  boardTypeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 6,
  },
  boardTypeDescription: {
    fontSize: 15,
    color: '#7f8c8d',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
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
    maxHeight: 280,
    marginTop: 12,
  },
  categoriesRow: {
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginVertical: 6,
    backgroundColor: '#fafbfc',
    borderWidth: 2,
    borderColor: '#e0e6ed',
    width: '48%',
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCategoryItem: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOpacity: 0.2,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 6,
    minWidth: 22,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  selectedCategoryName: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  disabledCategoryItem: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
  },
  disabledCategoryIcon: {
    opacity: 0.5,
  },
  disabledCategoryName: {
    color: '#999',
  },
  checkmark: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledIndicator: {
    fontSize: 16,
    color: '#999',
    marginLeft: 8,
  },
  selectedCountText: {
    fontSize: 16,
    color: '#4caf50',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#e8f5e8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  wizardModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  wizardSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  wizardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  wizardHelpText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  disabledWizardButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.7,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'right',
  },
  currencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  currencyOption: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fafbfc',
    borderWidth: 2,
    borderColor: '#e0e6ed',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCurrencyOption: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOpacity: 0.2,
  },
  currencySymbol: {
    fontSize: 24,
    color: '#2c3e50',
    marginBottom: 6,
  },
  selectedCurrencySymbol: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  currencyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  selectedCurrencyName: {
    color: '#4caf50',
    fontWeight: 'bold',
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