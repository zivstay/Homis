# מערכת טוטוריאל WalkMe - מדריך שימוש

## סקירה כללית

מערכת הטוטוריאל החדשה מספקת מדריך אינטראקטיבי מלא להכרת האפליקציה. הטוטוריאל מופעל אוטומטית בכל התחברות חדשה של משתמש ומסביר את כל הפונקציונאליות הזמינה באפליקציה.

## תכונות מרכזיות

### 🎯 הפעלה אוטומטית
- הטוטוריאל מופעל אוטומטית בכל התחברות חדשה של משתמש
- שמירת מצב השלמת הטוטוריאל לכל משתמש בנפרד
- אפשרות להפעיל מחדש מתוך מסך ההגדרות

### 📱 מסכים מכוסים
הטוטוריאל כולל הדרכה מפורטת לכל המסכים:

1. **BoardSelection** - בחירת/יצירת לוח עבודה
2. **Main** - מסך ראשי עם ניווט
3. **Home** - רשימת הוצאות וניהול
4. **AddExpense** - הוספת הוצאה חדשה
5. **Summary** - גרפים ודוחות
6. **Settings** - הגדרות וניהול חברים

### 🎨 עיצוב אינטראקטיבי
- הדגשה ויזואלית של רכיבים
- חיצים מכוונים לאלמנטים ספציפיים
- אנימציות חלקות
- עיצוב responsive למכשירים שונים

## מבנה הקבצים

```
components/
├── AppTutorial.tsx          # הקומפוננט הראשי של הטוטוריאל

contexts/
├── TutorialContext.tsx      # ניהול מצב הטוטוריאל

screens/
├── HomeScreen.tsx           # + אינטגרציה עם הטוטוריאל
├── AddExpenseScreen.tsx     # + אינטגרציה עם הטוטוריאל
├── SummaryScreen.tsx        # + אינטגרציה עם הטוטוריאל
├── SettingsScreen.tsx       # + כפתורי הטוטוריאל
└── BoardSelectionScreen.tsx # + אינטגרציה עם הטוטוריאל

App.tsx                      # + הטמעת TutorialProvider
```

## איך זה עובד?

### 1. הפעלה אוטומטית
```typescript
// TutorialContext בודק אוטומטית האם המשתמש כבר ראה את הטוטוריאל
const checkTutorialStatus = async () => {
  const userTutorialKey = `tutorial_completed_${user?.id}`;
  const completed = await AsyncStorage.getItem(userTutorialKey);
  
  if (!completed) {
    setShouldShowOnboarding(true);
  }
};
```

### 2. מעקב אחר מסכים
כל מסך מעדכן את הטוטוריאל context:
```typescript
useEffect(() => {
  setCurrentScreen('Home');
}, [setCurrentScreen]);
```

### 3. שמירת מצב
```typescript
const completeTutorial = async () => {
  const userTutorialKey = `tutorial_completed_${user?.id}`;
  await AsyncStorage.setItem(userTutorialKey, 'true');
};
```

## תוכן הטוטוריאל

### מסך בחירת לוח (BoardSelection)
- ברכת פתיחה והסבר כללי
- יצירת לוח חדש
- סוגי לוחות שונים

### מסך ראשי (Main)
- מחליף לוחות
- התראות
- ניווט תחתון

### מסך בית (Home)
- רשימת הוצאות
- הוספת הוצאה (FAB)
- פעולות על הוצאות
- רענון הרשימה

### הוספת הוצאה (AddExpense)
- טופס הוספה
- שדה סכום
- בחירת קטגוריה
- בחירת משלם
- הוספת תמונה
- שמירת ההוצאה

### סיכום (Summary)
- טאבי סיכום
- סינון לפי תקופה
- סינון לפי לוחות
- גרפים ונתונים
- התחשבנויות

### הגדרות (Settings)
- פרטי הלוח
- הזמנת חברים
- ניהול חברים
- התנתקות

## שימוש מתוך הקוד

### הפעלת טוטוריאל מחדש
```typescript
import { useTutorial } from '../contexts/TutorialContext';

const { startTutorial } = useTutorial();

const handleRestartTutorial = () => {
  startTutorial();
};
```

### איפוס טוטוריאל
```typescript
const { resetTutorial } = useTutorial();

const handleResetTutorial = async () => {
  await resetTutorial();
  // הטוטוריאל יופיע בכניסה הבאה
};
```

### בדיקת מצב טוטוריאל
```typescript
const { showTutorial, currentScreen } = useTutorial();

if (showTutorial) {
  // הטוטוריאל פעיל
}
```

## התאמה אישית

### הוספת צעדים חדשים
בקובץ `AppTutorial.tsx`, עדכן את `TUTORIAL_STEPS`:

```typescript
const TUTORIAL_STEPS = {
  NewScreen: [
    {
      id: 'new_step',
      title: 'כותרת חדשה',
      description: 'תיאור מפורט...',
      position: { x: 20, y: 100, width: 300, height: 60 },
      arrowDirection: 'top',
      action: 'highlight_element',
      highlightColor: '#4CAF50',
    },
  ],
};
```

### שינוי עיצוב
עדכן את הסטיילים בקובץ `AppTutorial.tsx`:

```typescript
const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: '#FFFFFF', // צבע רקע
    borderRadius: 12,           // עיגול פינות
    // ...
  },
});
```

## נקודות חשובות

### ⚠️ זיכרון ואופטימיזציה
- הטוטוריאל משתמש ב-AsyncStorage לשמירת מצב
- כל המסכים עומדים בזיכרון בו זמנית
- אנימציות מבוססות על React Native Animated

### 🔧 תחזוקה
- עדכון מיקומי אלמנטים בעת שינוי UI
- בדיקת תאימות למכשירים שונים
- עדכון תוכן ההדרכה בעת הוספת תכונות

### 🌐 בינלאומיות
- כל הטקסט בעברית עם יישור ימין
- תמיכה במכשירים בעלי כיוון RTL
- גרידה אוטומטית של טקסט ארוך

## בדיקות איכות

### בדיקות פונקציונליות
- [ ] הטוטוריאל מופעל בהתחברות חדשה
- [ ] מעבר בין צעדים פועל כראוי
- [ ] שמירת מצב השלמה
- [ ] הפעלה מחדש מההגדרות
- [ ] איפוס סטטוס

### בדיקות UI/UX
- [ ] חיצים מכוונים למקום הנכון
- [ ] הדגשות מוצגות כראוי
- [ ] טקסט קריא ונגיש
- [ ] אנימציות חלקות
- [ ] תמיכה במכשירים שונים

## תמיכה ופתרון בעיות

### בעיות נפוצות

**הטוטוריאל לא מופיע:**
1. בדוק ש-TutorialProvider עוטף את האפליקציה
2. וודא שהמשתמש לא השלים כבר את הטוטוריאל
3. בדוק logs ב-console

**מיקום שגוי של אלמנטים:**
1. עדכן קואורדינטות ב-TUTORIAL_STEPS
2. בדוק תאימות למכשיר הספציפי
3. התאם לשינויי עיצוב

**ביצועים איטיים:**
1. בדוק שימוש ב-useNativeDriver לאנימציות
2. הימנע מ-re-renders מיותרים
3. שקול lazy loading לצעדים רבים

---

**פותח על ידי:** צוות הפיתוח
**תאריך עדכון אחרון:** ${new Date().toLocaleDateString('he-IL')}
**גרסה:** 1.0.0 