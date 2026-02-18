import React, { createContext, ReactNode, useContext, useState } from 'react';

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
    cycleId: string; // Link class to a specific cycle
}

/** 
 * NEW: Academic Cycle defines the "envelope" of the period (Summer vs Annual)
 */
export interface AcademicCycle {
    id: string;
    name: string; // e.g., "Verano 2024", "Anual 2024"
    months: string[]; // e.g., ["2024-01", "2024-02"] for Summer
}

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
    date: string;
    status?: 'active' | 'withdrawn';
    withdrawalDate?: string;
}

/**
 * NEW: Pre-calculated Installment
 */
export interface Installment {
    id: string;
    enrollmentId: string;
    studentId: string;
    monthYear: string; // e.g., "2024-01"
    amount: string;
    isPaid: boolean;
    paymentId?: string;
    dueDate: string;
}

export interface Payment {
    id: string;
    studentId: string;
    enrollmentId: string;
    installmentId?: string; // Link to the specific pre-calculated installment
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
    removeEnrollment: (id: string) => void;
    payments: Payment[];
    addPayment: (payment: Payment, installmentId?: string) => void;
    // Cycle Management
    academicCycles: AcademicCycle[];
    currentCycleId: string;
    setCurrentCycleId: (id: string) => void;
    // Installment Management
    installments: Installment[];
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
    // Dynamic Cycle Generation: Summer (Jan-Feb) and School (Mar-Dec)
    const generateStandardCycles = (year: number) => [
        {
            id: `verano-${year}`,
            name: `Verano ${year}`,
            months: [`${year}-01`, `${year}-02`]
        },
        {
            id: `anual-${year}`,
            name: `Anual ${year}`,
            months: [`${year}-03`, `${year}-04`, `${year}-05`, `${year}-06`, `${year}-07`, `${year}-08`, `${year}-09`, `${year}-10`, `${year}-11`, `${year}-12`]
        }
    ];

    const [academicCycles] = useState<AcademicCycle[]>(() => {
        const currentYear = new Date().getFullYear();
        return [
            ...generateStandardCycles(currentYear),
            ...generateStandardCycles(currentYear + 1)
        ];
    });

    const [currentCycleId, setCurrentCycleId] = useState<string>(() => {
        const currentYear = new Date().getFullYear();
        return `anual-${currentYear}`;
    });

    // Auto-detect current cycle based on today's date
    React.useEffect(() => {
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

        const detectedCycle = academicCycles.find(cycle =>
            cycle.months.includes(currentMonthStr)
        );

        if (detectedCycle) {
            setCurrentCycleId(detectedCycle.id);
        }
    }, [academicCycles]);

    const [courses, setCourses] = useState<Course[]>([
        { id: '1', name: 'Matemáticas Avanzadas', hours: '2', minutes: '0', price: '150' },
        { id: '2', name: 'Física Cuántica', hours: '1', minutes: '30', price: '200' },
    ]);

    const [students, setStudents] = useState<Student[]>([
        { id: 's1', firstName: 'Juan', lastName: 'Pérez', phone: '999111222', status: 'active', type: 'student' },
        { id: 's2', firstName: 'Maria', lastName: 'Garcia', phone: '999777888', status: 'active', type: 'student' },
    ]);

    const [teachers, setTeachers] = useState<Teacher[]>([
        { id: '1', firstName: 'Carlos', lastName: 'Ruíz', phone: '999111222', extra: 'Matemáticas Avanzadas', status: 'active', type: 'teacher' },
        { id: '2', firstName: 'Ana', lastName: 'Belén', phone: '999333444', extra: 'Física Cuántica', status: 'active', type: 'teacher' },
    ]);

    const [classes, setClasses] = useState<ClassItem[]>([
        {
            id: 'c1',
            courseId: '1',
            courseName: 'Matemáticas Avanzadas',
            teacherName: 'Carlos Ruíz',
            schedules: [{ day: 'Lunes', startTime: '08:00' }],
            duration: '2h 0m',
            capacity: '20',
            color: '#4C6EF5',
            cycleId: 'anual-2026'
        },
    ]);

