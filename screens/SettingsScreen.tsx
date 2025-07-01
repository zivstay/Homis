import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { BoardMember } from '../services/api';

const SettingsScreen: React.FC = () => {
  const { selectedBoard, boardMembers, inviteMember, removeMember } = useBoard();
  const { user, logout } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('שגיאה', 'נא להזין כתובת אימייל');
      return;
    }

    setIsInviting(true);
    const result = await inviteMember(inviteEmail.trim(), inviteRole);
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
          />
          
          <View style={styles.roleSelector}>
            <Text style={styles.roleLabel}>תפקיד:</Text>
            <View style={styles.roleButtons}>
              {['member', 'viewer'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    inviteRole === role && styles.selectedRoleButton,
                  ]}
                  onPress={() => setInviteRole(role)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      inviteRole === role && styles.selectedRoleButtonText,
                    ]}
                  >
                    {getRoleDisplayName(role)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
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

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>התנתק</Text>
        </TouchableOpacity>
      </View>

      {renderInviteModal()}
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
  roleSelector: {
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  selectedRoleButton: {
    borderColor: '#3498db',
    backgroundColor: '#ebf3fd',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  selectedRoleButtonText: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
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
});

export default SettingsScreen; 