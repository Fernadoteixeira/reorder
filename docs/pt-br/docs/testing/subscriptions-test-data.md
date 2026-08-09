# Dados de teste: Módulo de assinaturas

Este documento descreve o script inicial de controle de qualidade público para a área `Subscriptions` do plugin `Reorder`.

Abrange dados de teste usados em:
- `Subscriptions`
- `Plans & Offers`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`
- `Activity Log`
- `Analytics`
- `Settings`

O script é intencionalmente nomeado e estruturado de forma ampla para que possa propagar a superfície operacional de controle de qualidade para todo o espaço de trabalho de comércio recorrente em `Subscriptions`.

## Arquivos

Script de semente:
- [seed-subscriptions-test-data.ts](../../scripts/seed-subscriptions-test-data.ts)

Redefinir script:
- [reset-subscriptions-test-data.ts](../../scripts/reset-subscriptions-test-data.ts)

Documentos de tempo de execução relacionados:
- [Teste de assinaturas](./subscriptions.md)
- [Teste de renovações](./renewals.md)
- [Teste de cobrança](./dunning.md)
- [Teste de cancelamentos](./cancellations.md)
- [IU de administração de renovações](../admin/renewals.md)
- [IU de administrador de cobrança](../admin/dunning.md)
- [IU de administração de cancelamentos](../admin/cancellations.md)
- [IU de administração do registro de atividades](../admin/activity-log.md)
- [IU de administração do Analytics](../admin/analytics.md)
- [UI de administração de configurações de assinatura](../admin/subscription-settings.md)
- [Arquitetura de renovações](../architecture/renewals.md)
- [Arquitetura de Dunning](../architecture/dunning.md)
- [Arquitetura de cancelamento](../architecture/cancellation.md)
- [Arquitetura de log de atividades](../architecture/activity-log.md)
- [Arquitetura analítica](../architecture/analytics.md)
- [Arquitetura de configurações](../architecture/settings.md)

## Propósito

O script cria um conjunto de dados de controle de qualidade pequeno e repetível que facilita o teste manual do plug-in sem criar todos os registros manualmente.

Destina-se a:
- controle de qualidade local
- ambientes de demonstração
- configuração do contribuidor
- verificação do plugin após reinstalar uma loja

## Modelo de Execução

O script foi projetado para ser executado em `medusa exec` no contexto de um aplicativo Medusa que possui o plugin `reorder` instalado.

Isso é importante porque o script depende de:
- o recipiente Medusa
- os serviços do módulo plugin
- os produtos e variantes reais da loja

Ele não deve ser executado como um script de banco de dados autônomo bruto.

## Requisitos

Antes de executar o script, certifique-se de:
- seu aplicativo Medusa está configurado e as migrações são aplicadas
- o plugin `reorder` está instalado nesse aplicativo
- a loja já possui produtos com variantes
- existem pelo menos dois produtos que ainda não possuem `Plan Offers` atribuído a eles

Por que existe o último requisito:
- o script evita intencionalmente a mutação de `Plan Offers` existente
- escolhe alvos de produtos limpos para cenários de controle de qualidade

Se sua loja não atender a esses requisitos, o script será encerrado com um erro legível em vez de criar dados parciais.

O script de redefinição não cria nem exclui produtos.
O script de redefinição remove o singleton global `SubscriptionSettings` propagado se ele tiver sido criado por esta semente de controle de qualidade.

Portanto, mesmo após uma reinicialização bem-sucedida, a semente ainda requer:
- produtos com variantes existentes na loja
- pelo menos dois produtos sem `Plan Offers` existente

`SubscriptionSettings` são um caso especial:
- se não existir nenhum singleton persistente, a semente cria um para Configurações de controle de qualidade
- se o singleton existente foi criado anteriormente por esta semente, a semente o atualiza deterministicamente
- se já existir um singleton não propagado, o script o manterá intacto e ignorará a semente de controle de qualidade específica das configurações em vez de falhar ou substituir a configuração da loja

## Como correr

Fluxo recomendado:
1. redefinir dados iniciais de controle de qualidade anteriores
2. execute a semente novamente

Execute os scripts na raiz do seu aplicativo Medusa.

Exemplo para este layout de repositório:

```bash
cd my-medusa-store
npx medusa exec ../reorder/scripts/reset-subscriptions-test-data.ts
npx medusa exec ../reorder/scripts/seed-subscriptions-test-data.ts
```

Se o seu repositório de plug-ins estiver em um local diferente, ajuste o caminho relativo de acordo.

Somente sementes:

```bash
cd my-medusa-store
npx medusa exec ../reorder/scripts/seed-subscriptions-test-data.ts
```

Redefinir apenas:

```bash
cd my-medusa-store
npx medusa exec ../reorder/scripts/reset-subscriptions-test-data.ts
```

## O que o script cria

O script cria ou atualiza:
- registros Medusa `Customer` padrão para os cenários de assinatura propagados
- registros Medusa `Order` padrão vinculados a cada assinatura propagada
- um singleton `SubscriptionSettings` global para controle de qualidade de configurações
- dois `Plan Offers`
- múltiplas assinaturas de teste
- múltiplos ciclos de renovação
- uma tentativa de renovação falhada para teste de histórico/detalhe
- vários casos de cobrança
- múltiplas tentativas de cobrança
- vários casos de cancelamento
- vários eventos de oferta de retenção
- entradas `Activity Log` selecionadas para controle de qualidade de lista, detalhes e cronograma
- linhas `subscription_metrics_daily` determinísticas para controle de qualidade do Analytics

O script de redefinição remove os registros propagados para as mesmas áreas:
- registros `Customer` padrão propagados
- registros `Order` padrão propagados e seus links de assinatura/renovação
- semeado `SubscriptionSettings`
- semeado `Plan Offers`
- semeado `Subscriptions`
- semeado `RenewalCycle`
- semeado `RenewalAttempt`
- semeado `DunningCase`
- semeado `DunningAttempt`
- semeado `CancellationCase`
- semeado `RetentionOfferEvent`
- semeado `SubscriptionLog`
- semeado `subscription_metrics_daily`

A semente foi projetada para ser idempotente:
- usa IDs estáveis
- reutiliza clientes propagados por e-mail determinístico
- reutiliza pedidos de renovação através de uma verificação de três níveis nas repetições:
  1. `renewal_cycle.generated_order_id` — usado quando uma execução anterior foi totalmente concluída
  2. a tabela de links `renewal_renewal_cycle_order_order` — usada quando `generated_order_id` foi redefinido para `null` por um novo upsert, mas o link ainda existe; se o pedido vinculado ainda existir, ele será reutilizado; se o pedido foi excluído, o link obsoleto será descartado para que um novo pedido e link possam ser criados
  3. metadados de pedido propagados – usados quando uma execução anterior criou um pedido, mas falhou antes de criar o link
- executá-lo novamente deve atualizar os mesmos registros em vez de criar duplicatas indefinidamente

Nota de implementação:
- a semente cria clientes e pedidos por meio de serviços diretos do módulo Medusa, em vez de fluxos de trabalho principais, para que possa ser executada com segurança por meio de `medusa exec`

A redefinição também é determinística:
- visa apenas IDs propagados estáveis
- verifica adicionalmente `metadata.seed_namespace = "subscriptions-test-data"`
- remove registros na ordem filho-pai
- também remove registros filhos `renewal_attempt` e `dunning_attempt` vinculados a registros raiz propagados, mesmo que essas linhas filhas tenham sido criadas posteriormente durante o controle de qualidade manual ou a execução do fluxo de trabalho
- ele também remove instantâneos analíticos criados diretamente pela semente e instantâneos vinculados a assinaturas propagadas, para que as execuções manuais de reconstrução analítica possam ser limpas de forma determinística

## Cenários Atuais

A versão atual cria estes cenários de controle de qualidade:

### 0. Configurações padrões globais

Escopo:
- singleton global `SubscriptionSettings`

Objetivo:
- valide a página Configurações em `Settings -> Subscription Settings`
- validar estado de leitura singleton persistente
- validar salvar UX a partir de uma linha de base conhecida e não padrão
- validar se as novas operações de tempo de execução selecionam padrões globais propagados

Nota de implementação:
- a semente cria um singleton persistente com:
  - `default_trial_days = 14`
  - `dunning_retry_intervals = [60, 180, 720]`
  - `max_dunning_attempts = 3`
  - `default_renewal_behavior = require_review_for_pending_changes`
  - `default_cancellation_behavior = allow_direct_cancellation`
- o singleton semeado inclui `metadata.audit_log` e `metadata.last_update`
- como as configurações são globais, a semente não substitui um singleton não propagado existente
- nesse caso, o script registra um aviso e ignora o cenário de controle de qualidade somente configurações enquanto ainda propaga o restante do espaço de trabalho Assinaturas

## Janela de controle de qualidade do Analytics

Para controle de qualidade manual do Analytics, a janela de instantâneo propagado é:
- `2026-04-06` a `2026-04-15`

Filtro padrão recomendado:
- `date_from = 2026-04-06T00:00:00.000Z`
- `date_to = 2026-04-15T23:59:59.999Z`

Os dados do Analytics são intencionalmente capturados primeiro.

Isso significa:
- é determinístico para controle de qualidade manual
- não depende da criação de pedidos reais de loja para cada cenário
- não se destina a validar a precisão da reconstrução em relação aos totais comerciais reais

### 1. Sucesso na renovação sem aprovação

Referência de assinatura:
- `SUB-QA-REN-SUCCESS`

Objetivo:
- validar um caminho de sucesso `Force renewal` limpo

Nota de implementação:
- a assinatura usa `skip_next_cycle = true`
- isso permite o sucesso da renovação sem exigir um fluxo real de criação de pedidos

### 2. Bloqueio de assinatura pausada

Referência de assinatura:
- `SUB-QA-REN-PAUSED`

Objetivo:
- validar se as renovações respeitam o estado de assinatura pausada

### 3. Bloqueio efetivo de cancelamento

Referência de assinatura:
- `SUB-QA-REN-CANCEL-EFFECTIVE`

Objetivo:
- validar que as renovações estão bloqueadas quando o cancelamento já estiver em vigor para a data do ciclo

### 4. Aprovação pendente

Referência de assinatura:
- `SUB-QA-REN-APPROVAL-PENDING`

Objetivo:
- validar `Approve changes`
- validar `Reject changes`
- validar `Approve -> Force renewal`

Nota de implementação:
- a assinatura contém `pending_update_data`
- o ativo selecionado `Plan Offer` permite a cadência atualizada

### 5. Política de oferta bloqueada após aprovação

Referência de assinatura:
- `SUB-QA-REN-POLICY-BLOCKED`

Objetivo:
- validar que a renovação não ignora a política `Plans & Offers` ativa

Nota de implementação:
- a assinatura contém `pending_update_data`
- o `Plan Offer` ativo intencionalmente não permite a cadência atualizada
- após a aprovação, `Force renewal` ainda deverá estar bloqueado pela revalidação da política

### 6. Falha no histórico/repetição da inspeção

Referência de assinatura:
- `SUB-QA-REN-FAILED-HISTORY`

Objetivo:
- validar UI do ciclo com falha
- validar a renderização do histórico de tentativas
- validar estados detalhados de renovação com falha

Nota de implementação:
- a falha semeada é baseada na falta de `cart_id`
- o script também cria um registro `renewal_attempt` com falha para este cenário

### 7. Fila de cobrança: nova tentativa agendada

Referência de assinatura:
- `SUB-QA-DUN-RETRY-SCHEDULED`

Objetivo:
- validar a visualização da fila principal em `Subscriptions -> Dunning`
- validar filtros de provedor e código de erro
- validar `Retry now` a partir dos detalhes do caso

Nota de implementação:
- a assinatura já está em `past_due`
- o caso de cobrança está em `retry_scheduled`
- o caso tem `pp_stripe_stripe` e `card_declined`
- ainda não existem tentativas de cobrança, portanto o operador pode testar uma primeira nova tentativa a partir do estado de fila limpa

### 8. Detalhe da cobrança: aguardando resolução manual

Referência de assinatura:
- `SUB-QA-DUN-AWAITING-MANUAL`

Objetivo:
- validar o layout da página de detalhes
- validar a renderização da linha do tempo da tentativa fracassada
- validar `Mark recovered`
- validar `Mark unrecovered`

Nota de implementação:
- o caso está em `awaiting_manual_resolution`
- uma tentativa falhada está presente com `requires_more`
- este cenário destina-se a ações de resolução manual em vez de agendamento automático de novas tentativas

### 9. Histórico de cobrança: recuperado

Referência de assinatura:
- `SUB-QA-DUN-RECOVERED`

Objetivo:
- validar uma página de detalhes recuperada do terminal
- validar o cronograma com tentativas fracassadas e bem-sucedidas
- validar a filtragem da lista para casos recuperados históricos

Nota de implementação:
- a assinatura voltou em `active`

## Cenários analíticos

A semente atual também cria estes cenários de controle de qualidade orientados ao Analytics:

### 10. Linha de base da visão geral do Analytics

Referências primárias:
- `SUB-QA-REN-SUCCESS`
- `SUB-QA-ANL-BI-MONTHLY`

Objetivo:
- validar cartões KPI
- validar tendências de dia/semana/mês
- validar a exportação contra uma base ativa determinística

Nota de implementação:
- `SUB-QA-REN-SUCCESS` contribui com uma linha de base MRR ativa mensal de `USD`
- `SUB-QA-ANL-BI-MONTHLY` contribui com uma segunda linha de base ativa `USD` com cadência `month:2`
- a janela do instantâneo é `2026-04-06..2026-04-15`

### 11. Comparação de frequência analítica

Referência de assinatura:
- `SUB-QA-ANL-BI-MONTHLY`

Objetivo:
- validar filtragem `frequency` para `month:2`
- validar KPI e isolamento de tendências para uma fatia de cadência dedicada

Nota de implementação:
- esta assinatura foi criada apenas para tornar determinística a filtragem de cadência do Analytics
- não se destina a impulsionar o controle de qualidade do fluxo de renovação

### 12. Segmentação de status do Analytics

Referências primárias:
- `SUB-QA-REN-SUCCESS`
- `SUB-QA-REN-PAUSED`
- `SUB-QA-DUN-RETRY-SCHEDULED`
- `SUB-QA-CAN-CANCELED-IMMEDIATE`

Objetivo:
- validar a filtragem `status` no Analytics
- confirme se apenas `active` linhas contribuem para `MRR` e `active_subscriptions_count`

Nota de implementação:
- a janela do instantâneo propagado contém linhas para:
  - `active`
  - `paused`
  - `past_due`
  - `cancelled`

### 13. Janelas de rotatividade do Analytics

Referências primárias:
- `SUB-QA-CAN-CANCELED-IMMEDIATE`
- `SUB-QA-CAN-CANCELED-END-CYCLE`

Objetivo:
- validar tendências `churn_rate`
- validar linhas de exportação em dias com eventos de rotatividade
- validar intervalos diários com picos causados por cancelamento

Nota de implementação:
- a semente cria dois dias de rotatividade explícitos:
  - `2026-04-10` com `billing`
  - `2026-04-14` com `price`

### 14. Dia de anomalia do Analytics MRR

Referência primária:
- `SUB-QA-REN-SUCCESS`

Objetivo:
- validar um aumento visível de `MRR` nas tendências e exportar
- apoiar a revisão manual de padrões de dados orientados a anomalias

Nota de implementação:
- `2026-04-12` contém um valor `MRR` intencionalmente elevado para a assinatura mensal básica
- destina-se apenas ao controle de qualidade do Analytics

## Verificações de controle de qualidade do Analytics recomendadas

Verificações manuais sugeridas após a propagação:
- abra `Settings -> Subscription Settings`
- se a semente criou ou atualizou o singleton:
  - verifique se a página carrega um singleton persistente em vez de padrões substitutos
  - verificar:
    - `default_trial_days = 14`
    - intervalos de repetição `60 / 180 / 720`
    - `max_dunning_attempts = 3`
    - comportamento de renovação `require_review_for_pending_changes`
    - comportamento de cancelamento `allow_direct_cancellation`
  - confirme se a página mostra metadados persistentes, como `version`, `updated_at` e `updated_by`
- se sua loja já tiver suas próprias configurações globais não propagadas:
  - espere que o script os deixe intocados
  - não espere que nenhuma substituição de controle de qualidade específica de configurações seja aplicada
- abra `Subscriptions -> Analytics` com a janela padrão de controle de qualidade do Analytics
- verifique se `MRR`, `Churn Rate`, `LTV` e `Active Subscriptions` são renderizados sem fallback de estado vazio
- alternar `group_by` entre `day`, `week` e `month`
- filtrar por `status = active`
- filtrar por `frequency = month:2`
- exportar `CSV` e `JSON` com os filtros ativos
- inspecionar `2026-04-12` como o dia de pico intencional de `MRR`
- inspecionar `2026-04-10` e `2026-04-14` como os dias de rotatividade explícitos
- o caso é encerrado como `recovered`
- a linha do tempo da tentativa contém uma tentativa fracassada e uma tentativa bem-sucedida

### 10. Histórico de cobrança: não recuperado

### 11. Registro de atividades: evento de assinatura do administrador

Referência de assinatura:
- `SUB-QA-REN-PAUSED`

Objetivo:
- validar um evento `subscription.paused` acionado pelo usuário no `Activity Log` global
- validar gaveta de detalhes `before / after`
- validar a renderização do cronograma por assinatura

Nota de implementação:
- uma linha `subscription_log` é propagada diretamente
- o evento usa `actor_type = user`
- a carga útil contém uma transição de status compacta e carimbo de data e hora de pausa

### 12. Registro de atividades: evento de renovação do agendador

Referência de assinatura:
- `SUB-QA-REN-SUCCESS`

Objetivo:
- validar um evento `renewal.succeeded` originado pelo agendador
- validar a renderização do crachá do ator e a carga útil detalhada orientada para a renovação

Nota de implementação:
- uma linha `subscription_log` é propagada diretamente
- o evento usa `actor_type = scheduler`
- a carga útil faz referência ao ciclo de renovação propagado

### 13. Log de atividades: evento de cobrança do sistema

Referência de assinatura:
- `SUB-QA-DUN-RECOVERED`

Objetivo:
- validar um evento `dunning.recovered` originado pelo sistema
- validar a inspeção do cronograma entre domínios na página de detalhes da assinatura

Nota de implementação:
- uma linha `subscription_log` é propagada diretamente
- o evento usa `actor_type = system`
- a carga faz referência ao caso de cobrança propagado e ao código do motivo de recuperação

Referência de assinatura:
- `SUB-QA-DUN-UNRECOVERED`

Objetivo:
- validar uma página de detalhes não recuperada do terminal
- validar o histórico de exaustão de tentativas máximas
- validar a filtragem por provedor, código de erro e contagem de tentativas

Nota de implementação:
- a assinatura permanece em `past_due`
- o caso foi encerrado como `unrecovered`
- a linha do tempo contém três tentativas fracassadas
- valores de provedor e erro são escolhidos para exercitar filtros de fila

### 11. Detalhe da cobrança: substituição manual do agendamento de novas tentativas

Referência de assinatura:
- `SUB-QA-DUN-MANUAL-OVERRIDE`

Objetivo:
- validar a gaveta de agendamento de nova tentativa
- validar o estado de substituição manual em detalhes
- validar combinações de filtros para trabalhos de cobrança ativos

Nota de implementação:
- o caso é `retry_scheduled`
- `retry_schedule.source = manual_override`
- `max_attempts` e `intervals` diferem da política padrão
- já existe uma tentativa fracassada de fornecer o contexto da linha do tempo do operador antes de substituir novamente

### 12. Cancelamento: caso de cobrança aberta com cobrança ativa

Referência de assinatura:
- `SUB-QA-CAN-OPEN-BILLING`

Objetivo:
- validar a fila de cancelamento e detalhes de um caso ativo
- validar o resumo de cobrança vinculado

Nota de implementação:
- a assinatura já é `past_due`
- existe um `DunningCase` ativo para a mesma assinatura
- o caso de cancelamento está em `evaluating_retention`

### 13. Cancelamento: retido após oferta de desconto

Referência de assinatura:
- `SUB-QA-CAN-RETAINED-DISCOUNT`

Objetivo:
- validar um caso retido terminal
- validar a renderização do histórico de ofertas
- validar linha do tempo e filtros por `final_outcome` e `offer_type`

Nota de implementação:
- o caso já é `retained`
- existe um evento `discount_offer` com `decision_status = applied`

### 14. Cancelamento: pausado após oferta de pausa

Referência de assinatura:
- `SUB-QA-CAN-PAUSED`

Objetivo:
- validar a pausa como resultado de retenção
- validar o resumo da assinatura pausada versus o resultado do caso pausado
- validar o estado detalhado do terminal pausado

Nota de implementação:
- a assinatura já é `paused`
- o caso já é `paused`
- existe um evento `pause_offer` com `decision_status = applied`

### 15. Cancelamento: cancelamento final imediato

Referência de assinatura:
- `SUB-QA-CAN-CANCELED-IMMEDIATE`

Objetivo:
- validar o estado detalhado do terminal cancelado
- validar a semântica `cancel_effective_at` para cancelamento imediato
- validar a filtragem da lista por `final_outcome = canceled`

Nota de implementação:
- a assinatura já é `cancelled`
- o caso já é `canceled`
- `cancellation_effective_at` corresponde ao caminho de cancelamento final imediato

### 16. Cancelamento: cancelamento final do final do ciclo

Referência de assinatura:
- `SUB-QA-CAN-CANCELED-END-CYCLE`

Objetivo:
- compare o cancelamento de final de ciclo com o cancelamento imediato
- validar o cronograma do resultado final e a semântica da data efetiva

Nota de implementação:
- a assinatura já é `cancelled`
- o caso já é `canceled`
- `cancellation_effective_at` está definido para um ponto de final de ciclo posterior

### 17. Cancelamento: caso aberto baseado em preço

Referência de assinatura:
- `SUB-QA-CAN-OPEN-PRICE`

Objetivo:
- validar o comportamento de caso aberto orientado pelo preço
- use como uma base limpa para testes manuais `apply-offer`

Nota de implementação:
- a assinatura é `active`
- o caso ainda é `requested`
- ainda não existe nenhum evento de oferta

### 18. Cancelamento: caso aberto em assinatura já pausada

Referência da assinatura:
- `SUB-QA-CAN-OPEN-PAUSED-SUB`

Objetivo:
- validar um caso de cancelamento ativo em uma assinatura já pausada
- verificar os detalhes das assinaturas pausadas

Nota de implementação:
- a assinatura já é `paused`
- o caso ainda está ativo
- esse cenário é útil para a análise da operadora voltada para o cancelamento direto

## O que o script não cria

A versão atual não abrange todo o ciclo de vida do processo de finalização da compra ou do pagamento.

Isso significa que:
- cada assinatura inicializada agora possui pelo menos um `Order` da Medusa vinculado de forma real
- os cenários de renovação/cobrança inicializados que contêm referências a pedidos de renovação agora também criam pedidos de renovação vinculados de forma real
- o script ainda não cria artefatos totalmente realistas de finalização de compra, cobrança, captura ou atendimento de pedidos
- o script ainda é otimizado para o controle de qualidade do fluxo do operador, e não para o realismo total da finalização de compra no comércio eletrônico

## Como usar os dados predefinidos no painel de administração

Após executar o script:
1. abra `Subscriptions -> Renewals`
2. pesquise pelas referências fornecidas, por exemplo:
   - `SUB-QA-REN-SUCCESS`
   - `SUB-QA-REN-APPROVAL-PENDING`
   - `SUB-QA-REN-POLICY-BLOCKED`
3. abra os detalhes do ciclo de renovação correspondente
4. execute os cenários de controle de qualidade manual descritos na lista de verificação `Renewals`

Para `Dunning`:
1. abra `Subscriptions -> Dunning`
2. pesquise ou filtre pelas referências fornecidas, por exemplo:
   - `SUB-QA-DUN-RETRY-SCHEDULED`
   - `SUB-QA-DUN-AWAITING-MANUAL`
   - `SUB-QA-DUN-RECOVERED`
   - `SUB-QA-DUN-UNRECOVERED`
   - `SUB-QA-DUN-MANUAL-OVERRIDE`
3. verifique os filtros da fila:
   - `Provider id`
   - `Error code`
   - `Attempts min / max`
   - `Next retry from / to`
4. abra os detalhes do caso e valide manualmente:

Para `Cancellation & Retention`:
1. abra `Subscriptions -> Cancellation & Retention`
2. pesquise ou filtre pelas referências fornecidas, por exemplo:
   - `SUB-QA-CAN-OPEN-BILLING`
   - `SUB-QA-CAN-RETAINED-DISCOUNT`
   - `SUB-QA-CAN-PAUSED`
   - `SUB-QA-CAN-CANCELED-IMMEDIATE`
   - `SUB-QA-CAN-CANCELED-END-CYCLE`
   - `SUB-QA-CAN-OPEN-PRICE`
   - `SUB-QA-CAN-OPEN-PAUSED-SUB`
3. verifique os filtros da fila:
   - `Reason category`
   - `Outcome`
   - `Offer type`
   - `Created from / Created to`
4. abrir os detalhes do caso e validar manualmente:
   - resumo da assinatura vinculada
   - resumo de cobranças/renovações vinculadas
   - cronograma de decisões
   - histórico de ofertas
   - aplicar oferta
   - finalizar o cancelamento
   - atualizar o motivo

## Resumo do cenário de cancelamento

Os cenários de cancelamento predefinidos abrangem intencionalmente:
- caso aberto ativo com contexto de cobrança vinculado
- resultado retido por meio de `discount_offer`
- resultado pausado por meio de `pause_offer`
- resultado cancelado imediatamente
- resultado cancelado no final do ciclo
- caso aberto motivado por preço antes de qualquer ação de retenção
- caso aberto em uma assinatura já pausada
   - renderização da linha do tempo
   - resumo de renovação vinculado
   - seção de programação de novas tentativas
   - `Retry now`
   - `Mark recovered`
   - `Mark unrecovered`
   - gaveta de substituição da programação de novas tentativas

Lista de verificação rápida recomendada para controle de qualidade do `Dunning`:
- `SUB-QA-DUN-RETRY-SCHEDULED`
  Verifique a visibilidade da fila, o `card_declined` e o `Retry now`.
- `SUB-QA-DUN-AWAITING-MANUAL`
  Verifique as ações de resolução manual e os detalhes das tentativas malsucedidas.
- `SUB-QA-DUN-RECOVERED`
  Verifique o histórico da linha do tempo de recuperação e o status da assinatura ativa.
- `SUB-QA-DUN-UNRECOVERED`
  Verifique o status de não recuperação do terminal e os filtros de contagem de tentativas.
- `SUB-QA-DUN-MANUAL-OVERRIDE`
  Verifique a programação de novas tentativas de `manual_override` e o fluxo de edição da gaveta.

O script registra um resumo do cenário ao final da execução, incluindo:
- nome do cenário
- referência da assinatura
- ID do ciclo de renovação
- ID do caso de cobrança, quando aplicável
- orientação breve para o operador

## Observações de segurança

Este script destina-se a ambientes de teste e demonstração.

Embora tente evitar sobrescrever dados não relacionados, ele ainda assim cria e atualiza registros reais no banco de dados de destino.

Uso recomendado:
- lojas de desenvolvimento local
- ambientes dedicados de controle de qualidade (QA)
- ambientes de demonstração descartáveis

Evite executá-lo em um ambiente de produção.

O script de redefinição é intencionalmente conservador:
- ele remove apenas os registros criados por este conjunto de dados de controle de qualidade (QA)
- ele não apaga dados não relacionados a assinaturas, renovações, cobranças, produtos ou pedidos

Detalhes da implementação:
- os registros raiz são mapeados por meio de IDs de semente estáveis mais `seed_namespace`
- os registros filhos são filtrados tanto por IDs de semente conhecidos quanto por relações de propriedade sob os registros `renewal_cycle` e `dunning_case` com sementes definidas

## Estratégia de expansão

Este arquivo é intencionalmente mais amplo do que o `Renewals`.

A direção prevista para o futuro é ampliar o mesmo script com cenários adicionais para:
- ações relacionadas ao ciclo de vida da assinatura
- fluxos de alteração de plano
- cobertura mais avançada de `Plans & Offers`
- caminhos mais abrangentes para a execução de renovações e geração de pedidos
- cobertura mais abrangente de cobrança de pagamentos e artefatos de pedidos para `Dunning`

Isso mantém a geração de dados de teste em um único local público e facilmente localizável para todo o módulo `Subscriptions`.
