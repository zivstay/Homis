import AsyncStorage from '@react-native-async-storage/async-storage';
import { adMobService } from './admobService';

class AdManager {
  private static instance: AdManager;
  private readonly AD_COOLDOWN_KEY = 'ad_last_shown_time';
  private readonly FIRST_LAUNCH_KEY = 'app_first_launch_time';
  private readonly COOLDOWN_MINUTES = 20; // 30 שניות (לבדיקה)
  private readonly GRACE_PERIOD_HOURS = 0.25; // 6 שעות ללא פרסומות למשתמשים חדשים

  public static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  /**
   * אתחול זמן השימוש הראשון באפליקציה אם לא קיים
   */
  private async initializeFirstLaunchTime(): Promise<void> {
    try {
      const firstLaunchTime = await AsyncStorage.getItem(this.FIRST_LAUNCH_KEY);
      
      if (!firstLaunchTime) {
        const currentTime = Date.now();
        await AsyncStorage.setItem(this.FIRST_LAUNCH_KEY, currentTime.toString());
        console.log(`🎯 AdManager: First launch time set to ${new Date(currentTime).toLocaleString()}`);
      }
    } catch (error) {
      console.error('🎯 AdManager: Error initializing first launch time:', error);
    }
  }

  /**
   * בדיקה אם עברה תקופת החסד של 6 שעות מההשקה הראשונה
   */
  private async hasGracePeriodPassed(): Promise<boolean> {
    try {
      await this.initializeFirstLaunchTime(); // וודא שזמן השקה ראשונה קיים
      
      const firstLaunchTime = await AsyncStorage.getItem(this.FIRST_LAUNCH_KEY);
      
      if (!firstLaunchTime) {
        console.log('🎯 AdManager: No first launch time found, grace period active');
        return false; // אם אין זמן השקה, אל תציג פרסומות
      }

      const firstLaunch = parseInt(firstLaunchTime, 10);
      const currentTime = Date.now();
      const timeDiff = currentTime - firstLaunch;
      const gracePeriodMs = this.GRACE_PERIOD_HOURS * 60 * 60 * 1000; // 6 שעות במילישניות

      const hoursAgo = Math.round(timeDiff / (1000 * 60 * 60));
      console.log(`🎯 AdManager: First launch was ${hoursAgo} hours ago (need ${this.GRACE_PERIOD_HOURS}+ hours)`);
      
      const gracePassed = timeDiff >= gracePeriodMs;
      console.log(`🎯 AdManager: Grace period passed: ${gracePassed}`);
      
      return gracePassed;
    } catch (error) {
      console.error('🎯 AdManager: Error checking grace period:', error);
      return false; // במקרה של שגיאה, אל תציג פרסומות
    }
  }

  /**
   * בדיקה אם ניתן להציג פרסומת (עברה תקופת החסד של 6 שעות ולא הוצגה פרסומת בזמן האחרון)
   */
  private async canShowAd(): Promise<boolean> {
    try {
      // בדיקה ראשונה: האם עברה תקופת החסד של 6 שעות
      const gracePeriodPassed = await this.hasGracePeriodPassed();
      
      if (!gracePeriodPassed) {
        console.log('🎯 AdManager: Cannot show ad - still in 6-hour grace period');
        return false;
      }

      // בדיקה שנייה: בדיקת הקירור הרגיל בין פרסומות
      const lastShownTime = await AsyncStorage.getItem(this.AD_COOLDOWN_KEY);
      
      if (!lastShownTime) {
        console.log('🎯 AdManager: Grace period passed and no previous ad shown, can show ad');
        return true; // אם עברה תקופת החסד ולא הוצגה פרסומת מעולם
      }

      const lastShown = parseInt(lastShownTime, 10);
      const currentTime = Date.now();
      const timeDiff = currentTime - lastShown;
      const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000; // קירור במילישניות

      const secondsAgo = Math.round(timeDiff / 1000);
      console.log(`🎯 AdManager: Last ad shown ${secondsAgo} seconds ago (need ${this.COOLDOWN_MINUTES * 60}+ seconds)`);
      
      const canShow = timeDiff >= cooldownMs;
      console.log(`🎯 AdManager: Grace period passed, cooldown check: ${canShow}`);
      
      return canShow;
    } catch (error) {
      console.error('🎯 AdManager: Error checking ad cooldown:', error);
      return false; // במקרה של שגיאה, אל תציג פרסומות (בטיחות)
    }
  }

