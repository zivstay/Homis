import AsyncStorage from '@react-native-async-storage/async-storage';

// If you're on Android emulator
// const API_BASE_URL = 'http://10.0.2.2:5000/api';

// If you're on a real device on Wi-Fi
const API_BASE_URL = 'http://192.168.7.9:5000/api';   // <-- your IP

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
  receipt_url?: string;
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
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokens();
  }

  private async loadTokens() {
    try {
      this.accessToken = await AsyncStorage.getItem('access_token');
      this.refreshToken = await AsyncStorage.getItem('refresh_token');
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  private async saveTokens(accessToken: string, refreshToken: string) {
    try {
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  private async clearTokens() {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Error clearing tokens:', error);
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

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (response.status === 401 && this.refreshToken) {
      // Try to refresh token
      const refreshResult = await this.refreshAccessToken();
      if (refreshResult.success) {
        // Retry the original request
        const retryResponse = await fetch(response.url, {
          method: response.type,
          headers: this.getHeaders(),
          body: response.body,
        });
        return this.handleResponse<T>(retryResponse);
      } else {
        // Refresh failed, user needs to login again
        await this.clearTokens();
        return { success: false, error: 'Authentication required' };
      }
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('🔴 API: Failed to parse response JSON:', error);
      return { success: false, error: 'Invalid response from server' };
    }

    if (response.ok) {
      return { success: true, data };
    } else {
      // Handle different types of error responses
      let errorMessage = 'Request failed';
      
      if (data) {
        // Check for different error formats
        if (data.error) {
          errorMessage = data.error;
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

      console.log('🔴 API: Error response:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        errorMessage: errorMessage
      });

      return { success: false, error: errorMessage };
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
      }
      return result;
    } catch (error) {
      console.error('🔴 API: Register network error:', error);
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

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ user: User }>(response);
  }

  private async refreshAccessToken(): Promise<ApiResponse<{ access_token: string }>> {
    if (!this.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.refreshToken}` },
    });

    const result = await this.handleResponse<{ access_token: string }>(response);
    if (result.success && result.data) {
      this.accessToken = result.data.access_token;
      await AsyncStorage.setItem('access_token', result.data.access_token);
    }
    return result;
  }

  // Boards
  async getBoards(): Promise<ApiResponse<{ boards: Board[] }>> {
    console.log('🔵 API: Getting boards...');
    console.log('🔵 API: Access token:', this.accessToken ? 'Present' : 'Missing');
    
    const url = `${API_BASE_URL}/boards`;
    console.log('🔵 API: Boards URL:', url);
    
    const headers = this.getHeaders();
    console.log('🔵 API: Request headers:', headers);
    
    try {
      const response = await fetch(url, {
        headers: headers,
      });

      console.log('🔵 API: Boards response status:', response.status);
      console.log('🔵 API: Boards response headers:', response.headers);
      
      const result = await this.handleResponse<{ boards: Board[] }>(response);
      console.log('🔵 API: Boards result:', result.success ? 'SUCCESS' : 'FAILED', result.error);
      
      return result;
    } catch (error) {
      console.error('🔴 API: Boards network error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: `Connection failed: ${errorMessage}` };
    }
  }

  async createBoard(boardData: {
    name: string;
    description?: string;
    currency?: string;
    timezone?: string;
    board_type?: string;
  }): Promise<ApiResponse<Board>> {
    const response = await fetch(`${API_BASE_URL}/boards`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(boardData),
    });

    return this.handleResponse<Board>(response);
  }

  async getBoard(boardId: string): Promise<ApiResponse<Board & { members: BoardMember[]; user_role: string }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<Board & { members: BoardMember[]; user_role: string }>(response);
  }

  async updateBoard(boardId: string, updateData: Partial<Board>): Promise<ApiResponse<Board>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updateData),
    });

    return this.handleResponse<Board>(response);
  }

  async deleteBoard(boardId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  // Board Members
  async getBoardMembers(boardId: string): Promise<ApiResponse<{ members: BoardMember[] }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/members`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ members: BoardMember[] }>(response);
  }

  async inviteMember(boardId: string, inviteData: {
    email: string;
    role: string;
  }): Promise<ApiResponse<{ message: string; member_id?: string; invitation_id?: string }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/members`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(inviteData),
    });

    return this.handleResponse<{ message: string; member_id?: string; invitation_id?: string }>(response);
  }

  async removeMember(boardId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/members/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  // Expenses
  async getBoardExpenses(boardId: string, month?: number, year?: number): Promise<ApiResponse<{ expenses: Expense[] }>> {
    let url = `${API_BASE_URL}/boards/${boardId}/expenses`;
    if (month !== undefined && year !== undefined) {
      url += `?month=${month}&year=${year}`;
    }

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ expenses: Expense[] }>(response);
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
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/expenses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(expenseData),
    });

    return this.handleResponse<Expense>(response);
  }

  async updateExpense(boardId: string, expenseId: string, updateData: Partial<Expense>): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/expenses/${expenseId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updateData),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  async deleteExpense(boardId: string, expenseId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
  }

  // Categories
  async getBoardCategories(boardId: string): Promise<ApiResponse<{ categories: Category[] }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/categories`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ categories: Category[] }>(response);
  }

  async createCategory(boardId: string, categoryData: {
    name: string;
    icon: string;
    color: string;
    is_default?: boolean;
  }): Promise<ApiResponse<Category>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/categories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(categoryData),
    });

    return this.handleResponse<Category>(response);
  }

  // Debts
  async getBoardDebts(boardId: string): Promise<ApiResponse<{ debts: Debt[] }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/debts`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ debts: Debt[] }>(response);
  }

  async markDebtAsPaid(boardId: string, debtId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE_URL}/boards/${boardId}/debts/${debtId}/mark-paid`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ message: string }>(response);
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

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{
      total_amount: number;
      total_expenses: number;
      expenses_by_category: { [category: string]: number };
      expenses_by_board: { [board_id: string]: number };
      monthly_trend: { [month: string]: number };
    }>(response);
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

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<{
      debts: Debt[];
      summary: {
        total_owed: number;
        total_owed_to_me: number;
        total_unpaid: number;
        total_paid: number;
      };
    }>(response);
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

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; message: string; timestamp: string }>> {
    console.log('🔵 API: Attempting health check');
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

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

export const apiService = new ApiService(); 