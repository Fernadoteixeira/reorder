# Arquitetura de análise

Este documento descreve a arquitetura de tempo de execução atual da área `Analytics` no plug-in `Reorder`.

É a fonte de verdade em tempo de execução para:
- regras de propriedade e de fonte de verdade
- limites do modelo de leitura de análises
- relações com módulos existentes de comércio recorrente
- instantâneo diário e semântica de agregação

## Objetivo

A área `Analytics` oferece relatórios e visualizações de KPIs voltados para os operadores, relativos ao comércio recorrente, no Admin.

Seu objetivo é:
- disponibilizar valores estáveis de KPIs, como `MRR`, `churn_rate`, `ltv` e `active_subscriptions_count`
- exibir tendências temporais para análise operacional e de negócios
- exibir uma tendência diária de assinaturas criadas para análise da operadora
- oferecer suporte à filtragem, agrupamento e exportação no Admin
- fornecer uma camada de análise rápida orientada para leitura, sem alterar a propriedade do domínio no plug-in

Seu objetivo não é substituir os módulos de origem que já possuem um status de assinatura, renovação, cancelamento ou auditoria.

## Função de arquitetura

`Analytics` é uma camada de relatórios derivada e voltada para a leitura.

Ele agrega e pré-calcula os dados de relatórios dos domínios de comércio recorrente implementados no plug-in.

A principal decisão arquitetônica é:

- `Analytics` não é a fonte de verdade para o estado dos negócios.
- `Analytics` é a fonte de verdade apenas para seus próprios modelos de leitura derivados, instantâneos diários e resultados agregados de KPIs.

Isso significa que a área é responsável pelos resultados dos relatórios, mas não pelo ciclo de vida ou pelo estado do processo subjacente dos quais esses resultados são derivados.

## Limites de propriedade

O modelo atual de propriedade do plug-in permanece inalterado.

`Subscriptions` continua sendo a fonte de referência para:
- estado do ciclo de vida da assinatura
- status da assinatura (ativa ou inativa)
- campos de cadência e frequência de cobrança
- `next_renewal_at`
- `cancel_effective_at`
- instantâneos de produto, cliente, preços e frete armazenados na assinatura
- a base operacional utilizada para a contagem de assinaturas ativas e cálculos do valor das assinaturas com foco na MRR

`Plans & Offers` continua sendo a fonte de referência para:
- política de ofertas de assinatura
- frequências permitidas
- regras de desconto
- regras de validação de ofertas válidas

`Plans & Offers` não são a fonte de referência para os totais dos relatórios.
Eles podem fornecer classificação ou contexto explicativo, mas não são responsáveis pelos resultados dos KPIs.

`Renewals` continua sendo a fonte de referência para:
- histórico de execução de renovações
- histórico de tentativas de renovação
- resultados das aprovações
- resultados de execução (sucesso e falha)

A `Renewals` pode fornecer dados utilizados pela análise, mas continua sendo a proprietária do histórico de execução.

`Dunning` continua sendo a fonte de referência para:
- status da recuperação do pagamento
- programação de novas tentativas
- histórico de tentativas de recuperação
- resultados recuperados e não recuperados

O `Dunning` poderá, no futuro, oferecer suporte a relatórios voltados para a recuperação, mas não é responsável pelos principais resultados de KPIs de assinatura no MVP.

`Cancellation & Retention` continua sendo a fonte de referência para:
- status do processo de cancelamento
- motivo da baixa e categoria normalizada
- status da recomendação de retenção
- histórico de ofertas de retenção
- resultados finais de cancelamento e retenção

Essa área é a principal fonte de dados para relatórios voltados para a rotatividade.

`Activity Log` continua sendo a fonte de referência para:
- eventos de auditoria empresarial do tipo “somente acréscimo” relacionados a operações de assinatura

No entanto:
- `Activity Log` não é a fonte principal para os cálculos de KPIs
- `Activity Log` é uma camada de auditoria e investigação, e não a tabela de fatos analítica canônica para relatórios de negócios

## Regras da “Fonte da Verdade”

A área `Analytics` segue estas regras de “fonte de verdade”:

- Os dados de entrada dos KPIs devem ser lidos do módulo de domínio responsável pelo fato de negócios.
- Os intervalos de tendência derivados e os agregados diários devem ser armazenados por `Analytics`.
- `Analytics` não deve redefinir a propriedade de negócios que pertença a outro módulo.
- `Analytics` não deve usar `Activity Log` como fonte primária para cálculos de KPIs essenciais quando o fato já existir em um módulo proprietário.
- `Analytics` pode usar dados de auditoria apenas como recurso alternativo, auxílio à auditoria ou auxílio à validação, e não como fonte padrão de relatórios.

### Mapeamento de fontes primárias

Para o MVP, o mapeamento da fonte primária é:

- `active_subscriptions_count`
  - fonte primária: `Subscriptions`
- `MRR`
  - fonte primária: `Subscriptions`
  - com base nas assinaturas ativas e em seus registros persistentes de preços e periodicidade
