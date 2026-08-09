# Reordenar: UI de administração de planos e ofertas e especificações de API

Este documento cobre a etapa `2.2.1` de `documentation/implementation_plan.md`.

Objetivo:
- definir tipos de Admin DTO para `Planos e ofertas`
- definir o contrato de lista/detalhe para um Admin `DataTable`
- definir criar/editar/alternar cargas úteis para as próximas etapas de back-end
- definir um contrato UX alinhado com os padrões padrão do Medusa Admin

Artefatos produzidos nesta etapa:
- Tipos de DTO de administrador: `reorder/src/admin/types/plan-offer.ts`
- este documento como especificação para colunas, ações, filtros e formas de solicitação/resposta

Nota:
- esta é uma especificação de design para etapas posteriores, não a implementação final do módulo
- back-end, fluxos de trabalho e a rota da UI Admin serão implementados nas etapas posteriores `2.2`

## 1. Suposições de design

`Planos e ofertas` é uma visualização administrativa operacional usada para gerenciar a configuração da oferta de assinatura para um produto ou variante.

No nível do contrato, assumimos:
- um registro Admin representa uma oferta de assinatura configurável
- uma oferta pode ser definida para `produto` ou `variante`
- `variant` tem maior prioridade que `product`
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
- `nome`
- `estado`
- `está_ativado`
- `alvo`
- `frequências_permitidas`
- `descontos`
- `resumo_regras`
- `efetivo_config_summary`
- `atualizado_em`

### `alvo`

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
- a UI pode renderizar um bloco consistente `produto + variante`

### `frequências_permitidas`

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

### `descontos`

Lista de descontos atribuídos às frequências:

```ts
Array<{
  type: "percentage" | "fixed"
  value: number
  label: string
}>
```

Nota:
- a lista DTO não mapeia descontos em um objeto `intervalo -> valor`
- uma lista de registros é mais simples de renderizar e mais fácil de validar e classificar no lado da API/UI

### `efetivo_config_summary`

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
- isso também apoiará a integração futura com `Assinaturas`

## 4. Forma detalhada

O DTO detalhado estende o registro da lista com:
- `criado_em`
- `metadados`
- `regras`

A visualização detalhada deve suportar:
- revisar a configuração completa da oferta
- editar fluxo em uma `Drawer`
- futuras seções de auditoria ou integração

## 5. Status

Nesta fase, o Admin precisa apenas de dois estados visuais:
- `habilitado`
- `desativado`

Mapeamento da IU:
- `ativado` -> emblema verde
- `desativado` -> emblema cinza

Nota:
- o domínio ainda pode armazenar `is_enabled: boolean`
- um enum DTO separado simplifica a renderização de `StatusBadge` e os contratos de tabela

## 6. Lista `Planos e Ofertas`

A lista é baseada em `DataTable` e deve expor as seguintes colunas:

| Coluna | Visível por padrão | Classificável | Notas |
|---|---:|---:|---|
| `nome` | sim | sim | nome da configuração |
| `alvo` | sim | sim | produto + variante + SKU |
| `escopo` | sim | sim | `produto` ou `variante` |
| `estado` | sim | sim | emblema baseado em `is_enabled` |
| `frequências_permitidas` | sim | não | lista compacta ou emblemas |
| `descontos` | sim | não | resumo compacto de descontos |
| `fonte_efetiva` | sim | sim | fonte de configuração eficaz |
| `atualizado_em` | não | sim | coluna de ajudante técnico |

### Renderização de coluna

`nome`
- gravadora principal

`alvo`
- primeira linha: `product_title`
- segunda linha: `variant_title` ou `Todas as variantes`
- `SKU` opcional como texto secundário

`escopo`
- texto ou emblema: `Substituição do produto` / `Substituição da variante`

`estado`
- `StatusBadge`

`frequências_permitidas`
- emblemas ou texto compacto como `Todo mês`, `Cada 2 meses`

`descontos`
- emblemas ou texto compacto como `10% de desconto`, `15% de desconto`

`fonte_efetiva`
- indica de onde vem a configuração final:
  - `Configuração do produto`
  - `Configuração da variante`

## 7. Ações

Listar/detalhar ações:

| Ação | Disponível quando | Confirmar | Finalidade |
|---|---|---:|---|
| `criar` | sempre | não | criar uma nova oferta |
| `editar` | sempre | não | atualizar uma configuração existente |
| `habilitar` | quando `desativado` | sim | habilitar a oferta |
| `desabilitar` | quando `ativado` | sim | desativar a oferta |

