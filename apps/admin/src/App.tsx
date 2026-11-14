import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TenantsPage } from './pages/TenantsPage';
import { TenantWizardPage } from './pages/TenantWizardPage';
import { ContractsPage } from './pages/ContractsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PlansPage } from './pages/PlansPage';
import { CouponsPage } from './pages/CouponsPage';
import { WhatsAppManagerPage } from './pages/WhatsAppManagerPage';
import { LeadsPage } from './pages/LeadsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

export function App() {
  const routerBase =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/superadm')
      ? '/superadm'
      : '/';

  return (
    <BrowserRouter
      basename={routerBase}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <Routes>
          {/* Rota Pública de Autenticação */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas do Super Admin */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="tenants/new" element={<TenantWizardPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="whatsapp" element={<WhatsAppManagerPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="audit" element={<AuditLogsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
