
import React, { useState } from 'react';
import { X, Save, User, Phone as PhoneIcon, Tag, Instagram, Briefcase, Thermometer, Palette, Link2, CalendarHeart, Plus, Trash2 } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function NewCustomerModal({ isOpen, onClose, onCustomerCreated }) {
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
    photoUrl: '',
    temperature: 'morno',
    styles: [],
    moodboardUrl: '',
    milestones: []
  });

  const [newMilestone, setNewMilestone] = useState({ title: '', date: '' });
  const [newStyle, setNewStyle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const newCustomer = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '',
      type: formData.type || 'PF',
      document: formData.document || '',
      status: formData.status || 'active',
      instagram: formData.instagram || '',
      birthDate: formData.birthDate || '',
      tags: formData.tags || '',
      photoUrl: formData.photoUrl || '',
      temperature: formData.temperature || 'morno',
      styles: formData.styles || [],
      moodboardUrl: formData.moodboardUrl || '',
      milestones: formData.milestones || [],
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };

    const savedCustomer = await db.create('customers', newCustomer);
    AuditService.log(currentUser, 'CREATE', 'Customer', savedCustomer.id || 'unknown', `Criou cliente: ${formData.name}`);
    
    // Call callback if provided
    if (onCustomerCreated) {
        onCustomerCreated(savedCustomer);
    }
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      phone: '',
      type: 'PF',
      document: '',
      status: 'active',
      instagram: '',
      birthDate: '',
      tags: '',
      photoUrl: '',
      temperature: 'morno',
      styles: [],
      moodboardUrl: '',
      milestones: []
    });
    
    onClose();
  };

  const handleAddStyle = () => {
      if (newStyle.trim() && !formData.styles.includes(newStyle.trim())) {
          setFormData({ ...formData, styles: [...formData.styles, newStyle.trim()] });
          setNewStyle('');
      }
  };

  const handleRemoveStyle = (styleToRemove) => {
      setFormData({ ...formData, styles: formData.styles.filter(s => s !== styleToRemove) });
  };

  const handleAddMilestone = () => {
      if (newMilestone.title && newMilestone.date) {
          // Usando utc dates ou apenas a string
          let dateStr = newMilestone.date;
          if(dateStr.length === 10) dateStr = dateStr + 'T12:00:00Z'; // Evitar offfset de timezone na hora de renderizar depois

          setFormData({ ...formData, milestones: [...formData.milestones, { ...newMilestone, date: dateStr, id: Date.now().toString() }] });
          setNewMilestone({ title: '', date: '' });
      }
  };

  const handleRemoveMilestone = (idToRemove) => {
      setFormData({ ...formData, milestones: formData.milestones.filter(m => m.id !== idToRemove) });
  };

  const avatarUrl = formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Novo Cliente')}&background=random&color=fff`;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', backgroundColor: 'var(--background)' }}>
        <div className="modal-header" style={{ backgroundColor: 'var(--surface)' }}>
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={20} /> Novo Cliente</h2>
          <button className="btn btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', overflowY: 'auto' }}>
            
            {/* Avatar Preview Section */}
            <div style={{ flexShrink: 0, display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', border: '2px solid var(--border)', flexShrink: 0 }}>
                    <img src={avatarUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '?')}`; }} />
                </div>
                <div style={{ flex: 1 }}>
                     <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Foto do Perfil</h4>
                     <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                         Insira um "Link da Foto" abaixo (você também pode clicar com o direito numa foto real e "Copiar Endereço da Imagem").
                     </p>
                </div>
            </div>

            {/* Dados Pessoais */}
            <div style={{ flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
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
                </div>
            </div>

            {/* Contato */}
            <div style={{ flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
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
            <div style={{ flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
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
                            <label className="form-label">Tags Livres</label>
                            <input type="text" className="form-input" placeholder="Ex: VIP" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Termômetro e Moodboard */}
            <div style={{ flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Thermometer size={16} /> Engajamento e Inspiração
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     <div className="grid grid-cols-2 gap-md">
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Nível de Termômetro (VIP)</label>
                            <select className="form-input" value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})}>
                                <option value="frio">🥶 Frio (Pouco Contato)</option>
                                <option value="morno">😐 Morno (Interage às vezes)</option>
                                <option value="quente">🔥 Quente (Cliente Fiel / VIP)</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Link2 size={14} /> Link do Moodboard (Pinterest/IG)</label>
                            <input type="url" className="form-input" placeholder="https://..." value={formData.moodboardUrl} onChange={e => setFormData({...formData, moodboardUrl: e.target.value})} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Estilo e Preferências */}
            <div style={{ flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Palette size={16} /> Estilo e Personas
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Adicionar Tag de Estilo (Ex: Romântica, Noiva)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" className="form-input" placeholder="Digite um estilo" value={newStyle} onChange={e => setNewStyle(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddStyle())} />
                            <button type="button" className="btn btn-secondary" onClick={handleAddStyle}><Plus size={16} /> Adicionar</button>
                        </div>
                    </div>
                    {formData.styles && formData.styles.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {formData.styles.map(style => (
                                <span key={style} className="badge" style={{ backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '16px', fontSize: '0.8rem' }}>
                                    {style}
                                    <button type="button" onClick={() => handleRemoveStyle(style)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Marcos e Datas Especiais */}
            <div style={{ flexShrink: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarHeart size={16} /> Marcos e Datas Especiais
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="grid grid-cols-2 gap-md" style={{ alignItems: 'end' }}>
                         <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Qual o Título do Evento?</label>
                            <input type="text" className="form-input" placeholder="Ex: Aniversário Filho (João)" value={newMilestone.title} onChange={e => setNewMilestone({...newMilestone, title: e.target.value})} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Data</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="date" className="form-input" value={newMilestone.date} onChange={e => setNewMilestone({...newMilestone, date: e.target.value})} />
                                <button type="button" className="btn btn-secondary" onClick={handleAddMilestone}><Plus size={16} /></button>
                            </div>
                        </div>
                    </div>
                    {formData.milestones && formData.milestones.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            {formData.milestones.map(milestone => (
                                <div key={milestone.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{milestone.title}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(milestone.date).toLocaleDateString()}</span>
                                    </div>
                                    <button type="button" className="btn btn-icon" onClick={() => handleRemoveMilestone(milestone.id)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

          </div>

          <div className="modal-footer" style={{ backgroundColor: 'var(--surface)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Salvar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
