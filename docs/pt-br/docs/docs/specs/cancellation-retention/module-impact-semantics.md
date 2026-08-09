# Reordenar: Especificações de semântica de impacto do módulo de cancelamento e retenção

Este documento cobre a etapa `2.5.9` de `documentation/implementation_plan.md`.

Objetivo:
- definir como `Cancelamento e Retenção` afeta os módulos existentes
- decidir o que acontece com os registros `RenewalCycle` agendados
- decidir como um `DunningCase` ativo coexiste com o tratamento de cancelamento
- decidir se assinaturas `past_due` podem entrar em retenção
- decidir se assinaturas `pausadas` e `canceladas` podem abrir um novo caso de cancelamento

Esta especificação se baseia em:
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`
- `reordenar/docs/specs/renewals/state-machine.md`
- `reordenar/docs/specs/dunning/source-of-truth-semantics.md`
- `reordenar/docs/specs/dunning/state-machine.md`
- `reordenar/docs/specs/cancellation-retention/trigger-entry.md`
- `reordenar/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reorder/docs/specs/cancellation-retention/lifecycle-semantics.md`

A direção segue os padrões da Medusa:
- os módulos mantêm a propriedade isolada de seu estado agregado
- a coordenação entre domínios acontece através de fluxos de trabalho e efeitos explícitos do ciclo de vida
- um agregado de processo não deve possuir diretamente a máquina de estado de outro agregado de processo
- os registros de execução devem permanecer pertencentes ao módulo que os criou

Status de implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte da verdade em tempo de design para o impacto do tratamento futuro de cancelamentos em `Assinaturas`, `Renovações` e `Cobranças`

## 1. Decisão central de integração

`Cancelamento e Retenção` pode afetar outros domínios, mas não deve substituir seus limites de propriedade.

Isso significa:
- `Renewals` permanece o proprietário do `RenewalCycle`
- `Dunning` continua sendo o proprietário do `DunningCase`
- `Assinaturas` permanecem proprietárias do estado do ciclo de vida e das âncoras de agendamento
- `Cancelamento e Retenção` coordena-se com essas áreas através de fluxos de trabalho e materialização do ciclo de vida, não assumindo seu estado primário

## 2. Efeito no `RenewalCycle` programado

### Decisão final

Os registros `RenewalCycle` agendados não são excluídos, renomeados ou modificados diretamente apenas porque um `CancellationCase` foi aberto.

`Cancelamento e Retenção` afeta indiretamente renovações futuras por meio dos efeitos finais do ciclo de vida da `Assinatura`.

### Se o resultado do cancelamento for `retido`

- os ciclos de renovação programados permanecem intactos
- a execução de renovações futuras continua de acordo com as regras normais de elegibilidade de assinatura

### Se o resultado do cancelamento for `pausado`

- os ciclos de renovação programados permanecem intactos como registros de domínio
- a execução de renovação futura é bloqueada enquanto `Subscription.status = paused`
- o estado bloqueado vem da elegibilidade da assinatura, não da transferência de propriedade de `Renovações`

### Se o resultado do cancelamento for `cancelado`

- ciclos de renovação cujo vencimento efetivo cai após `cancel_efetivo_at` não devem ser executados
- esses ciclos permanecem propriedade de `Renovações`
- fluxo de trabalho posterior ou regras do agendador podem marcá-los como ignorados ou não executáveis, mas não serão propriedade de `Cancelamento e Retenção`

### Por que isso é preferido

- `RenewalCycle` é o agregado de execução para uma unidade de faturamento
- a propriedade do módulo permanece explícita
- a elegibilidade futura é mais fácil de avaliar quando orientada pelo estado do ciclo de vida da assinatura

## 3. Efeito no `DunningCase` ativo

### Decisão final

Um `DunningCase` ativo pode coexistir com um `CancellationCase` ativo.

A abertura do tratamento de cancelamento não:
- feche o caso de cobrança
- alterar o status de cobrança
- transferir a propriedade de recuperação para o módulo de cancelamento

### Regra de coexistência

- `Dunning` continua sendo o proprietário do estado de recuperação de pagamento
- `Cancelamento e Retenção` continua sendo o proprietário do estado do processo de desligamento e desligamento
- ambos os processos podem estar ativos para a mesma assinatura ao mesmo tempo no MVP

### Implicações de leitura do operador

O modelo de leitura do administrador para cancelamento deve expor que existe um contexto de cobrança ativo.

Por quê:
- a operadora deve entender quando uma assinatura é:
  - em recuperação de pagamento
  - sob tratamento de rotatividade/cancelamento

### Implicações nos resultados

Se o resultado do cancelamento for:

- `retido`:
  - `DunningCase` continua sob suas próprias regras se a recuperação do pagamento ainda for necessária
- `pausado`:
  - a pausa não fecha automaticamente a cobrança
  - a política de fluxo de trabalho posterior pode decidir se a nova tentativa permanece apropriada, mas a propriedade ainda permanece em `Dunning`
- `cancelado`:
  - o cancelamento não reescreve automaticamente `DunningCase`
  - qualquer coordenação posterior, como encerramento explícito ou comportamento de resolução manual, deve acontecer através de regras de fluxo de trabalho dedicadas, em vez de sobreposição implícita de propriedade

## 4. Se uma assinatura `past_due` pode entrar em retenção

### Decisão final

Sim. Uma assinatura `past_due` pode entrar em `Cancelamento e Retenção`.

### Raciocínio

- `past_due` não é um estado do ciclo de vida do terminal
- o tratamento de rotatividade gerenciado pelo operador ainda pode ser necessário para uma assinatura `past_due`
- a presença de recuperação de pagamento não elimina a necessidade de:
  - avaliação de retenção
  - pausar ofertas
  - tratamento final do cancelamento

### Consequência operacional

- `past_due` é um estado de entrada válido para abrir um `CancellationCase`
- As leituras do administrador devem expor qualquer contexto de cobrança ativo junto com o caso de cancelamento

## 5. Se uma assinatura `pausada` pode abrir um novo caso

### Decisão final

Sim. Uma assinatura `pausada` pode abrir um `CancellationCase`.

### Raciocínio

- `pausado` não é um resultado do ciclo de vida terminal para todo o relacionamento com o cliente
- um operador ainda pode precisar:
  - finalizar o cancelamento
  - reavaliar o tratamento da rotatividade
  - documentar um resultado final de desligamento

### Guarda

A regra de exclusividade existente ainda se aplica:
- uma assinatura pode ter apenas um `CancellationCase` ativo por vez

## 6. Se uma assinatura `cancelada` pode abrir um novo caso

### Decisão final

Não. Uma assinatura `cancelada` não deve abrir um novo `CancellationCase`.

### Raciocínio

- `cancelled` já é um estado de ciclo de vida terminal
- o processo de cancelamento deve levar ao cancelamento, e não começar depois que o cancelamento já ocorreu
- permitir novos casos de assinaturas canceladas enfraqueceria a semântica de rotatividade e a consistência analítica

A análise histórica deve basear-se no caso histórico existente e não na criação de um novo.

## 7. Regras resumidas

- `RenewalCycle` permanece propriedade de `Renewals`.
- `DunningCase` permanece propriedade de `Dunning`.
- Coordenadas de `Cancelamento e Retenção` materializando os efeitos do ciclo de vida em `Assinatura`.
- A abertura de um caso de cancelamento não exclui nem reproprie ciclos de renovação programados.
- A cobrança ativa e o cancelamento ativo podem coexistir.
- Assinaturas `past_due` podem entrar em retenção.
- Assinaturas `pausadas` podem entrar em retenção.
- Assinaturas `canceladas` não podem abrir um novo caso de cancelamento.
