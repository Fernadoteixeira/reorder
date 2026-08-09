# Arquitetura do Registro de Atividades

Este documento descreve os limites arquitetônicos implementados para a área `Activity Log` no plug-in `Reorder`.

É a fonte de verdade em tempo de execução para:
- regras de propriedade e de fonte de verdade
- contrato de eventos e taxonomia
- limites dos caminhos de gravação e leitura
- retenção e considerações operacionais

## Objetivo

A área `Activity Log` fornece um histórico de auditoria unificado, voltado para os operadores, para eventos de negócios relacionados a assinaturas em todo o plug-in.

Seu objetivo é:
- mostrar eventos importantes do ciclo de vida de uma assinatura em um único local
- fornecer aos operadores um histórico de auditoria claro em diversas áreas do comércio recorrente
- dar suporte a futuras visualizações de lista, detalhes e linha do tempo no painel de administração

Seu objetivo não é substituir os modelos de domínio de origem que já possuem seu próprio estado de negócios.

## Função de arquitetura

`Activity Log` é uma camada de auditoria empresarial dedicada, apenas para adição de dados.

Ele deve agregar eventos importantes relacionados à assinatura emitidos por:
- `Subscriptions`
- `Plans & Offers`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`

A principal decisão arquitetônica é:

- `Activity Log` é a trilha de auditoria canônica, do tipo “somente acréscimo”, para eventos de negócios voltados para operadores relacionados a uma assinatura.
- `Activity Log` não é a fonte de verdade para o estado do domínio de propriedade dos módulos existentes.

Isso significa que o registro é uma visão de auditoria entre domínios, e não um substituto para os agregados existentes.

## Limites de propriedade

O modelo atual de propriedade do plug-in permanece inalterado.

`Subscriptions` continua sendo a fonte de referência para:
- estado do ciclo de vida da assinatura
- campos de cadência e programação de renovação
- endereço de entrega e concretização de alterações pendentes no plano

`Plans & Offers` continua sendo a fonte de referência para:
- configuração da oferta de assinatura
- frequências de cobrança permitidas
- regras da oferta e resolução efetiva da política

`Renewals` continua sendo a fonte de referência para:
- o estado de execução do ciclo de renovação
- o histórico de tentativas de renovação
- as decisões de aprovação e os resultados da execução

`Dunning` continua sendo a fonte de referência para:
- status da cobrança de pagamentos
- cronograma de novas tentativas
- histórico de tentativas de cobrança
- resultados de cobranças bem-sucedidas e malsucedidas

O `Cancellation & Retention` continua sendo a fonte de referência para:
- estado do processo de cancelamento
- histórico de ofertas de retenção
- motivo da saída e resultado final do cancelamento

`Activity Log` não retira a propriedade de nenhum dos módulos acima.

## Relação com os campos de auditoria e metadados existentes

O plug-in já armazena dados voltados para auditoria dentro de módulos específicos do domínio.

Entre os exemplos estão:
- campos explícitos do ator, como `finalized_by`, `decided_by` e campos relacionados à aprovação
- metadados `manual_actions`, que só podem ser acrescentados, em `Cancellation & Retention`
- histórico de renovações e tentativas de cobrança
- metadados específicos do fluxo de trabalho e contexto de operações manuais

Esses campos continuam válidos e devem permanecer nos módulos aos quais pertencem.

A função arquitetônica do `Activity Log` é diferente:
- os módulos de domínio mantêm um contexto de auditoria detalhado e específico do módulo
- o `Activity Log` fornece uma trilha de auditoria unificada entre domínios para os operadores

Isso significa que:
- `Activity Log` pode resumir ou fazer referência a resultados importantes desses módulos
- não deve substituir o histórico detalhado de tentativas nem os metadados específicos de cada módulo
- não deve se tornar um depósito de todos os campos internos ou valores de diagnóstico

## Trilha de auditoria empresarial x Registro operacional

O plug-in já utiliza registros operacionais estruturados e métricas de resumo do agendador em áreas como `Renewals`, `Dunning` e `Cancellation & Retention`.

Esses registros operacionais continuam sendo uma questão à parte.

`Activity Log` deve conter apenas eventos relevantes para os negócios e voltados para os operadores, tais como:
- assinatura criada, pausada, retomada, cancelada
- alteração de plano agendada ou aplicada
- endereço de entrega atualizado
- próxima entrega ignorada
- tentativa de renovação, bem-sucedida, malsucedida
- processo de cobrança iniciado, repetido, recuperado, não recuperado
- processo de cancelamento iniciado
- oferta de retenção aplicada
- cancelamento finalizado

`Activity Log` não deve conter ruídos operacionais ou de diagnóstico de baixo nível, tais como:
- sinais de vida do agendador e resumos de lotes
- diagnósticos de aquisição de bloqueios
- detalhes internos de repetição de tentativas e saídas de depuração em nível de etapa
- erros de infraestrutura ou da camada de transporte
- detalhes confidenciais de pagamento

Essas questões devem constar em registros estruturados, ferramentas de observabilidade e métricas operacionais, e não na trilha de auditoria da empresa.

## Regras de Limite do Medusa

A decisão segue as regras da arquitetura modular do Medusa:
- os módulos de domínio permanecem isolados
- a coordenação de negócios entre módulos ocorre nos fluxos de trabalho
- os modelos de leitura podem agregar dados para a Administração sem transferir a propriedade entre módulos

Para `Activity Log`, isso significa:
- as entradas de log devem ser criadas a partir de caminhos de mutação baseados em fluxos de trabalho
- os serviços dos módulos devem manter o controle sobre seu próprio estado
- a futura camada de leitura do Admin poderá agregar eventos entre domínios, mas não deve redefinir a propriedade dos domínios

## Contrato de Registro de Eventos

`Activity Log` armazena um registro de gravação exclusiva por evento de assinatura relevante para os negócios.

O contrato de eventos lógicos é:
- `id`
- `subscription_id`
- `customer_id`
- `event_type`
- `actor_type`
- `actor_id`
- `previous_state`
- `new_state`
- `changed_fields`
- `reason`
- `metadata`
- `created_at`

### Semântica de campos

`id`
- identificador exclusivo do evento

`subscription_id`
- obrigatório
- o registro é centrado no ciclo de vida de uma assinatura

`customer_id`
- opcional, mas armazenado de forma persistente quando conhecido
- usado para filtragem administrativa e consultas de auditoria no nível do cliente

`event_type`
- obrigatório
- um nome de evento de domínio estável da taxonomia definida abaixo

`actor_type`
- obrigatório
- indica quem ou o que desencadeou o evento
- valores planejados atuais:
  - `user`
  - `customer`
  - `system`
  - `scheduler`

`actor_id`
- opcional
- armazena o ID do usuário administrador ou outro identificador do agente, quando disponível

`previous_state`
- resumo JSON opcional
- armazena apenas o estado relevante para o evento antes da mutação
- não deve conter cópias brutas completas dos agregados proprietários

`new_state`
- resumo JSON opcional
- armazena apenas o estado relevante para o evento após a mutação
- não deve conter cópias brutas completas dos agregados proprietários

`changed_fields`
- comparação estruturada opcional
- deve capturar uma representação compacta do “antes” e “depois” dos campos que foram alterados
- formato pretendido:
  - matriz de entradas no nível do campo, como `field`, `before`, `after`

`reason`
- motivo opcional voltado para o cliente ou para o operador
- por exemplo, motivo da aprovação, motivo da decisão de retenção ou motivo do cancelamento manual

`metadata`
- JSON opcional
- usado para referências estáveis e contexto técnico limitado, como:
  - `renewal_cycle_id`
  - `dunning_case_id`
  - `cancellation_case_id`
  - `retention_offer_event_id`
  - `order_id`
  - `correlation_id`
- não deve conter detalhes confidenciais de pagamento ou cargas de diagnóstico ilimitadas

`created_at`
- carimbo de data e hora do evento (obrigatório)

## Regras estaduais sobre carga útil

O registro do evento deve permanecer estável e legível para o operador ao longo do tempo.

Por isso, `previous_state`, `new_state` e `changed_fields` devem seguir estas regras:
- armazenar pequenos resumos específicos de eventos, e não instantâneos completos das entidades
- incluir apenas os campos necessários para explicar o que mudou
- evitar copiar objetos de domínio grandes e aninhados
- evitar o vazamento de dados confidenciais de pagamento ou de infraestrutura

Exemplos de bons resumos de estado no nível do evento:
- status antes e depois de uma pausa ou retomada
- alteração de plano pendente antes e depois da decisão de aprovação
- programação de nova tentativa antes e depois da intervenção manual

Exemplos de dados que devem permanecer fora da carga útil do estado do evento:
- matrizes com o histórico completo de tentativas
- instantâneos completos de assinaturas
- cargas úteis completas de pedidos
- diagnósticos brutos do provedor

## Taxonomia de tipos de eventos

O `Activity Log` deve utilizar uma taxonomia estável e explícita, agrupada por prefixo de domínio.

### Eventos de assinatura

- `subscription.created`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`
- `subscription.plan_change_scheduled`
- `subscription.shipping_address_updated`
- `subscription.next_delivery_skipped`

