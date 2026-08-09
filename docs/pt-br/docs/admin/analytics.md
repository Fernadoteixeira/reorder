# IU do administrador: Análise

Este documento descreve a UI Admin implementada para a área `Analytics` no plugin `Reorder`.

Ele se concentra em:
- comportamento da tela
- filtros e fluxos de leitura
- comportamento de exportação
- estados de carregamento e erro
- limites de invalidação de cache

## Propósito

A UI Admin `Analytics` oferece aos operadores um painel orientado a relatórios para KPIs e tendências de comércio recorrente.

Pretende-se apoiar:
- revisão rápida de KPI
- inspeção de tendências ao longo do tempo
- inspeção diária do volume de criação de assinaturas
- relatórios filtrados por status, produto e cadência
- exportação da fatia de relatório atualmente visível

A UI é implementada como uma página personalizada Medusa Admin aninhada em `Subscriptions`.

## Mapa de rotas

Rota implementada:
- `/app/subscriptions/analytics`

Comportamento de navegação:
- a página está agrupada na área administrativa `Subscriptions`
- é uma página dedicada, não uma gaveta ou subpainel de detalhes

## 1. Estrutura da página

### Principais elementos da interface do usuário

A página inclui:
- cabeçalho e descrição da página
- barra de filtro
- Cartões KPI
- gráfico de tendências
- ação de exportação

O layout atual segue as mesmas convenções de administração do Medusa que as outras páginas do plugin:
- cabeçalho compacto
- conteúdo agrupado em seções `Container`
- densidade de controle simples
- limpar estados vazios e de erro

## 2. Filtros

### Filtros Implementados

A página atualmente suporta:
- `date_from`
- `date_to`
- `status`
- `product_id`
- `frequency`
- `group_by`

### Semântica de Filtro

Comportamento atual do tempo de execução:
- os filtros direcionam consultas de KPI e tendências
- a alteração dos filtros atualiza os dados analíticos exibidos
- a exportação usa os filtros atualmente ativos
- `group_by` padrão é `day`
- a semântica do fuso horário foi fixada em `UTC` no MVP

Exceção de gráfico implementada:
- a guia de tendência `Created` usa apenas `date_from` e `date_to`
- a tendência `Created` ignora `status`, `product_id`, `frequency` e `group_by`
- o controle `group_by` está desabilitado enquanto `Created` está selecionado

Os filtros de frequência são representados como tokens de cadência, como:
- `week:1`
- `month:1`
- `year:1`

## 3. Cartões KPI

A página atualmente exibe quatro cartões KPI:
- `MRR`
- `Churn Rate`
- `LTV`
- `Active Subscriptions`

### Regras de Apresentação

- KPIs de moeda mostram formatação com reconhecimento de moeda quando existe um conjunto de dados válido de moeda única
- `MRR` e `LTV` podem ser renderizados como texto vazio ou substituto quando o conjunto de dados selecionado for de moeda mista ou não tiver uma base de receita válida
- métricas de contagem usam formatação inteira
- métricas de porcentagem usam a precisão do KPI configurada da carga útil da resposta

## 4. Gráfico de tendências

A página exibe uma visualização de tendência simples proveniente do endpoint de tendências analíticas.

Comportamento atual:
- o gráfico é conduzido por consultas de exibição carregadas na montagem
- a seleção da métrica altera qual série é enfatizada
- `MRR`, `Churn` e `LTV` seguem o `group_by` selecionado
- a guia `Created` renderiza um gráfico de barras diário dedicado
- o gráfico `Created` usa uma barra UTC por dia
- Os buckets `day`, `week` e `month` usam `UTC`

A UI atual mantém intencionalmente o gráfico leve e alinhado com a linguagem visual do administrador existente.

## 5. Exportar

A página Analytics expõe uma ação `Export` com:
- `CSV`
- `JSON`

Comportamento atual:
- a exportação é síncrona no MVP
- a exportação é sob demanda e não pré-carregada
- a exportação sempre usa os filtros atualmente ativos
- o conteúdo baixado usa a ordem de coluna determinística fornecida pelo backend e a semântica de carga útil

A exportação não invalida nem recarrega as consultas de exibição por si só.

## 6. Carregamento de dados

A página segue o padrão de consulta de exibição do Medusa Admin.

Comportamento atual:
- Carregamento de dados KPI na montagem
- carregamentos de dados de tendência na montagem
- a exportação é uma solicitação sob demanda separada
- as consultas de exibição são codificadas apenas pelos filtros analíticos resolvidos
- as consultas de exibição não estão vinculadas ao estado da UI local não relacionado

Detalhe de implementação:
- auxiliares de carregamento no nível da página residem em `src/admin/routes/subscriptions/analytics/data-loading.ts`

## 7. Invalidação de cache

A UI Admin inclui invalidação explícita do cache de análise para mutações que podem afetar os relatórios.

A integração de invalidação atual existe para:
- mutações de assinatura
- mutações de renovação
- mutações de cancelamento
- mutações de cobrança

Isso mantém o painel de análise alinhado com o restante das superfícies administrativas após alterações relevantes.

## 8. Estados da IU

### Carregando

A página mostra um estado de carregamento enquanto as consultas de KPI e tendências estão em andamento.

### Vazio

A página mostra um estado vazio explícito quando os filtros selecionados não produzem dados analíticos.

Isto é tratado como um resultado de relatório válido e não como um erro.

A guia `Created` é uma exceção:
- renderiza um gráfico de barras diário para o intervalo solicitado, mesmo quando todos os valores retornados são `0`

### Erro

A página mostra um estado de erro quando as consultas de KPI ou tendências falham.

Os erros de exportação são tratados separadamente e não substituem o estado do painel principal.

## 9. Limites atuais de UX

A página atual do Analytics intencionalmente não inclui:
- interface do período de comparação
- visualizações salvas
- enfileiramento de exportação assíncrona
- anotações de anomalias no gráfico
- detalhamento baseado em navegador em linhas de instantâneo individuais

As prioridades de UX implementadas são:
- consistência com as páginas existentes do Medusa Admin
- relatórios filtrados previsíveis
- acesso rápido a KPI, tendências e exportação em uma tela
