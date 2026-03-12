
import React, { useContext, useState, useEffect, createContext } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../services/firebase';
import db from '../services/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password, remember = true) {
    if (!auth) {
        throw new Error("Conexão com Banco de Dados falhou: As credenciais de Ambiente (VITE_FIREBASE) estão faltando na configuração da Vercel.");
    }
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    if (!auth) {
        console.warn("Auth not initialized (check firebase config)");
        setLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // Auto-Sync system's global settings from Database to ensure they never blank out due to local cache loss
      try {
        const dbConfig = await db.getById('settings', 'global');
        if (dbConfig && Object.keys(dbConfig).length > 0) {
            localStorage.setItem('stationery_config', JSON.stringify(dbConfig));
        }
      } catch (e) {
        console.warn("AuthContext: Erro ao sincronizar configurações globais do banco", e);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
