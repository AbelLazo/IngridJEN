import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { AlertCircle, ChevronLeft, Edit3, Mail, Phone, Plus, Search, Trash2, UserPlus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
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

export default function ManagementModule({ title, type, placeholderExtra, iconExtra: IconExtra }: ManagementModuleProps) {
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
                <Text style={{ color: colors.icon, marginTop: 8 }}>Solo los administradores pueden gestionar {title.toLowerCase()}.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 12 }}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }
    const { courses, students, teachers, addStudent, addTeacher, updateStudent, updateTeacher, removeStudent, removeTeacher, academicCycles, currentCycleId, enrollments, classes } = useInstitution();
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
        email: ''
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
            email: ''
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
            // Verificar si el estudiante tiene alguna matrícula en este año específico
            const hasEnrollmentsInYear = enrollments.some(e => {
                if (e.studentId !== editingEntityId) return false;
                const classItem = classes.find(c => c.id === e.classId);
                if (!classItem) return false;
                const cycle = academicCycles.find(ac => ac.id === classItem.cycleId);
                const cycleYear = cycle?.name.match(/\d{4}/)?.[0];
                return cycleYear === year;
            });

            if (hasEnrollmentsInYear) {
                Alert.alert("Acción Denegada", `No se puede remover la asignación al año ${year} porque el estudiante tiene matrículas o historial académico en él.`);
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
        return 0;
    });

    const handleDelete = (item: Entity) => {
        if (type === 'student') {
            const hasEnrollments = enrollments.some(e => e.studentId === item.id);
            if (hasEnrollments) {
                Alert.alert("Acción Denegada", "No se puede eliminar a este estudiante porque tiene registros de historial o matrícula.");
                return;
            }
        } else {
            const hasClasses = classes.some(c => `${item.firstName} ${item.lastName}` === c.teacherName);
            if (hasClasses) {
                Alert.alert("Acción Denegada", "No se puede eliminar a este profesor porque tiene clases asignadas.");
                return;
            }
        }

        Alert.alert(
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

    const DraggableCard = ({ item, colors, onEdit, onDelete, onDragStart }: any) => {
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
            ? (item.status === 'active' && item.activeYears.includes(currentCycleYear) ? 'active' : 'inactive')
            : item.status;

        return (
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.cardContainer, animatedStyle]}>
                    <BlurView
                        intensity={90}
                        tint={colorScheme === 'light' ? 'light' : 'dark'}
                        style={[
                            styles.card,
                            {
                                backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
                                borderColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                            }
                        ]}
                    >
                        <View style={styles.liquidHighlight} />

                        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>{item.firstName.charAt(0)}</Text>
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
                                        <View key={idx} style={[styles.miniBadge, { backgroundColor: colors.primary + '10' }]}>
                                            <Text style={[styles.miniBadgeText, { color: colors.primary }]}>{s}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.editCircle, { backgroundColor: colors.primary + '20' }]}
                            onPress={() => onEdit(item)}
                        >
                            <Edit3 size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>
            </GestureDetector>
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
                type
            };

            if (type === 'teacher') {
                if (editingEntityId && formData.status === 'inactive') {
                    const teacherName = `${formData.firstName} ${formData.lastName}`;
                    const activeClasses = classes.some(c => c.teacherName === teacherName && c.cycleId === currentCycleId);
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
                if (editingEntityId && formData.status === 'inactive') {
                    const hasActiveEnrollments = enrollments.some(e => e.studentId === editingEntityId);
                    if (hasActiveEnrollments) {
                        setErrorMsg("❌ No se puede inactivar globalmente: El estudiante posee historial de matrículas. Para retirar un alumno, desmatrículalo primero o remueve su etiqueta de año actual correspondiente.");
                        return;
                    }
                }

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
            email: type === 'teacher' ? (item as any).email || '' : '' // Add email for teacher
        });
        setErrors({});
        setEditingEntityId(item.id);
        setModalVisible(true);
    };


    const renderItem = ({ item }: { item: Entity }) => (
        <DraggableCard
            item={item}
            colors={colors}
            onEdit={handleEditPress}
            onDelete={handleDelete}
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
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]} >
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header} >
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <ChevronLeft color={colors.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => { resetForm(); setModalVisible(true); }}
                >
                    <Plus color="#fff" size={24} />
                </TouchableOpacity>
            </View >

            {/* Search Bar - Principal focus for simple management */}
            <BlurView
                intensity={90}
                tint={colorScheme === 'light' ? 'light' : 'dark'}
                style={[
                    styles.searchContainer,
                    {
                        backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
                        borderColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)',
                        marginTop: 10
                    }
                ]}
            >
                <Search color={colorScheme === 'light' ? '#666' : '#AAA'} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={`Buscar ${title.toLowerCase()}...`}
                    placeholderTextColor={colorScheme === 'light' ? '#999' : '#777'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </BlurView>

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

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Estado en la Institución</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0, flex: 1, marginRight: (type === 'student' && formData.status === 'active') ? 10 : 0 }]}>
                                        <Picker
                                            selectedValue={formData.status}
                                            onValueChange={(v) => setFormData({ ...formData, status: v })}
                                            style={{ color: colors.text, width: '100%', height: 50 }}
                                            dropdownIconColor={colors.primary}
                                        >
                                            <Picker.Item label="Activo" value="active" />
                                            <Picker.Item label="Inactivo" value="inactive" />
                                        </Picker>
                                    </View>

                                    {type === 'student' && (
                                        <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0, flex: 0.8 }]}>
                                            <Picker
                                                selectedValue=""
                                                onValueChange={(v) => handleAddYear(v)}
                                                style={{ color: colors.text, width: '100%', height: 50 }}
                                                dropdownIconColor={colors.primary}
                                            >
                                                <Picker.Item label="Añadir..." value="" />
                                                {[...Array(3)].map((_, i) => {
                                                    const year = (new Date().getFullYear() + i).toString();
                                                    return <Picker.Item key={year} label={`Año ${year}`} value={year} />;
                                                })}
                                            </Picker>
                                        </View>
                                    )}
                                </View>

                                {/* Selected Active Years Display */}
                                {type === 'student' && formData.activeYears.length > 0 && (
                                    <View style={[styles.specialtiesSelector, { marginTop: 12 }]}>
                                        {formData.activeYears.map((year, idx) => {
                                            const isPastYear = parseInt(year) < parseInt(currentCycleYear);
                                            // Ocultamiento visual del historial inactivo tal y como solicitó el usuario, para la limpia del Form
                                            if (isPastYear) return null;

                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    onPress={() => handleRemoveYear(year)}
                                                    style={[styles.specialtyChip, {
                                                        backgroundColor: colors.primary,
                                                        borderColor: colors.primary,
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }]}
                                                >
                                                    <Text style={[styles.specialtyChipText, { color: '#fff', marginRight: 5 }]}>{year}</Text>
                                                    <X size={14} color="#fff" />
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                )}

                                <Text style={{ fontSize: 11, color: colors.icon, marginTop: 4, marginLeft: 4 }}>
                                    {type === 'teacher'
                                        ? "* Solo los profesores activos podrán ser asignados a nuevos cursos y horarios."
                                        : "* Solo figurará como activo para matricularse en los periodos de los años listados arriba."}
                                </Text>
                            </View>

                            {type === 'teacher' && (
                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Especialidades (Cursos)</Text>
                                    <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0 }]}>
                                        <Picker
                                            selectedValue=""
                                            onValueChange={(itemValue) => handleAddSpecialty(itemValue)}
                                            style={{ color: colors.text, width: '100%', height: 50 }}
                                            dropdownIconColor={colors.primary}
                                        >
                                            <Picker.Item label="Selecciona para añadir..." value="" color={colors.icon} />
                                            {courses.map(course => (
                                                <Picker.Item key={course.id} label={course.name} value={course.name} />
                                            ))}
                                        </Picker>
                                    </View>

                                    {/* Selected Specialties Display */}
                                    {formData.selectedSpecialties.length > 0 && (
                                        <View style={[styles.specialtiesSelector, { marginTop: 12 }]}>
                                            {formData.selectedSpecialties.map((spec, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    onPress={() => handleRemoveSpecialty(spec)}
                                                    style={[styles.specialtyChip, {
                                                        backgroundColor: colors.primary,
                                                        borderColor: colors.primary,
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
                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
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
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        height: 52,
        borderRadius: 32, // Upgraded to Elite 32px
        borderWidth: 1.5,
        marginBottom: 16,
        overflow: 'hidden',
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
        borderRadius: 32, // Consistent with liquid glass elite
        borderWidth: 1.5,
        overflow: 'hidden',
        // Layered shadows for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: Platform.OS === 'android' ? 0 : 8,
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
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        maxHeight: '85%',
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
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
        elevation: 4,
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
