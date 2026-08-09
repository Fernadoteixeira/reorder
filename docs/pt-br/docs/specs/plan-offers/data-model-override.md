# Reorganização: Especificações do modelo de dados final e da estratégia de substituição para planos e ofertas

Este documento abrange a etapa `2.2.3` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de persistência final para `Plans & Offers`
- definir a estratégia de substituição para a configuração no nível do produto e no nível da variante
- decidir se o recurso deve usar um modelo, dois modelos ou uma estrutura híbrida
- definir as regras de resolução da configuração efetiva com prioridade explícita de `variant > product`

Esta especificação se baseia em:
- `reorder/docs/specs/plan-offers/admin-spec.md`
- `reorder/docs/specs/plan-offers/domain-model.md`

## 1. Resumo das decisões de projeto

O projeto final deve utilizar:
- uma entidade de persistência: `PlanOffer`
- um contrato de modelo lógico de leitura: `ProductSubscriptionConfig`

A estratégia final de substituição deve ser:
- a configuração no nível do produto é a camada base
- a configuração no nível da variante é uma camada de substituição
- a prioridade é sempre `variant > product`
- se não houver nenhum registro ativo no nível da variante, o sistema recorre ao registro ativo no nível do produto

Isso significa que:
- não criamos tabelas de persistência separadas para ofertas de produtos e ofertas de variantes
- não materializamos `ProductSubscriptionConfig` como uma tabela de banco de dados no MVP
- calculamos a configuração efetiva a partir dos registros de origem `PlanOffer`

## 2. Por que se prefere um determinado modelo de persistência

Modelo recomendado:
- uma entidade `PlanOffer` com:
  - `scope`
  - `product_id`
  - `variant_id`
  - `is_enabled`
  - campos de configuração em JSON

Por que essa abordagem é preferível a dois modelos separados:
- o domínio continua sendo um único conceito: a configuração de uma oferta de assinatura
- a lista/detalhes do administrador devem exibir um único tipo de registro
- os fluxos de trabalho podem validar um único formato de entidade de origem
- um único conjunto de rotas e DTOs é mais fácil de manter
- um único serviço de módulo e um único caminho de migração são mais simples

Por que essa abordagem é preferível a uma tabela `effective config` persistida:
- a configuração efetiva é um estado derivado
- duplicá-la criaria um risco de sincronização
- o MVP ainda não precisa de uma projeção materializada

## 3. Alternativas rejeitadas

### 3.1 Duas entidades de persistência

Opção rejeitada:
- `ProductPlanOffer`
- `VariantPlanOffer`

Por que isso é pior:
- duplica a lógica e a validação
- duplica o tratamento administrativo e a lógica de consulta
- complica os DTOs compartilhados
- torna a resolução de fallback mais dispersa

### 3.2 Tabela de origem mais tabela efetiva persistida

Opção rejeitada:
- tabela de origem `PlanOffer`
- tabela `ProductSubscriptionConfig` ou tabela de instantâneo

Por que isso é pior para o MVP:
- os dados derivados devem ser sincronizados após cada alteração
- é mais difícil mantê-los corretos quando ocorrem mudanças nas substituições
- complexidade desnecessária até que o desempenho exija a materialização

## 4. Modelo de persistência final

A camada de persistência deve girar em torno de uma entidade:
- `PlanOffer`

### Campos persistentes propostos

