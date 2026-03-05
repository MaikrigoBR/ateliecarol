import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, DollarSign, Users, Package, Clock, Image as ImageIcon, Video, Percent, Tag, PieChart, Info, Upload, Eye } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';
import { useForm, Validators } from '../utils/validation';

export function NewProductModal({ isOpen, onClose, onProductSaved, productToEdit }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('basic'); // basic, costs, campaign
  
  // Validation Schema
  const productSchema = {
       name: Validators.string(3, "Nome deve ter pelo menos 3 letras"),
       price: Validators.number(0.01, "Preço deve ser maior que zero"),
       category: Validators.string(1, "Selecione uma categoria")
  };

  const { values, setValues, errors, handleChange, validate, isSubmitting, setIsSubmitting } = useForm({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    videoUrl: '',
    campaignActive: false,
    campaignDiscount: '',
    isPublic: false
  }, productSchema);

  const [images, setImages] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [laborItems, setLaborItems] = useState([]); 

  useEffect(() => {
      const loadData = async () => {
          if (isOpen) {
              const inventory = await db.getAll('inventory') || [];
              const staff = await db.getAll('staff') || [];
              const cats = await db.getAll('categories') || [];
              
              setMaterialsList(Array.isArray(inventory) ? inventory.filter(i => i.type === 'material') : []);
              setStaffList(Array.isArray(staff) ? staff : []);
              setCategoriesList(Array.isArray(cats) ? cats : []);

              if (productToEdit) {
                  setValues({
                      name: productToEdit.name || '',
                      description: productToEdit.description || '',
                      price: productToEdit.price || '',
                      stock: productToEdit.stock || '',
                      category: productToEdit.category || '',
                      videoUrl: productToEdit.videoUrl || '',
                      campaignActive: productToEdit.campaignActive || false,
                      campaignDiscount: productToEdit.campaignDiscount || '',
                      isPublic: productToEdit.isPublic || false
                  });
                  
                  // Restore images (legacy image vs array of images)
                  if (productToEdit.images && Array.isArray(productToEdit.images)) {
                      setImages(productToEdit.images);
                  } else if (productToEdit.image) {
                      setImages([productToEdit.image]);
                  } else {
                      setImages([]);
                  }

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
                  // Reset
                  setValues({
                    name: '', description: '', price: '', stock: '', category: '', videoUrl: '', campaignActive: false, campaignDiscount: '', isPublic: false
                  });
                  setImages([]);
                  setSelectedMaterials([]);
                  setLaborItems([]);
              }
              setActiveTab('basic');
          }
      };
      loadData();
  }, [isOpen, productToEdit]);

  if (!isOpen) return null;

  // IMAGE UPLOAD HANDLER
  const handleImageUpload = (e) => {
      const files = Array.from(e.target.files);
      if (images.length + files.length > 5) {
          alert('Máximo de 5 imagens.');
          return;
      }
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              // Basic compression check
              if (ev.target.result.length > 800000) {
                  alert("Uma imagem é muito grande. Escolha imagens menores para não pesar o sistema.");
                  return;
              }
              setImages(prev => [...prev, ev.target.result]);
          };
          reader.readAsDataURL(file);
      });
  };

  const removeImage = (idx) => {
      setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // LABOR & MATERIAL HANDLERS
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
      setSelectedMaterials(selectedMaterials.map(m => m.id === id ? { ...m, qtyUsed: parseFloat(qty) || 0 } : m));
  };
  const handleRemoveMaterial = (id) => setSelectedMaterials(selectedMaterials.filter(m => m.id !== id));
  
  const handleAddLabor = () => setLaborItems([...laborItems, { staffId: '', timeMinutes: 0 }]);
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

  // CALCULATIONS
  const calculateTotalLaborCost = () => {
      return laborItems.reduce((acc, item) => {
          const staff = staffList.find(s => s.id == item.staffId);
          if (!staff || !item.timeMinutes) return acc;
          const costPerMinute = (staff.hourlyRate || 0) / 60;
          return acc + (costPerMinute * (parseFloat(item.timeMinutes) || 0));
      }, 0);
  };
  
  const calculateTotalMaterialCost = () => selectedMaterials.reduce((acc, m) => acc + (m.cost || 0) * m.qtyUsed, 0);
  const calculateTotalCost = () => calculateTotalLaborCost() + calculateTotalMaterialCost();
  
  const calculateMargin = () => {
        const cost = calculateTotalCost();
        const price = parseFloat(values.price) || 0;
        if (!price) return 0;
        return ((price - cost) / price) * 100;
  };

  // DONUT CHART GENERATOR
  const renderDonut = () => {
      const totalCost = calculateTotalCost();
      const price = parseFloat(values.price) || 0;
      if (price === 0 || totalCost === 0) {
          return <div className="text-gray-400 text-sm text-center p-4">Preencha Custos e Preço de Venda para visualizar o gráfico.</div>;
      }
      
      const laborCost = calculateTotalLaborCost();
      const matCost = calculateTotalMaterialCost();
      
      const laborPct = (laborCost / price) * 100;
      const matPct = (matCost / price) * 100;
      const marginPct = calculateMargin();

      // Ensure total doesn't exceed 100% for the visual
      const visLabor = Math.min(laborPct, 100);
      const visMat = Math.min(matPct, 100 - visLabor);
      const visLoss = totalCost > price ? 100 : 0; // If loss, red overrides
      const visMargin = marginPct > 0 ? marginPct : 0;

      const conicGradient = totalCost > price 
        ? `conic-gradient(var(--danger) 0% 100%)`
        : `conic-gradient(var(--primary) 0% ${visLabor}%, #f59e0b ${visLabor}% ${visLabor + visMat}%, var(--success) ${visLabor + visMat}% 100%)`;

      return (
          <div className="flex items-center gap-6">
              <div style={{
                  width: '120px', height: '120px', borderRadius: '50%', background: conicGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Margem</span>
                      <span className={`text-sm font-bold ${marginPct >= 0 ? 'text-success' : 'text-danger'}`}>{marginPct.toFixed(1)}%</span>
                  </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                  {totalCost > price ? (
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-danger"></span> <span className="text-gray-700">Prejuízo! Preço abaixo do Custo.</span></div>
                  ) : (
                      <>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success"></span> <span className="text-gray-700">Lucro Bruto ({visMargin.toFixed(1)}%)</span></div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary"></span> <span className="text-gray-700">Mão de Obra ({visLabor.toFixed(1)}%)</span></div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> <span className="text-gray-700">Matéria Prima ({visMat.toFixed(1)}%)</span></div>
                      </>
                  )}
              </div>
          </div>
      );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
        setActiveTab('basic');
        return;
    }
    
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
      images: images,
      image: images.length > 0 ? images[0] : '', // Retro-compatibility
      videoUrl: values.videoUrl || '',
      campaignActive: values.campaignActive || false,
      campaignDiscount: parseFloat(values.campaignDiscount) || 0,
      laborCost: laborCost,
      materialCost: materialCost,
      totalCost: totalCost,
      laborDetails: laborItems, 
      materials: selectedMaterials.map(m => ({ id: m.id, qty: m.qtyUsed })),
      isPublic: values.isPublic || false,
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
      <div className="modal-content" style={{ maxWidth: '850px', width: '95%', display: 'flex', flexDirection: 'column', height: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header border-b px-6 py-4 bg-gray-50/50">
          <div className="flex flex-col">
            <h2 className="modal-title flex items-center gap-2 text-xl">
                <Package className="text-primary" size={24} />
                {productToEdit ? 'Editar Produto' : 'Máquina de Produto'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Configure todas as variáveis de produção, mídia e preço.</p>
          </div>
          <button className="btn btn-icon self-start hover:bg-gray-200 bg-gray-100 rounded-full" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* TABS HEADER */}
        <div className="flex border-b px-6 bg-white overflow-x-auto">
            <button 
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('basic')}
            >
                <Info size={16} /> Básico & Mídia
            </button>
            <button 
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'costs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('costs')}
            >
                <PieChart size={16} /> Custos & Ficha Técnica
            </button>
            <button 
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'campaign' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('campaign')}
            >
                <Tag size={16} /> Promoções
            </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-gray-50/20">
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* TAB: BÁSICO & MÍDIA */}
            {activeTab === 'basic' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group">
                            <label className="form-label">Nome do Produto *</label>
                            <input name="name" type="text" className={`form-input ${errors.name ? 'border-red-500' : ''}`} placeholder="Ex: Caderno Personalizado" value={values.name} onChange={handleChange} autoFocus={!productToEdit} />
                            {errors.name && <span className="text-xs text-red-500 mt-1">{errors.name}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group">
                                <label className="form-label">Categoria *</label>
                                {categoriesList.length > 0 ? (
                                    <select name="category" className={`form-input ${errors.category ? 'border-red-500' : ''}`} value={values.category} onChange={handleChange}>
                                        <option value="">Selecione...</option>
                                        {categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                ) : (
                                    <input name="category" type="text" className={`form-input ${errors.category ? 'border-red-500' : ''}`} placeholder="Ex: Cadernos" value={values.category} onChange={handleChange} />
                                )}
                                {errors.category && <span className="text-xs text-red-500 mt-1">{errors.category}</span>}
                            </div>
                            <div className="input-group">
                                <label className="form-label">Preço Base (R$) *</label>
                                <input name="price" type="number" step="0.01" className={`form-input font-bold text-primary ${errors.price ? 'border-red-500' : ''}`} placeholder="0.00" value={values.price} onChange={handleChange} />
                                {errors.price && <span className="text-xs text-red-500 mt-1">{errors.price}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="form-label">Descrição Pública</label>
                        <textarea name="description" className="form-input" rows="3" placeholder="Apresentação do produto para o cliente..." value={values.description} onChange={handleChange} />
                    </div>

                    <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-teal-800">
                                <Eye size={20} className="text-teal-600"/>
                                <div>
                                    <h4 className="font-bold text-sm">Disponível no Portfólio Público</h4>
                                    <p className="text-xs text-teal-600">Ative para este produto aparecer na listagem da vitrine (Instagram/Feed).</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="isPublic" className="sr-only peer" checked={values.isPublic} onChange={e => handleChange({ target: { name: 'isPublic', value: e.target.checked }})} />
                                <div className="w-11 h-6 bg-teal-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                            </label>
                        </div>
                    </div>

                    <div className="p-4 bg-white border rounded-xl shadow-sm">
                        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 border-b pb-2 text-gray-700">
                            <ImageIcon size={16} /> Galeria e Mídia (Visível ao Cliente)
                        </h3>
                        <div className="flex gap-4 mb-4 flex-wrap">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border shadow-sm group">
                                    <img src={img} alt={`Img ${idx}`} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                </div>
                            ))}
                            {images.length < 5 && (
                                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors">
                                    <Upload size={20} />
                                    <span className="text-[10px] mt-1 text-center font-medium">Adicionar<br/>Foto</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>
                        <div className="input-group mb-0">
                            <label className="form-label flex items-center gap-1"><Video size={14}/> URL do Vídeo (Ex: YouTube Shorts, Reels, MP4)</label>
                            <input name="videoUrl" type="url" className="form-input text-sm" placeholder="https://..." value={values.videoUrl} onChange={handleChange} />
                            <p className="text-[10px] text-gray-500 mt-1">Cole aqui um link de vídeo para destacar seu produto na proposta!</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: CUSTOS & FICHA TÉCNICA */}
            {activeTab === 'costs' && (
                 <div className="flex flex-col gap-6 animate-fade-in">
                    
                    {/* Donut Area */}
                    <div className="bg-white p-5 rounded-xl border shadow-sm mb-2 flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-800 text-sm mb-1">Índices Financeiros</h3>
                            <p className="text-xs text-gray-500 max-w-[200px]">Simulação baseada no preço de venda (R$ {parseFloat(values.price||0).toFixed(2)})</p>
                        </div>
                        {renderDonut()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* 1. MÃO DE OBRA */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-2">
                                 <Users size={18} className="text-gray-700" />
                                 <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Mão de Obra</h4>
                                 <div className="ml-auto text-primary font-mono font-bold text-sm">
                                     R$ {calculateTotalLaborCost().toFixed(2)}
                                 </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                {laborItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
                                        <select className="form-input flex-1 text-xs border-none p-1" value={item.staffId} onChange={e => updateLaborItem(idx, 'staffId', e.target.value)} required>
                                            <option value="">Profissional...</option>
                                            {staffList.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {s.hourlyRate?.toFixed(2)}/h)</option>)}
                                        </select>
                                        <input type="number" className="w-16 bg-gray-50 p-1 text-center text-xs font-bold border rounded" placeholder="Min" value={item.timeMinutes} onChange={e => updateLaborItem(idx, 'timeMinutes', e.target.value)} required />
                                        <button type="button" onClick={() => removeLaborItem(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddLabor} className="flex items-center gap-1 text-primary text-xs font-medium hover:bg-primary/5 p-2 rounded w-fit mt-1"><Plus size={14} /> Adicionar Processo</button>
                            </div>
                        </div>

                        {/* 2. MATÉRIA PRIMA */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-2">
                                 <Package size={18} className="text-gray-700" />
                                 <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Matéria Prima</h4>
                                 <div className="ml-auto text-orange-500 font-mono font-bold text-sm">
                                     R$ {calculateTotalMaterialCost().toFixed(2)}
                                 </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <select className="form-input text-xs bg-white border-dashed text-gray-600 mb-2" onChange={handleAddMaterial}>
                                    <option value="">+ Selecionar Insumo do Estoque...</option>
                                    {materialsList.map(m => <option key={m.id} value={m.id}>{m.name} - R$ {m.cost}/un</option>)}
                                </select>
                                {selectedMaterials.map(m => (
                                    <div key={m.id} className="flex justify-between items-center bg-white text-xs p-2 rounded-lg border shadow-sm">
                                        <span className="font-medium truncate flex-1" title={m.name}>{m.name}</span>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="any" className="w-14 text-center border p-0.5 rounded" value={m.qtyUsed} onChange={(e) => handleUpdateMaterialQty(m.id, e.target.value)} />
                                            <span className="text-gray-400 w-6">{m.unit}</span>
                                            <span className="font-mono font-bold w-12 text-right">R$ {(m.qtyUsed*(m.cost||0)).toFixed(2)}</span>
                                            <button type="button" onClick={() => handleRemoveMaterial(m.id)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {/* TAB: PROMOÇÕES */}
            {activeTab === 'campaign' && (
                <div className="flex flex-col gap-6 animate-fade-in max-w-lg mx-auto w-full mt-4">
                     <div className="text-center mb-4">
                         <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-3"><Percent size={32} /></div>
                         <h3 className="text-lg font-bold text-gray-800">Campanha Promocional</h3>
                         <p className="text-sm text-gray-500">Ative descontos temporários. Isso destacará o produto nas propostas com etiquetas bonitas.</p>
                     </div>

                     <div className="card p-6 border-pink-100 bg-gradient-to-br from-white to-pink-50 shadow-sm relative overflow-hidden">
                         {values.campaignActive && <div className="absolute top-0 right-0 bg-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Ativa</div>}
                        
                         <div className="flex items-center justify-between mb-6 border-b border-pink-100 pb-4">
                            <span className="font-semibold text-gray-700">Participar de Promoção</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="campaignActive" className="sr-only peer" checked={values.campaignActive} onChange={e => handleChange({ target: { name: 'campaignActive', value: e.target.checked }})} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                            </label>
                         </div>

                         <div className={`transition-opacity duration-300 ${values.campaignActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                             <div className="input-group">
                                 <label className="form-label text-pink-700">Porcentagem de Desconto (%)</label>
                                 <input type="number" name="campaignDiscount" min="0" max="100" className="form-input text-lg font-bold text-pink-600 focus:border-pink-500 focus:ring-pink-500" placeholder="Ex: 15" value={values.campaignDiscount} onChange={handleChange} />
                             </div>

                             <div className="mt-4 p-4 bg-white/60 rounded-lg flex justify-between items-center border border-pink-100">
                                 <div className="flex flex-col">
                                     <span className="text-xs text-gray-500 line-through">De: R$ {parseFloat(values.price||0).toFixed(2)}</span>
                                     <span className="text-sm font-bold text-gray-700">Por Apenas:</span>
                                 </div>
                                 <span className="text-2xl font-black text-pink-600">
                                     R$ {(parseFloat(values.price||0) * (1 - (parseFloat(values.campaignDiscount||0)/100))).toFixed(2)}
                                 </span>
                             </div>
                         </div>
                     </div>
                </div>
            )}
            
          </div>

          <div className="modal-footer bg-white border-t px-6 py-4 flex justify-between items-center">
            {Object.keys(errors).length > 0 && <span className="text-xs text-red-500 font-medium">Corrija os erros na aba "Básico"</span>}
            <div className="ml-auto flex gap-3">
                <button type="button" className="btn btn-secondary px-6" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary px-8 flex items-center gap-2" disabled={isSubmitting}>
                    <Save size={16} /> 
                    {productToEdit ? 'Salvar Configuração' : 'Lançar Produto'}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
