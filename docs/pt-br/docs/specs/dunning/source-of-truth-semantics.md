# Reordenar: Especificação de fonte de verdade e limites de responsabilidade

Este documento cobre a etapa `2.4.2` de `documentation/implementation_plan.md`.

Objetivo:
- definir a divisão da fonte da verdade entre `Subscriptions`, `Renewals` e `Dunning`
- decidir qual entidade ancora um `DunningCase`
- decidir se uma assinatura pode ter mais de um caso de cobrança ativo
- decidir se tentativas posteriores com falha atualizam o mesmo caso ou criam um novo
- definir qual estado pertence à assinatura, ciclo de renovação e caso de cobrança

Esta especificação se baseia em:
- `reorder/docs/specs/subscriptions/domain-model.md`
- `reorder/docs/specs/renewals/domain-model.md`
- `reorder/docs/specs/renewals/source-of-truth-semantics.md`
- `reorder/docs/specs/dunning/trigger-entry.md`

A direção segue os padrões da Medusa:
- cada módulo possui um agregado operacional claro
- a coordenação entre domínios acontece por meio de fluxos de trabalho e links, sem sobreposição de propriedade
- um registro de domínio não deve duplicar a máquina de estado primária de outro domínio
- os modelos de leitura podem enriquecer entre módulos, mas a raiz agregada deve permanecer explícita

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para limites agregados e propriedade
- a fonte da verdade em tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Semântica central

O fluxo comercial recorrente tem três preocupações operacionais distintas:

- estado contínuo da assinatura do cliente
- estado de execução de um ciclo de renovação devido
- estado de recuperação de um evento de pagamento colecionável com falha

Estas preocupações não devem ser fundidas.

### Estado operacional da assinatura

`Subscriptions` possui o contrato recorrente contínuo do cliente.

Isso inclui:
- se a assinatura está ativa, pausada, cancelada ou vencida
- o produto ativo e a variante
- a cadência ativa
- instantâneos operacionais, como contexto de envio e produto
- alterações de assinatura pendentes, mas ainda não aplicadas

### Estado de execução da renovação

`Renewals` possui uma unidade concreta de execução de faturamento.

Isso inclui:
- quando um ciclo de renovação é devido
- se esse ciclo foi agendado, processado, bem-sucedido ou falhou
- se a aprovação é necessária e o que foi decidido
- qual pedido foi gerado por esse ciclo
- quais tentativas foram feitas para executar esse ciclo

### Estado de recuperação de cobrança

`Dunning` possui a recuperação de pagamento após uma falha na renovação com falha qualificada de pagamento.

Isso inclui:
- se o evento de dívida falida está aberto para recuperação
- quantas tentativas de recuperação foram feitas
- quando for a próxima tentativa
- qual é o último erro de recuperação de pagamento
- se a dívida foi recuperada ou encerrada sem cobrança

## 2. Decisão de raiz agregada

A raiz agregada para `Dunning` deve ser `DunningCase`.

`DunningCase` deve estar ancorado em um evento concreto de dívida falida originado de um `RenewalCycle`.

Isso significa:
- a identidade principal de um caso vem do evento de renovação com falha
- `RenewalCycle` é o evento de origem de origem
- os artefatos de pedidos e pagamentos são referências de suporte, e não a âncora primária do agregado

## 3. O que ancora um `DunningCase`

Para MVP, um `DunningCase` deve estar associado a:

- um `subscription_id`
- um originando `renewal_cycle_id`
- opcionalmente um `renewal_order_id`
- opcionalmente, uma referência de artefato de pagamento, como `payment_collection_id`

### Decisão final

A âncora primária é:
- um concreto `renewal_cycle_id`

As referências secundárias são:
- `subscription_id`
- `renewal_order_id`
- referências de artefatos de pagamento, se necessário posteriormente

Por que este é o limite preferido:
- o evento de dívida é criado por um ciclo de renovação falhado, e não por uma condição genérica de subscrição
- um ciclo de renovação já representa uma unidade de faturamento vencida
- a cobrança e a sessão de pagamento são artefatos de implementação que podem mudar entre novas tentativas
- manter o caso ancorado no ciclo de renovação originário preserva uma identidade empresarial estável

## 4. Por que `DunningCase` não deve ser ancorado principalmente em pedidos ou cobranças de pagamentos

### Não primeiro pedido

`DunningCase` não deve ser ancorado principalmente em `renewal_order_id`.

Por quê:
- algumas falhas de pagamento qualificadas podem ocorrer antes que um caminho de recuperação de pagamento de pedido totalmente utilizável seja estabilizado
- um fluxo de recuperação pode posteriormente recriar ou ajustar artefatos de pagamento
- a questão empresarial é “recuperar a dívida perdida de renovação deste ciclo”, e não “gerir esta ordem como a única fonte da verdade”

