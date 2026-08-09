# Arquitetura de cobrança

Este documento descreve a arquitetura de tempo de execução atual da área `Dunning` no plugin `Reorder`.

Ele se concentra no sistema implementado e não no plano original apenas de design.

## Meta

A área `Dunning` fornece recuperação de pagamento para pagamentos de renovação qualificados com falha.

A implementação atual suporta:
- rastreando `dunning_case` e `dunning_attempt`
- iniciar cobrança por falhas de renovação qualificadas para pagamento
- execução de novas tentativas orientada pelo agendador
- ações manuais do administrador para nova tentativa e resolução
- Lista de administradores e visualizações detalhadas aninhadas em `Subscriptions`
- integração com `Renewals` e `Subscriptions`
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

## Visão Geral da Arquitetura

A implementação é dividida em quatro camadas principais:

1. módulo de domínio
2. fluxos de trabalho e trabalho agendado
3. API de administração
4. IU de administração

Cada camada tem uma responsabilidade clara:

- o módulo de domínio possui `dunning_case` e `dunning_attempt`
- criação de casos próprios de fluxos de trabalho, execução de novas tentativas, resolução manual e atualizações de agendamento de novas tentativas
- o trabalho agendado descobre casos vencidos e aciona o fluxo de trabalho de nova tentativa compartilhada
- a API admin expõe rotas de leitura e mutação para operadores
- a interface do administrador renderiza a fila de cobrança e os detalhes do caso na área `Subscriptions`

## 1. Módulo de Domínio

O módulo personalizado `dunning` é o proprietário do estado de recuperação de pagamento.

Ele contém:
- tipos de domínio
- o modelo de dados `dunning_case`
- o modelo de dados `dunning_attempt`
- o serviço do módulo
- utilitários de modelo de leitura para leituras de lista de administradores, detalhes e agendadores
- agendamento de novas tentativas e auxiliares de erro
- auxiliares de observabilidade para registro e classificação de falhas

Principais opções de design:
- um `DunningCase` está ancorado em um originário `renewal_cycle_id`
- uma assinatura pode ter muitos casos históricos, mas apenas um caso ativo por vez no MVP
- o histórico de novas tentativas é armazenado separadamente como `DunningAttempt`
- `Dunning` possui o estado de recuperação, enquanto `RenewalCycle` permanece a fonte da verdade para o resultado original da execução da renovação

## 2. Modelo de dados

O modelo `dunning_case` armazena:
- campos agregados de identidade e propriedade
- tentar novamente o status do ciclo de vida
- repetir contadores e agendar instantâneo
- carimbo de data e hora da próxima tentativa
- resumo do último erro de pagamento
- carimbos de data/hora de recuperação ou fechamento
- motivo de recuperação e metadados

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
-`metadata`

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

As migrações atuais e a configuração do modelo otimizam a cobrança para:
- pesquisa por `subscription_id`
- pesquisa por `renewal_cycle_id`
- pesquisa por `renewal_order_id`
- filtragem por `status`
- descoberta do agendador por `next_retry_at`
- pesquisa `status + next_retry_at` combinada para novas tentativas devidas
- tentativa de pesquisa de histórico por `dunning_case_id`

## 3. Semântica de Integração

`Dunning` está integrado com `Renewals` e `Subscriptions` no tempo de execução atual.

A implementação atual segue estas regras:
- somente falhas de renovação qualificadas para pagamento começam a ser cobradas
- atualmente, as falhas de renovação qualificadas surgem de falhas na sessão de pagamento, autorização e captura após a existência do pedido de renovação
- `start-dunning` marca a assinatura como `past_due` ao entrar na recuperação
- `run-dunning-retry` tenta novamente o pagamento do pedido de renovação existente em vez de executar novamente todo o fluxo de trabalho de renovação
- a recuperação bem-sucedida fecha o caso como `recovered` e restaura a assinatura para `active`
- encerramento não recuperado deixa o ciclo de renovação originário como `failed` e mantém a assinatura em `past_due`

Classificação atual de novas tentativas:
- falhas repetíveis incluem `insufficient_funds`, `generic_decline`, `do_not_honor` e erros temporários de provedor/rede
- falhas de terminal incluem `requires_more`, método de pagamento ausente ou contexto de nova tentativa, detalhes de pagamento expirados e outros casos que exigem resolução manual

