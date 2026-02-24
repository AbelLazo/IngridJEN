import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// IngridJEN Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQ81kWVckl0T98tiJlRlXzaEzy3z1N6K0",
    authDomain: "ingridjen-prod-777.firebaseapp.com",
    projectId: "ingridjen-prod-777",
    storageBucket: "ingridjen-prod-777.firebasestorage.app",
    messagingSenderId: "794528666075",
    appId: "1:794528666075:web:43423813cdbf092c68d7fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
