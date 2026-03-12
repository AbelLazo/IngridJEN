import { initializeApp } from 'firebase/app';
// @ts-expect-error: getReactNativePersistence is available in the React Native environment but not always in the base types
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// IngridJEN Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyCQ81kWVckl0T98tiJlRlXzaEzy3z1N6K0",
    authDomain: "ingridjen-prod-777.firebaseapp.com",
    projectId: "ingridjen-prod-777",
    storageBucket: "ingridjen-prod-777.firebasestorage.app",
    messagingSenderId: "794528666075",
    appId: "1:794528666075:web:43423813cdbf092c68d7fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth with persistence and Firestore instance
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
