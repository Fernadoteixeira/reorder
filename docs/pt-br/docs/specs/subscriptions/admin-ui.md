# Reorganização: Interface do usuário de administração de assinaturas e especificações da API

Este documento completa a etapa `2.1.1` de `documentation/implementation_plan.md` e define a especificação de dados para a área `Subscriptions` no Admin de uma forma mais próxima dos padrões oficiais do Medusa.

Artefatos produzidos nesta etapa:
- Tipos de DTO de administração: `reorder/src/admin/types/subscription.ts`
- este documento como especificação para colunas, ações, filtros e formatos de solicitação para as etapas posteriores

Observação:
- O Medusa não requer um artefato `contract` separado
- na prática, a estrutura utiliza uma combinação de `types`, `Zod validators`, `WorkflowInput` e definições de rotas de interface do usuário/tabelas de dados
- este documento é uma especificação de projeto, não um artefato do Medusa no nível da estrutura

## 1. DTO de administração

Os tipos de interface do usuário foram movidos para:
- `SubscriptionAdminStatus`
- `SubscriptionFrequencyInterval`
- `SubscriptionAdminListItem`
- `SubscriptionAdminDetail`
- `SubscriptionAdminListResponse`
- `SubscriptionAdminDetailResponse`

Arquivo:
- `reorder/src/admin/types/subscription.ts`

## 2. Lista `Subscriptions`

A lista é baseada em `DataTable` e utiliza as seguintes colunas:

| Coluna | Visível por padrão | Podem ser ordenadas | Observações |
|---|---:|---:|---|
| `subscription` | sim | sim | `reference` + identificador estável |
| `status` | sim | sim | ícone de status |
| `customer` | não | sim | disponível no DTO e na classificação/busca do backend, mas atualmente não exibido como uma coluna visível na lista |
| `product` | sim | sim | produto + variante + SKU opcional |
| `frequency` | sim | sim | por exemplo, `Every 2 months` |
| `next_renewal_at` | sim | sim | próxima data de renovação |
| `trial` | sim | sim | sinalizador + `trial_ends_at` |
| `discount` | sim | sim | instantâneo do desconto da assinatura |
| `skip_next_cycle` | sim | sim | booleano |
| `updated_at` | não | sim | campo de classificação auxiliar técnico, não exibido como uma coluna visível da lista |

Registro mínimo da lista:
- `id`
- `reference`
- `status`
- `customer`
- `product`
- `frequency`
- `next_renewal_at`
- `trial`
- `discount`
- `skip_next_cycle`
- `updated_at`

## 3. Status

Os status do MVP Admin são:
- `active`
- `paused`
- `cancelled`
- `past_due`

Notas:
- `cancelled` mantém a grafia britânica, pois essa designação já é utilizada nos documentos do plano e do produto
- `expired` não faz parte do contrato desta etapa, pois não está incluído no escopo atual do MVP de `Subscriptions`

## 4. Ações nas linhas / ações na visualização detalhada

Ações definidas:

| Ação | Status permitidos | Confirmar | Finalidade |
|---|---|---:|---|
| `pause` | `active`, `past_due` | sim | interromper renovações futuras |
| `resume` | `paused` | sim | retomar a assinatura |
| `cancel` | `active`, `paused`, `past_due` | sim | cancelar a assinatura |
| `schedule_plan_change` | `active`, `paused`, `past_due` | não | agendar uma alteração de variante/frequência |
| `update_shipping_address` | `active`, `paused`, `past_due` | não | atualizar o endereço de entrega |

`cancelled` não possui ações de mutação nesta visualização do MVP.

## 5. Editar campos

### 5.1 Alteração do plano de programação

Campos:
- `plan_variant_id` - obrigatório
- `frequency_interval` - obrigatório, enumeração: `week | month | year`
- `frequency_value` - obrigatório, número positivo
- `pending_change_effective_at` - opcional, data e hora no formato ISO

### 5.2 Atualizar endereço de entrega

Campos:
- `first_name` - obrigatório
- `last_name` - obrigatório
- `company` - opcional
- `address_1` - obrigatório
- `address_2` - opcional
- `city` - obrigatório
- `postal_code` - obrigatório
- `province` - opcional
- `country_code` - obrigatório
- `phone` - opcional

## 6. Filtros e classificação

Filtros da lista:
- `q`
- `status[]`
- `customer_id`
- `product_id`
- `variant_id`
- `next_renewal_from`
- `next_renewal_to`
- `is_trial`
- `skip_next_cycle`

Classificação:
- `created_at`
- `updated_at`
- `status`
- `customer_name`
- `customer_email`
- `product_title`
- `variant_title`
- `frequency_interval`
- `frequency_value`
- `next_renewal_at`
- `trial_ends_at`
- `discount_value`
- `skip_next_cycle`

Contrato de consulta de lista:
- `limit`
- `offset`
- `order`
- `direction`
- todos os filtros listados acima

## 7. Cargas úteis de mutação

As cargas úteis abaixo constituem uma especificação para etapas posteriores.
Sua implementação deve ser adicionada aos validadores do Zod nos arquivos `src/api/admin/subscriptions/**/validators.ts` ou de middleware, seguindo os padrões do Medusa.

### `pause`
```json
{
  "reason": "customer requested temporary stop",
  "effective_at": "2026-04-01T00:00:00.000Z"
}
```

### `resume`
```json
{
  "resume_at": "2026-04-15T00:00:00.000Z",
  "preserve_billing_anchor": true
}
```

### `cancel`
```json
{
  "reason": "retention flow failed",
  "effective_at": "end_of_cycle"
}
```

### `schedule_plan_change`
```json
{
  "variant_id": "variant_123",
  "frequency_interval": "month",
  "frequency_value": 2,
  "effective_at": "2026-05-01T00:00:00.000Z"
}
```

### `update_shipping_address`
```json
{
  "first_name": "Jan",
  "last_name": "Kowalski",
  "company": "ACME",
  "address_1": "Nowa 1",
  "address_2": null,
  "city": "Warszawa",
  "postal_code": "00-001",
  "province": "Mazowieckie",
  "country_code": "PL",
  "phone": "+48123123123"
}
```

## 8. Detalhes da carga útil

Os detalhes da assinatura ampliam o registro da lista com:
- `created_at`
- `started_at`
- `paused_at`
- `cancelled_at`
- `last_renewal_at`
- `shipping_address`
- `pending_update_data`

`pending_update_data` armazena uma prévia da alteração programada no plano:
- `variant_id`
- `variant_title`
- `frequency_interval`
- `frequency_value`
- `effective_at`

Na interface de usuário atual de detalhes, o instantâneo `product` é exibido como um cartão no estilo Medusa com link para a página de detalhes da variante padrão, com o `sku` exibido separadamente abaixo dele.

## 9. Impacto nas etapas posteriores

Este contrato implica que, na próxima etapa, a `2.1.2` deve projetar, no mínimo, os seguintes pontos finais:
- `GET /admin/subscriptions`
- `GET /admin/subscriptions/:id`
- `POST /admin/subscriptions/:id/pause`
- `POST /admin/subscriptions/:id/resume`
- `POST /admin/subscriptions/:id/cancel`
- `POST /admin/subscriptions/:id/schedule-plan-change`
- `POST /admin/subscriptions/:id/update-shipping-address`
