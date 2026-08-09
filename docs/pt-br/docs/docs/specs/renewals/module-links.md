# Reordenar: especificações de links do módulo de renovações

Este documento cobre a etapa `2.3.5` de `documentation/implementation_plan.md`.

Objetivo:
- definir os links dos módulos exigidos pelas `Renovações`
- definir a direção do link e a semântica do relacionamento
- definir como os dados vinculados de assinatura e pedido devem ser lidos no Admin
- definir se os links relacionados a pagamentos estão no escopo do MVP
- mantenha a camada de leitura alinhada com os padrões de isolamento do módulo Medusa

Esta especificação se baseia em:
- `reordenar/docs/specs/renewals/admin-spec.md`
- `reordenar/docs/specs/renewals/domain-model.md`
- `reordenar/docs/specs/renewals/data-model.md`
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`

## 1. Links de módulos necessários

`Renewals` precisa de dois links de módulo no MVP:

- `renewalCycle <-> assinatura`
- `renewalCycle <-> pedido`

Esses links são necessários porque:
- o registro de origem pertence ao módulo `renovação` personalizado
- a UI Admin deve renderizar o contexto de assinatura vinculado
- a UI Admin deve renderizar o pedido de renovação gerado quando presente
- o plugin deve permanecer isolado dos módulos `subscription` e `order`
- fluxos de trabalho posteriores e modelos de leitura devem ser capazes de enriquecer o ciclo com registros vinculados autorizados sem ignorar o isolamento do módulo

## 2. Links opcionais

Nesta fase, os links relacionados ao pagamento são opcionais e não devem fazer parte do conjunto de links do MVP.

Não é obrigatório no MVP:
- `renewalCycle <-> cobrança_pagamento`
- `renovaçãoCiclo <-> pagamento`
- `renewalAttempt <->payment_collection`
- `renovaçãoTentativa <-> pagamento`

Por que ainda não são necessários:
- o contrato administrativo atual pode ser satisfeito com referências escalares em nível de tentativa, como `payment_reference`
- a visualização detalhada da renovação atual ainda não requer modelos de leitura profunda de pagamentos
- adicionar links relacionados a pagamentos muito cedo aumentaria a complexidade antes que o fluxo de trabalho de renovação final e o modelo de leitura do administrador provassem que são necessários

Se uma visualização detalhada posterior precisar de enriquecimento oficial do módulo de pagamento:
- adicione esses links em uma etapa posterior
- mantenha-os com escopo de acordo com os requisitos reais do modelo de leitura

## 3. Um link por arquivo

Seguindo as melhores práticas da Medusa:
- cada link de módulo deve estar em seu próprio arquivo
- não agrupe múltiplas chamadas `defineLink(...)` em um arquivo

Estrutura de arquivo recomendada:

```text
reorder/src/links/renewal-cycle-subscription.ts
reorder/src/links/renewal-cycle-order.ts
```

## 4. Direção do link

A direção preferida é:
- da entidade do módulo personalizado `renewalCycle`
- para as entidades vinculadas de comércio ou módulo de plug-in

Definições recomendadas:

```ts
defineLink(
  { linkable: RenewalModule.linkable.renewalCycle.id, isList: true },
  SubscriptionModule.linkable.subscription
)

