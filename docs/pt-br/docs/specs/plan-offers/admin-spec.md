# Reorder: Especificações da interface de usuário e da API de administração de planos e ofertas

Este documento abrange a etapa `2.2.1`, de `documentation/implementation_plan.md`.

Objetivo:
- definir os tipos de DTO do Admin para `Plans & Offers`
- definir o contrato de lista/detalhes para um `DataTable` do Admin
- definir as cargas de dados de criação/edição/ativação/desativação para as próximas etapas do backend
- definir um contrato de UX alinhado aos padrões padrão do Medusa Admin

Artefatos produzidos nesta etapa:
- Tipos de DTO de administração: `reorder/src/admin/types/plan-offer.ts`
- este documento como especificação para colunas, ações, filtros e formatos de solicitação/resposta

Observação:
- esta é uma especificação de projeto para etapas posteriores, não a implementação final do módulo
- o backend, os fluxos de trabalho e a rota da interface de usuário administrativa serão implementados em etapas posteriores `2.2`

## 1. Premissas de projeto

`Plans & Offers` é uma visualização operacional do Admin utilizada para gerenciar a configuração da oferta de assinatura de um produto ou de uma variante.

No âmbito do contrato, partimos dos seguintes pressupostos:
- um registro de Admin representa uma oferta de assinatura configurável
- uma oferta pode ser definida para `product` ou `variant`
- `variant` tem prioridade maior do que `product`
- o Admin deve visualizar tanto o registro de origem quanto um resumo compacto da configuração efetiva

Seguindo as convenções do Medusa:
- a lista se baseia em `DataTable`
- os endpoints de leitura retornam DTOs paginados para a tabela e a página de detalhes
- as mutações são expostas como rotas dedicadas `POST`
- o fluxo de criação deve usar `FocusModal`
- a edição de um registro existente deve usar `Drawer`

## 2. DTO de administração

Os tipos de interface do usuário são definidos como:
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

## 3. Formato dos registros da lista

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

O campo `target` agrupa os dados necessários para exibir o produto ou a variante:

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

Por que:
- a tabela e a visualização detalhada devem exibir os dados de comércio sem a necessidade de outra forma
- a interface do usuário pode exibir um único bloco `product + variant` consistente

### `allowed_frequencies`

Lista das frequências de cobrança permitidas:

```ts
Array<{
  interval: "week" | "month" | "year"
  value: number
  label: string
}>
```

Por que:
- a interface do usuário precisa tanto dos valores técnicos quanto de um rótulo pronto para renderização para emblemas ou listas compactas

### `discounts`

Lista de descontos atribuídos às frequências:

```ts
Array<{
  type: "percentage" | "fixed"
  value: number
  label: string
}>
```

Observação:
- o DTO de lista não mapeia descontos para um objeto `interval -> value`
- uma lista de registros é mais simples de renderizar e mais fácil de validar e classificar tanto na API quanto na interface do usuário

### `effective_config_summary`

A lista/detalhes de administração devem indicar imediatamente de onde vem a configuração final:

```ts
{
  source_scope: "product" | "variant"
  source_offer_id: string
  allowed_frequencies: PlanOfferAdminFrequencyOption[]
  discounts: PlanOfferAdminDiscountValue[]
  rules: PlanOfferAdminRules | null
}
```

Por que:
- para registros `variant`, a visualização detalhada pode exibir a configuração final da fonte sem a necessidade de outra solicitação
- isso também facilitará a integração futura com `Subscriptions`

## 4. Forma dos detalhes

O DTO de detalhes amplia o registro da lista com:
- `created_at`
- `metadata`
- `rules`

A visualização detalhada deve permitir:
- revisar a configuração completa da oferta
- fluxo de edição em um `Drawer`
- seções futuras de auditoria ou integração

## 5. Status

Nesta fase, o Admin precisa apenas de dois estados visuais:
- `enabled`
- `disabled`

Mapeamento da interface do usuário:
- `enabled` -> emblema verde
- `disabled` -> emblema cinza

Observação:
- o domínio ainda pode armazenar `is_enabled: boolean`
- uma enumeração DTO separada simplifica a renderização de `StatusBadge` e os contratos de tabela

## 6. Lista `Plans & Offers`

A lista é baseada em `DataTable` e deve apresentar as seguintes colunas:

| Coluna | Visível por padrão | Podem ser ordenadas | Observações |
|---|---:|---:|---|
| `name` | sim | sim | nome da configuração |
| `target` | sim | sim | produto + variante + SKU |
| `scope` | sim | sim | `product` ou `variant` |
| `status` | sim | sim | emblema com base em `is_enabled` |
| `allowed_frequencies` | sim | não | lista compacta ou emblemas |
| `discounts` | sim | não | resumo compacto de descontos |
| `effective_source` | sim | sim | fonte de configuração efetiva |
| `updated_at` | não | sim | coluna auxiliar técnica |

### Exibição de colunas

`name`
- principal gravadora

