import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ⚠️⚠️⚠️ IMPORTANT: Replace this config with YOURS from the Firebase Console ⚠️⚠️⚠️
// 1. Go to console.firebase.google.com
// 2. Click "Project Settings" (gear icon) -> General
// 3. Scroll down to "Your apps" (or Add app -> Web)
// 4. Copy the "firebaseConfig" object and paste it here.


const cleanEnv = (val, fallback) => {
    const raw = val || fallback;
    return typeof raw === 'string' ? raw.replace(/[\r\n\s]+/g, '') : raw;
};

export const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyAMVeDqvR2iT1bEa7DqAoPa4VVmmK-ARSs"),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "webatelie-1cf7e.firebaseapp.com"),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "webatelie-1cf7e"),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "webatelie-1cf7e.firebasestorage.app"),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "909595873000"),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID, "1:909595873000:web:b61a50179ba235e9fcc35d"),
  measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-PH00VL84NW")
};


let db = null;
let auth = null;

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.warn("Firebase initialization failed (likely missing config). Falling back to mock/local mode if possible, but cloud sync will strict fail.", error);
    // We could technically fall back to localStorage here if we wanted a robust hybrid mode, 
    // but the user requested a switch to cloud.
}

export { db, auth };

// Helper to convert Firestore snapshot to array
export const snapshotToArray = (snapshot) => {
    return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
    }));
};