Campos simples:
- `id`
- `name`
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`

Campos JSON:
- `allowed_frequencies`
- `discount_per_frequency`
- `rules`
- `metadata`

Marcadores de tempo:
- Marcadores de tempo padrão do Medusa, como `created_at` e `updated_at`

### Semântica do escopo

- `scope = product`
  - a configuração se aplica ao produto como um todo
  - `variant_id = null`
- `scope = variant`
  - a configuração se aplica apenas a uma variante
  - `variant_id` é obrigatório
  - `product_id` também é obrigatório

## 5. Estratégia de exclusividade

Regras recomendadas de exclusividade operacional para o MVP:

- no máximo um registro `PlanOffer` para um determinado `product_id` com `scope = product`
- no máximo um registro `PlanOffer` para um determinado `variant_id` com `scope = variant`

Isso deve ser tratado como uma invariante do domínio e, idealmente, também deve ser respaldado por índices ou validação.

Por que:
- evita a resolução ambígua de substituições
- mantém a experiência do usuário (UX) do administrador determinística
- evita a necessidade de escolher “o registro vencedor” entre vários registros de origem

Implicações:
- as atualizações devem modificar o registro existente, em vez de criar registros paralelos e concorrentes para o mesmo alvo

## 6. Estratégia da “fonte da verdade”

A fonte de verdade é sempre um registro `PlanOffer`.

Existem apenas dois casos de origem válidos:
- o registro de origem no nível do produto
- o registro de origem no nível da variante

`ProductSubscriptionConfig` nunca é a fonte da verdade.
Ele é sempre calculado a partir de `PlanOffer`.

## 7. Estratégia de substituição

O modelo de substituição é intencionalmente superficial e determinístico.

### Resolução para o contexto do produto

Ao determinar a configuração de um produto sem selecionar uma variante:
- leia o `PlanOffer` no nível do produto
- se o registro existir e estiver habilitado, essa será a configuração válida
- se o registro não existir ou estiver desabilitado, não há nenhuma configuração ativa no nível do produto

### Resolução para contexto de variante

Ao resolver a configuração de uma variante:
1. procure o `PlanOffer` no nível da variante
2. se ele existir e estiver habilitado, ele prevalece
3. caso contrário, procure o `PlanOffer` no nível do produto
4. se ele existir e estiver habilitado, ele se torna a fonte alternativa
5. caso contrário, não há nenhuma configuração ativa

A prioridade continua sendo:
- registro habilitado no nível da variante
- registro habilitado no nível do produto
- sem configuração

## 8. Comportamento de registros desativados

Os registros desativados não devem impedir o uso do plano alternativo.

Significado:
- um registro desativado no nível da variante é tratado como não efetivo
- se houver um registro desativado no nível da variante e um registro ativado no nível do produto, o sistema recorre ao registro no nível do produto
- um registro desativado no nível do produto significa que a configuração básica no nível do produto está inativa

Por que esse comportamento é preferível:
- `is_enabled` deve significar “este registro não está ativo”
- registros desativados não devem funcionar como substituições forçadas
- isso mantém a lógica da configuração efetiva mais simples e intuitiva no Admin

Comportamento rejeitado:
- “A supressão da substituição de variantes desativada impede o recurso de fallback do produto”

Motivos da rejeição:
- cria uma semântica de bloqueio oculta
- torna o comportamento do Admin mais difícil de explicar
- introduz uma camada adicional de política que não é visível no contrato atual

## 9. Granularidade de substituição

A substituição ocorre no nível do registro, e não no nível do campo.

Significado:
- se houver um registro no nível da variante e ele estiver ativado, sua configuração será a configuração efetiva completa
- não mesclamos `allowed_frequencies` do produto com os descontos da variante
- não herdamos parcialmente `rules` do produto ao sobrescrever apenas um campo

Por que essa é a decisão certa para o MVP:
- modelo mental mais simples
- fluxos de trabalho mais simples
- validação mais simples
- renderização administrativa mais simples
- menos casos extremos quando os campos forem alterados posteriormente

Alternativa rejeitada:
- fusão no nível de campo entre registros de produtos e variantes

Motivos da rejeição:
- regras de conflito muito mais complexas
- mais difícil de validar
- mais difícil de explicar em detalhes no painel de administração e em relação ao comportamento futuro da loja virtual

## 10. Modelo eficaz de leitura de configuração

`ProductSubscriptionConfig` deve ser resolvido no momento da leitura.

### Forma efetiva

A configuração efetiva deve exibir:
- `product_id`
- `variant_id`
- `source_offer_id`
- `source_scope`
- `is_enabled`
- `allowed_frequencies`
- `discount_per_frequency`
- `rules`

### Regras de saída da resolução

Se a fonte no nível da variante prevalecer:
- `source_scope = variant`
- `source_offer_id = variant offer id`
- todos os campos de configuração provêm do registro no nível da variante

Se a fonte no nível do produto prevalecer:
- `source_scope = product`
- `source_offer_id = product offer id`
- todos os campos de configuração são provenientes do registro no nível do produto

Se não houver nenhuma fonte:
- `source_scope = null`
- `source_offer_id = null`
- a configuração está vazia ou é representada como inativa pela camada de consulta

## 11. Implicações administrativas

Este modelo oferece suporte direto à experiência do usuário (UX) do administrador já definida:

- a visualização em lista exibe uma linha por fonte `PlanOffer`
- a visualização detalhada exibe o registro da fonte e um resumo da configuração efetiva
- o fluxo de criação cria um registro de fonte no nível do produto ou da variante
- o fluxo de edição atualiza um registro de fonte existente
- ativar/desativar alterna a atividade do registro da fonte

Isso evita uma incompatibilidade em que o administrador edita um objeto, mas, na verdade, consulta outra tabela nos bastidores.

## 12. Implicações da consulta

Para a lista/detalhes do registro de origem:
- use a entidade `PlanOffer` diretamente

Para uma configuração eficaz:
- calcule a partir de um ou dois registros `PlanOffer`

Abordagem recomendada para consultas:
- use campos diretos do modelo para filtrar produtos/variantes
- use links apenas ao ler dados de exibição relacionados ao comércio

Isso está de acordo com as melhores práticas do Medusa:
- os dados de origem permanecem no módulo personalizado
- os dados de produtos/variantes vinculados são lidos por meio de links ou leituras complementares
- a configuração efetiva continua sendo um modelo de leitura derivado

## 13. Implicações para a validação

Essa estratégia de substituição implica as seguintes regras de validação nas etapas posteriores do fluxo de trabalho:

- um registro no nível da variante deve pertencer a um par válido de `product_id` / `variant_id`
- registros no nível do produto não podem definir `variant_id`
- registros no nível da variante devem definir `variant_id`
- é permitido apenas um registro de origem por destino
- um registro no nível da variante pode existir mesmo que não exista um registro no nível do produto
- se ambos os registros existirem, o registro no nível da variante substitui totalmente o registro no nível do produto

## 14. Implicações do índice

O modelo final sugere, no mínimo, estes índices:
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`

