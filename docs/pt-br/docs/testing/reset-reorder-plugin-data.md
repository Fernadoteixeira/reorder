# Redefinir: reordenar dados do plug-in

Este documento descreve o script de redefinição destrutivo que remove todos os dados persistentes pertencentes ao plugin `reorder`, deixando os dados principais do armazenamento Medusa intactos.

## Roteiro

- [reset-reorder-plugin-data.ts](../../scripts/reset-reorder-plugin-data.ts)

## Propósito

Use este script quando quiser retornar uma loja Medusa para um estado limpo de plugin sem excluir:
- produtos
- variantes
- clientes
- pedidos
- carrinhos
- outros registros principais da Medusa

Isso é útil para:
- redefinições de desenvolvimento local
- Limpeza de controle de qualidade entre passagens de teste do plugin
- restaurar uma loja antes de propagar novamente os cenários do plugin

## O que remove

O script exclui todas as linhas das tabelas de propriedade do plugin:
- `subscription`
- `renewal_cycle`
- `renewal_attempt`
- `dunning_case`
- `dunning_attempt`
- `cancellation_case`
- `retention_offer_event`
- `subscription_log`
- `subscription_metrics_daily`
- `plan_offer`
- `subscription_settings`

## O que não remove

O script não exclui dados principais do armazenamento Medusa, como:
- `product`
- `product_variant`
- `customer`
- `order`
- `cart`
- registros de autenticação e usuário

## Como correr

Execute o script na raiz do seu aplicativo Medusa:

```bash
cd my-medusa-store
npx medusa exec ../reorder/scripts/reset-reorder-plugin-data.ts
```

Ajuste o caminho relativo se o seu repositório de plugins `reorder` estiver localizado em outro lugar.

## Aviso importante

Este script é intencionalmente destrutivo para dados de propriedade do plugin.

Ele remove:
- Dados iniciais de controle de qualidade
- registros de plugins criados manualmente
- dados de tempo de execução gerados pelo plugin `reorder`

Não deve ser usado se você quiser preservar qualquer estado existente do plugin.