### Eventos de renovação

- `renewal.cycle_created`
- `renewal.approval_approved`
- `renewal.approval_rejected`
- `renewal.force_requested`
- `renewal.succeeded`
- `renewal.failed`

### Eventos de cobrança

- `dunning.started`
- `dunning.retry_executed`
- `dunning.recovered`
- `dunning.unrecovered`
- `dunning.retry_schedule_updated`

### Eventos de cancelamento e retenção

- `cancellation.case_started`
- `cancellation.offer_applied`
- `cancellation.reason_updated`
- `cancellation.finalized`

## Modelo físico

O modelo de armazenamento implementado é `subscription_log`.

Ele pertence ao módulo específico `activity-log` e, do ponto de vista comercial, permanece apenas para gravação.

O registro é mantido:
- campos de identidade principal e de filtro
- resumos compactos de estado
- `changed_fields` estruturado
- referências limitadas a metadados
- instantâneos de exibição para caminhos de leitura do administrador
- `dedupe_key` para gravações idempotentes respaldadas por fluxo de trabalho

O modelo não armazena intencionalmente:
- instantâneos agregados completos
- cargas úteis completas de pagamento
- ruído técnico de observabilidade
- hidratação do modelo de leitura por links diretos

## Caminho de gravação

Os eventos de negócios são definidos a partir de caminhos de mutação baseados em fluxos de trabalho.

