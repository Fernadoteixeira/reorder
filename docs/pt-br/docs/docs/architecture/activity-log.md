# Arquitetura do log de atividades

Este documento descreve o limite arquitetônico implementado para a área `Activity Log` no plugin `Reorder`.

É a fonte da verdade em tempo de execução para:
- regras de propriedade e fonte da verdade
- contrato de evento e taxonomia
- escrever caminho e ler limites do caminho
- retenção e considerações operacionais

## Meta

A área `Registro de atividades` fornece uma trilha de auditoria unificada voltada para o operador para eventos de negócios relacionados a assinaturas em todo o plug-in.

Seu objetivo é:
- mostre eventos importantes do ciclo de vida de uma assinatura em um só lugar
- fornecer aos operadores uma trilha de auditoria legível em diversas áreas de comércio recorrente
- oferecer suporte a visualizações futuras de lista de administradores, detalhes e linha do tempo

Seu objetivo não é substituir os modelos de domínio de origem que já possuem seu próprio estado de negócio.

## Papel arquitetônico

`Log de atividades` é uma camada de auditoria de negócios dedicada somente para acréscimos.

Deve agregar eventos importantes relacionados à assinatura emitidos por:
- `Assinaturas`
- `Planos e Ofertas`
- `Renovações`
- `Cobrança`
- `Cancelamento e Retenção`

A principal decisão arquitetônica é:

- `Registro de atividades` é a trilha de auditoria canônica somente para anexos para eventos de negócios voltados para o operador em torno de uma assinatura.
- `Log de atividades` não é a fonte da verdade para o estado do domínio pertencente aos módulos existentes.

Isso significa que o log é uma visualização de auditoria entre domínios e não um substituto para agregações existentes.

## Limites de propriedade

O modelo de propriedade atual do plugin permanece inalterado.

As `assinaturas` continuam sendo a fonte da verdade para:
- estado do ciclo de vida da assinatura
- campos de agendamento de cadência e renovação
- endereço de entrega e materialização de alteração de plano pendente

`Planos e ofertas` continuam sendo a fonte da verdade para:
- configuração da oferta de assinatura
- frequências de cobrança permitidas
- oferecer regras e resolução política eficaz

As `renovações` continuam a ser a fonte da verdade para:
- estado de execução do ciclo de renovação
- histórico de tentativas de renovação
- decisões de aprovação e resultados de execução

`Dunning` continua sendo a fonte da verdade para:
- estado de recuperação de pagamento
- agendamento de nova tentativa
- histórico de tentativas de cobrança
- resultados recuperados e não recuperados

`Cancelamento e Retenção` continua sendo a fonte da verdade para:
- estado do processo de cancelamento
- histórico de ofertas de retenção
- motivo da rotatividade e resultado final do cancelamento

`Activity Log` não retira a propriedade de nenhum dos módulos acima.

## Relação com campos de auditoria e metadados existentes

O plugin já armazena dados orientados para auditoria dentro de módulos específicos de domínio.

Os exemplos incluem:
- campos de ator explícitos, como `finalized_by`, `decided_by` e campos relacionados à aprovação
- anexar metadados `manual_actions` somente em `Cancellation & Retention`
- histórico de tentativas de renovação e cobrança
- metadados específicos do fluxo de trabalho e contexto de operação manual

Esses campos permanecem válidos e devem permanecer nos módulos de sua propriedade.

A função arquitetônica do `Registro de atividades` é diferente:
- os módulos de domínio mantêm um contexto detalhado de auditoria local do módulo
- `Log de atividades` fornece uma trilha de auditoria unificada entre domínios para operadores

Isso significa:
- `Registro de atividades` pode resumir ou fazer referência a resultados importantes desses módulos
- não deve substituir o histórico detalhado de tentativas ou metadados específicos do módulo
- não deve tornar-se um depósito de lixo para todos os campos internos ou valores de diagnóstico

## Trilha de auditoria empresarial versus registro operacional

O plugin já usa registro operacional estruturado e métricas de resumo do agendador em áreas como `Renovações`, `Dunning` e `Cancelamento e Retenção`.

