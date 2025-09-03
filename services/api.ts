import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuickCategory } from '../constants/boardTypes';

// If you're on Android emulator
// const API_BASE_URL = 'http://10.0.2.2:5000/api';

// If you're on a real device on Wi-Fi
// const API_BASE_URL = 'http://192.168.7.7:5000/api';   // <-- your IP
const API_BASE_URL = 'https://homis-backend-06302e58f4ca.herokuapp.com/api';   // <-- your IP

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  is_active: boolean;
  email_verified: boolean;
  avatar_url?: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  currency: string;
  timezone: string;
  board_type: string;
  settings?: any;
  member_count?: number;
  user_role?: string;
  is_default_board?: boolean;
}

export interface BoardMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  permissions: string[];
  user: User;
}

export interface Expense {
  id: string;
  board_id: string;
  amount: number;
  category: string;
  description: string;
  paid_by: string;
  date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  frequency: string;
  start_date?: string;
  end_date?: string;
  has_image: boolean; // Boolean flag instead of image URL
  tags: string[];
}

export interface Debt {
  id: string;
  board_id: string;
  expense_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  description: string;
  is_paid: boolean;
  paid_at?: string;
  created_at: string;
  original_amount?: number;
  paid_amount?: number;
  from_user_name?: string;
  to_user_name?: string;
  board_name?: string;
}

export interface Category {
  id: string;
  board_id: string;
  name: string;
  icon: string;
  color: string;
  created_by: string;
  created_at: string;
  is_default: boolean;
  is_active: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  needsRetry?: boolean; // Added for retry logic
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<ApiResponse<{ access_token: string }>> | null = null; // Queue for concurrent requests
  private pendingRequests: Array<() => Promise<any>> = []; // Queue for requests during refresh
  private activeRequestCount: number = 0; // Track concurrent requests
  private tokenExpiryDate: Date | null = null; // Track when the token expires
  private authFailureCallback: (() => void) | null = null; // Callback for auth failures

  constructor() {
    this.loadTokens();
    this.startTokenRefreshTimer(); // Start proactive token refresh
  }

  // Method to set auth failure callback (to be used by AuthContext)
  setAuthFailureCallback(callback: () => void) {
    this.authFailureCallback = callback;
  }

