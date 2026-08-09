# Reordenar: especificações da máquina de estado de cobrança

Este documento cobre a etapa `2.4.6` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de status de negócios para `DunningCase`
- definir o modelo de status de execução para `DunningAttempt`
- definir transições de estado legais e ilegais
- definir como o agendamento de novas tentativas interage com o ciclo de vida do caso
- definir a semântica de fechamento após a recuperação ou tentar novamente a exaustão
- definir regras para manuais `mark-recovered` e `mark-unrecovered`

Esta especificação se baseia em:
- `reorder/docs/specs/dunning/domain-model.md`
- `reorder/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/specs/dunning/data-model.md`

A direção segue os padrões da Medusa:
- o estado de nova tentativa do mecanismo de fluxo de trabalho não é igual ao estado do domínio
- o estado do caso operacional deve permanecer explícito e consultável
- os campos de data de vencimento voltados para o agendador não devem substituir os campos do ciclo de vida do negócio
- ações administrativas manuais devem reutilizar as mesmas regras de domínio em vez de inventar semântica paralela

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para semântica de status e transição
- a fonte da verdade em tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Visão geral do modelo de estado

A área `Dunning` usa duas dimensões de estado separadas:

- `DunningCase.status`
- `DunningAttempt.status`

Essas dimensões não devem ser recolhidas em um campo.

Por quê:
- o status do caso responde se o evento de dívida está aberto, agendado para nova tentativa, atualmente em nova tentativa ou fechado
- o status da tentativa responde ao que aconteceu em uma tentativa concreta de recuperação

Os internos de novas tentativas do mecanismo de fluxo de trabalho devem permanecer separados desses estados de domínio.

## 2. `DunningCase.status`

`DunningCase.status` é o status de recuperação agregado de um evento de dívida cobrável com falha.

### Valores permitidos

- `open`
- `retry_scheduled`
- `retrying`
- `awaiting_manual_resolution`
- `recovered`
- `unrecovered`

### Significado de cada valor

#### `open`

O caso existe e está ativo, mas nenhuma nova tentativa está em andamento e nenhuma próxima tentativa ainda foi agendada.

Este é principalmente um estado de entrada ou teste.

Exemplos típicos:
- o caso acaba de ser criado a partir de uma renovação qualificada falhada
- o sistema ainda precisa calcular o agendamento da primeira tentativa
- o caso está ativo, mas ainda não foi colocado em nova tentativa cronometrada

#### `retry_scheduled`

O caso está ativo e a próxima nova tentativa está explicitamente agendada.

Isso significa:
- o evento de dívida permanece recuperável
- espera-se que o caso seja selecionado pelo agendador de cobrança ou por uma ação de nova tentativa manual posteriormente
- `next_retry_at` deve estar presente

#### `retrying`

O caso está sendo processado por uma tentativa de recuperação.

Isso significa:
- uma execução de nova tentativa está em andamento
- nenhuma execução de nova tentativa concorrente deve começar para o mesmo caso
- o caso está bloqueado ou proteção de simultaneidade equivalente

#### `awaiting_manual_resolution`

O caso está ativo, mas a nova tentativa automatizada não deve continuar até que ocorra uma decisão humana ou uma ação externa do cliente.

Exemplos típicos:
- a forma de pagamento provavelmente precisará ser substituída
- a política não permite novas tentativas automáticas para o estado atual
- o resultado do provedor indica que a intervenção manual é mais apropriada do que a nova tentativa automática imediata

#### `recovered`

O caso foi encerrado com sucesso.

Isso significa:
- a recuperação do pagamento foi bem-sucedida ou o caso foi legitimamente marcado como recuperado
- o evento de dívida não está mais ativo na cobrança
- o caso é terminal

#### `unrecovered`

O caso foi encerrado sem sucesso.

Isso significa:
- o evento de dívida não está mais ativo na cobrança
- a recuperação não foi bem-sucedida e o caso é terminal
- o fechamento pode ocorrer após exaustão de novas tentativas ou decisão manual explícita do operador

## 3. `retry_scheduled` é explícito ou derivado?

### Decisão final

`retry_scheduled` deve ser um status de domínio explícito, não apenas um estado derivado.

Por que isso é preferido:
- a fila Admin se beneficia de um estado de ciclo de vida diretamente consultável
- o escalonador deve distinguir “ativo, mas ainda não agendado” de “ativo e intencionalmente na fila para nova tentativa”
- `next_retry_at` por si só não descreve completamente a intenção comercial
- isso mantém o modelo mais claro para ações manuais e raciocínio operacional

