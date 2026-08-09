# Reordenar: consulta de renovações e especificação do modelo de leitura administrativa

Este documento cobre a etapa `2.3.10` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de leitura Admin para `Renewals`
- definir auxiliares de consulta separados para lista de filas, detalhes do ciclo e histórico de tentativas
- definir como a assinatura vinculada e os resumos de pedidos são enriquecidos
- definir qual classificação e filtragem deve acontecer no banco de dados versus na memória
- fornecer um modelo estável para endpoints posteriores da API Admin

Esta especificação se baseia em:
- `reorder/docs/specs/renewals/admin-spec.md`
- `reorder/docs/specs/renewals/domain-model.md`
- `reorder/docs/specs/renewals/data-model.md`
- `reorder/docs/specs/renewals/module-links.md`
- `reorder/docs/specs/renewals/state-machine.md`
- `reorder/docs/specs/renewals/billing-anchor-semantics.md`

A direção segue os padrões da Medusa:
- A lógica de leitura do administrador deve residir em auxiliares de consulta dedicados, não em manipuladores de rota
- `query.graph()` deve ser o principal mecanismo de leitura para enriquecimento entre módulos
- o módulo personalizado continua sendo a raiz do modelo de leitura
- a classificação baseada em banco de dados deve ser preferida para campos escalares explícitos
- a classificação na memória deve ser reservada para campos somente de exibição enriquecidos

Status de implementação:
- a área `Renewals` agora está implementada
- tratar este documento como contexto de tempo de design e justificativa do modelo de leitura
- a fonte atual da verdade em tempo de execução reside em:
  - `reorder/docs/architecture/renewals.md`
  - `reorder/docs/api/admin-renewals.md`
  - `reorder/docs/admin/renewals.md`
  - `reorder/docs/testing/renewals.md`

## 1. Raiz do modelo de leitura

O modelo de leitura Admin para `Renewals` deve usar `renewal_cycle` como entidade raiz.

Por quê:
- a fila é centrada no ciclo
- a página de detalhes é centrada no ciclo
- estado de aprovação, ordem gerada e status de execução pertencem ao ciclo
- as tentativas são o histórico filho, não a raiz da lista primária

Isso significa:
- Mapa de linhas da lista de administradores de `RenewalCycle`
- Detalhes do administrador carregam um `RenewalCycle`
- Os dados `RenewalAttempt` são anexados como histórico detalhado

## 2. Divisão do auxiliar de consulta

A divisão do modelo de leitura recomendada é:

- `listAdminRenewalCycles`
- `getAdminRenewalCycleDetail`
- `listRenewalAttemptsForCycle`
- funções auxiliares para enriquecimento de resumo vinculado

Isso reflete o padrão existente usado em `Subscriptions` e `Plans & Offers`.

## 3. Localização do arquivo

Os ajudantes do modelo de leitura devem residir em:

- `src/modules/renewal/utils/admin-query.ts`

Os auxiliares de mapeamento de suporte podem residir no mesmo arquivo, a menos que se tornem grandes o suficiente para serem divididos posteriormente.

## 4. Auxiliar de consulta da lista de filas

### Ajudante proposto

```ts
listAdminRenewalCycles(container, input)
```

### Responsabilidade

Este ajudante deve:
- consultar registros `renewal_cycle` para a fila Admin
- aplicar filtros de fila
- aplicar paginação
- aplicar classificação suportada
- enriquecer linhas com resumos vinculados compactos
- retornar uma resposta de lista já moldada para mapeamento Admin DTO

### Listar campos raiz

A lista de filas deve ler principalmente:
- `id`
- `subscription_id`
- `scheduled_for`
- `processed_at`
- `status`
- `approval_required`
- `approval_status`
- `generated_order_id`
- `last_error`
- `attempt_count`
- `created_at`
- `updated_at`

### A lista de filas não deve carregar

A consulta da lista não deve carregar ansiosamente:
- histórico completo de tentativas
- detalhes completos da assinatura vinculada
- detalhes completos do pedido vinculado
- instantâneos JSON desnecessários

