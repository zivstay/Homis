# Client-Side Integration Guide
## שילוב תשתית Push Notifications בצד הלקוח

מדריך זה מסביר כיצד לשלב את תשתית ההתראות בצד הלקוח (React Native + Expo).

## Prerequisites

התקנת הספריות הנדרשות:
```bash
npm install expo-notifications
```

## שלב 1: רישום Push Token עם השרת

### הוספה ל-`services/api.ts`

```typescript
// Add to your API service

export const registerPushToken = async (
  token: string,
  deviceId: string,
  deviceName?: string,
  deviceOs?: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/push-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        expo_push_token: token,
        device_id: deviceId,
        device_name: deviceName,
        device_os: deviceOs,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to register push token');
    }

    const data = await response.json();
    console.log('✅ Push token registered:', data.token_id);
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    throw error;
  }
};

export const sendTestNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/push-notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({ title, body, data }),
    });

    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }

    console.log('✅ Test notification sent');
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    throw error;
  }
};
```

## שלב 2: עדכון notificationService.ts

הוסף פונקציה לרישום הטוקן עם השרת:

```typescript
// Add to your notificationService.ts

import { registerPushToken } from '../services/api';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

/**
 * Register push token with backend server
 */
public async registerTokenWithBackend(): Promise<void> {
  try {
    const token = await this.getPushToken();
    if (!token) {
      console.log('❌ No push token to register');
      return;
    }

    // Get device info
    const deviceId = Constants.deviceId || 'unknown';
    const deviceName = Device.deviceName || undefined;
    const deviceOs = `${Device.osName} ${Device.osVersion}` || undefined;

    // Register with backend
    await registerPushToken(token, deviceId, deviceName, deviceOs);
    
    console.log('✅ Push token registered with backend');
  } catch (error) {
    console.error('❌ Error registering token with backend:', error);
  }
}
```

## שלב 3: שילוב ב-App.tsx

עדכן את `App.tsx` לקרוא לרישום הטוקן:

```typescript
import NotificationService from './services/notificationService';

const App = () => {
  useEffect(() => {
    const initializeNotifications = async () => {
      const notificationService = NotificationService.getInstance();
      
      // Request permissions
      const hasPermission = await notificationService.requestPermissions();
      
      if (hasPermission) {
        // Register token with backend
        await notificationService.registerTokenWithBackend();
        
        // Schedule notifications (optional - for local notifications)
        await notificationService.scheduleWeeklyNotifications();
      }
    };

    initializeNotifications();
  }, []);

  return (
    // ... your app components
  );
};
```

## שלב 4: טיפול בלחיצה על התראה

הוסף מאזין (listener) לטיפול בלחיצה על התראות:

```typescript
import { useNavigation } from '@react-navigation/native';

const App = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const notificationService = NotificationService.getInstance();

    // Handle notification tap
    const subscription = notificationService.addNotificationResponseListener(
      (response) => {
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        switch (data.type) {
          case 'expense_added':
            navigation.navigate('Board', { boardId: data.board_id });
            break;
          
          case 'budget_exceeded':
          case 'budget_alert':
            navigation.navigate('Budget', { boardId: data.board_id });
            break;
          
          case 'debt_reminder':
            navigation.navigate('Debts', { boardId: data.board_id });
            break;
          
          case 'board_invitation':
            navigation.navigate('Invitations');
            break;
          
          case 'shopping_list_update':
            navigation.navigate('ShoppingList', { boardId: data.board_id });
            break;
          
          default:
            console.log('Unknown notification type:', data.type);
        }
      }
    );

    return () => subscription.remove();
  }, [navigation]);

  return (
    // ... your app components
  );
};
```

## שלב 5: שליחת התראות אוטומטית

### דוגמה: שליחת התראה בעת הוספת הוצאה

עדכן את הפונקציה `addExpense` ב-`services/api.ts`:

```typescript
export const addExpense = async (
  boardId: string,
  expenseData: ExpenseData
): Promise<Expense> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/boards/${boardId}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(expenseData),
    });

    if (!response.ok) {
      throw new Error('Failed to add expense');
    }

    const expense = await response.json();
    
    // The backend will automatically send push notifications to board members
    console.log('✅ Expense added, notifications sent automatically');
    
    return expense;
  } catch (error) {
    console.error('❌ Error adding expense:', error);
    throw error;
  }
};
```

## שלב 6: בדיקת התראות

הוסף כפתור בדיקה לממשק המשתמש:

```typescript
import { Button } from 'react-native';
import { sendTestNotification } from '../services/api';

const SettingsScreen = () => {
  const handleTestNotification = async () => {
    try {
      await sendTestNotification(
        '🧪 התראת בדיקה',
        'זו התראת בדיקה מ-Homis!',
        { type: 'test' }
      );
      alert('התראה נשלחה בהצלחה!');
    } catch (error) {
      alert('שגיאה בשליחת התראה');
    }
  };

  return (
    <View>
      <Button
        title="שלח התראת בדיקה"
        onPress={handleTestNotification}
      />
    </View>
  );
};
```

## שלב 7: ניקוי Token בהתנתקות

וודא שהטוקן מתבטל כשהמשתמש מתנתק:

```typescript
export const logout = async (): Promise<void> => {
  try {
    // Get all user tokens
    const response = await fetch(`${API_BASE_URL}/api/push-tokens`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
    });

    if (response.ok) {
      const { tokens } = await response.json();
      
      // Deactivate all tokens
      for (const token of tokens) {
        await fetch(`${API_BASE_URL}/api/push-tokens/${token.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
          },
        });
      }
    }

    // Clear local auth
    await clearAuthToken();
    
    console.log('✅ Logged out successfully');
  } catch (error) {
    console.error('❌ Error during logout:', error);
  }
};
```

## דוגמאות לשימוש

### 1. התראה על הוספת הוצאה

כשמשתמש מוסיף הוצאה, השרת אוטומטית שולח התראה לכל חברי הלוח:

```typescript
// Client sends expense
await addExpense(boardId, {
  description: 'קניות בסופר',
  amount: 150,
  category: 'מזון',
  paid_by: currentUserId,
});

// Backend automatically sends notification to all board members:
// "יוסי הוסיף הוצאה: קניות בסופר - ₪150.00"
```

### 2. התראה על חריגת תקציב

כשתקציב חורג, השרת שולח התראה:

```typescript
// Backend checks budget after each expense
// If exceeded, sends automatically:
// "⚠️ תקציב חריגה במשפחה"
// "התקציב חרג ב-₪50.00 (תקציב: ₪1000.00)"
```

### 3. תזכורת חוב

```typescript
// Send debt reminder manually (if you implement this feature)
await sendDebtReminder(debtId);

// Notification:
// "תזכורת חוב"
// "דני חייב לך ₪50.00 בלוח משפחה"
```

## Troubleshooting

### בעיה: התראות לא מגיעות

**פתרון 1:** ודא שהרשאות אושרו
```typescript
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status);
```

**פתרון 2:** בדוק שה-token נרשם
```typescript
const tokens = await fetch(`${API_BASE_URL}/api/push-tokens`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log('Registered tokens:', await tokens.json());
```

**פתרון 3:** בדוק את ה-Expo project ID
```typescript
// In app.json, verify:
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "9fc51341-7952-470b-8341-39d792d970b5"
      }
    }
  }
}
```

### בעיה: התראות עובדות רק כשהאפליקציה פתוחה

זה צפוי! התראות מקומיות (`scheduleNotificationAsync`) עובדות רק כשהאפליקציה פועלת ברקע.  
התראות מהשרת (Push Notifications) עובדות תמיד.

### בעיה: Token לא תקף

```typescript
// Validate token format
const isValid = token.startsWith('ExponentPushToken[');
if (!isValid) {
  console.error('Invalid token format:', token);
}
```

## Best Practices

1. **רשום token בכל פעם שהאפליקציה נפתחת** - Token יכול להשתנות
2. **טפל בשגיאות בצורה שקטה** - אל תהפוך את ההתראות לבלוקרים
3. **בדוק permissions לפני כל שימוש** - המשתמש יכול לבטל אותן
4. **נקה tokens בהתנתקות** - שמור על נקיון הדטאבייס
5. **בדוק במכשיר אמיתי** - Simulator לא תמיד תומך בהתראות

## סיכום

תשתית ההתראות מאפשרת:

✅ שליחת התראות Push מהשרת לכל המשתמשים  
✅ ניהול מרובה של מכשירים למשתמש  
✅ התראות אוטומטיות על פעולות (הוצאות, חוב, תקציב)  
✅ התראות מתוזמנות (תזכורות, engagement)  
✅ טיפול בלחיצה על התראה ונווט למקום הנכון  

כל התשתית מוכנה לשימוש! 🎉

