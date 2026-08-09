# Reorganização: Especificação dos links do módulo de cobrança

Este documento aborda a etapa `2.4.4` do arquivo `documentation/implementation_plan.md`.

Objetivo:
- definir as ligações entre módulos exigidas pelo `Dunning`
- definir a direção das ligações e a semântica das relações
- definir se as ligações relacionadas a pagamentos estão no escopo do MVP
- definir como os dados vinculados devem ser lidos no Admin sem comprometer o isolamento do módulo

Esta especificação se baseia em:
- `reorder/docs/specs/dunning/domain-model.md`
- `reorder/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/specs/dunning/trigger-entry.md`
- `reorder/docs/specs/renewals/module-links.md`

A orientação segue os padrões do Medusa:
- os links entre módulos são usados para relações entre módulos, e não para relações dentro do mesmo módulo
- os registros de origem mantêm IDs escalares para filtragem e agendamento
- os dados vinculados são usados para enriquecimento, e não como fonte primária de verdade operacional
- os links de pagamento opcionais devem ser adiados até que seja comprovada uma necessidade concreta de leitura ou nova tentativa

Status da implementação:
- `Dunning` está implementado
- este documento continua sendo uma especificação de fase de projeto e histórico de decisões para a estratégia de links entre módulos
- a fonte de verdade em tempo de execução está localizada em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Links dos módulos obrigatórios

Observação sobre o tempo de execução:
- a implementação atual ainda não utiliza links dedicados do módulo de cobrança
- as leituras do Admin dependem, atualmente, de IDs escalares no `DunningCase`, além do enriquecimento baseado em consultas
- este documento continua representando a estratégia de links planejada, e não o mecanismo atual em tempo de execução

O `Dunning` precisa de três links de módulos no MVP:

- `dunningCase <-> assinatura`
- `dunningCase <-> ciclo de renovação`
- `dunningCase <-> pedido`

Essas ligações são necessárias porque:
- o registro de origem pertence ao módulo personalizado `dunning`
- a interface de usuário administrativa precisará do contexto da assinatura vinculada
- a interface de usuário administrativa precisará do contexto do ciclo de renovação de origem
- a interface de usuário administrativa poderá precisar do contexto do pedido de renovação vinculado quando o evento de dívida tiver um pedido associado
- o plug-in deve permanecer isolado dos módulos `subscription`, `renewal` e `order`

## 2. Links opcionais

Nesta fase, os links relacionados a pagamentos são opcionais e não devem fazer parte do conjunto de links do MVP.

Adiado no MVP:
- `dunningCase <-> payment_collection`
- `dunningCase <-> payment_session`
- `dunningCase <-> payment`
- `dunningAttempt <-> payment_collection`
- `dunningAttempt <-> payment_session`
- `dunningAttempt <-> payment`

Por que esses itens foram adiados:
- o contrato atual do domínio Dunning pode ser suportado por referências escalares e campos de erro no nível do caso
- `renewal_order_id` já fornece um caminho estável para cobranças de pagamentos vinculadas a pedidos no Medusa, caso seja necessário posteriormente;
- o escopo atual do Admin ainda não demonstra a necessidade de modelos de leitura aprofundados do módulo de pagamentos;
- adicionar links de pagamento prematuramente aumentaria o acoplamento a artefatos de pagamento mutáveis antes que o projeto do fluxo de trabalho de repetição de tentativas seja finalizado

Se uma estratégia de nova tentativa posterior ou um detalhe administrativo exigir o enriquecimento autoritativo do módulo de pagamento:
- adicione os links de pagamento em uma etapa posterior
- delimite-os ao requisito exato de leitura ou nova tentativa
- dê preferência ao menor conjunto útil, em vez da vinculação completa do gráfico de pagamento por padrão

## 3. Um link por arquivo

Seguindo as práticas recomendadas do Medusa:
- cada link de módulo deve estar em seu próprio arquivo
- não agrupe várias chamadas de `defineLink(...)` em um único arquivo

Estrutura de arquivos recomendada:

```text
reorder/src/links/dunning-subscription.ts
reorder/src/links/dunning-renewal.ts
reorder/src/links/dunning-order.ts
```

Se forem adicionados links de pagamento posteriormente, eles também deverão seguir a regra de um link por arquivo.

## 4. Direção do link

A direção preferencial é:
- da entidade do módulo personalizado `dunningCase`
- para as entidades do plugin ou do módulo de comércio vinculadas

Definições recomendadas:

```ts
defineLink(
  {
    linkable: DunningModule.linkable.dunningCase.id,
    isList: true,
  },
  SubscriptionModule.linkable.subscription
)

defineLink(
  {
    linkable: DunningModule.linkable.dunningCase.id,
    isList: true,
  },
  RenewalModule.linkable.renewalCycle
)

defineLink(DunningModule.linkable.dunningCase, {
  linkable: OrderModule.linkable.order.id,
})
```

