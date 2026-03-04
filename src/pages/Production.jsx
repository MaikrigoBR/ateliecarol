import React, { useState, useEffect } from 'react';
import { ClipboardList, Palette, Printer, Scissors, CheckCheck, MapPin, Calendar, AlertCircle, MessageCircle, User, Clock, CheckSquare } from 'lucide-react';
import db from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import AuditService from '../services/AuditService';

const COLUMNS = [
    { id: 'pending', label: 'Fila de Produção', icon: ClipboardList, color: 'var(--text-muted)' },
    { id: 'design', label: 'Design / Arte', icon: Palette, color: '#8b5cf6' },
    { id: 'printing', label: 'Impressão / Confecção', icon: Printer, color: '#3b82f6' },
    { id: 'finishing', label: 'Acabamento', icon: Scissors, color: '#f59e0b' }
];

const QC_CHECKLISTS = {
    printing: ["Revisão ortográfica aprovada?", "Sangria e margens verificadas?", "Padrão de cor correto?"],
    finishing: ["Impressão sem manchas?", "Corte alinhado?", "Quantidade exata produzida?"],
    complete_order: ["Itens conferidos e embalados?", "Etiqueta/Mimo adicionado?"]
};

// SLA limit per step in hours
const SLA_HOURS = {
    pending: 24,
    design: 48,
    printing: 24,
    finishing: 24
};

