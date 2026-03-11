import React from 'react';
import { 
    X, Edit, Trash2, Printer, Share2, Play, CheckCircle, Package, 
    Calendar, DollarSign, User, AlertCircle, Clock, Check, Truck, 
    CreditCard, FileText, ArrowRight, Phone
} from 'lucide-react';

export function OrderDetailsModal({ isOpen, onClose, order, companyConfig, onEdit, onDelete, onPrint, onShare, onStartProduction, onComplete }) {
    if (!isOpen || !order) return null;

    // ----- Status Pipeline Logic -----
    const pipelineSteps = [
        { id: 'Novo', title: 'Novo', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100', activeBg: 'bg-blue-500' },
        { id: 'Em Produção', title: 'Produção', icon: Play, color: 'text-amber-500', bg: 'bg-amber-100', activeBg: 'bg-amber-500' },
        { id: 'Pronto para Retirada', title: 'Pronto', icon: Package, color: 'text-purple-500', bg: 'bg-purple-100', activeBg: 'bg-purple-500' },
        { id: 'Concluído', title: 'Concluído', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100', activeBg: 'bg-emerald-500' },
    ];

    const currentStatus = order.status === 'processing' ? 'Em Produção' : 
                          order.status === 'completed' ? 'Concluído' : 
                          order.status || 'Novo';

    // Map legacy status to pipeline index
    let currentStepIndex = 0;
    if (['Em Produção', 'Pagamento Parcial'].includes(currentStatus)) currentStepIndex = 1;
    if (['Pronto para Retirada', 'Despachado'].includes(currentStatus)) currentStepIndex = 2;
    if (currentStatus === 'Concluído') currentStepIndex = 3;

    // ----- Financial Logic -----
    const total = parseFloat(order.total) || 0;
    const paid = parseFloat(order.amountPaid) || 0;
    let balance = parseFloat(order.balanceDue) || 0;
    // Recalculate balance for precision
    balance = Math.max(0, total - paid);
    
    const paidPercentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
    const isOverdue = order.nextDueDate && new Date(order.nextDueDate) < new Date();

    const totalItems = order.cartItems ? order.cartItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0) : order.items || 0;

    return (
        <div className="modal-overlay" style={{ zIndex: 1050, backdropFilter: 'blur(4px)' }}>
            <div className="modal-content animate-slide-up" style={{ maxWidth: '850px', width: '100%', padding: 0, overflow: 'hidden', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                
                {/* Modern Dashboard Header */}
                <div className="bg-white p-6 border-b border-gray-200 relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-blue-50 opacity-50 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 -ml-16 -mt-16 w-48 h-48 rounded-full bg-indigo-50 opacity-50 pointer-events-none"></div>

                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500 border-0 z-20">
                        <X size={20} />
                    </button>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-600 rounded-xl shadow-md text-white">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-0.5">Detalhes do Pedido</p>
                                    <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-none">
                                        #{String(order.id).slice(-6).toUpperCase()}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Visual Status Pipeline */}
                        <div className="w-full md:w-auto mt-4 md:mt-0 pt-2 md:pt-0">
                            <div className="flex items-center gap-1 sm:gap-2">
                                {pipelineSteps.map((step, idx) => {
                                    const isActive = idx === currentStepIndex;
                                    const isPast = idx < currentStepIndex;
                                    const StepIcon = step.icon;
                                    
                                    return (
                                        <div key={idx} className="flex items-center">
                                            <div title={step.title} style={{ transition: 'all 0.3s' }} className={`flex flex-col items-center gap-1 ${isActive || isPast ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isActive ? step.activeBg + ' text-white ring-4 ring-' + step.activeBg.replace('bg-', '') + '/20' : isPast ? step.activeBg + ' text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                    {isPast ? <Check size={14} className="animate-fade-in" /> : <StepIcon size={14} />}
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase ${isActive ? step.color : 'text-gray-400'}`}>{step.title}</span>
                                            </div>
                                            {idx < pipelineSteps.length - 1 && (
                                                <div className={`w-6 sm:w-10 h-1 mx-1 sm:mx-2 rounded-full ${isPast ? pipelineSteps[idx].activeBg : 'bg-gray-200'}`}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Cards Content Area */}
                <div className="p-6 max-h-[60vh] overflow-y-auto hide-scrollbar space-y-6">
                    
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Customer Card */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><User size={60} /></div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={18} /></div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</h4>
                            </div>
                            <p className="font-bold text-gray-800 text-lg leading-tight">{order.customer || 'Não identificado'}</p>
                            {order.customerPhone && (
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Phone size={12}/> {order.customerPhone}</p>
                            )}
                        </div>

                        {/* Dates Card */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><Calendar size={60} /></div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={18} /></div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cronograma</h4>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-medium">Lançamento</span>
                                    <span className="font-bold text-gray-700">{order.date ? new Date(order.date).toLocaleDateString() : '--'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-2">
                                    <span className="text-gray-500 font-medium flex items-center gap-1"><Clock size={14}/> Prazo Final</span>
                                    {order.deadline ? (
                                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${new Date(order.deadline) < new Date() ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {new Date(order.deadline).toLocaleDateString()}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 font-semibold text-xs">A Definir</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financial Card (Visual) */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:-translate-y-2 transition-transform"><DollarSign size={60} /></div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={18} /></div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Financeiro</h4>
                            </div>
                            
                            <h3 className="text-2xl font-black text-gray-800 tracking-tight mt-1">
                                <sup className="text-xs text-gray-400 font-semibold mr-1">R$</sup>
                                {total.toFixed(2).replace('.', ',')}
                            </h3>

                            {/* Progress Bar for Payment */}
                            <div className="mt-3">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Pago: R$ {paid.toFixed(2)}</span>
                                    {balance > 0 ? (
                                        <span className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>Falta: R$ {balance.toFixed(2)}</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1"><Check size={10}/> Quitado</span>
                                    )}
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden flex">
                                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${paidPercentage}%` }}></div>
                                    {balance > 0 && <div className={`${isOverdue ? 'bg-red-500' : 'bg-orange-400'} h-1.5 rounded-r-full transition-all`} style={{ width: `${100 - paidPercentage}%`, opacity: 0.2 }}></div>}
                                </div>
                                {balance > 0 && order.nextDueDate && (
                                     <div className={`mt-1.5 text-[10px] font-bold flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                        {isOverdue ? <AlertCircle size={10}/> : <Clock size={10}/>} Vencimento: {new Date(order.nextDueDate).toLocaleDateString()}
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table Display - Modern Card Format */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                <Package size={16} className="text-indigo-500" /> Cesta de Produtos
                            </h4>
                            <span className="bg-white border border-gray-200 text-gray-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                                {totalItems} Itens Físicos
                            </span>
                        </div>
                        
                        {order.cartItems && order.cartItems.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {order.cartItems.map((item, idx) => (
                                    <div key={idx} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/50 flex items-center justify-center shrink-0 text-indigo-500 shadow-sm">
                                                <Package size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{item.name || item.productName || 'Item Indefinido'}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 font-medium">Qtd: {item.quantity} un.</p>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Subtotal</span>
                                            <span className="font-bold text-gray-800 text-sm">
                                                R$ {(item.quantity * parseFloat(item.price || 0)).toFixed(2).replace('.', ',')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                <Package size={32} className="opacity-20 mb-2"/>
                                <span className="text-sm font-medium">Itens não detalhados neste pedido legado.</span>
                            </div>
                        )}
                    </div>

                    {/* Observations */}
                    {order.observations && (
                         <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-2xl relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><FileText size={60}/></div>
                             <div className="flex items-center gap-2 mb-2 relative z-10">
                                 <AlertCircle size={16} className="text-amber-500 relative z-10"/>
                                 <p className="text-xs font-black text-amber-700 uppercase tracking-widest relative z-10">Anotações Importantes</p>
                             </div>
                             <p className="text-sm text-amber-900 font-medium relative z-10 leading-relaxed">{order.observations}</p>
                         </div>
                    )}
                </div>

                {/* Modern Footer Actions */}
                <div className="p-5 bg-white border-t border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
                    
                    {/* Secondary Actions (Left) */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => { onClose(); onDelete(order.id); }} className="btn btn-icon text-red-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 p-2.5 rounded-xl transition-all shadow-sm bg-white" title="Excluir o Pedido">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={() => { onClose(); onEdit(order); }} className="btn btn-icon text-blue-500 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 p-2.5 rounded-xl transition-all shadow-sm bg-white" title="Editar Pedido">
                            <Edit size={18} />
                        </button>
                    </div>

                    {/* Primary Actions (Right) */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-1">
                        <button onClick={() => { onClose(); onPrint(order); }} className="btn bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 hover:text-gray-900 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)] px-4 py-2.5 flex items-center gap-2 rounded-xl transition-all">
                            <Printer size={16} /> Imprimir OP
                        </button>
                        
                        <button onClick={() => onShare(order)} className="btn bg-[#25D366]/10 border border-[#25D366]/20 text-[#128C7E] font-bold hover:bg-[#25D366]/20 shadow-[0_2px_4px_-2px_rgba(0,0,0,0.05)] px-4 py-2.5 flex items-center gap-2 rounded-xl transition-all">
                            <Share2 size={16} /> Notificar
                        </button>

                        {currentStepIndex === 0 && (
                            <button onClick={() => { onClose(); onStartProduction(order); }} className="btn bg-amber-500 border border-amber-600 text-white font-bold hover:bg-amber-600 shadow-md px-5 py-2.5 flex items-center gap-2 rounded-xl transition-all transform hover:-translate-y-0.5">
                                <Play size={16} fill="currentColor"/> Produzir
                            </button>
                        )}

                        {currentStepIndex > 0 && currentStepIndex < 3 ? (
                            <button onClick={() => { onClose(); onComplete(order); }} className="btn bg-emerald-500 border border-emerald-600 text-white font-bold hover:bg-emerald-600 shadow-md px-5 py-2.5 flex items-center gap-2 rounded-xl transition-all transform hover:-translate-y-0.5">
                                <CheckCircle size={18} /> Concluir & Receber
                            </button>
                        ) : currentStepIndex === 3 ? (
                            <span className="px-5 py-2.5 bg-gray-100 text-gray-400 font-bold rounded-xl flex items-center gap-2 cursor-not-allowed border border-gray-200 shadow-inner">
                                <CheckCircle size={18} /> Finalizado
                            </span>
                        ) : null}
                    </div>

                </div>
            </div>
        </div>
    );
}
