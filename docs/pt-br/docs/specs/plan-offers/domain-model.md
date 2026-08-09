# Reorganização: Especificação do modelo de domínio de planos e ofertas

Este documento abrange a etapa `2.2.2` de `documentation/implementation_plan.md`.

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
- representar o plano alternativo de `variant > product`

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

## 5. Campos do modelo regular

Os campos a seguir devem ser colunas normais do modelo:

- `id`
- `name`
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`

Por que:
- são necessários para filtragem e classificação no Admin
- são necessários para indexação
- são necessários para validação de integridade e conflitos
- isso se alinha aos padrões do Medusa, nos quais os IDs de entidades externas costumam ser armazenados explicitamente em modelos personalizados

## 6. Por que `product_id` e `variant_id` devem ser campos escalares

Seguindo os padrões práticos do Medusa:
- as relações com o produto e a variante serão implementadas por meio de links de módulo
- mesmo assim, `product_id` e `variant_id` devem existir como campos explícitos do modelo

Por que:
- simplifica consultas de lista/detalhes
- simplifica a filtragem baseada em alvos
- simplifica os índices da lista de administração
- torna regras de validação como `variant scope requires variant_id` mais diretas

## 7. `variant_id` e a semântica de escopo

Regras:
- quando `scope = product`, `variant_id = null`
- quando `scope = variant`, é necessário `variant_id`
- um registro no nível da variante sempre armazena `product_id` também

Por que:
- um `variant` pertence operacionalmente a um produto concreto
- A lista de administradores e futuras consultas de configuração efetiva precisam de ambos os IDs
- isso também simplifica a filtragem e futuras verificações de funcionamento com `Subscriptions`

## 8. `allowed_frequencies`

`allowed_frequencies` é a lista de domínios com as frequências de compra de assinaturas compatíveis.

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

### Decisão sobre armazenamento

`allowed_frequencies` deve ser armazenado como JSON.

Por que:
- trata-se de uma lista de valores estruturados
- as frequências fazem parte, logicamente, de uma configuração de oferta
- elas não exigem uma entidade separada no MVP

### Regras de domínio

- a lista não pode estar vazia
- cada item deve ter um valor positivo de `value`
- não são permitidos pares duplicados de `interval + value`

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

### Decisão sobre armazenamento

`discount_per_frequency` deve ser armazenado como JSON.

Por que:
- trata-se de uma pequena configuração aninhada vinculada à frequência
- ainda não requer uma tabela separada
- é prático validá-la em fluxos de trabalho

### Regras de domínio

- um desconto só pode existir para uma frequência presente em `allowed_frequencies`
- para um par de `interval + value`, é permitido, no máximo, um desconto
- a ausência de um desconto para uma frequência permitida é válida
- `discount_type = percentage` requer validação do intervalo percentual nos fluxos de trabalho
- `discount_type = fixed` utiliza o número armazenado diretamente, sem multiplicá-lo por 100, em consonância com o comportamento de precificação do Medusa

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

### Decisão sobre armazenamento

`rules` deve ser armazenado como JSON.

Por que:
- trata-se de um conjunto agrupado de campos de configuração de negócios
- a estrutura pode evoluir em etapas posteriores sem alterar as colunas do modelo principal
- esses não são os campos preferenciais para a filtragem da lista principal do MVP

### Regras de domínio

- se definido, `minimum_cycles` deve ser um número inteiro positivo
- se for `trial_enabled = false`, `trial_days` deve ser igual a `null`
- se for `trial_enabled = true`, `trial_days` deve ser um número inteiro positivo

## 11. `metadata`

`metadata` continua sendo um campo JSON padrão.

Por que:
- este é o padrão Medusa para dados adicionais não essenciais
- ele não deve armazenar dados que exijam validação rigorosa de domínio
- ele não deve armazenar campos necessários para filtragem, classificação ou lógica de configuração efetiva

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

- `source_offer_id` identifica qual registro `PlanOffer` gerou a configuração final
- `source_scope` indica se a configuração efetiva provém de um registro no nível do produto ou no nível da variante
- se não houver nenhuma configuração ativa, `source_offer_id` e `source_scope` podem ser `null`

## 13. Como o `ProductSubscriptionConfig` é resolvido

### Para um produto

Ao solicitar a configuração de um produto sem variantes:
- use o registro ativo `PlanOffer` com `scope = product`
- o resultado descreve a configuração do produto básico

### Para uma variante

Ao solicitar a configuração de uma variante:
1. procure um registro ativo de `PlanOffer` com `scope = variant`
2. se ele existir, essa é a fonte da configuração efetiva
3. se ele não existir, procure um registro ativo de `PlanOffer` com `scope = product`
4. se esse registro existir, a configuração alternativa virá do produto
5. se não houver nenhum registro ativo, a configuração estará vazia ou inativa

## 14. O `ProductSubscriptionConfig` deveria ser uma tabela separada?

Nesta fase: não.

Por que:
- é um conceito derivado
- seus dados podem ser calculados a partir de `PlanOffer`
- isso evita a duplicação e o risco de sincronização

Uma tabela separada só seria útil se:
- a configuração efetiva precisasse ser materializada por motivos de desempenho
- surgisse uma herança multicamadas mais complexa
- se tornassem necessários instantâneos auditáveis da configuração efetiva

## 15. Índices e impacto do modelo futuro

Este contrato sugere índices futuros, pelo menos para:
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`

Opcional posteriormente:
- índice composto para `(scope, product_id)`
- índice composto para `(scope, variant_id)`

`allowed_frequencies`, `discount_per_frequency`, `rules` e `metadata` não devem ser considerados candidatos a índice primário no MVP.

## 16. Links dos módulos

O próximo passo deve introduzir links:
- `planOffer <-> product`
- `planOffer <-> variant`

O contrato de domínio pressupõe intencionalmente:
- `product_id` explícito
- `variant_id` explícito
- ligações de módulos separadas

Isso segue o padrão prático do Medusa:
- os links preservam o isolamento dos módulos
- os IDs escalares simplificam as consultas e a filtragem

## 17. Regras de integridade de domínio

Regras mínimas de consistência:

- `scope = product` requer `product_id` e proíbe `variant_id`
- `scope = variant` requer `product_id` e `variant_id`
- `allowed_frequencies` não pode estar vazio
- `discount_per_frequency` não pode conter frequências fora de `allowed_frequencies`
- não são permitidas frequências duplicadas
- não são permitidos descontos duplicados para a mesma frequência

Além disso, as etapas posteriores do backend devem definir a política de exclusividade:
- se deve ser permitido exatamente um registro ativo de `product` por `product_id`
- se deve ser permitido exatamente um registro ativo de `variant` por `variant_id`

Recomendado para MVP:
- um registro `product` por `product_id`
- um registro `variant` por `variant_id`

Isso simplifica a lógica de configuração efetiva e a experiência do usuário (UX) do administrador.

## 18. Impacto nas etapas posteriores

Este contrato significa que as etapas posteriores `2.2.3+` devem:
- projetar o modelo de dados em torno da entidade `PlanOffer`
- tratar `ProductSubscriptionConfig` como um modelo de leitura ou contrato lógico
- adicionar ligações de módulos ao produto e à variante
- criar fluxos de trabalho para validar `allowed_frequencies`, `discount_per_frequency` e `rules`
- preparar auxiliares de consulta para lista, detalhes e configuração efetiva
