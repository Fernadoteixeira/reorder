# Arquitetura de cancelamento e retenção

Este documento descreve a arquitetura de tempo de execução atual da área `Cancellation & Retention` no plugin `Reorder`.

Ele se concentra no sistema implementado e não no plano original apenas de design.

## Meta

A área `Cancellation & Retention` fornece um fluxo de tratamento de rotatividade gerenciado pelo operador para assinaturas recorrentes.

A implementação atual suporta:
- rastreando `cancellation_case` e `retention_offer_event`
- iniciar e continuar um caso de cancelamento para assinaturas qualificadas
- aplicação de ofertas de pausa, desconto e retenção de bônus
- finalizar o cancelamento com os dados necessários do motivo da rotatividade
- Lista de administradores e visualizações detalhadas aninhadas em `Subscriptions`
- integração com `Subscriptions`, `Renewals` e `Dunning`
- fortalecimento operacional por meio de trilhas de auditoria, registros estruturados e métricas de resumo do agendador

## Visão Geral da Arquitetura

A implementação é dividida em cinco camadas principais:

1. módulo de domínio
2. fluxos de trabalho
3. API de administração
4. IU de administração
5. observabilidade e trabalho agendado

Cada camada tem uma responsabilidade clara:

- o módulo de domínio possui `cancellation_case` e `retention_offer_event`
- fluxos de trabalho de criação de caso próprio, aplicação de oferta, finalização de cancelamento e atualizações de motivo
- a API admin expõe rotas de leitura e mutação para operadores
- a IU do administrador renderiza as visualizações de detalhes da fila e do caso e chama os endpoints do administrador
- o trabalho do agendador calcula métricas operacionais e emite logs estruturados para alertar sobre picos de rotatividade

## 1. Módulo de Domínio

O módulo personalizado `cancellation` é o proprietário do tratamento de rotatividade e do estado do processo de retenção.

Ele contém:
- tipos de domínio
- o modelo de dados `cancellation_case`
- o modelo de dados `retention_offer_event`
- o serviço do módulo
- utilitários de modelo de leitura para lista e detalhes de administradores
- auxiliares de política de retenção, auditoria, erro, observabilidade e métricas operacionais

Principais opções de design:
- um `CancellationCase` está ancorado em um `subscription_id`
- uma assinatura pode ter muitos casos históricos, mas apenas um caso ativo por vez no MVP
- ações de retenção concretas são armazenadas separadamente como `RetentionOfferEvent` somente para acréscimos
- `Subscription` continua sendo a fonte do estado do ciclo de vida, enquanto `CancellationCase` continua sendo a fonte do estado do processo de cancelamento e retenção

## 2. Modelo de dados

O modelo `cancellation_case` armazena:
- campos agregados de identidade e propriedade
- status do processo
- motivo de rotatividade e categoria normalizada
- notas do operador
- resumo do resultado final
- resumo efetivo do cancelamento
- resumo de auditoria e metadados

Os campos principais `cancellation_case` incluem:
- `id`
- `subscription_id`
- `status`
- `reason`
- `reason_category`
- `notes`
- `final_outcome`
- `finalized_at`
- `finalized_by`
- `cancellation_effective_at`
- `metadata`

O modelo `retention_offer_event` armazena:
- `id`
- `cancellation_case_id`
- `offer_type`
- `offer_payload`
- `decision_status`
- `decision_reason`
- `decided_at`
- `decided_by`
- `applied_at`
- `metadata`

### Estratégia de indexação

As migrações atuais e a configuração do modelo otimizam `Cancellation & Retention` para:
- pesquisa por `subscription_id`
- filtragem por `status`
- filtragem por `final_outcome`
- filtragem por `reason_category`
- pedido por `created_at`
- oferece pesquisa de histórico por `cancellation_case_id`
- filtragem de ofertas por `offer_type`
- filtragem de ofertas por `decision_status`

## 3. Semântica de Integração e Propriedade

