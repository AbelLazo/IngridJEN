import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface PickerItem {
    label: string;
    value: string;
}

interface ModernPickerProps {
    selectedValue: string;
    onValueChange: (value: string) => void;
    items: PickerItem[];
    placeholder?: string;
    title?: string;
    searchable?: boolean;
    colors: {
        text: string;
        background: string;
        tint: string;
        icon: string;
        border: string;
        card: string;
        modal: string;
        [key: string]: string;
    };
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ModernPicker({
    selectedValue,
    onValueChange,
    items,
    placeholder = 'Seleccionar...',
    title = 'Seleccionar',
    searchable = false,
    colors,
}: ModernPickerProps) {
    const [visible, setVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const selectedItem = useMemo(
        () => items.find((item) => item.value === selectedValue),
        [items, selectedValue]
    );

    const filteredItems = useMemo(() => {
        if (!searchText.trim()) return items;
        const lower = searchText.toLowerCase();
        return items.filter((item) => item.label.toLowerCase().includes(lower));
    }, [items, searchText]);

    const openModal = () => {
        setVisible(true);
        setSearchText('');
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }),
            Animated.timing(backdropAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeModal = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            setSearchText('');
        });
    };

    const handleSelect = (value: string) => {
        onValueChange(value);
        closeModal();
    };

    const renderItem = ({ item }: { item: PickerItem }) => {
        const isSelected = item.value === selectedValue;
        return (
            <TouchableOpacity
                style={[
                    styles.optionItem,
                    {
                        backgroundColor: isSelected ? colors.tint + '12' : 'transparent',
                        borderColor: isSelected ? colors.tint + '30' : colors.border + '40',
                    },
                ]}
                onPress={() => handleSelect(item.value)}
                activeOpacity={0.6}
            >
                <Text
                    style={[
                        styles.optionLabel,
                        {
                            color: isSelected ? colors.tint : colors.text,
                            fontWeight: isSelected ? '700' : '400',
                        },
                    ]}
                    numberOfLines={1}
                >
                    {item.label}
                </Text>
                {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: colors.tint }]}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const maxModalHeight = SCREEN_HEIGHT * 0.55;

    return (
        <>
            {/* Trigger Button */}
            <TouchableOpacity
                style={[
                    styles.trigger,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                    },
                ]}
                onPress={openModal}
                activeOpacity={0.7}
            >
                <Text
                    style={[
                        styles.triggerText,
                        {
                            color: selectedItem ? colors.text : colors.icon,
                        },
                    ]}
                    numberOfLines={1}
                >
                    {selectedItem ? selectedItem.label : placeholder}
                </Text>
                <View style={[styles.chevronContainer, { backgroundColor: colors.tint + '15' }]}>
                    <ChevronDown size={18} color={colors.tint} />
                </View>
            </TouchableOpacity>

            {/* Modal */}
            <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
                <View style={styles.modalContainer}>
                    {/* Backdrop */}
                    <Animated.View
                        style={[
                            styles.backdrop,
                            { opacity: backdropAnim },
                        ]}
                    >
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            onPress={closeModal}
                            activeOpacity={1}
                        />
                    </Animated.View>

                    {/* Content */}
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: colors.modal,
                                maxHeight: maxModalHeight,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        {/* Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>
                                {title}
                            </Text>
                            <TouchableOpacity
                                onPress={closeModal}
                                style={[styles.closeButton, { backgroundColor: colors.background }]}
                            >
                                <X size={18} color={colors.icon} />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        {searchable && (
                            <View
                                style={[
                                    styles.searchContainer,
                                    {
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                    },
                                ]}
                            >
                                <Search size={18} color={colors.icon} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder="Buscar..."
                                    placeholderTextColor={colors.icon}
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    autoFocus={false}
                                />
                                {searchText.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchText('')}>
                                        <X size={16} color={colors.icon} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* List */}
                        <FlatList
                            data={filteredItems}
                            keyExtractor={(item) => item.value}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={[styles.emptyText, { color: colors.icon }]}>
                                        No se encontraron resultados
                                    </Text>
                                </View>
                            }
                        />
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 14,
        height: 52,
        paddingLeft: 16,
        paddingRight: 6,
    },
    triggerText: {
        fontSize: 15,
        flex: 1,
        marginRight: 8,
    },
    chevronContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 4,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 8,
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        padding: 0,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4,
        borderWidth: 1,
    },
    optionLabel: {
        fontSize: 15,
        flex: 1,
        marginRight: 8,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});
