# Reordenar: UI de administração de planos e ofertas e especificações de API

Este documento cobre a etapa `2.2.1` de `documentation/implementation_plan.md`.

Objetivo:
- definir tipos de Admin DTO para `Plans & Offers`
- definir a lista/detalhe do contrato para um Administrador `DataTable`
- definir criar/editar/alternar cargas úteis para as próximas etapas de back-end
- definir um contrato UX alinhado com os padrões padrão do Medusa Admin

Artefatos produzidos nesta etapa:
- Tipos de DTO de administrador: `reorder/src/admin/types/plan-offer.ts`
- este documento como especificação para colunas, ações, filtros e formas de solicitação/resposta

Nota:
- esta é uma especificação de design para etapas posteriores, não a implementação final do módulo
- back-end, fluxos de trabalho e a rota da UI Admin serão implementados em `2.2` etapas posteriores

## 1. Suposições de design

`Plans & Offers` é uma visualização administrativa operacional usada para gerenciar a configuração da oferta de assinatura para um produto ou variante.

No nível do contrato, assumimos:
- um registro Admin representa uma oferta de assinatura configurável
- uma oferta pode ser definida para `product` ou `variant`
- `variant` tem prioridade mais alta que `product`
- O administrador deve ver o registro de origem e um resumo compacto da configuração efetiva

Seguindo as convenções da Medusa:
- a lista é baseada em `DataTable`
- endpoints de leitura retornam DTOs paginados para a tabela e página de detalhes
- mutações são expostas como rotas `POST` dedicadas
- o fluxo de criação deve usar `FocusModal`
- editar um registro existente deve usar `Drawer`

## 2. Administrador DTO

Os tipos de UI são definidos como:
- `PlanOfferAdminStatus`
- `PlanOfferScope`
- `PlanOfferFrequencyInterval`
- `PlanOfferDiscountType`
- `PlanOfferAdminTarget`
- `PlanOfferAdminFrequencyOption`
- `PlanOfferAdminDiscountValue`
- `PlanOfferAdminRules`
- `PlanOfferAdminEffectiveConfigSummary`
- `PlanOfferAdminListItem`
- `PlanOfferAdminDetail`
- `PlanOfferAdminListResponse`
- `PlanOfferAdminDetailResponse`
- `CreatePlanOfferAdminRequest`
- `UpdatePlanOfferAdminRequest`
- `TogglePlanOfferAdminRequest`

Arquivo:
- `reorder/src/admin/types/plan-offer.ts`

## 3. Formato de registro de lista

Registro mínimo da lista:
- `id`
- `name`
- `status`
- `is_enabled`
- `target`
- `allowed_frequencies`
- `discounts`
- `rules_summary`
- `effective_config_summary`
- `updated_at`

### `target`

O campo `target` agrupa os dados necessários para exibir o produto ou variante:

```ts
{
  scope: "product" | "variant"
  product_id: string
  product_title: string
  variant_id: string | null
  variant_title: string | null
  sku: string | null
}
```

Por quê:
- a tabela e a visualização detalhada devem renderizar dados comerciais sem exigir outro formato
- a UI pode renderizar um bloco `product + variant` consistente

### `allowed_frequencies`

Lista de frequências de cobrança permitidas:

```ts
Array<{
  interval: "week" | "month" | "year"
  value: number
  label: string
}>
```

Por quê:
- a UI precisa de valores técnicos e de um rótulo pronto para renderização para emblemas ou listas compactas

### `discounts`

Lista de descontos atribuídos às frequências:

```ts
Array<{
  type: "percentage" | "fixed"
  value: number
  label: string
}>
```

Nota:
- a lista DTO não mapeia descontos em um objeto `interval -> value`
- uma lista de registros é mais simples de renderizar e mais fácil de validar e classificar no lado da API/UI

### `effective_config_summary`

A lista/detalhe do administrador deve mostrar imediatamente de onde vem a configuração final:

```ts
{
  source_scope: "product" | "variant"
  source_offer_id: string
  allowed_frequencies: PlanOfferAdminFrequencyOption[]
  discounts: PlanOfferAdminDiscountValue[]
  rules: PlanOfferAdminRules | null
}
```

Por quê:
- para registros `variant`, a visualização detalhada pode mostrar a configuração final da fonte sem outra solicitação
- isso também apoiará a integração futura com `Subscriptions`

## 4. Forma detalhada

O DTO detalhado estende o registro da lista com:
- `created_at`
- `metadata`
- `rules`