  private async loadTokens() {
    try {
      this.accessToken = await AsyncStorage.getItem('access_token');
      this.refreshToken = await AsyncStorage.getItem('refresh_token');
      const expiryStr = await AsyncStorage.getItem('token_expiry');
      if (expiryStr) {
        this.tokenExpiryDate = new Date(expiryStr);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  private async saveTokens(accessToken: string, refreshToken: string) {
    try {
      // JWT tokens typically expire in 7 days, so we set expiry accordingly
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
      
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      await AsyncStorage.setItem('token_expiry', expiryDate.toISOString());
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.tokenExpiryDate = expiryDate;
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  private async clearTokens() {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('token_expiry');
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiryDate = null;
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  private startTokenRefreshTimer() {
    // Check every 30 minutes instead of 1 hour
    setInterval(() => {
      this.checkAndRefreshToken();
    }, 30 * 60 * 1000); // 30 minutes

    // Also check immediately
    setTimeout(() => {
      this.checkAndRefreshToken();
    }, 5000); // Check after 5 seconds
  }

  private async checkAndRefreshToken() {
    if (!this.accessToken || !this.refreshToken || !this.tokenExpiryDate) {
      return;
    }

    const now = new Date();
    const timeUntilExpiry = this.tokenExpiryDate.getTime() - now.getTime();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

    console.log(`🕐 API: Token expires in ${hoursUntilExpiry.toFixed(1)} hours`);

    // Refresh token if it expires in less than 2 hours (more conservative)
    if (hoursUntilExpiry < 2 && hoursUntilExpiry > 0) {
      console.log(`🔄 API: Token expires in ${hoursUntilExpiry.toFixed(1)} hours, refreshing proactively`);
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('🔴 API: Proactive token refresh failed:', error);
      }
    }
  }

  // Add method to expose token validity
  isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiryDate) {
      return false;
    }
    return new Date() < this.tokenExpiryDate;
  }

  // Add method to expose token authentication status
  isAuthenticated(): boolean {
    return !!this.accessToken && this.isTokenValid();
  }

  // Method to get access token (for external use)
  getAccessToken(): string | null {
    return this.isTokenValid() ? this.accessToken : null;
  }

  // Add method to check if token needs refresh soon
  private needsRefreshSoon(): boolean {
    if (!this.tokenExpiryDate) return false;
    
    const now = new Date();
    const timeUntilExpiry = this.tokenExpiryDate.getTime() - now.getTime();
    const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);
    
    // Return true if token expires in less than 30 minutes
    return minutesUntilExpiry < 30 && minutesUntilExpiry > 0;
  }

  // Improved method to check token and refresh if needed
  private async ensureValidToken(): Promise<boolean> {
    // If no token, can't refresh
    if (!this.accessToken || !this.refreshToken) {
      console.log('🔴 API: No tokens available');
      return false;
    }

    // If token is still valid and doesn't need refresh soon, we're good
    if (this.isTokenValid() && !this.needsRefreshSoon()) {
      return true;
    }

    // If token is expired or needs refresh soon, try to refresh
    console.log('🔄 API: Token expired or needs refresh, attempting refresh...');
    try {
      const refreshResult = await this.refreshAccessToken();
      if (refreshResult.success) {
        console.log('✅ API: Token refreshed successfully');
        return true;
      } else {
        console.log('🔴 API: Token refresh failed:', refreshResult.error);
        await this.clearTokens();
        if (this.authFailureCallback) {
          this.authFailureCallback();
        }
        return false;
      }
    } catch (error) {
      console.log('🔴 API: Token refresh error:', error);
      await this.clearTokens();
      if (this.authFailureCallback) {
        this.authFailureCallback();
      }
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  // Public method to get auth headers for external use (like AuthenticatedImage)
  public async getAuthHeaders(): Promise<HeadersInit> {
    // Ensure we have a valid token
    const hasValidToken = await this.ensureValidToken();
    if (!hasValidToken) {
      return {};
    }

    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  // Public method to get base URL
  public getBaseUrl(): string {
    return API_BASE_URL.replace('/api', ''); // Remove /api suffix to get base URL
  }

  // Generic method for making authenticated requests
  private async makeAuthenticatedRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this._makeAuthenticatedRequestWithRetry<T>(url, options, 0);
  }

  // Private method with retry counter to prevent infinite loops
  private async _makeAuthenticatedRequestWithRetry<T>(
    url: string, 
    options: RequestInit = {},
    retryCount: number
  ): Promise<ApiResponse<T>> {
    // Create a unique key for this request to prevent duplicates
    const requestKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}`;
    
    // Prevent infinite retry loops
    if (retryCount >= 1) {  // Reduced from 2 to 1 - only retry once
      console.log('🔴 API: Maximum retry attempts reached, returning error');
      return { success: false, error: 'Request failed after multiple retry attempts' };
    }

    // Ensure we have a valid token before making the request
    const hasValidToken = await this.ensureValidToken();
    if (!hasValidToken) {
      return { success: false, error: 'Authentication required' };
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const result = await this.handleResponse<T>(response);
    
    // If token was refreshed during the request, retry automatically
    if (!result.success && result.needsRetry) {
      console.log(`🔄 API: Retrying request after token refresh (attempt ${retryCount + 1})...`);
      
      // Small delay to ensure token is fully propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Recursive call with incremented retry count
      return this._makeAuthenticatedRequestWithRetry<T>(url, options, retryCount + 1);
    }

    return result;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    this.activeRequestCount++;
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🔵 API [${requestId}]: Handling response for ${response.url} (Active requests: ${this.activeRequestCount})`);
    
    try {
      if (response.status === 401) {
        console.log(`🔴 API [${requestId}]: Got 401 for URL:`, response.url);
        
        if (!this.refreshToken) {
          console.log(`🔴 API [${requestId}]: No refresh token available, triggering auth failure`);
          await this.clearTokens();
          if (this.authFailureCallback) {
            this.authFailureCallback();
          }
          return { success: false, error: 'Authentication required' };
        }
        
        // If refresh is already in progress, wait for it to complete
        if (this.refreshPromise) {
          console.log(`🟡 API [${requestId}]: Refresh in progress, waiting for completion...`);
          await this.refreshPromise;
          // Return needsRetry flag to trigger automatic retry
          return { success: false, error: 'Token was refreshed, retrying automatically...', needsRetry: true };
        }
        
        console.log(`🔄 API [${requestId}]: Starting token refresh...`);
        
        // Try to refresh token
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.success) {
          console.log(`✅ API [${requestId}]: Token refresh successful, will retry automatically`);
          // Return needsRetry flag to trigger automatic retry in makeAuthenticatedRequest
          return { success: false, error: 'Token refreshed, retrying automatically...', needsRetry: true };
        } else {
          console.log(`🔴 API [${requestId}]: Token refresh failed:`, refreshResult.error);
          // Refresh failed, user needs to login again
          await this.clearTokens();
          if (this.authFailureCallback) {
            console.log(`🔴 API [${requestId}]: Triggering auth failure callback`);
            this.authFailureCallback();
          }
          return { success: false, error: 'Authentication required' };
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error(`🔴 API [${requestId}]: Failed to parse response JSON:`, error);
        return { success: false, error: 'Invalid response from server' };
      }

      if (response.ok) {
        console.log(`✅ API [${requestId}]: Request successful`);
        return { success: true, data };
      } else {
        // Handle different types of error responses
        let errorMessage = 'Request failed';
        
        if (data) {
          // Check for different error formats
          if (data.error) {
            errorMessage = data.error;
          } else if (data.data && data.data.error) {
            // Handle nested error structure: {"data": {"error": "message"}}
            errorMessage = data.data.error;
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.detail) {
            errorMessage = data.detail;
          } else if (typeof data === 'string') {
            errorMessage = data;
          } else if (data.errors && Array.isArray(data.errors)) {
            // Handle validation errors array
            errorMessage = data.errors.join(', ');
          } else if (data.validation_errors) {
            // Handle validation errors object
            const validationErrors = Object.values(data.validation_errors).flat();
            errorMessage = validationErrors.join(', ');
          }
        }

        console.log(`🔴 API [${requestId}]: Error response:`, {
          status: response.status,
          statusText: response.statusText,
          data: data,
          errorMessage: errorMessage,
          dataType: typeof data,
          hasError: !!data?.error,
          hasDataError: !!data?.data?.error,
          hasMessage: !!data?.message
        });

        return { success: false, error: errorMessage };
      }
    } finally {
      this.activeRequestCount--;
      console.log(`🔵 API [${requestId}]: Response handling complete (Active requests: ${this.activeRequestCount})`);
    }
  }

  // Authentication
  async register(userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<ApiResponse<AuthResponse>> {
    console.log('🔵 API: Attempting to register user:', userData.email);
    const url = `${API_BASE_URL}/auth/register`;
    console.log('🔵 API: Register URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      console.log('🔵 API: Register response status:', response.status);
      const result = await this.handleResponse<AuthResponse>(response);
      console.log('🔵 API: Register result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      if (result.success && result.data) {
        await this.saveTokens(result.data.access_token, result.data.refresh_token);
        console.log('🔵 API: Registration tokens saved successfully with expiry tracking');
      }
      return result;
    } catch (error) {
      console.error('🔴 API: Register network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  // Email Verification
  async sendVerificationCode(userData: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Sending verification code to:', userData.email);
    const url = `${API_BASE_URL}/auth/send-verification`;
    console.log('🔵 API: Send verification URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      console.log('🔵 API: Send verification response status:', response.status);
      const result = await this.handleResponse<{ message: string }>(response);
      console.log('🔵 API: Send verification result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      return result;
    } catch (error) {
      console.error('🔴 API: Send verification network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  async verifyCodeAndRegister(email: string, code: string): Promise<ApiResponse<AuthResponse>> {
    console.log('🔵 API: Verifying code for:', email);
    console.log('🔵 API: Code length:', code.length);
    console.log('🔵 API: Code value:', code);
    const url = `${API_BASE_URL}/auth/verify-and-register`;
    console.log('🔵 API: Full URL:', url);
    
    try {
      console.log('🔵 API: Making fetch request...');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      console.log('🔵 API: Verify code response status:', response.status);
      console.log('🔵 API: Response headers:', response.headers);
      const result = await this.handleResponse<AuthResponse>(response);
      console.log('🔵 API: Verify code result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      if (result.success && result.data) {
        await this.saveTokens(result.data.access_token, result.data.refresh_token);
        console.log('🔵 API: Verification and registration tokens saved successfully');
      }
      return result;
    } catch (error) {
      console.error('🔴 API: Verify code network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  async login(credentials: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> {
    console.log('🔵 API: Attempting to login user:', credentials.email);
    const url = `${API_BASE_URL}/auth/login`;
    console.log('🔵 API: Login URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      console.log('🔵 API: Login response status:', response.status);
      const result = await this.handleResponse<AuthResponse>(response);
      console.log('🔵 API: Login result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      if (result.success && result.data) {
        await this.saveTokens(result.data.access_token, result.data.refresh_token);
        console.log('🔵 API: Tokens saved successfully with expiry tracking');
      }
      return result;
    } catch (error) {
      console.error('🔴 API: Login network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }

  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Requesting password reset for:', email);
    const url = `${API_BASE_URL}/auth/request-password-reset`;
    console.log('🔵 API: Request password reset URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      console.log('🔵 API: Request password reset response status:', response.status);
      const result = await this.handleResponse<{ message: string }>(response);
      console.log('🔵 API: Request password reset result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      return result;
    } catch (error) {
      console.error('🔴 API: Request password reset network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  async verifyResetCode(email: string, code: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Verifying reset code for:', email);
    const url = `${API_BASE_URL}/auth/verify-reset-code`;
    console.log('🔵 API: Verify reset code URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      console.log('🔵 API: Verify reset code response status:', response.status);
      const result = await this.handleResponse<{ message: string }>(response);
      console.log('🔵 API: Verify reset code result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      return result;
    } catch (error) {
      console.error('🔴 API: Verify reset code network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Resetting password for:', email);
    const url = `${API_BASE_URL}/auth/reset-password`;
    console.log('🔵 API: Reset password URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword }),
      });

      console.log('🔵 API: Reset password response status:', response.status);
      const result = await this.handleResponse<{ message: string }>(response);
      console.log('🔵 API: Reset password result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      return result;
    } catch (error) {
      console.error('🔴 API: Reset password network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.makeAuthenticatedRequest<{ user: User }>(
      `${API_BASE_URL}/auth/me`
    );
  }

  private async refreshAccessToken(): Promise<ApiResponse<{ access_token: string }>> {
    if (!this.refreshToken) {
      console.log('🔴 API: No refresh token available');
      return { success: false, error: 'No refresh token available' };
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      console.log('🟡 API: Refresh already in progress, waiting for existing promise...');
      return this.refreshPromise;
    }

    console.log('🔄 API: Starting NEW token refresh process...');
    
    // Create the refresh promise
    this.refreshPromise = this._performRefresh();
    
    try {
      const result = await this.refreshPromise;
      console.log('🔄 API: Refresh promise completed:', result.success ? 'SUCCESS' : 'FAILED');
      return result;
    } finally {
      // Clear the promise when done
      console.log('🔄 API: Clearing refresh promise');
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(): Promise<ApiResponse<{ access_token: string }>> {
    try {
      console.log('🔄 API: Making refresh request to /auth/refresh');
      console.log('🔄 API: Using refresh token:', this.refreshToken ? 'Present' : 'Missing');
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.refreshToken}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('🔄 API: Refresh response status:', response.status);

      // Handle the refresh response manually (don't use handleResponse to avoid recursion)
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 API: Refresh response data:', data ? 'Present' : 'Missing');
        
        if (data && data.access_token) {
          console.log('✅ API: Token refresh successful, updating tokens');
          
          // Update token and expiry date
          this.accessToken = data.access_token;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
          this.tokenExpiryDate = expiryDate;
          
          await AsyncStorage.setItem('access_token', data.access_token);
          await AsyncStorage.setItem('token_expiry', expiryDate.toISOString());
          
          // Small delay to ensure token propagation
          await new Promise(resolve => setTimeout(resolve, 50));
          
          return { success: true, data: { access_token: data.access_token } };
        } else {
          console.log('🔴 API: Refresh response missing access_token field');
          return { success: false, error: 'Invalid refresh response' };
        }
      } else {
        console.log('🔴 API: Refresh failed with status:', response.status);
        
        // Try to get error details
        try {
          const errorData = await response.json();
          console.log('🔴 API: Refresh error details:', errorData);
        } catch (e) {
          console.log('🔴 API: Could not parse error response');
        }
        
        // Clear tokens if refresh fails
        await this.clearTokens();
        
        // Trigger auth failure callback
        if (this.authFailureCallback) {
          console.log('🔴 API: Triggering auth failure callback');
          this.authFailureCallback();
        }
        
        return { success: false, error: 'Refresh token expired' };
      }
    } catch (error) {
      console.error('🔴 API: Refresh network error:', error);
      
      // Trigger auth failure callback on network error during refresh
      if (this.authFailureCallback) {
        console.log('🔴 API: Triggering auth failure callback due to network error');
        this.authFailureCallback();
      }
      
      return { success: false, error: 'Network error during refresh' };
    }
  }

  // Boards
  async getBoards(): Promise<ApiResponse<{ boards: Board[] }>> {
    console.log('🔵 API: Getting boards...');
    return this.makeAuthenticatedRequest<{ boards: Board[] }>(
      `${API_BASE_URL}/boards`
    );
  }

  async createBoard(boardData: {
    name: string;
    description?: string;
    currency?: string;
    timezone?: string;
    board_type?: string;
    custom_categories?: QuickCategory[];
  }): Promise<ApiResponse<Board>> {
    return this.makeAuthenticatedRequest<Board>(
      `${API_BASE_URL}/boards`,
      {
        method: 'POST',
        body: JSON.stringify(boardData),
      }
    );
  }

  async getBoard(boardId: string): Promise<ApiResponse<Board & { members: BoardMember[]; user_role: string }>> {
    return this.makeAuthenticatedRequest<Board & { members: BoardMember[]; user_role: string }>(
      `${API_BASE_URL}/boards/${boardId}`
    );
  }

  async updateBoard(boardId: string, updateData: Partial<Board>): Promise<ApiResponse<Board>> {
    return this.makeAuthenticatedRequest<Board>(
      `${API_BASE_URL}/boards/${boardId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }
    );
  }

  async deleteBoard(boardId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/${boardId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Board Members
  async getBoardMembers(boardId: string): Promise<ApiResponse<{ members: BoardMember[] }>> {
    return this.makeAuthenticatedRequest<{ members: BoardMember[] }>(
      `${API_BASE_URL}/boards/${boardId}/members`
    );
  }

  async inviteMember(boardId: string, inviteData: {
    email: string;
    role: string;
  }): Promise<ApiResponse<{ message: string; member_id?: string; invitation_id?: string }>> {
    return this.makeAuthenticatedRequest<{ message: string; member_id?: string; invitation_id?: string }>(
      `${API_BASE_URL}/boards/${boardId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(inviteData),
      }
    );
  }

  async removeMember(boardId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/${boardId}/members/${userId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async setDefaultBoard(boardId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Setting default board:', boardId);
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/${boardId}/set-default`,
      {
        method: 'PUT',
      }
    );
  }

  async clearDefaultBoard(): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Clearing default board...');
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/clear-default`,
      {
        method: 'PUT',
      }
    );
  }

  // Board Expenses
  async getBoardExpenses(boardId: string): Promise<ApiResponse<{ expenses: Expense[] }>> {
    return this.makeAuthenticatedRequest<{ expenses: Expense[] }>(
      `${API_BASE_URL}/boards/${boardId}/expenses`
    );
  }

  async createExpense(boardId: string, expenseData: {
    amount: number;
    category: string;
    description?: string;
    paid_by?: string;
    date?: string;
    is_recurring?: boolean;
    frequency?: string;
    start_date?: string;
    end_date?: string;
    receipt_url?: string;
    tags?: string[];
  }): Promise<ApiResponse<Expense>> {
    return this.makeAuthenticatedRequest<Expense>(
      `${API_BASE_URL}/boards/${boardId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify(expenseData),
      }
    );
  }

  async updateExpense(boardId: string, expenseId: string, updateData: Partial<Expense>): Promise<ApiResponse<{ message: string }>> {
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/${boardId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }
    );
  }

  async deleteExpense(boardId: string, expenseId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/${boardId}/expenses/${expenseId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getExpenseImage(expenseId: string): Promise<ApiResponse<{ image: string }>> {
    console.log('🔵 API: Getting expense image for:', expenseId);
    
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}/image`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      // Handle 404 errors silently for images (they're not real errors)
      if (response.status === 404) {
        console.log('🟡 API: Image not found for expense:', expenseId, '(this is normal)');
        return { success: false, error: 'Image not found' };
      }

      // For other errors, use the normal error handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to fetch image';
        console.log('🔴 API: Image fetch failed:', errorMessage);
        return { success: false, error: errorMessage };
      }

      // Success case
      const data = await response.json();
      if (data && data.image) {
        console.log('✅ API: Image fetched successfully for expense:', expenseId);
        return { success: true, data: { image: data.image } };
      } else {
        console.log('🟡 API: Image data missing for expense:', expenseId);
        return { success: false, error: 'Image data missing' };
      }
    } catch (error) {
      console.log('🟡 API: Network error fetching image for expense:', expenseId, '(this is normal)');
      return { success: false, error: 'Network error' };
    }
  }

  // Categories
  async getBoardCategories(boardId: string): Promise<ApiResponse<{ categories: Category[] }>> {
    return this.makeAuthenticatedRequest<{ categories: Category[] }>(
      `${API_BASE_URL}/boards/${boardId}/categories`
    );
  }

  async createCategory(boardId: string, categoryData: {
    name: string;
    icon: string;
    color: string;
    is_default?: boolean;
  }): Promise<ApiResponse<Category>> {
    return this.makeAuthenticatedRequest<Category>(
      `${API_BASE_URL}/boards/${boardId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(categoryData),
      }
    );
  }

  async updateBoardCategories(boardId: string, categories: QuickCategory[]): Promise<ApiResponse<{ message: string }>> {
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/${boardId}/categories/update`,
      {
        method: 'PUT',
        body: JSON.stringify({ categories }),
      }
    );
  }

  // Debts
  async getBoardDebts(boardId: string): Promise<ApiResponse<{ debts: Debt[] }>> {
    return this.makeAuthenticatedRequest<{ debts: Debt[] }>(
      `${API_BASE_URL}/boards/${boardId}/debts`
    );
  }

  async markDebtAsPaid(boardId: string, debtId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/boards/${boardId}/debts/${debtId}/mark-paid`,
      {
        method: 'PUT',
      }
    );
  }

  async processPartialPayment(fromUserId: string, paymentAmount: number, boardIds?: string[]): Promise<ApiResponse<{
    message: string;
    debts_closed: Array<{
      debt_id: string;
      original_amount: number;
      amount_paid: number;
      description: string;
    }>;
    debts_updated: Array<{
      debt_id: string;
      original_amount: number;
      amount_paid: number;
      remaining_amount: number;
      description: string;
    }>;
    total_processed: number;
  }>> {
    return this.makeAuthenticatedRequest<{
      message: string;
      debts_closed: Array<{
        debt_id: string;
        original_amount: number;
        amount_paid: number;
        description: string;
      }>;
      debts_updated: Array<{
        debt_id: string;
        original_amount: number;
        amount_paid: number;
        remaining_amount: number;
        description: string;
      }>;
      total_processed: number;
    }>(
      `${API_BASE_URL}/debts/process-partial-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_user_id: fromUserId,
          payment_amount: paymentAmount,
          board_ids: boardIds
        }),
      }
    );
  }

  async autoOffsetDebts(boardIds?: string[]): Promise<ApiResponse<{
    message: string;
    offsets_processed: number;
    total_amount_offset: number;
    details: Array<{
      user1_name: string;
      user2_name: string;
      offset_amount: number;
      remaining_debt: number;
      direction: 'user1_owes_user2' | 'user2_owes_user1' | 'balanced';
    }>;
  }>> {
    return this.makeAuthenticatedRequest<{
      message: string;
      offsets_processed: number;
      total_amount_offset: number;
      details: Array<{
        user1_name: string;
        user2_name: string;
        offset_amount: number;
        remaining_debt: number;
        direction: 'user1_owes_user2' | 'user2_owes_user1' | 'balanced';
      }>;
    }>(
      `${API_BASE_URL}/debts/auto-offset`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_ids: boardIds
        }),
      }
    );
  }

  // Summary and Statistics
  async getExpensesSummary(filters?: {
    start_date?: string;
    end_date?: string;
    board_ids?: string[];
  }): Promise<ApiResponse<{
    total_amount: number;
    total_expenses: number;
    expenses_by_category: { [category: string]: number };
    expenses_by_board: { [board_id: string]: number };
    monthly_trend: { [month: string]: number };
  }>> {
    let url = `${API_BASE_URL}/expenses/summary`;
    const params = new URLSearchParams();
    
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.board_ids) {
      filters.board_ids.forEach(id => params.append('board_ids', id));
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.makeAuthenticatedRequest<{
      total_amount: number;
      total_expenses: number;
      expenses_by_category: { [category: string]: number };
      expenses_by_board: { [board_id: string]: number };
      monthly_trend: { [month: string]: number };
    }>(url);
  }

  async getAllDebts(filters?: {
    start_date?: string;
    end_date?: string;
    board_ids?: string[];
    is_paid?: boolean;
  }): Promise<ApiResponse<{
    debts: Debt[];
    summary: {
      total_owed: number;
      total_owed_to_me: number;
      total_unpaid: number;
      total_paid: number;
    };
  }>> {
    console.log('🔵 API: getAllDebts called with filters:', filters);
    console.log('🔵 API: Current token valid?', this.isTokenValid());
    console.log('🔵 API: Current token exists?', !!this.accessToken);
    
    let url = `${API_BASE_URL}/debts/all`;
    const params = new URLSearchParams();
    
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.board_ids) {
      filters.board_ids.forEach(id => params.append('board_ids', id));
    }
    if (filters?.is_paid !== undefined) params.append('is_paid', filters.is_paid.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log('🔵 API: getAllDebts URL:', url);

    const result = await this.makeAuthenticatedRequest<{
      debts: Debt[];
      summary: {
        total_owed: number;
        total_owed_to_me: number;
        total_unpaid: number;
        total_paid: number;
      };
    }>(url);

    console.log('🔵 API: getAllDebts result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
    return result;
  }

  async getExpensesByPeriod(startDate: string, endDate: string, boardIds?: string[]): Promise<ApiResponse<{
    expenses: Expense[];
    summary: {
      total_amount: number;
      total_expenses: number;
      average_per_day: number;
    };
  }>> {
    let url = `${API_BASE_URL}/expenses/by-period?start_date=${startDate}&end_date=${endDate}`;
    
    if (boardIds && boardIds.length > 0) {
      boardIds.forEach(id => url += `&board_ids=${id}`);
    }

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{
      expenses: Expense[];
      summary: {
        total_amount: number;
        total_expenses: number;
        average_per_day: number;
      };
    }>(response);
  }

  // Export board expenses
  async exportBoardExpenses(boardId: string, startDate?: string, endDate?: string): Promise<ApiResponse<{
    blob: Blob;
    filename: string;
  }>> {
    console.log('🔵 API: Exporting board expenses for board:', boardId, 'Date range:', startDate, 'to', endDate);
    
    try {
      const requestBody: any = {};
      if (startDate) requestBody.start_date = startDate;
      if (endDate) requestBody.end_date = endDate;

      const response = await fetch(`${API_BASE_URL}/boards/${boardId}/export-expenses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Export failed' };
      }

      // Get the Excel blob from response
      const blob = await response.blob();
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'expenses_export.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      console.log('🔵 API: Export expenses result: SUCCESS');
      return { 
        success: true, 
        data: { blob, filename }
      };
    } catch (error) {
      console.error('🔴 API: Export expenses error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; message: string; timestamp: string }>> {
    console.log('🔵 API: Health check...');
    const url = `${API_BASE_URL}/health`;
    console.log('🔵 API: Health check URL:', url);
    
    try {
      const response = await fetch(url);
      console.log('🔵 API: Health check response status:', response.status);
      const result = await this.handleResponse<{ status: string; message: string; timestamp: string }>(response);
      console.log('🔵 API: Health check result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      return result;
    } catch (error) {
      console.error('🔴 API: Health check error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse<{ notifications: any[] }>> {
    console.log('🔵 API: Getting notifications...');
    return this.makeAuthenticatedRequest<{ notifications: any[] }>(
      `${API_BASE_URL}/notifications`
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Marking notification as read:', notificationId);
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Marking all notifications as read...');
    const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Deleting notification:', notificationId);
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  // Delete user account
  async deleteUser(): Promise<ApiResponse<{ message: string }>> {
    console.log('🔵 API: Deleting user account...');
    return this.makeAuthenticatedRequest<{ message: string }>(
      `${API_BASE_URL}/auth/delete-user`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const apiService = new ApiService(); 