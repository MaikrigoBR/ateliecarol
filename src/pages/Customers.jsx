import React, { useState, useEffect } from 'react';
import { Mail, Phone, ShoppingBag, Plus, Trash2, Edit, MessageCircle, Instagram, Tag, Gift } from 'lucide-react';
import db from '../services/database.js';
import { NewCustomerModal } from '../components/NewCustomerModal.jsx';
import { EditCustomerModal } from '../components/EditCustomerModal.jsx';
import { MarketingCampaignModal } from '../components/MarketingCampaignModal.jsx';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function Customers() {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchCustomers = async () => {
    const allCustomers = await db.getAll('customers') || [];
    setCustomers(allCustomers);
    setFilteredCustomers(allCustomers);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const results = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(results);
  }, [searchTerm, customers]);

  const handleDelete = async (id, name) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
        await db.delete('customers', id);
        AuditService.log(currentUser, 'DELETE', 'Customer', id, `Removeu cliente: ${name}`);
        fetchCustomers();
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="card-header">
        <div className="input-group" style={{ marginBottom: 0, width: '300px' }}>
          <input 
            type="text" 
            placeholder="Buscar clientes..." 
            className="form-input" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button 
             className="btn" 
             style={{ backgroundColor: '#E1306C', color: 'white', border: 'none' }} 
             onClick={() => setIsCampaignModalOpen(true)}
             title="Gerar campanha de WhatsApp baseada em Tags"
           >
             <MessageCircle size={16} /> Marketing & Promoções
           </button>
           <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
             <Plus size={16} />
             Novo Cliente
           </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome / Perfil Social</th>
                <th>Contato Rápidos</th>
                <th>Segmentação (CRM)</th>
                <th>Pedidos / LTV</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-main)' }}>{customer.name}</div>
                      {customer.instagram && (
                          <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <Instagram size={12} style={{ color: '#E1306C' }} /> 
                              <a href={`https://instagram.com/${customer.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                                  {customer.instagram}
                              </a>
                          </div>
                      )}
                      {customer.birthDate && (
                          <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <Gift size={12} style={{ color: '#f59e0b' }} /> 
                              {new Date(customer.birthDate).toLocaleDateString()}
                          </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-sm text-sm" style={{ marginBottom: '4px' }}>
                        <Mail size={14} className="text-muted" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-sm text-sm text-muted">
                        <Phone size={14} />
                        {customer.phone}
                        {customer.phone && (
                            <a 
                                href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}?text=Olá ${customer.name}, temos novidades no atelier!`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-icon" 
                                style={{ padding: '2px', color: '#25D366', marginLeft: 'auto' }} 
                                title="Falar no WhatsApp"
                            >
                                <MessageCircle size={16} fill="currentColor" />
                            </a>
                        )}
                      </div>
                    </td>
                    <td>
                       <div className="flex flex-wrap gap-1">
                          {customer.tags ? customer.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                              <span key={i} className="badge" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border)', fontSize: '0.70rem' }}>
                                  <Tag size={10} style={{ marginRight: '4px' }} /> {tag}
                              </span>
                          )) : <span className="text-xs text-muted italic">Sem segmentação</span>}
                       </div>
                    </td>
                    <td>
                      <div className="badge badge-neutral" style={{ marginBottom: '4px' }}>
                        <ShoppingBag size={12} style={{ marginRight: '4px' }} />
                        {customer.totalOrders} pedidos
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.85rem' }}>
                        LTV: R$ {Number(customer.totalSpent || 0).toFixed(2).replace('.', ',')}
                      </div>
                    </td>
                    <td>
                        <button 
                            className="btn btn-icon" 
                            style={{ color: 'var(--primary)' }}
                            onClick={() => {
                                setSelectedCustomer(customer);
                                setIsEditModalOpen(true);
                            }}
                            title="Editar Cliente"
                        >
                            <Edit size={16} />
                        </button>
                        <button 
                            className="btn btn-icon" 
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDelete(customer.id, customer.name)}
                            title="Remover Cliente"
                        >
                            <Trash2 size={16} />
                        </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewCustomerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCustomerCreated={(newCustomer) => {
           fetchCustomers();
           setIsModalOpen(false);
        }}
      />

       <EditCustomerModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={selectedCustomer}
        onCustomerUpdated={(updatedCustomer) => {
           fetchCustomers();
           setIsEditModalOpen(false);
        }}
      />

      <MarketingCampaignModal 
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        customers={customers}
      />
    </div>
  );
}
