import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuickCategory } from '../constants/boardTypes';
import { Board, Expense } from './api';

const GUEST_BOARDS_KEY = 'guest_boards';
const GUEST_SELECTED_BOARD_KEY = 'guest_selected_board';
const GUEST_EXPENSES_KEY = 'guest_expenses';

export interface GuestBoard extends Omit<Board, 'id' | 'user_role' | 'is_default_board'> {
  id: string;
  user_role: 'owner';
  is_default_board: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestExpense extends Omit<Expense, 'id' | 'board_id' | 'user_id'> {
  id: string;
  board_id: string;
  user_id: 'guest';
  created_at: string;
  updated_at: string;
}

class LocalStorageService {
  // Generate a simple UUID for guest mode
  private generateId(): string {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Board operations
  async getBoards(): Promise<GuestBoard[]> {
    try {
      const boardsJson = await AsyncStorage.getItem(GUEST_BOARDS_KEY);
      return boardsJson ? JSON.parse(boardsJson) : [];
    } catch (error) {
      console.error('Error getting guest boards:', error);
      return [];
    }
  }

  async saveBoards(boards: GuestBoard[]): Promise<void> {
    try {
      await AsyncStorage.setItem(GUEST_BOARDS_KEY, JSON.stringify(boards));
    } catch (error) {
      console.error('Error saving guest boards:', error);
    }
  }

  async createBoard(boardData: {
    name: string;
    description?: string;
    currency?: string;
    timezone?: string;
    board_type?: string;
    custom_categories?: QuickCategory[];
  }): Promise<GuestBoard> {
    const newBoard: GuestBoard = {
      id: this.generateId(),
      name: boardData.name,
      description: boardData.description || '',
      currency: boardData.currency || 'ILS',
      timezone: boardData.timezone || 'Asia/Jerusalem',
      board_type: boardData.board_type || 'personal',
      custom_categories: boardData.custom_categories || [],
      user_role: 'owner',
      is_default_board: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const boards = await this.getBoards();
    
    // If this is the first board, make it default
    if (boards.length === 0) {
      newBoard.is_default_board = true;
    }
    
    boards.push(newBoard);
    await this.saveBoards(boards);
    
    return newBoard;
  }

  async deleteBoard(boardId: string): Promise<boolean> {
    try {
      const boards = await this.getBoards();
      const updatedBoards = boards.filter(board => board.id !== boardId);
      await this.saveBoards(updatedBoards);
      
      // Also delete all expenses for this board
      await this.deleteBoardExpenses(boardId);
      
      // Clear selected board if it was deleted
      const selectedBoardId = await this.getSelectedBoardId();
      if (selectedBoardId === boardId) {
        await this.clearSelectedBoard();
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting guest board:', error);
      return false;
    }
  }

  async updateBoard(boardId: string, updateData: Partial<GuestBoard>): Promise<GuestBoard | null> {
    try {
      const boards = await this.getBoards();
      const boardIndex = boards.findIndex(board => board.id === boardId);
      
      if (boardIndex === -1) {
        console.error('Board not found:', boardId);
        return null;
      }
      
      const updatedBoard = {
        ...boards[boardIndex],
        ...updateData,
        updated_at: new Date().toISOString(),
      };
      
      boards[boardIndex] = updatedBoard;
      await this.saveBoards(boards);
      
      return updatedBoard;
    } catch (error) {
      console.error('Error updating guest board:', error);
      return null;
    }
  }

  async setDefaultBoard(boardId: string): Promise<boolean> {
    try {
      const boards = await this.getBoards();
      const updatedBoards = boards.map(board => ({
        ...board,
        is_default_board: board.id === boardId,
        updated_at: new Date().toISOString(),
      }));
      await this.saveBoards(updatedBoards);
      return true;
    } catch (error) {
      console.error('Error setting default guest board:', error);
      return false;
    }
  }

  async clearDefaultBoard(): Promise<boolean> {
    try {
      const boards = await this.getBoards();
      const updatedBoards = boards.map(board => ({
        ...board,
        is_default_board: false,
        updated_at: new Date().toISOString(),
      }));
      await this.saveBoards(updatedBoards);
      return true;
    } catch (error) {
      console.error('Error clearing default guest board:', error);
      return false;
    }
  }

  // Selected board operations
  async getSelectedBoardId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(GUEST_SELECTED_BOARD_KEY);
    } catch (error) {
      console.error('Error getting selected guest board:', error);
      return null;
    }
  }

  async setSelectedBoard(boardId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(GUEST_SELECTED_BOARD_KEY, boardId);
    } catch (error) {
      console.error('Error setting selected guest board:', error);
    }
  }

