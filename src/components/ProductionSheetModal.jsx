
import React, { useRef } from 'react';
import { X, Printer, Package, User, Calendar, ClipboardList } from 'lucide-react';

export function ProductionSheetModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl w-full bg-white relative print:shadow-none print:w-full print:max-w-none print:h-full print:absolute print:top-0 print:left-0">
        
        {/* No-Print Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 print:hidden"
        >
          <X size={24} />
        </button>

        {/* Printable Content */}
        <div className="p-8 print:p-0" id="printable-area">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ORDEM DE PRODUÇÃO</h1>
              <p className="text-gray-500 mt-1">#{order.id}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded inline-block mb-2">
                {order.status.toUpperCase()}
              </div>
              <p className="text-sm text-gray-500">Emissão: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Customer & Dates */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 font-bold mb-3 border-b border-gray-200 pb-2">
                <User size={18} /> CLIENTE
              </div>
              <p className="text-lg font-medium">{order.customer}</p>
              {/* Future: Add phone/email if available in order object or fetch from customer */}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 font-bold mb-3 border-b border-gray-200 pb-2">
                <Calendar size={18} /> PRAZOS
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase block">Data Pedido</span>
                  <span className="font-medium">{new Date(order.date || order.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase block">Entrega Prevista</span>
                  <span className="font-medium">{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'A combinar'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="mb-8">
             <div className="flex items-center gap-2 text-gray-800 font-bold mb-4">
                <Package size={18} /> DETALHES DO PRODUTO
             </div>
             
             <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 print:bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-gray-700">Item / Produto</th>
                            <th className="p-3 text-sm font-semibold text-gray-700 text-center">Qtd.</th>
                            <th className="p-3 text-sm font-semibold text-gray-700">Observações / Personalização</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                         {/* Usually orders have multiple items, but our NewOrderModal creates single-product orders so far. 
                             Adapting to potential future multi-item structure or current single item. */}
                         <tr>
                             <td className="p-4 font-medium">{order.productName || 'Produto Personalizado'}</td>
                             <td className="p-4 text-center font-mono">{order.items}</td>
                             <td className="p-4 text-gray-600 italic">
                                 {order.notes || 'Sem observações registradas.'}
                             </td>
                         </tr>
                    </tbody>
                </table>
             </div>
          </div>

          {/* Production Checklist (Static for now, meant to be printed and checked off) */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-gray-800 font-bold mb-4">
                <ClipboardList size={18} /> ETAPAS DE PRODUÇÃO
             </div>
             <div className="grid grid-cols-2 gap-4">
                {['Separação de Materiais', 'Impressão / Corte', 'Montagem', 'Acabamento', 'Conferência de Qualidade', 'Embalagem'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded print:border-gray-300">
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-sm"></div>
                        <span className="text-gray-700 font-medium">{step}</span>
                    </div>
                ))}
             </div>
          </div>

          {/* Notes Area */}
          <div className="border-t-2 border-dashed border-gray-300 pt-6 mt-12">
            <p className="text-sm text-gray-500 mb-2">Anotações Internas:</p>
            <div className="h-24 w-full bg-gray-50 border border-gray-200 rounded print:border-gray-300 print:bg-white"></div>
          </div>

        </div>

        {/* Footer Actions (No Print) */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 print:hidden bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="btn bg-white border border-gray-200 hover:bg-gray-50 text-gray-700">
            Fechar
          </button>
          <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
            <Printer size={16} /> Imprimir Ordem
          </button>
        </div>

      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .modal-content, .modal-content * {
            visibility: visible;
          }
          .modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            max-width: none;
            box-shadow: none;
            background: white;
            padding: 0;
          }
          .modal-overlay {
            background: white;
            position: absolute;
            z-index: 9999;
            width: 100vw;
            height: 100vh;
          }
        }
      `}</style>
    </div>
  );
}
