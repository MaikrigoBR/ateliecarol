import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import db from '../services/database.js';
import { Printer } from 'lucide-react';

export function OrderPrint() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);

  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const allOrders = await db.getAll('orders');
      const cleanId = id.toString();
      const foundOrder = allOrders.find(o => o.id == cleanId);
      
      if (foundOrder) {
        setOrder(foundOrder);
        
        const allCustomers = await db.getAll('customers');
        const foundCustomer = allCustomers.find(c => c.name === foundOrder.customer);
        setCustomer(foundCustomer || { name: foundOrder.customer });

        if (foundOrder.productId) {
            // Product might be fetched by ID more efficiently, but for now getAll is fine given the scale
            const product = await db.getById('products', foundOrder.productId);
            // Fallback for string/number mismatch if getById fails but item exists (legacy)
            if (!product) {
                const allProducts = await db.getAll('products');
                const p = allProducts.find(p => p.id == foundOrder.productId);
                setProduct(p);
            } else {
                setProduct(product);
            }
        }
      }
    };
    fetchOrderDetails();
  }, [id]);

  if (!order) {
    return <div className="p-8 text-center text-muted">Carregando pedido... (ID: {id})</div>;
  }

  return (
    <div className="print-container animate-fade-in">
        {/* Screen-only controls */}
        <div className="print-controls no-print" style={{ 
            marginBottom: '2rem', 
            padding: '1rem', 
            background: 'var(--surface)', 
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <button className="btn btn-secondary" onClick={() => window.history.back()}>
                &larr; Voltar
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / Salvar PDF
            </button>
        </div>
        
        {/* Printable Area */}
        <div className="invoice-box" style={{ 
            maxWidth: '800px', 
            margin: 'auto', 
            padding: '30px', 
            border: '1px solid #eee', 
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.15)',
            fontSize: '16px',
            lineHeight: '24px',
            fontFamily: "'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif",
            color: '#555',
            backgroundColor: '#fff'
        }}>
            {/* ... (header/info remain same) ... */}
            <table cellpadding="0" cellspacing="0" style={{ width: '100%', lineHeight: 'inherit', textAlign: 'left' }}>
                <tr className="top">
                    <td colSpan="2" style={{ paddingBottom: '20px' }}>
                        <table style={{ width: '100%' }}>
                            <tr>
                                <td className="title" style={{ fontSize: '45px', lineHeight: '45px', color: '#333' }}>
                                    <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--primary)' }}>Estúdio Criativo</h1>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    Pedido #: {order.id}<br />
                                    Data: {new Date(order.date).toLocaleDateString('pt-BR')}<br />
                                    Status: <strong>{order.status}</strong>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr className="information">
                    <td colSpan="2" style={{ paddingBottom: '40px' }}>
                        <table style={{ width: '100%' }}>
                            <tr>
                                <td>
                                    <strong>Emitido por:</strong><br />
                                    Estúdio Criativo Ltda.<br />
                                    contato@estudiocriativo.com
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <strong>Cliente:</strong><br />
                                    {customer?.name}<br />
                                    {customer?.email}<br />
                                    {customer?.phone}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr className="heading">
                    <td style={{ background: '#eee', borderBottom: '1px solid #ddd', fontWeight: 'bold', padding: '10px' }}>
                        Item / Descrição
                    </td>
                    <td style={{ background: '#eee', borderBottom: '1px solid #ddd', fontWeight: 'bold', padding: '10px', textAlign: 'right' }}>
                        Preço
                    </td>
                </tr>

                <tr className="item">
                    <td style={{ borderBottom: '1px solid #eee', padding: '10px' }}>
                        {product ? (
                            <>
                                <strong>{product.name}</strong>
                                <br/>
                                <span style={{ fontSize: '0.9em', color: '#777' }}>
                                    {order.items} unidade(s) x R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
                                </span>
                            </>
                        ) : (
                            order.description || `Pedido com ${order.items} itens`
                        )}
                    </td>
                    <td style={{ borderBottom: '1px solid #eee', padding: '10px', textAlign: 'right' }}>
                        R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}
                    </td>
                </tr>

                <tr className="total">
                    <td></td>
                    <td style={{ borderTop: '2px solid #eee', fontWeight: 'bold', padding: '10px', textAlign: 'right' }}>
                        Total: R$ {Number(order.total || 0).toFixed(2).replace('.', ',')}
                    </td>
                </tr>
            </table>

            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #ccc', fontSize: '12px', color: '#aaa', textAlign: 'center' }}>
                <p>Obrigado pela preferência!</p>
                <p>Este documento não possui valor fiscal.</p>
            </div>
        </div>

        <style>{`
            @media print {
                .no-print, .sidebar, .header {
                    display: none !important;
                }
                .app-container {
                    display: block !important;
                    height: auto !important;
                    overflow: visible !important;
                }
                .main-content, .page-content {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                }
                body, html {
                    background: #fff !important;
                    height: auto !important;
                    overflow: visible !important;
                }
                .invoice-box {
                    box-shadow: none !important;
                    border: 0 !important;
                }
            }
        `}</style>
    </div>
  );
}
