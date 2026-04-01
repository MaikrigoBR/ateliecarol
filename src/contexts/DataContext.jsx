import React, { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/database';
import { useAuth } from './AuthContext';

/**
 * DataContext ("TanStack Query Lite")
 * 
 * Gerencia o carregamento de dados globais para minimizar leituras no Firestore.
 * Fornece dados cacheados para Orders, Products, Customers, Inventory.
 */

const DataContext = createContext();

export function useData() {
    return useContext(DataContext);
}

export function DataProvider({ children }) {
    const { currentUser } = useAuth();

    // Cache State
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    
    const [loading, setLoading] = useState({
        orders: false,
        products: false,
        customers: false,
        inventory: false,
        transactions: false,
        accounts: false
    });

    const [lastFetched, setLastFetched] = useState({
        orders: 0,
        products: 0,
        customers: 0,
        inventory: 0,
        transactions: 0,
        accounts: 0
    });

    // Config: Cache duration in ms (e.g., 5 minutes for stale data)
    // Se 0, sempre faz fetch, mas ainda usa o state enquanto não volta.
    const CACHE_DURATION = 5 * 60 * 1000; 

    // Generic Fetcher with Cache Logic
    const fetchData = async (collectionName, setter, force = false) => {
        const now = Date.now();
        if (!force && lastFetched[collectionName] && (now - lastFetched[collectionName] < CACHE_DURATION)) {
            // Data is fresh enough, return cached implicitly
            return;
        }

        // Set Loading ID
        setLoading(prev => ({ ...prev, [collectionName]: true }));

        try {
            const data = await db.getAll(collectionName);
            setter(data);
            setLastFetched(prev => ({ ...prev, [collectionName]: now }));
        } catch (error) {
            console.error(`Error fetching ${collectionName} in DataContext:`, error);
        } finally {
            setLoading(prev => ({ ...prev, [collectionName]: false }));
        }
    };

    // Public API
    const refreshOrders = (force) => fetchData('orders', setOrders, force);
    const refreshProducts = (force) => fetchData('products', setProducts, force);
    const refreshCustomers = (force) => fetchData('customers', setCustomers, force);
    const refreshInventory = (force) => fetchData('inventory', setInventory, force);
    const refreshTransactions = (force) => fetchData('transactions', setTransactions, force);
    const refreshAccounts = (force) => fetchData('accounts', setAccounts, force);

    const refreshAll = () => {
        refreshOrders(true);
        refreshProducts(true);
        refreshCustomers(true);
        refreshInventory(true);
        refreshTransactions(true);
        refreshAccounts(true);
    };

    // Auto-fetch critical data on mount only when Authenticated
    useEffect(() => {
        if (currentUser) {
            refreshOrders();
            refreshProducts();
            refreshCustomers();
            refreshTransactions();
            refreshAccounts();
        }
    }, [currentUser]);

    const value = {
        orders,
        products,
        customers,
        inventory,
        transactions,
        accounts,
        loading,
        refreshOrders,
        refreshProducts,
        refreshCustomers,
        refreshInventory,
        refreshTransactions,
        refreshAccounts,
        refreshAll
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}