  async clearSelectedBoard(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GUEST_SELECTED_BOARD_KEY);
    } catch (error) {
      console.error('Error clearing selected guest board:', error);
    }
  }

  // Expense operations
  async getBoardExpenses(boardId: string): Promise<GuestExpense[]> {
    try {
      const expensesJson = await AsyncStorage.getItem(GUEST_EXPENSES_KEY);
      const allExpenses: GuestExpense[] = expensesJson ? JSON.parse(expensesJson) : [];
      return allExpenses.filter(expense => expense.board_id === boardId);
    } catch (error) {
      console.error('Error getting guest expenses:', error);
      return [];
    }
  }

  async saveExpense(expenseData: {
    board_id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
    payer_id?: string;
    split_type?: string;
    split_data?: any;
  }): Promise<GuestExpense> {
    const newExpense: GuestExpense = {
      id: this.generateId(),
      board_id: expenseData.board_id,
      user_id: 'guest',
      amount: expenseData.amount,
      description: expenseData.description,
      category: expenseData.category,
      date: expenseData.date,
      payer_id: expenseData.payer_id || 'guest',
      split_type: expenseData.split_type || 'equal',
      split_data: expenseData.split_data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const expensesJson = await AsyncStorage.getItem(GUEST_EXPENSES_KEY);
      const allExpenses: GuestExpense[] = expensesJson ? JSON.parse(expensesJson) : [];
      allExpenses.push(newExpense);
      await AsyncStorage.setItem(GUEST_EXPENSES_KEY, JSON.stringify(allExpenses));
      return newExpense;
    } catch (error) {
      console.error('Error saving guest expense:', error);
      throw error;
    }
  }

  async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      const expensesJson = await AsyncStorage.getItem(GUEST_EXPENSES_KEY);
      const allExpenses: GuestExpense[] = expensesJson ? JSON.parse(expensesJson) : [];
      const updatedExpenses = allExpenses.filter(expense => expense.id !== expenseId);
      await AsyncStorage.setItem(GUEST_EXPENSES_KEY, JSON.stringify(updatedExpenses));
      return true;
    } catch (error) {
      console.error('Error deleting guest expense:', error);
      return false;
    }
  }

  async updateExpense(expenseId: string, updates: Partial<GuestExpense>): Promise<boolean> {
    try {
      const expensesJson = await AsyncStorage.getItem(GUEST_EXPENSES_KEY);
      const allExpenses: GuestExpense[] = expensesJson ? JSON.parse(expensesJson) : [];
      const updatedExpenses = allExpenses.map(expense =>
        expense.id === expenseId
          ? { ...expense, ...updates, updated_at: new Date().toISOString() }
          : expense
      );
      await AsyncStorage.setItem(GUEST_EXPENSES_KEY, JSON.stringify(updatedExpenses));
      return true;
    } catch (error) {
      console.error('Error updating guest expense:', error);
      return false;
    }
  }

  private async deleteBoardExpenses(boardId: string): Promise<void> {
    try {
      const expensesJson = await AsyncStorage.getItem(GUEST_EXPENSES_KEY);
      const allExpenses: GuestExpense[] = expensesJson ? JSON.parse(expensesJson) : [];
      const updatedExpenses = allExpenses.filter(expense => expense.board_id !== boardId);
      await AsyncStorage.setItem(GUEST_EXPENSES_KEY, JSON.stringify(updatedExpenses));
    } catch (error) {
      console.error('Error deleting board expenses:', error);
    }
  }

  // Clear all guest data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        GUEST_BOARDS_KEY,
        GUEST_SELECTED_BOARD_KEY,
        GUEST_EXPENSES_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing guest data:', error);
    }
  }
}

export const localStorageService = new LocalStorageService();
