
import React, { useState, useEffect } from 'react';
import { Plus, User, Trash2, Shield, AlertCircle, Save, X, Loader2 } from 'lucide-react';
import db from '../services/database';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '../services/firebase';

export function Users() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' // 'admin' or 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // We store user metadata in Firestore because Client SDK can't list all Auth users
    const userDocs = await db.getAll('users');
    setUsers(userDocs);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    let secondaryApp = null;

    try {
        // 1. Create Secondary Firebase App Instance to avoid logging out current user
        // This is a known trick to create users while logged in as admin
        secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        // 2. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const newUser = userCredential.user;

        // 3. Store User Data in Firestore (so we can list them later)
        await db.create('users', {
            uid: newUser.uid,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            createdAt: new Date().toISOString()
        });

        // 4. Logout the new user immediately from the secondary app
        await signOut(secondaryAuth);

        setSuccess(`Usuário ${formData.name} criado com sucesso!`);
        setIsModalOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'user' });
        fetchUsers();

    } catch (err) {
        console.error("Error creating user:", err);
        if (err.code === 'auth/email-already-in-use') {
             setError('Este e-mail já está cadastrado.');
        } else if (err.code === 'auth/weak-password') {
             setError('A senha deve ter pelo menos 6 caracteres.');
        } else {
             setError('Erro ao criar usuário: ' + err.message);
        }
    } finally {
        // 5. Cleanup secondary app
        if (secondaryApp) {
            await deleteApp(secondaryApp); 
        }
        setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
      // Limitation: Client SDK cannot delete other users from Auth.
      // We can only delete their data from Firestore.
      if (!window.confirm(`Tem certeza que deseja remover ${user.name} da lista? Note que o acesso dele só será revogado se você também deletar no Firebase Console.`)) {
          return;
      }

      await db.delete('users', user.id);
      fetchUsers();
      alert("Usuário removido da lista local. Para bloquear o acesso totalmente, remova também no Firebase Console -> Authentication.");
  };

  return (
    <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="title" style={{ margin: 0 }}>Gestão de Usuários</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                    type="text" 
                    placeholder="Buscar Nome ou E-mail..." 
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
                    <option value="">Permissão (Todas)</option>
                    <option value="admin">Administrador</option>
                    <option value="user">Colaborador</option>
                </select>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} />
                    Novo Usuário
                </button>
            </div>
        </div>

        {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
        {success && <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users
                .filter(u => {
                    const search = searchTerm.toLowerCase();
                    const matchSearch = u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
                    const matchRole = roleFilter === '' || u.role === roleFilter;
                    return matchSearch && matchRole;
                })
                .map(user => (
                <div key={user.id} className="card p-6 relative group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '50%', 
                            background: user.role === 'admin' ? 'var(--primary)' : 'var(--surface-hover)', 
                            color: user.role === 'admin' ? 'white' : 'var(--text-primary)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}>
                            {user.role === 'admin' ? <Shield size={24} /> : <User size={24} />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{user.name}</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.email}</p>
                        </div>
                    </div>

                    <div style={{ 
                        borderTop: '1px solid var(--border)', 
                        paddingTop: '1rem', 
                        fontSize: '0.85rem', 
                        color: 'var(--text-muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>Função: {user.role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
                        
                        {user.role !== 'admin' && (
                             <button 
                                className="btn btn-icon text-danger" 
                                title="Remover Usuário"
                                onClick={() => handleDeleteUser(user)}
                             >
                                <Trash2 size={18} />
                             </button>
                        )}
                    </div>
                </div>
            ))}

            {users.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted">
                    Nenhum usuário secundário cadastrado.
                </div>
            )}
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="modal-title">Novo Usuário</h2>
                        <button className="btn btn-icon" onClick={() => setIsModalOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleCreateUser}>
                        <div className="modal-body">
                             {error && (
                                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                    {error}
                                </div>
                            )}

                            <div className="input-group">
                                <label className="form-label">Nome Completo</label>
                                <input 
                                    type="text" 
                                    className="form-input"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="input-group">
                                <label className="form-label">E-mail de Acesso</label>
                                <input 
                                    type="email" 
                                    className="form-input"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Senha Temporária</label>
                                <input 
                                    type="password" 
                                    className="form-input"
                                    required
                                    minLength={6}
                                    placeholder="Mínimo 6 caracteres"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Permissão</label>
                                <select 
                                    className="form-input"
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="user">Colaborador (Padrão)</option>
                                    <option value="admin">Administrador (Total)</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <><Loader2 className="animate-spin" size={16} /> Criando...</> : <><Save size={16} /> Criar Acesso</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}
