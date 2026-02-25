
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, DollarSign, Users, Package, Clock } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

import { useForm, Validators } from '../utils/validation';

export function NewProductModal({ isOpen, onClose, onProductSaved, productToEdit }) {
  const { currentUser } = useAuth();
  
  // Validation Schema
  const productSchema = {
       name: Validators.string(3, "Nome deve ter pelo menos 3 letras"),
       price: Validators.number(0.01, "Preço deve ser maior que zero"),
       category: Validators.string(1, "Selecione uma categoria"),
       // stock is optional or defaults to 0
  };

  const { values, setValues, errors, handleChange, validate, isSubmitting, setIsSubmitting } = useForm({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    image: '',
    showMaterials: false,
    laborCost: ''
  }, productSchema);
  
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  
  // Labor Management
  const [staffList, setStaffList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [laborItems, setLaborItems] = useState([]); 

  useEffect(() => {
      const loadData = async () => {
          if (isOpen) {
              // Load dependencies
              const inventory = await db.getAll('inventory') || [];
              const staff = await db.getAll('staff') || [];
              const cats = await db.getAll('categories') || [];
              
              setMaterialsList(Array.isArray(inventory) ? inventory.filter(i => i.type === 'material') : []);
              setStaffList(Array.isArray(staff) ? staff : []);
              setCategoriesList(Array.isArray(cats) ? cats : []);

              // Load Product Data if Editing
              if (productToEdit) {
                  setValues({
                      name: productToEdit.name || '',
                      description: productToEdit.description || '',
                      price: productToEdit.price || '',
                      stock: productToEdit.stock || '',
                      category: productToEdit.category || '',
                      image: productToEdit.image || '',
                      laborCost: productToEdit.laborCost || ''
                  });
                  
                  // Restore materials
                  if (productToEdit.materials && Array.isArray(productToEdit.materials)) {
                      const restoredMaterials = productToEdit.materials.map(m => {
                          const originalItem = inventory.find(i => i.id === m.id);
                          return {
                              ...originalItem,
                              id: m.id,
                              qtyUsed: m.qty
                          };
                      }).filter(m => m.name);
                      setSelectedMaterials(restoredMaterials);
                  } else {
                      setSelectedMaterials([]);
                  }

                  // Restore Labor
                  if (productToEdit.laborDetails && Array.isArray(productToEdit.laborDetails)) {
                      setLaborItems(productToEdit.laborDetails);
                  } else {
                      setLaborItems([]);
                  }

              } else {
                  // Reset for New
                  setValues({
                    name: '',
                    description: '',
                    price: '',
                    stock: '',
                    category: '',
                    image: '',
                    showMaterials: false,
                    laborCost: ''
                  });
                  setSelectedMaterials([]);
                  setLaborItems([]);
              }
          }
      };
      loadData();
  }, [isOpen, productToEdit]); // Removed setValues from dependency to avoid loop if implementation changes (it's stable usually)

  if (!isOpen) return null;

  // ... (Material & Labor Handlers remain unchanged, just ensure they don't depend on formData directly if possible, or access 'values')

  const handleAddMaterial = (e) => {
      const materialId = e.target.value;
      if (!materialId) return;
      const material = materialsList.find(m => m.id == materialId);
      if (material && !selectedMaterials.find(m => m.id == materialId)) {
          setSelectedMaterials([...selectedMaterials, { ...material, qtyUsed: 1 }]);
      }
      e.target.value = '';
  };

  const handleUpdateMaterialQty = (id, qty) => {
      setSelectedMaterials(selectedMaterials.map(m => 
          m.id === id ? { ...m, qtyUsed: parseFloat(qty) || 0 } : m
      ));
  };

  const handleRemoveMaterial = (id) => {
      setSelectedMaterials(selectedMaterials.filter(m => m.id !== id));
  };

  const handleAddLabor = () => {
      setLaborItems([...laborItems, { staffId: '', timeMinutes: 0 }]);
  };

  const updateLaborItem = (index, field, value) => {
      const newItems = [...laborItems];
      newItems[index] = { ...newItems[index], [field]: value };
      setLaborItems(newItems);
  };
  
  const removeLaborItem = (index) => {
      const newItems = [...laborItems];
      newItems.splice(index, 1);
      setLaborItems(newItems);
  };

  const calculateTotalLaborCost = () => {
      return laborItems.reduce((acc, item) => {
          const staff = staffList.find(s => s.id == item.staffId);
          if (!staff || !item.timeMinutes) return acc;
          const costPerMinute = (staff.hourlyRate || 0) / 60;
          return acc + (costPerMinute * (parseFloat(item.timeMinutes) || 0));
      }, 0);
  };
  
  const calculateTotalMaterialCost = () => {
      return selectedMaterials.reduce((acc, m) => acc + (m.cost || 0) * m.qtyUsed, 0);
  };

  const calculateTotalCost = () => {
      return calculateTotalLaborCost() + calculateTotalMaterialCost();
  };
  
  const calculateMargin = () => {
        const cost = calculateTotalCost();
        const price = parseFloat(values.price) || 0;
        if (!price) return 0;
        return ((price - cost) / price) * 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!validate()) return;
    
    setIsSubmitting(true);

    const laborCost = calculateTotalLaborCost();
    const materialCost = calculateTotalMaterialCost();
    const totalCost = laborCost + materialCost;

    const productData = {
      name: values.name,
      description: values.description || '',
      price: parseFloat(values.price) || 0,
      stock: parseInt(values.stock) || 0,
      category: values.category || 'Geral',
      image: values.image || '',
      laborCost: laborCost,
      materialCost: materialCost,
      totalCost: totalCost,
      laborDetails: laborItems, 
      materials: selectedMaterials.map(m => ({ id: m.id, qty: m.qtyUsed })),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'Sistema'
    };

    try {
        let result;
        if (productToEdit) {
            result = await db.update('products', productToEdit.id, productData);
            AuditService.log(currentUser, 'UPDATE', 'Product', productToEdit.id, `Atualizou produto: ${values.name}`);
        } else {
            result = await db.create('products', { ...productData, createdAt: new Date().toISOString() });
            AuditService.log(currentUser, 'CREATE', 'Product', result.id || 'unknown', `Criou produto: ${values.name}`);
        }

        if (onProductSaved) onProductSaved();
        onClose();
    } catch (err) {
        console.error("Erro ao salvar produto:", err);
        alert("Erro ao salvar produto.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{productToEdit ? 'Editar Produto' : 'Novo Produto & Ficha Técnica'}</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="modal-body">
            
            <div className="input-group">
              <label className="form-label">Nome do Produto</label>
              <input 
                name="name"
                type="text" 
                className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Ex: Caderno A5 Personalizado"
                value={values.name}
                onChange={handleChange}
                // removed 'required' HTML native to test JS validation
                autoFocus={!productToEdit}
              />
              {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name}</span>}
            </div>

            <div className="input-group">
              <label className="form-label">Descrição</label>
              <textarea 
                name="description"
                className="form-input" 
                rows="2"
                placeholder="Características, observações, detalhes..."
                value={values.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-md">
                <div className="input-group">
                <label className="form-label">Categoria</label>
                {categoriesList.length > 0 ? (
                    <select 
                        name="category"
                        className={`form-input ${errors.category ? 'border-red-500' : ''}`}
                        value={values.category}
                        onChange={handleChange}
                    >
                        <option value="">Selecione...</option>
                        {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                ) : (
                    <input 
                        name="category"
                        type="text" 
                        className={`form-input ${errors.category ? 'border-red-500' : ''}`}
                        placeholder="Ex: Cadernos"
                        value={values.category}
                        onChange={handleChange}
                    />
                )}
                 {errors.category && <span className="text-xs text-red-500 mt-1">{errors.category}</span>}
                </div>
                <div className="input-group">
                <label className="form-label">Preço de Venda (R$)</label>
                <input 
                    name="price"
                    type="number" 
                    step="0.01"
                    className={`form-input ${errors.price ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                    value={values.price}
                    onChange={handleChange}
                />
                 {errors.price && <span className="text-xs text-red-500 mt-1">{errors.price}</span>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-md">
                 <div className="input-group">
                <label className="form-label">Estoque Atual</label>
                <input 
                    name="stock"
                    type="number" 
                    className="form-input" 
                    placeholder="0"
                    value={values.stock}
                    onChange={handleChange}
                />
                </div>
                 <div className="input-group">
                    <label className="form-label">URL da Imagem</label>
                    <input 
                        name="image"
                        type="url" 
                        className="form-input" 
                        value={values.image}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {/* COST CALCULATION SECTION - REDESIGNED */}
            <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-700">
                    <DollarSign size={20} className="text-primary" />
                    Composição de Custos e Precificação
                </h3>

                {/* COST COMPOSITION - REDESIGNED "CARDS" LAYOUT */}
                {/* COST COMPOSITION - INDENTED HIERARCHY LAYOUT */}
                <div className="flex flex-col gap-8 pl-2">
                    
                    {/* 1. MÃO DE OBRA */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                             <Users size={18} className="text-gray-700" />
                             <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Mão de Obra</h4>
                             <div className="ml-auto bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-mono font-bold">
                                 R$ {calculateTotalLaborCost().toFixed(2)}
                             </div>
                        </div>

                        {/* Indented Content Container */}
                        <div className="pl-6 flex flex-col gap-3 border-l-2 border-gray-100 ml-2">
                            {laborItems.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center bg-gray-50 p-3 rounded-r-lg border-y border-r border-gray-200 shadow-sm hover:bg-white transition-colors">
                                    <select 
                                        className="form-input flex-1 text-sm bg-transparent border-none focus:ring-0" 
                                        value={item.staffId} 
                                        onChange={e => updateLaborItem(idx, 'staffId', e.target.value)}
                                        required
                                    >
                                        <option value="">Selecione Profissional...</option>
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} (R$ {s.hourlyRate?.toFixed(2)}/h)</option>
                                        ))}
                                    </select>
                                    <div className="w-px h-6 bg-gray-300 mx-2"></div>
                                    <div className="flex items-center gap-1 w-20">
                                        <input 
                                            type="number" 
                                            className="w-full bg-transparent border-none text-center text-sm p-0 focus:ring-0 font-bold text-gray-700" 
                                            placeholder="0" 
                                            value={item.timeMinutes} 
                                            onChange={e => updateLaborItem(idx, 'timeMinutes', e.target.value)}
                                            required
                                        />
                                        <span className="text-xs text-muted">min</span>
                                    </div>
                                    <button type="button" onClick={() => removeLaborItem(idx)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={15}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddLabor} className="flex items-center gap-2 text-primary font-medium text-xs hover:bg-primary/5 p-2 rounded-lg w-fit transition-colors ml-1">
                                <div className="bg-primary/10 p-1 rounded-full"><Plus size={14} /></div>
                                Adicionar Processo
                            </button>
                        </div>
                    </div>

                    {/* GAP / SEPARATOR */}
                    <div className="flex items-center gap-4 py-2">
                         <div className="h-px bg-gray-200 flex-1 dashed"></div>
                         <span className="text-xs text-gray-400 font-medium">Custos Adicionais</span>
                         <div className="h-px bg-gray-200 flex-1 dashed"></div>
                    </div>

                    {/* 2. MATÉRIA PRIMA */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                             <Package size={18} className="text-gray-700" />
                             <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Matéria Prima</h4>
                             <div className="ml-auto bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-mono font-bold">
                                 R$ {calculateTotalMaterialCost().toFixed(2)}
                             </div>
                        </div>

                        {/* Indented Content Container */}
                        <div className="pl-6 flex flex-col gap-3 border-l-2 border-gray-100 ml-2">
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-r-lg border border-gray-200 mb-2">
                                 <Plus size={16} className="text-gray-400 ml-2"/>
                                 <select 
                                    className="form-input flex-1 text-sm bg-transparent border-none focus:ring-0 text-gray-600" 
                                    onChange={handleAddMaterial}
                                >
                                    <option value="">Selecionar Material para Adicionar...</option>
                                    {materialsList.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.unit}) - R$ {m.cost}/un</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                {selectedMaterials.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 text-sm p-2 hover:bg-gray-50 rounded border-b border-gray-50 transition-colors">
                                        <span className="flex-1 font-medium text-gray-700 truncate pl-2" title={m.name}>{m.name}</span>
                                        <div className="flex items-center bg-white border border-gray-200 rounded px-2 h-8 w-24">
                                            <input 
                                                type="number" 
                                                step="any" 
                                                value={m.qtyUsed}
                                                onChange={(e) => handleUpdateMaterialQty(m.id, e.target.value)}
                                                className="w-full bg-transparent border-none text-center p-0 h-full focus:ring-0 font-medium"
                                            />
                                            <span className="text-xs text-muted border-l pl-1 ml-1">{m.unit}</span>
                                        </div>
                                        <span className="font-mono text-xs w-20 text-right text-gray-600">R$ {(m.qtyUsed * (m.cost||0)).toFixed(2)}</span>
                                        <button type="button" onClick={() => handleRemoveMaterial(m.id)} className="text-gray-400 hover:text-red-500 p-2"><X size={15}/></button>
                                    </div>
                                ))}
                                {selectedMaterials.length === 0 && <span className="text-xs text-gray-400 italic pl-2">Nenhum custo material lançado.</span>}
                            </div>
                        </div>
                    </div>

                </div>

                {/* 3. RESUMO E KPIs - Compact Horizontal Layout requested by User */}
                {/* 3. RESUMO E KPIs - Compact Horizontal Layout requested by User */}
                <div className="mt-8 pt-6 border-t border-dashed border-border grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="px-4 py-3 rounded-lg border border-border bg-surface flex items-center justify-between gap-2 shadow-sm">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider whitespace-nowrap">MO Total</span>
                        <span className="text-sm font-mono font-bold text-gray-700">R$ {calculateTotalLaborCost().toFixed(2)}</span>
                     </div>
                     <div className="px-4 py-3 rounded-lg border border-border bg-surface flex items-center justify-between gap-2 shadow-sm">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider whitespace-nowrap">Mat. Total</span>
                        <span className="text-sm font-mono font-bold text-gray-700">R$ {calculateTotalMaterialCost().toFixed(2)}</span>
                     </div>
                     <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between gap-2 relative overflow-hidden ring-1 ring-primary/10">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider whitespace-nowrap">Total</span>
                        <span className="text-base font-bold font-mono text-primary">R$ {calculateTotalCost().toFixed(2)}</span>
                     </div>
                     <div className={`px-4 py-3 rounded-lg border flex items-center justify-between gap-2 ${calculateMargin() > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${calculateMargin() > 0 ? 'text-emerald-700' : 'text-red-700'}`}>Margem</span>
                        <span className={`text-base font-bold font-mono ${calculateMargin() > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {calculateMargin().toFixed(1)}%
                        </span>
                     </div>
                </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
                <Save size={16} /> 
                {productToEdit ? 'Salvar Alterações' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

