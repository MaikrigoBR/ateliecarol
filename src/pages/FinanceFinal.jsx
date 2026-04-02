
import React, { useState, useEffect } from 'react';
import { 
    CreditCard, Wallet, TrendingUp, TrendingDown, Plus, 
    Calendar, DollarSign, Filter, MoreHorizontal, CheckCircle, AlertCircle, Trash2, BarChart2, Edit2,
    ShoppingBag, Truck, Briefcase, Tag, Zap, Coffee, ArrowUpRight, ArrowDownLeft, Landmark, LayoutGrid, ArrowRight, X, Settings, Search, FileText, Hammer, ListOrdered
} from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import { 
    ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import '../css/pages.css';
import { calculateFinancialStats } from '../components/FinanceHelpers';
import { CreditCardManagerModal } from '../components/CreditCardManagerModal';
import { FinanceTransactionDetailsModal } from '../components/FinanceTransactionDetailsModal';
import { FinanceAIInsights, SimpleDRETable } from '../components/FinanceAIInsights';
import { FinanceBatchEntryModal } from '../components/FinanceBatchEntryModal';

const EXPENSE_CATEGORIES = [
    'Administrativo / Fixos',
    'Materiais & Insumos',
    'Marketing & Vendas',
    'Impostos & Taxas',
    'Logística & Frete',
    'Pessoal & RH',
    'Equipamentos & Ativos',
    'Outros'
];

const INCOME_CATEGORIES = [
    'Vendas de Produtos',
    'Serviços Prestados',
    'Aporte de Sócios / Empréstimo',
    'Aportes / Rendimentos',
    'Outros'
];

const CATEGORY_COLORS = {
    'Administrativo / Fixos': '#8b5cf6',
    'Materiais & Insumos': '#f59e0b',
    'Marketing & Vendas': '#ec4899',
    'Impostos & Taxas': '#ef4444',
    'Logística & Frete': '#0ea5e9',
    'Pessoal & RH': '#10b981',
    'Equipamentos & Ativos': '#6366f1',
    'Outros': '#9ca3af',
    'Vendas de Produtos': '#10b981',
    'Serviços Prestados': '#3b82f6',
    'Aporte de Sócios / Empréstimo': '#0284c7',
    'Aportes / Rendimentos': '#8b5cf6'
};

// --- Components from Dashboard ---

function SciFiStatCard({ title, value, icon: Icon, color, subtext, gradient }) {
    const getColorTheme = (c) => {
        const map = {
            'green': { glow: 'rgba(16, 185, 129, 0.3)', text: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', grad: 'from-emerald-500/10 to-transparent' },
            'orange': { glow: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', grad: 'from-amber-500/10 to-transparent' },
            'purple': { glow: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', grad: 'from-violet-500/10 to-transparent' },
            'blue': { glow: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', grad: 'from-blue-500/10 to-transparent' },
            'red': { glow: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', grad: 'from-red-500/10 to-transparent' },
            'emerald': { glow: 'rgba(52, 211, 153, 0.3)', text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', grad: 'from-emerald-400/10 to-transparent' }
        };
        return map[c] || map['blue'];
    };

    const theme = getColorTheme(color);

    return (
        <div 
            style={{ 
                position: 'relative', overflow: 'hidden', borderRadius: '16px', 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 100%)', 
                backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', minHeight: '140px'
            }} 
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; }} 
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)'; }}
        >
            {/* Top Right Accent */}
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', borderRadius: '50%', background: theme.glow, filter: 'blur(30px)', opacity: 0.9, zIndex: 0 }}></div>
            
            <div style={{ position: 'relative', padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 10, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: theme.bg, color: theme.text, display: 'inline-flex', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)' }}>
                        <Icon size={26} style={{ filter: `drop-shadow(0 0 6px ${theme.glow})` }} />
                    </div>
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '4px' }}>
                        {title}
                    </p>
                    <h3 style={{ fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.025em', color: color === 'red' ? '#ef4444' : '#0f172a', margin: '0 0 8px 0' }}>
                        {value}
                    </h3>
                    {subtext && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9 }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: theme.text, boxShadow: `0 0 4px ${theme.text}` }}></div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{subtext}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Sci-fi Bottom Border */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', width: '100%', background: `linear-gradient(90deg, ${theme.text} 0%, transparent 100%)`, opacity: 0.9 }}></div>
        </div>
    );
}

function PremiumAccountCard({ account, onEdit, onDelete, globalFilter, setGlobalFilter }) {
    const isActive = globalFilter === account.id;
    const balance = Number(account.balance || 0);
    
    return (
        <div 
            onClick={() => setGlobalFilter(isActive ? '' : account.id)}
            style={{
                background: isActive 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                    : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                borderRadius: '24px',
                padding: '24px',
                border: isActive ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: isActive ? '0 20px 40px -15px rgba(59, 130, 246, 0.4)' : '0 10px 20px -5px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minWidth: '240px',
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 240px'
            }}
            onMouseEnter={e => { if(!isActive) e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { if(!isActive) e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            {/* Glow Overlay */}
            {isActive && <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', borderRadius: '50%', background: 'white', opacity: 0.1, filter: 'blur(40px)' }}></div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                <div style={{ 
                    width: '48px', height: '48px', borderRadius: '14px', 
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(59,130,246,0.1)', 
                    color: isActive ? 'white' : '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    {account.type === 'cash' ? <Wallet size={24} /> : <Landmark size={24} />}
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(account); }} 
                        style={{ padding: '8px', borderRadius: '10px', background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.03)', border: 'none', color: isActive ? 'white' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.03)'}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(account.id); }} 
                        style={{ padding: '8px', borderRadius: '10px', background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.05)', border: 'none', color: isActive ? 'white' : '#f87171', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.05)'}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div style={{ zIndex: 1, marginTop: '8px' }}>
                <p style={{ 
                    fontSize: '0.7rem', fontWeight: 800, 
                    color: isActive ? 'rgba(255,255,255,0.7)' : '#94a3b8', 
                    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' 
                }}>
                    {account.type === 'cash' ? 'Disponível em Mão' : 'Saldo em Banco'}
                </p>
                <h4 style={{ 
                    fontSize: '1rem', fontWeight: 700, 
                    color: isActive ? 'white' : '#64748b', 
                    margin: '0 0 6px 0', letterSpacing: '-0.01em' 
                }}>
                    {account.name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: isActive ? 'rgba(255,255,255,0.9)' : (balance < 0 ? '#ef4444' : '#10b981') }}>R$</span>
                    <h3 style={{ 
                        fontSize: '1.75rem', fontWeight: 950, 
                        color: isActive ? 'white' : (balance < 0 ? '#ef4444' : '#0f172a'), 
                        margin: 0, letterSpacing: '-0.03em' 
                    }}>
                        {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                </div>
            </div>

            {/* Bottom Graphic Ornament */}
            <div style={{ 
                position: 'absolute', bottom: 0, left: 0, height: '4px', 
                width: isActive ? '100%' : '40px', 
                background: isActive ? 'white' : '#3b82f6', 
                transition: 'width 0.6s ease',
                opacity: isActive ? 0.3 : 0.6
            }}></div>
        </div>
    );
}

function PremiumCreditCard({ account, onClick, onEdit, onDelete, isActive }) {
    const balance = Number(account.balance || 0);
    const limit = Number(account.limit || 0);
    const debt = balance < 0 ? -balance : 0;
    const percent = limit > 0 ? (debt / limit) * 100 : 0;
    const dueDay = account.dueDay || 10;
    let bestDay = dueDay - 7;
    if (bestDay <= 0) bestDay += 30;

    return (
        <div 
            onClick={onClick}
            style={{
                background: isActive 
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                    : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                borderRadius: '24px',
                padding: '24px',
                border: isActive ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: isActive ? '0 20px 40px -15px rgba(139, 92, 246, 0.4)' : '0 10px 20px -5px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                minWidth: '280px',
                position: 'relative',
                overflow: 'hidden',
                flex: '1 1 280px'
            }}
            onMouseEnter={e => { if(!isActive) e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { if(!isActive) e.currentTarget.style.transform = 'translateY(0)'; }}
        >
            {/* Holographic Ornament */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '120px', height: '120px', borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.05)', filter: 'blur(30px)' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                <div style={{ 
                    width: '52px', height: '52px', borderRadius: '14px', 
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.1)', 
                    color: isActive ? 'white' : '#8b5cf6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    <CreditCard size={26} />
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(account); }} 
                        style={{ padding: '8px', borderRadius: '10px', background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.03)', border: 'none', color: isActive ? 'white' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.03)'}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(account.id); }} 
                        style={{ padding: '8px', borderRadius: '10px', background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.05)', border: 'none', color: isActive ? 'white' : '#f87171', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.05)'}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div style={{ zIndex: 1 }}>
                <h4 style={{ 
                    fontSize: '1.25rem', fontWeight: 900, 
                    color: isActive ? 'white' : '#0f172a', 
                    margin: '0 0 10px 0', letterSpacing: '-0.02em' 
                }}>
                    {account.name}
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ 
                        fontSize: '9px', fontWeight: 900, padding: '4px 10px', borderRadius: '8px',
                        background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(16,185,129,0.08)',
                        color: isActive ? 'white' : '#10b981', border: isActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(16,185,129,0.15)',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        Melhor compra: {String(bestDay).padStart(2, '0')}
                    </div>
                    <div style={{ 
                        fontSize: '9px', fontWeight: 900, padding: '4px 10px', borderRadius: '8px',
                        background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.08)',
                        color: isActive ? 'white' : '#ef4444', border: isActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(239,68,68,0.15)',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        Vencimento: {String(dueDay).padStart(2, '0')}
                    </div>
                </div>
            </div>

            <div style={{ zIndex: 1, marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isActive ? 'rgba(255,255,255,0.7)' : '#94a3b8', textTransform: 'uppercase' }}>Fatura em Aberto</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isActive ? 'white' : '#7c3aed' }}>R$</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 950, color: isActive ? 'white' : '#7c3aed', letterSpacing: '-0.02em' }}>{debt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
                <div style={{ height: '8px', width: '100%', background: isActive ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden', padding: '1px' }}>
                    <div style={{ 
                        height: '100%', width: `${Math.min(100, percent)}%`, 
                        background: percent > 90 ? '#ef4444' : (isActive ? 'white' : 'linear-gradient(90deg, #8b5cf6, #d946ef)'),
                        borderRadius: '3px',
                        transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: isActive ? 'none' : '0 0 10px rgba(139, 92, 246, 0.3)'
                    }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isActive ? 'rgba(255,255,255,0.6)' : '#94a3b8', textTransform: 'uppercase' }}>{percent.toFixed(1)}% Limite Usado</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isActive ? 'rgba(255,255,255,0.6)' : '#64748b', textTransform: 'uppercase' }}>Disponível: R$ {Math.max(0, limit - debt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            
            {/* Visual Chip Ornament */}
            <div style={{ position: 'absolute', right: '24px', top: '100px', width: '36px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.5 }}></div>
        </div>
    );
}


// --- Dynamic Chart (Preserved & Adapted) ---

function FinancialOverviewChart({ data }) {
    const scrollRef = React.useRef(null);

    React.useLayoutEffect(() => {
        if (scrollRef.current && data.length > 0) {
            const todayIndex = data.findIndex(d => d.isToday);
            if (todayIndex !== -1) {
                const dayWidth = 40; 
                const containerWidth = scrollRef.current.clientWidth;
                const centerPosition = (todayIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2);
                scrollRef.current.scrollLeft = Math.max(0, centerPosition);
            }
        }
    }, [data]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-100 ring-1 ring-black/5 min-w-[200px]">
                    <div className="mb-2 pb-2 border-b border-gray-100">
                        <p className="font-bold text-gray-800 text-xs flex items-center gap-2">
                            {d.fullName}
                        </p>
                    </div>
                    <div className="space-y-1">
                        {d.Receitas > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-emerald-600 font-medium">Entradas</span>
                                <span className="font-bold text-emerald-600">+R${d.Receitas.toFixed(2)}</span>
                            </div>
                        )}
                        {d.Projeção > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-emerald-400 font-medium">A Receber</span>
                                <span className="font-bold text-emerald-400">+R${d.Projeção.toFixed(2)}</span>
                            </div>
                        )}
                        {d.Despesas > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-red-600 font-medium">Saídas</span>
                                <span className="font-bold text-red-600">-R${d.Despesas.toFixed(2)}</span>
                            </div>
                        )}
                        {d.APagar > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-red-400 font-medium">A Pagar</span>
                                <span className="font-bold text-red-400">-R${d.APagar.toFixed(2)}</span>
                            </div>
                        )}
                         <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between">
                             <span className="text-xs font-bold text-blue-600">Saldo</span>
                             <span className={`font-mono text-sm font-bold ${d.Saldo >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                                 R${d.Saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                             </span>
                         </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomXAxisTick = ({ x, y, payload }) => {
        if (!payload || !payload.value) return null;
        const val = payload.value;
        if (val.includes('/')) {
            const [day, month] = val.split('/');
            return (
                <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={12} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight={600}>{day}</text>
                    <text x={0} y={0} dy={24} textAnchor="middle" fill="#9ca3af" fontSize={10}>{month}</text>
                </g>
            );
        }
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight={600} textTransform="capitalize">{val}</text>
            </g>
        );
    };

    const maxVal = React.useMemo(() => {
        if (!data || data.length === 0) return 1000;
        let m = 0;
        data.forEach(d => {
            const vals = [d.Receitas, d.Despesas, d.Saldo, d.APagar, d.Projeção].map(Math.abs);
            const localMax = Math.max(...vals.filter(v => v !== undefined && !isNaN(v)));
            if (localMax > m) m = localMax;
        });
        const padded = Math.ceil(m * 1.15);
        return padded > 0 ? Math.ceil(padded / 500) * 500 : 1000;
    }, [data]);

    // Create a dummy dataset just for the sticky Y-Axis component
    const yAxisData = [{ name: '', Receitas: maxVal, Despesas: -maxVal }];

    return (
        <div style={{ position: 'relative', height: '100%', display: 'flex' }}>
            {/* Sticky Y-Axis Overlay */}
            <div style={{ width: '65px', height: '100%', flexShrink: 0, backgroundColor: 'var(--surface, transparent)', zIndex: 10, minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={yAxisData} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
                        <XAxis dataKey="name" hide={true} />
                        <YAxis 
                            type="number"
                            hide={false}
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#9ca3af', fontSize: 10}}
                            tickFormatter={(val) => 
                                `R$ ${Math.abs(val) > 999 ? (val/1000).toLocaleString('pt-BR') + 'k' : val.toLocaleString('pt-BR')}`
                            }
                            width={65}
                            domain={[-maxVal, maxVal]}
                            tickCount={7}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Scrollable Data Area */}
             <div 
                ref={scrollRef}
                className="scrollbar-hide"
                style={{ 
                    overflowX: 'auto', 
                    overflowY: 'hidden',
                    height: '100%',
                    flex: 1,
                    scrollBehavior: 'smooth'
                }}
            >
                <div style={{ width: `${Math.max(100, data.length * 45)}px`, height: '100%', minHeight: '300px', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 10, bottom: 20, left: 0 }} barGap={2}>
                            <defs>
                                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={<CustomXAxisTick />} interval={0} />
                            <YAxis hide={true} domain={[-maxVal, maxVal]} type="number" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent', stroke: 'var(--border)', strokeWidth: 20, strokeDasharray: '4 4' }} />
                            
                            <Area type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#3b82f6' }} />
                            
                            <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#10b981' }} />
                            <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#ef4444' }} />
                            
                            <Line type="monotone" dataKey="Projeção" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#34d399' }} />
                            <Line type="monotone" dataKey="APagar" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#f87171' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

// --- Main Page ---

export function FinanceFinal() {
    const { currentUser } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [orders, setOrders] = useState([]); // For projections
    const [equipments, setEquipments] = useState([]); // For linking
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);
    const [costCenterData, setCostCenterData] = useState([]);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    
    // Dynamic Categories State
    const [expenseCategories, setExpenseCategories] = useState(EXPENSE_CATEGORIES);
    const [incomeCategories, setIncomeCategories] = useState(INCOME_CATEGORIES);
    const [categoryColors, setCategoryColors] = useState(CATEGORY_COLORS);
    
    // Manage Categories Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState('expense');
    const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
    const [rawCategories, setRawCategories] = useState([]);
    
    // Global Dash Filter
    const [globalAccFilter, setGlobalAccFilter] = useState('');
    const [chartMode, setChartMode] = useState('daily');
    
    // Filters for Transactions Table
    const [transSearchTerm, setTransSearchTerm] = useState('');
    const [transTypeFilter, setTransTypeFilter] = useState('');
    const [transAccFilter, setTransAccFilter] = useState('');
    
    // Stats for Cards
    const [stats, setStats] = useState({
        totalBalance: 0,
        monthIncome: 0,
        monthExpense: 0,
        result: 0,
        creditDebt: 0
    });

    // Modals & Forms State
    const [isAccModalOpen, setIsAccModalOpen] = useState(false);
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [editAccId, setEditAccId] = useState(null);
    const [editTransId, setEditTransId] = useState(null);
    const [newAccount, setNewAccount] = useState({ name: '', type: 'checking', balance: 0, limit: 0, dueDay: 10, color: '#3b82f6' });
    const [newTrans, setNewTrans] = useState({ description: '', amount: '', type: 'expense', category: 'Geral', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12, referenceId: '', referenceType: null });
    const [selectedCreditCard, setSelectedCreditCard] = useState(null);
    const [selectedDetailTrans, setSelectedDetailTrans] = useState(null);
    const [transDateFilter, setTransDateFilter] = useState('');
    const [visibleTransactionsLimit, setVisibleTransactionsLimit] = useState(50);


    // Calculations
    useEffect(() => {
        console.log("FinanceFinal: Recalculating Stats. Loading:", loading);
        if (!loading) {
            // Apply Global Filter 
            const filteredAccounts = globalAccFilter ? accounts.filter(a => a.id === globalAccFilter) : accounts;
            const filteredTrans = globalAccFilter ? transactions.filter(t => t.accountId === globalAccFilter) : transactions;

            // 1. Chart Data
            const data = calculateFinancialStats(filteredTrans, orders, filteredAccounts, { mode: chartMode, daysBack: 30, daysForward: 60, monthsBack: 6, monthsForward: 6 });
            setChartData(data);

            // 2. KPI Stats
            const now = new Date();
            const currentMonthTrans = filteredTrans.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.status === 'paid';
            });

            const income = currentMonthTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
            const expense = currentMonthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
            
            // Total Balance is sum of all visible accounts
            const totalBal = filteredAccounts.reduce((sum, a) => {
                // If it's a credit card, the balance will be negative due to expenses and positive if paid. 
                // Summing it up natively gives a real "Consolidated net liquidity"
                return sum + Number(a.balance || 0);
            }, 0);

            // Credit Used (only if looking globally or specifically at a credit card)
            const creditUsed = filteredAccounts.filter(a => a.type === 'credit').reduce((sum, a) => sum + Number(a.balance || 0), 0);

            // 3. Cost Center DRE (Current Month Expenses)
            const expenseMap = {};
            let totalGatewayTaxes = 0;
            
            currentMonthTrans.filter(t => t.type === 'expense').forEach(t => {
                const cat = t.category || 'Outros';
                expenseMap[cat] = (expenseMap[cat] || 0) + Number(t.amount);
            });
            
            // Extrair as taxas de Gateway que vieram de vendas (incomes) para o DRE Oficial
            currentMonthTrans.filter(t => t.type === 'income').forEach(t => {
                if (t.auditData && t.auditData.tax > 0) {
                    totalGatewayTaxes += Number(t.auditData.tax);
                }
            });
            
            if (totalGatewayTaxes > 0) {
                // Adicionamos a Taxa M.P. silenciosamente ao DRE
                expenseMap['Taxas Gateway (M.P.)'] = (expenseMap['Taxas Gateway (M.P.)'] || 0) + totalGatewayTaxes;
                if (!categoryColors['Taxas Gateway (M.P.)']) categoryColors['Taxas Gateway (M.P.)'] = '#fb923c'; 
            }

            const fallbackColors = ['#0ea5e9', '#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#f43f5e', '#3b82f6'];
            const costCenterFormat = Object.keys(expenseMap).map((k, index) => {
                let color = categoryColors[k];
                if (!color || color === '#9ca3af') {
                    // Se for cinza genérico ou vazio, pega uma cor vibrante do fallback baseado no índice
                    color = fallbackColors[index % fallbackColors.length];
                }
                return {
                    name: k,
                    value: expenseMap[k],
                    color: color
                };
            }).sort((a,b) => b.value - a.value);

            // True Net Profit (subtract gateway taxes from income since incomes in Firebase are recorded as NetAmount already if from webhook.
            // Wait, Webhook records income as NET AMOUNT exactly. So the True Result doesn't need to subtract the tax again if it's already net!
            // However, visually showing the Gateway Tax helps the owner understand how much they lost in fees.

            setStats({
                totalBalance: totalBal,
                monthIncome: income,
                monthExpense: expense,
                result: income - expense,
                creditDebt: creditUsed,
                gatewayTaxes: totalGatewayTaxes,
                expenseMap: expenseMap
            });
            setCostCenterData(costCenterFormat);
        }
    }, [transactions, orders, accounts, loading, globalAccFilter, chartMode]);

    const fetchData = async () => {
        setLoading(true);
        const originalAccs = await db.getAll('accounts') || [];
        const trans = await db.getAll('transactions') || [];
        const allOrders = await db.getAll('orders') || [];
        const allEquips = await db.getAll('equipments') || [];
        
        // Fetch Categories
        let dbCategories = await db.getAll('categories') || [];
        if (dbCategories.length === 0) {
            // Seed defaults
            const promises = [];
            for (const cat of EXPENSE_CATEGORIES) {
                promises.push(db.create('categories', { name: cat, type: 'expense', color: CATEGORY_COLORS[cat] || '#9ca3af' }));
            }
            for (const cat of INCOME_CATEGORIES) {
                promises.push(db.create('categories', { name: cat, type: 'income', color: CATEGORY_COLORS[cat] || '#10b981' }));
            }
            await Promise.all(promises);
            dbCategories = await db.getAll('categories') || [];
        }

        const expenses = dbCategories.filter(c => c.type === 'expense').map(c => c.name);
        const incomes = dbCategories.filter(c => c.type === 'income').map(c => c.name);
        const colors = {};
        dbCategories.forEach(c => { colors[c.name] = c.color; });

        setExpenseCategories(expenses.length > 0 ? expenses : EXPENSE_CATEGORIES);
        setIncomeCategories(incomes.length > 0 ? incomes : INCOME_CATEGORIES);
        setCategoryColors(Object.keys(colors).length > 0 ? colors : CATEGORY_COLORS);
        setRawCategories(dbCategories);
        
        // Filter active orders for projection
        const pendingOrders = allOrders.filter(o => o.status !== 'completed' && o.status !== 'Concluído' && o.status !== 'cancelled');
        
        // Recalculate robust balances dynamically for accuracy
        const recalculatedAccs = originalAccs.map(acc => {
            const initial = Number(acc.initialBalance || 0);
            const accountTrans = trans.filter(t => t.accountId === acc.id && t.status === 'paid');
            const income = accountTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
            const expense = accountTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
            return {
                ...acc,
                balance: initial + income - expense
            };
        });

        setAccounts(recalculatedAccs);
        setTransactions(trans.sort((a,b) => new Date(b.date) - new Date(a.date)));
        setOrders(pendingOrders);
        setEquipments(allEquips);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        
        await db.create('categories', { 
            name: newCategoryName.trim(), 
            type: newCategoryType, 
            color: newCategoryColor 
        });
        
        setNewCategoryName('');
        fetchData();
    };

    const handleDeleteCategory = async (id, name) => {
        // Warning if transactions are using this category
        const isUsed = transactions.some(t => t.category === name);
        if (isUsed) {
            alert('Esta categoria já está sendo usada em lançamentos. Para excluí-la, altere a categoria desses lançamentos primeiro.');
            return;
        }

        if(confirm('Tem certeza que deseja excluir esta categoria?')) {
            await db.delete('categories', id);
            fetchData();
        }
    };

    // ... Handlers (Create/Delete/Edit) ...
    const openEditAccount = (acc) => {
        setNewAccount({ 
            name: acc.name, 
            type: acc.type || 'checking', 
            balance: acc.initialBalance || 0,
            limit: acc.limit || 0 
        });
        setEditAccId(acc.id);
        setIsAccModalOpen(true);
    };

    const handleDeleteAccount = async (id) => {
        if(confirm('Tem certeza que deseja excluir esta conta? As transações atreladas a ela ficarão órfãs na lista.')) {
            await db.delete('accounts', id);
            fetchData();
        }
    };

    const handleSaveAccount = async (e) => {
        e.preventDefault();
        const payload = {
            ...newAccount,
            initialBalance: Number(newAccount.balance || 0),
            limit: Number(newAccount.limit || 0)
        };
        
        if (editAccId) {
            await db.update('accounts', editAccId, payload);
        } else {
            await db.create('accounts', payload);
        }
        
        setIsAccModalOpen(false);
        setEditAccId(null);
        setNewAccount({ name: '', type: 'checking', balance: 0, limit: 0, dueDay: 10, color: '#3b82f6' });
        fetchData();
    };

    const openEditTrans = (t) => {
        setNewTrans({
             description: t.description,
             amount: t.amount,
             type: t.type,
             category: t.category || (t.type === 'income' ? 'Vendas de Produtos' : 'Outros'),
             accountId: t.accountId,
             date: t.date || new Date().toISOString().split('T')[0],
             status: t.status || 'paid',
             installments: t.installments || 1,
             isRecurring: false,
             recurrenceMonths: 12,
             referenceId: t.referenceId || '',
             referenceType: t.referenceType || null
        });
        setEditTransId(t.id);
        setIsTransModalOpen(true);
    };

    const handleSaveTrans = async (e) => {
        e.preventDefault();
        const amount = Number(newTrans.amount);
        const account = accounts.find(a => String(a.id) === String(newTrans.accountId));
        const isCredit = account?.type === 'credit';
        // Se estiver editando, mantemos como está. O parcelamento entra na criação.
        const installments = editTransId ? 1 : (Number(newTrans.installments) || 1);
        
        const payload = {
            ...newTrans,
            amount: amount
        };

        // --- Verificação Anti-Duplicidade (Terminais não Sincronizados) ---
        if (!editTransId) {
            // Reconsulta direto no Firebase/IndexedDB para pegar os dados MAIS recentes, e não os do estado atual (que podem estar atrasados no cache do browser)
            const freshTrans = await db.getAll('transactions') || [];
            const recentDuplicate = freshTrans.find(t => 
                t.description.trim().toLowerCase() === newTrans.description.trim().toLowerCase() && 
                Number(t.amount) === amount && 
                t.type === newTrans.type && 
                t.date === newTrans.date &&
                t.accountId === newTrans.accountId &&
                t.parentId === undefined // Não checa sobre filhos de parcela ou recorrência já criados
            );

            if (recentDuplicate) {
                const proceed = window.confirm(
                    `ALERTA DE DUPLICIDADE (MÚLTIPLOS ACESSOS)\n\n` +
                    `O sistema identificou que este exato lançamento acabou de ser criado (provavelmente em outro terminal ou aba desatualizada):\n` +
                    `- Descrição: ${newTrans.description}\n` +
                    `- Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                    `- Data: ${newTrans.date.split('-').reverse().join('/')}\n\n` +
                    `Isso irá corromper seu caixa se for uma repetição inadvertida.\n\n` +
                    `Deseja realmente ignorar a trava e criar esse LANÇAMENTO DUPLICADO? Se sim, clique OK.`
                );
                if (!proceed) return; // Cancela silenciosamente sem recarregar e mantem a tela preenchida
            }
        }
        // --- Fim Verificação Anti-Duplicidade ---

        if (editTransId) {
            await db.update('transactions', editTransId, payload);
        } else {
            if (installments > 1 && isCredit && payload.type === 'expense') {
                const promises = [];
                const installmentAmount = amount / installments;
                const parentId = `group_${Date.now()}`;
                
                for(let i = 0; i < installments; i++) {
                    const [y, m, d] = payload.date.split('-');
                    const baseDate = new Date(Number(y), Number(m) - 1 + i, 1);
                    const maxDays = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
                    baseDate.setDate(Math.min(Number(d), maxDays));
                    
                    const isoDate = `${baseDate.getFullYear()}-${String(baseDate.getMonth()+1).padStart(2,'0')}-${String(baseDate.getDate()).padStart(2,'0')}`;

                    const transPayload = {
                        ...payload,
                        amount: installmentAmount,
                        date: isoDate,
                        createdAt: new Date().toISOString(),
                        installmentsTotal: installments,
                        installmentNumber: i + 1,
                        parentId: parentId,
                        description: `${payload.description} (${i+1}/${installments})`
                    };
                    promises.push(db.create('transactions', transPayload));
                }
                await Promise.all(promises);
            } else {
                if (newTrans.isRecurring && newTrans.recurrenceMonths > 1) {
                    const promises = [];
                    const parentId = `rec_${Date.now()}`;
                    
                    for(let i = 0; i < newTrans.recurrenceMonths; i++) {
                        const [y, m, d] = payload.date.split('-');
                        const baseDate = new Date(Number(y), Number(m) - 1 + i, 1);
                        const maxDays = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
                        baseDate.setDate(Math.min(Number(d), maxDays));
                        
                        const isoDate = `${baseDate.getFullYear()}-${String(baseDate.getMonth()+1).padStart(2,'0')}-${String(baseDate.getDate()).padStart(2,'0')}`;
                        
                        const transPayload = {
                            ...payload,
                            date: isoDate,
                            createdAt: new Date().toISOString(),
                            status: i === 0 ? payload.status : 'pending',
                            parentId: parentId,
                            description: `${payload.description} (${i+1}/${newTrans.recurrenceMonths})`
                        };
                        promises.push(db.create('transactions', transPayload));
                    }
                    await Promise.all(promises);
                } else {
                    payload.createdAt = new Date().toISOString();
                    await db.create('transactions', payload);
                }
            }
        }

        // We don't need manual balance updates anymore, fetchData recalculates it cleanly!
        setIsTransModalOpen(false);
        setEditTransId(null);
        setNewTrans({ description: '', amount: '', type: 'expense', category: 'Outros', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12, referenceId: '', referenceType: null });
        fetchData();
    };

    const handleDeleteTrans = async (t) => {
        if (t.orderId && t.type === 'income') {
            alert(`AÇÃO BLOQUEADA (Auditoria Ativa):\n\nEsta transação pertence ao Pedido (E-commerce ou PDV) #${String(t.orderId).substring(0,6)} e está selada fiscalmente.\n\nPara anular ou estornar esta receita, vá na tela principal de 'Pedidos' e clique no botão amarelo 'Cancelar Pedido & Estornar'. A exclusão avulsa é proibida para manter as Partidas Dobradas.`);
            return;
        }
        if(confirm('Tem certeza que deseja excluir este lançamento manual? (Atenção: Ações sistemáticas como essa devem ser evitadas em contabilidade estrita)')) {
            await db.delete('transactions', t.id);
            fetchData();
        }
    };

    const handleConfirmPayment = async (t) => {
        if(confirm(`Confirmar que o valor de R$ ${Number(t.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})} foi efetivamente ${t.type === 'income' ? 'creditado' : 'debitado'}?`)) {
            await db.update('transactions', t.id, { ...t, status: 'paid' });
            fetchData();
        }
    };


    const transactionsWithBalance = React.useMemo(() => {
        if (!accounts || accounts.length === 0) return transactions;
        
        const accBalances = {};
        accounts.forEach(a => {
            accBalances[a.id] = Number(a.initialBalance || 0);
        });

        const sortedTrans = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const result = sortedTrans.map(t => {
            if (t.status === 'paid') {
                const amt = Number(t.amount || 0);
                if (t.type === 'income') {
                    accBalances[t.accountId] = (accBalances[t.accountId] || 0) + amt;
                } else {
                    accBalances[t.accountId] = (accBalances[t.accountId] || 0) - amt;
                }
            }
            return {
                ...t,
                runningBalance: accBalances[t.accountId] || 0
            };
        });

        return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, accounts]);

    if (loading) return <div className="p-xl text-center">Carregando financeiro...</div>;

    return (
        <div className="animate-fade-in page-content">
            <div className="dashboard-header">
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Inteligência Financeira
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Controle de fluxo de caixa e projeções.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select 
                        className="form-input" 
                        style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer', minWidth: '180px' }}
                        value={globalAccFilter} 
                        onChange={e => setGlobalAccFilter(e.target.value)}
                    >
                        <option value="">Consolidado Global (Todas)</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <button 
                        onClick={() => setIsBatchModalOpen(true)}
                        className="btn group"
                        style={{ 
                            padding: '0.6rem 1.25rem', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#8b5cf6'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; e.currentTarget.style.color = '#8b5cf6'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <ListOrdered size={16} /> Lote Retroativo
                    </button>

                    <button 
                        onClick={() => {
                            setEditAccId(null);
                            setNewAccount({ name: '', type: 'checking', balance: 0, limit: 0, dueDay: 10, color: '#3b82f6' });
                            setIsAccModalOpen(true);
                        }}
                        className="btn group"
                        style={{ 
                            padding: '0.6rem 1.25rem', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: 'var(--surface)', color: 'var(--primary)', border: '2px solid var(--primary)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <Landmark size={16} /> Novo Cofre
                    </button>

                    <button 
                        onClick={() => {
                            setEditTransId(null);
                            setNewTrans({ description: '', amount: '', type: 'expense', category: 'Outros', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12 });
                            setIsTransModalOpen(true);
                        }}
                        className="btn shadow-xl"
                        style={{ 
                            padding: '0.6rem 1.5rem', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', border: 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -10px rgba(59, 130, 246, 0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                    >
                        <Plus size={18} /> Lançar Movimento
                    </button>
                </div>
            </div>

            {/* KPI Grid Sci-Fi */}
            <FinanceAIInsights transactions={transactions} accounts={accounts} openEditTrans={openEditTrans} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <SciFiStatCard 
                    title={globalAccFilter ? "Saldo da Conta" : "Saldo Consolidado"} 
                    value={`${stats.totalBalance < 0 ? '-' : ''}R$ ${Math.abs(stats.totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={Landmark} 
                    color={stats.totalBalance < 0 ? 'red' : 'blue'}
                    subtext={globalAccFilter ? "Atualizado para esta conta" : "Balanço líquido total em caixa"}
                />
                <SciFiStatCard 
                    title="Faturamento Bruto (Mês)" 
                    value={`R$ ${(stats.monthIncome + (stats.gatewayTaxes||0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={TrendingUp} 
                    color="emerald"
                    subtext="Todo o valor que entrou"
                />
                <SciFiStatCard 
                    title="Despesas Operacionais" 
                    value={`R$ ${stats.monthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={TrendingDown} 
                    color="red"
                    subtext="Saídas (Exclui taxas gateway)"
                />
                 <SciFiStatCard 
                    title="Lucro Líquido Real" 
                    value={`R$ ${(stats.result).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={Zap} 
                    color={(stats.result) >= 0 ? "purple" : "red"}
                    subtext={`Vendas - Despesas = Seu Bolso`}
                />
            </div>

            {/* Warning Pending Income (Point 7 of Flow) */}
            {(() => {
                const pendings = transactionsWithBalance.filter(t => t.type === 'income' && t.status !== 'paid');
                const totalPending = pendings.reduce((sum, t) => sum + Number(t.amount), 0);
                if (totalPending > 0) {
                    return (
                        <div className="mb-6 p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
                            <div className="flex items-center gap-4">
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#9a3412', margin: 0 }}>Atenção: Recebimentos Pendentes</h3>
                                    <p style={{ color: '#c2410c', fontSize: '0.85rem', margin: 0 }}>Você possui {pendings.length} pedido(s) concluído(s) aguardando o recebimento.</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: '#c2410c', textTransform: 'uppercase', fontWeight: 700 }}>Valor Bloqueado</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ea580c' }}>R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Charts Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                {/* Top Row: Daily Chart + Pie Chart */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                    <div className="chart-card" style={{ flex: '1 1 600px', overflow: 'hidden' }}>
                        <div className="chart-header" style={{ justifyContent: 'space-between' }}>
                            <div className="flex items-center gap-2">
                                <BarChart2 size={20} color="var(--primary)" /> Fluxo de Caixa
                            </div>
                            <select 
                                value={chartMode} 
                                onChange={e => setChartMode(e.target.value)}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-hover)', outline: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                            >
                                <option value="daily">Visão Diária (30d)</option>
                                <option value="monthly">Tendência Mensal (Sazonal)</option>
                            </select>
                            <div className="flex gap-2">
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Receitas</span>
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">Despesas</span>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Saldo</span>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: '320px', minWidth: 0, position: 'relative' }}>
                            <FinancialOverviewChart data={chartData} />
                        </div>
                    </div>

                    <div className="chart-card" style={{ flex: '1 1 350px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="chart-header">
                            <div className="flex items-center gap-2">
                                <PieChart size={20} color="var(--primary)" /> Distribuição de Custos
                            </div>
                        </div>
                        <div style={{ flex: 1, width: '100%', minWidth: 0, minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            {costCenterData.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={costCenterData}
                                                innerRadius={65}
                                                outerRadius={85}
                                                paddingAngle={6}
                                                cornerRadius={8}
                                                dataKey="value"
                                                stroke="var(--surface)"
                                                strokeWidth={2}
                                            >
                                                {costCenterData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 4px 6px ${entry.color}60)` }} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                                                contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="w-full px-4 mt-2 space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                                        {costCenterData.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}90` }}></div>
                                                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }} className="truncate max-w-[140px]">{d.name}</span>
                                                </div>
                                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>R$ {d.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-gray-400 text-sm italic">Nenhuma despesa no mês atual.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Full Width DRE */}
                <div style={{ display: 'flex', width: '100%' }}>
                    <div style={{ width: '100%' }}>
                        <SimpleDRETable stats={stats} />
                    </div>
                </div>
            </div>

            {/* Horizontal Accounts & Credit Cards Premium Grid */}
            <div className="flex flex-col gap-10 mb-12">
                
                {/* Checking / Savings Accounts Section */}
                <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Wallet size={18} />
                            </div>
                            <h4 className="text-[1.1rem] font-black text-slate-800 dark:text-slate-100 tracking-tight">Cofres e Disponibilidade</h4>
                        </div>
                        <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                            {accounts.filter(a => a.type !== 'credit').length} Contas ativas
                        </span>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {accounts.filter(a => a.type !== 'credit').length === 0 ? (
                            <div className="col-span-full p-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic text-sm">
                                Nenhuma conta corrente ou carteira cadastrada.
                            </div>
                        ) : (
                            accounts.filter(a => a.type !== 'credit').map(acc => (
                                <PremiumAccountCard 
                                    key={acc.id} 
                                    account={acc} 
                                    globalFilter={globalAccFilter} 
                                    setGlobalFilter={setGlobalAccFilter} 
                                    onEdit={openEditAccount}
                                    onDelete={handleDeleteAccount}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Credit Cards Section */}
                <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CreditCard size={18} />
                            </div>
                            <h4 className="text-[1.1rem] font-black text-slate-800 dark:text-slate-100 tracking-tight">Inteligência de Cartão de Crédito</h4>
                        </div>
                        <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                            Exposição: R$ {Math.abs(stats.creditDebt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {accounts.filter(a => a.type === 'credit').length === 0 ? (
                            <div className="col-span-full p-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic text-sm">
                                Nenhum cartão de crédito cadastrado.
                            </div>
                        ) : (
                            accounts.filter(a => a.type === 'credit').map(acc => (
                                <PremiumCreditCard 
                                    key={acc.id} 
                                    account={acc} 
                                    isActive={selectedCreditCard?.id === acc.id || globalAccFilter === acc.id}
                                    onClick={() => setSelectedCreditCard(acc)}
                                    onEdit={openEditAccount}
                                    onDelete={handleDeleteAccount}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

        <div className="chart-card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--surface)', borderRadius: '28px', border: '1px solid var(--border)', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(255,255,255,0.8), rgba(255,255,255,0.4))', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div className="flex items-center gap-4">
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                        <ListOrdered size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                            Fluxo de Caixa Detalhado
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rastreabilidade de Movimentações</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                     <div style={{ position: 'relative' }}>
                         <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                         <input 
                            type="text" 
                            placeholder="Buscar movimento..." 
                            className="form-input" 
                            style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', fontSize: '0.85rem', width: '240px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.5)', fontWeight: 600 }}
                            value={transSearchTerm}
                            onChange={(e) => setTransSearchTerm(e.target.value)}
                         />
                     </div>
                     <select 
                        className="form-input" 
                        style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}
                        value={transTypeFilter} 
                        onChange={e => setTransTypeFilter(e.target.value)}
                     >
                        <option value="">🔄 Qualquer Tipo</option>
                        <option value="income">🟢 Apenas Receitas (+)</option>
                        <option value="expense">🔴 Apenas Despesas (-)</option>
                     </select>
                     <select 
                        className="form-input" 
                        style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}
                        value={transAccFilter} 
                        onChange={e => setTransAccFilter(e.target.value)}
                     >
                        <option value="">🏦 Todas as Contas</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                     </select>
                     <input
                         type="month"
                         className="form-input"
                         style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}
                         value={transDateFilter}
                         onChange={e => setTransDateFilter(e.target.value)}
                     />
                </div>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.015)', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Calendário</th>
                        <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Identificação</th>
                        <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Centro de Custo</th>
                        <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Origem/Destino</th>
                        <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Impacto</th>
                        <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Saldo</th>
                    </tr>
                </thead>
                        <tbody>
                            {transactionsWithBalance
                                .filter(t => {
                                    const search = transSearchTerm.toLowerCase();
                                    const matchesSearch = t.description?.toLowerCase().includes(search) || t.category?.toLowerCase().includes(search);
                                    const matchesType = transTypeFilter === '' || t.type === transTypeFilter;
                                    const matchesAcc = transAccFilter === '' || t.accountId === transAccFilter;
                                    let matchesDate = true;
                                    if (transDateFilter) {
                                        const tMonth = t.date.substring(0, 7);
                                        matchesDate = tMonth === transDateFilter;
                                    }
                                    return matchesSearch && matchesType && matchesAcc && matchesDate;
                                })
                                .slice(0, visibleTransactionsLimit)
                                .map(t => {
                                const acc = accounts.find(a => a.id === t.accountId);
                                const isExpense = t.type === 'expense';
                                return (
                                    <tr 
                                        key={t.id} 
                                        onClick={() => setSelectedDetailTrans(t)} 
                                        style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'all 0.2s' }} 
                                        className="hover:bg-indigo-50/40 group"
                                    >
                                        <td style={{ padding: '1.25rem 2rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-6 rounded-full" style={{ background: isExpense ? '#ef4444' : '#10b981', opacity: 0.5 }}></div>
                                                {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase().replace(' DE', '')}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div className="flex items-center gap-2">
                                                    {t.orderId && <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" title="Venda Automática"></div>}
                                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem', letterSpacing: '-0.01em' }}>{t.description}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                                    {t.installmentsTotal > 1 && <span style={{ fontSize: '8px', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 900, border: '1px solid #e0e7ff' }}>PARC {t.installmentNumber}/{t.installmentsTotal}</span>}
                                                    {t.status !== 'paid' && <span style={{ fontSize: '8px', color: '#ea580c', backgroundColor: '#fff7ed', padding: '1px 6px', borderRadius: '4px', fontWeight: 900, border: '1px solid #ffedd5' }}>PREVISTO</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem' }}>
                                            <span style={{ 
                                                backgroundColor: categoryColors[t.category] ? `${categoryColors[t.category]}12` : '#f8fafc', 
                                                color: categoryColors[t.category] || '#94a3b8',
                                                padding: '5px 12px',
                                                borderRadius: '10px',
                                                fontSize: '0.7rem',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                border: `1px solid ${categoryColors[t.category] ? `${categoryColors[t.category]}20` : '#f1f5f9'}`
                                            }}>
                                                {t.category || 'Geral'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>
                                                {acc?.type === 'credit' ? <CreditCard size={14} /> : <Wallet size={14} />}
                                                {acc?.name || '---'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                            <span style={{ fontWeight: 950, color: isExpense ? '#ef4444' : '#10b981', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                                                {isExpense ? '−' : '+'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                            {globalAccFilter ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: t.runningBalance < 0 ? '#ef4444' : '#1e293b' }}>
                                                        R$ {Math.abs(t.runningBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span style={{ opacity: 0.1, fontSize: '1rem' }}>•••</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                    {transactionsWithBalance.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Search size={32} className="opacity-20" />
                                    Nenhuma transação encontrada com os filtros refinados.
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {transactionsWithBalance.filter(t => {
                const search = transSearchTerm.toLowerCase();
                const matchesSearch = t.description?.toLowerCase().includes(search) || t.category?.toLowerCase().includes(search);
                const matchesType = transTypeFilter === '' || t.type === transTypeFilter;
                const matchesAcc = transAccFilter === '' || t.accountId === transAccFilter;
                let matchesDate = true;
                if (transDateFilter) {
                    const tMonth = t.date.substring(0, 7);
                    matchesDate = tMonth === transDateFilter;
                }
                return matchesSearch && matchesType && matchesAcc && matchesDate;
            }).length > visibleTransactionsLimit && (
                <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => setVisibleTransactionsLimit(prev => prev + 50)}
                    >
                        Carregar Mais Lançamentos
                    </button>
                </div>
            )}
            </div>
        </div>

        {/* Modals */}
        <FinanceBatchEntryModal
            isOpen={isBatchModalOpen}
            onClose={() => setIsBatchModalOpen(false)}
            accounts={accounts}
            categories={rawCategories}
            onSaveSuccess={(count) => {
                alert(`Injeção Bem-sucedida! ${count} lançamentos foram gravados no sistema.`);
                fetchData();
            }}
        />
        <CreditCardManagerModal
            isOpen={!!selectedCreditCard}
            onClose={() => setSelectedCreditCard(null)}
            account={selectedCreditCard}
            accounts={accounts}
            transactions={transactions}
            onUpdate={fetchData}
            onEditTrans={setSelectedDetailTrans}
        />

        <FinanceTransactionDetailsModal
            isOpen={!!selectedDetailTrans}
            onClose={() => setSelectedDetailTrans(null)}
            transaction={selectedDetailTrans}
            onUpdate={fetchData}
            accounts={accounts}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
        />

            {isAccModalOpen && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
                    <div className="modal-content animate-scale-in" style={{ maxWidth: '450px', width: '95%', backgroundColor: 'var(--surface)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                    <Wallet size={20} />
                                </div>
                                {editAccId ? 'Editar Conta' : 'Nova Conta'}
                            </h2>
                            <button type="button" className="btn btn-icon" onClick={() => setIsAccModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="input-group">
                                    <label className="form-label">Nome da Conta</label>
                                    <input type="text" required className="form-input w-full" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group">
                                        <label className="form-label">Tipo</label>
                                        <select className="form-input w-full" value={newAccount.type} onChange={e => setNewAccount({...newAccount, type: e.target.value})}>
                                            <option value="checking">Conta/Bancária</option>
                                            <option value="cash">Carteira (Espécie)</option>
                                            <option value="credit">Cartão de Crédito</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Saldo Inicial</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>R$</span>
                                            <input type="number" step="0.01" className="form-input w-full" style={{ paddingLeft: '32px' }} value={newAccount.balance} onChange={e => setNewAccount({...newAccount, balance: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                                {newAccount.type === 'credit' && (
                                    <div className="input-group p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl justify-center items-center">
                                        <label className="form-label text-purple-900 dark:text-purple-300">Limite do Cartão</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>R$</span>
                                            <input type="number" step="0.01" className="form-input w-full border-purple-200" style={{ paddingLeft: '32px' }} value={newAccount.limit} onChange={e => setNewAccount({...newAccount, limit: e.target.value})} />
                                        </div>
                                    </div>
                                )}
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button type="button" onClick={() => setIsAccModalOpen(false)} className="btn" style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--primary)' }}>{editAccId ? 'Atualizar' : 'Salvar Conta'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isTransModalOpen && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 1000 }}>
                    <div className="modal-content animate-scale-in" style={{ maxWidth: '500px', width: '95%', backgroundColor: 'var(--surface)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                    <FileText size={20} />
                                </div>
                                {editTransId ? 'Editar Lançamento' : 'Novo Lançamento'}
                            </h2>
                            <button type="button" className="btn btn-icon" onClick={() => setIsTransModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '70vh' }} className="scrollbar-hide">
                            <form onSubmit={handleSaveTrans} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="input-group">
                                    <label className="form-label">Descrição da Movimentação</label>
                                    <input type="text" required className="form-input w-full" placeholder="Ex: Fornecedor Papel" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group">
                                        <label className="form-label">Valor (R$)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>R$</span>
                                            <input type="number" step="0.01" required className="form-input w-full font-bold" style={{ paddingLeft: '32px' }} value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Tipo de Lançamento</label>
                                        <select 
                                            className="form-input w-full font-bold" 
                                            style={{ color: newTrans.type === 'income' ? '#10b981' : '#ef4444', backgroundColor: newTrans.type === 'income' ? '#ecfdf5' : '#fef2f2' }}
                                            value={newTrans.type} onChange={e => setNewTrans({...newTrans, type: e.target.value, category: e.target.value === 'income' ? 'Vendas de Produtos' : 'Outros'})}>
                                            <option value="expense">Despesa (Saída -)</option>
                                            <option value="income">Receita (Entrada +)</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group">
                                        <label className="form-label">Centro de Custo</label>
                                        <div className="flex gap-2">
                                            <select required className="form-input flex-1" value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})}>
                                                <option value="">Selecione...</option>
                                                {(newTrans.type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="btn p-2 shrink-0 flex items-center justify-center" style={{ width: '40px', height: '40px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }} title="Gerenciar Categorias">
                                                <Settings size={18} className="text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Conta/Cartão Relacionado</label>
                                        <select required className="form-input w-full" value={newTrans.accountId} onChange={e => setNewTrans({...newTrans, accountId: e.target.value})}>
                                            <option value="">Selecione a fonte...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="input-group">
                                     <label className="form-label flex items-center gap-1.5"><Hammer size={14} className="text-gray-400" /> Vincular a Equipamento (Opcional)</label>
                                     <select className="form-input w-full" value={newTrans.referenceId || ''} onChange={e => setNewTrans({...newTrans, referenceId: e.target.value, referenceType: e.target.value ? 'Equipment' : null})}>
                                         <option value="">Nenhum / Não aplicável</option>
                                         {equipments.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.patrimonyId})</option>)}
                                     </select>
                                </div>
                                
                                {(() => {
                                    const isCredit = accounts.find(a => String(a.id) === String(newTrans.accountId))?.type === 'credit';
                                    
                                    return (
                                        <>
                                            {/* Crédito e Despesa */}
                                            {isCredit && newTrans.type === 'expense' && !editTransId && (
                                                <div className="input-group p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100">
                                                    <label className="form-label text-purple-900 dark:text-purple-300 flex items-center gap-2 mb-3">
                                                        <CreditCard size={16} /> Condição de Pagamento (Cartão)
                                                    </label>
                                                    <select className="form-input w-full bg-white dark:bg-gray-800 border-purple-200 focus:border-purple-500 focus:ring-purple-500" value={newTrans.installments} onChange={e => setNewTrans({...newTrans, installments: e.target.value})}>
                                                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                                            <option key={n} value={n}>{n === 1 ? '1x (À vista na próxima fatura)' : `${n}x de R$ ${(Number(newTrans.amount || 0)/n).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}</option>
                                                        ))}
                                                    </select>
                                                    <div className="text-[11px] text-purple-600/70 dark:text-purple-300/70 mt-3 flex items-start gap-1">
                                                        <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                                        Dica: A transação será cobrada diretamente nas faturas de acordo com o fechamento deste cartão. Jogue o Valor Total da compra Acima.
                                                    </div>
                                                </div>
                                            )}

                                            {/* Datas (não for crédito ou editTransId) */}
                                            {(!isCredit || editTransId || newTrans.type === 'income') && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div className="input-group">
                                                        <label className="form-label flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> Competência / Fato</label>
                                                        <input type="date" required className="form-input w-full" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="form-label">Situação</label>
                                                        <select required className="form-input w-full" value={newTrans.status} onChange={e => setNewTrans({...newTrans, status: e.target.value})}>
                                                            <option value="paid">{newTrans.type === 'income' ? 'Recebido/Creditado (+)' : 'Pago/Debitado (-)'}</option>
                                                            <option value="pending">{newTrans.type === 'income' ? 'A Receber (Proj.)' : 'A Pagar (Proj.)'}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Controle Automático Recorrente */}
                                            {!editTransId && !isCredit && (
                                                <div style={{ backgroundColor: 'var(--surface-hover)', borderRadius: '12px', padding: '16px', marginTop: '8px', border: '1px solid var(--border)' }}>
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={newTrans.isRecurring} 
                                                            onChange={e => setNewTrans({...newTrans, isRecurring: e.target.checked})} 
                                                            className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary" 
                                                            style={{ accentColor: 'var(--primary)' }}
                                                        />
                                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Lançamento Controlado Automático</span>
                                                    </label>
                                                    {newTrans.isRecurring && (
                                                        <div className="mt-3 pl-7 flex items-center gap-3 animate-fade-in">
                                                            <span className="text-sm text-gray-500 font-medium">Repetir por</span>
                                                            <input type="number" min="2" max="60" className="form-input w-20 text-center py-1.5" value={newTrans.recurrenceMonths} onChange={e => setNewTrans({...newTrans, recurrenceMonths: e.target.value})} />
                                                            <span className="text-sm text-gray-500 font-medium">meses todo dia {newTrans.date.split('-')[2] || '01'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button type="button" onClick={() => setIsTransModalOpen(false)} className="btn" style={{ backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--primary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <CheckCircle size={16} />
                                        Salvar Lançamento
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isCategoryModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Gerenciar Centros de Custo</h2>
                            <button type="button" className="btn btn-icon" onClick={() => setIsCategoryModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '24px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label text-xs mb-1">Nome da Categoria</label>
                                    <input type="text" required className="form-input" style={{ width: '100%' }} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ex: Material Gráfico..." />
                                </div>
                                <div style={{ width: '112px' }}>
                                    <label className="form-label text-xs mb-1">Tipo</label>
                                    <select className="form-input" style={{ width: '100%' }} value={newCategoryType} onChange={e => setNewCategoryType(e.target.value)}>
                                        <option value="expense">Despesa</option>
                                        <option value="income">Receita</option>
                                    </select>
                                </div>
                                <div style={{ width: '48px' }}>
                                    <label className="form-label text-xs mb-1">Cor</label>
                                    <input type="color" style={{ width: '100%', height: '38px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }} value={newCategoryColor} onChange={e => setNewCategoryColor(e.target.value)} />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }} title="Adicionar Categoria">
                                    <Plus size={16} />
                                </button>
                            </form>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Despesas (-)</h4>
                                    <div className="flex flex-col gap-2">
                                        {rawCategories.filter(c => c.type === 'expense').map(c => (
                                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #f3f4f6' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color }}></div>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>{c.name}</span>
                                                </div>
                                                <button onClick={() => handleDeleteCategory(c.id, c.name)} style={{ color: '#9ca3af', padding: '4px', border: 'none', background: 'none', cursor: 'pointer' }} title={`Excluir ${c.name}`}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Receitas (+)</h4>
                                    <div className="flex flex-col gap-2">
                                        {rawCategories.filter(c => c.type === 'income').map(c => (
                                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #f3f4f6' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color }}></div>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>{c.name}</span>
                                                </div>
                                                <button onClick={() => handleDeleteCategory(c.id, c.name)} style={{ color: '#9ca3af', padding: '4px', border: 'none', background: 'none', cursor: 'pointer' }} title={`Excluir ${c.name}`}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
