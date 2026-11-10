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

#### Tarefa T3.15: Frontend — Camada de Dados TanStack Query e Design System CarX (Tela 1/10) 🖥️
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















