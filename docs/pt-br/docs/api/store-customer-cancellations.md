# Armazenar assinaturas de clientes

Este documento descreve a API Store atual voltada para o cliente para ações de contas de assinatura.

## Pontos finais

### `GET /store/customers/me/subscriptions`

Retorna as assinaturas do cliente autenticado com dados de resumo da vitrine:
- `id`
- `reference`
- `status`
- `product_title`
- `variant_title`
- `next_renewal_at`
- `active_cancellation_case`

Autenticação:
- autenticação do cliente necessária

### `GET /store/customers/me/subscriptions/:id`

Retorna dados detalhados de assinatura seguros para loja:
- `id`
- `reference`
- `status`
- `product_title`
- `variant_title`
- `frequency_interval`
- `frequency_value`
- `next_renewal_at`
- `effective_next_renewal_at`
- `last_renewal_at`
- `shipping_address`
- `payment_status`
- `payment_provider_id`
- `payment_recovery`
- `scheduled_plan_change`
- `active_cancellation_case`

Autenticação e propriedade:
- autenticação do cliente necessária
- a assinatura deve pertencer ao cliente autenticado

### `POST /store/customers/me/subscriptions/:id/pause`

Pausa a assinatura do cliente autenticado por meio do fluxo de trabalho de pausa existente.

Corpo da solicitação:

```json
{
  "reason": "Taking a short break",
  "effective_at": "2026-04-15T10:00:00.000Z"
}
```

Resposta:
- carga útil de detalhes de assinatura atualizada
- a carga útil inclui `scheduled_plan_change` quando existe uma variante pendente ou atualização de cadência
- a carga útil inclui `next_renewal_at` e `effective_next_renewal_at` projetado

### `POST /store/customers/me/subscriptions/:id/resume`

Retoma a assinatura do cliente autenticado por meio do fluxo de trabalho de currículo existente.

Corpo da solicitação:

```json
{
  "resume_at": "2026-04-20T10:00:00.000Z",
  "preserve_billing_anchor": true
}
```

Resposta:
- carga útil de detalhes de assinatura atualizada

### `POST /store/customers/me/subscriptions/:id/change-frequency`

Agenda uma alteração de cadência para a assinatura do cliente autenticado.

Corpo da solicitação:

```json
{
  "frequency_interval": "month",
  "frequency_value": 2,
  "effective_at": "2026-05-01T10:00:00.000Z"
}
```

Notas:
- a variante atual permanece inalterada
- a cadência é validada em relação ao `Plans & Offers` ativo

Resposta:
- carga útil de detalhes de assinatura atualizada

### `POST /store/customers/me/subscriptions/:id/change-address`

Atualiza o endereço de envio da assinatura.

Corpo da solicitação:

```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "address_1": "Main Street 1",
  "city": "Copenhagen",
  "postal_code": "2100",
  "country_code": "dk"
}
```

Resposta:
- carga útil de detalhes de assinatura atualizada

### `POST /store/customers/me/subscriptions/:id/skip-next-delivery`

Marca o próximo ciclo de renovação como ignorado.

Corpo da solicitação:
- nenhum corpo de solicitação

Resposta:
- carga útil de detalhes de assinatura atualizada

### `POST /store/customers/me/subscriptions/:id/swap-product`

Agenda uma troca de produto ou variante para a assinatura.

Corpo da solicitação:

```json
{
  "variant_id": "variant_123",
  "frequency_interval": "month",
  "frequency_value": 1,
  "effective_at": "2026-05-01T10:00:00.000Z"
}
```

Notas:
- usa o mesmo fluxo de trabalho de mudança de plano que o administrador
- a variante alvo deve pertencer ao produto de assinatura e ser permitida pelo ativo `Plans & Offers`

Resposta:
- carga útil de detalhes de assinatura atualizada

### `POST /store/customers/me/subscriptions/:id/retry-payment`

Executa uma nova tentativa de pagamento manual para um caso de recuperação de assinatura elegível para nova tentativa.

Corpo da solicitação:

```json
{
  "reason": "Customer requested immediate retry"
}
```

Resposta:
- carga útil de detalhes de assinatura atualizada
- a rota retorna `409` se não houver nenhum caso de recuperação de pagamento elegível para nova tentativa

### `POST /store/customers/me/subscriptions/:id/cancellation`

Inicia um caso de cancelamento para a assinatura do cliente autenticado usando o fluxo de trabalho de cancelamento existente.

Contexto de entrada:
- solicitação do cliente da loja no fluxo da lista de assinaturas

Corpo da solicitação:

```json
{
  "reason": "Too expensive right now",
  "reason_category": "price",
  "notes": "Customer started cancellation from storefront"
}
```

Autenticação e propriedade:
- autenticação do cliente necessária
- a assinatura deve pertencer ao cliente autenticado

Resposta:
- carga útil mínima de `cancellation_case` com `id`, `status`, `subscription_id` e campos de motivo enviados

## Modelo de autenticação

- todas as rotas requerem `authenticate("customer", ["session", "bearer"])`
- a propriedade é validada em relação ao `actor_id` do cliente autenticado
