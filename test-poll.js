import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
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

async function checkPending() {
    console.log("Fetching orders from Firebase...");
    const snap = await getDocs(collection(db, 'orders'));
    const orders = snap.docs.map(d => ({id: d.id, ...d.data()}));
    
    const pending = orders.filter(o => o.ecommerceOrigin && (!o.paymentStatus || o.paymentStatus==='Pendente' || o.paymentStatus==='Novo') && o.paymentMethod==='pix');
    
    console.log(`Found ${pending.length} pending ecommerce pix orders.`);
    
    for (const order of pending) {
        console.log(`\nChecking Order ${order.id}...`);
        try {
            const url = `https://ateliecarol.vercel.app/api/check_payment?orderId=${order.id}`;
            console.log(`Fetching: ${url}`);
            const t0 = Date.now();
            const res = await fetch(url);
            const data = await res.json();
            console.log(`Response (${Date.now()-t0}ms):`, data);
        } catch(e) {
            console.error("Error:", e);
        }
    }
}
checkPending();