- `churn_rate`
  - fonte primária: `Cancellation & Retention`
  - o denominador pode depender da base de assinaturas ativas derivada de `Subscriptions`
- `LTV`
  - fonte primária: derivada de `Analytics`
  - construída a partir de dados de origem pertencentes a `Subscriptions`, `Renewals` e, possivelmente, `Cancellation & Retention`, dependendo da definição comercial final
- `created_subscriptions_count`
  - fonte primária: `Subscriptions`
  - com base em `subscription.created_at` agrupado por dia UTC

## Definições de negócios e semântica de cálculos

A área `Analytics` utiliza definições comerciais explícitas do MVP, em vez de uma lógica de relatórios inferida.

Isso mantém a camada de relatórios estável e torna visíveis as escolhas de compromisso na implementação posterior.

### Semântica da assinatura ativa

Para fins de análise, `active` significa:
- `subscription.status = active`

Isso significa que:
- As assinaturas `paused` não fazem parte da base de assinaturas recorrentes ativas
- As assinaturas `past_due` não fazem parte da base de assinaturas recorrentes ativas
- As assinaturas `cancelled` não fazem parte da base de assinaturas recorrentes ativas

`active_subscriptions_count` é, portanto, o número de assinaturas cujo estado atual no ciclo de vida é exatamente `active`.

### Semântica do MRR

Para o MVP, `MRR` significa:
- o valor recorrente normalizado mensalmente das assinaturas ativas

No entanto, o plugin atual ainda não armazena um registro completo e recorrente dos valores monetários diretamente no agregado da assinatura.

Estado atual de execução:
- `Subscriptions` possui cadência e estado de ciclo de vida próprios
- `subscription.pricing_snapshot` armazena o contexto do desconto, não o valor total da cobrança recorrente
- os fluxos de execução de renovação podem resolver `order.total`
- os fluxos de execução de renovação podem resolver `cart.currency_code`

Por isso, a entrada monetária recorrente canônica para `MRR` no MVP deve provir de:
- instantâneos monetários derivados, de responsabilidade da equipe de análise, construídos a partir de dados de renovações e pedidos

Isso significa que:
- `Subscriptions` continua sendo o responsável pela semântica de base ativa e de cadência
- `Analytics` é responsável pelo modelo de leitura monetária recorrente derivado, utilizado para a elaboração de relatórios

Se não houver um instantâneo monetário válido para uma assinatura, essa assinatura não contribui para `MRR`.

### Semântica da taxa de rotatividade

Para o MVP, `churn_rate` significa:
- assinaturas canceladas no período do relatório divididas pela base de assinaturas ativas no mesmo período

Numerador:
- assinaturas cujo resultado final do cancelamento seja `canceled`
- a atribuição ao bucket utiliza `finalized_at`
- se `finalized_at` estiver ausente, o mecanismo de fallback poderá utilizar `cancellation_effective_at`

Denominador:
- média diária da base de assinantes ativos para o mesmo período de relatório
- calculada a partir de instantâneos analíticos diários provenientes de `Subscriptions`

Isso significa que:
- `retained` não é considerado churn
- `paused` não é considerado churn
- apenas os resultados finais cancelados contribuem para o churn

### Semântica do LTV

Para o MVP, `LTV` significa:
- `MRR / churn_rate`

Onde:
- `churn_rate` é tratado como uma razão no cálculo, e não como uma string formatada como porcentagem

Se:
- `MRR` não estiver disponível
- ou `churn_rate <= 0`

então:
- `LTV = null`

Esta é uma definição intencional de MVP e não um modelo completo de valor ao longo da vida do cliente.

### Semântica do intervalo de datas

Os intervalos de datas da análise seguem estas regras:
- `date_from` é inclusivo
- `date_to` é inclusivo
- Os cálculos de KPIs são realizados com base nos fatos dentro do período de relatório selecionado
- Os cálculos de tendências são realizados com base em janelas de intervalos normalizadas dentro do período de relatório selecionado

Especificamente para a tendência de assinaturas criadas:
- a janela de relatório ainda é controlada por `date_from` e `date_to`
- os intervalos são sempre diários em UTC
- `status`, `product_id`, `frequency` e `group_by` não afetam essa série

### Semântica do bucket

Categorias de relatório compatíveis:
- `day`
- `week`
- `month`

Regras do bucket:
- `day` corresponde a um dia do calendário
- `week` corresponde de segunda a domingo
- `month` corresponde ao mês do calendário

Cada ponto é definido por:
- `bucket_start`
- `bucket_end`

e representa o resultado agregado para essa janela de intervalo específica.

### Semântica dos fusos horários

Para o MVP, o fuso horário padrão para análises é:
- `UTC`

Isso significa que:
- os snapshots diários são gerados em `UTC`
- os limites dos intervalos diários, semanais e mensais são calculados em `UTC`
- a formatação da interface de administração pode ser localizada posteriormente, mas a semântica dos relatórios permanece `UTC`

### Semântica do arredondamento

