# API de análise administrativa

Este documento descreve o contrato Admin API implementado para a área `Analytics` do plugin `Reorder`.

Pretende ser a fonte atual de verdade para:
- parâmetros de solicitação
- formas de resposta
- regras de filtragem e agrupamento
- contrato de resposta de exportação

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminho Básico

Todas as rotas estão em:

`/admin/subscription-analytics`

## Autenticação

Todas as rotas são rotas somente para administradores.

Em termos de implementação:
- as rotas usam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio de middleware Medusa e esquemas Zod
- os manipuladores de rotas permanecem finos e delegam a lógica de leitura para auxiliares de consulta analítica ou serviços de leitura

Isso mantém a API alinhada com as convenções do modelo de leitura do Medusa Admin.

## DTOs compartilhados

As respostas da API são baseadas nos Admin DTOs definidos em:

- `src/admin/types/analytics.ts`

Principais tipos de resposta:
- `AnalyticsKpisAdminResponse`
- `AnalyticsTrendsAdminResponse`
- `AnalyticsExportAdminResponse`
- `AdminAnalyticsFilters`
- `AnalyticsKpiSummary`
- `AnalyticsTrendSeries`

Todas as respostas analíticas bem-sucedidas também incluem:
- `metrics_version`

## Valores de domínio compartilhado

### Chaves métricas

Chaves de métricas analíticas suportadas em KPI e respostas de tendências:
- `mrr`
- `churn_rate`
- `ltv`
- `active_subscriptions_count`
- `created_subscriptions_count`

Regras de superfície implementadas:
- `created_subscriptions_count` é retornado apenas pela resposta de tendências
- Os cartões KPI permanecem `mrr`, `churn_rate`, `ltv` e `active_subscriptions_count`

### Agrupando Valores

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

Os filtros de frequência usam valores de cadência estruturados:
- `interval`
  - `week`
  - `month`
  - `year`
- `value`
  - valor de cadência inteiro positivo

Exemplos:
- semanalmente: `interval = "week", value = 1`
- a cada 2 semanas: `interval = "week", value = 2`
- mensalmente: `interval = "month", value = 1`

## Contrato de filtro compartilhado

Todas as rotas de leitura analítica usam o mesmo contrato de filtro lógico.

Filtros suportados:
- `date_from?: string`
- `date_to?: string`
- `status?: string | string[]`
- `product_id?: string | string[]`
- `frequency?: string | string[]`
- `group_by?: "day" | "week" | "month"`
- `timezone?: "UTC"`

Notas:
- `date_from` e `date_to` são carimbos de data e hora semelhantes a ISO ou strings de data interpretadas pelo validador de API.
- `status` é um filtro de vários valores.
- `product_id` é um filtro de vários valores.
- `frequency` é um filtro de vários valores representado em solicitações usando um token de cadência serializado.
- `group_by` é padronizado como `day` quando omitido.
- `timezone` é padronizado como `UTC` quando omitido.
- A análise do MVP rejeita valores de fuso horário diferentes de `UTC`.

### Regras de validação compartilhada

Regras atuais de validação de tempo de execução:
- `date_from <= date_to`
- a janela máxima de leitura de análises é de `731` dias
- Os tokens `frequency` devem corresponder a `week:n`, `month:n` ou `year:n`
- valores `timezone` não suportados são rejeitados

### Regras de conjunto de dados vazio

Um conjunto de dados vazio não é tratado como um erro de API.

Comportamento atual do tempo de execução:
- `kpis` ainda retorna todas as chaves de KPI
- `trends` retorna séries válidas com pontos vazios ou com valor nulo dependendo do intervalo
- `created_subscriptions_count` retorna uma série diária preenchida com zeros em todo o intervalo solicitado
- `export` retorna uma carga válida com `rows` vazio

### Codificação de solicitação de frequência

Para simplificar a solicitação, os filtros de frequência são passados ​​como tokens serializados.

Codificação recomendada:
- `week:1`
- `week:2`
- `month:1`
- `year:1`

A API analisa esses valores no formato Admin DTO:

```json
{
  "interval": "month",
  "value": 1
}
```

