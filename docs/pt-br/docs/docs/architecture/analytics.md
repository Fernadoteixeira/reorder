# Arquitetura analítica

Este documento descreve a arquitetura de tempo de execução atual da área `Analytics` no plugin `Reorder`.

É a fonte da verdade em tempo de execução para:
- regras de propriedade e fonte da verdade
- limites do modelo de leitura analítica
- relações com módulos de comércio recorrente existentes
- instantâneo diário e semântica de agregação

## Meta

A área `Analytics` fornece relatórios voltados para o operador e visualizações de KPI para comércio recorrente no Admin.

Seu objetivo é:
- expor valores de KPI estáveis, como `MRR`, `churn_rate`, `ltv` e `active_subscriptions_count`
- expor tendências baseadas no tempo para revisão operacional e de negócios
- expor uma tendência diária de assinaturas criadas para revisão do operador
- suporte para filtragem, agrupamento e exportação no Admin
- fornece uma camada analítica orientada para leitura rápida sem alterar a propriedade do domínio no plugin

Seu objetivo não é substituir os módulos de origem que já possuem estado de assinatura, renovação, cancelamento ou auditoria.

## Papel arquitetônico

`Analytics` é uma camada de relatório derivada e orientada para leitura.

Ele agrega e pré-calcula dados de relatórios dos domínios de comércio recorrente implementados no plugin.

A principal decisão arquitetônica é:

- `Analytics` não é a fonte da verdade para o estado empresarial.
- `Analytics` é a fonte da verdade apenas para seus próprios modelos de leitura derivados, instantâneos diários e resultados agregados de KPI.

Isso significa que a área possui os resultados dos relatórios, mas não possui o ciclo de vida subjacente ou o estado do processo do qual esses resultados são derivados.

## Limites de propriedade

O modelo de propriedade atual do plugin permanece inalterado.

As `assinaturas` continuam sendo a fonte da verdade para:
- estado do ciclo de vida da assinatura
- status de assinatura ativo versus inativo
- campos de cadência e frequência de faturamento
- `próxima_renovação_em`
- `cancelar_efetivo_em`
- instantâneos de produto, cliente, preço e remessa persistiram na assinatura
- a base operacional usada para contagem de assinaturas ativas e cálculos de valor de assinatura orientados ao MRR

`Planos e ofertas` continuam sendo a fonte da verdade para:
- política de oferta de assinatura
- frequências permitidas
- regras de desconto
- regras de validação de oferta efetiva

`Planos e Ofertas` não são a fonte da verdade para relatar totais.
Eles podem fornecer classificação ou contexto explicativo, mas não possuem resultados de KPI.

As `renovações` continuam a ser a fonte da verdade para:
- histórico de execução de renovação
- histórico de tentativas de renovação
- resultados de aprovação
- resultados de execução de sucesso e falha

As `renovações` podem contribuir com fatos usados ​​pelas análises, mas permanecem proprietárias do histórico de execução.

`Dunning` continua sendo a fonte da verdade para:
- estado de recuperação de pagamento
- agendamento de nova tentativa
- tentar novamente o histórico de tentativas
- resultados recuperados e não recuperados

`Dunning` pode posteriormente suportar relatórios orientados para recuperação, mas não possui saídas de KPI de assinatura principal no MVP.

`Cancelamento e Retenção` continuam sendo a fonte da verdade para:
- estado do processo de cancelamento
- motivo de rotatividade e categoria normalizada
- estado de recomendação de retenção
- histórico de ofertas de retenção
- resultados finais de cancelamento e retenção

Esta área é a principal fonte de informações de relatórios orientados à rotatividade.

`Registro de atividades` continua sendo a fonte da verdade para:
- eventos de auditoria de negócios somente anexados em torno de operações de assinatura

No entanto:
- `Registro de atividades` não é a fonte principal para cálculos de KPI
- `Registro de atividades` é uma camada de auditoria e investigação, não a tabela de fatos analíticos canônicos para relatórios de negócios

## Regras da Fonte da Verdade

A área `Analytics` segue estas regras de fonte da verdade:

- As entradas do KPI devem ser lidas no módulo de domínio que possui o fato comercial.
- Os intervalos de tendências derivados e os agregados diários devem ser persistidos pelo `Analytics`.
- `Analytics` não deve redefinir a propriedade de negócios que pertence a outro módulo.
- `Analytics` não deve usar `Log de atividades` como fonte primária para cálculos de KPI principais quando o fato já existe em um módulo proprietário.
- `Analytics` pode usar dados de auditoria apenas como alternativa, auxílio de auditoria ou auxílio de validação, e não como fonte de relatório padrão.

