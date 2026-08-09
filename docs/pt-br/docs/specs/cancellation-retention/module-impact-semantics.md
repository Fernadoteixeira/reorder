# Reordenar: Especificações de semântica de impacto do módulo de cancelamento e retenção

Este documento cobre a etapa `2.5.9` de `documentation/implementation_plan.md`.

Objetivo:
- definir como `Cancellation & Retention` afeta os módulos existentes
- decidir o que acontece com os registros `RenewalCycle` programados
- decidir como um `DunningCase` ativo coexiste com o tratamento de cancelamento
- decidir se `past_due` assinaturas podem entrar em retenção
- decidir se as assinaturas `paused` e `cancelled` podem abrir um novo caso de cancelamento

Esta especificação se baseia em:
- `reorder/docs/specs/renewals/source-of-truth-semantics.md`
- `reorder/docs/specs/renewals/state-machine.md`
- `reorder/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/specs/dunning/state-machine.md`
- `reorder/docs/specs/cancellation-retention/trigger-entry.md`
- `reorder/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reorder/docs/specs/cancellation-retention/lifecycle-semantics.md`

A direção segue os padrões da Medusa:
- os módulos mantêm a propriedade isolada de seu estado agregado
- a coordenação entre domínios acontece através de fluxos de trabalho e efeitos explícitos do ciclo de vida
- um agregado de processo não deve possuir diretamente a máquina de estado de outro agregado de processo
- os registros de execução devem permanecer pertencentes ao módulo que os criou

Status de implementação:
- `Cancellation & Retention` ainda não foi implementado
- este documento é a fonte da verdade em tempo de design para o impacto do tratamento de cancelamento futuro em `Subscriptions`, `Renewals` e `Dunning`

## 1. Decisão central de integração

`Cancellation & Retention` pode afetar outros domínios, mas não deve substituir seus limites de propriedade.

Isso significa:
- `Renewals` permanece o proprietário de `RenewalCycle`
- `Dunning` continua sendo o proprietário de `DunningCase`
- `Subscriptions` permanece o proprietário do estado do ciclo de vida e das âncoras de agendamento
- `Cancellation & Retention` coordena-se com essas áreas por meio de fluxos de trabalho e materialização do ciclo de vida, não assumindo seu estado primário

## 2. Efeito no `RenewalCycle` programado

### Decisão final

Os registros `RenewalCycle` agendados não são excluídos, renomeados ou modificados diretamente apenas porque um `CancellationCase` foi aberto.

`Cancellation & Retention` afeta renovações futuras indiretamente por meio dos efeitos finais do ciclo de vida em `Subscription`.

### Se o resultado do cancelamento for `retained`

- os ciclos de renovação programados permanecem intactos
- a execução de renovações futuras continua de acordo com as regras normais de elegibilidade de assinatura

### Se o resultado do cancelamento for `paused`

- os ciclos de renovação programados permanecem intactos como registros de domínio
- a execução de renovação futura é bloqueada enquanto `Subscription.status = paused`
- o estado bloqueado vem da elegibilidade da assinatura, não da transferência de propriedade de `Renewals`

### Se o resultado do cancelamento for `canceled`

- ciclos de renovação cujo vencimento efetivo seja posterior a `cancel_effective_at` não devem ser executados
- esses ciclos permanecem propriedade de `Renewals`
- fluxo de trabalho posterior ou regras do agendador podem marcá-los como ignorados ou não executáveis, mas não são de propriedade de `Cancellation & Retention`

### Por que isso é preferido

- `RenewalCycle` é o agregado de execução para uma unidade de faturamento
- a propriedade do módulo permanece explícita
- a elegibilidade futura é mais fácil de avaliar quando orientada pelo estado do ciclo de vida da assinatura

## 3. Efeito no ativo `DunningCase`

### Decisão final

Um `DunningCase` ativo pode coexistir com um `CancellationCase` ativo.

