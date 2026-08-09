# Reordenar: especificações finais do modelo de dados de cancelamento e retenção

Este documento cobre a etapa `2.5.10` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de persistência final para `Cancelamento e Retenção`
- decidir se a área deve usar uma entidade, duas entidades ou um modelo mais amplo de estilo de evento
- definir os campos necessários para detalhes administrativos, auditabilidade e decisões de fluxo de trabalho
- definir se um dicionário opcional `churn_reason` deve existir no MVP
- definir a estratégia de indexação para leituras administrativas e pesquisas de processos

Esta especificação se baseia em:
- `reordenar/docs/specs/cancellation-retention/domain-model.md`
- `reordenar/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reordenar/docs/specs/cancellation-retention/state-machine.md`
- `reorder/docs/specs/cancellation-retention/lifecycle-semantics.md`
- `reordenar/docs/specs/cancellation-retention/module-impact-semantics.md`

O design segue os padrões da Medusa:
- módulos personalizados possuem seus próprios modelos de dados
- relações dentro do mesmo módulo devem usar relacionamentos de modelo de dados
- as relações com outros módulos devem usar IDs escalares e posterior enriquecimento vinculado sem sobreposição de propriedade
- os campos usados para filtragem, classificação, transições de estado e decisões operacionais devem ser armazenados explicitamente
- JSON é apropriado para cargas úteis e metadados de ofertas flexíveis, não para máquinas de estado primárias ou campos de relatórios

Status de implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte da verdade em tempo de design para o modelo de persistência do futuro módulo de cancelamento

## 1. Resumo da decisão de design

O design final deve usar:
- uma entidade de persistência primária: `CancellationCase`
- uma entidade de persistência filha: `RetentionOfferEvent`

Isso significa:
- não modelamos o tratamento de cancelamento apenas como campos em `Assinatura`
- não armazenamos o histórico de ofertas de retenção apenas em `metadados`
- não introduzimos um fluxo `cancellation_event` genérico no MVP
- não introduzimos uma tabela `churn_reason` separada no MVP

## 2. Por que duas entidades de persistência são preferidas

Modelo recomendado:
- `Caso de cancelamento`
- `RetentionOfferEvent`

Por que isso é preferível a uma única entidade `CancellationCase`:
- o histórico agregado de casos e a oferta têm ciclos de vida diferentes
- Os detalhes do administrador precisam de um cronograma explícito de ofertas e decisões
- múltiplas ofertas devem permanecer auditáveis como registros separados
- as regras de fluxo de trabalho ficam mais simples quando o estado atual do caso e o histórico de ofertas não são recolhidos em uma linha

Por que isso é preferível a um design de estilo de evento mais amplo:
- O MVP precisa mais de clareza operacional do que de flexibilidade no fornecimento de eventos
- um fluxo de eventos genérico adicionaria complexidade ao modelo de leitura sem valor imediato do produto
- caso + evento de oferta já cobre estado do processo, histórico e necessidades de análise

## 3. Alternativas rejeitadas

### 3.1 Projeto de entidade única

Opção rejeitada:
- apenas `CancellationCase`, com histórico de retenção em `metadados` ou matrizes JSON

Por que é pior:
- mais difícil de auditar
- mais difícil de renderizar cronogramas de casos
- semântica histórica mais fraca
- menos alinhado com o padrão estabelecido de `Renovações` e `Dunning`

### 3.2 Dicionário de motivos gerenciado pelo administrador no MVP

Opção rejeitada:
- tabela `churn_reason` separada como parte do design de persistência inicial

Por que é pior para o MVP:
- `reason_category` já é uma predefinição/enum por decisão anterior
- `reason` já captura o contexto do operador de texto livre
- um dicionário gerenciado introduziria um domínio de configurações separado sem necessidade imediata do produto
- exigiria APIs CRUD adicionais, interface de administração e semântica de controle de versão

## 4. Modelo de persistência final

