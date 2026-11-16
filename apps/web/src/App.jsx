import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandProvider } from './contexts/BrandContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import MobileLayout from './components/layout/MobileLayout';
import { ShieldAlert, CheckCircle2, ClipboardList, User, LogOut, Menu } from 'lucide-react';
import { useBrand } from './contexts/BrandContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { ConfirmContainer } from './components/ui/ConfirmContainer';
import { useOrders } from './hooks/useData';
import ReloadPrompt from './components/ui/ReloadPrompt';

// Helper para import dinâmico blindado contra ausência de export default (prevenindo TypeError em lazyInitializer)
const safeLazy = (importFn) =>
  React.lazy(() =>
    importFn().then((m) => {
      const comp =
        m.default ||
        m.NovaOrdemServico ||
        m.Agenda ||
        m.Relatorios ||
        m.Dashboard ||
        Object.values(m).find((v) => typeof v === 'function') ||
        (() => null);
      return { default: comp };
    })
  );

// Páginas com Carregamento Seguro
const Dashboard = safeLazy(() => import('./pages/Dashboard'));
const Clientes = safeLazy(() => import('./pages/Clientes'));
const Servicos = safeLazy(() => import('./pages/Servicos'));
const Estoque = safeLazy(() => import('./pages/Materiais'));
const Vendas = safeLazy(() => import('./pages/Vendas'));
const OrdensServico = safeLazy(() => import('./pages/OrdensServico'));
const NovaOrdemServico = safeLazy(() => import('./pages/NovaOrdemServico'));
const Agenda = safeLazy(() => import('./pages/Agenda'));
const Colaboradores = safeLazy(() => import('./pages/Colaboradores'));
const SettingsPage = safeLazy(() => import('./pages/Settings'));
const Trabalhos = safeLazy(() => import('./pages/Trabalhos'));
const MonitorTV = safeLazy(() => import('./pages/MonitorTV'));
const OperadorHome = safeLazy(() => import('./pages/OperadorHome'));
const LoginPage = safeLazy(() => import('./pages/LoginPage'));
const ExecutorView = safeLazy(() => import('./pages/ExecutorView'));
const ProfilePage = safeLazy(() => import('./pages/Profile'));
const CustomerStatus = safeLazy(() => import('./pages/CustomerStatus'));
const Relatorios = safeLazy(() => import('./pages/Relatorios'));
const Ajuda = safeLazy(() => import('./pages/Ajuda'));
const SelfBooking = safeLazy(() => import('./pages/SelfBooking'));
const ClientPortal = safeLazy(() => import('./pages/ClientPortal'));
const PesquisaNPS = safeLazy(() => import('./pages/PesquisaNPS'));
const LandingPage = safeLazy(() => import('./pages/LandingPage'));
const TermsOfService = safeLazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = safeLazy(() => import('./pages/PrivacyPolicy'));
const OnboardingPage = safeLazy(() => import('./pages/OnboardingPage'));
const PublicQuotePage = safeLazy(() => import('./pages/PublicQuotePage'));
const PublicPassportPage = safeLazy(() => import('./pages/PublicPassportPage'));
const MiniSiteOficina = safeLazy(() => import('./pages/MiniSiteOficina'));
const CorporatePage = safeLazy(() => import('./pages/Corporate'));
const CrmRetencaoPage = safeLazy(() => import('./pages/CrmRetencao'));

// Componente de Loading Premium para Transições de Rota
const PageLoading = () => {
  const { name } = useBrand();
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-6 animate-in fade-in duration-700">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] mb-1">{name || 'OsSystem Automotivo'}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando módulo...</p>
      </div>
    </div>
  );
};

// Sincronizador de Favicon e Title
const DocumentHead = () => {
   const { name, logoUrl } = useBrand();
   
   useEffect(() => {
     if (name) {
        document.title = `${name} | OsSystem`;
     } else {
        document.title = 'OsSystem';
     }

     if (logoUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
           link = document.createElement('link');
           link.rel = 'icon';
           document.head.appendChild(link);
        }
        link.href = logoUrl;
     }
   }, [name, logoUrl]);

   return null;
};

