# API de Planos e Ofertas para Administradores

Este documento descreve o contrato da API de administração implementado para a área `Plans & Offers` do plug-in `Reorder`.

Este documento pretende ser a fonte oficial de referência atual para:
- parâmetros de solicitação
- corpos de solicitação
- formatos de resposta
- cenários comuns de erro

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminho base

Todas as rotas estão em:

`/admin/subscription-offers`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de se alterar os dados diretamente no manipulador da rota

Isso mantém a API alinhada com as convenções de rotas e fluxo de trabalho do Medusa.

## DTOs compartilhados

As respostas da API são baseadas nos DTOs de administração definidos em:

- `src/admin/types/plan-offer.ts`

Principais tipos de resposta:
- `PlanOfferAdminListResponse`
- `PlanOfferAdminDetailResponse`
- `PlanOfferAdminListItem`
- `PlanOfferAdminDetail`
- `PlanOfferAdminEffectiveConfigSummary`

## Valores compartilhados do domínio

### Valores de status

Estados de administração suportados:
- `enabled`
- `disabled`

### Valores do escopo

Escopos-alvo suportados:
- `product`
- `variant`

### Valores de frequência

Intervalos de frequência suportados:
- `week`
- `month`
- `year`

### Valores dos descontos

Tipos de desconto suportados:
- `percentage`
- `fixed`

### Valores das regras

Políticas de empilhamento suportadas:
- `allowed`
- `disallow_all`
- `disallow_subscription_discounts`

## 1. Lista de ofertas de planos

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-offers`

### Objetivo

Retorna a lista paginada utilizada pela DataTable de planos e ofertas do Admin.

### Parâmetros de consulta

Paginação e pesquisa:
- `limit?: number`
- `offset?: number`
- `q?: string`

Classificação:
- `order?: string`
- `direction?: "asc" | "desc"`

Filtros:
- `is_enabled?: boolean`
- `scope?: "product" | "variant"`
- `product_id?: string`
- `variant_id?: string`
- `frequency?: "week" | "month" | "year"`
- `discount_min?: number`
- `discount_max?: number`

### Campos de classificação compatíveis

Baseado em banco de dados:
- `name`
- `scope`
- `is_enabled`
- `created_at`
- `updated_at`

Na memória:
- `status`
- `product_title`
- `variant_title`

### Resposta de sucesso

Status:
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

### Erros comuns

- `400 invalid_data`
  Formato inválido do parâmetro de consulta ou valor de consulta não suportado.
- `400 invalid_data`
  Campo de classificação não suportado.

## 2. Veja os detalhes da oferta do plano

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-offers/:id`

### Objetivo

Retorna a carga útil completa dos detalhes administrativos de um único registro de fonte de oferta de plano.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Status:
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

### Erros comuns

- `404 not_found`
  A oferta do plano não existe.

## 3. Criar oferta de plano

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-offers`

### Objetivo

Cria uma nova oferta de plano ou atualiza uma já existente para o mesmo destinatário, dependendo do estado atual.

A mutação é apoiada por um fluxo de trabalho e retorna a carga útil de detalhes atualizada.

Atualmente, este endpoint funciona como uma mutação do tipo “create-or-upsert”:
- se não houver nenhum registro de origem para o destino, um novo `PlanOffer` é criado
- se já houver um registro de origem para o mesmo destino, esse registro é atualizado no local

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

- `name` é obrigatório e deve ser ajustado.
- `scope` é obrigatório e deve ser `product` ou `variant`.
- `product_id` é obrigatório.
- `variant_id`:
  - deve ser omitido ou ser `null` para ofertas com escopo de produto
  - é obrigatório para ofertas com escopo de variante
- `is_enabled` é obrigatório.
- `allowed_frequencies` deve conter pelo menos uma cadência inteira positiva.
- `discounts` são opcionais.
- `rules` são opcionais.
- `metadata` é opcional.

### Resposta de sucesso

Status:
- `200 OK`

Formato da resposta:
- `PlanOfferAdminDetailResponse`

### Erros comuns

- `400 invalid_data`
  Formato inválido da solicitação.
- `400 invalid_data`
  A oferta no âmbito do produto especifica `variant_id`.
- `400 invalid_data`
  A oferta no âmbito da variante omite `variant_id`.
- `400 invalid_data`
  O produto não existe.
- `400 invalid_data`
  A variante não pertence ao produto.
- `400 invalid_data`
  Definições de frequência duplicadas ou inválidas.
- `400 invalid_data`
  Desconto definido para uma frequência não presente em `allowed_frequencies`.
- `400 invalid_data`
  Intervalo de desconto inválido.
- `400 invalid_data`
  Configuração de avaliação inválida.
- `409 conflict`
  Configuração de substituição conflitante causada por um estado persistido inconsistente, como vários registros de origem para um único destino.

## 4. Oferta do plano de atualização

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-offers/:id`

