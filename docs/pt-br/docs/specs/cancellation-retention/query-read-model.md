# Reordenar: consulta de cancelamento e retenção e especificação do modelo de leitura administrativa

Este documento cobre a etapa `2.5.12` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de leitura Admin para `Cancellation & Retention`
- definir auxiliares de consulta separados para lista de casos, detalhes do caso e histórico de eventos de oferta
- definir como os resumos vinculados de assinaturas, cobranças e renovações são enriquecidos
- definir qual classificação e filtragem deve acontecer no banco de dados versus na memória
- fornecer um modelo estável para endpoints posteriores da API Admin

Esta especificação se baseia em:
- `reorder/docs/specs/cancellation-retention/domain-model.md`
- `reorder/docs/specs/cancellation-retention/data-model.md`
- `reorder/docs/specs/cancellation-retention/module-links.md`
- `reorder/docs/specs/cancellation-retention/state-machine.md`
- `reorder/docs/specs/cancellation-retention/module-impact-semantics.md`

A direção segue os padrões da Medusa:
- A lógica de leitura do administrador deve residir em auxiliares de consulta dedicados, não em manipuladores de rota
- `query.graph()` deve ser o principal mecanismo de leitura para registros de origem e enriquecimento vinculado
- o módulo personalizado continua sendo a raiz do modelo de leitura
- a classificação baseada em banco de dados deve ser preferida para campos escalares explícitos
- a classificação na memória deve ser reservada para pequenas composições enriquecidas apenas para exibição

Status de implementação:
- `Cancellation & Retention` ainda não foi implementado
- este documento é a fonte de verdade em tempo de design para o modelo de leitura do administrador do futuro módulo de cancelamento

## 1. Raiz do modelo de leitura

O modelo de leitura Admin para `Cancellation & Retention` deve usar `cancellation_case` como entidade raiz.

Por quê:
- a fila e a lista são centradas no caso
- a página de detalhes é centrada no caso
- os campos de captura do motivo, estado da recomendação, resumo do resultado e auditoria pertencem ao caso
- os eventos de oferta são o histórico filho, não a raiz da lista primária

Isso significa:
- Mapa de linhas da lista de administradores de `CancellationCase`
- Detalhes do administrador carregam um `CancellationCase`
- Os dados `RetentionOfferEvent` são anexados como histórico detalhado

## 2. Divisão do auxiliar de consulta

A divisão do modelo de leitura recomendada é:

- `listAdminCancellationCases`
- `getAdminCancellationCaseDetail`
- `listRetentionOfferEventsForCase`
- funções auxiliares para enriquecimento de resumo vinculado

Isso reflete o padrão existente já usado em:
- `Plans & Offers`
- `Renewals`
- `Dunning`

## 3. Localização do arquivo

Os ajudantes do modelo de leitura devem residir em:

- `reorder/src/modules/cancellation/utils/admin-query.ts`

Os auxiliares de mapeamento de suporte podem residir no mesmo arquivo, a menos que se tornem grandes o suficiente para serem divididos posteriormente.

## 4. Auxiliar de consulta de lista de casos

### Ajudante proposto

```ts
listAdminCancellationCases(container, input)
```

### Responsabilidade

Este ajudante deve:
- consultar registros `cancellation_case` para a lista de administradores
- aplicar filtros
- aplicar paginação
- aplicar classificação suportada
- enriquecer linhas com resumos compactos de assinaturas vinculadas
- retornar uma resposta de lista já moldada para mapeamento Admin DTO

### Listar campos raiz

A lista deve ler principalmente:
- `id`
- `subscription_id`
- `status`
- `reason`
- `reason_category`
- `recommended_action`
- `final_outcome`
- `finalized_at`
- `cancellation_effective_at`
- `created_at`
- `updated_at`

### A lista não deve carregar

A consulta da lista não deve carregar ansiosamente:
- histórico completo de eventos de oferta
- detalhes completos da assinatura vinculada
- detalhe completo da cobrança
- detalhes completos da renovação
- blobs JSON desnecessários, a menos que sejam diretamente necessários para exibição de lista

A lista deve permanecer leve e filtrável operacionalmente.

## 5. Auxiliar de consulta detalhada

### Ajudante proposto

```ts
getAdminCancellationCaseDetail(container, id)
```

### Responsabilidade

Este ajudante deve:
- recuperar um `cancellation_case`
- anexar resumo do processo e resumo da auditoria
- anexar resumo compacto da assinatura vinculada
- anexar resumo de cobrança opcional
- anexar resumo de renovação opcional
- anexar histórico de eventos de oferta
- retornar um registro de administrador em forma de detalhe

### Campos raiz detalhados

O ajudante detalhado deve incluir:
- todos os campos raiz da lista
- `notes`
- `finalized_by`
- `metadata`

A consulta detalhada pode ser mais pesada que a consulta de lista.

## 6. Auxiliar de consulta de histórico de ofertas

### Ajudante proposto

```ts
listRetentionOfferEventsForCase(container, cancellation_case_id)
```

### Responsabilidade

Este ajudante deve:
- recuperar todos os eventos de um caso
- classifique-os em ordem cronológica estável
- mapeie-os em itens de linha do tempo/detalhe

### Campos necessários

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
- `created_at`
- `updated_at`

### Regra de ordenação

A ordem padrão recomendada é:
- `created_at ASC`

Isso mantém a linha do tempo detalhada estável e fácil de ler.

## 7. Resumo da assinatura vinculada

O modelo de leitura deve enriquecer a lista e detalhar os registros com um resumo de assinatura vinculado.

### Campos de resumo para lista

