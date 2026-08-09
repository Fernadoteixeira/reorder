# Arquitetura de renovações

Este documento descreve a arquitetura atual da área `Renewals` no plug-in `Reorder`.

Ele se concentra no sistema implementado, e não nos pressupostos iniciais do projeto.

## Objetivo

A área `Renewals` fornece a camada de execução e análise operacional para o faturamento de assinaturas recorrentes.

A implementação atual oferece suporte a:
- acompanhamento dos ciclos de renovação e das tentativas de renovação
- processamento programado por meio de uma tarefa do Medusa
- execução manual forçada pelo administrador
- aprovação e rejeição de alterações pendentes na assinatura antes da renovação
- visualizações da fila e dos detalhes do administrador para operações de renovação
- integração com `Subscriptions` e `Plans & Offers`
- integração com `Dunning` para falhas de renovação qualificadas para pagamento
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

## Visão geral da arquitetura

A implementação está dividida em quatro camadas principais:

1. módulo de domínio
2. fluxos de trabalho e tarefas agendadas
3. API de administração
4. interface de usuário de administração

Cada camada tem uma responsabilidade bem definida:

- o módulo de domínio possui `renewal_cycle` e `renewal_attempt`
- os fluxos de trabalho possuem mutações de execução, aprovação, rejeição e execução forçada
- a tarefa agendada identifica os ciclos de vencimento e aciona o fluxo de trabalho de execução compartilhada
- a API de administração expõe rotas de leitura e mutação para usuários operacionais
- a interface de usuário de administração exibe as visualizações da fila e dos detalhes e chama os endpoints de administração

## 1. Módulo de domínio

O módulo personalizado `renewal` é o proprietário do domínio de execução da renovação.

Ele contém:
- tipos de domínio
- o modelo de dados `renewal_cycle`
- o modelo de dados `renewal_attempt`
- o serviço do módulo
- utilitários de leitura do modelo para leituras da fila de administração, detalhes e agendador

Principais escolhas de projeto:
- um ciclo de renovação representa uma unidade concreta a ser renovada para uma assinatura
- o histórico de tentativas é armazenado separadamente do agregado do ciclo
- o ciclo armazena diretamente o estado operacional e os campos selecionados do resumo de execução
- a assinatura continua sendo a fonte do estado ativo de assinatura, enquanto o ciclo continua sendo a fonte do histórico de execução

## 2. Modelo de dados

O modelo `renewal_cycle` armazena:
- campos de identidade e agendamento
- status de execução
- estado de aprovação
- referência da ordem gerada
- resumo do último erro
- instantâneo da alteração pendente aplicada
- contador de tentativas e metadados

Os campos principais `renewal_cycle` incluem:
- `id`
- `subscription_id`
- `scheduled_for`
- `processed_at`
- `status`
- `approval_required`
- `approval_status`
- `approval_decided_at`
- `approval_decided_by`
- `approval_reason`
- `generated_order_id`
- `applied_pending_update_data`
- `last_error`
- `attempt_count`
- `metadata`

O modelo `renewal_attempt` armazena:
- `id`
- `renewal_cycle_id`
- `attempt_no`
- `started_at`
- `finished_at`
- `status`
- `error_code`
- `error_message`
- `payment_reference`
- `order_id`
- `metadata`

### Estratégia de indexação

As migrações atuais e a configuração do modelo otimizam a fila de renovação para:
- consulta por `subscription_id`
- filtragem por `status`
- filtragem e ordenação por `scheduled_for`
- filtragem e ordenação pelo administrador com base em campos operacionais
- consulta ao histórico de tentativas por `renewal_cycle_id`

## 3. Semântica de execução

`Renewals` utilize a assinatura como fonte do estado operacional atual e, opcionalmente, aplique o `pending_update_data` aprovado durante a execução.

A implementação atual segue estas regras:
- somente assinaturas elegíveis podem ser renovadas
- alterações pendentes só são consideradas quando entram em vigor na data do ciclo
- a aprovação é exigida quando o ciclo assim o requer
- `Plans & Offers` são resolvidos novamente no momento da execução, antes que as alterações pendentes sejam aplicadas
- a execução bem-sucedida atualiza a cadência ativa da assinatura e limpa os `pending_update_data` aplicados
- o ciclo registra se as alterações pendentes foram efetivamente aplicadas

Isso significa:
- `Subscriptions` estado da própria assinatura ativa
- `Plans & Offers` validação da própria política atual
- `Renewals` estado de execução e histórico de resultados da própria assinatura

