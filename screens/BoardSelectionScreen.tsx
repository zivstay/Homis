import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { BOARD_TYPES, BoardType } from '../constants/boardTypes';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { Board } from '../services/api';

const BoardSelectionScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { boards, selectedBoard, selectBoard, createBoard, isLoading } = useBoard();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<BoardType>(BOARD_TYPES[0]);
  const [isCreating, setIsCreating] = useState(false);

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
      setNewBoardName('');
      setNewBoardDescription('');
      setSelectedBoardType(BOARD_TYPES[0]);
    } else {
      Alert.alert('שגיאה', result.error || 'שגיאה ביצירת לוח');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'התנתק', style: 'destructive', onPress: logout },
      ]
    );
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
      
      <View style={styles.boardTypeContainer}>
        <Text style={styles.boardTypeText}>
          {BOARD_TYPES.find(type => type.id === item.board_type)?.name || 'כללי'}
        </Text>
      </View>
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
      <Text style={styles.boardTypeDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>צור לוח חדש</Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="שם הלוח"
            value={newBoardName}
            onChangeText={setNewBoardName}
            textAlign="right"
          />
          
          <TextInput
            style={styles.modalInput}
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
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton]}
              onPress={handleCreateBoard}
              disabled={isCreating}
            >
              <Text style={styles.createButtonText}>
                {isCreating ? 'יוצר...' : 'צור'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
            onPress={() => setShowCreateModal(true)}
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
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createButtonText}>+ צור לוח חדש</Text>
          </TouchableOpacity>
        </>
      )}

      {renderCreateModal()}
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
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
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