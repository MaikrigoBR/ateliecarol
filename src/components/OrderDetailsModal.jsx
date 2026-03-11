import React from 'react';
import { X, Edit, Trash2, Printer, Share2, Play, CheckCircle, Package, Calendar, DollarSign, User, AlertCircle, Clock } from 'lucide-react';

export function OrderDetailsModal({ isOpen, onClose, order, companyConfig, onEdit, onDelete, onPrint, onShare, onStartProduction, onComplete }) {
    if (!isOpen || !order) return null;

    const getStatusBadge = (status) => {
        let style = { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
        let label = status;

        switch (status) {
            case 'Novo':
                style = { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
                break;
            case 'processing':
            case 'Em Produção':
                label = 'Em Produção';
                style = { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
                break;
            case 'Pronto para Retirada':
                style = { backgroundColor: '#fae8ff', color: '#a21caf', border: '1px solid #f5d0fe' };
                break;
            case 'Concluído':
            case 'completed':
                label = 'Concluído';
                style = { backgroundColor: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' };
                break;
            case 'Pagamento Parcial':
                label = 'Pgto. Parcial';
                style = { backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' };
                break;
            case 'Despachado':
                style = { backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' };
                break;
            case 'Aguardando Aprovação':
                style = { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' };
                break;
        }

        return <span style={{ ...style, padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>{label}</span>;
    };

    const getFinancialStatus = (o) => {
        const total = o.total || 0;
        const paid = o.amountPaid || 0;
        const balance = o.balanceDue || 0;
        const isOverdue = o.nextDueDate && new Date(o.nextDueDate) < new Date();

        if (balance <= 0.05 && total > 0) return <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">Totalmente Pago</span>;
        if (paid === 0) return <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Pagamento Pendente</span>;

        return (
            <div className="flex flex-col gap-1 items-end sm:items-start text-sm p-3 bg-orange-50 rounded-lg border border-orange-100">
                <span className="font-bold text-gray-700">Pago: R$ {paid.toFixed(2).replace('.', ',')}</span>
                <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                    Restam: R$ {balance.toFixed(2).replace('.', ',')}
                </span>
                {o.nextDueDate && (
                    <span className={`flex items-center gap-1 mt-1 text-xs ${isOverdue ? 'text-red-700 font-bold' : 'text-gray-500'}`}>
                        {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                        Vence: {new Date(o.nextDueDate).toLocaleDateString()}
                    </span>
                )}
            </div>
        );
    };

    const totalItems = order.cartItems ? order.cartItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0) : order.items || 0;

    return (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
            <div className="modal-content animate-slide-up" style={{ maxWidth: '800px', width: '100%', padding: 0, overflow: 'hidden', backgroundColor: 'var(--surface)', borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
                
                {/* Header Dinâmico */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white border-0 z-20">
                        <X size={20} />
                    </button>
                    
                    <div className="flex justify-between items-start mt-2">
                        <div>
                            <span className="text-blue-200 font-bold tracking-widest text-xs uppercase mb-1 block">Detalhes do Pedido</span>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                #{String(order.id).slice(-6).toUpperCase()}
                            </h2>
                        </div>
                        <div className="mt-2">
                            {getStatusBadge(order.status)}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    
                    {/* Resumo grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Info Cliente & Datas */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Cliente</p>
                                    <p className="font-bold text-gray-800 text-base">{order.customer || 'Não identificado'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                                    <Calendar size={20} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Data da Venda</p>
                                        <p className="font-semibold text-gray-700 text-sm">{order.date ? new Date(order.date).toLocaleDateString() : '--'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Prazo de Entrega</p>
                                        {order.deadline ? (
                                            <p className={`font-bold text-sm ${new Date(order.deadline) < new Date() ? 'text-red-600' : 'text-blue-600'}`}>
                                                {new Date(order.deadline).toLocaleDateString()}
                                            </p>
                                        ) : (
                                            <p className="font-semibold text-gray-500 text-sm">Não def.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info Financeiro */}
                        <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <DollarSign size={100} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2"><DollarSign size={14} /> Resumo Financeiro</p>
                                <h3 className="text-3xl font-black text-gray-800 tracking-tight">
                                    <sup className="text-sm text-gray-500 font-semibold mr-1">R$</sup>
                                    {((order.total || 0)).toFixed(2).replace('.', ',')}
                                </h3>
                            </div>
                            <div className="mt-4 z-10">
                                {getFinancialStatus(order)}
                            </div>
                        </div>
                    </div>

                    {/* Itens do Pedido */}
                    <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Package size={16} className="text-indigo-500" /> Itens Inclusos ({totalItems})
                        </h4>
                        
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            {order.cartItems && order.cartItems.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="py-2 px-4">Produto</th>
                                            <th className="py-2 px-4 text-center">Qtd</th>
                                            <th className="py-2 px-4 text-right">Preço Un.</th>
                                            <th className="py-2 px-4 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {order.cartItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="py-3 px-4 font-medium text-gray-700">{item.name || item.productName || 'Item Indefinido'}</td>
                                                <td className="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
                                                <td className="py-3 px-4 text-right text-gray-600">R$ {parseFloat(item.price || 0).toFixed(2).replace('.', ',')}</td>
                                                <td className="py-3 px-4 text-right font-bold text-gray-800">R$ {(item.quantity * parseFloat(item.price || 0)).toFixed(2).replace('.', ',')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-4 text-center text-gray-500 italic text-sm bg-gray-50">
                                    Itens não detalhados. Total cadastrado: {order.items} iten(s).
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Observações */}
                    {order.observations && (
                         <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-sm">
                             <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Observações do Pedido</p>
                             <p className="text-gray-700">{order.observations}</p>
                         </div>
                    )}
                </div>

                {/* Footer de Ações Moderno */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-3 justify-end items-center">
                    
                    {/* Ações Secundárias */}
                    <div className="flex items-center gap-2 mr-auto opacity-80 hover:opacity-100 transition-opacity">
                        <button onClick={() => { onClose(); onDelete(order.id); }} className="btn btn-icon text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 p-2" title="Excluir">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={() => { onClose(); onEdit(order); }} className="btn btn-icon text-blue-500 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 p-2" title="Editar">
                            <Edit size={18} />
                        </button>
                    </div>

                    {/* Ações Principais */}
                    <button onClick={() => { onClose(); onPrint(order); }} className="btn bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 shadow-sm px-4 py-2 flex items-center gap-2 rounded-lg">
                        <Printer size={16} /> Imprimir OP
                    </button>
                    
                    <button onClick={() => onShare(order)} className="btn bg-pink-50 border border-pink-200 text-pink-600 font-semibold hover:bg-pink-100 shadow-sm px-4 py-2 flex items-center gap-2 rounded-lg">
                        <Share2 size={16} /> Zap Cliente
                    </button>

                    {order.status === 'Novo' && (
                        <button onClick={() => { onClose(); onStartProduction(order); }} className="btn bg-amber-50 border border-amber-300 text-amber-700 font-semibold hover:bg-amber-100 hover:text-amber-800 shadow-sm px-4 py-2 flex items-center gap-2 rounded-lg">
                            <Play size={16} /> Produzir
                        </button>
                    )}

                    {order.status !== 'Concluído' ? (
                        <button onClick={() => { onClose(); onComplete(order); }} className="btn bg-emerald-500 border border-emerald-600 text-white font-bold hover:bg-emerald-600 shadow-md px-5 py-2 flex items-center gap-2 rounded-lg">
                            <CheckCircle size={18} /> Finalizar & Receber
                        </button>
                    ) : (
                        <span className="px-4 py-2 bg-gray-200 text-gray-500 font-bold rounded-lg flex items-center gap-2 cursor-not-allowed border border-gray-300">
                            <CheckCircle size={18} /> Pedido Finalizado
                        </span>
                    )}

                </div>
            </div>
        </div>
    );
}
