import { db } from '@/lib/firebaseConfig';
import {
    addDoc,
    collection,
    deleteDoc,
    deleteField,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc
} from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export interface Course {
    id: string;
    name: string;
    hours: string;
    minutes: string;
    price: string;
}

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    status: 'active' | 'inactive';
    activeYears?: string[]; // e.g. ["2024", "2025", "2026"]
    type: 'student';
}

export interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    extra: string;
    status: 'active' | 'inactive';
    type: 'teacher';
    email?: string;
}

export interface ClassSchedule {
    day: string;
    startTime: string;
}

export interface ClassItem {
    id: string;
    courseId: string;
    courseName: string;
    teacherName: string;
    schedules: ClassSchedule[];
    duration: string;
    capacity: string;
    color: string;
    cycleId: string;
    mergedToClassId?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceStudent {
    studentId: string;
    status: AttendanceStatus;
    notes?: string;
}

export interface AttendanceRecord {
    id: string;
    classId: string;
    date: string; // YYYY-MM-DD
    teacherId: string;
    teacherStatus: 'present' | 'absent' | 'late' | 'substitute';
    students: AttendanceStudent[];
    updatedAt: string;
}

export interface EventDiscount {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    targetMonthYear: string; // Format YYYY-MM
    discountPercentage: number;
}

export interface AcademicCycle {
    id: string;
    name: string;
    months: string[];
    startDate: string;
    endDate: string;
    events?: EventDiscount[];
}

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
    date: string;
    status?: 'active' | 'withdrawn';
    withdrawalDate?: string;
    isImported?: boolean;
    originalImportedClassId?: string;
}

export interface Installment {
    id: string;
    enrollmentId: string;
    studentId: string;
    monthYear: string;
    amount: string;
    isPaid: boolean;
    paymentId?: string;
    dueDate: string;
    originalAmount?: string;
    notes?: string;
}

export interface Payment {
    id: string;
    studentId: string;
    enrollmentId: string;
    installmentId?: string;
    amount: string;
    date: string;
    monthYear: string;
}

interface InstitutionContextType {
    courses: Course[];
    addCourse: (course: Course) => void;
    updateCourse: (updatedCourse: Course) => void;
    students: Student[];
    addStudent: (student: Student) => void;
    updateStudent: (student: Student) => void;
    teachers: Teacher[];
    addTeacher: (teacher: Teacher) => void;
    updateTeacher: (teacher: Teacher) => void;
    classes: ClassItem[];
    addClass: (newItem: ClassItem) => void;
    updateClass: (updatedItem: ClassItem) => void;
    removeClass: (id: string) => void;
    removeStudent: (id: string) => void;
    removeTeacher: (id: string) => void;
    removeCourse: (id: string) => void;
    enrollments: Enrollment[];
    addEnrollment: (enrollment: Enrollment) => void;
    updateEnrollment: (enrollment: Enrollment) => void;
    updateEnrollmentDate: (enrollmentId: string, newDate: string) => Promise<void>;
    removeEnrollment: (id: string) => void;
    payments: Payment[];
    addPayment: (payment: Payment, installmentId?: string) => void;
    academicCycles: AcademicCycle[];
    currentCycleId: string;
    setCurrentCycleId: (id: string) => void;
    addCycle: (cycle: AcademicCycle) => void;
    updateCycle: (cycle: AcademicCycle) => void;
    deleteCycle: (id: string) => void;
    installments: Installment[];
    attendances: AttendanceRecord[];
    saveAttendance: (record: AttendanceRecord) => Promise<void>;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
    const [academicCycles, setAcademicCycles] = useState<AcademicCycle[]>([]);

    // Default current cycle ID (can be updated later based on logic or user preference)
    const [currentCycleId, setCurrentCycleId] = useState<string>('');

    // Real-time states
    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

