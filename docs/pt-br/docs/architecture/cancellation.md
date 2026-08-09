# Arquitetura de cancelamento e retenção

Este documento descreve a arquitetura de tempo de execução atual da área `Cancellation & Retention` no plug-in `Reorder`.

Ele se concentra no sistema implementado, e não apenas no projeto original.

## Objetivo

A área `Cancellation & Retention` oferece um fluxo de gerenciamento de cancelamentos, administrado pela operadora, para assinaturas recorrentes.

A implementação atual oferece suporte a:
- rastreamento de `cancellation_case` e `retention_offer_event`
- início e continuidade de um processo de cancelamento para assinaturas elegíveis
- aplicação de ofertas de pausa, desconto e retenção por bônus
- finalização do cancelamento com os dados obrigatórios sobre o motivo da baixa
- visualizações de lista e detalhes do administrador aninhadas em `Subscriptions`
- integração com `Subscriptions`, `Renewals` e `Dunning`
- fortalecimento operacional por meio de trilhas de auditoria, logs estruturados e métricas de resumo do agendador

## Visão geral da arquitetura

A implementação está dividida em cinco camadas principais:

1. módulo de domínio
2. fluxos de trabalho
3. API de administração
4. interface de usuário de administração
5. observabilidade e tarefas agendadas

Cada camada tem uma responsabilidade bem definida:

- o módulo de domínio é responsável por `cancellation_case` e `retention_offer_event`
- os fluxos de trabalho são responsáveis pela criação de casos, solicitação de ofertas, finalização de cancelamentos e atualizações de motivos
- a API de administração expõe rotas de leitura e modificação para os operadores
- a interface de usuário de administração exibe as visualizações da fila e dos detalhes dos casos e chama os endpoints de administração
- a tarefa do agendador calcula métricas operacionais e gera logs estruturados para picos de rotatividade que podem acionar alertas

## 1. Módulo de domínio

O módulo personalizado `cancellation` é responsável pelo gerenciamento de cancelamentos e pelo estado do processo de retenção.

Ele contém:
- tipos de domínio
- o modelo de dados `cancellation_case`
- o modelo de dados `retention_offer_event`
- o serviço do módulo
- utilitários de leitura do modelo para a lista e os detalhes do Admin
- auxiliares de política de retenção, auditoria, erros, observabilidade e métricas operacionais

Principais escolhas de projeto:
- um `CancellationCase` está vinculado a um `subscription_id`
- uma assinatura pode ter vários casos históricos, mas apenas um caso ativo por vez no MVP
- as ações concretas de retenção são armazenadas separadamente como `RetentionOfferEvent` de apenas acréscimo
- o `Subscription` continua sendo a fonte do estado do ciclo de vida, enquanto o `CancellationCase` continua sendo a fonte do estado do processo de cancelamento e retenção

## 2. Modelo de dados

O modelo `cancellation_case` armazena:
- campos de identidade e propriedade agregados
- status do processo
- motivo da baixa e categoria normalizada
- notas do operador
- resumo do resultado final
- resumo da data de vigência do cancelamento
- resumo da auditoria e metadados

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
- consulta por `subscription_id`
- filtragem por `status`
- filtragem por `final_outcome`
- filtragem por `reason_category`
- ordenação por `created_at`
- consulta do histórico de ofertas por `cancellation_case_id`
- filtragem de ofertas por `offer_type`
- filtragem de ofertas por `decision_status`

## 3. Semântica da integração e da propriedade

O `Cancellation & Retention` está integrado ao `Subscriptions`, ao `Renewals` e ao `Dunning` no ambiente de execução atual.

