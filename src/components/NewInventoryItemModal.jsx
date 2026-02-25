
import React, { useState, useEffect } from 'react';
import { X, Save, Hammer, Package } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function NewInventoryItemModal({ isOpen, onClose, onItemSaved, defaultType = 'equipment', itemToEdit }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    type: defaultType,
    cost: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    serial: '',
    value: '', // estimated current value
    quantity: '',
    unit: 'un', // un, kg, m, l, cx
    minStock: '',
  });

  useEffect(() => {
      if (isOpen) {
          if (itemToEdit) {
              setFormData({
                  name: itemToEdit.name || '',
                  type: itemToEdit.type || defaultType,
                  cost: itemToEdit.cost || '',
                  purchaseDate: itemToEdit.purchaseDate || '',
                  serial: itemToEdit.serial || '',
                  value: itemToEdit.value || '',
                  quantity: itemToEdit.quantity || '',
                  unit: itemToEdit.unit || 'un',
                  minStock: itemToEdit.minStock || ''
              });
          } else {
             setFormData({
                name: '',
                type: defaultType,
                cost: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                serial: '',
                value: '',
                quantity: '',
                unit: 'un',
                minStock: '',
             });
          }
      }
  }, [isOpen, itemToEdit, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const itemData = {
      name: formData.name,
      type: formData.type,
      cost: parseFloat(formData.cost) || 0,
      status: 'active',
      // Equipment
      serial: formData.type === 'equipment' ? formData.serial : null,
      purchaseDate: formData.type === 'equipment' ? formData.purchaseDate : null,
      value: formData.type === 'equipment' ? (parseFloat(formData.value) || parseFloat(formData.cost) || 0) : null,
      // Material
      quantity: formData.type === 'material' ? (parseFloat(formData.quantity) || 0) : null,
      unit: formData.type === 'material' ? formData.unit : null,
      minStock: formData.type === 'material' ? (parseFloat(formData.minStock) || 0) : null,
      
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'Sistema'
    };

    if (itemToEdit) {
        await db.update('inventory', itemToEdit.id, itemData);
        AuditService.log(currentUser, 'UPDATE', 'Inventory', itemToEdit.id, `Atualizou item: ${formData.name}`);
    } else {
        const newItem = await db.create('inventory', { ...itemData, createdAt: new Date().toISOString() });
        AuditService.log(currentUser, 'CREATE', 'Inventory', newItem.id || 'unknown', `Criou item: ${formData.name}`);
    }
    
    if (onItemSaved) onItemSaved();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{itemToEdit ? 'Editar Item' : 'Novo Item de Inventário'}</h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {!itemToEdit && (
                <div className="flex gap-md mb-4" style={{ marginBottom: 'var(--space-lg)' }}>
                    <button
                        type="button"
                        className={`btn ${formData.type === 'equipment' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFormData({...formData, type: 'equipment'})}
                        style={{ flex: 1 }}
                    >
                        <Hammer size={16} /> Equipamento
                    </button>
                    <button
                        type="button"
                        className={`btn ${formData.type === 'material' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFormData({...formData, type: 'material'})}
                        style={{ flex: 1 }}
                    >
                        <Package size={16} /> Material
                    </button>
                </div>
            )}

            <div className="input-group">
              <label className="form-label">Nome do Item *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder={formData.type === 'equipment' ? "Ex: Notebook Dell" : "Ex: Papel Offset 90g"}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                autoFocus={!itemToEdit}
              />
            </div>

            {/* Conditional Fields based on Type */}
            {formData.type === 'equipment' ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label className="form-label">Data Aquisição</label>
                            <input 
                                type="date"
                                className="form-input" 
                                value={formData.purchaseDate}
                                onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Valor Pago (R$)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                className="form-input" 
                                placeholder="0,00"
                                value={formData.cost}
                                onChange={e => setFormData({...formData, cost: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="form-label">Número de Série / Patrimônio</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Opcional"
                            value={formData.serial}
                            onChange={e => setFormData({...formData, serial: e.target.value})}
                        />
                    </div>
                </>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                       <div className="input-group">
                            <label className="form-label">Unidade de Medida</label>
                            <select 
                                className="form-input"
                                value={formData.unit}
                                onChange={e => setFormData({...formData, unit: e.target.value})}
                            >
                                <option value="un">Unidade (un)</option>
                                <option value="kg">Quilos (kg)</option>
                                <option value="m">Metros (m)</option>
                                <option value="l">Litros (l)</option>
                                <option value="cx">Caixa (cx)</option>
                                <option value="pct">Pacote (pct)</option>
                            </select>
                        </div>
                         <div className="input-group">
                            <label className="form-label">Custo Unit. (R$)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                className="form-input" 
                                placeholder="0,00"
                                value={formData.cost}
                                onChange={e => setFormData({...formData, cost: e.target.value})}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label className="form-label">Quantidade Inicial</label>
                            <input 
                                type="number" 
                                step="any"
                                className="form-input" 
                                placeholder="0"
                                value={formData.quantity}
                                onChange={e => setFormData({...formData, quantity: e.target.value})}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Estoque Mínimo</label>
                            <input 
                                type="number" 
                                step="any"
                                className="form-input" 
                                placeholder="Avisar quando atingir..."
                                value={formData.minStock}
                                onChange={e => setFormData({...formData, minStock: e.target.value})}
                            />
                        </div>
                    </div>
                </>
            )}

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              {itemToEdit ? 'Salvar Alterações' : 'Salvar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
