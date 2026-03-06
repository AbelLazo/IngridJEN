/**
 * Script to clean all Firestore collections EXCEPT "users".
 * Run with: node scripts/cleanDatabase.js
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

// All collections to clean (everything EXCEPT "users")
const COLLECTIONS_TO_CLEAN = [
    'academicCycles',
    'courses',
    'students',
    'teachers',
    'classes',
    'enrollments',
    'installments',
    'payments',
    'attendances',
];

async function deleteCollection(collectionName) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
        console.log(`  ✓ ${collectionName}: already empty`);
        return 0;
    }

    let count = 0;
    for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, collectionName, docSnap.id));
        count++;
    }
    console.log(`  ✓ ${collectionName}: deleted ${count} documents`);
    return count;
}

async function main() {
    console.log('🧹 Cleaning Firestore database...');
    console.log('   (Preserving "users" collection)\n');

    let totalDeleted = 0;

    for (const colName of COLLECTIONS_TO_CLEAN) {
        try {
            const deleted = await deleteCollection(colName);
            totalDeleted += deleted;
        } catch (err) {
            console.error(`  ✗ Error cleaning ${colName}:`, err.message);
        }
    }

    console.log(`\n✅ Done! Deleted ${totalDeleted} documents total.`);
    console.log('   "users" collection was NOT touched.');
    process.exit(0);
}

main();
