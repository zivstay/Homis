# Budget Auto-Reset Feature

## תיאור התכונה

תכונת איפוס תקציב אוטומטי מאפשרת למשתמשים להגדיר איפוס אוטומטי של התקציב בכל חודש ביום מסוים.

### מה התכונה עושה:

1. **איפוס אוטומטי**: המשתמש יכול להגדיר שהתקציב יתאפס אוטומטיטי בכל חודש
2. **יום מותאם אישית**: ניתן לבחור באיזה יום בחודש (1-31) יתבצע האיפוס
3. **חישוב הוצאות מאז האיפוס**: ההוצאות מחושבות רק מתאריך האיפוס האחרון

## שדות חדשים במודל Board

```python
budget_auto_reset = Column(Boolean, default=False)  # האם לאפס אוטומטית
budget_reset_day = Column(Integer, nullable=True)  # יום בחודש לאיפוס (1-31)
budget_last_reset = Column(DateTime, nullable=True)  # תאריך האיפוס האחרון
```

## API Changes

### Board Update Endpoint
```
PUT /api/boards/<board_id>
```

שדות חדשים שנוספו:
- `budget_auto_reset`: boolean
- `budget_reset_day`: number (1-31)

### Board Response
כל ה-endpoints שמחזירים מידע על לוח כוללים עכשיו:
- `budget_auto_reset`: boolean
- `budget_reset_day`: number | null
- `budget_last_reset`: string | null (ISO date)

## Frontend Changes

### BudgetEditModal
נוסף קטע חדש "איפוס אוטומטי" עם:
1. מתג לאפשר/לבטל איפוס אוטומטי
2. שדה להכנסת יום בחודש (1-31)
3. הסבר על התכונה

### Props Changes
```typescript
interface BudgetEditModalProps {
  // ... existing props
  currentAutoReset?: boolean;
  currentResetDay?: number | null;
  onSave: (budgetAmount: number | null, alerts: number[], autoReset: boolean, resetDay: number | null) => void;
}
```

## Logic Flow

### בדיקת איפוס אוטומטי
הפונקציה `check_and_reset_budget_if_needed()` נקראת ב:
- `get_board()` - קבלת פרטי לוח
- `get_user_boards()` - קבלת רשימת לוחות
- `get_board_budget_status()` - קבלת סטטוס תקציב

### חישוב הוצאות
הפונקציה `calculate_board_total_expenses()` עודכנה לחשב הוצאות רק מאז האיפוס האחרון (אם יש).

## Installation Instructions

### 1. הרצת מיגרציה
```bash
cd backend
python add_budget_reset_fields_migration.py
```

### 2. עדכון Frontend
הקומפוננט BudgetEditModal עודכן אוטומטית ויכלול את השדות החדשים.

### 3. בדיקת התכונה
1. פתח הגדרות תקציב בלוח
2. הפעל "איפוס אוטומטי"
3. בחר יום בחודש (למשל 1 לראש חודש)
4. שמור
5. התקציב יתאפס אוטומטית בכל חודש ביום שנבחר

## דוגמאות שימוש

### הגדרת איפוס בראש חודש
```json
{
  "budget_amount": 5000,
  "budget_alerts": [50, 75, 90],
  "budget_auto_reset": true,
  "budget_reset_day": 1
}
```

### הגדרת איפוס ב-15 לחודש
```json
{
  "budget_amount": 3000,
  "budget_alerts": [75, 90],
  "budget_auto_reset": true,
  "budget_reset_day": 15
}
```

## בדיקות מומלצות

1. **איפוס בסוף חודש**: הגדר יום 31 ובדוק שמתבצע איפוס גם בחודשים עם פחות ימים
2. **איפוס מרובה**: הגדר מספר לוחות עם ימי איפוס שונים
3. **חישוב הוצאות**: ודא שהוצאות מחושבות נכון מאז האיפוס האחרון
4. **התראות**: ודא שהתראות עובדות נכון עם איפוס אוטומטי

## Technical Notes

- האיפוס מתבצע רק עדכון תאריך `budget_last_reset` - ההוצאות עצמן לא נמחקות
- חישוב ההוצאות מסנן הוצאות לפי תאריך האיפוס האחרון
- הבדיקה מתבצעת בכל קריאה לפונקציות GET נפוצות
- התכונה backward compatible - לוחות ישנים ימשיכו לעבוד כרגיל
