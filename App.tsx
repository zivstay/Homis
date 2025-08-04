import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppTutorial from './components/AppTutorial';
import NotificationModal from './components/NotificationModal';
import { BOARD_TYPES, BoardType } from './constants/boardTypes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BoardProvider, useBoard } from './contexts/BoardContext';
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
  const { boards, selectedBoard, selectBoard, createBoard, setDefaultBoard, clearDefaultBoard, deleteBoard } = useBoard();
  const { unreadCount } = useNotifications();
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType>(BOARD_TYPES[0]);
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

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם ללוח');
      return;
    }

    setIsCreating(true);
    const result = await createBoard({
      name: newBoardName.trim(),
      description: newBoardDescription.trim(),
      currency: 'ILS',
      timezone: 'Asia/Jerusalem',
      board_type: selectedBoardType.id,
    });
    setIsCreating(false);

    if (result.success) {
      setShowCreateModal(false);
      setShowBoardModal(false);
      setNewBoardName('');
      setNewBoardDescription('');
      setSelectedBoardType(BOARD_TYPES[0]);
    } else {
      Alert.alert('שגיאה', result.error || 'שגיאה ביצירת לוח');
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
        selectedBoardType.id === item.id && styles.selectedBoardTypeItem,
      ]}
      onPress={() => setSelectedBoardType(item)}
    >
      <Text style={styles.boardTypeIcon}>{item.icon}</Text>
      <Text style={styles.boardTypeName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.boardSwitcherModalOverlay}>
        <View style={styles.boardSwitcherModalContent}>
          <Text style={styles.boardSwitcherModalTitle}>צור לוח חדש</Text>
          
          <TextInput
            style={styles.boardSwitcherModalInput}
            placeholder="שם הלוח"
            value={newBoardName}
            onChangeText={setNewBoardName}
            textAlign="right"
          />
          
          <TextInput
            style={styles.boardSwitcherModalInput}
            placeholder="תיאור (אופציונלי)"
            value={newBoardDescription}
            onChangeText={setNewBoardDescription}
            multiline
            numberOfLines={3}
            textAlign="right"
          />
          
          <Text style={styles.sectionTitle}>סוג הלוח</Text>
          <FlatList
            data={BOARD_TYPES}
            renderItem={renderBoardTypeItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.boardTypeList}
          />
          
          <View style={styles.boardSwitcherModalButtons}>
            <TouchableOpacity
              style={[styles.boardSwitcherModalButton, styles.boardSwitcherCancelButton]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.boardSwitcherCancelText}>ביטול</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.boardSwitcherModalButton, styles.boardSwitcherCreateButton]}
              onPress={handleCreateBoard}
              disabled={isCreating}
            >
              <Text style={styles.boardSwitcherCreateText}>
                {isCreating ? 'יוצר...' : 'צור'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
                setShowCreateModal(true);
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

      {renderCreateModal()}
      
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
    padding: 12,
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
});

export default function App() {
  return (
    <AuthProvider>
      <BoardProvider>
        <NotificationProvider>
          <TutorialProvider>
            <NavigationContainer>
              <AppContent />
            </NavigationContainer>
          </TutorialProvider>
        </NotificationProvider>
      </BoardProvider>
    </AuthProvider>
  );
} 