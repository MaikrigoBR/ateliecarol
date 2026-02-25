import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, Menu, Search, X, AlertTriangle, Package, Clock, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import db from '../services/database';

export function Header({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState({ orders: [], customers: [], products: [] });
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // 1. Title Logic
  let title = 'Visão Geral';
  if (location.pathname.includes('orders')) title = 'Gerenciamento de Pedidos';
  if (location.pathname.includes('products')) title = 'Produtos & Estoque';
  if (location.pathname.includes('customers')) title = 'Carteira de Clientes';
  if (location.pathname.includes('settings')) title = 'Configurações do Sistema';
  if (location.pathname.includes('finance')) title = 'Controle Financeiro';
  if (location.pathname.includes('inventory')) title = 'Estoque & Ativos';
  if (location.pathname.includes('budgets')) title = 'Orçamentos';
  if (location.pathname.includes('reports')) title = 'Relatórios';
  if (location.pathname.includes('staff')) title = 'Equipe & Custos';

  const userInitial = currentUser?.email ? currentUser.email[0].toUpperCase() : 'G';

  // 2. Click Outside Handler
  useEffect(() => {
    function handleClickOutside(event) {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
            setShowResults(false);
        }
        if (notifRef.current && !notifRef.current.contains(event.target)) {
            setShowNotifications(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Search Effect
  useEffect(() => {
      const performSearch = async () => {
          if (searchTerm.length < 2) {
              setSearchResults({ orders: [], customers: [], products: [] });
              return;
          }
          
          setIsSearching(true);
          try {
              // Parallel Fetch (In a real app, use an index service like Algolia or a dedicated endpoint)
              const [orders, customers, products] = await Promise.all([
                  db.getAll('orders'),
                  db.getAll('customers'),
                  db.getAll('products')
              ]);

              const lowerTerm = searchTerm.toLowerCase();

              const foundOrders = orders.filter(o => 
                  String(o.id).includes(lowerTerm) || 
                  (o.customerName && o.customerName.toLowerCase().includes(lowerTerm)) ||
                  (o.description && o.description.toLowerCase().includes(lowerTerm))
              ).slice(0, 3);

              const foundCustomers = customers.filter(c => 
                  (c.name && c.name.toLowerCase().includes(lowerTerm)) || 
                  (c.email && c.email.toLowerCase().includes(lowerTerm))
              ).slice(0, 3);

              const foundProducts = products.filter(p => 
                  (p.name && p.name.toLowerCase().includes(lowerTerm)) || 
                  (p.category && p.category.toLowerCase().includes(lowerTerm))
              ).slice(0, 3);

              setSearchResults({ orders: foundOrders, customers: foundCustomers, products: foundProducts });
              setShowResults(true);
          } catch (e) {
              console.error("Search failed", e);
          } finally {
              setIsSearching(false);
          }
      };

      const debounce = setTimeout(performSearch, 300);
      return () => clearTimeout(debounce);
  }, [searchTerm]);

  // 4. Notifications Check (On Mount & Location Change)
  useEffect(() => {
      const checkNotifications = async () => {
          const [products, orders] = await Promise.all([
              db.getAll('products'),
              db.getAll('orders')
          ]);

          const alerts = [];

          // Low Stock
          const lowStock = products.filter(p => Number(p.stock) <= Number(p.minStock || 5));
          if (lowStock.length > 0) {
              alerts.push({
                  id: 'stock',
                  title: 'Estoque Baixo',
                  message: `${lowStock.length} produtos precisam de reposição.`,
                  type: 'warning',
                  link: '/products'
              });
          }

          // Overdue Orders
          const today = new Date().toISOString().split('T')[0];
          const overdue = orders.filter(o => {
              return o.deadline && o.deadline < today && o.status !== 'completed' && o.status !== 'Concluído' && o.status !== 'cancelled';
          });

          if (overdue.length > 0) {
              alerts.push({
                  id: 'overdue',
                  title: 'Pedidos Atrasados',
                  message: `${overdue.length} pedidos passaram do prazo!`,
                  type: 'danger',
                  link: '/orders'
              });
          }

          setNotifications(alerts);
      };

      checkNotifications();
  }, [location.pathname]); // Re-check when navigating

  const handleResultClick = (link) => {
      navigate(link);
      setShowResults(false);
      setSearchTerm('');
  };

  return (
    <header className="header-row relative z-20">
      <div className="header-left">
          <button 
            className="btn btn-icon d-lg-none" 
            onClick={onOpenSidebar}
          >
            <Menu size={24} className="text-primary" />
          </button>
          <h1 className="header-title hidden md:block">
              {title}
          </h1>
      </div>
      
      {/* Global Search Bar (Centered) */}
      <div className="flex-1 max-w-lg mx-4 relative" ref={searchRef}>
          <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Buscar pedidos, clientes, produtos..." 
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => { if(searchTerm.length >= 2) setShowResults(true); }}
              />
              {searchTerm && (
                  <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                      <X size={14} />
                  </button>
              )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in z-50">
                  {isSearching ? (
                       <div className="p-4 text-center text-gray-400 text-xs">Buscando...</div>
                  ) : (
                      <>
                          {(searchResults.orders.length === 0 && searchResults.customers.length === 0 && searchResults.products.length === 0) ? (
                              <div className="p-4 text-center text-gray-400 text-sm">Nenhum resultado encontrado.</div>
                          ) : (
                              <div className="max-h-[70vh] overflow-y-auto">
                                  {searchResults.orders.length > 0 && (
                                      <div className="py-2">
                                          <div className="px-4 py-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Pedidos</div>
                                          {searchResults.orders.map(o => (
                                              <button key={o.id} onClick={() => handleResultClick('/orders')} className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors">
                                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                      <Clock size={16} />
                                                  </div>
                                                  <div>
                                                      <div className="font-medium text-sm text-gray-800">Pedido #{String(o.id).slice(0,6)}...</div>
                                                      <div className="text-xs text-gray-500">{o.customerName || 'Cliente sem nome'} - {o.status}</div>
                                                  </div>
                                                  <ChevronRight size={14} className="ml-auto text-gray-300" />
                                              </button>
                                          ))}
                                      </div>
                                  )}

                                  {searchResults.customers.length > 0 && (
                                      <div className="py-2 border-t border-gray-50">
                                          <div className="px-4 py-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Clientes</div>
                                          {searchResults.customers.map(c => (
                                              <button key={c.id} onClick={() => handleResultClick('/customers')} className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors">
                                                  <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                                                      <Check size={16} /> {/* User icon usually, keeping vivid */}
                                                  </div>
                                                  <div>
                                                      <div className="font-medium text-sm text-gray-800">{c.name}</div>
                                                      <div className="text-xs text-gray-500">{c.email || c.phone || 'Sem contato'}</div>
                                                  </div>
                                              </button>
                                          ))}
                                      </div>
                                  )}

                                  {searchResults.products.length > 0 && (
                                      <div className="py-2 border-t border-gray-50">
                                          <div className="px-4 py-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider">Produtos</div>
                                          {searchResults.products.map(p => (
                                              <button key={p.id} onClick={() => handleResultClick('/products')} className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors">
                                                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                                      <Package size={16} />
                                                  </div>
                                                  <div>
                                                      <div className="font-medium text-sm text-gray-800">{p.name}</div>
                                                      <div className="text-xs text-gray-500">Estoque: {p.stock} • R$ {Number(p.price || 0).toFixed(2)}</div>
                                                  </div>
                                              </button>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          )}
                      </>
                  )}
              </div>
          )}
      </div>
      
      <div className="header-actions relative" ref={notifRef}>
        <button className="btn btn-icon flex" onClick={toggleTheme} title={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {/* Notifications Bell */}
        <button 
            className="btn btn-icon relative"
            onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell size={20} className={notifications.length > 0 ? "text-gray-700" : "text-gray-400"} />
          {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in origin-top-right">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 text-sm">Notificações</h3>
                    <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded-full text-gray-600 font-bold">{notifications.length}</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                             <Check size={24} className="text-gray-300" />
                             <p>Tudo certo por aqui!</p>
                        </div>
                    ) : (
                        notifications.map((n, i) => (
                             <div 
                                key={i} 
                                onClick={() => { navigate(n.link); setShowNotifications(false); }}
                                className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3"
                             >
                                <div className={`mt-1 p-1.5 rounded-full h-fit flex-shrink-0 ${n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                    <AlertTriangle size={14} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800">{n.title}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                </div>
                             </div>
                        ))
                    )}
                </div>
            </div>
        )}

        <div className="avatar">
            {userInitial}
        </div>
      </div>
    </header>
  );
}
