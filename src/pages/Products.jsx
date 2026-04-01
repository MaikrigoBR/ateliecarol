
import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Trash2, Edit2, Tag, PieChart, QrCode, Filter, Printer } from 'lucide-react';
import db from '../services/database.js';
import { NewProductModal } from '../components/NewProductModal.jsx';
import { ProductDetailsModal } from '../components/ProductDetailsModal.jsx';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function Products() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [qrCodeProduct, setQrCodeProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [profitFilter, setProfitFilter] = useState('all');

  const fetchProducts = async () => {
    const allProducts = await db.getAll('products');
    setProducts(allProducts);
    setFilteredProducts(allProducts);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    try {
        let results = products;
        
        if (searchTerm) {
            results = results.filter(product => 
              product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              product.category?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (selectedCategory !== 'all') {
            results = results.filter(product => product.category === selectedCategory);
        }
        
        if (profitFilter === 'loss') {
            results = results.filter(product => (product.totalCost || 0) > (product.price || 0));
        } else if (profitFilter === 'profit') {
            results = results.filter(product => (product.price || 0) > (product.totalCost || 0));
        }

        setFilteredProducts(results);
    } catch (e) {
        console.error("Filter crash prevented:", e);
    }
  }, [searchTerm, selectedCategory, profitFilter, products]);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const handlePrintReport = () => {
      const printWindow = window.open('', '_blank');
      const html = `
          <html>
          <head>
              <title>Relatório de Portfólio de Produtos</title>
              <style>
                  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; }
                  table { width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px; }
                  th, td { border-bottom: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; }
                  th { background-color: #f9fafb; font-weight: 700; color: #4b5563; text-transform: uppercase; font-size: 11px; }
                  .danger { color: #dc2626; font-weight: 700; }
                  .success { color: #059669; font-weight: 700; }
                  h1 { font-size: 24px; font-weight: 800; margin-bottom: 5px; color: #111827; }
                  p { font-size: 14px; color: #6b7280; margin: 0 0 5px 0; }
                  @media print {
                      @page { size: landscape; margin: 10mm; }
                      body { padding: 0; }
                  }
              </style>
          </head>
          <body>
              <h1>Relatório de Custos e Fichas de Produto</h1>
              <p>Documento gerado em: ${new Date().toLocaleString()}</p>
              <p>Total de Itens Listados: ${filteredProducts.length}</p>
              <table>
                  <thead>
                      <tr>
                          <th>Nome do Produto</th>
                          <th>Categoria</th>
                          <th>Custo Inicial (R$)</th>
                          <th>Custo Completo c/ Impostos (R$)</th>
                          <th>Preço Final (R$)</th>
                          <th>Margem (%)</th>
                          <th>Estoque</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${filteredProducts.map(p => {
                          const cost = parseFloat(p.totalCost) || 0;
                          const base = parseFloat(p.baseCost) || 0;
                          const price = parseFloat(p.price) || 0;
                          const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0;
                          return `
                              <tr>
                                  <td style="font-weight:600">${p.name}</td>
                                  <td>${p.category || '-'}</td>
                                  <td>${base.toFixed(2)}</td>
                                  <td>${cost.toFixed(2)}</td>
                                  <td style="font-weight:600">${price.toFixed(2)}</td>
                                  <td class="${margin < 0 ? 'danger' : 'success'}">${margin}%</td>
                                  <td>${p.stock}</td>
                              </tr>
                          `;
                      }).join('')}
                  </tbody>
              </table>
              <script>
                  window.onload = function() { window.print(); }
              </script>
          </body>
          </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
  };

  const handleDelete = async ( id, name ) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      await db.delete('products', id);
      AuditService.log(currentUser, 'DELETE', 'Product', id, `Excluiu produto: ${name}`);
      fetchProducts();
    }
  };

  const handleEdit = (product) => {
      setEditingProduct(product);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingProduct(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header items-center flex-wrap gap-4">
        <div className="flex gap-2 items-center flex-wrap w-full md:w-auto">
            <div className="input-group" style={{ marginBottom: 0, width: '250px' }}>
            <input 
                type="text" 
                placeholder="Buscar produtos..." 
                className="form-input shadow-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
            <select 
                className="form-input min-w-[150px] shadow-sm text-sm" 
                style={{ marginBottom: 0 }}
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
            >
                <option value="all">Todas as Categorias</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select 
                className="form-input min-w-[150px] shadow-sm text-sm" 
                style={{ marginBottom: 0 }}
                value={profitFilter} 
                onChange={e => setProfitFilter(e.target.value)}
            >
                <option value="all">Filtro de Receita (Todos)</option>
                <option value="profit">Operando com Lucro</option>
                <option value="loss">Operando em Prejuízo</option>
            </select>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto overflow-x-auto">
            <button className="btn btn-outline flex items-center gap-2 whitespace-nowrap bg-white text-gray-700 hover:text-blue-600 border-gray-200" onClick={handlePrintReport}>
                <Printer size={16} /> Relatório em PDF / Print
            </button>
            <button className="btn btn-primary shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 whitespace-nowrap" onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
                <Plus size={16} /> Adicionar Produto
            </button>
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.map(product => (
          <div 
            key={product.id} 
            className="card cursor-pointer hover:shadow-lg transition-all" 
            onClick={() => { setViewingProduct(product); setIsDetailsModalOpen(true); }}
          >
            <div className="product-image-container relative">
              {product.campaignActive && (
                  <div className="absolute top-2 left-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 flex items-center gap-1">
                      <Tag size={10} /> -{product.campaignDiscount}% OFF
                  </div>
              )}
              {product.images && product.images.length > 0 ? (
                <img src={product.images[0]} alt={product.name} className="product-image" />
              ) : product.image ? (
                <img src={product.image} alt={product.name} className="product-image" />
              ) : (
                <ImageIcon size={48} />
              )}
            </div>
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div className="product-action-row">
                <h3 className="product-title">{product.name}</h3>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                        className="btn btn-icon" 
                        style={{ backgroundColor: '#f1f5f9' }}
                        onClick={() => setQrCodeProduct(product)}
                        title="Display QR Code (Catálogo)"
                    >
                        <QrCode size={16} color="#0f172a" />
                    </button>
                    <button 
                        className="btn btn-icon" 
                        onClick={() => handleEdit(product)}
                        title="Editar Produto"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        className="btn btn-icon" 
                        style={{ padding: '4px', color: 'var(--danger)' }}
                        onClick={() => handleDelete(product.id, product.name)}
                        title="Excluir Produto"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
              <span className="text-sm text-muted">{product.category}</span>
              {product.description && (
                  <p style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-muted)', 
                      marginTop: '0.5rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.2'
                  }} title={product.description}>
                      {product.description}
                  </p>
              )}
              {(product.totalCost > 0 || product.baseCost > 0) && product.price > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 w-fit rounded shadow-sm">
                        <span className="text-slate-500 font-bold uppercase tracking-wide">Custo Full: <span className="font-mono text-slate-800">R$ {parseFloat(product.totalCost || product.baseCost || 0).toFixed(2)}</span></span>
                    </div>
                    {(product.price - (product.totalCost || product.baseCost || 0)) < 0 ? (
                        <div className="flex items-center gap-1 text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                            <span className="font-bold">PREJUÍZO DETECTADO</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded shadow-sm">
                            <PieChart size={10} />
                            <span className="font-bold">Mg. {( ((product.price - (product.totalCost || product.baseCost || 0)) / product.price) * 100 ).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
              )}
            </div>
            
            <div className="product-card-footer">
              <span className="product-price flex flex-col">
                  {product.campaignActive ? (
                      <>
                          <span className="text-[10px] text-gray-400 line-through font-normal">R$ {Number(Math.floor(Number(product.price || 0) * 100) / 100).toFixed(2).replace('.', ',')}</span>
                          <span className="text-pink-600">R$ {Number(Math.floor((Number(product.price||0) * (1 - (Number(product.campaignDiscount||0)/100))) * 100) / 100).toFixed(2).replace('.', ',')}</span>
                      </>
                  ) : (
                      <span>R$ {Number(Math.floor(Number(product.price || 0) * 100) / 100).toFixed(2).replace('.', ',')}</span>
                  )}
              </span>
              <div style={{ textAlign: 'right' }}>
                <div className="product-stock-label">Estoque</div>
                <span className={`badge ${product.stock < 10 ? 'badge-warning' : 'badge-success'}`}>{product.stock} un.</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <NewProductModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          onProductSaved={() => {
            fetchProducts();
            handleCloseModal();
            // Automatically update the viewing product if the details modal is also open underneath
            if (isDetailsModalOpen && editingProduct) {
                db.getById('products', editingProduct.id).then(updated => {
                    if (updated) setViewingProduct(updated);
                });
            }
          }}
          productToEdit={editingProduct}
        />
      )}

      {isDetailsModalOpen && (
        <ProductDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => { setIsDetailsModalOpen(false); setViewingProduct(null); }}
          product={viewingProduct}
          onEdit={(p) => handleEdit(p)}
          onDuplicate={(p) => {
            setEditingProduct({ ...p, id: null, name: `${p.name} (Cópia)` });
            setIsDetailsModalOpen(false);
            setIsModalOpen(true);
          }}
          onDelete={(id, name) => {
              handleDelete(id, name);
              setIsDetailsModalOpen(false);
          }}
          onShareQrCode={(p) => setQrCodeProduct(p)}
        />
      )}

      {/* MODAL: QR CODE DE VITRINE PARA PRODUTO */}
      {qrCodeProduct && (
           <div className="modal-overlay" onClick={() => setQrCodeProduct(null)}>
              <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  #printable-tag-prod, #printable-tag-prod * { visibility: visible; }
                  #printable-tag-prod {
                    position: absolute; left: 0; top: 0; margin: 0 !important;
                    padding: 24px !important; border: 2px dashed #cbd5e1 !important;
                    border-radius: 12px !important; width: 400px !important;
                    box-shadow: none !important;
                  }
                  .modal-overlay { background: transparent !important; overflow: visible !important; }
                }
              `}
              </style>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', textAlign: 'center', padding: '32px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Display interativo</h2>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
                      Posicione este código na sua vitrine ou balcão. O cliente lerá e abrirá a ficha resumida do produto no smartphone.
                  </p>
                  
                  <div id="printable-tag-prod" style={{ 
                      backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', 
                      border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '16px', margin: '0 auto', maxWidth: '400px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                  }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#8b5cf6', letterSpacing: '1px' }}>
                          ESCANEIE PARA COMPRAR
                      </div>
                      <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/product/${qrCodeProduct.id}`)}`} 
                          alt={`QR Code ${qrCodeProduct.name}`}
                          style={{ width: '140px', height: '140px', objectFit: 'contain' }}
                      />
                      <div style={{ textAlign: 'center', width: '100%' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '8px', wordBreak: 'break-word' }}>
                              {qrCodeProduct.name}
                          </div>
                      </div>
                  </div>

                  <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button className="btn btn-secondary" onClick={() => setQrCodeProduct(null)}>Cancelar</button>
                      <button className="btn btn-primary" style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => window.print()}>
                          Imprimir Display
                      </button>
                  </div>
              </div>
           </div>
      )}

    </div>
  );
}
