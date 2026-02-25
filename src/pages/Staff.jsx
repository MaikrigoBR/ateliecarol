
import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Clock, DollarSign, Save, X } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_ROLES = [
    { id: '1', name: 'Gerente', baseSalary: 3500 },
    { id: '2', name: 'Designer', baseSalary: 2800 },
    { id: '3', name: 'Atendente', baseSalary: 1800 },
    { id: '4', name: 'Auxiliar de Produção', baseSalary: 1600 },
    { id: '5', name: 'Acabamento', baseSalary: 1500 },
    { id: '6', name: 'Entregador', baseSalary: 1500 },
];

export function Staff() {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    salary: '',
    hoursPerMonth: '160', 
    charges: '0' 
  });
  const [editingId, setEditingId] = useState(null);
  
  // New Role Logic
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        const staffData = await db.getAll('staff');
        setEmployees(Array.isArray(staffData) ? staffData : []);

        const rolesData = await db.getAll('roles');
        if (rolesData && rolesData.length > 0) {
            setRolesList(rolesData);
        } else {
            setRolesList(DEFAULT_ROLES); // Use defaults if empty
        }
    } catch (e) {
        console.error(e);
        setEmployees([]);
    }
  };

  const calculateHourlyRate = (salary, hours, chargesPercent) => {
      const sal = parseFloat(salary) || 0;
      const h = parseFloat(hours) || 1;
      const charges = parseFloat(chargesPercent) || 0;
      const totalCost = sal * (1 + charges / 100);
      return totalCost / h;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hourlyRate = calculateHourlyRate(formData.salary, formData.hoursPerMonth, formData.charges);
    
    const employeeData = {
        name: formData.name,
        role: formData.role,
        salary: parseFloat(formData.salary),
        hoursPerMonth: parseFloat(formData.hoursPerMonth),
        charges: parseFloat(formData.charges),
        hourlyRate: hourlyRate,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'Sistema'
    };

    if (editingId) {
        await db.update('staff', editingId, employeeData);
        AuditService.log(currentUser, 'UPDATE', 'Staff', editingId, `Atualizou funcionário: ${formData.name}, Cargo: ${formData.role}`);
    } else {
        const newId = await db.create('staff', { ...employeeData, createdAt: new Date().toISOString() });
        AuditService.log(currentUser, 'CREATE', 'Staff', newId.id || 'unknown', `Criou funcionário: ${formData.name}, Cargo: ${formData.role}`);
    }

    setFormData({ name: '', role: '', salary: '', hoursPerMonth: '160', charges: '0' });
    setEditingId(null);
    setIsModalOpen(false);
    fetchData();
  };

  const handleEdit = (emp) => {
      setFormData({
          name: emp.name,
          role: emp.role,
          salary: emp.salary,
          hoursPerMonth: emp.hoursPerMonth,
          charges: emp.charges || 0
      });
      setEditingId(emp.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
      if (window.confirm('Tem certeza? Isso pode afetar o cálculo de custos de produtos vinculados.')) {
          await db.delete('staff', id);
          AuditService.log(currentUser, 'DELETE', 'Staff', id, `Removeu funcionário: ${name}`);
          fetchData(); 
      }
  };

  const handleAddNewRole = async () => {
      if (!newRoleName) return;
      const newRole = { name: newRoleName, baseSalary: 0 };
      // Save to Roles collection if we wanted to persist roles separately
      // For now, just add to local list and select it
      const updatedRoles = [...rolesList, { id: Date.now().toString(), name: newRoleName, baseSalary: 0 }];
      setRolesList(updatedRoles);
      
      // Select it
      setFormData({ ...formData, role: newRoleName });
      setIsAddingRole(false);
      setNewRoleName('');
      
      // Optionally persist roles to DB here if 'roles' collection is used
      // await db.create('roles', newRole);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
            <h2 className="title">Gestão de Pessoal e Custos</h2>
            <p className="text-muted">Cadastre sua equipe para calcular o Custo de Mão de Obra (Homem-Hora).</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input 
                type="text" 
                placeholder="Buscar Nome..." 
                className="form-input" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
                className="form-input" 
                value={roleFilter} 
                onChange={e => setRoleFilter(e.target.value)}
                style={{ backgroundColor: 'var(--surface)' }}
            >
                <option value="">Cargo (Todos)</option>
                {rolesList.map(r => (
                    <option key={r.id || r.name} value={r.name}>{r.name}</option>
                ))}
            </select>
            <button className="btn btn-primary" onClick={() => {
                setFormData({ name: '', role: '', salary: '', hoursPerMonth: '160', charges: '0' });
                setEditingId(null);
                setIsModalOpen(false); // Reset first to avoid glitches
                setTimeout(() => setIsModalOpen(true), 10);
            }}>
              <Plus size={16} />
              Novo Colaborador
            </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Cargo / Função</th>
                        <th>Salário Base</th>
                        <th>Horas/Mês</th>
                        <th>Encargos</th>
                        <th>Custo Hora</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {employees
                        .filter(emp => {
                            const matchSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchRole = roleFilter === '' || emp.role === roleFilter;
                            return matchSearch && matchRole;
                        })
                        .map(emp => (
                        <tr key={emp.id}>
                            <td style={{ fontWeight: 500 }}>{emp.name}</td>
                            <td><span className="badge badge-neutral">{emp.role}</span></td>
                            <td>R$ {emp.salary?.toFixed(2)}</td>
                            <td>{emp.hoursPerMonth}h</td>
                            <td className="text-muted">{emp.charges}%</td>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                R$ {emp.hourlyRate?.toFixed(2)}
                            </td>
                            <td>
                                <div className="flex gap-sm">
                                    <button className="btn btn-icon" onClick={() => handleEdit(emp)} title="Editar"><Edit2 size={16}/></button>
                                    <button className="btn btn-icon text-danger" onClick={() => handleDelete(emp.id, emp.name)} title="Excluir"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {employees.length === 0 && (
                        <tr><td colSpan="7" className="text-center p-4 text-muted">Nenhum colaborador cadastrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
          <div className="modal-overlay">
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                      <h3 className="modal-title">{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                      <button className="btn btn-icon" onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSubmit}>
                      <div className="modal-body">
                          <div className="input-group">
                              <label className="form-label">Nome Completo</label>
                              <input className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: João Silva" />
                          </div>
                          
                          <div className="input-group">
                              <label className="form-label flex justify-between">
                                  Cargo / Função
                                  {!isAddingRole && (
                                    <button type="button" className="text-primary text-xs font-semibold hover:underline" onClick={() => setIsAddingRole(true)}>
                                        + Novo Cargo
                                    </button>
                                  )}
                              </label>
                              
                              {isAddingRole ? (
                                  <div className="flex gap-2">
                                      <input 
                                        className="form-input" 
                                        autoFocus 
                                        placeholder="Nome do novo cargo..." 
                                        value={newRoleName} 
                                        onChange={e => setNewRoleName(e.target.value)} 
                                      />
                                      <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNewRole}>Adicionar</button>
                                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddingRole(false)}>Cancelar</button>
                                  </div>
                              ) : (
                                  <select 
                                    className="form-input" 
                                    required 
                                    value={formData.role} 
                                    onChange={e => {
                                        const selectedRole = rolesList.find(r => r.name === e.target.value);
                                        setFormData({
                                            ...formData, 
                                            role: e.target.value,
                                            // Only update salary if editing a new entry or user wants dynamic salary updates (risky for edits). 
                                            // Let's only update salary if field is empty or strictly 0 to avoid overwriting custom salaries.
                                            salary: (formData.salary === '' || formData.salary === '0') && selectedRole ? selectedRole.baseSalary : formData.salary
                                        });
                                    }}
                                  >
                                      <option value="">Selecione um cargo...</option>
                                      {rolesList.map(r => (
                                          <option key={r.id || r.name} value={r.name}>{r.name}</option>
                                      ))}
                                  </select>
                              )}
                          </div>

                          <div className="grid grid-cols-2 gap-md">
                              <div className="input-group">
                                  <label className="form-label">Salário Base (R$)</label>
                                  <input type="number" step="0.01" className="form-input" required value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                              </div>
                              <div className="input-group">
                                  <label className="form-label">Horas / Mês</label>
                                  <input type="number" className="form-input" required value={formData.hoursPerMonth} onChange={e => setFormData({...formData, hoursPerMonth: e.target.value})} />
                              </div>
                          </div>
                          <div className="input-group">
                              <label className="form-label">Encargos / Adicionais (%)</label>
                              <input type="number" className="form-input" placeholder="0" value={formData.charges} onChange={e => setFormData({...formData, charges: e.target.value})} />
                              <small className="text-muted">Impostos, benefícios, férias, etc. (Ex: 30 para 30%)</small>
                          </div>
                          
                          <div className="p-4 bg-surface-hover rounded-md mt-4 flex justify-between items-center">
                              <span>Custo Hora Estimado:</span>
                              <span className="font-bold text-lg text-primary">
                                  R$ {calculateHourlyRate(formData.salary, formData.hoursPerMonth, formData.charges).toFixed(2)}
                              </span>
                          </div>
                      </div>
                      <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                          <button type="submit" className="btn btn-primary">
                              <Save size={16} />
                              {editingId ? 'Salvar Alterações' : 'Cadastrar'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

