# Reordenar: especificações de links do módulo de planos e ofertas

Este documento cobre a etapa `2.2.5` de `documentation/implementation_plan.md`.

Objetivo:
- definir os links dos módulos exigidos por `Planos e Ofertas`
- definir a direção do link e a semântica do relacionamento
- definir como os dados de produtos e variantes vinculados devem ser lidos no Admin
- mantenha a camada de leitura alinhada com os padrões de isolamento do módulo Medusa

Esta especificação se baseia em:
- `reordenar/docs/specs/plan-offers/admin-spec.md`
- `reordenar/docs/specs/plan-offers/domain-model.md`
- `reordenar/docs/specs/plan-offers/data-model-override.md`
- `reorder/docs/specs/plan-offers/efficient-config-semantics.md`

## 1. Links de módulos necessários

`Planos e Ofertas` precisa de dois links de módulo:

- `planOffer <-> produto`
- `planOffer <-> productVariant`

Esses links são necessários porque:
- o registro de origem pertence ao módulo plugin
- a UI Admin deve renderizar dados de exibição de produtos e variantes
- o plugin deve permanecer isolado do Módulo do Produto
- fluxos de trabalho futuros podem precisar de leituras autorizadas no módulo personalizado e no módulo do produto

## 2. Um link por arquivo

Seguindo as melhores práticas da Medusa:
- cada link de módulo deve estar em seu próprio arquivo
- não agrupe múltiplas chamadas `defineLink(...)` em um arquivo

Estrutura de arquivo recomendada:

```text
reorder/src/links/plan-offer-product.ts
reorder/src/links/plan-offer-variant.ts
```

## 3. Direção do link

A direção preferida é:
- da entidade do módulo personalizado `planOffer`
- para as entidades do Módulo de Produto `product` e `productVariant`

Definições recomendadas:

```ts
defineLink(PlanOfferModule.linkable.planOffer, ProductModule.linkable.product)
defineLink(PlanOfferModule.linkable.planOffer, ProductModule.linkable.productVariant)
```

Essa direção é preferida porque `PlanOffer` é um registro de origem personalizado associado a entidades comerciais.

Isso segue as orientações da Medusa para links de estilo de associação:
- quando uma entidade personalizada estiver associada a uma entidade comercial, defina o link do modelo personalizado para o modelo comercial

## 4. Por que essa direção é preferida

Esta direção corresponde ao modelo mental do recurso:
- um registro `PlanOffer` pertence ou tem como alvo um produto
- um registro `PlanOffer` pode pertencer ou ser direcionado a uma variante
- a entidade personalizada é o objeto de domínio que gerenciamos no plugin

Ele também permanece consistente com os links `subscription-*` existentes já presentes na base de código do plugin.

## 5. Semântica de cardinalidade

Os links do módulo expressam associação, não substituem a política.

Eles não devem ser tratados como o local que impõe:
- exclusividade em nível de produto
- exclusividade em nível de variante
- precedência de configuração efetiva

Esses comportamentos pertencem a:
- o modelo de domínio
- validação de fluxo de trabalho
- lógica de resolução de consulta

### Semântica do link do produto

Um `PlanOffer` pode estar vinculado a um produto.

No nível do domínio:
- um `PlanOffer` no nível do produto deve sempre apontar para um `product_id`
- um `PlanOffer` de nível de variante também deve apontar para um `product_id`

### Semântica de link variante

Um `PlanOffer` pode estar vinculado a uma variante.

No nível do domínio:
- `scope = product` significa que não há destino de variante
- `scope = variante` significa que deve haver um alvo variante

## 6. Uso de link versus IDs escalares

O modelo deve manter ambos:
- IDs escalares na entidade `PlanOffer`
- links do módulo para o Módulo do Produto

IDs escalares necessários:
- `id_produto`
- `variant_id`

Por que ambos são necessários:
- IDs escalares são o principal mecanismo para filtragem, classificação, indexação e resolução de substituição
- os links fornecem leituras de exibição entre módulos sem quebrar o isolamento do módulo
- segue o padrão prático Medusa já utilizado na área `Subscrições` do plugin

## 7. Estratégia de leitura do administrador

O administrador deve distinguir entre:
- leituras de registros de origem
- leituras de dados de exibição vinculadas

### Leituras de registros de origem

As leituras do registro de origem devem usar a entidade `PlanOffer` como base.

Eles são responsáveis por:
- paginação de lista
- filtragem de lista por campos de origem
- recuperação de detalhes da fonte
- composição do resumo da configuração efetiva

### Leituras de dados de exibição vinculadas

As leituras vinculadas devem ser usadas para enriquecer as respostas do administrador com dados de exibição comercial, como:
- título do produto
- título da variante
- variante SKU

As leituras vinculadas são apenas para exibição.

Eles não devem substituir o registro de origem `PlanOffer` como raiz do modelo de leitura.

## 8. Regras de leitura da lista de administradores

Para a lista de administradores:
- a entidade da lista raiz deve permanecer `PlanOffer`
- os filtros de lista devem direcionar principalmente os campos diretos em `PlanOffer`
- os títulos dos produtos e das variantes são campos de exibição, não campos de controle primários para o modelo de dados

Filtros preferidos em campos diretos:
- `id_produto`
- `variant_id`
- `escopo`
- `está_ativado`
- identificadores ou nomes de registros de origem

Se o administrador precisar filtrar posteriormente por campos vinculados, como título do produto:
- trate isso como filtragem de dados vinculados
- considere `query.index()` ou uma estratégia de resolução dedicada
- não sobrecarregue um caminho simples de leitura de registro de origem com suposições de filtragem entre módulos

