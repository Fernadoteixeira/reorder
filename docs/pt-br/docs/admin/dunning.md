# UI do administrador: cobrança

Este documento descreve a UI Admin implementada para a área `Dunning` no plugin `Reorder`.

Ele se concentra no comportamento da tela, nos fluxos do usuário, nas ações e no tratamento do estado da IU.

## Propósito

A UI Admin `Dunning` oferece aos operadores um espaço de trabalho dedicado para:
- navegar por casos de cobrança ativos e históricos
- inspecionar assinatura vinculada, renovação e contexto de pedido
- revisar o histórico de novas tentativas e falhas de pagamento
- tentar novamente manualmente a recuperação do pagamento
- marcar manualmente casos recuperados ou não recuperados
- substituir agendamentos de novas tentativas para casos ativos

A UI é implementada como rotas personalizadas do Medusa Admin e segue o mesmo padrão aninhado `Subscriptions` já usado por `Plans & Offers` e `Renewals`.

## Mapa de rotas

Rotas implementadas:
- `/app/subscriptions/dunning`
- `/app/subscriptions/dunning/:id`

Comportamento de navegação:
- a página de cobrança está aninhada em `Subscriptions`
- clicar em uma linha na fila de cobrança navega para os detalhes do caso
- a rota detalhada mostra trilhas de volta para a fila de cobrança

## 1. Página da fila

### Propósito

A página da fila é a visão geral operacional dos casos de cobrança.

É implementado com Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas da lista
- fila de cobrança DataTable
- paginação
- entradas de filtro dedicadas

### Colunas

A fila exibe atualmente:
- `Subscription`
- `Status`
- `Next retry`
- `Attempts`
- `Last error`

A renderização de colunas usa células compactas no estilo Medusa:
- valor primário na primeira linha
- valor de apoio em texto sutil na segunda linha, quando aplicável

### Procurar

A fila possui uma entrada de pesquisa na barra de ferramentas.

A pesquisa destina-se a pesquisas amplas e atualmente abrange campos de exibição vinculados a cobranças, como:
- referência de assinatura
- nome do cliente
- título do produto
- título da variante
-SKU
- provedor de pagamento
- último código de erro de pagamento

### Filtros

A fila usa o padrão de interação Medusa `Add filter`.

Filtros implementados:
- `Status`

A página também expõe entradas dedicadas para:
- `Provider id`
- `Error code`
- `Attempts min`
- `Attempts max`
- `Next retry from`
- `Next retry to`

`Next retry from/to` padrão para `now - 30 days 00:00` e `now + 30 days 00:00`.

Os filtros `status` aplicados são mostrados como chips na barra de ferramentas.

Os filtros dedicados de texto, numérico e data são aplicados como filtros de lista, mas não são renderizados intencionalmente como chips de filtro.

### Classificação

A fila usa o menu de classificação padrão na barra de ferramentas.

Ele oferece suporte à classificação de campos expostos pela camada de consulta de back-end, incluindo:
- `Status`
- `Next retry`
- `Attempts`
- `Last attempt`
- campos selecionados enriquecidos de exibição, como assinatura ou resumo do pedido

### Navegação de linha

Clicar em uma linha abre a página de detalhes desse caso de cobrança.

Não há menu de ação de linha separado na página da fila.

## 2. Página de detalhes

### Propósito

A página de detalhes é a tela operacional principal de um caso de cobrança.

Combina:
- visibilidade do estado de recuperação
- contexto operacional vinculado
- tentar novamente o histórico
- ações manuais
- tentar novamente o gerenciamento de agendamento

### Cabeçalho

O cabeçalho de detalhes contém:
- ID do caso de cobrança
- breve descrição
- emblema de status
- menu de ação

Isto segue o padrão Medusa de título à esquerda e status mais ações à direita.

### Seções principais

A página de detalhes renderiza atualmente:
- `Case overview`
- `Payment summary`
- `Retry schedule`
- `Subscription summary`
- `Renewal summary`
- `Order / payment summary`
- `Attempt timeline`
- `Technical metadata`

Estas seções são orientadas para leitura e projetadas para inspeção rápida do operador.

