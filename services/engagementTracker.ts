import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_VISIT_KEY = 'last_app_visit';
const ENGAGEMENT_ENABLED_KEY = 'engagement_notifications_enabled';

export interface EngagementData {
  lastVisit: Date;
  isEnabled: boolean;
}

/**
 * סקסגה למעקב אחר טמעבדבין איזוסקאצעיל עלינטוריטיה
 */
class EngagementTracker {
  private static instance: EngagementTracker;

  private constructor() {}

  public static getInstance(): EngagementTracker {
    if (!EngagementTracker.instance) {
      EngagementTracker.instance = new EngagementTracker();
    }
    return EngagementTracker.instance;
  }

  /**
   * בודק אם עברו 5 דקות מאז הביקור האחרון (לצורך בדיקה - במקור 4 ימים)
   */
  public async shouldSendEngagementNotification(): Promise<boolean> {
    try {
      const lastVisit = await this.getLastVisit();
      if (!lastVisit) {
        return false; // אם אין ביקור קודם, לא שולחים התראה
      }

      const now = new Date();
      const minutesSinceLastVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60));
      
      return minutesSinceLastVisit >= 5; // 5 דקות לצורך בדיקה
    } catch (error) {
      console.error('Error checking engagement notification:', error);
      return false;
    }
  }

  /**
   * מסק את הביקור הנוכחי
   */
  public async recordVisit(): Promise<void> {
    try {
      const now = new Date();
      await AsyncStorage.setItem(LAST_VISIT_KEY, now.toISOString());
      console.log('📅 Recorded new app visit:', now.toISOString());
    } catch (error) {
      console.error('Error recording visit:', error);
    }
  }

  /**
   * מחזיר את זמן הביקור האחרון
   */
  public async getLastVisit(): Promise<Date | null> {
    try {
      const lastVisitString = await AsyncStorage.getItem(LAST_VISIT_KEY);
      if (!lastVisitString) {
        return null;
      }
      return new Date(lastVisitString);
    } catch (error) {
      console.error('Error getting last visit:', error);
      return null;
    }
  }

  /**
   * מבטל את כל המסקאגעם ההתראות
   */
  public async clearEngagementData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LAST_VISIT_KEY);
      await AsyncStorage.removeItem(ENGAGEMENT_ENABLED_KEY);
      console.log('🗑️ Cleared engagement data');
    } catch (error) {
      console.error('Error clearing engagement data:', error);
    }
  }

  /**
   * מחזיר כמה ימים עברו מאז הביקור האחרון
   */
  public async getDaysSinceLastVisit(): Promise<number> {
    try {
      const lastVisit = await this.getLastVisit();
      if (!lastVisit) {
        return 0;
      }

      const now = new Date();
      return Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days since last visit:', error);
      return 0;
    }
  }

  /**
   * מחזיר כמה דקות עברו מאז הביקור האחרון (לצורך בדיקה)
   */
  public async getMinutesSinceLastVisit(): Promise<number> {
    try {
      const lastVisit = await this.getLastVisit();
      if (!lastVisit) {
        return 0;
      }

      const now = new Date();
      return Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60));
    } catch (error) {
      console.error('Error calculating minutes since last visit:', error);
      return 0;
    }
  }

  /**
   * בדיקה מהירה לבדיקת זמן הביקור האחרון
   */
  public async getVisitInfo(): Promise<{ minutes: number; shouldNotify: boolean }> {
    const minutes = await this.getMinutesSinceLastVisit();
    const shouldNotify = await this.shouldSendEngagementNotification();
    
    return { minutes, shouldNotify };
  }

  /**
   * מפקח אם התראות האינטראקטיביות מופעלות
   */
  public async isEngagementNotificationsEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(ENGAGEMENT_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking engagement notifications status:', error);
      return true; // ברירת מחדל - מופעל
    }
  }

  /**
   * מפעיל או מבטל התראות אינטראקטיביות
   */
  public async setEngagementNotificationsEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(ENGAGEMENT_ENABLED_KEY, enabled.toString());
      console.log('⚙️ Engagement notifications', enabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('Error setting engagement notifications:', error);
    }
  }
}

export default EngagementTracker;
