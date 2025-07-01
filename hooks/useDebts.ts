import { Debt } from '@/components/DebtCard';
import { Expense } from '@/components/ExpenseCard';
import { useCallback, useState } from 'react';

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [users, setUsers] = useState<string[]>(['אני', 'דני', 'שרה', 'יוסי']);

  // Function to create debts from expenses
  const createDebtsFromExpense = useCallback((expense: Expense) => {
    const currentUser = 'אני';
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

  const addDebt = useCallback((debtData: Omit<Debt, 'id' | 'date'>) => {
    const newDebt: Debt = {
      ...debtData,
      id: Date.now().toString(),
      date: new Date(),
    };

    setDebts(prev => [newDebt, ...prev]);
  }, []);

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
    if (!users.includes(userName)) {
      setUsers(prev => [...prev, userName]);
    }
  }, [users]);

  const removeUser = useCallback((userName: string) => {
    setUsers(prev => prev.filter(user => user !== userName));
  }, []);

  // Get debts by expense ID
  const getDebtsByExpenseId = useCallback((expenseId: string) => {
    return debts.filter(debt => debt.expenseId === expenseId);
  }, [debts]);

  // Get all unique users from debts
  const getAllUsersFromDebts = useCallback(() => {
    const allUsers = new Set<string>();
    debts.forEach(debt => {
      allUsers.add(debt.fromUser);
      allUsers.add(debt.toUser);
    });
    return Array.from(allUsers);
  }, [debts]);

  return {
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
    addExpenseAndCreateDebts,
    removeDebtsForExpense,
    updateDebtsForExpense,
    getDebtsByExpenseId,
    getAllUsersFromDebts,
  };
} 