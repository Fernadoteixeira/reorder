# API de renovações administrativas

Este documento descreve o contrato da API de administração implementado para a área `Renewals` do plug-in `Reorder`.

Este documento pretende ser a fonte oficial de referência atual para:
- parâmetros de solicitação
- corpos de solicitação
- formatos de resposta
- cenários comuns de erro

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminho base

Todas as rotas estão em:

`/admin/renewals`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de se alterar os dados diretamente no manipulador da rota

Isso mantém a API alinhada com as convenções de rotas e fluxo de trabalho do Medusa.

## DTOs compartilhados

As respostas da API são baseadas nos DTOs de administração definidos em:

- `src/admin/types/renewal.ts`

Principais tipos de resposta:
- `RenewalCycleAdminListResponse`
- `RenewalCycleAdminDetailResponse`
- `RenewalCycleAdminListItem`
- `RenewalCycleAdminDetail`
- `RenewalAttemptAdminRecord`
- `RenewalAdminApprovalSummary`

## Valores compartilhados do domínio

### Valores do status do ciclo

Status de ciclo de renovação suportados:
- `scheduled`
- `processing`
- `succeeded`
- `failed`

### Valores do status de aprovação

Estados de aprovação suportados:
- `pending`
- `approved`
- `rejected`

Quando a aprovação não é necessária, a API retorna `status = null` no resumo da aprovação.

### Valores do status da tentativa

Estados de tentativa suportados:
- `processing`
- `succeeded`
- `failed`

## 1. Renovações de listagens

### Ponto final

- Método: `GET`
- Caminho: `/admin/renewals`

### Objetivo

Retorna a fila de renovações paginada utilizada pela DataTable de renovações do Admin.

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
- `approval_status?: string | string[]`
- `scheduled_from?: string`
- `scheduled_to?: string`
- `last_attempt_status?: string | string[]`
- `subscription_id?: string`
- `generated_order_id?: string`

### Campos de classificação compatíveis

