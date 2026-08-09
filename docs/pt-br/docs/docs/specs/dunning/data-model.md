# Reordenar: especificação final do modelo de dados de cobrança

Este documento cobre a etapa `2.4.5` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de persistência final para `Dunning`
- decidir se a área deve usar uma entidade, duas entidades ou um híbrido de estilo de evento
- definir relações com assinaturas, ciclos de renovação e pedidos de renovação
- definir os campos necessários para detalhes do administrador, auditabilidade e agendamento de novas tentativas
- definir a estratégia de indexação para leituras do agendador e do administrador

Esta especificação se baseia em:
- `reordenar/docs/specs/dunning/domain-model.md`
- `reordenar/docs/specs/dunning/source-of-truth-semantics.md`
- `reordenar/docs/specs/dunning/module-links.md`

O design segue os padrões da Medusa:
- módulos personalizados possuem seus próprios modelos de dados
- relações dentro do mesmo módulo devem usar relacionamentos de modelo de dados
- relações com outros módulos podem usar IDs escalares mais enriquecimento baseado em consulta no tempo de execução atual, com links de módulo permanecendo como um refinamento planejado
- os campos usados para processamento de filas, filtragem, classificação e decisões operacionais devem ser armazenados explicitamente
- JSON é apropriado para instantâneos de políticas e metadados flexíveis, não para campos primários de máquinas de estado

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para o modelo de persistência
- a fonte da verdade do tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Resumo da decisão de design

O design final deve usar:
- uma entidade de persistência primária: `DunningCase`
- uma entidade de persistência filha: `DunningAttempt`

Isso significa:
- não modelamos cobranças apenas como campos em `Assinatura`
- não modelamos cobrança apenas como campos em `RenewalCycle`
- não armazenamos o histórico de novas tentativas apenas em `metadados`
- não introduzimos um stream `dunning_event` genérico no MVP

## 2. Por que duas entidades de persistência são preferidas

Modelo recomendado:
- `DunningCase`
- `Tentativa de Dunning`

Por que isso é preferível a uma única entidade `DunningCase`:
- o histórico de novas tentativas tem seu próprio ciclo de vida e valor de auditoria
- múltiplas tentativas de recuperação devem ser rastreáveis como registros separados
- Os detalhes do administrador precisam de um cronograma de tentativa explícito
- manter todo o histórico apenas no caso tornaria a lógica do escalonador e do modelo de leitura mais difícil de raciocinar

Por que isso é preferível a um design de estilo de evento maior:
- O MVP precisa mais de clareza operacional do que de flexibilidade no fornecimento de eventos
- um fluxo de eventos separado acrescentaria complexidade sem valor imediato do produto
- caso + tentativa já cobre estado da fila, histórico de recuperação e solução de problemas

## 3. Alternativas rejeitadas

### 3.1 Projeto de entidade única

Opção rejeitada:
- apenas `DunningCase`, com histórico de novas tentativas em `metadados` ou matrizes JSON

Por que é pior:
- mais difícil de auditar
- mais difícil de exibir cronogramas de novas tentativas
- semântica de repetição mais fraca
- mais frágil para filtragem e análises posteriores

### 3.2 Design somente para eventos

Opção rejeitada:
- `DunningCase`
- `DunningEvent` genérico
- opcional `DunningAttempt` derivado de eventos

Por que é pior para o MVP:
- muita indireção para o caso de uso atual do administrador
- a semântica de nova tentativa e fechamento se torna mais difícil de ler
- maior implementação e complexidade do modelo de leitura

## 4. Modelo de persistência final

A camada de persistência deve girar em torno de:
- uma raiz agregada: `DunningCase`
- uma entidade de histórico filho: `DunningAttempt`

### 4.1 `DunningCase`

`DunningCase` é o registro da fila e do estado de recuperação.

### Campos persistentes propostos

Campos simples:
- `id`
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `estado`
- `tentativa_contagem`
- `max_attempts`
- `next_retry_at`
- `último_pagamento_error_code`
- `último_pagamento_erro_mensagem`
- `última_tentativa_em`
- `recuperado_em`
- `fechado_em`
- `motivo_de_recuperação`

Campos JSON:
- `retry_schedule`
- `metadados`

Carimbos de data e hora:
- Carimbos de data e hora padrão da Medusa, como `created_at` e `updated_at`

### 4.2 `Tentativa de cobrança`

`DunningAttempt` é o registro do histórico de recuperação.

### Campos persistentes propostos

Campos simples:
- `id`
- `dunning_case_id`
- `tentativa_não`
- `começou_em`
- `terminado_em`
- `estado`
- `código_erro`
- `mensagem_erro`
- `referência_de_pagamento`

Campos JSON:
- `metadados`

Carimbos de data e hora:
- Carimbos de data e hora padrão da Medusa, como `created_at` e `updated_at`

