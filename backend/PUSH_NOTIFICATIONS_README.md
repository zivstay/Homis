# Push Notifications Infrastructure

תשתית מלאה לניהול התראות Push דרך Expo Push Notification Service.

## סקירה כללית

התשתית כוללת:

1. **מודל דטאבייס** (`PushToken`) - לשמירת Expo push tokens של משתמשים
2. **שירות התראות** (`notifications.py`) - לשליחת התראות דרך Expo Push Notification Service
3. **API Endpoints** - לניהול tokens ושליחת התראות
4. **Migration Script** - ליצירת טבלת push_tokens בדטאבייס

## התקנה

### 1. התקן את הספריות הנדרשות

```bash
pip install -r requirements.txt
```

### 2. הרץ את ה-Migration

```bash
python add_push_tokens_migration.py
```

זה ייצור את טבלת `push_tokens` בדטאבייס.

## שימוש

### Client Side (React Native / Expo)

#### 1. קבלת Push Token

```typescript
import * as Notifications from 'expo-notifications';

async function registerPushToken() {
  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Permission denied');
    return;
  }

  // Get token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id',
  });

  // Register with backend
  await fetch('https://your-backend.com/api/push-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${yourJwtToken}`,
    },
    body: JSON.stringify({
      expo_push_token: token.data,
      device_id: 'unique-device-id',
      device_name: 'iPhone 12',
      device_os: 'iOS 14.5',
    }),
  });
}
```

### Server Side (Python Backend)

#### 1. שליחת התראה בסיסית

```python
from notifications import get_notification_service
from postgres_models import PushToken

# Get notification service
notification_service = get_notification_service()

# Get user's tokens
tokens = PushToken.query.filter_by(
    user_id=user_id,
    is_active=True
).all()

token_strings = [token.expo_push_token for token in tokens]

# Send notification
result = notification_service.send_push_notification(
    tokens=token_strings,
    title='כותרת ההודעה',
    body='תוכן ההודעה',
    data={'type': 'expense_added', 'expense_id': '123'}
)
```

#### 2. שימוש בטמפלייטים

```python
from notifications import NotificationTemplates, get_notification_service

# Create notification from template
notification_data = NotificationTemplates.expense_added(
    expense_description='קניות',
    amount=150.0,
    board_name='משפחה',
    creator_name='יוסי'
)

# Send it
notification_service = get_notification_service()
result = notification_service.send_push_notification(
    tokens=token_strings,
    **notification_data
)
```

#### 3. שליחה לכלל משתמשי הלוח

```python
from notifications import get_notification_service, NotificationTemplates
from postgres_models import PushToken, BoardMember

# Get all board members
board_members = BoardMember.query.filter_by(
    board_id=board_id,
    is_active=True
).all()

user_ids = [member.user_id for member in board_members]

# Get all their tokens
tokens = PushToken.query.filter(
    PushToken.user_id.in_(user_ids),
    PushToken.is_active == True
).all()

token_strings = [token.expo_push_token for token in tokens]

# Send notification
notification_data = NotificationTemplates.expense_added(
    expense_description='קניות',
    amount=150.0,
    board_name='משפחה',
    creator_name='יוסי'
)

notification_service = get_notification_service()
result = notification_service.send_push_notification(
    tokens=token_strings,
    **notification_data
)
```

## API Endpoints

### 1. רישום Push Token

**POST** `/api/push-tokens`

Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Body:
```json
{
  "expo_push_token": "ExponentPushToken[xxxxxx]",
  "device_id": "unique-device-id",
  "device_name": "iPhone 12",
  "device_os": "iOS 14.5"
}
```

Response (200):
```json
{
  "message": "Push token registered successfully",
  "token_id": "token-uuid"
}
```

### 2. קבלת רשימת Tokens של המשתמש

**GET** `/api/push-tokens`

Headers:
```
Authorization: Bearer <jwt_token>
```

Response (200):
```json
{
  "tokens": [
    {
      "id": "token-uuid",
      "user_id": "user-uuid",
      "expo_push_token": "ExponentPushToken[xxxxxx]",
      "device_id": "device-id",
      "device_name": "iPhone 12",
      "device_os": "iOS 14.5",
      "is_active": true,
      "created_at": "2024-01-01T12:00:00",
      "updated_at": "2024-01-01T12:00:00"
    }
  ]
}
```

### 3. מחיקת Push Token

**DELETE** `/api/push-tokens/<token_id>`

Headers:
```
Authorization: Bearer <jwt_token>
```

Response (200):
```json
{
  "message": "Push token deactivated"
}
```

### 4. שליחת התראת בדיקה

**POST** `/api/push-notifications/test`

Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Body:
```json
{
  "title": "Test Title",
  "body": "Test Body",
  "data": {"type": "test"}
}
```

Response (200):
```json
{
  "message": "Test notification sent",
  "result": {
    "success": true,
    "sent": 1,
    "failed": 0,
    "responses": [...]
  }
}
```

### 5. שליחת התראה למשתמשים ספציפיים

**POST** `/api/push-notifications/send`

Headers:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Body:
```json
{
  "user_ids": ["user-id-1", "user-id-2"],
  "title": "כותרת ההתראה",
  "body": "תוכן ההתראה",
  "data": {"type": "expense_added", "board_id": "board-123"}
}
```

Response (200):
```json
{
  "message": "Notifications sent",
  "result": {
    "success": true,
    "sent": 2,
    "failed": 0,
    "responses": [...]
  }
}
```

## Notification Templates

השירות כולל טמפלייטים מוכנים לסוגי התראות שונים:

### 1. Expense Added
```python
NotificationTemplates.expense_added(
    expense_description='קניות',
    amount=150.0,
    board_name='משפחה',
    creator_name='יוסי'
)
```

### 2. Budget Exceeded
```python
NotificationTemplates.budget_exceeded(
    board_name='משפחה',
    budget=1000.0,
    current_spent=1200.0
)
```

### 3. Budget Alert
```python
NotificationTemplates.budget_alert(
    board_name='משפחה',
    percentage=75,
    budget=1000.0,
    current_spent=750.0
)
```

### 4. Debt Reminder
```python
NotificationTemplates.debt_reminder(
    debtor_name='יוסי',
    amount=50.0,
    board_name='משפחה'
)
```

### 5. Board Invitation
```python
NotificationTemplates.board_invitation(
    board_name='משפחה',
    inviter_name='דני'
)
```

### 6. Shopping List Update
```python
NotificationTemplates.shopping_list_update(
    board_name='משפחה',
    updater_name='שרה'
)
```

### 7. Engagement Reminder
```python
NotificationTemplates.engagement_reminder(
    message_title='התחיל שבוע חדש',
    message_body='פתח את האפליקציה ותראה איך אתה פותח את השבוע'
)
```

## דוגמאות שימוש מתקדם

### שליחה אוטומטית בעת הוספת הוצאה

```python
@app.route('/api/expenses', methods=['POST'])
@require_auth
def add_expense():
    # ... create expense ...
    
    # Send notifications to board members
    from notifications import get_notification_service, NotificationTemplates
    from postgres_models import PushToken, BoardMember
    
    # Get board members
    members = BoardMember.query.filter_by(
        board_id=board_id,
        is_active=True
    ).all()
    
    # Exclude the creator
    user_ids = [m.user_id for m in members if m.user_id != current_user_id]
    
    # Get tokens
    tokens = PushToken.query.filter(
        PushToken.user_id.in_(user_ids),
        PushToken.is_active == True
    ).all()
    
    if tokens:
        token_strings = [t.expo_push_token for t in tokens]
        
        # Create notification
        notification_data = NotificationTemplates.expense_added(
            expense_description=expense.description,
            amount=expense.amount,
            board_name=board.name,
            creator_name=current_user.first_name
        )
        
        # Send
        notification_service = get_notification_service()
        notification_service.send_push_notification(
            tokens=token_strings,
            **notification_data
        )
    
    return jsonify({'message': 'Expense added', 'id': expense.id}), 201
