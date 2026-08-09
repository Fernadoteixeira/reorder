# Armazenar rotas de assinatura

## Meta

- definir a API mínima da loja voltada para o cliente exigida pelo MVP da vitrine
- manter as ações de assinatura do cliente nas rotas da Loja, não nas rotas administrativas
- manter as mutações apoiadas pelo fluxo de trabalho e orientadas pelo validador

## Suporte de checkout atual

Implementamos rotas de loja relacionadas ao checkout:
- `POST /store/carts/:id/sync-subscription-pricing`
- `POST /store/carts/:id/subscribe`

Intenção atual:
- `sync-subscription-pricing` é a etapa de normalização usada antes da criação da sessão de pagamento e antes da conclusão da assinatura
- `subscribe` é a mutação final de checkout da assinatura e ainda rejeita carrinhos mistos

Semântica de preços atual:
- o desconto da assinatura é armazenado como um ajuste manual do item de linha do carrinho
- identidade de ajuste usa `provider_id = "subscription_discount"`
- `code` não é usado intencionalmente no ajuste do carrinho, portanto os fluxos promocionais da Medusa não o reinterpretam como um código promocional
- o valor do desconto é armazenado com impostos incluídos e atualizado por meio de fluxos de trabalho do carrinho antes que o pagamento continue

## Rotas obrigatórias

- `GET /store/customers/me/subscriptions/:id`
  - retorna detalhes de assinatura seguros para loja DTO
- `POST /store/customers/me/subscriptions/:id/pause`
- `POST /store/customers/me/subscriptions/:id/resume`
- `POST /store/customers/me/subscriptions/:id/skip-next-delivery`
- `POST /store/customers/me/subscriptions/:id/change-frequency`
- `POST /store/customers/me/subscriptions/:id/change-address`
- `POST /store/customers/me/subscriptions/:id/swap-product`
- `POST /store/customers/me/subscriptions/:id/retry-payment`

## Regras de design

- use apenas `GET`, `POST`, `DELETE`
- manter a validação no middleware Store API
- manter regras de negócios e verificações de propriedade em fluxos de trabalho
- mantenha os manipuladores de rotas finos
- retornar DTOs seguros para vitrines, e não modelos internos brutos

## Contratos recomendados

- `pause`
  - corpo opcional
  - retorna um resumo de status atualizado
- `resume`
  - corpo opcional
  - retorna um resumo de status atualizado
- `skip-next-delivery`
  - corpo opcional
  - retorna `next_renewal_at` técnico inalterado
  - retorna projetado `effective_next_renewal_at`
- `change-frequency`
  - corpo:
    - `frequency_interval`
    - `frequency_value`
- `change-address`
  - o corpo deve suportar:
    - referência de endereço de cliente existente
    - ou instantâneo completo do endereço de entrega
- `swap-product`
  - o corpo deve identificar a variante alvo e a cadência selecionada
- `retry-payment`
  - corpo opcional
  - retorna o resultado da nova tentativa e o estado atualizado de recuperação do pagamento

## Detalhe o escopo mínimo do DTO

- `id`
- `reference`
- `status`
- `product_title`
- `variant_title`
- `frequency_interval`
- `frequency_value`
- `next_renewal_at`
- `effective_next_renewal_at`
- `shipping_address`
- `payment_status`
- `payment_recovery`
- `active_cancellation_case`

## 6.2 Armazenar DTO para vitrine

- O DTO da loja deve permanecer separado do DTO do administrador
- os formatos de resposta do administrador não devem ser reutilizados automaticamente em rotas de vitrine
- O DTO da loja deve ser:
  - simplificado
  - voltado para o cliente
  - estável para renderização de UI
  - livre de campos de operadores internos

## Armazenar regras DTO

- expor apenas os campos exigidos pela UX da conta do cliente
- evite o estado interno do fluxo de trabalho, cargas de auditoria, IDs internos de sistemas vinculados e notas do operador
- normalizar enums e objetos aninhados para renderização de front-end previsível
- prefira campos de resumo explícitos em vez de estrutura de back-end com vazamento
- manter o formato da resposta estável, mesmo que os contratos administrativos evoluam

