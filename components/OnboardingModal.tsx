import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export interface OnboardingConfig {
  type: 'roommates' | 'travelers' | 'couple' | 'family' | 'custom';
  title: string;
  description: string;
  defaultCategories: string[];
  defaultUsers: string[];
  icon: string;
}

const ONBOARDING_OPTIONS: OnboardingConfig[] = [
  {
    type: 'roommates',
    title: 'שותפים לדירה',
    description: 'ניהול הוצאות משותפות עם שותפים לדירה',
    defaultCategories: ['חשמל', 'מים', 'ארנונה', 'גז', 'אינטרנט', 'ניקיון', 'אחר'],
    defaultUsers: ['אני', 'שותף 1', 'שותף 2'],
    icon: 'home',
  },
  {
    type: 'travelers',
    title: 'מטיילים',
    description: 'ניהול הוצאות משותפות בטיול או נסיעה',
    defaultCategories: ['מלון', 'אוכל', 'תחבורה', 'אטרקציות', 'קניות', 'אחר'],
    defaultUsers: ['אני', 'מטייל 1', 'מטייל 2'],
    icon: 'airplane',
  },
  {
    type: 'couple',
    title: 'זוג',
    description: 'ניהול הוצאות משותפות עם בן/בת הזוג',
    defaultCategories: ['חשמל', 'מים', 'ארנונה', 'סופר', 'בילויים', 'אחר'],
    defaultUsers: ['אני', 'בן/בת זוג'],
    icon: 'heart',
  },
  {
    type: 'family',
    title: 'משפחה',
    description: 'ניהול הוצאות משפחתיות משותפות',
    defaultCategories: ['חשמל', 'מים', 'ארנונה', 'סופר', 'חינוך', 'בריאות', 'אחר'],
    defaultUsers: ['אני', 'בן/בת זוג', 'ילד 1', 'ילד 2'],
    icon: 'people',
  },
  {
    type: 'custom',
    title: 'מותאם אישית',
    description: 'יצירת הגדרות מותאמות אישית',
    defaultCategories: ['קטגוריה 1', 'קטגוריה 2', 'קטגוריה 3'],
    defaultUsers: ['אני', 'משתמש 1', 'משתמש 2'],
    icon: 'settings',
  },
];

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (config: OnboardingConfig, customCategories: string[], customUsers: string[]) => void;
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const [selectedType, setSelectedType] = useState<OnboardingConfig | null>(null);
  const [step, setStep] = useState<'type' | 'customize'>('type');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customUsers, setCustomUsers] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newUser, setNewUser] = useState('');

  const handleTypeSelect = (config: OnboardingConfig) => {
    setSelectedType(config);
    if (config.type === 'custom') {
      setStep('customize');
    } else {
      // Use default configuration
      onComplete(config, config.defaultCategories, config.defaultUsers);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
      setCustomCategories(prev => [...prev, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setCustomCategories(prev => prev.filter(c => c !== category));
  };

  const handleAddUser = () => {
    if (newUser.trim() && !customUsers.includes(newUser.trim())) {
      setCustomUsers(prev => [...prev, newUser.trim()]);
      setNewUser('');
    }
  };

  const handleRemoveUser = (user: string) => {
    setCustomUsers(prev => prev.filter(u => u !== user));
  };

  const handleComplete = () => {
    if (!selectedType) return;

    const finalCategories = customCategories.length > 0 ? customCategories : selectedType.defaultCategories;
    const finalUsers = customUsers.length > 0 ? customUsers : selectedType.defaultUsers;

    if (finalUsers.length === 0) {
      Alert.alert('שגיאה', 'אנא הוסף לפחות משתמש אחד');
      return;
    }

    onComplete(selectedType, finalCategories, finalUsers);
  };

  const handleBack = () => {
    setStep('type');
    setSelectedType(null);
    setCustomCategories([]);
    setCustomUsers([]);
  };

  const renderTypeSelection = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <ThemedText type="title" style={styles.welcomeTitle}>
          ברוכים הבאים!
        </ThemedText>
        <ThemedText style={styles.welcomeSubtitle}>
          בחר את סוג ניהול ההוצאות שלך
        </ThemedText>
      </View>

      <View style={styles.optionsContainer}>
        {ONBOARDING_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={styles.optionCard}
            onPress={() => handleTypeSelect(option)}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon as any} size={32} color="#007AFF" />
            </View>
            <View style={styles.optionContent}>
              <ThemedText type="subtitle" style={styles.optionTitle}>
                {option.title}
              </ThemedText>
              <ThemedText style={styles.optionDescription}>
                {option.description}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderCustomization = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <ThemedText type="title" style={styles.welcomeTitle}>
          התאמה אישית
        </ThemedText>
        <ThemedText style={styles.welcomeSubtitle}>
          הגדר קטגוריות ומשתמשים
        </ThemedText>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          קטגוריות הוצאות
        </ThemedText>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newCategory}
            onChangeText={setNewCategory}
            placeholder="הוסף קטגוריה חדשה"
            placeholderTextColor="#999"
            textAlign="right"
          />
          <TouchableOpacity onPress={handleAddCategory} style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {customCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={styles.tag}
              onPress={() => handleRemoveCategory(category)}
            >
              <ThemedText style={styles.tagText}>{category}</ThemedText>
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Users Section */}
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          משתמשים
        </ThemedText>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newUser}
            onChangeText={setNewUser}
            placeholder="הוסף משתמש חדש"
            placeholderTextColor="#999"
            textAlign="right"
          />
          <TouchableOpacity onPress={handleAddUser} style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {customUsers.map((user) => (
            <TouchableOpacity
              key={user}
              style={styles.tag}
              onPress={() => handleRemoveUser(user)}
            >
              <ThemedText style={styles.tagText}>{user}</ThemedText>
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleComplete} style={styles.completeButton}>
          <ThemedText style={styles.completeButtonText}>השלם הגדרה</ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          {step === 'customize' && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          <ThemedText type="subtitle" style={styles.headerTitle}>
            {step === 'type' ? 'בחר סוג' : 'התאמה אישית'}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {step === 'type' ? renderTypeSelection() : renderCustomization()}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    marginRight: 8,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 32,
    marginBottom: 32,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 