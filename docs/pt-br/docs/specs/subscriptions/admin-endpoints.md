# Reorder: Especificação dos endpoints de administração de assinaturas

Este documento conclui a etapa `2.1.2` de `documentation/implementation_plan.md`.

Objetivo:
- projetar os endpoints de backend para a visualização de administração do `Subscriptions`
- seguir o mais fielmente possível os padrões oficiais do Medusa

Padrões de referência do Medusa:
- `GET /admin/subscriptions`
- `GET /admin/subscriptions/:id`
- `validateAndTransformQuery(...)`
- `AuthenticatedMedusaRequest`
- `query.graph(...)`
- mutações como rotas dedicadas `POST` que executam fluxos de trabalho

## 1. Regras de design

- Todos os endpoints estão sob o prefixo `/admin`, portanto, são automaticamente restritos ao administrador no Medusa.
- Os manipuladores de rota usam `AuthenticatedMedusaRequest`.
- Os endpoints de leitura utilizam `query.graph()` ou `query.index()` caso a filtragem exija percorrer módulos vinculados.
- Os endpoints de mutação consistem apenas em uma camada HTTP simples:
  - validação da solicitação
  - execução do fluxo de trabalho
  - retorno de uma resposta normalizada
- A lógica de negócios não está presente na rota.

## 2. Pontos finais

### 2.1 Assinaturas de listas

- Método: `GET`
- Caminho: `/admin/subscriptions`
- Finalidade: fonte de dados para o `DataTable` na página `Subscriptions`

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
- Modelo de leitura:
  - carga útil alinhada com `SubscriptionAdminListResponse`
- Consulta:
  - dar preferência a `query.graph()` se todos os filtros forem possíveis dentro deste modelo
  - alternar para `query.index()` se a filtragem por `customer`, `product` ou `variant` exigir módulos vinculados

### 2.2 Obter detalhes da assinatura

- Método: `GET`
- Caminho: `/admin/subscriptions/:id`
- Finalidade: visualização dos detalhes da assinatura

#### Parâmetros de caminho

- `id: string`

#### Resposta

```json
{
  "subscription": {}
}
```

#### Notas de implementação

- Modelo de leitura:
  - carga útil alinhada com `SubscriptionAdminDetailResponse`
- Consulta:
  - `query.graph(...)`
- Erro:
  - `404` se a assinatura não existir

### 2.3 Suspender a assinatura

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/pause`
- Objetivo: interromper renovações futuras

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

### 2.4 Retomar a assinatura

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/resume`
- Finalidade: retomar uma assinatura pausada

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

### 2.5 Cancelar a assinatura

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

### 2.6 Alteração do plano de programação

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/schedule-plan-change`
- Finalidade: armazenar `pending_update_data` para um ciclo futuro

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
- Objetivo: atualizar o endereço de entrega para pedidos futuros

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

## 3. Estrutura de arquivos proposta

Estrutura-alvo alinhada com o Medusa:

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

Observações:
- se os validadores ficarem muito grandes, eles podem ser divididos por rota
- o middleware pode continuar sendo compartilhado por todo o namespace `subscriptions`

## 4. Erros de domínio e HTTP

Conjunto mínimo esperado nas etapas posteriores:

- `404 Not Found`
  - assinatura não encontrada
- `400 Bad Request`
  - carga inválida / parâmetros de consulta inválidos
- `409 Conflict`
  - transição de status inválida
  - conflito de atualização pendente
  - ação não suportada para o estado atual do ciclo de vida
- `422 Unprocessable Entity`
  - endereço de entrega inválido
  - variante não elegível para assinatura
  - configuração de frequência inválida

## 5. Mapeamento entre rota e responsabilidade

| Rota | Tipo | Camada lógica |
|---|---|---|
| `GET /admin/subscriptions` | leitura | modelo de consulta/leitura |
| `GET /admin/subscriptions/:id` | leitura | modelo de consulta/leitura |
| `POST /admin/subscriptions/:id/pause` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/resume` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/cancel` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/schedule-plan-change` | mutação | fluxo de trabalho |
| `POST /admin/subscriptions/:id/update-shipping-address` | mutação | fluxo de trabalho |

## 6. Impacto nas etapas posteriores

As próximas etapas devem agora proporcionar:

1. `2.1.3`
   - fluxos de trabalho de mutação para os cinco endpoints `POST`
2. `2.1.4`
   - validadores e middlewares do Zod
3. `2.1.5`
   - consultas de lista/detalhes alinhadas com esta especificação
