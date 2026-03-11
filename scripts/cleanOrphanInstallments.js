/**
 * Script to clean orphan installments from Firestore.
 * Removes installments whose enrollmentId doesn't match any existing enrollment.
 * Also removes installments whose enrollment's class doesn't exist.
 * Run with: node scripts/cleanOrphanInstallments.js
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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
    console.log('🔍 Scanning for orphan installments...\n');

    // 1. Load all enrollments
    const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
    const enrollmentIds = new Set(enrollmentsSnap.docs.map(d => d.id));
    console.log(`  📋 Found ${enrollmentIds.size} enrollments`);

    // 2. Load all classes
    const classesSnap = await getDocs(collection(db, 'classes'));
    const classIds = new Set(classesSnap.docs.map(d => d.id));
    console.log(`  📋 Found ${classIds.size} classes`);

    // 3. Check enrollments that reference non-existent classes
    const validEnrollmentIds = new Set();
    const orphanEnrollmentIds = new Set();
    enrollmentsSnap.docs.forEach(d => {
        const data = d.data();
        if (classIds.has(data.classId)) {
            validEnrollmentIds.add(d.id);
        } else {
            orphanEnrollmentIds.add(d.id);
            console.log(`  ⚠️  Enrollment ${d.id} references non-existent class ${data.classId}`);
        }
    });

    // 4. Load all installments and find orphans
    const installmentsSnap = await getDocs(collection(db, 'installments'));
    console.log(`  📋 Found ${installmentsSnap.size} installments total`);

    const orphanInstallments = [];
    installmentsSnap.docs.forEach(d => {
        const data = d.data();
        if (!enrollmentIds.has(data.enrollmentId)) {
            orphanInstallments.push({ id: d.id, reason: `enrollment ${data.enrollmentId} does not exist`, data });
        } else if (orphanEnrollmentIds.has(data.enrollmentId)) {
            orphanInstallments.push({ id: d.id, reason: `enrollment ${data.enrollmentId} references a non-existent class`, data });
        }
    });

    // 5. Also find orphan payments (payments referencing non-existent enrollments)
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    console.log(`  📋 Found ${paymentsSnap.size} payments total`);

    const orphanPayments = [];
    paymentsSnap.docs.forEach(d => {
        const data = d.data();
        if (!enrollmentIds.has(data.enrollmentId)) {
            orphanPayments.push({ id: d.id, reason: `enrollment ${data.enrollmentId} does not exist`, data });
        } else if (orphanEnrollmentIds.has(data.enrollmentId)) {
            orphanPayments.push({ id: d.id, reason: `enrollment ${data.enrollmentId} references a non-existent class`, data });
        }
    });

    console.log(`\n📊 Results:`);
    console.log(`  - Orphan installments: ${orphanInstallments.length}`);
    console.log(`  - Orphan payments: ${orphanPayments.length}`);
    console.log(`  - Orphan enrollments (no class): ${orphanEnrollmentIds.size}`);

    if (orphanInstallments.length === 0 && orphanPayments.length === 0 && orphanEnrollmentIds.size === 0) {
        console.log('\n✅ No orphan records found. Database is clean!');
        process.exit(0);
    }

    // 6. Delete orphans
    console.log('\n🗑️  Deleting orphan records...');

    let deletedInstallments = 0;
    for (const orphan of orphanInstallments) {
        await deleteDoc(doc(db, 'installments', orphan.id));
        deletedInstallments++;
    }
    console.log(`  ✓ Deleted ${deletedInstallments} orphan installments`);

    let deletedPayments = 0;
    for (const orphan of orphanPayments) {
        await deleteDoc(doc(db, 'payments', orphan.id));
        deletedPayments++;
    }
    console.log(`  ✓ Deleted ${deletedPayments} orphan payments`);

    let deletedEnrollments = 0;
    for (const id of orphanEnrollmentIds) {
        await deleteDoc(doc(db, 'enrollments', id));
        deletedEnrollments++;
    }
    console.log(`  ✓ Deleted ${deletedEnrollments} orphan enrollments`);

    console.log(`\n✅ Done! Cleaned ${deletedInstallments + deletedPayments + deletedEnrollments} orphan records total.`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
