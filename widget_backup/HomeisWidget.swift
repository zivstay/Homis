import WidgetKit
import SwiftUI

struct ShoppingItem: Codable, Identifiable {
    let id: String
    let name: String
    let completed: Bool
}

struct ShoppingListEntry: TimelineEntry {
    let date: Date
    let items: [ShoppingItem]
    let hasError: Bool
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ShoppingListEntry {
        ShoppingListEntry(
            date: Date(),
            items: [
                ShoppingItem(id: "1", name: "חלב", completed: false),
                ShoppingItem(id: "2", name: "לחם", completed: true),
                ShoppingItem(id: "3", name: "ביצים", completed: false)
            ],
            hasError: false
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (ShoppingListEntry) -> ()) {
        let entry = ShoppingListEntry(
            date: Date(),
            items: [
                ShoppingItem(id: "1", name: "חלב", completed: false),
                ShoppingItem(id: "2", name: "לחם", completed: false)
            ],
            hasError: false
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        fetchShoppingList { items, error in
            let entry: ShoppingListEntry
            if let items = items {
                entry = ShoppingListEntry(date: Date(), items: items, hasError: false)
            } else {
                entry = ShoppingListEntry(date: Date(), items: [], hasError: true)
            }
            
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }
    
    func fetchShoppingList(completion: @escaping ([ShoppingItem]?, Bool) -> Void) {
        guard let sharedDefaults = UserDefaults(suiteName: "group.com.sarusiziv96.homeexpensemanager") else {
            completion(nil, true)
            return
        }
        
        guard let itemsData = sharedDefaults.data(forKey: "shoppingListItems") else {
            completion([], false)
            return
        }
        
        do {
            let items = try JSONDecoder().decode([ShoppingItem].self, from: itemsData)
            completion(items, false)
        } catch {
            completion(nil, true)
        }
    }
}

struct HomeisWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            Color(red: 0.24, green: 0.86, blue: 0.52)
            
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "cart.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white)
                    Text("רשימת קניות")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(.bottom, 4)
                
                if entry.hasError {
                    VStack {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 24))
                            .foregroundColor(.white.opacity(0.8))
                        Text("לא ניתן לטעון")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if entry.items.isEmpty {
                    VStack {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 24))
                            .foregroundColor(.white.opacity(0.8))
                        Text("הרשימה ריקה")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    let displayItems = Array(entry.items.prefix(maxItemsForFamily()))
                    
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(displayItems) { item in
                            HStack(spacing: 8) {
                                Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white)
                                
                                Text(item.name)
                                    .font(.system(size: 13))
                                    .foregroundColor(.white)
                                    .strikethrough(item.completed)
                                    .lineLimit(1)
                                
                                Spacer()
                            }
                        }
                        
                        if entry.items.count > maxItemsForFamily() {
                            Text("+\(entry.items.count - maxItemsForFamily()) נוספים")
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.7))
                                .padding(.top, 2)
                        }
                    }
                }
            }
            .padding()
        }
    }
    
    func maxItemsForFamily() -> Int {
        switch family {
        case .systemSmall:
            return 3
        case .systemMedium:
            return 5
        case .systemLarge:
            return 10
        default:
            return 3
        }
    }
}

struct HomeisWidget: Widget {
    let kind: String = "HomeisWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HomeisWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("רשימת קניות")
        .description("הצג את רשימת הקניות שלך")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct HomeisWidget_Previews: PreviewProvider {
    static var previews: some View {
        HomeisWidgetEntryView(entry: ShoppingListEntry(
            date: Date(),
            items: [
                ShoppingItem(id: "1", name: "חלב", completed: false),
                ShoppingItem(id: "2", name: "לחם", completed: true),
                ShoppingItem(id: "3", name: "ביצים", completed: false)
            ],
            hasError: false
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