Disposição:
- a coluna da esquerda contém `Case overview`, `Payment summary`, `Retry schedule`, `Attempt timeline` e `Technical metadata`
- a coluna da direita contém `Subscription summary`, `Renewal summary` e `Order / payment summary` como cartões vinculados no estilo Medusa onde existem registros vinculados

## 3. Ações detalhadas

### Menu de Ação

O menu de ação da página de detalhes inclui:
- `Retry now`
- `Mark recovered`
- `Mark unrecovered`
- `Edit retry schedule`

### Disponibilidade de ação

Regras de ação atuais na IU:

- `Retry now`
  Disponível para casos ativos com nova tentativa e bloqueado para estados terminais ou em andamento.
- `Mark recovered`
  Disponível para casos ativos não terminais e bloqueado enquanto a nova tentativa estiver em andamento.
- `Mark unrecovered`
  Disponível para casos ativos não terminais e bloqueado enquanto a nova tentativa estiver em andamento.
- `Edit retry schedule`
  Disponível para casos não terminais e bloqueado enquanto a nova tentativa estiver em andamento.

As ações ficam desativadas enquanto a mutação correspondente estiver pendente.

## 4. Gavetas e Fluxos de Confirmação

A página de detalhes usa prompts de confirmação para ações arriscadas e uma gaveta para edição de agendamento de novas tentativas.

Isso segue o padrão Medusa de manter os fluxos de edição em gavetas em vez de inline.

### Tentar novamente agora, confirmação

Objetivo:
- proteja a nova tentativa de pagamento imediata do administrador

Comportamento:
- a ação abre um prompt de confirmação antes da mutação
- a ação é desativada enquanto a mutação estiver pendente

### Marcar confirmação recuperada

Objetivo:
- proteger o fechamento manual de um caso como recuperado

Comportamento:
- a ação abre um prompt de confirmação antes da mutação
- a ação é desativada enquanto a mutação estiver pendente

### Marcar confirmação não recuperada

Objetivo:
- proteger o fechamento manual de um caso como não recuperado

Comportamento:
- a ação abre um prompt de confirmação antes da mutação
- a ação é desativada enquanto a mutação estiver pendente

### Gaveta de agendamento de nova tentativa

Objetivo:
- edite os intervalos de repetição e o máximo de tentativas para um caso

Campos:
- opcional `reason`
- `intervals`
- `max_attempts`

Comportamento:
- a gaveta carrega seus próprios dados de consulta
- submit mostra estado de carregamento explícito
- a gaveta mostra a UI de validação e aviso para substituições de cronograma arriscadas
- uma confirmação final é mostrada antes de salvar a substituição

## 5. Carregamento de dados

A UI Admin `Dunning` segue o padrão de consulta de exibição Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada na montagem
- a consulta de exibição de detalhes é carregada na montagem
- a gaveta de agendamento de novas tentativas tem sua própria consulta dedicada
- mutações bem-sucedidas invalidam consultas de lista e detalhes
- a consulta da gaveta de agendamento de nova tentativa também é invalidada após alterações de agendamento
- as consultas de exibição não dependem do estado da UI modal ou da gaveta

Detalhe de implementação:
- o carregamento de dados reside em `src/admin/routes/subscriptions/dunning/data-loading.ts`
- a invalidação compartilhada atualiza a fila, os detalhes e o estado da consulta do formulário de agendamento

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

### Seção Estados Vazios

A página de detalhes também fornece estados vazios explícitos para:
- sem renovação vinculada
- nenhum pedido vinculado
- sem novas tentativas
- sem metadados
- sem agendamento de novas tentativas

Isso evita lacunas vazias nas telas operacionais.

## 7. Notas de experiência do usuário

A IU de Dunning implementada permanece intencionalmente próxima da linguagem Admin existente usada em outras partes do plug-in:
- está aninhado em `Subscriptions`
- usa os mesmos padrões de composição de página de detalhes e `DataTable` que `Renewals`
- depende de mutações baseadas em fluxo de trabalho e cargas úteis de detalhes atualizadas
- usa prompts e gavetas de confirmação em vez de padrões de interação personalizados

Isso mantém o comportamento do operador consistente em `Subscriptions`, `Plans & Offers`, `Renewals` e `Dunning`.
