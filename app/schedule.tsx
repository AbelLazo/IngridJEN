import AttendanceModal from '@/components/AttendanceModal';
import PeriodHeader from '@/components/PeriodHeader';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ClassItem, useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper for formatting dates "YYYY-MM-DD" natively respecting Timezones roughly
const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ScheduleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];

    const { user, userRole } = useAuth();
    const { classes, currentCycleId, academicCycles, enrollments, teachers } = useInstitution();

    // Day Selection State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const selectedDateString = formatDate(selectedDate);

    // Modal State
    const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<ClassItem | null>(null);
    const [isAttendanceModalVisible, setIsAttendanceModalVisible] = useState(false);

    const openAttendanceModal = (cls: ClassItem) => {
        setSelectedClassForAttendance(cls);
        setIsAttendanceModalVisible(true);
    };

    const closeAttendanceModal = () => {
        setIsAttendanceModalVisible(false);
        setTimeout(() => setSelectedClassForAttendance(null), 300); // Wait for translation animation
    };

    // Generate an array of 7 days (3 before, today, 3 after)
    const weekDays = useMemo(() => {
        const days = [];
        for (let i = -3; i <= 3; i++) {
            const date = new Date(selectedDate);
            date.setDate(selectedDate.getDate() + i);
            days.push(date);
        }
        return days;
    }, [selectedDate]);

    // Map JS getDay() to string day names used in ClassSchedules
    const getDayName = (dayIndex: number) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[dayIndex];
    };

    // Filter classes for the selected day AND current cycle
    const classesForSelectedDay = useMemo(() => {
        const selectedDayName = getDayName(selectedDate.getDay());
        const activeCycle = academicCycles.find(c => c.id === currentCycleId);

        // If selected date is outside cycle range, show nothing
        if (activeCycle) {
            const dateStr = selectedDateString; // YYYY-MM-DD
            if (dateStr < activeCycle.startDate || dateStr > activeCycle.endDate) {
                return [];
            }
        }

        // Encuentra el nombre del profesor basado en su email en los profesores registrados
        let allowedTeacherName: string | null = null;
        if (userRole === 'professor' && user?.email) {
            const currentTeacher = teachers.find(t => t.email?.toLowerCase() === user.email?.toLowerCase());
            if (currentTeacher) {
                // Las clases guardan el nombre del profe como literal ej "John Doe "
                allowedTeacherName = `${currentTeacher.firstName} ${currentTeacher.lastName}`;
            } else {
                allowedTeacherName = "NO_TEACHER_PROFILE_FOUND";
            }
        }

        return classes.filter(c => {
            // Must belong to current cycle
            if (!currentCycleId || c.cycleId !== currentCycleId) return false;

            // Si es profesor, limitar solo a sus clases
            if (userRole === 'professor' && allowedTeacherName) {
                if (c.teacherName.trim().toLowerCase() !== allowedTeacherName.trim().toLowerCase()) {
                    return false;
                }
            }

            // Must have a schedule on the selected day
            return c.schedules && c.schedules.some(s => s.day === selectedDayName);
        }).map(c => {
            // Find specific schedule time for sorting
            const schedule = c.schedules.find(s => s.day === selectedDayName);
            return {
                ...c,
                startTime: schedule?.startTime || '00:00'
            };
        }).sort((a, b) => a.startTime.localeCompare(b.startTime)); // Sort chronologically
    }, [classes, currentCycleId, academicCycles, selectedDate, selectedDateString, userRole, user, teachers]);

    // Helper: Calculate Enrolled Students count
    const getEnrolledCount = (classId: string) => {
        return enrollments.filter(e => e.classId === classId && e.status === 'active').length;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <PeriodHeader title="Horarios y Asistencias" onBack={() => router.back()} />

            {/* Date Strip Menu */}
            <View style={styles.dateSelector}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateSelectorContent}
                >
                    {weekDays.map((date, index) => {
                        const isSelected = formatDate(date) === selectedDateString;
                        const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                        const dayNumber = date.getDate();
                        const isToday = formatDate(date) === formatDate(new Date());

                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.7}
                                onPress={() => setSelectedDate(date)}
                                style={[
                                    styles.dateCard,
                                    { backgroundColor: colors.card, borderColor: colors.border },
                                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                            >
                                <Text style={[
                                    styles.dateDayName,
                                    { color: isSelected ? '#fff' : colors.icon },
                                    isToday && !isSelected && { color: colors.primary, fontWeight: 'bold' }
                                ]}>
                                    {dayName.toUpperCase()}
                                </Text>
                                <Text style={[
                                    styles.dateNumber,
                                    { color: isSelected ? '#fff' : colors.text }
                                ]}>
                                    {dayNumber}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerTitleRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Clases Programadas
                    </Text>
                    <TouchableOpacity
                        style={styles.todayButton}
                        onPress={() => setSelectedDate(new Date())}
                    >
                        <Text style={[styles.todayButtonText, { color: colors.primary }]}>Hoy</Text>
                    </TouchableOpacity>
                </View>

                {classesForSelectedDay.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <CalendarIcon size={48} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.icon }]}>
                            No hay clases programadas para este día en el ciclo actual.
                        </Text>
                    </View>
                ) : (
                    classesForSelectedDay.map((cls) => {
                        const enrolledCount = getEnrolledCount(cls.id);
                        const isFull = enrolledCount >= parseInt(cls.capacity);

                        return (
                            <View key={cls.id} style={styles.cardContainer}>
                                <BlurView
                                    intensity={90}
                                    tint={colorScheme === 'light' ? 'light' : 'dark'}
                                    style={[
                                        styles.classCard,
                                        {
                                            backgroundColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                                            borderLeftColor: cls.color || colors.primary,
                                            borderColor: colorScheme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.15)',
                                        }
                                    ]}
                                >


                                    <View style={styles.classHeaderRow}>
                                        <View style={[styles.timeBadge, { backgroundColor: (cls.color || colors.primary) + '20' }]}>
                                            <Clock size={14} color={cls.color || colors.primary} />
                                            <Text style={[styles.timeText, { color: cls.color || colors.primary }]}>
                                                {cls.startTime} - {cls.duration}
                                            </Text>
                                        </View>
                                        <View style={[
                                            styles.occupancyBadge,
                                            { backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }
                                        ]}>
                                            <Users size={12} color={isFull ? '#ef4444' : colors.icon} />
                                            <Text style={[
                                                styles.occupancyText,
                                                { color: isFull ? '#ef4444' : colors.text }
                                            ]}>
                                                {enrolledCount}/{cls.capacity}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.classTitle, { color: colors.text }]}>
                                        {cls.courseName}
                                    </Text>

                                    <View style={styles.classFooterRow}>
                                        <View style={styles.teacherInfo}>
                                            <View style={styles.avatarPlaceholder}>
                                                <Text style={styles.avatarText}>
                                                    {cls.teacherName.charAt(0)}
                                                </Text>
                                            </View>
                                            <Text style={[styles.teacherName, { color: colors.text }]}>
                                                Prof. {cls.teacherName}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.attendanceButton, { backgroundColor: colors.primary }]}
                                            onPress={() => openAttendanceModal(cls)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.attendanceButtonText}>Asistencia</Text>
                                        </TouchableOpacity>
                                    </View>
                                </BlurView>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <AttendanceModal
                visible={isAttendanceModalVisible}
                onClose={closeAttendanceModal}
                classData={selectedClassForAttendance}
                dateString={selectedDateString}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    dateSelector: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dateSelectorContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    dateCard: {
        width: 60,
        height: 75,
        borderRadius: 16,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: Platform.OS === 'android' ? 0 : 2,
    },
    dateDayName: {
        fontSize: 11,
        marginBottom: 6,
        fontWeight: '500',
    },
    dateNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    todayButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    todayButtonText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    cardContainer: {
        marginBottom: 16,
    },
    classCard: {
        borderRadius: 24, // Consistent with liquid glass
        padding: 16,
        borderLeftWidth: 6,
        borderWidth: 1,
        overflow: 'hidden',
        // Layered shadows for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 0 : 5,
    },
    classHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    occupancyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    occupancyText: {
        fontSize: 12,
        fontWeight: '500',
    },
    classTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    classFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 12,
    },
    teacherInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatarPlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b',
    },
    teacherName: {
        fontSize: 14,
        fontWeight: '500',
    },
    attendanceButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    attendanceButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    }
});
