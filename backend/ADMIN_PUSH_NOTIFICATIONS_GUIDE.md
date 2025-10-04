# 🎯 Admin Push Notifications - Complete Setup Guide

## ✅ מה נוצר עבורך

### 1. **מודל דטאבייס מעודכן**
- ✅ הוספת שדה `is_admin` למודל User
- ✅ עדכון `to_dict()` method

### 2. **Migration Scripts**
- ✅ `add_admin_field_migration.py` - הוספת שדה is_admin
- ✅ `make_user_admin.py` - הפיכת משתמש למנהל

### 3. **Admin Endpoints בשרת**
- ✅ `POST /api/admin/broadcast-notification` - שליחה לכל המשתמשים
- ✅ `GET /api/admin/stats/notifications` - סטטיסטיקות התראות
- ✅ `GET /api/admin/users` - רשימת כל המשתמשים

### 4. **Client-Side Functions**
- ✅ `sendBroadcastNotification()` - שליחת broadcast
- ✅ `getNotificationStats()` - קבלת סטטיסטיקות
- ✅ `listAllUsers()` - רשימת משתמשים
- ✅ `registerPushToken()` - רישום push token
- ✅ `sendTestNotification()` - שליחת התראת בדיקה

## 🚀 איך להתחיל להשתמש

### שלב 1: הרץ את ה-Migration

```bash
cd backend
python add_admin_field_migration.py
```

### שלב 2: הפוך את עצמך למנהל

```bash
python make_user_admin.py your_email@example.com
```

### שלב 3: בדוק שהכל עובד

```bash
# בדוק רשימת מנהלים
python make_user_admin.py --list

# הרץ את השרת
python app.py
```

## 📱 איך לשלוח התראה לכל המשתמשים

### דרך API (מומלץ):

```bash
curl -X POST http://localhost:5000/api/admin/broadcast-notification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "עדכון חשוב!",
    "body": "גרסה חדשה של האפליקציה זמינה בחנות",
    "data": {
      "type": "app_update",
      "version": "2.0.0"
    }
  }'
```

### דרך React Native:

```typescript
import { apiService } from './services/api';

// שליחת התראה לכל המשתמשים
const sendBroadcast = async () => {
  try {
    const result = await apiService.sendBroadcastNotification(
      'עדכון חשוב!',
      'גרסה חדשה של האפליקציה זמינה בחנות',
      { type: 'app_update', version: '2.0.0' }
    );
    
    console.log(`✅ Sent to ${result.data.unique_users} users (${result.data.devices_sent} devices)`);
  } catch (error) {
    console.error('❌ Failed to send broadcast:', error);
  }
};
```

### דרך Python Script:

צור קובץ `backend/send_broadcast.py`:

```python
#!/usr/bin/env python3
import os
import sys
from flask import Flask
from config import config
from postgres_models import db, PushToken
from notifications import get_notification_service

def create_app():
    app = Flask(__name__)
    config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    db.init_app(app)
    return app

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python send_broadcast.py <title> <body>")
        sys.exit(1)
    
    title = sys.argv[1]
    body = sys.argv[2]
    
    app = create_app()
    
    with app.app_context():
        # Get all tokens
        all_tokens = PushToken.query.filter_by(is_active=True).all()
        print(f"📱 Found {len(all_tokens)} active devices")
        
        if not all_tokens:
            print("❌ No active tokens")
            sys.exit(1)
        
        token_strings = [t.expo_push_token for t in all_tokens]
        
        # Send
        service = get_notification_service()
        result = service.send_push_notification(
            tokens=token_strings,
            title=title,
            body=body,
            data={'type': 'broadcast'},
            priority='high'
        )
        
        print(f"✅ Sent: {result['sent']}, Failed: {result['failed']}")
```

**הרץ:**
```bash
python backend/send_broadcast.py "שלום!" "זו הודעה לכל המשתמשים"
```

## 📊 קבלת סטטיסטיקות

### דרך API:

```bash
curl -X GET http://localhost:5000/api/admin/stats/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### דרך React Native:

```typescript
const getStats = async () => {
  try {
    const stats = await apiService.getNotificationStats();
    console.log('📊 Notification Stats:', stats.data);
    // Output:
    // {
    //   total_users: 150,
    //   users_with_notifications: 120,
    //   users_without_notifications: 30,
    //   total_active_devices: 180,
    //   coverage_percentage: 80.0
    // }
  } catch (error) {
    console.error('❌ Failed to get stats:', error);
  }
};
```

## 👥 רשימת משתמשים

### דרך API:

```bash
curl -X GET "http://localhost:5000/api/admin/users?page=1&per_page=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### דרך React Native:

```typescript
const listUsers = async () => {
  try {
    const users = await apiService.listAllUsers(1, 10);
    console.log('👥 Users:', users.data.users);
    // Each user includes:
    // - id, email, username, first_name, last_name
    // - created_at
    // - has_notifications (boolean)
    // - active_devices (number)
    // - is_admin (boolean)
  } catch (error) {
    console.error('❌ Failed to list users:', error);
  }
};
```

## 🧪 שליחת התראת בדיקה

### דרך React Native:

```typescript
const sendTest = async () => {
  try {
    const result = await apiService.sendTestNotification(
      '🧪 Test Notification',
      'This is a test notification from Homis!',
      { type: 'test' }
    );
    console.log('✅ Test sent:', result.data);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
```

## 🔧 ניהול מנהלים

### הפיכת משתמש למנהל:
```bash
python make_user_admin.py user@example.com
```

### הסרת הרשאות מנהל:
```bash
python make_user_admin.py --remove user@example.com
```

### רשימת כל המנהלים:
```bash
python make_user_admin.py --list
```

## 🎯 דוגמאות שימוש מעשיות

### 1. הודעת עדכון אפליקציה

```typescript
await apiService.sendBroadcastNotification(
  '🆕 עדכון זמין!',
  'גרסה 2.0.0 של Homis זמינה בחנות האפליקציות',
  { type: 'app_update', version: '2.0.0', url: 'https://apps.apple.com/...' }
);
```

### 2. הודעת תחזוקה

```typescript
await apiService.sendBroadcastNotification(
  '🔧 תחזוקה מתוכננת',
  'השרת יעבור תחזוקה ביום ראשון בין 02:00-04:00',
  { type: 'maintenance', start_time: '2024-01-07T02:00:00Z' }
);
```

### 3. הודעת חג

```typescript
await apiService.sendBroadcastNotification(
  '🎉 חג שמח!',
  'צוות Homis מאחל לכם חג שמח ושנה טובה!',
  { type: 'holiday', holiday: 'new_year' }
);
```

### 4. הודעת תכונה חדשה

```typescript
await apiService.sendBroadcastNotification(
  '✨ תכונה חדשה!',
  'עכשיו תוכלו ליצור תקציבים אוטומטיים לכל קטגוריה',
  { type: 'new_feature', feature: 'auto_budget' }
);
```

## 🛡️ אבטחה

- ✅ כל ה-endpoints מוגנים עם JWT authentication
- ✅ בדיקת הרשאות admin על כל endpoint
- ✅ לוגים מפורטים לכל פעולה admin
- ✅ הגבלת גישה רק למשתמשים עם `is_admin = true`

## 📝 Logs

השרת כותב logs מפורטים:

```
📢 BROADCAST: Admin admin@homis.com sent notification to 150 devices (120 users)
📊 ADMIN: Getting notification stats
👥 ADMIN: Listing all users
```

## 🎉 סיכום

עכשיו יש לך תשתית מלאה לשליחת התראות לכל המשתמשים כמנהל!

**מה אתה יכול לעשות:**
- ✅ לשלוח הודעות לכל המשתמשים
- ✅ לקבל סטטיסטיקות על כיסוי התראות
- ✅ לראות רשימת כל המשתמשים
- ✅ לשלוח התראות בדיקה
- ✅ לנהל הרשאות מנהל

**הכל מוכן לשימוש!** 🚀