## 1. Obtenha o resumo do KPI

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-analytics/kpis`

### Propósito

Retorna a carga de resumo de KPI usada pelos cartões de visão geral de análise de administrador.

### Parâmetros de consulta

Filtros:
- `date_from?: string`
- `date_to?: string`
- `status?: string | string[]`
- `product_id?: string | string[]`
- `frequency?: string | string[]`
- `group_by?: "day" | "week" | "month"`

### Resposta de sucesso

Estado:
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

- `value` pode ser `null` se uma métrica não for computável para o intervalo de filtros selecionado.
- `currency_code` é preenchido apenas para métricas baseadas em moeda.
- `precision` informa à UI do administrador como formatar o valor.
- a resposta sempre inclui todas as chaves de KPI suportadas para MVP, mesmo quando alguns valores são `null`
- `MRR` e `LTV` podem ser resolvidos para `null` quando o conjunto de dados selecionado não tem um único contexto de moeda válido ou quando o instantâneo de receita está incompleto para o cálculo do MVP

### Erros Comuns

- `400 invalid_data`
  Formato de filtro inválido, valor de agrupamento incompatível ou token de frequência inválido.

## 2. Obtenha séries de tendências

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-analytics/trends`

### Propósito

Retorna dados de série temporal agrupados usados ​​pelo gráfico de análise do administrador.

Exceção implementada:
- `created_subscriptions_count` é sempre agrupado por dia UTC
- `created_subscriptions_count` é proveniente de `subscription.created_at`
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

Estado:
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

- cada série é agrupada de acordo com o `group_by` solicitado
- `bucket_start` e `bucket_end` definem a janela de tempo exata para cada ponto
- os pontos são ordenados crescentemente por `bucket_start`
- a série pode conter `value = null` quando o intervalo existe, mas a métrica não pode ser calculada
- a semântica do bucket usa `UTC` no MVP
- As séries `MRR` e `LTV` podem conter `value = null` para intervalos onde nenhum instantâneo de receita válido em moeda única está disponível
- `created_subscriptions_count` é sempre retornado como intervalos UTC diários, mesmo que `group_by` seja `week` ou `month`
- `created_subscriptions_count` preenche com zero os dias faltantes dentro do intervalo selecionado

### Erros Comuns

- `400 invalid_data`
  Formato de filtro inválido, valor de agrupamento incompatível ou token de frequência inválido.

## 3. Exportar relatório de análise

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-analytics/export`

### Propósito

Retorna uma carga de exportação alinhada com os filtros de análise ativos.

Para MVP, o contrato de exportação é síncrono e oferece suporte a `csv` e `json`.

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

Estado:
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

- a resposta de exportação ecoa os filtros resolvidos
- a resposta de exportação inclui `metrics_version`
- `columns` são determinísticos e definem a ordem de exportação nivelada
- `rows` representa o conjunto de dados nivelado pronto para exportação
- para `csv`, o servidor ainda retorna metadados de exportação e linhas niveladas sob o mesmo contrato lógico
- uma futura implementação de exportação assíncrona pode substituir este contrato de rota por uma transação de exportação apoiada por fluxo de trabalho
- As células de exportação `MRR` e `LTV` podem ser `null` quando o intervalo subjacente não tem uma base de receita válida em moeda única

### Erros Comuns

- `400 invalid_data`
  Formato de filtro inválido, valor de agrupamento incompatível, formato de exportação incompatível ou token de frequência inválido.

## 4. Reconstrução manual

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-analytics/rebuild`

### Propósito

Aciona uma reconstrução manual de instantâneos analíticos diários para um intervalo histórico.

Esta rota não usa um mecanismo de reconstrução separado.

Ele reutiliza o mesmo fluxo de trabalho de reconstrução de análise compartilhada usado por:
- o trabalho de análise agendado
- execuções de acompanhamento de análises incrementais

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
- a janela máxima de reconstrução manual é de `365` dias

### Resposta de sucesso

Estado:
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

- a falha parcial não altera automaticamente o status HTTP para `500`
- `blocked_days` e `failed_days` aparecem no resumo da resposta
- a reexecução do mesmo intervalo é esperada e suportada porque a reconstrução é idempotente no nível do dia

### Erros Comuns

- `400 invalid_data`
  Corpo de solicitação inválido ou janela maior que o limite de reconstrução manual compatível.
