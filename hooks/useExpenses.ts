import { Expense } from '@/components/ExpenseCard';
import { useCallback, useEffect, useState } from 'react';
import { useDebts } from './useDebts';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<Expense[]>([]);
  
  // Get debt management functions
  const { 
    addExpenseAndCreateDebts, 
    removeDebtsForExpense, 
    updateDebtsForExpense 
  } = useDebts();

  // Load initial data (in a real app, this would come from storage/database)
  useEffect(() => {
    // Mock initial data
    const mockExpenses: Expense[] = [
      {
        id: '1',
        amount: 450,
        category: 'חשמל',
        description: 'חשבון חשמל חודש ינואר',
        paidBy: 'אני',
        date: new Date('2024-01-15'),
        isRecurring: false,
      },
      {
        id: '2',
        amount: 120,
        category: 'מים',
        description: 'חשבון מים',
        paidBy: 'דני',
        date: new Date('2024-01-10'),
        isRecurring: false,
      },
      {
        id: '3',
        amount: 800,
        category: 'ארנונה',
        description: 'ארנונה חודש ינואר',
        paidBy: 'שרה',
        date: new Date('2024-01-05'),
        isRecurring: false,
      },
    ];

    const mockRecurringExpenses: Expense[] = [
      {
        id: 'r1',
        amount: 450,
        category: 'חשמל',
        description: 'חשבון חשמל חודשי',
        paidBy: 'אני',
        date: new Date(),
        isRecurring: true,
      },
      {
        id: 'r2',
        amount: 120,
        category: 'מים',
        description: 'חשבון מים חודשי',
        paidBy: 'אני',
        date: new Date(),
        isRecurring: true,
      },
    ];

    setExpenses(mockExpenses);
    setRecurringExpenses(mockRecurringExpenses);

    // Create debts for initial expenses
    mockExpenses.forEach(expense => {
      addExpenseAndCreateDebts(expense);
    });
  }, [addExpenseAndCreateDebts]);

  const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      date: new Date(),
    };

    if (expenseData.isRecurring) {
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
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
  }, [expenses]);

  const getTotalMonthlyExpenses = useCallback(() => {
    const currentMonthExpenses = getCurrentMonthExpenses();
    return currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [getCurrentMonthExpenses]);

  const getRecurringExpensesTotal = useCallback(() => {
    return recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [recurringExpenses]);

  const getCurrentMonthAndYear = useCallback(() => {
    const now = new Date();
    return {
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: now.getFullYear(),
    };
  }, []);

  return {
    expenses,
    recurringExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getCurrentMonthExpenses,
    getTotalMonthlyExpenses,
    getRecurringExpensesTotal,
    getCurrentMonthAndYear,
  };
} 