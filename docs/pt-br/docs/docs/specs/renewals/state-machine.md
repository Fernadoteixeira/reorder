# Reordenar: especificações da máquina de estado de renovações

Este documento cobre a etapa `2.3.7` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de status de negócios para `RenewalCycle`
- definir o modelo de status de execução para `RenewalAttempt`
- definir transições de estado legais e ilegais
- definir como o controle de aprovação interage com a execução da renovação
- definir a semântica de nova tentativa e renovação forçada
- definir quando um ciclo é considerado fechado após sucesso ou fracasso

Esta especificação se baseia em:
- `reordenar/docs/specs/renewals/domain-model.md`
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`
- `reordenar/docs/specs/renewals/data-model.md`

A direção segue os padrões da Medusa:
- o estado de nova tentativa do mecanismo de fluxo de trabalho não é igual ao estado do domínio
- a aprovação deve ser modelada separadamente do status de execução
- trabalhos agendados e ações manuais devem reutilizar o mesmo fluxo de trabalho principal
- o estado operacional deve permanecer explícito e consultável

Status de implementação:
- a área `Renovações` já está implementada
- tratar este documento como contexto de tempo de design e justificativa do modelo de estado
- a fonte atual da verdade em tempo de execução reside em:
  - `reordenar/docs/architecture/renewals.md`
  - `reordenar/docs/api/admin-renewals.md`
  - `reordenar/docs/admin/renewals.md`
  - `reordenar/docs/testing/renewals.md`

## 1. Visão geral do modelo de estado

A área `Renovações` usa três dimensões de estado distintas:

- `RenewalCycle.status`
- `RenewalCycle.approval_status`
- `RenewalAttempt.status`

Essas dimensões não devem ser recolhidas em um campo.

Por quê:
- o estado de execução responde se o ciclo está atualmente na fila, em execução ou concluído
- o estado de aprovação responde se alterações pendentes podem ser aplicadas neste ciclo
- o estado da tentativa responde ao que aconteceu em uma tentativa de execução concreta

## 2. `RenewalCycle.status`

`RenewalCycle.status` é o status de execução agregado de uma unidade de renovação.

### Valores permitidos

- `agendado`
- `processamento`
- `sucesso`
- `falhou`

### Significado de cada valor

#### `agendado`

O ciclo existe e é elegível para ser considerado para execução.

Isto não garante que a execução possa começar imediatamente.

O ciclo ainda pode ser bloqueado por:
- requisitos de aprovação
- inelegibilidade da assinatura
- regras de renovação forçada
- idempotência ou proteções de bloqueio

Nota de implementação atual:
- falhas de validação de comprovação que acontecem antes de uma tentativa ser criada mantêm o ciclo em `agendado`
- os exemplos incluem restrição de aprovação, inelegibilidade de assinatura e falhas atuais de revalidação da política de oferta
- somente falhas que acontecem após a execução ter entrado no caminho da tentativa de processamento fazem a transição do ciclo para `failed`

#### `processando`

O ciclo está sendo executado atualmente pelo fluxo de trabalho principal de renovação.

Este estado significa:
- uma execução está em andamento
- nenhum escalonador concorrente ou execução manual de força deve iniciar outro
- o ciclo está bloqueado ou proteção de simultaneidade equivalente

#### `sucesso`

O ciclo foi concluído com sucesso.

Este estado significa:
- o pedido de renovação foi gerado com sucesso
- as atualizações de assinatura para este ciclo foram aplicadas com sucesso
- o ciclo é terminal para execução normal

#### `falhou`

A última tentativa de execução terminou em fracasso.

No MVP, `failed` significa que o ciclo não teve sucesso em sua última tentativa.

Isso não significa automaticamente:
- o ciclo é permanentemente irrecuperável
- novas tentativas não são mais possíveis

Se o ciclo pode ser repetido depende da política de fluxo de trabalho, dos limites de novas tentativas e das regras de força.

## 3. `RenewalCycle.approval_status`

`RenewalCycle.approval_status` é um estado de governança separado.

Só importa quando `approval_required = true`.

### Valores permitidos

- `nulo`
- `pendente`
- `aprovado`
- `rejeitado`

### Semântica recomendada

- `null`: a aprovação não é necessária para este ciclo ou nenhum estado de aprovação se aplica
- `pendente`: a aprovação é necessária e ainda não foi decidida
- `aprovado`: aprovação foi concedida para este ciclo
- `rejeitado`: aprovação foi negada para este ciclo

O estado de aprovação não é um status de execução.

Por exemplo:
- um ciclo pode estar `agendado` e `pendente`
- um ciclo pode ser `agendado` e `aprovado`
- um ciclo pode ser `falhado` e `aprovado`

## 4. `RenewalAttempt.status`

`RenewalAttempt.status` é o status de execução de uma tentativa concreta.

### Valores permitidos

- `processamento`
- `sucesso`
- `falhou`

### Por que não há `agendado` nas tentativas

`RenewalAttempt` só deve ser criado quando a execução realmente começar.

Por causa disso:
- o estado da fila pertence a `RenewalCycle`
- a execução em andamento e finalizada pertence a `RenewalAttempt`

## 5. Transições legais `RenewalCycle.status`

Transições legais recomendadas:

- `agendado -> processamento`
- `processamento -> sucesso`
- `processamento -> falha`
- `falhou -> processamento`

### `agendado -> processamento`

Permitido quando:
- a assinatura é elegível para renovação
- o controle de aprovação foi satisfeito
- nenhuma execução duplicada já está em andamento
- o ciclo é selecionado pelo programador ou por uma ação de força válida

### `processamento -> sucesso`

Permitido quando:
- o fluxo de trabalho de renovação é concluído com sucesso
- a geração do pedido foi bem-sucedida
- atualizações de assinatura e finalização de ciclo bem-sucedidas

### `processamento -> falha`

Permitido quando:
- o fluxo de trabalho de renovação atinge uma falha comercial ou técnica que encerra a tentativa atual

Exemplos típicos:
- falha na criação do pedido
- falha no pagamento
- assinatura não é mais elegível
- falha na validação da política de oferta em tempo de execução

### `falha -> processamento`

Permitido quando:
- a política de repetição permite outra tentativa
- o agendador tenta novamente o ciclo ou um administrador usa a renovação forçada
- o controle de aprovação é satisfeito para a nova tentativa
- o ciclo ainda não está bloqueado por outra execução

## 6. Transições `RenewalCycle.status` ilegais

As seguintes transições devem ser tratadas como inválidas:

- `agendado -> bem sucedido`
- `agendado -> falhou`
- `sucesso -> processamento`
- `sucesso -> falhou`
- `falhou -> bem sucedido`

Por quê:
- todos os estados de resultado devem passar pelo `processamento`
- um ciclo bem-sucedido é fechado para execução normal
- o sucesso não pode ser afirmado sem uma tentativa real de execução

## 7. Regras de controle de aprovação

A aprovação é uma porta de execução, não uma substituição de status.

### Se `aprovação_requerida = falso`

O ciclo pode prosseguir de acordo com as regras normais de execução.

Formato de aprovação recomendado:
- `status_aprovação = nulo`

### Se `aprovação_requerida = verdadeiro`

O ciclo é regido por `approval_status`.

#### `status_aprovação = pendente`

O ciclo não deve passar de `agendado` para `processamento` para uma execução que aplicaria alterações pendentes.

Este é o principal estado bloqueado para aprovação.

#### `approval_status = aprovado`

O ciclo poderá prosseguir para execução se todas as outras verificações de elegibilidade forem aprovadas.

#### `status_aprovação = rejeitado`

O ciclo não deve ser executado com a carga de alteração pendente que exigiu aprovação.

Para MVP, o comportamento recomendado é:
- o ciclo permanece não executável para o conjunto de alterações governado por aprovação
- o fluxo de trabalho ou regras de negócios posteriores podem decidir se o ciclo será reprogramado sem essas alterações
- `rejeitado` não significa em si que o ciclo foi executado ou falhou

## 8. Tente novamente a semântica

O comportamento de nova tentativa deve combinar:
- estado do domínio em `RenewalCycle`
- histórico de execução em `RenewalAttempt`
- configuração de nova tentativa do mecanismo de fluxo de trabalho para falhas temporárias de etapas

### Interpretação de domínio

Depois de uma tentativa fracassada:
- o status do ciclo se torna `failed`
- `last_error` é atualizado
- `attempt_count` é incrementado
- um registro `RenewalAttempt` com falha é preservado

### Interpretação do mecanismo de fluxo de trabalho

Dentro do fluxo de trabalho:
- etapas individuais podem usar recursos de nova tentativa do Medusa, como `maxRetries`
- as novas tentativas de etapa não precisam de status de ciclo separados
- o estado do negócio deve refletir apenas o resultado final da tentativa

Isso mantém o estado do domínio simples e ainda usa a resiliência do fluxo de trabalho Medusa.

### Resumo da regra de nova tentativa

No MVP:
- `failed` significa que a última tentativa falhou
- a elegibilidade para novas tentativas é determinada pela política e pelos guardas de execução
- a nova tentativa não requer um status de domínio separado, como `repetindo` ou `esgotado`

Fases posteriores, como a cobrança, podem estender a política sem alterar o modelo estatal central.

## 9. Semântica de renovação forçada

A renovação forçada manual deve reutilizar o mesmo fluxo de trabalho de execução principal que o agendador.

Deve diferir apenas em:
- quem iniciou a execução
- se a ação ignora o tempo programado
- quais verificações de política são relaxadas ou preservadas

### Regras de força recomendadas

A renovação forçada pode ser permitida para:
- ciclos `agendados` que de outra forma são executáveis
- ciclos `com falha` que são elegíveis para outra tentativa

A renovação forçada deve ser bloqueada para:
- ciclos de `processamento`
- ciclos `bem sucedidos`
- ciclos bloqueados por aprovação necessária não resolvida

A renovação da força ainda deve respeitar:
- bloqueio
- idempotência
- elegibilidade de assinatura
- validação da política de oferta atual quando alterações pendentes são aplicadas

## 10. Regras de fechamento

O ciclo deve ser considerado fechado para execução normal quando:
- `status = bem sucedido`

O ciclo também deve ser tratado como fechado para a tentativa atual quando:
- `status = falhou`

No entanto, no MVP `failed` não é automaticamente um estado de negócio permanentemente fechado.

É melhor interpretado como:
- a tentativa atual está fechada
- o ciclo ainda pode ser reaberto para `processamento` por nova tentativa ou forçar regras

Isso preserva a flexibilidade para comportamento de cobrança posterior sem alterar o modelo base.

## 11. Exemplos sugeridos de ciclo de vida

### 11.1 Renovação agendada com sucesso

- ciclo criado como `agendado`
- aprovação não necessária, então `approval_status = null`
- o agendador inicia a execução: `agendado -> processamento`
- registro de tentativa criado como `processing`
- o fluxo de trabalho é bem-sucedido
- a tentativa se torna `bem-sucedida`
- o ciclo se torna `bem sucedido`

### 11.2 Renovação bloqueada por aprovação pendente

- ciclo criado como `agendado`
- `aprovação_requerida = verdadeiro`
- `status_aprovação = pendente`
- o escalonador vê o ciclo, mas não deve executá-lo
- administrador aprova alterações
- `status_aprovação = aprovado`
- o agendador ou a ação forçada podem fazer a transição do ciclo para `processamento`

### 11.3 Falha na renovação seguida de nova tentativa

- o ciclo começa como `agendado`
- início da execução: `agendado -> processamento`
- tentativa falha
- a tentativa torna-se `falhada`
- o ciclo se torna `falha`
- a política de repetição permite outra execução
- o ciclo entra novamente em `processamento`
- um novo registro de tentativa é criado

## 12. Implicações de erro de domínio

O fluxo de trabalho posterior e a implementação da API devem expor erros de domínio consistentes para:

- transição de status inválida
- renovação já em processamento
- renovação já foi bem sucedida
- aprovação necessária antes da execução
- aprovação já decidida
- ciclo não elegível para nova tentativa
- execução duplicada bloqueada por bloqueio ou proteção de idempotência

## 13. Recomendação final

A máquina de estado MVP recomendada é:

- `RenewalCycle.status`: `agendado | processamento | conseguiu | falhou`
- `RenewalCycle.approval_status`: `nulo | pendente | aprovado | rejeitado`
- `RenewalAttempt.status`: `processando | conseguiu | falhou`

Isto é preferido porque:
- é bastante simples para orquestração do fluxo de trabalho da Medusa
- mantém a aprovação ortogonal à execução
- suporta agendador e força manual através de um fluxo de trabalho compartilhado
- deixa espaço para lógica de cobrança posterior sem redesenhar o modelo principal
