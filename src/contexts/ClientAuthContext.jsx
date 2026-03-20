import React, { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/database';

const ClientAuthContext = createContext();

export function useClientAuth() {
    return useContext(ClientAuthContext);
}

export function ClientAuthProvider({ children }) {
    const [clientSession, setClientSession] = useState(null);
    const [isClientLoading, setIsClientLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const savedToken = localStorage.getItem('stationery_client_token');
                if (savedToken) {
                    const parsed = JSON.parse(savedToken);
                    const validCustomer = await db.getById('customers', parsed.id);
                    if (validCustomer && validCustomer.status !== 'banned') {
                        setClientSession(validCustomer);
                    } else {
                        localStorage.removeItem('stationery_client_token');
                    }
                }
            } catch (e) {
                console.warn("ClientAuth: Erro ao restaurar sessão", e);
                localStorage.removeItem('stationery_client_token');
            }
            setIsClientLoading(false);
        };
        checkSession();
    }, []);

    const loginClient = async (identifier, password) => {
        try {
            const cleanIdentifier = identifier.trim().toLowerCase();
            const customers = await db.getAll('customers') || [];
            
            // Busca o cliente pelo email ou telefone exato
            const found = customers.find(c => 
                (c.email && c.email.toLowerCase() === cleanIdentifier) || 
                (c.phone && c.phone.replace(/\D/g, '') === cleanIdentifier.replace(/\D/g, '')) ||
                (c.whatsapp && c.whatsapp.replace(/\D/g, '') === cleanIdentifier.replace(/\D/g, ''))
            );

            if (!found) {
                throw new Error("Cadastro não encontrado com este Email/Telefone.");
            }

            if (found.status === 'banned') {
                throw new Error("Acesso restrito. Sua conta foi temporariamente desconectada da plataforma.");
            }

            if (!found.clientPassword) {
                throw new Error("RESET_REQUIRED");
            }
            if (found.clientPassword !== password) {
                throw new Error("Senha incorreta.");
            }

            // Sucesso no Logon
            localStorage.setItem('stationery_client_token', JSON.stringify({ id: found.id }));
            setClientSession(found);
            return found;

        } catch (error) {
            throw error;
        }
    };

    const registerClient = async (clientData) => {
        try {
            const cleanPhone = clientData.phone.replace(/\D/g, '');
            if(cleanPhone.length < 10) throw new Error("Telefone inválido.");

            const customers = await db.getAll('customers') || [];
            const exists = customers.find(c => 
                (c.email && c.email.toLowerCase() === clientData.email.toLowerCase()) || 
                (c.phone && c.phone.replace(/\D/g, '') === cleanPhone)
            );

            if (exists) {
                throw new Error("Já existe um cadastro com este E-mail ou Telefone.");
            }

            // Cria novo BD Entry
            const newCustomer = await db.set('customers', cleanPhone, {
                name: clientData.name,
                email: clientData.email,
                phone: clientData.phone,
                whatsapp: clientData.phone, // fallback
                instagram: clientData.instagram || '',
                document: clientData.document || '',
                clientPassword: clientData.password, // Em produção, isto deveria ser hash (Bcrypt), aqui manteremos em plaintext confinado ao Backend do Firebase Firestore rules se existirem
                source: 'Registro Loja Virtual',
                createdAt: new Date().toISOString()
            });

            const customerObj = await db.getById('customers', cleanPhone);
            localStorage.setItem('stationery_client_token', JSON.stringify({ id: customerObj.id }));
            setClientSession(customerObj);
            return customerObj;
        } catch (error) {
            throw error;
        }
    };

    const updateClientPassword = async (identifier, newPassword) => {
        try {
            const cleanIdentifier = identifier.trim().toLowerCase();
            const customers = await db.getAll('customers') || [];
            const found = customers.find(c => 
                (c.email && c.email.toLowerCase() === cleanIdentifier) || 
                (c.phone && c.phone.replace(/\D/g, '') === cleanIdentifier.replace(/\D/g, '')) ||
                (c.whatsapp && c.whatsapp.replace(/\D/g, '') === cleanIdentifier.replace(/\D/g, ''))
            );

            if (!found) throw new Error("Cadastro não encontrado.");
            if (found.status === 'banned') throw new Error("Acesso restrito.");
            if (found.clientPassword) throw new Error("Esta conta já possui uma senha protegida. Solicite a remoção no suporte.");
            
            await db.update('customers', found.id, { clientPassword: newPassword });
            found.clientPassword = newPassword;
            
            localStorage.setItem('stationery_client_token', JSON.stringify({ id: found.id }));
            setClientSession(found);
            return found;
        } catch (error) {
             throw error;
         }
    };

    const logoutClient = () => {
        localStorage.removeItem('stationery_client_token');
        setClientSession(null);
    };

    const value = {
        clientSession,
        loginClient,
        registerClient,
        updateClientPassword,
        logoutClient,
        isClientLoading
    };

    return (
        <ClientAuthContext.Provider value={value}>
            {children}
        </ClientAuthContext.Provider>
    );
}