Esses registros operacionais continuam sendo uma preocupação separada.

O `Registro de atividades` deve conter apenas eventos significativos para os negócios voltados para o operador, como:
- assinatura criada, pausada, retomada, cancelada
- mudança de plano programada ou aplicada
- endereço de entrega atualizado
- próxima entrega ignorada
- tentativa de renovação, sucesso, falha
- cobrança iniciada, repetida, recuperada, não recuperada
- caso de cancelamento iniciado
- oferta de retenção aplicada
- cancelamento finalizado

O `Registro de atividades` não deve conter ruído operacional ou de diagnóstico de baixo nível, como:
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

Para `Registro de atividades`, isso significa:
- as entradas de log devem ser criadas a partir de caminhos de mutação apoiados por fluxo de trabalho
- os serviços do módulo devem continuar possuindo seu próprio estado
- a futura camada de leitura do administrador pode agregar eventos entre domínios, mas não deve redefinir a propriedade do domínio

## Contrato de registro de evento

O `Log de atividades` armazena um registro somente anexado por evento de assinatura significativo para os negócios.

O contrato de evento lógico é:
- `id`
- `subscrição_id`
- `ID_do_cliente`
- `tipo_evento`
- `tipo_actor`
- `actor_id`
- `estado_anterior`
- `novo_estado`
- `campos_alterados`
- `razão`
- `metadados`
- `criado_em`

### Semântica de Campo

`id`
- identificador de evento exclusivo

`id_de_assinatura`
- obrigatório
- o log está centrado em um ciclo de vida de assinatura

`id_do_cliente`
- opcional, mas persistido quando conhecido
- usado para filtragem administrativa e pesquisas de auditoria no nível do cliente

`tipo_evento`
- obrigatório
- um nome de evento de domínio estável da taxonomia definida abaixo

`tipo_ator`
- obrigatório
- indica quem ou o que desencadeou o evento
- valores planejados atuais:
  - `usuário`
  - `cliente`
  - `sistema`
  - `agendador`

`id_actor`
- opcional
- armazena o ID do usuário administrador ou outro identificador de ator, quando disponível

`estado_anterior`
- resumo JSON opcional
- armazena apenas o estado relevante do evento antes da mutação
- não deve conter cópias brutas completas dos agregados proprietários

`novo_estado`
- resumo JSON opcional
- armazena apenas o estado relevante do evento após a mutação
- não deve conter cópias brutas completas dos agregados proprietários

`campos_alterados`
- comparação estruturada opcional
- deve capturar uma representação compacta antes/depois dos campos que foram alterados
- forma pretendida:
  - array de entradas em nível de campo, como `field`, `before`, `after`

`razão`
- motivo opcional voltado para a empresa ou para a operadora
- por exemplo, motivo de aprovação, motivo de decisão de retenção ou motivo de cancelamento manual

`metadados`
- JSON opcional
- usado para referências estáveis e contexto técnico limitado, como:
  - `renovação_ciclo_id`
  - `dunning_case_id`
  - `cancelamento_caso_id`
  - `retention_offer_event_id`
  - `order_id`
  - `correlação_id`
- não deve conter detalhes de pagamento confidenciais ou cargas de diagnóstico ilimitadas

`criado_em`
- carimbo de data/hora do evento necessário

## Regras estaduais de carga útil

O registro do evento destina-se a permanecer estável e legível pelo operador ao longo do tempo.

Por causa disso, `previous_state`, `new_state` e `changed_fields` devem seguir estas regras:
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

O `Registro de atividades` deve usar uma taxonomia explícita e estável agrupada por prefixo de domínio.

### Eventos de assinatura

- `subscrição.criada`
- `subscrição.pausada`
- `subscrição.resumed`
- `subscrição.cancelada`
- `subscrição.plan_change_scheduled`
- `subscription.shipping_address_updated`
- `subscrição.next_delivery_skipped`

### Eventos de renovação

- `renovação.cycle_created`
- `renovação.approval_approved`
- `renovação.approval_rejected`
- `renovação.force_requested`
- `renovação.com sucesso`
- `renovação.falhou`

