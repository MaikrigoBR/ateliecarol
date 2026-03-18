
import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, Users, ShoppingBag, DollarSign, 
    Calendar, ArrowUpRight, ArrowDownRight, Activity, BarChart2, Wallet, AlertCircle, MessageCircle 
} from 'lucide-react';
import db from '../services/database';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart, Line 
} from 'recharts';
import '../css/pages.css'; // Import custom styles

function StatCard({ title, value, icon: Icon, color, subtext }) {
    // Determine border color based on prop (map to CSS variables or hex)
    const getColor = (c) => {
        const map = {
            'primary': 'var(--primary)',
            'green': '#10b981', // Emerald 500
            'orange': '#f59e0b', // Amber 500
            'purple': '#8b5cf6', // Violet 500
            'blue': '#3b82f6',   // Blue 500
            'red': '#ef4444'     // Red 500
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
                    color: 'var(--text-main)',
                    lineHeight: 1.2
                }}>{value}</h3>
                {subtext && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>{subtext}</p>}
            </div>
            <div className="stat-icon-wrapper" style={{ 
                color: activeColor, 
                backgroundColor: `${activeColor}1A` // 10% opacity hack (hex + 1A)
            }}>
                <Icon size={24} />
            </div>
        </div>
    );
}

import { useData } from '../contexts/DataContext';