### Mapeamento de fonte primária

Para MVP, o mapeamento de origem primária é:

- `contagem_de_subscrições_ativas`
  - fonte primária: `Assinaturas`
- `MRR`
  - fonte primária: `Assinaturas`
  - com base em assinaturas ativas e seus preços persistentes e instantâneos de cadência
- `taxa_de rotatividade`
  - fonte primária: `Cancelamento e Retenção`
  - o denominador pode depender da base de assinaturas ativa derivada de `Assinaturas`
- `LTV`
  - fonte primária: derivada de `Analytics`
  - construído a partir de fatos de origem pertencentes a `Assinaturas`, `Renovações` e possivelmente `Cancelamento e Retenção`, dependendo da definição final do negócio
- `contagem_de_subscrições_criadas`
  - fonte primária: `Assinaturas`
  - baseado em `subscription.created_at` agrupado por dia UTC

## Definições de negócios e semântica de cálculo

A área `Analytics` usa definições de negócios explícitas de MVP em vez de lógica de relatório inferida.

Isso mantém a camada de relatórios estável e torna visíveis as compensações de implementação posteriores.

### Semântica de assinatura ativa

Para fins analíticos, `ativo` significa:
- `subscrição.status = ativo`

Isso significa:
- Assinaturas `pausadas` não fazem parte da base recorrente ativa
- Assinaturas `past_due` não fazem parte da base recorrente ativa
- Assinaturas `canceladas` não fazem parte da base recorrente ativa

`active_subscriptions_count` é, portanto, a contagem de assinaturas cujo estado atual do ciclo de vida é exatamente `ativo`.

### Semântica MRR

Para MVP, `MRR` significa:
- o valor recorrente normalizado mensalmente das assinaturas ativas

No entanto, o plug-in atual ainda não mantém um instantâneo monetário recorrente completo diretamente no agregado da assinatura.

Estado atual do tempo de execução:
- Cadência própria e estado do ciclo de vida das `Assinaturas`
- `subscription.pricing_snapshot` armazena o contexto do desconto, não o valor total da cobrança recorrente
- fluxos de execução de renovação podem resolver `order.total`
- fluxos de execução de renovação podem resolver `cart.currency_code`

Por causa disso, a entrada monetária recorrente canônica para `MRR` no MVP deve vir de:
- instantâneos monetários derivados de propriedade de análises criados a partir de fatos de renovação e pedidos

Isso significa:
- `Assinaturas` permanecem proprietárias da semântica de base ativa e cadência
- `Analytics` possui o modelo de leitura monetária recorrente derivado usado para relatórios

Se não existir nenhum instantâneo monetário válido para uma assinatura, essa assinatura não contribui para o `MRR`.

### Semântica da taxa de rotatividade

Para MVP, `churn_rate` significa:
- assinaturas canceladas no período do relatório divididas pela base de assinaturas ativas para o mesmo período

Numerador:
- assinaturas cujo resultado final do cancelamento é `cancelado`
- atribuição de bucket usa `finalized_at`
- se `finalized_at` estiver faltando, o fallback pode usar `cancellation_efficient_at`

Denominador:
- base média diária de assinaturas ativas para o mesmo período do relatório
- derivado de instantâneos analíticos diários provenientes de `Assinaturas`

Isso significa:
- `retido` não é rotatividade
- `pausado` não é rotatividade
- apenas os resultados finais cancelados contribuem para a rotatividade

### Semântica LTV

Para MVP, `LTV` significa:
- `MRR / taxa de rotatividade`

Onde:
- `churn_rate` é tratado como uma proporção no cálculo, não como uma string de porcentagem formatada

Se:
- `MRR` não está disponível
- ou `taxa_de churn <= 0`

então:
- `LTV = nulo`

Esta é uma definição intencional de MVP e não um modelo completo de valor vitalício do livro-razão do cliente.

### Semântica do intervalo de datas

Os períodos do Analytics seguem estas regras:
- `date_from` é inclusivo
- `date_to` é inclusivo
- Os cálculos de KPI operam com base em fatos dentro do período de relatório selecionado
- os cálculos de tendências operam em janelas de intervalo normalizadas dentro do período de relatório selecionado

Especificamente para a tendência de assinaturas criadas:
- a janela de relatórios ainda é controlada por `date_from` e `date_to`
- buckets são sempre buckets UTC diários
- `status`, `product_id`, `frequency` e `group_by` não afetam essa série

### Semântica do intervalo

