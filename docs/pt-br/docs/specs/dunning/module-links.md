# Reordenar: especificações de links do módulo de cobrança

Este documento cobre a etapa `2.4.4` de `documentation/implementation_plan.md`.

Objetivo:
- definir os links dos módulos exigidos por `Dunning`
- definir a direção do link e a semântica do relacionamento
- definir se os links relacionados a pagamentos estão no escopo do MVP
- definir como os dados vinculados devem ser lidos no Admin sem quebrar o isolamento do módulo

Esta especificação se baseia em:
- `reorder/docs/specs/dunning/domain-model.md`
- `reorder/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/specs/dunning/trigger-entry.md`
- `reorder/docs/specs/renewals/module-links.md`

A direção segue os padrões da Medusa:
- links de módulo são usados para relações entre módulos, não para relações entre módulos
- os registros de origem mantêm IDs escalares para filtragem e agendamento
- os dados vinculados são usados para enriquecimento, não como fonte primária de verdade operacional
- links de pagamento opcionais devem ser adiados até que seja comprovada uma necessidade concreta de leitura ou nova tentativa

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para estratégia de link entre módulos
- a fonte da verdade em tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Links de módulos necessários

Nota de tempo de execução:
- a implementação atual ainda não usa links de módulo de cobrança dedicados
- As leituras administrativas atualmente dependem de IDs escalares em `DunningCase` mais enriquecimento baseado em consulta
- este documento continua sendo a estratégia de link planejada, em vez do mecanismo de tempo de execução atual

`Dunning` precisa de três links de módulo no MVP:

- `dunningCase <-> subscription`
- `dunningCase <-> renewalCycle`
- `dunningCase <-> order`

Esses links são necessários porque:
- o registro de origem pertence ao módulo `dunning` personalizado
- a UI Admin precisará de um contexto de assinatura vinculado
- a UI Admin precisará do contexto do ciclo de renovação de origem
- a interface do administrador pode precisar de um contexto de pedido de renovação vinculado quando o evento de dívida tiver um pedido associado
- o plugin deve permanecer isolado dos módulos `subscription`, `renewal` e `order`

## 2. Links opcionais

Nesta fase, os links relacionados ao pagamento são opcionais e não devem fazer parte do conjunto de links do MVP.

Adiado no MVP:
- `dunningCase <-> payment_collection`
- `dunningCase <-> payment_session`
- `dunningCase <-> payment`
- `dunningAttempt <-> payment_collection`
- `dunningAttempt <-> payment_session`
- `dunningAttempt <-> payment`

Por que estes são adiados:
- o atual contrato de domínio Dunning pode ser suportado por referências escalares e campos de erro em nível de caso
- `renewal_order_id` já fornece um caminho estável para cobranças de pagamentos vinculados a pedidos na Medusa quando necessário posteriormente
- o escopo atual do Admin ainda não prova a necessidade de modelos profundos de leitura de módulos de pagamento
- adicionar links de pagamento muito cedo aumentaria o acoplamento a artefatos de pagamento mutáveis antes que o design do fluxo de trabalho de nova tentativa fosse finalizado

Se uma estratégia de nova tentativa posterior ou detalhe do administrador exigir enriquecimento oficial do módulo de pagamento:
- adicione os links de pagamento em uma etapa posterior
- dimensione-os para o requisito exato de leitura ou nova tentativa
- prefira o menor conjunto útil, e não a vinculação completa do gráfico de pagamento por padrão

## 3. Um link por arquivo

Seguindo as melhores práticas da Medusa:
- cada link de módulo deve estar em seu próprio arquivo
- não agrupe múltiplas chamadas `defineLink(...)` em um arquivo

Estrutura de arquivo recomendada:

```text
reorder/src/links/dunning-subscription.ts
reorder/src/links/dunning-renewal.ts
reorder/src/links/dunning-order.ts
```

Se links de pagamento forem adicionados posteriormente, eles também deverão seguir a regra de um link por arquivo.

## 4. Direção do link

A direção preferida é:
- da entidade do módulo personalizado `dunningCase`
- para o plugin vinculado ou entidades do módulo de comércio

Definições recomendadas:

```ts
defineLink(
  {
    linkable: DunningModule.linkable.dunningCase.id,
    isList: true,
  },
  SubscriptionModule.linkable.subscription
)

defineLink(
  {
    linkable: DunningModule.linkable.dunningCase.id,
    isList: true,
  },
  RenewalModule.linkable.renewalCycle
)

defineLink(DunningModule.linkable.dunningCase, {
  linkable: OrderModule.linkable.order.id,
})
```