    // Subscribe to collections
    useEffect(() => {
        const unsubCycles = onSnapshot(query(collection(db, 'academicCycles'), orderBy('startDate', 'desc')), (shot) => {
            const cycles = shot.docs.map(d => ({ id: d.id, ...d.data() } as AcademicCycle));
            setAcademicCycles(cycles);
            // Optionally set the first cycle as current if none is selected
            if (cycles.length > 0 && !currentCycleId) {
                setCurrentCycleId(cycles[0].id);
            }
        });
        const unsubCourses = onSnapshot(collection(db, 'courses'), (shot) => {
            setCourses(shot.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
        });
        const unsubStudents = onSnapshot(query(collection(db, 'students'), orderBy('lastName')), (shot) => {
            setStudents(shot.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
        });
        const unsubTeachers = onSnapshot(collection(db, 'teachers'), (shot) => {
            setTeachers(shot.docs.map(d => ({ id: d.id, ...d.data() } as Teacher)));
        });
        const unsubClasses = onSnapshot(collection(db, 'classes'), (shot) => {
            setClasses(shot.docs.map(d => ({ id: d.id, ...d.data() } as ClassItem)));
        });
        const unsubEnrollments = onSnapshot(collection(db, 'enrollments'), (shot) => {
            setEnrollments(shot.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)));
        });
        const unsubInstallments = onSnapshot(collection(db, 'installments'), (shot) => {
            setInstallments(shot.docs.map(d => ({ id: d.id, ...d.data() } as Installment)));
        });
        const unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('date', 'desc')), (shot) => {
            setPayments(shot.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        });
        const unsubAttendances = onSnapshot(collection(db, 'attendances'), (shot) => {
            setAttendances(shot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
        });

        return () => {
            unsubCycles(); unsubCourses(); unsubStudents(); unsubTeachers();
            unsubClasses(); unsubEnrollments(); unsubInstallments(); unsubPayments();
            unsubAttendances();
        };
    }, []);


    // Helper functions for Firestore operations with Error Handling
    const addCourse = async (course: Course) => {
        try {
            const { id, ...data } = course;
            await addDoc(collection(db, 'courses'), data);
        } catch (error: any) {
            console.error('Error adding course:', error);
            Alert.alert('Error', 'No se pudo guardar el curso: ' + error.message);
        }
    };

    const updateCourse = async (course: Course) => {
        try {
            const { id, ...data } = course;
            await updateDoc(doc(db, 'courses', id), data);
        } catch (error: any) {
            console.error('Error updating course:', error);
            Alert.alert('Error', 'No se pudo actualizar el curso: ' + error.message);
        }
    };

    const addStudent = async (student: Student) => {
        try {
            const { id, ...data } = student;
            await addDoc(collection(db, 'students'), data);
        } catch (error: any) {
            console.error('Error adding student:', error);
            Alert.alert('Error', 'No se pudo guardar el estudiante: ' + error.message);
        }
    };

    const updateStudent = async (student: Student) => {
        try {
            const { id, ...data } = student;
            await updateDoc(doc(db, 'students', id), data);
        } catch (error: any) {
            console.error('Error updating student:', error);
            Alert.alert('Error', 'No se pudo actualizar el estudiante: ' + error.message);
        }
    };

    const addTeacher = async (teacher: Teacher) => {
        try {
            const { id, ...data } = teacher;
            await addDoc(collection(db, 'teachers'), data);
        } catch (error: any) {
            console.error('Error adding teacher:', error);
            Alert.alert('Error', 'No se pudo guardar el profesor: ' + error.message);
        }
    };

    const updateTeacher = async (teacher: Teacher) => {
        try {
            const { id, ...data } = teacher;
            await updateDoc(doc(db, 'teachers', id), data);
        } catch (error: any) {
            console.error('Error updating teacher:', error);
            Alert.alert('Error', 'No se pudo actualizar el profesor: ' + error.message);
        }
    };

    const addClass = async (newItem: ClassItem) => {
        try {
            const { id, ...data } = newItem;
            await addDoc(collection(db, 'classes'), data);
        } catch (error: any) {
            console.error('Error adding class:', error);
            Alert.alert('Error', 'No se pudo guardar la clase: ' + error.message);
        }
    };

