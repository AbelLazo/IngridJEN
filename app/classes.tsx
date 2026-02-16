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
    List,
    Plus,
    Search,
    User,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
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
    courseName: string;
    teacherName: string;
    day: string;
    startTime: string;
    duration: string;
}

import { useInstitution } from '@/context/InstitutionContext';

export default function ClassesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { courses } = useInstitution();

    const [viewMode, setViewMode] = useState<'list' | 'schedule'>('list');
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [classes, setClasses] = useState<ClassItem[]>([
        { id: '1', courseName: 'Matemáticas Avanzadas', teacherName: 'Carlos Ruíz', day: 'Lunes', startTime: '08:00', duration: '2h 0m' },
        { id: '2', courseName: 'Física Cuántica', teacherName: 'Ana Belén', day: 'Martes', startTime: '10:30', duration: '1h 30m' },
    ]);

    const [formData, setFormData] = useState({
        courseId: '',
        teacherName: '',
        day: '',
        startTime: '',
        hours: '',
        minutes: ''
    });

    const filteredClasses = classes.filter(item =>
        item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCourseSelect = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (course) {
            setFormData({
                ...formData,
                courseId: course.id,
                hours: course.hours,
                minutes: course.minutes
            });
        }
    };

    const handleAddClass = () => {
        const selectedCourse = courses.find(c => c.id === formData.courseId);
        if (selectedCourse && formData.day && formData.startTime) {
            const newClass: ClassItem = {
                id: Date.now().toString(),
                courseName: selectedCourse.name,
                teacherName: formData.teacherName || 'Sin asignar',
                day: formData.day,
                startTime: formData.startTime,
                duration: `${formData.hours || '0'}h ${formData.minutes || '0'}m`
            };
            setClasses([newClass, ...classes]);
            setFormData({ courseId: '', teacherName: '', day: '', startTime: '', hours: '', minutes: '' });
            setModalVisible(false);
        }
    };


    const renderClassCard = ({ item }: { item: ClassItem }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
    );

    const ScheduleView = () => {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleScroll}>
                {days.map(day => (
                    <View key={day} style={styles.dayCol}>
                        <Text style={[styles.dayTitle, { color: colors.text }]}>{day}</Text>
                        {classes.filter(c => c.day === day).length > 0 ? (
                            classes.filter(c => c.day === day).map(c => (
                                <View key={c.id} style={[styles.scheduleItem, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                                    <Text style={[styles.scheduleTime, { color: colors.primary }]}>{c.startTime}</Text>
                                    <Text style={[styles.scheduleName, { color: colors.text }]} numberOfLines={1}>{c.courseName}</Text>
                                    <Text style={[styles.scheduleDuration, { color: colors.icon }]}>{c.duration}</Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyDay}>
                                <Text style={{ color: colors.icon, fontSize: 12 }}>Sin clases</Text>
                            </View>
                        )}
                    </View>
                ))}
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
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Clase</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                                        <Picker.Item label="Selecciona una materia..." value="" color={colors.icon} />
                                        {courses.map(course => (
                                            <Picker.Item key={course.id} label={course.name} value={course.id} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Profesor</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                    <User size={18} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. Roberto Gómez"
                                        placeholderTextColor={colors.icon}
                                        value={formData.teacherName}
                                        onChangeText={v => setFormData({ ...formData, teacherName: v })}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.formGroup, { flex: 1.2, marginRight: 10 }]}>
                                    <Text style={[styles.label, { color: colors.text }]}>Día</Text>
                                    <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0 }]}>
                                        <Picker
                                            selectedValue={formData.day}
                                            onValueChange={(itemValue) => setFormData({ ...formData, day: itemValue })}
                                            style={{ color: colors.text, width: '100%', height: 50 }}
                                            dropdownIconColor={colors.primary}
                                        >
                                            <Picker.Item label="Selecciona..." value="" color={colors.icon} />
                                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
                                                <Picker.Item key={d} label={d} value={d} />
                                            ))}
                                        </Picker>
                                    </View>
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: colors.text }]}>Hora Inicio</Text>
                                    <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                        <Clock size={18} color={colors.icon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="08:00"
                                            placeholderTextColor={colors.icon}
                                            value={formData.startTime}
                                            onChangeText={v => setFormData({ ...formData, startTime: v })}
                                        />
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
                                onPress={handleAddClass}
                            >
                                <Text style={styles.saveText}>Registrar Clase</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
    dayCol: { width: 140, marginRight: 15 },
    dayTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    scheduleItem: { padding: 12, borderRadius: 15, marginBottom: 12, borderLeftWidth: 4 },
    scheduleTime: { fontSize: 12, fontWeight: 'bold' },
    scheduleName: { fontSize: 14, fontWeight: '600', marginVertical: 4 },
    scheduleDuration: { fontSize: 11 },
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
    saveText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
