# Interface do usuário de administração: cancelamento e retenção

Este documento descreve a interface de usuário administrativa implementada para a área `Cancellation & Retention` no plug-in `Reorder`.

Ele se concentra no comportamento das telas, nos fluxos de usuários, nas ações e no gerenciamento do estado da interface do usuário.

## Objetivo

A interface de usuário administrativa `Cancellation & Retention` oferece aos operadores um espaço de trabalho dedicado para:
- consultar casos de cancelamento ativos e históricos
- analisar o contexto relacionado a assinaturas, cobranças e renovações
- examinar os motivos de cancelamento e os resultados de retenção
- aplicar ofertas de retenção
- finalizar o cancelamento
- atualizar a classificação dos motivos de cancelamento

A interface do usuário é implementada como rotas personalizadas do Medusa Admin e segue o mesmo padrão aninhado `Subscriptions` já utilizado por `Renewals` e `Dunning`.

## Mapa da rota

Rotas implementadas:
- `/app/subscriptions/cancellations`
- `/app/subscriptions/cancellations/:id`

Comportamento de navegação:
- a página de cancelamentos está aninhada sob `Subscriptions`
- clicar em uma linha na fila de cancelamentos leva à página de detalhes do caso
- a rota de detalhes exibe uma trilha de navegação de volta à fila de cancelamentos

## 1. Página da fila

### Objetivo

A página da fila é a visão geral operacional dos casos de cancelamento.

É implementado com o Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas de lista
- DataTable da fila de cancelamentos
- paginação
- campos de entrada dedicados para a data de criação

### Colunas

Atualmente, a fila exibe:
- `Subscription`
- `Reason category`
- `Outcome`
- `Created`

A exibição das colunas utiliza células compactas no estilo Medusa:
- valor principal na primeira linha
- valor complementar em texto discreto na segunda linha, quando aplicável

### Pesquisar

A fila possui um campo de pesquisa na barra de ferramentas.

A função de pesquisa destina-se a consultas gerais e, atualmente, abrange campos de exibição relacionados ao cancelamento, tais como:
- referência da assinatura
- nome do cliente
- título do produto
- título da variante
- texto do motivo do cancelamento

### Filtros

A fila utiliza o padrão de interação padrão do Medusa, `Add filter`.

Filtros implementados:
- `Reason category`
- `Outcome`
- `Offer type`

A página também apresenta campos de entrada dedicados para datas:
- `Created from`
- `Created to`

Esses campos de entrada de data:
- são aplicados como filtros de lista
- são inicializados no carregamento da página com os valores `now - 30 days` e `now + 30 days`
- não são exibidos intencionalmente como ícones de filtro na barra de ferramentas

Os filtros que não são de data aplicados são exibidos como ícones na barra de ferramentas e podem ser removidos individualmente.

A lista também exibe `Clear all` quando qualquer filtro que não seja o padrão estiver ativo.

### Classificação

A fila utiliza o menu de classificação padrão da barra de ferramentas.

Ele oferece suporte à classificação por campos expostos pela camada de consulta do backend, incluindo:
- `Created`
- `Status`
- `Outcome`
- `Reason category`
- campos selecionados com informações de exibição, como o resumo da assinatura

### Navegação por linhas

Ao clicar em uma linha, a página de detalhes desse caso de cancelamento é aberta.

Não há um menu de ações por linha na página da fila.

## 2. Página de detalhes

### Objetivo

A página de detalhes é a tela operacional principal para um caso de cancelamento.

Ele combina:
- visibilidade do status de rotatividade e retenção
- contexto operacional associado
- visibilidade dos resultados
- histórico de ofertas
- ações manuais

### Cabeçalho

O cabeçalho do detalhe contém:
- ID do caso de cancelamento
- descrição resumida
- indicador de status
- menu de ações

Isso segue o padrão Medusa, com o título à esquerda e o status e as ações à direita.

### Seções principais

Atualmente, a página de detalhes exibe:
- `Case overview`
- `Subscription summary`
- `Dunning summary`
- `Renewal summary`
- `Decision timeline`
- `Offer history`
- `Technical metadata`

Essas seções são voltadas para a leitura e foram elaboradas para uma rápida inspeção pelo operador.

## 3. Ações detalhadas

### Menu de ações

O menu de ações da página de detalhes inclui:
- `Apply retention offer`
- `Update reason`
- `Finalize cancellation`

### Disponibilidade da ação

Regras de ação atuais na interface do usuário:

- `Apply retention offer`
  Disponível para casos ativos e não terminais.
- `Update reason`
  Disponível para casos ativos e não terminais.
- `Finalize cancellation`
  Disponível para casos ativos e não terminais.

Os status dos terminais são tratados como somente leitura:
- `retained`
- `paused`
- `canceled`

