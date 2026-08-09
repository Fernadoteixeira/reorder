# Reordenar: especificações do modelo de domínio de renovações

Este documento cobre a etapa `2.3.2` de `documentation/implementation_plan.md`.

Objetivo:
- definir o contrato de domínio para `RenewalCycle`
- definir o contrato de domínio para `RenewalAttempt`
- decidir quais dados pertencem aos campos regulares do modelo
- decidir quais dados podem ser armazenados como instantâneos JSON ou metadados
- fornecer uma base estável para fluxos de trabalho, modelos de leitura administrativa e processamento agendado

O design segue os padrões da Medusa:
- um módulo personalizado possui seu domínio operacional
- os campos usados para filtragem, classificação e processamento de filas devem ser armazenados explicitamente
- dados flexíveis ou estilo instantâneo podem ser armazenados como JSON
- o histórico de execução deve ser modelado como uma entidade separada quando tiver seu próprio ciclo de vida e valor de auditoria

## 1. Suposições arquitetônicas

A área `Renovações` possui dois níveis conceituais:

- `Ciclo de Renovação`
- `Tentativa de renovação`

`RenewalCycle` é o registro operacional primário persistido no módulo do plugin.

`RenewalAttempt` é um registro de histórico de execução filho persistido separadamente do ciclo.

Na prática:
- um ciclo representa uma unidade de renovação programada para uma assinatura
- um ciclo pode ter zero ou mais tentativas
- um ciclo agrega o estado operacional atual
- as tentativas preservam o histórico de execução, que é apenas de acréscimo

Essa divisão é intencional:
- o ciclo é a fila e o registro de decisões
- as tentativas são o rastro de auditoria e de solução de problemas

## 2. Limites de responsabilidade

### `RenewalCycle`

O `RenewalCycle` é responsável por:
- identificar a assinatura que está sendo renovada;
- identificar quando o ciclo está programado para ser executado;
- armazenar o estado atual do ciclo de vida do ciclo;
- armazenar o estado de aprovação das alterações pendentes quando for necessária aprovação;
- armazenar a referência do pedido de renovação gerado;
- armazenar o instantâneo das alterações pendentes aprovadas que foram efetivamente aplicadas;
- armazenar os campos de conveniência atuais utilizados pelo processamento da fila e pela Admin

O `RenewalCycle` não é responsável por:
- o estado completo do ciclo de vida da assinatura;
- a origem da política comercial da assinatura;
- o histórico completo das tentativas de execução técnica;
- a semântica direta do provedor de pagamentos

### `RenewalAttempt`

`RenewalAttempt` é responsável por:
- armazenar uma tentativa de execução específica para um ciclo;
- registrar os carimbos de data e hora de início e término;
- registrar se a tentativa foi bem-sucedida ou falhou;
- registrar referências técnicas de pagamento ou de pedido;
- preservar o histórico de solução de problemas e de auditoria

`RenewalAttempt` não é responsável por:
- decidir se o ciclo é elegível para renovação
- ser a fonte de referência para o status de aprovação
- substituir o status agregado armazenado em `RenewalCycle`

## 3. Por que se prefere duas entidades

A estrutura de domínios recomendada utiliza:
- uma entidade primária: `RenewalCycle`
- uma entidade filha: `RenewalAttempt`

Por que essa abordagem é preferível:
- o estado da fila e o histórico de execução são aspectos distintos
- a fila de administração e os detalhes de administração têm requisitos de leitura diferentes
- novas tentativas e falhas múltiplas não devem sobrescrever um único campo mutável do log
- a filtragem no nível do ciclo permanece simples
- a auditoria no nível da tentativa continua sendo apenas de acréscimo e explícita

Alternativa rejeitada:
- armazenar todo o histórico de tentativas apenas em `RenewalCycle.metadata`

Por que é pior:
- mais difícil de filtrar ou inspecionar operacionalmente
- menor capacidade de auditoria
- mapeamento entre leitura e modelo mais complicado
- menos alinhado com os registros de domínio explícitos no estilo Medusa

## 4. Contrato de domínio `RenewalCycle`

Contrato de domínio mínimo:

- `id`
- `subscription_id`
- `scheduled_for`
- `processed_at`
- `status`
- `approval_status`
- `generated_order_id`
- `applied_pending_update_data`
- `last_error`
- `attempt_count`
- `metadata`

### Forma lógica proposta