A camada de persistência deve girar em torno de:
- uma raiz agregada: `CancellationCase`
- uma entidade de histórico filho: `RetentionOfferEvent`

### 4.1 `Caso de cancelamento`

`CancellationCase` é o registro do estado do processo e do resumo do processo.

### Campos persistentes propostos

Campos simples:
- `id`
- `subscription_id`
- `status`
- `reason`
- `reason_category`
- `notes`
- `recommended_action`
- `final_outcome`
- `finalized_at`
- `finalized_by`
- `cancellation_effective_at`

Campos JSON:
- `metadata`

Carimbos de data e hora:
- Carimbos de data e hora padrão do Medusa, como `created_at` e `updated_at`

### 4.2 `RetentionOfferEvent`

`RetentionOfferEvent` é o registro do histórico de ofertas e decisões, no qual só é possível fazer acréscimos.

### Campos persistentes propostos

Campos simples:
- `id`
- `cancellation_case_id`
- `offer_type`
- `decision_status`
- `decision_reason`
- `decided_at`
- `decided_by`
- `applied_at`

Campos JSON:
- `offer_payload`
- `metadata`

Carimbos de data e hora:
- Carimbos de data e hora padrão do Medusa, como `created_at` e `updated_at`

## 5. Por que não há uma tabela `churn_reason` no MVP

O MVP não deve introduzir uma tabela de dicionário `churn_reason`.

Por que:
- `reason_category` já é o campo estruturado para relatórios e filtragem
- `reason` continua sendo a explicação comercial em texto livre
- o escopo atual do produto não justifica um domínio separado de configurações

Se for necessário posteriormente, um dicionário de motivos gerenciado poderá ser introduzido como um recurso separado para:
- rótulos localizados
- ativação/desativação
- separação dos motivos selecionáveis da taxonomia de relatórios

## 6. Decisões entre Scalar e JSON

Utilize colunas escalares para:
- identificadores
- status
- campos de relatório
- carimbos de data/hora
- campos de resumo de auditoria
- campos de conveniência utilizados em filtragem e classificação

Use JSON para:
- `CancellationCase.metadata`
- `RetentionOfferEvent.offer_payload`
- `RetentionOfferEvent.metadata`

Por que:
- os estados do caso e do evento devem permanecer explícitos e consultáveis
- `offer_payload` é intencionalmente flexível, pois sua estrutura varia de acordo com `offer_type`
- `metadata` é reservado para extensibilidade não essencial

## 7. Campos de auditoria e operacionais necessários para os detalhes do administrador

### `Caso de cancelamento`

A tabela de casos deve armazenar campos operacionais e de auditoria diretamente, pois eles são necessários para:
- filtragem de listas
- exibição de detalhes
- restrições de ação
- ramificação do fluxo de trabalho
- análise de rotatividade

Campos importantes:
- `estado`
- `razão_categoria`
- `ação_recomendada`
- `resultado_final`
- `finalizado_em`
- `finalizado_por`
- `cancelamento_efetivo_em`
- `criado_em`
- `atualizado_em`

### `RetentionOfferEvent`

A tabela offer-event deve armazenar campos de resumo e auditoria de eventos diretamente porque eles são necessários para:
- renderização da linha do tempo
- oferecer métricas de aceitação
- histórico de ação
- solução de problemas de ofertas aplicadas versus ofertas não aplicadas

Campos importantes:
- `tipo_oferta`
- `status_decisão`
- `motivo_decisão`
- `decidiu_em`
- `decidido_por`
- `aplicado_em`
- `criado_em`
- `atualizado_em`

## 8. Estratégia de relacionamento dentro do módulo

A relação entre `CancellationCase` e ​​`RetentionOfferEvent` deve ser uma relação interna do mesmo módulo.

Semântica recomendada:
- um `CancellationCase` tem muitos registros `RetentionOfferEvent`
- um `RetentionOfferEvent` pertence a um `CancellationCase`