Grupos de relatórios compatíveis:
- `dia`
- `semana`
- `mês`

Regras do intervalo:
- `dia` é um dia corrido
- `semana` é de segunda a domingo
- `mês` é o mês do calendário

Cada ponto é definido por:
- `bucket_start`
- `bucket_end`

e representa o resultado agregado dessa janela exata do bucket.

### Semântica de fuso horário

Para MVP, o fuso horário da análise canônica é:
- `UTC`

Isso significa:
- instantâneos diários são gerados em `UTC`
- os limites do intervalo de dia, semana e mês são calculados em `UTC`
- A formatação do administrador pode ser localizada posteriormente, mas a semântica dos relatórios permanece `UTC`

### Arredondamento Semântica

A camada de relatório mantém a precisão do trabalho durante a computação e ronda apenas no limite da resposta.

Precisão de exibição do MVP:
- `MRR`: `2`
- `taxa_de rotatividade`: `2`
- `LTV`: `2`
- `contagem_de_subscrições_ativas`: `0`
- `created_subscriptions_count`: `0`

### Semântica da Moeda

A análise MVP assume uma moeda de relatório por conjunto de resultados, a menos que a normalização explícita seja introduzida posteriormente.

Isso significa:
- `MRR` e `LTV` só são válidos quando o instantâneo de receita analítica subjacente é resolvido para um contexto de moeda
- a agregação de moedas mistas sem normalização não é suportada
- quando o contexto monetário é ambíguo, `MRR` e `LTV` devem ser resolvidos como `nulo` em vez de produzir um total enganoso

`churn_rate` e `active_subscriptions_count` são independentes da moeda.

## Leituras diretas de fontes versus instantâneos diários

A área `Analytics` distingue entre:
- leituras de fonte direta de módulos de domínio proprietários
- instantâneos e agregados analíticos persistentes

### Leituras de fonte direta

Leituras diretas de módulos de domínio são usadas para:
- entradas de computação iniciais
- reconstruindo o histórico de análise
- validando a correção da agregação
- recálculo de pequeno escopo quando necessário

Essas leituras devem vir dos módulos que possuem os fatos subjacentes.

### Instantâneos diários

Instantâneos diários são usados para:
- Renderização de tendências de KPI no Admin
- consultas históricas de intervalos em intervalos de datas maiores
- comportamento de exportação estável
- leituras repetidas mais rápidas em filtros e agrupamentos

Os instantâneos diários são estados derivados.

Eles não substituem os módulos proprietários.
Eles existem para fornecer:
- latência de consulta previsível
- comportamento estável de séries temporais
- APIs de relatórios administrativos mais simples

## Camada de dados e propriedade do módulo

A área `Analytics` deve ser implementada como um módulo personalizado dedicado no plugin.

Estrutura do módulo recomendada:
- `src/modules/analytics/models/*`
- `src/modules/analytics/service.ts`
- `src/modules/analytics/index.ts`

O módulo segue o mesmo padrão Medusa usado pelas áreas de plugins existentes:
- o modelo de dados de domínio reside no módulo
- o serviço do módulo possui acesso CRUD às tabelas de propriedade da análise
- fluxos de trabalho e trabalhos preenchem dados analíticos derivados
- Rotas da API Admin lidas a partir de instantâneos e agregados de propriedade da análise

### Limite de propriedade

O módulo `analytics` possui:
- instantâneos analíticos diários
- fatos derivados orientados para relatórios
- saídas agregadas com otimização de leitura expostas ao administrador

O módulo `analytics` não possui:
- estado do ciclo de vida da assinatura
- estado de execução da renovação
- estado do processo de cancelamento
- propriedade do evento de auditoria

Isto significa que o módulo é um domínio de relatório, não um domínio operacional.

## Modelo de dados MVP recomendado

Para MVP, o modelo primário recomendado é:
- `subscription_metrics_daily`

Este modelo deve ser a tabela de instantâneos analíticos canônicos usada por consultas de KPI, consultas de tendências e exportações.

### Por que um modelo de instantâneo diário

O plugin atual já separa:
- módulos de origem que possuem fatos de negócios
- leia caminhos otimizados para Admin
- agendador e lógica de fluxo de trabalho que deriva saídas operacionais

O mesmo princípio deve ser aplicado aqui.

Uma tabela de instantâneos analíticos diários fornece:
- desempenho estável para leituras de administrador
- semântica de reconstrução explícita
- baixo acoplamento com formas de consulta do módulo de origem
- flexibilidade suficiente para agregar por data, status, produto e cadência sem reler o gráfico operacional completo para cada solicitação

