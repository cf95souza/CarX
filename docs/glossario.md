# 📖 Glossário de Termos e Regras de Negócio — CarX

Este glossário unifica os conceitos de negócio, técnicos e operacionais utilizados em todo o ecossistema **CarX**.

---

## 🚗 Conceitos do Domínio Automotivo

### 1. Ordem de Serviço (OS)
O documento digital central que acompanha todo o ciclo de vida do serviço prestado a um veículo dentro da oficina. 
- Cada oficina possui numeração sequencial própria (`os_number` 1, 2, 3...).
- Opera como uma **máquina de estados estrita**:
  - `QUOTE`: Orçamento inicial em elaboração ou aguardando aprovação do cliente.
  - `APPROVED`: Proposta aceita pelo cliente (com ou sem sinal de adiantamento).
  - `SCHEDULED`: Serviço agendado com alocação de data, box físico e técnico.
  - `CHECKED_IN`: Veículo entregue na oficina e laudo de entrada (VCR) preenchido.
  - `IN_PROGRESS`: Execução técnica em andamento pelo profissional com cronômetro ativo.
  - `QA`: Vistoria de controle de qualidade realizada pelo gestor.
  - `READY`: Veículo pronto para retirada pelo cliente.
  - `DELIVERED`: Veículo faturado e entregue ao proprietário.
  - `PAUSED`: Serviço temporariamente paralisado (aguardando peças, autorização ou cura de produto).
  - `CANCELED`: Ordem de serviço cancelada com motivo auditado.

---

### 2. Orçamento (Quote)
Proposta comercial detalhada com estimativa de tempo e valores, agrupando serviços e materiais sugeridos para aprovação presencial ou online via link seguro com token criptográfico.

---

### 3. Porte do Veículo (Classe de Precificação)
Segmentação dimensional e de complexidade do veículo que dita a tabela dinâmica de preços de mão de obra e consumo de insumos:
- **Hatch**: Veículos compactos de 2 volumes (ex: Polo, Onix, HB20).
- **Sedan**: Veículos médios/grandes de 3 volumes (ex: Corolla, Civic, Virtus).
- **SUV**: Veículos utilitários esportivos (ex: Compass, T-Cross, Tracker).
- **Pickup**: Caminhonetes e utilitários de caçamba (ex: Hilux, Ranger, Toro).
- **Esportivo**: Veículos com linhas e painéis complexos de alto valor agregado (ex: Porsche 911, Mustang).
- **Moto**: Motocicletas de baixa, média ou alta cilindrada.

---

### 4. Bobina de Película (PPF e Insulfilm)
Unidade de controle de estoque de alto custo para rolos de película de proteção de pintura (*Paint Protection Film*) e controle solar (*Insulfilm*):
- Controlada por número de lote, metragem linear original e metragem restante.
- A cada OS de aplicação concluída, o consumo em metros é baixado de forma idempotente, gerando alerta de nível crítico antes da exaustão do estoque.

---

### 5. VCR (Vehicle Condition Report / Laudo de Inspeção)
Vistoria visual digital obrigatória realizada na entrada e na saída do veículo:
- Mapeamento touch de avarias (*scratch*, *dent*, *crack*, *burnt_paint*, *stain*) sobre diagramas interativos do carro ou moto.
- Galeria guiada de fotos por ângulos corporativos padronizados (Frontal, Lateral Esquerda, Lateral Direita, Traseira e Detalhe).
- Assinatura digital do cliente na lousa gráfica para blindagem jurídica contra reclamações infundadas.

---

### 6. QA (Quality Assurance / Controle de Qualidade)
Gate de validação técnica pós-execução inspecionado pelo gestor antes da liberação do veículo para o cliente:
- Avaliação de conformidade: limpeza, cantos e bordas de película, acabamento sem bolhas e montagem de componentes.
- Atribuição de nota de excelência (1 a 5 estrelas) ao técnico responsável.

---

### 7. Streak de Produtividade (Dias Sem Retrabalho)
Métrica de gamificação e excelência técnica que computa a quantidade de dias consecutivos em que os serviços finalizados por um colaborador foram aprovados no QA sem devolução para retrabalho.

---

### 8. Passaporte Digital do Veículo (Certificado de Garantia)
Página pública e segura acessada via QR Code único impresso ou digital (`/v/:token`):
- Exibe o histórico de serviços realizados, lote dos materiais aplicados (vitrificador/PPF) e prazo de validade da garantia.
- Não expõe dados sensíveis (LGPD) e pode ser transferido para o novo proprietário em caso de venda do carro.

