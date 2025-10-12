package com.sarusiziv96.homeexpensemanager.modules;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableType;

import com.sarusiziv96.homeexpensemanager.widget.ShoppingListWidgetProvider;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class ShoppingListWidgetModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ShoppingListWidget";
    private static final String PREFS_NAME = "ShoppingListWidgetPrefs";
    
    private ReactApplicationContext reactContext;

    public ShoppingListWidgetModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "ShoppingListWidgetModule";
    }

    @ReactMethod
    public void updateWidget(ReadableMap data, Promise promise) {
        try {
            // Save widget data to SharedPreferences
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            // Convert ReadableMap to JSON string
            JSONObject jsonData = convertReadableMapToJson(data);
            editor.putString("shopping_list_data", jsonData.toString());
            editor.apply();
            
            // Update all widgets
            updateAllWidgets();
            
            Log.d(TAG, "Widget updated successfully");
            promise.resolve("Widget updated successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "Error updating widget", e);
            promise.reject("WIDGET_UPDATE_ERROR", "Failed to update widget: " + e.getMessage());
        }
    }

    @ReactMethod
    public void refreshWidget(Promise promise) {
        try {
            updateAllWidgets();
            Log.d(TAG, "Widget refreshed successfully");
            promise.resolve("Widget refreshed successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error refreshing widget", e);
            promise.reject("WIDGET_REFRESH_ERROR", "Failed to refresh widget: " + e.getMessage());
        }
    }

    private void updateAllWidgets() {
        try {
            Context context = reactContext.getApplicationContext();
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName componentName = new ComponentName(context, ShoppingListWidgetProvider.class);
            
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
            
            if (appWidgetIds.length > 0) {
                for (int appWidgetId : appWidgetIds) {
                    ShoppingListWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId);
                }
                Log.d(TAG, "Updated " + appWidgetIds.length + " widgets");
            } else {
                Log.d(TAG, "No widgets to update");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating widgets", e);
        }
    }

    private JSONObject convertReadableMapToJson(ReadableMap readableMap) throws JSONException {
        JSONObject jsonObject = new JSONObject();
        
        if (readableMap.hasKey("id")) {
            jsonObject.put("id", readableMap.getString("id"));
        }
        
        if (readableMap.hasKey("name")) {
            jsonObject.put("name", readableMap.getString("name"));
        }
        
        if (readableMap.hasKey("isCompleted")) {
            jsonObject.put("isCompleted", readableMap.getBoolean("isCompleted"));
        }
        
        if (readableMap.hasKey("items")) {
            ReadableArray itemsArray = readableMap.getArray("items");
            JSONArray jsonArray = new JSONArray();
            
            for (int i = 0; i < itemsArray.size(); i++) {
                ReadableMap itemMap = itemsArray.getMap(i);
                JSONObject itemJson = new JSONObject();
                
                if (itemMap.hasKey("id")) {
                    itemJson.put("id", itemMap.getString("id"));
                }
                
                if (itemMap.hasKey("name")) {
                    itemJson.put("name", itemMap.getString("name"));
                }
                
                if (itemMap.hasKey("isCompleted")) {
                    itemJson.put("isCompleted", itemMap.getBoolean("isCompleted"));
                }
                
                jsonArray.put(itemJson);
            }
            
            jsonObject.put("items", jsonArray);
        }
        
        return jsonObject;
    }
}