### Eventos de cobrança

- `dunning.started`
- `dunning.retry_executed`
- `dunning.recuperado`
- `dunning.unrecovered`
- `dunning.retry_schedule_updated`

### Eventos de cancelamento e retenção

- `cancelamento.case_started`
- `cancelamento.oferta_aplicada`
- `cancelamento.reason_updated`
- `cancelamento.finalizado`

## Modelo Físico

O modelo de armazenamento implementado é `subscription_log`.

Ele pertence ao módulo dedicado `log de atividades` e permanece apenas anexado do ponto de vista comercial.

O registro persiste:
- identidade principal e campos de filtro
- resumos estaduais compactos
- `changed_fields` estruturados
- referências limitadas de metadados
- exibir instantâneos para caminhos de leitura do administrador
- `dedupe_key` para gravações idempotentes apoiadas por fluxo de trabalho

O modelo intencionalmente não armazena:
- instantâneos agregados completos
- cargas úteis de pagamento completas
- ruído de observabilidade técnica
- hidratação do modelo de leitura com link profundo

## Escrever caminho

Os eventos de negócios são gravados a partir de caminhos de mutação apoiados por fluxo de trabalho.

O caminho de gravação implementado é:
1. O fluxo de trabalho do domínio altera o estado da fonte da verdade
2. O fluxo de trabalho cria uma carga útil de auditoria de negócios normalizada
3. `create-subscription-log-event` persiste em um registro `subscription_log` somente anexado

As regras de normalização são centralizadas no auxiliar de log de atividades compartilhado e abrangem:
- compacto `estado_anterior` e `estado_novo`
- `campos_alterados`
- redação de dados confidenciais
- lista de permissões de `metadados`
- `dedupe_key` determinístico

A idempotência é imposta por meio de:
- `dedupe_key` determinístico
- proteção de índice exclusiva
- semântica de criação com tratamento de conflitos na etapa central de gravação

## Ler caminho

O modelo de leitura implementado prioriza o snapshot e é otimizado para Admin.

Leia caminhos atualmente suportados:
- lista global de administradores
- detalhe para um evento
- cronograma por assinatura

A lista global e a linha do tempo são lidas principalmente no próprio `subscription_log`.

A visualização detalhada retorna a carga completa do evento do mesmo registro:
- `estado_anterior`
- `novo_estado`
- `campos_alterados`
- `metadados`

O modelo de leitura evita intencionalmente o enriquecimento pesado do tempo de execução entre módulos para a experiência base.

Isso mantém a trilha de auditoria:
- historicamente estável
- rápido para ler
- resiliente a alterações posteriores em entidades de domínio vinculadas

## Limite administrativo

A experiência do administrador é intencionalmente dividida em duas superfícies:
- uma página dedicada `Registro de atividades` para operações de assinatura cruzada
- uma seção `Registro de atividades` na página de detalhes da assinatura para revisão por assinatura

Ambas as superfícies usam os mesmos contratos de API instantâneos e os mesmos registros `subscription_log` subjacentes.

A UI Admin não define nova semântica de negócios.

Sua função é expor:
- filtragem
- classificação
- paginação
- detalhamento detalhado
- revisão do cronograma de assinatura

## Política de retenção

O `Registro de atividades` é tratado como uma trilha de auditoria de negócios, não como uma telemetria de curta duração.

A política de retenção atual para v1 é:
- sem purga automática
- nenhum trabalho de limpeza baseado em tempo
- nenhuma política de arquivo silencioso em segundo plano

Raciocínio:
- a utilidade da auditoria depende da continuidade histórica
- a carga útil é intencionalmente compacta
- as regras de limpeza operacional devem ser explícitas e implementadas separadamente, se introduzidas posteriormente

Se surgir um requisito de retenção futuro, ele deverá ser implementado como uma capacidade de manutenção dedicada com:
- uma janela de retenção explícita
- limpar semântica de arquivamento ou eliminação
- documentação separada e orientação de implementação

## Monitoramento e Desempenho

