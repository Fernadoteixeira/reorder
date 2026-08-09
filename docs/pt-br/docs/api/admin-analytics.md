# API de Análise Administrativa

Este documento descreve o contrato da API de administração implementado para a área `Analytics` do plug-in `Reorder`.

Este documento pretende ser a fonte oficial de referência atual para:
- parâmetros de solicitação
- formatos de resposta
- regras de filtragem e agrupamento
- contrato de resposta de exportação

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminho base

Todas as rotas estão em:

`/admin/subscription-analytics`

## Autenticação

Todas as rotas são exclusivas para administradores.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod
- os manipuladores de rota são enxutos e delegam a lógica de leitura a auxiliares de consulta de análise ou a serviços de leitura

Isso mantém a API alinhada às convenções do modelo de leitura do Medusa Admin.

## DTOs compartilhados

As respostas da API são baseadas nos DTOs de administração definidos em:

- `src/admin/types/analytics.ts`

Principais tipos de resposta:
- `AnalyticsKpisAdminResponse`
- `AnalyticsTrendsAdminResponse`
- `AnalyticsExportAdminResponse`
- `AdminAnalyticsFilters`
- `AnalyticsKpiSummary`
- `AnalyticsTrendSeries`

Todas as respostas de análise bem-sucedidas também incluem:
- `metrics_version`

## Valores compartilhados do domínio

### Chaves métricas

Chaves de métricas analíticas compatíveis nas respostas de KPIs e tendências:
- `mrr`
- `churn_rate`
- `ltv`
- `active_subscriptions_count`
- `created_subscriptions_count`

Regras de superfície implementadas:
- `created_subscriptions_count` é retornado apenas pela resposta de tendências
- Os cartões de KPI permanecem como `mrr`, `churn_rate`, `ltv` e `active_subscriptions_count`

### Agrupamento de valores

Valores de agrupamento suportados:
- `day`
- `week`
- `month`

### Valores do filtro de status da assinatura

Valores de filtro de status de assinatura suportados:
- `active`
- `paused`
- `cancelled`
- `past_due`

### Valores do filtro de frequência

Os filtros de frequência utilizam valores de cadência estruturados:
- `interval`
  - `week`
  - `month`
  - `year`
- `value`
  - valor de cadência inteiro positivo

Exemplos:
- semanalmente: `interval = "week", value = 1`
- a cada duas semanas: `interval = "week", value = 2`
- mensalmente: `interval = "month", value = 1`

## Contrato de Filtro Compartilhado

Todas as rotas de leitura de análises utilizam o mesmo contrato de filtro lógico.

Filtros suportados:
- `date_from?: string`
- `date_to?: string`
- `status?: string | string[]`
- `product_id?: string | string[]`
- `frequency?: string | string[]`
- `group_by?: "day" | "week" | "month"`
- `timezone?: "UTC"`

Notas:
- `date_from` e `date_to` são carimbos de data e hora no formato ISO ou cadeias de caracteres de data interpretadas pelo validador da API.
- `status` é um filtro com vários valores.
- `product_id` é um filtro com vários valores.
- `frequency` é um filtro com vários valores representado nas solicitações por meio de um token de cadência serializado.
- `group_by` assume o valor padrão de `day` quando omitido.
- `timezone` assume o valor padrão de `UTC` quando omitido.
- A análise do MVP rejeita valores de fuso horário que não sejam `UTC`.

### Regras de validação compartilhadas

Regras atuais de validação em tempo de execução:
- `date_from <= date_to`
- a janela máxima de leitura de análises é de `731` dias
- os tokens `frequency` devem corresponder a `week:n`, `month:n` ou `year:n`
- valores `timezone` não suportados são rejeitados

### Regras para conjuntos de dados vazios

Um conjunto de dados vazio não é considerado um erro da API.

Comportamento atual em tempo de execução:
- `kpis` ainda retorna todas as chaves de KPI
- `trends` retorna séries válidas com pontos vazios ou com valor nulo, dependendo do intervalo
- `created_subscriptions_count` retorna uma série diária preenchida com zeros em todo o intervalo solicitado
- `export` retorna uma carga útil válida com `rows` vazio

### Codificação de solicitações de frequência

Para simplificar as solicitações, os filtros de frequência são passados como tokens serializados.

Codificação recomendada:
- `week:1`
- `week:2`
- `month:1`
- `year:1`

A API analisa esses valores e os converte no formato do DTO Admin:

```json
{
  "interval": "month",
  "value": 1
}
```

