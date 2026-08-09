# API de assinaturas do administrador

Este documento descreve o contrato da API de administração implementado para a área `Subscriptions` do plug-in `Reorder`.

Este documento pretende ser a fonte oficial de referência atual para:
- parâmetros de solicitação
- corpos de solicitação
- formatos de resposta
- cenários comuns de erro

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminho base

Todas as rotas estão em:

`/admin/subscriptions`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod

## DTOs compartilhados

As respostas da API são baseadas nos DTOs de administração definidos em:

- `src/admin/types/subscription.ts`

Principais tipos de resposta:
- `SubscriptionAdminListResponse`
- `SubscriptionAdminDetailResponse`

## Valores de status

Estados de assinatura suportados:
- `active`
- `paused`
- `cancelled`
- `past_due`

## 1. Assinaturas da lista

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscriptions`

### Objetivo

Retorna a lista paginada utilizada pela DataTable de assinaturas do Admin.

### Parâmetros de consulta

Paginação e pesquisa:
- `limit?: number`
- `offset?: number`
- `q?: string`

Classificação:
- `order?: string`
- `direction?: "asc" | "desc"`

Filtros:
- `status?: string | string[]`
- `customer_id?: string`
- `product_id?: string`
- `variant_id?: string`
- `next_renewal_from?: string`
- `next_renewal_to?: string`
- `is_trial?: boolean`
- `skip_next_cycle?: boolean`

### Campos de classificação compatíveis

Baseado em banco de dados:
- `created_at`
- `updated_at`
- `status`
- `frequency_interval`
- `frequency_value`
- `next_renewal_at`
- `trial_ends_at`
- `skip_next_cycle`

Na memória:
- `customer_name`
- `customer_email`
- `product_title`
- `variant_title`
- `discount_value`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "subscriptions": [
    {
      "id": "sub_123",
      "reference": "SUB-001",
      "status": "active",
      "customer": {
        "id": "cus_123",
        "full_name": "Jane Doe",
        "email": "jane@example.com"
      },
      "product": {
        "product_id": "prod_123",
        "product_title": "Coffee Subscription",
        "variant_id": "variant_123",
        "variant_title": "1 kg",
        "sku": "COFFEE-1KG"
      },
      "frequency": {
        "interval": "month",
        "value": 1,
        "label": "Every month"
      },
      "next_renewal_at": "2026-04-15T10:00:00.000Z",
      "effective_next_renewal_at": "2026-04-15T10:00:00.000Z",
      "trial": {
        "is_trial": false,
        "trial_ends_at": null
      },
      "discount": {
        "type": "percentage",
        "value": 10,
        "label": "10% off"
      },
      "skip_next_cycle": false,
      "updated_at": "2026-03-28T12:00:00.000Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}
```

### Erros comuns

- `400 invalid_data`
  Formato inválido do parâmetro de consulta ou valor de consulta não suportado.
- `400 invalid_data`
  Campo de classificação não suportado.

## 2. Obter detalhes da assinatura

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscriptions/:id`

### Objetivo

Retorna a carga útil completa dos detalhes administrativos de uma única assinatura.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "subscription": {
    "id": "sub_123",
    "reference": "SUB-001",
    "status": "active",
    "customer": {
      "id": "cus_123",
      "full_name": "Jane Doe",
      "email": "jane@example.com"
    },
    "product": {
      "product_id": "prod_123",
      "product_title": "Coffee Subscription",
      "variant_id": "variant_123",
      "variant_title": "1 kg",
      "sku": "COFFEE-1KG"
    },
    "frequency": {
      "interval": "month",
      "value": 1,
      "label": "Every month"
    },
    "next_renewal_at": "2026-04-15T10:00:00.000Z",
    "effective_next_renewal_at": "2026-04-15T10:00:00.000Z",
    "trial": {
      "is_trial": false,
      "trial_ends_at": null
    },
    "discount": {
      "type": "percentage",
      "value": 10,
      "label": "10% off"
    },
    "skip_next_cycle": false,
    "updated_at": "2026-03-28T12:00:00.000Z",
    "created_at": "2026-03-01T10:00:00.000Z",
    "started_at": "2026-03-01T10:00:00.000Z",
    "paused_at": null,
    "cancelled_at": null,
    "last_renewal_at": "2026-03-15T10:00:00.000Z",
    "shipping_address": {
      "first_name": "Jane",
      "last_name": "Doe",
      "company": null,
      "address_1": "Main Street 1",
      "address_2": null,
      "city": "Warsaw",
      "postal_code": "00-001",
      "province": "Mazowieckie",
      "country_code": "PL",
      "phone": "+48123123123"
    },
    "pending_update_data": {
      "variant_id": "variant_456",
      "variant_title": "2 kg",
      "frequency_interval": "month",
      "frequency_value": 2,
      "effective_at": "2026-05-01T00:00:00.000Z"
    }
  }
}
```

Notas:
- `next_renewal_at` continua sendo a referência técnica de cobrança utilizada nas renovações
- `effective_next_renewal_at` é a data prevista para a próxima renovação exibida na seção Admin quando `skip_next_cycle` está habilitado
- os campos de exibição de cliente e produto são preenchidos em tempo real a partir dos registros vinculados do Medusa, quando disponíveis, recorrendo a instantâneos de assinatura armazenados quando os registros vinculados estiverem ausentes

### Erros comuns

- `404 not_found`
  A assinatura não existe.

## 2.1 Resumo da assinatura com detalhes do pedido

### Ponto final

- Método: `GET`
- Caminho: `/admin/orders/:id/subscription-summary`

### Objetivo

Retorna o contexto de assinatura simplificado utilizado pelo widget personalizado `Subscription` na página de detalhes do pedido do Medusa.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Status:
- `200 OK`

