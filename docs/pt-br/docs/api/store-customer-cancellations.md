# Armazenar assinaturas de clientes da loja

Este documento descreve a API da Loja voltada para o cliente, atualmente disponível, para ações relacionadas a contas de assinatura.

## Pontos finais

### `GET /store/customers/me/subscriptions`

Retorna as assinaturas do cliente autenticado com dados resumidos da loja virtual:
- `id`
- `reference`
- `status`
- `product_title`
- `variant_title`
- `next_renewal_at`
- `active_cancellation_case`

Autenticação:
- é necessária a autenticação do cliente

### `GET /store/customers/me/subscriptions/:id`

Retorna dados de detalhes da assinatura adequados para exibição na loja virtual:
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

Autenticação e titularidade:
- é necessária a autenticação do cliente
- a assinatura deve pertencer ao cliente autenticado

### `POST /store/customers/me/subscriptions/:id/pause`

Suspende a assinatura do cliente autenticado por meio do fluxo de trabalho de suspensão existente.

Corpo da solicitação:

```json
{
  "reason": "Taking a short break",
  "effective_at": "2026-04-15T10:00:00.000Z"
}
```

Resposta:
- carga de dados atualizada dos detalhes da assinatura
- a carga de dados inclui `scheduled_plan_change` quando há uma atualização pendente de variante ou cadência
- a carga de dados inclui tanto `next_renewal_at` quanto o valor projetado `effective_next_renewal_at`

### `POST /store/customers/me/subscriptions/:id/resume`

Retoma a assinatura do cliente autenticado por meio do fluxo de trabalho de retomada existente.

Corpo da solicitação:

```json
{
  "resume_at": "2026-04-20T10:00:00.000Z",
  "preserve_billing_anchor": true
}
```

Resposta:
- carga de dados atualizada dos detalhes da assinatura

### `POST /store/customers/me/subscriptions/:id/change-frequency`

Agenda uma alteração na cadência da assinatura do cliente autenticado.

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
- carga de dados atualizada dos detalhes da assinatura

### `POST /store/customers/me/subscriptions/:id/change-address`

Atualiza o endereço de entrega da assinatura.

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
- carga de dados atualizada dos detalhes da assinatura

### `POST /store/customers/me/subscriptions/:id/skip-next-delivery`

Marca o próximo ciclo de renovação como ignorado.

Corpo da solicitação:
- sem corpo da solicitação

Resposta:
- carga de dados atualizada dos detalhes da assinatura

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
- utiliza o mesmo fluxo de trabalho de alteração de plano que o administrador
- a variante de destino deve pertencer ao produto da assinatura e ser permitida pelo `Plans & Offers` ativo

Resposta:
- carga de dados atualizada dos detalhes da assinatura

### `POST /store/customers/me/subscriptions/:id/retry-payment`

Executa uma nova tentativa de pagamento manual para um caso de recuperação de assinatura elegível para nova tentativa.

Corpo da solicitação:

```json
{
  "reason": "Customer requested immediate retry"
}
```

Resposta:
- carga de dados atualizada com os detalhes da assinatura
- a rota retorna `409` se não houver nenhum caso de recuperação de pagamento elegível para repetição da tentativa

### `POST /store/customers/me/subscriptions/:id/cancellation`

Inicia um processo de cancelamento da assinatura do cliente autenticado, utilizando o fluxo de trabalho de cancelamento existente.

Contexto da entrada:
- solicitação de cliente na loja virtual a partir do fluxo da lista de assinaturas

Corpo da solicitação:

```json
{
  "reason": "Too expensive right now",
  "reason_category": "price",
  "notes": "Customer started cancellation from storefront"
}
```

Autenticação e titularidade:
- é necessária a autenticação do cliente
- a assinatura deve pertencer ao cliente autenticado

Resposta:
- carga mínima `cancellation_case` com os campos `id`, `status`, `subscription_id` e o motivo enviado

## Modelo de autenticação

- todas as rotas exigem `authenticate("customer", ["session", "bearer"])`
- a titularidade é validada em relação ao `actor_id` do cliente autenticado
