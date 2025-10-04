# 🔐 JWT Token Scripts - Complete Guide

## 📋 סקריפטים שנוצרו

### 1. `get_jwt_token.py` - קבלת JWT Token
- ✅ התחברות עם email ו-password
- ✅ שמירת token לקובץ
- ✅ בדיקת endpoints של מנהל
- ✅ טעינת token מקובץ

### 2. `send_broadcast.py` - שליחת Broadcast
- ✅ שליחת התראות לכל המשתמשים
- ✅ שימוש ב-token מקובץ או ישירות
- ✅ קבלת סטטיסטיקות
- ✅ הודעות שגיאה ברורות

### 3. `check_admin_status.py` - בדיקת סטטוס מנהל
- ✅ בדיקה אם המשתמש הוא מנהל
- ✅ קבלת מידע על המשתמש
- ✅ בדיקת יכולת שליחת broadcast
- ✅ סטטיסטיקות התראות

## 🚀 איך להשתמש

### שלב 1: קבלת JWT Token

```bash
# התחברות וקבלת token
python get_jwt_token.py your_email@example.com your_password

# התחברות + בדיקת endpoints
python get_jwt_token.py your_email@example.com your_password --test

# התחברות + שמירת token לקובץ
python get_jwt_token.py your_email@example.com your_password --save

# טעינת token מקובץ
python get_jwt_token.py --load

# טעינת token + בדיקת endpoints
python get_jwt_token.py --load --test
```

### שלב 2: שליחת Broadcast

```bash
# שליחה בסיסית
python send_broadcast.py "עדכון חשוב!" "גרסה חדשה זמינה"

# שליחה עם token מקובץ
python send_broadcast.py "חג שמח!" "שנה טובה!" --token-file jwt_token.txt

# שליחה עם token ישיר
python send_broadcast.py "הודעה!" "תוכן" --token "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

# קבלת סטטיסטיקות
python send_broadcast.py --stats
```

### שלב 3: בדיקת סטטוס מנהל

```bash
# בדיקה בסיסית
python check_admin_status.py

# בדיקה עם token מקובץ
python check_admin_status.py --token-file jwt_token.txt

# בדיקה עם token ישיר
python check_admin_status.py --token "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

## 📝 דוגמאות שימוש מעשיות

### 1. הגדרת מנהל חדש

```bash
# הפוך משתמש למנהל
python make_user_admin.py new_admin@example.com

# קבל token למנהל החדש
python get_jwt_token.py new_admin@example.com password123 --save

# בדוק שהכל עובד
python check_admin_status.py --load
```

### 2. שליחת הודעת עדכון

```bash
# שליחת הודעת עדכון אפליקציה
python send_broadcast.py \
  "🆕 עדכון זמין!" \
  "גרסה 2.0.0 של Homis זמינה בחנות האפליקציות" \
  --token-file jwt_token.txt
```

### 3. שליחת הודעת תחזוקה

```bash
# הודעת תחזוקה מתוכננת
python send_broadcast.py \
  "🔧 תחזוקה מתוכננת" \
  "השרת יעבור תחזוקה ביום ראשון בין 02:00-04:00" \
  --token-file jwt_token.txt
```

### 4. שליחת הודעת חג

```bash
# הודעת חג
python send_broadcast.py \
  "🎉 חג שמח!" \
  "צוות Homis מאחל לכם חג שמח ושנה טובה!" \
  --token-file jwt_token.txt
```

### 5. בדיקת כיסוי התראות

```bash
# בדיקת סטטיסטיקות
python send_broadcast.py --stats

# או
python check_admin_status.py
```

## 🔧 הגדרות מתקדמות

### שינוי כתובת השרת

```bash
# הגדרת משתנה סביבה
export BACKEND_URL="https://your-production-server.com"

# או שימוש ישיר
BACKEND_URL="https://your-server.com" python get_jwt_token.py email@example.com password
```

### שימוש ב-token מ-cURL

```bash
# קבלת token
TOKEN=$(python get_jwt_token.py email@example.com password | grep "Bearer" | cut -d' ' -f2)