Formato quando o pedido está vinculado a uma assinatura:

```json
{
  "summary": {
    "is_subscription_order": true,
    "subscription": {
      "id": "sub_123",
      "reference": "SUB-001",
      "status": "active",
      "frequency_label": "Every 2 weeks",
      "discount": {
        "type": "percentage",
        "value": 5,
        "label": "5% off"
      },
      "next_renewal_at": "2026-05-07T10:00:00.000Z",
      "effective_next_renewal_at": "2026-05-07T10:00:00.000Z"
    }
  }
}
```

Formato quando o pedido não está vinculado a uma assinatura:

```json
{
  "summary": {
    "is_subscription_order": false,
    "subscription": null
  }
}
```

Notas:
- `discount` é derivado da assinatura `pricing_snapshot`
- essa rota é somente para leitura e intencionalmente mais sucinta do que a resposta completa com os detalhes da assinatura

## 3. Suspender a assinatura

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/pause`

### Objetivo

Suspende uma assinatura ativa.

### Corpo da solicitação

Todos os campos são opcionais.

```json
{
  "reason": "customer requested temporary stop",
  "effective_at": "2026-04-01T00:00:00.000Z"
}
```

Validação:
- `reason?: string`
- `effective_at?: ISO datetime string`

### Resposta de sucesso

Status:
- `200 OK`

Resposta:
- completo `SubscriptionAdminDetailResponse`

### Erros comuns

- `400 invalid_data`
  Carga do corpo inválida.
- `404 not_found`
  A assinatura não existe.
- `409 conflict`
  Não é possível pausar a assinatura a partir do seu estado atual.

## 4. Retomar a assinatura

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/resume`

### Objetivo

Retoma uma assinatura pausada.

### Corpo da solicitação

Todos os campos são opcionais.

```json
{
  "resume_at": "2026-04-15T00:00:00.000Z",
  "preserve_billing_anchor": true
}
```

Validação:
- `resume_at?: ISO datetime string`
- `preserve_billing_anchor?: boolean`

### Resposta de sucesso

Status:
- `200 OK`

Resposta:
- completo `SubscriptionAdminDetailResponse`

### Erros comuns

- `400 invalid_data`
  Carga do corpo inválida.
- `404 not_found`
  A assinatura não existe.
- `409 conflict`
  Não é possível retomar a assinatura a partir do estado atual.

## 5. Cancelar a assinatura

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/cancel`

### Objetivo

Cancela uma assinatura.

### Corpo da solicitação

Todos os campos são opcionais.

```json
{
  "reason": "retention flow failed",
  "effective_at": "end_of_cycle"
}
```

Validação:
- `reason?: string`
- `effective_at?: "immediately" | "end_of_cycle"`

### Resposta de sucesso

Status:
- `200 OK`

Resposta:
- completo `SubscriptionAdminDetailResponse`

### Erros comuns

- `400 invalid_data`
  Carga do corpo inválida.
- `404 not_found`
  A assinatura não existe.
- `409 conflict`
  A assinatura não pode ser cancelada no estado atual.

## 6. Alteração do plano de programação

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/schedule-plan-change`

### Objetivo

Armazena um plano futuro ou uma atualização de cadência em `pending_update_data`.

### Corpo da solicitação

```json
{
  "variant_id": "variant_456",
  "frequency_interval": "month",
  "frequency_value": 2,
  "effective_at": "2026-05-01T00:00:00.000Z"
}
```

Validação:
- `variant_id: string`
- `frequency_interval: "week" | "month" | "year"`
- `frequency_value: positive integer`
- `effective_at?: ISO datetime string`

### Resposta de sucesso

Status:
- `200 OK`

Resposta:
- completo `SubscriptionAdminDetailResponse`

Comportamento importante:
- `pending_update_data` é retornado como parte da carga útil dos detalhes da assinatura atualizada
- `requested_by` é capturado internamente a partir do ator administrativo autenticado, mas não é exposto na resposta do DTO de administração

### Erros comuns

- `400 invalid_data`
  Carga útil do corpo inválida.
- `404 not_found`
  A assinatura não existe.
- `409 conflict`
  A alteração do plano não é permitida para o estado atual da assinatura.

## 7. Atualizar endereço de entrega

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/update-shipping-address`

### Objetivo

Atualiza o registro do endereço de entrega da assinatura utilizado pelo Admin e pelos futuros fluxos operacionais.

### Corpo da solicitação

```json
{
  "first_name": "Anna",
  "last_name": "Nowak",
  "company": "ACME",
  "address_1": "Nowa 2",
  "address_2": "lok. 4",
  "city": "Krakow",
  "postal_code": "30-001",
  "province": "Malopolskie",
  "country_code": "PL",
  "phone": "+48111111111"
}
```

Validação:
- `first_name: string`
- `last_name: string`
- `company?: string | null`
- `address_1: string`
- `address_2?: string | null`
- `city: string`
- `postal_code: string`
- `province?: string | null`
- `country_code: 2-letter string`
- `phone?: string | null`

### Resposta de sucesso

Status:
- `200 OK`

Resposta:
- completo `SubscriptionAdminDetailResponse`

### Erros comuns

- `400 invalid_data`
  Carga do corpo inválida.
- `404 not_found`
  A assinatura não existe.

## Observações para os consumidores

- As chamadas de mutação sempre retornam a carga útil com os detalhes atualizados da assinatura, em vez de apenas um indicador mínimo de sucesso.
- A interface de usuário de administração utiliza essas respostas diretamente para atualizar a visualização detalhada após as mutações.
- O endpoint de lista é a fonte de referência para a paginação, filtragem, ordenação e pesquisa na DataTable.
