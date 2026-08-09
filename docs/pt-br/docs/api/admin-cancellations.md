# API de cancelamentos administrativos

Este documento descreve o contrato da API de administração implementado para a área `Cancellation & Retention` do plug-in `Reorder`.

É a fonte de referência atual em tempo de execução para:
- parâmetros de solicitação
- corpos de solicitação
- formatos de resposta
- cenários comuns de erro

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminho base

Todas as rotas estão em:

`/admin/cancellations`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de se alterar os dados diretamente no manipulador da rota

## DTOs compartilhados

As respostas da API se baseiam nos DTOs de administração definidos em:

- `src/admin/types/cancellation.ts`

Principais tipos de resposta:
- `CancellationCaseAdminListResponse`
- `CancellationCaseAdminDetailResponse`
- `CancellationCaseAdminListItem`
- `CancellationCaseAdminDetail`
- `CancellationAdminOfferEventRecord`
- `CancellationAdminSubscriptionSummary`
- `CancellationAdminDunningSummary`
- `CancellationAdminRenewalSummary`

## Valores compartilhados do domínio

### Valores do status do caso

Status de casos de cancelamento suportados:
- `requested`
- `evaluating_retention`
- `retention_offered`
- `retained`
- `paused`
- `canceled`

### Valores dos resultados finais

Resultados finais suportados:
- `retained`
- `paused`
- `canceled`

### Valores do status da decisão sobre a oferta

Status de decisão de oferta de retenção suportados:
- `proposed`
- `accepted`
- `rejected`
- `applied`
- `expired`

### Valores da categoria “Motivo”

Categorias de motivos suportadas:
- `price`
- `product_fit`
- `delivery`
- `billing`
- `temporary_pause`
- `switched_competitor`
- `other`

## 1. Lista de casos de cancelamento

### Ponto final

- Método: `GET`
- Caminho: `/admin/cancellations`

### Objetivo

Retorna a fila de cancelamento paginada utilizada pela DataTable `Cancellation & Retention` do Admin.

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
- `final_outcome?: string | string[]`
- `reason_category?: string | string[]`
- `offer_type?: string | string[]`
- `subscription_id?: string`
- `created_from?: string`
- `created_to?: string`

### Campos de classificação compatíveis

Baseado em banco de dados:
- `created_at`
- `updated_at`
- `status`
- `final_outcome`
- `reason_category`
- `finalized_at`

