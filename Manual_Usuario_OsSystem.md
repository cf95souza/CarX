# 📖 Manual do Usuário: OsSystem

Bem-vindo ao **Manual do Usuário do OsSystem**, o seu guia completo para utilizar todas as funcionalidades do nosso PWA White Label premium voltado para estética automotiva. Este documento foi elaborado para orientar os diferentes perfis de acesso: **Gestor/Administrador**, **Técnico/Operador** e **Cliente**.

---

## 👨‍💼 1. Módulo do Gestor e Administrador

Como gestor, você tem acesso total ao painel de controle, relatórios financeiros e gestão da operação.

### 1.1 Dashboard Executivo e TV 360°
- **Dashboard Principal:** Logo ao acessar, visualize KPIs importantes como faturamento bruto, ticket médio e taxa de conversão.
- **Modo Dark Nativo:** Para ambientes de baixa iluminação, ative o Modo Escuro no botão superior (Sol/Lua).
- **Visão 360° (Dashboard TV):** Acesse a área de relatórios e ative a Visão 360° para projetar em uma tela grande na loja. Você acompanhará em tempo real o andamento de todos os boxes de produção, o termômetro NPS e alertas de estoque.

### 1.2 Gestão de Clientes e Veículos
- **Cadastro de Clientes:** Vá em "Clientes" para adicionar ou gerenciar cadastros. Você pode enviar o link do Portal do Cliente diretamente por WhatsApp nesta tela.
- **Frota e Veículos:** Vincule múltiplos veículos a um mesmo cliente. É possível definir a classe/porte do veículo (Hatch, Sedan, SUV, etc.), o que automatiza a precificação dinâmica na hora do orçamento.

### 1.3 Vendas e Orçamentos
- **Criar Novo Orçamento:** Clique em "Novo Orçamento". Selecione o cliente e o veículo.
- **Precificação Inteligente:** O sistema sugere o preço dinâmico com base no porte do veículo escolhido.
- **Combos e Pacotes:** Selecione combos promocionais (ex: Vitrificação + PPF) e veja o cálculo instantâneo da economia oferecida ao cliente. O sistema importa automaticamente os insumos necessários para o estoque.
- **Aprovação:** Após criar o orçamento, ele pode ser enviado ao cliente. Quando aprovado (com ou sem sinal), ele se transforma em uma Ordem de Serviço.

### 1.4 Ordens de Serviço (OS) e Fila Geral
- **Acompanhamento de OS:** Na listagem de Ordens de Serviço, veja tudo o que está em andamento.
- **Atribuição:** Você pode atribuir uma OS para um técnico específico ou deixar na "Fila Geral" da loja.
- **QR Code de Recepção:** Ao receber o veículo, gere e imprima a etiqueta com o QR Code dinâmico para o cliente acompanhar o status do serviço.
- **Vistoria QA (Quality Assurance):** Antes de entregar o veículo, realize a vistoria de QA, pontuando acabamento e conformidade, garantindo a nota do técnico no ranking.

### 1.5 Estoque e Almoxarifado
- **Controle de Insumos:** Acesse "Materiais/Estoque". O consumo de produtos das OS finalizadas é debitado automaticamente.
- **Alertas:** Se um item atingir a quantidade mínima, o sistema emitirá um alerta visual vermelho e uma notificação push para a gerência repor o estoque.

### 1.6 Gestão de Equipe e Gamificação
- **Controle de Acessos:** Vá em "Colaboradores" para criar novos usuários, definindo níveis (Operador, Gestor, ADM). Se um técnico perder a senha, redefina-a com um clique via WhatsApp.
- **Ranking e Comissões:** Acompanhe o pódio de técnicos, notas de QA e pontuação NPS. Gere o extrato financeiro das comissões consolidadas para pagamento no fim do mês.

### 1.7 Relatórios (NPS, DRE e Garantias)
- **DRE (Fluxo de Caixa):** Acompanhe lucros operacionais deduzindo custos de insumos e taxas fixas.
- **NPS (Retenção):** Monitore as avaliações dos clientes e tome ações rápidas caso surja um detrator.
- **Garantia e Revisões:** O sistema avisa quando um serviço (como PPF ou vitrificação) precisa de revisão, permitindo enviar mensagens automáticas de retorno ao cliente pelo WhatsApp.

