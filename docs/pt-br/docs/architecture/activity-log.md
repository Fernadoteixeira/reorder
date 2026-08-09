# Arquitetura do log de atividades

Este documento descreve o limite arquitetônico implementado para a área `Activity Log` no plugin `Reorder`.

É a fonte da verdade em tempo de execução para:
- regras de propriedade e fonte da verdade
- contrato de evento e taxonomia
- escrever caminho e ler limites do caminho
- retenção e considerações operacionais

## Meta

A área `Activity Log` fornece uma trilha de auditoria unificada voltada para o operador para eventos de negócios relacionados a assinaturas em todo o plug-in.

Seu objetivo é:
- mostre eventos importantes do ciclo de vida de uma assinatura em um só lugar
- fornecer aos operadores uma trilha de auditoria legível em diversas áreas de comércio recorrente
- oferecer suporte a visualizações futuras de lista de administradores, detalhes e linha do tempo

Seu objetivo não é substituir os modelos de domínio de origem que já possuem seu próprio estado de negócio.

## Papel arquitetônico

`Activity Log` é uma camada de auditoria de negócios dedicada somente para acréscimos.

Deve agregar eventos importantes relacionados à assinatura emitidos por:
- `Subscriptions`
- `Plans & Offers`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`

A principal decisão arquitetônica é:

- `Activity Log` é a trilha de auditoria canônica somente para acréscimos para eventos de negócios voltados para o operador em torno de uma assinatura.
- `Activity Log` não é a fonte da verdade para o estado do domínio pertencente aos módulos existentes.

Isso significa que o log é uma visualização de auditoria entre domínios e não um substituto para agregações existentes.

## Limites de propriedade

O modelo de propriedade atual do plugin permanece inalterado.

`Subscriptions` continua sendo a fonte da verdade para:
- estado do ciclo de vida da assinatura
- campos de agendamento de cadência e renovação
- endereço de entrega e materialização de alteração de plano pendente

`Plans & Offers` continua sendo a fonte da verdade para:
- configuração da oferta de assinatura
- frequências de cobrança permitidas
- oferecer regras e resolução política eficaz

`Renewals` continua sendo a fonte da verdade para:
- estado de execução do ciclo de renovação
- histórico de tentativas de renovação
- decisões de aprovação e resultados de execução

`Dunning` continua sendo a fonte da verdade para:
- estado de recuperação de pagamento
- agendamento de nova tentativa
- histórico de tentativas de cobrança
- resultados recuperados e não recuperados

`Cancellation & Retention` continua sendo a fonte da verdade para:
- estado do processo de cancelamento
- histórico de ofertas de retenção
- motivo da rotatividade e resultado final do cancelamento

`Activity Log` não retira a propriedade de nenhum dos módulos acima.

## Relação com campos de auditoria e metadados existentes

O plugin já armazena dados orientados para auditoria dentro de módulos específicos de domínio.

Os exemplos incluem:
- campos de ator explícitos, como `finalized_by`, `decided_by` e campos relacionados à aprovação
- metadados `manual_actions` somente anexados em `Cancellation & Retention`
- histórico de tentativas de renovação e cobrança
- metadados específicos do fluxo de trabalho e contexto de operação manual

Esses campos permanecem válidos e devem permanecer nos módulos de sua propriedade.

A função arquitetônica de `Activity Log` é diferente:
- os módulos de domínio mantêm um contexto detalhado de auditoria local do módulo
- `Activity Log` fornece uma trilha de auditoria unificada entre domínios para operadoras

Isso significa:
- `Activity Log` pode resumir ou fazer referência a resultados importantes desses módulos
- não deve substituir o histórico detalhado de tentativas ou metadados específicos do módulo
- não deve tornar-se um depósito de lixo para todos os campos internos ou valores de diagnóstico

## Trilha de auditoria empresarial versus registro operacional

O plug-in já usa registro operacional estruturado e métricas de resumo do agendador em áreas como `Renewals`, `Dunning` e `Cancellation & Retention`.

Esses registros operacionais continuam sendo uma preocupação separada.

`Activity Log` deve conter apenas eventos significativos para os negócios voltados para o operador, como:
- assinatura criada, pausada, retomada, cancelada
- mudança de plano programada ou aplicada
- endereço de entrega atualizado
- próxima entrega ignorada
- tentativa de renovação, sucesso, falha
- cobrança iniciada, repetida, recuperada, não recuperada
- caso de cancelamento iniciado
- oferta de retenção aplicada
- cancelamento finalizado

`Activity Log` não deve conter ruído operacional ou de diagnóstico de baixo nível, como:
- pulsação do agendador e resumos de lote
- diagnóstico de aquisição de bloqueio
- tente novamente os internos e a saída de depuração em nível de etapa
- erros de infraestrutura ou camada de transporte
- detalhes de pagamento confidenciais

Essas preocupações pertencem a registros estruturados, auxiliares de observabilidade e métricas operacionais, e não à trilha de auditoria de negócios.

## Regras de limite da Medusa

A decisão segue as regras de arquitetura modular da Medusa:
- módulos de domínio permanecem isolados
- a coordenação de negócios entre módulos acontece em fluxos de trabalho
- modelos de leitura podem agregar dados para Admin sem transferir propriedade entre módulos

Para `Activity Log`, isso significa:
- as entradas de log devem ser criadas a partir de caminhos de mutação apoiados por fluxo de trabalho
- os serviços do módulo devem continuar possuindo seu próprio estado
- a futura camada de leitura do administrador pode agregar eventos entre domínios, mas não deve redefinir a propriedade do domínio

## Contrato de registro de evento

`Activity Log` armazena um registro somente anexado por evento de assinatura significativo para os negócios.

O contrato de evento lógico é:
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

### Semântica de Campo

`id`
- identificador de evento exclusivo

`subscription_id`
- obrigatório
- o log está centrado em um ciclo de vida de assinatura

`customer_id`
- opcional, mas persistido quando conhecido
- usado para filtragem administrativa e pesquisas de auditoria no nível do cliente

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
- armazena o ID do usuário administrador ou outro identificador de ator, quando disponível

`previous_state`
- resumo JSON opcional
- armazena apenas o estado relevante do evento antes da mutação
- não deve conter cópias brutas completas dos agregados proprietários

`new_state`
- resumo JSON opcional
- armazena apenas o estado relevante do evento após a mutação
- não deve conter cópias brutas completas dos agregados proprietários

`changed_fields`
- comparação estruturada opcional
- deve capturar uma representação compacta antes/depois dos campos que foram alterados
- forma pretendida:
  - matriz de entradas em nível de campo, como `field`, `before`, `after`

`reason`
- motivo opcional voltado para a empresa ou para a operadora
- por exemplo, motivo de aprovação, motivo de decisão de retenção ou motivo de cancelamento manual

`metadata`
- JSON opcional
- usado para referências estáveis e contexto técnico limitado, como:
  - `renewal_cycle_id`
  - `dunning_case_id`
  - `cancellation_case_id`
  - `retention_offer_event_id`
  - `order_id`
  - `correlation_id`
- não deve conter detalhes de pagamento confidenciais ou cargas de diagnóstico ilimitadas

`created_at`
- carimbo de data/hora do evento necessário

## Regras estaduais de carga útil

O registro do evento destina-se a permanecer estável e legível pelo operador ao longo do tempo.

Por isso, `previous_state`, `new_state` e `changed_fields` devem seguir estas regras:
- armazenar pequenos resumos específicos de eventos, não instantâneos completos de entidades
- inclua apenas os campos necessários para explicar o que mudou
- evite copiar grandes objetos de domínio aninhados
- evite o vazamento de dados confidenciais de pagamentos ou infraestrutura

Exemplos de bons resumos de estado em nível de evento:
- status antes e depois de uma pausa ou retomada
- alteração de plano pendente antes e depois da decisão de aprovação
- tentar agendar novamente antes e depois da substituição manual

Exemplos de dados que devem ficar fora da carga útil do estado do evento:
- matrizes completas de histórico de tentativas
- instantâneos completos da assinatura
- cargas úteis de pedidos completos
- diagnóstico bruto do provedor

## Taxonomia do tipo de evento

O `Activity Log` deve usar uma taxonomia explícita e estável agrupada por prefixo de domínio.

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

Ele pertence ao módulo dedicado `activity-log` e, do ponto de vista comercial, permanece apenas para gravação.

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

Raciocínio:
- a utilidade da auditoria depende da continuidade histórica
- a carga útil é intencionalmente compacta
- as regras de limpeza operacional devem ser explícitas e implementadas separadamente, se introduzidas posteriormente

Se surgir um requisito de retenção futuro, ele deverá ser implementado como uma capacidade de manutenção dedicada com:
- uma janela de retenção explícita
- limpar semântica de arquivamento ou eliminação
- documentação separada e orientação de implementação

## Monitoramento e Desempenho

Operacionalmente, o seguinte deve ser observado para `Activity Log`:
- crescimento de linha em `subscription_log`
- volume de eventos por dia e por semana
- tempo de resposta para:
  - `GET /admin/subscription-logs`
  - `GET /admin/subscription-logs/:id`
  - `GET /admin/subscriptions/:id/logs`
- comportamento de consulta em torno de:
  - `subscription_id`
  - `customer_id`
  - `event_type`
  - `created_at`

Premissas operacionais atuais:
- a lista principal e a linha do tempo são paginadas
- a classificação padrão é `created_at desc`
- os índices atuais são suficientes para a carga de trabalho v1 esperada

Sinais que devem desencadear a revisão:
- desaceleração visível nas consultas de listas globais
- desaceleração visível nas consultas de cronograma de assinatura
- grandes aumentos no volume `subscription_log` causados pela emissão de eventos ruidosos
- pressão para ampliar a pesquisa ou o enriquecimento além do atual modelo instantâneo

## Não metas

A implementação atual de `Activity Log` não visa fornecer:
- telemetria de uso geral
- diagnóstico de pagamento em nível de provedor
- instantâneos históricos completos de agregados de domínio
- limpeza automática de retenção
- ferramentas de exportação
- filtros salvos ou personalização em nível de usuário

Essas áreas são melhorias futuras e não fazem parte do contrato arquitetônico v1.

## Decisão de escopo para planos e ofertas

`Plans & Offers` fazem parte do tempo de execução de comércio recorrente, mas não devem introduzir eventos de configuração global autônomos no `Activity Log` centrado em assinatura na v1.

Raciocínio:
- `Activity Log` é centrado em uma assinatura
- `Plans & Offers` gerencia principalmente a configuração no nível do produto ou no nível da variante
- as operações de criação, atualização e alternância na configuração da oferta não são inerentemente eventos de uma assinatura específica

Portanto, a decisão de escopo atual é:
- não adicione eventos `plan-offer.*` independentes a `Activity Log` v1
- capturar o efeito da configuração do plano voltado para a assinatura por meio de eventos de assinatura e renovação

Exemplos:
- uma futura alteração de plano solicitada em uma assinatura é representada por `subscription.plan_change_scheduled`
- o sucesso ou fracasso da renovação após a validação da política é representado por eventos de renovação

Se os requisitos de auditoria de configuração se tornarem importantes posteriormente, eles deverão ser modelados como uma trilha de auditoria de configuração separada, em vez de incluídos no fluxo de atividades por assinatura.

## Modelo de dados SubscriptionLog

A futura área `Activity Log` deve usar um modelo de dados personalizado dedicado chamado `subscription_log`.

Este modelo pretende ser:
- apenas anexar
- centrado em assinatura
- otimizado para leituras de lista de administradores, detalhes e cronograma por assinatura

Não se pretende tornar-se um barramento de eventos generalizado ou uma área de armazenamento para diagnósticos operacionais.

O proprietário do tempo de execução desse modelo é o módulo personalizado Medusa dedicado:
- `src/modules/activity-log`

O módulo expõe:
- `ACTIVITY_LOG_MODULE = "activityLog"`
- o modelo de dados `subscription_log`
- o serviço de módulo usado posteriormente por fluxos de trabalho e auxiliares de leitura de administrador

## Semântica somente para acréscimos

`subscription_log` deve ser tratado como uma entidade somente anexada.

Isso significa:
- um evento de negócios produz um registro de log
- os registros existentes não são editados como parte do fluxo comercial normal
- a evolução do estado é representada por novas entradas de log, não pela mutação das mais antigas

Isto mantém a trilha de auditoria estável e compreensível para os operadores.

A regra somente acréscimo é especialmente importante porque o log se destina a descrever eventos comerciais históricos, e não a propriedade atual do domínio.

## Campos Físicos Propostos

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

Os campos Medusa automáticos também estão presentes:
- `created_at`
- `updated_at`
- `deleted_at`

### Campos principais de filtragem

Os principais campos de filtragem de administrador e linha do tempo são:
- `subscription_id`
- `customer_id`
- `event_type`
- `created_at`

Devem ser colunas escalares de primeira classe, não valores ocultos dentro do JSON.

### Campos JSON

O modelo deve usar campos JSON para:
- `previous_state`
- `new_state`
- `changed_fields`
- `metadata`

Esses campos JSON são justificados porque armazenam cargas específicas de eventos que podem variar de acordo com o tipo de evento.

No entanto, devem permanecer compactos e limitados:
- sem cópias agregadas completas
- sem matrizes de histórico de tentativas
- sem cargas úteis brutas do provedor de pagamento
- sem grandes despejos de diagnóstico

## Exibir decisão de instantâneo

O modelo `subscription_log` deve armazenar um pequeno conjunto de campos de snapshot orientados para exibição diretamente no registro:
- `subscription_reference`
- `customer_name`
- `product_title`
- `variant_title`

Esta é a decisão recomendada para `Activity Log` v1.

### Por que armazenar pequenos instantâneos de exibição

A trilha de auditoria deve permanecer legível mesmo que as entidades atualmente vinculadas sejam alteradas posteriormente.

Por exemplo:
- o nome de exibição de um cliente pode mudar
- o título de um produto ou variante pode mudar
- os rótulos voltados para assinatura podem evoluir após o evento acontecer

Se o log do administrador dependesse apenas do enriquecimento atual, os eventos históricos poderiam se tornar enganosos.

Pequenos instantâneos resolvem esse problema sem copiar todo o agregado de assinaturas.

### Por que não armazenar instantâneos completos da entidade

O plugin atual já usa snapshots onde são operacionalmente necessários, especialmente em `Subscriptions`.

Para `Activity Log`, um instantâneo completo seria desnecessário e muito pesado porque:
- o log é focado em eventos, não em agregados
- a maioria das linhas da lista de administradores só precisa de alguns rótulos de exibição estáveis
- instantâneos grandes criariam desvios de esquema e pressão de duplicação

Portanto, a regra acordada é:
- armazenar alguns campos de instantâneo de exibição estáveis como colunas escalares
- manter detalhes de alterações específicas do evento em campos JSON compactos
- confiar no enriquecimento do tempo de consulta apenas para detalhes contextuais opcionais, não para os principais rótulos de auditoria

## Estratégia de indexação

A estratégia de indexação inicial deve corresponder ao padrão existente de índices escalares pragmáticos do plugin.

Índices de coluna única necessários:
- `subscription_id`
- `customer_id`
- `event_type`
- `created_at`

Índices compostos necessários:
- `subscription_id + created_at`
- `customer_id + created_at`
- `event_type + created_at`

## Escopo de Emissão do Fluxo de Trabalho

As entradas `Activity Log` são emitidas a partir de caminhos de mutação apoiados por fluxo de trabalho, não diretamente de rotas ou auxiliares técnicos de baixo nível.

Para `Cancellation & Retention`, o escopo atual de emissões de eventos comerciais é:
- `start-cancellation-case` -> `cancellation.case_started`
- `apply-retention-offer` -> `cancellation.offer_applied`
- `update-cancellation-reason` -> `cancellation.reason_updated`
- `finalize-cancellation` -> `cancellation.finalized`

Essas entradas têm como objetivo resumir os resultados do fluxo de cancelamento voltados para o operador.

Eles não substituem o contexto de auditoria local do módulo mais detalhado armazenado no próprio domínio de cancelamento, como:
- `finalized_by`
- `decided_by`
- `manual_actions`
- histórico de eventos de oferta
- metadados detalhados do caso

Esses registros detalhados do processo permanecem como fonte da verdade dentro de `Cancellation & Retention`.

`Activity Log` armazena apenas um resumo compacto de vários domínios que é adequado para linha do tempo do administrador e visualizações de auditoria.

## Modelo de leitura administrativa

`Activity Log` deve expor um modelo de leitura de administrador dedicado, separado dos caminhos de gravação do serviço do módulo.

O formato recomendado segue o mesmo padrão já utilizado nas demais áreas Admin do plugin:
- ajudantes dedicados de leitura/consulta
- DTOs administrativos dedicados
- ler a composição fora do serviço de gravação principal do módulo

O modelo de leitura deve suportar três caminhos de consulta:
- lista de registros globais
- detalhe de registro único
- cronograma por assinatura

## Lista de registros globais

A lista global destina-se à futura página Admin `Activity Log`.

Sua finalidade é apoiar:
- navegação de auditoria de operador de alto sinal
- filtragem entre assinaturas e clientes
- paginação e cronologia descendente padrão

A lista recomendada DTO inclui:
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
- compacto `change_summary`

### Filtros de lista

O caminho de leitura da lista deve suportar:
- `subscription_id`
- `customer_id`
- `event_type[]`
- `actor_type[]`
- `date_from`
- `date_to`
- texto livre `q`

A pesquisa de texto livre deve ser limitada a campos estáveis voltados para o operador:
- `subscription_reference`
- `customer_name`
- `reason`

### Classificação e paginação de lista

A classificação padrão deve ser:
- `created_at desc`

A paginação deve seguir o padrão Admin padrão do plugin:
- `limit`
- `offset`
- `count`

A lista global deve ser lida diretamente de `subscription_log` e não deve exigir enriquecimento de tempo de execução vinculado para renderizar linhas úteis.

## Detalhe do registro

O caminho de leitura de detalhes do log destina-se ao detalhamento da tabela Admin ou da linha do tempo.

O DTO detalhado deve expor a carga completa do evento:
- `id`
- `subscription_id`
- `customer_id`
- `event_type`
- `actor_type`
- `actor_id`
- exibir campos de instantâneo
- `previous_state`
- `new_state`
- `changed_fields`
- `reason`
- `metadata`
- `created_at`

A visualização detalhada pode, opcionalmente, adicionar um resumo com link leve para a assinatura relacionada, mas esse enriquecimento deve permanecer intencionalmente pequeno.

Resumo vinculado opcional recomendado:
- `subscription_id`
- `subscription_reference`
- assinatura atual `status`

O caminho de leitura detalhada não deve hidratar avidamente o estado atual `renewal`, `dunning` ou `cancellation`, porque isso misturaria dados históricos de auditoria com o estado atual do tempo de execução entre módulos.

## Cronograma por assinatura

O cronograma por assinatura destina-se a ser incorporado à experiência administrativa `Subscriptions`.

Deve usar os mesmos registros de eventos subjacentes da lista global, mas filtrados por um `subscription_id`.

O DTO da linha do tempo pode reutilizar o DTO da lista com os mesmos campos principais:
- `id`
- `event_type`
- `actor_type`
- `actor_id`
- `reason`
- `created_at`
- `change_summary`
- exibir campos de instantâneo quando necessário

A linha do tempo deve apoiar:
- padrão `created_at desc`
- ordem ascendente opcional posteriormente, se necessário, para reprodução na linha do tempo

O agrupamento da linha do tempo, os emblemas e a lógica de apresentação pertencem à camada da IU, não ao modelo de leitura.

## Decisão de enriquecimento

A decisão final do modelo de leitura para `Activity Log` v1 é:
- usar dados de exibição `snapshot-first`
- permitir o enriquecimento de luz opcional apenas quando for claramente necessário

Isso significa:
- a lista primária e a linha do tempo devem ser renderizadas somente a partir de `subscription_log`
- rótulos de exibição vêm de campos de instantâneo armazenados
- pesquisa vinculada opcional pode ser adicionada para conveniência de detalhes, mas não é a base do modelo de leitura

### Por que tirar o snapshot primeiro

A trilha de auditoria deve permanecer historicamente estável.

Se as entidades atualmente vinculadas mudaram ao longo do tempo:
- os nomes dos clientes podem mudar
- os títulos dos produtos podem mudar
- os títulos das variantes podem mudar
- rótulos voltados para assinatura podem variar

Usar campos de snapshot como primeira fonte preserva o que os operadores deveriam ter visto no momento do evento.

### Por que não enriquecimento totalmente vinculado

O enriquecimento vinculado pesado criaria vários problemas:
- enfraqueceria a natureza histórica da pista de auditoria
- introduziria acoplamento desnecessário entre módulos nas leituras do administrador
- tornaria a lista e o cronograma mais caros do que o necessário

Portanto, a regra acordada é:
- lista e linha do tempo são instantâneas primeiro e locais da tabela
- os detalhes podem usar enriquecimento de luz por conveniência
- o estado atual do domínio permanece pertencente aos seus módulos originais

Raciocínio:
- `subscription_id + created_at` suporta o cronograma por assinatura
- `customer_id + created_at` oferece suporte a futuras consultas de auditoria no nível do cliente
- `event_type + created_at` suporta filtragem operacional no Admin
- `created_at` suporta navegação cronológica reversa padrão

O modelo inicial não deve adicionar índices JSON.

Raciocínio:
- os caminhos de consulta primários esperados são escalares e baseados no tempo
- A indexação JSON adicionaria complexidade antes que existissem evidências reais de consulta
- a filtragem de carga útil do evento não é um requisito primário da v1

## Módulo e Estratégia de Migração

`subscription_log` deve residir em um módulo personalizado `activity-log` dedicado.

O padrão de tempo de execução deve corresponder às convenções atuais do plugin:
- modelo de dados dedicado
- serviço de módulo dedicado
- migrações dedicadas
- referências escalares a domínios externos em vez de propriedade direta entre módulos

Status atual de implementação:
- o esqueleto do módulo existe em `src/modules/activity-log`
- o modelo, o serviço e a exportação do módulo são definidos
- a migração inicial e o instantâneo do módulo agora existem em `src/modules/activity-log/migrations`

A primeira migração para o módulo deve:
- crie a tabela `subscription_log`
- crie os índices escalares e compostos listados acima
- confiar no padrão de índice parcial `deleted_at` da Medusa

Status atual de implementação:
- a migração gerada cria a tabela `subscription_log`
- a migração gerada inclui os índices escalares necessários
- a migração gerada inclui a linha do tempo composta e os índices do filtro Admin
- a migração gerada inclui um índice exclusivo para `dedupe_key`
- aplicar a migração ao banco de dados continua sendo uma etapa separada no nível do aplicativo

## Limite do auxiliar de normalização

Antes de os registros de eventos serem gravados, eles devem passar por um auxiliar de normalização compartilhado de propriedade do módulo `activity-log`.

O ajudante é responsável por:
- construindo compacto `changed_fields` de `previous_state` e `new_state`
- redigindo valores confidenciais de cargas úteis de estado de evento
- filtrar `metadata` para uma lista de permissões estável
- anexar `correlation_id` quando já existe um no fluxo de chamada
- gerando um `dedupe_key` determinístico

O ajudante é intencionalmente:
- síncrono
- livre de efeitos colaterais
- independente do contêiner Medusa

Isso mantém a modelagem da carga útil reutilizável em fluxos de trabalho sem misturar lógica de normalização com lógica de persistência.

### Regras de redação

O auxiliar deve remover ou excluir valores confidenciais de cargas e metadados estaduais.

As categorias protegidas atuais incluem:
- linhas completas de endereço de entrega
- números de telefone
- contexto de pagamento e referências de pagamento
- cargas úteis do provedor bruto
- rastreamentos de pilha e diagnósticos de baixo nível

O objetivo é preservar o significado comercial voltado para o operador sem transformar `Activity Log` em uma área de armazenamento para dados técnicos confidenciais ou de baixo nível.

### Regras principais de eliminação de duplicação

O auxiliar deve gerar `dedupe_key` deterministicamente a partir de:
- `event_type`
- um escopo de domínio
- um identificador de domínio de destino
- um qualificador de evento opcional

Isso permite que gravações posteriores apoiadas por fluxo de trabalho permaneçam idempotentes durante as novas tentativas.

## Etapa de gravação do fluxo de trabalho central

O caminho de gravação futuro deve usar uma etapa central do fluxo de trabalho para persistência:
- `create-subscription-log-event`

A etapa é responsável apenas por:
- receber uma carga útil de evento normalizada e amigável ao fluxo de trabalho
- verificando um registro existente por `dedupe_key`
- criando um novo registro `subscription_log` somente quando necessário
- retornando entrada de compensação que distingue `created` de `existing`

### Regra de Idempotência

A etapa deve tratar `dedupe_key` como a chave de idempotência lógica primária.

Estratégia de gravação atual:
- lido por `dedupe_key`
- se existir um registro, reutilize-o
- se não existir nenhum registro, crie um

O índice exclusivo do banco de dados em `dedupe_key` permanece a última linha de proteção contra gravações duplicadas.

### Regra de compensação

A função de compensação da etapa deve excluir apenas os registros criados pela execução do fluxo de trabalho atual.

Não deve excluir:
- registros de log previamente existentes
- registros retornados porque o caminho de gravação atingiu uma duplicata idempotente

O modelo não deve introduzir chaves estrangeiras para outros módulos.

Isso segue o mesmo limite prático já usado em:
- `renewal_cycle`
- `dunning_case`
- `cancellation_case`

Essas áreas persistem identificadores escalares e usam enriquecimento em tempo de consulta em vez de propriedade entre módulos no nível SQL.

## Escopo atual de emissão de renovação

A integração `Renewals` atual emite eventos `Activity Log` apenas para resultados finais significativos para os negócios e decisões do operador.

Eventos de renovação implementados:
- `renewal.approval_approved`
- `renewal.approval_rejected`
- `renewal.force_requested`
- `renewal.succeeded`
- `renewal.failed`

Limites de emissão:
- as decisões de aprovação são emitidas a partir dos fluxos de trabalho de aprovação
- a execução forçada manual é emitida somente depois que a solicitação de força passa na validação do domínio
- a execução da renovação emite apenas o resultado final `succeeded` ou `failed`

Os itens a seguir permanecem fora de `Activity Log` e permanecem apenas na observabilidade da renovação:
- aquisição e liberação de bloqueio de fluxo de trabalho
- tentativa de criação e tentativa de processamento interno
- sessão de pagamento e internos do provedor de pagamento
- agendador estruturado e diagnóstico de execução forçada
- casos de execução bloqueados como `already_processing` e `duplicate_execution`

Isso mantém o fluxo de atividades de renovação legível pelo operador, preservando o rastreamento operacional detalhado em `src/modules/renewal/utils/observability.ts`.

## Resumo

O limite acordado para `Activity Log` é:

- é uma trilha de auditoria de negócios canônica somente com anexos para eventos relacionados a assinaturas
- não é a fonte da verdade para estado de assinatura, renovação, cobrança ou cancelamento
- os campos e históricos de auditoria local do módulo existente permanecem em vigor
- os registros operacionais estruturados permanecem separados da trilha de auditoria empresarial
- a gravação de eventos entre domínios deve acontecer por meio de orquestração de fluxo de trabalho, consistente com os padrões Medusa
- os registros de eventos devem permanecer compactos, estáveis e legíveis pelo operador
- As alterações de configuração de `Plans & Offers` estão fora do escopo para eventos `Activity Log` v1 independentes
- `subscription_log` deve ser um modelo dedicado somente para acréscimos com campos de filtro escalar e cargas JSON compactas
- `subscription_log` deve armazenar pequenos instantâneos de exibição do administrador diretamente no registro
