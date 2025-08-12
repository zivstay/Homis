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
}

export function ExpenseDetailsModal({
  visible,
  onClose,
  expense,
  getMemberName,
  getCategoryColor,
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
              <ThemedText style={styles.detailLabel}>תאריך:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(expense.date)}
              </ThemedText>
            </View>
          </View>

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

          {/* מידע נוסף */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              מידע נוסף
            </ThemedText>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>נוצר ב:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(expense.created_at)}
              </ThemedText>
            </View>
            {expense.updated_at !== expense.created_at && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>עודכן ב:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {formatDate(expense.updated_at)}
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageSection: {
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  expenseImage: {
    width: '100%',
    height: 200,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  recurringText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
}); 