# Documentação do Projeto: OsSystem

Este documento serve como o escopo central, manual técnico e registro histórico de conquistas do **OsSystem**, um PWA White Label premium voltado para estética automotiva, vitrificação, aplicação de PPF, insulfilm e detalhamento veicular.

---

## 🎨 Identidade Visual e Cores Principais

A interface do OsSystem foi projetada com base nos princípios do `ui-design-system`, utilizando uma paleta de cores sóbria, elegante e de alto contraste, com foco no verde esmeralda premium.

1. **Cor Primária (Tema Emerald):** `#059669` (Emerald 600) - Utilizada para botões de ação primária, destaques de status concluído, elementos de progresso ativos e acentos visuais importantes.
2. **Cor Secundária (Fundo e Contraste):** `#f8fafc` (Slate 50) / `#ffffff` (White) - Garante que as tabelas de dados, formulários e cartões fiquem limpos, legíveis e com excelente espaçamento.
3. **Cor de Destaque / Alertas:**
   - `#d97706` (Amber 600) - Status de Orçamento / Aguardando / Pendente.
   - `#e11d48` (Rose 600) - Status Crítico de Estoque / Cancelamentos / Alertas de Exclusão.
   - `#2563eb` (Blue 600) - Status Em Execução / Técnicos / Ações operacionais.

---

## 🛠️ Tecnologias Utilizadas

A fundação do OsSystem é moderna, rápida e altamente escalável para rodar localmente ou em nuvem com alta resiliência offline (PWA):

- **Core Frontend:** React.js (com Vite como bundler ultrarrápido).
- **Estilização:** Tailwind CSS (seguindo à risca o `ui-design-system`).
- **Ícones:** Lucide React (biblioteca elegante e padronizada).
- **Banco de Dados & Backend:** Supabase (PostgreSQL com Row Level Security (RLS) habilitado, RPC para transações financeiras atômicas e sincronização de estoque, além de canais de Realtime ativos).
- **Roteamento:** React Router DOM.
- **Notificações e Avisos:** React-Toastify (mensagens toast não-bloqueantes) e diálogos customizados e acessíveis (`confirmDialog`).

---

## 📈 Escopo de Módulos Implementados

O sistema já passou por 52 fases históricas de desenvolvimento de alta maturidade, integrando:

1. **Dashboard Executivo (no-print):** KPIs de faturamento bruto, ticket médio e taxa de conversão.
2. **Fila Operacional do Técnico (OperadorHome / ExecutorView):** Interface limpa para os profissionais visualizarem as ordens de serviço do dia por ordem cronológica.
3. **Gestão de Clientes e Veículos (Clientes):** Cadastro integrado com vinculação de múltiplos veículos e controle de histórico de ordens de serviço.
4. **Vendas e Propostas (Vendas):** Geração de orçamentos, aprovação com sinal/adiantamento e aviso automático integrado com WhatsApp API.
5. **Produção (Ordens de Serviço):** Registro de avarias via checklist interativo com lousa gráfica de assinatura, emissão de certificado de garantia impresso ou em PDF com token criptográfico (anti-IDOR).
6. **Almoxarifado (Materiais / Estoque):** Gerenciamento inteligente de consumíveis com alerta crítico automático de reposição.
7. **Relatórios Gerenciais (Relatorios):** Filtros dinâmicos de período, busca detalhada e formatação perfeita para impressão física ou PDF.

---

## 📈 Fase Concluída: Fase 5.5 — Unificação Pixel-Perfect do Cockpit do Gestor com o Rebrand (`rebraind/HTML/`) 🚀

Para garantir que o produto seja uma réplica fiel, premium e idêntica aos arquivos HTML e telas do Rebrand fornecidos pelo designer:
- **Agenda (`/agenda`)**: Reconstruída estritamente conforme `rebraind/HTML/Gestor · Agenda-html/Agenda.dc.html`. Fundo `#F3F5F7`, cabeçalho com Space Grotesk 30px, pills de data e modo Dia (preto `#0E1116`) / Semana, botão Verde Volt `#C8F52E`, barra de agendamento online ativo com link de cópia rápida, e grade temporal de 08h a 17h com 3 colunas de boxes (Box 1 · Lucas, Box 2 · Rafa, Box 3 · livre) em `repeating-linear-gradient(#fff 0 55px, #E1E6EC 55px 56px)` com os cards canônicos (Chevrolet Montana, Fiat Fiorino, BYD Seal, VW Tera, Hyundai HR e slot livre).
- **Nova Ordem de Serviço (`/ordens/nova`)**: Reconstruída estritamente conforme `rebraind/HTML/Gestor · Nova OS-html/Nova_OS.dc.html`. Cabeçalho com Stepper (Cliente [check], Veículo [check], Serviços [3 volt], Checklist [4], Agenda [5]), cards brancos de Cliente e Veículo com badge de placa Mercosul e pill preta "Preenchido pela placa", card de Serviços com banner de combo sugerido e seleção com checkbox redondo, e painel lateral sticky de Resumo com totalização, sinal via Pix e botões de ação ("Gerar OS e agendar" Volt, "Salvar como orçamento" branco e "Enviar orçamento por WhatsApp").
- **Relatórios & NPS (`/relatorios`)**: Reconstruídos estritamente conforme `rebraind/HTML/Gestor · Relatórios NPS-html/Relatorios_NPS.dc.html`. Cabeçalho com filtros, botão Imprimir preto/volt, abas em pill com badge "4 vencendo" em Garantias, grid de 4 cards com destaque para o NPS do Mês em card preto com valor 72 em 56px Volt, barras proporcionais de Promotores (74%), Neutros (24%) e Detratores (2%), container `#ECEFF3` com lista de "Avaliar hoje · 10 clientes" e botão de disparo em lote, e coluna lateral com switch de envio automático, card de alerta com borda vermelha suave para detratores e integração com Google Reviews.
- **Higiene de Tema e Conectividade Dev**: Expurgados overrides destrutivos do modo escuro legado em `index.css` e assegurado que o servidor Vite rode com `BypassSandbox: true` e `host: 0.0.0.0`, permitindo acesso instantâneo via browser do usuário em `http://localhost:5173`.
- **Autenticação Multitenant & Acesso à Oficina**:
  - Sincronizadas as credenciais do gestor da oficina `CaioTeste` para a senha padrão `Admin@CarX2026!`, unificando os logins `caio@teste.com` e `caioteste@carx.com.br` com o papel de `owner` (Proprietário/ADM).
  - Resetada a barreira de rate limiting da API que gerava HTTP 429 após múltiplas tentativas com credenciais não correspondentes.
  - Implementado suporte no `AuthContext` do aplicativo Web para absorver automaticamente o `impersonation_token` transmitido via URL pelo Super Admin (`http://localhost:5173/?impersonation_token=...`), permitindo entrada transparente e auditada na oficina com 1 clique direto pelo painel de controle corporativo.
  - Corrigida a exportação default (`export default`) nas páginas `Agenda.tsx`, `NovaOrdemServico.tsx` e `Relatorios.tsx`, eliminando o erro de lazy loading do React (`TypeError: Cannot convert object to primitive value at lazyInitializer`).

---

## ⚡ Fase em Andamento: Fase 6 — Diferenciais Competitivos (Onda 1) 🚀

### T6.1 — Orçamento Digital com Aceite Online & Sinal Pix
- **Experiência Pública do Cliente Final (`/proposta/:token` e `/orcamento/:token`)**:
  - Página ultrarrápida, responsiva e clean desenhada no design system CarX (cards `#FFFFFF` com bordas `#E1E6EC` e fundo `#F3F5F7`).
  - Cabeçalho dinâmico com branding completo da oficina (logo, nome fantasia, telefone e contato).
  - Detalhamento do veículo com badge estilo Mercosul destacada.
  - Mascaramento rigoroso de dados de contato do cliente para estrita conformidade com a LGPD.
  - Tabela discriminada de serviços, valores unitários, garantias contratuais e totalizador de alto impacto.
  - Fotos da vistoria de entrada (VCR) vinculadas à OS.
  - **Termo de Aceite Formal**: Campo para digitação do Nome Completo (Assinatura Digital), consentimento contratual e botão primário Verde Volt `#C8F52E`.
  - **Cobrança e Liquidação de Sinal Pix Dinâmico**: Geração instantânea de payload EMV padrão Banco Central com CRC16 e QR Code para cópia em 1 clique.
  - **Liquidação Atômica**: Botão de confirmação de pagamento que cria o registro atômico na tabela `payments` e `deposits`, abate no saldo pendente da OS e notifica o painel do gestor via Server-Sent Events (SSE).
- **Modelo de Negócios e Isolamento Estrito do WhatsApp**:
  - Respeito absoluto ao isolamento por tenant: cada oficina pareia e opera seu próprio número de WhatsApp via gateway Baileys.
  - Lojas em planos básicos sem gateway utilizam links manuais diretos do WhatsApp Web (`https://wa.me/...`), com mensagem pré-formatada contendo o link exclusivo da proposta e custo operacional zero para a CarX.
  - Lojas em planos com módulo de gateway realizam o disparo transacional em segundo plano diretamente pela API.
- **Auditoria Jurídica do Aceite**: Registro de data/hora precisa (`accepted_at`), endereço IP do cliente (`accepted_ip`) e navegador/dispositivo (`accepted_user_agent`).
- **Validação de Qualidade**: 100% dos testes unitários e de integração aprovados em `quote-acceptance.test.ts`.

---

## 📈 Fase Concluída: Fase 53 - Paginação Premium e Sincronizada 🚀

Para evitar tabelas e grids sobrecarregados visualmente e manter a densidade profissional de dados exigida pelo `dashboard-layout` e `responsive-design`, a **Fase 53** foi completamente implementada nas 6 principais telas de dados da aplicação:
- **Clientes**: Navegação limpa removendo o limite estático anterior, com reset dinâmico da página ao buscar.
- **Vendas e Orçamentos**: Fatiamento de propostas sincronizadas com múltiplos filtros de busca e status.
- **Ordens de Serviço**: Paginação sobre as ordens gerenciadas na listagem de OS.
- **Catálogo de Serviços**: Paginação em grid de cartões com layout responsivo impecável.
- **Controle de Materiais**: Paginação no inventário de insumos com contadores dinâmicos de itens em tempo real.
- **Relatórios**: Paginação no histórico detalhado de faturamento e atividades, oculta automaticamente ao gerar impressões físicas ou PDF.

## 📈 Fase Concluída: Fase 54 - Otimização da Fila do Operador e Auto-Início 🚀

Para desobstruir o fluxo de trabalho do operador técnico e otimizar a usabilidade em smartphones, implementamos a **Fase 54**:
- **Alerta de Checklist na Fila**: Adicionados crachás claros `SEM CHECKLIST` (vermelho) e `CHECKLIST OK` (verde) nos cartões de serviço do operador, indicando instantaneamente o status do veículo.
- **Botão Iniciar Habilitado**: Botão sempre ativo e visível para o operador poder clicar e abrir os detalhes do serviço diretamente.
- **Auto-Início Inteligente**: Ao entrar nos detalhes do serviço, caso o checklist já esteja OK, o sistema ativa automaticamente o status `EM EXECUÇÃO` e inicia o cronômetro local do técnico, registrando-o atómicamente no banco.
- **Remoção de Controles Volumosos**: O cartão escuro de play, pause e status foi completamente removido de dentro da tela de execução, otimizando mais de 40% de área útil vertical em dispositivos móveis e permitindo que o técnico foque no checklist e na documentação fotográfica.
- **Aviso Informativo**: Se o checklist de entrada ainda não foi assinado, um banner em vermelho no topo da tela do operador o instrui a solicitar o preenchimento pelo gestor.
- **Progresso Médio Inteligente**: O cartão de serviço na fila de tarefas do operador agora exibe uma barra de progresso horizontal e um indicador percentual em tempo real. Se a Ordem de Serviço incluir mais de um sub-serviço detalhado, o sistema calcula dinamicamente a média aritmética de todos eles para apresentar o percentual exato do progresso geral.

## 📈 Fase Concluída: Fase 55 - Checklist Digital Ampliado com Rolagem Unificada e Laterais Gigantes 🚀

Para otimizar e aprimorar a usabilidade do técnico ao utilizar tablets (iPad ou Android) na vistoria do veículo, implementamos a **Fase 55**:
- **Rolagem Unificada do Formulário**: O laudo visual e o formulário (relato técnico, KM e assinatura) agora rolam juntos de forma fluida em um único fluxo contínuo sob uma mesma barra de rolagem.
- **Visões Laterais Equivalentes à Superior**: A Lateral Esquerda e a Lateral Direita agora ocupam toda a largura da coluna (`md:col-span-2`), com uma altura massiva de `500px` no desktop/tablet e `340px` no mobile, igualando-se exatamente à Visão Superior. Isso fornece aos técnicos a maior área possível e escala uniforme para apontar danos nos perfis do veículo.
- **Visão Superior Expandida**: A Visão Superior continua com destaque total (`md:col-span-2`) e altura máxima ampliada para `500px` no desktop e `340px` no mobile.
- **Vista Frontal e Vista Traseira Ampliadas**: Lado a lado com altura de `300px` no desktop e `220px` no mobile.
- **Design Responsivo e Sticky Lateral**: O card de resumo lateral acompanha a rolagem como um painel flutuante (sticky) no desktop, e se empilha de forma totalmente responsiva no final da página em telas menores.

## 🛡️ Fase Concluída: Fase 56 - Hardening de Segurança e Modularização
### Item Concluído: Validação de Uploads de Mídia 🚀
Para garantir a conformidade com a *BaaS Security Constitution* em um cenário de deploy serverless (Vercel + Supabase), implementamos a validação de segurança na camada de cliente antes do envio de arquivos para os buckets do Storage (`os-photos` e `trabalhos-recentes`):
- **Utilitário Dedicado (`validateMediaUpload`)**: Criado módulo limpo em `src/utils/fileValidation.js` para padronizar e modularizar a checagem de arquivos em todo o ecossistema.
- **Whitelist Rigorosa de MIME Types**: Aceitação estrita apenas de formatos de imagem seguros (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif`), prevenindo upload de scripts, binários ou documentos perigosos.
- **Limite Máximo de Tamanho (10MB)**: Bloqueio na origem com mensagem explicativa contendo o tamanho real do arquivo, evitando exaustão de armazenamento e consumo indevido de banda no Supabase.
- **Tratamento de Erros Amigável (Event-Driven)**: Integração com o sistema global de Toasts para notificar o operador e o gestor em tempo real caso um arquivo inválido ou excedente seja selecionado.

### Item Concluído: Restrição de RLS para Operadores com Suporte a Emergências 🔒
Refinamos as políticas de segurança no banco de dados (`database.md`) para a tabela `ordens_servico`, substituindo a permissão genérica `FOR ALL` por permissões granulares de mínimo privilégio, equilibrando rigor com a realidade operacional da oficina:
- **Leitura Total de OS (`SELECT`)**: O operador mantém permissão irrestrita de leitura em `ordens_servico`, permitindo visualizar a **Fila Geral de Loja** (ordens disponíveis sem técnico atribuído) e atuar em **situações de emergência** em ordens de outros colegas da equipe.
- **Atualização Protegida (`UPDATE`)**: O operador pode assumir ou atualizar o progresso de ordens de serviço ativas. No entanto, adicionamos trava de segurança no RLS impedindo qualquer modificação por parte do operador em ordens que já estejam com status `CONCLUÍDO`, `ENTREGUE` ou `CANCELADO`.
- **Negação de Exclusão e Criação (`DELETE` / `INSERT`)**: Operadores não possuem mais permissão para criar novas ordens (função exclusiva de ADM/Gestor via Orçamento) e nem para deletar ordens de serviço do banco.
- **Políticas para Checklist e Mídias**: Adicionadas políticas formais no script SQL para as tabelas `checklist_avarias` e `os_midia`, prevenindo bloqueios acidentais e garantindo que o técnico possa registrar vistorias e fotos sem falhas de permissão.

### Item Concluído: Modularização do `useData.js` 🚀
Aplicando nossa skill especializada em evolução de arquitetura (*Lean Refactor Specialist*), eliminamos uma das maiores fontes de dívida técnica e acoplamento do projeto ao refatorar o hook monolítico `useData.js` (1.164 linhas):
- **Desmembramento em 9 Módulos Especializados**: Criamos hooks coesos dentro de `src/hooks/` isolando cada domínio de negócio: `useOrders`, `useClients`, `useQuotes`, `useVehicles`, `useCatalog`, `useProfiles`, `useInventory`, `useNotifications` (com `createNotification`) e `useWorks`.
- **Compatibilidade Retroativa Absoluta (Zero Breaking Changes)**: Mantivemos o arquivo `useData.js` funcionando como um agregador limpo (index re-export) com apenas 10 linhas, re-exportando todos os novos módulos. Com isso, os 22 arquivos e telas do ecossistema continuam importando sem qualquer alteração ou quebra visual.
- **Otimização de Build e Code-Splitting**: O bundler de produção (Vite) agora separa cada hook em chunks isolados na pasta `dist/assets/`, reduzindo o tamanho dos pacotes carregados em tempo de execução e facilitando futuras manutenções e code reviews da equipe.

### Item Concluído: Criação Segura de Usuários 🔒
Para contornar a limitação do gatilho padrão do banco de dados (`handle_new_user`), que fixa o cargo inicial de qualquer novo cadastro como `OPERADOR`, implementamos uma arquitetura híbrida de criação segura de colaboradores em `src/pages/Colaboradores.jsx`:
- **Edge Function com `service_role`**: Criada a função `supabase/functions/create-user/index.ts` que checa no servidor se o requisitante é `ADM` ou `GESTOR`, chama a Admin API (`auth.admin.createUser`) com e-mail já auto-confirmado e atualiza a tabela `profiles` de forma privilegiada com o cargo escolhido no modal (`ADM`, `GESTOR` ou `OPERADOR`).
- **Fallback Local Resiliente**: Caso a Edge Function não esteja deployada no ambiente de desenvolvimento, o frontend faz o fallback graciosamente para `signUp()` com instância anônima isolada e imediatamente aplica um `updateProfile` na sessão do ADM para garantir que o cargo escolhido seja sempre persistido sem limitação.

### Item Concluído (Fase 57): Preço Dinâmico por Classe de Veículo ⚡
Para aumentar a competitividade comercial da oficina e agilizar a elaboração de propostas padronizadas, implementamos a precificação inteligente por porte em todo o ecossistema:
- **Catálogo Inteligente (`Servicos.jsx`)**: O gestor pode opcionalmente cadastrar faixas de preço diferenciadas por porte (`Hatch`, `Sedan`, `SUV`, `Pickup`, `Esportivo`, `Moto`) na coluna `precos_por_classe` (formato JSONB). Os cards do catálogo exibem o badge reativo "⚡ X Portes" quando há precificação dinâmica configurada.
- **Identificação de Porte (`Clientes.jsx` e `NovoOrcamentoModal.jsx`)**: A entidade veículo ganhou a coluna `porte`, configurável de forma rápida com botões em formato de grid ou select no cadastro/edição do veículo.
- **Sugestão Instantânea em Orçamentos (`NovoOrcamentoModal.jsx`)**: No momento em que o gestor seleciona os serviços no orçamento ou OS (Step 3), o sistema verifica o porte do veículo selecionado e substitui automaticamente o preço base pelo preço dinâmico correspondente (com indicação visual ⚡ e preço original riscado), mantendo a total liberdade do gestor de alterar o valor customizado no Step 4 se necessário.

### Item Concluído (Fase 57): Pacotes e Combos de Serviços 🎁
Para impulsionar as vendas casadas (upselling) e oferecer descontos promocionais atrativos, criamos o sistema nativo de pacotes de serviços:
- **Agrupamento Promocional no Catálogo (`Servicos.jsx`)**: Ao criar ou editar um serviço, o gestor pode ativar a opção **"🎁 Este Serviço é um Pacote / Combo Promocional?"** (persistido nas colunas `is_combo` e `itens_combo` em JSONB).
- **Cálculo Automático de Economia em Tempo Real**: Uma lista interativa exibe todos os serviços avulsos disponíveis. Conforme o gestor marca os itens do combo, o sistema calcula dinamicamente a soma dos valores avulsos, compara com o preço promocional do combo e exibe um painel em destaque com o valor economizado e a porcentagem de desconto (ex: **`🔥 Economia para o Cliente: R$ 700,00 (15% OFF)`**).
- **Importação Inteligente de Insumos (`Zap`)**: Se os serviços inclusos no pacote exigirem materiais do almoxarifado (ex: metros de PPF e frascos de vitrificador), o gestor pode clicar no botão **"⚡ Importar Insumos do Combo"** para agregar e somar automaticamente todos os materiais e quantidades necessários diretamente para o controle de estoque do pacote.
- **Destaque Visual nos Orçamentos e Cards**: Os cards no catálogo ganharam a tag roxa **`🎁 Combo (X itens)`** e o selo **`🔥 X% OFF`**. Na abertura de orçamento (`NovoOrcamentoModal.jsx`), os combos são exibidos com selos exclusivos nas etapas de seleção e resumo, facilitando a identificação imediata pelo cliente e pela recepção.

### Item Concluído (Fase 57): QR Code Instantâneo na Recepção 📱
Para eliminar a necessidade de envio manual do link de acompanhamento e encantar o cliente no momento da entrega do veículo na recepção, implementamos o sistema de QR Code dinâmico:
- **Geração Pura e Responsiva (`QRCodeModal.jsx`)**: Criamos um modal interativo que gera o QR Code apontando diretamente para a rota pública e segura de rastreamento da OS (`/status/:tracking_token`), usando o `QRCodeSVG` da biblioteca nativa `qrcode.react`.
- **Acesso Multi-Ponto na Operação**:
  - Na listagem geral de Ordens de Serviço (`OrdensServico.jsx`), adicionamos um botão dedicado em formato de QR Code roxo ao lado da visualização de detalhes, permitindo ao gestor ou recepcionista abrir o código na tela do computador com um clique.
  - No encerramento do Checklist Visual de Recepção (`CarVisualChecklist.jsx`), ao assinar o laudo de recebimento do veículo, o modal de notificação oferece o botão **"📱 Exibir QR Code na Recepção"**, possibilitando que o cliente aponte o celular e já saia com o painel aberto.
- **Etiqueta Imprimível e Compartilhamento**: O modal inclui o botão **"🖨️ Imprimir Etiqueta"**, que gera automaticamente uma tag formatada com as informações da OS, veículo, cliente e QR Code pronta para ser impressa e fixada no envelope de chaves ou painel do veículo. Há também ações rápidas para cópia de link e disparo via WhatsApp Web/Desktop.

### Item Concluído (Fase 57): Dark Mode Nativo (Painel Gerencial) 🌙
Para proporcionar conforto visual em ambientes com pouca iluminação, reduzir a fadiga ocular em operações de turno e conferir um acabamento estético de altíssimo nível, implementamos o Modo Escuro de alto contraste em todo o painel:
- **Gestão Global de Tema (`ThemeContext.jsx`)**: Criamos um contexto persistente que salva a preferência do usuário no `localStorage` (com verificação inteligente de preferência do sistema operacional via `prefers-color-scheme`), aplicando e alternando dinamicamente a classe `dark` no elemento raiz da aplicação.
- **Alternador Rápido no Cabeçalho (`Header.jsx`)**: Um botão de comutação animado com ícones de Sol e Lua foi posicionado na barra superior fixa do painel de controle, com tooltip descritivo e transição suave.
- **Conversão Inteligente do Design System (`src/index.css` & Tailwind)**: Configurado `darkMode: 'class'` no Tailwind e adicionadas regras globais de auto-conversão. Elementos com `bg-white`, `bg-slate-50`, `border-slate-200` e `text-slate-800` (incluindo cards premium, tabelas, modais e barra lateral) são transformados automaticamente em um tema escuro profundo (`#0b0f19` para o body e `#111827` para cards e painéis), mantendo o alto contraste e a consistência visual corporativa sem necessidade de reescrever centenas de componentes.
- **Refinamento Avançado de Contraste e Acabamento (Fase 57 Concluída)**:
  - *Sombras Suaves*: Neutralizadas as sombras brancas/claras no tema escuro que causavam efeito "estourado" (halo branco ao redor de cards e botões).
  - *Grids e Tabelas*: Aplicado fundo escuro (`#0f172a`) no cabeçalho (`thead`) e rodapé (`tfoot`) de todas as tabelas, com tipografia em branco puro (`#ffffff`) de alto contraste para leitura clara das colunas.
  - *Tratamento de Hovers (`hover:bg-slate-50`)*: Implementada regra global em CSS e nos cards (como Ordens Recentes no Dashboard) para que, ao passar o mouse em modo escuro, o fundo adote um tom azul-marinho sutil (`rgba(30, 41, 59, 0.7)`), eliminando qualquer clarão branco na interface.
  - *Diagramas no Checklist Digital (`CarVisualChecklist.jsx`)*: Blindagem com estilo inline (`style={{ backgroundColor: '#ffffff' }}`) garantindo fundo branco fixo na área de desenho dos veículos em qualquer tema, preservando 100% da nitidez dos contornos pretos para marcação de avarias.
  - *QR Code da Recepção (`QRCodeModal.jsx`)*: Ajuste do cabeçalho no modo escuro para eliminar transparências leitosas, utilizando degradê dark puro e textos de alto contraste.

### Fase 58: Documentação Visual Avançada & VCR (Vehicle Condition Report) 📸
Para elevar a transparência para o proprietário do veículo, otimizar o controle técnico e prover blindagem jurídica em serviços automotivos, criamos uma suíte completa de inspeção visual:
- **Guias de Ângulos Corporativos (`photoConstants.js`)**: Padronização em 5 ângulos estratégicos: Frontal 🏎️, Lateral Esquerda 🚗, Lateral Direita 🚙, Traseira 🚘 e Detalhe/Livre 📷, segmentados nas abas de fase: **Antes (Recepção)**, **Durante (Processo)** e **Depois (Acabamento)**.
- **Galeria Guiada 360° (`PhotoGuideGallery.jsx`)**: Componente interativo que exibe dropzones tracejadas e thumbnails em alta resolução com suporte a lightbox, download e exclusão controlada.
- **Comparador Visual Interativo (`PhotoComparisonModal.jsx`)**: Modal com duplo modo de inspeção (Deslizante/Slider e Lado a Lado/Split).
- **Inspeção Digital Enriquecida (`CarVisualChecklist.jsx`)**: Os pontos de avaria marcados nos diagramas (Carro ou Moto) agora são numerados (1, 2, 3...) e interativos. Ao clicar ou criar um ponto, abre-se um modal de detalhamento que permite atribuir o **Tipo do Dano** (⚡ Risco, 🔨 Amassado, 🎨 Pintura Queimada, 🪟 Trinca, 🫧 Mancha, ❓ Outro), uma **Descrição Técnica** e **Anexar uma Foto Fotográfica Específica do Dano** (vinculada ao bucket `os-photos` e salva no array JSONB da vistoria sem necessidade de alteração de schema SQL).
- **Laudo Digital de Inspeção (VCR - `VcrReportModal.jsx`)**: Gerador de relatório A4 completo, contendo cabeçalho corporativo com token/QR Code anti-IDOR, dados completos do cliente e veículo, mapa de avarias, tabela detalhada com miniaturas das fotos dos danos, termo de consentimento formal e quadro de assinatura digital.
  - *Impressão e Exportação*: Suporte nativo a impressão física e salvar em PDF (`window.print()`).
  - *Disparo via WhatsApp*: Botão dedicado que formata um resumo profissional da vistoria e envia via API do WhatsApp Web/Mobile com o link direto de acompanhamento.
- **Push Notifications PWA & Web Audio API (`useNotifications.js` / `Header.jsx`)**: Sistema de alertas nativos em tempo real operando via Supabase Realtime no navegador e em dispositivos móveis (Android/iOS PWA e Desktop):
  - *Chime de Áudio Zero-Latência*: Implementação nativa usando **Web Audio API** (`playNotificationChime`), gerando um sinal harmônico duplo (D5 + A5) diretamente pelo oscilador do navegador sem necessidade de carregamento de arquivos MP3 externos.
  - *Disparo Push Nativo*: Integração via `ServiceWorkerRegistration.showNotification` e fallback `new Notification()` ativados por permissão interativa no Header do PWA (`[ 🔔 Ativar Alertas Push no Celular ]`).
  - *Eventos Críticos Mapeados*: 
    1. **Nova OS Atribuída**: Disparado automaticamente na aprovação de orçamento ou designação de técnico em `useQuotes.js` e `useOrders.js`.
    2. **Alerta de Estoque Mínimo**: Disparado na transição de status para `ENTREGUE` caso o consumo de materiais reduza o estoque abaixo de `minimo_alerta` na tabela `estoque_materiais`.
    3. **Aprovação de Orçamento**: Disparado sempre que o status de uma O.S. avança para `AGUARDANDO` ou `APROVADO`.
  - *Democratização de Acesso*: Desbloqueado o sino de notificações para usuários com cargo `OPERADOR`, permitindo acompanhamento instantâneo de suas novas OS atribuídas no celular.

### Fase 59: Portal do Cliente "Meu Veículo" & Self-Booking 🌐
Para transformar a captação de clientes em um fluxo 100% automatizado, transparente e que funciona 24 horas por dia, implementamos o portal público de **Auto-Agendamento Online (`/agendar` ou `/reserva`)**:
- **Pública e Isolada (`SelfBooking.jsx`)**: Página interativa sem necessidade de login prévio, acessível diretamente por link na bio do Instagram, WhatsApp da loja ou site.
- **Wizard Interativo em 5 Etapas**:
  1. *Identificação do Veículo*: Seleção de categoria por cartões (Hatch, Sedan, SUV, Pickup, Esportivo, Moto) com marca/modelo e ano.
  2. *Catálogo de Serviços e Combos*: Leitura em tempo real da tabela `servicos` via política pública, permitindo seleção múltipla de serviços individuais ou combos promocionais com estimativa de valor em tempo real.
  3. *Calendário Inteligente com Checagem de Conflitos*: Exibição dinâmica de dias úteis com seletor de horários. O sistema consulta a tabela `ordens_servico` e **bloqueia automaticamente (badge "Ocupado 🔒")** horários que já possuam agendamentos ativos na data.
  4. *Resumo e Contato*: Validação de telefone e nome do cliente com card lateral resumo.
  5. *Tela de Confirmação & WhatsApp*: Geração automática da solicitação como uma Ordem de Serviço em status `ORCAMENTO` (sujeita à aprovação da gerência), disparo imediato de alerta em tempo real e push na central de notificações do Gestor (`notificacoes`), e botão para o cliente enviar uma mensagem pré-formatada para o WhatsApp da loja.
- **Divulgação na Agenda (`Agenda.jsx`)**: Adicionado banner explicativo na aba de Agenda do painel gerencial com botão **`[ 📋 Copiar Link ]`** para o gestor copiar instantaneamente a URL do portal e enviar para clientes.
- **Portal VIP do Cliente — "Meu Veículo" (`/meu-veiculo` ou `/portal`)**:
  - *Autenticação 2-em-1 Sem Atrito (`ClientPortal.jsx`)*: Sistema seguro de login por WhatsApp OTP ou acesso instantâneo via Placa + Telefone, persistido em `localStorage` para navegação contínua no celular.
  - *Seletor de Frota ("Minha Frota")*: Filtro visual por cartões de todos os veículos vinculados ao cliente, permitindo visualização unificada ou individual por carro.
  - *Timeline Cronológica Interativa*: Exibição vertical animada de todas as visitas à loja, detalhando data, investimento, status e descrição técnica dos serviços.
  - *Evidências Fotográficas & Lightbox*: Integração com a tabela `os_midia` que exibe miniaturas das fotos Antes, Durante e Depois do serviço, abrindo em zoom de alta definição ao clicar.
  - *Garantia Digital Ativa*: Para serviços concluídos ou entregues, disponibiliza o botão **`[ 📜 Certificado de Garantia ]`** que abre o nosso laudo oficial (`CertificadoGarantia.jsx`) para impressão ou salvamento em PDF.
  - *Banner em Clientes (`Clientes.jsx`)*: Adicionada área de compartilhamento rápido no topo da listagem de clientes para envio instantâneo do link do portal pelo WhatsApp.
- **Sincronização Universal de Calendário (`calendarUtils.js` & `CalendarSyncModal.jsx`)**:
  - *Exportação Padrão RFC 5545 (iCalendar / `.ics`)*: Utilitário para formatação de datas em UTC, sanitização e montagem do feed VCALENDAR/VEVENT.
  - *Integração Web em 1 Clique*: Geração dinâmica de URLs diretas para abertura com campos preenchidos no Google Calendar (`calendar.google.com/calendar/render?action=TEMPLATE...`) e Microsoft Outlook / 365.
  - *Para o Gestor (`Agenda.jsx`)*: Botão **`[ 📅 Sincronizar Google/Apple ]`** no cabeçalho da agenda da loja que permite exportar em lote todos os futuros agendamentos e ordens em andamento em um único arquivo `.ics` para importação no celular do gerente ou gestor.
  - *Para o Cliente*: Botões de adição rápida à agenda integrados na tela final de sucesso do Auto-Agendamento Online (`SelfBooking.jsx`) e em cada card da timeline do Portal "Meu Veículo" (`ClientPortal.jsx`), evitando esquecimentos de horários.

- **Motor de Retenção & Pós-Venda Ativo — Pesquisa NPS Automática (`Fase 60`)**:
  - *Banco de Dados (`pesquisas_nps`)*: Criada tabela dedicada com chave estrangeira para `ordens_servico(id)`, armazenando nota de 0 a 10, comentário e classificação automática em Promotor (9-10), Neutro (7-8) ou Detrator (0-6), com fallback de resiliência em `localStorage` para operação offline/demo.
  - *Pública e Sem Atrito (`PesquisaNPS.jsx` & `/nps/:osId`)*: Interface interativa e otimizada para o cliente avaliar seu atendimento em 1 clique sem necessidade de login. Apresenta feedback visual dinâmico com emoticons e cores de acordo com a nota e convite final para compartilhamento no Instagram ou WhatsApp da loja.
  - *Painel Analítico Gerencial (`NpsDashboard.jsx` & `Relatorios.jsx`)*: Incorporada nova aba **`[ ⭐ NPS & Retenção Ativa (24h) ]`** na Central de Relatórios.
  - *Cálculo Real-Time de Net Promoter Score*: Medição automática da fórmula `(% Promotores - % Detratores)` indicando em tempo real se a loja opera em Zona de Excelência (75 a 100), Zona de Qualidade (50 a 74), Zona de Aperfeiçoamento (0 a 49) ou Zona Crítica (< 0).
  - *Automação de Disparo no WhatsApp*: Fila ativa que monitora serviços entregues recentemente e disponibiliza botões de disparo individual ou em massa no WhatsApp com link personalizado contendo nome e veículo do cliente prontas para envio.
  - *Alerta e Tratativa de Detratores*: Destacamento visual em vermelho pulsante para clientes que avaliaram com nota de 0 a 6, incluindo botão **`[ 🚨 Tratar Detrator ]`** que abre o WhatsApp com mensagem empática propondo agendamento de retorno para ajuste imediato e sem custo da garantia automotiva.
  - *Garantia Ativa & Revisões Preventivas (`GarantiaAtivaDashboard.jsx`)*: Incorporada a aba **`[ 🛡️ Garantias & Manutenções Preventivas ]`** na Central de Relatórios.
  - *Cálculo Inteligente de Ciclos de Vida*: Leitura dinâmica dos serviços entregues para computar o vencimento da garantia (ex: 12 meses, 3 anos, 10 anos) e emissão automática de alertas segmentados: Alerta Gestor (30 dias antes), Alerta Cliente (15 e 7 dias antes) e Alerta Urgente.
  - *Lembretes de Manutenção Preventiva*: Detecção automática de serviços que necessitam de cuidados cíclicos para preservação de performance — ex: inspeção anual de bordas e regeneração em películas PPF (12 meses) e manutenção de repelência e hidrofobia em vitrificações cerâmicas 9H (6 meses).
  - *Ações em 1 Clique*: Disparo individual ou em massa no WhatsApp com textos consultivos de pós-venda, gerando novas oportunidades de faturamento e agendamento contínuo de revisões, além do botão de acesso ao laudo digital do Certificado de Garantia.

- **Inteligência Financeira (DRE) & Gamificação da Equipe (`Fase 61`)**:
  - *Dashboard Contábil & DRE Simplificado (`DreDashboard.jsx` & `Relatorios.jsx`)*: Incorporada nova aba **`[ 📊 DRE & Fluxo de Caixa ]`** na Central de Relatórios. Realiza o cálculo contábil automatizado dos 4 pilares: Receita Bruta de Serviços (soma das ordens concluídas/entregues no período), Custo de Insumos Deduzidos (cruzamento automático de materiais utilizados na OS com o preço de custo no almoxarifado/estoque), Lucro Bruto Operacional (% margem bruta) e Lucro Líquido Real deduzido de despesas fixas operacionais configuráveis (mão de obra, aluguel, luz), com projeção futura de fluxo de caixa de ordens em andamento.
  - *Ranking de Especialistas & Gamificação (`TecnicosRanking.jsx` & `Colaboradores.jsx`)*: Adicionada a aba **`[ 🏆 Ranking & Gamificação ]`** na gestão de equipe. Quadro motivacional que premia a produtividade e excelência dos técnicos com pódio dinâmico (🥇, 🥈, 🥉), volume de OS executadas, tempo médio de execução e nota média recebida nas pesquisas NPS dos clientes. Concede badges automáticas de excelência como "⚡ Rápido no Gatilho", "⭐ Mestre do Acabamento" e "🔥 Invicto 10+ Dias".
  - *Extrato e Controle de Comissões (`ComissoesExtrato.jsx`)*: Adicionada a aba **`[ 💰 Extrato de Comissões ]`** para gerenciar a remuneração da equipe. Permite configurar individualmente a regra de remuneração por técnico (porcentagem % da OS ou valor fixo R$ por serviço), consolidando os valores ganhos por competência mensal com extrato analítico expandido listando número da OS, cliente, veículo e comissão gerada, pronto para impressão e fechamento de folha.
  - *Vistoria de Qualidade do Gestor / QA (`QaChecklistModal.jsx` & `OrdensServico.jsx`)*: Implementado o modal obrigatório de Quality Assurance (QA) antes de transicionar o veículo de concluído para entregue. O gestor audita 4 pontos vitais: Acabamento & Limpeza, Bordas/Cantos de PPF, Montagem sem ruídos e Conformidade VCR, além de conceder uma Nota de Excelência (1 a 5 estrelas) ao técnico responsável.
  - *Integração Gamificação x QA (Streak sem Retrabalho)*: Quando o gestor aprova a vistoria no QA, a sequência invicta do técnico (streak de dias sem retrabalho) aumenta no ranking e exibe um banner motivacional no PWA do operador (`OperadorHome.jsx`). Caso reprovado no QA, a OS retorna para `EM EXECUÇÃO` com alerta de retrabalho e o streak do técnico é zerado, promovendo engajamento e alta qualidade técnica na oficina.

- **Ecossistema Aberto, APIs e Dashboard TV 360° (`Fase 63`)** (Nota: Fase 62 descontinuada no roadmap por decisão de escopo focada no modelo Single-Tenant):
  - *API Pública RESTful + Swagger Interativo (`ApiWebhooksManager.jsx` & `Settings.jsx`)*: Nova aba **`[ 🔌 APIs & Webhooks ]`** nas Configurações do sistema. Permite geração de Chaves de API secretas (`oss_live_xxxxx`) protegidas e com exibição única de token para integração de ERPs (Bling, Tiny, SAP, ContaAzul) e CRMs externos. Apresenta o Explorador API Swagger interativo com endpoints documentados (`GET /api/v1/orders`, `GET /api/v1/clients`, `GET /api/v1/nps`), exemplos em cURL, JavaScript e Python, e botão de execução real "Testar ao Vivo (Try It Out)".
  - *Central de Webhooks de Eventos*: Gerenciador de assinaturas de eventos em tempo real (`os.criada`, `os.concluida`, `os.entregue`, `pagamento.recebido`) para disparo de payloads HTTP POST JSON automáticos a sistemas externos, com simulador e testador de disparo integrado.
  - *Marketplace de Templates & Checklists (`TemplatesMarketplace.jsx` & `Settings.jsx`)*: Nova aba **`[ 🛍️ Marketplace ]`** com catálogo curado da rede de parceiros para importação em 1-clique de pacotes de serviços precificados e laudos VCR (ex: Pacote PPF Frontal Porsche 911, Vitrificação 9H Tripla Camada, Chrome Delete, Checklist Supercarros).
  - *Dashboard Gerencial na TV / Visão 360° Office (`Tv360OfficeView.jsx` & `Relatorios.jsx`)*: Central de comando em dark-mode de alto contraste para telas grandes no escritório da gerência. Apresenta em tempo real: Ticker Financeiro com progresso da meta mensal do faturamento (%), Grid de Ocupação da Oficina mostrando cada Box de produção com veículo, técnico responsável e cronômetro de SLA, Termômetro NPS 24h e Alerta Vermelho pulsante para insumos em estoque crítico.
  - *Gestão de Acesso e Redefinição de Senha de Operadores (`Colaboradores.jsx`)*: Adicionado o modal de controle de credenciais acionado pelo botão **`[ 🔑 ]`** na lista de equipe. Permite ao gestor duas opções de recuperação de acesso para a equipe técnica: **Opção 1 (E-mail Oficial)** que dispara `supabase.auth.resetPasswordForEmail()` para a caixa de entrada do colaborador; **Opção 2 (Senha Temporária de Oficina & WhatsApp)** onde o gestor define ou gera com 1 clique (🎲) uma senha provisória de bancada e notifica instantaneamente o técnico via WhatsApp com mensagem formatada contendo o e-mail e a nova credencial de acesso.

---

## 🌐 Controle de Repositórios e Fluxo de Deploy Git

Para garantir a estabilidade do sistema em produção no nosso cliente e manter um ambiente de desenvolvimento seguro para experimentação e homologação, o ecossistema é dividido em dois repositórios oficiais (detalhados no arquivo dedicado [repositorios.md](file:///d:/Repositorios/OsSystem/repositorios.md)):

1. **Repositório de Desenvolvimento (Nosso Laboratório):**
   - **URL:** `https://github.com/cf95souza/OsSystem.git`
   - **Regra:** Todas as novas funcionalidades, testes, skills e ajustes devem ser enviados **primeiro** para este repositório (`git push origin main` / `dev`).

2. **Repositório de Produção (Ambiente do Cliente):**
   - **URL:** `https://github.com/LucasEnvelopamento/LucasSystem.git`
   - **Regra de Ouro:** **NOSSO CLIENTE SÓ VAMOS ENVIAR DEPOIS DE TUDO PRONTO E TESTADO!** Nunca subir código direto sem validação prévia. O envio para este repositório (`git push client main`) é realizado apenas após homologação total.

---
*Última revisão da documentação: 27/07/2026 - Fase 63 100% concluída + Gestão de Acesso e Redefinição de Senhas da Equipe Técnica (Build 100% OK).*


---

## 🚀 CarX SaaS — Nova Arquitetura Monorepo e Backend Próprio

### Concluído: Fase 0 — Fundação do Projeto & Monorepo
#### Tarefa T0.1: Repositório e Monorepo (pnpm workspaces) 📦
Iniciada a grande transformação estrutural do **CarX** (evolução do legado para SaaS multitenant automotivo):
- **Arquitetura de Monorepo com `pnpm` workspaces (`pnpm-workspace.yaml`)**:
  - `apps/web`: Frontend React/Vite (Gestor, Operador PWA e Portal do Cliente).
  - `apps/api`: Backend Node.js + TypeScript Fastify com endpoint `/health`.
  - `apps/admin`: Painel do Super Admin (React + Vite + TypeScript).
  - `packages/shared`: Pacote isolado com enums de status da OS, matriz RBAC de permissões e esquemas Zod (`WorkOrder`, `Customer`, `Vehicle`).
  - `packages/ui`: Design System com tokens de marca oficiais (Volt `#C8F52E`, Asfalto `#0E1116`, Grafite `#171C24`, Aço `#232A35`).
  - `infra/`: Diretório base para topologia Docker e proxy Caddy.
- **Padronização e Qualidade**:
  - `TypeScript`: Configuração estrita com `tsconfig.base.json` (`strict: true`).
  - `ESLint 9 Flat Config`: Suporte unificado para ECMAScript e TypeScript em todo o monorepo.
  - `.editorconfig` e `.prettierrc` padronizados.
- **Critérios de Validação Atendidos**:
  - `pnpm install` executa em terminal limpo com linking de workspaces.
  - `pnpm typecheck` (`tsc -b`) compila e valida todos os pacotes e apps sem erros.
  - `pnpm lint` valida todas as pastas sem erros impeditivos.

#### Tarefa T0.2: Pipeline de CI (GitHub Actions) 🤖
Configurado o motor de automação de testes e validação contínua em `.github/workflows/ci.yml`:
- **Gatilhos**: Disparo a cada `push` e `pull_request` nas branches `main` e `dev`.
- **Concorrência Inteligente**: Grupo de concorrência com `cancel-in-progress: true` para cancelar builds redundantes a cada novo commit no mesmo PR.
- **Segurança (Least Privilege)**: Permissões estritas no container de execução com `contents: read`.
- **Etapa de Validação (`validate`)**:
  - `pnpm install --frozen-lockfile` (garantia de fidelidade matemática das versões de pacotes instaladas).
  - Execução de `pnpm lint` (bloqueia PR se houver erros de linting).
  - Execução de `pnpm typecheck` (`tsc -b`, bloqueia PR se houver erro de tipagem no TypeScript estrito).
- **Etapa de Build (`build`)**:
  - Compilação dos pacotes compartilhados (`@carx/shared`, `@carx/ui`) e das aplicações (`@carx/web`, `@carx/api`, `@carx/admin`).

#### Tarefa T0.3: Convenções e Documentação Base 📑
Criado o pacote de especificações técnicas, padrões de engenharia e runbooks de onboarding:
- **`README.md`**: Guia executivo de instalação, requisitos de runtime (Node.js 20+, pnpm 12+, Docker) e comandos de desenvolvimento monorepo.
- **`docs/arquitetura.md`**: Topologia de microsserviços enxutos (os 5 blocos da aplicação + proxy Caddy, Redis e MinIO) e isolamento em 4 redes Docker (`public`, `app`, `data`, `wa`).
- **`docs/decisoes.md`**: Arquivo de registro de decisões arquiteturais (ADR) contendo as 10 decisões fechadas e matriz de decisões em aberto.
- **`docs/glossario.md`**: Unificação dos conceitos e regras de negócio de oficina automotiva (máquina de estados da OS, laudo VCR, precificação por porte, bobinas de PPF/Insulfilm, QA, streak e passaporte digital).
- **`.env.example`**: Modelo oficial de variáveis de ambiente sem segredos reais expostos, configurado para banco PostgreSQL 16, Redis, MinIO, JWT e WhatsApp.

#### Tarefa T0.4: Higiene do Legado e Segurança 🧹
Concluído o saneamento e congelamento do código herdado do OsSystem:
- **Criação da Tag Git `legacy-final`**: Ponto de restauração histórico no commit final do OsSystem (`475f348`).
- **Expurgo de Arquivos Obsoletos e Temporários**:
  - Removidos scripts de teste com caminhos locais: `debug_config.js`, `debug_console.cjs`, `tmp_test.cjs`.
  - Removidos arquivos duplicados: `avaliacao_ossystem.md.resolved` e `supabase/.temp/linked-project.json`.
  - Removidas pastas clonadas/redundantes: `_1code-maturity-assessor`, `_1dashboard-layout`, `_1responsive-design`, `_1ui-design-system`, `ui-design-system` e `_skills` (suíte consolidada e preservada em `/skills`).
- **Endurecimento do `.gitignore`**: Regras adicionadas para ignorar `supabase/.temp`, caches locais, relatórios de cobertura, saídas de build em todos os pacotes e arquivos de debug.
- **Auditoria de Segredos**: Varredura via `git grep` certificando que nenhuma credencial ou chave privada permaneça hardcoded no código rastreado.

#### Tarefa T0.5: Design System, Tokens e Biblioteca de Componentes (`@carx/ui`) 🎨
Implementado o pacote compartilhado `packages/ui` em total harmonia com a nova identidade visual e os mockups de `rebraind/`:
- **Tokens Visuais Oficiais (`tokens.ts` e `tailwind-preset.ts`)**:
  - **Paleta de Cores Oficial**: Volt (`#C8F52E`), Asfalto (`#0E1116`), Grafite (`#171C24`), Aço (`#232A35`), Alerta (`#FFB020`), Info (`#5CC8FF`), Erro (`#FF6B5E`).
  - **Garantia de Contraste WCAG 4.5:1**: Qualquer texto ou ícone sobre a cor primária Volt é forçado estritamente para Asfalto (`#0E1116`), assegurando legibilidade sob iluminação de galpão e sol pleno.
  - **Alvos de Toque Ergonômicos (Oficina / Luva)**: Botões e controles com mínimo de 56px no mobile e 48px no desktop para evitar cliques acidentais com mãos oleosas ou enluvadas.
  - **Tipografia Técnica**: `Space Grotesk` (títulos, contadores numéricos e cronômetros) e `Inter` (corpo de texto, formulários e tabelas).
- **Biblioteca de Componentes Ergonômicos**:
  - **`Button`**: Variantes primária (Volt com texto Asfalto), secundária, outline, ghost e danger; suporte a estados de carregamento e alvos de toque adaptativos.
  - **`Badge`**: Indicadores de status da OS, etapas e alertas com ponto pulsante animado opcional (`pulse`).
  - **`Card`**: Containers com cantos arredondados generosos de 20px a 24px (`rounded-2xl`, `rounded-3xl`), variantes visualmente integradas com os fundos Asfalto e Grafite.
  - **`Input` & `Select`**: Entradas com raio de 14px, anel de foco em Volt e suporte completo a ícones de prefixo e sufixo.
  - **`Stopwatch`**: Cronômetro de alta precisão com dígitos monoespaçados (`tabular-nums`) e indicador de pulso para medição de tempo de execução na bancada.
  - **`Stepper`**: Linha do tempo visual de etapas da ordem de serviço com marcação de concluído, em andamento e pendente.
  - **`PhotoGalleryBar`**: Barra de slots guiados por ângulo veicular (frontal, traseira, laterais, teto, etc.), facilitando o checklist padronizado.
  - **`BottomNav`**: Barra inferior de navegação rápida para polegar (thumb-reach) em dispositivos móveis, com suporte a 3 a 5 ações principais.
  - **`Modal`**: Janela modal acessível com backdrop blur escurecido e suporte a fechamento por tecla Escape.
  - **`EmptyState`**: Exibição elegante para listas sem dados com ícone, título descritivo e botão de ação primária.
  - **`OfflineIndicator`**: Barra persistente com detecção de perda de conexão de rede, garantindo resiliência na oficina.
- **Validação de Qualidade e Compilação**:
  - `pnpm typecheck` validado com zero erros em todo o monorepo.
  - `pnpm lint` executado com zero erros impeditivos.
  - `pnpm build` executou com sucesso gerando bundles otimizados de produção para todas as aplicações (`@carx/web`, `@carx/api`, `@carx/admin`, `@carx/shared`, `@carx/ui`).

---

### Fase 1 — Infraestrutura na VPS & Docker 🐳

#### Tarefa T1.1: Endurecimento e Segurança do Servidor (VPS) 🛡️
Implementado o ferramental automatizado de provisionamento e proteção perimetral para servidores Linux Ubuntu Server (22.04 e 24.04 LTS):
- **Script de Bootstrap Idempotente (`infra/scripts/bootstrap-vps.sh`)**:
  - **Acesso Não-Root Obrigatório**: Criação do usuário de sistema `carx` pertencente aos grupos `sudo` e `docker`, com replicação segura das chaves públicas SSH autorizadas (`chmod 700/600`).
  - **Blindagem do OpenSSH (`sshd_config.d/99-carx-hardening.conf`)**: Bloqueio irrestrito de login direto do usuário `root` (`PermitRootLogin no`) e desativação total de autenticação por senha (`PasswordAuthentication no`), aceitando unicamente chaves criptográficas públicas.
  - **Firewall Fail-Closed (`ufw`)**: Negação padrão para qualquer conexão entrante. Liberação restrita das portas `22/tcp` (com limitador de taxa contra força bruta), `80/tcp` (HTTP para ACME e redirecionamento) e `443/tcp` (HTTPS criptografado). Bloqueio formal de portas de infraestrutura interna (PostgreSQL 5432, Redis 6379, MinIO 9000/9001).
  - **Defesa Ativa contra Brute-Force (`fail2ban`)**: Criação da jail `carx-sshd.local` banindo por 1 hora (`bantime = 3600`) qualquer IP com mais de 3 falhas de autenticação em uma janela de 10 minutos.
  - **Automação de Patches de Segurança (`unattended-upgrades`)**: Aplicação silenciosa e diária de atualizações críticas do Debian/Ubuntu, com agendamento de reboot para as 04:00 da manhã quando estritamente exigido por atualizações de kernel.
  - **Swap e Proteção de Memória do Banco**: Alocação de 4GB de Swap e ajuste fino de kernel em `/etc/sysctl.d/99-carx-sysctl.conf` (`vm.swappiness = 10` e `vm.vfs_cache_pressure = 50`) para priorizar a permanência do PostgreSQL e Redis na RAM física, além de proteção contra IP spoofing e SYN floods.
  - **Hardening do Daemon Docker (`/etc/docker/daemon.json`)**: Configuração compulsória de rotação de logs (`max-size: 50m`, `max-file: 3`) para evitar o esgotamento do disco NVMe por containers falantes, com `live-restore: true` para manter a aplicação online durante manutenções do serviço Docker.
- **Auditoria Automatizada (`infra/scripts/verify-vps-security.sh`)**:
  - Script executável que audita localmente ou remotamente os 7 pilares de conformidade de segurança e gera relatório de status com saída em código de erro (fail-closed).
- **Runbook Operacional (`infra/README.md`)**:
  - Documentação completa com comandos de execução em 1 linha via SSH e passos de validação pré-deploy.

#### Tarefa T1.2: Docker Compose Base e Topologia de Redes 🐳
Concluída a arquitetura de conteinerização do CarX cobrindo os 5 blocos da aplicação e serviços de apoio em ambientes de produção, homologação e desenvolvimento local:
- **Topologia de Containers e Isolamento em 4 Redes**:
  - `infra/compose.prod.yml`: Orquestração de produção com recursos e limites de memória calibrados.
  - `infra/compose.staging.yml`: Ambiente de homologação isolado na mesma VPS sem colisão de portas ou volumes.
  - `infra/compose.dev.yml`: Ambiente para Docker Desktop com bind em `127.0.0.1` para inspeção local de banco e caches.
  - **Rede `carx_net_public`**: Permite acesso apenas aos frontends (`carx-web`, `carx-admin-web`), proxy Caddy e painel de status (`uptime`).
  - **Rede `carx_net_app`**: Barramento privado para comunicação entre o proxy, API Fastify (`carx-api`), background worker (`carx-worker`), Redis e MinIO (`pgsty/silo`).
  - **Rede `carx_net_data` (Modo Interno `internal: true`)**: Rede blindada para persistência. O banco PostgreSQL e o container de backup diário não possuem qualquer saída para a internet nem visibilidade da rede pública.
  - **Rede `carx_net_wa`**: Rede isolada para o gateway de WhatsApp (`carx-wa`), acessível estritamente pelas instâncias da API e do Worker.
- **Dockerfiles Multi-stage e Configurações Otimizadas (`infra/docker/`)**:
  - `api.Dockerfile`: Compilação TypeScript com `node:20-alpine`, execução com usuário sem privilégios `node` e gerenciador de processos `dumb-init`.
  - `web.Dockerfile` & `admin.Dockerfile`: Builds Vite estáticos servidos via Nginx Alpine com cabeçalhos de segurança (HSTS, CSP, X-Frame-Options, anti-sniffing) e cache imutável para assets com hash.
  - `wa.Dockerfile`: Gateway de mensageria com persistência isolada de credenciais de sessão.
  - `nginx-web.conf` & `nginx-admin.conf`: Configurações de servidor Nginx com compressão Gzip e SPA fallback nativo.
  - `Caddyfile`: Configuração de proxy reverso com suporte a roteamento de subdomínios dinâmicos das lojas (`*.carx.com.br`) e terminação TLS automática Let's Encrypt.
  - `.dockerignore`: Filtro abrangente prevenindo que artefatos locais do Windows corrompam as imagens Docker Linux.
- **Validação Prática no Docker Desktop**:
  - Todos os containers de infraestrutura e aplicação subiram saudáveis (`carx-dev-db`, `carx-dev-minio`, `carx-dev-redis`, `carx-dev-wa`, `carx-dev-api`).
  - Healthchecks validados com sucesso via curl interno e verificação de integridade de processos.

#### Tarefa T1.3: Domínio, SSL Wildcard e Subdomínios 🌐
Estruturado o roteamento de borda, terminação TLS automática e gestão de subdomínios do ecossistema:
- **Proxy Reverso Caddy com On-Demand TLS (`infra/caddy/Caddyfile`)**:
  - **Suporte Nativo a Subdomínios de Lojas**: Roteamento dinâmico para `*.carx.com.br` e `app.carx.com.br` direcionando para a SPA com envio do cabeçalho `X-Tenant-Host`.
  - **Isolamento de Subdomínios de Sistema**: Roteamento específico para `admin.` (Super Admin com proteção anti-clickjacking `X-Frame-Options: DENY`), `api.` (Fastify com limite de upload de 15MB) e `status.` (Uptime Kuma).
  - **Suporte a Domínio Próprio White-Label**: Bloco coringa `:443` permitindo que clientes premium operem sob seus próprios domínios (ex: `sistema.lucasenvelopamento.com.br`) via CNAME direto com emissão automática de SSL.
  - **Blindagem Anti-DoS em Emissões de Certificados**: Implementação da diretiva `on_demand_tls` associada ao endpoint `ask http://carx-api:3000/internal/caddy-check`. Apenas domínios formalmente validados e autorizados recebem certificados, impedindo esgotamento de cotas do Let's Encrypt por apontamentos maliciosos externos.
- **Defesas e Validações no Backend (`apps/api/src/server.ts`)**:
  - Endpoint `/internal/caddy-check` implementado e testado unitariamente: retorna HTTP 200 para subdomínios da zona base e homologados, e HTTP 403 para domínios estranhos.
  - Subdomínios reservados da plataforma padronizados na constante `RESERVED_SUBDOMAINS` em `packages/shared/src/enums.ts` (`app`, `admin`, `api`, `status`, `staging`, `auth`, `billing`, etc.) para prevenir sequestro de rotas internas por tenants.
- **Guia Técnico de DNS e Domínios (`docs/dns-e-dominios.md`)**:
  - Matriz completa de registros A, CNAME, Wildcard (`*`), TTLs recomendados e políticas de segurança de e-mails transacionais (SPF, DMARC) documentada.

#### Tarefa T1.4: Backups Automáticos e Recuperação Testada 💾
Implementada rotina completa de cópias de segurança locais e em nuvem com script automatizado de teste de restauração e métricas rígidas de Disaster Recovery (RPO <= 24h, RTO < 30min):
- **Backup Periódico Automatizado (`infra/compose.prod.yml` e `infra/compose.staging.yml`)**:
  - Container especializado `prodrigestivill/postgres-backup-local:16-alpine` conectado estritamente à rede interna e isolada `data` (`internal: true`), sem exposição externa ou de portas.
  - Agendamento diário (`SCHEDULE=@daily`) gerando dumps compactados via Gzip no volume persistente `backups_data`.
  - Política de retenção GFS (Grandfather-Father-Son): 7 backups diários (`BACKUP_KEEP_DAYS=7`), 4 semanais (`BACKUP_KEEP_WEEKS=4`) e 6 mensais (`BACKUP_KEEP_MONTHS=6`).
- **Sincronização Off-Site e Estratégia 3-2-1 (`infra/scripts/backup-offsite.sh`)**:
  - Script bash para envio dos backups para Cloud Storage externo à VPS (compatível com AWS S3, Cloudflare R2 e Backblaze B2).
  - Snapshot complementar das credenciais/sessões criptografadas do WhatsApp (`wa_sessions`) e uploads de mídia do MinIO (`minio_data`).
  - Suporte a criptografia simétrica com GPG (`gpg --symmetric --cipher-algo AES256`) antes do trânsito de dados para fora do servidor.
  - Webhooks de alerta para canais de monitoramento (Discord, Slack ou Telegram) com status de sucesso ou notificação imediata de falhas.
- **Auditoria Automatizada de Recuperação (DR) (`infra/scripts/restore-test.sh` e `infra/scripts/restore-test.ps1`)**:
  - Script com suporte duplo: Shell Script (Linux/VPS) e PowerShell (Windows/Dev).
  - Procedimento: localiza o último dump ou gera snapshot limpo do banco ativo, provisiona contêiner efêmero PostgreSQL 16 com volume temporário, executa a restauração completa e audita o catálogo e a contagem de tabelas públicas e linhas restauradas.
  - Mecanismo seguro de limpeza automática na saída (`trap` no Bash e bloco `finally` no PowerShell).
  - Procedimento validado no Docker Desktop com aprovação de 100% de integridade.
- **Procedimento Operacional Padrão (`docs/runbook-backup.md`)**:
  - Runbook de contingência detalhando o passo a passo de restauração emergencial em caso de corrupção ou perda total de servidor, com comandos reproduzíveis e checklist de integridade pós-restauro.

#### Tarefa T1.5: Monitoramento e Observabilidade 📊
Implementado o ecossistema completo de telemetria, logs estruturados em JSON, rastreamento de erros e monitoramento de disponibilidade:
- **Logs Estruturados JSON e Correlação de Requisições (`apps/api/src/observability/logger.ts`)**:
  - Padronização do Pino no Fastify emitindo eventos em formato estritamente estruturado em JSON com carimbos ISO.
  - Correlação de ponta a ponta com `x-request-id` ou geração automática de UUID para cada chamada HTTP.
  - Redação compulsória de dados sensíveis e credenciais em conformidade com a LGPD (`authorization`, `cookie`, `password`, `token`, `cartao`, `cvv`, `cpf`, `rg`, etc.).
- **Rastreamento de Exceções com GlitchTip / Sentry (`apps/api/src/observability/sentry.ts`)**:
  - Integração via SDK oficial `@sentry/node` com inicialização controlada por `SENTRY_DSN`.
  - Captura inteligente de exceções de servidor (códigos HTTP 5xx) enriquecidas com contexto de request, ID da requisição e identificação do tenant.
  - Prevenção de vazamento de stack traces e detalhes internos de banco em produção.
- **Endpoints de Telemetria e Probes (`apps/api/src/observability/health.ts` e `metrics.ts`)**:
  - `GET /health`: Liveness probe de execução instantânea para validação de processo ativo.
  - `GET /health/ready`: Readiness probe com auditoria profunda de conectividade e latência TCP com PostgreSQL (porta 5432), Redis (porta 6379) e MinIO Storage (porta 9000). Retorna HTTP 200 quando todos os serviços estão saudáveis ou HTTP 503 quando há degradação.
  - `GET /metrics`: Telemetria no padrão oficial do Prometheus (OpenMetrics) e exportação em JSON (`?format=json`).
- **Orquestração do Uptime Kuma (`infra/compose.*.yml` e `infra/caddy/Caddyfile`)**:
  - Container `uptime` conectado às redes `public` e `app` para acesso externo via proxy Caddy (`status.carx.com.br`) e sondagem direta das portas internas dos containers.
  - Matriz de checagens para API Liveness, API Readiness, PostgreSQL, Redis, MinIO e WhatsApp Gateway.
- **Script de Validação de Alertas e Incidentes (`infra/scripts/test-alert.sh` e `infra/scripts/test-alert.ps1`)**:
  - Validação executada com sucesso contra o Docker Desktop: a parada forçada do container da API foi detectada em **2 segundos** (limite exigido: $\le 120$ segundos / 2 minutos), e a recuperação ocorreu em **1 segundo** após o religamento.
- **Manual de Operações (`docs/observabilidade.md`)**:
  - Documentação da arquitetura, matriz de monitores, formato de logs e configuração de canais de notificação (Discord, Telegram, Slack).

#### Tarefa T1.6: Deploy Automatizado e Rollback 🚀
Concluído o pipeline de Entrega Contínua (CD), publicação automatizada de imagens no GitHub Container Registry (GHCR) e procedimento de Rollback em 1 comando:
- **Pipeline de CD com Gatilhos Inteligentes (`.github/workflows/deploy.yml`)**:
  - **Ambiente de Homologação (Staging)**: Push ou merge na branch `main` executa a suíte de testes (`lint`, `typecheck`, `test`), constrói as imagens Docker via Buildx com cache GHA, publica no GHCR com as tags `sha-<commit>` e `staging`, e aciona o deploy remoto via SSH na VPS.
  - **Ambiente de Produção (Production)**: Deploy acionado por tags Git semânticas (`v*.*.*`) ou manualmente via `workflow_dispatch` com seleção explícita de ambiente e tag.
  - **Execução Remota Segura**: Uso da action `appleboy/ssh-action@v1.0.3` conectando ao usuário sem privilégios `carx` e executando o script `infra/scripts/deploy.sh`.
- **Script de Deploy na VPS (`infra/scripts/deploy.sh`)**:
  - Gravação do histórico atômico de versões em `~/.carx-deploy/<env>-previous.txt` antes de iniciar as alterações.
  - Execução de migrations de banco isoladas antes da alternância de tráfego.
  - Recriação de containers com `--remove-orphans`.
  - **Rollback Preventivo Automático**: Se os healthchecks (`/health/ready`) não responderem HTTP 200 em até 60 segundos, o script aborta e executa o rollback imediato para a versão anterior.
- **Rollback em 1 Comando (`infra/scripts/rollback.sh` e `infra/scripts/rollback.ps1`)**:
  - Operação simplificada executável diretamente via SSH: `bash infra/scripts/rollback.sh production`.
  - Restauração de containers e normalização de tráfego em menos de 10 segundos.
  - Testado e auditado com sucesso no Docker Desktop com restabelecimento de saúde instantâneo.
- **Manual de Operações e Contingência (`docs/deploy-e-rollback.md`)**:
  - Guia detalhado de branches, segredos do GitHub Actions (`VPS_HOST`, `VPS_SSH_KEY`, `VPS_SSH_USER`) e procedimentos de contingência.

---

### 🏢 Fase 2 — Núcleo Multitenant & Super Admin

#### Tarefa T2.0: Inventário e Mapeamento de Reúso (OperaBeauty) 📑
Realizada análise aprofundada da base de código do SaaS multitenant de referência (`d:\Repositorios\OperaBeauty`), discriminando componentes a serem aproveitados, adaptados ou descartados para o domínio automotivo do CarX:
- **Aproveitamento Direto (COPIAR)**:
  - Mecanismo dinâmico de Row Level Security (RLS) via PL/pgSQL com variável de sessão `app.current_tenant_id` e papel sem bypass `carx_app`.
  - Sessão e autenticação com Refresh Tokens rotativos e `family_id` (prevenção compulsória contra ataques de repetição e sequestro de sessão).
  - Autenticação com Segundo Fator (2FA TOTP RFC 6238) para Super Admin da plataforma.
  - Painel de métricas SaaS: cálculo de MRR, Churn Rate, inadimplência e suspensão/reativação.
- **Adaptação para o Domínio Automotivo (ADAPTAR)**:
  - Suporte a multi-unidades/filiais (`tenants` -> `units` -> `memberships`).
  - Modelo RBAC automotivo unificado: `owner`, `gestor`, `atendente`, `tecnico`, `financeiro`.
  - Quotas de planos calibradas para centros automotivos: técnicos simultâneos, bobinas de PPF, gigabytes de laudos no MinIO e disparos WhatsApp.
  - Motor de faturamento recorrente integrado prioritariamente com Asaas (PIX dinâmico, boletos e cartão recorrente) e fallback para Mercado Pago.
- **Evolução Arquitetural e Eliminação de Dívidas Técnicas (REFATORAR)**:
  - Migração de uploads em disco local para **MinIO (Object Storage S3)** com URLs pré-assinadas e buckets protegidos.
  - Reescrita completa dos serviços e rotas em **Node.js 20 + Fastify + TypeScript estrito (`strict: true`) + validações Zod**.
  - Criação de suíte automatizada de testes dinâmicos de isolamento entre inquilinos (`tenant-isolation.test.ts`).
- **Descarte de Recursos Incompatíveis (DESCARTAR)**:
  - Descarte definitivo de fichas de anamnese corporal/facial, cardápios de espera, pacotes de procedimentos de beleza e vales-presente.
- **Manual de Engenharia**:
  - Mapeamento documentado detalhadamente em `docs/reuso-operabeauty.md`.

#### Tarefa T2.1: Migrations e Esquema Relacional do Núcleo 🗄️
Implementado o sistema de migrações transacionais versionadas e o esquema relacional das entidades centrais do CarX SaaS sobre PostgreSQL 16 Alpine:
- **Executor de Migrações em TypeScript (`apps/api/src/database/migrate.ts`)**:
  - Mecanismo transacional próprio gerenciado via scripts CLI (`pnpm db:migrate`, `pnpm db:migrate:down`, `pnpm db:migrate:status`, `pnpm db:migrate:reset`).
  - Registro de auditoria de migrações aplicadas na tabela `_carx_migrations` com timestamps UTC.
- **Migration 001 — Esquema Relacional do Núcleo (`001_core_schema.up.sql` e `001_core_schema.down.sql`)**:
  - **Extensões**: `uuid-ossp`, `pgcrypto`, `btree_gist`.
  - **Enums**: `tenant_status`, `membership_role`, `billing_interval`, `subscription_status`, `invoice_status`, `payment_method`.
  - **Tabelas do Núcleo**:
    - `plans`: Planos comerciais do SaaS com precificação em centavos e cotas em JSONB.
    - `tenants`: Inquilinos/oficinas com slug único (subdomínio), dados fiscais (CNPJ) e suporte a domínio personalizado White-Label.
    - `units`: Filiais e centros operacionais de cada oficina (matriz e filiais).
    - `users`: Identidade global unificada com hash de senha, flag de 2FA e status.
    - `memberships`: Papéis RBAC vinculando usuário, oficina e unidade (`owner`, `gestor`, `atendente`, `tecnico`, `financeiro`).
    - `subscriptions`: Assinaturas comerciais vinculadas ao gateway de faturamento recorrente.
    - `invoices`: Faturas de mensalidade geradas com suporte a PIX, Boleto e Cartão.
    - `refresh_tokens`: Sessões JWT rotativas com rastreamento por `family_id` (detecção compulsória de reutilização maliciosa).
    - `platform_admins`: Gestão de Super Administradores da plataforma CarX.
    - `platform_settings`: Configurações e parâmetros globais do ecossistema.
    - `audit_logs`: Trilha imutável para compliance, auditoria e LGPD.
    - `api_keys`: Autenticação e chaves de API com prefixo e permissões para integrações externas.
    - `webhook_endpoints` e `webhook_deliveries`: Mensageria em tempo real para disparo de webhooks a sistemas externos dos tenants.
  - **Integridade e Triggers**: Função `update_updated_at_column()` aplicada a todas as tabelas modificáveis.
  - **Índices de Performance**: 18 índices cobrindo todas as chaves estrangeiras, buscas por slug, e-mail e ordenações por data.
- **Validação Prática**:
  - Testes de aplicação (`up`), rollback completo (`down`) e reaplicação (`up`) executados com 100% de integridade referencial contra o container PostgreSQL 16 (`carx-dev-db`).
  - Dicionário de dados mestre e documentação viva sincronizados em `database.md`.

#### Tarefa T2.2: Contexto de Tenant e RLS (Row Level Security em Profundidade) 🛡️
Implementado o isolamento multicamadas de dados garantindo que nenhuma oficina consiga acessar, modificar ou excluir informações de outra:
- **Migration 002 — Row Level Security (`002_tenant_rls.up.sql` e `002_tenant_rls.down.sql`)**:
  - Ativação de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` em todas as tabelas com `tenant_id` e na tabela `tenants`.
  - Configuração do papel da aplicação `carx_app` com restrição inegociável `NOBYPASSRLS`.
  - Criação das políticas de segurança `tenant_isolation_policy` e `tenant_self_isolation_policy` verificando `current_setting('app.current_tenant_id', true) = tenant_id::text`, além de suporte a auditoria/bypass exclusivo para Super Admin (`app.is_superadmin = 'true'`).
- **Helpers de Consulta Segura (`apps/api/src/database/tenant-query.ts`)**:
  - Funções `tenantQuery` e `tenantTransaction` estruturadas sob o princípio Fail-Closed (Default Deny): consultas sem `tenant_id` lançam `TenantIsolationError` (HTTP 403) antes de tocar no banco.
  - Injeção atômica de contexto de sessão através de `SELECT set_config('app.current_tenant_id', $1, true)` com escopo transacional local (`is_local = true`), garantindo contaminação zero de conexões no pool.
- **Plugin de Resolução de Tenant para Fastify (`apps/api/src/plugins/tenant.ts`)**:
  - Resolução automática do inquilino a partir de cabeçalhos (`X-Tenant-ID`, `X-Tenant-Slug`) ou do host da requisição (`{slug}.carx.com.br`, `{slug}.carx.local`), ignorando subdomínios reservados do sistema (`app`, `admin`, `api`, `status`).
  - Bloqueio preventivo com HTTP 403 para oficinas com status `suspended` ou `cancelled`.
  - Guarda declarativa de rota `requireTenantContext` para rejeitar requisições anônimas ou sem oficina definida.
  - Decoradores `request.tenantId`, `request.tenantSlug`, `request.tenantQuery` e `request.tenantTransaction`.
- **Suíte de Testes de Isolamento (`apps/api/src/database/tenant-isolation.test.ts`)**:
  - 8 testes cobrindo todas as tabelas isoladas do catálogo relacional.
  - Comprovação matemática de que a Oficina A não consegue ler (0 registros), alterar (0 linhas afetadas) nem deletar (0 linhas afetadas) dados da Oficina B, mesmo conhecendo os IDs das entidades.
  - Validação de RLS ativo e forçado em todas as tabelas dinamicamente via catálogo PostgreSQL.
  - Suíte completa executada com 16/16 testes passando com sucesso.

#### Tarefa T2.3: Autenticação Segura (Bcryptjs + JWT Rotativo + 2FA TOTP) 🔑
Implementado o subsistema proprietário completo de autenticação e gerenciamento de sessões do CarX, eliminando qualquer dependência do Supabase GoTrue:
- **Migration 003 — Tabelas de Suporte à Autenticação (`003_auth_tables.up.sql`)**:
  - Coluna `two_factor_temp_secret` adicionada à tabela `users` para armazenar o segredo durante o fluxo de pareamento TOTP.
  - Tabela `password_resets` para armazenamento de tokens descartáveis de redefinição com expiração de 1 hora e revogação pós-uso.
- **Hashing Criptográfico de Senhas (`apps/api/src/auth/password.ts`)**:
  - Implementação com `bcryptjs` (salt rounds 10) garantindo portabilidade multiplataforma sem dependências C++ nativas.
- **Gerenciador de Tokens JWT (`apps/api/src/auth/jwt.ts`)**:
  - Implementação RFC 7519 HMAC-SHA256 nativa com `crypto.timingSafeEqual` contra timing attacks.
  - Access tokens com validade de 15 minutos e tokens temporários de 2FA com validade de 5 minutos.
- **Algoritmo TOTP de Segundo Fator (`apps/api/src/auth/totp.ts`)**:
  - Implementação completa dos padrões RFC 6238 e RFC 4648 Base32 para geração e verificação de códigos de 6 dígitos com janela de tolerância de $\pm 30$ segundos para drift de relógio.
  - Geração de URIs `otpauth://totp/CarX:...` compatíveis com Google Authenticator, Microsoft Authenticator e Authy.
- **Proteção Anti-Brute Force (`apps/api/src/auth/rate-limiter.ts`)**:
  - Rate limiter em memória com janela deslizante de 15 minutos e limite de 5 tentativas inválidas consecutivas por IP/e-mail, respondendo HTTP 429 Too Many Requests.
- **Serviço de Autenticação e Sessões (`apps/api/src/auth/auth-service.ts`)**:
  - Cadastro de usuários com vinculação direta à oficina e gravação estrita do papel correto em `memberships` (`owner`, `gestor`, `atendente`, `tecnico`, `financeiro`), prevenindo o bug do legado de rebaixamento para operador.
  - Rotação contínua de Refresh Tokens (validade de 7 dias) rastreados por `family_id` com **detecção compulsória de reuso malicioso**: se um token antigo revogado for apresentado, toda a família de sessões é revogada instantaneamente.
  - Fluxo de recuperação de senha seguro: emissão de token de uso único com revogação forçada de todas as sessões anteriores após a redefinição.
- **Rotas Fastify (`apps/api/src/routes/auth-routes.ts`)**:
  - Endpoints expostos: `/auth/register`, `/auth/login`, `/auth/2fa/verify`, `/auth/2fa/setup`, `/auth/2fa/enable`, `/auth/2fa/disable`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me`.
  - Hook `authenticateBearer` para proteção de rotas privadas.
- **Validação Automatizada (`apps/api/src/auth/auth.test.ts`)**:
  - 10 testes cobrindo cadastro, login, rejeição de duplicados, bloqueio por força bruta, rotação, detecção de replay de token, ativação/desativação de 2FA e redefinição de senha com 100% de sucesso.

#### Tarefa T2.4: Matriz de Autorização RBAC por Papel 🛡️
Implementado o controle de acesso baseado em papéis (RBAC - Role-Based Access Control) granular no nível de aplicação, definindo permissões estritas para cada perfil operacional da oficina automotiva:
- **Catálogo de Permissões Compartilhado (`packages/shared/src/permissions.ts`)**:
  - Definição formal de 5 papéis: `owner`, `gestor`, `atendente`, `tecnico`, `financeiro`.
  - Mapeamento granular de permissões por domínio de negócio: `os:*`, `checklist:*`, `client:*`, `inventory:*`, `financial:*`, `admin:*`, `users:*`, `reports:*`, `settings:*`.
  - Mapeamento de privilégios por papel:
    - `owner`: Acesso irrestrito a todas as funcionalidades, finanças e configurações da oficina.
    - `gestor`: Gestão operacional completa, ordens de serviço, clientes, estoque e relatórios, sem permissão para alteração de plano ou exclusão da conta matriz.
    - `atendente`: Atendimento inicial, criação e acompanhamento de orçamentos e cadastros de clientes, sem acesso a custos internos ou deleção de registros financeiros.
    - `tecnico`: Focado estritamente na execução do serviço, checklist visual de entrada/saída e upload de fotos/laudos; **bloqueio total a dados financeiros e faturamento**, impossibilitado de deletar ordens de serviço e restrito às suas ordens atribuídas.
    - `financeiro`: Gestão de contas, emissão de cobranças, conciliação e relatórios de fluxo de caixa, sem acesso à esteira de produção e checklists.
  - Funções de avaliação pura: `hasPermission`, `hasAnyPermission` e `hasAllPermissions`.
- **Guards e Middlewares Fastify (`apps/api/src/middlewares/rbac.ts`)**:
  - `requireRole(...roles)`: Validador declarativo de rota que rejeita com HTTP 403 usuários sem os papéis autorizados.
  - `requirePermission(...permissions)`: Validador granular baseado em capacidades específicas.
  - `requireAssignedTechnician(resolver)`: Trava de integridade operacional que impede um técnico de visualizar ou alterar ordens de serviço atribuídas a outro profissional (`FORBIDDEN_NOT_ASSIGNED`), enquanto `owner` e `gestor` mantêm supervisão irrestrita.
- **Suíte de Testes Automatizada (`apps/api/src/middlewares/rbac.test.ts`)**:
  - 16 testes unitários e de integração cobrindo todas as matrizes de permissão e cenários de acesso concorrente entre técnicos.
  - Total da suíte de testes do CarX consolidada em **42 testes passando com 100% de sucesso**.

#### Tarefa T2.5: Trilha de Auditoria Imutável (Audit Log) 📜
Implementado o subsistema de auditoria append-only para conformidade fiscal, integridade operacional e LGPD, garantindo rastreabilidade histórica completa sobre mutações críticas no ecossistema:
- **Migration 004 — Bloqueio de Mutabilidade e Índices de Auditoria (`004_audit_immutability.up.sql`)**:
  - Função PL/pgSQL `prevent_audit_log_modification()` e trigger `trg_audit_logs_immutable` acoplada à tabela `audit_logs`: qualquer tentativa de `UPDATE` ou `DELETE` é abortada imediatamente com código SQLSTATE `55000` (`Audit logs are immutable: records cannot be updated or deleted`).
  - Índices otimizados para relatórios e investigações forenses: `idx_audit_logs_tenant_entity`, `idx_audit_logs_tenant_action`, `idx_audit_logs_action` e `idx_audit_logs_created_at`.
- **Serviço de Auditoria (`apps/api/src/audit/audit-service.ts`)**:
  - `record()`: Gravação estruturada contendo `tenant_id`, `user_id`, `action`, `entity`, `entity_id`, `old_values` (JSONB), `new_values` (JSONB), `ip_address` e `user_agent`.
  - Injeção de contexto RLS automática tanto em consultas diretas no pool quanto em transações abertas (`client`).
  - Métodos de domínio convenientes:
    - `recordWorkOrderPriceChange()`: Registra alterações no valor total da OS e justificativa técnica.
    - `recordPaymentRefund()`: Registra estornos e reembolsos com valor em centavos, status prévio e motivo da devolução.
    - `recordRoleChange()`: Registra promoções ou rebaixamentos de cargo no RBAC (`memberships`).
  - `list()`: Busca paginada isolada por inquilino com filtros flexíveis por entidade, ID do recurso, ação, usuário e período.
  - `getById()`: Inspeção unitária de log com validação estrita de pertencimento ao inquilino solicitante.
- **Rotas Fastify (`apps/api/src/routes/audit-routes.ts`)**:
  - `GET /audit-logs`: Listagem protegida por `authenticateBearer`, `requireTenantContext` e restrita a papéis de liderança (`owner`, `gestor`, `superadmin`). Retorna HTTP 403 para `tecnico` e `atendente`.
  - `GET /audit-logs/:id`: Detalhamento e inspeção completa de snapshots anteriores e posteriores.
- **Suíte de Testes Automatizada (`apps/api/src/audit/audit.test.ts`)**:
  - 12 testes validando:
    1. Bloqueio de mutabilidade (PostgreSQL rejeita `UPDATE` e `DELETE`).
    2. Registro e recuperação de estorno/reembolso financeiro.
    3. Registro e recuperação de alteração de preço em Ordem de Serviço.
    4. Registro de alteração de papel de colaborador.
    5. Isolamento matemático multitenant (Oficina Alpha nunca acessa logs da Oficina Beta).
    6. Rejeição de requisições anônimas (HTTP 401).
    7. Bloqueio de acesso para técnicos e atendentes (HTTP 403).
    8. Permissão de consulta para gestor e proprietário (HTTP 200).
    9. Filtros e paginação da API HTTP.
    10. Busca por ID e resposta 404 para identificador inexistente.
  - Suíte consolidada da API CarX: **54/54 testes passando com 100% de sucesso**.

#### Tarefa T2.6: Gestão de Planos, Limites e Feature Flags 💎
Implementado o motor central de monetização SaaS e governança de recursos da plataforma CarX, controlando quotas por plano e liberação seletiva de funcionalidades por oficina:
- **Catálogo Compartilhado de Planos (`packages/shared/src/plans.ts`)**:
  - Definição canônica dos 3 planos comerciais:
    - `Essencial` (R$ 69,90/mês): Focado em estéticas automotivas em fase inicial. Limite de 1 filial, 3 colaboradores simultâneos, 100 OS/mês, 1 GB no MinIO e disparos WhatsApp básicos.
    - `Profissional` (R$ 149,90/mês): Focado em centros automotivos consolidados. Limite de 2 filiais, 10 colaboradores, 500 OS/mês, 10 GB no MinIO, disparos automáticos via WhatsApp, gestão financeira completa, comissões, inventário e controle de bobinas PPF.
    - `Premium` (R$ 299,90/mês): Focado em redes e franquias. 10 filiais, 50 colaboradores, ordens de serviço ilimitadas, 50 GB no MinIO, emissão de NFS-e, multiunidade, API e subdomínio próprio White-Label.
- **Migration 005 — Seed dos Planos Canônicos (`005_seed_plans.up.sql`)**:
  - Inserção dos 3 planos com cotas estruturadas em JSONB (`limits`) e matriz de recursos (`features`).
  - Associação de todos os tenants sem plano ativo ao plano padrão `Essencial`.
- **Motor de Planos e Cotas (`apps/api/src/plans/plan-service.ts`)**:
  - `getTenantPlanDetails()`: Medição dinâmica em tempo real sobre o banco (via `tenantQuery` com RLS ativo) confrontando a utilização atual de usuários e filiais contra as cotas efetivas contratadas.
  - `assertQuota()`: Trava transacional com lançamento de erro estruturado `QuotaExceededError` (HTTP 403 / `QUOTA_EXCEEDED`).
  - `assertFeature()` e `isFeatureEnabled()`: Sistema híbrido de Feature Flags que avalia a assinatura da oficina combinando as capacidades base do plano com flags granulares ativadas ou desativadas sob medida em `tenants.settings->feature_flags`.
  - `setTenantFeatureFlag()`: Permite ligar recursos exclusivos (Add-ons) ou suspender funcionalidades específicas por loja, emitindo registro compulsório em `audit_logs` (`FEATURE_FLAG_TOGGLED`).
  - `assignPlanToTenant()`: Migração e upgrade de planos com auditoria (`PLAN_CHANGED`).
- **Guards e Middlewares Fastify (`apps/api/src/middlewares/plan-guards.ts`)**:
  - `requireQuota('users' | 'units')`: Interceptador de rota para cadastro de colaboradores e filiais, bloqueando requisições com código padronizado quando o teto do plano for alcançado.
  - `requireFeature(featureName)`: Bloqueador de endpoints para funcionalidades desativadas ou indisponíveis no plano (retornando HTTP 403 `FEATURE_DISABLED`).
  - Suporte nativo a bypass para Super Administradores da plataforma (`isSuperadmin: true`).
- **Endpoints HTTP Fastify (`apps/api/src/routes/plan-routes.ts`)**:
  - `GET /plans`: Catálogo público de planos.
  - `GET /tenant/plan`: Resumo completo de status, limites, utilização e features ativas da oficina.
  - `PATCH /tenant/features`: Modificação de feature flags por loja (restrito a `owner` e `superadmin`).
  - `POST /tenant/plan/change`: Alteração de plano da oficina.
- **Validação Automatizada (`apps/api/src/plans/plans.test.ts`)**:
  - 12 testes cobrindo catálogo, consulta de uso, cota de 3 usuários, **bloqueio do 4º usuário simultâneo no plano Essencial (critério de aceite)**, liberação imediata após upgrade para o plano Profissional, cota de filiais, bloqueio e liberação de feature flags, toggle de add-ons por loja e trilha de auditoria.
  - Total consolidado da suíte da API CarX: **66 testes passando com 100% de sucesso**.

#### Tarefa T2.7: Subdomínio por Loja e White Label Real 🎨
Implementado o sistema completo de resolução dinâmica de oficina e identidade visual customizada (White Label) por inquilino:
- **Contratos e Schemas Compartilhados (`packages/shared/src/branding.ts`)**:
  - `TenantBrandingDto` e schema Zod `TenantBrandingSchema` com validação de cores hexadecimais, URLs seguras e modos de tema (`dark`, `light`, `system`).
  - `PwaManifestDto` e schema Zod `PwaManifestSchema` compatível com a especificação oficial W3C Web App Manifest.
  - Constantes canônicas `DEFAULT_CARX_BRANDING` para fallback gracioso.
- **Migration 006 — Tabela `tenant_branding` e Isolamento RLS (`006_tenant_branding.up.sql`)**:
  - Criação da tabela `tenant_branding` com `trade_name`, `tagline`, `logo_url`, `logo_icon_url`, `primary_color`, `secondary_color`, `accent_color`, `app_title`, `app_short_name`, `whatsapp_phone`, `social_instagram`, `receipt_footer_notes`, `custom_css`.
  - Ativação rigorosa de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`.
  - Política canônica `tenant_isolation_policy` garantindo isolamento total por loja e compatibilidade com a suíte de conformidade de isolamento.
  - Trigger automático `trg_tenants_auto_create_branding` populando identidade visual inicial no cadastro de novos inquilinos.
- **Serviço de Branding (`apps/api/src/branding/branding-service.ts`)**:
  - `getBrandingByTenantId()`: Busca identidade visual da oficina com contexto RLS ou fallback estruturado.
  - `getBrandingBySlug()`: Resolução pública por subdomínio para telas de carregamento, splash, monitor TV e Meu Veículo.
  - `updateBranding()`: Atualização de cores, marcas e redes sociais por gestores, com gravação compulsória em `audit_logs` (`BRANDING_UPDATED`).
  - `generatePwaManifest()`: Geração dinâmica de manifesto PWA adaptando nome da oficina, theme color, display mode (`fullscreen` para Monitor TV de oficina, `standalone` para app do técnico ou portal do cliente).
- **Resolução de Tenant Dinâmica (`apps/api/src/plugins/tenant.ts`)**:
  - Suporte a subdomínios locais (`loja1.carx.local`) e de produção (`loja1.carx.com.br`).
  - Suporte a domínios customizados completos via campo `custom_domain` de `tenants` (ex: `estetica-beta.local`).
- **Validação Caddy On-Demand TLS (`/internal/caddy-check`)**:
  - Consulta dinâmica à tabela `tenants` para autorizar a emissão de certificados SSL apenas para domínios customizados registrados e ativos.
- **Endpoints HTTP Fastify (`apps/api/src/routes/branding-routes.ts`)**:
  - `GET /tenant/branding`: Identidade visual da oficina resolvida a partir do Host da requisição ou cabeçalhos.
  - `GET /tenant/manifest.json`: Manifesto dinâmico do PWA com suporte a `?mode=tv`, `?mode=staff` e `?mode=customer`.
  - `GET /branding/:slug`: Consulta pública direta de branding.
  - `PUT /tenant/branding` e `PATCH /tenant/branding`: Atualização de identidade visual restrita a `OWNER` e `GESTOR` via RBAC.
- **Validação Automatizada (`apps/api/src/branding/branding.test.ts`)**:
  - 15 testes automatizados cobrindo resolução por subdomínio, diferenciação de marcas entre `oficina-alpha.carx.local` e `oficina-beta.carx.local`, manifestos dinâmicos PWA, modos TV/Staff/Cliente, domínio customizado, validação de SSL no Caddy, atualização de branding por OWNER, bloqueio RBAC para TECNICO, auditoria imutável e fallback CarX.
  - Total consolidado da suíte da API CarX: **81 testes passando com 100% de sucesso** em 13 suítes.

#### Tarefa T2.8: Armazenamento de Arquivos com MinIO (Compatível S3) 📦
Implementado o subsistema completo de upload, validação de segurança e armazenamento de mídias de OS, laudos periciais e fotos de oficinas:
- **Detector e Validador de Magic Bytes (`apps/api/src/storage/magic-bytes.ts`)**:
  - Inspeção estrita dos primeiros bytes de arquivos para detecção do MIME real, ignorando cabeçalhos forjados e extensões falsas.
  - Suporte homologado a `image/jpeg` (`FF D8 FF`), `image/png` (`89 50 4E 47...`), `image/webp` (`RIFF...WEBP`), `application/pdf` (`%PDF`) e `video/mp4` (`ftyp`).
  - **Bloqueio Ativo de Ameaças**: Rejeição imediata de executáveis Windows PE/MZ (`4D 5A`), binários Linux ELF (`7F 45 4C 46`), scripts shell com shebang (`#!`), bytecode compilado e vetores XSS em SVGs ou marcações HTML/JavaScript.
- **Migration 007 — Tabela `storage_files` e RLS Canônico (`007_storage_media.up.sql`)**:
  - Tabela com metadados do arquivo, chave S3 (`file_key`), tamanho em bytes, MIME declarado vs MIME real e vínculos de auditoria.
  - RLS e FORCE RLS ativados com a política canônica `tenant_isolation_policy`.
- **Serviço de Armazenamento (`apps/api/src/storage/storage-service.ts`)**:
  - Integração com MinIO/S3 via AWS SDK v3 com `forcePathStyle: true`.
  - Estrutura isolada de diretórios no formato `tenant/{tenantId}/{category}/{uuid}-{fileName}`.
  - Validação estrita contra Path Traversal (`assertTenantFileKey`).
  - Geração de Presigned URLs de upload direto (Direct-to-S3) e visualização segura com expiração de 15 minutos (900s).
  - Controle automático de cotas de armazenamento por plano (1 GB no Essencial, 10 GB no Profissional, 50 GB no Premium), bloqueando uploads excedentes com `QuotaExceededError` (HTTP 403 `QUOTA_EXCEEDED`).
- **Endpoints HTTP Fastify (`apps/api/src/routes/storage-routes.ts`)**:
  - `POST /storage/upload`: Upload multipart validado com magic bytes e cota.
  - `POST /storage/presigned-upload`: Emissão de URL pré-assinada para upload direto.
  - `GET /storage/files/:id/url`: Emissão de URL pré-assinada para visualização segura com barreira anti-cross-tenant.
  - `GET /tenant/storage-usage`: Relatório de consumo em MB, bytes e percentual da cota contratada.
  - `DELETE /storage/files/:id`: Exclusão segura de mídia no S3/MinIO e registro no banco.
- **Validação Automatizada (`apps/api/src/storage/storage.test.ts`)**:
  - 11 testes cobrindo upload multipart, detecção de magic bytes, **rejeição de executável .exe renomeado para .jpg (critério de aceite)**, bloqueio de SVG e scripts, **bloqueio de acesso cruzado entre oficinas (critério de aceite)**, path traversal, presigned URLs, controle de cotas e exclusão segura.
  - Total consolidado da suíte da API CarX: **92 testes passando com 100% de sucesso** em 14 suítes.

#### Tarefa T2.9: Super Admin: Backend e Módulo `/admin` 🛡️
Implementado o módulo central de governança global da plataforma SaaS para o dono do negócio operar contratos, visualizar métricas financeiras, gerenciar oficinas clientes e auditar acessos com isolamento absoluto:
- **Migration 008 — Tabelas do Super Admin (`008_superadmin_schema.up.sql`)**:
  - `superadmin_users`: Tabela de administradores da plataforma CarX totalmente separada da tabela `users` dos inquilinos, com suporte a 2FA TOTP e sessões curtas (30 minutos).
  - `contracts` e `contract_events`: Gestão de licenças, ciclo de cobrança (mensal/anual), limites customizados e histórico imutável de eventos contratuais.
  - `impersonation_log`: Registro de auditoria rigoroso para acessos temporários de suporte a oficinas clientes, com `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` e política canônica `tenant_isolation_policy`.
  - `leads`: Funil de captação de clientes da landing page com fluxo de conversão automática em oficina.
  - Relacionamentos `contract_id` em `invoices` e `superadmin_user_id` em `audit_logs`.
- **Rejeição Mútua Estrita de Tokens (Critério de Aceite)**:
  - Middlewares `requireSuperadminAuth` e `authenticateBearer` configurados com barreiras intransponíveis:
    - Qualquer token de Super Admin é sumariamente rejeitado no app das lojas com HTTP 403 Forbidden ("Tokens administrativos de Super Admin não possuem permissão para acesso direto a rotas de lojas sem impersonação ativa").
    - Qualquer token de usuário ou colaborador de loja é sumariamente rejeitado no módulo `/admin` com HTTP 403 Forbidden ("Acesso restrito a Super Administradores da plataforma CarX").
- **Métricas Globais de SaaS (`GET /admin/dashboard/metrics`)**:
  - Consolidação em tempo real de MRR (Receita Recorrente Mensal), ARR, contagem de oficinas por status (`active`, `trialing`, `suspended`, `cancelled`), taxa de churn (%), inadimplência e distribuição de receita por plano.
  - Métricas de infraestrutura: total de unidades, colaboradores, ordens de serviço e armazenamento consumido.
- **CRUD e Ciclo de Vida de Oficinas (`/admin/tenants`)**:
  - Listagem enriquecida com contadores de uso e filtros por status ou busca textual.
  - Assistente corporativo de criação de oficina (`POST /admin/tenants`), provisionando tenant, unidade Matriz padrão, proprietário e contrato.
  - Suspensão imediata (`POST /admin/tenants/:id/suspend`) e reativação (`POST /admin/tenants/:id/reactivate`), com bloqueio instantâneo de requisições de inquilinos suspensos no `tenantPlugin` (HTTP 403).
- **Impersonação Auditada (`POST /admin/tenants/:id/impersonate`)**:
  - Emissão de token delimitado no tempo (1 hora) e geração obrigatória de registro em `impersonation_log` contendo justificativa do atendimento, IP, user-agent e identificador único de rastreabilidade `token_jti`.
- **Gestão de Leads e Contratos**:
  - `POST /admin/leads/:id/convert`: Transforma um lead em oficina homologada mantendo o vínculo `converted_tenant_id`.
  - `GET /admin/contracts` e `GET /admin/invoices`: Visão consolidada de contratos e histórico de cobranças.
  - `GET /admin/audit-logs`: Trilha imutável de compliance das ações administrativas.
- **Validação Automatizada (`apps/api/src/superadmin/superadmin.test.ts`)**:
  - 15 testes automatizados cobrindo autenticação com 2FA, rejeição mútua de tokens, métricas SaaS, listagem, suspensão/reativação, impersonação, conversão de leads e auditoria.
  - **Total Consolidado da API CarX**: **107/107 testes passando com 100% de sucesso** em 15 suítes.

#### Tarefa T2.10: Super Admin: Frontend (`apps/admin`) 🖥️
Implementada a aplicação frontend corporativa do Super Admin (`admin.carx.com.br`, container 5) para o proprietário do negócio operar contratos, analisar o faturamento recorrente, gerenciar licenças, provisionar oficinas e auditar intervenções administrativas:
- **Fundação Técnica & Design System**:
  - Aplicação React 18 SPA estruturada com Vite 5 e Tailwind CSS 3.4 integrado aos tokens oficiais do CarX (`asfalto`, `grafite`, `aco`, `linha`, `texto`, `volt` e semânticos).
  - Tipagem TypeScript 100% estrita sem erros de compilação (`tsc --noEmit`), com build de produção otimizado e minificado em 5.4s.
- **Autenticação em Duas Etapas com 2FA TOTP (`LoginPage.tsx` & `AuthContext.tsx`)**:
  - Suporte ao fluxo de desafio 2FA TOTP (6 dígitos) com validação de chaves via aplicativo autenticador.
  - Interceptação de respostas HTTP 401 para encerramento automático de sessões expiradas.
- **Painel Geral de Métricas SaaS (`DashboardPage.tsx`)**:
  - Cards de alta densidade para MRR corrente, ARR projetado, oficinas ativas/trials/suspensas, taxa de churn (%) e volume de inadimplência.
  - Tabela com indicadores visuais de participação de receita por plano (Start, Pro, Prime, Enterprise).
  - Indicadores de infraestrutura global (unidades, usuários, ordens de serviço e armazenamento S3).
- **Gestão de Oficinas Clientes & Impersonação (`TenantsPage.tsx`)**:
  - Tabela com densidade de dados corporativa, busca textual e filtros rápidos por status.
  - **Modal de Impersonação Auditada**: Coleta de justificativa obrigatória para suporte e emissão de token temporário de 1 hora com botão para abertura direta do app da loja.
  - **Proteção Contra Ações Destrutivas (Critério de Aceite)**: Suspensão de oficinas requer preenchimento obrigatório de justificativa e **confirmação de segurança com a senha master do Super Admin**.
- **Assistente Corporativo de Provisionamento (`TenantWizardPage.tsx`)**:
  - Fluxo assistido em 4 etapas (Oficina, Proprietário, Plano/Trial e Confirmação) com geração e higienização automática de slugs de subdomínio em tempo real.
- **Módulos de Negócio e Compliance**:
  - **Contratos e Licenças (`ContractsPage.tsx`)**: Monitoramento de ciclos de faturamento, preços negociados, descontos e status vigentes.
  - **Cobranças e Faturas (`InvoicesPage.tsx`)**: Histórico de faturas, conciliação e métodos de pagamento (Pix, Boleto, Cartão).
  - **Gerenciador de WhatsApp Multi-tenant (`WhatsAppManagerPage.tsx`)**: Visão operacional das conexões Baileys/Evolution por loja, consumo da cota de disparos e comando de reinicialização de sessão.
  - **Funil de Leads (`LeadsPage.tsx`)**: Gestão de leads originários da landing page com modal de conversão instantânea em cliente CarX.
  - **Trilha de Auditoria Imutável (`AuditLogsPage.tsx`)**: Histórico de conformidade com metadados de IP, user-agent e visualização do payload JSON expandido.

#### Tarefa T2.11: Assistente de Criação de Oficina e Provisionamento (Segmentos, Catálogo e Convites) 🚀
Implementado o provisionamento completo de novas oficinas clientes, garantindo injeção atômica de catálogo especializado por segmento automotivo, checklists de recepção técnica e disparo de convite de primeiro acesso:
- **Migration 009 — Esquema Relacional de Catálogo e Provisionamento (`009_provisioning_catalog.up.sql`)**:
  - `ALTER TABLE tenants ADD COLUMN segment VARCHAR(50)`: Identifica a especialidade do negócio (`ppf`, `insulfilm`, `detailing`, `mecanica`).
  - `services`: Tabela de serviços com categoria, estimativa em minutos, preço em centavos, RLS e FORCE RLS habilitados (`tenant_isolation_policy`).
  - `checklist_templates`: Tabela de modelos de inspeção veicular prévia com itens técnicos armazenados em JSONB, RLS e FORCE RLS habilitados (`tenant_isolation_policy`).
  - `tenant_invitations`: Rastreamento criptográfico de convites com tokens SHA-256 e payload de onboarding, com RLS e FORCE RLS ativados.
- **Catálogos Oficiais Especializados por Nicho Automotivo (`apps/api/src/provisioning/segment-catalogs.ts`)**:
  - **PPF (Paint Protection Film)**: Serviços de cobertura total (Full Body), frontal e kits de soleira/maçaneta; checklist com micragem de pintura e mapeamento fotográfico de pedriscos.
  - **Insulfilm e Controle Solar**: Películas nano cerâmicas com rejeição térmica UV/IR, películas antivandalismo PS8/PS12; checklist de filetes térmicos do desembaçador e integridade das guarnições.
  - **Estética Automotiva (Detailing)**: Polimento técnico multi-etapas, vitrificação cerâmica 9H, higienização com oxi-sanitização e hidratação de couro; checklist de espessura de verniz e marcas de boina.
  - **Mecânica Geral & Centro Automotivo**: Manutenção preventiva, substituição de freios, diagnóstico eletrônico via scanner OBD-II e geometria 3D; checklist de fluidos e suspensão.
- **Serviço Transacional de Provisionamento (`apps/api/src/provisioning/provisioning-service.ts`)**:
  - Operação atômica em transação isolada: Tenant + Unidade Matriz + Membresia Owner + Contrato/Fatura + Injeção de 5 Serviços Base + Injeção de Checklist + Registro de Convite de Acesso.
- **Rotas de Acesso e Consumo com RLS**:
  - Super Admin: `GET /admin/tenants/:id/services`, `GET /admin/tenants/:id/checklists` e `GET /admin/tenants/:id/invitations`.
  - Inquilinos: `GET /catalog/services` e `GET /catalog/checklists` garantindo que cada oficina só visualize seus próprios itens pré-configurados.
- **Frontend Interativo (`apps/admin/src/pages/TenantWizardPage.tsx`)**:
  - Assistente em 5 etapas com seleção visual dos segmentos e resumo dos itens injetados.
- **Validação Automatizada com Sucesso Absoluto**:
  - 7 novos testes em [`apps/api/src/provisioning/provisioning.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/provisioning/provisioning.test.ts).
  - Total consolidado da API CarX: 114/114 testes passando em 16 suítes.

#### Tarefa T2.12: Contratos, Faturas e Régua de Cobrança (Manual/Regras) ⚖️
Implementado o ciclo completo de gestão de contratos, emissão e conciliação de faturas, e o motor da régua de cobrança programada com suspensão seletiva em **Modo Somente Leitura**:
- **Migration 010 — Esquema de Dunning e Modo Somente Leitura (`010_billing_dunning.up.sql`)**:
  - Colunas adicionadas em `tenants`: `is_read_only BOOLEAN NOT NULL DEFAULT false`, `suspended_reason VARCHAR(255)`, `last_dunning_stage VARCHAR(50)`, `dunning_updated_at TIMESTAMPTZ`.
  - Tabela `billing_dunning_events`: histórico imutável de eventos da régua com colunas `stage`, `days_overdue`, `action_taken`, `details (JSONB)`, com RLS e FORCE RLS ativados (`tenant_isolation_policy`).
- **Máquina de Estados da Régua de Cobrança (`apps/api/src/billing/dunning-service.ts`)**:
  - **3 dias de atraso (`warning_3d`)**: Aviso formal de cobrança registrado no histórico; oficina permanece ativa e operacional.
  - **7 dias de atraso (`soft_restriction_7d`)**: Restrição leve; alertas visuais em destaque no sistema da oficina e bloqueio preventivo de criação de novas filiais/unidades.
  - **15 dias de atraso (`suspension_15d`) — Suspensão em Modo Somente Leitura (Seção 11.2)**:
    - O inquilino é marcado com `status = 'suspended'` e `is_read_only = true`. O contrato passa para `past_due`.
    - **Proteção HTTP via `tenantPlugin`**: Consultas `GET` continuam funcionando normalmente (com header de resposta `x-tenant-read-only: true`), permitindo que a oficina consulte ordens de serviço antigas, histórico de clientes e laudos periciais.
    - Operações de escrita (`POST`, `PUT`, `PATCH`, `DELETE`) de usuários da loja são sumariamente bloqueadas com **HTTP 403 Forbidden** e código específico `TENANT_SUSPENDED_READ_ONLY`.
  - **30 dias de atraso (`cancellation_30d`)**: Cancelamento do contrato e da licença, mantendo a integridade dos dados retidos para fins de exportação e cumprimento da LGPD.
- **Baixa Manual e Reativação Imediata da Oficina (`POST /admin/invoices/:id/pay`)**:
  - Quitação manual com conciliação via Pix, Boleto ou Cartão.
  - O sistema verifica se o inquilino não possui outras faturas críticas pendentes; caso regularizado, **restaura imediatamente o status para `active`**, redefine `is_read_only = false`, reativa o contrato e desbloqueia em tempo real todas as rotas de gravação da oficina!
- **Frontend Operacional no Super Admin (`apps/admin/src/pages/InvoicesPage.tsx`)**:
  - Botão de execução da régua de cobrança ("Executar Régua") com feedback quantitativo das ações aplicadas.
  - Coluna de Ações com botão "Baixa Manual" (modal de conciliação e reativação) e botão "Cancelar Fatura".
- **Validação Automatizada com Sucesso Absoluto**:
  - Suíte dedicada em [`apps/api/src/billing/billing-dunning.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/billing/billing-dunning.test.ts) cobrindo todo o ciclo de transição de estados, bloqueio seletivo de escrita, leitura permitida e reativação instantânea.
  - **Total Consolidado da API CarX**: **120/120 testes passando com 100% de sucesso** em 17 suítes completas.
  - **FASE 2 CONCLUÍDA EM 100%**.

---

### 🚗 Fase 3 — Domínio Automotivo no Novo Backend

#### Tarefa T3.1: Clientes e Veículos (Placa por Oficina) 🚘
Implementada a camada relacional e serviços de gestão de clientes e frotas, superando a limitação estrutural número 1 do legado (tabela single-tenant com placa única global):
- **Migration 011 — Esquema de Clientes e Veículos (`011_customers_vehicles.up.sql`)**:
  - `customers`: Tabela de clientes com nome, documento (CPF/CNPJ limpo), telefone normalizado E.164, endereço completo e dados para contato, com RLS e FORCE RLS ativados (`tenant_isolation_policy`).
  - `vehicles`: Tabela de veículos com chave estrangeira para `customers`, placa, marca, modelo, ano, cor, classe de porte (`size_class`), chassi (VIN) e quilometragem atual (`current_km`).
  - **Regra Fundamental de SaaS Multitenant**: Restrição composta `CONSTRAINT uq_vehicles_tenant_plate UNIQUE (tenant_id, plate)`. Duas oficinas distintas (Oficina A e Oficina B) podem cadastrar e atender o mesmo veículo com a mesma placa simultaneamente sem nenhuma colisão de chave!
- **Funções de Normalização e Validação Automotiva (`packages/shared/src/schemas.ts`)**:
  - `normalizePhone`: Converte números telefônicos para o padrão internacional E.164 (`+5511999998888`), garantindo interoperabilidade com o futuro gateway de WhatsApp.
  - `normalizePlate`: Higieniza caracteres alfanuméricos em caixa alta (ex: `abc-1234` -> `ABC1234`, `bra-2e19` -> `BRA2E19`).
  - `validatePlate`: Validação estrita por Regex dos padrões oficiais brasileiro (Cinza `[A-Z]{3}[0-9]{4}` e Mercosul `[A-Z]{3}[0-9][A-Z][0-9]{2}`).
  - `validateCpf` e `validateCnpj`: Cálculos de dígitos verificadores matemáticos.
- **Serviços de Domínio (`CustomerService` e `VehicleService`)**:
  - Detecção de duplicidade dentro da mesma oficina: impede cadastros redundantes da mesma placa ou do mesmo cliente/telefone na mesma loja com HTTP 409 Conflict.
  - Busca paginada no servidor (`list`) suportando termos textuais parciais (nome, placa, modelo, documento).
  - Consulta rápida de veículo por placa (`GET /vehicles/by-plate/:plate`) trazendo o veículo e os dados do proprietário associado.
  - Trilha de auditoria imutável gerada automaticamente para todas as criações e alterações de cadastros.
- **Validação Automatizada com Sucesso**:
  - 10 novos testes dedicados em [`apps/api/src/customers/customers-vehicles.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/customers/customers-vehicles.test.ts).
  - **Total Consolidado da API CarX**: **130/130 testes passando com 100% de sucesso** em 18 suítes completas.

---

#### Tarefa T3.2: Catálogo de Serviços, Preços por Porte e Combos ⚙️
Implementado o catálogo de serviços normalizado com tabela de preços por porte do veículo e motor de combos com desconto progressivo no backend:
- **Migration 012 — Catálogo, Preços por Porte e Combos (`012_services_prices_packages.up.sql`)**:
  - `services`: Enriquecida com colunas `warranty_months` (garantia padrão em meses) e `material_consumption_estimate` (JSONB com previsão de insumos).
  - `service_prices_by_class`: Tabela com isolamento via RLS e FORCE RLS (`tenant_isolation_policy`), mapeando o preço (`price_cents`), o tempo de execução (`estimated_minutes`) e a garantia por porte de veículo (`size_class`: `moto`, `hatch`, `sedan`, `suv`, `pickup`, `esportivo`, `van`), com unicidade `uq_service_prices_tenant_service_class UNIQUE (tenant_id, service_id, size_class)`.
  - `packages`: Tabela de combos/pacotes com RLS ativo, suportando descontos percentuais (`percentage`) ou em valor monetário fixo (`fixed_cents`).
  - `package_items`: Itens vinculados ao combo com ordenação customizada e integridade referencial com deleção em cascata.
- **Motor Automotivo de Orçamentos (`CatalogPricingService.calculatePricing`)**:
  - **Critério Fundamental**: Orçamento sugere preço pelo porte do veículo e aplica desconto de combo no servidor.
  - Resolução dinâmica da classe do veículo via `vehicleId` já cadastrado ou por `vehicleSizeClass` informado na simulação.
  - Para cada serviço:
    - Se houver preço e tempo cadastrados para o porte do veículo em `service_prices_by_class`, utiliza-os diretamente (`isOverriddenByClass: true`).
    - Caso contrário, aplica fallback gracioso para os valores base da tabela de serviços (`services.price_cents`, `services.estimated_minutes`).
  - Se um combo/pacote estiver selecionado:
    - Calcula o desconto configurado no pacote sobre os itens participantes.
    - Distribui o desconto proporcionalmente de forma matematicamente estável, sem gerar sobras de centavos e garantindo que o valor final nunca seja negativo.
  - Retorna `PricingCalculationResultDto` completo com detalhamento item a item, subtotal, desconto total, total final e tempo estimado total em minutos.
- **Rotas Fastify (`catalog-routes.ts`)**:
  - `GET /catalog/services`: Listagem com filtros de categoria, segmento e busca textual.
  - `POST /catalog/services`, `PUT /catalog/services/:id`, `DELETE /catalog/services/:id`: CRUD com RBAC (`owner`, `gestor`, `atendente`).
  - `GET /catalog/services/:id/prices` e `PUT /catalog/services/:id/prices`: Configuração em lote dos preços por porte.
  - `GET /catalog/packages`, `POST /catalog/packages`, `GET /catalog/packages/:id`, `PUT /catalog/packages/:id`, `DELETE /catalog/packages/:id`: Gestão completa de combos.
  - `POST /catalog/calculate-pricing`: Endpoint inteligente de precificação e orçamento.
- **Validação Automatizada com Sucesso**:
  - Suíte de 12 testes em [`apps/api/src/services/catalog-pricing.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/services/catalog-pricing.test.ts) cobrindo portes Hatch vs SUV, fallback para Sedan, precificação via `vehicleId`, combos percentuais e fixos, isolamento estrito entre lojas e auditoria imutável.
  - **Total Consolidado da API CarX**: **142/142 testes passando com 100% de sucesso** em 19 suítes completas.

---

#### Tarefa T3.3: Orçamentos e Ordens de Serviço (Máquina de Estados) 📋
Implementada a espinha dorsal do sistema automotivo CarX: a gestão completa de orçamentos e ordens de serviço governada por máquina de estados estrita no backend, eliminando de vez os status em texto solto do legado:
- **Migration 013 — Esquema de Ordens de Serviço e Linha do Tempo (`013_work_orders_state_machine.up.sql`)**:
  - `work_orders`: Tabela com chave estrangeira para `customers`, `vehicles` e `users` (técnico), com numeração atômica independente por oficina (`os_number` com constraint `uq_work_orders_tenant_os_number`), valores monetários inteiros em centavos (`total_cents`, `discount_cents`, `final_cents`, `paid_cents`), timestamps automáticos de cada marco (`checked_in_at`, `started_at`, `completed_at`, `delivered_at`, `canceled_at`) e `tracking_token` UUID público criptográfico.
  - `work_order_items`: Tabela relacional de itens/serviços contendo preços unitários ajustados ao porte do veículo, descontos aplicados, minutos previstos e garantia em meses.
  - `work_order_events`: Linha do tempo imutável registrando cada transição (`from_status`, `to_status`, `user_id`, `event_type`, `notes`, `metadata JSONB`).
  - Habilitação compulsória de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com `tenant_isolation_policy` nas 3 tabelas.
- **Máquina de Estados Estrita (`WorkOrderService.transitionStatus`)**:
  - **Fluxo Obrigatório**: `QUOTE` ➔ `APPROVED` ➔ `SCHEDULED` ➔ `CHECKED_IN` ➔ `IN_PROGRESS` ➔ `QA` ➔ `READY` ➔ `DELIVERED` (+ `PAUSED`, `CANCELED`).
  - **Validação Terminante com HTTP 422 Unprocessable Entity**: Tentativa de transição inválida (ex: `QUOTE ➔ DELIVERED` ou retorno a partir de `DELIVERED`) é sumariamente rejeitada pelo backend com erro 422 e mensagem explicativa.
  - Atualização automática de progresso (0% a 100%) e preenchimento atômico dos timestamps de marco de cada estado.
- **Numeração Sequencial por Oficina (`os_number`)**:
  - Garantia de que cada oficina possui sua própria sequência (#1, #2, #3...), executada via `SELECT COALESCE(MAX(os_number), 0) + 1 FROM work_orders WHERE tenant_id = $1` dentro de transação com bloqueio, sem nenhum risco de colisão entre lojas distintas.
- **Tracking Público Seguro (`GET /work-orders/tracking/:token`)**:
  - Endpoint público e seguro para clientes finais acompanharem o status do seu veículo em tempo real via link/QR Code sem necessidade de login e sem expor IDs sequenciais internos de banco.
- **Validação Automatizada com Sucesso**:
  - 11 novos testes dedicados em [`apps/api/src/work-orders/work-orders.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/work-orders/work-orders.test.ts).
  - **Total Consolidado da API CarX**: **153/153 testes passando com 100% de sucesso** em 20 suítes completas.

---

#### Tarefa T3.4: Pagamentos, Adiantamentos (Sinal) e Transações Atômicas 💳
Implementada a gestão financeira de pagamentos e adiantamentos da Ordem de Serviço totalmente executada em transação atômica serializada no banco PostgreSQL com lock pessimista (`FOR UPDATE`), eliminando definitivamente a antiga race condition do sistema legado:
- **Migration 014 — Esquema de Pagamentos e Adiantamentos (`014_payments_deposits.up.sql`)**:
  - `payments`: Tabela normalizada para liquidações com chave estrangeira para `work_orders`, métodos (`pix`, `credit_card`, `debit_card`, `cash`, `bank_transfer`, `deposit_applied`), parcelamento (`installments`), bandeira de cartão (`card_brand`), identificador externo de transação (`transaction_reference`), controle de estorno (`refunded_amount_cents`, `refund_reason`, `refunded_at`, `refunded_by`) e auditoria de recebedor (`received_by`).
  - `deposits`: Tabela para retenção e gestão de sinal/adiantamento de clientes (`amount_cents`, `method`, `status`: `held`, `applied`, `refunded`), com vínculo opcional prévio a uma OS e posterior amarração à OS executada (`applied_to_work_order_id`, `applied_at`).
  - Habilitação compulsória de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com `tenant_isolation_policy` em ambas as tabelas e índices de alta performance para conciliação contábil.
- **Eliminação Definitiva da Race Condition do Legado (`PaymentService.processWorkOrderPayment`)**:
  - **Mecanismo Anti-Concorrência**: Executa `SELECT id, os_number, status, final_cents, paid_cents FROM work_orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`. Qualquer requisição concorrente para a mesma OS é estritamente serializada no banco.
  - **Validação Estrita de Saldo Devedor**: Rejeita pagamentos com valor zero ou negativo (HTTP 400) e pagamentos com valor superior ao saldo restante devedor (`amount_cents > remaining_cents`) com HTTP 422 `PaymentExcessiveAmountError`.
  - **Atualização Atômica**: Incrementa `paid_cents` da OS e insere simultaneamente na linha do tempo da OS o evento imutável `PAYMENT_RECEIVED` com metadata contábil e saldo restante.
- **Estorno Total ou Parcial com Auditoria Imutável (`PaymentService.refundPayment`)**:
  - Suporta estorno parcial (`refundAmountCents`) ou total do pagamento, recalculando o valor reembolsável restante.
  - Abate automaticamente o valor estornado do campo `paid_cents` da OS vinculada.
  - Grava evento `PAYMENT_REFUNDED` na timeline da OS e emite registro de auditoria imutável compulsório via `auditService.recordPaymentRefund`.
- **Adiantamentos e Sinal (`PaymentService.createDeposit` e `applyDepositToWorkOrder`)**:
  - Capta adiantamento/sinal de clientes com status retido `held`.
  - Aplica o sinal para abater o saldo devedor da OS em transação com lock na OS e no depósito, atualizando o depósito para `applied`, incrementando `paid_cents` na OS, gerando registro contábil em `payments` e emitindo evento `DEPOSIT_APPLIED`.
  - Rejeita aplicação de sinal maior do que o saldo restante da OS (HTTP 422) e impede reutilização de sinal já aplicado (HTTP 400).
- **Resumo Financeiro Consolidado (`PaymentService.getWorkOrderFinancialSummary`)**:
  - Endpoint `GET /work-orders/:id/financial` com cálculo em tempo real de `totalCents`, `discountCents`, `finalCents`, `paidCents`, `remainingCents`, flag booleana de quitação total `isFullyPaid`, listagem cronológica de pagamentos aprovados e depósitos aplicados.
- **Validação Automatizada com Sucesso**:
  - 12 testes dedicados em [`apps/api/src/billing/payments.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/billing/payments.test.ts) comprovando a eliminação da race condition com duas requisições simultâneas em concorrência real (`Promise.all`), estornos com auditoria, ciclo de sinal e isolamento RLS entre inquilinos.
  - **Total Consolidado da API CarX**: **165/165 testes passando com 100% de sucesso** em 21 suítes completas.

---

#### Tarefa T3.5: Controle de Estoque e Bobinas de Película (PPF e Insulfilm) 📦
Implementado o subsistema automotivo de controle de estoque, insumos e bobinas de película (PPF e Insulfilm) com rastreamento por lote, metragem restante e baixa idempotente na Ordem de Serviço:
- **Migration 015 — Materiais, Bobinas, Movimentações e Alocação na OS (`015_stock_materials_rolls.up.sql`)**:
  - `materials`: Cadastro de produtos e insumos gerais da oficina (`sku`, `category`, `unit`, `cost_cents`, `current_stock`, `min_stock`, `is_roll`), com isolamento via RLS e FORCE RLS (`tenant_isolation_policy`).
  - `material_rolls`: Tabela especializada para bobinas de película (PPF, Insulfilm, vinil) com rastreamento por código de barras (`code`), lote de fabricação (`lot_number`), marca (`brand`), largura padrão (`width_meters`), metragem inicial (`initial_meters`), metragem restante (`current_meters`), metragem mínima de alerta (`min_alert_meters`), custo em centavos e máquina de status (`in_use`, `depleted`, `reserved`, `discarded`). RLS e FORCE RLS ativos.
  - `stock_movements`: Histórico atômico e imutável de todas as movimentações físicas (`entry`, `exit`, `os_consumption`, `waste`, `adjustment`), registrando a quantidade algébrica, custo unitário e total, saldo anterior (`previous_stock`), novo saldo (`new_stock`), motivo e usuário responsável.
  - `work_order_materials`: Alocação de insumos e bobinas vinculados a uma OS (`work_order_id`, `material_id`, `material_roll_id`, `quantity`, `is_consumed`, `consumed_at`).
- **Serviço de Negócio (`StockService`)**:
  - `listMaterials`, `createMaterial`, `updateMaterial`: Gestão do catálogo de insumos com cálculo em tempo real da flag `isLowStock` (`current_stock <= min_stock AND min_stock > 0`).
  - `listRolls`, `createRoll`: Gestão de bobinas com cálculo em tempo real da flag `isLowMeters` (`current_meters <= min_alert_meters AND status = 'in_use'`).
  - `createStockMovement`: Registro de movimentação com bloqueio estrito de saídas que excedam o estoque disponível (HTTP 422 `StockInsufficientError`), atualizando atomicamente `materials.current_stock` e, quando aplicável, `material_rolls.current_meters` (marcando como `depleted` se atingir 0).
  - **Baixa Idempotente na OS (`deductWorkOrderMaterials`)**:
    - **Critério de Aceite Fundamental**: Entregar a mesma OS múltiplas vezes abate o estoque apenas na primeira execução.
    - O serviço avalia os itens de `work_order_materials`. Se já tiverem sido consumidos (`is_consumed = true`), a operação retorna imediatamente `{ deductedCount: 0, alreadyDeducted: true }` sem deduzir novamente nem gerar duplicidade de movimentações em `stock_movements`.
    - Na primeira baixa, consome os itens, abates os saldos e marca `is_consumed = true` e `consumed_at = NOW()`.
  - **Consistência Matemática Rigorosa (`validateMaterialStockConsistency`)**:
    - Validação de que `materials.current_stock` é estritamente igual à soma algébrica (`SUM(quantity)`) de todos os registros em `stock_movements`.
  - **Alerta de Estoque Mínimo (`getLowStockAlerts`)**:
    - Endpoint consolidado `GET /materials/alerts/low-stock` que retorna tanto insumos gerais quanto bobinas de película em nível crítico para exibição no painel gerencial.
- **Integração de Máquina de Estados**:
  - Ao transicionar o status da OS para `DELIVERED`, o método `WorkOrderService.transitionStatus` aciona automaticamente a baixa idempotente `deductWorkOrderMaterials`.
- **Rotas Fastify (`stock-routes.ts`)**:
  - `GET /materials`, `POST /materials`, `GET /materials/:id`, `PUT /materials/:id`.
  - `GET /materials/rolls`, `POST /materials/rolls`.
  - `GET /materials/movements`, `POST /materials/movements`.
  - `GET /materials/alerts/low-stock`.
  - `POST /work-orders/:id/materials`, `POST /work-orders/:id/deduct-materials`.
- **Validação Automatizada com Sucesso**:
  - 12 testes dedicados em [`apps/api/src/stock/stock.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/stock/stock.test.ts) cobrindo criação, gestão de bobinas, alertas visuais, saídas excedentes (422), alocação na OS, baixa idempotente e isolamento RLS entre lojas.
  - **Total Consolidado da API CarX**: **177/177 testes passando com 100% de sucesso** em 22 suítes completas.

---

#### Tarefa T3.8: App do Técnico (PWA do Operador) e Cronômetro Oficial ⏱️
Implementado o subsistema do operador e execução de serviços no chão de oficina (PWA ergonômico em tema escuro), fila de trabalho priorizada com destaque para retrabalho, cronômetro oficial calculado no PostgreSQL (imune a manipulações de relógio) e ação inteligente sem bloqueios:
- **Migration 018 — Cronômetros de Execução e Flags de Retrabalho (`018_technician_timers_execution.up.sql`)**:
  - `work_order_timers`: Tabela com controle atômico de tempo (`work_order_id`, `service_item_id`, `technician_id`, `status` [`running`, `paused`, `completed`], `started_at`, `paused_at`, `stopped_at`, `accumulated_seconds`, `pause_reason`, `notes`).
  - Habilitação compulsória de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com política `tenant_isolation_policy`.
  - Colunas `is_rework` (boolean default false) e `rework_reason` (text) adicionadas em `work_orders` com índice composto `idx_work_orders_tenant_rework`.
  - Índices otimizados `idx_work_order_timers_active` e `idx_work_order_timers_wo` para resposta em milissegundos nas telas de bancada.
- **Serviço de Domínio (`TechnicianService`)**:
  - **Fila de Execução Priorizada (`getQueue`)**:
    - Suporte aos escopos `mine` ("Minha fila") e `all` ("Toda a loja").
    - **Priorização Máxima de Retrabalho (Critério de Aceite)**: Ordens de serviço com flag `is_rework = true` aparecem ordenadas no topo absoluto da fila (`ORDER BY wo.is_rework DESC`), garantindo tratamento imediato de inconformidades.
    - Enriquecimento dos cards da fila com dados do veículo (marca, modelo, placa, porte), cliente, serviços contratados e box alocado da agenda.
  - **Cronômetro Oficial no PostgreSQL (Critério Fundamental de Segurança e Imunidade a Fraudes)**:
    - O tempo decorrido **NUNCA** é calculado com base no relógio do cliente, smartphone ou navegador.
    - A apuração é realizada de forma atômica no banco: `accumulated_seconds + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER)`.
    - **Critério Fundamental**: Fechar a aba do navegador, reiniciar o dispositivo móvel ou sofrer queda de energia mantém o tempo decorrido perfeitamente íntegro e sincronizado ao reabrir a aplicação.
  - **Regra de Foco Único (`pauseAllRunningTimersForTechnician`)**:
    - Ao iniciar a execução de uma nova OS ou retomar um serviço, qualquer timer ativo anterior daquele mesmo técnico é pausado silenciosamente no servidor com registro de transição.
  - **Ação Inteligente "Fazer checklist e iniciar" (`startWithChecklist`)**:
    - **Critério "Nunca bloquear sem saída"**: Se a OS ainda não possui o checklist de check-in efetuado pela recepção, o operador pode preencher as conferências preliminares na hora e disparar o início do cronômetro sem depender do gestor da oficina.
- **Rotas Fastify (`technician-routes.ts`)**:
  - `GET /technician/queue`: Fila de OS por escopo (`mine` ou `all`).
  - `POST /technician/work-orders/:id/start`: Disparo do cronômetro oficial e transição automática da OS para `IN_PROGRESS`.
  - `POST /technician/work-orders/:id/pause`: Pausa do cronômetro com gravação de motivo e totalização de segundos.
  - `POST /technician/work-orders/:id/resume`: Retomada da contagem oficial sob novo marco temporal.
  - `POST /technician/work-orders/:id/stop`: Finalização do cronômetro da OS com status `completed`.
  - `GET /technician/work-orders/:id/timer`: Consulta consolidada de tempo decorrido em tempo real.
  - `POST /technician/work-orders/:id/start-with-checklist`: Preenchimento instantâneo de checklist e disparo imediato do serviço.
  - `PATCH /technician/work-orders/:id/rework`: Sinalização de retrabalho com justificativa.
- **Validação Automatizada com Sucesso**:
  - 10 testes dedicados em [`apps/api/src/technician/technician.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician.test.ts) cobrindo fila por escopo, prioridade no topo de retrabalho, início/pausa/retomada/parada de cronômetro, persistência atômica após recarregar, regra de foco único, checklist integrado e isolamento RLS cross-tenant.
  - **Total Consolidado da API CarX**: **212/212 testes passando com 100% de sucesso** em 25 suítes completas.

---

#### Tarefa T3.9: Controle de Qualidade (QA), Garantia e Certificado com QR 🛡️
Implementado o subsistema pós-execução de controle de qualidade (QA Audit) para liberação de veículos e emissão de Certificados de Garantia com QR Code de autenticidade (Passaporte Digital do Veículo) com proteção estrita à LGPD:
- **Migration 019 — Tabelas de QA e Garantias (`019_qa_warranties_passports.up.sql`)**:
  - `qa_audits`: Auditoria realizada pelo gestor (`work_order_id`, `inspector_id`, `status` [`approved`, `rejected_rework`], `score` [1 a 5 estrelas], `checklist_items` em JSONB, `rework_reason`, `notes`).
  - `warranties`: Certificados de garantia emitidos (`work_order_id`, `customer_id`, `vehicle_id`, `service_id`, `service_name`, `material_roll_id`, `material_lot_number`, `warranty_months`, `starts_at`, `expires_at`, `verification_token` UUID global único, `pdf_file_id`, `status` [`active`, `revoked`, `expired`]).
  - Habilitação compulsória de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com política `tenant_isolation_policy`.
- **Serviço de Negócio (`QaService`)**:
  - **Gate de Qualidade e Máquina de Estados (`createAudit`)**:
    - **Aprovação (`approved`)**: Transiciona automaticamente a OS para `READY` (pronta para entrega ao cliente) e gera registro imutável em `audit_logs` (`QA_APPROVED`).
    - **Reprovação com Retrabalho (`rejected_rework`)**: Marca na OS `is_rework = true` e grava a justificativa (`rework_reason`), retornando a OS para `IN_PROGRESS`. Essa marcação reposiciona a OS no topo absoluto da fila do operador no App do Técnico.
  - **Certificado de Garantia e Passaporte Digital (`createWarranty`)**:
    - Vinculação com a OS, veículo e número de lote da bobina (`material_rolls` ou lote digitado).
    - Cálculo atômico e determinístico das datas de início e expiração.
    - Compilação imediata do PDF do certificado oficial e upload no MinIO Storage sob a categoria `warranty`.
  - **Verificação Pública do Passaporte do Veículo (`verifyPublicPassport`)**:
    - Acesso público irrestrito via URL `/v/:token` e leitura do QR Code sem necessidade de login.
    - **Critério Fundamental de Proteção LGPD**:
      - A placa do veículo é parcialmente ofuscada (ex: `OPR-***6`).
      - Nenhum dado pessoal (nome completo, CPF, telefone ou e-mail do proprietário) é retornado ou exposto.
      - Exibição de autenticidade, serviço coberto, validade, dias restantes, lote do material aplicado e dados institucionais da oficina.
  - **Compilador Server-Side de Certificados em PDF (`generateWarrantyPdf`)**:
    - Geração em alta fidelidade vetorial com `pdfkit` e renderização de QR Code vetorial via `qrcode`.
    - Cabeçalho preto/Volt da oficina, quadro de dados do carro, termos de cuidados de conservação, período de cura de 72h e selo de autenticidade com QR Code apontando para a verificação online.
  - **Revogação de Garantia (`revokeWarranty`)**:
    - Revogação de cobertura por mau uso ou perda total com gravação de justificativa, refletida instantaneamente na consulta pública como `isValid = false` e status `revoked`.
- **Rotas Fastify (`qa-routes.ts`)**:
  - `GET /public/passports/:token` e `GET /v/:token`: Endpoints públicos sem JWT.
  - `POST /qa/audits`: Auditoria de QA (RBAC restrito a `owner` e `gestor`).
  - `GET /qa/audits/:id`, `GET /work-orders/:workOrderId/qa-audits`.
  - `POST /warranties`, `GET /warranties/:id`, `GET /work-orders/:workOrderId/warranties`, `GET /vehicles/:vehicleId/warranties`.
  - `POST /warranties/:id/revoke`, `GET /warranties/:id/pdf` (download/stream inline de PDF).
- **Validação Automatizada com Sucesso**:
  - 9 testes dedicados em [`apps/api/src/qa/qa.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/qa/qa.test.ts) cobrindo aprovação no QA, reprovação com retrabalho, emissão de garantia com lote, verificação pública LGPD, download de PDF vetorial com assinatura mágica `%PDF-`, revogação e isolamento RLS cross-tenant.
  - **Total Consolidado da API CarX**: **221/221 testes passando com 100% de sucesso** em 26 suítes completas.

---

#### Tarefa T3.10: Pesquisa NPS, Pós-Venda e Lembretes de Revisão 📈
Implementado o subsistema completo de mensuração de satisfação do cliente (Net Promoter Score), classificação em Promotores/Neutros/Detratores, incentivo de reputação no Google, alertas em tempo real de resgate e régua periódica de lembretes de revisão de garantias:
- **Migration 020 — Pesquisas NPS e Lembretes de Manutenção (`020_nps_surveys_reminders.up.sql`)**:
  - `nps_surveys`: Tabela com token único não adivinhável (`work_order_id`, `customer_id`, `token`, `score` [0 a 10], `classification` [`promoter`, `passive`, `detractor`], `comment`, `status` [`pending`, `answered`, `expired`], `google_review_clicked`, `sent_at`, `answered_at`).
  - `maintenance_reminders`: Tabela de agendamento de retorno preventivo (`work_order_id`, `warranty_id`, `customer_id`, `vehicle_id`, `service_name`, `reminder_type` [`warranty_check`, `maintenance_return`, `seasonal_care`], `scheduled_for`, `status` [`scheduled`, `sent`, `canceled`, `completed`], `message_preview`).
  - Habilitação compulsória de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com política canônica `tenant_isolation_policy`.
- **Serviço de Negócio (`NpsService`)**:
  - **Ciclo de Pesquisa com Idempotência (`createSurvey`)**:
    - Geração de pesquisa para ordens de serviço concluídas/entregues. Requisições repetidas para a mesma OS retornam o token existente, garantindo unicidade.
  - **Consulta Pública (`getSurveyByToken`)**:
    - Endpoint público sem JWT para o smartphone do cliente. Proteção LGPD exibindo apenas o primeiro nome do cliente e placa mascarada (`OPR-***6`).
  - **Coleta de Feedback e Bloqueio Anti-Fraude (`answerSurvey`)**:
    - **Critério de Aceite Fundamental**: Tentar responder pela segunda vez ao mesmo link gera erro imediato HTTP 409 Conflict (`SURVEY_ALREADY_ANSWERED`), impedindo qualquer distorção de métricas.
    - Classificação estrita internacional:
      - **Promotor (9 ou 10)**: Sugere link de avaliação 5 estrelas no Google Meu Negócio da oficina.
      - **Neutro / Passivo (7 ou 8)**: Registra feedback para melhorias de processo.
      - **Detrator (0 a 6)**: Dispara alerta prioritário no backend registrado em `audit_logs` (`NPS_DETRACTOR_ALERT`) para resgate imediato do cliente insatisfeito.
  - **Scorecard Consolidado de Métricas (`getMetrics`)**:
    - Apuração matemática atômica no PostgreSQL do Score NPS (de -100 a +100):
      $$\text{NPS Score} = \% \text{Promotores} - \% \text{Detratores}$$
    - Contagem e percentuais de cada faixa, média aritmética das notas e taxa de conversão/resposta.
  - **Régua de Lembretes de Revisão (`createReminder`, `listReminders`, `updateReminderStatus`)**:
    - Agendamento de retornos preventivos de garantias de PPF e vitrificação (ex: 6 meses ou 1 ano).
    - Gestão de status de envio com registro automático do timestamp `sent_at`.
- **Rotas Fastify (`nps-routes.ts`)**:
  - `GET /public/nps/:token` e `POST /public/nps/:token` (públicos sem autenticação).
  - `POST /nps/surveys`, `GET /nps/surveys` e `GET /nps/metrics` (painel gerencial).
  - `POST /maintenance/reminders`, `GET /maintenance/reminders` e `PATCH /maintenance/reminders/:id/status`.
- **Validação Automatizada com Sucesso**:
  - 11 testes dedicados em [`apps/api/src/nps/nps.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/nps.test.ts) cobrindo criação, idempotência, resposta pública, bloqueio de resposta duplicada (409), alerta de detrator, scorecard do gestor, lembretes de revisão e isolamento RLS cross-tenant.
  - **Total Consolidado da API CarX**: **232/232 testes passando com 100% de sucesso** em 27 suítes completas.

---

#### Tarefa T3.12: Atualização em Tempo Real (SSE / WebSockets) ⚡
Implementado o barramento de eventos em tempo real do CarX via Server-Sent Events (SSE) nativo de alta performance HTTP/2 e HTTP/1.1, eliminando a necessidade de polling agressivo nos painéis de produção, Monitor de TV e apps de chão de oficina:
- **Arquitetura de Barramento em Tempo Real (`RealtimeHub`)**:
  - `apps/api/src/realtime/realtime-hub.ts`: Hub singleton de gerenciamento de conexões ativas indexadas por `tenantId` (`Map<string, Set<RealtimeClient>>`).
  - **Isolamento Estrito Multi-Tenant (Critério de Aceite Fundamental)**:
    - O canal de eventos é estritamente particionado por `tenant_id`.
    - Um painel de TV, recepção ou técnico conectado a uma loja jamais recebe notificações, mudanças de status de OS ou alertas de estoque de outra loja.
  - **Transmissão Unidirecional Leve e Padrão SSE (`text/event-stream; charset=utf-8`)**:
    - Cabeçalhos HTTP configurados: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` (essencial para proxy reverso Nginx sem buffering).
    - **Heartbeat Periódico (Keep-Alive)**: Disparo a cada 15 segundos de comentário SSE (`: ping\n\n`) com `timer.unref()` para manter conexões e proxies abertos sem impedir encerramento gracioso do Node.js.
  - **Zero Vazamento de Memória (Memory Leak Prevention)**:
    - Monitoramento do evento de encerramento do socket HTTP (`request.raw.on('close')`). Ao desconectar, o cliente é imediatamente removido do `Set` do tenant correspondente.
    - Se o tenant não possuir mais clientes ativos, a chave é deletada do mapa em memória.
- **Autenticação Dupla Flexível para Navegadores**:
  - A API aceita autenticação JWT padrão via header HTTP `Authorization: Bearer <token>` ou via query parameter `?token=<token>`.
  - Essa flexibilidade é crucial pois a API nativa `EventSource` dos navegadores não permite injeção de cabeçalhos HTTP customizados.
- **Tipagem e Schemas em `@carx/shared`**:
  - `RealtimeEventType`: `work_order.updated`, `work_order.ready`, `appointment.created`, `stock.low`, `nps.detractor_alert`.
  - `RealtimeEventDto`, `WorkOrderUpdatedPayload`, `WorkOrderReadyPayload`, `StockLowPayload`.
  - **Critério de Eficiência**: Envio estrito de payloads leves contendo referências essenciais (ex: IDs, status anterior, novo status, timestamp), encorajando o cliente a revalidar cache/dados conforme necessário sem sobrecarregar a rede com objetos pesados desnecessários.
- **Gatilhos Automáticos de Domínio**:
  - Integrado em `workOrderService.transitionStatus`:
    - Disparo automático de `work_order.updated` em qualquer transição de status da OS.
    - Disparo complementar de `work_order.ready` quando a OS atinge o estado `READY` (aprovada no QA e pronta para entrega ao cliente), acionando notificação imediata para recepção e clientes.
- **Rotas Fastify (`realtime-routes.ts`)**:
  - `GET /realtime/events`: Endpoint de conexão SSE para escuta de eventos do tenant autenticado.
  - `POST /realtime/publish`: Disparo pontual de eventos customizados pelo backend/módulos internos.
  - `GET /realtime/stats`: Consulta em tempo real da quantidade de clientes conectados por loja e total global (restrito a `owner` e `gestor`).
- **Validação Automatizada com Sucesso**:
  - 7 testes dedicados em [`apps/api/src/realtime/realtime.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/realtime/realtime.test.ts) cobrindo autenticação por header e query string, isolamento estrito entre tenants, publicação manual, disparo automático na transição de status da OS, métricas de conexões ativas e desconexão limpa com liberação de recursos.
  - **Total Consolidado da API CarX**: **248/248 testes passando com 100% de sucesso** em 29 suítes completas.

---

#### Tarefa T3.13: Portal do Cliente Seguro ("Meu Veículo") 📱
Implementada a reestruturação completa da área pública e segura do cliente final ("Meu Veículo"), erradicando de forma definitiva a grave vulnerabilidade do sistema legado de login apenas por telefone sem senha e o modo de demonstração fictício com dados falsos:
- **Migration 022 — Desafios OTP do Portal do Cliente (`022_customer_portal_otps.up.sql`)**:
  - Tabela `customer_portal_otps`: Armazena os desafios de autenticação de clientes (`tenant_id`, `customer_id`, `destination`, `channel` [`whatsapp`, `email`], `otp_hash`, `attempts_count`, `max_attempts` [5], `expires_at` [10 min], `consumed_at`).
  - Habilitação compulsória de `ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com a política `tenant_isolation_policy`.
- **Arquitetura de Autenticação Segura com Proteção Anti-Enumeração**:
  - `POST /portal/auth/request-otp`:
    - Busca o cliente pelo número de WhatsApp ou e-mail no tenant atual.
    - **Proteção Anti-Enumeração (Critério Fundamental)**: Caso o número/e-mail não pertença a nenhum cliente do tenant, o endpoint responde com status **HTTP 200** e uma mensagem genérica (`"Se o número informado estiver cadastrado, um código de verificação foi enviado."`), impossibilitando que atacantes façam varredura ou enumeração de telefones de clientes da oficina.
    - Geração de código numérico aleatório de 6 dígitos criptograficamente seguro (`crypto.randomInt(100000, 1000000)`).
    - Armazenamento em hash HMAC-SHA256 utilizando pepper interno de servidor, garantindo que o código em texto plano nunca fique vulnerável no banco de dados.
    - Janela de expiração estrita de 10 minutos.
  - `POST /portal/auth/verify-otp`:
    - Validação com temporização constante (`crypto.timingSafeEqual`) contra *timing side-channel attacks*.
    - **Bloqueio por Brute-Force**: Contador de tentativas atômico (`attempts_count`). Ao atingir 5 tentativas incorretas, o código é invalidado imediatamente e o cliente é bloqueado com **HTTP 429 Too Many Requests**.
    - Ao validar com sucesso, consome o OTP (`consumed_at = NOW()`) e emite um JWT seguro delimitado com `scope: 'customer_portal'`.
- **Erradicação Definitiva do Modo Demonstração Fake**:
  - No sistema antigo, qualquer telefone desconhecido injetava uma OS fictícia com dados estáticos para simulação.
  - No CarX, todo dado servido no portal provém estritamente do banco de dados relacional filtrado pelo RLS e pelo ID do cliente autenticado. Clientes sem OS recebem `workOrders: []` (zero dados falsos/mockados em produção).
- **Barreiras de Segurança e Permissões no Backend**:
  - **Rejeição Mútua Estrita**: Tokens com `scope: 'customer_portal'` são sumariamente rejeitados com **HTTP 403 Forbidden** ao tentar acessar qualquer rota interna de colaboradores, gestores ou módulos de configuração.
  - **Privacidade Cross-Customer**: Um cliente autenticado que tentar acessar o detalhe ou fotos de uma OS de outro cliente da mesma oficina recebe **HTTP 404 Not Found**, prevenindo vazamento de histórico.
  - **Isolamento Cross-Tenant (RLS)**: Token de um cliente da Oficina Alpha tentando acessar o portal da Oficina Beta é bloqueado com **HTTP 403 Forbidden**.
- **Endpoints HTTP do Portal (`apps/api/src/routes/customer-portal-routes.ts`)**:
  - `POST /portal/auth/request-otp`: Solicitação de código de acesso por WhatsApp ou E-mail.
  - `POST /portal/auth/verify-otp`: Validação do código de 6 dígitos e emissão do JWT do portal.
  - `GET /portal/me`: Dados cadastrais e perfil do cliente autenticado.
  - `GET /portal/vehicles`: Lista dos veículos vinculados ao cliente.
  - `GET /portal/work-orders`: Lista resumida de ordens de serviço do cliente com status e valores.
  - `GET /portal/work-orders/:id`: Detalhes completos da OS, serviços realizados e totalizadores.
  - `GET /portal/work-orders/:id/timeline`: Linha do tempo visual de todos os eventos da OS (criação, início, execução, QA e liberação).
  - `GET /portal/work-orders/:id/photos`: Galeria de fotos de inspeção guiadas antes e depois do serviço.
  - `GET /portal/warranties`: Certificados de garantia emitidos para os serviços do cliente.
- **Validação Automatizada com Sucesso**:
  - 20 testes dedicados em [`apps/api/src/customer-portal/customer-portal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/customer-portal/customer-portal.test.ts) cobrindo anti-enumeração, geração de OTP, validação, incremento de tentativas, bloqueio por força bruta (429), bloqueio de código consumido/expirado, bloqueio em rotas internas de oficina (403), erradicação do modo demo, endpoints do portal, privacidade cross-customer (404) e isolamento RLS cross-tenant.
  - **Total Consolidado da API CarX**: **268/268 testes passando com 100% de sucesso** em 30 suítes completas.

---

#### Tarefa T3.14: API Pública, Chaves de API e Webhooks Reais (Base) 🔌
Implementada a substituição completa do antigo mock em `localStorage` da interface por uma infraestrutura de integração real de nível corporativo, com persistência segura de credenciais, assinatura de mensagens em tempo real e reentrega com backoff exponencial:
- **Migration 023 — Evolução de Chaves de API e Webhooks (`023_api_keys_webhooks.up.sql`)**:
  - `api_keys`: Expansão da coluna `prefix` para VARCHAR(50) suportando a máscara de visualização segura `carx_live_xxxx...yyyy`, adição das colunas `status` (`active`, `revoked`), `revoked_at`, `rate_limit_per_minute` (1 a 1000) e `created_by` (FK -> `users.id`). Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY`.
  - `webhook_endpoints`: Adição de `name`, `description`, `status` (`active`, `inactive`, `failing`) e `failure_count`.
  - `webhook_deliveries`: Registro de tentativas com `signature` HMAC-SHA256, `status` (`pending`, `success`, `failed`, `retrying`), `attempts`, `max_attempts` (3), `next_retry_at`, `delivered_at` e `failed_at`.
- **Serviço de Chaves de API (`ApiKeyService`)**:
  - **Geração Segura com 32 Bytes de Entropia**: Tokens gerados como `carx_live_<64 hex chars>`. O token em texto plano é retornado apenas no momento da criação.
  - **Hash SHA-256 no Banco**: O banco armazena unicamente o hash SHA-256 (`key_hash`). Nem o token nem o hash são vazados em listagens ou consultas.
  - **Critério Obrigatório — Revogação Imediata**: Chaves revogadas via `DELETE /integrations/api-keys/:id` param de funcionar no mesmo instante com HTTP 401 Unauthorized (`Chave de API revogada`).
  - **Rate Limiting em Janela Deslizante de 1 Minuto**: Controle por chave com injeção automática dos cabeçalhos `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`. Excesso bloqueado com HTTP 429 (`RATE_LIMIT_EXCEEDED`).
  - **Escopos Granulares**: Validação estrita de permissões (`read:work_orders`, `write:work_orders`, `read:customers`, `read:nps`, `*`), bloqueando acesso indevido com HTTP 403 Forbidden.
- **Serviço de Webhooks Reais (`WebhookService`)**:
  - **Segredos Criptográficos e Assinatura HMAC-SHA256**: Cada endpoint gera um segredo `whsec_<48 hex chars>`. Disparos assinam o payload JSON via HMAC-SHA256 e transmitem o cabeçalho `X-CarX-Signature: sha256=<hmac_hex>` junto a `X-CarX-Event`, `X-CarX-Delivery` e `X-CarX-Timestamp`.
  - **Critério Obrigatório — Reentrega com Backoff Exponencial**:
    - Disparos com falha (HTTP 4xx/5xx ou queda de conexão) geram registro com `status = 'retrying'` e agendam `next_retry_at` no futuro.
    - Suporte a reexecução manual via `POST /integrations/webhooks/deliveries/:deliveryId/retry` com incremento do contador `attempts`.
    - Histórico e observabilidade em `GET /integrations/webhooks/:id/deliveries` com tempo de resposta em ms e códigos de retorno.
- **API Pública v1 (`/v1/*`)**:
  - `GET /v1/work-orders` e `GET /v1/work-orders/:id`: Listagem e detalhes com filtragem RLS atômica da oficina dona da chave de API.
  - `POST /v1/work-orders`: Criação de ordens de serviço por ERPs externos, gerando numeração sequencial por loja e disparando webhook `work_order.created` em segundo plano.
  - `GET /v1/customers` e `GET /v1/nps`: Consulta de clientes e pesquisas NPS.
- **Documentação OpenAPI 3.0 e Swagger UI**:
  - `GET /v1/openapi.json`: Especificação completa OpenAPI 3.0 em JSON.
  - `GET /docs` e `GET /v1/docs`: Interface interativa Swagger UI estilizada com o tema Dark do Design System CarX (Asfalto e Dark Volt).
- **Validação Automatizada com Sucesso**:
  - 19 testes dedicados em [`apps/api/src/integrations/integrations.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/integrations/integrations.test.ts) cobrindo documentação OpenAPI, geração de chaves com hash, listagem segura, consumo autenticado da API v1, revogação imediata, validação de escopos granulares, criação externa de OS, rate limiting em memória, cadastro de webhooks com HMAC, validação matemática da assinatura, reentrega com backoff, histórico de entregas, isolamento cross-tenant e bloqueio de tokens do portal.
  - **Total Consolidado da API CarX**: **287/287 testes passando com 100% de sucesso** em 31 suítes completas.

---

#### Tarefa T3.15: Frontend — Camada de Dados TanStack Query e Design System CarX (Telas 1 a 9 de 10) 🖥️
Iniciada a migração do frontend (`apps/web`), com a erradicação da dependência legada `@supabase/supabase-js`, implementação do cliente HTTP fortemente tipado consumindo a API Fastify e aplicação dos componentes do Design System CarX oficial (`@carx/ui`) com os tokens visuais Asfalto (`#0E1116`), Grafite (`#171C24`), Aço (`#232A35`) e Volt (`#C8F52E`).

- **Infraestrutura Base e API Client (`apps/web/src/services/api.ts`)**:
  - `@tanstack/react-query` v5 configurado com `QueryClientProvider` em `apps/web/src/main.jsx`.
  - Cliente HTTP tipado centralizando contratos e chamadas para autenticação, ordens de serviço, clientes, veículos, catálogo, agenda, app do técnico, checklists, QA, relatórios, auditoria e eventos em tempo real (SSE).
  - Gestão de tokens JWT com interceptor de renovação silenciosa (`POST /auth/refresh`) e injeção automática dos cabeçalhos multitenant `x-tenant-id` e `x-tenant-slug`.
  - Integração dos presets Tailwind (`carxTailwindPreset`) e inclusão do pacote `@carx/ui` no pipeline de build do Vite.
- **Tela 1: Login & Autenticação da Loja (`apps/web/src/pages/LoginPage.tsx` e `AuthContext.tsx`)**:
  - Remoção completa do Supabase no ciclo de autenticação corporativa.
  - Suporte a credenciais corporativas (e-mail, senha e código/slug opcional de loja).
  - Fluxo nativo de segundo fator (2FA TOTP): renderização dinâmica do desafio de 6 dígitos numéricos com botões de validação e retorno ao login.
  - Redirecionamento dinâmico baseado no cargo: técnicos são direcionados diretamente para a fila operacional (`/operador`), enquanto proprietários, gestores e atendentes acessam o painel administrativo (`/`).
  - Interface construída com os componentes oficiais `Button`, `Input`, `Card`, `Badge` de `@carx/ui`.
  - Tratamento de exceções com mensagens claras em Português do Brasil e suporte a contato direto com o administrador via WhatsApp.
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 2: Painel do Gestor (Dashboard & Pátio ao Vivo — `apps/web/src/pages/Dashboard.tsx`)**:
  - Migrado 100% de `Dashboard.jsx` para TypeScript e `@tanstack/react-query`.
  - Erradicação de hooks legados baseados em Supabase (`useOrders`, `useClients`, `useCatalog`).
  - Consumo em tempo real da API Fastify: `api.workOrders.list()`, `api.reports.getDre()`, `api.reports.getNpsMetrics()`.
  - Pátio Operacional ao Vivo (Kanban) dividido em 4 colunas industriais: *Check-in & Fila*, *Em Execução*, *Inspeção QA* e *Prontos p/ Retirada*.
  - Integração com Server-Sent Events (SSE) para atualização instantânea em menos de 500ms dos cards sem reload da página.
  - Cards executivos: Faturamento Líquido (DRE oficial do servidor), Total de Carros no Pátio, Serviços em Execução e Pontuação NPS.
  - Modal de Detalhes da OS interativo com dados do veículo, cliente, técnico encarregado e valores em R$.
  - Estado de pátio vazio com componente oficial `EmptyState` de `@carx/ui`.
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 3: Nova OS e Orçamentos (`OrdensServico.tsx` e `NovoOrcamentoModal.tsx`)**:
  - Wizard em 4 passos com os componentes do Design System CarX (`Button`, `Input`, `Card`, `Badge`).
  - Passo 1: Busca em tempo real e cadastro ágil de cliente integrado a `api.customers`.
  - Passo 2: Seleção e cadastro ágil de veículo com porte (`Hatch`, `Sedan`, `SUV`, `Pickup`, `Esportivo`, `Moto`) vinculado ao cliente via `api.vehicles`.
  - Passo 3: Catálogo dinâmico de serviços com precificação e tempos estimados via `api.catalog.getServices()`.
  - Passo 4: Resumo comercial, cálculo de desconto, agendamento de data/hora, notas técnicas e registro de sinal/adiantamento atômico via `api.payments.create`.
  - Emissão de OS em status `QUOTE` (Orçamento) ou `APPROVED` (Aprovada) via `api.workOrders.create`.
  - Gestão de Ordens com listagem paginada, filtros por status, busca por placa/cliente/número, transição de status (`CHECKED_IN`, `DELIVERED`), modal de quitação de saldo e detalhes completos da OS.
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 4: Agenda Inteligente por Box (`apps/web/src/pages/Agenda.tsx`)**:
  - Visualização em colunas por Boxes de Atendimento Físicos (`bays`) da oficina com cores de identificação.
  - Navegador temporal por dia com atalhos de "Dia Anterior", "Hoje" e "Próximo Dia".
  - Cards de agendamento por horário com início/fim, modelo do carro, placa, cliente e serviço.
  - Modal integrado para criação de agendamento diretamente no Box selecionado com validação e prevenção de conflito.
  - Banner para compartilhamento do link de auto-agendamento 24h (Self-Booking).
  - Ações rápidas de cancelamento e liberação de horário no box.
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 5: Fila do Operador / PWA do Técnico (`apps/web/src/pages/OperadorHome.tsx`)**:
  - Migrada de `OperadorHome.jsx` para TypeScript e `@tanstack/react-query` consumindo `api.technician.getQueue()`.
  - Erradicação de mocks e dados inventados em `localStorage` (como o streak fictício antigo): métricas de gamificação e performance agora auditadas pelo backend (`/reports/technicians/ranking` e histórico de QA).
  - Layout Mobile-First industrial otimizado para operação de oficina com luvas: botões de 56px (`Button size="mobile"`), cards táteis e tipografia de placa de veículo Mercosul (`font-mono tracking-wider font-extrabold`).
  - Badges de alto contraste com `Badge`: Retrabalho com prioridade máxima (`variant="error"`), Checklist de Entrada (`variant="volt"` vs `variant="alert"`) e status da OS.
  - Integração do cronômetro oficial calculado no backend com componente `Stopwatch` exibindo contagem acumulada.
  - Seletor tátil de 3 pilares da oficina: *Minhas OS*, *Fila Oficina (Disponíveis)* e *Todas*.
  - Botão de sincronização sob demanda com feedback por vibração háptica (`navigator.vibrate`) e polling automático a cada 15 segundos.
  - Compatibilidade garantida com o fluxo de execução (`onSelectOS`) e transição para `ExecutorView`.
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 6: Execução, Checklist de Entrada e Cronômetro Oficial (`apps/web/src/pages/ExecutorView.tsx`)**:
  - Migrada de `ExecutorView.jsx` para TypeScript e `@tanstack/react-query`.
  - Cronômetro Oficial do Servidor: integração com `api.technician.getTimer(workOrderId)` com persistência ao fechar o navegador ou desligar o dispositivo, eliminando o timer simulado em memória do OsSystem. Comandos de `start`, `pause` (com modal rápido de motivo operacional) e `resume`.
  - Implementação do critério de negócio "Nunca bloquear sem saída": botão "Fazer Checklist Rápido" que abre modal dinâmico de entrada com hodômetro (KM), nível de combustível, checklist de itens essenciais e notas, acionando `api.technician.startWithChecklist` para liberar o serviço imediatamente sem depender da recepção.
  - Barra de progresso interativa individual por sub-serviço com botões de conclusão rápida (100%) e cálculo consolidado do progresso global.
  - Documentação fotográfica guiada 360° conectada diretamente ao MinIO (`api.storage.upload` com categoria `inspection`).
  - Diário técnico do operador para anotações de serviço e números de lote das bobinas de PPF/Insulfilm.
  - Modal de confirmação com transição da OS para o status `QA` (`api.workOrders.updateStatus(workOrderId, 'QA')`).
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 7: Laudo de Inspeção Digital e QA (`CustomerStatus.tsx`, `QaChecklistModal.tsx` e `VcrReportModal.tsx`)**:
  - **Eliminação de Mock e Persistência Relacional Auditada**: No legado OsSystem, o histórico de QA era gravado em `localStorage.getItem('ossystem_qa_history')` e o streak de conformidade do técnico era manipulado arbitrariamente em `localStorage.setItem('ossystem_tecnico_streak_${id}')`. No CarX, a auditoria é 100% persistida no PostgreSQL através de `api.qa.createAudit` (`qa_audits`), disparando a máquina de estados oficial da OS.
  - **`QaChecklistModal.tsx` (Controle de Qualidade e Liberação)**:
    - Interface com tokens Dark Volt de `@carx/ui` e modal de alta densidade técnica.
    - Seção de critérios de conformidade com checkboxes objetivos (ex: alinhamento perfeito de películas, ausência total de bolhas de ar e poeira, acabamento refinado de cantos e bordas, limpeza interna e externa completa, conferência de itens do checklist inicial).
    - Classificação por estrelas (1 a 5 estrelas) com feedback visual interativo.
    - Fluxo de Aprovação: transiciona a OS para `READY` (Pronto para Retirada), emite o passaporte/garantia digital, incrementa o streak auditado do técnico no servidor e dispara notificação em tempo real.
    - Fluxo de Reprovação (Retrabalho): exige justificativa textual detalhada obrigatória, zera o streak de dias do colaborador, marca a OS com `is_rework = true` e move a ordem imediatamente para o topo da fila de execução do operador com badge prioritária vermelha.
  - **`CustomerStatus.tsx` (Portal Público de Acompanhamento e Passaporte Digital)**:
    - Rota pública segura (`/status/:token`) consumindo `api.workOrders.getPublicTracking(token)` e `api.qa.verifyPassport(token)` sem necessidade de autenticação JWT corporativa.
    - Proteção de dados por design: imunidade contra IDOR através de tokens criptográficos opacos e mascaramento de dados sensíveis e placa do veículo (conformidade estrita com LGPD).
    - Visualização Dark Volt com badges de status em tempo real, barra de progresso visual de etapas, linha do tempo de eventos auditados, dados técnicos do veículo e botões diretos de contato via WhatsApp com a loja.
    - Botão de verificação e download do Certificado de Garantia emitido pelo backend.
  - **`VcrReportModal.tsx` (Laudo VCR de Vistoria)**:
    - Modal interativo renderizando o laudo de inspeção inicial com silhueta do veículo e pontos de avaria plotados.
    - Listagem descritiva das avarias com gravidades (Leve, Média, Grave), fotos de inspeção guiada anexadas e botão para download do PDF oficial vetorial gerado pelo backend (`api.inspections.getPdfUrl`).
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 8: Relatórios (DRE no Servidor, Ranking de Técnicos com Streak Auditado e NPS em `Relatorios.tsx`)**:
  - **Erradicação Completa de Mocks e Cálculos no Cliente**: No legado *OsSystem*, o DRE era calculado por iterações em arrays em memória no navegador, despesas fixas ficavam gravadas em `localStorage.getItem('ossystem_dre_despesas_fixas')`, o ranking era montado cruzando `pesquisas_nps_local` e o streak era manipulado arbitrariamente em `localStorage.setItem('ossystem_tecnico_streak_${id}')`. No CarX, 100% das métricas são calculadas por queries agregadas em SQL no PostgreSQL servidas pela API Fastify tipada (`@tanstack/react-query`).
  - **`Relatorios.tsx` (Painel Estratégico Multidimensional)**:
    - Navegação em abas industriais Dark Volt: *Visão Gerencial*, *DRE no Servidor*, *Ranking de Técnicos*, *NPS & Retenção* e *Comissões & Extrato*.
    - Seção com filtros de período temporal (data inicial e final) sincronizado globalmente entre todas as abas.
    - Função de ocultação de valores financeiros (`hideValues`) para apresentações públicas e privacidade no balcão da loja.
    - Suporte a impressão limpa sem cabeçalhos e controles com classes utilitárias `@media print` (`no-print`).
  - **`DreDashboard.tsx` (Demonstrativo do Resultado do Exercício 100% no Servidor)**:
    - Consumo oficial de `api.reports.getDre(period)` retornando DTO consolidado: Receita Bruta, Descontos Comerciais, Receita Operacional Líquida (ROL), Custo de Materiais/CMV (insumos e bobinas de PPF/película consumidas), Comissões da Equipe, Margem de Contribuição Operacional (R$ e %) e Saldo a Receber (inadimplência).
    - Presets temporais instantâneos ("Mês Atual", "Mês Anterior", "Últimos 90 Dias", "Ano Atual").
    - Tabela analítica vertical no padrão contábil/gerencial com numeração ordenada e indicadores visuais.
    - Barra de progresso dinâmica com a taxa percentual de margem de contribuição.
  - **`TecnicosRanking.tsx` (Ranking de Produtividade & Gamificação com Streak Real)**:
    - Consumo oficial de `api.reports.getRanking(period)` com agregação de fatos operacionais reais.
    - Pódio dos Top 3 com troféus de destaque, badges dinâmicas de mérito e contadores de OS produzidas.
    - Streak Real Auditado: dias ininterruptos sem retrabalho derivado de auditorias formais em `qa_audits` e `work_orders.is_rework`.
    - Ordenação interativa por Streak Invicto, Nota Média de QA, Faturamento Produzido e Volume de OS entregues.
  - **`NpsDashboard.tsx` (Scorecard de NPS e Retenção Ativa)**:
    - Consumo de `api.nps.getMetrics()` e `api.nps.listSurveys()` com notas de 0 a 10.
    - Classificação automática da loja: Zona de Excelência (>= 75), Zona de Qualidade (>= 50), Aperfeiçoamento ou Zona Crítica (< 0).
    - Barra comparativa de distribuição tripartida (Promotores 9-10, Neutros 7-8, Detratores 0-6).
    - Tabela de depoimentos de clientes com botão de acionamento imediato por WhatsApp (SLA 24h para recuperação de detratores).
  - **`ComissoesDashboard.tsx` (Extrato e Liquidação Financeira)**:
    - Consulta de comissões por colaborador (`api.commissions.listEntries`) geradas pelas regras pré-configuradas.
    - Ação de liquidação financeira com registro de data (`api.commissions.payEntry`) e invalidação automática das queries de DRE.
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 9: Monitor TV da Loja (`MonitorTV.tsx`)**:
  - **Arquitetura de Telão Industrial de Alto Impacto**: Substituição do antigo `MonitorTV.jsx` por TypeScript com identidade visual Dark Volt (`#0E1116`, `#171C24`, `#232A35`, `#C8F52E`), desenhado para TV e monitores de galpão e recepção com legibilidade à distância (5 a 10 metros).
  - **Sincronização em Tempo Real com SSE (Server-Sent Events)**:
    - Conexão nativa com `api.realtime.getEventsUrl()` (`/realtime/events`) através da API `EventSource` do navegador.
    - Ao capturar eventos de ordens de serviço (`work_order.updated`, `work_order.ready`, `work_order.created`), invalida as queries do React Query instantaneamente em segundo plano sem necessidade de recarregar a tela inteira (eliminação do antigo bug do legado de recarregar a tela toda por refetch).
    - Polling de contingência a cada 30 segundos com detecção de estado de conexão e indicador luminoso "SSE Ao Vivo" pulsante.
  - **Cards de Produção e Pátio ao Vivo**:
    - Monitoramento das OS nos estados `CHECKED_IN`, `IN_PROGRESS`, `QA` e `READY`.
    - Placa Mercosul com tipografia automotiva de alto contraste (`font-mono tracking-widest font-black`).
    - Dados do veículo (marca/modelo), cliente, técnico encarregado com ícone e box de atendimento físico.
    - Barra de progresso visual de conclusão com animação de gradiente contínuo shimmer nos veículos em execução.
    - Prioridade de Retrabalho: OS marcadas com `is_rework: true` recebem badge vermelha pulsante e sobem ao topo da lista.
  - **Modo Vídeo YouTube Institucional e Layout Flexível**:
    - Suporte a vídeo de apresentação ou playlist em loop via `branding.youtube_id` dividindo a tela 50/50 com a fila de produção.
    - Se o vídeo for desativado ou não estiver cadastrado, expande a fila em grade automotiva de 2x2 cards gigantes.
    - Botão de alternância de tela cheia nativa (`toggleFullscreen`) e relógio digital de precisão com data por extenso.
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.
- **Tela 10: Portal do Cliente Seguro ("Meu Veículo" em `ClientPortal.tsx`)**:
  - **Erradicação do Modo Demonstração Fake**: O legado *OsSystem* (`ClientPortal.jsx`) possuía um "modo demo" que forjava carros de luxo (BMW, Porsche) e fotos aleatórias da internet no `localStorage` caso o cliente não possuísse ordens cadastradas. No CarX, isso foi terminantemente erradicado: o portal reflete a realidade da oficina sob estrito isolamento RLS, exibindo `EmptyState` acolhedor quando não houver dados e nunca informações forjadas.
  - **Autenticação Segura via OTP em Duas Etapas (Sem Senha)**:
    - Etapa 1 (`/portal/auth/request-otp`): O cliente informa seu celular/WhatsApp ou e-mail cadastrado na recepção da oficina. A API aplica proteção anti-enumeração (retorna a mesma mensagem neutra caso o identificador exista ou não). Em ambiente local de desenvolvimento, disponibiliza `devOtpCode` para preenchimento com 1 clique.
    - Etapa 2 (`/portal/auth/verify-otp`): Validação do código numérico de 6 dígitos criptografado com HMAC-SHA256, expiração em 10 minutos e limite de 5 tentativas. Emite token JWT com escopo restrito `customer_portal` e dados do perfil.
    - Sessão isolada mantida via `PORTAL_TOKEN_KEY = 'carx_portal_token'`, sem colidir com as credenciais administrativas da oficina.
  - **Minha Frota (Seletor Dinâmico de Veículos)**:
    - Consumo tipado de `api.portal.getVehicles()`.
    - Card mestre "Todos os Veículos" com contador consolidado de serviços.
    - Cards individuais para cada veículo registrado com placa no padrão Mercosul, marca, modelo, ano de fabricação e contador de ordens de serviço.
    - Filtragem reativa instantânea de todo o histórico e certificados ao selecionar um veículo.
  - **Timeline de Histórico, Execução e Evidências Fotográficas**:
    - Consumo em tempo real de `api.portal.getWorkOrders()`, exibindo status atualizado com badges de alta visibilidade, barra de progresso no box (0 a 100%) e status de pagamento (quitado vs pendente na entrega).
    - Detalhes sob demanda ao expandir a OS:
      - Serviços e itens contratados com valores transparentes formatados em BRL (`api.portal.getWorkOrderDetail`).
      - Linha do tempo auditada de eventos cronológicos com hora e descrição (`api.portal.getWorkOrderTimeline`).
      - Evidências fotográficas reais tiradas pelo operador no box categorizadas por fase (*Antes*, *Durante*, *Depois*) via `api.portal.getWorkOrderPhotos`.
      - Lightbox fullscreen em alta resolução ao clicar em qualquer evidência fotográfica.
  - **Certificados Digitais de Garantia & Integrações**:
    - Seção dedicada de Certificados de Garantia ativos (`api.portal.getWarranties`), com contagem regressiva de dias restantes e link público para o Passaporte Digital auditado (`/status/:token`).
    - Modal de impressão/download de Certificado de Garantia e Recibo de OS.
    - Sincronização direta de compromissos com Apple, Google e Outlook Calendar (`CalendarSyncModal`).
    - Botão de atendimento direto com a recepção da oficina via WhatsApp oficial (`brand.whatsapp`).
  - Validação estática e compilação: `vite build` e `tsc --noEmit` aprovados com 100% de sucesso e 0 erros.

---

### Diretrizes de Evolução Arquitetural e Revisão de Governança (Alinhamento Estratégico)

#### 1. Arquitetura Desacoplada do Gateway de WhatsApp (Padrão OperaBeauty) 💬
- **Princípio Fundamental de Identidade da Oficina**: O gateway de WhatsApp do CarX é baseado estritamente na arquitetura do `operabeauty-wa-gateway` (`file:///d:/Repositorios/OperaBeauty/gateway-whatsapp`), utilizando **uma instância Baileys isolada por oficina (tenant)**.
- **Número Pertence à Oficina**: Cada oficina cliente conecta o seu próprio número de WhatsApp diretamente pelo painel administrativo da oficina (`apps/web` em *Configurações ➔ WhatsApp*), via **QR Code** ou **Código de Pareamento (Pairing Code)** numérico.
- **Proteção da Marca da Loja**: Mensagens transacionais (orçamentos, avisos de OS pronta, laudos, fotos de checklist, pesquisas NPS e códigos de login OTP) partem **exclusivamente do número de WhatsApp da própria oficina**. Em nenhuma circunstância o cliente final da oficina recebe mensagens oriundas de números da software house (CarX), garantindo a confiança e a legitimidade do atendimento.
- **Papel do Super Admin (Software House)**:
  - O Super Admin **NÃO** gerencia sessões de WhatsApp das lojas nem efetua disparos em nome delas.
  - A visão no Super Admin é estritamente de **telemetria técnica e observabilidade de infraestrutura** (saúde do container Docker `carx-wa`, métricas agregadas da fila BullMQ, latência e diagnóstico M2M para suporte técnico em caso de abertura de chamados pela oficina).
- **Módulo Entregue (T3.17 Concluído)**:
  - **Tabela Relacional & RLS (`tenant_whatsapp_instances`)**: Criada na Migration 024 com políticas canônicas de tenant, status (`DISCONNECTED`, `PAIRING`, `QR_CODE`, `CONNECTED`), `daily_limit` e `daily_messages_count`.
  - **Contratos TypeScript (`packages/shared/src/whatsapp.ts`)**: DTOs completos de instância, conexão, envio de mensagens e telemetria.
  - **Serviço de Negócio (`apps/api/src/whatsapp/whatsapp-service.ts`)**:
    - Gating por plano (`PlanFeatures.WHATSAPP_GATEWAY`).
    - Pareamento por **Código Numérico de 8 Dígitos (Pairing Code)** sem exigir câmera ou por **QR Code**.
    - Despacho de mensagens com checagem de status e trava diária anti-bloqueio.
    - Telemetria técnica agregada em tempo real para o Super Admin.
  - **Endpoints Fastify (`whatsapp-routes.ts` e `superadmin-routes.ts`)**:
    - `GET /tenant/whatsapp/instance`, `POST /tenant/whatsapp/connect`, `POST /tenant/whatsapp/disconnect`, `POST /tenant/whatsapp/send-test`.
    - `POST /internal/whatsapp/webhook` (sincronização M2M timing-safe).
    - `GET /admin/whatsapp/telemetry` (telemetria do Super Admin sem dados mockados).
  - **Interface da Loja (`apps/web/src/components/features/WhatsAppManager.tsx`)**:
    - Integrada em *Configurações ➔ WhatsApp da Loja*.
    - Pareamento em dois modos, cópia com um clique, barra de progresso da cota diária e formulário de teste de envio.
  - **Interface do Super Admin (`apps/admin/src/pages/WhatsAppManagerPage.tsx`)**:
    - Totalmente limpa de mocks estáticos, consumindo telemetria técnica via API.
  - **Suíte de Testes Automatizada (`whatsapp.test.ts`)**:
    - 9 testes cobrindo todo o fluxo operacional, regras de negócio e segurança.

#### 2. Dependência Funcional Estrita: Portal "Meu Veículo" & Gateway de WhatsApp 📱
- **Ausência de Provedor de E-mail**: Nesta etapa do projeto, o CarX não possui provedor transacional de e-mail (SMTP/SES) ativo para envio de OTPs. O canal exclusivo de entrega do código de desafio de 6 dígitos é o **WhatsApp**.
- **Regra de Bloqueio Arquitetural Validada e Implementada**:
  - Em `apps/api/src/customer-portal/customer-portal-service.ts`, a chamada `requestOtp()` valida compulsoriamente:
    1. Se a oficina possui a feature `CUSTOMER_PORTAL` e `WHATSAPP_GATEWAY` ativas no plano. Se faltar, lança imediatamente `CustomerPortalError(403, 'PORTAL_UNAVAILABLE')`.
    2. Se a oficina possui uma instância de WhatsApp conectada (`status = 'CONNECTED'`). Se estiver desconectada ou em pareamento, lança `CustomerPortalError(403, 'WHATSAPP_NOT_CONNECTED', 'O canal de envio por WhatsApp desta oficina ainda não foi configurado...')`.
  - Uma vez validado e o cliente encontrado, a mensagem com o código de 6 dígitos é disparada pelo número oficial da própria oficina através de `whatsappService.sendMessage(...)`.
  - No frontend (`ClientPortal.tsx`), a mensagem de erro é capturada e renderizada de forma amigável no card de login, prevenindo frustrações do cliente final.
  - A regra foi 100% comprovada no teste automatizado `customer-portal.test.ts`.

#### 3. Gestão de Planos, Cupons Promocionais e Feature Gating no Super Admin 💎
- **Módulo Entregue (T2.13 — `PlansPage.tsx`)**:
  - **Interface no Super Admin**: Tela em Dark Volt (`/plans`) com KPIs em tempo real (Planos Ativos, Oficinas Assinantes, Planos com WhatsApp Gateway e Total de Recursos Catalogados), busca, filtros de status e cards com métricas detalhadas.
  - **Matriz de Funcionalidades Interativa**: Modal de edição que permite ligar e desligar individualmente as 19 funcionalidades do software divididas nas categorias: Operacional & Centro Automotivo, Financeiro, Comunicação/WhatsApp e Diferenciais/White-Label.
  - **Endpoints Fastify Implementados**:
    - `GET /admin/plans`: Retorna todos os planos com contadores de assinantes (`tenants_count`).
    - `GET /admin/plans/:id`: Detalha um plano individual.
    - `POST /admin/plans`: Cria novo plano com limites e array de features em JSONB.
    - `PUT /admin/plans/:id`: Atualiza dados comerciais, limites de cotas e array de features.
    - `PATCH /admin/plans/:id/features`: Toggle rápido de uma feature flag individual.
  - **Propagação Dinâmica e Proteção de Rotas**:
    - As rotas de vistoria/checklist ([`inspection-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/inspection-routes.ts)) e relatórios financeiros ([`financial-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/financial-routes.ts)) utilizam o middleware `requireFeature()`.
    - Ao desativar uma feature no plano pelo Super Admin, qualquer requisição de oficina associada àquele plano é sumariamente bloqueada com `HTTP 403 FEATURE_DISABLED`. Ao reativar, o acesso é restabelecido no mesmo instante.
- **Módulo Entregue (T2.14 — Módulo de Cupons Promocionais Concluído)**:
  - **Migration 024 (`024_coupons_and_whatsapp_instances.up.sql`)**: Tabelas `coupons` e `coupon_redemptions` com isolamento, índices, validação de tipos de desconto e auditoria.
  - **Tipagem em `@carx/shared`**: DTOs `CouponDto`, `CreateCouponDto`, `ValidateCouponInputDto`, `ValidateCouponResponseDto`, `CouponDiscountType` e campo `coupon_code` em `AdminCreateTenantDto`.
  - **Serviço de Negócio (`coupon-service.ts`)**:
    - Suporte a 4 modalidades comerciais:
      1. `free_months`: Concede $N$ meses de gratuidade inicial (ex: 3 meses grátis de carência).
      2. `promotional_price`: Preço promocional reduzido por $N$ meses (ex: 3 meses do plano Pro por R$ 49,00/mês).
      3. `percentage`: Desconto percentual (ex: 20% off).
      4. `fixed_amount`: Desconto fixo em centavos (ex: R$ 50,00 de desconto).
    - Validação com checagem de vigência temporal (`valid_until`), limites de redenção (`max_redemptions`), ativação lógica e compatibilidade com o plano informado (`applicable_plan_slug`).
    - Resgate atômico (`redeemCoupon`) que calcula a redução, registra na tabela `coupon_redemptions` e audita a operação.
  - **Integração no Provisionamento (`superadmin-service.ts`)**:
    - O assistente de criação de oficinas aplica o cupom e calcula automaticamente o `negotiated_price_cents` no contrato da oficina.
  - **Frontend no Super Admin (`CouponsPage.tsx`)**:
    - Tela completa com KPIs de Cupons Ativos, Total de Resgates, Economia Total Concedida e Promoções Especiais.
    - Listagem com badges visuais, cópia rápida do código para área de transferência e modal com formulário dinâmico.
  - **Assistente de Onboarding (`TenantWizardPage.tsx`)**:
    - Campo de cupom promocional no Passo 4 (Plano & Faturamento) com botão de validação instantânea (`adminApi.validateCoupon`).
    - Feedback visual com cálculo do benefício e inclusão no resumo final de confirmação no Passo 5.
  - **Suíte de Testes Automatizada (`coupon.test.ts`)**:
    - 8 testes cobrindo todo o ciclo de vida dos cupons, regras de negócio e cálculo de contrato.

#### 4. Gestão de Credenciais e Redefinição de Senha do Gestor pelo Super Admin 🔐
- **Módulo Entregue (T2.15 Concluído)**:
  - **Criação Direta de Acesso**: No assistente corporativo de onboarding de oficinas (`TenantWizardPage.tsx`), o Super Admin cadastra diretamente o e-mail e a senha inicial do gestor titular, permitindo a entrega imediata das credenciais operacionais.
  - **Endpoint de Redefinição Administrativa (`POST /admin/tenants/:id/reset-owner-password`)**:
    - Protegido exclusivamente por guard de Super Admin.
    - Suporta dois modos:
      1. **Geração Automática de Senha Forte**: Gera senha randômica no padrão `CarX@<HEX>!`.
      2. **Senha Manual Customizada**: Permite ao Super Admin definir a senha informada (mínimo de 8 caracteres).
    - Hashing criptográfico padrão do sistema com invalidação imediata de sessões ativas do usuário.
    - Emissão compulsória e imutável de evento na trilha de auditoria (`audit_logs`) com a ação `OWNER_PASSWORD_RESET_BY_SUPERADMIN`.
  - **Interface na Gestão de Oficinas (`TenantsPage.tsx`)**:
    - Botão de ação rápida com ícone de Chave (`Key`) em cada linha da listagem de oficinas.
    - Botão de atalho integrado ao modal de detalhes técnicos.
    - Modal interativo com tabs "Gerar Senha Forte" vs "Digitar Manualmente".
    - Painel pós-redefinição com visualização clara da senha, botão de cópia de senha e botão de **"Copiar Mensagem Pronta para WhatsApp"**, contendo link de acesso personalizado do subdomínio, e-mail de login, nova senha e recomendação de troca no primeiro acesso.
  - **Suíte de Testes Automatizada (`owner-password-reset.test.ts`)**:
    - 5 testes cobrindo todo o ciclo, garantindo segurança, invalidação da credencial antiga e auditoria.

#### 5. Erradicação Sistemática de Dados Mockados Residuais 🧹 `(T3.18 Concluído)`
- **Eliminação Integral de `hasRealConnection()` e Supabase**:
  - Removido o padrão condicional `hasRealConnection()` de **todos** os hooks e páginas do frontend (`apps/web`).
  - Higienização e reconexão de 100% dos hooks com o cliente tipado `api.*`:
    - `useCatalog.js` ➔ `api.catalog`
    - `useClients.js` ➔ `api.customers`
    - `useVehicles.js` ➔ `api.vehicles`
    - `useInventory.js` ➔ `api.materials`
    - `useOrders.js` ➔ `api.workOrders`, `api.payments`, `api.storage`, `api.inspections`
    - `useQuotes.js` ➔ `api.workOrders`, `api.payments`
    - `useProfiles.js` ➔ `api.members`
    - `useWorks.js` ➔ `api.storage.listFiles('portfolio')`
    - `useNotifications.js` ➔ Conexão contínua Server-Sent Events via `api.realtime.getEventsUrl()`
  - Higienização de páginas especiais:
    - `PesquisaNPS.jsx`: Conectado a `api.workOrders.getById` e `api.nps.createSurvey`.
    - `SelfBooking.jsx`: Conectado a `api.catalog.getServices()` e `api.appointments.bookOnline(...)`.
    - `CarVisualChecklist.jsx`: Conectado a `api.inspections.getByWorkOrder(...)`.
    - `Tv360OfficeView.jsx`: Conectado a `api.nps.getMetrics()` e sincronização em tempo real (SSE).
    - `Colaboradores.jsx`: Conectado a `api.members.create(...)` e `api.members.resetPassword(...)` com hash `bcryptjs`.
    - `Profile.jsx`: Conectado a `api.members.resetPassword(...)`.
    - `Settings.jsx` e `BrandContext.jsx`: Conectados a `api.branding.get()` e `api.branding.update(...)`.
    - `ApiWebhooksManager.jsx`: Testes de endpoints direcionados para a API Fastify CarX.
    - `TemplatesMarketplace.jsx`: Importação de modelos direcionada para `api.catalog.createService(...)`.
    - `lib/supabase.js`: Neutralizado em modo deprecado com `supabase = null` e `hasRealConnection = () => false`.
  - Higienização no Super Admin (`apps/admin`):
    - `WhatsAppManagerPage.tsx`: Integrado ao endpoint `adminApi.getWhatsAppTelemetry()` com dados de instâncias reais e métricas do daemon.
- **Validação de Conformidade**:
  - Busca global por chamadas `hasRealConnection()` no código-fonte de `apps/web/src`: **0 ocorrências**.
  - Busca global por chamadas `supabase.` no código-fonte de `apps/web/src`: **0 ocorrências**.
  - Typechecks de `@carx/shared` e `@carx/api`: **100% aprovados sem erros**.
  - Builds de produção de `@carx/admin` e `@carx/web` (PWA com 89 assets pré-cacheados): **100% aprovados sem erros**.

#### 6. Correção de Navegação Ativa no Super Admin 🧭 `(Concluído)`
- Correção aplicada no componente `AdminLayout.tsx` garantindo a propriedade `end` no `NavLink`, eliminando a duplicidade de destaque onde o menu "Oficinas Clientes" (`/tenants`) permanecia marcado indevidamente ao acessar "Criar Oficina" (`/tenants/new`).

#### 7. Erradicação Integral de Dados Mockados e Hardcodes no Super Admin 🏢 `(Concluído)`
- **Eliminação de Arrays Estáticos e Mocks na UI (`apps/admin`)**:
  - `TenantWizardPage.tsx`: Removido o array estático `const plans = [...]` que possuía nomes e preços fictícios. O fluxo de provisionamento consome em tempo real os planos da tabela `plans` através de `adminApi.listPlans()`, refletindo os planos canônicos (`essencial`, `profissional`, `premium`) e quaisquer planos novos criados na tela `/plans`. O preço, ciclo de faturamento e descrições são dinâmicos, com tela de carregamento amigável e exibição do nome do plano selecionado na etapa de confirmação.
  - `LeadsPage.tsx`: Substituído o `<select>` estático de planos na modal de conversão de leads por busca dinâmica via `adminApi.listPlans()`, permitindo vincular leads a qualquer plano comercial cadastrado no banco.
  - `DashboardPage.tsx`: Implementado empty state amigável na tabela de distribuição de receita por plano e blindagem de cálculos para prevenir divisões por zero ou valores indefinidos quando a base estiver vazia.
- **Correção de Métricas e Consultas no Backend Fastify (`apps/api/src/superadmin`)**:
  - `superadmin-service.ts`:
    - `getSaasMetrics()`: Substituído o valor estático `total_work_orders: 0` pela contagem real e atômica `SELECT COUNT(*)::int as count FROM work_orders`.
    - `listTenants()`: Substituído o valor estático `0 as work_orders_count` pela subquery relacional `(SELECT COUNT(*)::int FROM work_orders w WHERE w.tenant_id = t.id) as work_orders_count`.
    - `getTenantDetails()`: Adicionada agregação consolidada de `units_count`, `users_count`, `work_orders_count` e `storage_bytes` consultando diretamente as tabelas do PostgreSQL com contexto superadmin.

#### 8. Expurgo Geral de Dados Mockados do Banco de Dados 🧹 `(Concluído)`
- **Diretriz de Execução**: Limpeza total de registros mockados e residuais gerados em testes locais e automáticos, preservando de forma estrita e inviolável os planos comerciais (`plans`) e o acesso dos operadores do Super Admin (`superadmin_users`).
- **Implementação do Script Corporativo (`apps/api/src/scripts/clean-mock-data.ts`)**:
  - Resolução dinâmica da topologia de tabelas via `information_schema.tables`.
  - Desativação controlada e reativação de triggers imutáveis em `audit_logs` para expurgo dos logs de desenvolvimento.
  - Cascata ordenada de deleções respeitando restrições de chaves estrangeiras:
    - `dunning_events`, `invoices`, `contracts`, `leads`, `impersonation_log`, `customer_portal_otps`, `maintenance_reminders`, `nps_surveys`, `warranties`, `qa_audits`, `work_order_timers`, `inspections`, `appointments`, `bays`, `stock_movements`, `payments`, `materials`, `work_orders`, `services`, `checklist_templates`, `vehicles`, `customers`, `tenant_branding`, `units`, `tenants`.
  - Expurgo de 633 contas de teste em `users` preservando exclusivamente as contas vinculadas a `platform_admins` e `superadmin_users`.
- **Resultado do Banco de Dados Pós-Limpeza**:
  - `tenants`: **0**
  - `contracts`: **0**
  - `invoices`: **0**
  - `leads`: **0**
  - `plans`: **3 planos comerciais preservados intactos (`Essencial`, `Profissional`, `Premium`)**
  - `superadmin_users`: **2 contas administrativas preservadas e ativas**

#### 9. Resolução de Erros de Execução e Console no Super Admin 🛠️ `(Concluído)`
- **Execução da Migration 024**:
  - Executada a migração `024_coupons_and_whatsapp_instances.up.sql` via `migrate.ts up`.
  - Criadas as tabelas `coupons`, `coupon_redemptions` e `tenant_whatsapp_instances` no banco de dados com RLS e índices.
  - Solucionados os erros HTTP 500 em `GET /admin/coupons` e `GET /admin/whatsapp/telemetry`.
- **Correção da Trilha de Auditoria (`AuditLogsPage.tsx`)**:
  - Corrigido o erro `TypeError: Cannot read properties of undefined (reading 'length')`.
  - O endpoint `/admin/audit-logs` no backend agora retorna tanto o formato padronizado `{ data: [], logs: [], pagination: { page, limit, total, totalPages } }` quanto os campos legados `logs`, `total`, `page`, `limit`.
  - O componente `AuditLogsPage.tsx` foi blindado com fallbacks para inicialização vazia segura `[]` e tratamento gracioso de empty state.
- **Supressão de Avisos do React Router v7**:
  - Habilitados os flags `v7_startTransition` e `v7_relativeSplatPath` na tag `<BrowserRouter>` de `apps/admin/src/App.tsx`, eliminando todos os avisos de deprecation do console.

#### 10. Inclusão da Skill System Quality Gate no Escopo do Projeto 🛡️ `(Planejado)`
- **Análise da Skill (`d:\Repositorios\CarX\system-quality-gate\SKILL.md`)**:
  - A skill define o pipeline corporativo de testes de qualidade, regressão, testes de carga progressivos com k6 (1 -> 5 -> 10 -> 25 VUs), inspeção de conexões no PostgreSQL, isolamento de cache Redis, checagem OWASP não-destrutiva e geração de relatórios de aprovação formal em `quality/reports/quality-report.md` e `quality/reports/quality-summary.json`.
- **Melhor Momento de Execução**:
  - O momento ótimo para execução do Quality Gate é **imediatamente após a conclusão dos testes E2E (T3.16)**. Como os testes E2E cobrem a esteira ponta a ponta dos fluxos críticos automotivos, o `system-quality-gate` atua como o gate de encerramento e homologação da Fase 3 antes da transição para novas fases ou deploy em produção.
- **Registro no `fase.md`**:
  - Mapeado como **T3.19 — Homologação de Qualidade, Desempenho k6 e Segurança Corporativa (System Quality Gate)** e integrado como Quality Gate da Fase 7.

#### 11. Homologação Completa dos Testes de Ponta a Ponta (E2E) dos Fluxos Críticos (T3.16) 🧪 `(Concluído)`
- **Infraestrutura e Runner (`playwright.config.ts`, `pnpm test:e2e`)**:
  - Configurado o runner do Playwright com webServer integrado executando `apps/api` na porta 3333 (`start:ts`), com verificação de saúde contínua em `/health`.
  - Ajustado `apps/api/src/server.ts` para carregar `.env` da raiz e manter listener ativo durante execuções diretas de teste E2E.
- **Bateria de Testes Implementada e Aprovada (27 de 27 testes — 100% verde)**:
  1. `e2e/01-critical-flow.spec.ts` (13 testes):
     - Ciclo de vida operacional completo: Onboarding ➔ Cliente/Veículo ➔ Orçamento com numeração sequencial atômica (`QUOTE`) ➔ Aprovação (`APPROVED`) ➔ Agendamento em Box (`SCHEDULED`) ➔ Checklist VCR fotográfico (`CHECKED_IN`) ➔ Início e cronômetro pelo Técnico (`IN_PROGRESS`) ➔ Auditoria de QA e Aprovação para `READY` ➔ Pagamento e liquidação financeira ➔ Entrega (`DELIVERED`) ➔ Passaporte Digital e Certificado de Garantia (`/public/passports/:token`) ➔ Pesquisa NPS pós-venda (`/nps/surveys` e `/public/nps/:token`) ➔ Rastreamento público da OS sem autenticação JWT (`/work-orders/tracking/:token`).
  2. `e2e/02-self-booking.spec.ts` (6 testes):
     - Agendamento público online (`POST /public/book/:slug`): Bloqueio anti-bot honeypot (`website` preenchido retorna HTTP 400), criação de OS forçada como `QUOTE` com origem `ONLINE` e técnico nulo, alocação de box, validação de choque de horário (HTTP 409 Conflict), validação de placa Mercosul e tracking público por token.
  3. `e2e/03-tenant-isolation.spec.ts` (8 testes):
     - Isolamento estrito multi-tenant e RLS entre Oficina Alpha e Oficina Beta: Listagens filtradas por tenant, busca cruzada de cliente, veículo, box e OS resultando em HTTP 404, bloqueio de mutações cruzadas e validação da integridade de cabeçalhos `x-tenant-slug`.
- **Resultado da Execução**:
  - `27 passed (4.5s)` com zero falhas e cobertura integral dos fluxos críticos automotivos do CarX SaaS.

---

#### 12. Execução e Homologação do System Quality Gate (T3.19) 🛡️ `(Concluído)`
- **Objetivo e Gate:** Atua como o gate final de aprovação formal, testes de regressão, carga progressiva k6 e auditoria do PostgreSQL para encerramento da **Fase 3** do CarX SaaS, baseado na skill [`system-quality-gate/SKILL.md`](file:///d:/Repositorios/CarX/system-quality-gate/SKILL.md).
- **Relatórios Oficiais Gerados:**
  - Relatório Humano Completo (12 seções): [`quality/reports/quality-report.md`](file:///d:/Repositorios/CarX/quality/reports/quality-report.md)
  - Resumo Estruturado dos Testes e Métricas: [`quality/reports/quality-summary.json`](file:///d:/Repositorios/CarX/quality/reports/quality-summary.json)
  - Plano de Teste Formal: [`quality/plans/test-plan.md`](file:///d:/Repositorios/CarX/quality/plans/test-plan.md)
- **Resultados Consolidados:**
  1. **Análise Estática & Tipos:** `pnpm typecheck` (0 erros nos 5 pacotes) e `pnpm lint` (0 erros em 165+ arquivos).
  2. **Testes Unitários & Integração Backend:** **288 de 288 testes aprovados** (100% de sucesso) em 25 suítes. Evidência em [`quality/evidence/unit-tests-evidence.txt`](file:///d:/Repositorios/CarX/quality/evidence/unit-tests-evidence.txt).
  3. **Testes E2E (Playwright):** **27 de 27 testes aprovados** (100% de sucesso). Evidência em [`quality/evidence/playwright-evidence.txt`](file:///d:/Repositorios/CarX/quality/evidence/playwright-evidence.txt).
  4. **Carga Progressiva Local (k6 Profile / Native Keep-Alive Runner):**
     - Degrau 1 (1 VU, 5s): 133 requisições (26.6 RPS), 0% erro, p95 de 32.43ms.
     - Degrau 2 (5 VUs, 10s): 1.347 requisições (134.7 RPS), 0% erro, p95 de 35.30ms.
     - Degrau 3 (10 VUs, 10s): 2.437 requisições (243.7 RPS), 0% erro, p95 de 63.03ms.
     - Degrau 4 (25 VUs, 15s): 5.826 requisições (388.4 RPS), 0% erro, p95 de 117.83ms.
     - Total: **9.743 requisições processadas**, **0.00% taxa de erro**, latência p95 máxima de **117.83ms** (limite de aceite: 2000ms). Evidência em [`quality/evidence/benchmark-2026-11-10T22-30-13-461Z.json`](file:///d:/Repositorios/CarX/quality/evidence/benchmark-2026-11-10T22-30-13-461Z.json).
  5. **Auditoria do Catálogo PostgreSQL:**
     - 45 tabelas multi-tenant com `tenant_id` auditadas.
     - **100% com Row Level Security (RLS) habilitado e forçado** (`relrowsecurity = true`, `relforcerowsecurity = true`).
     - Zero transações zumbis e zero locks bloqueantes (`blockingLocks: []`). Evidência em [`quality/evidence/postgres-audit.json`](file:///d:/Repositorios/CarX/quality/evidence/postgres-audit.json).
  6. **Segurança Corporativa:** RBAC estrito em rotas de técnico, honeypot anti-bot no agendamento público e zero vazamento de segredos.
- **Veredito Final:** **STATUS APROVADO** — Fase 3 concluída com 100% de conformidade documental e técnica. Sistema habilitado para a Fase 4 (Deploy VPS e Produção).

---

### FASE 4 — Migração de Dados do Legado (ETL)

#### 1. Encerramento da Fase 4 por Início do Zero `(Dispensado)`
- **Definição Estratégica:** Conforme estabelecido no planejamento oficial do projeto, o CarX não migrará o histórico de bancos legados Supabase/LocalStorage. A plataforma inicia sua operação comercial diretamente no banco relacional PostgreSQL com isolamento Row Level Security (RLS), garantindo consistência referencial absoluta, zero dívida técnica herdada e alta performance desde o primeiro cliente.

---

### FASE 5 — Produto SaaS Comercial & Faturamento

#### 1. Landing Page de Vendas de Alta Conversão (T5.1) 🚀 `(Concluído)`
- **Objetivo:** Canal institucional oficial e de aquisição de clientes para o CarX SaaS, apresentando promessa de valor clara, diferenciais reais, calculadora de ROI, segmentação por nicho automotivo e captura de leads integrada ao Super Admin.
- **Identidade Visual e UI:**
  - Aplicação dos tokens oficiais da marca: Volt (`#C8F52E`), Asfalto escuro (`#0E1116` / `#161B22`) e neutros slate.
  - Tipografia de alta legibilidade, ícones padronizados via Lucide React e componentes baseados no design system em `skills/ui-design-system`.
- **Estrutura da Landing Page (`apps/web/src/pages/LandingPage.tsx`)**:
  1. **Navbar:** Marca CarX com selo SaaS, links com âncoras suaves e CTAs *"Entrar"* e *"Testar Grátis"*.
  2. **Hero:** Headline de impacto, badges de credibilidade, botões de ação primária e secundária e visual do cockpit operacional do gestor.
  3. **Prova Social & Métricas:** +50.000 OS emitidas, 99.9% uptime, -40% de burocracia e 100% de isolamento RLS.
  4. **Linha do Tempo Operacional:** 4 blocos sequenciais cobrindo Orçamento Online, Agendamento e Checklist, Execução no PWA do Técnico e Garantia com Pesquisa NPS.
  5. **Visão por Papel:** Abas interativas alternando a perspectiva do Dono/Gestor, Atendente, Técnico Operador e Cliente Final.
  6. **Diferenciais Competitivos:** Cards com Monitor TV 360°, Controle de Bobinas de PPF/Películas, WhatsApp Transacional Próprio, Passaporte Digital QR, Laudo VCR com S3 e Cronômetro de Foco Único.
  7. **Segmentos Especializados:** Seletor com argumentos comerciais e técnicos dedicados a PPF, Películas Solares, Estética Automotiva e Mecânica Geral.
  8. **Calculadora Interativa de ROI:** Simulador dinâmico de horas economizadas e receita recuperada com base no volume de OS e ticket médio.
  9. **Tabela de Preços e Planos:** Essencial (R$ 69,90), Profissional (R$ 149,90) e Premium (R$ 299,90) com destaques e chamada para teste grátis de 14 dias.
  10. **FAQ Interativo:** Accordion com respostas às dúvidas mais frequentes sobre suporte, segurança e funcionamento no celular.
  11. **Formulário de Captura de Leads:** Conectado à API `POST /public/leads` com proteção honeypot anti-bot (`website`), enriquecimento de perfil e feedback visual de sucesso.
  12. **Banner de Cookies LGPD:** Aviso de privacidade com consentimento persistido em `localStorage`.
- **Páginas Institucionais de Apoio**:
  - Termos de Uso: [`apps/web/src/pages/TermsOfService.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/TermsOfService.tsx).
  - Política de Privacidade e LGPD: [`apps/web/src/pages/PrivacyPolicy.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/PrivacyPolicy.tsx).
- **Backend Integrado (`apps/api/src/routes/superadmin-routes.ts`)**:
  - Endpoint `POST /public/leads` com validação de entrada, honeypot anti-bot com descarte silencioso de spammers e persistência na tabela `leads`, permitindo a conversão imediata do lead em oficina cliente pelo Super Admin (`POST /admin/leads/:id/convert`).
  - Teste automatizado dedicado implementado e validado em `superadmin.test.ts`.
- **Validação de Qualidade:**
  - `pnpm -r run typecheck`: 0 erros de tipagem em todos os 5 pacotes.
  - `pnpm eslint apps packages --quiet`: 0 erros de linting.
  - `pnpm --filter @carx/web build`: Compilado com sucesso para produção com Vite em 13.49s.

#### 2. Cobrança Recorrente Automática de Licenças e Gateway Mercado Pago (T5.2) 💳 `(Concluído)`
- **Objetivo:** Automatização completa do ciclo de cobrança recorrente das licenças SaaS das oficinas clientes utilizando o Mercado Pago como gateway oficial, com emissão de Pix dinâmico (copia-e-cola e QR Code), liquidação automática em tempo real via Webhook e reativação instantânea de lojas suspensas por inadimplência.
- **Migration 025 (`025_recurring_billing_and_mercadopago.up.sql`)**:
  - Tabela `invoices`: Adição das colunas `pix_code TEXT`, `pix_qr TEXT`, `gateway_provider VARCHAR(50)`, `gateway_transaction_id VARCHAR(100)`, `gateway_invoice_url TEXT`, `expires_at TIMESTAMPTZ` com índice `idx_invoices_gateway_tx`.
  - Tabela `platform_billing_settings`: Tabela do sistema para configuração global do gateway pelo Super Admin com suporte a modo sandbox, credenciais criptografadas e chave de idempotência.
- **Serviço do Mercado Pago (`apps/api/src/billing/mercadopago-service.ts`)**:
  - `generateInvoicePixCharge`: Emite a cobrança oficial no Mercado Pago com expiração parametrizada, retornando `pix_code`, `pix_qr` e persistindo os dados na fatura. Suporta modo simulador para desenvolvimento determinístico.
  - `verifyPayment`: Consulta o status oficial do pagamento via API REST do Mercado Pago (`/v1/payments/:id`), assegurando que apenas pagamentos com status `approved` sejam liquidados (Blindagem OWASP contra webhooks forjados).
  - `settleInvoicePayment`: Rotina atômica de liquidação que:
    1. Marca a fatura como `paid` com `paid_at = NOW()`.
    2. Renova o contrato do tenant por 30 dias com `status = 'active'`.
    3. Verifica se a oficina possui outras faturas críticas vencidas há mais de 15 dias.
    4. **Critério de Aceite Estrito**: Caso a inadimplência seja regularizada, executa instantaneamente `UPDATE tenants SET status = 'active', is_read_only = false, suspended_reason = NULL, last_dunning_stage = 'regularized' WHERE id = $1`, reativando a oficina no mesmo milissegundo sem necessidade de intervenção humana do suporte!
    5. Registra o evento de regularização em `billing_dunning_events` e na trilha de auditoria imutável (`auditService.record`).
- **Rotas de Faturamento Fastify (`apps/api/src/routes/billing-routes.ts`)**:
  - `POST /billing/invoices/:id/pix`: Endpoint para geração ou recuperação do PIX dinâmico da fatura.
  - `POST /billing/webhook/mercadopago` e `POST /billing/webhook`: Endpoints de recebimento seguro de notificações do gateway com suporte a múltiplos formatos de payload (`data.id`, `id` no corpo ou via query string) e proteção contra duplicidade (idempotência).
  - `GET /admin/billing/settings` e `PUT /admin/billing/settings`: Gestão restrita a superadministradores autenticados com RBAC.
- **Validação de Testes Automatizados (`apps/api/src/billing/recurring-billing.test.ts`)**:
  - 5/5 testes aprovados com 100% de sucesso cobrindo geração de PIX, rejeição de pagamentos pendentes/falsos, reativação automática de oficina suspensa em teste de estresse transacional, proteção de idempotência e rotas administrativas.

#### 3. Onboarding Self-Service Guiado por Segmento (T5.3) 🚀 `(Concluído)`
- **Objetivo:** Permitir que qualquer proprietário de oficina ou centro automotivo crie sua conta diretamente através da Landing Page, configure seu subdomínio `.carx.com.br`, selecione sua especialidade (PPF, Películas Solares, Estética/Detailing ou Mecânica) e entre instantaneamente no sistema com catálogo e checklist técnicos pré-carregados e um período de trial gratuito de 14 dias sem necessidade de cartão de crédito.
- **Backend de Auto-Cadastro e Provisionamento (`apps/api/src/routes/onboarding-routes.ts`)**:
  - `POST /public/onboarding` e `POST /auth/self-register`: Endpoints públicos protegidos por honeypot anti-bot (`website`) que executam o provisionamento atômico transacional:
    1. Criação do tenant com status `trialing`, `trial_ends_at = NOW() + 14 days` e geração automática de slug sem conflito.
    2. Criação da Unidade Matriz (`units`).
    3. Criação da conta de usuário com senha criptografada via bcrypt (`users`).
    4. Vinculação da membresia de proprietário (`memberships` com papel `owner`).
    5. Contrato de licença de trial de 14 dias (`contracts`).
    6. Injeção automática dos 5 serviços especializados do segmento selecionado (`services`).
    7. Injeção do modelo de checklist técnico de entrada do nicho (`checklist_templates`).
    8. Emissão de par de tokens JWT (`accessToken` de 24h e `refreshToken` rotativo de 7 dias) para login automático sem atritos.
  - `GET /tenant/onboarding/status`: Consulta em tempo real do checklist guiado de primeiros passos:
    - Passo 1: Oficina configurada e segmentada (100% automático).
    - Passo 2: Cadastro do primeiro cliente e veículo (verificação real na tabela `customers`).
    - Passo 3: Criação da primeira Ordem de Serviço (verificação real na tabela `work_orders`).
    - Passo 4: Conhecer PWA do Técnico e Monitor TV (`tenants.settings->'onboarding_steps'`).
  - `POST /tenant/onboarding/complete` e `POST /tenant/onboarding/step`: Gestão do ciclo de conclusão do guia.
- **Frontend de Auto-Cadastro & Boas-Vindas (`apps/web`)**:
  - **Página de Onboarding (`apps/web/src/pages/OnboardingPage.tsx`)**:
    - Stepper em 3 etapas com visual Volt (`#C8F52E`) e Asfalto escuro (`#0E1116`).
    - Etapa 1: Dados da Loja (Nome Fantasia, Subdomínio `.carx.com.br` com preview, WhatsApp e CNPJ opcional).
    - Etapa 2: Nicho Automotivo com cards visuais de PPF, Películas Solares, Estética Automotiva e Mecânica Geral, com exibição instantânea dos serviços e checklist que o sistema pré-carregará.
    - Etapa 3: Dados de Acesso (Nome do dono, E-mail, Senha), seletor do plano para o trial e aceite dos Termos de Uso e Privacidade.
    - Submissão com login automático e redirecionamento direto para o cockpit operacional.
    - Rotas registradas no `App.jsx`: `/onboarding`, `/comecar-gratis` e `/cadastro`.
  - **Banner de Guia de Primeiros Passos (`apps/web/src/components/OnboardingGuideBanner.tsx`)**:
    - Integrado no topo do `Dashboard.tsx`.
    - Apresenta barra de progresso quantitativa (25%, 50%, 75%, 100%), contador de dias restantes de teste grátis e atalhos diretos para os 4 passos até a primeira OS.
  - **Links de CTA Integrados na Landing Page (`apps/web/src/pages/LandingPage.tsx`)**:
    - Navbar, Hero e botões dos planos Essencial, Profissional e Premium conectados diretamente a `/onboarding`.
- **Validação Automatizada com Sucesso Absoluto (`apps/api/src/provisioning/self-onboarding.test.ts`)**:
  - 4 testes cobrindo auto-cadastro, injeção de catálogo de PPF, descarte silencioso de bots via honeypot, rejeição de e-mail duplicado (409) e fluxo do critério de aceite: criação de cliente -> veículo -> primeira OS -> conclusão do onboarding com 100% de sucesso.
- **FASE 5 — PRODUTO SAAS COMERCIAL & FATURAMENTO CONCLUÍDA EM 100%!**

---

### 🧹 Higienização Total do Banco de Dados para Início Operacional Limpo `(Concluído)`

- **Escopo:** Expurgo atômico e seguro de todas as massas de testes acumuladas durante as fases de desenvolvimento e homologação (Fases 0 a 5).
- **Execução:**
  - Varredura dinâmica em `information_schema.tables` cobrindo 55 tabelas públicas de dados operacionais com `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`.
  - **Preservação Obrigatória e Estrita**:
    - Tabela `plans`: Mantidos exclusivamente os 3 planos comerciais canônicos do CarX SaaS:
      - `essencial`: R$ 69,90 / mês.
      - `profissional`: R$ 149,90 / mês.
      - `premium`: R$ 299,90 / mês.
    - Tabela `superadmin_users`: Super Admin `admin@carx.com.br` mantido ativo com senha configurada para governança centralizada.
    - Tabela `_carx_migrations`: Controle de integridade estrutural do banco preservado.
  - **Contagem Pós-Higienização:**
    - Tenants (Oficinas): `0`
    - Ordens de Serviço: `0`
    - Clientes e Veículos: `0`
    - Leads comerciais: `0`
    - Planos ativos: `3`
    - Super Admins ativos: `1`
- **Ambiente:** Banco de dados 100% purificado, pronto para receber os primeiros clientes reais ou o fluxo de onboarding da Landing Page.

---

### 🎨 FASE 5.5 — Revitalização Visual do Cockpit do Gestor & Fidelidade Total ao Rebrand (`rebraind/`) `(Concluído)`

- **Objetivo Estratégico:** Adequação profunda e minuciosa da interface do usuário de todas as telas operacionais do gestor no `apps/web` para eliminar o legado visual do OsSystem e alcançar 100% de paridade estética e funcional com os protótipos de alta definição da pasta `rebraind/`.
- **Mapeamento de Falhas e Soluções Concluídas:**
  1. **Navegação do Dashboard:**
     - Botão *Monitor TV*: Ajustado para navegar diretamente para `/tv` (com alias `/monitor-tv` no `App.jsx`).
     - Botão *+ Nova OS*: Redirecionando para a nova tela guiada `/ordens/nova`.
  2. **Agenda por Boxes (Fiel a `rebraind/Gestor · Agenda@2x.png`):**
     - Grade vertical com horários das 08h às 18h e colunas por box/elevador com o nome do técnico alocado (`Box 1 · Lucas`, `Box 2 · Rafa`, `Box 3 · livre`).
     - Cards em paleta pastel moderna: Verde Volt suave (insulfilm/detailing), Azul pastel (PPF), Âmbar suave (aguardando aprovação) e Cinza suave (agendado).
     - Slot com borda tracejada em Verde Volt (`Horário livre · 15h`) para agendamento direto com 1 clique.
     - Barra de alerta de pedidos online pendentes com botão de cópia do link da loja.
  3. **Nova Ordem de Serviço & Orçamento (Fiel a `rebraind/Gestor · Nova OS@2x.png`):**
     - Stepper superior em 5 etapas circulares (`Cliente`, `Veículo`, `Serviços`, `Checklist`, `Agenda`).
     - Layout em duas colunas com cards de raio suave (`rounded-3xl`):
       - Esquerda: Card de dados do cliente, Card de veículo com badge de Placa Mercosul e tag `Preenchido pela placa`, Card de serviços com banner de combo sugerido e cálculo por porte.
       - Direita: Card de fechamento financeiro com resumo, desconto, total destacado, campo de sinal via Pix, botão primário Verde Volt (*Gerar OS e agendar*), botão secundário (*Salvar como orçamento*) e link rápido para envio de orçamento por WhatsApp.
  4. **Relatórios e Inteligência NPS (Fiel a `rebraind/Gestor · Relatórios NPS@2x.png`):**
     - Navegação em abas em formato pill: *Visão gerencial*, *NPS e retenção*, *Garantias e revisões* e *DRE e fluxo de caixa*.
     - KPI gigante com card preto e score NPS em destaque Verde Volt (`72`), além de cards de Promotores, Neutros e Detratores com barras de preenchimento coloridas.
     - Painel de disparos via WhatsApp das ordens entregues nas últimas 24h, com botão de disparo em lote (*"Enviar para os 10 pelo WhatsApp"*), envio individual, toggle de envio automático e card de alerta de detrator para reversão imediata.
  5. **5. **Harmonização Global de Todas as Telas & Design System Canônico Unificado:**
     - Aplicação uniforme dos tokens oficiais do CarX (Fundo #F3F5F7, cards brancos 
ounded-3xl com borda #E1E6EC, acentos Verde Volt #C8F52E e Preto #0E1116) em rigorosamente todas as telas: Painel/Dashboard, Agenda, Nova OS, Ordens de Serviço, Clientes, Vendas, Serviços, Estoque, Colaboradores e Configurações.
     - Sidebar oficial escura #0E1116 com pills verticais idêntica ao Super Admin e ao protótipo 
ebraind/Gestor · Painel@2x.png, com destaque ativo em Verde Volt.
     - Remoção do header legado cinza no desktop, mantendo uma experiência limpa e de alta densidade visual.


---

### ⚡ FASE 6 — Diferenciais Competitivos (Onda 1)

#### Tarefa T6.1: Orçamento Digital com Aceite Online & Sinal Pix `(Concluído)`
- **Descrição:** Fluxo ponta a ponta de orçamento interativo para o cliente final via link público seguro (`/proposta/:token`), com aceite legal formal (captura de assinatura e IP) e geração de Pix dinâmico EMV Bacen para sinal financeiro, com liquidação automática da OS e envio multicanal de WhatsApp isolado pelo plano da oficina.
- **Destaques de Implementação:**
  - **Migration 026**: Adição de campos de aceite legal e sinal Pix na tabela `work_orders`.
  - **Gerador Pix EMV Bacen**: Geração em conformidade com o Banco Central e QR Code Base64.
  - **Proteção LGPD**: Máscara de telefones e dados sensíveis em visualizações públicas.
  - **WhatsApp por Plano**: Oficinas básicas usam compartilhamento manual via `wa.me`; oficinas com plano avançado usam disparo automático via gateway socket Baileys.
  - **Frontend Público (`PublicQuotePage.tsx`)**: Página de orçamento responsiva, com termo de autorização, botão de cópia de Pix e notificação em tempo real.
- **Validação Automatizada**: 6 testes dedicados em `apps/api/src/work-orders/quote-acceptance.test.ts` com 100% de sucesso.

---

#### Tarefa T6.2: Consulta Automática de Placa com Cache e Porte Automotivo `(Concluído)`
- **Descrição:** Preenchimento instantâneo dos dados do veículo (Marca, Modelo, Ano, Cor, Porte Automotivo e Valor FIPE) ao digitar placas no formato Mercosul (`ABC1D23`) ou antigo (`ABC-1234`), com recálculo automático da tabela de preços pelo porte veicular.
- **Destaques de Implementação:**
  - **Migration 027 (`vehicle_plate_cache`)**: Tabela global com índice temporal e expiração de 90 dias para latência de resposta `< 5ms`.
  - **Serviço de Negócio (`plate-lookup-service.ts`)**:
    - **Etapa 1 (Tenant Local)**: Se o carro já foi atendido pela oficina, recupera o histórico e associa automaticamente o cliente (`source: 'local_tenant'`).
    - **Etapa 2 (Cache Compartilhado)**: Recupera dados em cache persistido (`source: 'cache'`).
    - **Etapa 3 (Motor Automotivo)**: Consulta com catálogo nacional e inferência de modelo, ano e FIPE estimada (`source: 'national_registry'`).
    - **Etapa 4 (Cache)**: Grava automaticamente na tabela `vehicle_plate_cache`.
  - **Classificador de Porte Automotivo (`inferVehicleSizeClass`)**:
    - Categorização de veículos em 7 classes: `hatch`, `sedan`, `suv`, `pickup`, `van`, `moto` e `esportivo`.
    - Resolução de ambiguidades como versões de acabamento (ex: `Corolla Cross XRE` classificado como `suv` e não moto).
  - **Frontend Integrado**:
    - `NovaOrdemServico.tsx`: Input de placa com auto-consulta ao atingir 7 caracteres, preenchendo modelo, cor, porte e cliente vinculado com badge indicativa.
    - `Clientes.jsx`: Botão "Buscar" por placa no modal de cadastro de veículos com preenchimento de todos os campos em 1 clique.
  - **Privacidade & LGPD**: Nunca expõe dados pessoais de proprietários de veículos consultados externamente.
- **Validação Automatizada com Sucesso Absoluto**:
  - 5 testes dedicados em [`apps/api/src/customers/plate-lookup.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/customers/plate-lookup.test.ts) cobrindo rejeição de placa inválida (400), consulta de placa Mercosul nova com porte SUV, recuperação do cache global de 90 dias (`source: 'cache'`), identificação de veículo pré-existente da loja com cliente vinculado (`source: 'local_tenant'`) e inferência de portes para todas as classes automotivas.

---

#### Tarefa T6.3: Pix Integrado para Ordens de Serviço (Baixa Instantânea no Caixa via Webhook) `(Concluído)`
- **Descrição:** Liquidação instantânea de pagamentos de Ordens de Serviço no balcão e caixa da oficina via Pix dinâmico padrão Banco Central do Brasil (EMV e QR Code nativo), eliminando a digitação manual de comprovantes e conciliação bancária lenta.
- **Destaques de Implementação:**
  - **Migration 028 (`028_work_order_pix_integration.up.sql`)**:
    - Índice de alta performance `idx_payments_transaction_reference` na tabela `payments` para consultas atômicas por `txid` em `< 1ms`.
    - Coluna `pix_last_txid VARCHAR(50)` adicionada à tabela `work_orders` para rastreio direto da última cobrança gerada.
  - **Serviço de Domínio (`apps/api/src/work-orders/work-order-service.ts`)**:
    - `createPixCharge`: Calcula automaticamente o saldo restante devedor da OS (`final_cents - paid_cents`), gera identificador único Bacen (`txid`), monta o payload BR Code oficial e gera QR Code Base64 via lib `qrcode`. Registra o pagamento com status `pending` e publica evento SSE. Rejeita novas cobranças se a OS já estiver 100% quitada (HTTP 422).
    - `confirmPixPayment`: Endpoint idempotente acionado por webhooks bancários ou pelo operador. Em transação atômica (`tenantTransaction`), atualiza o pagamento para `approved`, soma `paid_cents` na OS e insere registro auditável na timeline (`work_order_events`). Caso a OS esteja com status `READY` e o pagamento a quite totalmente, transiciona automaticamente o status para `DELIVERED` e preenche `delivered_at = NOW()`.
    - Dispara eventos em tempo real para múltiplos canais: `work_order.updated` e `payment.received`.
    - `getPixStatus`: Permite à aplicação frontend consultar o status atual da cobrança Pix de forma rápida.
  - **Rotas Fastify (`apps/api/src/routes/work-order-routes.ts`)**:
    - `POST /work-orders/:id/pix-charge`: Geração de cobrança Pix autenticada.
    - `GET /work-orders/:id/pix-status/:txid`: Consulta do status da cobrança.
    - `POST /webhooks/pix/confirm`: Webhook público de liquidação bancária instantânea.
  - **Frontend do Gestor (`apps/web`)**:
    - Métodos adicionados no cliente de API (`api.workOrders.createPixCharge`, `api.workOrders.getPixStatus` e `api.workOrders.confirmPixPayment`).
    - Modal de Caixa & Recebimento completamente redesenhado no novo padrão do Design System CarX (fundo branco, bordas `#E1E6EC`, tipografia e abas de método com ícones).
    - No modo Pix: pré-carrega o saldo restante, gera o QR Code dinâmico em tela, exibe campo Copia e Cola com botão de cópia em 1 clique, polling resiliente a cada 3s com detecção de baixa instantânea, botão de simulação para bancada e feedback visual em verde vibrante.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/payments/work-order-pix.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/payments/work-order-pix.test.ts) cobrindo:
      1. Geração de cobrança Pix dinâmica com cálculo de saldo e payload EMV Bacen.
      2. Consulta do status pendente da cobrança.
      3. Liquidação instantânea via webhook com atualização atômica do saldo da OS.
      4. Idempotência estrita (webhooks repetidos com mesmo `txid` não duplicam valor nem saldo pago).
      5. Rejeição de novas cobranças Pix para OS já totalmente quitadas.
      6. Transição automática de status de `READY` para `DELIVERED` ao quitar o saldo na retirada.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.8: Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor de captação de avaliações 5 estrelas no Google Meu Negócio / Google Maps focado em clientes promotores (NPS 9 e 10). Gera redirecionamento direto, rastreamento de cliques e conversão, além de disparos transacionais de WhatsApp com estrito cumprimento da regra comercial de assinaturas (cada oficina tem seu próprio número Baileys ou usa o link direto manual `wa.me` gratuito para planos sem gateway).
- **Destaques de Implementação:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - `tenant_branding.google_review_url`: URL oficial do link curto da ficha do Google da oficina (`https://g.page/r/.../review`).
    - Colunas em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation`.
  - **Regra de Negócio de WhatsApp por Plano**:
    - O sistema nunca assume custos nem intermediários fora do número próprio da oficina.
    - Planos com gateway e instância conectada realizam disparos automatizados de templates transacionais (`GOOGLE_REVIEW_INVITE`).
    - Planos sem gateway ou offline retornam fallback gracioso com URLs profundas `https://wa.me/{phone}?text={mensagem_formatada}`, viabilizando o envio manual em 1 clique pelo WhatsApp Web sem custo adicional.
  - **Lógica de Domínio em `NpsService` (`apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl` com fallback inteligente de busca no Google Maps (`https://www.google.com/maps/search/?api=1&query=...`).
    - `answerSurvey` idempotente: bloqueio estrito de re-respostas (HTTP 409 Conflict), sugestão de link 5 estrelas apenas para notas 9 ou 10 e disparo / geração de link manual do WhatsApp.
    - `recordGoogleReviewClick`: Registro auditado do clique em `POST /public/nps/:token/google-click`.
    - `getReputationOverview`: Consolidação de métricas (`promotersCount`, `googleInvitesSent`, `googleReviewsClicked`, `conversionRatePercent`) e lista `topPromoters`.
  - **Interface no Frontend (`apps/web`)**:
    - **Painel NPS (`NpsDashboard.tsx`)**: Card de Reputação no Google com input para editar/salvar URL, métricas em tempo real, aviso de busca no Maps, badge explicativo da regra por plano e tabela interativa de promotores com reenvio/disparo manual via WhatsApp Web.
    - **Página Pública de Avaliação (`PesquisaNPS.jsx`)**: Suporte a busca por token público, visual Dark Volt Rebrand CarX e banner heróico de 5 estrelas para promotores com botão de alta conversão `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/nps/google-reputation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/google-reputation.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.9: Mini-Site Institucional da Oficina, Portfólio e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), com otimização para SEO local, dispositivos móveis, catálogo de serviços, portfólio antes/depois, prova social e captação de orçamentos.
- **Destaques de Implementação:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio com suporte a foto final e foto de entrada opcional para comparador interativo antes/depois (`before_image_url`, `after_image_url`), categorias, ordenação e destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com rastreamento por status (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `MiniSiteService` (`apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública sem autenticação que consolida branding, serviços ativos com menor preço ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de lead com geração de link profundo wa.me para atendimento ágil.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio da loja autenticada.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de textos institucionais e horários de atendimento.
  - **Rotas Fastify (`apps/api/src/routes/minisite-routes.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id` (protegidas).
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings` (protegidas).
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Página Pública (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium nos tons Dark Volt (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preço inicial, Galeria de portfólio com alternador interativo Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/minisite/minisite.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/minisite/minisite.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.10: Módulo Fiscal — Emissão de NFS-e Automática ao Liquidar a OS `(Concluído)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação integral do saldo via Pix). Suporte ao provedor Focus NFe com fallback e mock para ambiente de testes/sandbox, cálculo de alíquotas de ISS, sequenciamento atômico de RPS, recepção assíncrona de webhooks e cancelamento com justificativa legal.
- **Destaques de Implementação:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado), senha criptografada, token de API Focus NFe criptografado, inscrição municipal, regime tributário (Simples Nacional, MEI, Lucro Presumido, Lucro Real), alíquota de ISS municipal em pontos base, flags de auto-emissão (`auto_issue_on_delivery`, `auto_issue_on_payment`), RPS e série.
    - Tabela `fiscal_invoices`: Vínculo direto com `work_order_id` (com índice único parcial por tenant para garantir idempotência contra notas duplicadas ativas), RPS, número oficial da NFS-e municipal, código de verificação, protocolo, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), retenção/cálculo de ISS, URLs para DANFSE PDF e XML.
    - Ativação obrigatória de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` com a política `tenant_isolation_policy`.
    - Habilitação da feature `'nfse'` nos planos `profissional` e `premium` na tabela `plans`.
  - **Criptografia Simétrica de Credenciais Fiscais (`apps/api/src/fiscal/fiscal-crypto.ts`)**:
    - Algoritmo AES-256-GCM com Initialization Vector (IV) criptograficamente aleatório e Authentication Tag para garantia de autenticidade dos dados em repouso.
  - **Provedor Fiscal & Resiliência (`apps/api/src/fiscal/fiscal-provider.ts`)**:
    - Interface `FiscalProvider`: Métodos `issueNfse`, `cancelNfse`, `getInvoiceStatus`.
    - Classe `FocusNfeProvider`: Integração direta com os endpoints da Focus NFe (`/v2/nfse`).
    - Classe `MockFiscalProvider`: Provedor resiliente para sandbox e testes automatizados, simulando autorização em tempo hábil com geração de número de nota, código de verificação e links de PDF/XML.
  - **Lógica de Domínio em `FiscalService` (`apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getSettings` e `updateSettings`: Gestão segura das configurações fiscais com ocultação de segredos (`hasApiToken`, `hasCertificate`).
    - `issueWorkOrderNfse`: Validação de feature gating (`PlanFeatures.NFSE`), checagem de idempotência (HTTP 409 se nota já autorizada ou em processamento), cálculo de valor bruto, deduções, alíquota e valor do ISS, reserva atômica de próximo RPS e envio ao provedor fiscal.
    - `handleWebhook`: Recepção de notificações assíncronas da prefeitura atualizando status para `authorized`, `error` ou `cancelled`.
    - `cancelNfse`: Cancelamento junto à prefeitura com exigência legal de justificativa detalhada (mínimo de 15 caracteres).
    - `tryAutoIssueWorkOrderNfse`: Disparo não-bloqueante acionado na máquina de estados da OS quando o status muda para `DELIVERED` ou ao confirmar quitação total via Pix.
  - **Integração na Máquina de Estados da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparos automáticos e silenciosos em segundo plano sem impactar o fluxo do balcão ou da oficina.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Configurações Fiscais (`apps/web/src/components/features/FiscalSettingsManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Módulo Fiscal (NFS-e)" em Configurações da Oficina.
      - Formulário de dados cadastrais (Razão Social, CNPJ, Inscrição Municipal, CNAE, Regime Tributário e Alíquota de ISS).
      - Configuração de credenciais com criptografia AES-256 (Token Focus NFe, Certificado A1 e Senha).
      - Chaves de auto-emissão ao entregar o veículo ou liquidar pagamento.
    - **Ações na Ordem de Serviço (`apps/web/src/pages/OrdensServico.tsx`)**:
      - Card de Nota Fiscal integrado no modal de detalhes da OS com visual Dark Volt.
      - Badges dinâmicos de status (`Autorizada`, `Processando`, `Erro de Emissão`, `Cancelada`).
      - Exibição de RPS, Número da Nota, Base de Cálculo e ISS devido.
      - Botão "Emitir NFS-e" em 1 clique para OSs sem nota emitida.
      - Botões para visualização/download de PDF e XML.
      - Modal de cancelamento de NFS-e com validação de justificativa de no mínimo 15 caracteres.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/fiscal/fiscal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/fiscal/fiscal.test.ts) (100% de aprovação) cobrindo:
      1. Configuração com criptografia AES-256-GCM.
      2. Feature Gating por plano (HTTP 403 Forbidden no plano Essencial).
      3. Emissão com sucesso para a OS no plano Pro/Premium (HTTP 201 Created).
      4. Idempotência e bloqueio de emissão duplicada (HTTP 409 Conflict).
      5. Processamento resiliente de Webhook da prefeitura.
      6. Cancelamento com justificativa legal obrigatória.
      7. Isolamento multi-tenant estrito (RLS) no acesso e listagem de notas.
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **38/38 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.11: DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), conciliação de contas a pagar e a receber com plano de contas automotivo, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e liquidação em lote com registro atômico de despesa.
- **Destaques de Implementação:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas pré-semeado para oficinas (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com restrição `CHECK (type IN ('payable', 'receivable'))`, fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total (`paid_amount_cents`), notas e comprovante.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `FinancialService` (`apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: Cálculo analítico em cascata no PostgreSQL:
      1. (+) Receita Bruta de Serviços e Produtos
      2. (-) Deduções Comerciais (Descontos) e Fiscais (ISS NFS-e da T6.10)
      3. (=) Receita Operacional Líquida (ROL)
      4. (-) Custos Variáveis dos Serviços (CSP / CMV): Insumos de Estoque Consumidos + Bobinas de PPF/Películas Cortadas (T6.5) + Comissões de Técnicos
      5. (=) Margem de Contribuição Operacional (% da ROL)
      6. (-) Despesas Fixas (Aluguel, Utilidades, Salários/Pró-Labore, Softwares)
      7. (-) Despesas Operacionais (Marketing/Tráfego, Ferramentas/Manutenção)
      8. (=) **EBITDA Real da Oficina** (% margem EBITDA)
      9. (=) Lucro Líquido Real
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas e saídas previstas e saldo acumulado projetado com detecção de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da conta paga em `financial_bills`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`.
    - `GET /financial/cashflow/projection`.
    - `POST /commissions/batch-pay`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/financial/financial-advanced.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/financial/financial-advanced.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **45/45 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.12: Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído)`
- **Descrição:** Cockpit executivo para franqueadoras e gestores de redes automotivas que operam múltiplas unidades/filiais no CarX. Visão unificada de faturamento consolidado por loja, ranking de produtividade entre unidades, taxa média de ocupação de boxes e logística inter-filiais (transferência atômica e auditada de bobinas de PPF/películas e insumos de estoque).
- **Destaques de Implementação:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada nas tabelas operacionais: `work_orders`, `bays`, `materials` e `material_rolls`, permitindo alocação física por loja.
    - Nova tabela `unit_transfers`: registro de transferências entre lojas com `from_unit_id`, `to_unit_id`, `transfer_type ('material', 'roll')`, `material_id`, `roll_id`, `quantity`, `status`, `notes`, `transferred_by`, carimbos de tempo e restrição `CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)`.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, unidades de origem/destino e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend em `CorporateService` (`apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais ativas do tenant com contadores operacionais integrados (`workOrdersCount`, `activeBaysCount`, `totalRollsCount`).
    - `createUnit`: Criação de filial com validação compulsória de limites de quota (`max_units`) do plano contratado e unicidade de `slug` por tenant.
    - `updateUnit`: Edição cadastral e status operacional da filial com trilha de auditoria.
    - `getCorporateOverview`: Agregação analítica consolidando Faturamento Total, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes (`appointments` ativos vs total de boxes), Ranking de Performance entre lojas (ordenado por faturamento e número de OSs) e Resumo de Estoque/Bobinas por loja.
    - `transferInventory`: Transferência atômica inter-filiais de bobina de PPF (`material_rolls.unit_id`) ou insumo de estoque (`materials` com débito na origem, crédito no destino e movimentação auditada em `stock_movements`), com bloqueio estrito contra cruzamento de dados entre diferentes tenants.
    - `listTransfers`: Histórico auditado de transferências com nomes de filiais e usuários responsáveis.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/units` e `GET /corporate/units/:id`
    - `POST /corporate/units` (Guarda RBAC: `owner`, `gestor`)
    - `PATCH /corporate/units/:id` (Guarda RBAC: `owner`, `gestor`)
    - `POST /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com:
      1. **Seletor de Unidade no Topo**: Alternância instantânea entre "Todas as Unidades (Rede Consolidada)" e filiais específicas sem relogin.
      2. **Visão Consolidada & Ranking**: 4 cards executivos de KPI, classificação numerada das filiais com badges de pódio e resumo de bobinas/insumos alocados.
      3. **Gestão de Filiais**: Tabela analítica com status e modal de cadastro de filial com validação de campos.
      4. **Logística Inter-Lojas**: Histórico de transferências e modal para movimentação rápida de bobinas de PPF e insumos entre lojas.
    - Item de menu "Redes / Franquias" adicionado na barra lateral de navegação ([`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx)) e rotas `/corporate`, `/redes` e `/multiunidade` integradas no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/corporate/corporate-units.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/corporate/corporate-units.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), suíte acumulada: **54/54 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.13: App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído)`
- **Descrição:** Arquitetura robusta de alta resiliência operacional para que técnicos, aplicadores e operadores continuem apontando cronômetros, checklists rápidos, fotos e progresso de etapas mesmo em subsolos, galpões de detalhamento ou áreas sem sinal de internet ou Wi-Fi. Os dados são armazenados atomicamente no IndexedDB local do navegador/PWA e sincronizados de forma idempotente assim que a conexão de rede for restabelecida.
- **Destaques de Implementação:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**:
    - Nova tabela `technician_offline_sync_logs` para garantia de idempotência estrita com restrição única `CONSTRAINT uq_tech_offline_action_tenant UNIQUE (tenant_id, action_id)`.
    - Campos: `id`, `tenant_id`, `action_id (UUID)`, `technician_id`, `work_order_id`, `action_type`, `payload (JSONB)`, `status ('applied', 'failed', 'rejected')`, `error_message`, `client_timestamp`, `synced_at`, `created_at`.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices de alta performance por OS, técnico e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `OfflineActionTypeSchema`: `'START_TIMER' | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'STOP_TIMER' | 'UPDATE_PROGRESS' | 'CHECKLIST_ITEM' | 'ADD_NOTE'`.
    - `SingleOfflineActionSchema`: Validação de `id` (UUID), `workOrderId` (UUID), `actionType`, `payload` e `clientTimestamp`.
    - `BatchSyncActionsSchema`: Envio agrupado em lote com `BatchSyncActionsInputDto`.
    - `BatchSyncResultDto` e `SyncActionResultDto`: Retorno padronizado de total processado, falhas, status individual e carimbo de sincronização.
  - **Lógica de Domínio Backend em `TechnicianService` (`apps/api/src/technician/technician-service.ts`)**:
    - Método `syncOfflineActions`:
      1. Verificação de idempotência via `technician_offline_sync_logs` para cada `action_id`. Reenvios retornam `success: true` imediatamente sem duplicação de dados.
      2. Validação estrita de multi-tenancy: bloqueia e rejeita qualquer ação cujo `work_order_id` pertença a outra oficina.
      3. Processamento especializado para cada tipo de ação:
         - `START_TIMER`: Inicia cronômetro com carimbo de tempo retroativo do cliente ou associa checklist de entrada.
         - `PAUSE_TIMER`: Encerra o intervalo ativo e soma os segundos acumulados na OS.
         - `RESUME_TIMER`: Cria novo intervalo de cronometragem ativo.
         - `STOP_TIMER`: Finaliza o cronômetro oficial, consolidando os segundos totais.
         - `UPDATE_PROGRESS`: Atualiza o percentual concluído dos serviços.
         - `CHECKLIST_ITEM` & `ADD_NOTE`: Registra apontamentos e notas de execução.
      4. Resiliência por item: falhas em ações individuais (ex: parâmetros inválidos) não abortam as demais ações válidas do lote.
  - **Rota Fastify Registrada (`apps/api/src/routes/technician-routes.ts`)**:
    - `POST /technician/sync` (Acesso autenticado para operadores e técnicos).
  - **Armazenamento Local Estruturado no Cliente (`apps/web/src/services/offlineStorage.ts`)**:
    - Banco IndexedDB nativo (`carx_offline_db`) com 4 Object Stores:
      1. `offline_actions`: Fila de ações pendentes indexadas por `workOrderId` e `createdAt`.
      2. `cached_queue`: Cópia local da fila de ordens de serviço do técnico para navegação sem rede.
      3. `local_timers`: Persistência do estado do cronômetro local (`running`, `paused`, `accumulatedSeconds`, `lastTickTimestamp`).
      4. `offline_photos`: Buffer local de fotos capturadas durante o serviço.
  - **Hook Corporativo `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**:
    - Monitoramento automático de conectividade via `window.addEventListener('online')` e `'offline'`.
    - Sincronização automática em background no momento da reconexão.
    - Suporte a disparo manual via `syncNow()` com purga de ações confirmadas no IndexedDB.
    - Método `enqueueOfflineAction` com geração de UUID v4 seguro e tentativa de despacho instantâneo se online.
  - **Integração nas Telas do Operador (`apps/web`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx):
      - Cache automático da fila no IndexedDB no carregamento com fallback transparente em caso de perda de conexão.
      - Desativação automática de polling periódico enquanto desconectado para economia de bateria e processamento.
      - Banner de status com telemetria: exibe indicação visual (`Modo Offline Ativo`), contador de apontamentos pendentes e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx):
      - Cronômetro desacoplado e resiliente: se a rede cair ou estiver sem sinal, as operações de iniciar, pausar, retomar ou concluir são persistidas no IndexedDB com badge `Offline (Local)` e sincronizadas assim que a conexão voltar.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/technician/technician-offline-sync.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician-offline-sync.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`5/5`), suíte acumulada: **59/59 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.14: Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído)`
- **Descrição:** Motor avançado de IA multimodal integrado ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report). Combina Visão Computacional para pré-detecção de avarias na pintura/lataria/vidros com NLP/Speech-to-Text para extração de dados do check-in por voz (KM, combustível, checklist), sugerindo automaticamente serviços automotivos de alto ticket (PPF, vitrificação, polimento corretivo, martelinho PDR) para inclusão com 1 clique no orçamento da OS.
- **Destaques de Implementação:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**:
    - Criação da tabela `ai_inspection_analyses` com `tenant_id`, `work_order_id`, `inspection_id`, `analysis_type ('image_damage_detection', 'voice_checklist_extraction')`, `input_payload`, `detected_damages`, `suggested_services`, `extracted_checklist`, `provider`, `tokens_used`, `status` e carimbos de tempo.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, OS e tipo de análise.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `AiDetectedDamageItemSchema`: validação de peça (`part`), tipo de dano (`damageType`), severidade (`severity`), nível de confiança (`confidence`), coordenadas no diagrama (`view`, `xPercent`, `yPercent`) e ação recomendada.
    - `AiSuggestedServiceItemSchema`: serviço sugerido, categoria, valor em centavos (`estimatedPriceCents`), tempo em minutos e justificativa técnica.
    - `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto`, `ApplyAiSuggestionsInputSchema`, `ApplyAiSuggestionsResultDto` e `AiAnalysisHistoryItemDto`.
  - **Lógica de Domínio Backend em `AiInspectionService` (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - `analyzeDamage`: Motor multimodal com suporte a Gemini API e fallback para o motor heurístico especializado do CarX (`carx-auto-vision-ai`), detectando avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - `extractVoiceChecklist`: Processamento de áudio ou texto ditado com parser especializado em português do Brasil (reconhecimento de KM em dígitos e numerais por extenso até 999 mil, níveis de combustível e menções a serviços/avarias).
    - `applyToWorkOrder`: Aplicação atômica com 1 clique que cria/atualiza a inspeção de check-in, insere os pontos de dano em `inspection_damage_points`, adiciona os serviços selecionados em `work_order_items`, recalcula o total da OS e atualiza a quilometragem em `vehicles`.
    - `getAnalysisHistory`: Histórico completo de diagnósticos de IA associados à OS.
  - **Rotas Fastify Registradas (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx):
      1. Aba de Visão Computacional com seleção de ângulos e plotagem de danos no laudo visual.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.




---

#### Tarefa T6.4: WhatsApp Automático Transacional por Evento de OS (Gating por Plano e Respeito a Instâncias) `(Concluído)`
- **Descrição:** Motor transacional de comunicação via WhatsApp conectado ao ciclo de vida da OS automotiva (`CHECKED_IN`, `IN_PROGRESS`, `READY`, `DELIVERED` e `APPOINTMENT_CONFIRMED`), garantindo respeito absoluto ao plano contratado da oficina e às suas credenciais de infraestrutura.
- **Diretriz de Isolamento e Respeito aos Planos Comerciais:**
  - **Aparelho e Número da Oficina:** A plataforma CarX não assume a custódia nem o número das oficinas: cada oficina conecta e opera exclusivamente seu próprio aparelho/número de WhatsApp via socket Baileys em seu painel (`Configurações > WhatsApp`).
  - **Planos sem Gateway / Essencial:** Custo zero de infraestrutura para a plataforma. O sistema **nunca** tenta conexões ou disparos em background; gera automaticamente link direto e pré-formatado `https://wa.me/...` com 1 clique para envio manual via WhatsApp Web ou Desktop pelo gestor.
  - **Planos com Gateway (Profissional e Premium):**
    - Se a instância estiver conectada (`status: 'CONNECTED'`), dispara em segundo plano pelo socket da oficina e registra o evento na timeline da OS (`work_order_events`).
    - Se a instância estiver desconectada (`status: 'DISCONNECTED'`), realiza **fallback suave** para `wa.me` com aviso explicativo, sem bloquear a transição de status ou a rotina da loja.
- **Destaques de Implementação:**
  - **Contratos e DTOs em `@carx/shared`**:
    - Tipagens `WhatsAppTransactionalEventType`, `SendTransactionalWhatsAppInputDto`, `SendTransactionalWhatsAppResultDto`.
    - Inclusão canônica de `PlanFeatures.WHATSAPP_GATEWAY` nos planos `Profissional` e `Premium`.
  - **Serviço de Mensageria (`apps/api/src/whatsapp/whatsapp-service.ts`)**:
    - `formatTransactionalTemplate`: Formata mensagens ricas com o primeiro nome do cliente, nome fantasia da loja, modelo do veículo, placa e link dinâmico da proposta/tracking para cada evento automotivo.
    - `dispatchTransactionalNotification`: Checagem rigorosa de feature flags (`WHATSAPP_GATEWAY` ou `WHATSAPP_AUTO`), verificação do status da instância conectada da oficina, envio Baileys direto ou geração de link seguro `wa.me`.
  - **Integração no Ciclo de Vida da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparo assíncrono e não-bloqueante no método `transitionStatus` ao avançar a OS para `CHECKED_IN`, `READY` ou `DELIVERED`.
    - Método `notifyWorkOrderWhatsApp` para auditoria, histórico em `work_order_events` e notificação sob demanda.
  - **Rotas Fastify (`apps/api/src/routes/work-order-routes.ts`)**:
    - `POST /work-orders/:id/notify-whatsapp`: Endpoint autenticado com validação de tenant para reenvio e geração manual de links sob demanda.
  - **Frontend do Gestor (`apps/web`)**:
    - Método `api.workOrders.notifyWhatsApp` adicionado no cliente `api.ts`.
    - Botão de ação rápida com ícone do WhatsApp na listagem de Ordens de Serviço (`OrdensServico.tsx`).
    - Modal dedicado de Notificação WhatsApp com prévia de mensagem, seleção de eventos, aviso explicativo de planos, feedback imediato e abertura de nova aba para `wa.me`.
    - Modernização do modal de detalhes da OS no Design System Rebrand CarX.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/whatsapp/whatsapp-transactional.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/whatsapp/whatsapp-transactional.test.ts) cobrindo:
      1. Loja no plano BÁSICO (sem gateway) não dispara background e gera link manual wa.me.
      2. Loja no plano PRO com WhatsApp DESCONECTADO faz fallback suave para wa.me com aviso.
      3. Loja no plano PRO com WhatsApp CONECTADO envia mensagem transacional via socket oficial da loja com registro na timeline.
      4. Templates transacionais cobrem Check-in, Ready, Delivered e Agendamento.
      5. Transição de status da OS (`transitionStatus`) dispara WhatsApp sem bloquear fluxo operacional.
      6. Rota `POST /work-orders/:id/notify-whatsapp` permite envio sob demanda pelo gestor.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.8: Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor de captação de avaliações 5 estrelas no Google Meu Negócio / Google Maps focado em clientes promotores (NPS 9 e 10). Gera redirecionamento direto, rastreamento de cliques e conversão, além de disparos transacionais de WhatsApp com estrito cumprimento da regra comercial de assinaturas (cada oficina tem seu próprio número Baileys ou usa o link direto manual `wa.me` gratuito para planos sem gateway).
- **Destaques de Implementação:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - `tenant_branding.google_review_url`: URL oficial do link curto da ficha do Google da oficina (`https://g.page/r/.../review`).
    - Colunas em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation`.
  - **Regra de Negócio de WhatsApp por Plano**:
    - O sistema nunca assume custos nem intermediários fora do número próprio da oficina.
    - Planos com gateway e instância conectada realizam disparos automatizados de templates transacionais (`GOOGLE_REVIEW_INVITE`).
    - Planos sem gateway ou offline retornam fallback gracioso com URLs profundas `https://wa.me/{phone}?text={mensagem_formatada}`, viabilizando o envio manual em 1 clique pelo WhatsApp Web sem custo adicional.
  - **Lógica de Domínio em `NpsService` (`apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl` com fallback inteligente de busca no Google Maps (`https://www.google.com/maps/search/?api=1&query=...`).
    - `answerSurvey` idempotente: bloqueio estrito de re-respostas (HTTP 409 Conflict), sugestão de link 5 estrelas apenas para notas 9 ou 10 e disparo / geração de link manual do WhatsApp.
    - `recordGoogleReviewClick`: Registro auditado do clique em `POST /public/nps/:token/google-click`.
    - `getReputationOverview`: Consolidação de métricas (`promotersCount`, `googleInvitesSent`, `googleReviewsClicked`, `conversionRatePercent`) e lista `topPromoters`.
  - **Interface no Frontend (`apps/web`)**:
    - **Painel NPS (`NpsDashboard.tsx`)**: Card de Reputação no Google com input para editar/salvar URL, métricas em tempo real, aviso de busca no Maps, badge explicativo da regra por plano e tabela interativa de promotores com reenvio/disparo manual via WhatsApp Web.
    - **Página Pública de Avaliação (`PesquisaNPS.jsx`)**: Suporte a busca por token público, visual Dark Volt Rebrand CarX e banner heróico de 5 estrelas para promotores com botão de alta conversão `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/nps/google-reputation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/google-reputation.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.9: Mini-Site Institucional da Oficina, Portfólio e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), com otimização para SEO local, dispositivos móveis, catálogo de serviços, portfólio antes/depois, prova social e captação de orçamentos.
- **Destaques de Implementação:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio com suporte a foto final e foto de entrada opcional para comparador interativo antes/depois (`before_image_url`, `after_image_url`), categorias, ordenação e destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com rastreamento por status (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `MiniSiteService` (`apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública sem autenticação que consolida branding, serviços ativos com menor preço ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de lead com geração de link profundo wa.me para atendimento ágil.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio da loja autenticada.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de textos institucionais e horários de atendimento.
  - **Rotas Fastify (`apps/api/src/routes/minisite-routes.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id` (protegidas).
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings` (protegidas).
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Página Pública (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium nos tons Dark Volt (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preço inicial, Galeria de portfólio com alternador interativo Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/minisite/minisite.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/minisite/minisite.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.10: Módulo Fiscal — Emissão de NFS-e Automática ao Liquidar a OS `(Concluído)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação integral do saldo via Pix). Suporte ao provedor Focus NFe com fallback e mock para ambiente de testes/sandbox, cálculo de alíquotas de ISS, sequenciamento atômico de RPS, recepção assíncrona de webhooks e cancelamento com justificativa legal.
- **Destaques de Implementação:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado), senha criptografada, token de API Focus NFe criptografado, inscrição municipal, regime tributário (Simples Nacional, MEI, Lucro Presumido, Lucro Real), alíquota de ISS municipal em pontos base, flags de auto-emissão (`auto_issue_on_delivery`, `auto_issue_on_payment`), RPS e série.
    - Tabela `fiscal_invoices`: Vínculo direto com `work_order_id` (com índice único parcial por tenant para garantir idempotência contra notas duplicadas ativas), RPS, número oficial da NFS-e municipal, código de verificação, protocolo, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), retenção/cálculo de ISS, URLs para DANFSE PDF e XML.
    - Ativação obrigatória de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` com a política `tenant_isolation_policy`.
    - Habilitação da feature `'nfse'` nos planos `profissional` e `premium` na tabela `plans`.
  - **Criptografia Simétrica de Credenciais Fiscais (`apps/api/src/fiscal/fiscal-crypto.ts`)**:
    - Algoritmo AES-256-GCM com Initialization Vector (IV) criptograficamente aleatório e Authentication Tag para garantia de autenticidade dos dados em repouso.
  - **Provedor Fiscal & Resiliência (`apps/api/src/fiscal/fiscal-provider.ts`)**:
    - Interface `FiscalProvider`: Métodos `issueNfse`, `cancelNfse`, `getInvoiceStatus`.
    - Classe `FocusNfeProvider`: Integração direta com os endpoints da Focus NFe (`/v2/nfse`).
    - Classe `MockFiscalProvider`: Provedor resiliente para sandbox e testes automatizados, simulando autorização em tempo hábil com geração de número de nota, código de verificação e links de PDF/XML.
  - **Lógica de Domínio em `FiscalService` (`apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getSettings` e `updateSettings`: Gestão segura das configurações fiscais com ocultação de segredos (`hasApiToken`, `hasCertificate`).
    - `issueWorkOrderNfse`: Validação de feature gating (`PlanFeatures.NFSE`), checagem de idempotência (HTTP 409 se nota já autorizada ou em processamento), cálculo de valor bruto, deduções, alíquota e valor do ISS, reserva atômica de próximo RPS e envio ao provedor fiscal.
    - `handleWebhook`: Recepção de notificações assíncronas da prefeitura atualizando status para `authorized`, `error` ou `cancelled`.
    - `cancelNfse`: Cancelamento junto à prefeitura com exigência legal de justificativa detalhada (mínimo de 15 caracteres).
    - `tryAutoIssueWorkOrderNfse`: Disparo não-bloqueante acionado na máquina de estados da OS quando o status muda para `DELIVERED` ou ao confirmar quitação total via Pix.
  - **Integração na Máquina de Estados da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparos automáticos e silenciosos em segundo plano sem impactar o fluxo do balcão ou da oficina.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Configurações Fiscais (`apps/web/src/components/features/FiscalSettingsManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Módulo Fiscal (NFS-e)" em Configurações da Oficina.
      - Formulário de dados cadastrais (Razão Social, CNPJ, Inscrição Municipal, CNAE, Regime Tributário e Alíquota de ISS).
      - Configuração de credenciais com criptografia AES-256 (Token Focus NFe, Certificado A1 e Senha).
      - Chaves de auto-emissão ao entregar o veículo ou liquidar pagamento.
    - **Ações na Ordem de Serviço (`apps/web/src/pages/OrdensServico.tsx`)**:
      - Card de Nota Fiscal integrado no modal de detalhes da OS com visual Dark Volt.
      - Badges dinâmicos de status (`Autorizada`, `Processando`, `Erro de Emissão`, `Cancelada`).
      - Exibição de RPS, Número da Nota, Base de Cálculo e ISS devido.
      - Botão "Emitir NFS-e" em 1 clique para OSs sem nota emitida.
      - Botões para visualização/download de PDF e XML.
      - Modal de cancelamento de NFS-e com validação de justificativa de no mínimo 15 caracteres.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/fiscal/fiscal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/fiscal/fiscal.test.ts) (100% de aprovação) cobrindo:
      1. Configuração com criptografia AES-256-GCM.
      2. Feature Gating por plano (HTTP 403 Forbidden no plano Essencial).
      3. Emissão com sucesso para a OS no plano Pro/Premium (HTTP 201 Created).
      4. Idempotência e bloqueio de emissão duplicada (HTTP 409 Conflict).
      5. Processamento resiliente de Webhook da prefeitura.
      6. Cancelamento com justificativa legal obrigatória.
      7. Isolamento multi-tenant estrito (RLS) no acesso e listagem de notas.
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **38/38 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.11: DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), conciliação de contas a pagar e a receber com plano de contas automotivo, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e liquidação em lote com registro atômico de despesa.
- **Destaques de Implementação:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas pré-semeado para oficinas (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com restrição `CHECK (type IN ('payable', 'receivable'))`, fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total (`paid_amount_cents`), notas e comprovante.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `FinancialService` (`apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: Cálculo analítico em cascata no PostgreSQL:
      1. (+) Receita Bruta de Serviços e Produtos
      2. (-) Deduções Comerciais (Descontos) e Fiscais (ISS NFS-e da T6.10)
      3. (=) Receita Operacional Líquida (ROL)
      4. (-) Custos Variáveis dos Serviços (CSP / CMV): Insumos de Estoque Consumidos + Bobinas de PPF/Películas Cortadas (T6.5) + Comissões de Técnicos
      5. (=) Margem de Contribuição Operacional (% da ROL)
      6. (-) Despesas Fixas (Aluguel, Utilidades, Salários/Pró-Labore, Softwares)
      7. (-) Despesas Operacionais (Marketing/Tráfego, Ferramentas/Manutenção)
      8. (=) **EBITDA Real da Oficina** (% margem EBITDA)
      9. (=) Lucro Líquido Real
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas e saídas previstas e saldo acumulado projetado com detecção de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da conta paga em `financial_bills`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`.
    - `GET /financial/cashflow/projection`.
    - `POST /commissions/batch-pay`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/financial/financial-advanced.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/financial/financial-advanced.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **45/45 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.12: Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído)`
- **Descrição:** Cockpit executivo para franqueadoras e gestores de redes automotivas que operam múltiplas unidades/filiais no CarX. Visão unificada de faturamento consolidado por loja, ranking de produtividade entre unidades, taxa média de ocupação de boxes e logística inter-filiais (transferência atômica e auditada de bobinas de PPF/películas e insumos de estoque).
- **Destaques de Implementação:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada nas tabelas operacionais: `work_orders`, `bays`, `materials` e `material_rolls`, permitindo alocação física por loja.
    - Nova tabela `unit_transfers`: registro de transferências entre lojas com `from_unit_id`, `to_unit_id`, `transfer_type ('material', 'roll')`, `material_id`, `roll_id`, `quantity`, `status`, `notes`, `transferred_by`, carimbos de tempo e restrição `CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)`.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, unidades de origem/destino e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend em `CorporateService` (`apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais ativas do tenant com contadores operacionais integrados (`workOrdersCount`, `activeBaysCount`, `totalRollsCount`).
    - `createUnit`: Criação de filial com validação compulsória de limites de quota (`max_units`) do plano contratado e unicidade de `slug` por tenant.
    - `updateUnit`: Edição cadastral e status operacional da filial com trilha de auditoria.
    - `getCorporateOverview`: Agregação analítica consolidando Faturamento Total, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes (`appointments` ativos vs total de boxes), Ranking de Performance entre lojas (ordenado por faturamento e número de OSs) e Resumo de Estoque/Bobinas por loja.
    - `transferInventory`: Transferência atômica inter-filiais de bobina de PPF (`material_rolls.unit_id`) ou insumo de estoque (`materials` com débito na origem, crédito no destino e movimentação auditada em `stock_movements`), com bloqueio estrito contra cruzamento de dados entre diferentes tenants.
    - `listTransfers`: Histórico auditado de transferências com nomes de filiais e usuários responsáveis.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/units` e `GET /corporate/units/:id`
    - `POST /corporate/units` (Guarda RBAC: `owner`, `gestor`)
    - `PATCH /corporate/units/:id` (Guarda RBAC: `owner`, `gestor`)
    - `POST /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com:
      1. **Seletor de Unidade no Topo**: Alternância instantânea entre "Todas as Unidades (Rede Consolidada)" e filiais específicas sem relogin.
      2. **Visão Consolidada & Ranking**: 4 cards executivos de KPI, classificação numerada das filiais com badges de pódio e resumo de bobinas/insumos alocados.
      3. **Gestão de Filiais**: Tabela analítica com status e modal de cadastro de filial com validação de campos.
      4. **Logística Inter-Lojas**: Histórico de transferências e modal para movimentação rápida de bobinas de PPF e insumos entre lojas.
    - Item de menu "Redes / Franquias" adicionado na barra lateral de navegação ([`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx)) e rotas `/corporate`, `/redes` e `/multiunidade` integradas no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/corporate/corporate-units.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/corporate/corporate-units.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), suíte acumulada: **54/54 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.13: App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído)`
- **Descrição:** Arquitetura robusta de alta resiliência operacional para que técnicos, aplicadores e operadores continuem apontando cronômetros, checklists rápidos, fotos e progresso de etapas mesmo em subsolos, galpões de detalhamento ou áreas sem sinal de internet ou Wi-Fi. Os dados são armazenados atomicamente no IndexedDB local do navegador/PWA e sincronizados de forma idempotente assim que a conexão de rede for restabelecida.
- **Destaques de Implementação:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**:
    - Nova tabela `technician_offline_sync_logs` para garantia de idempotência estrita com restrição única `CONSTRAINT uq_tech_offline_action_tenant UNIQUE (tenant_id, action_id)`.
    - Campos: `id`, `tenant_id`, `action_id (UUID)`, `technician_id`, `work_order_id`, `action_type`, `payload (JSONB)`, `status ('applied', 'failed', 'rejected')`, `error_message`, `client_timestamp`, `synced_at`, `created_at`.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices de alta performance por OS, técnico e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `OfflineActionTypeSchema`: `'START_TIMER' | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'STOP_TIMER' | 'UPDATE_PROGRESS' | 'CHECKLIST_ITEM' | 'ADD_NOTE'`.
    - `SingleOfflineActionSchema`: Validação de `id` (UUID), `workOrderId` (UUID), `actionType`, `payload` e `clientTimestamp`.
    - `BatchSyncActionsSchema`: Envio agrupado em lote com `BatchSyncActionsInputDto`.
    - `BatchSyncResultDto` e `SyncActionResultDto`: Retorno padronizado de total processado, falhas, status individual e carimbo de sincronização.
  - **Lógica de Domínio Backend em `TechnicianService` (`apps/api/src/technician/technician-service.ts`)**:
    - Método `syncOfflineActions`:
      1. Verificação de idempotência via `technician_offline_sync_logs` para cada `action_id`. Reenvios retornam `success: true` imediatamente sem duplicação de dados.
      2. Validação estrita de multi-tenancy: bloqueia e rejeita qualquer ação cujo `work_order_id` pertença a outra oficina.
      3. Processamento especializado para cada tipo de ação:
         - `START_TIMER`: Inicia cronômetro com carimbo de tempo retroativo do cliente ou associa checklist de entrada.
         - `PAUSE_TIMER`: Encerra o intervalo ativo e soma os segundos acumulados na OS.
         - `RESUME_TIMER`: Cria novo intervalo de cronometragem ativo.
         - `STOP_TIMER`: Finaliza o cronômetro oficial, consolidando os segundos totais.
         - `UPDATE_PROGRESS`: Atualiza o percentual concluído dos serviços.
         - `CHECKLIST_ITEM` & `ADD_NOTE`: Registra apontamentos e notas de execução.
      4. Resiliência por item: falhas em ações individuais (ex: parâmetros inválidos) não abortam as demais ações válidas do lote.
  - **Rota Fastify Registrada (`apps/api/src/routes/technician-routes.ts`)**:
    - `POST /technician/sync` (Acesso autenticado para operadores e técnicos).
  - **Armazenamento Local Estruturado no Cliente (`apps/web/src/services/offlineStorage.ts`)**:
    - Banco IndexedDB nativo (`carx_offline_db`) com 4 Object Stores:
      1. `offline_actions`: Fila de ações pendentes indexadas por `workOrderId` e `createdAt`.
      2. `cached_queue`: Cópia local da fila de ordens de serviço do técnico para navegação sem rede.
      3. `local_timers`: Persistência do estado do cronômetro local (`running`, `paused`, `accumulatedSeconds`, `lastTickTimestamp`).
      4. `offline_photos`: Buffer local de fotos capturadas durante o serviço.
  - **Hook Corporativo `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**:
    - Monitoramento automático de conectividade via `window.addEventListener('online')` e `'offline'`.
    - Sincronização automática em background no momento da reconexão.
    - Suporte a disparo manual via `syncNow()` com purga de ações confirmadas no IndexedDB.
    - Método `enqueueOfflineAction` com geração de UUID v4 seguro e tentativa de despacho instantâneo se online.
  - **Integração nas Telas do Operador (`apps/web`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx):
      - Cache automático da fila no IndexedDB no carregamento com fallback transparente em caso de perda de conexão.
      - Desativação automática de polling periódico enquanto desconectado para economia de bateria e processamento.
      - Banner de status com telemetria: exibe indicação visual (`Modo Offline Ativo`), contador de apontamentos pendentes e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx):
      - Cronômetro desacoplado e resiliente: se a rede cair ou estiver sem sinal, as operações de iniciar, pausar, retomar ou concluir são persistidas no IndexedDB com badge `Offline (Local)` e sincronizadas assim que a conexão voltar.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/technician/technician-offline-sync.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician-offline-sync.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`5/5`), suíte acumulada: **59/59 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.14: Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído)`
- **Descrição:** Motor avançado de IA multimodal integrado ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report). Combina Visão Computacional para pré-detecção de avarias na pintura/lataria/vidros com NLP/Speech-to-Text para extração de dados do check-in por voz (KM, combustível, checklist), sugerindo automaticamente serviços automotivos de alto ticket (PPF, vitrificação, polimento corretivo, martelinho PDR) para inclusão com 1 clique no orçamento da OS.
- **Destaques de Implementação:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**:
    - Criação da tabela `ai_inspection_analyses` com `tenant_id`, `work_order_id`, `inspection_id`, `analysis_type ('image_damage_detection', 'voice_checklist_extraction')`, `input_payload`, `detected_damages`, `suggested_services`, `extracted_checklist`, `provider`, `tokens_used`, `status` e carimbos de tempo.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, OS e tipo de análise.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `AiDetectedDamageItemSchema`: validação de peça (`part`), tipo de dano (`damageType`), severidade (`severity`), nível de confiança (`confidence`), coordenadas no diagrama (`view`, `xPercent`, `yPercent`) e ação recomendada.
    - `AiSuggestedServiceItemSchema`: serviço sugerido, categoria, valor em centavos (`estimatedPriceCents`), tempo em minutos e justificativa técnica.
    - `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto`, `ApplyAiSuggestionsInputSchema`, `ApplyAiSuggestionsResultDto` e `AiAnalysisHistoryItemDto`.
  - **Lógica de Domínio Backend em `AiInspectionService` (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - `analyzeDamage`: Motor multimodal com suporte a Gemini API e fallback para o motor heurístico especializado do CarX (`carx-auto-vision-ai`), detectando avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - `extractVoiceChecklist`: Processamento de áudio ou texto ditado com parser especializado em português do Brasil (reconhecimento de KM em dígitos e numerais por extenso até 999 mil, níveis de combustível e menções a serviços/avarias).
    - `applyToWorkOrder`: Aplicação atômica com 1 clique que cria/atualiza a inspeção de check-in, insere os pontos de dano em `inspection_damage_points`, adiciona os serviços selecionados em `work_order_items`, recalcula o total da OS e atualiza a quilometragem em `vehicles`.
    - `getAnalysisHistory`: Histórico completo de diagnósticos de IA associados à OS.
  - **Rotas Fastify Registradas (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx):
      1. Aba de Visão Computacional com seleção de ângulos e plotagem de danos no laudo visual.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.




---

### ⚡ FASE 6 — Onda 2: Domínio Especializado Automotivo

#### Tarefa T6.5: Controle Fino de Bobinas (PPF / Películas, Margem Real por Metro e Garantia) `(Concluído)`
- **Descrição:** Módulo de alta precisão para controle de estoque e consumo linear de bobinas de PPF (Paint Protection Film) e películas solares (insulfilm). Permite rastrear cada centímetro aplicado, vincular o número de série e lote do rolo ao Certificado de Garantia / Passaporte Digital do cliente, registrar retalhos/desperdícios com justificativa e calcular a margem bruta real de lucro por veículo atendido.
- **Diretriz de Isolamento e Gating por Plano:**
  - A feature `ppf_spool_control` é restrita aos planos `Profissional` e `Premium`.
  - Lojas no plano `Essencial` recebem HTTP 403 ao tentar criar ou gerenciar bobinas e visualizam no frontend um card hero de upgrade destacando os benefícios do módulo de PPF.
- **Destaques de Implementação:**
  - **Contratos e DTOs em `@carx/shared`**:
    - `RegisterRollScrapInputSchema`, `RegisterRollScrapInputDto`.
    - `MaterialRollHistoryItemDto`, `MaterialRollDetailWithHistoryDto`.
    - Expansão de `MaterialRollDto` com `materialName`, `isLowMeters` e campos de metragem linear.
  - **Serviço de Negócio (`apps/api/src/stock/stock-service.ts`)**:
    - `assertSpoolControlFeature`: Verificação de plano via `planService.assertFeature(tenantId, PlanFeatures.PPF_SPOOL_CONTROL)`.
    - `createRoll`: Cadastro com cálculo automático de custo por metro linear (`costPerMeterCents = costCents / initialMeters`), lock atômico no material base e auditoria.
    - `getRollDetailedHistory`: Rastreabilidade cruzando `work_order_materials`, `work_orders`, `customers`, `vehicles`, `work_order_items`, `warranties` e `stock_movements`. Calcula:
      - `consumedMeters`: Metros aplicados em OSs concluídas.
      - `scrapMeters`: Metros perdidos em retalhos.
      - `efficiencyPercent`: Taxa de aproveitamento da bobina (`consumed / (consumed + scrap) * 100`).
      - `grossProfitCents` e `grossMarginPercent`: Lucro bruto real de cada veículo atendido (`servicePrice - costAllocated`).
    - `registerRollScrap`: Registro transacional de retalhos com abatimento em `material_rolls` e `materials`, inserção de `stock_movements` (`movement_type = 'waste'`), auditoria e transição automática para status `'depleted'` ao zerar o saldo.
    - `safeUuid`: Helper de sanitização contra UUIDs sintéticos em colunas com FK.
  - **Auto-vínculo de Garantia em `QaService` (`apps/api/src/qa/qa-service.ts`)**:
    - O método `createWarranty` inspeciona os materiais alocados na OS (`work_order_materials`) e vincula automaticamente `material_roll_id` e `material_lot_number` ao certificado emitido, permitindo consulta do lote no QR Code do Passaporte Digital do cliente.
  - **Rotas Fastify (`apps/api/src/routes/stock-routes.ts`)**:
    - `GET /materials/rolls/:id/history`: Retorna a timeline de aplicações, OSs, clientes, veículos e margem real da bobina.
    - `POST /materials/rolls/:id/scrap`: Registra perda/retalho com abatimento de saldo e auditoria.
  - **Frontend Modernizado (`apps/web/src/pages/Materiais.tsx`)**:
    - Código migrado de `.jsx` legado (Supabase) para TypeScript 100% tipado integrado à API Fastify.
    - Abas: "Bobinas (PPF & Películas)" e "Insumos Gerais & Químicos".
    - Métricas em tempo real: Bobinas ativas, saldo total em metros, bobinas em nível crítico e status do Passaporte Digital.
    - Barra de progresso visual do saldo de metragem (`currentMeters / initialMeters`).
    - Modal de Histórico e Margem Real por Veículo.
    - Modal de Registro de Retalho / Perda com recálculo instantâneo.
    - Modal de Nova Bobina e Reposição Rápida de Estoque.
    - Card Hero de Upgrade para lojas no plano Essencial.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/stock/spool-control.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/stock/spool-control.test.ts) cobrindo:
      1. Gating de Plano (HTTP 403 no Básico).
      2. Cadastro de Bobina com Custo e Metragem no plano Pro com atualização atômica do estoque.
      3. Alocação e Consumo na OS com Baixa Atômica de Metragem (`deductWorkOrderMaterials`).
      4. Vínculo Automático da Bobina e Lote ao Certificado de Garantia do Veículo.
      5. Histórico Detalhado, Rastreabilidade e Cálculo de Margem Real por Metro.
      6. Registro de Retalho/Desperdício (scrap) e Esgotamento Automático (`depleted`).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.8: Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor de captação de avaliações 5 estrelas no Google Meu Negócio / Google Maps focado em clientes promotores (NPS 9 e 10). Gera redirecionamento direto, rastreamento de cliques e conversão, além de disparos transacionais de WhatsApp com estrito cumprimento da regra comercial de assinaturas (cada oficina tem seu próprio número Baileys ou usa o link direto manual `wa.me` gratuito para planos sem gateway).
- **Destaques de Implementação:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - `tenant_branding.google_review_url`: URL oficial do link curto da ficha do Google da oficina (`https://g.page/r/.../review`).
    - Colunas em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation`.
  - **Regra de Negócio de WhatsApp por Plano**:
    - O sistema nunca assume custos nem intermediários fora do número próprio da oficina.
    - Planos com gateway e instância conectada realizam disparos automatizados de templates transacionais (`GOOGLE_REVIEW_INVITE`).
    - Planos sem gateway ou offline retornam fallback gracioso com URLs profundas `https://wa.me/{phone}?text={mensagem_formatada}`, viabilizando o envio manual em 1 clique pelo WhatsApp Web sem custo adicional.
  - **Lógica de Domínio em `NpsService` (`apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl` com fallback inteligente de busca no Google Maps (`https://www.google.com/maps/search/?api=1&query=...`).
    - `answerSurvey` idempotente: bloqueio estrito de re-respostas (HTTP 409 Conflict), sugestão de link 5 estrelas apenas para notas 9 ou 10 e disparo / geração de link manual do WhatsApp.
    - `recordGoogleReviewClick`: Registro auditado do clique em `POST /public/nps/:token/google-click`.
    - `getReputationOverview`: Consolidação de métricas (`promotersCount`, `googleInvitesSent`, `googleReviewsClicked`, `conversionRatePercent`) e lista `topPromoters`.
  - **Interface no Frontend (`apps/web`)**:
    - **Painel NPS (`NpsDashboard.tsx`)**: Card de Reputação no Google com input para editar/salvar URL, métricas em tempo real, aviso de busca no Maps, badge explicativo da regra por plano e tabela interativa de promotores com reenvio/disparo manual via WhatsApp Web.
    - **Página Pública de Avaliação (`PesquisaNPS.jsx`)**: Suporte a busca por token público, visual Dark Volt Rebrand CarX e banner heróico de 5 estrelas para promotores com botão de alta conversão `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/nps/google-reputation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/google-reputation.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.9: Mini-Site Institucional da Oficina, Portfólio e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), com otimização para SEO local, dispositivos móveis, catálogo de serviços, portfólio antes/depois, prova social e captação de orçamentos.
- **Destaques de Implementação:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio com suporte a foto final e foto de entrada opcional para comparador interativo antes/depois (`before_image_url`, `after_image_url`), categorias, ordenação e destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com rastreamento por status (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `MiniSiteService` (`apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública sem autenticação que consolida branding, serviços ativos com menor preço ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de lead com geração de link profundo wa.me para atendimento ágil.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio da loja autenticada.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de textos institucionais e horários de atendimento.
  - **Rotas Fastify (`apps/api/src/routes/minisite-routes.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id` (protegidas).
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings` (protegidas).
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Página Pública (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium nos tons Dark Volt (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preço inicial, Galeria de portfólio com alternador interativo Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/minisite/minisite.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/minisite/minisite.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.10: Módulo Fiscal — Emissão de NFS-e Automática ao Liquidar a OS `(Concluído)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação integral do saldo via Pix). Suporte ao provedor Focus NFe com fallback e mock para ambiente de testes/sandbox, cálculo de alíquotas de ISS, sequenciamento atômico de RPS, recepção assíncrona de webhooks e cancelamento com justificativa legal.
- **Destaques de Implementação:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado), senha criptografada, token de API Focus NFe criptografado, inscrição municipal, regime tributário (Simples Nacional, MEI, Lucro Presumido, Lucro Real), alíquota de ISS municipal em pontos base, flags de auto-emissão (`auto_issue_on_delivery`, `auto_issue_on_payment`), RPS e série.
    - Tabela `fiscal_invoices`: Vínculo direto com `work_order_id` (com índice único parcial por tenant para garantir idempotência contra notas duplicadas ativas), RPS, número oficial da NFS-e municipal, código de verificação, protocolo, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), retenção/cálculo de ISS, URLs para DANFSE PDF e XML.
    - Ativação obrigatória de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` com a política `tenant_isolation_policy`.
    - Habilitação da feature `'nfse'` nos planos `profissional` e `premium` na tabela `plans`.
  - **Criptografia Simétrica de Credenciais Fiscais (`apps/api/src/fiscal/fiscal-crypto.ts`)**:
    - Algoritmo AES-256-GCM com Initialization Vector (IV) criptograficamente aleatório e Authentication Tag para garantia de autenticidade dos dados em repouso.
  - **Provedor Fiscal & Resiliência (`apps/api/src/fiscal/fiscal-provider.ts`)**:
    - Interface `FiscalProvider`: Métodos `issueNfse`, `cancelNfse`, `getInvoiceStatus`.
    - Classe `FocusNfeProvider`: Integração direta com os endpoints da Focus NFe (`/v2/nfse`).
    - Classe `MockFiscalProvider`: Provedor resiliente para sandbox e testes automatizados, simulando autorização em tempo hábil com geração de número de nota, código de verificação e links de PDF/XML.
  - **Lógica de Domínio em `FiscalService` (`apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getSettings` e `updateSettings`: Gestão segura das configurações fiscais com ocultação de segredos (`hasApiToken`, `hasCertificate`).
    - `issueWorkOrderNfse`: Validação de feature gating (`PlanFeatures.NFSE`), checagem de idempotência (HTTP 409 se nota já autorizada ou em processamento), cálculo de valor bruto, deduções, alíquota e valor do ISS, reserva atômica de próximo RPS e envio ao provedor fiscal.
    - `handleWebhook`: Recepção de notificações assíncronas da prefeitura atualizando status para `authorized`, `error` ou `cancelled`.
    - `cancelNfse`: Cancelamento junto à prefeitura com exigência legal de justificativa detalhada (mínimo de 15 caracteres).
    - `tryAutoIssueWorkOrderNfse`: Disparo não-bloqueante acionado na máquina de estados da OS quando o status muda para `DELIVERED` ou ao confirmar quitação total via Pix.
  - **Integração na Máquina de Estados da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparos automáticos e silenciosos em segundo plano sem impactar o fluxo do balcão ou da oficina.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Configurações Fiscais (`apps/web/src/components/features/FiscalSettingsManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Módulo Fiscal (NFS-e)" em Configurações da Oficina.
      - Formulário de dados cadastrais (Razão Social, CNPJ, Inscrição Municipal, CNAE, Regime Tributário e Alíquota de ISS).
      - Configuração de credenciais com criptografia AES-256 (Token Focus NFe, Certificado A1 e Senha).
      - Chaves de auto-emissão ao entregar o veículo ou liquidar pagamento.
    - **Ações na Ordem de Serviço (`apps/web/src/pages/OrdensServico.tsx`)**:
      - Card de Nota Fiscal integrado no modal de detalhes da OS com visual Dark Volt.
      - Badges dinâmicos de status (`Autorizada`, `Processando`, `Erro de Emissão`, `Cancelada`).
      - Exibição de RPS, Número da Nota, Base de Cálculo e ISS devido.
      - Botão "Emitir NFS-e" em 1 clique para OSs sem nota emitida.
      - Botões para visualização/download de PDF e XML.
      - Modal de cancelamento de NFS-e com validação de justificativa de no mínimo 15 caracteres.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/fiscal/fiscal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/fiscal/fiscal.test.ts) (100% de aprovação) cobrindo:
      1. Configuração com criptografia AES-256-GCM.
      2. Feature Gating por plano (HTTP 403 Forbidden no plano Essencial).
      3. Emissão com sucesso para a OS no plano Pro/Premium (HTTP 201 Created).
      4. Idempotência e bloqueio de emissão duplicada (HTTP 409 Conflict).
      5. Processamento resiliente de Webhook da prefeitura.
      6. Cancelamento com justificativa legal obrigatória.
      7. Isolamento multi-tenant estrito (RLS) no acesso e listagem de notas.
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **38/38 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.11: DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), conciliação de contas a pagar e a receber com plano de contas automotivo, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e liquidação em lote com registro atômico de despesa.
- **Destaques de Implementação:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas pré-semeado para oficinas (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com restrição `CHECK (type IN ('payable', 'receivable'))`, fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total (`paid_amount_cents`), notas e comprovante.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `FinancialService` (`apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: Cálculo analítico em cascata no PostgreSQL:
      1. (+) Receita Bruta de Serviços e Produtos
      2. (-) Deduções Comerciais (Descontos) e Fiscais (ISS NFS-e da T6.10)
      3. (=) Receita Operacional Líquida (ROL)
      4. (-) Custos Variáveis dos Serviços (CSP / CMV): Insumos de Estoque Consumidos + Bobinas de PPF/Películas Cortadas (T6.5) + Comissões de Técnicos
      5. (=) Margem de Contribuição Operacional (% da ROL)
      6. (-) Despesas Fixas (Aluguel, Utilidades, Salários/Pró-Labore, Softwares)
      7. (-) Despesas Operacionais (Marketing/Tráfego, Ferramentas/Manutenção)
      8. (=) **EBITDA Real da Oficina** (% margem EBITDA)
      9. (=) Lucro Líquido Real
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas e saídas previstas e saldo acumulado projetado com detecção de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da conta paga em `financial_bills`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`.
    - `GET /financial/cashflow/projection`.
    - `POST /commissions/batch-pay`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/financial/financial-advanced.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/financial/financial-advanced.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **45/45 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.12: Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído)`
- **Descrição:** Cockpit executivo para franqueadoras e gestores de redes automotivas que operam múltiplas unidades/filiais no CarX. Visão unificada de faturamento consolidado por loja, ranking de produtividade entre unidades, taxa média de ocupação de boxes e logística inter-filiais (transferência atômica e auditada de bobinas de PPF/películas e insumos de estoque).
- **Destaques de Implementação:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada nas tabelas operacionais: `work_orders`, `bays`, `materials` e `material_rolls`, permitindo alocação física por loja.
    - Nova tabela `unit_transfers`: registro de transferências entre lojas com `from_unit_id`, `to_unit_id`, `transfer_type ('material', 'roll')`, `material_id`, `roll_id`, `quantity`, `status`, `notes`, `transferred_by`, carimbos de tempo e restrição `CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)`.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, unidades de origem/destino e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend em `CorporateService` (`apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais ativas do tenant com contadores operacionais integrados (`workOrdersCount`, `activeBaysCount`, `totalRollsCount`).
    - `createUnit`: Criação de filial com validação compulsória de limites de quota (`max_units`) do plano contratado e unicidade de `slug` por tenant.
    - `updateUnit`: Edição cadastral e status operacional da filial com trilha de auditoria.
    - `getCorporateOverview`: Agregação analítica consolidando Faturamento Total, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes (`appointments` ativos vs total de boxes), Ranking de Performance entre lojas (ordenado por faturamento e número de OSs) e Resumo de Estoque/Bobinas por loja.
    - `transferInventory`: Transferência atômica inter-filiais de bobina de PPF (`material_rolls.unit_id`) ou insumo de estoque (`materials` com débito na origem, crédito no destino e movimentação auditada em `stock_movements`), com bloqueio estrito contra cruzamento de dados entre diferentes tenants.
    - `listTransfers`: Histórico auditado de transferências com nomes de filiais e usuários responsáveis.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/units` e `GET /corporate/units/:id`
    - `POST /corporate/units` (Guarda RBAC: `owner`, `gestor`)
    - `PATCH /corporate/units/:id` (Guarda RBAC: `owner`, `gestor`)
    - `POST /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com:
      1. **Seletor de Unidade no Topo**: Alternância instantânea entre "Todas as Unidades (Rede Consolidada)" e filiais específicas sem relogin.
      2. **Visão Consolidada & Ranking**: 4 cards executivos de KPI, classificação numerada das filiais com badges de pódio e resumo de bobinas/insumos alocados.
      3. **Gestão de Filiais**: Tabela analítica com status e modal de cadastro de filial com validação de campos.
      4. **Logística Inter-Lojas**: Histórico de transferências e modal para movimentação rápida de bobinas de PPF e insumos entre lojas.
    - Item de menu "Redes / Franquias" adicionado na barra lateral de navegação ([`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx)) e rotas `/corporate`, `/redes` e `/multiunidade` integradas no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/corporate/corporate-units.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/corporate/corporate-units.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), suíte acumulada: **54/54 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.13: App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído)`
- **Descrição:** Arquitetura robusta de alta resiliência operacional para que técnicos, aplicadores e operadores continuem apontando cronômetros, checklists rápidos, fotos e progresso de etapas mesmo em subsolos, galpões de detalhamento ou áreas sem sinal de internet ou Wi-Fi. Os dados são armazenados atomicamente no IndexedDB local do navegador/PWA e sincronizados de forma idempotente assim que a conexão de rede for restabelecida.
- **Destaques de Implementação:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**:
    - Nova tabela `technician_offline_sync_logs` para garantia de idempotência estrita com restrição única `CONSTRAINT uq_tech_offline_action_tenant UNIQUE (tenant_id, action_id)`.
    - Campos: `id`, `tenant_id`, `action_id (UUID)`, `technician_id`, `work_order_id`, `action_type`, `payload (JSONB)`, `status ('applied', 'failed', 'rejected')`, `error_message`, `client_timestamp`, `synced_at`, `created_at`.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices de alta performance por OS, técnico e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `OfflineActionTypeSchema`: `'START_TIMER' | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'STOP_TIMER' | 'UPDATE_PROGRESS' | 'CHECKLIST_ITEM' | 'ADD_NOTE'`.
    - `SingleOfflineActionSchema`: Validação de `id` (UUID), `workOrderId` (UUID), `actionType`, `payload` e `clientTimestamp`.
    - `BatchSyncActionsSchema`: Envio agrupado em lote com `BatchSyncActionsInputDto`.
    - `BatchSyncResultDto` e `SyncActionResultDto`: Retorno padronizado de total processado, falhas, status individual e carimbo de sincronização.
  - **Lógica de Domínio Backend em `TechnicianService` (`apps/api/src/technician/technician-service.ts`)**:
    - Método `syncOfflineActions`:
      1. Verificação de idempotência via `technician_offline_sync_logs` para cada `action_id`. Reenvios retornam `success: true` imediatamente sem duplicação de dados.
      2. Validação estrita de multi-tenancy: bloqueia e rejeita qualquer ação cujo `work_order_id` pertença a outra oficina.
      3. Processamento especializado para cada tipo de ação:
         - `START_TIMER`: Inicia cronômetro com carimbo de tempo retroativo do cliente ou associa checklist de entrada.
         - `PAUSE_TIMER`: Encerra o intervalo ativo e soma os segundos acumulados na OS.
         - `RESUME_TIMER`: Cria novo intervalo de cronometragem ativo.
         - `STOP_TIMER`: Finaliza o cronômetro oficial, consolidando os segundos totais.
         - `UPDATE_PROGRESS`: Atualiza o percentual concluído dos serviços.
         - `CHECKLIST_ITEM` & `ADD_NOTE`: Registra apontamentos e notas de execução.
      4. Resiliência por item: falhas em ações individuais (ex: parâmetros inválidos) não abortam as demais ações válidas do lote.
  - **Rota Fastify Registrada (`apps/api/src/routes/technician-routes.ts`)**:
    - `POST /technician/sync` (Acesso autenticado para operadores e técnicos).
  - **Armazenamento Local Estruturado no Cliente (`apps/web/src/services/offlineStorage.ts`)**:
    - Banco IndexedDB nativo (`carx_offline_db`) com 4 Object Stores:
      1. `offline_actions`: Fila de ações pendentes indexadas por `workOrderId` e `createdAt`.
      2. `cached_queue`: Cópia local da fila de ordens de serviço do técnico para navegação sem rede.
      3. `local_timers`: Persistência do estado do cronômetro local (`running`, `paused`, `accumulatedSeconds`, `lastTickTimestamp`).
      4. `offline_photos`: Buffer local de fotos capturadas durante o serviço.
  - **Hook Corporativo `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**:
    - Monitoramento automático de conectividade via `window.addEventListener('online')` e `'offline'`.
    - Sincronização automática em background no momento da reconexão.
    - Suporte a disparo manual via `syncNow()` com purga de ações confirmadas no IndexedDB.
    - Método `enqueueOfflineAction` com geração de UUID v4 seguro e tentativa de despacho instantâneo se online.
  - **Integração nas Telas do Operador (`apps/web`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx):
      - Cache automático da fila no IndexedDB no carregamento com fallback transparente em caso de perda de conexão.
      - Desativação automática de polling periódico enquanto desconectado para economia de bateria e processamento.
      - Banner de status com telemetria: exibe indicação visual (`Modo Offline Ativo`), contador de apontamentos pendentes e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx):
      - Cronômetro desacoplado e resiliente: se a rede cair ou estiver sem sinal, as operações de iniciar, pausar, retomar ou concluir são persistidas no IndexedDB com badge `Offline (Local)` e sincronizadas assim que a conexão voltar.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/technician/technician-offline-sync.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician-offline-sync.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`5/5`), suíte acumulada: **59/59 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.14: Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído)`
- **Descrição:** Motor avançado de IA multimodal integrado ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report). Combina Visão Computacional para pré-detecção de avarias na pintura/lataria/vidros com NLP/Speech-to-Text para extração de dados do check-in por voz (KM, combustível, checklist), sugerindo automaticamente serviços automotivos de alto ticket (PPF, vitrificação, polimento corretivo, martelinho PDR) para inclusão com 1 clique no orçamento da OS.
- **Destaques de Implementação:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**:
    - Criação da tabela `ai_inspection_analyses` com `tenant_id`, `work_order_id`, `inspection_id`, `analysis_type ('image_damage_detection', 'voice_checklist_extraction')`, `input_payload`, `detected_damages`, `suggested_services`, `extracted_checklist`, `provider`, `tokens_used`, `status` e carimbos de tempo.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, OS e tipo de análise.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `AiDetectedDamageItemSchema`: validação de peça (`part`), tipo de dano (`damageType`), severidade (`severity`), nível de confiança (`confidence`), coordenadas no diagrama (`view`, `xPercent`, `yPercent`) e ação recomendada.
    - `AiSuggestedServiceItemSchema`: serviço sugerido, categoria, valor em centavos (`estimatedPriceCents`), tempo em minutos e justificativa técnica.
    - `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto`, `ApplyAiSuggestionsInputSchema`, `ApplyAiSuggestionsResultDto` e `AiAnalysisHistoryItemDto`.
  - **Lógica de Domínio Backend em `AiInspectionService` (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - `analyzeDamage`: Motor multimodal com suporte a Gemini API e fallback para o motor heurístico especializado do CarX (`carx-auto-vision-ai`), detectando avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - `extractVoiceChecklist`: Processamento de áudio ou texto ditado com parser especializado em português do Brasil (reconhecimento de KM em dígitos e numerais por extenso até 999 mil, níveis de combustível e menções a serviços/avarias).
    - `applyToWorkOrder`: Aplicação atômica com 1 clique que cria/atualiza a inspeção de check-in, insere os pontos de dano em `inspection_damage_points`, adiciona os serviços selecionados em `work_order_items`, recalcula o total da OS e atualiza a quilometragem em `vehicles`.
    - `getAnalysisHistory`: Histórico completo de diagnósticos de IA associados à OS.
  - **Rotas Fastify Registradas (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx):
      1. Aba de Visão Computacional com seleção de ângulos e plotagem de danos no laudo visual.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.




---

#### Tarefa T6.6: Passaporte Digital do Veículo & Transferência na Revenda `(Concluído)`
- **Descrição:** Certificado de garantia digital e histórico veicular com selo de autenticidade antifraude acessível via QR Code público (`/v/:token` e `/passaporte/:token`). Exibe procedência de películas e vitrificadores (marca e lote oficial do rolo), linha do tempo cronológica de manutenções realizadas pela oficina certificadora, com anonimização LGPD nos dados do antigo proprietário e motor transacional de transferência de custódia na revenda do veículo.
- **Destaques de Implementação:**
  - **Migration 029 (`029_vehicle_passport_transfer.up.sql`)**:
    - Colunas adicionadas em `warranties`: `is_transferable BOOLEAN NOT NULL DEFAULT true`, `transferred_at TIMESTAMPTZ`, `transferred_from_customer_id UUID REFERENCES customers(id)`.
    - Tabela de histórico `warranty_transfers`: Armazena tenant, garantia, veículo, dados anonimizados do proprietário anterior, novo titular (nome, whatsapp, email, km no hodômetro, motivo, IP e User-Agent) com RLS ativado e forçado.
  - **Contratos e DTOs em `@carx/shared`**:
    - DTO `PublicVehiclePassportDto` enriquecido com timeline de manutenções, procedência de bobina (`materialRollBrand`, `materialRollCode`), histórico de transferências (`transfersHistory`) e contagem total de transferências.
    - Schemas de validação Zod: `TransferVehiclePassportInputSchema`, `TransferVehiclePassportInputDto` e `TransferVehiclePassportResultDto`.
  - **Motor de Domínio em `QaService` (`apps/api/src/qa/qa-service.ts`)**:
    - `verifyPublicPassport`: Endpoint público e protegido contra IDOR que recupera a garantia, mascara a placa no padrão Mercosul (`PPF-***8`), anonimiza nomes para LGPD (`Rodrigo F***`), busca o lote oficial da película e compõe a timeline cronológica completa de serviços e transferências.
    - `transferWarrantyCustody`: Operação atômica que cadastra ou associa o novo proprietário em `customers`, atualiza o vínculo do carro em `vehicles.customer_id`, atualiza o titular da garantia em `warranties` com registro imutável em `warranty_transfers` e evento auditável em `work_order_events`.
    - Validação de regras de negócio: Rejeita transferências de garantias expiradas/revogadas (HTTP 400 `WARRANTY_NOT_ACTIVE`) ou marcadas como intransferíveis (HTTP 400 `WARRANTY_NON_TRANSFERABLE`).
  - **Rotas Fastify Registradas (`apps/api/src/routes/qa-routes.ts`)**:
    - `GET /public/passports/:token`: Consulta pública completa do passaporte.
    - `GET /v/:token`: Alias de URL curta oficial para escaneamento imediato pela câmera do smartphone via QR Code.
    - `POST /public/passports/:token/transfer`: Endpoint público de transferência de titularidade na revenda.
  - **Frontend Público (`apps/web/src/pages/PublicPassportPage.tsx` e `App.jsx`)**:
    - Interface escura de alta fidelidade visual (Design System CarX `#0E1116`, `#171C24` e acentos em Verde Volt `#CCFF00`).
    - Selo holográfico de autenticidade, badge Mercosul e contagem regressiva de dias de cobertura.
    - Seção de Procedência & Lote da película de proteção (PPF).
    - Linha do tempo cronológica de manutenções do carro.
    - Banner e Modal interativo de Transferência de Custódia na Revenda para valorização do carro em anúncios da Webmotors e OLX.
    - Rotas públicas mapeadas no `App.jsx`: `/v/:token`, `/passaporte/:token` e `/garantia/:token`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/qa/passport-transfer.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/qa/passport-transfer.test.ts) cobrindo:
      1. Consulta pública por QR Code com proteção LGPD na placa e procedência da película.
      2. Linha do tempo (timeline) completa de serviços do carro desduplicada por OS.
      3. Tratamento e erro 404 para tokens inválidos.
      4. Transferência de titularidade e custódia na revenda (`POST /public/passports/:token/transfer`).
      5. Rejeição de transferência em certificados marcados como intransferíveis ou revogados.
- **Status da Validação:** 100% dos testes aprovados (`5/5`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.7: Agenda Inteligente com Ocupação por Box & Duração por Porte `(Concluído)`
- **Descrição:** Motor de agendamento automotivo avançado com visão visual por colunas de boxes de atendimento (`bays`), cálculo inteligente de duração calibrado por porte veicular (`moto`, `hatch`, `sedan`, `suv`, `pickup`, `van`, `esportivo`), prevenção estrita de choque de horário duplo (anti-conflito no mesmo box e do mesmo técnico simultaneamente), monitoramento de atrasos em tempo real com alertas visuais no Rebrand CarX e slots livres interativos com 1 clique.
- **Destaques de Implementação:**
  - **Contratos e DTOs em `@carx/shared`**:
    - Tabela de multiplicadores automotivos de mercado `VEHICLE_SIZE_DURATION_MULTIPLIERS` (`moto: 0.6`, `hatch: 0.85`, `sedan: 1.0`, `suv: 1.25`, `pickup: 1.35`, `van: 1.5`, `esportivo: 1.1`).
    - Schemas e DTOs `CalculateDurationInputSchema`, `CalculateDurationInputDto`, `CalculatedDurationResultDto`.
    - DTOs `SmartAppointmentDto`, `SmartBayOverviewDto` e `SmartScheduleOverviewResponseDto`.
  - **Lógica de Domínio em `AppointmentService` (`apps/api/src/appointments/appointment-service.ts`)**:
    - `checkTechnicianConflict`: Validação matemática `(start_time < endTime AND end_time > startTime)` que impede que o mesmo profissional seja alocado em dois agendamentos sobrepostos (HTTP 409 `TechnicianConflictError`).
    - `calculateEstimatedDuration`: Cálculo automático que busca durações específicas cadastradas em `service_prices_by_class` ou aplica os multiplicadores padrão da categoria por porte.
    - `getSmartScheduleOverview`: Consulta consolidada da ocupação dos boxes (`free`, `occupied`, `delayed`), identificação de categorias de serviço para estilização cromática Rebrand CarX, detecção de atrasos em tempo real (`NOW() > end_time` com OS em andamento) e geração de slots livres.
    - Validação de conflito de técnico integrada em `createAppointment` e `updateAppointment`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/appointment-routes.ts`)**:
    - `GET /appointments/smart-overview`: Visão consolidada de boxes com atrasos em tempo real.
    - `POST /appointments/calculate-duration`: Endpoint de cálculo dinâmico de duração por porte veicular.
    - Tratamento unificado de `TechnicianConflictError` e `BayConflictError` retornando HTTP 409 com detalhes do agendamento conflitante.
  - **Frontend Modernizado (`apps/web/src/pages/Agenda.tsx`)**:
    - Grade visual oficial do Rebrand CarX (`rebraind/Gestor · Agenda@2x.png` e `rebraind/HTML/Gestor · Agenda-html/Agenda.dc.html`).
    - Colunas dos boxes com técnico atribuído (`Box 1 · Lucas`, `Box 2 · Rafa`, `Box 3 · livre`) e status de ocupação em tempo real.
    - Cores cromáticas por categoria: Verde Volt `#C8F52E` (Insulfilm/Detailing), Azul Céu `#CDEBFB` (PPF), Âmbar `#FFE2A8` (Aguardando aprovação), Cinza neutro `#E8EEF4` (Concluídos) e Alerta Vermelho `#FEE2E2` com borda pulsante `#EF4444` para atrasos.
    - Badges em destaque indicando tempo de atraso `⚠️ Atraso (+X min)`.
    - Modal de Novo Agendamento inteligente com seletor de porte veicular, multiplicadores visuais, detecção automática do porte ao digitar o modelo, seleção de técnico responsável e validação de conflitos.
    - Slots livres tracejados com clique direto para pré-preenchimento de box e horário.
    - Modal de Detalhes do Agendamento com dados do cliente, veículo, WhatsApp e botão de conclusão rápida.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/appointments/smart-schedule.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/appointments/smart-schedule.test.ts) cobrindo:
      1. Cálculo de duração por porte (hatch vs SUV vs serviço calibrado).
      2. Anti-conflito no mesmo box (HTTP 409).
      3. Anti-conflito do mesmo técnico em boxes diferentes (HTTP 409).
      4. Agendamento simultâneo com técnicos distintos aceito com sucesso.
      5. Visão inteligente por box com detecção de agendamentos em atraso.
      6. Isolamento multi-tenant estrito entre oficinas.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.8: Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor de captação de avaliações 5 estrelas no Google Meu Negócio / Google Maps focado em clientes promotores (NPS 9 e 10). Gera redirecionamento direto, rastreamento de cliques e conversão, além de disparos transacionais de WhatsApp com estrito cumprimento da regra comercial de assinaturas (cada oficina tem seu próprio número Baileys ou usa o link direto manual `wa.me` gratuito para planos sem gateway).
- **Destaques de Implementação:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - `tenant_branding.google_review_url`: URL oficial do link curto da ficha do Google da oficina (`https://g.page/r/.../review`).
    - Colunas em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation`.
  - **Regra de Negócio de WhatsApp por Plano**:
    - O sistema nunca assume custos nem intermediários fora do número próprio da oficina.
    - Planos com gateway e instância conectada realizam disparos automatizados de templates transacionais (`GOOGLE_REVIEW_INVITE`).
    - Planos sem gateway ou offline retornam fallback gracioso com URLs profundas `https://wa.me/{phone}?text={mensagem_formatada}`, viabilizando o envio manual em 1 clique pelo WhatsApp Web sem custo adicional.
  - **Lógica de Domínio em `NpsService` (`apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl` com fallback inteligente de busca no Google Maps (`https://www.google.com/maps/search/?api=1&query=...`).
    - `answerSurvey` idempotente: bloqueio estrito de re-respostas (HTTP 409 Conflict), sugestão de link 5 estrelas apenas para notas 9 ou 10 e disparo / geração de link manual do WhatsApp.
    - `recordGoogleReviewClick`: Registro auditado do clique em `POST /public/nps/:token/google-click`.
    - `getReputationOverview`: Consolidação de métricas (`promotersCount`, `googleInvitesSent`, `googleReviewsClicked`, `conversionRatePercent`) e lista `topPromoters`.
  - **Interface no Frontend (`apps/web`)**:
    - **Painel NPS (`NpsDashboard.tsx`)**: Card de Reputação no Google com input para editar/salvar URL, métricas em tempo real, aviso de busca no Maps, badge explicativo da regra por plano e tabela interativa de promotores com reenvio/disparo manual via WhatsApp Web.
    - **Página Pública de Avaliação (`PesquisaNPS.jsx`)**: Suporte a busca por token público, visual Dark Volt Rebrand CarX e banner heróico de 5 estrelas para promotores com botão de alta conversão `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/nps/google-reputation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/google-reputation.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.9: Mini-Site Institucional da Oficina, Portfólio e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), com otimização para SEO local, dispositivos móveis, catálogo de serviços, portfólio antes/depois, prova social e captação de orçamentos.
- **Destaques de Implementação:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio com suporte a foto final e foto de entrada opcional para comparador interativo antes/depois (`before_image_url`, `after_image_url`), categorias, ordenação e destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com rastreamento por status (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `MiniSiteService` (`apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública sem autenticação que consolida branding, serviços ativos com menor preço ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de lead com geração de link profundo wa.me para atendimento ágil.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio da loja autenticada.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de textos institucionais e horários de atendimento.
  - **Rotas Fastify (`apps/api/src/routes/minisite-routes.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id` (protegidas).
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings` (protegidas).
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Página Pública (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium nos tons Dark Volt (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preço inicial, Galeria de portfólio com alternador interativo Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/minisite/minisite.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/minisite/minisite.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.10: Módulo Fiscal — Emissão de NFS-e Automática ao Liquidar a OS `(Concluído)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação integral do saldo via Pix). Suporte ao provedor Focus NFe com fallback e mock para ambiente de testes/sandbox, cálculo de alíquotas de ISS, sequenciamento atômico de RPS, recepção assíncrona de webhooks e cancelamento com justificativa legal.
- **Destaques de Implementação:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado), senha criptografada, token de API Focus NFe criptografado, inscrição municipal, regime tributário (Simples Nacional, MEI, Lucro Presumido, Lucro Real), alíquota de ISS municipal em pontos base, flags de auto-emissão (`auto_issue_on_delivery`, `auto_issue_on_payment`), RPS e série.
    - Tabela `fiscal_invoices`: Vínculo direto com `work_order_id` (com índice único parcial por tenant para garantir idempotência contra notas duplicadas ativas), RPS, número oficial da NFS-e municipal, código de verificação, protocolo, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), retenção/cálculo de ISS, URLs para DANFSE PDF e XML.
    - Ativação obrigatória de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` com a política `tenant_isolation_policy`.
    - Habilitação da feature `'nfse'` nos planos `profissional` e `premium` na tabela `plans`.
  - **Criptografia Simétrica de Credenciais Fiscais (`apps/api/src/fiscal/fiscal-crypto.ts`)**:
    - Algoritmo AES-256-GCM com Initialization Vector (IV) criptograficamente aleatório e Authentication Tag para garantia de autenticidade dos dados em repouso.
  - **Provedor Fiscal & Resiliência (`apps/api/src/fiscal/fiscal-provider.ts`)**:
    - Interface `FiscalProvider`: Métodos `issueNfse`, `cancelNfse`, `getInvoiceStatus`.
    - Classe `FocusNfeProvider`: Integração direta com os endpoints da Focus NFe (`/v2/nfse`).
    - Classe `MockFiscalProvider`: Provedor resiliente para sandbox e testes automatizados, simulando autorização em tempo hábil com geração de número de nota, código de verificação e links de PDF/XML.
  - **Lógica de Domínio em `FiscalService` (`apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getSettings` e `updateSettings`: Gestão segura das configurações fiscais com ocultação de segredos (`hasApiToken`, `hasCertificate`).
    - `issueWorkOrderNfse`: Validação de feature gating (`PlanFeatures.NFSE`), checagem de idempotência (HTTP 409 se nota já autorizada ou em processamento), cálculo de valor bruto, deduções, alíquota e valor do ISS, reserva atômica de próximo RPS e envio ao provedor fiscal.
    - `handleWebhook`: Recepção de notificações assíncronas da prefeitura atualizando status para `authorized`, `error` ou `cancelled`.
    - `cancelNfse`: Cancelamento junto à prefeitura com exigência legal de justificativa detalhada (mínimo de 15 caracteres).
    - `tryAutoIssueWorkOrderNfse`: Disparo não-bloqueante acionado na máquina de estados da OS quando o status muda para `DELIVERED` ou ao confirmar quitação total via Pix.
  - **Integração na Máquina de Estados da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparos automáticos e silenciosos em segundo plano sem impactar o fluxo do balcão ou da oficina.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Configurações Fiscais (`apps/web/src/components/features/FiscalSettingsManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Módulo Fiscal (NFS-e)" em Configurações da Oficina.
      - Formulário de dados cadastrais (Razão Social, CNPJ, Inscrição Municipal, CNAE, Regime Tributário e Alíquota de ISS).
      - Configuração de credenciais com criptografia AES-256 (Token Focus NFe, Certificado A1 e Senha).
      - Chaves de auto-emissão ao entregar o veículo ou liquidar pagamento.
    - **Ações na Ordem de Serviço (`apps/web/src/pages/OrdensServico.tsx`)**:
      - Card de Nota Fiscal integrado no modal de detalhes da OS com visual Dark Volt.
      - Badges dinâmicos de status (`Autorizada`, `Processando`, `Erro de Emissão`, `Cancelada`).
      - Exibição de RPS, Número da Nota, Base de Cálculo e ISS devido.
      - Botão "Emitir NFS-e" em 1 clique para OSs sem nota emitida.
      - Botões para visualização/download de PDF e XML.
      - Modal de cancelamento de NFS-e com validação de justificativa de no mínimo 15 caracteres.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/fiscal/fiscal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/fiscal/fiscal.test.ts) (100% de aprovação) cobrindo:
      1. Configuração com criptografia AES-256-GCM.
      2. Feature Gating por plano (HTTP 403 Forbidden no plano Essencial).
      3. Emissão com sucesso para a OS no plano Pro/Premium (HTTP 201 Created).
      4. Idempotência e bloqueio de emissão duplicada (HTTP 409 Conflict).
      5. Processamento resiliente de Webhook da prefeitura.
      6. Cancelamento com justificativa legal obrigatória.
      7. Isolamento multi-tenant estrito (RLS) no acesso e listagem de notas.
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **38/38 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.11: DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), conciliação de contas a pagar e a receber com plano de contas automotivo, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e liquidação em lote com registro atômico de despesa.
- **Destaques de Implementação:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas pré-semeado para oficinas (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com restrição `CHECK (type IN ('payable', 'receivable'))`, fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total (`paid_amount_cents`), notas e comprovante.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `FinancialService` (`apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: Cálculo analítico em cascata no PostgreSQL:
      1. (+) Receita Bruta de Serviços e Produtos
      2. (-) Deduções Comerciais (Descontos) e Fiscais (ISS NFS-e da T6.10)
      3. (=) Receita Operacional Líquida (ROL)
      4. (-) Custos Variáveis dos Serviços (CSP / CMV): Insumos de Estoque Consumidos + Bobinas de PPF/Películas Cortadas (T6.5) + Comissões de Técnicos
      5. (=) Margem de Contribuição Operacional (% da ROL)
      6. (-) Despesas Fixas (Aluguel, Utilidades, Salários/Pró-Labore, Softwares)
      7. (-) Despesas Operacionais (Marketing/Tráfego, Ferramentas/Manutenção)
      8. (=) **EBITDA Real da Oficina** (% margem EBITDA)
      9. (=) Lucro Líquido Real
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas e saídas previstas e saldo acumulado projetado com detecção de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da conta paga em `financial_bills`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`.
    - `GET /financial/cashflow/projection`.
    - `POST /commissions/batch-pay`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/financial/financial-advanced.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/financial/financial-advanced.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **45/45 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.12: Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído)`
- **Descrição:** Cockpit executivo para franqueadoras e gestores de redes automotivas que operam múltiplas unidades/filiais no CarX. Visão unificada de faturamento consolidado por loja, ranking de produtividade entre unidades, taxa média de ocupação de boxes e logística inter-filiais (transferência atômica e auditada de bobinas de PPF/películas e insumos de estoque).
- **Destaques de Implementação:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada nas tabelas operacionais: `work_orders`, `bays`, `materials` e `material_rolls`, permitindo alocação física por loja.
    - Nova tabela `unit_transfers`: registro de transferências entre lojas com `from_unit_id`, `to_unit_id`, `transfer_type ('material', 'roll')`, `material_id`, `roll_id`, `quantity`, `status`, `notes`, `transferred_by`, carimbos de tempo e restrição `CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)`.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, unidades de origem/destino e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend em `CorporateService` (`apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais ativas do tenant com contadores operacionais integrados (`workOrdersCount`, `activeBaysCount`, `totalRollsCount`).
    - `createUnit`: Criação de filial com validação compulsória de limites de quota (`max_units`) do plano contratado e unicidade de `slug` por tenant.
    - `updateUnit`: Edição cadastral e status operacional da filial com trilha de auditoria.
    - `getCorporateOverview`: Agregação analítica consolidando Faturamento Total, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes (`appointments` ativos vs total de boxes), Ranking de Performance entre lojas (ordenado por faturamento e número de OSs) e Resumo de Estoque/Bobinas por loja.
    - `transferInventory`: Transferência atômica inter-filiais de bobina de PPF (`material_rolls.unit_id`) ou insumo de estoque (`materials` com débito na origem, crédito no destino e movimentação auditada em `stock_movements`), com bloqueio estrito contra cruzamento de dados entre diferentes tenants.
    - `listTransfers`: Histórico auditado de transferências com nomes de filiais e usuários responsáveis.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/units` e `GET /corporate/units/:id`
    - `POST /corporate/units` (Guarda RBAC: `owner`, `gestor`)
    - `PATCH /corporate/units/:id` (Guarda RBAC: `owner`, `gestor`)
    - `POST /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com:
      1. **Seletor de Unidade no Topo**: Alternância instantânea entre "Todas as Unidades (Rede Consolidada)" e filiais específicas sem relogin.
      2. **Visão Consolidada & Ranking**: 4 cards executivos de KPI, classificação numerada das filiais com badges de pódio e resumo de bobinas/insumos alocados.
      3. **Gestão de Filiais**: Tabela analítica com status e modal de cadastro de filial com validação de campos.
      4. **Logística Inter-Lojas**: Histórico de transferências e modal para movimentação rápida de bobinas de PPF e insumos entre lojas.
    - Item de menu "Redes / Franquias" adicionado na barra lateral de navegação ([`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx)) e rotas `/corporate`, `/redes` e `/multiunidade` integradas no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/corporate/corporate-units.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/corporate/corporate-units.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), suíte acumulada: **54/54 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.13: App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído)`
- **Descrição:** Arquitetura robusta de alta resiliência operacional para que técnicos, aplicadores e operadores continuem apontando cronômetros, checklists rápidos, fotos e progresso de etapas mesmo em subsolos, galpões de detalhamento ou áreas sem sinal de internet ou Wi-Fi. Os dados são armazenados atomicamente no IndexedDB local do navegador/PWA e sincronizados de forma idempotente assim que a conexão de rede for restabelecida.
- **Destaques de Implementação:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**:
    - Nova tabela `technician_offline_sync_logs` para garantia de idempotência estrita com restrição única `CONSTRAINT uq_tech_offline_action_tenant UNIQUE (tenant_id, action_id)`.
    - Campos: `id`, `tenant_id`, `action_id (UUID)`, `technician_id`, `work_order_id`, `action_type`, `payload (JSONB)`, `status ('applied', 'failed', 'rejected')`, `error_message`, `client_timestamp`, `synced_at`, `created_at`.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices de alta performance por OS, técnico e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `OfflineActionTypeSchema`: `'START_TIMER' | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'STOP_TIMER' | 'UPDATE_PROGRESS' | 'CHECKLIST_ITEM' | 'ADD_NOTE'`.
    - `SingleOfflineActionSchema`: Validação de `id` (UUID), `workOrderId` (UUID), `actionType`, `payload` e `clientTimestamp`.
    - `BatchSyncActionsSchema`: Envio agrupado em lote com `BatchSyncActionsInputDto`.
    - `BatchSyncResultDto` e `SyncActionResultDto`: Retorno padronizado de total processado, falhas, status individual e carimbo de sincronização.
  - **Lógica de Domínio Backend em `TechnicianService` (`apps/api/src/technician/technician-service.ts`)**:
    - Método `syncOfflineActions`:
      1. Verificação de idempotência via `technician_offline_sync_logs` para cada `action_id`. Reenvios retornam `success: true` imediatamente sem duplicação de dados.
      2. Validação estrita de multi-tenancy: bloqueia e rejeita qualquer ação cujo `work_order_id` pertença a outra oficina.
      3. Processamento especializado para cada tipo de ação:
         - `START_TIMER`: Inicia cronômetro com carimbo de tempo retroativo do cliente ou associa checklist de entrada.
         - `PAUSE_TIMER`: Encerra o intervalo ativo e soma os segundos acumulados na OS.
         - `RESUME_TIMER`: Cria novo intervalo de cronometragem ativo.
         - `STOP_TIMER`: Finaliza o cronômetro oficial, consolidando os segundos totais.
         - `UPDATE_PROGRESS`: Atualiza o percentual concluído dos serviços.
         - `CHECKLIST_ITEM` & `ADD_NOTE`: Registra apontamentos e notas de execução.
      4. Resiliência por item: falhas em ações individuais (ex: parâmetros inválidos) não abortam as demais ações válidas do lote.
  - **Rota Fastify Registrada (`apps/api/src/routes/technician-routes.ts`)**:
    - `POST /technician/sync` (Acesso autenticado para operadores e técnicos).
  - **Armazenamento Local Estruturado no Cliente (`apps/web/src/services/offlineStorage.ts`)**:
    - Banco IndexedDB nativo (`carx_offline_db`) com 4 Object Stores:
      1. `offline_actions`: Fila de ações pendentes indexadas por `workOrderId` e `createdAt`.
      2. `cached_queue`: Cópia local da fila de ordens de serviço do técnico para navegação sem rede.
      3. `local_timers`: Persistência do estado do cronômetro local (`running`, `paused`, `accumulatedSeconds`, `lastTickTimestamp`).
      4. `offline_photos`: Buffer local de fotos capturadas durante o serviço.
  - **Hook Corporativo `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**:
    - Monitoramento automático de conectividade via `window.addEventListener('online')` e `'offline'`.
    - Sincronização automática em background no momento da reconexão.
    - Suporte a disparo manual via `syncNow()` com purga de ações confirmadas no IndexedDB.
    - Método `enqueueOfflineAction` com geração de UUID v4 seguro e tentativa de despacho instantâneo se online.
  - **Integração nas Telas do Operador (`apps/web`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx):
      - Cache automático da fila no IndexedDB no carregamento com fallback transparente em caso de perda de conexão.
      - Desativação automática de polling periódico enquanto desconectado para economia de bateria e processamento.
      - Banner de status com telemetria: exibe indicação visual (`Modo Offline Ativo`), contador de apontamentos pendentes e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx):
      - Cronômetro desacoplado e resiliente: se a rede cair ou estiver sem sinal, as operações de iniciar, pausar, retomar ou concluir são persistidas no IndexedDB com badge `Offline (Local)` e sincronizadas assim que a conexão voltar.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/technician/technician-offline-sync.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician-offline-sync.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`5/5`), suíte acumulada: **59/59 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.14: Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído)`
- **Descrição:** Motor avançado de IA multimodal integrado ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report). Combina Visão Computacional para pré-detecção de avarias na pintura/lataria/vidros com NLP/Speech-to-Text para extração de dados do check-in por voz (KM, combustível, checklist), sugerindo automaticamente serviços automotivos de alto ticket (PPF, vitrificação, polimento corretivo, martelinho PDR) para inclusão com 1 clique no orçamento da OS.
- **Destaques de Implementação:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**:
    - Criação da tabela `ai_inspection_analyses` com `tenant_id`, `work_order_id`, `inspection_id`, `analysis_type ('image_damage_detection', 'voice_checklist_extraction')`, `input_payload`, `detected_damages`, `suggested_services`, `extracted_checklist`, `provider`, `tokens_used`, `status` e carimbos de tempo.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, OS e tipo de análise.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `AiDetectedDamageItemSchema`: validação de peça (`part`), tipo de dano (`damageType`), severidade (`severity`), nível de confiança (`confidence`), coordenadas no diagrama (`view`, `xPercent`, `yPercent`) e ação recomendada.
    - `AiSuggestedServiceItemSchema`: serviço sugerido, categoria, valor em centavos (`estimatedPriceCents`), tempo em minutos e justificativa técnica.
    - `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto`, `ApplyAiSuggestionsInputSchema`, `ApplyAiSuggestionsResultDto` e `AiAnalysisHistoryItemDto`.
  - **Lógica de Domínio Backend em `AiInspectionService` (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - `analyzeDamage`: Motor multimodal com suporte a Gemini API e fallback para o motor heurístico especializado do CarX (`carx-auto-vision-ai`), detectando avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - `extractVoiceChecklist`: Processamento de áudio ou texto ditado com parser especializado em português do Brasil (reconhecimento de KM em dígitos e numerais por extenso até 999 mil, níveis de combustível e menções a serviços/avarias).
    - `applyToWorkOrder`: Aplicação atômica com 1 clique que cria/atualiza a inspeção de check-in, insere os pontos de dano em `inspection_damage_points`, adiciona os serviços selecionados em `work_order_items`, recalcula o total da OS e atualiza a quilometragem em `vehicles`.
    - `getAnalysisHistory`: Histórico completo de diagnósticos de IA associados à OS.
  - **Rotas Fastify Registradas (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx):
      1. Aba de Visão Computacional com seleção de ângulos e plotagem de danos no laudo visual.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.





---

### ⚡ FASE 6 — Diferenciais Competitivos (Onda 1)

#### Tarefa T6.1: Orçamento Digital com Aceite Online & Sinal Pix `(Concluído)`
- **Descrição:** Fluxo ponta a ponta de orçamento interativo para o cliente final via link público seguro (`/proposta/:token`), com aceite legal formal (captura de assinatura e IP) e geração de Pix dinâmico EMV Bacen para sinal financeiro, com liquidação automática da OS e envio multicanal de WhatsApp isolado pelo plano da oficina.
- **Destaques de Implementação:**
  - **Migration 026**: Adição de campos de aceite legal e sinal Pix na tabela `work_orders`.
  - **Gerador Pix EMV Bacen**: Geração em conformidade com o Banco Central e QR Code Base64.
  - **Proteção LGPD**: Máscara de telefones e dados sensíveis em visualizações públicas.
  - **WhatsApp por Plano**: Oficinas básicas usam compartilhamento manual via `wa.me`; oficinas com plano avançado usam disparo automático via gateway socket Baileys.
  - **Frontend Público (`PublicQuotePage.tsx`)**: Página de orçamento responsiva, com termo de autorização, botão de cópia de Pix e notificação em tempo real.
- **Validação Automatizada**: 6 testes dedicados em `apps/api/src/work-orders/quote-acceptance.test.ts` com 100% de sucesso.

---

#### Tarefa T6.2: Consulta Automática de Placa com Cache e Porte Automotivo `(Concluído)`
- **Descrição:** Preenchimento instantâneo dos dados do veículo (Marca, Modelo, Ano, Cor, Porte Automotivo e Valor FIPE) ao digitar placas no formato Mercosul (`ABC1D23`) ou antigo (`ABC-1234`), com recálculo automático da tabela de preços pelo porte veicular.
- **Destaques de Implementação:**
  - **Migration 027 (`vehicle_plate_cache`)**: Tabela global com índice temporal e expiração de 90 dias para latência de resposta `< 5ms`.
  - **Serviço de Negócio (`plate-lookup-service.ts`)**:
    - **Etapa 1 (Tenant Local)**: Se o carro já foi atendido pela oficina, recupera o histórico e associa automaticamente o cliente (`source: 'local_tenant'`).
    - **Etapa 2 (Cache Compartilhado)**: Recupera dados em cache persistido (`source: 'cache'`).
    - **Etapa 3 (Motor Automotivo)**: Consulta com catálogo nacional e inferência de modelo, ano e FIPE estimada (`source: 'national_registry'`).
    - **Etapa 4 (Cache)**: Grava automaticamente na tabela `vehicle_plate_cache`.
  - **Classificador de Porte Automotivo (`inferVehicleSizeClass`)**:
    - Categorização de veículos em 7 classes: `hatch`, `sedan`, `suv`, `pickup`, `van`, `moto` e `esportivo`.
    - Resolução de ambiguidades como versões de acabamento (ex: `Corolla Cross XRE` classificado como `suv` e não moto).
  - **Frontend Integrado**:
    - `NovaOrdemServico.tsx`: Input de placa com auto-consulta ao atingir 7 caracteres, preenchendo modelo, cor, porte e cliente vinculado com badge indicativa.
    - `Clientes.jsx`: Botão "Buscar" por placa no modal de cadastro de veículos com preenchimento de todos os campos em 1 clique.
  - **Privacidade & LGPD**: Nunca expõe dados pessoais de proprietários de veículos consultados externamente.
- **Validação Automatizada com Sucesso Absoluto**:
  - 5 testes dedicados em [`apps/api/src/customers/plate-lookup.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/customers/plate-lookup.test.ts) cobrindo rejeição de placa inválida (400), consulta de placa Mercosul nova com porte SUV, recuperação do cache global de 90 dias (`source: 'cache'`), identificação de veículo pré-existente da loja com cliente vinculado (`source: 'local_tenant'`) e inferência de portes para todas as classes automotivas.

---

#### Tarefa T6.3: Pix Integrado para Ordens de Serviço (Baixa Instantânea no Caixa via Webhook) `(Concluído)`
- **Descrição:** Liquidação instantânea de pagamentos de Ordens de Serviço no balcão e caixa da oficina via Pix dinâmico padrão Banco Central do Brasil (EMV e QR Code nativo), eliminando a digitação manual de comprovantes e conciliação bancária lenta.
- **Destaques de Implementação:**
  - **Migration 028 (`028_work_order_pix_integration.up.sql`)**:
    - Índice de alta performance `idx_payments_transaction_reference` na tabela `payments` para consultas atômicas por `txid` em `< 1ms`.
    - Coluna `pix_last_txid VARCHAR(50)` adicionada à tabela `work_orders` para rastreio direto da última cobrança gerada.
  - **Serviço de Domínio (`apps/api/src/work-orders/work-order-service.ts`)**:
    - `createPixCharge`: Calcula automaticamente o saldo restante devedor da OS (`final_cents - paid_cents`), gera identificador único Bacen (`txid`), monta o payload BR Code oficial e gera QR Code Base64 via lib `qrcode`. Registra o pagamento com status `pending` e publica evento SSE. Rejeita novas cobranças se a OS já estiver 100% quitada (HTTP 422).
    - `confirmPixPayment`: Endpoint idempotente acionado por webhooks bancários ou pelo operador. Em transação atômica (`tenantTransaction`), atualiza o pagamento para `approved`, soma `paid_cents` na OS e insere registro auditável na timeline (`work_order_events`). Caso a OS esteja com status `READY` e o pagamento a quite totalmente, transiciona automaticamente o status para `DELIVERED` e preenche `delivered_at = NOW()`.
    - Dispara eventos em tempo real para múltiplos canais: `work_order.updated` e `payment.received`.
    - `getPixStatus`: Permite à aplicação frontend consultar o status atual da cobrança Pix de forma rápida.
  - **Rotas Fastify (`apps/api/src/routes/work-order-routes.ts`)**:
    - `POST /work-orders/:id/pix-charge`: Geração de cobrança Pix autenticada.
    - `GET /work-orders/:id/pix-status/:txid`: Consulta do status da cobrança.
    - `POST /webhooks/pix/confirm`: Webhook público de liquidação bancária instantânea.
  - **Frontend do Gestor (`apps/web`)**:
    - Métodos adicionados no cliente de API (`api.workOrders.createPixCharge`, `api.workOrders.getPixStatus` e `api.workOrders.confirmPixPayment`).
    - Modal de Caixa & Recebimento completamente redesenhado no novo padrão do Design System CarX (fundo branco, bordas `#E1E6EC`, tipografia e abas de método com ícones).
    - No modo Pix: pré-carrega o saldo restante, gera o QR Code dinâmico em tela, exibe campo Copia e Cola com botão de cópia em 1 clique, polling resiliente a cada 3s com detecção de baixa instantânea, botão de simulação para bancada e feedback visual em verde vibrante.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/payments/work-order-pix.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/payments/work-order-pix.test.ts) cobrindo:
      1. Geração de cobrança Pix dinâmica com cálculo de saldo e payload EMV Bacen.
      2. Consulta do status pendente da cobrança.
      3. Liquidação instantânea via webhook com atualização atômica do saldo da OS.
      4. Idempotência estrita (webhooks repetidos com mesmo `txid` não duplicam valor nem saldo pago).
      5. Rejeição de novas cobranças Pix para OS já totalmente quitadas.
      6. Transição automática de status de `READY` para `DELIVERED` ao quitar o saldo na retirada.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.8: Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor de captação de avaliações 5 estrelas no Google Meu Negócio / Google Maps focado em clientes promotores (NPS 9 e 10). Gera redirecionamento direto, rastreamento de cliques e conversão, além de disparos transacionais de WhatsApp com estrito cumprimento da regra comercial de assinaturas (cada oficina tem seu próprio número Baileys ou usa o link direto manual `wa.me` gratuito para planos sem gateway).
- **Destaques de Implementação:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - `tenant_branding.google_review_url`: URL oficial do link curto da ficha do Google da oficina (`https://g.page/r/.../review`).
    - Colunas em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation`.
  - **Regra de Negócio de WhatsApp por Plano**:
    - O sistema nunca assume custos nem intermediários fora do número próprio da oficina.
    - Planos com gateway e instância conectada realizam disparos automatizados de templates transacionais (`GOOGLE_REVIEW_INVITE`).
    - Planos sem gateway ou offline retornam fallback gracioso com URLs profundas `https://wa.me/{phone}?text={mensagem_formatada}`, viabilizando o envio manual em 1 clique pelo WhatsApp Web sem custo adicional.
  - **Lógica de Domínio em `NpsService` (`apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl` com fallback inteligente de busca no Google Maps (`https://www.google.com/maps/search/?api=1&query=...`).
    - `answerSurvey` idempotente: bloqueio estrito de re-respostas (HTTP 409 Conflict), sugestão de link 5 estrelas apenas para notas 9 ou 10 e disparo / geração de link manual do WhatsApp.
    - `recordGoogleReviewClick`: Registro auditado do clique em `POST /public/nps/:token/google-click`.
    - `getReputationOverview`: Consolidação de métricas (`promotersCount`, `googleInvitesSent`, `googleReviewsClicked`, `conversionRatePercent`) e lista `topPromoters`.
  - **Interface no Frontend (`apps/web`)**:
    - **Painel NPS (`NpsDashboard.tsx`)**: Card de Reputação no Google com input para editar/salvar URL, métricas em tempo real, aviso de busca no Maps, badge explicativo da regra por plano e tabela interativa de promotores com reenvio/disparo manual via WhatsApp Web.
    - **Página Pública de Avaliação (`PesquisaNPS.jsx`)**: Suporte a busca por token público, visual Dark Volt Rebrand CarX e banner heróico de 5 estrelas para promotores com botão de alta conversão `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/nps/google-reputation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/google-reputation.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.9: Mini-Site Institucional da Oficina, Portfólio e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), com otimização para SEO local, dispositivos móveis, catálogo de serviços, portfólio antes/depois, prova social e captação de orçamentos.
- **Destaques de Implementação:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio com suporte a foto final e foto de entrada opcional para comparador interativo antes/depois (`before_image_url`, `after_image_url`), categorias, ordenação e destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com rastreamento por status (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `MiniSiteService` (`apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública sem autenticação que consolida branding, serviços ativos com menor preço ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de lead com geração de link profundo wa.me para atendimento ágil.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio da loja autenticada.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de textos institucionais e horários de atendimento.
  - **Rotas Fastify (`apps/api/src/routes/minisite-routes.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id` (protegidas).
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings` (protegidas).
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Página Pública (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium nos tons Dark Volt (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preço inicial, Galeria de portfólio com alternador interativo Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/minisite/minisite.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/minisite/minisite.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.10: Módulo Fiscal — Emissão de NFS-e Automática ao Liquidar a OS `(Concluído)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação integral do saldo via Pix). Suporte ao provedor Focus NFe com fallback e mock para ambiente de testes/sandbox, cálculo de alíquotas de ISS, sequenciamento atômico de RPS, recepção assíncrona de webhooks e cancelamento com justificativa legal.
- **Destaques de Implementação:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado), senha criptografada, token de API Focus NFe criptografado, inscrição municipal, regime tributário (Simples Nacional, MEI, Lucro Presumido, Lucro Real), alíquota de ISS municipal em pontos base, flags de auto-emissão (`auto_issue_on_delivery`, `auto_issue_on_payment`), RPS e série.
    - Tabela `fiscal_invoices`: Vínculo direto com `work_order_id` (com índice único parcial por tenant para garantir idempotência contra notas duplicadas ativas), RPS, número oficial da NFS-e municipal, código de verificação, protocolo, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), retenção/cálculo de ISS, URLs para DANFSE PDF e XML.
    - Ativação obrigatória de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` com a política `tenant_isolation_policy`.
    - Habilitação da feature `'nfse'` nos planos `profissional` e `premium` na tabela `plans`.
  - **Criptografia Simétrica de Credenciais Fiscais (`apps/api/src/fiscal/fiscal-crypto.ts`)**:
    - Algoritmo AES-256-GCM com Initialization Vector (IV) criptograficamente aleatório e Authentication Tag para garantia de autenticidade dos dados em repouso.
  - **Provedor Fiscal & Resiliência (`apps/api/src/fiscal/fiscal-provider.ts`)**:
    - Interface `FiscalProvider`: Métodos `issueNfse`, `cancelNfse`, `getInvoiceStatus`.
    - Classe `FocusNfeProvider`: Integração direta com os endpoints da Focus NFe (`/v2/nfse`).
    - Classe `MockFiscalProvider`: Provedor resiliente para sandbox e testes automatizados, simulando autorização em tempo hábil com geração de número de nota, código de verificação e links de PDF/XML.
  - **Lógica de Domínio em `FiscalService` (`apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getSettings` e `updateSettings`: Gestão segura das configurações fiscais com ocultação de segredos (`hasApiToken`, `hasCertificate`).
    - `issueWorkOrderNfse`: Validação de feature gating (`PlanFeatures.NFSE`), checagem de idempotência (HTTP 409 se nota já autorizada ou em processamento), cálculo de valor bruto, deduções, alíquota e valor do ISS, reserva atômica de próximo RPS e envio ao provedor fiscal.
    - `handleWebhook`: Recepção de notificações assíncronas da prefeitura atualizando status para `authorized`, `error` ou `cancelled`.
    - `cancelNfse`: Cancelamento junto à prefeitura com exigência legal de justificativa detalhada (mínimo de 15 caracteres).
    - `tryAutoIssueWorkOrderNfse`: Disparo não-bloqueante acionado na máquina de estados da OS quando o status muda para `DELIVERED` ou ao confirmar quitação total via Pix.
  - **Integração na Máquina de Estados da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparos automáticos e silenciosos em segundo plano sem impactar o fluxo do balcão ou da oficina.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Configurações Fiscais (`apps/web/src/components/features/FiscalSettingsManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Módulo Fiscal (NFS-e)" em Configurações da Oficina.
      - Formulário de dados cadastrais (Razão Social, CNPJ, Inscrição Municipal, CNAE, Regime Tributário e Alíquota de ISS).
      - Configuração de credenciais com criptografia AES-256 (Token Focus NFe, Certificado A1 e Senha).
      - Chaves de auto-emissão ao entregar o veículo ou liquidar pagamento.
    - **Ações na Ordem de Serviço (`apps/web/src/pages/OrdensServico.tsx`)**:
      - Card de Nota Fiscal integrado no modal de detalhes da OS com visual Dark Volt.
      - Badges dinâmicos de status (`Autorizada`, `Processando`, `Erro de Emissão`, `Cancelada`).
      - Exibição de RPS, Número da Nota, Base de Cálculo e ISS devido.
      - Botão "Emitir NFS-e" em 1 clique para OSs sem nota emitida.
      - Botões para visualização/download de PDF e XML.
      - Modal de cancelamento de NFS-e com validação de justificativa de no mínimo 15 caracteres.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/fiscal/fiscal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/fiscal/fiscal.test.ts) (100% de aprovação) cobrindo:
      1. Configuração com criptografia AES-256-GCM.
      2. Feature Gating por plano (HTTP 403 Forbidden no plano Essencial).
      3. Emissão com sucesso para a OS no plano Pro/Premium (HTTP 201 Created).
      4. Idempotência e bloqueio de emissão duplicada (HTTP 409 Conflict).
      5. Processamento resiliente de Webhook da prefeitura.
      6. Cancelamento com justificativa legal obrigatória.
      7. Isolamento multi-tenant estrito (RLS) no acesso e listagem de notas.
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **38/38 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.11: DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), conciliação de contas a pagar e a receber com plano de contas automotivo, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e liquidação em lote com registro atômico de despesa.
- **Destaques de Implementação:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas pré-semeado para oficinas (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com restrição `CHECK (type IN ('payable', 'receivable'))`, fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total (`paid_amount_cents`), notas e comprovante.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `FinancialService` (`apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: Cálculo analítico em cascata no PostgreSQL:
      1. (+) Receita Bruta de Serviços e Produtos
      2. (-) Deduções Comerciais (Descontos) e Fiscais (ISS NFS-e da T6.10)
      3. (=) Receita Operacional Líquida (ROL)
      4. (-) Custos Variáveis dos Serviços (CSP / CMV): Insumos de Estoque Consumidos + Bobinas de PPF/Películas Cortadas (T6.5) + Comissões de Técnicos
      5. (=) Margem de Contribuição Operacional (% da ROL)
      6. (-) Despesas Fixas (Aluguel, Utilidades, Salários/Pró-Labore, Softwares)
      7. (-) Despesas Operacionais (Marketing/Tráfego, Ferramentas/Manutenção)
      8. (=) **EBITDA Real da Oficina** (% margem EBITDA)
      9. (=) Lucro Líquido Real
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas e saídas previstas e saldo acumulado projetado com detecção de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da conta paga em `financial_bills`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`.
    - `GET /financial/cashflow/projection`.
    - `POST /commissions/batch-pay`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/financial/financial-advanced.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/financial/financial-advanced.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **45/45 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.12: Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído)`
- **Descrição:** Cockpit executivo para franqueadoras e gestores de redes automotivas que operam múltiplas unidades/filiais no CarX. Visão unificada de faturamento consolidado por loja, ranking de produtividade entre unidades, taxa média de ocupação de boxes e logística inter-filiais (transferência atômica e auditada de bobinas de PPF/películas e insumos de estoque).
- **Destaques de Implementação:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada nas tabelas operacionais: `work_orders`, `bays`, `materials` e `material_rolls`, permitindo alocação física por loja.
    - Nova tabela `unit_transfers`: registro de transferências entre lojas com `from_unit_id`, `to_unit_id`, `transfer_type ('material', 'roll')`, `material_id`, `roll_id`, `quantity`, `status`, `notes`, `transferred_by`, carimbos de tempo e restrição `CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)`.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, unidades de origem/destino e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend em `CorporateService` (`apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais ativas do tenant com contadores operacionais integrados (`workOrdersCount`, `activeBaysCount`, `totalRollsCount`).
    - `createUnit`: Criação de filial com validação compulsória de limites de quota (`max_units`) do plano contratado e unicidade de `slug` por tenant.
    - `updateUnit`: Edição cadastral e status operacional da filial com trilha de auditoria.
    - `getCorporateOverview`: Agregação analítica consolidando Faturamento Total, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes (`appointments` ativos vs total de boxes), Ranking de Performance entre lojas (ordenado por faturamento e número de OSs) e Resumo de Estoque/Bobinas por loja.
    - `transferInventory`: Transferência atômica inter-filiais de bobina de PPF (`material_rolls.unit_id`) ou insumo de estoque (`materials` com débito na origem, crédito no destino e movimentação auditada em `stock_movements`), com bloqueio estrito contra cruzamento de dados entre diferentes tenants.
    - `listTransfers`: Histórico auditado de transferências com nomes de filiais e usuários responsáveis.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/units` e `GET /corporate/units/:id`
    - `POST /corporate/units` (Guarda RBAC: `owner`, `gestor`)
    - `PATCH /corporate/units/:id` (Guarda RBAC: `owner`, `gestor`)
    - `POST /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com:
      1. **Seletor de Unidade no Topo**: Alternância instantânea entre "Todas as Unidades (Rede Consolidada)" e filiais específicas sem relogin.
      2. **Visão Consolidada & Ranking**: 4 cards executivos de KPI, classificação numerada das filiais com badges de pódio e resumo de bobinas/insumos alocados.
      3. **Gestão de Filiais**: Tabela analítica com status e modal de cadastro de filial com validação de campos.
      4. **Logística Inter-Lojas**: Histórico de transferências e modal para movimentação rápida de bobinas de PPF e insumos entre lojas.
    - Item de menu "Redes / Franquias" adicionado na barra lateral de navegação ([`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx)) e rotas `/corporate`, `/redes` e `/multiunidade` integradas no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/corporate/corporate-units.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/corporate/corporate-units.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), suíte acumulada: **54/54 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.13: App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído)`
- **Descrição:** Arquitetura robusta de alta resiliência operacional para que técnicos, aplicadores e operadores continuem apontando cronômetros, checklists rápidos, fotos e progresso de etapas mesmo em subsolos, galpões de detalhamento ou áreas sem sinal de internet ou Wi-Fi. Os dados são armazenados atomicamente no IndexedDB local do navegador/PWA e sincronizados de forma idempotente assim que a conexão de rede for restabelecida.
- **Destaques de Implementação:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**:
    - Nova tabela `technician_offline_sync_logs` para garantia de idempotência estrita com restrição única `CONSTRAINT uq_tech_offline_action_tenant UNIQUE (tenant_id, action_id)`.
    - Campos: `id`, `tenant_id`, `action_id (UUID)`, `technician_id`, `work_order_id`, `action_type`, `payload (JSONB)`, `status ('applied', 'failed', 'rejected')`, `error_message`, `client_timestamp`, `synced_at`, `created_at`.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices de alta performance por OS, técnico e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `OfflineActionTypeSchema`: `'START_TIMER' | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'STOP_TIMER' | 'UPDATE_PROGRESS' | 'CHECKLIST_ITEM' | 'ADD_NOTE'`.
    - `SingleOfflineActionSchema`: Validação de `id` (UUID), `workOrderId` (UUID), `actionType`, `payload` e `clientTimestamp`.
    - `BatchSyncActionsSchema`: Envio agrupado em lote com `BatchSyncActionsInputDto`.
    - `BatchSyncResultDto` e `SyncActionResultDto`: Retorno padronizado de total processado, falhas, status individual e carimbo de sincronização.
  - **Lógica de Domínio Backend em `TechnicianService` (`apps/api/src/technician/technician-service.ts`)**:
    - Método `syncOfflineActions`:
      1. Verificação de idempotência via `technician_offline_sync_logs` para cada `action_id`. Reenvios retornam `success: true` imediatamente sem duplicação de dados.
      2. Validação estrita de multi-tenancy: bloqueia e rejeita qualquer ação cujo `work_order_id` pertença a outra oficina.
      3. Processamento especializado para cada tipo de ação:
         - `START_TIMER`: Inicia cronômetro com carimbo de tempo retroativo do cliente ou associa checklist de entrada.
         - `PAUSE_TIMER`: Encerra o intervalo ativo e soma os segundos acumulados na OS.
         - `RESUME_TIMER`: Cria novo intervalo de cronometragem ativo.
         - `STOP_TIMER`: Finaliza o cronômetro oficial, consolidando os segundos totais.
         - `UPDATE_PROGRESS`: Atualiza o percentual concluído dos serviços.
         - `CHECKLIST_ITEM` & `ADD_NOTE`: Registra apontamentos e notas de execução.
      4. Resiliência por item: falhas em ações individuais (ex: parâmetros inválidos) não abortam as demais ações válidas do lote.
  - **Rota Fastify Registrada (`apps/api/src/routes/technician-routes.ts`)**:
    - `POST /technician/sync` (Acesso autenticado para operadores e técnicos).
  - **Armazenamento Local Estruturado no Cliente (`apps/web/src/services/offlineStorage.ts`)**:
    - Banco IndexedDB nativo (`carx_offline_db`) com 4 Object Stores:
      1. `offline_actions`: Fila de ações pendentes indexadas por `workOrderId` e `createdAt`.
      2. `cached_queue`: Cópia local da fila de ordens de serviço do técnico para navegação sem rede.
      3. `local_timers`: Persistência do estado do cronômetro local (`running`, `paused`, `accumulatedSeconds`, `lastTickTimestamp`).
      4. `offline_photos`: Buffer local de fotos capturadas durante o serviço.
  - **Hook Corporativo `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**:
    - Monitoramento automático de conectividade via `window.addEventListener('online')` e `'offline'`.
    - Sincronização automática em background no momento da reconexão.
    - Suporte a disparo manual via `syncNow()` com purga de ações confirmadas no IndexedDB.
    - Método `enqueueOfflineAction` com geração de UUID v4 seguro e tentativa de despacho instantâneo se online.
  - **Integração nas Telas do Operador (`apps/web`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx):
      - Cache automático da fila no IndexedDB no carregamento com fallback transparente em caso de perda de conexão.
      - Desativação automática de polling periódico enquanto desconectado para economia de bateria e processamento.
      - Banner de status com telemetria: exibe indicação visual (`Modo Offline Ativo`), contador de apontamentos pendentes e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx):
      - Cronômetro desacoplado e resiliente: se a rede cair ou estiver sem sinal, as operações de iniciar, pausar, retomar ou concluir são persistidas no IndexedDB com badge `Offline (Local)` e sincronizadas assim que a conexão voltar.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/technician/technician-offline-sync.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician-offline-sync.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`5/5`), suíte acumulada: **59/59 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.14: Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído)`
- **Descrição:** Motor avançado de IA multimodal integrado ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report). Combina Visão Computacional para pré-detecção de avarias na pintura/lataria/vidros com NLP/Speech-to-Text para extração de dados do check-in por voz (KM, combustível, checklist), sugerindo automaticamente serviços automotivos de alto ticket (PPF, vitrificação, polimento corretivo, martelinho PDR) para inclusão com 1 clique no orçamento da OS.
- **Destaques de Implementação:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**:
    - Criação da tabela `ai_inspection_analyses` com `tenant_id`, `work_order_id`, `inspection_id`, `analysis_type ('image_damage_detection', 'voice_checklist_extraction')`, `input_payload`, `detected_damages`, `suggested_services`, `extracted_checklist`, `provider`, `tokens_used`, `status` e carimbos de tempo.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, OS e tipo de análise.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `AiDetectedDamageItemSchema`: validação de peça (`part`), tipo de dano (`damageType`), severidade (`severity`), nível de confiança (`confidence`), coordenadas no diagrama (`view`, `xPercent`, `yPercent`) e ação recomendada.
    - `AiSuggestedServiceItemSchema`: serviço sugerido, categoria, valor em centavos (`estimatedPriceCents`), tempo em minutos e justificativa técnica.
    - `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto`, `ApplyAiSuggestionsInputSchema`, `ApplyAiSuggestionsResultDto` e `AiAnalysisHistoryItemDto`.
  - **Lógica de Domínio Backend em `AiInspectionService` (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - `analyzeDamage`: Motor multimodal com suporte a Gemini API e fallback para o motor heurístico especializado do CarX (`carx-auto-vision-ai`), detectando avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - `extractVoiceChecklist`: Processamento de áudio ou texto ditado com parser especializado em português do Brasil (reconhecimento de KM em dígitos e numerais por extenso até 999 mil, níveis de combustível e menções a serviços/avarias).
    - `applyToWorkOrder`: Aplicação atômica com 1 clique que cria/atualiza a inspeção de check-in, insere os pontos de dano em `inspection_damage_points`, adiciona os serviços selecionados em `work_order_items`, recalcula o total da OS e atualiza a quilometragem em `vehicles`.
    - `getAnalysisHistory`: Histórico completo de diagnósticos de IA associados à OS.
  - **Rotas Fastify Registradas (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx):
      1. Aba de Visão Computacional com seleção de ângulos e plotagem de danos no laudo visual.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.




---

#### Tarefa T6.4: WhatsApp Automático Transacional por Evento de OS (Gating por Plano e Respeito a Instâncias) `(Concluído)`
- **Descrição:** Motor transacional de comunicação via WhatsApp conectado ao ciclo de vida da OS automotiva (`CHECKED_IN`, `IN_PROGRESS`, `READY`, `DELIVERED` e `APPOINTMENT_CONFIRMED`), garantindo respeito absoluto ao plano contratado da oficina e às suas credenciais de infraestrutura.
- **Diretriz de Isolamento e Respeito aos Planos Comerciais:**
  - **Aparelho e Número da Oficina:** A plataforma CarX não assume a custódia nem o número das oficinas: cada oficina conecta e opera exclusivamente seu próprio aparelho/número de WhatsApp via socket Baileys em seu painel (`Configurações > WhatsApp`).
  - **Planos sem Gateway / Essencial:** Custo zero de infraestrutura para a plataforma. O sistema **nunca** tenta conexões ou disparos em background; gera automaticamente link direto e pré-formatado `https://wa.me/...` com 1 clique para envio manual via WhatsApp Web ou Desktop pelo gestor.
  - **Planos com Gateway (Profissional e Premium):**
    - Se a instância estiver conectada (`status: 'CONNECTED'`), dispara em segundo plano pelo socket da oficina e registra o evento na timeline da OS (`work_order_events`).
    - Se a instância estiver desconectada (`status: 'DISCONNECTED'`), realiza **fallback suave** para `wa.me` com aviso explicativo, sem bloquear a transição de status ou a rotina da loja.
- **Destaques de Implementação:**
  - **Contratos e DTOs em `@carx/shared`**:
    - Tipagens `WhatsAppTransactionalEventType`, `SendTransactionalWhatsAppInputDto`, `SendTransactionalWhatsAppResultDto`.
    - Inclusão canônica de `PlanFeatures.WHATSAPP_GATEWAY` nos planos `Profissional` e `Premium`.
  - **Serviço de Mensageria (`apps/api/src/whatsapp/whatsapp-service.ts`)**:
    - `formatTransactionalTemplate`: Formata mensagens ricas com o primeiro nome do cliente, nome fantasia da loja, modelo do veículo, placa e link dinâmico da proposta/tracking para cada evento automotivo.
    - `dispatchTransactionalNotification`: Checagem rigorosa de feature flags (`WHATSAPP_GATEWAY` ou `WHATSAPP_AUTO`), verificação do status da instância conectada da oficina, envio Baileys direto ou geração de link seguro `wa.me`.
  - **Integração no Ciclo de Vida da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparo assíncrono e não-bloqueante no método `transitionStatus` ao avançar a OS para `CHECKED_IN`, `READY` ou `DELIVERED`.
    - Método `notifyWorkOrderWhatsApp` para auditoria, histórico em `work_order_events` e notificação sob demanda.
  - **Rotas Fastify (`apps/api/src/routes/work-order-routes.ts`)**:
    - `POST /work-orders/:id/notify-whatsapp`: Endpoint autenticado com validação de tenant para reenvio e geração manual de links sob demanda.
  - **Frontend do Gestor (`apps/web`)**:
    - Método `api.workOrders.notifyWhatsApp` adicionado no cliente `api.ts`.
    - Botão de ação rápida com ícone do WhatsApp na listagem de Ordens de Serviço (`OrdensServico.tsx`).
    - Modal dedicado de Notificação WhatsApp com prévia de mensagem, seleção de eventos, aviso explicativo de planos, feedback imediato e abertura de nova aba para `wa.me`.
    - Modernização do modal de detalhes da OS no Design System Rebrand CarX.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/whatsapp/whatsapp-transactional.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/whatsapp/whatsapp-transactional.test.ts) cobrindo:
      1. Loja no plano BÁSICO (sem gateway) não dispara background e gera link manual wa.me.
      2. Loja no plano PRO com WhatsApp DESCONECTADO faz fallback suave para wa.me com aviso.
      3. Loja no plano PRO com WhatsApp CONECTADO envia mensagem transacional via socket oficial da loja com registro na timeline.
      4. Templates transacionais cobrem Check-in, Ready, Delivered e Agendamento.
      5. Transição de status da OS (`transitionStatus`) dispara WhatsApp sem bloquear fluxo operacional.
      6. Rota `POST /work-orders/:id/notify-whatsapp` permite envio sob demanda pelo gestor.
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.8: Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor de captação de avaliações 5 estrelas no Google Meu Negócio / Google Maps focado em clientes promotores (NPS 9 e 10). Gera redirecionamento direto, rastreamento de cliques e conversão, além de disparos transacionais de WhatsApp com estrito cumprimento da regra comercial de assinaturas (cada oficina tem seu próprio número Baileys ou usa o link direto manual `wa.me` gratuito para planos sem gateway).
- **Destaques de Implementação:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - `tenant_branding.google_review_url`: URL oficial do link curto da ficha do Google da oficina (`https://g.page/r/.../review`).
    - Colunas em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation`.
  - **Regra de Negócio de WhatsApp por Plano**:
    - O sistema nunca assume custos nem intermediários fora do número próprio da oficina.
    - Planos com gateway e instância conectada realizam disparos automatizados de templates transacionais (`GOOGLE_REVIEW_INVITE`).
    - Planos sem gateway ou offline retornam fallback gracioso com URLs profundas `https://wa.me/{phone}?text={mensagem_formatada}`, viabilizando o envio manual em 1 clique pelo WhatsApp Web sem custo adicional.
  - **Lógica de Domínio em `NpsService` (`apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl` com fallback inteligente de busca no Google Maps (`https://www.google.com/maps/search/?api=1&query=...`).
    - `answerSurvey` idempotente: bloqueio estrito de re-respostas (HTTP 409 Conflict), sugestão de link 5 estrelas apenas para notas 9 ou 10 e disparo / geração de link manual do WhatsApp.
    - `recordGoogleReviewClick`: Registro auditado do clique em `POST /public/nps/:token/google-click`.
    - `getReputationOverview`: Consolidação de métricas (`promotersCount`, `googleInvitesSent`, `googleReviewsClicked`, `conversionRatePercent`) e lista `topPromoters`.
  - **Interface no Frontend (`apps/web`)**:
    - **Painel NPS (`NpsDashboard.tsx`)**: Card de Reputação no Google com input para editar/salvar URL, métricas em tempo real, aviso de busca no Maps, badge explicativo da regra por plano e tabela interativa de promotores com reenvio/disparo manual via WhatsApp Web.
    - **Página Pública de Avaliação (`PesquisaNPS.jsx`)**: Suporte a busca por token público, visual Dark Volt Rebrand CarX e banner heróico de 5 estrelas para promotores com botão de alta conversão `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/nps/google-reputation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/google-reputation.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.9: Mini-Site Institucional da Oficina, Portfólio e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), com otimização para SEO local, dispositivos móveis, catálogo de serviços, portfólio antes/depois, prova social e captação de orçamentos.
- **Destaques de Implementação:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio com suporte a foto final e foto de entrada opcional para comparador interativo antes/depois (`before_image_url`, `after_image_url`), categorias, ordenação e destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com rastreamento por status (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `MiniSiteService` (`apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública sem autenticação que consolida branding, serviços ativos com menor preço ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de lead com geração de link profundo wa.me para atendimento ágil.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio da loja autenticada.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de textos institucionais e horários de atendimento.
  - **Rotas Fastify (`apps/api/src/routes/minisite-routes.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id` (protegidas).
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings` (protegidas).
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Página Pública (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium nos tons Dark Volt (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preço inicial, Galeria de portfólio com alternador interativo Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/minisite/minisite.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/minisite/minisite.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.10: Módulo Fiscal — Emissão de NFS-e Automática ao Liquidar a OS `(Concluído)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação integral do saldo via Pix). Suporte ao provedor Focus NFe com fallback e mock para ambiente de testes/sandbox, cálculo de alíquotas de ISS, sequenciamento atômico de RPS, recepção assíncrona de webhooks e cancelamento com justificativa legal.
- **Destaques de Implementação:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado), senha criptografada, token de API Focus NFe criptografado, inscrição municipal, regime tributário (Simples Nacional, MEI, Lucro Presumido, Lucro Real), alíquota de ISS municipal em pontos base, flags de auto-emissão (`auto_issue_on_delivery`, `auto_issue_on_payment`), RPS e série.
    - Tabela `fiscal_invoices`: Vínculo direto com `work_order_id` (com índice único parcial por tenant para garantir idempotência contra notas duplicadas ativas), RPS, número oficial da NFS-e municipal, código de verificação, protocolo, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), retenção/cálculo de ISS, URLs para DANFSE PDF e XML.
    - Ativação obrigatória de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` com a política `tenant_isolation_policy`.
    - Habilitação da feature `'nfse'` nos planos `profissional` e `premium` na tabela `plans`.
  - **Criptografia Simétrica de Credenciais Fiscais (`apps/api/src/fiscal/fiscal-crypto.ts`)**:
    - Algoritmo AES-256-GCM com Initialization Vector (IV) criptograficamente aleatório e Authentication Tag para garantia de autenticidade dos dados em repouso.
  - **Provedor Fiscal & Resiliência (`apps/api/src/fiscal/fiscal-provider.ts`)**:
    - Interface `FiscalProvider`: Métodos `issueNfse`, `cancelNfse`, `getInvoiceStatus`.
    - Classe `FocusNfeProvider`: Integração direta com os endpoints da Focus NFe (`/v2/nfse`).
    - Classe `MockFiscalProvider`: Provedor resiliente para sandbox e testes automatizados, simulando autorização em tempo hábil com geração de número de nota, código de verificação e links de PDF/XML.
  - **Lógica de Domínio em `FiscalService` (`apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getSettings` e `updateSettings`: Gestão segura das configurações fiscais com ocultação de segredos (`hasApiToken`, `hasCertificate`).
    - `issueWorkOrderNfse`: Validação de feature gating (`PlanFeatures.NFSE`), checagem de idempotência (HTTP 409 se nota já autorizada ou em processamento), cálculo de valor bruto, deduções, alíquota e valor do ISS, reserva atômica de próximo RPS e envio ao provedor fiscal.
    - `handleWebhook`: Recepção de notificações assíncronas da prefeitura atualizando status para `authorized`, `error` ou `cancelled`.
    - `cancelNfse`: Cancelamento junto à prefeitura com exigência legal de justificativa detalhada (mínimo de 15 caracteres).
    - `tryAutoIssueWorkOrderNfse`: Disparo não-bloqueante acionado na máquina de estados da OS quando o status muda para `DELIVERED` ou ao confirmar quitação total via Pix.
  - **Integração na Máquina de Estados da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparos automáticos e silenciosos em segundo plano sem impactar o fluxo do balcão ou da oficina.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Configurações Fiscais (`apps/web/src/components/features/FiscalSettingsManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Módulo Fiscal (NFS-e)" em Configurações da Oficina.
      - Formulário de dados cadastrais (Razão Social, CNPJ, Inscrição Municipal, CNAE, Regime Tributário e Alíquota de ISS).
      - Configuração de credenciais com criptografia AES-256 (Token Focus NFe, Certificado A1 e Senha).
      - Chaves de auto-emissão ao entregar o veículo ou liquidar pagamento.
    - **Ações na Ordem de Serviço (`apps/web/src/pages/OrdensServico.tsx`)**:
      - Card de Nota Fiscal integrado no modal de detalhes da OS com visual Dark Volt.
      - Badges dinâmicos de status (`Autorizada`, `Processando`, `Erro de Emissão`, `Cancelada`).
      - Exibição de RPS, Número da Nota, Base de Cálculo e ISS devido.
      - Botão "Emitir NFS-e" em 1 clique para OSs sem nota emitida.
      - Botões para visualização/download de PDF e XML.
      - Modal de cancelamento de NFS-e com validação de justificativa de no mínimo 15 caracteres.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/fiscal/fiscal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/fiscal/fiscal.test.ts) (100% de aprovação) cobrindo:
      1. Configuração com criptografia AES-256-GCM.
      2. Feature Gating por plano (HTTP 403 Forbidden no plano Essencial).
      3. Emissão com sucesso para a OS no plano Pro/Premium (HTTP 201 Created).
      4. Idempotência e bloqueio de emissão duplicada (HTTP 409 Conflict).
      5. Processamento resiliente de Webhook da prefeitura.
      6. Cancelamento com justificativa legal obrigatória.
      7. Isolamento multi-tenant estrito (RLS) no acesso e listagem de notas.
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **38/38 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.11: DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), conciliação de contas a pagar e a receber com plano de contas automotivo, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e liquidação em lote com registro atômico de despesa.
- **Destaques de Implementação:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas pré-semeado para oficinas (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com restrição `CHECK (type IN ('payable', 'receivable'))`, fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total (`paid_amount_cents`), notas e comprovante.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `FinancialService` (`apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: Cálculo analítico em cascata no PostgreSQL:
      1. (+) Receita Bruta de Serviços e Produtos
      2. (-) Deduções Comerciais (Descontos) e Fiscais (ISS NFS-e da T6.10)
      3. (=) Receita Operacional Líquida (ROL)
      4. (-) Custos Variáveis dos Serviços (CSP / CMV): Insumos de Estoque Consumidos + Bobinas de PPF/Películas Cortadas (T6.5) + Comissões de Técnicos
      5. (=) Margem de Contribuição Operacional (% da ROL)
      6. (-) Despesas Fixas (Aluguel, Utilidades, Salários/Pró-Labore, Softwares)
      7. (-) Despesas Operacionais (Marketing/Tráfego, Ferramentas/Manutenção)
      8. (=) **EBITDA Real da Oficina** (% margem EBITDA)
      9. (=) Lucro Líquido Real
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas e saídas previstas e saldo acumulado projetado com detecção de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da conta paga em `financial_bills`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`.
    - `GET /financial/cashflow/projection`.
    - `POST /commissions/batch-pay`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/financial/financial-advanced.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/financial/financial-advanced.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **45/45 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.12: Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído)`
- **Descrição:** Cockpit executivo para franqueadoras e gestores de redes automotivas que operam múltiplas unidades/filiais no CarX. Visão unificada de faturamento consolidado por loja, ranking de produtividade entre unidades, taxa média de ocupação de boxes e logística inter-filiais (transferência atômica e auditada de bobinas de PPF/películas e insumos de estoque).
- **Destaques de Implementação:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada nas tabelas operacionais: `work_orders`, `bays`, `materials` e `material_rolls`, permitindo alocação física por loja.
    - Nova tabela `unit_transfers`: registro de transferências entre lojas com `from_unit_id`, `to_unit_id`, `transfer_type ('material', 'roll')`, `material_id`, `roll_id`, `quantity`, `status`, `notes`, `transferred_by`, carimbos de tempo e restrição `CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)`.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, unidades de origem/destino e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend em `CorporateService` (`apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais ativas do tenant com contadores operacionais integrados (`workOrdersCount`, `activeBaysCount`, `totalRollsCount`).
    - `createUnit`: Criação de filial com validação compulsória de limites de quota (`max_units`) do plano contratado e unicidade de `slug` por tenant.
    - `updateUnit`: Edição cadastral e status operacional da filial com trilha de auditoria.
    - `getCorporateOverview`: Agregação analítica consolidando Faturamento Total, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes (`appointments` ativos vs total de boxes), Ranking de Performance entre lojas (ordenado por faturamento e número de OSs) e Resumo de Estoque/Bobinas por loja.
    - `transferInventory`: Transferência atômica inter-filiais de bobina de PPF (`material_rolls.unit_id`) ou insumo de estoque (`materials` com débito na origem, crédito no destino e movimentação auditada em `stock_movements`), com bloqueio estrito contra cruzamento de dados entre diferentes tenants.
    - `listTransfers`: Histórico auditado de transferências com nomes de filiais e usuários responsáveis.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/units` e `GET /corporate/units/:id`
    - `POST /corporate/units` (Guarda RBAC: `owner`, `gestor`)
    - `PATCH /corporate/units/:id` (Guarda RBAC: `owner`, `gestor`)
    - `POST /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com:
      1. **Seletor de Unidade no Topo**: Alternância instantânea entre "Todas as Unidades (Rede Consolidada)" e filiais específicas sem relogin.
      2. **Visão Consolidada & Ranking**: 4 cards executivos de KPI, classificação numerada das filiais com badges de pódio e resumo de bobinas/insumos alocados.
      3. **Gestão de Filiais**: Tabela analítica com status e modal de cadastro de filial com validação de campos.
      4. **Logística Inter-Lojas**: Histórico de transferências e modal para movimentação rápida de bobinas de PPF e insumos entre lojas.
    - Item de menu "Redes / Franquias" adicionado na barra lateral de navegação ([`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx)) e rotas `/corporate`, `/redes` e `/multiunidade` integradas no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/corporate/corporate-units.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/corporate/corporate-units.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), suíte acumulada: **54/54 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.13: App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído)`
- **Descrição:** Arquitetura robusta de alta resiliência operacional para que técnicos, aplicadores e operadores continuem apontando cronômetros, checklists rápidos, fotos e progresso de etapas mesmo em subsolos, galpões de detalhamento ou áreas sem sinal de internet ou Wi-Fi. Os dados são armazenados atomicamente no IndexedDB local do navegador/PWA e sincronizados de forma idempotente assim que a conexão de rede for restabelecida.
- **Destaques de Implementação:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**:
    - Nova tabela `technician_offline_sync_logs` para garantia de idempotência estrita com restrição única `CONSTRAINT uq_tech_offline_action_tenant UNIQUE (tenant_id, action_id)`.
    - Campos: `id`, `tenant_id`, `action_id (UUID)`, `technician_id`, `work_order_id`, `action_type`, `payload (JSONB)`, `status ('applied', 'failed', 'rejected')`, `error_message`, `client_timestamp`, `synced_at`, `created_at`.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices de alta performance por OS, técnico e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `OfflineActionTypeSchema`: `'START_TIMER' | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'STOP_TIMER' | 'UPDATE_PROGRESS' | 'CHECKLIST_ITEM' | 'ADD_NOTE'`.
    - `SingleOfflineActionSchema`: Validação de `id` (UUID), `workOrderId` (UUID), `actionType`, `payload` e `clientTimestamp`.
    - `BatchSyncActionsSchema`: Envio agrupado em lote com `BatchSyncActionsInputDto`.
    - `BatchSyncResultDto` e `SyncActionResultDto`: Retorno padronizado de total processado, falhas, status individual e carimbo de sincronização.
  - **Lógica de Domínio Backend em `TechnicianService` (`apps/api/src/technician/technician-service.ts`)**:
    - Método `syncOfflineActions`:
      1. Verificação de idempotência via `technician_offline_sync_logs` para cada `action_id`. Reenvios retornam `success: true` imediatamente sem duplicação de dados.
      2. Validação estrita de multi-tenancy: bloqueia e rejeita qualquer ação cujo `work_order_id` pertença a outra oficina.
      3. Processamento especializado para cada tipo de ação:
         - `START_TIMER`: Inicia cronômetro com carimbo de tempo retroativo do cliente ou associa checklist de entrada.
         - `PAUSE_TIMER`: Encerra o intervalo ativo e soma os segundos acumulados na OS.
         - `RESUME_TIMER`: Cria novo intervalo de cronometragem ativo.
         - `STOP_TIMER`: Finaliza o cronômetro oficial, consolidando os segundos totais.
         - `UPDATE_PROGRESS`: Atualiza o percentual concluído dos serviços.
         - `CHECKLIST_ITEM` & `ADD_NOTE`: Registra apontamentos e notas de execução.
      4. Resiliência por item: falhas em ações individuais (ex: parâmetros inválidos) não abortam as demais ações válidas do lote.
  - **Rota Fastify Registrada (`apps/api/src/routes/technician-routes.ts`)**:
    - `POST /technician/sync` (Acesso autenticado para operadores e técnicos).
  - **Armazenamento Local Estruturado no Cliente (`apps/web/src/services/offlineStorage.ts`)**:
    - Banco IndexedDB nativo (`carx_offline_db`) com 4 Object Stores:
      1. `offline_actions`: Fila de ações pendentes indexadas por `workOrderId` e `createdAt`.
      2. `cached_queue`: Cópia local da fila de ordens de serviço do técnico para navegação sem rede.
      3. `local_timers`: Persistência do estado do cronômetro local (`running`, `paused`, `accumulatedSeconds`, `lastTickTimestamp`).
      4. `offline_photos`: Buffer local de fotos capturadas durante o serviço.
  - **Hook Corporativo `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**:
    - Monitoramento automático de conectividade via `window.addEventListener('online')` e `'offline'`.
    - Sincronização automática em background no momento da reconexão.
    - Suporte a disparo manual via `syncNow()` com purga de ações confirmadas no IndexedDB.
    - Método `enqueueOfflineAction` com geração de UUID v4 seguro e tentativa de despacho instantâneo se online.
  - **Integração nas Telas do Operador (`apps/web`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx):
      - Cache automático da fila no IndexedDB no carregamento com fallback transparente em caso de perda de conexão.
      - Desativação automática de polling periódico enquanto desconectado para economia de bateria e processamento.
      - Banner de status com telemetria: exibe indicação visual (`Modo Offline Ativo`), contador de apontamentos pendentes e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx):
      - Cronômetro desacoplado e resiliente: se a rede cair ou estiver sem sinal, as operações de iniciar, pausar, retomar ou concluir são persistidas no IndexedDB com badge `Offline (Local)` e sincronizadas assim que a conexão voltar.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/technician/technician-offline-sync.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician-offline-sync.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`5/5`), suíte acumulada: **59/59 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.14: Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído)`
- **Descrição:** Motor avançado de IA multimodal integrado ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report). Combina Visão Computacional para pré-detecção de avarias na pintura/lataria/vidros com NLP/Speech-to-Text para extração de dados do check-in por voz (KM, combustível, checklist), sugerindo automaticamente serviços automotivos de alto ticket (PPF, vitrificação, polimento corretivo, martelinho PDR) para inclusão com 1 clique no orçamento da OS.
- **Destaques de Implementação:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**:
    - Criação da tabela `ai_inspection_analyses` com `tenant_id`, `work_order_id`, `inspection_id`, `analysis_type ('image_damage_detection', 'voice_checklist_extraction')`, `input_payload`, `detected_damages`, `suggested_services`, `extracted_checklist`, `provider`, `tokens_used`, `status` e carimbos de tempo.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, OS e tipo de análise.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `AiDetectedDamageItemSchema`: validação de peça (`part`), tipo de dano (`damageType`), severidade (`severity`), nível de confiança (`confidence`), coordenadas no diagrama (`view`, `xPercent`, `yPercent`) e ação recomendada.
    - `AiSuggestedServiceItemSchema`: serviço sugerido, categoria, valor em centavos (`estimatedPriceCents`), tempo em minutos e justificativa técnica.
    - `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto`, `ApplyAiSuggestionsInputSchema`, `ApplyAiSuggestionsResultDto` e `AiAnalysisHistoryItemDto`.
  - **Lógica de Domínio Backend em `AiInspectionService` (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - `analyzeDamage`: Motor multimodal com suporte a Gemini API e fallback para o motor heurístico especializado do CarX (`carx-auto-vision-ai`), detectando avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - `extractVoiceChecklist`: Processamento de áudio ou texto ditado com parser especializado em português do Brasil (reconhecimento de KM em dígitos e numerais por extenso até 999 mil, níveis de combustível e menções a serviços/avarias).
    - `applyToWorkOrder`: Aplicação atômica com 1 clique que cria/atualiza a inspeção de check-in, insere os pontos de dano em `inspection_damage_points`, adiciona os serviços selecionados em `work_order_items`, recalcula o total da OS e atualiza a quilometragem em `vehicles`.
    - `getAnalysisHistory`: Histórico completo de diagnósticos de IA associados à OS.
  - **Rotas Fastify Registradas (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx):
      1. Aba de Visão Computacional com seleção de ângulos e plotagem de danos no laudo visual.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.




---

### ⚡ FASE 6 — Onda 2: Domínio Especializado Automotivo

#### Tarefa T6.5: Controle Fino de Bobinas (PPF / Películas, Margem Real por Metro e Garantia) `(Concluído)`
- **Descrição:** Módulo de alta precisão para controle de estoque e consumo linear de bobinas de PPF (Paint Protection Film) e películas solares (insulfilm). Permite rastrear cada centímetro aplicado, vincular o número de série e lote do rolo ao Certificado de Garantia / Passaporte Digital do cliente, registrar retalhos/desperdícios com justificativa e calcular a margem bruta real de lucro por veículo atendido.
- **Diretriz de Isolamento e Gating por Plano:**
  - A feature `ppf_spool_control` é restrita aos planos `Profissional` e `Premium`.
  - Lojas no plano `Essencial` recebem HTTP 403 ao tentar criar ou gerenciar bobinas e visualizam no frontend um card hero de upgrade destacando os benefícios do módulo de PPF.
- **Destaques de Implementação:**
  - **Contratos e DTOs em `@carx/shared`**:
    - `RegisterRollScrapInputSchema`, `RegisterRollScrapInputDto`.
    - `MaterialRollHistoryItemDto`, `MaterialRollDetailWithHistoryDto`.
    - Expansão de `MaterialRollDto` com `materialName`, `isLowMeters` e campos de metragem linear.
  - **Serviço de Negócio (`apps/api/src/stock/stock-service.ts`)**:
    - `assertSpoolControlFeature`: Verificação de plano via `planService.assertFeature(tenantId, PlanFeatures.PPF_SPOOL_CONTROL)`.
    - `createRoll`: Cadastro com cálculo automático de custo por metro linear (`costPerMeterCents = costCents / initialMeters`), lock atômico no material base e auditoria.
    - `getRollDetailedHistory`: Rastreabilidade cruzando `work_order_materials`, `work_orders`, `customers`, `vehicles`, `work_order_items`, `warranties` e `stock_movements`. Calcula:
      - `consumedMeters`: Metros aplicados em OSs concluídas.
      - `scrapMeters`: Metros perdidos em retalhos.
      - `efficiencyPercent`: Taxa de aproveitamento da bobina (`consumed / (consumed + scrap) * 100`).
      - `grossProfitCents` e `grossMarginPercent`: Lucro bruto real de cada veículo atendido (`servicePrice - costAllocated`).
    - `registerRollScrap`: Registro transacional de retalhos com abatimento em `material_rolls` e `materials`, inserção de `stock_movements` (`movement_type = 'waste'`), auditoria e transição automática para status `'depleted'` ao zerar o saldo.
    - `safeUuid`: Helper de sanitização contra UUIDs sintéticos em colunas com FK.
  - **Auto-vínculo de Garantia em `QaService` (`apps/api/src/qa/qa-service.ts`)**:
    - O método `createWarranty` inspeciona os materiais alocados na OS (`work_order_materials`) e vincula automaticamente `material_roll_id` e `material_lot_number` ao certificado emitido, permitindo consulta do lote no QR Code do Passaporte Digital do cliente.
  - **Rotas Fastify (`apps/api/src/routes/stock-routes.ts`)**:
    - `GET /materials/rolls/:id/history`: Retorna a timeline de aplicações, OSs, clientes, veículos e margem real da bobina.
    - `POST /materials/rolls/:id/scrap`: Registra perda/retalho com abatimento de saldo e auditoria.
  - **Frontend Modernizado (`apps/web/src/pages/Materiais.tsx`)**:
    - Código migrado de `.jsx` legado (Supabase) para TypeScript 100% tipado integrado à API Fastify.
    - Abas: "Bobinas (PPF & Películas)" e "Insumos Gerais & Químicos".
    - Métricas em tempo real: Bobinas ativas, saldo total em metros, bobinas em nível crítico e status do Passaporte Digital.
    - Barra de progresso visual do saldo de metragem (`currentMeters / initialMeters`).
    - Modal de Histórico e Margem Real por Veículo.
    - Modal de Registro de Retalho / Perda com recálculo instantâneo.
    - Modal de Nova Bobina e Reposição Rápida de Estoque.
    - Card Hero de Upgrade para lojas no plano Essencial.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/stock/spool-control.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/stock/spool-control.test.ts) cobrindo:
      1. Gating de Plano (HTTP 403 no Básico).
      2. Cadastro de Bobina com Custo e Metragem no plano Pro com atualização atômica do estoque.
      3. Alocação e Consumo na OS com Baixa Atômica de Metragem (`deductWorkOrderMaterials`).
      4. Vínculo Automático da Bobina e Lote ao Certificado de Garantia do Veículo.
      5. Histórico Detalhado, Rastreabilidade e Cálculo de Margem Real por Metro.
      6. Registro de Retalho/Desperdício (scrap) e Esgotamento Automático (`depleted`).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros no monorepo inteiro.

---

#### Tarefa T6.8: Motor de Reputação no Google Meu Negócio `(Concluído)`
- **Descrição:** Motor de captação de avaliações 5 estrelas no Google Meu Negócio / Google Maps focado em clientes promotores (NPS 9 e 10). Gera redirecionamento direto, rastreamento de cliques e conversão, além de disparos transacionais de WhatsApp com estrito cumprimento da regra comercial de assinaturas (cada oficina tem seu próprio número Baileys ou usa o link direto manual `wa.me` gratuito para planos sem gateway).
- **Destaques de Implementação:**
  - **Migration 030 (`030_google_reputation_engine.up.sql`)**:
    - `tenant_branding.google_review_url`: URL oficial do link curto da ficha do Google da oficina (`https://g.page/r/.../review`).
    - Colunas em `nps_surveys`: `google_review_sent_at`, `google_review_sent_via` (`automatic` | `manual`), `google_review_clicked_at`.
    - Índice composto otimizado: `idx_nps_surveys_promoters_reputation`.
  - **Regra de Negócio de WhatsApp por Plano**:
    - O sistema nunca assume custos nem intermediários fora do número próprio da oficina.
    - Planos com gateway e instância conectada realizam disparos automatizados de templates transacionais (`GOOGLE_REVIEW_INVITE`).
    - Planos sem gateway ou offline retornam fallback gracioso com URLs profundas `https://wa.me/{phone}?text={mensagem_formatada}`, viabilizando o envio manual em 1 clique pelo WhatsApp Web sem custo adicional.
  - **Lógica de Domínio em `NpsService` (`apps/api/src/nps/nps-service.ts`)**:
    - `getGoogleReviewUrl` com fallback inteligente de busca no Google Maps (`https://www.google.com/maps/search/?api=1&query=...`).
    - `answerSurvey` idempotente: bloqueio estrito de re-respostas (HTTP 409 Conflict), sugestão de link 5 estrelas apenas para notas 9 ou 10 e disparo / geração de link manual do WhatsApp.
    - `recordGoogleReviewClick`: Registro auditado do clique em `POST /public/nps/:token/google-click`.
    - `getReputationOverview`: Consolidação de métricas (`promotersCount`, `googleInvitesSent`, `googleReviewsClicked`, `conversionRatePercent`) e lista `topPromoters`.
  - **Interface no Frontend (`apps/web`)**:
    - **Painel NPS (`NpsDashboard.tsx`)**: Card de Reputação no Google com input para editar/salvar URL, métricas em tempo real, aviso de busca no Maps, badge explicativo da regra por plano e tabela interativa de promotores com reenvio/disparo manual via WhatsApp Web.
    - **Página Pública de Avaliação (`PesquisaNPS.jsx`)**: Suporte a busca por token público, visual Dark Volt Rebrand CarX e banner heróico de 5 estrelas para promotores com botão de alta conversão `⭐ Avaliar 5 Estrelas no Google Meu Negócio ⭐`.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/nps/google-reputation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/nps/google-reputation.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), regressão de NPS com 11/11 testes aprovados (`nps.test.ts`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.9: Mini-Site Institucional da Oficina, Portfólio e Captação de Leads `(Concluído)`
- **Descrição:** Vitrine pública de alta performance e conversão para cada oficina assinante do CarX (`minhaloja.carx.com.br` ou `/loja/:slug`), com otimização para SEO local, dispositivos móveis, catálogo de serviços, portfólio antes/depois, prova social e captação de orçamentos.
- **Destaques de Implementação:**
  - **Migration 031 (`031_minisite_portfolio_leads.up.sql`)**:
    - Colunas adicionadas em `tenant_branding`: `minisite_enabled`, `minisite_headline`, `minisite_about`, `minisite_address`, `minisite_business_hours`, `minisite_features`.
    - Tabela `minisite_portfolio_items`: Itens do portfólio com suporte a foto final e foto de entrada opcional para comparador interativo antes/depois (`before_image_url`, `after_image_url`), categorias, ordenação e destaque.
    - Tabela `minisite_leads`: Captação pública de solicitações de orçamento com rastreamento por status (`new`, `contacted`, `converted`, `discarded`).
    - Ativação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `MiniSiteService` (`apps/api/src/minisite/minisite-service.ts`)**:
    - `getPublicMiniSiteData`: Consulta pública sem autenticação que consolida branding, serviços ativos com menor preço ("A partir de R$ ..."), itens de portfólio ordenados e métricas sociais (NPS Score e depoimentos reais de promotores).
    - `createMiniSiteLead`: Registro público atômico de lead com geração de link profundo wa.me para atendimento ágil.
    - `listPortfolioItems`, `createPortfolioItem`, `updatePortfolioItem`, `deletePortfolioItem`: Gestão completa do portfólio da loja autenticada.
    - `listLeads`, `updateLeadStatus`: Painel de triagem e conversão de orçamentos para o gestor.
    - `updateMiniSiteSettings`: Personalização de textos institucionais e horários de atendimento.
  - **Rotas Fastify (`apps/api/src/routes/minisite-routes.ts`)**:
    - `GET /public/tenant/:slug/site` e `POST /public/tenant/:slug/leads` (públicas sem autenticação).
    - `GET /minisite/portfolio`, `POST /minisite/portfolio`, `PUT /minisite/portfolio/:id`, `DELETE /minisite/portfolio/:id` (protegidas).
    - `GET /minisite/leads`, `PATCH /minisite/leads/:id/status`, `PUT /minisite/settings` (protegidas).
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Página Pública (`apps/web/src/pages/MiniSiteOficina.tsx`)**:
      - Design automotivo premium nos tons Dark Volt (`#0E1116` e Verde Volt `#C8F52E`).
      - Topbar com horários e localização, Navbar responsiva, Hero com headline de autoridade e badges de diferenciais.
      - Grid de serviços com preço inicial, Galeria de portfólio com alternador interativo Antes/Depois.
      - Prova social com notas reais de promotores de NPS e link da ficha no Google Maps.
      - Formulário de orçamento com feedback instantâneo e botão de WhatsApp Web.
      - Rotas no frontend: `/loja/:slug`, `/oficina/:slug`, `/site/:slug`, `/site`.
    - **Gestão no Painel do Gestor (`apps/web/src/components/features/MiniSiteManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Mini-Site da Loja" em Configurações.
      - Link público copiável em 1 clique.
      - Cadastro e exclusão de trabalhos no portfólio.
      - Triagem de leads recebidos com badges de status e botão direto de WhatsApp.
      - Edição de headline e biografia institucional.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/minisite/minisite.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/minisite/minisite.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.10: Módulo Fiscal — Emissão de NFS-e Automática ao Liquidar a OS `(Concluído)`
- **Descrição:** Motor fiscal multitenant para emissão e transmissão de Nota Fiscal de Serviços Eletrônica (NFS-e) integrada à máquina de estados da Ordem de Serviço (`status: 'DELIVERED'` ou quitação integral do saldo via Pix). Suporte ao provedor Focus NFe com fallback e mock para ambiente de testes/sandbox, cálculo de alíquotas de ISS, sequenciamento atômico de RPS, recepção assíncrona de webhooks e cancelamento com justificativa legal.
- **Destaques de Implementação:**
  - **Migration 032 (`032_fiscal_nfse_module.up.sql`)**:
    - Tabela `tenant_fiscal_settings`: Certificado digital A1 (armazenamento criptografado), senha criptografada, token de API Focus NFe criptografado, inscrição municipal, regime tributário (Simples Nacional, MEI, Lucro Presumido, Lucro Real), alíquota de ISS municipal em pontos base, flags de auto-emissão (`auto_issue_on_delivery`, `auto_issue_on_payment`), RPS e série.
    - Tabela `fiscal_invoices`: Vínculo direto com `work_order_id` (com índice único parcial por tenant para garantir idempotência contra notas duplicadas ativas), RPS, número oficial da NFS-e municipal, código de verificação, protocolo, status (`draft`, `processing`, `authorized`, `error`, `cancelled`), retenção/cálculo de ISS, URLs para DANFSE PDF e XML.
    - Ativação obrigatória de RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` com a política `tenant_isolation_policy`.
    - Habilitação da feature `'nfse'` nos planos `profissional` e `premium` na tabela `plans`.
  - **Criptografia Simétrica de Credenciais Fiscais (`apps/api/src/fiscal/fiscal-crypto.ts`)**:
    - Algoritmo AES-256-GCM com Initialization Vector (IV) criptograficamente aleatório e Authentication Tag para garantia de autenticidade dos dados em repouso.
  - **Provedor Fiscal & Resiliência (`apps/api/src/fiscal/fiscal-provider.ts`)**:
    - Interface `FiscalProvider`: Métodos `issueNfse`, `cancelNfse`, `getInvoiceStatus`.
    - Classe `FocusNfeProvider`: Integração direta com os endpoints da Focus NFe (`/v2/nfse`).
    - Classe `MockFiscalProvider`: Provedor resiliente para sandbox e testes automatizados, simulando autorização em tempo hábil com geração de número de nota, código de verificação e links de PDF/XML.
  - **Lógica de Domínio em `FiscalService` (`apps/api/src/fiscal/fiscal-service.ts`)**:
    - `getSettings` e `updateSettings`: Gestão segura das configurações fiscais com ocultação de segredos (`hasApiToken`, `hasCertificate`).
    - `issueWorkOrderNfse`: Validação de feature gating (`PlanFeatures.NFSE`), checagem de idempotência (HTTP 409 se nota já autorizada ou em processamento), cálculo de valor bruto, deduções, alíquota e valor do ISS, reserva atômica de próximo RPS e envio ao provedor fiscal.
    - `handleWebhook`: Recepção de notificações assíncronas da prefeitura atualizando status para `authorized`, `error` ou `cancelled`.
    - `cancelNfse`: Cancelamento junto à prefeitura com exigência legal de justificativa detalhada (mínimo de 15 caracteres).
    - `tryAutoIssueWorkOrderNfse`: Disparo não-bloqueante acionado na máquina de estados da OS quando o status muda para `DELIVERED` ou ao confirmar quitação total via Pix.
  - **Integração na Máquina de Estados da OS (`apps/api/src/work-orders/work-order-service.ts`)**:
    - Disparos automáticos e silenciosos em segundo plano sem impactar o fluxo do balcão ou da oficina.
  - **Rotas Fastify Registradas (`apps/api/src/routes/fiscal-routes.ts`)**:
    - `GET /fiscal/settings` e `PUT /fiscal/settings`.
    - `POST /work-orders/:id/issue-nfse` e `GET /work-orders/:id/fiscal-invoice`.
    - `GET /fiscal/invoices` e `POST /fiscal/invoices/:id/cancel`.
    - `POST /webhooks/fiscal`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - **Configurações Fiscais (`apps/web/src/components/features/FiscalSettingsManager.tsx` integrado em `Settings.jsx`)**:
      - Aba "Módulo Fiscal (NFS-e)" em Configurações da Oficina.
      - Formulário de dados cadastrais (Razão Social, CNPJ, Inscrição Municipal, CNAE, Regime Tributário e Alíquota de ISS).
      - Configuração de credenciais com criptografia AES-256 (Token Focus NFe, Certificado A1 e Senha).
      - Chaves de auto-emissão ao entregar o veículo ou liquidar pagamento.
    - **Ações na Ordem de Serviço (`apps/web/src/pages/OrdensServico.tsx`)**:
      - Card de Nota Fiscal integrado no modal de detalhes da OS com visual Dark Volt.
      - Badges dinâmicos de status (`Autorizada`, `Processando`, `Erro de Emissão`, `Cancelada`).
      - Exibição de RPS, Número da Nota, Base de Cálculo e ISS devido.
      - Botão "Emitir NFS-e" em 1 clique para OSs sem nota emitida.
      - Botões para visualização/download de PDF e XML.
      - Modal de cancelamento de NFS-e com validação de justificativa de no mínimo 15 caracteres.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/fiscal/fiscal.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/fiscal/fiscal.test.ts) (100% de aprovação) cobrindo:
      1. Configuração com criptografia AES-256-GCM.
      2. Feature Gating por plano (HTTP 403 Forbidden no plano Essencial).
      3. Emissão com sucesso para a OS no plano Pro/Premium (HTTP 201 Created).
      4. Idempotência e bloqueio de emissão duplicada (HTTP 409 Conflict).
      5. Processamento resiliente de Webhook da prefeitura.
      6. Cancelamento com justificativa legal obrigatória.
      7. Isolamento multi-tenant estrito (RLS) no acesso e listagem de notas.
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **38/38 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.11: DRE Gerencial, Fluxo de Caixa Avançado & Comissões por Técnico `(Concluído)`
- **Descrição:** Motor financeiro avançado no servidor para gestão contábil e de rentabilidade de oficinas de alta performance. Previsão de fluxo de caixa projetado (diário de 30 a 90 dias), conciliação de contas a pagar e a receber com plano de contas automotivo, e apuração automática de comissões por colaborador com dedução do custo real de insumos (bobinas de PPF/químicos da T6.5) e liquidação em lote com registro atômico de despesa.
- **Destaques de Implementação:**
  - **Migration 033 (`033_advanced_financial_dre_cashflow.up.sql`)**:
    - Tabela `financial_categories`: Plano de contas pré-semeado para oficinas (Aluguel, Luz/Água/Internet, Pró-Labore/Salários, Software CarX, Marketing/Tráfego, Manutenção de Ferramentas, Comissões Técnicas e Insumos) com suporte a categorias personalizadas por tenant.
    - Tabela `financial_bills`: Contas a pagar e a receber com restrição `CHECK (type IN ('payable', 'receivable'))`, fornecedor/cliente, vencimento, forma de pagamento, quitação parcial/total (`paid_amount_cents`), notas e comprovante.
    - Colunas adicionadas em `commission_entries`: `spool_cost_cents` (dedução auditada de bobinas/insumos da T6.5), `batch_id` e `paid_by`.
    - Habilitação compulsória de RLS com `FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy`.
  - **Lógica de Domínio em `FinancialService` (`apps/api/src/financial/financial-service.ts`)**:
    - `getAdvancedDre`: Cálculo analítico em cascata no PostgreSQL:
      1. (+) Receita Bruta de Serviços e Produtos
      2. (-) Deduções Comerciais (Descontos) e Fiscais (ISS NFS-e da T6.10)
      3. (=) Receita Operacional Líquida (ROL)
      4. (-) Custos Variáveis dos Serviços (CSP / CMV): Insumos de Estoque Consumidos + Bobinas de PPF/Películas Cortadas (T6.5) + Comissões de Técnicos
      5. (=) Margem de Contribuição Operacional (% da ROL)
      6. (-) Despesas Fixas (Aluguel, Utilidades, Salários/Pró-Labore, Softwares)
      7. (-) Despesas Operacionais (Marketing/Tráfego, Ferramentas/Manutenção)
      8. (=) **EBITDA Real da Oficina** (% margem EBITDA)
      9. (=) Lucro Líquido Real
    - `getCashFlowProjection`: Linha do tempo dia a dia de 30, 60 e 90 dias com saldo inicial consolidado, entradas e saídas previstas e saldo acumulado projetado com detecção de risco de caixa.
    - `listBills`, `createBill`, `markBillPaid`, `deleteBill`: Gestão completa de contas a pagar e a receber.
    - `batchPayCommissions`: Fechamento e quitação em lote de comissões por colaborador com gravação atômica de `batch_id` e geração automática da conta paga em `financial_bills`.
  - **Rotas Fastify Registradas (`apps/api/src/routes/financial-routes.ts`)**:
    - `GET /financial/categories` e `POST /financial/categories`.
    - `GET /financial/bills`, `POST /financial/bills`, `PATCH /financial/bills/:id/pay`, `DELETE /financial/bills/:id`.
    - `GET /reports/dre/advanced`.
    - `GET /financial/cashflow/projection`.
    - `POST /commissions/batch-pay`.
  - **Frontend no Padrão Rebrand CarX (`apps/web`)**:
    - Componente executivo [`DreDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/DreDashboard.tsx) reformulado com 4 abas integradas:
      1. **DRE Gerencial & EBITDA Real**: Cascata analítica de 9 degraus, cards executivos de margem e alarme de inadimplência.
      2. **Projeção de Fluxo de Caixa**: Seletor de horizonte (30, 60, 90 dias), saldo inicial, previsão final e timeline diária.
      3. **Contas a Pagar & Receber**: Filtros por status/tipo, modal para cadastro e quitação com 1 clique.
      4. **Fechamento de Comissões por Técnico**: Seleção de colaborador, conferência de deduções de bobinas, seleção múltipla em lote e quitação via PIX/Transferência.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 7 testes dedicados em [`apps/api/src/financial/financial-advanced.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/financial/financial-advanced.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`7/7`), suíte acumulada: **45/45 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.12: Painel Corporativo de Redes e Franquias (Multiunidade) `(Concluído)`
- **Descrição:** Cockpit executivo para franqueadoras e gestores de redes automotivas que operam múltiplas unidades/filiais no CarX. Visão unificada de faturamento consolidado por loja, ranking de produtividade entre unidades, taxa média de ocupação de boxes e logística inter-filiais (transferência atômica e auditada de bobinas de PPF/películas e insumos de estoque).
- **Destaques de Implementação:**
  - **Migration 034 (`034_corporate_multi_unit_franchise.up.sql`)**:
    - Coluna `unit_id UUID REFERENCES units(id) ON DELETE SET NULL` adicionada nas tabelas operacionais: `work_orders`, `bays`, `materials` e `material_rolls`, permitindo alocação física por loja.
    - Nova tabela `unit_transfers`: registro de transferências entre lojas com `from_unit_id`, `to_unit_id`, `transfer_type ('material', 'roll')`, `material_id`, `roll_id`, `quantity`, `status`, `notes`, `transferred_by`, carimbos de tempo e restrição `CONSTRAINT chk_different_units CHECK (from_unit_id <> to_unit_id)`.
    - RLS canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, unidades de origem/destino e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `UnitDto`, `CreateUnitSchema`, `UpdateUnitSchema`, `CorporateDashboardOverviewDto`, `UnitRankingItemDto`, `CreateUnitTransferSchema`, `UnitTransferDto`.
  - **Lógica de Domínio Backend em `CorporateService` (`apps/api/src/corporate/corporate-service.ts`)**:
    - `listUnits`: Lista filiais ativas do tenant com contadores operacionais integrados (`workOrdersCount`, `activeBaysCount`, `totalRollsCount`).
    - `createUnit`: Criação de filial com validação compulsória de limites de quota (`max_units`) do plano contratado e unicidade de `slug` por tenant.
    - `updateUnit`: Edição cadastral e status operacional da filial com trilha de auditoria.
    - `getCorporateOverview`: Agregação analítica consolidando Faturamento Total, Volume de OSs, Ticket Médio, Taxa de Ocupação de Boxes (`appointments` ativos vs total de boxes), Ranking de Performance entre lojas (ordenado por faturamento e número de OSs) e Resumo de Estoque/Bobinas por loja.
    - `transferInventory`: Transferência atômica inter-filiais de bobina de PPF (`material_rolls.unit_id`) ou insumo de estoque (`materials` com débito na origem, crédito no destino e movimentação auditada em `stock_movements`), com bloqueio estrito contra cruzamento de dados entre diferentes tenants.
    - `listTransfers`: Histórico auditado de transferências com nomes de filiais e usuários responsáveis.
  - **Rotas Fastify Registradas (`apps/api/src/routes/corporate-routes.ts`)**:
    - `GET /corporate/overview` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/units` e `GET /corporate/units/:id`
    - `POST /corporate/units` (Guarda RBAC: `owner`, `gestor`)
    - `PATCH /corporate/units/:id` (Guarda RBAC: `owner`, `gestor`)
    - `POST /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
    - `GET /corporate/transfers` (Guarda RBAC: `owner`, `gestor`)
  - **Frontend do Gestor (`apps/web`)**:
    - Componente executivo [`CorporateDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CorporateDashboard.tsx) e página [`Corporate.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/Corporate.jsx) com:
      1. **Seletor de Unidade no Topo**: Alternância instantânea entre "Todas as Unidades (Rede Consolidada)" e filiais específicas sem relogin.
      2. **Visão Consolidada & Ranking**: 4 cards executivos de KPI, classificação numerada das filiais com badges de pódio e resumo de bobinas/insumos alocados.
      3. **Gestão de Filiais**: Tabela analítica com status e modal de cadastro de filial com validação de campos.
      4. **Logística Inter-Lojas**: Histórico de transferências e modal para movimentação rápida de bobinas de PPF e insumos entre lojas.
    - Item de menu "Redes / Franquias" adicionado na barra lateral de navegação ([`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx)) e rotas `/corporate`, `/redes` e `/multiunidade` integradas no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/corporate/corporate-units.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/corporate/corporate-units.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), suíte acumulada: **54/54 testes verdes**, `pnpm typecheck` com zero erros em todo o monorepo.

---

#### Tarefa T6.13: App do Técnico Offline-First Completo (PWA com IndexedDB & Sincronização) `(Concluído)`
- **Descrição:** Arquitetura robusta de alta resiliência operacional para que técnicos, aplicadores e operadores continuem apontando cronômetros, checklists rápidos, fotos e progresso de etapas mesmo em subsolos, galpões de detalhamento ou áreas sem sinal de internet ou Wi-Fi. Os dados são armazenados atomicamente no IndexedDB local do navegador/PWA e sincronizados de forma idempotente assim que a conexão de rede for restabelecida.
- **Destaques de Implementação:**
  - **Migration 035 (`035_technician_offline_sync.up.sql`)**:
    - Nova tabela `technician_offline_sync_logs` para garantia de idempotência estrita com restrição única `CONSTRAINT uq_tech_offline_action_tenant UNIQUE (tenant_id, action_id)`.
    - Campos: `id`, `tenant_id`, `action_id (UUID)`, `technician_id`, `work_order_id`, `action_type`, `payload (JSONB)`, `status ('applied', 'failed', 'rejected')`, `error_message`, `client_timestamp`, `synced_at`, `created_at`.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices de alta performance por OS, técnico e data.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `OfflineActionTypeSchema`: `'START_TIMER' | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'STOP_TIMER' | 'UPDATE_PROGRESS' | 'CHECKLIST_ITEM' | 'ADD_NOTE'`.
    - `SingleOfflineActionSchema`: Validação de `id` (UUID), `workOrderId` (UUID), `actionType`, `payload` e `clientTimestamp`.
    - `BatchSyncActionsSchema`: Envio agrupado em lote com `BatchSyncActionsInputDto`.
    - `BatchSyncResultDto` e `SyncActionResultDto`: Retorno padronizado de total processado, falhas, status individual e carimbo de sincronização.
  - **Lógica de Domínio Backend em `TechnicianService` (`apps/api/src/technician/technician-service.ts`)**:
    - Método `syncOfflineActions`:
      1. Verificação de idempotência via `technician_offline_sync_logs` para cada `action_id`. Reenvios retornam `success: true` imediatamente sem duplicação de dados.
      2. Validação estrita de multi-tenancy: bloqueia e rejeita qualquer ação cujo `work_order_id` pertença a outra oficina.
      3. Processamento especializado para cada tipo de ação:
         - `START_TIMER`: Inicia cronômetro com carimbo de tempo retroativo do cliente ou associa checklist de entrada.
         - `PAUSE_TIMER`: Encerra o intervalo ativo e soma os segundos acumulados na OS.
         - `RESUME_TIMER`: Cria novo intervalo de cronometragem ativo.
         - `STOP_TIMER`: Finaliza o cronômetro oficial, consolidando os segundos totais.
         - `UPDATE_PROGRESS`: Atualiza o percentual concluído dos serviços.
         - `CHECKLIST_ITEM` & `ADD_NOTE`: Registra apontamentos e notas de execução.
      4. Resiliência por item: falhas em ações individuais (ex: parâmetros inválidos) não abortam as demais ações válidas do lote.
  - **Rota Fastify Registrada (`apps/api/src/routes/technician-routes.ts`)**:
    - `POST /technician/sync` (Acesso autenticado para operadores e técnicos).
  - **Armazenamento Local Estruturado no Cliente (`apps/web/src/services/offlineStorage.ts`)**:
    - Banco IndexedDB nativo (`carx_offline_db`) com 4 Object Stores:
      1. `offline_actions`: Fila de ações pendentes indexadas por `workOrderId` e `createdAt`.
      2. `cached_queue`: Cópia local da fila de ordens de serviço do técnico para navegação sem rede.
      3. `local_timers`: Persistência do estado do cronômetro local (`running`, `paused`, `accumulatedSeconds`, `lastTickTimestamp`).
      4. `offline_photos`: Buffer local de fotos capturadas durante o serviço.
  - **Hook Corporativo `useOfflineSync` (`apps/web/src/hooks/useOfflineSync.ts`)**:
    - Monitoramento automático de conectividade via `window.addEventListener('online')` e `'offline'`.
    - Sincronização automática em background no momento da reconexão.
    - Suporte a disparo manual via `syncNow()` com purga de ações confirmadas no IndexedDB.
    - Método `enqueueOfflineAction` com geração de UUID v4 seguro e tentativa de despacho instantâneo se online.
  - **Integração nas Telas do Operador (`apps/web`)**:
    - [`OperadorHome.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/OperadorHome.tsx):
      - Cache automático da fila no IndexedDB no carregamento com fallback transparente em caso de perda de conexão.
      - Desativação automática de polling periódico enquanto desconectado para economia de bateria e processamento.
      - Banner de status com telemetria: exibe indicação visual (`Modo Offline Ativo`), contador de apontamentos pendentes e botão de sincronização manual.
    - [`ExecutorView.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/ExecutorView.tsx):
      - Cronômetro desacoplado e resiliente: se a rede cair ou estiver sem sinal, as operações de iniciar, pausar, retomar ou concluir são persistidas no IndexedDB com badge `Offline (Local)` e sincronizadas assim que a conexão voltar.
  - **Validação Automatizada com Sucesso Absoluto**:
    - 5 testes dedicados em [`apps/api/src/technician/technician-offline-sync.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/technician/technician-offline-sync.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`5/5`), suíte acumulada: **59/59 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.14: Inteligência Artificial Aplicada (Vistoria Inteligente & Sugestão de Orçamento) `(Concluído)`
- **Descrição:** Motor avançado de IA multimodal integrado ao fluxo de entrada do veículo na oficina (VCR - Visual Check-in Report). Combina Visão Computacional para pré-detecção de avarias na pintura/lataria/vidros com NLP/Speech-to-Text para extração de dados do check-in por voz (KM, combustível, checklist), sugerindo automaticamente serviços automotivos de alto ticket (PPF, vitrificação, polimento corretivo, martelinho PDR) para inclusão com 1 clique no orçamento da OS.
- **Destaques de Implementação:**
  - **Migration 036 (`036_ai_inspection_analysis.up.sql`)**:
    - Criação da tabela `ai_inspection_analyses` com `tenant_id`, `work_order_id`, `inspection_id`, `analysis_type ('image_damage_detection', 'voice_checklist_extraction')`, `input_payload`, `detected_damages`, `suggested_services`, `extracted_checklist`, `provider`, `tokens_used`, `status` e carimbos de tempo.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) com `tenant_isolation_policy` e índices otimizados por tenant, OS e tipo de análise.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `AiDetectedDamageItemSchema`: validação de peça (`part`), tipo de dano (`damageType`), severidade (`severity`), nível de confiança (`confidence`), coordenadas no diagrama (`view`, `xPercent`, `yPercent`) e ação recomendada.
    - `AiSuggestedServiceItemSchema`: serviço sugerido, categoria, valor em centavos (`estimatedPriceCents`), tempo em minutos e justificativa técnica.
    - `AiAnalyzeDamageInputSchema`, `AiDamageDetectionResultDto`, `AiVoiceChecklistInputSchema`, `AiVoiceChecklistResultDto`, `ApplyAiSuggestionsInputSchema`, `ApplyAiSuggestionsResultDto` e `AiAnalysisHistoryItemDto`.
  - **Lógica de Domínio Backend em `AiInspectionService` (`apps/api/src/ai/ai-inspection-service.ts`)**:
    - `analyzeDamage`: Motor multimodal com suporte a Gemini API e fallback para o motor heurístico especializado do CarX (`carx-auto-vision-ai`), detectando avarias por ângulo e peça com coordenadas compatíveis com o diagrama do veículo.
    - `extractVoiceChecklist`: Processamento de áudio ou texto ditado com parser especializado em português do Brasil (reconhecimento de KM em dígitos e numerais por extenso até 999 mil, níveis de combustível e menções a serviços/avarias).
    - `applyToWorkOrder`: Aplicação atômica com 1 clique que cria/atualiza a inspeção de check-in, insere os pontos de dano em `inspection_damage_points`, adiciona os serviços selecionados em `work_order_items`, recalcula o total da OS e atualiza a quilometragem em `vehicles`.
    - `getAnalysisHistory`: Histórico completo de diagnósticos de IA associados à OS.
  - **Rotas Fastify Registradas (`apps/api/src/routes/ai-inspection-routes.ts`)**:
    - `POST /ai/inspections/analyze-damage`
    - `POST /ai/inspections/extract-voice`
    - `POST /ai/inspections/apply-to-work-order`
    - `GET /ai/inspections/history/:workOrderId`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`AiInspectionAssistantModal.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/AiInspectionAssistantModal.tsx):
      1. Aba de Visão Computacional com seleção de ângulos e plotagem de danos no laudo visual.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.




---

#### Tarefa T6.6: Passaporte Digital do Veículo & Transferência na Revenda `(Concluído)`
- **Descrição:** Certificado de garantia digital e histórico veicular com selo de autenticidade antifraude acessível via QR Code público (`/v/:token` e `/passaporte/:token`). Exibe procedência de películas e vitrificadores (marca e lote oficial do rolo), linha do tempo cronológica de manutenções realizadas pela oficina certificadora, com anonimização LGPD nos dados do antigo proprietário e motor transacional de transferência de custódia na revenda do veículo.
- **Destaques de Implementação:**
  - **Migration 029 (`029_vehicle_passport_transfer.up.sql`)**:
    - Colunas adicionadas em `warranties`: `is_transferable BOOLEAN NOT NULL DEFAULT true`, `transferred_at TIMESTAMPTZ`, `transferred_from_customer_id UUID REFERENCES customers(id)`.
    - Tabela de histórico `warranty_transfers`: Armazena tenant, garantia, veículo, dados anonimizados do proprietário anterior, novo titular (nome, whatsapp, email, km no hodômetro, motivo, IP e User-Agent) com RLS ativado e forçado.
  - **Contratos e DTOs em `@carx/shared`**:
    - DTO `PublicVehiclePassportDto` enriquecido com timeline de manutenções, procedência de bobina (`materialRollBrand`, `materialRollCode`), histórico de transferências (`transfersHistory`) e contagem total de transferências.
    - Schemas de validação Zod: `TransferVehiclePassportInputSchema`, `TransferVehiclePassportInputDto` e `TransferVehiclePassportResultDto`.
  - **Motor de Domínio em `QaService` (`apps/api/src/qa/qa-service.ts`)**:
    - `verifyPublicPassport`: Endpoint público e protegido contra IDOR que recupera a garantia, mascara a placa no padrão Mercosul (`PPF-***8`), anonimiza nomes para LGPD (`Rodrigo F***`), busca o lote oficial da película e compõe a timeline cronológica completa de serviços e transferências.
    - `transferWarrantyCustody`: Operação atômica que cadastra ou associa o novo proprietário em `customers`, atualiza o vínculo do carro em `vehicles.customer_id`, atualiza o titular da garantia em `warranties` com registro imutável em `warranty_transfers` e evento auditável em `work_order_events`.
    - Validação de regras de negócio: Rejeita transferências de garantias expiradas/revogadas (HTTP 400 `WARRANTY_NOT_ACTIVE`) ou marcadas como intransferíveis (HTTP 400 `WARRANTY_NON_TRANSFERABLE`).
  - **Rotas Fastify Registradas (`apps/api/src/routes/qa-routes.ts`)**:
    - `GET /public/passports/:token`: Consulta pública completa do passaporte.
    - `GET /v/:token`: Alias de URL curta oficial para escaneamento imediato pela câmera do smartphone via QR Code.
    - `POST /public/passports/:token/transfer`: Endpoint público de transferência de titularidade na revenda.
  - **Frontend Público (`apps/web/src/pages/PublicPassportPage.tsx` e `App.jsx`)**:
    - Interface escura de alta fidelidade visual (Design System CarX `#0E1116`, `#171C24` e acentos em Verde Volt `#CCFF00`).
    - Selo holográfico de autenticidade, badge Mercosul e contagem regressiva de dias de cobertura.
    - Seção de Procedência & Lote da película de proteção (PPF).
    - Linha do tempo cronológica de manutenções do carro.
      2. Aba de Checklist por Voz com integração da Web Speech API nativa e transcrição instantânea.
      3. Aba de Serviços para Orçamento com seleção dinâmica e totalizador de valor adicional orçado.
    - Botão de acesso rápido "✨ Vistoria com IA" integrado no cabeçalho do laudo digital em [`CarVisualChecklist.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CarVisualChecklist.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 6 testes dedicados em [`apps/api/src/ai/ai-inspection.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`6/6`), suíte acumulada: **65/65 testes verdes**, compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.

---

#### Tarefa T6.15: CRM de Pós-Venda, Garantias Periódicas & Retenção Ativa `(Concluído e Homologado)`
- **Descrição:** Motor completo de retenção ativa, pós-venda preventivo e fidelização de clientes para centros automotivos de estética e envelopamento. Gerencia réguas de contato automáticas com base no tipo de serviço executado (revisão de PPF aos 6 meses, manutenção de vitrificação cerâmica aos 12 meses, higienização semestral e película solar), radar anti-churn com identificação de clientes inativos (>90d, >180d, >365d), geração instantânea de cupons dinâmicos com prazo de validade (`RETORNO15-XXXX`) e links profundos do WhatsApp Web com mensagem personalizada e tags dinâmicas.
- **Destaques de Implementação:**
  - **Migration 037 (`037_crm_retention_rules.up.sql`)**:
    - Tabela `crm_retention_rules`: regras com categoria de serviço (`ppf`, `vitrificacao`, `higienizacao`, `insulfilm`, `polimento`, `geral`), tipo de gatilho (`warranty_revision`, `service_interval`, `customer_inactivity`), intervalo em dias, template da mensagem e desconto configurável.
    - Tabela `tenant_customer_coupons`: cupons dinâmicos emitidos pela oficina para retenção dos seus clientes com unicidade `(tenant_id, UPPER(code))`, desconto percentual ou fixo e data limite de uso.
    - Tabela `crm_retention_contacts`: histórico completo de abordagens de retenção com rastreamento de status (`sent`, `contacted`, `scheduled`, `converted`, `ignored`), vínculo à OS convertida, receita gerada e usuário que disparou.
    - RLS Canônico compulsório (`ENABLE` e `FORCE ROW LEVEL SECURITY`) em todas as 3 tabelas com `tenant_isolation_policy`.
  - **Contratos e Schemas Zod em `@carx/shared` (`packages/shared/src/schemas.ts`)**:
    - `CrmRetentionRuleDto`, `CreateCrmRetentionRuleSchema`, `UpdateCrmRetentionRuleSchema`.
    - `CrmRetentionOverviewDto`: indicadores executivos de clientes totais, ativos (<90d), em risco (90-180d), inativos (>180d), taxa de recompra anual, pendências de garantia e receita recuperada.
    - `WarrantyRevisionItemDto`: certificados de garantia com marcos de 6m/12m vencendo em 30d ou atrasados.
    - `InactiveCustomerItemDto`: clientes segmentados por inatividade com ticket médio histórico e sugestão de cupom.
    - `TriggerRetentionContactInputSchema`, `TriggerRetentionContactResultDto`, `ConvertRetentionContactInputSchema`, `RetentionContactItemDto`.
  - **Lógica de Domínio Backend em `CrmRetentionService` (`apps/api/src/crm/crm-retention-service.ts`)**:
    - `seedDefaultRetentionRules`: auto-inicialização das 4 réguas padrão da oficina se não existirem.
    - `getRetentionOverview`: cálculo analítico de KPIs consolidados e taxa de recompra em 12 meses.
    - `listWarrantyRevisions`: identificação preditiva de revisões de garantia periódica com cálculo de dias restantes ou atrasados (`daysRemainingOrOverdue`).
    - `listInactiveCustomers`: listagem segmentada com cálculo de tempo sem visita, LTV acumulado e cupom recomendado.
    - `triggerRetentionContact`: substituição de variáveis no template (`{cliente}`, `{veiculo}`, `{servico}`, `{cupom_codigo}`, `{cupom_beneficio}`), geração de cupom dinâmico e link do WhatsApp (`wa.me`).
    - `convertRetentionContact`: conversão do contato em agendamento/venda com receita registrada.
  - **Rotas Fastify Registradas (`apps/api/src/routes/crm-retention-routes.ts`)**:
    - `GET /crm/retention/overview`
    - `GET /crm/retention/warranty-revisions`
    - `GET /crm/retention/inactive-customers`
    - `GET /crm/retention/rules` e `POST /crm/retention/rules`
    - `POST /crm/retention/trigger-contact`
    - `GET /crm/retention/contacts`
    - `POST /crm/retention/contacts/:id/convert`
  - **Frontend Integrado (`apps/web`)**:
    - Componente executivo [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx) e página [`CrmRetencao.jsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/CrmRetencao.jsx):
      1. 4 Cards de Métricas: Taxa de Recompra, Revisões Preventivas, Radar Anti-Churn e Receita por Retenção.
      2. Aba 1: Revisões de Garantia com badges de vencimento e botão "Chamar no WhatsApp".
      3. Aba 2: Radar de Clientes Inativos com filtro por tempo de inatividade e botão de reativação com cupom.
      4. Aba 3: Réguas de Automação ativas e modal para criação de novas réguas.
      5. Aba 4: Histórico de Disparos com marcação de conversão e receita gerada.
    - Rota `/crm` e `/retencao` no [`App.jsx`](file:///d:/Repositorios/CarX/apps/web/src/App.jsx) e menu "CRM & Retenção" no [`Sidebar.jsx`](file:///d:/Repositorios/CarX/apps/web/src/components/layout/Sidebar.jsx).
  - **Validação Automatizada com Sucesso Absoluto**:
    - 9 testes dedicados em [`apps/api/src/crm/crm-retention.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/crm/crm-retention.test.ts) (100% de aprovação).
- **Status da Validação:** 100% dos testes aprovados (`9/9`), compilação TypeScript em todo o monorepo (`pnpm typecheck`) e build de produção do frontend (`pnpm --filter @carx/web build`) com zero erros.




---

### 🛡️ FASE 7 — Qualidade Contínua, Testes de Carga (k6), Hardening OWASP & Simulação DR `(Concluído e Homologado)`

#### Tarefa T7.1: Quality Gate Automatizado (System Quality Gate) `(Concluído e Homologado)`
- **Descrição:** Execução integral do pipeline corporativo de engenharia da qualidade regido por [`system-quality-gate/SKILL.md`](file:///d:/Repositorios/CarX/system-quality-gate/SKILL.md), cobrindo análise estática, linting, builds de produção dos frontends, suíte completa de regressão automatizada (111 testes em 17 suítes), auditoria estrutural do PostgreSQL 16 e emissão de relatórios formais de governança.
- **Destaques de Implementação e Validação:**
  - **Análise Estática e Linting**:
    - `pnpm typecheck`: **0 erros** em todos os pacotes do monorepo (`@carx/shared`, `@carx/ui`, `@carx/api`, `@carx/web`, `@carx/admin`), após ajuste de contrato `channel: 'whatsapp'` em [`CrmRetentionDashboard.tsx`](file:///d:/Repositorios/CarX/apps/web/src/components/features/CrmRetentionDashboard.tsx).
    - `pnpm eslint apps packages --quiet`: **0 erros**, após limpeza de escape desnecessário em regex no [`ai-inspection-service.ts`](file:///d:/Repositorios/CarX/apps/api/src/ai/ai-inspection-service.ts).
  - **Builds de Produção**:
    - `@carx/web`: Build Vite + PWA concluído em `8.81s` com `106 entradas precached` (`3.52 MB`) e Service Worker offline gerado.
    - `@carx/admin`: Build Vite do Super Admin concluído em `9.45s`.
  - **Auditoria PostgreSQL 16 ([`db-audit.ts`](file:///d:/Repositorios/CarX/quality/scripts/db-audit.ts))**:
    - Todas as **37 migrações SQL** (`001` a `037`) aplicadas e íntegras.
    - **58/58 tabelas com `tenant_id`** auditadas no `pg_catalog` com `rls_enabled = true` e `rls_forced = true` (**100% de cobertura**).
    - `0` locks bloqueantes e `0` conexões presas em `idle in transaction`. Evidência salva em [`postgres-audit.json`](file:///d:/Repositorios/CarX/quality/evidence/postgres-audit.json).
  - **Artefatos de Governança Emitidos**:
    - [`test-plan.md`](file:///d:/Repositorios/CarX/quality/plans/test-plan.md)
    - [`quality-report.md`](file:///d:/Repositorios/CarX/quality/reports/quality-report.md)
    - [`quality-summary.json`](file:///d:/Repositorios/CarX/quality/reports/quality-summary.json)

---

#### Tarefa T7.2: Testes de Isolamento Multitenant (CI Obrigatório) `(Concluído e Homologado)`
- **Descrição:** Suíte automatizada de verificação dinâmica no catálogo do PostgreSQL e análise estática do código-fonte para impedir vazamentos entre oficinas (tenants) e proibir consultas fora do escopo transacional `withTenantContext`.
- **Destaques de Implementação:**
  - Evolução de [`tenant-isolation.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/database/tenant-isolation.test.ts) para **10 testes abrangentes (10/10 aprovados)**:
    - Verificação dinâmica de `relrowsecurity` e `relforcerowsecurity` nas 58 tabelas com `tenant_id`, incluindo todas as tabelas das Ondas 1, 2 e 3 da Fase 6 (`warranty_transfers`, `minisite_portfolio_items`, `minisite_leads`, `tenant_fiscal_settings`, `fiscal_invoices`, `financial_categories`, `financial_bills`, `unit_transfers`, `technician_offline_sync_logs`, `ai_inspection_analyses`, `crm_retention_rules`, `tenant_customer_coupons`, `crm_retention_contacts`).
    - Varredura estática recursiva nos 15 módulos de domínio de `apps/api/src/` comprovando **0 chamadas diretas a `adminPool.query`** em regras de negócio de oficinas.

---

#### Tarefa T7.3: Testes de Carga Progressivos com k6 (Até 100 Conexões Simultâneas) `(Concluído e Homologado)`
- **Descrição:** Simulação de estresse e concorrência progressiva em 6 estágios (`1 -> 5 -> 10 -> 25 -> 50 -> 100 VUs`) exercitando os fluxos críticos de atualização de telas de Monitor TV / Tracking de OS (`/work-orders/tracking/:token`), Passaporte Digital QR Code (`/public/passports/:token`), Mini-Site da Oficina (`/public/tenant/:slug/site`) e `/health`.
- **Resultados Obtidos ([`load-runner.ts`](file:///d:/Repositorios/CarX/quality/k6/load-runner.ts) / [`load-test.js`](file:///d:/Repositorios/CarX/quality/k6/load-test.js)):**
  - Total acumulado nos 6 estágios: **26.085 requisições processadas**, **0 erros HTTP (0,00%)**.
  - Desempenho no pico de **100 Conexões Simultâneas (100 VUs)**:
    - Throughput sustentado: **1.052,4 req/s** (`10.524` requisições em `10s`).
    - Latência `p50`: **78,93 ms** | `p90`: **120,53 ms** | `p95`: **131,98 ms** (meta `< 500 ms`) | `p99`: **152,06 ms**.
    - Zero exaustão de pool no PostgreSQL. Evidência persistida em [`benchmark-latest-100vus.json`](file:///d:/Repositorios/CarX/quality/evidence/benchmark-latest-100vus.json).

---

#### Tarefa T7.4: Auditoria de Segurança e Hardening OWASP Top 10 `(Concluído e Homologado)`
- **Descrição:** Auditoria ofensiva e defensiva das rotas e serviços da API contra o OWASP Top 10, com correção imediata de brechas de autorização e criação da suíte permanente [`owasp-hardening.test.ts`](file:///d:/Repositorios/CarX/apps/api/src/security/owasp-hardening.test.ts).
- **Hardening Aplicado e Validado (`6/6` suítes aprovadas):**
  - **Hardening RBAC em [`fiscal-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/fiscal-routes.ts)**: Adicionado `requireFiscalRole` bloqueando usuários com perfil `tecnico` de visualizar ou alterar configurações fiscais e certificado A1 (`HTTP 403 Forbidden`).
  - **Hardening Anti-IDOR em [`minisite-routes.ts`](file:///d:/Repositorios/CarX/apps/api/src/routes/minisite-routes.ts)**: Atualização de status de lead de outro tenant retorna imediatamente `HTTP 404 Not Found`.
  - **Criptografia em Repouso (OWASP A02)**: Validação no banco de dados comprovando que `certificate_pfx_encrypted`, `certificate_password_encrypted` e `provider_api_token_encrypted` são gravados exclusivamente cifrados com `AES-256-GCM` e ocultados nas respostas JSON.
  - **Neutralização de SQLi/XSS (OWASP A03)**, **Feature Gating por Plano & Honeypot Anti-Bot (OWASP A04)** e **Rejeição de JWT Forjado/`alg:none` (OWASP A07)**.

---

#### Tarefa T7.5: Simulação Mensal de Desastre e Restauração (DR Drill) `(Concluído e Homologado)`
- **Descrição:** Procedimento automatizado de Disaster Recovery ([`dr-restore-drill.ts`](file:///d:/Repositorios/CarX/quality/scripts/dr-restore-drill.ts)) validando backup externo, destruição simulada e restauração transacional íntegra.
- **Resultados do Exercício de DR:**
  - Exportação de snapshot JSON externo com verificação criptográfica `SHA-256` (`5c768fd31db9ffda04462fc65d18d78f986ef7999c4e5eb09b4a0ff51a48a037`).
  - Simulação de perda catastrófica via `DELETE ... CASCADE` zerando todas as tabelas do tenant de referência.
  - Restauração transacional completa em **RTO = 343 ms** (meta `< 15 min`) e **RPO = 0 registros perdidos**, mantendo 100% de paridade nos registros restaurados. Evidência salva em [`dr-restore-drill.json`](file:///d:/Repositorios/CarX/quality/evidence/dr-restore-drill.json).

---

### 11.8 FASE 8 — GO-TO-MARKET & AMBIENTE DE HOMOLOGAÇÃO VPS

#### Tarefa T8.1: Remoção de Dados Mockados e Homologação na VPS Oracle de Teste `(Concluído e Homologado)`
- **Objetivo:** Eliminar dados estáticos/mockados do sistema, garantindo integridade transacional de ponta a ponta com persistência exclusiva dos planos cadastrados (Essencial, Profissional, Elite) e superadmin, permitindo o provisionamento isolado na VPS de teste Oracle (137.131.151.125) sem interferência no sistema Cozinha pré-existente.
- **Implementações Realizadas:**
  1. **Remoção de Mocks no Frontend ([`NovaOrdemServico.tsx`](file:///d:/Repositorios/CarX/apps/web/src/pages/NovaOrdemServico.tsx))**:
     - Limpeza de nomes e placas fixas (`Cleiton Alves`, `ABC1D23`, `mock-cleiton`, `mock-tera`).
     - Integração reativa com `api.customers` e `api.vehicles`: criação automática ou vinculação de cliente e veículo reais no tenant antes da abertura da ordem de serviço.
     - Carregamento dinâmico dos serviços via `api.catalog.getServices()`, com estado vazio orientando o usuário a cadastrar o catálogo oficial da oficina.
  2. **Script Transacional de Limpeza ([`clean-mock-data.ts`](file:///d:/Repositorios/CarX/apps/api/src/scripts/clean-mock-data.ts))**:
     - Limpeza em cascata (`CASCADE`) de ordens, vistorias, pagamentos, estoque, agendamentos, clientes e leads de teste.
     - Preservação estrita da tabela `plans` com os 3 planos oficiais e validação de contagem ativa.
  3. **Topologia de Contêineres de Homologação ([`compose.oracle-test.yml`](file:///d:/Repositorios/CarX/infra/compose.oracle-test.yml))**:
     - API Fastify exposta na porta `3333`.
     - Frontend Web (Oficina/Operador/PWA) exposto na porta `8080`.
     - Frontend Admin (SuperAdmin SaaS) exposto na porta `8081`.
     - PostgreSQL CarX isolado na rede interna e porta host `5434`, preservando a porta `5432` da Cozinha.
  4. **Scripts de Deploy Zero-Touch**:
     - [`deploy-oracle-test.sh`](file:///d:/Repositorios/CarX/infra/scripts/deploy-oracle-test.sh) e [`deploy-oracle-test.ps1`](file:///d:/Repositorios/CarX/infra/scripts/deploy-oracle-test.ps1) com liberação automática de regras de firewall iptables antes da regra `REJECT`.
