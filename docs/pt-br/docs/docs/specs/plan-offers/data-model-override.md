# Reordenar: Modelo de dados final de planos e ofertas e especificações de estratégia de substituição

Este documento cobre a etapa `2.2.3` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de persistência final para `Planos e Ofertas`
- definir a estratégia de substituição para configuração em nível de produto e em nível de variante
- decidir se o recurso deve usar um modelo, dois modelos ou uma estrutura híbrida
- definir as regras de resolução de configuração efetiva com prioridade explícita `variant > product`

Esta especificação se baseia em:
- `reordenar/docs/specs/plan-offers/admin-spec.md`
- `reordenar/docs/specs/plan-offers/domain-model.md`

## 1. Resumo da decisão de design

O design final deve usar:
- uma entidade de persistência: `PlanOffer`
- um contrato de modelo de leitura lógico: `ProductSubscriptionConfig`

A estratégia de substituição final deve ser:
- a configuração em nível de produto é a camada base
- a configuração em nível de variante é uma camada de substituição
- a prioridade é sempre `variante > produto`
- se não existir nenhum registro ativo no nível da variante, o substituto vai para o registro ativo no nível do produto

Isso significa:
- não criamos tabelas de persistência separadas para ofertas de produtos e ofertas variantes
- não materializamos `ProductSubscriptionConfig` como uma tabela de banco de dados no MVP
- calculamos a configuração efetiva a partir dos registros de origem `PlanOffer`

## 2. Por que um modelo de persistência é preferido

Modelo recomendado:
- uma entidade `PlanOffer` com:
  - `escopo`
  - `id_produto`
  - `variant_id`
  - `está_ativado`
  - campos JSON de configuração

Por que isso é preferível a dois modelos separados:
- o domínio ainda é um conceito: uma configuração de oferta de assinatura
- A lista/detalhe do administrador deve exibir um único tipo de registro
- os fluxos de trabalho podem validar uma forma de entidade de origem
- um conjunto de rotas e DTOs é mais fácil de manter
- um serviço de módulo e um caminho de migração são mais simples

Por que isso é preferível a uma tabela de `configuração efetiva` persistente:
- configuração efetiva é estado derivado
- duplicá-lo criaria risco de sincronização
- MVP ainda não precisa de projeção materializada

## 3. Alternativas rejeitadas

### 3.1 Duas entidades de persistência

Opção rejeitada:
- `ProductPlanOffer`
- `VariantPlanOffer`

Por que é pior:
- duplica lógica e validação
- duplica o manuseio do administrador e a lógica de consulta
- complica DTOs compartilhados
- torna a resolução alternativa mais dispersa

### 3.2 Tabela de origem mais tabela efetiva persistente

Opção rejeitada:
- Tabela de origem `PlanOffer`
- Tabela `ProductSubscriptionConfig` ou tabela de instantâneo

Por que é pior para o MVP:
- os dados derivados devem ser sincronizados após cada mutação
- mais difícil de manter correto quando as substituições mudam
- complexidade desnecessária até que o desempenho exija materialização

## 4. Modelo de persistência final

A camada de persistência deve girar em torno de uma entidade:
- `PlanoOferta`

### Campos persistentes propostos

Campos simples:
- `id`
- `nome`
- `escopo`
- `id_produto`
- `variant_id`
- `está_ativado`

Campos JSON:
- `frequências_permitidas`
- `desconto_por_frequência`
- `regras`
- `metadados`

Carimbos de data e hora:
- Carimbos de data e hora padrão da Medusa, como `created_at` e `updated_at`

### Semântica do escopo

- `escopo = produto`
  - a configuração se aplica ao produto como um todo
  - `variant_id = nulo`
- `escopo = variante`
  - a configuração se aplica apenas a uma variante
  - `variant_id` é obrigatório
  - `product_id` também é obrigatório

## 5. Estratégia de exclusividade

Regras de exclusividade operacional recomendadas para MVP:

- no máximo um registro `PlanOffer` para um determinado `product_id` com `scope = product`
- no máximo um registro `PlanOffer` para um determinado `variant_id` com `scope = variante`

Isto deve ser tratado como um domínio invariante e, idealmente, também apoiado por índices ou validação.

Por quê:
- evita resolução de substituição ambígua
- mantém o Admin UX determinístico
- evita ter que escolher “o registro vencedor” entre vários registros de origem

Implicação:
- as atualizações devem modificar o registro existente em vez de criar registros concorrentes paralelos para o mesmo alvo

## 6. Estratégia da fonte da verdade

A fonte da verdade é sempre um registro `PlanOffer`.

Existem apenas dois casos de origem válidos:
- o registro de origem no nível do produto
- o registro de origem no nível da variante

`ProductSubscriptionConfig` nunca é a fonte da verdade.
É sempre calculado a partir de `PlanOffer`.

## 7. Substituir estratégia

