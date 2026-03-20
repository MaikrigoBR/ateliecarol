import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore/lite';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Identifier is required' });

        const firebaseConfig = {
            apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAMVeDqvR2iT1bEa7DqAoPa4VVmmK-ARSs",
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "webatelie-1cf7e.firebaseapp.com",
            projectId: process.env.VITE_FIREBASE_PROJECT_ID || "webatelie-1cf7e",
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "webatelie-1cf7e.firebasestorage.app",
            messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "909595873000",
            appId: process.env.VITE_FIREBASE_APP_ID || "1:909595873000:web:b61a50179ba235e9fcc35d"
        };

        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(app);
        
        const cleanPhone = identifier.replace(/\D/g, '');
        const cleanEmail = identifier.toLowerCase();
        
        const customersRef = collection(db, 'customers');
        const snap = await getDocs(customersRef);
        
        // Emulando a busca flexível na memória do servidor para suportar formatações diferentes (ex: (44) 9999-9999)
        let foundCustomer = null;
        
        snap.forEach(doc => {
             const c = doc.data();
             if (c.email && c.email.toLowerCase() === cleanEmail) {
                 foundCustomer = c;
             }
             if (cleanPhone.length > 8 && c.phone && c.phone.replace(/\D/g, '') === cleanPhone) {
                 foundCustomer = c;
             }
             if (cleanPhone.length > 8 && c.whatsapp && c.whatsapp.replace(/\D/g, '') === cleanPhone) {
                 foundCustomer = c;
             }
        });

        if (foundCustomer) {
            return res.status(200).json({ success: true, customer: foundCustomer });
        } else {
            return res.status(200).json({ success: false, message: 'Customer not found' });
        }

    } catch (e) {
        console.error("Fast Login Server Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
