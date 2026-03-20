import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, PackageOpen, LayoutDashboard, Search, LogOut, UserPlus, Lock, Instagram, ShieldCheck } from 'lucide-react';
import db from '../services/database';
import { useClientAuth } from '../contexts/ClientAuthContext';

export function ClientPortal() {
    const navigate = useNavigate();
    const { clientSession, loginClient, registerClient, updateClientPassword, logoutClient, isClientLoading } = useClientAuth();
    
    // View States: 'login', 'register', 'reset'
    const [authMode, setAuthMode] = useState('login');
    
    const [loginData, setLoginData] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [resetPass, setResetPass] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');
    
    const [regData, setRegData] = useState({ name: '', email: '', phone: '', document: '', instagram: '', password: '', confirmPassword: ''});
    
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [myOrders, setMyOrders] = useState([]);

    useEffect(() => {
        if (clientSession) {
            fetchMyOrders(clientSession.name);
        } else {
            setMyOrders([]);
        }
    }, [clientSession]);

    const fetchMyOrders = async (customerName) => {
        try {
            const allOrders = await db.getAll('orders') || [];
            const filtered = allOrders.filter(o => o.customer === customerName);
            filtered.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
            setMyOrders(filtered);
        } catch (e) {
            console.error("Erro ao buscar pedidos:", e);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            await loginClient(loginData, loginPass);
        } catch (e) {
            if (e.message === "RESET_REQUIRED") {
                setAuthMode('reset');
                setLoginPass('');
                setErrorMsg("Bem-vindo(a) de volta! Este é seu novo portal de cliente. Por favor, crie uma senha segura para seus acessos futuros.");
            } else {
                setErrorMsg(e.message || 'Erro interno ao buscar cliente. Verifique a digitação.');
            }
        }
        
        setIsLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        if (resetPass.length < 4) {
            setErrorMsg("Sua senha precisa ter no mínimo 4 caracteres.");
            setIsLoading(false);
            return;
        }
        if (resetPass !== resetConfirm) {
            setErrorMsg("As senhas não conferem. Tente novamente.");
            setIsLoading(false);
            return;
        }

        try {
            await updateClientPassword(loginData, resetPass);
        } catch (e) {
            setErrorMsg(e.message || 'Falha ao salvar a nova senha.');
        }

        setIsLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            if (regData.password.length < 4) {
                throw new Error("Sua senha precisa ter no mínimo 4 caracteres.");
            }
            if (regData.password !== regData.confirmPassword) {
                throw new Error("As senhas não conferem. Verifique a digitação!");
            }
            await registerClient(regData);
        } catch (e) {
            setErrorMsg(e.message || 'Falha ao registrar.');
        }

        setIsLoading(false);
    };

    const handleLogout = () => {
        logoutClient();
    };

    // UI: Loading State
    if (isClientLoading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>;
    }

    // UI: Authentication View
    if (!clientSession) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#faf5ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-primary)' }}>
                <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 12px -2px rgba(168,85,247,0.15)', maxWidth: '450px', width: '100%' }}>
                    
                    <div style={{ display: 'flex', justifySelf: 'center', width: '64px', height: '64px', backgroundColor: '#f3e8ff', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Lock size={32} color="#9333ea" />
                    </div>
                    
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4c1d95', marginBottom: '8px', textAlign: 'center' }}>Área do Cliente</h2>
                    <p style={{ color: '#6b21a8', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'center' }}>Faça login ou crie sua conta para acompanhar pedidos ou avaliar produtos.</p>
                    
                    {/* Tabs */}
                    <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderRadius: '12px', padding: '6px', marginBottom: '24px' }}>
                        <button 
                            type="button"
                            onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                            style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', backgroundColor: authMode === 'login' ? 'white' : 'transparent', color: authMode === 'login' ? '#7e22ce' : '#64748b', boxShadow: authMode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                        >
                            Já sou cliente
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                             style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', backgroundColor: authMode === 'register' ? 'white' : 'transparent', color: authMode === 'register' ? '#7e22ce' : '#64748b', boxShadow: authMode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                        >
                            Criar Cadastro
                        </button>
                    </div>

                    {errorMsg && (
                        <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={16} /> {errorMsg}
                        </div>
                    )}

                    {authMode === 'login' && (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
                            <div>
                                <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>E-mail ou WhatsApp (Apenas números)</label>
                                <input 
                                    type="text" required placeholder="exemplo@email.com ou 11999999999" 
                                    value={loginData} onChange={e => setLoginData(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Senha</label>
                                <input 
                                    type="password" placeholder="••••••••" 
                                    value={loginPass} onChange={e => setLoginPass(e.target.value)}
                                    style={inputStyle}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                    <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}></small>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const w = '5511999999999'; // Idealmente pegar do companyConfig, aqui usamos generalista alertando ao admin.
                                            window.open(`https://wa.me/?text=${encodeURIComponent('Olá! Preciso de ajuda para recuperar/resetar a senha do meu cadastro na Área do Cliente.')}`, '_blank');
                                        }} 
                                        style={{ background: 'none', border: 'none', color: '#9333ea', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                    >
                                        Esqueci minha senha
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={isLoading} style={btnStyle(isLoading)}>
                                {isLoading ? 'Acessando...' : 'Entrar na Minha Conta'} <LogIn size={18} />
                            </button>
                        </form>
                    )}

                    {authMode === 'reset' && (
                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
                            <div style={{ padding: '12px', backgroundColor: '#faf5ff', borderRadius: '12px', border: '1px solid #e9d5ff', textAlign: 'center' }}>
                                <span style={{ display: 'block', fontSize: '0.85rem', color: '#7e22ce', fontWeight: 700, marginBottom: '4px' }}>Identificador Confirmado:</span>
                                <strong style={{ color: '#4c1d95', fontSize: '1.1rem' }}>{loginData}</strong>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Nova Senha *</label>
                                    <input type="password" required placeholder="Ex: 123456" value={resetPass} onChange={e => setResetPass(e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Confirme *</label>
                                    <input type="password" required placeholder="Repita a senha" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} style={inputStyle} />
                                </div>
                            </div>
                            <button type="submit" disabled={isLoading} style={btnStyle(isLoading)}>
                                {isLoading ? 'Salvando...' : 'Salvar Nova Senha e Entrar'} <Lock size={18} />
                            </button>
                            <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}>
                                ← Cancelar
                            </button>
                        </form>
                    )}

                    {authMode === 'register' && (
                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
                             <div>
                                <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Nome Completo *</label>
                                <input type="text" required placeholder="Seu Nome" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} style={inputStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Celular / Whatsapp *</label>
                                    <input type="tel" required placeholder="(11) 99999-9999" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Instagram</label>
                                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', paddingRight: '12px', overflow: 'hidden' }}>
                                        <span style={{ padding: '0 8px', color: '#94a3b8' }}>@</span>
                                        <input type="text" placeholder="seu.perfil" value={regData.instagram} onChange={e => setRegData({...regData, instagram: e.target.value})} style={{ ...inputStyle, border: 'none', paddingLeft: '4px' }} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>E-mail *</label>
                                <input type="email" required placeholder="seu@email.com" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} style={inputStyle} />
                            </div>
                           
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Criar Senha *</label>
                                    <input type="password" required placeholder="Ex: 123456" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '6px' }}>Confirme a Senha *</label>
                                    <input type="password" required placeholder="Repita a senha" value={regData.confirmPassword} onChange={e => setRegData({...regData, confirmPassword: e.target.value})} style={inputStyle} />
                                </div>
                            </div>
                            <button type="submit" disabled={isLoading} style={btnStyle(isLoading)}>
                                {isLoading ? 'Criando Conta...' : 'Cadastrar Perfil'} <UserPlus size={18} />
                            </button>
                        </form>
                    )}

                    <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #f3e8ff', textAlign: 'center' }}>
                        <Link to="/loja" style={{ color: '#a855f7', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}>
                            ← Voltar para a Loja
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // UI: Logged In Dashboard View
    // Mesma logica visual, apenas validando links
    const getStatusColor = (status) => {
        const s = (status || 'novo').toLowerCase();
        if (s.includes('novo') || s.includes('orçamento')) return { bg: '#dbeafe', color: '#1d4ed8' };
        if (s.includes('produção') || s.includes('arte')) return { bg: '#fef3c7', color: '#b45309' };
        if (s.includes('expedição') || s.includes('pronto')) return { bg: '#e0e7ff', color: '#4338ca' };
        if (s.includes('concluído') || s.includes('entregue')) return { bg: '#dcfce3', color: '#15803d' };
        return { bg: '#f1f5f9', color: '#475569' };
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#faf5ff', fontFamily: 'var(--font-primary)' }}>
             <header style={{ backgroundColor: '#ffffff', padding: '16px 24px', boxShadow: '0 1px 3px rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard size={20} color="#9333ea" /> Portal do Cliente
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/loja" style={{ color: '#9333ea', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Nova Compra
                    </Link>
                    <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Sair <LogOut size={14} />
                    </button>
                </div>
            </header>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
                <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                         <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#9333ea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                            {clientSession.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4c1d95', margin: '0 0 4px 0' }}>Que bom te ver, {clientSession.name.split(' ')[0]}!</h1>
                            <p style={{ color: '#6b21a8', margin: 0, fontSize: '0.95rem' }}>Acompanhe abaixo o status dos pedidos ou avalie os produtos.</p>
                        </div>
                    </div>
                    {/* Exibir o Instagram como badge */}
                    {clientSession.instagram && (
                       <a href={`https://instagram.com/${clientSession.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fdf4ff', color: '#d946ef', border: '1px solid #f5d0fe', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                           <Instagram size={14}/> @{clientSession.instagram.replace('@', '')}
                       </a>
                    )}
                </div>

                {/* Sub-Tabs (Meus Pedidos vs Dados Cadastrais) virá depois se exigido, por agora só Meus Pedidos limpos */}

                {myOrders.length === 0 ? (
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)' }}>
                        <PackageOpen size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '1.25rem', color: '#334155', margin: '0 0 8px 0' }}>Você ainda não tem pedidos</h3>
                        <p style={{ color: '#64748b', margin: '0 0 24px 0' }}>Comece a explorar nossa loja e acompanhe tudo por aqui.</p>
                        <Link to="/loja" style={{ display: 'inline-flex', padding: '12px 24px', backgroundColor: '#9333ea', color: 'white', textDecoration: 'none', borderRadius: '12px', fontWeight: 700 }}>
                            Ir Para Loja
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {myOrders.map(order => {
                            const colors = getStatusColor(order.status);
                            const orderDate = order.date ? new Date(order.date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem Data';
                            
                            return (
                                <div key={order.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: colors.color }}></div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Pedido #{order.id.toString().substring(0,6)}
                                            </span>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155', margin: '4px 0 0 0' }}>
                                                {orderDate}
                                            </h3>
                                        </div>
                                        <div style={{ backgroundColor: colors.bg, color: colors.color, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                                            {order.status || 'Novo'}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, marginBottom: '20px' }}>
                                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <PackageOpen size={14}/> {order.items} {order.items === 1 ? 'Item' : 'Itens'}
                                        </p>
                                        <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                            R$ {Number(order.total || 0).toFixed(2)}
                                        </p>
                                    </div>

                                    <button 
                                        onClick={() => navigate(`/status/${order.id}`)}
                                        style={{ width: '100%', padding: '12px', backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                    >
                                        <Search size={16} /> Rastrear ao Vivo
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle = { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#334155', outlineColor: '#a855f7' };
const btnStyle = (isLoading) => ({ padding: '14px', backgroundColor: '#9333ea', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1, transition: 'background-color 0.2s', marginTop: '8px' });