Essa abordagem é a preferida porque `DunningCase` é a entidade operacional personalizada gerenciada no plug-in.

Além disso, segue o padrão prático já utilizado por:
- `assinatura <-> cliente`
- `assinatura <-> produto`
- `assinatura <-> variante`
- `ciclo de renovação <-> assinatura`
- `ciclo de renovação <-> pedido`

## 5. Por que essa orientação é a preferida

Essa orientação está alinhada com o modelo mental do recurso:
- cada caso de cobrança pertence a um contexto de assinatura
- cada caso de cobrança pertence a um ciclo de renovação de origem
- cada caso de cobrança pode fazer referência a um pedido de renovação
- a entidade personalizada é o objeto de domínio gerenciado pelo plug-in

Isso também mantém o `Dunning` alinhado com a direção de link já estabelecida e utilizada em `Subscriptions` e `Renewals`.

## 6. Semântica da cardinalidade

O módulo indica uma associação direta, e não a propriedade das regras de negócios.

Eles não devem ser tratados como o local responsável por garantir:
- regras de “um caso ativo por assinatura”
- exclusividade de eventos de dívida
- elegibilidade para repetição de tentativas
- transições de recuperação
- semântica de encerramento

Esses comportamentos pertencem a:
- o modelo de domínio
- a validação do fluxo de trabalho
- a lógica de agendamento

### Semântica do link de assinatura

No nível do domínio:
- um `DunningCase` deve sempre estar vinculado a um `subscription_id`
- uma assinatura pode ter vários casos de cobrança pendente ao longo do tempo
- no MVP, apenas um caso pode estar ativo por vez, mas isso é uma invariante do domínio, não uma regra de ligação

É por isso que, do ponto de vista da assinatura, a forma preferida de link é aquela orientada para listas.

### Semântica dos links do ciclo de renovação

No nível do domínio:
- um `DunningCase` deve sempre estar vinculado a um `renewal_cycle_id` de origem
- um ciclo de renovação pode estar associado a, no máximo, um caso de cobrança, de acordo com a semântica do MVP pretendida

O link ainda expressa apenas uma associação.

A exclusividade da titularidade dos eventos de dívida deve ser garantida no domínio de cobrança e nos fluxos de trabalho, e não partindo do pressuposto de que a tabela de ligação, por si só, seja suficiente.

### Semântica do link do pedido

No nível do domínio:
- um caso de cobrança pode não ter `renewal_order_id`
- um caso de cobrança pode fazer referência a um pedido de renovação quando o evento de dívida inclui um

Isso não impede que tentativas de armazenar também `payment_reference` ou referências de artefatos de pagamento posteriores como campos de diagnóstico escalar.

## 7. Uso de link versus IDs escalares

O modelo deve manter ambos:
- IDs escalares em `DunningCase`
- links de módulos para associações entre módulos

IDs escalares necessários:
- `DunningCase.subscription_id`
- `DunningCase.renewal_cycle_id`
- `DunningCase.renewal_order_id`

Por que ambos são necessários:
- IDs escalares são o principal mecanismo para filtragem, classificação, indexação, verificações de exclusividade e processamento do agendador
- os links fornecem leituras de exibição entre módulos sem quebrar o isolamento do módulo
- isso corresponde ao padrão prático já usado em `Assinaturas` e `Renovações`

## 8. Estratégia de leitura do administrador

O administrador deve distinguir entre:
- leituras de registros de origem
- leituras de enriquecimento vinculadas

### Leituras de registros de origem

As leituras do registro de origem devem usar `DunningCase` como base.

Eles são responsáveis por:
- paginação da lista de filas
- filtragem por estado de cobrança
- recuperação de detalhes para um caso
- recuperação do histórico de tentativas de registros filhos do mesmo módulo
- resumo de nova tentativa e resumo de fechamento

### Leituras de enriquecimento vinculadas

As leituras vinculadas devem ser usadas para enriquecer as respostas do administrador com:
- referência de assinatura e resumo de assinatura
- resumo do ciclo de renovação originário
- contexto de exibição do pedido de renovação

As leituras vinculadas são apenas para enriquecimento de exibição e contexto operacional.

Eles não devem substituir o registro `DunningCase` como raiz do modelo de leitura.

## 9. Regras de leitura da lista de administradores

Para a lista de administradores:
- a entidade da lista raiz deve permanecer `DunningCase`
- filtros de lista devem direcionar principalmente campos diretos em `DunningCase`
- os campos vinculados de assinatura, renovação e pedido são campos de exibição, não os campos de controle primários do modelo de dados

