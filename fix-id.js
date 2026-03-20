import { initializeApp } from 'firebase/app';
import { getFirestore, updateDoc, doc } from 'firebase/firestore/lite';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixSortOrder() {
    try {
        console.log("Fixing createdAt for 5aOHjPxo to jump to the top...");
        const d = new Date();
        d.setHours(23, 59, 59); // Set to maximum possible today time so it jumps straight to row 1!
        
        // I don't know the exact 20 char ID, so I'll just find it.
        // Wait, the API requires to know the exact ID, but I can't search easily without getDocs.
    } catch(err) {
        console.error(err);
    }
}
fixSortOrder();
