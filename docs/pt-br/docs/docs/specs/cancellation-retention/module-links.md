# Reordenar: especificações de links do módulo de cancelamento e retenção

Este documento cobre a etapa `2.5.11` de `documentation/implementation_plan.md`.

Objetivo:
- definir os links dos módulos exigidos por `Cancelamento e Retenção`
- definir a direção do link e a semântica do relacionamento
- decidir se links para `renewal_cycle` ou `dunning_case` são necessários no MVP
- definir como os dados vinculados devem ser lidos no Admin sem quebrar o isolamento do módulo

Esta especificação se baseia em:
- `reordenar/docs/specs/cancellation-retention/data-model.md`
- `reordenar/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reordenar/docs/specs/cancellation-retention/module-impact-semantics.md`
- `reordenar/docs/specs/renewals/module-links.md`
- `reordenar/docs/specs/dunning/module-links.md`

A direção segue os padrões da Medusa:
- links de módulo são usados para relações entre módulos, não para relações entre módulos
- os registros de origem mantêm IDs escalares para filtragem, classificação e proteção de fluxo de trabalho
- os dados vinculados são usados para enriquecimento, não como fonte primária de verdade operacional
- links opcionais devem ser adiados até que seja comprovada uma âncora de concreto agregado ou necessidade de leitura de modelo

Status de implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte da verdade em tempo de design para a estratégia de link entre módulos do futuro módulo de cancelamento

## 1. Links de módulos necessários

`Cancelamento e Retenção` precisa de um link de módulo obrigatório no MVP:

- `cancelamentoCaso <-> assinatura`

Este link é necessário porque:
- `CancellationCase` sempre pertence a um contexto de assinatura
- a interface do administrador precisará de um contexto de assinatura vinculado nas visualizações de lista e detalhes
- o plugin deve permanecer isolado do módulo `subscription`
- fluxos de trabalho posteriores e modelos de leitura devem ser capazes de enriquecer o caso com dados de assinatura autorizados sem ignorar o isolamento do módulo

## 2. Links opcionais

Neste estágio, os links para `renewal_cycle` e `dunning_case` são opcionais e não devem fazer parte do conjunto de links do MVP.

Adiado no MVP:
- `cancelamentoCaso <-> ciclo de renovação`
- `cancellationCase <-> dunningCase`

Por que estes são adiados:
- `CancellationCase` não está ancorado em um `RenewalCycle` concreto
- `CancellationCase` não está ancorado em um `DunningCase` concreto
- `Renovações` e `Dunning` permanecem domínios operacionais separados com seus próprios agregados
- o contrato de administração atual pode ser satisfeito pelo enriquecimento do tempo de consulta com base em `subscription_id`
- adicionar esses links muito cedo implicaria um acoplamento de propriedade mais forte do que o atual projeto permite

Se uma visualização de detalhes ou fluxo de trabalho posterior precisar de associação direta autoritativa:
- adicione o link em uma etapa posterior
- escopo para o requisito exato de leitura ou mutação
- não vincule preventivamente agregados que não sejam âncoras primárias do domínio de cancelamento

## 3. Um link por arquivo

Seguindo as melhores práticas da Medusa:
- cada link de módulo deve estar em seu próprio arquivo
- não agrupe múltiplas chamadas `defineLink(...)` em um arquivo

Estrutura de arquivo recomendada:

```text
reorder/src/links/cancellation-subscription.ts
```

Se links opcionais forem adicionados posteriormente, eles também deverão seguir a regra de um link por arquivo.

## 4. Direção do link

A direção preferida é:
- da entidade do módulo personalizado `cancellationCase`
- para a entidade `assinatura` vinculada

Definição recomendada:

```ts
defineLink(
  {
    linkable: CancellationModule.linkable.cancellationCase.id,
    isList: true,
  },
  SubscriptionModule.linkable.subscription
)
```

Esta direção é preferida porque `CancellationCase` é a entidade operacional personalizada gerenciada no plugin.

Segue também o padrão prático já utilizado por:
- `renewalCycle <-> assinatura`
- `dunningCase <-> assinatura`

## 5. Por que essa direção é preferida

Esta direção corresponde ao modelo mental do recurso:
- um caso de cancelamento pertence a um contexto de assinatura
- uma assinatura pode ter muitos casos históricos de cancelamento
- a entidade personalizada é o objeto de domínio gerenciado pelo plugin

Ele também mantém `Cancelamento e Retenção` alinhado com a direção do link estabelecido já usado em `Renovações` e `Dunning`.

## 6. Semântica de cardinalidade

O link do módulo expressa associação, não propriedade de regras de negócios.

Não deve ser tratado como o local que impõe:
- regras de um caso ativo por assinatura
- elegibilidade de entrada de cancelamento
- transições de estado terminal
- semântica de oferta de retenção
- regras finais de cancelamento

Esses comportamentos pertencem a:
- o modelo de domínio
- validação de fluxo de trabalho
- transições de estado de processo

### Semântica do link de assinatura

No nível do domínio:
- um `CancellationCase` deve sempre apontar para um `subscription_id`
- uma assinatura pode ter muitos casos de cancelamento ao longo do tempo
- no MVP, apenas um caso pode estar ativo por vez, mas isso é um domínio invariante, não uma regra de link

É por isso que o formato de link preferido é orientado a listas do ponto de vista da assinatura.

## 7. Uso de link versus IDs escalares

O modelo deve manter ambos:
- IDs escalares em `CancellationCase`
- links de módulos para associações entre módulos

IDs escalares necessários:
- `CancellationCase.subscription_id`

