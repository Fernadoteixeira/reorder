# Check-out de assinatura da loja

## `POST /store/carts/:id/sync-subscription-pricing`

Sincroniza o preço da assinatura em um carrinho antes da criação da sessão de pagamento ou da conclusão da assinatura.

Objetivo:
- resolver a configuração `Plans & Offers` efetiva para o item de linha de assinatura
- aplicar ou remover o ajuste manual do item de linha para a cadência selecionada
- atualize os totais do carrinho, impostos e cobrança de pagamentos antes que a finalização da compra continue

Semântica de ajuste atual:
- o ajuste do carrinho é armazenado como um ajuste manual do item de linha
- usa `provider_id = "subscription_discount"`
- usa `description = "Subscription discount"`
- está marcado como `is_tax_inclusive = true`
- o ajuste do carrinho intencionalmente não utiliza `code`, portanto os fluxos promocionais da Medusa não o tratam como um código promocional

Comportamento atual da rota:
- retorna se itens de assinatura foram encontrados
- retorna se os ajustes do carrinho foram alterados
- é seguro ligar repetidamente durante as etapas de carrinho, entrega e pagamento

## `POST /store/carts/:id/subscribe`

Conclui um carrinho de assinatura e cria o registro de assinatura vinculado.

Contrato de metadados MVP:

- `line_item.metadata.is_subscription: boolean`
- `line_item.metadata.frequency_interval: "week" | "month" | "year"`
- `line_item.metadata.frequency_value: positive integer`

Metadados opcionais do carrinho:

- `cart.metadata.purchase_mode: "subscription"`

Regras:

- os metadados do item de linha são a fonte da verdade
- se `purchase_mode` estiver presente, deve ser `"subscription"`
- carrinho misto não é compatível com MVP
- A finalização da compra de assinatura atualmente suporta exatamente `1` item de linha de assinatura com quantidade `1`
- carrinho misto ou item de assinatura ausente retorna `400`
- a conclusão padrão do carrinho Medusa para checkout único permanece inalterada
- a rota é idempotente após a conclusão do carrinho: se o pedido criado já estiver vinculado a uma assinatura, a assinatura existente será retornada

Sequenciamento de check-out:

- o preço da assinatura é sincronizado antes de `completeCartWorkflow`
- o carrinho é atualizado antes da conclusão para que a cobrança do pagamento e os totais do pedido utilizem o valor com desconto
- após a criação do pedido, o ajuste do pedido pode ser rotulado com `subscription_discount` para exibição do Medusa Admin
- quando o registro de assinatura é criado pela primeira vez, o plug-in também anexa uma entrada de log de atividades `subscription.created` para essa assinatura e registra o cliente da loja como o ator
