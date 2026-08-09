# Reordenar: fonte de verdade de renovações e especificações de semântica de renovação

Este documento cobre a etapa `2.3.3` de `documentation/implementation_plan.md`.

Objetivo:
- definir as regras da fonte da verdade para a execução da renovação
- definir como os instantâneos de assinatura serão usados durante a renovação
- definir quando `pending_update_data` é apenas o estado de visualização e quando se torna uma entrada executável
- definir quando a aprovação é necessária
- definir como `Plans & Offers` afeta a execução da renovação
- definir o limite entre o estado da assinatura e o estado do ciclo de renovação

Esta especificação se baseia em:
- `reorder/docs/specs/subscriptions/domain-model.md`
- `reorder/docs/specs/plan-offers/effective-config-semantics.md`
- `reorder/docs/specs/renewals/domain-model.md`

A direção segue os padrões da Medusa:
- um módulo deve ter uma fonte clara de verdade sobre seu estado operacional
- os fluxos de trabalho devem consumir dados de domínio explícitos, não suposições implícitas da interface do usuário
- snapshots devem ser usados onde a execução histórica deve permanecer estável
- o estado computado entre módulos deve ser resolvido novamente quando a validação do negócio exigir a política atual

Status de implementação:
- a área `Renewals` agora está implementada
- tratar este documento como contexto de tempo de design e justificativa de fonte de verdade
- a fonte atual da verdade em tempo de execução reside em:
  - `reorder/docs/architecture/renewals.md`
  - `reorder/docs/api/admin-renewals.md`
  - `reorder/docs/admin/renewals.md`
  - `reorder/docs/testing/renewals.md`

## 1. Semântica central

A área `Renewals` tem três preocupações distintas:

- estado operacional da assinatura
- estado de execução do ciclo de renovação
- validação da política comercial atual

Estas preocupações não devem ser misturadas.

### Estado operacional da assinatura

O estado operacional da assinatura reside no módulo `subscription`.

Inclui:
- status atual da assinatura
- produto e variante atualmente assinados
- campos de cadência atuais
- endereço de entrega atual
- instantâneos atuais de clientes, produtos e preços
- atual `pending_update_data`

### Estado de execução do ciclo de renovação

O estado de execução do ciclo de renovação reside no módulo `renewal`.

Inclui:
- quando um ciclo está programado
- se o ciclo está sendo processado, bem-sucedido ou falhou
- se a aprovação é necessária ou já foi decidida
- qual pedido foi gerado por esse ciclo
- quais alterações pendentes foram realmente aplicadas naquele ciclo
- quais tentativas foram feitas para executar o ciclo

### Validação da política comercial atual

A validação da política comercial atual é derivada de `Plans & Offers`.

Não persiste como fonte de verdade a longo prazo de uma assinatura ou de um ciclo de renovação.

É resolvido novamente quando as regras de negócios exigem a verificação se uma renovação ainda é permitida na configuração da oferta ativa.

## 2. Fonte da verdade por preocupação

### Fonte da verdade da assinatura

A fonte da verdade da assinatura do cliente permanece `Subscription`.

O registro `subscription` possui:
- cadência ativa
- produto ativo e variante
- status do ciclo de vida
- âncora de agendamento da próxima renovação
- instantâneos operacionais atuais
- alterações pendentes, mas ainda não aplicadas

### Fonte de renovação da verdade

A fonte da verdade para a execução da renovação permanece `RenewalCycle`.

O registro `renewal_cycle` possui:
- o estado de execução de uma unidade de renovação
- estado de aprovação para essa unidade
- a referência do pedido de renovação resultante
- o instantâneo de alteração pendente aplicado, se houver

### Fonte da verdade do histórico de tentativas

A fonte da verdade para o histórico de novas tentativas e execuções permanece `RenewalAttempt`.

As tentativas não substituem o estado agregado do ciclo.

### Fonte da verdade da política de oferta

A fonte da verdade para frequências permitidas e regras de oferta permanece `PlanOffer`.

`ProductSubscriptionConfig` é o estado derivado resolvido de `PlanOffer` no momento da leitura ou validação.

## 3. Quais dados constroem um pedido de renovação

O pedido de renovação deve ser construído a partir do estado operacional atual da assinatura, opcionalmente modificado por alterações pendentes aprovadas.

O conjunto de origem deve ser:
- campos escalares `Subscription` atuais
- instantâneos de assinatura necessários para execução de renovação estável
- instantâneo do endereço de envio da assinatura
- aprovado e aplicável `pending_update_data`
- configuração efetiva atual de `Plans & Offers` apenas para validação, não como fonte de carga útil do pedido principal

### Campos de origem primários

O fluxo de renovação deve tratar estes campos `Subscription` como entrada principal:
- `subscription.id`
- `status`
- `product_id`
- `variant_id`
- `frequency_interval`
- `frequency_value`
- `shipping_address`
- `customer_snapshot`
- `product_snapshot`
- `pricing_snapshot`
- `pending_update_data`