// Componente isolado para redirecionar /superadm ao bundle próprio sem disparar no render
const SuperAdmRedirect = () => {
  useEffect(() => {
    window.location.replace(window.location.pathname + window.location.search);
  }, []);
  return null;
};

// Componente para Proteção de Rotas
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-xl"></div>
        {user && <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Sincronizando seu perfil...</p>}
      </div>
    );
  }

  if (!user) {
    if (location.pathname === '/login' || location.pathname.endsWith('/login')) return children;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o usuário está logado mas o perfil não existe (ex: tabela profiles não criada ou erro de banco)
  if (!profile && allowedRoles.length > 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="card-premium p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase mb-2">Acesso Restrito</h2>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Seu usuário foi autenticado, mas não encontramos seu perfil de acesso. 
            Isso pode ocorrer se as tabelas do banco de dados ainda não foram configuradas.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="btn-primary w-full"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  const rawUserRole = String(profile?.cargo || '').toUpperCase();
  const normalizedUserRole = ['OWNER', 'ADMIN', 'ADM'].includes(rawUserRole)
    ? 'ADM'
    : ['MANAGER', 'GESTOR', 'RECEPCIONISTA', 'RECEPTIONIST'].includes(rawUserRole)
      ? 'GESTOR'
      : ['TECHNICIAN', 'TECNICO', 'OPERADOR'].includes(rawUserRole)
        ? 'OPERADOR'
        : rawUserRole;

  const normalizedAllowedRoles = allowedRoles.map((r) => {
    const up = String(r).toUpperCase();
    if (['OWNER', 'ADMIN', 'ADM'].includes(up)) return 'ADM';
    if (['MANAGER', 'GESTOR'].includes(up)) return 'GESTOR';
    if (['TECHNICIAN', 'TECNICO', 'OPERADOR'].includes(up)) return 'OPERADOR';
    return up;
  });

  const hasAccess =
    allowedRoles.length === 0 ||
    normalizedAllowedRoles.includes(normalizedUserRole) ||
    normalizedAllowedRoles.includes(rawUserRole);

  if (!hasAccess) {
    if (normalizedUserRole === 'OPERADOR') {
      if (location.pathname === '/operador') return children; // fail-safe
      return <Navigate to="/operador" replace />;
    }
    
    // Evita loop infinito
    if (location.pathname === '/dashboard' || location.pathname.endsWith('/dashboard')) {
      return (
         <div className="h-screen flex items-center justify-center bg-slate-50 p-6 text-center text-rose-500 font-bold uppercase tracking-widest text-xs">
             Acesso Negado: Perfil sem permissão para painel administrativo.
         </div>
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const getStatusClasses = (status) => {
    if (!status) return 'bg-slate-100 text-slate-600 border-slate-200';
    const s = String(status).toUpperCase();
    if (s.includes('CONCLU')) return 'bg-emerald-100 text-emerald-600 border-emerald-200';
    if (s.includes('EXECU')) return 'bg-blue-100 text-blue-600 border-blue-200';
    if (s.includes('AGUARDA')) return 'bg-amber-100 text-amber-600 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

// Layout para o Operador (Mobile Friendly)
const OperadorLayoutWrapper = () => {
  const { profile } = useAuth();
  const [opView, setOpView] = useState('tarefas');
  const [selectedOS, setSelectedOS] = useState(null);
  const { orders } = useOrders();

  const navItems = [
    { id: 'tarefas', icon: ClipboardList, label: 'Tarefas' },
    { id: 'historico', icon: CheckCircle2, label: 'Histórico' },
    { id: 'perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <MobileLayout 
      currentView={selectedOS ? 'execucao' : opView} 
      setView={(viewId) => {
        setSelectedOS(null);
        setOpView(viewId);
      }} 
      title={selectedOS ? 'Executando Serviço' : (navItems.find(i => i.id === opView)?.label || 'OsSystem')}
    >
      {selectedOS ? (
        <ExecutorView 
          os={selectedOS} 
          onBack={() => setSelectedOS(null)}
          onComplete={() => {
            setSelectedOS(null);
            setOpView('historico');
          }}
        />
      ) : (
        <>
          {opView === 'tarefas' && <OperadorHome onSelectOS={setSelectedOS} />}
          {opView === 'historico' && (
            <div className="fade-in space-y-3">
              <h3 className="text-xs font-bold text-[#9AA7B8] uppercase tracking-[0.2em] pt-2 px-1">
                Seus Serviços Concluídos
              </h3>
              {(() => {
                const history = (orders || []).filter((os) => {
                  if (!os) return false;
                  const st = String(os.status || '').toUpperCase();
                  const isDoneStatus = [
                    'QA',
                    'READY',
                    'DELIVERED',
                    'ENTREGUE',
                    'CONCLUIDO',
                    'CONCLUÍDO',
                    'PRONTO',
                  ].includes(st) || st.includes('CONCLU');

                  const isMyTech =
                    !profile?.id ||
                    os.technicianId === profile?.id ||
                    os.technician_id === profile?.id ||
                    os.tecnico_id === profile?.id ||
                    !os.technician_id;

                  return isDoneStatus && isMyTech;
                });

                if (history.length === 0) {
                  return (
                    <div className="py-16 text-center bg-[#171C24] rounded-3xl border border-[#2E3744] p-6 space-y-2">
                      <div className="w-12 h-12 bg-[#232A35] rounded-2xl border border-[#2E3744] text-[#C8F52E] flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-[#F2F5F8] uppercase tracking-wide">
                        Nenhum serviço concluído
                      </h4>
                      <p className="text-xs text-[#9AA7B8]">
                        Os serviços finalizados por você na oficina aparecerão arquivados aqui.
                      </p>
                    </div>
                  );
                }

                return history.map((os) => (
                  <div
                    key={os.id}
                    className="bg-[#171C24] rounded-3xl p-4 md:p-5 border border-[#2E3744] flex items-center gap-4 transition-all"
                  >
                    <div className="w-12 h-12 bg-[#C8F52E]/15 text-[#C8F52E] rounded-2xl flex items-center justify-center border border-[#C8F52E]/30 shrink-0">
                      <CheckCircle2 size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold text-[#F2F5F8] uppercase truncate leading-tight font-grotesk">
                          {os.veiculo_desc || 'Veículo'}
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-[#9AA7B8] shrink-0">
                          #{String(os.osNumber || os.os_number || os.id).slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-xs text-[#9AA7B8] font-medium mt-1 truncate">
                        {os.servico || 'Serviço Executado'}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
          {opView === 'perfil' && <ProfilePage />}
        </>
      )}
    </MobileLayout>
  );
};

const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const cleanPath = location.pathname.replace(/^\/+/, '');
    const pageSegment = cleanPath.endsWith('/dashboard') ? 'dashboard' : cleanPath || 'dashboard';
    setActivePage(pageSegment);
  }, [location]);

  const handleNavigate = (pageId) => {
    const path = pageId === 'dashboard' ? '/dashboard' : `/${pageId}`;
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex bg-[#F3F5F7] min-h-screen font-sans relative overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Oficial Escura #0E1116 */}
      <div className="no-print">
        <Sidebar activePage={activePage} setActivePage={handleNavigate} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
      
      {/* Área Principal de Conteúdo */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full max-w-full print:h-auto print:overflow-visible print:block">
        {/* Mobile Topbar Clean */}
        <header className="lg:hidden bg-[#0E1116] border-b border-[#1B2129] px-4 py-3 flex items-center justify-between no-print z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C8F52E] flex items-center justify-center font-display font-extrabold text-[#0E1116] text-sm">
              CX
            </div>
            <span className="font-display font-bold text-lg text-white">
              Car<span className="text-[#C8F52E]">X</span>
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-[#9AA7B8] hover:text-white rounded-lg focus:outline-none"
            title="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Scrollable Main Canvas */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-8 custom-scrollbar relative print:overflow-visible print:h-auto print:p-0">
          <div className="max-w-[1400px] mx-auto w-full print:max-w-full print:m-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider>
          <BrandProvider>
            <DocumentHead />
            <ToastContainer />
            <ConfirmContainer />
            <ReloadPrompt />
            <React.Suspense fallback={<PageLoading />}>
              <Routes>
              {/* Redirecionamento seguro para SuperAdmin fora do SPA principal */}
              <Route path="/superadm/*" element={<SuperAdmRedirect />} />

              {/* Landing Page Oficial na Raiz (Padrão OperaBeauty) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/precos" element={<LandingPage />} />
              <Route path="/recursos" element={<LandingPage />} />
              <Route path="/para/:segment" element={<LandingPage />} />
              <Route path="/termos" element={<TermsOfService />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />

              {/* Onboarding Self-Service Guiado por Segmento (T5.3) */}
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/comecar-gratis" element={<OnboardingPage />} />
              <Route path="/cadastro" element={<OnboardingPage />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/tv" element={<MonitorTV />} />
              <Route path="/monitor-tv" element={<Navigate to="/tv" replace />} />
              <Route path="/ordens-servico" element={<Navigate to="/ordens" replace />} />
              <Route path="/status/:id" element={<CustomerStatus />} />
              <Route path="/proposta/:token" element={<PublicQuotePage />} />
              <Route path="/orcamento/:token" element={<PublicQuotePage />} />
              <Route path="/v/:token" element={<PublicPassportPage />} />
              <Route path="/passaporte/:token" element={<PublicPassportPage />} />
              <Route path="/garantia/:token" element={<PublicPassportPage />} />
              <Route path="/agendar" element={<SelfBooking />} />
              <Route path="/reserva" element={<SelfBooking />} />
              <Route path="/meu-veiculo" element={<ClientPortal />} />
              <Route path="/meuportal" element={<ClientPortal />} />
              <Route path="/portal" element={<ClientPortal />} />
              <Route path="/nps/:osId" element={<PesquisaNPS />} />
              <Route path="/avaliar/:osId" element={<PesquisaNPS />} />

              {/* Mini-Site Institucional da Oficina (Aliases legados) */}
              <Route path="/loja/:slug" element={<MiniSiteOficina />} />
              <Route path="/oficina/:slug" element={<MiniSiteOficina />} />
              <Route path="/site/:slug" element={<MiniSiteOficina />} />
              <Route path="/site" element={<MiniSiteOficina />} />

              {/* Rotas Administrativas do Gestor */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/:slug/dashboard" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Clientes /></AppLayout></ProtectedRoute>} />
              <Route path="/vendas" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Vendas /></AppLayout></ProtectedRoute>} />
              <Route path="/ordens" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR', 'OPERADOR']}><AppLayout><OrdensServico /></AppLayout></ProtectedRoute>} />
              <Route path="/ordens/nova" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR', 'OPERADOR']}><AppLayout><NovaOrdemServico /></AppLayout></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Agenda /></AppLayout></ProtectedRoute>} />
              <Route path="/trabalhos" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Trabalhos /></AppLayout></ProtectedRoute>} />
              <Route path="/servicos" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Servicos /></AppLayout></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Estoque /></AppLayout></ProtectedRoute>} />
              <Route path="/colaboradores" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Colaboradores /></AppLayout></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Relatorios /></AppLayout></ProtectedRoute>} />
              <Route path="/corporate" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><CorporatePage /></AppLayout></ProtectedRoute>} />
              <Route path="/redes" element={<Navigate to="/corporate" replace />} />
              <Route path="/multiunidade" element={<Navigate to="/corporate" replace />} />
              <Route path="/crm" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><CrmRetencaoPage /></AppLayout></ProtectedRoute>} />
              <Route path="/retencao" element={<Navigate to="/crm" replace />} />
              <Route path="/pos-venda" element={<Navigate to="/crm" replace />} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/ajuda" element={<ProtectedRoute allowedRoles={['ADM', 'GESTOR']}><AppLayout><Ajuda /></AppLayout></ProtectedRoute>} />

              {/* Rota do Operador */}
              <Route path="/operador" element={<ProtectedRoute allowedRoles={['OPERADOR', 'ADM', 'GESTOR']}><OperadorLayoutWrapper /></ProtectedRoute>} />

              {/* Rotas por Slug da Oficina (Padrão OperaBeauty) */}
              <Route path="/:slug/login" element={<LoginPage />} />
              <Route path="/:slug/meuportal" element={<ClientPortal />} />
              <Route path="/:slug/portal" element={<ClientPortal />} />
              <Route path="/:slug/agendar" element={<SelfBooking />} />
              <Route path="/:slug" element={<MiniSiteOficina />} />

              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </BrandProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
