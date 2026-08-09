# UI do administrador: cancelamento e retenção

Este documento descreve a UI Admin implementada para a área `Cancellation & Retention` no plugin `Reorder`.

Ele se concentra no comportamento da tela, nos fluxos do usuário, nas ações e no tratamento do estado da IU.

## Propósito

A UI Admin `Cancellation & Retention` oferece aos operadores um espaço de trabalho dedicado para:
- navegue por casos de cancelamento ativos e históricos
- inspecionar o contexto vinculado de assinatura, cobrança e renovação
- revisar os motivos de rotatividade e os resultados de retenção
- aplicar ofertas de retenção
- finalizar o cancelamento
- atualizar classificação do motivo da rotatividade

A UI é implementada como rotas personalizadas do Medusa Admin e segue o mesmo padrão aninhado `Subscriptions` já usado por `Renewals` e `Dunning`.

## Mapa de rotas

Rotas implementadas:
- `/app/subscriptions/cancellations`
- `/app/subscriptions/cancellations/:id`

Comportamento de navegação:
- a página de cancelamentos está aninhada em `Subscriptions`
- clicar em uma linha na fila de cancelamento navega para os detalhes do caso
- a rota detalhada mostra trilhas de volta à fila de cancelamento

## 1. Página da fila

### Propósito

A página da fila é a visão geral operacional dos casos de cancelamento.

É implementado com Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas da lista
- fila de cancelamento DataTable
- paginação
- entradas dedicadas de data de criação

### Colunas

A fila exibe atualmente:
- `Subscription`
- `Reason category`
- `Outcome`
- `Created`

A renderização de colunas usa células compactas no estilo Medusa:
- valor primário na primeira linha
- valor de apoio em texto sutil na segunda linha, quando aplicável

### Procurar

A fila possui uma entrada de pesquisa na barra de ferramentas.

A pesquisa destina-se a pesquisas amplas e atualmente abrange campos de exibição vinculados ao cancelamento, como:
- referência de assinatura
- nome do cliente
- título do produto
- título da variante
- texto do motivo da rotatividade

### Filtros

A fila usa o padrão de interação Medusa `Add filter`.

Filtros implementados:
- `Reason category`
- `Outcome`
- `Offer type`

A página também expõe entradas de data dedicadas para:
- `Created from`
- `Created to`

Estas entradas de data:
- são aplicados como filtros de lista
- são inicializados no carregamento da página para `now - 30 days` e `now + 30 days`
- não são intencionalmente renderizados como chips de filtro da barra de ferramentas

Os filtros sem data aplicados são mostrados como ícones na barra de ferramentas e podem ser removidos individualmente.

A lista também expõe `Clear all` quando qualquer filtro não padrão está ativo.

### Classificação

A fila usa o menu de classificação padrão na barra de ferramentas.

Ele oferece suporte à classificação de campos expostos pela camada de consulta de back-end, incluindo:
- `Created`
- `Status`
- `Outcome`
- `Reason category`
- campos selecionados enriquecidos com exibição, como resumo da assinatura

### Navegação de linha

Clicar em uma linha abre a página de detalhes desse caso de cancelamento.

Não há menu de ação de linha separado na página da fila.

## 2. Página de detalhes

### Propósito

A página de detalhes é a tela operacional principal para um caso de cancelamento.

Combina:
- visibilidade do estado de rotatividade e retenção
- contexto operacional vinculado
- visibilidade do resultado
- oferecer histórico
- ações manuais

### Cabeçalho

O cabeçalho de detalhes contém:
- ID do caso de cancelamento
- breve descrição
- emblema de status
- menu de ação

Isto segue o padrão Medusa de título à esquerda e status mais ações à direita.

### Seções principais

A página de detalhes renderiza atualmente:
- `Case overview`
- `Subscription summary`
- `Dunning summary`
- `Renewal summary`
- `Decision timeline`
- `Offer history`
- `Technical metadata`

Estas seções são orientadas para leitura e projetadas para inspeção rápida do operador.

## 3. Ações detalhadas

### Menu de Ação

O menu de ação da página de detalhes inclui:
- `Apply retention offer`
- `Update reason`
- `Finalize cancellation`

### Disponibilidade de ação

Regras de ação atuais na IU:

- `Apply retention offer`
  Disponível para casos ativos e não terminais.
- `Update reason`
  Disponível para casos ativos e não terminais.
- `Finalize cancellation`
  Disponível para casos ativos e não terminais.

Os status do terminal são tratados como somente leitura:
- `retained`
- `paused`
- `canceled`