O fluxo de gravação implementado é:
1. o fluxo de trabalho do domínio altera o estado da fonte de verdade
2. o fluxo de trabalho cria uma carga de auditoria de negócios normalizada
3. `create-subscription-log-event` armazena um registro `subscription_log` que só permite acréscimos

As regras de normalização estão centralizadas no auxiliar compartilhado de registro de atividades e abrangem:
- compactação de `previous_state` e `new_state`
- `changed_fields`
- supressão de dados confidenciais
- lista de permissões para `metadata`
- `dedupe_key` determinístico

A idempotência é garantida por meio de:
- `dedupe_key` determinístico
- proteção por índice único
- semântica de criação com tratamento de conflitos na etapa central de gravação

## Caminho de leitura

O modelo de leitura implementado prioriza os instantâneos e está otimizado para o Admin.

Caminhos de leitura atualmente suportados:
- lista global de administradores
- detalhes de um evento
- linha do tempo por assinatura

A lista global e a linha do tempo são lidas principalmente a partir do próprio `subscription_log`.

A visualização detalhada retorna a carga útil completa do evento a partir do mesmo registro:
- `previous_state`
- `new_state`
- `changed_fields`
- `metadata`

O modelo de leitura evita intencionalmente um enriquecimento pesado em tempo de execução entre módulos para a experiência básica.

Isso mantém a trilha de auditoria:
- historicamente estável
- de leitura rápida
- resistente a alterações posteriores nas entidades de domínio vinculadas

## Limite administrativo

A experiência do administrador foi dividida intencionalmente em duas interfaces:
- uma página dedicada `Activity Log` para operações entre assinaturas
- uma seção `Activity Log` na página de detalhes da assinatura para revisão por assinatura

Ambas as superfícies utilizam os mesmos contratos de API do tipo “snapshot-first” e os mesmos registros `subscription_log` subjacentes.

A interface de usuário administrativa não define novas semânticas de negócios.

Sua função é apresentar:
- filtragem
- classificação
- paginação
- detalhamento de informações
- análise da linha do tempo de assinaturas

## Política de retenção

`Activity Log` é tratado como um registro de auditoria comercial, e não como dados de telemetria de curta duração.

A política de retenção atual para a v1 é:
- sem eliminação automática
- sem tarefa de limpeza baseada em tempo
- sem política de arquivamento silencioso em segundo plano