As ações ficam desativadas enquanto a mutação correspondente estiver pendente.

## 4. Gavetas e fluxos de confirmação

A página de detalhes utiliza “Drawers” para formulários de alteração e avisos de confirmação para ações que envolvem risco.

Isso segue o padrão do Medusa de manter os fluxos de edição em “Drawers”, em vez de inline.

### Aplicar a barra de ofertas

Objetivo:
- capturar a carga útil da ação de retenção de concreto

Os campos variam de acordo com `offer_type`.

#### Campos da oferta de pausa
- `pause_cycles`
- `resume_at`
- `decision_reason`
- `note`

#### Campos da oferta de desconto
- `discount_type`
- `discount_value`
- `duration_cycles`
- `decision_reason`
- `note`

#### Campos da oferta de bônus
- `bonus_type`
- `value`
- `label`
- `duration_cycles`
- `decision_reason`
- `note`

Comportamento:
- a gaveta utiliza uma consulta dedicada do formulário de ação
- o formulário é pré-preenchido com base no estado atual do caso, quando relevante
- ao enviar, é exibida uma solicitação de confirmação antes da alteração
- `pause_offer` utiliza uma confirmação com aviso mais rigoroso, pois altera o estado do ciclo de vida da assinatura

### Atualizar a janela de motivos

Objetivo:
- atualizar o motivo e a classificação da cancelamento

Campos:
- `reason`
- `reason_category`
- `notes`
- `update_reason`

Comportamento:
- a gaveta utiliza uma consulta dedicada do formulário de ação
- o formulário é pré-preenchido com os campos do caso atual
- ao enviar, o dado é salvo diretamente por meio da rota associada ao fluxo de trabalho

### Finalizar a janela de cancelamento

Objetivo:
- encerrar o caso como `canceled`

Campos:
- `reason`
- `reason_category`
- `notes`
- `effective_at`

Comportamento:
- a gaveta utiliza uma consulta dedicada do formulário de ação
- ao enviar, é exibida uma mensagem final de confirmação
- a mensagem de confirmação explica o impacto no ciclo de vida do cancelamento da assinatura

## 5. Carregamento de dados

A interface de usuário administrativa `Cancellation & Retention` segue o padrão de exibição e consulta do Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada no momento da montagem
- a consulta de exibição de detalhes é carregada no momento da montagem
- as gavetas de ação utilizam suas próprias consultas dedicadas
- as mutações bem-sucedidas invalidam tanto as consultas de lista quanto as de detalhes
- a consulta do formulário de ação também é invalidada após as mutações
- as chaves das consultas de análise preparadas são invalidadas, mesmo que a interface de usuário de análise seja diferida
- as consultas de exibição não dependem do estado da interface de usuário modal ou da gaveta

Detalhes de implementação:
- o carregamento de dados ocorre em `src/admin/routes/subscriptions/cancellations/data-loading.ts`
- a invalidação compartilhada atualiza o estado da fila, do detalhe, do formulário de ação e da consulta analítica preparada

## 6. Estados de carregamento, erro e vazio

### Página da fila

A página da fila exibe:
- Estado de carregamento da DataTable
- Estado vazio da DataTable
- Alerta de erro no nível da página quando a consulta da fila falha

### Página de detalhes

A página de detalhes apresenta:
- estado de carregamento explícito
- estado de erro explícito
- estado de aviso de alternativa, caso os dados detalhados não estejam disponíveis

### Carregamento da gaveta e estados de erro

As caixas de ação fornecem:
- estado de carregamento local enquanto a consulta do formulário de ação está sendo carregada
- estado de erro do formulário em linha para mutações com falha
- ações de envio desativadas enquanto as mutações estiverem pendentes

### Seção “Estados vazios”

A página de detalhes também apresenta estados vazios explícitos para:
- ausência de resumo de cobrança vinculado
- ausência de resumo de renovação vinculado
- ausência de entradas no cronograma de decisões
- ausência de histórico de ofertas
- ausência de metadados

Isso evita que apareçam espaços em branco nas telas operacionais.

## 7. Notas sobre a experiência do usuário

A interface do usuário atual mantém, intencionalmente, as ações de risco na página de detalhes, em vez de na fila.

Por que:
- as ações de retenção e cancelamento exigem mais contexto do que uma ação simples em uma linha
- a página de detalhes exibe recomendações, histórico de ofertas e contexto operacional relacionado antes da alteração
- isso se alinha ao padrão Medusa já utilizado por `Renewals` e `Dunning`

Outra escolha intencional:
- os campos de data na fila não são exibidos como ícones de filtro
- eles funcionam como os campos de data específicos da fila `Renewals`

Isso mantém a barra de ferramentas compacta e evita duplicações que possam causar confusão entre os campos de entrada de data e os botões de filtro.
