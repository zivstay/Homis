import { useExpenses } from '@/contexts/ExpenseContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface MonthPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentMonth: number;
  currentYear: number;
}

export function MonthPickerModal({
  visible,
  onClose,
  currentMonth,
  currentYear,
}: MonthPickerModalProps) {
  const { goToPreviousMonth, goToNextMonth, goToCurrentMonth } = useExpenses();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const months = [
    { id: 0, name: 'ינואר' },
    { id: 1, name: 'פברואר' },
    { id: 2, name: 'מרץ' },
    { id: 3, name: 'אפריל' },
    { id: 4, name: 'מאי' },
    { id: 5, name: 'יוני' },
    { id: 6, name: 'יולי' },
    { id: 7, name: 'אוגוסט' },
    { id: 8, name: 'ספטמבר' },
    { id: 9, name: 'אוקטובר' },
    { id: 10, name: 'נובמבר' },
    { id: 11, name: 'דצמבר' },
  ];

  const handleMonthSelect = (month: number) => {
    // Navigate to the selected month
    const currentDate = new Date(currentYear, currentMonth);
    const targetDate = new Date(selectedYear, month);
    
    // Calculate how many months to navigate
    const monthDiff = (targetDate.getFullYear() - currentDate.getFullYear()) * 12 + 
                     (targetDate.getMonth() - currentDate.getMonth());
    
    if (monthDiff > 0) {
      // Navigate forward
      for (let i = 0; i < monthDiff; i++) {
        goToNextMonth();
      }
    } else if (monthDiff < 0) {
      // Navigate backward
      for (let i = 0; i < Math.abs(monthDiff); i++) {
        goToPreviousMonth();
      }
    }
    
    onClose();
  };

  const handleYearChange = (increment: number) => {
    setSelectedYear(prev => prev + increment);
  };

  const handleGoToCurrentMonth = () => {
    goToCurrentMonth();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.title}>
            בחר חודש
          </ThemedText>
          <TouchableOpacity onPress={handleGoToCurrentMonth} style={styles.currentButton}>
            <ThemedText style={styles.currentButtonText}>היום</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.yearSelector}>
          <TouchableOpacity
            onPress={() => handleYearChange(-1)}
            style={styles.yearButton}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.yearText}>
            {selectedYear}
          </ThemedText>
          <TouchableOpacity
            onPress={() => handleYearChange(1)}
            style={styles.yearButton}
          >
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.monthsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.monthsGrid}>
            {months.map((month) => (
              <TouchableOpacity
                key={month.id}
                style={[
                  styles.monthButton,
                  currentMonth === month.id && currentYear === selectedYear && styles.monthButtonActive,
                ]}
                onPress={() => handleMonthSelect(month.id)}
              >
                <ThemedText
                  style={[
                    styles.monthButtonText,
                    currentMonth === month.id && currentYear === selectedYear && styles.monthButtonTextActive,
                  ]}
                >
                  {month.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  currentButton: {
    padding: 8,
  },
  currentButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  yearButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthsContainer: {
    flex: 1,
    padding: 16,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  monthButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 