A camada de relatórios mantém a precisão de cálculo durante o processamento e arredonda apenas no momento da resposta.

Precisão da exibição do MVP:
- `MRR`: `2`
- `churn_rate`: `2`
- `LTV`: `2`
- `active_subscriptions_count`: `0`
- `created_subscriptions_count`: `0`

### Semântica das moedas

A análise do MVP pressupõe uma moeda de relatório por conjunto de resultados, a menos que seja introduzida posteriormente uma normalização explícita.

Isso significa que:
- `MRR` e `LTV` só são válidos quando o instantâneo de receita de análise subjacente é resolvido em um único contexto monetário
- a agregação de moedas mistas sem normalização não é suportada
- quando o contexto monetário for ambíguo, `MRR` e `LTV` devem ser resolvidos como `null`, em vez de gerar um total enganoso

`churn_rate` e `active_subscriptions_count` são independentes da moeda.

## Leituras diretas da fonte x instantâneos diários

A área `Analytics` distingue entre:
- leituras diretas da fonte provenientes de módulos do domínio proprietário
- instantâneos e agregados de análise armazenados

### Leituras diretas da fonte

As leituras diretas dos módulos de domínio são utilizadas para:
- entradas iniciais de cálculo
- reconstrução do histórico de análises
- validação da exatidão da agregação
- recálculo de pequeno escopo, quando necessário

Essas leituras devem provir dos módulos responsáveis pelos fatos subjacentes.

### Instantâneos diários

Os snapshots diários são utilizados para:
- Visualização de tendências de KPIs no Admin
- Consultas históricas por intervalos de data mais amplos
- Comportamento estável na exportação
- Leituras repetidas mais rápidas com filtros e agrupamentos

Os instantâneos diários representam um estado derivado.

Eles não substituem os módulos originais.
Eles existem para oferecer:
- latência previsível nas consultas
- comportamento estável das séries temporais
- APIs de relatórios administrativos mais simples

## Camada de dados e propriedade dos módulos

A área `Analytics` deve ser implementada como um módulo personalizado dedicado no plug-in.

Estrutura recomendada para o módulo:
- `src/modules/analytics/models/*`
- `src/modules/analytics/service.ts`
- `src/modules/analytics/index.ts`

O módulo segue o mesmo padrão Medusa utilizado pelas áreas de plug-ins existentes:
- o modelo de dados do domínio está no módulo
- o serviço do módulo detém o acesso CRUD às tabelas pertencentes à análise
- os fluxos de trabalho e as tarefas preenchem os dados de análise derivados
- as rotas da API de administração leem os instantâneos pertencentes à análise e os agregados

### Limite de propriedade

O módulo `analytics` contém:
- instantâneos diários de análise
- fatos derivados voltados para relatórios
- resultados agregados otimizados para leitura, disponibilizados ao Admin

O módulo `analytics` não é responsável por:
- o estado do ciclo de vida da assinatura;
- o estado da execução da renovação;
- o estado do processo de cancelamento;
- a responsabilidade pelos eventos de auditoria

Isso significa que o módulo é um domínio de relatórios, e não um domínio operacional.

## Modelo de dados MVP recomendado

Para o MVP, o modelo principal recomendado é:
- `subscription_metrics_daily`

Esse modelo deve ser a tabela de instantâneo analítico padrão utilizada por consultas de KPIs, consultas de tendências e exportações.

### Por que um modelo de instantâneo diário

O plug-in atual já separa:
- módulos de origem que contêm fatos de negócios
- caminhos de leitura otimizados para o Admin
- lógica de agendamento e fluxo de trabalho que gera resultados operacionais

O mesmo princípio deveria se aplicar neste caso.

Uma tabela de resumo analítico diário oferece:
- desempenho estável para leituras do administrador
- semântica de reconstrução explícita
- baixo acoplamento às formas de consulta do módulo de origem
- flexibilidade suficiente para agregar por data, status, produto e cadência sem precisar reler o gráfico operacional completo a cada solicitação

### Por que não usar uma visualização materializada como modelo MVP principal?

Para o MVP, a camada de análise não deve utilizar uma visão materializada do banco de dados como sua principal fonte de verdade.

Motivos:
- maior complexidade operacional
- a semântica de atualização introduz um acoplamento desnecessário ao comportamento específico do banco de dados
- a reconstrução e o preenchimento retroativo tornam-se menos explícitos
- a arquitetura atual do plug-in privilegia modelos de dados próprios do Medusa, além de fluxos de trabalho/tarefas, em detrimento de primitivas de geração de relatórios específicas do banco de dados

As visualizações materializadas poderão ser implementadas posteriormente, caso o desempenho assim o exija.

Para o MVP:
- as tabelas de instantâneos de propriedade da análise devem ser a principal camada de relatórios persistentes
- a agregação no momento da consulta deve ocorrer nos auxiliares de leitura ou serviços de análise

## `subscription_metrics_daily` Semântica de instantâneos

`subscription_metrics_daily` deve ser um instantâneo de dados analíticos por assinatura e por dia.

