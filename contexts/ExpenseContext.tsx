import { Debt } from '@/components/DebtCard';
import { Expense } from '@/components/ExpenseCard';
import { OnboardingConfig } from '@/components/OnboardingModal';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface QuickCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ExpenseContextType {
  // Onboarding
  isOnboardingComplete: boolean;
  onboardingConfig: OnboardingConfig | null;
  completeOnboarding: (config: OnboardingConfig, categories: string[], users: string[]) => void;
  
  // Expenses
  expenses: Expense[];
  recurringExpenses: Expense[];
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => void;
  updateExpense: (expenseId: string, updatedData: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => void;
  getCurrentMonthExpenses: () => Expense[];
  getTotalMonthlyExpenses: () => number;
  getRecurringExpensesTotal: () => number;
  getCurrentMonthAndYear: () => { month: string; year: number };
  
  // Month Navigation
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  
  // Debts
  debts: Debt[];
  users: string[];
  addDebt: (debtData: Omit<Debt, 'id' | 'date'>) => void;
  updateDebt: (debtId: string, updatedData: Partial<Debt>) => void;
  deleteDebt: (debtId: string) => void;
  markDebtAsPaid: (debtId: string) => void;
  getDebtsForUser: (userName: string) => Debt[];
  getDebtsOwedToMe: (userName: string) => Debt[];
  getDebtsIOwe: (userName: string) => Debt[];
  getTotalOwedToMe: (userName: string) => number;
  getTotalIOwe: (userName: string) => number;
  getNetBalance: (userName: string) => number;
  addUser: (userName: string) => void;
  removeUser: (userName: string) => void;
  getDebtsByExpenseId: (expenseId: string) => Debt[];
  getAllUsersFromDebts: () => string[];
  
  // Quick Categories
  quickCategories: QuickCategory[];
  addQuickCategory: (category: Omit<QuickCategory, 'id'>) => void;
  updateQuickCategory: (categoryId: string, updatedData: Partial<QuickCategory>) => void;
  deleteQuickCategory: (categoryId: string) => void;
  reorderQuickCategories: (fromIndex: number, toIndex: number) => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

// Default quick categories
const DEFAULT_QUICK_CATEGORIES: QuickCategory[] = [
  { id: '1', name: 'חשמל', icon: 'flash', color: '#FFD700' },
  { id: '2', name: 'מים', icon: 'water', color: '#00BFFF' },
  { id: '3', name: 'ארנונה', icon: 'home', color: '#32CD32' },
  { id: '4', name: 'סופר', icon: 'cart', color: '#FF6347' },
  { id: '5', name: 'אחר', icon: 'ellipsis-horizontal', color: '#9370DB' },
];

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [users, setUsers] = useState<string[]>(['אני']); // Start with just the current user
  const [quickCategories, setQuickCategories] = useState<QuickCategory[]>(DEFAULT_QUICK_CATEGORIES);
  
  // Add state for selected month/year
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Add onboarding state
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [onboardingConfig, setOnboardingConfig] = useState<OnboardingConfig | null>(null);

  // Add some mock data for previous months
  const [mockExpenses] = useState<Expense[]>([
    {
      id: 'mock_1',
      amount: 1200,
      category: 'חשמל',
      description: 'חשבון חשמל מאי',
      paidBy: 'אני',
      date: new Date(2025, 4, 15), // May 2025
      isRecurring: true,
      frequency: 'monthly',
      startDate: new Date(2025, 4, 15),
    },
    {
      id: 'mock_2',
      amount: 350,
      category: 'מים',
      description: 'חשבון מים מאי',
      paidBy: 'אני',
      date: new Date(2025, 4, 20), // May 2025
      isRecurring: true,
      frequency: 'monthly',
      startDate: new Date(2025, 4, 20),
    },
    {
      id: 'mock_3',
      amount: 800,
      category: 'סופר',
      description: 'קניות שבועיות',
      paidBy: 'אני',
      date: new Date(2025, 4, 10), // May 2025
      isRecurring: false,
    },
    {
      id: 'mock_4',
      amount: 1100,
      category: 'חשמל',
      description: 'חשבון חשמל אפריל',
      paidBy: 'אני',
      date: new Date(2025, 3, 15), // April 2025
      isRecurring: true,
      frequency: 'monthly',
      startDate: new Date(2025, 3, 15),
    },
    {
      id: 'mock_5',
      amount: 320,
      category: 'מים',
      description: 'חשבון מים אפריל',
      paidBy: 'אני',
      date: new Date(2025, 3, 20), // April 2025
      isRecurring: true,
      frequency: 'monthly',
      startDate: new Date(2025, 3, 20),
    },
    {
      id: 'mock_6',
      amount: 750,
      category: 'סופר',
      description: 'קניות שבועיות',
      paidBy: 'אני',
      date: new Date(2025, 3, 8), // April 2025
      isRecurring: false,
    },
  ]);

  // Function to create debts from expenses
  const createDebtsFromExpense = useCallback((expense: Expense) => {
    const otherUsers = users.filter(user => user !== expense.paidBy);
    
    if (otherUsers.length === 0) return;

    // Calculate amount per person (including the payer)
    const totalPeople = users.length;
    const amountPerPerson = expense.amount / totalPeople;
    
    // Create debts for each person who didn't pay
    const newDebts: Omit<Debt, 'id' | 'date'>[] = otherUsers.map(user => ({
      fromUser: user,
      toUser: expense.paidBy,
      amount: amountPerPerson,
      description: `${expense.category} - ${expense.description || 'הוצאה משותפת'}`,
      isPaid: false,
      expenseId: expense.id,
    }));

    return newDebts;
  }, [users]);

  // Function to add expense and create corresponding debts
  const addExpenseAndCreateDebts = useCallback((expense: Expense) => {
    const newDebts = createDebtsFromExpense(expense);
    if (newDebts) {
      const debtsWithIds = newDebts.map(debt => ({
        ...debt,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        date: new Date(),
      }));
      setDebts(prev => [...prev, ...debtsWithIds]);
    }
  }, [createDebtsFromExpense]);

  // Function to remove debts when expense is deleted
  const removeDebtsForExpense = useCallback((expenseId: string) => {
    setDebts(prev => prev.filter(debt => debt.expenseId !== expenseId));
  }, []);

  // Function to update debts when expense is updated
  const updateDebtsForExpense = useCallback((expense: Expense) => {
    // Remove old debts for this expense
    removeDebtsForExpense(expense.id);
    // Create new debts
    addExpenseAndCreateDebts(expense);
  }, [removeDebtsForExpense, addExpenseAndCreateDebts]);

  // Function to generate recurring expense instances for a given month
  const generateRecurringExpensesForMonth = useCallback((month: number, year: number) => {
    const generatedExpenses: Expense[] = [];
    
    recurringExpenses.forEach(recurringExpense => {
      if (!recurringExpense.startDate || !recurringExpense.frequency) return;
      
      const startDate = new Date(recurringExpense.startDate);
      const currentDate = new Date(year, month, 1); // First day of the month
      const endDate = new Date(year, month + 1, 0); // Last day of the month
      
      // Check if the recurring expense should generate instances for this month
      if (startDate > endDate) return; // Start date is in the future
      
      let currentInstanceDate = new Date(startDate);
      
      // Adjust to the first occurrence in or before this month
      while (currentInstanceDate <= endDate) {
        const instanceMonth = currentInstanceDate.getMonth();
        const instanceYear = currentInstanceDate.getFullYear();
        
        if (instanceMonth === month && instanceYear === year) {
          // Generate an instance for this month
          const expenseInstance: Expense = {
            ...recurringExpense,
            id: `${recurringExpense.id}_${instanceYear}_${String(instanceMonth + 1).padStart(2, '0')}`,
            date: new Date(currentInstanceDate),
            isRecurring: true, // This is a recurring expense instance
          };
          generatedExpenses.push(expenseInstance);
        }
        
        // Calculate next occurrence based on frequency
        switch (recurringExpense.frequency) {
          case 'daily':
            currentInstanceDate.setDate(currentInstanceDate.getDate() + 1);
            break;
          case 'weekly':
            currentInstanceDate.setDate(currentInstanceDate.getDate() + 7);
            break;
          case 'monthly':
            currentInstanceDate.setMonth(currentInstanceDate.getMonth() + 1);
            break;
        }
        
        // Safety check to prevent infinite loop
        if (currentInstanceDate > endDate) break;
      }
    });
    
    return generatedExpenses;
  }, [recurringExpenses]);

  // Expense functions
  const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      date: new Date(),
    };

    if (expenseData.isRecurring) {
      // Store as recurring template only
      setRecurringExpenses(prev => [...prev, newExpense]);
    } else {
      setExpenses(prev => [newExpense, ...prev]);
      // Create debts for the new expense
      addExpenseAndCreateDebts(newExpense);
    }
  }, [addExpenseAndCreateDebts]);

  const updateExpense = useCallback((expenseId: string, updatedData: Partial<Expense>) => {
    const updateExpenseInList = (expenseList: Expense[]) => 
      expenseList.map(expense => 
        expense.id === expenseId 
          ? { ...expense, ...updatedData }
          : expense
      );

    setExpenses(prev => updateExpenseInList(prev));
    setRecurringExpenses(prev => updateExpenseInList(prev));

    // Update debts for the modified expense
    const updatedExpense = {
      id: expenseId,
      ...updatedData,
    } as Expense;
    updateDebtsForExpense(updatedExpense);
  }, [updateDebtsForExpense]);

  const deleteExpense = useCallback((expenseId: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
    setRecurringExpenses(prev => prev.filter(expense => expense.id !== expenseId));
    
    // Remove debts for the deleted expense
    removeDebtsForExpense(expenseId);
  }, [removeDebtsForExpense]);

  const getCurrentMonthExpenses = useCallback(() => {
    // Combine real expenses with mock expenses
    const allExpenses = [...expenses, ...mockExpenses];

    // Get regular expenses for selected month
    const regularExpenses = allExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === selectedMonth && 
             expenseDate.getFullYear() === selectedYear;
    });

    // Generate recurring expense instances for selected month
    const recurringInstances = generateRecurringExpensesForMonth(selectedMonth, selectedYear);

    // Combine and sort by date (newest first)
    const allMonthExpenses = [...regularExpenses, ...recurringInstances];
    return allMonthExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, mockExpenses, selectedMonth, selectedYear, generateRecurringExpensesForMonth]);

  const getTotalMonthlyExpenses = useCallback(() => {
    const currentMonthExpenses = getCurrentMonthExpenses();
    return currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [getCurrentMonthExpenses]);

  const getRecurringExpensesTotal = useCallback(() => {
    return recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [recurringExpenses]);

  const getCurrentMonthAndYear = useCallback(() => {
    return {
      month: String(selectedMonth + 1).padStart(2, '0'),
      year: selectedYear,
    };
  }, [selectedMonth, selectedYear]);

  // Navigation functions
  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth(prev => {
      if (prev === 0) {
        setSelectedYear(year => year - 1);
        return 11; // December
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prev => {
      if (prev === 11) {
        setSelectedYear(year => year + 1);
        return 0; // January
      }
      return prev + 1;
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  }, []);

  // Debt functions
  const addDebt = useCallback((debtData: Omit<Debt, 'id' | 'date'>) => {
    const newDebt: Debt = {
      ...debtData,
      id: Date.now().toString(),
      date: new Date(),
    };

    // Add users to the users list if they're new
    if (!users.includes(debtData.fromUser)) {
      setUsers(prev => [...prev, debtData.fromUser]);
    }
    if (!users.includes(debtData.toUser)) {
      setUsers(prev => [...prev, debtData.toUser]);
    }

    setDebts(prev => [newDebt, ...prev]);
  }, [users]);

  const updateDebt = useCallback((debtId: string, updatedData: Partial<Debt>) => {
    setDebts(prev => 
      prev.map(debt => 
        debt.id === debtId 
          ? { ...debt, ...updatedData }
          : debt
      )
    );
  }, []);

  const deleteDebt = useCallback((debtId: string) => {
    setDebts(prev => prev.filter(debt => debt.id !== debtId));
  }, []);

  const markDebtAsPaid = useCallback((debtId: string) => {
    updateDebt(debtId, { isPaid: true });
  }, [updateDebt]);

  const getDebtsForUser = useCallback((userName: string) => {
    return debts.filter(debt => 
      debt.fromUser === userName || debt.toUser === userName
    );
  }, [debts]);

  const getDebtsOwedToMe = useCallback((userName: string) => {
    return debts.filter(debt => 
      debt.toUser === userName && !debt.isPaid
    );
  }, [debts]);

  const getDebtsIOwe = useCallback((userName: string) => {
    return debts.filter(debt => 
      debt.fromUser === userName && !debt.isPaid
    );
  }, [debts]);

  const getTotalOwedToMe = useCallback((userName: string) => {
    return getDebtsOwedToMe(userName).reduce((sum, debt) => sum + debt.amount, 0);
  }, [getDebtsOwedToMe]);

  const getTotalIOwe = useCallback((userName: string) => {
    return getDebtsIOwe(userName).reduce((sum, debt) => sum + debt.amount, 0);
  }, [getDebtsIOwe]);

  const getNetBalance = useCallback((userName: string) => {
    return getTotalOwedToMe(userName) - getTotalIOwe(userName);
  }, [getTotalOwedToMe, getTotalIOwe]);

  const addUser = useCallback((userName: string) => {
    const trimmedName = userName.trim();
    
    // Validate input
    if (!trimmedName) {
      return;
    }
    
    // Check for duplicates
    if (users.includes(trimmedName)) {
      return;
    }
    
    // Add the new user
    setUsers(prev => [...prev, trimmedName]);
  }, [users]);

  const removeUser = useCallback((userName: string) => {
    if (userName === 'אני') {
      return; // Don't allow removing the main user
    }
    
    // Remove the user from the users list
    setUsers(prev => prev.filter(user => user !== userName));
    
    // Remove all debts involving this user
    setDebts(prev => prev.filter(debt => 
      debt.fromUser !== userName && debt.toUser !== userName
    ));
    
    // Update expenses to change the payer if it was the removed user
    const updateExpensePayer = (expenseList: Expense[]) => 
      expenseList.map(expense => 
        expense.paidBy === userName 
          ? { ...expense, paidBy: 'אני' } // Change to main user
          : expense
      );
    
    setExpenses(prev => updateExpensePayer(prev));
    setRecurringExpenses(prev => updateExpensePayer(prev));
  }, []);

  const getDebtsByExpenseId = useCallback((expenseId: string) => {
    return debts.filter(debt => debt.expenseId === expenseId);
  }, [debts]);

  const getAllUsersFromDebts = useCallback(() => {
    const allUsers = new Set<string>();
    debts.forEach(debt => {
      allUsers.add(debt.fromUser);
      allUsers.add(debt.toUser);
    });
    return Array.from(allUsers);
  }, [debts]);

  // Quick Categories functions
  const addQuickCategory = useCallback((category: Omit<QuickCategory, 'id'>) => {
    const newCategory: QuickCategory = {
      id: Date.now().toString(),
      ...category,
    };
    setQuickCategories(prev => [...prev, newCategory]);
  }, []);

  const updateQuickCategory = useCallback((categoryId: string, updatedData: Partial<QuickCategory>) => {
    setQuickCategories(prev => 
      prev.map(category => 
        category.id === categoryId 
          ? { ...category, ...updatedData }
          : category
      )
    );
  }, []);

  const deleteQuickCategory = useCallback((categoryId: string) => {
    setQuickCategories(prev => prev.filter(category => category.id !== categoryId));
  }, []);

  const reorderQuickCategories = useCallback((fromIndex: number, toIndex: number) => {
    setQuickCategories(prev => {
      const newCategories = [...prev];
      const [movedCategory] = newCategories.splice(fromIndex, 1);
      newCategories.splice(toIndex, 0, movedCategory);
      return newCategories;
    });
  }, []);

  // Onboarding function
  const completeOnboarding = useCallback((config: OnboardingConfig, categories: string[], usersList: string[]) => {
    // Update users
    setUsers(usersList);
    
    // Update quick categories based on the selected type
    const categoryColors = ['#FFD700', '#00BFFF', '#32CD32', '#FF6347', '#9370DB', '#FF69B4', '#20B2AA'];
    const categoryIcons = ['flash', 'water', 'home', 'cart', 'ellipsis-horizontal', 'star', 'heart'];
    
    const newQuickCategories: QuickCategory[] = categories.map((category, index) => ({
      id: (index + 1).toString(),
      name: category,
      icon: categoryIcons[index % categoryIcons.length],
      color: categoryColors[index % categoryColors.length],
    }));
    
    setQuickCategories(newQuickCategories);
    setOnboardingConfig(config);
    setIsOnboardingComplete(true);
  }, []);

  const value: ExpenseContextType = {
    // Onboarding
    isOnboardingComplete,
    onboardingConfig,
    completeOnboarding,
    
    // Expenses
    expenses,
    recurringExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getCurrentMonthExpenses,
    getTotalMonthlyExpenses,
    getRecurringExpensesTotal,
    getCurrentMonthAndYear,
    
    // Month Navigation
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    
    // Debts
    debts,
    users,
    addDebt,
    updateDebt,
    deleteDebt,
    markDebtAsPaid,
    getDebtsForUser,
    getDebtsOwedToMe,
    getDebtsIOwe,
    getTotalOwedToMe,
    getTotalIOwe,
    getNetBalance,
    addUser,
    removeUser,
    getDebtsByExpenseId,
    getAllUsersFromDebts,
    
    // Quick Categories
    quickCategories,
    addQuickCategory,
    updateQuickCategory,
    deleteQuickCategory,
    reorderQuickCategories,
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
}

export function useDebts() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useDebts must be used within an ExpenseProvider');
  }
  return context;
} 