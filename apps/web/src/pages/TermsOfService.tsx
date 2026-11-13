import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0E1116] text-[#E2E8F0] selection:bg-[#C8F52E]/30 selection:text-[#C8F52E] font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Topo / Voltar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link 
            to="/landing" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#C8F52E] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Voltar para a Página Inicial</span>
          </Link>
          <div className="flex items-center gap-2 text-[#C8F52E] text-xs font-black uppercase">
            <FileText size={16} />
            <span>Termos de Uso</span>
          </div>
        </div>

        {/* Cabeçalho do Documento */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white">Termos de Uso da Plataforma CarX</h1>
          <p className="text-xs text-slate-400">Última atualização: 10 de Novembro de 2026</p>
        </div>

        {/* Conteúdo dos Termos */}
        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 space-y-6 leading-relaxed bg-slate-900/60 p-8 rounded-2xl border border-slate-800">
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">1. Objeto e Definições</h2>
            <p>
              O <strong>CarX</strong> é uma plataforma SaaS (Software as a Service) voltada à gestão operacional, financeira e de atendimento para oficinas mecânicas, centros de estética automotiva, instaladores de PPF e películas solares. Ao acessar ou contratar a plataforma, você concorda integralmente com estes Termos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">2. Propriedade dos Dados e Isolamento Multi-Tenant</h2>
            <p>
              Os dados inseridos na plataforma pertencem exclusivamente à oficina cliente (Inquilino/Tenant). O CarX garante isolamento lógico e de banco de dados por meio de políticas de Row Level Security (RLS) no PostgreSQL, assegurando que nenhuma outra empresa tenha visibilidade ou acesso às suas informações operacionais.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">3. Responsabilidade pelo Uso do WhatsApp</h2>
            <p>
              A conexão e pareamento de números de WhatsApp são de titularidade e responsabilidade exclusiva da oficina cliente. O CarX fornece a tecnologia de mensageria transacional, cabendo ao usuário zelar pelas boas práticas de comunicação e respeitar as políticas da plataforma Meta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">4. Período de Testes e Cancelamento</h2>
            <p>
              O período de testes gratuitos tem duração de 14 (quatorze) dias corridos. Após esse período, caso não haja a contratação de um plano comercial, o acesso será temporariamente suspenso, preservando-se os dados cadastrados pelo período de retenção legal antes de eventual expurgo definitivo.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">5. Disponibilidade e Suporte</h2>
            <p>
              Empregamos esforços comercialmente razoáveis para manter a plataforma disponível 24 horas por dia, 7 dias por semana, com meta de 99.9% de uptime, ressalvadas manutenções programadas comunicadas previamente.
            </p>
          </section>
        </div>

        {/* Rodapé */}
        <div className="text-center text-xs text-slate-500 pt-6">
          © 2026 CarX Tecnologia. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}

