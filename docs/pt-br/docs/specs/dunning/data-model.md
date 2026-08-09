# Reordenação: Especificação do modelo de dados final do Dunning

Este documento abrange a etapa `2.4.5`, de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de persistência final para `Dunning`
- decidir se a área deve utilizar uma entidade, duas entidades ou um modelo híbrido do tipo evento
- definir as relações com assinaturas, ciclos de renovação e pedidos de renovação
- definir os campos necessários para detalhes administrativos, auditabilidade e agendamento de novas tentativas
- definir a estratégia de indexação para o agendador e as leituras administrativas

Esta especificação se baseia em:
- `reorder/docs/specs/dunning/domain-model.md`
- `reorder/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/specs/dunning/module-links.md`

O projeto segue os padrões do Medusa:
- os módulos personalizados possuem seus próprios modelos de dados
- as relações dentro do mesmo módulo devem utilizar relações do modelo de dados
- as relações com outros módulos podem utilizar IDs escalares, além de enriquecimento baseado em consultas no ambiente de execução atual, sendo que os links entre módulos continuam sendo um refinamento planejado
- os campos utilizados para processamento de filas, filtragem, classificação e decisões operacionais devem ser armazenados explicitamente
- JSON é apropriado para instantâneos de políticas e metadados flexíveis, não para campos primários da máquina de estados

Status da implementação:
- `Dunning` está implementado
- este documento continua sendo uma especificação de fase de projeto e do histórico de decisões para o modelo de persistência
- a fonte de verdade em tempo de execução está em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Resumo das decisões de projeto

O projeto final deve utilizar:
- uma entidade de persistência primária: `DunningCase`
- uma entidade de persistência secundária: `DunningAttempt`

Isso significa que:
- não modelamos o processo de cobrança apenas como campos em `Subscription`
- não modelamos o processo de cobrança apenas como campos em `RenewalCycle`
- não armazenamos o histórico de novas tentativas apenas em `metadata`
- não introduzimos um fluxo genérico `dunning_event` no MVP

## 2. Por que é preferível usar duas entidades de persistência

Modelo recomendado:
- `DunningCase`
- `DunningAttempt`

Por que isso é preferível em relação a uma única entidade `DunningCase`:
- o histórico de novas tentativas tem seu próprio ciclo de vida e valor de auditoria
- várias tentativas de recuperação devem ser rastreáveis como registros separados
- os detalhes de administração precisam de uma linha do tempo explícita das tentativas
- manter todo o histórico apenas no caso tornaria mais difícil compreender a lógica do agendador e do modelo de leitura

Por que essa abordagem é preferível a um modelo de eventos mais abrangente:
- O MVP precisa mais de clareza operacional do que da flexibilidade do event sourcing
- Um fluxo de eventos separado aumentaria a complexidade sem agregar valor imediato ao produto
- Os conceitos de “case” e “attempt” já abrangem o estado da fila, o histórico de recuperação e o diagnóstico de problemas

## 3. Alternativas rejeitadas

### 3.1 Projeto de entidade única

Opção rejeitada:
- apenas `DunningCase`, com histórico de tentativas em `metadata` ou em matrizes JSON

Por que isso é pior:
- mais difícil de auditar
- mais difícil de exibir cronogramas de repetição de tentativas
- semântica de repetição de tentativas mais fraca
- mais frágil para filtragem e análises posteriores

### 3.2 Projeto baseado exclusivamente em eventos

Opção rejeitada:
- `DunningCase`
- genérico `DunningEvent`
- opcional `DunningAttempt` derivado de eventos

Por que isso é pior para o MVP:
- excesso de indireção para o caso de uso atual do Admin
- a semântica de repetição de tentativas e de fechamento fica mais difícil de ler
- maior complexidade na implementação e no modelo de leitura

## 4. Modelo de persistência final

A camada de persistência deve girar em torno de:
- uma raiz de agregado: `DunningCase`
- uma entidade de histórico filha: `DunningAttempt`

### 4.1 `DunningCase`

`DunningCase` é o registro da fila e do estado de recuperação.

