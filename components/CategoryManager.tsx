import React, { useEffect, useState } from 'react';
import {
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
import { BOARD_TYPES, QuickCategory } from '../constants/boardTypes';
import { useBoard } from '../contexts/BoardContext';
import { useExpenses } from '../contexts/ExpenseContext';
import { apiService } from '../services/api';
import CategorySelector from './CategorySelector';

interface CategoryManagerProps {
    visible: boolean;
    onClose: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ visible, onClose }) => {
    const { selectedBoard, refreshBoardData } = useBoard();
    const { refreshBoardCategories } = useExpenses();
    const [selectedCategories, setSelectedCategories] = useState<QuickCategory[]>([]);
    const [currentCategories, setCurrentCategories] = useState<QuickCategory[]>([]);
    const [customCategories, setCustomCategories] = useState<QuickCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
    const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
    const [selectedCustomIcon, setSelectedCustomIcon] = useState('📝');

    const availableIcons = [
        '📝', '💰', '🛒', '🍕', '⛽', '🏠', '🚗', '📱', '🎬', '👕',
        '🏥', '💊', '🎓', '📚', '✈️', '🏖️', '🎁', '🎉', '⚽', '🎮',
        '🍷', '☕', '🍔', '🍜', '🛍️', '💄', '🔧', '🏦', '📊', '💼',
        '🎨', '🎵', '📷', '🌱', '🐕', '🐱', '🚲', '🏃', '💪', '🧘',
        '🍎', '🥗', '🍰', '🧸', '📦', '🔑', '🛡️', '⚖️', '📋', '💝'
    ];

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
                // Always clear custom categories when loading from server
                setCustomCategories([]);
                console.log('🧹 CategoryManager: Cleared custom categories when loading from server');
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
                // Check if we already have 7 categories selected (including custom categories)
                const totalSelected = prev.length + customCategories.length;
                if (totalSelected >= 7) {
                    Alert.alert('שגיאה', 'ניתן לבחור עד 7 קטגוריות בלבד');
                    return prev;
                }
                
                // Double-check for duplicates (shouldn't happen but safety first)
                if (prev.some(cat => cat.name.toLowerCase() === category.name.toLowerCase())) {
                    console.warn('⚠️ Attempted to add duplicate category:', category.name);
                    return prev;
                }
                
                return [...prev, category];
            }
        });
    };

    const handleSave = async () => {
        if (!selectedBoard) return;

        const totalCategories = selectedCategories.length + customCategories.length;
        if (totalCategories === 0) {
            Alert.alert('שגיאה', 'נא לבחור לפחות קטגוריה אחת');
            return;
        }

        if (totalCategories > 7) {
            Alert.alert('שגיאה', 'ניתן לבחור עד 7 קטגוריות בלבד');
            return;
        }

        setIsSaving(true);
        try {
            const allCategories = [...selectedCategories, ...customCategories];
            const result = await apiService.updateBoardCategories(selectedBoard.id, allCategories);
            if (result.success) {
                console.log('✅ CategoryManager: Categories updated successfully');
                
                // Clear custom categories since they're now saved to server
                setCustomCategories([]);
                console.log('🧹 CategoryManager: Cleared local custom categories after successful save');
                
                // Close modal first
                onClose();
                
                Alert.alert('הצלחה', 'הקטגוריות עודכנו בהצלחה');
                
                // Single coordinated refresh to prevent duplication
                setTimeout(async () => {
                    try {
                        console.log('🔄 CategoryManager: Starting coordinated refresh after category update...');
                        
                        // First refresh board data (includes categories)
                        if (refreshBoardData) {
                            await refreshBoardData();
                            console.log('✅ CategoryManager: Board data refreshed');
                        }
                        
                        // Then refresh expense context categories (for quick categories)
                        if (refreshBoardCategories) {
                            await refreshBoardCategories();
                            console.log('✅ CategoryManager: Expense categories refreshed');
                        }
                        
                        console.log('✅ CategoryManager: All refreshes completed successfully');
                        
                    } catch (error) {
                        console.error('❌ CategoryManager: Error refreshing data:', error);
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

    const handleRemoveCustomCategory = (categoryName: string) => {
        setCustomCategories(prev => prev.filter(cat => cat.name !== categoryName));
    };

    const handleOpenCustomCategoryModal = () => {
        const totalSelected = selectedCategories.length + customCategories.length;
        if (totalSelected >= 7) {
            Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד. בטל בחירה של קטגוריה אחרת כדי להוסיף חדשה.');
            return;
        }
        setShowCustomCategoryModal(true);
    };

    const handleAddCustomCategory = () => {
        if (!newCustomCategoryName.trim()) {
            Alert.alert('שגיאה', 'נא להזין שם לקטגוריה');
            return;
        }

        // Check if category name already exists (including current categories from server)
        const allCategories = [...selectedCategories, ...customCategories, ...currentCategories];
        if (allCategories.some(cat => cat.name.toLowerCase() === newCustomCategoryName.trim().toLowerCase())) {
            Alert.alert('שגיאה', 'קטגוריה עם השם הזה כבר קיימת');
            return;
        }

        // Check if we're at the limit
        const totalSelected = selectedCategories.length + customCategories.length;
        if (totalSelected >= 7) {
            Alert.alert('הגבלה', 'ניתן לבחור עד 7 קטגוריות בלבד');
            return;
        }

        const newCategory: QuickCategory = {
            name: newCustomCategoryName.trim(),
            icon: selectedCustomIcon,
            color: '#9370DB', // Default purple color
        };

        setCustomCategories(prev => [...prev, newCategory]);
        setShowCustomCategoryModal(false);
        setNewCustomCategoryName('');
        setSelectedCustomIcon('📝');
    };

    const handleCancel = () => {
        // Reset to current categories and clear custom categories
        setSelectedCategories([...currentCategories]);
        setCustomCategories([]);
        console.log('🧹 CategoryManager: Cleared custom categories on cancel');
        onClose();
    };


    const boardType = selectedBoard ? BOARD_TYPES.find(type => type.id === selectedBoard.board_type) : null;

    return (
        <View>
            <Modal
                visible={visible && !showCustomCategoryModal}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>טוען קטגוריות...</Text>
                            </View>
                        ) : (
                            <View style={styles.categorySelectorContainer}>
                                <CategorySelector
                                    selectedBoardType={boardType}
                                    selectedCategories={selectedCategories}
                                    customCategories={customCategories}
                                    existingCategories={currentCategories}
                                    onCategoryToggle={handleCategoryToggle}
                                    onRemoveCustomCategory={handleRemoveCustomCategory}
                                    onAddCustomCategory={handleOpenCustomCategoryModal}
                                    maxCategories={7}
                                    showCustomCategories={true}
                                    showAddCustomButton={true}
                                    showHeader={true}
                                    headerTitle="ניהול קטגוריות"
                                    headerSubtitle={boardType ? `קטגוריות עבור לוח "${boardType.name}"` : undefined}
                                    helpText="בחר עד 7 קטגוריות עבור הלוח שלך. הקטגוריות הקיימות מוצגות בראש הרשימה."
                                />
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonText}>ביטול</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.saveButton, (isSaving || (selectedCategories.length + customCategories.length === 0) || (selectedCategories.length + customCategories.length > 7)) && styles.disabledButton]}
                                onPress={handleSave}
                                disabled={isSaving || (selectedCategories.length + customCategories.length === 0) || (selectedCategories.length + customCategories.length > 7)}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSaving ? 'שומר...' : 'שמור'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {/* Custom Category Modal */}
            <Modal
                visible={showCustomCategoryModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCustomCategoryModal(false)}
            >
                <View style={styles.customCategoryModalOverlay}>
                    <View style={styles.customCategoryModalContent}>
                        <Text style={styles.customCategoryModalTitle}>הוסף קטגוריה מותאמת אישית</Text>
                        
                        <TextInput
                            style={styles.customCategoryInput}
                            placeholder="שם הקטגוריה"
                            value={newCustomCategoryName}
                            onChangeText={setNewCustomCategoryName}
                            textAlign="right"
                            maxLength={20}
                        />
                        
                        <Text style={styles.iconSelectorTitle}>בחר אייקון:</Text>
                        
                        <ScrollView style={styles.iconSelector} showsVerticalScrollIndicator={false}>
                            <FlatList
                                data={availableIcons}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.iconItem,
                                            selectedCustomIcon === item && styles.selectedIconItem
                                        ]}
                                        onPress={() => setSelectedCustomIcon(item)}
                                    >
                                        <Text style={styles.iconText}>{item}</Text>
                                    </TouchableOpacity>
                                )}
                                keyExtractor={(item) => item}
                                numColumns={5}
                                columnWrapperStyle={styles.iconRow}
                                scrollEnabled={false}
                            />
                        </ScrollView>
                        
                        <View style={styles.customCategoryModalButtons}>
                            <TouchableOpacity
                                style={[styles.customCategoryButton, styles.customCategoryCancelButton]}
                                onPress={() => {
                                    setShowCustomCategoryModal(false);
                                    setNewCustomCategoryName('');
                                    setSelectedCustomIcon('📝');
                                }}
                            >
                                <Text style={styles.customCategoryCancelText}>ביטול</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[
                                    styles.customCategoryButton, 
                                    styles.customCategoryAddButton,
                                    !newCustomCategoryName.trim() && styles.disabledCustomCategoryButton
                                ]}
                                onPress={handleAddCustomCategory}
                                disabled={!newCustomCategoryName.trim()}
                            >
                                <Text style={styles.customCategoryAddText}>הוסף</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
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
        maxWidth: 500,
        height: '80%',
        flexDirection: 'column',
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
    categorySelectorContainer: {
        flex: 1,
        marginBottom: 20,
        minHeight: 0,
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
    customCategoryModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    customCategoryModalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        maxHeight: '70%',
    },
    customCategoryModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 20,
    },
    customCategoryInput: {
        borderWidth: 2,
        borderColor: '#e0e6ed',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#fafbfc',
    },
    iconSelectorTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 12,
        textAlign: 'right',
    },
    iconSelector: {
        maxHeight: 200,
        marginBottom: 20,
    },
    iconRow: {
        justifyContent: 'space-around',
        marginBottom: 12,
    },
    iconItem: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e0e6ed',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
    },
    selectedIconItem: {
        backgroundColor: '#e8f5e8',
        borderColor: '#4caf50',
    },
    iconText: {
        fontSize: 24,
    },
    customCategoryModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    customCategoryButton: {
        width: '48%',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    customCategoryCancelButton: {
        backgroundColor: '#ecf0f1',
    },
    customCategoryCancelText: {
        color: '#7f8c8d',
        fontSize: 16,
        fontWeight: 'bold',
    },
    customCategoryAddButton: {
        backgroundColor: '#2ecc71',
    },
    customCategoryAddText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledCustomCategoryButton: {
        backgroundColor: '#bdc3c7',
        opacity: 0.6,
    },
});

export default CategoryManager;