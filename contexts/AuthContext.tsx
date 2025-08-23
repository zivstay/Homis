import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { apiService, User } from '../services/api';

interface RegistrationFormData {
  registerEmail: string;
  registerPassword: string;
  registerConfirmPassword: string;
  registerFirstName: string;
  registerLastName: string;
  acceptedTerms: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  showVerification: boolean;
  setShowVerification: (show: boolean) => void;
  pendingUserData: any | null; // Add pending user data
  registrationError: string; // Add registration error state
  clearRegistrationError: () => void; // Add function to clear registration error
  registrationFormData: RegistrationFormData; // Add registration form data
  updateRegistrationFormData: (data: Partial<RegistrationFormData>) => void; // Add function to update form data
  clearRegistrationFormData: () => void; // Add function to clear form data
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearGuestData: () => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<{ success: boolean; error?: string }>;
  verifyCodeAndRegister: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resetVerification: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyResetCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const defaultRegistrationFormData: RegistrationFormData = {
  registerEmail: '',
  registerPassword: '',
  registerConfirmPassword: '',
  registerFirstName: '',
  registerLastName: '',
  acceptedTerms: false,
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false); // Add state for verification process
  const [showVerification, setShowVerification] = useState(false); // Add state for verification screen
  const [pendingUserData, setPendingUserData] = useState<any | null>(null); // Add pending user data state
  const [registrationError, setRegistrationError] = useState<string>(''); // Add registration error state
  const [registrationFormData, setRegistrationFormData] = useState<RegistrationFormData>(defaultRegistrationFormData); // Add registration form data state

  const isAuthenticated = (!!user && !isVerifying) || isGuestMode; // Consider guest mode as authenticated

  useEffect(() => {
    console.log('🔐 AuthContext: isAuthenticated changed to:', isAuthenticated, 'user:', !!user, 'isVerifying:', isVerifying);
    console.log('🔐 AuthContext: user object:', user);
  }, [isAuthenticated, user, isVerifying]);

  useEffect(() => {
    console.log('🔐 AuthContext: showVerification changed to:', showVerification);
  }, [showVerification]);

