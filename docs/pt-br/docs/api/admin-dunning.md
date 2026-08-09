# API de cobrança de administrador

Este documento descreve o contrato Admin API implementado para a área `Dunning` do plugin `Reorder`.

É a fonte atual de verdade em tempo de execução para:
- parâmetros de solicitação
- solicitar órgãos
- formas de resposta
- cenários de erro comuns

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminho Básico

Todas as rotas estão em:

`/admin/dunning`

## Autenticação

Todas as rotas são rotas somente para administradores.

Em termos de implementação:
- as rotas usam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio de middleware Medusa e esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de alterar os dados diretamente no manipulador de rotas

## DTOs compartilhados

As respostas da API são baseadas nos Admin DTOs definidos em:

- `src/admin/types/dunning.ts`

Principais tipos de resposta:
- `DunningCaseAdminListResponse`
- `DunningCaseAdminDetailResponse`
- `DunningCaseAdminListItem`
- `DunningCaseAdminDetail`
- `DunningAttemptAdminRecord`
- `DunningRetryScheduleSummary`

## Valores de domínio compartilhado

### Valores de status do caso

Status de casos de cobrança suportados:
- `open`
- `retry_scheduled`
- `retrying`
- `awaiting_manual_resolution`
- `recovered`
- `unrecovered`

Significado do tempo de execução atual:
- `retry_scheduled`: a última tentativa falhou com um erro de pagamento repetível e um futuro `next_retry_at` está agendado
- `unrecovered`: o caso é terminal e encerrado, seja porque a falha no pagamento é tratada como permanente ou porque as tentativas se esgotaram

### Valores de status de tentativa

Status de tentativa de cobrança suportados:
- `processing`
- `succeeded`
- `failed`

## 1. Listar casos de cobrança

### Ponto final

- Método: `GET`
- Caminho: `/admin/dunning`

### Propósito

Retorna a fila de cobrança paginada usada pelo DataTable de cobrança do administrador.

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
- `subscription_id?: string`
- `renewal_cycle_id?: string`
- `renewal_order_id?: string`
- `payment_provider_id?: string`
- `last_payment_error_code?: string`
- `attempt_count_min?: number`
- `attempt_count_max?: number`
- `next_retry_from?: string`
- `next_retry_to?: string`
- `last_attempt_status?: string | string[]`

### Campos de classificação suportados

Baseado em banco de dados:
- `updated_at`
- `status`
- `next_retry_at`
- `attempt_count`
- `max_attempts`
- `last_attempt_at`

