import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { showAdConsentModal } from '../components/AdConsentModal';
import { uploadExpenseImage } from '../config/api';
import { getAllAvailableCategories, getBoardTypeById } from '../constants/boardTypes';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { useTutorial } from '../contexts/TutorialContext';
import { adManager } from '../services/adManager';
import { adMobService } from '../services/admobService';
import { apiService, Category } from '../services/api';

const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedBoard, boardMembers, refreshBoardExpenses } = useBoard();
  const { user } = useAuth();
  const { refreshBoardCategories } = useExpenses();
  const { setCurrentScreen, checkScreenTutorial, startTutorial } = useTutorial();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaidBy, setSelectedPaidBy] = useState('');
  const [selectedOtherCategory, setSelectedOtherCategory] = useState('');

  const [isRecurring, setIsRecurring] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const boardType = selectedBoard ? getBoardTypeById(selectedBoard.board_type) : null;
  const quickCategories = boardType?.quickCategories || [];

  // Get preselected category from navigation params
  const params = route.params as { preselectedCategory?: string } | undefined;
  const preselectedCategory = params?.preselectedCategory;

  // Update tutorial context when this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎓 AddExpenseScreen: Setting tutorial screen to AddExpense');
      setCurrentScreen('AddExpense');
      
      // Refresh categories when screen is focused (in case they were updated in settings)
      if (selectedBoard) {
        loadCategories();
        refreshBoardCategories();
      }
      
      // Check if we should show tutorial for this screen
      const checkAndStartTutorial = async () => {
        try {
          console.log('🎓 AddExpenseScreen: About to check tutorial for AddExpense screen');
          const shouldShow = await checkScreenTutorial('AddExpense');
          console.log('🎓 AddExpenseScreen: checkScreenTutorial returned:', shouldShow);
          
          if (shouldShow) {
            console.log('🎓 AddExpenseScreen: Starting tutorial now');
            startTutorial();
          } else {
            console.log('🎓 AddExpenseScreen: Not starting tutorial - already completed or error');
          }
        } catch (error) {
          console.error('🎓 AddExpenseScreen: Error in checkAndStartTutorial:', error);
        }
      };
      
      // Add a small delay to let the screen settle
      setTimeout(() => {
        checkAndStartTutorial();
      }, 500);
    }, [setCurrentScreen, checkScreenTutorial, startTutorial, selectedBoard, refreshBoardCategories])
  );

  useEffect(() => {
    if (selectedBoard) {
      loadCategories();
      // Set current user as default payer
      if (user) {
        setSelectedPaidBy(user.id);
      }
    }
    
    // Preload rewarded ad for expense creation
    adManager.checkCanShowAd().then(canShow => {
      if (canShow && adMobService.isAvailable()) {
        console.log('🎯 AddExpenseScreen: Preloading rewarded ad...');
        adMobService.preloadRewardedAd();
      }
    });
  }, [selectedBoard, user, preselectedCategory]);

  const loadCategories = async () => {
    if (!selectedBoard) return;

    try {
      const result = await apiService.getBoardCategories(selectedBoard.id);
      if (result.success && result.data) {
        setCategories(result.data.categories);
        
        // Use preselected category if provided
        if (preselectedCategory) {
          setSelectedCategory(preselectedCategory);
          setDescription(preselectedCategory); // Set description to category name
        } else {
          // Set first quick category as default if available
          if (quickCategories.length > 0) {
            setSelectedCategory(quickCategories[0].name);
          } else if (result.data.categories.length > 0) {
            setSelectedCategory(result.data.categories[0].name);
          }
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    // Reset other category selection when main category changes
    if (categoryName !== 'אחר') {
      setSelectedOtherCategory('');
    }
    // Set description to category name if description is empty
    if (!description.trim()) {
      setDescription(categoryName);
    }
  };

  const handleOtherCategorySelect = (categoryName: string) => {
    setSelectedOtherCategory(categoryName);
    // Update description if it was set to "אחר"
    if (description.trim() === 'אחר' || !description.trim()) {
      setDescription(categoryName);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBoard || !user) return;

    if (!amount || !selectedCategory || !selectedPaidBy) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('שגיאה', 'נא להזין סכום תקין');
      return;
    }

    // בדוק אם ניתן להציג פרסומת
    const canShowAd = await adManager.checkCanShowAd();
    
    if (canShowAd) {
      // הצג הודעה למשתמש לפני הפרסומת
      const userConsent = await showAdConsentModal();

      if (!userConsent) {
        // המשתמש לא הסכים לצפות בפרסומת - לא יוצרים הוצאה
        Alert.alert(
          'אוקיי, לא נורא! 😊',
          'ההוצאה לא תתווסף כרגע. תוכל לנסות שוב בהמשך! 😊'
        );
        return;
      }

      // המשתמש הסכים - מציגים פרסומת מוטבלת
      setIsLoading(true);
      console.log('🎯 User agreed, showing rewarded ad...');
      
      const adWatched = await adManager.showRewardedAdIfAllowed('expense_creation_rewarded');
      
      if (adWatched) {
        console.log('🎯 User watched the full ad, creating expense...');
        // המשתמש צפה בפרסומת עד הסוף - יוצרים את ההוצאה
        await createExpense(amountValue);
      } else {
        console.log('🎯 User did not complete the ad');
        // המשתמש לא צפה בפרסומת עד הסוף - לא יוצרים הוצאה
        setIsLoading(false);
        Alert.alert(
          'הפרסומת לא הושלמה',
          'כדי להוסיף את ההוצאה, אנא צפה בפרסומת עד הסוף. תוכל לנסות שוב! 😊'
        );
        return;
      }
    } else {
      // לא ניתן להציג פרסומת בגלל cooldown - יוצרים הוצאה ללא פרסומת
      console.log('🎯 Cannot show ad due to cooldown, creating expense without ad');
      setIsLoading(true);
      await createExpense(amountValue);
    }
  };

  // פונקציה ליצירת ההוצאה
  const createExpense = async (amountValue: number) => {
    if (!selectedBoard) return; // בדיקת בטיחות נוספת
    
    try {
      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (selectedImage && !imageUrl) {
          // Upload failed, but continue without image
          Alert.alert('הודעה', 'העלאת התמונה נכשלה, ההוצאה תישמר ללא תמונה');
        }
      }

      // Determine the final category to use
      const finalCategory = selectedCategory === 'אחר' && selectedOtherCategory 
        ? selectedOtherCategory 
        : selectedCategory;

      const expenseData = {
        amount: amountValue,
        category: finalCategory,
        description: description.trim(),
        paid_by: selectedPaidBy,
        date: new Date().toISOString(),
        is_recurring: isRecurring,
        frequency: 'monthly',
        tags: [],
        image_url: imageUrl,
      };

      const result = await apiService.createExpense(selectedBoard.id, expenseData);
      
      if (result.success) {
        // Refresh board expenses to get the updated list
        await refreshBoardExpenses();
        
        // הצג הודעת הצלחה ונחזור למסך הקודם
        Alert.alert('', 'ההוצאה נוספה בהצלחה! 🎉', [
          { 
            text: 'מעולה!', 
            onPress: () => {
              navigation.goBack();
            }
          }
        ]);
      } else {
        Alert.alert('שגיאה', result.error || 'שגיאה בהוספת ההוצאה');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      Alert.alert('שגיאה', 'שגיאה בהוספת ההוצאה');
    } finally {
      setIsLoading(false);
    }
  };

  const getMemberName = (userId: string) => {
    const member = boardMembers.find(m => m.user_id === userId);
    return member ? `${member.user.first_name} ${member.user.last_name}` : 'לא ידוע';
  };

  // Image upload functions
  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const token = apiService.getAccessToken();
      return await uploadExpenseImage(imageUri, token || undefined);
    } catch (error) {
      Alert.alert('שגיאה', error instanceof Error ? error.message : 'שגיאה בהעלאת התמונה');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const pickImage = async () => {
    // Check current permissions
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // If permissions not granted, request them
    if (existingStatus !== 'granted') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'הרשאה נדרשת',
        'אנא אפשר גישה לגלריה בהגדרות האפליקציה כדי לבחור תמונה',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'פתח הגדרות', onPress: () => {
            // Open app settings on both iOS and Android
            Linking.openSettings();
          }}
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    // Check current permissions
    const { status: existingStatus } = await ImagePicker.getCameraPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // If permissions not granted, request them
    if (existingStatus !== 'granted') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'הרשאה נדרשת',
        'אנא אפשר גישה למצלמה בהגדרות האפליקציה כדי לצלם תמונה',
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'פתח הגדרות', onPress: () => {
            // Open app settings on both iOS and Android
            Linking.openSettings();
          }}
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'הוסף תמונה',
      'בחר אופציה',
      [
        { text: 'מצלמה', onPress: takePhoto },
        { text: 'גלריה', onPress: pickImage },
        { text: 'בטל', style: 'cancel' },
      ]
    );
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const renderOtherCategorySelector = () => {
    if (selectedCategory !== 'אחר') {
      return null;
    }

    // Get all available categories from the system
    const allAvailableCategories = getAllAvailableCategories();
    
    // Filter out categories that are already in the board's main categories
    const boardCategoryNames = new Set(categories.map(cat => cat.name));
    const additionalCategories = allAvailableCategories.filter(cat => 
      !boardCategoryNames.has(cat.name) && cat.name !== 'אחר'
    );

    if (additionalCategories.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>בחר קטגוריה ספציפית (אופציונלי)</Text>
        <Text style={styles.sectionSubtitle}>
          אתה יכול לבחור קטגוריה ספציפית או להשאיר "אחר"
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.otherCategoriesScroll}
          contentContainerStyle={styles.otherCategoriesContainer}
        >
          {additionalCategories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.otherCategoryButton,
                { backgroundColor: category.color },
                selectedOtherCategory === category.name && styles.selectedOtherCategoryButton,
              ]}
              onPress={() => handleOtherCategorySelect(category.name)}
            >
              <Text style={styles.otherCategoryIcon}>{category.icon}</Text>
              <Text 
                style={styles.otherCategoryText}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {selectedOtherCategory && (
          <TouchableOpacity
            style={styles.clearOtherCategoryButton}
            onPress={() => {
              setSelectedOtherCategory('');
              if (description.trim() === selectedOtherCategory) {
                setDescription('אחר');
              }
            }}
          >
            <Text style={styles.clearOtherCategoryText}>נקה בחירה ותשאר עם "אחר"</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCategoryButtons = () => {
    // Only use categories from server (selected in settings)
    let displayCategories: Array<{ name: string; icon: string; color: string }> = [];
    
    // Add categories from server (these are the ones selected in settings)
    categories.forEach(category => {
      displayCategories.push({
        name: category.name,
        icon: category.icon,
        color: category.color
      });
    });
    
    // Limit to max 7 categories (keeping space for "אחר")
    const maxCategories = 7;
    if (displayCategories.length > maxCategories) {
      displayCategories = displayCategories.slice(0, maxCategories);
    }
    
    // Always add "אחר" as the last option
    displayCategories.push({
      name: 'אחר',
      icon: '📝',
      color: '#95A5A6'
    });
    
    if (displayCategories.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>קטגוריה</Text>
        <View style={styles.quickButtonsContainer}>
          {displayCategories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickButton,
                { backgroundColor: category.color },
                selectedCategory === category.name && styles.selectedQuickButton,
              ]}
              onPress={() => handleCategorySelect(category.name)}
            >
              <Text style={styles.quickButtonIcon}>{category.icon}</Text>
              <Text style={styles.quickButtonText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPaidBySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>שולם על ידי</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.memberContainer}>
          {boardMembers.map((member) => (
            <TouchableOpacity
              key={member.user_id}
              style={[
                styles.memberButton,
                selectedPaidBy === member.user_id && styles.selectedMemberButton,
              ]}
              onPress={() => setSelectedPaidBy(member.user_id)}
            >
              <Text
                style={[
                  styles.memberButtonText,
                  selectedPaidBy === member.user_id && styles.selectedMemberButtonText,
                ]}
              >
                {member.user.first_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {renderCategoryButtons()}
            {renderOtherCategorySelector()}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>סכום</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>תיאור (אופציונלי)</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                placeholder="תיאור ההוצאה..."
                multiline
                numberOfLines={3}
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            </View>

            {renderPaidBySelector()}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>תמונה (אופציונלי)</Text>
              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                  <TouchableOpacity onPress={removeImage} style={styles.removeImageButton}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.imageUploadButton} 
                  onPress={showImageOptions}
                  disabled={isUploading}
                >
                  <Ionicons name="camera" size={24} color="#007AFF" />
                  <Text style={styles.imageUploadText}>
                    {isUploading ? 'מעלה...' : 'הוסף תמונה'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* <View style={styles.section}>
              <TouchableOpacity
                style={styles.recurringContainer}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <View style={[styles.checkbox, isRecurring && styles.checkedCheckbox]}>
                  {isRecurring && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.recurringText}>הוצאה חוזרת</Text>
              </TouchableOpacity>
            </View> */}
          </View>
        </ScrollView>

        {/* Fixed buttons at bottom */}
        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>בטל</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'מוסיף...' : 'הוסף הוצאה'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1, // This ensures the content fills the available space
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16, // Increased from 8 to 16
    marginBottom: 16, // Increased from 8 to 16
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 16, // Reduced back from 24 to 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },

  quickButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedQuickButton: {
    borderWidth: 3,
    borderColor: '#2c3e50',
  },
  quickButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  memberContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  memberButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: 'white',
  },
  selectedMemberButton: {
    borderColor: '#3498db',
    backgroundColor: '#ebf3fd',
  },
  memberButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  selectedMemberButtonText: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  recurringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recurringText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 30, // Increased from 25 to 30 for even more rounded appearance
    padding: 18, // Increased padding for better touch area
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 5,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageUploadText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 30, // Increased from 25 to 30 for even more rounded appearance
    padding: 18, // Increased padding for better touch area
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  otherCategoriesScroll: {
    maxHeight: 140,
  },
  otherCategoriesContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  otherCategoryButton: {
    width: 100,
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 4,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedOtherCategoryButton: {
    borderWidth: 3,
    borderColor: '#2c3e50',
    shadowColor: '#2c3e50',
    shadowOpacity: 0.3,
  },
  otherCategoryIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  otherCategoryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
    flexShrink: 1,
    maxWidth: '100%',
  },
  clearOtherCategoryButton: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'center',
  },
  clearOtherCategoryText: {
    color: '#7f8c8d',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 60, // Increased from 40 to 60
  },
  fixedButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20, // Added vertical padding
    paddingBottom: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default AddExpenseScreen; 