As ações ficam desativadas enquanto a mutação correspondente estiver pendente.

## 4. Gavetas e Fluxos de Confirmação

A página de detalhes usa Gavetas para formulários de mutação e avisos de confirmação para ações arriscadas.

Isso segue o padrão Medusa de manter os fluxos de edição em gavetas em vez de inline.

### Aplicar gaveta de ofertas

Objetivo:
- capturar a carga útil da ação de retenção concreta

Os campos variam em `offer_type`.

#### Pausar campos de oferta
- `pause_cycles`
- `resume_at`
- `decision_reason`
- `note`

#### Campos de oferta de desconto
- `discount_type`
- `discount_value`
- `duration_cycles`
- `decision_reason`
- `note`

#### Campos de oferta de bônus
- `bonus_type`
- `value`
- `label`
- `duration_cycles`
- `decision_reason`
- `note`

Comportamento:
- a gaveta usa uma consulta de formulário de ação dedicada
- o formulário é pré-preenchido a partir do estado do caso atual, quando relevante
- submit mostra um prompt de confirmação antes da mutação
- `pause_offer` usa uma confirmação de aviso mais forte porque altera o estado do ciclo de vida da assinatura

### Atualizar gaveta de motivos

Objetivo:
- atualizar motivo e classificação da rotatividade

Campos:
- `reason`
- `reason_category`
- `notes`
- `update_reason`

Comportamento:
- a gaveta usa uma consulta de formulário de ação dedicada
- o formulário é pré-preenchido com os campos do caso atual
- enviar salvamentos diretamente por meio da rota apoiada pelo fluxo de trabalho

### Finalizar gaveta de cancelamento

Objetivo:
- feche o caso como `canceled`

Campos:
- `reason`
- `reason_category`
- `notes`
- `effective_at`

Comportamento:
- a gaveta usa uma consulta de formulário de ação dedicada
- submit mostra um prompt de confirmação final
- a confirmação explica o impacto do cancelamento da assinatura no ciclo de vida

## 5. Carregamento de dados

A UI Admin `Cancellation & Retention` segue o padrão de consulta de exibição Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada na montagem
- a consulta de exibição de detalhes é carregada na montagem
- gavetas de ação usam sua própria consulta dedicada
- mutações bem-sucedidas invalidam consultas de lista e detalhes
- a consulta do formulário de ação também é invalidada após mutações
- as chaves de consulta analítica preparadas são invalidadas mesmo que a IU analítica seja adiada
- as consultas de exibição não dependem do estado da UI modal ou da gaveta

Detalhe de implementação:
- o carregamento de dados reside em `src/admin/routes/subscriptions/cancellations/data-loading.ts`
- a invalidação compartilhada atualiza a fila, os detalhes, o formulário de ação e o estado da consulta analítica preparada

## 6. Carregamento, erro e estados vazios

### Página da fila

A página da fila fornece:
- Estado de carregamento do DataTable
- Estado vazio do DataTable
- alerta de erro no nível da página quando a consulta da fila falha

### Página de detalhes

A página de detalhes fornece:
- estado de carregamento explícito
- estado de erro explícito
- estado de aviso de fallback se os dados detalhados não estiverem disponíveis

### Carregamento de gaveta e estados de erro

As gavetas de ação fornecem:
- estado de carregamento local enquanto a consulta do formulário de ação está carregando
- estado de erro de formulário embutido para mutações com falha
- ações de envio desativadas enquanto as mutações estão pendentes

### Seção Estados Vazios

A página de detalhes também fornece estados vazios explícitos para:
- nenhum resumo de cobrança vinculado
- nenhum resumo de renovação vinculado
- nenhuma entrada no cronograma de decisão
- sem histórico de ofertas
- sem metadados

Isso evita lacunas vazias nas telas operacionais.

## 7. Notas de experiência do usuário

A IU atual mantém intencionalmente ações arriscadas na página de detalhes, e não na fila.

Por quê:
- as ações de retenção e cancelamento precisam de mais contexto do que uma ação de linha leve
- a página de detalhes mostra recomendações, histórico de ofertas e contexto operacional vinculado antes da mutação
- corresponde ao padrão Medusa já usado por `Renewals` e `Dunning`

Outra escolha intencional:
- as entradas de data na fila não são renderizadas como chips de filtro
- eles se comportam como entradas de data dedicadas na fila `Renewals`

Isso mantém a barra de ferramentas compacta e evita duplicação confusa entre entradas de data e chips de filtro.
