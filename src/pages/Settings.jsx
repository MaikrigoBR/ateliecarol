
import React, { useState, useEffect } from 'react';
import { Save, User, Globe, Users, Tags, Plus, Trash2, Edit2, Activity, Clock, Landmark, Wallet, CreditCard, X, FileText } from 'lucide-react';
import db from '../services/database.js';
import AuditService from '../services/AuditService.js';

/* --- SUB-COMPONENTS --- */

function ProfileSettings({ user, setUser, onSave }) {
    return (
        <div className="card animate-fade-in">
             <div className="card-header">
                <h3 className="card-title flex items-center gap-sm"><User size={20} /> Perfil do Usuário</h3>
             </div>
             <form onSubmit={onSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--primary)', marginBottom: '8px' }}>
                            {user.avatar || 'US'}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label className="form-label">Nome Completo</label>
                            <input type="text" className="form-input" value={user.name} onChange={e => setUser({...user, name: e.target.value})} />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Cargo / Função</label>
                            <input type="text" className="form-input" value={user.role} onChange={e => setUser({...user, role: e.target.value})} />
                        </div>
                         <div className="input-group">
                            <label className="form-label">Iniciais Avatar</label>
                            <input type="text" className="form-input" maxLength="2" value={user.avatar} onChange={e => setUser({...user, avatar: e.target.value})} />
                        </div>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t flex justify-end">
                    <button type="submit" className="btn btn-primary"><Save size={16} /> Salvar Alterações</button>
                </div>
             </form>
        </div>
    );
}