### Papel de `next_retry_at`

`next_retry_at` continua sendo um campo operacional voltado para o agendador.

Ele responde:
- quando a nova tentativa agendada é devida

Não substitui:
- se o caso está realmente no estado do ciclo de vida agendado para novas tentativas

Interpretação recomendada:
- `status = retry_scheduled` e `next_retry_at != null` significa que existe uma nova tentativa na fila
- `status = open` e `next_retry_at = null` significam ativos, mas ainda não colocados em nova tentativa cronometrada

## 4. `DunningAttempt.status`

`DunningAttempt.status` é o status de execução de uma tentativa concreta de recuperação.

### Valores permitidos

- `processing`
- `succeeded`
- `failed`

### Por que não há `scheduled` nas tentativas

`DunningAttempt` só deve ser criado quando a execução da recuperação realmente começar.

Por causa disso:
- o estado da fila pertence a `DunningCase`
- a execução em andamento e finalizada pertence a `DunningAttempt`

## 5. Transições legais `DunningCase.status`

Transições legais recomendadas:

- `open -> retry_scheduled`
- `open -> retrying`
- `open -> awaiting_manual_resolution`
- `open -> recovered`
- `open -> unrecovered`
- `retry_scheduled -> retrying`
- `retry_scheduled -> awaiting_manual_resolution`
- `retry_scheduled -> recovered`
- `retry_scheduled -> unrecovered`
- `retrying -> retry_scheduled`
- `retrying -> awaiting_manual_resolution`
- `retrying -> recovered`
- `retrying -> unrecovered`
- `awaiting_manual_resolution -> retry_scheduled`
- `awaiting_manual_resolution -> recovered`
- `awaiting_manual_resolution -> unrecovered`

### `open -> retry_scheduled`

Permitido quando:
- o caso está ativo
- a política de repetição determinou uma próxima tentativa
- `next_retry_at` foi definido

### `open -> retrying`

Permitido quando:
- a primeira tentativa começa imediatamente
- uma ação manual de repetição agora inicia a primeira execução sem esperar pelo agendamento
- simultaneidade e proteções de bloqueio permitem a execução

### `open -> awaiting_manual_resolution`

Permitido quando:
- o caso deve permanecer ativo, mas a nova tentativa automática ainda não é apropriada
- é necessária revisão manual ou ação do cliente antes de continuar

### `open -> recovered`

Permitido quando:
- o evento de dívida é resolvido sem entrar na nova tentativa cronometrada
- uma nova tentativa imediata é bem-sucedida
- um administrador marca legitimamente o caso como recuperado

### `open -> unrecovered`

Permitido quando:
- a política determina que o caso deve ser encerrado sem nova tentativa
- um administrador marca legitimamente o caso como não recuperado

### `retry_scheduled -> retrying`

Permitido quando:
- o agendador escolhe o devido caso
- uma ação manual de repetição agora inicia a execução antes ou em vez de aguardar o devido tempo
- o caso ainda não está bloqueado por outra execução

### `retry_scheduled -> awaiting_manual_resolution`

Permitido quando:
- a revisão da política ou do operador decide que a nova tentativa automatizada deve parar por enquanto
- um novo provedor ou sinal comercial requer intervenção manual

### `retrying -> retry_scheduled`

Permitido quando:
- a última tentativa de nova tentativa falhou
- o caso permanece elegível para outra nova tentativa automática
- a política de novas tentativas define um novo `next_retry_at`
- `attempt_count` permanece abaixo do limite de fechamento final

### `retrying -> awaiting_manual_resolution`

Permitido quando:
- a última tentativa falhou
- a falha indica que agora é necessária intervenção manual
- o caso deve permanecer aberto, mas ainda não deve agendar automaticamente outra nova tentativa

### `retrying -> recovered`

Permitido quando:
- a última tentativa foi bem-sucedida
- finalização da recuperação bem-sucedida

### `retrying -> unrecovered`

Permitido quando:
- a última tentativa falha
- nenhuma nova tentativa é permitida
- `max_attempts` está exausto
- ou a política fecha explicitamente o caso como terminalmente irrecuperável

### `awaiting_manual_resolution -> retry_scheduled`