Fundamentação:
- a utilidade da auditoria depende da continuidade histórica
- a carga útil é intencionalmente compacta
- as regras operacionais de limpeza devem ser explícitas e implementadas separadamente, caso sejam introduzidas posteriormente

Caso surja uma exigência futura de retenção, ela deverá ser implementada como um recurso de manutenção específico, com:
- um período de retenção explícito;
- regras claras de arquivamento ou eliminação;
- documentação e orientações de implementação específicas.

## Monitoramento e Desempenho

Do ponto de vista operacional, deve-se observar o seguinte para `Activity Log`:
- crescimento do número de linhas em `subscription_log`
- volume de eventos por dia e por semana
- tempo de resposta para:
  - `GET /admin/subscription-logs`
  - `GET /admin/subscription-logs/:id`
  - `GET /admin/subscriptions/:id/logs`
- comportamento das consultas em relação a:
  - `subscription_id`
  - `customer_id`
  - `event_type`
  - `created_at`

Premissas operacionais atuais:
- a lista principal e a linha do tempo são paginadas
- a ordenação padrão é `created_at desc`
- os índices atuais são suficientes para a carga de trabalho esperada da v1

Sinais que devem desencadear uma revisão:
- lentidão perceptível nas consultas à lista global
- lentidão perceptível nas consultas à linha do tempo de assinaturas
- aumentos significativos no volume de `subscription_log` causados pela emissão de eventos irrelevantes
- pressão para ampliar a pesquisa ou o enriquecimento além do atual modelo que prioriza os snapshots

## Não-objetivos

A implementação atual do `Activity Log` não tem como objetivo fornecer:
- telemetria de uso geral
- diagnósticos de pagamento no nível do provedor
- instantâneos históricos completos de agregados de domínio
- limpeza automática de dados retidos
- ferramentas de exportação
- filtros salvos ou personalização no nível do usuário

Essas áreas são melhorias futuras e não fazem parte do contrato de arquitetura da v1.

## Decisão sobre o escopo para planos e ofertas

`Plans & Offers` fazem parte do ambiente de execução do comércio recorrente, mas não devem introduzir eventos de configuração global independentes no `Activity Log` centrado em assinaturas da v1.

Fundamentação:
- `Activity Log` está centrado em uma assinatura
- `Plans & Offers` gerencia principalmente a configuração no nível do produto ou da variante
- as operações de criação, atualização e ativação/desativação na configuração da oferta não são, por natureza, eventos de uma assinatura específica

Portanto, a decisão atual sobre o escopo é:
- não adicionar eventos `plan-offer.*` independentes ao `Activity Log` v1
- capturar o efeito da configuração do plano sobre a assinatura por meio de eventos de assinatura e renovação

Exemplos:
- uma alteração futura solicitada em uma assinatura é representada por `subscription.plan_change_scheduled`
- o sucesso ou a falha na renovação após a validação da apólice é representado por eventos de renovação

Caso os requisitos de auditoria de configuração venham a se tornar importantes no futuro, eles devem ser modelados como uma trilha de auditoria de configuração separada, em vez de serem incorporados ao fluxo de atividades por assinatura.

## Modelo de dados do SubscriptionLog

A futura área `Activity Log` deverá utilizar um modelo de dados personalizado dedicado denominado `subscription_log`.

Este modelo foi projetado para ser:
- somente de adição
- centrado em assinaturas
- otimizado para leituras da lista de administração, detalhes e linha do tempo por assinatura

Não se destina a se tornar um barramento de eventos generalizado nem uma área de armazenamento para diagnósticos operacionais.

O proprietário de tempo de execução desse modelo é o módulo personalizado dedicado do Medusa:
- `src/modules/activity-log`

O módulo expõe:
- `ACTIVITY_LOG_MODULE = "activityLog"`
- o modelo de dados `subscription_log`
- o serviço do módulo utilizado posteriormente pelos fluxos de trabalho e pelos auxiliares de leitura do Admin

## Semântica de apenas adição

`subscription_log` deve ser tratado como uma entidade apenas para adição.

Isso significa que:
- cada evento de negócios gera um registro de log
- os registros existentes não são editados como parte do fluxo normal de negócios
- a evolução do estado é representada por novas entradas no log, e não pela modificação das entradas mais antigas

