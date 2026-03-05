
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Products } from './pages/Products';
import { Customers } from './pages/Customers';
import { Settings } from './pages/Settings';
import { FinanceFinal as Finance } from './pages/FinanceFinal';
import { CreditCards } from './pages/CreditCards';
import { Inventory } from './pages/Inventory';
import { Equipments } from './pages/Equipments';
import { Budgets } from './pages/Budgets';
import { OrderPrint } from './pages/OrderPrint';
import { Users } from './pages/Users';
import { Staff } from './pages/Staff';
import { Reports } from './pages/Reports';
import { Production } from './pages/Production';
import { ProductivityReport } from './pages/ProductivityReport';
import { DesignLibrary } from './pages/DesignLibrary';
import { OrderTracking } from './pages/OrderTracking';
import { ProposalView } from './pages/ProposalView';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';
import ErrorBoundary from './components/ErrorBoundary';
import AutomationService from './services/AutomationService';
import { useEffect } from 'react';
import { TimeGateGuard } from './components/TimeGateGuard';
// 🔒 Protected Route Component
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Redirect to login but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <TimeGateGuard>
      {children}
    </TimeGateGuard>
  );
}


function App() {
  useEffect(() => {
    AutomationService.start();
    return () => AutomationService.stop();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <DataProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/status/:id" element={<OrderTracking />} />
                <Route path="/proposal/:id" element={<ProposalView />} />

                {/* Protected Routes (Wrapped in Layout) */}
                <Route element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/designs" element={<DesignLibrary />} />
                  <Route path="/production" element={<Production />} />
                  <Route path="/productivity" element={<ProductivityReport />} />
                  <Route path="/budgets" element={<Budgets />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/credit-cards" element={<CreditCards />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/equipments" element={<Equipments />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>

                {/* Standalone Protected Routes (No Layout) */}
                <Route path="/order/print/:id" element={
                  <PrivateRoute>
                    <OrderPrint />
                  </PrivateRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </DataProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
