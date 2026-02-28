import PeriodHeader from '@/components/PeriodHeader';
import { Colors } from '@/constants/theme';
import { Student } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    Clock,
    Download,
    Edit3,
    List,
    Minus,
    Plus,
    RefreshCcw,
    Search,
    Trash2,
    User,
    UserPlus,
    Users,
    X
} from 'lucide-react-native';

import * as Haptics from 'expo-haptics';
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
import { useInstitution } from '../context/InstitutionContext';

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
    cycleId: string;
}


const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

export default function ClassesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const {
        courses, students, teachers, classes, addClass, updateClass, removeClass,
        enrollments, addEnrollment, updateEnrollment, removeEnrollment, currentCycleId, academicCycles, updateEnrollmentDate
    } = useInstitution();
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
        cycleId: currentCycleId,
        schedules: [{ day: '', startHours: '08', startMinutes: '00' }]
    });

    const [enrolledInSelected, setEnrolledInSelected] = useState<string[]>([]);

    // Additional modals
    const [mergeModalVisible, setMergeModalVisible] = useState(false);
    const [selectedSourceClassIds, setSelectedSourceClassIds] = useState<string[]>([]);
    const [moveStudentId, setMoveStudentId] = useState<string | null>(null);
    const [targetMoveClassId, setTargetMoveClassId] = useState<string | null>(null);

    // Date Picker Modals State
    const [isEnrollConfirmVisible, setIsEnrollConfirmVisible] = useState(false);
    const [studentToEnroll, setStudentToEnroll] = useState<Student | null>(null);
    const [enrollDate, setEnrollDate] = useState(new Date());
    const [showEnrollDatePicker, setShowEnrollDatePicker] = useState(false);

    const [isWithdrawConfirmVisible, setIsWithdrawConfirmVisible] = useState(false);
    const [studentToWithdraw, setStudentToWithdraw] = useState<Student | null>(null);

    const [isMoveConfirmVisible, setIsMoveConfirmVisible] = useState(false);
    const [moveDate, setMoveDate] = useState(new Date());
    const [showMoveDatePicker, setShowMoveDatePicker] = useState(false);

    const [isEditDateVisible, setIsEditDateVisible] = useState(false);
    const [enrollmentToEdit, setEnrollmentToEdit] = useState<any>(null);
    const [editDate, setEditDate] = useState(new Date());
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);

    const getValidActiveEnrollments = (classId: string) => {
        return enrollments.filter((e: any) => {
            if (e.classId !== classId || e.status !== 'active') return false;
            const student = students.find((s: any) => s.id === e.studentId);
            if (!student || student.status !== 'active') return false;
            const currentCycle = academicCycles.find((ac: any) => ac.id === currentCycleId);
            const cycleYear = currentCycle?.name.match(/\d{4}/)?.[0];
            return cycleYear ? student.activeYears?.includes(cycleYear) : false;
        });
    };
    const filteredClasses = classes.filter((item: any) => {
        const matchesSearch = item.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCycle = item.cycleId === currentCycleId;
        return matchesSearch && matchesCycle;
    });

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

        return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')} `;
    };

    const checkTimeOverlap = (start1: string, duration1: string, start2: string, duration2: string) => {
        const getMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };
        const getDurMins = (dur: string) => {
            const hMatch = dur.match(/(\d+)h/);
            const mMatch = dur.match(/(\d+)m/);
            const h = hMatch ? parseInt(hMatch[1]) : 0;
            const m = mMatch ? parseInt(mMatch[1]) : 0;
            return h * 60 + m;
        };
        const s1 = getMinutes(start1);
        const e1 = s1 + getDurMins(duration1);
        const s2 = getMinutes(start2);
        const e2 = s2 + getDurMins(duration2);

        return s1 < e2 && s2 < e1;
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
        const teacher = teachers.find(t => `${t.firstName} ${t.lastName} ` === cls.teacherName);

        setFormData({
            courseId: cls.courseId,
            teacherId: teacher?.id || '',
            hours: course?.hours || '',
            minutes: course?.minutes || '',
            capacity: cls.capacity || '20',
            color: cls.color || CLASS_COLORS[0],
            cycleId: cls.cycleId || currentCycleId,
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
        const currentActiveEnrollments = getValidActiveEnrollments(cls.id).map(e => e.studentId);
        setEnrolledInSelected(currentActiveEnrollments);
        setEnrollModalVisible(true);
    };

    const handleEnrollAction = (student: Student) => {
        const isEnrolled = enrolledInSelected.includes(student.id);
        const currentClass = classes.find(c => c.id === selectedClassId);
        if (!currentClass) return;

        const className = currentClass.courseName || 'la clase';
        const studentName = `${student.firstName} ${student.lastName} `;

        if (!isEnrolled) {
            const withdrawnEnrollment = enrollments.find(e => e.studentId === student.id && e.classId === selectedClassId && e.status === 'withdrawn');

            const proceedEnrollment = () => {
                // Check student schedule overlaps
                const studentActiveClasses = enrollments
                    .filter(e => e.studentId === student.id && e.status === 'active' && e.classId !== selectedClassId)
                    .map(e => classes.find(c => c.id === e.classId && c.cycleId === currentCycleId))
                    .filter(c => c !== undefined) as ClassItem[];

                let conflictFound = false;
                let conflictMsg = '';

                for (const existingClass of studentActiveClasses) {
                    for (const existingSchedule of existingClass.schedules) {
                        for (const targetSchedule of currentClass.schedules) {
                            if (existingSchedule.day === targetSchedule.day) {
                                if (checkTimeOverlap(targetSchedule.startTime, currentClass.duration, existingSchedule.startTime, existingClass.duration)) {
                                    conflictFound = true;
                                    conflictMsg = `El alumno ya tiene la clase de "${existingClass.courseName}" en este horario.`;
                                    break;
                                }
                            }
                        }
                        if (conflictFound) break;
                    }
                    if (conflictFound) break;
                }

                if (conflictFound) {
                    Alert.alert("Conflicto de Horario", conflictMsg);
                    return;
                }

                // Show the custom modal instead of Alert
                setStudentToEnroll(student);
                setEnrollDate(new Date());
                setIsEnrollConfirmVisible(true);
            };

            const currentCapacity = parseInt(currentClass.capacity) || 20;
            const currentEnrolledCount = selectedClassId ? getValidActiveEnrollments(selectedClassId).length : 0;

            if (currentEnrolledCount >= currentCapacity) {
                Alert.alert(
                    "Aforo Excedido",
                    `La clase ha alcanzado su límite de ${currentCapacity} alumnos.No se pueden matricular más alumnos de forma individual.`
                );
            } else {
                proceedEnrollment();
            }
        } else {
            setStudentToWithdraw(student);
            setIsWithdrawConfirmVisible(true);
        }
    };

    const handleFinalizeMove = () => {
        if (!moveStudentId || !targetMoveClassId || !selectedClassId) return;

        const targetClass = classes.find(c => c.id === targetMoveClassId);
        if (!targetClass) return;

        const currentEnrollment = enrollments.find(e => e.classId === selectedClassId && e.studentId === moveStudentId && e.status === 'active');
        if (!currentEnrollment) return;

        const targetCapacity = parseInt(targetClass.capacity) || 20;
        const targetEnrolledCount = targetMoveClassId ? getValidActiveEnrollments(targetMoveClassId).length : 0;

        const existingTargetEnrollment = enrollments.find(e => e.classId === targetMoveClassId && e.studentId === moveStudentId && e.status === 'active');
        if (existingTargetEnrollment) {
            Alert.alert("Error", "Este alumno ya está inscrito activamente en la clase de destino seleccionada.");
            return;
        }

        const executeMove = () => {
            // Check overlaps in target class
            const studentActiveClasses = enrollments
                .filter(e => e.studentId === moveStudentId && e.status === 'active' && e.classId !== targetMoveClassId)
                .map(e => classes.find(c => c.id === e.classId && c.cycleId === currentCycleId))
                .filter(c => c !== undefined) as ClassItem[];

            let conflictFound = false;
            let conflictMsg = '';

            for (const existingClass of studentActiveClasses) {
                for (const existingSchedule of existingClass.schedules) {
                    for (const targetSchedule of targetClass.schedules) {
                        if (existingSchedule.day === targetSchedule.day) {
                            if (checkTimeOverlap(targetSchedule.startTime, targetClass.duration, existingSchedule.startTime, existingClass.duration)) {
                                conflictFound = true;
                                conflictMsg = `El alumno ya tiene la clase de "${existingClass.courseName}" en este horario.`;
                                break;
                            }
                        }
                    }
                    if (conflictFound) break;
                }
                if (conflictFound) break;
            }

            if (conflictFound) {
                Alert.alert("Conflicto de Horario", conflictMsg);
                return;
            }

            // Muestra Modal de Confirmación de Fecha de Traslado
            setMoveDate(new Date());
            setIsMoveConfirmVisible(true);
            setMergeModalVisible(false); // Cierra el modal de selección de origen
        };

        if (targetEnrolledCount >= targetCapacity) {
            Alert.alert(
                "Aforo Excedido en Destino",
                `La clase destino ha alcanzado su límite de ${targetCapacity} alumnos.No puedes añadir más alumnos manualmente.`
            );
        } else {
            executeMove();
        }
    };

    const handleRevertMerge = (targetClass: ClassItem) => {
        const sourceClasses = classes.filter(c => c.mergedToClassId === targetClass.id);

        if (sourceClasses.length === 0) {
            Alert.alert("Error", "No se encontraron clases de origen vinculadas a esta importación.");
            return;
        }

        Alert.alert(
            "Deshacer Importación",
            `¿Estás seguro que deseas deshacer la importación masiva ? Esta acción retirará a todos los alumnos importados de la clase actual("${targetClass.courseName}") y de cualquier otra a la que hayan sido movidos posteriormente, además eliminará el vínculo de fusión de las clases de origen.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Deshacer Importación",
                    style: "destructive",
                    onPress: () => {
                        const importedEnrollments = enrollments.filter(e => {
                            const isImportedFlag = e.isImported === true;
                            const isDirectImport = e.classId === targetClass.id && !e.originalImportedClassId;
                            const isTrackedImport = e.originalImportedClassId === targetClass.id;
                            return isImportedFlag && (isDirectImport || isTrackedImport);
                        });

                        importedEnrollments.forEach(e => {
                            removeEnrollment(e.id);
                        });

                        sourceClasses.forEach(sourceClass => {
                            const updatedSourceClass = { ...sourceClass };
                            delete updatedSourceClass.mergedToClassId;
                            updateClass({ ...updatedSourceClass, mergedToClassId: null } as any);
                        });

                        Alert.alert("Éxito", "La importación ha sido deshecha exitosamente.");
                    }
                }
            ]
        );
    };

    const handleConfirmImportState = (targetClass: ClassItem) => {
        const sourceClasses = classes.filter(c => c.mergedToClassId === targetClass.id);

        if (sourceClasses.length === 0) {
            Alert.alert("Error", "No se encontraron clases de origen vinculadas a esta importación.");
            return;
        }

        Alert.alert(
            "Confirmar Importación",
            `¿Estás seguro que deseas confirmar la importación masiva ? Esta acción consolidará permanentemente a los alumnos importados en la clase actual("${targetClass.courseName}") y no se podrá deshacer masivamente.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar y Consolidar",
                    onPress: () => {
                        sourceClasses.forEach(sourceClass => {
                            updateClass({
                                ...sourceClass,
                                mergedToClassId: undefined
                            });
                        });
                        Alert.alert("Éxito", "Las importaciones han sido confirmadas.");
                    }
                }
            ]
        );
    };

    const handleConfirmMerge = () => {
        if (!selectedClassId || selectedSourceClassIds.length === 0) return;

        const targetClass = classes.find(c => c.id === selectedClassId);
        if (!targetClass) return;

        const sourceStudents = enrollments
            .filter(e => selectedSourceClassIds.includes(e.classId) && e.status === 'active')
            .filter(e => {
                const s = students.find(st => st.id === e.studentId);
                if (!s || s.status !== 'active') return false;
                const currentCycle = academicCycles.find(ac => ac.id === currentCycleId);
                const cycleYear = currentCycle?.name.match(/\d{4}/)?.[0];
                return cycleYear ? s.activeYears?.includes(cycleYear) : false;
            })
            .map(e => e.studentId);

        const uniqueSourceStudents = Array.from(new Set(sourceStudents));

        const alreadyEnrolled = selectedClassId ? getValidActiveEnrollments(selectedClassId).map(e => e.studentId) : [];

        const studentsToImport = uniqueSourceStudents.filter(id => !alreadyEnrolled.includes(id));

        if (studentsToImport.length === 0) {
            Alert.alert("Atención", "Todos los estudiantes de las clases origen ya están en la clase destino.");
            setMergeModalVisible(false);
            setSelectedSourceClassIds([]);
            return;
        }

        const targetCapacity = parseInt(targetClass.capacity) || 20;
        const potentialTotal = alreadyEnrolled.length + studentsToImport.length;

        const proceedMerge = () => {
            let conflictFound = false;
            let conflictMsg = '';

            for (const studentId of studentsToImport) {
                const studentActiveClasses = enrollments
                    .filter(e => e.studentId === studentId && e.status === 'active' && e.classId !== selectedClassId)
                    .map(e => classes.find(c => c.id === e.classId && c.cycleId === currentCycleId))
                    .filter(c => c !== undefined) as ClassItem[];

                for (const existingClass of studentActiveClasses) {
                    for (const existingSchedule of existingClass.schedules) {
                        for (const targetSchedule of targetClass.schedules) {
                            if (existingSchedule.day === targetSchedule.day) {
                                if (checkTimeOverlap(targetSchedule.startTime, targetClass.duration, existingSchedule.startTime, existingClass.duration)) {
                                    conflictFound = true;
                                    const student = students.find(s => s.id === studentId);
                                    conflictMsg = `El alumno ${student?.firstName} ya tiene la clase "${existingClass.courseName}" en este horario.Importación cancelada.`;
                                    break;
                                }
                            }
                        }
                        if (conflictFound) break;
                    }
                    if (conflictFound) break;
                }
                if (conflictFound) break;
            }

            if (conflictFound) {
                Alert.alert("Conflicto de Horario", conflictMsg);
                return;
            }

            studentsToImport.forEach(studentId => {
                addEnrollment({
                    id: `${studentId} -${selectedClassId} -${Date.now()} -${Math.random()} `,
                    studentId: studentId,
                    classId: selectedClassId,
                    date: new Date().toISOString().split('T')[0],
                    status: 'active',
                    isImported: true,
                    originalImportedClassId: selectedClassId
                });
            });

            selectedSourceClassIds.forEach(sourceId => {
                const sourceClass = classes.find(c => c.id === sourceId);
                if (sourceClass) {
                    updateClass({
                        ...sourceClass,
                        mergedToClassId: selectedClassId
                    });
                }
            });

            setMergeModalVisible(false);
            setSelectedSourceClassIds([]);
            setEnrollModalVisible(false);
            Alert.alert("Éxito", `Se han importado ${studentsToImport.length} alumnos correctamente.`);
        };

        if (potentialTotal > targetCapacity) {
            Alert.alert(
                "Aforo Excedido en Destino",
                `La importación sumará un total de ${potentialTotal} alumnos, superando el límite de ${targetCapacity}.`,
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Continuar (Importar)", onPress: proceedMerge }
                ]
            );
        } else {
            proceedMerge();
        }
    };

    const closeEnrollModal = () => {
        setEnrollModalVisible(false);
        setMoveStudentId(null);
        setTargetMoveClassId(null);
    };

    const handleSaveClass = () => {
        const selectedCourse = courses.find(c => c.id === formData.courseId);
        const selectedTeacher = teachers.find(t => t.id === formData.teacherId);

        // Validate all schedules have a day selected
        const allDaysSelected = formData.schedules.every(s => s.day !== '');

        if (selectedCourse && selectedTeacher && allDaysSelected) {
            const newDuration = `${formData.hours || '0'}h ${formData.minutes || '0'} m`;

            // Validate General Schedule Overlap (Single Environment)
            const cycleClasses = classes.filter(
                c => c.id !== editingClassId && c.cycleId === currentCycleId
            );

            let conflictFound = false;
            let conflictMsg = '';

            for (const existingClass of cycleClasses) {
                for (const existingSchedule of existingClass.schedules) {
                    for (const targetSchedule of formData.schedules) {
                        if (existingSchedule.day === targetSchedule.day) {
                            const newStart = `${targetSchedule.startHours}:${targetSchedule.startMinutes} `;
                            if (checkTimeOverlap(existingSchedule.startTime, existingClass.duration, newStart, newDuration)) {
                                conflictFound = true;
                                conflictMsg = `Ya existe la clase "${existingClass.courseName}" dictada por ${existingClass.teacherName} el ${existingSchedule.day} a las ${existingSchedule.startTime}. Todo opera en el mismo ambiente.`;
                                break;
                            }
                        }
                    }
                    if (conflictFound) break;
                }
                if (conflictFound) break;
            }

            if (conflictFound) {
                Alert.alert("Conflicto de Horario", conflictMsg);
                return;
            }

            const classData: ClassItem = {
                id: editingClassId || Date.now().toString(),
                courseId: selectedCourse.id,
                courseName: selectedCourse.name,
                teacherName: `${selectedTeacher.firstName} ${selectedTeacher.lastName} `,
                schedules: formData.schedules.map(s => ({
                    day: s.day,
                    startTime: `${s.startHours}:${s.startMinutes} `
                })),
                duration: `${formData.hours || '0'}h ${formData.minutes || '0'} m`,
                capacity: formData.capacity || '20',
                color: formData.color,
                cycleId: currentCycleId || formData.cycleId // Forzar ciclo abierto en el Header
            };

            if (editingClassId) {
                updateClass(classData);
            } else {
                addClass(classData);
            }

            resetForm();
            setModalVisible(false);
        } else if (!allDaysSelected) {
            Alert.alert("Error", "Por favor selecciona el día para todos los horarios");
        }
    };

    const handleDeleteClass = (item: ClassItem) => {
        const enrolledCount = getValidActiveEnrollments(item.id).length;

        if (enrolledCount > 0) {
            Alert.alert(
                "No se puede eliminar",
                `La clase de ${item.courseName} no puede ser eliminada porque tiene ${enrolledCount} ${enrolledCount === 1 ? 'alumno activo' : 'alumnos activos'}. Por favor, retire o mueva a los alumnos primero.`
            );
            return;
        }

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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }
                }
            ]
        );
    };

    const DraggableClassCard = ({ item, colors, onEdit, onDelete, onEnroll, onDragStart }: any) => {
        const translateX = useSharedValue(0);
        const translateY = useSharedValue(0);
        const isDragging = useSharedValue(false);

        const screenHeight = Dimensions.get('window').height;

        const enrolledCount = getValidActiveEnrollments(item.id).length;
        const capacityInt = parseInt(item.capacity || '20');
        const isOverflow = enrolledCount > capacityInt;

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
                                borderColor: item.color || (colorScheme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'),
                            }
                        ]}
                    >
                        <View style={styles.liquidHighlight} />


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
                                    <Users size={14} color={isOverflow ? '#ff4d4d' : colors.icon} />
                                    <Text style={[styles.infoText, { color: isOverflow ? '#ff4d4d' : colors.icon, fontWeight: isOverflow ? 'bold' : 'normal' }]}>
                                        Capacidad: {enrolledCount}/{item.capacity} {isOverflow ? '(Sobrecupo)' : ''}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.cardActions, { borderLeftWidth: 1, borderLeftColor: colorScheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', paddingLeft: 12 }]}>
                            {classes.some(c => c.mergedToClassId === item.id) && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.editCircle, { backgroundColor: '#4CAF5020' }]}
                                        onPress={() => handleConfirmImportState(item)}
                                    >
                                        <Check size={18} color="#4CAF50" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.editCircle, { backgroundColor: '#ff4d4d20' }]}
                                        onPress={() => handleRevertMerge(item)}
                                    >
                                        <RefreshCcw size={18} color="#ff4d4d" />
                                    </TouchableOpacity>
                                </>
                            )}
                            {!item.mergedToClassId && !classes.some(c => c.mergedToClassId === item.id) &&
                                getValidActiveEnrollments(item.id).length === 0 &&
                                academicCycles.find(ac => ac.id === item.cycleId)?.name.toLowerCase().includes('anual') && (
                                    <TouchableOpacity
                                        style={[styles.editCircle, { backgroundColor: colors.primary + '20' }]}
                                        onPress={() => { setSelectedClassId(item.id); setSelectedSourceClassIds([]); setMergeModalVisible(true); }}
                                    >
                                        <Download size={18} color={colors.primary} />
                                    </TouchableOpacity>
                                )}
                            <TouchableOpacity
                                style={[styles.editCircle, { backgroundColor: colors.primary + '10' }]}
                                onPress={() => onEdit(item)}
                            >
                                <Edit3 size={18} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </BlurView>
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

    const resetForm = () => {
        setFormData({
            courseId: '',
            teacherId: '',
            hours: '',
            minutes: '',
            capacity: '20',
            color: CLASS_COLORS[0],
            cycleId: currentCycleId,
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
                        .filter(c => c.cycleId === currentCycleId && c.schedules.some(s => s.day === day))
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
                                    const studentCount = getValidActiveEnrollments(c.id).length;
                                    return (
                                        <View
                                            key={`${c.id} -${c.currentStartTime} `}
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <PeriodHeader
                title="Gestión de Clases"
                onBack={() => router.back()}
                rightAction={
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            if (!currentCycleId) {
                                Alert.alert('Seleccionar Periodo', 'Debe seleccionar un periodo antes de crear una clase.');
                                return;
                            }
                            setModalVisible(true);
                        }}
                    >
                        <Plus color="#fff" size={24} />
                    </TouchableOpacity>
                }
            />

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
                    <BlurView
                        intensity={40}
                        tint={colorScheme === 'light' ? 'light' : 'dark'}
                        style={[
                            styles.searchBar,
                            {
                                backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
                                borderColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                            }
                        ]}
                    >
                        <Search color={colorScheme === 'light' ? '#666' : '#AAA'} size={20} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Buscar clase o profesor..."
                            placeholderTextColor={colorScheme === 'light' ? '#999' : '#777'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </BlurView>
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
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
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
                                                label={`${teacher.firstName} ${teacher.lastName} `}
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
                                        onChangeText={(v: string) => setFormData({ ...formData, capacity: v })}
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
                                {(() => {
                                    const currentClass = classes.find(c => c.id === selectedClassId);
                                    const currentCapacity = parseInt(currentClass?.capacity || '20');
                                    const currentEnrolled = selectedClassId ? getValidActiveEnrollments(selectedClassId).length : 0;
                                    const isOverflow = currentEnrolled > currentCapacity;

                                    return (
                                        <>
                                            <Text style={[styles.modalTitle, { color: colors.text }]}>Matricular Estudiantes</Text>
                                            <Text style={{ color: colors.icon, fontSize: 13 }}>
                                                {currentClass?.courseName}
                                            </Text>
                                            <Text style={{ color: isOverflow ? '#ff4d4d' : colors.icon, fontSize: 13, fontWeight: isOverflow ? 'bold' : 'normal', marginTop: 4 }}>
                                                Aforo: {currentEnrolled}/{currentCapacity} {isOverflow ? '(Sobrecupo)' : ''}
                                            </Text>
                                        </>
                                    );
                                })()}
                            </View>
                            <TouchableOpacity onPress={() => closeEnrollModal()}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.text, marginBottom: 15 }]}>Lista de Estudiantes</Text>
                                <View style={styles.studentList}>
                                    {students.filter(s => {
                                        if (s.status !== 'active') return false;

                                        const currentCycle = academicCycles.find(ac => ac.id === currentCycleId);
                                        const cycleYear = currentCycle?.name.match(/\d{4}/)?.[0];

                                        return cycleYear ? s.activeYears?.includes(cycleYear) : false;
                                    }).map(student => {
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
                                                <View style={[styles.studentInfo, { flex: 1, marginRight: 10 }]}>
                                                    <View style={[styles.avatarMini, { backgroundColor: colors.primary + '20' }]}>
                                                        <User size={16} color={colors.primary} />
                                                    </View>
                                                    <Text style={[styles.studentName, { color: colors.text, flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                                                        {student.firstName} {student.lastName}
                                                    </Text>
                                                </View>

                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {isSelected && (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.actionCircle,
                                                                { backgroundColor: colors.primary + '20', marginRight: 10 }
                                                            ]}
                                                            onPress={() => {
                                                                setMoveStudentId(student.id);
                                                            }}
                                                        >
                                                            <ArrowRight size={18} color={colors.primary} />
                                                        </TouchableOpacity>
                                                    )}
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
                                                    {isSelected && (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.actionCircle,
                                                                { backgroundColor: colors.icon + '20', marginLeft: 10 }
                                                            ]}
                                                            onPress={() => {
                                                                const activeEnrollment = enrollments.find((e: any) => e.classId === selectedClassId && e.studentId === student.id && e.status === 'active');
                                                                if (activeEnrollment) {
                                                                    setEnrollmentToEdit(activeEnrollment);
                                                                    setEditDate(new Date(`${activeEnrollment.date}T12:00:00`));
                                                                    setIsEditDateVisible(true);
                                                                }
                                                            }}
                                                        >
                                                            <CalendarDays size={18} color={colors.text} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
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

            {/* Withdraw Student Confirm Modal */}
            <Modal visible={isWithdrawConfirmVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal, maxHeight: '80%', borderRadius: 24, padding: 24 }]}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#ff4d4d20', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                                <Trash2 size={28} color="#ff4d4d" />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 22, textAlign: 'center', marginBottom: 10 }]}>
                                Retirar Estudiante
                            </Text>
                            <Text style={{ color: colors.icon, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
                                ¿Deseas retirar a <Text style={{ fontWeight: 'bold' }}>{studentToWithdraw?.firstName} {studentToWithdraw?.lastName}</Text> de esta clase?
                            </Text>
                            <Text style={{ color: colors.icon, fontSize: 14, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>
                                Se conservarán sus registros de pagos históricos.
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flex: 1, marginRight: 10 }]}
                                onPress={() => {
                                    setStudentToWithdraw(null);
                                    setIsWithdrawConfirmVisible(false);
                                }}
                            >
                                <Text style={[styles.saveText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: '#ff4d4d', flex: 1, marginLeft: 10 }]}
                                onPress={() => {
                                    if (studentToWithdraw && selectedClassId) {
                                        const enrollmentToWithdraw = enrollments.find(
                                            e => e.classId === selectedClassId && e.studentId === studentToWithdraw.id && e.status !== 'withdrawn'
                                        );
                                        if (enrollmentToWithdraw) {
                                            updateEnrollment({
                                                ...enrollmentToWithdraw,
                                                status: 'withdrawn',
                                                withdrawalDate: new Date().toISOString().split('T')[0]
                                            });
                                            setEnrolledInSelected(prev => prev.filter(id => id !== studentToWithdraw.id));
                                        }
                                        setIsWithdrawConfirmVisible(false);
                                        setStudentToWithdraw(null);
                                    }
                                }}
                            >
                                <Text style={styles.saveText}>Confirmar Retiro</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Move Student Modal */}
            <Modal visible={!!moveStudentId} transparent animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal, maxHeight: '80%', borderRadius: 24 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Mover Alumno</Text>
                            <TouchableOpacity onPress={() => setMoveStudentId(null)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.text, marginBottom: 15 }}>
                            Selecciona la nueva clase para {students.find(s => s.id === moveStudentId)?.firstName}:
                        </Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {classes
                                .filter(c => c.cycleId === currentCycleId && c.id !== selectedClassId)
                                .map(c => {
                                    const isSelected = targetMoveClassId === c.id;
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[
                                                styles.studentItem,
                                                { backgroundColor: colors.background, borderColor: isSelected ? colors.primary : colors.border, marginBottom: 10 }
                                            ]}
                                            onPress={() => setTargetMoveClassId(c.id)}
                                        >
                                            <View>
                                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{c.courseName}</Text>
                                                <Text style={{ color: colors.icon, fontSize: 12 }}>{c.teacherName}</Text>
                                                <Text style={{ color: colors.icon, fontSize: 12 }}>
                                                    {c.schedules.map(s => `${s.day} ${s.startTime} `).join(', ')}
                                                </Text>
                                            </View>
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 12,
                                                borderWidth: 2, borderColor: isSelected ? colors.primary : colors.icon,
                                                justifyContent: 'center', alignItems: 'center'
                                            }}>
                                                {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            {classes.filter(c => c.cycleId === currentCycleId && c.id !== selectedClassId).length === 0 && (
                                <Text style={{ color: colors.icon, textAlign: 'center', marginTop: 20 }}>No hay otras clases en este periodo.</Text>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: targetMoveClassId ? colors.primary : colors.icon, marginTop: 20, marginBottom: 0 }]}
                            disabled={!targetMoveClassId}
                            onPress={handleFinalizeMove}
                        >
                            <Text style={styles.saveText}>Confirmar Movimiento</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Merge Class / Import Students Modal */}
            <Modal visible={mergeModalVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal, maxHeight: '80%', borderRadius: 24 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Importar Alumnos</Text>
                            <TouchableOpacity onPress={() => { setMergeModalVisible(false); setSelectedSourceClassIds([]); }}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.text, marginBottom: 15 }}>
                            Selecciona una o más clases de origen para importar a sus alumnos:
                        </Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {classes
                                .filter((c: any) => {
                                    if (c.id === selectedClassId || c.mergedToClassId) return false;
                                    const sourceCycle = academicCycles.find((ac: any) => ac.id === c.cycleId);
                                    const targetClass = classes.find((tc: any) => tc.id === selectedClassId);
                                    const targetCycle = academicCycles.find((ac: any) => ac.id === targetClass?.cycleId);

                                    if (!sourceCycle || !targetCycle) return false;

                                    const sourceYear = sourceCycle.name.match(/\d{4}/)?.[0];
                                    const targetYear = targetCycle.name.match(/\d{4}/)?.[0];

                                    return sourceCycle.name.toLowerCase().includes('verano') && sourceYear === targetYear;
                                })
                                .map((c: any) => {
                                    const cycleName = academicCycles.find((ac: any) => ac.id === c.cycleId)?.name || 'Ciclo Desconocido';
                                    const sourceEnrolled = enrollments.filter((e: any) => e.classId === c.id && e.status === 'active').length;
                                    const isSelected = selectedSourceClassIds.includes(c.id);
                                    return (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={[
                                                styles.studentItem,
                                                { backgroundColor: colors.background, borderColor: isSelected ? colors.primary : colors.border, marginBottom: 10 }
                                            ]}
                                            onPress={() => {
                                                if (isSelected) {
                                                    setSelectedSourceClassIds(prev => prev.filter((id: string) => id !== c.id));
                                                } else {
                                                    setSelectedSourceClassIds(prev => [...prev, c.id]);
                                                }
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{c.courseName}</Text>
                                                <Text style={{ color: colors.icon, fontSize: 12 }}>{cycleName} - {c.teacherName}</Text>
                                                <View style={{ marginTop: 2 }}>
                                                    {c.schedules.map((s: any, idx: number) => (
                                                        <Text key={idx} style={{ color: colors.icon, fontSize: 11 }}>
                                                            {s.day}: <Text style={{ color: c.color || colors.primary, fontWeight: '500' }}>{s.startTime} - {calculateEndTime(s.startTime, c.duration)}</Text>
                                                        </Text>
                                                    ))}
                                                </View>
                                                <Text style={{ color: colors.primary, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>
                                                    {sourceEnrolled} alumnos activos
                                                </Text>
                                            </View>
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 12,
                                                borderWidth: 2, borderColor: isSelected ? colors.primary : colors.icon,
                                                justifyContent: 'center', alignItems: 'center'
                                            }}>
                                                {isSelected && <Check size={14} color={colors.primary} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: selectedSourceClassIds.length > 0 ? colors.primary : colors.icon, marginTop: 20, marginBottom: 0 }]}
                            disabled={selectedSourceClassIds.length === 0}
                            onPress={handleConfirmMerge}
                        >
                            <Text style={styles.saveText}>Importar de {selectedSourceClassIds.length} {selectedSourceClassIds.length === 1 ? 'clase' : 'clases'}</Text>
                        </TouchableOpacity>
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
            {/* Delete Confirmation JSX (Unchanged) */}

            {/* Modal para Confirmar Matrícula con Fecha */}
            <Modal visible={isEnrollConfirmVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar Matrícula</Text>
                            <TouchableOpacity onPress={() => setIsEnrollConfirmVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.label, { color: colors.text, marginBottom: 15 }]}>
                            ¿Deseas matricular a "{studentToEnroll?.firstName} {studentToEnroll?.lastName}" en "{classes.find(c => c.id === selectedClassId)?.courseName}"?
                        </Text>

                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Fecha efectiva de inscripción:</Text>
                            {Platform.OS === 'web' ? (
                                React.createElement('input', {
                                    type: 'date',
                                    value: enrollDate.toISOString().split('T')[0],
                                    onChange: (e: any) => {
                                        if (e.target.value) setEnrollDate(new Date(`${e.target.value}T12:00:00`));
                                    },
                                    style: { padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border}`, color: colors.text, backgroundColor: 'transparent', outline: 'none', fontSize: '16px' }
                                })
                            ) : Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={enrollDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event: any, selectedDate?: Date) => {
                                        if (selectedDate) setEnrollDate(selectedDate);
                                    }}
                                    textColor={colors.text}
                                    style={{ height: 120 }}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.inputWrapper, { borderColor: colors.border }]}
                                        onPress={() => setShowEnrollDatePicker(true)}
                                    >
                                        <CalendarDays color={colors.text} size={20} />
                                        <Text style={[styles.input, { color: colors.text }]}>
                                            {enrollDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                    {showEnrollDatePicker && (
                                        <DateTimePicker
                                            value={enrollDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event: any, selectedDate?: Date) => {
                                                setShowEnrollDatePicker(false);
                                                if (selectedDate) setEnrollDate(selectedDate);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>

                        <View style={styles.row}>
                            <TouchableOpacity
                                style={[styles.saveButton, { flex: 1, backgroundColor: colors.border, marginRight: 10 }]}
                                onPress={() => setIsEnrollConfirmVisible(false)}
                            >
                                <Text style={[styles.saveText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, { flex: 1, backgroundColor: colors.primary }]}
                                onPress={() => {
                                    if (selectedClassId && studentToEnroll) {
                                        const dateStr = enrollDate.toISOString().split('T')[0];
                                        const withdrawnEnrollment = enrollments.find(e => e.studentId === studentToEnroll.id && e.classId === selectedClassId && e.status === 'withdrawn');

                                        if (withdrawnEnrollment) {
                                            updateEnrollment({
                                                ...withdrawnEnrollment,
                                                status: 'active',
                                                date: dateStr,
                                                withdrawalDate: undefined
                                            });
                                        } else {
                                            addEnrollment({
                                                id: `${studentToEnroll.id} -${selectedClassId} -${Date.now()} `,
                                                studentId: studentToEnroll.id,
                                                classId: selectedClassId,
                                                date: dateStr,
                                                status: 'active',
                                                isImported: false
                                            });
                                        }
                                        setEnrolledInSelected(prev => [...prev, studentToEnroll.id]);
                                        setIsEnrollConfirmVisible(false);
                                        setStudentToEnroll(null);
                                    }
                                }}
                            >
                                <Text style={styles.saveText}>Matricular</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal para Confirmar Traslado con Fecha */}
            <Modal visible={isMoveConfirmVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar Traslado</Text>
                            <TouchableOpacity onPress={() => setIsEnrollConfirmVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.label, { color: colors.text, marginBottom: 15 }]}>
                            El alumno será retirado de su clase actual e ingresado a la nueva conservando su historial previo de pagos.
                        </Text>

                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Fecha efectiva de traslado:</Text>
                            {Platform.OS === 'web' ? (
                                React.createElement('input', {
                                    type: 'date',
                                    value: moveDate.toISOString().split('T')[0],
                                    onChange: (e: any) => {
                                        if (e.target.value) setMoveDate(new Date(`${e.target.value}T12:00:00`));
                                    },
                                    style: { padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border}`, color: colors.text, backgroundColor: 'transparent', outline: 'none', fontSize: '16px' }
                                })
                            ) : Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={moveDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event: any, selectedDate?: Date) => {
                                        if (selectedDate) setMoveDate(selectedDate);
                                    }}
                                    textColor={colors.text}
                                    style={{ height: 120 }}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.inputWrapper, { borderColor: colors.border }]}
                                        onPress={() => setShowMoveDatePicker(true)}
                                    >
                                        <CalendarDays color={colors.text} size={20} />
                                        <Text style={[styles.input, { color: colors.text }]}>
                                            {moveDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                    {showMoveDatePicker && (
                                        <DateTimePicker
                                            value={moveDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event: any, selectedDate?: Date) => {
                                                setShowMoveDatePicker(false);
                                                if (selectedDate) setMoveDate(selectedDate);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>

                        <View style={styles.row}>
                            <TouchableOpacity
                                style={[styles.saveButton, { flex: 1, backgroundColor: colors.border, marginRight: 10 }]}
                                onPress={() => setIsMoveConfirmVisible(false)}
                            >
                                <Text style={[styles.saveText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, { flex: 1, backgroundColor: colors.primary }]}
                                onPress={() => {
                                    // Perform move
                                    const currentEnrollment = enrollments.find((e: any) => e.classId === selectedClassId && e.studentId === moveStudentId && e.status === 'active');
                                    if (!currentEnrollment) return; //Safety Catch

                                    const targetClass = classes.find((c: any) => c.id === targetMoveClassId);
                                    if (!targetClass) return; //Safety Catch

                                    const dateStr = moveDate.toISOString().split('T')[0];

                                    // 1. Withdraw from current
                                    updateEnrollment({
                                        ...currentEnrollment,
                                        status: 'withdrawn',
                                        withdrawalDate: dateStr
                                    });

                                    // 2. Enroll in target
                                    const withdrawnTarget = enrollments.find((e: any) => e.studentId === moveStudentId && e.classId === targetMoveClassId && e.status === 'withdrawn');
                                    const isImportedFlag = currentEnrollment.isImported;
                                    const originalImportId = currentEnrollment.originalImportedClassId || (isImportedFlag ? selectedClassId : undefined);

                                    if (withdrawnTarget) {
                                        updateEnrollment({
                                            ...withdrawnTarget,
                                            status: 'active',
                                            date: dateStr,
                                            withdrawalDate: undefined,
                                            isImported: isImportedFlag,
                                            originalImportedClassId: originalImportId ?? undefined
                                        });
                                    } else {
                                        addEnrollment({
                                            id: `${moveStudentId} -${targetMoveClassId} -${Date.now()} `,
                                            studentId: moveStudentId!, //Fix null problem
                                            classId: targetMoveClassId!, //Fix null problem
                                            date: dateStr,
                                            status: 'active',
                                            isImported: isImportedFlag,
                                            originalImportedClassId: originalImportId ?? undefined
                                        });
                                    }

                                    setEnrolledInSelected(prev => prev.filter((id: string) => id !== moveStudentId));
                                    setMoveStudentId(null);
                                    setTargetMoveClassId(null);
                                    setIsMoveConfirmVisible(false);
                                }}
                            >
                                <Text style={styles.saveText}>Trasladar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal para Editar Fecha de Inscripción Activa */}
            <Modal visible={isEditDateVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.modal }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Fecha de Matrícula</Text>
                            <TouchableOpacity onPress={() => setIsEditDateVisible(false)}>
                                <X color={colors.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, { color: colors.text, marginBottom: 15 }]}>
                            Estás modificando la fecha en la que "{students.find((s: any) => s.id === enrollmentToEdit?.studentId)?.firstName}" fue matriculado(a). Esto recalculará todas las deudas pendientes para esta clase a partir de la nueva fecha elegida.
                        </Text>

                        <View style={styles.formGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Nueva Fecha de Matrícula:</Text>
                            {Platform.OS === 'web' ? (
                                React.createElement('input', {
                                    type: 'date',
                                    value: editDate.toISOString().split('T')[0],
                                    onChange: (e: any) => {
                                        if (e.target.value) setEditDate(new Date(`${e.target.value}T12:00:00`));
                                    },
                                    style: { padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border}`, color: colors.text, backgroundColor: 'transparent', outline: 'none', fontSize: '16px' }
                                })
                            ) : Platform.OS === 'ios' ? (
                                <DateTimePicker
                                    value={editDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event: any, selectedDate?: Date) => {
                                        if (selectedDate) setEditDate(selectedDate);
                                    }}
                                    textColor={colors.text}
                                    style={{ height: 120 }}
                                />
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={[styles.inputWrapper, { borderColor: colors.border }]}
                                        onPress={() => setShowEditDatePicker(true)}
                                    >
                                        <CalendarDays color={colors.text} size={20} />
                                        <Text style={[styles.input, { color: colors.text }]}>
                                            {editDate.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                    {showEditDatePicker && (
                                        <DateTimePicker
                                            value={editDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event: any, selectedDate?: Date) => {
                                                setShowEditDatePicker(false);
                                                if (selectedDate) setEditDate(selectedDate);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>

                        <View style={styles.row}>
                            <TouchableOpacity
                                style={[styles.saveButton, { flex: 1, backgroundColor: colors.border, marginRight: 10 }]}
                                onPress={() => setIsEditDateVisible(false)}
                            >
                                <Text style={[styles.saveText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, { flex: 1, backgroundColor: colors.primary }]}
                                onPress={async () => {
                                    if (!enrollmentToEdit) return;
                                    const dateStr = editDate.toISOString().split('T')[0];
                                    await updateEnrollmentDate(enrollmentToEdit.id, dateStr);
                                    setIsEditDateVisible(false);
                                    setEnrollmentToEdit(null);
                                }}
                            >
                                <Text style={styles.saveText}>Guardar y Recalcular</Text>
                            </TouchableOpacity>
                        </View>
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
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 15,
        height: 52,
        borderRadius: 32, // Upgraded
        borderWidth: 1,
        marginBottom: 15,
        overflow: 'hidden',
    },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '500' },
    listContent: { paddingHorizontal: 20 },
    cardContainer: {
        marginBottom: 15,
    },
    card: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 32, // Upgraded to Elite 32px
        borderWidth: 1,
        alignItems: 'center',
        overflow: 'hidden',
        // Layered shadows for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 0 : 6
    },
    cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
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
    cardContent: { flex: 1, marginLeft: 15, flexShrink: 1 },
    courseTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    infoText: { fontSize: 13, marginLeft: 5 },
    timeText: { fontSize: 13, fontWeight: 'bold' },
    cardActions: { flexDirection: 'column', alignItems: 'center', gap: 10 },
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
        elevation: Platform.OS === 'android' ? 0 : 10,
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
    cycleSelectorWrapper: {
        paddingVertical: 10,
        marginBottom: 5
    },
    cycleScrollContent: {
        paddingHorizontal: 20,
        gap: 8
    },
    cycleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 4
    },
    cycleChipLabel: {
        marginLeft: 6,
        fontWeight: 'bold',
        fontSize: 12
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
});







