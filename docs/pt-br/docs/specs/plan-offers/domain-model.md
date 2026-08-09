# Reorganização: Especificação do modelo de domínio de planos e ofertas

Este documento abrange a etapa `2.2.2`, de `documentation/implementation_plan.md`.

Objetivo:
- definir o contrato de domínio para `PlanOffer`
- definir o contrato lógico para `ProductSubscriptionConfig`
- decidir quais dados pertencem ao modelo como colunas regulares
- decidir quais dados podem ser armazenados como JSON
- fornecer uma base estável para fluxos de trabalho, filtragem administrativa e futura lógica de configuração eficaz

O projeto segue os padrões da Medusa:
- cada módulo personalizado é responsável por seu próprio domínio
- as entidades de comércio são conectadas por meio de links entre módulos, e não por relações diretas de DML
- os campos utilizados para filtragem, ordenação e validação devem ser armazenados explicitamente
- o JSON é adequado para configurações flexíveis, mas não para campos operacionais críticos

## 1. Premissas arquitetônicas

A área `Plans & Offers` possui dois níveis conceituais:

- `PlanOffer`
- `ProductSubscriptionConfig`

`PlanOffer` é o registro de origem armazenado no módulo do plug-in.

`ProductSubscriptionConfig` é um contrato lógico que descreve a configuração final da assinatura aplicável a um produto ou variante após a resolução de fallback.

Na prática:
- `PlanOffer` será uma entidade em seu próprio módulo
- `ProductSubscriptionConfig` não precisa ser uma tabela separada nesta fase
- `ProductSubscriptionConfig` pode ser calculado por um auxiliar de consulta ou serviço de domínio a partir de um ou dois registros `PlanOffer`

## 2. Limites de responsabilidade

### `PlanOffer`

O `PlanOffer` é responsável por:
- armazenar a configuração da oferta de assinatura de origem
- identificar o destino `product` ou `variant`
- armazenar o sinalizador de ativação
- armazenar as frequências de cobrança permitidas
- armazenar o mapeamento de descontos por frequência
- armazenar as regras de negócios da oferta

A `PlanOffer` não se responsabiliza por:
- o ciclo de vida de uma assinatura do cliente
- instantâneos do cliente
- cronogramas de renovação
- alterações resultantes na assinatura

### `ProductSubscriptionConfig`

`ProductSubscriptionConfig` é responsável por:
- descrever a configuração final de um produto ou variante selecionado
- identificar a origem da configuração efetiva
- representar o recurso alternativo de `variant > product`

`ProductSubscriptionConfig` não precisa ser uma entidade de persistência nesta fase.

## 3. Escopo e alternativa

O sistema suporta dois escopos:
- `product`
- `variant`

Semântica:
- um registro `product` define a oferta básica para todo o produto
- um registro `variant` define uma substituição para uma variante específica
- se houver um registro `variant` ativo, ele terá prioridade sobre o registro `product`
- se um registro `variant` não existir ou estiver inativo, a configuração efetiva poderá recorrer ao registro `product` ativo

Prioridade:
- `variant` > `product`

## 4. Contrato de domínio `PlanOffer`

Contrato de domínio mínimo:

- `id`
- `name`
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`
- `allowed_frequencies`
- `discount_per_frequency`
- `rules`
- `metadata`

### Forma lógica proposta

```ts
type PlanOffer = {
  id: string
  name: string
  scope: "product" | "variant"
  product_id: string
  variant_id: string | null
  is_enabled: boolean
  allowed_frequencies: SubscriptionFrequencyOption[]
  discount_per_frequency: SubscriptionDiscountPerFrequency[]
  rules: PlanOfferRules | null
  metadata: Record<string, unknown> | null
}
```

## 5. Campos regulares do modelo

Os seguintes campos devem ser colunas de modelo regulares:

- `id`
- `name`
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`

Por quê:
- eles são necessários para filtragem e classificação do administrador
- eles são necessários para indexação
- eles são necessários para integridade e validação de conflitos
- corresponde aos padrões Medusa, onde IDs de entidades externas são frequentemente armazenados explicitamente em modelos personalizados

