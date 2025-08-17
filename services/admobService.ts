// Safe import with fallback for the new Google Mobile Ads SDK
let InterstitialAd: any = null;
let AdEventType: any = null;
let mobileAds: any = null;

try {
  const googleMobileAds = require('react-native-google-mobile-ads');
  InterstitialAd = googleMobileAds.InterstitialAd;
  AdEventType = googleMobileAds.AdEventType;
  mobileAds = googleMobileAds.default;
} catch (error) {
  console.log('📺 AdMob: Google Mobile Ads not available, running in Expo Go mode');
}

class AdMobService {
  private interstitialAd: any = null;
  private isAdLoaded = false;
  private isAdLoading = false;
  private isAdMobAvailable = false;
  private isInitialized = false;
  
  // Test ad unit ID for interstitial video
  private readonly adUnitId = 'ca-app-pub-3940256099942544/1033173712';

  constructor() {
    this.checkAdMobAvailability();
  }

  private checkAdMobAvailability = async () => {
    try {
      // Check if Google Mobile Ads is available
      if (InterstitialAd && AdEventType && mobileAds) {
        this.isAdMobAvailable = true;
        console.log('📺 AdMob: Google Mobile Ads available, initializing...');
        await this.initializeMobileAds();
      } else {
        console.log('📺 AdMob: Not available (Expo Go mode)');
        this.isAdMobAvailable = false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('📺 AdMob: Not available in this environment:', errorMessage);
      this.isAdMobAvailable = false;
    }
  };

  private initializeMobileAds = async () => {
    if (!this.isAdMobAvailable || !mobileAds) return;
    
    try {
      // Initialize the Mobile Ads SDK
      await mobileAds().initialize();
      this.isInitialized = true;
      console.log('📺 AdMob: Mobile Ads SDK initialized');
      
      // Create and load the first ad
      this.createInterstitialAd();
    } catch (error) {
      console.error('📺 AdMob: Error initializing Mobile Ads SDK:', error);
      this.isAdMobAvailable = false;
    }
  };

  private createInterstitialAd = () => {
    if (!this.isAdMobAvailable || !InterstitialAd || !this.isInitialized) return;
    
    try {
      // Create the interstitial ad instance
      this.interstitialAd = InterstitialAd.createForAdRequest(this.adUnitId);
      
      // Set up event listeners
      const unsubscribeLoaded = this.interstitialAd.addAdEventListener(
        AdEventType.LOADED,
        this.onAdLoaded
      );
      
      const unsubscribeFailedToLoad = this.interstitialAd.addAdEventListener(
        AdEventType.ERROR,
        this.onAdFailedToLoad
      );
      
      const unsubscribeClosed = this.interstitialAd.addAdEventListener(
        AdEventType.CLOSED,
        this.onAdClosed
      );

      // Store unsubscribe functions for cleanup
      this.interstitialAd._unsubscribers = [
        unsubscribeLoaded,
        unsubscribeFailedToLoad,
        unsubscribeClosed
      ];

      // Load the ad
      this.loadAd();
    } catch (error) {
      console.error('📺 AdMob: Error creating interstitial ad:', error);
      this.isAdMobAvailable = false;
    }
  };

  private onAdLoaded = () => {
    console.log('📺 AdMob: Interstitial ad loaded successfully');
    this.isAdLoaded = true;
    this.isAdLoading = false;
  };

  private onAdFailedToLoad = (error: any) => {
    console.error('📺 AdMob: Failed to load interstitial ad:', error);
    this.isAdLoaded = false;
    this.isAdLoading = false;
    
    // Retry loading after a delay
    setTimeout(() => {
      this.loadAd();
    }, 30000); // Retry after 30 seconds
  };

  private onAdClosed = () => {
    console.log('📺 AdMob: Interstitial ad closed');
    this.isAdLoaded = false;
    
    // Create and load a new ad for next time
    this.createInterstitialAd();
  };

  private loadAd = async () => {
    if (!this.isAdMobAvailable || this.isAdLoading || this.isAdLoaded || !this.interstitialAd) {
      return;
    }

    try {
      this.isAdLoading = true;
      console.log('📺 AdMob: Loading interstitial ad...');
      
      await this.interstitialAd.load();
    } catch (error) {
      console.error('📺 AdMob: Error loading interstitial ad:', error);
      this.isAdLoading = false;
    }
  };

  public showInterstitialAd = async (): Promise<boolean> => {
    // If AdMob is not available, return false immediately
    if (!this.isAdMobAvailable || !this.isInitialized) {
      console.log('📺 AdMob: Not available or not initialized, skipping ad display');
      return false;
    }

    try {
      if (!this.interstitialAd) {
        console.log('📺 AdMob: Interstitial ad not created');
        return false;
      }

      if (!this.isAdLoaded) {
        console.log('📺 AdMob: Interstitial ad not loaded yet');
        // Try to load ad if not already loading
        if (!this.isAdLoading) {
          this.loadAd();
        }
        return false;
      }

      console.log('📺 AdMob: Showing interstitial ad...');
      await this.interstitialAd.show();
      return true;
    } catch (error) {
      console.error('📺 AdMob: Error showing interstitial ad:', error);
      return false;
    }
  };

  public isAdReady = (): boolean => {
    return this.isAdMobAvailable && this.isInitialized && this.isAdLoaded;
  };

  public preloadAd = () => {
    if (this.isAdMobAvailable && this.isInitialized && !this.isAdLoaded && !this.isAdLoading) {
      if (!this.interstitialAd) {
        this.createInterstitialAd();
      } else {
        this.loadAd();
      }
    }
  };

  public destroy = () => {
    if (this.interstitialAd && this.isAdMobAvailable) {
      try {
        // Remove event listeners using stored unsubscribers
        if (this.interstitialAd._unsubscribers) {
          this.interstitialAd._unsubscribers.forEach((unsubscribe: any) => {
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
          });
        }
      } catch (error) {
        console.log('📺 AdMob: Error removing event listeners:', error);
      }
      
      this.interstitialAd = null;
    }
    this.isAdLoaded = false;
    this.isAdLoading = false;
  };

  // New method to check if AdMob is available
  public isAvailable = (): boolean => {
    return this.isAdMobAvailable && this.isInitialized;
  };

  // Initialize method that can be called manually if needed
  public initialize = async (): Promise<boolean> => {
    if (!this.isAdMobAvailable) {
      await this.checkAdMobAvailability();
    }
    return this.isAdMobAvailable && this.isInitialized;
  };
}

// Create a singleton instance
export const adMobService = new AdMobService();
export default adMobService;