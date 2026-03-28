import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, DollarSign, Users, Package, Clock, Image as ImageIcon, Video, Percent, Tag, PieChart, Info, Upload, Eye, Wrench, Globe, Search, RefreshCw, BarChart2, ShieldQuestion, ExternalLink, Landmark, Wallet, Palette } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';
import { useForm, Validators } from '../utils/validation';
import { calculateFractionalCost, getSubUnits } from '../utils/units';

export function NewProductModal({ isOpen, onClose, onProductSaved, productToEdit }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('basic'); // basic, costs, intelligence, campaign
  
  // Validation Schema
  const productSchema = {
       name: Validators.string(3, "Nome deve ter pelo menos 3 letras"),
       price: Validators.number(0.01, "Preço final sugerido deve ser maior que zero"),
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
    isPublic: false,
    fixedCostMargin: 0,
    bdiMargin: 0
  }, productSchema);

  const [images, setImages] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [laborItems, setLaborItems] = useState([]);
  const [equipmentsList, setEquipmentsList] = useState([]);
  const [equipmentItems, setEquipmentItems] = useState([]); 
  const [marketSearch, setMarketSearch] = useState({ loading: false, result: null });
  const [customScoutQuery, setCustomScoutQuery] = useState('');
  const [linkedModels, setLinkedModels] = useState([]);
  const [designsList, setDesignsList] = useState([]);
  const [globalPricing, setGlobalPricing] = useState({ fixedPerHour: 0, bdiPercentage: 0, bdiTaxes: [] });

  useEffect(() => {
      const loadData = async () => {
          if (isOpen) {
              const inventory = await db.getAll('inventory') || [];
              const rawRoles = await db.getAll('roles') || [];
              const defaultRoles = [
                  { id: '1', name: 'Gerente', baseSalary: 3500 },
                  { id: '2', name: 'Designer', baseSalary: 2800 },
                  { id: '3', name: 'Atendente', baseSalary: 1800 },
                  { id: '4', name: 'Auxiliar de Produção', baseSalary: 1600 },
                  { id: '5', name: 'Acabamento', baseSalary: 1500 },
                  { id: '6', name: 'Entregador', baseSalary: 1500 }
              ];
              const rolesData = rawRoles.length > 0 ? rawRoles : defaultRoles;
              const cats = await db.getAll('categories') || [];
              const equips = await db.getAll('equipments') || [];
              const desgs = await db.getAll('designs') || [];
              
              setMaterialsList(Array.isArray(inventory) ? inventory.filter(i => i.type === 'material') : []);
              setRolesList(rolesData);
              setCategoriesList(Array.isArray(cats) ? cats : []);
              setEquipmentsList(Array.isArray(equips) ? equips : []);
              setDesignsList(Array.isArray(desgs) ? desgs : []);

              // Load Global Pricing settings
              const trans = await db.getAll('transactions') || [];
              const bi = await db.getAll('bdi_taxes') || [];
              const cap = await db.getById('settings', 'capacity_planning') || { monthlyHours: 160 };
              
              const now = new Date();
              const currentMonthFc = trans.filter(t => {
                  const d = new Date(t.date);
                  return d.getMonth() === now.getMonth() && 
                         d.getFullYear() === now.getFullYear() && 
                         t.type === 'expense' && 
                         t.category === 'Administrativo / Fixos';
              });

              const totalFixed = currentMonthFc.reduce((acc, f) => acc + (parseFloat(f.amount) || 0), 0);
              const bdiPercentage = bi.reduce((acc, t) => acc + (parseFloat(t.percentage) || 0), 0);
              const fixedPerHour = cap.monthlyHours ? (totalFixed / cap.monthlyHours) : 0;
              setGlobalPricing({ fixedPerHour, bdiPercentage, bdiTaxes: bi });

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
                      isPublic: productToEdit.isPublic || false,
                      fixedCostMargin: productToEdit.fixedCostMargin || 0,
                      bdiMargin: productToEdit.bdiMargin || 0
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
                              qtyUsed: m.qty,
                              usageUnit: m.usageUnit || originalItem?.unit || 'un'
                          };
                      }).filter(m => m.name);
                      setSelectedMaterials(restoredMaterials);
                  } else {
                      setSelectedMaterials([]);
                  }

                  // Restore Labor
                  if (productToEdit.laborDetails && Array.isArray(productToEdit.laborDetails)) {
                      setLaborItems(productToEdit.laborDetails.map(item => ({
                          roleId: item.roleId || item.staffId || '',
                          timeMinutes: item.timeMinutes
                      })));
                  } else {
                      setLaborItems([]);
                  }

                  // Restore Equipments
                  if (productToEdit.equipmentDetails && Array.isArray(productToEdit.equipmentDetails)) {
                      setEquipmentItems(productToEdit.equipmentDetails);
                  } else {
                      setEquipmentItems([]);
                  }

                  // Restore Linked Models
                  if (productToEdit.linkedModels && Array.isArray(productToEdit.linkedModels)) {
                      setLinkedModels(productToEdit.linkedModels);
                  } else {
                      setLinkedModels([]);
                  }

                  setCustomScoutQuery(`${productToEdit.name} ${productToEdit.category || ''}`.trim());

              } else {
                  // Reset
                  setValues({
                    name: '', description: '', price: '', stock: '', category: '', videoUrl: '', campaignActive: false, campaignDiscount: '', isPublic: false, fixedCostMargin: 0, bdiMargin: 0
                  });
                  setImages([]);
                  setSelectedMaterials([]);
                  setLaborItems([]);
                  setEquipmentItems([]);
                  setLinkedModels([]);
                  setMarketSearch({ loading: false, result: null });
                  setCustomScoutQuery('');
              }
              setActiveTab('basic');
          }
      };
      loadData();
  }, [isOpen, productToEdit]);

  if (!isOpen) return null;

  // IMAGE UPLOAD HANDLER — com compressão automática via canvas
  const compressImage = (dataUrl, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
      return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
              let { width, height } = img;

              // Redimensiona mantendo proporção
              if (width > maxWidth || height > maxHeight) {
                  const ratio = Math.min(maxWidth / width, maxHeight / height);
                  width = Math.round(width * ratio);
                  height = Math.round(height * ratio);
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);

              // Sempre salva como JPEG para garantir compressão
              resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.src = dataUrl;
      });
  };

  const handleImageUpload = (e) => {
      const files = Array.from(e.target.files);
      if (images.length + files.length > 5) {
          alert('Máximo de 5 imagens.');
          return;
      }
      files.forEach(file => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
              try {
                  const compressed = await compressImage(ev.target.result);
                  // Limite de segurança pós-compressão: ~150KB por imagem
                  if (compressed.length > 200000) {
                      // Segunda passagem com qualidade ainda mais baixa se ainda grande
                      const compressed2 = await compressImage(ev.target.result, 600, 600, 0.5);
                      setImages(prev => [...prev, compressed2]);
                  } else {
                      setImages(prev => [...prev, compressed]);
                  }
              } catch (err) {
                  console.error('Erro ao comprimir imagem:', err);
                  alert('Não foi possível processar esta imagem.');
              }
          };
          reader.readAsDataURL(file);
      });
  };

  const removeImage = (idx) => {
      setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // LABOR, MATERIAL & EQUIPMENT HANDLERS
  const handleAddMaterial = (e) => {
      const materialId = e.target.value;
      if (!materialId) return;
      const material = materialsList.find(m => m.id == materialId);
      if (material && !selectedMaterials.find(m => m.id == materialId)) {
          setSelectedMaterials([...selectedMaterials, { ...material, qtyUsed: 1, usageUnit: material.unit || 'un' }]);
      }
      e.target.value = '';
  };
  const handleUpdateMaterialQty = (id, qty) => {
      setSelectedMaterials(selectedMaterials.map(m => m.id === id ? { ...m, qtyUsed: parseFloat(qty) || 0 } : m));
  };
  const handleUpdateMaterialUnit = (id, newUnit) => {
      setSelectedMaterials(selectedMaterials.map(m => m.id === id ? { ...m, usageUnit: newUnit } : m));
  };
  const handleRemoveMaterial = (id) => setSelectedMaterials(selectedMaterials.filter(m => m.id !== id));
  
  const handleAddLabor = () => setLaborItems([...laborItems, { roleId: '', timeMinutes: 0 }]);
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

  const handleAddEquipment = () => setEquipmentItems([...equipmentItems, { equipId: '', timeMinutes: 0 }]);
  const updateEquipmentItem = (index, field, value) => {
      const newItems = [...equipmentItems];
      newItems[index] = { ...newItems[index], [field]: value };
      setEquipmentItems(newItems);
  };
  const removeEquipmentItem = (index) => {
      const newItems = [...equipmentItems];
      newItems.splice(index, 1);
      setEquipmentItems(newItems);
  };

  // CALCULATIONS
  const calculateTotalLaborCost = () => {
      return laborItems.reduce((acc, item) => {
          const role = rolesList.find(r => r.id === item.roleId || r.name === item.roleId);
          if (!role || !item.timeMinutes) return acc;
          const hourlyRate = role.hourlyRate || ((role.baseSalary || 0) / 160);
          const costPerMinute = hourlyRate / 60;
          return acc + (costPerMinute * (parseFloat(item.timeMinutes) || 0));
      }, 0);
  };
  
  const calculateTotalMaterialCost = () => selectedMaterials.reduce((acc, m) => acc + calculateFractionalCost(m.cost, m.unit, m.usageUnit || m.unit, m.qtyUsed), 0);
  
  const calculateTotalEquipmentCost = () => {
      return equipmentItems.reduce((acc, item) => {
          const equip = equipmentsList.find(e => e.id == item.equipId);
          if (!equip || !item.timeMinutes) return acc;
          
          // Depreciation Cost
          const deprecMonthly = (parseFloat(equip.purchasePrice) || 0) / (parseInt(equip.lifespanMonths) || 1);
          const hrCost = deprecMonthly / (parseInt(equip.monthlyHours) || 160);
          
          // Consumables Cost
          let hrConsumableCost = 0;
          if (equip.consumables && equip.consumables.length > 0) {
              hrConsumableCost = equip.consumables.reduce((sum, c) => {
                  if (c.inventoryId && Array.isArray(materialsList)) {
                      const invItem = materialsList.find(m => m.id === c.inventoryId);
                      if (invItem) {
                          const costPerAction = calculateFractionalCost(invItem.cost, invItem.unit, c.usedUnit, c.usedQuantity);
                          return sum + ((costPerAction * parseFloat(c.actionsPerHour || 1)) || 0);
                      }
                  }
                  return sum + ((c.cost || 0) / (c.yield || 1));
              }, 0);
          }
          
          const totalHr = hrCost + hrConsumableCost;
          return acc + ((totalHr / 60) * (parseFloat(item.timeMinutes) || 0));
      }, 0);
  };

  const calculateBaseCost = () => calculateTotalLaborCost() + calculateTotalMaterialCost() + calculateTotalEquipmentCost();
  
  const getFixedCostImpact = () => {
      const totalEquipMinutes = equipmentItems.reduce((acc, item) => acc + (parseFloat(item.timeMinutes) || 0), 0);
      const totalLaborMinutes = laborItems.reduce((acc, item) => acc + (parseFloat(item.timeMinutes) || 0), 0);
      const maxMinutes = Math.max(totalEquipMinutes, totalLaborMinutes);
      
      if (globalPricing.fixedPerHour > 0) {
          return (globalPricing.fixedPerHour / 60) * maxMinutes;
      } else {
          return calculateBaseCost() * ((parseFloat(values.fixedCostMargin)||0) / 100);
      }
  };

  const calculateInternalCost = () => calculateBaseCost() + getFixedCostImpact();

  const calculateTotalCost = () => {
      const internal = calculateInternalCost();
      const bdiPercentageToUse = globalPricing.bdiPercentage > 0 ? globalPricing.bdiPercentage : (parseFloat(values.bdiMargin)||0);
      const bdiImpact = internal * (bdiPercentageToUse / 100);
      return internal + bdiImpact; // Legacy total cost
  };

  const calculateSuggestedSellingPrice = () => {
      const costToProduce = calculateInternalCost();
      const bdiVal = globalPricing.bdiPercentage > 0 ? globalPricing.bdiPercentage : (parseFloat(values.bdiMargin)||0);
      
      if (bdiVal >= 100) return costToProduce * 2; // Prevent divide by zero / negative
      return costToProduce / (1 - (bdiVal / 100)); // Real Markup margin
  };

  const handleMarketAnalysis = async (customQuery = null) => {
        const searchTerm = typeof customQuery === 'string' ? customQuery : (customScoutQuery || `${values.name} ${values.category || ''}`).trim();
        setCustomScoutQuery(searchTerm); // Sync it back to the input if a suggestion was clicked

        if(!searchTerm) return alert("Por favor, preencha o termo de busca para realizar a pesquisa de mercado.");
        
        setMarketSearch({ loading: true, result: null });
        
        try {
            // Pesquisa real na API pública do Mercado Livre, combinando nome e categoria para maior precisão
            const query = encodeURIComponent(searchTerm);
            const response = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${query}&limit=50`);
            const data = await response.json();
            
            let suggestions = [];
            
            const fetchSuggestions = async () => {
                 // Try to strip down the searchTerm to just the first 1-2 words to broaden the scope
                 const words = searchTerm.split(' ').filter(w => w.trim().length > 0);
                 const shortTerm = words.slice(0, 2).join(' ');
                 
                 if (!shortTerm) return [];
                 try {
                     const fallbackResponse = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(shortTerm)}&limit=10`);
                     const fallbackData = await fallbackResponse.json();
                     
                     if (fallbackData.results && fallbackData.results.length > 0) {
                         const suggestionsSet = new Set([shortTerm]);
                         
                         fallbackData.results.forEach(i => {
                             const cleanTitle = i.title.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim();
                             const titleWords = cleanTitle.split(' ').filter(w => w.trim().length > 0);
                             if (titleWords.length > 0) {
                                 // Get a solid 2~3 words snippet
                                 suggestionsSet.add(titleWords.slice(0, 3).join(' '));
                             }
                         });
                         
                         return Array.from(suggestionsSet).slice(0, 6);
                     }
                 } catch(e) {
                     console.warn("Fallback suggestion fetch failed", e);
                 }
                 
                 // If all fails, at least return the shorter search term as a suggestion
                 return [shortTerm];
            };

            if (!data.results || data.results.length === 0) {
                 suggestions = await fetchSuggestions();
                 setMarketSearch({ loading: false, result: { error: 'not_found', lastQuery: searchTerm, suggestions } });
                 return;
            }

            // Para evitar a pesquisa "furada", filtramos peças indesejadas e ordenamos por preço
            let items = data.results.map(item => ({
                price: item.price,
                title: item.title,
                link: item.permalink
            })).sort((a, b) => a.price - b.price);

            // Método Anti-Furada (Remoção de Outliers Extremidades):
            // Removemos os 20% mais baratos (geralmente iscas, peças avulsas, acessórios que caíram na busca)
            // e os 10% mais caros (produtos de luxo ou kits distorcidos da mesma palavra-chave)
            if (items.length >= 5) {
                const dropBottom = Math.floor(items.length * 0.2);
                const dropTop = Math.floor(items.length * 0.1);
                items = items.slice(dropBottom, items.length - dropTop);
            }

            if (items.length === 0) {
                 suggestions = await fetchSuggestions();
                 setMarketSearch({ loading: false, result: { error: 'not_found', lastQuery: searchTerm, suggestions } });
                 return;
            }

            const minItem = items[0];
            const maxItem = items[items.length - 1];

            const sum = items.reduce((acc, curr) => acc + curr.price, 0);
            const avg = sum / items.length;

            setMarketSearch({
                loading: false,
                result: {
                     avgPrice: avg.toFixed(2),
                     minPrice: minItem.price.toFixed(2),
                     minLink: minItem.link,
                     maxPrice: maxItem.price.toFixed(2),
                     maxLink: maxItem.link,
                     sourcesSearched: data.results.length,
                     saneSampleCount: items.length,
                     competitors: ["MercadoLivre (Ao Vivo)"]
                }
            });
        } catch (err) {
            console.error("Erro no Scout de Mercado:", err);
            alert("A conexão com o radar de mercado falhou.");
            setMarketSearch({ loading: false, result: null });
        }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
        setActiveTab('basic');
        return;
    }
    
    setIsSubmitting(true);

    try {
        const allProducts = await db.getAll('products');
        const isDuplicateName = allProducts.some(p => 
            p.name.trim().toLowerCase() === values.name.trim().toLowerCase() && 
            p.id !== (productToEdit?.id || null)
        );

        if (isDuplicateName) {
            alert("Atenção: Já existe um produto cadastrado com este nome exato! Escolha um nome diferente para evitar duplicidade no sistema.");
            setIsSubmitting(false);
            return;
        }
    } catch (err) {
        console.warn("Name validation check failed", err);
    }

    // 🗜️ Recomprimir imagens existentes (pode ter legado em alta resolução)
    let safeImages = images;
    try {
        safeImages = await Promise.all(
            images.map(async (img) => {
                // Se o base64 está grande, recomprime
                if (img && img.length > 150000) {
                    const recompressed = await compressImage(img, 800, 800, 0.7);
                    // Segunda passagem se ainda grande
                    if (recompressed.length > 150000) {
                        return compressImage(img, 600, 600, 0.5);
                    }
                    return recompressed;
                }
                return img;
            })
        );
    } catch (err) {
        console.warn('Falha na recompressão preventiva de imagens:', err);
        safeImages = images;
    }

    const laborCost = calculateTotalLaborCost();
    const materialCost = calculateTotalMaterialCost();
    const equipmentCost = calculateTotalEquipmentCost();
    const baseCost = calculateBaseCost();
    const totalCost = calculateTotalCost();

    const productData = {
      name: values.name,
      description: values.description || '',
      price: parseFloat(values.price) || 0,
      stock: parseInt(values.stock) || 0,
      category: values.category || 'Geral',
      images: safeImages,
      image: safeImages.length > 0 ? safeImages[0] : '', // Retro-compatibility
      videoUrl: values.videoUrl || '',
      campaignActive: values.campaignActive || false,
      campaignDiscount: parseFloat(values.campaignDiscount) || 0,
      isPublic: values.isPublic || false,
      
      // Finance and Composability
      fixedCostMargin: parseFloat(values.fixedCostMargin) || 0,
      bdiMargin: parseFloat(values.bdiMargin) || 0,
      laborCost: laborCost,
      materialCost: materialCost,
      equipmentCost: equipmentCost,
      baseCost: baseCost,
      totalCost: totalCost,
      
      // Technical Records
      laborDetails: laborItems, 
      materials: selectedMaterials.map(m => ({ id: m.id, qty: m.qtyUsed, usageUnit: m.usageUnit || m.unit })),
      equipmentDetails: equipmentItems,
      linkedModels: linkedModels,

      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'Sistema'
    };

    try {
        let result;
        if (productToEdit && productToEdit.id) {
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
        alert("Erro técnico interno. Verifique a inspeção console (F12).");
    } finally {
        setIsSubmitting(false);
    }
  };

  const sOverlay = {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1050, padding: '1rem'
  };

  const sModal = {
      backgroundColor: 'var(--surface)',
      width: '100%', maxWidth: '850px', maxHeight: '90vh',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      color: 'var(--text-main)',
      animation: 'slideUp 0.3s ease-out'
  };

  const sHeader = {
      padding: '1.5rem',
      borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      backgroundColor: 'var(--background)'
  };

  const sBody = {
      padding: '1.5rem',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: '1.5rem'
  };

  const sFooter = {
      padding: '1rem 1.5rem',
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--background)',
      display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center'
  };

  const sCardLinear = {
      backgroundColor: 'var(--surface-hover)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '1rem'
  };

  return (
    <div style={sOverlay}>
      <div style={sModal} onClick={e => e.stopPropagation()}>
        <div style={sHeader}>
            <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {productToEdit ? 'Modo de Edição' : 'Cadastro de Produto'}
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={24} /> {productToEdit ? 'Editar Produto' : 'Novo Produto'}
                </h2>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }} onClick={onClose} aria-label="Fechar">
                <X size={24} />
            </button>
        </div>
        
        {/* TABS HEADER */}
        <div style={{ display: 'flex', gap: '0.75rem', padding: '1.5rem 1.5rem 0 1.5rem', overflowX: 'auto', backgroundColor: 'var(--surface)' }} className="hide-scrollbar shrink-0 select-none">
            <button 
                style={{ 
                    padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    ...(activeTab === 'basic' ? { backgroundColor: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)', boxShadow: 'var(--shadow-md)' } : { backgroundColor: 'var(--background)', color: 'var(--text-muted)', borderColor: 'var(--border)' })
                }}
                onClick={() => setActiveTab('basic')}
                type="button"
            >
                <Info size={16} /> Ficha Comercial
            </button>
            <button 
                style={{ 
                    padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    ...(activeTab === 'costs' ? { backgroundColor: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)', boxShadow: 'var(--shadow-md)' } : { backgroundColor: 'var(--background)', color: 'var(--text-muted)', borderColor: 'var(--border)' })
                }}
                onClick={() => setActiveTab('costs')}
                type="button"
            >
                <PieChart size={16} /> Custos (Precificação)
            </button>
            <button 
                style={{ 
                    padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    ...(activeTab === 'intelligence' ? { backgroundColor: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)', boxShadow: 'var(--shadow-md)' } : { backgroundColor: 'var(--background)', color: 'var(--text-muted)', borderColor: 'var(--border)' })
                }}
                onClick={() => setActiveTab('intelligence')}
                type="button"
            >
                <Globe size={16} /> Mercado (Scout)
            </button>
            <button 
                style={{ 
                    padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    ...(activeTab === 'campaign' ? { backgroundColor: '#db2777', color: '#fff', borderColor: '#db2777', boxShadow: 'var(--shadow-md)' } : { backgroundColor: 'var(--background)', color: 'var(--text-muted)', borderColor: 'var(--border)' })
                }}
                onClick={() => setActiveTab('campaign')}
                type="button"
            >
                <Tag size={16} /> Promoções
            </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', flex: 1 }} className="hide-scrollbar">
          <div style={sBody}>
            
            {/* TAB: BÁSICO & MÍDIA */}
            {activeTab === 'basic' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <Info size={18} color="var(--primary)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Ficha Comercial Básica</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="input-group">
                            <label className="form-label">Nome Oficial do Produto *</label>
                            <input name="name" type="text" className={`form-input ${errors.name ? 'border-red-500' : ''}`} placeholder="Ex: Caderno Universitário..." value={values.name} onChange={handleChange} autoFocus={!productToEdit} />
                            {errors.name && <span className="text-[11px] text-red-500 mt-1 font-medium block">{errors.name}</span>}
                        </div>
                        <div className="input-group">
                            <label className="form-label">Categoria *</label>
                            {categoriesList.length > 0 ? (
                                <select name="category" className={`form-input ${errors.category ? 'border-red-500' : ''}`} value={values.category} onChange={handleChange}>
                                    <option value="">Selecione...</option>
                                    {/* Render Hierarchical Categories */}
                                    {categoriesList.filter(c => !c.parentId)
                                        .sort((a,b) => a.name.localeCompare(b.name))
                                        .map(main => {
                                            const subs = categoriesList.filter(c => c.parentId === main.id).sort((a,b) => a.name.localeCompare(b.name));
                                            if (subs.length > 0) {
                                                return (
                                                    <optgroup key={main.id} label={main.name}>
                                                        {subs.map(sub => (
                                                            <option key={sub.id} value={sub.name}>{sub.name}</option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            } else {
                                                return <option key={main.id} value={main.name}>{main.name}</option>;
                                            }
                                        })
                                    }
                                    {/* Catch any orphaned categories */}
                                    {categoriesList.filter(c => c.parentId && !categoriesList.find(m => m.id === c.parentId)).map(orphan => (
                                        <option key={orphan.id} value={orphan.name}>{orphan.name} (Sem Grupo)</option>
                                    ))}
                                </select>
                            ) : (
                                <input name="category" type="text" className={`form-input ${errors.category ? 'border-red-500' : ''}`} placeholder="Ex: Papelaria" value={values.category} onChange={handleChange} />
                            )}
                            {errors.category && <span className="text-[11px] text-red-500 mt-1 font-medium block">{errors.category}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-group">
                            <label className="form-label text-blue-600 font-semibold">Preço de Venda (R$) *</label>
                            <input name="price" type="number" step="0.01" className={`form-input border-blue-200 focus:ring-blue-500 ${errors.price ? 'border-red-500' : ''}`} placeholder="0.00" value={values.price} onChange={handleChange} />
                            {errors.price && <span className="text-[11px] text-red-500 mt-1 font-medium block">{errors.price}</span>}
                        </div>
                        <div className="input-group">
                            <label className="form-label">Estoque Inicial / Disponível</label>
                            <input name="stock" type="number" min="0" className="form-input" placeholder="0" value={values.stock} onChange={handleChange} />
                        </div>
                    </div>

                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Argumento de Venda (Descrição)</label>
                            <textarea name="description" className="form-input" rows="3" placeholder="Descreva os diferenciais do produto..." value={values.description} onChange={handleChange} style={{ resize: 'vertical' }} />
                        </div>
                    </div>

                    <div style={{ ...sCardLinear, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Visibilidade Multicanal & QR Code</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Exibir produto no Catálogo Público da Gráfica e liberar geração de ficha via QR.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isPublic" className="sr-only peer" checked={values.isPublic} onChange={e => handleChange({ target: { name: 'isPublic', value: e.target.checked }})} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <ImageIcon size={18} color="var(--primary)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Imagens e Mídia</h4>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative w-20 h-20 rounded bg-white overflow-hidden shadow-sm border border-gray-200 group">
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                                         <button type="button" onClick={() => removeImage(idx)} className="text-white hover:text-red-400 p-2 border-none bg-transparent cursor-pointer"><Trash2 size={16} /></button>
                                    </div>
                                    <img src={img} alt={`Img ${idx}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                            {images.length < 5 && (
                                <label className="w-20 h-20 rounded border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors">
                                    <Upload size={20} className="mb-1" />
                                    <span className="text-[10px] font-bold">Nova Img</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            )}
                        </div>
                        <div className="input-group" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Link Vídeo Promocional (Youtube/TikTok)</label>
                            <input name="videoUrl" type="url" className="form-input text-sm" placeholder="https://" value={values.videoUrl} onChange={handleChange} />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: CUSTOS & FICHA TÉCNICA (EXTENSIVO) */}
            {activeTab === 'costs' && (
                 <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Metrics Top */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ ...sCardLinear, flex: 1, alignItems: 'center', justifyContent: 'center', alignContent: 'center', padding: '1.5rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Custo Direto Base (Fábrica)</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>R$ {calculateBaseCost().toFixed(2)}</span>
                        </div>
                        <div style={{ ...sCardLinear, flex: 1, alignItems: 'center', justifyContent: 'center', alignContent: 'center', padding: '1.5rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', marginBottom: '0.5rem' }}>Custo Produção & Fixo (Indústria)</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>R$ {calculateInternalCost().toFixed(2)}</span>
                        </div>
                        <div style={{ ...sCardLinear, flex: 1, alignItems: 'center', justifyContent: 'center', alignContent: 'center', padding: '1.5rem 1rem', border: '1px solid #c084fc', backgroundColor: '#faf5ff' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7e22ce', marginBottom: '0.5rem' }}>Preço Venda Sugerido (Markup)</span>
                            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#6b21a8', fontFamily: 'monospace' }}>R$ {calculateSuggestedSellingPrice().toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem' }}>
                        
                        {/* 1. Global Overhead Configurations Info */}
                        <div style={{ ...sCardLinear, marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                <Globe size={18} color="var(--primary)" />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Custo Fixo Absorvido (Mensal)</h4>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                 <p>O Módulo Financeiro atualiza automaticamente o custo absorvido por hora dessa fábrica. Cada minuto produzido rateia parte dessa soma.</p>
                                 <div className="flex items-center justify-between bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 font-bold">
                                     <span>Adição por Produto (Rateio):</span>
                                     <span>R$ {getFixedCostImpact().toFixed(2)} / un</span>
                                 </div>
                                 <div className="text-xs text-blue-600">Baseado no tempo produtivo em minutos: {(globalPricing.fixedPerHour / 60).toFixed(2)}R$/min.</div>
                            </div>
                        </div>

                        {/* 2. BDI Detail */}
                        <div style={{ ...sCardLinear, marginTop: '0.5rem', border: '1px solid #d8b4fe', backgroundColor: '#faf5ff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e9d5ff', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                <Percent size={18} color="#7e22ce" />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#6b21a8', margin: 0 }}>Composição BDI (Markup)</h4>
                            </div>
                            
                            <div className="flex flex-col gap-2 mb-4">
                                {(globalPricing.bdiTaxes || []).map(t => (
                                    <div key={t.id} className="flex justify-between items-center text-xs border-b border-purple-100 pb-1">
                                        <span className="text-purple-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-2">
                                            {t.name} <span className="text-[9px] uppercase font-bold bg-white text-purple-500 border border-purple-200 px-1 py-0.5 rounded ml-1">{t.type === 'profit' ? 'Lucro' : t.type === 'fee' ? 'Taxa' : 'Imposto'}</span>
                                        </span>
                                        <span className="font-bold text-purple-600 bg-white px-1.5 py-0.5 rounded-md border border-purple-100">{parseFloat(t.percentage).toFixed(2)}%</span>
                                    </div>
                                ))}
                                {(globalPricing.bdiTaxes || []).length === 0 && <span className="text-xs text-purple-400">Nenhum imposto/BDI definido em Configurações.</span>}
                            </div>
                            <div className="flex justify-between items-center bg-purple-100 p-2 rounded text-purple-900 font-bold text-sm border border-purple-300">
                                <span>Total Percentual Ativo:</span>
                                <span>{globalPricing.bdiPercentage.toFixed(2)}% Margem</span>
                            </div>
                            <p className="text-[10px] text-purple-500 font-medium mt-2 leading-tight">Constrói o Preço de Venda Sugerido protegendo suas despesas por dentro: Custos Físicos / (1 - Margem%).</p>
                        </div>
                    </div>

                    {/* 1. MATÉRIA PRIMA */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={18} style={{ color: '#f97316' }} />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Insumos (Estoque)</h4>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f97316' }}>Subtotal: R$ {calculateTotalMaterialCost().toFixed(2)}</span>
                        </div>
                        
                        <select className="form-input text-sm" onChange={handleAddMaterial} value="">
                            <option value="">+ Vincular Material da Ficha Técnica...</option>
                            {Object.entries(
                                materialsList.reduce((acc, m) => {
                                    const g = m.materialGroup || 'Outros / Sem Grupo';
                                    if (!acc[g]) acc[g] = [];
                                    acc[g].push(m);
                                    return acc;
                                }, {})
                            )
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([group, mats]) => (
                                <optgroup key={group} label={group}>
                                    {mats.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                                        <option key={m.id} value={m.id}>{m.name} - R$ {m.cost}/{m.unit}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>

                        {selectedMaterials.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {selectedMaterials.map(m => (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ flex: 1, minWidth: '150px' }}>
                                            <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>{m.name}</p>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Custo Base: R$ {m.cost}/{m.unit}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input type="number" step="any" className="form-input" style={{ width: '80px', height: '30px', padding: '0 0.5rem', textAlign: 'center', fontSize: '0.85rem', marginBottom: 0 }} value={m.qtyUsed} onChange={(e) => handleUpdateMaterialQty(m.id, e.target.value)} title="Quantidade utilizada para 1 produto" />
                                            <select 
                                                className="form-input" 
                                                style={{ height: '30px', padding: '0 0.5rem', fontSize: '0.85rem', marginBottom: 0, width: '70px' }} 
                                                value={m.usageUnit || m.unit || 'un'} 
                                                onChange={(e) => handleUpdateMaterialUnit(m.id, e.target.value)}
                                            >
                                                {getSubUnits(m.unit).map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-main)', width: '80px', textAlign: 'right', fontSize: '0.9rem' }}>
                                            R$ {calculateFractionalCost(m.cost, m.unit, m.usageUnit || m.unit, m.qtyUsed).toFixed(2)}
                                        </div>
                                        <button type="button" onClick={() => handleRemoveMaterial(m.id)} style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 2. MÃO DE OBRA */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={18} style={{ color: '#3b82f6' }} />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Custos Mão de Obra</h4>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>Subtotal: R$ {calculateTotalLaborCost().toFixed(2)}</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {laborItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                                    <select className="form-input" style={{ flex: 1, minWidth: '150px', height: '34px', padding: '0 0.5rem', fontSize: '0.85rem', marginBottom: 0 }} value={item.roleId} onChange={e => updateLaborItem(idx, 'roleId', e.target.value)} required>
                                        <option value="">Função / Cargo...</option>
                                        {rolesList.map(r => {
                                            const hrRate = r.hourlyRate || ((r.baseSalary || 0) / 160);
                                            return <option key={r.id || r.name} value={r.id || r.name}>{r.name} (R${hrRate.toFixed(2)}/h)</option>;
                                        })}
                                    </select>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Min:</span>
                                        <input type="number" className="form-input" style={{ width: '70px', height: '34px', padding: '0', textAlign: 'center', fontSize: '0.85rem', marginBottom: 0 }} placeholder="Min" value={item.timeMinutes} onChange={e => updateLaborItem(idx, 'timeMinutes', e.target.value)} required />
                                    </div>
                                    <button type="button" onClick={() => removeLaborItem(idx)} style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddLabor} className="btn" style={{ backgroundColor: 'var(--background)', color: 'var(--text-main)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}><Plus size={16} /> Adicionar Hora-Homem</button>
                    </div>

                    {/* 3. MÁQUINAS (DEPRECIAÇÃO) */}
                    <div style={sCardLinear}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Wrench size={18} style={{ color: '#a855f7' }} />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Custos de Operação (Máquinas)</h4>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7' }}>Subtotal: R$ {calculateTotalEquipmentCost().toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {equipmentItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                                    <select className="form-input" style={{ flex: 1, minWidth: '150px', height: '34px', padding: '0 0.5rem', fontSize: '0.85rem', marginBottom: 0 }} value={item.equipId} onChange={e => updateEquipmentItem(idx, 'equipId', e.target.value)} required>
                                        <option value="">Selecionar Máquina...</option>
                                        {Object.entries(
                                            equipmentsList.reduce((acc, eq) => {
                                                const group = eq.equipmentGroup || 'Geral / Outros';
                                                if (!acc[group]) acc[group] = [];
                                                acc[group].push(eq);
                                                return acc;
                                            }, {})
                                        ).sort(([a], [b]) => a.localeCompare(b)).map(([group, eqs]) => (
                                            <optgroup key={group} label={group}>
                                                {eqs.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(eq => {
                                                    const deprecMonthly = (parseFloat(eq.purchasePrice) || 0) / (parseInt(eq.lifespanMonths) || 1);
                                                    const hrCost = deprecMonthly / (parseInt(eq.monthlyHours) || 160);
                                                    let hrConsumableCost = 0;
                                                    if (eq.consumables && eq.consumables.length > 0) {
                                                        hrConsumableCost = eq.consumables.reduce((sum, c) => {
                                                            if (c.inventoryId && Array.isArray(materialsList)) {
                                                                const invItem = materialsList.find(m => m.id === c.inventoryId);
                                                                if (invItem) {
                                                                    const costPerAction = calculateFractionalCost(invItem.cost, invItem.unit, c.usedUnit, c.usedQuantity);
                                                                    return sum + ((costPerAction * parseFloat(c.actionsPerHour || 1)) || 0);
                                                                }
                                                            }
                                                            return sum + ((c.cost || 0) / (c.yield || 1));
                                                        }, 0);
                                                    }
                                                    return (
                                                        <option key={eq.id} value={eq.id}>
                                                            {eq.name} (R$ {(hrCost + hrConsumableCost).toFixed(2)}/h {hrConsumableCost > 0 ? '+ Insumos' : ''})
                                                        </option>
                                                    );
                                                })}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Min:</span>
                                        <input type="number" className="form-input" style={{ width: '70px', height: '34px', padding: '0', textAlign: 'center', fontSize: '0.85rem', marginBottom: 0 }} placeholder="Min" value={item.timeMinutes} onChange={e => updateEquipmentItem(idx, 'timeMinutes', e.target.value)} required />
                                    </div>
                                    <button type="button" onClick={() => removeEquipmentItem(idx)} style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddEquipment} className="btn" style={{ backgroundColor: 'var(--background)', color: 'var(--text-main)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}><Plus size={16} /> Atrelar Processo (Depreciação)</button>
                    </div>

                    {/* 4. MOLDES E ARTES (INTEGRAÇÃO DE MODELOS) */}
                    <div style={sCardLinear}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Palette size={18} style={{ color: '#ec4899' }} />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Modelos / Artes (Galeria)</h4>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ec4899' }}>{linkedModels.length} associados</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Vincule as artes e moldes padrões para este produto. Ao gerar um pedido, estas artes serão sugeridas.
                        </div>

                        <select 
                            className="form-input text-sm" 
                            onChange={(e) => {
                                if (e.target.value && !linkedModels.includes(e.target.value)) {
                                    setLinkedModels([...linkedModels, e.target.value]);
                                }
                                e.target.value = '';
                            }} 
                            value=""
                        >
                            <option value="">+ Associar Modelo da Galeria...</option>
                            {designsList.map(d => (
                                <option key={d.id} value={d.id}>{d.name} {d.category ? `[${d.category}]` : ''}</option>
                            ))}
                        </select>

                        {linkedModels.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {linkedModels.map(modelId => {
                                    const d = designsList.find(x => String(x.id) === String(modelId));
                                    if (!d) return null;
                                    return (
                                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {d.thumbnail || d.fileUrl ? (
                                                    <img src={d.thumbnail || d.fileUrl} alt={d.name} style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                                                ) : (
                                                    <div style={{ width: '30px', height: '30px', backgroundColor: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}><Palette size={14} color="#ec4899" /></div>
                                                )}
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>{d.name}</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => setLinkedModels(linkedModels.filter(m => m !== modelId))} style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                 </div>
            )}

            {/* TAB: INTELIGÊNCIA MERCADOLÓGICA (SIMULAÇÃO) */}
            {activeTab === 'intelligence' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div style={{ ...sCardLinear, alignItems: 'center', textAlign: 'center', paddingTop: '2rem', paddingBottom: '2rem', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                         <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid #bbf7d0' }}>
                             <Globe size={32} />
                         </div>
                         <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#166534' }}>Radar Concorrencial (Scout)</h3>
                         <p style={{ fontSize: '0.875rem', color: '#15803d', marginTop: '0.5rem', maxWidth: '500px' }}>
                             Vasculharemos a web para encontrar produtos similares e te dar o norte do mercado. Você pode editar o termo da busca abaixo para ser mais ambrangente ou específico:
                         </p>

                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px', marginTop: '1.5rem', gap: '0.75rem' }}>
                             <input 
                                 type="text" 
                                 className="form-input text-sm text-center font-bold" 
                                 placeholder="Digite o modelo/nome do produto..." 
                                 value={customScoutQuery || `${values.name} ${values.category || ''}`.trim()}
                                 onChange={(e) => setCustomScoutQuery(e.target.value)}
                                 style={{ padding: '0.75rem', borderRadius: '999px', border: '1px solid #86efac', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                             />
                             <button 
                                 type="button" 
                                 onClick={() => handleMarketAnalysis(customScoutQuery || `${values.name} ${values.category || ''}`.trim())} 
                                 disabled={marketSearch.loading} 
                                 className="btn btn-primary" 
                                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '999px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                             >
                                 {marketSearch.loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                                 {marketSearch.loading ? 'Vasculhando...' : 'Lançar Radar'}
                             </button>
                         </div>
                    </div>

                    {marketSearch.result && marketSearch.result.error === 'not_found' ? (
                        <div style={{ ...sCardLinear, padding: '2rem', textAlign: 'center', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
                            <ShieldQuestion size={32} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>Nenhum produto equivalente mapeado no Radar</h4>
                            <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
                                A busca específica por "<strong>{marketSearch.result.lastQuery}</strong>" não retornou amostras suficientes. {marketSearch.result.suggestions?.length > 0 ? "Você pode tentar as sugestões abaixo clicando nelas ou editar o termo lá em cima:" : "Edite a frase de busca lá em cima para algo mais simples (ex: 'Caneca Branca')."}
                            </p>
                            
                            {marketSearch.result.suggestions && marketSearch.result.suggestions.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                                    {marketSearch.result.suggestions.map((sug, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => handleMarketAnalysis(sug)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1.25rem', backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                            type="button"
                                        >
                                            <Search size={12} /> {sug}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : marketSearch.result && !marketSearch.result.error ? (
                        <div style={{ ...sCardLinear, padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '2rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Preço Médio Praticado Online</h4>
                                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-main)', fontFamily: 'monospace', lineHeight: 1 }}>
                                    <span style={{ fontSize: '1.5rem', color: 'var(--text-light)', marginRight: '4px' }}>R$</span>{marketSearch.result.avgPrice}
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
                                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Piso Encontrado</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>R$ {marketSearch.result.minPrice}</div>
                                        <a href={marketSearch.result.minLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textDecoration: 'none', backgroundColor: '#eff6ff', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                             Verificar Link <ExternalLink size={12} />
                                        </a>
                                    </div>
                                    <div style={{ width: '1px', backgroundColor: 'var(--border)' }}></div>
                                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Teto Encontrado</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>R$ {marketSearch.result.maxPrice}</div>
                                        <a href={marketSearch.result.maxLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textDecoration: 'none', backgroundColor: '#fffbeb', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                             Verificar Link <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ padding: '1rem 2rem', backgroundColor: 'var(--surface)' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Base Analítica: {marketSearch.result.sourcesSearched} Produtos Mapeados na Web (Amostra Filtrada: {marketSearch.result.saneSampleCount})</div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {marketSearch.result.competitors.map((c, i) => (
                                        <span key={i} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{c}</span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--background)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button type="button" onClick={() => setMarketSearch({loading:false, result:null})} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Refazer Análise</button>
                                <button type="button" onClick={() => { setValues({...values, price: marketSearch.result.avgPrice}); setActiveTab('costs'); }} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Adotar Este Preço</button>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* TAB: PROMOÇÕES */}
            {activeTab === 'campaign' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                     <div style={{ ...sCardLinear, backgroundColor: 'rgba(236, 72, 153, 0.05)', borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(236, 72, 153, 0.2)', paddingBottom: '1rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#be185d', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Tag size={18} /> Campanha de Etiqueta (Promoção)</h4>
                                <p style={{ fontSize: '0.75rem', color: '#db2777', margin: '0.25rem 0 0 0' }}>Habilita uma tarja com risco de "De / Por" na visualização do seu portfólio de vendas.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="campaignActive" className="sr-only peer" checked={values.campaignActive} onChange={e => handleChange({ target: { name: 'campaignActive', value: e.target.checked }})} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                            </label>
                         </div>

                         {values.campaignActive && (
                             <div className="animate-fade-in" style={{ marginTop: '0.5rem' }}>
                                 <div className="input-group" style={{ marginBottom: '1rem' }}>
                                     <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#be185d', marginBottom: '0.5rem', display: 'block' }}>Porcentagem de Desconto Oferecido (%)</label>
                                     <input type="number" name="campaignDiscount" min="0" max="100" className="form-input" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#db2777', borderColor: '#fbcfe8', backgroundColor: '#fff' }} placeholder="Ex: 15" value={values.campaignDiscount} onChange={handleChange} />
                                 </div>

                                 <div style={{ padding: '1.25rem', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fbcfe8', boxShadow: 'var(--shadow-sm)' }}>
                                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                                         <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'line-through', textTransform: 'uppercase', letterSpacing: '0.05em' }}>De: R$ {parseFloat(values.price||0).toFixed(2)}</span>
                                         <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', marginTop: '0.25rem' }}>Sairá Por:</span>
                                     </div>
                                     <span style={{ fontSize: '2rem', fontWeight: 900, color: '#db2777', fontFamily: 'monospace' }}>
                                         R$ {(parseFloat(values.price||0) * (1 - (parseFloat(values.campaignDiscount||0)/100))).toFixed(2)}
                                     </span>
                                 </div>
                             </div>
                         )}
                     </div>
                </div>
            )}
            
          </div>

          <div style={sFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <Save size={16} /> 
                {productToEdit ? 'Salvar Edição' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