Permitido quando:
- uma decisão humana reativa a nova tentativa automatizada
- um problema com método de pagamento ou provedor foi resolvido
- um novo `next_retry_at` é atribuído

### `awaiting_manual_resolution -> recovered`

Permitido quando:
- a operadora determina que a dívida está resolvida
- ou uma ação de recuperação manual foi bem-sucedida

### `awaiting_manual_resolution -> unrecovered`

Permitido quando:
- o operador determina que o caso deve ser encerrado sem recuperação

## 6. Transições `DunningCase.status` ilegais

As seguintes transições devem ser tratadas como inválidas:

- `retry_scheduled -> open`
- `retrying -> open`
- `recovered -> open`
- `recovered -> retry_scheduled`
- `recovered -> retrying`
- `recovered -> awaiting_manual_resolution`
- `recovered -> unrecovered`
- `unrecovered -> open`
- `unrecovered -> retry_scheduled`
- `unrecovered -> retrying`
- `unrecovered -> awaiting_manual_resolution`
- `unrecovered -> recovered`

Por quê:
- os estados terminais devem permanecer terminais no MVP
- uma vez que o caso deixa o agendamento ativo, ele não deve reverter silenciosamente para o estado aberto inicial
- a reabertura de um caso encerrado confundiria o histórico de eventos de dívida e seria melhor tratada criando um novo caso futuro a partir de um novo evento de dívida

## 7. Tente novamente a semântica

O comportamento de nova tentativa deve combinar:
- estado do domínio em `DunningCase`
- histórico de execução em `DunningAttempt`
- configuração de novas tentativas do mecanismo de fluxo de trabalho para falhas de etapas transitórias

### Interpretação de domínio

Após uma tentativa falhada de nova tentativa:
- a tentativa se torna `failed`
- o caso permanece ativo a menos que as regras de encerramento sejam cumpridas
- o caso transita para `retry_scheduled`, `awaiting_manual_resolution` ou `unrecovered`
- `last_payment_error_code` e `last_payment_error_message` são atualizados
- `last_attempt_at` é atualizado
- `attempt_count` é incrementado

### Interpretação do mecanismo de fluxo de trabalho

Dentro do fluxo de trabalho:
- etapas individuais podem usar recursos de nova tentativa do Medusa, como `maxRetries`
- as novas tentativas de etapa não precisam de status de caso separados
- o estado empresarial deve refletir apenas o resultado final da tentativa de recuperação

Isso mantém o estado do domínio simples enquanto ainda usa a resiliência do fluxo de trabalho Medusa.

## 8. Repetir regras de sucesso

Quando uma nova tentativa for bem-sucedida:
- o `DunningAttempt` atual se torna `succeeded`
- o caso transita para `recovered`
- `recovered_at` está definido
- `closed_at` está definido
- `next_retry_at` está limpo
- `recovery_reason` deve capturar o caminho de resolução bem-sucedido

Exemplos recomendados para `recovery_reason`:
- `payment_captured`
- `manual_retry_succeeded`

## 9. Repetir regras de falha

Quando uma nova tentativa falha:

### Se outra tentativa automática for permitida

- a tentativa atual se torna `failed`
- o caso transita para `retry_scheduled`
- `next_retry_at` é recalculado
- os campos de resumo de erros mais recentes são atualizados

### Se a nova tentativa automática parar, mas o caso permanecer aberto

- a tentativa atual se torna `failed`
- o caso transita para `awaiting_manual_resolution`
- `next_retry_at` está limpo

### Se nenhuma nova tentativa for permitida

- a tentativa atual se torna `failed`
- o caso transita para `unrecovered`
- `closed_at` está definido
- `next_retry_at` está limpo
- `recovery_reason` deve capturar a causa terminal

Exemplos recomendados para motivo de terminal não recuperado:
- `max_attempts_exceeded`
- `provider_decline_terminal`
- `marked_unrecovered_by_admin`

## 10. Regras de fechamento

O caso deve ser considerado encerrado quando:
- `status = recovered`
- `status = unrecovered`

Fechado significa:
- não são permitidas novas tentativas automáticas
- nenhum novo `DunningAttempt` deve ser criado
- ações de repetição manuais devem ser bloqueadas

O caso deverá permanecer ativo quando:
- `status = open`
- `status = retry_scheduled`
- `status = retrying`
- `status = awaiting_manual_resolution`

## 11. Semântica de tentativa máxima

`max_attempts` é um limite em nível de caso para tentativas concretas de recuperação.