### Por que não uma visão materializada como modelo MVP primário

Para o MVP, a camada analítica não deve usar uma visão materializada do banco de dados como sua principal fonte de verdade.

Razões:
- maior complexidade operacional
- a semântica de atualização introduz acoplamento evitável ao comportamento específico do banco de dados
- reconstrução e preenchimento tornam-se menos explícitos
- a arquitetura existente do plug-in favorece modelos de dados de propriedade da Medusa, além de fluxos de trabalho/trabalhos, em vez de primitivos de relatórios específicos do banco de dados

Visualizações materializadas podem ser introduzidas posteriormente se o desempenho assim o exigir.

Para MVP:
- as tabelas de instantâneos de propriedade da análise devem ser a principal camada de relatório persistente
- a agregação no tempo de consulta deve acontecer em auxiliares ou serviços de leitura analítica

## `subscription_metrics_daily` Semântica de instantâneo

`subscription_metrics_daily` deve ser um instantâneo de fatos analíticos por assinatura e por dia.

A granularidade recomendada é:
- uma linha por `subscription_id`
- por `metric_date`

Este modelo é preferível às linhas de produto/dia já agregadas porque preserva detalhes suficientes para:
- filtragem por dimensões de assinatura
- reconstruções e aterros confiáveis
- expansão futura de dimensões sem redesenhar toda a camada de relatórios

### Campos recomendados

Os campos MVP recomendados são:
- `id`
- `data_métrica`
- `subscrição_id`
- `ID_do_cliente`
- `id_produto`
- `variant_id`
- `estado`
- `intervalo_frequência`
- `valor_frequência`
- `código_moeda`
- `está_ativo`
- `contagem_de_subscrições_ativas`
- `mrr_quantia`
- `churned_subscriptions_count`
- `churn_reason_category`
- `fonte_instantâneo`
- `metadados`

### Funções de campo

`data_métrica`
- o dia da análise representado pela linha
- normalizado para `UTC`

`id_de_assinatura`
- a assinatura para a qual o instantâneo foi calculado
- persistiu para apoiar a reconstrução idempotente e posterior reconciliação

`id_do_cliente`
- dimensão de relatório opcional

`id_do_produto`, `id_da_variante`
- dimensões de relatórios usadas por filtros e segmentação futura

`estado`
- o estado do ciclo de vida da assinatura para o dia representado

`intervalo_frequência`, `valor_frequência`
- dimensões de cadência usadas pelos filtros de relatórios

`código_moeda`
- relatar o contexto da moeda para métricas baseadas em dinheiro
- anulável quando a receita não é computável

`está_ativo`
- marcador booleano derivado da semântica analítica ativa
- `true` somente quando o instantâneo deve contribuir para cálculos de base ativa

`contagem_de_subscrições_ativas`
- `1` quando a linha contribui para a contagem de assinaturas ativas
- `0` caso contrário

`mrr_quantia`
- a contribuição de receita recorrente normalizada mensalmente da assinatura para aquele dia
- anulável quando não existe nenhum instantâneo monetário válido

`contagem_de_inscrições_turnadas`
- `1` somente no dia em que a assinatura contribui para o numerador de churn
- `0` caso contrário

`churn_reason_category`
- preenchido somente quando a linha contribui para relatórios orientados a rotatividade

`fonte_instantâneo`
- JSON compacto que descreve a base de origem do relatório usada para calcular a linha
- pode incluir referências estáveis como:
  - identificadores de renovação
  - identificadores de cancelamento
  - dicas de fontes monetárias resolvidas

`metadados`
- metadados técnicos extensíveis de propriedade de análises

## Métricas derivadas versus fatos persistentes

A camada analítica deve persistir relatando fatos, e não cada KPI final como um campo armazenado.

Os fatos persistentes do MVP devem incluir:
- contribuição de base ativa
- contribuição de receita normalizada mensalmente
- contribuição de rotatividade

Métricas derivadas, como `LTV`, devem ser calculadas na camada de leitura analítica.

### Tratamento `LTV`

`LTV` não deve persistir como um campo diário canônico no MVP.

Em vez disso:
- `LTV` é derivado em tempo de leitura de fatos de relatório persistentes
- a camada de leitura calcula a partir da semântica atual `MRR` e `churn_rate`

Isso mantém o modelo de snapshot mais simples e evita bloquear o plugin muito cedo em uma interpretação persistente de `LTV`.

## Exclusividade e semântica de reconstrução

O modelo de instantâneo diário deve suportar reconstruções idempotentes.

