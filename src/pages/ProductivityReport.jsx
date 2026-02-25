import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import db from '../services/database';
import '../css/pages.css';

export function ProductivityReport() {
    const [orders, setOrders] = useState([]);
    const [staff, setStaff] = useState([]);
    const [period, setPeriod] = useState('month'); // 'week' or 'month'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const allOrders = await db.getAll('orders') || [];
                const allStaff = await db.getAll('staff') || [];
                setOrders(allOrders.filter(o => o.productionHistory && o.productionHistory.length > 0));
                setStaff(allStaff);
            } catch (e) {
                console.error("Erro ao carregar dados de produtividade", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Helper: Filter history items based on period
    const isInPeriod = (dateIso) => {
        if (!dateIso) return false;
        const date = new Date(dateIso);
        const now = new Date();
        if (period === 'week') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= lastWeek && date <= now;
        } else if (period === 'month') {
            const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return date >= lastMonth && date <= now;
        }
        return true;
    };

    // Calculate Metrics
    const processMetrics = () => {
        let totalCompletedTasks = 0;
        let totalTimeHours = 0;
        const stepStats = {};
        const staffStats = {};
        let bottlenecks = 0;

        orders.forEach(order => {
            order.productionHistory.forEach(h => {
                if (!isInPeriod(h.enteredAt)) return;

                const stepName = h.step || 'unknown';
                const assigneeId = h.assigneeId || 'unassigned';

                if (!stepStats[stepName]) {
                    stepStats[stepName] = { count: 0, totalHours: 0 };
                }
                
                if (assigneeId !== 'unassigned') {
                    if (!staffStats[assigneeId]) {
                        staffStats[assigneeId] = { count: 0, name: staff.find(s => s.id === assigneeId)?.name || 'Desconhecido' };
                    }
                }

                if (h.exitedAt) {
                    const durationH = (new Date(h.exitedAt) - new Date(h.enteredAt)) / (1000 * 60 * 60);
                    stepStats[stepName].count += 1;
                    stepStats[stepName].totalHours += durationH;
                    totalCompletedTasks += 1;
                    totalTimeHours += durationH;

                    if (assigneeId !== 'unassigned') {
                        staffStats[assigneeId].count += 1;
                    }

                    // Soft SLA check for bottlenecks indicator (e.g. > 24h is a bottleneck)
                    if (durationH > 24) bottlenecks++;
                }
            });
        });

        const stepChartData = Object.keys(stepStats).map(key => ({
            name: key === 'pending' ? 'Fila' : key === 'design' ? 'Design' : key === 'printing' ? 'Impressão' : key === 'finishing' ? 'Acabamento' : key,
            'Horas Médias': stepStats[key].count > 0 ? parseFloat((stepStats[key].totalHours / stepStats[key].count).toFixed(2)) : 0
        })).filter(d => d.name !== 'complete_order' && d.name !== 'completed');

        const staffChartData = Object.keys(staffStats).map(key => ({
            name: staffStats[key].name,
            'Tarefas Concluídas': staffStats[key].count
        })).sort((a,b) => b['Tarefas Concluídas'] - a['Tarefas Concluídas']);

        return {
            totalTasks: totalCompletedTasks,
            avgTime: totalCompletedTasks > 0 ? (totalTimeHours / totalCompletedTasks).toFixed(1) : 0,
            bottlenecks,
            stepChartData,
            staffChartData
        };
    };

    if (loading) return <div className="p-xl text-center">Calculando métricas...</div>;

    const metrics = processMetrics();

    return (
        <div className="animate-fade-in" style={{ paddingBottom: 'var(--space-xl)' }}>
            <div className="card-header flex justify-between items-center mb-lg">
                <div>
                    <h2>Produtividade & Desempenho</h2>
                    <p className="text-muted text-sm">Análise de eficiência do fluxo de trabalho da equipe.</p>
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${period === 'week' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
                        onClick={() => setPeriod('week')}
                    >
                        Últimos 7 Dias
                    </button>
                    <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${period === 'month' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
                        onClick={() => setPeriod('month')}
                    >
                        Últimos 30 Dias
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card relative overflow-hidden group" style={{ borderLeftColor: '#10b981' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity">
                        <TrendingUp size={64} className="text-green-500" />
                    </div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total de Tarefas Concluídas</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.totalTasks}</p>
                </div>

                <div className="stat-card relative overflow-hidden group" style={{ borderLeftColor: '#3b82f6' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity">
                        <Clock size={64} className="text-blue-500" />
                    </div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tempo Médio p/ Etapa</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.avgTime}h</p>
                </div>

                <div className="stat-card relative overflow-hidden group" style={{ borderLeftColor: '#f59e0b' }}>
                     <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity">
                        <AlertTriangle size={64} className="text-orange-500" />
                    </div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Movimentos c/ Gargalo</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ea580c' }}>{metrics.bottlenecks}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>&gt; 24h na etapa</p>
                </div>

                <div className="stat-card relative overflow-hidden group" style={{ borderLeftColor: '#8b5cf6' }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity">
                        <Users size={64} className="text-purple-500" />
                    </div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Membros Ativos</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.staffChartData.length}</p>
                </div>
            </div>

            <div className="charts-layout">
                <div className="chart-card">
                    <div className="chart-header">
                        <TrendingUp size={20} color="var(--primary)" /> Gargalos: Tempo Médio por Etapa (Horas)
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.stepChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="Horas Médias" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <Users size={20} color="#3b82f6" /> Ranking: Tarefas Concluídas por Staff
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.staffChartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="Tarefas Concluídas" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {metrics.staffChartData.length === 0 && (
                        <div className="text-center text-muted mt-4 italic text-sm">
                            Nenhuma tarefa concluída por funcionário no período.<br/>
                            Lembre-se de designar o responsável na aba de Produção.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