`Cancellation & Retention` está integrado com `Subscriptions`, `Renewals` e `Dunning` no tempo de execução atual.

A implementação atual segue estas regras:
- um caso de cancelamento pode ser aberto apenas para assinaturas em `active`, `paused` ou `past_due`
- `cancelled` assinaturas não podem abrir um novo caso de cancelamento
- aplicar um `pause_offer` move a assinatura para `paused`
- aplicar `discount_offer` ou `bonus_offer` mantém a assinatura ativa e fecha o caso como `retained`
- o cancelamento final move a assinatura para `cancelled`, define `cancel_effective_at` e limpa `next_renewal_at`
- ativo `DunningCase` pode coexistir com ativo `CancellationCase`
- `Renewals` permanece proprietário de `RenewalCycle`, enquanto o cancelamento afeta a elegibilidade para renovação através do estado do ciclo de vida da assinatura

Isso significa:
- `CancellationCase` possui o estado do processo de rotatividade
- `RetentionOfferEvent` possui histórico de ofertas
- `Subscription` possui materialização do ciclo de vida
- `Renewals` histórico de execução do próprio ciclo
- `Dunning` possui estado de recuperação de pagamento

## 4. Limite do link do módulo

A implementação atual define um link primário entre módulos:

- `cancellationCase <-> subscription`

Arquivo de implementação:
- `src/links/cancellation-subscription.ts`

O tempo de execução também persiste `subscription_id` diretamente em `CancellationCase`.

Por que ambos existem:
- `subscription_id` suporta indexação, filtragem e verificações invariantes
- o link do módulo suporta leituras vinculadas no estilo Medusa sem transferir a propriedade do módulo de cancelamento

O tempo de execução atual não define links diretos de `CancellationCase` para:
- `renewal_cycle`
- `dunning_case`

Esses resumos são resolvidos pelo enriquecimento em tempo de consulta de `subscription_id`.

## 5. Leia o caminho

O caminho de leitura é otimizado para a fila de cancelamento do administrador e detalhes do caso.

Componentes principais:
- manipuladores de rota administrativa em `src/api/admin/cancellations`
- auxiliares de normalização e mapeamento DTO em `src/api/admin/cancellations/utils.ts`
- ajudantes de consulta em `src/modules/cancellation/utils/admin-query.ts`

### Fluxo da fila

Para a visualização da fila:
1. a UI Admin envia parâmetros de consulta para `GET /admin/cancellations`
2. A rota valida e normaliza a entrada da consulta
3. `listAdminCancellationCases(...)` aplica filtros, classificação, paginação e enriquecimento de resumo vinculado
4. a camada de consulta lê `cancellation_case`
5. A filtragem opcional do tipo de oferta é resolvida por meio de `retention_offer_event`
6. a resposta é mapeada para Admin DTOs usados pelo DataTable

A fila atual suporta:
- paginação
- pesquisar
- filtragem
- classificação
- resumo `subscription` vinculado
- filtragem `offer_type` opcional através do histórico de ofertas

### Fluxo detalhado

Para a visualização detalhada:
1. a IU do administrador solicita `GET /admin/cancellations/:id`
2. A rota resolve o caso por meio do auxiliar de consulta detalhada
3. O resumo da assinatura vinculada foi resolvido
4. Os resumos opcionais de cobrança e renovação são resolvidos a partir de `subscription_id`
5. O histórico completo da oferta é mapeado no DTO detalhado

A carga detalhada representa:
- o agregado do caso
- resumo de assinatura vinculado
- resumo de cobrança vinculado
- resumo de renovação vinculado
- oferecer histórico
- metadados

### Nota de limite de consulta

No tempo de execução atual, `Cancellation & Retention` Admin lê usando `CancellationCase` como a raiz da consulta de origem.

