import React, { useState, useEffect, useMemo } from 'react';
import { 
    Hammer, Activity, Plus, Search, Filter, AlertCircle, 
    Wrench, Package, QrCode, TrendingUp, History, 
    ShieldCheck, Edit2, ShieldAlert, LayoutGrid, List,
    DollarSign, BarChart2, MoreVertical, Trash2
} from 'lucide-react';
import db from '../services/database.js';
import { NewInventoryItemModal } from '../components/NewInventoryItemModal.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import '../css/pages.css';

const STATUS_STYLE = {
    'Ativo': { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7', iconColor: '#22c55e' },
    'Manutenção': { bg: '#fffbeb', color: '#d97706', border: '#fef3c7', iconColor: '#f59e0b' },
    'Inativo': { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2', iconColor: '#ef4444' }
};

function StatCard({ title, value, icon: Icon, color, subtext }) {
    const getColor = (c) => {
        const map = {
            'primary': 'var(--primary)',
            'green': '#10b981',
            'orange': '#f59e0b',
            'purple': '#8b5cf6',
            'blue': '#3b82f6',
            'red': '#ef4444'
        };
        return map[c] || c;
    };
    const activeColor = getColor(color);
    return (
        <div className="stat-card" style={{ borderLeftColor: activeColor, borderRadius: '16px' }}>
            <div className="flex-1">
                <p style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: 'var(--text-muted)',
                    marginBottom: '0.25rem'
                }}>{title}</p>
                <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700, 
                    color: 'var(--text-main)',
                    lineHeight: 1.2
                }}>{value}</h3>
                {subtext && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>{subtext}</p>}
            </div>
            <div className="stat-icon-wrapper" style={{ 
                color: activeColor, 
                backgroundColor: `${activeColor}1A`
            }}>
                <Icon size={24} />
            </div>
        </div>
    );
}

