
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Wrench, Package } from 'lucide-react';
import db from '../services/database.js';
import { calculateFractionalCost, getSubUnits } from '../utils/units';

export function NewBudgetModal({ isOpen, onClose, onBudgetCreated }) {
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

                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                
                setFormData({
                    customer: '',
                    validUntil: nextWeek.toISOString().split('T')[0],
                    items: []
                });
                setCurrentItem({ productId: '', quantity: 1, price: 0 });
                setCurrentMachine({ equipId: '', minutes: 30, hourCost: 0 });
                setCurrentMaterial({ materialId: '', quantity: 1, usageUnit: 'un', cost: 0, baseUnit: 'un' });
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
  }, [isOpen]);

  const handleProductSelect = (e) => {
    const pId = e.target.value;
    const product = products.find(p => p.id == pId);
    setCurrentItem({
      productId: pId,
      quantity: 1,
      price: product ? product.price : 0
    });
  };

  const handleMachineSelect = (e) => {
      const eId = e.target.value;
      const equip = equipments.find(eq => eq.id === eId);
      if (equip) {
          const deprecMonthly = (parseFloat(equip.purchasePrice) || 0) / (parseInt(equip.lifespanMonths) || 1);
          const hrCost = deprecMonthly / (parseInt(equip.monthlyHours) || 160);
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
  };

  const calculateTotal = () => {
      return formData.items.reduce((acc, curr) => acc + curr.total, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || formData.items.length === 0) return;

    const newBudget = {
        id: `ORC-${Math.floor(Math.random() * 10000)}`, // Simple ID
        customerName: formData.customer,
        date: new Date().toISOString().split('T')[0],
        validUntil: formData.validUntil,
        items: formData.items,
        total: calculateTotal(),
        status: 'Rascunho' // Starts as Draft
    };

    // Usamos db.set com o custom ID para amarrá-lo ao Firestore doc id
    await db.set('budgets', newBudget.id, newBudget);
    
    if (onBudgetCreated) onBudgetCreated();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Orçamento</h2>
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
                  {customers.map(c => (
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <select 
                            className="form-input"
                            value={currentItem.productId}
                            onChange={handleProductSelect}
                        >
                            <option value="">Produto (Catálogo)...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <select 
                            className="form-input"
                            value={currentMaterial.materialId}
                            onChange={handleMaterialSelect}
                        >
                            <option value="">Selecione o Material / Insumo...</option>
                            {Object.entries(
                                materials.reduce((acc, m) => {
                                    const g = m.materialGroup || 'Outros / Sem Grupo';
                                    if (!acc[g]) acc[g] = [];
                                    acc[g].push(m);
                                    return acc;
                                }, {})
                            )
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([group, mats]) => (
                                <optgroup key={group} label={group}>
                                    {mats.sort((a,b) => a.name.localeCompare(b.name)).map(m => (
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <select 
                            className="form-input"
                            value={currentMachine.equipId}
                            onChange={handleMachineSelect}
                        >
                            <option value="">Selecione o Equipamento...</option>
                            {equipments.map(eq => (
                                <option key={eq.id} value={eq.id}>{eq.name} (R$ {((parseFloat(eq.purchasePrice)/(parseInt(eq.lifespanMonths)||1))/(parseInt(eq.monthlyHours)||160)).toFixed(2)}/h)</option>
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

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Criar Rascunho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
