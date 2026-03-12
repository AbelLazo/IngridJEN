import ModernDatePicker from '@/components/ModernDatePicker';
import ModernPicker from '@/components/ModernPicker';
import PeriodHeader from '@/components/PeriodHeader';
import { Colors } from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { AcademicCycle, EventDiscount, useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import {
    AlertCircle,
    CalendarDays,
    Clock,
    Edit3,
    Plus,
    Trash2,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

export default function CyclesScreen() {
    const { showAlert } = useAlert();
    const { userRole } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    if (userRole !== 'admin') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
                <AlertCircle size={48} color={colors.secondary} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso Denegado</Text>
                <Text style={{ color: colors.icon, marginTop: 8 }}>Solo los administradores pueden gestionar los ciclos.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.tint, borderRadius: 12 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }
    const { academicCycles, addCycle, updateCycle, deleteCycle, enrollments, classes } = useInstitution();
    const isDraggingGlobal = useSharedValue(0);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingCycle, setEditingCycle] = useState<AcademicCycle | null>(null);
    const [cycleDatePickerVisible, setCycleDatePickerVisible] = useState(false);
    const [eventDatePickerVisible, setEventDatePickerVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [formData, setFormData] = useState({
        cycleType: 'Verano',
        cycleYear: new Date().getFullYear().toString(),
        startDate: '',
        endDate: '',
        events: [] as EventDiscount[]
    });
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ name: '', startDate: '', endDate: '', discountPercentage: '' });

    const resetForm = () => {
        setFormData({
            cycleType: 'Verano',
            cycleYear: new Date().getFullYear().toString(),
            startDate: '',
            endDate: '',
            events: []
        });
        setErrors({});
        setEditingCycle(null);
        setIsAddingEvent(false);
        setNewEvent({ name: '', startDate: '', endDate: '', discountPercentage: '' });
    };

    const handleEditPress = (cycle: AcademicCycle) => {
        const parts = cycle.name.split(' ');
        const cType = parts[0] === 'Anual' || parts[0] === 'Verano' ? parts[0] : 'Verano';
        const cYear = parts.length > 1 ? parts[1] : new Date().getFullYear().toString();

        setFormData({
            cycleType: cType,
            cycleYear: cYear,
            startDate: cycle.startDate || '',
            endDate: cycle.endDate || '',
            events: cycle.events || []
        });
        setErrors({});
        setEditingCycle(cycle);
        setModalVisible(true);
    };

    const handleCycleDatesConfirm = (start: string, end?: string) => {
        setFormData(prev => ({ ...prev, startDate: start, endDate: end || '' }));
        setErrors(prev => ({ ...prev, startDate: false, endDate: false }));
        setCycleDatePickerVisible(false);
    };

    const handleEventDatesConfirm = (start: string, end?: string) => {
        setNewEvent(prev => ({ ...prev, startDate: start, endDate: end || '' }));
        setEventDatePickerVisible(false);
    };

    const handleDeletePress = (cycleId: string, cycleName: string) => {
        // Validation: Don't delete if there are active classes in this cycle
        const hasClasses = classes.some(c => c.cycleId === cycleId);

        if (hasClasses) {
            showAlert(
                "Acción Denegada",
                "No se puede eliminar este periodo académico porque existen clases creadas bajo él. Elimina las clases primero."
            );
            return;
        }
        showAlert(
            "Eliminar Ciclo",
            `¿Estás seguro que deseas eliminar el ciclo "${cycleName}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => deleteCycle(cycleId)
                }
            ]
        );
    };


    const generateMonthsArray = (startDate: string, endDate: string) => {
        const months = [];
        let [startYear, startMonth] = startDate.split('-').map(Number);
        const [endYear, endMonth] = endDate.split('-').map(Number);

        let currentYear = startYear;
        let currentMonth = startMonth;

        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
            months.push(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        return months;
    };


    const handleSave = () => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const newErrors: Record<string, boolean> = {};

        if (!formData.startDate.match(dateRegex)) newErrors.startDate = true;
        if (!formData.endDate.match(dateRegex)) newErrors.endDate = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        const cycleName = `${formData.cycleType} ${formData.cycleYear}`;

        // Validate duplicate cycle names
        const duplicateCycle = academicCycles.find(c => c.name === cycleName && c.id !== editingCycle?.id);
        if (duplicateCycle) {
            showAlert("Nombre Duplicado", `Ya existe un periodo con el nombre "${cycleName}". No se pueden crear dos periodos iguales.`);
            return;
        }

        const calculatedMonths = generateMonthsArray(formData.startDate, formData.endDate);

        if (calculatedMonths.length === 0) {
            showAlert('Error', 'La fecha de fin debe ser posterior a la fecha de inicio.');
            return;
        }

        const newCycle: AcademicCycle = {
            id: editingCycle ? editingCycle.id : `cycle-${Date.now()}`,
            name: cycleName,
            startDate: formData.startDate,
            endDate: formData.endDate,
            months: calculatedMonths,
            events: formData.events
        };

        if (editingCycle) {
            updateCycle(newCycle);
        } else {
            addCycle(newCycle);
        }

        setModalVisible(false);
        resetForm();
    };

    const handleAddEvent = () => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!newEvent.name || !newEvent.startDate.match(dateRegex) || !newEvent.endDate.match(dateRegex) || isNaN(Number(newEvent.discountPercentage))) {
            showAlert('Error', 'Verifica los campos del evento. Las fechas son obligatorias y el descuento debe ser numérico.');
            return;
        }

        const start = new Date(`${newEvent.startDate}T12:00:00`);
        const end = new Date(`${newEvent.endDate}T12:00:00`);

        if (end < start) {
            showAlert('Error', 'La fecha de fin debe ser posterior a la fecha de inicio en el evento.');
            return;
        }

        // Calculate targetMonthYear by counting days leaning towards each month
        const monthCounts: Record<string, number> = {};
        let current = new Date(start);

        while (current <= end) {
            const mYear = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
            monthCounts[mYear] = (monthCounts[mYear] || 0) + 1;
            current.setDate(current.getDate() + 1);
        }

        let maxCount = -1;
        let targetMonthYear = '';
        for (const [mY, count] of Object.entries(monthCounts)) {
            if (count > maxCount) {
                maxCount = count;
                targetMonthYear = mY;
            }
        }

        const ev: EventDiscount = {
            id: `evt-${Date.now()}`,
            name: newEvent.name,
            startDate: newEvent.startDate,
            endDate: newEvent.endDate,
            targetMonthYear: targetMonthYear,
            discountPercentage: Number(newEvent.discountPercentage)
        };

        setFormData(prev => ({ ...prev, events: [...prev.events, ev] }));
        setNewEvent({ name: '', startDate: '', endDate: '', discountPercentage: '' });
        setIsAddingEvent(false);
    };

    const handleRemoveEvent = (id: string) => {
        setFormData(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));
    };

    const formatMonthYearStr = (yyyyMm: string) => {
        if (!yyyyMm) return '';
        const [year, month] = yyyyMm.split('-');
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = d.toLocaleString('es-ES', { month: 'long' });
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    };

    const DraggableCycleCard = ({ item, colors, onEdit, onDelete, onDragStart }: any) => {
        const translateX = useSharedValue(0);
        const translateY = useSharedValue(0);
        const isDragging = useSharedValue(false);

        const screenHeight = Dimensions.get('window').height;

        const longPressGesture = Gesture.LongPress()
            .minDuration(1000)
            .onStart(() => {
                isDragging.value = true;
                isDraggingGlobal.value = withSpring(1);
                if (onDragStart) runOnJS(onDragStart)();
            });

        const panGesture = Gesture.Pan()
            .manualActivation(true)
            .onTouchesMove((event, stateManager) => {
                if (isDragging.value) {
                    stateManager.activate();
                } else {
                    stateManager.fail();
                }
            })
            .onUpdate((event) => {
                translateX.value = event.translationX;
                translateY.value = event.translationY;
            })
            .onEnd((event) => {
                const absoluteY = event.absoluteY;

                if (absoluteY > screenHeight * 0.8) {
                    runOnJS(onDelete)(item.id, item.name);
                }

                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                isDragging.value = false;
                isDraggingGlobal.value = withSpring(0);
            });

        const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

        const animatedStyle = useAnimatedStyle(() => {
            return {
                transform: [
                    { translateX: translateX.value },
                    { translateY: translateY.value },
                    { scale: withSpring(isDragging.value ? 1.05 : 1) }
                ],
                zIndex: isDragging.value ? 1000 : 1,
                elevation: isDragging.value ? 10 : 0,
                opacity: isDragging.value ? 0.9 : 1,
            };
        });

        return (
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.cardContainer, animatedStyle]}>
                        <View style={[
                            styles.card,
                            {
                                backgroundColor: colorScheme === 'light' ? '#FFFFFF' : '#FFFFFF',
                                borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF',
                            }
                        ]}>
                            <View style={styles.liquidHighlight} />

                        <View style={styles.cardInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
                                    <View style={[styles.iconBox, { backgroundColor: colors.tint + '20' }]}>
                                        <CalendarDays size={20} color={colors.tint} />
                                    </View>
                                    <Text style={[styles.cycleName, { color: colors.text }]} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: colors.tint + '15' }]}
                                    onPress={() => onEdit(item)}
                                >
                                    <Edit3 size={18} color={colors.tint} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.dateContainer}>
                                <View style={styles.dateItem}>
                                    <Text style={{ fontSize: 12, color: colors.icon, marginBottom: 4 }}>Inicio</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Clock size={12} color={colors.text} style={{ marginRight: 4 }} />
                                        <Text style={[styles.dateText, { color: colors.text }]} numberOfLines={1}>
                                            {item.startDate || '—'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />

                                <View style={styles.dateItem}>
                                    <Text style={{ fontSize: 12, color: colors.icon, marginBottom: 4 }}>Fin</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Clock size={12} color={colors.text} style={{ marginRight: 4 }} />
                                        <Text style={[styles.dateText, { color: colors.text }]} numberOfLines={1}>
                                            {item.endDate || '—'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />

                                <View style={[styles.dateItem, { flex: 0.8 }]}>
                                    <Text style={{ fontSize: 12, color: colors.icon, marginBottom: 4 }}>Duración</Text>
                                    <Text style={[styles.dateText, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                                        {item.months.length} mes(es)
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </GestureDetector>
        );
    };

    const renderCycleCard = ({ item }: { item: AcademicCycle }) => (
        <DraggableCycleCard
            item={item}
            colors={colors}
            onEdit={handleEditPress}
            onDelete={handleDeletePress}
        />
    );

    const trashAnimatedStyle = useAnimatedStyle(() => {
        return {
            opacity: isDraggingGlobal.value,
            pointerEvents: isDraggingGlobal.value > 0.5 ? 'auto' : 'none' as any,
            transform: [
                { translateY: interpolate(isDraggingGlobal.value, [0, 1], [100, 0]) },
                { scale: interpolate(isDraggingGlobal.value, [0, 1], [0.5, 1]) }
            ]
        };
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <PeriodHeader
                title="Gestión de Ciclos"
                onBack={() => router.back()}
                rightAction={
                    <TouchableOpacity
                        style={[styles.addButtonHeader, { backgroundColor: colors.tint }]}
                        onPress={() => {
                            resetForm();
                            setModalVisible(true);
                        }}
                    >
                        <Plus color="#fff" size={24} />
                    </TouchableOpacity>
                }
            />

            <FlatList
                data={academicCycles}
                renderItem={renderCycleCard}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <CalendarDays size={48} color={colors.icon} style={{ marginBottom: 10, opacity: 0.5 }} />
                        <Text style={[styles.emptyText, { color: colors.text }]}>No hay ciclos configurados.</Text>
                        <Text style={{ color: colors.icon, fontSize: 13, textAlign: 'center', marginTop: 5 }}>Presiona + para crear el primer periodo académico.</Text>
                    </View>
                }
            />

            <Animated.View style={[styles.deleteZone, trashAnimatedStyle]}>
                <View style={styles.deleteZoneContent}>
                    <Trash2 color="#fff" size={32} />
                    <Text style={styles.deleteZoneText}>Arrastra aquí para eliminar</Text>
                </View>
            </Animated.View>

            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingCycle ? 'Editar Ciclo' : 'Nuevo Ciclo'}
                            </Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={[styles.label, { color: colors.text }]}>Tipo *</Text>
                                    <ModernPicker
                                        selectedValue={formData.cycleType}
                                        onValueChange={(v) => setFormData({ ...formData, cycleType: v })}
                                        items={[
                                            { label: 'Verano', value: 'Verano' },
                                            { label: 'Anual', value: 'Anual' },
                                        ]}
                                        placeholder="Tipo de ciclo"
                                        title="Tipo de Ciclo"
                                        colors={colors}
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: colors.text }]}>Año *</Text>
                                    <ModernPicker
                                        selectedValue={formData.cycleYear}
                                        onValueChange={(v) => setFormData({ ...formData, cycleYear: v })}
                                        items={[...Array(5)].map((_, i) => {
                                            const year = (new Date().getFullYear() + i).toString();
                                            return { label: year, value: year };
                                        })}
                                        placeholder="Año"
                                        title="Seleccionar Año"
                                        colors={colors}
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Periodo del Ciclo *</Text>
                                <TouchableOpacity
                                    style={[styles.dateRangeButton, {
                                        borderColor: (errors.startDate || errors.endDate) ? '#ff4d4d' : colors.border,
                                        backgroundColor: (errors.startDate || errors.endDate) ? '#ff4d4d10' : colors.background,
                                    }]}
                                    onPress={() => setCycleDatePickerVisible(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.dateRangeItem}>
                                        <Text style={{ fontSize: 11, color: colors.icon, marginBottom: 2 }}>Inicio</Text>
                                        <Text style={{ fontSize: 15, fontWeight: '600', color: formData.startDate ? colors.text : colors.icon }}>
                                            {formData.startDate ? formData.startDate.split('-').reverse().join('/') : 'Seleccionar'}
                                        </Text>
                                    </View>
                                    <View style={[styles.dateRangeDivider, { backgroundColor: colors.border }]} />
                                    <View style={styles.dateRangeItem}>
                                        <Text style={{ fontSize: 11, color: colors.icon, marginBottom: 2 }}>Fin</Text>
                                        <Text style={{ fontSize: 15, fontWeight: '600', color: formData.endDate ? colors.text : colors.icon }}>
                                            {formData.endDate ? formData.endDate.split('-').reverse().join('/') : 'Seleccionar'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {(errors.startDate || errors.endDate) && <Text style={styles.errorText}>Selecciona las fechas de inicio y fin</Text>}
                            </View>

                            <ModernDatePicker
                                visible={cycleDatePickerVisible}
                                mode="range"
                                startDate={formData.startDate}
                                endDate={formData.endDate}
                                onConfirm={handleCycleDatesConfirm}
                                onCancel={() => setCycleDatePickerVisible(false)}
                                title="Periodo del Ciclo"
                                colors={colors}
                            />

                            {/* --- Eventos y Descuentos Section --- */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Eventos / Semanas No Laborables</Text>
                                    {!isAddingEvent && (
                                        <TouchableOpacity onPress={() => setIsAddingEvent(true)} style={{ backgroundColor: colors.tint + '20', padding: 6, borderRadius: 8 }}>
                                            <Plus size={16} color={colors.tint} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {formData.events.map(ev => (
                                    <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>{ev.name}</Text>
                                            <Text style={{ color: colors.text, fontSize: 13, marginBottom: 2 }}>
                                                <Text style={{ fontWeight: '600' }}>Fechas: </Text>{ev.startDate} al {ev.endDate}
                                            </Text>
                                            <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>
                                                Descuento del {ev.discountPercentage}% en {formatMonthYearStr(ev.targetMonthYear)}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveEvent(ev.id)} style={{ padding: 8, backgroundColor: '#ff4d4d15', borderRadius: 8 }}>
                                            <Trash2 size={18} color="#ff4d4d" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {isAddingEvent && (
                                    <View style={{ backgroundColor: colors.background, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, borderColor: colors.border, marginBottom: 10, height: 44 }]}
                                            placeholder="Nombre del Evento (ej. Competencia)"
                                            placeholderTextColor={colors.icon}
                                            value={newEvent.name}
                                            onChangeText={t => setNewEvent(p => ({ ...p, name: t }))}
                                        />
                                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                                            <TouchableOpacity
                                                style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                                                onPress={() => setEventDatePickerVisible(true)}
                                            >
                                                <Text style={{ color: (newEvent.startDate && newEvent.endDate) ? colors.text : colors.icon, fontSize: 13 }}>
                                                    {(newEvent.startDate && newEvent.endDate)
                                                        ? `${newEvent.startDate.split('-').reverse().join('/')} - ${newEvent.endDate.split('-').reverse().join('/')}`
                                                        : 'Fechas del evento...'}
                                                </Text>
                                            </TouchableOpacity>

                                            <TextInput
                                                style={[styles.input, { flex: 0.6, color: colors.text, borderColor: colors.border, height: 44 }]}
                                                placeholder="% Desc."
                                                placeholderTextColor={colors.icon}
                                                keyboardType="numeric"
                                                value={newEvent.discountPercentage}
                                                onChangeText={t => setNewEvent(p => ({ ...p, discountPercentage: t }))}
                                            />
                                        </View>

                                        <ModernDatePicker
                                            visible={eventDatePickerVisible}
                                            mode="range"
                                            startDate={newEvent.startDate}
                                            endDate={newEvent.endDate}
                                            onConfirm={handleEventDatesConfirm}
                                            onCancel={() => setEventDatePickerVisible(false)}
                                            title="Fechas del Evento"
                                            colors={colors}
                                        />
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity
                                                style={{ flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: colors.border }}
                                                onPress={() => setIsAddingEvent(false)}
                                            >
                                                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: colors.tint }}
                                                onPress={handleAddEvent}
                                            >
                                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Agregar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                                {formData.events.length === 0 && !isAddingEvent && (
                                    <Text style={{ color: colors.icon, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
                                        No hay eventos configurados para este periodo.
                                    </Text>
                                )}
                            </View>
                            {/* -------------------------------------- */}

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                                onPress={handleSave}
                            >
                                <Text style={styles.saveText}>Guardar Ciclo</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView >
            </Modal >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    addButtonHeader: {
        width: 44,
        height: 44,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    listContent: {
        padding: 15,
    },
    cardContainer: {
        marginBottom: 16,
        marginHorizontal: 4,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 0 : 4,
    },
    card: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        overflow: 'hidden',
    },
    liquidHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    cardInfo: {
        flex: 1,
    },
    cycleName: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1, // Let title expand safely
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 8,
        justifyContent: 'space-between'
    },
    dateItem: {
        flex: 1,
        alignItems: 'flex-start'
    },
    dateDivider: {
        width: 1,
        height: 24,
        marginHorizontal: 12
    },
    dateText: {
        fontSize: 13,
        fontWeight: '500' // Make dates slightly bolder for readability
    },
    actionBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        fontSize: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    infoBox: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20
    },
    infoText: {
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.8
    },
    saveButton: {
        height: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    saveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    errorText: {
        color: '#ff4d4d',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    deleteZone: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 180,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 40,
        zIndex: 0,
    },
    deleteZoneContent: {
        backgroundColor: '#ff4d4d',
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#ff4d4d',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 0 : 8,
    },
    deleteZoneText: {
        color: '#fff',
        fontWeight: 'bold',
        marginTop: 8,
        fontSize: 14,
    },
    dateRangeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
    },
    dateRangeItem: {
        flex: 1,
        alignItems: 'center',
    },
    dateRangeDivider: {
        width: 24,
        height: 2,
        borderRadius: 1,
        marginHorizontal: 12,
    },
});