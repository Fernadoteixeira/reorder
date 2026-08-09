# API de renovações de administrador

Este documento descreve o contrato Admin API implementado para a área `Renewals` do plugin `Reorder`.

Pretende ser a fonte atual de verdade para:
- parâmetros de solicitação
- solicitar órgãos
- formas de resposta
- cenários de erro comuns

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminho Básico

Todas as rotas estão em:

`/admin/renewals`

## Autenticação

Todas as rotas são rotas somente para administradores.

Em termos de implementação:
- as rotas usam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio de middleware Medusa e esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de alterar os dados diretamente no manipulador de rotas

Isso mantém a API alinhada com as convenções de rota e fluxo de trabalho da Medusa.

## DTOs compartilhados

As respostas da API são baseadas nos Admin DTOs definidos em:

- `src/admin/types/renewal.ts`

Principais tipos de resposta:
- `RenewalCycleAdminListResponse`
- `RenewalCycleAdminDetailResponse`
- `RenewalCycleAdminListItem`
- `RenewalCycleAdminDetail`
- `RenewalAttemptAdminRecord`
- `RenewalAdminApprovalSummary`

## Valores de domínio compartilhado

### Valores de status do ciclo

Status do ciclo de renovação suportados:
- `scheduled`
- `processing`
- `succeeded`
- `failed`

### Valores de status de aprovação

Status de aprovação suportados:
- `pending`
- `approved`
- `rejected`

Quando a aprovação não é necessária, a API retorna `status = null` dentro do resumo de aprovação.

### Valores de status de tentativa

Status de tentativa suportados:
- `processing`
- `succeeded`
- `failed`

## 1. Renovações de lista

### Ponto final

- Método: `GET`
- Caminho: `/admin/renewals`

### Propósito

Retorna a fila de renovação paginada usada pelo DataTable de renovações de administrador.

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

### Campos de classificação suportados

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

Estado:
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

### Erros Comuns

- `400 invalid_data`
  Formato de parâmetro de consulta inválido ou valor de consulta incompatível.
- `400 invalid_data`
  Campo de classificação não suportado.

## 2. Obtenha detalhes de renovação

### Ponto final

- Método: `GET`
- Caminho: `/admin/renewals/:id`

### Propósito

Retorna a carga completa de detalhes do administrador para um único ciclo de renovação.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Estado:
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
- `effective_scheduled_for` é a data de entrega projetada mostrada no Admin quando a assinatura vinculada atualmente tem um próximo ciclo ignorado

### Erros Comuns

- `404 not_found`
  O ciclo de renovação não existe.

## 3. Forçar Renovação

### Ponto final

- Método: `POST`
- Caminho: `/admin/renewals/:id/force`

### Propósito

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

Estado:
- `200 OK`

Retorna o payload atualizado dos detalhes da renovação:

```json
{
  "renewal": {
    "id": "re_123",
    "status": "succeeded"
  }
}
```

### Erros Comuns

- `404 not_found`
  O ciclo de renovação não existe.
- `409 conflict`
  O ciclo já está em processamento.
- `409 conflict`
  A execução duplicada está bloqueada porque o ciclo já foi bem-sucedido.
- `409 conflict`
  O ciclo não está em um estado forçoso.
- `409 conflict`
  O ciclo requer alterações aprovadas antes de poder ser executado à força.
- `409 conflict`
  A assinatura vinculada não é elegível para renovação.
- `400 invalid_data`
  A política `Plans & Offers` atual bloqueia a aplicação da alteração pendente.

## 4. Aprovar alterações de renovação

### Ponto final

- Método: `POST`
- Caminho: `/admin/renewals/:id/approve-changes`

### Propósito

Aprova alterações de assinatura pendentes para um ciclo de renovação que requer aprovação.

### Corpo da solicitação

```json
{
  "reason": "approved after review"
}
```

Campos:
- `reason?: string`

### Resposta de sucesso

Estado:
- `200 OK`

Retorna a carga atualizada de detalhes de renovação com resumo de aprovação atualizado.

### Erros Comuns

- `404 not_found`
  O ciclo de renovação não existe.
- `409 conflict`
  A aprovação não é necessária para este ciclo.
- `409 conflict`
  A aprovação já foi decidida para este ciclo.

## 5. Rejeitar alterações de renovação

### Ponto final

- Método: `POST`
- Caminho: `/admin/renewals/:id/reject-changes`

### Propósito

Rejeita alterações de assinatura pendentes para um ciclo de renovação que requer aprovação.

### Corpo da solicitação

```json
{
  "reason": "pending changes are not valid for this cycle"
}
```

Campos:
- `reason: string`

Ao contrário da aprovação, `reason` é exigido no contrato de API atual.

### Resposta de sucesso

Estado:
- `200 OK`

Retorna a carga atualizada de detalhes de renovação com resumo de aprovação atualizado.

### Erros Comuns

- `400 invalid_data`
  `reason` ausente ou inválido.
- `404 not_found`
  O ciclo de renovação não existe.
- `409 conflict`
  A aprovação não é necessária para este ciclo.
- `409 conflict`
  A aprovação já foi decidida para este ciclo.

## 6. Notas da API

### Leia as notas do modelo

A API Admin de renovação usa auxiliares de modelo de leitura dedicados em vez de retornar entidades de módulo bruto.

Isso significa que as cargas já incluem:
- resumo de assinatura vinculado
- resumo do pedido vinculado
- resumo de aprovação
- resumo da última tentativa na lista
- histórico completo de tentativas em detalhes

### Notas Operacionais

A implementação atual também anexa metadados operacionais durante a execução, incluindo informações de gatilho e IDs de correlação usados ​​para registro em log e rastreamento do agendador.

Esses campos são expostos por meio de `metadata` na resposta detalhada.

Os consumidores Admin desta API são implementados em:
- `src/admin/routes/subscriptions/renewals/page.tsx`
- `src/admin/routes/subscriptions/renewals/[id]/page.tsx`

A camada correspondente de carregamento e invalidação de dados está centralizada em:
- `src/admin/routes/subscriptions/renewals/data-loading.ts`

## Documentos Relacionados

- [Arquitetura de renovações](../architecture/renewals.md)
- [IU de renovações de administrador](../admin/renewals.md)
- [Teste de renovações](../testing/renewals.md)
- [Especificações de renovações](../specs/renewals/admin-spec.md)
