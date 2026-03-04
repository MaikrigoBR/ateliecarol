
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, FileText, Package, PieChart, Settings, LogOut, Briefcase, UserCog, PenTool, DollarSign, Hammer, Users, X, Columns, FolderHeart, TrendingUp, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SectionTitle = ({ title, color, bgColor }) => (
  <div style={{
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: color,
    backgroundColor: bgColor,
    padding: '6px 12px',
    margin: '16px 16px 8px 16px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 4px ${color}` }}></div>
    {title}
  </div>
);

export function Sidebar({ onClose }) {
  const location = useLocation();
  const { logout } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path) => {
    if (path === '/') return currentPath === '/' ? 'active' : '';
    return currentPath.startsWith(path) ? 'active' : '';
  };

  return (
    <aside id="sidebar" className="sidebar">
      <div className="sidebar-header">
        <div className="brand-logo">
          <PenTool size={24} />
          <span>Estúdio Criativo</span>
        </div>
        <button 
            className="btn btn-icon d-lg-none ml-auto" 
            onClick={onClose}
        >
            <X size={24} className="text-muted" />
        </button>

      </div>
      
      <nav className="sidebar-nav" style={{ padding: '8px 0' }}>
        <SectionTitle title="Principal" color="#2563eb" bgColor="#eff6ff" />
        <Link to="/" className={`nav-item ${isActive('/')}`}>
          <LayoutDashboard size={20} />
          <span>Visão Geral</span>
        </Link>
        <Link to="/reports" className={`nav-item ${isActive('/reports')}`}>
          <PieChart size={20} />
          <span>Relatórios</span>
        </Link>

        <SectionTitle title="Vendas & Operações" color="#7c3aed" bgColor="#f3e8ff" />
        <Link to="/budgets" className={`nav-item ${isActive('/budgets')}`}>
          <FileText size={20} />
          <span>Orçamentos</span>
        </Link>
        <Link to="/orders" className={`nav-item ${isActive('/orders')}`}>
          <ShoppingBag size={20} />
          <span>Pedidos</span>
        </Link>
        <Link to="/production" className={`nav-item ${isActive('/production')}`}>
          <Columns size={20} />
          <span>Produção</span>
        </Link>
        <Link to="/productivity" className={`nav-item ${isActive('/productivity')}`}>
          <TrendingUp size={20} />
          <span>Produtividade</span>
        </Link>
        <Link to="/designs" className={`nav-item ${isActive('/designs')}`}>
          <FolderHeart size={20} />
          <span>Galeria de Modelos</span>
        </Link>

        <SectionTitle title="Cadastros" color="#059669" bgColor="#ecfdf5" />
        <Link to="/customers" className={`nav-item ${isActive('/customers')}`}>
          <Users size={20} />
          <span>Clientes</span>
        </Link>
        <Link to="/products" className={`nav-item ${isActive('/products')}`}>
          <Package size={20} />
          <span>Produtos (Catálogo)</span>
        </Link>
        <Link to="/inventory" className={`nav-item ${isActive('/inventory')}`}>
          <Hammer size={20} />
          <span>Ativos & Materiais</span>
        </Link>

        <SectionTitle title="Gestão" color="#ea580c" bgColor="#fff7ed" />
        <Link to="/finance" className={`nav-item ${isActive('/finance')}`}>
          <DollarSign size={20} />
          <span>Financeiro</span>
        </Link>
        <Link to="/credit-cards" className={`nav-item ${isActive('/credit-cards')}`}>
          <CreditCard size={20} />
          <span>Gestão de Cartões</span>
        </Link>
        <Link to="/staff" className={`nav-item ${isActive('/staff')}`}>
          <Briefcase size={20} />
          <span>Equipe & Custos</span>
        </Link>

        <SectionTitle title="Sistema" color="#475569" bgColor="#f1f5f9" />
        <Link to="/settings" className={`nav-item ${isActive('/settings')}`}>
          <Settings size={20} />
          <span>Configurações</span>
        </Link>
        <Link to="/users" className={`nav-item ${isActive('/users')}`}>
          <UserCog size={20} />
          <span>Usuários (Login)</span>
        </Link>

        <div style={{ marginTop: 'auto' }}></div>
        {/* Logout Button */}
        <button 
            onClick={logout} 
            className="sidebar-logout" 
        >
            <LogOut size={20} />
            <span>Sair</span>
        </button>
      </nav>
    </aside>
  );
}
