import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebaseConfig';

const sampleData = {
    courses: [
        { name: 'Matemáticas Avanzadas', hours: '2', minutes: '0', price: '150' },
        { name: 'Física Cuántica', hours: '1', minutes: '30', price: '200' },
    ],
    students: [
        { firstName: 'Juan', lastName: 'Pérez', phone: '999111222', status: 'active', type: 'student' },
        { firstName: 'Maria', lastName: 'Garcia', phone: '999777888', status: 'active', type: 'student' },
    ],
    teachers: [
        { firstName: 'Carlos', lastName: 'Ruíz', phone: '999111222', extra: 'Matemáticas Avanzadas', status: 'active', type: 'teacher' },
        { firstName: 'Ana', lastName: 'Belén', phone: '999333444', extra: 'Física Cuántica', status: 'active', type: 'teacher' },
    ]
};

async function seed() {
    console.log('Starting migration to Firestore...');

    for (const [colName, items] of Object.entries(sampleData)) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);

        if (snapshot.empty) {
            console.log(`Seeding ${colName}...`);
            for (const item of items) {
                await addDoc(colRef, item);
            }
        } else {
            console.log(`${colName} already has data, skipping.`);
        }
    }

    console.log('Migration/Seeding finished!');
}

seed().catch(console.error);
