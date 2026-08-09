# Armazenar rotas de assinatura

## Objetivo

- definir a API da Loja mínima voltada para o cliente exigida pelo MVP da loja
- manter as ações de assinatura do cliente nas rotas da Loja, e não nas rotas de administração
- manter as mutações baseadas em fluxos de trabalho e orientadas por validadores

## Suporte atual para finalização de compra

Rotas da loja relacionadas ao checkout implementadas:
- `POST /store/carts/:id/sync-subscription-pricing`
- `POST /store/carts/:id/subscribe`

Objetivo atual:
- `sync-subscription-pricing` é a etapa de normalização utilizada antes da criação da sessão de pagamento e antes da conclusão da assinatura
- `subscribe` é a mutação final do checkout da assinatura e ainda rejeita carrinhos mistos

Semântica atual de preços:
- o desconto por assinatura é armazenado como um ajuste manual na linha de item do carrinho
- a identificação do ajuste utiliza `provider_id = "subscription_discount"`
- o `code` não é utilizado intencionalmente no ajuste do carrinho, para que os fluxos de promoção do Medusa não o reinterpretem como um código promocional
- o valor do desconto é armazenado com impostos incluídos e atualizado por meio dos fluxos de trabalho do carrinho antes de o pagamento prosseguir

## Rotas obrigatórias

- `GET /store/customers/me/subscriptions/:id`
  - retorna um DTO com detalhes da assinatura compatível com a loja virtual
- `POST /store/customers/me/subscriptions/:id/pause`
- `POST /store/customers/me/subscriptions/:id/resume`
- `POST /store/customers/me/subscriptions/:id/skip-next-delivery`
- `POST /store/customers/me/subscriptions/:id/change-frequency`
- `POST /store/customers/me/subscriptions/:id/change-address`
- `POST /store/customers/me/subscriptions/:id/swap-product`
- `POST /store/customers/me/subscriptions/:id/retry-payment`

## Regras de design

- use apenas `GET`, `POST` e `DELETE`
- mantenha a validação no middleware da API da loja
- mantenha as regras de negócios e as verificações de propriedade nos fluxos de trabalho
- mantenha os manipuladores de rota leves
- retorne DTOs seguros para a interface do usuário, e não modelos internos brutos

## Contratos recomendados

- `pause`
  - corpo opcional
  - retorna o resumo de status atualizado
- `resume`
  - corpo opcional
  - retorna o resumo de status atualizado
- `skip-next-delivery`
  - corpo opcional
  - retorna o `next_renewal_at` técnico inalterado
  - retorna o `effective_next_renewal_at` projetado
- `change-frequency`
  - corpo:
    - `frequency_interval`
    - `frequency_value`
- `change-address`
  - o corpo deve incluir:
    - referência ao endereço do cliente existente
    - ou um instantâneo completo do endereço de entrega
- `swap-product`
  - o corpo deve identificar a variante de destino e a cadência selecionada
- `retry-payment`
  - corpo opcional
  - retorna o resultado da nova tentativa e o estado atualizado da recuperação do pagamento

## Escopo mínimo do DTO de detalhes

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

## 6.2 DTO da loja para a vitrine

- O DTO da loja deve permanecer separado do DTO de administração
- Os formatos de resposta de administração não devem ser reutilizados automaticamente nas rotas da loja virtual
- O DTO da loja deve ser:
  - simplificado
  - voltado para o cliente
  - estável para a renderização da interface do usuário
  - livre de campos operacionais internos

## Armazenar regras de DTO

- expor apenas os campos exigidos pela experiência do usuário (UX) da conta do cliente
- evitar estado interno do fluxo de trabalho, cargas de auditoria, IDs internos de sistemas vinculados e notas do operador
- normalizar enums e objetos aninhados para uma renderização previsível no front-end
- dar preferência a campos de resumo explícitos em vez de expor a estrutura do back-end
- manter o formato da resposta estável, mesmo que os contratos de administração evoluam

## DTOs recomendados para lojas

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
  - `effective_next_renewal_at`
  - `shipping_address`
  - `payment_status`
  - `payment_recovery`
  - `active_cancellation_case`
- ação, mutação, resposta:
  - `subscription`
  - `result`
  - opcional `message`

## Campos a serem excluídos do DTO do Store

- notas exclusivas para operadores
- campos de auditoria exclusivos para administradores
- cargas brutas das etapas do fluxo de trabalho
- diagnósticos internos do provedor
- campos utilizados exclusivamente para ferramentas de recuperação de administradores
- dados de entidades vinculadas não relacionadas e desnecessários para a loja virtual

## 6.3 Resolução da oferta de assinatura para o PDP

- a loja virtual não deve codificar diretamente os dados da oferta de assinatura na página de detalhes do produto (PDP)
- os dados da oferta de assinatura devem ser obtidos de `Reorder` `Plans & Offers`
- é necessário um endpoint de leitura dedicado da Loja para a renderização da página do produto

## Rota recomendada

- `GET /store/products/:id/subscription-offer`
  - rota no escopo do produto
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

- cada frequência permitida deve exibir:
  - `frequency_interval`
  - `frequency_value`
  - rótulo de exibição opcional
- a cadência deve ser retornada no formato canônico do backend, e não apenas com os rótulos específicos da interface do usuário

## Carga útil com desconto

- a resposta relativa ao desconto deve deixar a semântica explícita:
  - `type`
  - `value`
  - `compare_at_amount`
  - `subscription_amount`
- o site de vendas não deve inferir a lógica de desconto a partir de campos de preço não relacionados

## Impacto do PDP

- O seletor de PDP deve exibir apenas as frequências retornadas por este endpoint
- A precificação dinâmica do PDP deve usar este endpoint como fonte de referência
- Sem essa rota, a loja virtual continua utilizando dados temporários do adaptador, provenientes de metadados ou da configuração local

## 6.4 Suporte a carrinhos mistos

- atualmente, o `POST /store/carts/:id/subscribe` bloqueia o carrinho misto
- se o carrinho misto for necessário para o MVP do negócio, o backend deve definir uma nova semântica de finalização de compra
- a experiência do usuário (UX) da loja virtual deve permanecer bloqueada até que essa semântica seja definida

## Decisão necessária do backend

- opção A:
  - um fluxo de finalização de compra misto gera:
    - um pedido
    - um ou mais registros de assinatura
- opção B:
  - a finalização de compra é explicitamente dividida em:
    - fluxo de finalização de compra única
    - fluxo de finalização de compra por assinatura

## Recomendação

- definir isso como uma decisão do back-end/domínio antes da implementação da interface de checkout final
- não simular o suporte a carrinhos mistos na interface do cliente enquanto o `POST /store/carts/:id/subscribe` ainda rejeitar isso

## Impacto na fachada da loja

- O carrinho e o checkout devem manter a proteção atual para carrinhos com itens mistos até que haja suporte no backend
- A lógica final do CTA e o texto do resumo dependem da semântica do backend selecionado

## Prioridade do MVP

1. `GET :id`
2. `pause`
3. `resume`
4. `change-frequency`
5. `change-address`
6. `skip-next-delivery`
7. `retry-payment`
8. `swap-product`

## Impacto na fachada da loja

- os detalhes da conta permanecem parciais enquanto `GET :id` existir
- as ações do cliente permanecem desativadas enquanto não houver rotas correspondentes na Loja
- `retry payment` e `address override` devem permanecer ocultos ou desativados sem suporte do backend
