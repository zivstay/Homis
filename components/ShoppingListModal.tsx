import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { widgetService } from '../services/widgetService';

interface ShoppingList {
  id: string;
  board_id: string;
  name: string;
  description?: string;
  date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  all_items_completed?: boolean;
}

interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  item_name: string;
  description?: string;
  is_completed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completed_by?: string;
}

interface QuickItem {
  id: string;
  board_id: string;
  item_name: string;
  icon?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Available icons for grocery items
const GROCERY_ICONS = [
  '🥛', '🍞', '🥚', '🧀', '🧈', '🥓', '🍗', '🥩', '🍖', '🐟',
  '🍤', '🥦', '🥬', '🥒', '🍅', '🥕', '🌽', '🥔', '🧅', '🧄',
  '🍋', '🍊', '🍎', '🍌', '🍇', '🍓', '🍑', '🥝', '🥥', '🥑',
  '🍚', '🍝', '🍕', '🍟', '🥖', '🥐', '🥨', '🥯', '🧁', '🍰',
  '🍫', '🍬', '🍭', '🍪', '🍩', '☕', '🍵', '🧃', '🥤', '🍷',
  '🍺', '🧊', '🥫', '🍯', '🫒', '🧂', '🥜', '🍿', '🥗', '🍲'
];

// Default quick items - basic grocery items that are commonly purchased
const DEFAULT_QUICK_ITEMS = [
  { name: 'חלב', icon: '🥛' },
  { name: 'לחם', icon: '🍞' },
  { name: 'ביצים', icon: '🥚' },
  { name: 'גבינה', icon: '🧀' },
  { name: 'עגבניות', icon: '🍅' },
  { name: 'מלפפון', icon: '🥒' },
  { name: 'בננות', icon: '🍌' },
  { name: 'תפוחים', icon: '🍎' },
  { name: 'יוגורט', icon: '🥛' },
  { name: 'מים', icon: '🥤' },
];

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  boardId: string;
  isAdmin: boolean;
}