Na memória:
- `subscription_reference`
- `customer_name`
- `product_title`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "cancellations": [
    {
      "id": "cc_123",
      "status": "evaluating_retention",
      "reason": "Customer says the price is too high",
      "reason_category": "price",
      "final_outcome": null,
      "subscription": {
        "subscription_id": "sub_123",
        "reference": "SUB-001",
        "status": "active",
        "customer_name": "Jane Doe",
        "product_title": "Coffee Subscription",
        "variant_title": "1 kg",
        "sku": "COFFEE-1KG",
        "next_renewal_at": "2026-04-15T10:00:00.000Z",
        "last_renewal_at": "2026-03-15T10:00:00.000Z",
        "paused_at": null,
        "cancelled_at": null,
        "cancel_effective_at": null
      },
      "created_at": "2026-04-01T10:00:00.000Z",
      "finalized_at": null,
      "updated_at": "2026-04-01T10:05:00.000Z"
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

## 2. Obter detalhes do caso de cancelamento

### Ponto final

- Método: `GET`
- Caminho: `/admin/cancellations/:id`

### Objetivo

Retorna a carga útil completa dos detalhes administrativos de um único caso de cancelamento.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "cancellation": {
    "id": "cc_123",
    "status": "retained",
    "reason": "Customer asked for a lower price",
    "reason_category": "price",
    "final_outcome": "retained",
    "subscription": {
      "subscription_id": "sub_123",
      "reference": "SUB-001",
      "status": "active",
      "customer_name": "Jane Doe",
      "product_title": "Coffee Subscription",
      "variant_title": "1 kg",
      "sku": "COFFEE-1KG",
      "next_renewal_at": "2026-04-15T10:00:00.000Z",
      "last_renewal_at": "2026-03-15T10:00:00.000Z",
      "paused_at": null,
      "cancelled_at": null,
      "cancel_effective_at": null
    },
    "created_at": "2026-04-01T10:00:00.000Z",
    "finalized_at": "2026-04-01T10:20:00.000Z",
    "updated_at": "2026-04-01T10:20:00.000Z",
    "notes": "Customer accepted a temporary retention discount",
    "finalized_by": "user_123",
    "cancellation_effective_at": null,
    "dunning": null,
    "renewal": {
      "renewal_cycle_id": "re_123",
      "status": "scheduled",
      "scheduled_for": "2026-04-15T10:00:00.000Z",
      "approval_status": null,
      "generated_order_id": null
    },
    "offers": [
      {
        "id": "roe_123",
        "offer_type": "discount_offer",
        "offer_payload": {
          "discount_offer": {
            "discount_type": "percentage",
            "discount_value": 10,
            "duration_cycles": 2,
            "note": null
          }
        },
        "decision_status": "applied",
        "decision_reason": "Customer accepted the offer",
        "decided_at": "2026-04-01T10:15:00.000Z",
        "decided_by": "user_123",
        "applied_at": "2026-04-01T10:15:00.000Z",
        "metadata": null,
        "created_at": "2026-04-01T10:15:00.000Z",
        "updated_at": "2026-04-01T10:15:00.000Z"
      }
    ],
    "metadata": {
      "manual_actions": []
    }
  }
}
```

### Erros comuns

- `404 not_found`
  O caso de cancelamento não existe.

## 3. Apresentar a oferta de retenção

### Ponto final

- Método: `POST`
- Caminho: `/admin/cancellations/:id/apply-offer`

### Objetivo

Aplica uma medida de retenção de concreto, cria um `RetentionOfferEvent`, atualiza a assinatura e encerra o caso como `retained` ou `paused`.

### Corpo da solicitação

Cargas úteis compatíveis:

#### Oferta de pausa

```json
{
  "offer_type": "pause_offer",
  "offer_payload": {
    "pause_offer": {
      "pause_cycles": 2,
      "resume_at": null,
      "note": "Customer wants a short break"
    }
  },
  "decided_by": "user_123",
  "decision_reason": "Pause accepted by customer"
}
```

#### Oferta com desconto

```json
{
  "offer_type": "discount_offer",
  "offer_payload": {
    "discount_offer": {
      "discount_type": "percentage",
      "discount_value": 10,
      "duration_cycles": 2,
      "note": "Temporary save offer"
    }
  },
  "decided_by": "user_123",
  "decision_reason": "Customer accepted a lower price"
}
```

#### Oferta de bônus

```json
{
  "offer_type": "bonus_offer",
  "offer_payload": {
    "bonus_offer": {
      "bonus_type": "free_cycle",
      "value": 1,
      "label": null,
      "duration_cycles": 1,
      "note": null
    }
  },
  "decided_by": "user_123",
  "decision_reason": "Customer accepted a free cycle"
}
```

### Notas de validação

A validação atual da API exige o seguinte:
- `pause_offer` requer `pause_cycles` ou `resume_at`
- os descontos percentuais não podem exceder `50`
- `discount_value` deve ser positivo;
- `duration_cycles` deve ser positivo quando fornecido;
- os valores de `bonus_offer` devem ser não negativos;
- `free_cycle` e `credit` exigem `value`

### Resposta de sucesso

Status:
- `200 OK`

Forma:
- igual a `GET /admin/cancellations/:id`

### Erros comuns

- `404 not_found`
  O caso não existe.
- `409 invalid_state`
  O caso é terminal ou não pode aceitar uma nova oferta.
- `409 offer_out_of_policy`
  A carga útil da oferta viola as regras da política de retenção.

## 4. Concluir o cancelamento

### Ponto final

- Método: `POST`
- Caminho: `/admin/cancellations/:id/finalize`

### Objetivo

Encerra o caso como `canceled`, atualiza o ciclo de vida da assinatura, calcula `cancel_effective_at` e desativa a elegibilidade para renovação.

### Corpo da solicitação

```json
{
  "reason": "Customer is switching to another provider",
  "reason_category": "switched_competitor",
  "notes": "No retention offer accepted",
  "finalized_by": "user_123",
  "effective_at": "immediately"
}
```

### Notas

- `reason` é obrigatório, de acordo com as regras do domínio, para o cancelamento definitivo.
- Se for omitido no corpo, o fluxo de trabalho poderá utilizar o motivo do caso existente.
- `effective_at` suporta:
  - `immediately`
  - `end_of_cycle`

### Resposta de sucesso

Status:
- `200 OK`

Forma:
- igual a `GET /admin/cancellations/:id`

### Erros comuns

- `404 not_found`
  O caso não existe.
- `409 invalid_state`
  O caso é terminal ou não é elegível para cancelamento final.
- `400 invalid_data`
  Falta o motivo após a análise do corpo do caso e dos dados existentes do caso.

## 5. Atualizar o motivo do cancelamento

### Ponto final

- Método: `POST`
- Caminho: `/admin/cancellations/:id/reason`

### Objetivo

Atualiza o motivo da cancelamento, a categoria normalizada do motivo e as observações do caso.

### Corpo da solicitação

```json
{
  "reason": "The subscription no longer fits the customer needs",
  "reason_category": "product_fit",
  "notes": "Customer wants to stop after current cycle",
  "updated_by": "user_123",
  "update_reason": "Operator clarified churn classification"
}
```

### Resposta de sucesso

Status:
- `200 OK`

Forma:
- igual a `GET /admin/cancellations/:id`

### Erros comuns

- `404 not_found`
  O caso não existe.
- `409 invalid_state`
  O caso é terminal ou não pode ser editado.

## 7. Cenários comuns de erros de domínio

Em todas as rotas de mutação, o ambiente de execução atual expõe erros relacionados ao domínio para:

- `duplicate_active_case`
  Existe mais de um caso ativo para a mesma assinatura.
- `invalid_state`
  A alteração solicitada não é válida para o estado atual do caso.
- `already_finalized`
  O caso já está encerrado.
- `offer_out_of_policy`
  A oferta de retenção solicitada viola a política.
- `not_found`
  O caso ou o registro de origem vinculado não existe.

As rotas mapeiam isso para respostas HTTP por meio de auxiliares de erro compartilhados em:
- `src/api/admin/cancellations/utils.ts`
