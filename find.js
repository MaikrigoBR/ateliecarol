import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
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

async function findOrder() {
    try {
        console.log("Searching for 5aOHjPxo...");
        const ordersRef = collection(db, 'orders');
        const snap = await getDocs(ordersRef);
        console.log(`Found ${snap.docs.length} total orders.`);
        
        let found = false;
        snap.docs.forEach(d => {
            if (d.id.includes('5aOHjPxo')) {
                console.log("FOUND BY ID:", d.id, d.data());
                found = true;
            }
        });
        
        if (!found) {
            console.log("Order 5aOHjPxo was NOT found in Firebase!");
        }
    } catch(err) {
        console.error(err);
    }
}
findOrder();
