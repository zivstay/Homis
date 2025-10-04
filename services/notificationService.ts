import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import EngagementTracker from './engagementTracker';

// Configure notification response handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

// הודעות לתחילת שבוע (יום ראשון 12:00)
export const WEEK_START_MESSAGES = [
  {
    title: "התחיל שבוע חדש 🎯",
    body: "פתח את האפליקציה ותראה איך אתה פותח את השבוע מבחינת ההוצאות והתקציב."
  },
  {
    title: "שבוע חדש התחיל! 💪",
    body: "הכנס לאפליקציה והחלט איך תוכל לחסוך השבוע."
  }
];

// הודעות לאמצע השבוע (יום רביעי 19:00)
export const MID_WEEK_MESSAGES = [
  {
    title: "רשימת קניות מחכה לך! 🛒",
    body: "הוסף פריטים לרשימת הקניות כדי לא לשכוח כלום בסופר"
  },
  {
    title: "עדכן את ההוצאות שלך 💰",
    body: "יש לך הוצאות חדשות השבוע? הגיע הזמן להוסיף אותן!"
  },
  {
    title: "בדוק עדכונים 👀",
    body: "אולי חברי הלוח הוסיפו הוצאות חדשות? כדאי לבדוק!"
  },
  {
    title: "אמצע שבוע - זמן לעדכון! 📊",
    body: "הוסף את ההוצאות שעשית עד כה כדי לא לשכוח"
  },
  {
    title: "רגע של ניהול תקציב ⏰",
    body: "זה לוקח רק דקה - הוסף את ההוצאות האחרונות שלך"
  }
];

