# Reordenar: análise de cancelamento e retenção e especificações de KPI

Este documento cobre a etapa `2.5.13` de `documentation/implementation_plan.md`.

Objetivo:
- definir o contrato de análise de rotatividade para `Cancelamento e Retenção`
- definir como os principais motivos devem ser relatados
- definir como a aceitação da oferta de retenção deve ser medida
- definir como a taxa de retenção versus taxa de cancelamento deve ser medida
- decidir se os KPIs são provenientes de `CancellationCase`, `RetentionOfferEvent` ou do status final da assinatura

Esta especificação se baseia em:
- `reordenar/docs/specs/cancellation-retention/domain-model.md`
- `reordenar/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reorder/docs/specs/cancellation-retention/lifecycle-semantics.md`
- `reordenar/docs/specs/cancellation-retention/query-read-model.md`

A direção segue os padrões da Medusa:
- os relatórios devem usar campos estruturados explícitos pertencentes ao agregado relevante
- as métricas em nível de evento devem usar histórico de eventos somente anexados, em vez de suposições agregadas inferidas
- o status do ciclo de vida de outros módulos não deve substituir a análise de processos pertencente ao módulo personalizado
- a análise deve permanecer alinhada com a propriedade do domínio e a operabilidade do administrador

Status de implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte de verdade em tempo de design para análise de rotatividade e semântica de KPI do futuro módulo de cancelamento

## 1. Decisão central de relatórios

As principais fontes de análise devem ser:
- `CancellationCase` para KPIs em nível de processo e nível de resultado
- `RetentionOfferEvent` para KPIs em nível de oferta

O status final do ciclo de vida da assinatura não deve ser a principal fonte de análise de rotatividade.

Por quê:
- `Assinatura` não possui o processo de cancelamento
- `Subscription.status` não explica por que ocorreu um cancelamento
- `Subscription.status` não preserva a jornada de retenção ou o histórico de ofertas
- a análise do recurso de cancelamento deve permanecer enraizada no agregado do processo e no seu histórico de eventos

## 2. Fonte da verdade por tipo de KPI

### `Caso de cancelamento`

`CancellationCase` deve ser a fonte da verdade para:
- principais categorias de motivos
- volume da caixa
- volume da caixa terminal
- taxa de retenção
- taxa de cancelamento
- taxa de pausa
- tendências de resultados ao longo do tempo

Por quê:
- o caso possui:
  - `razão_categoria`
  - `razão`
  - `estado`
  - `resultado_final`
  - `criado_em`
  - `finalizado_em`

Esses campos são o contrato explícito de relatório do processo.

### `RetentionOfferEvent`

`RetentionOfferEvent` deve ser a fonte da verdade para:
- taxa de aceitação da oferta
- taxa de rejeição de ofertas
- oferecer taxa aplicada
- taxa de aceitação por tipo de oferta
- oferecer volume por tipo
- oferecer tendências ao longo do tempo

Por quê:
- um evento representa uma proposta de oferta e decisão concreta
- os KPIs em nível de evento devem ser baseados apenas no histórico de anexos, e não inferidos do resumo agregado

### `Assinatura`

A `assinatura` não deve ser a principal fonte de KPIs de rotatividade.

Pode ser usado apenas como:
- um sinal de validação do ciclo de vida
- uma verificação de consistência secundária
- um contexto de apoio para relatórios de negócios recorrentes mais amplos fora deste recurso

## 3. Principais motivos

### Decisão final

Os principais motivos devem ser informados principalmente a partir de `CancellationCase.reason_category`.

`CancellationCase.reason` deve ser tratado como um contexto de detalhamento qualitativo, e não como a chave de agregação principal.

### KPIs recomendados

Agregação primária:
- contagem de casos agrupados por `reason_category`

Interpretação padrão recomendada:
- relatar os principais motivos de todos os casos que entram no processo de cancelamento

Aperfeiçoamento opcional:
- permitir a filtragem para casos concluídos apenas quando um relatório desejar mostrar apenas os resultados finalizados do tratamento de cancelamentos

### Função do campo de texto livre `motivo`

O `reason` deve oferecer suporte a:
- análise detalhada
- exportações
- auditoria de operadores
- investigação qualitativa

Isso não deve ser considerado como a principal chave de relatório estruturado.

## 4. Taxa de aceitação das ofertas de retenção

### Decisão final

A taxa de aceitação deve ser informada a partir do `RetentionOfferEvent`.

### Definição recomendada

Numerador:
- número de eventos de oferta com `decision_status IN ('accepted', 'applied')`

