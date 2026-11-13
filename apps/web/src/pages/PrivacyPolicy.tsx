import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
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
            <Lock size={16} />
            <span>Privacidade & LGPD</span>
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white">Política de Privacidade & Proteção de Dados (LGPD)</h1>
          <p className="text-xs text-slate-400">Em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados)</p>
        </div>

        {/* Conteúdo */}
        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 space-y-6 leading-relaxed bg-slate-900/60 p-8 rounded-2xl border border-slate-800">
          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">1. Princípios de Proteção de Dados</h2>
            <p>
              O <strong>CarX</strong> preza pela segurança, confidencialidade e privacidade dos dados dos seus clientes e dos proprietários de veículos cadastrados pelas oficinas usuárias. Adotamos o princípio de minimização de dados, coletando apenas informações necessárias para a execução das ordens de serviço e cumprimento de obrigações fiscais e legais.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">2. Papéis na LGPD: Controlador e Operador</h2>
            <p>
              A oficina mecânica ou centro de estética contratante atua como <strong>Controladora</strong> dos dados pessoais dos seus clientes finais (nome, telefone, placa e histórico do veículo). O CarX atua como <strong>Operador</strong>, processando tais dados unicamente para prestar os serviços contratados e sob instruções legítimas da Controladora.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">3. Segurança, Criptografia e Armazenamento</h2>
            <p>
              Todas as senhas de acesso são criptografadas com algoritmos robustos de hash (bcrypt). A comunicação entre os navegadores e nossa API é realizada exclusivamente por túneis seguros TLS/HTTPS. As fotos de laudos e checklists são armazenadas em buckets de nuvem (S3) com URLs assinadas e de tempo limitado (presigned URLs).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">4. Direitos dos Titulares</h2>
            <p>
              Nos termos do artigo 18 da LGPD, os titulares dos dados têm direito à confirmação da existência de tratamento, acesso, correção de dados incompletos ou inexatos, anonimização ou eliminação de dados desnecessários, mediante solicitação formal ao Encarregado de Proteção de Dados (DPO).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-white">5. Contato do Encarregado (DPO)</h2>
            <p>
              Para esclarecimentos ou exercício dos seus direitos em relação à privacidade e proteção de dados, entre em contato através do e-mail: <strong>privacidade@carx.com.br</strong>.
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