A implementação atual segue estas regras:
- um caso de cancelamento só pode ser aberto para assinaturas em `active`, `paused` ou `past_due`
- as assinaturas em `cancelled` não podem abrir um novo caso de cancelamento
- a aplicação de um `pause_offer` transfere a assinatura para `paused`
- a aplicação de um `discount_offer` ou `bonus_offer` mantém a assinatura ativa e encerra o caso como `retained`
- o cancelamento definitivo transfere a assinatura para `cancelled`, define `cancel_effective_at` e desmarca `next_renewal_at`
- um `DunningCase` ativo pode coexistir com um `CancellationCase` ativo
- `Renewals` continua sendo o titular de `RenewalCycle`, enquanto o cancelamento afeta a elegibilidade para renovação por meio do estado do ciclo de vida da assinatura

Isso significa que:
- `CancellationCase` é responsável pelo estado do processo de cancelamento de assinaturas
- `RetentionOfferEvent` é responsável pelo histórico de ofertas
- `Subscription` é responsável pela materialização do ciclo de vida
- `Renewals` é responsável pelo histórico de execução do ciclo
- `Dunning` é responsável pelo estado de recuperação de pagamentos

## 4. Limite do link do módulo

A implementação atual define um link principal entre módulos:

- `cancellationCase <-> subscription`

Arquivo de implementação:
- `src/links/cancellation-subscription.ts`

O ambiente de execução também armazena `subscription_id` diretamente em `CancellationCase`.

Por que ambos existem:
- `subscription_id` oferece suporte à indexação, filtragem e verificações de invariantes
- o link do módulo oferece suporte a leituras encadeadas no estilo Medusa sem transferir a propriedade para fora do módulo de cancelamento

O tempo de execução atual não define ligações diretas de `CancellationCase` para:
- `renewal_cycle`
- `dunning_case`

Esses resumos são resolvidos por meio do enriquecimento no momento da consulta a partir de `subscription_id`.

## 5. Caminho de leitura

O caminho de leitura está otimizado para a fila de cancelamentos do Admin e os detalhes do caso.

Principais componentes:
- manipuladores de rotas de administração em `src/api/admin/cancellations`
- auxiliares de normalização e mapeamento de DTOs em `src/api/admin/cancellations/utils.ts`
- auxiliares de consulta em `src/modules/cancellation/utils/admin-query.ts`

### Fluxo da fila

Para a visualização da fila:
1. a interface de usuário de administração envia parâmetros de consulta para `GET /admin/cancellations`
2. a rota valida e normaliza a entrada da consulta
3. `listAdminCancellationCases(...)` aplica filtros, ordenação, paginação e enriquecimento do resumo vinculado
4. a camada de consulta lê `cancellation_case`
5. a filtragem opcional por tipo de oferta é resolvida por meio de `retention_offer_event`
6. a resposta é mapeada para os DTOs de administração usados pela DataTable

A fila atual oferece os seguintes recursos:
- paginação
- pesquisa
- filtragem
- ordenação
- resumo vinculado a `subscription`
- filtragem opcional por meio do histórico de ofertas `offer_type`

### Fluxo de detalhes

Para a visualização detalhada:
1. a interface de usuário administrativa solicita `GET /admin/cancellations/:id`
2. a rota resolve o caso por meio do auxiliar de consulta de detalhes
3. o resumo da assinatura vinculada é resolvido
4. os resumos opcionais de cobrança e renovação são resolvidos a partir de `subscription_id`
5. o histórico completo da oferta é mapeado para o DTO de detalhes

A carga útil detalhada representa:
- o agregado do caso
- o resumo das assinaturas vinculadas
- o resumo das cobranças vinculadas
- o resumo das renovações vinculadas
- o histórico de ofertas
- os metadados

### Observação sobre os limites da consulta

No ambiente de execução atual, as leituras do `Cancellation & Retention` Admin utilizam o `CancellationCase` como raiz da consulta de origem.

Isso significa que:
- `CancellationCase` continua sendo a raiz da consulta, que é a fonte de verdade
- `RetentionOfferEvent` continua sendo o histórico de filhos do mesmo módulo
- `subscription` é o principal enriquecimento vinculado
- Os resumos de `dunning` e `renewal` são apenas contexto no momento da consulta

## 6. Caminho de gravação