```ts
type RenewalCycle = {
  id: string
  subscription_id: string
  scheduled_for: string
  processed_at: string | null
  status: "scheduled" | "processing" | "succeeded" | "failed"
  approval_status: "pending" | "approved" | "rejected" | null
  generated_order_id: string | null
  applied_pending_update_data: RenewalAppliedPendingUpdateData | null
  last_error: string | null
  attempt_count: number
  metadata: Record<string, unknown> | null
}
```

## 5. Campos regulares do `RenewalCycle`

Os campos a seguir devem ser colunas normais do modelo:

- `id`
- `subscription_id`
- `scheduled_for`
- `processed_at`
- `status`
- `approval_status`
- `generated_order_id`
- `last_error`
- `attempt_count`

Por que:
- são necessários para filtragem e classificação pelo administrador
- são necessários para o processamento programado da fila
- são necessários para idempotência, lógica de repetição de tentativas e leituras do estado atual
- expressam um estado operacional explícito, em vez de uma configuração flexível

## 6. `applied_pending_update_data`

`applied_pending_update_data` descreve o instantâneo das alterações pendentes que foi efetivamente utilizado durante o processamento da renovação.

### Forma proposta

```ts
type RenewalAppliedPendingUpdateData = {
  variant_id: string
  variant_title: string
  frequency_interval: "week" | "month" | "year"
  frequency_value: number
  effective_at: string | null
}
```

### Decisão sobre armazenamento

`applied_pending_update_data` deve ser armazenado como JSON.

Por que:
- é um instantâneo de um objeto de negócios estruturado
- deve preservar o que foi aplicado no momento da execução
- sua forma é estável o suficiente para ser validada, mas ainda assim agrupada naturalmente como um único objeto
- não deve ser reconstruída a partir de uma leitura de assinatura ativa posteriormente

### Regras de domínio

- é anulável quando nenhuma alteração pendente foi aplicada
- se armazenado, deve representar a mudança exata aprovada materializada durante o ciclo
- é um instantâneo, não um ponteiro ao vivo para o estado atual da assinatura

## 7. `último_erro`

`last_error` é um campo de conveniência em nível de ciclo.

Deve armazenar um resumo compacto da última falha conhecida para exibição operacional e processamento de fila.

Por que pertence ao ciclo:
- As visualizações da fila do administrador precisam de um resumo direto da falha
- trabalhos e novas tentativas não devem precisar inspecionar a coleção completa de tentativas em busca do erro mais recente
- melhora o desempenho de leitura e a visibilidade operacional

Nota importante:
- `last_error` não é o histórico oficial de falhas
- histórico detalhado de erros pertence a `RenewalAttempt`

## 8. `tentativa_contagem`

`attempt_count` é um campo de conveniência em nível de ciclo.

Por que pertence ao ciclo:
- a política de novas tentativas e a lógica da fila geralmente dependem do número de tentativas
- A lista e os detalhes do administrador devem mostrar uma contagem estável sem agregar registros secundários em cada leitura

Nota importante:
- `attempt_count` é derivado do histórico de execução do ciclo no sentido comercial
- ainda pertence a um campo escalar explícito porque é operacionalmente importante

## 9. `metadados`

`metadados` continua sendo um campo JSON padrão.

Por quê:
- segue o padrão Medusa para dados extras não essenciais
- pode armazenar auditoria suplementar ou contexto operacional
- não deve armazenar campos necessários para filtragem primária, classificação ou transições de estado

## 10. Contrato de domínio `RenewalAttempt`

Contrato de domínio mínimo:

- `id`
- `renovação_ciclo_id`
- `tentativa_não`
- `começou_em`
- `terminado_em`
- `estado`
- `código_erro`
- `mensagem_erro`
- `referência_de_pagamento`
- `order_id`
- `metadados`

### Forma lógica proposta

```ts
type RenewalAttempt = {
  id: string
  renewal_cycle_id: string
  attempt_no: number
  started_at: string
  finished_at: string | null
  status: "processing" | "succeeded" | "failed"
  error_code: string | null
  error_message: string | null
  payment_reference: string | null
  order_id: string | null
  metadata: Record<string, unknown> | null
}
```

## 11. Campos `RenewalAttempt` regulares

Os seguintes campos devem ser colunas de modelo regulares:

- `id`
- `renovação_ciclo_id`
- `tentativa_não`
- `começou_em`
- `terminado_em`
- `estado`
- `código_erro`
- `mensagem_erro`
- `referência_de_pagamento`
- `order_id`

Por quê:
- as tentativas devem ser ordenadas e auditáveis
- os registros de tentativas devem suportar recuperação direta e renderização da linha do tempo
- esses campos são dados operacionais, não metadados flexíveis

## 12. Metadados `RenewalAttempt`

`RenewalAttempt.metadata` é opcional e deve permanecer flexível.

Exemplos de metadados aceitáveis:
- referências de resposta específicas do provedor
- contexto bruto de solução de problemas não necessário para filtragem de administrador padrão
- valores de diagnóstico não essenciais

Não deve armazenar:
- o status da tentativa principal
- timestamps usados na linha do tempo
- identificadores necessários para vincular tentativas a ciclos ou pedidos

## 13. Semântica de relacionamento

O relacionamento de domínio é:
- um `RenewalCycle` tem muitos registros `RenewalAttempt`
- um `RenewalAttempt` pertence a um `RenewalCycle`

Significado:
- `RenewalCycle` é a raiz agregada para leituras e decisões operacionais
- `RenewalAttempt` é a entidade filha do log de execução

### Campos de conveniência em nível de ciclo versus histórico de tentativas

A divisão recomendada é:
- `RenewalCycle.last_error` armazena apenas o resumo mais recente
- `RenewalCycle.attempt_count` armazena apenas a contagem atual
- `RenewalAttempt` armazena o histórico real de execução

Isso mantém as leituras do estado atual rápidas sem perder a auditabilidade.

## 14. Semântica de aprovação

`approval_status` pertence a `RenewalCycle`, não a `RenewalAttempt`.

Por quê:
- a aprovação é uma decisão comercial sobre se o ciclo pode aplicar alterações pendentes
- a aprovação é uma propriedade do ciclo como um todo
- as tentativas são executadas sob o estado de aprovação do ciclo, mas não o possuem

Semântica recomendada:
- `null` significa que a aprovação não é necessária para este ciclo
- `pendente` significa que a aprovação é necessária e ainda não foi decidida
- `aprovado` significa que o ciclo pode aplicar alterações pendentes
- `rejeitado` significa que o ciclo não deve aplicar alterações pendentes

## 15. Semântica de ordem

`generated_order_id` pertence a `RenewalCycle`.

Por quê:
- um ciclo bem sucedido deve expor diretamente a ordem resultante
- A lista de administradores e as visualizações detalhadas não devem depender de tentativas de digitalização para encontrar o pedido vencedor

`RenewalAttempt.order_id` permanece útil porque:
- as tentativas podem falhar antes da criação do pedido
- a solução de problemas pode exigir saber qual tentativa criou ou tentou criar um pedido
- o ciclo ainda deve manter o resultado final como campo de conveniência

## 16. Orientação sobre a fonte da verdade

O módulo `Renovações` deve tratar:
- `RenewalCycle` como fonte de verdade para o atual estado de renovação operacional
- `RenewalAttempt` como fonte de verdade para o histórico de execução

Não deve tratar:
- `Subscription.pending_update_data` como fonte histórica do que foi aplicado
- uma ordem de renovação gerada como fonte de verdade para o estado do ciclo

É por isso que `applied_pending_update_data` deve persistir no ciclo quando usado.

## 17. Resumo escalar vs JSON

Use campos escalares para:
- identificadores
- status
- carimbos de data e hora
- contadores
- campos de processamento de fila
- campos usados na filtragem e classificação

Use JSON para:
- `applied_pending_update_data`
- `metadados`

Isso corresponde às práticas recomendadas da Medusa:
- estado estruturado explícito para operações principais
- JSON flexível apenas para instantâneos ou contexto suplementar

## 18. Impacto nas etapas posteriores

Este contrato implica:
- o próximo passo deve decidir como mapear esses contratos em modelos de persistência finais
- o modelo de leitura deve tratar `RenewalCycle` como a raiz da lista/detalhe
- o histórico de tentativas deve ser consultado separadamente ou unido como uma coleção filha para visualizações detalhadas
- o design do fluxo de trabalho deve atualizar o estado do ciclo e o histórico de tentativas de forma consistente

Isso também implica que DTOs e fluxos de trabalho administrativos posteriores devem evitar o colapso do histórico de tentativas em um campo de ciclo mutável.
