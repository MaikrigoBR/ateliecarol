import React, { useState, useEffect } from 'react';
import { Hammer, Wrench, Calendar, DollarSign, Activity, Plus, Trash2, Edit2, AlertCircle, Link as LinkIcon, Download } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

export function Equipments() {
  const { currentUser } = useAuth();
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [activeEquipForMaintenance, setActiveEquipForMaintenance] = useState(null);

  // Form State - Equipment
  const [equipForm, setEquipForm] = useState({
    name: '',
    brand: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    lifespanMonths: '60', // Default 5 years
    monthlyHours: '160', // Default 40h/week
    status: 'Ativo',
    maintenanceHistory: []
  });

  // Form State - Maintenance
  const [maintForm, setMaintForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    technician: ''
  });

  useEffect(() => {
    fetchEquipments();
  }, []);

  const fetchEquipments = async () => {
    setLoading(true);
    try {
        const all = await db.getAll('equipments');
        setEquipments(all || []);
    } catch (e) {
        console.error("Error fetching equipments", e);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveEquipment = async (e) => {
      e.preventDefault();
      try {
          const payload = {
              ...equipForm,
              purchasePrice: parseFloat(equipForm.purchasePrice) || 0,
              lifespanMonths: parseInt(equipForm.lifespanMonths) || 60,
              monthlyHours: parseInt(equipForm.monthlyHours) || 160
          };

          if (editingEquip?.id) {
              await db.update('equipments', editingEquip.id, payload);
              AuditService.log(currentUser, 'UPDATE', 'Equipments', editingEquip.id, `Atualizou equipamento: ${payload.name}`);
          } else {
              payload.maintenanceHistory = [];
              const created = await db.create('equipments', payload);
              AuditService.log(currentUser, 'CREATE', 'Equipments', created.id, `Cadastrou equipamento: ${payload.name}`);
          }

          setIsEquipModalOpen(false);
          setEditingEquip(null);
          fetchEquipments();
      } catch (err) {
          alert('Erro ao salvar equipamento.');
      }
  };

  const handleDeleteEquipment = async (id, name) => {
      if (window.confirm(`Tem certeza que deseja excluir o equipamento "${name}" e todo seu histórico de manutenção irreversivelmente?`)) {
          await db.delete('equipments', id);
          AuditService.log(currentUser, 'DELETE', 'Equipments', id, `Removeu equipamento: ${name}`);
          fetchEquipments();
      }
  };

  const handleSaveMaintenance = async (e) => {
      e.preventDefault();
      if (!activeEquipForMaintenance) return;

      try {
          const history = [...(activeEquipForMaintenance.maintenanceHistory || [])];
          history.push({
              id: Date.now().toString(),
              date: maintForm.date,
              description: maintForm.description,
              cost: parseFloat(maintForm.cost) || 0,
              technician: maintForm.technician
          });

          await db.update('equipments', activeEquipForMaintenance.id, { maintenanceHistory: history });
          AuditService.log(currentUser, 'UPDATE', 'Equipments', activeEquipForMaintenance.id, `Registrou manutenção no valor de R$ ${maintForm.cost}`);
          
          setIsMaintenanceModalOpen(false);
          setActiveEquipForMaintenance(null);
          fetchEquipments();
      } catch (err) {
          alert("Erro ao salvar manutenção.");
      }
  };

  const openEquipModal = (equip = null) => {
      if (equip) {
          setEditingEquip(equip);
          setEquipForm({
              name: equip.name,
              brand: equip.brand || '',
              purchaseDate: equip.purchaseDate || '',
              purchasePrice: equip.purchasePrice,
              lifespanMonths: equip.lifespanMonths,
              monthlyHours: equip.monthlyHours,
              status: equip.status || 'Ativo',
              maintenanceHistory: equip.maintenanceHistory || []
          });
      } else {
          setEditingEquip(null);
          setEquipForm({
            name: '', brand: '', purchaseDate: new Date().toISOString().split('T')[0],
            purchasePrice: '', lifespanMonths: '60', monthlyHours: '160', status: 'Ativo', maintenanceHistory: []
          });
      }
      setIsEquipModalOpen(true);
  };

  const openMaintenanceModal = (equip) => {
      setActiveEquipForMaintenance(equip);
      setMaintForm({
          date: new Date().toISOString().split('T')[0],
          description: '',
          cost: '',
          technician: ''
      });
      setIsMaintenanceModalOpen(true);
  };

  // KPIs
  const totalEquipmentsValue = equipments.reduce((acc, eq) => acc + (eq.purchasePrice || 0), 0);
  const totalMaintenanceCost = equipments.reduce((acc, eq) => {
      const historyCost = (eq.maintenanceHistory || []).reduce((sum, h) => sum + (h.cost || 0), 0);
      return acc + historyCost;
  }, 0);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Hammer size={28} color="var(--primary)" /> Máquinas & Ferramentas
                </h2>
                <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '4px' }}>
                    Gerencie o ciclo de vida, manutenções e o custo de hora-máquina para compor prazos e preços de personalizados.
                </p>
            </div>
            <button className="btn btn-primary" onClick={() => openEquipModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} /> Adicionar Máquina
            </button>
        </div>

        {/* Dashboards KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Investido (Compra)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '8px' }}>R$ {totalEquipmentsValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Custo Total Manutenções</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '8px' }}>R$ {totalMaintenanceCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Ativos Registrados</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '8px' }}>{equipments.length} Máquinas</div>
            </div>
        </div>

        {/* Equipment List */}
        <div className="card">
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Identificação</th>
                            <th>Saúde & Histórico</th>
                            <th>Cálculo Depreciação / ROI</th>
                            <th>Custo Hora-Máq.</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {equipments.map(eq => {
                            const monthsPassed = Math.floor((new Date() - new Date(eq.purchaseDate)) / (1000 * 60 * 60 * 24 * 30));
                            const deprecMonthly = (eq.purchasePrice || 0) / (eq.lifespanMonths || 1);
                            const currentValor = Math.max(0, (eq.purchasePrice || 0) - (deprecMonthly * monthsPassed));
                            
                            const hourCost = deprecMonthly / (eq.monthlyHours || 160);
                            const maintTotal = (eq.maintenanceHistory || []).reduce((sum, h) => sum + (h.cost || 0), 0);

                            return (
                                <tr key={eq.id}>
                                    <td>
                                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {eq.status === 'Ativo' ? <Activity size={16} color="#10b981"/> : <AlertCircle size={16} color="#ef4444"/>}
                                            {eq.name}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                                            {eq.brand} • Adquirido: {new Date(eq.purchaseDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '0.85rem', color: maintTotal > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                                Manutenções: R$ {maintTotal.toFixed(2)}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {eq.maintenanceHistory?.length || 0} registro(s) no log
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <strong>Compra:</strong> R$ {(eq.purchasePrice || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br/>
                                            <strong style={{ color: '#0ea5e9' }}>Atual (Depreciado):</strong> R$ {currentValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}<br/>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Vida Útil: {eq.lifespanMonths} meses</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', color: '#0f766e', padding: '8px 12px', borderRadius: '8px', display: 'inline-block', fontWeight: 700 }}>
                                            R$ {hourCost.toFixed(2)} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>/hora de uso</span>
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>*Sugerido para precificação</p>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-icon" style={{ backgroundColor: '#f1f5f9' }} title="Registrar Manutenção" onClick={() => openMaintenanceModal(eq)}>
                                                <Wrench size={16} color="#475569" />
                                            </button>
                                            <button className="btn btn-icon" title="Editar Equipamento" onClick={() => openEquipModal(eq)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn btn-icon text-danger" title="Excluir" onClick={() => handleDeleteEquipment(eq.id, eq.name)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {equipments.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhum equipamento cadastrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL: EQUIPAMENTO CRUD */}
        {isEquipModalOpen && (
            <div className="modal-overlay" onClick={() => setIsEquipModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                    <div className="modal-header">
                        <h2>{editingEquip ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
                        <button className="btn btn-icon text-muted" onClick={() => setIsEquipModalOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleSaveEquipment} className="modal-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Nome do Equipamento (Ex: Plotter Cameo 4, Impressora L1800)</label>
                                <input type="text" className="form-input" required value={equipForm.name} onChange={e => setEquipForm({...equipForm, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Marca / Fabricante</label>
                                <input type="text" className="form-input" value={equipForm.brand} onChange={e => setEquipForm({...equipForm, brand: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select className="form-input" value={equipForm.status} onChange={e => setEquipForm({...equipForm, status: e.target.value})}>
                                    <option value="Ativo">🟢 Ativo (Operante)</option>
                                    <option value="Manutenção">⚠️ Em Manutenção</option>
                                    <option value="Inativo">🔴 Inativo / Aposentado</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Data de Aquisição</label>
                                <input type="date" className="form-input" required value={equipForm.purchaseDate} onChange={e => setEquipForm({...equipForm, purchaseDate: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Valor Pago (R$)</label>
                                <input type="number" step="0.01" min="0" className="form-input" required value={equipForm.purchasePrice} onChange={e => setEquipForm({...equipForm, purchasePrice: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Vida Útil Estimada (em mêses)</label>
                                <input type="number" className="form-input" required value={equipForm.lifespanMonths} onChange={e => setEquipForm({...equipForm, lifespanMonths: e.target.value})} />
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ex: 5 anos = 60 meses.</span>
                            </div>
                            <div className="form-group">
                                <label>Jornada de Uso Mensal (Horas)</label>
                                <input type="number" className="form-input" required value={equipForm.monthlyHours} onChange={e => setEquipForm({...equipForm, monthlyHours: e.target.value})} />
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ex: 8h/dia * 20 dias = 160h. Permite calcular R$/hora.</span>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ marginTop: '20px' }}>
                            <button type="button" className="btn" onClick={() => setIsEquipModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Salvar Equipamento</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL: MANUTENÇÃO */}
        {isMaintenanceModalOpen && activeEquipForMaintenance && (
            <div className="modal-overlay" onClick={() => setIsMaintenanceModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                    <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem' }}>Registro de Manutenção</h2>
                            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Equipamento: <strong>{activeEquipForMaintenance.name}</strong></p>
                        </div>
                        <button className="btn btn-icon text-muted" onClick={() => setIsMaintenanceModalOpen(false)}>✕</button>
                    </div>
                    
                    <div style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '16px', margin: '0 -24px', borderBottom: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>Histórico Existente</h4>
                        {(!activeEquipForMaintenance.maintenanceHistory || activeEquipForMaintenance.maintenanceHistory.length === 0) ? (
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhuma manutenção registrada anteriormente.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {activeEquipForMaintenance.maintenanceHistory.slice().reverse().map(req => (
                                    <div key={req.id} style={{ backgroundColor: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, color: '#334155' }}>{new Date(req.date).toLocaleDateString()}</span>
                                            <span style={{ color: '#ef4444', fontWeight: 700 }}>R$ {(req.cost || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ color: '#64748b' }}>{req.description}</div>
                                        {req.technician && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Técnico/Local: {req.technician}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSaveMaintenance} style={{ paddingTop: '20px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Adicionar Novo Registro</h4>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div className="form-group">
                                <label>Data da Manutenção / Compra de Peça</label>
                                <input type="date" className="form-input" required value={maintForm.date} onChange={e => setMaintForm({...maintForm, date: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Descrição do Problema ou Troca (Ex: Refil de Tinta, Lâmina Nova)</label>
                                <input type="text" className="form-input" placeholder="O que foi feito?" required value={maintForm.description} onChange={e => setMaintForm({...maintForm, description: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Custo Total (R$)</label>
                                    <input type="number" step="0.01" min="0" className="form-input" required value={maintForm.cost} onChange={e => setMaintForm({...maintForm, cost: e.target.value})} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Fornecedor / Técnico</label>
                                    <input type="text" className="form-input" placeholder="Opcional" value={maintForm.technician} onChange={e => setMaintForm({...maintForm, technician: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ marginTop: '20px' }}>
                            <button type="button" className="btn" onClick={() => setIsMaintenanceModalOpen(false)}>Voltar</button>
                            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Registrar Gasto</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}