A granularidade recomendada é:
- uma linha por `subscription_id`
- por `metric_date`

Esse modelo é preferível às linhas de produto/dia já agregadas, pois preserva detalhes suficientes para:
- filtragem por dimensões de assinatura
- reconstruções e preenchimentos retrospectivos confiáveis
- expansão futura das dimensões sem a necessidade de reprojetar toda a camada de relatórios

### Campos recomendados

Os campos MVP recomendados são:
- `id`
- `metric_date`
- `subscription_id`
- `customer_id`
- `product_id`
- `variant_id`
- `status`
- `frequency_interval`
- `frequency_value`
- `currency_code`
- `is_active`
- `active_subscriptions_count`
- `mrr_amount`
- `churned_subscriptions_count`
- `churn_reason_category`
- `source_snapshot`
- `metadata`

### Funções de campo

`metric_date`
- o dia de análise representado pela linha
- normalizado para `UTC`

`subscription_id`
- a assinatura para a qual o instantâneo foi calculado
- armazenado de forma persistente para permitir a reconstrução idempotente e a reconciliação posterior

`customer_id`
- dimensão opcional de relatório

`product_id`, `variant_id`
- dimensões de relatório utilizadas por filtros e futuras segmentações

`status`
- o estado do ciclo de vida da assinatura para o dia representado

`frequency_interval`, `frequency_value`
- dimensões de cadência utilizadas pelos filtros de relatórios

`currency_code`
- contexto da moeda de relatório para métricas monetárias
- pode ser nulo quando a receita não for calculável

`is_active`
- marcador booleano derivado da semântica “analytics-active”
- `true` somente quando o instantâneo deve contribuir para os cálculos da base ativa

`active_subscriptions_count`
- `1` quando a linha contribui para a contagem de assinaturas ativas
- `0` caso contrário

`mrr_amount`
- a contribuição da receita recorrente, normalizada mensalmente, da assinatura para aquele dia
- pode ser nulo quando não houver um registro monetário válido

`churned_subscriptions_count`
- `1` apenas no dia em que a assinatura contribui para o numerador da taxa de cancelamento
- `0` nos demais casos

`churn_reason_category`
- preenchido apenas quando a linha contribui para relatórios voltados para a rotatividade

`source_snapshot`
- JSON compacto que descreve a base de origem dos relatórios utilizada para calcular a linha
- pode incluir referências estáveis, tais como:
  - identificadores de renovação
  - identificadores de cancelamento
  - dicas de origem monetária resolvidas

`metadata`
- metadados técnicos extensíveis de propriedade da área de análise

## Métricas derivadas x Fatos persistentes

A camada de análise deve armazenar os fatos dos relatórios, e não todos os KPIs finais como campos armazenados.

Os dados sobre o MVP que devem ser mantidos incluem:
- contribuição da base ativa
- contribuição para a receita normalizada mensalmente
- contribuição para a rotatividade

Métricas derivadas, como `LTV`, devem ser calculadas na camada de leitura de análises.

### Tratamento de `LTV`

`LTV` não deve ser armazenado como um campo diário canônico no MVP.

Em vez disso:
- `LTV` é derivado no momento da leitura a partir de fatos de relatório armazenados
- a camada de leitura o calcula a partir das semânticas atuais de `MRR` e `churn_rate`

Isso mantém o modelo de instantâneo mais simples e evita que o plug-in fique preso prematuramente a uma única interpretação persistente de `LTV`.

## Exclusividade e semântica de reconstrução

O modelo de snapshot diário deve permitir reconstruções idempotentes.

Exclusividade lógica recomendada:
- `metric_date`
- `subscription_id`

Isso permite:
- recálculo seguro no nível diário
- reconstrução de intervalos
- substituição de instantâneos no estilo “upsert”
- reconciliação mais fácil com os domínios de origem

## Estratégia de indexação

O modelo de instantâneo deve ser indexado para os futuros filtros de análise do Admin e consultas de tendências.

Índices de campo único recomendados:
- `metric_date`
- `subscription_id`
- `product_id`
- `status`
- `currency_code`
- `frequency_interval`
- `frequency_value`

Índices compostos recomendados:
- `metric_date, status`
- `metric_date, product_id`
- `metric_date, frequency_interval, frequency_value`
- `metric_date, currency_code`
- `metric_date, churn_reason_category`

Esses índices estão alinhados com os filtros previstos para o MVP:
- intervalo de datas
- status
- produto
- frequência
- agrupamento por dia, semana ou mês

## Estratégia do Modelo de Leitura

A rota de leitura de análises do Admin deve usar `subscription_metrics_daily` como fonte de relatório.

Isso significa que:
- As consultas de KPI agregam fatos de instantâneos persistentes ao longo do intervalo de datas selecionado
- As consultas de tendência agrupam fatos de instantâneos persistentes nos buckets `day`, `week` e `month`
- As consultas de exportação transformam a mesma fonte de relatório em linhas prontas para exportação