Por que ambos são necessários:
- ID escalar é o principal mecanismo para filtragem, classificação, indexação e pesquisa de casos ativos
- o link fornece leituras de exibição entre módulos sem quebrar o isolamento do módulo
- isso corresponde ao padrão prático já usado em `Renovações` e `Dunning`

Nesta fase, o módulo de cancelamento não deve adicionar IDs escalares como:
- `renovação_ciclo_id`
- `dunning_case_id`

Por quê:
- esses registros não são âncoras primárias do agregado de cancelamento
- seus detalhes podem ser enriquecidos posteriormente por meio de leituras em tempo de consulta por `subscription_id`

## 8. Estratégia de leitura do administrador

O administrador deve distinguir entre:
- leituras de registros de origem
- leituras de enriquecimento vinculadas

### Leituras de registros de origem

As leituras do registro de origem devem usar `CancellationCase` como base.

Eles são responsáveis por:
- paginação de lista
- filtragem por estado do caso
- recuperação de detalhes para um caso
- recuperação do histórico de ofertas de registros filhos do mesmo módulo
- resultado final e resumo da auditoria

### Leituras de enriquecimento vinculadas

As leituras vinculadas devem ser usadas para enriquecer as respostas do administrador com:
- referência de assinatura
- resumo do ciclo de vida da assinatura
- contexto de exibição do cliente e do produto na visualização da assinatura

O enriquecimento em tempo de consulta também pode ser usado para adicionar:
- resumo de cobrança ativa
- resumo de renovação

As leituras vinculadas e em tempo de consulta são apenas para enriquecimento de exibição e contexto operacional.

Eles não devem substituir o registro `CancellationCase` como raiz do modelo de leitura.

## 9. Regras de leitura da lista de administradores

Para a lista de administradores:
- a entidade da lista raiz deve permanecer `CancellationCase`
- filtros de lista devem direcionar principalmente campos diretos em `CancellationCase`
- os campos de assinatura vinculados são campos de exibição, não os campos de controle primários do modelo de dados

Filtros de campo direto preferidos:
- `estado`
- `resultado_final`
- `razão_categoria`
- `ação_recomendada`
- `subscrição_id`
- `criado_em`

Se o administrador posteriormente precisar filtrar por campos vinculados, como:
- referência de assinatura
- nome do cliente
- título do produto

então trate isso como filtragem de dados vinculados:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada, se necessário
- não sobrecarregue um caminho simples de leitura de registro de origem com suposições de que toda a filtragem entre módulos funcionará diretamente a partir da raiz de cancelamento

## 10. Regras de leitura de detalhes do administrador

Para a visualização detalhada do administrador:
- recupere o registro `CancellationCase` de origem primeiro
- recuperar registros filhos `RetentionOfferEvent` do mesmo módulo
- recuperar dados de exibição de assinatura vinculados como enriquecimento
- recuperar o resumo de cobrança ou renovação apenas como contexto operacional adicional quando necessário

A página de detalhes deve ser capaz de mostrar:
- estado do caso
- razão e recomendação
- cronograma da oferta
- resumo do resultado final
- resumo da assinatura
- resumo de cobrança opcional
- resumo de renovação opcional

Isso mantém o estado do processo enraizado no módulo de cancelamento, ao mesmo tempo que fornece ao Admin o contexto operacional vinculado de que ele precisa.

## 11. Dados vinculados não são a fonte da verdade

As leituras vinculadas de assinatura, cobrança e renovação devem ser tratadas apenas como enriquecimento.

Eles não devem substituir:
- `CancellationCase.subscription_id`
- `CancellationCase.status`
- `CancellationCase.reason_category`
- `CancellationCase.recommended_action`
- `CancellationCase.final_outcome`
- `CancellationCase.cancellation_efetivo_at`

Isso é importante porque:
- os dados vinculados podem mudar posteriormente
- o contexto de exibição vinculado não é o agregado do processo de cancelamento
- o próprio estado operacional do módulo de cancelamento deve permanecer independente e auditável

## 12. Orientação sobre estratégia de consulta

Estratégia de consulta recomendada para implementação posterior:

### Lista/detalhe de fontes

Use `CancellationCase` como raiz da consulta de origem.

Use campos diretos para:
- filtragem
- classificação
- paginação
- pesquisa de caso

### Histórico do mesmo módulo

Use a relação interna `RetentionOfferEvent` ou consultas dedicadas do mesmo módulo para recuperar:
- cronograma da oferta
- ordenação de eventos por `created_at`
- histórico de decisões em nível de oferta

### Enriquecimento vinculado

Use links de módulo e enriquecimento baseado em consulta para adicionar:
- referência de assinatura e contexto de exibição
- resumo do ciclo de vida ativo na visualização da assinatura

Use o enriquecimento em tempo de consulta, e não a propriedade agregada direta, para:
- contexto de cobrança ativo
- contexto de renovação mostrado em detalhes

## 13. Decisão sumária

A estratégia de link MVP é:
- link obrigatório:
  - `cancelamentoCaso <-> assinatura`
- links diferidos:
  - `cancelamentoCaso <-> ciclo de renovação`
  - `cancellationCase <-> dunningCase`

Com estes princípios-chave:
- `CancellationCase` permanece a raiz do registro de origem das leituras do administrador
- `RetentionOfferEvent` permanece no histórico filho do mesmo módulo
- dados de assinatura vinculados são enriquecidos
- o contexto de cobrança e renovação é um enriquecimento opcional no tempo de consulta, e não propriedade vinculada primária
