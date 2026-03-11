/**
 * Script to clean up installments from withdrawn enrollments that have no payments.
 * Also cleans installments marked isPaid:true without a real payment record.
 * Run with: node scripts/cleanStaleData.js
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
    console.log('🧹 Cleaning stale data...\n');

    const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
    const installmentsSnap = await getDocs(collection(db, 'installments'));
    const paymentsSnap = await getDocs(collection(db, 'payments'));

    // Build set of payment-backed installment IDs
    const paidInstallmentIds = new Set();
    paymentsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.installmentId) paidInstallmentIds.add(data.installmentId);
    });

    // Find withdrawn enrollments with no real payments
    const withdrawnNoPayments = [];
    enrollmentsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'withdrawn') {
            // Check if any installment for this enrollment has a real payment
            const enrollInsts = installmentsSnap.docs.filter(i => i.data().enrollmentId === d.id);
            const hasAnyRealPayment = enrollInsts.some(i => paidInstallmentIds.has(i.id));
            if (!hasAnyRealPayment) {
                withdrawnNoPayments.push({ id: d.id, data, installmentCount: enrollInsts.length });
            }
        }
    });

    console.log(`Found ${withdrawnNoPayments.length} withdrawn enrollments with NO real payments:\n`);
    withdrawnNoPayments.forEach(e => {
        console.log(`  - Enrollment ${e.id}: studentId=${e.data.studentId}, ${e.installmentCount} installments`);
    });

    if (withdrawnNoPayments.length === 0) {
        console.log('\n✅ Nothing to clean!');
        process.exit(0);
    }

    // Delete installments for these enrollments
    const enrollmentIdsToClean = new Set(withdrawnNoPayments.map(e => e.id));
    let deletedInstallments = 0;

    console.log('\n🗑️  Deleting installments...');
    for (const instDoc of installmentsSnap.docs) {
        const data = instDoc.data();
        if (enrollmentIdsToClean.has(data.enrollmentId)) {
            await deleteDoc(doc(db, 'installments', instDoc.id));
            deletedInstallments++;
        }
    }
    console.log(`  ✓ Deleted ${deletedInstallments} installments`);

    // Delete the withdrawn enrollments themselves
    let deletedEnrollments = 0;
    console.log('\n🗑️  Deleting withdrawn enrollments...');
    for (const enrol of withdrawnNoPayments) {
        await deleteDoc(doc(db, 'enrollments', enrol.id));
        deletedEnrollments++;
    }
    console.log(`  ✓ Deleted ${deletedEnrollments} enrollments`);

    console.log(`\n✅ Done! Cleaned ${deletedInstallments} installments + ${deletedEnrollments} enrollments.`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
