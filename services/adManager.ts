import AsyncStorage from '@react-native-async-storage/async-storage';
import { adMobService } from './admobService';

class AdManager {
  private static instance: AdManager;
  private readonly AD_COOLDOWN_KEY = 'ad_last_shown_time';
  private readonly COOLDOWN_MINUTES = 5; // 30 שניות (לבדיקה)

  public static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  /**
   * בדיקה אם ניתן להציג פרסומת (לא הוצגה פרסומת ב-5 דקות האחרונות)
   */
  private async canShowAd(): Promise<boolean> {
    try {
      const lastShownTime = await AsyncStorage.getItem(this.AD_COOLDOWN_KEY);
      
      if (!lastShownTime) {
        console.log('🎯 AdManager: No previous ad shown, can show ad');
        return true; // אם לא הוצגה פרסומת מעולם
      }

      const lastShown = parseInt(lastShownTime, 10);
      const currentTime = Date.now();
      const timeDiff = currentTime - lastShown;
      const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000; // 30 שניות במילישניות

      const secondsAgo = Math.round(timeDiff / 1000);
      console.log(`🎯 AdManager: Last ad shown ${secondsAgo} seconds ago (need ${this.COOLDOWN_MINUTES * 60}+ seconds)`);
      
      const canShow = timeDiff >= cooldownMs;
      console.log(`🎯 AdManager: Can show ad: ${canShow}`);
      
      return canShow;
    } catch (error) {
      console.error('🎯 AdManager: Error checking ad cooldown:', error);
      return true; // במקרה של שגיאה, אפשר להציג פרסומת
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
}

export const adManager = AdManager.getInstance();