Isso mantém a trilha de auditoria estável e compreensível para os operadores.

A regra de “somente adição” é especialmente importante porque o log tem como objetivo descrever eventos comerciais históricos, e não a propriedade atual do domínio.

## Campos físicos propostos

O modelo deve armazenar os seguintes campos:

- `id`
- `subscription_id`
- `customer_id`
- `event_type`
- `actor_type`
- `actor_id`
- `subscription_reference`
- `customer_name`
- `product_title`
- `variant_title`
- `previous_state`
- `new_state`
- `changed_fields`
- `reason`
- `metadata`

Também estão presentes campos automáticos do Medusa:
- `created_at`
- `updated_at`
- `deleted_at`

### Campos principais de filtragem

Os principais campos de filtragem e linha do tempo do Admin são:
- `subscription_id`
- `customer_id`
- `event_type`
- `created_at`

Essas devem ser colunas escalares de primeira classe, e não valores ocultos dentro de JSON.

### Campos JSON

O modelo deve utilizar campos JSON para:
- `previous_state`
- `new_state`
- `changed_fields`
- `metadata`

Esses campos JSON se justificam porque armazenam cargas úteis específicas de cada evento, que podem variar de acordo com o tipo de evento.

No entanto, eles devem permanecer compactos e limitados:
- sem cópias completas de agregados
- sem matrizes de histórico de tentativas
- sem cargas úteis brutas de provedores de pagamento
- sem dumps de diagnóstico de grande porte

## Exibir decisão sobre o instantâneo

O modelo `subscription_log` deve armazenar um pequeno conjunto de campos de instantâneo voltados para exibição diretamente no registro:
- `subscription_reference`
- `customer_name`
- `product_title`
- `variant_title`

Esta é a decisão recomendada para o `Activity Log` v1.

### Por que armazenar miniaturas de telas pequenas

A trilha de auditoria deve permanecer legível mesmo que as entidades vinculadas atualmente venham a sofrer alterações posteriormente.

Por exemplo:
- o nome de exibição de um cliente pode mudar
- o título de um produto ou variante pode mudar
- os rótulos relacionados às assinaturas podem sofrer alterações após a ocorrência do evento

Se o registro de administração se baseasse apenas no enriquecimento atual, os eventos históricos poderiam se tornar enganosos.

Pequenos instantâneos resolvem esse problema sem precisar copiar todo o agregado da assinatura.

### Por que não armazenar instantâneos completos das entidades?

O plugin atual já utiliza instantâneos nos casos em que são operacionalmente necessários, especialmente em `Subscriptions`.

Para o `Activity Log`, um snapshot completo seria desnecessário e muito pesado porque:
- o log é focado em eventos, e não em agregados
- a maioria das linhas da lista de administração precisa apenas de alguns rótulos de exibição estáveis
- snapshots grandes criariam desvio de esquema e pressão por duplicação

Portanto, a regra acordada é:
- armazenar alguns campos estáveis de instantâneos de exibição como colunas escalares
- manter os detalhes de alterações específicas de eventos em campos JSON compactos
- recorrer ao enriquecimento no momento da consulta apenas para detalhes contextuais opcionais, e não para os rótulos essenciais de auditoria

## Estratégia de indexação

A estratégia inicial de indexação deve seguir o padrão existente do plug-in de índices escalares pragmáticos.

Índices de coluna única obrigatórios:
- `subscription_id`
- `customer_id`
- `event_type`
- `created_at`

Índices compostos obrigatórios:
- `subscription_id + created_at`
- `customer_id + created_at`
- `event_type + created_at`

## Âmbito das emissões do fluxo de trabalho

As entradas `Activity Log` são geradas a partir de caminhos de mutação baseados em fluxos de trabalho, e não diretamente a partir de rotas ou auxiliares técnicos de baixo nível.

Para `Cancellation & Retention`, o escopo atual de emissão do evento de negócios é:
- `start-cancellation-case` -> `cancellation.case_started`
- `apply-retention-offer` -> `cancellation.offer_applied`
- `update-cancellation-reason` -> `cancellation.reason_updated`
- `finalize-cancellation` -> `cancellation.finalized`

Essas entradas têm como objetivo resumir os resultados do fluxo de cancelamento do ponto de vista do operador.

