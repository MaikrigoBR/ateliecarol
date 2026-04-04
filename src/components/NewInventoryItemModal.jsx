import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Package, Hammer, Ruler, DollarSign, 
    Calendar, Save, Trash2, Plus, ArrowRight,
    TrendingUp, Calculator, ShieldCheck, Activity,
    Box, Truck, AlertCircle, RefreshCw, Layers,
    History, Info
} from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { formatCurrency } from '../utils/financeUtils.js';

export function NewInventoryItemModal({ isOpen, onClose, onItemSaved, defaultType = 'equipment', itemToEdit, targetTable = 'inventory' }) {
    const [activeTab, setActiveTab] = useState('geral');
    const [isSaving, setIsSaving] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [isReplenishMode, setIsReplenishMode] = useState(false);
    
    // Reposição State
    const [replenishData, setReplenishData] = useState({
        quantityToAdd: 1,
        purchasePrice: '',
        accountId: '',
        installments: 1,
        paymentDate: new Date().toISOString().split('T')[0]
    });

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        type: defaultType,
        quantity: 1,
        minStock: 0,
        unit: 'un',
        cost: '', // Treat as Average Cost in UI
        location: '',
        brand: '',
        model: '',
        serial: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        status: 'Ativo',
        description: '',
        family: '', // Master Group / Family for grouping
        paymentMethod: 'cash',
        installments: 1,
        firstPaymentDate: new Date().toISOString().split('T')[0],
        accountId: '',
        consolidateFinance: true,
        image: ''
    });

    useEffect(() => {
        const fetchAccounts = async () => {
            const accs = await db.getAll('accounts');
            setAccounts(accs || []);
            if (accs?.length > 0 && !formData.accountId) {
                setFormData(prev => ({ ...prev, accountId: accs[0].id }));
                setReplenishData(prev => ({ ...prev, accountId: accs[0].id }));
            }
        };
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (itemToEdit) {
                setFormData({
                    ...itemToEdit,
                    cost: itemToEdit.cost || itemToEdit.purchasePrice || '',
                    serial: itemToEdit.serial || itemToEdit.patrimonyId || '',
                    image: itemToEdit.image || itemToEdit.photoUrl || '',
                    category: itemToEdit.category || itemToEdit.equipmentGroup || itemToEdit.materialGroup || '',
                    type: itemToEdit.type || (targetTable === 'equipments' ? 'equipment' : 'material')
                });
                setReplenishData(prev => ({
                    ...prev,
                    purchasePrice: itemToEdit.cost || ''
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    type: defaultType,
                    purchaseDate: new Date().toISOString().split('T')[0]
                }));
            }
            setActiveTab('geral');
            setIsReplenishMode(false);
        }
    }, [isOpen, itemToEdit, defaultType, targetTable]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const currentUser = "Operador";

        try {
            const payload = {
                ...formData,
                updatedAt: new Date().toISOString(),
                cost: parseFloat(formData.cost) || 0,
                quantity: parseFloat(formData.quantity) || 0,
                minStock: parseFloat(formData.minStock) || 0
            };

            if (itemToEdit) {
                await db.update(targetTable, itemToEdit.id, payload);
                AuditService.log(currentUser, 'UPDATE', targetTable, itemToEdit.id, `Atualizou dados: ${payload.name}`);
            } else {
                const id = await db.add(targetTable, { ...payload, createdAt: new Date().toISOString() });
                AuditService.log(currentUser, 'CREATE', targetTable, id, `Cadastrou novo recurso: ${payload.name}`);

                // Financial Integration for Initial Stock
                if (payload.consolidateFinance && payload.cost > 0 && payload.accountId) {
                    const totalValue = payload.cost * (payload.type === 'material' ? 1 : payload.quantity);
                    await createTransactions(id, payload.name, totalValue, payload.installments, payload.firstPaymentDate, payload.accountId);
                }
            }
            onItemSaved();
            onClose();
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Erro ao salvar. Verifique se todos os campos financeiros estão preenchidos.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReplenish = async () => {
        if (!replenishData.purchasePrice || !replenishData.accountId) {
            alert('Por favor, preencha o preço de compra e a conta de pagamento.');
            return;
        }
        setIsSaving(true);
        try {
            const currentQty = parseFloat(formData.quantity) || 0;
            const currentCost = parseFloat(formData.cost) || 0;
            const addedQty = parseFloat(replenishData.quantityToAdd) || 0;
            const purchasePrice = parseFloat(replenishData.purchasePrice) || 0;

            // Average Cost Calculation: (Old Value + New Value) / Total Qty
            const newQty = currentQty + addedQty;
            const newAvgCost = ((currentQty * currentCost) + (addedQty * purchasePrice)) / newQty;

            const updatedPayload = {
                ...formData,
                quantity: newQty,
                cost: newAvgCost,
                updatedAt: new Date().toISOString()
            };

            await db.update(targetTable, itemToEdit.id, updatedPayload);
            
            // Financial Trace
            const totalValue = addedQty * purchasePrice;
            await createTransactions(itemToEdit.id, `Reposição: ${formData.name}`, totalValue, replenishData.installments, replenishData.paymentDate, replenishData.accountId);

            AuditService.log("Operador", 'REPLENISH', targetTable, itemToEdit.id, `Expansão de estoque: +${addedQty} ${formData.unit}`);
            
            onItemSaved();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const createTransactions = async (originId, name, totalAmount, installments, date, accountId) => {
        const valPerInst = totalAmount / installments;
        for (let i = 0; i < installments; i++) {
            const d = new Date(date);
            d.setMonth(d.getMonth() + i);
            await db.add('transactions', {
                description: `${name} (${i + 1}/${installments})`,
                amount: -valPerInst,
                date: d.toISOString().split('T')[0],
                category: 'Investimento/Estoque',
                accountId: accountId,
                type: 'expense',
                status: 'pending',
                originId,
                originTable: targetTable,
                createdAt: new Date().toISOString()
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ borderRadius: '24px', overflow: 'hidden' }}>
                
                {/* Tactical Header */}
                <div className="modal-header" style={{ padding: '24px 32px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-md">
                        <div style={{ padding: '12px', background: 'var(--primary)', color: 'white', borderRadius: '16px', shadow: 'var(--shadow-sm)' }}>
                            {formData.type === 'equipment' ? <Hammer size={24} /> : <Package size={24} />}
                        </div>
                        <div>
                            <h2 className="modal-title" style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>
                                {itemToEdit ? (isReplenishMode ? 'Reposição de Estoque' : 'Gestão de Ativo') : 'Nova Incorporação'}
                            </h2>
                            <p className="text-[10px] text-muted uppercase font-black tracking-widest mt-1">
                                {itemToEdit ? `ID: ${itemToEdit.id} • ${formData.name.toUpperCase()}` : 'INICIALIZAÇÃO DE CADASTRO TÁTICO'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-md">
                        {itemToEdit && !isReplenishMode && (
                            <button className="btn btn-secondary" style={{ padding: '0 16px', color: 'var(--primary)', fontWeight: 700 }} onClick={() => setIsReplenishMode(true)}>
                                <RefreshCw size={16} /> Repor Estoque
                            </button>
                        )}
                        <button onClick={onClose} className="btn-icon">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Tabs (Main Mode) */}
                {!isReplenishMode && (
                    <div style={{ padding: '0 32px', background: 'var(--surface)' }}>
                        <div className="tabs" style={{ marginBottom: 0 }}>
                            <button className={`tab-item ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>Propriedades</button>
                            <button className={`tab-item ${activeTab === 'operacao' ? 'active' : ''}`} onClick={() => setActiveTab('operacao')}>Operacional</button>
                            <button className={`tab-item ${activeTab === 'financeiro' ? 'active' : ''}`} onClick={() => setActiveTab('financeiro')}>Financeiro</button>
                        </div>
                    </div>
                )}

                <div className="modal-body" style={{ padding: '32px', background: isReplenishMode ? 'var(--background)' : 'var(--surface)' }}>
                    {isReplenishMode ? (
                        /* REPLENISH MODE (Entrada Inteligente) */
                        <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                           <div style={{ backgroundColor: 'var(--surface)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)', shadow: 'var(--shadow-lg)' }}>
                                <div className="flex items-center gap-md mb-xl">
                                    <div style={{ padding: '10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px' }}>
                                        <TrendingUp size={20} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">A reposição atualizará o **Custo Médio** do produto e gerará lançamentos financeiros auditáveis.</p>
                                </div>

                                <div className="grid gap-lg">
                                    <div className="input-group">
                                        <label className="form-label">Quantidade para Adicionar ({formData.unit})</label>
                                        <input type="number" className="form-input" style={{ fontSize: '1.25rem', fontWeight: 800 }} value={replenishData.quantityToAdd} onChange={e => setReplenishData({...replenishData, quantityToAdd: e.target.value})} />
                                    </div>

                                    <div className="input-group">
                                        <label className="form-label">Preço de Compra (Atual desta Lote)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>R$</span>
                                            <input type="number" className="form-input" style={{ paddingLeft: '44px', fontWeight: 700 }} value={replenishData.purchasePrice} onChange={e => setReplenishData({...replenishData, purchasePrice: e.target.value})} />
                                        </div>
                                        <p className="text-[10px] text-muted mt-2 font-bold uppercase">Custo Médio Atual: R$ {parseFloat(formData.cost || 0).toFixed(2)}</p>
                                    </div>

                                    <div style={{ padding: '24px', background: 'var(--background)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Liquidação Financeira</h4>
                                        <div className="grid gap-md">
                                            <div className="input-group">
                                                <label className="form-label">Conta para Débito</label>
                                                <select className="form-input" value={replenishData.accountId} onChange={e => setReplenishData({...replenishData, accountId: e.target.value})}>
                                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (Saldo: R$ {parseFloat(acc.balance || 0).toFixed(2)})</option>)}
                                                </select>
                                            </div>
                                            <div className="flex gap-md">
                                                 <div className="input-group flex-1">
                                                    <label className="form-label">Parcelas</label>
                                                    <input type="number" className="form-input" value={replenishData.installments} onChange={e => setReplenishData({...replenishData, installments: e.target.value})} />
                                                </div>
                                                <div className="input-group flex-1">
                                                    <label className="form-label">Data Pagamento</label>
                                                    <input type="date" className="form-input" value={replenishData.paymentDate} onChange={e => setReplenishData({...replenishData, paymentDate: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-md mt-xl">
                                    <button className="btn btn-secondary flex-1" style={{ height: '3.5rem' }} onClick={() => setIsReplenishMode(false)}>Voltar</button>
                                    <button className="btn btn-primary flex-1" style={{ height: '3.5rem', fontWeight: 800 }} onClick={handleReplenish} disabled={isSaving}>
                                        Confirmar Entrada
                                    </button>
                                </div>
                           </div>
                        </div>
                    ) : (
                        /* STANDARD MODE */
                        <form id="item-form" onSubmit={handleSave}>
                            {activeTab === 'geral' && (
                                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px' }}>
                                    <div>
                                        <div style={{ width: '100%', height: '240px', background: 'var(--background)', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                            {formData.image ? (
                                                <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div className="text-center p-8">
                                                    <Package size={48} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
                                                    <p className="text-[10px] text-muted font-black uppercase">Nenhuma mídia anexada</p>
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="URL da Imagem..." 
                                                    className="form-input" 
                                                    style={{ fontSize: '0.7rem', backgroundColor: 'var(--surface)', opacity: 0.9 }} 
                                                    value={formData.image} 
                                                    onChange={e => setFormData({...formData, image: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="input-group" style={{ marginTop: '24px' }}>
                                            <label className="form-label">Status do Registro</label>
                                            <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                                <option value="Ativo">✅ OPERACIONAL</option>
                                                <option value="Manutenção">⚠️ MANUTENÇÃO</option>
                                                <option value="Inativo">🔴 DESATIVADO</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid gap-md">
                                        <div className="input-group">
                                            <label className="form-label">Nome de Identificação</label>
                                            <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ fontSize: '1rem', fontWeight: 700 }} />
                                        </div>
                                        
                                        <div className="flex gap-md">
                                            <div className="input-group flex-1">
                                                <label className="form-label">Família Equivalente (Master)</label>
                                                <input type="text" className="form-input" value={formData.family} onChange={e => setFormData({...formData, family: e.target.value})} placeholder="Ex: Caneca Porcelana 325ml" />
                                                <p className="text-[9px] text-primary mt-1 font-bold uppercase flex items-center gap-1"><Info size={10} /> Agrupa custos de fornecedores diferentes</p>
                                            </div>
                                            <div className="input-group flex-1">
                                                <label className="form-label">ID Patrimonial / Tag</label>
                                                <input type="text" className="form-input" value={formData.serial} onChange={e => setFormData({...formData, serial: e.target.value})} placeholder="TAG-1234" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-md">
                                            <div className="input-group">
                                                <label className="form-label">Categoria Sistema</label>
                                                <input type="text" className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                                            </div>
                                            <div className="input-group">
                                                <label className="form-label">Unidade de Medida</label>
                                                <input type="text" className="form-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="un, m, kg..." />
                                            </div>
                                        </div>
                                        
                                        <div className="input-group">
                                            <label className="form-label">Notas Adicionais</label>
                                            <textarea className="form-input" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Especificações técnicas ou limitações de uso..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'operacao' && (
                                <div className="animate-fade-in space-y-lg">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                        <div style={{ background: 'var(--background)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Controle de Inventário</h4>
                                            <div className="grid gap-md">
                                                <div className="input-group">
                                                    <label className="form-label">Quantidade em Mãos</label>
                                                    <input type="number" className="form-input" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} disabled={itemToEdit} />
                                                    {itemToEdit && <p className="text-[10px] text-primary mt-1 font-bold uppercase">Use "Repor Estoque" para ajustar o saldo e custo médio</p>}
                                                </div>
                                                <div className="input-group">
                                                    <label className="form-label">Ponto de Ressuprimento (Mínimo)</label>
                                                    <input type="number" className="form-input" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ background: 'var(--background)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Especificações do Fabricante</h4>
                                            <div className="grid gap-md">
                                                 <div className="input-group">
                                                    <label className="form-label">Marca / Brand</label>
                                                    <input type="text" className="form-input" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                                                </div>
                                                <div className="input-group">
                                                    <label className="form-label">Modelo / Referência</label>
                                                    <input type="text" className="form-input" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financeiro' && (
                                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                                    <div className="space-y-xl">
                                        <div className="input-group">
                                            <label className="form-label">Custo Médio Unitário</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>R$</span>
                                                <input type="number" className="form-input" style={{ paddingLeft: '44px', fontSize: '1.25rem', fontWeight: 800 }} value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <label className="form-label">Início de Atividade / Aquisição</label>
                                            <input type="date" className="form-input" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
                                        </div>

                                        <div style={{ padding: '24px', background: 'var(--background)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-slate-800">Sincronizar com Financeiro</span>
                                                <input type="checkbox" checked={formData.consolidateFinance} onChange={e => setFormData({...formData, consolidateFinance: e.target.checked})} disabled={itemToEdit} />
                                            </div>
                                            <p className="text-[10px] text-muted font-bold uppercase">Ao salvar, cria os débitos correspondentes nas contas indicadas.</p>
                                        </div>
                                    </div>

                                    {formData.consolidateFinance && !itemToEdit && (
                                        <div className="animate-fade-in" style={{ background: 'var(--surface-hover)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Configuração de Liquidação</h4>
                                            
                                            <div className="grid gap-md">
                                                <div className="input-group">
                                                    <label className="form-label">Conta Origem</label>
                                                    <select className="form-input" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                                    </select>
                                                </div>

                                                <div className="flex gap-md">
                                                    <div className="input-group flex-1">
                                                        <label className="form-label">Parcelas</label>
                                                        <input type="number" className="form-input" min="1" value={formData.installments} onChange={e => setFormData({...formData, installments: e.target.value})} />
                                                    </div>
                                                    <div className="input-group flex-1">
                                                        <label className="form-label">1º Vencimento</label>
                                                        <input type="date" className="form-input" value={formData.firstPaymentDate} onChange={e => setFormData({...formData, firstPaymentDate: e.target.value})} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Tactical Footer */}
                {!isReplenishMode && (
                    <div className="modal-footer" style={{ padding: '24px 32px' }}>
                        <div className="flex gap-md">
                            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0 32px' }}>Cancelar</button>
                            <button type="submit" form="item-form" className="btn btn-primary" style={{ padding: '0 48px', fontWeight: 700 }} disabled={isSaving}>
                                <Save size={18} /> {isSaving ? 'Gravando...' : itemToEdit ? 'Atualizar Registro' : 'Lançar no Sistema'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
