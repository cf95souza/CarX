import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  FileSignature,
  Receipt,
  MessageSquareCode,
  Users2,
  ShieldCheck,
  Layers,
  Ticket,
  LogOut,
  Shield,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Visão Geral (MRR)', to: '/', icon: LayoutDashboard },
    { label: 'Oficinas Clientes', to: '/tenants', icon: Building2 },
    { label: 'Criar Oficina', to: '/tenants/new', icon: PlusCircle },
    { label: 'Contratos e Licenças', to: '/contracts', icon: FileSignature },
    { label: 'Faturas e Cobranças', to: '/invoices', icon: Receipt },
    { label: 'Planos e Recursos', to: '/plans', icon: Layers },
    { label: 'Cupons de Desconto', to: '/coupons', icon: Ticket },
    { label: 'Gerenciador WhatsApp', to: '/whatsapp', icon: MessageSquareCode },
    { label: 'Funil de Leads', to: '/leads', icon: Users2 },
    { label: 'Trilha de Auditoria', to: '/audit', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-asfalto text-texto flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-grafite border-b border-aco/50 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-volt/10 border border-volt/30 flex items-center justify-center font-bold text-volt text-sm">
            CX
          </div>
          <span className="font-display font-bold text-lg tracking-wider text-texto">
            Car<span className="text-volt">X</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-volt/10 text-volt border border-volt/20">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-muted hover:text-texto rounded-lg focus:outline-none"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 bg-grafite border-r border-aco/50 flex flex-col justify-between transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo & Brand Header */}
          <div className="p-5 border-b border-aco/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-volt flex items-center justify-center font-display font-extrabold text-asfalto text-base shadow-sm shadow-volt/20">
                CX
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-lg tracking-tight text-white">
                    Car<span className="text-volt">X</span>
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-volt text-asfalto">
                    SaaS
                  </span>
                </div>
                <p className="text-[11px] text-muted font-medium">Controle Super Admin</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <p className="px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-muted/70">
              Operações Globais
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-btn text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-volt text-asfalto font-semibold shadow-sm shadow-volt/10'
                        : 'text-muted hover:text-texto hover:bg-aco/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} className={isActive ? 'text-asfalto' : 'text-muted'} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-aco/40 bg-asfalto/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-grafite/60 border border-aco/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-aco/80 flex items-center justify-center font-semibold text-xs text-volt border border-aco">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SA'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-texto truncate">{user?.name || 'Super Admin'}</p>
                <div className="flex items-center gap-1 text-[10px] text-volt">
                  <ShieldCheck size={11} />
                  <span>2FA Ativo</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair do painel"
              className="p-1.5 rounded-lg text-muted hover:text-semantic-error hover:bg-semantic-error/10 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-grafite/50 border-b border-aco/30 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-semantic-success animate-pulse" />
            <span className="text-xs font-medium text-muted">
              Cluster Ativo: <strong className="text-texto">admin.carx.com.br</strong> (Container 5)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aco/40 border border-aco/60 text-muted">
              <Shield size={12} className="text-volt" />
              <span>Sessão Auditada e Criptografada</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 md:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

