import React from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BOARD_TYPES, BoardType, QuickCategory } from '../constants/boardTypes';

interface CategorySelectorProps {
    selectedBoardType?: BoardType | null;
    selectedCategories: QuickCategory[];
    customCategories: QuickCategory[];
    existingCategories?: QuickCategory[]; // קטגוריות קיימות מהשרת
    onCategoryToggle: (category: QuickCategory) => void;
    onRemoveCustomCategory?: (categoryName: string) => void;
    onAddCustomCategory?: () => void;
    maxCategories?: number;
    showCustomCategories?: boolean;
    showAddCustomButton?: boolean;
    showHeader?: boolean;
    headerTitle?: string;
    headerSubtitle?: string;
    helpText?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
    selectedBoardType,
    selectedCategories,
    customCategories,
    existingCategories = [],
    onCategoryToggle,
    onRemoveCustomCategory,
    onAddCustomCategory,
    maxCategories = 7,
    showCustomCategories = true,
    showAddCustomButton = true,
    showHeader = true,
    headerTitle = 'בחר קטגוריות',
    headerSubtitle,
    helpText,
}) => {
    // Get all available categories (existing first, then board type, then all others)
    const getAllAvailableCategories = () => {
        const allCategories: QuickCategory[] = [];
        const addedNames = new Set<string>();
        
        // First: Add existing categories from server (highest priority)
        existingCategories.forEach(category => {
            if (!addedNames.has(category.name)) {
                allCategories.push(category);
                addedNames.add(category.name);
            }
        });
        
        // Second: Add categories from selected board type (priority) - excluding "אחר"
        if (selectedBoardType) {
            selectedBoardType.quickCategories.forEach(category => {
                if (!addedNames.has(category.name) && category.name !== 'אחר') {
                    allCategories.push(category);
                    addedNames.add(category.name);
                }
            });
        }
        
        // Third: Add categories from all other board types - excluding "אחר"
        BOARD_TYPES.forEach(boardType => {
            if (!selectedBoardType || boardType.id !== selectedBoardType.id) {
                boardType.quickCategories.forEach(category => {
                    if (!addedNames.has(category.name) && category.name !== 'אחר') {
                        allCategories.push(category);
                        addedNames.add(category.name);
                    }
                });
            }
        });
        
        // Fourth: Add additional common/useful categories (excluding "אחר")
        const additionalCategories = [
            { name: 'תחזוקה', icon: '🔧', color: '#FF8C00' },
            { name: 'ביטוח', icon: '🛡️', color: '#F7DC6F' },
            { name: 'מיסים', icon: '📋', color: '#95A5A6' },
            { name: 'תרומות', icon: '💝', color: '#FF69B4' },
            { name: 'חיות מחמד', icon: '🐕', color: '#98D8C8' },
            { name: 'טכנולוגיה', icon: '📱', color: '#4ECDC4' },
            { name: 'ספרים', icon: '📚', color: '#E74C3C' },
            { name: 'מתנות', icon: '🎁', color: '#9B59B6' },
            { name: 'עבודה', icon: '💼', color: '#3498DB' },
            { name: 'חינוך', icon: '🎓', color: '#E67E22' },
            { name: 'בריאות', icon: '🏥', color: '#E74C3C' },
            { name: 'ספורט', icon: '⚽', color: '#2ECC71' },
            { name: 'נסיעות', icon: '✈️', color: '#9B59B6' },
            { name: 'תחביבים', icon: '🎨', color: '#F39C12' },
            { name: 'קניות', icon: '🛒', color: '#8E44AD' },
            { name: 'תקשורת', icon: '📞', color: '#34495E' },
            { name: 'משפט', icon: '⚖️', color: '#2C3E50' },
            { name: 'יופי', icon: '💄', color: '#EC7063' },
            { name: 'משחקים', icon: '🎮', color: '#AF7AC5' },
            { name: 'אירועים', icon: '🎉', color: '#F1C40F' },
            { name: 'שכר דירה', icon: '🏠', color: '#FF8C00' },
            { name: 'משכנתא', icon: '🏦', color: '#96CEB4' },
        ];
        
        additionalCategories.forEach(category => {
            if (!addedNames.has(category.name) && category.name !== 'אחר') {
                allCategories.push(category);
                addedNames.add(category.name);
            }
        });
        
        return allCategories;
    };

    const renderCategoryItem = ({ item }: { item: QuickCategory }) => {
        const isSelected = selectedCategories.some(cat => cat.name === item.name);
        const totalSelected = selectedCategories.length + customCategories.length;
        const isDisabled = !isSelected && totalSelected >= maxCategories;
        
        return (
            <TouchableOpacity
                style={[
                    styles.categoryItem,
                    isSelected && styles.selectedCategoryItem,
                    isDisabled && styles.disabledCategoryItem,
                ]}
                onPress={() => {
                    if (!isDisabled) {
                        onCategoryToggle(item);
                    }
                }}
                disabled={isDisabled}
            >
                <Text style={[
                    styles.categoryIcon,
                    isDisabled && { opacity: 0.5 }
                ]}>
                    {item.icon}
                </Text>
                <Text 
                    style={[
                        styles.categoryName,
                        isSelected && styles.selectedCategoryName,
                        isDisabled && styles.disabledCategoryName
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                >
                    {item.name}
                </Text>
                
                {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                )}
                
                {isDisabled && (
                    <Text style={styles.disabledIndicator}>🔒</Text>
                )}
            </TouchableOpacity>
        );
    };

    const renderCustomCategoryItem = ({ item }: { item: QuickCategory }) => {
        return (
            <View style={[styles.categoryItem, styles.customCategoryItem]}>
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={[styles.categoryName, styles.customCategoryName]}>
                    {item.name}
                </Text>
                {onRemoveCustomCategory && (
                    <TouchableOpacity
                        onPress={() => onRemoveCustomCategory(item.name)}
                        style={styles.removeCustomCategoryButton}
                    >
                        <Text style={styles.removeCustomCategoryIcon}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // Create header component for FlatList
    const ListHeaderComponent = () => (
        <View>
            {showHeader && (
                <>
                    <Text style={styles.title}>{headerTitle}</Text>
                    
                    {headerSubtitle && (
                        <Text style={styles.subtitle}>
                            {headerSubtitle}
                        </Text>
                    )}
                    
                    <Text style={styles.selectedCount}>
                        נבחרו: {selectedCategories.length + customCategories.length}/{maxCategories} קטגוריות
                    </Text>
                    
                    {helpText && (
                        <Text style={styles.helpText}>
                            {helpText}
                        </Text>
                    )}
                </>
            )}
            
            {/* Custom Categories Section */}
            {showCustomCategories && customCategories.length > 0 && (
                <View style={styles.customCategoriesSection}>
                    <Text style={styles.customCategoriesTitle}>קטגוריות מותאמות אישית:</Text>
                    <FlatList
                        data={customCategories}
                        renderItem={renderCustomCategoryItem}
                        keyExtractor={(item) => item.name}
                        style={styles.customCategoriesList}
                        numColumns={2}
                        columnWrapperStyle={customCategories.length > 1 ? styles.categoriesRow : undefined}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                    />
                </View>
            )}
            
            {/* Add Custom Category Button */}
            {showAddCustomButton && onAddCustomCategory && (
                <TouchableOpacity
                    style={[
                        styles.addCustomCategoryButton,
                        (selectedCategories.length + customCategories.length >= maxCategories) && styles.disabledAddButton
                    ]}
                    onPress={() => {
                        onAddCustomCategory();
                    }}
                    disabled={selectedCategories.length + customCategories.length >= maxCategories}
                >
                    <Text style={styles.addCustomCategoryIcon}>+</Text>
                    <Text style={styles.addCustomCategoryText}>הוסף קטגוריה מותאמת אישית</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <FlatList
            data={getAllAvailableCategories()}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.name}
            style={styles.categoriesList}
            numColumns={2}
            columnWrapperStyle={styles.categoriesRow}
            showsVerticalScrollIndicator={true}
            ListHeaderComponent={ListHeaderComponent}
            ListHeaderComponentStyle={styles.listHeaderStyle}
        />
    );
};

const styles = StyleSheet.create({
    categoriesList: {
        flex: 1,
    },
    listHeaderStyle: {
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 12,
        textAlign: 'center',
        fontWeight: '500',
    },
    selectedCount: {
        fontSize: 16,
        color: '#4caf50',
        marginBottom: 12,
        textAlign: 'center',
        fontWeight: '600',
        backgroundColor: '#e8f5e8',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 22,
        alignSelf: 'center',
    },
    helpText: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 20,
        backgroundColor: '#f8f9fa',
        padding: 14,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    categoriesRow: {
        justifyContent: 'space-around',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginVertical: 6,
        backgroundColor: '#fafbfc',
        borderWidth: 2,
        borderColor: '#e0e6ed',
        width: '48%',
        minHeight: 75,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedCategoryItem: {
        backgroundColor: '#e8f5e8',
        borderWidth: 2,
        borderColor: '#4caf50',
        shadowColor: '#4caf50',
        shadowOpacity: 0.2,
    },
    categoryIcon: {
        fontSize: 20,
        marginRight: 6,
        minWidth: 26,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
        flex: 1,
        flexWrap: 'wrap',
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    selectedCategoryName: {
        color: '#4caf50',
        fontWeight: 'bold',
    },
    disabledCategoryItem: {
        backgroundColor: '#f5f5f5',
        borderColor: '#ddd',
        opacity: 0.6,
    },
    disabledCategoryName: {
        color: '#999',
    },
    checkmark: {
        fontSize: 18,
        color: '#4caf50',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    disabledIndicator: {
        fontSize: 16,
        color: '#999',
        marginLeft: 8,
    },
    customCategoriesSection: {
        marginBottom: 16,
    },
    customCategoriesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
        textAlign: 'right',
    },
    customCategoriesList: {
        flexShrink: 1,
    },
    customCategoryItem: {
        backgroundColor: '#e8f5e8',
        borderColor: '#4caf50',
    },
    customCategoryName: {
        color: '#4caf50',
        fontWeight: 'bold',
    },
    removeCustomCategoryButton: {
        padding: 4,
        marginLeft: 8,
    },
    removeCustomCategoryIcon: {
        fontSize: 16,
        color: '#e74c3c',
        fontWeight: 'bold',
    },
    addCustomCategoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    disabledAddButton: {
        backgroundColor: '#bdc3c7',
        opacity: 0.6,
    },
    addCustomCategoryIcon: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
        marginRight: 8,
    },
    addCustomCategoryText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default CategorySelector;