## 9. Regras de leitura de detalhes do administrador

Para a visualização detalhada do administrador:
- recuperar primeiro o registro `PlanOffer` de origem
- recuperar dados de exibição de variantes e produtos vinculados como enriquecimento
- calcular o resumo da configuração efetiva separadamente da recuperação da fonte

A página de detalhes deve ser capaz de mostrar:
- configuração do registro de origem
- nome de exibição do produto
- nome de exibição da variante quando relevante
- variante SKU quando relevante
- resumo de fonte eficaz

## 10. Semântica de exibição do produto

Quando um `PlanOffer` tem como alvo um escopo de nível de produto:
- O administrador deve exibir o título do produto
- a exibição da variante deve ser renderizada como `Todas as variantes` ou rótulo equivalente no nível da origem
- os dados de exibição da variante vinculada não são necessários para esse registro

Quando um `PlanOffer` tem como alvo um escopo de nível de variante:
- O administrador deve exibir o título do produto
- O administrador deve exibir o título da variante
- O administrador deve exibir o SKU quando disponível

Isso mantém a UI alinhada com o design do DTO já definido na especificação Admin.

## 11. Dados vinculados não são a fonte da verdade

As leituras de produtos e variantes de entidades vinculadas devem ser tratadas apenas como enriquecimento de exibição.

Eles não devem substituir:
- `id_produto`
- `variant_id`
- `escopo`
- resolução de configuração efetiva

Isso é importante porque:
- o título de um produto pode mudar posteriormente
- um título de variante ou SKU pode mudar posteriormente
- a política de origem e a lógica de substituição devem permanecer enraizadas no próprio registro do módulo personalizado

## 12. Orientação sobre estratégia de consulta

Estratégia de consulta recomendada para implementação posterior:

### Lista/detalhe de fontes

Use a entidade `PlanOffer` como raiz da consulta de origem.

Use campos diretos para:
- filtragem
- classificação
- paginação
- suporte para validação de exclusividade

### Enriquecimento vinculado

Use links de módulos e leituras vinculadas para enriquecer o resultado com:
- título do produto
- título da variante
-SKU

### Filtragem entre módulos

Se a filtragem por campos vinculados for necessária:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada
- não presuma que `query.graph()` pode filtrar módulos vinculados da raiz de origem em todos os casos

Isso se alinha às limitações e práticas recomendadas da API de consulta da Medusa.

## 13. Configuração eficaz e links de módulo

A configuração efetiva não requer suas próprias definições de link.

Por quê:
- `ProductSubscriptionConfig` é um estado derivado
- resolve a partir dos registros `PlanOffer` de origem
- os registros de produtos e variantes vinculados ainda são lidos pelos mesmos dois links no nível da origem

Os links suportam configuração eficaz indiretamente por:
- confirmar as entidades comerciais associadas
- habilitando dados de exibição do administrador
- apoiar futuros fluxos de validação e exibição

## 14. Semântica de criação e manutenção

Nas etapas posteriores do fluxo de trabalho, os links deverão ser criados e mantidos de forma consistente com o registro de origem:

- ao criar um `PlanOffer` em nível de produto, crie o link do produto
- ao criar um `PlanOffer` em nível de variante, crie o link do produto e o link da variante
- ao atualizar um alvo em um fluxo permitido futuro, os links devem ser atualizados adequadamente
- ao excluir ou substituir links, a direção do link deve corresponder à ordem original `defineLink(...)`

Embora a mutação do alvo não faça parte do fluxo de edição do administrador atual, a política de link ainda deve estar explícita agora.

## 15. Exclusão e expectativas do ciclo de vida

Para o MVP, os links devem ser tratados como associações que suportam leituras e lógica de ciclo de vida futuro.

O comportamento da cascata de exclusão deve ser decidido cuidadosamente durante a implementação.

Recomendação atual:
- não use design de link de módulo para codificar implicitamente a política de exclusão de negócios
- permitir que fluxos de trabalho e regras de domínio lidem com comportamento de remoção ou atualização seguro para os negócios

Isso evita o acoplamento destrutivo acidental entre a exclusão da entidade comercial e os dados da política do plug-in.

## 16. Recomendação final

A estratégia de link final para `Planos e Ofertas` deve ser:

1. Defina um link de `planOffer` para `product`.
2. Defina um link de `planOffer` para `productVariant`.
3. Mantenha um `defineLink(...)` por arquivo.
4. Mantenha `product_id` e `variant_id` como campos escalares explícitos no modelo de origem.
5. Trate os dados vinculados de produtos e variantes como um enriquecimento de exibição do administrador, e não como dados de política de fonte de verdade.
6. Mantenha a lista/detalhes do administrador enraizada em `PlanOffer`.
7. Use campos diretos para filtragem e classificação primária.
8. Use leituras vinculadas para campos de exibição e aumente para `query.index()` somente quando a verdadeira filtragem entre módulos for necessária.

## 17. Impacto nas etapas posteriores

Esta decisão significa que as etapas de implementação a seguir devem:
- adicione dois arquivos de link concretos em `src/links/`
- criar e dispensar links em fluxos de trabalho usando exatamente a mesma direção de `defineLink(...)`
- ler dados de exibição de produtos e variantes por meio de consultas vinculadas ou leituras complementares
- manter DTOs administrativos e auxiliares de consulta centrados na semântica do registro de origem
