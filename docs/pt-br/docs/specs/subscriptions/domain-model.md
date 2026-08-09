# Reordenar: especificação do modelo de domínio de assinatura

Este documento conclui a etapa `2.1.3` de `documentation/implementation_plan.md`.

Objetivo:
- projetar o modelo de domínio `Subscription` final
- determinar quais dados pertencem diretamente ao módulo
- determinar quais dados devem ser armazenados como instantâneos
- determinar quais dados devem ser conectados através de links de módulos

O design é baseado nos padrões da Medusa:
- um módulo personalizado possui o domínio
- relações entre módulos são tratadas por meio de `defineLink`
- os instantâneos são usados apenas quando o administrador e o histórico exigem um modelo de leitura estável

## 1. Suposições arquitetônicas

- `Subscription` é sua própria entidade de domínio no módulo `subscription` personalizado.
- Os dados de outros módulos Medusa não são modelados como relações DML diretas.
- As conexões com entidades comerciais são implementadas com links de módulos.
- Os instantâneos são armazenados onde o estado atual de uma entidade externa não deve afetar a visão histórica ou operacional da assinatura.
- Os campos necessários para filtragem e classificação administrativa devem ser armazenados explicitamente como campos de modelo, não apenas dentro de `metadata` ou blobs JSON.

## 2. Status

Nesta fase, o domínio `Subscription` suporta:

- `active`
- `paused`
- `cancelled`
- `past_due`

Ainda não adicionamos:
- `expired`
- `failed`

Por quê:
- eles estão fora do escopo `Subscriptions` atual
- `failed` se ajusta melhor na camada de renovações/cobrança
- `expired` pode ser adicionado posteriormente se o ciclo de vida exigir

## 3. Campos diretos do modelo

Os seguintes campos pertencem diretamente ao modelo `subscription` e devem ser armazenados como colunas regulares:

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
-`trial_ends_at`

## 4. Por que esses campos diretos existem

### `reference`

Um identificador estável para exibição do administrador e manuseio operacional.

### `status`

Necessário para:
- filtragem de lista
- validação de transição de status
- controlar as ações administrativas disponíveis

### `customer_id`, `product_id`, `variant_id`

Esses IDs são armazenados explicitamente, embora links de módulos também sejam planejados.

Por quê:
- simplifica a filtragem
- simplifica a indexação
- simplifica consultas de lista/detalhe
- alinha-se com a prática comum da Medusa para modelos que operacionalmente “pertencem a” entidades externas

### `frequency_interval`, `frequency_value`

Esses campos definem o núcleo de cadência/frequência e são necessários para:
- a lista de administradores
- classificação
- a mutação `schedule-plan-change`
- futuras renovações

### `started_at`, `next_renewal_at`, `last_renewal_at`

Esses são os campos principais do ciclo de vida e do agendamento.

### `paused_at`, `cancelled_at`, `cancel_effective_at`

Necessário para:
- auditabilidade
- manipulação de `pause`
- manipulação de `cancel`
- distinguir o cancelamento imediato do cancelamento no final do ciclo

### `skip_next_cycle`, `is_trial`, `trial_ends_at`

Necessário para:
- a lista de administradores
- filtragem
- lógica de renovação futura

## 5. Dados armazenados como instantâneos JSON

Os seguintes dados devem ser armazenados como campos JSON no modelo `subscription`:

- `customer_snapshot`
- `product_snapshot`
- `pricing_snapshot`
- `shipping_address`
- `pending_update_data`
- `metadata`

## 6. Instantâneo do cliente

Forma proposta:

```ts
{
  email: string
  full_name: string | null
}
```

Por quê:
- a lista/detalhe do administrador deve permanecer legível mesmo se os dados do cliente forem alterados posteriormente
- o histórico de assinaturas não deve depender totalmente do estado atual do registro do cliente

## 7. Instantâneo do produto

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

Por quê:
- A lista/detalhe do administrador deve mostrar uma visão estável da assinatura
- alterar o título de um produto ou variante não deve prejudicar a legibilidade histórica
- o instantâneo simplifica a renderização de lista e detalhes

## 8. Instantâneo de preços

Forma proposta:

```ts
{
  discount_type: "percentage" | "fixed"
  discount_value: number
  label: string | null
}
```

Por quê:
- os termos da oferta podem mudar com o tempo
- uma assinatura deve preservar sua própria visão dos dados de descontos/ofertas

## 9. Endereço de entrega

`shipping_address` deve ser armazenado como um instantâneo JSON.

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

Por quê:
- a assinatura precisa de seu próprio endereço de entrega operacional
- não deve depender dos endereços globais do cliente
- futuras renovações deverão utilizar o endereço atribuído à assinatura

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

Por quê:
- este é um estado de transição para uma única assinatura
- não requer uma entidade separada nesta fase
- é fácil sobrescrever, limpar e renderizar no Admin

## 11. Links do módulo

As relações entre módulos devem ser implementadas através de arquivos dedicados em `src/links/`.

### Links obrigatórios

- `subscription <-> customer`
- `subscription <-> product`
- `subscription <-> variant`

### Links opcionais, mas recomendados para crescimento posterior

- `subscription <-> order`
- `subscription <-> cart`

## 12. Por que existem campos de ID e links

O modelo armazena:
- `customer_id`
- `product_id`
- `variant_id`

e também define links de módulos em paralelo.

Por quê:
- Os campos de ID simplificam a filtragem e os índices
- os links permanecem alinhados com a arquitetura Medusa e permitem consultas entre módulos
- este é um compromisso prático entre pureza arquitetônica e custo de consulta

## 13. Implicações da consulta

### `query.graph()` é suficiente para:

- detalhe por `id`
- listar consultas filtradas por campos diretos do modelo:
  - `status`
  - `next_renewal_at`
  - `is_trial`
  - `skip_next_cycle`
  - `frequency_interval`
  - `frequency_value`

### `query.index()` pode ser necessário para:

- filtragem por link `customer`
- filtragem por link `product`
- filtragem por link `variant`

Ao mesmo tempo, armazenar `customer_id`, `product_id` e `variant_id` como campos simples reduz a necessidade de `query.index()` em parte dos casos de uso da lista Admin.

## 14. Modelo alvo

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

Este modelo prepara o terreno para:

1.`2.1.4`
   - implementação do módulo `subscription`
2.`2.1.5`
   - links de módulos
3.`2.1.6`
   - migrações e índices
4.`2.1.7`
   - fluxos de trabalho de mutação
