import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, Users, Eye, Clock, ShoppingBag, Star, Package,
    BarChart2, Activity, RefreshCcw, AlertCircle, Award, Heart,
    ArrowUp, ArrowDown, Calendar, Filter, Zap
} from 'lucide-react';
import db from '../services/database.js';

// ─── tiny bar chart via divs ─────────────────────────────────────────────────
function MiniBar({ value, max, color = '#7c3aed', height = 28 }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div style={{ backgroundColor: color + '18', borderRadius: '4px', overflow: 'hidden', height }}>
            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.6s ease', minWidth: pct > 0 ? '4px' : 0 }} />
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, bg, trend, trendLabel }) {
    return (
        <div style={{ backgroundColor: 'var(--surface, white)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', backgroundColor: color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', fontWeight: 700, color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
                        {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(trend)}% {trendLabel || ''}
                    </span>
                )}
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--text-main, #1e293b)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{sub}</div>}
        </div>
    );
}

// ─── Section header  ─────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
    return (
        <div style={{ backgroundColor: 'var(--surface, white)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--primary, #7c3aed)' }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main, #1e293b)' }}>{title}</span>
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
        </div>
    );
}

// ─── Days options ─────────────────────────────────────────────────────────────
const RANGES = [
    { label: '7 dias', days: 7 },
    { label: '30 dias', days: 30 },
    { label: '90 dias', days: 90 },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export function CrmAnalytics() {
    const [analytics, setAnalytics] = useState([]);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState(30);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [a, o, p, c] = await Promise.all([
                db.getAll('analytics'),
                db.getAll('orders'),
                db.getAll('products'),
                db.getAll('customers'),
            ]);
            setAnalytics(a || []);
            setOrders(o || []);
            setProducts(p || []);
            setCustomers(c || []);
            setLastRefreshed(new Date());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    // ── Date window ──────────────────────────────────────────────────────────
    const cutoff = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - range);
        return d;
    }, [range]);

    const prevCutoff = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - range * 2);
        return d;
    }, [range]);

    // ── Filtered analytics ────────────────────────────────────────────────────
    const inRange = (item) => {
        const ts = item.timestamp ? new Date(item.timestamp) : null;
        return ts && ts >= cutoff;
    };
    const inPrev = (item) => {
        const ts = item.timestamp ? new Date(item.timestamp) : null;
        return ts && ts >= prevCutoff && ts < cutoff;
    };

    const recentVisits = useMemo(() => analytics.filter(a => a.type === 'store_view' && inRange(a)), [analytics, cutoff]);
    const prevVisits = useMemo(() => analytics.filter(a => a.type === 'store_view' && inPrev(a)), [analytics, prevCutoff, cutoff]);
    const productViews = useMemo(() => analytics.filter(a => a.type === 'product_view' && inRange(a)), [analytics, cutoff]);
    const durations = useMemo(() => analytics.filter(a => a.type === 'store_duration' && inRange(a)), [analytics, cutoff]);

    const avgDuration = useMemo(() => {
        if (durations.length === 0) return 0;
        return Math.round(durations.reduce((s, d) => s + (d.durationMs || 0), 0) / durations.length / 1000);
    }, [durations]);

    // ── Orders in range ───────────────────────────────────────────────────────
    const recentOrders = useMemo(() =>
        orders.filter(o => {
            const d = o.date ? new Date(o.date + 'T00:00:00') : null;
            return d && d >= cutoff && o.status !== 'Cancelado' && o.status !== 'cancelled';
        }), [orders, cutoff]);

    const prevOrders = useMemo(() =>
        orders.filter(o => {
            const d = o.date ? new Date(o.date + 'T00:00:00') : null;
            return d && d >= prevCutoff && d < cutoff && o.status !== 'Cancelado' && o.status !== 'cancelled';
        }), [orders, prevCutoff, cutoff]);

    const revenue = useMemo(() => recentOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0), [recentOrders]);
    const prevRevenue = useMemo(() => prevOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0), [prevOrders]);

    const revenueTrend = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;
    const ordersTrend = prevOrders.length > 0 ? Math.round(((recentOrders.length - prevOrders.length) / prevOrders.length) * 100) : null;
    const visitsTrend = prevVisits.length > 0 ? Math.round(((recentVisits.length - prevVisits.length) / prevVisits.length) * 100) : null;

    // ── Conversion rate ───────────────────────────────────────────────────────
    const conversionRate = recentVisits.length > 0
        ? ((recentOrders.length / recentVisits.length) * 100).toFixed(1)
        : '0.0';

    // ── Most sold products ────────────────────────────────────────────────────
    const topSoldProducts = useMemo(() => {
        const map = {};
        recentOrders.forEach(order => {
            (order.cartItems || []).forEach(item => {
                const k = item.name || item.productName || 'Produto';
                if (!map[k]) map[k] = { name: k, qty: 0, revenue: 0 };
                map[k].qty += parseInt(item.quantity) || 1;
                map[k].revenue += parseFloat(item.total) || 0;
            });
        });
        return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
    }, [recentOrders]);

    const maxSoldQty = topSoldProducts[0]?.qty || 1;

    // ── Most viewed products ──────────────────────────────────────────────────
    const topViewedProducts = useMemo(() => {
        const map = {};
        productViews.forEach(ev => {
            const k = ev.productName || ev.productId || 'Produto';
            if (!map[k]) map[k] = { name: k, views: 0, productId: ev.productId };
            map[k].views++;
        });
        return Object.values(map).sort((a, b) => b.views - a.views).slice(0, 8);
    }, [productViews]);

    const maxViews = topViewedProducts[0]?.views || 1;

    // ── Featured products in the store ───────────────────────────────────────
    const featuredProducts = useMemo(() => products.filter(p => p.campaignActive && p.isPublic), [products]);

    // ── New customers in range ────────────────────────────────────────────────
    const newCustomers = useMemo(() =>
        customers.filter(c => {
            const d = c.createdAt ? new Date(c.createdAt) : null;
            return d && d >= cutoff;
        }), [customers, cutoff]);

    // ── Daily visits breakdown ────────────────────────────────────────────────
    const dailyVisits = useMemo(() => {
        const map = {};
        recentVisits.forEach(v => {
            const day = v.timestamp ? new Date(v.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;
            if (day) { map[day] = (map[day] || 0) + 1; }
        });
        // Last N days in order
        const days = [];
        for (let i = range - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const k = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            days.push({ label: k, count: map[k] || 0 });
        }
        return days;
    }, [recentVisits, range]);

    const maxDaily = Math.max(...dailyVisits.map(d => d.count), 1);

    // ── Order by day ──────────────────────────────────────────────────────────
    const dailyOrders = useMemo(() => {
        const map = {};
        recentOrders.forEach(o => {
            const day = o.date ? new Date(o.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;
            if (day) { map[day] = (map[day] || 0) + 1; }
        });
        const days = [];
        for (let i = range - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const k = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            days.push({ label: k, count: map[k] || 0 });
        }
        return days;
    }, [recentOrders, range]);

    const maxDailyOrder = Math.max(...dailyOrders.map(d => d.count), 1);

    // ── Ticket médio ─────────────────────────────────────────────────────────
    const avgTicket = recentOrders.length > 0 ? revenue / recentOrders.length : 0;

    // ── Customers with most orders ────────────────────────────────────────────
    const topCustomers = useMemo(() => {
        const map = {};
        recentOrders.forEach(o => {
            const k = o.customer || o.customerName || 'Cliente';
            if (!map[k]) map[k] = { name: k, orders: 0, spent: 0 };
            map[k].orders++;
            map[k].spent += parseFloat(o.total) || 0;
        });
        return Object.values(map).sort((a, b) => b.spent - a.spent).slice(0, 6);
    }, [recentOrders]);

    const maxSpent = topCustomers[0]?.spent || 1;

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid #e9d5ff', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: '#7c3aed', fontWeight: 600 }}>Carregando Analytics CRM...</span>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            {/* ── HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h2 className="title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap size={24} color="var(--primary, #7c3aed)" /> CRM Analytics
                    </h2>
                    <p className="text-muted">Inteligência de mercado gerada pela loja, pedidos e clientes.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Range selector */}
                    <div style={{ display: 'flex', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px', overflow: 'hidden' }}>
                        {RANGES.map(r => (
                            <button key={r.days} onClick={() => setRange(r.days)}
                                style={{ padding: '7px 14px', border: 'none', backgroundColor: range === r.days ? 'var(--primary, #7c3aed)' : 'var(--surface, white)', color: range === r.days ? 'white' : 'var(--text-muted, #64748b)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchAll}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border, #e2e8f0)', backgroundColor: 'var(--surface, white)', color: 'var(--text-muted, #64748b)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                        <RefreshCcw size={14} /> Atualizar
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                        Atualizado às {lastRefreshed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* ── KPI GRID ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <KpiCard icon={<Eye size={18} />} label="Visitas à Loja" value={recentVisits.length} color="#7c3aed" bg="#faf5ff" trend={visitsTrend} trendLabel="vs período ant." />
                <KpiCard icon={<ShoppingBag size={18} />} label="Pedidos" value={recentOrders.length} color="#0ea5e9" bg="#f0f9ff" trend={ordersTrend} trendLabel="vs período ant." />
                <KpiCard icon={<TrendingUp size={18} />} label="Receita" value={`R$ ${revenue.toFixed(2).replace('.', ',')}`} color="#22c55e" bg="#f0fdf4" trend={revenueTrend} trendLabel="vs período ant." />
                <KpiCard icon={<Users size={18} />} label="Ticket Médio" value={`R$ ${avgTicket.toFixed(2).replace('.', ',')}`} color="#f59e0b" bg="#fffbeb" />
                <KpiCard icon={<Activity size={18} />} label="Taxa de Conversão" value={`${conversionRate}%`} sub={`${recentVisits.length} visitas → ${recentOrders.length} pedidos`} color="#6366f1" bg="#eef2ff" />
                <KpiCard icon={<Clock size={18} />} label="Permanência Média" value={avgDuration > 0 ? `${avgDuration}s` : '—'} color="#ec4899" bg="#fdf2f8" sub="Tempo médio na loja" />
                <KpiCard icon={<Users size={18} />} label="Novos Clientes" value={newCustomers.length} color="#14b8a6" bg="#f0fdfa" />
                <KpiCard icon={<Star size={18} />} label="Em Destaque" value={featuredProducts.length} color="#f97316" bg="#fff7ed" sub="Produtos com campanha ativa" />
            </div>

            {/* ── CHARTS ROW ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                {/* Daily Visits Chart */}
                <Section title="Visitas Diárias à Loja" icon={<Eye size={16} />}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100px' }}>
                        {dailyVisits.map((d, i) => {
                            const h = maxDaily > 0 ? Math.max(4, (d.count / maxDaily) * 96) : 4;
                            const isToday = i === dailyVisits.length - 1;
                            return (
                                <div key={i} title={`${d.label}: ${d.count} visitas`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                                    <div style={{ width: '100%', height: `${h}px`, backgroundColor: isToday ? '#7c3aed' : '#c4b5fd', borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease' }} />
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted, #94a3b8)' }}>
                        <span>{dailyVisits[0]?.label}</span>
                        <span>{dailyVisits[Math.floor(dailyVisits.length / 2)]?.label}</span>
                        <span>Hoje</span>
                    </div>
                </Section>

                {/* Daily Orders Chart */}
                <Section title="Pedidos Diários" icon={<ShoppingBag size={16} />}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100px' }}>
                        {dailyOrders.map((d, i) => {
                            const h = maxDailyOrder > 0 ? Math.max(4, (d.count / maxDailyOrder) * 96) : 4;
                            const isToday = i === dailyOrders.length - 1;
                            return (
                                <div key={i} title={`${d.label}: ${d.count} pedidos`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <div style={{ width: '100%', height: `${h}px`, backgroundColor: isToday ? '#0ea5e9' : '#7dd3fc', borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease' }} />
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted, #94a3b8)' }}>
                        <span>{dailyOrders[0]?.label}</span>
                        <span>{dailyOrders[Math.floor(dailyOrders.length / 2)]?.label}</span>
                        <span>Hoje</span>
                    </div>
                </Section>
            </div>

            {/* ── PRODUCTS INSIGHT ROW ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

                {/* Most Sold */}
                <Section title="🏆 Mais Vendidos" icon={<Award size={16} />}>
                    {topSoldProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.85rem' }}>Nenhum produto vendido no período.</div>
                    ) : topSoldProducts.map((p, i) => (
                        <div key={i} style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name}
                                </span>
                                <span style={{ color: '#7c3aed', fontWeight: 700 }}>{p.qty} un.</span>
                            </div>
                            <MiniBar value={p.qty} max={maxSoldQty} color="#7c3aed" height={20} />
                        </div>
                    ))}
                </Section>

                {/* Most Viewed */}
                <Section title="👁 Mais Vistos na Loja" icon={<Eye size={16} />}>
                    {topViewedProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.85rem' }}>Nenhuma visualização de produto registrada.</div>
                    ) : topViewedProducts.map((p, i) => (
                        <div key={i} style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                                    {i === 0 ? '🔥' : `${i + 1}.`} {p.name}
                                </span>
                                <span style={{ color: '#0ea5e9', fontWeight: 700 }}>{p.views} views</span>
                            </div>
                            <MiniBar value={p.views} max={maxViews} color="#0ea5e9" height={20} />
                        </div>
                    ))}
                </Section>
            </div>

            {/* ── TOP CUSTOMERS ── */}
            <Section title="💎 Clientes Top (por volume gerado no período)" icon={<Users size={16} />}>
                {topCustomers.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.85rem' }}>Nenhum pedido no período selecionado.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {topCustomers.map((c, i) => (
                            <div key={i} style={{ padding: '14px 16px', backgroundColor: i === 0 ? '#faf5ff' : 'var(--background, #f8fafc)', borderRadius: '10px', border: `1px solid ${i === 0 ? '#e9d5ff' : 'var(--border, #e2e8f0)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${['#7c3aed','#0ea5e9','#22c55e','#f59e0b','#ec4899','#6366f1'][i % 6]}, ${['#9333ea','#3b82f6','#16a34a','#d97706','#db2777','#4f46e5'][i % 6]})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main, #1e293b)' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>{c.orders} pedido{c.orders !== 1 ? 's' : ''}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: i === 0 ? '#7c3aed' : 'var(--text-main, #1e293b)' }}>R$ {c.spent.toFixed(2).replace('.', ',')}</div>
                                    {i === 0 && <div style={{ fontSize: '0.68rem', color: '#9333ea', fontWeight: 600 }}>⭐ Top Cliente</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* ── FEATURED IN STORE ── */}
            {featuredProducts.length > 0 && (
                <Section title="🌟 Produtos em Destaque na Loja" icon={<Star size={16} />}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {featuredProducts.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px' }}>
                                {p.imageBase64 && <img src={p.imageBase64} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #fcd34d' }} />}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#b45309' }}>R$ {Number(p.price || 0).toFixed(2).replace('.', ',')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── NO DATA NOTICE ── */}
            {analytics.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '16px', color: '#92400e' }}>
                    <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.6 }} />
                    <p style={{ fontWeight: 700, margin: 0, marginBottom: '6px' }}>Ainda sem dados de analytics coletados.</p>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>Visite a loja pública em <strong>/#/loja</strong> para que os primeiros eventos sejam registrados.</p>
                </div>
            )}

            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '16px' }}>
                Período: últimos {range} dias &nbsp;·&nbsp; {analytics.length} eventos coletados &nbsp;·&nbsp; {orders.length} pedidos no sistema
            </div>
        </div>
    );
}
