# Arquitetura de Planos e Ofertas (Plans & Offers)

Este documento descreve a arquitetura atual da área de `Planos e Ofertas` (`Plans & Offers`) no plugin `Reorder`.

O foco está no sistema implementado em produção, e não nas premissas iniciais de design.

## Objetivo

A área de `Planos e Ofertas` fornece a camada de configuração comercial para produtos habilitados para assinatura no painel administrativo (Admin).

A implementação atual suporta:
- Configuração de ofertas de assinatura em nível de produto (`product-level`)
- Configuração de ofertas de assinatura em nível de variante (`variant-level`)
- Definição de frequências de faturamento permitidas (semanal, mensal, anual)
- Definição de regras e percentuais de desconto por frequência
- Definição de regras adicionais de oferta, como política de períodos de teste (`trial`) e política de acúmulo de descontos (`stacking`)
- Listagem, inspeção, criação, edição e alternância de ativação (`toggle`) de ofertas no Admin
- Resolução de configuração efetiva de assinatura com prioridade `variante > produto`
- Aplicação e validação de ofertas ativas durante fluxos de alteração de plano de assinaturas

## Visão Geral da Arquitetura

A implementação está dividida em quatro camadas principais:

1. **Módulo de Domínio (`domain module`)**
2. **Workflows (`workflows`)**
3. **API Admin (`admin API`)**
4. **Interface do Admin (`admin UI`)**

Cada camada possui uma responsabilidade bem definida:

- O **módulo de domínio** é proprietário do modelo de dados `plan_offer` e da persistência no banco.
- Os **workflows** gerenciam as mutações, normalização de dados e validações de regras de negócio.
- A **API Admin** expõe rotas de leitura e escrita seguras para os consumidores do painel.
- A **UI do Admin** renderiza a página de gestão, modais de criação (`FocusModal`) e gavetas de edição (`Drawer`).

---

## 1. Módulo de Domínio

O módulo customizado `planOffer` é a fonte proprietária da configuração comercial de assinaturas.

Ele contém:
- Tipos de domínio estritos (`types/index.ts`)
- Modelo de dados relacional `PlanOffer` (`models/plan-offer.ts`)
- Serviço do módulo (`service.ts`)
- Utilitários para modelos de leitura e resolução de configuração efetiva (`utils/`)

### Decisão Principal de Design:
- A única fonte de verdade persistida em banco é a entidade `PlanOffer`.
- A configuração efetiva de assinatura é calculada dinamicamente no momento da leitura (`read-time`).
- Não é utilizado nenhum modelo persistido redundante para configurações resolvidas.

Isso mantém o domínio simples, conciso e com comportamento de contingência (*fallback*) totalmente explícito.

---

## 2. Modelo de Dados

O modelo `plan_offer` armazena:
- Campos de identidade e direcionamento (produto vs. variante)
- Estado de ativação (`is_enabled`)
- Matriz de frequências permitidas
- Configuração de descontos por frequência
- Regras adicionais e metadados

### Campos Principais:
- `id`: Identificador único da oferta (ex: `po_01...`)
- `name`: Nome identificador da oferta (ex: `Plano Mensal Café Especial`)
- `scope`: Escopo de aplicação (`product` ou `variant`)
- `product_id`: ID do produto Medusa vinculado
- `variant_id`: ID da variante Medusa vinculada (nulo se o escopo for `product`)
- `is_enabled`: Flag booleana indicando se a oferta está ativa
- `allowed_frequencies`: Array de objetos contendo intervalo e valor (ex: `[{ interval: "month", value: 1 }]`)
- `frequency_intervals`: Array simples de strings com os tipos de intervalo (ex: `["month"]`) para otimizar filtros
- `discount_per_frequency`: Matriz de descontos com tipo (`percentage` ou `fixed`) e valor
- `rules`: Objeto contendo ciclos mínimos (`minimum_cycles`), regras de teste (`trial_enabled`, `trial_days`) e política de acúmulo (`stacking_policy`)
- `metadata`: Metadados customizados adicionais