O modelo de substituição é intencionalmente superficial e determinístico.

### Resolução para contexto do produto

Ao resolver a configuração de um produto sem selecionar uma variante:
- leia o `PlanOffer` no nível do produto
- se o registro existir e estiver habilitado, é a configuração efetiva
- se o registro não existir ou estiver desabilitado, não há configuração ativa no nível do produto

### Resolução para contexto de variante

Ao determinar a configuração para uma variante:
1. procure o `PlanOffer` no nível da variante
2. se ele existir e estiver ativado, ele prevalece
3. caso contrário, procure o `PlanOffer` no nível do produto
4. se ele existir e estiver ativado, ele se torna a fonte alternativa
5. caso contrário, não há nenhuma configuração ativa

A prioridade continua sendo:
- registro habilitado no nível da variante
- registro habilitado no nível do produto
- sem configuração

## 8. Comportamento do registro desativado

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
- não combinamos `allowed_frequencies` do produto com os descontos da variante
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

A configuração válida deve conter:
- `product_id`
- `variant_id`
- `source_offer_id`
- `source_scope`
- `is_enabled`
- `allowed_frequencies`
- `discount_per_frequency`
- `rules`

### Regras de saída da resolução

Se a fonte no nível da variante for priorizada:
- `source_scope = variant`
- `source_offer_id = id da oferta da variante`
- todos os campos de configuração provêm do registro no nível da variante

Se a fonte no nível do produto for priorizada:
- `source_scope = product`
- `source_offer_id = id da oferta do produto`
- todos os campos de configuração são provenientes do registro no nível do produto

Se não houver nenhuma fonte:
- `source_scope = null`
- `source_offer_id = null`
- a configuração está vazia ou é representada como inativa pela camada de consulta

## 11. Implicações administrativas

Este modelo oferece suporte direto à experiência do usuário (UX) do administrador já definida:

- a visualização em lista exibe uma linha por fonte `PlanOffer`
- a visualização detalhada exibe o registro da fonte, além de um resumo da configuração em vigor
- o fluxo de criação cria um registro de fonte no nível do produto ou da variante
- o fluxo de edição atualiza um registro de fonte existente
- a opção de ativar/desativar alterna a atividade do registro da fonte

Isso evita uma incompatibilidade em que o administrador edita um objeto, mas, na verdade, consulta outra tabela nos bastidores.

## 12. Implicações da consulta

Para a lista/detalhes do registro de origem:
- use a entidade `PlanOffer` diretamente

Para uma configuração eficaz:
- faça o cálculo a partir de um ou dois registros `PlanOffer`

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

O modelo final sugere pelo menos estes índices:
- `escopo`
- `id_produto`
- `variant_id`
- `está_ativado`

Estratégia recomendada de exclusividade/índice:
- restrição única ou invariante equivalente para meta em nível de produto:
  - `(escopo = produto, product_id)`
- restrição exclusiva ou invariante equivalente para destino em nível de variante:
  - `(escopo = variante, variante_id)`

Se os índices exclusivos condicionais não forem práticos no caminho de migração Medusa escolhido, a garantia de exclusividade ainda deverá ser aplicada na camada de fluxo de trabalho/domínio.

## 15. Implicações de integração para `Assinaturas`

Esta estratégia é compatível com a futura integração de `Assinaturas`:

- ao criar ou alterar uma assinatura, o sistema pode resolver `ProductSubscriptionConfig`
- a configuração resolvida determina quais frequências e descontos são válidos
- a assinatura pode então armazenar seu próprio instantâneo de forma independente

Isso mantém as responsabilidades claras:
- `PlanOffer` controla a política de oferta de origem
- `ProductSubscriptionConfig` expõe a política efetiva
- `Subscription` armazena o instantâneo operacional selecionado

## 16. Recomendação final

O modelo de dados final do MVP e a estratégia de substituição devem ser:

1. Armazene todas as configurações de origem em um modelo `PlanOffer`.
2. Use `scope`, `product_id` e `variant_id` para distinguir alvos em nível de produto e em nível de variante.
3. Aplique um registro de origem por destino.
4. Resolva `ProductSubscriptionConfig` dinamicamente a partir dos registros de origem.
5. Aplicar precedência simples: o registro `variant` habilitado substitui o registro `produto` habilitado.
6. Trate os registros desativados como inativos e não como substituições de bloqueio.
7. Use a substituição completa do registro, não a mesclagem em nível de campo.

## 17. Impacto nas etapas posteriores

Esta decisão significa que os próximos passos de implementação devem:
- implementar um módulo `planOffer`, não módulos separados de produto/variante
- construir migrações e índices em torno de uma tabela
- construir auxiliares de consulta que retornem DTOs de registro de origem e DTOs de configuração eficazes
- implementar fluxos de trabalho com resolução de substituição determinística
- mantenha a interface do administrador centrada no gerenciamento de registros de origem