Operacionalmente, o seguinte deve ser observado para o `Log de atividades`:
- crescimento de linha em `subscription_log`
- volume de eventos por dia e por semana
- tempo de resposta para:
  - `GET /admin/registros de assinatura`
  - `GET /admin/subscription-logs/:id`
  - `GET /admin/subscriptions/:id/logs`
- comportamento de consulta em torno de:
  - `subscrição_id`
  - `ID_do_cliente`
  - `tipo_evento`
  - `criado_em`

Premissas operacionais atuais:
- a lista principal e a linha do tempo são paginadas
- a classificação padrão é `created_at desc`
- os índices atuais são suficientes para a carga de trabalho v1 esperada

Sinais que devem desencadear a revisão:
- desaceleração visível nas consultas de listas globais
- desaceleração visível nas consultas de cronograma de assinatura
- grandes aumentos no volume do `subscription_log` causados pela emissão de eventos ruidosos
- pressão para ampliar a pesquisa ou o enriquecimento além do atual modelo instantâneo

## Não metas

A implementação atual do `Registro de atividades` não visa fornecer:
- telemetria de uso geral
- diagnóstico de pagamento em nível de provedor
- instantâneos históricos completos de agregados de domínio
- limpeza automática de retenção
- ferramentas de exportação
- filtros salvos ou personalização em nível de usuário

Essas áreas são melhorias futuras e não fazem parte do contrato arquitetônico v1.

## Decisão de escopo para planos e ofertas

`Planos e ofertas` fazem parte do tempo de execução de comércio recorrente, mas não devem introduzir eventos de configuração globais independentes no `Registro de atividades` centrado em assinatura na v1.

Raciocínio:
- `Registro de atividades` é centrado em uma assinatura
- `Planos e ofertas` gerenciam principalmente a configuração em nível de produto ou variante
- as operações de criação, atualização e alternância na configuração da oferta não são inerentemente eventos de uma assinatura específica

Portanto, a decisão de escopo atual é:
- não adicione eventos `plan-offer.*` independentes ao `Log de atividades` v1
- capturar o efeito da configuração do plano voltado para a assinatura por meio de eventos de assinatura e renovação

Exemplos:
- uma futura alteração de plano solicitada em uma assinatura é representada por `subscription.plan_change_scheduled`
- o sucesso ou fracasso da renovação após a validação da política é representado por eventos de renovação

Se os requisitos de auditoria de configuração se tornarem importantes posteriormente, eles deverão ser modelados como uma trilha de auditoria de configuração separada, em vez de incluídos no fluxo de atividades por assinatura.

## Modelo de dados SubscriptionLog

A futura área `Log de atividades` deve usar um modelo de dados personalizado dedicado chamado `subscription_log`.

Este modelo pretende ser:
- apenas anexar
- centrado em assinatura
- otimizado para leituras de lista de administradores, detalhes e cronograma por assinatura

Não se pretende tornar-se um barramento de eventos generalizado ou uma área de armazenamento para diagnósticos operacionais.

O proprietário do tempo de execução desse modelo é o módulo personalizado Medusa dedicado:
- `src/módulos/log de atividades`

O módulo expõe:
- `ACTIVITY_LOG_MODULE = "log de atividades"`
- o modelo de dados `subscription_log`
- o serviço de módulo usado posteriormente por fluxos de trabalho e auxiliares de leitura de administrador

## Semântica somente para acréscimos

`subscription_log` deve ser tratado como uma entidade somente para acréscimos.

Isso significa:
- um evento de negócios produz um registro de log
- os registros existentes não são editados como parte do fluxo comercial normal
- a evolução do estado é representada por novas entradas de log, não pela mutação das mais antigas

Isto mantém a trilha de auditoria estável e compreensível para os operadores.

A regra somente acréscimo é especialmente importante porque o log se destina a descrever eventos comerciais históricos, e não a propriedade atual do domínio.

## Campos Físicos Propostos

O modelo deve armazenar os seguintes campos:

- `id`
- `subscrição_id`
- `ID_do_cliente`
- `tipo_evento`
- `tipo_actor`
- `actor_id`
- `referência_de_assinatura`
- `nome_do_cliente`
- `título_do_produto`
- `variant_title`
- `estado_anterior`
- `novo_estado`
- `campos_alterados`
- `razão`
- `metadados`

Os campos Medusa automáticos também estão presentes:
- `criado_em`
- `atualizado_em`
- `excluído_em`

### Campos principais de filtragem

Os principais campos de filtragem de administrador e linha do tempo são:
- `subscrição_id`
- `ID_do_cliente`
- `tipo_evento`
- `criado_em`

Devem ser colunas escalares de primeira classe, não valores ocultos dentro do JSON.

### Campos JSON

O modelo deve usar campos JSON para:
- `estado_anterior`
- `novo_estado`
- `campos_alterados`
- `metadados`

Esses campos JSON são justificados porque armazenam cargas específicas de eventos que podem variar de acordo com o tipo de evento.

No entanto, devem permanecer compactos e limitados:
- sem cópias agregadas completas
- sem matrizes de histórico de tentativas
- sem cargas úteis brutas do provedor de pagamento
- sem grandes despejos de diagnóstico

## Exibir decisão de instantâneo

O modelo `subscription_log` deve armazenar um pequeno conjunto de campos de snapshot orientados para exibição diretamente no registro:
- `referência_de_assinatura`
- `nome_do_cliente`
- `título_do_produto`
- `variant_title`

Esta é a decisão recomendada para `Registro de atividades` v1.

### Por que armazenar pequenos instantâneos de exibição

A trilha de auditoria deve permanecer legível mesmo que as entidades atualmente vinculadas sejam alteradas posteriormente.

Por exemplo:
- o nome de exibição de um cliente pode mudar
- o título de um produto ou variante pode mudar
- os rótulos voltados para assinatura podem evoluir após o evento acontecer

Se o log do administrador dependesse apenas do enriquecimento atual, os eventos históricos poderiam se tornar enganosos.

Pequenos instantâneos resolvem esse problema sem copiar todo o agregado de assinaturas.

### Por que não armazenar instantâneos completos da entidade

O plugin atual já utiliza snapshots onde eles são operacionalmente necessários, especialmente em `Assinaturas`.

Para o `Log de atividades`, um instantâneo completo seria desnecessário e muito pesado porque:
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
- `subscrição_id`
- `ID_do_cliente`
- `tipo_evento`
- `criado_em`

Índices compostos necessários:
- `subscription_id + criado_at`
- `ID_do_cliente + criado_em`
- `tipo_de_evento + criado_em`

## Escopo de Emissão do Fluxo de Trabalho

As entradas do `Log de atividades` são emitidas a partir de caminhos de mutação apoiados por fluxo de trabalho, não diretamente de rotas ou auxiliares técnicos de baixo nível.

Para `Cancelamento e Retenção`, o escopo atual de emissões de eventos empresariais é:
- `start-cancellation-case` -> `cancellation.case_started`
- `apply-retention-offer` -> `cancellation.offer_applied`
- `update-cancellation-reason` -> `cancellation.reason_updated`
- `finalize-cancelamento` -> `cancelamento.finalizado`

Essas entradas têm como objetivo resumir os resultados do fluxo de cancelamento voltados para o operador.

Eles não substituem o contexto de auditoria local do módulo mais detalhado armazenado no próprio domínio de cancelamento, como:
- `finalizado_por`
- `decidido_por`
- `ações_manuais`
- histórico de eventos de oferta
- metadados detalhados do caso

Esses registros detalhados do processo permanecem como fonte da verdade em `Cancelamento e Retenção`.

O `Log de atividades` armazena apenas um resumo compacto de vários domínios que é adequado para a linha do tempo do administrador e visualizações de auditoria.

## Modelo de leitura administrativa

O `Log de atividades` deve expor um modelo de leitura de administrador dedicado, separado dos caminhos de gravação do serviço do módulo.

O formato recomendado segue o mesmo padrão já utilizado nas demais áreas Admin do plugin:
- ajudantes dedicados de leitura/consulta
- DTOs administrativos dedicados
- ler a composição fora do serviço de gravação principal do módulo