## 5. Por que `max_attempts` é explícito

O modelo deve armazenar `max_attempts` diretamente em `DunningCase`.

Por quê:
- a elegibilidade para novas tentativas depende disso
- O administrador deve exibir o limite atual sem reconstruí-lo a partir dos padrões da política
- um caso deve preservar o instantâneo do limite de novas tentativas ativo quando foi criado

Isso evita associar o comportamento atual do caso a alterações futuras na política de repetição padrão.

## 6. Por que `next_retry_at` é explícito

O modelo deve armazenar `next_retry_at` diretamente em `DunningCase`.

Por quê:
- a descoberta do agendador precisa de filtragem direta pelo devido carimbo de data/hora
- A lista e os detalhes do administrador precisam de visibilidade direta da próxima tentativa planejada
- a classificação e a filtragem por tempo de repetição não devem depender da leitura do JSON

Este campo é o ponteiro de agendamento operacional para o caso.

## 7. Por que o resumo do erro mais recente pertence ao `DunningCase`

O modelo deve armazenar:
- `último_pagamento_error_code`
- `último_pagamento_erro_mensagem`

Por que isso é preferido:
- A lista de administradores precisa de um resumo compacto de falhas
- os fluxos operacionais e do agendador podem precisar do contexto de erro mais recente sem tentativas de carregamento
- o agregado de casos deve expor diretamente o estado de recuperação atual

Nota importante:
- esses campos não são o histórico completo de erros
- o contexto detalhado do erro de tentativa de recuperação pertence a `DunningAttempt`

## 8. Por que `retry_schedule` pertence a `DunningCase` como JSON

O modelo deve armazenar `retry_schedule` em `DunningCase` como JSON.

Por quê:
- é um instantâneo de política, não um único escalar de controle
- a forma exata pode evoluir com decisões políticas de novas tentativas posteriores
- o caso deve preservar o agendamento atribuído a ele mesmo se os padrões globais mudarem posteriormente

Este campo não deve substituir:
- `next_retry_at`
- `tentativa_contagem`
- `max_attempts`

Esses permanecem campos operacionais escalares explícitos.

## 9. Estratégia de relacionamento dentro do módulo

A relação entre `DunningCase` e ​​`DunningAttempt` deve ser uma relação interna do mesmo módulo.

Semântica recomendada:
- um `DunningCase` possui muitos registros `DunningAttempt`
- um `DunningAttempt` pertence a um `DunningCase`

Por quê:
- este é um relacionamento de modelo de dados do mesmo módulo
- Os links do módulo Medusa são para limites de isolamento entre módulos, não para relacionamentos internos de entidades

## 10. Estratégia de relacionamento entre módulos

O módulo `dunning` deve manter IDs escalares e também definir links de módulos para módulos externos quando necessário.

### `id_da_assinatura`

`DunningCase` deve armazenar:
- `subscription_id` como um campo escalar

E o módulo deverá definir posteriormente:
- um link de módulo entre `dunning_case` e `subscription`

Por que ambos são necessários:
- ID escalar suporta filtragem, indexação, verificações de exclusividade e lógica do agendador
- o link do módulo suporta leituras entre módulos sem quebrar o isolamento

### `renewal_cycle_id`

`DunningCase` deve armazenar:
- `renewal_cycle_id` como um campo escalar

E o módulo deverá definir posteriormente:
- um link de módulo entre `dunning_case` e `renewal_cycle`

Por quê:
- o caso está ancorado em um evento originário da dívida
- A lista e os detalhes do administrador precisarão de contexto de renovação
- o agregado de cobrança permanece independente, embora ainda permita o enriquecimento vinculado

### `renovação_pedido_id`

`DunningCase` deve armazenar:
- `renewal_order_id` como um campo escalar

E o módulo deverá definir posteriormente:
- um link de módulo entre `dunning_case` e `order`

Por quê:
- alguns casos de cobrança precisam de contexto de pedido para detalhes do administrador e orquestração de novas tentativas futuras
- as leituras vinculadas ainda devem seguir as regras de isolamento do módulo

### Artefatos de pagamento

Nesta fase:
- `cobrança_pagamento`
- `sessão_de_pagamento`
- `pagamento`

não devem ser modelados como relações diretas no modelo de persistência MVP.

Razão:
- o contrato atual pode ser satisfeito com o resumo de erros em nível de caso e `payment_reference` em nível de tentativa
- as necessidades de link de pagamento ainda são adiadas para decisões posteriores de repetição/detalhamento

## 11. Campos de instantâneo e auditoria necessários para detalhes do administrador

Para o MVP atual, o modelo de dados deve oferecer suporte aos detalhes do administrador com:
- status do caso e campos de agendamento em `DunningCase`
- resumo do último erro em `DunningCase`
- resumo de fechamento e recuperação em `DunningCase`
- tentar novamente o instantâneo da política em `DunningCase`
- tente novamente os dados da linha do tempo em `DunningAttempt`

