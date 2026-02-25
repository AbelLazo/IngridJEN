import { Colors } from '@/constants/theme';
import { AttendanceRecord, AttendanceStatus, ClassItem, useInstitution } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Check, ChevronLeft, Clock, UserMinus, UserX } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AttendanceModalProps {
    visible: boolean;
    onClose: () => void;
    classData: ClassItem | null;
    dateString: string; // YYYY-MM-DD
}

const STATUS_OPTIONS = [
    { value: 'present', label: 'P', icon: Check, color: '#10b981', bg: '#10b98120' }, // Emerald
    { value: 'late', label: 'T', icon: Clock, color: '#f59e0b', bg: '#f59e0b20' },    // Amber
    { value: 'excused', label: 'J', icon: UserMinus, color: '#3b82f6', bg: '#3b82f620' }, // Blue
    { value: 'absent', label: 'F', icon: UserX, color: '#ef4444', bg: '#ef444420' }, // Red
];

export default function AttendanceModal({ visible, onClose, classData, dateString }: AttendanceModalProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme as keyof typeof Colors];
    const { students, enrollments, attendances, saveAttendance } = useInstitution();

    // Editable State holding all selections before hitting "Save"
    const [teacherStatus, setTeacherStatus] = useState<'present' | 'absent' | 'late' | 'substitute'>('present');
    const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});

    // Parse friendly date presentation
    const friendlyDate = useMemo(() => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        const currentYear = new Date().getFullYear().toString();
        // If it's this year, omit the year for brevity
        return `${d}/${m}${y === currentYear ? '' : `/${y}`}`;
    }, [dateString]);

    // Active Enrolled Students for this specific Class
    const activeStudents = useMemo(() => {
        if (!classData) return [];
        return enrollments
            .filter(e => e.classId === classData.id && e.status === 'active')
            .map(e => students.find(s => s.id === e.studentId))
            .filter((s): s is NonNullable<typeof s> => s !== undefined)
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [classData, enrollments, students]);

    // Load Existing data or set default 'present' state
    useEffect(() => {
        if (visible && classData && dateString) {
            const existingRecord = attendances.find(
                a => a.classId === classData.id && a.date === dateString
            );

            if (existingRecord) {
                // Hydrate from DB
                setTeacherStatus(existingRecord.teacherStatus);
                const loadedStatuses: Record<string, AttendanceStatus> = {};
                existingRecord.students.forEach(s => {
                    loadedStatuses[s.studentId] = s.status;
                });
                setStudentStatuses(loadedStatuses);
            } else {
                // Set default "Present" to all active students
                setTeacherStatus('present');
                const defaultStatuses: Record<string, AttendanceStatus> = {};
                activeStudents.forEach(s => {
                    defaultStatuses[s.id] = 'present';
                });
                setStudentStatuses(defaultStatuses);
            }
        }
    }, [visible, classData, dateString, attendances, activeStudents]);

    // Action Helpers
    const handleStudentStatusChange = (studentId: string, status: AttendanceStatus) => {
        setStudentStatuses(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSave = async () => {
        if (!classData || !dateString) return;

        const studentsArray = Object.keys(studentStatuses).map(studentId => ({
            studentId,
            status: studentStatuses[studentId]
        }));

        const record: AttendanceRecord = {
            id: '', // Handled by Firebase
            classId: classData.id,
            date: dateString,
            teacherId: 'teacher-id-placeholder', // Ideally derived from classData.teacherId if it existed, mapping name for now
            teacherStatus,
            students: studentsArray,
            updatedAt: new Date().toISOString()
        };

        try {
            await saveAttendance(record);
            onClose(); // Auto close on success
        } catch (error) {
            console.error("Save error", error);
        }
    };

    if (!classData) return null;

    // Component: Configurable Selection Group 
    const StatusToggleGroup = ({
        currentValue,
        onChange,
        isTeacher = false
    }: {
        currentValue: string,
        onChange: (val: any) => void,
        isTeacher?: boolean
    }) => {
        const options = isTeacher
            ? [
                { value: 'present', label: 'Presente', bg: '#10b98120', color: '#10b981' },
                { value: 'late', label: 'Tarde', bg: '#f59e0b20', color: '#f59e0b' },
                { value: 'substitute', label: 'Reemplazo', bg: '#8b5cf620', color: '#8b5cf6' },
                { value: 'absent', label: 'Ausente', bg: '#ef444420', color: '#ef4444' }
            ]
            : STATUS_OPTIONS;

        return (
            <View style={styles.toggleGroup}>
                {options.map((opt) => {
                    const isSelected = currentValue === opt.value;
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            activeOpacity={0.7}
                            onPress={() => onChange(opt.value)}
                            style={[
                                styles.toggleButton,
                                isTeacher && styles.toggleButtonExpanded,
                                isSelected ? { backgroundColor: opt.color || colors.primary, borderColor: opt.color || colors.primary }
                                    : { backgroundColor: colors.background, borderColor: colors.border }
                            ]}
                        >
                            {'icon' in opt && opt.icon && (
                                <opt.icon
                                    size={14}
                                    color={isSelected ? '#fff' : colors.icon}
                                    style={{ marginRight: 4 }}
                                />
                            )}
                            <Text style={[
                                styles.toggleText,
                                isSelected ? { color: '#fff', fontWeight: 'bold' } : { color: colors.text }
                            ]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: Platform.OS === 'ios' ? 30 : 20 }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <ChevronLeft size={24} color={colors.icon} />
                            <Text style={[styles.backText, { color: colors.icon }]}>Volver</Text>
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            {friendlyDate}
                        </Text>
                        <View style={styles.placeholderBtn} />
                    </View>

                    <View style={styles.classInfoContainer}>
                        <Text style={[styles.classCourseName, { color: colors.text }]}>{classData.courseName}</Text>
                        <Text style={[styles.classTime, { color: colors.icon }]}>
                            {classData.schedules[0]?.day || ''} • {classData.schedules[0]?.startTime || '00:00'} - {classData.duration}
                        </Text>
                    </View>

                    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

                        {/* TEACHER SECTION */}
                        <View style={[styles.sectionBlock, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', borderWidth: 1 }]}>
                            <Text style={[styles.sectionHeaderTitle, { color: colors.primary }]}>PROFESOR</Text>
                            <View style={styles.personRow}>
                                <Text style={[styles.personName, { color: colors.text }]}>
                                    {classData.teacherName}
                                </Text>
                            </View>
                            <View style={{ marginTop: 8 }}>
                                <StatusToggleGroup
                                    isTeacher={true}
                                    currentValue={teacherStatus}
                                    onChange={(v) => setTeacherStatus(v)}
                                />
                            </View>
                        </View>

                        <Text style={[styles.sectionCountText, { color: colors.icon, marginVertical: 10, marginLeft: 5 }]}>
                            ALUMNOS ({activeStudents.length})
                        </Text>

                        {/* STUDENTS SECTION */}
                        <View style={styles.studentsListContainer}>
                            {activeStudents.length === 0 ? (
                                <Text style={{ color: colors.icon, textAlign: 'center', marginVertical: 20 }}>
                                    No hay alumnos inscritos en esta clase actualmente.
                                </Text>
                            ) : (
                                activeStudents.map((student, index) => {
                                    const isLast = index === activeStudents.length - 1;
                                    return (
                                        <View key={student.id} style={[
                                            styles.studentRow,
                                            !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }
                                        ]}>
                                            <View style={styles.studentInfoWrapper}>
                                                <Text style={[styles.studentLastName, { color: colors.text }]} numberOfLines={1}>
                                                    {student.lastName}
                                                </Text>
                                                <Text style={[styles.studentFirstName, { color: colors.icon }]} numberOfLines={1}>
                                                    {student.firstName}
                                                </Text>
                                            </View>

                                            <StatusToggleGroup
                                                currentValue={studentStatuses[student.id] || 'present'}
                                                onChange={(v) => handleStudentStatusChange(student.id, v)}
                                            />
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                            onPress={handleSave}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveButtonText}>Guardar Asistencia</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    closeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 16,
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholderBtn: {
        width: 60,
    },
    classInfoContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        alignItems: 'center',
    },
    classCourseName: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    classTime: {
        fontSize: 14,
        marginTop: 4,
    },
    scrollArea: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionBlock: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
    },
    sectionHeaderTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    personRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    personName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionCountText: {
        fontSize: 13,
        fontWeight: 'bold',
    },
    studentsListContainer: {
        marginBottom: 20,
    },
    studentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    studentInfoWrapper: {
        flex: 1,
        paddingRight: 10,
    },
    studentLastName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    studentFirstName: {
        fontSize: 14,
        marginTop: 2,
    },
    toggleGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
    },
    toggleButtonExpanded: {
        flex: 1,
        paddingHorizontal: 0,
    },
    toggleText: {
        fontSize: 12,
    },
    footer: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderTopWidth: 1,
    },
    saveButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
