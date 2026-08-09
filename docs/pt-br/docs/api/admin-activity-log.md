# API do Registro de Atividades do Administrador

Este documento descreve o contrato da API de administração implementado para a área `Activity Log` do plug-in `Reorder`.

Este documento pretende ser a fonte oficial de referência atual para:
- parâmetros de solicitação
- formatos de resposta
- regras de filtragem, classificação e paginação
- cenários comuns de erro

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminhos de base

Rotas implementadas:
- `/admin/subscription-logs`
- `/admin/subscription-logs/:id`
- `/admin/subscriptions/:id/logs`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod
- os manipuladores de rota são simples e delegam a lógica de leitura aos auxiliares de consulta

Isso mantém a API alinhada com as convenções de rotas do Medusa e do modelo de leitura do Admin.

## DTOs compartilhados

As respostas da API são baseadas nos DTOs de administração definidos em:

- `src/admin/types/activity-log.ts`

Principais tipos de resposta:
- `ActivityLogAdminListResponse`
- `ActivityLogAdminDetailResponse`
- `ActivityLogAdminListItem`
- `ActivityLogAdminDetail`
- `ActivityLogAdminSubscriptionSummary`
- `ActivityLogAdminActorSummary`

## Valores compartilhados do domínio

### Valores dos tipos de ator

Valores de ator suportados:
- `user`
- `system`
- `scheduler`

### Valores do tipo de evento

Grupos de eventos compatíveis:
- `subscription.*`
- `renewal.*`
- `dunning.*`
- `cancellation.*`

A taxonomia explícita atual de eventos está definida em:
- `docs/architecture/activity-log.md`

## 1. Listar eventos do registro de atividades

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-logs`

### Objetivo

Retorna a lista global paginada do registro de atividades utilizada pela DataTable “Admin `Activity Log`”.

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

### Campos de classificação compatíveis

Baseado em banco de dados:
- `created_at`
- `event_type`
- `actor_type`

Na memória:
- `subscription_reference`
- `customer_name`
- `reason`

### Ordenação padrão

Se nenhuma ordem de classificação explícita for passada, a lista será retornada usando:
- `created_at desc`

### Resposta de sucesso

Status:
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

### Erros comuns

- `400 invalid_data`
  Formato inválido do parâmetro de consulta ou campo de classificação não suportado.

## 2. Obter detalhes do registro de atividades

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-logs/:id`

### Objetivo

Retorna a carga útil com todos os detalhes de um evento `subscription_log`.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Status:
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

### Erros comuns

- `404 not_found`
  O registro do log de atividades não existe.

## 3. Obter a linha do tempo de uma assinatura

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscriptions/:id/logs`

### Objetivo

Retorna a linha do tempo paginada do registro de atividades para uma página de detalhes de assinatura.

### Parâmetros de caminho

- `id: string`

### Parâmetros de consulta

Oferece os mesmos campos de paginação, ordenação e filtragem que a lista global.

Na prática, a rota aplica o mesmo modelo de leitura, ao mesmo tempo em que impõe:
- `subscription_id = :id`

### Ordenação padrão

Se nenhuma ordem de classificação explícita for passada, a linha do tempo é retornada usando:
- `created_at desc`

### Resposta de sucesso

Status:
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

## Ler as notas do modelo

O modelo de leitura implementado é do tipo “snapshot-first”.

Isso significa que:
- a lista e a linha do tempo são renderizadas a partir de instantâneos de `subscription_log`
- a visualização detalhada retorna a carga útil do evento armazenada no mesmo registro
- a API não exige um enriquecimento pesado em tempo de execução por parte dos módulos vinculados para a experiência básica

Isso mantém a trilha de auditoria historicamente estável e operacionalmente previsível.

## Notas sobre a exibição dos atores

O modelo de leitura mantém os campos de identidade de auditoria em formato bruto:
- `actor_type`
- `actor_id`

Além disso, ele enriquece o DTO Admin com:
- `actor.type`
- `actor.id`
- `actor.email`
- `actor.name`
- `actor.display`

O comportamento pretendido da interface do usuário é:
- dar preferência a `actor.display`
- recorrer a `actor_id` somente quando o enriquecimento de exibição não estiver disponível
