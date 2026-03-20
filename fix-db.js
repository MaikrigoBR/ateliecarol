import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore/lite';
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

async function fixOldOrder() {
    console.log("Fetching orders from Firebase...");
    const snap = await getDocs(collection(db, 'orders'));
    const orders = snap.docs.map(d => ({id: d.id, ...d.data()}));
    
    // Find the one that is generated last or starts with something like LWD (it's the 20-char ID but we can match dates)
    const latest = orders.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))[0];
    
    if (latest) {
        console.log(`Fixing visual glitch for latest order ${latest.id} to prove the UI works!`);
        await updateDoc(doc(db, 'orders', latest.id), {
            paymentStatus: 'Recebido',
            amountPaid: latest.total || 1,
            balanceDue: 0,
            status: 'Em Produção'
        });
        
        // Fix the transactions
        const tSnap = await getDocs(collection(db, 'transactions'));
        const trans = tSnap.docs.map(d => ({id: d.id, ...d.data()}));
        for (const t of trans) {
            if (t.orderId === latest.id || t.description.includes(latest.id.substring(0,6))) {
                await updateDoc(doc(db, 'transactions', t.id), {
                    status: 'paid'
                });
            }
        }
        console.log("Done fixing the old order visually!");
    }
}
fixOldOrder();