Isso significa:
- `CancellationCase` continua sendo a raiz da consulta da fonte da verdade
- `RetentionOfferEvent` permanece o histórico filho do mesmo módulo
- `subscription` é o principal enriquecimento vinculado
- Os resumos `dunning` e `renewal` são apenas no contexto do tempo de consulta

## 6. Escrever caminho

Todas as operações de cancelamento que alteram o estado são roteadas por meio de fluxos de trabalho.

Mutações implementadas:
- iniciar caso de cancelamento
- aplicar oferta de retenção
- finalizar o cancelamento
- atualizar o motivo do cancelamento

Padrão de caminho de gravação:
1. a rota Admin envia entrada de fluxo de trabalho
2. o fluxo de trabalho valida o caso atual e o estado da assinatura
3. o fluxo de trabalho aplica lógica de oferta ou finalização
4. a rota retorna a carga atualizada de detalhes de cancelamento para mutações de administrador

Isso mantém a lógica de negócios fora das rotas e centraliza as regras de mutação nos fluxos de trabalho.

## 7. Fluxos de trabalho

A camada de mutação atual é construída em torno de:
- `start-cancellation-case`
- `apply-retention-offer`
- `finalize-cancellation`
- `update-cancellation-reason`

### Iniciar fluxo de trabalho

`start-cancellation-case` é o fluxo de trabalho de entrada para tratamento de rotatividade gerenciado pelo operador.

É responsável por:
- validar se a assinatura é elegível para um caso
- impor a invariante de caso ativo único por assinatura
- criar um novo caso ou atualizar o ativo
- armazenar motivo inicial, categoria, notas e contexto de entrada

### Oferecer fluxo de trabalho

`apply-retention-offer` é o fluxo de trabalho de materialização para ações de retenção.

É responsável por:
- validar que o caso está ativo
- validar a carga útil e a política da oferta
- criando `RetentionOfferEvent`
- aplicando `pause_offer`, `discount_offer` ou `bonus_offer`
- atualizar o ciclo de vida da assinatura ou o efeito dos metadados conforme necessário
- fechando o caso como `paused` ou `retained`

### Finalizar fluxo de trabalho

`finalize-cancellation` é a mutação de cancelamento final.

É responsável por:
- validar que o caso está ativo
- exigindo um motivo de rotatividade
- computação `cancel_effective_at`
- atualizando a assinatura para `cancelled`
- limpando `next_renewal_at`
- chamando `ensure-next-renewal-cycle`
- fechando o caso como `canceled`

### Fluxo de trabalho do motivo

`update-cancellation-reason` é a mutação manual de metadados e classificação.

É responsável por:
- atualizando `reason`
- atualizando `reason_category`
- atualizando `notes`
- registrar quem alterou a classificação de rotatividade e por quê

## 8. Arquitetura da API de administração

A API Admin expõe rotas personalizadas dedicadas às páginas `Cancellation & Retention`.

Rotas de leitura implementadas:
- `GET /admin/cancellations`
- `GET /admin/cancellations/:id`

Rotas de mutação implementadas:
- `POST /admin/cancellations/:id/apply-offer`
- `POST /admin/cancellations/:id/finalize`
- `POST /admin/cancellations/:id/reason`

A camada API usa:
- Validadores Zod
- solicitações de administrador autenticadas
- ajudantes de consulta para leituras
- fluxos de trabalho para gravações
- mapeamento de erros com reconhecimento de domínio

## 9. Arquitetura da UI do administrador

A UI Admin é implementada como rotas Medusa Admin personalizadas aninhadas em `Subscriptions`.

Telas atuais:
- página da fila de cancelamento
- página de detalhes do cancelamento

### Página da fila

A página da fila é construída com Medusa `DataTable`.

Suporta:
- paginação
- pesquisar
- filtros
- classificação
- navegação de linha para detalhes

Os filtros incluem:
- `reason_category`
- `final_outcome`
- `offer_type`
- intervalo de datas criado

