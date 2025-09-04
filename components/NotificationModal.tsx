import React from 'react';
import {
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Notification, useNotifications } from '../contexts/NotificationContext';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    openNotification,
  } = useNotifications();

  const handleNotificationPress = (notification: Notification) => {
    openNotification(notification);
    onClose();
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      'מחיקת התראה',
      'האם אתה בטוח שרוצה למחוק את ההתראה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteNotification(notificationId),
        },
      ]
    );
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'סמן הכל כנקרא',
      'האם לסמן את כל ההתראות כנקראות?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'כן',
          onPress: () => markAllAsRead(),
        },
      ]
    );
  };

  const formatNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'expense_added':
        return `${notification.created_by_name} הוסיף הוצאה של ₪${notification.amount} - ${notification.expense_description}`;
      case 'expense_added_for_you':
        return `${notification.created_by_name} הוסיף הוצאה בשמך עבור ${notification.expense_description} על סך ₪${notification.amount}`;
      case 'expense_updated':
        return `${notification.created_by_name} עדכן הוצאה - ${notification.expense_description}`;
      case 'expense_deleted':
        return `${notification.created_by_name} מחק הוצאה - ${notification.expense_description}`;
      case 'board_invite':
        return `${notification.created_by_name} הזמין אותך ללוח ${notification.board_name}`;
      default:
        return notification.expense_description;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `לפני ${diffMinutes} דקות`;
    } else if (diffHours < 24) {
      return `לפני ${diffHours} שעות`;
    } else if (diffDays < 7) {
      return `לפני ${diffDays} ימים`;
    } else {
      return date.toLocaleDateString('he-IL');
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotificationItem,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationText,
          !item.is_read && styles.unreadNotificationText,
        ]}>
          {formatNotificationText(item)}
        </Text>
        <Text style={styles.notificationBoard}>לוח: {item.board_name}</Text>
        <Text style={styles.notificationDate}>{formatDate(item.created_at)}</Text>
      </View>
      
      <View style={styles.notificationActions}>
        {!item.is_read && (
          <TouchableOpacity
            style={styles.markReadButton}
            onPress={() => markAsRead(item.id)}
          >
            <Text style={styles.markReadText}>✓</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(item.id)}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>התראות</Text>
            <View style={styles.headerActions}>
              {unreadNotifications.length > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={handleMarkAllAsRead}
                >
                  <Text style={styles.markAllText}>סמן הכל כנקרא</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>טוען התראות...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>אין התראות חדשות</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              style={styles.notificationsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  markAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#bdc3c7',
  },
  unreadNotificationItem: {
    backgroundColor: '#ebf3fd',
    borderLeftColor: '#3498db',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  unreadNotificationText: {
    fontWeight: 'bold',
  },
  notificationBoard: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  notificationDate: {
    fontSize: 11,
    color: '#95a5a6',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markReadButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markReadText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14,
  },
});

export default NotificationModal; 