import React, { useState, useEffect } from 'react';
import { Package, Truck, Activity, Hammer, Plus, Edit2, Trash2 } from 'lucide-react';
import db from '../services/database.js';
import { NewInventoryItemModal } from '../components/NewInventoryItemModal.jsx';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function Inventory() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('equipment'); // equipment, materials
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      if (window.confirm('Tem certeza? Para materiais, isso remove o histórico de estoque.')) {
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
          item.color?.toLowerCase().includes(term) ||
          item.serial?.toLowerCase().includes(term);
          
      return matchesTab && matchesSearch;
  });

  return (
    <div className="animate-fade-in">
        {/* Tabs */}
        <div className="tabs">
            <button 
                className={`tab-item ${activeTab === 'equipment' ? 'active' : ''}`}
                onClick={() => setActiveTab('equipment')}
            >
                <Hammer size={16} className="inline mr-2"/>
                Equipamentos & Ativos
            </button>
            <button 
                className={`tab-item ${activeTab === 'material' ? 'active' : ''}`}
                onClick={() => setActiveTab('material')}
            >
                <Package size={16} className="inline mr-2"/>
                Matéria-Prima
            </button>
        </div>

        {/* Content */}
        <div className="card">
            <div className="card-header">
                <div>
                    <h3 className="card-title">
                        {activeTab === 'equipment' ? 'Lista de Equipamentos' : 'Estoque de Materiais'}
                    </h3>
                    <p className="text-sm text-muted">
                        {activeTab === 'equipment' 
                            ? 'Gerencie seus ativos, máquinas e ferramentas.' 
                            : 'Controle o estoque de insumos para produção.'}
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
                            <th>Nome do Item</th>
                            {activeTab === 'equipment' ? (
                                <>
                                    <th>Serial / ID</th>
                                    <th>Data Compra</th>
                                    <th>Valor Estimado</th>
                                    <th>Status</th>
                                </>
                            ) : (
                                <>
                                    <th>Quantidade Atual</th>
                                    <th>Estoque Mínimo</th>
                                    <th>Custo Unit.</th>
                                    <th>Status</th>
                                </>
                            )}
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.name}</div>
                                    <div className="flex gap-2 flex-wrap mt-1">
                                        {item.manufacturer && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">Fab: {item.manufacturer}</span>}
                                        {item.model && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Mod: {item.model}</span>}
                                        {item.color && <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">Cor: {item.color}</span>}
                                    </div>
                                    {item.description && <div className="text-[11px] text-gray-400 mt-1 truncate max-w-xs" title={item.description}>{item.description}</div>}
                                </td>
                                {activeTab === 'equipment' ? (
                                    <>
                                        <td className="text-muted">{item.serial || '-'}</td>
                                        <td className="text-muted">{item.purchaseDate}</td>
                                        <td>R$ {item.value?.toFixed(2)}</td>
                                        <td><span className="badge badge-success">Ativo</span></td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ fontWeight: 600 }}>
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="text-muted">{item.minStock} {item.unit}</td>
                                        <td>R$ {item.cost?.toFixed(2)}</td>
                                        <td>
                                            {item.quantity <= item.minStock ? (
                                                <span className="badge badge-danger">Baixo Estoque</span>
                                            ) : (
                                                <span className="badge badge-success">OK</span>
                                            )}
                                        </td>
                                    </>
                                )}
                                <td>
                                    <div className="flex gap-1">
                                        <button 
                                            className="btn btn-icon" 
                                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                            title="Editar"
                                        >
                                            <Edit2 size={16}/>
                                        </button>
                                        <button 
                                            className="btn btn-icon text-danger" 
                                            onClick={() => handleDelete(item.id, item.name)}
                                            title="Excluir"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={activeTab === 'equipment' ? 6 : 6} className="text-center p-4 text-muted">
                                    Nenhum item encontrado nesta categoria.
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
        />
    </div>
  );
}

