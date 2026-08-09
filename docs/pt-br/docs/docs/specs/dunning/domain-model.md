# Reordenar: especificação do modelo de domínio de cobrança

Este documento cobre a etapa `2.4.3` de `documentation/implementation_plan.md`.

Objetivo:
- definir o contrato de domínio para `DunningCase`
- definir o contrato de domínio para `DunningAttempt`
- decidir quais dados pertencem aos campos regulares do modelo
- decidir quais dados devem ser armazenados como instantâneos JSON ou metadados
- fornece uma base estável para fluxos de trabalho, leituras administrativas e agendamento de novas tentativas

Esta especificação se baseia em:
- `reordenar/docs/specs/dunning/trigger-entry.md`
- `reordenar/docs/specs/dunning/source-of-truth-semantics.md`
- `reordenar/docs/specs/renewals/domain-model.md`

O design segue os padrões da Medusa:
- um módulo personalizado possui um agregado operacional explícito
- os campos usados para filtragem, classificação, agendamento e transições de estado devem ser armazenados explicitamente
- o histórico de novas tentativas deve ser modelado como uma entidade separada quando tiver valor operacional e de auditoria
- JSON é apropriado para instantâneos de política de repetição e diagnósticos flexíveis, não para campos primários de máquina de estado

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para o contrato de domínio
- a fonte da verdade do tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Suposições arquitetônicas

A área `Dunning` possui dois níveis conceituais:

- `DunningCase`
- `Tentativa de Dunning`

`DunningCase` é o registro operacional primário persistido no módulo plugin.

`DunningAttempt` é um registro de tentativa de recuperação infantil persistido separadamente do caso.

Na prática:
- um caso representa um evento de dívida cobrável falhada para uma assinatura
- um caso está ancorado a um ciclo de renovação originário
- um caso pode ter zero ou mais tentativas de recuperação
- um caso agrega o estado de recuperação atual
- as tentativas preservam o histórico de recuperação somente de acréscimos

Esta divisão é intencional:
- o caso é a fila e o registro de decisão
- as tentativas são a trilha de auditoria e solução de problemas

## 2. Limites de responsabilidade

### `DunningCase`

`DunningCase` é responsável por:
- identificar a assinatura em recuperação
- identificar o ciclo de renovação originário
- armazenar o estado atual do ciclo de vida do caso de recuperação
- armazenar contadores de novas tentativas e campos de agendamento
- armazenar o resumo de erros de recuperação de pagamento mais recente
- armazenar o resumo de fechamento e recuperação
- armazenar campos de conveniência atuais usados pelo agendamento e pelo administrador

`DunningCase` não é responsável por:
- o estado completo do ciclo de vida da assinatura
- a máquina de estado de execução do ciclo de renovação originário
- o histórico completo de tentativas de recuperação técnica
- ser a fonte oficial da configuração atual do provedor de pagamento

### `Tentativa de cobrança`

`DunningAttempt` é responsável por:
- armazenar uma tentativa concreta de recuperação para um caso
- registros de data e hora de início e término da gravação
- registrar o sucesso ou fracasso da tentativa
- registrar referências técnicas de pagamento e detalhes de erros
- preservando a solução de problemas e o histórico de auditoria

`DunningAttempt` não é responsável por:
- decidir se um caso deve existir
- ser a fonte da verdade para o status do caso
- substituindo o estado agregado armazenado em `DunningCase`

## 3. Por que duas entidades são preferidas

A estrutura de domínio recomendada usa:
- uma entidade primária: `DunningCase`
- uma entidade filha: `DunningAttempt`

Por que isso é preferido:
- o estado da fila e o histórico de recuperação são preocupações diferentes
- A lista de administradores e os detalhes do administrador têm requisitos de leitura diferentes
- múltiplas tentativas não devem substituir um campo de log mutável
- a filtragem em nível de caso permanece simples
- a auditoria em nível de tentativa permanece apenas anexada e explícita

Alternativa rejeitada:
- armazene todo o histórico de novas tentativas apenas em `DunningCase.metadata`

Por que é pior:
- mais difícil de inspecionar operacionalmente
- auditabilidade mais fraca
- mais difícil tentar novamente a renderização da linha do tempo
- menos alinhado com o padrão já estabelecido de “Renovações”

