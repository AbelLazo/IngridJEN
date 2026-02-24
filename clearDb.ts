import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from './lib/firebaseConfig';

const collectionsToClear = [
    'courses',
    'students',
    'teachers',
    'classes',
    'enrollments',
    'payments',
    'academicCycles'
];

async function clearDatabase() {
    console.log('Starting database cleanup...');

    for (const colName of collectionsToClear) {
        console.log(`Clearing ${colName}...`);
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);

        if (snapshot.empty) {
            console.log(`- ${colName} is already empty.`);
            continue;
        }

        let deletedCount = 0;
        for (const doc of snapshot.docs) {
            await deleteDoc(doc.ref);
            deletedCount++;
        }
        console.log(`- Deleted ${deletedCount} documents from ${colName}.`);
    }

    console.log('Database cleanup finished successfully!');
}

clearDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error clearing database:', error);
        process.exit(1);
    });
