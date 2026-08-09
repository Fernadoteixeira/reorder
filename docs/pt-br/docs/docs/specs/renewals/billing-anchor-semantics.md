# Reordenar: âncora de cobrança de renovações e especificações de semântica de data

Este documento cobre a etapa `2.3.8` de `documentation/implementation_plan.md`.

Objetivo:
- definir como as datas de renovação são calculadas e avançadas
- definir qual campo é a fonte da verdade da âncora de faturamento
- definir o que acontece após uma renovação bem-sucedida
- definir o que acontece após uma tentativa de renovação fracassada
- definir como os sinalizadores de pausa, cancelamento, teste e pulo afetam o agendamento
- definir se o escalonador processa apenas o ciclo de vencimento atual ou também os ciclos de pendências
- definir como evitar a geração de renovações duplicadas para o mesmo período de faturamento

Esta especificação se baseia em:
- `reordenar/docs/specs/subscriptions/domain-model.md`
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`
- `reordenar/docs/specs/renewals/data-model.md`
- `reordenar/docs/specs/renewals/state-machine.md`

A direção segue os padrões da Medusa:
- o agendamento recorrente deve usar campos de data persistentes explícitos
- um fluxo de trabalho bem-sucedido deve atualizar a próxima data de vencimento somente após a conclusão bem-sucedida
- execuções fracassadas não devem avançar silenciosamente os períodos de negócios
- a idempotência e o bloqueio devem proteger um período comercial contra processamento duplicado

## 1. Decisão central de âncora de faturamento

A fonte da verdade para a âncora de cobrança ativa continua sendo `Subscription.next_renewal_at`.

`RenewalCycle.scheduled_for` não é a fonte de verdade de longo prazo para a cadência de uma assinatura.

Em vez disso:
- `Subscription.next_renewal_at` é a data de vencimento ativa para o próximo ciclo faturável
- `RenewalCycle.scheduled_for` é o instantâneo em nível de ciclo da data de vencimento que está sendo processada

Esta divisão é intencional:
- a assinatura possui estado de agendamento futuro
- o ciclo de renovação possui uma unidade de execução

## 2. Quais campos de data são importantes

Os campos de assinatura relevantes são:

- `começou_em`
- `próxima_renovação_em`
- `última_renovação_em`
- `pausado_em`
- `cancelado_em`
- `cancelar_efetivo_em`
- `skip_next_cycle`
- `is_trial`
- `trial_ends_at`

O campo de renovação relevante é:

- `agendado_para`

## 3. Como um ciclo de renovação está ancorado

Quando um ciclo de renovação é criado ou selecionado para execução:
- `RenewalCycle.scheduled_for` deve corresponder à data de vencimento atual representada por `Subscription.next_renewal_at`

Isso significa que um ciclo representa um período de faturamento concreto.

Consequência importante:
- novas tentativas e ações de renovação forçada operam no mesmo período de cobrança
- eles não criam um novo período com uma nova data de vencimento

## 4. Como calcular a próxima data de renovação após sucesso

Após uma renovação bem-sucedida:
- `Subscription.last_renewal_at` deve ser definido para o carimbo de data e hora de execução da renovação bem-sucedida
- `Subscription.next_renewal_at` deve ser avançado pela cadência que estava realmente ativa para o ciclo de sucesso

### Fonte de cadência para avanço de data

A próxima data deve ser calculada a partir de:
- a cadência ativa atual da assinatura antes da execução, ou
- a cadência pendente aprovada se essa alteração pendente tiver sido aplicada durante o ciclo bem-sucedido

Na prática:
- se nenhuma alteração de cadência pendente foi aplicada, avance usando a cadência de assinatura atual
- se uma mudança de cadência aprovada foi aplicada no ciclo, avance usando a cadência recém-aplicada

Isso mantém a próxima âncora de faturamento alinhada com o estado em que a renovação bem-sucedida realmente se materializou.

## 5. Avanço de data após falha na execução

Uma tentativa de renovação falhada não deve avançar a âncora de faturação.

Depois de uma tentativa fracassada:
- `Subscription.next_renewal_at` permanece inalterado
- `Subscription.last_renewal_at` permanece inalterado
- o ciclo permanece associado ao mesmo período de faturação

Por quê:
- o período comercial não foi faturado com sucesso
- avançar a próxima data saltaria um ciclo
- nova tentativa e força devem continuar trabalhando no mesmo período

## 6. Pausa semântica

Se uma assinatura estiver `pausada`:
- não é elegível para execução normal de renovação
- nenhum novo ciclo de renovação deverá ser executado enquanto a assinatura permanecer pausada

Comportamento recomendado:
- a âncora vencida ativa permanece na assinatura
- retomar a assinatura torna-a elegível novamente de acordo com a política do agendador posterior

Esta especificação não requer atualização automática imediata na retomada.

## 7. Cancelar semântica

Se uma assinatura for `cancelada`:
- nenhuma renovação futura deverá ser executada após o cancelamento entrar em vigor

Interpretação recomendada:
- `cancel_efficient_at` é a data de guarda para saber se o próximo ciclo de vencimento ainda deve ser executado
- se o ciclo de vencimento cair após o ponto de cancelamento efetivo, ele não deverá ser executado

Isso mantém o cancelamento de fim de ciclo distinto do cancelamento imediato.

## 8. Semântica de teste

Se `is_trial = true` e a assinatura ainda estiver em teste:
- a assinatura ainda não é elegível para execução de renovação paga

Regra recomendada:
- um pedido de renovação pago não deve ser gerado antes de `trial_ends_at`

O primeiro período de renovação faturável começa somente quando o período de teste é liberado.

Isso não requer um estado de renovação separado.

É uma regra de elegibilidade avaliada antes da execução.

## 9. Semântica `skip_next_cycle`

`skip_next_cycle` deve afetar exatamente um próximo período de faturamento.

Comportamento recomendado:
- se `skip_next_cycle = true` quando a assinatura atingir a data de vencimento, o sistema consumirá esse período de vencimento sem gerar um pedido de renovação
- a âncora de faturamento da assinatura avança uma vez
- `skip_next_cycle` é então limpo

Por quê:
- a bandeira deve representar um ciclo ignorado, não uma pausa indefinida
- O administrador e os operadores podem raciocinar sobre isso como uma substituição operacional única

## 10. Se deve processar ciclos de pendências

Para o MVP, o agendador deve processar apenas o ciclo de vencimento atual, e não os ciclos históricos do backlog em massa.

Política recomendada:
- no máximo um ciclo de vencimento aberto por assinatura é processado por vez
- se uma assinatura estiver vencida por vários períodos teóricos, o sistema ainda funcionará na única âncora atualmente devida

Por que isso é preferido:
- garantias de idempotência mais simples
- comportamento de fila mais simples
- risco reduzido de geração de pedidos duplicados ou de ruptura
- operabilidade administrativa mais fácil

A atualização do backlog pode ser adicionada posteriormente como uma política explícita, não como o comportamento de renovação padrão.

## 11. Como evitar renovações duplicadas pelo mesmo período

O sistema deve tratar a tupla:

- `subscrição_id`
- `agendado_para`

como a identidade comercial de um período de renovação.

### Regras recomendadas de prevenção de duplicação

- não deve haver mais de um ciclo de renovação ativo representando o mesmo `subscription_id + Scheduled_for`
- novas tentativas do agendador e ações manuais de força devem reutilizar o mesmo ciclo quando almejam o mesmo período de vencimento
- um ciclo bem-sucedido avança a âncora apenas uma vez
- tentativas fracassadas não criam um novo período

Isso evita que o mesmo período de faturamento seja cobrado duas vezes.

## 12. Relação entre âncora de cobrança e novas tentativas

As novas tentativas operam em tentativas de execução, não em períodos de cobrança.

Isso significa:
- uma nova tentativa cria ou atualiza o histórico `RenewalAttempt`
- não cria um novo `RenewalCycle` para um novo período
- não avança `Subscription.next_renewal_at`

Somente uma conclusão bem-sucedida deverá encerrar o período atual e mover a âncora.

## 13. Regras sugeridas para cálculo de datas

### Cadência básica

A cadência vem de:
- `intervalo_frequência`
- `valor_frequência`

Os intervalos suportados permanecem:
- `semana`
- `mês`
- `ano`

### Regra recomendada para a próxima data

Depois do sucesso:
- next date = `scheduled_for` avançado pela cadência que o ciclo bem-sucedido usou

Isso é preferível à ancoragem a partir do carimbo de data/hora de execução do relógio de parede porque:
- preserva a consistência da cadência
- evita desvios quando o processamento ocorre depois do prazo nominal
- representa melhor os períodos de faturamento recorrentes

## 14. Lidando com execução tardia

Se o planejador ou força manual for executado depois da data de vencimento nominal:
- o ciclo ainda deve representar o período de faturamento `scheduled_for` original
- o sucesso deve avançar a partir dessa âncora programada, e não do tempo de execução atrasado

Exemplo:
- a data de vencimento era 1º de abril
- a execução foi realmente bem-sucedida em 3 de abril
- a cadência mensal ainda deve produzir a próxima data de vencimento com base em 1º de abril, e não em 3 de abril

Isso evita desvios na âncora de faturamento ao longo do tempo.

## 15. Exemplos de ciclo de vida

### 15.1 Renovação mensal bem-sucedida

- a assinatura tem `next_renewal_at = 2026-04-01`
- o ciclo está ancorado em `scheduled_for = 2026-04-01`
- o fluxo de trabalho foi bem-sucedido em `2026-04-01`
- `last_renewal_at` se torna o carimbo de data e hora de sucesso
- a próxima âncora se torna `2026-05-01`

### 15.2 Falha na renovação com nova tentativa

- a assinatura tem `next_renewal_at = 2026-04-01`
- ciclo ancorado em `2026-04-01`
- primeira tentativa falha
- `next_renewal_at` permanece `2026-04-01`
- tentar novamente ou forçar usa o mesmo ciclo de vencimento
- somente após o sucesso a âncora avança

### 15.3 Pular próximo ciclo

- a assinatura tem `next_renewal_at = 2026-04-01`
- `skip_next_cycle = verdadeiro`
- o sistema consome o ciclo de abril sem criar pedido
- `skip_next_cycle` é limpo
- a próxima âncora avança para a próxima data de cadência

### 15.4 Avaliação bloqueia renovação paga

- a assinatura está em teste e `trial_ends_at` é posterior à data de vencimento atual
- a execução da renovação está bloqueada para faturamento pago
- nenhum pedido pago será gerado para esse ponto devido até que as regras de elegibilidade para teste sejam atendidas

## 16. Recomendação final

A data do MVP recomendada e a semântica da âncora são:

- `Subscription.next_renewal_at` é a âncora de cobrança ativa
- `RenewalCycle.scheduled_for` é o instantâneo do período de vencimento atual
- o sucesso avança a âncora exatamente uma vez
- a falha não avança a âncora
- novas tentativas e força operam no mesmo período de vencimento
- pausar, cancelar e testar afetam a elegibilidade antes da execução
- `skip_next_cycle` consome exatamente um período
- o agendador processa um ciclo de vencimento atual, e não rajadas históricas de pendências

Isto é preferido porque é operacionalmente simples, está alinhado com a abordagem explícita de campo de data da Medusa e minimiza o risco de cobrança duplicada no projeto de renovação do MVP.