function RolesSettings() {
    const [roles, setRoles] = useState([]);
    const [newRole, setNewRole] = useState({ name: '', baseSalary: '' });

    useEffect(() => { loadRoles(); }, []);
    
    const loadRoles = async () => {
        try {
            const data = await db.getAll('roles');
            setRoles(Array.isArray(data) ? data : []);
        } catch(e) { console.error(e); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newRole.name) return;
        
        // Check if role already exists
        const exists = roles.find(r => r.name.toLowerCase() === newRole.name.toLowerCase());
        if (exists) {
            alert('Cargo já existe!');
            return;
        }

        await db.create('roles', { 
            name: newRole.name, 
            baseSalary: parseFloat(newRole.baseSalary) || 0 
        });
        setNewRole({ name: '', baseSalary: '' });
        loadRoles();
    };

    const handleDelete = async (id) => {
        if(window.confirm('Excluir este cargo?')) {
            await db.delete('roles', id);
            loadRoles();
        }
    };

    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <div>
                    <h3 className="card-title flex items-center gap-sm"><Users size={20} /> Cargos & Salários Base</h3>
                    <p className="text-muted text-sm">Defina os cargos padrão e salários sugeridos para padronização.</p>
                </div>
            </div>
            
            <form onSubmit={handleAdd} className="flex gap-2 items-end mb-6 p-4 bg-surface-hover rounded-md">
                <div className="flex-1">
                    <label className="form-label text-xs">Nome do Cargo</label>
                    <input className="form-input" placeholder="Ex: Designer Pleno" value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} required />
                </div>
                <div className="w-32">
                    <label className="form-label text-xs">Salário Base (R$)</label>
                    <input type="number" step="0.01" className="form-input" placeholder="0.00" value={newRole.baseSalary} onChange={e => setNewRole({...newRole, baseSalary: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={16} /></button>
            </form>

            <div className="table-container">
                <table className="table">
                    <thead><tr><th>Cargo</th><th>Salário Base (Sugerido)</th><th>Ações</th></tr></thead>
                    <tbody>
                        {roles.map(r => (
                            <tr key={r.id}>
                                <td>{r.name}</td>
                                <td>R$ {r.baseSalary?.toFixed(2)}</td>
                                <td><button onClick={() => handleDelete(r.id)} className="text-danger p-1"><Trash2 size={16} /></button></td>
                            </tr>
                        ))}
                        {roles.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Nenhum cargo definido.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CategoriesSettings() {
    const [categories, setCategories] = useState([]);
    const [newName, setNewName] = useState('');

    useEffect(() => { loadCats(); }, []);

    const loadCats = async () => {
        try {
            const data = await db.getAll('categories');
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName) return;
        await db.create('categories', { name: newName });
        setNewName('');
        loadCats();
    };

    const handleDelete = async (id) => {
        if(window.confirm('Excluir categoria?')) {
            await db.delete('categories', id);
            loadCats();
        }
    };

    return (
        <div className="card animate-fade-in">
             <div className="card-header">
                <div>
                     <h3 className="card-title flex items-center gap-sm"><Tags size={20} /> Categorias de Produtos</h3>
                     <p className="text-muted text-sm">Padronize as categorias para relatórios mais precisos.</p>
                </div>
            </div>
             <form onSubmit={handleAdd} className="flex gap-2 items-end mb-6 p-4 bg-surface-hover rounded-md">
                <div className="flex-1">
                    <label className="form-label text-xs">Nova Categoria</label>
                    <input className="form-input" placeholder="Ex: Cadernos, Canetas..." value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={16} /></button>
            </form>
            <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                    <div key={c.id} className="badge badge-neutral flex gap-2 items-center text-sm py-2 px-3">
                        {c.name}
                        <button onClick={() => handleDelete(c.id)} className="text-danger ml-2"><Trash2 size={14} /></button>
                    </div>
                ))}
                 {categories.length === 0 && <span className="text-muted text-sm">Nenhuma categoria definida.</span>}
            </div>
        </div>
    );
}

function AuditLogViewer() {
    const [logs, setLogs] = useState([]);
    
    useEffect(() => {
        const fetchLogs = async () => {
            const data = await AuditService.getLogs();
            setLogs(data);
        };
        fetchLogs();
    }, []);

    return (
        <div className="card animate-fade-in">
             <div className="card-header">
                <h3 className="card-title flex items-center gap-sm"><Activity size={20} /> Histórico de Alterações</h3>
                <p className="text-muted text-sm">Registro de atividades e modificações no sistema.</p>
             </div>
             <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                 <table className="table">
                     <thead>
                         <tr>
                             <th>Data/Hora</th>
                             <th>Usuário</th>
                             <th>Ação</th>
                             <th>Entidade</th>
                             <th>Detalhes</th>
                         </tr>
                     </thead>
                     <tbody>
                         {logs.map((log, idx) => (
                             <tr key={idx} className="text-sm">
                                 <td style={{ whiteSpace: 'nowrap' }}>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} className="text-muted" />
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                 </td>
                                 <td><span className="font-medium text-xs bg-surface p-1 rounded">{log.user}</span></td>
                                 <td>
                                     <span className={`badge ${
                                         log.action === 'CREATE' ? 'badge-success' : 
                                         log.action === 'UPDATE' ? 'badge-warning' : 
                                         log.action === 'DELETE' ? 'badge-danger' : 'badge-neutral'
                                     }`}>
                                         {log.action}
                                     </span>
                                 </td>
                                 <td>{log.entity} #{log.entityId}</td>
                                 <td className="text-muted truncate max-w-xs" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</td>
                             </tr>
                         ))}
                         {logs.length === 0 && <tr><td colSpan="5" className="text-center text-muted p-4">Nenhum registro de atividade encontrado.</td></tr>}
                     </tbody>
                 </table>
             </div>
        </div>
    );
}