A abertura do tratamento de cancelamento não:
- close the dunning case
- alterar o status de cobrança
- transferir a propriedade de recuperação para o módulo de cancelamento

### Regra de coexistência

- `Dunning` continua sendo o proprietário do estado de recuperação de pagamento
- `Cancellation & Retention` continua sendo o proprietário do estado do processo de desligamento e desligamento
- ambos os processos podem estar ativos para a mesma assinatura ao mesmo tempo no MVP

### Implicações de leitura do operador

O modelo de leitura do administrador para cancelamento deve expor que existe um contexto de cobrança ativo.

Por quê:
- a operadora deve entender quando uma assinatura é:
  - em recuperação de pagamento
  - sob tratamento de rotatividade/cancelamento

### Implicações nos resultados

Se o resultado do cancelamento for:

-`retained`:
  - `DunningCase` continua sob suas próprias regras se a recuperação do pagamento ainda for necessária
-`paused`:
  - a pausa não fecha automaticamente a cobrança
  - a política de fluxo de trabalho posterior pode decidir se a nova tentativa permanece apropriada, mas a propriedade ainda permanece em `Dunning`
- `canceled`:
  - o cancelamento não reescreve automaticamente `DunningCase`
  - qualquer coordenação posterior, como encerramento explícito ou comportamento de resolução manual, deve acontecer através de regras de fluxo de trabalho dedicadas, em vez de sobreposição implícita de propriedade

## 4. Se uma assinatura `past_due` pode entrar em retenção

### Decisão final

Sim. Uma assinatura `past_due` pode inserir `Cancellation & Retention`.

### Raciocínio

- `past_due` não é um estado de ciclo de vida terminal
- o tratamento de rotatividade gerenciado pela operadora ainda pode ser necessário para uma assinatura `past_due`
- a presença de recuperação de pagamento não elimina a necessidade de:
  - avaliação de retenção
  - pausar ofertas
  - tratamento final do cancelamento

### Consequência operacional

- `past_due` é um estado de entrada válido para abrir um `CancellationCase`
- As leituras do administrador devem expor qualquer contexto de cobrança ativo junto com o caso de cancelamento

## 5. Se uma assinatura `paused` pode abrir um novo caso

### Decisão final

Sim. Uma assinatura `paused` pode abrir uma `CancellationCase`.

### Raciocínio

- `paused` não é um resultado terminal do ciclo de vida para todo o relacionamento com o cliente
- um operador ainda pode precisar:
  - finalizar o cancelamento
  - reavaliar o tratamento da rotatividade
  - documentar um resultado final de desligamento

### Guarda

A regra de exclusividade existente ainda se aplica:
- uma assinatura pode ter apenas um `CancellationCase` ativo por vez

## 6. Se uma assinatura `cancelled` pode abrir um novo caso

### Decisão final

Não. Uma assinatura `cancelled` não deve abrir uma nova `CancellationCase`.

### Raciocínio

- `cancelled` já é um estado de ciclo de vida terminal
- o processo de cancelamento deve levar ao cancelamento, e não começar depois que o cancelamento já ocorreu
- permitir novos casos de assinaturas canceladas enfraqueceria a semântica de rotatividade e a consistência analítica

A análise histórica deve basear-se no caso histórico existente e não na criação de um novo.

## 7. Regras resumidas

- `RenewalCycle` permanece propriedade de `Renewals`.
- `DunningCase` permanece propriedade de `Dunning`.
- `Cancellation & Retention` coordena materializando os efeitos do ciclo de vida em `Subscription`.
- A abertura de um caso de cancelamento não exclui nem reproprie ciclos de renovação programados.
- A cobrança ativa e o cancelamento ativo podem coexistir.
- `past_due` assinaturas podem entrar em retenção.
- `paused` assinaturas podem entrar em retenção.
- Assinaturas `cancelled` não podem abrir um novo caso de cancelamento.
