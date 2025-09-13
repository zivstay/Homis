import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { QuickCategory } from '../constants/boardTypes';
import { apiService, Board, BoardMember, Expense } from '../services/api';
import { localStorageService } from '../services/localStorageService';
import { useAuth } from './AuthContext';

interface BoardContextType {
  boards: Board[];
  selectedBoard: Board | null;
  boardMembers: BoardMember[];
  boardExpenses: Expense[];
  isLoading: boolean;
  shouldOpenCategoryModal: boolean;
  selectBoard: (board: Board) => void;
  updateSelectedBoard: (boardId: string) => Promise<void>;
  createBoard: (boardData: {
    name: string;
    description?: string;
    currency?: string;
    timezone?: string;
    board_type?: string;
    custom_categories?: QuickCategory[];
  }) => Promise<{ success: boolean; error?: string; board?: Board }>;
  saveBoardCategories: (boardId: string, categories: { name: string; icon: string; color: string }[]) => Promise<{ success: boolean; error?: string; message?: string }>;
  refreshBoards: () => Promise<void>;
  refreshBoardMembers: () => Promise<void>;
  refreshBoardExpenses: () => Promise<void>;
  refreshBoardData: () => Promise<void>;
  inviteMember: (email: string | null, role: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>;
  removeMember: (userId: string) => Promise<{ success: boolean; error?: string }>;
  setDefaultBoard: (boardId: string) => Promise<{ success: boolean; error?: string }>;
  clearDefaultBoard: () => Promise<{ success: boolean; error?: string }>;
  deleteBoard: (boardId: string) => Promise<{ success: boolean; error?: string }>;
  setShouldOpenCategoryModal: (shouldOpen: boolean) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
};

interface BoardProviderProps {
  children: ReactNode;
}

export const BoardProvider: React.FC<BoardProviderProps> = ({ children }) => {
  const { isAuthenticated, isGuestMode } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [boardExpenses, setBoardExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldOpenCategoryModal, setShouldOpenCategoryModal] = useState(false);
  const isRefreshingBoards = useRef(false);
  const isRefreshingMembers = useRef(false);
  const isRefreshingExpenses = useRef(false);
  const selectedBoardRef = useRef<Board | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedBoardRef.current = selectedBoard;
  }, [selectedBoard]);

  const refreshBoards = useCallback(async () => {
    if ((!isAuthenticated && !isGuestMode) || isRefreshingBoards.current) return;
    
    isRefreshingBoards.current = true;
    setIsLoading(true);
    
    try {
      let boardsData: Board[] = [];
      
      if (isGuestMode) {
        // Load boards from local storage for guest mode
        const guestBoards = await localStorageService.getBoards();
        boardsData = guestBoards;
        console.log('🔄 Board: Loaded guest boards from local storage:', boardsData.length);
      } else {
        // Load boards from API for authenticated users
        const response = await apiService.getBoards();
        if (response.success && response.data) {
          boardsData = response.data.boards || [];
        } else {
          console.error('Failed to fetch boards:', response.error);
        }
      }
      
      setBoards(boardsData);
      
      // If no board is currently selected and we have boards
      if (!selectedBoard && boardsData.length > 0) {
        // First try to select the default board if one exists
        const defaultBoard = boardsData.find(board => board.is_default_board);
        if (defaultBoard) {
          console.log('🔄 Board: Auto-selecting default board:', defaultBoard.name);
          setSelectedBoard(defaultBoard);
        } else {
          // If no default board is set, select the first one
          console.log('🔄 Board: Auto-selecting first board:', boardsData[0].name);
          setSelectedBoard(boardsData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setIsLoading(false);
      isRefreshingBoards.current = false;
    }
  }, [isAuthenticated, isGuestMode, selectedBoard]);

  const refreshBoardMembers = useCallback(async () => {
    if (!selectedBoard || isRefreshingMembers.current) {
      return;
    }

    try {
      isRefreshingMembers.current = true;
      
      if (isGuestMode) {
        // For guest mode, create a fake member representing the guest user
        const guestMember: BoardMember = {
          id: 'guest',
          user_id: 'guest',
          role: 'owner',
          joined_at: new Date().toISOString(),
          permissions: ['read', 'write', 'admin'],
          user: {
            id: 'guest',
            email: 'guest@local',
            username: 'guest',
            first_name: 'אורח',
            last_name: '',
            is_active: true,
            created_at: new Date().toISOString(),
            email_verified: false,
          },
        };
        setBoardMembers([guestMember]);
      } else {
        let result = await apiService.getBoardMembers(selectedBoard.id);
        
        // Handle retry if token was refreshed
        if (!result.success && result.needsRetry) {
          console.log('🔄 BoardContext: Retrying getBoardMembers after token refresh');
          result = await apiService.getBoardMembers(selectedBoard.id);
        }
        
        if (result.success && result.data) {
          setBoardMembers(result.data.members);
        } else {
          console.error('🔴 BoardContext: Failed to refresh board members:', result.error);
        }
      }
    } catch (error) {
      console.error('Error refreshing board members:', error);
    } finally {
      isRefreshingMembers.current = false;
    }
  }, [selectedBoard, isGuestMode]);

  const refreshBoardExpenses = useCallback(async () => {
    if (!selectedBoard || isRefreshingExpenses.current) {
      return;
    }

    try {
      isRefreshingExpenses.current = true;
      console.log('🏠 BoardContext: Fetching board expenses for board:', selectedBoard.id);
      
      if (isGuestMode) {
        // Load expenses from local storage for guest mode
        const guestExpenses = await localStorageService.getBoardExpenses(selectedBoard.id);
        console.log('🏠 BoardContext: Guest board expenses loaded:', guestExpenses.length, 'expenses');
        setBoardExpenses(guestExpenses as Expense[]);
      } else {
        let result = await apiService.getBoardExpenses(selectedBoard.id);
        
        // Handle retry if token was refreshed
        if (!result.success && result.needsRetry) {
          console.log('🔄 BoardContext: Retrying getBoardExpenses after token refresh');
          result = await apiService.getBoardExpenses(selectedBoard.id);
        }
        
        if (result.success && result.data) {
          console.log('🏠 BoardContext: Board expenses loaded:', result.data.expenses.length, 'expenses');
          setBoardExpenses(result.data.expenses);
        } else {
          console.log('🏠 BoardContext: Failed to load board expenses:', result.error);
        }
      }
    } catch (error) {
      console.error('🏠 BoardContext: Error refreshing board expenses:', error);
    } finally {
      isRefreshingExpenses.current = false;
    }
  }, [selectedBoard, isGuestMode]);

  // Effect for authentication changes
  useEffect(() => {
    if (isAuthenticated || isGuestMode) {
      console.log('🏠 BoardContext: User authenticated or in guest mode, refreshing boards');
      // Add a small delay to prevent rapid successive calls
      refreshTimeoutRef.current = setTimeout(() => {
        refreshBoards();
      }, 100);
    } else {
      console.log('🏠 BoardContext: User not authenticated and not in guest mode, clearing boards');
      setBoards([]);
      setSelectedBoard(null);
      setBoardMembers([]);
      setBoardExpenses([]);
    }
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [selectedBoard, isAuthenticated, isGuestMode]);

  const setDefaultBoard = useCallback(async (boardId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isGuestMode) {
        const success = await localStorageService.setDefaultBoard(boardId);
        if (success) {
          await refreshBoards();
          return { success: true };
        } else {
          return { success: false, error: 'Failed to set default board' };
        }
      } else {
        const response = await apiService.setDefaultBoard(boardId);
        if (response.success) {
          // Refresh boards to get updated default status
          await refreshBoards();
          return { success: true };
        } else {
          return { success: false, error: response.error || 'Failed to set default board' };
        }
      }
    } catch (error) {
      console.error('Error setting default board:', error);
      return { success: false, error: 'Network error' };
    }
  }, [refreshBoards, isGuestMode]);

  const clearDefaultBoard = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isGuestMode) {
        const success = await localStorageService.clearDefaultBoard();
        if (success) {
          await refreshBoards();
          return { success: true };
        } else {
          return { success: false, error: 'Failed to clear default board' };
        }
      } else {
        const response = await apiService.clearDefaultBoard();
        if (response.success) {
          // Refresh boards to get updated default status
          await refreshBoards();
          return { success: true };
        } else {
          return { success: false, error: response.error || 'Failed to clear default board' };
        }
      }
    } catch (error) {
      console.error('Error clearing default board:', error);
      return { success: false, error: 'Network error' };
    }
  }, [refreshBoards, isGuestMode]);

  // Effect for board selection changes - add a small delay to prevent race conditions
  useEffect(() => {
    if (selectedBoard) {
      console.log('🏠 BoardContext: Board selected, refreshing members and expenses:', selectedBoard.name);
      
      // Use refs to avoid dependency issues
      const currentSelectedBoard = selectedBoardRef.current;
      if (currentSelectedBoard && currentSelectedBoard.id === selectedBoard.id) {
        // Add a small delay to prevent simultaneous requests
        const timer = setTimeout(() => {
          if (!isRefreshingMembers.current) {
            refreshBoardMembers();
          }
        }, 50);
        
        if (!isRefreshingExpenses.current) {
          refreshBoardExpenses();
        }
        
        return () => clearTimeout(timer);
      }
    } else {
      console.log('🏠 BoardContext: No board selected, clearing members and expenses');
      setBoardMembers([]);
      setBoardExpenses([]);
    }
  }, [selectedBoard]);

  const selectBoard = (board: Board) => {
    setSelectedBoard(board);
  };

  const updateSelectedBoard = async (boardId: string) => {
    try {
      const response = await apiService.getBoard(boardId);
      if (response.success && response.data) {
        console.log('🔄 BoardContext: Updating selected board with fresh data from API');
        setSelectedBoard(response.data);
      }
    } catch (error) {
      console.error('Error updating selected board:', error);
    }
  };

  const createBoard = async (
    boardData: {
      name: string;
      description?: string;
      currency?: string;
      timezone?: string;
      board_type?: string;
      custom_categories?: QuickCategory[];
    }
  ) => {
    try {
      if (isGuestMode) {
        const newBoard = await localStorageService.createBoard(boardData);
        console.log('✅ Guest board created successfully:', newBoard.id);
        
        // Refresh boards to get the updated list
        await refreshBoards();
        return { success: true, board: newBoard };
      } else {
        let result = await apiService.createBoard(boardData);
        
        // Handle retry if token was refreshed
        if (!result.success && result.needsRetry) {
          console.log('🔄 BoardContext: Retrying createBoard after token refresh');
          result = await apiService.createBoard(boardData);
        }
        
        if (result.success && result.data) {
          const newBoard = result.data;
          console.log('✅ Board created successfully:', newBoard.id);
          
          // השרת כבר מטפל ביצירת הקטגוריות המותאמות אישית
          // אין צורך לשמור אותן שוב כאן כדי למנוע כפילות
          console.log('📋 Categories handled by server, no need to save separately');
          
          // Refresh boards to get the updated list
          await refreshBoards();
          return { success: true, board: newBoard };
        } else {
          return { success: false, error: result.error || 'Failed to create board' };
        }
      }
    } catch (error) {
      console.error('Error creating board:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const saveBoardCategories = useCallback(async (boardId: string, categories: { name: string; icon: string; color: string }[]) => {
    try {
      console.log('💾 Saving categories for board:', boardId, categories);
      
      // Save categories one by one using createCategory API
      const results = [];
      for (const category of categories) {
        try {
          const result = await apiService.createCategory(boardId, {
            name: category.name,
            icon: category.icon,
            color: category.color,
            is_default: false
          });
          
          if (result.success) {
            console.log('✅ Category saved:', category.name);
            results.push({ success: true, category: category.name });
          } else {
            console.error('❌ Failed to save category:', category.name, result.error);
            results.push({ success: false, category: category.name, error: result.error });
          }
        } catch (error) {
          console.error('❌ Error saving category:', category.name, error);
          results.push({ success: false, category: category.name, error: 'Network error' });
        }
      }
      
      // Check if all categories were saved successfully
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(`📊 Categories saved: ${successCount}/${categories.length} (${failCount} failed)`);
      
      if (successCount > 0) {
        return { success: true, message: `${successCount}/${categories.length} קטגוריות נשמרו בהצלחה` };
      } else {
        return { success: false, error: 'לא ניתן לשמור אף קטגוריה' };
      }
    } catch (error) {
      console.error('Error saving board categories:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }, []);

  const inviteMember = async (email: string | null, role: string, firstName?: string, lastName?: string) => {
    if (!selectedBoard) {
      return { success: false, error: 'No board selected' };
    }

    if (isGuestMode) {
      return { success: false, error: 'לא ניתן להזמין חברים במצב אורח' };
    }

    try {
      let inviteData: any = { role };
      
      if (email) {
        // Email-based invitation
        inviteData.email = email;
      } else if (firstName && lastName) {
        // Virtual member invitation
        inviteData.first_name = firstName;
        inviteData.last_name = lastName;
      } else {
        return { success: false, error: 'Either email or first_name and last_name are required' };
      }
      
      let result = await apiService.inviteMember(selectedBoard.id, inviteData);
      
      // Handle retry if token was refreshed
      if (!result.success && result.needsRetry) {
        console.log('🔄 BoardContext: Retrying inviteMember after token refresh');
        result = await apiService.inviteMember(selectedBoard.id, inviteData);
      }
      
      if (result.success) {
        // Refresh board members
        await refreshBoardMembers();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to invite member' };
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const removeMember = async (userId: string) => {
    if (!selectedBoard) {
      return { success: false, error: 'No board selected' };
    }

    if (isGuestMode) {
      return { success: false, error: 'לא ניתן להסיר חברים במצב אורח' };
    }

    try {
      let result = await apiService.removeMember(selectedBoard.id, userId);
      
      // Handle retry if token was refreshed
      if (!result.success && result.needsRetry) {
        console.log('🔄 BoardContext: Retrying removeMember after token refresh');
        result = await apiService.removeMember(selectedBoard.id, userId);
      }
      
      if (result.success) {
        // Refresh board members
        await refreshBoardMembers();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to remove member' };
      }
    } catch (error) {
      console.error('Error removing member:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const deleteBoard = async (boardId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated && !isGuestMode) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      if (isGuestMode) {
        const success = await localStorageService.deleteBoard(boardId);
        if (success) {
          // Check if the deleted board was the currently selected board
          if (selectedBoard && selectedBoard.id === boardId) {
            console.log('🗑️ BoardContext: Deleted board was the selected board, clearing selection');
            setSelectedBoard(null);
            setBoardMembers([]);
            setBoardExpenses([]);
          }
          
          await refreshBoards();
          return { success: true };
        } else {
          return { success: false, error: 'Failed to delete board' };
        }
      } else {
        const response = await apiService.deleteBoard(boardId);
        if (response.success) {
          // Check if the deleted board was the currently selected board
          if (selectedBoard && selectedBoard.id === boardId) {
            console.log('🗑️ BoardContext: Deleted board was the selected board, clearing selection');
            setSelectedBoard(null);
            setBoardMembers([]);
            setBoardExpenses([]);
          }
          
          await refreshBoards();
          return { success: true };
        } else {
          return { success: false, error: response.error || 'Failed to delete board' };
        }
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const refreshBoardData = async () => {
    console.log('🔄 BoardContext: Refreshing all board data...');
    try {
      await Promise.all([
        refreshBoards(),
        refreshBoardMembers(),
        refreshBoardExpenses()
      ]);
      console.log('✅ BoardContext: All board data refreshed successfully');
    } catch (error) {
      console.error('❌ BoardContext: Error refreshing board data:', error);
    }
  };

  const value: BoardContextType = {
    boards,
    selectedBoard,
    boardMembers,
    boardExpenses,
    isLoading,
    shouldOpenCategoryModal,
    selectBoard,
    updateSelectedBoard,
    createBoard,
    saveBoardCategories,
    refreshBoards,
    refreshBoardMembers,
    refreshBoardExpenses,
    refreshBoardData,
    inviteMember,
    removeMember,
    setDefaultBoard,
    clearDefaultBoard,
    deleteBoard,
    setShouldOpenCategoryModal,
  };

  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
}; 