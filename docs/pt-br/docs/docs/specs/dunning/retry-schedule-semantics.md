# Reordenar: Especificações de semântica do agendamento de novas tentativas de cobrança

Este documento cobre a etapa `2.4.7` de `documentation/implementation_plan.md`.

Objetivo:
- definir se o agendamento de novas tentativas armazena datas futuras concretas ou um instantâneo da política
- definir como `next_retry_at` é calculado
- definir a política de repetição padrão para MVP
- definir o limite de novas tentativas
- definir como funcionam as substituições de agendamento administrativo
- definir se as alterações posteriores nas políticas afectam apenas os novos casos ou também os casos activos existentes

Esta especificação se baseia em:
- `reordenar/docs/specs/dunning/domain-model.md`
- `reordenar/docs/specs/dunning/data-model.md`
- `reordenar/docs/specs/dunning/state-machine.md`

A direção segue os padrões da Medusa:
- A nova tentativa da etapa do fluxo de trabalho não substitui o agendamento de recuperação no nível do domínio
- a descoberta do agendador deve usar campos explícitos de data de vencimento
- os instantâneos de políticas devem preservar a estabilidade dos casos ao longo do tempo
- as substituições administrativas devem ser ações de domínio explícitas, e não efeitos colaterais ocultos

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para semântica de agendamento de novas tentativas
- a fonte da verdade do tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Semântica central

A programação de novas tentativas `Dunning` deve usar:
- um instantâneo da política armazenado no caso
- um carimbo de data e hora explícito do próximo vencimento armazenado no caso

Isso significa:
- `retry_schedule` armazena o instantâneo da política de repetição
- `next_retry_at` armazena a próxima data de nova tentativa atualmente agendada

O sistema não deve armazenar o calendário completo de novas tentativas futuras como uma lista de datas concretas no MVP.

## 2. Instantâneo da política versus datas concretas

### Decisão final

A programação deve armazenar um instantâneo da política, não uma lista materializada de todas as datas futuras de novas tentativas.

Forma recomendada:

```ts
type DunningRetrySchedule = {
  strategy: "fixed_intervals"
  intervals: number[]
  timezone: "UTC"
  source: "default_policy" | "manual_override"
}
```

Onde:
- `intervalos` são compensações de repetição em minutos
- cada deslocamento é interpretado em relação à tentativa anterior falhada ou à âncora de agendamento do caso inicial

### Por que isso é preferido

Isto é preferido porque:
- mantém o modelo compacto e estável
- evita armazenar datas futuras redundantes que nunca poderão ser utilizadas
- permite que o agendador use um campo de vencimento explícito: `next_retry_at`
- preserva a política de novas tentativas realmente atribuída ao caso

### Alternativa rejeitada

Opção rejeitada:
- armazenar uma série completa de carimbos de data/hora de novas tentativas concretas futuras no caso

Por que é pior:
- dados mais redundantes
- mais rotatividade de atualizações após cada tentativa
- mais difícil de raciocinar após a substituição manual ou evolução da política
- menos alinhado com o atual modelo de fila orientado por `next_retry_at`

## 3. Semântica de campo do agendador

`next_retry_at` é o único campo de data de vencimento voltado para o agendador no MVP.

Ele responde:
- quando a próxima tentativa se tornar elegível para execução

Não responde:
- todo o plano de novas tentativas futuras
- se o caso é terminal
- se a política atual era padrão ou substituída manualmente

Essas preocupações pertencem a:
- `estado`
- `retry_schedule`
- `max_attempts`

## 4. Tente novamente a semântica da âncora

O cálculo de `next_retry_at` deve usar âncoras explícitas.

### Agendamento inicial de novas tentativas

Quando um caso é criado pela primeira vez:
- a primeira nova tentativa deve ser agendada em relação ao momento de criação do caso ou ao horário do evento de renovação com falha de origem

Âncora recomendada para MVP:
- o carimbo de data/hora de criação do caso

Isto é operacionalmente simples e estável.

### Agendamento de novas tentativas subsequentes

Após uma `DunningAttempt` com falha:
- a próxima tentativa deve ser agendada em relação ao `finished_at` da tentativa falhada

Por quê:
- reflete quando o sistema realmente aprendeu que é necessária outra nova tentativa
- evita desvios com base em tempos planejados obsoletos
- mantém a semântica de atraso de repetição intuitiva para os operadores

## 5. Como `next_retry_at` é calculado

### Decisão final

