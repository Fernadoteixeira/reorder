# API de planos e ofertas de administração

Este documento descreve o contrato Admin API implementado para a área `Planos e Ofertas` do plugin `Reorder`.

Pretende ser a fonte atual de verdade para:
- parâmetros de solicitação
- solicitar órgãos
- formas de resposta
- cenários de erro comuns

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminho Básico

Todas as rotas estão em:

`/admin/ofertas-de-assinatura`

## Autenticação

Todas as rotas são rotas somente para administradores.

Em termos de implementação:
- as rotas usam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio de middleware Medusa e esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de alterar os dados diretamente no manipulador de rotas

Isso mantém a API alinhada com as convenções de rota e fluxo de trabalho da Medusa.

## DTOs compartilhados

As respostas da API são baseadas nos Admin DTOs definidos em:

- `src/admin/types/plan-offer.ts`

Principais tipos de resposta:
- `PlanOfferAdminListResponse`
- `PlanOfferAdminDetailResponse`
- `PlanOfferAdminListItem`
- `PlanOfferAdminDetail`
- `PlanOfferAdminEffectiveConfigSummary`

## Valores de domínio compartilhado

### Valores de status

Status de administrador suportados:
- `habilitado`
- `desativado`

### Valores de escopo

Escopos de destino suportados:
- `produto`
- `variante`

### Valores de frequência

Intervalos de frequência suportados:
- `semana`
- `mês`
- `ano`

### Valores de Desconto

Tipos de desconto suportados:
- `porcentagem`
- `fixo`

### Valores de regras

Políticas de empilhamento suportadas:
- `permitido`
- `disallow_all`
- `disallow_subscription_discounts`

## 1. Listar ofertas de planos

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-offers`

### Propósito

Retorna a lista paginada usada pelos planos Admin e oferece DataTable.

### Parâmetros de consulta

Paginação e pesquisa:
- `limite?: número`
- `deslocamento ?: número`
- `q?: string`

Classificação:
- `ordem?: string`
- `direção?: "asc" | "desc"`

Filtros:
- `is_enabled?: booleano`
- `escopo?: "produto" | "variante"`
- `id_produto?: string`
- `variant_id?: string`
- `frequência?: "semana" | "mês" | "ano"`
- `desconto_min?: número`
- `desconto_max?: número`

### Campos de classificação suportados

Baseado em banco de dados:
- `nome`
- `escopo`
- `está_ativado`
- `criado_em`
- `atualizado_em`

Na memória:
- `estado`
- `título_do_produto`
- `variant_title`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "plan_offers": [
    {
      "id": "po_123",
      "name": "Coffee Monthly Variant Offer",
      "status": "enabled",
      "is_enabled": true,
      "target": {
        "scope": "variant",
        "product_id": "prod_123",
        "product_title": "Coffee Subscription",
        "variant_id": "variant_123",
        "variant_title": "1 kg",
        "sku": "COFFEE-1KG"
      },
      "allowed_frequencies": [
        {
          "interval": "month",
          "value": 1,
          "label": "Every month"
        }
      ],
      "discounts": [
        {
          "interval": "month",
          "frequency_value": 1,
          "type": "percentage",
          "value": 10,
          "label": "10% off"
        }
      ],
      "rules_summary": "Min 1 cycles · Stacking allowed",
      "effective_config_summary": {
        "source_scope": "variant",
        "source_offer_id": "po_123",
        "allowed_frequencies": [
          {
            "interval": "month",
            "value": 1,
            "label": "Every month"
          }
        ],
        "discounts": [
          {
            "interval": "month",
            "frequency_value": 1,
            "type": "percentage",
            "value": 10,
            "label": "10% off"
          }
        ],
        "rules": {
          "minimum_cycles": 1,
          "trial_enabled": false,
          "trial_days": null,
          "stacking_policy": "allowed"
        }
      },
      "updated_at": "2026-03-29T12:00:00.000Z"
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

## 2. Obtenha detalhes da oferta do plano

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-offers/:id`

### Propósito