A visualização detalhada deve suportar:
- revisar a configuração completa da oferta
- editar fluxo em um `Drawer`
- futuras seções de auditoria ou integração

## 5. Status

Nesta fase, o Admin precisa apenas de dois estados visuais:
- `enabled`
- `disabled`

Mapeamento da IU:
- `enabled` -> emblema verde
- `disabled` -> emblema cinza

Nota:
- o domínio ainda pode armazenar `is_enabled: boolean`
- um enum DTO separado simplifica a renderização de `StatusBadge` e os contratos de tabela

## 6. Lista `Plans & Offers`

A lista é baseada em `DataTable` e deve expor as seguintes colunas:

| Coluna | Visível por padrão | Classificável | Notas |
|---|---:|---:|---|
| `name` | sim | sim | nome da configuração |
| `target` | sim | sim | produto + variante + SKU |
| `scope` | sim | sim | `product` ou `variant` |
| `status` | sim | sim | emblema baseado em `is_enabled` |
| `allowed_frequencies` | sim | não | lista compacta ou emblemas |
| `discounts` | sim | não | resumo compacto de descontos |
| `effective_source` | sim | sim | fonte de configuração eficaz |
| `updated_at` | não | sim | coluna de ajudante técnico |

### Renderização de coluna

`name`
- gravadora principal

`target`
- primeira linha: `product_title`
- segunda linha: `variant_title` ou `All variants`
- opcional `SKU` como texto secundário

`scope`
- texto ou emblema: `Product override` / `Variant override`

`status`
- `StatusBadge`

`allowed_frequencies`
- emblemas ou texto compacto como `Every month`, `Every 2 months`

`discounts`
- emblemas ou texto compacto como `10% off`, `15% off`

`effective_source`
- indica de onde vem a configuração final:
  - `Product config`
  - `Variant config`

## 7. Ações

Listar/detalhar ações:

| Ação | Disponível quando | Confirmar | Finalidade |
|---|---|---:|---|
| `create` | sempre | não | criar uma nova oferta |
| `edit` | sempre | não | atualizar uma configuração existente |
| `enable` | quando `disabled` | sim | habilitar a oferta |
| `disable` | quando `enabled` | sim | desativar a oferta |

Notas:
- `enable` e `disable` devem ser implementados através de uma rota `toggle` com `is_enabled` explícito
- para consistência com os padrões de ação da Medusa, as mutações devem desabilitar as ações enquanto estiverem pendentes

## 8. Campos do formulário

### 8.1 Criar fluxo

O fluxo de criação deve ser implementado com `FocusModal`.

Campos:
- `name` - obrigatório
- `scope` - obrigatório, enumeração: `product | variant`
- `product_id` - obrigatório
- `variant_id` - necessário somente quando `scope = variant`
- `is_enabled` - obrigatório
- `allowed_frequencies[]` - obrigatório, pelo menos uma entrada
- `discounts[]` - opcional, no máximo um desconto por frequência
- `rules.minimum_cycles` - opcional
- `rules.trial_enabled` - necessário dentro do objeto `rules`
- `rules.trial_days` - opcional, permitido somente quando a avaliação estiver habilitada
- `rules.stacking_policy` - necessário dentro do objeto `rules`
- `metadata` - opcional, não exposto como campo principal da UI no MVP

### 8.2 Editar fluxo

O fluxo de edição deve ser implementado com `Drawer`.

Campos editáveis:
- `name`
- `is_enabled`
- `allowed_frequencies[]`
- `discounts[]`
- `rules.*`

Bloqueado após a criação:
- `scope`
- `product_id`
- `variant_id`

Por quê:
- alterar o destino em um registro existente é propenso a regressões e semanticamente mais próximo da criação de uma nova configuração

## 9. Filtros e classificação

Filtros de lista:
- `q`
- `is_enabled`
- `scope`
- `product_id`
- `variant_id`
- `frequency`

Significado do filtro:
- `q` pesquisa pelo menos `name`, `product_title`, `variant_title` e `sku`
- `is_enabled` filtra por estado de ativação
- `scope` separa configurações em nível de produto e em nível de variante
- `product_id` e `variant_id` suportam estreitamento preciso
- `frequency` filtra registros que permitem uma determinada frequência de faturamento

Classificação:
- `name`
- `scope`
- `status`
- `product_title`
- `variant_title`
- `updated_at`
- `created_at`

Contrato de consulta de lista:
- `limit`
- `offset`
- `q`
- `is_enabled`
- `scope`
- `product_id`
- `variant_id`
- `frequency`
- `order`

