"""
Notification Service for Expo Push Notifications
Handles sending push notifications via Expo Push Notification Service
"""

import logging
import requests
from typing import List, Dict, Optional, Union
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PushMessage:
    """Data structure for push notification message"""
    to: str  # Expo push token
    title: str
    body: str
    data: Optional[Dict] = None
    sound: str = 'default'
    badge: Optional[int] = None
    priority: str = 'default'  # 'default' or 'high'
    ttl: Optional[int] = None  # Time to live in seconds
    expiration: Optional[int] = None  # Unix timestamp


class ExpoNotificationService:
    """Service for sending push notifications via Expo"""
    
    EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
    EXPO_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts'
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        })
    
    @staticmethod
    def validate_push_token(token: str) -> bool:
        """
        Validate if token is a valid Expo push token
        
        Args:
            token: Expo push token string
            
        Returns:
            bool: True if valid, False otherwise
        """
        if not token or not isinstance(token, str):
            return False
        
        # Expo push tokens start with ExponentPushToken[
        return token.startswith('ExponentPushToken[') or token.startswith('ExpoPushToken[')
    
    def send_push_notification(
        self,
        tokens: Union[str, List[str]],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = 'default',
        badge: Optional[int] = None,
        priority: str = 'default',
        ttl: Optional[int] = None
    ) -> Dict:
        """
        Send push notification to one or more devices
        
        Args:
            tokens: Single token or list of tokens
            title: Notification title
            body: Notification body
            data: Optional data payload
            sound: Sound to play ('default' or None)
            badge: Badge number to display
            priority: 'default' or 'high'
            ttl: Time to live in seconds
            
        Returns:
            Dict with response data including success/failure info
        """
        # Ensure tokens is a list
        if isinstance(tokens, str):
            tokens = [tokens]
        
        # Filter out invalid tokens
        valid_tokens = [token for token in tokens if self.validate_push_token(token)]
        
        if not valid_tokens:
            logger.warning('No valid Expo push tokens provided')
            return {
                'success': False,
                'error': 'No valid tokens',
                'sent': 0,
                'failed': len(tokens)
            }
        
        # Build messages
        messages = []
        for token in valid_tokens:
            message = {
                'to': token,
                'title': title,
                'body': body,
                'sound': sound,
                'priority': priority,
            }
            
            if data:
                message['data'] = data
            
            if badge is not None:
                message['badge'] = badge
            
            if ttl is not None:
                message['ttl'] = ttl
            
            messages.append(message)
        
        try:
            # Send to Expo Push Notification Service
            response = self.session.post(
                self.EXPO_PUSH_URL,
                json=messages,
                timeout=10
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Process response
            data_response = result.get('data', [])
            success_count = sum(1 for item in data_response if item.get('status') == 'ok')
            error_count = len(data_response) - success_count
            
            logger.info(f'Sent {success_count} notifications successfully, {error_count} failed')
            
            return {
                'success': True,
                'sent': success_count,
                'failed': error_count,
                'responses': data_response
            }
            
        except requests.RequestException as e:
            logger.error(f'Error sending push notification: {e}')
            return {
                'success': False,
                'error': str(e),
                'sent': 0,
                'failed': len(valid_tokens)
            }
    
    def send_notification_to_user(
        self,
        user_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        **kwargs
    ) -> Dict:
        """
        Send notification to a user (can have multiple devices)
        
        Args:
            user_tokens: List of user's Expo push tokens
            title: Notification title
            body: Notification body
            data: Optional data payload
            **kwargs: Additional notification parameters
            
        Returns:
            Dict with response data
        """
        return self.send_push_notification(
            tokens=user_tokens,
            title=title,
            body=body,
            data=data,
            **kwargs
        )
    
    def send_batch_notifications(
        self,
        notifications: List[PushMessage]
    ) -> Dict:
        """
        Send batch of notifications (up to 100 at once per Expo limits)
        
        Args:
            notifications: List of PushMessage objects
            
        Returns:
            Dict with batch response data
        """
        if not notifications:
            return {
                'success': False,
                'error': 'No notifications to send',
                'sent': 0,
                'failed': 0
            }
        
        # Expo allows max 100 notifications per request
        batch_size = 100
        total_sent = 0
        total_failed = 0
        all_responses = []
        
        for i in range(0, len(notifications), batch_size):
            batch = notifications[i:i + batch_size]
            
            # Build messages for this batch
            messages = []
            for notif in batch:
                if not self.validate_push_token(notif.to):
                    total_failed += 1
                    continue
                
                message = {
                    'to': notif.to,
                    'title': notif.title,
                    'body': notif.body,
                    'sound': notif.sound,
                    'priority': notif.priority,
                }
                
                if notif.data:
                    message['data'] = notif.data
                
                if notif.badge is not None:
                    message['badge'] = notif.badge
                
                if notif.ttl is not None:
                    message['ttl'] = notif.ttl
                
                messages.append(message)
            
            if not messages:
                continue
            
            try:
                response = self.session.post(
                    self.EXPO_PUSH_URL,
                    json=messages,
                    timeout=10
                )
                
                response.raise_for_status()
                result = response.json()
                
                data_response = result.get('data', [])
                batch_sent = sum(1 for item in data_response if item.get('status') == 'ok')
                batch_failed = len(data_response) - batch_sent
                
                total_sent += batch_sent
                total_failed += batch_failed
                all_responses.extend(data_response)
                
            except requests.RequestException as e:
                logger.error(f'Error sending batch notifications: {e}')
                total_failed += len(messages)
        
        logger.info(f'Batch complete: {total_sent} sent, {total_failed} failed')
        
        return {
            'success': total_sent > 0,
            'sent': total_sent,
            'failed': total_failed,
            'responses': all_responses
        }


# Notification templates for different events
class NotificationTemplates:
    """Templates for common notification types"""
    
    @staticmethod
    def expense_added(expense_description: str, amount: float, board_name: str, creator_name: str) -> Dict:
        """Template for new expense notification"""
        return {
            'title': f'הוצאה חדשה ב{board_name}',
            'body': f'{creator_name} הוסיף הוצאה: {expense_description} - ₪{amount:.2f}',
            'data': {
                'type': 'expense_added',
                'board_name': board_name
            }
        }
    
    @staticmethod
    def budget_exceeded(board_name: str, budget: float, current_spent: float) -> Dict:
        """Template for budget exceeded notification"""
        exceeded_by = current_spent - budget
        return {
            'title': f'⚠️ תקציב חריגה ב{board_name}',
            'body': f'התקציב חרג ב-₪{exceeded_by:.2f} (תקציב: ₪{budget:.2f})',
            'data': {
                'type': 'budget_exceeded',
                'board_name': board_name
            }
        }
    
    @staticmethod
    def budget_alert(board_name: str, percentage: int, budget: float, current_spent: float) -> Dict:
        """Template for budget alert notification"""
        return {
            'title': f'התראת תקציב ב{board_name}',
            'body': f'השתמשת ב-{percentage}% מהתקציב (₪{current_spent:.2f} מתוך ₪{budget:.2f})',
            'data': {
                'type': 'budget_alert',
                'board_name': board_name,
                'percentage': percentage
            }
        }
    
    @staticmethod
    def debt_reminder(debtor_name: str, amount: float, board_name: str) -> Dict:
        """Template for debt reminder notification"""
        return {
            'title': 'תזכורת חוב',
            'body': f'{debtor_name} חייב לך ₪{amount:.2f} בלוח {board_name}',
            'data': {
                'type': 'debt_reminder',
                'board_name': board_name
            }
        }
    
    @staticmethod
    def board_invitation(board_name: str, inviter_name: str) -> Dict:
        """Template for board invitation notification"""
        return {
            'title': 'הזמנה ללוח חדש',
            'body': f'{inviter_name} הזמין אותך ללוח "{board_name}"',
            'data': {
                'type': 'board_invitation',
                'board_name': board_name
            }
        }
    
    @staticmethod
    def shopping_list_update(board_name: str, updater_name: str) -> Dict:
        """Template for shopping list update notification"""
        return {
            'title': f'רשימת קניות עודכנה - {board_name}',
            'body': f'{updater_name} עדכן את רשימת הקניות',
            'data': {
                'type': 'shopping_list_update',
                'board_name': board_name
            }
        }
    
    @staticmethod
    def engagement_reminder(message_title: str, message_body: str) -> Dict:
        """Template for engagement/reminder notifications"""
        return {
            'title': message_title,
            'body': message_body,
            'data': {
                'type': 'engagement_reminder'
            }
        }


# Singleton instance
_notification_service_instance: Optional[ExpoNotificationService] = None


def get_notification_service() -> ExpoNotificationService:
    """Get or create notification service singleton"""
    global _notification_service_instance
    if _notification_service_instance is None:
        _notification_service_instance = ExpoNotificationService()
    return _notification_service_instance