Na memória:
- `last_attempt_status`
- `subscription_reference`
- `customer_name`
- `product_title`
- `order_display_id`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "dunning_cases": [
    {
      "id": "dc_123",
      "status": "retry_scheduled",
      "subscription": {
        "subscription_id": "sub_123",
        "reference": "SUB-001",
        "status": "past_due",
        "customer_name": "Jane Doe",
        "product_title": "Coffee Subscription",
        "variant_title": "1 kg",
        "sku": "COFFEE-1KG",
        "payment_provider_id": "pp_stripe_stripe"
      },
      "renewal": {
        "renewal_cycle_id": "re_123",
        "status": "failed",
        "scheduled_for": "2026-04-15T10:00:00.000Z",
        "generated_order_id": "order_123"
      },
      "order": {
        "order_id": "order_123",
        "display_id": 1001,
        "status": "pending"
      },
      "attempt_count": 1,
      "max_attempts": 3,
      "next_retry_at": "2026-04-16T10:00:00.000Z",
      "last_attempt_at": "2026-04-15T10:02:00.000Z",
      "last_payment_error_code": "card_declined",
      "updated_at": "2026-04-15T10:02:00.000Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}
```

### Erros Comuns

- `400 invalid_data`
  Formato de parâmetro de consulta inválido ou valor de consulta incompatível.
- `400 invalid_data`
  Campo de classificação não suportado.

## 2. Obtenha detalhes do caso de cobrança

### Ponto final

- Método: `GET`
- Caminho: `/admin/dunning/:id`

### Propósito

Retorna a carga completa de detalhes do administrador para um único caso de cobrança.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "dunning_case": {
    "id": "dc_123",
    "status": "retry_scheduled",
    "subscription": {
      "subscription_id": "sub_123",
      "reference": "SUB-001",
      "status": "past_due",
      "customer_name": "Jane Doe",
      "product_title": "Coffee Subscription",
      "variant_title": "1 kg",
      "sku": "COFFEE-1KG",
      "payment_provider_id": "pp_stripe_stripe"
    },
    "renewal": {
      "renewal_cycle_id": "re_123",
      "status": "failed",
      "scheduled_for": "2026-04-15T10:00:00.000Z",
      "generated_order_id": "order_123"
    },
    "order": {
      "order_id": "order_123",
      "display_id": 1001,
      "status": "pending"
    },
    "attempt_count": 1,
    "max_attempts": 3,
    "retry_schedule": {
      "strategy": "fixed_intervals",
      "intervals": [1440, 4320, 10080],
      "timezone": "UTC",
      "source": "default_policy"
    },
    "next_retry_at": "2026-04-16T10:00:00.000Z",
    "last_payment_error_code": "card_declined",
    "last_payment_error_message": "Declined",
    "last_attempt_at": "2026-04-15T10:02:00.000Z",
    "recovered_at": null,
    "closed_at": null,
    "recovery_reason": null,
    "attempts": [
      {
        "id": "da_123",
        "attempt_no": 1,
        "status": "failed",
        "started_at": "2026-04-15T10:00:00.000Z",
        "finished_at": "2026-04-15T10:02:00.000Z",
        "error_code": "card_declined",
        "error_message": "Declined",
        "payment_reference": null,
        "metadata": null
      }
    ],
    "metadata": {
      "origin": "renewal_payment_failure"
    },
    "created_at": "2026-04-15T10:00:00.000Z",
    "updated_at": "2026-04-15T10:02:00.000Z"
  }
}
```

### Erros Comuns

- `404 not_found`
  O caso de cobrança não existe.

## 3. Tente novamente agora

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/retry-now`

### Propósito

Executa imediatamente o fluxo de trabalho de nova tentativa de pagamento de cobrança compartilhada, ignorando `next_retry_at`.

Comportamento atual do tempo de execução:
- falhas de pagamento repetíveis mantêm o caso em `retry_scheduled`
- falhas de pagamento permanentes encerram o caso como `unrecovered`

### Corpo da solicitação

```json
{
  "reason": "manual retry from admin"
}
```

`reason` é opcional.

### Resposta de sucesso

Estado:
- `200 OK`

Retorna a carga útil detalhada `dunning_case` atualizada.

### Erros Comuns

- `404 not_found`
  O caso não existe.
- `409 conflict`
  A nova tentativa já está sendo processada, o caso é terminal ou a transição é ilegal.

## 4. Marca recuperada

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/mark-recovered`

### Propósito

Fecha o caso conforme recuperado por meio de uma ação manual do operador apoiada por fluxo de trabalho.

### Corpo da solicitação

```json
{
  "reason": "paid outside normal retry flow"
}
```

`reason` é opcional.

### Resposta de sucesso

Estado:
- `200 OK`

Retorna a carga útil detalhada `dunning_case` atualizada.

### Erros Comuns

- `404 not_found`
  O caso não existe.
- `409 conflict`
  O caso já foi recuperado, já não foi recuperado ou a nova tentativa está em andamento.

## 5. Marcar como não recuperado

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/mark-unrecovered`

### Propósito

Fecha o caso como não recuperado por meio de uma ação manual do operador apoiada por fluxo de trabalho.

### Corpo da solicitação

```json
{
  "reason": "customer refused to update payment method"
}
```

`reason` é obrigatório.

### Resposta de sucesso

Estado:
- `200 OK`

Retorna a carga útil detalhada `dunning_case` atualizada.

### Erros Comuns

- `404 not_found`
  O caso não existe.
- `409 conflict`
  O caso já foi recuperado, já não foi recuperado ou a nova tentativa está em andamento.

## 6. Atualizar cronograma de novas tentativas

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/retry-schedule`

### Propósito

Substitui a política de novas tentativas para um caso e atualiza futuras tentativas automáticas.

### Corpo da solicitação

```json
{
  "reason": "short manual retry schedule",
  "intervals": [60, 120],
  "max_attempts": 2
}
```

Regras:
- `intervals` deve conter números inteiros positivos
- `max_attempts` deve ser positivo
- `max_attempts` deve ser igual ao número de intervalos de novas tentativas

### Resposta de sucesso

Estado:
- `200 OK`

Retorna a carga útil detalhada `dunning_case` atualizada.

### Erros Comuns

- `400 invalid_data`
  Formato de carga útil inválido ou semântica de agendamento inválida.
- `404 not_found`
  O caso não existe.
- `409 conflict`
  O caso é terminal, a nova tentativa está em andamento ou a substituição criaria uma transição ilegal.

## 7. Mapeamento de erros

A camada de rota de cobrança administrativa normaliza erros de domínio em respostas HTTP usando as regras atuais:

- `404`
  para erros não encontrados
- `400`
  para entrada inválida ou ausente
- `409`
  para conflitos de domínio e transições ilegais

Isso mantém a API alinhada com o padrão Medusa orientado ao fluxo de trabalho usado pelo restante do plugin.
