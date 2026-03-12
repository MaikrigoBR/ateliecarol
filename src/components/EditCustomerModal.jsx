
import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone as PhoneIcon, Tag, Instagram, Briefcase, CreditCard } from 'lucide-react';
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

  const avatarUrl = formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Cliente')}&background=random&color=fff`;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', backgroundColor: 'var(--background)' }}>
        <div className="modal-header" style={{ backgroundColor: 'var(--surface)' }}>
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={20} /> Editar Cliente</h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
            
            {/* Avatar Preview Section */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', border: '2px solid var(--border)', flexShrink: 0 }}>
                    <img src={avatarUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '?')}`; }} />
                </div>
                <div style={{ flex: 1 }}>
                     <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Foto do Perfil</h4>
                     <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                         Insira um "Link da Foto" abaixo para personalizar. O Instagram bloqueou a sincronização automática de fotos.
                     </p>
                </div>
            </div>

            {/* Dados Pessoais */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={16} /> Identificação e Dados Fiscais
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nome Completo *</label>
                        <input type="text" className="form-input" placeholder="Ex: Ana Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-md">
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Tipo de Pessoa</label>
                            <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option value="PF">Pessoa Física</option>
                                <option value="PJ">Pessoa Jurídica</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">{formData.type === 'PF' ? 'CPF' : 'CNPJ'}</label>
                            <input type="text" className="form-input" placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'} value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} />
                        </div>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CreditCard size={14}/> Status do Cadastro</label>
                        <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Contato */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PhoneIcon size={16} /> Canais de Contato
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="grid grid-cols-2 gap-md">
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Email Principal *</label>
                            <input type="email" className="form-input" placeholder="Ex: ana@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Telefone / WhatsApp</label>
                            <input type="tel" className="form-input" placeholder="Ex: (11) 99999-9999" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Redes e CRM */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={16} /> Marketing e Segmentação
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="grid grid-cols-2 gap-md">
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Instagram size={14} color="#E1306C" /> Instagram (@)</label>
                            <input type="text" className="form-input" placeholder="Ex: @seuperfil" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Link da Foto Personalizada</label>
                            <input type="url" className="form-input" placeholder="https://..." value={formData.photoUrl} onChange={e => setFormData({...formData, photoUrl: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-md">
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Data de Nascimento</label>
                            <input type="date" className="form-input" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Tags (Segmentação)</label>
                            <input type="text" className="form-input" placeholder="Ex: Noiva, VIP" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>

          </div>

          <div className="modal-footer" style={{ backgroundColor: 'var(--surface)' }}>
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