### Campos persistentes propostos

Campos simples:
- `id`
- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`
- `status`
- `attempt_count`
- `max_attempts`
- `next_retry_at`
- `last_payment_error_code`
- `last_payment_error_message`
- `last_attempt_at`
- `recovered_at`
- `closed_at`
- `recovery_reason`

Campos JSON:
- `retry_schedule`
- `metadata`

Marcadores de tempo:
- Marcadores de tempo padrão do Medusa, como `created_at` e `updated_at`

### 4.2 `DunningAttempt`

`DunningAttempt` é o registro do histórico de recuperação.

### Campos persistentes propostos

Campos simples:
- `id`
- `dunning_case_id`
- `attempt_no`
- `started_at`
- `finished_at`
- `status`
- `error_code`
- `error_message`
- `payment_reference`

Campos JSON:
- `metadata`

Marcadores de tempo:
- Marcadores de tempo padrão do Medusa, como `created_at` e `updated_at`

## 5. Por que `max_attempts` é explícito

O modelo deve armazenar `max_attempts` diretamente em `DunningCase`.

Por que:
- a elegibilidade para novas tentativas depende disso
- o administrador deve exibir o limite atual sem precisar recriá-lo a partir dos padrões da política
- um caso deve manter ativo o instantâneo do limite de novas tentativas tal como estava no momento em que foi criado

Isso evita vincular o comportamento atual do caso a futuras alterações na política padrão de repetição de tentativas.

## 6. Por que `next_retry_at` é explícito

O modelo deve armazenar `next_retry_at` diretamente em `DunningCase`.

Por que:
- a detecção do agendador precisa de filtragem direta por carimbo de data/hora de vencimento
- a lista e os detalhes do administrador precisam de visibilidade direta da próxima tentativa agendada
- a classificação e a filtragem por hora de vencimento da tentativa não devem depender da leitura de JSON

Este campo é o indicador de programação operacional do caso.

## 7. Por que o resumo dos erros mais recentes deve constar em `DunningCase`

O modelo deve armazenar:
- `last_payment_error_code`
- `last_payment_error_message`

Por que essa abordagem é preferível:
- A lista de administradores precisa de um resumo compacto das falhas
- O agendador e os fluxos operacionais podem precisar do contexto mais recente do erro sem carregar as tentativas
- O agregado do caso deve expor diretamente o estado atual da recuperação

Observação importante:
- esses campos não representam o histórico completo de erros
- o contexto detalhado do erro na tentativa de recuperação está em `DunningAttempt`

## 8. Por que `retry_schedule` deve constar em `DunningCase` como JSON

O modelo deve armazenar `retry_schedule` em `DunningCase` no formato JSON.

Por que:
- trata-se de um instantâneo da política, e não de um único valor escalar de controle
- a forma exata pode evoluir com decisões posteriores sobre a política de repetição de tentativas
- o caso deve preservar a programação que lhe foi atribuída, mesmo que os padrões globais sejam alterados posteriormente

Este campo não deve substituir:
- `next_retry_at`
- `attempt_count`
- `max_attempts`

Esses continuam sendo campos operacionais escalares explícitos.

## 9. Estratégia de relações dentro do módulo

A relação entre `DunningCase` e `DunningAttempt` deve ser uma relação interna dentro do mesmo módulo.

Semântica recomendada:
- um `DunningCase` possui vários registros `DunningAttempt`
- um `DunningAttempt` pertence a um `DunningCase`

Por que:
- trata-se de uma relação entre modelos de dados dentro do mesmo módulo
- os links do módulo Medusa servem para estabelecer limites de isolamento entre módulos, e não para relações entre entidades internas

## 10. Estratégia de relacionamento entre os módulos

O módulo `dunning` deve manter IDs escalares e também definir links de módulos para módulos externos quando necessário.

### `subscription_id`

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

### `renewal_order_id`

`DunningCase` deve armazenar:
- `renewal_order_id` como um campo escalar

E o módulo deverá definir posteriormente:
- um link de módulo entre `dunning_case` e `order`

Por quê:
- alguns casos de cobrança precisam de contexto de pedido para detalhes do administrador e orquestração de novas tentativas futuras
- as leituras vinculadas ainda devem seguir as regras de isolamento do módulo

### Artefatos de pagamento

Nesta fase:
- `payment_collection`
- `payment_session`
- `payment`

não devem ser modelados como relações diretas no modelo de persistência MVP.

Razão:
- o contrato atual pode ser satisfeito com resumo de erros em nível de caso e nível de tentativa `payment_reference`
- as necessidades de link de pagamento ainda são adiadas para decisões posteriores de repetição/detalhamento

## 11. Campos de instantâneo e auditoria necessários para detalhes do administrador

Para o MVP atual, o modelo de dados deve oferecer suporte aos detalhes do administrador com:
- status do caso e campos de agendamento em `DunningCase`
- resumo do erro mais recente em `DunningCase`
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
- `attempt_count`
- `next_retry_at`
- `last_payment_error_code`
- `last_payment_error_message`
- `last_attempt_at`

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

`DunningCase`
- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`
- `status`
- `next_retry_at`
- `last_attempt_at`
- `recovered_at`
- `closed_at`
- índice composto em `status` + `next_retry_at`