Isso significa:
- `Renewals` possui o evento de faturamento com falha
- `Dunning` é o proprietário da jornada de recuperação de pagamento posterior
- `Subscriptions` possui o estado operacional do ciclo de vida do cliente

A área `Cancellation & Retention` implementada não assume a propriedade de recuperação de pagamento.

Limite atual com `Cancellation & Retention`:
- um `DunningCase` ativo pode coexistir com um `CancellationCase` ativo
- `Cancellation & Retention` pode ler o contexto de cobrança para visibilidade do operador
- `Cancellation & Retention` não se torna o proprietário da programação de novas tentativas, novas tentativas ou estado de encerramento de cobrança
- `past_due` assinaturas ainda podem entrar no fluxo de retenção ou cancelamento final

Isso significa:
- fluxos de trabalho de cancelamento podem operar enquanto a cobrança está ativa
- mas o estado do ciclo de vida da cobrança permanece propriedade de `Dunning`
- o módulo de cancelamento não altera diretamente o estado de cobrança como parte da progressão normal do caso

## 4. Leia o caminho

O caminho de leitura é otimizado para a fila de cobrança do administrador e detalhes do caso.

Componentes principais:
- manipuladores de rota administrativa em `src/api/admin/dunning`
- auxiliares de normalização em `src/api/admin/dunning/utils.ts`
- ajudantes de consulta em `src/modules/dunning/utils/admin-query.ts`
- auxiliar de consulta específico do agendador em `src/modules/dunning/utils/scheduler-query.ts`

### Fluxo da fila

Para a visualização da fila:
1. a UI Admin envia parâmetros de consulta para `GET /admin/dunning`
2. A rota valida e normaliza a entrada da consulta
3. `listAdminDunningCases(...)` aplica filtros, classificação, paginação e enriquecimento de resumo vinculado
4. a camada de consulta lê `dunning_case` e o status da última tentativa
5. a resposta é mapeada para Admin DTOs usados pelo DataTable

A fila atual suporta:
- paginação
- pesquisar
- filtragem
- classificação
- resumos vinculados de `subscription`, `renewal` e `order`

### Fluxo detalhado

Para a visualização detalhada:
1. a IU do administrador solicita `GET /admin/dunning/:id`
2. A rota resolve o caso por meio do auxiliar de consulta detalhada
3. assinatura vinculada, renovação e resumos de pedidos são resolvidos
4. O histórico completo de tentativas e o cronograma de novas tentativas são mapeados no DTO detalhado

A carga detalhada representa:
- o agregado do caso
- resumo de assinatura vinculado
- resumo de renovação vinculado
- resumo do pedido vinculado
- agendamento de nova tentativa
- histórico de tentativas
- metadados

### Nota de limite de consulta

No tempo de execução atual, as leituras administrativas `Dunning` usam IDs escalares mais enriquecimento baseado em consulta.

Os links de módulo planejados do design original ainda não são a fonte de tempo de execução para leituras administrativas.

Isso significa:
- `DunningCase` continua sendo a raiz da consulta de origem
- `subscription_id`, `renewal_cycle_id` e `renewal_order_id` são persistidos no caso
- `query.graph()` resolve resumos vinculados dessas referências escalares

## 5. Escrever caminho

Todas as operações de cobrança que alteram o estado são roteadas por meio de fluxos de trabalho.

Mutações implementadas:
- começar a cobrar
- execute a cobrança novamente
- marca de cobrança recuperada
- marcar cobrança não recuperada
- atualizar cronograma de novas tentativas

Padrão de caminho de gravação:
1. `Renewals`, o agendador ou uma rota administrativa envia entrada de fluxo de trabalho
2. o fluxo de trabalho valida o caso atual e o estado da assinatura
3. o fluxo de trabalho aplica lógica de nova tentativa ou resolução
4. a rota retorna a carga atualizada de detalhes de cobrança para mutações de administrador

Isso mantém a lógica de negócios fora das rotas e centraliza as regras de mutação nos fluxos de trabalho.

## 6. Fluxos de trabalho

A camada de mutação atual é construída em torno de:
- `start-dunning`
- `run-dunning-retry`
- `mark-dunning-recovered`
- `mark-dunning-unrecovered`
- `update-dunning-retry-schedule`

