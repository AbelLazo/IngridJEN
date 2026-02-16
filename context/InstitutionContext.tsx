import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Course {
    id: string;
    name: string;
    hours: string;
    minutes: string;
    price: string; // Added price for monthly payments
}

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    type: 'student';
}

export interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    extra: string;
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
}

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
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
    removeEnrollment: (id: string) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
    const [courses, setCourses] = useState<Course[]>([
        { id: '1', name: 'Matemáticas Avanzadas', hours: '2', minutes: '0', price: '150' },
        { id: '2', name: 'Física Cuántica', hours: '1', minutes: '30', price: '200' },
    ]);

    const [students, setStudents] = useState<Student[]>([
        { id: 's1', firstName: 'Juan', lastName: 'Pérez', phone: '999111222', type: 'student' },
        { id: 's2', firstName: 'Maria', lastName: 'Garcia', phone: '999777888', type: 'student' },
    ]);

    const [teachers, setTeachers] = useState<Teacher[]>([
        { id: '1', firstName: 'Carlos', lastName: 'Ruíz', phone: '999111222', extra: 'Matemáticas Avanzadas', type: 'teacher' },
        { id: '2', firstName: 'Ana', lastName: 'Belén', phone: '999333444', extra: 'Física Cuántica', type: 'teacher' },
    ]);

    const [classes, setClasses] = useState<ClassItem[]>([
        {
            id: 'c1',
            courseId: '1',
            courseName: 'Matemáticas Avanzadas',
            teacherName: 'Carlos Ruíz',
            schedules: [
                { day: 'Lunes', startTime: '08:00' },
                { day: 'Miércoles', startTime: '08:00' }
            ],
            duration: '2h 0m',
            capacity: '20',
            color: '#4C6EF5'
        },
        {
            id: 'c2',
            courseId: '2',
            courseName: 'Física Cuántica',
            teacherName: 'Ana Belén',
            schedules: [
                { day: 'Martes', startTime: '10:30' }
            ],
            duration: '1h 30m',
            capacity: '15',
            color: '#12B886'
        },
    ]);

    const [enrollments, setEnrollments] = useState<Enrollment[]>([
        { id: 'e1', studentId: 's1', classId: 'c1' },
    ]);

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
    const addEnrollment = (e: Enrollment) => setEnrollments(prev => [e, ...prev]);
    const removeEnrollment = (id: string) => setEnrollments(prev => prev.filter(e => e.id !== id));

    return (
        <InstitutionContext.Provider value={{
            courses,
            addCourse,
            updateCourse,
            students,
            addStudent,
            updateStudent,
            teachers,
            addTeacher,
            updateTeacher,
            classes,
            addClass,
            updateClass,
            removeClass,
            removeStudent,
            removeTeacher,
            removeCourse,
            enrollments,
            addEnrollment,
            removeEnrollment
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