Nota de implementação:
- `order` deve permanecer alinhado com as convenções da lista Medusa, ou seja, um único campo com um prefixo `-` opcional para ordem decrescente

## 10. Contrato de API

### 10.1 Listar ofertas de planos

- Método: `GET`
- Caminho: `/admin/subscription-offers`

#### Parâmetros de consulta

- `limit?: number`
- `offset?: number`
- `q?: string`
- `is_enabled?: boolean`
- `scope?: "product" | "variant"`
- `product_id?: string`
- `variant_id?: string`
- `frequency?: string`
- `order?: string`

#### Resposta

```json
{
  "plan_offers": [],
  "count": 0,
  "limit": 20,
  "offset": 0
}
```

A carga corresponde a `PlanOfferAdminListResponse`.

### 10.2 Obtenha detalhes da oferta do plano

- Método: `GET`
- Caminho: `/admin/subscription-offers/:id`

#### Resposta

```json
{
  "plan_offer": {}
}
```

A carga corresponde a `PlanOfferAdminDetailResponse`.

### 10.3 Criar oferta de plano

- Método: `POST`
- Caminho: `/admin/subscription-offers`

#### Corpo

```json
{
  "name": "Coffee monthly default",
  "scope": "product",
  "product_id": "prod_123",
  "variant_id": null,
  "is_enabled": true,
  "allowed_frequencies": [
    {
      "interval": "month",
      "value": 1
    },
    {
      "interval": "month",
      "value": 2
    }
  ],
  "discounts": [
    {
      "interval": "month",
      "value": 10,
      "type": "percentage"
    }
  ],
  "rules": {
    "minimum_cycles": 3,
    "trial_enabled": false,
    "trial_days": null,
    "stacking_policy": "disallow_subscription_discounts"
  },
  "metadata": null
}
```

#### Resposta

```json
{
  "plan_offer": {}
}
```

### 10.4 Oferta do plano de atualização

- Método: `POST`
- Caminho: `/admin/subscription-offers/:id`

#### Corpo

`Partial<CreatePlanOfferAdminRequest>`

Exemplo:

```json
{
  "name": "Coffee monthly default v2",
  "allowed_frequencies": [
    {
      "interval": "month",
      "value": 1
    },
    {
      "interval": "month",
      "value": 3
    }
  ],
  "discounts": [
    {
      "interval": "month",
      "value": 12,
      "type": "percentage"
    }
  ],
  "rules": {
    "minimum_cycles": 2,
    "trial_enabled": true,
    "trial_days": 14,
    "stacking_policy": "disallow_all"
  }
}
```

#### Resposta

```json
{
  "plan_offer": {}
}
```

### 10.5 Alternar oferta de plano

- Método: `POST`
- Caminho: `/admin/subscription-offers/:id/toggle`

#### Corpo

```json
{
  "is_enabled": false
}
```

#### Resposta

```json
{
  "plan_offer": {}
}
```

## 11. Erros de domínio

As próximas etapas de back-end devem preparar um contrato de erro consistente.

Casos esperados:
- `plan_offer_not_found`
- `invalid_scope_target`
- `variant_scope_requires_variant_id`
- `product_scope_disallows_variant_id`
- `duplicate_frequency`
- `discount_out_of_range`
- `discount_frequency_not_allowed`
- `invalid_trial_configuration`
- `conflicting_override_configuration`

## 12. UX e carregamento de dados

A visualização deve seguir os padrões do Medusa Admin:

- uma rota administrativa dedicada com `DataTable`
- a consulta de exibição da lista é carregada na montagem
- uma consulta separada para o modal de criação quando produtos/variantes devem ser buscados
- uma consulta separada para a gaveta de edição quando dados auxiliares são necessários
- invalidar a consulta de lista e consulta detalhada após mutações

Estados da IU:
- carregando: spinner ou estado de carregamento `DataTable`
- vazio: estado semântico vazio com CTA para criar a primeira oferta
- erro: `Alert` com uma mensagem orientada ao domínio
- mutações pendentes: botões desabilitados e estado de envio de carregamento

## 13. Impacto nas etapas posteriores

Este contrato significa que as próximas `2.2.x` etapas devem entregar:
- um módulo de domínio que armazena o registro da oferta de origem
- consulte ajudantes para lista, detalhes e configuração eficaz
- fluxos de trabalho para criar, atualizar e alternar
- rotas administrativas em `/admin/subscription-offers`
- uma página de administração com `DataTable`, `FocusModal` para criação e `Drawer` para edição
