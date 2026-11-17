import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  TrendingUp, 
  Wrench, 
  Users, 
  Package, 
  BarChart3, 
  Sparkles, 
  UserCheck, 
  Settings, 
  LogOut, 
  Tv, 
  X,
  ChevronRight,
  Building2,
  HeartHandshake,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';
import { useNavigate } from 'react-router-dom';
import { getStoredTenantSlug } from '../../services/api';

const Sidebar = ({ activePage, setActivePage, isOpen, setIsOpen }) => {
  const { profile, signOut } = useAuth();
  const { name: lojaName, logoUrl, slug: brandSlug } = useBrand();
  const navigate = useNavigate();

  const tenantSlug = brandSlug || getStoredTenantSlug() || 'caiocar';
  const tvUrl = `/${tenantSlug}/tv`;

  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['ADM', 'GESTOR'] },
    { id: 'agenda', label: 'Agenda', icon: Calendar, roles: ['ADM', 'GESTOR'] },
    { id: 'vendas', label: 'Vendas', icon: TrendingUp, roles: ['ADM', 'GESTOR'] },
    { id: 'ordens', label: 'Ordens de serviço', icon: Wrench, roles: ['ADM', 'GESTOR', 'OPERADOR'] },
    { id: 'clientes', label: 'Clientes', icon: Users, roles: ['ADM', 'GESTOR'] },
    { id: 'estoque', label: 'Estoque', icon: Package, roles: ['ADM', 'GESTOR'] },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, roles: ['ADM', 'GESTOR'] },
    { id: 'crm', label: 'CRM & Retenção', icon: HeartHandshake, roles: ['ADM', 'GESTOR', 'OWNER'] },
    { id: 'corporate', label: 'Redes / Franquias', icon: Building2, roles: ['ADM', 'GESTOR', 'OWNER'] },
    { id: 'servicos', label: 'Serviços', icon: Sparkles, roles: ['ADM', 'GESTOR'] },
    { id: 'colaboradores', label: 'Colaboradores', icon: UserCheck, roles: ['ADM', 'GESTOR'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['ADM', 'GESTOR'] },
    { id: 'assinatura', label: 'Assinatura & Licença', icon: CreditCard, roles: ['ADM', 'GESTOR', 'OWNER'] },
  ];

  const userRole = String(profile?.cargo || '').toUpperCase();
  const filteredItems = menuItems.filter(item => 
    item.roles.map(r => r.toUpperCase()).includes(userRole) || userRole === 'ADM' || userRole === 'OWNER'
  );

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const isCurrentActive = (id) => {
    if (id === 'dashboard' && (activePage === 'dashboard' || activePage === '')) return true;
    return activePage === id;
  };

  return (
    <aside 
      className={`w-64 bg-[#0E1116] border-r border-[#1B2129] flex flex-col h-screen fixed lg:sticky top-0 left-0 z-50 transition-transform duration-300 ease-in-out select-none ${
        isOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1B2129] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
              <img src={logoUrl} alt="Logo da Loja" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#C8F52E] flex items-center justify-center font-display font-black text-[#0E1116] text-lg shadow-sm shadow-[#C8F52E]/20 flex-shrink-0">
              CX
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg tracking-tight text-white leading-tight">
                Car<span className="text-[#C8F52E]">X</span>
              </span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-white/10 text-white/80">
                PRO
              </span>
            </div>
            <p className="text-xs text-[#9AA7B8] font-medium truncate mt-0.5" title={lojaName || 'Oficina Automotiva'}>
              {lojaName || profile?.tenantName || 'Oficina Matriz'}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 text-[#9AA7B8] hover:text-white hover:bg-white/10 rounded-xl transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const active = isCurrentActive(item.id);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all duration-200 group ${
                active 
                  ? 'bg-[#C8F52E] text-[#0E1116] font-bold shadow-sm' 
                  : 'text-[#9AA7B8] hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={19} className={active ? 'text-[#0E1116]' : 'text-[#9AA7B8] group-hover:text-white transition-colors'} />
                <span className="truncate">{item.label}</span>
              </div>
              {active && <ChevronRight size={16} className="text-[#0E1116]" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-[#1B2129] bg-[#0A0D12] space-y-2">
        {/* Monitor TV Link com Slug Multitenant */}
        <a 
          href={tvUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/90 font-medium transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Tv size={16} className="text-[#C8F52E]" />
            <span>Monitor TV</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C8F52E]/15 text-[#C8F52E] border border-[#C8F52E]/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8F52E] animate-ping" />
            Ao vivo
          </span>
        </a>

        {/* User Profile & Logout */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#C8F52E]/15 border border-[#C8F52E]/30 flex items-center justify-center font-bold text-xs text-[#C8F52E]">
              {profile?.nome ? profile.nome.slice(0, 2).toUpperCase() : 'GX'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{profile?.nome || 'Gestor'}</p>
              <p className="text-[10px] text-[#9AA7B8] font-medium truncate">{profile?.cargo || 'Administrador'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sair do sistema"
            className="p-1.5 rounded-lg text-[#9AA7B8] hover:text-[#E5484D] hover:bg-[#E5484D]/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
