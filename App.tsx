import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppTutorial from './components/AppTutorial';
import CreateBoardWizard from './components/CreateBoardWizard';
import GuestDisclaimer from './components/GuestDisclaimer';
import NotificationModal from './components/NotificationModal';
import TermsAndConditionsModal from './components/TermsAndConditionsModal';
import { API_CONFIG } from './config/api';
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
import { Board, apiService } from './services/api';
import EngagementTracker from './services/engagementTracker';
import NotificationService from './services/notificationService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function BoardSwitcherHeader() {
  const { boards, selectedBoard, selectBoard, createBoard, setDefaultBoard, clearDefaultBoard, deleteBoard, refreshBoardData } = useBoard();
  const { unreadCount } = useNotifications();
  const { refreshBoardCategories } = useExpenses();
  const { isGuestMode, logout } = useAuth();
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const insets = useSafeAreaInsets();
  const handleBoardSelect = async (board: Board) => {
    // מחליפים לוח ישירות ללא פרסומת
    console.log('🎯 Board Switch: Switching board without ad');
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

  const handleBoardCreated = async (newBoard?: any) => {
    // Close the create wizard
    setShowCreateWizard(false);
    setShowBoardModal(false);
    
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
      
      // Auto-select the newly created board after data is refreshed
      if (newBoard && selectBoard) {
        console.log('🎯 App: Auto-selecting newly created board:', newBoard.name);
        selectBoard(newBoard);
      }
    } catch (error) {
      console.error('❌ App: Error refreshing board data:', error);
      
      // Even if refresh fails, still select the board
      if (newBoard && selectBoard) {
        console.log('🎯 App: Auto-selecting newly created board (after error):', newBoard.name);
        selectBoard(newBoard);
      }
    }
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








  // Calculate padding based on platform
  const getTopPadding = () => {
    if (Platform.OS === 'ios') {
      // On iOS, SafeAreaView already handles safe area, just use minimal padding
      return 12;
    } else {
      // On Android, add safe area padding for status bar
      return insets.top + 12;
    }
  };

  return (
    <View style={[styles.boardSwitcherContainer, { paddingTop: getTopPadding() }]}>
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
                style={[
                  styles.boardSwitcherModalButton, 
                  styles.boardSwitcherCreateNewButton,
                  { opacity: isGuestMode ? 0.5 : 1 }
                ]}
                onPress={() => {
                  if (isGuestMode) {
                    Alert.alert(
                      'פונקציה למשתמשים רשומים- ההרשמה חינם',
                      'כדי ליצור לוחות נוספים, יש להתחבר בחינם עם חשבון משתמש.\n\nהתחבר או הירשם כדי לקבל גישה לכל הפונקציות!',
                      [
                        { text: 'אולי מאוחר יותר', style: 'cancel' },
                        { 
                          text: 'התחבר עכשיו בחינם!', 
                          onPress: () => {
                            setShowBoardModal(false);
                            logout();
                          }
                        }
                      ]
                    );
                  } else {
                    setShowBoardModal(false);
                    setShowCreateWizard(true);
                  }
                }}
              >
                <Text style={styles.boardSwitcherCreateNewText}>
                  + צור לוח חדש {isGuestMode ? '🔒' : ''}
                </Text>
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

      <CreateBoardWizard
        isVisible={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onBoardCreated={handleBoardCreated}
        createBoard={createBoard}
      />
      
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </View>
  );
}

function TabNavigatorWithTutorial({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const { setCurrentScreen } = useTutorial();
  const { isGuestMode, logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <BoardSwitcherHeader />
      <GuestDisclaimer />
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
            tabBarLabel: ({ color }) => (
              <View style={{ opacity: isGuestMode ? 0.5 : 1, alignItems: 'center' }}>
                <Text style={{ color, fontSize: 12 }}>
                  סיכום {isGuestMode ? '🔒' : ''}
                </Text>
              </View>
            ),
            tabBarIcon: ({ color, size }) => (
              <View style={{ opacity: isGuestMode ? 0.5 : 1 }}>
                <Text style={{ color, fontSize: size }}>📊</Text>
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (isGuestMode) {
                e.preventDefault();
                Alert.alert(
                  'פונקציה למשתמשים רשומים- ההרשמה חינם',
                  'כדי לגשת לסיכומים מתקדמים, יש להתחבר חינם עם חשבון משתמש.\n\nהתחבר או הירשם כדי לקבל גישה לכל הפונקציות!',
                  [
                    { text: 'אולי מאוחר יותר', style: 'cancel' },
                    { 
                      text: ' התחבר עכשיו בחינם!', 
                      onPress: () => {
                        logout();
                      }
                    }
                  ]
                );
              } else {
                setCurrentScreen('Summary');
                setActiveTab('Summary');
              }
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
  const { isAuthenticated, isLoading, user, logout, isGuestMode } = useAuth();
  const { selectedBoard, boards } = useBoard();
  const { showTutorial, currentScreen, completeTutorial, setCurrentScreen } = useTutorial();
  const [activeTab, setActiveTab] = React.useState('Home');
  
  // Terms and conditions modal
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [requireTermsAcceptance, setRequireTermsAcceptance] = useState(false);
  const [termsCheckCompleted, setTermsCheckCompleted] = useState(false);

  // Initialize notification service (only once on app start)
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        
        // Request permissions
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          console.log('✅ Notification permissions granted');
          
          // ⚙️ CONFIGURATION: Switch between TEST MODE and PRODUCTION MODE
          const TEST_MODE = false; // Set to false for production
          
          if (TEST_MODE) {
            // 🧪 TEST MODE: Show all notification types 1 minute apart
            await notificationService.scheduleTestMode();
            console.log('🧪 TEST MODE: All notifications will appear starting in 1 minute');
          } else {
            // 📅 PRODUCTION MODE: Refresh notifications (clear old + schedule new for 8 weeks)
            await notificationService.refreshNotifications();
            console.log('📅 Notifications refreshed - scheduled for next 8 weeks');
            
            // 🔍 DEBUG: Show all scheduled notifications
            await notificationService.debugScheduledNotifications();
            
            // 🔍 DEBUG: Check all weekly notifications status
            const allNotificationsStatus = notificationService.checkAllWeeklyNotificationsStatus();
            console.log(`📅 All Weekly Notifications Status:`, allNotificationsStatus);
            
            // Show detailed status for each day
            if (allNotificationsStatus.sunday.isToday) {
              if (allNotificationsStatus.sunday.timePassed) {
                console.log('⚠️ Today is Sunday but 12:00 has already passed');
              } else {
                console.log(`✅ Today is Sunday, notification will appear in ${allNotificationsStatus.sunday.minutesUntil} minutes`);
              }
            }
            
            if (allNotificationsStatus.wednesday.isToday) {
              if (allNotificationsStatus.wednesday.timePassed) {
                console.log('⚠️ Today is Wednesday but 19:00 has already passed');
              } else {
                console.log(`✅ Today is Wednesday, notification will appear in ${allNotificationsStatus.wednesday.minutesUntil} minutes`);
              }
            }
            
            if (allNotificationsStatus.saturday.isToday) {
              if (allNotificationsStatus.saturday.timePassed) {
                console.log('⚠️ Today is Saturday but 18:00 has already passed');
              } else {
                console.log(`✅ Today is Saturday, notification will appear in ${allNotificationsStatus.saturday.minutesUntil} minutes`);
              }
            }
            
            // 🧪 DEBUG: Send immediate test notification to verify it works
            await notificationService.sendInstantTestNotification();
            console.log('🧪 Sent immediate test notification for verification');
          }
        } else {
          console.log('❌ Notification permissions denied');
        }
      } catch (error) {
        console.error('❌ Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, []); // Empty dependency array = runs only once on mount

  // Track app visits whenever user navigates or interacts with the app
  useEffect(() => {
    const recordVisitPeriodically = async () => {
      const engagementTracker = EngagementTracker.getInstance();
      await engagementTracker.recordVisit();
    };

    // Record visit every 30 minutes while app is active (changed from 1 minute for testing)
    const visitInterval = setInterval(recordVisitPeriodically, 30 * 60 * 1000);

    return () => {
      clearInterval(visitInterval);
    };
  }, [isAuthenticated]); // When user logs in

  console.log('🔍 AppContent - Auth status:', { isAuthenticated, isLoading, selectedBoard });
  console.log('🔍 AppContent - User object:', user);

  // Check terms acceptance after login
  const checkTermsAcceptance = useCallback(async () => {
    console.log('🔍 AppContent: Checking terms acceptance...');
    
    try {
      const authToken = apiService.getAccessToken();
      if (!authToken) {
        console.error('❌ AppContent: No auth token available for terms check');
        Alert.alert('שגיאה', 'שגיאה בקבלת פרטי המשתמש. אנא נסה שוב.');
        await apiService.logout();
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.TERMS_STATUS_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 AppContent: Terms status:', result);
        
        if (result.requires_acceptance) {
          console.log('⚠️ AppContent: User needs to accept new terms before proceeding');
          setRequireTermsAcceptance(true);
          setShowTermsModal(true);
        } else {
          console.log('✅ AppContent: User terms are up to date');
          setTermsCheckCompleted(true);
        }
      } else {
        console.error('❌ AppContent: Failed to check terms status:', response.status);
        Alert.alert(
          'שגיאה בבדיקת תנאי שימוש',
          'לא ניתן לאמת את סטטוס תנאי השימוש. אנא נסה שוב.',
          [
            {
              text: 'נסה שוב',
              onPress: () => checkTermsAcceptance()
            },
            {
              text: 'התנתק',
              style: 'destructive',
              onPress: async () => {
                await apiService.logout();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ AppContent: Error checking terms acceptance:', error);
      Alert.alert(
        'שגיאה בבדיקת תנאי שימוש',
        'שגיאת רשת בבדיקת תנאי השימוש. אנא בדוק את החיבור לאינטרנט.',
        [
          {
            text: 'נסה שוב',
            onPress: () => checkTermsAcceptance()
          },
          {
            text: 'התנתק',
            style: 'destructive',
            onPress: async () => {
              await apiService.logout();
            }
          }
        ]
      );
    }
  }, []);

  // Handle terms acceptance
  const handleTermsAccepted = () => {
    console.log('✅ AppContent: Terms accepted by user');
    setShowTermsModal(false);
    setRequireTermsAcceptance(false);
    setTermsCheckCompleted(true);
  };

  // Check terms when user is authenticated (but not for guest users)
  useEffect(() => {
    if (isAuthenticated && !isGuestMode && !termsCheckCompleted) {
      console.log('🔍 AppContent: User authenticated, checking terms...');
      // Add a small delay to ensure login process is complete
      setTimeout(() => {
        checkTermsAcceptance();
      }, 1000);
    } else if (isGuestMode) {
      // Skip terms check for guest users
      console.log('🔍 AppContent: Guest mode - skipping terms check');
      setTermsCheckCompleted(true);
    }
  }, [isAuthenticated, isGuestMode, termsCheckCompleted, checkTermsAcceptance]);

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
        ) : (
          <>
            <Stack.Screen name="Main">
              {() => <TabNavigatorWithTutorial activeTab={activeTab} setActiveTab={setActiveTab} />}
            </Stack.Screen>
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
            <Stack.Screen name="BoardSelection" component={BoardSelectionScreen} />
          </>
        )}
      </Stack.Navigator>
      
      {/* Tutorial Modal */}
      <AppTutorial
        isVisible={showTutorial}
        onComplete={completeTutorial}
        currentScreen={currentScreen}
        onNavigateToScreen={handleTutorialNavigation}
        hasSelectedBoard={!!selectedBoard}
        boardsCount={boards.length}
      />

      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        visible={showTermsModal}
        onClose={() => {
          // אם נדרש אישור תנאים - לא ניתן לסגור
          if (requireTermsAcceptance) {
            return;
          }
          setShowTermsModal(false);
        }}
        onAccept={requireTermsAcceptance ? handleTermsAccepted : undefined}
        requireAcceptance={requireTermsAcceptance}
        onDecline={() => {
          if (requireTermsAcceptance) {
            // אם נדרש אישור תנאים - מתנתקים
            Alert.alert(
              'התנאים לא התקבלו',
              'מכיוון שלא אישרת את תנאי השימוש, תתבצע התנתקות מהמערכת.',
              [
                {
                  text: 'הבנתי',
                  onPress: async () => {
                    setShowTermsModal(false);
                    setRequireTermsAcceptance(false);
                    setTermsCheckCompleted(false);
                    logout(); // השתמש ב-logout מה-AuthContext
                  }
                }
              ]
            );
          } else {
            setShowTermsModal(false);
            Alert.alert(
              'התנאים לא התקבלו',
              'אם אינך מסכים לתנאי השימוש, לא תוכל להשתמש באפליקציה. אנא שקול שוב את החלטתך.',
              [
                { text: 'הבנתי', style: 'default' }
              ]
            );
          }
        }}
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
    paddingBottom: 12,
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
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
} 