# שימוש ב-token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/stats/notifications
```

### אוטומציה עם סקריפט

צור `send_announcement.sh`:

```bash
#!/bin/bash
# Script to send announcement

TITLE="$1"
BODY="$2"

if [ -z "$TITLE" ] || [ -z "$BODY" ]; then
    echo "Usage: $0 <title> <body>"
    exit 1
fi

python send_broadcast.py "$TITLE" "$BODY" --token-file jwt_token.txt
```

**הרץ:**
```bash
chmod +x send_announcement.sh
./send_announcement.sh "כותרת" "תוכן"
```

## 🛠️ פתרון בעיות

### בעיה: "User is not an admin"

**פתרון:**
```bash
# הפוך את המשתמש למנהל
python make_user_admin.py your_email@example.com

# בדוק רשימת מנהלים
python make_user_admin.py --list
```

### בעיה: "Token file not found"

**פתרון:**
```bash
# קבל token ושמור אותו
python get_jwt_token.py email@example.com password --save

# או השתמש ב-token ישיר
python send_broadcast.py "title" "body" --token "your_jwt_token_here"
```

### בעיה: "Network error"

**פתרון:**
```bash
# בדוק שהשרת פועל
curl http://localhost:5000/api/health

# שנה כתובת שרת
BACKEND_URL="https://your-server.com" python get_jwt_token.py email@example.com password
```

### בעיה: "Login failed"

**פתרון:**
```bash
# בדוק credentials
python get_jwt_token.py email@example.com password

# בדוק שהמשתמש קיים
python list_users.py
```

## 📊 פלטים לדוגמה

### הצלחה:

```
🔐 Attempting to login as: admin@homis.com
🌐 Server URL: http://localhost:5000
✅ Login successful!
👤 User: Admin User
📧 Email: admin@homis.com
🔑 Token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
⏰ Token expires: 604800 seconds

📢 Sending broadcast notification...
📝 Title: עדכון חשוב!
📄 Body: גרסה חדשה זמינה
🌐 Server: http://localhost:5000
✅ Broadcast sent successfully!
👥 Users reached: 120
📱 Devices: 150
```

### שגיאה:

```
❌ Login failed with status: 401
Error: Invalid credentials

❌ Access denied - User is not an admin!
```

## 🎯 טיפים לשימוש

### 1. שמור את ה-Token
```bash
# תמיד שמור token לקובץ
python get_jwt_token.py email@example.com password --save
```

### 2. בדוק לפני שליחה
```bash
# בדוק סטטוס לפני שליחת broadcast
python check_admin_status.py
```

### 3. השתמש ב-Environment Variables
```bash
# הגדר משתני סביבה
export BACKEND_URL="https://production-server.com"
export ADMIN_EMAIL="admin@homis.com"
export ADMIN_PASSWORD="secure_password"
```

### 4. אוטומציה
```bash
# צור סקריפט אוטומציה
cat > auto_broadcast.sh << 'EOF'
#!/bin/bash
python send_broadcast.py "$1" "$2" --token-file jwt_token.txt
EOF

chmod +x auto_broadcast.sh
./auto_broadcast.sh "כותרת" "תוכן"
```

## 🎉 סיכום

עכשיו יש לך:

✅ **3 סקריפטים מלאים** לניהול JWT tokens ו-broadcast  
✅ **מדריך מפורט** עם דוגמאות  
✅ **פתרון בעיות** נפוצות  
✅ **טיפים מתקדמים** לאוטומציה  

**הכל מוכן לשימוש!** 🚀

### Quick Start:
```bash
# 1. הפוך עצמך למנהל
python make_user_admin.py your_email@example.com

# 2. קבל token
python get_jwt_token.py your_email@example.com password --save

# 3. שלח broadcast
python send_broadcast.py "שלום!" "זו הודעה לכל המשתמשים"
```
