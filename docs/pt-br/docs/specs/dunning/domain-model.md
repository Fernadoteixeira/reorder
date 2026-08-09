# Reorganização: Especificação do modelo de domínio de cobrança

Este documento abrange a etapa `2.4.3` de `documentation/implementation_plan.md`.

Objetivo:
- definir o contrato de domínio para `DunningCase`
- definir o contrato de domínio para `DunningAttempt`
- decidir quais dados pertencem aos campos regulares do modelo
- decidir quais dados devem ser armazenados como instantâneos JSON ou metadados
- fornecer uma base estável para fluxos de trabalho, consultas administrativas e agendamento de novas tentativas

Esta especificação se baseia em:
- `reorder/docs/specs/dunning/trigger-entry.md`
- `reorder/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/specs/renewals/domain-model.md`

O projeto segue os padrões da Medusa:
- um módulo personalizado possui um agregado operacional explícito
- os campos utilizados para filtragem, classificação, agendamento e transições de estado devem ser armazenados explicitamente
- o histórico de repetições deve ser modelado como uma entidade separada quando tiver valor operacional e de auditoria
- o JSON é adequado para instantâneos de políticas de repetição e diagnósticos flexíveis, mas não para campos primários da máquina de estados

Status da implementação:
- `Dunning` está implementado
- este documento continua sendo uma especificação de fase de projeto e do histórico de decisões para o contrato de domínio
- a fonte de verdade em tempo de execução está em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Premissas arquitetônicas

A área `Dunning` possui dois níveis conceituais:

- `DunningCase`
- `DunningAttempt`

`DunningCase` é o principal registro operacional armazenado no módulo do plug-in.

`DunningAttempt` é um registro de tentativa de recuperação de menor armazenado separadamente do processo.

Na prática:
- um caso representa um evento de inadimplência em uma dívida cobrável para uma assinatura
- um caso está vinculado a um ciclo de renovação de origem
- um caso pode ter zero ou mais tentativas de recuperação
- um caso agrega o estado atual da recuperação
- as tentativas preservam o histórico de recuperação, que é apenas de acréscimo

Essa divisão é intencional:
- o caso é o registro da fila e da decisão
- as tentativas são o rastro de auditoria e de solução de problemas

## 2. Limites de responsabilidade

### `DunningCase`

`DunningCase` é responsável por:
- identificar a assinatura em processo de recuperação
- identificar o ciclo de renovação de origem
- armazenar o estado atual do ciclo de vida do caso de recuperação
- armazenar contadores de novas tentativas e campos de agendamento
- armazenar o resumo mais recente de erros de recuperação de pagamento
- armazenar o resumo de encerramento e recuperação
- armazenar os campos de conveniência atuais utilizados pelo agendamento e pela Admin

A `DunningCase` não se responsabiliza por:
- o estado completo do ciclo de vida da assinatura;
- a máquina de estados de execução do ciclo de renovação de origem;
- o histórico completo das tentativas de recuperação técnica;
- ser a fonte oficial da configuração atual do provedor de pagamentos

### `DunningAttempt`

O `DunningAttempt` é responsável por:
- armazenar uma tentativa concreta de recuperação para cada caso;
- registrar os carimbos de data e hora de início e término;
- registrar se a tentativa foi bem-sucedida ou falhou;
- registrar referências técnicas de pagamento e detalhes de erros;
- preservar o histórico de solução de problemas e de auditoria

O `DunningAttempt` não é responsável por:
- decidir se um caso deve existir;
- ser a fonte de referência para o status do caso;
- substituir o estado agregado armazenado no `DunningCase`

## 3. Por que se prefere duas entidades

A estrutura de domínios recomendada utiliza:
- uma entidade primária: `DunningCase`
- uma entidade filha: `DunningAttempt`

Por que essa abordagem é preferível:
- o estado da fila e o histórico de recuperação são questões distintas
- a lista de administradores e os detalhes dos administradores têm requisitos de leitura diferentes
- múltiplas tentativas não devem sobrescrever um campo mutável do log
- a filtragem por caso permanece simples
- a auditoria por tentativa continua sendo apenas de acréscimo e explícita

Alternativa rejeitada:
- armazenar todo o histórico de tentativas apenas em `DunningCase.metadata`

Por que é pior:
- mais difícil de inspecionar operacionalmente
- menor capacidade de auditoria
- maior dificuldade na representação do cronograma de novas tentativas
- menos alinhado com o padrão `Renewals` já estabelecido

## 4. Contrato de domínio `DunningCase`

Contrato de domínio mínimo:

- `id`
- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`
- `status`
- `attempt_count`
- `max_attempts`
- `retry_schedule`
- `next_retry_at`
- `last_payment_error_code`
- `last_payment_error_message`
- `last_attempt_at`
- `recovered_at`
- `closed_at`
- `recovery_reason`
- `metadata`

### Forma lógica proposta

```ts
type DunningCase = {
  id: string
  subscription_id: string
  renewal_cycle_id: string
  renewal_order_id: string | null
  status:
    | "open"
    | "retry_scheduled"
    | "retrying"
    | "awaiting_manual_resolution"
    | "recovered"
    | "unrecovered"
  attempt_count: number
  max_attempts: number
  retry_schedule: DunningRetrySchedule | null
  next_retry_at: string | null
  last_payment_error_code: string | null
  last_payment_error_message: string | null
  last_attempt_at: string | null
  recovered_at: string | null
  closed_at: string | null
  recovery_reason: string | null
  metadata: Record<string, unknown> | null
}
```

## 5. Campos `DunningCase` regulares

Os campos a seguir devem ser colunas normais do modelo:

- `id`
- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`
- `status`
- `attempt_count`
- `max_attempts`
- `next_retry_at`
- `last_payment_error_code`
- `last_payment_error_message`
- `last_attempt_at`
- `recovered_at`
- `closed_at`
- `recovery_reason`

Por que:
- são necessários para a filtragem e classificação do Admin
- são necessários para o agendamento de novas tentativas e a descoberta de filas
- são necessários para as transições de status operacional
- são necessários para as regras de exclusividade e encerramento
- expressam um estado operacional explícito, em vez de uma configuração flexível

## 6. Por que os IDs devem ser campos escalares

O modelo deve armazenar estes campos escalares explícitos:

- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`

Por que:
- simplificam a filtragem e a indexação
- simplificam as consultas do agendador e do administrador
- mantêm o mesmo padrão prático do Medusa já utilizado em `Subscriptions` e `Renewals`
- ainda é possível adicionar links de módulos posteriormente sem perder o acesso eficiente aos registros de origem

## 7. `status`

`status` é o campo da máquina de estados no nível do caso.

Ele responde:
- qual é o estado operacional atual do caso de recuperação

Deve ser um campo de enumeração escalar, e não JSON.

Por que:
- o status do caso determina a elegibilidade para o agendador
- o status do caso determina as ações do administrador
- o status do caso é um campo principal de filtragem e classificação

As regras exatas de transição serão abordadas em uma etapa posterior, mas o contrato do domínio deve reservar esses valores:

- `open`
- `retry_scheduled`
- `retrying`
- `awaiting_manual_resolution`
- `recovered`
- `unrecovered`

## 8. `attempt_count`

`attempt_count` é um campo de conveniência no nível do caso.

Por que isso faz parte do caso:
- a política de novas tentativas depende do número de tentativas
- a lista e os detalhes do administrador devem exibir uma contagem estável, sem agregar registros filhos a cada leitura
- a lógica do agendador não deve precisar consultar todas as tentativas para saber se o limite está próximo ou foi excedido

Observação importante:
- `attempt_count` tem origem no histórico, no sentido empresarial;
- continua sendo um campo escalar explícito, pois é importante do ponto de vista operacional

## 9. `max_attempts`

`max_attempts` é um campo de instantâneo de política no nível do caso, mas ainda assim deve ser armazenado explicitamente como um escalar.

Por que:
- isso influencia diretamente a elegibilidade para novas tentativas
- o administrador deve exibir e filtrar com base no limite atual de novas tentativas
- o comportamento do caso deve permanecer estável mesmo que a política padrão de novas tentativas seja alterada posteriormente

Isso significa que:
- `max_attempts` não é apenas uma configuração global;
- é o limite fixo que rege este caso

## 10. `retry_schedule`

`retry_schedule` descreve o instantâneo da política de repetição atribuído a este caso.

### Forma proposta

```ts
type DunningRetrySchedule = {
  strategy: "fixed_intervals"
  intervals: number[]
  timezone: "UTC"
  source: "default_policy" | "manual_override"
}
```

Onde:
- `intervals` são os intervalos de repetição, em minutos, a partir da tentativa anterior que falhou ou do evento de criação do caso

### Decisão de armazenamento

`retry_schedule` deve ser armazenado como JSON.

Por quê:
- são dados políticos estruturados e não um único escalar operacional
- a forma pode evoluir em etapas posteriores
- deve preservar o instantâneo exato do cronograma atribuído ao caso
- a execução do agendador usará principalmente `next_retry_at`, não todo o blob de agendamento para filtragem de lista

Nota importante:
- `retry_schedule` é o instantâneo da política
- `next_retry_at` é o campo de agendamento operacional

## 11. `next_retry_at`

`next_retry_at` é o campo de data de vencimento voltado para o agendador.

Deve ser armazenado explicitamente como um carimbo de data/hora escalar.

Por quê:
- a descoberta do agendador precisa de filtragem direta por data de vencimento
- A lista e os detalhes do administrador devem exibir a próxima nova tentativa agendada
- a filtragem e a classificação por tempo de repetição não devem depender da leitura do JSON

Nota importante:
- se o caso for encerrado, `next_retry_at` geralmente deverá ser `null`
- a regra oficial para quando é definido ou desmarcado pertence a uma etapa posterior da máquina de estados

## 12. Campos de resumo de erros mais recentes

O caso deve armazenar:

- `last_payment_error_code`
- `last_payment_error_message`

Esses são campos de conveniência em nível de caso.

Por que eles pertencem ao caso:
- A lista de administradores precisa de um resumo compacto de falhas
- os fluxos do agendador e operacionais podem precisar do erro mais recente sem ler todas as tentativas
- eles melhoram a visibilidade sem substituir o histórico de tentativas

Nota importante:
- esses campos não são o histórico completo de erros oficial
- o contexto detalhado do erro por tentativa pertence a `DunningAttempt`

## 13. `last_attempt_at`

`last_attempt_at` é um carimbo de data/hora de conveniência em nível de caso.

Por que pertence ao caso:
- útil para classificação e revisão de listas de administradores
- útil para proteções do agendador e raciocínio de tempo limite
- evita recalcular o tempo da última tentativa a partir de registros filhos em cada leitura

## 14. Carimbos de data e hora de fechamento e recuperação

O caso deve armazenar:

- `recovered_at`
- `closed_at`

Por que ambos existem:
- `recovered_at` responde quando a recuperação do pagamento foi bem-sucedida
- `closed_at` responde quando o caso saiu do estado ativo, seja por recuperação ou fechamento do terminal

Semântica recomendada:
- se o caso for encerrado como recuperado, ambos poderão ser definidos com o mesmo carimbo de data/hora
- se o caso for encerrado sem recuperação, `closed_at` é definido e `recovered_at` permanece `null`

## 15. `recovery_reason`

`recovery_reason` deve ser um campo de texto escalar anulável.

Ele armazena o motivo do terminal ou do operador para o resultado da recuperação.

Exemplos:
- `payment_captured`
- `marked_recovered_by_admin`
- `max_attempts_exceeded`
- `marked_unrecovered_by_admin`

Por que deveria ser escalar:
- é importante para a visibilidade do administrador
- pode ser útil para filtragem ou relatórios posteriores
- não deve ser enterrado em metadados

## 16. `metadata`

`metadata` permanece um campo JSON padrão.

Por quê:
- segue o padrão Medusa para dados extras não essenciais
- pode armazenar diagnósticos complementares ou contexto de auditoria
- não deve armazenar campos primários da máquina de estado, contadores de novas tentativas ou datas de vencimento

Exemplos de metadados aceitáveis:
- contexto de recuperação específico do provedor
- notas do operador ainda não modeladas explicitamente
- valores diagnósticos experimentais não essenciais

## 17. Contrato de domínio `DunningAttempt`

Contrato de domínio mínimo:

- `id`
- `dunning_case_id`
- `attempt_no`
- `started_at`
- `finished_at`
- `status`
- `error_code`
- `error_message`
- `payment_reference`
- `metadata`

### Forma lógica proposta

```ts
type DunningAttempt = {
  id: string
  dunning_case_id: string
  attempt_no: number
  started_at: string
  finished_at: string | null
  status: "processing" | "succeeded" | "failed"
  error_code: string | null
  error_message: string | null
  payment_reference: string | null
  metadata: Record<string, unknown> | null
}
```

## 18. Campos `DunningAttempt` regulares

Os seguintes campos devem ser colunas de modelo regulares:

- `id`
- `dunning_case_id`
- `attempt_no`
- `started_at`
- `finished_at`
- `status`
- `error_code`
- `error_message`
- `payment_reference`

Por quê:
- as tentativas devem ser ordenadas e auditáveis
- os registros de tentativas devem suportar recuperação direta e renderização da linha do tempo
- esses campos são dados de tentativas operacionais, não metadados flexíveis

## 19. `DunningAttempt.metadata`

`DunningAttempt.metadata` é opcional e deve permanecer flexível.

Exemplos de metadados aceitáveis:
- detalhes de resposta do provedor não são necessários nas visualizações de lista de administradores padrão
- solicitar IDs de correlação
- contexto de diagnóstico não essencial de uma tentativa

Não deve armazenar:
- o status da tentativa principal
- os carimbos de data/hora da tentativa principal
- os principais campos de resumo de erros já modelados explicitamente

## 20. Por que a história da tentativa não deve viver apenas do caso

Opção rejeitada:
- armazena o histórico de novas tentativas apenas dentro de `DunningCase.retry_schedule` ou `metadata`

Por que é pior:
- fraca auditabilidade operacional
- UX com detalhes de administração ruins
- raciocínio mais difícil sobre novas tentativas e falhas
- inconsistente com o padrão `RenewalCycle` / `RenewalAttempt` já estabelecido

O plugin deve preservar a simetria onde for útil:
- `RenewalCycle` + `RenewalAttempt`
- `DunningCase` + `DunningAttempt`

## 21. Resumo da decisão final

Para a etapa `2.4.3`, as decisões finais são:

- `DunningCase` é o registro operacional primário
- `DunningAttempt` é o registro de histórico filho somente anexado
- status, contadores, IDs, datas de vencimento, resumo de erros mais recentes e carimbos de data/hora de fechamento devem ser campos escalares explícitos
- `retry_schedule` deve ser armazenado como um instantâneo de política JSON
- `metadata` permanece flexível e não essencial
- o histórico técnico em nível de tentativa deve residir em `DunningAttempt`, não apenas no caso
