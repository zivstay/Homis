export interface BoardType {
  id: string;
  name: string;
  description: string;
  icon: string;
  quickCategories: QuickCategory[];
}

export interface QuickCategory {
  name: string;
  icon: string;
  color: string;
  id?: string;
  imageUrl?: string; // Optional image URL for custom categories
}

export interface WorkItem {
  id: string;
  category: string;
  price: number;
  description?: string;
  hours?: number;
}

export interface WorkExpenseData {
  workItems: WorkItem[];
  clientName: string;
  location: string;
  totalAmount: number;
  workDate: string;
  description?: string;
  image_url?: string;
}

export const BOARD_TYPES: BoardType[] = [
  {
    id: 'travel',
    name: 'נסיעה',
    description: 'לוח לניהול הוצאות נסיעה וטיולים',
    icon: '✈️',
    quickCategories: [
      { name: 'דלק', icon: '⛽', color: '#FF6B6B' },
      { name: 'חניה', icon: '🅿️', color: '#4ECDC4' },
      { name: 'אוכל', icon: '🍽️', color: '#45B7D1' },
      { name: 'לינה', icon: '🏨', color: '#96CEB4' },
      { name: 'אטרקציות', icon: '🎡', color: '#FFEAA7' },
      { name: 'קניות', icon: '🛍️', color: '#DDA0DD' },
      { name: 'תחבורה', icon: '🚌', color: '#98D8C8' },
      { name: 'אחר', icon: '📋', color: '#95A5A6' },
    ]
  },
  {
    id: 'roommates',
    name: 'שותפים',
    description: 'לוח לניהול הוצאות משותפות עם שותפים',
    icon: '🏠',
    quickCategories: [
      { name: 'חשמל', icon: '⚡', color: '#FFD700' },
      { name: 'מים', icon: '💧', color: '#00BFFF' },
      { name: 'ארנונה', icon: '🏘️', color: '#32CD32' },
      { name: 'גז', icon: '🔥', color: '#FF6347' },
      { name: 'אינטרנט', icon: '🌐', color: '#9370DB' },
      { name: 'שכר דירה', icon: '🏠', color: '#FF8C00' },
      { name: 'קניות בית', icon: '🛒', color: '#FF69B4' },
      { name: 'אחר', icon: '📋', color: '#95A5A6' },
    ]
  },
  {
    id: 'personal',
    name: 'אישי',
    description: 'לוח לניהול הוצאות אישיות',
    icon: '👤',
    quickCategories: [
      { name: 'אוכל', icon: '🍽️', color: '#45B7D1' },
      { name: 'קניות', icon: '🛍️', color: '#DDA0DD' },
      { name: 'בילויים', icon: '🎉', color: '#FF69B4' },
      { name: 'תחבורה', icon: '🚌', color: '#98D8C8' },
      { name: 'בריאות', icon: '🏥', color: '#FF6B6B' },
      { name: 'חינוך', icon: '📚', color: '#4ECDC4' },
      { name: 'ספורט', icon: '🏃', color: '#96CEB4' },
      { name: 'אחר', icon: '📋', color: '#95A5A6' },
    ]
  },
  {
    id: 'business',
    name: 'עסקי',
    description: 'לוח לניהול הוצאות עסקיות',
    icon: '💼',
    quickCategories: [
      { name: 'ציוד', icon: '💻', color: '#4ECDC4' },
      { name: 'שיווק', icon: '📢', color: '#FF6B6B' },
      { name: 'נסיעות', icon: '✈️', color: '#45B7D1' },
      { name: 'אוכל', icon: '🍽️', color: '#96CEB4' },
      { name: 'תחזוקה', icon: '🔧', color: '#FF8C00' },
      { name: 'ביטוח', icon: '🛡️', color: '#F7DC6F' },
      { name: 'חשבונאות', icon: '📊', color: '#9370DB' },
      { name: 'אחר', icon: '📋', color: '#95A5A6' },
    ]
  },
  {
    id: 'family',
    name: 'משפחה',
    description: 'לוח לניהול הוצאות משפחתיות',
    icon: '👨‍👩‍👧‍👦',
    quickCategories: [
      { name: 'אוכל', icon: '🍽️', color: '#45B7D1' },
      { name: 'חינוך', icon: '📚', color: '#4ECDC4' },
      { name: 'בריאות', icon: '🏥', color: '#FF6B6B' },
      { name: 'בילויים', icon: '🎉', color: '#FF69B4' },
      { name: 'קניות', icon: '🛍️', color: '#DDA0DD' },
      { name: 'משכנתא', icon: '🏦', color: '#96CEB4' },
      { name: 'תחבורה', icon: '🚌', color: '#98D8C8' },
      { name: 'אחר', icon: '📋', color: '#95A5A6' },
    ]
  },
  {
    id: 'work_management',
    name: 'ניהול עבודה',
    description: 'לוח כללי לניהול יומן עבודה, שעות עבודה, משימות ועבודות שבוצעו',
    icon: '🔧',
    quickCategories: [
      { name: 'התקנת גוף תאורה', icon: '💡', color: '#FFD700' },
      { name: 'צביעה', icon: '🎨', color: '#FF6B6B' },
      { name: 'תיקון צנרת', icon: '🔧', color: '#4ECDC4' },
      { name: 'עבודות חשמל', icon: '⚡', color: '#FF8C00' },
      { name: 'תיקון רצפה', icon: '🏠', color: '#96CEB4' },
      { name: 'הרכבת רהיטים', icon: '🪑', color: '#DDA0DD' },
      { name: 'ניקיון', icon: '🧹', color: '#98D8C8' },
      { name: 'אחר', icon: '📋', color: '#95A5A6' },
    ]
  },
  {
    id: 'general',
    name: 'כללי',
    description: 'לוח כללי לניהול הוצאות',
    icon: '📊',
    quickCategories: [
      { name: 'אוכל', icon: '🍽️', color: '#45B7D1' },
      { name: 'קניות', icon: '🛍️', color: '#DDA0DD' },
      { name: 'תחבורה', icon: '🚌', color: '#98D8C8' },
      { name: 'בילויים', icon: '🎉', color: '#FF69B4' },
      { name: 'בריאות', icon: '🏥', color: '#FF6B6B' },
      { name: 'חינוך', icon: '📚', color: '#4ECDC4' },
      { name: 'תחזוקה', icon: '🔧', color: '#FF8C00' },
      { name: 'אחר', icon: '📋', color: '#95A5A6' },
    ]
  }
];

export const getBoardTypeById = (id: string): BoardType | undefined => {
  return BOARD_TYPES.find(type => type.id === id);
};

// Get all unique categories from all board types
export const getAllAvailableCategories = (): QuickCategory[] => {
  const allCategories: QuickCategory[] = [];
  const addedNames = new Set<string>();
  
  BOARD_TYPES.forEach(boardType => {
    boardType.quickCategories.forEach(category => {
      if (!addedNames.has(category.name)) {
        allCategories.push(category);
        addedNames.add(category.name);
      }
    });
  });
  
  return allCategories.sort((a, b) => a.name.localeCompare(b.name));
};

export const getBoardTypeDisplayName = (id: string): string => {
  const boardType = getBoardTypeById(id);
  return boardType ? boardType.name : 'כללי';
}; 