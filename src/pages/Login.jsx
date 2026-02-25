
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password, remember);
      // Success! Redirect to home
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Falha ao entrar: Email ou senha incorretos.');
    } // finally { setLoading(false) } -> We navigate away, so no need to set false usually, but safe to do so.
      setLoading(false);
  }

  return (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f3ff 0%, #e0e7ff 100%)',
        padding: '20px'
    }}>
        <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '400px'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    background: 'var(--primary)', 
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                }}>
                   <Lock size={32} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>Estúdio Criativo</h2>
                <p style={{ color: '#6b7280' }}>Faça login para gerenciar seu atelier</p>
            </div>

            {error && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#991b1b',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Email</label>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                            <Mail size={18} />
                        </div>
                        <input 
                            type="email" 
                            required 
                            className="form-input" 
                            style={{ paddingLeft: '40px', width: '100%' }}
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                     <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Senha</label>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                            <Lock size={18} />
                        </div>
                        <input 
                            type="password" 
                            required 
                            className="form-input" 
                            style={{ paddingLeft: '40px', width: '100%' }}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
                    <input 
                        type="checkbox" 
                        id="remember"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        style={{ width: '16px', height: '16px', marginRight: '8px', cursor: 'pointer' }}
                    />
                    <label htmlFor="remember" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                        Manter conectado
                    </label>
                </div>

                <button 
                    disabled={loading}
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ 
                        width: '100%', 
                        justifyContent: 'center',
                        height: '48px',
                        fontSize: '16px'
                    }}
                >
                    {loading ? <><Loader2 className="animate-spin" size={20} /> Entrando...</> : 'Entrar na Plataforma'}
                </button>
            </form>
            
            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#9ca3af' }}>
                Protegido por Google Firebase Authentication
            </p>
        </div>
    </div>
  );
}
