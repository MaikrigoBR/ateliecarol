import React, { useState, useEffect } from 'react';
import { Package, Truck, Activity, Hammer, Plus, Edit2, Trash2 } from 'lucide-react';
import db from '../services/database.js';
import { NewInventoryItemModal } from '../components/NewInventoryItemModal.jsx';
import { LinkedTransactionsModal } from '../components/LinkedTransactionsModal.jsx';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function Inventory() {
  const { currentUser } = useAuth();
  const activeTab = 'material';
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [linkedEntityId, setLinkedEntityId] = useState(null);
  const [linkedEntityName, setLinkedEntityName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
        const allItems = await db.getAll('inventory');
        setItems(Array.isArray(allItems) ? allItems : []);
    } catch (e) {
        console.error(e);
        setItems([]);
    }
  };
  
  const handleDelete = async (id, name) => {
      if (window.confirm('Tem certeza? Isso remove o histórico de estoque deste material/insumo.')) {
          await db.delete('inventory', id);
          AuditService.log(currentUser, 'DELETE', 'Inventory', id, `Excluiu item: ${name}`);
          fetchItems();
      }
  };

  const filteredItems = items.filter(item => {
      const matchesTab = item.type === activeTab;
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
          item.name?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.model?.toLowerCase().includes(term) ||
          item.manufacturer?.toLowerCase().includes(term) ||
          item.color?.toLowerCase().includes(term);
          
      return matchesTab && matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
      switch (sortBy) {
          case 'name_asc': return (a.name || '').localeCompare(b.name || '');
          case 'name_desc': return (b.name || '').localeCompare(a.name || '');
          case 'cost_asc': return (a.cost || 0) - (b.cost || 0);
          case 'cost_desc': return (b.cost || 0) - (a.cost || 0);
          case 'qty_asc': return (a.quantity || 0) - (b.quantity || 0);
          case 'qty_desc': return (b.quantity || 0) - (a.quantity || 0);
          case 'status_alert':
              const aAlert = (a.quantity <= a.minStock) ? 1 : 0;
              const bAlert = (b.quantity <= b.minStock) ? 1 : 0;
              return bAlert - aAlert;
          default: return 0;
      }
  });

  return (
    <div className="animate-fade-in">
        {/* Content */}
        <div className="card">
            <div className="card-header">
                <div>
                    <h3 className="card-title">
                        Estoque de Materiais & Insumos
                    </h3>
                    <p className="text-sm text-muted">
                        Controle o estoque de insumos para produção do Ateliê.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                     <input 
                        type="text" 
                        placeholder="Buscar item..." 
                        className="form-input" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                     />
                     <select 
                        className="form-input" 
                        value={sortBy} 
                        onChange={e => setSortBy(e.target.value)}
                        style={{ maxWidth: '200px' }}
                     >
                         <option value="name_asc">Nome (A-Z)</option>
                         <option value="name_desc">Nome (Z-A)</option>
                         <option value="status_alert">Acabando Primeiro</option>
                         <option value="qty_desc">Maior Quantidade</option>
                         <option value="cost_desc">Maior Custo Unitário</option>
                     </select>
                    <button className="btn btn-primary" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
                        <Plus size={16} />
                        Adicionar Item
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>Img</th>
                            <th>Nome do Item / Material</th>
                            <th>Quantidade Atual</th>
                            <th>Estoque Mínimo</th>
                            <th>Custo Base (Últ. Compra)</th>
                            <th>Status (Alerta)</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map(item => (
                            <tr 
                                key={item.id} 
                                onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ width: '60px' }}>
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                                    ) : (
                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                            <Package size={24} />
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.name}</div>
                                    <div className="flex gap-2 flex-wrap mt-1">
                                        {item.manufacturer && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">Fab: {item.manufacturer}</span>}
                                        {item.model && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Mod: {item.model}</span>}
                                        {item.color && <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">Cor: {item.color}</span>}
                                    </div>
                                    {item.description && <div className="text-[11px] text-gray-400 mt-1 truncate max-w-xs" title={item.description}>{item.description}</div>}
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                    {item.quantity} {item.unit}
                                </td>
                                <td className="text-muted">{item.minStock} {item.unit}</td>
                                <td>R$ {item.cost?.toFixed(2)}</td>
                                <td>
                                    {item.quantity <= item.minStock ? (
                                        <span className="badge badge-danger">Baixo Estoque</span>
                                    ) : (
                                        <span className="badge badge-success">Suficiente</span>
                                    )}
                                </td>
                                <td>
                                    <div className="flex gap-1">
                                        <button 
                                            className="btn btn-icon" 
                                            onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsModalOpen(true); }}
                                            title="Editar"
                                        >
                                            <Edit2 size={16}/>
                                        </button>
                                        <button 
                                            className="btn btn-icon" 
                                            style={{ color: '#10b981' }}
                                            onClick={(e) => { e.stopPropagation(); setLinkedEntityId(item.id); setLinkedEntityName(item.name); }}
                                            title="Lançamentos Financeiros Associados"
                                        >
                                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>R$</span>
                                        </button>
                                        <button 
                                            className="btn btn-icon text-danger" 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.name); }}
                                            title="Excluir"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {sortedItems.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center p-4 text-muted">
                                    Nenhum material de estoque encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <NewInventoryItemModal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
            defaultType={activeTab} // Open with current tab selected
            itemToEdit={editingItem}
            onItemSaved={() => {
                fetchItems();
                setIsModalOpen(false);
                setEditingItem(null);
            }}
            onItemCloned={(newItem) => {
                fetchItems();
                setEditingItem(newItem);
            }}
        />

        <LinkedTransactionsModal 
            isOpen={!!linkedEntityId}
            onClose={() => setLinkedEntityId(null)}
            entityId={linkedEntityId}
            entityName={linkedEntityName}
            entityType="Inventory"
        />
    </div>
  );
}