Eles não substituem o contexto de auditoria local do módulo, mais detalhado, armazenado no próprio domínio de cancelamento, como:
- `finalized_by`
- `decided_by`
- `manual_actions`
- histórico de eventos de oferta
- metadados detalhados do caso

Esses registros detalhados do processo continuam sendo a fonte de referência dentro do `Cancellation & Retention`.

`Activity Log` armazena apenas um resumo compacto entre domínios, adequado para a linha do tempo do administrador e as visualizações de auditoria.

## Modelo de leitura do administrador

O `Activity Log` deve disponibilizar um modelo de leitura exclusivo para administradores, separado dos caminhos de gravação do serviço do módulo.

A estrutura recomendada segue o mesmo padrão já utilizado nas outras áreas de administração do plug-in:
- auxiliares dedicados para leitura/consulta
- DTOs dedicados para a administração
- composição de leitura fora do serviço principal de gravação do módulo

O modelo de leitura deve oferecer suporte a três caminhos de consulta:
- lista global de registros
- detalhes de um único registro
- linha do tempo por assinatura

## Lista global de registros

A lista global destina-se à futura página de administração `Activity Log`.

Seu objetivo é oferecer suporte a:
- navegação em auditorias de operadores com grande volume de sinais;
- filtragem por assinaturas e clientes;
- paginação e ordenação cronológica decrescente por padrão

A lista recomendada de DTOs inclui:
- `id`
- `subscription_id`
- `subscription_reference`
- `customer_id`
- `customer_name`
- `event_type`
- `actor_type`
- `actor_id`
- `reason`
- `created_at`
- compact `change_summary`

### Filtros da lista

O caminho de leitura da lista deve suportar:
- `subscription_id`
- `customer_id`
- `event_type[]`
- `actor_type[]`
- `date_from`
- `date_to`
- texto livre `q`

A pesquisa de texto livre deve ser limitada aos campos fixos destinados aos operadores:
- `subscription_reference`
- `customer_name`
- `reason`

### Classificação e paginação de listas

A ordenação padrão deve ser:
- `created_at desc`

A paginação deve seguir o padrão de administração do plugin:
- `limit`
- `offset`
- `count`

A lista global deve ser lida diretamente de `subscription_log` e não deve exigir o enriquecimento dinâmico vinculado para exibir linhas úteis.

## Detalhes do registro

O caminho de leitura dos detalhes do log destina-se à análise detalhada a partir da tabela “Admin” ou da linha do tempo.

O DTO de detalhes deve expor toda a carga útil do evento:
- `id`
- `subscription_id`
- `customer_id`
- `event_type`
- `actor_type`
- `actor_id`
- exibir campos do snapshot
- `previous_state`
- `new_state`
- `changed_fields`
- `reason`
- `metadata`
- `created_at`

A visualização detalhada pode, opcionalmente, incluir um breve resumo vinculado à assinatura relacionada, mas esse enriquecimento deve ser intencionalmente sucinto.

Resumo vinculado opcional recomendado:
- `subscription_id`
- `subscription_reference`
- assinatura atual `status`

O caminho de leitura de detalhes não deve atualizar antecipadamente o estado atual de `renewal`, `dunning` ou `cancellation`, pois isso misturaria os dados históricos de auditoria com o estado atual de tempo de execução entre módulos.

## Cronograma por assinatura

A linha do tempo por assinatura destina-se a ser incorporada na interface de administração `Subscriptions`.

Ela deve utilizar os mesmos registros de eventos subjacentes da lista global, mas filtrados por um `subscription_id`.

O DTO de linha do tempo pode reutilizar o DTO de lista com os mesmos campos principais:
- `id`
- `event_type`
- `actor_type`
- `actor_id`
- `reason`
- `created_at`
- `change_summary`
- exibir campos do instantâneo quando necessário

A linha do tempo deve suportar:
- o valor padrão `created_at desc`
- ordem ascendente opcional posteriormente, se necessário para a reprodução da linha do tempo

O agrupamento na linha do tempo, os emblemas e a lógica de apresentação pertencem à camada da interface do usuário, e não ao modelo de leitura.

## Decisão sobre o enriquecimento

A decisão final sobre o modelo de leitura para o `Activity Log` v1 é:
- usar os dados de exibição do `snapshot-first`
- permitir o enriquecimento opcional de luz apenas quando for claramente necessário