### Por que as leituras ao vivo não são a fonte primária

A execução da renovação não deve depender principalmente de leituras ao vivo de:
- dados do perfil do cliente
- dados do título do produto
- título da variante ou dados SKU

Por quê:
- a assinatura já armazena instantâneos operacionais
- a execução da renovação precisa de um contexto estável e repetível
- Os fluxos de administração e auditoria devem ser capazes de explicar o que foi usado durante a execução

Leituras ao vivo ainda podem ser usadas:
- para validação de política
- para enriquecimento de exibição vinculada
- para dependências internas de criação de pedidos, quando exigido pelo design posterior do fluxo de trabalho

Mas não devem substituir o próprio estado operacional da assinatura como principal insumo.

## 4. Como os instantâneos de assinatura são usados

### Instantâneo do cliente

`customer_snapshot` é usado como contexto de cliente de renovação estável.

Deve apoiar:
- auditabilidade
- Legibilidade do administrador
- reconstrução posterior do contexto da ordem

Não substitui as referências dos clientes dos provedores de pagamento, se estas forem necessárias posteriormente.

### Instantâneo do produto

`product_snapshot` é usado como instantâneo de comércio de assinatura estável.

Deve preservar:
- título do produto
- título da variante
-SKU

Isso mantém os detalhes da renovação e do ciclo histórico compreensíveis, mesmo que os dados de exibição do produto sejam alterados posteriormente.

### Instantâneo de preços

`pricing_snapshot` é o contexto estável de preços de assinatura.

Deve representar a visualização de preços atualmente ativa na assinatura antes que um novo ciclo de renovação seja executado.

Nota importante:
- `pricing_snapshot` não é a fonte da verdade sobre se uma mudança futura ainda é permitida
- essa validação da política pertence a `Plans & Offers`

### Instantâneo do endereço de entrega

`shipping_address` é o endereço de atendimento operacional para execução de renovação.

As renovações devem usar o instantâneo do endereço de entrega da assinatura, e não os endereços globais atuais do cliente.

## 5. Semântica `pending_update_data`

`pending_update_data` pertence a `Subscription`.

É um estado de assinatura transitório, não um estado de ciclo de renovação.

### Antes da execução da renovação

Antes de um ciclo ser executado:
- `pending_update_data` é apenas uma prévia de uma mudança futura
- ainda não substitui a cadência ou variante de assinatura ativa
- pode exigir aprovação antes de se tornar uma entrada executável

### Durante a execução da renovação

Durante um ciclo de renovação:
- o fluxo de trabalho determina se `pending_update_data` é aplicável para este ciclo
- se aplicável e permitido, torna-se entrada de execução candidata
- se aplicado, o ciclo armazena um instantâneo em `RenewalCycle.applied_pending_update_data`

### Após a execução da renovação

Se uma renovação for bem-sucedida com alterações pendentes aplicadas:
- essas alterações devem ser materializadas de volta ao estado ativo `Subscription`
- os campos ativos da assinatura deverão ser atualizados
- `pending_update_data` deve ser limpo ou de outra forma transferido para fora do estado de visualização

Se uma renovação não aplicar alterações pendentes:
- `pending_update_data` permanece no estado de visualização na assinatura
- o ciclo não deve fingir que essas alterações foram utilizadas

## 6. Quando `pending_update_data` é aplicável

`pending_update_data` só deve ser considerado para um ciclo quando todas as afirmações a seguir forem verdadeiras:
- a assinatura é elegível para renovação
- `pending_update_data` existe
- a mudança é efetiva para este ciclo de renovação
- os requisitos de aprovação são satisfeitos
- a mudança ainda passa na validação da política de oferta no tempo de execução

Isso significa que `pending_update_data` não é automaticamente executável apenas porque existe.

## 7. Semântica de aprovação

A aprovação pertence ao ciclo de renovação, não à assinatura.

Por quê:
- a aprovação é uma decisão sobre se este ciclo pode aplicar uma alteração pendente
- um ciclo pode exigir aprovação mesmo que a assinatura permaneça ativa
- a aprovação faz parte da governança de execução e não do estado de assinatura de longo prazo

### Regra recomendada

A aprovação deve ser exigida apenas quando um ciclo for aplicado `pending_update_data` e a política de negócios indicar que a mudança deve ser revisada antes da execução.

Nesta fase, o contrato da fonte da verdade deve apoiar:
- `approval_status = null` quando nenhuma aprovação é necessária
- `approval_status = pending` quando a aprovação é necessária e indecisa
- `approval_status = approved` quando o ciclo poderá aplicar a alteração
- `approval_status = rejected` quando o ciclo não deve aplicar a alteração

### Quando a aprovação é avaliada

Os requisitos de aprovação devem ser decididos no momento da criação do ciclo ou no momento da preparação do ciclo, e não ad hoc na IU.