Exclusividade lógica recomendada:
- `data_métrica`
- `subscrição_id`

Isso permite:
- recálculo seguro em nível de dia
- reconstruções de alcance
- substituição de instantâneo estilo upsert
- reconciliação mais fácil com domínios de origem

## Estratégia de indexação

O modelo de instantâneo deve ser indexado para futuros filtros analíticos de administração e consultas de tendências.

Índices de campo único recomendados:
- `data_métrica`
- `subscrição_id`
- `id_produto`
- `estado`
- `código_moeda`
- `intervalo_frequência`
- `valor_frequência`

Índices compostos recomendados:
- `data_métrica, status`
- `data_métrica, id_do_produto`
- `data_métrica, intervalo_de frequência, valor_de frequência`
- `data_métrica, código_moeda`
- `metric_date, churn_reason_category`

Esses índices estão alinhados com os filtros MVP planejados:
- intervalo de datas
- estado
- produto
- frequência
- agrupamento por dia, semana ou mês

## Leia a estratégia do modelo

O caminho de leitura da análise administrativa deve usar `subscription_metrics_daily` como fonte de relatórios.

Isso significa:
- As consultas de KPI agregam fatos instantâneos persistentes em todo o intervalo de datas selecionado
- consultas de tendências agrupam fatos instantâneos persistentes em intervalos de `dia`, `semana` e `mês`
- consultas de exportação nivelam a mesma fonte de relatórios em linhas prontas para exportação

Exceção implementada:
- a tendência de assinaturas criadas é lida diretamente de `subscription.created_at`
- é renderizado como um intervalo de dias UTC por ponto
- não é proveniente de `subscription_metrics_daily`

O caminho de leitura do Admin não deve:
- análise de computação ao vivo a partir de módulos de origem em todas as solicitações
- use `Registro de atividades` como sua principal fonte de fatos
- depende de auxiliares de consulta operacional de módulos não relacionados para desempenho do painel

## Relacionamento com módulos de origem

O fluxo de dados recomendado é:

1. Os módulos de origem possuem os fatos brutos
2. O pipeline analítico lê esses fatos
3. módulo analítico escreve `subscription_metrics_daily`
4. Auxiliares de leitura administrativa agregam instantâneos em KPI, tendências e cargas úteis de exportação

## Pipeline de reconstrução implementado

O pipeline de análise implementado usa um fluxo de trabalho de reconstrução compartilhado:
- `rebuildAnalyticsDailySnapshotsWorkflow`

Este fluxo de trabalho é o único local que reconstrói instantâneos analíticos diários.

É reutilizado por:
- o trabalho de análise agendado
- acompanhamento incremental executado após fluxos de trabalho de domínio selecionados
- a rota de reconstrução manual do administrador

### Tipos de gatilho

O fluxo de trabalho aceita:
- `agendado`
- `incremental`
- `manualmente`

Esse tipo de gatilho persiste nos metadados do instantâneo e é incluído nos logs estruturados.

### Semântica de intervalo e dia

A entrada de reconstrução é normalizada para:
- `data_de`
- `data_até`
- uma lista de dias `UTC` normalizados

O fluxo de trabalho então processa o intervalo:
- dia a dia
- lote por lote dentro de cada dia

### Semântica de substituição completa

Por um dia:
- as linhas `subscription_metrics_daily` existentes para aquele dia são lidas
- as linhas desse dia são excluídas
- linhas recém-computadas são inseridas

Se a inserção falhar após a exclusão:
- o fluxo de trabalho tenta restaurar as linhas excluídas

Isso fornece ao pipeline:
- repetições idempotentes
- semântica explícita de reconstrução em nível de dia
- comportamento previsível de substituição de instantâneo

## Atualizações incrementais

O caminho incremental do MVP implementado reutiliza o mesmo fluxo de trabalho de reconstrução compartilhado para pequenos intervalos `UTC`.

Os pontos de gatilho atuais são:
- currículo de assinatura
- finalização do cancelamento
- processamento de renovação que pode afetar o instantâneo da receita

Reconstruções incrementais intencionalmente:
- não calcule valores de KPI in-line dentro de fluxos de trabalho de domínio
- acionar apenas a reconstrução do instantâneo de análise compartilhada

## Trabalho agendado

O trabalho agendado implementado é:
- `process-analytics-daily-snapshots`

Seu comportamento é:
- funciona diariamente
- reconstrói `hoje` mais uma pequena janela de lookback
- usa um bloqueio de trabalho global
- emite logs de resumo estruturados

A janela de lookback existe para fornecer um mecanismo barato de autocorreção para alterações recentes de dados.

