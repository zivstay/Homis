package com.sarusiziv96.homeexpensemanager.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import com.sarusiziv96.homeexpensemanager.MainActivity;
import com.sarusiziv96.homeexpensemanager.R;

/**
 * Implementation of App Widget functionality for Shopping List Widget.
 */
public class ShoppingListWidgetProvider extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.shopping_list_widget);

        // Set up the intent to launch the app when widget is tapped
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("open_shopping_list", true);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        // Load data from SharedPreferences
        android.content.SharedPreferences prefs = context.getSharedPreferences("ShoppingListWidgetPrefs", Context.MODE_PRIVATE);
        String jsonData = prefs.getString("shopping_list_data", null);
        
        if (jsonData != null) {
            try {
                org.json.JSONObject data = new org.json.JSONObject(jsonData);
                String listName = data.optString("name", "רשימת קניות");
                boolean isCompleted = data.optBoolean("isCompleted", false);
                org.json.JSONArray itemsArray = data.optJSONArray("items");
                
                int totalItems = itemsArray != null ? itemsArray.length() : 0;
                int completedItems = 0;
                
                if (itemsArray != null) {
                    for (int i = 0; i < itemsArray.length(); i++) {
                        org.json.JSONObject item = itemsArray.getJSONObject(i);
                        if (item.optBoolean("isCompleted", false)) {
                            completedItems++;
                        }
                    }
                }
                
                // Update widget with real data
                views.setTextViewText(R.id.widget_title, listName);
                views.setTextViewText(R.id.widget_progress_text, completedItems + "/" + totalItems + " הושלמו");
                views.setProgressBar(R.id.widget_progress_bar, totalItems, completedItems, false);
                
                // Set up list view with real data
                Intent listIntent = new Intent(context, ShoppingListWidgetService.class);
                views.setRemoteAdapter(R.id.widget_list_view, listIntent);
                
            } catch (Exception e) {
                // Fallback to default data on error
                views.setTextViewText(R.id.widget_title, "רשימת קניות");
                views.setTextViewText(R.id.widget_progress_text, "0/0 הושלמו");
                views.setProgressBar(R.id.widget_progress_bar, 0, 0, false);
            }
        } else {
            // No data available - show empty state
            views.setTextViewText(R.id.widget_title, "רשימת קניות");
            views.setTextViewText(R.id.widget_progress_text, "אין רשימה פעילה");
            views.setProgressBar(R.id.widget_progress_bar, 0, 0, false);
        }

        // Set empty view
        views.setEmptyView(R.id.widget_list_view, R.id.widget_empty_text);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}
