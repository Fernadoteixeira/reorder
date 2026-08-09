# API de registro de atividades do administrador

Este documento descreve o contrato Admin API implementado para a área `Activity Log` do plugin `Reorder`.

Pretende ser a fonte atual de verdade para:
- parâmetros de solicitação
- formas de resposta
- regras de filtragem, classificação e paginação
- cenários de erro comuns

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminhos básicos

Rotas implementadas:
- `/admin/subscription-logs`
- `/admin/subscription-logs/:id`
- `/admin/subscriptions/:id/logs`

## Autenticação

Todas as rotas são rotas somente para administradores.

Em termos de implementação:
- as rotas usam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio de middleware Medusa e esquemas Zod
- manipuladores de rota permanecem finos e delegam lógica de leitura para auxiliares de consulta

Isso mantém a API alinhada com a rota Medusa e as convenções de modelo de leitura do administrador.

## DTOs compartilhados

As respostas da API são baseadas nos Admin DTOs definidos em:

- `src/admin/types/activity-log.ts`

Principais tipos de resposta:
- `ActivityLogAdminListResponse`
- `ActivityLogAdminDetailResponse`
- `ActivityLogAdminListItem`
- `ActivityLogAdminDetail`
- `ActivityLogAdminSubscriptionSummary`
- `ActivityLogAdminActorSummary`

## Valores de domínio compartilhado

### Valores de tipo de ator

Valores de ator suportados:
- `user`
- `system`
- `scheduler`

### Valores de tipo de evento

Grupos de eventos suportados:
- `subscription.*`
- `renewal.*`
- `dunning.*`
- `cancellation.*`

A atual taxonomia de eventos explícita é definida em:
- `docs/architecture/activity-log.md`

## 1. Listar eventos do log de atividades

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-logs`

### Propósito

Retorna a lista de log de atividades global paginada usada pelo Admin `Activity Log` DataTable.

### Parâmetros de consulta

Paginação e pesquisa:
- `limit?: number`
- `offset?: number`
- `q?: string`

Classificação:
- `order?: string`
- `direction?: "asc" | "desc"`

Filtros:
- `subscription_id?: string`
- `customer_id?: string`
- `event_type?: string | string[]`
- `actor_type?: string | string[]`
- `date_from?: string`
- `date_to?: string`

Tipos de atores suportados:
- `user`
- `customer`
- `system`
- `scheduler`

### Campos de classificação suportados

Baseado em banco de dados:
- `created_at`
- `event_type`
- `actor_type`

Na memória:
- `subscription_reference`
- `customer_name`
- `reason`

### Classificação padrão

Se nenhuma classificação explícita for passada, a lista será retornada usando:
- `created_at desc`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "subscription_logs": [
    {
      "id": "slog_123",
      "subscription_id": "sub_123",
      "event_type": "subscription.paused",
      "actor_type": "user",
      "actor_id": "user_123",
      "actor": {
        "type": "user",
        "id": "user_123",
        "email": "admin@example.com",
        "name": "Admin User",
        "display": "admin@example.com"
      },
      "subscription": {
        "subscription_id": "sub_123",
        "reference": "SUB-001",
        "customer_id": "cus_123",
        "customer_name": "Jane Doe",
        "product_title": "Coffee Subscription",
        "variant_title": "1 kg"
      },
      "reason": "customer requested pause",
      "change_summary": "status, paused_at",
      "created_at": "2026-04-15T10:00:00.000Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}
```

### Erros Comuns

- `400 invalid_data`
  Formato de parâmetro de consulta inválido ou campo de classificação não compatível.

## 2. Obtenha detalhes do registro de atividades

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-logs/:id`

### Propósito

Retorna a carga detalhada completa para um evento `subscription_log`.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "subscription_log": {
    "id": "slog_123",
    "subscription_id": "sub_123",
    "event_type": "renewal.succeeded",
    "actor_type": "scheduler",
    "actor_id": null,
    "actor": {
      "type": "scheduler",
      "id": null,
      "email": null,
      "name": null,
      "display": null
    },
    "subscription": {
      "subscription_id": "sub_123",
      "reference": "SUB-001",
      "customer_id": "cus_123",
      "customer_name": "Jane Doe",
      "product_title": "Coffee Subscription",
      "variant_title": "1 kg"
    },
    "reason": null,
    "change_summary": "status, processed_at",
    "created_at": "2026-04-15T10:03:00.000Z",
    "previous_state": {
      "status": "scheduled"
    },
    "new_state": {
      "status": "succeeded"
    },
    "changed_fields": [
      {
        "field": "status",
        "before": "scheduled",
        "after": "succeeded"
      }
    ],
    "metadata": {
      "renewal_cycle_id": "re_123",
      "order_id": "order_123"
    }
  }
}
```

### Erros Comuns

- `404 not_found`
  O registro do log de atividades não existe.

## 3. Obtenha o cronograma para uma assinatura

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscriptions/:id/logs`

### Propósito

Retorna o cronograma do log de atividades paginado para uma página de detalhes da assinatura.

### Parâmetros de caminho

- `id: string`

### Parâmetros de consulta

Suporta os mesmos campos de paginação, classificação e filtro da lista global.

Na prática, a rota aplica o mesmo modelo de leitura enquanto força:
- `subscription_id = :id`

### Classificação padrão

Se nenhuma classificação explícita for passada, a linha do tempo será retornada usando:
- `created_at desc`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "subscription_logs": [
    {
      "id": "slog_123",
      "subscription_id": "sub_123",
      "event_type": "subscription.paused",
      "actor_type": "user",
      "actor_id": "user_123",
      "actor": {
        "type": "user",
        "id": "user_123",
        "email": "admin@example.com",
        "name": "Admin User",
        "display": "admin@example.com"
      },
      "subscription": {
        "subscription_id": "sub_123",
        "reference": "SUB-001",
        "customer_id": "cus_123",
        "customer_name": "Jane Doe",
        "product_title": "Coffee Subscription",
        "variant_title": "1 kg"
      },
      "reason": "customer requested pause",
      "change_summary": "status, paused_at",
      "created_at": "2026-04-15T10:00:00.000Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}
```

## Leia as notas do modelo

O modelo de leitura implementado prioriza o instantâneo.

Isso significa:
- a lista e a linha do tempo renderizadas dos instantâneos `subscription_log`
- a visualização detalhada retorna a carga útil do evento armazenado do mesmo registro
- a API não requer grande enriquecimento de tempo de execução de módulos vinculados para a experiência base

Isto mantém a trilha de auditoria historicamente estável e operacionalmente previsível.

## Notas de exibição do ator

O modelo de leitura mantém os campos brutos de identidade de auditoria:
- `actor_type`
- `actor_id`

Também enriquece o Admin DTO com:
- `actor.type`
- `actor.id`
- `actor.email`
- `actor.name`
- `actor.display`

O comportamento pretendido da IU é:
- prefira `actor.display`
- volte para `actor_id` somente quando o enriquecimento de exibição não estiver disponível