## Bloqueio

O pipeline implementado usa dois níveis de bloqueio:

- bloqueio em nível de trabalho
  - impede a execução paralela de tarefas agendadas
- bloqueio de intervalo/nível de dia
  - protege a execução da reconstrução para o mesmo intervalo e no mesmo dia individual

Os dias bloqueados são tratados como:
- trabalho operacionalmente bloqueado
- não tão fatal corrupção de domínio

Eles aparecem no fluxo de trabalho e nos resumos de trabalho para novas tentativas posteriores.

## Verificações de qualidade de dados

O pipeline de reconstrução inclui verificações de qualidade de dados em tempo de execução após a geração do instantâneo.

As verificações atuais do MVP cobrem:
- `MRR` aumenta e cai além dos limites configurados
- picos de `churn_rate` além dos limites configurados
- dias de instantâneo vazio
- dias de snapshot incompletos

Resultados de qualidade:
- não falhe sozinhos em uma reconstrução bem-sucedida
- são emitidos como logs estruturados `analytics.quality`
- são resumidos em logs de reconstrução por meio de contadores de avisos e erros

## Versionamento de métricas

O tempo de execução de análise usa uma constante canônica de definição de métricas:
- `ANALYTICS_METRICS_VERSION`

Versão atual:
- `analítica-v1`

Esta versão está anexada a:
- instantâneo `metadados`
- Respostas KPI
- respostas de tendência
- exportar respostas
- reconstruir e logs de qualidade

A versão deverá ser alterada quando os mesmos dados de origem puderem produzir resultados analíticos diferentes devido a uma alteração em:
- Fórmulas de KPI
- semântica de estado ativo
- semântica do balde
- semântica da moeda

Refatoradores puros sem alterações de saída não devem prejudicar a versão.

## Modelo de leitura implementado

O modelo de leitura administrativa implementado reside em auxiliares de consulta analítica e lê principalmente de:
- `subscription_metrics_daily`
- `subscription.created_at` apenas para a tendência de assinaturas criadas

Ele não recalcula valores de KPI de módulos operacionais ativos em cada solicitação.

Superfícies de leitura implementadas:
- Resumo de KPI
- série de tendências
- exportar linhas

Exceção de tendência implementada:
- `contagem_de_subscrições_criadas`
  - agrupado em `subscription.created_at`
  - sempre retornado como intervalos UTC diários
  - preenche com zero os dias faltantes dentro do intervalo selecionado

### Semântica de KPI na camada de leitura implementada

A camada de leitura calcula atualmente:
- `MRR`
  - do último bucket da janela atual
- `contagem_de_subscrições_ativas`
  - do último bucket da janela atual
- `taxa_de rotatividade`
  - do numerador de rotatividade total dividido pela média diária da base ativa na janela
- `LTV`
  - de `MRR / taxa de rotatividade`

`MRR` e `LTV` podem ser resolvidos como `null` quando:
- o conjunto de resultados é moeda mista
- não existe base de receita válida
- `taxa_de rotatividade <= 0` para `LTV`

## Observabilidade e desempenho

O tempo de execução de análise emite logs estruturados para:
- `analytics.rebuild`
- `analítica.job`
- `analítica.qualidade`
- `analytics.read.kpis`
- `analytics.read.trends`
- `analytics.read.export`

A carga útil de observabilidade atual inclui:
- `metrics_version`
- `duração_ms`
- resumo do intervalo de datas
- resumo do dia processado e da linha processada, quando aplicável
- contagens de dias bloqueados e com falha, quando aplicável
- `alertável`

Os limites atuais de execução lenta do MVP são:
- reconstruir: `> 5000 ms`
- trabalho agendado: `> 5000 ms`
- leia caminhos: `> 1000 ms`

Esses limites afetam a gravidade do log e a classificação "alertável", mas não alteram o comportamento funcional da API.
4. Rotas analíticas de administração lidas na camada de instantâneo analítico

Isso preserva:
- propriedade da fonte
- Isolamento do módulo Medusa
- comportamento de relatório previsível

## Pipeline de atualização de métricas

A área `Analytics` deve usar um pipeline de recomputação compartilhado para geração diária de snapshots.

A principal decisão arquitetônica é:
- um fluxo de trabalho compartilhado possui semântica de recomputação
- execução agendada, atualizações incrementais e recriações de todos os delegados para o mesmo fluxo de trabalho

Isto mantém a camada de relatório consistente e evita implementações divergentes da mesma lógica de cálculo.

