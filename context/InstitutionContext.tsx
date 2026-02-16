import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Course {
    id: string;
    name: string;
    hours: string;
    minutes: string;
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

interface InstitutionContextType {
    courses: Course[];
    addCourse: (course: Course) => void;
    students: Student[];
    addStudent: (student: Student) => void;
    teachers: Teacher[];
    addTeacher: (teacher: Teacher) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
    const [courses, setCourses] = useState<Course[]>([
        { id: '1', name: 'Matemáticas Avanzadas', hours: '40', minutes: '0' },
        { id: '2', name: 'Física Cuántica', hours: '32', minutes: '30' },
    ]);

    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    const addCourse = (course: Course) => setCourses(prev => [course, ...prev]);
    const addStudent = (student: Student) => setStudents(prev => [student, ...prev]);
    const addTeacher = (teacher: Teacher) => setTeachers(prev => [teacher, ...prev]);

    return (
        <InstitutionContext.Provider value={{
            courses,
            addCourse,
            students,
            addStudent,
            teachers,
            addTeacher
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
