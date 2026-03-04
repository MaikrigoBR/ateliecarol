
import { db, snapshotToArray } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';

// Collection Names mapping
const COLLECTIONS = {
    ORDERS: 'orders',
    PRODUCTS: 'products',
    USER: 'users', // 'user' is often reserved or singleton, using 'users' collection
    CUSTOMERS: 'customers',
    TRANSACTIONS: 'transactions',
    INVENTORY: 'inventory',
    BUDGETS: 'budgets'
};

export const database = {
    // 1. GET ALL
    async getAll(collectionName) {
        try {
            if (!db) return []; // Guard if init failed
            const q = query(collection(db, collectionName));
            // You can add orderBy here if needed, e.g. orderBy('date', 'desc')
            const querySnapshot = await getDocs(q);
            return snapshotToArray(querySnapshot);
        } catch (error) {
            console.error(`Error getting ${collectionName}:`, error);
            // Fallback for demo/empty state
            return [];
        }
    },

    // 2. GET BY ID
    async getById(collectionName, id) {
        try {
             if (!db) return null;
             const docRef = doc(db, collectionName, id);
             const docSnap = await getDoc(docRef);
             
             if (docSnap.exists()) {
                 return { id: docSnap.id, ...docSnap.data() };
             } else {
                 return null;
             }
        } catch (error) {
            console.error(`Error getting ${collectionName} by ID:`, error);
            return null;
        }
    },

    // 3. CREATE
    async create(collectionName, data) {
        try {
            if (!db) {
                console.error("Database not initialized");
                return null;
            }
            
            // Allow custom IDs if provided (mostly for compatibility/migration)
            // But Firestore prefers auto-IDs via addDoc.
            // If we *really* need custom ID (like 'PED-001'), we use setDoc.
            // For now, let's stick to auto-IDs for new cloud objects, unless 'id' is in data.
            // BUT, modifying 'addDoc' is safer for scalability.
            const docRef = await addDoc(collection(db, collectionName), {
                ...data,
                createdAt: new Date().toISOString()
            });
            
            return { id: docRef.id, ...data };
        } catch (error) {
            console.error(`Error creating in ${collectionName}:`, error);
            alert("Erro ao salvar no banco de dados. Verifique sua conexão ou configuração.");
            throw error;
        }
    },

    // 3.5 SET (Upsert)
    async set(collectionName, id, data) {
        try {
            if (!db) return null;
            const docRef = doc(db, collectionName, id);
            await setDoc(docRef, data);
            return { id, ...data };
        } catch (error) {
            console.error(`Error setting in ${collectionName}:`, error);
            throw error;
        }
    },

    // 4. UPDATE
    async update(collectionName, id, updates) {
        try {
            if (!db) return null;
            const docRef = doc(db, collectionName, id);
            await updateDoc(docRef, updates);
            return { id, ...updates };
        } catch (error) {
            console.error(`Error updating ${collectionName}:`, error);
            throw error;
        }
    },

    // 5. DELETE
    async delete(collectionName, id) {
        try {
            if (!db) return false;
            await deleteDoc(doc(db, collectionName, id));
            return true;
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            return false;
        }
    },

    // 6. SET (Create/Overwite with specific ID - for Restore/Backup)
    async set(collectionName, id, data) {
        try {
            if (!db) return null;
            await setDoc(doc(db, collectionName, id), data);
            return { id, ...data };
        } catch (error) {
            console.error(`Error setting in ${collectionName}:`, error);
            throw error;
        }
    }
};

export default database;