A lista deve permanecer leve e orientada para filas.

## 5. Auxiliar de consulta detalhada

### Ajudante proposto

```ts
getAdminRenewalCycleDetail(container, id)
```

### Responsabilidade

Este ajudante deve:
- recuperar um `renewal_cycle`
- anexar resumo de aprovação
- anexar instantâneo de alteração pendente aplicado
- anexar resumo compacto da assinatura vinculada
- anexar resumo compacto do pedido vinculado
- anexar histórico de tentativas
- retornar um registro de administrador em forma de detalhe

### Campos raiz detalhados

O ajudante detalhado deve incluir:
- todos os campos raiz da lista de filas
- `approval_decided_at`
- `approval_decided_by`
- `approval_reason`
- `applied_pending_update_data`
- `metadata`

A consulta detalhada pode ser mais pesada que a lista de filas.

## 6. Auxiliar de consulta de histórico de tentativas

### Ajudante proposto

```ts
listRenewalAttemptsForCycle(container, renewal_cycle_id)
```

### Responsabilidade

Este ajudante deve:
- recuperar todas as tentativas de um ciclo
- classifique-os em ordem de execução
- mapeie-os em itens de linha do tempo/detalhe

### Campos necessários

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
- `created_at`
- `updated_at`

### Regra de ordenação

A ordem padrão recomendada é:
- `attempt_no ASC`

Isso mantém a linha do tempo detalhada estável e fácil de ler.

## 7. Resumo da assinatura vinculada

O modelo de leitura deve enriquecer a fila e detalhar os registros com um resumo de assinatura vinculado.

### Campos de resumo para lista

Resumo recomendado em nível de lista:
- assinatura `id`
- assinatura `reference`
- assinatura `status`
- `product_id`
- `variant_id`
- `frequency_interval`
- `frequency_value`
- `next_renewal_at`

### Campos de resumo para detalhes

A visualização detalhada também pode incluir:
- `last_renewal_at`
- `pending_update_data`
- instantâneos de assinatura estáveis já pertencentes ao módulo `subscription` quando necessário para exibição

### Limite importante

Os dados de assinatura vinculados são apenas para enriquecimento de exibição.

Não deve substituir:
- `RenewalCycle.status`
- `RenewalCycle.approval_status`
- `RenewalCycle.generated_order_id`
- `RenewalCycle.applied_pending_update_data`

## 8. Resumo do pedido vinculado

O modelo de leitura também deve enriquecer os registros com um resumo de pedido vinculado quando `generated_order_id` existir.

### Campos de resumo para lista

Resumo recomendado em nível de lista:
- pedido `id`
- `display_id`
- pedido `status`

### Campos de resumo para detalhes

A visualização detalhada também pode incluir:
- `created_at`
- `payment_status`
- `fulfillment_status`
- `total`
- `currency_code`

Tal como acontece com o enriquecimento de assinatura, este continua sendo um enriquecimento somente de exibição.

## 9. Escolha do mecanismo de consulta

### Mecanismo primário

Use `query.graph()` como mecanismo principal para:
- lendo `renewal_cycle`
- lendo `renewal_attempt`
- enriquecimento de assinaturas vinculadas e resumos de pedidos

Por quê:
- o modelo de leitura precisa de enriquecimento entre módulos
- corresponde ao padrão de leitura recomendado pelo administrador da Medusa
- os filtros atuais estão principalmente em campos escalares de propriedade do módulo

### Quando não usar `query.index()`

O modelo inicial de leitura do administrador `Renewals` não deve exigir `query.index()` por padrão.

Razão:
- a filtragem entre módulos ainda não é o formato de consulta principal
- a lista está enraizada nos campos da fila de propriedade do módulo
- registros vinculados são enriquecimentos de resumo, não raízes de filtro

Se os requisitos administrativos posteriores exigirem filtragem por assinatura vinculada ou campos de pedido, isso poderá ser adicionado como uma extensão de design posterior.

## 10. Estratégia de filtragem