    const updateClass = async (updatedItem: ClassItem) => {
        try {
            const { id, ...data } = updatedItem;
            // Clean undefined values for Firestore
            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === undefined) {
                    cleanData[key] = deleteField();
                }
            });
            await updateDoc(doc(db, 'classes', id), cleanData);
        } catch (error: any) {
            console.error('Error updating class:', error);
            Alert.alert('Error', 'No se pudo actualizar la clase: ' + error.message);
        }
    };

    const removeClass = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'classes', id));
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo eliminar la clase: ' + error.message);
        }
    };

    const removeStudent = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'students', id));
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo eliminar el estudiante: ' + error.message);
        }
    };

    const removeTeacher = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'teachers', id));
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo eliminar el profesor: ' + error.message);
        }
    };

    const removeCourse = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'courses', id));
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo eliminar el curso: ' + error.message);
        }
    };

    const addEnrollment = async (enrollment: Enrollment) => {
        try {
            const { id, ...data } = enrollment;
            const cls = classes.find(c => c.id === enrollment.classId);
            const course = courses.find(co => co.id === cls?.courseId);
            const cycle = academicCycles.find(cy => cy.id === cls?.cycleId);

            const enrolRef = await addDoc(collection(db, 'enrollments'), { ...data, status: 'active' });

            // 1. Determine Payment Day (based on earliest enrollment date)
            const studentEnrolDates = enrollments
                .filter(e => e.studentId === enrollment.studentId)
                .map(e => new Date(`${e.date}T12:00:00`).getTime());

            studentEnrolDates.push(new Date(`${enrollment.date}T12:00:00`).getTime()); // Include current

            const earliestTime = Math.min(...studentEnrolDates);
            const paymentDay = new Date(earliestTime).getDate();

            if (cycle && course && cycle.startDate && cycle.endDate) {
                // 2. Determine Start Date (don't charge for months prior to enrollment)
                const cycleStart = new Date(`${cycle.startDate}T12:00:00`);
                const enrolDate = new Date(`${enrollment.date}T12:00:00`);

                let current = enrolDate > cycleStart ? new Date(enrolDate) : new Date(cycleStart);
                current.setDate(1); // Set to 1st of month to avoid overflow during iteration

                const end = new Date(`${cycle.endDate}T12:00:00`);
                const endMonthObj = new Date(end);
                endMonthObj.setDate(1);

                while (current <= endMonthObj) {
                    const year = current.getFullYear();
                    const month = current.getMonth();
                    const monthYear = `${year}-${(month + 1).toString().padStart(2, '0')}`;

                    // 3. Calculate safe Due Date for this specific month
                    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                    const safePaymentDay = Math.min(paymentDay, lastDayOfMonth);
                    const calculatedDueDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${safePaymentDay.toString().padStart(2, '0')}`;

                    let finalAmount = parseFloat(course.price);
                    let finalNotes = '';

                    if (cycle.events && cycle.events.length > 0) {
                        const monthEvents = cycle.events.filter(e => {
                            let evtTarget = e.targetMonthYear;
                            const parts = evtTarget.split('-');
                            if (parts.length === 2) evtTarget = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                            return evtTarget === monthYear;
                        });
                        if (monthEvents.length > 0) {
                            let totalDiscountPercentage = 0;
                            const eventNames: string[] = [];

                            monthEvents.forEach(e => {
                                totalDiscountPercentage += e.discountPercentage;
                                eventNames.push(`${e.name} (${e.discountPercentage}%)`);
                            });

                            if (totalDiscountPercentage > 100) totalDiscountPercentage = 100;

                            const discountAmount = finalAmount * (totalDiscountPercentage / 100);
                            finalAmount = finalAmount - discountAmount;
                            finalNotes = `Descuento automático: ${eventNames.join(', ')}`;
                        }
                    }

                    const instData = {
                        enrollmentId: enrolRef.id,
                        studentId: enrollment.studentId,
                        monthYear: monthYear,
                        amount: finalAmount.toFixed(2).toString(),
                        originalAmount: course.price,
                        isPaid: false,
                        dueDate: calculatedDueDate,
                        ...(finalNotes ? { notes: finalNotes } : {})
                    };
                    await addDoc(collection(db, 'installments'), instData);

                    // Move to next month
                    current.setMonth(current.getMonth() + 1);
                }
            } else if (cycle && course) {
                // Fallback to legacy months array if dates are missing for some reason
                for (const rawMonthYear of cycle.months) {
                    let normalizedMonthYear = rawMonthYear;
                    const parts = rawMonthYear.split('-');
                    if (parts.length === 2) {
                        normalizedMonthYear = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                    }

                    // Extract year/month from string if possible to calculate safe due date
                    let calculatedDueDate = `${normalizedMonthYear}-${paymentDay.toString().padStart(2, '0')}`;
                    if (parts.length === 2) {
                        const mYear = parseInt(parts[0]);
                        const mMon = parseInt(parts[1]) - 1;
                        const lastDayOfMonth = new Date(mYear, mMon + 1, 0).getDate();
                        const safePaymentDay = Math.min(paymentDay, lastDayOfMonth);
                        calculatedDueDate = `${parts[0]}-${parts[1]}-${safePaymentDay.toString().padStart(2, '0')}`;
                    }

                    let finalAmount = parseFloat(course.price);
                    let finalNotes = '';

                    if (cycle.events && cycle.events.length > 0) {
                        const monthEvents = cycle.events.filter(e => {
                            let evtTarget = e.targetMonthYear;
                            const parts = evtTarget.split('-');
                            if (parts.length === 2) evtTarget = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                            return evtTarget === normalizedMonthYear;
                        });
                        if (monthEvents.length > 0) {
                            let totalDiscountPercentage = 0;
                            const eventNames: string[] = [];

                            monthEvents.forEach(e => {
                                totalDiscountPercentage += e.discountPercentage;
                                eventNames.push(`${e.name} (${e.discountPercentage}%)`);
                            });

                            if (totalDiscountPercentage > 100) totalDiscountPercentage = 100;

                            const discountAmount = finalAmount * (totalDiscountPercentage / 100);
                            finalAmount = finalAmount - discountAmount;
                            finalNotes = `Descuento automático: ${eventNames.join(', ')}`;
                        }
                    }

                    const instData = {
                        enrollmentId: enrolRef.id,
                        studentId: enrollment.studentId,
                        monthYear: normalizedMonthYear,
                        amount: finalAmount.toFixed(2).toString(),
                        originalAmount: course.price,
                        isPaid: false,
                        dueDate: calculatedDueDate,
                        ...(finalNotes ? { notes: finalNotes } : {})
                    };
                    await addDoc(collection(db, 'installments'), instData);
                }
            }
        } catch (error: any) {
            console.error('Error adding enrollment:', error);
            Alert.alert('Error', 'No se pudo matricular: ' + error.message);
        }
    };

    const updateEnrollment = async (updatedEnrollment: Enrollment) => {
        try {
            const { id, ...data } = updatedEnrollment;
            // Clean undefined values for Firestore
            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === undefined) {
                    cleanData[key] = deleteField();
                }
            });
            await updateDoc(doc(db, 'enrollments', id), cleanData);
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo actualizar la matrícula: ' + error.message);
        }
    };

    const removeEnrollment = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'enrollments', id));
            const relatedInsts = installments.filter(inst => inst.enrollmentId === id);
            for (const inst of relatedInsts) {
                await deleteDoc(doc(db, 'installments', inst.id));
            }
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo eliminar la matrícula: ' + error.message);
        }
    };

    const addPayment = async (p: Payment, installmentId?: string) => {
        try {
            const { id, ...data } = p;
            const payRef = await addDoc(collection(db, 'payments'), data);
            if (installmentId) {
                await updateDoc(doc(db, 'installments', installmentId), {
                    isPaid: true,
                    paymentId: payRef.id
                });
            }
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo registrar el pago: ' + error.message);
        }
    };

    // Cycle CRUD
    const addCycle = async (cycle: AcademicCycle) => {
        try {
            const { id, ...data } = cycle;
            await addDoc(collection(db, 'academicCycles'), data);
        } catch (error: any) {
            console.error('Error adding cycle:', error);
            Alert.alert('Error', 'No se pudo guardar el ciclo: ' + error.message);
        }
    };

    const updateCycle = async (cycle: AcademicCycle) => {
        try {
            const { id, ...data } = cycle;
            await updateDoc(doc(db, 'academicCycles', id), data);
        } catch (error: any) {
            console.error('Error updating cycle:', error);
            Alert.alert('Error', 'No se pudo actualizar el ciclo: ' + error.message);
        }
    };

    const deleteCycle = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'academicCycles', id));
        } catch (error: any) {
            console.error('Error deleting cycle:', error);
            Alert.alert('Error', 'No se pudo eliminar el ciclo: ' + error.message);
        }
    };

    // Attendance CRUD
    const saveAttendance = async (record: AttendanceRecord) => {
        try {
            // Find existing record for this class and date
            const existingRecord = attendances.find(a => a.classId === record.classId && a.date === record.date);
            const dataToSave = { ...record, updatedAt: new Date().toISOString() };
            // Cannot save 'id' as a field in doc identically as an existing document in firebase if it's the doc Id.
            const { id, ...dataObj } = dataToSave;

            if (existingRecord) {
                // Update
                await updateDoc(doc(db, 'attendances', existingRecord.id), dataObj);
            } else {
                // Create
                await addDoc(collection(db, 'attendances'), dataObj);
            }
        } catch (error: any) {
            console.error('Error saving attendance:', error);
            Alert.alert('Error', 'No se pudo guardar la asistencia: ' + error.message);
        }
    };

    const updateEnrollmentDate = async (enrollmentId: string, newDate: string) => {
        try {
            const enrollment = enrollments.find(e => e.id === enrollmentId);
            if (!enrollment) throw new Error('Enrollment not found');

            const cls = classes.find(c => c.id === enrollment.classId);
            const course = courses.find(co => co.id === cls?.courseId);
            const cycle = academicCycles.find(cy => cy.id === cls?.cycleId);

            if (!cycle || !course || !cycle.startDate || !cycle.endDate) {
                throw new Error('Información incompleta del Ciclo o Curso para regenerar cuotas.');
            }

            // 1. Delete unpaid installments for this enrollment
            const relatedInsts = installments.filter(inst => inst.enrollmentId === enrollmentId);
            for (const inst of relatedInsts) {
                if (!inst.isPaid) {
                    await deleteDoc(doc(db, 'installments', inst.id));
                }
            }

            // 2. Update the enrollment date document
            await updateDoc(doc(db, 'enrollments', enrollmentId), { date: newDate });

            // 3. Recalculate payment day based on new reality
            const studentEnrolDates = enrollments
                .filter(e => e.studentId === enrollment.studentId && e.id !== enrollmentId)
                .map(e => new Date(`${e.date}T12:00:00`).getTime());

            studentEnrolDates.push(new Date(`${newDate}T12:00:00`).getTime()); // Include the new manual date
            const earliestTime = Math.min(...studentEnrolDates);
            const paymentDay = new Date(earliestTime).getDate();

            // 4. Generate new installments from the newDate
            const cycleStart = new Date(`${cycle.startDate}T12:00:00`);
            const enrolDateObj = new Date(`${newDate}T12:00:00`);

            let current = enrolDateObj > cycleStart ? new Date(enrolDateObj) : new Date(cycleStart);
            current.setDate(1);

            const end = new Date(`${cycle.endDate}T12:00:00`);
            const endMonthObj = new Date(end);
            endMonthObj.setDate(1);

            while (current <= endMonthObj) {
                const year = current.getFullYear();
                const month = current.getMonth();
                const monthYear = `${year}-${(month + 1).toString().padStart(2, '0')}`;

                // Check if an installment already exists for this exact month and is Paid!
                const alreadyPaid = relatedInsts.find(inst => inst.monthYear === monthYear && inst.isPaid);

                if (!alreadyPaid) {
                    // 5. Calculate safe Due Date for this specific month
                    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                    const safePaymentDay = Math.min(paymentDay, lastDayOfMonth);
                    const calculatedDueDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${safePaymentDay.toString().padStart(2, '0')}`;

                    let finalAmount = parseFloat(course.price);
                    let finalNotes = '';

                    if (cycle.events && cycle.events.length > 0) {
                        const monthEvents = cycle.events.filter(e => {
                            let evtTarget = e.targetMonthYear;
                            const parts = evtTarget.split('-');
                            if (parts.length === 2) evtTarget = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                            return evtTarget === monthYear;
                        });
                        if (monthEvents.length > 0) {
                            let totalDiscountPercentage = 0;
                            const eventNames: string[] = [];
                            monthEvents.forEach(e => {
                                totalDiscountPercentage += e.discountPercentage;
                                eventNames.push(`${e.name} (${e.discountPercentage}%)`);
                            });
                            if (totalDiscountPercentage > 100) totalDiscountPercentage = 100;
                            const discountAmount = finalAmount * (totalDiscountPercentage / 100);
                            finalAmount = finalAmount - discountAmount;
                            finalNotes = `Descuento automático: ${eventNames.join(', ')}`;
                        }
                    }

                    const instData = {
                        enrollmentId: enrollmentId,
                        studentId: enrollment.studentId,
                        monthYear: monthYear,
                        amount: finalAmount.toFixed(2).toString(),
                        originalAmount: course.price,
                        isPaid: false,
                        dueDate: calculatedDueDate,
                        ...(finalNotes ? { notes: finalNotes } : {})
                    };
                    await addDoc(collection(db, 'installments'), instData);
                }
                // Move to next month
                current.setMonth(current.getMonth() + 1);
            }
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo actualizar la fecha ni recalcular cuotas: ' + error.message);
        }
    };

    return (
        <InstitutionContext.Provider value={{
            courses, addCourse, updateCourse,
            students, addStudent, updateStudent,
            teachers, addTeacher, updateTeacher,
            classes, addClass, updateClass, removeClass,
            removeStudent, removeTeacher, removeCourse,
            enrollments, addEnrollment, updateEnrollment, removeEnrollment,
            payments, addPayment,
            academicCycles, currentCycleId, setCurrentCycleId, addCycle, updateCycle, deleteCycle,
            installments,
            attendances, saveAttendance,
            updateEnrollmentDate
        }}>
            {children}
        </InstitutionContext.Provider>
    );
}

export function useInstitution() {
    const context = useContext(InstitutionContext);
    if (context === undefined) {
        throw new Error('useInstitution must be used within an InstitutionProvider');
    }
    return context;
}
