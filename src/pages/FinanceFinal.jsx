import React, { useState, useEffect, useMemo } from 'react';
import { 
    CreditCard, Wallet, TrendingUp, TrendingDown, Plus, 
    Calendar, DollarSign, Filter, MoreHorizontal, CheckCircle, AlertCircle, Trash2, BarChart2, Edit2,
    ShoppingBag, Truck, Briefcase, Tag, Zap, Coffee, ArrowUpRight, ArrowDownLeft, Landmark, LayoutGrid, ArrowRight, X, Settings, Search, FileText, Hammer, ListOrdered, ArrowDownRight, Check, Upload, ShieldCheck, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import { 
    ComposedChart, Bar, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import '../css/pages.css';
import { calculateFinancialStats } from '../components/FinanceHelpers';
import { CreditCardManagerModal } from '../components/CreditCardManagerModal';
import { FinanceTransactionDetailsModal } from '../components/FinanceTransactionDetailsModal';
import { FinanceAIInsights, SimpleDRETable } from '../components/FinanceAIInsights';
import { FinanceBatchEntryModal } from '../components/FinanceBatchEntryModal';
import { formatCurrency, groupByInvoiceCycle } from '../utils/financeUtils';
import FinanceAuditService from '../services/FinanceAuditService';
import { AuditReportModal } from '../components/AuditReportModal';
import { FinanceProjectionDashboard } from '../components/FinanceProjectionDashboard';
import { FinanceBankImport } from '../components/FinanceBankImport';

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

function SciFiStatCard({ title, value, icon: Icon, color, subtext, isActive, onClick }) {
    const getColorTheme = (c) => {
        const map = {
            'green': { glow: 'rgba(16, 185, 129, 0.3)', text: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', grad: 'linear-gradient(135deg, #10b981, #059669)' },
            'orange': { glow: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
            'purple': { glow: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', grad: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
            'blue': { glow: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', grad: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
            'red': { glow: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', grad: 'linear-gradient(135deg, #ef4444, #dc2626)' },
            'emerald': { glow: 'rgba(52, 211, 153, 0.3)', text: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', grad: 'linear-gradient(135deg, #10b981, #059669)' },
            'primary': { glow: 'rgba(99, 102, 241, 0.3)', text: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.15)', grad: 'linear-gradient(135deg, var(--primary), #4f46e5)' }
        };
        return map[c] || map['blue'];
    };

    const theme = getColorTheme(color);

    return (
        <div 
            className={`stat-card relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl ${isActive ? 'active-stat' : ''}`} 
            style={{ 
                borderRadius: '24px',
                cursor: onClick ? 'pointer' : 'default',
                transform: isActive ? 'translateY(-6px)' : 'none',
                boxShadow: isActive ? `0 20px 40px -12px ${theme.glow}` : '0 4px 6px -1px rgba(0,0,0,0.05)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                backdropFilter: 'blur(10px)',
                padding: '24px',
                minHeight: '130px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                animation: isActive ? 'pulse-subtle 4s infinite' : 'none'
            }}
            onClick={onClick}
        >
            <div 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '6px', 
                    height: '100%', 
                    background: theme.grad,
                    opacity: 0.8
                }} 
            />

            <div className="flex-1" style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ 
                    fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.7
                }}>{title}</p>
                <h3 style={{ 
                    fontSize: '1.75rem', fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-0.04em', margin: 0, lineHeight: 1
                }}>{value}</h3>
                {subtext && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.text, opacity: 0.6 }}></div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>{subtext}</p>
                    </div>
                )}
            </div>
            
            <div className="stat-icon-wrapper shrink-0" style={{ 
                background: theme.grad,
                color: 'white',
                width: '54px', height: '54px', borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 16px -4px ${theme.glow}`,
                transform: isActive ? 'rotate(-6deg) scale(1.1)' : 'none',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <Icon size={26} strokeWidth={2.5} />
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
                                 R$ {formatCurrency(d.Saldo)}
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
                                `R$ ${Math.abs(val) > 999 ? formatCurrency(val/1000) + 'k' : formatCurrency(val)}`
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
    const { user } = useAuth();
    const [selectedTransIds, setSelectedTransIds] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [orders, setOrders] = useState([]); // Active for projections
    const [totalOrders, setTotalOrders] = useState([]); // All for DRE
    const [equipments, setEquipments] = useState([]); // For linking
    const [materials, setMaterials] = useState([]); // For linking
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);
    const [costCenterData, setCostCenterData] = useState([]);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [view, setView] = useState('overview'); // Added: 'overview', 'projection' or 'import'
    
    // Dynamic Categories State
    const [expenseCategories, setExpenseCategories] = useState(EXPENSE_CATEGORIES);
    const [incomeCategories, setIncomeCategories] = useState(INCOME_CATEGORIES);
    const [categoryColors, setCategoryColors] = useState(CATEGORY_COLORS);
    
    // Manage Categories Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState('expense');
    const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
    const [newCategoryParent, setNewCategoryParent] = useState('');
    const [editCategoryId, setEditCategoryId] = useState(null);
    const [rawCategories, setRawCategories] = useState([]);
    
    // Global Dash Filter
    const [globalAccFilter, setGlobalAccFilter] = useState('');
    const [chartMode, setChartMode] = useState('daily');
    
    // Filters for Transactions Table
    const [transSearchTerm, setTransSearchTerm] = useState('');
    const [transTypeFilter, setTransTypeFilter] = useState('');
    const [transAccFilter, setTransAccFilter] = useState('');
    const [transStatusFilter, setTransStatusFilter] = useState('');
    const [transStartDate, setTransStartDate] = useState('');
    const [transEndDate, setTransEndDate] = useState('');
    
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
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportRange, setExportRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [editAccId, setEditAccId] = useState(null);
    const [editTransId, setEditTransId] = useState(null);
    const [newAccount, setNewAccount] = useState({ name: '', type: 'checking', balance: 0, limit: 0, dueDay: 10, closeDay: 3, color: '#3b82f6' });
    const [newTrans, setNewTrans] = useState({ description: '', amount: '', type: 'expense', category: 'Geral', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12, referenceId: '', referenceType: null });
    const [selectedCreditCard, setSelectedCreditCard] = useState(null);
    const [selectedDetailTrans, setSelectedDetailTrans] = useState(null);
    const [transDateFilter, setTransDateFilter] = useState('');
    const [visibleTransactionsLimit, setVisibleTransactionsLimit] = useState(50);

    // Audit System State
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [auditReport, setAuditReport] = useState([]);


    // Global Filtered Data
    const filteredAccounts = useMemo(() => {
        return globalAccFilter ? accounts.filter(a => a.id === globalAccFilter) : accounts;
    }, [accounts, globalAccFilter]);

    const filteredTrans = useMemo(() => {
        return globalAccFilter ? transactions.filter(t => t.accountId === globalAccFilter) : transactions;
    }, [transactions, globalAccFilter]);

    // --- NOVA LÓGICA DE AUDITORIA CONTÁBIL (V5) ---
    const allTransactions = useMemo(() => transactions || [], [transactions]);
    
    const auditStats = useMemo(() => {
        const total = allTransactions.length;
        if (total === 0) return { percent: 0, count: 0, total: 0 };
        const reconciled = allTransactions.filter(t => 
            t.linkedItemId || t.orderId || t.status === 'reconciled' || t.suggestedMatch || t.bankReferenceId
        ).length;
        return {
            percent: Math.round((reconciled / total) * 100),
            count: reconciled,
            total
        };
    }, [allTransactions]);

    const mlStats = useMemo(() => {
        const mlTrans = allTransactions.filter(t => 
            t.description?.toLowerCase().includes('mercado') || 
            t.description?.toLowerCase().includes('mp*') ||
            t.bankReferenceId
        );
        const total = mlTrans.length;
        if (total === 0) return { percent: 100, count: 0 };
        const withId = mlTrans.filter(t => t.bankReferenceId).length;
        return {
            percent: Math.round((withId / total) * 100),
            count: withId
        };
    }, [allTransactions]);

    // Calculations
    useEffect(() => {
        console.log("FinanceFinal: Recalculating Stats. Loading:", loading);
        if (!loading) {
            // Stats calculation logic...

            // 1. Chart Data
            const data = calculateFinancialStats(filteredTrans, orders, filteredAccounts, { mode: chartMode, daysBack: 30, daysForward: 60, monthsBack: 6, monthsForward: 6 });
            setChartData(data);

            // 2. KPI Stats
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            // Usar o filtro de data (Mês de Competência) se disponível
            let currentMonth = now.getMonth();
            let currentYear = now.getFullYear();
            
            if (transDateFilter) {
                const [y, m] = transDateFilter.split('-');
                currentYear = parseInt(y);
                currentMonth = parseInt(m) - 1;
            }

            const currentMonthTrans = filteredTrans.filter(t => {
                const d = new Date(t.date);
                // DRE is Accrual (Competence), so we include all transactions for that month regardless of paid status
                return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
            });

            // --- CÁLCULO DE DRE POR COMPETÊNCIA (ACCRUAL) ---
            // Pegamos o faturamento real (Pedidos criados no mês) + Outras receitas diretas
            const monthOrderRevenue = totalOrders.filter(o => {
                if (!o.createdAt) return false;
                const d = new Date(o.createdAt);
                return d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
            }).reduce((sum, o) => sum + Number(o.total || 0), 0);

            const directIncomes = currentMonthTrans.filter(t => t.type === 'income' && !t.orderId)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const accrualIncome = monthOrderRevenue + directIncomes;
            const expense = currentMonthTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
            
            // Accounts Payable Calculation
            const pendingExpenses = filteredTrans.filter(t => t.type === 'expense' && t.status === 'pending');
            const payableToday = pendingExpenses
                .filter(t => t.date === todayStr)
                .reduce((sum, t) => sum + Number(t.amount || 0), 0);
            
            const payableMonth = pendingExpenses
                .filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })
                .reduce((sum, t) => sum + Number(t.amount || 0), 0);

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

             // 4. Provisões (Contas a Pagar e Receber - Próximos 30 dias)
            const upcomingPayables = filteredTrans.filter(t => {
                const d = new Date(t.date);
                const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                return t.type === 'expense' && t.status === 'pending' && d >= now && d <= next30Days;
            }).sort((a,b) => new Date(a.date) - new Date(b.date));

            const upcomingReceivables = orders.filter(o => {
                const targetDate = o.nextDueDate || o.deadline;
                if (!targetDate) return false;
                const d = new Date(targetDate);
                const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                return d >= now && d <= next30Days;
            }).sort((a,b) => new Date(a.nextDueDate || a.deadline) - new Date(b.nextDueDate || b.deadline));

            // 5. Depreciação Automática (Estimada)
            // Calculamos a depreciação mensal de todos os equipamentos cadastrados (Ativo Imobilizado)
            // Assumindo vida útil média de 5 anos (60 meses) para equipamentos de ateliê
            const totalAssetValue = equipments.reduce((sum, eq) => sum + Number(eq.value || 0), 0);
            const monthlyDepreciation = totalAssetValue / 60;

            setStats({
                totalBalance: totalBal,
                monthIncome: accrualIncome,
                monthExpense: expense,
                result: accrualIncome - expense,
                creditDebt: creditUsed,
                gatewayTaxes: totalGatewayTaxes,
                expenseMap: expenseMap,
                payableToday,
                payableMonth,
                upcomingPayables,
                upcomingReceivables,
                monthlyDepreciation,
                totalAssetValue
            });
            setCostCenterData(costCenterFormat);
        }
    }, [transactions, orders, accounts, loading, globalAccFilter, chartMode, transDateFilter]);

    // Auto-clear selection when filters change (Safety First)
    React.useEffect(() => {
        setSelectedTransIds([]);
    }, [transSearchTerm, transTypeFilter, transAccFilter, globalAccFilter, transDateFilter, transStatusFilter, transStartDate, transEndDate]);

    const fetchData = async () => {
        setLoading(true);
        const originalAccs = await db.getAll('accounts') || [];
        const trans = await db.getAll('transactions') || [];
        const allOrders = await db.getAll('orders') || [];
        const allEquips = await db.getAll('equipments') || [];
        const allMaterials = await db.getAll('inventory') || [];
        
        // Fetch Categories
        let dbCategories = await db.getAll('categories') || [];
        
        // Seeding robust: Garantir que se o usuário deletar tudo ou estiver começando, os padrões entrem.
        // Se já houver categorias, não forcamos a entrada para respeitar exclusões manuais feitas pelo usuário no passado.
        if (dbCategories.length === 0) {
            const promises = [];
            for (const cat of EXPENSE_CATEGORIES) {
                promises.push(db.create('categories', { name: cat, type: 'expense', color: CATEGORY_COLORS[cat] || '#9ca3af', parentId: null }));
            }
            for (const cat of INCOME_CATEGORIES) {
                promises.push(db.create('categories', { name: cat, type: 'income', color: CATEGORY_COLORS[cat] || '#10b981', parentId: null }));
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
        setTotalOrders(allOrders);
        setEquipments(allEquips);
        setMaterials(allMaterials);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        
        const payload = { 
            name: newCategoryName.trim(), 
            type: newCategoryType, 
            color: newCategoryColor,
            parentId: newCategoryParent || null
        };

        if (editCategoryId) {
            await db.update('categories', editCategoryId, payload);
        } else {
            await db.create('categories', payload);
        }
        
        setNewCategoryName('');
        setNewCategoryParent('');
        setNewCategoryColor('#6366f1');
        setEditCategoryId(null);
        fetchData();
    };

    const openEditCategory = (c) => {
        setNewCategoryName(c.name);
        setNewCategoryType(c.type);
        setNewCategoryColor(c.color);
        setNewCategoryParent(c.parentId || '');
        setEditCategoryId(c.id);
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
            limit: acc.limit || 0,
            dueDay: acc.dueDay || 10,
            closeDay: acc.closeDay || 3
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
            limit: Number(newAccount.limit || 0),
            dueDay: Number(newAccount.dueDay || 10),
            closeDay: Number(newAccount.closeDay || 3)
        };
        
        if (editAccId) {
            await db.update('accounts', editAccId, payload);
        } else {
            await db.create('accounts', payload);
        }
        
        setIsAccModalOpen(false);
        setEditAccId(null);
        setNewAccount({ name: '', type: 'checking', balance: 0, limit: 0, dueDay: 10, closeDay: 3, color: '#3b82f6' });
        fetchData();
    };

    const handleRunAudit = async () => {
        const result = await FinanceAuditService.runFullAudit();
        setAuditReport(result);
        setIsAuditModalOpen(true);
    };

    const handleExportToAccountant = async () => {
        setIsExportModalOpen(true);
    };

    const performExport = async () => {
        try {
            const data = await FinanceAuditService.generateAccountantReport(exportRange.start, exportRange.end);
            
            if (!data || data.length === 0) {
                alert(`Nenhum dado auditado encontrado para o período ${exportRange.start.split('-').reverse().join('/')} até ${exportRange.end.split('-').reverse().join('/')}.`);
                return;
            }
            
            FinanceAuditService.exportToExcel(data, `AtelieCarol_Pacote_Contador_${exportRange.start}_a_${exportRange.end}`);
            setIsExportModalOpen(false);
            alert('Relatório gerado com sucesso!');
        } catch (err) {
            console.error('Export error:', err);
            alert('Falha ao gerar relatório.');
        }
    };

    const handleSetRangePreset = (type) => {
        const now = new Date();
        let start, end;

        switch(type) {
            case 'currentMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last3Months':
                start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'currentYear':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        setExportRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
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
                    `- Valor: R$ ${formatCurrency(amount)}\n` +
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
        if(confirm(`Confirmar que o valor de R$ ${formatCurrency(t.amount)} foi efetivamente ${t.type === 'income' ? 'creditado' : 'debitado'}?`)) {
            await db.update('transactions', t.id, { ...t, status: 'paid' });
            fetchData();
        }
    };

    const handleBulkPay = async () => {
        if (selectedTransIds.length === 0) return;
        if (confirm(`Deseja marcar ${selectedTransIds.length} lançamentos como PAGOS simultaneamente?`)) {
            const promises = selectedTransIds.map(id => {
                const item = transactions.find(t => t.id === id);
                if (item && item.status !== 'paid') {
                    return db.update('transactions', id, { ...item, status: 'paid' });
                }
                return null;
            }).filter(Boolean);
            
            await Promise.all(promises);
            setSelectedTransIds([]);
            fetchData();
            alert('Ação em lote concluída com sucesso!');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTransIds.length === 0) return;
        
        // 1. Fetch the actual records from the current filtered list to be absolutely sure what's being deleted
        const toDelete = selectedTransIds.map(id => transactions.find(x => x.id === id)).filter(Boolean);
        
        if (toDelete.length === 0) {
            setSelectedTransIds([]);
            return;
        }

        // 2. Anti-erro para transações de pedidos (bloqueia o lote se houver alguma de pedido lá no meio)
        const hasOrderTrans = toDelete.some(t => t.orderId && t.type === 'income');

        if (hasOrderTrans) {
            alert('AÇÃO CANCELADA (Proteção de Receita):\n\nNo lote selecionado existem transações vinculadas a Pedidos/Vendas (Seladas).\n\nEstas transações não podem ser apagadas em massa para evitar furos no fluxo de caixa fiscal. Desmarque-as ou estorne o pedido individualmente.');
            return;
        }

        const confirmMsg = `Deseja EXCLUIR DEFINITIVAMENTE ${toDelete.length} lançamentos selecionados?\n\nIsso afetará os saldos das contas correspondentes.\n\nESTA AÇÃO NÃO PODE SER DESFEITA.`;
        
        if (window.confirm(confirmMsg)) {
            try {
                console.log(`Starting bulk delete for ${toDelete.length} items...`);
                
                // Perform deletion in chunks or parallel with tracking
                const results = await Promise.all(toDelete.map(async (item) => {
                    const success = await db.delete('transactions', item.id);
                    return success;
                }));

                const successCount = results.filter(r => r === true).length;
                console.log(`Bulk delete finished. Success: ${successCount}/${toDelete.length}`);

                setSelectedTransIds([]);
                await fetchData();
                
                if (successCount === toDelete.length) {
                    alert(`Sucesso! ${successCount} lançamentos foram removidos.`);
                } else {
                    alert(`Aviso: ${successCount} de ${toDelete.length} foram removidos. Alguns itens podem não ter sido excluídos.`);
                }
            } catch (error) {
                console.error("Critical error during bulk delete:", error);
                alert("Ocorreu um erro ao processar a exclusão em lote. Verifique o console para detalhes.");
            }
        }
    };


    const accBalances = React.useMemo(() => {
        const balances = {};
        accounts.forEach(a => {
            balances[a.id] = Number(a.initialBalance || 0);
        });
        transactions.forEach(t => {
            if (t.status === 'paid') {
                const amt = Number(t.amount || 0);
                if (t.type === 'income') {
                    balances[t.accountId] = (balances[t.accountId] || 0) + amt;
                } else {
                    balances[t.accountId] = (balances[t.accountId] || 0) - amt;
                }
            }
        });
        return balances;
    }, [transactions, accounts]);

    const transactionsWithBalance = React.useMemo(() => {
        if (!accounts || accounts.length === 0) return transactions;
        
        const tempBalances = {};
        accounts.forEach(a => {
            tempBalances[a.id] = Number(a.initialBalance || 0);
        });

        const sortedTrans = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const result = sortedTrans.map(t => {
            if (t.status === 'paid') {
                const amt = Number(t.amount || 0);
                if (t.type === 'income') {
                    tempBalances[t.accountId] = (tempBalances[t.accountId] || 0) + amt;
                } else {
                    tempBalances[t.accountId] = (tempBalances[t.accountId] || 0) - amt;
                }
            }
            return {
                ...t,
                runningBalance: tempBalances[t.accountId] || 0
            };
        });

        return result.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, accounts]);

    const finalFilteredTrans = React.useMemo(() => {
        return transactionsWithBalance.filter(t => {
            const acc = accounts.find(a => a.id === t.accountId);
            const search = transSearchTerm.toLowerCase();
            const matchesSearch = t.description?.toLowerCase().includes(search) || t.category?.toLowerCase().includes(search);
            const matchesType = transTypeFilter === '' || t.type === transTypeFilter;
            const matchesAcc = (transAccFilter === '' || t.accountId === transAccFilter) && (globalAccFilter === '' || t.accountId === globalAccFilter);
            
            let matchesDate = true;
            if (transDateFilter) {
                const tMonth = t.date.substring(0, 7); // YYYY-MM
                matchesDate = tMonth === transDateFilter;
            }
            if (transStartDate && t.date < transStartDate) matchesDate = false;
            if (transEndDate && t.date > transEndDate) matchesDate = false;

            let matchesStatus = true;
            if (transStatusFilter) {
                if (transStatusFilter === 'paid') matchesStatus = t.status === 'paid';
                if (transStatusFilter === 'pending') {
                    const isOverdue = t.status === 'pending' && new Date(t.date) < new Date(new Date().setHours(0,0,0,0));
                    matchesStatus = t.status === 'pending' && !isOverdue;
                }
                if (transStatusFilter === 'overdue') {
                    matchesStatus = t.status === 'pending' && new Date(t.date) < new Date(new Date().setHours(0,0,0,0));
                }
                if (transStatusFilter === 'imported') {
                    matchesStatus = !!t.bankReferenceId;
                }
            }
            
            return matchesSearch && matchesType && matchesAcc && matchesDate && matchesStatus;
        });
    }, [transactionsWithBalance, accounts, transSearchTerm, transTypeFilter, transAccFilter, globalAccFilter, transDateFilter, transStartDate, transEndDate, transStatusFilter]);

    if (loading) return <div className="p-xl text-center">Carregando financeiro...</div>;

    return (
        <div className="animate-fade-in page-content">
            <div className="dashboard-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.04em' }}>
                        Inteligência Financeira
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
                        Controle de fluxo de caixa, auditoria e projeções futuristas.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Seletor de Conta Premium */}
                    <div style={{ position: 'relative', width: '220px' }}>
                        <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', zIndex: 2, display: 'flex' }}>
                             <Landmark size={18} strokeWidth={2.5} />
                        </div>
                        <select 
                            className="form-input" 
                            style={{ 
                                padding: '0.8rem 1rem 0.8rem 48px', 
                                fontSize: '0.8rem', 
                                backgroundColor: 'var(--surface)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '20px',
                                fontWeight: 900, 
                                color: 'var(--text-main)',
                                width: '100%',
                                cursor: 'pointer',
                                appearance: 'none',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                            }}
                            value={globalAccFilter} 
                            onChange={e => setGlobalAccFilter(e.target.value)}
                        >
                            <option value="">Consolidado Global</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                             <ChevronDown size={16} />
                        </div>
                    </div>

                    <div style={{ height: '32px', width: '1px', background: 'var(--border)', margin: '0 4px' }}></div>

                    {/* Botões de Ação Secundária */}
                    <div className="flex gap-2">
                        <button 
                            onClick={handleRunAudit}
                            className="group"
                            style={{ width: '48px', height: '48px', borderRadius: '18px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', transition: 'all 0.3s', cursor: 'pointer' }}
                            title="Diagnóstico de Saúde"
                        >
                             <ShieldCheck size={22} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="group"
                            style={{ width: '48px', height: '48px', borderRadius: '18px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', transition: 'all 0.3s', cursor: 'pointer' }}
                            title="Centros de Custo"
                        >
                             <Settings size={22} className="group-hover:rotate-45 transition-transform" />
                        </button>
                        <button 
                            onClick={() => setIsBatchModalOpen(true)}
                            className="group"
                            style={{ width: '48px', height: '48px', borderRadius: '18px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899', transition: 'all 0.3s', cursor: 'pointer' }}
                            title="Lote Retroativo"
                        >
                             <ListOrdered size={22} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        <button 
                            onClick={() => {
                                setEditAccId(null);
                                setNewAccount({ name: '', type: 'checking', balance: 0, limit: 0, dueDay: 10, closeDay: 3, color: '#3b82f6' });
                                setIsAccModalOpen(true);
                            }}
                            className="group"
                            style={{ width: '48px', height: '48px', borderRadius: '18px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', transition: 'all 0.3s', cursor: 'pointer' }}
                            title="Nova Conta"
                        >
                             <Wallet size={22} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                            onClick={() => setTransStatusFilter('overdue')}
                            className="group"
                            style={{ width: '48px', height: '48px', borderRadius: '18px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', transition: 'all 0.3s', cursor: 'pointer' }}
                            title="Ver Vencidos"
                        >
                             <AlertCircle size={22} className="group-hover:scale-110 transition-transform" />
                        </button>
                    </div>

                    <div style={{ height: '32px', width: '1px', background: 'var(--border)', margin: '0 4px' }}></div>

                    {/* Ações Principais */}
                    <button 
                        type="button"
                        onClick={handleExportToAccountant}
                        style={{ 
                            padding: '0.8rem 1.5rem', 
                            borderRadius: '20px', 
                            fontSize: '0.8rem', 
                            fontWeight: 950, 
                            background: '#1e293b', 
                            color: 'white', 
                            border: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            boxShadow: '0 10px 20px -5px rgba(30, 41, 59, 0.3)',
                            transition: 'all 0.3s',
                            cursor: 'pointer',
                            position: 'relative',
                            zIndex: 100
                        }}
                    >
                         <FileText size={16} strokeWidth={2.5} />
                         PACOTE DO CONTADOR
                    </button>

                    <button 
                        onClick={() => {
                            setEditTransId(null);
                            setNewTrans({ description: '', amount: '', type: 'expense', category: 'Outros', accountId: '', date: new Date().toISOString().split('T')[0], status: 'paid', installments: 1, isRecurring: false, recurrenceMonths: 12 });
                            setIsTransModalOpen(true);
                        }}
                        style={{ 
                            padding: '0.8rem 1.5rem', 
                            borderRadius: '20px', 
                            fontSize: '0.8rem', 
                            fontWeight: 950, 
                            background: 'var(--primary)', 
                            color: 'white', 
                            border: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            boxShadow: '0 10px 25px -5px var(--glow)',
                            transition: 'all 0.3s',
                            cursor: 'pointer'
                        }}
                    >
                         <Plus size={20} strokeWidth={3} />
                         NOVO LANÇAMENTO
                    </button>
                </div>
            </div>

            {/* Navegação por Segmented Control Premium */}
            <div style={{ 
                display: 'inline-flex', 
                background: 'var(--surface)', 
                padding: '6px', 
                borderRadius: '24px', 
                border: '1px solid var(--border)', 
                marginBottom: '40px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
                <button 
                    onClick={() => setView('overview')}
                    style={{ 
                        border: 'none', 
                        background: view === 'overview' ? 'var(--primary)' : 'transparent', 
                        color: view === 'overview' ? 'white' : 'var(--text-muted)',
                        padding: '10px 24px',
                        borderRadius: '20px',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <LayoutGrid size={16} strokeWidth={2.5} /> Visão Geral
                </button>
                <button 
                    onClick={() => setView('projection')}
                    style={{ 
                        border: 'none', 
                        background: view === 'projection' ? 'var(--primary)' : 'transparent', 
                        color: view === 'projection' ? 'white' : 'var(--text-muted)',
                        padding: '10px 24px',
                        borderRadius: '20px',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <Zap size={16} strokeWidth={2.5} /> Inteligência & Projeção
                </button>
                <button 
                    onClick={() => setView('import')}
                    style={{ 
                        border: 'none', 
                        background: view === 'import' ? 'var(--primary)' : 'transparent', 
                        color: view === 'import' ? 'white' : 'var(--text-muted)',
                        padding: '10px 24px',
                        borderRadius: '20px',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}
                >
                    <Upload size={16} strokeWidth={2.5} /> Importação Inteligente
                </button>
            </div>

            {view === 'overview' ? (
                <>
                
                {/* AUDIT SCORE (CONCILIÔMETRO) - NOVO KPI DE ELITE */}
                <div className="mb-12 section-container">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <ShieldCheck size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[1.5rem] font-black text-slate-800 dark:text-slate-100 m-0 leading-none">Saúde da Auditoria Financeira</h3>
                            <p className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Confiabilidade e conciliação de dados bancários</p>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        <SciFiStatCard 
                            title="Conciliômetro de Lançamentos"
                            value={`${auditStats.percent}%`}
                            icon={ShieldCheck}
                            color={auditStats.percent > 90 ? 'emerald' : (auditStats.percent > 50 ? 'orange' : 'red')}
                            subtext={`${auditStats.count} de ${auditStats.total} lançamentos auditados`}
                            isActive={true}
                        />
                        <SciFiStatCard 
                            title="Rastreabilidade Digital (ML/MP)"
                            value={mlStats.percent + '%'}
                            icon={Zap}
                            color="blue"
                            subtext={`${mlStats.count} transações ML integradas via ID`}
                        />
                        <SciFiStatCard 
                            title="Status do Patrimônio"
                            value={allTransactions.filter(t => t.linkedItemId).length}
                            icon={Hammer}
                            color="purple"
                            subtext="Lançamentos vinculados a Ativos"
                        />
                    </div>
                </div>

                <div className="mb-10">
                    <FinanceAIInsights transactions={transactions} accounts={accounts} openEditTrans={openEditTrans} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                    <SciFiStatCard 
                        title={globalAccFilter ? "Saldo da Conta" : "Saldo Consolidado"} 
                        value={`${stats.totalBalance < 0 ? '-' : ''}R$ ${formatCurrency(Math.abs(stats.totalBalance))}`} 
                        icon={Landmark} 
                        color={stats.totalBalance < 0 ? 'red' : 'blue'}
                        subtext={globalAccFilter ? "Atualizado para esta conta" : "Balanço líquido total em caixa"}
                    />
                    <SciFiStatCard 
                        title="Liquidez Imediata" 
                        value={(stats.payableMonth > 0 ? (stats.totalBalance / stats.payableMonth).toFixed(1) : '∞') + 'x'} 
                        icon={Zap} 
                        color={(stats.payableMonth > 0 ? (stats.totalBalance / stats.payableMonth) : 2) > 1.2 ? 'emerald' : 'orange'}
                        subtext="Capacidade de cobrir saídas (mês)"
                    />
                    <SciFiStatCard 
                        title="Contas a Pagar (Hoje)" 
                        value={`R$ ${formatCurrency(stats.payableToday)}`} 
                        icon={ArrowDownRight} 
                        color={stats.payableToday > 0 ? 'red' : 'emerald'}
                        subtext="Vencendo na data de hoje"
                    />
                    <SciFiStatCard 
                        title="Compromissos do Mês" 
                        value={`R$ ${formatCurrency(stats.payableMonth)}`} 
                        icon={Calendar} 
                        color="orange"
                        subtext="Total pendente no período"
                    />
                </div>

                {/* BLOCO DAS CONTAS - Reconstruído no padrão Dashboard */}
                <div className="mb-12 section-container">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Landmark size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[1.5rem] font-black text-slate-800 dark:text-slate-100 m-0 leading-none">Gestão de Liquidez e Contas</h3>
                            <p className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Faturamento real e disponibilidade de caixa</p>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        {accounts.filter(a => a.type !== 'credit').map((acc, idx) => {
                            const balance = Number(acc.balance || 0);
                            return (
                                <SciFiStatCard 
                                    key={acc.id}
                                    title={acc.name}
                                    value={`R$ ${formatCurrency(balance)}`}
                                    icon={Landmark}
                                    color={balance < 0 ? 'red' : 'blue'}
                                    subtext={`Tipo: ${acc.type === 'savings' ? 'Reserva' : 'Corrente'} • ID: ${acc.id.slice(0, 8)}`}
                                    onClick={() => openEditAccount(acc)}
                                    isActive={globalAccFilter === acc.id}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* BLOCO DOS CARTÕES - Reconstruído no padrão Dashboard */}
                <div className="mb-12 section-container">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-[1.25rem] font-black text-slate-800 dark:text-slate-100 m-0">Credit Hub & Ciclos</h3>
                            <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de faturas e exposição ao crédito</p>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {accounts.filter(a => a.type === 'credit').map((acc, idx) => {
                            const limit = Number(acc.limit || 0);
                            const debt = filteredTrans.filter(t => t.accountId === acc.id && t.type === 'expense').reduce((s,t) => s + Number(t.amount || 0), 0) -
                                         filteredTrans.filter(t => t.accountId === acc.id && t.type === 'income').reduce((s,t) => s + Number(t.amount || 0), 0);
                            const percent = limit > 0 ? (debt / limit) * 100 : 0;
                            const dueDay = acc.dueDay || 10;
                            
                            return (
                                <div 
                                    key={acc.id}
                                    onClick={() => setSelectedCreditCard(acc)}
                                    className="stat-card relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                                    style={{ 
                                        borderLeft: `5px solid ${percent > 90 ? '#ef4444' : '#8b5cf6'}`,
                                        background: 'var(--surface)',
                                        padding: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-[1.1rem] font-black text-slate-800 dark:text-white leading-none">{acc.name}</h4>
                                                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">{percent.toFixed(1)}% de Utilização</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-2 py-1 bg-purple-500 text-white text-[9px] font-black uppercase rounded-lg">Vence Dia {dueDay}</span>
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <div className="flex justify-between text-[0.7rem] font-black text-slate-400 uppercase mb-2">
                                            <span>Dívida: R$ {formatCurrency(debt)}</span>
                                            <span>Livre: R$ {formatCurrency(Math.max(0, limit - debt))}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${percent > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                                                style={{ width: `${Math.min(100, percent)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-2 group">
                                        <span className="text-[0.65rem] font-bold text-slate-400 italic">Clique para ver faturas</span>
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-purple-500 group-hover:bg-purple-50 transition-all">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>


                 {/* Warning Pending Income (Point 7 of Flow) */}
                {(() => {
                    const pendings = transactionsWithBalance.filter(t => t.type === 'income' && t.status !== 'paid');
                    const totalPending = pendings.reduce((sum, t) => sum + Number(t.amount), 0);
                    if (totalPending > 0) {
                        return (
                            <div className="mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
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
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ea580c' }}>R$ {formatCurrency(totalPending)}</div>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Transição Suave para Gráficos e Tabelas */}

            {/* Charts Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                {/* Top Row: Daily Chart + Pie Chart */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                    <div className="chart-card" style={{ flex: '1 1 600px', overflow: 'hidden', minHeight: '400px' }}>
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

                    <div className="chart-card" style={{ flex: '1 1 350px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                        <div className="chart-header">
                            <div className="flex items-center gap-2">
                                <PieChart size={20} color="var(--primary)" /> Distribuição de Custos
                            </div>
                        </div>
                        <div style={{ flex: 1, width: '100%', minWidth: 0, minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            {costCenterData.length > 0 ? (
                                <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                                    <ResponsiveContainer width="100%" height={220} minHeight={220}>
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
                                                formatter={(value) => `R$ ${formatCurrency(value)}`}
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
                                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>R$ {formatCurrency(d.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-400 text-sm italic">Nenhuma despesa no mês atual.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Próximas Obrigações e Recebíveis (Provisão) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px', marginBottom: '40px' }}>
                    <div style={{ padding: '32px', borderRadius: '32px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)' }}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                                <TrendingDown size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="text-[1.1rem] font-black text-slate-800 m-0 uppercase tracking-tight">Próximas Obrigações</h4>
                                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Contas a pagar - Próximos 30 dias</p>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxH: '320px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                            {stats.upcomingPayables?.length > 0 ? stats.upcomingPayables.map((p, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div style={{ background: '#fef2f2', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Calendar size={18} color="#ef4444" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="text-[0.85rem] font-black text-slate-800 m-0 group-hover:text-red-700 transition-colors">{p.description}</p>
                                            <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider m-0 mt-1">{new Date(p.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                                        </div>
                                    </div>
                                    <span className="text-[0.95rem] font-black text-red-600">R$ {formatCurrency(p.amount)}</span>
                                </div>
                            )) : <p className="text-xs text-muted italic text-center py-10 bg-slate-50 rounded-3xl border border-dashed">Nenhuma obrigação para os próximos 30 dias.</p>}
                        </div>
                    </div>
                    
                    <div style={{ padding: '32px', borderRadius: '32px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)' }}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <TrendingUp size={22} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h4 className="text-[1.1rem] font-black text-slate-800 m-0 uppercase tracking-tight">Previsão de Recebíveis</h4>
                                <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Entradas previstas - Próximos 30 dias</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxH: '320px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                            {stats.upcomingReceivables?.length > 0 ? stats.upcomingReceivables.map((r, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div style={{ background: '#f0fdf4', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ShoppingBag size={18} color="#10b981" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="text-[0.85rem] font-black text-slate-800 m-0 group-hover:text-emerald-700 transition-colors">Pedido #{r.id.substring(0,6).toUpperCase()}</p>
                                            <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider m-0 mt-1">Vencimento: {new Date(r.nextDueDate || r.deadline || r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                                        </div>
                                    </div>
                                    <span className="text-[0.95rem] font-black text-emerald-600">R$ {formatCurrency(r.balanceDue || r.total)}</span>
                                </div>
                            )) : <p className="text-xs text-muted italic text-center py-10 bg-slate-50 rounded-3xl border border-dashed">Nenhuma previsão de recebimento próxima.</p>}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Full Width DRE */}
                <div style={{ display: 'flex', width: '100%', minHeight: '400px' }}>
                    <div style={{ width: '100%' }}>
                        <SimpleDRETable stats={stats} />
                    </div>
                </div>
            </div>


        <div className="chart-card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} color="var(--primary)" /> Últimos Lançamentos
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                     <div style={{ position: 'relative' }}>
                         <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                         <input 
                            type="text" 
                            placeholder="Buscar transação..." 
                            className="form-input" 
                            style={{ padding: '0.4rem 0.8rem 0.4rem 2.2rem', fontSize: '0.85rem', width: '220px', borderRadius: '8px', border: '1px solid var(--border)' }}
                            value={transSearchTerm}
                            onChange={(e) => setTransSearchTerm(e.target.value)}
                         />
                     </div>
                     <select 
                        className="form-input" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-main)' }}
                        value={transTypeFilter} 
                        onChange={e => setTransTypeFilter(e.target.value)}
                     >
                        <option value="">🔄 Qualquer Tipo</option>
                        <option value="income">🟢 Apenas Receitas (+)</option>
                        <option value="expense">🔴 Apenas Despesas (-)</option>
                     </select>
                     
                     <select 
                        className="form-input" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-main)', borderColor: transStatusFilter === 'overdue' ? '#ef4444' : 'var(--border)' }}
                        value={transStatusFilter} 
                        onChange={e => setTransStatusFilter(e.target.value)}
                     >
                        <option value="">🏁 Todos Status</option>
                        <option value="paid">✅ Conciliado (Pago)</option>
                        <option value="pending">⏳ Estimado (Pendente)</option>
                        <option value="overdue">⚠️ Vencido (Atrasado)</option>
                        <option value="imported">🏦 Ver Apenas Importados</option>
                     </select>

                     <select 
                        className="form-input" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-main)' }}
                        value={transAccFilter} 
                        onChange={e => setTransAccFilter(e.target.value)}
                     >
                        <option value="">🏦 Todas as Contas</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                     </select>

                     <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200">
                         <span className="text-[10px] uppercase font-bold text-gray-400 px-1">Período</span>
                         <input
                             type="date"
                             className="form-input"
                             style={{ padding: '2px 8px', fontSize: '0.75rem', border: 'none', background: 'transparent', width: '110px' }}
                             value={transStartDate}
                             onChange={e => setTransStartDate(e.target.value)}
                         />
                         <span className="text-gray-300">|</span>
                         <input
                             type="date"
                             className="form-input"
                             style={{ padding: '2px 8px', fontSize: '0.75rem', border: 'none', background: 'transparent', width: '110px' }}
                             value={transEndDate}
                             onChange={e => setTransEndDate(e.target.value)}
                         />
                     </div>

                     <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                         <span className="text-[10px] font-bold text-gray-400 mr-2">MÊS</span>
                         <input
                             type="month"
                             className="form-input"
                             style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-main)', width: '140px' }}
                             value={transDateFilter}
                             onChange={e => {
                                 setTransDateFilter(e.target.value);
                                 setTransStartDate('');
                                 setTransEndDate('');
                             }}
                         />
                         {transDateFilter && (
                             <button onClick={() => setTransDateFilter('')} className="absolute -right-6 text-gray-400 hover:text-red-500"><X size={14} /></button>
                         )}
                     </div>

                     {(transSearchTerm || transTypeFilter || transStatusFilter || transAccFilter || transDateFilter || transStartDate || transEndDate) && (
                         <button 
                            onClick={() => {
                                setTransSearchTerm('');
                                setTransTypeFilter('');
                                setTransStatusFilter('');
                                setTransAccFilter('');
                                setTransDateFilter('');
                                setTransStartDate('');
                                setTransEndDate('');
                            }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-tight flex items-center gap-1 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 transition-colors"
                         >
                             <X size={12} /> Limpar Filtros
                         </button>
                     )}
                </div>
            </div>

            {/* Bulk Actions Floating Bar */}
            {selectedTransIds.length > 0 && (
                <div style={{ 
                    position: 'sticky', top: '1rem', zIndex: 50, marginBottom: '1rem',
                    background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)', 
                    color: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 800 }}>
                            {selectedTransIds.length} Selecionados
                        </div>
                        <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>Ações disponíveis:</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={handleBulkPay}
                            style={{ 
                                background: '#10b981', color: 'white', border: 'none', 
                                padding: '6px 16px', borderRadius: '8px', fontWeight: 700, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <CheckCircle size={16} /> Marcar como Pago
                        </button>
                        <button 
                            onClick={handleBulkDelete}
                            style={{ 
                                background: 'transparent', color: '#ff4444', border: '1px solid rgba(255,68,68,0.3)', 
                                padding: '6px 16px', borderRadius: '8px', fontWeight: 700, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Trash2 size={16} /> Apagar Selecionados
                        </button>
                        <button 
                            onClick={() => setSelectedTransIds([])}
                            style={{ 
                                background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)', 
                                padding: '6px 12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
            <div className="table-container">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'center', width: '50px' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedTransIds.length > 0 && selectedTransIds.length === finalFilteredTrans.length}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedTransIds(finalFilteredTrans.map(t => t.id));
                                    else setSelectedTransIds([]);
                                }}
                            />
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Data</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Descrição original</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Centro de Custo</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Fonte/Banco</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 800 }}>Impacto (R$)</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 800 }}>Saldo Atualizado</th>
                    </tr>
                </thead>
                <tbody>
                    {finalFilteredTrans
                        .slice(0, visibleTransactionsLimit)
                        .map(t => {
                            const acc = accounts.find(a => a.id === t.accountId);
                            const isExpense = t.type === 'expense';
                            const isOverdue = t.status === 'pending' && new Date(t.date) < new Date(new Date().setHours(0,0,0,0));
                            const isToday = t.status === 'pending' && new Date(t.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

                        return (
                            <tr key={t.id} onClick={() => setSelectedDetailTrans(t)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors group">
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTransIds.includes(t.id)} 
                                        onChange={() => {
                                            if (selectedTransIds.includes(t.id)) setSelectedTransIds(selectedTransIds.filter(id => id !== t.id));
                                            else setSelectedTransIds([...selectedTransIds, t.id]);
                                        }}
                                    />
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="opacity-50" />
                                        {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de', '')}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                    <div className="flex items-center gap-2">
                                        {t.orderId ? <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" title="Pedido Automático"></div> : (t.referenceId ? <Hammer size={12} color="#f59e0b" title="Módulo Derivado" /> : null)}
                                        {t.description}
                                        {(t.installmentsTotal > 1 || t.installment) && (
                                            <span style={{ 
                                                marginLeft: '8px', fontSize: '10px', color: 'white', 
                                                backgroundColor: '#4f46e5', padding: '2px 8px', 
                                                borderRadius: '9999px', fontWeight: 900,
                                                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                                                display: 'inline-flex', alignItems: 'center', gap: '3px'
                                            }}>
                                                <CreditCard size={10} /> {t.installment || `${t.installmentNumber}/${t.installmentsTotal}`}
                                            </span>
                                        )}
                                        {isOverdue && <span style={{ marginLeft: '6px', fontSize: '9px', color: 'white', backgroundColor: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>⚠️ VENCIDO</span>}
                                        {isToday && <span style={{ marginLeft: '6px', fontSize: '9px', color: 'white', backgroundColor: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🔔 VENCE HOJE</span>}
                                        {t.status === 'pending' && !isOverdue && !isToday && <span style={{ marginLeft: '6px', fontSize: '9px', color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>⏳ ESTIMADO</span>}
                                        {t.status === 'paid' && <span style={{ marginLeft: '6px', fontSize: '9px', color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>✅ CONCILIADO</span>}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <span style={{ 
                                        backgroundColor: categoryColors[t.category] ? `${categoryColors[t.category]}15` : '#f1f5f9', 
                                        color: categoryColors[t.category] || '#64748b',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {t.category || 'Outros'}
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {acc?.name || (!t.accountId ? 'A Definir' : 'Excluída')}
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800, color: isExpense ? '#ef4444' : '#10b981', fontSize: '1rem' }}>
                                    {isExpense ? '-' : '+'} R$ {formatCurrency(t.amount)}
                                </td>
                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, color: t.runningBalance < 0 ? '#ef4444' : (globalAccFilter ? 'var(--text-main)' : 'var(--text-muted)'), fontSize: '0.95rem' }}>
                                    {globalAccFilter ? (
                                        <>{t.runningBalance < 0 ? '-' : ''}R$ {formatCurrency(Math.abs(t.runningBalance))}</>
                                    ) : (
                                        <span title="Filtre uma conta específica para visualizar o extrato progressivo" style={{ opacity: 0.3 }}>-</span>
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
                </>
            ) : view === 'projection' ? (
                <FinanceProjectionDashboard 
                    transactions={transactions} 
                    accounts={accounts} 
                    orders={orders} 
                />
            ) : (
                <FinanceBankImport 
                    accounts={accounts} 
                    existingTransactions={transactions}
                    orders={orders}
                    categories={rawCategories}
                    equipments={equipments}
                    materials={materials}
                    onImportSuccess={(count) => {
                        alert(`Sucesso! ${count} novos lançamentos importados e auditados.`);
                        fetchData();
                        setView('overview');
                    }}
                />
            )}

        <AuditReportModal
            isOpen={isAuditModalOpen}
            report={auditReport}
            accounts={accounts}
            onClose={() => setIsAuditModalOpen(false)}
            onRefresh={fetchData}
        />

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
                                     <>
                                        <div className="input-group p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                            <label className="form-label text-purple-900 dark:text-purple-300">Limite do Cartão</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>R$</span>
                                                <input type="number" step="0.01" className="form-input w-full border-purple-200" style={{ paddingLeft: '32px' }} value={newAccount.limit} onChange={e => setNewAccount({...newAccount, limit: e.target.value})} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                                            <div className="input-group">
                                                <label className="form-label">Dia de Vencimento</label>
                                                <input type="number" min="1" max="31" className="form-input w-full" value={newAccount.dueDay} onChange={e => setNewAccount({...newAccount, dueDay: e.target.value})} />
                                            </div>
                                            <div className="input-group">
                                                <label className="form-label">Fechamento (Melhor Dia)</label>
                                                <input type="number" min="1" max="31" className="form-input w-full" value={newAccount.closeDay} onChange={e => setNewAccount({...newAccount, closeDay: e.target.value})} />
                                            </div>
                                        </div>
                                     </>
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
                                                            <option key={n} value={n}>{n === 1 ? '1x (À vista na próxima fatura)' : `${n}x de R$ ${formatCurrency(Number(newTrans.amount || 0)/n)}`}</option>
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
                    <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editCategoryId ? 'Editar Centro de Custo' : 'Gerenciar Centros de Custo'}
                            </h2>
                            <button type="button" className="btn btn-icon" onClick={() => {
                                setIsCategoryModalOpen(false);
                                setEditCategoryId(null);
                                setNewCategoryName('');
                                setNewCategoryParent('');
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSaveCategory} className="space-y-4 mb-8 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-8">
                                        <label className="form-label text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Nome da Categoria/Sub</label>
                                        <input type="text" required className="form-input w-full" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ex: Materiais, Salários..." />
                                    </div>
                                    <div className="col-span-4">
                                        <label className="form-label text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Tipo</label>
                                        <select className="form-input w-full" value={newCategoryType} onChange={e => setNewCategoryType(e.target.value)}>
                                            <option value="expense">Despesa (-)</option>
                                            <option value="income">Receita (+)</option>
                                        </select>
                                    </div>
                                    
                                    <div className="col-span-8">
                                        <label className="form-label text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Vincular a Categoria Principal (Opcional)</label>
                                        <select className="form-input w-full" value={newCategoryParent} onChange={e => setNewCategoryParent(e.target.value)}>
                                            <option value="">Nenhuma (Categoria Principal)</option>
                                            {rawCategories
                                                .filter(c => c.type === newCategoryType && c.id !== editCategoryId && !c.parentId)
                                                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                            }
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="form-label text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Cor</label>
                                        <input type="color" className="w-full h-10 p-0 border-none rounded-lg cursor-pointer" value={newCategoryColor} onChange={e => setNewCategoryColor(e.target.value)} />
                                    </div>

                                    <div className="col-span-2 flex items-end">
                                        <button type="submit" className="btn btn-primary w-full h-10 flex items-center justify-center gap-2">
                                            {editCategoryId ? <Check size={18} /> : <Plus size={18} />}
                                        </button>
                                    </div>
                                </div>
                                {editCategoryId && (
                                    <div className="pt-2 flex justify-start">
                                        <button type="button" onClick={() => { setEditCategoryId(null); setNewCategoryName(''); setNewCategoryParent(''); }} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase">Cancelar Edição</button>
                                    </div>
                                )}
                            </form>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar pr-2">
                                {['income', 'expense'].map(type => (
                                    <div key={type} className="mb-6">
                                        <h4 className={`text-[11px] font-black uppercase tracking-widest mb-3 pb-1 border-b ${type === 'income' ? 'text-emerald-500 border-emerald-100' : 'text-red-500 border-red-100'}`}>
                                            {type === 'income' ? 'Receitas (+)' : 'Despesas (-)'}
                                        </h4>
                                        <div className="space-y-1">
                                            {rawCategories
                                                .filter(c => c.type === type && !c.parentId)
                                                .map(parent => (
                                                    <div key={parent.id} className="space-y-1">
                                                        <div className="group flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: parent.color }}></div>
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{parent.name}</span>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openEditCategory(parent)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => handleDeleteCategory(parent.id, parent.name)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Subcategories */}
                                                        {rawCategories.filter(sub => sub.parentId === parent.id).map(sub => (
                                                            <div key={sub.id} className="group flex items-center justify-between p-2 ml-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/20 transition-all">
                                                                <div className="flex items-center gap-3">
                                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sub.color }}></div>
                                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{sub.name}</span>
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => openEditCategory(sub)} className="p-1 text-slate-300 hover:text-blue-400">
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteCategory(sub.id, sub.name)} className="p-1 text-slate-300 hover:text-red-400">
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isExportModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1200, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)' }}>
                    <div className="modal-content animate-in fade-in zoom-in duration-300" style={{ maxWidth: '500px', width: '95%', background: 'linear-gradient(135deg, var(--surface) 0%, #1e293b 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem' }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 className="modal-title" style={{ fontSize: '1.1rem', color: 'white' }}>Pacote do Contador</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Exporte os dados financeiros para auditoria</p>
                                </div>
                            </div>
                            <button type="button" className="btn btn-icon" onClick={() => setIsExportModalOpen(false)} style={{ color: 'rgba(255,255,255,0.4)', hover: { color: 'white' } }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '1.5rem' }}>
                            {/* Atalhos de Período */}
                            <div className="mb-6">
                                <label className="form-label" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', display: 'block' }}>Opções Pré-definidas</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'currentMonth', label: 'Mês Atual', icon: <Calendar size={14} /> },
                                        { id: 'lastMonth', label: 'Mês Passado', icon: <Calendar size={14} /> },
                                        { id: 'last3Months', label: 'Últimos 3 Meses', icon: <Calendar size={14} /> },
                                        { id: 'currentYear', label: 'Ano de ' + new Date().getFullYear(), icon: <Calendar size={14} /> }
                                    ].map(preset => (
                                        <button 
                                            key={preset.id}
                                            onClick={() => handleSetRangePreset(preset.id)}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={{ 
                                                background: 'rgba(255,255,255,0.03)', 
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                color: 'rgba(255,255,255,0.8)',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                textAlign: 'left'
                                            }}
                                        >
                                            <span style={{ color: '#38bdf8' }}>{preset.icon}</span>
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}></div>

                            {/* Seleção Customizada */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="input-group">
                                    <label className="form-label" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>Início do Período</label>
                                    <input 
                                        type="date" 
                                        className="form-input w-full" 
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                        value={exportRange.start} 
                                        onChange={e => setExportRange({...exportRange, start: e.target.value})} 
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="form-label" style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>Final do Período</label>
                                    <input 
                                        type="date" 
                                        className="form-input w-full" 
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                        value={exportRange.end} 
                                        onChange={e => setExportRange({...exportRange, end: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={performExport}
                                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all hover:brightness-110 active:scale-[0.98] group"
                                style={{ 
                                    background: 'linear-gradient(to right, #0ea5e9, #38bdf8)', 
                                    color: 'white', 
                                    fontWeight: 900, 
                                    fontSize: '0.9rem',
                                    border: 'none',
                                    boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.4)'
                                }}
                            >
                                <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />
                                GERAR ARQUIVO PARA O CONTADOR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
