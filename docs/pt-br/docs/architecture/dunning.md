# Arquitetura de cobrança

Este documento descreve a arquitetura de tempo de execução atual da área `Dunning` no plug-in `Reorder`.

Ele se concentra no sistema implementado, e não apenas no projeto original.

## Objetivo

A área `Dunning` permite a recuperação de pagamentos de renovação com falha que atendam aos critérios de qualificação.

A implementação atual oferece suporte a:
- rastreamento de `dunning_case` e `dunning_attempt`
- início do processo de cobrança em caso de falhas na renovação com pagamento qualificado
- execução de novas tentativas por meio do agendador
- ações manuais do administrador para novas tentativas e resolução
- visualizações de lista e detalhes do administrador aninhadas em `Subscriptions`
- integração com `Renewals` e `Subscriptions`
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

## Visão geral da arquitetura

A implementação está dividida em quatro camadas principais:

1. módulo de domínio
2. fluxos de trabalho e tarefas agendadas
3. API de administração
4. interface de usuário de administração

Cada camada tem uma responsabilidade bem definida:

- o módulo de domínio é responsável por `dunning_case` e `dunning_attempt`
- os fluxos de trabalho são responsáveis pela criação de casos, pela execução de novas tentativas, pela resolução manual e pelas atualizações da programação de novas tentativas
- a tarefa agendada identifica os casos vencidos e aciona o fluxo de trabalho compartilhado de novas tentativas
- a API de administração disponibiliza rotas de leitura e modificação para os operadores
- a interface de usuário de administração exibe a fila de cobranças e os detalhes do caso na área `Subscriptions`

## 1. Módulo de domínio

O módulo personalizado `dunning` é o responsável pelo status de recuperação do pagamento.

Ele contém:
- tipos de domínio
- o modelo de dados `dunning_case`
- o modelo de dados `dunning_attempt`
- o serviço do módulo
- utilitários de leitura do modelo para consultas à lista, aos detalhes e ao agendador do Admin
- auxiliares de repetição de agendamento e de erros
- auxiliares de observabilidade para registro em log e classificação de falhas

Principais escolhas de projeto:
- um `DunningCase` está vinculado a um `renewal_cycle_id` de origem
- uma assinatura pode ter vários casos históricos, mas apenas um caso ativo por vez no MVP
- o histórico de novas tentativas é armazenado separadamente como `DunningAttempt`
- o `Dunning` é responsável pelo estado de recuperação, enquanto o `RenewalCycle` continua sendo a fonte de verdade para o resultado da execução original da renovação

## 2. Modelo de dados

O modelo `dunning_case` armazena:
- campos de identidade e propriedade do agregado
- status do ciclo de vida da repetição
- contadores de repetição e instantâneo da programação
- carimbo de data e hora da próxima repetição prevista
- resumo mais recente do erro de pagamento
- carimbos de data e hora de recuperação ou encerramento
- motivo da recuperação e metadados

Os campos principais `dunning_case` incluem:
- `id`
- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`
- `status`
- `attempt_count`
- `max_attempts`
- `retry_schedule`
- `next_retry_at`
- `last_payment_error_code`
- `last_payment_error_message`
- `last_attempt_at`
- `recovered_at`
- `closed_at`
- `recovery_reason`
- `metadata`

O modelo `dunning_attempt` armazena:
- `id`
- `dunning_case_id`
- `attempt_no`
- `started_at`
- `finished_at`
- `status`
- `error_code`
- `error_message`
- `payment_reference`
- `metadata`

### Estratégia de indexação

As migrações atuais e a configuração do modelo otimizam o processo de cobrança para:
- consulta por `subscription_id`
- consulta por `renewal_cycle_id`
- consulta por `renewal_order_id`
- filtragem por `status`
- descoberta do agendador por `next_retry_at`
- pesquisa combinada de `status + next_retry_at` para novas tentativas de cobrança vencida
- pesquisa do histórico de tentativas por `dunning_case_id`

## 3. Semântica da integração

O `Dunning` está integrado ao `Renewals` e ao `Subscriptions` no ambiente de execução atual.

A implementação atual segue estas regras:
- apenas falhas de renovação qualificadas como relacionadas a pagamento acionam o processo de cobrança;`
- atualmente, as falhas de renovação qualificadas são identificadas a partir de falhas na sessão de pagamento, na autorização e na captura, após a criação do pedido de renovação;`
- `start-dunning` marca a assinatura como `past_due` ao iniciar a recuperação;`
- `run-dunning-retry` tenta novamente o pagamento na ordem de renovação existente, em vez de reexecutar todo o fluxo de trabalho de renovação
- a recuperação bem-sucedida encerra o caso como `recovered` e restaura a assinatura para `active`
- o encerramento sem recuperação mantém o ciclo de renovação original como `failed` e mantém a assinatura em `past_due`

