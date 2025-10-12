package com.sarusiziv96.homeexpensemanager.widget;

import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import com.sarusiziv96.homeexpensemanager.R;

import java.util.ArrayList;
import java.util.List;

/**
 * Service to provide data for the shopping list widget's ListView
 */
public class ShoppingListWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new ShoppingListRemoteViewsFactory(this.getApplicationContext());
    }
}

class ShoppingListRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private List<ShoppingItem> shoppingItems;

    public ShoppingListRemoteViewsFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        // Initialize data
        shoppingItems = new ArrayList<>();
        loadShoppingListData();
    }

    @Override
    public void onDataSetChanged() {
        // Refresh data
        loadShoppingListData();
    }

    @Override
    public void onDestroy() {
        shoppingItems.clear();
    }

    @Override
    public int getCount() {
        return shoppingItems.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= shoppingItems.size()) {
            return null;
        }

        ShoppingItem item = shoppingItems.get(position);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.shopping_list_widget_item);

        // Set item data
        views.setTextViewText(R.id.widget_item_name, item.getName());
        views.setImageViewResource(R.id.widget_item_checkbox, 
            item.isCompleted() ? R.drawable.ic_check_circle : R.drawable.ic_circle_outline);

        // Set click intent for individual items
        Intent fillInIntent = new Intent();
        fillInIntent.putExtra("item_id", item.getId());
        fillInIntent.putExtra("item_name", item.getName());
        views.setOnClickFillInIntent(R.id.widget_item_container, fillInIntent);

        return views;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }

    private void loadShoppingListData() {
        // In a real implementation, this would load data from SharedPreferences or database
        // For now, using sample data
        shoppingItems.clear();
        shoppingItems.add(new ShoppingItem("1", "חלב", true));
        shoppingItems.add(new ShoppingItem("2", "לחם", false));
        shoppingItems.add(new ShoppingItem("3", "ביצים", true));
        shoppingItems.add(new ShoppingItem("4", "עגבניות", false));
        shoppingItems.add(new ShoppingItem("5", "מלפפונים", false));
    }

    // Simple data class for shopping items
    private static class ShoppingItem {
        private String id;
        private String name;
        private boolean completed;

        public ShoppingItem(String id, String name, boolean completed) {
            this.id = id;
            this.name = name;
            this.completed = completed;
        }

        public String getId() { return id; }
        public String getName() { return name; }
        public boolean isCompleted() { return completed; }
    }
}
