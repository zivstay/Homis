import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useBoard } from './BoardContext';

interface TutorialContextType {
  showTutorial: boolean;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  startTutorial: () => void;
  forceStartTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  clearAllTutorialData: () => Promise<void>;
  shouldShowOnboarding: boolean;
  setShouldShowOnboarding: (show: boolean) => void;
  checkScreenTutorial: (screen: string) => Promise<boolean>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

interface TutorialProviderProps {
  children: ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Main');
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  
  const { isAuthenticated, isLoading, user } = useAuth();
  const { selectedBoard } = useBoard();

  // Auto-check for tutorial on first login
  useEffect(() => {
    const checkInitialTutorial = async () => {
      if (!isAuthenticated || isLoading || !user) {
        return;
      }

      console.log('🎓 TutorialContext: Checking for initial tutorial...');
      
      try {
        // Check if user has completed any tutorial
        const globalTutorialKey = 'tutorial_completed';
        const globalCompleted = await AsyncStorage.getItem(globalTutorialKey);
        
        console.log('🎓 TutorialContext: Global tutorial status:', globalCompleted);
        
        if (!globalCompleted) {
          console.log('🎓 TutorialContext: No tutorial completed - should show onboarding');
          setShouldShowOnboarding(true);
          
          // Determine which screen to start with
          if (selectedBoard) {
            setCurrentScreen('Main');
          } else {
            setCurrentScreen('BoardSelection');
          }
          
          // Start tutorial automatically
          setTimeout(() => {
            console.log('🎓 TutorialContext: Auto-starting tutorial');
            setShowTutorial(true);
          }, 1000); // Small delay to let UI settle
        }
      } catch (error) {
        console.error('🎓 TutorialContext: Error checking initial tutorial:', error);
      }
    };

    checkInitialTutorial();
  }, [isAuthenticated, isLoading, user, selectedBoard]);

  // Check if user should see tutorial for a specific screen
  const checkScreenTutorial = async (screen: string): Promise<boolean> => {
    try {
      console.log('🎓 TutorialContext: Checking tutorial for screen:', screen);
      
      if (!user) {
        console.log('🎓 TutorialContext: No user, not showing tutorial');
        return false;
      }
      
      // אם זה לא מסך BoardSelection ואין לוח נבחר - אל תציג tutorial
      if (screen !== 'BoardSelection' && !selectedBoard) {
        console.log('🎓 TutorialContext: No selected board for screen', screen, '- not showing tutorial');
        return false;
      }
      
      // Check if user has completed tutorial for this specific screen
      const screenTutorialKey = `tutorial_completed_${screen}`;
      const globalTutorialKey = 'tutorial_completed';
      
      const [screenCompleted, globalCompleted] = await Promise.all([
        AsyncStorage.getItem(screenTutorialKey),
        AsyncStorage.getItem(globalTutorialKey)
      ]);

      console.log('🎓 TutorialContext: Tutorial status for', screen, {
        screenCompleted,
        globalCompleted,
        userId: user?.id,
        screenTutorialKey,
        globalTutorialKey,
        hasSelectedBoard: !!selectedBoard
      });

      // If user hasn't completed tutorial for this screen, show it
      const shouldShow = !screenCompleted && !globalCompleted;
      console.log('🎓 TutorialContext: Should show tutorial for', screen, ':', shouldShow);
      
      return shouldShow;
    } catch (error) {
      console.error('🎓 TutorialContext: Error checking tutorial status:', error);
      return false;
    }
  };

  // Force start tutorial (for manual restart)
  const forceStartTutorial = () => {
    console.log('🎓 TutorialContext: Force starting tutorial for screen:', currentScreen);
    setShowTutorial(true);
  };

  const startTutorial = () => {
    console.log('🎓 TutorialContext: Starting tutorial for screen:', currentScreen);
    setShowTutorial(true);
  };

  const completeTutorial = async () => {
    console.log('🎓 TutorialContext: Completing tutorial for screen:', currentScreen);
    setShowTutorial(false);
    
    try {
      // Save completion status
      const screenTutorialKey = `tutorial_completed_${currentScreen}`;
      const globalTutorialKey = 'tutorial_completed';
      
      await Promise.all([
        AsyncStorage.setItem(screenTutorialKey, 'true'),
        AsyncStorage.setItem(globalTutorialKey, 'true')
      ]);
      
      console.log('🎓 TutorialContext: Tutorial completion saved successfully');
      setShouldShowOnboarding(false);
    } catch (error) {
      console.error('🎓 TutorialContext: Error saving tutorial completion:', error);
    }
  };

  const resetTutorial = async () => {
    console.log('🎓 TutorialContext: Resetting all tutorials');
    try {
      // Remove completion status for all screens
      const screens = ['Home', 'Summary', 'Settings', 'AddExpense'];
      await Promise.all([
        ...screens.map(screen => AsyncStorage.removeItem(`tutorial_completed_${screen}`)),
        AsyncStorage.removeItem('tutorial_completed')
      ]);
      
      console.log('🎓 TutorialContext: All tutorials reset');
    } catch (error) {
      console.error('🎓 TutorialContext: Error resetting tutorials:', error);
    }
    
    setShouldShowOnboarding(true);
    setShowTutorial(false);
  };

  // Clear ALL tutorial related data completely
  const clearAllTutorialData = async () => {
    console.log('🎓 TutorialContext: Clearing ALL tutorial data');
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter keys that contain tutorial data
      const tutorialKeys = allKeys.filter(key => 
        key.includes('tutorial_completed') || 
        key.includes('tutorial_') ||
        key === 'tutorial_completed'
      );
      
      console.log('🎓 TutorialContext: Found tutorial keys to clear:', tutorialKeys);
      
      // Remove all tutorial keys
      await AsyncStorage.multiRemove(tutorialKeys);
      
      console.log('🎓 TutorialContext: All tutorial data cleared successfully');
    } catch (error) {
      console.error('🎓 TutorialContext: Error clearing tutorial data:', error);
    }
  };

  const value: TutorialContextType = {
    showTutorial,
    currentScreen,
    setCurrentScreen: (screen: string) => {
      console.log('🎓 TutorialContext: setCurrentScreen called with:', screen);
      setCurrentScreen(screen);
    },
    startTutorial,
    forceStartTutorial,
    completeTutorial,
    resetTutorial,
    clearAllTutorialData,
    shouldShowOnboarding,
    setShouldShowOnboarding,
    checkScreenTutorial,
  };

  console.log('🎓 TutorialContext state:', {
    showTutorial,
    currentScreen,
    shouldShowOnboarding,
    isAuthenticated,
    selectedBoard: !!selectedBoard
  });

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}; 