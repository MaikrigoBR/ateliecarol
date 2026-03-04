
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
    description: '',
    model: '',
    color: '',
    manufacturer: ''
  });

  const [createFinance, setCreateFinance] = useState(false);
  const [financeAccountId, setFinanceAccountId] = useState('');
  const [financeDate, setFinanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [financeStatus, setFinanceStatus] = useState('pending');
  const [accounts, setAccounts] = useState([]);

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
                  minStock: itemToEdit.minStock || '',
                  description: itemToEdit.description || '',
                  model: itemToEdit.model || '',
                  color: itemToEdit.color || '',
                  manufacturer: itemToEdit.manufacturer || ''
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
                 description: '',
                 model: '',
                 color: '',
                 manufacturer: ''
              });
          }
          db.getAll('accounts').then(res => setAccounts(res || []));
          setCreateFinance(false);
          setFinanceAccountId('');
          setFinanceDate(new Date().toISOString().split('T')[0]);
          setFinanceStatus('pending');
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
      
      description: formData.description,
      model: formData.model,
      color: formData.color,
      manufacturer: formData.manufacturer,

      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'Sistema'
    };

    if (itemToEdit) {
        await db.update('inventory', itemToEdit.id, itemData);
        AuditService.log(currentUser, 'UPDATE', 'Inventory', itemToEdit.id, `Atualizou item: ${formData.name}`);
    } else {
        const newItem = await db.create('inventory', { ...itemData, createdAt: new Date().toISOString() });
        AuditService.log(currentUser, 'CREATE', 'Inventory', newItem.id || 'unknown', `Criou item: ${formData.name}`);
        
        // --- Integração Financeira Automática ---
        const totalCost = formData.type === 'equipment' 
            ? (parseFloat(formData.cost) || 0) 
            : (parseFloat(formData.cost) || 0) * (parseFloat(formData.quantity) || 0);

        if (createFinance && totalCost > 0 && financeAccountId) {
            const category = formData.type === 'equipment' ? 'Equipamentos & Ativos' : 'Materiais & Insumos';
            await db.create('transactions', {
                description: `Compra de ${formData.type === 'equipment' ? 'Equipamento' : 'Estoque'}: ${formData.name}`,
                amount: totalCost,
                type: 'expense',
                category: category,
                accountId: financeAccountId,
                date: financeDate,
                status: financeStatus,
                installments: 1,
                isRecurring: false,
                createdAt: new Date().toISOString()
            });
        }
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

            <div className="input-group">
                <label className="form-label">Descrição (Opcional)</label>
                <textarea 
                    className="form-input" 
                    placeholder="Detalhes adicionais sobre o item..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={2}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label className="form-label">Modelo</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Opcional"
                                value={formData.model}
                                onChange={e => setFormData({...formData, model: e.target.value})}
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Fabricante</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Opcional"
                                value={formData.manufacturer}
                                onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                            />
                        </div>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label className="form-label">Modelo</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Opcional"
                                value={formData.model}
                                onChange={e => setFormData({...formData, model: e.target.value})}
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Cor</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Opcional"
                                value={formData.color}
                                onChange={e => setFormData({...formData, color: e.target.value})}
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Fabricante</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Opcional"
                                value={formData.manufacturer}
                                onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Injeção: Integração Financeira */}
            {!itemToEdit && formData.cost > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input 
                            type="checkbox" 
                            checked={createFinance} 
                            onChange={e => setCreateFinance(e.target.checked)} 
                            className="rounded text-blue-500 w-4 h-4" 
                        />
                        <span className="text-sm font-bold text-gray-800">Lançar no Financeiro (Gerar Despesa)</span>
                    </label>

                    {createFinance && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-100 mb-2">
                                <span className="text-gray-500 font-medium">Valor Total da Saída:</span>
                                <span className="font-bold text-red-500">
                                    R$ {(formData.type === 'equipment' ? (parseFloat(formData.cost) || 0) : ((parseFloat(formData.cost) || 0) * (parseFloat(formData.quantity) || 0))).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="input-group">
                                    <label className="form-label text-xs">Vínculo de Conta *</label>
                                    <select 
                                        className="form-input text-sm" 
                                        value={financeAccountId} 
                                        onChange={e => setFinanceAccountId(e.target.value)}
                                        required={createFinance}
                                    >
                                        <option value="">Selecione uma conta...</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="form-label text-xs">Data de Vencimento/Pagamento</label>
                                    <input 
                                        type="date" 
                                        className="form-input text-sm" 
                                        value={financeDate}
                                        onChange={e => setFinanceDate(e.target.value)}
                                        required={createFinance}
                                    />
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="form-label text-xs">Situação do Pagamento</label>
                                <select 
                                    className="form-input text-sm" 
                                    value={financeStatus} 
                                    onChange={e => setFinanceStatus(e.target.value)}
                                >
                                    <option value="pending">A Pagar (Provisionado)</option>
                                    <option value="paid">Já Pago (Debita Imediatamente)</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
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
