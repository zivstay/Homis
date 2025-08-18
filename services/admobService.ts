// Safe import with fallback for the new Google Mobile Ads SDK
let InterstitialAd: any = null;
let RewardedAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let mobileAds: any = null;

try {
  const googleMobileAds = require('react-native-google-mobile-ads');
  InterstitialAd = googleMobileAds.InterstitialAd;
  RewardedAd = googleMobileAds.RewardedAd;
  AdEventType = googleMobileAds.AdEventType;
  RewardedAdEventType = googleMobileAds.RewardedAdEventType;
  mobileAds = googleMobileAds.default;
} catch (error) {
  console.log('📺 AdMob: Google Mobile Ads not available, running in Expo Go mode');
}

class AdMobService {
  private interstitialAd: any = null;
  private rewardedAd: any = null;
  private isAdLoaded = false;
  private isAdLoading = false;
  private isRewardedAdLoaded = false;
  private isRewardedAdLoading = false;
  private isAdMobAvailable = false;
  private isInitialized = false;
  
  // Test ad unit IDs - using the correct IDs provided by user
  private readonly interstitialAdUnitId = 'ca-app-pub-3940256099942544/4411468910'; // Interstitial
  private readonly rewardedAdUnitId = 'ca-app-pub-3940256099942544/1712485313'; // Rewarded

  constructor() {
    this.checkAdMobAvailability();
  }

  private checkAdMobAvailability = async () => {
    try {
      console.log('📺 AdMob: Checking availability...');
      console.log('📺 AdMob: InterstitialAd available:', !!InterstitialAd);
      console.log('📺 AdMob: AdEventType available:', !!AdEventType);
      console.log('📺 AdMob: mobileAds available:', !!mobileAds);
      
      // Check if Google Mobile Ads is available - we only need Interstitial for now
      if (InterstitialAd && AdEventType && mobileAds) {
        this.isAdMobAvailable = true;
        console.log('📺 AdMob: ✅ Google Mobile Ads available, initializing...');
        await this.initializeMobileAds();
      } else {
        console.log('📺 AdMob: ❌ Not available (Expo Go mode or missing components)');
        this.isAdMobAvailable = false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('📺 AdMob: ❌ Error checking availability:', errorMessage);
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
      
      // Create and load interstitial ad
      this.createInterstitialAd();
      
      // Create and load rewarded ad
      this.createRewardedAd();
    } catch (error) {
      console.error('📺 AdMob: Error initializing Mobile Ads SDK:', error);
      this.isAdMobAvailable = false;
    }
  };

  private createInterstitialAd = () => {
    if (!this.isAdMobAvailable || !InterstitialAd || !this.isInitialized) return;
    
    try {
      // Create the interstitial ad instance
      this.interstitialAd = InterstitialAd.createForAdRequest(this.interstitialAdUnitId);
      
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

  private createRewardedAd = () => {
    if (!RewardedAd || !this.isInitialized) {
      console.log('📺 AdMob: Cannot create rewarded ad - RewardedAd:', !!RewardedAd, 'initialized:', this.isInitialized);
      return;
    }
    
    try {
      console.log('📺 AdMob: Creating rewarded ad with ID:', this.rewardedAdUnitId);
      // Create the rewarded ad instance
      this.rewardedAd = RewardedAd.createForAdRequest(this.rewardedAdUnitId);
      
      // Set up event listeners
      const unsubscribeLoaded = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        this.onRewardedAdLoaded
      );
      
      const unsubscribeFailedToLoad = this.rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        this.onRewardedAdFailedToLoad
      );
      
      const unsubscribeEarnedReward = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        this.onRewardedAdEarnedReward
      );

      // Store unsubscribe functions for cleanup
      this.rewardedAd._unsubscribers = [
        unsubscribeLoaded,
        unsubscribeFailedToLoad,
        unsubscribeEarnedReward
      ];

      // Load the ad
      this.loadRewardedAd();
    } catch (error) {
      console.error('📺 AdMob: Error creating rewarded ad:', error);
      // Don't disable AdMob entirely for rewarded ad creation errors
      // this.isAdMobAvailable = false;
    }
  };

  private onRewardedAdLoaded = () => {
    console.log('📺 AdMob: ✅ Rewarded ad loaded successfully!');
    this.isRewardedAdLoaded = true;
    this.isRewardedAdLoading = false;
  };

