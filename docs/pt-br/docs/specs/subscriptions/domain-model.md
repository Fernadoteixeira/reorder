# Reorganização: Especificação do modelo de domínio de assinaturas

Este documento conclui a etapa `2.1.3` de `documentation/implementation_plan.md`.

Objetivo:
- projetar o modelo de domínio final `Subscription`
- determinar quais dados pertencem diretamente ao módulo
- determinar quais dados devem ser armazenados como instantâneos
- determinar quais dados devem ser conectados por meio de links entre módulos

O projeto é baseado nos padrões da Medusa:
- um módulo personalizado é responsável pelo domínio
- as relações entre módulos são gerenciadas por meio de `defineLink`
- os snapshots são utilizados apenas quando o Admin e o histórico exigem um modelo de leitura estável

## 1. Premissas arquitetônicas

- `Subscription` é uma entidade de domínio independente no módulo personalizado `subscription`.
- Os dados de outros módulos do Medusa não são modelados como relações DML diretas.
- As conexões com entidades de comércio são implementadas por meio de links de módulo.
- Os instantâneos são armazenados de forma que o estado atual de uma entidade externa não afete a visão histórica ou operacional da assinatura.
- Os campos necessários para filtragem e classificação no Admin devem ser armazenados explicitamente como campos do modelo, e não apenas dentro de `metadata` ou blobs JSON.

## 2. Status

Nesta fase, o domínio `Subscription` oferece suporte a:

- `active`
- `paused`
- `cancelled`
- `past_due`

Ainda não adicionamos:
- `expired`
- `failed`

Por que:
- eles estão fora do escopo atual de `Subscriptions`
- `failed` se encaixa melhor na camada de renovações/cobranças
- `expired` pode ser adicionado posteriormente, caso o ciclo de vida exija isso

## 3. Campos diretos do modelo

Os campos a seguir pertencem diretamente ao modelo `subscription` e devem ser armazenados como colunas normais:

- `id`
- `reference`
- `status`
- `customer_id`
- `product_id`
- `variant_id`
- `frequency_interval`
- `frequency_value`
- `started_at`
- `next_renewal_at`
- `last_renewal_at`
- `paused_at`
- `cancelled_at`
- `cancel_effective_at`
- `skip_next_cycle`
- `is_trial`
- `trial_ends_at`

## 4. Por que esses campos diretos existem

### `reference`

Um identificador estável para exibição no painel de administração e para o gerenciamento operacional.

### `status`

Necessário para:
- filtragem de listas
- validação de transição de status
- controle das ações de administração disponíveis

### `customer_id`, `product_id`, `variant_id`

Esses IDs são armazenados explicitamente, embora também estejam previstos links entre módulos.

Por que:
- simplifica a filtragem
- simplifica a indexação
- simplifica as consultas de lista/detalhes
- está alinhado com a prática comum do Medusa para modelos que, operacionalmente, “pertencem” a entidades externas

### `frequency_interval`, `frequency_value`

Esses campos definem o núcleo de cadência/frequência e são necessários para:
- a lista de administradores
- a classificação
- a mutação `schedule-plan-change`
- renovações futuras

### `started_at`, `next_renewal_at`, `last_renewal_at`

Estes são os principais campos relacionados ao ciclo de vida e ao agendamento.

### `paused_at`, `cancelled_at`, `cancel_effective_at`

Necessário para:
- auditabilidade
- tratamento de `pause`
- tratamento de `cancel`
- distinção entre cancelamento imediato e cancelamento no final do ciclo

### `skip_next_cycle`, `is_trial`, `trial_ends_at`

Necessário para:
- a lista de administradores
- filtragem
- lógica de renovação futura

## 5. Dados armazenados como instantâneos JSON

Os dados a seguir devem ser armazenados como campos JSON no modelo `subscription`:

- `customer_snapshot`
- `product_snapshot`
- `pricing_snapshot`
- `shipping_address`
- `pending_update_data`
- `metadata`

## 6. Perfil do cliente

Forma proposta:

```ts
{
  email: string
  full_name: string | null
}
```

Por que:
- a lista/detalhes do administrador devem permanecer legíveis mesmo que os dados do cliente sejam alterados posteriormente
- o histórico de assinaturas não deve depender totalmente do estado atual do registro do cliente

