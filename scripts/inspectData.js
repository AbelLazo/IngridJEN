/**
 * Script to inspect current enrollments, installments, and their relationships.
 * Run with: node scripts/inspectData.js
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCQ81kWVckl0T98tiJlRlXzaEzy3z1N6K0",
    authDomain: "ingridjen-prod-777.firebaseapp.com",
    projectId: "ingridjen-prod-777",
    storageBucket: "ingridjen-prod-777.firebasestorage.app",
    messagingSenderId: "794528666075",
    appId: "1:794528666075:web:43423813cdbf092c68d7fe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    console.log('📊 Inspecting data relationships...\n');

    const studentsSnap = await getDocs(collection(db, 'students'));
    const students = {};
    studentsSnap.docs.forEach(d => {
        const data = d.data();
        students[d.id] = `${data.firstName} ${data.lastName} (status: ${data.status})`;
    });

    const classesSnap = await getDocs(collection(db, 'classes'));
    const classes = {};
    classesSnap.docs.forEach(d => {
        const data = d.data();
        classes[d.id] = { name: data.courseName, cycleId: data.cycleId, teacherName: data.teacherName };
    });

    const cyclesSnap = await getDocs(collection(db, 'academicCycles'));
    const cycles = {};
    cyclesSnap.docs.forEach(d => {
        const data = d.data();
        cycles[d.id] = data.name;
    });

    const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
    const installmentsSnap = await getDocs(collection(db, 'installments'));

    console.log(`Total students: ${studentsSnap.size}`);
    console.log(`Total classes: ${classesSnap.size}`);
    console.log(`Total cycles: ${cyclesSnap.size}`);
    console.log(`Total enrollments: ${enrollmentsSnap.size}`);
    console.log(`Total installments: ${installmentsSnap.size}\n`);

    console.log('--- ENROLLMENTS ---');
    enrollmentsSnap.docs.forEach(d => {
        const data = d.data();
        const studentName = students[data.studentId] || `UNKNOWN (${data.studentId})`;
        const cls = classes[data.classId] || { name: 'UNKNOWN CLASS', cycleId: '?' };
        const cycleName = cycles[cls.cycleId] || `UNKNOWN CYCLE (${cls.cycleId})`;
        const instCount = installmentsSnap.docs.filter(i => i.data().enrollmentId === d.id).length;
        const unpaidCount = installmentsSnap.docs.filter(i => i.data().enrollmentId === d.id && !i.data().isPaid).length;
        const paidCount = instCount - unpaidCount;

        console.log(`\n  Enrollment: ${d.id}`);
        console.log(`    Student: ${studentName}`);
        console.log(`    Class: ${cls.name} (Teacher: ${cls.teacherName || 'N/A'})`);
        console.log(`    Cycle: ${cycleName}`);
        console.log(`    Status: ${data.status || 'active'}`);
        console.log(`    Installments: ${instCount} total (${paidCount} paid, ${unpaidCount} unpaid)`);
    });

    console.log('\n--- STUDENTS WITHOUT ENROLLMENTS ---');
    const enrolledStudentIds = new Set(enrollmentsSnap.docs.map(d => d.data().studentId));
    studentsSnap.docs.forEach(d => {
        if (!enrolledStudentIds.has(d.id)) {
            console.log(`  ${students[d.id]} (ID: ${d.id})`);
        }
    });

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