```

### שליחת התראות לפי תקציב

```python
def check_and_send_budget_alerts(board_id):
    """Check budget and send alerts if needed"""
    from notifications import get_notification_service, NotificationTemplates
    from postgres_models import Board, PushToken, BoardMember
    
    board = Board.query.get(board_id)
    if not board or not board.budget_amount:
        return
    
    # Calculate current spending
    total_spent = calculate_board_expenses(board_id)
    budget = board.budget_amount
    percentage = (total_spent / budget) * 100
    
    # Check if we need to send alert
    alert_thresholds = board.budget_alerts or [50, 75, 90]
    
    for threshold in alert_thresholds:
        if percentage >= threshold:
            # Get board members
            members = BoardMember.query.filter_by(
                board_id=board_id,
                is_active=True
            ).all()
            
            user_ids = [m.user_id for m in members]
            
            # Get tokens
            tokens = PushToken.query.filter(
                PushToken.user_id.in_(user_ids),
                PushToken.is_active == True
            ).all()
            
            if tokens:
                token_strings = [t.expo_push_token for t in tokens]
                
                # Create notification
                if percentage >= 100:
                    notification_data = NotificationTemplates.budget_exceeded(
                        board_name=board.name,
                        budget=budget,
                        current_spent=total_spent
                    )
                else:
                    notification_data = NotificationTemplates.budget_alert(
                        board_name=board.name,
                        percentage=threshold,
                        budget=budget,
                        current_spent=total_spent
                    )
                
                # Send
                notification_service = get_notification_service()
                notification_service.send_push_notification(
                    tokens=token_strings,
                    **notification_data
                )
            
            break  # Send only one alert
```

## Best Practices

1. **תמיד בדוק permissions** - וודא שהמשתמש אישר קבלת התראות
2. **נהל tokens נכון** - עדכן או מחק tokens כשהמשתמש מתנתק או מוחק את האפליקציה
3. **אל תשלח יותר מדי** - התראות תכופות מדי יכולות להרגיז משתמשים
4. **השתמש ב-data payload** - שלח מידע נוסף שיעזור לאפליקציה לנווט למקום הנכון
5. **טפל בשגיאות** - Expo יכול להחזיר שגיאות אם token לא תקין
6. **Batch operations** - שלח התראות ב-batches של עד 100 כל פעם

## Troubleshooting

### Token לא עובד
- ודא ש-token מתחיל ב-`ExponentPushToken[` או `ExpoPushToken[`
- בדוק ש-token לא פג תוקף
- ודא שהמשתמש אישר permissions

### התראות לא מגיעות
- בדוק שהתראות מופעלות במכשיר
- ודא שהאפליקציה לא ב-DND mode
- בדוק logs בשרת לשגיאות

### Performance issues
- השתמש ב-batch operations לשליחה למספר משתמשים
- שמור indexes על `user_id` ו-`is_active`
- נקה tokens ישנים שלא פעילים

## Logs

השירות כותב logs מפורטים:

```python
# Success
INFO: Sent 5 notifications successfully, 0 failed

# Failure
ERROR: Error sending push notification: Connection timeout
```

## תמיכה

לשאלות או בעיות, צור issue בגיטהאב או פנה אל צוות הפיתוח.

## רישיון

MIT License - ראה קובץ LICENSE למידע נוסף.

