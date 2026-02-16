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

export interface ClassItem {
    id: string;
    courseId: string;
    courseName: string;
    teacherName: string;
    day: string;
    startTime: string;
    duration: string;
}

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
}

interface InstitutionContextType {
    courses: Course[];
    addCourse: (course: Course) => void;
    students: Student[];
    addStudent: (student: Student) => void;
    teachers: Teacher[];
    addTeacher: (teacher: Teacher) => void;
    classes: ClassItem[];
    addClass: (newItem: ClassItem) => void;
    updateClass: (updatedItem: ClassItem) => void;
    enrollments: Enrollment[];
    addEnrollment: (enrollment: Enrollment) => void;
    removeEnrollment: (id: string) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
    const [courses, setCourses] = useState<Course[]>([
        { id: '1', name: 'Matemáticas Avanzadas', hours: '40', minutes: '0', price: '150' },
        { id: '2', name: 'Física Cuántica', hours: '32', minutes: '30', price: '200' },
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
        { id: 'c1', courseId: '1', courseName: 'Matemáticas Avanzadas', teacherName: 'Carlos Ruíz', day: 'Lunes', startTime: '08:00', duration: '40h 0m' },
    ]);

    const [enrollments, setEnrollments] = useState<Enrollment[]>([
        { id: 'e1', studentId: 's1', classId: 'c1' },
    ]);

    const addCourse = (course: Course) => setCourses(prev => [course, ...prev]);
    const addStudent = (student: Student) => setStudents(prev => [student, ...prev]);
    const addTeacher = (teacher: Teacher) => setTeachers(prev => [teacher, ...prev]);
    const addClass = (newItem: ClassItem) => setClasses(prev => [newItem, ...prev]);
    const updateClass = (updatedItem: ClassItem) => setClasses(prev => prev.map(c => c.id === updatedItem.id ? updatedItem : c));
    const addEnrollment = (e: Enrollment) => setEnrollments(prev => [e, ...prev]);
    const removeEnrollment = (id: string) => setEnrollments(prev => prev.filter(e => e.id !== id));

    return (
        <InstitutionContext.Provider value={{
            courses,
            addCourse,
            students,
            addStudent,
            teachers,
            addTeacher,
            classes,
            addClass,
            updateClass,
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
