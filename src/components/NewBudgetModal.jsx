
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Wrench, Package } from 'lucide-react';
import db from '../services/database.js';
import { calculateFractionalCost, getSubUnits } from '../utils/units';

export function NewBudgetModal({ isOpen, onClose, onBudgetCreated, editingBudget }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [materials, setMaterials] = useState([]);
  
  const [formData, setFormData] = useState({
    customer: '',
    validUntil: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    quantity: 1,
    price: 0
  });

  const [currentMachine, setCurrentMachine] = useState({
    equipId: '',
    minutes: 30, // Default 30 min
    hourCost: 0
  });

  const [currentMaterial, setCurrentMaterial] = useState({
      materialId: '',
      quantity: 1,
      usageUnit: 'un',
      cost: 0,
      baseUnit: 'un'
  });

  const [relatedOrders, setRelatedOrders] = useState([]);

  const [productSearch, setProductSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [equipSearch, setEquipSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
        if (isOpen) {
            try {
                const loadedCustomers = await db.getAll('customers');
                const loadedProducts = await db.getAll('products');
                const loadedEquips = await db.getAll('equipments');
                const loadedInventory = await db.getAll('inventory');
                
                setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
                setProducts(Array.isArray(loadedProducts) ? loadedProducts : []);
                setEquipments(Array.isArray(loadedEquips) ? loadedEquips : []);
                setMaterials(Array.isArray(loadedInventory) ? loadedInventory.filter(i => i.type === 'material') : []);

                if (editingBudget) {
                    setFormData({
                        customer: editingBudget.customerName || '',
                        validUntil: editingBudget.validUntil || '',
                        items: editingBudget.items || []
                    });
                    
                    const allOrders = await db.getAll('orders');
                    const filteredOrders = (allOrders || []).filter(o => String(o.fromBudget) === String(editingBudget.id));
                    setRelatedOrders(filteredOrders);
                } else {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    
                    setFormData({
                        customer: '',
                        validUntil: nextWeek.toISOString().split('T')[0],
                        items: []
                    });
                    setRelatedOrders([]);
                }
                setCurrentItem({ productId: '', quantity: 1, price: 0 });
                setCurrentMachine({ equipId: '', minutes: 30, hourCost: 0 });
                setCurrentMaterial({ materialId: '', quantity: 1, usageUnit: 'un', cost: 0, baseUnit: 'un' });
                
                setProductSearch('');
                setMaterialSearch('');
                setEquipSearch('');
            } catch (error) {
                console.error("Error loading modal data:", error);
                setCustomers([]);
                setProducts([]);
                setEquipments([]);
                setMaterials([]);
            }
        }
    };
    loadData();
  }, [isOpen, editingBudget]);

  const handleProductSelect = (e) => {
    const pId = e.target.value;
    const product = products.find(p => p.id == pId);
    setCurrentItem({
      productId: pId,
      quantity: 1,
      price: product ? product.price : 0
    });
  };

  const getEquipHourlyCost = (equip) => {
      if (!equip) return 0;
      const deprecMonthly = (parseFloat(equip.purchasePrice) || 0) / (parseInt(equip.lifespanMonths) || 1);
      const hrCost = deprecMonthly / (parseInt(equip.monthlyHours) || 160);
      let hrConsumableCost = 0;
      if (equip.consumables && equip.consumables.length > 0) {
          hrConsumableCost = equip.consumables.reduce((sum, c) => {
              if (c.inventoryId && Array.isArray(materials)) {
                  const invItem = materials.find(m => m.id === c.inventoryId);
                  if (invItem) {
                      const costPerAction = calculateFractionalCost(invItem.cost, invItem.unit, c.usedUnit, c.usedQuantity);
                      return sum + ((costPerAction * parseFloat(c.actionsPerHour || 1)) || 0);
                  }
              }
              return sum + ((c.cost || 0) / (c.yield || 1));
          }, 0);
      }
      return hrCost + hrConsumableCost;
  };

  const handleMachineSelect = (e) => {
      const eId = e.target.value;
      const equip = equipments.find(eq => eq.id === eId);
      if (equip) {
          const hrCost = getEquipHourlyCost(equip);
          setCurrentMachine(prev => ({ ...prev, equipId: eId, hourCost: hrCost }));
      } else {
          setCurrentMachine(prev => ({ ...prev, equipId: '', hourCost: 0 }));
      }
  };

  const handleMaterialSelect = (e) => {
      const mId = e.target.value;
      const material = materials.find(m => m.id === mId);
      if (material) {
          setCurrentMaterial({
              materialId: mId,
              quantity: 1,
              usageUnit: material.unit || 'un',
              cost: material.cost || 0,
              baseUnit: material.unit || 'un'
          });
      } else {
          setCurrentMaterial({ materialId: '', quantity: 1, usageUnit: 'un', cost: 0, baseUnit: 'un' });
      }
  };

  const addItem = () => {
    if (!currentItem.productId) return;
    const product = products.find(p => p.id == currentItem.productId);
    
    setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
            ...currentItem,
            productName: product.name,
            total: currentItem.price * currentItem.quantity
        }]
    }));
    
    setCurrentItem({ productId: '', quantity: 1, price: 0 });
    setProductSearch('');
  };

  const removeItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({...formData, items: newItems});
  };

  const addMachineCost = () => {
      if (!currentMachine.equipId) return;
      const equip = equipments.find(eq => eq.id === currentMachine.equipId);
      
      const totalCostForTime = (currentMachine.hourCost / 60) * currentMachine.minutes;
      
      setFormData(prev => ({
          ...prev,
          items: [...prev.items, {
              productId: `equip-${currentMachine.equipId}`,
              productName: `Custo Hora-Máquina: ${equip.name} (${currentMachine.minutes} min)`,
              quantity: 1,
              price: totalCostForTime,
              total: totalCostForTime,
              isMachineCost: true
          }]
      }));
      
      setCurrentMachine({ equipId: '', minutes: 30, hourCost: 0 });
      setEquipSearch('');
  };

  const addMaterialCost = () => {
      if (!currentMaterial.materialId) return;
      const material = materials.find(m => m.id === currentMaterial.materialId);
      
      const calcCost = calculateFractionalCost(currentMaterial.cost, currentMaterial.baseUnit, currentMaterial.usageUnit, currentMaterial.quantity);
      
      setFormData(prev => ({
          ...prev,
          items: [...prev.items, {
              productId: `mat-${currentMaterial.materialId}-${Date.now()}`,
              productName: `Material (Avulso): ${material.name} (${currentMaterial.quantity} ${currentMaterial.usageUnit})`,
              quantity: 1,
              price: calcCost,
              total: calcCost,
              isMaterialCost: true
          }]
      }));
      
      setCurrentMaterial({ materialId: '', quantity: 1, usageUnit: 'un', cost: 0, baseUnit: 'un' });
      setMaterialSearch('');
  };

  const calculateTotal = () => {
      return formData.items.reduce((acc, curr) => acc + curr.total, 0);
  };

  const sortedCustomers = [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const filteredProducts = products.filter(p => !productSearch || (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(productSearch.toLowerCase()));
  const groupedProducts = filteredProducts.reduce((acc, product) => {
      const category = product.category || 'Sem Categoria';
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
  }, {});
  const sortedCategories = Object.keys(groupedProducts).sort();
  for (const cat of sortedCategories) {
      groupedProducts[cat].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const filteredMaterials = materials.filter(m => !materialSearch || (m.name || '').toLowerCase().includes(materialSearch.toLowerCase()) || (m.materialGroup || '').toLowerCase().includes(materialSearch.toLowerCase()));
  const groupedMaterials = filteredMaterials.reduce((acc, m) => {
      const g = m.materialGroup || 'Outros / Sem Grupo';
      if (!acc[g]) acc[g] = [];
      acc[g].push(m);
      return acc;
  }, {});
  const sortedMaterialGroups = Object.keys(groupedMaterials).sort((a, b) => a.localeCompare(b));
  for (const group of sortedMaterialGroups) {
      groupedMaterials[group].sort((a, b) => a.name.localeCompare(b.name));
  }

  const filteredEquips = equipments.filter(e => !equipSearch || (e.name || '').toLowerCase().includes(equipSearch.toLowerCase())).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || formData.items.length === 0) return;

    if (editingBudget) {
        const updatedBudget = {
            ...editingBudget,
            customerName: formData.customer,
            validUntil: formData.validUntil,
            items: formData.items,
            total: calculateTotal()
        };
        await db.update('budgets', String(editingBudget.id), updatedBudget);
    } else {
        const newBudget = {
            id: `ORC-${Math.floor(Math.random() * 10000)}`, // Simple ID
            customerName: formData.customer,
            date: new Date().toISOString().split('T')[0],
            validUntil: formData.validUntil,
            items: formData.items,
            total: calculateTotal(),
            status: 'Rascunho' // Starts as Draft
        };
        await db.set('budgets', newBudget.id, newBudget);
    }
    
    if (onBudgetCreated) onBudgetCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{editingBudget ? `Editar Orçamento #${editingBudget.id}` : 'Novo Orçamento'}</h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="input-group">
              <label className="form-label">Cliente</label>
              <select 
                className="form-input"
                value={formData.customer}
                onChange={e => setFormData({...formData, customer: e.target.value})}
                required
              >
                  <option value="">Selecione...</option>
                  {sortedCustomers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div className="input-group">
                <label className="form-label">Validade da Proposta</label>
                <input 
                    type="date" 
                    className="form-input"
                    value={formData.validUntil}
                    onChange={e => setFormData({...formData, validUntil: e.target.value})}
                    required
                />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                <h4 style={{ marginBottom: 'var(--space-sm)' }}>Adicionar Novo Produto</h4>
                
                <div className="mb-3">
                    <input 
                        type="text" 
                        placeholder="Pesquisar produto ou categoria..." 
                        className="form-input text-sm w-full bg-white"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <select 
                            className="form-input"
                            value={currentItem.productId}
                            onChange={handleProductSelect}
                        >
                            <option value="">Produto (Catálogo)...</option>
                            {sortedCategories.map(category => (
                                <optgroup key={category} label={category}>
                                    {groupedProducts[category].map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <input 
                            type="number" 
                            className="form-input" 
                            placeholder="Qtd"
                            min="1"
                            value={currentItem.quantity}
                            onChange={e => setCurrentItem({...currentItem, quantity: parseInt(e.target.value)})}
                        />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                         <input 
                            type="number" 
                            className="form-input" 
                            placeholder="Preço (Un)"
                            step="0.01"
                            value={currentItem.price}
                            onChange={e => setCurrentItem({...currentItem, price: parseFloat(e.target.value)})}
                        />
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={addItem}>
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Injeção: Adicionar Material Fracionado no Orçamento */}
            <div style={{ backgroundColor: '#fff7ed', border: '1px dashed #fdba74', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <h4 style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={14} color="#ea580c" /> Vender Fração de Material (Corte/Dose Custo Base)
                </h4>
                
                <div className="mb-3">
                    <input 
                        type="text" 
                        placeholder="Pesquisar material ou tipo..." 
                        className="form-input text-sm w-full bg-white"
                        value={materialSearch}
                        onChange={e => setMaterialSearch(e.target.value)}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <select 
                            className="form-input text-sm"
                            value={currentMaterial.materialId}
                            onChange={handleMaterialSelect}
                        >
                            <option value="">Selecione o Material / Insumo...</option>
                            {sortedMaterialGroups.map(group => (
                                <optgroup key={group} label={group}>
                                    {groupedMaterials[group].map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (R$ {m.cost}/{m.unit})</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <input 
                            type="number" 
                            step="any"
                            className="form-input" 
                            placeholder="Qtd Exata"
                            value={currentMaterial.quantity}
                            onChange={e => setCurrentMaterial({...currentMaterial, quantity: e.target.value})}
                        />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                         <select 
                            className="form-input"
                            value={currentMaterial.usageUnit}
                            onChange={e => setCurrentMaterial({...currentMaterial, usageUnit: e.target.value})}
                            disabled={!currentMaterial.materialId}
                        >
                            {getSubUnits(currentMaterial.baseUnit).map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={addMaterialCost} style={{ backgroundColor: '#fb923c', color: 'white', borderColor: '#fb923c' }}>
                        <Plus size={16} />
                    </button>
                    {currentMaterial.materialId && (
                        <div style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: '#c2410c', marginTop: '4px', textAlign: 'right' }}>
                            Subtotal do Insumo calculado pelo sistema: <strong>R$ {calculateFractionalCost(currentMaterial.cost, currentMaterial.baseUnit, currentMaterial.usageUnit, currentMaterial.quantity).toFixed(2)}</strong> (Baseado em {currentMaterial.baseUnit} Original)
                        </div>
                    )}
                </div>
            </div>

            {/* Injeção: Adicionar Hora-Máquina no Orçamento */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <h4 style={{ marginBottom: '8px', fontSize: '0.9rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={14} color="#64748b" /> Embutir Custo de Hora-Máquina (Desgaste/Depreciação)
                </h4>
                
                <div className="mb-3">
                    <input 
                        type="text" 
                        placeholder="Pesquisar máquina..." 
                        className="form-input text-sm w-full bg-white"
                        value={equipSearch}
                        onChange={e => setEquipSearch(e.target.value)}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <select 
                            className="form-input text-sm"
                            value={currentMachine.equipId}
                            onChange={handleMachineSelect}
                        >
                            <option value="">Selecione o Equipamento...</option>
                            {Object.entries(
                                filteredEquips.reduce((acc, eq) => {
                                    const group = eq.equipmentGroup || 'Geral / Outros';
                                    if (!acc[group]) acc[group] = [];
                                    acc[group].push(eq);
                                    return acc;
                                }, {})
                            ).sort(([a], [b]) => a.localeCompare(b)).map(([group, eqs]) => (
                                <optgroup key={group} label={group}>
                                    {eqs.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(eq => {
                                        const hrCost = getEquipHourlyCost(eq);
                                        return (
                                            <option key={eq.id} value={eq.id}>{eq.name} (R$ {hrCost.toFixed(2)}/h)</option>
                                        )
                                    })}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <input 
                            type="number" 
                            className="form-input" 
                            placeholder="Minutos"
                            min="1"
                            value={currentMachine.minutes}
                            onChange={e => setCurrentMachine({...currentMachine, minutes: parseInt(e.target.value)})}
                        />
                    </div>
                    <button type="button" className="btn btn-primary" style={{ backgroundColor: '#0f766e', borderColor: '#0f766e' }} onClick={addMachineCost}>
                        Embutir Custo
                    </button>
                </div>
                {currentMachine.equipId && (
                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '8px', fontWeight: 600 }}>
                        Impacto no Orçamento: + R$ {((currentMachine.hourCost / 60) * (currentMachine.minutes || 0)).toFixed(2)}
                    </div>
                )}
            </div>

            <div style={{ marginTop: 'var(--space-md)', maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qtd</th>
                            <th>Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.productName}</td>
                                <td>{item.quantity}</td>
                                <td>R$ {item.total.toFixed(2)}</td>
                                <td>
                                    <button type="button" className="btn btn-icon text-danger" onClick={() => removeItem(idx)}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {formData.items.length === 0 && (
                            <tr><td colSpan="4" className="text-center text-muted">Nenhum item adicionado</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="modal-total-summary">
                <span>Total do Orçamento:</span>
                <span className="modal-total-value">R$ {calculateTotal().toFixed(2)}</span>
            </div>

            {editingBudget && relatedOrders.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '1rem' }}>
                        <Package size={18} /> Histórico de Pedidos Gerados (Integração de Produção e Financeiro)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {relatedOrders.map(order => (
                            <div key={order.id} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--surface)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <strong style={{fontSize: '1.1rem', color: 'var(--primary)'}}>Pedido #{order.id}</strong>
                                    <span className="badge badge-primary">{order.status}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', gap: '24px', marginBottom: '8px' }}>
                                        <span><strong>Criado em:</strong> {new Date(order.date).toLocaleDateString()}</span>
                                        <span><strong>Qtd de Arquivos/Itens:</strong> {order.items}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '24px', padding: '12px', background: 'var(--background)', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor do Pedido</span>
                                            <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}</strong>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Financeiro</span>
                                            {order.amountPaid >= order.total ? (
                                                <strong style={{ fontSize: '1rem', color: 'var(--success)' }}>Totalmente Pago (R$ {Number(order.amountPaid).toFixed(2).replace('.', ',')})</strong>
                                            ) : order.amountPaid > 0 ? (
                                                <strong style={{ fontSize: '1rem', color: 'var(--warning)' }}>Pagamento Parcial (R$ {Number(order.amountPaid).toFixed(2).replace('.', ',')})</strong>
                                            ) : (
                                                <strong style={{ fontSize: '1rem', color: 'var(--danger)' }}>Aguardando Pagamento</strong>
                                            )}
                                        </div>
                                        {order.productionStep && (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etapa de Produção</span>
                                                <strong style={{ fontSize: '1rem', color: 'var(--info)' }}>{order.productionStep}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              {editingBudget ? 'Deseja Salvar Modificações?' : 'Criar Rascunho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
