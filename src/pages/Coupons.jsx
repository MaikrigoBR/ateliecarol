import React, { useState, useEffect } from 'react';
import { Plus, Ticket, Save, X, Edit, Trash2, Power, History, Search } from 'lucide-react';
import db from '../services/database';

export function Coupons() {
    const [coupons, setCoupons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState(getInitialForm());

    function getInitialForm() {
        return {
            id: null,
            code: '',
            description: '',
            discountType: 'percentage', // percentage | fixed
            discountValue: 10,
            minPurchase: 0,
            maxUses: 100,
            usedCount: 0,
            expirationDate: '',
            isActive: true,
        };
    }

    const fetchCoupons = async () => {
        const data = await db.getAll('coupons') || [];
        setCoupons(data);
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            code: formData.code.toUpperCase().replace(/\s/g, ''),
            discountValue: parseFloat(formData.discountValue),
            minPurchase: parseFloat(formData.minPurchase),
            maxUses: parseInt(formData.maxUses, 10)
        };

        if (payload.id) {
            await db.update('coupons', payload.id, payload);
        } else {
            // Check if code exists
            const existing = coupons.find(c => c.code === payload.code);
            if (existing) {
                alert("Já existe um cupom com este código. Escolha outro.");
                return;
            }
            await db.create('coupons', payload);
        }

        setIsModalOpen(false);
        fetchCoupons();
    };

    const handleEdit = (c) => {
        setFormData(c);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Deseja mesmo excluir este cupom permanentemente?")) {
            await db.delete('coupons', id);
            fetchCoupons();
        }
    };

    const handleToggleActive = async (c) => {
        await db.update('coupons', c.id, { isActive: !c.isActive });
        fetchCoupons();
    };

    const openNew = () => {
        setFormData(getInitialForm());
        setIsModalOpen(true);
    };

    const filtered = coupons.filter(c => c.code.includes(searchTerm.toUpperCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Ticket size={28} color="#9333ea" /> Gestor de Cupons</h1>
                    <p className="page-subtitle">Crie ofertas para seus clientes, controle limites e alavanque vendas.</p>
                </div>
                <button className="btn" style={{ backgroundColor: '#9333ea', color: 'white' }} onClick={openNew}>
                    <Plus size={20} /> Novo Cupom
                </button>
            </div>

            {/* Config & Search */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por CÓDIGO ou descrição..." 
                        style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '8px', border: '1px solid #e2e8f0', outlineColor: '#9333ea' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Data Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Código</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Desconto</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Uso Máx / Usados</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Validade</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                            <th className="px-6 py-4 w-24">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    Nenhum cupom encontrado.
                                </td>
                            </tr>
                        ) : filtered.map(c => {
                            const today = new Date().toISOString().split('T')[0];
                            const isExpired = c.expirationDate && c.expirationDate < today;
                            const isDepleted = c.usedCount >= c.maxUses;
                            return (
                                <tr key={c.id} className="hover:bg-purple-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div style={{ fontWeight: 800, color: '#4c1d95', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Ticket size={16} /> {c.code}
                                        </div>
                                        {c.description && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.description}</div>}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-purple-700">
                                        {c.discountType === 'percentage' ? `${c.discountValue}%` : `R$ ${Number(c.discountValue).toFixed(2)}`}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div style={{ fontSize: '0.9rem', color: isDepleted ? '#ef4444' : '#334155', fontWeight: 600 }}>
                                            {c.usedCount} <span style={{ color: '#94a3b8' }}>/ {c.maxUses}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium" style={{ color: isExpired ? '#ef4444' : '#64748b' }}>
                                        {c.expirationDate ? new Date(c.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem Prazo'}
                                        {isExpired && <span style={{ display: 'block', fontSize: '0.7rem' }}>(Expirado)</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         <button 
                                            onClick={() => handleToggleActive(c)}
                                            style={{ 
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                                                backgroundColor: c.isActive ? '#dcfce3' : '#f1f5f9',
                                                color: c.isActive ? '#15803d' : '#64748b'
                                            }}
                                         >
                                             {c.isActive ? 'Ativo' : 'Pausado'}
                                         </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2 justify-end">
                                            <button className="text-blue-500 hover:text-blue-700" onClick={() => handleEdit(c)} title="Editar"><Edit size={18} /></button>
                                            <button className="text-red-500 hover:text-red-700" onClick={() => handleDelete(c.id)} title="Excluir"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de Criação / Edição */}
            {isModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{formData.id ? 'Editar Cupom' : 'Novo Cupom'}</h2>
                            <button className="btn btn-icon" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                
                                <div className="input-group">
                                    <label className="form-label" style={{ color: '#6b21a8' }}>Código do Cupom *</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        required 
                                        placeholder="Ex: OFERTA20"
                                        value={formData.code}
                                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s/g, '')})}
                                        style={{ textTransform: 'uppercase', borderColor: '#d8b4fe', fontWeight: 800, color: '#4c1d95', letterSpacing: '1px' }}
                                    />
                                </div>
                                
                                <div className="input-group">
                                    <label className="form-label">Descrição (Interna)</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Ex: Campanha de Dia das Mães..."
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="form-label">Tipo de Desconto</label>
                                        <select 
                                            className="form-input"
                                            value={formData.discountType}
                                            onChange={e => setFormData({...formData, discountType: e.target.value})}
                                        >
                                            <option value="percentage">Porcentagem (%)</option>
                                            <option value="fixed">Valor Fixo (R$)</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Valor ({formData.discountType === 'percentage' ? '%' : 'R$'}) *</label>
                                        <input 
                                            type="number" 
                                            min="0.01"
                                            step="0.01"
                                            required
                                            className="form-input" 
                                            value={formData.discountValue}
                                            onChange={e => setFormData({...formData, discountValue: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="form-label">Valor Mínimo na Sacola (R$)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            className="form-input" 
                                            value={formData.minPurchase}
                                            onChange={e => setFormData({...formData, minPurchase: e.target.value})}
                                            title="0 ou Vazio = Libera para qualquer valor"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Total de Usos Máximo permitidos</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            required
                                            className="form-input" 
                                            value={formData.maxUses}
                                            onChange={e => setFormData({...formData, maxUses: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="form-label">Data de Expiração (Opcional)</label>
                                    <input 
                                        type="date" 
                                        className="form-input" 
                                        value={formData.expirationDate || ''}
                                        onChange={e => setFormData({...formData, expirationDate: e.target.value})}
                                    />
                                </div>

                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn" style={{ backgroundColor: '#9333ea', color: 'white' }}>
                                    <Save size={18} /> Salvar Cupom
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