Resumo recomendado em nível de lista:
- assinatura `id`
- assinatura `reference`
- assinatura `status`
- `next_renewal_at`
- nome do cliente de `customer_snapshot`
- título do produto e título da variante de `product_snapshot`

### Campos de resumo para detalhes

A visualização detalhada também pode incluir:
- `last_renewal_at`
- `paused_at`
- `cancelled_at`
- `cancel_effective_at`
- `pending_update_data` quando necessário para contexto operacional

### Limite importante

Os dados de assinatura vinculados são apenas para enriquecimento de exibição.

Não deve substituir:
- `CancellationCase.status`
- `CancellationCase.reason_category`
- `CancellationCase.recommended_action`
- `CancellationCase.final_outcome`

## 8. Resumo de cobrança vinculado

O modelo de leitura deve expor o contexto de cobrança como um auxiliar de enriquecimento separado, e não como parte da consulta do caso raiz.

### Ajudante proposto

```ts
getDunningSummaryForCancellationCase(container, subscription_id)
```

### Responsabilidade

Este auxiliar deve retornar apenas contexto operacional compacto, como:
- se existe um `DunningCase` ativo
- `dunning_case.id`
- `status`
- `attempt_count`
- `next_retry_at`
- `last_payment_error_message`

Não deve carregar:
- histórico completo de tentativas
- gráfico completo de detalhes de cobrança

### Por que deveria ficar separado

- `DunningCase` não é uma âncora primária de `CancellationCase`
- a cobrança é apenas contextual ao tratamento de cancelamento
- mantê-lo separado evita misturar duas raízes de origem em um caminho de consulta pesado

## 9. Resumo de renovação vinculado

O modelo de leitura deve expor o contexto de renovação como um auxiliar de enriquecimento separado.

### Ajudante proposto

```ts
getRenewalSummaryForCancellationCase(container, subscription_id)
```

### Responsabilidade

Este auxiliar deve retornar um contexto operacional compacto, como:
- resumo do ciclo de renovação atual ou mais próximo
- `renewal_cycle.id`
- `status`
- `scheduled_for`
- `approval_status`
- `generated_order_id`

Não deve carregar:
- histórico completo de renovação
- histórico completo de tentativas

### Por que deveria ficar separado

- `CancellationCase` não está ancorado em um ciclo concreto de renovação
- os dados de renovação são exibidos e contextualizados pelo operador, e não a fonte da verdade do processo de cancelamento

## 10. Escolha do mecanismo de consulta

### Mecanismo primário

Use `query.graph()` como mecanismo principal para:
- lendo `cancellation_case`
- lendo `retention_offer_event`
- enriquecendo resumos de assinaturas vinculados

Por quê:
- o modelo de leitura precisa de leituras de registros de origem, além de enriquecimento de exibição vinculado
- corresponde ao padrão de leitura recomendado pelo administrador da Medusa
- os filtros atuais estão principalmente em campos escalares de propriedade do módulo

### Cobrança e enriquecimento de renovação

Os resumos de cobrança e renovação devem usar o enriquecimento no tempo de consulta até `subscription_id`.

Eles não devem ser tratados como leituras infantis de propriedade direta do módulo de cancelamento.

### Quando não usar `query.index()`

O modelo de leitura inicial do Admin não deve exigir `query.index()` por padrão.

Razão:
- a lista está enraizada nos campos de caso de propriedade do módulo
- registros vinculados são enriquecimentos de resumo, não raízes de filtro

Se mais tarde a lista de administradores realmente precisar ser filtrada por campos vinculados, como:
- referência de assinatura
- nome do cliente
- título do produto
- status de cobrança
- data prevista para renovação

em seguida, trate isso como filtragem de dados vinculados e introduza explicitamente `query.index()` ou uma estratégia de consulta vinculada dedicada.

## 11. Regras de classificação

O modelo de leitura deve dividir a classificação em:
- classificação baseada em banco de dados
- classificação opcional na memória para pequenas composições enriquecidas somente para exibição

### Classificação baseada em banco de dados

Campos raiz classificáveis preferidos:
- `created_at`
- `updated_at`
- `status`
- `final_outcome`
- `reason_category`
- `finalized_at`

Para eventos de oferta:
- `created_at`
- `decided_at`
- `applied_at`

Esses campos devem ser classificados no banco de dados e não na memória.

### Classificação na memória

A classificação na memória é aceitável apenas para:
- pequenas seções enriquecidas em nível de detalhe
- ordenação somente para exibição após um único caso e seus resumos relacionados já terem sido carregados

### O que não deve depender da classificação na memória

A lista de casos paginada não deve depender da classificação na memória por campos como:
- referência de assinatura
- nome do cliente
- título do produto
- status de cobrança
- data prevista para renovação

Por quê:
- quebra a correção da paginação
- A classificação Medusa `query.graph()` não funciona como uma classificação raiz normal em campos vinculados
- esses campos pertencem ao enriquecimento, não à raiz da lista de origem

## 12. Decisão sumária

O modelo de leitura Admin deve usar:
- `listAdminCancellationCases`
- `getAdminCancellationCaseDetail`
- `listRetentionOfferEventsForCase`
- auxiliares de resumo vinculado para contexto de assinatura, cobrança e renovação

Com estes princípios-chave:
- `CancellationCase` permanece a raiz do modelo de leitura
- `RetentionOfferEvent` permanece o histórico filho do mesmo módulo
- a assinatura é o principal enriquecimento vinculado
- cobrança e renovação são enriquecimentos opcionais de contexto no tempo de consulta
- a classificação baseada em banco de dados é o padrão para campos escalares de origem
- a classificação na memória é limitada a pequenas composições de detalhes somente para exibição