Todas as operações de cancelamento que alteram o estado são encaminhadas por meio de fluxos de trabalho.

Alterações implementadas:
- iniciar o processo de cancelamento
- aplicar a oferta de retenção
- finalizar o cancelamento
- atualizar o motivo do cancelamento

Padrão da rota de gravação:
1. A rota “Admin” envia os dados de entrada do fluxo de trabalho
2. O fluxo de trabalho valida o caso atual e o estado da assinatura
3. O fluxo de trabalho aplica a lógica de oferta ou finalização
4. A rota retorna a carga útil atualizada com os detalhes do cancelamento para as mutações do “Admin”

Isso mantém a lógica de negócios fora das rotas e centraliza as regras de mutação nos fluxos de trabalho.

## 7. Fluxos de trabalho

A camada de mutação atual é construída em torno de:
- `start-cancellation-case`
- `apply-retention-offer`
- `finalize-cancellation`
- `update-cancellation-reason`

### Iniciar o fluxo de trabalho

`start-cancellation-case` é o fluxo de trabalho de entrada para o gerenciamento de cancelamentos administrado pelo operador.

É responsável por:
- verificar se a assinatura é elegível para um caso
- garantir a invariante de “um único caso ativo por assinatura”
- criar um novo caso ou atualizar o caso ativo
- armazenar o motivo inicial, a categoria, as notas e o contexto da entrada

### Fluxo de trabalho de ofertas

`apply-retention-offer` é o fluxo de trabalho de materialização para ações de retenção.

É responsável por:
- verificar se o caso está ativo
- validar o conteúdo da oferta e a política
- criar `RetentionOfferEvent`
- aplicar `pause_offer`, `discount_offer` ou `bonus_offer`
- atualizar o ciclo de vida da assinatura ou o efeito dos metadados, conforme necessário
- encerrar o caso como `paused` ou `retained`

### Finalizar o fluxo de trabalho

`finalize-cancellation` é a mutação de cancelamento final.

É responsável por:
- verificar se o caso está ativo
- solicitar um motivo para a cancelamento
- calcular `cancel_effective_at`
- atualizar a assinatura para `cancelled`
- zerar `next_renewal_at`
- chamar `ensure-next-renewal-cycle`
- encerrar o caso como `canceled`

### Fluxo de trabalho do Reason

`update-cancellation-reason` é a alteração manual dos metadados e da classificação.

É responsável por:
- atualizar `reason`
- atualizar `reason_category`
- atualizar `notes`
- registrar quem alterou a classificação de cancelamento e por quê

## 8. Arquitetura da API de administração

A API de administração disponibiliza rotas personalizadas dedicadas às páginas `Cancellation & Retention`.

Rotas de leitura implementadas:
- `GET /admin/cancellations`
- `GET /admin/cancellations/:id`

Rotas de mutação implementadas:
- `POST /admin/cancellations/:id/apply-offer`
- `POST /admin/cancellations/:id/finalize`
- `POST /admin/cancellations/:id/reason`

A camada de API utiliza:
- validadores Zod
- solicitações administrativas autenticadas
- auxiliares de consulta para leituras
- fluxos de trabalho para gravações
- mapeamento de erros com reconhecimento de domínio

## 9. Arquitetura da interface de usuário administrativa

A interface de usuário administrativa está implementada como rotas personalizadas do Medusa Admin aninhadas sob `Subscriptions`.

Telas atuais:
- página da fila de cancelamentos
- página de detalhes do cancelamento

### Página da fila

A página da fila foi criada com o Medusa `DataTable`.

Oferece suporte a:
- paginação
- pesquisa
- filtros
- ordenação
- navegação por linhas para detalhes

Os filtros incluem:
- `reason_category`
- `final_outcome`
- `offer_type`
- intervalo de datas de criação

A fila utiliza o mesmo padrão de barra de ferramentas com filtro que `Renewals`:
- `Add filter`
- `Clear all`
- campos de data dedicados que não são exibidos como marcadores

