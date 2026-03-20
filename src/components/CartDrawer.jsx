import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';

export function CartDrawer({ companyConfig }) {
    const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, isCartOpen, setIsCartOpen } = useCart();
    const navigate = useNavigate();

    const handleCheckout = () => {
        setIsCartOpen(false);
        navigate('/checkout');
    };

    if (!isCartOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998, animation: 'fadeIn 0.2s ease-out' }}
                onClick={() => setIsCartOpen(false)}
            />

            {/* Drawer */}
            <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '400px', height: '100vh', backgroundColor: '#fff', zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                
                {/* Header */}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3e8ff' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6b21a8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingBag size={20} color="#9333ea"/> 
                        Carrinho
                        {cartCount > 0 && <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px' }}>{cartCount} item(s)</span>}
                    </h2>
                    <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Cart Items */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {cart.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                            <ShoppingBag size={48} color="#cbd5e1" style={{ opacity: 0.5, marginBottom: '16px' }}/>
                            <p style={{ fontWeight: 600 }}>Sua sacola está vazia.</p>
                            <button onClick={() => setIsCartOpen(false)} style={{ marginTop: '16px', color: '#9333ea', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Continuar comprando</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {cart.map((item, index) => {
                                const price = item.campaignActive 
                                    ? Number(item.price || 0) * (1 - (Number(item.campaignDiscount || 0)/100))
                                    : Number(item.price || 0);

                                return (
                                    <div key={index} style={{ display: 'flex', gap: '12px' }}>
                                        {/* Image */}
                                        <div style={{ width: '70px', height: '70px', borderRadius: '10px', backgroundColor: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
                                             {item.images && item.images.length > 0 ? (
                                                  <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                             ) : item.image ? (
                                                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                             ) : (
                                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={20} color="#cbd5e1" /></div>
                                             )}
                                        </div>

                                        {/* Details */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4c1d95', margin: '0 0 4px 0' }}>{item.name}</h4>
                                                <button onClick={() => removeFromCart(item.id, item.options)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#6b21a8' }}>R$ {price.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                                                
                                                {/* Quantity Control */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '4px', border: '1px solid #e2e8f0' }}>
                                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.options)} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155' }}><Minus size={14}/></button>
                                                    <span style={{ fontSize: '1rem', fontWeight: 800, width: '24px', textAlign: 'center', color: '#0f172a' }}>{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.options)} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155' }}><Plus size={14}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer / Checkout Button */}
                {cart.length > 0 && (
                    <div style={{ padding: '20px', borderTop: '1px solid #f3e8ff', backgroundColor: '#faf5ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#7e22ce' }}>Subtotal</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6b21a8' }}>R$ {cartTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginBottom: '16px' }}>
                            Frete e impostos serão calculados na próxima etapa.
                        </p>
                        <button 
                            onClick={handleCheckout}
                            style={{ width: '100%', padding: '16px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background-color 0.2s', boxShadow: '0 4px 6px -1px rgba(168,85,247,0.3)' }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#9333ea'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#a855f7'}
                        >
                            Fechar Pedido <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}} />
        </>
    );
}
