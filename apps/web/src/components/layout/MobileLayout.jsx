import React from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  User, 
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';

const MobileLayout = ({ children, currentView, setView, title }) => {
  const { name } = useBrand();
  const { signOut } = useAuth();

  const navItems = [
    { id: 'tarefas', icon: ClipboardList, label: 'Tarefas' },
    { id: 'historico', icon: CheckCircle2, label: 'Histórico' },
    { id: 'perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="h-screen bg-[#0E1116] text-[#F2F5F8] flex flex-col overflow-hidden font-sans">
      {/* Header Mobile 100% Dark (Rebraind Style) */}
      <header className="bg-[#0E1116] border-b border-[#2E3744] px-5 py-3.5 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C8F52E] rounded-xl flex items-center justify-center text-[#0E1116] font-black text-xs font-mono shadow-sm">
            {(name || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#F2F5F8] leading-tight tracking-tight font-grotesk">{title}</h1>
            <p className="text-[10px] text-[#9AA7B8] uppercase font-bold tracking-widest">
              {name || 'Oficina'} · Operador
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={signOut}
            title="Sair da conta"
            className="p-2 text-[#9AA7B8] hover:text-[#FF6B5E] hover:bg-[#232A35] rounded-xl transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 bg-[#0E1116]">
        {children}
      </main>

      {/* Bottom Navigation 100% Dark (Rebraind Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0E1116] border-t border-[#2E3744] px-3 py-1 flex items-center justify-around z-40">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[56px] py-1 transition-all ${
                isActive 
                  ? 'text-[#C8F52E]' 
                  : 'text-[#9AA7B8] hover:text-[#F2F5F8]'
              }`}
            >
              <item.icon size={22} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
              <span className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
                isActive ? 'opacity-100 font-black' : 'opacity-70'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileLayout;
