import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface GuestDisclaimerProps {
  onLoginPress?: () => void;
}

const GuestDisclaimer: React.FC<GuestDisclaimerProps> = ({ onLoginPress }) => {
  const { isGuestMode, logout } = useAuth();

  if (!isGuestMode) {
    return null;
  }

  const handleLoginPress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      logout(); // Default behavior - go to login screen
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>מצב אורח</Text>
          <Text style={styles.description}>
            התחבר כדי לגשת לכל הפונקציות ולשמור את הנתונים בענן
          </Text>
        </View>
        <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
          <Text style={styles.loginButtonText}>התחבר</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    borderBottomWidth: 1,
    borderBottomColor: '#ffeaa7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default GuestDisclaimer;