const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  visible,
  onClose,
  boardId,
  isAdmin,
}) => {
  const navigation = useNavigation();
  const { isGuestMode } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickItemsConfig, setShowQuickItemsConfig] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [editingQuickItems, setEditingQuickItems] = useState<Array<{name: string, icon?: string}>>([]);
  const [quickItemsSearchQuery, setQuickItemsSearchQuery] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListDate, setNewListDate] = useState('');
  const [showMoveItemModal, setShowMoveItemModal] = useState(false);
  const [movingItem, setMovingItem] = useState<ShoppingListItem | null>(null);
  const [newListNameForMove, setNewListNameForMove] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showMoveSelectedModal, setShowMoveSelectedModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [editingQuantityItem, setEditingQuantityItem] = useState<ShoppingListItem | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [editItemName, setEditItemName] = useState('');

  useEffect(() => {
    if (visible && boardId) {
      loadShoppingLists();
      loadQuickItems();
    }
  }, [visible, boardId]);

  useEffect(() => {
    if (selectedList) {
      loadListItems(selectedList.id);
    }
  }, [selectedList]);

  const loadShoppingLists = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
        
        // Auto-select first list if exists and no list selected
        if (data.lists && data.lists.length > 0 && !selectedList) {
          setSelectedList(data.lists[0]);
        }
      } else {
        if (showLoading) {
          Alert.alert('שגיאה', 'שגיאה בטעינת רשימות קניות');
        }
      }
    } catch (error) {
      console.error('Error loading shopping lists:', error);
      if (showLoading) {
        Alert.alert('שגיאה', 'שגיאה בטעינת רשימות קניות');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const loadListItems = async (listId: string) => {
    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${listId}/items`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading list items:', error);
    }
  };

  const loadQuickItems = async () => {
    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-list/quick-items`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuickItems(data.quick_items || []);
      }
    } catch (error) {
      console.error('Error loading quick items:', error);
    }
  };

  const createList = async () => {
    if (!newListName.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם לרשימה');
      return;
    }

    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newListName.trim(),
            description: newListDescription.trim() || null,
            date: newListDate || null,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLists([data.list, ...lists]);
        setSelectedList(data.list);
        setShowCreateListModal(false);
        setNewListName('');
        setNewListDescription('');
        setNewListDate('');
      } else {
        Alert.alert('שגיאה', 'שגיאה ביצירת רשימה');
      }
    } catch (error) {
      console.error('Error creating list:', error);
      Alert.alert('שגיאה', 'שגיאה ביצירת רשימה');
    }
  };

  const deleteList = async (listId: string) => {
    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${listId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setLists(lists.filter(l => l.id !== listId));
        if (selectedList?.id === listId) {
          setSelectedList(lists.find(l => l.id !== listId) || null);
        }
      } else {
        Alert.alert('שגיאה', 'שגיאה במחיקת רשימה');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      Alert.alert('שגיאה', 'שגיאה במחיקת רשימה');
    }
  };

  const handleDeleteList = (list: ShoppingList) => {
    Alert.alert(
      'מחיקת רשימה',
      `האם אתה בטוח שברצונך למחוק את "${list.name}"? כל הפריטים ברשימה יימחקו.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteList(list.id),
        },
      ]
    );
  };

  const addItem = async (itemName: string) => {
    if (!selectedList || !itemName.trim()) {
      return;
    }

    const trimmedName = itemName.trim();
    
    // Check if item with same name (or with multiplier) already exists
    const baseNamePattern = new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( X\\d+)?$`);
    const existingItems = items.filter(item => !item.is_completed && baseNamePattern.test(item.item_name));
    
    let finalItemName = trimmedName;
    let itemToDelete: ShoppingListItem | null = null;
    
    if (existingItems.length > 0) {
      // Find the highest multiplier
      let maxMultiplier = 1;
      existingItems.forEach(item => {
        const match = item.item_name.match(/ X(\d+)$/);
        if (match) {
          maxMultiplier = Math.max(maxMultiplier, parseInt(match[1]));
        }
      });
      
      // New multiplier
      const newMultiplier = maxMultiplier + 1;
      finalItemName = `${trimmedName} X${newMultiplier}`;
      
      // Mark the last item for deletion (we'll replace it with the new one)
      itemToDelete = existingItems[existingItems.length - 1];
    }

    // Optimistic update - add new item immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: ShoppingListItem = {
      id: tempId,
      shopping_list_id: selectedList.id,
      item_name: finalItemName,
      is_completed: false,
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update UI immediately - remove old item if exists and add new one
    setItems(prevItems => {
      let newItems = [...prevItems];
      if (itemToDelete) {
        newItems = newItems.filter(i => i.id !== itemToDelete.id);
      }
      return [optimisticItem, ...newItems];
    });
    
    setNewItemName('');
    hideAutocomplete();

    try {
      const token = apiService.getAccessToken();
      
      // Delete old item if exists
      if (itemToDelete) {
        await fetch(
          `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items/${itemToDelete.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }
      
      // Add new item with updated name
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_name: finalItemName,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Replace optimistic item with real one from server
        setItems(prevItems => prevItems.map(i => i.id === tempId ? data.item : i));
        // Refresh lists to update completion status (in background)
        loadShoppingLists(false);
      } else {
        // Revert optimistic update on failure
        setItems(prevItems => {
          let newItems = prevItems.filter(i => i.id !== tempId);
          if (itemToDelete) {
            // Restore deleted item
            newItems = [itemToDelete, ...newItems];
          }
          return newItems;
        });
        Alert.alert('שגיאה', 'שגיאה בהוספת פריט');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      // Revert optimistic update on failure
      setItems(prevItems => {
        let newItems = prevItems.filter(i => i.id !== tempId);
        if (itemToDelete) {
          // Restore deleted item
          newItems = [itemToDelete, ...newItems];
        }
        return newItems;
      });
      Alert.alert('שגיאה', 'שגיאה בהוספת פריט');
    }
  };

  const toggleItemCompletion = async (item: ShoppingListItem) => {
    if (!selectedList) return;

    // Optimistic update - update UI immediately
    const updatedItem = { ...item, is_completed: !item.is_completed };
    setItems(prevItems => prevItems.map(i => i.id === item.id ? updatedItem : i));

    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items/${item.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_completed: !item.is_completed,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(prevItems => prevItems.map(i => i.id === item.id ? data.item : i));
        // Refresh lists to update completion status (in background)
        loadShoppingLists(false);
        
        // Update widget with new data
        if (selectedList) {
          const updatedItems = items.map(i => i.id === item.id ? data.item : i);
          const widgetData = widgetService.convertToWidgetData(selectedList, updatedItems);
          await widgetService.updateShoppingListWidget(widgetData);
        }
      } else {
        // Revert optimistic update on failure
        setItems(prevItems => prevItems.map(i => i.id === item.id ? item : i));
        Alert.alert('שגיאה', 'שגיאה בעדכון פריט');
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      // Revert optimistic update on failure
      setItems(prevItems => prevItems.map(i => i.id === item.id ? item : i));
      Alert.alert('שגיאה', 'שגיאה בעדכון פריט');
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!selectedList) return;

    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setItems(items.filter(i => i.id !== itemId));
        // Refresh lists to update completion status (in background)
        loadShoppingLists(false);
      } else {
        Alert.alert('שגיאה', 'שגיאה במחיקת פריט');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('שגיאה', 'שגיאה במחיקת פריט');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'מחיקת פריט',
      'האם אתה בטוח שברצונך למחוק פריט זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => deleteItem(itemId),
        },
      ]
    );
  };

  const updateItemMultiplier = async (item: ShoppingListItem, newMultiplier: number) => {
    if (!selectedList) return;

    // If multiplier is 0 or less, delete the item
    if (newMultiplier <= 0) {
      await deleteItem(item.id);
      return;
    }

    // Extract base name (without multiplier)
    const multiplierMatch = item.item_name.match(/^(.+) X\d+$/);
    const baseName = multiplierMatch ? multiplierMatch[1] : item.item_name;
    
    // Create new name
    const newItemName = newMultiplier > 1 ? `${baseName} X${newMultiplier}` : baseName;

    // Optimistic update
    const updatedItem = { ...item, item_name: newItemName };
    setItems(prevItems => prevItems.map(i => i.id === item.id ? updatedItem : i));

    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items/${item.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_name: newItemName,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(prevItems => prevItems.map(i => i.id === item.id ? data.item : i));
        // Refresh lists to update completion status (in background)
        loadShoppingLists(false);
      } else {
        // Revert optimistic update on failure
        setItems(prevItems => prevItems.map(i => i.id === item.id ? item : i));
        Alert.alert('שגיאה', 'שגיאה בעדכון פריט');
      }
    } catch (error) {
      console.error('Error updating item multiplier:', error);
      // Revert optimistic update on failure
      setItems(prevItems => prevItems.map(i => i.id === item.id ? item : i));
      Alert.alert('שגיאה', 'שגיאה בעדכון פריט');
    }
  };

  const handleAddExpenseFromList = () => {
    if (!selectedList) return;
    
    // Close the modal first
    onClose();
    
    // Navigate to AddExpense screen with pre-filled description and category
    setTimeout(() => {
      (navigation as any).navigate('AddExpense', {
        prefilledDescription: `רשימת קניות - ${selectedList.name}`,
        preselectedCategory: 'קניות בית',
      });
    }, 300);
  };

  const openQuickItemsConfig = () => {
    // Always start with default items
    const defaultItems = DEFAULT_QUICK_ITEMS.map(item => ({ ...item }));
    
    // Get existing custom items (those not in defaults)
    const defaultItemNames = new Set(DEFAULT_QUICK_ITEMS.map(item => item.name));
    const customItems = quickItems
      .filter(qi => !defaultItemNames.has(qi.item_name))
      .map(qi => ({ name: qi.item_name, icon: qi.icon }));
    
    // Merge: defaults first, then custom items
    const itemsData = [...defaultItems, ...customItems];
    
    setEditingQuickItems(itemsData);
    setQuickItemsSearchQuery('');
    setShowQuickItemsConfig(true);
  };

  const addNewQuickItemSlot = () => {
    setEditingQuickItems([...editingQuickItems, { name: '', icon: undefined }]);
  };

  const saveQuickItems = async () => {
    try {
      const token = apiService.getAccessToken();
      
      const filteredItems = editingQuickItems.filter(item => item.name.trim() !== '');
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-list/quick-items`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quick_items: filteredItems,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuickItems(data.quick_items || []);
        setShowQuickItemsConfig(false);
        Alert.alert('הצלחה', 'פריטים מהירים עודכנו בהצלחה');
      } else {
        Alert.alert('שגיאה', 'שגיאה בעדכון פריטים מהירים');
      }
    } catch (error) {
      console.error('Error saving quick items:', error);
      Alert.alert('שגיאה', 'שגיאה בעדכון פריטים מהירים');
    }
  };

  const updateEditingQuickItem = (index: number, value: string) => {
    const newItems = [...editingQuickItems];
    newItems[index] = { ...newItems[index], name: value };
    setEditingQuickItems(newItems);
  };

  const updateEditingQuickItemIcon = (index: number, icon: string) => {
    const newItems = [...editingQuickItems];
    newItems[index] = { ...newItems[index], icon };
    setEditingQuickItems(newItems);
    setShowIconPicker(false);
    setIconPickerIndex(null);
  };

  const openIconPicker = (index: number) => {
    setIconPickerIndex(index);
    setShowIconPicker(true);
  };

  const removeQuickItemSlot = (index: number) => {
    const newItems = [...editingQuickItems];
    newItems.splice(index, 1);
    setEditingQuickItems(newItems);
  };


  const handleEditItem = (item: ShoppingListItem) => {
    Alert.alert(
      'עריכת פריט',
      `מה תרצה לערוך ב"${item.item_name}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'ערוך שם',
          onPress: () => {
            setEditingItem(item);
            setEditItemName(item.item_name);
            setShowEditItemModal(true);
          },
        },
        {
          text: 'ערוך כמות',
          onPress: () => {
            const multiplierMatch = item.item_name.match(/^(.+) X(\d+)$/);
            const currentMultiplier = multiplierMatch ? parseInt(multiplierMatch[2]) : 1;
            setEditingQuantityItem(item);
            setQuantityValue(currentMultiplier);
            setShowQuantityModal(true);
          },
        },
      ]
    );
  };

  const editItem = async (itemId: string, newName: string) => {
    if (!selectedList || !newName.trim()) return;

    const originalItem = items.find(i => i.id === itemId);
    if (!originalItem) return;

    // Optimistic update
    const updatedItem = { ...originalItem, item_name: newName.trim() };
    setItems(prevItems => prevItems.map(i => i.id === itemId ? updatedItem : i));
    setShowEditItemModal(false);
    setEditingItem(null);
    setEditItemName('');

    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items/${itemId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_name: newName.trim(),
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(prevItems => prevItems.map(i => i.id === itemId ? data.item : i));
      } else {
        // Revert optimistic update on failure
        setItems(prevItems => prevItems.map(i => i.id === itemId ? originalItem : i));
        Alert.alert('שגיאה', 'שגיאה בעדכון פריט');
      }
    } catch (error) {
      console.error('Error editing item:', error);
      // Revert optimistic update on failure
      setItems(prevItems => prevItems.map(i => i.id === itemId ? originalItem : i));
      Alert.alert('שגיאה', 'שגיאה בעדכון פריט');
    }
  };

  const handleMoveItem = (item: ShoppingListItem) => {
    setMovingItem(item);
    setNewListNameForMove('');
    setShowMoveItemModal(true);
  };

  const moveItemToList = async (targetListId: string) => {
    if (!movingItem || !selectedList) return;

    try {
      const token = apiService.getAccessToken();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items/${movingItem.id}/move`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target_list_id: targetListId,
          }),
        }
      );

      if (response.ok) {
        setItems(items.filter(i => i.id !== movingItem.id));
        setShowMoveItemModal(false);
        setMovingItem(null);
        // Refresh lists to update completion status (in background)
        loadShoppingLists(false);
        Alert.alert('הצלחה', 'הפריט הועבר בהצלחה');
      } else {
        Alert.alert('שגיאה', 'שגיאה בהעברת פריט');
      }
    } catch (error) {
      console.error('Error moving item:', error);
      Alert.alert('שגיאה', 'שגיאה בהעברת פריט');
    }
  };

  const moveItemToNewList = async () => {
    if (!movingItem || !newListNameForMove.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם לרשימה החדשה');
      return;
    }

    try {
      const token = apiService.getAccessToken();
      
      // Create new list
      const createResponse = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newListNameForMove.trim(),
          }),
        }
      );

      if (createResponse.ok) {
        const createData = await createResponse.json();
        const newList = createData.list;
        
        // Move item to new list
        await moveItemToList(newList.id);
        
        // Update lists
        setLists([newList, ...lists]);
      } else {
        Alert.alert('שגיאה', 'שגיאה ביצירת רשימה חדשה');
      }
    } catch (error) {
      console.error('Error creating list and moving item:', error);
      Alert.alert('שגיאה', 'שגיאה ביצירת ראימה חדשה');
    }
  };

  const handleItemNameChange = (text: string) => {
    setNewItemName(text);
    
    if (text.trim().length > 0) {
      // Find matching quick items
      const suggestions = quickItems
        .map(item => item.item_name)
        .filter(name => 
          name.toLowerCase().includes(text.toLowerCase()) && 
          name.toLowerCase() !== text.toLowerCase()
        )
        .slice(0, 5); // Show only first 5 matches
      
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(suggestions.length > 0);
    } else {
      setShowAutocomplete(false);
      setAutocompleteSuggestions([]);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setNewItemName(suggestion);
    setShowAutocomplete(false);
    setAutocompleteSuggestions([]);
  };

  const hideAutocomplete = () => {
    setShowAutocomplete(false);
    setAutocompleteSuggestions([]);
  };

  const toggleSelectionMode = () => {
    if (!isSelectionMode) {
      // Entering selection mode - clear any completed items from selection
      const newItems = new Set<string>();
      selectedItems.forEach(itemId => {
        const item = items.find(i => i.id === itemId);
        if (item && !item.is_completed) {
          newItems.add(itemId);
        }
      });
      setSelectedItems(newItems);
    } else {
      // Exiting selection mode - clear all selections
      setSelectedItems(new Set());
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  const selectAllItems = () => {
    const allIncompleteItemIds = new Set(items.filter(info => !info.is_completed).map(item => item.id));
    setSelectedItems(allIncompleteItemIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const moveSelectedItemsToList = async (targetListId: string) => {
    const selectedItemsArray = Array.from(selectedItems);
    
    if (selectedItemsArray.length === 0 || !selectedList) return;

    try {
      const token = apiService.getAccessToken();
      
      // Move each selected item
      for (const itemId of selectedItemsArray) {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists/${selectedList.id}/items/${itemId}/move`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              target_list_id: targetListId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to move item ${itemId}`);
        }
      }

      // Update local state
      setItems(items.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      setShowMoveSelectedModal(false);
      setIsSelectionMode(false);
      // Refresh lists to update completion status (in background)
      loadShoppingLists(false);
      Alert.alert('הצלחה', `${selectedItemsArray.length} פריטים הועברו בהצלחה`);
    } catch (error) {
      console.error('Error moving selected items:', error);
      Alert.alert('שגיאה', 'שגיאה בהעברת פריטים');
    }
  };

  const moveSelectedItemsToNewList = async () => {
    if (!newListNameForMove.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם לרשימה החדשה');
      return;
    }

    const selectedItemsArray = Array.from(selectedItems);
    
    if (selectedItemsArray.length === 0) return;

    try {
      const token = apiService.getAccessToken();
      
      // Create new list
      const createResponse = await fetch(
        `${API_CONFIG.BASE_URL}/api/boards/${boardId}/shopping-lists`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newListNameForMove.trim(),
          }),
        }
      );

      if (createResponse.ok) {
        const createData = await createResponse.json();
        const newList = createData.list;
        
        // Move all selected items to new list
        await moveSelectedItemsToList(newList.id);
        
        // Update lists
        setLists([newList, ...lists]);
      } else {
        Alert.alert('שגיאה', 'שגיאה ביצירת רשימה חדשה');
      }
    } catch (error) {
      console.error('Error creating list and moving items:', error);
      Alert.alert('שגיאה', 'שגיאה ביצירת רשימה חדשה');
    }
  };

  const filteredQuickItems = editingQuickItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => 
      item.name.toLowerCase().includes(quickItemsSearchQuery.toLowerCase())
    );

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const isItemSelected = selectedItems.has(item.id);
    const isClickable = !item.is_completed; // Only allow selection of non-completed items
    
    return (
      <View style={[
        styles.item, 
        item.is_completed && styles.completedItem,
        isSelectionMode && styles.itemSelectionMode,
        isItemSelected && styles.selectedItem
      ]}>
        {isSelectionMode ? (
          <TouchableOpacity
            style={[styles.itemContent, !isClickable && styles.disabledSelectionMode]}
            onPress={() => isClickable && toggleItemSelection(item.id)}
            disabled={!isClickable}
          >
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.selectionCheckbox, 
                isItemSelected && styles.selectionCheckboxChecked,
                !isClickable && styles.disabledCheckbox
              ]}>
                {isItemSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </View>
            <View style={styles.itemTextContainer}>
              <Text style={[styles.itemText, item.is_completed && styles.completedText]}>
                {item.item_name}
              </Text>
              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.itemContent}
              onPress={() => toggleItemCompletion(item)}
              onLongPress={() => {
                Alert.alert(
                  'פעולות על פריט',
                  `מה תרצה לעשות עם "${item.item_name}"?`,
                  [
                    { text: 'ביטול', style: 'cancel' },
                    { text: 'ערוך', onPress: () => handleEditItem(item) },
                    { text: 'העבר', onPress: () => handleMoveItem(item) },
                  ]
                );
              }}
            >
              <View style={styles.checkboxContainer}>
                <View style={[styles.checkbox, item.is_completed && styles.checkboxChecked]}>
                  {item.is_completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemText, item.is_completed && styles.completedText]}>
                  {item.item_name}
                </Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleMoveItem(item)}
              >
                <Text style={styles.actionIcon}>➡️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditItem(item)}
              >
                <Text style={styles.actionIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteItem(item.id)}
              >
                <Text style={styles.actionIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderQuickItem = ({ item }: { item: QuickItem }) => (
    <TouchableOpacity
      style={styles.quickItemButton}
      onPress={() => addItem(item.item_name)}
    >
      <Text style={styles.quickItemText}>
        {item.icon ? `${item.icon} ` : ''}{item.item_name}
      </Text>
    </TouchableOpacity>
  );

  const renderListTab = ({ item }: { item: ShoppingList }) => {
    const isSelected = selectedList?.id === item.id;
    // Use all_items_completed from the server for consistent status across all tabs
    const showCheckmark = item.all_items_completed;
    
    return (
      <TouchableOpacity
        style={[styles.listTab, isSelected && styles.selectedListTab]}
        onPress={() => setSelectedList(item)}
        onLongPress={() => handleDeleteList(item)}
      >
        <Text style={[styles.listTabText, isSelected && styles.selectedListTabText]}>
          {item.name} {showCheckmark ? ' ✓' : ''}
        </Text>
        {item.date && (
          <Text style={styles.listTabDate}>
            {new Date(item.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Icon Picker Modal
  if (showIconPicker && iconPickerIndex !== null) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>בחר אייקון</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowIconPicker(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.iconPickerContainer}>
            <View style={styles.iconGrid}>
              {GROCERY_ICONS.map((icon, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.iconGridItem}
                  onPress={() => updateEditingQuickItemIcon(iconPickerIndex, icon)}
                >
                  <Text style={styles.iconGridText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowIconPicker(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Quick Items Config Modal
  if (showQuickItemsConfig) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>הגדרת פריטים מהירים</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowQuickItemsConfig(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={quickItemsSearchQuery}
              onChangeText={setQuickItemsSearchQuery}
              placeholder="חפש פריט..."
              placeholderTextColor="#999"
            />
          </View>

          <FlatList
            data={filteredQuickItems}
            keyExtractor={(item) => `quick-${item.index}`}
            renderItem={({ item: { item, index } }) => (
              <View style={styles.quickItemConfigRow}>
                <Text style={styles.quickItemNumber}>{index + 1}.</Text>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => openIconPicker(index)}
                >
                  <Text style={styles.iconButtonText}>{item.icon || '➕'}</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.quickItemInput}
                  value={item.name}
                  onChangeText={(text) => updateEditingQuickItem(index, text)}
                  placeholder="שם פריט"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.removeItemButton}
                  onPress={() => removeQuickItemSlot(index)}
                >
                  <Text style={styles.removeItemText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.quickItemsList}
          />

          <TouchableOpacity
            style={styles.addQuickItemButton}
            onPress={addNewQuickItemSlot}
          >
            <Text style={styles.addQuickItemText}>+ הוסף פריט מהיר</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowQuickItemsConfig(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveQuickItems}
            >
              <Text style={styles.saveButtonText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Create List Modal
  if (showCreateListModal) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>יצירת רשימת קניות חדשה</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCreateListModal(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.createListContent}>
            <Text style={styles.inputLabel}>שם הרשימה *</Text>
            <TextInput
              style={styles.input}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="למשל: קניות שבועיות, ברביקיו..."
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>תיאור (לא חובה)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newListDescription}
              onChangeText={setNewListDescription}
              placeholder="תיאור הרשימה..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>תאריך (לא חובה)</Text>
            <TextInput
              style={styles.input}
              value={newListDate}
              onChangeText={setNewListDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowCreateListModal(false);
                setNewListName('');
                setNewListDescription('');
                setNewListDate('');
              }}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={createList}
            >
              <Text style={styles.saveButtonText}>צור רשימה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Edit Item Modal
  if (showEditItemModal) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>עריכת שם פריט</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowEditItemModal(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.editItemContent}>
            <Text style={styles.inputLabel}>שם הפריט</Text>
            <TextInput
              style={styles.input}
              value={editItemName}
              onChangeText={setEditItemName}
              placeholder="שם הפריט"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowEditItemModal(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={() => editingItem && editItem(editingItem.id, editItemName)}
            >
              <Text style={styles.saveButtonText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Move Item Modal
  if (showMoveItemModal) {
    const otherLists = lists.filter(l => l.id !== selectedList?.id);
    
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>העבר פריט</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowMoveItemModal(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.moveItemContent}>
            <Text style={styles.moveItemTitle}>
              העבר את "{movingItem?.item_name}" לרשימה:
            </Text>

            {otherLists.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>רשימות קיימות:</Text>
                {otherLists.map(list => (
                  <TouchableOpacity
                    key={list.id}
                    style={styles.listOption}
                    onPress={() => moveItemToList(list.id)}
                  >
                    <Text style={styles.listOptionText}>{list.name}</Text>
                    <Text style={styles.listOptionArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text style={styles.noListsText}>אין רשימות אחרות זמינות</Text>
            )}

            <Text style={styles.sectionTitle}>או צור רשימה חדשה:</Text>
            <TextInput
              style={styles.input}
              value={newListNameForMove}
              onChangeText={setNewListNameForMove}
              placeholder="שם הרשימה החדשה"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.button, styles.saveButton, styles.createNewListButton]}
              onPress={moveItemToNewList}
            >
              <Text style={styles.saveButtonText}>צור רשימה והעבר</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowMoveItemModal(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Quantity Edit Modal
  if (showQuantityModal && editingQuantityItem) {
    const multiplierMatch = editingQuantityItem.item_name.match(/^(.+) X\d+$/);
    const baseName = multiplierMatch ? multiplierMatch[1] : editingQuantityItem.item_name;
    
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>עריכת כמות</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowQuantityModal(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quantityModalContent}>
            <Text style={styles.quantityItemName}>{baseName}</Text>
            
            <View style={styles.quantityControlContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantityValue(Math.max(0, quantityValue - 1))}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              
              <View style={styles.quantityInputWrapper}>
                <TextInput
                  style={styles.quantityInput}
                  value={quantityValue.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text);
                    if (!isNaN(num) && num >= 0) {
                      setQuantityValue(num);
                    } else if (text === '') {
                      setQuantityValue(0);
                    }
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.quantityLabel}>
                  {quantityValue === 0 ? 'מחיקה' : quantityValue === 1 ? 'יחידה' : 'יחידות'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantityValue(quantityValue + 1)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.quantityHint}>
              {quantityValue === 0
                ? '💡 כמות 0 תמחק את הפריט'
                : quantityValue === 1
                ? `💡 השם יהיה: "${baseName}"`
                : `💡 השם יהיה: "${baseName} X${quantityValue}"`}
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowQuantityModal(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, quantityValue === 0 ? styles.deleteButton : styles.saveButton]}
              onPress={() => {
                updateItemMultiplier(editingQuantityItem, quantityValue);
                setShowQuantityModal(false);
              }}
            >
              <Text style={styles.saveButtonText}>
                {quantityValue === 0 ? 'מחק' : 'שמור'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Move Selected Items Modal
  if (showMoveSelectedModal) {
    const otherLists = lists.filter(l => l.id !== selectedList?.id);
    
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>העבר פריטים נבחרים</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowMoveSelectedModal(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.moveItemContent}>
            <Text style={styles.moveItemTitle}>
              העבר {selectedItems.size} פריטים לרשימה:
            </Text>

            {otherLists.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>רשימות קיימות:</Text>
                {otherLists.map(list => (
                  <TouchableOpacity
                    key={list.id}
                    style={styles.listOption}
                    onPress={() => moveSelectedItemsToList(list.id)}
                  >
                    <Text style={styles.listOptionText}>{list.name}</Text>
                    <Text style={styles.listOptionArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text style={styles.noListsText}>אין רשימות אחרות זמינות</Text>
            )}

            <Text style={styles.sectionTitle}>או צור רשימה חדשה:</Text>
            <TextInput
              style={styles.input}
              value={newListNameForMove}
              onChangeText={setNewListNameForMove}
              placeholder="שם הרשימה החדשה"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.button, styles.saveButton, styles.createNewListButton]}
              onPress={moveSelectedItemsToNewList}
            >
              <Text style={styles.saveButtonText}>צור רשימה והעבר</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowMoveSelectedModal(false)}
            >
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Main Shopping List View
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🛒 רשימות קניות</Text>
          <View style={styles.headerButtons}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.configButton}
                onPress={openQuickItemsConfig}
              >
                <Text style={styles.configButtonText}>⚙️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lists Tabs */}
        <View style={styles.listsTabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.listsScrollView}
            contentContainerStyle={styles.listsScrollContent}
          >
            {lists.map(list => (
              <View key={list.id}>
                {renderListTab({ item: list })}
              </View>
            ))}
          </ScrollView>
          <View style={styles.fadeContainer}>
            <View style={styles.fadeGradient} />
            <TouchableOpacity
              style={styles.addListButton}
              onPress={() => setShowCreateListModal(true)}
            >
              <Text style={styles.addListText}>הוסף</Text>
            </TouchableOpacity>
          </View>
        </View>

            {/* List Description */}
        {selectedList?.description && (
          <View style={styles.listDescriptionContainer}>
            <Text style={styles.listDescriptionText}>{selectedList.description}</Text>
          </View>
        )}

        {/* Selection Controls */}
        <View style={styles.selectionControlsContainer}>
          <TouchableOpacity
            style={[styles.selectionToggleButton, isSelectionMode && styles.selectionToggleButtonActive]}
            onPress={toggleSelectionMode}
          >
            <Text style={[styles.selectionToggleText, isSelectionMode && styles.selectionToggleTextActive]}>
              {isSelectionMode ? 'יציאה' : 'העבר פריטים'}
            </Text>
          </TouchableOpacity>

          {isSelectionMode && (
            <Text style={styles.selectionHintText}>
              ניתן לבחור רק פריטים שעדיין לא נרכשו
            </Text>
          )}

          {isSelectionMode && (
            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={styles.selectionActionButton}
                onPress={selectAllItems}
              >
                <Text style={styles.selectionActionText}>הכל</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectionActionButton}
                onPress={clearSelection}
              >
                <Text style={styles.selectionActionText}>נקה</Text>
              </TouchableOpacity>
              {selectedItems.size > 0 && (
                <TouchableOpacity
                  style={styles.moveSelectedButton}
                  onPress={() => setShowMoveSelectedModal(true)}
                >
                  <Text style={styles.moveSelectedText}>
                    העבר ({selectedItems.size})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {selectedList ? (
          <>
            {/* Quick Items */}
            {quickItems.length > 0 && (
              <View style={styles.quickItemsContainer}>
                <Text style={styles.quickItemsTitle}>פריטים מהירים:</Text>
                <FlatList
                  horizontal
                  data={quickItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderQuickItem}
                  contentContainerStyle={styles.quickItemsRow}
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            )}

            {/* Add New Item */}
            <View style={styles.addItemContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.itemNameInput}
                  value={newItemName}
                  onChangeText={handleItemNameChange}
                  onBlur={hideAutocomplete}
                  placeholder="שם הפריט..."
                  placeholderTextColor="#999"
                  onSubmitEditing={() => addItem(newItemName)}
                  returnKeyType="done"
                />
                {showAutocomplete && autocompleteSuggestions.length > 0 && (
                  <View style={styles.autocompleteContainer}>
                    {autocompleteSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={`${suggestion}-${index}`}
                        style={[styles.autocompleteItem, index === autocompleteSuggestions.length - 1 && styles.autocompleteItemLast]}
                        onPress={() => selectSuggestion(suggestion)}
                      >
                        <Text style={styles.autocompleteText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addItem(newItemName)}
                disabled={!newItemName.trim()}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Shopping List Items */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>אין פריטים ברשימה</Text>
                <Text style={styles.emptyStateSubtext}>הוסף פריט ראשון כדי להתחיל</Text>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
              />
            )}

            {/* Add Expense Button - Fixed to bottom */}
            <View style={styles.addExpenseButtonContainer}>
              <TouchableOpacity
                style={styles.addExpenseButton}
                onPress={handleAddExpenseFromList}
              >
                <Text style={styles.addExpenseButtonText}>💰 קניתי! הוסף הוצאה</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין רשימות קניות</Text>
            <Text style={styles.emptyStateSubtext}>צור רשימה ראשונה כדי להתחיל</Text>
            <TouchableOpacity
              style={styles.createFirstListButton}
              onPress={() => setShowCreateListModal(true)}
            >
              <Text style={styles.createFirstListText}>+ צור רשימה ראשונה</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configButton: {
    padding: 8,
  },
  configButtonText: {
    fontSize: 24,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 28,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  listsTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  listsScrollView: {
    flex: 1,
  },
  listsScrollContent: {
    paddingRight: 4,
  },
  fadeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  fadeGradient: {
    position: 'absolute',
    left: -20,
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'transparent',
    shadowColor: '#fff',
    shadowOffset: {
      width: -10,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  listTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedListTab: {
    backgroundColor: '#9b59b6',
  },
  listTabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  selectedListTabText: {
    color: 'white',
  },
  listTabDate: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 2,
  },
  addListButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 4,
    borderRadius: 16,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addListText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  quickItemsContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickItemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  quickItemsRow: {
    paddingVertical: 4,
  },
  quickItemButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickItemText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addItemContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
  },
  itemNameInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  autocompleteContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  autocompleteItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  autocompleteItemLast: {
    borderBottomWidth: 0,
  },
  autocompleteText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#27ae60',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  addExpenseButtonContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  addExpenseButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addExpenseButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedItem: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  itemSelectionMode: {
    backgroundColor: '#f8f9fa',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3498db',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },
  itemDescription: {
    fontSize: 13,
    color: '#95a5a6',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 20,
  },
  createFirstListButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createFirstListText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  quickItemsList: {
    padding: 16,
  },
  quickItemConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickItemNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
    width: 30,
  },
  quickItemInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  removeItemButton: {
    width: 40,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeItemText: {
    fontSize: 20,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  addQuickItemButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addQuickItemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createListContent: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listTabDescription: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
    textAlign: 'center',
  },
  listDescriptionContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listDescriptionText: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  editItemContent: {
    padding: 24,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  moveItemContent: {
    flex: 1,
    padding: 20,
  },
  moveItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 12,
  },
  listOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  listOptionText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  listOptionArrow: {
    fontSize: 20,
    color: '#3498db',
  },
  noListsText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  createNewListButton: {
    marginTop: 12,
  },
  selectionControlsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectionToggleButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionToggleButtonActive: {
    backgroundColor: '#e74c3c',
  },
  selectionToggleText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectionToggleTextActive: {
    color: 'white',
  },
  selectionHintText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  selectionActionButton: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  selectionActionText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: 'bold',
  },
  moveSelectedButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  moveSelectedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectionCheckboxChecked: {
    backgroundColor: '#3498db',
  },
  disabledSelectionMode: {
    opacity: 0.5,
  },
  disabledCheckbox: {
    backgroundColor: '#ecf0f1',
    borderColor: '#bdc3c7',
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconButtonText: {
    fontSize: 24,
  },
  iconPickerContainer: {
    padding: 20,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconGridItem: {
    width: '16%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  iconGridText: {
    fontSize: 32,
  },
  quantityModalContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityItemName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 40,
    textAlign: 'center',
  },
  quantityControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 20,
  },
  quantityButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quantityButtonText: {
    fontSize: 36,
    color: 'white',
    fontWeight: 'bold',
  },
  quantityInputWrapper: {
    alignItems: 'center',
    minWidth: 120,
  },
  quantityInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 20,
    minWidth: 100,
  },
  quantityLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
    fontWeight: '600',
  },
  quantityHint: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
});

export default ShoppingListModal;