A fila usa o mesmo padrão de barra de ferramentas de filtro que `Renewals`:
- `Add filter`
- `Clear all`
- entradas de data dedicadas não renderizadas como chips

### Página de detalhes

A página de detalhes contém:
- visão geral do caso
- resumo da assinatura
- resumo de cobrança
- resumo de renovação
- cronograma de decisão
- oferecer histórico
- metadados
- menu de ação e gavetas para ações manuais

Ele fornece três fluxos de edição baseados em gaveta:
- aplicar oferta
- motivo da atualização
- finalizar o cancelamento

Ele também fornece avisos de confirmação para ações arriscadas:
- aplicar oferta
- oferta de pausa
- finalizar o cancelamento

## 10. Carregamento de dados e invalidação de consulta

A UI Admin segue o padrão de consulta de exibição Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada na montagem
- a consulta de exibição de detalhes é carregada na montagem
- gavetas de ação usam seu próprio formulário de consulta
- mutações bem-sucedidas invalidam fila, detalhes e chaves de consulta de formulário
- as consultas de exibição não dependem da gaveta ou do estado modal da UI

Detalhe de implementação:
- o carregamento de dados reside em `src/admin/routes/subscriptions/cancellations/data-loading.ts`
- a invalidação compartilhada atualiza fila, detalhes, formulário de ação e chaves analíticas preparadas

## 11. Auditoria e fortalecimento operacional

A implementação atual registra a auditoria operacional de duas maneiras:

- campos explícitos como `finalized_by`, `decided_by` e campos de atores específicos do fluxo de trabalho
- entradas de metadados `manual_actions` somente anexadas com `who / when / why / data`

Isso dá:
- rastreabilidade do operador para ações arriscadas
- resumo de auditoria em nível de caso
- histórico de mutação estruturado sem criar um agregado de auditoria separado

## 12. Observabilidade e métricas programadas

`Cancellation & Retention` inclui seus próprios auxiliares de observabilidade e trabalho de agendador.

Arquivos de tempo de execução:
- `src/modules/cancellation/utils/observability.ts`
- `src/modules/cancellation/utils/operational-metrics.ts`
- `src/jobs/process-cancellation-operational-metrics.ts`

O trabalho agendado:
- funciona a cada hora
- calcula métricas operacionais para a janela de tempo recente
- registra métricas de resumo estruturadas
- marca picos de rotatividade por `reason_category` como `alertable`

As métricas operacionais monitoradas atuais incluem:
- `case_count`
- `terminal_case_count`
- `canceled_count`
- `retained_count`
- `pause_count`
- `churn_rate`
- `offer_acceptance_rate`
- `top_reason_categories`

Atualmente, isso é implementado como registro estruturado, em vez de integração de monitoramento externo.

## 13. Estratégia de teste

A área é atualmente coberta por:
- testes de integração de fluxo de trabalho
- testes de integração HTTP administrativos
- testes de integração de fluxo administrativo baseados em cenários
- testes de integração de fumaça entre módulos

Nota importante:
- não há camada E2E do navegador no plugin atual
- os principais fluxos de operadores ponta a ponta são verificados através de testes de integração apoiados pela Medusa

## 14. Limites de responsabilidade

`Cancellation & Retention` atualmente possui:
- estado do caso de cancelamento
- estado de recomendação de retenção
- histórico de ofertas de retenção
- classificação do motivo da rotatividade
- fluxos de trabalho de cancelamento e retenção voltados para o operador
- métricas operacionais para tratamento de rotatividade

Não possui:
- ciclo de vida da assinatura como a principal fonte de verdade
- histórico de execução do ciclo de renovação
- nova tentativa de cobrança e estado de recuperação de dívidas
- configuração global da política de oferta de plano

O módulo se coordena com esses domínios por meio de:
- efeitos de mutação orientados pelo fluxo de trabalho
- leituras vinculadas e enriquecidas por consulta
- limites de propriedade explícitos em vez de estado agregado partilhado