`target`
- primeira linha: `product_title`
- segunda linha: `variant_title` ou `All variants`
- opcional: `SKU` como texto secundário

`scope`
- texto ou emblema: `Product override` / `Variant override`

`status`
- `StatusBadge`

`allowed_frequencies`
- emblemas ou textos concisos, como `Every month`, `Every 2 months`

`discounts`
- emblemas ou textos concisos, como `10% off`, `15% off`

`effective_source`
- indica de onde vem a configuração final:
  - `Product config`
  - `Variant config`

## 7. Ações

Ações da lista/detalhes:

| Ação | Disponível quando | Confirmar | Finalidade |
|---|---|---:|---|
| `create` | sempre | não | criar uma nova oferta |
| `edit` | sempre | não | atualizar uma configuração existente |
| `enable` | quando `disabled` | sim | ativar a oferta |
| `disable` | quando `enabled` | sim | desativar a oferta |

Notas:
- `enable` e `disable` devem ser implementados por meio de uma rota `toggle` com `is_enabled` explícito
- para manter a consistência com os padrões de ação do Medusa, as mutações devem desativar as ações enquanto estiverem pendentes

## 8. Campos de formulário

### 8.1 Criar fluxo

O fluxo de criação deve ser implementado com `FocusModal`.

Campos:
- `name` - obrigatório
- `scope` - obrigatório, enumeração: `product | variant`
- `product_id` - obrigatório
- `variant_id` - obrigatório apenas quando `scope = variant`
- `is_enabled` - obrigatório
- `allowed_frequencies[]` - obrigatório, pelo menos uma entrada
- `discounts[]` - opcional, no máximo um desconto por frequência
- `rules.minimum_cycles` - opcional
- `rules.trial_enabled` - obrigatório dentro do objeto `rules`
- `rules.trial_days` - opcional, permitido somente quando o período de teste estiver ativado
- `rules.stacking_policy` - obrigatório dentro do objeto `rules`
- `metadata` - opcional, não exibido como um campo principal da interface do usuário no MVP

### 8.2 Fluxo de edição

O fluxo de edição deve ser implementado com `Drawer`.

Campos editáveis:
- `name`
- `is_enabled`
- `allowed_frequencies[]`
- `discounts[]`
- `rules.*`

Bloqueados após a criação:
- `scope`
- `product_id`
- `variant_id`

Por que:
- alterar o destino em um registro existente está sujeito a regressões e, semanticamente, é mais semelhante à criação de uma nova configuração

## 9. Filtros e classificação

Filtros da lista:
- `q`
- `is_enabled`
- `scope`
- `product_id`
- `variant_id`
- `frequency`

Significado do filtro:
- `q` pesquisa pelo menos `name`, `product_title`, `variant_title` e `sku`
- `is_enabled` filtra por estado de ativação
- `scope` separa as configurações no nível do produto das configurações no nível da variante
- `product_id` e `variant_id` permitem um refinamento preciso
- `frequency` filtra registros que permitem uma determinada frequência de cobrança

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
- `order` deve seguir as convenções de lista do Medusa, ou seja, um único campo com um prefixo opcional `-` para ordenação decrescente

## 10. Contrato de API

### 10.1 Ofertas de planos da List

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

A carga útil corresponde a `PlanOfferAdminListResponse`.

### 10.2 Obter detalhes da oferta do plano

- Método: `GET`
- Caminho: `/admin/subscription-offers/:id`

#### Resposta

```json
{
  "plan_offer": {}
}
```

A carga útil corresponde a `PlanOfferAdminDetailResponse`.

### 10.3 Criar uma oferta de plano

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

### Oferta do plano de atualização 10.4

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

### 10.5 Alternar oferta do plano

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

As próximas etapas no backend devem estabelecer um contrato de erros consistente.

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

## 12. Experiência do usuário e carregamento de dados

A visualização deve seguir os padrões do Medusa Admin:

- uma rota dedicada ao administrador com `DataTable`
- a consulta de exibição da lista é carregada no momento da montagem
- uma consulta separada para o modal de criação, quando for necessário buscar produtos/variantes
- uma consulta separada para a gaveta de edição, quando forem necessários dados auxiliares
- invalidar a consulta da lista e a consulta de detalhes após as alterações

Estados da interface do usuário:
- carregando: indicador de carregamento ou estado de carregamento `DataTable`
- vazio: estado semântico de vazio com um CTA para criar a primeira oferta
- erro: `Alert` com uma mensagem específica do domínio
- alterações pendentes: botões desativados e estado de carregamento ao enviar

## 13. Impacto nas etapas posteriores

Este contrato estabelece que as próximas `2.2.x` etapas devem fornecer:
- um módulo de domínio que armazene o registro da oferta de origem
- auxiliares de consulta para lista, detalhes e configuração efetiva
- fluxos de trabalho para criação, atualização e alternância
- rotas de administração em `/admin/subscription-offers`
- uma página de administração com `DataTable`, `FocusModal` para criação e `Drawer` para edição
