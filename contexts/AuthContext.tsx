import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { apiService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  showVerification: boolean;
  setShowVerification: (show: boolean) => void;
  pendingUserData: any | null; // Add pending user data
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false); // Add state for verification process
  const [showVerification, setShowVerification] = useState(false); // Add state for verification screen
  const [pendingUserData, setPendingUserData] = useState<any | null>(null); // Add pending user data state

  const isAuthenticated = !!user && !isVerifying; // Don't consider authenticated during verification

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

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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
      setIsVerifying(true); // Set verification mode
      setShowVerification(true); // Show verification screen
      console.log('🔐 AuthContext: Sending verification code to:', userData.email);
      console.log('🔐 AuthContext: Storing pending user data:', userData);
      setPendingUserData(userData); // Store the user data for later use
      const result = await apiService.sendVerificationCode(userData);
      
      console.log('🔐 AuthContext: sendVerificationCode result:', result);
      
      if (result.success) {
        console.log('🔐 AuthContext: Verification code sent successfully');
        return { success: true };
      } else {
        console.log('🔐 AuthContext: Failed to send verification code:', result.error);
        setIsVerifying(false); // Reset if failed
        setShowVerification(false); // Hide verification screen if failed
        setPendingUserData(null); // Clear pending data if failed
        return { success: false, error: result.error || 'Failed to send verification code' };
      }
    } catch (error) {
      console.error('🔐 AuthContext: Send verification code error:', error);
      setIsVerifying(false); // Reset if error
      setShowVerification(false); // Hide verification screen if error
      setPendingUserData(null); // Clear pending data if error
      return { success: false, error: 'Network error occurred' };
    } finally {
      setIsLoading(false);
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
    showVerification,
    setShowVerification,
    pendingUserData, // Add pendingUserData to the context value
    login,
    register,
    logout,
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