  /**
   * בדיקה פומבית אם ניתן להציג פרסומת
   */
  public async checkCanShowAd(): Promise<boolean> {
    return await this.canShowAd();
  }

  /**
   * עדכון זמן הצגת הפרסומת האחרונה
   */
  private async updateLastShownTime(): Promise<void> {
    try {
      const currentTime = Date.now();
      await AsyncStorage.setItem(this.AD_COOLDOWN_KEY, currentTime.toString());
      console.log(`🎯 AdManager: Updated last shown time to ${new Date(currentTime).toLocaleTimeString()}`);
    } catch (error) {
      console.error('🎯 AdManager: Error updating ad last shown time:', error);
    }
  }

  /**
   * הצגת פרסומת אם מותר (בדיקת זמן)
   * @param adType סוג הפרסומת לזיהוי בלוגים
   */
  public async showAdIfAllowed(adType: string = 'general'): Promise<boolean> {
    try {
      console.log(`🎯 AdManager: Attempting to show ${adType} ad`);
      
      const canShow = await this.canShowAd();
      
      if (!canShow) {
        console.log(`🎯 AdManager: Not showing ${adType} ad - cooldown active`);
        return false;
      }

      console.log(`🎯 AdManager: Cooldown passed, trying to show ${adType} interstitial ad`);
      const adShown = await adMobService.showInterstitialAd();
      
      if (adShown) {
        console.log(`🎯 AdManager: Successfully showed ${adType} ad`);
        await this.updateLastShownTime();
        return true;
      } else {
        console.log(`🎯 AdManager: Failed to show ${adType} ad - ad service returned false`);
        return false;
      }
    } catch (error) {
      console.error(`🎯 AdManager: Error showing ${adType} ad:`, error);
      console.log(`🎯 AdManager: Returning success despite error to not fail user experience`);
      // עדכון זמן כאילו הפרסומת הוצגה בהצלחה
      await this.updateLastShownTime();
      return true; // מחזיר true כדי לא להכשיל את המשתמש
    }
  }

  /**
   * הצגת פרסומת מוטבלת אם מותר (בדיקת זמן)
   * @param adType סוג הפרסומת לזיהוי בלוגים
   */
  public async showRewardedAdIfAllowed(adType: string = 'general'): Promise<boolean> {
    const result = await this.showRewardedAdWithResult(adType);
    return result.success;
  }

