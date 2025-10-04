# 🔐 JWT Token & Broadcast Scripts - Complete Guide

## 📋 כל הסקריפטים שנוצרו

### ✅ **סקריפטים מעודכנים (עם מצב אוטומטי + ידני)**

#### 1. `get_jwt_token.py` - קבלת JWT Token
- ✅ מצב אוטומטי: הגדרת email ו-password בקוד
- ✅ מצב ידני: העברה כפרמטרים
- ✅ בדיקת endpoints אוטומטית
- ✅ שמירת token לקובץ

#### 2. `send_broadcast.py` - שליחת Broadcast
- ✅ מצב אוטומטי: הגדרת title ו-body בקוד
- ✅ מצב ידני: העברה כפרמטרים
- ✅ טעינת token מקובץ
- ✅ הצגת סטטיסטיקות

### ✅ **סקריפטים אוטומטיים בלבד**

#### 3. `get_jwt_token_auto.py` - קבלת Token אוטומטית
- ✅ הגדרת credentials בקוד בלבד
- ✅ בדיקת endpoints אוטומטית
- ✅ שמירת token

#### 4. `send_broadcast_auto.py` - שליחת Broadcast אוטומטית
- ✅ הגדרת title ו-body בקוד בלבד
- ✅ טעינת token מקובץ
- ✅ הצגת סטטיסטיקות

### ✅ **סקריפטים נוספים**

#### 5. `make_user_admin_auto.py` - הפיכה למנהל אוטומטית
#### 6. `complete_admin_setup.py` - הגדרה מלאה אוטומטית

## 🚀 איך להשתמש

### גרסה 1: סקריפטים מעודכנים (מומלץ!)

#### `get_jwt_token.py` - מצב אוטומטי:

```python
# בקובץ get_jwt_token.py, שנה את השורות:
USER_EMAIL = "your_email@example.com"      # ← שנה לכתובת שלך
USER_PASSWORD = "your_password"            # ← שנה לסיסמה שלך
BACKEND_URL = "http://localhost:5000"     # ← שנה אם צריך
AUTO_TEST = True                           # ← בדיקת endpoints אוטומטית
AUTO_SAVE = True                           # ← שמירת token אוטומטית

# הרץ:
python get_jwt_token.py
```

#### `send_broadcast.py` - מצב אוטומטי:

```python
# בקובץ send_broadcast.py, שנה את השורות:
BROADCAST_TITLE = "עדכון חשוב!"                    # ← שנה לכותרת שלך
BROADCAST_BODY = "זו הודעה לכל המשתמשים"           # ← שנה לתוכן שלך
BACKEND_URL = "http://localhost:5000"             # ← שנה אם צריך
TOKEN_FILE = "jwt_token.txt"                       # ← קובץ ה-token
AUTO_STATS = True                                  # ← הצגת סטטיסטיקות

# הרץ:
python send_broadcast.py
```

### גרסה 2: סקריפטים אוטומטיים בלבד

#### `get_jwt_token_auto.py`:

```python
# בקובץ get_jwt_token_auto.py, שנה את השורות:
USER_EMAIL = "your_email@example.com"      # ← שנה לכתובת שלך
USER_PASSWORD = "your_password"            # ← שנה לסיסמה שלך
BACKEND_URL = "http://localhost:5000"     # ← שנה אם צריך
AUTO_TEST = True                           # ← בדיקת endpoints אוטומטית

# הרץ:
python get_jwt_token_auto.py
```

#### `send_broadcast_auto.py`:

```python
# בקובץ send_broadcast_auto.py, שנה את השורות:
BROADCAST_TITLE = "עדכון חשוב!"                    # ← שנה לכותרת שלך
BROADCAST_BODY = "זו הודעה לכל המשתמשים"           # ← שנה לתוכן שלך
BACKEND_URL = "http://localhost:5000"             # ← שנה אם צריך
TOKEN_FILE = "jwt_token.txt"                       # ← קובץ ה-token
AUTO_STATS = True                                  # ← הצגת סטטיסטיקות

# הרץ:
python send_broadcast_auto.py
```

## 🎯 דוגמאות מעשיות

### הגדרה מלאה אוטומטית:

```python
# 1. בקובץ get_jwt_token.py:
USER_EMAIL = "admin@homis.com"
USER_PASSWORD = "mypassword123"
AUTO_TEST = True
AUTO_SAVE = True

# 2. בקובץ send_broadcast.py:
BROADCAST_TITLE = "🆕 עדכון זמין!"
BROADCAST_BODY = "גרסה 2.0.0 של Homis זמינה בחנות האפליקציות"
AUTO_STATS = True

# 3. הרץ:
python get_jwt_token.py
python send_broadcast.py
```

### שליחת הודעות שונות:

```python
# הודעת תחזוקה
BROADCAST_TITLE = "🔧 תחזוקה מתוכננת"
BROADCAST_BODY = "השרת יעבור תחזוקה ביום ראשון בין 02:00-04:00"

# הודעת חג
BROADCAST_TITLE = "🎉 חג שמח!"
BROADCAST_BODY = "צוות Homis מאחל לכם חג שמח ושנה טובה!"

# הודעת תכונה חדשה
BROADCAST_TITLE = "✨ תכונה חדשה!"
BROADCAST_BODY = "עכשיו תוכלו ליצור תקציבים אוטומטיים לכל קטגוריה"
```