Baseado em banco de dados:
- `scheduled_for`
- `updated_at`
- `created_at`
- `status`
- `approval_status`
- `processed_at`

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
  "renewals": [
    {
      "id": "re_123",
      "status": "scheduled",
      "subscription": {
        "subscription_id": "sub_123",
        "reference": "SUB-001",
        "status": "active",
        "customer_name": "Jane Doe",
        "product_title": "Coffee Subscription",
        "variant_title": "1 kg",
        "sku": "COFFEE-1KG"
      },
      "scheduled_for": "2026-04-15T10:00:00.000Z",
      "effective_scheduled_for": "2026-04-15T10:00:00.000Z",
      "last_attempt_status": "failed",
      "last_attempt_at": "2026-04-15T10:02:00.000Z",
      "approval": {
        "required": true,
        "status": "pending",
        "decided_at": null,
        "decided_by": null,
        "reason": null
      },
      "generated_order": null,
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

## 2. Obter detalhes sobre a renovação

### Ponto final

- Método: `GET`
- Caminho: `/admin/renewals/:id`

### Objetivo

Retorna a carga útil completa dos detalhes administrativos para um único ciclo de renovação.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "renewal": {
    "id": "re_123",
    "status": "failed",
    "subscription": {
      "subscription_id": "sub_123",
      "reference": "SUB-001",
      "status": "active",
      "customer_name": "Jane Doe",
      "product_title": "Coffee Subscription",
      "variant_title": "1 kg",
      "sku": "COFFEE-1KG"
    },
    "scheduled_for": "2026-04-15T10:00:00.000Z",
    "effective_scheduled_for": "2026-04-15T10:00:00.000Z",
    "last_attempt_status": "failed",
    "last_attempt_at": "2026-04-15T10:02:00.000Z",
    "approval": {
      "required": true,
      "status": "approved",
      "decided_at": "2026-04-15T09:55:00.000Z",
      "decided_by": "user_123",
      "reason": "approved for processing"
    },
    "generated_order": {
      "order_id": "order_123",
      "display_id": 1001,
      "status": "pending"
    },
    "updated_at": "2026-04-15T10:03:00.000Z",
    "created_at": "2026-04-10T10:00:00.000Z",
    "processed_at": "2026-04-15T10:03:00.000Z",
    "last_error": null,
    "pending_changes": {
      "variant_id": "variant_456",
      "variant_title": "2 kg",
      "frequency_interval": "month",
      "frequency_value": 2,
      "effective_at": null
    },
    "attempts": [
      {
        "id": "reatt_123",
        "attempt_no": 1,
        "status": "failed",
        "started_at": "2026-04-15T10:00:00.000Z",
        "finished_at": "2026-04-15T10:02:00.000Z",
        "error_code": "renewal_failed",
        "error_message": "payment failed",
        "payment_reference": null,
        "order_id": null
      }
    ],
    "metadata": {
      "last_trigger_type": "manual",
      "last_correlation_id": "renewal-admin-force-uuid"
    }
  }
}
```

Notas:
- `scheduled_for` é a data do ciclo de renovação operacional armazenada em `renewal_cycle`
- `effective_scheduled_for` é a data de entrega prevista exibida no Admin quando a assinatura vinculada tem, no momento, o próximo ciclo pulado

### Erros comuns

- `404 not_found`
  O ciclo de renovação não existe.

## 3. Renovação forçada

### Ponto final

- Método: `POST`
- Caminho: `/admin/renewals/:id/force`

### Objetivo

Aciona manualmente a execução de um ciclo de renovação que pode ser executado à força.

### Corpo da solicitação

```json
{
  "reason": "manual retry after review"
}
```

Campos:
- `reason?: string`

### Resposta de sucesso

Status:
- `200 OK`

Retorna a carga útil atualizada com os detalhes da renovação:

```json
{
  "renewal": {
    "id": "re_123",
    "status": "succeeded"
  }
}
```

### Erros comuns

- `404 not_found`
  O ciclo de renovação não existe.
- `409 conflict`
  O ciclo já está em andamento.
- `409 conflict`
  A execução duplicada foi bloqueada porque o ciclo já foi concluído com sucesso.
- `409 conflict`
  O ciclo não está em um estado que permita a execução forçada.
- `409 conflict`
  O ciclo requer alterações aprovadas antes de poder ser executado à força.
- `409 conflict`
  A assinatura vinculada não é elegível para renovação.
- `400 invalid_data`
  A política atual `Plans & Offers` impede que a alteração pendente seja aplicada.

## 4. Aprovar alterações na renovação

### Ponto final

- Método: `POST`
- Caminho: `/admin/renewals/:id/approve-changes`

### Objetivo

Aprova as alterações pendentes na assinatura para um ciclo de renovação que exige aprovação.

### Corpo da solicitação

```json
{
  "reason": "approved after review"
}
```

Campos:
- `reason?: string`

### Resposta de sucesso

Status:
- `200 OK`

Retorna a carga útil atualizada dos detalhes da renovação, com o resumo de aprovação atualizado.

### Erros comuns

- `404 not_found`
  O ciclo de renovação não existe.
- `409 conflict`
  Não é necessária aprovação para este ciclo.
- `409 conflict`
  A aprovação já foi decidida para este ciclo.

## 5. Rejeitar alterações na renovação

### Ponto final

- Método: `POST`
- Caminho: `/admin/renewals/:id/reject-changes`

### Objetivo

Rejeita alterações pendentes na assinatura para um ciclo de renovação que exija aprovação.

### Corpo da solicitação

```json
{
  "reason": "pending changes are not valid for this cycle"
}
```

Campos:
- `reason: string`

Ao contrário da aprovação, o `reason` é obrigatório no contrato da API atual.

### Resposta de sucesso

Status:
- `200 OK`

Retorna a carga útil atualizada dos detalhes da renovação, com o resumo de aprovação atualizado.

### Erros comuns

- `400 invalid_data`
  `reason` ausente ou inválido.
- `404 not_found`
  O ciclo de renovação não existe.
- `409 conflict`
  Não é necessária aprovação para este ciclo.
- `409 conflict`
  A aprovação já foi decidida para este ciclo.

## 6. Notas sobre a API

### Ler as notas do modelo

A API de administração de renovação utiliza auxiliares dedicados do modelo de leitura, em vez de retornar entidades do módulo em formato bruto.

Isso significa que as cargas úteis já incluem:
- resumo da assinatura vinculada
- resumo do pedido vinculado
- resumo da aprovação
- resumo da última tentativa na lista
- histórico completo das tentativas nos detalhes

### Notas operacionais

A implementação atual também anexa metadados operacionais durante a execução, incluindo informações sobre gatilhos e IDs de correlação utilizados para registro em log e rastreamento do agendador.

Esses campos são exibidos por meio de `metadata` na resposta detalhada.

Os consumidores de administração desta API estão implementados em:
- `src/admin/routes/subscriptions/renewals/page.tsx`
- `src/admin/routes/subscriptions/renewals/[id]/page.tsx`

A camada correspondente de carregamento e invalidação de dados está centralizada em:
- `src/admin/routes/subscriptions/renewals/data-loading.ts`

## Documentos relacionados

- [Arquitetura de renovações](../architecture/renewals.md)
- [Interface do usuário de renovações do administrador](../admin/renewals.md)
- [Testes de renovações](../testing/renewals.md)
- [Especificações de renovações](../specs/renewals/admin-spec.md)
