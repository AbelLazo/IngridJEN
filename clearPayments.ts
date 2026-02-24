import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebaseConfig';

async function clearPayments() {
    console.log('🔄 Iniciando limpieza de historial de pagos...');

    try {
        // 1. Obtener y eliminar todos los pagos
        const paymentsRef = collection(db, 'payments');
        const paymentsSnapshot = await getDocs(paymentsRef);

        let deletedCount = 0;
        for (const paymentDoc of paymentsSnapshot.docs) {
            await deleteDoc(doc(db, 'payments', paymentDoc.id));
            deletedCount++;
        }
        console.log(`✅ Eliminados ${deletedCount} registros de pagos.`);

        // 2. Obtener todas las cuotas y restablecer su estado de pago
        const installmentsRef = collection(db, 'installments');
        const installmentsSnapshot = await getDocs(installmentsRef);

        let resetCount = 0;
        for (const instDoc of installmentsSnapshot.docs) {
            const data = instDoc.data();
            if (data.isPaid || data.paymentId) {
                await updateDoc(doc(db, 'installments', instDoc.id), {
                    isPaid: false,
                    paymentId: null // O fieldValue.delete() si prefieres borrarlo
                });
                resetCount++;
            }
        }
        console.log(`✅ Restablecidas ${resetCount} cuotas a estado "no pagado".`);

        console.log('🎉 Limpieza completada con éxito.');
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    }
}

clearPayments().catch(console.error);