## 🔧 הגדרות מתקדמות

### שינוי כתובת השרת:

```python
# בכל הסקריפטים:
BACKEND_URL = "https://your-production-server.com"
```

### שינוי קובץ ה-Token:

```python
# ב-send_broadcast.py:
TOKEN_FILE = "my_custom_token.txt"
```

### כיבוי בדיקות אוטומטיות:

```python
# ב-get_jwt_token.py:
AUTO_TEST = False  # לא לבדוק endpoints
AUTO_SAVE = False  # לא לשמור token

# ב-send_broadcast.py:
AUTO_STATS = False  # לא להציג סטטיסטיקות
```

## 📝 פלטים לדוגמה

### הצלחה:

```
🔐 Auto-executing JWT token request...
📧 Email: admin@homis.com
🌐 Server: http://localhost:5000
==================================================
🔐 Attempting to login as: admin@homis.com
🌐 Server URL: http://localhost:5000
✅ Login successful!
🔑 Token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
💾 Token saved to jwt_token.txt

🧪 Testing admin endpoints...

📊 Testing: GET /api/admin/stats/notifications
✅ Stats endpoint working!
   Total users: 150
   Users with notifications: 120
   Coverage: 80.0%

📢 Testing: POST /api/admin/broadcast-notification
✅ Broadcast endpoint working!
   Sent to 120 users
   Devices: 150

🔑 Your JWT token:
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

📋 Use it in curl commands:
curl -H 'Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...' http://localhost:5000/api/admin/stats/notifications

🚀 Ready to send broadcasts:
python send_broadcast_auto.py
```

### שליחת Broadcast:

```
📢 Auto-executing broadcast...
📝 Title: 🆕 עדכון זמין!
📄 Body: גרסה 2.0.0 של Homis זמינה בחנות האפליקציות
🌐 Server: http://localhost:5000
==================================================
📢 Sending broadcast notification...
📝 Title: 🆕 עדכון זמין!
📄 Body: גרסה 2.0.0 של Homis זמינה בחנות האפליקציות
🌐 Server: http://localhost:5000
📊 Data: {
  "type": "broadcast",
  "source": "python_script_auto",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "title": "🆕 עדכון זמין!",
  "body": "גרסה 2.0.0 של Homis זמינה בחנות האפליקציות"
}
✅ Broadcast sent successfully!
👥 Users reached: 120
📱 Devices: 150
📊 Result: {'success': True, 'sent': 150, 'failed': 0, 'responses': [...]}

==================================================
🎉 Broadcast completed successfully!
==================================================
📊 Summary:
   - Users reached: 120
   - Devices: 150
   - Success rate: 150/150

📊 Getting notification statistics...
✅ Statistics retrieved!
👥 Total users: 150
📱 Users with notifications: 120
❌ Users without notifications: 30
📲 Total active devices: 150
📈 Coverage: 80.0%
📈 Total coverage: 80.0%
```

## 🛠️ פתרון בעיות

### בעיה: "Please set your credentials"

**פתרון:**
```python
# שנה את הערכים בקוד:
USER_EMAIL = "your_actual_email@example.com"
USER_PASSWORD = "your_actual_password"
```

### בעיה: "No token found"

**פתרון:**
```bash
# הרץ קודם:
python get_jwt_token.py
# או:
python get_jwt_token_auto.py
```

### בעיה: "User is not an admin"

**פתרון:**
```bash
# הפוך למנהל:
python make_user_admin_auto.py
```

## 💡 טיפים לשימוש

### 1. הגדר הכל בקוד
```python
# בקובץ get_jwt_token.py:
USER_EMAIL = "admin@homis.com"
USER_PASSWORD = "secure_password"
AUTO_TEST = True
AUTO_SAVE = True

# בקובץ send_broadcast.py:
BROADCAST_TITLE = "הודעה חשובה"
BROADCAST_BODY = "תוכן ההודעה"
AUTO_STATS = True
```

### 2. השתמש בסקריפטים אוטומטיים
```bash
# הגדרה מלאה:
python get_jwt_token_auto.py
python send_broadcast_auto.py
```

### 3. בדוק לפני שליחה
```bash
# בדוק סטטוס:
python check_admin_status.py
```

### 4. שמור קבצים נפרדים
```python
# צור קבצים נפרדים להודעות שונות:
# announcement.py, maintenance.py, holiday.py
```

## 🎉 סיכום

עכשיו יש לך:

✅ **6 סקריפטים שונים** - לבחירה לפי הצורך  
✅ **מצב אוטומטי + ידני** - גמישות מלאה  
✅ **הגדרה בקוד** - פשוט ונוח  
✅ **בדיקות אוטומטיות** - וידוא שהכל עובד  
✅ **הודעות ברורות** - הבנה מה קורה  

**הכל מוכן לשימוש!** 🚀

### Quick Start:
```python
# 1. בקובץ get_jwt_token.py:
USER_EMAIL = "your_email@example.com"
USER_PASSWORD = "your_password"

# 2. בקובץ send_broadcast.py:
BROADCAST_TITLE = "שלום!"
BROADCAST_BODY = "זו הודעה לכל המשתמשים"

# 3. הרץ:
python get_jwt_token.py
python send_broadcast.py
```
