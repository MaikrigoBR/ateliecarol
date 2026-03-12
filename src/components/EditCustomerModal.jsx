
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function EditCustomerModal({ isOpen, onClose, customer, onCustomerUpdated }) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'PF',
    document: '',
    status: 'active',
    instagram: '',
    birthDate: '',
    tags: '',
    photoUrl: ''
  });

  useEffect(() => {
    if (customer) {
        setFormData({
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            type: customer.type || 'PF',
            document: customer.document || '',
            status: customer.status || 'active',
            instagram: customer.instagram || '',
            birthDate: customer.birthDate || '',
            tags: customer.tags || '',
            photoUrl: customer.photoUrl || ''
        });
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const updatedData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '',
      type: formData.type || 'PF',
      document: formData.document || '',
      status: formData.status || 'active',
      instagram: formData.instagram || '',
      birthDate: formData.birthDate || '',
      tags: formData.tags || '',
      photoUrl: formData.photoUrl || ''
    };

    const updatedCustomer = await db.update('customers', customer.id, updatedData);
    AuditService.log(currentUser, 'UPDATE', 'Customer', customer.id, `Atualizou cliente: ${formData.name}`);
    
    if (onCustomerUpdated) {
        onCustomerUpdated(updatedCustomer);
    }
    
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Cliente</h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="input-group">
              <label className="form-label">Nome Completo *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Ana Silva"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-md">
                <div className="input-group">
                    <label className="form-label">Tipo de Pessoa</label>
                    <select 
                        className="form-input" 
                        value={formData.type} 
                        onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                        <option value="PF">Pessoa Física</option>
                        <option value="PJ">Pessoa Jurídica</option>
                    </select>
                </div>
                <div className="input-group">
                    <label className="form-label">{formData.type === 'PF' ? 'CPF' : 'CNPJ'}</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                        value={formData.document}
                        onChange={e => setFormData({...formData, document: e.target.value})}
                    />
                </div>
            </div>
            
             <div className="input-group">
                    <label className="form-label">Status do Cadastro</label>
                    <select 
                        className="form-input" 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                    </select>
            </div>

            <div className="input-group">
              <label className="form-label">Email de Contato *</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="Ex: ana@email.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="input-group">
              <label className="form-label">Telefone / WhatsApp</label>
              <input 
                type="tel" 
                className="form-input" 
                placeholder="Ex: (11) 99999-9999"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-md">
                <div className="input-group">
                  <label className="form-label">Link da Foto (Ex: Avatar do Instagram)</label>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://..."
                    value={formData.photoUrl}
                    onChange={e => setFormData({...formData, photoUrl: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="form-label">Instagram (@)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: @seuperfil"
                    value={formData.instagram}
                    onChange={e => setFormData({...formData, instagram: e.target.value})}
                  />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-md">
                <div className="input-group">
                  <label className="form-label">Data de Nasc. / Aniversário</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.birthDate}
                    onChange={e => setFormData({...formData, birthDate: e.target.value})}
                  />
                </div>
                <div className="input-group">
                    <label className="form-label">Tags (Segmentação p/ Campanhas)</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ex: Noiva, Recorrente"
                        value={formData.tags}
                        onChange={e => setFormData({...formData, tags: e.target.value})}
                    />
                </div>
            </div>



          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
