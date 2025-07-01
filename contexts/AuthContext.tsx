import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthStatus();
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

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('🔐 AuthContext: Attempting login for:', email);
      const result = await apiService.login({ email, password });
      
      if (result.success && result.data) {
        console.log('🔐 AuthContext: Login successful, setting user:', result.data.user);
        setUser(result.data.user);
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 