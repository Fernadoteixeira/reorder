# Reorganização: Especificações dos links do módulo “Planos e ofertas”

Este documento abrange a etapa `2.2.5`, de `documentation/implementation_plan.md`.

Objetivo:
- definir as ligações entre módulos exigidas por `Plans & Offers`
- definir a direção das ligações e a semântica das relações
- definir como os dados de produtos e variantes vinculados devem ser lidos no Admin
- manter a camada de leitura alinhada com os padrões de isolamento de módulos do Medusa

Esta especificação se baseia em:
- `reorder/docs/specs/plan-offers/admin-spec.md`
- `reorder/docs/specs/plan-offers/domain-model.md`
- `reorder/docs/specs/plan-offers/data-model-override.md`
- `reorder/docs/specs/plan-offers/effective-config-semantics.md`

## 1. Links dos módulos obrigatórios

O `Plans & Offers` precisa de dois links de módulo:

- `planOffer <-> product`
- `planOffer <-> productVariant`

Essas ligações são necessárias porque:
- o registro de origem pertence ao módulo do plug-in
- a interface de usuário administrativa deve exibir os dados de exibição do produto e das variantes
- o plug-in deve permanecer isolado do Módulo de Produtos
- fluxos de trabalho futuros podem precisar de leituras autoritativas entre o módulo personalizado e o Módulo de Produtos

## 2. Um link por arquivo

Seguindo as práticas recomendadas do Medusa:
- cada link de módulo deve estar em seu próprio arquivo
- não agrupe várias chamadas de `defineLink(...)` em um único arquivo

Estrutura de arquivos recomendada:

```text
reorder/src/links/plan-offer-product.ts
reorder/src/links/plan-offer-variant.ts
```

## 3. Direção do link

A direção preferencial é:
- da entidade do módulo personalizado `planOffer`
- para as entidades do Módulo de Produtos `product` e `productVariant`

Definições recomendadas:

```ts
defineLink(PlanOfferModule.linkable.planOffer, ProductModule.linkable.product)
defineLink(PlanOfferModule.linkable.planOffer, ProductModule.linkable.productVariant)
```

Essa abordagem é preferível porque `PlanOffer` é um registro de origem personalizado associado a entidades comerciais.

Isso segue as orientações do Medusa para links do tipo associação:
- quando uma entidade personalizada estiver associada a uma entidade de comércio, defina o link do modelo personalizado para o modelo de comércio

## 4. Por que essa abordagem é a preferida

Essa orientação está alinhada com o modelo mental do recurso:
- um registro `PlanOffer` pertence a um produto ou tem como alvo um produto
- um registro `PlanOffer` pode pertencer a uma variante ou ter como alvo uma variante
- a entidade personalizada é o objeto de domínio que gerenciamos no plug-in

Além disso, mantém a consistência com os links `subscription-*` já existentes no código-fonte do plug-in.

## 5. Semântica da cardinalidade

O módulo indica uma associação direta, e não uma política de substituição.

Elas não devem ser consideradas como o local onde se aplicam:
- a exclusividade no nível do produto
- a exclusividade no nível da variante
- a precedência da configuração efetiva

Esses comportamentos pertencem a:
- o modelo de domínio
- a validação do fluxo de trabalho
- a lógica de resolução de consultas

### Semântica dos links de produtos

Um `PlanOffer` pode estar vinculado a um produto.

No nível do domínio:
- um `PlanOffer` no nível do produto deve sempre apontar para um `product_id`
- um `PlanOffer` no nível da variante também deve apontar para um `product_id`

### Semântica dos links variantes

Um `PlanOffer` pode estar vinculado a uma variante.

No nível do domínio:
- `scope = product` significa que não há nenhum destino variante
- `scope = variant` significa que deve haver um destino variante

## 6. Uso de links versus IDs escalares

O modelo deve manter ambos:
- IDs escalares na entidade `PlanOffer`
- links do módulo para o Módulo de Produtos

IDs escalares obrigatórios:
- `product_id`
- `variant_id`

Por que ambos são necessários:
- os IDs escalares são o principal mecanismo para filtragem, classificação, indexação e resolução de substituições
- os links permitem a leitura entre módulos sem comprometer o isolamento dos módulos
- isso segue o padrão prático do Medusa já utilizado na área `Subscriptions` do plugin

## 7. Estratégia de leitura do administrador

O administrador deve distinguir entre:
- leituras do registro de origem
- leituras dos dados de exibição vinculados

### Leituras do registro de origem

As leituras de registros de origem devem usar a entidade `PlanOffer` como base.

Eles são responsáveis por:
- paginação da lista
- filtragem da lista por campos de origem
- recuperação de detalhes da origem
- elaboração do resumo da configuração efetiva

### Leituras de dados de exibição vinculadas

As leituras vinculadas devem ser utilizadas para enriquecer as respostas do Admin com dados de exibição comercial, tais como:
- título do produto
- título da variante
- SKU da variante

As leituras vinculadas servem apenas para exibição.

Eles não devem substituir o registro de origem `PlanOffer` como raiz do modelo de leitura.

## 8. Regras de leitura da lista de administradores

Para a lista de administradores:
- a entidade raiz da lista deve permanecer como `PlanOffer`
- os filtros da lista devem se concentrar principalmente nos campos diretos de `PlanOffer`
- os títulos dos produtos e das variantes são campos de exibição, não campos de controle primários do modelo de dados

Filtros preferenciais para campos diretos:
- `product_id`
- `variant_id`
- `scope`
- `is_enabled`
- identificadores ou nomes dos registros de origem