Exceção implementada:
- a tendência das assinaturas criadas é lida diretamente de `subscription.created_at`
- ela é representada como um intervalo de um dia UTC por ponto
- ela não é obtida de `subscription_metrics_daily`

O caminho de leitura do Admin não deve:
- calcular análises em tempo real a partir dos módulos de origem a cada solicitação
- usar `Activity Log` como sua principal fonte de dados factuais
- depender de auxiliares de consulta operacionais de módulos não relacionados para o desempenho do painel

## Relação com os módulos de origem

O fluxo de dados recomendado é:

1. Os módulos de origem mantêm os dados brutos
2. O pipeline de análise lê esses dados
3. O módulo de análise grava `subscription_metrics_daily`
4. Os auxiliares de leitura do Admin agregam instantâneos em KPIs, tendências e cargas de exportação

## Pipeline de reconstrução implementado

O pipeline de análise implementado utiliza um fluxo de trabalho de reconstrução compartilhado:
- `rebuildAnalyticsDailySnapshotsWorkflow`

Esse fluxo de trabalho é o único local onde os instantâneos analíticos diários são gerados novamente.

É reutilizado por:
- a tarefa de análise agendada
- execuções incrementais de acompanhamento após fluxos de trabalho de domínios selecionados
- a rota de reconstrução manual do administrador

### Tipos de gatilhos

O fluxo de trabalho aceita:
- `scheduled`
- `incremental`
- `manual`

Esse tipo de gatilho é armazenado nos metadados do snapshot e incluído nos registros estruturados.

### Semântica de intervalo e de dia

A entrada de reconstrução é normalizada para:
- `date_from`
- `date_to`
- uma lista de dias `UTC` normalizados

Em seguida, o fluxo de trabalho processa o intervalo:
- dia a dia
- lote a lote dentro de cada dia

### Semântica da substituição total

Para um determinado dia:
- as linhas existentes de `subscription_metrics_daily` para esse dia são lidas
- as linhas para esse dia são excluídas
- as linhas recém-calculadas são inseridas

Se a inserção falhar após a exclusão:
- o fluxo de trabalho tenta restaurar as linhas excluídas

Isso proporciona ao pipeline:
- reexecuções idempotentes
- semântica explícita de reconstrução no nível diário
- comportamento previsível na substituição de instantâneos

## Atualizações incrementais

A abordagem incremental do MVP implementada reutiliza o mesmo fluxo de trabalho compartilhado de recompilação para pequenos intervalos de `UTC`.

Os pontos de acionamento atuais são:
- retomada da assinatura
- finalização do cancelamento
- processamento de renovação que pode afetar o instantâneo da receita

Recompilações incrementais intencionais:
- não calculam valores de KPI diretamente nos fluxos de trabalho do domínio
- acionam apenas a recompilação do instantâneo de análise compartilhada

## Tarefa agendada

A tarefa agendada executada é:
- `process-analytics-daily-snapshots`

Seu comportamento é:
- é executado diariamente
- reconstrói o `today` mais uma pequena janela de retrocesso
- utiliza um bloqueio global de tarefa
- gera logs de resumo estruturados

A janela de retrospectiva existe para oferecer um mecanismo de autocorreção de baixo custo para alterações recentes nos dados.

## Bloqueio

O pipeline implementado utiliza dois níveis de bloqueio:

- bloqueio no nível da tarefa
  - impede a execução paralela de tarefas agendadas
- bloqueio no nível do intervalo/dia
  - protege a execução da reconstrução para o mesmo intervalo e o mesmo dia específico

Os dias bloqueados são tratados como:
- trabalho bloqueado operacionalmente
- não como corrupção fatal do domínio

Elas são exibidas nos resumos de fluxo de trabalho e de tarefas para que possam ser repetidas posteriormente.

## Verificações de qualidade dos dados

O pipeline de reconstrução inclui verificações de qualidade dos dados em tempo de execução após a geração do snapshot.

As verificações atuais do MVP abrangem:
- `MRR` picos e quedas que ultrapassam os limites configurados
- `churn_rate` picos que ultrapassam os limites configurados
- dias sem snapshot
- dias com snapshot incompleto

Resultados de qualidade:
- não impedem, por si só, que uma recompilação seja bem-sucedida
- são gerados como registros estruturados `analytics.quality`
- são resumidos nos registros de recompilação por meio de contadores de avisos e erros

## Controle de versão das métricas

O ambiente de execução de análises utiliza uma constante canônica de definição de métricas:
- `ANALYTICS_METRICS_VERSION`

Versão atual:
- `analytics-v1`

Esta versão está associada a:
- instantâneo `metadata`
- respostas de KPIs
- respostas de tendências
- respostas de exportação
- logs de reconstrução e qualidade

A versão deve ser atualizada quando os mesmos dados de origem puderem gerar resultados analíticos diferentes devido a uma alteração em:
- fórmulas de KPI;
- semântica de estado ativo;
- semântica de intervalos;
- semântica de moeda

