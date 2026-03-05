import React, { useState } from 'react';
import db from '../services/database.js';
import { Hammer, CheckCircle, AlertTriangle } from 'lucide-react';

export function EquipmentMigration() {
    const [status, setStatus] = useState('idle'); // idle, running, success, error
    const [logs, setLogs] = useState([]);
    
    const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const runMigration = async () => {
        if (!window.confirm('Iniciar a migração na nuvem? Essa ação não pode ser desfeita.')) return;
        
        setStatus('running');
        setLogs([]);
        addLog('Iniciando migração de equipamentos...');

        try {
            // 1. Fetch all items from old inventory
            addLog('Buscando inventário atual no Firebase...');
            const allInventory = await db.getAll('inventory');
            
            if (!allInventory || allInventory.length === 0) {
                addLog('Nenhum item encontrado no inventário.');
                setStatus('success');
                return;
            }

            // 2. Filter out equipments
            const oldEquipments = allInventory.filter(item => item.type === 'equipment');
            addLog(`Encontrados ${oldEquipments.length} equipamentos para migrar.`);

            if (oldEquipments.length === 0) {
                addLog('Migração concluída: Não há equipamentos na base antiga.');
                setStatus('success');
                return;
            }

            // 3. Loop and migrate each one
            let migratedCount = 0;
            let errorCount = 0;

            for (const equip of oldEquipments) {
                try {
                    addLog(`Migrando de inventory -> equipments: ${equip.name}`);
                    
                    // Creates the new equip in the 'equipments' table matching the new Schema
                    const newPayload = {
                        name: equip.name || 'Equipamento Sem Nome',
                        brand: equip.manufacturer || equip.model || '',
                        purchaseDate: equip.purchaseDate || new Date().toISOString().split('T')[0],
                        purchasePrice: parseFloat(equip.value) || parseFloat(equip.cost) || 0,
                        lifespanMonths: 60, // Default fallback
                        monthlyHours: 160,  // Default fallback
                        status: 'Ativo',
                        maintenanceHistory: [],
                        migratedFromId: equip.id // Traceability
                    };

                    await db.create('equipments', newPayload);
                    
                    // Delete from old inventory
                    await db.delete('inventory', equip.id);
                    
                    migratedCount++;
                    addLog(`  ✅ Sucesso: ${equip.name}`);
                } catch (err) {
                    errorCount++;
                    addLog(`  ❌ Erro ao migrar ${equip.name}: ${err.message}`);
                }
            }

            addLog(`===============================`);
            addLog(`Migração finalizada!`);
            addLog(`Total sucesso: ${migratedCount}`);
            addLog(`Total erros: ${errorCount}`);
            
            setStatus(errorCount === 0 ? 'success' : 'error');

        } catch (error) {
            console.error(error);
            addLog(`Erro Crítico na Migração: ${error.message}`);
            setStatus('error');
        }
    };

    return (
        <div className="card max-w-2xl mx-auto mt-8">
            <div className="card-header bg-rose-50 border-b border-rose-100">
                <div>
                    <h3 className="card-title text-rose-800 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        Console de Migração do Banco de Dados
                    </h3>
                    <p className="text-sm text-rose-600 mt-1">Ferramenta restrita de injeção de dados. Move as máquinas da tabela `inventory` para `equipments`.</p>
                </div>
            </div>
            
            <div className="p-6">
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm h-64 overflow-y-auto w-full mb-6">
                    {logs.length === 0 ? (
                        <div className="text-slate-500 italic">Aguardando início do script...</div>
                    ) : (
                        logs.map((log, idx) => (
                            <div key={idx} className={log.includes('Erro') || log.includes('❌') ? 'text-rose-400' : 'text-emerald-400'}>
                                {log}
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <div className="text-sm text-slate-500">
                        {status === 'running' && 'Processando. Não feche a aba.'}
                        {status === 'success' && <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={16}/> Concluído com Segurança.</span>}
                        {status === 'error' && <span className="text-rose-600 font-bold">Concluído com falhas (Ver log).</span>}
                    </div>

                    <button 
                        className="btn btn-primary"
                        style={{ backgroundColor: '#e11d48', borderColor: '#e11d48' }}
                        onClick={runMigration}
                        disabled={status === 'running'}
                    >
                        <Hammer size={16} /> 
                        {status === 'running' ? 'Migrando Nuvem...' : 'Executar Script de Migração'}
                    </button>
                </div>
            </div>
        </div>
    );
}
