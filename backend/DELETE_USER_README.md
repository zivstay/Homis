# Homis User Deletion Tool

סקריפט פייתון למחיקת משתמשים ממסד הנתונים PostgreSQL לפי כתובת אימייל.

## ⚠️ אזהרה חשובה

**סקריפט זה מוחק משתמשים לצמיתות!** הפעולה אינה הפיכה ומוחקת את כל הנתונים הקשורים למשתמש.

## דרישות

- Python 3.7+
- קובץ `.env` עם משתנה `DATABASE_URL`
- חבילות Python: `sqlalchemy`, `psycopg2` או `pg8000`, `python-dotenv`

## התקנה

1. **התקן את החבילות הנדרשות:**
```bash
pip install sqlalchemy psycopg2-binary python-dotenv
```

2. **צור קובץ `.env` בתיקיית `backend`:**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## שימוש

### מחיקת משתמש עם אישור
```bash
python delete_user.py user@example.com
```

### מחיקת משתמש ללא אישור (force mode)
```bash
python delete_user.py user@example.com --force
```

### עזרה
```bash
python delete_user.py --help
```

## מה הסקריפט עושה

1. **מתחבר למסד הנתונים** באמצעות `DATABASE_URL`
2. **מחפש את המשתמש** לפי כתובת האימייל
3. **מציג מידע על המשתמש:**
   - פרטי החשבון
   - לוחות (boards) שהמשתמש חבר בהם
   - הוצאות שהמשתמש יצר
4. **מבקש אישור** לפני המחיקה
5. **מוחק את המשתמש ואת כל הנתונים הקשורים:**
   - הוצאות שנוצרו על ידי המשתמש
   - חובות (debts) הקשורים למשתמש
   - חברות בלוחות
   - חשבון המשתמש עצמו

## דוגמה לשימוש

```bash
$ python delete_user.py test@example.com

🔧 Homis User Deletion Tool
========================================
🎯 Target email: test@example.com

🔧 Trying to connect with: postgresql://user:pass@localhost:5432/homis_db
✅ Database connection successful!

📋 User found:
   ID: 123e4567-e89b-12d3-a456-426614174000
   Email: test@example.com
   Username: test
   Name: John Doe
   Created: 2024-01-15 10:30:00
   Active: True
   Email Verified: True

📋 User is member of 2 board(s):
   - Home Expenses (owner) (Default)
   - Work Expenses (member)

📋 User has created 15 expense(s)

⚠️  WARNING: You are about to delete user 'test@example.com'
   This action will:
   - Delete the user account
   - Remove user from 2 board(s)
   - Delete 15 expense(s) created by the user
   - This action is IRREVERSIBLE!

❓ Are you sure you want to delete user 'test@example.com'? (yes/no): yes

🗑️  Starting deletion process...
   - Starting database transaction...
   - Deleting user's expenses...
     Deleted 15 expense(s)
   - Deleting user's debts...
     Deleted 3 debt(s)
   - Removing user from boards...
     Removed from 2 board(s)
   - Deleting user account...
     Deleted user account
   - Committing changes...
✅ User deletion completed successfully!

🎉 User 'test@example.com' has been successfully deleted!
   All related data has been removed from the database.
```

## אבטחה

- הסקריפט משתמש בטרנזקציות כדי להבטיח שכל הפעולות מתבצעות או לא מתבצעות כלל
- אם יש שגיאה, כל השינויים מתבטלים (rollback)
- הסקריפט מבקש אישור לפני מחיקה (אלא אם כן משתמשים ב-`--force`)

## פתרון בעיות

### שגיאת חיבור למסד הנתונים
- ודא ש-`DATABASE_URL` מוגדר נכון ב-`.env`
- ודא שמסד הנתונים PostgreSQL פועל
- ודא שהמשתמש והסיסמה נכונים

### שגיאת הרשאות
- ודא שלמשתמש יש הרשאות מחיקה בטבלאות הרלוונטיות
- ודא שהמשתמש יכול להתחבר למסד הנתונים

### שגיאת חבילות Python
```bash
pip install --upgrade sqlalchemy psycopg2-binary python-dotenv
```

## הערות נוספות

- הסקריפט מוחק רק משתמשים קיימים - אם המשתמש לא קיים, לא יבוצעו שינויים
- כל הפעולות מתבצעות בטרנזקציה אחת כדי לשמור על עקביות הנתונים
- הסקריפט תומך גם ב-Heroku PostgreSQL (מתקן אוטומטית את ה-URL) 