Filtros de campo direto preferidos:
- `estado`
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `tentativa_contagem`
- `max_attempts`
- `next_retry_at`
- `última_tentativa_em`
- `recuperado_em`
- `fechado_em`

Se o administrador posteriormente precisar filtrar por campos vinculados, como:
- referência de assinatura
- nome do cliente
- data prevista para renovação
- ID de exibição do pedido

então trate isso como filtragem de dados vinculados:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada, se necessário
- não sobrecarregue um caminho simples de leitura do registro de origem com suposições de que toda a filtragem vinculada funcionará diretamente a partir da raiz de cobrança

## 10. Regras de leitura de detalhes do administrador

Para a visualização detalhada do administrador:
- recupere o registro `DunningCase` de origem primeiro
- recuperar registros filhos `DunningAttempt` do mesmo módulo
- recuperar assinatura vinculada, ciclo de renovação e dados de exibição de pedidos como enriquecimento

A página de detalhes deve ser capaz de mostrar:
- estado do caso
- resumo da programação de novas tentativas
- tentativas de recuperação mais recentes e históricas
- resumo da assinatura
- resumo de renovação originário
- resumo do pedido de renovação, quando presente

Isso mantém o estado de recuperação enraizado no módulo de cobrança, ao mesmo tempo que fornece ao Admin o contexto operacional vinculado de que ele precisa.

## 11. Dados vinculados não são a fonte da verdade

Assinaturas vinculadas, renovações e leituras de pedidos devem ser tratadas apenas como enriquecimento.

Eles não devem substituir:
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `DunningCase.status`
- `DunningCase.next_retry_at`
- `DunningCase.last_payment_error_code`
- `DunningCase.last_payment_error_message`

Isso é importante porque:
- registros vinculados podem evoluir posteriormente
- o estado de recuperação de pagamento deve permanecer independente e auditável no módulo de cobrança
- O administrador não deve depender de um estado externo mutável para compreender o significado operacional do caso

## 12. Orientação sobre estratégia de consulta

Estratégia de consulta recomendada para implementação posterior:

### Lista/detalhe de fontes

Use `DunningCase` como raiz da consulta de origem.

Use campos diretos para:
- filtragem
- classificação
- paginação
- seleção do agendador

### Histórico do mesmo módulo

Use a relação interna `DunningAttempt` ou consultas dedicadas do mesmo módulo para recuperar:
- tentativa de cronograma
- estado da última tentativa
- tente ordenar por `attempt_no` ou carimbos de data e hora

### Enriquecimento vinculado

Use links de módulos e leituras vinculadas para enriquecer o resultado com:
- referência de assinatura e contexto de exibição
- originando o contexto do ciclo de renovação
- contexto de exibição do pedido de renovação

### Filtragem entre módulos

Se a filtragem por campos vinculados for necessária:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada
- não presuma que `query.graph()` pode lidar com toda a filtragem vinculada da raiz de origem de forma escalonável

## 13. Por que os links de pagamento são adiados

Os detalhes relacionados ao pagamento são adiados intencionalmente e não ignorados.

Por que o adiamento é preferido:
- o contrato do caso atual já possui campos de erro mais recentes explícitos
- o contrato de tentativa atual já possui `payment_reference`
- `renewal_order_id` já pode fornecer um caminho posterior para o enriquecimento de cobrança de pagamento através dos links de pagamento de pedido existentes da Medusa
- a estratégia de novas tentativas ainda não foi finalizada, portanto, bloquear a identidade do link para artefatos de pagamento agora seria prematuro

Quando os links de pagamento se tornam justificados:
- o fluxo de trabalho de nova tentativa deve ler ou modificar diretamente os artefatos de pagamento como registros vinculados de primeira classe
- os detalhes do administrador devem mostrar dados oficiais de cobrança de pagamento ou de sessão de pagamento que as referências escalares não podem satisfazer
- a observabilidade ou UX operacional requer navegação para esses registros de pagamento como entidades vinculadas

Até então:
- manter as referências de pagamento como dados operacionais escalares
- mantenha a superfície do link do módulo mínima

## 14. Recomendação final

Para a etapa `2.4.4`, a recomendação final é:

- links MVP necessários:
  - `dunningCase <-> assinatura`
  - `dunningCase <-> ciclo de renovação`
  - `dunningCase <-> pedido`
- links diferidos:
  - `cobrança_pagamento`
  - `sessão_de_pagamento`
  - `pagamento`
- raiz do registro de origem para Admin:
  - `DunningCase`
- histórico filho do mesmo módulo:
  - `Tentativa de Dunning`
- os registros vinculados são apenas de enriquecimento e não devem substituir o estado operacional de propriedade de cobrança
