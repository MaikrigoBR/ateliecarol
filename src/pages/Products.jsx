
import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Trash2, Edit2, Tag, PieChart, QrCode } from 'lucide-react';
import db from '../services/database.js';
import { NewProductModal } from '../components/NewProductModal.jsx';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function Products() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [qrCodeProduct, setQrCodeProduct] = useState(null);

  const fetchProducts = async () => {
    const allProducts = await db.getAll('products');
    setProducts(allProducts);
    setFilteredProducts(allProducts);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const results = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);

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
      <div className="card-header">
        <div className="input-group" style={{ marginBottom: 0, width: '300px' }}>
          <input 
            type="text" 
            placeholder="Buscar produtos..." 
            className="form-input" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
          <Plus size={16} />
          Adicionar Produto
        </button>
      </div>

      <div className="product-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="card">
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
                <div className="flex gap-1">
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
              {product.totalCost > 0 && product.price > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[10px] bg-gray-50 border border-gray-100 p-1 w-fit rounded">
                    <PieChart size={12} className="text-gray-400" />
                    <span className="text-gray-500">Mg: {( ((product.price - product.totalCost) / product.price) * 100 ).toFixed(0)}%</span>
                </div>
              )}
            </div>
            
            <div className="product-card-footer">
              <span className="product-price flex flex-col">
                  {product.campaignActive ? (
                      <>
                          <span className="text-[10px] text-gray-400 line-through font-normal">R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}</span>
                          <span className="text-pink-600">R$ {(Number(product.price||0) * (1 - (Number(product.campaignDiscount||0)/100))).toFixed(2).replace('.', ',')}</span>
                      </>
                  ) : (
                      <span>R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}</span>
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
          }}
          productToEdit={editingProduct}
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