## 1. Obter resumo dos KPIs

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-analytics/kpis`

### Objetivo

Retorna a carga útil do resumo de KPIs utilizada pelos cartões de visão geral de análises do Admin.

### Parâmetros de consulta

Filtros:
- `date_from?: string`
- `date_to?: string`
- `status?: string | string[]`
- `product_id?: string | string[]`
- `frequency?: string | string[]`
- `group_by?: "day" | "week" | "month"`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "filters": {
    "date_from": "2026-04-01T00:00:00.000Z",
    "date_to": "2026-04-30T23:59:59.999Z",
    "status": ["active", "past_due"],
    "product_id": ["prod_123"],
    "frequency": [
      {
        "interval": "month",
        "value": 1
      }
    ],
    "group_by": "day"
  },
  "metrics_version": "analytics-v1",
  "generated_at": "2026-05-01T10:00:00.000Z",
  "kpis": [
    {
      "key": "mrr",
      "label": "MRR",
      "value": 2480,
      "unit": "currency",
      "currency_code": "usd",
      "precision": 2,
      "previous_value": 2310,
      "delta_value": 170,
      "delta_percentage": 7.36
    },
    {
      "key": "churn_rate",
      "label": "Churn Rate",
      "value": 3.2,
      "unit": "percentage",
      "currency_code": null,
      "precision": 2,
      "previous_value": 4.1,
      "delta_value": -0.9,
      "delta_percentage": -21.95
    },
    {
      "key": "ltv",
      "label": "LTV",
      "value": 412,
      "unit": "currency",
      "currency_code": "usd",
      "precision": 2,
      "previous_value": 398,
      "delta_value": 14,
      "delta_percentage": 3.52
    },
    {
      "key": "active_subscriptions_count",
      "label": "Active Subscriptions",
      "value": 182,
      "unit": "count",
      "currency_code": null,
      "precision": 0,
      "previous_value": 176,
      "delta_value": 6,
      "delta_percentage": 3.41
    }
  ]
}
```

### Regras de resposta

- `value` pode ser `null` se uma métrica não for calculável para o intervalo de filtro selecionado.
- `currency_code` só é preenchido para métricas baseadas em moeda.
- `precision` indica à interface de usuário do administrador como formatar o valor.
- a resposta sempre inclui todas as chaves de KPI compatíveis para o MVP, mesmo quando alguns valores são `null`
- `MRR` e `LTV` podem ser substituídos por `null` quando o conjunto de dados selecionado não tiver um único contexto de moeda válido ou quando o instantâneo de receita estiver incompleto para o cálculo do MVP

### Erros comuns

- `400 invalid_data`
  Formato de filtro inválido, valor de agrupamento não suportado ou token de frequência inválido.

## 2. Obter séries de tendências

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-analytics/trends`

### Objetivo

Retorna dados agrupados de séries temporais utilizados pelo gráfico de análise do Admin.

Exceções implementadas:
- `created_subscriptions_count` é sempre agrupado por dia UTC
- `created_subscriptions_count` é derivado de `subscription.created_at`
- `created_subscriptions_count` ignora `status`, `product_id`, `frequency` e `group_by`

### Parâmetros de consulta

Filtros:
- `date_from?: string`
- `date_to?: string`
- `status?: string | string[]`
- `product_id?: string | string[]`
- `frequency?: string | string[]`
- `group_by?: "day" | "week" | "month"`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "filters": {
    "date_from": "2026-04-01T00:00:00.000Z",
    "date_to": "2026-04-30T23:59:59.999Z",
    "status": ["active"],
    "product_id": [],
    "frequency": [],
    "group_by": "week"
  },
  "metrics_version": "analytics-v1",
  "generated_at": "2026-05-01T10:00:00.000Z",
  "series": [
    {
      "metric": "mrr",
      "label": "MRR",
      "unit": "currency",
      "currency_code": "usd",
      "precision": 2,
      "points": [
        {
          "bucket_start": "2026-03-30T00:00:00.000Z",
          "bucket_end": "2026-04-05T23:59:59.999Z",
          "value": 2280
        },
        {
          "bucket_start": "2026-04-06T00:00:00.000Z",
          "bucket_end": "2026-04-12T23:59:59.999Z",
          "value": 2330
        }
      ]
    },
    {
      "metric": "active_subscriptions_count",
      "label": "Active Subscriptions",
      "unit": "count",
      "currency_code": null,
      "precision": 0,
      "points": [
        {
          "bucket_start": "2026-03-30T00:00:00.000Z",
          "bucket_end": "2026-04-05T23:59:59.999Z",
          "value": 174
        },
        {
          "bucket_start": "2026-04-06T00:00:00.000Z",
          "bucket_end": "2026-04-12T23:59:59.999Z",
          "value": 178
        }
      ]
    },
    {
      "metric": "created_subscriptions_count",
      "label": "Created Subscriptions",
      "unit": "count",
      "currency_code": null,
      "precision": 0,
      "points": [
        {
          "bucket_start": "2026-04-01T00:00:00.000Z",
          "bucket_end": "2026-04-01T23:59:59.999Z",
          "value": 3
        },
        {
          "bucket_start": "2026-04-02T00:00:00.000Z",
          "bucket_end": "2026-04-02T23:59:59.999Z",
          "value": 0
        }
      ]
    }
  ]
}
```

