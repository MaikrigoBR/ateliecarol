import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import db from '../services/database.js';

export function TimeGateGuard({ children }) {
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyAccess = async () => {
            try {
                // 1. Identificar o cargo do usuário local
                const localUserObj = localStorage.getItem('stationery_user');
                if (!localUserObj) {
                    setLoading(false);
                    return; 
                }

                const parsedUser = JSON.parse(localUserObj);
                if (!parsedUser.role) {
                    setLoading(false);
                    return;
                }

                // 2. Checar se o cargo exige bloqueio de horário (enforceWorkingHours)
                const allRoles = await db.getAll('roles');
                const userRoleData = allRoles.find(r => r.name.toLowerCase() === parsedUser.role.toLowerCase());

                if (!userRoleData || !userRoleData.enforceWorkingHours) {
                    setLoading(false);
                    return; // Sem bloqueio/restrição laboratorial para esta função
                }

                // 3. Obter os parâmetros gerais de expediente
                const settingsData = await db.getById('settings', 'business_hours');
                if (!settingsData || !settingsData.hours) {
                    setLoading(false);
                    return;
                }

                const businessHours = settingsData.hours;

                // 4. Calcular o tempo e dia atual real do sistema
                const now = new Date();
                const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const currentDayStr = days[now.getDay()];
                const dayConfig = businessHours[currentDayStr];

                if (!dayConfig || !dayConfig.active) {
                    // O dia atual não é de expediente
                    setIsBlocked(true);
                    setLoading(false);
                    return;
                }

                // Converte string 'HH:MM' para minutos do dia
                const toMins = (timeStr) => {
                    if (!timeStr) return 0;
                    const [h, m] = timeStr.split(':').map(Number);
                    return h * 60 + m;
                };

                const currentMins = now.getHours() * 60 + now.getMinutes();

                const startMins = toMins(dayConfig.start);
                const endMins = toMins(dayConfig.end);
                const lunchStartMins = toMins(dayConfig.lunchStart);
                const lunchEndMins = toMins(dayConfig.lunchEnd);

                let permitAcess = false;

                // Regras laborais simples
                if (currentMins >= startMins && currentMins <= endMins) {
                    permitAcess = true;
                    // Checa intervalo de almoço (Pausa Produtiva) se existir horário restrito de almoço
                    if (lunchStartMins > 0 && lunchEndMins > 0) {
                        if (currentMins >= lunchStartMins && currentMins < lunchEndMins) {
                            permitAcess = false; // Bloqueado no horário do almoço
                        }
                    }
                }

                setIsBlocked(!permitAcess);
                
            } catch (err) {
                console.error("Erro na verificação do Bloqueio Laboral", err);
            } finally {
                setLoading(false);
            }
        };

        verifyAccess();

        // Opcional: checar a cada ~5 minutos para deslogar ativos intrusos no meio do uso
        const intervalId = setInterval(verifyAccess, 1000 * 60 * 5);
        return () => clearInterval(intervalId);

    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin text-primary"><Clock size={40} /></div>
            </div>
        );
    }

    if (isBlocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 animate-fade-in text-center">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full">
                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 shadow-inner">
                            <ShieldAlert size={40} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
                    <p className="text-gray-500 mb-6 leading-relaxed">
                        Seu cargo atual não possue permissão de acesso ao sistema fora do horário padrão de Expediente da empresa (incluindo pausas).
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6 flex items-center justify-center gap-2 text-sm text-gray-600 font-medium">
                        <Clock size={16} /> Horário Bloqueado. Volte mais tarde.
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