Reestruturações puras, sem alterações na saída, não devem aumentar o número da versão.

## Modelo de leitura implementado

O modelo de leitura “Admin” implementado está presente nos auxiliares de consulta de análise e faz a leitura principalmente a partir de:
- `subscription_metrics_daily`
- `subscription.created_at` apenas para a tendência de assinaturas criadas

Ele não recalcula os valores dos KPIs a partir dos módulos operacionais em tempo real a cada solicitação.

Superfícies de leitura implementadas:
- Resumo de KPIs
- Séries de tendências
- Exportação de linhas

Exceção de tendência implementada:
- `created_subscriptions_count`
  - agrupada a partir de `subscription.created_at`
  - sempre retornada como intervalos diários em UTC
  - preenche com zeros os dias ausentes dentro do intervalo selecionado

### Semântica dos KPIs na camada de leitura implementada

Atualmente, a camada de leitura calcula:
- `MRR`
  - a partir do último bucket na janela atual
- `active_subscriptions_count`
  - a partir do último bucket na janela atual
- `churn_rate`
  - a partir do numerador da rotatividade total dividido pela média da base ativa diária ao longo da janela
- `LTV`
  - a partir de `MRR / churn_rate`

`MRR` e `LTV` podem ser substituídos por `null` quando:
- o conjunto de resultados for composto por moedas diferentes
- não houver uma base de receita válida
- `churn_rate <= 0` para `LTV`

## Observabilidade e Desempenho

O ambiente de execução de análise gera registros estruturados para:
- `analytics.rebuild`
- `analytics.job`
- `analytics.quality`
- `analytics.read.kpis`
- `analytics.read.trends`
- `analytics.read.export`

A carga útil atual de observabilidade inclui:
- `metrics_version`
- `duration_ms`
- resumo do intervalo de datas
- resumo de dias processados e linhas processadas, quando aplicável
- contagem de dias bloqueados e com falhas, quando aplicável
- `alertable`

Os limites atuais de execução lenta do MVP são:
- reconstrução: `> 5000 ms`
- tarefa agendada: `> 5000 ms`
- caminhos de leitura: `> 1000 ms`

Esses limites afetam a gravidade dos registros e a classificação `alertable`, mas não alteram o comportamento funcional da API.
4. As rotas de análise administrativa são lidas a partir da camada de instantâneos de análise

Isso preserva:
- a propriedade do código-fonte
- o isolamento dos módulos do Medusa
- o comportamento previsível da geração de relatórios

## Pipeline de atualização de métricas

A área `Analytics` deve utilizar um pipeline compartilhado de recálculo para a geração de instantâneos diários.

A principal decisão arquitetônica é:
- um único fluxo de trabalho compartilhado é responsável pela semântica de recálculo;
- a execução programada, as atualizações incrementais e as reconstruções são todas delegadas a esse mesmo fluxo de trabalho

Isso mantém a consistência da camada de relatórios e evita implementações divergentes da mesma lógica de cálculo.

## Fluxo de trabalho compartilhado de reconstrução

O ponto de entrada central para o recálculo deve ser um fluxo de trabalho responsável por reconstruir os instantâneos diários de análise para um intervalo de datas.

Função recomendada no fluxo de trabalho:
- normalizar e validar o intervalo de datas solicitado
- iterar dia a dia
- reconstruir fatos analíticos para cada dia
- armazenar linhas de instantâneos diários idempotentes
- retornar um resumo estruturado do trabalho realizado

Entrada lógica recomendada:
- `date_from`
- `date_to`
- `trigger_type`
  - `scheduled`
  - `incremental`
  - `manual`
- `triggered_by`
- `reason`
- `correlation_id`

Saída lógica recomendada:
- `processed_days`
- `processed_subscriptions`
- `upserted_rows`
- `skipped_rows`
- `failed_days`

## Unidade de recálculo

A unidade principal de recálculo deve ser:
- um intervalo de datas

No fluxo de trabalho:
- o intervalo é normalizado de acordo com os limites de `UTC` dias
- o processamento ocorre dia a dia
- para cada dia, as linhas do instantâneo são reconstruídas em lotes

Essa abordagem é preferível em relação a:
- calcular diretamente valores isolados de KPIs;
- recalcular todo o conjunto de dados analíticos em uma única passagem de grande porte

O dia é a unidade atômica natural do modelo de relatório do MVP.

## Tarefa agendada diariamente

A área de análise deve disponibilizar uma tarefa agendada diariamente que acione o fluxo de trabalho de reconstrução compartilhada.

Responsabilidades recomendadas para a função:
- adquirir um bloqueio no nível do agendador
- determinar a janela de recálculo diária
- executar o fluxo de trabalho de reconstrução
- gerar logs operacionais e métricas resumidas

O modelo de execução diária recomendado é:
- recalcular `today`
- recalcular uma janela de análise retrospectiva curta para os últimos dias