## 6. Por que `product_id` e `variant_id` devem ser campos escalares

Seguindo padrões práticos da Medusa:
- as relações com o produto e a variante serão implementadas através de links de módulos
- mesmo assim, `product_id` e `variant_id` devem existir como campos de modelo explícitos

Por quê:
- simplifica consultas de lista/detalhe
- simplifica a filtragem baseada em alvo
- simplifica os índices da lista de administradores
- torna regras de validação como `variant scope requires variant_id` simples

## 7. `variant_id` e semântica de escopo

Regras:
- quando `scope = product`, `variant_id = null`
- quando `scope = variant`, `variant_id` é necessário
- um registro em nível de variante sempre armazena `product_id` também

Por quê:
- um `variant` pertence operacionalmente a um produto concreto
- A lista de administradores e consultas futuras de configuração efetiva precisam de ambos os IDs
- isso também simplifica a filtragem e futuras verificações de fumaça com `Subscriptions`

## 8. `allowed_frequencies`

`allowed_frequencies` é a lista de domínios de frequências de compra de assinaturas suportadas.

### Forma proposta

```ts
type SubscriptionFrequencyOption = {
  interval: "week" | "month" | "year"
  value: number
}
```

Exemplos:
- `{ interval: "month", value: 1 }`
- `{ interval: "month", value: 2 }`
- `{ interval: "week", value: 1 }`

### Decisão de armazenamento

`allowed_frequencies` deve ser armazenado como JSON.

Por quê:
- é uma lista de valores estruturados
- as frequências fazem parte logicamente de uma configuração de oferta
- eles não exigem uma entidade separada no MVP

### Regras de domínio

- a lista não pode ficar vazia
- cada item deve ter um `value` positivo
- pares `interval + value` duplicados não são permitidos

## 9. `discount_per_frequency`

`discount_per_frequency` descreve o desconto atribuído a uma frequência específica.

### Forma proposta

```ts
type SubscriptionDiscountPerFrequency = {
  interval: "week" | "month" | "year"
  value: number
  discount_type: "percentage" | "fixed"
  discount_value: number
}
```

### Decisão de armazenamento

`discount_per_frequency` deve ser armazenado como JSON.

Por quê:
- é uma pequena configuração aninhada ligada à frequência
- ainda não precisa de uma tabela separada
- é conveniente validar em fluxos de trabalho

### Regras de domínio

- o desconto só poderá existir para uma frequência presente em `allowed_frequencies`
- para um par `interval + value` é permitido no máximo um desconto
- perder um desconto para uma frequência permitida é válido
- `discount_type = percentage` requer validação de faixa percentual em fluxos de trabalho
- `discount_type = fixed` usa o número armazenado diretamente, sem multiplicar por 100, consistente com o comportamento de preços da Medusa

## 10. `rules`

`rules` armazena restrições comerciais adicionais para a oferta.

### Forma proposta

```ts
type PlanOfferRules = {
  minimum_cycles: number | null
  trial_enabled: boolean
  trial_days: number | null
  stacking_policy:
    | "allowed"
    | "disallow_all"
    | "disallow_subscription_discounts"
}
```

### Decisão de armazenamento

`rules` deve ser armazenado como JSON.

Por quê:
- é um conjunto agrupado de campos de configuração de negócios
- a forma pode evoluir em estágios posteriores sem alterar as colunas principais do modelo
- estes não são os campos de primeira escolha para filtragem de lista MVP primária

### Regras de domínio

- se definido, `minimum_cycles` deve ser um número inteiro positivo
- se `trial_enabled = false`, `trial_days` deveria ser `null`
- se `trial_enabled = true`, `trial_days` deve ser um número inteiro positivo

## 11. `metadata`

`metadata` permanece um campo JSON padrão.

Por quê:
- este é o padrão Medusa padrão para dados extras não essenciais
- não deve armazenar dados que exijam validação de domínio rigorosa
- não deve armazenar campos necessários para filtragem, classificação ou lógica de configuração efetiva