### Regras de resposta

- cada série é agrupada de acordo com o valor solicitado de `group_by`
- `bucket_start` e `bucket_end` definem a janela de tempo exata para cada ponto
- os pontos são ordenados em ordem crescente por `bucket_start`
- as séries podem conter `value = null` quando o bucket existe, mas a métrica não pode ser calculada
- a semântica do bucket utiliza `UTC` no MVP
- As séries `MRR` e `LTV` podem conter `value = null` para buckets nos quais não há nenhum instantâneo válido de receita em moeda única disponível
- `created_subscriptions_count` é sempre retornado como buckets diários em UTC, mesmo que `group_by` seja `week` ou `month`
- `created_subscriptions_count` preenche com zeros os dias ausentes dentro do intervalo selecionado

### Erros comuns

- `400 invalid_data`
  Formato de filtro inválido, valor de agrupamento não suportado ou token de frequência inválido.

## 3. Exportar relatório de análise

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-analytics/export`

### Objetivo

Retorna uma carga útil de exportação alinhada aos filtros de análise ativos.

No MVP, o contrato de exportação é síncrono e suporta `csv` e `json`.

### Parâmetros de consulta

Filtros:
- `date_from?: string`
- `date_to?: string`
- `status?: string | string[]`
- `product_id?: string | string[]`
- `frequency?: string | string[]`
- `group_by?: "day" | "week" | "month"`

Formato:
- `format?: "csv" | "json"`

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "format": "json",
  "filters": {
    "date_from": "2026-04-01T00:00:00.000Z",
    "date_to": "2026-04-30T23:59:59.999Z",
    "status": ["active"],
    "product_id": [],
    "frequency": [],
    "group_by": "month"
  },
  "metrics_version": "analytics-v1",
  "generated_at": "2026-05-01T10:00:00.000Z",
  "file_name": "subscription-analytics-2026-05-01.json",
  "content_type": "application/json",
  "columns": [
    "bucket_start",
    "bucket_end",
    "mrr",
    "churn_rate",
    "ltv",
    "active_subscriptions_count"
  ],
  "rows": [
    {
      "bucket_start": "2026-04-01T00:00:00.000Z",
      "bucket_end": "2026-04-30T23:59:59.999Z",
      "mrr": 2480,
      "churn_rate": 3.2,
      "ltv": 412,
      "active_subscriptions_count": 182
    }
  ]
}
```

### Regras de resposta

- a resposta de exportação reflete os filtros resolvidos
- a resposta de exportação inclui `metrics_version`
- `columns` são determinísticos e definem a ordem de exportação simplificada
- `rows` representam o conjunto de dados simplificado e pronto para exportação
- para `csv`, o servidor ainda retorna metadados de exportação e linhas simplificadas sob o mesmo contrato lógico
- uma futura implementação de exportação assíncrona poderá substituir este contrato de rota por uma transação de exportação respaldada por fluxo de trabalho
- as células de exportação `MRR` e `LTV` podem ser `null` quando o bucket subjacente não tiver uma base de receita válida em moeda única

### Erros comuns

- `400 invalid_data`
  Formato de filtro inválido, valor de agrupamento não suportado, formato de exportação não suportado ou token de frequência inválido.

## 4. Reconstrução manual

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-analytics/rebuild`

### Objetivo

Inicia uma reconstrução manual dos instantâneos de análise diária para um intervalo histórico.

Essa rota não utiliza um mecanismo de reconstrução separado.

Ele reutiliza o mesmo fluxo de trabalho compartilhado de reconstrução de análises utilizado por:
- a tarefa de análise agendada
- execuções incrementais de acompanhamento de análises

### Corpo da solicitação

```json
{
  "date_from": "2026-04-01T00:00:00.000Z",
  "date_to": "2026-04-30T23:59:59.999Z",
  "reason": "historical backfill after metrics review"
}
```

### Regras de validação

- `date_from <= date_to`
- o prazo máximo para a reconstrução manual é de `365` dias

### Resposta de sucesso

Status:
- `200 OK`

Forma:

```json
{
  "date_from": "2026-04-01T00:00:00.000Z",
  "date_to": "2026-04-30T23:59:59.999Z",
  "processed_days": 30,
  "processed_subscriptions": 1240,
  "upserted_rows": 1240,
  "skipped_rows": 0,
  "blocked_days": [],
  "failed_days": []
}
```

### Regras de resposta

- uma falha parcial não altera automaticamente o status HTTP para `500`
- `blocked_days` e `failed_days` são exibidos no resumo da resposta
- é esperado e permitido executar novamente o mesmo intervalo, pois a reconstrução é idempotente no nível do dia

### Erros comuns

- `400 invalid_data`
  Corpo da solicitação inválido ou janela maior do que o limite de reconstrução manual suportado.
