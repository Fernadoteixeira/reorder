# Reordenar: especificações finais do modelo de dados de renovações

Este documento cobre a etapa `2.3.4` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de persistência final para `Renovações`
- decidir se a área deve usar uma entidade, duas entidades ou um híbrido de estilo de evento
- definir relações com assinaturas e pedidos gerados
- definir os campos necessários para detalhes administrativos, auditabilidade e processamento de filas
- decidir aonde pertencem os metadados de aprovação

Esta especificação se baseia em:
- `reordenar/docs/specs/renewals/admin-spec.md`
- `reordenar/docs/specs/renewals/domain-model.md`
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`

O design segue os padrões da Medusa:
- módulos personalizados possuem seus próprios modelos de dados
- relações dentro do mesmo módulo devem usar relacionamentos de modelo
- relações com outros módulos devem usar links de módulos
- os campos usados para processamento de filas, filtragem, classificação e decisões operacionais devem ser armazenados explicitamente
- JSON é apropriado para instantâneos e metadados flexíveis, não para campos primários de máquina de estado

## 1. Resumo da decisão de design

O design final deve usar:
- uma entidade de persistência primária: `RenewalCycle`
- uma entidade de persistência filha: `RenewalAttempt`

A estratégia de aprovação final deve ser:
- o estado de aprovação atual permanece em `RenewalCycle`
- o resumo da auditoria de aprovação também reside no `RenewalCycle`
- nenhuma entidade de evento de aprovação separada no MVP

Isso significa:
- não modelamos renovações apenas como campos de assinatura
- não armazenamos histórico de tentativas apenas em `metadados`
- não introduzimos um fluxo `renewal_event` separado no MVP

## 2. Por que duas entidades de persistência são preferidas

Modelo recomendado:
- `Ciclo de Renovação`
- `Tentativa de renovação`

Por que isso é preferível a uma única entidade `RenewalCycle`:
- o histórico de execução tem seu próprio ciclo de vida e valor de auditoria
- as novas tentativas devem ser rastreáveis como registros separados
- Os detalhes do administrador precisam de um cronograma de tentativa explícito
- manter o histórico de tentativas apenas no ciclo tornaria o modelo de leitura e a lógica do fluxo de trabalho mais difíceis de raciocinar

Por que isso é preferível a um design de estilo de evento maior:
- O MVP precisa mais de clareza operacional do que de flexibilidade no fornecimento de eventos
- um fluxo de eventos separado acrescentaria complexidade sem valor imediato do produto
- ciclo + tentativa já cobre estado da fila, histórico e solução de problemas

## 3. Alternativas rejeitadas

### 3.1 Projeto de entidade única

Opção rejeitada:
- apenas `RenewalCycle`, com histórico de tentativas em `metadados` ou matrizes JSON

Por que é pior:
- mais difícil de auditar
- mais difícil de exibir cronogramas de tentativas
- semântica de repetição mais fraca
- mais frágil para filtragem e análises futuras

### 3.2 Design somente para eventos

Opção rejeitada:
- `Ciclo de Renovação`
- `RenewalEvent` genérico
- opcional `RenewalAttempt` derivado de eventos

Por que é pior para o MVP:
- muita indireção para o caso de uso atual do administrador
- a semântica de aprovação, nova tentativa e geração de pedidos se torna mais difícil de ler
- maior implementação e complexidade do modelo de leitura

## 4. Modelo de persistência final

A camada de persistência deve girar em torno de:
- uma raiz agregada: `RenewalCycle`
- uma entidade de histórico filho: `RenewalAttempt`

### 4.1 `Ciclo de Renovação`

`RenewalCycle` é a fila e o registro do estado de execução.

### Campos persistentes propostos

Campos simples:
- `id`
- `subscrição_id`
- `agendado_para`
- `processado_em`
- `estado`
- `status_aprovação`
- `aprovação_requerida`
- `aprovação_decidida_em`
- `aprovação_decidida_por`
- `motivo_aprovação`
- `generated_order_id`
- `último_erro`
- `tentativa_contagem`

Campos JSON:
- `applied_pending_update_data`
- `metadados`

Carimbos de data e hora:
- Carimbos de data e hora padrão da Medusa, como `created_at` e `updated_at`

### 4.2 `Tentativa de renovação`

`RenewalAttempt` é o registro do histórico de execução.

### Campos persistentes propostos

Campos simples:
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

Campos JSON:
- `metadados`

Carimbos de data e hora:
- Carimbos de data e hora padrão da Medusa, como `created_at` e `updated_at`

## 5. Por que `approval_required` é explícito

O modelo deve armazenar ambos:
- `aprovação_requerida`
- `status_aprovação`

Por quê:
- `approval_status = null` é mais fácil de interpretar quando significa “não decidido ou não aplicável”, mas o administrador e os fluxos de trabalho também precisam saber se a aprovação é necessária
- um booleano explícito evita semântica ambígua no processamento de filas
- filtragem e decisões operacionais tornam-se mais simples

Significado recomendado:
- `approval_required = false` significa que não é necessária aprovação para este ciclo
- `approval_required = true` significa que o ciclo é regido por `approval_status`

## 6. Por que os metadados de aprovação devem constar no `RenewalCycle`

O MVP deve manter os metadados de aprovação no `RenewalCycle`, e não em uma entidade de evento de aprovação separada.

Campos recomendados:
- `approval_required`
- `approval_status`
- `approval_decided_at`
- `approval_decided_by`
- `approval_reason`

Por que essa abordagem é preferível:
- a aprovação representa o estado operacional atual do ciclo
- a lista de administradores e os detalhes precisam de acesso direto aos campos de aprovação
- o fluxo de trabalho pode atualizar uma entidade como raiz agregada
- o escopo atual do produto não exige sourcing completo de eventos de aprovação

Alternativa rejeitada:
- `RenewalApprovalEvent` separado

Motivos da rejeição:
- aumenta a complexidade das junções e das consultas
- duplica a lógica de reconstrução do estado atual
- é desnecessário até que haja uma necessidade real de múltiplas decisões de aprovação por ciclo

## 7. Decisões entre Scalar e JSON

Use colunas escalares para:
- identificadores
- status
- valores booleanos
- carimbos de data/hora
- campos de processamento em fila
- campos de conveniência usados em filtragem e classificação

Use JSON para:
- `applied_pending_update_data`
- `metadata`

Por que:
- `applied_pending_update_data` é um instantâneo estruturado do que foi efetivamente aplicado
- `metadata` destina-se a extensões flexíveis que não fazem parte do núcleo
- os status de ciclo e de tentativa devem permanecer como campos explícitos do modelo, e não como JSON

## 8. `applied_pending_update_data`

Este campo deve ser armazenado no `RenewalCycle` no formato JSON.

Por que:
- é o instantâneo da execução da alteração aprovada que foi efetivamente utilizada no ciclo
- faz parte do histórico do ciclo
- deve permanecer disponível mesmo que a assinatura seja alterada posteriormente

Isso não deve ser armazenado apenas na assinatura porque:
- a assinatura possui o estado de visualização;
- o ciclo possui o histórico de execução

## 9. Estratégia de relações dentro do módulo

A relação entre `RenewalCycle` e `RenewalAttempt` deve ser uma relação interna dentro do mesmo módulo.

Semântica recomendada:
- um `RenewalCycle` possui vários registros `RenewalAttempt`
- um `RenewalAttempt` pertence a um `RenewalCycle`

Por que:
- trata-se de uma relação entre modelos de dados dentro do mesmo módulo
- os links do módulo Medusa servem para estabelecer limites de isolamento entre módulos, e não para relações entre entidades internas

## 10. Estratégia de relacionamento entre os módulos

O módulo `renewal` deve manter IDs escalares e também definir ligações a módulos externos, quando necessário.

### `subscription_id`

`RenewalCycle` deve armazenar:
- `subscription_id` como um campo escalar

E o módulo deverá definir posteriormente:
- uma ligação entre `renewal_cycle` e `subscription`

Por que ambos são necessários:
- o ID escalar permite operações de filtragem, indexação e fila
- o link de módulo permite leituras entre módulos sem comprometer o isolamento

### `generated_order_id`

`RenewalCycle` deve armazenar:
- `generated_order_id` como um campo escalar

E o módulo deverá definir posteriormente:
- uma ligação entre `renewal_cycle` e `order`

Por que:
- A lista e os detalhes do administrador devem exibir rapidamente o pedido resultante
- As leituras vinculadas devem continuar seguindo as regras de isolamento do Medusa

### `RenewalAttempt.order_id`

`RenewalAttempt` deve armazenar:
- `order_id` como um campo escalar

Motivo:
- uma tentativa pode criar ou fazer referência a um pedido independentemente do resumo do ciclo
- a solução de problemas não deve exigir apenas a resolução do pedido final do ciclo

### `referência_de_pagamento`

`payment_reference` deve permanecer um campo de texto escalar em `RenewalAttempt`.

Razão:
- são dados de diagnóstico operacional
- ainda não justifica um link ou relação dedicada no MVP

## 11. Campos de instantâneo e auditoria necessários para detalhes do administrador

Para o MVP atual, o modelo de dados deve oferecer suporte aos detalhes do administrador com:
- resumo de aprovação no ciclo
- instantâneo de alteração pendente aplicado no ciclo
- referência de pedido gerada no ciclo
- resumo do último erro no ciclo
- dados da linha do tempo da tentativa na entidade da tentativa

O modelo não precisa armazenar cópias completas de:
- instantâneos de assinatura novamente no ciclo
- instantâneos do produto novamente no ciclo
- instantâneos do cliente novamente no ciclo

Por quê:
- estes já pertencem a `Assinatura`
- a duplicação deve ser evitada, a menos que o histórico de execução realmente exija uma cópia desanexada
- os detalhes do administrador atual podem combinar o contexto de assinatura vinculado com dados de execução específicos do ciclo

## 12. Campos de conveniência

O modelo final deve manter os campos de conveniência em `RenewalCycle`:
- `último_erro`
- `tentativa_contagem`
- `generated_order_id`

Por quê:
- A renderização da fila de administração não deve agregar registros filho em cada leitura
- trabalhos e lógica de novas tentativas devem funcionar a partir do ciclo agregado de forma eficiente
- o ciclo continua sendo a raiz operacional

## 13. Propriedade de status

### `RenewalCycle.status`

Propriedade do agregado do ciclo.

Ele responde:
- onde o ciclo está em seu ciclo de vida de execução

### `RenewalAttempt.status`

Propriedade do registro de tentativa.

Ele responde:
- o resultado de uma tentativa concreta de execução

Esses status devem permanecer separados.

O status do ciclo não deve ser inferido sempre apenas a partir do histórico de tentativas.

## 14. Implicações de indexação

O modelo de dados final implica índices posteriores pelo menos para:

`Ciclo de Renovação`
- `subscrição_id`
- `agendado_para`
- `estado`
- `aprovação_requerida`
- `status_aprovação`
- `generated_order_id`

`Tentativa de renovação`
- `renovação_ciclo_id`
- `tentativa_não`
- `estado`
- `começou_em`
- `terminado_em`

Esses índices devem suportar:
- seleção de fila
- Filtragem de administrador
- carregamento de detalhes
- tentar ordenar a linha do tempo

## 15. Recomendação final

O modelo de persistência MVP recomendado é:

- `Ciclo de Renovação`
  - raiz agregada
  - estado de execução atual
  - estado de aprovação
  - referência do pedido resultante
  - instantâneo de alteração pendente aplicado
  - campos de conveniência adequados para filas

- `Tentativa de renovação`
  - histórico filho somente anexado
  - carimbos de data/hora de execução
  - contexto de falha técnica
  - referências de pagamento e pedido

Nenhuma entidade de evento de aprovação separada é necessária no MVP.

Se o domínio exigir posteriormente:
- múltiplas ações de aprovação
- trilhas de auditoria mais ricas
- cronogramas de comentários do operador
- eventos operacionais sem tentativa

então, um modelo no estilo `RenewalEvent` pode ser introduzido posteriormente sem invalidar a estrutura principal do ciclo + tentativa.

## 16. Impacto nas etapas posteriores

Este modelo final significa:
- a implementação do módulo `renovação` deve exportar dois modelos de dados
- relacionamentos de mesmo módulo devem ser usados entre ciclo e tentativa
- os links do módulo devem posteriormente conectar o ciclo a `subscrição` e `pedido`
- os fluxos de trabalho devem atualizar o agregado do ciclo e anexar tentativas explicitamente
- o modelo de leitura Admin deve usar `RenewalCycle` como raiz para lista/detalhe e anexar tentativas para leituras de detalhes