Por que a janela de retrospectiva é recomendada:
- alterações recentes relacionadas a renovações, cancelamentos ou recuperações podem afetar os instantâneos diários anteriores
- uma janela curta de recálculo contínuo ajuda a corrigir automaticamente inconsistências recentes
- isso reduz a dependência de um comportamento incremental perfeito orientado por eventos

## Atualizações incrementais

O pipeline de análise do MVP pode suportar atualizações incrementais, mas elas não devem introduzir um segundo caminho de computação.

As atualizações incrementais devem:
- acionar o mesmo fluxo de trabalho compartilhado de recompilação
- abranger um intervalo de datas reduzido
- permanecer opcionais e complementares à tarefa programada

Pontos de acionamento incrementais recomendados:
- retomada da assinatura
- finalização do cancelamento
- execução da renovação que afeta a base de análise financeira

A abordagem incremental não deve:
- calcular KPIs diretamente nas rotas da API
- ignorar fluxos de trabalho
- realizar atualizações parciais ad hoc nas linhas de análise

Em vez disso, os fluxos de trabalho empresariais bem-sucedidos podem acionar um breve período de reconstrução por meio do fluxo de trabalho de recálculo de análises compartilhadas.

## Semântica da idempotência

O pipeline deve ser idempotente no nível do dia.

A regra recomendada é:
- cada dia é reconstruído como um relatório completo que substitui o relatório daquele dia

Isso significa que:
- executar novamente no mesmo dia produz o mesmo estado final do snapshot
- o fluxo de trabalho substitui o resultado do snapshot anterior para aquele dia
- linhas duplicadas não são acrescentadas nas tentativas repetidas ou nas reconstruções

Esse modelo é preferível à correção parcial de linhas, pois simplifica:
- a correção
- a semântica de reconstrução
- a segurança de repetição de tentativas

## Estratégia de bloqueio

O pipeline de análise deve utilizar bloqueios em dois níveis.

### Bloqueio no nível da tarefa

Um bloqueio no nível do agendador impede a execução simultânea de tarefas completas.

Finalidade recomendada:
- impedir que duas instâncias de worker executem a tarefa de análise diária ao mesmo tempo
- tornar o comportamento do agendador previsível do ponto de vista operacional

### Bloqueio por dia

Um bloqueio diário impede o recálculo simultâneo do mesmo dia de relatório.

Finalidade recomendada:
- evitar sobreposição entre a recálculo acionado pelo agendador e as reconstruções manuais
- evitar sobreposição entre a recálculo acionado pelo agendador e as atualizações incrementais acionadas por eventos
- garantir a segurança da semântica de substituição diária

Alvos recomendados para bloqueios lógicos:
- bloqueio de tarefa
- um bloqueio por `metric_date`

Isso está alinhado com os padrões de bloqueio existentes do plug-in em `Dunning`, `Cancellation` e `Renewals`.

## Estratégia de processamento em lote

Para cada dia:
- as assinaturas qualificadas devem ser listadas em lotes
- cada lote deve ser transformado em linhas do instantâneo de análise
- as linhas devem ser armazenadas de forma incremental por lote

Isso evita:
- carregar todo o conjunto de assinantes na memória
- criar uma transação excessivamente grande para o dia inteiro

O tamanho do lote é uma questão de ajuste operacional e deve permanecer configurável no momento da implementação.

## Semântica de preenchimento e reconstrução

A reconstrução manual e o preenchimento retroativo dos dados históricos devem seguir exatamente o mesmo fluxo de trabalho de recálculo que o agendador.

Isso significa:
- não há uma implementação separada para a reconstrução;
- não há um caminho especial de preenchimento retroativo pontual;
- o recálculo histórico consiste apenas na execução do mesmo fluxo de trabalho com um intervalo de datas mais amplo

O modelo de reconstrução recomendado é:
- o operador ou um gatilho interno solicita um intervalo de datas
- o fluxo de trabalho compartilhado recalcula cada dia do intervalo
- cada dia afetado é substituído de forma atômica do ponto de vista analítico

Isso garante que:
- as reconstruções permaneçam consistentes com a execução diária
- a complexidade da implementação permaneça baixa
- as correções históricas não exijam lógica para casos especiais

## Tratamento de erros

O tratamento de falhas deve respeitar os limites de relatórios diários.

Semântica recomendada:
- se um dia não for reconstruído, ele será marcado como com falha no resumo do fluxo de trabalho
- os dias com falha devem poder ser repetidos com segurança
- os dias bem-sucedidos permanecem válidos e não devem ser revertidos por falhas em dias não relacionados

Em um dia, a implementação deve ter como objetivo a semântica de substituição atômica do ponto de vista da geração de relatórios.

Isso significa que:
- o sistema deve evitar deixar um dia em um estado de relatório parcialmente reconstruído
- a próxima tentativa deve ser capaz de reconstruir o dia de forma determinística

## Observabilidade e registro de logs operacionais

O pipeline de análise deve seguir o mesmo padrão operacional utilizado pelas áreas existentes que contam com o agendador.

Ciclo de vida recomendado para os logs:
- `started`
- `completed`
- `blocked`
- `failed`

