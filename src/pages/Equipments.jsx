import React, { useState, useEffect } from 'react';
import { Hammer, Wrench, Calendar, DollarSign, Activity, Plus, Trash2, Edit2, AlertCircle, Link as LinkIcon, Download, Package, QrCode, Search, Filter, FileText } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { calculateFractionalCost, getSubUnits } from '../utils/units';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LinkedTransactionsModal } from '../components/LinkedTransactionsModal.jsx';

export function Equipments() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [materialsList, setMaterialsList] = useState([]);
  const [existingGroups, setExistingGroups] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [linkedEntityId, setLinkedEntityId] = useState(null);
  const [linkedEntityName, setLinkedEntityName] = useState('');
  
  // Modals state
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEquip, setViewingEquip] = useState(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [activeEquipForMaintenance, setActiveEquipForMaintenance] = useState(null);
  
  const [isConsumablesModalOpen, setIsConsumablesModalOpen] = useState(false);
  const [activeEquipForConsumable, setActiveEquipForConsumable] = useState(null);

  const [qrCodeEquip, setQrCodeEquip] = useState(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  // Form State - Equipment
  const [equipForm, setEquipForm] = useState({
    name: '',
    equipmentGroup: '',
    brand: '',
    model: '',
    description: '',
    photoUrl: '',
    patrimonyId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    lifespanMonths: '60', // Default 5 years
    monthlyHours: '160', // Default 40h/week
    status: 'Ativo',
    maintenanceHistory: [],
    consumables: [],
    launchFinance: false,
    accountId: '',
    paymentMethod: 'pix'
  });

  // Form State - Maintenance
  const [maintForm, setMaintForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    technician: '',
    downtimeHours: '',
    launchFinance: false,
    accountId: '',
    paymentMethod: 'pix'
  });

  // Form State - Consumable
  const [consForm, setConsForm] = useState({
    inventoryId: '',
    name: '',
    usedQuantity: '',
    usedUnit: '',
    actionName: 'página colorida',
    actionsPerHour: '600',
    cost: '',
    yield: '',
    yieldUnit: 'páginas'
  });

  useEffect(() => {
    fetchEquipments();
  }, []);

  // Check URL params to open maintenance modal automatically from QR Code scan
  useEffect(() => {
    if (equipments.length > 0 && location.search) {
      const params = new URLSearchParams(location.search);
      const maintId = params.get('maintenance_id');
      if (maintId) {
        const eq = equipments.find(e => String(e.id) === String(maintId) || String(e.patrimonyId) === String(maintId));
        if (eq) {
          openMaintenanceModal(eq);
          // Clear param after opening so it doesn't reopen upon refresh
          navigate('/equipments', { replace: true });
        }
      }
    }
  }, [equipments, location.search, navigate]);

  const fetchEquipments = async () => {
    setLoading(true);
    try {
        const allEq = await db.getAll('equipments');
        const allInv = await db.getAll('inventory');
        const allAcc = await db.getAll('accounts');
        setAccounts(allAcc || []);
        setEquipments(allEq || []);
        if (allInv) {
            const mats = allInv.filter(i => i.type === 'material');
            setMaterialsList(mats);
            const groups = [...new Set((allEq || []).map(e => e.equipmentGroup).filter(Boolean))];
            setExistingGroups(groups.sort());
        }
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
              patrimonyId: equipForm.patrimonyId || Date.now().toString(36).toUpperCase(), // Auto-generate if empty
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
              
              if (equipForm.launchFinance && equipForm.accountId && equipForm.purchasePrice > 0) {
                  const amt = parseFloat(equipForm.purchasePrice);
                  const installments = parseInt(equipForm.installments) || 1;
                  const isCredit = equipForm.paymentMethod === 'credit';
                  
                  if (installments > 1) {
                      const instAmt = amt / installments;
                      for (let i = 0; i < installments; i++) {
                          const nd = new Date(payload.purchaseDate);
                          nd.setMonth(nd.getMonth() + i);
                          await db.create('transactions', {
                              description: `Aquisição: ${payload.name} (${i+1}/${installments})`,
                              amount: instAmt,
                              type: 'expense',
                              category: 'Investimento / Equipamentos',
                              date: nd.toISOString().split('T')[0],
                              status: isCredit ? 'paid' : 'pending', // Parcelas vão para 'a pagar'
                              paymentMethod: equipForm.paymentMethod || 'pix',
                              accountId: equipForm.accountId,
                              installmentNumber: i + 1,
                              installmentsTotal: installments,
                              referenceId: created.id,
                              referenceType: 'Equipment'
                          });
                      }
                  } else {
                      await db.create('transactions', {
                          description: `Aquisição de Ativo: ${payload.name} (${payload.brand})`,
                          amount: amt,
                          type: 'expense',
                          category: 'Investimento / Equipamentos',
                          date: payload.purchaseDate,
                          status: 'paid',
                          paymentMethod: equipForm.paymentMethod || 'pix',
                          accountId: equipForm.accountId,
                          referenceId: created.id,
                          referenceType: 'Equipment'
                      });
                      if (!isCredit) {
                          const targetAcc = accounts.find(a => a.id === equipForm.accountId);
                          if (targetAcc) {
                              await db.update('accounts', targetAcc.id, { balance: parseFloat(targetAcc.balance) - amt });
                          }
                      }
                  }
              }
          }

          setIsEquipModalOpen(false);
          setIsViewModalOpen(false);
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
          setIsViewModalOpen(false);
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
              technician: maintForm.technician,
              downtimeHours: parseFloat(maintForm.downtimeHours) || 0
          });

          await db.update('equipments', activeEquipForMaintenance.id, { maintenanceHistory: history });
          AuditService.log(currentUser, 'UPDATE', 'Equipments', activeEquipForMaintenance.id, `Registrou manutenção no valor de R$ ${maintForm.cost}`);
          
          if (maintForm.launchFinance && maintForm.accountId && parseFloat(maintForm.cost) > 0) {
              const amt = parseFloat(maintForm.cost);
              const installments = parseInt(maintForm.installments) || 1;
              const isCredit = maintForm.paymentMethod === 'credit';

              if (installments > 1) {
                  const instAmt = amt / installments;
                  for (let i = 0; i < installments; i++) {
                      const nd = new Date(maintForm.date);
                      nd.setMonth(nd.getMonth() + i);
                      await db.create('transactions', {
                          description: `Manut: ${activeEquipForMaintenance.name} (${i+1}/${installments})`,
                          amount: instAmt,
                          type: 'expense',
                          category: 'Manutenção de Equipamentos',
                          date: nd.toISOString().split('T')[0],
                          status: isCredit ? 'paid' : 'pending',
                          paymentMethod: maintForm.paymentMethod || 'pix',
                          accountId: maintForm.accountId,
                          installmentNumber: i + 1,
                          installmentsTotal: installments,
                          referenceId: activeEquipForMaintenance.id,
                          referenceType: 'Equipment'
                      });
                  }
              } else {
                  await db.create('transactions', {
                      description: `Manut.: ${activeEquipForMaintenance.name} - ${maintForm.description}`,
                      amount: amt,
                      type: 'expense',
                      category: 'Manutenção de Equipamentos',
                      date: maintForm.date,
                      status: 'paid',
                      paymentMethod: maintForm.paymentMethod || 'pix',
                      accountId: maintForm.accountId,
                      referenceId: activeEquipForMaintenance.id,
                      referenceType: 'Equipment'
                  });
                  if (!isCredit) {
                      const targetAcc = accounts.find(a => a.id === maintForm.accountId);
                      if (targetAcc) {
                          await db.update('accounts', targetAcc.id, { balance: parseFloat(targetAcc.balance) - amt });
                      }
                  }
              }
          }

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
              equipmentGroup: equip.equipmentGroup || '',
              brand: equip.brand || '',
              model: equip.model || '',
              description: equip.description || '',
              photoUrl: equip.photoUrl || '',
              patrimonyId: equip.patrimonyId || '',
              purchaseDate: equip.purchaseDate || '',
              purchasePrice: equip.purchasePrice,
              lifespanMonths: equip.lifespanMonths,
              monthlyHours: equip.monthlyHours,
              status: equip.status || 'Ativo',
              maintenanceHistory: equip.maintenanceHistory || [],
              consumables: equip.consumables || []
          });
      } else {
          setEditingEquip(null);
          setEquipForm({
            name: '', equipmentGroup: '', brand: '', model: '', description: '', photoUrl: '', patrimonyId: '', purchaseDate: new Date().toISOString().split('T')[0],
            purchasePrice: '', lifespanMonths: '60', monthlyHours: '160', status: 'Ativo', maintenanceHistory: [], consumables: []
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
          technician: '',
          downtimeHours: ''
      });
      setIsMaintenanceModalOpen(true);
  };

  const handleSaveConsumable = async (e) => {
      e.preventDefault();
      if (!activeEquipForConsumable) return;

      try {
          const arr = [...(activeEquipForConsumable.consumables || [])];
          arr.push({
              id: Date.now().toString(),
              inventoryId: consForm.inventoryId,
              name: consForm.name,
              usedQuantity: parseFloat(consForm.usedQuantity) || 0,
              usedUnit: consForm.usedUnit,
              actionName: consForm.actionName,
              actionsPerHour: parseInt(consForm.actionsPerHour) || 1,
              cost: parseFloat(consForm.cost) || 0,
              yield: parseInt(consForm.yield) || 1,
              yieldUnit: consForm.yieldUnit
          });

          await db.update('equipments', activeEquipForConsumable.id, { consumables: arr });
          AuditService.log(currentUser, 'UPDATE', 'Equipments', activeEquipForConsumable.id, `Adicionou insumo: ${consForm.name}`);
          
          setActiveEquipForConsumable({ ...activeEquipForConsumable, consumables: arr });
          fetchEquipments();
          
          // reset form
          setConsForm({
              inventoryId: '', name: '', usedQuantity: '', usedUnit: '', actionName: 'página colorida', actionsPerHour: '600', cost: '', yield: '', yieldUnit: 'páginas'
          });
      } catch (err) {
          alert("Erro ao salvar insumo.");
      }
  };

  const handleDeleteConsumable = async (consId) => {
      if (!activeEquipForConsumable) return;
      if (window.confirm("Deseja remover este insumo do equipamento?")) {
          try {
              const arr = (activeEquipForConsumable.consumables || []).filter(c => c.id !== consId);
              await db.update('equipments', activeEquipForConsumable.id, { consumables: arr });
              setActiveEquipForConsumable({ ...activeEquipForConsumable, consumables: arr });
              fetchEquipments();
          } catch (e) {
              console.error(e);
          }
      }
  };

  const openConsumablesModal = (equip) => {
      setActiveEquipForConsumable(equip);
      setConsForm({
          inventoryId: '',
          name: '',
          usedQuantity: '',
          usedUnit: '',
          actionName: 'página colorida',
          actionsPerHour: '600',
          cost: '',
          yield: '',
          yieldUnit: 'páginas'
      });
      setIsConsumablesModalOpen(true);
  };

  // KPIs
  const filteredEquipments = equipments.filter(eq => {
      const matchSearch = eq.name?.toLowerCase().includes(searchTerm.toLowerCase()) || eq.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || eq.patrimonyId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || eq.status === statusFilter;
      const matchGroup = !groupFilter || eq.equipmentGroup === groupFilter;
      return matchSearch && matchStatus && matchGroup;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const totalEquipmentsValue = filteredEquipments.reduce((acc, eq) => acc + (eq.purchasePrice || 0), 0);
  const totalMaintenanceCost = filteredEquipments.reduce((acc, eq) => {
      const historyCost = (eq.maintenanceHistory || []).reduce((sum, h) => sum + (h.cost || 0), 0);
      return acc + historyCost;
  }, 0);

  const handleExportPDF = () => {
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('Relatório de Máquinas e Ferramentas (Gestão de Ativos)', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Data do Relatório: ${new Date().toLocaleDateString()} | Total Filtrado: ${filteredEquipments.length} Ativo(s)`, 14, 30);

      const tableData = filteredEquipments.map(eq => {
          const monthsPassed = Math.floor((new Date() - new Date(eq.purchaseDate)) / (1000 * 60 * 60 * 24 * 30));
          const deprecMonthly = (eq.purchasePrice || 0) / (eq.lifespanMonths || 1);
          const currentValor = Math.max(0, (eq.purchasePrice || 0) - (deprecMonthly * Math.max(0, monthsPassed)));
          const maintTotal = (eq.maintenanceHistory || []).reduce((sum, h) => sum + (h.cost || 0), 0);
          
          let downtime = (eq.maintenanceHistory || []).reduce((sum, h) => sum + (parseFloat(h.downtimeHours) || 0), 0);
          const totalExpectedHours = (Math.max(1, monthsPassed) * (eq.monthlyHours || 160));
          const availability = Math.max(0, ((totalExpectedHours - downtime) / totalExpectedHours) * 100);

          return [
              eq.name,
              eq.patrimonyId || '-',
              eq.status,
              `${new Date(eq.purchaseDate).toLocaleDateString()}`,
              `R$ ${(eq.purchasePrice || 0).toFixed(2)}`,
              `R$ ${currentValor.toFixed(2)}`,
              `R$ ${maintTotal.toFixed(2)}`,
              `${availability.toFixed(1)}%`
          ];
      });

      autoTable(doc, {
          startY: 38,
          head: [['Equipamento', 'Patrimônio', 'Status', 'Data Compra', 'Valor Compra', 'Valor Atual(Deprec.)', 'Custo Manut.', 'Disponibilidade(OEE)']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 8 }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`Valor Total Investido (Ativos Filtrados): R$ ${totalEquipmentsValue.toFixed(2)}`, 14, finalY);
      doc.text(`Custo Total de Manutenções (Geral): R$ ${totalMaintenanceCost.toFixed(2)}`, 14, finalY + 6);

      doc.save(`relatorio_equipamentos_${new Date().getTime()}.pdf`);
  };

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
            <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title="Gerar Relatório em PDF">
                    <FileText size={18} /> Relatório
                </button>
                <button className="btn btn-primary" onClick={() => openEquipModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> Adicionar Máquina
                </button>
            </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px', backgroundColor: 'var(--surface)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 250px', backgroundColor: 'var(--background)', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Search size={16} color="var(--text-muted)" />
                <input 
                    type="text" 
                    placeholder="Buscar por Nome, Marca ou Patrimônio..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', padding: '10px 0', color: 'var(--text-main)' }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px' }}>
                <Filter size={16} color="var(--text-muted)" />
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    style={{ flex: 1, border: '1px solid var(--border)', background: 'var(--background)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem', outline: 'none', color: 'var(--text-main)' }}
                >
                    <option value="">Todos os Status</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Manutenção">Em Manutenção</option>
                    <option value="Inativo">Inativo / Aposentado</option>
                </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px' }}>
                <Package size={16} color="var(--text-muted)" />
                <select 
                    value={groupFilter} 
                    onChange={(e) => setGroupFilter(e.target.value)} 
                    style={{ flex: 1, border: '1px solid var(--border)', background: 'var(--background)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem', outline: 'none', color: 'var(--text-main)' }}
                >
                    <option value="">Qualquer Grupo</option>
                    {existingGroups.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
            </div>
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
                            <th>Ativo / Identificação</th>
                            <th>Saúde & Histórico</th>
                            <th>Cálculo Depreciação / ROI</th>
                            <th>Custo Hora-Máq.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEquipments.map(eq => {
                            const monthsPassed = Math.floor((new Date() - new Date(eq.purchaseDate)) / (1000 * 60 * 60 * 24 * 30));
                            const deprecMonthly = (eq.purchasePrice || 0) / (eq.lifespanMonths || 1);
                            const currentValor = Math.max(0, (eq.purchasePrice || 0) - (deprecMonthly * Math.max(0,monthsPassed)));
                            
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
                            
                            const hourCost = (deprecMonthly / (eq.monthlyHours || 160)) + hrConsumableCost;
                            const maintTotal = (eq.maintenanceHistory || []).reduce((sum, h) => sum + (h.cost || 0), 0);
                            
                            let downtime = (eq.maintenanceHistory || []).reduce((sum, h) => sum + (parseFloat(h.downtimeHours) || 0), 0);
                            const totalExpectedHours = (Math.max(1, monthsPassed) * (eq.monthlyHours || 160));
                            const availability = Math.max(0, ((totalExpectedHours - downtime) / totalExpectedHours) * 100);

                            return (
                                <tr 
                                    key={eq.id} 
                                    onClick={() => { setViewingEquip(eq); setIsViewModalOpen(true); }}
                                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {eq.photoUrl ? (
                                                <img src={eq.photoUrl} alt="Equipamento" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                            ) : (
                                                <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Hammer size={24} color="#cbd5e1" />
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#334155', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {eq.status === 'Ativo' ? <Activity size={16} color="#10b981"/> : <AlertCircle size={16} color="#ef4444"/>}
                                                    {eq.name}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                                                    {eq.brand} {eq.model && `• ${eq.model}`} • Adquirido: {new Date(eq.purchaseDate).toLocaleDateString()}
                                                </div>
                                                {(eq.description || eq.patrimonyId) && (
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.7rem', flexWrap: 'wrap' }}>
                                                        {eq.patrimonyId && <span style={{ backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>Tag: {eq.patrimonyId}</span>}
                                                        {eq.description && <span style={{ color: '#94a3b8', fontStyle: 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eq.description}</span>}
                                                    </div>
                                                )}
                                            </div>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ backgroundColor: availability >= 90 ? '#10b981' : availability >= 70 ? '#f59e0b' : '#ef4444', height: '100%', width: `${availability}%` }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Disp. {availability.toFixed(0)}%</span>
                                            </div>
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
                                </tr>
                            );
                        })}
                        {filteredEquipments.length === 0 && (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhum equipamento cadastrado ou encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODAL: VIEW DETAILS */}
        {isViewModalOpen && viewingEquip && (
            <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', padding: 0, overflow: 'hidden' }}>
                    
                    {/* Header */}
                    <div style={{ padding: '24px 24px 20px 24px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            {viewingEquip.photoUrl ? (
                                <img src={viewingEquip.photoUrl} alt="Equip" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            ) : (
                                <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--surface-hover)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                    <Hammer size={32} color="var(--text-muted)" />
                                </div>
                            )}
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {viewingEquip.name}
                                    <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', backgroundColor: viewingEquip.status === 'Ativo' ? 'rgba(34, 197, 94, 0.2)' : viewingEquip.status === 'Manutenção' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: viewingEquip.status === 'Ativo' ? '#4ade80' : viewingEquip.status === 'Manutenção' ? '#facc15' : '#f87171', fontWeight: 600 }}>
                                        {viewingEquip.status}
                                    </span>
                                </h2>
                                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
                                    {viewingEquip.brand} {viewingEquip.model && `• ${viewingEquip.model}`}
                                </p>
                                {(viewingEquip.patrimonyId || viewingEquip.equipmentGroup) && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        {viewingEquip.equipmentGroup && <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'rgba(3, 105, 161, 0.1)', color: '#0ea5e9', borderRadius: '4px', border: '1px solid rgba(3, 105, 161, 0.2)' }}>Grupo: {viewingEquip.equipmentGroup}</span>}
                                        {viewingEquip.patrimonyId && <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: 'var(--surface-hover)', color: 'var(--text-muted)', borderRadius: '4px', border: '1px solid var(--border)' }}>Patrimônio: {viewingEquip.patrimonyId}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button className="btn btn-icon text-muted" onClick={() => setIsViewModalOpen(false)}>✕</button>
                    </div>

                    {/* Toolbar / Actions */}
                    <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <button className="btn" style={{ flex: 1, backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontWeight: 600, border: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }} onClick={() => { setIsViewModalOpen(false); openEquipModal(viewingEquip); }}>
                            <Edit2 size={16} /> Editar Informações
                        </button>
                        <button className="btn" style={{ flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap' }} onClick={() => { setIsViewModalOpen(false); setLinkedEntityId(viewingEquip.id); setLinkedEntityName(viewingEquip.name); }}>
                            <DollarSign size={16} /> Financeiro Vinculado
                        </button>
                        <button className="btn" style={{ flex: 1, backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', fontWeight: 600, border: '1px solid rgba(124, 58, 237, 0.2)', display: 'flex', justifyContent: 'center' }} onClick={() => { setIsViewModalOpen(false); openConsumablesModal(viewingEquip); }}>
                            <Package size={16} /> Insumos & Refis
                        </button>
                        <button className="btn" style={{ flex: 1, backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#f87171', fontWeight: 600, border: '1px solid rgba(220, 38, 38, 0.2)', display: 'flex', justifyContent: 'center' }} onClick={() => { setIsViewModalOpen(false); openMaintenanceModal(viewingEquip); }}>
                            <Wrench size={16} /> Add Manutenção
                        </button>
                        <button className="btn btn-icon" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)' }} title="Gerar QR / Patrimônio" onClick={() => { setIsViewModalOpen(false); setQrCodeEquip(viewingEquip); }}>
                            <QrCode size={18} />
                        </button>
                        <button className="btn btn-icon" style={{ backgroundColor: 'rgba(225, 29, 72, 0.1)', color: '#fb7185' }} title="Excluir Equipamento" onClick={() => handleDeleteEquipment(viewingEquip.id, viewingEquip.name)}>
                            <Trash2 size={18} />
                        </button>
                    </div>

                    {/* Content Details */}
                    <div style={{ padding: '24px', maxHeight: '50vh', overflowY: 'auto', backgroundColor: 'var(--surface)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
                            {/* Panel 1: Info e Histórico Saudável */}
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>Estatísticas e Custos</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div style={{ backgroundColor: 'var(--background)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Investimento Inicial</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>R$ {(viewingEquip.purchasePrice || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                        </div>
                                        <Calendar size={24} color="var(--text-muted)" />
                                    </div>

                                    {(() => {
                                        const monthsPassed = Math.floor((new Date() - new Date(viewingEquip.purchaseDate)) / (1000 * 60 * 60 * 24 * 30));
                                        const deprecMonthly = (viewingEquip.purchasePrice || 0) / (viewingEquip.lifespanMonths || 1);
                                        const currentValor = Math.max(0, (viewingEquip.purchasePrice || 0) - (deprecMonthly * Math.max(0, monthsPassed)));
                                        const maintTotal = (viewingEquip.maintenanceHistory || []).reduce((sum, h) => sum + (h.cost || 0), 0);
                                        let downtime = (viewingEquip.maintenanceHistory || []).reduce((sum, h) => sum + (parseFloat(h.downtimeHours) || 0), 0);
                                        const totalExpectedHours = (Math.max(1, monthsPassed) * (viewingEquip.monthlyHours || 160));
                                        const availability = Math.max(0, ((totalExpectedHours - downtime) / totalExpectedHours) * 100);

                                        let hrConsumableCost = 0;
                                        if (viewingEquip.consumables && viewingEquip.consumables.length > 0) {
                                            hrConsumableCost = viewingEquip.consumables.reduce((sum, c) => {
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
                                        const hourCost = (deprecMonthly / (viewingEquip.monthlyHours || 160)) + hrConsumableCost;

                                        return (
                                            <>
                                                <div style={{ backgroundColor: 'var(--background)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Valor Atual do Bem (Depreciado)</div>
                                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>R$ {currentValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                                    </div>
                                                    <DollarSign size={24} color="#38bdf8" />
                                                </div>

                                                <div style={{ backgroundColor: availability >= 90 ? 'rgba(34, 197, 94, 0.1)' : availability >= 70 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', border: `1px solid ${availability >= 90 ? 'rgba(34, 197, 94, 0.2)' : availability >= 70 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: availability >= 90 ? '#4ade80' : availability >= 70 ? '#facc15' : '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>Disponibilidade & OEE</div>
                                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: availability >= 90 ? '#22c55e' : availability >= 70 ? '#eab308' : '#ef4444' }}>{availability.toFixed(1)}% ({downtime}h Paradas)</div>
                                                    </div>
                                                    <Activity size={24} color={availability >= 90 ? '#22c55e' : availability >= 70 ? '#eab308' : '#ef4444'} />
                                                </div>

                                                <div style={{ backgroundColor: 'var(--surface-hover)', padding: '16px', borderRadius: '8px', border: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Custo Sugerido da Hora-Máquina</div>
                                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>R$ {hourCost.toFixed(2)} <span style={{fontSize: '0.8rem', fontWeight: 400}}>/hora</span></div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Panel 2: Insumos e Log */}
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>Log e Estrutura</h3>
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    <div style={{ backgroundColor: 'var(--background)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Insumos Cadastrados</div>
                                        {viewingEquip.consumables && viewingEquip.consumables.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {viewingEquip.consumables.map(c => (
                                                    <span key={c.id} style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                                        {c.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum insumo dinâmico.</span>
                                        )}
                                    </div>
                                    <div style={{ backgroundColor: 'var(--background)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Manutenções: R$ {((viewingEquip.maintenanceHistory || []).reduce((sum, h) => sum + (h.cost || 0), 0)).toFixed(2)}</div>
                                        {viewingEquip.maintenanceHistory && viewingEquip.maintenanceHistory.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                                {viewingEquip.maintenanceHistory.slice().reverse().map(h => (
                                                    <div key={h.id} style={{ fontSize: '0.8rem', padding: '8px', backgroundColor: 'var(--surface)', borderRadius: '4px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <strong style={{ color: 'var(--text-main)' }}>{new Date(h.date + 'T12:00:00').toLocaleDateString()}</strong>
                                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>R$ {h.cost.toFixed(2)}</span>
                                                        </div>
                                                        <div style={{ color: 'var(--text-muted)' }}>{h.description}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ativo Saudável (Sem log de reparos).</span>
                                        )}
                                    </div>
                                    {viewingEquip.description && (
                                        <div style={{ backgroundColor: 'var(--background)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Anotações</div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{viewingEquip.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: EQUIPAMENTO CRUD */}
        {isEquipModalOpen && (
            <div className="modal-overlay" onClick={() => setIsEquipModalOpen(false)}>
                <div className="modal-content flex flex-col" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', padding: 0, overflow: 'hidden', maxHeight: '92vh' }}>
                    <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{editingEquip ? 'Editar Equipamento' : 'Novo Ativo/Máquina'}</h2>
                        </div>
                        <button className="btn btn-icon text-muted" onClick={() => setIsEquipModalOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleSaveEquipment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px', overflowY: 'auto' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Nome do Equipamento (Ex: Plotter Cameo 4, Impressora L1800)</label>
                                <input type="text" className="form-input" required value={equipForm.name} onChange={e => setEquipForm({...equipForm, name: e.target.value})} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="text-orange-600 font-semibold">Grupo ou Tag (Ex: Impressão, Recorte, Máquinas Grandes)</label>
                                <input type="text" list="equip-groups-list" className="form-input border-orange-200 focus:border-orange-500 focus:ring-orange-500" value={equipForm.equipmentGroup} onChange={e => setEquipForm({...equipForm, equipmentGroup: e.target.value})} />
                                <datalist id="equip-groups-list">
                                    {existingGroups.map(g => <option key={g} value={g} />)}
                                </datalist>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Usado para associar e pesquisar esta máquina mais facilmente.</span>
                            </div>
                            <div className="form-group">
                                <label>Marca / Fabricante</label>
                                <input type="text" className="form-input" value={equipForm.brand} onChange={e => setEquipForm({...equipForm, brand: e.target.value})} />
                            </div>

                            <div className="form-group">
                                <label>Modelo</label>
                                <input type="text" className="form-input" value={equipForm.model} onChange={e => setEquipForm({...equipForm, model: e.target.value})} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Descrição Adicional (Detalhes, Cor, etc)</label>
                                <textarea className="form-input" value={equipForm.description} onChange={e => setEquipForm({...equipForm, description: e.target.value})} rows="2" />
                            </div>
                            <div className="form-group">
                                <label>Nº Patrimonial / Tag</label>
                                <input type="text" className="form-input" placeholder="Gerado auto se vazio" value={equipForm.patrimonyId} onChange={e => setEquipForm({...equipForm, patrimonyId: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select className="form-input" value={equipForm.status} onChange={e => setEquipForm({...equipForm, status: e.target.value})}>
                                    <option value="Ativo">🟢 Ativo (Operante)</option>
                                    <option value="Manutenção">⚠️ Em Manutenção</option>
                                    <option value="Inativo">🔴 Inativo / Aposentado</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>URL da Foto do Equipamento</label>
                                <input type="url" className="form-input" placeholder="https://..." value={equipForm.photoUrl} onChange={e => setEquipForm({...equipForm, photoUrl: e.target.value})} />
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

                        {!editingEquip && (
                            <div style={{ padding: '16px 24px', backgroundColor: '#eff6ff', borderTop: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>
                                    <input type="checkbox" style={{ transform: 'scale(1.2)' }} checked={equipForm.launchFinance} onChange={e => setEquipForm({...equipForm, launchFinance: e.target.checked})} />
                                    Lançar Pagamento da Compra no Financeiro (Despesa / Debitar de Conta)
                                </label>
                                {equipForm.launchFinance && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px', paddingLeft: '24px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ color: '#1e3a8a', fontSize: '0.8rem' }}>Conta/Caixa Relacionado *</label>
                                            <select className="form-input" style={{ borderColor: '#93c5fd' }} required value={equipForm.accountId} onChange={e => setEquipForm({...equipForm, accountId: e.target.value})}>
                                                <option value="">Selecione a Origem dos Recursos...</option>
                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (Saldo: R$ {parseFloat(acc.balance).toFixed(2)})</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ color: '#1e3a8a', fontSize: '0.8rem' }}>Meio de Pagamento *</label>
                                            <select className="form-input" style={{ borderColor: '#93c5fd' }} required value={equipForm.paymentMethod} onChange={e => setEquipForm({...equipForm, paymentMethod: e.target.value, installments: 1})}>
                                                <option value="pix">PIX</option>
                                                <option value="credit">Cartão de Crédito</option>
                                                <option value="debit">Cartão de Débito</option>
                                                <option value="boleto">Boleto Bancário</option>
                                                <option value="transfer">Transferência Bancária</option>
                                            </select>
                                        </div>
                                        {(equipForm.paymentMethod === 'credit' || equipForm.paymentMethod === 'boleto') && (
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ color: '#1e3a8a', fontSize: '0.8rem' }}>Parcelamento</label>
                                                <select className="form-input" style={{ borderColor: '#93c5fd' }} value={equipForm.installments || 1} onChange={e => setEquipForm({...equipForm, installments: parseInt(e.target.value)})}>
                                                    {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36].map(n => <option key={n} value={n}>{n}x</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsEquipModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Salvar Equipamento</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL: MANUTENÇÃO */}
        {isMaintenanceModalOpen && activeEquipForMaintenance && (
            <div className="modal-overlay" onClick={() => setIsMaintenanceModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                    <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Registro de Manutenção</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Equipamento: <strong>{activeEquipForMaintenance.name}</strong></p>
                        </div>
                        <button className="btn btn-icon text-muted" onClick={() => setIsMaintenanceModalOpen(false)}>✕</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Histórico Existente</h4>
                            {(!activeEquipForMaintenance.maintenanceHistory || activeEquipForMaintenance.maintenanceHistory.length === 0) ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', backgroundColor: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>Nenhuma manutenção registrada anteriormente.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {activeEquipForMaintenance.maintenanceHistory.slice().reverse().map(req => (
                                        <div key={req.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600, color: '#334155' }}>{new Date(req.date + 'T12:00:00').toLocaleDateString()}</span>
                                                <span style={{ color: '#ef4444', fontWeight: 700, backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: '4px' }}>R$ {(req.cost || 0).toFixed(2)}</span>
                                            </div>
                                            <div style={{ color: '#475569', lineHeight: '1.4' }}>{req.description}</div>
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                                                {req.technician && <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><span>👨‍🔧 Técnico/Local:</span> {req.technician}</div>}
                                                {req.downtimeHours > 0 && <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Parada: {req.downtimeHours}h</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSaveMaintenance} style={{ padding: '24px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Adicionar Novo Registro</h4>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Data da Manutenção / Serviço</label>
                                    <input type="date" className="form-input" required value={maintForm.date} onChange={e => setMaintForm({...maintForm, date: e.target.value})} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Descrição do Problema ou Serviço Executado</label>
                                    <input type="text" className="form-input" placeholder="Ex: Troca do Rolete Tração, Limpeza Geral..." required value={maintForm.description} onChange={e => setMaintForm({...maintForm, description: e.target.value})} />
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Custo Total (R$)</label>
                                        <input type="number" step="0.01" min="0" className="form-input" required value={maintForm.cost} onChange={e => setMaintForm({...maintForm, cost: e.target.value})} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b', marginBottom: '6px', display: 'block' }}>Tempo de Parada Estimado (H)</label>
                                        <input type="number" step="any" className="form-input border-amber-200" placeholder="Ex: 5" value={maintForm.downtimeHours} onChange={e => setMaintForm({...maintForm, downtimeHours: e.target.value})} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Técnico / Fornecedor (Opcional)</label>
                                        <input type="text" className="form-input" placeholder="Ex: Assistência Epson" value={maintForm.technician} onChange={e => setMaintForm({...maintForm, technician: e.target.value})} />
                                    </div>
                                </div>

                                <div style={{ marginTop: '8px', padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, color: '#991b1b', fontSize: '0.9rem' }}>
                                        <input type="checkbox" style={{ transform: 'scale(1.2)' }} checked={maintForm.launchFinance} onChange={e => setMaintForm({...maintForm, launchFinance: e.target.checked})} />
                                        Lançar Despesa de Manutenção no Financeiro
                                    </label>
                                    {maintForm.launchFinance && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px', paddingLeft: '24px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ color: '#991b1b', fontSize: '0.8rem' }}>Conta/Caixa Onde Houve Pagamento *</label>
                                                <select className="form-input" style={{ borderColor: '#fca5a5' }} required={maintForm.launchFinance} value={maintForm.accountId} onChange={e => setMaintForm({...maintForm, accountId: e.target.value})}>
                                                    <option value="">Selecione o Caixa...</option>
                                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (Saldo: R$ {parseFloat(acc.balance).toFixed(2)})</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ color: '#991b1b', fontSize: '0.8rem' }}>Meio de Pagamento *</label>
                                                <select className="form-input" style={{ borderColor: '#fca5a5' }} required={maintForm.launchFinance} value={maintForm.paymentMethod} onChange={e => setMaintForm({...maintForm, paymentMethod: e.target.value, installments: 1})}>
                                                    <option value="pix">PIX</option>
                                                    <option value="credit">Cartão de Crédito</option>
                                                    <option value="debit">Cartão de Débito</option>
                                                    <option value="boleto">Boleto / A Prazo</option>
                                                </select>
                                            </div>
                                            {(maintForm.paymentMethod === 'credit' || maintForm.paymentMethod === 'boleto') && (
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ color: '#991b1b', fontSize: '0.8rem' }}>Parcelamento</label>
                                                    <select className="form-input" style={{ borderColor: '#fca5a5' }} value={maintForm.installments || 1} onChange={e => setMaintForm({...maintForm, installments: parseInt(e.target.value)})}>
                                                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>

                            <div className="modal-footer" style={{ marginTop: '24px', padding: 0, border: 'none' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsMaintenanceModalOpen(false)}>Voltar</button>
                                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Registrar Gasto</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}
        {/* MODAL: INSUMOS E ACESSÓRIOS */}
        {isConsumablesModalOpen && activeEquipForConsumable && (
            <div className="modal-overlay" onClick={() => setIsConsumablesModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                    <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={22} color="#8b5cf6" /> Insumos &amp; Rendimentos</h2>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Gerencie refis associados à: <strong>{activeEquipForConsumable.name}</strong></p>
                        </div>
                        <button className="btn btn-icon text-muted" onClick={() => setIsConsumablesModalOpen(false)}>✕</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Insumos Vinculados</h4>
                            {(!activeEquipForConsumable.consumables || activeEquipForConsumable.consumables.length === 0) ? (
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', backgroundColor: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>Nenhum insumo (Ex: Toner, Tinta, Lâmina) vinculado.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {activeEquipForConsumable.consumables.map(cons => {
                                        let costDisplay = '';
                                        let yieldDisplay = '';
                                        if (cons.inventoryId) {
                                            costDisplay = `Uso: ${cons.usedQuantity} ${cons.usedUnit} por ${cons.actionName || 'ação'}`;
                                            yieldDisplay = `Rendimento Parametrizado`;
                                        } else {
                                            costDisplay = `Preço do Refil: R$ ${cons.cost?.toFixed(2)}`;
                                            yieldDisplay = `Rendimento: ${cons.yield} ${cons.yieldUnit}`;
                                        }
                                        return (
                                        <div key={cons.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.01)', display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.5fr) auto', gap: '16px', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#334155' }}>{cons.name} {cons.inventoryId ? <span className="badge badge-success ml-1" style={{fontSize: '9px'}}>Vinculado</span> : ''}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}><strong>{costDisplay}</strong></div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{yieldDisplay}</span>
                                            </div>
                                            <div>
                                                <button className="btn btn-icon text-danger" onClick={() => handleDeleteConsumable(cons.id)} title="Remover Insumo">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSaveConsumable} style={{ padding: '24px' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Adicionar Insumo ou Acessório</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Vincular Insumo Dinâmico (Estoque)</label>
                                    <select 
                                        className="form-input border-blue-200 focus:ring-blue-500" 
                                        value={consForm.inventoryId} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val) {
                                                const m = materialsList.find(x => x.id === val);
                                                setConsForm({...consForm, inventoryId: val, name: m?.name || '', usedUnit: m?.unit || 'un'});
                                            } else {
                                                setConsForm({...consForm, inventoryId: '', name: ''});
                                            }
                                        }}
                                    >
                                        <option value="">Nenhum (Cadastrar Avulso)</option>
                                        {materialsList.map(m => <option key={m.id} value={m.id}>{m.name} (R${m.cost}/{m.unit})</option>)}
                                    </select>
                                </div>
                                {!consForm.inventoryId ? (
                                    <>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Nome do Insumo (Avulso)</label>
                                            <input type="text" className="form-input" required={!consForm.inventoryId} value={consForm.name} onChange={e => setConsForm({...consForm, name: e.target.value})} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Custo Médio (R$)</label>
                                                <input type="number" step="0.01" min="0" className="form-input" required={!consForm.inventoryId} value={consForm.cost} onChange={e => setConsForm({...consForm, cost: e.target.value})} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Rendimento Estimado</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input type="number" className="form-input" style={{ flex: 2 }} required={!consForm.inventoryId} value={consForm.yield} onChange={e => setConsForm({...consForm, yield: e.target.value})} />
                                                    <select className="form-input" style={{ flex: 1, padding: '0 8px' }} value={consForm.yieldUnit} onChange={e => setConsForm({...consForm, yieldUnit: e.target.value})}>
                                                        <option value="páginas">Pág</option>
                                                        <option value="cortes">Cortes</option>
                                                        <option value="unidades">Unid</option>
                                                        <option value="dias">Dias</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1', marginBottom: '6px', display: 'block' }}>Media Consumida por Ação</label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input type="number" step="any" className="form-input" required value={consForm.usedQuantity} onChange={e => setConsForm({...consForm, usedQuantity: e.target.value})} placeholder="Ex: 0.02" />
                                                    <select className="form-input" style={{ flex: 1, padding: '0 8px' }} value={consForm.usedUnit} onChange={e => setConsForm({...consForm, usedUnit: e.target.value})}>
                                                        {getSubUnits(materialsList.find(m => m.id === consForm.inventoryId)?.unit).map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1', marginBottom: '6px', display: 'block' }}>Refere-se a que Ação?</label>
                                                <input type="text" className="form-input" required value={consForm.actionName} onChange={e => setConsForm({...consForm, actionName: e.target.value})} placeholder="Ex: página colorida, corte..." />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1', marginBottom: '6px', display: 'block' }}>Volume: Quantas ações dessa esta máquina faz por HORA?</label>
                                            <input type="number" className="form-input" required value={consForm.actionsPerHour} onChange={e => setConsForm({...consForm, actionsPerHour: e.target.value})} placeholder="Ex: 600 impressões/h" />
                                            <span style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '4px', display: 'block' }}>Isso diluirá o custo da tinta no custo de hora-máquina.</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer" style={{ marginTop: '24px', padding: 0, border: 'none' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsConsumablesModalOpen(false)}>Concluir</button>
                                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}><Plus size={16} /> Adicionar Refil</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: QR CODE E PATRIMÔNIO */}
        {qrCodeEquip && (
             <div className="modal-overlay" onClick={() => setQrCodeEquip(null)}>
                <style>
                {`
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    #printable-tag, #printable-tag * {
                      visibility: visible;
                    }
                    #printable-tag {
                      position: absolute;
                      left: 0;
                      top: 0;
                      margin: 0 !important;
                      padding: 16px !important;
                      border: 2px solid #000 !important;
                      border-radius: 8px !important;
                      width: 380px !important;
                      box-shadow: none !important;
                    }
                    /* Esconder rolagens e background do modal */
                    .modal-overlay {
                      background: transparent !important;
                      overflow: visible !important;
                    }
                  }
                `}
                </style>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', textAlign: 'center', padding: '32px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Etiqueta de Patrimônio</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
                        Visualize como ficará a impressão. Recomenda-se uso de papel adesivo.
                    </p>
                    
                    {/* ETIQUETA VISÍVEL E IMPRIMÍVEL */}
                    <div id="printable-tag" style={{ 
                        backgroundColor: '#ffffff', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        border: '2px dashed #cbd5e1', 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '20px',
                        margin: '0 auto',
                        maxWidth: '380px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}>
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/equipments?maintenance_id=${qrCodeEquip.id}`)}`} 
                            alt={`QR Code`}
                            style={{ width: '90px', height: '90px', objectFit: 'contain' }}
                        />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 800, 
                                textTransform: 'uppercase', 
                                color: '#0f172a', 
                                borderBottom: '2px solid #e2e8f0', 
                                paddingBottom: '6px', 
                                marginBottom: '10px',
                                letterSpacing: '0.5px'
                            }}>
                                Gestão de Ativos
                            </div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                {qrCodeEquip.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                                <strong>Mod:</strong> {qrCodeEquip.model || 'N/D'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                                <strong>Data:</strong> {new Date(qrCodeEquip.purchaseDate).toLocaleDateString()}
                            </div>
                            <div style={{ 
                                marginTop: '10px', 
                                fontSize: '1.1rem', 
                                fontWeight: 900, 
                                fontFamily: 'monospace', 
                                color: '#000',
                                backgroundColor: '#f8fafc',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                border: '1px solid #e2e8f0'
                            }}>
                                ID: {qrCodeEquip.patrimonyId || qrCodeEquip.id?.substring(0,8).toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => setQrCodeEquip(null)}>Cancelar</button>
                        <button className="btn btn-primary" style={{ backgroundColor: '#0f172a', borderColor: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => window.print()}>
                            Imprimir Etiqueta
                        </button>
                    </div>
                </div>
             </div>
        )}

        <LinkedTransactionsModal 
            isOpen={!!linkedEntityId}
            onClose={() => setLinkedEntityId(null)}
            entityId={linkedEntityId}
            entityName={linkedEntityName}
            entityType="Equipment"
        />
    </div>
  );
}