defineLink(RenewalModule.linkable.renewalCycle, OrderModule.linkable.order)
```

Esta direção é preferida porque `RenewalCycle` é a entidade operacional personalizada gerenciada no plugin.

Segue o mesmo padrão prático já utilizado no plugin para:
- `assinatura <-> cliente`
- `assinatura <-> produto`
- `assinatura <-> variante`
- `assinatura <-> pedido`

## 5. Por que essa direção é preferida

Esta direção corresponde ao modelo mental do recurso:
- um ciclo de renovação pertence a um contexto de assinatura
- um ciclo de renovação pode produzir um pedido gerado
- a entidade personalizada é o objeto de domínio que gerenciamos no plugin

Também mantém o módulo de renovação alinhado com a direção do link estabelecido já utilizado pelas `Assinaturas`.

## 6. Semântica de cardinalidade

Os links do módulo expressam associação, não propriedade de regras de negócios.

Eles não devem ser tratados como o local que impõe:
- elegibilidade para renovação
- requisitos de aprovação
- regras de execução de um pedido por ciclo
- tentar novamente a semântica

Esses comportamentos pertencem a:
- o modelo de domínio
- validação de fluxo de trabalho
- lógica de processamento de fila

### Semântica do link de assinatura

Uma assinatura pode ter vários ciclos de renovação ao longo do tempo.

No nível do domínio:
- um `RenewalCycle` deve sempre apontar para um `subscription_id`
- uma assinatura pode estar vinculada a vários ciclos

É por isso que o formato de link preferido é orientado a listas do ponto de vista da assinatura.

### Semântica do link do pedido

Um ciclo de renovação pode estar vinculado a um pedido gerado.

No nível do domínio:
- um ciclo pode ainda não ter ordem
- um ciclo bem sucedido pode ter uma ordem gerada
- o resumo do ciclo final deve apontar para o pedido vencedor gerado por meio de `generated_order_id`

Isso não impede que tentativas de armazenar também `order_id` como um campo de diagnóstico escalar.

## 7. Uso de link versus IDs escalares

O modelo deve manter ambos:
- IDs escalares nas entidades `RenewalCycle` e `RenewalAttempt`
- links de módulos para associações entre módulos

IDs escalares necessários:
- `RenewalCycle.subscription_id`
- `RenewalCycle.generated_order_id`
- `RenewalAttempt.order_id`

Por que ambos são necessários:
- IDs escalares são o principal mecanismo para filtragem, classificação, indexação e processamento de filas
- os links fornecem leituras de exibição entre módulos sem quebrar o isolamento do módulo
- corresponde ao padrão prático já utilizado na área `Assinaturas` do plugin

## 8. Estratégia de leitura do administrador

O administrador deve distinguir entre:
- leituras de registros de origem
- leituras de enriquecimento vinculadas

### Leituras de registros de origem

As leituras do registro de origem devem usar `RenewalCycle` como base.

Eles são responsáveis por:
- paginação da lista de filas
- filtragem por estado de ciclo
- recuperação de detalhes para um ciclo
- recuperação do histórico de tentativas de registros filhos do mesmo módulo
- resumo de aprovação e referência de pedido gerado

### Leituras de enriquecimento vinculadas

As leituras vinculadas devem ser usadas para enriquecer as respostas do administrador com:
- referência de assinatura
- cliente de assinatura e resumo do produto
- dados de exibição do pedido de renovação gerados

As leituras vinculadas são apenas para enriquecimento de exibição e contexto operacional.

Eles não devem substituir o registro `RenewalCycle` como raiz do modelo de leitura.

## 9. Regras de leitura da lista de administradores

Para a lista de administradores:
- a entidade da lista raiz deve permanecer `RenewalCycle`
- filtros de lista devem direcionar principalmente campos diretos em `RenewalCycle`
- os campos vinculados de assinatura e pedido são campos de exibição, não os campos de controle primários do modelo de dados

Filtros de campo direto preferidos:
- `estado`
- `aprovação_requerida`
- `status_aprovação`
- `agendado_para`
- `subscrição_id`
- `generated_order_id`

Se o administrador posteriormente precisar filtrar por campos vinculados, como:
- referência de assinatura
- nome do cliente
- título do produto
- ID de exibição do pedido

então trate isso como filtragem de dados vinculados:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada, se necessário
- não sobrecarregue um caminho simples de leitura de registro de origem com suposições de que toda a filtragem entre módulos funcionará diretamente a partir da raiz do ciclo

## 10. Regras de leitura de detalhes do administrador

Para a visualização detalhada do administrador:
- recupere primeiro o registro `RenewalCycle` de origem
- recuperar registros filhos `RenewalAttempt` do mesmo módulo
- recuperar assinatura vinculada e solicitar dados de exibição como enriquecimento

A página de detalhes deve ser capaz de mostrar:
- estado do ciclo
- resumo de aprovação
- instantâneo de alteração pendente aplicado
- tentativa de cronograma
- resumo da assinatura
- resumo do pedido gerado

Isso mantém o estado de execução enraizado no módulo de renovação, ao mesmo tempo que fornece ao Admin o contexto operacional vinculado necessário.

## 11. Dados vinculados não são a fonte da verdade

Assinaturas vinculadas e leituras de pedidos devem ser tratadas apenas como enriquecimento.

Eles não devem substituir:
- `subscrição_id`
- `generated_order_id`
- `RenewalCycle.status`
- `RenewalCycle.approval_status`
- `RenewalCycle.applied_pending_update_data`

Isso é importante porque:
- os dados de exibição da assinatura podem mudar posteriormente
- os dados de exibição do pedido podem evoluir posteriormente
- o próprio estado operacional do módulo de renovação deve permanecer independente e auditável

## 12. Orientação sobre estratégia de consulta

Estratégia de consulta recomendada para implementação posterior:

### Lista/detalhe de fontes

Use `RenewalCycle` como raiz da consulta de origem.

Use campos diretos para:
- filtragem
- classificação
- paginação
- seleção de fila

### Histórico do mesmo módulo

Use a relação interna `RenewalAttempt` ou consultas dedicadas do mesmo módulo para recuperar:
- tentativa de cronograma
- último estado de tentativa conhecido
- tente ordenar por `attempt_no` ou carimbos de data e hora

### Enriquecimento vinculado

Use links de módulos e leituras vinculadas para enriquecer o resultado com:
- referência de assinatura e contexto de exibição
- contexto de exibição de pedido gerado

### Filtragem entre módulos

Se a filtragem por campos vinculados for necessária:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada
- não presuma que `query.graph()` pode lidar com toda a filtragem vinculada da raiz de origem de forma escalonável

## 13. Por que os links de pagamento são adiados

Os detalhes relacionados ao pagamento não são ignorados; é adiado intencionalmente.

Por que o adiamento é preferido:
- o contrato de domínio atual já inclui `payment_reference` nas tentativas
- o escopo administrativo atual ainda não exige links diretos do módulo de pagamento
- o design posterior do fluxo de trabalho pode mostrar que os links `payment_collection` ou `payment` não são necessários ou são necessários apenas para detalhes em nível de tentativa

Isto evita o acoplamento prematuro às entidades de pagamento antes que a necessidade do modelo de leitura seja comprovada.

## 14. Recomendação final

Os links MVP necessários são:
- `renewalCycle <-> assinatura`
- `renewalCycle <-> pedido`

O não objetivo recomendado do MVP é:
- ainda não há links relacionados a pagamentos

Isso mantém o design:
- alinhado com o isolamento do módulo Medusa
- consistente com o resto do plugin
- suficiente para a fila de administração atual e casos de uso detalhados
- aberto para prorrogação posterior se os detalhes do nível de pagamento se tornarem um requisito real
