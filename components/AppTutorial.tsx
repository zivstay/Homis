import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  action?: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  arrowDirection: 'top' | 'bottom' | 'left' | 'right';
  highlightColor?: string;
}

interface AppTutorialProps {
  isVisible: boolean;
  onComplete: () => void;
  currentScreen: string;
  onNavigateToScreen?: (screen: string) => void;
  hasSelectedBoard?: boolean; // חדש: האם יש לוח נבחר
  boardsCount?: number; // חדש: מספר הלוחות הקיימים
  elementPositions?: { [key: string]: { x: number; y: number; width: number; height: number } }; // חדש: מיקומים דינמיים
}

const TUTORIAL_STEPS: { [screen: string]: TutorialStep[] } = {
  // BoardSelection Screen Tutorial
  BoardSelection: [
    {
      id: 'welcome_app',
      title: 'ברוכים הבאים לHomis! 🎉',
      description: 'זוהי אפליקציית ניהול הוצאות חכמה עבור קבוצות ומשפחות. נתחיל בסיור קצר!',
      position: { x: 20, y: 120, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
      highlightColor: '#2196F3',
    },
    {
      id: 'no_boards_message',
      title: 'אין לכם לוחות עדיין 📋',
      description: 'נראה שזו הפעם הראשונה שלכם באפליקציה. בואו ניצור את הלוח הראשון שלכם כדי להתחיל!',
      position: { x: 40, y: 220, width: screenWidth - 80, height: 100 },
      arrowDirection: 'top',
      highlightColor: '#FF9800',
    },
    {
      id: 'board_explanation',
      title: 'מהו לוח הוצאות? 📋',
      description: 'לוח הוצאות הוא מרחב משותף לקבוצה. כל לוח יכול להכיל חברים שונים ולעקוב אחר הוצאות משותפות.',
      position: { x: 20, y: 350, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
    },
    {
      id: 'create_board_button',
      title: 'יצירת לוח חדש',
      description: 'לחצו כאן כדי ליצור לוח הוצאות חדש. תוכלו לבחור מסוגי לוחות שונים לפי הצורך.',
      position: { x: 20, y: screenHeight - 120, width: screenWidth - 40, height: 50 },
      arrowDirection: 'top',
      action: 'highlight_create_button',
      highlightColor: '#4CAF50',
    },
    {
      id: 'board_types',
      title: 'סוגי לוחות זמינים 🏷️',
      description: 'ישנם סוגי לוחות שונים: משפחתי, חברים, נסיעות, דירה משותפת ועוד. כל סוג מותאם לצרכים ספציפיים.',
      position: { x: 20, y: 450, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
    },
    {
      id: 'board_selection_complete',
      title: 'מעולה! ✅',
      description: 'אחרי שתבחרו או תיצרו לוח, נעבור למסך הראשי ונראה איך להשתמש בו.',
      position: { x: screenWidth / 2 - 150, y: screenHeight / 2 - 100, width: 300, height: 150 },
      arrowDirection: 'top',
    },
  ],

  // Home Screen Tutorial
  Home: [
    {
      id: 'welcome_home',
      title: 'ברוכים הבאים למסך הבית! 🏠',
      description: 'זהו המקום המרכזי לניהול ההוצאות שלכם. כאן תוכלו לראות את כל ההוצאות, לנהל אותן ולהוסיף חדשות.',
      position: { x: 20, y: 100, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
    },
    {
      id: 'expense_summary',
      title: 'סיכום הוצאות מהיר 📊',
      description: 'בראש המסך תמצאו סיכום חשוב: סך כל ההוצאות, ההוצאות האישיות שלכם, ומספר החברים בלוח. זה נותן לכם תמונה מהירה של המצב הכספי.',
      position: { x: 16, y: 200, width: screenWidth - 32, height: 200 },
      arrowDirection: 'top',
      action: 'highlight_summary_section',
      highlightColor: '#3498db',
    },
    {
      id: 'quick_expense_buttons',
      title: 'כפתורי הוצאות מהירות 💰',
      description: 'לחיצה על הכפתורים הללו תוביל אותכם להוספת הוצאה בקלות, עם הקטגוריה שבחרתם. זוהי הדרך המהירה והנוחה ביותר להוסיף הוצאות ללוח.',
      targetElement: 'quick_expense_buttons',
      position: { x: 16, y: 420, width: screenWidth - 32, height: 120 }, // fallback position
      arrowDirection: 'top',
      action: 'highlight_quick_expense_buttons',
      highlightColor: '#4CAF50',
    },
    {
      id: 'add_expense_explanation',
      title: 'איך עובד הוספת הוצאות? 📝',
      description: 'כשתלחצו על אחד מהכפתורים, תגיעו לטופס פשוט: הסכום יהיה ריק להזנה, הקטגוריה תהיה כבר נבחרת לפי הכפתור שלחצתם, תבחרו מי שילם, ואפשר להוסיף תמונה של הקבלה.',
      position: { x: 20, y: 560, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
    },
    {
      id: 'expense_list_intro',
      title: 'רשימת ההוצאות 📋',
      description: 'למטה תוכלו לראות את כל ההוצאות האחרונות. כל הוצאה מציגה: סכום, תיאור, מי שילם, ותאריך.',
      position: { x: 20, y: 680, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
    },
    {
      id: 'expense_item_features',
      title: 'תכונות ההוצאות 🔍',
      description: 'לחיצה על הוצאה תציג פרטים נוספים. תוכלו לראות תמונות, לערוך או למחוק הוצאות (אם יש לכם הרשאה). גלילה למטה תציג הוצאות ישנות יותר.',
      position: { x: 20, y: 780, width: screenWidth - 40, height: 120 },
      arrowDirection: 'top',
    },
    {
      id: 'refresh_feature',
      title: 'רענון הרשימה 🔄',
      description: 'משכו את הרשימה למטה כדי לרענן ולקבל עדכונים חדשים. זה שימושי כשחברים אחרים מוסיפים הוצאות.',
      position: { x: 20, y: 680, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
    },
    {
      id: 'navigate_to_summary',
      title: 'לחצו על טאב "סיכום" 📊',
      description: 'עכשיו לחצו על כפתור "סיכום" להמשך המדריך, או על "סיום" לסיום המדריך.',
      position: { x: screenWidth / 3 + 40, y: screenHeight - 114, width: screenWidth / 3 - 80, height: 43 },
      arrowDirection: 'top',
      action: 'highlight_summary_tab',
      highlightColor: '#2196F3',
    },
  ],

  // Summary Screen Tutorial
  Summary: [
    {
      id: 'welcome_summary',
      title: 'ברוכים הבאים למסך הסיכום! 📊',
      description: 'זהו מסך הניתוח והדוחות שלכם! כאן תמצאו גרפים מפורטים, סטטיסטיקות והתחשבנויות בין חברי הלוח. זה המקום להבין איך הכסף זורם.',
      position: { x: 20, y: 100, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
      highlightColor: '#3498db',
    },
    {
      id: 'summary_tabs',
      title: 'שני טאבים חשובים 📑',
      description: 'טאב "הוצאות" - גרפים וניתוחים של ההוצאות לפי קטגוריות ותקופות. טאב "התחשבנויות" - חישובים אוטומטיים של מי חייב למי כמה.',
      position: { x: 20, y: 200, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
      highlightColor: '#2196F3',
    },
    {
      id: 'period_filter_detailed',
      title: 'סינון תקופות חכם 🗓️',
      description: 'תוכלו לבחור תקופות שונות: "השבוע", "החודש", "השנה" או "טווח מותאם". זה מאפשר לכם לנתח הוצאות לפי תקופה ספציפית.',
      position: { x: 20, y: 300, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
      highlightColor: '#2196F3',
    },
    {
      id: 'board_filter',
      title: 'סינון לפי לוחות 📋',
      description: 'אם אתם חברים בכמה לוחות, תוכלו לבחור לראות נתונים מלוח ספציפי או מכל הלוחות יחד. זה עוזר להפריד בין הוצאות שונות.',
      position: { x: 20, y: 400, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
    },
    {
      id: 'charts_explanation',
      title: 'גרפים אינטראקטיביים 📈',
      description: 'גרף עמודות מציג הוצאות לפי קטגוריות, גרף מגמות מראה איך הוצאותיכם משתנות לאורך זמן. ניתן לגלול ולראות פרטים נוספים.',
      position: { x: 20, y: 500, width: screenWidth - 40, height: 120 },
      arrowDirection: 'top',
      highlightColor: '#9C27B0',
    },
    {
      id: 'debts_tab_switch',
      title: 'מעבר לטאב התחשבנויות 💰',
      description: 'לחצו על טאב "התחשבנויות" כדי לראות מי חייב למי כמה. המערכת מחשבת אוטומטית את כל החובות בהתבסס על ההוצאות.',
      position: { x: screenWidth / 2, y: 200, width: screenWidth / 2 - 20, height: 60 },
      arrowDirection: 'top',
      highlightColor: '#FF5722',
    },
    {
      id: 'debts_explanation',
      title: 'איך עובדות התחשבנויות? 🧮',
      description: 'כשמישהו משלם הוצאה, המערכת מחשבת כמה כל אחד חייב לו. התוצאה מוצגת כרשימה ברורה: "X חייב ל-Y סכום Z". ניתן לסמן תשלומים כמושלמים.',
      position: { x: 20, y: 350, width: screenWidth - 40, height: 120 },
      arrowDirection: 'top',
    },
    {
      id: 'settle_debts',
      title: 'סגירת חובות ✅',
      description: 'כשאתם מחזירים כסף לחבר, לחצו על "סמן כמשולם" כדי לעדכן שהחוב נסגר. זה שומר על המעקב מעודכן.',
      position: { x: 20, y: 480, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
    },
    {
      id: 'tutorial_complete_summary',
      title: 'סיימנו עם הסיכום! 📈',
      description: 'עכשיו אתם יודעים איך להשתמש בכל הכלים הפיננסיים. עברו לטאב "הגדרות" כדי לראות איך לנהל את הלוח והחברים.',
      position: { x: screenWidth / 2 - 150, y: screenHeight / 2 - 100, width: 300, height: 150 },
      arrowDirection: 'top',
    },
  ],

  // AddExpense Screen Tutorial
  AddExpense: [
    {
      id: 'welcome_add_expense',
      title: 'ברוכים הבאים למסך הוספת הוצאה! 💰',
      description: 'כאן תוכלו להוסיף הוצאה חדשה ללוח. בואו נראה איך זה עובד.',
      position: { x: 20, y: 120, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
    },
    {
      id: 'category_selection',
      title: 'בחירת קטגוריה',
      description: 'בחרו קטגוריה מתאימה - אוכל, תחבורה, בילויים וכו\'. זה עוזר בסיכומים ובגרפים.',
      position: { x: 20, y: 220, width: screenWidth - 40, height: 120 },
      arrowDirection: 'top',
      action: 'highlight_category_picker',
      highlightColor: '#9C27B0',
    },
    {
      id: 'amount_field',
      title: 'שדה הסכום',
      description: 'הזינו כאן את הסכום של ההוצאה. זהו השדה הכי חשוב בטופס.',
      position: { x: 20, y: 360, width: screenWidth - 40, height: 60 },
      arrowDirection: 'top',
      action: 'highlight_amount_field',
      highlightColor: '#2196F3',
    },
    {
      id: 'payer_selection',
      title: 'בחירת משלם',
      description: 'מי שילם את ההוצאה? בחרו מתוך רשימת החברים בלוח.',
      position: { x: 20, y: 440, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
      action: 'highlight_payer_picker',
      highlightColor: '#FF9800',
    },
    {
      id: 'description_field',
      title: 'תיאור ההוצאה',
      description: 'תארו מה זו ההוצאה - מקום, מוצר או שירות. זה עוזר לכל החברים להבין על מה מדובר.',
      position: { x: 20, y: 560, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
      action: 'highlight_description_field',
    },
    {
      id: 'date_selection',
      title: 'בחירת תאריך',
      description: 'בחרו את התאריך של ההוצאה. ברירת המחדל היא היום הנוכחי.',
      position: { x: 20, y: 680, width: screenWidth - 40, height: 60 },
      arrowDirection: 'top',
      action: 'highlight_date_picker',
      highlightColor: '#3498DB',
    },
    {
      id: 'image_upload',
      title: 'הוספת תמונה (אופציונלי)',
      description: 'ניתן להוסיף תמונה של הקבלה או החשבונית. זה עוזר לשמור מסמכים ולהבהיר הוצאות.',
      position: { x: 20, y: 760, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
      action: 'highlight_image_section',
      highlightColor: '#4CAF50',
    },
    {
      id: 'save_expense',
      title: 'שמירת ההוצאה',
      description: 'לחצו על "הוסף הוצאה" כדי להוסיף את ההוצאה ללוח. היא תופיע ברשימה ותשתתף בחישובים.',
      position: { x: screenWidth / 2 + 10, y: screenHeight - 100, width: screenWidth / 2 - 30, height: 60 },
      arrowDirection: 'top',
      action: 'highlight_save_button',
      highlightColor: '#4CAF50',
    },
  ],

  // Main Screen Tutorial  
  Main: [
    {
      id: 'welcome_main',
      title: 'ברוכים הבאים למסך הראשי! 🏠',
      description: 'זהו המסך הראשי של האפליקציה. כאן תמצאו גישה לכל התכונות.',
      position: { x: 20, y: 100, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
    },
    {
      id: 'board_switcher',
      title: 'מחליף לוחות',
      description: 'בחלק העליון תוכלו לעבור בין לוחות שונים שאתם חברים בהם.',
      position: { x: 20, y: 50, width: screenWidth - 80, height: 60 },
      arrowDirection: 'top',
      action: 'highlight_board_switcher',
      highlightColor: '#2196F3',
    },
    {
      id: 'notifications_bell',
      title: 'התראות',
      description: 'הפעמון מציג התראות על הוצאות חדשות, הזמנות ללוחות ועדכונים חשובים.',
      position: { x: screenWidth - 70, y: 50, width: 50, height: 50 },
      arrowDirection: 'left',
      action: 'highlight_notifications',
      highlightColor: '#FF5722',
    },
    {
      id: 'bottom_navigation',
      title: 'ניווט תחתון',
      description: 'הטאבים בתחתית מובילים לחלקים השונים: בית, סיכום והגדרות. כל טאב מכיל תכונות שונות.',
      position: { x: 20, y: screenHeight - 80, width: screenWidth - 40, height: 60 },
      arrowDirection: 'top',
      action: 'highlight_bottom_nav',
      highlightColor: '#673AB7',
    },
    {
      id: 'tutorial_complete_main',
      title: 'מעולה! ✅',
      description: 'עכשיו עברו לטאב "בית" כדי לראות את רשימת ההוצאות ולהתחיל לעבוד.',
      position: { x: screenWidth / 2 - 150, y: screenHeight / 2 - 100, width: 300, height: 150 },
      arrowDirection: 'top',
    },
  ],

  // Settings Screen Tutorial
  Settings: [
    {
      id: 'welcome_settings',
      title: 'ברוכים הבאים למסך הגדרות! ⚙️',
      description: 'כאן תוכלו לנהל את פרטי הלוח, להזמין חברים חדשים ולהגדיר העדפות.',
      position: { x: 20, y: 80, width: screenWidth - 40, height: 80 },
      arrowDirection: 'top',
    },
    {
      id: 'board_info',
      title: 'פרטי הלוח',
      description: 'כאן תוכלו לראות את פרטי הלוח הנוכחי: שם, תיאור, מטבע ותאריך יצירה.',
      position: { x: 20, y: 180, width: screenWidth - 40, height: 200 },
      arrowDirection: 'top',
    },
    {
      id: 'invite_member',
      title: 'הזמנת חברים',
      description: 'הכפתור הזה מאפשר להזמין חברים חדשים ללוח באמצעות כתובת אימייל. החברים יקבלו הזמנה.',
      position: { x: 20, y: 400, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
      highlightColor: '#4CAF50',
    },
    {
      id: 'member_management',
      title: 'ניהול חברים',
      description: 'ניתן לראות את רשימת החברים, התפקידים שלהם ולהסיר חברים (רק למנהלים ובעלים).',
      position: { x: 20, y: 520, width: screenWidth - 40, height: 150 },
      arrowDirection: 'top',
    },
    {
      id: 'tutorial_controls',
      title: 'בקרת המדריך',
      description: 'כאן תוכלו להפעיל מחדש את המדריך או לאפס אותו כדי שיופיע שוב בכניסה הבאה.',
      position: { x: 20, y: 700, width: screenWidth - 40, height: 100 },
      arrowDirection: 'top',
      highlightColor: '#3498DB',
    },
    {
      id: 'tutorial_complete',
      title: 'סיימנו! 🎉',
      description: 'כל הכבוד! סיימתם את המדריך. עכשיו אתם יודעים איך להשתמש בכל התכונות של האפליקציה. בהצלחה!',
      position: { x: screenWidth / 2 - 150, y: screenHeight / 2 - 100, width: 300, height: 200 },
      arrowDirection: 'top',
    },
  ],
};

const AppTutorial: React.FC<AppTutorialProps> = ({ isVisible, onComplete, currentScreen, onNavigateToScreen, hasSelectedBoard = true, boardsCount = 0, elementPositions = {} }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tooltipOpacity] = useState(new Animated.Value(0));
  const [highlightScale] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  // קבלת השלבים המתאימים למסך הנוכחי
  const getCurrentSteps = () => {
    const baseSteps = TUTORIAL_STEPS[currentScreen] || [];
    
    // אם זה מסך BoardSelection ויש לוחות - הסר את השלב של "אין לוחות"
    if (currentScreen === 'BoardSelection' && boardsCount > 0) {
      return baseSteps.filter(step => step.id !== 'no_boards_message');
    }
    
    return baseSteps;
  };

  const currentSteps = getCurrentSteps();
  const currentStep = currentSteps[currentStepIndex];

  // פונקציה לקבלת המיקום הנכון של השלב
  const getStepPosition = (step: TutorialStep) => {
    // בדוק אם יש מיקום דינמי לפי targetElement
    if (step.targetElement && elementPositions[step.targetElement]) {
      return elementPositions[step.targetElement];
    }
    
    // בדוק אם יש מיקום דינמי לפי action
    if (step.action && elementPositions[step.action]) {
      return elementPositions[step.action];
    }
    
    // אחרת, השתמש במיקום הקבוע (fallback)
    return step.position || { x: 20, y: 100, width: screenWidth - 40, height: 100 };
  };

  // בדיקה אם צריך להציג את ה-Tutorial
  const shouldShowTutorial = isVisible && currentStep && (
    // אם זה מסך BoardSelection - תמיד הצג
    currentScreen === 'BoardSelection' ||
    // אם זה מסך אחר - הצג רק אם יש לוח נבחר
    (currentScreen !== 'BoardSelection' && hasSelectedBoard)
  );

  console.log('🎓 AppTutorial render:', {
    isVisible,
    currentScreen,
    currentStepIndex,
    totalSteps: currentSteps.length,
    currentStep: currentStep?.id,
    hasSelectedBoard,
    boardsCount,
    shouldShowTutorial
  });

  useEffect(() => {
    if (shouldShowTutorial && currentStep) {
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.spring(highlightScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [shouldShowTutorial, currentStepIndex]);

  // Reset step index when screen changes
  useEffect(() => {
    console.log('🎓 AppTutorial: Screen changed to:', currentScreen);
    console.log('🎓 AppTutorial: Available steps:', currentSteps.length);
    setCurrentStepIndex(0);
    
    // Force animation reset when changing screens
    if (currentSteps.length > 0) {
      highlightScale.setValue(0);
      setTimeout(() => {
        Animated.spring(highlightScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 100);
    }
  }, [currentScreen]);

  const handleNext = () => {
    if (currentStepIndex < currentSteps.length - 1) {
      // Check if current step requires special handling
      if (currentStep?.action === 'highlight_summary_tab') {
        // Clear Summary tutorial completion so it starts when user navigates there
        console.log('🎓 AppTutorial: Preparing Summary tutorial');
        setTimeout(async () => {
          try {
            await AsyncStorage.removeItem('tutorial_completed_Summary');
            console.log('🎓 AppTutorial: Cleared Summary tutorial, ready for user navigation');
          } catch (error) {
            console.error('Error preparing Summary tutorial:', error);
          }
        }, 100);
        
        // Complete current tutorial
        onComplete();
        return;
      }
      
      // Just move to next step
      Animated.sequence([
        Animated.timing(highlightScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(highlightScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    // Save that user has seen the tutorial for this screen
    await AsyncStorage.setItem(`tutorial_completed_${currentScreen}`, 'true');
    onComplete();
  };

  const renderArrow = () => {
    if (!currentStep) return null;

    const position = getStepPosition(currentStep);
    const arrowStyle = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid' as const,
    };

    const arrowSize = 12;
    const tooltipX = position.x + position.width / 2;
    const tooltipY = position.y + position.height / 2;

    switch (currentStep.arrowDirection) {
      case 'top':
        return (
          <View
            style={[
              arrowStyle,
              {
                top: tooltipY + position.height + 15,
                left: tooltipX - arrowSize,
                borderLeftWidth: arrowSize,
                borderRightWidth: arrowSize,
                borderBottomWidth: arrowSize,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: '#FFFFFF',
              },
            ]}
          />
        );
      case 'bottom':
        return (
          <View
            style={[
              arrowStyle,
              {
                top: tooltipY - arrowSize - 15,
                left: tooltipX - arrowSize,
                borderLeftWidth: arrowSize,
                borderRightWidth: arrowSize,
                borderTopWidth: arrowSize,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: '#FFFFFF',
              },
            ]}
          />
        );
      case 'left':
        return (
          <View
            style={[
              arrowStyle,
              {
                top: tooltipY - arrowSize,
                left: tooltipX + position.width + 15,
                borderTopWidth: arrowSize,
                borderBottomWidth: arrowSize,
                borderLeftWidth: arrowSize,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: '#FFFFFF',
              },
            ]}
          />
        );
      case 'right':
        return (
          <View
            style={[
              arrowStyle,
              {
                top: tooltipY - arrowSize,
                left: tooltipX - arrowSize - 15,
                borderTopWidth: arrowSize,
                borderBottomWidth: arrowSize,
                borderRightWidth: arrowSize,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderRightColor: '#FFFFFF',
              },
            ]}
          />
        );
      default:
        return null;
    }
  };

  const renderHighlight = () => {
    if (!currentStep || !currentStep.action) return null;

    const position = getStepPosition(currentStep);

    return (
      <Animated.View
        style={[
          styles.highlight,
          {
            left: position.x,
            top: position.y,
            width: position.width,
            height: position.height,
            transform: [{ scale: highlightScale }],
          },
        ]}
        pointerEvents="none"
      />
    );
  };

  const getTooltipPosition = () => {
    if (!currentStep) return { top: 0, left: 0 };

    // Special case for highlighting summary tab - center the tooltip
    if (currentStep.action === 'highlight_summary_tab') {
      return { 
        top: screenHeight / 2 - 100, 
        left: screenWidth / 2 - 140 
      };
    }

    const position = getStepPosition(currentStep);
    let tooltipX = position.x;
    let tooltipY = position.y;

    // Adjust position based on arrow direction to avoid overlap
    switch (currentStep.arrowDirection) {
      case 'top':
        tooltipY += position.height + 35;
        break;
      case 'bottom':
        tooltipY -= 180; // Tooltip height approximate
        break;
      case 'left':
        tooltipX += position.width + 35;
        tooltipY -= 50;
        break;
      case 'right':
        tooltipX -= 290; // Tooltip width approximate
        tooltipY -= 50;
        break;
    }

    // Calculate safe area bounds
    const topSafeArea = insets.top;
    const bottomSafeArea = insets.bottom;
    const leftSafeArea = insets.left;
    const rightSafeArea = insets.right;

    // Ensure tooltip stays within screen bounds including safe areas
    tooltipX = Math.max(20 + leftSafeArea, Math.min(tooltipX, screenWidth - 290 - rightSafeArea));
    
    // Special handling for bottom positioning to avoid Android navigation bar
    const minTop = 50 + topSafeArea;
    // Add extra margin for Android navigation bar (at least 80px from bottom)
    const extraBottomMargin = Platform.OS === 'android' ? 80 : 0;
    const maxBottom = screenHeight - 200 - bottomSafeArea - extraBottomMargin;
    
    // If tooltip would be too close to bottom, move it up
    if (tooltipY > maxBottom) {
      tooltipY = maxBottom;
    } else if (tooltipY < minTop) {
      tooltipY = minTop;
    }

    return { top: tooltipY, left: tooltipX };
  };

  if (!shouldShowTutorial) return null;

  const tooltipPosition = getTooltipPosition();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Highlight */}
      {renderHighlight()}
      
      {/* Arrow */}
      {renderArrow()}
      
      {/* Tooltip */}
      <Animated.View
        style={[
          styles.tooltip,
          {
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            opacity: tooltipOpacity,
          },
        ]}
        pointerEvents="box-none"
      >
        <Text style={styles.tooltipTitle}>{currentStep.title}</Text>
        <Text style={styles.tooltipDescription}>{currentStep.description}</Text>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentStepIndex + 1} מתוך {currentSteps.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentStepIndex + 1) / currentSteps.length) * 100}%` },
              ]}
            />
          </View>
        </View>
        
        <View style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 20) }]} pointerEvents="auto">
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>דלג</Text>
          </TouchableOpacity>
          
          {currentStepIndex > 0 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Text style={styles.previousButtonText}>הקודם</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentStep?.action === 'highlight_summary_tab' 
                ? 'סיום' 
                : currentStepIndex < currentSteps.length - 1 
                  ? 'הבא' 
                  : 'סיום'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    textAlign: 'right',
  },
  tooltipDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
    textAlign: 'right',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    color: '#888',
    fontSize: 12,
  },
  previousButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  previousButtonText: {
    color: '#333',
    fontSize: 12,
  },
  nextButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AppTutorial;