Por quê:
- este é um relacionamento de modelo de dados do mesmo módulo
- links de módulo são para limites de isolamento entre módulos, não para relacionamentos de entidades internas

## 9. Estratégia de relacionamento entre módulos

O módulo de cancelamento deve manter IDs escalares para contexto externo e evitar duplicação de propriedade.

### `id_da_assinatura`

`CancellationCase` deve armazenar:
- `subscription_id` como um campo escalar

Por quê:
- suporta filtragem, indexação e pesquisa de casos ativos
- corresponde ao padrão prático já utilizado em `Renovações` e `Dunning`
- o enriquecimento vinculado pode ser adicionado posteriormente sem remover o acesso eficiente ao registro de origem

### Nenhuma relação direta de persistência com `DunningCase` ou `RenewalCycle` no MVP

Nesta fase, o modelo de persistência não deve adicionar campos diretos como:
- `dunning_case_id`
- `renovação_ciclo_id`

Por quê:
- `Cancelamento e Retenção` não possui esses agregados
- o contrato atual de administração e fluxo de trabalho pode contar com `subscription_id` mais leituras vinculadas ou enriquecimento em tempo de consulta posteriormente
- adicionar esses campos agora sugeriria um acoplamento de propriedade mais forte do que o design atual permite

## 10. Estratégia de indexação para `cancellation_case`

Índices recomendados:
- índice em `subscription_id`
- índice em `status`
- índice em `final_outcome`
- índice em `reason_category`
- índice em `created_at`

Índices compostos adicionais recomendados:
- índice composto em `subscription_id, status`
- índice composto em `status, criado_at`

Por quê:
- `subscription_id` suporta pesquisa de casos ativos e junções de detalhes
- `status`, `final_outcome` e `reason_category` suportam filtros administrativos e relatórios
- `created_at` suporta linha do tempo padrão e classificação de lista
- índices compostos melhoram leituras comuns de casos ativos e semelhantes a filas

## 11. Estratégia de indexação para `retention_offer_event`

Índices recomendados:
- índice em `cancellation_case_id`
- índice em `offer_type`
- índice em `decision_status`
- índice em `created_at`

Índices compostos adicionais recomendados:
- índice composto em `cancellation_case_id,created_at`
- índice composto em `offer_type, Decision_status`

Por quê:
- `cancellation_case_id` suporta leituras de linha do tempo para um caso
- `offer_type` e `decision_status` suportam análises futuras e filtros administrativos
- `created_at` suporta ordem cronológica
- índices compostos melhoram a renderização da linha do tempo e agregações de estilo de taxa de aceitação

## 12. Invariante de exclusividade de caso ativo

A invariante de negócio permanece:
- uma assinatura pode ter no máximo um `CancellationCase` ativo por vez

Interpretação recomendada nesta fase:
- a invariante deve ser aplicada principalmente na lógica de fluxo de trabalho/serviço
- uma otimização no nível do banco de dados ou uma estratégia de exclusividade mais forte pode ser adicionada posteriormente, quando a implementação do tempo de execução e o comportamento do banco de dados forem finalizados

Por que isso é preferido:
- a semântica de status ativo versus terminal são regras de nível de negócios
- a aplicação do fluxo de trabalho é necessária independentemente das restrições do banco de dados
- mantém o design de persistência portátil enquanto preserva o invariante

## 13. Decisão sumária

O modelo de persistência MVP é:
- `caso_cancelamento`
- `retenção_oferta_evento`

Com estes princípios-chave:
- nenhuma tabela `churn_reason` no MVP
- campos escalares explícitos para processo principal e estado de relatório
- JSON apenas para cargas úteis e metadados flexíveis
- relação de mesmo módulo entre eventos de caso e oferta
- escalar `subscription_id` para contexto de vários domínios
- índices otimizados para lista de administradores, detalhes e pesquisa de casos
