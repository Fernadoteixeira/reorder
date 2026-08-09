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

`/admin/assinaturas`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio do middleware do Medusa e dos esquemas do Zod

## DTOs compartilhados

As respostas da API são baseadas nos DTOs de administração definidos em:

- `src/admin/types/subscription.ts`

Principais tipos de resposta:
- `SubscriptionAdminListResponse`
- `SubscriptionAdminDetailResponse`

## Valores de status

Estados de assinatura suportados:
- `ativo`
- `em pausa`
- `cancelado`
- `vencido`

## 1. Assinaturas da lista

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscriptions`

### Objetivo

Retorna a lista paginada utilizada pela DataTable de assinaturas do Admin.

### Parâmetros de consulta

Paginação e pesquisa:
- `limit?: número`
- `offset?: número`
- `q?: string`

Classificação:
- `ordem?: string`
- `direção?: "asc" | "desc"`

Filtros:
- `status?: string | string[]`
- `id_do_cliente?: string`
- `id_produto?: string`
- `variant_id?: string`
- `next_renewal_from?: string`
- `next_renewal_to?: string`
- `is_trial?: booleano`
- `skip_next_cycle?: booleano`

### Campos de classificação suportados

Baseado em banco de dados:
- `criado_em`
- `atualizado_em`
- `estado`
- `intervalo_frequência`
- `valor_frequência`
- `próxima_renovação_em`
- `trial_ends_at`
- `skip_next_cycle`

Na memória:
- `nome_do_cliente`
- `cliente_email`
- `título_do_produto`
- `variant_title`
- `valor_desconto`

### Resposta de sucesso

Estado:
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

### Erros Comuns

- `400 dados_inválidos`
  Formato de parâmetro de consulta inválido ou valor de consulta incompatível.
- `400 dados_inválidos`
  Campo de classificação não suportado.

## 2. Obtenha detalhes da assinatura

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscrições/:id`

### Propósito

Retorna a carga completa de detalhes do administrador para uma única assinatura.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Estado:
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
- `next_renewal_at` continua sendo a âncora técnica de faturamento usada pelas renovações
- `efficient_next_renewal_at` é a próxima data de renovação projetada mostrada no Admin quando `skip_next_cycle` está ativado
- Os campos de exibição de clientes e produtos são resolvidos ao vivo a partir de registros vinculados da Medusa, quando disponíveis, com fallback para instantâneos de assinatura persistentes quando os registros vinculados estão faltando

### Erros Comuns

- `404 não_encontrado`
  A assinatura não existe.

## 2.1 Resumo da assinatura com detalhes do pedido

### Ponto final

- Método: `GET`
- Caminho: `/admin/orders/:id/subscription-summary`

### Propósito

Retorna o contexto de assinatura leve usado pelo widget `Assinatura` personalizado na página de detalhes do pedido Medusa.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Estado:
- `200 OK`

Forma quando o pedido está vinculado a uma assinatura:

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

Forma quando o pedido não está vinculado a uma assinatura:

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
- esta rota é somente leitura e intencionalmente menor que a resposta completa dos detalhes da assinatura

## 3. Pausar assinatura

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/pause`

### Propósito

Pausa uma assinatura ativa.

### Corpo da solicitação

Todos os campos são opcionais.

```json
{
  "reason": "customer requested temporary stop",
  "effective_at": "2026-04-01T00:00:00.000Z"
}
```

Validação:
- `motivo?: string`
- `efetivo_em?: string de data e hora ISO`

### Resposta de sucesso

Estado:
- `200 OK`

Resposta:
- `SubscriptionAdminDetailResponse` completo

### Erros Comuns

- `400 dados_inválidos`
  Carga útil do corpo inválida.
- `404 não_encontrado`
  A assinatura não existe.
- `409 conflito`
  A assinatura não pode ser pausada em seu estado atual.

## 4. Retomar assinatura

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/resume`

### Propósito

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
- `resume_at?: String de data e hora ISO`
- `preserve_billing_anchor?: booleano`

### Resposta de sucesso

Estado:
- `200 OK`

Resposta:
- `SubscriptionAdminDetailResponse` completo

### Erros Comuns

- `400 dados_inválidos`
  Carga útil do corpo inválida.
- `404 não_encontrado`
  A assinatura não existe.
- `409 conflito`
  A assinatura não pode ser retomada do estado atual.

## 5. Cancelar assinatura

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/cancel`

### Propósito

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
- `motivo?: string`
- `eficaz_at?: "imediatamente" | "fim_do_ciclo"`

### Resposta de sucesso

Estado:
- `200 OK`

Resposta:
- `SubscriptionAdminDetailResponse` completo

### Erros Comuns

- `400 dados_inválidos`
  Carga útil do corpo inválida.
- `404 não_encontrado`
  A assinatura não existe.
- `409 conflito`
  A assinatura não pode ser cancelada em seu estado atual.

## 6. Mudança de plano de cronograma

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/schedule-plan-change`

### Propósito

Armazena um plano futuro ou atualização de cadência em `pending_update_data`.

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
- `frequency_interval: "semana" | "mês" | "ano"`
- `frequency_value: número inteiro positivo`
- `efetivo_em?: string de data e hora ISO`

### Resposta de sucesso

Estado:
- `200 OK`

Resposta:
- `SubscriptionAdminDetailResponse` completo

Comportamento importante:
- `pending_update_data` é retornado como parte da carga útil de detalhes da assinatura atualizada
- `requested_by` é capturado internamente do ator administrador autenticado, mas não é exposto na resposta Admin DTO

### Erros Comuns

- `400 dados_inválidos`
  Carga útil do corpo inválida.
- `404 não_encontrado`
  A assinatura não existe.
- `409 conflito`
  A alteração do plano não é permitida para o estado atual da assinatura.

## 7. Atualizar endereço de entrega

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscriptions/:id/update-shipping-address`

### Propósito

Atualiza o instantâneo do endereço de envio da assinatura usado pelo administrador e pelos fluxos operacionais futuros.

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
- `primeiro_nome: string`
- `sobrenome: string`
- `empresa?: string | nulo`
- `endereço_1: string`
- `endereço_2?: string | nulo`
- `cidade: string`
- `código_postal: string`
- `província?: string | nulo`
- `código_país: string de 2 letras`
- `telefone?: string | nulo`

### Resposta de sucesso

Estado:
- `200 OK`

Resposta:
- `SubscriptionAdminDetailResponse` completo

### Erros Comuns

- `400 dados_inválidos`
  Carga útil do corpo inválida.
- `404 não_encontrado`
  A assinatura não existe.

## Notas para Consumidores

- As rotas de mutação sempre retornam a carga útil de detalhes da assinatura atualizada, em vez de um sinalizador de sucesso mínimo.
- A UI Admin usa essas respostas diretamente para atualizar a visualização detalhada após mutações.
- O ponto final da lista é a fonte da verdade para paginação, filtragem, classificação e pesquisa do DataTable.