A área `Cancellation & Retention` implementada não altera a propriedade de `Renewals`.

Limites atuais com `Cancellation & Retention`:
- `Renewals` não possui o estado do processo de cancelamento
- `Cancellation & Retention` não possui o histórico de execução do ciclo de renovação
- a elegibilidade para ciclos futuros é derivada do estado do ciclo de vida de `Subscription`, em vez de transferir a responsabilidade pelo ciclo para o módulo de cancelamento

Em termos de tempo de execução:
- os ciclos futuros devem respeitar `Subscription.status`
- os ciclos futuros devem respeitar `cancel_effective_at`
- os ciclos futuros devem respeitar `next_renewal_at`
- `pause` e `cancel` afetam a elegibilidade, e não a propriedade dos registros `renewal_cycle`

## 4. Caminho de leitura

O caminho de leitura está otimizado para a fila de renovação do Admin e os detalhes do ciclo.

Principais componentes:
- manipuladores de rotas de administração em `src/api/admin/renewals`
- auxiliares de normalização em `src/api/admin/renewals/utils.ts`
- auxiliares de consulta em `src/modules/renewal/utils/admin-query.ts`
- auxiliar de consulta específico do agendador em `src/modules/renewal/utils/scheduler-query.ts`

### Fluxo da fila

Para a visualização da fila:
1. a interface de usuário administrativa envia parâmetros de consulta para `GET /admin/renewals`
2. a rota valida e normaliza os dados inseridos na consulta
3. `listAdminRenewals(...)` aplica filtros, ordenação, paginação e resolução de resumos vinculados
4. a camada de consulta lê os ciclos de renovação e as tentativas mais recentes
5. a resposta é mapeada para os DTOs administrativos usados pela DataTable da fila

O modelo de leitura Admin distingue entre:
- `scheduled_for` como a data do ciclo operacional de propriedade de `renewal_cycle`
- `effective_scheduled_for` como a data de entrega prevista exibida quando a assinatura vinculada tem `skip_next_cycle = true`

Os recursos de fila suportados incluem:
- paginação
- pesquisa
- filtragem
- classificação
- resolução do resumo da tentativa mais recente

### Fluxo de detalhes

Para a visualização detalhada:
1. a interface de usuário de administração solicita `GET /admin/renewals/:id`
2. a rota resolve o ciclo por meio do auxiliar de consulta de detalhes
3. os resumos de assinaturas vinculadas e de pedidos gerados são resolvidos
4. o histórico de tentativas e o resumo de alterações pendentes são mapeados para o DTO de detalhes

A carga útil detalhada representa:
- o agregado do ciclo
- resumo de aprovações
- resumo de assinaturas vinculadas
- resumo de pedidos vinculados
- alterações pendentes
- histórico de tentativas
- metadados

Isso mantém intacta a fonte de verdade do ciclo operacional, ao mesmo tempo em que permite que a interface de usuário de administração exiba a data de entrega prevista após o salto.

### Fluxo de leitura do agendador

A tarefa agendada utiliza uma consulta dedicada do agendador, em vez do modelo de leitura do Admin.

Ele seleciona os ciclos vencidos com base em:
- `status in [scheduled, failed]`
- `scheduled_for <= now`
- estado elegível para aprovação, quando a aprovação for necessária

Isso mantém a descoberta do agendador leve e separada das questões relacionadas à exibição do Admin.

Como `Cancellation & Retention` pode fazer com que os estados `paused` e `cancelled` voltem a ser `Subscription`, o comportamento do agendador deve tratar esses campos do ciclo de vida como o critério de decisão operacional.

Implicações atuais:
- As assinaturas `paused` normalmente não são elegíveis para execução de renovação
- As assinaturas `cancelled` não são elegíveis para execução de renovação
- Os ciclos devidos após o cancelamento efetivo não devem ser executados
- Os registros de ciclo podem ainda existir historicamente, mesmo quando não são mais elegíveis

## 5. Caminho de gravação

Todas as operações de renovação que envolvem mudança de estado são encaminhadas por meio de fluxos de trabalho.

Alterações implementadas:
- ciclo de renovação do processo
- forçar o ciclo de renovação
- aprovar alterações de renovação
- rejeitar alterações de renovação

