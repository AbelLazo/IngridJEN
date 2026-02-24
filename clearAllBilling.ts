import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from './lib/firebaseConfig';

async function clearAllBilling() {
    console.log('🔄 Iniciando limpieza de matrículas, cuotas y pagos...');

    try {
        const collectionsToClear = ['enrollments', 'installments', 'payments'];

        for (const colName of collectionsToClear) {
            const colRef = collection(db, colName);
            const snapshot = await getDocs(colRef);
            let deletedCount = 0;

            for (const itemDoc of snapshot.docs) {
                await deleteDoc(doc(db, colName, itemDoc.id));
                deletedCount++;
            }
            console.log(`✅ Eliminados ${deletedCount} registros de ${colName}.`);
        }

        console.log('🎉 Limpieza profunda completada con éxito. Listo para pruebas.');
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    }
}

clearAllBilling().catch(console.error);
