# Interface do usuário de administração: Análises

Este documento descreve a interface de usuário administrativa implementada para a área `Analytics` no plug-in `Reorder`.

O foco está em:
- comportamento da tela
- filtros e fluxos de leitura
- comportamento de exportação
- estados de carregamento e de erro
- limites de invalidação do cache

## Objetivo

A interface de usuário de administração do `Analytics` oferece aos operadores um painel voltado para relatórios sobre KPIs e tendências do comércio recorrente.

O objetivo é oferecer suporte a:
- análise rápida de KPIs
- análise de tendências ao longo do tempo
- análise diária do volume de criação de assinaturas
- relatórios filtrados por status, produto e periodicidade
- exportação da parte do relatório atualmente visível

A interface do usuário foi implementada como uma página personalizada do Medusa Admin, aninhada na seção `Assinaturas`.

## Mapa da rota

Rota implementada:
- `/app/subscriptions/analytics`

Comportamento de navegação:
- a página está agrupada na área administrativa `Assinaturas`
- trata-se de uma página dedicada, não de uma gaveta nem de um subpainel de detalhes

## 1. Estrutura da página

### Principais elementos da interface do usuário

A página inclui:
- cabeçalho e descrição da página
- barra de filtros
- cartões de KPIs
- gráfico de tendências
- ação de exportação

O layout atual segue as mesmas convenções do Medusa Admin, assim como as outras páginas de plug-ins:
- cabeçalho compacto
- conteúdo agrupado em seções `Container`
- densidade simples de controles
- estados de vazio e de erro bem definidos

## 2. Filtros

### Filtros implementados

Atualmente, a página suporta:
- `date_from`
- `date_to`
- `status`
- `product_id`
- `frequency`
- `group_by`

### Semântica dos filtros

Comportamento atual em tempo de execução:
- os filtros afetam tanto as consultas de KPI quanto as de tendências
- a alteração dos filtros atualiza os dados analíticos exibidos
- a exportação utiliza os filtros ativos no momento
- `group_by` tem como padrão `dia`
- a semântica do fuso horário está fixada em `UTC` na versão MVP

Exceção implementada no gráfico:
- a guia de tendência `Created` utiliza apenas `date_from` e `date_to`
- a tendência `Created` ignora `status`, `product_id`, `frequency` e `group_by`
- o controle `group_by` fica desativado enquanto `Created` estiver selecionado

Os filtros de frequência são representados como tokens de cadência, tais como:
- `week:1`
- `month:1`
- `year:1`

## 3. Cartões de KPI

Atualmente, a página exibe quatro cartões de KPI:
- `MRR`
- `Taxa de cancelamento`
- `LTV`
- `Assinaturas ativas`

### Regras de apresentação

- Os KPIs de moeda exibem formatação específica para moeda quando existe um conjunto de dados válido com uma única moeda
- `MRR` e `LTV` podem ser exibidos como texto vazio ou de substituição quando o conjunto de dados selecionado contém moedas diferentes ou não possui uma base de receita válida
- As métricas de contagem utilizam formatação de números inteiros
- As métricas percentuais utilizam a precisão do KPI configurada na carga útil da resposta

## 4. Gráfico de tendências

A página exibe uma visualização simples de tendências, obtida a partir do endpoint de tendências de análise.

Comportamento atual:
- o gráfico é gerado a partir de consultas de exibição carregadas no momento da montagem
- a seleção de métricas determina qual série é destacada
- `MRR`, `Churn` e `LTV` seguem o `group_by` selecionado
- a guia `Created` exibe um gráfico de barras diário dedicado
- o gráfico `Created` usa uma barra UTC por dia
- os intervalos `dia`, `semana` e `mês` usam `UTC`

A interface do usuário atual mantém, intencionalmente, o gráfico simples e alinhado com a identidade visual existente do Admin.

## 5. Exportar

A página “Análises” apresenta uma ação `Exportar` com as seguintes opções:
- `CSV`
- `JSON`

Comportamento atual:
- a exportação é síncrona no MVP
- a exportação é feita sob demanda e não é pré-carregada
- a exportação sempre utiliza os filtros ativos no momento
- o conteúdo baixado utiliza a ordem determinística das colunas e a semântica da carga útil fornecidas pelo backend

A exportação, por si só, não invalida nem recarrega as consultas de exibição.

## 6. Carregamento de dados

A página segue o padrão de exibição e consulta do Medusa Admin.

Comportamento atual:
- Os dados de KPI são carregados no momento da montagem
- Os dados de tendência são carregados no momento da montagem
- A exportação é uma solicitação separada, feita sob demanda
- As consultas de exibição são baseadas apenas nos filtros de análise resolvidos
- As consultas de exibição não estão vinculadas a um estado da interface do usuário local não relacionado

Detalhes de implementação:
- os auxiliares de carregamento no nível da página estão localizados em `src/admin/routes/subscriptions/analytics/data-loading.ts`

## 7. Invalidação do cache

A interface de usuário administrativa inclui a invalidação explícita do cache de análises para alterações que possam afetar os relatórios.

Atualmente, a integração de invalidação está disponível para:
- alterações em assinaturas
- alterações em renovações
- alterações em cancelamentos
- alterações em cobranças de atraso

Isso mantém o painel de análises alinhado com o restante das interfaces de administração após as alterações relevantes.

## 8. Estados da interface do usuário

### Carregando

A página exibe um indicador de carregamento enquanto as consultas de KPIs e tendências estão em andamento.

### Vazio

A página exibe explicitamente um estado vazio quando os filtros selecionados não geram dados analíticos.

Isso é considerado um resultado válido do relatório, e não um erro.

A guia `Criado` é uma exceção:
- ela exibe um gráfico de barras diário para o intervalo solicitado, mesmo quando todos os valores retornados são `0`

### Erro

A página exibe uma mensagem de erro quando as consultas de KPI ou de tendências falham.

Os erros de exportação são tratados separadamente e não alteram o estado do painel principal.

## 9. Limites atuais da experiência do usuário

A página atual do Analytics não inclui, intencionalmente:
- interface de usuário para comparação entre períodos
- visualizações salvas
- fila de exportação assíncrona
- anotações de anomalias no gráfico
- detalhamento, no navegador, de linhas individuais do instantâneo

As prioridades de experiência do usuário (UX) implementadas são:
- consistência com as páginas existentes do Medusa Admin
- relatórios filtrados previsíveis
- acesso rápido a KPIs, tendências e exportação a partir de uma única tela
