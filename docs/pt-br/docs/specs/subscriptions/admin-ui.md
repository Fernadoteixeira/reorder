# Reordenar: UI de administração de assinatura e especificações de API

Este documento completa a etapa `2.1.1` de `documentation/implementation_plan.md` e define a especificação de dados para a área `Subscriptions` no Admin de uma forma mais próxima dos padrões oficiais da Medusa.

Artefatos produzidos nesta etapa:
- Tipos de DTO de administrador: `reorder/src/admin/types/subscription.ts`
- este documento como especificação de colunas, ações, filtros e formas de solicitação para etapas posteriores

Nota:
- Medusa não requer um artefato `contract` separado
- na prática, a estrutura usa uma combinação de definições de `types`, `Zod validators`, `WorkflowInput` e UI route/DataTable
- este documento é uma especificação de design, não um artefato Medusa em nível de estrutura

## 1. Administrador DTO

Os tipos de UI foram movidos para:
- `SubscriptionAdminStatus`
- `SubscriptionFrequencyInterval`
- `SubscriptionAdminListItem`
- `SubscriptionAdminDetail`
- `SubscriptionAdminListResponse`
- `SubscriptionAdminDetailResponse`

Arquivo:
- `reorder/src/admin/types/subscription.ts`

## 2. Lista `Subscriptions`

A lista é baseada em `DataTable` e usa as seguintes colunas:

| Coluna | Visível por padrão | Classificável | Notas |
|---|---:|---:|---|
| `subscription` | sim | sim | `reference` + identificador estável |
| `status` | sim | sim | emblema de status |
| `customer` | não | sim | disponível no DTO e na classificação/pesquisa de back-end, mas atualmente não renderizado como uma coluna de lista visível |
| `product` | sim | sim | produto + variante + SKU opcional |
| `frequency` | sim | sim | por exemplo `Every 2 months` |
| `next_renewal_at` | sim | sim | próxima data de renovação |
| `trial` | sim | sim | bandeira + `trial_ends_at` |
| `discount` | sim | sim | instantâneo de desconto de assinatura |
| `skip_next_cycle` | sim | sim | booleano |
| `updated_at` | não | sim | campo de classificação do auxiliar técnico, não renderizado como uma coluna de lista visível |

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

Os status de administrador do MVP são:
- `active`
- `paused`
- `cancelled`
- `past_due`

Notas:
- `cancelled` permanece na ortografia britânica porque esse status já é usado nos documentos do plano e do produto
- `expired` não faz parte do contrato desta etapa porque não está no escopo atual do `Subscriptions` MVP

## 4. Ações de linha/ações de visualização de detalhes

Ações definidas:

| Ação | Status permitidos | Confirmar | Finalidade |
|---|---|---:|---|
| `pause` | `active`, `past_due` | sim | impedir futuras renovações |
| `resume` | `paused` | sim | retomar a assinatura |
| `cancel` | `active`, `paused`, `past_due` | sim | encerrar a assinatura |
| `schedule_plan_change` | `active`, `paused`, `past_due` | não | agendar uma alteração de variante/frequência |
| `update_shipping_address` | `active`, `paused`, `past_due` | não | atualizar o endereço de entrega |

`cancelled` não possui ações de mutação nesta visualização MVP.

## 5. Editar campos

### 5.1 Mudança de plano de cronograma

Campos:
- `plan_variant_id` - obrigatório
- `frequency_interval` - obrigatório, enumeração: `week | month | year`
- `frequency_value` - obrigatório, número positivo
- `pending_change_effective_at` - data e hora ISO opcional

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

Filtros de lista:
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

As cargas abaixo são uma especificação para etapas posteriores.
Sua implementação deve ser adicionada aos validadores Zod em `src/api/admin/subscriptions/**/validators.ts` ou arquivos de middleware seguindo os padrões Medusa.

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

## 8. Carga útil detalhada

Os detalhes da assinatura estendem o registro da lista com:
- `created_at`
- `started_at`
- `paused_at`
- `cancelled_at`
- `last_renewal_at`
- `shipping_address`
- `pending_update_data`

`pending_update_data` armazena uma prévia da mudança de plano agendada:
- `variant_id`
- `variant_title`
- `frequency_interval`
- `frequency_value`
- `effective_at`

Na interface de usuário de detalhes atual, o instantâneo `product` é renderizado como um cartão estilo Medusa vinculado à página de detalhes da variante padrão, com `sku` mostrado separadamente abaixo dele.

## 9. Impacto nas etapas posteriores

Este contrato significa que a próxima etapa `2.1.2` deve projetar pelo menos estes endpoints:
- `GET /admin/subscriptions`
- `GET /admin/subscriptions/:id`
- `POST /admin/subscriptions/:id/pause`
- `POST /admin/subscriptions/:id/resume`
- `POST /admin/subscriptions/:id/cancel`
- `POST /admin/subscriptions/:id/schedule-plan-change`
- `POST /admin/subscriptions/:id/update-shipping-address`