## DTOs de loja recomendados

- item da lista de assinaturas:
  - `id`
  - `reference`
  - `status`
  - `product_title`
  - `variant_title`
  - `next_renewal_at`
  - `effective_next_renewal_at`
  - `active_cancellation_case`
- detalhes da assinatura:
  - `id`
  - `reference`
  - `status`
  - `product_title`
  - `variant_title`
  - `frequency_interval`
  - `frequency_value`
  - `next_renewal_at`
  -`effective_next_renewal_at`
  - `shipping_address`
  - `payment_status`
  - `payment_recovery`
  - `active_cancellation_case`
- resposta de mutação de ação:
  - `subscription`
  - `result`
  - opcional `message`

## Campos a serem excluídos do Store DTO

- notas apenas para o operador
- campos de auditoria somente para administrador
- cargas brutas da etapa do fluxo de trabalho
- diagnóstico interno do fornecedor
- campos usados apenas para ferramentas de recuperação administrativa
- dados de entidades vinculadas não relacionadas que não são necessários para a vitrine

## 6.3 Resolução de oferta de assinatura para PDP

- a vitrine não deve codificar dados de oferta de assinatura no PDP
- os dados da oferta de assinatura devem vir de `Reorder` `Plans & Offers`
- um endpoint de leitura da Loja dedicado é necessário para renderização da página do produto

## Rota recomendada

- `GET /store/products/:id/subscription-offer`
  - rota com escopo de produto
- alternativa opcional:
  - `GET /store/subscription-offers?variant_id=...`

## Escopo mínimo de resposta

- `is_subscription_available`
- `product_id`
- `variant_id`
- `allowed_frequencies`
- `discount`
- `minimum_cycles`
- `trial`

## Carga útil de frequência

- cada frequência permitida deverá expor:
  - `frequency_interval`
  - `frequency_value`
  - etiqueta de exibição opcional
- a cadência deve ser retornada em formato canônico de back-end, e não em rótulos apenas para vitrines

## Carga útil com desconto

- a resposta de desconto deve tornar a semântica explícita:
  - `type`
  - `value`
  - `compare_at_amount`
  - `subscription_amount`
- a vitrine não deve inferir lógica de desconto a partir de campos de preços não relacionados

## Impacto do PDP

- O seletor PDP deve renderizar apenas as frequências retornadas por este endpoint
- A precificação dinâmica do PDP deve usar esse endpoint como fonte de verdade
- sem essa rota, a vitrine permanece nos dados temporários do adaptador de metadados ou configuração local

## 6.4 Suporte a carrinho misto

- atual `POST /store/carts/:id/subscribe` bloqueia carrinho misto
- se o carrinho misto for necessário para o MVP de negócios, o backend deverá definir uma nova semântica de checkout
- a UX da vitrine deve permanecer bloqueada até que essa semântica seja decidida

## Decisão de back-end necessária

- opção A:
  - um fluxo de checkout misto cria:
    - um pedido
    - um ou mais registros de assinatura
- opção B:
  - o checkout é explicitamente dividido em:
    - fluxo de checkout único
    - fluxo de checkout de assinatura

## Recomendação

- torne isso uma decisão de back-end/domínio antes que a interface de checkout final seja implementada
- não falsifique o suporte ao carrinho misto na vitrine enquanto `POST /store/carts/:id/subscribe` ainda o rejeita

## Impacto na vitrine

- carrinho e checkout devem manter a proteção atual do carrinho misto até que exista suporte de back-end
- a lógica final do CTA e a cópia do resumo dependem da semântica de back-end selecionada

## Prioridade MVP

1.`GET :id`
2.`pause`
3.`resume`
4.`change-frequency`
5.`change-address`
6.`skip-next-delivery`
7.`retry-payment`
8.`swap-product`

## Impacto na vitrine

- os detalhes da conta permanecem parciais até que `GET :id` exista
- as ações do cliente permanecem desativadas até que existam rotas de loja correspondentes
- `retry payment` e `address override` devem permanecer ocultos ou desativados sem suporte de back-end
