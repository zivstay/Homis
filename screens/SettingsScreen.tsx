import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import { adManager } from '../services/adManager';
import { adMobService } from '../services/admobService';
import { BoardMember, apiService } from '../services/api';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedBoard, boardMembers, inviteMember, removeMember } = useBoard();
  const { user, logout, isGuestMode, clearGuestData } = useAuth();
  const { startTutorial, forceStartTutorial, resetTutorial, setCurrentScreen, checkScreenTutorial, clearAllTutorialData } = useTutorial();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMode, setInviteMode] = useState<'email' | 'virtual'>('email');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleResetAdCooldown = async () => {
    await adManager.resetAdCooldown();
    Alert.alert('הצלחה', 'זמן ההמתנה לפרסומות אופס. הפרסומת הבאה תוצג מיד.');
  };

  const handleCheckAdStatus = () => {
    const status = adMobService.getAdStatus();
    const statusText = `
מצב AdMob:
• זמין: ${status.isAdMobAvailable ? 'כן' : 'לא'}
• מאותחל: ${status.isInitialized ? 'כן' : 'לא'}

פרסומות Interstitial (וידאו):
• טעונה: ${status.interstitial.loaded ? 'כן' : 'לא'}  
• בטעינה: ${status.interstitial.loading ? 'כן' : 'לא'}
• קיימת: ${status.interstitial.exists ? 'כן' : 'לא'}
    `;
    
    Alert.alert('מצב פרסומות', statusText.trim());
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmation.trim() !== 'מחיקה') {
      Alert.alert('שגיאה', 'עליך להזין "מחיקה" כדי לאשר את הפעולה');
      return;
    }

    setIsDeleting(true);
    try {
      if (isGuestMode) {
        // In guest mode, clear local data instead of deleting user account
        console.log('🗑️ Starting guest data deletion...');
        const result = await clearGuestData();
        
        if (result.success) {
          console.log('✅ Guest data deletion successful');
          Alert.alert('הצלחה', 'כל הנתונים נמחקו בהצלחה', [
            {
              text: 'אישור',
              onPress: () => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
                logout();
              },
            },
          ]);
        } else {
          console.error('❌ Guest data deletion failed:', result.error);
          Alert.alert('שגיאה', result.error || 'שגיאה במחיקת הנתונים');
        }
      } else {
        // Regular user account deletion
        console.log('🗑️ Starting user deletion...');
        const result = await apiService.deleteUser();
        
        if (result.success) {
          console.log('✅ User deletion successful');
          Alert.alert('הצלחה', 'המשתמש נמחק בהצלחה', [
            {
              text: 'אישור',
              onPress: () => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
                logout();
              },
            },
          ]);
        } else {
          console.error('❌ User deletion failed:', result.error);
          Alert.alert('שגיאה', result.error || 'שגיאה במחיקת המשתמש');
        }
      }
    } catch (error) {
      console.error('❌ Error during deletion:', error);
      Alert.alert('שגיאה', 'שגיאה בתקשורת עם השרת');
    } finally {
      setIsDeleting(false);
    }
  };

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
    if (inviteMode === 'email') {
      if (!inviteEmail.trim()) {
        Alert.alert('שגיאה', 'נא להזין כתובת אימייל');
        return;
      }
    } else {
      if (!inviteFirstName.trim() || !inviteLastName.trim()) {
        Alert.alert('שגיאה', 'נא להזין שם פרטי ושם משפחה');
        return;
      }
    }

    setIsInviting(true);
    
    let result;
    if (inviteMode === 'email') {
      // Email-based invitation with selected role
      result = await inviteMember(inviteEmail.trim(), inviteRole);
    } else {
      // Virtual member invitation (always member role)
      result = await inviteMember(null, 'member', inviteFirstName.trim(), inviteLastName.trim());
    }
    
    setIsInviting(false);

    if (result.success) {
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('member');
      setInviteMode('email');
      
      if (inviteMode === 'email') {
        const roleText = inviteRole === 'owner' ? 'בעלים' : 'חבר';
        Alert.alert('הצלחה', `ההזמנה נשלחה בהצלחה. המשתמש יתווסף כ${roleText} בלוח.`);
      } else {
        Alert.alert('הצלחה', 'החבר נוסף בהצלחה');
      }
    } else {
      Alert.alert('שגיאה', result.error || 'שגיאה בהוספת החבר');
    }
  };

  const handleRemoveMember = (member: BoardMember) => {
    if (member.user_id === user?.id) {
      Alert.alert('שגיאה', 'לא ניתן להסיר את עצמך מהלוח');
      return;
    }

    const isBoardCreator = selectedBoard && member.user_id === selectedBoard.owner_id;
    if (isBoardCreator) {
      Alert.alert('שגיאה', 'לא ניתן להסיר את יוצר הלוח. יוצר הלוח הוא הבעלים הקבוע של הלוח.');
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

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return { ...styles.roleBadge, backgroundColor: '#e74c3c' }; // Red for owner
      case 'admin':
        return { ...styles.roleBadge, backgroundColor: '#f39c12' }; // Orange for admin
      case 'member':
        return { ...styles.roleBadge, backgroundColor: '#3498db' }; // Blue for member
      case 'viewer':
        return { ...styles.roleBadge, backgroundColor: '#95a5a6' }; // Gray for viewer
      default:
        return styles.roleBadge;
    }
  };

  const canManageMembers = () => {
    if (!selectedBoard) return false;
    
    // In guest mode, user is always owner of their boards, but can't invite members
    if (isGuestMode) return false; // Guest can't manage members
    
    if (!user) return false; // No user, can't manage members
    
    const currentMember = boardMembers.find(m => m.user_id === user.id);
    return currentMember?.role === 'owner' || currentMember?.role === 'admin';
  };

  const handleLogout = () => {
    if (isGuestMode) {
      // ישירות למסך התחברות ללא הודעה
      logout();
    } else {
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
    }
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

  const renderMemberItem = ({ item }: { item: BoardMember }) => {
    const isVirtual = item.user && item.user.email?.includes('@virtual.local');
    const isBoardCreator = selectedBoard && item.user_id === selectedBoard.owner_id;
    const canRemoveThisMember = canManageMembers() && item.user_id !== user?.id && !isBoardCreator;
    
    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameContainer}>
            <Text style={styles.memberName}>
              {item.user ? `${item.user.first_name} ${item.user.last_name}` : 'אורח'}
            </Text>
            {isBoardCreator && (
              <View style={styles.creatorBadge}>
                <Text style={styles.creatorBadgeText}>👑</Text>
              </View>
            )}
            {isVirtual && (
              <View style={styles.virtualBadge}>
                <Text style={styles.virtualBadgeText}>👤</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberEmail}>
            {isBoardCreator ? 'יוצר הלוח' : 
             (isVirtual ? 'חבר ללא אימייל' : (item.user ? item.user.email : 'guest@local'))
            }
          </Text>
          <View style={getRoleBadgeStyle(item.role)}>
            <Text style={styles.roleBadgeText}>{getRoleDisplayName(item.role)}</Text>
          </View>
        </View>
        
        {canRemoveThisMember && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(item)}
          >
            <Text style={styles.removeButtonText}>הסר</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
          
          {/* Mode Toggle */}
          <View style={styles.inviteModeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                inviteMode === 'email' && styles.modeButtonActive
              ]}
              onPress={() => setInviteMode('email')}
            >
              <Text style={[
                styles.modeButtonText,
                inviteMode === 'email' && styles.modeButtonTextActive
              ]}>
                📧 עם אימייל
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                inviteMode === 'virtual' && styles.modeButtonActive
              ]}
              onPress={() => setInviteMode('virtual')}
            >
              <Text style={[
                styles.modeButtonText,
                inviteMode === 'virtual' && styles.modeButtonTextActive
              ]}>
                👤 ללא אימייל
              </Text>
            </TouchableOpacity>
          </View>
          
          {inviteMode === 'email' ? (
            <>
              <Text style={styles.modeDescription}>
                שלח הזמנה לחבר עם אימייל - הוא יוכל להתחבר לאפליקציה
              </Text>
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
              
              {/* Role Selection for Email Invites */}
              <Text style={styles.roleSelectionTitle}>תפקיד בלוח:</Text>
              <Text style={styles.roleSelectionSubtitle}>
                בחר את הרמת ההרשאות שהמשתמש יקבל בלוח
              </Text>
              <View style={styles.roleSelectionContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    inviteRole === 'member' && styles.roleButtonActive
                  ]}
                  onPress={() => setInviteRole('member')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    inviteRole === 'member' && styles.roleButtonTextActive
                  ]}>
                    👤 חבר
                  </Text>
                  <Text style={[
                    styles.roleButtonSubtext,
                    inviteRole === 'member' && styles.roleButtonSubtextActive
                  ]}>
                    יכול להוסיף הוצאות ולראות נתונים
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    inviteRole === 'owner' && styles.roleButtonActive
                  ]}
                  onPress={() => setInviteRole('owner')}
                >
                  <Text style={[
                    styles.roleButtonText,
                    inviteRole === 'owner' && styles.roleButtonTextActive
                  ]}>
                    👑 בעלים
                  </Text>
                  <Text style={[
                    styles.roleButtonSubtext,
                    inviteRole === 'owner' && styles.roleButtonSubtextActive
                  ]}>
                    יכול לנהל לוח, קטגוריות וחברים
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.modeDescription}>
                הוסף חבר ללא אימייל - תוכל להוסיף הוצאות בשמו
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="שם פרטי"
                value={inviteFirstName}
                onChangeText={setInviteFirstName}
                textAlign="right"
                returnKeyType="next"
                blurOnSubmit={false}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="שם משפחה"
                value={inviteLastName}
                onChangeText={setInviteLastName}
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            </>
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteFirstName('');
                setInviteLastName('');
                setInviteRole('member');
                setInviteMode('email');
              }}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.inviteButton]}
              onPress={handleInviteMember}
              disabled={isInviting}
            >
              <Text style={styles.inviteButtonText}>
                {isInviting ? 'מוסיף...' : (inviteMode === 'email' ? 'שלח הזמנה' : 'הוסף חבר')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {selectedBoard ? (
        <>
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
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>אין לוח נבחר</Text>
          <Text style={styles.noBoardMessage}>
            הגדרות הלוח זמינות רק כשיש לוח נבחר. בחר לוח או צור חדש כדי לגשת להגדרות הלוח.
          </Text>
          <TouchableOpacity
            style={styles.selectBoardButton}
            onPress={() => navigation.navigate('BoardSelection' as never)}
          >
            <Text style={styles.selectBoardButtonText}>בחר לוח</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>הגדרות חשבון</Text>
        
        {isGuestMode ? (
          <TouchableOpacity
            style={[styles.settingButton, styles.loginSettingButton]}
            onPress={handleLogout}
          >
            <Text style={styles.loginSettingButtonText}>🔑 התחבר</Text>
            <Text style={styles.loginSettingButtonSubtext}>התחבר עם חשבון משתמש</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.settingButton, styles.logoutSettingButton]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutSettingButtonText}>🚪 התנתק</Text>
            <Text style={styles.logoutSettingButtonSubtext}>התנתק מהחשבון הנוכחי</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.settingButton, styles.deleteUserButton]}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={styles.deleteUserButtonText}>
            {isGuestMode ? '⚠️ מחק נתונים' : '⚠️ מחק חשבון'}
          </Text>
          <Text style={styles.deleteUserButtonSubtext}>
            {isGuestMode 
              ? 'פעולה זו תמחק את כל הנתונים המקומיים ולא ניתן לשחזר'
              : 'פעולה זו תמחק את החשבון שלך לצמיתות ולא ניתן לשחזר'
            }
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tutorialButton, styles.resetTutorialButton]}
          onPress={handleResetTutorial}
        >
          <Text style={styles.resetTutorialButtonText}>🔄 אפס מדריך</Text>
          <Text style={styles.tutorialButtonSubtext}>המדריך יופיע בכניסה הבאה</Text>
        </TouchableOpacity>
        

      </View>



      {renderInviteModal()}
      
      <CategoryManager
        visible={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />

      {/* Delete User Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isGuestMode ? '🗑️ מחיקת נתונים' : '🗑️ מחיקת חשבון'}
            </Text>
            <Text style={styles.modalText}>
              {isGuestMode 
                ? 'האם אתה בטוח שאתה רוצה למחוק את כל הנתונים המקומיים? לא תוכל לשחזר אותם אחר כך.'
                : 'האם אתה בטוח שאתה רוצה למחוק את המשתמש? לא תוכל לשחזר את המשתמש אחר כך.'
              }
            </Text>
            <Text style={styles.modalText}>
              להשלמת הפעולה רשום "מחיקה" בתיבת הטקסט למטה:
            </Text>
            
            <View style={styles.confirmationContainer}>
              <Text style={styles.confirmationLabel}>אישור מחיקה:</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  deleteConfirmation.trim() === 'מחיקה' && styles.confirmationInputValid
                ]}
                placeholder="הקלד 'מחיקה' כדי לאשר"
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                keyboardType="default"
                autoCapitalize="none"
                textAlign="center"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
              {deleteConfirmation.trim() === 'מחיקה' && (
                <Text style={styles.confirmationValidText}>✅ אישור תקין</Text>
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.deleteUserButton,
                  deleteConfirmation.trim() !== 'מחיקה' && styles.deleteUserButtonDisabled
                ]}
                onPress={handleDeleteUser}
                disabled={isDeleting || deleteConfirmation.trim() !== 'מחיקה'}
              >
                <Text style={styles.deleteUserButtonText}>
                  {isDeleting ? 'מחיקה...' : (isGuestMode ? 'מחק נתונים' : 'מחק חשבון')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  creatorBadge: {
    marginLeft: 8,
    backgroundColor: '#f39c12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  creatorBadgeText: {
    fontSize: 12,
    color: 'white',
  },
  virtualBadge: {
    marginLeft: 8,
    backgroundColor: '#9b59b6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  virtualBadgeText: {
    fontSize: 12,
    color: 'white',
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
  modalText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10, // Reduced margin
    lineHeight: 22,
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
  deleteUserButton: {
    backgroundColor: '#e74c3c',
  },
  deleteUserButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  deleteUserButtonSubtext: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  confirmationContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  confirmationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  confirmationInputValid: {
    borderColor: '#2ecc71',
    borderWidth: 2,
  },
  confirmationValidText: {
    color: '#2ecc71',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  deleteUserButtonDisabled: {
    opacity: 0.7,
  },
  logoutSettingButton: {
    backgroundColor: '#f39c12',
  },
  logoutSettingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  logoutSettingButtonSubtext: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },

  loginSettingButton: {
    backgroundColor: '#3498db',
  },
  loginSettingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  loginSettingButtonSubtext: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },

  noBoardMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  selectBoardButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  selectBoardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Invite mode styles
  inviteModeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  modeButtonActive: {
    backgroundColor: '#3498db',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modeDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  
  // Role selection styles
  roleSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'right',
  },
  roleSelectionSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'right',
    marginBottom: 12,
  },
  roleSelectionContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  roleButton: {
    borderWidth: 2,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  roleButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
    textAlign: 'right',
    marginBottom: 4,
  },
  roleButtonTextActive: {
    color: '#3498db',
  },
  roleButtonSubtext: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'right',
    lineHeight: 16,
  },
  roleButtonSubtextActive: {
    color: '#2980b9',
  },
});

export default SettingsScreen; 