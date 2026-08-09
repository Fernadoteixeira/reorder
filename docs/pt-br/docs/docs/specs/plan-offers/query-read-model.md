# Reordenar: Consulta de planos e ofertas e leitura de especificações do modelo

Este documento cobre a etapa `2.2.8` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de leitura do administrador para `Planos e ofertas`
- consultas separadas de lista de registros de origem, consultas detalhadas de registros de origem e resolução de configuração efetiva
- definir a estrutura auxiliar para implementação posterior
- manter a camada de leitura alinhada com os padrões de consulta Medusa e isolamento do módulo

Esta especificação se baseia em:
- `reordenar/docs/specs/plan-offers/admin-spec.md`
- `reordenar/docs/specs/plan-offers/domain-model.md`
- `reordenar/docs/specs/plan-offers/data-model-override.md`
- `reorder/docs/specs/plan-offers/efficient-config-semantics.md`
- `reordenar/docs/specs/plan-offers/module-links.md`

## 1. Princípios do modelo de leitura

A camada de leitura `Planos e Ofertas` deve distinguir entre:

- leituras de registros de origem
- leituras de configuração efetiva derivadas

Esta distinção é necessária porque:
- A lista de administradores e os detalhes da fonte estão centralizados em `PlanOffer`
- a configuração efetiva é derivada de `PlanOffer`
- os dados vinculados do produto/variante são um enriquecimento de exibição, não a fonte da verdade

A camada de leitura não deve confundir essas preocupações em um auxiliar genérico.

## 2. Categorias auxiliares obrigatórias

O modelo de leitura Admin deve expor três categorias auxiliares:

- auxiliar de consulta de lista
- auxiliar de consulta detalhada
- resolvedor de configuração eficaz

Layout de implementação recomendado:

```text
reorder/src/modules/plan-offer/utils/admin-query.ts
```

Dentro desse arquivo ou namespace:
- um tipo de entrada para consultas de lista
- uma função para leituras de lista
- uma função para leituras detalhadas
- uma função para resolução de configuração eficaz

## 3. Auxiliar de consulta da lista de fontes

O auxiliar da lista de fontes é responsável por:
- lendo registros de origem `PlanOffer`
- aplicação de filtragem, pesquisa, classificação e paginação
- mapeando registros de origem para `PlanOfferAdminListItem`
- enriquecer a lista com dados de exibição de produtos e variantes

Não é responsável por:
- dados mutantes
- resolver instantâneos de assinatura
- realizar validação de negócios

### Formato de função recomendado

```ts
type ListAdminPlanOffersInput = {
  limit?: number
  offset?: number
  q?: string
  is_enabled?: boolean
  scope?: "product" | "variant"
  product_id?: string
  variant_id?: string
  frequency?: "week" | "month" | "year"
  order?: string
}
```

Exemplo de nomenclatura de função:
- `listAdminPlanOffers(...)`

## 4. Auxiliar de consulta de detalhes da fonte

O auxiliar de detalhes da fonte é responsável por:
- recuperando um registro `PlanOffer` de origem por `id`
- enriquecendo-o com produtos vinculados e dados de exibição de variantes
- resolver o resumo de configuração efetiva para o mesmo contexto de destino
- mapeando o resultado final para `PlanOfferAdminDetail`

Não é responsável por:
- computação de instantâneos de assinatura
- aplicação de mutações
- agindo como fonte da verdade para uma configuração eficaz

Exemplo de nomenclatura de função:
- `getAdminPlanOfferDetail(...)`

## 5. Resolvedor de configuração eficaz

O resolvedor de configuração efetiva é uma preocupação separada.

É responsável por:
- resolver a configuração final para o contexto do produto
- resolver a configuração final para o contexto variante
- aplicando substituto `variante> produto`
- retornando um `ProductSubscriptionConfig` derivado

Não é responsável por:
- paginação de lista
- Filtragem de registros de origem do administrador
- Formato de resposta HTTP

Exemplo de nomenclatura de função:
- `resolveProductSubscriptionConfig(...)`
- `resolveVariantSubscriptionConfig(...)`
- ou um resolvedor genérico com entrada específica do contexto

## 6. Por que a lista/detalhe e a configuração eficaz devem permanecer separadas

Esta separação segue camadas amigáveis ​​à Medusa:

- `PlanOffer` continua sendo a raiz do registro de origem para visualizações Admin CRUD
- a configuração efetiva é lógica derivada e não deve substituir leituras de registros de origem
- O mapeamento DTO permanece previsível porque os registros de origem do mapa de lista/detalhe, enquanto a configuração eficaz mapeia um contrato derivado

