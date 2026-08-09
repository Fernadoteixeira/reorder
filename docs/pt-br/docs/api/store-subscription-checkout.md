# Finalização da compra de assinaturas na loja

## `POST /store/carts/:id/sync-subscription-pricing`

Sincroniza os preços das assinaturas no carrinho antes da criação da sessão de pagamento ou da conclusão da assinatura.

Objetivo:
- determinar a configuração efetiva de `Plans & Offers` para o item de assinatura
- aplicar ou remover o ajuste manual do item para a cadência selecionada
- atualizar os totais do carrinho, os impostos e a cobrança do pagamento antes de prosseguir com a finalização da compra

Semântica atual do ajuste:
- o ajuste do carrinho é armazenado como um ajuste manual de item de linha
- ele utiliza `provider_id = "subscription_discount"`
- ele utiliza `description = "Subscription discount"`
- ele é marcado como `is_tax_inclusive = true`
- o ajuste do carrinho não utiliza intencionalmente `code`, de modo que os fluxos de promoção do Medusa não o tratam como um código promocional

Comportamento atual da rota:
- retorna se foram encontrados itens da assinatura
- retorna se houve alterações nos valores do carrinho
- pode ser chamada repetidamente com segurança durante as etapas do carrinho, entrega e pagamento

## `POST /store/carts/:id/subscribe`

Conclui o carrinho de assinaturas e cria o registro de assinatura associado.

Contrato de metadados do MVP:

- `line_item.metadata.is_subscription: boolean`
- `line_item.metadata.frequency_interval: "week" | "month" | "year"`
- `line_item.metadata.frequency_value: positive integer`

Metadados opcionais do carrinho:

- `cart.metadata.purchase_mode: "subscription"`

Regras:

- os metadados dos itens do carrinho são a fonte de verdade
- se `purchase_mode` estiver presente, deve ser `"subscription"`
- o carrinho misto não é compatível com o MVP
- o checkout de assinatura atualmente suporta exatamente `1` itens de assinatura com quantidade `1`
- um carrinho misto ou a ausência de um item de assinatura retorna `400`
- a conclusão padrão do carrinho do Medusa para checkout único permanece inalterada
- a rota é idempotente após a conclusão do carrinho: se o pedido criado já estiver vinculado a uma assinatura, a assinatura existente é retornada

Sequência do processo de finalização da compra:

- os preços da assinatura são sincronizados antes de `completeCartWorkflow`
- o carrinho é atualizado antes da finalização, de modo que a cobrança do pagamento e os totais do pedido utilizem o valor com desconto
- após a criação do pedido, o ajuste do pedido pode ser identificado com `subscription_discount` para exibição no Medusa Admin
- quando o registro da assinatura é criado pela primeira vez, o plugin também acrescenta uma entrada de log de atividade `subscription.created` para essa assinatura e registra o cliente da loja virtual como o autor da ação
