import { Colors } from '@/constants/theme';
import { Course, useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Picker } from '@react-native-picker/picker';
import { Stack, useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, Clock, DollarSign, Edit3, Plus, Search, Trash2, X } from 'lucide-react-native';
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

export default function CoursesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { courses, addCourse, updateCourse, removeCourse } = useInstitution();
    const isDraggingGlobal = useSharedValue(0);

    const [searchQuery, setSearchQuery] = useState('');
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        hours: '',
        minutes: '',
        price: ''
    });

    const resetForm = () => {
        setFormData({ name: '', hours: '', minutes: '', price: '' });
        setEditingCourseId(null);
    };

    const filteredCourses = courses.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = () => {
        if (formData.name && (formData.hours || formData.minutes)) {
            const courseData = {
                id: editingCourseId || Date.now().toString(),
                name: formData.name,
                hours: formData.hours || '0',
                minutes: formData.minutes || '0',
                price: formData.price || '0'
            };

            if (editingCourseId) {
                updateCourse(courseData);
            } else {
                addCourse(courseData);
            }

            resetForm();
            setModalVisible(false);
        }
    };

    const handleEditPress = (course: Course) => {
        setFormData({
            name: course.name,
            hours: course.hours,
            minutes: course.minutes,
            price: course.price
        });
        setEditingCourseId(course.id);
        setModalVisible(true);
    };

    const handleDelete = (item: Course) => {
        Alert.alert(
            "Eliminar Materia",
            `¿Estás seguro de que deseas eliminar la materia ${item.name}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                        removeCourse(item.id);
                        Vibration.vibrate(100);
                    }
                }
            ]
        );
    };

    const DraggableCard = ({ item, colors, onEdit, onDelete }: any) => {
        const translateX = useSharedValue(0);
        const translateY = useSharedValue(0);
        const isDragging = useSharedValue(false);

        const screenHeight = Dimensions.get('window').height;

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
                <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, animatedStyle]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                        <BookOpen size={24} color={colors.primary} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                        <View style={styles.detailsRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                                <Clock size={14} color={colors.icon} />
                                <Text style={[styles.detailText, { color: colors.icon }]}>
                                    {item.hours}h {item.minutes}m
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <DollarSign size={14} color={colors.primary} />
                                <Text style={[styles.detailText, { color: colors.primary, fontWeight: 'bold' }]}>
                                    {item.price}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.editCircle, { backgroundColor: colors.primary + '10' }]}
                        onPress={() => onEdit(item)}
                    >
                        <Edit3 size={18} color={colors.primary} />
                    </TouchableOpacity>
                </Animated.View>
            </GestureDetector>
        );
    };

    const renderItem = ({ item }: { item: Course }) => (
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
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color={colors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Cursos / Materias</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => setModalVisible(true)}
                >
                    <Plus color="#fff" size={24} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Search color={colors.icon} size={20} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar materia..."
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            <FlatList
                data={filteredCourses}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: colors.icon }}>No hay materias registradas.</Text>
                    </View>
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
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingCourseId ? 'Editar Materia' : 'Nueva Materia'}
                            </Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Nombre de la Materia</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                    <BookOpen size={18} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. Álgebra Elemental"
                                        placeholderTextColor={colors.icon}
                                        value={formData.name}
                                        onChangeText={(v) => setFormData({ ...formData, name: v })}
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Duración</Text>
                                <View style={styles.durationRow}>
                                    <View style={[styles.durationInputGroup, { flex: 1, marginRight: 10 }]}>
                                        <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0 }]}>
                                            <Picker
                                                selectedValue={formData.hours || '0'}
                                                onValueChange={(v) => setFormData({ ...formData, hours: v })}
                                                style={{ color: colors.text, width: '100%', height: 50 }}
                                                dropdownIconColor={colors.primary}
                                            >
                                                {Array.from({ length: 9 }).map((_, i) => (
                                                    <Picker.Item key={i} label={`${i} h`} value={i.toString()} color="#000" />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>

                                    <View style={[styles.durationInputGroup, { flex: 1 }]}>
                                        <View style={[styles.inputWrapper, { borderColor: colors.border, paddingHorizontal: 0 }]}>
                                            <Picker
                                                selectedValue={formData.minutes || '0'}
                                                onValueChange={(v) => setFormData({ ...formData, minutes: v })}
                                                style={{ color: colors.text, width: '100%', height: 50 }}
                                                dropdownIconColor={colors.primary}
                                            >
                                                {['00', '15', '30', '45'].map(m => (
                                                    <Picker.Item key={m} label={`${m} m`} value={m} color="#000" />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text }]}>Costo Mensual</Text>
                                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                                    <DollarSign size={18} color={colors.icon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="Ej. 150"
                                        placeholderTextColor={colors.icon}
                                        keyboardType="numeric"
                                        value={formData.price}
                                        onChangeText={(v) => setFormData({ ...formData, price: v })}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                onPress={handleSave}
                            >
                                <Text style={styles.submitButtonText}>
                                    {editingCourseId ? 'Guardar Cambios' : 'Registrar Materia'}
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
        </View>
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
        padding: 5,
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
        marginTop: 10,
        marginBottom: 20,
        paddingHorizontal: 15,
        height: 50,
        borderRadius: 15,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 22,
        marginBottom: 14,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    iconContainer: {
        width: 54,
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        marginLeft: 16,
    },
    cardName: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        marginLeft: 5,
    },
    durationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    durationInputGroup: {
        justifyContent: 'center',
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
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 25,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    formGroup: {
        marginBottom: 18,
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
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 56,
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
        marginTop: 15,
        marginBottom: 35,
        elevation: 4,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 17,
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
    }
});
