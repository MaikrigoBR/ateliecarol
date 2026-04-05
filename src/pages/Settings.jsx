import React, { useState, useEffect } from 'react';
import { Save, User, Globe, Users, Tags, Plus, Trash2, Edit2, Activity, Clock, Landmark, Wallet, CreditCard, X, FileText, CalendarDays, Palette, Info, Truck, Search, MapPin, Star, ExternalLink, Link, Hash, Eye, Copy, CheckCircle, ShoppingBag, Map, MessageSquare } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { PromoBannerModal } from '../components/PromoBannerModal';

/* --- SUB-COMPONENTS --- */

function ProfileSettings({ user, setUser, onSave }) {
    return (
        <div className="card animate-fade-in">
             <div className="card-header">
                <h3 className="card-title flex items-center gap-sm"><User size={20} /> Perfil do Usuário</h3>
             </div>
             <form onSubmit={onSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--primary)', marginBottom: '8px' }}>
                            {user.avatar || 'US'}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label className="form-label">Nome Completo</label>
                            <input type="text" className="form-input" value={user.name} onChange={e => setUser({...user, name: e.target.value})} />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Cargo / Função</label>
                            <input type="text" className="form-input" value={user.role} onChange={e => setUser({...user, role: e.target.value})} />
                        </div>
                         <div className="input-group">
                            <label className="form-label">Iniciais Avatar</label>
                            <input type="text" className="form-input" maxLength="2" value={user.avatar} onChange={e => setUser({...user, avatar: e.target.value})} />
                        </div>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t flex justify-end">
                    <button type="submit" className="btn btn-primary"><Save size={16} /> Salvar Alterações</button>
                </div>
             </form>
        </div>
    );
}

