import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { ShieldCheck, Truck, CreditCard, ChevronLeft, MapPin, User, ChevronRight, Lock, Ticket, X } from 'lucide-react';
import db from '../services/database';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import PaymentGateway from '../services/PaymentGateway.js';
import ShippingGateway from '../services/ShippingGateway.js';

export function Checkout() {
    const { cart, cartTotal, cartCount, clearCart } = useCart();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form States
    const [customer, setCustomer] = useState({ name: '', email: '', whatsapp: '', document: '' });
    const [address, setAddress] = useState({ zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
    const [payment, setPayment] = useState({ method: 'pix', installments: 1 });
    const [deliveryMode, setDeliveryMode] = useState('shipping'); // 'shipping' or 'pickup'
    
    // Shipping States
    const [shippingOptions, setShippingOptions] = useState([]);
    const [selectedShipping, setSelectedShipping] = useState(null);
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');

    const [companyConfig, setCompanyConfig] = useState({ companyName: '' });

    useEffect(() => {
        const load = async () => {
            const settings = await db.getById('settings', 'global');
            if (settings) {
                setCompanyConfig(settings);
                document.title = `${settings.tabTitle || settings.companyName || 'Loja'} | Checkout Seguro`;
                
                if (settings.paymentKeys?.publicKey) {
                    initMercadoPago(settings.paymentKeys.publicKey, { locale: 'pt-BR' });
                }
            }
        };
        load();
        
        // Cérebro Mágico: Lembrar do Cliente (Auto-login / 1-Click Checkout)
        try {
            const savedProfile = localStorage.getItem('ecommerce_client_profile');
            if (savedProfile) {
                const parsed = JSON.parse(savedProfile);
                if (parsed.customer) setCustomer(parsed.customer);
                if (parsed.address) setAddress(parsed.address);
            }
        } catch(e) { console.warn("Pilha de cache vazia"); }
    }, []);

    // Se a sacola estiver vazia, redirecionar para loja
    if (!cart || cart.length === 0) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#faf5ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4c1d95', marginBottom: '16px' }}>Sacola Vazia</h2>
                    <p style={{ color: '#6b21a8', marginBottom: '24px' }}>Você não tem itens no carrinho para finalizar a compra.</p>
                    <Link to="/loja" style={{ display: 'inline-block', backgroundColor: '#9333ea', color: 'white', textDecoration: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 700 }}>
                        Voltar para a Loja
                    </Link>
                </div>
            </div>
        );
    }

    const shippingCost = (deliveryMode === 'shipping' && selectedShipping) ? selectedShipping.price : 0;
    let discountAmt = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
            discountAmt = (cartTotal * (appliedCoupon.discountValue / 100));
        } else {
            discountAmt = parseFloat(appliedCoupon.discountValue);
        }
    }
    const finalTotal = Math.max(0, cartTotal + shippingCost - discountAmt);

    const handleApplyCoupon = async () => {
        setCouponError('');
        if (!couponInput.trim()) return;
        
        try {
            const code = couponInput.trim().toUpperCase();
            const allCoupons = await db.getAll('coupons') || [];
            const found = allCoupons.find(c => c.code === code && c.isActive);
            
            if (!found) {
                setCouponError('Cupom inválido ou inativo.');
                return;
            }
            
            if (found.minPurchase && cartTotal < found.minPurchase) {
                setCouponError(`Válido apenas p/ compras acima de R$ ${Number(found.minPurchase).toFixed(2)}`);
                return;
            }
            if (found.maxUses && found.usedCount >= found.maxUses) {
                setCouponError('Este cupom esgotou o limite de usos.');
                return;
            }
            if (found.expirationDate) {
                const today = new Date().toISOString().split('T')[0];
                if (found.expirationDate < today) {
                    setCouponError('Cupom expirado.');
                    return;
                }
            }
            
            setAppliedCoupon(found);
            setCouponInput('');
        } catch (e) {
            console.error("Erro ao validar cupom", e);
        }
    };



    const handleCEPChange = async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        setAddress(prev => ({ ...prev, zip: cep }));
        
        if (cep.length === 8) {
            try {
                // Fetch Endereço via ViaCEP
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setAddress(prev => ({ 
                        ...prev, 
                        street: data.logradouro, 
                        neighborhood: data.bairro, 
                        city: data.localidade, 
                        state: data.uf 
                    }));
                }
                
                // Módulo de Frete: Buscar Opções Nacionais
                setIsCalculatingShipping(true);
                const options = await ShippingGateway.calculateShipping(cep, cart);
                setShippingOptions(options);
                if (options && options.length > 0) {
                    setSelectedShipping(options[0]); // Seleciona o primeiro por padrão
                }
            } catch (err) {
                console.error("Erro ao buscar CEP/Frete", err);
            } finally {
                setIsCalculatingShipping(false);
            }
        } else {
            setShippingOptions([]);
            setSelectedShipping(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Salvar dados no navegador do cliente para auto-preenchimento futuro
        localStorage.setItem('ecommerce_client_profile', JSON.stringify({ customer, address }));

        try {
            // 1. CRM - Procure ou crie o cliente instantâneamente pelo Telefone Clean
            const cleanPhone = customer.whatsapp.replace(/\D/g, '');
            let customerObj = null;
            
            try {
                customerObj = await db.getById('customers', cleanPhone);
            } catch(e) {} // Falha silenciosa de permissão ou inexistência
            
            if (!customerObj) {
                // Cria novo cliente usando o TELEFONE como ID (Incrível para performance e segurança Fast Login)
                customerObj = await db.set('customers', cleanPhone, {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.whatsapp,
                    document: customer.document || '',
                    address: `${address.street}, ${address.number} ${address.complement} - ${address.neighborhood}. ${address.city}/${address.state} - CEP: ${address.zip}`,
                    rawAddressObj: address,
                    source: 'Loja Virtual',
                    createdAt: new Date().toISOString()
                });
            } else {
                // Atualiza último acesso
                customerObj = await db.set('customers', cleanPhone, {
                    ...customerObj,
                    name: customer.name || customerObj.name,
                    email: customer.email || customerObj.email,
                    lastOrderDate: new Date().toISOString().split('T')[0],
                    rawAddressObj: address
                });
            }

            // 2. Dar baixa no Estoque
            const allProducts = await db.getAll('products') || [];
            for (const item of cart) {
                const productRef = allProducts.find(p => p.id == item.id); // Notice item.id is used because in CartContext we add as `product.id`
                if (productRef && productRef.stock !== undefined) {
                    // Update stock
                    await db.update('products', productRef.id, { 
                        stock: Math.max(0, productRef.stock - item.quantity) 
                    });
                }
            }

            // Re-map cart items for the DB format 
            const dbCartItems = cart.map(c => ({
                productId: c.id,
                name: c.name,
                price: Number(c.price || 0),
                quantity: c.quantity
            }));

            // 3. Criar Pedido (Order) - Atomisado
            const orderId = Array.from({length: 20}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
            
            let mpPaymentId = undefined;
            let pixQrCodeStr = null;
            if (payment.method === 'pix') {
                try {
                    const fakeOrder = { id: orderId, total: finalTotal, customerEmail: customer.email, customer: customer.name };
                    const pixRes = await PaymentGateway.createPixTransaction(fakeOrder);
                    if (pixRes.success) {
                        mpPaymentId = pixRes.transaction_id;
                        pixQrCodeStr = pixRes.qr_code; // MUST be the raw text EMV string!
                    }
                } catch(e) { console.error("Error pre-generating PIX", e); }
            }
            
            const newOrder = await db.set('orders', orderId, {
                customer: customer.name,
                customerEmail: customer.email,
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                status: 'Novo', // Sempre cai como 'Novo' ou 'Criado' no painel
                items: cartCount,
                total: finalTotal,
                shippingCost: Number(shippingCost.toFixed(2)),
                shippingMethod: deliveryMode === 'pickup' ? 'Retirada no Ateliê' : selectedShipping?.name || 'A Combinar',
                discountRaw: discountAmt,
                couponCode: appliedCoupon ? appliedCoupon.code : null,
                productId: dbCartItems[0]?.productId, // Fallback p/ o primeiro item
                cartItems: dbCartItems,
                paymentMethod: payment.method,
                paymentCondition: payment.installments > 1 ? 'installment' : 'spot',
                installments: payment.installments,
                shippingAddress: deliveryMode === 'shipping' ? address : { type: 'pickup' },
                ecommerceOrigin: true,
                mpPaymentId: mpPaymentId,
                transaction_id: mpPaymentId,
                pixQrCode: pixQrCodeStr,
                amountPaid: 0,
                balanceDue: Number(finalTotal.toFixed(2))
            });

            // Atualiza uso do cupom se existir
            if (appliedCoupon) {
                await db.update('coupons', appliedCoupon.id, {
                    usedCount: (appliedCoupon.usedCount || 0) + 1
                });
            }

            // 4. Limpar o Carrinho
            clearCart();

            // 5. Redirecionar para Status (Página de Sucesso / Rastreio)
            setTimeout(() => {
                navigate(`/status/${newOrder.id}`);
            }, 1000);

        } catch (error) {
            console.error("Erro ao fechar pedido:", error);
            alert("Ocorreu um erro ao processar seu pedido. Tente novamente.");
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#faf5ff', fontFamily: 'var(--font-primary)' }}>
            {/* Minimalist Header */}
            <header style={{ backgroundColor: '#ffffff', padding: '16px 24px', boxShadow: '0 1px 3px rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={18} color="#10b981" />
                    Checkout Seguro | {companyConfig.companyName || 'Catálogo'}
                </div>
                <Link to="/loja" style={{ position: 'absolute', left: '20px', display: 'flex', alignItems: 'center', color: '#9333ea', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}>
                    <ChevronLeft size={16} /> Voltar à Loja
                </Link>
            </header>

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* Left Column: Form */}
                <div style={{ flex: '1 1 500px' }}>
                    


                    <form id="checkout-form" onSubmit={handleSubmit}>
                        
                        {/* 1. Dados Pessoais */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)', marginBottom: '24px' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800, color: '#4c1d95', marginBottom: '20px' }}>
                                <User size={20} color="#9333ea"/> 1. Seus Dados Pessoais
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>Nome Completo *</label>
                                    <input type="text" required style={inputStyle} value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} placeholder="João da Silva" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>WhatsApp *</label>
                                    <input type="tel" required style={inputStyle} value={customer.whatsapp} onChange={e => setCustomer({...customer, whatsapp: e.target.value})} placeholder="(11) 99999-9999" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>E-mail (para receber o rastreio) *</label>
                                    <input type="email" required style={inputStyle} value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} placeholder="joao@email.com" />
                                </div>
                            </div>
                        </div>

                        {/* 2. Endereço / Retirada */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)', marginBottom: '24px' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800, color: '#4c1d95', marginBottom: '20px' }}>
                                <Truck size={20} color="#9333ea"/> 2. Como deseja receber?
                            </h2>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                 <div 
                                    onClick={() => setDeliveryMode('shipping')}
                                    style={{ border: deliveryMode === 'shipping' ? '2px solid #a855f7' : '1px solid #e2e8f0', backgroundColor: deliveryMode === 'shipping' ? '#faf5ff' : '#f8fafc', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700, color: deliveryMode === 'shipping' ? '#7e22ce' : '#64748b' }}
                                 >
                                     <MapPin size={18} style={{ margin: '0 auto 8px' }}/> Entrega em Domicílio
                                 </div>
                                 {companyConfig.enableLocalPickup !== false && (
                                    <div 
                                        onClick={() => setDeliveryMode('pickup')}
                                        style={{ border: deliveryMode === 'pickup' ? '2px solid #a855f7' : '1px solid #e2e8f0', backgroundColor: deliveryMode === 'pickup' ? '#faf5ff' : '#f8fafc', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700, color: deliveryMode === 'pickup' ? '#7e22ce' : '#64748b' }}
                                    >
                                        <Truck size={18} style={{ margin: '0 auto 8px' }}/> Retirar no Ateliê (Grátis)
                                    </div>
                                 )}
                            </div>

                            {deliveryMode === 'shipping' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>CEP *</label>
                                        <input type="text" maxLength="8" required style={inputStyle} value={address.zip} onChange={handleCEPChange} placeholder="00000000" />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>Rua/Avenida *</label>
                                        <input type="text" required style={inputStyle} value={address.street} onChange={e => setAddress({...address, street: e.target.value})} placeholder="Ex: Av. Brasil" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>Número *</label>
                                        <input type="text" required style={inputStyle} value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="123" />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>Complemento</label>
                                        <input type="text" style={inputStyle} value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} placeholder="Apto, Bloco..." />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>Bairro *</label>
                                        <input type="text" required style={inputStyle} value={address.neighborhood} onChange={e => setAddress({...address, neighborhood: e.target.value})} placeholder="Centro" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>Cidade *</label>
                                        <input type="text" required style={inputStyle} value={address.city} onChange={e => setAddress({...address, city: e.target.value})} placeholder="São Paulo" />
                                    </div>
                                    <div style={{ width: '70px' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>UF *</label>
                                        <input type="text" maxLength="2" required style={inputStyle} value={address.state} onChange={e => setAddress({...address, state: e.target.value})} placeholder="SP" />
                                    </div>
                                    </div>
                                    
                                    {/* Módulo Automático de Frete */}
                                    {address.zip.length === 8 && (
                                        <div style={{ marginTop: '16px', animation: 'fadeIn 0.3s ease' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', marginBottom: '8px' }}>🚀 Opções de Frete</label>
                                            
                                            {isCalculatingShipping ? (
                                                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.9rem' }}>
                                                    Calculando as melhores opções para sua região...
                                                </div>
                                            ) : shippingOptions.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {shippingOptions.map(opt => (
                                                        <div 
                                                            key={opt.id}
                                                            onClick={() => setSelectedShipping(opt)}
                                                            style={{ 
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                                                padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                                                border: selectedShipping?.id === opt.id ? '2px solid #a855f7' : '1px solid #e2e8f0',
                                                                backgroundColor: selectedShipping?.id === opt.id ? '#faf5ff' : '#ffffff'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid', borderColor: selectedShipping?.id === opt.id ? '#9333ea' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {selectedShipping?.id === opt.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#9333ea' }}/>}
                                                                </div>
                                                                <div>
                                                                    <strong style={{ display: 'block', color: selectedShipping?.id === opt.id ? '#6b21a8' : '#334155', fontSize: '0.95rem' }}>{opt.name}</strong>
                                                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Entrega estimada em até {opt.delivery_time} dias úteis</span>
                                                                </div>
                                                            </div>
                                                            <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.05rem' }}>
                                                                R$ {opt.price.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                 <div style={{ padding: '16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#be123c', fontSize: '0.85rem' }}>
                                                     Não foi possível calcular o frete para este CEP automaticamente. Finalize e combinaremos o envio.
                                                 </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ animation: 'fadeIn 0.3s ease', padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534', fontSize: '0.9rem', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <ShieldCheck size={24} color="#10b981" style={{ flexShrink: 0 }} />
                                    <div>
                                        <strong style={{ display: 'block', marginBottom: '4px' }}>Perfeito! Você não pagará frete.</strong>
                                        Assim que o pedido for concluído, enviaremos o aviso para que você venha fazer a retirada diretamente aqui no nosso ateliê físico.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. Pagamento */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)', marginBottom: '24px' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 800, color: '#4c1d95', marginBottom: '20px' }}>
                                <CreditCard size={20} color="#9333ea"/> 3. Como você prefere pagar?
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div 
                                    onClick={() => setPayment({...payment, method: 'pix'})}
                                    style={{ border: payment.method === 'pix' ? '2px solid #a855f7' : '1px solid #e2e8f0', backgroundColor: payment.method === 'pix' ? '#faf5ff' : '#f8fafc', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700, color: payment.method === 'pix' ? '#7e22ce' : '#64748b', transition: 'all 0.2s' }}
                                >
                                    Pix (Aprovação Imediata)
                                </div>
                                <div 
                                    onClick={() => setPayment({...payment, method: 'credit_card'})}
                                    style={{ border: payment.method === 'credit_card' ? '2px solid #a855f7' : '1px solid #e2e8f0', backgroundColor: payment.method === 'credit_card' ? '#faf5ff' : '#f8fafc', padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 700, color: payment.method === 'credit_card' ? '#7e22ce' : '#64748b', transition: 'all 0.2s' }}
                                >
                                    Cartões / Boleto / Saldo MP
                                </div>
                            </div>

                            {payment.method === 'credit_card' && companyConfig.paymentKeys?.publicKey ? (
                                <div style={{ animation: 'fadeIn 0.3s ease', marginTop: '16px' }}>
                                    <Payment
                                        initialization={{ amount: Number(finalTotal.toFixed(2)) }}
                                        customization={{
                                            paymentMethods: {
                                                creditCard: 'all',
                                                debitCard: 'all',
                                                ticket: 'all',
                                                bankTransfer: 'all',
                                                mercadoPago: 'all'
                                            },
                                            visual: {
                                                style: { theme: 'default', customVariables: { formBackgroundColor: '#ffffff', baseColor: '#9333ea' } }
                                            }
                                        }}
                                        onReady={() => console.log("Brick Renderizado")}
                                        onSubmit={(param) => {
                                            return new Promise(async (resolve, reject) => {
                                                if(!customer.name || !customer.email || (deliveryMode === 'shipping' && !address.street)) {
                                                    alert("Por favor, preencha seus dados reais (Nome, E-mail) e o Endereço de Entrega antes de inserir o cartão!");
                                                    return reject();
                                                }
                                                
                                                setIsSubmitting(true);
                                                // Salvar na máquina do cliente a sessão
                                                localStorage.setItem('ecommerce_client_profile', JSON.stringify({ customer, address }));
                                                
                                                try {
                                                    const dbCartItems = cart.map(c => ({
                                                        productId: c.id || null, // Garante que não vá undefined para Firebase
                                                        name: c.name || null,
                                                        price: Number(c.price || 0),
                                                        quantity: c.quantity || 1,
                                                        options: c.options || {}
                                                    }));

                                                    const newOrder = await db.create('orders', {
                                                        customer: customer.name || '',
                                                        customerEmail: customer.email || '',
                                                        date: new Date().toISOString().split('T')[0],
                                                        status: 'Novo',
                                                        items: cartCount || 1,
                                                        total: Number(finalTotal.toFixed(2)),
                                                        shippingCost: Number(shippingCost.toFixed(2)),
                                                        shippingMethod: deliveryMode === 'pickup' ? 'Retirada no Ateliê' : selectedShipping?.name || 'A Combinar',
                                                        discountRaw: Number(discountAmt.toFixed(2)) || 0,
                                                        couponCode: appliedCoupon ? appliedCoupon.code : null,
                                                        productId: dbCartItems[0]?.productId || null,
                                                        cartItems: dbCartItems,
                                                        paymentMethod: param.paymentMethodId || 'credit_card', // Pega método original
                                                        paymentCondition: param.installments > 1 ? 'installment' : 'spot',
                                                        installments: param.installments || 1,
                                                        shippingAddress: deliveryMode === 'shipping' ? address : { type: 'pickup' },
                                                        ecommerceOrigin: true
                                                    });
                                                    
                                                    await PaymentGateway.processCreditCard(newOrder, param);
                                                    
                                                    if (appliedCoupon) {
                                                        await db.update('coupons', appliedCoupon.id, { usedCount: (appliedCoupon.usedCount || 0) + 1 });
                                                    }
                                                    clearCart();
                                                    resolve();
                                                    setTimeout(() => navigate(`/status/${newOrder.id}`), 1000);
                                                } catch (e) {
                                                    console.error("Falha ao processar cartão:", e);
                                                    if (newOrder?.id) {
                                                        try { await db.delete('orders', newOrder.id); } catch(err){}
                                                    }
                                                    alert("Transação não aprovada pelo banco/Mercado Pago. Verifique os dados do cartão.");
                                                    setIsSubmitting(false);
                                                    reject();
                                                }
                                            });
                                        }}
                                        onError={(error) => console.error("Erro MP Brick:", error)}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', fontWeight: 800, fontSize: '0.9rem', marginBottom: '16px' }}>
                                            <ShieldCheck size={20} color="#0ea5e9" />
                                            Pagamento 100% Seguro Mercado Pago
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <div style={{ height: '32px', width: '50px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg viewBox="0 0 32 32" width="28" height="28" fill="#1434CB">
                                                  <path d="M11.66 21.03l2.25-14.19H17.4l-2.25 14.19h-3.49zm10.74-13.84c-1.32-.41-3.45-.88-6.19-.88-3.44 0-5.86 1.83-5.88 4.45-.03 1.94 1.76 3.02 3.1 3.68 1.37.67 1.83 1.1 1.83 1.71-.02.92-1.12 1.34-2.15 1.34-1.8 0-2.76-.27-3.95-.8l-.54-.25-.32 2.01c.98.45 2.78.84 4.67.86 3.65 0 6.02-1.8 6.06-4.57.02-1.53-1.01-2.69-2.98-3.6-1.22-.61-1.95-1.02-1.95-1.65.02-.58.64-1.2 2.06-1.2 1.45-.04 2.47.31 3.15.6l.38.18.52-2.13zM28.05 7.19h-2.69c-.83 0-1.45.24-1.83 1.13l-5.22 12.71h3.66s.61-1.72.75-2.09c.4.01 3.96 0 4.41 0 .1.46.42 2.09.42 2.09H31.1L28.05 7.19zm-2.8 8.16l1.37-3.76c-.02.04.28-1.58.45-2.6.06.35.21 1.54.21 1.54l.79 3.76h-2.82V15.35zM7.22 7.19L5.3 16.71l-.18-.94C4.69 13.92 3.55 12 1.38 10.95L.03 10.3l1.8 10.73H5.3l3.6-14.13H7.22zM2.87 8.3c1.7 0 3.32.44 4.8 1.25V9.45c-1.5-.78-3.15-1.2-4.86-1.2C1.29 8.25.04 8.7.04 8.7l.68 1.84c0 0 .96-.46 2.15-2.24z"/>
                                                </svg>
                                            </div>
                                            <div style={{ height: '32px', width: '50px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg viewBox="0 0 32 32" width="28" height="28">
                                                  <circle cx="12" cy="16" r="6" fill="#EB001B"/>
                                                  <circle cx="20" cy="16" r="6" fill="#F79E1B"/>
                                                  <path d="M16 11.53c-1.4 1.3-2 3.2-2 4.47 0 1.27.6 3.17 2 4.47 1.4-1.3 2-3.2 2-4.47 0-1.27-.6-3.17-2-4.47z" fill="#FF5F00"/>
                                                </svg>
                                            </div>
                                            <div style={{ height: '32px', padding: '0 8px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 800, fontSize: '0.9rem' }}>
                                                ELO
                                            </div>
                                            <div style={{ height: '32px', padding: '0 8px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 800, fontSize: '0.9rem', gap: '4px' }}>
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                    <path d="M11.968 1.408c.045-.045.105-.074.167-.095.06-.021.127-.03.19-.03.065 0 .129.011.19.034.062.02.122.05.168.096l4.205 4.205-1.898 1.898-2.31-2.31-6.198 6.198-1.527-1.527L11.968 1.408zm0 21.184c-.045.045-.105.074-.167.095-.06.021-.127.03-.19.03-.065 0-.129-.011-.19-.034-.062-.02-.122-.05-.168-.096l-4.205-4.205 1.898-1.898 2.31 2.31 6.198-6.198 1.527 1.527-7.013 7.013zM22.592 12.032l-4.205-4.205-1.527 1.527 6.198 6.197-2.31 2.31 1.898 1.898 4.205-4.205c.045-.045.074-.105.095-.167.021-.06.03-.127.03-.19 0-.065-.011-.129-.034-.19-.02-.062-.05-.122-.096-.168zM1.408 11.968l4.205 4.205 1.527-1.527-6.198-6.197 2.31-2.31-1.898-1.898L-2.85 8.446c-.045.045-.074.105-.095.167-.021.06-.03.127-.03.19 0 .065.011.129.034.19.02.062.05.122.096.168zC.352 10.96.88 11.488 1.408 11.968z" />
                                                </svg>
                                                Pix
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                           <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={14} /> Criptografia Ponta a Ponta</span>
                                           <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14} /> Antifraude Ativo</span>
                                        </div>
                                    </div>
                                </div>
                            ) : payment.method === 'credit_card' ? (
                                <div style={{ animation: 'fadeIn 0.3s ease', padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '12px', color: '#475569', fontSize: '0.9rem', marginBottom: '16px' }}>
                                    A integração com o Mercado Pago requer a preenchimento da Public Key nas configurações. O Gateway Segurado está pausado.
                                </div>
                            ) : null}

                            {payment.method === 'pix' && (
                                <div style={{ animation: 'fadeIn 0.3s ease', padding: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534', fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldCheck size={20} color="#10b981"/> Pagamento via Pix processado de forma 100% segura. O QR Code será gerado na próxima tela após fechar pedido.
                                </div>
                            )}
                        </div>

                    </form>
                </div>

                {/* Right Column: Order Summary */}
                <div style={{ flex: '1 1 350px' }}>
                    <div style={{ position: 'sticky', top: '90px', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.05)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4c1d95', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f3e8ff' }}>
                            Resumo do Pedido ({cartCount} itens)
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                            {cart.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                                         {item.images && item.images.length > 0 ? (
                                              <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                         ) : item.image ? (
                                              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                         ) : null}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Qtd: {item.quantity}</p>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#6b21a8' }}>
                                        R$ {(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f3e8ff', paddingTop: '16px', marginBottom: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#6b21a8', mb: '4px' }}>Cupom de Desconto</label>
                                {!appliedCoupon ? (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <input 
                                                type="text" 
                                                placeholder="Ex: PROMO10" 
                                                style={{ ...inputStyle, textTransform: 'uppercase' }} 
                                                value={couponInput}
                                                onChange={e => setCouponInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                            />
                                            {couponError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 600 }}>{couponError}</div>}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            style={{ backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '12px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#dcfce3', color: '#15803d', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Ticket size={16} /> Cupom {appliedCoupon.code} aplicado!
                                        </div>
                                        <button type="button" onClick={() => setAppliedCoupon(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.95rem' }}>
                                <span>Subtotal</span>
                                <span>R$ {cartTotal.toFixed(2)}</span>
                            </div>
                            {appliedCoupon && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '0.95rem', fontWeight: 700 }}>
                                    <span>Desconto ({appliedCoupon.code})</span>
                                    <span>- R$ {discountAmt.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.95rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Truck size={14}/> Frete</span>
                                <span style={{ color: deliveryMode === 'pickup' ? '#10b981' : '#64748b', fontWeight: deliveryMode === 'pickup' ? 700 : 'normal' }}>
                                    {deliveryMode === 'pickup' ? 'Retirada (Grátis)' : (shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'A Combinar')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4c1d95', fontSize: '1.25rem', fontWeight: 900, marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                                <span>Total</span>
                                <span>R$ {finalTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* O Botão de Finalizar só some se o tijolo do Cartão estiver ativado e funcional */}
                        {(payment.method !== 'credit_card' || !companyConfig.paymentKeys?.publicKey) && (
                            <button 
                                type="submit"
                                form="checkout-form"
                                disabled={isSubmitting}
                                style={{ width: '100%', padding: '16px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 16px -4px rgba(168,85,247,0.4)', transition: 'background-color 0.2s', opacity: isSubmitting ? 0.7 : 1 }}
                                onMouseOver={e => !isSubmitting && (e.currentTarget.style.backgroundColor = '#9333ea')}
                                onMouseOut={e => !isSubmitting && (e.currentTarget.style.backgroundColor = '#a855f7')}
                            >
                                {isSubmitting ? 'Processando Pedido...' : 'Confirmar Pedido'}
                                {!isSubmitting && <ChevronRight size={20} />}
                            </button>
                        )}
                        
                        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <ShieldCheck size={14} /> Seus dados pessoais estão criptografados.
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Estilos Compartilhados
const inputStyle = {
    width: '100%', 
    padding: '12px 14px', 
    borderRadius: '8px', 
    border: '1px solid #e2e8f0', 
    backgroundColor: '#f8fafc', 
    fontSize: '0.95rem', 
    color: '#334155',
    outlineColor: '#a855f7'
};