### 1.8 Configurações, APIs e Webhooks
- **Marketplace e Integrações:** Configure a integração da sua loja com ERPs (via Webhooks), exporte calendários para Google/Apple Calendar e importe novos catálogos de serviços do Marketplace de parceiros.

---

## 🔧 2. Módulo do Técnico e Operador

A interface do Técnico foi otimizada para ser fluida e evitar distrações, funcionando perfeitamente em tablets e smartphones.

### 2.1 Fila Operacional (Operador Home)
- **Seus Serviços:** Ao logar, a tela inicial exibirá a Fila de Serviços atribuídos a você por ordem cronológica de entrega.
- **Crachás de Status:** Veja rapidamente o selo verde `CHECKLIST OK` ou o alerta vermelho `SEM CHECKLIST`.
- **Notificações Push:** Habilite o "sininho" no cabeçalho para receber um alerta sonoro instantâneo no celular quando uma nova OS for designada a você.

### 2.2 Inspeção Digital e VCR (Checklist de Recepção)
- **Registro de Avarias:** Use a representação visual (carro/moto) para mapear arranhões, amassados e problemas na pintura. Clique sobre o dano e especifique o tipo.
- **Fotografia 360°:** O sistema guiará a captura de fotos nos 5 ângulos (Frontal, Lateral, Traseira, Detalhes). Tire fotos de *Antes, Durante e Depois* para montar a galeria do cliente e resguardar a loja de possíveis reclamações.
- **Assinatura e Laudo:** Solicite a assinatura digital (lousa gráfica) do responsável/cliente, que bloqueará o checklist contra modificações futuras.

### 2.3 Execução do Serviço
- **Auto-Início:** Quando o checklist estiver preenchido e você abrir os detalhes, a OS automaticamente passa para `EM EXECUÇÃO` e inicia seu cronômetro de tempo.
- **Acompanhamento:** Acompanhe a lista do que deve ser feito. Após finalizar o trabalho físico e adicionar as fotos do *Depois*, avance o status para `CONCLUÍDO`. O gestor fará a checagem QA antes de entregar.
- **Modo Offline:** Sendo um PWA, mesmo com instabilidades na rede WiFi da oficina, você consegue interagir e, ao retomar conexão, os dados (como status e fotos) serão sincronizados automaticamente.

---

## 📱 3. Módulo do Cliente Final

Seu cliente interage com a loja sem atritos, sem precisar instalar aplicativos.

### 3.1 Portal de Auto-Agendamento (Self-Booking)
- O cliente clica no link (via Instagram ou WhatsApp), seleciona a classe de seu veículo, escolhe os serviços/combos, checa o calendário inteligente da loja (que oculta dias sem vagas) e confirma o pré-agendamento, caindo na sua fila de avaliação gerencial.

### 3.2 Portal VIP "Meu Veículo"
- **Acompanhamento:** O cliente entra no link enviado pelo seu WhatsApp e pode acompanhar a OS em andamento, vendo as fotos da execução da própria residência.
- **Linha do Tempo e Garantias:** Com o acesso seguro (OTP ou placa), ele tem o histórico de todos os serviços realizados, orçamentos, fotos antigas e emissão imediata em PDF dos **Certificados de Garantia** dos serviços.
- **Sincronização de Calendário:** Em 1 clique, o cliente pode adicionar na própria agenda do Google/Apple as datas das revisões preventivas programadas.

### 3.3 Pesquisa de Satisfação (NPS)
- Finalizado o serviço, o sistema envia ao cliente um link para avaliação com carinhas de reação. É super rápido e não exige senha. Caso a nota seja excelente, ele será incentivado a compartilhar; se for ruim (detrator), um alerta chegará direto para a gerência da loja atuar instantaneamente.

---
*Manual elaborado de acordo com as funcionalidades completas descritas na Fase 63 do OsSystem.*
