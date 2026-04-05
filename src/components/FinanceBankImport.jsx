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
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
    const [catalogPicker, setCatalogPicker] = useState({ isOpen: false, rowId: null, search: '' });
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const fileInputRef = useRef(null);

    // Categories are now dynamic via props.categories

    const getHistoricalData = (description) => {
        if (!existingTransactions || existingTransactions.length === 0) return { category: null, link: null };
        const fid = (description || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim(); // Fuzzy simplificado aqui
        const matches = existingTransactions.filter(et => {
            const etFid = (et.description || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            return etFid.includes(fid) || fid.includes(etFid);
        });
        
        if (matches.length === 0) return { category: null, link: null };
        
        const cats = matches.reduce((acc, t) => { if(t.category) acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {});
        const bestCat = Object.entries(cats).sort((a,b) => b[1] - a[1])[0]?.[0] || null;
        
        const links = matches.filter(t => t.linkedItemId).reduce((acc, t) => {
            const key = `${t.linkedItemType}|${t.linkedItemId}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const bestLinkKey = Object.entries(links).sort((a,b) => b[1] - a[1])[0]?.[0];
        
        let bestLink = null;
        if (bestLinkKey) {
            const [type, id] = bestLinkKey.split('|');
            // Tenta achar o nome original do item no histórico
            const sourceMatch = matches.find(m => m.linkedItemId === id && m.linkedItemType === type);
            bestLink = { id, type, name: sourceMatch?.description?.split(' / ')[1] || 'Item Vinculado' };
        }
        
        return { category: bestCat, link: bestLink };
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
        
        const getsMonthYear = (d) => {
            const dt = new Date(d);
            return `${dt.getUTCMonth()}-${dt.getUTCFullYear()}`;
        };

        const isWithinTolerance = (v1, v2, tolerance = 0.05) => {
            return Math.abs(Number(v1) - Number(v2)) <= tolerance;
        };

        const withMeta = parsed.map(nt => {
            const fingerprint = nt.rawId || `${nt.date}-${nt.amount}-${nt.description.trim()}`;
            const ntAmount = Math.abs(Number(nt.amount)).toFixed(2);

            // --- HUB DE INTELIGÊNCIA V8.0 (FINGERPRINT DIGITAL) ---
            const isInDB = existingTransactions.some(et => {
                // 1. Match por ID de Transação Real
                if (et.bankReferenceId === nt.rawId && nt.rawId) return true;
                
                 // 2. Match por Impressão Digital (Conta + Parcela + Valor c/ Tolerância)
                if (nt.installment && et.installment === nt.installment && 
                    isWithinTolerance(et.amount, nt.amount) && 
                    String(et.accountId) === String(selectedAccountId)) return true;

                // 3. Match por Fuzzy Matching (Descrição "Limpa" + Valor c/ Tolerância)
                if (isWithinTolerance(et.amount, nt.amount) && 
                    String(et.accountId) === String(selectedAccountId) &&
                    normalizedMatch(et.description, nt.description)) {
                    
                    // --- REFINAMENTO V9.5/V9.6 (WINDOWING + TOLERANCE) ---
                    // Se a transação TEM parcela, confiamos na identificação da parcela.
                    // Se NÃO tem parcela, só é duplicidade se for no MESMO MÊS/ANO (Recorrência).
                    if (nt.installment) return true;
                    if (getsMonthYear(et.date) === getsMonthYear(nt.date)) return true;
                }

                return false;
            });

            const isLocalDuplicate = localSeen.has(fingerprint);
            localSeen.add(fingerprint);
            const isDuplicate = isInDB || isLocalDuplicate;

            let finalCategory = nt.category;
            let isAISuggested = !!nt.isAISuggested;
            let suggestedLink = null;

            const hist = getHistoricalData(nt.description);
            if (hist.category && (finalCategory === 'Outros' || !isAISuggested)) {
                finalCategory = hist.category;
                isAISuggested = true;
            }
            if (hist.link) {
                suggestedLink = hist.link;
                isAISuggested = true;
                // Se temos um link histórico, já formatamos a descrição para o padrão "Original / Item"
                nt.description = `${nt.description.split(' / ')[0]} / ${hist.link.name}`;
            }

            return { ...nt, category: finalCategory, isAISuggested, isDuplicate, suggestedLink, fuzzyId: getFuzzy(nt.description) };
        });

        setStagedTransactions(withMeta.map(t => ({ ...t, selected: !t.isDuplicate })));
        setImportStats({
            total: withMeta.length,
            duplicates: withMeta.filter(t => t.isDuplicate).length,
            totalAmount: withMeta.reduce((s, t) => s + Number(t.amount || 0), 0)
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

    const handleTextImport = () => {
        if (!rawTextInput || rawTextInput.length < 10) {
            alert('Por favor, cole o texto da fatura ou extrato antes de processar.');
            return;
        }
        setIsParsing(true);
        try {
            const acc = accounts.find(a => String(a.id) === String(selectedAccountId));
            const parsed = BankFileParserService.parseRawText(rawTextInput, acc);
            processParsedResults(parsed);
        } catch (err) {
            console.error(err);
            alert('Erro ao processar texto. Verifique o formato.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleSaveImport = async () => {
        const toProcess = stagedTransactions.filter(t => t.selected);
        if (toProcess.length === 0) return;
        try {
            setIsParsing(true);
            const promises = toProcess.map(async (t) => {
                await db.create('transactions', {
                    accountId: selectedAccountId, 
                    amount: t.amount, 
                    type: t.type, 
                    category: t.category, 
                    description: t.description,
                    installment: t.installment, 
                    installmentNumber: t.installmentNumber || 1,
                    installmentsTotal: t.installmentsTotal || 1,
                    date: t.date, 
                    status: t.status || 'paid', 
                    bankReferenceId: t.rawId,
                    linkedItemId: t.suggestedLink?.id || null, 
                    linkedItemType: t.suggestedLink?.type || null,
                    source: t.source || 'bank_import', 
                    createdAt: new Date().toISOString()
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 animate-in fade-in duration-300">
                <div className="bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), transparent)' }}>
                        <div>
                           <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                             <Library size={22} className="text-indigo-600" /> Vincular ao Catálogo
                           </h3>
                           <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>Associe este gasto a um ativo ou insumo real.</p>
                        </div>
                        <button onClick={() => setCatalogPicker({ isOpen: false, rowId: null, search: '' })} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                className="form-input w-full" 
                                style={{ paddingLeft: '2.75rem', borderRadius: '14px', border: '1.5px solid rgba(0,0,0,0.1)', height: '48px', fontWeight: 600 }}
                                placeholder="Filtrar equipamentos ou materiais..." 
                                value={catalogPicker.search} 
                                onChange={e => setCatalogPicker({ ...catalogPicker, search: e.target.value })} 
                            />
                        </div>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0 0.5rem 1rem 0.5rem' }} className="custom-scrollbar">
                        <div className="grid gap-2">
                        {filtered.map(item => (
                            <div key={`${item.type}-${item.id}`} className="p-4 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/50 cursor-pointer flex justify-between items-center transition-all group" 
                                 onClick={() => {
                                     updateStagedRow(catalogPicker.rowId, { 
                                         description: `${stagedTransactions.find(r=>r.id===catalogPicker.rowId).description.split(' / ')[0]} / ${item.name}`,
                                         suggestedLink: { id: item.id, type: item.type, name: item.name },
                                         category: item.type === 'equipment' ? 'Equipamentos & Ativos' : 'Materiais & Insumos'
                                     });
                                     setCatalogPicker({ isOpen: false, rowId: null, search: '' });
                                 }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.category}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e293b' }}>R$ {formatCurrency(item.cost || item.price || 0)}</div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#10b981' }}>Disponível</div>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                <CloudRain size={32} className="mx-auto mb-2 opacity-50" />
                                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nenhum item encontrado.</p>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in" style={{ backgroundColor: 'transparent', overflow: 'hidden' }}>
            <div style={{ 
                padding: '2.5rem', 
                textAlign: 'center', 
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '32px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
                marginBottom: '2rem'
            }}>
                <div className="flex justify-between items-center mb-6 px-4">
                     <div className="flex flex-col items-start">
                        <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 950, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '8px' }}>
                           💎 HUB DE INTELIGÊNCIA V10.5 - MODO FIEL
                        </span>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>Importador de Fluxo Original</h2>
                     </div>
                     <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '16px' }}>
                        <button onClick={() => setImportMode('file')} className={`${importMode === 'file' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'} transition-all`} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', fontSize: '0.8rem', fontWeight: 800 }}>Arquivos</button>
                        <button onClick={() => setImportMode('text')} className={`${importMode === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'} transition-all`} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', fontSize: '0.8rem', fontWeight: 800 }}>Texto</button>
                    </div>
                </div>
                
                <div className="flex justify-center gap-4 items-center flex-wrap">
                    <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '400px' }}>
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="form-input w-full" 
                            style={{ paddingLeft: '3rem', height: '56px', borderRadius: '18px', border: '1.5px solid rgba(0,0,0,0.08)', fontWeight: 700, fontSize: '0.95rem', appearance: 'none', backgroundColor: 'white' }} 
                            value={selectedAccountId} 
                            onChange={e => setSelectedAccountId(e.target.value)}
                        >
                            <option value="" disabled>Selecione a conta destino...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={18} />
                    </div>
                    
                    {importMode === 'file' ? (
                        <>
                            <button 
                                className="btn btn-primary" 
                                style={{ height: '56px', borderRadius: '18px', padding: '0 32px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}
                                onClick={() => fileInputRef.current.click()}
                            >
                                <Upload size={20} strokeWidth={2.5} /> Carregar Extrato (OFX/CSV)
                            </button>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                        </>
                    ) : (
                        <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <textarea 
                                className="form-input w-full" 
                                style={{ 
                                    height: '200px', 
                                    borderRadius: '18px', 
                                    padding: '16px', 
                                    fontSize: '0.9rem', 
                                    fontFamily: 'monospace',
                                    border: '1.5px solid rgba(0,0,0,0.08)',
                                    backgroundColor: 'rgba(255,255,255,0.5)'
                                }}
                                placeholder="Cole aqui o texto da fatura ou extrato (Ex: Nubank, Inter, BB)..."
                                value={rawTextInput}
                                onChange={e => setRawTextInput(e.target.value)}
                            />
                            <button 
                                className="btn btn-primary" 
                                style={{ height: '56px', borderRadius: '18px', fontWeight: 900 }}
                                onClick={handleTextImport}
                                disabled={isParsing}
                            >
                                {isParsing ? <Loader2 className="animate-spin" /> : <Zap size={18} />} 
                                ANALISAR TEXTO INTELIGENTE
                            </button>
                        </div>
                    )}
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
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#64748b' }}>DATA</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#64748b' }}>DESCRIÇÃO</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '10px', color: '#64748b' }}>VALOR</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '10px', color: '#64748b' }}>CATEGORIA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedTransactions
                                    .map(t => {
                                        return (
                                            <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc', backgroundColor: 'white' }}>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    <input type="checkbox" checked={t.selected} onChange={e => {
                                                        updateStagedRow(t.id, { selected: e.target.checked });
                                                    }} />
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: 900, color: t.isDuplicate ? '#f59e0b' : '#10b981' }}>
                                                            {t.isDuplicate ? 'DUPLICIDADE' : 'NOVO'}
                                                        </span>
                                                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    <div className="flex items-center gap-2">
                                                        <input type="text" value={t.description} onChange={e => updateStagedRow(t.id, { description: e.target.value })} style={{ border: 'none', background: 'transparent', fontWeight: 800, width: '100%', outline: 'none' }} />
                                                        {t.suggestedLink && <span title="Vínculo sugerido pelo histórico" style={{ cursor: 'help' }}><Zap size={12} className="text-amber-500 fill-amber-500" /></span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 950, color: t.type === 'expense' ? '#ef4444' : '#10b981' }}>R$ {formatCurrency(t.amount)}</td>
                                                <td style={{ padding: '10px' }}>
                                                    <div className="flex items-center gap-2">
                                                        <select 
                                                            value={t.category} 
                                                            onChange={e => updateStagedRow(t.id, { category: e.target.value })} 
                                                            style={{ 
                                                                border: '1px solid #e2e8f0', 
                                                                background: 'rgba(255,255,255,0.5)', 
                                                                fontSize: '11px', 
                                                                fontWeight: 700, 
                                                                padding: '4px 8px', 
                                                                borderRadius: '8px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {(() => {
                                                                const cats = Array.isArray(categories) ? categories : [];
                                                                const grouped = {
                                                                    income: cats.filter(c => c.group === 'income'),
                                                                    fixed: cats.filter(c => c.group === 'expense' && c.type === 'fixed'),
                                                                    variable: cats.filter(c => c.group === 'expense' && c.type === 'variable'),
                                                                    tax: cats.filter(c => c.group === 'expense' && c.type === 'tax'),
                                                                    investment: cats.filter(c => c.group === 'expense' && c.type === 'investment'),
                                                                    other: cats.filter(c => c.group === 'expense' && !['fixed', 'variable', 'tax', 'investment'].includes(c.type))
                                                                };

                                                                return (
                                                                    <>
                                                                        <optgroup label="💰 RECEITAS">
                                                                            {grouped.income.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                        </optgroup>
                                                                        <optgroup label="🏠 GASTOS FIXOS">
                                                                            {grouped.fixed.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                        </optgroup>
                                                                        <optgroup label="📦 GASTOS VARIÁVEIS">
                                                                            {grouped.variable.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                        </optgroup>
                                                                        <optgroup label="🏦 IMPOSTOS & TAXAS">
                                                                            {grouped.tax.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                        </optgroup>
                                                                        <optgroup label="🚀 INVESTIMENTOS">
                                                                            {grouped.investment.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                        </optgroup>
                                                                        {grouped.other.length > 0 && (
                                                                            <optgroup label="OUTROS">
                                                                                {grouped.other.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                            </optgroup>
                                                                        )}
                                                                        {!cats.some(c => c.name === t.category) && <option value={t.category}>{t.category}</option>}
                                                                    </>
                                                                );
                                                            })()}
                                                        </select>
                                                        <button onClick={() => setCatalogPicker({ isOpen: true, rowId: t.id, search: t.description.split(' ')[0] })} style={{ fontSize: '9px', fontWeight: 900, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>CATÁLOGO</button>
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
