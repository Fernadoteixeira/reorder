# Ofertas de assinatura da loja

Este documento descreve o endpoint de leitura da vitrine usado pelo PDP para resolver dados de oferta de assinatura de `Planos e Ofertas`.

## Ponto final

### `GET /loja/produtos/:id/oferta-de-assinatura`

Retorna a oferta de assinatura efetiva de um produto ou variante.

Parâmetros de consulta:
- `variant_id` opcional

Resposta:
- `subscription_offer.is_subscription_available`
- `subscription_offer.product_id`
- `subscription_offer.variant_id`
- `subscription_offer.source_offer_id`
- `subscription_offer.source_scope`
- `subscription_offer.allowed_frequencies`
- `subscription_offer.discount_semantics`
- `subscription_offer.minimum_cycles`
- `subscription_offer.trial`

## Carga útil de frequência

Cada item `allowed_frequencies` contém:
- `intervalo_frequência`
- `valor_frequência`
- `rótulo`
- `desconto`

`desconto` contém:
- `tipo`
- `valor`

## Semântica de resolução

- a oferta em nível de variante tem precedência sobre a oferta em nível de produto
- oferta desativada ou ausente retorna `is_subscription_available: false`
- a cadência é retornada em formato canônico de back-end:
  - `semana`
  - `mês`
  - `ano`

## Propósito

- Seletor de assinatura PDP
- Exibição de preços e economias de PDP
- validação na loja da cadência de assinatura permitida
