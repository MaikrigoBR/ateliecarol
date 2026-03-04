
import React, { useState, useEffect } from 'react';
import { Plus, Image as ImageIcon, Trash2, Edit2, Tag, PieChart } from 'lucide-react';
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
    </div>
  );
}