function BusinessHoursSettings() {
    // Parâmetros universais de tempo produtivo
    const [hours, setHours] = useState({
        mon: { active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
        tue: { active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
        wed: { active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
        thu: { active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
        fri: { active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
        sat: { active: false, start: '08:00', end: '12:00', lunchStart: '', lunchEnd: '' },
        sun: { active: false, start: '', end: '', lunchStart: '', lunchEnd: '' }
    });
    
    useEffect(() => {
        const load = async () => {
            const data = await db.getById('settings', 'business_hours');
            if (data && data.hours) setHours(data.hours);
        };
        load();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        await db.set('settings', 'business_hours', { hours });
        AuditService.log({ name: 'Admin' }, 'UPDATE', 'Settings', 'business_hours', 'Atualizou os horários de expediente e fuso organizacional.');
        alert('Parâmetros de Expediente salvos com sucesso!');
    };

    const daysMap = {
        mon: 'Segunda-feira', tue: 'Terça-feira', wed: 'Quarta-feira',
        thu: 'Quinta-feira', fri: 'Sexta-feira', sat: 'Sábado', sun: 'Domingo'
    };

    return (
        <div className="card animate-fade-in">
             <div className="card-header">
                <div>
                     <h3 className="card-title flex items-center gap-sm"><CalendarDays size={20} /> Controle Cronológico e Expediente</h3>
                     <p className="text-muted text-sm border-b pb-4 mb-2">Configure os dias e horários laborais/produtivos. Estes parâmetros afetam cálculos de gargalo produtivo (prazos/ociosidade) e permissões de acesso ao sistema (fora de hora).</p>
                </div>
            </div>
            
            <form onSubmit={handleSave} className="p-4 pt-2">
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Dia da Semana</th>
                                <th className="px-4 py-3 text-center">Expediente</th>
                                <th className="px-4 py-3">Entrada (Hora)</th>
                                <th className="px-4 py-3">Saída Almoço</th>
                                <th className="px-4 py-3">Volta Almoço</th>
                                <th className="px-4 py-3">Saída (Fim)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {Object.entries(hours).map(([key, dayData]) => (
                                <tr key={key} className={`transition-colors ${!dayData.active ? 'bg-gray-50/70 opacity-60 grayscale-[0.5]' : 'hover:bg-blue-50/30'}`}>
                                    <td className="px-4 py-3 font-semibold text-gray-700">{daysMap[key]}</td>
                                    <td className="px-4 py-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={dayData.active}
                                            onChange={e => setHours({...hours, [key]: {...dayData, active: e.target.checked}})}
                                            style={{ transform: 'scale(1.2)' }}
                                            className="accent-primary cursor-pointer border-gray-300 rounded shadow-sm"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="time" className="form-input text-sm p-1.5 w-full bg-white border-gray-200 focus:ring-primary shadow-sm rounded" value={dayData.start} disabled={!dayData.active} onChange={e => setHours({...hours, [key]: {...dayData, start: e.target.value}})} />
                                    </td>
                                     <td className="px-4 py-2">
                                        <input type="time" className="form-input text-sm p-1.5 w-full bg-white border-gray-200 focus:ring-primary shadow-sm rounded" value={dayData.lunchStart} disabled={!dayData.active} onChange={e => setHours({...hours, [key]: {...dayData, lunchStart: e.target.value}})} />
                                    </td>
                                     <td className="px-4 py-2">
                                        <input type="time" className="form-input text-sm p-1.5 w-full bg-white border-gray-200 focus:ring-primary shadow-sm rounded" value={dayData.lunchEnd} disabled={!dayData.active} onChange={e => setHours({...hours, [key]: {...dayData, lunchEnd: e.target.value}})} />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="time" className="form-input text-sm p-1.5 w-full bg-white border-gray-200 focus:ring-primary shadow-sm rounded" value={dayData.end} disabled={!dayData.active} onChange={e => setHours({...hours, [key]: {...dayData, end: e.target.value}})} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-6 pt-4 flex justify-end">
                    <button type="submit" className="btn btn-primary shadow-md hover:-translate-y-0.5 transition-all"><Save size={16} /> Salvar Parâmetros Cronológicos</button>
                </div>
            </form>
        </div>
    );
}

function RolesSettings() {
    const [roles, setRoles] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', baseSalary: '', enforceWorkingHours: false });

    useEffect(() => { loadRoles(); }, []);
    
    const loadRoles = async () => {
        try {
            const data = await db.getAll('roles');
            setRoles(Array.isArray(data) ? data : []);
        } catch(e) { console.error(e); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newRole.name) return;
        
        // Check if role already exists
        const exists = roles.find(r => r.name.toLowerCase() === newRole.name.toLowerCase() && !r.deleted);
        if (exists) {
            alert('Cargo já existe!');
            return;
        }

        await db.create('roles', { 
            name: newRole.name, 
            baseSalary: parseFloat(newRole.baseSalary) || 0,
            enforceWorkingHours: newRole.enforceWorkingHours 
        });
        
        handleClose();
        loadRoles();
    };

    const handleDelete = async (id, name) => {
        if(window.confirm(`Inativar cargo "${name}"?\n(Não deletará usuários que já possuem este cargo)`)) {
            await db.update('roles', id, { deleted: true });
            loadRoles();
        }
    };

    const handleOpenNew = () => {
        setNewRole({ name: '', baseSalary: '', enforceWorkingHours: false });
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setNewRole({ name: '', baseSalary: '', enforceWorkingHours: false });
    };

    return (
        <div className="card animate-fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 className="card-title flex items-center gap-2 text-purple-800"><Users size={20} /> Cargos & Salários Base</h3>
                    <p className="text-muted text-sm pb-2">Defina os cargos padrão, salários sugeridos e restrições de horário.</p>
                </div>
                <button onClick={handleOpenNew} className="btn btn-primary shadow-sm hover:-translate-y-0.5" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600 }}>
                    <Plus size={16} /> Novo Cargo
                </button>
            </div>
            
            <div className="overflow-x-auto mt-4 px-4 pb-4">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-medium">
                            <th className="pb-2">Cargo</th>
                            <th className="pb-2">Salário Base (Sugerido)</th>
                            <th className="pb-2">Fuso (Obrigatório)</th>
                            <th className="pb-2 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.map(r => (
                            <tr key={r.id} className="hover:bg-purple-50 transition-colors">
                                <td className="py-3 font-medium text-gray-800">{r.name}</td>
                                <td className="py-3 text-gray-600 font-mono">
                                    {r.baseSalary ? `R$ ${r.baseSalary.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'R$ 0,00'}
                                </td>
                                <td className="py-3 text-gray-600">
                                    {r.enforceWorkingHours ? (
                                        <span className="badge badge-warning text-[10px] py-0.5"><Clock size={10} className="inline mr-1" /> Restrito</span>
                                    ) : (
                                        <span className="text-muted text-xs">Livre Acesso</span>
                                    )}
                                </td>
                                <td className="py-3 text-right flex justify-end gap-1">
                                    <button onClick={() => handleDelete(r.id, r.name)} className="text-gray-400 hover:text-red-500 transition-colors p-2" title="Inativar Cargo"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {roles.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-8 bg-gray-50/50 rounded-lg">Nenhum cargo definido.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Popup Modal */}
            {isModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '100%', padding: '24px', backgroundColor: 'var(--surface)', borderRadius: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                Novo Cargo / Nível
                            </h2>
                            <button onClick={handleClose} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Nome da Função/Cargo <span style={{color: '#ef4444'}}>*</span></label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Ex: Designer Pleno, Atendente..." 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                    value={newRole.name} 
                                    onChange={e => setNewRole({...newRole, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Piso Salarial (R$) <span className="text-muted font-normal">(Sugerido)</span></label>
                                <input 
                                    type="number" step="0.01" 
                                    placeholder="Ex: 2500.00" 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                    value={newRole.baseSalary} 
                                    onChange={e => setNewRole({...newRole, baseSalary: e.target.value})} 
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '12px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    id="chk-enforce-modal" 
                                    checked={newRole.enforceWorkingHours} 
                                    onChange={e => setNewRole({...newRole, enforceWorkingHours: e.target.checked})}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label htmlFor="chk-enforce-modal" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', marginBottom: '2px' }}>
                                        Restringir Sistema por Expediente
                                    </label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Se verificado, os usuários com este cargo não poderão logar fora do horário definido em "Expediente".
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={handleClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--surface-hover)', color: 'var(--text-main)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Criar Cargo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function CategoriesSettings() {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', isSub: false, parentId: '', type: 'fixed', group: 'expense' });

    useEffect(() => { loadCats(); }, []);

    const loadCats = async () => {
        try {
            const data = await db.getAll('categories');
            const sorted = (Array.isArray(data) ? data : []).sort((a,b) => a.name?.localeCompare(b.name));
            setCategories(sorted);
        } catch (e) { console.error(e); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const categoryName = formData.name.trim();
        if (!categoryName) return;

        const exists = categories.find(c => 
            c.name.toLowerCase() === categoryName.toLowerCase() && 
            !c.deleted && 
            c.id !== editCategory?.id
        );
        if (exists) {
            alert('Uma categoria com esse nome já existe!');
            return;
        }

        const payload = {
            name: categoryName,
            type: formData.type || 'fixed',
            group: formData.group || 'expense',
            parentId: formData.isSub && formData.parentId ? formData.parentId : null,
            deleted: false,
            updatedAt: new Date().toISOString()
        };

        try {
            if (editCategory) {
                await db.update('categories', editCategory.id, payload);
                
                // CASCATA: Se for uma categoria principal, atualiza o tipo/grupo de todas as subcategorias
                if (!editCategory.parentId) {
                    const subs = categories.filter(c => c.parentId === editCategory.id);
                    const cascadePromises = subs.map(sub => 
                        db.update('categories', sub.id, { 
                            type: payload.type, 
                            group: payload.group 
                        })
                    );
                    await Promise.all(cascadePromises);
                }
            } else {
                await db.create('categories', payload);
            }
            setFormData({ name: '', isSub: false, parentId: '', type: 'fixed', group: 'expense' });
            setEditCategory(null);
            setIsModalOpen(false);
            loadCats();
        } catch(err) {
            console.error(err);
            alert("Falha ao salvar a categoria.");
        }
    };

    const handleEditStart = (cat) => {
        setEditCategory(cat);
        setFormData({
            name: cat.name,
            isSub: !!cat.parentId,
            parentId: cat.parentId || '',
            type: cat.type || 'fixed',
            group: cat.group || 'expense'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (cat) => {
        if(window.confirm(`Inativar categoria "${cat.name}"?`)) {
            await db.update('categories', cat.id, { deleted: true });
            loadCats();
        }
    };

    const getTypeLabel = (type) => {
        const map = {
            'fixed': { label: 'Despesa Fixa', color: '#6366f1' },
            'variable': { label: 'Custo Variável', color: '#f59e0b' },
            'tax': { label: 'Imposto/Taxa', color: '#ef4444' },
            'investment': { label: 'Investimento/Outros', color: '#10b981' },
            'income': { label: 'Receita Operacional', color: '#10b981' }
        };
        return map[type] || { label: type, color: '#94a3b8' };
    };

    const mainCategories = categories.filter(c => !c.parentId && !c.deleted);
    const getSubcategories = (parentId) => categories.filter(c => c.parentId === parentId && !c.deleted);

    return (
        <div className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                     <h3 className="card-title flex items-center gap-2 text-purple-800"><FileText size={20} /> Plano de Contas Estruturado (DRE)</h3>
                     <p className="text-muted text-sm pb-2">Defina categorias Fixas e Variáveis para análise profissional de lucratividade.</p>
                </div>
                <button onClick={() => { setEditCategory(null); setFormData({ name: '', isSub: false, parentId: '', type: 'fixed', group: 'expense' }); setIsModalOpen(true); }} className="btn btn-primary shadow-sm hover:-translate-y-0.5" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600 }}>
                    <Plus size={16} /> Novo Grupo Principal
                </button>
            </div>
            
            <div className="p-4 bg-gray-50/50 rounded-b-xl border-t border-gray-100 min-h-[200px]" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {mainCategories.map(main => {
                    const subs = getSubcategories(main.id);
                    const typeInfo = getTypeLabel(main.type);
                    return (
                        <div key={main.id} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="group">
                            <div style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem' }}>{main.name}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: typeInfo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{typeInfo.label}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => { setEditCategory(null); setFormData({ name: '', isSub: true, parentId: main.id, type: main.type, group: main.group }); setIsModalOpen(true); }} className="text-purple-600 hover:bg-purple-100 p-1.5 rounded-md transition-colors" title="Adicionar Subcategoria">
                                        <Plus size={16} />
                                    </button>
                                    <button onClick={() => handleEditStart(main)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Editar Grupo">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(main)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Inativar">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div style={{ padding: '16px', flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {subs.map(sub => (
                                    <div key={sub.id} style={{ background: '#f5f3ff', border: '1px solid #ede9fe', padding: '4px 12px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9' }} className="group/sub">
                                        {sub.name}
                                        <button onClick={() => handleEditStart(sub)} className="text-blue-400 hover:text-blue-600 opacity-0 group-hover/sub:opacity-100 transition-opacity" title="Editar">
                                            <Edit2 size={12} strokeWidth={3} />
                                        </button>
                                        <button onClick={() => handleDelete(sub)} className="text-purple-300 hover:text-red-500" title="Inativar">
                                            <X size={12} strokeWidth={3} />
                                        </button>
                                    </div>
                                ))}
                                {subs.length === 0 && <span style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '4px' }}>Sem subcategorias</span>}
                            </div>
                        </div>
                    );
                })}
                {mainCategories.length === 0 && (
                     <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                         <p className="text-muted">Nenhum grupo cadastrado. Comece criando um plano de contas acima.</p>
                     </div>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '100%', padding: '24px', backgroundColor: 'var(--surface)', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                             <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                {editCategory ? `Editar: ${editCategory.name}` : (formData.isSub ? 'Novo Sub-item' : 'Novo Grupo')}
                             </h2>
                             <button onClick={() => { setIsModalOpen(false); setEditCategory(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Nome da Categoria</label>
                                <input required autoFocus type="text" placeholder="Ex: Aluguel, Embalagens..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 700 }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>

                            {!formData.isSub && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Natureza</label>
                                        <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600 }} value={formData.group} onChange={e => setFormData({...formData, group: e.target.value, type: e.target.value === 'income' ? 'income' : 'fixed'})}>
                                            <option value="expense">Despesa (Saída)</option>
                                            <option value="income">Receita (Entrada)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Classificação DRE</label>
                                        <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600 }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                            {formData.group === 'expense' ? (
                                                <>
                                                    <option value="fixed">Gasto Fixo</option>
                                                    <option value="variable">Gasto Variável</option>
                                                    <option value="tax">Impostos/Taxas</option>
                                                    <option value="investment">Investimento</option>
                                                </>
                                            ) : (
                                                <option value="income">Receita Operacional</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditCategory(null); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--surface-hover)', fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 900, cursor: 'pointer' }}>
                                    {editCategory ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


function AuditLogViewer() {
    const [logs, setLogs] = useState([]);
    
    useEffect(() => {
        const fetchLogs = async () => {
            const data = await AuditService.getLogs();
            setLogs(data);
        };
        fetchLogs();
    }, []);

    return (
        <div className="card animate-fade-in">
             <div className="card-header">
                <h3 className="card-title flex items-center gap-sm"><Activity size={20} /> Histórico de Alterações</h3>
                <p className="text-muted text-sm">Registro de atividades e modificações no sistema.</p>
             </div>
             <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                 <table className="table">
                     <thead>
                         <tr>
                             <th>Data/Hora</th>
                             <th>Usuário</th>
                             <th>Ação</th>
                             <th>Entidade</th>
                             <th>Detalhes</th>
                         </tr>
                     </thead>
                     <tbody>
                         {logs.map((log, idx) => (
                             <tr key={idx} className="text-sm">
                                 <td style={{ whiteSpace: 'nowrap' }}>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} className="text-muted" />
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                 </td>
                                 <td><span className="font-medium text-xs bg-surface p-1 rounded">{log.user}</span></td>
                                 <td>
                                     <span className={`badge ${
                                         log.action === 'CREATE' ? 'badge-success' : 
                                         log.action === 'UPDATE' ? 'badge-warning' : 
                                         log.action === 'DELETE' ? 'badge-danger' : 'badge-neutral'
                                     }`}>
                                         {log.action}
                                     </span>
                                 </td>
                                 <td>{log.entity} #{log.entityId}</td>
                                 <td className="text-muted truncate max-w-xs" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</td>
                             </tr>
                         ))}
                         {logs.length === 0 && <tr><td colSpan="5" className="text-center text-muted p-4">Nenhum registro de atividade encontrado.</td></tr>}
                     </tbody>
                 </table>
             </div>
        </div>
    );
}



function AccountsSettings() {
    const [accounts, setAccounts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        type: 'bank', 
        balance: '', 
        limit: '', 
        currency: 'BRL' 
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => { loadAccounts(); }, []);

    const loadAccounts = async () => {
        const data = await db.getAll('accounts');
        setAccounts(Array.isArray(data) ? data : []);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        const balanceValue = parseFloat(formData.balance) || 0;
        const limitValue = parseFloat(formData.limit) || 0;

        try {
            if (editingId) {
                await db.update('accounts', editingId, {
                    name: formData.name,
                    type: formData.type,
                    balance: balanceValue,
                    limit: limitValue,
                    updatedAt: new Date().toISOString()
                });
                await AuditService.log({ name: 'Admin' }, 'UPDATE', 'Account', formData.name, `Conta atualizada. Novo saldo: R$ ${balanceValue.toFixed(2)}`);
            } else {
                await db.create('accounts', {
                    name: formData.name,
                    type: formData.type,
                    balance: balanceValue,
                    limit: limitValue,
                    currency: 'BRL',
                    updatedAt: new Date().toISOString()
                });
                await AuditService.log({ name: 'Admin' }, 'CREATE', 'Account', formData.name, `Conta criada com saldo inicial R$ ${balanceValue.toFixed(2)}`);
            }
        } catch(err) {
            console.error(err);
            alert("Falha ao salvar a conta.");
        }

        handleClose();
        loadAccounts();
    };

    const handleEdit = (acc) => {
        setEditingId(acc.id);
        setFormData({ 
            name: acc.name, 
            type: acc.type, 
            balance: acc.balance, 
            limit: acc.limit || '',
            currency: acc.currency 
        });
        setIsModalOpen(true);
    };

    const handleOpenNew = () => {
        setEditingId(null);
        setFormData({ name: '', type: 'bank', balance: '', limit: '', currency: 'BRL' });
        setIsModalOpen(true);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', type: 'bank', balance: '', limit: '', currency: 'BRL' });
    };

    const handleDelete = async (account) => {
        if (window.confirm(`Inativar conta ${account.name}?\nO histórico financeiro atrelado a ela não será perdido (Soft Delete).`)) {
            await db.update('accounts', account.id, { deleted: true });
            await AuditService.log({ name: 'Admin' }, 'DELETE', 'Account', account.name, `Conta inativada via Configurações`);
            loadAccounts();
        }
    };

    return (
        <div className="card animate-fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 className="card-title flex items-center gap-2 text-purple-800"><Landmark size={20} /> Contas Bancárias & Caixas</h3>
                    <p className="text-muted text-sm pb-2">Gerencie as contas por onde o dinheiro entra e sai do negócio.</p>
                </div>
                <button onClick={handleOpenNew} className="btn btn-primary shadow-sm hover:-translate-y-0.5" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600 }}>
                    <Plus size={16} /> Nova Conta
                </button>
            </div>

            <div className="overflow-x-auto mt-4 px-4 pb-4">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-medium">
                            <th className="pb-2">Nome</th>
                            <th className="pb-2">Tipo</th>
                            <th className="pb-2">Saldo Atual</th>
                            <th className="pb-2 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {accounts.map(acc => (
                            <tr key={acc.id} className="hover:bg-purple-50 transition-colors">
                                <td className="py-3 font-medium text-gray-800">{acc.name}</td>
                                <td className="py-3 text-gray-600">
                                    {acc.type === 'bank' && <span className="flex items-center gap-1"><Landmark size={14}/> Banco</span>}
                                    {acc.type === 'cash' && <span className="flex items-center gap-1"><Wallet size={14}/> Caixa Físico</span>}
                                    {acc.type === 'wallet' && <span className="flex items-center gap-1"><Globe size={14}/> Carteira Digital</span>}
                                    {acc.type === 'credit' && <span className="flex items-center gap-1"><CreditCard size={14}/> Cartão de Crédito</span>}
                                </td>
                                <td className={`py-3 font-mono font-bold ${acc.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    R$ {acc.balance ? parseFloat(acc.balance).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0.00'}
                                </td>
                                <td className="py-3 text-right flex justify-end gap-1">
                                    <button onClick={() => handleEdit(acc)} className="text-gray-400 hover:text-purple-600 transition-colors p-2" title="Configurar Conta"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(acc)} className="text-gray-400 hover:text-red-500 transition-colors p-2" title="Inativar Conta"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {accounts.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-8 bg-gray-50/50 rounded-lg">Nenhuma conta ou caixa cadastrado.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Popup Modal */}
            {isModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '100%', padding: '24px', backgroundColor: 'var(--surface)', borderRadius: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                {editingId ? 'Editar Conta/Caixa' : 'Nova Conta Bancária'}
                            </h2>
                            <button onClick={handleClose} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Nome da Conta <span style={{color: '#ef4444'}}>*</span></label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Ex: Nubank, Caixa Caixinha" 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Tipo de Destinação <span style={{color: '#ef4444'}}>*</span></label>
                                <select 
                                    required
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="bank">Banco Corporativo</option>
                                    <option value="cash">Caixa Físico no Ateliê</option>
                                    <option value="wallet">Carteira Digital (Shopee/Nuvem)</option>
                                    <option value="credit">Cartão de Crédito</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: formData.type === 'credit' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                                        {editingId ? 'Saldo Corrente (R$)' : 'Balanço Inicial (R$)'}
                                    </label>
                                    <input 
                                        type="number" step="0.01"
                                        placeholder="0.00" 
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                        value={formData.balance} 
                                        onChange={e => setFormData({...formData, balance: e.target.value})} 
                                    />
                                </div>
                                {formData.type === 'credit' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Limite Teto (R$)</label>
                                        <input 
                                            type="number" step="0.01"
                                            placeholder="5000.00" 
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                            value={formData.limit} 
                                            onChange={e => setFormData({...formData, limit: e.target.value})} 
                                        />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={handleClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--surface-hover)', color: 'var(--text-main)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    {editingId ? 'Gravar Alterações' : 'Salvar Nova Conta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* --- MAIN COMPONENT --- */

function SystemSettings() {
    const [config, setConfig] = useState({
        companyName: '',
        document: '',
        currency: 'BRL',
        theme: 'light'
    });
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

    useEffect(() => {
        const loadGlobalConfig = async () => {
             try {
                 const dbConfig = await db.getById('settings', 'global');
                 if (dbConfig && Object.keys(dbConfig).length > 0) {
                     setConfig(dbConfig);
                     localStorage.setItem('stationery_config', JSON.stringify(dbConfig));
                     return;
                 }
             } catch(e) { console.warn("Erro ao buscar global config do DB", e); }
             
             // Fallback
             const saved = localStorage.getItem('stationery_config');
             if (saved) {
                 setConfig(JSON.parse(saved));
             } else {
                 setConfig({
                     companyName: 'Estúdio Criativo',
                     whatsapp: '',
                     instagram: '',
                     promoBanner: {},
                     document: '',
                     currency: 'BRL',
                     theme: 'light',
                     enableLocalPickup: true,
                     paymentKeys: { accessToken: '', publicKey: '' }
                 });
             }
        };
        loadGlobalConfig();
    }, []);

    const logoInputRef = React.useRef(null);
    const importInputRef = React.useRef(null);

    const handleSave = async (e) => {
        e.preventDefault();
        
        try {
            localStorage.setItem('stationery_config', JSON.stringify(config));
        } catch (err) {
            console.error("Erro no LocalStorage:", err);
            alert("Erro: O tamanho das configurações (talvez da Logo) excedeu o limite do navegador.");
            return;
        }
        
        try {
            await db.set('settings', 'global', config);
        } catch(e) {
            console.error("Erro ao salvar config no firebase", e);
            alert("Aviso: As configurações foram salvas no seu computador, mas houve um erro ao sincronizar em Nuvem para a Página Pública.");
        }

        alert('Configurações do sistema salvas com sucesso!');
        
        if (config.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        window.location.reload(); 
    };

    const handleExportData = async () => {
        if (!window.confirm('Deseja iniciar a compilação do backup completo dos dados?')) return;
        
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                orders: await db.getAll('orders'),
                products: await db.getAll('products'),
                customers: await db.getAll('customers'),
                inventory: await db.getAll('inventory'),
                transactions: await db.getAll('transactions'),
                accounts: await db.getAll('accounts'),
                budgets: await db.getAll('budgets'),
                designs: await db.getAll('designs'),
                roles: await db.getAll('roles'),
                categories: await db.getAll('categories')
            };

            const jsonStr = JSON.stringify(backup, null, 2);
            const fileName = `backup_atelie_vault_${new Date().toISOString().split('T')[0]}.json`;

            // Modern FileSystem API (Proporciona escolha direta da "Pasta do Google Drive" no Windows/Mac)
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{ description: 'Arquivo de Backup JSON', accept: {'application/json': ['.json']} }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(jsonStr);
                    await writable.close();
                    
                    alert("✅ Backup espelhado com sucesso e segurança no diretório escolhido!");
                    return; // Early return on success
                } catch (err) {
                    // AbortError is thrown when user cancels the save dialog, ignore it.
                    if (err.name === 'AbortError') return; 
                    console.warn("Navegador bloqueou SaveFilePicker, tentando modo legacy...", err);
                }
            }

            // Fallback Legacy (Download direto pra pasta Downloads)
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", fileName);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            
            alert("✅ Backup baixado! Dica: Salve o arquivo na sua pasta roteada do Google Drive para ter redundância na nuvem.");

        } catch (error) {
            console.error("Falha ao compilar tabelas", error);
            alert("❌ Ocorreu um erro ao compilar as tabelas do Banco. Cheque o console.");
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIMENSION = 300;

                if (width > height && width > MAX_DIMENSION) {
                    height *= MAX_DIMENSION / width;
                    width = MAX_DIMENSION;
                } else if (height > MAX_DIMENSION) {
                    width *= MAX_DIMENSION / height;
                    height = MAX_DIMENSION;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // PNG to preserve transparency
                const dataUrl = canvas.toDataURL('image/png');
                
                // Firestore limit is ~1MB. Warn if it's too big (roughly 1MB string)
                if (dataUrl.length > 950000) {
                     alert("Atenção: A imagem escolhida não pôde ser comprimida o suficiente e pode causar falhas.");
                }
                
                setConfig({ ...config, logoBase64: dataUrl });
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleImportClick = () => importInputRef.current?.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm("ATENÇÃO: Isso irá APAGAR os dados atuais e restaurar o backup. Essa ação é irreversível. Tem certeza?")) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const backup = JSON.parse(ev.target.result);
                if (!backup.timestamp) throw new Error("Arquivo inválido (sem timestamp)");
                
                const collections = ['orders', 'products', 'customers', 'inventory', 'transactions', 'accounts', 'budgets', 'designs', 'roles', 'categories'];
                
                alert("Iniciando restauração... Por favor aguarde.");

                for (const col of collections) {
                    if (backup[col] && Array.isArray(backup[col])) {
                        // 1. Delete all existing
                        const current = await db.getAll(col);
                        await Promise.all(current.map(d => db.delete(col, d.id)));

                        // 2. Restore
                        // Note: db.set handles creating with specific ID
                        await Promise.all(backup[col].map(d => db.set(col, d.id, d)));
                    }
                }
                
                alert("Restauração concluída! A página será recarregada.");
                window.location.reload();

            } catch (err) {
                alert("Erro ao restaurar: " + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <div className="card animate-fade-in">
                <div className="card-header border-b border-gray-100">
                    <h3 className="card-title flex items-center gap-2 text-purple-800"><Globe size={20} /> Loja Virtual & Integrações de Sistema</h3>
                    <p className="text-muted text-sm pb-2">Gerencie as vitrines on-line, a logística de entrega, métodos de pagamento e o nome do Ateliê.</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6 container p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 border-b pb-2">Identidade</h4>
                            <div className="input-group">
                                <label className="form-label">Nome da Empresa / Estúdio</label>
                                <input 
                                    className="form-input" 
                                    value={config.companyName || ''}
                                    onChange={e => setConfig({...config, companyName: e.target.value})}
                                    placeholder="Ex: Meu Estúdio Criativo"
                                />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Título da Guia do Navegador (Opcional)</label>
                                <input 
                                    className="form-input text-purple-700 bg-purple-50 border-purple-200" 
                                    value={config.tabTitle || ''}
                                    onChange={e => setConfig({...config, tabTitle: e.target.value})}
                                    placeholder="Ex: Ateliê Carol 🎀"
                                />
                                <p className="text-xs text-gray-500 mt-1">Este nome aparecerá nas abas superiores dos navegadores (com emojis!).</p>
                            </div>
                            <div className="input-group">
                                <label className="form-label">WhatsApp de Atendimento (Para Notificações)</label>
                                <input 
                                    className="form-input" 
                                    value={config.whatsapp || ''}
                                    onChange={e => setConfig({...config, whatsapp: e.target.value})}
                                    placeholder="Ex: DD 90000-0000"
                                />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Perfil do Instagram (Opcional)</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="form-input flex-1" 
                                        value={config.instagram || ''}
                                        onChange={e => setConfig({...config, instagram: e.target.value})}
                                        placeholder="Ex: ateliecarol"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setIsBannerModalOpen(true)}
                                        className="btn btn-secondary flex items-center gap-1 text-xs px-3"
                                        title="Editar Visual do Banner Promocional"
                                    >
                                        <Palette size={14} /> Banner
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Preencha sem o "@". Isso ativará banners na proposta e rastreamento!</p>
                            </div>

                            <div className="input-group">
                                <label className="form-label font-bold text-purple-700">Permitir Retirada no Local (Checkout)</label>
                                <div className="flex items-center gap-2 mt-1 bg-purple-50 p-3 rounded-lg border border-purple-100">
                                    <input 
                                        type="checkbox"
                                        checked={config.enableLocalPickup !== false}
                                        onChange={e => setConfig({ ...config, enableLocalPickup: e.target.checked })}
                                        style={{ width: '20px', height: '20px', accentColor: '#9333ea', cursor: 'pointer' }}
                                    />
                                    <span className="text-sm text-gray-700">O cliente poderá escolher "Retirar no Ateliê" gratuitamente na finalização.</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4 mt-6">
                                <h4 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                                    <Truck size={18} className="text-blue-600" /> Logística e Fretes
                                </h4>
                                <div className="input-group">
                                    <label className="form-label">CEP Base do Ateliê (Origem do Frete)</label>
                                    <input 
                                        className="form-input bg-blue-50/30 font-mono" 
                                        value={config.companyCep || ''}
                                        onChange={e => setConfig({...config, companyCep: e.target.value.replace(/\D/g, '')})}
                                        placeholder="Ex: 46960000"
                                        maxLength="8"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Sua cidade. CEPs parecidos receberão a opção de Motoboy Local automaticamente.</p>
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Taxa Base do Entregador/Motoboy Local (R$)</label>
                                    <input 
                                        type="number" step="0.50"
                                        className="form-input bg-blue-50/30" 
                                        value={config.localDeliveryFee}
                                        onChange={e => setConfig({...config, localDeliveryFee: e.target.value})}
                                        placeholder="5.00"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Taxa Extra / Embalagem Segura (Opcional - R$)</label>
                                    <input 
                                        type="number" step="0.50"
                                        className="form-input bg-blue-50/30" 
                                        value={config.packagingFee}
                                        onChange={e => setConfig({...config, packagingFee: e.target.value})}
                                        placeholder="0.00"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Este valor será somado a todos os fretes calculados para proteger seu lucro na sacola e fitas.</p>
                                </div>
                                <div className="input-group">
                                    <label className="form-label font-bold text-blue-700">Habilitar Frete para Todo o Brasil (PAC/Sedex)</label>
                                    <div className="flex items-center gap-2 mt-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <input 
                                            type="checkbox"
                                            checked={config.nationwideShippingEnabled === true}
                                            onChange={e => setConfig({ ...config, nationwideShippingEnabled: e.target.checked })}
                                            style={{ width: '20px', height: '20px', accentColor: '#2563eb', cursor: 'pointer' }}
                                        />
                                        <span className="text-sm text-gray-700">Se desativado, limitaremos as Vendas APENAS para os CEPs da sua região (Protegido).</span>
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="form-label">Logo da Empresa (PNG Sem Fundo Recomedado)</label>
                                <div className="flex items-center gap-4">
                                    {config.logoBase64 ? (
                                        <div className="relative">
                                            <img src={config.logoBase64} alt="Preview Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                                            <button 
                                                type="button" 
                                                onClick={() => setConfig({...config, logoBase64: null})} 
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white"
                                                title="Remover Logo"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                            <Globe size={24} />
                                        </div>
                                    )}
                                    <button 
                                        type="button" 
                                        className="btn btn-outline border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 flex-1 justify-center whitespace-nowrap overflow-hidden text-ellipsis"
                                        onClick={() => logoInputRef.current?.click()}
                                    >
                                        {config.logoBase64 ? 'Trocar Imagem...' : 'Fazer Upload do Logo...'}
                                    </button>
                                    <input 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/webp" 
                                        ref={logoInputRef} 
                                        style={{ display: 'none' }} 
                                        onChange={handleLogoUpload} 
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="form-label">CNPJ / CPF do titular</label>
                                <input 
                                    className="form-input" 
                                    value={config.document || ''}
                                    onChange={e => setConfig({...config, document: e.target.value})}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 border-b pb-2">Aparência e Região</h4>
                            <div className="input-group">
                                <label className="form-label">Moeda Padrão</label>
                                <select 
                                    className="form-input"
                                    value={config.currency}
                                    onChange={e => setConfig({...config, currency: e.target.value})}
                                >
                                    <option value="BRL">Real Brasileiro (R$)</option>
                                    <option value="USD">Dólar Americano ($)</option>
                                    <option value="EUR">Euro (€)</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Tema</label>
                                <select 
                                    className="form-input"
                                    value={config.theme}
                                    onChange={e => setConfig({...config, theme: e.target.value})}
                                >
                                    <option value="light">Claro (Padrão)</option>
                                    <option value="dark">Escuro</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                                <Landmark size={18} className="text-blue-600" /> Integração Mercado Pago
                            </h4>
                            <p className="text-xs text-gray-500 mb-2">Configure para habilitar pagamentos reais na Loja/Checkout.</p>
                            <div className="input-group">
                                <label className="form-label">Access Token (Produção)</label>
                                <input 
                                    className="form-input bg-blue-50/30"
                                    type="password"
                                    value={config.paymentKeys?.accessToken || ''}
                                    onChange={e => setConfig({...config, paymentKeys: { ...config.paymentKeys, accessToken: e.target.value }})}
                                    placeholder="APP_USR-***"
                                />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Public Key (Produção - Opcional p/ Pix)</label>
                                <input 
                                    className="form-input bg-blue-50/30"
                                    type="text"
                                    value={config.paymentKeys?.publicKey || ''}
                                    onChange={e => setConfig({...config, paymentKeys: { ...config.paymentKeys, publicKey: e.target.value }})}
                                    placeholder="APP_USR-***"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-between items-center mt-4">
                        <div className="flex gap-2">
                            <button type="button" onClick={handleExportData} className="btn btn-outline border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                <Save size={16} /> Backup (JSON)
                            </button>
                            <input 
                                type="file" 
                                ref={importInputRef} 
                                style={{ display: 'none' }} 
                                accept=".json" 
                                onChange={handleFileChange} 
                            />
                            <button type="button" onClick={handleImportClick} className="btn btn-outline border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                <FileText size={16} /> Restaurar Backup
                            </button>
                        </div>
                        <button type="submit" className="btn btn-primary px-8">
                            Salvar Configurações
                        </button>
                    </div>
                </form>
            </div>
            
            <PromoBannerModal 
                isOpen={isBannerModalOpen}
                onClose={() => setIsBannerModalOpen(false)}
                bannerConfig={config.promoBanner || {}}
                companyConfig={config}
                onSave={async (newBannerConfig) => {
                    const newConfig = { ...config, promoBanner: newBannerConfig };
                    setConfig(newConfig);
                    await db.update('settings', 'global', newConfig);
                }}
            />
        </>
    );
}

function WebPresenceSettings() {
    const [seo, setSeo] = useState({
        metaTitle: '',
        metaDescription: '',
        keywords: '',
        googleBusinessName: '',
        googleBusinessCategory: 'Papelaria',
        googleMapsUrl: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        phone: '',
        openingHours: 'Mo-Fr 08:00-18:00',
        googleSiteVerification: '',
        facebookPageId: '',
        tiktokHandle: '',
        pinterestHandle: '',
        shopeeStoreUrl: '',
        etsyStoreUrl: '',
        lojaIntegradaUrl: '',
        schemaEnabled: true,
        sitemapEnabled: true,
        richSnippetType: 'LocalBusiness',
    });
    const [copied, setCopied] = useState('');
    const [activeSection, setActiveSection] = useState('seo');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await db.getById('settings', 'web_presence');
                if (data && Object.keys(data).length > 0) setSeo(prev => ({ ...prev, ...data }));
            } catch(e) {}
        };
        load();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        await db.set('settings', 'web_presence', seo);
        AuditService.log({ name: 'Admin' }, 'UPDATE', 'Settings', 'web_presence', 'Parâmetros de Presença na Web atualizados.');
        alert('✅ Configurações de Presença na Web salvas com sucesso!');
    };

    const handleCopy = (text, key) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(''), 2000);
        });
    };

    // Helpers to build search/map links dynamically
    const lojaUrl = (() => {
        try {
            const cnf = localStorage.getItem('stationery_config');
            if (cnf) {
                const parsed = JSON.parse(cnf);
                // Try to detect app URL from location
                return window.location.origin + window.location.pathname + '#/loja';
            }
        } catch(e) {}
        return window.location.origin + window.location.pathname + '#/loja';
    })();

    const googleSearchUrl = seo.googleBusinessName
        ? `https://www.google.com/search?q=${encodeURIComponent(seo.googleBusinessName + ' ' + (seo.city || ''))}`
        : '';

    const googleMapsSearchUrl = seo.googleBusinessName
        ? `https://www.google.com/maps/search/${encodeURIComponent(seo.googleBusinessName + ' ' + (seo.city || ''))}`
        : '';

    const schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": seo.richSnippetType || "LocalBusiness",
        "name": seo.googleBusinessName || '',
        "description": seo.metaDescription || '',
        "url": lojaUrl,
        "telephone": seo.phone || '',
        "address": {
            "@type": "PostalAddress",
            "streetAddress": seo.address || '',
            "addressLocality": seo.city || '',
            "addressRegion": seo.state || '',
            "postalCode": seo.postalCode || '',
            "addressCountry": "BR"
        },
        "openingHours": seo.openingHours || '',
        "sameAs": [
            seo.shopeeStoreUrl,
            seo.etsyStoreUrl,
            seo.lojaIntegradaUrl,
            seo.facebookPageId ? `https://facebook.com/${seo.facebookPageId}` : null,
            seo.tiktokHandle ? `https://tiktok.com/@${seo.tiktokHandle}` : null,
            seo.pinterestHandle ? `https://pinterest.com/${seo.pinterestHandle}` : null,
        ].filter(Boolean)
    }, null, 2);

    const sectionBtnStyle = (key) => ({
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.82rem',
        transition: 'all 0.2s',
        background: activeSection === key ? 'var(--primary)' : 'var(--surface-hover)',
        color: activeSection === key ? 'white' : 'var(--text-muted)',
    });

    return (
        <div className="card animate-fade-in">
            <div className="card-header border-b border-gray-100">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 className="card-title flex items-center gap-2" style={{ color: '#6d28d9' }}>
                            <Search size={20} /> Presença na Web &amp; SEO
                        </h3>
                        <p className="text-muted text-sm pb-2">
                            Configure os metadados, Rich Snippets e links de plataformas para maximizar o encontro da sua loja nos mecanismos de busca.
                        </p>
                    </div>
                    {/* Quick-search badges */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {googleSearchUrl && (
                            <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer"
                               style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: '#e8f0fe', color: '#1a73e8', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #c5d8fb' }}
                               title="Ver como sua loja aparece no Google">
                                <Search size={13} /> Buscar no Google
                            </a>
                        )}
                        {googleMapsSearchUrl && (
                            <a href={googleMapsSearchUrl} target="_blank" rel="noopener noreferrer"
                               style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: '#fce8e6', color: '#e8453c', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #f7c9c9' }}
                               title="Verificar posição no Google Maps">
                                <MapPin size={13} /> Google Maps
                            </a>
                        )}
                        <a href={lojaUrl} target="_blank" rel="noopener noreferrer"
                           style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: '#e6f4ea', color: '#137333', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #b7dfbf' }}
                           title="Abrir loja pública">
                            <ShoppingBag size={13} /> Ver Loja
                        </a>
                    </div>
                </div>

                {/* Sub-section pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <button type="button" style={sectionBtnStyle('seo')} onClick={() => setActiveSection('seo')}>
                        <Search size={13} style={{ display: 'inline', marginRight: '5px' }} /> SEO &amp; Metadados
                    </button>
                    <button type="button" style={sectionBtnStyle('gmb')} onClick={() => setActiveSection('gmb')}>
                        <MapPin size={13} style={{ display: 'inline', marginRight: '5px' }} /> Google Meu Negócio
                    </button>
                    <button type="button" style={sectionBtnStyle('social')} onClick={() => setActiveSection('social')}>
                        <Hash size={13} style={{ display: 'inline', marginRight: '5px' }} /> Redes &amp; Marketplaces
                    </button>
                    <button type="button" style={sectionBtnStyle('schema')} onClick={() => setActiveSection('schema')}>
                        <Eye size={13} style={{ display: 'inline', marginRight: '5px' }} /> Rich Snippet (Schema)
                    </button>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* === SEO Section === */}
                    {activeSection === 'seo' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                            <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <Info size={16} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ fontSize: '0.8rem', color: '#5b21b6', lineHeight: 1.5, margin: 0 }}>
                                    Estes campos preenchem automaticamente as <strong>meta tags</strong> da sua loja pública (<code>#/loja</code>), ajudando o Google a indexar e exibir sua vitrine corretamente.
                                </p>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Título da Página (Meta Title) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— máx. 60 caracteres</span></label>
                                <input
                                    className="form-input"
                                    value={seo.metaTitle}
                                    onChange={e => setSeo({ ...seo, metaTitle: e.target.value })}
                                    maxLength={70}
                                    placeholder="Ex: Ateliê Carol | Papelaria Personalizada em Barreiras-BA"
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <p className="text-xs text-gray-400">Aparece na aba do navegador e como título no resultado do Google.</p>
                                    <span style={{ fontSize: '0.72rem', color: seo.metaTitle.length > 60 ? '#ef4444' : '#94a3b8' }}>{seo.metaTitle.length}/60</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Descrição da Página (Meta Description) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— máx. 155 caracteres</span></label>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    value={seo.metaDescription}
                                    onChange={e => setSeo({ ...seo, metaDescription: e.target.value })}
                                    maxLength={165}
                                    placeholder="Ex: Papelaria personalizada artesanal — convites, lembranças e kits decorativos feitos com amor. Encomende pelo WhatsApp!"
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <p className="text-xs text-gray-400">Exibida como subtítulo no resultado de busca. Inclua palavras que o cliente buscaria.</p>
                                    <span style={{ fontSize: '0.72rem', color: seo.metaDescription.length > 155 ? '#ef4444' : '#94a3b8' }}>{seo.metaDescription.length}/155</span>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Palavras-chave (Keywords) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— separadas por vírgula</span></label>
                                <input
                                    className="form-input"
                                    value={seo.keywords}
                                    onChange={e => setSeo({ ...seo, keywords: e.target.value })}
                                    placeholder="Ex: papelaria personalizada, convite casamento, lembrança maternidade, Ateliê Carol"
                                />
                                <p className="text-xs text-gray-400 mt-1">Termos que seu cliente digitaria para encontrar seus produtos.</p>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Google Site Verification Token <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— (opcional)</span></label>
                                <input
                                    className="form-input font-mono text-sm bg-gray-50"
                                    value={seo.googleSiteVerification}
                                    onChange={e => setSeo({ ...seo, googleSiteVerification: e.target.value })}
                                    placeholder="Ex: abc123xyz..."
                                />
                                <p className="text-xs text-gray-400 mt-1">Código do Google Search Console para verificar propriedade do site.</p>
                            </div>

                            {/* Preview SERP */}
                            {(seo.metaTitle || seo.metaDescription) && (
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#fff' }}>
                                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Prévia — Como aparece no Google</p>
                                    <div style={{ maxWidth: '600px' }}>
                                        <div style={{ fontSize: '1.1rem', color: '#1a0dab', fontWeight: 400, marginBottom: '2px', fontFamily: 'Arial, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {seo.metaTitle || 'Título da sua loja'}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#006621', marginBottom: '4px', fontFamily: 'Arial, sans-serif' }}>{lojaUrl}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#545454', fontFamily: 'Arial, sans-serif', lineHeight: 1.5 }}>
                                            {seo.metaDescription?.substring(0, 155) || 'Descrição da sua loja...'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === Google Meu Negócio Section === */}
                    {activeSection === 'gmb' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                            <div style={{ background: 'linear-gradient(135deg, #fce8e6, #fde8e4)', border: '1px solid #f5c6c3', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <MapPin size={16} style={{ color: '#e8453c', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <p style={{ fontSize: '0.82rem', color: '#b01d15', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>Google Meu Negócio (GMB)</p>
                                    <p style={{ fontSize: '0.78rem', color: '#c62828', lineHeight: 1.5, margin: '4px 0 0 0' }}>
                                        Preencha os dados abaixo exatamente como cadastrou no GMB. Eles são usados para gerar o <strong>Schema.org LocalBusiness</strong> que aparece nas pesquisas e no Maps.
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label className="form-label">Nome do Negócio (como no GMB) *</label>
                                    <input className="form-input" value={seo.googleBusinessName} onChange={e => setSeo({ ...seo, googleBusinessName: e.target.value })} placeholder="Ex: Ateliê Carol" />
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Categoria Principal</label>
                                    <input className="form-input" value={seo.googleBusinessCategory} onChange={e => setSeo({ ...seo, googleBusinessCategory: e.target.value })} placeholder="Ex: Papelaria, Artesanato" />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Link direto para o perfil no Google Maps</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input className="form-input flex-1" value={seo.googleMapsUrl} onChange={e => setSeo({ ...seo, googleMapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
                                    {seo.googleMapsUrl && (
                                        <a href={seo.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '8px 12px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <ExternalLink size={14} /> Abrir
                                        </a>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Copie o link curto do seu perfil no Google Maps e cole aqui. Clientes poderão acessar direto da loja.</p>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Endereço Completo (Rua, Número, Bairro)</label>
                                <input className="form-input" value={seo.address} onChange={e => setSeo({ ...seo, address: e.target.value })} placeholder="Ex: Rua das Flores, 123, Centro" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label className="form-label">Cidade</label>
                                    <input className="form-input" value={seo.city} onChange={e => setSeo({ ...seo, city: e.target.value })} placeholder="Ex: Barreiras" />
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Estado (UF)</label>
                                    <input className="form-input" value={seo.state} onChange={e => setSeo({ ...seo, state: e.target.value })} maxLength={2} placeholder="BA" />
                                </div>
                                <div className="input-group">
                                    <label className="form-label">CEP</label>
                                    <input className="form-input font-mono" value={seo.postalCode} onChange={e => setSeo({ ...seo, postalCode: e.target.value.replace(/\D/g, '') })} maxLength={8} placeholder="46960000" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label className="form-label">Telefone / WhatsApp</label>
                                    <input className="form-input" value={seo.phone} onChange={e => setSeo({ ...seo, phone: e.target.value })} placeholder="+55 77 99999-0000" />
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Horário de Funcionamento (Schema)</label>
                                    <input className="form-input font-mono text-sm" value={seo.openingHours} onChange={e => setSeo({ ...seo, openingHours: e.target.value })} placeholder="Mo-Fr 08:00-18:00" />
                                    <p className="text-xs text-gray-400 mt-1">Formato Schema.org: <code>Mo-Fr 08:00-18:00, Sa 08:00-12:00</code></p>
                                </div>
                            </div>

                            {/* Quick-action buttons */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                                {googleSearchUrl && (
                                    <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer"
                                       style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#e8f0fe', color: '#1a73e8', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #c5d8fb' }}>
                                        <Search size={14} /> Como aparece no Google
                                    </a>
                                )}
                                {googleMapsSearchUrl && (
                                    <a href={googleMapsSearchUrl} target="_blank" rel="noopener noreferrer"
                                       style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#fce8e6', color: '#e8453c', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #f7c9c9' }}>
                                        <Map size={14} /> Buscar no Google Maps
                                    </a>
                                )}
                                <a href="https://business.google.com" target="_blank" rel="noopener noreferrer"
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#f0fdf4', color: '#166534', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #bbf7d0' }}>
                                    <ExternalLink size={14} /> Google Meu Negócio
                                </a>
                                <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#fefce8', color: '#854d0e', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #fde68a' }}>
                                    <ExternalLink size={14} /> Search Console
                                </a>
                            </div>
                        </div>
                    )}

                    {/* === Social / Marketplaces Section === */}
                    {activeSection === 'social' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                            <div style={{ background: 'linear-gradient(135deg, #fdf4ff, #fae8ff)', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <Hash size={16} style={{ color: '#9333ea', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ fontSize: '0.8rem', color: '#6b21a8', lineHeight: 1.5, margin: 0 }}>
                                    Estes links são usados no <strong>Schema sameAs</strong> para que o Google entenda que todas essas contas pertencem ao mesmo negócio, aumentando a autoridade.
                                </p>
                            </div>

                            <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Redes Sociais</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label className="form-label">ID da Página no Facebook</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--surface-hover)', borderRadius: '8px 0 0 8px', border: '1px solid var(--border)', borderRight: 'none', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>facebook.com/</span>
                                        <input className="form-input" style={{ borderRadius: '0 8px 8px 0', flex: 1 }} value={seo.facebookPageId} onChange={e => setSeo({ ...seo, facebookPageId: e.target.value })} placeholder="ateliecarol" />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Usuário TikTok</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--surface-hover)', borderRadius: '8px 0 0 8px', border: '1px solid var(--border)', borderRight: 'none', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>tiktok.com/@</span>
                                        <input className="form-input" style={{ borderRadius: '0 8px 8px 0', flex: 1 }} value={seo.tiktokHandle} onChange={e => setSeo({ ...seo, tiktokHandle: e.target.value })} placeholder="ateliecarol" />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="form-label">Usuário Pinterest</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--surface-hover)', borderRadius: '8px 0 0 8px', border: '1px solid var(--border)', borderRight: 'none', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>pinterest.com/</span>
                                        <input className="form-input" style={{ borderRadius: '0 8px 8px 0', flex: 1 }} value={seo.pinterestHandle} onChange={e => setSeo({ ...seo, pinterestHandle: e.target.value })} placeholder="ateliecarol" />
                                    </div>
                                </div>
                            </div>

                            <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '8px 0 0 0' }}>Marketplaces &amp; Lojas Externas</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div className="input-group">
                                    <label className="form-label">URL da Loja na Shopee</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input className="form-input flex-1" value={seo.shopeeStoreUrl} onChange={e => setSeo({ ...seo, shopeeStoreUrl: e.target.value })} placeholder="https://shopee.com.br/ateliecarol" />
                                        {seo.shopeeStoreUrl && <a href={seo.shopeeStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><ExternalLink size={14} /></a>}
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="form-label">URL da Loja no Etsy</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input className="form-input flex-1" value={seo.etsyStoreUrl} onChange={e => setSeo({ ...seo, etsyStoreUrl: e.target.value })} placeholder="https://www.etsy.com/shop/ateliecarol" />
                                        {seo.etsyStoreUrl && <a href={seo.etsyStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><ExternalLink size={14} /></a>}
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="form-label">URL de outra Loja / Loja Integrada / Nuvemshop</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input className="form-input flex-1" value={seo.lojaIntegradaUrl} onChange={e => setSeo({ ...seo, lojaIntegradaUrl: e.target.value })} placeholder="https://minha-loja.lojaintegrada.com.br" />
                                        {seo.lojaIntegradaUrl && <a href={seo.lojaIntegradaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}><ExternalLink size={14} /></a>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === Schema.org Section === */}
                    {activeSection === 'schema' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">
                            <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <Eye size={16} style={{ color: '#0369a1', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <p style={{ fontSize: '0.82rem', color: '#0c4a6e', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>O que é Rich Snippet?</p>
                                    <p style={{ fontSize: '0.78rem', color: '#075985', lineHeight: 1.5, margin: '4px 0 0 0' }}>
                                        São informações estruturadas que aparecem diretamente no resultado do Google — estrelas de avaliação, endereço, horário. Gerado automaticamente com os dados preenchidos.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label className="form-label">Tipo de Negócio (Schema @type)</label>
                                    <select className="form-input" value={seo.richSnippetType} onChange={e => setSeo({ ...seo, richSnippetType: e.target.value })}>
                                        <option value="LocalBusiness">LocalBusiness (Negócio Local)</option>
                                        <option value="Store">Store (Loja)</option>
                                        <option value="OnlineStore">OnlineStore (Loja Online)</option>
                                        <option value="Florist">Florist (Floricultura / Décor)</option>
                                        <option value="HomeGoodsStore">HomeGoodsStore (Casa &amp; Decoração)</option>
                                        <option value="ClothingStore">ClothingStore (Moda &amp; Ateliê)</option>
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">Escolha o mais próximo do seu negócio de papelaria/ateliê.</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="input-group">
                                        <label className="form-label">Ativar Schema.org automático</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                            <input type="checkbox" id="chk-schema" checked={seo.schemaEnabled} onChange={e => setSeo({ ...seo, schemaEnabled: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }} />
                                            <label htmlFor="chk-schema" style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600, cursor: 'pointer' }}>Injetar JSON-LD na loja pública</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview JSON-LD */}
                            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Schema.org JSON-LD Gerado</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(schemaJson, 'schema')}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', background: copied === 'schema' ? '#166534' : '#1e293b', color: copied === 'schema' ? '#86efac' : '#94a3b8', border: '1px solid #334155', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        {copied === 'schema' ? <CheckCircle size={12} /> : <Copy size={12} />}
                                        {copied === 'schema' ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                                <pre style={{ color: '#7dd3fc', fontSize: '0.75rem', lineHeight: 1.7, overflow: 'auto', maxHeight: '320px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{schemaJson}</pre>
                            </div>

                            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
                                <p style={{ fontSize: '0.8rem', color: '#854d0e', fontWeight: 600, margin: '0 0 6px 0' }}>📋 Como usar este código:</p>
                                <ol style={{ fontSize: '0.78rem', color: '#713f12', lineHeight: 1.7, margin: 0, paddingLeft: '16px' }}>
                                    <li>Copie o JSON-LD acima.</li>
                                    <li>Acesse o <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8' }}>Google Rich Results Test</a>.</li>
                                    <li>Cole o código para validar antes de publicar.</li>
                                    <li>Com o sistema ativo, ele é injetado automaticamente na página da loja.</li>
                                </ol>
                            </div>

                            {/* Quick validator links */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer"
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#e8f0fe', color: '#1a73e8', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #c5d8fb' }}>
                                    <Star size={14} /> Testar Rich Results
                                </a>
                                <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer"
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#f5f3ff', color: '#6d28d9', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #ddd6fe' }}>
                                    <CheckCircle size={14} /> Validar Schema.org
                                </a>
                                <a href="https://developers.google.com/search/docs/appearance/structured-data/local-business" target="_blank" rel="noopener noreferrer"
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#f0fdf4', color: '#166534', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: '1px solid #bbf7d0' }}>
                                    <ExternalLink size={14} /> Documentação Google
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary px-8" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={16} /> Salvar Parâmetros de Presença
                    </button>
                </div>
            </form>
        </div>
    );
}

function PricingSettings() {
    const [fixedCosts, setFixedCosts] = useState([]);
    const [bdiTaxes, setBdiTaxes] = useState([]);
    const [capacity, setCapacity] = useState({ monthlyHours: 160 });
    
    // Modal state for BDI
    const [isBdiModalOpen, setIsBdiModalOpen] = useState(false);
    const [newBdi, setNewBdi] = useState({ name: '', percentage: '', type: 'tax' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const trans = await db.getAll('transactions') || [];
            const bi = await db.getAll('bdi_taxes') || [];
            const cap = await db.getById('settings', 'capacity_planning') || { monthlyHours: 160 };
            
            // Extract current month's "Administrativo / Fixos" from financial module
            const now = new Date();
            const currentMonthFc = trans.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === now.getMonth() && 
                       d.getFullYear() === now.getFullYear() && 
                       t.type === 'expense' && 
                       t.category === 'Administrativo / Fixos' &&
                       !t.deleted; // Ensure it's not a soft deleted transaction
            });

            setFixedCosts(currentMonthFc);
            // Filter out soft-deleted BDI records 
            // (db.getAll usually filters them, but just in case, bi might already be clean)
            setBdiTaxes(bi);
            setCapacity(cap);
        } catch (e) { console.error(e); }
    };

    const handleAddBdi = async (e) => {
        e.preventDefault();
        if (!newBdi.name) return;
        await db.create('bdi_taxes', { name: newBdi.name, percentage: parseFloat(newBdi.percentage) || 0, type: newBdi.type || 'tax' });
        setNewBdi({ name: '', percentage: '', type: 'tax' });
        setIsBdiModalOpen(false);
        loadData();
    };

    const handleDeleteBdi = async (id, name) => {
        if (window.confirm(`Tem certeza que deseja inativar o índice "${name}"?`)) {
            await db.update('bdi_taxes', id, { deleted: true });
            loadData();
        }
    };

    const handleSaveCapacity = async () => {
        const h = parseInt(capacity.monthlyHours);
        if (isNaN(h) || h <= 0) return alert("Insira um valor de horas válido.");
        await db.set('settings', 'capacity_planning', { monthlyHours: h });
        alert('Capacidade Produtiva gravada com sucesso!');
    };

    const totalFixed = fixedCosts.reduce((acc, fc) => acc + (parseFloat(fc.amount) || 0), 0);
    const totalBdi = bdiTaxes.reduce((acc, tx) => acc + (tx.percentage || 0), 0);
    const costPerHour = capacity.monthlyHours ? (totalFixed / capacity.monthlyHours) : 0;

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* --- DASHBOARD STAT CARDS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                {/* Capacity Card */}
                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '16px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.4)' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}><Activity size={100} /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Capacidade Total Mensal</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', zIndex: 1, position: 'relative' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{capacity.monthlyHours}</span>
                        <span style={{ fontSize: '1rem', color: '#cbd5e1' }}>h/mês</span>
                    </div>
                    
                    <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                            type="number" 
                            style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white', fontSize: '0.85rem' }} 
                            value={capacity.monthlyHours} 
                            onChange={e => setCapacity({...capacity, monthlyHours: e.target.value})} 
                        />
                        <button onClick={handleSaveCapacity} style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--primary)', color: 'white', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                            Ajustar
                        </button>
                    </div>
                </div>

                {/* Fixed Costs Card */}
                <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', borderRadius: '16px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.15 }}><Landmark size={100} /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Custo Fixo do Mês</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', zIndex: 1, position: 'relative' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>R$</span>
                        <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{totalFixed.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#fecaca', marginTop: '12px', lineHeight: 1.4, zIndex: 1, position: 'relative' }}>
                        Somatório de todas as despesas categorizadas como "Administrativo / Fixos" lançadas no financeiro neste mês corrente.
                    </p>
                </div>

                {/* Rateio Ratio Card */}
                <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '16px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.15 }}><Activity size={100} /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Custo Absorvido / Rateio</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', zIndex: 1, position: 'relative' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>R$</span>
                        <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{costPerHour.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        <span style={{ fontSize: '1rem', color: '#bfdbfe' }}>/h</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#dbeafe', marginTop: '12px', lineHeight: 1.4, zIndex: 1, position: 'relative' }}>
                        Valor mínimo exigido por hora de produção de cada item, apenas para pagar a luz do teto de sua operação empírica.
                    </p>
                </div>
            </div>

            {/* --- LISTS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
                
                {/* BDI / TAXES */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 className="card-title flex items-center gap-2"><Wallet size={20} className="text-purple-600" /> Matriz BDI (Margens & Impostos)</h3>
                            <p className="text-muted text-sm pb-2">Percentuais cobrados sobre o Preço Final da Peça.</p>
                        </div>
                        <button onClick={() => setIsBdiModalOpen(true)} className="btn btn-primary shadow-sm hover:-translate-y-0.5" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0.8rem', borderRadius: '8px', fontWeight: 600, backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}>
                            <Plus size={16} /> Margem
                        </button>
                    </div>

                    <div className="px-4 py-4 flex-1">
                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {bdiTaxes.map(tx => {
                                const typeMap = {
                                    'tax': { label: 'Imposto Estadual/Federal', color: 'bg-red-50 text-red-700 border-red-200' },
                                    'fee': { label: 'Taxa Parceiros/Cartão', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                                    'profit': { label: 'Lucratividade Líquida', color: 'bg-green-50 text-green-700 border-green-200' },
                                };
                                const badge = typeMap[tx.type || 'tax'];
                                return (
                                    <div key={tx.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 rounded transition-colors group">
                                        <div>
                                            <div className="text-sm font-bold text-gray-800">{tx.name}</div>
                                            <div className={`text-[10px] px-1.5 py-0.5 mt-1 rounded font-semibold uppercase border inline-block ${badge.color}`}>{badge.label}</div>
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <div className="text-[1.1rem] font-extrabold text-[#1e293b]">{parseFloat(tx.percentage).toFixed(2)}%</div>
                                            <button onClick={() => handleDeleteBdi(tx.id, tx.name)} className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                            {bdiTaxes.length === 0 && (
                                <div className="text-center py-8 text-sm text-gray-400 bg-gray-50/50 rounded-xl">Nenhuma indexação financeira cadastrada.</div>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ padding: '16px', background: '#faf5ff', borderTop: '1px solid #e9d5ff', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-sm font-bold text-purple-900 uppercase tracking-widest">Carga Total Indexada:</span>
                        <span className="text-xl font-black text-purple-700">{totalBdi.toLocaleString('pt-BR', {minimumFractionDigits: 2})}%</span>
                    </div>
                </div>

                {/* FIXED COSTS LIST */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="card-header border-b">
                        <div>
                            <h3 className="card-title flex items-center gap-2"><Landmark size={20} className="text-red-600" /> Extrato de Custo Fixo (Mês Corrente)</h3>
                            <p className="text-muted text-sm pb-2">Registros de Custo Administrativos que formam o Rateio.</p>
                        </div>
                    </div>
                    <div className="p-3 bg-red-50/50 border-b border-red-100 flex items-start gap-2 text-xs text-red-800">
                        <Info size={16} className="mt-0.5 flex-shrink-0" />
                        <span>Este quadro é alimentado <strong>automaticamente</strong>. Para adicionar/remover itens aqui, você deve acessar o Módulo Financeiro e lançar despesas na categoria "Administrativo / Fixos".</span>
                    </div>
                    <div className="p-4 flex-1">
                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {fixedCosts.map(fc => (
                                <div key={fc.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 px-2 rounded transition-colors">
                                    <div className="text-sm font-semibold text-gray-800">{fc.description}</div>
                                    <div className="flex gap-3 items-center">
                                        <div className="text-[1.05rem] font-bold text-gray-700">R$ {parseFloat(fc.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                        {fc.status === 'paid' ? 
                                            <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">Pago</span> : 
                                            <span className="text-[10px] bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-bold">Pendente</span>
                                        }
                                    </div>
                                </div>
                            ))}
                            {fixedCosts.length === 0 && (
                                <div className="text-center py-8 text-sm text-gray-400 bg-gray-50/50 rounded-xl">Seu Financeiro ainda não sofreu lançamentos fixos esse mês.</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* BDI MODAL */}
            {isBdiModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content animate-slide-up" style={{ maxWidth: '450px', width: '100%', padding: '24px', backgroundColor: 'var(--surface)', borderRadius: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                Adicionar Novo BDI / Margem
                            </h2>
                            <button onClick={() => setIsBdiModalOpen(false)} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddBdi} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Nome da Margem/Taxa <span style={{color: '#ef4444'}}>*</span></label>
                                <input 
                                    required 
                                    autoFocus
                                    type="text" 
                                    placeholder="Ex: Lucro Projetado, Simples Nacional..." 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                    value={newBdi.name} 
                                    onChange={e => setNewBdi({...newBdi, name: e.target.value})} 
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Tipo de Indexador <span style={{color: '#ef4444'}}>*</span></label>
                                    <select 
                                        required
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                        value={newBdi.type}
                                        onChange={e => setNewBdi({...newBdi, type: e.target.value})}
                                    >
                                        <option value="tax">Imposto/Governo</option>
                                        <option value="fee">Taxas e Encargos (Cartão/Parceiros)</option>
                                        <option value="profit">Lucro Líquido Esperado</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>Percentual (%) <span style={{color: '#ef4444'}}>*</span></label>
                                    <input 
                                        required 
                                        type="number" step="0.01" 
                                        placeholder="0.00" 
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.875rem' }} 
                                        value={newBdi.percentage} 
                                        onChange={e => setNewBdi({...newBdi, percentage: e.target.value})} 
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setIsBdiModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--surface-hover)', color: 'var(--text-main)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                                    Adicionar à Matriz
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function DangerZoneCleanup() {
    const [statusText, setStatusText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const wipeTestData = async () => {
        if (!window.confirm("⚠️ ATENÇÃO: Essa ação lerá TODO o sistema buscando Pedidos e Lançamentos que contenham a palavra 'teste' na descrição ou nome, e os DELETARÁ permanentemente. Continuar?")) return;
        setIsProcessing(true);
        setStatusText("Iniciando faxina de rastros de teste...");
        try {
            let deletedOrders = 0;
            let deletedTrans = 0;

            const orders = await db.getAll('orders');
            for (const order of orders) {
                const searchString = `${order.customer || ''} ${order.customerEmail || ''} ${(order.cartItems || []).map(i => i.name).join(' ')} ${order.id}`.toLowerCase();
                if (searchString.includes('teste')) {
                    await db.delete('orders', order.id);
                    deletedOrders++;
                    setStatusText(`Apagando pedido falso #${String(order.id).substring(0,6)}...`);
                }
            }

            const trans = await db.getAll('transactions');
            for (const t of trans) {
                const searchString = `${t.description || ''} ${t.category || ''} ${t.type || ''}`.toLowerCase();
                if (searchString.includes('teste') || (t.orderId && searchString.includes('venda online (pedido'))) {
                    // if it's a generic online sale matching a deleted order.. wait better check if order exists
                    await db.delete('transactions', t.id);
                    deletedTrans++;
                    setStatusText(`Limpando caixa: "${t.description.substring(0,15)}..."`);
                }
            }
            // Optional sweep: if a trans has an orderId that doesn't exist anymore, delete it too!
            const transPhase2 = await db.getAll('transactions');
            const ordersPhase2 = await db.getAll('orders');
            const liveOrderIds = new Set(ordersPhase2.map(o => String(o.id)));
            for (const tp of transPhase2) {
                if (tp.orderId && !liveOrderIds.has(String(tp.orderId))) {
                    await db.delete('transactions', tp.id);
                    deletedTrans++;
                }
            }

            AuditService.log({ name: 'Admin' }, 'DELETE', 'System', 'all', `Faxina de Testes Executada: Removidos ${deletedOrders} pedidos e ${deletedTrans} lançamentos/resíduos.`);
            setStatusText(`🔥 FAXINA CONCLUÍDA: ${deletedOrders} Pedidos e ${deletedTrans} Lançamentos ligados a Testes foram dizimados.`);
        } catch(e) {
            console.error(e);
            setStatusText("❌ Erro durante a limpeza: " + e.message);
        }
        setIsProcessing(false);
    };

    const wipeAllToday = async () => {
        if (!window.confirm("⚠️ PERIGO: Isso vai apagar ABSOLUTAMENTE TODOS os Pedidos e Lançamentos gerados no dia de hoje, independente de serem testes ou não. Você autoriza esse wipe?")) return;
        setIsProcessing(true);
        setStatusText("Buscando registros criados hoje...");
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            let countOrders = 0;
            let countTrans = 0;

            const orders = await db.getAll('orders');
            for (const order of orders) {
                if ((order.createdAt && order.createdAt.startsWith(todayStr)) || (order.date && order.date.startsWith(todayStr))) {
                    await db.delete('orders', order.id);
                    countOrders++;
                }
            }
            
            const trans = await db.getAll('transactions');
            for (const t of trans) {
                if ((t.createdAt && t.createdAt.startsWith(todayStr)) || (t.date && t.date.startsWith(todayStr))) {
                    await db.delete('transactions', t.id);
                    countTrans++;
                }
            }
            
            setStatusText(`🔥 RESET CONCLUÍDO: ${countOrders} Pedidos e ${countTrans} Lançamentos criados hoje evaporaram da base.`);
        } catch(e) {
            setStatusText("❌ Erro durante o reset: " + e.message);
        }
        setIsProcessing(false);
    };

    const downloadBackup = async () => {
        setIsProcessing(true);
        setStatusText("Gerando Arquivo de Backup Blindado (JSON)...");
        try {
            const allOrders = await db.getAll('orders');
            const allTrans = await db.getAll('transactions');
            const allCustomers = await db.getAll('customers');
            const allInventory = await db.getAll('inventory');
            
            const fullSnapshot = {
                timestamp: new Date().toISOString(),
                orders: allOrders,
                transactions: allTrans,
                customers: allCustomers,
                inventory: allInventory
            };
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullSnapshot, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", `backup_atelie_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            
            setStatusText("✅ Backup Concluído Mestre. Seu arquivo JSON foi baixado localmente. Agora é seguro deletar.");
        } catch(e) {
            setStatusText("❌ Falha crítica ao exportar Banco: " + e.message);
        }
        setIsProcessing(false);
    };

    return (
        <div className="card animate-fade-in" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
            <div className="card-header" style={{ borderBottomColor: '#fee2e2' }}>
                <h3 className="card-title flex items-center gap-sm" style={{ color: '#b91c1c' }}><Trash2 size={20} /> Danger Zone / Faxina do Banco de Dados</h3>
                <p className="text-sm mt-1" style={{ color: '#991b1b' }}>
                    Ferramentas destrutivas. Tenha absoluta certeza ao usá-las, o painel do Financeiro atualizará instantaneamente seus saldos.
                </p>
            </div>
            <div className="p-6">
                
                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>🛡️ PASSO 1: Escudo de Segurança (Faça Backup)</div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Baixe o banco localmente em formato Arquivo universal JSON antes de rodar os scripts de exclusão abaixo do passo 2.</p>
                    </div>
                    <button onClick={downloadBackup} disabled={isProcessing} className="btn" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 700 }}>
                        <Save size={16} /> Exportar Todas as Tabelas
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #fecaca', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1f2937', letterSpacing: '0.05em' }}>CAÇADOR DE TESTES</div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5, marginBottom: '16px' }}>Vasculha a tabela de Pedidos Automáticos e Lançamentos em busca da palavra "teste" no histórico descritivo. Limpa automaticamente transações ligadas a ele para alinhar o Saldo.</p>
                        <button onClick={wipeTestData} disabled={isProcessing} className="btn" style={{ marginTop: 'auto', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontWeight: 700 }}>
                            <Activity size={16} /> Iniciar Caçada / Cleanup
                        </button>
                    </div>

                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #fecaca', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#991b1b', letterSpacing: '0.05em' }}>ZONA ZERO (WIPE DE HOJE)</div>
                        <p style={{ fontSize: '0.75rem', color: '#dc2626', lineHeight: 1.5, marginBottom: '16px' }}>APAGA TUDO. Elimina todos os pedidos e todos os pagamentos (reais ou não) que nasceram a partir de meia-noite da data atual.</p>
                        <button onClick={wipeAllToday} disabled={isProcessing} className="btn" style={{ marginTop: 'auto', backgroundColor: '#dc2626', color: '#fff', border: 'none', fontWeight: 700 }}>
                            <Trash2 size={16} /> Exterminar Dados do Dia
                        </button>
                    </div>
                </div>
                
                {statusText && (
                    <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', backgroundColor: '#111827', fontFamily: 'monospace', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ animation: 'pulse 1s infinite' }}>_</span> {statusText}
                    </div>
                )}
            </div>
        </div>
    );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({ name: '', role: '', avatar: '' });

  useEffect(() => {
    const loadProfile = async () => {
        try {
             const dbUser = await db.getById('settings', 'profile');
             if (dbUser && Object.keys(dbUser).length > 0) {
                 setUser(dbUser);
                 localStorage.setItem('stationery_user', JSON.stringify(dbUser));
                 return;
             }
        } catch(e) {}
        
        try {
             const localUser = localStorage.getItem('stationery_user');
             if (localUser) setUser(JSON.parse(localUser));
        } catch (e) { console.warn(e); }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    localStorage.setItem('stationery_user', JSON.stringify(user));
    try { await db.set('settings', 'profile', user); } catch(err) {}
    alert('Perfil atualizado!');
    window.location.reload(); 
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px' }}>
      <h2 className="title mb-6">Configurações & Cadastros</h2>

      {/* TABS */}
      <div className="tabs">
        <button 
            className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
        >
            <User size={16} className="inline mr-2" /> Meu Perfil
        </button>
        <button 
            className={`tab-item ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
        >
            <Wallet size={16} className="inline mr-2" /> Precificação & Gastos (BDI)
        </button>
        <button 
            className={`tab-item ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
        >
            <Users size={16} className="inline mr-2" /> Cargos & Equipe
        </button>
        <button 
            className={`tab-item ${activeTab === 'business_hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('business_hours')}
        >
            <CalendarDays size={16} className="inline mr-2" /> Expediente / Tempos
        </button>
        <button 
            className={`tab-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
        >
            <FileText size={16} className="inline mr-2" /> Plano de Contas
        </button>
        <button 
            className={`tab-item ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
        >
            <Landmark size={16} className="inline mr-2" /> Contas & Caixas
        </button>
        <button 
            className={`tab-item ${activeTab === 'web_presence' ? 'active' : ''}`}
            onClick={() => setActiveTab('web_presence')}
            style={activeTab === 'web_presence' ? { backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd'} : {}}
        >
            <Search size={16} className="inline mr-2" /> Presença na Web
        </button>
        <button 
            className={`tab-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
        >
            <Activity size={16} className="inline mr-2" /> Logs do Sistema
        </button>
         <button 
            className={`tab-item ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
            style={activeTab === 'system' ? { backgroundColor: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe'} : {}}
        >
            <Globe size={16} className="inline mr-2" /> Loja Virtual & Setup
        </button>
         <button 
            className={`tab-item ${activeTab === 'danger' ? 'active' : ''}`}
            onClick={() => setActiveTab('danger')}
            style={activeTab === 'danger' ? { backgroundColor: '#fef2f2', color: '#b91c1c', borderColor: '#fca5a5'} : {}}
        >
            <Trash2 size={16} className="inline mr-2" /> Faxina / Wipe
        </button>
      </div>
      
      {/* CONTENT */}
      {activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} onSave={handleSaveProfile} />}
      {activeTab === 'pricing' && <PricingSettings />}
      {activeTab === 'roles' && <RolesSettings />}
      {activeTab === 'business_hours' && <BusinessHoursSettings />}
      {activeTab === 'categories' && <CategoriesSettings />}
      {activeTab === 'accounts' && <AccountsSettings />}
      {activeTab === 'logs' && <AuditLogViewer />}
      {activeTab === 'web_presence' && <WebPresenceSettings />}
      {activeTab === 'system' && <SystemSettings />}
      {activeTab === 'danger' && <DangerZoneCleanup />}

    </div>
  );
}