### Iniciar fluxo de trabalho

`start-dunning` é a mutação de entrada para um pagamento de renovação qualificado com falha.

É responsável por:
- validar que o ciclo de renovação da fonte falhou
- validação da fonte de falha qualificada para pagamento
- impor a invariante de caso ativo único por assinatura
- criar ou atualizar o caso ativo para o mesmo ciclo
- aplicando o agendamento de novas tentativas padrão
- marcando a assinatura `past_due`

### Tentar novamente o fluxo de trabalho

`run-dunning-retry` é o fluxo de trabalho de recuperação de pagamento compartilhado usado por:
- o trabalho do agendador
- manual `retry-now`

É responsável por:
- validar que o caso pode ser repetido
- criando um novo `DunningAttempt`
- reutilizar o contexto de pagamento do pedido de renovação
- criação de uma nova sessão de pagamento
- autorizar e capturar pagamento
- transição do caso para `recovered`, `retry_scheduled` ou `unrecovered`
- restaurar a assinatura para `active` na recuperação

Detalhe da implementação atual:
- o fluxo de trabalho adquire um bloqueio de fluxo de trabalho Medusa com chave `dunning:${dunning_case_id}`
- as configurações de bloqueio atuais são `timeout = 5` segundos e `ttl = 120` segundos
- o fluxo de trabalho emite logs operacionais estruturados com reconhecimento de correlação

### Fluxos de trabalho de resolução manual

Os fluxos de trabalho manuais voltados para o administrador são:
- `mark-dunning-recovered`
- `mark-dunning-unrecovered`
- `update-dunning-retry-schedule`

Eles são responsáveis por:
- validando transições permitidas
- gravação `who / when / reason` em metadados
- atualização do estado do ciclo de vida do caso
- preservando as mesmas regras de domínio usadas pelo caminho do agendador

## 7. Processamento Agendado

`Dunning` é processado pelo trabalho agendado:

- `src/jobs/process-dunning-retries.ts`

O trabalho:
- descobre casos vencidos em lotes
- usa um bloqueio de trabalho grosseiro
- executa o fluxo de trabalho de nova tentativa compartilhada para cada caso
- registra resultados por caso
- emite um resumo estruturado da execução com contadores e métricas operacionais

O agendador não implementa um fluxo de negócios separado. Ele reutiliza a mesma lógica principal de nova tentativa do manual `retry-now`.

## 8. Simultaneidade e fortalecimento operacional

A implementação atual fortalece tanto o agendador quanto a execução manual de novas tentativas.

A proteção atualmente inclui:
- bloqueio grosseiro do agendador através do Módulo de Bloqueio
- bloqueio de fluxo de trabalho por caso por meio de `acquireLockStep`
- proteção de caso ativo duplicado no início da cobrança
- proteções de repetição para casos terminais, novas tentativas em voo, novas tentativas não devidas e exaustão máxima de tentativas
- logs estruturados com IDs de correlação
- métricas de resumo do agendador, incluindo taxa de recuperação, taxa de falhas, média de tentativas e tempo médio de recuperação
- classificação de falha alertável para novas tentativas inesperadas e falhas de inicialização

## 9. Integração administrativa

A UI `Dunning` é implementada como uma área administrativa aninhada em `Subscriptions`.

Rotas implementadas:
- `/app/subscriptions/dunning`
- `/app/subscriptions/dunning/:id`

Isso mantém `Dunning` visualmente alinhado com a estrutura `Subscriptions`, `Plans & Offers` e `Renewals` existente, em vez de introduzir uma área administrativa de nível superior separada.

## 10. Resumo

`Dunning` agora é uma camada operacional implementada para recuperação de pagamento de renovação com falha.

No tempo de execução atual:
- `Renewals` cria o evento de dívida falhada
- `Dunning` recupera ou encerra esse evento de dívida
- `Subscriptions` reflete o estado do ciclo de vida do cliente, como `active` e `past_due`
- `Cancellation & Retention` pode coexistir com cobrança para a mesma assinatura sem assumir a propriedade de recuperação

A arquitetura mantém cada limite de domínio explícito, ao mesmo tempo que oferece aos operadores um espaço de trabalho administrativo único e coerente para operações comerciais recorrentes.