### Escopos de Aplicação (`Scope Model`):
- **`product`**: Registros com escopo de produto aplicam-se a todas as variantes do produto por padrão.
- **`variant`**: Registros com escopo de variante aplicam-se exclusivamente à variante específica e possuem precedência total sobre a configuração do produto.

### Estratégia de Indexação e Unicidade:
O banco de dados possui restrições de unicidade para evitar duplicidade de ofertas ativas:
- No máximo 1 oferta com escopo de produto por produto.
- No máximo 1 oferta com escopo de variante por variante.

---

## 3. Semântica de Configuração Efetiva (`Effective Config`)

A área de `Planos e Ofertas` distingue três conceitos:
1. **Registros fontes persistidos** (`PlanOffer`)
2. **Candidatos de contingência** (ofertas em nível de produto)
3. **Configuração efetiva resolvida** (`ProductSubscriptionConfig`)

### Ordem Estrita de Prioridade:
1. Oferta ativa com escopo de **variante** (`variant-scoped`)
2. Oferta ativa com escopo de **produto** (`product-scoped`)
3. Resultado inativo ou vazio

Portanto, a resolução adota a regra: **`variante > produto`**.

### Semântica de Substituição Completa (*No Merge*):
A resolução adota semântica de registro integral. Se uma oferta em nível de variante vence a resolução, todos os campos efetivos (frequências, descontos, regras) provêm integralmente dela, sem mesclar com a oferta do produto pai.

### Semântica de Resultado Inativo:
Se não existir nenhuma oferta ativa, o resultado retornado é explícito:
- `source_offer_id = null`
- `source_scope = null`
- `is_enabled = false`
- `allowed_frequencies = []`
- `discount_per_frequency = []`
- `rules = null`

---

## 4. Fluxo de Leitura (Read Path)

O fluxo de leitura é otimizado para a renderização da tabela do Admin:

1. A interface Admin envia parâmetros de consulta para `GET /admin/subscription-offers`.
2. A rota valida e normaliza os parâmetros de busca, ordenação e filtros.
3. A função `listAdminPlanOffers(...)` consulta os registros via grafo do Medusa.
4. Os dados de exibição do produto e da variante são enriquecidos.
5. Cada item é mapeado para o DTO de listagem do Admin, incluindo o resumo da configuração efetiva.

### Resolução como Utilitário Reutilizável:
A lógica de resolução de configuração efetiva (`resolveProductSubscriptionConfig`) foi implementada como um utilitário do módulo, permitindo seu reuso pelo Admin, workflows de checkout, validação de troca de plano e rotas da Storefront.

---

## 5. Workflows e Fluxo de Escrita

Todas as mutações são governadas por três workflows dedicados:
- `create-or-upsert-plan-offer`: Cria ou atualiza ofertas validando unicidade
- `update-plan-offer`: Atualiza frequências, descontos e regras
- `toggle-plan-offer`: Ativa ou desativa rapidamente uma oferta

### Validações de Regras de Negócio:
- Validação de correspondência entre produto e variante informados
- Garantia de que a variante pertence de fato ao produto selecionado
- Valores de frequência estritamente positivos
- Proibição de combinações duplicadas de frequência
- Validação de que descontos só são cadastrados para frequências permitidas
- Limites de percentual (0 a 100%) para descontos do tipo `percentage`

---

## 6. Integração com Assinaturas (`Subscriptions`)

`Planos e Ofertas` atua como a camada de conformidade comercial para o módulo `Subscriptions`.

O ponto principal de integração em tempo de execução ocorre no fluxo de alteração de plano (`schedule-plan-change`):
- O workflow de assinatura resolve a configuração efetiva para a variante solicitada.
- O workflow verifica se existe uma oferta ativa.
- O workflow confirma se a nova frequência solicitada é permitida pela oferta ativa.
- Caso a alteração viole as regras da oferta, a mutação é bloqueada e retorna um erro 400 descritivo.

Desta forma, `Planos e Ofertas` dita a política comercial, enquanto `Subscriptions` gerencia o ciclo de vida e a cobrança.
