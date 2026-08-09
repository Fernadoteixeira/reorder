# Reordenar: especificações de endpoints administrativos de assinatura

Este documento conclui a etapa `2.1.2` de `documentation/implementation_plan.md`.

Objetivo:
- projetar os endpoints de back-end para a visualização Admin `Subscriptions`
- fique o mais próximo possível dos padrões oficiais da Medusa

Padrões de referência da Medusa:
- `GET /admin/subscriptions`
- `GET /admin/subscriptions/:id`
- `validateAndTransformQuery(...)`
- `AuthenticatedMedusaRequest`
- `query.graph(...)`
- mutações como rotas `POST` dedicadas que executam fluxos de trabalho

## 1. Regras de design

- Todos os endpoints estão sob o prefixo `/admin`, portanto, são automaticamente somente administradores no Medusa.
- Os manipuladores de rota usam `AuthenticatedMedusaRequest`.
- Os pontos de extremidade de leitura usam `query.graph()` ou `query.index()` se a filtragem exigir a passagem de módulos vinculados.
- Os pontos finais de mutação são apenas uma camada HTTP fina:
  - solicitar validação
  - execução de fluxo de trabalho
  - retorno de uma resposta normalizada
- A lógica de negócios não reside na rota.

## 2. Pontos finais

### 2.1 Listar assinaturas

- Método: `GET`
- Caminho: `/admin/subscriptions`
- Objetivo: fonte de dados para `DataTable` na página `Subscriptions`

#### Parâmetros de consulta

- `limit?: number`
- `offset?: number`
- `order?: string`
- `q?: string`
- `status?: string | string[]`
- `customer_id?: string`
- `product_id?: string`
- `variant_id?: string`
- `next_renewal_from?: string`
- `next_renewal_to?: string`
- `is_trial?: boolean`
- `skip_next_cycle?: boolean`

#### Resposta

```json
{
  "subscriptions": [],
  "count": 0,
  "limit": 20,
  "offset": 0
}
```

#### Notas de implementação

- Middleware:
  - `validateAndTransformQuery(...)`
- Ler modelo:
  - carga útil alinhada com `SubscriptionAdminListResponse`
- Consulta:
  - prefira `query.graph()` se todos os filtros forem possíveis dentro deste modelo
  - mude para `query.index()` se a filtragem por `customer`, `product` ou `variant` exigir módulos vinculados

### 2.2 Obtenha detalhes da assinatura

- Método: `GET`
- Caminho: `/admin/subscriptions/:id`
- Objetivo: visualização de detalhes da assinatura

#### Parâmetros de caminho

- `id: string`

#### Resposta

```json
{
  "subscription": {}
}
```

#### Notas de implementação

- Ler modelo:
  - carga útil alinhada com `SubscriptionAdminDetailResponse`
- Consulta:
  - `query.graph(...)`
- Erro:
  - `404` se a assinatura não existir

### 2.3 Pausar assinatura

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/pause`
- Objetivo: impedir renovações futuras

#### Corpo

```json
{
  "reason": "customer requested temporary stop",
  "effective_at": "2026-04-01T00:00:00.000Z"
}
```

#### Resposta

```json
{
  "subscription": {}
}
```

#### Notas de implementação

- Middleware:
  - `validateAndTransformBody(...)`
- Fluxo de trabalho:
  - `pauseSubscriptionWorkflow`

### 2.4 Retomar assinatura

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/resume`
- Objetivo: retomar uma assinatura pausada

#### Corpo

```json
{
  "resume_at": "2026-04-15T00:00:00.000Z",
  "preserve_billing_anchor": true
}
```

#### Resposta

```json
{
  "subscription": {}
}
```

#### Notas de implementação

- Middleware:
  - `validateAndTransformBody(...)`
- Fluxo de trabalho:
  - `resumeSubscriptionWorkflow`

### 2.5 Cancelar assinatura

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/cancel`
- Objetivo: cancelar a assinatura

#### Corpo

```json
{
  "reason": "retention flow failed",
  "effective_at": "end_of_cycle"
}
```

#### Resposta

```json
{
  "subscription": {}
}
```

#### Notas de implementação

- Middleware:
  - `validateAndTransformBody(...)`
- Fluxo de trabalho:
  - `cancelSubscriptionWorkflow`

### 2.6 Mudança de plano de cronograma

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/schedule-plan-change`
- Objetivo: armazenar `pending_update_data` para um ciclo futuro

#### Corpo

```json
{
  "variant_id": "variant_123",
  "frequency_interval": "month",
  "frequency_value": 2,
  "effective_at": "2026-05-01T00:00:00.000Z"
}
```

#### Resposta

```json
{
  "subscription": {},
  "pending_update_data": {}
}
```

#### Notas de implementação

- Middleware:
  - `validateAndTransformBody(...)`
- Fluxo de trabalho:
  - `scheduleSubscriptionPlanChangeWorkflow`

### 2.7 Atualizar endereço de entrega

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/update-shipping-address`
- Objetivo: atualizar o endereço de entrega para atendimentos futuros

#### Corpo

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

#### Resposta

```json
{
  "subscription": {}
}
```

#### Notas de implementação

- Middleware:
  - `validateAndTransformBody(...)`
- Fluxo de trabalho:
  - `updateSubscriptionShippingAddressWorkflow`

## 3. Estrutura de arquivo proposta

Estrutura alvo alinhada com Medusa:

```text
reorder/src/api/admin/subscriptions/route.ts
reorder/src/api/admin/subscriptions/[id]/route.ts
reorder/src/api/admin/subscriptions/[id]/pause/route.ts
reorder/src/api/admin/subscriptions/[id]/resume/route.ts
reorder/src/api/admin/subscriptions/[id]/cancel/route.ts
reorder/src/api/admin/subscriptions/[id]/schedule-plan-change/route.ts
reorder/src/api/admin/subscriptions/[id]/update-shipping-address/route.ts
reorder/src/api/admin/subscriptions/validators.ts
reorder/src/api/admin/subscriptions/middlewares.ts
reorder/src/api/middlewares.ts
```

Notas:
- se os validadores ficarem grandes, eles poderão ser divididos por rota
- o middleware pode permanecer compartilhado por todo o namespace `subscriptions`

## 4. Erros de domínio e HTTP

Conjunto mínimo esperado em etapas posteriores:

- `404 Not Found`
  - assinatura não encontrada
- `400 Bad Request`
  - carga útil inválida/parâmetros de consulta inválidos
- `409 Conflict`
  - transição de status inválida
  - conflito de atualização pendente
  - ação não suportada para o estado atual do ciclo de vida
- `422 Unprocessable Entity`
  - endereço de entrega inválido
  - variante não elegível para assinatura
  - configuração de frequência inválida

## 5. Rota -> mapeamento de responsabilidades

| Rota | Tipo | Camada lógica |
|---|---|---|
| `GET /admin/subscriptions` | leia | modelo de consulta/leitura |
| `GET /admin/subscriptions/:id` | leia | modelo de consulta/leitura |
| `POST /admin/subscriptions/:id/pause` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/resume` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/cancel` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/schedule-plan-change` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/update-shipping-address` | mutação | fluxo de trabalho |

## 6. Impacto nas etapas posteriores

As próximas etapas agora devem entregar:

1.`2.1.3`
   - fluxos de trabalho de mutação para os cinco endpoints `POST`
2.`2.1.4`
   - Validadores Zod e middlewares
3.`2.1.5`
   - consultas de lista/detalhe alinhadas com esta especificação
