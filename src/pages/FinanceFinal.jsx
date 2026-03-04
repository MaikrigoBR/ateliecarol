
import React, { useState, useEffect } from 'react';
import { 
    CreditCard, Wallet, TrendingUp, TrendingDown, Plus, 
    Calendar, DollarSign, Filter, MoreHorizontal, CheckCircle, AlertCircle, Trash2, BarChart2, Edit2,
    ShoppingBag, Truck, Briefcase, Tag, Zap, Coffee, ArrowUpRight, ArrowDownLeft, Landmark, LayoutGrid, ArrowRight, X
} from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import { 
    ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import '../css/pages.css';
import { calculateFinancialStats } from '../components/FinanceHelpers';
import { CreditCardManagerModal } from '../components/CreditCardManagerModal';

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
    'Aportes / Rendimentos': '#8b5cf6'
};

// --- Components from Dashboard ---

function StatCard({ title, value, icon: Icon, color, subtext, valueColor }) {
    const getColor = (c) => {
        const map = {
            'primary': 'var(--primary)',
            'green': '#10b981', // Emerald 500
            'orange': '#f59e0b', // Amber 500
            'purple': '#8b5cf6', // Violet 500
            'blue': '#3b82f6',   // Blue 500
            'red': '#ef4444',    // Red 500
            'indigo': '#6366f1'
        };
        return map[c] || c;
    };

    const activeColor = getColor(color);

    return (
        <div className="stat-card" style={{ borderLeftColor: activeColor }}>
            <div className="flex-1">
                <p style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: 'var(--text-muted)',
                    marginBottom: '0.25rem'
                }}>{title}</p>
                <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 700, 
                    color: valueColor || 'var(--text-main)',
                    lineHeight: 1.2
                }}>{value}</h3>
                {subtext && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>{subtext}</p>}
            </div>
            <div className="stat-icon-wrapper" style={{ 
                color: activeColor, 
                backgroundColor: `${activeColor}1A` 
            }}>
                <Icon size={24} />
            </div>
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
        const [day, month] = payload.value.split('/');
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={12} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight={600}>{day}</text>
                <text x={0} y={0} dy={24} textAnchor="middle" fill="#9ca3af" fontSize={10}>{month}</text>
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
            <div style={{ width: '65px', height: '100%', flexShrink: 0, backgroundColor: 'var(--surface, transparent)', zIndex: 10 }}>
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
                <div style={{ width: `${Math.max(100, data.length * 45)}px`, height: '100%', minHeight: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 20, right: 10, bottom: 20, left: 0 }} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={<CustomXAxisTick />} interval={0} />
                            
                            {/* Hide internal YAxis, rely on the sticky one */}
                            <YAxis hide={true} domain={[-maxVal, maxVal]} type="number" />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent', stroke: 'rgba(0,0,0,0.05)', strokeWidth: 20 }} />
                            
                            <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} />
                            <Line type="monotone" dataKey="Projeção" stroke="#34d399" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#34d399' }} />
                            
                            <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#ef4444' }} />
                            <Line type="monotone" dataKey="APagar" stroke="#f87171" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#f87171' }} />
                            
                            <Line 
                                type="monotone" 
                                dataKey="Saldo" 
                                stroke="#3b82f6" 
                                strokeWidth={2} 
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
                            />
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
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);
    const [costCenterData, setCostCenterData] = useState([]);
    
    // Global Dash Filter
    const [globalAccFilter, setGlobalAccFilter] = useState('');
    
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
    const [newTrans, setNewTrans] = useState({ description: '', amount: '', type: 'expense', category: 'Geral', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12 });
    const [selectedCreditCard, setSelectedCreditCard] = useState(null);


    // Calculations
    useEffect(() => {
        console.log("FinanceFinal: Recalculating Stats. Loading:", loading);
        if (!loading) {
            // Apply Global Filter 
            const filteredAccounts = globalAccFilter ? accounts.filter(a => a.id === globalAccFilter) : accounts;
            const filteredTrans = globalAccFilter ? transactions.filter(t => t.accountId === globalAccFilter) : transactions;

            // 1. Chart Data
            const data = calculateFinancialStats(filteredTrans, orders, filteredAccounts, { daysBack: 30, daysForward: 60 });
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
            currentMonthTrans.filter(t => t.type === 'expense').forEach(t => {
                const cat = t.category || 'Outros';
                expenseMap[cat] = (expenseMap[cat] || 0) + Number(t.amount);
            });
            const costCenterFormat = Object.keys(expenseMap).map(k => ({
                name: k,
                value: expenseMap[k],
                color: CATEGORY_COLORS[k] || '#9ca3af'
            })).sort((a,b) => b.value - a.value);

            setStats({
                totalBalance: totalBal,
                monthIncome: income,
                monthExpense: expense,
                result: income - expense,
                creditDebt: creditUsed
            });
            setCostCenterData(costCenterFormat);
        }
    }, [transactions, orders, accounts, loading, globalAccFilter]);

    const fetchData = async () => {
        setLoading(true);
        const originalAccs = await db.getAll('accounts') || [];
        const trans = await db.getAll('transactions') || [];
        const allOrders = await db.getAll('orders') || [];
        
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
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

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
             recurrenceMonths: 12
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

        if (editTransId) {
            await db.update('transactions', editTransId, payload);
        } else {
            if (installments > 1 && isCredit && payload.type === 'expense') {
                const promises = [];
                const installmentAmount = amount / installments;
                const parentId = `group_${Date.now()}`;
                const [y, m, d] = payload.date.split('-');
                
                for(let i = 0; i < installments; i++) {
                    // Avança 1 mês para cada nova parcela
                    const targetDate = new Date(Number(y), Number(m) - 1 + i, Number(d));
                    // Handle timezone inconsistencies by formatting manually or using UTC string part
                    const isoDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`;

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
                    const [y, m, d] = payload.date.split('-');
                    
                    for(let i = 0; i < newTrans.recurrenceMonths; i++) {
                        const targetDate = new Date(Number(y), Number(m) - 1 + i, Number(d));
                        const isoDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`;
                        
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
        setNewTrans({ description: '', amount: '', type: 'expense', category: 'Outros', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12 });
        fetchData();
    };

    const handleDeleteTrans = async (id) => {
        if(confirm('Tem certeza que deseja excluir esse lançamento? O saldo das contas será atualizado.')) {
            await db.delete('transactions', id);
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
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select 
                        className="form-input" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', backgroundColor: 'var(--surface-hover)', border: 'none', fontWeight: 600, color: 'var(--text-main)' }}
                        value={globalAccFilter} 
                        onChange={e => setGlobalAccFilter(e.target.value)}
                    >
                        <option value="">Consolidado Global (Todas)</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <button 
                        onClick={() => {
                            setEditTransId(null);
                            setNewTrans({ description: '', amount: '', type: 'expense', category: 'Outros', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12 });
                            setIsTransModalOpen(true);
                        }}
                        className="btn btn-primary btn-sm flex items-center gap-2"
                        style={{ padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.875rem' }}
                    >
                        <Plus size={16} /> Novo Lançamento
                    </button>
                    <button 
                        onClick={() => {
                            setEditAccId(null);
                            setNewAccount({ name: '', type: 'checking', balance: 0, limit: 0, dueDay: 10, color: '#3b82f6' });
                            setIsAccModalOpen(true);
                        }}
                        className="btn bg-white border border-gray-200 text-gray-700 btn-sm flex items-center gap-2 hover:bg-gray-50 transition-colors"
                         style={{ padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.875rem' }}
                    >
                         <Wallet size={16} /> Nova Conta
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="dashboard-grid">
                <StatCard 
                    title={globalAccFilter ? "Saldo da Conta" : "Saldo Consolidado"} 
                    value={`${stats.totalBalance < 0 ? '-' : ''}R$ ${Math.abs(stats.totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={Wallet} 
                    color={stats.totalBalance < 0 ? 'red' : 'blue'}
                    valueColor={stats.totalBalance < 0 ? '#ef4444' : undefined}
                    subtext={globalAccFilter ? "Atualizado para esta conta" : "Balanço líquido total das contas"}
                />
                <StatCard 
                    title="Receitas (Mês)" 
                    value={`R$ ${stats.monthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={TrendingUp} 
                    color="green"
                    subtext="Entradas realizadas"
                />
                <StatCard 
                    title="Despesas (Mês)" 
                    value={`R$ ${stats.monthExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={TrendingDown} 
                    color="red"
                    subtext="Saídas realizadas"
                />
                 <StatCard 
                    title="Fatura Cartão" 
                    value={`R$ ${stats.creditDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={CreditCard} 
                    color="purple"
                    subtext="Total em aberto"
                />
            </div>

            {/* Charts Grid */}
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
                {/* Main Dynamic Chart */}
                <div className="chart-card flex-1" style={{ overflow: 'hidden' }}>
                    <div className="chart-header" style={{ justifyContent: 'space-between' }}>
                        <div className="flex items-center gap-2">
                             <BarChart2 size={20} color="var(--primary)" /> Fluxo Diário
                        </div>
                        {/* Legend Chips - Simplified */}
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

                {/* Cost Center / DRE Chart */}
                <div className="chart-card lg:w-1/3" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="chart-header">
                        <div className="flex items-center gap-2">
                             <PieChart size={20} color="var(--primary)" /> Distribuição de Custos
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
                        {costCenterData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={costCenterData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {costCenterData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="w-full px-4 mt-2 space-y-2 max-h-[100px] overflow-y-auto scrollbar-hide">
                                    {costCenterData.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                                                <span className="text-gray-600 font-medium truncate max-w-[120px]">{d.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-800">R$ {d.value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
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

            {/* Horizontal Accounts List Below Chart */}
            <div className="chart-card mb-8">
                <div className="chart-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                         <Wallet size={20} color="var(--primary)" /> <span>Minhas Contas</span>
                    </div>
                </div>
                
                <div className="flex flex-col gap-8 mt-4">
                    {/* Checking / Savings Accounts */}
                    <div className="flex flex-col gap-3">
                        <h4 className="text-[0.8rem] font-bold text-gray-500 tracking-wide pl-1">Contas Corrente / Carteira</h4>
                        
                        <div className="table-container border rounded-xl overflow-hidden mt-1 shadow-sm" style={{ borderColor: 'var(--border)' }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--surface)' }}>
                                <thead>
                                    <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 'bold' }}>Descrição</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 'bold' }}>Saldo Disponível</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', width: '100px', fontWeight: 'bold' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.filter(a => a.type !== 'credit').length === 0 ? (
                                        <tr>
                                            <td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>
                                                Nenhuma conta cadastrada.
                                            </td>
                                        </tr>
                                    ) : (
                                        accounts.filter(a => a.type !== 'credit').map(acc => {
                                            const balance = Number(acc.balance || 0);
                                            return (
                                                <tr key={acc.id} className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/20 border-t" style={{ borderColor: 'var(--border)' }}>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600 shrink-0">
                                                                <Landmark size={18} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[0.95rem] font-bold text-gray-800" style={{ color: 'var(--text-main)' }}>{acc.name}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <span className={`text-[1.1rem] font-bold ${balance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {balance < 0 ? '-' : ''}R$ {Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div className="flex flex-row items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openEditAccount(acc)} className="p-2 bg-white outline outline-1 outline-gray-200 dark:bg-gray-800 dark:outline-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors shadow-sm flex justify-center" title="Editar Conta"><Edit2 size={16} /></button>
                                                            <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 bg-white outline outline-1 outline-gray-200 dark:bg-gray-800 dark:outline-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors shadow-sm flex justify-center" title="Excluir Conta"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Credit Cards */}
                    <div className="flex flex-col gap-3 mt-4">
                        <h4 className="text-[0.8rem] font-bold text-gray-500 tracking-wide pl-1">Cartões de Crédito</h4>
                        
                        <div className="table-container border rounded-xl overflow-hidden mt-1 shadow-sm" style={{ borderColor: 'var(--border)' }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--surface)' }}>
                                <thead>
                                    <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 'bold' }}>Cartão</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', width: '90px', fontWeight: 'bold' }}>Fechamento</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', width: '90px', fontWeight: 'bold' }}>Venc.</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', width: '25%', fontWeight: 'bold' }}>Comprometimento</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 'bold' }}>Fatura Atual</th>
                                        <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', width: '100px', fontWeight: 'bold' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.filter(a => a.type === 'credit').length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>
                                                Nenhum cartão cadastrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        accounts.filter(a => a.type === 'credit').map(acc => {
                                            const balance = Number(acc.balance || 0);
                                            const limit = Number(acc.limit || 0);
                                            const debt = balance < 0 ? -balance : 0;
                                            const percent = limit > 0 ? (debt / limit) * 100 : 0;
                                            const dueDay = acc.dueDay || 10;
                                            let bestDay = dueDay - 7;
                                            if (bestDay <= 0) bestDay += 30; // Approximation for best day

                                            return (
                                                <tr key={acc.id} onClick={() => setSelectedCreditCard(acc)} className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/20 border-t cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-50 text-purple-600 shrink-0">
                                                                <CreditCard size={18} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[0.95rem] font-bold text-gray-800" style={{ color: 'var(--text-main)' }}>{acc.name}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 font-bold text-xs shadow-sm border border-emerald-100" title={`Melhor dia para compra: dia ${bestDay}`}>
                                                            {bestDay}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-red-50 text-red-600 font-bold text-xs shadow-sm border border-red-100" title={`Vencimento da fatura: dia ${dueDay}`}>
                                                            {dueDay}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div className="flex flex-col gap-1.5 w-full">
                                                            <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                                                                <span>{percent.toFixed(1)}% Usado</span>
                                                                <span className="font-bold text-gray-400">Livre: R$ {Math.max(0, limit - debt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--surface-hover)' }}>
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ${percent > 90 ? 'bg-red-500' : (percent > 70 ? 'bg-orange-400' : 'bg-purple-500')}`}
                                                                    style={{ width: `${Math.min(100, percent)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <span className="text-[1.1rem] font-bold text-purple-600 tracking-tight">
                                                            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div className="flex flex-row items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => { e.stopPropagation(); openEditAccount(acc); }} className="p-2 bg-white outline outline-1 outline-gray-200 dark:bg-gray-800 dark:outline-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors shadow-sm flex justify-center" title="Editar Conta"><Edit2 size={16} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id); }} className="p-2 bg-white outline outline-1 outline-gray-200 dark:bg-gray-800 dark:outline-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors shadow-sm flex justify-center" title="Excluir Conta"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            {/* Recent Transactions Table */}
    <div className="chart-card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Últimos Lançamentos</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                 <input 
                    type="text" 
                    placeholder="Buscar (Descrição)..." 
                    className="form-input" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                    value={transSearchTerm}
                    onChange={(e) => setTransSearchTerm(e.target.value)}
                 />
                 <select 
                    className="form-input" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', backgroundColor: 'var(--surface)' }}
                    value={transTypeFilter} 
                    onChange={e => setTransTypeFilter(e.target.value)}
                 >
                    <option value="">Tipo (Todos)</option>
                    <option value="income">Receita (+)</option>
                    <option value="expense">Despesa (-)</option>
                 </select>
                 <select 
                    className="form-input" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', backgroundColor: 'var(--surface)' }}
                    value={transAccFilter} 
                    onChange={e => setTransAccFilter(e.target.value)}
                 >
                    <option value="">Conta (Todas)</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
            </div>
        </div>
                <div className="table-container">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Data</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Descrição</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Centro de Custo</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Conta</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Valor</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Saldo Conta</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                        <tbody>
                            {transactionsWithBalance
                                .filter(t => {
                                    const acc = accounts.find(a => a.id === t.accountId);
                                    // Esconde lançamentos de cartão da visão geral
                                    if (acc?.type === 'credit' && transAccFilter === '' && globalAccFilter === '') {
                                        return false;
                                    }

                                    const search = transSearchTerm.toLowerCase();
                                    const matchesSearch = t.description?.toLowerCase().includes(search);
                                    const matchesType = transTypeFilter === '' || t.type === transTypeFilter;
                                    const matchesAcc = transAccFilter === '' || t.accountId === transAccFilter;
                                    return matchesSearch && matchesType && matchesAcc;
                                })
                                .slice(0, 15)
                                .map(t => {
                                const acc = accounts.find(a => a.id === t.accountId);
                                const isExpense = t.type === 'expense';
                                return (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-gray-50/10 transition-colors">
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                            {new Date(t.date).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                            {t.description}
                                            {t.installmentsTotal > 1 && <span className="ml-2 text-[10px] text-blue-500 bg-blue-50/20 px-1.5 rounded">{t.installmentNumber}/{t.installmentsTotal}</span>}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            <span style={{ 
                                                backgroundColor: CATEGORY_COLORS[t.category] ? `${CATEGORY_COLORS[t.category]}15` : '#f3f4f6', 
                                                color: CATEGORY_COLORS[t.category] || '#4b5563',
                                                padding: '2px 8px',
                                                borderRadius: '999px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {t.category || 'Outros'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {acc?.name || '-'}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: isExpense ? '#ef4444' : '#10b981' }}>
                                            {isExpense ? '-' : '+'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            {t.status !== 'paid' && <span style={{ display: 'block', fontSize: '0.65rem', color: '#f59e0b', fontWeight: 500 }}>pendente</span>}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, color: t.runningBalance < 0 ? '#ef4444' : (globalAccFilter ? 'var(--text-main)' : 'var(--text-muted)'), fontSize: '0.85rem' }}>
                                            {globalAccFilter ? (
                                                <>{t.runningBalance < 0 ? '-' : ''}R$ {Math.abs(t.runningBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                                            ) : (
                                                <span title="Filtre uma conta específica para visualizar o extrato" style={{ opacity: 0.5 }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                {t.status !== 'paid' && (
                                                    <button onClick={() => handleConfirmPayment(t)} className="text-orange-400 hover:text-emerald-500 transition-colors" title="Dar Baixa (Confirmar Pgt/Recto)">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => openEditTrans(t)} className="text-gray-300 hover:text-blue-500 transition-colors" title="Editar Lançamento">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteTrans(t.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Excluir">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {transactionsWithBalance.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center text-gray-400 py-8 text-sm">Nenhum lançamento encontrado com os filtros atuais.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <CreditCardManagerModal
                isOpen={!!selectedCreditCard}
                onClose={() => setSelectedCreditCard(null)}
                account={selectedCreditCard}
                accounts={accounts}
                transactions={transactions}
                onUpdate={fetchData}
            />

            {isAccModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content" style={{ maxWidth: '450px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editAccId ? 'Editar' : 'Nova'} Conta</h2>
                            <button type="button" className="btn btn-icon" onClick={() => setIsAccModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSaveAccount} className="space-y-4">
                                <div className="input-group">
                                    <label className="form-label">Nome da Conta</label>
                                    <input type="text" required className="form-input w-full" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="form-label">Tipo</label>
                                        <select className="form-input w-full" value={newAccount.type} onChange={e => setNewAccount({...newAccount, type: e.target.value})}>
                                            <option value="checking">Conta Corrente</option>
                                            <option value="cash">Carteira (Dinheiro)</option>
                                            <option value="credit">Cartão de Crédito</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Saldo Inicial</label>
                                        <input type="number" step="0.01" className="form-input w-full" value={newAccount.balance} onChange={e => setNewAccount({...newAccount, balance: e.target.value})} />
                                    </div>
                                </div>
                                {newAccount.type === 'credit' && (
                                    <div className="input-group">
                                        <label className="form-label">Limite do Cartão</label>
                                        <input type="number" step="0.01" className="form-input w-full" value={newAccount.limit} onChange={e => setNewAccount({...newAccount, limit: e.target.value})} />
                                    </div>
                                )}
                                <div className="modal-footer" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                    <button type="button" onClick={() => setIsAccModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isTransModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editTransId ? 'Editar' : 'Novo'} Lançamento</h2>
                            <button type="button" className="btn btn-icon" onClick={() => setIsTransModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSaveTrans} className="space-y-4">
                                <div className="input-group">
                                    <label className="form-label">Descrição</label>
                                    <input type="text" required className="form-input w-full" value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="form-label">Valor</label>
                                        <input type="number" step="0.01" required className="form-input w-full" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} />
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Tipo</label>
                                        <select className="form-input w-full" value={newTrans.type} onChange={e => setNewTrans({...newTrans, type: e.target.value, category: e.target.value === 'income' ? 'Vendas de Produtos' : 'Outros'})}>
                                            <option value="expense">Despesa (-)</option>
                                            <option value="income">Receita (+)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="form-label">Centro de Custo</label>
                                        <select required className="form-input w-full" value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {(newTrans.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Conta/Cartão</label>
                                        <select required className="form-input w-full" value={newTrans.accountId} onChange={e => setNewTrans({...newTrans, accountId: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {accounts.find(a => String(a.id) === String(newTrans.accountId))?.type === 'credit' && newTrans.type === 'expense' && !editTransId && (
                                    <div className="input-group">
                                        <label className="form-label">Parcelas no Cartão</label>
                                        <select className="form-input w-full" value={newTrans.installments} onChange={e => setNewTrans({...newTrans, installments: e.target.value})}>
                                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                                <option key={n} value={n}>{n === 1 ? '1x (À vista)' : `${n}x de (R$ ${(Number(newTrans.amount || 0)/n).toLocaleString('pt-BR', {minimumFractionDigits: 2})})`}</option>
                                            ))}
                                        </select>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Dica: Se houver acréscimos/juros na maquininha, digite o Valor <b>Total final</b> acima.
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label className="form-label">Data</label>
                                        <input type="date" required className="form-input w-full" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} />
                                    </div>
                                    <div className="input-group">
                                        <label className="form-label">Situação</label>
                                        <select required className="form-input w-full" value={newTrans.status} onChange={e => setNewTrans({...newTrans, status: e.target.value})}>
                                            <option value="paid">{newTrans.type === 'income' ? 'Recebido' : 'Pago'}</option>
                                            <option value="pending">{newTrans.type === 'income' ? 'A Receber' : 'A Pagar'}</option>
                                        </select>
                                    </div>
                                </div>
                                {!editTransId && accounts.find(a => String(a.id) === String(newTrans.accountId))?.type !== 'credit' && (
                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mt-4">
                                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                                            <input type="checkbox" checked={newTrans.isRecurring} onChange={e => setNewTrans({...newTrans, isRecurring: e.target.checked})} className="rounded text-blue-500" />
                                            <span className="text-sm font-bold text-gray-700">Comportamento Fixo / Recorrente</span>
                                        </label>
                                        {newTrans.isRecurring && (
                                            <div className="pl-6 flex items-center gap-3">
                                                <span className="text-sm text-gray-500">Repetir mensalmente por</span>
                                                <input type="number" min="2" max="60" className="form-input w-24" value={newTrans.recurrenceMonths} onChange={e => setNewTrans({...newTrans, recurrenceMonths: e.target.value})} />
                                                <span className="text-sm text-gray-500">meses</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="modal-footer" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                    <button type="button" onClick={() => setIsTransModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Salvar Lançamento</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
