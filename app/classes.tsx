import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Picker } from '@react-native-picker/picker';
import { Stack, useRouter } from 'expo-router';
import {
    BookOpen,
    CalendarDays,
    Calendar as CalendarIcon,
    ChevronLeft,
    Clock,
    Edit3,
    List,
    Plus,
    Search,
    User,
    UserPlus,
    X
} from 'lucide-react-native';

import React, { useState } from 'react';
import {
    Alert,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ClassItem {
    id: string;
    courseId: string;
    courseName: string;
    teacherName: string;
    day: string;
    startTime: string;
    duration: string;
}

import { Student, useInstitution } from '@/context/InstitutionContext';

export default function ClassesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { courses, teachers, students, classes, addClass, updateClass, addEnrollment, enrollments, removeEnrollment } = useInstitution();

    const [viewMode, setViewMode] = useState<'list' | 'schedule'>('list');
    const [modalVisible, setModalVisible] = useState(false);
    const [enrollModalVisible, setEnrollModalVisible] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        courseId: '',
        teacherId: '',
        day: '',
        startHours: '08',
        startMinutes: '00',
        hours: '',
        minutes: ''
    });

    const [enrolledInSelected, setEnrolledInSelected] = useState<string[]>([]);

    const filteredClasses = classes.filter(item =>
        item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        const [h, m] = cls.startTime.split(':');
        const course = courses.find(c => c.id === cls.courseId);
        const teacher = teachers.find(t => `${t.firstName} ${t.lastName}` === cls.teacherName);

        setFormData({
            courseId: cls.courseId,
            teacherId: teacher?.id || '',
            day: cls.day,
            startHours: h,
            startMinutes: m,
            hours: course?.hours || '',
            minutes: course?.minutes || ''
        });
        setEditingClassId(cls.id);
        setModalVisible(true);
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

        if (selectedCourse && selectedTeacher && formData.day) {
            const classData: ClassItem = {
                id: editingClassId || Date.now().toString(),
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
                teacherName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
                day: formData.day,
                startTime: `${formData.startHours}:${formData.startMinutes}`,
                duration: `${formData.hours || '0'}h ${formData.minutes || '0'}m`
            };

            if (editingClassId) {
                updateClass(classData);
            } else {
                addClass(classData);
            }

            resetForm();
            setModalVisible(false);
        }
    };

    const resetForm = () => {
        setFormData({
            courseId: '',
            teacherId: '',
            day: '',
            startHours: '08',
            startMinutes: '00',
            hours: '',
            minutes: ''
        });
        setEditingClassId(null);
    };







    const renderClassCard = ({ item }: { item: ClassItem }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                    <BookOpen size={20} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.courseName, { color: colors.text }]}>{item.courseName}</Text>
                    <View style={styles.infoRow}>
                        <User size={14} color={colors.icon} />
                        <Text style={[styles.subText, { color: colors.icon }]}>{item.teacherName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <CalendarIcon size={14} color={colors.icon} />
                        <Text style={[styles.subText, { color: colors.icon }]}>{item.day}</Text>
                        <Clock size={14} color={colors.icon} style={{ marginLeft: 12 }} />
                        <Text style={[styles.subText, { color: colors.icon }]}>{item.startTime} ({item.duration})</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.editCircle, { backgroundColor: colors.primary + '10' }]}
                onPress={() => handleEditPress(item)}
            >
                <Edit3 size={18} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );

    const ScheduleView = () => {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleScroll}>
                {days.map(day => {
                    const dayClasses = classes
                        .filter(c => c.day === day)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    return (
                        <View key={day} style={styles.dayCol}>
                            <Text style={[styles.dayTitle, { color: colors.text }]}>{day}</Text>
                            {dayClasses.length > 0 ? (
                                dayClasses.map(c => (
                                    <View
                                        key={c.id}
                                        style={[styles.scheduleItem, { backgroundColor: colors.card, borderColor: colors.primary + '30', borderWidth: 1 }]}
                                    >
                                        <View style={{ flex: 1, paddingRight: 4 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                                <Clock size={10} color={colors.primary} />
                                                <Text style={[styles.scheduleTime, { color: colors.primary, marginLeft: 4 }]}>{c.startTime}</Text>
                                            </View>
                                            <Text style={[styles.scheduleName, { color: colors.text }]} numberOfLines={2}>{c.courseName}</Text>
                                            <Text style={[styles.scheduleDuration, { color: colors.icon, fontSize: 10 }]}>{c.duration}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.enrollBtn, { backgroundColor: colors.primary + '15' }]}
                                            onPress={() => openEnrollment(c)}
                                        >
                                            <UserPlus size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))
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


                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Día</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0 }]}>
                                    <Picker
                                        selectedValue={formData.day}
                                        onValueChange={(itemValue) => setFormData({ ...formData, day: itemValue })}
                                        style={{ color: colors.text, width: '100%', height: 50 }}
                                        dropdownIconColor={colors.primary}
                                    >
                                        <Picker.Item label="Selecciona el día..." value="" color="#666" />
                                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
                                            <Picker.Item key={d} label={d} value={d} color="#000000" />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Hora Inicio</Text>
                                <View style={styles.row}>
                                    <View style={[styles.inputWrapper, { flex: 1, marginRight: 8, paddingHorizontal: 0, height: 55 }]}>
                                        <Picker
                                            selectedValue={formData.startHours}
                                            onValueChange={(v) => setFormData({ ...formData, startHours: v })}
                                            style={{ color: colors.text, width: '100%' }}
                                            dropdownIconColor={colors.primary}
                                            mode="dropdown"
                                        >
                                            {Array.from({ length: 24 }).map((_, i) => {
                                                const h = i.toString().padStart(2, '0');
                                                return <Picker.Item key={h} label={h} value={h} color="#000000" />;
                                            })}
                                        </Picker>
                                    </View>
                                    <View style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 0, height: 55 }]}>
                                        <Picker
                                            selectedValue={formData.startMinutes}
                                            onValueChange={(v) => setFormData({ ...formData, startMinutes: v })}
                                            style={{ color: colors.text, width: '100%' }}
                                            dropdownIconColor={colors.primary}
                                            mode="dropdown"
                                        >
                                            {['00', '15', '30', '45'].map(m => (
                                                <Picker.Item key={m} label={m} value={m} color="#000000" />
                                            ))}
                                        </Picker>
                                    </View>
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
    }
});







