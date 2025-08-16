import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CreateBoardWizard from '../components/CreateBoardWizard';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { useTutorial } from '../contexts/TutorialContext';
import { Board } from '../services/api';

const BoardSelectionScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { boards, selectedBoard, selectBoard, createBoard, refreshBoards, isLoading } = useBoard();
  const { setCurrentScreen, checkScreenTutorial, startTutorial } = useTutorial();
  
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  // Update tutorial context when this screen is focused
  useEffect(() => {
    console.log('🎓 BoardSelectionScreen: Setting tutorial screen to BoardSelection');
    setCurrentScreen('BoardSelection');
    
    // Check if we should show tutorial for this screen
    const checkAndStartTutorial = async () => {
      try {
        console.log('🎓 BoardSelectionScreen: About to check tutorial for BoardSelection screen');
        const shouldShow = await checkScreenTutorial('BoardSelection');
        console.log('🎓 BoardSelectionScreen: checkScreenTutorial returned:', shouldShow);
        
        if (shouldShow) {
          console.log('🎓 BoardSelectionScreen: Starting tutorial now');
          startTutorial();
        } else {
          console.log('🎓 BoardSelectionScreen: Not starting tutorial - already completed or error');
        }
      } catch (error) {
        console.error('🎓 BoardSelectionScreen: Error in checkAndStartTutorial:', error);
      }
    };
    
    // Add a small delay to let the screen settle
    setTimeout(() => {
      checkAndStartTutorial();
    }, 500);
  }, [setCurrentScreen, checkScreenTutorial, startTutorial]);

  const [pendingBoardSelection, setPendingBoardSelection] = useState<string | null>(null);

  // Effect to automatically select a board when it's added to the list
  useEffect(() => {
    if (pendingBoardSelection && boards.length > 0) {
      const boardToSelect = boards.find((board: any) => board.name === pendingBoardSelection);
      if (boardToSelect) {
        console.log('🎯 BoardSelectionScreen: Auto-selecting newly created board:', boardToSelect.name);
        selectBoard(boardToSelect);
        setPendingBoardSelection(null);
      }
    }
  }, [boards, pendingBoardSelection, selectBoard]);

  const handleBoardCreated = async (newBoard?: any) => {
    // Refresh boards after creation
    if (refreshBoards) {
      await refreshBoards();
      
      // If we have a new board, set it for pending selection
      if (newBoard && newBoard.name) {
        setPendingBoardSelection(newBoard.name);
      }
    }
  };

  const handleLogout = () => {
    // Simple logout without confirmation for now
    logout();
  };

  const renderBoardItem = ({ item }: { item: Board }) => (
    <TouchableOpacity
      style={[
        styles.boardItem,
        selectedBoard?.id === item.id && styles.selectedBoardItem,
      ]}
      onPress={() => selectBoard(item)}
    >
      <View style={styles.boardHeader}>
        <Text style={styles.boardName}>{item.name}</Text>
        <Text style={styles.boardRole}>{item.user_role}</Text>
      </View>
      
      {item.description && (
        <Text style={styles.boardDescription}>{item.description}</Text>
      )}
      
      <View style={styles.boardFooter}>
        <Text style={styles.boardCurrency}>{item.currency}</Text>
        <Text style={styles.boardMembers}>
          {item.member_count || 0} חברים
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>שלום, {user?.first_name}!</Text>
          <Text style={styles.subtitleText}>בחר לוח או צור חדש</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>התנתק</Text>
        </TouchableOpacity>
      </View>

      {boards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>אין לך לוחות עדיין</Text>
          <Text style={styles.emptyStateSubtitle}>
            צור לוח ראשון כדי להתחיל לנהל הוצאות משותפות
          </Text>
          <TouchableOpacity
            style={styles.createFirstButton}
            onPress={() => setShowCreateWizard(true)}
          >
            <Text style={styles.createFirstButtonText}>צור לוח ראשון</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={boards}
            renderItem={renderBoardItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.boardList}
            showsVerticalScrollIndicator={false}
          />
          
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateWizard(true)}
          >
            <Text style={styles.createButtonText}>+ צור לוח חדש</Text>
          </TouchableOpacity>
        </>
      )}

      <CreateBoardWizard
        isVisible={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onBoardCreated={handleBoardCreated}
        createBoard={createBoard}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subtitleText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createFirstButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boardList: {
    padding: 20,
  },
  boardItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedBoardItem: {
    borderWidth: 2,
    borderColor: '#3498db',
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  boardRole: {
    fontSize: 12,
    color: '#3498db',
    backgroundColor: '#ebf3fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  boardDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 20,
  },
  boardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boardCurrency: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  boardMembers: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  boardTypeContainer: {
    alignSelf: 'flex-start',
  },
  boardTypeText: {
    fontSize: 12,
    color: '#95a5a6',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  createButton: {
    backgroundColor: '#3498db',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  boardTypeList: {
    marginBottom: 20,
  },
  boardTypeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBoardTypeItem: {
    borderColor: '#3498db',
    backgroundColor: '#ebf3fd',
  },
  boardTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  boardTypeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  boardTypeDescription: {
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BoardSelectionScreen; 