import { Colors } from '@/constants/theme';
import { useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import { Calendar, Check, ChevronDown, ChevronLeft, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PeriodHeaderProps {
    title: string;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

export default function PeriodHeader({ title, onBack, rightAction }: PeriodHeaderProps) {
    const { academicCycles, currentCycleId, setCurrentCycleId } = useInstitution();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
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
                    <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colorScheme === 'light' ? '#FFF0F5' : '#FFFFFF20', borderWidth: 1, borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF40' }]}>
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                )}

                <View style={[styles.contentContainer, { marginLeft: onBack ? 15 : 0 }]}>
                    <Text style={[styles.greeting, { color: colors.text }]}>{title}</Text>

                    <TouchableOpacity
                        style={[styles.infoChip, { backgroundColor: colorScheme === 'light' ? '#FFF0F5' : '#FFFFFF15' }]}
                        onPress={() => setIsMenuVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Calendar size={14} color={colors.tint} />
                        <Text style={[styles.infoChipText, { color: colors.text }]}>
                            {currentCycle?.name || 'Seleccionar Período'}
                        </Text>
                        <View style={[styles.badgeArrow, { backgroundColor: colors.tint + '15' }]}>
                            <ChevronDown size={14} color={colors.tint} />
                        </View>
                    </TouchableOpacity>
                </View>

                {rightAction && (
                    <View style={styles.rightActionContainer}>
                        {rightAction}
                    </View>
                )}
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
                        <BlurView
                            intensity={95}
                            tint={colorScheme === 'light' ? 'light' : 'dark'}
                            style={[
                                styles.menuContainer,
                                {
                                    backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 15, 15, 0.85)',
                                    borderColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.15)',
                                }
                            ]}
                        >
                            <View style={styles.liquidHighlight} />
                            <View style={styles.menuHeader}>
                                <Text style={[styles.menuTitle, { color: colors.text }]}>Seleccionar Período</Text>
                                <TouchableOpacity onPress={() => setIsMenuVisible(false)} style={styles.closeButton}>
                                    <X size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.menuList}>
                                {academicCycles.map((cycle) => {
                                    const isSelected = cycle.id === currentCycleId;
                                    return (
                                        <TouchableOpacity
                                            key={cycle.id}
                                            style={[
                                                styles.menuItem,
                                                isSelected && {
                                                    backgroundColor: colors.tint,
                                                    shadowColor: colors.tint,
                                                    shadowOffset: { width: 0, height: 4 },
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 8,
                                                    elevation: 4
                                                }
                                            ]}
                                            onPress={() => handleSelectCycle(cycle.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.menuItemContent}>
                                                <View style={[
                                                    styles.iconBg,
                                                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.tint + '15' }
                                                ]}>
                                                    <Calendar
                                                        size={16}
                                                        color={isSelected ? '#fff' : colors.text}
                                                    />
                                                </View>
                                                <Text style={[
                                                    styles.cycleName,
                                                    { color: isSelected ? '#fff' : colors.text },
                                                    isSelected && { fontWeight: '700' }
                                                ]}>
                                                    {cycle.name}
                                                </Text>
                                            </View>
                                            {isSelected ? (
                                                <Check size={18} color="#fff" />
                                            ) : (
                                                <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </BlurView>
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
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 6,
        gap: 8,
    },
    infoChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    badgeArrow: {
        padding: 2,
        borderRadius: 4,
    },
    rightActionContainer: {
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    menuContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 8,
        borderWidth: 1,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 15,
    },
    closeButton: {
        padding: 6,
        borderRadius: 12,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    menuList: {
        paddingHorizontal: 8,
        paddingBottom: 16,
        gap: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginHorizontal: 4,
    },
    iconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioEmpty: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        opacity: 0.3,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cycleName: {
        fontSize: 16,
    },
    liquidHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '30%',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
});
