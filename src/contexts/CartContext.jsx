import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const localCart = localStorage.getItem('stationery_cart');
      return localCart ? JSON.parse(localCart) : [];
    } catch {
      return [];
    }
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('stationery_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1, options = {}) => {
    setCart(prev => {
      // Find exact same product + options variation
      const existing = prev.find(item => item.id === product.id && JSON.stringify(item.options) === JSON.stringify(options));
      if (existing) {
        return prev.map(item => 
          item.id === product.id && JSON.stringify(item.options) === JSON.stringify(options)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity, options }];
    });
    setIsCartOpen(true); // Abre a gaveta de carrinho visualmente confirmando a ação
  };

  const removeFromCart = (productId, options = {}) => {
    setCart(prev => prev.filter(item => !(item.id === productId && JSON.stringify(item.options) === JSON.stringify(options))));
  };

  const updateQuantity = (productId, quantity, options = {}) => {
    if (quantity < 1) return removeFromCart(productId, options);
    setCart(prev => prev.map(item => 
      item.id === productId && JSON.stringify(item.options) === JSON.stringify(options)
        ? { ...item, quantity }
        : item
    ));
  };

  const clearCart = () => setCart([]);
  
  const cartTotal = cart.reduce((total, item) => {
    const price = item.campaignActive 
        ? Number(item.price || 0) * (1 - (Number(item.campaignDiscount || 0)/100))
        : Number(item.price || 0);
    return total + (price * item.quantity);
  }, 0);
  
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      cartTotal, 
      cartCount, 
      isCartOpen, 
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};
