import AsyncStorage from '@react-native-async-storage/async-storage';
import { admobService } from './admobService';

class AdManager {
  private static instance: AdManager;
  private readonly AD_COOLDOWN_KEY = 'ad_last_shown_time';
  private readonly COOLDOWN_MINUTES = 5; // 5 דקות

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
        return true; // אם לא הוצגה פרסומת מעולם
      }

      const lastShown = parseInt(lastShownTime, 10);
      const currentTime = Date.now();
      const timeDiff = currentTime - lastShown;
      const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000; // 5 דקות במילישניות

      console.log(`🎯 AdManager: Last ad shown ${Math.round(timeDiff / 1000 / 60)} minutes ago`);
      
      return timeDiff >= cooldownMs;
    } catch (error) {
      console.error('Error checking ad cooldown:', error);
      return true; // במקרה של שגיאה, אפשר להציג פרסומת
    }
  }

  /**
   * עדכון זמן הצגת הפרסומת האחרונה
   */
  private async updateLastShownTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AD_COOLDOWN_KEY, Date.now().toString());
      console.log('🎯 AdManager: Updated last shown time');
    } catch (error) {
      console.error('Error updating ad last shown time:', error);
    }
  }

  /**
   * הצגת פרסומת אם מותר (בדיקת זמן)
   * @param adType סוג הפרסומת לזיהוי בלוגים
   */
  public async showAdIfAllowed(adType: string = 'general'): Promise<boolean> {
    try {
      const canShow = await this.canShowAd();
      
      if (!canShow) {
        console.log(`🎯 AdManager: Not showing ${adType} ad - cooldown active`);
        return false;
      }

      console.log(`🎯 AdManager: Showing ${adType} ad`);
      await admobService.showInterstitialAd();
      await this.updateLastShownTime();
      
      return true;
    } catch (error) {
      console.error(`Error showing ${adType} ad:`, error);
      return false;
    }
  }

  /**
   * איפוס זמן הצגת הפרסומת (לבדיקות)
   */
  public async resetAdCooldown(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.AD_COOLDOWN_KEY);
      console.log('🎯 AdManager: Ad cooldown reset');
    } catch (error) {
      console.error('Error resetting ad cooldown:', error);
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