export function Equipments() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Data State
  const [items, setItems] = useState([]);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [qrCodeEquip, setQrCodeEquip] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
        const allItems = await db.getAll('equipments');
        setItems(allItems || []);
    } catch (e) {
        console.error(e);
        setItems([]);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const matchesSearch = 
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.patrimonyId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.model?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, filterStatus]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este equipamento?')) return;
    await db.delete('equipments', id);
    fetchItems();
  };

  // KPIs
  const totalValue = items.reduce((sum, item) => sum + (parseFloat(item.cost || item.purchasePrice) || 0), 0);
  const inMaintenance = items.filter(item => item.status === 'Manutenção').length;
  const criticalHealth = items.filter(item => item.status === 'Inativo').length;

  return (
    <div className="animate-fade-in page-content" onClick={() => setActiveMenu(null)}>
        
        {/* DASHBOARD HEADER */}
        <div className="dashboard-header">
            <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Parque de Equipamentos
                </h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Monitoramento estratégico de ativos fixos e infraestrutura produtiva.
                </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
                    <Plus size={18} /> Incorporar Novo Ativo
                </button>
            </div>
        </div>

        {/* KPI ROW */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard 
                title="Ativos Totais" 
                value={items.length} 
                icon={Package} 
                color="blue"
                subtext="Patrimônio cadastrado"
            />
            <StatCard 
                title="Em Manutenção" 
                value={inMaintenance} 
                icon={Wrench} 
                color="orange"
                subtext="Aguardando reparo"
            />
            <StatCard 
                title="Críticos" 
                value={criticalHealth} 
                icon={AlertCircle} 
                color="red"
                subtext="Fora de operação"
            />
            <StatCard 
                title="Investimento Total" 
                value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                icon={DollarSign} 
                color="green"
                subtext="Soma de aquisições"
            />
        </div>

        {/* CONTROLS TAPE */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                    type="text" 
                    placeholder="Buscar por patrimônio, nome ou modelo..." 
                    className="form-input" 
                    style={{ paddingLeft: '32px' }} 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
            
            <select 
                className="form-input" 
                style={{ minWidth: '180px', backgroundColor: 'var(--surface)' }} 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
            >
                <option value="all">Todos os Status</option>
                <option value="Ativo">Operacional</option>
                <option value="Manutenção">Em Reparo</option>
                <option value="Inativo">Desativado</option>
            </select>
            
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <button onClick={(e) => { e.stopPropagation(); setViewMode('grid'); }} style={{ padding: '8px 12px', background: viewMode === 'grid' ? 'var(--primary)' : 'var(--surface)', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <LayoutGrid size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setViewMode('list'); }} style={{ padding: '8px 12px', background: viewMode === 'list' ? 'var(--primary)' : 'var(--surface)', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <List size={16} />
                </button>
            </div>
        </div>

        {/* GRID RENDER */}
        {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredItems.map(item => {
                    const st = STATUS_STYLE[item.status] || STATUS_STYLE['Inativo'];
                    return (
                        <div 
                            key={item.id} 
                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        >
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: st.iconColor }} />
                            
                            <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
                                 <button 
                                    className="btn-icon" 
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', shadow: 'var(--shadow-sm)' }}
                                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id); }}
                                 >
                                    <MoreVertical size={16} />
                                 </button>
                                 {activeMenu === item.id && (
                                    <div style={{ position: 'absolute', top: '40px', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', shadow: 'var(--shadow-lg)', zIndex: 100, width: '180px', overflow: 'hidden' }}>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsModalOpen(true); setActiveMenu(null); }} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} className="hover:bg-gray-50">
                                            <Edit2 size={14} /> Editar Ativo
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setQrCodeEquip(item); setActiveMenu(null); }} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} className="hover:bg-gray-50">
                                            <QrCode size={14} /> Etiqueta QR
                                        </button>
                                        <button onClick={(e) => handleDelete(e, item.id)} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }} className="hover:bg-red-50">
                                            <Trash2 size={14} /> Deletar Ativo
                                        </button>
                                    </div>
                                 )}
                            </div>

                            <div style={{ height: '180px', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {item.image ? (
                                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Hammer size={48} style={{ color: 'var(--text-muted)', opacity: 0.15 }} />
                                )}
                            </div>

                            <div style={{ padding: '20px' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                    {item.patrimonyId || 'TAG NÃO DEFINIDA'}
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', lineHeight: 1.3, height: '42px', overflow: 'hidden' }}>
                                    {item.name}
                                </h3>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: '14px', backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}`, textTransform: 'uppercase' }}>
                                        {item.status}
                                    </span>
                                    {item.brand && (
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: '14px', backgroundColor: 'var(--background)', color: 'var(--text-muted)', border: '1px solid var(--border)', textTransform: 'uppercase' }}>
                                            {item.brand}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '20px' }}>
                <div className="table-container">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--surface-hover)' }}>
                                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Ativo / Patrimônio</th>
                                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Marca / Modelo</th>
                                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Investimento</th>
                                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Status</th>
                                <th style={{ textAlign: 'right', padding: '1.25rem 1.5rem' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => {
                                const st = STATUS_STYLE[item.status] || STATUS_STYLE['Inativo'];
                                return (
                                    <tr 
                                        key={item.id} 
                                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                                        className="hover:bg-slate-50"
                                    >
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                                    {item.image ? <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Hammer size={20} style={{ color: 'var(--text-muted)' }} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', mt: '2px' }}>{item.patrimonyId || '---'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.brand}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.model}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>R$ {parseFloat(item.cost || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{ fontSize: '0.7rem', padding: '4px 10px', backgroundColor: st.bg, color: st.color, borderRadius: '14px', fontWeight: 800, textTransform: 'uppercase', border: `1px solid ${st.border}` }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                            <button 
                                                className="btn-icon" 
                                                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id); }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {filteredItems.length === 0 && (
            <div style={{ padding: '100px 4rem', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                <Hammer size={64} style={{ color: 'var(--text-muted)', opacity: 0.1, marginBottom: '24px' }} />
                <h3 style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1.25rem' }}>
                    Nenhum ativo imobilizado encontrado.
                </h3>
                <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => setIsModalOpen(true)}>
                    Incorporar Novo Equipamento
                </button>
            </div>
        )}

        {/* QR CODE PREVIEW MODAL */}
        {qrCodeEquip && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setQrCodeEquip(null)}>
                <div style={{ backgroundColor: 'var(--surface)', borderRadius: '20px', width: '100%', maxWidth: '360px', padding: '32px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '24px', background: 'white', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '24px', display: 'inline-block' }}>
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/#/equipments?maintenance_id=${qrCodeEquip.id}`} alt="QR" style={{ width: '180px', height: '180px' }} />
                    </div>
                    
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Ativo Identificado</h4>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{qrCodeEquip.patrimonyId || 'ID PENDENTE'}</h3>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '6px' }}>{qrCodeEquip.name}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button className="btn btn-primary" style={{ width: '100%', height: '3.5rem', fontWeight: 700 }} onClick={() => window.print()}>
                            Imprimir Etiqueta
                        </button>
                        <button className="btn btn-secondary" style={{ width: '100%', height: '3.5rem', fontWeight: 700 }} onClick={() => setQrCodeEquip(null)}>
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        )}

        <NewInventoryItemModal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
            defaultType="equipment"
            targetTable="equipments"
            itemToEdit={editingItem}
            onItemSaved={() => {
                fetchItems();
                setIsModalOpen(false);
                setEditingItem(null);
            }}
        />
    </div>
  );
}