## Fluxo de trabalho de reconstrução compartilhado

O ponto de entrada central de recomputação deve ser um fluxo de trabalho responsável pela reconstrução de instantâneos diários de análise para um intervalo de datas.

Função de fluxo de trabalho recomendada:
- normalizar e validar o intervalo de datas solicitado
- iterar dia a dia
- reconstruir fatos analíticos para cada dia
- persistir linhas de instantâneo diário idempotentes
- retornar um resumo estruturado do trabalho realizado

Entrada lógica recomendada:
- `data_de`
- `data_até`
- `tipo_de_gatilho`
  - `agendado`
  - `incremental`
  - `manualmente`
- `acionado_por`
- `razão`
- `correlação_id`

Saída lógica recomendada:
- `dias_processados`
- `subscrições_processadas`
- `upserted_rows`
- `skipped_rows`
- `failed_days`

## Unidade de recálculo

A unidade primária de recálculo deve ser:
- um intervalo de datas

Dentro do fluxo de trabalho:
- o intervalo é normalizado para os limites do dia `UTC`
- o processamento acontece dia após dia
- para cada dia, as linhas do instantâneo são reconstruídas em lotes

Isto é preferível a:
- calcular valores de KPI isolados diretamente
- recalcular todo o conjunto de dados analíticos em uma única passagem grande

O dia é a unidade atômica natural para o modelo de relatório MVP.

## Trabalho agendado diariamente

A área de análise deve expor um trabalho agendado diariamente que aciona o fluxo de trabalho de reconstrução compartilhado.

Responsabilidades de trabalho recomendadas:
- adquirir um bloqueio no nível do agendador
- determinar a janela de recomputação diária
- execute o fluxo de trabalho de reconstrução
- emitir logs operacionais e métricas resumidas

O modelo de execução diária recomendado é:
- recalcular `hoje`
- recalcular uma pequena janela de retrospectiva para os últimos dias

Por que a janela lookback é recomendada:
- alterações recentes de renovação, cancelamento ou recuperação podem afetar instantâneos diários anteriores
- uma janela curta e contínua de recomputação ajuda a corrigir inconsistências recentes
- isso reduz a dependência do comportamento incremental perfeito orientado a eventos

## Atualizações incrementais

O pipeline analítico do MVP pode suportar atualizações incrementais, mas não deve introduzir um segundo caminho de computação.

As atualizações incrementais devem:
- acionar o mesmo fluxo de trabalho de reconstrução compartilhado
- segmentar um pequeno intervalo de datas
- permanecer opcional e aditivo em relação ao trabalho agendado

Pontos de gatilho incrementais recomendados:
- currículo de assinatura
- finalização do cancelamento
- execução de renovação que afeta a base de análise monetária

O caminho incremental não deve:
- calcular KPIs inline em rotas de API
- ignorar fluxos de trabalho
- realizar atualizações parciais ad-hoc nas linhas de análise

Em vez disso, fluxos de trabalho de negócios bem-sucedidos podem acionar uma pequena janela de reconstrução por meio do fluxo de trabalho de recomputação analítica compartilhada.

## Semântica de Idempotência

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
- a segurança na repetição de tentativas

## Estratégia de bloqueio

O pipeline de análise deve utilizar bloqueios em dois níveis.

### Bloqueio no nível da tarefa

Um bloqueio no nível do agendador impede a execução simultânea de tarefas completas.

Finalidade recomendada:
- impedir que duas instâncias de trabalho executem a tarefa de análise diária ao mesmo tempo
- tornar o comportamento do agendador previsível do ponto de vista operacional

### Bloqueio por dia

Um bloqueio diário impede o recálculo simultâneo do mesmo dia de relatório.

Finalidade recomendada:
- evitar sobreposição entre a recálculo acionado pelo agendador e as reconstruções manuais
- evitar sobreposição entre o recálculo acionado pelo agendador e as atualizações incrementais acionadas por eventos
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
- o fluxo de trabalho compartilhado recalcula cada dia desse intervalo
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

O pipeline de análise deve seguir o mesmo padrão operacional usado pelas áreas existentes apoiadas pelo agendador.

Ciclo de vida de log recomendado:
- `começou`
- `concluído`
- `bloqueado`
- `falhou`

Campos de resumo recomendados:
- `dias_processados`
- `subscrições_processadas`
- `upserted_rows`
- `failed_days`
- `duração_ms`
- `tipo_de_gatilho`
- `correlação_id`

Isso deve tornar o pipeline de análise operacionalmente comparável a:
- `Renovações`
- `Cobrança`
- `Cancelamento e Retenção`