Sem esta separação:
- Os detalhes do administrador ficam mais difíceis de raciocinar
- a lógica de consulta mistura questões de persistência e derivação
- a validação futura da assinatura torna-se acoplada à lógica de visualização do administrador

## 7. Estratégia raiz de consulta

Para lista de administradores e detalhes da fonte:
- a raiz da consulta deve ser a entidade `plan_offer`

Para configuração eficaz derivada:
- o resolvedor pode consultar um ou dois registros de origem `plan_offer` dependendo do contexto

Esta é a estratégia mais limpa porque:
- o registro fonte está no módulo plugin
- a filtragem e a classificação são baseadas principalmente nos campos de origem
- os dados de exibição vinculados devem ser enriquecidos secundários

## 8. `query.graph()` versus `query.index()`

Seguindo as melhores práticas da Medusa:

### Use `query.graph()` para:

- lista de fontes em `plan_offer`
- detalhes da fonte em `plan_offer`
- enriquecimento de dados de exibição vinculados quando nenhuma filtragem vinculada entre módulos é necessária
- resolução de configuração efetiva ao resolver registros de origem por campos diretos como `product_id`, `variant_id`, `scope`, `is_enabled`

### Use `query.index()` somente quando:

- a filtragem por propriedades de módulos cruzados vinculadas torna-se necessária
- por exemplo, se posteriormente a lista precisar realmente filtrar ou classificar por título de produto ou SKU a partir de registros vinculados

Neste estágio, o design deve evitar a necessidade de `query.index()` para o caminho principal da lista de administradores.

## 9. Listar campos de consulta

A consulta de lista deve buscar apenas os campos necessários para:
- filtragem
- classificação
- Mapeamento DTO
- mapeamento de resumo eficaz

Campos de origem recomendados:
- `id`
- `nome`
- `escopo`
- `id_produto`
- `variant_id`
- `está_ativado`
- `frequências_permitidas`
- `intervalos_frequência`
- `desconto_por_frequência`
- `regras`
- `atualizado_em`
- `criado_em`

Campos de enriquecimento vinculados:
- `produto.id`
- `produto.título`
- `produtoVariant.id`
- `produtoVariant.title`
- `produtoVariant.sku`

Solicite apenas campos vinculados que sejam realmente necessários ao Admin DTO.

## 10. Campos de consulta detalhados

A consulta detalhada deve buscar:

Campos de origem:
- todos os campos da lista
- `metadados`

Enriquecimento vinculado:
- `produto.id`
- `produto.título`
- `produtoVariant.id`
- `produtoVariant.title`
- `produtoVariant.sku`

Dados complementares derivados:
- resumo de configuração eficaz

A carga detalhada deve manter os dados de origem e derivados conceitualmente separados, mesmo que o objeto de resposta os aninhe por conveniência.

## 11. Regras de filtragem de lista

A consulta de lista deve filtrar principalmente por campos de origem direta.

Filtros de campo de origem suportados:
- `está_ativado`
- `escopo`
- `id_produto`
- `variant_id`
- `frequência` através de `frequency_intervals`
- `q` através de campos de origem como `name`

Interpretação recomendada de `frequência`:
- `frequency=month` corresponde a registros cujos `frequency_intervals` contêm `month`

### Semântica de pesquisa

A consulta de pesquisa do MVP deve pesquisar principalmente os campos de propriedade da origem:
- `nome`

Se mais tarde você quiser pesquisar:
- `título_do_produto`
- `variant_title`
- `sku`

isso deve ser tratado como pesquisa de dados vinculados e projetado explicitamente, não assumido para o auxiliar básico.

## 12. Regras de classificação

O auxiliar de lista deve dividir a classificação em:
- classificação baseada em banco de dados
- classificação opcional na memória para campos de exibição derivados, se for absolutamente necessário

### Classificação baseada em banco de dados

Campos classificáveis preferidos:
- `nome`
- `escopo`
- `está_ativado`
- `criado_em`
- `atualizado_em`

### Classificação derivada ou vinculada

Campos como:
- `título_do_produto`
- `variant_title`

não devem ser tratados como campos classificáveis ​​de primeira classe na implementação inicial, a menos que a estratégia de consulta vinculada seja intencionalmente projetada para eles.

Isso mantém o modelo de leitura inicial previsível e rápido.

## 13. Entradas do resolvedor de configuração efetiva

O resolvedor de configuração efetiva deve aceitar contexto explícito.

Formato de entrada recomendado:

```ts
type ResolveProductSubscriptionConfigInput =
  | {
      product_id: string
      variant_id?: undefined
    }
  | {
      product_id: string
      variant_id: string
    }
```

Isso mantém a resolução explícita e evita comportamento ambíguo de “melhor esforço”.