export function Dashboard() {
    const { orders, customers, inventory: accounts, loading } = useData();
    
    // Local KPI State (derived from context data)
    const [stats, setStats] = useState({
        totalSales: 0,
        pendingOrders: 0,
        activeCustomers: 0,
        revenue: 0,
        avgTicket: 0,
        receivables: 0,
        totalBalance: 0
    });
    const [salesData, setSalesData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    const [stylesData, setStylesData] = useState([]);

    // Recalculate stats whenever context data changes
    useEffect(() => {
        if (loading.orders || loading.customers) return;

        // 1. Calculate KPI Stats
        const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        
        // Pending statuses
        const pending = orders.filter(o => 
            ['Novo', 'Em Produção', 'Pagamento Parcial', 'Aguardando Aprovação', 'processing', 'pending'].includes(o.status)
        ).length;
        
        const avgTicket = orders.length > 0 ? revenue / orders.length : 0;
        
        // Financials
        const receivables = orders.reduce((sum, o) => sum + Number(o.balanceDue || 0), 0);
        // Note: 'inventory' in context is actually 'inventory items', NOT accounts.
        // Wait, did I map 'inventory' to 'accounts' in the destructuring above? 
        // No, I need accounts. Context has transactions, inventory, customers, orders, products.
        // Context DOES NOT have 'accounts'. I need to add 'accounts' to DataContext or fetch it here.
        // For now, let's fetch accounts locally as it's financial data, or better:
        // Assume 'accounts' logic should be moved to DataContext, but I can't edit it right now without another step.
        // Let's keep 'accounts' fetch local for now or assume 0 until I fix Context.
        // ACTUALLY, I should have added 'accounts' to DataContext. My bad.
        // I will fetch accounts locally here to preserve functionality.
        
        const calculateWithAccounts = async () => {
             // Quick fetch for accounts since it's not in context yet
             // In a real refactor, I'd add it to Context.
             const accs = await db.getAll('accounts');
             const totalBalance = accs.reduce((sum, a) => sum + Number(a.balance || 0), 0);
             
             setStats({
                totalSales: orders.length,
                pendingOrders: pending,
                activeCustomers: customers.length,
                revenue,
                avgTicket,
                receivables,
                totalBalance
            });
        };
        calculateWithAccounts();

        // 2. Prepare Sales Chart Data (Current Year - Monthly)
        const currentYear = new Date().getFullYear();
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const monthlyData = months.map((monthName, index) => {
            const monthOrders = orders.filter(o => {
                const d = new Date(o.createdAt || new Date()); 
                return d.getFullYear() === currentYear && d.getMonth() === index;
            });
            const total = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            return { name: monthName, Vendas: total, Pedidos: monthOrders.length };
        });
        setSalesData(monthlyData);

        // 3. Prepare Status Pie Chart
        const statusCounts = orders.reduce((acc, o) => {
            const s = o.status || 'Novo';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        
        const pieData = [
            { name: 'Novos', value: (statusCounts['Novo'] || 0) + (statusCounts['pending'] || 0), color: '#3b82f6' }, 
            { name: 'Produção', value: (statusCounts['Em Produção'] || 0) + (statusCounts['processing'] || 0), color: '#8b5cf6' }, 
            { name: 'Parcial', value: statusCounts['Pagamento Parcial'] || 0, color: '#f59e0b' }, 
            { name: 'Concluído', value: (statusCounts['Concluído'] || 0) + (statusCounts['completed'] || 0) + (statusCounts['Despachado'] || 0), color: '#10b981' }, 
            { name: 'Cancelado', value: statusCounts['Cancelado'] || 0, color: '#ef4444' } 
        ].filter(d => d.value > 0);
        
        setStatusData(pieData);

        // 4. Opportunities Radar (Next 30 days) AND Styles Data
        const today = new Date();
        const opps = [];
        const styleCounts = {};

        customers.forEach(customer => {
            // Count styles
            if (customer.styles && Array.isArray(customer.styles)) {
                customer.styles.forEach(style => {
                    styleCounts[style] = (styleCounts[style] || 0) + 1;
                });
            }

            // Check milestones
            if (customer.milestones && Array.isArray(customer.milestones)) {
                customer.milestones.forEach(ms => {
                    if (!ms.date) return;
                    const msDate = new Date(ms.date);
                    if (isNaN(msDate)) return;

                    const todayYear = today.getFullYear();
                    const nextMsDate = new Date(msDate);
                    nextMsDate.setFullYear(todayYear);
                    if (nextMsDate < today) {
                        nextMsDate.setFullYear(todayYear + 1);
                    }
                    
                    const diffTime = nextMsDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays >= 0 && diffDays <= 30) {
                        opps.push({
                            customerName: customer.name,
                            customerPhone: customer.phone,
                            msName: ms.name,
                            msType: ms.type,
                            date: ms.date,
                            daysLeft: diffDays
                        });
                    }
                });
            }
        });

        opps.sort((a, b) => a.daysLeft - b.daysLeft);
        setOpportunities(opps);

        const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
        const sData = Object.keys(styleCounts).map((key, idx) => ({
            name: key,
            value: styleCounts[key],
            color: COLORS[idx % COLORS.length]
        })).sort((a, b) => b.value - a.value);
        setStylesData(sData);

        // 5. Recent Orders
        const recent = orders
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(order => {
                const customer = customers.find(c => c.id === order.customerId);
                return {
                    ...order,
                    customerName: order.customer || order.customerName || customer?.name || 'Cliente não identificado'
                };
            });
        setRecentOrders(recent);

    }, [orders, customers, loading.orders, loading.customers]);

    if (loading.orders && orders.length === 0) return <div className="p-xl text-center">Carregando painel analítico...</div>;

    return (
        <div className="animate-fade-in page-content">
            <div className="dashboard-header">
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Performance Anual
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Panorama do negócio em {new Date().getFullYear()}.
                    </p>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.25rem 0.75rem', background: '#F3F4F6', borderRadius: '9999px' }}>
                    Atualizado agorinha
                </div>
            </div>

            {/* KPI Grid */}
            <div className="dashboard-grid">
                <StatCard 
                    title="Caixa & Bancos" 
                    value={`R$ ${stats.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={Wallet} 
                    color="blue"
                    subtext="Saldo disponível"
                />
                <StatCard 
                    title="A Receber" 
                    value={`R$ ${stats.receivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={AlertCircle} 
                    color="orange"
                    subtext="De clientes"
                />
                <StatCard 
                    title="Pedidos em Aberto" 
                    value={stats.pendingOrders} 
                    icon={ShoppingBag} 
                    color="purple"
                    subtext="Fila de produção"
                />
                 <StatCard 
                    title="Faturamento" 
                    value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    icon={DollarSign} 
                    color="green"
                    subtext="Total vendas"
                />
            </div>

            {/* Charts Grid */}
            <div className="charts-layout">
                {/* Monthly Performance Chart */}
                <div className="chart-card">
                    <div className="chart-header">
                        <BarChart2 size={20} color="var(--primary)" /> Desempenho Mensal
                    </div>
                    <div style={{ width: '100%', minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height={320}>
                            <ComposedChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVendasBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} tick={{fill: '#6b7280', fontSize: 12}} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value, name) => [name === 'Vendas' ? `R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : value, name]}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                
                                <Bar 
                                    yAxisId="left" 
                                    dataKey="Vendas" 
                                    fill="url(#colorVendasBar)" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={40}
                                    animationDuration={1500}
                                />
                                <Line 
                                    yAxisId="right" 
                                    type="monotone" 
                                    dataKey="Pedidos" 
                                    stroke="#f59e0b" 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                                    animationDuration={2000}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Chart (Donut) */}
                <div className="chart-card">
                    <div className="chart-header">
                         Distribuição de Status
                    </div>
                    <div style={{ width: '100%', minHeight: '300px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationDuration={1500}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', paddingBottom: '30px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ display: 'block', fontSize: '2.5rem', fontWeight: 700, color: '#1f2937' }}>{stats.totalSales}</span>
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* OPORTUNIDADES & AUDIÊNCIA */}
            <div className="charts-layout" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Radar de Oportunidades */}
                <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="chart-header">
                        <Activity size={20} color="#8b5cf6" /> Radar de Oportunidades (Próximos 30 dias)
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px', paddingRight: '0.5rem' }} className="hide-scrollbar">
                        {opportunities.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                Nenhuma oportunidade iminente encontrada.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {opportunities.map((opp, idx) => {
                                    const message = `Oi ${opp.customerName}, vi que o ${opp.msType === 'aniversario_filho' ? 'aniversário do(a)' : opp.msType} ${opp.msName} está chegando! Vamos preparar algo especial?`;
                                    return (
                                        <div key={idx} style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>{opp.customerName}</h4>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {opp.msType === 'aniversario' ? 'Aniversário de' : opp.msType === 'aniversario_filho' ? 'Aniv. de' : opp.msType}: <strong>{opp.msName}</strong>
                                                </p>
                                                <span style={{ fontSize: '0.7rem', display: 'inline-block', padding: '2px 8px', marginTop: '0.5rem', borderRadius: '12px', background: opp.daysLeft <= 7 ? '#ef4444' : '#f59e0b', color: 'white', fontWeight: 'bold' }}>
                                                    Faltam {opp.daysLeft} dias
                                                </span>
                                            </div>
                                            {opp.customerPhone && (
                                                <button 
                                                    onClick={() => window.open(`https://wa.me/55${opp.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')}
                                                    style={{ border: 'none', background: '#25D366', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    title="Abordar no WhatsApp"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Raio-X de Audiência */}
                <div className="chart-card">
                    <div className="chart-header">
                        <Users size={20} color="#ec4899" /> Raio-X da Audiência (Estilos)
                    </div>
                    <div style={{ width: '100%', minHeight: '300px', position: 'relative' }}>
                        {stylesData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                Nenhum estilo de cliente registrado ainda.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={stylesData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        animationDuration={1500}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {stylesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Table */}
            <div className="chart-card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Entradas Recentes</h3>
                </div>
                <div className="table-container">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Data</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Cliente</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map(order => (
                                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-gray-50/10 transition-colors">
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        {order.customerName || 'Cliente sem nome'}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                        {(() => {
                                             const statusMap = {
                                                'pending': { label: 'Pendente', bg: '#FFF7ED', color: '#C2410C' },
                                                'processing': { label: 'Em Produção', bg: '#EFF6FF', color: '#1D4ED8' },
                                                'completed': { label: 'Concluído', bg: '#ECFDF5', color: '#047857' },
                                                'cancelled': { label: 'Cancelado', bg: '#FEF2F2', color: '#B91C1C' },
                                                'shipped': { label: 'Enviado', bg: '#F5F3FF', color: '#6D28D9' }
                                            };
                                            const style = statusMap[order.status] || { label: order.status, bg: '#F3F4F6', color: '#374151' };
                                            return (
                                                <span style={{ 
                                                    backgroundColor: style.bg, 
                                                    color: style.color, 
                                                    padding: '4px 12px', 
                                                    borderRadius: '9999px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 600,
                                                    display: 'inline-block'
                                                }}>
                                                    {style.label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                                        R$ {Number(order.total || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {recentOrders.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
                                        Nenhum pedido registrado ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