`next_retry_at` deve ser calculado a partir de:
- o `retry_schedule.intervals` do caso
- o número da tentativa atual
- a âncora de agendamento apropriada

Fórmula recomendada:

- primeira nova tentativa agendada:
  - `next_retry_at = case_created_at + intervalos[0]`
- após tentativa falhada número `n`:
  - se `intervalos[n]` existir, `next_retry_at = failed_attempt.finished_at + intervalos[n]`
  - caso contrário, o caso não deverá agendar automaticamente outra nova tentativa

Interpretação:
- `attempt_no = 1` consome `intervals[0]` como o atraso antes da primeira tentativa
- `attempt_no = 2` usa `intervals[1]` para a próxima tentativa após a segunda falha

Os detalhes exatos da implementação da indexação de array podem ser normalizados posteriormente, mas a regra semântica é:
- um slot de intervalo corresponde a uma oportunidade de nova tentativa futura

## 6. Política de repetição padrão

### Decisão final para MVP

A política de repetição padrão deve ser:

- `estratégia = intervalos_fixos`
- `fuso horário = UTC`
- `fonte = política_padrão`
- `intervalos = [1440, 4320, 10080]`

Isso significa:
- primeira tentativa após 1 dia
- segunda tentativa após 3 dias
- terceira tentativa após 7 dias

Por que isso é preferido:
- simples e fácil de raciocinar
- tempo suficiente para evitar cargas repetidas barulhentas
- conservador para recuperação de pagamentos fora da sessão
- alinha-se com a direção do produto de recuperação operacional, em vez de pressão agressiva de faturamento

## 7. Política padrão de tentativas máximas

### Decisão final para MVP

O limite padrão deve ser:
- `max_attempts = 3`

Isso se alinha com a lista de intervalos padrão.

Significado:
- o caso pode executar até três tentativas reais de recuperação de pagamento `DunningAttempt`
- uma vez que a terceira tentativa falhar, o caso deverá ser encerrado como `não recuperado`

Por que isso é preferido:
- relação simples entre política e limite
- fácil para o administrador entender
- suficiente para MVP sem complicar o comportamento de novas tentativas

## 8. Relação entre `intervalos` e `max_attempts`

Invariante recomendado:
- o padrão `intervals.length` deve ser igual a `max_attempts`

Por quê:
- cada oportunidade de nova tentativa permitida possui um intervalo de atraso explícito
- isso evita semântica ambígua de “tentativas extras sem agendamento”

Se uma substituição manual alterar um, mas não o outro:
- a implementação deve validar a consistência
- fluxos de trabalho posteriores devem rejeitar substituições de agendamento inválidas

Regra MVP recomendada:
- `intervals.length` deve ser igual a `max_attempts`

## 9. Quando a nova tentativa automática é interrompida

A nova tentativa automática deve parar quando qualquer uma das seguintes situações for verdadeira:

- `contagem_tentativas >= max_attempts`
- a política move explicitamente o caso para `awaiting_manual_resolution`
- o caso já é terminal
- uma ação manual do operador fecha a caixa

Quando a nova tentativa automática parar:
- `next_retry_at` deve ser limpo
- o caso não deve permanecer em `retry_scheduled`

## 10. Semântica de substituição de administrador

A substituição do agendamento do administrador deve alterar explicitamente o agendamento de um caso existente.

### Decisão final

Uma substituição deve:
- substitua o `retry_schedule` atual do caso
- definir `retry_schedule.source = manual_override`
- atualize `max_attempts` se a substituição alterar o número de tentativas permitidas
- recalcular `next_retry_at` a partir do novo agendamento e do estado atual do caso

Esta deve ser uma mutação administrativa apoiada pelo fluxo de trabalho, não uma edição local de baixo nível.

## 11. O que uma substituição pode mudar

No MVP, a substituição do administrador pode mudar:
- a lista de intervalos
- o limite efetivo de novas tentativas por meio de `max_attempts`
- o próximo horário de nova tentativa agendado

No MVP, a substituição do administrador não deve mudar:
- a identidade do evento de dívida originário
- o histórico de tentativas já registrado
- o significado das tentativas anteriores

A substituição se aplica prospectivamente a partir do momento em que é salva.

## 12. Substituir regras de recálculo

Quando um administrador substitui a programação:

### Se o caso estiver em `retry_scheduled`

- recomputar `next_retry_at` imediatamente a partir da nova política
- mantenha o caso em `retry_scheduled`

### Se o caso estiver em `open`

- calcular a primeira nova tentativa agendada da nova política
- fazer a transição ou manter o caso de acordo com as regras da máquina de estados

