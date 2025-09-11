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
  onSave: (budgetAmount: number | null, alerts: number[], autoReset: boolean, resetDay: number | null, resetTime: string | null) => void;
  currentBudget?: number | null;
  currentAlerts?: number[];
  currentAutoReset?: boolean;
  currentResetDay?: number | null;
  currentResetTime?: string | null;
  currency: string;
}

export const BudgetEditModal: React.FC<BudgetEditModalProps> = ({
  visible,
  onClose,
  onSave,
  currentBudget,
  currentAlerts = [],
  currentAutoReset = false,
  currentResetDay = null,
  currentResetTime = null,
  currency
}) => {
  const [budgetAmount, setBudgetAmount] = useState(currentBudget?.toString() || '');
  const [alerts, setAlerts] = useState<{[key: number]: boolean}>({
    50: currentAlerts.includes(50),
    75: currentAlerts.includes(75),
    90: currentAlerts.includes(90)
  });
  const [autoReset, setAutoReset] = useState(currentAutoReset);
  const [resetDay, setResetDay] = useState(currentResetDay?.toString() || '1');
  const [resetTime, setResetTime] = useState(currentResetTime || '09:00');

  // Update values when modal opens or current values change
  useEffect(() => {
    console.log('💰 BudgetEditModal: Updating values:', { currentBudget, currentAlerts, currentAutoReset, currentResetDay, currentResetTime, visible });
    setBudgetAmount(currentBudget?.toString() || '');
    setAlerts({
      50: currentAlerts.includes(50),
      75: currentAlerts.includes(75),
      90: currentAlerts.includes(90)
    });
    setAutoReset(currentAutoReset);
    setResetDay(currentResetDay?.toString() || '1');
    setResetTime(currentResetTime || '09:00');
  }, [currentBudget, currentAlerts, currentAutoReset, currentResetDay, currentResetTime, visible]);

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

    // DISABLED: Auto reset validation temporarily disabled
    // TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת
    
    // For now, just pass disabled auto reset values
    onSave(finalBudgetAmount, selectedAlerts, false, null, null);

    // COMMENTED OUT - Auto reset validation (needs work)
    // // Validate reset day if auto reset is enabled
    // let finalResetDay: number | null = null;
    // let finalResetTime: string | null = null;
    // if (autoReset) {
    //   const parsedResetDay = parseInt(resetDay);
    //   if (isNaN(parsedResetDay) || parsedResetDay < 1 || parsedResetDay > 31) {
    //     Alert.alert('שגיאה', 'אנא הכנס יום תקין לאיפוס (1-31)');
    //     return;
    //   }
    //   finalResetDay = parsedResetDay;
    //   
    //   // Validate reset time format (HH:MM)
    //   if (resetTime.trim()) {
    //     const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    //     if (!timeRegex.test(resetTime)) {
    //       Alert.alert('שגיאה', 'אנא הכנס שעה תקינה בפורמט HH:MM (למשל 09:00 או 14:30)');
    //       return;
    //     }
    //     
    //     // Additional validation for hours and minutes
    //     const [hours, minutes] = resetTime.split(':').map(Number);
    //     if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    //       Alert.alert('שגיאה', 'שעה לא תקינה. השעות חייבות להיות 00-23 והדקות 00-59');
    //       return;
    //     }
    //     
    //     finalResetTime = resetTime;
    //   }
    // }

    // onSave(finalBudgetAmount, selectedAlerts, autoReset, finalResetDay, finalResetTime);
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
            setAutoReset(false);
            setResetDay('1');
            setResetTime('09:00');
            onSave(null, [], false, null, null);
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
                    התראה לפני הגעה לגבול התקציב
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

            {/* DISABLED: Auto Reset Settings temporarily disabled */}
            {/* TODO: לוגיקת התקציב מושבתת זמנית - צריך עבודה נוספת */}
            
            {/* COMMENTED OUT - Auto Reset Settings (needs work) */}
            {/* Auto Reset Settings */}
            {/* <View style={styles.resetSection}>
              <Text style={styles.resetSectionTitle}>איפוס אוטומטי</Text>
              <Text style={styles.resetSectionSubtitle}>
                הגדר איפוס אוטומטי של התקציב בכל חודש
              </Text>

              <View style={styles.resetOption}>
                <View style={styles.resetOptionText}>
                  <Text style={styles.resetOptionTitle}>איפוס אוטומטי</Text>
                  <Text style={styles.resetOptionDescription}>
                    אפס את סכום ההוצאות בכל חודש ביום שתבחר
                  </Text>
                </View>
                <Switch
                  value={autoReset}
                  onValueChange={setAutoReset}
                  trackColor={{ false: '#e0e6ed', true: '#27ae60' }}
                  thumbColor={autoReset ? '#ffffff' : '#bdc3c7'}
                />
              </View>

              {autoReset && (
                <View style={styles.resetDaySection}>
                  <Text style={styles.resetDayLabel}>יום בחודש לאיפוס</Text>
                  <TextInput
                    style={styles.resetDayInput}
                    value={resetDay}
                    onChangeText={setResetDay}
                    placeholder="1-31"
                    keyboardType="numeric"
                    placeholderTextColor="#bdc3c7"
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                    }}
                  />
                  <Text style={styles.resetDayHint}>
                    בחר יום בחודש (1-31) בו תרצה שהתקציב יתאפס אוטומטית
                  </Text>
                  
                  <Text style={styles.resetTimeLabel}>שעה לאיפוס</Text>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={styles.timeInput}
                      value={resetTime}
                      onChangeText={(text) => {
                        // Allow only digits and colon
                        const cleaned = text.replace(/[^0-9:]/g, '');
                        
                        // Auto-format as user types
                        if (cleaned.length <= 2) {
                          setResetTime(cleaned);
                        } else if (cleaned.length === 3 && !cleaned.includes(':')) {
                          setResetTime(cleaned.slice(0, 2) + ':' + cleaned.slice(2));
                        } else if (cleaned.length <= 5) {
                          setResetTime(cleaned);
                        }
                      }}
                      placeholder="09:00"
                      keyboardType="numeric"
                      placeholderTextColor="#bdc3c7"
                      returnKeyType="done"
                      maxLength={5}
                      onSubmitEditing={() => {
                        Keyboard.dismiss();
                      }}
                    />
                    <Text style={styles.timeFormatHint}>HH:MM</Text>
                  </View>
                  <Text style={styles.resetTimeHint}>
                    בחר שעה בפורמט HH:MM (למשל 09:00 או 14:30)
                  </Text>
                  
                  {/* Quick time selection buttons */}
                  {/* <View style={styles.quickTimeButtons}>
                    <Text style={styles.quickTimeLabel}>שעות מומלצות:</Text>
                    <View style={styles.timeButtonsRow}>
                      {['09:00', '12:00', '15:00', '18:00'].map((time) => (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.timeButton,
                            resetTime === time && styles.timeButtonSelected
                          ]}
                          onPress={() => setResetTime(time)}
                        >
                          <Text style={[
                            styles.timeButtonText,
                            resetTime === time && styles.timeButtonTextSelected
                          ]}>
                            {time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View> */}

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
  resetSection: {
    marginBottom: 24,
  },
  resetSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  resetSectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    textAlign: 'right',
    lineHeight: 20,
  },
  resetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  resetOptionText: {
    flex: 1,
    marginRight: 16,
  },
  resetOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 4,
  },
  resetOptionDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
    lineHeight: 16,
  },
  resetDaySection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  resetDayLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  resetDayInput: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  resetDayHint: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 16,
  },
  resetTimeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'right',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#ffffff',
    width: 120,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  timeFormatHint: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  resetTimeHint: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 16,
  },
  quickTimeButtons: {
    marginTop: 12,
  },
  quickTimeLabel: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  timeButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  timeButtonSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  timeButtonTextSelected: {
    color: '#ffffff',
  },
});