## 7. Visão geral do produto

Forma proposta:

```ts
{
  product_id: string
  product_title: string
  variant_id: string
  variant_title: string
  sku: string | null
}
```

Por que:
- A lista/detalhes de administração devem apresentar uma visualização estável da assinatura
- A alteração do título de um produto ou variante não deve prejudicar a legibilidade do histórico
- O instantâneo simplifica a renderização da lista e dos detalhes

## 8. Resumo dos preços

Forma proposta:

```ts
{
  discount_type: "percentage" | "fixed"
  discount_value: number
  label: string | null
}
```

Por que:
- as condições das ofertas podem mudar com o tempo
- uma assinatura deve manter sua própria visão dos dados relativos a descontos/ofertas

## 9. Endereço de entrega

`shipping_address` deve ser armazenado como um snapshot JSON.

Forma proposta:

```ts
{
  first_name: string
  last_name: string
  company: string | null
  address_1: string
  address_2: string | null
  city: string
  postal_code: string
  province: string | null
  country_code: string
  phone: string | null
}
```

Por que:
- a assinatura precisa de um endereço de entrega operacional próprio
- ela não deve depender dos endereços globais do cliente
- as renovações futuras devem usar o endereço atribuído à assinatura

## 10. Dados de atualização pendentes

`pending_update_data` deve ser armazenado como JSON.

Forma proposta:

```ts
{
  variant_id: string
  variant_title: string
  sku: string | null
  frequency_interval: "week" | "month" | "year"
  frequency_value: number
  effective_at: string | null
  requested_at: string
  requested_by: string | null
}
```

Por que:
- trata-se de um estado transitório para uma única assinatura
- não requer uma entidade separada nesta fase
- é fácil sobrescrever, limpar e exibir no Admin

## 11. Links dos módulos

As relações entre módulos devem ser implementadas por meio de arquivos específicos em `src/links/`.

### Links obrigatórios

- `subscription <-> customer`
- `subscription <-> product`
- `subscription <-> variant`

### Links opcionais, mas recomendados, para o desenvolvimento futuro

- `subscription <-> order`
- `subscription <-> cart`

## 12. Por que existem tanto campos de ID quanto links

O modelo armazena:
- `customer_id`
- `product_id`
- `variant_id`

e também define ligações entre módulos em paralelo.

Por que:
- Os campos de ID simplificam a filtragem e os índices
- Os links permanecem alinhados com a arquitetura do Medusa e permitem consultas entre módulos
- Trata-se de um equilíbrio prático entre a pureza arquitetônica e o custo das consultas

## 13. Implicações da consulta

### `query.graph()` é suficiente para:

- detalhes por `id`
- lista de consultas filtradas por campos diretos do modelo:
  - `status`
  - `next_renewal_at`
  - `is_trial`
  - `skip_next_cycle`
  - `frequency_interval`
  - `frequency_value`

### O `query.index()` pode ser necessário para:

- filtragem por `customer` vinculado
- filtragem por `product` vinculado
- filtragem por `variant` vinculado

Ao mesmo tempo, armazenar `customer_id`, `product_id` e `variant_id` como campos simples reduz a necessidade de `query.index()` em parte dos casos de uso da lista de administração.

## 14. Modelo-alvo

### Campos simples

```ts
id
reference
status
customer_id
product_id
variant_id
frequency_interval
frequency_value
started_at
next_renewal_at
last_renewal_at
paused_at
cancelled_at
cancel_effective_at
skip_next_cycle
is_trial
trial_ends_at
```

### Campos JSON

```ts
customer_snapshot
product_snapshot
pricing_snapshot
shipping_address
pending_update_data
metadata
```

### Links do módulo

```ts
subscription-customer
subscription-product
subscription-variant
subscription-order
subscription-cart
```

## 15. Impacto nas etapas posteriores

Esse modelo abre caminho para:

1. `2.1.4`
   - implementação do módulo `subscription`
2. `2.1.5`
   - ligações do módulo
3. `2.1.6`
   - migrações e índices
4. `2.1.7`
   - fluxos de trabalho de mutação