Classificação atual das tentativas de repetição:
- as falhas que permitem repetição incluem `insufficient_funds`, `generic_decline`, `do_not_honor` e erros temporários do provedor ou da rede
- as falhas terminais incluem `requires_more`, ausência de método de pagamento ou contexto de repetição, detalhes de pagamento vencidos e outros casos que exigem resolução manual

Isso significa que:
- `Renewals` é responsável pelo evento de cobrança com falha
- `Dunning` é responsável pelo processo posterior de recuperação do pagamento
- `Subscriptions` é responsável pelo estado operacional do ciclo de vida do cliente

A área `Cancellation & Retention` implementada não assume a responsabilidade pela cobrança do pagamento.

Limite atual com `Cancellation & Retention`:
- um `DunningCase` ativo pode coexistir com um `CancellationCase` ativo
- o `Cancellation & Retention` pode ler o contexto de cobrança para visibilidade do operador
- o `Cancellation & Retention` não se torna o proprietário da programação de novas tentativas, das tentativas de repetição ou do estado de encerramento da cobrança
- as assinaturas do `past_due` ainda podem entrar no fluxo de retenção ou de cancelamento definitivo

Isso significa que:
- os fluxos de trabalho de cancelamento podem ser executados enquanto o processo de cobrança estiver ativo
- mas o estado do ciclo de vida da cobrança continua sob a responsabilidade de `Dunning`
- o módulo de cancelamento não altera diretamente o estado da cobrança como parte do andamento normal do caso

## 4. Caminho de leitura

O caminho de leitura está otimizado para a fila de cobranças do Admin e os detalhes do caso.

Principais componentes:
- manipuladores de rotas de administração em `src/api/admin/dunning`
- auxiliares de normalização em `src/api/admin/dunning/utils.ts`
- auxiliares de consulta em `src/modules/dunning/utils/admin-query.ts`
- auxiliar de consulta específico do agendador em `src/modules/dunning/utils/scheduler-query.ts`

### Fluxo da fila

Para a visualização da fila:
1. a interface de usuário administrativa envia parâmetros de consulta para `GET /admin/dunning`
2. a rota valida e normaliza os dados inseridos na consulta
3. `listAdminDunningCases(...)` aplica filtros, ordenação, paginação e enriquecimento do resumo vinculado
4. a camada de consulta lê `dunning_case` e o status da última tentativa
5. a resposta é mapeada para os DTOs administrativos usados pela DataTable

A fila atual oferece os seguintes recursos:
- paginação
- pesquisa
- filtragem
- ordenação
- resumos vinculados a `subscription`, `renewal` e `order`

### Fluxo de detalhes

Para a visualização detalhada:
1. a interface de usuário de administração solicita `GET /admin/dunning/:id`
2. a rota resolve o caso por meio do auxiliar de consulta de detalhes
3. os resumos de assinaturas, renovações e pedidos vinculados são resolvidos
4. o histórico completo de tentativas e a programação de novas tentativas são mapeados para o DTO de detalhes

A carga útil de detalhes representa:
- o agregado do caso
- resumo da assinatura vinculada
- resumo da renovação vinculada
- resumo do pedido vinculado
- programação de novas tentativas
- histórico de tentativas
- metadados

### Observação sobre os limites da consulta

No ambiente de execução atual, as leituras do `Dunning` Admin utilizam IDs escalares, além de um enriquecimento baseado em consultas.

Os links dos módulos planejados do projeto original ainda não constituem a fonte de execução para as leituras do Admin.

Isso significa que:
- `DunningCase` continua sendo a raiz da consulta de origem
- `subscription_id`, `renewal_cycle_id` e `renewal_order_id` são mantidos no caso
- `query.graph()` resolve resumos vinculados a partir dessas referências escalares

## 5. Caminho de gravação

Todas as operações de cobrança que envolvem mudança de status são encaminhadas por meio de fluxos de trabalho.

Alterações implementadas:
- iniciar cobrança
- executar nova tentativa de cobrança
- marcar cobrança como recuperada
- marcar cobrança como não recuperada
- atualizar programação de novas tentativas

Padrão do caminho de gravação:
1. `Renewals`, o agendador ou uma rota de administração envia a entrada do fluxo de trabalho
2. o fluxo de trabalho valida o caso atual e o estado da assinatura
3. o fluxo de trabalho aplica a lógica de repetição ou resolução
4. a rota retorna a carga útil atualizada com os detalhes da cobrança para mutações de administração

