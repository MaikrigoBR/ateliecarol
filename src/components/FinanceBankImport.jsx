import React, { useState, useRef } from 'react';
import { 
    FileText, Search, X, Loader2, Landmark, Wallet, AlertTriangle, Upload, CloudRain, Trash2,
    CheckCircle, Zap, Library, ArrowRightLeft, CreditCard, ChevronRight, CornerDownRight, Hammer, Package
} from 'lucide-react';
import { BankFileParserService } from '../services/BankFileParserService';
import { formatCurrency, getInvoiceMonth } from '../utils/financeUtils';
import db from '../services/database';

export function FinanceBankImport({ accounts = [], existingTransactions = [], orders = [], onImportSuccess, categories = [], equipments = [], materials = [] }) {
    const [importMode, setImportMode] = useState('file'); // 'file' or 'text'
    const [stagedTransactions, setStagedTransactions] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [rawTextInput, setRawTextInput] = useState('');
    const [importStats, setImportStats] = useState({ total: 0, duplicates: 0, totalAmount: 0 });
    const [selectedAccountId, setSelectedAccountId] = useState(accounts.find(a => a.type !== 'credit')?.id || '');
    const [catalogPicker, setCatalogPicker] = useState({ isOpen: false, rowId: null, search: '' });
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const fileInputRef = useRef(null);

    const incomeCategories = ['Vendas de Produtos', 'Serviços Prestados', 'Aporte / Investimento', 'Estorno / Ajuste'];
    const expenseCategories = ['Administrativo / Fixos', 'Materiais & Insumos', 'Marketing & Vendas', 'Impostos & Taxas', 'Logística & Frete', 'Pessoal & RH', 'Equipamentos & Ativos', 'Pagamento de Fatura', 'Outros'];

    const getHistoricalCategory = (description) => {
        if (!existingTransactions || existingTransactions.length === 0) return null;
        const search = description.toLowerCase().trim();
        const matches = existingTransactions.filter(et => 
            et.description.toLowerCase().trim() === search && et.category
        );
        if (matches.length === 0) return null;
        const counts = matches.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {});
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    };

    const processParsedResults = (parsed) => {
        if (parsed.length === 0) {
            alert('Aviso: Nenhuma transação válida encontrada.');
            setIsParsing(false);
            return;
        }

        const selectedAcc = accounts.find(a => String(a.id) === String(selectedAccountId));
        const localSeen = new Set();
        
        // --- MOTOR DE NORMALIZAÇÃO V9.4 (Poda Avançada e Global) ---
        const instRegex = /(?:\s*[-/|:]\s*(?:Parcela|Parc\.?|P:?|PT?)\s*|\s+)?\(?(\d{1,3})\s*(?:de|\/|of)\s*(\d{1,3})\)?/gi;
        const getFuzzy = (txt) => (txt || '').replace(instRegex, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const normalizedMatch = (d1, d2) => {
            const f1 = getFuzzy(d1);
            const f2 = getFuzzy(d2);
            if (!f1 || !f2) return false;
            // Match parcial (8 chars) ou total
            return f1.startsWith(f2.substring(0, 8)) || f2.startsWith(f1.substring(0, 8)) || f1 === f2;
        };
        
        console.log(`🏦 Auditoria Anti-Duplicidade: Comparando contra ${existingTransactions.length} registros no banco.`);
        
        const withMeta = parsed.map(nt => {
            const fingerprint = nt.rawId || `${nt.date}-${nt.amount}-${nt.description.trim()}`;
            const ntAmount = Math.abs(Number(nt.amount)).toFixed(2);

            // --- HUB DE INTELIGÊNCIA V8.0 (FINGERPRINT DIGITAL) ---
            const isInDB = existingTransactions.some(et => {
                // 1. Match por ID de Transação Real
                if (et.bankReferenceId === nt.rawId && nt.rawId) return true;
                
                // 2. Match por Impressão Digital (Conta + Valor + Parcela)
                if (nt.installment && et.installment === nt.installment && 
                    Math.abs(Number(et.amount)).toFixed(2) === ntAmount && 
                    String(et.accountId) === String(selectedAccountId)) return true;

                // 3. Match por Fuzzy Matching (Descrição "Limpa" + Valor)
                if (Math.abs(Number(et.amount)).toFixed(2) === ntAmount && 
                    String(et.accountId) === String(selectedAccountId) &&
                    normalizedMatch(et.description, nt.description)) return true;

                return false;
            });

            const isLocalDuplicate = localSeen.has(fingerprint);
            localSeen.add(fingerprint);
            const isDuplicate = isInDB || isLocalDuplicate;

            let finalCategory = nt.category;
            let isAISuggested = !!nt.isAISuggested;
            if (!isAISuggested || finalCategory === 'Outros') {
                const historyCat = getHistoricalCategory(nt.description);
                if (historyCat) { finalCategory = historyCat; isAISuggested = true; }
            }

            return { ...nt, category: finalCategory, isAISuggested, isDuplicate, fuzzyId: getFuzzy(nt.description) };
        });

        const expanded = [];
        withMeta.forEach(main => {
            expanded.push({ ...main, selected: !main.isDuplicate, isMaster: true });
            
            const ntAmount = Math.abs(Number(main.amount)).toFixed(2);
            if (main.installmentNumber && main.installmentsTotal > 1 && !main.isDuplicate) {
                for (let i = 1; i <= main.installmentsTotal; i++) {
                    if (i === main.installmentNumber) continue;
                    const parcelKey = `${i.toString().padStart(2, '0')}/${main.installmentsTotal.toString().padStart(2, '0')}`;
                    
                    // --- BLINDAGEM DE PROJEÇÃO (V8.0) ---
                    const alreadyPresent = existingTransactions.some(et => 
                        et.installment === parcelKey && 
                        Math.abs(Number(et.amount)).toFixed(2) === ntAmount &&
                        normalizedMatch(et.description, main.description) &&
                        String(et.accountId) === String(selectedAccountId)
                    );

                    if (alreadyPresent) continue; // Pula a criação do "fantasma" se o dado real já está lá

                    const dateObj = new Date(main.date + 'T12:00:00');
                    dateObj.setMonth(dateObj.getMonth() + (i - main.installmentNumber));
                    
                    expanded.push({
                        ...main,
                        id: `${main.id}-proj-${i}`,
                        parentRowId: main.id,
                        date: dateObj.toISOString().split('T')[0],
                        installment: parcelKey,
                        isProjected: true,
                        source: 'projection',
                        status: i < main.installmentNumber ? 'paid' : 'pending',
                        selected: true,
                        fuzzyId: getFuzzy(main.description)
                    });
                }
            }
        });

        setStagedTransactions(expanded);
        setImportStats({
            total: expanded.length,
            duplicates: expanded.filter(t => t.isDuplicate).length,
            totalAmount: expanded.reduce((s, t) => s + Number(t.amount || 0), 0)
        });
        setIsParsing(false);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsParsing(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const acc = accounts.find(a => String(a.id) === String(selectedAccountId));
            let parsed = file.name.endsWith('.ofx') ? BankFileParserService.parseOFX(event.target.result, acc) : BankFileParserService.parseCSV(event.target.result, acc);
            processParsedResults(parsed);
        };
        reader.readAsText(file);
    };

    const handleSaveImport = async () => {
        const toProcess = stagedTransactions.filter(t => t.selected);
        if (toProcess.length === 0) return;
        try {
            setIsParsing(true);
            const promises = toProcess.map(async (t) => {
                await db.create('transactions', {
                    accountId: selectedAccountId, amount: t.amount, type: t.type, category: t.category, description: t.description,
                    installment: t.installment, date: t.date, status: t.status || 'paid', bankReferenceId: t.rawId,
                    linkedItemId: t.suggestedLink?.id || null, linkedItemType: t.suggestedLink?.type || null,
                    source: t.source || 'bank_import', createdAt: new Date().toISOString()
                });
            });
            await Promise.all(promises);
            onImportSuccess(toProcess.length);
            setStagedTransactions([]);
            alert('Importação concluída com sucesso!');
        } catch (err) { alert('Erro: ' + err.message); } finally { setIsParsing(false); }
    };

    const updateStagedRow = (id, updates) => {
        setStagedTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const CatalogPickerModal = () => {
        if (!catalogPicker.isOpen) return null;
        const filtered = [...equipments.map(e => ({ ...e, type: 'equipment', icon: <Hammer size={16} /> })), ...materials.map(m => ({ ...m, type: 'material', icon: <Package size={16} /> }))]
            .filter(i => i.name.toLowerCase().includes(catalogPicker.search.toLowerCase()));

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                        <h3 className="font-black flex items-center gap-2"><Library size={20} className="text-blue-600" /> Vincular ao Catálogo</h3>
                        <button onClick={() => setCatalogPicker({ isOpen: false, rowId: null, search: '' })}><X /></button>
                    </div>
                    <div style={{ padding: '1rem' }}>
                        <input type="text" className="form-input w-full" placeholder="Buscar..." value={catalogPicker.search} onChange={e => setCatalogPicker({ ...catalogPicker, search: e.target.value })} />
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {filtered.map(item => (
                            <div key={item.id} className="p-3 border-b hover:bg-slate-50 cursor-pointer flex justify-between items-center" 
                                 onClick={() => {
                                     updateStagedRow(catalogPicker.rowId, { 
                                         description: `${stagedTransactions.find(r=>r.id===catalogPicker.rowId).description.split(' / ')[0]} / ${item.name}`,
                                         suggestedLink: { id: item.id, type: item.type, name: item.name },
                                         category: item.type === 'equipment' ? 'Equipamentos & Ativos' : 'Materiais & Insumos'
                                     });
                                     setCatalogPicker({ isOpen: false, rowId: null, search: '' });
                                 }}>
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    <div><div className="font-bold text-sm">{item.name}</div><div className="text-[10px] text-slate-400">{item.category}</div></div>
                                </div>
                                <div className="text-right font-black text-sm">R$ {formatCurrency(item.cost || item.price || 0)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="section-container animate-fade-in" style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <div className="flex justify-between items-center mb-4 px-8">
                     <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 950, background: '#eef2ff', padding: '4px 10px', borderRadius: '20px', border: '1px solid #c7d2fe' }}>
                        💎 HUB DE INTELIGÊNCIA V6.1 - MODO ATIVO
                     </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '1.5rem', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '12px', width: 'fit-content', margin: '0 auto' }}>
                    <button onClick={() => setImportMode('file')} className={importMode === 'file' ? 'bg-white shadow-sm' : ''} style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 800 }}>Arquivos</button>
                    <button onClick={() => setImportMode('text')} className={importMode === 'text' ? 'bg-white shadow-sm' : ''} style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 800 }}>Texto</button>
                </div>
                
                <div className="flex justify-center gap-4 items-center">
                    <select className="form-input" style={{ fontWeight: 700, minWidth: '220px' }} value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}><Upload size={18} /> Carregar</button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                </div>
            </div>

            {stagedTransactions.length > 0 && (
                <div style={{ padding: '1.5rem' }}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-4">
                            <div className="text-center"><span className="block text-[10px] font-bold text-slate-400">TOTAL</span><span className="text-lg font-black">{importStats.total}</span></div>
                            <div className="text-center px-4 border-x"><span className="block text-[10px] font-bold text-slate-400">DUPLICIDADE</span><span className="text-lg font-black text-red-500">{importStats.duplicates}</span></div>
                        </div>
                        <button className="btn btn-primary" onClick={handleSaveImport} style={{ backgroundColor: '#10b981' }}><CheckCircle size={18} /> Confirmar ({stagedTransactions.filter(t=>t.selected).length})</button>
                    </div>

                    <div style={{ borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #eee' }}>
                                <tr>
                                    <th style={{ padding: '12px', width: '40px' }}><input type="checkbox" onChange={e => setStagedTransactions(stagedTransactions.map(t=>({...t, selected: e.target.checked})))} /></th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#64748b' }}>STATUS / DATA</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#64748b' }}>DESCRIÇÃO</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#94a3b8' }}>ID DIGITAL (AUDIT)</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '10px', color: '#64748b' }}>VALOR</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#64748b' }}>CATEGORIA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedTransactions
                                    .filter(t => t.isMaster || expandedGroups.has(t.parentRowId))
                                    .map(t => {
                                        const isChild = !!t.parentRowId;
                                        const hasChildren = stagedTransactions.some(c => c.parentRowId === t.id);
                                        const isExpanded = expandedGroups.has(t.id);
                                        return (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc', backgroundColor: isChild ? '#f8fafc' : 'white' }}>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    <input type="checkbox" checked={t.selected} onChange={e => {
                                                        const val = e.target.checked;
                                                        updateStagedRow(t.id, { selected: val });
                                                        if (t.isMaster) stagedTransactions.filter(c => c.parentRowId === t.id).forEach(c => updateStagedRow(c.id, { selected: val }));
                                                    }} />
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: 900, color: isChild ? '#94a3b8' : (t.isDuplicate ? '#f59e0b' : '#10b981') }}>
                                                            {isChild ? '↳ PROJEÇÃO' : (t.isDuplicate ? 'DUPLICIDADE' : 'NOVO')}
                                                        </span>
                                                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    <div className="flex items-center gap-2">
                                                        {!isChild && hasChildren && (
                                                            <button onClick={() => {
                                                                const s = new Set(expandedGroups);
                                                                if (isExpanded) s.delete(t.id); else s.add(t.id);
                                                                setExpandedGroups(s);
                                                            }}><ChevronRight size={14} className={isExpanded ? 'rotate-90' : ''} /></button>
                                                        )}
                                                        <input type="text" value={t.description} readOnly={t.isProjected} style={{ border: 'none', background: 'transparent', fontWeight: isChild ? 500 : 800, width: '100%' }} />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#94a3b8', background: '#f8fafc', padding: '2px 4px', borderRadius: '4px' }}>
                                                        {t.fuzzyId || '-'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 950, color: t.type === 'expense' ? '#ef4444' : '#10b981' }}>R$ {formatCurrency(t.amount)}</td>
                                                <td style={{ padding: '10px' }}>
                                                    <div className="flex items-center gap-2">
                                                        <select value={t.category} disabled={t.isProjected} onChange={e => updateStagedRow(t.id, { category: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '11px', fontWeight: 700 }}>
                                                            <option value={t.category}>{t.category}</option>
                                                            {expenseCategories.concat(incomeCategories).map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        {!isChild && <button onClick={() => setCatalogPicker({ isOpen: true, rowId: t.id, search: t.description.split(' ')[0] })} style={{ fontSize: '9px', fontWeight: 900, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>CATÁLOGO</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <CatalogPickerModal />
        </div>
    );
}