Se, posteriormente, o administrador precisar filtrar por campos vinculados, como o título do produto:
- trate isso como filtragem de dados vinculados
- considere o uso de `query.index()` ou uma estratégia de resolução dedicada
- não sobrecarregue um caminho simples de leitura do registro de origem com suposições de filtragem entre módulos

## 9. Regras de leitura de detalhes administrativos

Para a visualização detalhada do administrador:
- recuperar primeiro o registro de origem `PlanOffer`
- recuperar os dados de exibição do produto vinculado e da variante como enriquecimento
- calcular o resumo da configuração efetiva separadamente da recuperação da origem

A página de detalhes deve poder exibir:
- configuração do registro de origem
- nome de exibição do produto
- nome de exibição da variante, quando relevante
- SKU da variante, quando relevante
- resumo da origem em vigor

## 10. Semântica da exibição de produtos

Quando um `PlanOffer` se refere a um escopo no nível do produto:
- O Admin deve exibir o título do produto
- A exibição da variante deve ser renderizada como `All variants` ou um rótulo equivalente no nível da fonte
- Os dados de exibição da variante vinculada não são necessários para esse registro

Quando um `PlanOffer` tem como alvo um escopo no nível da variante:
- O painel de administração deve exibir o título do produto
- O painel de administração deve exibir o título da variante
- O painel de administração deve exibir o SKU, quando disponível

Isso mantém a interface do usuário alinhada com o design do DTO já definido na especificação do Admin.

## 11. Os dados interligados não são a fonte da verdade

As informações sobre produtos e variantes provenientes de entidades vinculadas devem ser tratadas apenas como um complemento à exibição.

Eles não devem substituir:
- `product_id`
- `variant_id`
- `scope`
- resolução da configuração efetiva

Isso é importante porque:
- o título de um produto pode mudar posteriormente
- o título de uma variante ou o SKU podem mudar posteriormente
- a política de origem e a lógica de substituição devem permanecer vinculadas ao próprio registro do módulo personalizado

## 12. Orientações sobre estratégias de consulta

Estratégia de consulta recomendada para implementação futura:

### Lista de fontes/detalhes

Use a entidade `PlanOffer` como raiz da consulta de origem.

Use campos diretos para:
- filtragem
- classificação
- paginação
- suporte à validação de exclusividade

### Enriquecimento associado

Use links de módulos e leituras vinculadas para enriquecer o resultado com:
- título do produto
- título da variante
- SKU

### Filtragem entre módulos

Caso seja necessário filtrar por campos vinculados:
- use `query.index()` ou uma estratégia específica para consultas vinculadas
- não presuma que `query.graph()` possa filtrar em todos os módulos vinculados a partir da raiz de origem em todos os casos

Isso está de acordo com as limitações e as práticas recomendadas da API de consultas da Medusa.

## 13. Links válidos para configurações e módulos

A configuração efetiva não requer definições próprias de links.

Por que:
- `ProductSubscriptionConfig` é um estado derivado
- ele é resolvido a partir dos registros de origem `PlanOffer`
- os registros de produtos e variantes vinculados ainda são lidos por meio dos mesmos dois links no nível de origem

Os links oferecem suporte à configuração eficaz de forma indireta ao:
- confirmar as entidades de comércio associadas;
- habilitar a exibição de dados no Admin;
- oferecer suporte a futuros fluxos de validação e exibição

## 14. Semântica de criação e manutenção

Nas etapas posteriores do fluxo de trabalho, os links devem ser criados e mantidos de forma consistente com o registro de origem:

- ao criar um `PlanOffer` no nível do produto, crie o link do produto
- ao criar um `PlanOffer` no nível da variante, crie o link do produto e o link da variante
- ao atualizar um destino em um fluxo permitido futuro, os links devem ser atualizados de acordo
- ao excluir ou substituir links, a direção do link deve corresponder à ordem original do `defineLink(...)`

Embora a mutação de destino não faça parte do fluxo atual de edição do Admin, a política de links já deve estar explicitada.

## 15. Expectativas em relação à exclusão e ao ciclo de vida

No MVP, as ligações devem ser tratadas como associações que dão suporte às consultas de leitura e à lógica futura do ciclo de vida.

O comportamento da exclusão em cascata deve ser definido com cuidado durante a implementação.

Recomendação atual:
- não utilize o design de módulo-link para codificar implicitamente a política de exclusão da empresa
- deixe que os fluxos de trabalho e as regras de domínio cuidem do comportamento de remoção ou atualização seguro para a empresa

Isso evita um acoplamento destrutivo acidental entre a exclusão de uma entidade comercial e os dados de política do plug-in.

## 16. Recomendação final

A estratégia de links final para `Plans & Offers` deve ser:

1. Defina um link de `planOffer` para `product`.
2. Defina um link de `planOffer` para `productVariant`.
3. Mantenha um `defineLink(...)` por arquivo.
4. Mantenha `product_id` e `variant_id` como campos escalares explícitos no modelo de origem.
5. Trate os dados vinculados de produtos e variantes como enriquecimento da exibição do Admin, e não como dados de política que constituem a “fonte da verdade”.
6. Mantenha a lista/detalhes do Admin baseados em `PlanOffer`.
7. Use campos diretos para filtragem e classificação primárias.
8. Use leituras vinculadas para campos de exibição e recorra a `query.index()` somente quando for necessária uma filtragem verdadeira entre módulos.

## 17. Impacto nas etapas posteriores

Essa decisão significa que as etapas de implementação a seguir devem:
- adicionar dois arquivos de link concretos em `src/links/`
- criar e remover links nos fluxos de trabalho usando exatamente a mesma direção que `defineLink(...)`
- ler os dados de exibição do produto e da variante por meio de consultas vinculadas ou leituras complementares
- manter os DTOs de administração e os auxiliares de consulta focados na semântica do registro de origem