class NotificationService {
  private static instance: NotificationService;
  private testNotificationInterval: any = null;
  private engagementNotificationInterval: any = null;
  private appStateSubscription: any = null;
  private appBecameInactiveTime: Date | null = null;
  private inactivityCheckInterval: any = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permissions from the user
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get the push notification token
   */
  public async getPushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '9fc51341-7952-470b-8341-39d792d970b5', // From app.json
      });

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Schedule a local notification
   */
  public async scheduleLocalNotification(notificationData: NotificationData, trigger?: Notifications.NotificationTriggerInput): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
        },
        trigger: trigger || null, // null means show immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * שלח התראות לאינטראקטיביות באופן ידני (למקומות צרה)
   */
  public async sendManualEngagementNotification(): Promise<void> {
    const randomMessage = MID_WEEK_MESSAGES[
      Math.floor(Math.random() * MID_WEEK_MESSAGES.length)
    ];

    await this.scheduleLocalNotification({
      title: randomMessage.title,
      body: randomMessage.body,
      data: { type: 'engagement_manual' }
    });

    console.log('📱 Manual engagement notification sent:', randomMessage.title);
  }

  /**
   * Start engagement notifications - Schedule daily notifications at specific times
   */
  public async startTestNotifications(): Promise<void> {
    this.stopTestNotifications(); // Stop any existing test notifications
    await this.cancelAllNotifications(); // Clear any existing scheduled notifications
    
    console.log('🔄 Scheduling daily engagement notifications...');

    // Schedule daily notifications at specific times
    await this.scheduleDailyNotifications();

    console.log('✅ Daily engagement notifications scheduled');
  }

  /**
   * Schedule daily notifications at specific times (works even when app is closed)
   * Notifications will repeat every day at: 9:00, 12:00, 15:00, 18:00, 21:00
   */
  private async scheduleDailyNotifications(): Promise<void> {
    try {
      // Define notification times (hours in 24h format)
      const notificationHours = [9, 12, 15, 18, 21];
      
      for (let i = 0; i < notificationHours.length; i++) {
        const hour = notificationHours[i];
        const randomMessage = MID_WEEK_MESSAGES[i % MID_WEEK_MESSAGES.length];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: randomMessage.title,
            body: randomMessage.body,
            data: { type: 'engagement_daily', hour }
          },
          trigger: {
            hour,
            minute: 0,
            repeats: true
          } as Notifications.CalendarTriggerInput
        });

        console.log(`📅 Scheduled daily notification at ${hour}:00`);
      }

      console.log(`✅ All ${notificationHours.length} daily notifications scheduled successfully`);
    } catch (error) {
      console.error('❌ Error scheduling daily notifications:', error);
    }
  }

  /**
   * Refresh notifications - clear all and schedule new ones for the next 8 weeks
   * This should be called every time the app starts to ensure fresh notifications
   */
  public async refreshNotifications(): Promise<void> {
    try {
      console.log('🔄 Refreshing notifications...');
      
      // Cancel all existing notifications
      await this.cancelAllNotifications();
      console.log('🗑️ Cleared all existing notifications');
      
      // Schedule new weekly notifications
      await this.scheduleWeeklyNotifications();
      
      console.log('✅ Notifications refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing notifications:', error);
    }
  }

  /**
   * Schedule weekly notifications for the next 8 weeks (2 months ahead)
   * - Sunday 12:00: Week start message
   * - Wednesday 19:00: Mid-week reminder
   * - Saturday 18:00: Weekend reminder
   */
  public async scheduleWeeklyNotifications(): Promise<void> {
    try {
      console.log('🔔 Scheduling weekly notifications for the next 8 weeks...');
      
      // Cancel all previous notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Cleared all previous notifications');
      
      const now = new Date();
      let notificationsScheduled = 0;
      
      // Schedule for the next 8 weeks (2 months)
      for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
        
        // 1. Sunday 12:00 notifications
        const sunday = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        if (currentDay === 0) {
          // Today is Sunday - check if 12:00 has passed
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const targetTime = 12 * 60; // 12:00 in minutes
          
          if (currentTime < targetTime) {
            // Today's Sunday 12:00 hasn't passed yet
            sunday.setDate(now.getDate() + (weekOffset * 7));
            sunday.setHours(12, 0, 0, 0);
          } else {
            // Today's Sunday 12:00 has passed, schedule for next Sunday
            sunday.setDate(now.getDate() + 7 + (weekOffset * 7));
            sunday.setHours(12, 0, 0, 0);
          }
        } else {
          // Not Sunday - calculate days until next Sunday
          const daysUntilSunday = (7 - currentDay) % 7 || 7;
          sunday.setDate(now.getDate() + daysUntilSunday + (weekOffset * 7));
          sunday.setHours(12, 0, 0, 0);
        }
        
        // Skip if time already passed
        if (sunday.getTime() > now.getTime()) {
          const weekStartMessage = WEEK_START_MESSAGES[weekOffset % WEEK_START_MESSAGES.length];
          const secondsUntilSunday = Math.floor((sunday.getTime() - now.getTime()) / 1000);
          
          console.log(`📅 Scheduling Sunday notification for ${sunday.toLocaleDateString('he-IL')} at 12:00 (in ${Math.floor(secondsUntilSunday / 60)} minutes)`);
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: weekStartMessage.title,
              body: weekStartMessage.body,
              data: { type: 'week_start', week: weekOffset + 1 }
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsUntilSunday,
              repeats: false
            } as Notifications.TimeIntervalTriggerInput
          });
          
          notificationsScheduled++;
        }
        
        // 2. Wednesday 19:00 notifications
        const wednesday = new Date();
        
        if (currentDay === 3) {
          // Today is Wednesday - check if 19:00 has passed
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const targetTime = 19 * 60; // 19:00 in minutes
          
          if (currentTime < targetTime) {
            // Today's Wednesday 19:00 hasn't passed yet
            wednesday.setDate(now.getDate() + (weekOffset * 7));
            wednesday.setHours(19, 0, 0, 0);
          } else {
            // Today's Wednesday 19:00 has passed, schedule for next Wednesday
            wednesday.setDate(now.getDate() + 7 + (weekOffset * 7));
            wednesday.setHours(19, 0, 0, 0);
          }
        } else {
          // Not Wednesday - calculate days until next Wednesday
          const daysUntilWednesday = (3 - currentDay + 7) % 7 || 7;
          wednesday.setDate(now.getDate() + daysUntilWednesday + (weekOffset * 7));
          wednesday.setHours(19, 0, 0, 0);
        }
        
        // Skip if time already passed
        if (wednesday.getTime() > now.getTime()) {
          const midWeekMessage = MID_WEEK_MESSAGES[weekOffset % MID_WEEK_MESSAGES.length];
          const secondsUntilWednesday = Math.floor((wednesday.getTime() - now.getTime()) / 1000);
          
          console.log(`📅 Scheduling Wednesday notification for ${wednesday.toLocaleDateString('he-IL')} at 19:00 (in ${Math.floor(secondsUntilWednesday / 60)} minutes)`);
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: midWeekMessage.title,
              body: midWeekMessage.body,
              data: { type: 'mid_week', week: weekOffset + 1 }
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsUntilWednesday,
              repeats: false
            } as Notifications.TimeIntervalTriggerInput
          });
          
          notificationsScheduled++;
        }
        
        // 3. Saturday 18:00 notifications
        const saturday = new Date();
        
        if (currentDay === 6) {
          // Today is Saturday - check if 18:00 has passed
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const targetTime = 18 * 60; // 18:00 in minutes
          
          if (currentTime < targetTime) {
            // Today's Saturday 18:00 hasn't passed yet
            saturday.setDate(now.getDate() + (weekOffset * 7));
            saturday.setHours(18, 0, 0, 0);
          } else {
            // Today's Saturday 18:00 has passed, schedule for next Saturday
            saturday.setDate(now.getDate() + 7 + (weekOffset * 7));
            saturday.setHours(18, 0, 0, 0);
          }
        } else {
          // Not Saturday - calculate days until next Saturday
          const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
          saturday.setDate(now.getDate() + daysUntilSaturday + (weekOffset * 7));
          saturday.setHours(18, 0, 0, 0);
        }
        
        // Skip if time already passed
        if (saturday.getTime() > now.getTime()) {
          const secondsUntilSaturday = Math.floor((saturday.getTime() - now.getTime()) / 1000);
          
          console.log(`📅 Scheduling Saturday notification for ${saturday.toLocaleDateString('he-IL')} at 18:00 (in ${Math.floor(secondsUntilSaturday / 60)} minutes)`);
          
          await Notifications.scheduleNotificationAsync({
             content: {
               title: "שבת ב 18:00 🕐",
               body: "שבת שלום! זמן טוב לבדוק את ההוצאות של השבוע",
               data: { type: 'saturday_weekly', week: weekOffset + 1 }
             },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsUntilSaturday,
              repeats: false
            } as Notifications.TimeIntervalTriggerInput
          });
          
          notificationsScheduled++;
        }
      }
      
      // Verify they were scheduled
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Total scheduled notifications: ${allScheduled.length}`);
      console.log(`🎉 Successfully scheduled ${notificationsScheduled} notifications for the next 8 weeks!`);
      console.log('✨ Users can go 2 months without opening the app and still get notifications!');
      
    } catch (error) {
      console.error('❌ Error scheduling weekly notifications:', error);
    }
  }

  /**
   * TEST MODE: Schedule all notification types 1 minute apart for testing
   * This will show all possible notifications quickly
   * PLUS: Weekly Saturday 18:00 notification
   */
  public async scheduleTestMode(): Promise<void> {
    try {
      console.log('🧪 TEST MODE: Scheduling all notifications...');
      
      // Cancel all previous notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Cleared all previous notifications');
      
      let delay = 60; // Start at 1 minute (60 seconds)
      
      // Schedule week start notifications (test both variations)
      for (let i = 0; i < WEEK_START_MESSAGES.length; i++) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: WEEK_START_MESSAGES[i].title,
            body: WEEK_START_MESSAGES[i].body,
            data: { type: 'test_week_start', index: i }
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delay,
            repeats: false
          } as Notifications.TimeIntervalTriggerInput
        });
        
        console.log(`✅ Week start notification ${i + 1} scheduled in ${delay} seconds`);
        delay += 60; // Add 1 minute between each
      }
      
      // Schedule mid-week notifications (test all variations)
      for (let i = 0; i < MID_WEEK_MESSAGES.length; i++) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: MID_WEEK_MESSAGES[i].title,
            body: MID_WEEK_MESSAGES[i].body,
            data: { type: 'test_mid_week', index: i }
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delay,
            repeats: false
          } as Notifications.TimeIntervalTriggerInput
        });
        
        console.log(`✅ Mid-week notification ${i + 1} scheduled in ${delay} seconds`);
        delay += 60; // Add 1 minute between each
      }
      
      // Schedule Saturday 18:00 notification (test version - appears after other tests)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "שבת ב 18:00 🕐",
          body: "זוהי התראת בדיקה לשבת בשעה 18:00",
          data: { type: 'test_saturday' }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delay,
          repeats: false
        } as Notifications.TimeIntervalTriggerInput
      });
      
      console.log(`✅ Saturday notification scheduled in ${delay} seconds`);
      delay += 60;
      
      // Calculate seconds until next Saturday 18:00
      const now = new Date();
      const nextSaturday = new Date();
      
      // Get next Saturday
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7; // 6 = Saturday
      nextSaturday.setDate(now.getDate() + daysUntilSaturday);
      nextSaturday.setHours(18, 0, 0, 0);
      
      // If today is Saturday and time has passed, schedule for next Saturday
      if (now.getDay() === 6 && now.getHours() * 60 + now.getMinutes() >= 18 * 60) {
        nextSaturday.setDate(nextSaturday.getDate() + 7);
      }
      
      const secondsUntilSaturday = Math.floor((nextSaturday.getTime() - now.getTime()) / 1000);
      
      if (secondsUntilSaturday > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "שבת ב 18:00 🕐",
            body: "שבת שלום! זמן טוב לבדוק את ההוצאות של השבוע",
            data: { type: 'saturday_weekly' }
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilSaturday,
            repeats: false
          } as Notifications.TimeIntervalTriggerInput
        });
        
        const daysUntil = Math.floor(secondsUntilSaturday / (24 * 60 * 60));
        const hoursUntil = Math.floor((secondsUntilSaturday % (24 * 60 * 60)) / (60 * 60));
        console.log(`✅ Saturday 18:00 notification scheduled for ${nextSaturday.toLocaleDateString('he-IL')} (in ${daysUntil} days, ${hoursUntil} hours)`);
      }
      
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Total test notifications scheduled: ${allScheduled.length}`);
      console.log(`🧪 Quick test notifications will appear over the next ${delay / 60} minutes`);
      console.log(`📅 PLUS: Next Saturday 18:00 notification`);
      
    } catch (error) {
      console.error('❌ Error scheduling test notifications:', error);
    }
  }

  /**
   * Send instant test notification (for debugging)
   */
  public async sendInstantTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from Homeis!',
          data: { type: 'test' }
        },
        trigger: {
          seconds: 2
        } as Notifications.TimeIntervalTriggerInput
      });
      console.log('✅ Instant test notification scheduled');
    } catch (error) {
      console.error('❌ Error sending instant test notification:', error);
    }
  }

  /**
   * Send a test notification (will work even when app is background)
   */
  private async sendTestNotification(): Promise<void> {
    try {
      const randomMessage = MID_WEEK_MESSAGES[
        Math.floor(Math.random() * MID_WEEK_MESSAGES.length)
      ];

      console.log('🚀 Attempting to send notification:', randomMessage.title);

      // Schedule notification to appear in 5 seconds (works in background)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: randomMessage.title,
          body: randomMessage.body,
          data: { type: 'engagement_periodic' }
        },
        trigger: {
          seconds: 5
        } as Notifications.TimeIntervalTriggerInput
      });

      console.log('✅ Test notification scheduled successfully:', randomMessage.title);
    } catch (error) {
      console.error('❌ Error scheduling test notification:', error);
    }
  }

  /**
   * הפעלת התראות אינטראקטיביות - תזמון התראות מראש
   * פונקציה זו מתזמנת התראות שיופיעו גם כשהאפליקציה סגורה
   */
  public async startEngagementNotifications(): Promise<void> {
    this.stopEngagementNotifications(); // הפסק התראות קיימות
    
    console.log('🔔 Scheduling engagement notifications...');
    
    // תזמון התראות יומיות
    await this.scheduleDailyNotifications();
    
    console.log('✅ Engagement notifications scheduled successfully');
  }

  /**
   * עצירת התראות אינטראקטיביות
   */
  public stopEngagementNotifications(): void {
    if (this.engagementNotificationInterval) {
      clearInterval(this.engagementNotificationInterval);
      this.engagementNotificationInterval = null;
    }
  }

  /**
   * בדיקת האם צריך לשלוח התראת אינטראקטיביות (רק כשהאפליקציה פעילה)
   * @deprecated This method only works when app is active. Use scheduled notifications instead.
   */
  private async checkAndSendEngagementNotification(): Promise<void> {
    try {
      const engagementTracker = EngagementTracker.getInstance();
      
      // בדיקה אם התראות אינטראקטיביות מופעלות
      const isEnabled = await engagementTracker.isEngagementNotificationsEnabled();
      if (!isEnabled) {
        console.log('🔔 Engagement notifications disabled');
        return;
      }

      // בדיקה אם עברו 5 דקות (לצורך בדיקה)
      const shouldSend = await engagementTracker.shouldSendEngagementNotification();
      const visitInfo = await engagementTracker.getVisitInfo();
      
      console.log(`🔍 Engagement check: ${visitInfo.minutes} minutes since last visit, should notify: ${shouldSend}`);
      
      if (!shouldSend) {
        return;
      }

      // בחירת מסר רנדומלי
      const randomMessage = MID_WEEK_MESSAGES[
        Math.floor(Math.random() * MID_WEEK_MESSAGES.length)
      ];

      await this.scheduleLocalNotification({
        title: randomMessage.title,
        body: randomMessage.body,
        data: { type: 'engagement' }
      });

      console.log('📱 Engagement notification sent:', randomMessage);

    } catch (error) {
      console.error('Error checking/sending engagement notification:', error);
    }
  }

  /**
   * Stop test notifications
   */
  public stopTestNotifications(): void {
    if (this.testNotificationInterval) {
      clearInterval(this.testNotificationInterval);
      this.testNotificationInterval = null;
    }
  }

  /**
   * Start tracking app state for inactivity-based notifications
   * @deprecated This method doesn't work when app is fully closed. Use scheduled notifications instead.
   * 
   * Note: AppState and setInterval only work when app is in background/foreground, not when fully closed.
   * For notifications when app is closed, use scheduleDailyNotifications() or scheduleTestNotificationsEvery5Minutes()
   */
  public startInactivityTracking(): void {
    this.stopInactivityTracking(); // Stop any existing tracking

    // Listen to app state changes
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App became inactive/background - schedule notifications for later
        this.appBecameInactiveTime = new Date();
        console.log('📱 App became inactive at:', this.appBecameInactiveTime.toISOString());
        
        // Schedule notifications for 5, 10, 15 minutes from now
        this.scheduleInactivityNotifications();
      } else if (nextAppState === 'active') {
        // App became active - cancel pending inactivity notifications
        this.appBecameInactiveTime = null;
        console.log('📱 App became active again');
      }
    });

    console.log('📱 Started inactivity tracking (will schedule notifications when app goes to background)');
  }

  /**
   * Schedule notifications for when user is inactive (works even when app is closed)
   */
  private async scheduleInactivityNotifications(): Promise<void> {
    try {
      const delays = [5, 10, 15]; // Minutes
      
      for (const delayMinutes of delays) {
        const randomMessage = MID_WEEK_MESSAGES[
          Math.floor(Math.random() * MID_WEEK_MESSAGES.length)
        ];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: randomMessage.title,
            body: randomMessage.body,
            data: { type: 'inactivity_notification', delayMinutes }
          },
          trigger: {
            seconds: delayMinutes * 60
          } as Notifications.TimeIntervalTriggerInput
        });

        console.log(`📅 Scheduled inactivity notification in ${delayMinutes} minutes`);
      }
    } catch (error) {
      console.error('Error scheduling inactivity notifications:', error);
    }
  }

  /**
   * Stop tracking app state
   */
  public stopInactivityTracking(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.appBecameInactiveTime = null;
    this.stopInactivityCheck();
  }

  /**
   * Stop checking for inactivity
   */
  private stopInactivityCheck(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
  }

  /**
   * Send notification when user has been inactive (schedules it for later)
   * @deprecated Use scheduleInactivityNotifications() instead
   */
  private async sendInactivityNotification(): Promise<void> {
    try {
      // Get random engagement message
      const randomMessage = MID_WEEK_MESSAGES[
        Math.floor(Math.random() * MID_WEEK_MESSAGES.length)
      ];

      await this.scheduleLocalNotification({
        title: randomMessage.title,
        body: randomMessage.body,
        data: { type: 'inactivity_notification' }
      });

      console.log('📱 Inactivity notification sent:', randomMessage.title);
    } catch (error) {
      console.error('Error sending inactivity notification:', error);
    }
  }

  /**
   * Send notification for budget exceeded
   */
  public async sendBudgetExceededNotification(categoryName: string, amount: number): Promise<void> {
    await this.scheduleLocalNotification({
      title: 'תקציב חריגה',
      body: `התקציב לקטגוריה "${categoryName}" חרג ב-${amount}₪`,
      data: { type: 'budget_exceeded', category: categoryName, amount }
    });
  }

  /**
   * Send notification for new expense added
   */
  public async sendNewExpenseNotification(expenseTitle: string, amount: number): Promise<void> {
    await this.scheduleLocalNotification({
      title: 'הוצאה חדשה נוספה',
      body: `${expenseTitle} - ${amount}₪`,
      data: { type: 'new_expense', title: expenseTitle, amount }
    });
  }

  /**
   * Send notification for debt reminder
   */
  public async sendDebtReminderNotification(debtorName: string, amount: number): Promise<void> {
    await this.scheduleLocalNotification({
      title: 'תזכורת חוב',
      body: `${debtorName} חייב לך ${amount}₪`,
      data: { type: 'debt_reminder', debtor: debtorName, amount }
    });
  }

  /**
   * Add notification listener
   */
  public addNotificationListener(listener: (notification: Notifications.Notification) => void): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Check status of all weekly notifications
   */
  public checkAllWeeklyNotificationsStatus(): {
    sunday: { isToday: boolean; timePassed: boolean; minutesUntil: number };
    wednesday: { isToday: boolean; timePassed: boolean; minutesUntil: number };
    saturday: { isToday: boolean; timePassed: boolean; minutesUntil: number };
  } {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const checkDayStatus = (targetDay: number, targetHour: number, targetMinute: number = 0) => {
      const isToday = currentDay === targetDay;
      const targetTime = targetHour * 60 + targetMinute;
      const timePassed = isToday ? currentTime >= targetTime : false;
      const minutesUntil = isToday && !timePassed ? targetTime - currentTime : 0;
      
      return { isToday, timePassed, minutesUntil };
    };
    
    return {
      sunday: checkDayStatus(0, 12, 0),      // Sunday 12:00
      wednesday: checkDayStatus(3, 19, 0),    // Wednesday 19:00
      saturday: checkDayStatus(6, 18, 0)      // Saturday 18:00
    };
  }

  /**
   * Debug function to check scheduled notifications
   */
  public async debugScheduledNotifications(): Promise<void> {
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Total scheduled notifications: ${allScheduled.length}`);
      
      allScheduled.forEach((notification, index) => {
        const trigger = notification.trigger as any;
        console.log(`📅 Notification ${index + 1}:`);
        console.log(`   Title: ${notification.content.title}`);
        console.log(`   Body: ${notification.content.body}`);
        console.log(`   Data: ${JSON.stringify(notification.content.data)}`);
        
        if (trigger.seconds) {
          const minutes = Math.floor(trigger.seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          console.log(`   Trigger: ${trigger.seconds} seconds (${days}d ${hours % 24}h ${minutes % 60}m)`);
        } else if (trigger.hour !== undefined) {
          console.log(`   Trigger: Daily at ${trigger.hour}:${trigger.minute || 0}`);
        }
        console.log('---');
      });
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
    }
  }

}

export default NotificationService;