Por quê:
- o ciclo precisa de um estado operacional explícito
- o processamento da fila deve saber se o ciclo está bloqueado
- O administrador deve ler um status de aprovação estável do ciclo

## 8. Como `Plans & Offers` afeta a renovação

`Plans & Offers` deve influenciar as renovações como validação da política atual, não como o principal armazenamento do estado de renovação.

### O que valida

Antes de um ciclo aplicar uma alteração pendente, o fluxo de trabalho de renovação deve resolver novamente a configuração efetiva e validar:
- que ainda existe uma oferta ativa para o contexto do produto/variante relevante
- que a frequência solicitada ainda é permitida
- que a alteração permanece válida sob a política comercial atual

### O que não substitui

`Plans & Offers` não deve substituir:
- a assinatura como fonte do estado atual da assinatura
- o ciclo de renovação como fonte do estado de execução
- o instantâneo de alteração pendente aplicado registrado no ciclo

### Por que a política atual deve ser revalidada

A mesma alteração pode ter sido válida quando agendada, mas inválida no momento da execução da renovação.

A revalidação em relação à configuração efetiva atual mantém a execução da renovação alinhada com a política comercial ativa.

Isso segue a mesma lógica já utilizada no fluxo de mudança de plano de assinatura.

## 9. Nenhum instantâneo de política em tempo real como fonte de verdade do ciclo

O ciclo de renovação não deve manter uma cópia completa de `ProductSubscriptionConfig` como sua principal fonte de verdade.

Por quê:
- `ProductSubscriptionConfig` é estado derivado
- duplicar a política completa criaria ambiguidade de sincronização
- o ciclo só precisa persistir o que foi realmente aplicado, não todo o objeto de configuração efetivo

Persistir apenas:
- o instantâneo de alteração pendente aplicado, se usado
- campos de conveniência, como status de aprovação e referência de pedido gerada

## 10. Limite entre o estado da assinatura e o estado do ciclo de renovação

### Estado da assinatura

Respostas do estado da assinatura:
- qual é a assinatura ativa atualmente
- que variante e cadência estão atualmente ativas
- quais alterações futuras estão programadas como estado de visualização
- quando deverá ocorrer a próxima renovação

### Estado do ciclo de renovação

Respostas do estado do ciclo de renovação:
- qual unidade de renovação está sendo processada
- se o ciclo está bloqueado, em processamento, falhou ou foi bem-sucedido
- se a aprovação está pendente, aprovada ou rejeitada
- o que aconteceu durante a execução
- que ordem, se houver, foi gerada

Estes são domínios diferentes e não devem ser resumidos num único modelo.

## 11. O que retorna ao estado de assinatura após sucesso

Se uma renovação for bem-sucedida:
- `last_renewal_at` na assinatura deverá avançar
- `next_renewal_at` deve ser recalculado

Se o ciclo aplicado aprovou alterações pendentes:
- o `variant_id` ativo da assinatura deve ser atualizado
- o `frequency_interval` ativo da assinatura deve ser atualizado
- o `frequency_value` ativo da assinatura deve ser atualizado
- os instantâneos relacionados na assinatura podem precisar ser atualizados
- `pending_update_data` deve ser limpo

O ciclo continua sendo o registro do histórico de execução, mas a assinatura continua sendo a fonte de longo prazo do estado ativo.

## 12. O que acontece quando a aprovação é rejeitada

Se a aprovação for rejeitada:
- o ciclo não deve ser aplicado `pending_update_data`
- o ciclo ainda pode ser elegível para renovação usando o estado atual da assinatura ativa, dependendo da política de fluxo de trabalho posterior
- a rejeição não deve alterar silenciosamente os campos ativos atuais da assinatura

Isto mantém a governança de aprovação explícita e evita alterações acidentais de estado.

## 13. Resumo operacional

A interpretação operacional recomendada é:

- `Subscription` = verdade da assinatura atual
- `pending_update_data` = visualização de alterações futuras na assinatura
- `RenewalCycle` = um registro de execução de renovação e portão de aprovação
- `RenewalAttempt` = histórico de execução técnica
- `PlanOffer` / `ProductSubscriptionConfig` = política atual usada para validação

Cada preocupação tem seu próprio dono e deve permanecer separada.

## 14. Impacto nas etapas posteriores

Este contrato de fonte de verdade implica:
- o modelo de dados de renovação final não deve duplicar o modelo de assinatura completo
- o fluxo de trabalho de renovação deve ler primeiro a assinatura e depois aplicar a aprovação e a validação da política
- o ciclo deve persistir apenas o instantâneo da mudança que foi realmente aplicado
- o modelo de leitura Admin deve expor o contexto da assinatura e o estado do ciclo sem confundi-los

Isso também significa que a implementação posterior deve evitar:
- tratando `pending_update_data` como estado de assinatura já ativo
- tratar a configuração eficaz como um estado de renovação persistente
- reconstruir o contexto de renovação histórica apenas a partir de entidades vinculadas ativas