Regra recomendada:
- apenas execuções reais de `DunningAttempt` contam para `attempt_count`
- a descoberta do agendador por si só não aumenta as tentativas
- ações de marcação manual não contam como novas tentativas, a menos que executem uma recuperação de pagamento real

Quando `attempt_count` atinge `max_attempts` e a última tentativa ainda falha:
- o caso deve fazer a transição para `unrecovered`
- o agendamento de novas tentativas deve ser bloqueado

## 12. Semântica de ação manual

As ações administrativas manuais devem seguir o mesmo modelo de estado.

### `mark-recovered`

Estados de origem permitidos recomendados:
- `open`
- `retry_scheduled`
- `awaiting_manual_resolution`

Permitido condicionalmente de:
- `retrying` somente se nenhuma nova tentativa estiver em andamento, o que na prática deve ser tratado como bloqueado

Bloqueado de:
- `recovered`
- `unrecovered`

Efeitos:
- transições de caso para `recovered`
- `recovered_at` está definido
- `closed_at` está definido
- `next_retry_at` está limpo
- `recovery_reason = marked_recovered_by_admin`

### `mark-unrecovered`

Estados de origem permitidos recomendados:
- `open`
- `retry_scheduled`
- `awaiting_manual_resolution`

Bloqueado de:
- `retrying`
- `recovered`
- `unrecovered`

Efeitos:
- transições de caso para `unrecovered`
- `closed_at` está definido
- `next_retry_at` está limpo
- `recovery_reason = marked_unrecovered_by_admin`

### Por que as ações manuais são bloqueadas durante `retrying`

Porque:
- o caso já possui uma execução de recuperação em andamento
- o fechamento manual durante a execução ativa criaria uma propriedade ambígua do resultado
- o bloqueio do fluxo de trabalho e o estado do caso devem permanecer a fonte da verdade

## 13. Exemplos sugeridos de ciclo de vida

### 13.1 Caso criado após falha no pagamento da renovação

- caso criado como `open`
- o último erro de pagamento é registrado
- a política de repetição calcula a primeira tentativa
- transições de caso para `retry_scheduled`

### 13.2 Nova tentativa bem-sucedida

- o caso é `retry_scheduled`
- o agendador inicia a execução: `retry_scheduled -> retrying`
- registro de tentativa criado como `processing`
- a recuperação é bem sucedida
- a tentativa se torna `succeeded`
- caso se torna `recovered`

### 13.3 A nova tentativa falha e outra tentativa é permitida

- o caso é `retry_scheduled`
- o agendador inicia a execução: `retry_scheduled -> retrying`
- tentativa falha
- a tentativa se torna `failed`
- a política permite outra nova tentativa
- caso se torna `retry_scheduled`
- um novo `next_retry_at` é armazenado

### 13.4 A nova tentativa falha e o caso se torna terminal

- o caso é `retry_scheduled`
- o agendador inicia a execução: `retry_scheduled -> retrying`
- tentativa falha
- a tentativa se torna `failed`
- `attempt_count` alcançou `max_attempts`
- caso se torna `unrecovered`

### 13.5 Fechamento manual após revisão

- o caso é `awaiting_manual_resolution`
- o administrador decide que a recuperação não deve continuar
- transições de caso para `unrecovered`

## 14. Implicações de erro de domínio

O fluxo de trabalho posterior e a implementação da API devem expor erros de domínio consistentes para:

- transição de status inválida
- caso já está tentando novamente
- caso já recuperado
- caso já não recuperado
- nova tentativa não devida quando a semântica do agendador exigir o devido tempo
- nova tentativa bloqueada pela política de tentativas máximas
- fechamento manual bloqueado enquanto a nova tentativa está em andamento

## 15. Recomendação final

A máquina de estado MVP recomendada é:

-`DunningCase.status`:
  - `open`
  - `retry_scheduled`
  - `retrying`
  - `awaiting_manual_resolution`
  - `recovered`
  - `unrecovered`
-`DunningAttempt.status`:
  - `processing`
  - `succeeded`
  - `failed`

Isto é preferido porque:
- mantém o ciclo de vida de recuperação explícito e consultável
- mantém o agendamento de novas tentativas separado das tentativas internas do mecanismo de fluxo de trabalho
- suporta fluxos de administração manuais e orientados por agendador
- preserva uma distinção clara entre estados de recuperação ativos e terminais