Isso mantém a lógica de negócios fora das rotas e centraliza as regras de mutação nos fluxos de trabalho.

## 6. Fluxos de trabalho

A camada de mutação atual é construída em torno de:
- `start-dunning`
- `run-dunning-retry`
- `mark-dunning-recovered`
- `mark-dunning-unrecovered`
- `update-dunning-retry-schedule`

### Iniciar o fluxo de trabalho

`start-dunning` é a mutação de registro para um pagamento de renovação com falha que atende aos critérios.

É responsável por:
- verificar se o ciclo de renovação da fonte falhou
- validar a fonte da falha qualificada para pagamento
- garantir a invariável de “um único caso ativo por assinatura”
- criar ou atualizar o caso ativo para o mesmo ciclo
- aplicar a programação padrão de repetição de tentativa
- marcar a assinatura como `past_due`

### Fluxo de trabalho de repetição

`run-dunning-retry` é o fluxo de trabalho compartilhado de recuperação de pagamentos utilizado por:
- a tarefa do agendador
- o `retry-now` manual

É responsável por:
- validar se o caso pode ser repetido
- criar um novo `DunningAttempt`
- reutilizar o contexto de pagamento da ordem de renovação
- criar uma nova sessão de pagamento
- autorizar e capturar o pagamento
- transferir o caso para `recovered`, `retry_scheduled` ou `unrecovered`
- restaurar a assinatura para `active` na recuperação

Detalhes da implementação atual:
- o fluxo de trabalho adquire um bloqueio de fluxo de trabalho Medusa com a chave `dunning:${dunning_case_id}`
- as configurações atuais do bloqueio são `timeout = 5` segundos e `ttl = 120` segundos
- o fluxo de trabalho emite logs operacionais estruturados com reconhecimento de correlação

### Fluxos de trabalho de resolução manual

Os fluxos de trabalho manuais destinados aos administradores são:
- `mark-dunning-recovered`
- `mark-dunning-unrecovered`
- `update-dunning-retry-schedule`

Eles são responsáveis por:
- validar as transições permitidas
- registrar `who / when / reason` nos metadados
- atualizar o estado do ciclo de vida do caso
- preservar as mesmas regras de domínio utilizadas pelo caminho do agendador

## 7. Processamento programado

`Dunning` é processado pela tarefa agendada:

- `src/jobs/process-dunning-retries.ts`

A tarefa:
- identifica casos vencidos em lotes
- utiliza um bloqueio de tarefa aproximado
- executa o fluxo de trabalho de repetição compartilhado para cada caso
- registra os resultados de cada caso
- gera um resumo estruturado da execução com contadores e métricas operacionais

O agendador não implementa um fluxo de negócios separado. Ele reutiliza a mesma lógica central de repetição de tentativas que o `retry-now` manual.

## 8. Concorrência e fortalecimento operacional

A implementação atual reforça a segurança tanto da execução pelo agendador quanto da execução de novas tentativas manuais.

Atualmente, a proteção inclui:
- bloqueio do agendador de alto nível por meio do Módulo de Bloqueio
- bloqueio do fluxo de trabalho por caso por meio de `acquireLockStep`
- proteção contra casos ativos duplicados no início do processo de cobrança
- proteções contra novas tentativas para casos finais, tentativas em andamento, tentativas fora do prazo e esgotamento do número máximo de tentativas
- logs estruturados com IDs de correlação
- métricas resumidas do agendador, incluindo taxa de recuperação, taxa de falha, média de tentativas e tempo médio de recuperação
- classificação de falhas com alertas para falhas inesperadas de tentativas e inicialização

## 9. Integração administrativa

A interface do usuário `Dunning` está implementada como uma área de administração aninhada sob `Subscriptions`.

Rotas implementadas:
- `/app/subscriptions/dunning`
- `/app/subscriptions/dunning/:id`

Isso mantém o `Dunning` visualmente alinhado com a estrutura existente do `Subscriptions`, `Plans & Offers` e `Renewals`, em vez de introduzir uma área de administração separada no nível superior.

## 10. Resumo

`Dunning` agora é uma camada operacional implementada para a recuperação de pagamentos de renovação com falha.

No ambiente de execução atual:
- `Renewals` cria o evento de inadimplência
- `Dunning` recupera ou encerra esse evento de inadimplência
- `Subscriptions` reflete o estado do ciclo de vida do cliente, como `active` e `past_due`
- `Cancellation & Retention` pode coexistir com o processo de cobrança para a mesma assinatura sem assumir a responsabilidade pela recuperação

A arquitetura mantém os limites de cada domínio explícitos, ao mesmo tempo em que oferece aos operadores um único espaço de trabalho administrativo coerente para operações comerciais recorrentes.