O modelo não precisa armazenar cópias completas de:
- instantâneos de assinatura novamente no caso
- instantâneos do ciclo de renovação novamente no caso
- solicitar instantâneos novamente no caso

Por quê:
- aqueles pertencem aos seus domínios proprietários
- a duplicação deve ser evitada, a menos que uma reconstrução histórica independente se torne necessária mais tarde
- os detalhes do administrador atual podem combinar o contexto externo vinculado com o estado específico da cobrança

## 12. Campos de conveniência

O modelo final deve manter os campos de conveniência em `DunningCase`:
- `tentativa_contagem`
- `next_retry_at`
- `último_pagamento_error_code`
- `último_pagamento_erro_mensagem`
- `última_tentativa_em`

Por quê:
- o processamento do escalonador deve funcionar a partir do agregado de casos de forma eficiente
- A renderização da lista de administradores não deve agregar registros filho em cada leitura
- o caso continua sendo a raiz operacional para o estado de recuperação

## 13. Propriedade de status

### `DunningCase.status`

Propriedade do agregado de casos.

Ele responde:
- quando o caso estiver no seu ciclo de vida de recuperação

### `DunningAttempt.status`

Propriedade do registro de tentativa.

Ele responde:
- o resultado de uma tentativa concreta de recuperação

Esses status devem permanecer separados.

O status do caso não deve ser inferido sempre apenas a partir do histórico de tentativas.

## 14. Implicações de indexação

O modelo de dados final implica índices posteriores pelo menos para:

`DunningCaso`
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `estado`
- `next_retry_at`
- `última_tentativa_em`
- `recuperado_em`
- `fechado_em`
- índice composto em `status` + `next_retry_at`

`DunningAttempt`
- `dunning_case_id`
- `attempt_no`
- `status`
- `started_at`
- `finished_at`
- índice único composto em `dunning_case_id` + `attempt_no`

Esses índices devem oferecer suporte a:
- seleção da fila de novas tentativas
- filtragem administrativa
- carregamento de detalhes
- ordenação da linha do tempo das tentativas

### Por que `status + next_retry_at` é importante

Esse índice composto é importante porque o agendador provavelmente identificará casos passíveis de repetição com base em:
- status ativo ou elegível para repetição
- `next_retry_at <= now`

Sem esse índice composto, a fila de novas tentativas pode se tornar menos eficiente à medida que o volume aumenta.

## 15. Campos recomendados no nível do modelo para regras de exclusividade posteriores

O modelo de persistência deve permitir a aplicação posterior das seguintes regras:
- um caso por `renewal_cycle_id`
- um caso ativo por `subscription_id`, de acordo com a semântica do MVP

Nesta etapa, a decisão relativa ao modelo de dados é:
- manter os IDs escalares e os status necessários para aplicar essas regras posteriormente
- deixar a estratégia exata de restrições do banco de dados a cargo do projeto de implementação e migração

Por que:
- algumas regras de exclusividade podem depender da semântica do status “ativo” versus “fechado”
- isso pode exigir índices parcialmente exclusivos ou proteções no nível do fluxo de trabalho, dependendo das restrições de implementação

## 16. Recomendação final

O modelo de persistência recomendado para o MVP é:

- `DunningCase`
  - raiz de agregação
  - estado atual da recuperação
  - campos de agendamento de novas tentativas
  - resumo do último erro de pagamento
  - resumo de encerramento e recuperação
  - campos de conveniência compatíveis com filas

- `DunningAttempt`
  - histórico de filhos do tipo “somente adição”
  - carimbos de data/hora de recuperação
  - contexto da falha técnica
  - referência do pagamento

No MVP, não é necessária uma entidade de evento separada.

Se, posteriormente, o domínio exigir:
- cronogramas mais detalhados dos operadores
- várias decisões manuais
- histórico específico dos artefatos de pagamento
- eventos de auditoria além das tentativas de recuperação

nesse caso, um modelo do tipo `DunningEvent` pode ser introduzido posteriormente sem invalidar a estrutura básica de “caso + tentativa”.

## 17. Impacto nas etapas posteriores

Este modelo final significa que:
- a implementação do módulo `dunning` deve exportar dois modelos de dados
- devem ser utilizadas relações dentro do mesmo módulo entre o caso e a tentativa
- os links do módulo devem, posteriormente, conectar o caso a `subscription`, `renewalCycle` e `order`
- os fluxos de trabalho devem atualizar o agregado do caso e anexar as tentativas explicitamente;
- o modelo de leitura do Admin deve usar `DunningCase` como raiz para lista/detalhes e anexar as tentativas para leituras de detalhes