Isso significa que:
- a lista principal e a linha do tempo devem ser renderizadas apenas a partir de `subscription_log`
- os rótulos exibidos provêm de campos de instantâneos armazenados
- uma consulta vinculada opcional pode ser adicionada para facilitar a visualização dos detalhes, mas não constitui a base do modelo de leitura

### Por que priorizar o snapshot

A trilha de auditoria deve permanecer historicamente estável.

Se as entidades vinculadas atualmente mudarem com o tempo:
- os nomes dos clientes podem mudar
- os nomes dos produtos podem mudar
- os nomes das variantes podem mudar
- os rótulos relacionados às assinaturas podem sofrer alterações

O uso dos campos do snapshot como primeira fonte preserva o que os operadores deveriam ter visto no momento do evento.

### Por que não um enriquecimento totalmente interligado?

Um enriquecimento com muitas ligações criaria vários problemas:
- enfraqueceria a natureza histórica da trilha de auditoria
- introduziria um acoplamento desnecessário entre módulos nas consultas do Admin
- tornaria a lista e a linha do tempo mais pesadas do que o necessário

Portanto, a regra acordada é:
- a lista e a linha do tempo priorizam os instantâneos e são locais à tabela
- os detalhes podem utilizar um leve enriquecimento por conveniência
- o estado atual do domínio permanece sob a responsabilidade de seus módulos originais

Fundamentação:
- `subscription_id + created_at` oferece suporte à linha do tempo por assinatura
- `customer_id + created_at` oferece suporte a futuras consultas de auditoria no nível do cliente
- `event_type + created_at` oferece suporte à filtragem operacional no Admin
- `created_at` oferece suporte à navegação padrão em ordem cronológica inversa

O modelo inicial não deve adicionar índices JSON.

Fundamentação:
- os caminhos de consulta primários esperados são escalares e baseados em tempo
- a indexação JSON aumentaria a complexidade antes que haja evidências concretas de consultas
- a filtragem da carga útil dos eventos não é um requisito primário da v1

## Módulo e estratégia de migração

O `subscription_log` deve estar em um módulo personalizado dedicado chamado `activity-log`.

O padrão de execução deve estar de acordo com as convenções atuais dos plug-ins:
- modelo de dados dedicado
- serviço de módulo dedicado
- migrações dedicadas
- referências escalares a domínios externos, em vez de propriedade direta entre módulos

Status atual da implementação:
- o esqueleto do módulo existe em `src/modules/activity-log`
- o modelo, o serviço e a exportação do módulo estão definidos
- a migração inicial e o snapshot do módulo agora estão em `src/modules/activity-log/migrations`

A primeira migração do módulo deve:
- criar a tabela `subscription_log`
- criar os índices escalares e compostos listados acima
- utilizar o padrão de índice parcial padrão do Medusa, `deleted_at`

Status atual da implementação:
- a migração gerada cria a tabela `subscription_log`
- a migração gerada inclui os índices escalares necessários
- a migração gerada inclui os índices compostos “timeline” e “Admin filter”
- a migração gerada inclui um índice único para `dedupe_key`
- a aplicação da migração ao banco de dados continua sendo uma etapa separada no nível do aplicativo

## Limite do Auxiliar de Normalização

Antes que os registros de eventos sejam gravados, eles devem passar por um auxiliar de normalização compartilhado pertencente ao módulo `activity-log`.

O helper é responsável por:
- construir um `changed_fields` compacto a partir de `previous_state` e `new_state`
- ocultar valores confidenciais das cargas úteis do estado dos eventos
- filtrar `metadata` para reduzir a lista a uma lista de permissões estável
- anexar `correlation_id` quando já houver um no fluxo de chamada
- gerar um `dedupe_key` determinístico

O helper é, intencionalmente:
- síncrono
- livre de efeitos colaterais
- independente do contêiner Medusa

Isso permite que o modelamento da carga útil seja reutilizável em diferentes fluxos de trabalho, sem misturar a lógica de normalização com a lógica de persistência.

### Regras de supressão

O helper deve remover ou excluir valores confidenciais das cargas de estado e dos metadados.

As categorias protegidas atualmente incluem:
- linhas completas de endereço de entrega
- números de telefone
- contexto de pagamento e referências de pagamento
- cargas úteis brutas de provedores
- rastreamentos de pilha e diagnósticos de baixo nível

