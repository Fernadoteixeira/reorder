# Reordenar: Especificação de fonte de verdade e limites de responsabilidade de cancelamento e retenção

Este documento cobre a etapa `2.5.2` de `documentation/implementation_plan.md`.

Objetivo:
- definir a divisão da fonte da verdade entre `Assinaturas`, `Renovações`, `Dunning` e `Cancelamento e Retenção`
- decidir qual estado pertence à `Assinatura`
- decidir qual estado pertence a `CancellationCase`
- decidir o que pertence a `RetentionOfferEvent`
- decidir se uma assinatura pode ter mais de um caso de cancelamento ativo
- definir como o tratamento de cancelamento interage com um `DunningCase` ativo
- definir como o tratamento do cancelamento afeta o futuro `RenewalCycle`

Esta especificação se baseia em:
- `reordenar/docs/specs/subscriptions/domain-model.md`
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`
- `reordenar/docs/specs/dunning/source-of-truth-semantics.md`
- `reordenar/docs/specs/cancellation-retention/trigger-entry.md`

A direção segue os padrões da Medusa:
- cada módulo deve possuir um agregado operacional claro
- a coordenação entre domínios deve acontecer através de fluxos de trabalho e regras de processo explícitas, e não sobreposição de propriedade
- os registros agregados de estado e histórico devem ser separados quando servem a propósitos operacionais diferentes
- o enriquecimento do modelo de leitura pode cruzar módulos, mas a raiz agregada e a máquina de estado primária devem permanecer explícitas

Status de implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte de verdade em tempo de design para propriedade e limites estaduais da área futura

## 1. Semântica central

O fluxo comercial recorrente tem quatro preocupações operacionais distintas:

- estado contínuo da assinatura do cliente
- estado de execução de um ciclo de renovação devido
- estado de recuperação de um evento de pagamento colecionável com falha
- estado do processo de cancelamento e retenção gerenciado pelo operador

Estas preocupações não devem ser fundidas.

### Estado operacional da assinatura

As `assinaturas` possuem o contrato recorrente contínuo do cliente.

Isso inclui:
- se a assinatura está `ativa`, `pausada`, `cancelada` ou `passado_devido`
- o produto ativo e a variante
- a cadência ativa
- agendamento de âncoras como `next_renewal_at`
- instantâneos operacionais, como contexto de remessa, produto e preços
- alterações de assinatura pendentes, mas ainda não aplicadas

### Estado de execução da renovação

As `renovações` possuem uma unidade concreta de execução de faturamento.

Isso inclui:
- quando um ciclo de renovação é devido
- se esse ciclo é `agendado`, `processamento`, `sucesso` ou `falha`
- se a aprovação é necessária e o que foi decidido
- qual pedido foi gerado por esse ciclo
- quais tentativas foram feitas para executar esse ciclo

### Estado de recuperação de cobrança

`Dunning` possui a recuperação de pagamento após uma falha na renovação com uma falha qualificada de pagamento.

Isso inclui:
- se um evento de dívida falida está aberto para recuperação
- quantas tentativas de recuperação foram feitas
- quando for a próxima tentativa
- qual é o último erro de recuperação de pagamento
- se a dívida foi recuperada ou encerrada sem cobrança

### Estado do processo de cancelamento e retenção

`Cancelamento e Retenção` controla o processo de desligamento e fluxo de salvamento assim que um operador inicia o tratamento do cancelamento.

Isso inclui:
- se o tratamento do cancelamento está aberto, em andamento ou resolvido terminalmente
- qual motivo e categoria de rotatividade foram registrados
- qual recomendação ou direção de salvamento foi selecionada
- quais ofertas de retenção foram propostas, aceitas, rejeitadas ou aplicadas
- qual resultado final do processo foi alcançado

## 2. Fonte da verdade por preocupação

### Fonte da verdade da assinatura

A fonte da verdade sobre o ciclo de vida do cliente e o estado operacional ativo da assinatura continua sendo a `Assinatura`.

O registro `subscription` possui:
- status do ciclo de vida
- cadência ativa
- produto ativo e variante
- âncora de agendamento da próxima renovação
- instantâneos operacionais
- alterações de assinatura pendentes, mas ainda não aplicadas
- carimbos de data e hora finais do ciclo de vida, como `paused_at`, `cancelled_at` e `cancel_efficient_at`

### Processo de cancelamento fonte da verdade

A fonte da verdade para o processo de cancelamento e salvamento deve ser `CancellationCase`.

O registro `cancellation_case` deve possuir:
- a máquina de estado do processo para remoção e tratamento de retenção
- captura do motivo da rotatividade e categoria do motivo
- notas e contexto inserido pelo operador
- ação recomendada ou direção recomendada para salvar
- resultado final do processo
- resumo da auditoria, como quem finalizou o processo e quando

### Fonte da verdade do histórico de retenção

A fonte da verdade para o histórico de ofertas e decisões deve ser `RetentionOfferEvent`.

O registro `retention_offer_event` deve possuir:
- uma proposta concreta de oferta de retenção
- a carga útil proposta para essa oferta
- a decisão tomada sobre essa oferta
- quem tomou a decisão e quando
- se e quando essa oferta foi realmente aplicada

Este deve ser um histórico de processo somente anexado.

### Fonte de renovação da verdade

A fonte da verdade para a execução da renovação continua sendo o `RenewalCycle`.

`Cancelamento e Retenção` não deve substituir:
- `RenewalCycle.status`
- estado de aprovação
- referência de pedido gerada
- histórico de tentativas

### Dunning fonte da verdade

A fonte da verdade para o estado de recuperação de pagamentos continua sendo `DunningCase`.

`Cancelamento e Retenção` não deve substituir:
- status de cobrança
- agendamento de nova tentativa
- tentar novamente o histórico de tentativas
- estado de fechamento de recuperação

## 3. O que pertence à `Assinatura`

`Subscrição` deve continuar a possuir:
- status do ciclo de vida, como `ativo`, `pausado`, `cancelado`, `past_due`
- produto ativo atual e cadência
- próximo cronograma de renovação atual
- envio, preços, produtos e instantâneos do cliente
- atualizações de assinatura pendentes
- carimbos de data e hora finais e campos que refletem os efeitos do ciclo de vida após o processo de cancelamento materializar um resultado

`Assinatura` não deve possuir:
- a máquina estatal de tratamento de cancelamentos
- oferecer histórico para tentativas de retenção
- o cronograma de decisão do tratamento de rotatividade
- a recomendação atual escolhida dentro do processo de cancelamento

Por quê:
- estes pertencem ao processo, não ao instantâneo do ciclo de vida
- a assinatura deve permanecer como contrato operacional estável, e não como registro de eventos de decisões de desligamento

## 4. O que pertence a `CancellationCase`

`CancellationCase` deve ser a raiz agregada da jornada de cancelamento e retenção.

Deve possuir:
- se o tratamento de cancelamento está atualmente ativo
- o status atual do caso
- o motivo e a categoria da rotatividade registrada
- notas e contexto inserido pelo operador
- estado de recomendação
- resultado final do processo, como retido, pausado ou cancelado
- campos de resumo de auditoria, como quem finalizou o caso e quando

Não deveria possuir:
- o produto ativo ou cadência da assinatura
- estado de recuperação de pagamento
- estado de execução do ciclo de renovação
- o histórico completo somente de acréscimos de cada decisão de oferta como campos agregados mutáveis

Por quê:
- `CancellationCase` é o registro do processo, não o instantâneo da assinatura de longo prazo
- o estado em nível agregado deve permanecer compacto e consultável
- o histórico detalhado da oferta deve permanecer em um registro infantil dedicado

## 5. O que pertence a `RetentionOfferEvent`

`RetentionOfferEvent` deve ser a entidade de histórico somente anexada para ações e decisões concretas de salvamento.

Deve possuir:
- `tipo_oferta`
- `offer_payload`
- `status_decisão`
- `motivo_decisão`
- `decidiu_em`
- `decidido_por`
- `aplicado_em`
- `metadados`

Não deveria possuir:
- o estado agregado atual do caso
- o estado final do ciclo de vida da assinatura
- o resultado final de todo o processo de cancelamento

Por quê:
- isso é análogo a:
  - `RenewalAttempt` em `RenewalCycle`
  - `DunningAttempt` em `DunningCase`
- o histórico detalhado deve permanecer apenas anexado
- o estado agregado deve permanecer em `CancellationCase`

## 6. Exclusividade do caso ativo

Uma assinatura deve ter no máximo um `CancellationCase` ativo por vez no MVP.

### Decisão final

Invariante recomendado:
- uma assinatura pode ter muitos casos históricos de cancelamento ao longo do tempo
- uma assinatura pode ter apenas um caso de cancelamento ativo em um determinado momento

Por que isso é preferido:
- as operadoras não devem gerenciar dois fluxos de offboarding concorrentes para uma assinatura
- Admin UX permanece mais simples e consistente
- análises e relatórios de resultados finais permanecem inequívocos
- corresponde à mesma regra operacional conservadora já usada por `Dunning`

### Significado de ativo

Ativo significa:
- o caso não está definitivamente resolvido
- o processo ainda pode aceitar decisões de retenção ou avançar para o cancelamento final

A multiplicidade histórica ainda é permitida uma vez encerrados os casos anteriores.

## 7. Relacionamento com `DunningCase` ativo

Um `DunningCase` ativo não deve bloquear automaticamente a abertura de um `CancellationCase`.

### Decisão final

Comportamento recomendado:
- uma assinatura pode ter um `DunningCase` ativo e um `CancellationCase` ativo
- cada caso continua sendo a fonte da verdade para seu próprio processo
- o conflito deve ser explícito nas regras de fluxo de trabalho e nas leituras posteriores do administrador, não oculto pela sobreposição implícita de propriedade

Por que isso é preferido:
- `Dunning` responde se a dívida não paga está em recuperação
- `Cancelamento e Retenção` responde se o operador está gerenciando offboarding ou salvando ações
- estas são questões diferentes e devem permanecer tópicos operacionais separados

### O que isso não significa

Isso não significa:
- `CancellationCase` pode fechar ou alterar `DunningCase` implicitamente no momento da criação
- `DunningCase` pode decidir o resultado do cancelamento
- um processo pode substituir silenciosamente o estado do outro

Em vez disso:
- a coexistência é permitida
- fluxos de trabalho posteriores devem definir um comportamento de resolução explícito quando um resultado final de cancelamento ou pausa afetar o tratamento de recuperação de cobrança

## 8. Relacionamento com o futuro `RenewalCycle`

`Cancellation & Retention` não deve possuir `RenewalCycle`.

`Renewals` permanece proprietária de:
- registros de fila
- estado de execução
- histórico de tentativas
- aprovação em nível de renovação e referências de pedidos geradas

### Decisão final

O tratamento de cancelamentos deve influenciar indiretamente renovações futuras por meio do estado de “Assinatura” e da materialização explícita do fluxo de trabalho, e não pela apropriação dos ciclos de renovação.

Isso significa:
- a abertura de um caso de cancelamento não substitui ou exclui a propriedade da renovação
- os resultados finais do processo, como "pausado" ou "cancelado", devem posteriormente se materializar no estado do ciclo de vida da assinatura
- as renovações devem então respeitar o estado de assinatura resultante de acordo com as regras de elegibilidade para renovação

### Por que isso é preferido

Por que isso é preferido:
- `RenewalCycle` continua sendo uma unidade de execução de faturamento
- `CancellationCase` continua sendo uma unidade de desligamento gerenciada pelo operador
- as responsabilidades permanecem separadas e mais fáceis de raciocinar
- a futura coordenação do fluxo de trabalho pode permanecer explícita e testável

## 9. Propriedade estatal por domínio

Os domínios devem possuir estado da seguinte maneira.

### 9.1 Estado de propriedade de `Assinatura`

`Assinatura` possui:
- estado atual do ciclo de vida
- cadência ativa atual e produto
- contexto atual de elegibilidade para renovação por meio de campos de ciclo de vida e agendamento
- carimbos de data e hora finais do ciclo de vida após a materialização de um resultado de pausa ou cancelamento

`Assinatura` não possui:
- o estado do processo de tratamento de cancelamento
- histórico de oferta de retenção
- estado de nova tentativa de cobrança
- histórico de tentativas de renovação

### 9.2 Estado de propriedade de `CancellationCase`

`CancellationCase` possui:
- a máquina de status de tratamento de cancelamento
- estado atual da decisão de desligamento
- classificação de rotatividade e contexto de caso inserido pelo operador
- resultado final do processo

`CancellationCase` não possui:
- a cadência ativa da assinatura
- o ciclo de vida de novas tentativas de cobrança
- o estado de execução do ciclo de renovação
- detalhes do histórico de oferta somente anexados que devem pertencer a `RetentionOfferEvent`

### 9.3 Estado de propriedade de `RetentionOfferEvent`

`RetentionOfferEvent` possui:
- uma oferta concreta ou entrada no histórico de ação de salvamento
- decisão e auditoria de aplicação para essa oferta

`RetentionOfferEvent` não possui:
- o estado agregado do caso
- o estado final do ciclo de vida da assinatura

### 9.4 Estado de propriedade da `RenewalCycle`

`RenewalCycle` possui:
- um evento de faturamento devido
- estado de execução e aprovação para esse evento
- resultado do pedido gerado
- histórico de tentativas através de `RenewalAttempt`

`RenewalCycle` não possui:
- estado do processo de cancelamento
- histórico de decisões de oferta de retenção
- estado de nova tentativa de cobrança

### 9.5 Estado de propriedade de `DunningCase`

`DunningCase` possui:
- o ciclo de vida de recuperação de pagamento de um evento de dívida cobrável fracassado
- repita o agendamento e repita as tentativas
- resultado do fechamento de recuperação

`DunningCase` não possui:
- estado do processo de cancelamento
- classificação de rotatividade e estado de recomendação de retenção
- decisão final de cancelamento da assinatura

## 10. Decisão sumária

O limite da fonte da verdade para MVP é:

- `Assinatura` continua sendo a fonte da verdade para o ciclo de vida e o estado operacional ativo da assinatura
- `CancellationCase` se torna a fonte da verdade para o estado do processo de cancelamento e retenção
- `RetentionOfferEvent` torna-se o histórico somente anexado de ofertas e decisões de retenção
- uma assinatura pode ter apenas um `CancellationCase` ativo
- um `DunningCase` ativo não bloqueia um `CancellationCase` ativo, mas ambos permanecem agregados operacionais separados
- futuros registros `RenewalCycle` permanecem propriedade de `Renewals`, enquanto o cancelamento os afeta indiretamente através do estado final da assinatura materializada

Isso dá à futura área de `Cancelamento e Retenção` um limite claro:
- um agregado para o estado do processo
- um registro de histórico infantil para decisões de retenção
- separação explícita do ciclo de vida, renovação e propriedade de recuperação de pagamento