### Filtros baseados em banco de dados

A lista de filas deve suportar filtros baseados em banco de dados para:
- `status`
- `approval_required`
- `approval_status`
- `subscription_id`
- `generated_order_id`
- `scheduled_for` períodos
- `processed_at` períodos

Estes campos pertencem ao módulo `renewal` e devem ser filtrados na camada do banco de dados.

### Procurar

Para o MVP, a pesquisa completa de texto livre nos campos vinculados de assinatura ou pedido não deve ser o requisito padrão.

Direção recomendada:
- filtros exatos nos campos escalares raiz primeiro
- pesquisa de campo vinculado somente mais tarde se o Admin UX realmente exigir

Isso mantém o modelo de primeira leitura mais simples e previsível.

## 11. Estratégia de classificação

### Classificação baseada em banco de dados

Campos de classificação de banco de dados preferenciais:
- `scheduled_for`
- `processed_at`
- `status`
- `approval_status`
- `attempt_count`
- `created_at`
- `updated_at`

Por quê:
- estes são campos escalares raiz explícitos
- o banco de dados pode classificá-los de forma eficiente
- eles atendem às filas e detalham as necessidades operacionais

### Classificação na memória

A classificação na memória deve ser reservada para campos enriquecidos somente para exibição, como:
- referência de assinatura
- etiqueta de exibição do pedido
- outras strings de exibição computadas

Não deve ser o caminho padrão.

Se uma classificação na memória for adicionada:
- deve ser explicitamente validado
- deve operar somente após os registros raiz paginados serem buscados
- deve ser limitado a campos que o banco de dados não pode classificar sem complexidade de consulta entre módulos

## 12. Estratégia de mapeamento DTO

O modelo de leitura deve mapear registros de consulta interna para DTOs orientados ao administrador.

### Formato da lista de filas

Cada item da lista deve incluir:
- identificadores de ciclo e carimbos de data/hora
- status do ciclo
- resumo de aprovação
- resumo compacto da assinatura
- resumo compacto do pedido
- contagem de tentativas
- resumo do último erro

### Detalhe da forma

A resposta detalhada deve incluir:
- todos os dados da lista
- resumo completo da aprovação
- instantâneo de alteração pendente aplicado
- cronograma de tentativas
- resumo expandido da assinatura
- resumo expandido do pedido

Isso mantém o código da UI do administrador fino e focado na exibição.

## 13. Orientação de desempenho

O auxiliar de lista deve otimizar para:
- pequenas seleções de campo
- filtragem de entidade raiz primeiro
- campos vinculados mínimos

O auxiliar detalhado pode carregar mais dados, mas ainda assim deve:
- solicitar apenas os campos realmente necessários para a página de detalhes
- evite carregar coleções vinculadas não relacionadas

O histórico de tentativas não deve ser carregado para cada linha da fila.

## 14. Erro e comportamento não encontrado

O auxiliar da lista deve:
- retorna resultados vazios quando nenhum ciclo corresponde aos filtros

O ajudante detalhado deve:
- gera um erro não encontrado apropriado ao domínio quando o ciclo não existe

O auxiliar do histórico de tentativas deve:
- retorna um array vazio quando um ciclo ainda não tem tentativas

## 15. Recomendação final

A estrutura de modelo de leitura de administrador recomendada para `Renewals` é:

- `listAdminRenewalCycles`
  - lista raiz orientada a fila
  - Filtragem e classificação apoiada por banco de dados em campos escalares de propriedade de ciclo
  - resumos vinculados leves

- `getAdminRenewalCycleDetail`
  - detalhe da raiz do ciclo
  - campos de aprovação e alteração aplicada
  - assinatura vinculada e resumos de pedidos
  - cronograma de tentativa anexado

- `listRenewalAttemptsForCycle`
  - ajudante de história infantil
  - encomendado por `attempt_no`

Isso é preferido porque corresponde à arquitetura de plug-in existente, segue os padrões de consulta da Medusa e mantém a API Admin fina, preservando o isolamento do módulo.
