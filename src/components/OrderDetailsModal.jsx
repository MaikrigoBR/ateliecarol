import React from 'react';
import { 
    X, Edit, Trash2, Printer, Share2, Play, CheckCircle, Package, 
    Calendar, DollarSign, User, AlertCircle, Clock, Check, FileText, Phone, ArrowRight
} from 'lucide-react';

export function OrderDetailsModal({ isOpen, onClose, order, companyConfig, onEdit, onDelete, onPrint, onShare, onStartProduction, onComplete }) {
    if (!isOpen || !order) return null;

    // ----- Status Pipeline Logic -----
    const pipelineSteps = [
        { id: 'Novo', title: 'Novo' },
        { id: 'Em Produção', title: 'Produção' },
        { id: 'Pronto para Retirada', title: 'Pronto' },
        { id: 'Concluído', title: 'Concluído' },
    ];

    const currentStatus = order.status === 'processing' ? 'Em Produção' : 
                          order.status === 'completed' ? 'Concluído' : 
                          order.status || 'Novo';

    let currentStepIndex = 0;
    if (['Em Produção', 'Pagamento Parcial'].includes(currentStatus)) currentStepIndex = 1;
    if (['Pronto para Retirada', 'Despachado'].includes(currentStatus)) currentStepIndex = 2;
    if (currentStatus === 'Concluído') currentStepIndex = 3;

    // ----- Financial Logic -----
    const total = parseFloat(order.total) || 0;
    const paid = parseFloat(order.amountPaid) || 0;
    const balance = Math.max(0, total - paid);
    const paidPercentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
    const isOverdue = order.nextDueDate && new Date(order.nextDueDate) < new Date();

    const totalItems = order.cartItems ? order.cartItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0) : order.items || 0;

    // --- Inline Styles mapping to Theme Variables ---
    const sOverlay = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, padding: '1rem'
    };

    const sModal = {
        backgroundColor: 'var(--surface)',  // Respects Dark Mode
        width: '100%', maxWidth: '700px', maxHeight: '90vh',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        color: 'var(--text-main)', // Sets root text color for dark mode
        animation: 'slideUp 0.3s ease-out'
    };

    const sHeader = {
        padding: '1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        backgroundColor: 'var(--background)'
    };

    const sBody = {
        padding: '1.5rem',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '1.5rem'
    };

    const sFooter = {
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--background)',
        display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center'
    };

    const sCardLinear = {
        backgroundColor: 'var(--surface-hover)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem'
    };

    const sRowLinear = {
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
    };

    return (
        <div style={sOverlay} onClick={onClose}>
            <div style={sModal} onClick={e => e.stopPropagation()}>
                
                {/* Header: Title & Close */}
                <div style={sHeader}>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Detalhes do Pedido
                        </span>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={28} /> #{String(order.id).slice(-6).toUpperCase()}
                        </h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body: Linear Layout Content */}
                <div style={sBody} className="hide-scrollbar">
                    
                    {/* Pipeline / Progress */}
                    <div style={{ ...sCardLinear, flexDirection: 'row', justifyContent: 'space-between', padding: '1.5rem' }}>
                        {pipelineSteps.map((step, idx) => {
                            const isActive = idx === currentStepIndex;
                            const isPast = idx < currentStepIndex;
                            const color = isActive || isPast ? 'var(--primary)' : 'var(--border)';
                            const textColor = isActive ? 'var(--primary)' : isPast ? 'var(--text-main)' : 'var(--text-muted)';
                            
                            return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: isActive || isPast ? 'var(--primary)' : 'var(--surface)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, color: isActive || isPast ? '#fff' : 'transparent' }}>
                                        {(isActive || isPast) && (isPast ? <Check size={14} /> : <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff'}} />)}
                                    </div>
                                    {idx < pipelineSteps.length - 1 && (
                                        <div style={{ position: 'absolute', top: '1rem', left: '50%', right: '-50%', height: '2px', backgroundColor: isPast ? 'var(--primary)' : 'var(--border)', zIndex: 1 }}></div>
                                    )}
                                    <span style={{ marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: textColor, textAlign: 'center' }}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Customer Row */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <User size={18} color="var(--primary)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Cliente</h4>
                        </div>
                        <div style={sRowLinear}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{order.customer || 'Não identificado'}</h3>
                            {order.customerPhone && (
                                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: 'var(--text-light)', backgroundColor: 'var(--surface)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                                    <Phone size={14} /> {order.customerPhone}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Schedule Row */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <Calendar size={18} color="var(--primary)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Cronograma</h4>
                        </div>
                        <div style={{ ...sRowLinear, justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Entrada</p>
                                <p style={{ fontWeight: 600 }}>{order.date ? new Date(order.date).toLocaleDateString() : '--'}</p>
                            </div>
                            <ArrowRight size={20} color="var(--border)" />
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Entrega Estimada</p>
                                {order.deadline ? (
                                    <p style={{ fontWeight: 700, color: new Date(order.deadline) < new Date() ? 'var(--danger)' : 'var(--info)' }}>
                                        {new Date(order.deadline).toLocaleDateString()}
                                    </p>
                                ) : (
                                    <p style={{ fontWeight: 500, color: 'var(--text-light)' }}>A Definir</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Finance Row - Linear Mode */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <DollarSign size={18} color="var(--success)" />
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Resumo Financeiro</h4>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                            <div>
                                <span style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
                                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginRight: '4px' }}>R$</span>
                                    {total.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {balance <= 0 ? (
                                    <span style={{ backgroundColor: 'var(--success)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Check size={14} /> Totalmente Pago
                                    </span>
                                ) : (
                                    <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--warning)', fontSize: '0.875rem', fontWeight: 700 }}>
                                        Falta: R$ {balance.toFixed(2).replace('.', ',')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Lean Progress Bar */}
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginTop: '0.5rem' }}>
                            <div style={{ height: '100%', width: `${paidPercentage}%`, backgroundColor: 'var(--success)', transition: 'width 1s ease' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Pago ({(paidPercentage).toFixed(0)}%)</span>
                            {balance > 0 && order.nextDueDate && (
                                <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12}/> Vencimento: {new Date(order.nextDueDate).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Items List (Linear Lines, NO Table) */}
                    <div style={sCardLinear}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={18} color="var(--primary)" />
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Cesta de Itens ({totalItems})</h4>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {order.cartItems && order.cartItems.length > 0 ? (
                                order.cartItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{item.quantity}x {item.name || item.productName || 'Item Indefinido'}</p>
                                        </div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                            R$ {(item.quantity * parseFloat(item.price || 0)).toFixed(2).replace('.', ',')}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.875rem' }}>
                                    Detalhes dos itens não cadastrados nesse pedido.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Observations */}
                    {order.observations && (
                         <div style={{ ...sCardLinear, backgroundColor: '#fffbeb', borderColor: '#fef3c7', color: '#92400e' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                 <AlertCircle size={16} />
                                 <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>Anotações Importantes</h4>
                             </div>
                             <p style={{ fontSize: '0.875rem', margin: 0, whiteSpace: 'pre-wrap' }}>{order.observations}</p>
                         </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div style={sFooter}>
                    
                    {/* Secondary Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => { onClose(); onDelete(order.id); }} className="btn btn-icon" style={{ border: '1px solid var(--border)', color: 'var(--danger)' }} title="Excluir">
                            <Trash2 size={16} />
                        </button>
                        <button onClick={() => { onClose(); onEdit(order); }} className="btn btn-icon" style={{ border: '1px solid var(--border)', color: 'var(--primary)' }} title="Editar">
                            <Edit size={16} />
                        </button>
                    </div>

                    {/* Primary Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => { onClose(); onPrint(order); }} className="btn btn-secondary">
                            <Printer size={16} /> Imprimir
                        </button>
                        
                        <button onClick={() => onShare(order)} className="btn" style={{ backgroundColor: '#10b9811A', color: '#10b981', border: '1px solid #10b98133', fontWeight: 600 }}>
                            <Share2 size={16} /> Zap
                        </button>

                        {currentStepIndex === 0 && (
                            <button onClick={() => { onClose(); onStartProduction(order); }} className="btn btn-primary" style={{ backgroundColor: 'var(--warning)' }}>
                                <Play size={16} fill="currentColor"/> Produzir
                            </button>
                        )}

                        {currentStepIndex > 0 && currentStepIndex < 3 ? (
                            <button onClick={() => { onClose(); onComplete(order); }} className="btn btn-primary" style={{ backgroundColor: 'var(--success)' }}>
                                <CheckCircle size={18} /> Concluir
                            </button>
                        ) : currentStepIndex === 3 ? (
                            <span style={{ padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-hover)', color: 'var(--text-muted)', fontWeight: 600, border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={18} /> Finalizado
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