Os dados do pedido ainda são importantes, mas apoiam o contexto de execução.

### Não é a cobrança do pagamento primeiro

`DunningCase` não deve ser ancorado principalmente em `payment_collection_id`.

Por quê:
- a cobrança de pagamentos é um artefato de implementação de pagamentos, e não um evento de dívida voltado para o cliente
- a estratégia de nova tentativa posterior pode reutilizar ou recriar cobranças ou sessões de pagamento
- acoplar a identidade do caso a um artefato de pagamento mutável enfraqueceria o limite agregado

Podem existir referências de cobrança de pagamento no caso para orquestração de novas tentativas ou diagnóstico, mas não devem definir a identidade do caso.

## 5. Exclusividade no nível da assinatura

Uma assinatura pode ter no máximo um caso de cobrança ativo por vez no MVP.

### Decisão final

Invariante recomendado:
- uma assinatura pode ter muitos casos históricos de cobrança ao longo do tempo
- uma assinatura pode ter apenas um caso de cobrança ativo em um determinado momento

Ativo significa status como:
- aberto
-retry_scheduled
- tentando novamente
- aguardando_manual_resolution

Fechado significa status como:
- recuperado
- não recuperado

Por que isso é preferido:
- uma assinatura não deve ter vários operadores simultâneos de recuperação de pagamento para eventos de dívida sobrepostos no MVP
- O manuseio administrativo permanece operacionalmente simples
- o agendador de renovação e o agendador de cobrança evitam estados de recuperação concorrentes para a mesma assinatura

### Como isso interage com a ancoragem do ciclo

O caso ainda está ancorado em um `renewal_cycle_id`.

A regra de exclusividade significa:
- se ocorrer uma nova falha de renovação qualificada para pagamento enquanto outro caso para a mesma assinatura ainda estiver ativo, isso é uma situação inválida ou bloqueada no MVP
- regras de fluxo de trabalho posteriores devem impedir a criação de um segundo caso ativo até que o atual seja resolvido

Isso é intencionalmente conservador e mantém o comportamento do produto compreensível.

## 6. Tente novamente a propriedade

As tentativas posteriores com falha devem atualizar o mesmo `DunningCase`, e não criar um novo caso.

### Decisão final

Modelo recomendado:
- `DunningCase` é a raiz agregada para uma jornada de recuperação
- `DunningAttempt` é o histórico de tentativas somente de acréscimo para esse caso
- cada tentativa de recuperação posterior pertence ao mesmo caso até fechar como `recovered` ou `unrecovered`

Por quê:
- tentativas repetidas de recuperação são um thread operacional
- Os detalhes do administrador devem mostrar um cronograma de caso
- um novo caso para cada nova tentativa fragmentaria o histórico e complicaria as métricas, o agendamento e a revisão do operador

## 7. Multiplicidade histórica

Uma assinatura pode ter muitos casos de cobrança ao longo de sua vida.

Isso acontece quando:
- um caso está encerrado
- um ciclo de renovação posterior produz uma nova falha qualificada para pagamento
- um novo evento de dívida começa após o término da jornada de recuperação anterior

Isso significa:
- a exclusividade é apenas para casos ativos
- os registros históricos permanecem muitos para um, desde o caso até a assinatura

## 8. Propriedade estatal por domínio

Os domínios devem possuir estado da seguinte maneira.

### 8.1 Estado de propriedade de `Subscription`

`Subscription` possui:
- status do ciclo de vida como `active`, `paused`, `cancelled`, `past_due`
- variante ativa atual e cadência
- próximo cronograma de renovação atual
- instantâneos de remessa e cliente/produto
- alterações de assinatura pendentes

`Subscription` não possui:
- resultado de execução de um ciclo
- resultado de aprovação de um ciclo
- histórico de tentativas de recuperação de pagamento
- o cronograma de novas tentativas de cobrança

### 8.2 Estado propriedade de `RenewalCycle`

`RenewalCycle` possui:
- data de vencimento e cronograma de execução para um evento de faturamento
- status de execução como `scheduled`, `processing`, `succeeded`, `failed`
- requisito de aprovação e decisão de aprovação para esse ciclo
- a referência de pedido gerada para esse ciclo
- o instantâneo de execução das alterações pendentes aplicadas
- resumo do último erro de execução e contagem de tentativas

`RenewalCycle` não possui:
- o longo ciclo de vida de recuperação de pagamento após a classificação da falha qualificada para pagamento
- o cronograma de novas tentativas de recuperação de dívidas
- resultado do fechamento de recuperação, como recuperado/não recuperado

### 8.3 Estado propriedade de `DunningCase`

`DunningCase` deve possuir:
- se o evento de dívida falida está atualmente aberto para recuperação
- a máquina de status de cobrança
- `attempt_count` para novas tentativas de cobrança
- `max_attempts`
- `next_retry_at`
- resumo do erro de recuperação de pagamento mais recente
- carimbos de data/hora de recuperação como `recovered_at` ou `closed_at`
- resumo da decisão de recuperação do operador, quando aplicável