function AccountsSettings() {
    const [accounts, setAccounts] = useState([]);
    const [formData, setFormData] = useState({ 
        name: '', 
        type: 'bank', 
        balance: '', 
        limit: '', // Added limit
        currency: 'BRL' 
    });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => { loadAccounts(); }, []);

    const loadAccounts = async () => {
        const data = await db.getAll('accounts');
        setAccounts(Array.isArray(data) ? data : []);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        const balanceValue = parseFloat(formData.balance) || 0;
        const limitValue = parseFloat(formData.limit) || 0;

        if (editingId) {
            // Update existing
            await db.update('accounts', editingId, {
                name: formData.name,
                type: formData.type,
                balance: balanceValue,
                limit: limitValue, // Added limit to update
                updatedAt: new Date().toISOString()
            });

            await AuditService.log({ name: 'Admin' }, 'UPDATE', 'Account', formData.name, `Conta atualizada. Novo saldo: R$ ${balanceValue.toFixed(2)}`);

        } else {
            // Create New
            await db.create('accounts', {
                name: formData.name,
                type: formData.type,
                balance: balanceValue,
                limit: limitValue, // Ensure limit is saved on create
                currency: 'BRL',
                updatedAt: new Date().toISOString()
            });

            await AuditService.log({ name: 'Admin' }, 'CREATE', 'Account', formData.name, `Conta criada com saldo inicial R$ ${balanceValue.toFixed(2)}`);
        }

        setFormData({ name: '', type: 'bank', balance: '', limit: '', currency: 'BRL' });
        setEditingId(null);
        loadAccounts();
    };

    const handleEdit = (acc) => {
        setEditingId(acc.id);
        setFormData({ 
            name: acc.name, 
            type: acc.type, 
            balance: acc.balance, 
            limit: acc.limit || '',
            currency: acc.currency 
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ name: '', type: 'bank', balance: '', limit: '', currency: 'BRL' });
    };

    const handleDelete = async (account) => {
        if (window.confirm(`Excluir conta ${account.name}?`)) {
            await db.delete('accounts', account.id);
            await AuditService.log({ name: 'Admin' }, 'DELETE', 'Account', account.name, `Conta removida via Configurações`);
            loadAccounts();
        }
    };

    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <div>
                    <h3 className="card-title flex items-center gap-2"><Landmark size={20} /> Contas Bancárias & Caixas</h3>
                    <p className="text-muted text-sm">Gerencie as contas por onde o dinheiro entra e sai do negócio.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-100 flex gap-4 items-end flex-wrap">
                 <div className="flex-1 min-w-[200px]">
                    <label className="form-label text-xs">Nome da Conta / Caixa</label>
                    <input 
                        className="form-input bg-white" 
                        placeholder="Ex: Banco do Brasil, Caixa Pequeno..."
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        required
                    />
                 </div>
                 <div className="w-[180px]">
                    <label className="form-label text-xs">Tipo</label>
                    <select 
                        className="form-input bg-white"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                        <option value="bank">Banco / Fintech</option>
                        <option value="cash">Caixa Físico</option>
                        <option value="wallet">Carteira Digital</option>
                        <option value="credit">Cartão de Crédito</option>
                    </select>
                 </div>
                 <div className="w-[150px]">
                    <label className="form-label text-xs">
                        {editingId ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}
                    </label>
                    <input 
                        type="number" step="0.01"
                        className="form-input bg-white"
                        value={formData.balance}
                        onChange={e => setFormData({...formData, balance: e.target.value})}
                        placeholder="0.00"
                    />
                 </div>
                 {formData.type === 'credit' && (
                     <div className="w-[150px]">
                        <label className="form-label text-xs">Limite (R$)</label>
                        <input 
                            type="number" step="0.01"
                            className="form-input bg-white"
                            value={formData.limit}
                            onChange={e => setFormData({...formData, limit: e.target.value})}
                            placeholder="Ex: 5000.00"
                        />
                     </div>
                 )}
                 <div className="flex gap-2 items-end pb-[1px]">
                    {editingId && (
                        <button type="button" onClick={handleCancel} className="btn btn-secondary h-[38px] flex items-center gap-2">
                            <X size={16} /> Cancelar
                        </button>
                    )}
                    <button type="submit" className={`btn h-[38px] flex items-center gap-2 ${editingId ? 'btn-primary' : 'btn-primary'}`}>
                        {editingId ? <><Save size={16} /> Salvar</> : <><Plus size={16} /> Adicionar</>}
                    </button>
                 </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-medium">
                            <th className="pb-2">Nome</th>
                            <th className="pb-2">Tipo</th>
                            <th className="pb-2">Saldo Atual</th>
                            <th className="pb-2 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {accounts.map(acc => (
                            <tr key={acc.id} className={`hover:bg-gray-50 ${editingId === acc.id ? 'bg-blue-50' : ''}`}>
                                <td className="py-3 font-medium text-gray-800">{acc.name}</td>
                                <td className="py-3 text-gray-600">
                                    {acc.type === 'bank' && <span className="flex items-center gap-1"><Landmark size={14}/> Banco</span>}
                                    {acc.type === 'cash' && <span className="flex items-center gap-1"><Wallet size={14}/> Caixa Físico</span>}
                                    {acc.type === 'wallet' && <span className="flex items-center gap-1"><Globe size={14}/> Digital</span>}
                                    {acc.type === 'credit' && <span className="flex items-center gap-1"><CreditCard size={14}/> Cartão</span>}
                                </td>
                                <td className={`py-3 font-mono font-bold ${acc.balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    R$ {acc.balance ? parseFloat(acc.balance).toFixed(2) : '0.00'}
                                </td>
                                <td className="py-3 text-right flex justify-end gap-1">
                                    <button onClick={() => handleEdit(acc)} className="text-gray-400 hover:text-blue-500 transition-colors p-1" title="Editar"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(acc)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Excluir"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {accounts.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-8">Nenhuma conta cadastrada. Adicione uma acima.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* --- MAIN COMPONENT --- */

function SystemSettings() {
    const [config, setConfig] = useState({
        companyName: '',
        document: '',
        currency: 'BRL',
        theme: 'light'
    });

    useEffect(() => {
        const saved = localStorage.getItem('stationery_config');
        if (saved) {
            setConfig(JSON.parse(saved));
        } else {
            setConfig({
                companyName: 'Estúdio Criativo',
                document: '',
                currency: 'BRL',
                theme: 'light'
            });
        }
    }, []);

    const fileInputRef = React.useRef(null);

    const handleSave = (e) => {
        e.preventDefault();
        localStorage.setItem('stationery_config', JSON.stringify(config));
        alert('Configurações do sistema salvas!');
        
        if (config.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        window.location.reload(); 
    };

    const handleExportData = async () => {
        if (!window.confirm('Deseja baixar um backup completo dos dados (JSON)?')) return;
        
        const backup = {
            timestamp: new Date().toISOString(),
            orders: await db.getAll('orders'),
            products: await db.getAll('products'),
            customers: await db.getAll('customers'),
            inventory: await db.getAll('inventory'),
            transactions: await db.getAll('transactions'),
            accounts: await db.getAll('accounts'),
            budgets: await db.getAll('budgets'),
            designs: await db.getAll('designs'),
            roles: await db.getAll('roles'),
            categories: await db.getAll('categories')
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `backup_stationery_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportClick = () => fileInputRef.current.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm("ATENÇÃO: Isso irá APAGAR os dados atuais e restaurar o backup. Essa ação é irreversível. Tem certeza?")) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const backup = JSON.parse(ev.target.result);
                if (!backup.timestamp) throw new Error("Arquivo inválido (sem timestamp)");
                
                const collections = ['orders', 'products', 'customers', 'inventory', 'transactions', 'accounts', 'budgets', 'designs', 'roles', 'categories'];
                
                alert("Iniciando restauração... Por favor aguarde.");

                for (const col of collections) {
                    if (backup[col] && Array.isArray(backup[col])) {
                        // 1. Delete all existing
                        const current = await db.getAll(col);
                        await Promise.all(current.map(d => db.delete(col, d.id)));

                        // 2. Restore
                        // Note: db.set handles creating with specific ID
                        await Promise.all(backup[col].map(d => db.set(col, d.id, d)));
                    }
                }
                
                alert("Restauração concluída! A página será recarregada.");
                window.location.reload();

            } catch (err) {
                alert("Erro ao restaurar: " + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <h3 className="card-title flex items-center gap-sm"><Globe size={20} /> Preferências do Sistema</h3>
                <p className="text-muted text-sm">Personalize a identidade da sua loja e opções gerais.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6 container p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 border-b pb-2">Identidade</h4>
                        <div className="input-group">
                            <label className="form-label">Nome da Empresa / Estúdio</label>
                            <input 
                                className="form-input" 
                                value={config.companyName}
                                onChange={e => setConfig({...config, companyName: e.target.value})}
                                placeholder="Ex: Meu Estúdio Criativo"
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">CNPJ / CPF</label>
                            <input 
                                className="form-input" 
                                value={config.document}
                                onChange={e => setConfig({...config, document: e.target.value})}
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-700 border-b pb-2">Aparência e Região</h4>
                        <div className="input-group">
                            <label className="form-label">Moeda Padrão</label>
                            <select 
                                className="form-input"
                                value={config.currency}
                                onChange={e => setConfig({...config, currency: e.target.value})}
                            >
                                <option value="BRL">Real Brasileiro (R$)</option>
                                <option value="USD">Dólar Americano ($)</option>
                                <option value="EUR">Euro (€)</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="form-label">Tema</label>
                            <select 
                                className="form-input"
                                value={config.theme}
                                onChange={e => setConfig({...config, theme: e.target.value})}
                            >
                                <option value="light">Claro (Padrão)</option>
                                <option value="dark">Escuro</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-between items-center mt-4">
                    <div className="flex gap-2">
                        <button type="button" onClick={handleExportData} className="btn btn-outline border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                            <Save size={16} /> Backup (JSON)
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept=".json" 
                            onChange={handleFileChange} 
                        />
                        <button type="button" onClick={handleImportClick} className="btn btn-outline border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                            <FileText size={16} /> Restaurar Backup
                        </button>
                    </div>
                    <button type="submit" className="btn btn-primary px-8">
                        Salvar Configurações
                    </button>
                </div>
            </form>
        </div>
    );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({ name: '', role: '', avatar: '' });

  useEffect(() => {
    const loadProfile = async () => {
        try {
             const localUser = localStorage.getItem('stationery_user');
             if (localUser) setUser(JSON.parse(localUser));
        } catch (e) { console.warn(e); }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem('stationery_user', JSON.stringify(user));
    alert('Perfil atualizado!');
    window.location.reload(); 
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px' }}>
      <h2 className="title mb-6">Configurações & Cadastros</h2>

      {/* TABS */}
      <div className="tabs">
        <button 
            className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
        >
            <User size={16} className="inline mr-2" /> Meu Perfil
        </button>
        <button 
            className={`tab-item ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
        >
            <Users size={16} className="inline mr-2" /> Cargos & Equipe
        </button>
        <button 
            className={`tab-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
        >
            <Tags size={16} className="inline mr-2" /> Categorias
        </button>
        <button 
            className={`tab-item ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
        >
            <Landmark size={16} className="inline mr-2" /> Contas & Caixas
        </button>
        <button 
            className={`tab-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
        >
            <Activity size={16} className="inline mr-2" /> Logs do Sistema
        </button>
         <button 
            className={`tab-item ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
        >
            <Globe size={16} className="inline mr-2" /> Sistema
        </button>
      </div>
      
      {/* CONTENT */}
      {activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} onSave={handleSaveProfile} />}
      {activeTab === 'roles' && <RolesSettings />}
      {activeTab === 'categories' && <CategoriesSettings />}
      {activeTab === 'accounts' && <AccountsSettings />}
      {activeTab === 'logs' && <AuditLogViewer />}
      {activeTab === 'system' && <SystemSettings />}

    </div>
  );
}