## 14. Saídas do resolvedor de configuração efetiva

O resolvedor deve retornar o contrato lógico:

```ts
type ProductSubscriptionConfig = {
  product_id: string
  variant_id: string | null
  source_offer_id: string | null
  source_scope: "product" | "variant" | null
  is_enabled: boolean
  allowed_frequencies: PlanOfferAllowedFrequency[]
  discount_per_frequency: PlanOfferDiscountPerFrequency[]
  rules: PlanOfferRules | null
}
```

Os metadados auxiliares internos opcionais podem ser úteis durante a implementação:
- motivo da resolução
- instantâneo do registro de origem resolvido

Mas o contrato público deverá permanecer estável e compacto.

## 15. Expectativas do algoritmo de resolução

O resolvedor Effective-Config deve implementar a semântica já definida nas especificações anteriores:

### Contexto do produto

- resolver a origem habilitada no nível do produto por `product_id`
- se encontrado, retorne-o como configuração efetiva
- caso contrário, retorne uma configuração efetiva inativa/vazia

### Contexto variante

- resolver a fonte de nível de variante habilitada por `variant_id`
- se encontrado, devolva
- caso contrário, resolva a origem habilitada no nível do produto por `product_id`
- se encontrado, devolva-o como substituto
- caso contrário, retorne uma configuração efetiva inativa/vazia

O resolvedor não deve:
- mesclar campos de ambos os registros
- tratar registros desativados como substituições de bloqueio

## 16. Estratégia de mapeamento DTO

A camada de mapeamento deve ser explícita e separada da busca.

Categorias recomendadas:
- registro de origem -> lista DTO
- registro de origem + resumo efetivo -> detalhe DTO
- registro de origem -> auxiliar DTO de resumo de configuração efetiva

Isso reflete a estrutura já usada em `Subscrições`, onde o mapeamento é explícito e não oculto dentro do código de rota.

## 17. Implicações do administrador DTO

### Lista DTO

A lista DTO deve ser construída a partir de:
- fonte `PlanOffer`
- dados de exibição de produtos vinculados
- dados de exibição de variantes vinculados, quando aplicável
- um resumo compacto de regras e fonte eficaz

### DTO detalhado

O DTO detalhado deve incluir:
- todos os campos de configuração do registro de origem
- campos de exibição vinculados
- resumo de configuração efetiva derivado do resolvedor

Isso mantém o administrador transparente:
- “o que este disco diz”
- “o que se aplica atualmente”

## 18. Semântica de erro

A camada de leitura deve definir um comportamento claro de não encontrado.

### Lista auxiliar

- retorna uma lista vazia se nada corresponder

### Ajudante de detalhes

- lança um erro de domínio não encontrado se a fonte `PlanOffer` não existir

### Resolvedor de configuração efetiva

- não lança para “nenhuma configuração ativa”
- retorna um resultado inativo/vazio explícito

Esta distinção é importante porque:
- falta de detalhes da fonte é um erro
- a configuração efetiva ausente é um estado comercial válido

## 19. Estrutura de implementação recomendada

Estrutura recomendada dentro de `reorder/src/modules/plan-offer/utils/admin-query.ts`:

- tipos de entrada
- listas de campos de registro de origem
- tipos de registro de origem
- funções auxiliares para:
  - mapeamento de rótulo de frequência
  - mapeamento de resumo de desconto
  - mapeamento de resumo de regras
  - mapeamento de exibição de produto/variante
- ajudante de lista
- ajudante de detalhes
- resolvedor de configuração eficaz

Esta estrutura mantém a implementação próxima ao estilo já utilizado pelas `Subscrições`.

## 20. Recomendação final

O modelo final de leitura do administrador para `Planos e ofertas` deve ser:

1. Lista auxiliar para registros `PlanOffer` de origem.
2. Ajudante detalhado para um registro `PlanOffer` de origem mais resumo efetivo.
3. Resolvedor de configuração efetiva separado para `ProductSubscriptionConfig` derivado.
4. Filtragem e classificação primária com base nos campos de propriedade da origem.
5. Campos de produto/variante vinculados usados ​​como enriquecimento de exibição.
6. `query.graph()` como ferramenta padrão, com `query.index()` reservado para necessidades posteriores de filtragem cruzada de módulos verdadeiros.

## 21. Impacto nas etapas posteriores

Este design significa que as próximas etapas devem:
- implementar `admin-query.ts` para `planOffer`
- manter as rotas de API finas e orientadas para mapeamento
- expor caminhos de leitura separados para lista/detalhe de fontes e configuração eficaz
- permitir que a UI Admin consuma um contrato DTO estável sem incorporar lógica de fallback nos componentes React