`DunningAttempt`
- `dunning_case_id`
- `attempt_no`
- `status`
- `started_at`
- `finished_at`
- índice exclusivo composto em `dunning_case_id` + `attempt_no`

Esses índices devem suportar:
- seleção de fila de repetição
- Filtragem de administrador
- carregamento de detalhes
- tentar ordenar a linha do tempo

### Por que `status + next_retry_at` é importante

Este índice composto é importante porque o agendador provavelmente descobrirá casos que podem ser repetidos:
- status ativo ou elegível para nova tentativa
- `next_retry_at <= now`

Sem esse índice composto, a fila de novas tentativas pode se tornar menos eficiente à medida que o volume aumenta.

## 15. Campos de nível de modelo recomendados para regras de exclusividade posteriores

O modelo de persistência deve suportar a aplicação posterior de:
- um caso por `renewal_cycle_id`
- um caso ativo por `subscription_id` na semântica do MVP

Nesta etapa, a decisão do modelo de dados é:
- manter os IDs e status escalares necessários para aplicar essas regras posteriormente
- deixar a estratégia exata de restrição do banco de dados para implementação e design de migração

Por quê:
- algumas regras de exclusividade podem depender da semântica do status ativo versus fechado
- isso pode exigir índices exclusivos parciais ou proteções no nível do fluxo de trabalho, dependendo das restrições de implementação

## 16. Recomendação final

O modelo de persistência MVP recomendado é:

- `DunningCase`
  - raiz agregada
  - estado de recuperação atual
  - tentar novamente os campos de agendamento
  - resumo do último erro de pagamento
  - resumo de fechamento e recuperação
  - campos de conveniência adequados para filas

- `DunningAttempt`
  - histórico filho somente anexado
  - carimbos de data e hora de recuperação
  - contexto de falha técnica
  - referência de pagamento

Nenhuma entidade de evento separada é necessária no MVP.

Se o domínio exigir posteriormente:
- cronogramas de operador mais ricos
- múltiplas decisões manuais
- histórico específico do artefato de pagamento
- auditar eventos além das tentativas de recuperação

então, um modelo no estilo `DunningEvent` pode ser introduzido posteriormente sem invalidar a estrutura principal de caso + tentativa.

## 17. Impacto nas etapas posteriores

Este modelo final significa:
- a implementação do módulo `dunning` deve exportar dois modelos de dados
- relacionamentos de mesmo módulo devem ser usados entre caso e tentativa
- os links do módulo devem posteriormente conectar o caso a `subscription`, `renewalCycle` e `order`
- os fluxos de trabalho devem atualizar o agregado do caso e anexar tentativas explicitamente
- o modelo de leitura Admin deve usar `DunningCase` como raiz para lista/detalhe e anexar tentativas para leituras detalhadas
