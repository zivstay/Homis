import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CategoryManager from '../components/CategoryManager';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { useTutorial } from '../contexts/TutorialContext';
import { BoardMember } from '../services/api';

const SettingsScreen: React.FC = () => {
  const { selectedBoard, boardMembers, inviteMember, removeMember } = useBoard();
  const { user, logout } = useAuth();
  const { startTutorial, forceStartTutorial, resetTutorial, setCurrentScreen, checkScreenTutorial, clearAllTutorialData } = useTutorial();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Update tutorial context when this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎓 SettingsScreen: Setting tutorial screen to Settings');
      setCurrentScreen('Settings');
      
      // Check if we should show tutorial for this screen
      const checkAndStartTutorial = async () => {
        // Check if tutorial was just reset - if so, don't start it
        const tutorialResetPending = await AsyncStorage.getItem('tutorial_reset_pending');
        if (tutorialResetPending === 'true') {
          console.log('🎓 SettingsScreen: Tutorial was reset, not starting on this screen');
          return;
        }
        
        const shouldShow = await checkScreenTutorial('Settings');
        if (shouldShow) {
          console.log('🎓 SettingsScreen: Starting tutorial');
          startTutorial();
        }
      };
      
      checkAndStartTutorial();
    }, [setCurrentScreen, checkScreenTutorial, startTutorial])
  );

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('שגיאה', 'נא להזין כתובת אימייל');
      return;
    }

    setIsInviting(true);
    // Always invite as 'member' role
    const result = await inviteMember(inviteEmail.trim(), 'member');
    setIsInviting(false);

    if (result.success) {
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      Alert.alert('הצלחה', 'ההזמנה נשלחה בהצלחה');
    } else {
      Alert.alert('שגיאה', result.error || 'שגיאה בשליחת ההזמנה');
    }
  };

  const handleRemoveMember = (member: BoardMember) => {
    if (member.user_id === user?.id) {
      Alert.alert('שגיאה', 'לא ניתן להסיר את עצמך מהלוח');
      return;
    }

    Alert.alert(
      'הסר חבר',
      `האם אתה בטוח שברצונך להסיר את ${member.user.first_name} ${member.user.last_name} מהלוח?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הסר',
          style: 'destructive',
          onPress: async () => {
            const result = await removeMember(member.user_id);
            if (result.success) {
              Alert.alert('הצלחה', 'החבר הוסר מהלוח');
            } else {
              Alert.alert('שגיאה', result.error || 'שגיאה בהסרת החבר');
            }
          },
        },
      ]
    );
  };

  const handleRestartTutorial = () => {
    Alert.alert(
      'הפעלת מדריך מחדש',
      'האם ברצונך להפעיל מחדש את המדריך להכרת האפליקציה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, הפעל מדריך',
          onPress: () => {
            console.log('🎓 SettingsScreen: User requested to restart tutorial');
            forceStartTutorial();
          },
        },
      ]
    );
  };

  const handleResetTutorial = () => {
    Alert.alert(
      'איפוס מדריך',
      'פעולה זו תאפס את סטטוס המדריך ותציג אותו שוב בכניסה הבאה לאפליקציה. האם להמשיך?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, אפס מדריך',
          style: 'destructive',
          onPress: async () => {
            await resetTutorial();
            // Set a flag to prevent tutorial from starting on this screen after reset
            await AsyncStorage.setItem('tutorial_reset_pending', 'true');
            Alert.alert('הושלם', 'המדריך אופס בהצלחה. יופיע בכניסה הבאה לאפליקציה.');
          },
        },
      ]
    );
  };

  const handleClearAllTutorialData = () => {
    Alert.alert(
      'מחיקת כל נתוני המדריך',
      'פעולה זו תמחק לחלוטין את כל נתוני המדריך מהמכשיר. המדריך יופיע שוב בכל המסכים. האם להמשיך?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, מחק הכל',
          style: 'destructive',
          onPress: async () => {
            console.log('🎓 SettingsScreen: User requested to clear all tutorial data');
            await clearAllTutorialData();
            Alert.alert('הושלם', 'כל נתוני המדריך נמחקו. המדריך יופיע שוב בכל המסכים.');
          },
        },
      ]
    );
  };

  const handleSpecificTutorial = (screenName: string) => {
    Alert.alert(
      `מדריך ${screenName}`,
      `האם ברצונך להציג את המדריך עבור מסך ${screenName}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, הצג מדריך',
          onPress: () => {
            console.log(`🎓 SettingsScreen: Starting specific tutorial for ${screenName}`);
            setCurrentScreen(screenName);
            forceStartTutorial();
          },
        },
      ]
    );
  };

  const handleClearSpecificTutorial = (screenName: string) => {
    Alert.alert(
      `אפס מדריך ${screenName}`,
      `האם ברצונך לאפס את המדריך עבור מסך ${screenName}? המדריך יופיע שוב בפעם הבאה שתגיעו למסך.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן, אפס',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(`tutorial_completed_${screenName}`);
              Alert.alert('הושלם', `מדריך ${screenName} אופס בהצלחה`);
            } catch (error) {
              console.error('Error clearing specific tutorial:', error);
              Alert.alert('שגיאה', 'שגיאה באיפוס המדריך');
            }
          },
        },
      ]
    );
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner':
        return 'בעלים';
      case 'admin':
        return 'מנהל';
      case 'member':
        return 'חבר';
      case 'viewer':
        return 'צופה';
      default:
        return role;
    }
  };

  const canManageMembers = () => {
    if (!selectedBoard || !user) return false;
    const currentMember = boardMembers.find(m => m.user_id === user.id);
    return currentMember?.role === 'owner' || currentMember?.role === 'admin';
  };

  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  const renderBoardInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>מידע על הלוח</Text>
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>שם הלוח</Text>
          <Text style={styles.infoValue}>{selectedBoard?.name}</Text>
        </View>
        
        {selectedBoard?.description && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>תיאור</Text>
            <Text style={styles.infoValue}>{selectedBoard.description}</Text>
          </View>
        )}
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>מטבע</Text>
          <Text style={styles.infoValue}>{selectedBoard?.currency}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>אזור זמן</Text>
          <Text style={styles.infoValue}>{selectedBoard?.timezone}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>נוצר בתאריך</Text>
          <Text style={styles.infoValue}>
            {selectedBoard ? new Date(selectedBoard.created_at).toLocaleDateString('he-IL') : ''}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderMemberItem = ({ item }: { item: BoardMember }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.user.first_name} {item.user.last_name}
        </Text>
        <Text style={styles.memberEmail}>{item.user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{getRoleDisplayName(item.role)}</Text>
        </View>
      </View>
      
      {canManageMembers() && item.user_id !== user?.id && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(item)}
        >
          <Text style={styles.removeButtonText}>הסר</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderInviteModal = () => (
    <Modal
      visible={showInviteModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowInviteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>הזמן חבר חדש</Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="כתובת אימייל"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit={true}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.inviteButton]}
              onPress={handleInviteMember}
              disabled={isInviting}
            >
              <Text style={styles.inviteButtonText}>
                {isInviting ? 'שולח...' : 'הזמן'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {renderBoardInfo()}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>חברי הלוח ({boardMembers.length})</Text>
          {canManageMembers() && (
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => setShowInviteModal(true)}
            >
              <Text style={styles.inviteButtonText}>+ הזמן</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={boardMembers}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>

      {/* Board Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>הגדרות לוח</Text>
        
        <TouchableOpacity
          style={styles.settingButton}
          onPress={() => setShowCategoryManager(true)}
        >
          <Text style={styles.settingButtonText}>🏷️ נהל קטגוריות</Text>
          <Text style={styles.settingButtonSubtext}>ערוך את הקטגוריות הזמינות בלוח</Text>
        </TouchableOpacity>
      </View>

      {/* Tutorial Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>מדריך ועזרה</Text>
        <View style={styles.tutorialContainer}>
          <TouchableOpacity
            style={[styles.tutorialButton, styles.resetTutorialButton]}
            onPress={handleResetTutorial}
          >
            <Text style={styles.resetTutorialButtonText}>🔄 אפס מדריך</Text>
            <Text style={styles.tutorialButtonSubtext}>המדריך יופיע בכניסה הבאה</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>התנתק</Text>
        </TouchableOpacity>
      </View>

      {renderInviteModal()}
      
      <CategoryManager
        visible={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  infoContainer: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inviteButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 14,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tutorialContainer: {
    marginTop: 16,
  },
  tutorialButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  tutorialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  tutorialButtonSubtext: {
    fontSize: 14,
    color: 'white',
  },
  resetTutorialButton: {
    backgroundColor: '#2ecc71',
  },
  resetTutorialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  clearTutorialButton: {
    backgroundColor: '#c0392b',
  },
  clearTutorialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  specificTutorialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  specificTutorialButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#8e44ad',
  },
  clearSpecificButton: {
    backgroundColor: '#e74c3c',
  },
  settingButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  settingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  settingButtonSubtext: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
});

export default SettingsScreen; 