O modelo de leitura deve suportar três caminhos de consulta:
- lista de registros globais
- detalhe de registro único
- cronograma por assinatura

## Lista de registros globais

A lista global destina-se à futura página de administração `Registro de atividades`.

Sua finalidade é apoiar:
- navegação de auditoria de operador de alto sinal
- filtragem entre assinaturas e clientes
- paginação e cronologia descendente padrão

A lista recomendada DTO inclui:
- `id`
- `subscrição_id`
- `referência_de_assinatura`
- `ID_do_cliente`
- `nome_do_cliente`
- `tipo_evento`
- `tipo_actor`
- `actor_id`
- `razão`
- `criado_em`
- compacto `change_summary`

### Filtros de lista

O caminho de leitura da lista deve suportar:
- `subscrição_id`
- `ID_do_cliente`
- `tipo_evento[]`
- `tipo_actor[]`
- `data_de`
- `data_até`
- texto livre `q`

A pesquisa de texto livre deve ser limitada a campos estáveis voltados para o operador:
- `referência_de_assinatura`
- `nome_do_cliente`
- `razão`

### Classificação e paginação de lista

A classificação padrão deve ser:
- `criado_em desc`

A paginação deve seguir o padrão Admin padrão do plugin:
- `limite`
- `deslocamento`
- `contar`

A lista global deve ser lida diretamente de `subscription_log` e não deve exigir enriquecimento de tempo de execução vinculado para renderizar linhas úteis.

## Detalhe do registro

O caminho de leitura de detalhes do log destina-se ao detalhamento da tabela Admin ou da linha do tempo.

O DTO detalhado deve expor a carga completa do evento:
- `id`
- `subscrição_id`
- `ID_do_cliente`
- `tipo_evento`
- `tipo_actor`
- `actor_id`
- exibir campos de instantâneo
- `estado_anterior`
- `novo_estado`
- `campos_alterados`
- `razão`
- `metadados`
- `criado_em`

A visualização detalhada pode, opcionalmente, adicionar um resumo com link leve para a assinatura relacionada, mas esse enriquecimento deve permanecer intencionalmente pequeno.

Resumo vinculado opcional recomendado:
- `subscrição_id`
- `referência_de_assinatura`
- `status` da assinatura atual

O caminho de leitura detalhada não deve hidratar avidamente o estado atual de `renovação`, `dunning` ou `cancelamento`, porque isso misturaria dados históricos de auditoria com o estado atual do tempo de execução entre módulos.

## Cronograma por assinatura

O cronograma por assinatura destina-se a ser incorporado à experiência de administração de `Assinaturas`.

Deve usar os mesmos registros de eventos subjacentes que a lista global, mas filtrados por um `subscription_id`.

O DTO da linha do tempo pode reutilizar o DTO da lista com os mesmos campos principais:
- `id`
- `tipo_evento`
- `tipo_actor`
- `actor_id`
- `razão`
- `criado_em`
- `change_summary`
- exibir campos de instantâneo quando necessário

A linha do tempo deve apoiar:
- padrão `created_at desc`
- ordem ascendente opcional posteriormente, se necessário, para reprodução na linha do tempo

O agrupamento da linha do tempo, os emblemas e a lógica de apresentação pertencem à camada da IU, não ao modelo de leitura.

## Decisão de enriquecimento

A decisão final do modelo de leitura para `Log de atividades` v1 é:
- use dados de exibição `snapshot-first`
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
- `subscription_id +created_at` suporta o cronograma por assinatura
- `customer_id +created_at` suporta futuras consultas de auditoria no nível do cliente
- `event_type +created_at` suporta filtragem operacional no Admin
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
- confie no padrão de índice parcial `deleted_at` da Medusa

Status atual de implementação:
- a migração gerada cria a tabela `subscription_log`
- a migração gerada inclui os índices escalares necessários
- a migração gerada inclui a linha do tempo composta e os índices do filtro Admin
- a migração gerada inclui um índice exclusivo para `dedupe_key`
- aplicar a migração ao banco de dados continua sendo uma etapa separada no nível do aplicativo