### Página de detalhes

A página de detalhes contém:
- visão geral do caso
- resumo da assinatura
- resumo de cobranças
- resumo de renovações
- cronograma de decisões
- histórico de ofertas
- metadados
- menu de ações e abas para ações manuais

Ele oferece três fluxos de edição com suporte do Drawer:
- aplicar oferta
- atualizar motivo
- finalizar cancelamento

Além disso, exibe avisos de confirmação para ações que envolvem risco:
- aplicar a oferta
- pausar a oferta
- finalizar o cancelamento

## 10. Carregamento de dados e invalidação de consultas

A interface de usuário administrativa segue o padrão de exibição e consulta Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada no momento da montagem
- a consulta de exibição de detalhes é carregada no momento da montagem
- as gavetas de ação utilizam sua própria consulta de formulário
- as mutações bem-sucedidas invalidam as chaves das consultas de fila, detalhes e formulário
- as consultas de exibição não dependem do estado da interface do usuário da gaveta ou do modal

Detalhes da implementação:
- o carregamento de dados ocorre em `src/admin/routes/subscriptions/cancellations/data-loading.ts`
- a invalidação compartilhada atualiza as chaves “queue”, “detail”, “action-form” e “prepared analytics”

## 11. Auditoria e Fortalecimento Operacional

A implementação atual registra a auditoria operacional de duas maneiras:

- campos explícitos, como `finalized_by`, `decided_by` e campos de atores específicos do fluxo de trabalho
- entradas de metadados `manual_actions` do tipo “somente adição” com `who / when / why / data`

Isso proporciona:
- rastreabilidade do operador para ações de risco
- resumo de auditoria por caso
- histórico estruturado de alterações, sem a necessidade de criar um agregado de auditoria separado

## 12. Observabilidade e métricas programadas

O `Cancellation & Retention` inclui seus próprios auxiliares de observabilidade e uma tarefa no agendador.

Arquivos de tempo de execução:
- `src/modules/cancellation/utils/observability.ts`
- `src/modules/cancellation/utils/operational-metrics.ts`
- `src/jobs/process-cancellation-operational-metrics.ts`

A tarefa agendada:
- é executada a cada hora
- calcula métricas operacionais para a janela de tempo mais recente
- registra métricas resumidas de forma estruturada
- marca picos de rotatividade por `reason_category` como `alertable`

As métricas operacionais monitoradas atualmente incluem:
- `case_count`
- `terminal_case_count`
- `canceled_count`
- `retained_count`
- `pause_count`
- `churn_rate`
- `offer_acceptance_rate`
- `top_reason_categories`

Atualmente, isso está implementado como registro estruturado, em vez de integração com sistemas de monitoramento externos.

## 13. Estratégia de testes

Atualmente, essa área é abrangida por:
- testes de integração de fluxos de trabalho
- testes de integração HTTP de administração
- testes de integração de fluxos de administração baseados em cenários
- testes de integração de verificação básica entre módulos

Observação importante:
- não há camada E2E do navegador no plug-in atual
- os principais fluxos de operações de ponta a ponta são verificados por meio de testes de integração compatíveis com o Medusa

## 14. Limites da responsabilidade

Atualmente, o `Cancellation & Retention` possui:
- estado do caso de cancelamento
- estado da recomendação de retenção
- histórico de ofertas de retenção
- classificação dos motivos de cancelamento
- fluxos de trabalho de cancelamento e retenção voltados para a operadora
- métricas operacionais para o tratamento de cancelamentos

Não inclui:
- o ciclo de vida da assinatura como fonte primária de informações confiáveis
- o histórico de execução do ciclo de renovação
- o estado das tentativas de cobrança e da recuperação de dívidas
- a configuração global da política de planos e ofertas

O módulo se coordena com esses domínios por meio de:
- efeitos de mutação orientados por fluxo de trabalho
- leituras vinculadas e enriquecidas por consultas
- limites explícitos de propriedade, em vez de um estado agregado compartilhado