Esta direção é preferida porque `DunningCase` é a entidade operacional personalizada gerenciada no plugin.

Segue também o padrão prático já utilizado por:
- `subscription <-> customer`
- `subscription <-> product`
- `subscription <-> variant`
- `renewalCycle <-> subscription`
- `renewalCycle <-> order`

## 5. Por que essa direção é preferida

Esta direção corresponde ao modelo mental do recurso:
- um caso de cobrança pertence a um contexto de assinatura
- um caso de cobrança pertence a um ciclo de renovação originário
- um caso de cobrança pode fazer referência a um pedido de renovação
- a entidade personalizada é o objeto de domínio gerenciado pelo plugin

Também mantém `Dunning` alinhado com a direção do link estabelecida já usada em `Subscriptions` e `Renewals`.

## 6. Semântica de cardinalidade

Os links do módulo expressam associação, não propriedade de regras de negócios.

Eles não devem ser tratados como o local que impõe:
- regras de um caso ativo por assinatura
- singularidade do evento de dívida
- tentar novamente a elegibilidade
- transições de recuperação
- semântica de fechamento

Esses comportamentos pertencem a:
- o modelo de domínio
- validação de fluxo de trabalho
- lógica de agendamento

### Semântica do link de assinatura

No nível do domínio:
- um `DunningCase` deve sempre apontar para um `subscription_id`
- uma assinatura pode ter muitos casos de cobrança ao longo do tempo
- no MVP, apenas um caso pode estar ativo por vez, mas isso é um domínio invariante, não uma regra de link

É por isso que o formato de link preferido é orientado a listas do ponto de vista da assinatura.

### Semântica do link do ciclo de renovação

No nível do domínio:
- um `DunningCase` deve sempre apontar para um originário de `renewal_cycle_id`
- um ciclo de renovação pode estar associado a no máximo um caso de cobrança na semântica pretendida do MVP

O link ainda expressa apenas associação.

A singularidade da propriedade de eventos de dívida deve ser aplicada no domínio de cobrança e nos fluxos de trabalho, e não assumindo que a tabela de ligações por si só é suficiente.

### Semântica do link do pedido

No nível do domínio:
- um caso de cobrança pode não ter `renewal_order_id`
- um caso de cobrança pode fazer referência a um pedido de renovação quando o evento de dívida inclui um

Isso não impede que tentativas de armazenar também referências de artefatos de pagamento `payment_reference` ou posteriores como campos de diagnóstico escalar.

## 7. Uso de link versus IDs escalares

O modelo deve manter ambos:
- IDs escalares em `DunningCase`
- links de módulos para associações entre módulos

IDs escalares necessários:
- `DunningCase.subscription_id`
- `DunningCase.renewal_cycle_id`
- `DunningCase.renewal_order_id`

Por que ambos são necessários:
- IDs escalares são o principal mecanismo para filtragem, classificação, indexação, verificações de exclusividade e processamento do agendador
- os links fornecem leituras de exibição entre módulos sem quebrar o isolamento do módulo
- corresponde ao padrão prático já usado em `Subscriptions` e `Renewals`

## 8. Estratégia de leitura do administrador

O administrador deve distinguir entre:
- leituras de registros de origem
- leituras de enriquecimento vinculadas

### Leituras de registros de origem

As leituras do registro de origem devem usar `DunningCase` como base.

Eles são responsáveis por:
- paginação da lista de filas
- filtragem por estado de cobrança
- recuperação de detalhes para um caso
- recuperação do histórico de tentativas de registros filhos do mesmo módulo
- resumo de nova tentativa e resumo de fechamento

### Leituras de enriquecimento vinculadas

As leituras vinculadas devem ser usadas para enriquecer as respostas do administrador com:
- referência de assinatura e resumo de assinatura
- resumo do ciclo de renovação originário
- contexto de exibição do pedido de renovação

As leituras vinculadas são apenas para enriquecimento de exibição e contexto operacional.

Eles não devem substituir o registro `DunningCase` como raiz do modelo de leitura.

## 9. Regras de leitura da lista de administradores

Para a lista de administradores:
- a entidade da lista raiz deve permanecer `DunningCase`
- os filtros de lista devem ter como alvo principal os campos diretos em `DunningCase`
- os campos vinculados de assinatura, renovação e pedido são campos de exibição, não os campos de controle primários do modelo de dados