Denominador:
- número total de eventos de oferta propostos na linha do tempo do processo

Interpretação prática recomendada no MVP:
- todas as linhas `RetentionOfferEvent` pertencem ao denominador

### Por que “applied” faz parte dos resultados aceitos

“aplicado” é uma forma mais forte de “resultado aceito”.

Portanto:
- “aceito” significa que a decisão positiva foi registrada;
- “aplicado” significa que a decisão positiva foi concretizada

Ambos devem ser levados em conta no cálculo da taxa de aceitação.

### Requisito de detalhamento

A aceitação também deve ser reportada por:
- `pause_offer`
- `discount_offer`
- `bonus_offer`

Isso é necessário para avaliar quais táticas de retenção apresentam melhor desempenho.

## 5. Taxa de retenção versus taxa de cancelamento

### Decisão final

A taxa de retenção e a taxa de cancelamento devem ser relatadas a partir dos resultados finais no `CancellationCase`.

### População do terminal

O denominador deve ser composto por casos definitivamente resolvidos:
- `final_outcome = retido`
- `final_outcome = suspenso`
- `final_outcome = cancelado`

### Taxa de retenção

Numerador:
- casos com `final_outcome IN ('retido', 'pausado')`

Denominador:
- casos com `final_outcome IN ('retido', 'pausado', 'cancelado')`

Por que `pausado` conta como retenção:
- a pausa foi definida anteriormente como um resultado de retenção do processo de cancelamento
- mesmo que se materialize no ciclo de vida `Subscription.status = paused`, ainda significa que a rotatividade foi evitada no nível do processo

### Taxa de cancelamento

Numerador:
- casos com `final_outcome = 'canceled'`

Denominador:
- casos com `final_outcome IN ('retido', 'pausado', 'cancelado')`

## 6. Taxa de pausa

`pause_rate` deve ser suportado como um KPI separado derivado de `CancellationCase`.

### Definição recomendada

Numerador:
- casos com `final_outcome = 'pausado'`

Denominador:
- casos com `final_outcome IN ('retido', 'pausado', 'cancelado')`

Por quê:
- a pausa é um resultado de salvamento distinto e não deve desaparecer dentro de um total de retenção genérico

## 7. Semântica de tendências

Os relatórios de tendências devem seguir o relógio semântico de cada categoria de KPI.

### Tendências de entrada de casos

Usar:
- `CancellationCase.created_at`

Para:
- volume do caso ao longo do tempo
- tendência de intenção de rotatividade de entrada
- principais razões ao longo do tempo

### Tendências de resultados de casos

Usar:
- `CancellationCase.finalized_at`

Para:
- taxa de retenção ao longo do tempo
- cancelar taxa ao longo do tempo
- taxa de pausa ao longo do tempo

### Tendências de ofertas

Usar:
- `RetentionOfferEvent.created_at`

Para:
- número de ofertas propostas ao longo do tempo
- volume do tipo de oferta ao longo do tempo

### Tendências de ofertas aplicadas

Usar:
- `RetentionOfferEvent.applied_at`

Para:
- efeitos de oferta materializados ao longo do tempo

Esses eixos de tempo não devem ser reduzidos a um relógio de tendência genérico.

## 8. Resumo do contrato de KPI

### KPIs provenientes de `CancellationCase`

- `top_reason_categories`
- `volume_caso`
- `terminal_case_volume`
- `taxa_de_retenção`
- `cancelar_taxa`
- `pause_rate`
- `resultado_tendência`

### KPIs provenientes de `RetentionOfferEvent`

- `offer_acceptance_rate`
- `offer_rejection_rate`
- `offer_applied_rate`
- `acceptance_rate_by_offer_type`
- `volume_oferta_por_tipo`
- `oferta_tendência`

### KPIs não originados principalmente de `Assinatura`

Não calcule principalmente análises de rotatividade a partir de:
- `Assinatura.status = cancelada`
- `Subscrição.status = pausado`

Por quê:
- estes são efeitos do ciclo de vida, não registros completos do tratamento de cancelamentos
- eles não fornecem a semântica de processo necessária

## 9. Decisão sumária

O contrato de análise de rotatividade para MVP é:
- KPIs de processo e resultado vêm de `CancellationCase`
- KPIs de decisão de oferta vêm de `RetentionOfferEvent`
- o status final do ciclo de vida da assinatura oferece suporte apenas ao contexto

Isso mantém a análise alinhada com o design do domínio:
- um processo agregado para tratamento de cancelamento
- um histórico de eventos somente anexado para ofertas concretas
- uma fonte de relatórios clara por tipo de KPI