## 4. Contrato de domínio `DunningCase`

Contrato de domínio mínimo:

- `id`
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `estado`
- `tentativa_contagem`
- `max_attempts`
- `retry_schedule`
- `next_retry_at`
- `último_pagamento_error_code`
- `último_pagamento_erro_mensagem`
- `última_tentativa_em`
- `recuperado_em`
- `fechado_em`
- `motivo_de_recuperação`
- `metadados`

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

## 5. Campos regulares `DunningCase`

Os seguintes campos devem ser colunas de modelo regulares:

- `id`
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `estado`
- `tentativa_contagem`
- `max_attempts`
- `next_retry_at`
- `último_pagamento_error_code`
- `último_pagamento_erro_mensagem`
- `última_tentativa_em`
- `recuperado_em`
- `fechado_em`
- `motivo_de_recuperação`

Por quê:
- eles são necessários para filtragem e classificação do administrador
- eles são necessários para agendamento de novas tentativas e descoberta de filas
- eles são necessários para transições de status operacional
- eles são necessários para regras de exclusividade e fechamento
- expressam estado operacional explícito em vez de configuração flexível

## 6. Por que os IDs devem ser campos escalares

O modelo deve armazenar estes campos escalares explícitos:

- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`

Por quê:
- eles simplificam a filtragem e a indexação
- eles simplificam as consultas do agendador e do administrador
- preservam o mesmo padrão prático da Medusa já usado em `Assinaturas` e `Renovações`
- links de módulos ainda podem ser adicionados posteriormente sem perder o acesso eficiente ao registro de origem

## 7. `status`

`status` é o campo da máquina de estado em nível de caso.

Ele responde:
- qual é o estado operacional atual do caso de recuperação

Deve ser um campo enum escalar, não JSON.

Por quê:
- o status do caso impulsiona a elegibilidade do agendador
- o status do caso impulsiona as ações do administrador
- o status do caso é um campo primário de filtragem e classificação

As regras exatas de transição pertencem a uma etapa posterior, mas o contrato de domínio deve reservar estes valores:

- `abrir`
- `retry_scheduled`
- `tentando novamente`
- `aguardando_resolução_manual`
- `recuperado`
- `não recuperado`

## 8. `tentativa_contagem`

`attempt_count` é um campo de conveniência em nível de caso.

Por que pertence ao caso:
- a política de novas tentativas depende do número de tentativas
- A lista e os detalhes do administrador devem mostrar uma contagem estável sem agregar registros secundários em cada leitura
- a lógica do escalonador não deve precisar consultar todas as tentativas para saber se o limite está próximo ou excedido

Nota importante:
- `attempt_count` é derivado da história no sentido comercial
- ainda pertence a um campo escalar explícito porque é operacionalmente importante

## 9. `max_attempts`

`max_attempts` é um campo de instantâneo de política em nível de caso, mas ainda deve ser armazenado explicitamente como um escalar.

Por quê:
- participa diretamente na elegibilidade para novas tentativas
- O administrador deve exibir e filtrar o limite de novas tentativas atual
- o comportamento do caso deve permanecer estável mesmo se a política de repetição padrão for alterada posteriormente

Isso significa:
- `max_attempts` não é apenas uma configuração global
- é o limite congelado que rege este caso

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
- `intervalos` são compensações de repetição em minutos da tentativa anterior falhada ou evento de criação de caso

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
- se o caso for encerrado, `next_retry_at` geralmente deve ser `null`
- a regra oficial para quando é definido ou desmarcado pertence a uma etapa posterior da máquina de estados

## 12. Campos de resumo de erros mais recentes

O caso deve armazenar:

- `último_pagamento_error_code`
- `último_pagamento_erro_mensagem`

Esses são campos de conveniência em nível de caso.

Por que eles pertencem ao caso:
- A lista de administradores precisa de um resumo compacto de falhas
- os fluxos do agendador e operacionais podem precisar do erro mais recente sem ler todas as tentativas
- eles melhoram a visibilidade sem substituir o histórico de tentativas

Nota importante:
- esses campos não são o histórico completo de erros oficial
- o contexto detalhado do erro por tentativa pertence a `DunningAttempt`

## 13. `última_tentativa_em`

`last_attempt_at` é um carimbo de data/hora conveniente em nível de caso.

Por que pertence ao caso:
- útil para classificação e revisão de listas de administradores
- útil para proteções do agendador e raciocínio de tempo limite
- evita recalcular o tempo da última tentativa a partir de registros filhos em cada leitura

## 14. Carimbos de data e hora de fechamento e recuperação

O caso deve armazenar:

- `recuperado_em`
- `fechado_em`

Por que ambos existem:
- `recovered_at` responde quando a recuperação do pagamento foi bem-sucedida
- `closed_at` responde quando o caso saiu do estado ativo, seja por recuperação ou fechamento do terminal

Semântica recomendada:
- se o caso for encerrado como recuperado, ambos poderão ser definidos com o mesmo carimbo de data/hora
- se o caso for encerrado sem recuperação, `closed_at` será definido e `recovered_at` permanecerá `null`

## 15. `motivo_de_recuperação`

`recovery_reason` deve ser um campo de texto escalar anulável.

Ele armazena o motivo do terminal ou do operador para o resultado da recuperação.

Exemplos:
- `payment_captured`
- `marked_recovered_by_admin`
- `max_attempts_exceeded`
- `marked_unrecovered_by_admin`

Por que deve ser escalar:
- é importante para a visibilidade do administrador
- pode ser útil para filtragem ou geração de relatórios posteriores
- não deve ficar oculto nos metadados

## 16. `metadados`

`metadata` continua sendo um campo JSON padrão.

Por que:
- isso segue o padrão Medusa para dados adicionais não essenciais
- pode armazenar diagnósticos complementares ou contexto de auditoria
- não deve armazenar campos primários da máquina de estados, contadores de tentativas ou prazos

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

## 18. Campos padrão do `DunningAttempt`

Os campos a seguir devem ser colunas normais do modelo:

- `id`
- `dunning_case_id`
- `attempt_no`
- `started_at`
- `finished_at`
- `status`
- `error_code`
- `error_message`
- `payment_reference`

Por que:
- as tentativas devem estar ordenadas e ser auditáveis
- os registros das tentativas devem permitir a recuperação direta e a visualização em linha do tempo
- esses campos são dados operacionais das tentativas, não metadados flexíveis

## 19. `DunningAttempt.metadata`

`DunningAttempt.metadata` é opcional e deve permanecer flexível.

Exemplos de metadados aceitáveis:
- detalhes da resposta do provedor que não são necessários nas visualizações padrão da lista do Admin
- IDs de correlação de solicitações
- contexto de diagnóstico não essencial de uma tentativa

Não deve armazenar:
- o status da tentativa principal
- os carimbos de data e hora da tentativa principal
- os principais campos de resumo de erros já modelados explicitamente

## 20. Por que a interpretação da história não deve basear-se apenas no caso específico

Opção rejeitada:
- armazenar o histórico de tentativas apenas em `DunningCase.retry_schedule` ou `metadata`

Por que é pior:
- baixa auditabilidade operacional
- experiência do usuário (UX) deficiente na seção de administração
- maior dificuldade para entender as tentativas de repetição e as falhas
- inconsistência com o padrão já estabelecido de `RenewalCycle` / `RenewalAttempt`

O plug-in deve preservar a simetria nos casos em que isso for útil:
- `RenewalCycle` + `RenewalAttempt`
- `DunningCase` + `DunningAttempt`

## 21. Resumo da decisão final

Para a etapa `2.4.3`, as decisões finais são:

- `DunningCase` é o registro operacional principal
- `DunningAttempt` é o registro filho do histórico, que só permite adições;
- status, contadores, IDs, datas de vencimento, resumo do último erro e carimbos de data/hora de encerramento devem ser campos escalares explícitos;
- `retry_schedule` deve ser armazenado como um instantâneo de política em JSON;
- `metadata` permanece flexível e não é parte do núcleo;
- o histórico técnico no nível da tentativa deve constar em `DunningAttempt`, e não apenas no caso