Padrão do fluxo de trabalho:
1. O agendador ou a rota “Admin” envia uma entrada para o fluxo de trabalho
2. O fluxo de trabalho valida o ciclo atual e o estado da assinatura
3. O fluxo de trabalho aplica a lógica de execução ou decisão
4. A rota retorna a carga útil com os detalhes atualizados da renovação para as mutações do “Admin”

Isso mantém a lógica de negócios fora das rotas e centraliza as regras de mutação nos fluxos de trabalho.

## 6. Fluxos de trabalho

A camada de mutação de renovação atual é construída em torno de:
- `process-renewal-cycle`
- `force-renewal-cycle`
- `approve-renewal-changes`
- `reject-renewal-changes`

### Fluxo de trabalho de execução principal

`process-renewal-cycle` é o fluxo de trabalho de execução compartilhado utilizado por:
- a tarefa do agendador
- o `force renewal` manual

É responsável por:
- validar a simultaneidade e o estado
- validar a elegibilidade da assinatura
- validar os requisitos de aprovação
- revalidar a política `Plans & Offers` para alterações pendentes
- criar a tentativa de renovação
- atualizar o status do ciclo
- criar o pedido de renovação, quando aplicável
- iniciar o `Dunning` quando ocorrerem falhas na renovação com qualificação de pagamento após a criação do pedido
- atualizar a cadência da assinatura e os instantâneos
- registrar o sucesso ou a falha

Detalhes da implementação atual:
- o fluxo de trabalho adquire um bloqueio de fluxo de trabalho Medusa com a chave `renewal:${renewal_cycle_id}`
- as configurações atuais do bloqueio são `timeout = 10` segundos e `ttl = 120` segundos
- esse bloqueio compartilhado protege tanto a execução pelo agendador quanto a execução manual forçada

### Fluxos de trabalho de aprovação

`approve-renewal-changes` e `reject-renewal-changes` são os limites de mutação para as decisões de aprovação.

Eles são responsáveis por:
- verificar se é necessária uma aprovação
- impedir decisões duplicadas
- registrar quem decidiu, quando e por quê
- atualizar o status do ciclo de aprovação

### Fluxo de trabalho do Force

`force-renewal-cycle` é a mutação operacional voltada para o administrador.

É responsável por:
- validar se o ciclo pode ser forçado manualmente
- garantir o cumprimento dos requisitos de aprovação antes da execução forçada
- delegar a execução propriamente dita ao fluxo de trabalho compartilhado de renovação do núcleo
- anexar um ID de correlação da operação manual utilizado pelo registro operacional estruturado

## 7. Processamento programado

`Renewals` são processados pela tarefa agendada:

- `src/jobs/process-renewal-cycles.ts`

A tarefa:
- é executada a cada cinco minutos
- identifica os ciclos vencidos em lotes
- executa o fluxo de trabalho de renovação compartilhado para cada ciclo
- registra os resultados de cada ciclo
- gera um resumo estruturado da execução com contadores e duração

O agendador não implementa um fluxo de negócios separado. Ele reutiliza a mesma lógica de execução central da execução manual.

## 8. Concorrência e fortalecimento operacional

O fluxo de trabalho de execução da renovação já utiliza o bloqueio de fluxo de trabalho do Medusa ao longo do caminho crítico de execução.

As medidas de fortalecimento atuais incluem:
- chave de bloqueio baseada em `renewal_cycle_id`
- proteção contra duplicação por meio da validação de estado
- registro estruturado de operações
- IDs de correlação gerados para fluxos do agendador e fluxos forçados manualmente
- registro de resultados por ciclo e por tarefa
- contadores resumidos para:
  - contagem de sucessos
  - contagem de falhas
  - contagem de bloqueios
  - duração do processamento

A classificação de logs orientada a alertas distingue atualmente entre:
- já em processamento
- execução duplicada
- assinatura não elegível
- aprovação bloqueada
- política de oferta bloqueada
- falha na criação do pedido
- falha inesperada em tempo de execução

Nota de implementação operacional:
- a observabilidade da renovação estruturada está localizada em `src/modules/renewal/utils/observability.ts`
- o agendador registra resumos por execução e por ciclo dos trabalhos
- a etapa de execução principal e o fluxo forçado manualmente emitem eventos operacionais com reconhecimento de correlação

## 8.1 Limite com cancelamento e retenção

O `Cancellation & Retention` agora faz parte do ciclo de execução do comércio recorrente, mas isso ocorre por meio de efeitos no ciclo de vida da assinatura, e não assumindo a responsabilidade pela renovação.

