import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { formatCurrency } from '../utils/currencyUtils';

interface BudgetEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (budgetAmount: number | null, alerts: number[]) => void;
  currentBudget?: number | null;
  currentAlerts?: number[];
  currency: string;
}

export const BudgetEditModal: React.FC<BudgetEditModalProps> = ({
  visible,
  onClose,
  onSave,
  currentBudget,
  currentAlerts = [],
  currency
}) => {
  const [budgetAmount, setBudgetAmount] = useState(currentBudget?.toString() || '');
  const [alerts, setAlerts] = useState<{[key: number]: boolean}>({
    50: currentAlerts.includes(50),
    75: currentAlerts.includes(75),
    90: currentAlerts.includes(90)
  });

  // Update values when modal opens or current values change
  useEffect(() => {
    console.log('💰 BudgetEditModal: Updating values:', { currentBudget, currentAlerts, visible });
    setBudgetAmount(currentBudget?.toString() || '');
    setAlerts({
      50: currentAlerts.includes(50),
      75: currentAlerts.includes(75),
      90: currentAlerts.includes(90)
    });
  }, [currentBudget, currentAlerts, visible]);

  const handleSave = () => {
    // Validate budget amount
    let finalBudgetAmount: number | null = null;
    if (budgetAmount.trim()) {
      const parsed = parseFloat(budgetAmount);
      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert('שגיאה', 'אנא הכנס סכום תקציב תקין');
        return;
      }
      finalBudgetAmount = parsed;
    }

    // Get selected alerts
    const selectedAlerts = Object.entries(alerts)
      .filter(([_, enabled]) => enabled)
      .map(([percentage, _]) => parseInt(percentage));

    onSave(finalBudgetAmount, selectedAlerts);
  };

  const handleAlertToggle = (percentage: number) => {
    setAlerts(prev => ({
      ...prev,
      [percentage]: !prev[percentage]
    }));
  };

  const handleClearBudget = () => {
    Alert.alert(
      'מחיקת תקציב',
      'האם אתה בטוח שברצונך למחוק את התקציב?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            setBudgetAmount('');
            setAlerts({ 50: false, 75: false, 90: false });
            onSave(null, []);
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.modalTitle}>הגדרת תקציב</Text>
            
            {/* Budget Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>סכום התקציב ({currency})</Text>
              <TextInput
                style={styles.budgetInput}
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                placeholder={`0 ${currency}`}
                keyboardType="numeric"
                placeholderTextColor="#bdc3c7"
                returnKeyType="done"
                onSubmitEditing={() => {
                  // Dismiss keyboard when user presses done
                  Keyboard.dismiss();
                }}
              />
              {budgetAmount && !isNaN(parseFloat(budgetAmount)) && (
                <Text style={styles.budgetPreview}>
                  {formatCurrency(parseFloat(budgetAmount), currency)}
                </Text>
              )}
            </View>

            {/* Alert Settings */}
            <View style={styles.alertSection}>
              <Text style={styles.alertSectionTitle}>התראות תקציב</Text>
              <Text style={styles.alertSectionSubtitle}>
                בחר באילו אחוזי תקציב תרצה לקבל התראות
              </Text>

              <View style={styles.alertOption}>
                <View style={styles.alertOptionText}>
                  <Text style={styles.alertOptionTitle}>50% מהתקציב</Text>
                  <Text style={styles.alertOptionDescription}>
                    התראה מוקדמת לניהול טוב יותר
                  </Text>
                </View>
                <Switch
                  value={alerts[50]}
                  onValueChange={() => handleAlertToggle(50)}
                  trackColor={{ false: '#e0e6ed', true: '#3498db' }}
                  thumbColor={alerts[50] ? '#ffffff' : '#bdc3c7'}
                />
              </View>

              <View style={styles.alertOption}>
                <View style={styles.alertOptionText}>
                  <Text style={styles.alertOptionTitle}>75% מהתקציב</Text>
                  <Text style={styles.alertOptionDescription}>
                    התראה לפני הגעה לגבול התקציb
                  </Text>
                </View>
                <Switch
                  value={alerts[75]}
                  onValueChange={() => handleAlertToggle(75)}
                  trackColor={{ false: '#e0e6ed', true: '#f39c12' }}
                  thumbColor={alerts[75] ? '#ffffff' : '#bdc3c7'}
                />
              </View>

              <View style={styles.alertOption}>
                <View style={styles.alertOptionText}>
                  <Text style={styles.alertOptionTitle}>90% מהתקציב</Text>
                  <Text style={styles.alertOptionDescription}>
                    התראה אחרונה לפני חריגה מהתקציב
                  </Text>
                </View>
                <Switch
                  value={alerts[90]}
                  onValueChange={() => handleAlertToggle(90)}
                  trackColor={{ false: '#e0e6ed', true: '#e74c3c' }}
                  thumbColor={alerts[90] ? '#ffffff' : '#bdc3c7'}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>שמור</Text>
              </TouchableOpacity>
            </View>

            {currentBudget && (
              <TouchableOpacity
                style={styles.clearBudgetButton}
                onPress={handleClearBudget}
              >
                <Text style={styles.clearBudgetButtonText}>🗑️ מחק תקציב</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Extra padding for keyboard
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  budgetInput: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
  budgetPreview: {
    fontSize: 14,
    color: '#27ae60',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: 'bold',
  },
  alertSection: {
    marginBottom: 24,
  },
  alertSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  alertSectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    textAlign: 'right',
    lineHeight: 20,
  },
  alertOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  alertOptionText: {
    flex: 1,
    marginRight: 16,
  },
  alertOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 4,
  },
  alertOptionDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearBudgetButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearBudgetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  keyboardDismissButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  keyboardDismissText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