Filtros de campo direto preferidos:
- `status`
- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`
- `attempt_count`
- `max_attempts`
- `next_retry_at`
- `last_attempt_at`
- `recovered_at`
- `closed_at`

Se o administrador posteriormente precisar filtrar por campos vinculados, como:
- referência de assinatura
- nome do cliente
- data prevista para renovação
- ID de exibição do pedido

então trate isso como filtragem de dados vinculados:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada, se necessário
- não sobrecarregue um caminho simples de leitura do registro de origem com suposições de que toda a filtragem vinculada funcionará diretamente a partir da raiz de cobrança

## 10. Regras de leitura de detalhes do administrador

Para a visualização detalhada do administrador:
- recupere o registro de origem `DunningCase` primeiro
- recuperar registros filhos `DunningAttempt` do mesmo módulo
- recuperar assinatura vinculada, ciclo de renovação e dados de exibição de pedidos como enriquecimento

A página de detalhes deve ser capaz de mostrar:
- estado do caso
- resumo da programação de novas tentativas
- tentativas de recuperação mais recentes e históricas
- resumo da assinatura
- resumo de renovação originário
- resumo do pedido de renovação, quando presente

Isso mantém o estado de recuperação enraizado no módulo de cobrança, ao mesmo tempo que fornece ao Admin o contexto operacional vinculado de que ele precisa.

## 11. Dados vinculados não são a fonte da verdade

Assinaturas vinculadas, renovações e leituras de pedidos devem ser tratadas apenas como enriquecimento.

Eles não devem substituir:
- `subscription_id`
- `renewal_cycle_id`
- `renewal_order_id`
- `DunningCase.status`
- `DunningCase.next_retry_at`
- `DunningCase.last_payment_error_code`
- `DunningCase.last_payment_error_message`

Isso é importante porque:
- registros vinculados podem evoluir posteriormente
- o estado de recuperação de pagamento deve permanecer independente e auditável no módulo de cobrança
- O administrador não deve depender de um estado externo mutável para compreender o significado operacional do caso

## 12. Orientação sobre estratégia de consulta

Estratégia de consulta recomendada para implementação posterior:

### Lista/detalhe de fontes

Use `DunningCase` como raiz da consulta de origem.

Use campos diretos para:
- filtragem
- classificação
- paginação
- seleção do agendador

### Histórico do mesmo módulo

Use a relação interna `DunningAttempt` ou consultas dedicadas do mesmo módulo para recuperar:
- tentativa de cronograma
- estado da última tentativa
- tente ordenar por `attempt_no` ou carimbos de data e hora

### Enriquecimento vinculado

Use links de módulos e leituras vinculadas para enriquecer o resultado com:
- referência de assinatura e contexto de exibição
- originando o contexto do ciclo de renovação
- contexto de exibição do pedido de renovação

### Filtragem entre módulos

Se a filtragem por campos vinculados for necessária:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada
- não presuma que `query.graph()` possa lidar com toda a filtragem vinculada da raiz de origem de maneira escalonável

## 13. Por que os links de pagamento são adiados

Os detalhes relacionados ao pagamento são adiados intencionalmente e não ignorados.

Por que o adiamento é preferido:
- o contrato do caso atual já possui campos de erro mais recentes explícitos
- a tentativa de contrato atual já possui `payment_reference`
- `renewal_order_id` já pode fornecer um caminho posterior para o enriquecimento de cobrança de pagamento por meio dos links de pagamento de pedido existentes da Medusa
- a estratégia de novas tentativas ainda não foi finalizada, portanto, bloquear a identidade do link para artefatos de pagamento agora seria prematuro

Quando os links de pagamento se tornam justificados:
- o fluxo de trabalho de nova tentativa deve ler ou modificar diretamente os artefatos de pagamento como registros vinculados de primeira classe
- os detalhes do administrador devem mostrar dados oficiais de cobrança de pagamento ou de sessão de pagamento que as referências escalares não podem satisfazer
- a observabilidade ou UX operacional requer navegação para esses registros de pagamento como entidades vinculadas

Até então:
- manter as referências de pagamento como dados operacionais escalares
- mantenha a superfície do link do módulo mínima

## 14. Recomendação final

Para a etapa `2.4.4`, a recomendação final é:

- links MVP necessários:
  - `dunningCase <-> subscription`
  - `dunningCase <-> renewalCycle`
  - `dunningCase <-> order`
- links diferidos:
  - `payment_collection`
  - `payment_session`
  - `payment`
- raiz do registro de origem para Admin:
  - `DunningCase`
- histórico filho do mesmo módulo:
  - `DunningAttempt`
- os registros vinculados são apenas de enriquecimento e não devem substituir o estado operacional de propriedade de cobrança