Campos de resumo recomendados:
- `processed_days`
- `processed_subscriptions`
- `upserted_rows`
- `failed_days`
- `duration_ms`
- `trigger_type`
- `correlation_id`

Isso deve tornar o pipeline de análise operacionalmente comparável a:
- `Renewals`
- `Dunning`
- `Cancellation & Retention`

## Limites do Pipeline do MVP

Para o MVP, o pipeline de análise deve incluir:
- um fluxo de trabalho compartilhado de reconstrução
- uma tarefa agendada diariamente com uma janela de análise retrospectiva curta
- bloqueio no nível do agendador
- bloqueio no nível do dia
- semântica idempotente de substituição de um dia inteiro
- gatilhos incrementais opcionais para eventos-chave de negócios

Para o MVP, o pipeline de análise não deve incluir:
- um segundo caminho de cálculo incremental independente;
- cálculo direto de KPIs nos manipuladores de API;
- correção parcial das linhas de análise diárias como modelo principal de atualização;
- um mecanismo de preenchimento retroativo separado, distinto do fluxo de trabalho compartilhado de reconstrução

## Limites de relatório com módulos existentes

### Relação com `Subscriptions`

`Subscriptions` fornecem a base operacional para a elaboração de relatórios.

O `Analytics` pode derivar:
- contagens ativas
- contagens distribuídas por status
- totais de assinaturas orientados por MRR
- segmentação baseada em frequência

`Analytics` não deve se tornar o proprietário de campos de ciclo de vida, tais como:
- `status`
- `next_renewal_at`
- `cancel_effective_at`

### Relação com `Renewals`

`Renewals` fornece informações sobre o histórico de execução.

O `Analytics` pode fornecer:
- tendências de sucesso e fracasso nas renovações
- tendências de volume de execução
- métricas de apoio relacionadas à receita ou à retenção, caso sejam necessárias posteriormente

`Analytics` não deve se tornar o proprietário de:
- estado do ciclo de renovação
- estado da tentativa
- estado da aprovação

### Relação com `Cancellation & Retention`

`Cancellation & Retention` fornecer dados relacionados à rotatividade.

O `Analytics` pode fornecer:
- taxa de rotatividade
- tendências de cancelamento
- principais categorias de motivos
- índices de retenção versus cancelamento

`Analytics` não deve se tornar o responsável por:
- status do caso de cancelamento
- estado da decisão sobre a oferta
- estado final do processo de cancelamento

### Relação com `Activity Log`

O `Activity Log` oferece visibilidade de auditoria, não responsabilidade pelos KPIs.

`Analytics` pode utilizar `Activity Log` para:
- investigação
- apoio à reconciliação
- validação futura motivada por auditoria

`Analytics` não deve usar `Activity Log` como fonte padrão para:
- `MRR`
- contagem de assinaturas ativas
- cálculo da rotatividade

## Decisão sobre os critérios de seleção do MVP

Para o MVP, a área `Analytics` deve respeitar este limite:

- `Subscriptions` são a fonte principal para os cálculos da base ativa e da MRR.
- `Cancellation & Retention` são a fonte principal para os dados de rotatividade e a categorização da rotatividade.
- `Renewals` são uma fonte complementar para dados históricos de execução, quando necessário.
- `Activity Log` está excluído como fonte principal de KPIs.
- `Analytics` é responsável por instantâneos diários, faixas de tendências e resultados agregados destinados à administração.

Isso proporciona ao plug-in:
- limites claros de responsabilidade;
- características de desempenho estáveis;
- compatibilidade com os princípios de isolamento de módulos do Medusa;
- um modelo de geração de relatórios que se mantém alinhado com a arquitetura de domínios já implementada

## O que o `Analytics` não deve possuir

A área `Analytics` não deve:
- tornar-se a proprietária canônica do estado do ciclo de vida da assinatura
- tornar-se a proprietária canônica dos resultados do ciclo de renovação
- tornar-se a proprietária canônica do estado do processo de cancelamento
- substituir `Activity Log` como camada de auditoria
- armazenar cópias completas e duplicadas dos agregados de domínio como seu modelo padrão
- transferir a lógica de mutação de negócios dos fluxos de trabalho para o código de relatórios

## Regras de Limite do Medusa

Essa decisão segue as regras de arquitetura modular do Medusa:

- os módulos de origem mantêm a propriedade de seu próprio estado operacional
- a coordenação entre módulos ocorre por meio de fluxos de trabalho e composição controlada de leitura
- a geração de relatórios administrativos é implementada por meio de modelos de leitura e rotas de API, e não pela transferência de propriedade entre módulos

Para `Analytics`, isso significa:
- os fatos de origem provêm dos módulos proprietários
- a criação de instantâneos é uma questão de relatórios, não uma transferência de propriedade comercial
- as rotas de análise administrativa devem ler a partir de instantâneos de análise e agregados, sempre que possível
- a reconstrução e o recálculo devem ser seguros para o fluxo de trabalho e operacionalmente isolados das alterações no domínio
