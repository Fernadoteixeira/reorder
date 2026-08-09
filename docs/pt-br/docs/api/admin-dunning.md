# API de cobrança administrativa

Este documento descreve o contrato da API de administração implementado para a área `Dunning` do plug-in `Reorder`.

É a fonte de referência atual em tempo de execução para:
- parâmetros de solicitação
- corpos de solicitação
- formatos de resposta
- cenários comuns de erro

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminho base

Todas as rotas estão em:

`/admin/dunning`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de se alterar os dados diretamente no manipulador da rota

## DTOs compartilhados

As respostas da API são baseadas nos DTOs de administração definidos em:

- `src/admin/types/dunning.ts`

Principais tipos de resposta:
- `DunningCaseAdminListResponse`
- `DunningCaseAdminDetailResponse`
- `DunningCaseAdminListItem`
- `DunningCaseAdminDetail`
- `DunningAttemptAdminRecord`
- `DunningRetryScheduleSummary`

## Valores compartilhados do domínio

### Valores do status do caso

Status de casos de cobrança suportados:
- `open`
- `retry_scheduled`
- `retrying`
- `awaiting_manual_resolution`
- `recovered`
- `unrecovered`

Significado atual do tempo de execução:
- `retry_scheduled`: a última tentativa falhou devido a um erro de pagamento que permite novas tentativas, e uma futura tentativa `next_retry_at` está agendada
- `unrecovered`: o caso é terminal e foi encerrado, seja porque a falha no pagamento é considerada permanente, seja porque as tentativas foram esgotadas

### Valores do status da tentativa

Status de tentativas de cobrança permitidos:
- `processing`
- `succeeded`
- `failed`

## 1. Lista de casos de cobrança

### Ponto final

- Método: `GET`
- Caminho: `/admin/dunning`

### Objetivo

Retorna a fila de cobranças paginada utilizada pela DataTable de cobranças do Admin.

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

### Campos de classificação compatíveis

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

Status:
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

### Erros comuns

- `400 invalid_data`
  Formato inválido do parâmetro de consulta ou valor de consulta não suportado.
- `400 invalid_data`
  Campo de classificação não suportado.

## 2. Obter detalhes do processo de cobrança

### Ponto final

- Método: `GET`
- Caminho: `/admin/dunning/:id`

### Objetivo

Retorna a carga útil completa dos detalhes administrativos de um único caso de cobrança.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Status:
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

### Erros comuns

- `404 not_found`
  O caso de cobrança não existe.

## 3. Tentar novamente agora

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/retry-now`

### Objetivo

Executa imediatamente o fluxo de trabalho compartilhado de nova tentativa de pagamento de cobrança, ignorando `next_retry_at`.

Comportamento atual do tempo de execução:
- falhas de pagamento que podem ser repetidas mantêm o caso em `retry_scheduled`
- falhas de pagamento permanentes encerram o caso como `unrecovered`

### Corpo da solicitação

```json
{
  "reason": "manual retry from admin"
}
```

`reason` é opcional.

### Resposta de sucesso

Status:
- `200 OK`

Retorna a carga útil de detalhes `dunning_case` atualizada.

### Erros comuns

- `404 not_found`
  O caso não existe.
- `409 conflict`
  A repetição já está em andamento, o caso é terminal ou a transição é inválida por algum outro motivo.

## 4. Marca recuperada

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/mark-recovered`

### Objetivo

Encerra o caso como recuperado por meio de uma ação manual do operador, apoiada por um fluxo de trabalho.

### Corpo da solicitação

```json
{
  "reason": "paid outside normal retry flow"
}
```

`reason` é opcional.

### Resposta de sucesso

Status:
- `200 OK`

Retorna a carga útil de detalhes `dunning_case` atualizada.

### Erros comuns

- `404 not_found`
  O caso não existe.
- `409 conflict`
  O caso já foi recuperado, já não está mais em recuperação ou uma nova tentativa está em andamento.

## 5. Marca não recuperada

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/mark-unrecovered`

### Objetivo

Encerra o caso como não recuperado por meio de uma ação manual do operador, apoiada por um fluxo de trabalho.

### Corpo da solicitação

```json
{
  "reason": "customer refused to update payment method"
}
```

É necessário preencher o campo `reason`.

### Resposta de sucesso

Status:
- `200 OK`

Retorna a carga útil de detalhes `dunning_case` atualizada.

### Erros comuns

- `404 not_found`
  O caso não existe.
- `409 conflict`
  O caso já foi recuperado, já não está mais em recuperação ou uma nova tentativa está em andamento.

## 6. Atualizar a programação de novas tentativas

### Ponto final

- Método: `POST`
- Caminho: `/admin/dunning/:id/retry-schedule`

### Objetivo

Substitui a política de novas tentativas para um caso específico e atualiza as futuras tentativas automáticas.

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
- `max_attempts` deve ser igual ao número de intervalos de repetição

### Resposta de sucesso

Status:
- `200 OK`

Retorna a carga útil de detalhes `dunning_case` atualizada.

### Erros comuns

- `400 invalid_data`
  Formato inválido da carga útil ou semântica inválida da programação.
- `404 not_found`
  O caso não existe.
- `409 conflict`
  O caso é terminal, uma nova tentativa está em andamento ou a substituição criaria uma transição inválida.

## 7. Mapeamento de erros

A camada de rota de cobrança do administrador normaliza os erros de domínio em respostas HTTP usando as regras atuais:

- `404`
  para erros de página não encontrada
- `400`
  para entradas inválidas ou ausentes
- `409`
  para conflitos de domínio e transições ilegais

Isso mantém a API alinhada com o padrão Medusa orientado por fluxo de trabalho utilizado pelo restante do plug-in.
