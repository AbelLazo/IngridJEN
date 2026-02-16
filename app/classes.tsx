import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Picker } from '@react-native-picker/picker';
import { Stack, useRouter } from 'expo-router';
import {
    BookOpen,
    CalendarDays,
    ChevronLeft,
    Clock,
    Edit3,
    List,
    Minus,
    Plus,
    Search,
    Trash2,
    User,
    UserPlus,
    Users,
    X
} from 'lucide-react-native';

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

interface ClassSchedule {
    day: string;
    startTime: string;
}

interface ClassItem {
    id: string;
    courseId: string;
    courseName: string;
    teacherName: string;
    schedules: ClassSchedule[];
    duration: string;
    capacity: string;
    color: string;
}

import { Student, useInstitution } from '@/context/InstitutionContext';

export default function ClassesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { courses, teachers, students, classes, addClass, updateClass, removeClass, addEnrollment, enrollments, removeEnrollment } = useInstitution();
    const isDraggingGlobal = useSharedValue(0);

    const [viewMode, setViewMode] = useState<'list' | 'schedule'>('list');
    const [modalVisible, setModalVisible] = useState(false);
    const [enrollModalVisible, setEnrollModalVisible] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const CLASS_COLORS = [
        '#4C6EF5', // Indigo
        '#228BE6', // Blue
        '#15AABF', // Cyan
        '#12B886', // Teal
        '#40C057', // Green
        '#82C91E', // Lime
        '#FAB005', // Yellow Gold
        '#FD7E14', // Orange
        '#BE4BDB', // Grape
        '#7950F2'  // Violet
    ];

    const [formData, setFormData] = useState({
        courseId: '',
        teacherId: '',
        hours: '',
        minutes: '',
        capacity: '20',
        color: CLASS_COLORS[0],
        schedules: [{ day: '', startHours: '08', startMinutes: '00' }]
    });

    const [enrolledInSelected, setEnrolledInSelected] = useState<string[]>([]);

    const filteredClasses = classes.filter(item =>
        item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const calculateEndTime = (startTime: string, duration: string) => {
        const [startHours, startMinutes] = startTime.split(':').map(Number);

        // Extract hours and minutes from duration string like "40h 0m" or "1h 30m"
        const hoursMatch = duration.match(/(\d+)h/);
        const minutesMatch = duration.match(/(\d+)m/);

        const durationHours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const durationMinutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

        let endMinutes = startMinutes + durationMinutes;
        let endHours = startHours + durationHours + Math.floor(endMinutes / 60);

        endMinutes = endMinutes % 60;
        endHours = endHours % 24; // Handle wrap around if class ends next day

        return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    };

    const handleCourseSelect = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (course) {
            setFormData(prev => ({
                ...prev,
                courseId: course.id,
                hours: course.hours,
                minutes: course.minutes
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                courseId: '',
                hours: '',
                minutes: ''
            }));
        }
    };

    const handleEditPress = (cls: ClassItem) => {
        const course = courses.find(c => c.id === cls.courseId);
        const teacher = teachers.find(t => `${t.firstName} ${t.lastName}` === cls.teacherName);

        setFormData({
            courseId: cls.courseId,
            teacherId: teacher?.id || '',
            hours: course?.hours || '',
            minutes: course?.minutes || '',
            capacity: cls.capacity || '20',
            color: cls.color || CLASS_COLORS[0],
            schedules: cls.schedules.map(s => {
                const [h, m] = s.startTime.split(':');
                return { day: s.day, startHours: h, startMinutes: m };
            })
        });
        setEditingClassId(cls.id);
        setModalVisible(true);
    };

    const addScheduleSlot = () => {
        setFormData(prev => ({
            ...prev,
            schedules: [...prev.schedules, { day: '', startHours: '08', startMinutes: '00' }]
        }));
    };

    const removeScheduleSlot = (index: number) => {
        if (formData.schedules.length > 1) {
            setFormData(prev => ({
                ...prev,
                schedules: prev.schedules.filter((_, i) => i !== index)
            }));
        }
    };

    const updateScheduleSlot = (index: number, field: string, value: string) => {
        const newSchedules = [...formData.schedules];
        newSchedules[index] = { ...newSchedules[index], [field]: value };
        setFormData(prev => ({ ...prev, schedules: newSchedules }));
    };

    const openEnrollment = (cls: ClassItem) => {
        setSelectedClassId(cls.id);
        const currentEnrollments = enrollments
            .filter(e => e.classId === cls.id)
            .map(e => e.studentId);
        setEnrolledInSelected(currentEnrollments);
        setEnrollModalVisible(true);
    };

    const handleEnrollAction = (student: Student) => {
        const isEnrolled = enrolledInSelected.includes(student.id);
        const currentClass = classes.find(c => c.id === selectedClassId);
        const className = currentClass?.courseName || 'la clase';
        const studentName = `${student.firstName} ${student.lastName}`;

        if (!isEnrolled) {
            Alert.alert(
                "Confirmar Matrícula",
                `¿Deseas matricular a "${studentName}" en la clase de "${className}"?`,
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Matricular",
                        onPress: () => {
                            if (selectedClassId) {
                                addEnrollment({
                                    id: `${student.id}-${selectedClassId}-${Date.now()}`,
                                    studentId: student.id,
                                    classId: selectedClassId
                                });
                                setEnrolledInSelected(prev => [...prev, student.id]);
                            }
                        }
                    }
                ]
            );
        } else {
            Alert.alert(
                "Quitar Matrícula",
                `¿Deseas retirar a "${studentName}" de la clase de "${className}"?`,
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Retirar",
                        style: "destructive",
                        onPress: () => {
                            const enrollmentToRemove = enrollments.find(
                                e => e.classId === selectedClassId && e.studentId === student.id
                            );
                            if (enrollmentToRemove) {
                                removeEnrollment(enrollmentToRemove.id);
                                setEnrolledInSelected(prev => prev.filter(id => id !== student.id));
                            }
                        }
                    }
                ]
            );
        }
    };

    const closeEnrollModal = () => {
        setEnrollModalVisible(false);
    };


    const handleSaveClass = () => {
        const selectedCourse = courses.find(c => c.id === formData.courseId);
        const selectedTeacher = teachers.find(t => t.id === formData.teacherId);

        // Validate all schedules have a day selected
        const allDaysSelected = formData.schedules.every(s => s.day !== '');

        if (selectedCourse && selectedTeacher && allDaysSelected) {
            const classData: ClassItem = {
                id: editingClassId || Date.now().toString(),
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
                teacherName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
                schedules: formData.schedules.map(s => ({
                    day: s.day,
                    startTime: `${s.startHours}:${s.startMinutes}`
                })),
                duration: `${formData.hours || '0'}h ${formData.minutes || '0'}m`,
                capacity: formData.capacity || '20',
                color: formData.color
            };

            if (editingClassId) {
                updateClass(classData as any);
            } else {
                addClass(classData as any);
            }

            resetForm();
            setModalVisible(false);
        } else if (!allDaysSelected) {
            Alert.alert("Error", "Por favor selecciona el día para todos los horarios");
        }
    };

    const handleDeleteClass = (item: ClassItem) => {
        Alert.alert(
            "Eliminar Clase",
            `¿Estás seguro de que deseas eliminar la clase de ${item.courseName} con ${item.teacherName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                        removeClass(item.id);
                        Vibration.vibrate(100);
                    }
                }
            ]
        );
    };

    const DraggableClassCard = ({ item, colors, onEdit, onDelete, onEnroll }: any) => {
        const translateX = useSharedValue(0);
        const translateY = useSharedValue(0);
        const isDragging = useSharedValue(false);

        const panGesture = Gesture.Pan()
            .onStart(() => {
                isDragging.value = true;
                isDraggingGlobal.value = withSpring(1);
                runOnJS(Vibration.vibrate)(40);
            })
            .onUpdate((event) => {
                translateX.value = event.translationX;
                translateY.value = event.translationY;
            })
            .onEnd((event) => {
                const screenHeight = Dimensions.get('window').height;
                const absoluteY = event.absoluteY;

                if (absoluteY > screenHeight * 0.8) {
                    runOnJS(onDelete)(item);
                }

                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                isDragging.value = false;
                isDraggingGlobal.value = withSpring(0);
            });

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
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: item.color + '40' }, animatedStyle]}>
                    <View style={styles.cardMain}>
                        <View style={[styles.courseIcon, { backgroundColor: item.color + '15' }]}>
                            <BookOpen size={24} color={item.color} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={[styles.courseTitle, { color: colors.text }]}>{item.courseName}</Text>
                            <View style={styles.infoRow}>
                                <User size={14} color={colors.icon} />
                                <Text style={[styles.infoText, { color: colors.icon }]}>{item.teacherName}</Text>
                            </View>

                            {item.schedules.map((schedule: ClassSchedule, idx: number) => (
                                <View key={idx} style={styles.infoRow}>
                                    <Clock size={14} color={colors.icon} />
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.infoText, { color: colors.icon }]}>{schedule.day}: </Text>
                                        <Text style={[styles.timeText, { color: item.color }]}>
                                            {schedule.startTime} - {calculateEndTime(schedule.startTime, item.duration)}
                                        </Text>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.infoRow}>
                                <Users size={14} color={colors.icon} />
                                <Text style={[styles.infoText, { color: colors.icon }]}>Capacidad: {item.capacity}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.editCircle, { backgroundColor: colors.primary + '10' }]}
                            onPress={() => onEdit(item)}
                        >
                            <Edit3 size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </GestureDetector>
        );
    };

    const renderClassCard = ({ item }: { item: ClassItem }) => (
        <DraggableClassCard
            item={item}
            colors={colors}
            onEdit={handleEditPress}
            onDelete={handleDeleteClass}
            onEnroll={openEnrollment}
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

    const resetForm = () => {
        setFormData({
            courseId: '',
            teacherId: '',
            hours: '',
            minutes: '',
            capacity: '20',
            color: CLASS_COLORS[0],
            schedules: [{ day: '', startHours: '08', startMinutes: '00' }]
        });
        setEditingClassId(null);
    };









    const ScheduleView = () => {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleScroll}>
                {days.map(day => {
                    const dayClasses = classes
                        .filter(c => c.schedules.some(s => s.day === day))
                        .map(c => {
                            // Since a class can have multiple schedules on the same day (rare but possible), 
                            // we'll handle each schedule entry for this day
                            return c.schedules
                                .filter(s => s.day === day)
                                .map(s => ({ ...c, currentStartTime: s.startTime }));
                        })
                        .flat()
                        .sort((a, b) => a.currentStartTime.localeCompare(b.currentStartTime));

                    return (
                        <View key={day} style={styles.dayCol}>
                            <Text style={[styles.dayTitle, { color: colors.text }]}>{day}</Text>
                            {dayClasses.length > 0 ? (
                                dayClasses.map((c: any) => {
                                    const studentCount = enrollments.filter(e => e.classId === c.id).length;
                                    return (
                                        <View
                                            key={`${c.id}-${c.currentStartTime}`}
                                            style={[
                                                styles.scheduleItem,
                                                {
                                                    backgroundColor: c.color + '08',
                                                    borderColor: c.color + '40',
                                                    borderWidth: 1,
                                                    borderLeftColor: c.color,
                                                    borderLeftWidth: 5
                                                }
                                            ]}
                                        >
                                            <View style={{ flex: 1, paddingRight: 4 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                                    <Clock size={10} color={c.color} />
                                                    <Text style={[styles.scheduleTime, { color: c.color, marginLeft: 4 }]}>
                                                        {c.currentStartTime} - {calculateEndTime(c.currentStartTime, c.duration)}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.scheduleName, { color: colors.text }]} numberOfLines={2}>{c.courseName}</Text>

                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                    <Users size={10} color={colors.icon} />
                                                    <Text style={[styles.scheduleDuration, { color: colors.icon, marginLeft: 3 }]}>
                                                        {studentCount}/{c.capacity || '20'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.enrollBtn, { backgroundColor: c.color + '15' }]}
                                                onPress={() => openEnrollment(c)}
                                            >
                                                <UserPlus size={16} color={c.color} />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })

                            ) : (
                                <View style={styles.emptyDay}>
                                    <Text style={{ color: colors.icon, fontSize: 12 }}>Sin clases</Text>
                                </View>
                            )}
                        </View>
                    );
                })}

            </ScrollView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Gestión de Clases</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => setModalVisible(true)}
                >
                    <Plus color="#fff" size={24} />
                </TouchableOpacity>
            </View>

            {/* View Toggle */}
            <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                    onPress={() => setViewMode('list')}
                    style={[styles.toggleButton, viewMode === 'list' && { backgroundColor: colors.primary }]}
                >
                    <List size={20} color={viewMode === 'list' ? '#fff' : colors.icon} />
                    <Text style={[styles.toggleLabel, { color: viewMode === 'list' ? '#fff' : colors.icon }]}>Lista</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setViewMode('schedule')}
                    style={[styles.toggleButton, viewMode === 'schedule' && { backgroundColor: colors.primary }]}
                >
                    <CalendarDays size={20} color={viewMode === 'schedule' ? '#fff' : colors.icon} />
                    <Text style={[styles.toggleLabel, { color: viewMode === 'schedule' ? '#fff' : colors.icon }]}>Horario</Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'list' ? (
                <>
                    <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Search color={colors.icon} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Buscar clase o profesor..."
                            placeholderTextColor={colors.icon}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <FlatList
                        data={filteredClasses}
                        renderItem={renderClassCard}
                        keyExtractor={item => item.id}
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                    />
                </>
            ) : (
                <ScheduleView />
            )}

            {/* Registration Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingClassId ? 'Editar Clase' : 'Nueva Clase'}
                            </Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Seleccionar Materia / Curso</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0 }]}>
                                    <Picker
                                        selectedValue={formData.courseId}
                                        onValueChange={(itemValue) => handleCourseSelect(itemValue)}
                                        style={{ color: colors.text, width: '100%', height: 50 }}
                                        dropdownIconColor={colors.primary}
                                    >
                                        <Picker.Item label="Selecciona una materia..." value="" color="#666" />
                                        {courses.map(course => (
                                            <Picker.Item key={course.id} label={course.name} value={course.id} color="#000000" />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Seleccionar Profesor</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0 }]}>
                                    <Picker
                                        selectedValue={formData.teacherId}
                                        onValueChange={(itemValue) => setFormData({ ...formData, teacherId: itemValue })}
                                        style={{ color: colors.text, width: '100%', height: 50 }}
                                        dropdownIconColor={colors.primary}
                                    >
                                        <Picker.Item label="Selecciona un profesor..." value="" color="#666" />
                                        {teachers.map(teacher => (
                                            <Picker.Item
                                                key={teacher.id}
                                                label={`${teacher.firstName} ${teacher.lastName}`}
                                                value={teacher.id}
                                                color="#000000"
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>


                            <View style={[styles.formGroup, { backgroundColor: colors.background + '50', padding: 15, borderRadius: 18 }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Horarios Semanales</Text>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                                        onPress={addScheduleSlot}
                                    >
                                        <Plus size={16} color={colors.primary} />
                                        <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 4, fontSize: 13 }}>Añadir</Text>
                                    </TouchableOpacity>
                                </View>

                                {formData.schedules.map((schedule, index) => (
                                    <View key={index} style={{ marginBottom: index === formData.schedules.length - 1 ? 0 : 20, borderBottomWidth: index === formData.schedules.length - 1 ? 0 : 1, borderBottomColor: colors.border + '50', paddingBottom: index === formData.schedules.length - 1 ? 0 : 20 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <Text style={{ fontSize: 13, color: colors.icon, fontWeight: '600' }}>Horario #{index + 1}</Text>
                                            {formData.schedules.length > 1 && (
                                                <TouchableOpacity onPress={() => removeScheduleSlot(index)}>
                                                    <Minus size={18} color="#ff4d4d" />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0, marginBottom: 10 }]}>
                                            <Picker
                                                selectedValue={schedule.day}
                                                onValueChange={(v) => updateScheduleSlot(index, 'day', v)}
                                                style={{ color: colors.text, width: '100%', height: 50 }}
                                                dropdownIconColor={colors.primary}
                                            >
                                                <Picker.Item label="Selecciona el día..." value="" color="#666" />
                                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
                                                    <Picker.Item key={d} label={d} value={d} color="#000000" />
                                                ))}
                                            </Picker>
                                        </View>

                                        <View style={styles.row}>
                                            <View style={[styles.inputWrapper, { flex: 1, marginRight: 10, borderColor: colors.border }]}>
                                                <Picker
                                                    selectedValue={schedule.startHours}
                                                    onValueChange={(v) => updateScheduleSlot(index, 'startHours', v)}
                                                    style={{ color: colors.text, width: '100%', height: 50 }}
                                                    dropdownIconColor={colors.primary}
                                                >
                                                    {Array.from({ length: 24 }).map((_, i) => (
                                                        <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i.toString().padStart(2, '0')} color="#000" />
                                                    ))}
                                                </Picker>
                                            </View>
                                            <View style={[styles.inputWrapper, { flex: 1, borderColor: colors.border }]}>
                                                <Picker
                                                    selectedValue={schedule.startMinutes}
                                                    onValueChange={(v) => updateScheduleSlot(index, 'startMinutes', v)}
                                                    style={{ color: colors.text, width: '100%', height: 50 }}
                                                    dropdownIconColor={colors.primary}
                                                >
                                                    {['00', '15', '30', '45'].map(m => (
                                                        <Picker.Item key={m} label={m} value={m} color="#000" />
                                                    ))}
                                                </Picker>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Color de la Clase</Text>
                                <View style={styles.colorPicker}>
                                    {CLASS_COLORS.map(color => (
                                        <TouchableOpacity
                                            key={color}
                                            style={[
                                                styles.colorOption,
                                                { backgroundColor: color },
                                                formData.color === color && { borderWidth: 3, borderColor: colors.text }
                                            ]}
                                            onPress={() => setFormData({ ...formData, color: color })}
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Aforo Máximo</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                    <Users size={20} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej: 20"
                                        placeholderTextColor={colors.icon}
                                        keyboardType="numeric"
                                        value={formData.capacity}
                                        onChangeText={(v) => setFormData({ ...formData, capacity: v })}
                                    />
                                </View>
                            </View>


                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Duración (heredada del curso)</Text>
                                <View style={styles.row}>
                                    <View style={[styles.inputWrapper, { flex: 1, marginRight: 10, borderColor: colors.border, backgroundColor: colors.background }]}>
                                        <TextInput
                                            style={[styles.input, { color: colors.icon }]}
                                            placeholder="Hrs"
                                            placeholderTextColor={colors.icon}
                                            keyboardType="numeric"
                                            editable={false}
                                            value={formData.hours}
                                        />
                                    </View>
                                    <View style={[styles.inputWrapper, { flex: 1, borderColor: colors.border, backgroundColor: colors.background }]}>
                                        <TextInput
                                            style={[styles.input, { color: colors.icon }]}
                                            placeholder="Min"
                                            placeholderTextColor={colors.icon}
                                            keyboardType="numeric"
                                            editable={false}
                                            value={formData.minutes}
                                        />
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                onPress={handleSaveClass}
                            >
                                <Text style={styles.saveText}>
                                    {editingClassId ? 'Guardar Cambios' : 'Registrar Clase'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>


            {/* Enrollment Modal */}
            <Modal visible={enrollModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Matricular Estudiantes</Text>
                                <Text style={{ color: colors.icon, fontSize: 13 }}>
                                    {classes.find(c => c.id === selectedClassId)?.courseName}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => closeEnrollModal()}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text, marginBottom: 15 }]}>Lista de Estudiantes</Text>
                                <View style={styles.studentList}>
                                    {students.map(student => {
                                        const isSelected = enrolledInSelected.includes(student.id);
                                        return (
                                            <View
                                                key={student.id}
                                                style={[
                                                    styles.studentItem,
                                                    {
                                                        backgroundColor: colors.background,
                                                        borderColor: isSelected ? colors.primary + '40' : colors.border
                                                    }
                                                ]}
                                            >
                                                <View style={styles.studentInfo}>
                                                    <View style={[styles.avatarMini, { backgroundColor: colors.primary + '20' }]}>
                                                        <User size={16} color={colors.primary} />
                                                    </View>
                                                    <Text style={[styles.studentName, { color: colors.text }]}>
                                                        {student.firstName} {student.lastName}
                                                    </Text>
                                                </View>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.actionCircle,
                                                        { backgroundColor: isSelected ? '#ff4d4d' + '20' : colors.primary + '20' }
                                                    ]}
                                                    onPress={() => handleEnrollAction(student)}
                                                >
                                                    {isSelected ? (
                                                        <X size={18} color="#ff4d4d" />
                                                    ) : (
                                                        <Plus size={18} color={colors.primary} />
                                                    )}
                                                </TouchableOpacity>
                                            </View>

                                        );
                                    })}
                                    {students.length === 0 && (
                                        <Text style={{ color: colors.icon, fontSize: 13, fontStyle: 'italic', textAlign: 'center', width: '100%', marginTop: 20 }}>
                                            No hay estudiantes registrados.
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                    </View>
                </View>
            </Modal>


            {/* Deletion Trash Zone */}
            <Animated.View style={[styles.trashZone, trashAnimatedStyle]}>
                <View style={[styles.trashCircle, { backgroundColor: '#FF4444' }]}>
                    <Trash2 color="#FFF" size={32} />
                </View>
                <Text style={styles.trashText}>Suelta para eliminar</Text>
            </Animated.View>
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    addButton: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    toggleContainer: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 15 },
    toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
    toggleLabel: { marginLeft: 8, fontWeight: '600', fontSize: 14 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 15, height: 48, borderRadius: 12, borderWidth: 1, marginBottom: 15 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
    listContent: { paddingHorizontal: 20 },
    card: { flexDirection: 'row', padding: 15, borderRadius: 18, marginBottom: 15, borderWidth: 1, alignItems: 'center' },
    cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    courseIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1, marginLeft: 15 },
    courseName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    subText: { fontSize: 13, marginLeft: 5 },
    scheduleScroll: { paddingHorizontal: 20, paddingBottom: 40 },
    dayCol: { width: 160, marginRight: 15 },
    dayTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    scheduleItem: {
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 15,
        marginBottom: 12,
        borderLeftWidth: 4,
        flexDirection: 'row',
        alignItems: 'center'
    },
    scheduleTime: { fontSize: 11, fontWeight: 'bold' },
    scheduleName: { fontSize: 13, fontWeight: '600', marginVertical: 2 },
    scheduleDuration: { fontSize: 10 },
    emptyDay: { padding: 20, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ccc', alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 50 },
    input: { flex: 1, marginLeft: 8, fontSize: 15 },
    row: { flexDirection: 'row' },
    saveButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 40 },
    saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    studentList: {
        gap: 10,
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    studentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarMini: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    studentName: {
        fontSize: 15,
        fontWeight: '600',
    },
    actionCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    enrollBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingVertical: 5
    },
    colorOption: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    cardContent: { flex: 1, marginLeft: 15 },
    courseTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    infoText: { fontSize: 13, marginLeft: 5 },
    timeText: { fontSize: 13, fontWeight: 'bold' },
    cardActions: { flexDirection: 'row', alignItems: 'center' },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10
    },
    actionButtonText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
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
    }
});







