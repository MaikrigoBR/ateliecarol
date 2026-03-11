
import React, { useRef } from 'react';
import { X, Printer, Package, User, Calendar, ClipboardList } from 'lucide-react';

export function ProductionSheetModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  // --- Inline Styles mapping to Theme Variables ---
  const sOverlay = {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1050, padding: '1rem'
  };

  const sModal = {
      backgroundColor: 'var(--surface)', 
      width: '100%', maxWidth: '800px', maxHeight: '90vh',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex', flexDirection: 'column',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      color: 'var(--text-main)',
      animation: 'slideUp 0.3s ease-out'
  };

  const sBody = {
      padding: '2rem',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: '1.5rem',
      backgroundColor: 'var(--background)'
  };

  const sFooter = {
      padding: '1.25rem 2rem',
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
      display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center'
  };

  const sCardLinear = {
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={sOverlay} onClick={onClose} className="modal-overlay-print">
      <div style={sModal} onClick={e => e.stopPropagation()} className="modal-content-print">
        
        {/* No-Print Close Button */}
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}
          className="print-hidden"
        >
          <X size={20} />
        </button>

        {/* Printable Content */}
        <div style={sBody} id="printable-area" className="print-body">
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--text-main)', paddingBottom: '1.5rem', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em', margin: 0 }}>ORDEM DE PRODUÇÃO</h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>#{String(order.id).slice(-6).toUpperCase()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)', display: 'inline-block', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
                {order.status ? order.status.toUpperCase() : 'NOVO'}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Emissão: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Customer */}
              <div style={{ ...sCardLinear, flex: 1, minWidth: '250px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <User size={18} /> CLIENTE
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{order.customer}</p>
              </div>
              
              {/* Dates */}
              <div style={{ ...sCardLinear, flex: 1, minWidth: '250px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <Calendar size={18} /> PRAZOS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Data Pedido</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{new Date(order.date || order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Entrega Prevista</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'A combinar'}</span>
                    </div>
                </div>
              </div>
          </div>

          {/* Product Details (Linear) */}
          <div style={{ ...sCardLinear, backgroundColor: 'transparent' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <Package size={18} /> DETALHES DO PRODUTO
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                     <div style={{ flex: 2 }}>
                         <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Item / Descrição</span>
                         <strong style={{ fontSize: '1.125rem', color: 'var(--text-main)' }}>{order.productName || 'Produto Personalizado'}</strong>
                         
                         <div style={{ marginTop: '0.75rem' }}>
                             <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Observações / Personalização</span>
                             <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontStyle: 'italic', margin: 0 }}>{order.notes || 'Sem observações registradas.'}</p>
                         </div>
                     </div>
                     <div style={{ flex: 1, textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: '1rem', marginLeft: '1rem' }}>
                         <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Qtd.</span>
                         <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{order.items || 1}</span>
                     </div>
                 </div>
             </div>
          </div>

          {/* Production Checklist */}
          <div style={sCardLinear}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <ClipboardList size={18} /> ETAPAS DE EXECUÇÃO
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                {['Separação de Materiais', 'Impressão / Corte', 'Montagem', 'Acabamento', 'Conferência de Qualidade', 'Embalagem'].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--background)' }}>
                        <div style={{ width: '1.25rem', height: '1.25rem', border: '2px solid var(--text-muted)', borderRadius: '4px', backgroundColor: 'transparent' }}></div>
                        <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem' }}>{step}</span>
                    </div>
                ))}
             </div>
          </div>

          {/* Notes Area */}
          <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Anotações da Produção:</p>
            <div style={{ minHeight: '100px', width: '100%', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}></div>
          </div>

        </div>

        {/* Footer Actions (No Print) */}
        <div style={sFooter} className="print-hidden">
          <button onClick={onClose} className="btn btn-secondary">
            Fechar Janela
          </button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={18} /> Imprimir OP Física
          </button>
        </div>

      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .modal-content-print, .modal-content-print * {
            visibility: visible;
          }
          .modal-content-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            padding: 0 !important;
            color: black !important; /* Force black text for printing */
          }
          .modal-content-print p, .modal-content-print span, .modal-content-print div, .modal-content-print h1 {
              color: black !important;
              border-color: #ccc !important;
          }
          .print-body {
              padding: 2cm !important; /* Proper print margins */
              background: white !important;
          }
          .modal-overlay-print {
            background: white !important;
            position: absolute;
            z-index: 9999;
            width: 100vw;
            height: 100vh;
            padding: 0 !important;
          }
          .print-hidden {
              display: none !important;
          }
          
          /* Force solid layout for Linear cards when printing */
          div[style*="var(--surface-hover)"] {
              background-color: #f9f9f9 !important;
              -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
