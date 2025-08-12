import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BOARD_TYPES, QuickCategory } from '../constants/boardTypes';
import { useBoard } from '../contexts/BoardContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { apiService } from '../services/api';

interface CategoryManagerProps {
    visible: boolean;
    onClose: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ visible, onClose }) => {
    const { selectedBoard, refreshBoardData } = useBoard();
    const { refreshBoardCategories } = useExpenses();
    const [selectedCategories, setSelectedCategories] = useState<QuickCategory[]>([]);
    const [currentCategories, setCurrentCategories] = useState<QuickCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Get all available categories (current board type first, then all others)
    const getAllAvailableCategories = () => {
        if (!selectedBoard) return [];
        
        // Find the current board type
        const currentBoardType = BOARD_TYPES.find(type => type.id === selectedBoard.board_type);
        
        const allCategories: QuickCategory[] = [];
        const addedNames = new Set<string>();
        
        // First: Add categories from current board type (priority)
        if (currentBoardType) {
            currentBoardType.quickCategories.forEach(category => {
                if (!addedNames.has(category.name)) {
                    allCategories.push(category);
                    addedNames.add(category.name);
                }
            });
        }
        
        // Second: Add categories from all other board types
        BOARD_TYPES.forEach(boardType => {
            if (boardType.id !== selectedBoard.board_type) {
                boardType.quickCategories.forEach(category => {
                    if (!addedNames.has(category.name)) {
                        allCategories.push(category);
                        addedNames.add(category.name);
                    }
                });
            }
        });
        
        // Third: Add additional common/useful categories
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
        ];
        
        additionalCategories.forEach(category => {
            if (!addedNames.has(category.name)) {
                allCategories.push(category);
                addedNames.add(category.name);
            }
        });
        
        return allCategories;
    };

    // Load current categories from the server
    const loadCurrentCategories = async () => {
        if (!selectedBoard) return;
        
        setIsLoading(true);
        try {
            const result = await apiService.getBoardCategories(selectedBoard.id);
            if (result.success && result.data) {
                // Convert server categories to QuickCategory format
                const serverCategories: QuickCategory[] = result.data.categories.map(cat => ({
                    name: cat.name,
                    icon: cat.icon,
                    color: cat.color
                }));
                setCurrentCategories(serverCategories);
                setSelectedCategories([...serverCategories]);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            Alert.alert('שגיאה', 'שגיאה בטעינת הקטגוריות');
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize when modal opens
    useEffect(() => {
        if (visible && selectedBoard) {
            loadCurrentCategories();
        }
    }, [visible, selectedBoard]);

    const handleCategoryToggle = (category: QuickCategory) => {
        setSelectedCategories(prev => {
            const isSelected = prev.some(cat => cat.name === category.name);
            if (isSelected) {
                return prev.filter(cat => cat.name !== category.name);
            } else {
                // Check if we already have 7 categories selected
                if (prev.length >= 7) {
                    Alert.alert('שגיאה', 'ניתן לבחור עד 7 קטגוריות בלבד');
                    return prev;
                }
                return [...prev, category];
            }
        });
    };

    const handleSave = async () => {
        if (!selectedBoard) return;

        if (selectedCategories.length === 0) {
            Alert.alert('שגיאה', 'נא לבחור לפחות קטגוריה אחת');
            return;
        }

        if (selectedCategories.length > 7) {
            Alert.alert('שגיאה', 'ניתן לבחור עד 7 קטגוריות בלבד');
            return;
        }

        setIsSaving(true);
        try {
            const result = await apiService.updateBoardCategories(selectedBoard.id, selectedCategories);
            if (result.success) {
                // Close modal first
                onClose();
                
                Alert.alert('הצלחה', 'הקטגוריות עודכנו בהצלחה');
                
                // Wait 500ms and then refresh all board data to ensure categories are updated everywhere
                setTimeout(async () => {
                    try {
                        console.log('🔄 CategoryManager: Refreshing all board data after category update...');
                        
                        // Refresh the board data to get updated categories
                        if (refreshBoardData) {
                            await refreshBoardData();
                            console.log('✅ CategoryManager: Board data refreshed successfully');
                        }
                        
                        // Also refresh the expense context categories (for quick categories)
                        if (refreshBoardCategories) {
                            await refreshBoardCategories();
                            console.log('✅ CategoryManager: Expense categories refreshed successfully');
                        }
                        
                        // Force reload current categories for this modal
                        await loadCurrentCategories();
                        console.log('✅ CategoryManager: Current categories reloaded');
                        
                        // Trigger a re-render by forcing a small delay and re-loading
                        setTimeout(async () => {
                            await loadCurrentCategories();
                            console.log('✅ CategoryManager: Double refresh completed');
                        }, 100);
                        
                    } catch (error) {
                        console.error('❌ CategoryManager: Error refreshing board data:', error);
                    }
                }, 500);
            } else {
                Alert.alert('שגיאה', result.error || 'שגיאה בעדכון הקטגוריות');
            }
        } catch (error) {
            console.error('Error updating categories:', error);
            Alert.alert('שגיאה', 'שגיאה בעדכון הקטגוריות');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to current categories
        setSelectedCategories([...currentCategories]);
        onClose();
    };

    const renderCategoryItem = ({ item }: { item: QuickCategory }) => {
        const isSelected = selectedCategories.some(cat => cat.name === item.name);
        return (
            <TouchableOpacity
                style={[
                    styles.categoryItem,
                    isSelected && styles.selectedCategoryItem,
                ]}
                onPress={() => handleCategoryToggle(item)}
            >
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={[
                    styles.categoryName,
                    isSelected && styles.selectedCategoryName
                ]}>{item.name}</Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
        );
    };

    const boardType = selectedBoard ? BOARD_TYPES.find(type => type.id === selectedBoard.board_type) : null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleCancel}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>ניהול קטגוריות</Text>
                        {boardType && (
                            <Text style={styles.subtitle}>
                                קטגוריות עבור לוח "{boardType.name}"
                            </Text>
                        )}
                        <Text style={styles.selectedCount}>
                            נבחרו: {selectedCategories.length}/7 קטגוריות
                        </Text>
                        <Text style={styles.helpText}>
                            בחר עד 7 קטגוריות שיופיעו בלוח. למעלה: קטגוריות מתאימות לסוג הלוח. למטה: כל הקטגוריות הזמינות. "אחר" יופיע אוטומטית.
                        </Text>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>טוען קטגוריות...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={getAllAvailableCategories()}
                            renderItem={renderCategoryItem}
                            keyExtractor={(item) => item.name}
                            style={styles.categoriesList}
                            numColumns={2}
                            columnWrapperStyle={styles.categoriesRow}
                            showsVerticalScrollIndicator={false}
                        />
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>ביטול</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.saveButton, (isSaving || selectedCategories.length === 0 || selectedCategories.length > 7) && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={isSaving || selectedCategories.length === 0 || selectedCategories.length > 7}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSaving ? 'שומר...' : 'שמור'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#777',
        marginBottom: 8,
    },
    selectedCount: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    helpText: {
        fontSize: 12,
        color: '#777',
        textAlign: 'center',
        lineHeight: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#777',
    },
    categoriesList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    categoriesRow: {
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginVertical: 5,
        backgroundColor: '#f0f0f0',
        flex: 0.45,
    },
    selectedCategoryItem: {
        backgroundColor: '#ebf3fd',
        borderWidth: 1,
        borderColor: '#2ecc71',
    },
    categoryIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
    },
    selectedCategoryName: {
        color: '#2ecc71',
    },
    checkmark: {
        fontSize: 16,
        color: '#2ecc71',
        marginLeft: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    cancelButton: {
        backgroundColor: '#ecf0f1',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
    },
    cancelButtonText: {
        color: '#7f8c8d',
        fontSize: 16,
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CategoryManager;