import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BOARD_TYPES, BoardType } from './constants/boardTypes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BoardProvider, useBoard } from './contexts/BoardContext';
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
  const { boards, selectedBoard, selectBoard, createBoard } = useBoard();
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType>(BOARD_TYPES[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleBoardSelect = (board: Board) => {
    selectBoard(board);
    setShowBoardModal(false);
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
    <TouchableOpacity
      style={[
        styles.boardSwitcherItem,
        selectedBoard?.id === item.id && styles.selectedBoardSwitcherItem,
      ]}
      onPress={() => handleBoardSelect(item)}
    >
      <Text style={styles.boardSwitcherName}>{item.name}</Text>
      <Text style={styles.boardSwitcherRole}>{item.user_role}</Text>
    </TouchableOpacity>
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
              <Text style={styles.boardSwitcherCancelText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderCreateModal()}
    </View>
  );
}

function TabNavigator() {
  return (
    <View style={{ flex: 1 }}>
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
        />
      </Tab.Navigator>
    </View>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedBoard } = useBoard();

  console.log('🔍 AppContent - Auth status:', { isAuthenticated, isLoading, selectedBoard });

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
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
          </>
        )}
      </Stack.Navigator>
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
});

export default function App() {
  return (
    <AuthProvider>
      <BoardProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </BoardProvider>
    </AuthProvider>
  );
} 