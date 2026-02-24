import { Colors } from '@/constants/theme';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Calendar, Check, ChevronDown, ChevronLeft, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PeriodHeaderProps {
    title: string;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

export default function PeriodHeader({ title, onBack, rightAction }: PeriodHeaderProps) {
    const { academicCycles, currentCycleId, setCurrentCycleId } = useInstitution();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const currentCycle = academicCycles.find(c => c.id === currentCycleId);

    const handleSelectCycle = (id: string) => {
        setCurrentCycleId(id);
        setIsMenuVisible(false);
    };

    return (
        <View style={[styles.header, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
            <View style={styles.topRow}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <ChevronLeft size={28} color={colors.text} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.centerContainer}
                    onPress={() => setIsMenuVisible(true)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                    <View style={[styles.periodBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Calendar size={12} color={colors.primary} />
                        <Text style={[styles.periodText, { color: colors.primary }]}>
                            {currentCycle?.name || 'Periodo'}
                        </Text>
                        <ChevronDown size={14} color={colors.primary} />
                    </View>
                </TouchableOpacity>

                <View style={styles.rightActionContainer}>
                    {rightAction}
                </View>
            </View>

            {/* Dropdown Menu Modal */}
            <Modal
                visible={isMenuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                            <View style={styles.menuHeader}>
                                <Text style={[styles.menuTitle, { color: colors.text }]}>Seleccionar Período</Text>
                                <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                                    <X size={20} color={colors.icon} />
                                </TouchableOpacity>
                            </View>

                            {academicCycles.map((cycle) => {
                                const isSelected = cycle.id === currentCycleId;
                                return (
                                    <TouchableOpacity
                                        key={cycle.id}
                                        style={[
                                            styles.menuItem,
                                            isSelected && { backgroundColor: colors.primary + '10' }
                                        ]}
                                        onPress={() => handleSelectCycle(cycle.id)}
                                    >
                                        <View style={styles.menuItemContent}>
                                            <Calendar size={18} color={isSelected ? colors.primary : colors.icon} />
                                            <Text style={[
                                                styles.cycleName,
                                                { color: isSelected ? colors.primary : colors.text },
                                                isSelected && { fontWeight: 'bold' }
                                            ]}>
                                                {cycle.name}
                                            </Text>
                                        </View>
                                        {isSelected && <Check size={18} color={colors.primary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 0,
        zIndex: 100,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    periodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    periodText: {
        fontSize: 12,
        fontWeight: '700',
    },
    rightActionContainer: {
        width: 40,
        alignItems: 'flex-end',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-start',
    },
    menuContainer: {
        marginTop: 100, // Adjust based on header height
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
        marginVertical: 2,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cycleName: {
        fontSize: 15,
    },
});