O objetivo é preservar o significado comercial voltado para o operador, sem transformar o `Activity Log` em um espaço de armazenamento para dados confidenciais ou técnicos de baixo nível.

### Regras-chave para a deduplicação

O auxiliar deve gerar `dedupe_key` de forma determinística a partir de:
- `event_type`
- um escopo de domínio
- um identificador de domínio de destino
- um qualificador de evento opcional

Isso permite que as gravações posteriores, realizadas por meio do fluxo de trabalho, permaneçam idempotentes mesmo em caso de novas tentativas.

## Etapa de gravação do fluxo de trabalho central

O futuro caminho de gravação deve utilizar uma etapa central do fluxo de trabalho para a persistência:
- `create-subscription-log-event`

Esta etapa é responsável apenas por:
- receber uma carga útil de evento normalizada e compatível com o fluxo de trabalho
- verificar se existe um registro para `dedupe_key`
- criar um novo registro de `subscription_log` somente quando necessário
- retornar dados de remuneração que distingam `created` de `existing`

### Regra da idempotência

A etapa deve tratar `dedupe_key` como a chave de idempotência lógica principal.

Estratégia atual de gravação:
- leitura feita por `dedupe_key`
- se houver um registro, reutilizá-lo
- se não houver nenhum registro, criar um

O índice exclusivo do banco de dados em `dedupe_key` continua sendo a última linha de defesa contra gravações duplicadas.

### Regra de remuneração

A função de compensação desta etapa deve excluir apenas os registros criados pela execução atual do fluxo de trabalho.

Não deve excluir:
- registros de log já existentes;
- registros devolvidos porque o caminho de gravação encontrou uma duplicata idempotente

O modelo não deve introduzir chaves estrangeiras rígidas em outros módulos.

Isso segue o mesmo limite prático já utilizado em:
- `renewal_cycle`
- `dunning_case`
- `cancellation_case`

Essas áreas mantêm identificadores escalares e utilizam o enriquecimento no momento da consulta, em vez da propriedade entre módulos no nível do SQL.

## Escopo atual das emissões de renovação

A integração atual do `Renewals` emite eventos `Activity Log` apenas para resultados finais relevantes para os negócios e decisões dos operadores.

Eventos de renovação implementados:
- `renewal.approval_approved`
- `renewal.approval_rejected`
- `renewal.force_requested`
- `renewal.succeeded`
- `renewal.failed`

Limites de emissão:
- as decisões de aprovação são emitidas a partir dos fluxos de trabalho de aprovação
- a execução manual forçada só é emitida após a solicitação de execução forçada passar pela validação de domínio
- a execução da renovação emite apenas o resultado final `succeeded` ou `failed`

Os seguintes itens permanecem fora do `Activity Log` e ficam restritos apenas à observabilidade de renovação:
- aquisição e liberação do bloqueio do fluxo de trabalho
- criação de tentativas e mecanismos internos de processamento de tentativas
- mecanismos internos da sessão de pagamento e do provedor de pagamento
- agendador estruturado e diagnósticos de execução forçada
- casos de execução bloqueada, como `already_processing` e `duplicate_execution`

Isso mantém o fluxo de atividades de renovação compreensível para o operador, ao mesmo tempo em que preserva o rastreamento operacional detalhado em `src/modules/renewal/utils/observability.ts`.

## Resumo

O limite acordado para `Activity Log` é:

- trata-se de um registro de auditoria comercial canônico, do tipo “somente adição”, para eventos relacionados a assinaturas
- não é a fonte de verdade para o status de assinatura, renovação, cobrança ou cancelamento
- os campos e históricos de auditoria locais dos módulos existentes permanecem em vigor
- os logs operacionais estruturados permanecem separados do registro de auditoria comercial
- o registro de eventos entre domínios deve ocorrer por meio da orquestração de fluxos de trabalho, em conformidade com os padrões do Medusa
- os registros de eventos devem permanecer compactos, estáveis e legíveis pelo operador;
- alterações na configuração do `Plans & Offers` estão fora do escopo dos eventos independentes do `Activity Log` v1;
- o `subscription_log` deve ser um modelo dedicado de apenas acréscimo, com campos de filtro escalares e cargas JSON compactas;
- o `subscription_log` deve armazenar pequenos instantâneos da tela de administração diretamente no registro
