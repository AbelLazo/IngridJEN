import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 80) / 7);

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

interface ModernDatePickerProps {
    /** 'range' for selecting start+end together, 'single' for one date */
    mode?: 'range' | 'single';
    /** Date string in YYYY-MM-DD format */
    startDate?: string;
    /** Date string in YYYY-MM-DD format (only used in range mode) */
    endDate?: string;
    /** Called when date(s) are confirmed */
    onConfirm: (startDate: string, endDate?: string) => void;
    /** Called when picker is dismissed */
    onCancel: () => void;
    /** Whether the picker is visible */
    visible: boolean;
    /** Title shown at top */
    title?: string;
    /** Custom colors (uses theme by default) */
    colors?: typeof Colors.light;
}

function parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = parseDate(dateStr);
    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()].substring(0, 3);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

function isSameDay(a: string, b: string) {
    return a === b;
}

function isInRange(dateStr: string, start: string, end: string): boolean {
    if (!start || !end) return false;
    const d = parseDate(dateStr).getTime();
    const s = parseDate(start).getTime();
    const e = parseDate(end).getTime();
    return d > s && d < e;
}

export default function ModernDatePicker({
    mode = 'single',
    startDate: initialStart = '',
    endDate: initialEnd = '',
    onConfirm,
    onCancel,
    visible,
    title = 'Seleccionar Fecha',
    colors: propColors,
}: ModernDatePickerProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = propColors || Colors[colorScheme as keyof typeof Colors];

    const today = new Date();
    const initialMonth = initialStart
        ? parseDate(initialStart).getMonth()
        : today.getMonth();
    const initialYear = initialStart
        ? parseDate(initialStart).getFullYear()
        : today.getFullYear();

    const [currentMonth, setCurrentMonth] = useState(initialMonth);
    const [currentYear, setCurrentYear] = useState(initialYear);
    const [selectedStart, setSelectedStart] = useState(initialStart);
    const [selectedEnd, setSelectedEnd] = useState(initialEnd);
    const [selectingPhase, setSelectingPhase] = useState<'start' | 'end'>(
        mode === 'range' ? 'start' : 'start'
    );

    // Reset state when modal opens
    React.useEffect(() => {
        if (visible) {
            setSelectedStart(initialStart);
            setSelectedEnd(initialEnd);
            setSelectingPhase(mode === 'range' ? (initialStart && !initialEnd ? 'end' : 'start') : 'start');
            if (initialStart) {
                const d = parseDate(initialStart);
                setCurrentMonth(d.getMonth());
                setCurrentYear(d.getFullYear());
            } else {
                setCurrentMonth(today.getMonth());
                setCurrentYear(today.getFullYear());
            }
        }
    }, [visible]);

    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const daysInMonth = useMemo(() => {
        return new Date(currentYear, currentMonth + 1, 0).getDate();
    }, [currentMonth, currentYear]);

    const firstDayOfWeek = useMemo(() => {
        const d = new Date(currentYear, currentMonth, 1).getDay();
        return d === 0 ? 6 : d - 1; // Monday = 0
    }, [currentMonth, currentYear]);

    const handleDayPress = useCallback((day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (mode === 'single') {
            setSelectedStart(dateStr);
            setSelectedEnd('');
        } else {
            // Range mode
            if (selectingPhase === 'start') {
                setSelectedStart(dateStr);
                setSelectedEnd('');
                setSelectingPhase('end');
            } else {
                // If end < start, swap
                if (parseDate(dateStr).getTime() < parseDate(selectedStart).getTime()) {
                    setSelectedEnd(selectedStart);
                    setSelectedStart(dateStr);
                } else {
                    setSelectedEnd(dateStr);
                }
                setSelectingPhase('start');
            }
        }
    }, [mode, selectingPhase, selectedStart, currentMonth, currentYear]);

    const handleConfirm = () => {
        if (mode === 'single') {
            if (selectedStart) onConfirm(selectedStart);
        } else {
            if (selectedStart && selectedEnd) onConfirm(selectedStart, selectedEnd);
        }
    };

    const canConfirm = mode === 'single'
        ? !!selectedStart
        : !!(selectedStart && selectedEnd);

    const renderCalendarGrid = () => {
        const rows = [];
        let cells = [];

        // Empty cells for offset
        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isStart = selectedStart && isSameDay(dateStr, selectedStart);
            const isEnd = selectedEnd && isSameDay(dateStr, selectedEnd);
            const isRange = selectedStart && selectedEnd && isInRange(dateStr, selectedStart, selectedEnd);
            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
            const isSelected = isStart || isEnd;

            cells.push(
                <TouchableOpacity
                    key={day}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                    style={[
                        styles.dayCell,
                        isRange && { backgroundColor: colors.tint + '15' },
                        isStart && mode === 'range' && selectedEnd && { borderTopLeftRadius: DAY_SIZE / 2, borderBottomLeftRadius: DAY_SIZE / 2, backgroundColor: colors.tint + '15' },
                        isEnd && mode === 'range' && { borderTopRightRadius: DAY_SIZE / 2, borderBottomRightRadius: DAY_SIZE / 2, backgroundColor: colors.tint + '15' },
                    ]}
                >
                    <View style={[
                        styles.dayInner,
                        isSelected && { backgroundColor: colors.tint },
                        isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.tint },
                    ]}>
                        <Text style={[
                            styles.dayText,
                            { color: colors.text },
                            isSelected && { color: '#fff', fontWeight: '700' },
                            isToday && !isSelected && { color: colors.tint, fontWeight: '700' },
                        ]}>
                            {day}
                        </Text>
                    </View>
                </TouchableOpacity>
            );

            if ((firstDayOfWeek + day) % 7 === 0 || day === daysInMonth) {
                // Fill remaining cells
                if (day === daysInMonth) {
                    const remaining = 7 - cells.length % 7;
                    if (remaining < 7) {
                        for (let i = 0; i < remaining; i++) {
                            cells.push(<View key={`end-empty-${i}`} style={styles.dayCell} />);
                        }
                    }
                }
                rows.push(
                    <View key={`row-${rows.length}`} style={styles.weekRow}>
                        {cells}
                    </View>
                );
                cells = [];
            }
        }

        return rows;
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} statusBarTranslucent animationType="none">
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.overlay}
            >
                <TouchableOpacity style={styles.backdrop} onPress={onCancel} activeOpacity={1} />
                <Animated.View
                    entering={SlideInDown.springify().damping(20).stiffness(140)}
                    exiting={SlideOutDown.duration(200)}
                    style={[styles.container, { backgroundColor: colors.modal }]}
                >
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                            <X size={20} color={colors.icon} />
                        </TouchableOpacity>
                    </View>

                    {/* Range mode: show which phase */}
                    {mode === 'range' && (
                        <View style={styles.rangeIndicator}>
                            <TouchableOpacity
                                onPress={() => setSelectingPhase('start')}
                                style={[
                                    styles.rangeTab,
                                    { borderColor: selectingPhase === 'start' ? colors.tint : colors.border },
                                    selectingPhase === 'start' && { backgroundColor: colors.tint + '10' },
                                ]}
                            >
                                <Text style={{ fontSize: 11, color: colors.icon, marginBottom: 2 }}>Inicio</Text>
                                <Text style={[
                                    styles.rangeDate,
                                    { color: selectedStart ? colors.text : colors.icon },
                                    selectingPhase === 'start' && { color: colors.tint },
                                ]}>
                                    {selectedStart ? formatDisplayDate(selectedStart) : 'Seleccionar'}
                                </Text>
                            </TouchableOpacity>

                            <View style={[styles.rangeDivider, { backgroundColor: colors.border }]} />

                            <TouchableOpacity
                                onPress={() => { if (selectedStart) setSelectingPhase('end'); }}
                                style={[
                                    styles.rangeTab,
                                    { borderColor: selectingPhase === 'end' ? colors.tint : colors.border },
                                    selectingPhase === 'end' && { backgroundColor: colors.tint + '10' },
                                ]}
                            >
                                <Text style={{ fontSize: 11, color: colors.icon, marginBottom: 2 }}>Fin</Text>
                                <Text style={[
                                    styles.rangeDate,
                                    { color: selectedEnd ? colors.text : colors.icon },
                                    selectingPhase === 'end' && { color: colors.tint },
                                ]}>
                                    {selectedEnd ? formatDisplayDate(selectedEnd) : 'Seleccionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Month navigation */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={goToPrevMonth} style={[styles.navBtn, { backgroundColor: colors.tint + '10' }]}>
                            <ChevronLeft size={20} color={colors.tint} />
                        </TouchableOpacity>
                        <Text style={[styles.monthTitle, { color: colors.text }]}>
                            {MONTH_NAMES[currentMonth]} {currentYear}
                        </Text>
                        <TouchableOpacity onPress={goToNextMonth} style={[styles.navBtn, { backgroundColor: colors.tint + '10' }]}>
                            <ChevronRight size={20} color={colors.tint} />
                        </TouchableOpacity>
                    </View>

                    {/* Day names */}
                    <View style={styles.weekRow}>
                        {DAY_NAMES.map((name, i) => (
                            <View key={i} style={styles.dayCell}>
                                <Text style={[styles.dayName, { color: colors.icon }]}>{name}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar grid */}
                    <View style={styles.calendarGrid}>
                        {renderCalendarGrid()}
                    </View>

                    {/* Confirm button */}
                    <TouchableOpacity
                        style={[
                            styles.confirmBtn,
                            { backgroundColor: canConfirm ? colors.tint : colors.border },
                        ]}
                        onPress={handleConfirm}
                        disabled={!canConfirm}
                        activeOpacity={0.8}
                    >
                        <Calendar size={18} color={canConfirm ? '#fff' : colors.icon} style={{ marginRight: 8 }} />
                        <Text style={[styles.confirmText, { color: canConfirm ? '#fff' : colors.icon }]}>
                            {mode === 'range' ? 'Confirmar Rango' : 'Confirmar Fecha'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingBottom: 34,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    rangeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
        gap: 12,
    },
    rangeTab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderRadius: 14,
        alignItems: 'center',
    },
    rangeDate: {
        fontSize: 14,
        fontWeight: '600',
    },
    rangeDivider: {
        width: 20,
        height: 2,
        borderRadius: 1,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    weekRow: {
        flexDirection: 'row',
    },
    dayCell: {
        flex: 1,
        aspectRatio: 1,
        maxHeight: DAY_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayInner: {
        width: DAY_SIZE - 8,
        height: DAY_SIZE - 8,
        borderRadius: (DAY_SIZE - 8) / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayName: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    calendarGrid: {
        marginBottom: 16,
    },
    confirmBtn: {
        flexDirection: 'row',
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
