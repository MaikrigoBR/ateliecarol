import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Copy, CheckCircle, ChevronRight, XCircle, Lock, ChevronLeft } from 'lucide-react';
import db from '../services/database';
import PaymentGateway from '../services/PaymentGateway';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

export function PaymentLinkCheckout() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState('pix'); 
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [pixData, setPixData] = useState(null);
    const [copied, setCopied] = useState(false);

    const [companyConfig, setCompanyConfig] = useState({ companyName: '' });

    // Local override of payer data (to feed the credit card securely)
    const [payerEmail, setPayerEmail] = useState('');
    const [payerName, setPayerName] = useState('');

    useEffect(() => {
        const load = async () => {
            const settings = await db.getById('settings', 'global');
            if (settings) {
                setCompanyConfig(settings);
                if (settings.paymentKeys?.publicKey) {
                    initMercadoPago(settings.paymentKeys.publicKey, { locale: 'pt-BR' });
                }
            }

            const found = await db.getById('orders', id);
            if (found) {
                setOrder(found);
                setPayerName(found.customer || '');
                setPayerEmail(found.customerEmail || '');
                
                // Marca que a fatura foi vista
                await db.update('orders', found.id, { paymentLinkAccessed: new Date().toISOString() });
            }
            setLoading(false);
        };
        load();
    }, [id]);

    const balance = order && order.balanceDue !== undefined ? parseFloat(order.balanceDue) : (order ? Math.max(0, (order.total || 0) - (order.amountPaid || 0)) : 0);

    const handleGeneratePix = async () => {
        setIsProcessing(true);
        try {
            const fakeOrder = { id: order.id, total: balance, customerEmail: payerEmail, customer: payerName };
            const res = await PaymentGateway.createPixTransaction(fakeOrder);
            if (res.success) {
                setPixData({ qrCode: res.qr_code, base64: res.qr_code_base64 });
            } else {
                alert("Erro ao gerar Pix: " + res.error);
            }
        } catch(e) {
            console.error(e);
            alert("Falha de conexão com gateway.");
        } finally {
            setIsProcessing(false);
        }
    };

    const copyPix = () => {
        if (pixData?.qrCode) {
            navigator.clipboard.writeText(pixData.qrCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Fatura Segura...</div>;

    if (!order) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px', textAlign: 'center' }}>
            <XCircle size={64} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#1e293b', fontWeight: 800 }}>Fatura não encontrada ou expirada.</h2>
            <p style={{ color: '#64748b', marginTop: '8px' }}>Verifique se o link está correto ou contate o Ateliê.</p>
        </div>
    );

    if (balance <= 0) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4', padding: '20px', textAlign: 'center' }}>
             <CheckCircle size={64} color="#10b981" style={{ marginBottom: '16px' }} />
             <h2 style={{ color: '#166534', fontWeight: 800 }}>Este pedido já está pago!</h2>
             <p style={{ color: '#15803d', marginTop: '8px' }}>Não há pendências financeiras para o Pedido #{String(order.id).substring(0,8)}.</p>
             <button onClick={() => navigate('/loja')} style={{ marginTop: '24px', padding: '12px 24px', backgroundColor: '#16a34a', color: 'white', borderRadius: '24px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Voltar para a Loja</button>
        </div>
    );

    const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#334155', outlineColor: '#a855f7' };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#faf5ff', fontFamily: 'var(--font-primary)' }}>
            <header style={{ backgroundColor: '#ffffff', padding: '16px 24px', boxShadow: '0 1px 3px rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={18} color="#10b981" />
                    Checkout Online | {companyConfig.companyName || 'Ateliê'}
                </div>
            </header>

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* Left Column: Form & Payment Methods */}
                <div style={{ flex: '1 1 500px' }}>
                    
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4c1d95', marginBottom: '16px' }}>Identificação do Pagador</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '4px' }}>Nome Completo</label>
                                <input type="text" value={payerName} onChange={e => setPayerName(e.target.value)} style={inputStyle} placeholder="Seu nome" />
                             </div>
                             <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '4px' }}>E-mail para recibo</label>
                                <input type="email" value={payerEmail} onChange={e => setPayerEmail(e.target.value)} style={inputStyle} placeholder="seu@email.com" />
                             </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)', marginBottom: '24px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800, color: '#4c1d95', marginBottom: '20px' }}>
                            <CreditCard size={20} color="#9333ea"/> Como você prefere pagar?
                        </h2>
                        
                        {pixData ? (
                            <div style={{ animation: 'slideUp 0.3s ease' }}>
                                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
                                    <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
                                    <h3 style={{ margin: '0 0 8px 0', color: '#166534', fontWeight: 800 }}>Código Pix Gerado!</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#15803d', margin: '0 0 16px 0' }}>Escaneie o QR Code abaixo com o aplicativo do seu banco, ou copie o código Pix.</p>
                                    
                                    {pixData.base64 && (
                                        <div style={{ padding: '16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                                            <img src={pixData.base64} alt="QR Code Pix" style={{ width: '200px', height: '200px', display: 'block', margin: '0 auto' }} />
                                        </div>
                                    )}

                                    <div style={{ backgroundColor: 'white', border: '1px dashed #4ade80', padding: '16px', borderRadius: '12px', wordBreak: 'break-all', fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace', position: 'relative' }}>
                                        {pixData.qrCode}
                                    </div>
                                </div>
                                <button onClick={copyPix} style={{ width: '100%', padding: '16px', backgroundColor: copied ? '#10b981' : '#9333ea', color: 'white', border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {copied ? <><CheckCircle size={20}/> Código Copiado!</> : <><Copy size={20}/> Copiar Código Pix</>}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div onClick={() => setMethod('pix')} style={{ border: method === 'pix' ? '2px solid #a855f7' : '1px solid #e2e8f0', backgroundColor: method === 'pix' ? '#faf5ff' : '#f8fafc', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700, color: method === 'pix' ? '#7e22ce' : '#64748b', transition: 'all 0.2s' }}>
                                        Pix (Aprovação Imediata)
                                    </div>
                                    <div onClick={() => setMethod('credit_card')} style={{ border: method === 'credit_card' ? '2px solid #a855f7' : '1px solid #e2e8f0', backgroundColor: method === 'credit_card' ? '#faf5ff' : '#f8fafc', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700, color: method === 'credit_card' ? '#7e22ce' : '#64748b', transition: 'all 0.2s' }}>
                                        Cartões / Boleto / Saldo MP
                                    </div>
                                </div>

                                {method === 'credit_card' && companyConfig.paymentKeys?.publicKey ? (
                                    <div style={{ animation: 'fadeIn 0.3s ease', marginTop: '16px' }}>
                                        <Payment
                                            initialization={{ amount: Number(balance.toFixed(2)) }}
                                            customization={{
                                                paymentMethods: { creditCard: 'all', debitCard: 'all', ticket: 'all', bankTransfer: 'all', mercadoPago: 'all' },
                                                visual: { style: { theme: 'default', customVariables: { formBackgroundColor: '#ffffff', baseColor: '#9333ea' } } }
                                            }}
                                            onSubmit={(param) => {
                                                return new Promise(async (resolve, reject) => {
                                                    if (!payerName || !payerEmail) {
                                                        alert("Por favor, preencha as informações do pagador acima.");
                                                        return reject();
                                                    }
                                                    setIsProcessing(true);
                                                    try {
                                                        const pseudoOrderPayload = { ...order, customer: payerName, customerEmail: payerEmail, total: balance };
                                                        await PaymentGateway.processCreditCard(pseudoOrderPayload, param);
                                                        
                                                        // Update the existing order to flag it as paid via Web Checkout
                                                        await db.update('orders', order.id, {
                                                            paymentMethod: param.paymentMethodId || 'credit_card',
                                                            paymentCondition: param.installments > 1 ? 'installment' : 'spot',
                                                            installments: param.installments || 1,
                                                            customer: payerName,
                                                            customerEmail: payerEmail,
                                                            amountPaid: (order.amountPaid || 0) + balance, // Assuming they paid entirely
                                                            balanceDue: 0,
                                                            status: 'Concluído'
                                                        });
                                                        
                                                        resolve();
                                                        setTimeout(() => navigate(`/status/${order.id}`), 1000);
                                                    } catch (e) {
                                                        console.error("Falha ao transacionar cartão omnichannel:", e);
                                                        alert("O Mercado Pago recusou a transação. Verifique os dados inseridos.");
                                                        setIsProcessing(false);
                                                        reject();
                                                    }
                                                });
                                            }}
                                            onError={(error) => console.error("Erro MP Brick:", error)}
                                        />
                                        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <ShieldCheck size={14} /> Antifraude Mercado Pago habilitado na transação.
                                        </div>
                                    </div>
                                ) : method === 'credit_card' ? (
                                    <div style={{ animation: 'fadeIn 0.3s ease', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#475569', fontSize: '0.9rem', marginBottom: '16px' }}>
                                        A integração de Cartões via Mercado Pago requer Configuração da Public Key no Admin.
                                    </div>
                                ) : null}

                                {method === 'pix' && (
                                    <button 
                                        onClick={handleGeneratePix}
                                        disabled={isProcessing}
                                        style={{ width: '100%', padding: '16px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background-color 0.2s', opacity: isProcessing ? 0.7 : 1 }}
                                    >
                                        {isProcessing ? 'Gerando Fatura Pix...' : 'Gerar Fatura Pix e Pagar Agora'}
                                        {!isProcessing && <ChevronRight size={20} />}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Order Cart Summary */}
                <div style={{ flex: '1 1 350px' }}>
                    <div style={{ position: 'sticky', top: '90px', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4c1d95', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f3e8ff' }}>
                            Resumo do Pedido #{String(order.id).substring(0,8)}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                            {order.cartItems && order.cartItems.length > 0 ? order.cartItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Qtd: {item.quantity}</p>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#6b21a8' }}>
                                        R$ {(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            )) : (
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Pacote ou Item Manual ({order.items} iten(s))</div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f3e8ff', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4c1d95', fontSize: '1.25rem', fontWeight: 900 }}>
                                <span>Total Original</span>
                                <span>R$ {order.total.toFixed(2)}</span>
                            </div>
                            {order.amountPaid > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid #f3e8ff', paddingBottom: '16px' }}>
                                    <span>Sinal Pago</span>
                                    <span>- R$ {order.amountPaid.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e293b', fontSize: '1.5rem', fontWeight: 900, marginTop: '8px' }}>
                                <span>Valor a Pagar</span>
                                <span>R$ {balance.toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Lock size={14} /> Suas informações estão seguras conosco.
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
