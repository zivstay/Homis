import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Expense } from '../services/api';
import { ExpenseImage } from './ExpenseImage';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ExpenseDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  expense: Expense | null;
  getMemberName: (userId: string) => string;
  getCategoryColor: (categoryName: string) => string;
  onDelete?: (expense: Expense) => void;
  canDelete?: boolean;
}

export function ExpenseDetailsModal({
  visible,
  onClose,
  expense,
  getMemberName,
  getCategoryColor,
  onDelete,
  canDelete = false,
}: ExpenseDetailsModalProps) {
  if (!expense) return null;

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFrequencyText = (frequency?: string) => {
    switch (frequency) {
      case 'daily':
        return 'יומי';
      case 'weekly':
        return 'שבועי';
      case 'monthly':
        return 'חודשי';
      default:
        return 'חודשי';
    }
  };

  const handleDelete = () => {
    if (!expense || !onDelete) return;
    
    // Close modal first, then call parent delete handler
    onClose();
    onDelete(expense);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.title}>
            פרטי הוצאה
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* תמונה */}
          {expense.has_image && (
            <View style={styles.imageSection}>
              <ExpenseImage 
                expenseId={expense.id}
                style={styles.expenseImage}
              />
            </View>
          )}

          {/* מידע בסיסי */}
          <View style={styles.section}>
            <View style={styles.amountContainer}>
              <ThemedText type="title" style={styles.amount}>
                {formatCurrency(expense.amount)}
              </ThemedText>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(expense.category) }]}>
                <ThemedText style={styles.categoryText}>
                  {expense.category}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* תיאור */}
          {expense.description && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                תיאור
              </ThemedText>
              <ThemedText style={styles.description}>
                {expense.description}
              </ThemedText>
            </View>
          )}

          {/* פרטי תשלום */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              פרטי תשלום
            </ThemedText>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>שולם על ידי:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {getMemberName(expense.paid_by)}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>נוצר על ידי:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {getMemberName(expense.created_by)}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>תאריך:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(expense.date)}
              </ThemedText>
            </View>
          </View>

          {/* כפתור מחיקה */}
          {canDelete && onDelete && (
            <View style={styles.deleteSection}>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteButtonBottom}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
                <ThemedText style={styles.deleteButtonText}>מחק הוצאה</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* הוצאה קבועה */}
          {expense.is_recurring && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                הוצאה קבועה
              </ThemedText>
              <View style={styles.recurringBadge}>
                <Ionicons name="refresh" size={16} color="#007AFF" />
                <ThemedText style={styles.recurringText}>
                  {getFrequencyText(expense.frequency)}
                </ThemedText>
              </View>
              {expense.start_date && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>תאריך התחלה:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {formatDate(expense.start_date)}
                  </ThemedText>
                </View>
              )}
              {expense.end_date && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>תאריך סיום:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {formatDate(expense.end_date)}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* תגיות */}
          {expense.tags && expense.tags.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                תגיות
              </ThemedText>
              <View style={styles.tagsContainer}>
                {expense.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row-reverse', // RTL support
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  imageSection: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  expenseImage: {
    width: '100%',
    height: 220,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#495057',
    textAlign: 'right',
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
    paddingBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row-reverse', // RTL support
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 16,
    minHeight: 60,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#dc3545',
    textAlign: 'right',
    lineHeight: 40,
  },
  categoryBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 17,
    lineHeight: 26,
    color: '#495057',
    textAlign: 'right',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderRightWidth: 4,
    borderRightColor: '#6c757d',
  },
  detailRow: {
    flexDirection: 'row-reverse', // RTL support
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  detailLabel: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'left',
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recurringBadge: {
    flexDirection: 'row-reverse', // RTL support
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-end', // RTL alignment
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#bbdefb',
  },
  recurringText: {
    fontSize: 15,
    color: '#1976d2',
    fontWeight: '700',
    marginRight: 8, // RTL spacing
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row-reverse', // RTL support
    flexWrap: 'wrap',
    justifyContent: 'flex-end', // RTL alignment
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8, // RTL spacing
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  tagText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deleteButtonBottom: {
    flexDirection: 'row-reverse', // RTL support
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '700',
    marginRight: 8, // RTL spacing
    textAlign: 'center',
  },
}); 