    const [enrollments, setEnrollments] = useState<Enrollment[]>([
        { id: 'e1', studentId: 's1', classId: 'c1', date: '2026-03-01', status: 'active' },
        { id: 'e2', studentId: 's2', classId: 'c1', date: '2026-03-01', status: 'active' },
    ]);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);

    // Automatically seed installments for initial enrollments
    React.useEffect(() => {
        if (installments.length === 0 && enrollments.length > 0) {
            const initialInst: Installment[] = [];
            enrollments.forEach(enrol => {
                const cls = classes.find(c => c.id === enrol.classId);
                const course = courses.find(co => co.id === cls?.courseId);
                const cycle = academicCycles.find(cy => cy.id === cls?.cycleId);
                if (cycle && course) {
                    cycle.months.forEach(month => {
                        initialInst.push({
                            id: `${enrol.id}-${month}`,
                            enrollmentId: enrol.id,
                            studentId: enrol.studentId,
                            monthYear: month,
                            amount: course.price,
                            isPaid: false,
                            dueDate: `${month}-05`
                        });
                    });
                }
            });
            setInstallments(initialInst);
        }
    }, []);

    const addCourse = (course: Course) => setCourses(prev => [course, ...prev]);
    const updateCourse = (updatedCourse: Course) => setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    const addStudent = (student: Student) => setStudents(prev => [student, ...prev]);
    const updateStudent = (updatedStudent: Student) => setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    const addTeacher = (teacher: Teacher) => setTeachers(prev => [teacher, ...prev]);
    const updateTeacher = (updatedTeacher: Teacher) => setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    const addClass = (newItem: ClassItem) => setClasses(prev => [newItem, ...prev]);
    const updateClass = (updatedItem: ClassItem) => setClasses(prev => prev.map(c => c.id === updatedItem.id ? updatedItem : c));
    const removeClass = (id: string) => setClasses(prev => prev.filter(c => c.id !== id));
    const removeStudent = (id: string) => setStudents(prev => prev.filter(s => s.id !== id));
    const removeTeacher = (id: string) => setTeachers(prev => prev.filter(t => t.id !== id));
    const removeCourse = (id: string) => setCourses(prev => prev.filter(c => c.id !== id));

    // Updated Enrollment logic to generate Plan
    const addEnrollment = (enrollment: Enrollment) => {
        const cls = classes.find(c => c.id === enrollment.classId);
        const course = courses.find(co => co.id === cls?.courseId);
        const cycle = academicCycles.find(cy => cy.id === cls?.cycleId);

        if (cycle && course) {
            // Generate installments
            const newInstallments: Installment[] = cycle.months.map((monthYear, idx) => ({
                id: `${enrollment.id}-${monthYear}`,
                enrollmentId: enrollment.id,
                studentId: enrollment.studentId,
                monthYear: monthYear,
                amount: course.price,
                isPaid: false,
                dueDate: `${monthYear}-05` // Standard due date: 5th of each month
            }));

            setInstallments(prev => [...prev, ...newInstallments]);
        }

        setEnrollments(prev => [{ ...enrollment, status: 'active' }, ...prev]);
    };

    const updateEnrollment = (updatedEnrollment: Enrollment) => setEnrollments(prev => prev.map(e => e.id === updatedEnrollment.id ? updatedEnrollment : e));
    const removeEnrollment = (id: string) => {
        setEnrollments(prev => prev.filter(e => e.id !== id));
        setInstallments(prev => prev.filter(inst => inst.enrollmentId !== id));
    };

    const addPayment = (p: Payment, installmentId?: string) => {
        if (installmentId) {
            setInstallments(prev => prev.map(inst =>
                inst.id === installmentId ? { ...inst, isPaid: true, paymentId: p.id } : inst
            ));
        }
        setPayments(prev => [p, ...prev]);
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
            academicCycles, currentCycleId, setCurrentCycleId,
            installments
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
