import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import CreateBoardWizard from './CreateBoardWizard';

interface CreateBoardButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  style?: any;
  onBoardCreated?: (newBoard?: any, shouldOpenCategories?: boolean) => void;
}

const CreateBoardButton: React.FC<CreateBoardButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  style,
  onBoardCreated,
}) => {
  const { isGuestMode, logout } = useAuth();
  const { createBoard } = useBoard();
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  const handlePress = () => {
    if (isGuestMode) {
      Alert.alert(
        'פונקציה נעולה',
        'כדי ליצור לוחות נוספים, יש להתחבר עם חשבון משתמש.\n\nהתחבר או הירשם כדי לקבל גישה לכל הפונקציות!',
        [
          { text: 'אולי מאוחר יותר', style: 'cancel' },
          { 
            text: 'התחבר עכשיו', 
            onPress: () => {
              logout();
            }
          }
        ]
      );
    } else {
      setShowCreateWizard(true);
    }
  };

  const handleBoardCreated = async (newBoard?: any, shouldOpenCategories?: boolean) => {
    setShowCreateWizard(false);
    
    // Call the parent callback if provided
    if (onBoardCreated) {
      onBoardCreated(newBoard, shouldOpenCategories);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    // Variant styles
    if (variant === 'primary') {
      baseStyle.push(styles.primaryButton);
    } else {
      baseStyle.push(styles.secondaryButton);
    }
    
    // Size styles
    if (size === 'small') {
      baseStyle.push(styles.smallButton);
    } else if (size === 'large') {
      baseStyle.push(styles.largeButton);
    } else {
      baseStyle.push(styles.mediumButton);
    }
    
    // Guest mode opacity
    if (isGuestMode) {
      baseStyle.push(styles.guestModeButton);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primaryText);
    } else {
      baseStyle.push(styles.secondaryText);
    }
    
    if (size === 'small') {
      baseStyle.push(styles.smallText);
    } else if (size === 'large') {
      baseStyle.push(styles.largeText);
    } else {
      baseStyle.push(styles.mediumText);
    }
    
    return baseStyle;
  };

  return (
    <>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={handlePress}
      >
        <Text style={getTextStyle()}>
          + צור לוח חדש {isGuestMode ? '🔒' : ''}
        </Text>
      </TouchableOpacity>

      <CreateBoardWizard
        isVisible={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onBoardCreated={handleBoardCreated}
        createBoard={createBoard}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Variant styles
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#2ecc71',
  },
  
  // Size styles
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  mediumButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  largeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 52,
  },
  
  // Guest mode
  guestModeButton: {
    opacity: 0.5,
  },
  
  // Text styles
  buttonText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Text variants
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: 'white',
  },
  
  // Text sizes
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});

export default CreateBoardButton;