  /**
   * הצגת פרסומת מוטבלת עם פרטי התוצאה
   * @param adType סוג הפרסומת לזיהוי בלוגים
   */
  public async showRewardedAdWithResult(adType: string = 'general'): Promise<{
    success: boolean;
    reason: 'completed' | 'user_cancelled' | 'technical_error' | 'cooldown_active' | 'unavailable';
    message?: string;
  }> {
    try {
      console.log(`🎯 AdManager: Attempting to show ${adType} rewarded ad`);
      
      const canShow = await this.canShowAd();
      
      if (!canShow) {
        console.log(`🎯 AdManager: Not showing ${adType} rewarded ad - cooldown active`);
        return { success: false, reason: 'cooldown_active' };
      }

      console.log(`🎯 AdManager: Cooldown passed, trying to show ${adType} rewarded ad`);
      
      // First check if AdMob is available at all
      if (!adMobService.isAvailable()) {
        console.log(`🎯 AdManager: AdMob not available for ${adType} rewarded ad - treating as technical error`);
        return { success: false, reason: 'technical_error', message: 'AdMob not available (likely Expo Go mode)' };
      }
      
      // Check if rewarded ad is ready
      const isAdReady = adMobService.isRewardedAdReady();
      console.log(`🎯 AdManager: Rewarded ad ready status: ${isAdReady}`);
      
      if (!isAdReady) {
        console.log(`🎯 AdManager: Rewarded ad not ready - treating as technical error`);
        return { success: false, reason: 'technical_error', message: 'Ad not loaded or ready' };
      }
      
      const adShown = await adMobService.showRewardedAd();
      
      if (adShown) {
        console.log(`🎯 AdManager: Successfully showed ${adType} rewarded ad`);
        await this.updateLastShownTime();
        return { success: true, reason: 'completed' };
      } else {
        // At this point we know AdMob is available and ad was ready, so user likely cancelled
        console.log(`🎯 AdManager: Ad was available and ready but not completed - user likely cancelled`);
        return { success: false, reason: 'user_cancelled' };
      }
    } catch (error) {
      console.error(`🎯 AdManager: Error showing ${adType} rewarded ad:`, error);
      console.log(`🎯 AdManager: Returning technical error`);
      return { 
        success: false, 
        reason: 'technical_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * איפוס זמן הצגת הפרסומת (לבדיקות)
   */
  public async resetAdCooldown(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.AD_COOLDOWN_KEY);
      console.log('🎯 AdManager: Ad cooldown reset - next ad can be shown immediately');
    } catch (error) {
      console.error('🎯 AdManager: Error resetting ad cooldown:', error);
    }
  }

  /**
   * קבלת זמן הפרסומת האחרונה (לבדיקות)
   */
  public async getLastAdTime(): Promise<number | null> {
    try {
      const lastShownTime = await AsyncStorage.getItem(this.AD_COOLDOWN_KEY);
      return lastShownTime ? parseInt(lastShownTime, 10) : null;
    } catch (error) {
      console.error('Error getting last ad time:', error);
      return null;
    }
  }

  /**
   * קבלת זמן השקה ראשונה של האפליקציה (לבדיקות)
   */
  public async getFirstLaunchTime(): Promise<number | null> {
    try {
      const firstLaunchTime = await AsyncStorage.getItem(this.FIRST_LAUNCH_KEY);
      return firstLaunchTime ? parseInt(firstLaunchTime, 10) : null;
    } catch (error) {
      console.error('🎯 AdManager: Error getting first launch time:', error);
      return null;
    }
  }

  /**
   * בדיקה פומבית אם תקופת החסד עדיין פעילה
   */
  public async isInGracePeriod(): Promise<boolean> {
    const gracePassed = await this.hasGracePeriodPassed();
    return !gracePassed;
  }

  /**
   * קבלת מידע מפורט על סטטוס הפרסומות (לבדיקות ודיבוג)
   */
  public async getAdStatus(): Promise<{
    firstLaunchTime: number | null;
    firstLaunchDate: string | null;
    hoursFromFirstLaunch: number;
    isInGracePeriod: boolean;
    lastAdTime: number | null;
    lastAdDate: string | null;
    minutesFromLastAd: number | null;
    canShowAd: boolean;
  }> {
    try {
      const firstLaunchTime = await this.getFirstLaunchTime();
      const lastAdTime = await this.getLastAdTime();
      const currentTime = Date.now();
      
      const hoursFromFirstLaunch = firstLaunchTime 
        ? Math.round((currentTime - firstLaunchTime) / (1000 * 60 * 60))
        : 0;
      
      const minutesFromLastAd = lastAdTime 
        ? Math.round((currentTime - lastAdTime) / (1000 * 60))
        : null;

      const isInGracePeriod = await this.isInGracePeriod();
      const canShowAd = await this.canShowAd();

      return {
        firstLaunchTime,
        firstLaunchDate: firstLaunchTime ? new Date(firstLaunchTime).toLocaleString('he-IL') : null,
        hoursFromFirstLaunch,
        isInGracePeriod,
        lastAdTime,
        lastAdDate: lastAdTime ? new Date(lastAdTime).toLocaleString('he-IL') : null,
        minutesFromLastAd,
        canShowAd
      };
    } catch (error) {
      console.error('🎯 AdManager: Error getting ad status:', error);
      return {
        firstLaunchTime: null,
        firstLaunchDate: null,
        hoursFromFirstLaunch: 0,
        isInGracePeriod: true,
        lastAdTime: null,
        lastAdDate: null,
        minutesFromLastAd: null,
        canShowAd: false
      };
    }
  }

  /**
   * איפוס זמן השקה ראשונה (לבדיקות בלבד!)
   */
  public async resetFirstLaunchTime(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.FIRST_LAUNCH_KEY);
      console.log('🎯 AdManager: First launch time reset - grace period will restart on next app use');
    } catch (error) {
      console.error('🎯 AdManager: Error resetting first launch time:', error);
    }
  }
}

export const adManager = AdManager.getInstance();