  useEffect(() => {
    checkAuthStatus();
    
    // Set up auth failure callback
    apiService.setAuthFailureCallback(() => {
      console.log('🔐 AuthContext: Auth failure detected, logging out user');
      setUser(null);
      // Show user-friendly message
      Alert.alert(
        'פג תוקף ההתחברות',
        'נדרש להתחבר מחדש לחשבון',
        [{ text: 'אישור', style: 'default' }]
      );
    });
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔐 AuthContext: Checking auth status...');
      if (apiService.isAuthenticated()) {
        console.log('🔐 AuthContext: Token found, getting current user...');
        const result = await apiService.getCurrentUser();
        if (result.success && result.data) {
          console.log('🔐 AuthContext: Current user loaded:', result.data.user);
          setUser(result.data.user);
        } else {
          console.log('🔐 AuthContext: Token invalid, clearing...');
          // Token is invalid, clear it
          await apiService.logout();
        }
      } else {
        console.log('🔐 AuthContext: No token found');
      }
    } catch (error) {
      console.error('🔐 AuthContext: Error checking auth status:', error);
    } finally {
      setIsLoading(false);
      console.log('🔐 AuthContext: Auth check complete, isLoading set to false');
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      console.log('🔐 AuthContext: Attempting login for:', credentials.email);
      const result = await apiService.login(credentials);
      
      if (result.success && result.data) {
        console.log('🔐 AuthContext: Login successful, setting user:', result.data.user);
        setUser(result.data.user);
        console.log('🔐 AuthContext: User set, isAuthenticated should be:', !!result.data.user && !isVerifying);
        return { success: true };
      } else {
        console.log('🔐 AuthContext: Login failed:', result.error);
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      console.error('🔐 AuthContext: Login error:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    try {
      setIsLoading(true);
      console.log('🔐 AuthContext: Attempting registration for:', userData.email);
      const result = await apiService.register(userData);
      
      if (result.success && result.data) {
        console.log('🔐 AuthContext: Registration successful, setting user:', result.data.user);
        setUser(result.data.user);
        return { success: true };
      } else {
        console.log('🔐 AuthContext: Registration failed:', result.error);
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('🔐 AuthContext: Registration error:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = async () => {
    try {
      console.log('🔐 AuthContext: Logging in as guest');
      setIsGuestMode(true);
      setUser(null); // Guest has no user object
      setIsLoading(false);
      
      // Create a default board for the guest user if none exists
      const { localStorageService } = await import('../services/localStorageService');
      const existingBoards = await localStorageService.getBoards();
      
      if (existingBoards.length === 0) {
        console.log('🔐 AuthContext: Creating default roommates board for guest user');
        await localStorageService.createBoard({
          name: 'לוח שותפים',
          description: 'לוח ברירת מחדל לניהול הוצאות משותפות',
          currency: 'ILS',
          timezone: 'Asia/Jerusalem',
          board_type: 'roommates',
          custom_categories: [
            { name: 'חשמל', icon: '⚡', color: '#FFD700' },
            { name: 'מים', icon: '💧', color: '#00BFFF' },
            { name: 'ארנונה', icon: '🏘️', color: '#32CD32' },
            { name: 'גז', icon: '🔥', color: '#FF6347' },
            { name: 'אינטרנט', icon: '🌐', color: '#9370DB' },
            { name: 'שכר דירה', icon: '🏠', color: '#FF8C00' },
            { name: 'קניות בית', icon: '🛒', color: '#FF69B4' },
            { name: 'אחר', icon: '📋', color: '#95A5A6' },
          ],
        });
      }
    } catch (error) {
      console.error('Guest login error:', error);
    }
  };

  const logout = async () => {
    try {
      if (isGuestMode) {
        // In guest mode, don't clear data - just reset the state
        // Guest data should persist between sessions
        console.log('🔐 AuthContext: Guest mode logout - preserving local data');
      } else {
        await apiService.logout();
      }
      setUser(null);
      setIsGuestMode(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const clearGuestData = async () => {
    try {
      if (isGuestMode) {
        const { localStorageService } = await import('../services/localStorageService');
        await localStorageService.clearAllData();
        console.log('🔐 AuthContext: Cleared guest data on user request');
        return { success: true };
      } else {
        return { success: false, error: 'לא במצב אורח' };
      }
    } catch (error) {
      console.error('Error clearing guest data:', error);
      return { success: false, error: 'שגיאה במחיקת הנתונים' };
    }
  };

  const sendVerificationCode = async (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    try {
      setIsLoading(true);
      console.log('🔐 AuthContext: Sending verification code to:', userData.email);
      console.log('🔐 AuthContext: User data being sent:', userData);
      console.log('🔐 AuthContext: Current state before request - isVerifying:', isVerifying, 'showVerification:', showVerification);
      
      setPendingUserData(userData); // Store the user data for later use
      const result = await apiService.sendVerificationCode(userData);
      
      console.log('🔐 AuthContext: sendVerificationCode result received:', result);
      console.log('🔐 AuthContext: Result success:', result.success);
      console.log('🔐 AuthContext: Result error:', result.error);
      
      if (result.success) {
        console.log('🔐 AuthContext: ✅ Verification code sent successfully');
        setIsVerifying(true); // Set verification mode ONLY on success
        setShowVerification(true); // Show verification screen ONLY on success
        console.log('🔐 AuthContext: Set state - isVerifying: true, showVerification: true');
        return { success: true };
      } else {
        console.log('🔐 AuthContext: ❌ Failed to send verification code');
        console.log('🔐 AuthContext: Error details:', result.error);
        console.log('🔐 AuthContext: Clearing states and saving error');
        
        // Translate error to Hebrew
        let errorMessage = result.error || 'שגיאה ברישום';
        if (errorMessage.includes('Email already exists')) {
          errorMessage = 'כתובת האימייל כבר קיימת במערכת';
        } else if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
           if (errorMessage.includes('email')) {
             errorMessage = 'כתובת האימייל כבר קיימת במערכת';
           } else {
             errorMessage = 'המשתמש כבר קיים במערכת';
           }
         } else if (errorMessage.includes('Connection failed')) {
          errorMessage = 'שגיאת חיבור - בדוק את החיבור לאינטרנט';
        } else if (errorMessage.includes('Password must be at least')) {
          errorMessage = 'הסיסמה חייבת להיות לפחות 8 תווים';
        } else if (errorMessage.includes('Invalid email address')) {
          errorMessage = 'כתובת האימייל אינה תקינה';
        } else if (errorMessage.includes('First name')) {
          errorMessage = 'שם פרטי הוא שדה חובה';
        } else if (errorMessage.includes('Last name')) {
          errorMessage = 'שם משפחה הוא שדה חובה';
        }
        
        console.log('🔐 AuthContext: Translated error:', errorMessage);
        console.log('🔐 AuthContext: Saving error to persistent state');
        setRegistrationError(errorMessage); // Save error to persistent state
        
        setIsVerifying(false); // Ensure verification mode is off
        setShowVerification(false); // Ensure verification screen is hidden
        setPendingUserData(null); // Clear pending data if failed
        console.log('🔐 AuthContext: Set state - isVerifying: false, showVerification: false');
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('🔐 AuthContext: ❌ Send verification code exception:', error);
      const errorMessage = 'שגיאת רשת - בדוק את החיבור לאינטרנט';
      setRegistrationError(errorMessage); // Save network error to persistent state
      setIsVerifying(false); // Reset if error
      setShowVerification(false); // Hide verification screen if error
      setPendingUserData(null); // Clear pending data if error
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
      console.log('🔐 AuthContext: Request completed, isLoading set to false');
    }
  };

  const verifyCodeAndRegister = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      console.log('🔐 AuthContext: Verifying code and registering for:', email);
      console.log('🔐 AuthContext: Using pending user data:', pendingUserData);
      const result = await apiService.verifyCodeAndRegister(email, code);
      
      if (result.success && result.data) {
        console.log('🔐 AuthContext: Verification and registration successful, setting user:', result.data.user);
        setUser(result.data.user);
        setIsVerifying(false); // Exit verification mode
        setPendingUserData(null); // Clear pending data after successful registration
        return { success: true };
      } else {
        console.log('🔐 AuthContext: Verification failed:', result.error);
        return { success: false, error: result.error || 'Verification failed' };
      }
    } catch (error) {
      console.error('🔐 AuthContext: Verification error:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const result = await apiService.getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const resetVerification = () => {
    setIsVerifying(false);
    setShowVerification(false);
    setPendingUserData(null); // Clear pending data when resetting verification
    setRegistrationError(''); // Clear registration error when resetting verification
  };

  const clearRegistrationError = () => {
    console.log('🔐 AuthContext: Clearing registration error');
    setRegistrationError('');
  };

  const updateRegistrationFormData = (data: Partial<RegistrationFormData>) => {
    console.log('🔐 AuthContext: Updating registration form data:', data);
    setRegistrationFormData(prev => ({ ...prev, ...data }));
  };

  const clearRegistrationFormData = () => {
    console.log('🔐 AuthContext: Clearing registration form data');
    setRegistrationFormData(defaultRegistrationFormData);
  };

  const requestPasswordReset = async (email: string) => {
    try {
      console.log('🔐 AuthContext: Requesting password reset for:', email);
      const result = await apiService.requestPasswordReset(email);
      
      if (result.success) {
        console.log('🔐 AuthContext: Password reset request successful');
        return { success: true };
      } else {
        console.log('🔐 AuthContext: Password reset request failed:', result.error);
        return { success: false, error: result.error || 'Failed to request password reset' };
      }
    } catch (error) {
      console.error('🔐 AuthContext: Password reset request error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const verifyResetCode = async (email: string, code: string) => {
    try {
      console.log('🔐 AuthContext: Verifying reset code for:', email);
      const result = await apiService.verifyResetCode(email, code);
      
      if (result.success) {
        console.log('🔐 AuthContext: Reset code verification successful');
        return { success: true };
      } else {
        console.log('🔐 AuthContext: Reset code verification failed:', result.error);
        return { success: false, error: result.error || 'Invalid reset code' };
      }
    } catch (error) {
      console.error('🔐 AuthContext: Reset code verification error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      console.log('🔐 AuthContext: Resetting password for:', email);
      const result = await apiService.resetPassword(email, code, newPassword);
      
      if (result.success) {
        console.log('🔐 AuthContext: Password reset successful');
        return { success: true };
      } else {
        console.log('🔐 AuthContext: Password reset failed:', result.error);
        return { success: false, error: result.error || 'Failed to reset password' };
      }
    } catch (error) {
      console.error('🔐 AuthContext: Password reset error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isGuestMode,
    showVerification,
    setShowVerification,
    pendingUserData, // Add pendingUserData to the context value
    registrationError, // Add registration error to the context value
    clearRegistrationError, // Add clear function to the context value
    registrationFormData, // Add registration form data to the context value
    updateRegistrationFormData, // Add update function to the context value
    clearRegistrationFormData, // Add clear function to the context value
    login,
    register,
    loginAsGuest,
    logout,
    clearGuestData,
    sendVerificationCode,
    verifyCodeAndRegister,
    resetVerification,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 