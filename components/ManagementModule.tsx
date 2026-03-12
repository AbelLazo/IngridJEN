import ModernPicker from '@/components/ModernPicker';
import { Colors } from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { AlertCircle, Check, ChevronLeft, Edit3, Mail, Phone, Plus, Search, Trash2, UserPlus, Users, X } from 'lucide-react-native';
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
    Vibration,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { useInstitution } from '@/context/InstitutionContext';

interface Entity {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    extra?: string;
    status: 'active' | 'inactive';
    type: 'student' | 'teacher';
}


interface ManagementModuleProps {
    title: string;
    type: 'student' | 'teacher';
    placeholderExtra?: string;
    iconExtra?: any;
}


const triggerHaptic = () => {
    Vibration.vibrate(100);
};

const DraggableCard = ({ item, colors, colorScheme, type, currentCycleYear, isDraggingGlobal, onEdit, onDelete, onDragStart }: any) => {
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
                runOnJS(onDelete)(item);
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

    const computedStatus = (type === 'student' && item.activeYears)
        ? (item.activeYears.includes(currentCycleYear) ? 'active' : 'inactive')
        : item.status;

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.cardContainer, animatedStyle]}>
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                            borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border,
                        }
                    ]}
                >
                    <View style={[styles.avatar, { backgroundColor: '#FFF0F5' }]}>
                        <Text style={[styles.avatarText, { color: colors.tint }]}>{item.firstName.charAt(0)}</Text>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[
                            styles.cardName,
                            { color: colors.text },
                            computedStatus === 'inactive' && { color: colors.icon, textDecorationLine: 'line-through' as any }
                        ]}>
                            {item.firstName} {item.lastName}
                        </Text>
                        <View style={styles.cardInfoRow}>
                            <Phone size={14} color={colors.icon} />
                            <Text style={[styles.cardSub, { color: colors.icon, marginLeft: 4 }]}>{item.phone}</Text>
                            {computedStatus === 'inactive' && (
                                <Text style={{ fontSize: 10, color: '#FF4444', marginLeft: 10, fontWeight: 'bold' }}>
                                    (Inactivo)
                                </Text>
                            )}
                        </View>
                        {item.extra && item.extra.length > 0 && (
                            <View style={styles.specialtyTags}>
                                {item.extra.split(', ').map((s: string, idx: number) => (
                                    <View key={idx} style={[styles.miniBadge, { backgroundColor: '#FFF0F5' }]}>
                                        <Text style={[styles.miniBadgeText, { color: colors.tint }]}>{s}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.editCircle, { backgroundColor: '#FFF0F5' }]}
                        onPress={() => onEdit(item)}
                    >
                        <Edit3 size={18} color={colors.tint} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

export default function ManagementModule({ title, type, placeholderExtra, iconExtra: IconExtra }: ManagementModuleProps) {
    const { showAlert } = useAlert();
    const { userRole } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    if (userRole !== 'admin') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
                <AlertCircle size={48} color={colors.tint} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Acceso Denegado</Text>
                <Text style={{ color: colors.icon, marginTop: 8 }}>Solo los administradores pueden gestionar {title.toLowerCase()}.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.tint, borderRadius: 12 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }
    const { courses, students, teachers, addStudent, addTeacher, updateStudent, updateTeacher, removeStudent, removeTeacher, academicCycles, currentCycleId, enrollments, classes, installments } = useInstitution();
    const isDraggingGlobal = useSharedValue(0); // 0 = not dragging, 1 = dragging

    const [searchQuery, setSearchQuery] = useState('');
    const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        status: 'active' as 'active' | 'inactive',
        activeYears: [new Date().getFullYear().toString()] as string[],
        selectedSpecialties: [] as string[],
        email: '',
        familyId: ''
    });
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            phone: '',
            status: 'active',
            activeYears: [currentCycleYear],
            selectedSpecialties: [],
            email: '',
            familyId: ''
        });
        setEditingEntityId(null);
        setErrorMsg(null);
        setErrors({});
    };

    const handleAddSpecialty = (name: string) => {
        if (name && !formData.selectedSpecialties.includes(name)) {
            setFormData(prev => ({
                ...prev,
                selectedSpecialties: [...prev.selectedSpecialties, name]
            }));
        }
    };

    const handleRemoveSpecialty = (name: string) => {
        setFormData(prev => ({
            ...prev,
            selectedSpecialties: prev.selectedSpecialties.filter(s => s !== name)
        }));
    };

    const handleAddYear = (year: string) => {
        if (year && !formData.activeYears.includes(year)) {
            setFormData(prev => ({
                ...prev,
                activeYears: [...prev.activeYears, year]
            }));
        }
    };

    const handleRemoveYear = (year: string) => {
        if (editingEntityId) {
            // Find enrollments for this student in the given year
            const yearEnrollments = enrollments.filter(e => {
                if (e.studentId !== editingEntityId) return false;
                const classItem = classes.find(c => c.id === e.classId);
                if (!classItem) return false;
                const cycle = academicCycles.find(ac => ac.id === classItem.cycleId);
                const cycleYear = cycle?.name.match(/\d{4}/)?.[0];
                return cycleYear === year;
            });

            const hasActiveEnrollments = yearEnrollments.some(e => e.status !== 'withdrawn');

            // Check if any installment for those enrollments has been paid
            const hasPaidPayments = yearEnrollments.some(e =>
                installments.some(inst => inst.enrollmentId === e.id && inst.isPaid)
            );

            if (hasActiveEnrollments || hasPaidPayments) {
                const reason = hasActiveEnrollments
                    ? 'tiene matrículas activas'
                    : 'tiene pagos registrados';
                showAlert("Acción Denegada", `No se puede remover la asignación al año ${year} porque el estudiante ${reason} en él.`, undefined, 'warning');
                return;
            }
        }

        setFormData(prev => ({
            ...prev,
            activeYears: prev.activeYears.filter(y => y !== year)
        }));
    };


    const currentCycleYear = React.useMemo(() => {
        const cycle = academicCycles.find(c => c.id === currentCycleId);
        if (!cycle) return new Date().getFullYear().toString();
        const parts = cycle.name.split(' ');
        return parts.length > 1 ? parts[1] : new Date().getFullYear().toString();
    }, [currentCycleId, academicCycles]);

    const currentEntities = type === 'teacher' ? teachers : students;

    const filteredEntities = currentEntities.filter(item => {
        const matchesSearch = `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.phone.includes(searchQuery);

        return matchesSearch;
    }).sort((a, b) => {
        // Enrolled in current cycle first
        const isAEnrolled = type === 'student' && enrollments.some(e => e.studentId === a.id && classes.find(c => c.id === e.classId)?.cycleId === currentCycleId);
        const isBEnrolled = type === 'student' && enrollments.some(e => e.studentId === b.id && classes.find(c => c.id === e.classId)?.cycleId === currentCycleId);
        if (isAEnrolled && !isBEnrolled) return -1;
        if (!isAEnrolled && isBEnrolled) return 1;
        // Alphabetical within each group
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

    const handleDelete = (item: Entity) => {
        if (type === 'student') {
            const hasEnrollments = enrollments.some(e => e.studentId === item.id);
            if (hasEnrollments) {
                showAlert("Acción Denegada", "No se puede eliminar a este estudiante porque tiene registros de historial o matrícula.");
                return;
            }
        } else {
            const fullName = `${item.firstName} ${item.lastName}`.trim().toLowerCase();
            const hasClasses = classes.some(c =>
                (c.teacherId === item.id) ||
                (c.teacherName && c.teacherName.trim().toLowerCase() === fullName)
            );
            if (hasClasses) {
                showAlert("Acción Denegada", "No se puede eliminar a este profesor porque tiene clases asignadas.");
                return;
            }
        }

        showAlert(
            "Eliminar Registro",
            `¿Estás seguro de que deseas eliminar a ${item.firstName} ${item.lastName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                        if (type === 'teacher') {
                            removeTeacher(item.id);
                        } else {
                            removeStudent(item.id);
                        }
                        Vibration.vibrate(100);
                    }
                }
            ]
        );
    };



    const handleSave = async () => {
        setErrorMsg(null);

        const newErrors: Record<string, boolean> = {};
        if (!formData.firstName.trim()) newErrors.firstName = true;
        if (!formData.lastName.trim()) newErrors.lastName = true;
        if (!formData.phone.trim() || formData.phone.length !== 9) newErrors.phone = true;
        if (type === 'teacher' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) newErrors.email = true;


        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const entityData: any = {
                id: editingEntityId || Date.now().toString(),
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                status: formData.status,
                type,
                familyId: formData.familyId || ''
            };

            if (type === 'teacher') {
                if (editingEntityId && formData.status === 'inactive') {
                    const normTeacherName = `${formData.firstName} ${formData.lastName}`.trim().toLowerCase();
                    const activeClasses = classes.some(c =>
                        (c.teacherId === editingEntityId || (c.teacherName && c.teacherName.trim().toLowerCase() === normTeacherName)) &&
                        c.cycleId === currentCycleId
                    );
                    if (activeClasses) {
                        setErrorMsg("❌ No se puede inactivar: El profesor está asignado a clases en el ciclo actual.");
                        return;
                    }
                }

                entityData.extra = formData.selectedSpecialties.join(', ');
                entityData.email = formData.email.trim().toLowerCase(); // Add email for teacher
                if (editingEntityId) {
                    await updateTeacher(entityData);
                } else {
                    await addTeacher(entityData);
                }
            } else {
                // For students, status is derived from activeYears
                entityData.status = formData.activeYears.includes(currentCycleYear) ? 'active' : 'inactive';
                entityData.activeYears = formData.activeYears;
                if (editingEntityId) {
                    await updateStudent(entityData);
                } else {
                    await addStudent(entityData);
                }
            }

            resetForm();
            setModalVisible(false);
        } catch (err: any) {
            setErrorMsg("❌ Error: " + err.message);
        }
    };

    const handleEditPress = (item: Entity) => {
        setFormData({
            firstName: item.firstName,
            lastName: item.lastName,
            phone: item.phone,
            status: item.status || 'active',
            activeYears: (item as any).activeYears || [currentCycleYear],
            selectedSpecialties: item.extra ? item.extra.split(', ') : [],
            email: type === 'teacher' ? (item as any).email || '' : '',
            familyId: (item as any).familyId || ''
        });
        setErrors({});
        setEditingEntityId(item.id);
        setModalVisible(true);
    };


    const renderItem = ({ item }: { item: Entity }) => (
        <DraggableCard
            item={item}
            colors={colors}
            colorScheme={colorScheme}
            type={type}
            currentCycleYear={currentCycleYear}
            isDraggingGlobal={isDraggingGlobal}
            onEdit={handleEditPress}
            onDelete={handleDelete}
            onDragStart={triggerHaptic}
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
        <View style={[styles.container, { backgroundColor: colors.background }]} >
            {/* ─── Ambient Background Glows ─── */}
            <View style={[
                styles.glowTopRight,
                { backgroundColor: colorScheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(236, 72, 153, 0.08)' }
            ]} />
            <View style={[
                styles.glowBottomLeft,
                { backgroundColor: colorScheme === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.05)' }
            ]} />

            <Stack.Screen options={{ headerShown: false }} />

            <LinearGradient
                colors={colorScheme === 'dark' ? ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0)'] : ['rgba(236, 72, 153, 0.1)', 'rgba(236, 72, 153, 0)']}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.backButton, { backgroundColor: colorScheme === 'light' ? '#FFF0F5' : '#FFFFFF20', borderWidth: 1, borderColor: colorScheme === 'light' ? '#FCE4EC' : '#FFFFFF40' }]}
                    >
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={[styles.greeting, { color: colors.text }]}>{title}</Text>
                        <View style={[styles.infoChip, { backgroundColor: colorScheme === 'light' ? '#FFF0F5' : '#FFFFFF15' }]}>
                            <Users size={14} color={colors.tint} />
                            <Text style={[styles.infoChipText, { color: colors.text }]}>Administración</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.tint }]}
                        onPress={() => { resetForm(); setModalVisible(true); }}
                    >
                        <Plus color="#fff" size={24} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Search Bar - Principal focus for simple management */}
            <View
                style={[
                    styles.searchContainer,
                    {
                        backgroundColor: colorScheme === 'light' ? '#FFFFFF' : colors.card,
                        borderColor: colorScheme === 'light' ? '#FCE4EC' : colors.border,
                        marginTop: 10
                    }
                ]}
            >
                <Search color={colors.tint} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={`Buscar ${title.toLowerCase()}...`}
                    placeholderTextColor={colorScheme === 'light' ? '#999' : '#777'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            < FlatList
                data={filteredEntities}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                ListEmptyComponent={
                    < View style={styles.emptyContainer} >
                        <Text style={{ color: colors.icon }}>No se encontraron resultados.</Text>
                    </View >
                }
            />

            {/* Add Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingEntityId ? 'Editar' : 'Registrar'} {title.slice(0, -1)}
                            </Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Nombres *</Text>
                                <View style={[styles.inputWrapper, { borderColor: errors.firstName ? '#ff4d4d' : colors.border, backgroundColor: errors.firstName ? '#ff4d4d10' : 'transparent' }]}>
                                    <UserPlus size={18} color={errors.firstName ? '#ff4d4d' : colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. Juan Alberto"
                                        placeholderTextColor={colors.icon}
                                        value={formData.firstName}
                                        onChangeText={(v) => {
                                            setFormData({ ...formData, firstName: v });
                                            if (errors.firstName) setErrors(prev => ({ ...prev, firstName: false }));
                                        }}
                                    />
                                </View>
                                {errors.firstName && <Text style={styles.errorText}>Este campo es requerido</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Apellidos *</Text>
                                <View style={[styles.inputWrapper, { borderColor: errors.lastName ? '#ff4d4d' : colors.border, backgroundColor: errors.lastName ? '#ff4d4d10' : 'transparent' }]}>
                                    <UserPlus size={18} color={errors.lastName ? '#ff4d4d' : colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. Pérez García"
                                        placeholderTextColor={colors.icon}
                                        value={formData.lastName}
                                        onChangeText={(v) => {
                                            setFormData({ ...formData, lastName: v });
                                            if (errors.lastName) setErrors(prev => ({ ...prev, lastName: false }));
                                        }}
                                    />
                                </View>
                                {errors.lastName && <Text style={styles.errorText}>Este campo es requerido</Text>}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Teléfono de Contacto *</Text>
                                <View style={[styles.inputWrapper, { borderColor: errors.phone ? '#ff4d4d' : colors.border, backgroundColor: errors.phone ? '#ff4d4d10' : 'transparent' }]}>
                                    <Phone size={18} color={errors.phone ? '#ff4d4d' : colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. 994555888"
                                        placeholderTextColor={colors.icon}
                                        keyboardType="phone-pad"
                                        maxLength={9}
                                        value={formData.phone}
                                        onChangeText={(v) => {
                                            const numericValue = v.replace(/[^0-9]/g, '');
                                            setFormData({ ...formData, phone: numericValue });
                                            if (errors.phone && numericValue.length === 9) setErrors(prev => ({ ...prev, phone: false }));
                                        }}
                                    />
                                </View>
                                {errors.phone && <Text style={styles.errorText}>El teléfono debe tener 9 dígitos</Text>}
                            </View>

                            {type === 'teacher' && (
                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Correo Electrónico *</Text>
                                    <View style={[styles.inputWrapper, { borderColor: errors.email ? '#ff4d4d' : colors.border, backgroundColor: errors.email ? '#ff4d4d10' : 'transparent' }]}>
                                        <Mail size={18} color={errors.email ? '#ff4d4d' : colors.icon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="correo@ejemplo.com"
                                            placeholderTextColor={colors.icon}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            value={formData.email}
                                            onChangeText={(v) => {
                                                setFormData({ ...formData, email: v });
                                                if (errors.email) setErrors(prev => ({ ...prev, email: false }));
                                            }}
                                        />
                                    </View>
                                    <Text style={{ fontSize: 11, color: colors.icon, marginTop: 4, marginLeft: 4 }}>
                                        Este correo servirá para filtrar el horario de este profesor.
                                    </Text>
                                    {errors.email && <Text style={styles.errorText}>El correo no es válido</Text>}
                                </View>
                            )}

                            {type === 'student' && (
                                <View style={styles.formGroup}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Grupo Familiar (Opcional)</Text>
                                        {formData.familyId ? (
                                            <TouchableOpacity onPress={() => setFormData(prev => ({ ...prev, familyId: '' }))}>
                                                <Text style={{ fontSize: 12, color: '#FF4444', fontWeight: '600' }}>Remover grupo</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                    <ModernPicker
                                        selectedValue={formData.familyId}
                                        onValueChange={(v) => setFormData(prev => ({ ...prev, familyId: v }))}
                                        items={(() => {
                                            const existingFamilies = Array.from(new Set(students.filter(s => s.familyId).map(s => s.familyId))).map(fid => {
                                                const rep = students.find(s => s.familyId === fid);
                                                return { label: `Familia ${rep?.lastName || fid}`, value: fid || '' };
                                            });
                                            if (formData.familyId && !existingFamilies.some(f => f.value === formData.familyId)) {
                                                existingFamilies.unshift({ label: `Nueva Familia (${formData.lastName || 'Asignada'})`, value: formData.familyId });
                                            }
                                            return [
                                                { label: '--- Ninguno / Sin Familia ---', value: '' },
                                                ...existingFamilies
                                            ];
                                        })()}
                                        placeholder="Seleccionar familia existente..."
                                        title="Asignar Grupo Familiar"
                                        searchable={true}
                                        colors={colors}
                                    />
                                    {formData.familyId && formData.familyId.startsWith('FAM-') && !students.some(s => s.familyId === formData.familyId) && (
                                        <View style={{ marginTop: 8, padding: 8, backgroundColor: '#4CAF5010', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                            <Check size={14} color="#4CAF50" />
                                            <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>Grupo Familiar Creado (Temporal hasta guardar)</Text>
                                        </View>
                                    )}
                                    {!formData.familyId && (
                                        <TouchableOpacity
                                            onPress={() => setFormData(prev => ({ ...prev, familyId: `FAM-${Date.now()}` }))}
                                            style={{ marginTop: 8, padding: 12, backgroundColor: colors.tint + '10', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.tint + '30', borderStyle: 'dashed' }}
                                        >
                                            <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '700' }}>+ Crear nuevo grupo familiar para este estudiante</Text>
                                        </TouchableOpacity>
                                    )}
                                    <Text style={{ fontSize: 11, color: colors.icon, marginTop: 4, marginLeft: 4 }}>
                                        Agrupar estudiantes permite aplicar descuentos por familiar inscrito.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>
                                    {type === 'teacher' ? 'Estado en la Institución' : 'Años de Actividad'}
                                </Text>

                                {type === 'teacher' ? (
                                    /* Teachers keep the status picker */
                                    <ModernPicker
                                        selectedValue={formData.status}
                                        onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'inactive' })}
                                        items={[
                                            { label: 'Activo', value: 'active' },
                                            { label: 'Inactivo', value: 'inactive' },
                                        ]}
                                        placeholder="Estado"
                                        title="Estado en la Institución"
                                        colors={colors}
                                    />
                                ) : (
                                    /* Students: year tags + add picker */
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                            <View style={{ flex: 1 }}>
                                                <ModernPicker
                                                    selectedValue=""
                                                    onValueChange={(v) => handleAddYear(v)}
                                                    items={[...Array(3)].map((_, i) => {
                                                        const year = (new Date().getFullYear() + i).toString();
                                                        return { label: `Año ${year}`, value: year };
                                                    })}
                                                    placeholder="Añadir año..."
                                                    title="Añadir Año de Actividad"
                                                    colors={colors}
                                                />
                                            </View>
                                        </View>

                                        {/* Active status indicator */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: formData.activeYears.includes(currentCycleYear) ? '#4CAF50' : '#FF4444', marginRight: 8 }} />
                                            <Text style={{ fontSize: 13, color: formData.activeYears.includes(currentCycleYear) ? '#4CAF50' : '#FF4444', fontWeight: '600' }}>
                                                {formData.activeYears.includes(currentCycleYear) ? 'Activo en el periodo actual' : 'Inactivo en el periodo actual'}
                                            </Text>
                                        </View>

                                        {/* Year tags - compact scrollable row */}
                                        {formData.activeYears.length > 0 && (
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                                            >
                                                {formData.activeYears
                                                    .filter(year => parseInt(year) >= parseInt(currentCycleYear))
                                                    .sort((a, b) => parseInt(a) - parseInt(b))
                                                    .map((year, idx) => (
                                                        <TouchableOpacity
                                                            key={idx}
                                                            onPress={() => handleRemoveYear(year)}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                backgroundColor: year === currentCycleYear ? colors.tint : colors.tint + '20',
                                                                paddingHorizontal: 14,
                                                                paddingVertical: 8,
                                                                borderRadius: 20,
                                                            }}
                                                        >
                                                            <Text style={{
                                                                fontSize: 13,
                                                                fontWeight: '600',
                                                                color: year === currentCycleYear ? '#fff' : colors.tint,
                                                                marginRight: 6
                                                            }}>
                                                                {year}
                                                            </Text>
                                                            <X size={12} color={year === currentCycleYear ? '#fff' : colors.tint} />
                                                        </TouchableOpacity>
                                                    ))}
                                            </ScrollView>
                                        )}
                                    </View>
                                )}

                                <Text style={{ fontSize: 11, color: colors.icon, marginTop: 6, marginLeft: 4 }}>
                                    {type === 'teacher'
                                        ? "* Solo los profesores activos podrán ser asignados a nuevos cursos y horarios."
                                        : "* El estudiante solo podrá matricularse en los periodos de los años listados. Toca una etiqueta para removerla."}
                                </Text>
                            </View>

                            {type === 'teacher' && (
                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Especialidades (Cursos)</Text>
                                    <ModernPicker
                                        selectedValue=""
                                        onValueChange={(itemValue) => handleAddSpecialty(itemValue)}
                                        items={courses.map(course => ({ label: course.name, value: course.name }))}
                                        placeholder="Selecciona para añadir..."
                                        title="Añadir Especialidad"
                                        searchable={true}
                                        colors={colors}
                                    />

                                    {/* Selected Specialties Display */}
                                    {formData.selectedSpecialties.length > 0 && (
                                        <View style={[styles.specialtiesSelector, { marginTop: 12 }]}>
                                            {formData.selectedSpecialties.map((spec, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    onPress={() => handleRemoveSpecialty(spec)}
                                                    style={[styles.specialtyChip, {
                                                        backgroundColor: colors.tint,
                                                        borderColor: colors.tint,
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }]}
                                                >
                                                    <Text style={[styles.specialtyChipText, { color: '#fff', marginRight: 5 }]}>{spec}</Text>
                                                    <X size={14} color="#fff" />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}


                            {errorMsg && (
                                <View style={{ backgroundColor: '#ff4d4d20', padding: 12, borderRadius: 10, marginBottom: 15 }}>
                                    <Text style={{ color: '#ff4d4d', textAlign: 'center', fontWeight: 'bold' }}>{errorMsg}</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.tint }]}
                                onPress={handleSave}
                            >
                                <Text style={styles.submitButtonText}>
                                    {editingEntityId ? 'Guardar Cambios' : 'Guardar Registro'}
                                </Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Deletion Trash Zone */}
            <Animated.View style={[styles.trashZone, trashAnimatedStyle]}>
                <View style={[styles.trashCircle, { backgroundColor: '#FF4444' }]}>
                    <Trash2 color="#FFF" size={32} />
                </View>
                <Text style={styles.trashText}>Suelta para eliminar</Text>
            </Animated.View>
        </View >
    );
}
const styles = StyleSheet.create({
    container: { flex: 1 },
    glowTopRight: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.6,
        pointerEvents: 'none',
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: -100,
        left: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        opacity: 0.5,
        pointerEvents: 'none',
    },
    header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 5 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    greeting: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    infoChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 10 },
    infoChipText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 4 : 6,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        height: 52,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
    },
    cardContainer: {
        marginBottom: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: Platform.OS === 'android' ? 3 : 5,
    },
    liquidHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Minimal reflection to avoid "white box"
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    cardContent: {
        flex: 1,
        marginLeft: 15,
    },
    cardName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    cardSub: {
        fontSize: 13,
    },
    cardInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    specialtyTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    miniBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginRight: 6,
        marginBottom: 6,
    },
    miniBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    specialtiesSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
    },
    specialtyChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    specialtyChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 25,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 55,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
    },
    submitButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: Platform.OS === 'android' ? 4 : 6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    editCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    trashZone: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
    },
    trashCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        marginBottom: 10,
    },
    trashText: {
        color: '#FF4444',
        fontWeight: 'bold',
        fontSize: 14,
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: 'hidden'
    },
    cycleSelectorWrapper: { paddingVertical: 10 },
    cycleScrollContent: { paddingHorizontal: 20, gap: 8 },
    cycleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 4
    },
    cycleChipLabel: { marginLeft: 6, fontWeight: 'bold', fontSize: 12 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: 'bold'
    },
    errorText: {
        color: '#ff4d4d',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    }
});