## Limite do auxiliar de normalização

Antes de os registros de eventos serem gravados, eles devem passar por um auxiliar de normalização compartilhado de propriedade do módulo `activity-log`.

O ajudante é responsável por:
- construindo `changed_fields` compactos de `previous_state` e `new_state`
- redigindo valores confidenciais de cargas úteis de estado de evento
- filtrar `metadados` até uma lista de permissões estável
- anexar `correlation_id` quando já existe um no fluxo de chamada
- gerando uma `dedupe_key` determinística

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

O objetivo é preservar o significado comercial voltado para o operador sem transformar o `Registro de atividades` em uma área de armazenamento para dados técnicos confidenciais ou de baixo nível.

### Regras principais de eliminação de duplicação

O auxiliar deve gerar `dedupe_key` deterministicamente a partir de:
- `tipo_evento`
- um escopo de domínio
- um identificador de domínio de destino
- um qualificador de evento opcional

Isso permite que gravações posteriores apoiadas por fluxo de trabalho permaneçam idempotentes durante as novas tentativas.

## Etapa de gravação do fluxo de trabalho central

O caminho de gravação futuro deve usar uma etapa central do fluxo de trabalho para persistência:
- `criar-evento-log-de-assinatura`

A etapa é responsável apenas por:
- receber uma carga útil de evento normalizada e amigável ao fluxo de trabalho
- verificando um registro existente por `dedupe_key`
- criar um novo registro `subscription_log` somente quando necessário
- retornando dados de compensação que distinguem `criado` de `existente`

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
- `ciclo_renovação`
- `dunning_case`
- `caso_cancelamento`

Essas áreas persistem identificadores escalares e usam enriquecimento em tempo de consulta em vez de propriedade entre módulos no nível SQL.

## Escopo atual de emissão de renovação

A atual integração `Renewals` emite eventos `Activity Log` apenas para resultados finais significativos para os negócios e decisões do operador.

Eventos de renovação implementados:
- `renovação.approval_approved`
- `renovação.approval_rejected`
- `renovação.force_requested`
- `renovação.com sucesso`
- `renovação.falhou`

Limites de emissão:
- as decisões de aprovação são emitidas a partir dos fluxos de trabalho de aprovação
- a execução forçada manual é emitida somente depois que a solicitação de força passa na validação do domínio
- a execução da renovação emite apenas o resultado final `bem-sucedido` ou `fracassado`

Os itens a seguir ficam fora do `Registro de Atividades` e permanecem apenas na observabilidade de renovação:
- aquisição e liberação do bloqueio do fluxo de trabalho
- criação de tentativas e processos internos de processamento de tentativas
- processos internos da sessão de pagamento e do provedor de pagamento
- diagnósticos do agendador estruturado e da execução forçada
- casos de execução bloqueada, como `already_processing` e `duplicate_execution`

Isso mantém o fluxo de atividades de renovação compreensível para os operadores, ao mesmo tempo em que preserva o rastreamento operacional detalhado em `src/modules/renewal/utils/observability.ts`.

## Resumo

O limite acordado para o `Registro de Atividades` é:

- trata-se de um registro de auditoria comercial canônico, do tipo “somente adição”, para eventos relacionados a assinaturas
- não é a fonte de verdade para o status de assinatura, renovação, cobrança ou cancelamento
- os campos e históricos de auditoria locais dos módulos existentes permanecem em vigor
- os registros operacionais estruturados permanecem separados do registro de auditoria comercial
- o registro de eventos entre domínios deve ocorrer por meio da orquestração de fluxos de trabalho, em conformidade com os padrões do Medusa
- os registros de eventos devem permanecer compactos, estáveis e legíveis pelo operador;
- alterações na configuração de `Planos e Ofertas` estão fora do escopo dos eventos independentes do `Registro de Atividades` v1;
- o `subscription_log` deve ser um modelo dedicado, somente de acréscimo, com campos de filtro escalares e cargas JSON compactas;
- o `subscription_log` deve armazenar pequenos instantâneos de exibição do Admin diretamente no registro
