import { NativeModules, Platform } from 'react-native';

interface WidgetServiceInterface {
  updateShoppingListWidget: (data: ShoppingListWidgetData) => Promise<void>;
  refreshWidget: () => Promise<void>;
}

interface ShoppingListWidgetData {
  id: string;
  name: string;
  items: ShoppingListItem[];
  isCompleted: boolean;
}

interface ShoppingListItem {
  id: string;
  name: string;
  isCompleted: boolean;
}

class WidgetService implements WidgetServiceInterface {
  private nativeModule: any;

  constructor() {
    if (Platform.OS === 'android') {
      this.nativeModule = NativeModules.ShoppingListWidgetModule;
    } else if (Platform.OS === 'ios') {
      this.nativeModule = NativeModules.ShoppingListWidgetModule;
    }
  }

  /**
   * Update the shopping list widget with new data
   */
  async updateShoppingListWidget(data: ShoppingListWidgetData): Promise<void> {
    try {
      if (this.nativeModule && this.nativeModule.updateWidget) {
        await this.nativeModule.updateWidget(data);
        console.log('✅ Widget updated successfully');
      } else {
        console.warn('⚠️ Widget native module not available');
      }
    } catch (error) {
      console.error('❌ Error updating widget:', error);
    }
  }

  /**
   * Refresh the widget manually
   */
  async refreshWidget(): Promise<void> {
    try {
      if (this.nativeModule && this.nativeModule.refreshWidget) {
        await this.nativeModule.refreshWidget();
        console.log('✅ Widget refreshed successfully');
      } else {
        console.warn('⚠️ Widget native module not available');
      }
    } catch (error) {
      console.error('❌ Error refreshing widget:', error);
    }
  }

  /**
   * Convert API shopping list data to widget format
   */
  convertToWidgetData(shoppingList: any, items: any[]): ShoppingListWidgetData {
    const completedCount = items.filter(item => item.is_completed).length;
    
    return {
      id: shoppingList.id,
      name: shoppingList.name,
      isCompleted: completedCount === items.length && items.length > 0,
      items: items.map(item => ({
        id: item.id,
        name: item.item_name,
        isCompleted: item.is_completed
      }))
    };
  }
}

export const widgetService = new WidgetService();
export type { ShoppingListItem, ShoppingListWidgetData };