export function Production() {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    // Drag State
    const [draggedOrder, setDraggedOrder] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    // QC flow state
    const [qcModalOpen, setQcModalOpen] = useState(false);
    const [qcOrderPending, setQcOrderPending] = useState(null);
    const [qcTargetStep, setQcTargetStep] = useState(null);
    const [qcChecks, setQcChecks] = useState({});

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const allOrders = await db.getAll('orders') || [];
            const allProducts = await db.getAll('products') || [];
            const allCustomers = await db.getAll('customers') || [];
            const allStaff = await db.getAll('staff') || [];
            
            // Filter orders that are active in production
            const activeOrders = allOrders.filter(o => 
                (o.status === 'processing' || o.status === 'Em Produção') || 
                (o.productionStep && o.status !== 'completed' && o.status !== 'Concluído' && o.status !== 'cancelled')
            );
            
            setOrders(activeOrders);
            setProducts(allProducts);
            setCustomers(allCustomers);
            setStaff(allStaff);
        } catch (e) {
            console.error("Erro ao carregar produção", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Helper: Formats the phone for WA
    const formatWaPhone = (phoneStr) => {
        if (!phoneStr) return '';
        const num = phoneStr.replace(/\D/g, '');
        if (num.length >= 10) return `55${num}`;
        return num; // fallback
    };

    const handleWhatsApp = (order) => {
        const cName = order.customerName || order.customer;
        const customerObj = customers.find(c => c.name === cName);
        if (customerObj && customerObj.phone) {
            const phone = formatWaPhone(customerObj.phone);
            const stepName = COLUMNS.find(c => c.id === order.productionStep)?.label || 'Produção';
            const text = encodeURIComponent(`Olá ${customerObj.name}, tudo bem? Seu pedido #${order.id.toString().substring(0,8)} acaba de entrar na fase de [${stepName}]. Logo o enviaremos!`);
            window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        } else {
            alert("Este cliente não possui telefone/WhatsApp cadastrado.");
        }
    };

    const handleAssign = async (orderId, staffId) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        const history = order.productionHistory || [];
        const currentStep = order.productionStep || 'pending';
        
        const lastEntryIndex = history.findIndex(h => h.step === currentStep && !h.exitedAt);
        if (lastEntryIndex !== -1) {
            history[lastEntryIndex].assigneeId = staffId;
        } else if (history.length === 0 && currentStep === 'pending') {
            history.push({ step: 'pending', enteredAt: order.date || new Date().toISOString(), assigneeId: staffId });
        }

        await db.update('orders', orderId, { 
            assigneeId: staffId,
            productionHistory: history
        });
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assigneeId: staffId, productionHistory: history } : o));
    };

    // --- QC & Move Flow ---
    const handleMoveRequest = (order, nextStep) => {
        // If there's a checklist to enter nextStep, prompt QC Modal
        const checklist = QC_CHECKLISTS[nextStep];
        if (checklist && checklist.length > 0) {
            setQcOrderPending(order);
            setQcTargetStep(nextStep);
            
            // setup check state
            const initialChecks = {};
            checklist.forEach((_, i) => initialChecks[i] = false);
            setQcChecks(initialChecks);
            
            setQcModalOpen(true);
        } else {
            finalizeMove(order, nextStep);
        }
    };

    const confirmQc = () => {
        const allChecked = Object.values(qcChecks).every(v => v === true);
        if (!allChecked) {
            alert("Por favor, verifique todos os itens antes de avançar!");
            return;
        }
        finalizeMove(qcOrderPending, qcTargetStep);
        setQcModalOpen(false);
        setQcOrderPending(null);
        setQcTargetStep(null);
    };

    const triggerAutomation = (order, stepId) => {
        const cName = order.customerName || order.customer;
        const customerObj = customers.find(c => c.name === cName);
        if (customerObj && customerObj.phone) {
            const num = customerObj.phone.replace(/\D/g, '');
            if (num.length >= 10) {
                const stepName = COLUMNS.find(c => c.id === stepId)?.label || 'Concluído';
                
                // Show Automation Toast
                const toast = document.createElement('div');
                toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: white; padding: 16px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; z-index: 9999; display: flex; align-items: center; gap: 12px; transition: all 0.3s ease; transform: translateY(100px); opacity: 0;';
                toast.innerHTML = `
                    <div style="background: #25D366; padding: 8px; border-radius: 50%; display: flex;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">Automação de Rastreio (CRM)</div>
                        <div style="color: #64748b; font-size: 0.75rem;">Status WhatsApp atualizado p/ <strong>${customerObj.name.split(' ')[0]}</strong></div>
                    </div>
                `;
                document.body.appendChild(toast);
                
                // Animate In
                setTimeout(() => {
                    toast.style.transform = 'translateY(0)';
                    toast.style.opacity = '1';
                }, 100);
                
                // Animate Out
                setTimeout(() => {
                    toast.style.transform = 'translateY(100px)';
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }, 4000);
            }
        }
    };

    const finalizeMove = async (order, nextStep) => {
        const nowIso = new Date().toISOString();
        const history = order.productionHistory || [];
        const currentStep = order.productionStep || 'pending';
        
        const lastEntryIndex = history.findIndex(h => h.step === currentStep && !h.exitedAt);
        if (lastEntryIndex !== -1) {
            history[lastEntryIndex].exitedAt = nowIso;
        } else if (currentStep === 'pending' && history.length === 0) {
            history.push({ step: 'pending', enteredAt: order.date || nowIso, exitedAt: nowIso, assigneeId: order.assigneeId || null });
        }

        if (nextStep === 'complete_order') {
            await db.update('orders', order.id, { 
                status: 'Pronto para Retirada', 
                productionStep: 'completed',
                productionHistory: history
            });
            setOrders(prev => prev.filter(o => o.id !== order.id)); // Remove da fila Kanban visualmente
            AuditService.log(currentUser, 'UPDATE', 'Order', order.id, `Produção finalizada. Aguardando retirada/envio.`);
            triggerAutomation(order, 'completed');
            return;
        }

        history.push({
            step: nextStep,
            enteredAt: nowIso,
            assigneeId: order.assigneeId || null
        });

        await db.update('orders', order.id, { 
            productionStep: nextStep,
            status: 'processing',
            lastStepUpdatedAt: nowIso,
            productionHistory: history
        });
        
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, productionStep: nextStep, lastStepUpdatedAt: nowIso, productionHistory: history } : o));
        
        const stepLabel = COLUMNS.find(c => c.id === nextStep)?.label || nextStep;
        AuditService.log(currentUser, 'UPDATE', 'Order', order.id, `Moveu para etapa: ${stepLabel}`);
        triggerAutomation(order, nextStep);
    };



    // --- Drag and Drop ---
    const onDragStart = (e, order) => {
        setDraggedOrder(order);
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragOver = (e, colId) => {
        e.preventDefault();
        setDragOverColumn(colId);
    };

    const onDrop = (e, colId) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (draggedOrder && colId) {
            // Prevent dropping in the exact same col
            const currentStep = draggedOrder.productionStep || 'pending';
            if (currentStep !== colId) {
                handleMoveRequest(draggedOrder, colId);
            }
        }
        setDraggedOrder(null);
    };

    // Helpers
    const getOrdersByStep = (stepId) => {
        const filtered = orders.filter(o => {
            const currentStep = o.productionStep || 'pending';
            return currentStep === stepId;
        });

        // Forced Sort by Deadline (ASC - closest/overdue first)
        return filtered.sort((a, b) => {
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1; // Unscheduled goes to the bottom
            if (!b.deadline) return -1;
            
            return new Date(a.deadline) - new Date(b.deadline);
        });
    };

    const getDeadlineInfo = (deadline) => {
        if (!deadline) return null;
        
        // Resetting hours to guarantee clean day diff math
        const now = new Date();
        now.setHours(0,0,0,0);
        
        // Handling timezone offsets dynamically by splitting date 'YYYY-MM-DD'
        const parts = deadline.split('-');
        if(parts.length !== 3) return null;
        
        const dead = new Date(parts[0], parts[1]-1, parts[2]); 
        dead.setHours(0,0,0,0);
        
        const diffTime = dead - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { text: `Atrasado ${Math.abs(diffDays)}d`, color: 'bg-red-100 text-red-700 border-red-200' };
        if (diffDays === 0) return { text: 'Vence Hoje!', color: 'bg-orange-100 text-orange-700 border-orange-200 font-bold uppercase' };
        if (diffDays <= 2) return { text: `Faltam ${diffDays}d`, color: 'bg-amber-100 text-amber-700 border-amber-200 font-medium' };
        
        return { text: `Prazo: ${dead.toLocaleDateString()}`, color: 'bg-blue-50 text-blue-600 border-blue-100' };
    };

    // SLA display logic
    const getSlaInfo = (order, stepId) => {
        if (!order.lastStepUpdatedAt) return { hours: 0, overtime: false };
        const msSince = new Date() - new Date(order.lastStepUpdatedAt);
        const hours = msSince / (1000 * 60 * 60);
        const limit = SLA_HOURS[stepId] || 24;
        return { 
            hours: Math.floor(hours), 
            overtime: hours > limit,
            limit: limit
        };
    };

    if (loading) return <div className="p-xl text-center">Carregando quadro...</div>;

    return (
        <div className="animate-fade-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header flex justify-between items-center">
                <div>
                    <h2>Controle de Produção</h2>
                    <div className="text-sm text-muted">Acompanhe gargalos, SLA e atue nas aprovações de qualidade.</div>
                </div>
            </div>

            <div className="kanban-board" style={{ 
                display: 'flex', 
                gap: 'var(--space-md)', 
                overflowX: 'auto', 
                flex: 1, 
                paddingBottom: 'var(--space-md)' 
            }}>
                {COLUMNS.map((col, index) => {
                    const colOrders = getOrdersByStep(col.id);
                    const isLastCol = index === COLUMNS.length - 1;
                    const isDragOver = dragOverColumn === col.id;

                    return (
                        <div 
                            key={col.id} 
                            className={`kanban-column transition-colors duration-200 ${isDragOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
                            style={{ 
                                minWidth: '320px', 
                                width: '320px', 
                                backgroundColor: isDragOver ? '#eff6ff' : 'var(--surface-hover)', 
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-md)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onDragOver={(e) => onDragOver(e, col.id)}
                            onDrop={(e) => onDrop(e, col.id)}
                        >
                            <div className="column-header" style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: col.color }}>
                                <col.icon size={18} />
                                <span>{col.label}</span>
                                <span className="badge badge-neutral ml-auto">{colOrders.length}</span>
                            </div>

                            <div className="column-content hide-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {colOrders.length === 0 && (
                                    <div className="text-center text-muted text-sm py-lg opacity-50 border-2 border-dashed border-transparent rounded h-full flex items-center justify-center">
                                        {isDragOver ? 'Solte aqui' : 'Vazio'}
                                    </div>
                                )}
                                {colOrders.map(order => {
                                    const sla = getSlaInfo(order, col.id);
                                    const deadlineBadge = getDeadlineInfo(order.deadline);
                                    const isGargalo = sla.overtime;
                                    
                                    return (
                                    <div 
                                        key={order.id} 
                                        className={`kanban-card cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${isGargalo ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
                                        draggable="true"
                                        onDragStart={(e) => onDragStart(e, order)}
                                        style={{ 
                                            backgroundColor: isGargalo ? '#fff5f5' : 'var(--surface)', 
                                            padding: 'var(--space-md)', 
                                            borderRadius: 'var(--radius-md)', 
                                            boxShadow: 'var(--shadow-sm)',
                                            borderLeft: `4px solid ${isGargalo ? '#ef4444' : col.color}`,
                                            opacity: draggedOrder?.id === order.id ? 0.5 : 1
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-xs">
                                            <span className="font-bold text-sm">#{order.id?.toString().substring(0,8)}</span>
                                            {isGargalo ? (
                                                <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }} title={`Ultrapassou o limite de SLA de ${sla.limit}h`}>
                                                    <AlertCircle size={10} className="mr-1 inline" />Gargalo
                                                </span>
                                            ) : (
                                                <span className="text-xs flex items-center gap-xs text-muted" title={`Tempo nesta etapa: ${sla.hours}h (Max ${sla.limit}h)`}>
                                                    <Clock size={10} />
                                                    {sla.hours}h
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="text-sm font-medium mb-1 truncate">{order.customerName || order.customer || 'Cliente sem nome'}</div>
                                        
                                        {/* NEW: Deadline Visual Indicator */}
                                        {deadlineBadge && (
                                            <div className="mb-2 flex">
                                                <span className={`text-[10px] px-2 py-0.5 flex items-center gap-1 rounded border shadow-sm ${deadlineBadge.color}`}>
                                                    <Calendar size={10} /> {deadlineBadge.text}
                                                </span>
                                            </div>
                                        )}

                                        <div className="text-xs text-muted mb-sm line-clamp-2">
                                            {(() => {
                                                const product = products.find(p => p.id == order.productId);
                                                return `${order.items || 1}x ${product?.name || order.productName || 'Produto Personalizado'}`;
                                            })()}
                                        </div>

                                        {/* Assignee Selection */}
                                        <div className="mb-sm flex items-center gap-1 text-xs">
                                            <User size={12} className="text-muted" />
                                            <select 
                                                className="bg-transparent text-xs p-1 rounded hover:bg-black/5 outline-none border-none cursor-pointer flex-1 text-gray-700"
                                                value={order.assigneeId || ''}
                                                onChange={(e) => handleAssign(order.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">Não atribuído...</option>
                                                {staff.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-xs mt-auto pt-sm border-t border-border/50 items-center justify-between">
                                            <button 
                                                className="btn btn-icon p-1 hover:text-green-600 transition-colors" 
                                                title="Notificar Cliente (WhatsApp)"
                                                onClick={() => handleWhatsApp(order)}
                                                style={{ color: '#25D366' }}
                                            >
                                                <MessageCircle size={16} />
                                            </button>

                                            {isLastCol ? (
                                                <button 
                                                    className="btn btn-xs flex items-center justify-center gap-1 text-white ml-auto" 
                                                    onClick={() => handleMoveRequest(order, 'complete_order')}
                                                    style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)', padding: '4px 8px' }}
                                                    title="Finalizar Pedido"
                                                >
                                                    Concluir <CheckCheck size={12} />
                                                </button>
                                            ) : (
                                                <div className="text-[10px] text-muted text-right italic ml-auto pr-1">
                                                    Arraste para avançar
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* QC Checklist Modal */}
            {qcModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title flex items-center gap-2">
                                <CheckSquare size={18} /> Controle de Qualidade
                            </h2>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-muted mb-4">
                                Verifique as etapas obrigatórias de qualidade antes de mover o pedido para <strong>{
                                    qcTargetStep === 'complete_order' ? 'Concluir' : COLUMNS.find(c => c.id === qcTargetStep)?.label
                                }</strong>.
                            </p>
                            
                            <div className="space-y-3">
                                {QC_CHECKLISTS[qcTargetStep]?.map((checkLabel, i) => (
                                    <label key={i} className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-border transition-colors">
                                        <input 
                                            type="checkbox" 
                                            className="mt-1"
                                            checked={qcChecks[i] || false}
                                            onChange={(e) => setQcChecks(prev => ({ ...prev, [i]: e.target.checked }))}
                                        />
                                        <span className="text-sm">{checkLabel}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setQcModalOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={confirmQc}>Confirmar e Avançar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
