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
      { name: 'תחזוקה', icon: '🔧', color: '#FF8C00' },
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
      { name: 'ספורט', icon: '🏃', color: '#96CEB4' },
      { name: 'תחבורה', icon: '🚌', color: '#98D8C8' },
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
  const categoriesMap = new Map<string, QuickCategory>();
  
  BOARD_TYPES.forEach(boardType => {
    boardType.quickCategories.forEach(category => {
      if (!categoriesMap.has(category.name)) {
        categoriesMap.set(category.name, category);
      }
    });
  });
  
  return Array.from(categoriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const getBoardTypeDisplayName = (id: string): string => {
  const boardType = getBoardTypeById(id);
  return boardType ? boardType.name : 'כללי';
}; 