## Limite do pipeline MVP

Para MVP, o pipeline analítico deve incluir:
- um fluxo de trabalho de reconstrução compartilhado
- um trabalho agendado diariamente com uma curta janela de lookback
- bloqueio no nível do agendador
- bloqueio em nível de dia
- semântica de substituição idempotente de dia inteiro
- gatilhos incrementais opcionais para eventos de negócios importantes

Para MVP, o pipeline analítico não deve incluir:
- um segundo caminho de computação incremental independente
- cálculo direto de KPI em manipuladores de API
- correção parcial de linhas de análise diária como modelo de atualização principal
- um mecanismo de preenchimento separado, distinto do fluxo de trabalho de reconstrução compartilhado

## Limite de relatórios com módulos existentes

### Relação com `Assinaturas`

As `assinaturas` fornecem a linha de base operacional para relatórios.

`Analytics` pode derivar:
- contagens ativas
- contagens distribuídas por status
- Totais de assinaturas orientados a MRR
- segmentação baseada em frequência

`Analytics` não deve se tornar proprietário de campos de ciclo de vida como:
- `estado`
- `próxima_renovação_em`
- `cancelar_efetivo_em`

### Relação com `Renovações`

`Renovações` fornecem fatos do histórico de execução.

`Analytics` pode derivar:
- tendências de sucesso e fracasso de renovação
- tendências de volume de execução
- métricas de suporte adjacentes à receita ou adjacentes à retenção, se necessário posteriormente

`Analytics` não deve se tornar proprietário de:
- estado do ciclo de renovação
- estado de tentativa
- estado de aprovação

### Relação com `Cancelamento e Retenção`

`Cancelamento e Retenção` fornece fatos orientados para a rotatividade.

`Analytics` pode derivar:
- taxa de rotatividade
- tendências de cancelamento
- principais categorias de motivos
- proporções de resultados retidos versus cancelados

`Analytics` não deve se tornar proprietário de:
- status do caso de cancelamento
- estado de decisão de oferta
- estado final do processo de cancelamento

### Relação com `Registro de atividades`

O `Registro de atividades` fornece visibilidade de auditoria, não propriedade de KPI.

`Analytics` pode usar `Registro de atividades` para:
- investigação
- apoio à reconciliação
- validação futura orientada por auditoria

`Analytics` não deve usar `Log de atividades` como fonte padrão para:
- `MRR`
- contagem de assinaturas ativas
- cálculo de rotatividade

## Decisão de limite do MVP

Para MVP, a área `Analytics` deve seguir este limite:

- `Assinaturas` são a principal fonte para cálculos de base ativa e MRR.
- `Cancelamento e Retenção` são a principal fonte de informações de rotatividade e categorização de rotatividade.
- As `renovações` são uma fonte de apoio para fatos históricos de execução, quando necessário.
- `Registro de atividades` é excluído como fonte primária de KPI.
- `Analytics` possui instantâneos diários, grupos de tendências e resultados agregados voltados para o administrador.

Isso dá ao plugin:
- limites claros de propriedade
- características de desempenho estáveis
- compatibilidade com os princípios de isolamento do módulo Medusa
- um modelo de relatórios que permanece alinhado com a arquitetura de domínio já implementada

## O que o `Analytics` não deve possuir

A área `Analytics` não deve:
- tornar-se o proprietário canônico do estado do ciclo de vida da assinatura
- tornar-se o proprietário canônico dos resultados do ciclo de renovação
- tornar-se o proprietário canônico do estado do processo de cancelamento
- substitua `Log de atividades` como uma camada de auditoria
- armazenar cópias completas duplicadas de agregados de domínio como modelo padrão
- transferir a lógica de mutação de negócios dos fluxos de trabalho para o código de relatório

## Regras de limite da Medusa

Esta decisão segue as regras de arquitetura modular da Medusa:

- os módulos de origem mantêm a propriedade de seu próprio estado comercial
- a coordenação entre módulos acontece por meio de fluxos de trabalho e composição de leitura controlada
- os relatórios administrativos são implementados por meio de modelos de leitura e rotas de API, e não pela transferência de propriedade entre módulos

Para `Analytics`, isso significa:
- os fatos de origem vêm da propriedade de módulos
- a criação de instantâneos é uma preocupação de relatórios, não uma transferência de propriedade empresarial
- As rotas de análise administrativa devem ler instantâneos e agregados de análise sempre que possível
- a reconstrução e a recomputação devem ser seguras para o fluxo de trabalho e operacionalmente isoladas de mutações de domínio