Notas:
- `enable` e `disable` devem ser implementados através de uma rota `toggle` com `is_enabled` explícito
- para consistência com os padrões de ação da Medusa, as mutações devem desabilitar as ações enquanto estiverem pendentes

## 8. Campos do formulário

### 8.1 Criar fluxo

O fluxo de criação deve ser implementado com `FocusModal`.

Campos:
- `nome` - obrigatório
- `escopo` - obrigatório, enum: `produto | variante`
- `id_do_produto` - obrigatório
- `variant_id` - necessário apenas quando `scope = variante`
- `is_enabled` - obrigatório
- `allowed_frequencies[]` - obrigatório, pelo menos uma entrada
- `descontos[]` - opcional, no máximo um desconto por frequência
- `rules.minimum_cycles` - opcional
- `rules.trial_enabled` - necessário dentro do objeto `rules`
- `rules.trial_days` - opcional, permitido somente quando o teste está habilitado
- `rules.stacking_policy` - necessário dentro do objeto `rules`
- `metadados` - opcional, não exposto como campo principal da UI no MVP

### 8.2 Editar fluxo

O fluxo de edição deve ser implementado com `Drawer`.

Campos editáveis:
- `nome`
- `está_ativado`
- `frequências_permitidas[]`
- `descontos[]`
- `regras.*`

Bloqueado após a criação:
- `escopo`
- `id_produto`
- `variant_id`

Por quê:
- alterar o destino em um registro existente é propenso a regressões e semanticamente mais próximo da criação de uma nova configuração

## 9. Filtros e classificação

Filtros de lista:
- `q`
- `está_ativado`
- `escopo`
- `id_produto`
- `variant_id`
- `frequência`

Significado do filtro:
- `q` pesquisa pelo menos `name`, `product_title`, `variant_title` e `sku`
- Filtros `is_enabled` por estado de ativação
- `scope` separa configurações em nível de produto e em nível de variante
- `product_id` e `variant_id` suportam estreitamento preciso
- `frequency` filtra registros que permitem uma determinada frequência de faturamento

Classificação:
- `nome`
- `escopo`
- `estado`
- `título_do_produto`
- `variant_title`
- `atualizado_em`
- `criado_em`

Contrato de consulta de lista:
- `limite`
- `deslocamento`
- `q`
- `está_ativado`
- `escopo`
- `id_produto`
- `variant_id`
- `frequência`
- `ordem`

Nota de implementação:
- `order` deve permanecer alinhado com as convenções da lista Medusa, ou seja, um único campo com um prefixo `-` opcional para ordem decrescente

## 10. Contrato de API

### 10.1 Listar ofertas de planos

- Método: `GET`
- Caminho: `/admin/subscription-offers`

#### Parâmetros de consulta

- `limite?: número`
- `deslocamento ?: número`
- `q?: string`
- `is_enabled?: booleano`
- `escopo?: "produto" | "variante"`
- `id_produto?: string`
- `variant_id?: string`
- `frequência?: string`
- `ordem?: string`

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

`Parcial<CreatePlanOfferAdminRequest>`

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
- `frequência_duplicada`
- `desconto_fora_da_faixa`
- `discount_frequency_not_allowed`
- `invalid_trial_configuration`
- `conflicting_override_configuration`

## 12. UX e carregamento de dados

A visualização deve seguir os padrões do Medusa Admin:

- uma rota Admin dedicada com `DataTable`
- a consulta de exibição da lista é carregada na montagem
- uma consulta separada para o modal de criação quando produtos/variantes devem ser buscados
- uma consulta separada para a gaveta de edição quando dados auxiliares são necessários
- invalidar a consulta de lista e consulta detalhada após mutações

Estados da IU:
- carregando: estado de carregamento giratório ou `DataTable`
- vazio: estado semântico vazio com CTA para criar a primeira oferta
- erro: `Alert` com uma mensagem orientada ao domínio
- mutações pendentes: botões desabilitados e estado de envio de carregamento

## 13. Impacto nas etapas posteriores

Este contrato significa que as próximas etapas `2.2.x` devem entregar:
- um módulo de domínio que armazena o registro da oferta de origem
- consulte ajudantes para lista, detalhes e configuração eficaz
- fluxos de trabalho para criar, atualizar e alternar
- rotas administrativas em `/admin/subscription-offers`
- uma página de administração com `DataTable`, `FocusModal` para criar e `Drawer` para editar
