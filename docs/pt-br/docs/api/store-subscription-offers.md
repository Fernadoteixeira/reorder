# Ofertas de assinatura da loja

Este documento descreve o endpoint de leitura da loja virtual utilizado pelo PDP para obter dados de ofertas de assinatura do `Plans & Offers`.

## Ponto final

### `GET /store/products/:id/subscription-offer`

Retorna a oferta de assinatura vigente para um produto ou variante.

Parâmetros da consulta:
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
- `frequency_interval`
- `frequency_value`
- `label`
- `discount`

`discount` contém:
- `type`
- `value`

## Semântica da resolução

- a oferta no nível da variante tem precedência sobre a oferta no nível do produto
- uma oferta desativada ou ausente retorna `is_subscription_available: false`
- a cadência é retornada no formato canônico do backend:
  - `week`
  - `month`
  - `year`

## Objetivo

- Seletor de assinaturas do PDP
- Exibição de preços e descontos do PDP
- Validação na loja virtual da periodicidade de assinatura permitida