  private onRewardedAdFailedToLoad = (error: any) => {
    console.error('📺 AdMob: Failed to load rewarded ad:', error);
    this.isRewardedAdLoaded = false;
    this.isRewardedAdLoading = false;
    
    // Retry loading after a delay
    setTimeout(() => {
      this.loadRewardedAd();
    }, 30000); // Retry after 30 seconds
  };

  private onRewardedAdEarnedReward = (reward: any) => {
    console.log('📺 AdMob: User earned reward:', reward);
    // The reward is automatically handled - user watched the full ad
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

  private loadRewardedAd = async () => {
    if (this.isRewardedAdLoading || this.isRewardedAdLoaded || !this.rewardedAd) {
      console.log('📺 AdMob: Cannot load rewarded ad - Loading:', this.isRewardedAdLoading, 'Loaded:', this.isRewardedAdLoaded, 'Ad exists:', !!this.rewardedAd);
      return;
    }

    try {
      this.isRewardedAdLoading = true;
      console.log('📺 AdMob: 🔄 Loading rewarded ad...');
      
      await this.rewardedAd.load();
      console.log('📺 AdMob: Rewarded ad load request sent');
    } catch (error) {
      console.error('📺 AdMob: ❌ Error loading rewarded ad:', error);
      this.isRewardedAdLoading = false;
    }
  };

  public showInterstitialAd = async (): Promise<boolean> => {
    console.log('📺 AdMob: showInterstitialAd called');
    
    // If AdMob is not available, return false immediately
    if (!this.isAdMobAvailable || !this.isInitialized) {
      console.log('📺 AdMob: ❌ Not available or not initialized, skipping ad display');
      console.log('📺 AdMob: Available:', this.isAdMobAvailable, 'Initialized:', this.isInitialized);
      return false;
    }

    try {
      if (!this.interstitialAd) {
        console.log('📺 AdMob: Interstitial ad not created, creating new one...');
        this.createInterstitialAd();
        return false;
      }

      if (!this.isAdLoaded) {
        console.log('📺 AdMob: Interstitial ad not loaded yet, loading status:', this.isAdLoading);
        // Try to load ad if not already loading
        if (!this.isAdLoading) {
          console.log('📺 AdMob: Starting to load interstitial ad...');
          this.loadAd();
        }
        return false;
      }

      console.log('📺 AdMob: ✅ Interstitial ad is ready, showing now...');
      
      // Return a promise that resolves when the ad is closed
      return new Promise((resolve) => {
        // Set up a one-time listener for ad closed
        const unsubscribeClosed = this.interstitialAd.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('📺 AdMob: Interstitial ad closed, resolving promise');
            unsubscribeClosed(); // Clean up the listener
            resolve(true);
          }
        );

        // Set up a one-time listener for ad error
        const unsubscribeError = this.interstitialAd.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            console.error('📺 AdMob: Interstitial ad error:', error);
            unsubscribeClosed(); // Clean up the listener
            unsubscribeError(); // Clean up this listener too
            resolve(false);
          }
        );

        // Show the ad
        this.interstitialAd.show().catch((error: any) => {
          console.error('📺 AdMob: Error showing interstitial ad:', error);
          unsubscribeClosed(); // Clean up the listener
          unsubscribeError(); // Clean up this listener too
          resolve(false);
        });

        // Mark as no longer loaded since it will be consumed
        this.isAdLoaded = false;
        
        // Create and load a new ad for next time
        setTimeout(() => {
          this.createInterstitialAd();
        }, 1000);
      });
    } catch (error) {
      console.error('📺 AdMob: ❌ Error showing interstitial ad:', error);
      return false;
    }
  };

  public showRewardedAd = async (): Promise<boolean> => {
    console.log('📺 AdMob: showRewardedAd called');
    
    // Check if basic AdMob components are available
    if (!RewardedAd || !mobileAds) {
      console.log('📺 AdMob: Required components not available for rewarded ads');
      console.log('📺 AdMob: RewardedAd:', !!RewardedAd, 'mobileAds:', !!mobileAds);
      return false;
    }
    
    // Check if we're initialized
    if (!this.isInitialized) {
      console.log('📺 AdMob: Not initialized, attempting to initialize...');
      try {
        await this.initializeMobileAds();
        if (!this.isInitialized) {
          console.log('📺 AdMob: Failed to initialize, cannot show rewarded ad');
          return false;
        }
      } catch (error) {
        console.log('📺 AdMob: Error during initialization:', error);
        return false;
      }
    }

    try {
      if (!this.rewardedAd) {
        console.log('📺 AdMob: Rewarded ad not created, creating new one...');
        this.createRewardedAd();
        return false;
      }

      if (!this.isRewardedAdLoaded) {
        console.log('📺 AdMob: Rewarded ad not loaded yet, loading status:', this.isRewardedAdLoading);
        // Try to load ad if not already loading
        if (!this.isRewardedAdLoading) {
          console.log('📺 AdMob: Starting to load rewarded ad...');
          this.loadRewardedAd();
        }
        return false;
      }

      console.log('📺 AdMob: Rewarded ad is ready, showing now...');
      
      // Return a promise that resolves when the user earns the reward
      return new Promise((resolve) => {
        // Set up a one-time listener for the reward earned event
        const unsubscribeEarnedReward = this.rewardedAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward: any) => {
            console.log('📺 AdMob: User earned reward, resolving promise');
            unsubscribeEarnedReward(); // Clean up the listener
            resolve(true);
          }
        );

        // Set up a one-time listener for ad closed without reward
        const unsubscribeClosed = this.rewardedAd.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            console.log('📺 AdMob: Rewarded ad closed without earning reward');
            unsubscribeEarnedReward(); // Clean up the listener
            unsubscribeClosed(); // Clean up this listener too
            resolve(false);
          }
        );

        // Set up a one-time listener for ad error
        const unsubscribeError = this.rewardedAd.addAdEventListener(
          AdEventType.ERROR,
          (error: any) => {
            console.error('📺 AdMob: Rewarded ad error:', error);
            unsubscribeEarnedReward(); // Clean up the listener
            unsubscribeClosed(); // Clean up this listener too
            unsubscribeError(); // Clean up this listener too
            resolve(false);
          }
        );

        // Show the ad
        this.rewardedAd.show().catch((error: any) => {
          console.error('📺 AdMob: Error showing rewarded ad:', error);
          unsubscribeEarnedReward(); // Clean up the listener
          unsubscribeClosed(); // Clean up this listener too
          resolve(false);
        });

        // Mark as no longer loaded since it will be consumed
        this.isRewardedAdLoaded = false;
        
        // Create and load a new ad for next time
        setTimeout(() => {
          this.createRewardedAd();
        }, 1000);
      });
    } catch (error) {
      console.error('📺 AdMob: Error showing rewarded ad:', error);
      return false;
    }
  };

  public isAdReady = (): boolean => {
    return this.isAdMobAvailable && this.isInitialized && this.isAdLoaded;
  };

  public isRewardedAdReady = (): boolean => {
    const ready = this.isInitialized && this.isRewardedAdLoaded && !!RewardedAd;
    console.log('📺 AdMob: Rewarded ad ready check:', ready, '(Init:', this.isInitialized, 'Loaded:', this.isRewardedAdLoaded, 'RewardedAd:', !!RewardedAd, ')');
    return ready;
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

  public preloadRewardedAd = () => {
    if (this.isInitialized && !this.isRewardedAdLoaded && !this.isRewardedAdLoading && RewardedAd) {
      if (!this.rewardedAd) {
        this.createRewardedAd();
      } else {
        this.loadRewardedAd();
      }
    }
  };

  public destroy = () => {
    // Clean up interstitial ad
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
        console.log('📺 AdMob: Error removing interstitial event listeners:', error);
      }
      
      this.interstitialAd = null;
    }
    
    // Clean up rewarded ad
    if (this.rewardedAd) {
      try {
        // Remove event listeners using stored unsubscribers
        if (this.rewardedAd._unsubscribers) {
          this.rewardedAd._unsubscribers.forEach((unsubscribe: any) => {
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
          });
        }
      } catch (error) {
        console.log('📺 AdMob: Error removing rewarded ad event listeners:', error);
      }
      
      this.rewardedAd = null;
    }
    
    this.isAdLoaded = false;
    this.isAdLoading = false;
    this.isRewardedAdLoaded = false;
    this.isRewardedAdLoading = false;
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

  // Debug method to check ad status
  public getAdStatus = () => {
    return {
      isAdMobAvailable: this.isAdMobAvailable,
      isInitialized: this.isInitialized,
      interstitial: {
        loaded: this.isAdLoaded,
        loading: this.isAdLoading,
        exists: !!this.interstitialAd
      }
    };
  };
}

// Create a singleton instance
export const adMobService = new AdMobService();
export default adMobService;