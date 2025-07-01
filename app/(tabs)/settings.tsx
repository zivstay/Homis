import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingModal } from '@/components/OnboardingModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useExpenses } from '@/contexts/ExpenseContext';

export default function SettingsScreen() {
  const {
    onboardingConfig,
    isOnboardingComplete,
    completeOnboarding,
    users,
    quickCategories,
    addUser,
    removeUser,
    addQuickCategory,
    deleteQuickCategory,
  } = useExpenses();

  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

  const getConfigTitle = () => {
    if (!onboardingConfig) return 'לא מוגדר';
    
    switch (onboardingConfig.type) {
      case 'roommates':
        return 'שותפים לדירה';
      case 'travelers':
        return 'מטיילים';
      case 'couple':
        return 'זוג';
      case 'family':
        return 'משפחה';
      case 'custom':
        return 'מותאם אישית';
      default:
        return 'לא מוגדר';
    }
  };

  const getConfigIcon = () => {
    if (!onboardingConfig) return 'settings';
    return onboardingConfig.icon;
  };

  const handleChangeConfiguration = () => {
    setIsOnboardingVisible(true);
  };

  const handleOnboardingComplete = (config: any, categories: string[], usersList: string[]) => {
    completeOnboarding(config, categories, usersList);
    setIsOnboardingVisible(false);
  };

  const handleResetApp = () => {
    Alert.alert(
      'איפוס האפליקציה',
      'האם אתה בטוח שברצונך לאפס את כל הנתונים? פעולה זו לא ניתנת לביטול.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אפס',
          style: 'destructive',
          onPress: () => {
            // Reset the app by setting onboarding to false
            // This will trigger the onboarding flow again
            Alert.alert('איפוס הושלם', 'האפליקציה תתאפס בעת הפעלה מחדש');
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    showArrow: boolean = true
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color="#007AFF" />
      </View>
      <View style={styles.settingContent}>
        <ThemedText type="subtitle" style={styles.settingTitle}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={styles.settingSubtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            הגדרות
          </ThemedText>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Configuration Section */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              הגדרות כלליות
            </ThemedText>
            
            {renderSettingItem(
              getConfigIcon(),
              'סוג ניהול הוצאות',
              getConfigTitle(),
              handleChangeConfiguration
            )}
          </View>

          {/* Users Section */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              משתמשים ({users.length})
            </ThemedText>
            
            {users.map((user, index) => (
              <View key={index} style={styles.userItem}>
                <View style={styles.userIcon}>
                  <Ionicons name="person" size={20} color="#007AFF" />
                </View>
                <ThemedText style={styles.userName}>{user}</ThemedText>
                {user !== 'אני' && (
                  <TouchableOpacity
                    onPress={() => removeUser(user)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Categories Section */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              קטגוריות מהירות ({quickCategories.length})
            </ThemedText>
            
            {quickCategories.map((category) => (
              <View key={category.id} style={styles.categoryItem}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={20} color={category.color} />
                </View>
                <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
                <TouchableOpacity
                  onPress={() => deleteQuickCategory(category.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              אזור מסוכן
            </ThemedText>
            
            {renderSettingItem(
              'trash',
              'איפוס האפליקציה',
              'מחק את כל הנתונים והתחל מחדש',
              handleResetApp,
              false
            )}
          </View>
        </ScrollView>

        <OnboardingModal
          visible={isOnboardingVisible}
          onComplete={handleOnboardingComplete}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  userIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
}); 