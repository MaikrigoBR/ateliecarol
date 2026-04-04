import React, { useState, useEffect, useMemo } from 'react';
import { 
    Package, Search, Plus, Filter, AlertTriangle, 
    TrendingDown, ArrowRight, DollarSign, BarChart2,
    Box, History, ShieldAlert, List, LayoutGrid, Edit2,
    MoreVertical, Trash2, QrCode, RefreshCw, Layers
} from 'lucide-react';
import db from '../services/database.js';
import { NewInventoryItemModal } from '../components/NewInventoryItemModal.jsx';
import '../css/pages.css';

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

export function Inventory() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
        const allItems = await db.getAll('inventory');
        setItems(Array.isArray(allItems) ? allItems : []);
    } catch (e) {
        console.error('Error fetching inventory:', e);
        setItems([]);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, filterType]);

  // Grouping by "Family" (Master Item)
  const masterItems = useMemo(() => {
    // Logic to calculate average cost across families if a masterId exists
    // For now, let's treat the simple list as is, but we'll add the master item logic in the modal
    return filteredItems;
  }, [filteredItems]);

  const totalItems = items.length;
  const lowStock = items.filter(i => (parseFloat(i.quantity) || 0) <= (parseFloat(i.minStock) || 0)).length;
  const totalValue = items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)), 0);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este item?')) return;
    await db.delete('inventory', id);
    fetchItems();
  };

  return (
    <div className="animate-fade-in page-content" onClick={() => setActiveMenu(null)}>
      
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Logística de Insumos
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Consolidação de estoque por famílias equivalentes e custo médio operacional.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
            <Plus size={18} /> Novo Insumo / Família
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard 
            title="Variedades de Insumos" 
            value={totalItems} 
            icon={Box} 
            color="blue"
            subtext="SKUs e famílias catalogadas"
        />
        <StatCard 
            title="Alerta de Reposição" 
            value={lowStock} 
            icon={ShieldAlert} 
            color="red"
            subtext="Itens abaixo do estoque mín."
        />
        <StatCard 
            title="Patrimônio Estocado" 
            value={`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
            icon={TrendingDown} 
            color="green"
            subtext="Custo médio consolidado"
        />
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou família..." 
            className="form-input" 
            style={{ paddingLeft: '32px' }} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        
        <select 
          className="form-input" 
          style={{ minWidth: '180px', backgroundColor: 'var(--surface)' }} 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">Todos os Tipos</option>
          <option value="material">Materia-prima</option>
          <option value="product">Produto Acabado</option>
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

      {/* CONTENT */}
      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {masterItems.map(item => {
                const isLow = (parseFloat(item.quantity) || 0) <= (parseFloat(item.minStock) || 0);
                return (
                    <div 
                        key={item.id} 
                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: isLow ? '#ef4444' : 'var(--primary)' }} />
                        
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
                                        <Edit2 size={14} /> Editar / Repor
                                    </button>
                                    <button onClick={(e) => handleDelete(e, item.id)} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }} className="hover:bg-red-50">
                                        <Trash2 size={14} /> Remover Registro
                                    </button>
                                </div>
                             )}
                        </div>

                        <div style={{ height: '160px', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {item.image ? (
                                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Package size={48} style={{ color: 'var(--text-muted)', opacity: 0.15 }} />
                            )}
                        </div>

                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {item.category || item.materialGroup || 'INDETERMINADO'}
                                </span>
                                {item.family && (
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                        Família
                                    </span>
                                )}
                            </div>
                            
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', lineHeight: 1.3, height: '42px', overflow: 'hidden' }}>
                                {item.name}
                            </h3>

                            <div style={{ backgroundColor: 'var(--background)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Disponível</p>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: isLow ? '#ef4444' : 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        {item.quantity} 
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'lowercase' }}>{item.unit}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Custo Médio</p>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                        R$ {parseFloat(item.cost || 0).toFixed(2)}
                                    </div>
                                </div>
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
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Insumo equivalente</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Categoria</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Saldo Atual</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem' }}>Custo Médio</th>
                            <th style={{ textAlign: 'right', padding: '1.25rem 1.5rem' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {masterItems.map(item => {
                            const isLow = (parseFloat(item.quantity) || 0) <= (parseFloat(item.minStock) || 0);
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
                                                {item.image ? <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={20} style={{ color: 'var(--text-muted)' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', mt: '2px' }}>{item.family || 'Item Único'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>{item.category || item.materialGroup || 'Geral'}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 800, color: isLow ? '#ef4444' : 'var(--text-main)', fontSize: '1.1rem' }}>
                                            {item.quantity} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>{item.unit}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>R$ {parseFloat(item.cost || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
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
          <Package size={64} style={{ color: 'var(--text-muted)', opacity: 0.1, marginBottom: '24px' }} />
          <h3 style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '1.25rem' }}>
            Nenhum recurso localizado na base de dados.
          </h3>
          <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => setIsModalOpen(true)}>
            Catalogar Primeiro Insumo
          </button>
        </div>
      )}

      <NewInventoryItemModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        defaultType="material"
        targetTable="inventory"
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