Retorna a carga completa de detalhes do administrador para um único registro de origem de oferta de plano.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "plan_offer": {
    "id": "po_123",
    "name": "Coffee Monthly Variant Offer",
    "status": "enabled",
    "is_enabled": true,
    "target": {
      "scope": "variant",
      "product_id": "prod_123",
      "product_title": "Coffee Subscription",
      "variant_id": "variant_123",
      "variant_title": "1 kg",
      "sku": "COFFEE-1KG"
    },
    "allowed_frequencies": [
      {
        "interval": "month",
        "value": 1,
        "label": "Every month"
      }
    ],
    "discounts": [
      {
        "interval": "month",
        "frequency_value": 1,
        "type": "percentage",
        "value": 10,
        "label": "10% off"
      }
    ],
    "rules_summary": "Min 1 cycles · Stacking allowed",
    "effective_config_summary": {
      "source_scope": "variant",
      "source_offer_id": "po_123",
      "allowed_frequencies": [
        {
          "interval": "month",
          "value": 1,
          "label": "Every month"
        }
      ],
      "discounts": [
        {
          "interval": "month",
          "frequency_value": 1,
          "type": "percentage",
          "value": 10,
          "label": "10% off"
        }
      ],
      "rules": {
        "minimum_cycles": 1,
        "trial_enabled": false,
        "trial_days": null,
        "stacking_policy": "allowed"
      }
    },
    "created_at": "2026-03-29T10:00:00.000Z",
    "updated_at": "2026-03-29T12:00:00.000Z",
    "rules": {
      "minimum_cycles": 1,
      "trial_enabled": false,
      "trial_days": null,
      "stacking_policy": "allowed"
    },
    "metadata": {
      "source": "admin"
    }
  }
}
```

### Erros Comuns

- `404 não_encontrado`
  A oferta do plano não existe.

## 3. Criar oferta de plano

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-offers`

### Propósito

Cria uma nova oferta de plano ou atualiza uma oferta existente para o mesmo destino, dependendo do estado atual.

A mutação é apoiada por fluxo de trabalho e retorna a carga detalhada atualizada.

Este endpoint atualmente se comporta como uma mutação create-or-upsert:
- se não existir nenhum registro de origem para o destino, um novo `PlanOffer` será criado
- se já existir um registro de origem para o mesmo destino, esse registro será atualizado no local

### Corpo da solicitação

```json
{
  "name": "Coffee Monthly Variant Offer",
  "scope": "variant",
  "product_id": "prod_123",
  "variant_id": "variant_123",
  "is_enabled": true,
  "allowed_frequencies": [
    {
      "interval": "month",
      "value": 1
    }
  ],
  "discounts": [
    {
      "interval": "month",
      "frequency_value": 1,
      "type": "percentage",
      "value": 10
    }
  ],
  "rules": {
    "minimum_cycles": 1,
    "trial_enabled": false,
    "trial_days": null,
    "stacking_policy": "allowed"
  },
  "metadata": {
    "source": "admin"
  }
}
```

### Regras de campo

- `nome` é obrigatório e cortado.
- `scope` é obrigatório e deve ser `product` ou `variant`.
- `product_id` é obrigatório.
- `variant_id`:
  - deve ser omitido ou `nulo` para ofertas com escopo de produto
  - é obrigatório para ofertas com escopo de variante
- `is_enabled` é obrigatório.
- `allowed_frequencies` deve conter pelo menos uma cadência inteira positiva.
- `descontos` são opcionais.
- `regras` são opcionais.
- `metadados` é opcional.

### Resposta de sucesso

Estado:
- `200 OK`

Forma de resposta:
- `PlanOfferAdminDetailResponse`

### Erros Comuns

- `400 dados_inválidos`
  Formato de solicitação inválido.
- `400 dados_inválidos`
  A oferta com escopo de produto especifica `variant_id`.
- `400 dados_inválidos`
  A oferta com escopo variante omite `variant_id`.
- `400 dados_inválidos`
  O produto não existe.
- `400 dados_inválidos`
  A variante não pertence ao produto.
- `400 dados_inválidos`
  Definições de frequência duplicadas ou inválidas.