## 12. Contrato lógico `ProductSubscriptionConfig`

`ProductSubscriptionConfig` representa a configuração final após a resolução de fallback.

### Forma proposta

```ts
type ProductSubscriptionConfig = {
  product_id: string
  variant_id: string | null
  source_offer_id: string | null
  source_scope: "product" | "variant" | null
  is_enabled: boolean
  allowed_frequencies: SubscriptionFrequencyOption[]
  discount_per_frequency: SubscriptionDiscountPerFrequency[]
  rules: PlanOfferRules | null
}
```

### Semântica

- `source_offer_id` identifica qual registro `PlanOffer` produziu a configuração final
- `source_scope` informa se a configuração efetiva vem de um registro no nível do produto ou no nível da variante
- se não houver configuração ativa, `source_offer_id` e `source_scope` podem ser `null`

## 13. Como `ProductSubscriptionConfig` é resolvido

### Para um produto

Ao solicitar a configuração de um produto sem variante:
- use o registro `PlanOffer` ativo com `scope = product`
- o resultado descreve a configuração base do produto

### Para uma variante

Ao solicitar configuração para uma variante:
1. procure um registro `PlanOffer` ativo com `scope = variant`
2. se existir, é a fonte da configuração efetiva
3. caso não exista, procure um registro `PlanOffer` ativo com `scope = product`
4. se esse registro existir, o substituto vem do produto
5. se não existir nenhum registro ativo, a configuração está vazia ou inativa

## 14. `ProductSubscriptionConfig` deve ser uma tabela separada

Nesta fase: não.

Por quê:
- é um conceito derivado
- seus dados podem ser calculados a partir de `PlanOffer`
- isso evita riscos de duplicação e sincronização

Uma tabela separada só seria útil se:
- a configuração eficaz deve ser materializada por motivos de desempenho
- aparece uma herança multicamadas mais complexa
- instantâneos auditáveis de configuração efetiva tornam-se necessários

## 15. Índices e impacto futuro do modelo

Este contrato sugere índices futuros pelo menos para:
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`

Opcional mais tarde:
- índice composto para `(scope, product_id)`
- índice composto para `(scope, variant_id)`

`allowed_frequencies`, `discount_per_frequency`, `rules` e `metadata` não devem ser candidatos primários à indexação no MVP.

## 16. Links do módulo

A próxima etapa deve apresentar links:
- `planOffer <-> product`
- `planOffer <-> variant`

O contrato de domínio assume intencionalmente:
- `product_id` explícito
- `variant_id` explícito
- links de módulos separados

Isso segue o padrão prático da Medusa:
- links preservam o isolamento do módulo
- IDs escalares simplificam consultas e filtragem

## 17. Regras de integridade de domínio

Regras de consistência mínima:

- `scope = product` requer `product_id` e proíbe `variant_id`
- `scope = variant` requer `product_id` e `variant_id`
- `allowed_frequencies` não pode estar vazio
- `discount_per_frequency` não pode conter frequências fora de `allowed_frequencies`
- frequências duplicadas não são permitidas
- não são permitidos descontos duplicados para a mesma frequência

Além disso, as etapas posteriores de back-end devem decidir a política de exclusividade:
- se deve ser permitido exatamente um registro `product` ativo por `product_id`
- se deve ser permitido exatamente um registro `variant` ativo por `variant_id`

Recomendado para MVP:
- um registro `product` por `product_id`
- um registro `variant` por `variant_id`

Isso mantém a lógica de configuração eficaz e o Admin UX mais simples.

## 18. Impacto nas etapas posteriores

Este contrato significa que as etapas `2.2.3+` posteriores devem:
- projetar o modelo de dados em torno da entidade `PlanOffer`
- trate `ProductSubscriptionConfig` como um modelo de leitura ou contrato lógico
- adicionar links de módulo para produto e variante
- criar fluxos de trabalho em torno da validação de `allowed_frequencies`, `discount_per_frequency` e `rules`
- preparar auxiliares de consulta para lista, detalhes e configuração eficaz
