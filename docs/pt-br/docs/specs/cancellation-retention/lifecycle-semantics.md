# Reordenar: Especificação de semântica do ciclo de vida de cancelamento e retenção

Este documento cobre a etapa `2.5.8` de `documentation/implementation_plan.md`.

Objetivo:
- definir a semântica de negócios de `paused` vs `retained` vs `canceled`
- decidir se `pause` é um resultado de retenção, um estado do ciclo de vida da assinatura ou ambos
- definir quando `cancel_effective_at` está definido
- definir quando os registros `next_renewal_at` e futuros `RenewalCycle` serão preservados, bloqueados ou limpos

Esta especificação se baseia em:
- `reorder/docs/specs/subscriptions/domain-model.md`
- `reorder/docs/specs/renewals/source-of-truth-semantics.md`
- `reorder/docs/specs/renewals/billing-anchor-semantics.md`
- `reorder/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reorder/docs/specs/cancellation-retention/state-machine.md`

A direção segue os padrões da Medusa:
- o agregado do processo deve possuir o estado do resultado do processo
- o agregado de assinaturas deve possuir o estado final do ciclo de vida e âncoras de agendamento
- os fluxos de trabalho devem materializar os resultados do processo em um estado agregado, em vez de sobreposição de propriedade
- o agendamento da renovação deve continuar a respeitar o agregado de assinaturas como a fonte da verdade da âncora de faturamento

Status de implementação:
- `Cancellation & Retention` ainda não foi implementado
- este documento é a fonte de verdade em tempo de design para a semântica do impacto do ciclo de vida e da renovação de resultados futuros de cancelamento

## 1. Semântica central

O processo `Cancellation & Retention` pode terminar em três resultados terminais:

- `retained`
- `paused`
- `canceled`

Estes resultados não devem ser tratados como intercambiáveis.

Por quê:
- eles têm significados comerciais diferentes
- eles se materializam de forma diferente em `Subscription`
- eles têm consequências diferentes para `next_renewal_at` e execução de renovação futura

## 2. Semântica de `retained`

`retained` significa que o processo de tratamento do cancelamento terminou com o cliente mantido no caminho recorrente sem pausa como efeito final do ciclo de vida.

### Semântica do processo

- `CancellationCase.status = retained`
- `CancellationCase.final_outcome = retained`

### Semântica de assinatura

- `Subscription.status` permanece no caminho recorrente ativo
- a assinatura não passa para `paused`
- a assinatura não passa para `cancelled`
- `Subscription.cancel_effective_at` permanece `null`

### Semântica de renovação

- `Subscription.next_renewal_at` é preservado
- renovações futuras permanecem elegíveis de acordo com as regras normais de renovação
- um caso de cancelamento aberto ou histórico não suprime por si só a execução de renovação futura

## 3. Semântica de `paused`

`paused` significa que o processo de tratamento do cancelamento terminou com uma pausa como resultado de salvamento escolhido.

### Semântica do processo

- `CancellationCase.status = paused`
- `CancellationCase.final_outcome = paused`

### Por que `paused` é tanto o resultado do processo quanto o estado do ciclo de vida

Decisão final:
- `paused` é um resultado de retenção em `Cancellation & Retention`
- `paused` também é um estado de ciclo de vida real em `Subscriptions`

Interpretação recomendada:
- o caso determina que a pausa é o resultado do salvamento bem-sucedido
- um fluxo de trabalho materializa essa decisão em `Subscription.status = paused`

Esta divisão é preferida porque:
- o agregado do processo deve possuir a jornada de cancelamento e seu resultado
- o agregado de assinaturas deve possuir o estado final do ciclo de vida operacional
- mantém os limites de propriedade consistentes com o resto do plugin

### Semântica de assinatura

Quando a pausa é aplicada:

- `Subscription.status = paused`
- `Subscription.paused_at` está definido
- `Subscription.cancel_effective_at` permanece `null`

### Semântica de renovação

- `Subscription.next_renewal_at` deve ser preservado como âncora de cobrança ativa
- a assinatura não é elegível para execução normal de renovação enquanto estiver pausada
- a execução de renovação futura é bloqueada pela elegibilidade do ciclo de vida, e não pela transferência da propriedade da âncora de faturamento de `Subscription`

Isso é consistente com o design da âncora de faturamento `Renewals`:
- `Subscription.next_renewal_at` continua sendo a fonte da verdade para o próximo período de vencimento
- `paused` atua como uma porta de elegibilidade para execução

## 4. Semântica de `canceled`

`canceled` significa que o processo de tratamento do cancelamento terminou com o cancelamento final da assinatura.

### Semântica do processo

- `CancellationCase.status = canceled`
- `CancellationCase.final_outcome = canceled`

### Semântica de assinatura

Quando o cancelamento se concretizar:

- `Subscription.status = cancelled`
- `Subscription.cancelled_at` está definido
- `Subscription.cancel_effective_at` é definido de acordo com a semântica do tempo de cancelamento

### Semântica de renovação

- a execução de renovação futura não é mais permitida após o ponto efetivo do cancelamento
- a assinatura não deverá mais expor uma âncora de cobrança futura ativa quando o cancelamento for totalmente efetivo

## 5. Semântica `cancel_effective_at`

`cancel_effective_at` é significativo apenas para o caminho de cancelamento.

Decisão final:
- não deve ser definido para `retained`
- não deve ser definido para `paused`
- deve ser definido somente quando o resultado final for `canceled`

### Campo de nível de processo

`CancellationCase.cancellation_effective_at` representa o ponto efetivo acordado do resultado do cancelamento dentro do processo.

Isso permite que o caso expresse:
- cancelamento imediato
- cancelamento de fim de ciclo

antes ou ao mesmo tempo em que o efeito do ciclo de vida se materializa.

### Campo de nível de assinatura

`Subscription.cancel_effective_at` representa o efeito do ciclo de vida materializado no agregado de assinaturas.

Interpretação recomendada:
- o caso é dono da decisão do processo
- a assinatura possui o carimbo de data/hora final do ciclo de vida

### Regras de tempo recomendadas

Para MVP:

- cancelamento imediato:
  - `cancel_effective_at = now`
- cancelamento de fim de ciclo:
  - `cancel_effective_at = Subscription.next_renewal_at` no momento em que a decisão de cancelamento for finalizada

Isso é consistente com a semântica de `Renewals`, onde `cancel_effective_at` é a data de guarda para saber se uma renovação devida ainda deve ser executada.

## 6. Semântica `next_renewal_at`

`Subscription.next_renewal_at` continua sendo a fonte da verdade que é a âncora do faturamento.

`CancellationCase` não deve se apropriar de agendamentos futuros.

### Quando o resultado é `retained`

- mantenha `Subscription.next_renewal_at`
- não apague ou recalcule apenas porque existia um caso de cancelamento

Por quê:
- o cliente permanece no caminho recorrente ativo
- a âncora de faturamento deve permanecer estável

### Quando o resultado é `paused`

- mantenha `Subscription.next_renewal_at`
- não limpe a âncora devida ativa

Por quê:
- pausa bloqueia elegibilidade de execução
- a pausa não apaga a propriedade da âncora de faturamento da assinatura
- o comportamento de retomada posterior pode continuar a partir do estado explícito de agendamento de assinatura

### Quando o resultado é `canceled`

Regra recomendada:
- assim que o cancelamento entrar em vigor, `Subscription.next_renewal_at` deverá ser apagado

Por que isso é preferido:
- uma assinatura cancelada não deve apresentar um próximo ciclo faturável ativo
- simplifica as leituras do administrador e a lógica de elegibilidade futura
- corresponde ao exemplo geral de assinatura estilo Medusa, onde a data futura do pedido é removida no cancelamento

## 7. Semântica `RenewalCycle` futura

`Cancellation & Retention` não possui `RenewalCycle`.

Influencia indiretamente o comportamento de renovação ao materializar o estado do ciclo de vida em `Subscription`.

### Se o resultado for `retained`

- os ciclos de renovação existentes e futuros continuam sob regras normais de renovação
- nenhum ciclo de renovação é cancelado apenas porque existiu um caso

### Se o resultado for `paused`

- futuros ciclos de renovação não devem ser executados enquanto a assinatura permanecer pausada
- o módulo de renovação permanece o proprietário do estado de execução do ciclo
- o efeito de pausa é aplicado através da elegibilidade do ciclo de vida da assinatura

### Se o resultado for `canceled`

- qualquer ciclo de renovação cujo vencimento seja posterior a `cancel_effective_at` não deve ser executado
- o fluxo de trabalho de renovação ou a política do agendador devem respeitar o portão de cancelamento efetivo
- o tratamento do cancelamento não substitui diretamente o estado do ciclo de renovação, mas torna a execução futura inelegível

## 8. Regras resumidas

- `retained` significa que o cliente permanece no caminho recorrente sem pausa ou cancelamento.
- `paused` significa que o cliente é retido por meio de pausa temporária.
- `canceled` significa que o cliente sai do ciclo de vida recorrente.
- `paused` é ambos:
  - um resultado de retenção do processo de cancelamento
  - um estado de ciclo de vida real de `Subscription`
- `cancel_effective_at` é definido apenas no caminho `canceled`.
- `next_renewal_at` é preservado para:
  - `retained`
  - `paused`
- `next_renewal_at` é apagado assim que o cancelamento se tornar efetivo.
- execução de renovação futura:
  - continua normalmente por `retained`
  - está bloqueado pela elegibilidade do ciclo de vida para `paused`
  - é bloqueado após o ponto efetivo para `canceled`