- `400 dados_inválidos`
  Desconto definido para uma frequência não presente em `allowed_frequencies`.
- `400 dados_inválidos`
  Faixa de desconto inválida.
- `400 dados_inválidos`
  Configuração de avaliação inválida.
- `409 conflito`
  Configuração de substituição conflitante causada por um estado persistente inconsistente, como vários registros de origem para um destino.

## 4. Oferta de plano de atualização

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-offers/:id`

### Propósito

Atualiza um registro de origem de oferta de plano existente.

A mutação é apoiada por fluxo de trabalho e retorna a carga detalhada atualizada.

### Parâmetros de caminho

- `id: string`

### Corpo da solicitação

Todos os campos são opcionais, mas pelo menos um campo deve ser fornecido.

```json
{
  "name": "Coffee Monthly Variant Offer Updated",
  "is_enabled": true,
  "allowed_frequencies": [
    {
      "interval": "month",
      "value": 2
    },
    {
      "interval": "year",
      "value": 1
    }
  ],
  "discounts": [
    {
      "interval": "month",
      "frequency_value": 2,
      "type": "percentage",
      "value": 12
    }
  ],
  "rules": {
    "minimum_cycles": 2,
    "trial_enabled": true,
    "trial_days": 14,
    "stacking_policy": "disallow_subscription_discounts"
  },
  "metadata": {
    "revision": 2
  }
}
```

### Resposta de sucesso

Estado:
- `200 OK`

Forma de resposta:
- `PlanOfferAdminDetailResponse`

### Erros Comuns

- `400 dados_inválidos`
  Corpo vazio sem campos para atualizar.
- `400 dados_inválidos`
  Formato de solicitação inválido.
- `400 dados_inválidos`
  Configuração de frequência, desconto ou regras inválida.
- `404 não_encontrado`
  A oferta do plano não existe.

## 5. Alternar oferta de plano

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-offers/:id/toggle`

### Propósito

Habilita ou desabilita uma oferta de plano existente sem atualizar seus outros campos.

A mutação é apoiada por fluxo de trabalho e retorna a carga detalhada atualizada.

### Parâmetros de caminho

- `id: string`

### Corpo da solicitação

```json
{
  "is_enabled": false
}
```

### Resposta de sucesso

Estado:
- `200 OK`

Forma de resposta:
- `PlanOfferAdminDetailResponse`

### Erros Comuns

- `400 dados_inválidos`
  Formato de solicitação inválido.
- `404 não_encontrado`
  A oferta do plano não existe.

## 6. Regras de domínio e erros comuns

A API `Planos e Ofertas` impõe diversas regras de domínio além da validação básica de solicitações.

### Regras de destino

- uma oferta com escopo de produto não pode especificar `variant_id`
- uma oferta com escopo de variante deve especificar `variant_id`
- a variante deve pertencer ao produto selecionado
- o produto alvo deve existir

### Regras de frequência

- `allowed_frequencies` não deve estar vazio
- cada frequência deve usar um valor inteiro positivo
- combinações duplicadas de `intervalo: valor` são rejeitadas

### Regras de desconto

- descontos só podem ser definidos para frequências permitidas
- descontos duplicados para a mesma frequência são rejeitados
- os descontos percentuais devem ser maiores que `0` e no máximo `100`
- descontos fixos devem ser maiores que `0`

### Semântica de objetos de regras

- se `trial_enabled` for `false`, `trial_days` deve ser `null`
- se `trial_enabled` for `true`, `trial_days` é obrigatório e deve ser um número inteiro positivo

### Leia as regras do modelo

- campos de classificação não suportados são rejeitados
- configuração eficaz usa semântica de fallback `variant > product`
- ofertas desativadas não ganham resolução de configuração efetiva

## Documentos Relacionados

- [Visão geral dos documentos](../README.md)
- [Arquitetura de Planos e Ofertas](../architecture/plan-offers.md)
- [IU de administração de planos e ofertas](../admin/plan-offers.md)
- [Teste de planos e ofertas](../testing/plan-offers.md)
- [Roteiro](../roadmap/implementation-plan.md)
