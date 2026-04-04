import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, CloudRain, Trash2, ArrowRightLeft, Landmark, PieChart, CreditCard, Zap, Scissors, PlusCircle } from 'lucide-react';
import { BankFileParserService } from '../services/BankFileParserService';
import { formatCurrency, getInvoiceMonth } from '../utils/financeUtils';
import db from '../services/database';

export function FinanceBankImport({ accounts, existingTransactions, orders, onImportSuccess, categories = [], equipments = [], materials = [] }) {
    const [importMode, setImportMode] = useState('file'); // 'file' or 'text'
    const [stagedTransactions, setStagedTransactions] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [rawTextInput, setRawTextInput] = useState('');
    const [importStats, setImportStats] = useState({ total: 0, duplicates: 0, totalAmount: 0 });
    const [selectedAccountId, setSelectedAccountId] = useState(accounts.find(a => a.type !== 'credit')?.id || '');
    const fileInputRef = useRef(null);

    const getHistoricalCategory = (description) => {
        if (!existingTransactions || existingTransactions.length === 0) return null;
        const search = description.toLowerCase().trim();
        const matches = existingTransactions.filter(et => 
            et.description.toLowerCase().trim() === search && et.category && et.category !== 'Outros'
        );
        if (matches.length === 0) return null;
        
        const counts = matches.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1;
            return acc;
        }, {});
        
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    };

    const processParsedResults = (parsed) => {
        if (parsed.length === 0) {
            alert('Aviso: Nenhuma transação válida foi encontrada. Verifique o formato do texto ou arquivo.');
            setIsParsing(false);
            return;
        }

        const selectedAcc = accounts.find(a => String(a.id) === String(selectedAccountId));

        // Detect duplicates & matches
        const localParsedSeen = new Set();
        const withMeta = parsed.map(nt => {
            const fingerprint = nt.rawId || `${nt.date}-${nt.amount}-${nt.description.toLowerCase().trim()}`;
            
            // 1. Check against DB
            const isInDB = existingTransactions.some(et => 
                (et.bankReferenceId === nt.rawId && nt.rawId) || 
                (et.date === nt.date && 
                 Math.abs(Number(et.amount)) === Math.abs(Number(nt.amount)) &&
                 String(et.accountId) === String(selectedAccountId) &&
                 et.description.toLowerCase().trim() === nt.description.toLowerCase().trim()) ||
                (et.installment === nt.installment && et.description === nt.description && String(et.accountId) === String(selectedAccountId))
            );

            // 2. Check against this same batch
            const isLocalDuplicate = localParsedSeen.has(fingerprint);
            localParsedSeen.add(fingerprint);

            const isDuplicate = isInDB || isLocalDuplicate;

            // Suggested Match (Pending transactions or Orders)
            let suggestedMatch = null;
            if (!isDuplicate) {
                const transMatch = existingTransactions.find(et => 
                    et.description === nt.description &&
                    Math.abs(Number(et.amount)) === Math.abs(Number(nt.amount)) &&
                    (et.status === 'pending' || et.source === 'projection')
                );
                if (transMatch) suggestedMatch = { type: 'transaction', item: transMatch };

                if (!transMatch && nt.type === 'income') {
                    const orderMatch = orders.find(o => 
                        o.paymentStatus === 'pending' && 
                        Math.abs(Number(o.total)) === Math.abs(nt.amount)
                    );
                    if (orderMatch) suggestedMatch = { type: 'order', item: orderMatch };
                }
            }

            // --- AUTO-VINCULO COM ATIVOS/INSUMOS (FUZZY MULTI-MATCH) ---
            let detectedItems = [];
            const desc = (nt.description || '').toLowerCase();
            const descParts = desc.split(/[* \-\/]/).filter(p => p.length > 3);

            // Scan Equipments
            equipments.forEach(e => {
                const name = e.name.toLowerCase();
                const brand = (e.brand || '').toLowerCase();
                if (desc.includes(name) || name.includes(desc) || (brand && desc.includes(brand)) || descParts.some(p => name.includes(p))) {
                    if (!detectedItems.find(di => di.id === e.id)) {
                        detectedItems.push({ type: 'equipment', id: e.id, name: e.name, cost: parseFloat(e.cost || e.purchasePrice || 0) });
                    }
                }
            });

            // Scan Materials
            materials.forEach(m => {
                const name = m.name.toLowerCase();
                const cat = (m.category || '').toLowerCase();
                if (desc.includes(name) || name.includes(desc) || (cat && desc.includes(cat)) || descParts.some(p => name.includes(p))) {
                    if (!detectedItems.find(di => di.id === m.id)) {
                        detectedItems.push({ type: 'material', id: m.id, name: m.name, cost: parseFloat(m.cost || m.price || 0) });
                    }
                }
            });

            let suggestedLink = detectedItems.length === 1 ? detectedItems[0] : null;
            let isCompound = detectedItems.length > 1;

            // --- AUTO-CONCILIÇÃO DE TRANSFERÊNCIA/CARTÃO ---
            let targetAccountId = null;
            let finalCategory = nt.category;
            let isAISuggested = !!nt.isAISuggested;

            if (nt.type === 'expense' && (nt.category === 'Pagamento de Fatura' || desc.includes('pagamento fatura') || desc.includes('pagamento nubank') || desc.includes('pagamento mercado pago') || desc.includes('pagamento cartao'))) {
                const targetCard = accounts.find(a => a.type === 'credit' && (desc.includes(a.name.toLowerCase()) || (a.bank && desc.includes(a.bank.toLowerCase())) || (selectedAcc?.bank && a.bank && selectedAcc.bank.toLowerCase() === a.bank.toLowerCase())));
                if (targetCard) targetAccountId = targetCard.id;
                finalCategory = 'Pagamento de Fatura';
                isAISuggested = true;
            }

            if (!isAISuggested || finalCategory === 'Outros' || finalCategory === 'Geral') {
                const historyCat = getHistoricalCategory(nt.description);
                if (historyCat) {
                    finalCategory = historyCat;
                    isAISuggested = true;
                }
            }

            return { ...nt, category: finalCategory, isAISuggested, isDuplicate, suggestedMatch, suggestedLink, detectedItems, isCompound, targetAccountId };
        });

        // --- EXPANSÃO PROATIVA DE PARCELAS E COMPOSIÇÕES ---
        const expanded = [];
        withMeta.forEach(main => {
            if (main.isCompound && !main.isDuplicate) {
                // Sugerir desmembramento automático por itens detectados
                let totalCostDetected = main.detectedItems.reduce((s, it) => s + it.cost, 0);
                let residual = main.amount - totalCostDetected;

                main.detectedItems.forEach((it, idx) => {
                    expanded.push({
                        ...main,
                        id: `${main.id}-comp-${idx}`,
                        amount: it.cost || (main.amount / (main.detectedItems.length + (residual > 0 ? 1 : 0))).toFixed(2),
                        description: `${main.description} / ${it.name}`,
                        suggestedLink: { type: it.type, id: it.id, name: it.name },
                        category: it.type === 'equipment' ? 'Equipamentos & Ativos' : 'Materiais & Insumos',
                        isSplit: true,
                        splitGroup: main.id,
                        parentAmount: main.amount,
                        selected: true
                    });
                });

                if (residual > 0.01) {
                    expanded.push({
                        ...main,
                        id: `${main.id}-residual`,
                        amount: parseFloat(residual.toFixed(2)),
                        description: `${main.description} (Resíduo/Taxas)`,
                        category: 'Impostos & Taxas',
                        isSplit: true,
                        splitGroup: main.id,
                        parentAmount: main.amount,
                        selected: true
                    });
                }
            } else {
                expanded.push({ ...main, selected: !main.isDuplicate });
            }
            
            // ... (rest of the installment expansion logic)
            // Se detectarmos parcelamento (ex: 3/10)
            if (main.installmentNumber && main.installmentsTotal > 1 && !main.isDuplicate) {
                for (let i = 1; i <= main.installmentsTotal; i++) {
                    if (i === main.installmentNumber) continue; // Pular a atual

                    const parcelKey = `${i}/${main.installmentsTotal}`;
                    // Verificar se essa parcela específica já existe no DB
                    const alreadyExists = existingTransactions.some(et => 
                        et.description === main.description && 
                        et.installment === parcelKey &&
                        String(et.accountId) === String(selectedAccountId)
                    );

                    if (!alreadyExists) {
                        const dateObj = new Date(main.date + 'T12:00:00');
                        dateObj.setMonth(dateObj.getMonth() + (i - main.installmentNumber));
                        
                        expanded.push({
                            ...main,
                            id: `${main.id}-proj-${i}`,
                            date: dateObj.toISOString().split('T')[0],
                            installment: parcelKey,
                            installmentNumber: i,
                            isDuplicate: false,
                            isProjected: true,
                            source: 'projection',
                            status: i < main.installmentNumber ? 'paid' : 'pending',
                            selected: true // Por padrão, selecionamos para criar o histórico/futuro
                        });
                    }
                }
            }
        });
        
        const stats = {
            total: expanded.length,
            duplicates: expanded.filter(t => t.isDuplicate).length,
            totalAmount: expanded.reduce((s, t) => s + Number(t.amount || 0), 0)
        };

        setStagedTransactions(expanded);
        setImportStats(stats);
        setIsParsing(false);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsParsing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result;
            let parsed = [];
            
            const selectedAcc = accounts.find(a => String(a.id) === String(selectedAccountId));

            if (file.name.endsWith('.ofx')) {
                parsed = BankFileParserService.parseOFX(content, selectedAcc);
            } else if (file.name.endsWith('.csv')) {
                parsed = BankFileParserService.parseCSV(content, selectedAcc);
            }

            processParsedResults(parsed);
        };
        reader.readAsText(file);
    };

    const handleRawTextImport = () => {
        if (!rawTextInput.trim()) return;
        setIsParsing(true);
        const selectedAcc = accounts.find(a => String(a.id) === String(selectedAccountId));
        const parsed = BankFileParserService.parseRawText(rawTextInput, selectedAcc);
        processParsedResults(parsed);
    };

    const handleSaveImport = async () => {
        const toProcess = stagedTransactions.filter(t => t.selected);
        if (toProcess.length === 0) return alert('Selecione ao menos um novo lançamento para importar.');

        const duplicatesCount = toProcess.filter(t => t.isDuplicate).length;
        if (duplicatesCount > 0) {
            if (!confirm(`Atenção: Você selecionou ${duplicatesCount} lançamentos marcados como duplicados. Deseja realmente prosseguir?`)) return;
        }

        // --- VALIDAÇÃO DE INTEGRIDADE MATEMÁTICA (SPLIT AUDITOR) ---
        const splitRows = stagedTransactions.filter(t => t.selected && t.isSplit);
        if (splitRows.length > 0) {
            const grouped = {};
            splitRows.forEach(t => {
                const pId = t.splitGroup || t.id.split('-')[0];
                if (!grouped[pId]) grouped[pId] = { sum: 0, target: t.parentAmount, desc: t.description.split(' (Dividido')[0] };
                grouped[pId].sum += Number(t.amount);
            });
            for (const [pId, data] of Object.entries(grouped)) {
                if (Math.abs(data.sum - data.target) > 0.01) {
                    return alert(`🛑 ERRO DE AUDITORIA NO SPLIT:\n\nNo registro "${data.desc}", a soma dos desmembramentos é R$ ${data.sum.toFixed(2)}, mas o valor original é R$ ${data.target.toFixed(2)}.\n\nPor favor, ajuste os valores para que a soma seja ZERO ou igual ao valor original.`);
                }
            }
        }

        try {
            setIsParsing(true);
            const selectedAcc = accounts.find(a => String(a.id) === String(selectedAccountId));
            const isCreditCard = selectedAcc?.type === 'credit';
            const updatedPaidInvoices = isCreditCard ? [...(selectedAcc.paidInvoices || [])] : [];
            let accountHasChanged = false;

            const promises = toProcess.map(async (t) => {
                const isMatch = !!t.suggestedMatch;

                // --- 1. LANÇAMENTO NA CONTA DE ORIGEM (EXTRATO) ---
                if (isMatch && t.suggestedMatch.type === 'transaction') {
                    await db.update('transactions', t.suggestedMatch.item.id, {
                        status: 'paid', paidDate: t.date, bankReferenceId: t.rawId, updatedAt: new Date().toISOString()
                    });
                } else if (isMatch && t.suggestedMatch.type === 'order') {
                    await db.update('orders', t.suggestedMatch.item.id, {
                        paymentStatus: 'paid', paymentDate: t.date, updatedAt: new Date().toISOString()
                    });
                    await db.create('transactions', {
                        accountId: selectedAccountId, amount: t.amount, type: 'income', category: 'Vendas de Produtos',
                        description: `Liquidação Pedido #${t.suggestedMatch.item.id.slice(-4)} - ${t.suggestedMatch.item.clientName || 'Cliente'}`,
                        date: t.date, status: 'paid', bankReferenceId: t.rawId
                    });
                } else {
                    await db.create('transactions', {
                        accountId: selectedAccountId, amount: t.amount, type: t.type, category: t.category || 'Geral', description: t.description,
                        installment: t.installment || null,
                        date: t.date,
                        status: t.status || 'paid',
                        bankReferenceId: t.rawId,
                        linkedItemId: t.suggestedLink?.id || null,
                        linkedItemType: t.suggestedLink?.type || null,
                        createdAt: new Date().toISOString(),
                        source: t.source || 'bank_import'
                    });
                }

                // --- 2. LANÇAMENTO ESPELHADO (CONTA DE DESTINO) ---
                if (t.targetAccountId) {
                    const targetAcc = accounts.find(a => String(a.id) === String(t.targetAccountId));
                    await db.create('transactions', {
                        accountId: t.targetAccountId, amount: Math.abs(t.amount), type: 'income', category: 'Pagamento de Fatura',
                        description: `Transf. de ${selectedAcc?.name || 'Origem'} (Pgto Fatura)`,
                        date: t.date, status: 'paid', bankReferenceId: `TRF-${t.rawId || t.id}`
                    });

                    if (targetAcc?.type === 'credit') {
                        const processedCloseDay = Number(targetAcc.closeDay || 3);
                        let invoiceMonth = getInvoiceMonth(t.date, processedCloseDay);
                        if (Number(t.date.split('-')[2]) <= 15) {
                            invoiceMonth = new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() - 1, 1);
                        }
                        const monthKey = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;
                        const currentPaid = [...(targetAcc.paidInvoices || [])];
                        if (!currentPaid.includes(monthKey)) {
                            await db.update('accounts', targetAcc.id, { paidInvoices: [...currentPaid, monthKey], updatedAt: new Date().toISOString() });
                        }
                    }
                }

                // --- 3. AUTO-QUITAÇÃO (CONTA ATUAL) ---
                if (isCreditCard && t.type === 'income' && (t.category === 'Pagamento de Fatura' || t.description.toLowerCase().includes('pagamento fatura'))) {
                    const processedCloseDay = Number(selectedAcc.closeDay || 3);
                    let invoiceMonth = getInvoiceMonth(t.date, processedCloseDay);
                    if (Number(t.date.split('-')[2]) <= 15) {
                        invoiceMonth = new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() - 1, 1);
                    }
                    const monthKey = `${invoiceMonth.getFullYear()}-${String(invoiceMonth.getMonth() + 1).padStart(2, '0')}`;
                    if (!updatedPaidInvoices.includes(monthKey)) {
                        updatedPaidInvoices.push(monthKey);
                        accountHasChanged = true;
                    }
                }
            });

            await Promise.all(promises);

            // Se houve quitação, salvar no registro da conta
            if (isCreditCard && accountHasChanged) {
                await db.update('accounts', selectedAccountId, {
                    paidInvoices: updatedPaidInvoices,
                    updatedAt: new Date().toISOString()
                });
            }

            onImportSuccess(toProcess.length);
            setStagedTransactions([]);
            alert(`${toProcess.length} lançamentos processados com sucesso!`);
        } catch (err) {
            console.error('Import Error:', err);
            alert('Erro na importação: ' + err.message);
        } finally {
            setIsParsing(false);
        }
    };

    const removeStagedRow = (id) => {
        setStagedTransactions(stagedTransactions.filter(t => t.id !== id));
    };

    const splitTransaction = (id) => {
        setStagedTransactions(prev => {
            const original = prev.find(t => t.id === id);
            if (!original) return prev;
            
            const halfAmount = (parseFloat(original.amount) / 2).toFixed(2);
            const parentId = original.splitGroup || original.id;
            
            const sub1 = { 
                ...original, 
                id: `${id}-1`, 
                amount: parseFloat(halfAmount), 
                isSplit: true, 
                splitGroup: parentId, 
                parentAmount: original.parentAmount || original.amount,
                selected: true 
            };
            const sub2 = { 
                ...original, 
                id: `${id}-2`, 
                amount: parseFloat(halfAmount), 
                isSplit: true, 
                splitGroup: parentId, 
                parentAmount: original.parentAmount || original.amount,
                selected: true 
            };
            
            return prev.filter(t => t.id !== id).concat([sub1, sub2]);
        });
    };

    const getSplitBalance = (splitGroupId) => {
        const group = stagedTransactions.filter(t => t.splitGroup === splitGroupId && t.selected);
        if (group.length === 0) return 0;
        const parentAmount = group[0].parentAmount;
        const currentTotal = group.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        return (parentAmount - currentTotal).toFixed(2);
    };

    const updateStagedRow = (id, updates) => {
        setStagedTransactions(prev => {
            const current = prev.find(t => t.id === id);
            const newList = prev.map(t => t.id === id ? { ...t, ...updates } : t);
            
            // Se o usuário alterou a categoria manualmente, oferecer para propagar para descrições idênticas
            if (updates.category && current && !updates._bulkPropagated) {
                const standardizedDesc = current.description.toLowerCase().trim();
                const similarCount = newList.filter(t => 
                    t.id !== id && 
                    t.description.toLowerCase().trim() === standardizedDesc && 
                    t.category !== updates.category
                ).length;

                if (similarCount > 0) {
                    if (confirm(`Encontramos mais ${similarCount} lançamentos idênticos. Aplicar "${updates.category}" para todos eles?`)) {
                        return newList.map(t => 
                            t.description.toLowerCase().trim() === standardizedDesc 
                            ? { ...t, category: updates.category, isAISuggested: false } 
                            : t
                        );
                    }
                }
            }
            return newList;
        });
    };

    return (
        <div className="section-container animate-fade-in" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '1.5rem', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '12px', width: 'fit-content', margin: '0 auto' }}>
                    <button 
                        onClick={() => setImportMode('file')}
                        className={importMode === 'file' ? 'bg-white shadow-sm' : ''}
                        style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 800, color: importMode === 'file' ? '#1e293b' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        Arquivos (OFX/CSV)
                    </button>
                    <button 
                        onClick={() => setImportMode('text')}
                        className={importMode === 'text' ? 'bg-white shadow-sm' : 'text-slate-500'}
                        style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 800, color: importMode === 'text' ? '#1e293b' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        Colar Texto (Mágico)
                    </button>
                </div>

                {importMode === 'file' ? (
                    <>
                        <CloudRain size={48} className="text-blue-500 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-black text-slate-800">IA Bank Importer</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Exportação oficial do banco em **OFX** ou **CSV**.
                        </p>
                    </>
                ) : (
                    <>
                        <FileText size={48} className="text-purple-500 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-black text-slate-800">Seletor Mágico</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Copie a lista de compras da tela do banco e cole abaixo.
                        </p>
                    </>
                )}

                <div className="flex flex-col gap-6 items-center">
                    <div className="flex justify-center gap-4 items-center">
                        <div className="flex flex-col items-start text-left">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Destinar à Conta:</label>
                            <select 
                                className="form-input" 
                                style={{ 
                                    backgroundColor: 'white', 
                                    fontWeight: 700, 
                                    minWidth: '200px',
                                    border: accounts.find(a => String(a.id) === String(selectedAccountId))?.type === 'credit' ? '2px solid #8b5cf6' : '1px solid var(--border)'
                                }}
                                value={selectedAccountId}
                                onChange={e => setSelectedAccountId(e.target.value)}
                            >
                                <option value="" disabled>Selecione o destino...</option>
                                <optgroup label="Contas Correntes">
                                    {accounts.filter(a => a.type !== 'credit').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </optgroup>
                                <optgroup label="Cartões de Crédito">
                                    {accounts.filter(a => a.type === 'credit').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </optgroup>
                            </select>
                            {accounts.find(a => String(a.id) === String(selectedAccountId))?.type === 'credit' && (
                                <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CreditCard size={12} /> ESTE EXTRATO IRÁ PARA O CARTÃO: {accounts.find(a => String(a.id) === String(selectedAccountId))?.name}
                                </div>
                            )}
                        </div>

                        {importMode === 'file' ? (
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="btn btn-primary"
                                style={{ height: '45px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2rem' }}
                            >
                                <Upload size={20} /> Selecionar Arquivo
                            </button>
                        ) : (
                            <button 
                                onClick={handleRawTextImport}
                                className="btn btn-primary"
                                style={{ height: '45px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 2rem', backgroundColor: '#7c3aed' }}
                            >
                                <ArrowRightLeft size={20} /> Processar Texto
                            </button>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept=".ofx,.csv" 
                            onChange={handleFileUpload} 
                        />
                    </div>

                    {importMode === 'text' && (
                        <textarea 
                            className="form-input w-full max-w-xl"
                            placeholder="Ex: 02/10 Restaurante Sabor R$ 45,00..."
                            style={{ height: '120px', fontSize: '0.85rem', fontFamily: 'monospace', padding: '1rem', background: '#fff', borderRadius: '12px' }}
                            value={rawTextInput}
                            onChange={e => setRawTextInput(e.target.value)}
                        />
                    )}
                </div>
            </div>
            {/* Content: Audit & Review */}
            {stagedTransactions.length > 0 ? (
                <div style={{ padding: '1.5rem' }}>
                    <div className="flex justify-between items-end mb-6">
                        <div className="flex gap-6">
                            <div className="text-center">
                                <span className="block text-[0.65rem] font-bold text-slate-400 uppercase">Processados</span>
                                <span className="text-xl font-black text-slate-800">{importStats.total}</span>
                            </div>
                            <div className="text-center px-6 border-x border-slate-100">
                                <span className="block text-[0.65rem] font-bold text-slate-400 uppercase">Duplicidade Identificada</span>
                                <span className="text-xl font-black text-red-500">{importStats.duplicates}</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[0.65rem] font-bold text-slate-400 uppercase">Volume Mapeado</span>
                                <span className="text-xl font-black text-blue-600">R$ {formatCurrency(importStats.totalAmount)}</span>
                            </div>
                        </div>

                        <button 
                            className="btn btn-primary"
                            onClick={handleSaveImport}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#10b981' }}
                        >
                            <CheckCircle size={20} /> Confirmar Importação ({stagedTransactions.filter(t => t.selected).length})
                        </button>
                    </div>

                    <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '16px', textAlign: 'center', width: '40px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={stagedTransactions.length > 0 && stagedTransactions.every(t => t.selected)}
                                            onChange={(e) => setStagedTransactions(stagedTransactions.map(t => ({ ...t, selected: e.target.checked })))}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                                        />
                                    </th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Status / Auditoria</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Data</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Descrição Expandida</th>
                                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Parcela</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Categorização</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Transferir Para (Destino)</th>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Vínculo Ativo</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }}>Valor</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedTransactions.map(t => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: t.isDuplicate && !t.selected ? 0.5 : 1, backgroundColor: t.isDuplicate ? '#fff7ed' : (t.selected ? '#f0fdf4' : 'transparent') }}>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={t.selected} 
                                                onChange={(e) => updateStagedRow(t.id, { selected: e.target.checked })}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {t.isProjected ? (
                                                <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[10px] uppercase">
                                                    <Zap size={12} fill="#6366f1" /> Projeção Inteligente
                                                </div>
                                            ) : t.isDuplicate ? (
                                                <div className="flex items-center gap-1.5 text-orange-600 font-bold text-[10px] uppercase">
                                                    <AlertTriangle size={12} /> Bloquear Duplicidade
                                                </div>
                                            ) : t.suggestedMatch ? (
                                                <div className={`flex items-center gap-1.5 ${t.suggestedMatch.type === 'order' ? 'text-blue-600' : 'text-purple-600'} font-bold text-[10px] uppercase`}>
                                                    <ArrowRightLeft size={12} /> {t.suggestedMatch.type === 'order' ? 'Liquidar Pedido' : 'Sugerir Conciliação'}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
                                                    <CheckCircle size={12} /> Novo Lançamento
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: 600, fontSize: '0.8rem', color: '#64748b' }}>
                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div className="flex items-center gap-2">
                                                    {t.isProjected && <span style={{ padding: '2px 6px', backgroundColor: '#eef2ff', color: '#6366f1', borderRadius: '4px', fontSize: '9px', fontWeight: 900 }}>PROJEÇÃO</span>}
                                                    {t.isCompound && <span style={{ padding: '2px 6px', backgroundColor: '#fdf2f2', color: '#ef4444', borderRadius: '4px', fontSize: '9px', fontWeight: 900 }}>COMPOSIÇÃO</span>}
                                                    <input 
                                                        type="text"
                                                        value={t.description}
                                                        onChange={(e) => updateStagedRow(t.id, { description: e.target.value })}
                                                        style={{ 
                                                            width: '100%', border: 'none', background: 'transparent', 
                                                            fontWeight: 900, color: t.isProjected ? '#6366f1' : (t.isCompound ? '#ef4444' : '#0f172a'), fontSize: '1rem',
                                                            padding: '4px 8px', borderRadius: '4px',
                                                            borderBottom: '1px dashed #e2e8f0'
                                                        }}
                                                        className="hover:bg-slate-50 focus:bg-white focus:ring-0 focus:border-primary"
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-2 items-center px-2">
                                                    {t.splitGroup && (
                                                        <div style={{ 
                                                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 900,
                                                            backgroundColor: parseFloat(getSplitBalance(t.splitGroup)) === 0 ? '#ecfdf5' : '#fff7ed',
                                                            color: parseFloat(getSplitBalance(t.splitGroup)) === 0 ? '#059669' : '#d97706',
                                                            border: `1px solid ${parseFloat(getSplitBalance(t.splitGroup)) === 0 ? '#10b981' : '#f59e0b'}`
                                                        }}>
                                                            {parseFloat(getSplitBalance(t.splitGroup)) === 0 
                                                                ? '✓ DIVISÃO BALANCEADA' 
                                                                : `⚠️ FALTAM R$ ${getSplitBalance(t.splitGroup)}`}
                                                        </div>
                                                    )}
                                                    {t.isCompound && (
                                                        <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 900, marginTop: '4px' }}>
                                                             Múltiplos itens detectados: {t.detectedItems.map(it => it.name).join(', ')}
                                                        </div>
                                                    )}
                                                    {t.installment && (
                                                        <span style={{ 
                                                            fontSize: '10px', fontWeight: 900, color: 'white', 
                                                            backgroundColor: '#7c3aed', padding: '2px 10px', 
                                                            borderRadius: '9999px', textTransform: 'uppercase', 
                                                            letterSpacing: '0.05em', display: 'inline-flex', 
                                                            alignItems: 'center', gap: '3px',
                                                            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)'
                                                        }}>
                                                            <CreditCard size={10} /> PARC. {t.installment}
                                                        </span>
                                                    )}
                                                    {t.isAISuggested && (
                                                        <span style={{ 
                                                            fontSize: '9px', fontWeight: 900, color: '#10b981', 
                                                            backgroundColor: '#ecfdf5', padding: '2px 8px', 
                                                            borderRadius: '4px', textTransform: 'uppercase', 
                                                            display: 'inline-flex', alignItems: 'center', gap: '2px',
                                                            border: '1px solid #d1fae5'
                                                        }}>
                                                            <Zap size={10} fill="#10b981" /> Sugestão Automatizada
                                                        </span>
                                                    )}
                                                    {t.suggestedMatch && (
                                                        <div style={{ fontSize: '10px', color: t.suggestedMatch.type === 'order' ? '#2563eb' : '#7c3aed', fontWeight: 900 }}>
                                                            ↳ Vincular: {t.suggestedMatch.type === 'order' ? `Pedido de ${t.suggestedMatch.item.clientName}` : `${t.suggestedMatch.item.description}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <input 
                                                type="text"
                                                placeholder="ex: 1/12"
                                                value={t.installment || ''}
                                                onChange={(e) => updateStagedRow(t.id, { installment: e.target.value })}
                                                style={{ 
                                                    width: '60px', border: '1px solid #e2e8f0', background: t.installment ? '#f5f3ff' : 'transparent', 
                                                    textAlign: 'center', fontWeight: 900, color: '#7c3aed', fontSize: '0.8rem',
                                                    padding: '4px 0', borderRadius: '6px'
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div className="flex flex-col gap-2">
                                                <select 
                                                    value={t.category}
                                                    onChange={(e) => updateStagedRow(t.id, { category: e.target.value, isAISuggested: false })}
                                                    style={{ 
                                                        backgroundColor: t.isAISuggested ? '#ecfdf5' : '#f8fafc',
                                                        color: t.isAISuggested ? '#065f46' : '#334155',
                                                        padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, 
                                                        border: t.isAISuggested ? '1px solid #10b981' : '1px solid #e2e8f0',
                                                        cursor: 'pointer', outline: 'none', width: '100%',
                                                        boxShadow: t.isAISuggested ? '0 0 0 2px rgba(16, 185, 129, 0.1)' : 'none'
                                                    }}
                                                >
                                                    <option value="Outros">Escolher Categoria...</option>
                                                    <optgroup label="Minhas Categorias">
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                        ))}
                                                        {!categories.length && <option disabled>Nenhuma categoria personalizada</option>}
                                                    </optgroup>
                                                    <optgroup label="Despesas Padrão">
                                                        <option value="Administrativo / Fixos">Administrativo / Fixos</option>
                                                        <option value="Materiais & Insumos">Materiais & Insumos</option>
                                                        <option value="Marketing & Vendas">Marketing & Vendas</option>
                                                        <option value="Impostos & Taxas">Impostos & Taxas</option>
                                                        <option value="Logística & Frete">Logística & Frete</option>
                                                        <option value="Pessoal & RH">Pessoal & RH</option>
                                                        <option value="Equipamentos & Ativos">Equipamentos & Ativos</option>
                                                        <option value="Pagamento de Fatura">Pagamento de Fatura</option>
                                                        <option value="Outros">Outros</option>
                                                    </optgroup>
                                                    <optgroup label="Receitas Padrão">
                                                        <option value="Vendas de Produtos">Vendas de Produtos</option>
                                                        <option value="Serviços Prestados">Serviços Prestados</option>
                                                        <option value="Aporte / Investimento">Aporte / Investimento</option>
                                                        <option value="Estorno / Ajuste">Estorno / Ajuste</option>
                                                    </optgroup>
                                                </select>
                                                <button 
                                                    onClick={() => {
                                                        const term = prompt('Buscar item no catálogo (Equipamento ou Material):');
                                                        if (term) {
                                                            const eq = equipments.find(e => e.name.toLowerCase().includes(term.toLowerCase()));
                                                            const mt = materials.find(m => m.name.toLowerCase().includes(term.toLowerCase()));
                                                            const found = eq || mt;
                                                            if (found) {
                                                                const itemPrice = parseFloat(found.cost || found.price || found.purchasePrice || 0);
                                                                updateStagedRow(t.id, { 
                                                                    description: `${t.description.split(' / ')[0]} / ${found.name}`,
                                                                    suggestedLink: { type: eq ? 'equipment' : 'material', id: found.id, name: found.name },
                                                                    category: eq ? 'Equipamentos & Ativos' : 'Materiais & Insumos',
                                                                    amount: itemPrice > 0 ? itemPrice : t.amount
                                                                });
                                                            } else {
                                                                alert('Item não encontrado no catálogo.');
                                                            }
                                                        }
                                                    }}
                                                    style={{ 
                                                        fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', 
                                                        borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 900, cursor: 'pointer'
                                                    }}
                                                >
                                                    + VINCULAR ITEM
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <select 
                                                value={t.targetAccountId || ''}
                                                onChange={(e) => updateStagedRow(t.id, { targetAccountId: e.target.value })}
                                                style={{ 
                                                    backgroundColor: t.targetAccountId ? '#eff6ff' : '#f8fafc',
                                                    color: t.targetAccountId ? '#1e40af' : '#64748b',
                                                    padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800, 
                                                    border: t.targetAccountId ? '1px solid #3b82f6' : '1px dotted #cbd5e1',
                                                    cursor: 'pointer', outline: 'none', width: '100%'
                                                }}
                                            >
                                                <option value="">Nenhum (Despesa Comum)</option>
                                                {accounts.filter(a => String(a.id) !== String(selectedAccountId)).map(a => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.type === 'credit' ? '💳' : '🏦'} {a.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '12px 16px', minWidth: '180px' }}>
                                            <div className="flex flex-col gap-1">
                                                <select
                                                    value={t.suggestedLink?.id || ''}
                                                    onChange={(e) => {
                                                        const id = e.target.value;
                                                        if (!id) {
                                                            updateStagedRow(t.id, { suggestedLink: null });
                                                            return;
                                                        }
                                                        const equip = equipments.find(eq => eq.id === id);
                                                        if (equip) {
                                                            const itemPrice = parseFloat(equip.cost || equip.purchasePrice || 0);
                                                            const predictiveUpdates = { 
                                                                suggestedLink: { type: 'equipment', id, name: equip.name }, 
                                                                category: 'Equipamentos & Ativos' 
                                                            };
                                                            if (t.isSplit && itemPrice > 0) {
                                                                predictiveUpdates.amount = itemPrice;
                                                                predictiveUpdates.isAISuggested = true;
                                                            }
                                                            updateStagedRow(t.id, predictiveUpdates);
                                                        } else {
                                                            const mat = materials.find(m => m.id === id);
                                                            if (mat) {
                                                                const itemPrice = parseFloat(mat.cost || mat.price || 0);
                                                                const predictiveUpdates = { 
                                                                    suggestedLink: { type: 'material', id, name: mat.name }, 
                                                                    category: 'Materiais & Insumos' 
                                                                };
                                                                if (t.isSplit && itemPrice > 0) {
                                                                    predictiveUpdates.amount = itemPrice;
                                                                    predictiveUpdates.isAISuggested = true;
                                                                }
                                                                updateStagedRow(t.id, predictiveUpdates);
                                                            }
                                                        }
                                                    }}
                                                    style={{ 
                                                        backgroundColor: t.suggestedLink ? '#fefce8' : '#f8fafc',
                                                        color: t.suggestedLink ? '#854d0e' : '#64748b',
                                                        padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, border: '1px solid #e2e8f0', cursor: 'pointer',
                                                        textTransform: 'uppercase', letterSpacing: '0.05em', width: '100%', outline: 'none'
                                                    }}
                                                >
                                                    <option value="">Novo Lançamento (S/ Vínculo)</option>
                                                    {equipments.length > 0 && (
                                                        <optgroup label="Equipamentos/Ativos">
                                                            {equipments.map(eq => <option key={eq.id} value={eq.id}>🔗 {eq.name}</option>)}
                                                        </optgroup>
                                                    )}
                                                    {materials.length > 0 && (
                                                        <optgroup label="Materiais/Insumos">
                                                            {materials.map(m => <option key={m.id} value={m.id}>📦 {m.name}</option>)}
                                                        </optgroup>
                                                    )}
                                                </select>
                                                {t.suggestedLink && (
                                                    <div className="flex items-center gap-1 text-[8px] text-yellow-600 font-black animate-pulse uppercase tracking-tighter">
                                                        <Zap size={8} /> Sugestão IA Detectada
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: t.type === 'expense' ? '#ef4444' : '#10b981' }}>
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1">
                                                    <span>{t.type === 'expense' ? '-' : '+'} R$ </span>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        value={t.amount}
                                                        onChange={(e) => updateStagedRow(t.id, { amount: parseFloat(e.target.value) || 0 })}
                                                        style={{ 
                                                            width: '100px', border: 'none', background: t.isSplit ? '#fdf2f2' : 'transparent', 
                                                            textAlign: 'right', fontWeight: 900, color: 'inherit',
                                                            borderRadius: '4px', padding: '2px 4px'
                                                        }}
                                                        className="focus:ring-1 focus:ring-slate-200"
                                                    />
                                                </div>
                                                {t.isSplit && (
                                                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <PlusCircle size={8} /> Original: R$ {formatCurrency(t.parentAmount)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <div className="flex items-center gap-3">
                                                {!t.isSplit && (
                                                    <button 
                                                        onClick={() => splitTransaction(t.id)} 
                                                        title="Desmembrar Transação"
                                                        className="text-slate-300 hover:text-indigo-500 transition-colors"
                                                    >
                                                        <Scissors size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => removeStagedRow(t.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <Landmark size={64} className="mx-auto mb-4 opacity-10" />
                    <p>Nenhum arquivo processado no momento.</p>
                </div>
            )}
        </div>
    );
}
