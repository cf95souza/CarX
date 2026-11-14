import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  Wrench, 
  FileCheck2, 
  Tv, 
  Smartphone, 
  Award, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  Calculator, 
  HelpCircle, 
  ChevronDown, 
  Send, 
  Users, 
  Sparkles, 
  CalendarCheck, 
  Car,
  Lock,
  BarChart3,
  PhoneCall,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3333';

export default function LandingPage() {
  // Estado da Calculadora de ROI
  const [osCount, setOsCount] = useState<number>(60);
  const [avgTicket, setAvgTicket] = useState<number>(350);

  // Estado do Formulário de Lead
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    segment: 'Estética Automotiva & Detailing',
    employees_count: '1 a 5 colaboradores',
    notes: '',
    website: '', // Honeypot anti-bot (invisível)
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Estado do FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Estado de Segmento Ativo no Preview
  const [activeSegment, setActiveSegment] = useState<'ppf' | 'insulfilm' | 'estetica' | 'mecanica'>('estetica');

  // Estado das Abas Por Papel
  const [activeRole, setActiveRole] = useState<'dono' | 'atendente' | 'tecnico' | 'cliente'>('dono');

  // Estado do Banner LGPD de Cookies
  const [cookieConsent, setCookieConsent] = useState<boolean>(() => {
    return localStorage.getItem('carx_cookie_consent') === 'true';
  });

  const handleCookieAccept = () => {
    localStorage.setItem('carx_cookie_consent', 'true');
    setCookieConsent(true);
  };

  // Cálculos do Simulador de Retorno Financeiro (ROI)
  const monthlyRevenue = osCount * avgTicket;
  const hoursSavedMonth = Math.round(osCount * 1.5); // Economia média de 1.5h por OS em comunicação e burocracia
  const wasteRecovered = Math.round(monthlyRevenue * 0.08); // 8% a mais de faturamento evitando perdas e retrabalho

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    setLeadError(null);

    try {
      const res = await fetch(`${API_URL}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao registrar interesse.');
      }

      setLeadSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        segment: 'Estética Automotiva & Detailing',
        employees_count: '1 a 5 colaboradores',
        notes: '',
        website: '',
      });
    } catch (err: any) {
      setLeadError(err.message || 'Falha na comunicação. Tente novamente ou use o WhatsApp.');
    } finally {
      setLeadLoading(false);
    }
  };

  const segmentsData = {
    ppf: {
      title: 'Paint Protection Film (PPF)',
      badge: 'Corte Digital & Rolos',
      desc: 'Rastreabilidade total de bobinas, metragem usada por peça, redução drástica de desperdício e termo de garantia com QR Code.',
      bullets: [
        'Baixa automática de metros lineares por modelo de carro',
        'Controle de lote de bobina vinculado ao certificado',
        'Cálculo real do custo do metro aplicado vs. margem líquida',
        'Checklist fotográfico para blindar a loja contra riscos pré-existentes',
      ],
    },
    insulfilm: {
      title: 'Películas Solares & Térmicas',
      badge: 'Nanotecnologia & Transparência',
      desc: 'Gestão de tonalidades (G5, G20, G35, G70), películas de cerâmica e emissão instantânea do certificado de garantia digital.',
      bullets: [
        'Orçamento com seletor visual de vidros (parabrisa, laterais, traseiro)',
        'Controle de sobras de rolos e aproveitamento inteligente',
        'Notificação no WhatsApp quando o carro estiver pronto para secagem',
        'Garantia anti-bolhas com número de série registrado',
      ],
    },
    estetica: {
      title: 'Estética Automotiva & Detailing',
      badge: 'Polimento & Vitrificação',
      desc: 'Do laudo visual de avarias à entrega técnica com inspeção de qualidade (QA) e passaporte digital para valorizar o veículo do cliente.',
      bullets: [
        'Laudo VCR com fotos de 8 ângulos antes e depois',
        'Cronômetro de polimento e aplicação de vitrificador no PWA do operador',
        'Passaporte do Veículo com histórico de proteção para revenda',
        'Pesquisa de satisfação NPS automática via WhatsApp após 24 horas',
      ],
    },
    mecanica: {
      title: 'Mecânica Geral & Funilaria',
      badge: 'Orçamentos & Peças',
      desc: 'Ordens de serviço com controle de peças do estoque, aprovação online pelo cliente via link seguro e conciliação financeira precisa.',
      bullets: [
        'Aprovação de orçamento digital com assinatura online pelo cliente',
        'Alocação inteligente de elevadores e boxes por horário',
        'Reserva automática de autopeças e insumos na aprovação da OS',
        'DRE em tempo real com separação de receita de mão de obra e peças',
      ],
    },
  };

  const rolesData = {
    dono: {
      title: 'Visão do Proprietário / Gestor',
      desc: 'Acompanhe faturamento, margem de lucro por serviço, produtividade dos operadores e o fluxo de pátio em tempo real de qualquer lugar.',
      metrics: ['DRE Gerencial e Comissões', 'Monitor TV 360° do Pátio', 'Zero vazamento com RLS'],
    },
    atendente: {
      title: 'Visão da Recepção & Atendimento',
      desc: 'Abra orçamentos em segundos, envie orçamentos com botão de aceite pelo WhatsApp e agende serviços sem choque de horário nos boxes.',
      metrics: ['Agendamento sem Conflitos', 'Orçamento com Aceite Digital', 'WhatsApp Oficial da Loja'],
    },
    tecnico: {
      title: 'Visão do Técnico Operador (PWA)',
      desc: 'Um app leve e escuro para chão de oficina: veja suas tarefas na fila, preencha checklists fotográficos e acione o cronômetro oficial do serviço.',
      metrics: ['Cronômetro de Foco Único', 'Checklist Fotográfico Rápido', 'Funciona no Celular'],
    },
    cliente: {
      title: 'Visão do Cliente Final',
      desc: 'Seu cliente recebe link com fotos de progresso, laudo VCR de entrada, passaporte digital do veículo e aprova o orçamento sem burocracia.',
      metrics: ['Passaporte Digital com QR', 'Acompanhamento em Tempo Real', 'Pesquisa NPS com 1 Clique'],
    },
  };

  const faqs = [
    {
      q: 'O CarX funciona no meu celular e no computador?',
      a: 'Sim! O CarX é 100% web e responsivo. O gestor pode utilizar no computador ou tablet, e os técnicos possuem um aplicativo PWA leve desenhado especificamente para smartphones no chão da oficina.',
    },
    {
      q: 'As mensagens de WhatsApp saem do meu próprio número?',
      a: 'Com certeza! O CarX possui arquitetura multi-tenant onde cada oficina conecta seu próprio número de WhatsApp via QR Code. Todas as confirmações de agenda, orçamentos e avisos de carro pronto saem com o nome e o número oficial da sua oficina.',
    },
    {
      q: 'Como funciona o período de testes grátis?',
      a: 'Você tem 14 dias de acesso completo a todos os recursos da plataforma, sem precisar cadastrar cartão de crédito. Se gostar, escolhe o plano que melhor se adapta à sua oficina e continua utilizando sem interrupções.',
    },
    {
      q: 'Meus dados estão seguros e isolados de outros concorrentes?',
      a: 'Absolutamente. O CarX utiliza isolamento estrutural a nível de banco de dados através de PostgreSQL Row Level Security (RLS). Nenhuma outra oficina tem acesso aos seus clientes, veículos, faturamento ou ordens de serviço.',
    },
    {
      q: 'Posso emitir o Passaporte Digital do Veículo para meus clientes?',
      a: 'Sim! Cada veículo atendido na sua oficina ganha uma página pública exclusiva com QR Code comprovando os serviços realizados (como vitrificação, PPF ou revisões), com termo de garantia e histórico oficial.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0E1116] text-[#E2E8F0] selection:bg-[#C8F52E]/30 selection:text-[#C8F52E] font-sans">
      
      {/* 1. NAVBAR INSTITUCIONAL */}
      <header className="sticky top-0 z-50 bg-[#0E1116]/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo CarX */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#C8F52E] flex items-center justify-center font-black text-[#0E1116] text-xl shadow-lg shadow-[#C8F52E]/20 group-hover:scale-105 transition-transform">
              CX
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">CarX</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#C8F52E]/20 text-[#C8F52E] border border-[#C8F52E]/30">
                  SaaS
                </span>
              </div>
              <p className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase">Gestão Automotiva</p>
            </div>
          </Link>

          {/* Links de Navegação */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#recursos" className="hover:text-[#C8F52E] transition-colors">Recursos</a>
            <a href="#segmentos" className="hover:text-[#C8F52E] transition-colors">Segmentos</a>
            <a href="#calculadora" className="hover:text-[#C8F52E] transition-colors">Calculadora ROI</a>
            <a href="#precos" className="hover:text-[#C8F52E] transition-colors">Planos & Preços</a>
            <a href="#faq" className="hover:text-[#C8F52E] transition-colors">FAQ</a>
          </nav>

          {/* CTAs do Header */}
          <div className="flex items-center gap-3">
            <a
              href="/superadm/"
              className="hidden sm:inline-flex text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-2 transition-colors"
            >
              Super Admin
            </a>
            <Link 
              to="/login" 
              className="text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
            >
              Entrar
            </Link>
            <Link 
              to="/onboarding" 
              className="text-xs font-bold bg-[#C8F52E] text-[#0E1116] px-4 py-2.5 rounded-lg shadow-md shadow-[#C8F52E]/15 hover:bg-[#d5fa4b] hover:shadow-lg hover:shadow-[#C8F52E]/25 transition-all flex items-center gap-1.5"
            >
              <span>Testar Grátis</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 border-b border-slate-800/60">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#C8F52E]/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Badge de Destaque */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-[#C8F52E] animate-pulse"></span>
              <span>SaaS Automotivo com WhatsApp e RLS Integrado</span>
            </div>

            {/* Headline Central */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
              Do carro entrando ao carro entregue, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-[#C8F52E]">
                tudo sob controle.
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
              O sistema definitivo para <strong>Estética Automotiva, PPF, Películas Solares e Mecânica</strong>. Orçamentos rápidos, checklist com fotos, TV de pátio em tempo real e passaporte digital com garantia.
            </p>

            {/* Botões de Ação do Hero */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/onboarding" 
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#C8F52E] text-[#0E1116] font-extrabold text-sm shadow-xl shadow-[#C8F52E]/20 hover:bg-[#d6fb4f] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                <span>Iniciar Teste Grátis de 14 Dias</span>
              </Link>
              <a 
                href="#segmentos" 
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Conhecer os Módulos</span>
                <ChevronDown size={16} />
              </a>
            </div>

            {/* Garantias do Trial */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#C8F52E]" />
                <span>Sem necessidade de cartão</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#C8F52E]" />
                <span>Setup pronto em 5 minutos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#C8F52E]" />
                <span>Suporte técnico por WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Mockup do Cockpit Operacional */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-black/80 overflow-hidden relative">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                <span className="text-[11px] font-mono text-slate-500 ml-2">app.carx.com.br/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Pátio Operacional Ativo</span>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-b from-[#11161F] to-[#0E1116]">
              {/* Card 1: Ordens em Execução */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em Execução</span>
                  <span className="text-xs font-black text-[#C8F52E] bg-[#C8F52E]/10 px-2 py-0.5 rounded">3 Veículos</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                    <p className="font-extrabold text-white">Porsche 911 GT3 (ABC-9876)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Aplicação PPF Frontal Completo</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#C8F52E]">
                      <span>Box 1 • Técnico Lucas</span>
                      <span className="font-mono">03h 42m</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                    <p className="font-extrabold text-white">BMW M3 Competition</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Polimento Técnico + Vitrificação</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#C8F52E]">
                      <span>Box 2 • Técnico Matheus</span>
                      <span className="font-mono">01h 15m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Checklist & Garantia */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Qualidade & QA</span>
                  <Award size={16} className="text-[#C8F52E]" />
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 size={16} />
                    <span>Checklist VCR Aprovado</span>
                  </div>
                  <p className="text-[11px] text-slate-400">8 fotos de ângulos obrigatórios arquivadas no S3 com presigned URL.</p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Passaporte Digital:</span>
                    <span className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">#PASS-8849</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Métricas em Tempo Real */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produção do Mês</span>
                  <BarChart3 size={16} className="text-[#C8F52E]" />
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Faturamento Líquido:</span>
                    <span className="font-extrabold text-white text-sm">R$ 54.300,00</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Ordens Concluídas:</span>
                    <span className="font-extrabold text-[#C8F52E]">48 OS</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Satisfação NPS:</span>
                    <span className="font-extrabold text-emerald-400">Score 98 (Zona de Excelência)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROVA SOCIAL & NÚMEROS */}
      <section className="py-12 bg-[#090C10] border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#C8F52E] font-mono">+50.000</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Ordens de Serviço Emitidas</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-mono">99.9%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Disponibilidade Uptime</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#C8F52E] font-mono">-40%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Tempo Gasto com Burocracia</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-mono">100%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Isolamento Multi-Tenant (RLS)</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. O FLUXO DA OFICINA (LINHA DO TEMPO) */}
      <section id="recursos" className="py-20 md:py-28 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
              Ciclo Operacional Completo
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Do primeiro contato ao pós-venda</h2>
            <p className="text-slate-400 text-sm">Elimine papéis, planilhas perdidas e atritos com o cliente final com nossa esteira digital integrada.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[#C8F52E] font-bold">1</div>
              <h3 className="text-base font-extrabold text-white">Orçamento & Aceite Online</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Envie o link do orçamento pelo WhatsApp. O cliente confere os valores por item e aprova online com registro oficial de IP e data.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[#C8F52E] font-bold">2</div>
              <h3 className="text-base font-extrabold text-white">Agendamento & Checklist</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Alocação automática em boxes sem choque de horário. VCR fotográfico completo para blindar sua loja contra riscos anteriores.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[#C8F52E] font-bold">3</div>
              <h3 className="text-base font-extrabold text-white">Execução no PWA do Técnico</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Operador focado no serviço: cronômetro oficial de apontamento de horas com regra de foco único e baixa automática de estoque.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[#C8F52E] font-bold">4</div>
              <h3 className="text-base font-extrabold text-white">Garantia & Pesquisa NPS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Emissão do Passaporte Digital do Veículo com QR Code e pesquisa de satisfação automática disparada pelo WhatsApp após 24 horas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VISÃO POR PAPEL (ABAS INTERATIVAS) */}
      <section className="py-20 md:py-28 bg-[#0B0E13] border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
              Feito para Toda a Equipe
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Cada profissional com a tela certa</h2>
            <p className="text-slate-400 text-sm">Permissões de acesso seguras (RBAC) para garantir que cada um veja exatamente o que precisa para produzir mais.</p>
          </div>

          {/* Seletor de Papel */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {(['dono', 'atendente', 'tecnico', 'cliente'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setActiveRole(r)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  activeRole === r 
                    ? 'bg-[#C8F52E] text-[#0E1116] shadow-md shadow-[#C8F52E]/20' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {r === 'dono' && 'Dono / Gestor'}
                {r === 'atendente' && 'Atendimento'}
                {r === 'tecnico' && 'Técnico (PWA)'}
                {r === 'cliente' && 'Cliente Final'}
              </button>
            ))}
          </div>

          {/* Conteúdo do Papel Ativo */}
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <h3 className="text-2xl font-black text-white">{rolesData[activeRole].title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{rolesData[activeRole].desc}</p>
              
              <div className="pt-2 space-y-2">
                {rolesData[activeRole].metrics.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <CheckCircle2 size={16} className="text-[#C8F52E]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-80 h-48 rounded-xl bg-slate-950 border border-slate-800/80 p-5 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>Modo Especializado</span>
                <span className="text-[#C8F52E]">Ativo</span>
              </div>
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center mx-auto mb-2">
                  {activeRole === 'dono' && <BarChart3 size={24} />}
                  {activeRole === 'atendente' && <CalendarCheck size={24} />}
                  {activeRole === 'tecnico' && <Smartphone size={24} />}
                  {activeRole === 'cliente' && <Car size={24} />}
                </div>
                <p className="text-xs font-extrabold text-white uppercase">{activeRole}</p>
              </div>
              <div className="text-[10px] text-slate-500 text-center font-mono">RLS Tenant Isolado</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DIFERENCIAIS COMPETITIVOS CARX */}
      <section className="py-20 md:py-28 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
              Diferenciais Reais
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Recursos que outras ferramentas não têm</h2>
            <p className="text-slate-400 text-sm">Desenvolvido sob medida para a dinâmica de oficinas de alta performance e centros automotivos premium.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-7 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center">
                <Tv size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-white">Monitor TV 360° da Oficina</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Coloque na TV da recepção ou pátio: status ao vivo dos carros, tempo restante de cada box e vídeos promocionais da sua oficina em rotação contínua.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-white">Controle de Bobinas (PPF & Películas)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rastreabilidade de metros usados por carro, controle de sobras aproveitáveis e vínculo do lote ao certificado de garantia, calculando a margem real.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center">
                <PhoneCall size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-white">WhatsApp Transacional Próprio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mensagens transacionais enviadas diretamente pelo número da sua oficina via QR Code pareado, gerando confiança absoluta com o cliente.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center">
                <Award size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-white">Passaporte Digital com QR Code</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Certificado de garantia e histórico técnico inviolável que seu cliente pode exibir na revenda do carro, agregando valor tangível ao seu serviço.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center">
                <FileCheck2 size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-white">Laudo VCR com Mídia em Alta Resolução</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Checklist visual de avarias com marcação de riscos, amassados e fotos de 8 ângulos pré-definidos salvas em storage S3 seguro.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#C8F52E]/10 text-[#C8F52E] flex items-center justify-center">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-white">Cronômetro de Foco Único</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O técnico aponta horas reais gastas em cada OS com 1 toque no PWA. Se iniciar outra tarefa, a anterior é pausada automaticamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SEGMENTOS ESPECIALIZADOS */}
      <section id="segmentos" className="py-20 md:py-28 bg-[#0A0D12] border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
              Segmentos Automotivos
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Feito sob medida para o seu nicho</h2>
            <p className="text-slate-400 text-sm">Selecione seu segmento abaixo e confira as funcionalidades exclusivas para sua operação.</p>
          </div>

          {/* Abas dos Segmentos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mb-12">
            {(['ppf', 'insulfilm', 'estetica', 'mecanica'] as const).map((seg) => (
              <button
                key={seg}
                onClick={() => setActiveSegment(seg)}
                className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                  activeSegment === seg
                    ? 'bg-[#C8F52E] text-[#0E1116] border-[#C8F52E] shadow-md shadow-[#C8F52E]/15'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {seg === 'ppf' && 'PPF Proteção'}
                {seg === 'insulfilm' && 'Películas Solares'}
                {seg === 'estetica' && 'Estética / Detailing'}
                {seg === 'mecanica' && 'Mecânica & Reparos'}
              </button>
            ))}
          </div>

          {/* Card Detalhado do Segmento Ativo */}
          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <span className="text-xs font-bold text-[#C8F52E] uppercase tracking-wider bg-[#C8F52E]/10 px-2.5 py-1 rounded">
                  {segmentsData[activeSegment].badge}
                </span>
                <h3 className="text-2xl font-black text-white mt-2">{segmentsData[activeSegment].title}</h3>
              </div>
              <a
                href="#formulario"
                onClick={() => setFormData(prev => ({ ...prev, segment: segmentsData[activeSegment].title }))}
                className="text-xs font-extrabold bg-[#C8F52E] text-[#0E1116] px-4 py-2.5 rounded-lg hover:bg-[#d5fa4b] transition-colors self-start sm:self-auto"
              >
                Testar Grátis para este Segmento
              </a>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{segmentsData[activeSegment].desc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {segmentsData[activeSegment].bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 size={16} className="text-[#C8F52E] shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALCULADORA INTERATIVA DE ROI */}
      <section id="calculadora" className="py-20 md:py-28 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
              Simulador Financeiro
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Quanto o CarX gera de economia para você?</h2>
            <p className="text-slate-400 text-sm">Ajuste o volume mensal da sua oficina e veja o impacto financeiro direto da digitalização dos seus processos.</p>
          </div>

          <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            
            {/* Controles da Calculadora */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Ordens de Serviço por Mês</span>
                  <span className="text-[#C8F52E] font-mono text-sm">{osCount} OS</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="300" 
                  step="5"
                  value={osCount} 
                  onChange={(e) => setOsCount(Number(e.target.value))}
                  className="w-full accent-[#C8F52E] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Ticket Médio por Serviço (R$)</span>
                  <span className="text-[#C8F52E] font-mono text-sm">R$ {avgTicket.toLocaleString('pt-BR')}</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="2500" 
                  step="50"
                  value={avgTicket} 
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full accent-[#C8F52E] cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400">
                <p>💡 Estimativa com base na média comprovada de redução de tempo de atendimento, eliminação de perdas em peças/bobinas e aumento de conversão de orçamentos.</p>
              </div>
            </div>

            {/* Resultado do Retorno */}
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-6 text-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recuperação Estimada / Mês</p>
                <p className="text-4xl font-black text-[#C8F52E] font-mono mt-1">
                  R$ {wasteRecovered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                <div>
                  <p className="text-xl font-bold text-white font-mono">{hoursSavedMonth}h</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Horas de Equipe Poupadas</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white font-mono">+18%</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Mais Orçamentos Aprovados</p>
                </div>
              </div>

              <a 
                href="#formulario" 
                className="block w-full py-3 rounded-lg bg-[#C8F52E] text-[#0E1116] font-extrabold text-xs uppercase tracking-wider shadow-md hover:bg-[#d5fa4b] transition-colors"
              >
                Quero essa Economia na Minha Oficina
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PLANOS E PREÇOS */}
      <section id="precos" className="py-20 md:py-28 bg-[#090C10] border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
              Planos Transparentes
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Sem taxas ocultas, cancele quando quiser</h2>
            <p className="text-slate-400 text-sm">Escolha o plano ideal para a fase da sua oficina. Todos com 14 dias de teste grátis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Plano Essencial */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Essencial</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white font-mono">R$ 69,90</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <p className="text-xs text-slate-400">Ideal para oficinas menores, aplicadores autônomos e estúdios em início de operação.</p>
                
                <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>1 Usuário (Gestor)</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>1 GB de Fotos (Storage S3)</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Orçamentos e OS ilimitadas</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Passaporte Digital com QR</span></div>
                </div>
              </div>

              <Link 
                to="/onboarding?plano=essencial" 
                className="block text-center py-3 rounded-lg border border-slate-700 hover:border-[#C8F52E] text-white hover:text-[#C8F52E] font-bold text-xs transition-colors"
              >
                Testar Essencial Grátis
              </Link>
            </div>

            {/* Plano Profissional (Destaque) */}
            <div className="p-8 rounded-2xl bg-slate-900 border-2 border-[#C8F52E] space-y-6 flex flex-col justify-between relative shadow-xl shadow-[#C8F52E]/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C8F52E] text-[#0E1116] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                Mais Escolhido
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold text-[#C8F52E] uppercase tracking-widest">Profissional</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white font-mono">R$ 149,90</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <p className="text-xs text-slate-400">A esteira completa para oficinas e centros de estética em crescimento acelerado.</p>
                
                <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Até 5 Usuários e Técnicos</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>5 GB de Fotos e Laudos</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Controle Financeiro & DRE</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>PWA do Técnico com Cronômetro</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Gestão de Bobinas de PPF</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Checklist Fotográfico VCR</span></div>
                </div>
              </div>

              <Link 
                to="/onboarding?plano=profissional" 
                className="block text-center py-3.5 rounded-lg bg-[#C8F52E] text-[#0E1116] font-extrabold text-xs uppercase tracking-wider hover:bg-[#d5fa4b] transition-colors shadow-md"
              >
                Iniciar Teste de 14 Dias
              </Link>
            </div>

            {/* Plano Premium */}
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Premium</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white font-mono">R$ 299,90</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <p className="text-xs text-slate-400">Para grandes operações, matriz e filiais que demandam máxima automação e limites expandidos.</p>
                
                <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Usuários Ilimitados</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>20 GB de Storage em Nuvem</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Monitor TV 360° em Tempo Real</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>Multi-unidades / Filiais</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-[#C8F52E]" /><span>API Pública REST e Webhooks</span></div>
                </div>
              </div>

              <Link 
                to="/onboarding?plano=premium" 
                className="block text-center py-3 rounded-lg border border-slate-700 hover:border-[#C8F52E] text-white hover:text-[#C8F52E] font-bold text-xs transition-colors"
              >
                Testar Premium Grátis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ ACCORDION */}
      <section id="faq" className="py-20 md:py-28 border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-3">
            <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Perguntas Frequentes</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white hover:text-[#C8F52E] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown 
                    size={18} 
                    className={`transition-transform duration-200 text-slate-400 ${openFaq === idx ? 'rotate-180 text-[#C8F52E]' : ''}`} 
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FORMULÁRIO DE CAPTURA DE LEADS (CTA FINAL) */}
      <section id="formulario" className="py-20 md:py-28 bg-[#090C10] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#C8F52E]/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-xl mx-auto text-center space-y-3 mb-10">
              <span className="text-xs font-extrabold text-[#C8F52E] uppercase tracking-widest bg-[#C8F52E]/10 px-3 py-1 rounded-full">
                Comece Agora Mesmo
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Pronto para transformar sua oficina?</h2>
              <p className="text-slate-400 text-xs sm:text-sm">Preencha seus dados abaixo para iniciar seu período gratuito de 14 dias sem compromisso.</p>
            </div>

            {leadSuccess ? (
              <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-xl font-black text-white">Solicitação Recebida com Sucesso!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Seu interesse foi registrado no sistema. Nossa equipe técnica entrará em contato via WhatsApp para liberar sua instância e acompanhar seu teste gratuito.
                </p>
                <button
                  onClick={() => setLeadSuccess(false)}
                  className="px-6 py-2.5 rounded-lg bg-emerald-500 text-[#0E1116] font-bold text-xs uppercase"
                >
                  Enviar Outro Cadastro
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4 max-w-xl mx-auto">
                
                {/* Campo Invisível Anti-Bot (Honeypot) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website (deixe em branco)</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Seu Nome *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Carlos Oliveira"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#C8F52E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">E-mail Profissional *</label>
                    <input 
                      type="email"
                      required
                      placeholder="carlos@suaoficina.com.br"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#C8F52E] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">WhatsApp / Celular *</label>
                    <input 
                      type="tel"
                      required
                      placeholder="(11) 98888-7777"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#C8F52E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Nome da Oficina / Estúdio</label>
                    <input 
                      type="text"
                      placeholder="Ex: Studio Prime Detailing"
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#C8F52E] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Segmento de Atuação</label>
                    <select
                      value={formData.segment}
                      onChange={(e) => setFormData(prev => ({ ...prev, segment: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#C8F52E] transition-colors"
                    >
                      <option value="Estética Automotiva & Detailing">Estética Automotiva & Detailing</option>
                      <option value="PPF (Paint Protection Film)">PPF (Paint Protection Film)</option>
                      <option value="Películas Solares & Insulfilm">Películas Solares & Insulfilm</option>
                      <option value="Mecânica Geral & Funilaria">Mecânica Geral & Funilaria</option>
                      <option value="Centro Automotivo Multisserviço">Centro Automotivo Multisserviço</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Tamanho da Equipe</label>
                    <select
                      value={formData.employees_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, employees_count: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#C8F52E] transition-colors"
                    >
                      <option value="1 a 3 colaboradores">1 a 3 colaboradores</option>
                      <option value="4 a 8 colaboradores">4 a 8 colaboradores</option>
                      <option value="9 a 15 colaboradores">9 a 15 colaboradores</option>
                      <option value="Mais de 15 colaboradores">Mais de 15 colaboradores</option>
                    </select>
                  </div>
                </div>

                {leadError && (
                  <p className="text-xs text-rose-400 font-bold bg-rose-950/40 p-3 rounded-lg border border-rose-800">
                    {leadError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={leadLoading}
                  className="w-full py-4 rounded-xl bg-[#C8F52E] text-[#0E1116] font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-[#C8F52E]/20 hover:bg-[#d5fa4b] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {leadLoading ? (
                    <span>Registrando solicitação...</span>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Liberar Meu Teste Grátis de 14 Dias</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center pt-2">
                  Ao enviar, você concorda com nossos <Link to="/termos" className="underline hover:text-white">Termos de Uso</Link> e <Link to="/privacidade" className="underline hover:text-white">Política de Privacidade</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 12. BANNER DE COOKIES LGPD */}
      {!cookieConsent && (
        <aside 
          aria-label="Consentimento de Cookies e Privacidade"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-5 rounded-2xl shadow-2xl z-50 flex flex-col gap-3 text-xs"
        >
          <div className="flex items-start gap-2.5">
            <Lock size={18} className="text-[#C8F52E] shrink-0 mt-0.5" />
            <p className="text-slate-300 leading-relaxed">
              Utilizamos cookies e tecnologias essenciais para garantir o funcionamento seguro do sistema e medição de desempenho em conformidade com a <strong>LGPD</strong>.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Link to="/privacidade" className="text-slate-400 hover:text-white underline text-[11px]">
              Ver Política
            </Link>
            <button
              onClick={handleCookieAccept}
              className="px-4 py-1.5 rounded-lg bg-[#C8F52E] text-[#0E1116] font-bold text-xs uppercase hover:bg-[#d5fa4b] transition-colors"
            >
              Concordar e Fechar
            </button>
          </div>
        </aside>
      )}

      {/* 13. RODAPÉ INSTITUCIONAL */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C8F52E] flex items-center justify-center font-black text-[#0E1116] text-base">
              CX
            </div>
            <div>
              <p className="text-white font-extrabold text-sm">CarX SaaS Automotivo</p>
              <p className="text-[10px] text-slate-400">© 2026 CarX Tecnologia. Todos os direitos reservados.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <Link to="/" className="hover:text-white transition-colors">Início</Link>
            <Link to="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-white transition-colors">Privacidade & LGPD</Link>
            <Link to="/login" className="hover:text-white transition-colors">Acessar Painel</Link>
            <a href="/superadm/" className="hover:text-white transition-colors">Super Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