Divisão atual do tempo de execução:
- `RenewalCycle` continua sendo a fonte de referência para o agendamento de renovações e o histórico de execução
- `CancellationCase` continua sendo a fonte de referência para as decisões relacionadas ao cancelamento de assinaturas
- os campos do ciclo de vida da assinatura são o ponto de integração entre esses domínios

## 9. Arquitetura da API de administração

A API de Administração disponibiliza rotas personalizadas dedicadas ao monitoramento de renovações e a ações operacionais.

Rotas de leitura implementadas:
- `GET /admin/renewals`
- `GET /admin/renewals/:id`

Rotas de mutação implementadas:
- `POST /admin/renewals/:id/force`
- `POST /admin/renewals/:id/approve-changes`
- `POST /admin/renewals/:id/reject-changes`

A camada de API utiliza:
- validadores Zod
- solicitações administrativas autenticadas
- auxiliares de consulta para leituras
- fluxos de trabalho para mutações

## 10. Arquitetura da interface de usuário administrativa

A interface de usuário administrativa está implementada como rotas personalizadas do Medusa Admin aninhadas sob `Subscriptions`.

Telas atuais:
- página da fila de renovações
- página de detalhes do ciclo de renovação

### Página da fila

A página da fila foi criada com o Medusa `DataTable`.

Oferece suporte a:
- paginação
- pesquisa
- filtros
- ordenação
- navegação por linha para detalhes
- intervalo de datas programado por padrão ao carregar a página

Arquivo de rota implementado:
- `src/admin/routes/subscriptions/renewals/page.tsx`

### Página de detalhes

A página de detalhes contém:
- visão geral do ciclo
- resumo de aprovações
- resumo da assinatura
- resumo dos pedidos gerados
- alterações pendentes
- histórico de tentativas
- metadados técnicos
- menu de ações com `force`, `approve` e `reject`

Os fluxos de decisão utilizam “Drawers” e solicitações de confirmação no estilo padrão do Medusa.

Arquivo de rota implementado:
- `src/admin/routes/subscriptions/renewals/[id]/page.tsx`

## 11. Estratégia de invalidação de consultas

A interface de usuário administrativa utiliza invalidação explícita para consultas à lista de renovações e aos detalhes.

Após uma alteração bem-sucedida:
- a consulta à lista de renovações é invalidada
- a consulta aos detalhes da renovação é invalidada

Isso mantém o estado da fila e o estado dos detalhes sincronizados após as ações do operador.

Detalhes da implementação:
- as consultas de exibição de lista e detalhes estão centralizadas em `src/admin/routes/subscriptions/renewals/data-loading.ts`
- a invalidação é compartilhada por meio de `invalidateAdminRenewalsQueries(...)`
- as abas de aprovação utilizam o estado local do formulário e os dados de detalhes já carregados, em vez de uma consulta de exibição remota separada

## 12. Tratamento de erros e carregamento

A interface do usuário `Renewals` segue o gerenciamento de estados no estilo Medusa:
- a fila utiliza os estados de carregamento e vazio do DataTable
- a página de detalhes exibe estados explícitos de carregamento e erro
- as abas de decisão exibem estados locais de carregamento e de erro embutidos
- ações de risco exigem a confirmação do operador

Isso mantém os dados de exibição separados do estado do formulário exclusivo da gaveta e está de acordo com os padrões de experiência do usuário (UX) do Admin já utilizados em outras partes do plug-in.

## 13. Estratégia de testes

`Renewals` são protegidos por meio de:
- testes de integração de módulos
- testes de integração HTTP para auxiliares de consulta, fluxos de trabalho e rotas
- um teste de integração do fluxo de administração
- um teste de integração de nível básico em relação a `Subscriptions` e `Plans & Offers`

Arquivos de teste implementados:
- `src/modules/renewal/__tests__/service.spec.ts`
- `integration-tests/http/renewals-workflows.spec.ts`
- `integration-tests/http/renewals-routes.spec.ts`
- `integration-tests/http/renewals-admin-flow.spec.ts`
- `integration-tests/http/renewals-smoke.spec.ts`

Documentos relacionados:
- [API de renovações do administrador](../api/admin-renewals.md)
- [Interface do usuário de renovações do administrador](../admin/renewals.md)
- [Testes de renovações](../testing/renewals.md)
- [Especificações de renovações](../specs/renewals/admin-spec.md)