Comportamento recomendado:
- `open -> retry_scheduled` se a substituição criar uma próxima tentativa válida

### Se o caso estiver em `awaiting_manual_resolution`

- a substituição por si só não deve retomar silenciosamente a nova tentativa automática, a menos que a ação do administrador pretenda fazê-lo explicitamente

Comportamento recomendado:
- alterar a programação enquanto ainda está em `awaiting_manual_resolution` atualiza o instantâneo da política
- ainda é necessária uma decisão separada para voltar para `retry_scheduled`

### Se o caso for terminal

- a substituição deve ser bloqueada

## 13. A mudança de política afeta os casos ativos existentes?

### Decisão final

As alterações na política de repetição padrão devem afetar apenas novos casos por padrão.

Os casos existentes devem manter o seu próprio instantâneo de política armazenado.

Por que isso é preferido:
- o comportamento do caso permanece estável e auditável
- os operadores podem entender por que um caso segue um cronograma e um caso posterior segue outro
- a alteração dos padrões do sistema não deve reescrever silenciosamente os compromissos operacionais ativos

## 14. Exceção: migração explícita ou substituição de administrador

Os casos existentes podem adotar uma nova política apenas através de uma ação explícita, tal como:
- uma substituição de administrador nesse caso
- uma migração deliberada ou operação de manutenção

Isto deve ser explícito e não automático.

## 15. Semântica de visão derivada

A UI Admin pode derivar rótulos de exibição como:
- `Tente novamente em 3 dias`
- `Tentar novamente em atraso`
- `Revisão manual necessária`

Mas estas são preocupações de visão.

Eles devem ser derivados de:
- `estado`
- `next_retry_at`
- `tentativa_contagem`
- `max_attempts`

Eles não devem substituir a semântica do cronograma armazenado.

## 16. Por que não usar novas tentativas de fluxo de trabalho de longa duração como agendamento principal

As etapas do fluxo de trabalho Medusa suportam intervalos de repetição, mas esse não deve ser o principal mecanismo de agendamento para `DunningCase`.

Por quê:
- o agendamento de novas tentativas em nível de domínio deve permanecer visível e consultável no Admin
- a nova tentativa de fluxo de trabalho de longa duração ocultaria a semântica da fila dentro do estado de execução do fluxo de trabalho
- seria mais difícil raciocinar sobre substituições administrativas em nível de caso
- o plugin já segue padrões explícitos orientados a filas em `Renovações`

Abordagem recomendada:
- use `retry_schedule` + `next_retry_at` em nível de domínio
- deixe o trabalho do agendador escolher os casos elegíveis
- manter a repetição da etapa do fluxo de trabalho apenas para resiliência de execução transitória de curta duração dentro de uma tentativa de recuperação

## 17. Exemplos sugeridos de ciclo de vida

### 17.1 Novo caso com política padrão

- caso criado
- `retry_schedule` armazenado com instantâneo de política padrão
- `max_attempts = 3`
- `next_retry_at = criado_at + 1 dia`
- o caso se torna `retry_scheduled`

### 17.2 Falha na primeira tentativa

- a primeira tentativa falha
- `tentativa_contagem = 1`
- o próximo intervalo é `3 dias`
- `next_retry_at = failed_attempt.finished_at + 3 dias`
- o caso permanece `retry_scheduled`

### 17.3 Falha na nova tentativa final

- terceira tentativa falha
- `contagem_tentativas = 3`
- limite atingido
- nenhuma próxima tentativa é computada
- o caso torna-se `não recuperado`

### 17.4 Substituição manual em caso agendado ativo

- o caso é `retry_scheduled`
- admin substitui agendamento para `[2880, 10080]`
- `retry_schedule.source = manual_override`
- `max_attempts = 2`
- `next_retry_at` é recalculado a partir do estado atual do caso

## 18. Recomendação final

Para a etapa `2.4.7`, a recomendação final é:

- armazenar um instantâneo da política em `retry_schedule`
- armazena apenas uma data de vencimento concreta em `next_retry_at`
- política padrão:
  - intervalos fixos em UTC
  - `[1 dia, 3 dias, 7 dias]`
- limite padrão:
  - `max_attempts = 3`
- substituição de administrador:
  - mutação explícita por caso
  - apenas prospectivo
  - bloqueado para casos terminais
- mudanças de política:
  - afetar novos casos apenas por padrão
  - os casos existentes mantêm seu instantâneo armazenado, a menos que sejam explicitamente substituídos