### Objetivo

Atualiza um registro de fonte de oferta de plano já existente.

A mutação é apoiada por um fluxo de trabalho e retorna a carga útil de detalhes atualizada.

### Parâmetros de caminho

- `id: string`

### Corpo da solicitação

Todos os campos são opcionais, mas é necessário preencher pelo menos um deles.

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

Status:
- `200 OK`

Formato da resposta:
- `PlanOfferAdminDetailResponse`

### Erros comuns

- `400 invalid_data`
  Corpo vazio, sem campos a serem atualizados.
- `400 invalid_data`
  Formato inválido da solicitação.
- `400 invalid_data`
  Configuração inválida de frequência, desconto ou regras.
- `404 not_found`
  A oferta do plano não existe.

## 5. Alternar a oferta do plano

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-offers/:id/toggle`

### Objetivo

Ativa ou desativa uma oferta de plano existente sem atualizar seus outros campos.

A mutação é apoiada por um fluxo de trabalho e retorna a carga útil de detalhes atualizada.

### Parâmetros de caminho

- `id: string`

### Corpo da solicitação

```json
{
  "is_enabled": false
}
```

### Resposta de sucesso

Status:
- `200 OK`

Formato da resposta:
- `PlanOfferAdminDetailResponse`

### Erros comuns

- `400 invalid_data`
  Formato inválido da solicitação.
- `404 not_found`
  A oferta do plano não existe.

## 6. Regras de domínio e erros comuns

A API `Plans & Offers` impõe várias regras de domínio além da validação básica das solicitações.

### Regras do alvo

- uma oferta com escopo de produto não pode especificar `variant_id`
- uma oferta com escopo de variante deve especificar `variant_id`
- a variante deve pertencer ao produto selecionado
- o produto de destino deve existir

### Regras de frequência

- `allowed_frequencies` não deve estar vazio
- cada frequência deve ter um valor inteiro positivo
- combinações duplicadas de `interval:value` são rejeitadas

### Regras de desconto

- os descontos só podem ser definidos para frequências permitidas
- descontos duplicados para a mesma frequência são rejeitados
- os descontos percentuais devem ser maiores que `0` e, no máximo, `100`
- os descontos fixos devem ser maiores que `0`

### Semântica do objeto “Regras”

- se `trial_enabled` for igual a `false`, `trial_days` deve ser igual a `null`
- se `trial_enabled` for igual a `true`, `trial_days` é obrigatório e deve ser um número inteiro positivo

### Leia o Regulamento do Modelo

- campos de classificação não suportados são rejeitados
- a configuração efetiva utiliza a semântica de fallback de `variant > product`
- ofertas desativadas não prevalecem na resolução da configuração efetiva

## Documentos relacionados

- [Visão geral da documentação](../README.md)
- [Arquitetura de planos e ofertas](../architecture/plan-offers.md)
- [Interface de usuário administrativa de planos e ofertas](../admin/plan-offers.md)
- [Testes de planos e ofertas](../testing/plan-offers.md)
- [Roteiro](../roadmap/implementation-plan.md)