Estratégia recomendada de exclusividade/índice:
- restrição de exclusividade ou invariante equivalente para a meta no nível do produto:
  - `(scope = product, product_id)`
- restrição de exclusividade ou invariante equivalente para a meta no nível da variante:
  - `(scope = variant, variant_id)`

Caso os índices únicos condicionais não sejam viáveis no caminho de migração do Medusa escolhido, a garantia de exclusividade ainda deve ser aplicada na camada de fluxo de trabalho/domínio.

## 15. Implicações de integração para `Subscriptions`

Essa estratégia é compatível com a futura integração do `Subscriptions`:

- ao criar ou alterar uma assinatura, o sistema pode resolver `ProductSubscriptionConfig`
- a configuração resolvida determina quais frequências e descontos são válidos
- a assinatura pode então armazenar seu próprio instantâneo de forma independente

Isso mantém as responsabilidades bem definidas:
- `PlanOffer` controla a política da oferta de origem
- `ProductSubscriptionConfig` expõe a política efetiva
- `Subscription` armazena o instantâneo operacional selecionado

## 16. Recomendação final

O modelo de dados MVP final e a estratégia de substituição devem ser:

1. Armazene todas as configurações de origem em um único modelo `PlanOffer`.
2. Use `scope`, `product_id` e `variant_id` para distinguir destinos no nível do produto e no nível da variante.
3. Exija um registro de origem por destino.
4. Resolva `ProductSubscriptionConfig` dinamicamente a partir dos registros de origem.
5. Aplique uma regra de precedência simples: um registro `variant` ativado substitui um registro `product` ativado.
6. Trate os registros desativados como inativos, e não como substituições bloqueadoras.
7. Use a substituição de registro completo, e não a fusão no nível do campo.

## 17. Impacto nas etapas posteriores

Essa decisão significa que as próximas etapas de implementação devem:
- implementar um único módulo `planOffer`, em vez de módulos separados para produtos e variantes
- criar migrações e índices em torno de uma única tabela
- criar auxiliares de consulta que retornem DTOs de registros de origem e DTOs de configuração efetiva
- implementar fluxos de trabalho com resolução determinística de substituições
- manter a interface de usuário administrativa focada no gerenciamento de registros de origem
