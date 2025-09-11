import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
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
import { getAllAvailableCategories, getBoardTypeById, WorkExpenseData, WorkItem } from '../constants/boardTypes';
import { useAuth } from '../contexts/AuthContext';
import { useBoard } from '../contexts/BoardContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { useTutorial } from '../contexts/TutorialContext';
import { adManager } from '../services/adManager';
import { adMobService } from '../services/admobService';
import { apiService, Category } from '../services/api';
import { localStorageService } from '../services/localStorageService';

const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedBoard, boardMembers, refreshBoardExpenses } = useBoard();
  const { user, isGuestMode } = useAuth();
  const { refreshBoardCategories, quickCategories: expenseQuickCategories } = useExpenses();
  const { setCurrentScreen, checkScreenTutorial, startTutorial } = useTutorial();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaidBy, setSelectedPaidBy] = useState('');
  const [selectedOtherCategory, setSelectedOtherCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Work management specific states
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [location, setLocation] = useState('');
  const [showWorkItemModal, setShowWorkItemModal] = useState(false);
  const [selectedWorkCategory, setSelectedWorkCategory] = useState('');
  const [workItemPrice, setWorkItemPrice] = useState('');
  const [workItemDescription, setWorkItemDescription] = useState('');
  const [workItemHours, setWorkItemHours] = useState('');

  const boardType = selectedBoard ? getBoardTypeById(selectedBoard.board_type) : null;
  const quickCategories = boardType?.quickCategories || [];
  const isWorkManagement = selectedBoard?.board_type === 'work_management';

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
      // Set current user as default payer, but allow changing to other board members
      if (user && !isGuestMode) {
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

  // Separate useEffect for guest mode categories to avoid infinite loops
  useEffect(() => {
    if (isGuestMode && selectedBoard && expenseQuickCategories.length > 0) {
      loadCategories();
    }
  }, [isGuestMode, expenseQuickCategories.length]); // Only depend on length to avoid infinite loops

  const loadCategories = async () => {
    if (!selectedBoard) return;

    try {
      if (isGuestMode) {
        // In guest mode, use quickCategories from ExpenseContext
        if (expenseQuickCategories.length > 0) {
          // Convert quickCategories to Category format
          const guestCategories = expenseQuickCategories.map(cat => ({
            id: cat.id || cat.name,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            board_id: selectedBoard.id,
            created_by: 'guest',
            created_at: new Date().toISOString(),
            is_default: false,
            is_active: true,
          }));
          
          setCategories(guestCategories);
          
          // Use preselected category if provided
          if (preselectedCategory) {
            setSelectedCategory(preselectedCategory);
          } else {
            // Set first category as default (excluding "אחר")
            const firstCategory = guestCategories.find(cat => cat.name !== 'אחר');
            if (firstCategory) {
              setSelectedCategory(firstCategory.name);
            }
          }
        }
      } else {
        // Regular mode - use API
        const result = await apiService.getBoardCategories(selectedBoard.id);
        if (result.success && result.data) {
          setCategories(result.data.categories);
          
          // Use preselected category if provided
          if (preselectedCategory) {
            setSelectedCategory(preselectedCategory);
            // Don't auto-fill description with category name
          } else {
            // Set first quick category as default if available
            if (quickCategories.length > 0) {
              setSelectedCategory(quickCategories[0].name);
            } else if (result.data.categories.length > 0) {
              setSelectedCategory(result.data.categories[0].name);
            }
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
    // Don't auto-fill description with category name
  };

  const handleOtherCategorySelect = (categoryName: string) => {
    setSelectedOtherCategory(categoryName);
    // Don't auto-fill description with category name
  };

  // Work management functions
  const handleWorkCategorySelect = (categoryName: string) => {
    setSelectedWorkCategory(categoryName);
    setShowWorkItemModal(true);
  };

  const handleAddWorkItem = () => {
    if (!selectedWorkCategory) {
      Alert.alert('שגיאה', 'נא לבחור סוג עבודה');
      return;
    }

    // מחיר הוא אופציונלי - אם לא הוזן, נשתמש ב-0
    const priceValue = workItemPrice ? parseFloat(workItemPrice) : 0;
    if (workItemPrice && (isNaN(priceValue) || priceValue < 0)) {
      Alert.alert('שגיאה', 'נא להזין מחיר תקין');
      return;
    }

    const hoursValue = workItemHours ? parseFloat(workItemHours) : undefined;
    if (workItemHours && (isNaN(hoursValue!) || hoursValue! <= 0)) {
      Alert.alert('שגיאה', 'נא להזין מספר שעות תקין');
      return;
    }

    const newWorkItem: WorkItem = {
      id: Date.now().toString(),
      category: selectedWorkCategory,
      price: priceValue,
      description: workItemDescription.trim() || undefined,
      hours: hoursValue,
    };

    setWorkItems(prev => [...prev, newWorkItem]);
    
    // Clear modal fields
    setSelectedWorkCategory('');
    setWorkItemPrice('');
    setWorkItemDescription('');
    setWorkItemHours('');
    setShowWorkItemModal(false);
  };

  const handleRemoveWorkItem = (itemId: string) => {
    setWorkItems(prev => prev.filter(item => item.id !== itemId));
  };

  const getTotalWorkAmount = () => {
    return workItems.reduce((total, item) => total + item.price, 0);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleSubmit = async () => {
    console.log('🔍 AddExpenseScreen: handleSubmit called, isGuestMode:', isGuestMode);
    
    if (!selectedBoard) {
      console.log('🔍 AddExpenseScreen: No selected board');
      return;
    }

    // For guest mode, we don't need a user object
    if (!isGuestMode && !user) {
      console.log('🔍 AddExpenseScreen: No user and not in guest mode');
      return;
    }

    // Different validation for work management
    if (isWorkManagement) {
      if (workItems.length === 0) {
        Alert.alert('שגיאה', 'נא להוסיף לפחות עבודה אחת');
        return;
      }
      if (!clientName.trim()) {
        Alert.alert('שגיאה', 'נא להזין שם לקוח');
        return;
      }
      if (!location.trim()) {
        Alert.alert('שגיאה', 'נא להזין מיקום');
        return;
      }
    } else {
      if (!amount || !selectedCategory) {
        Alert.alert('שגיאה', 'נא למלא את כל השדות הנדרשים');
        return;
      }

      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        Alert.alert('שגיאה', 'נא להזין סכום תקין');
        return;
      }
    }

    // בדוק אם ניתן להציג פרסומת (גם במצב אורח)
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
      
      const adResult = await adManager.showRewardedAdWithResult('expense_creation_rewarded');
      
      console.log('🎯 AddExpenseScreen: Ad result received:', {
        success: adResult.success,
        reason: adResult.reason,
        message: adResult.message
      });
      
      if (adResult.success && adResult.reason === 'completed') {
        console.log('🎯 User watched the full ad, creating expense...');
        // המשתמש צפה בפרסומת עד הסוף - יוצרים את ההוצאה
        await createExpense(isWorkManagement ? getTotalWorkAmount() : parseFloat(amount));
      } else if (adResult.reason === 'user_cancelled') {
        console.log('🎯 User did not complete the ad');
        // המשתמש לא צפה בפרסומת עד הסוף - לא יוצרים הוצאה
        setIsLoading(false);
        Alert.alert(
          'הפרסומת לא הושלמה',
          'כדי להוסיף את ההוצאה, אנא צפה בפרסומת עד הסוף. תוכל לנסות שוב! 😊'
        );
        return;
      } else {
        // שגיאה טכנית או פרסומת לא זמינה - יוצרים הוצאה בכל מקרה
        console.log('🎯 Technical error or ad unavailable, creating expense anyway. Reason:', adResult.reason, 'Message:', adResult.message);
        await createExpense(isWorkManagement ? getTotalWorkAmount() : parseFloat(amount));
      }
    } else {
      // לא ניתן להציג פרסומת בגלל cooldown - יוצרים הוצאה ללא פרסומת
      console.log('🎯 Cannot show ad due to cooldown, creating expense without ad (isGuestMode:', isGuestMode, ')');
      setIsLoading(true);
      await createExpense(isWorkManagement ? getTotalWorkAmount() : parseFloat(amount));
    }
  };

  // פונקציה ליצירת ההוצאה
  const createExpense = async (amountValue: number) => {
    console.log('🔍 AddExpenseScreen: createExpense called, isGuestMode:', isGuestMode, 'selectedBoard:', selectedBoard?.id);
    
    if (!selectedBoard) {
      console.log('🔍 AddExpenseScreen: No selected board in createExpense');
      return;
    }
    
    try {
      if (isWorkManagement) {
        // Work management mode
        console.log('🔍 AddExpenseScreen: Work management mode');
        
        const workExpenseData: WorkExpenseData = {
          workItems,
          clientName: clientName.trim(),
          location: location.trim(),
          totalAmount: amountValue,
          workDate: selectedDate.toISOString(),
          description: description.trim() || undefined,
          image_url: selectedImage || undefined,
        };

        if (isGuestMode) {
          console.log('🔍 AddExpenseScreen: Guest mode - saving work data to local storage');
          const expenseData = {
            board_id: selectedBoard.id,
            amount: amountValue,
            description: `עבודה עבור ${clientName} ב${location}`,
            category: 'עבודה',
            date: selectedDate.toISOString(),
            payer_id: 'guest',
            split_type: 'equal',
            split_data: {},
            work_data: workExpenseData,
          };
          
          console.log('🔍 AddExpenseScreen: Saving work expense data:', expenseData);
          
          await localStorageService.saveExpense(expenseData);
        } else {
          // Regular mode for work management
          const expenseData = {
            amount: amountValue,
            category: 'עבודה',
            description: `עבודה עבור ${clientName} ב${location}`,
            paid_by: selectedPaidBy,
            date: selectedDate.toISOString(),
            is_recurring: false,
            frequency: 'monthly',
            tags: [],
            image_url: selectedImage,
            work_data: workExpenseData,
          };

          const result = await apiService.createExpense(selectedBoard.id, expenseData);
          
          if (result.success) {
            // Refresh board expenses to get the updated list
            await refreshBoardExpenses();
            
            // הצג הודעת הצלחה ונחזור למסך הקודם
            Alert.alert('', 'העבודה נוספה בהצלחה! 🎉', [
              { 
                text: 'מעולה!', 
                onPress: () => {
                  navigation.goBack();
                }
              }
            ]);
            return;
          } else {
            Alert.alert('שגיאה', result.error || 'שגיאה בהוספת העבודה');
            return;
          }
        }
      } else {
        // Regular expense mode
        // Determine the final category to use
        const finalCategory = selectedCategory === 'אחר' && selectedOtherCategory 
          ? selectedOtherCategory 
          : selectedCategory;

        console.log('🔍 AddExpenseScreen: Final category:', finalCategory, 'Amount:', amountValue);

        if (isGuestMode) {
          console.log('🔍 AddExpenseScreen: Guest mode - saving to local storage');
          // Guest mode - save to local storage
          const expenseData = {
            board_id: selectedBoard.id,
            amount: amountValue,
            description: description.trim(),
            category: finalCategory,
            date: selectedDate.toISOString(),
            payer_id: 'guest',
            split_type: 'equal',
            split_data: {},
          };
          
          console.log('🔍 AddExpenseScreen: Saving expense data:', expenseData);
          
          await localStorageService.saveExpense(expenseData);
          
          console.log('🔍 AddExpenseScreen: Expense saved successfully, refreshing board expenses');
          
          // Refresh board expenses to get the updated list
          await refreshBoardExpenses();
          
          console.log('🔍 AddExpenseScreen: Board expenses refreshed, showing success alert');
          
        } else {
          // Regular mode - use API
          // Upload image if selected
          let imageUrl = null;
          if (selectedImage) {
            imageUrl = await uploadImage(selectedImage);
            if (selectedImage && !imageUrl) {
              // Upload failed, but continue without image
              Alert.alert('הודעה', 'העלאת התמונה נכשלה, ההוצאה תישמר ללא תמונה');
            }
          }

          const expenseData = {
            amount: amountValue,
            category: finalCategory,
            description: description.trim(),
            paid_by: selectedPaidBy,
            date: selectedDate.toISOString(),
            is_recurring: isRecurring,
            frequency: 'monthly',
            tags: [],
            image_url: imageUrl,
          };

          const result = await apiService.createExpense(selectedBoard.id, expenseData);
          
          if (result.success) {
            // Refresh board expenses to get the updated list
            await refreshBoardExpenses();
            
          } else {
            Alert.alert('שגיאה', result.error || 'שגיאה בהוספת ההוצאה');
            return;
          }
        }
      }
      
      // Success message for both guest and regular modes
      Alert.alert('', isWorkManagement ? 'העבודה נוספה בהצלחה! 🎉' : 'ההוצאה נוספה בהצלחה! 🎉', [
        { 
          text: 'מעולה!', 
          onPress: () => {
            console.log('🔍 AddExpenseScreen: User pressed OK, navigating back');
            navigation.goBack();
          }
        }
      ]);
    } catch (error) {
      console.error('🔍 AddExpenseScreen: Error creating expense:', error);
      Alert.alert('שגיאה', 'שגיאה בהוספת ההוצאה');
    } finally {
      console.log('🔍 AddExpenseScreen: Setting isLoading to false');
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
                // Don't auto-fill description
              }}
            >
            <Text style={styles.clearOtherCategoryText}>נקה בחירה ותשאר עם "אחר"</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPayerSelector = () => {
    if (isGuestMode) {
      return null; // In guest mode, we don't show payer selection
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>מי משלם?</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.payerScroll}
          contentContainerStyle={styles.payerContainer}
        >
          {boardMembers.map((member) => (
            <TouchableOpacity
              key={member.user_id}
              style={[
                styles.payerButton,
                selectedPaidBy === member.user_id && styles.selectedPayerButton,
              ]}
              onPress={() => setSelectedPaidBy(member.user_id)}
            >
              <Text style={styles.payerIcon}>👤</Text>
              <Text style={styles.payerText} numberOfLines={2}>
                {`${member.user.first_name} ${member.user.last_name}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderWorkManagementForm = () => {
    return (
      <>
        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי עבודה</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="תיאור כללי של העבודה..."
            multiline
            numberOfLines={2}
            textAlign="right"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit={true}
          />
        </View>

        {/* Work Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סוג עבודה</Text>
          <View style={styles.quickButtonsContainer}>
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quickButton,
                  { backgroundColor: category.color },
                ]}
                onPress={() => handleWorkCategorySelect(category.name)}
              >
                <Text style={styles.quickButtonIcon}>{category.icon}</Text>
                <Text style={styles.quickButtonText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Work Items List */}
        {workItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ביצוע</Text>
            {workItems.map((item) => (
              <View key={item.id} style={styles.workItemCard}>
                <View style={styles.workItemHeader}>
                  <Text style={styles.workItemCategory}>{item.category}</Text>
                  <TouchableOpacity onPress={() => handleRemoveWorkItem(item.id)}>
                    <Text style={styles.removeWorkItemButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.workItemPrice}>₪{item.price}</Text>
                {item.description && (
                  <Text style={styles.workItemDescription}>{item.description}</Text>
                )}
                {item.hours && (
                  <Text style={styles.workItemHours}>{item.hours} שעות</Text>
                )}
              </View>
            ))}
            <View style={styles.totalWorkAmount}>
              <Text style={styles.totalWorkAmountText}>סה"כ: ₪{getTotalWorkAmount()}</Text>
            </View>
          </View>
        )}

        {/* Client Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>שם לקוח</Text>
          <TextInput
            style={styles.textInput}
            value={clientName}
            onChangeText={setClientName}
            placeholder="הזן שם לקוח..."
            textAlign="right"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit={true}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>מיקום</Text>
          <TextInput
            style={styles.textInput}
            value={location}
            onChangeText={setLocation}
            placeholder="הזן מיקום..."
            textAlign="right"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit={true}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>תאריך</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Image */}
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
      </>
    );
  };

  const renderRegularForm = () => {
    return (
      <>
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

        {renderPayerSelector()}

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>תאריך ההוצאה</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

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
      </>
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
            {isWorkManagement ? renderWorkManagementForm() : renderRegularForm()}
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
              {isLoading ? (isWorkManagement ? 'מוסיף עבודה...' : 'מוסיף...') : (isWorkManagement ? 'הוסף עבודה' : 'הוסף הוצאה')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Work Item Modal */}
      <Modal
        visible={showWorkItemModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkItemModal(false)}
      >
        <View style={styles.workItemModalOverlay}>
          <View style={styles.workItemModalContent}>
            <Text style={styles.workItemModalTitle}>הוסף עבודה - {selectedWorkCategory}</Text>
            
            <View style={styles.workItemModalSection}>
              <Text style={styles.workItemModalLabel}>מחיר (אופציונלי)</Text>
              <TextInput
                style={styles.workItemModalInput}
                value={workItemPrice}
                onChangeText={setWorkItemPrice}
                placeholder="0.00"
                keyboardType="numeric"
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            </View>

            <View style={styles.workItemModalSection}>
              <Text style={styles.workItemModalLabel}>תיאור (אופציונלי)</Text>
              <TextInput
                style={styles.workItemModalInput}
                value={workItemDescription}
                onChangeText={setWorkItemDescription}
                placeholder="פרטים נוספים..."
                textAlign="right"
                multiline
                numberOfLines={2}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            </View>

            <View style={styles.workItemModalSection}>
              <Text style={styles.workItemModalLabel}>שעות עבודה (אופציונלי)</Text>
              <TextInput
                style={styles.workItemModalInput}
                value={workItemHours}
                onChangeText={setWorkItemHours}
                placeholder="מספר שעות..."
                keyboardType="numeric"
                textAlign="right"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            </View>

            <View style={styles.workItemModalButtons}>
              <TouchableOpacity
                style={styles.workItemModalCancelButton}
                onPress={() => {
                  setShowWorkItemModal(false);
                  setSelectedWorkCategory('');
                  setWorkItemPrice('');
                  setWorkItemDescription('');
                  setWorkItemHours('');
                }}
              >
                <Text style={styles.workItemModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.workItemModalAddButton,
                  !selectedWorkCategory && styles.workItemModalDisabledButton
                ]}
                onPress={handleAddWorkItem}
                disabled={!selectedWorkCategory}
              >
                <Text style={styles.workItemModalAddText}>הוסף</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    paddingTop: 24,
    paddingBottom: 32,
    flexGrow: 1, // This ensures the content fills the available space
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 20, // Increased from 16 to 20
    marginBottom: 20, // Increased from 16 to 20
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
  
  // Payer selector styles
  payerScroll: {
    maxHeight: 100,
  },
  payerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  payerButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    backgroundColor: '#ecf0f1',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPayerButton: {
    backgroundColor: '#3498db',
    borderColor: '#2c3e50',
  },
  payerIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  payerText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
    lineHeight: 13,
  },
  
  // Date picker styles
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    textAlign: 'right',
    marginHorizontal: 12,
  },

  // Work management styles
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  workItemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  workItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workItemCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  removeWorkItemButton: {
    fontSize: 18,
    color: '#e74c3c',
    fontWeight: 'bold',
    padding: 4,
  },
  workItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  workItemDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  workItemHours: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  totalWorkAmount: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  totalWorkAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },

  // Work item modal styles
  workItemModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workItemModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  workItemModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  workItemModalSection: {
    marginBottom: 16,
  },
  workItemModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  workItemModalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
    backgroundColor: '#fafafa',
  },
  workItemModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  workItemModalCancelButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  workItemModalCancelText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workItemModalAddButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  workItemModalAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workItemModalDisabledButton: {
    backgroundColor: '#bdc3c7',
    opacity: 0.6,
  },
});

export default AddExpenseScreen; 