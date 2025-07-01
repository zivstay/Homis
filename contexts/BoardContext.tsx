import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiService, Board, BoardMember } from '../services/api';
import { useAuth } from './AuthContext';

interface BoardContextType {
  boards: Board[];
  selectedBoard: Board | null;
  boardMembers: BoardMember[];
  isLoading: boolean;
  selectBoard: (board: Board) => void;
  createBoard: (boardData: {
    name: string;
    description?: string;
    currency?: string;
    timezone?: string;
    board_type?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  refreshBoards: () => Promise<void>;
  refreshBoardMembers: () => Promise<void>;
  inviteMember: (email: string, role: string) => Promise<{ success: boolean; error?: string }>;
  removeMember: (userId: string) => Promise<{ success: boolean; error?: string }>;
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
  const { isAuthenticated } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isRefreshingBoards = useRef(false);
  const isRefreshingMembers = useRef(false);
  const selectedBoardRef = useRef<Board | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedBoardRef.current = selectedBoard;
  }, [selectedBoard]);

  const refreshBoards = useCallback(async () => {
    if (isRefreshingBoards.current) {
      console.log('🏠 BoardContext: Already refreshing boards, skipping...');
      return;
    }
    
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    try {
      isRefreshingBoards.current = true;
      setIsLoading(true);
      console.log('🏠 BoardContext: Fetching boards...');
      const result = await apiService.getBoards();
      if (result.success && result.data) {
        console.log('🏠 BoardContext: Boards loaded:', result.data.boards.length, 'boards');
        setBoards(result.data.boards);
        
        // Auto-select first board if no board is selected
        if (result.data.boards.length > 0 && !selectedBoardRef.current) {
          console.log('🏠 BoardContext: Auto-selecting first board:', result.data.boards[0].name);
          setSelectedBoard(result.data.boards[0]);
        } else if (result.data.boards.length === 0) {
          console.log('🏠 BoardContext: No boards found, user needs to create one');
        }
      } else {
        console.log('🏠 BoardContext: Failed to load boards:', result.error);
      }
    } catch (error) {
      console.error('🏠 BoardContext: Error refreshing boards:', error);
    } finally {
      setIsLoading(false);
      isRefreshingBoards.current = false;
    }
  }, []); // Remove selectedBoard dependency

  const refreshBoardMembers = useCallback(async () => {
    if (!selectedBoard || isRefreshingMembers.current) {
      return;
    }

    try {
      isRefreshingMembers.current = true;
      const result = await apiService.getBoardMembers(selectedBoard.id);
      if (result.success && result.data) {
        setBoardMembers(result.data.members);
      }
    } catch (error) {
      console.error('Error refreshing board members:', error);
    } finally {
      isRefreshingMembers.current = false;
    }
  }, [selectedBoard]);

  // Effect for authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🏠 BoardContext: User authenticated, refreshing boards');
      // Add a small delay to prevent rapid successive calls
      refreshTimeoutRef.current = setTimeout(() => {
        refreshBoards();
      }, 100);
    } else {
      console.log('🏠 BoardContext: User not authenticated, clearing boards');
      setBoards([]);
      setSelectedBoard(null);
      setBoardMembers([]);
    }
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated]); // Remove refreshBoards from dependencies

  // Effect for board selection changes
  useEffect(() => {
    if (selectedBoard) {
      console.log('🏠 BoardContext: Board selected, refreshing members:', selectedBoard.name);
      refreshBoardMembers();
    } else {
      console.log('🏠 BoardContext: No board selected, clearing members');
      setBoardMembers([]);
    }
  }, [selectedBoard]); // Remove refreshBoardMembers from dependencies

  const selectBoard = (board: Board) => {
    setSelectedBoard(board);
  };

  const createBoard = async (boardData: {
    name: string;
    description?: string;
    currency?: string;
    timezone?: string;
    board_type?: string;
  }) => {
    try {
      setIsLoading(true);
      const result = await apiService.createBoard(boardData);
      
      if (result.success && result.data) {
        // Add new board to the list
        setBoards(prev => [...prev, result.data!]);
        
        // Auto-select the new board
        setSelectedBoard(result.data);
        
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to create board' };
      }
    } catch (error) {
      console.error('Error creating board:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const inviteMember = async (email: string, role: string) => {
    if (!selectedBoard) {
      return { success: false, error: 'No board selected' };
    }

    try {
      const result = await apiService.inviteMember(selectedBoard.id, { email, role });
      
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

    try {
      const result = await apiService.removeMember(selectedBoard.id, userId);
      
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

  const value: BoardContextType = {
    boards,
    selectedBoard,
    boardMembers,
    isLoading,
    selectBoard,
    createBoard,
    refreshBoards,
    refreshBoardMembers,
    inviteMember,
    removeMember,
  };

  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
}; 