`DunningCase` não deve possuir:
- o produto ativo ou cadência da assinatura
- o estado de aprovação do ciclo de renovação
- a data de faturamento programada do ciclo de renovação como principal fonte de agendamento
- a política comercial de origem de `Plans & Offers`

## 9. Regras de limite de status

Os status de domínios diferentes não devem ser sobrecarregados.

### Status da assinatura

Respostas do status da assinatura:
- qual é o estado operacional atual do relacionamento recorrente voltado para o cliente

Exemplos:
- `active`
- `paused`
- `cancelled`
- `past_due`

### Status do ciclo de renovação

Respostas do status do ciclo de renovação:
- o que aconteceu com esta unidade de execução de faturamento devido

Exemplos:
- `scheduled`
- `processing`
- `succeeded`
- `failed`

### Status do caso de cobrança

Respostas do status do caso de cobrança:
- qual é o estado atual de recuperação do evento de pagamento de cobrança com falha

Exemplos para etapas posteriores:
- `open`
- `retry_scheduled`
- `retrying`
- `recovered`
- `unrecovered`

Regra importante:
- O status `DunningCase` não deve substituir `RenewalCycle.status`
- `RenewalCycle.status` permanece `failed` para o ciclo com falha de origem, mesmo se a recuperação de cobrança posterior for bem-sucedida

Por quê:
- o histórico de execução de renovação deve permanecer historicamente verdadeiro
- a recuperação de cobrança é uma camada operacional posterior, não uma reescrita da tentativa de execução original

## 10. Semântica de sucesso de recuperação

Se `Dunning` posteriormente recuperar o pagamento com sucesso:

- o `RenewalCycle` de origem não deixa de ser a origem da tentativa original de execução falhada
- o `DunningCase` se torna a fonte da verdade para o resultado da recuperação
- o `Subscription` torna-se a fonte da verdade para qualquer atualização de estado operacional resultante após a recuperação

Isso significa que uma recuperação posterior bem-sucedida pode atualizar:
- status ou sinalizadores da assinatura, se necessário pelas regras de negócios
- status do caso de cobrança para `recovered`

Mas não deve transformar a história em:
- `RenewalCycle.status = succeeded` retroativamente para a tentativa original falhada

## 11. Limites do modelo de leitura

Os modelos de leitura administrativa devem respeitar as raízes agregadas.

### Lista de advertências/raiz detalhada

A raiz de leitura do administrador para futuras páginas `Dunning` deve ser `DunningCase`.

Pode enriquecer com:
- resumo da assinatura
- resumo do ciclo de renovação originário
- resumo do pedido vinculado
- contexto de pagamento selecionado

Mas esses registros vinculados são apenas um enriquecimento.

### Por que isso é importante

Isso reflete o padrão já usado em:
- `Subscriptions`, onde a raiz é `Subscription`
- `Renewals`, onde a raiz é `RenewalCycle`

Então para `Dunning`:
- a raiz deve ser `DunningCase`
- `DunningAttempt` deve ser histórico infantil

## 12. Limite do fluxo de trabalho

Os fluxos de trabalho entre domínios devem coordenar os domínios sem confundir a propriedade.

Direção recomendada:
- um fluxo de trabalho de renovação detecta uma falha qualificada para pagamento
- um fluxo de trabalho `start-dunning` dedicado cria ou atualiza o agregado de cobrança
- os fluxos de trabalho de nova tentativa de cobrança alteram apenas o estado de propriedade da cobrança, além de operações explícitas de pagamento downstream
- se um resultado de recuperação exigir atualizações de assinatura, isso deverá acontecer explicitamente nas etapas do fluxo de trabalho

Isso mantém:
- `Renewals` responsável pela execução da renovação
- `Dunning` responsável pela execução da recuperação
- `Subscriptions` responsável pelo estado do ciclo de vida da assinatura

## 13. Resumo da decisão final

Para a etapa `2.4.2`, as decisões finais são:

- `DunningCase` é uma raiz agregada separada
- `DunningCase` está ancorado principalmente em um originário `renewal_cycle_id`
- `renewal_order_id` e artefatos de pagamento são referências de suporte, não a identidade principal do caso
- uma assinatura pode ter muitos casos históricos de cobrança, mas apenas um caso ativo por vez no MVP
- tentativas posteriores de recuperação com falha atualizam o mesmo `DunningCase` e criam histórico de `DunningAttempt`, não novos casos
- `Subscription` possui estado de relacionamento recorrente
- `RenewalCycle` possui uma unidade de execução de faturamento
- `DunningCase` possui estado de recuperação de pagamento para um evento de dívida cobrável com falha
