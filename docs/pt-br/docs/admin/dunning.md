# Interface de usuário administrativa: Cobrança

Este documento descreve a interface de usuário administrativa implementada para a área `Dunning` no plug-in `Reorder`.

Ele se concentra no comportamento das telas, nos fluxos de usuários, nas ações e no gerenciamento do estado da interface do usuário.

## Objetivo

A interface de usuário administrativa `Dunning` oferece aos operadores um espaço de trabalho dedicado para:
- consultar casos de cobrança pendentes e históricos
- verificar o contexto das assinaturas, renovações e pedidos associados
- analisar o histórico de novas tentativas e as falhas de pagamento
- tentar manualmente a recuperação do pagamento
- marcar manualmente os casos como recuperados ou não recuperados
- substituir os cronogramas de novas tentativas para casos ativos

A interface do usuário é implementada como rotas personalizadas do Medusa Admin e segue o mesmo padrão aninhado `Subscriptions` já utilizado por `Plans & Offers` e `Renewals`.

## Mapa da rota

Rotas implementadas:
- `/app/subscriptions/dunning`
- `/app/subscriptions/dunning/:id`

Comportamento de navegação:
- a página de cobrança está aninhada sob `Subscriptions`
- clicar em uma linha na fila de cobrança leva à página de detalhes do caso
- a rota de detalhes exibe uma trilha de navegação de volta à fila de cobrança

## 1. Página da fila

### Objetivo

A página da fila é a visão geral operacional dos casos de cobrança.

É implementado com o Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas de lista
- DataTable da fila de cobranças em atraso
- paginação
- campos de filtro específicos

### Colunas

A fila exibe atualmente:
- `Subscription`
- `Status`
- `Next retry`
- `Attempts`
- `Last error`

A exibição das colunas utiliza células compactas no estilo Medusa:
- valor principal na primeira linha
- valor complementar em texto discreto na segunda linha, quando aplicável

### Pesquisar

A fila possui um campo de pesquisa na barra de ferramentas.

A função de pesquisa destina-se a consultas gerais e, atualmente, abrange campos de exibição relacionados a cobranças, tais como:
- referência da assinatura
- nome do cliente
- título do produto
- título da variante
- SKU
- provedor de pagamento
- código do último erro de pagamento

### Filtros

A fila utiliza o padrão de interação padrão do Medusa, `Add filter`.

Filtros implementados:
- `Status`

A página também apresenta campos de entrada específicos para:
- `Provider id`
- `Error code`
- `Attempts min`
- `Attempts max`
- `Next retry from`
- `Next retry to`

`Next retry from/to` é definido por padrão como `now - 30 days 00:00` e `now + 30 days 00:00`.

Os filtros `status` aplicados são exibidos como ícones na barra de ferramentas.

Os filtros específicos para texto, números e datas são aplicados como filtros de lista, mas não são exibidos como ícones de filtro de forma intencional.

### Classificação

A fila utiliza o menu de classificação padrão da barra de ferramentas.

Ele oferece suporte à classificação por campos expostos pela camada de consulta do backend, incluindo:
- `Status`
- `Next retry`
- `Attempts`
- `Last attempt`
- campos selecionados com informações de exibição, como resumo de assinatura ou resumo de pedido

### Navegação por linhas

Ao clicar em uma linha, a página de detalhes desse caso de cobrança é aberta.

Não há um menu de ações por linha na página da fila.

## 2. Página de detalhes

### Objetivo

A página de detalhes é a tela operacional principal de um caso de cobrança.

Ele combina:
- visibilidade do estado de recuperação
- contexto operacional associado
- histórico de novas tentativas
- ações manuais
- gerenciamento da programação de novas tentativas

### Cabeçalho

O cabeçalho de detalhes contém:
- ID do caso de cobrança
- descrição resumida
- indicador de status
- menu de ações

Isso segue o padrão Medusa, com o título à esquerda e o status e as ações à direita.

### Seções principais

Atualmente, a página de detalhes exibe:
- `Case overview`
- `Payment summary`
- `Retry schedule`
- `Subscription summary`
- `Renewal summary`
- `Order / payment summary`
- `Attempt timeline`
- `Technical metadata`

Essas seções são voltadas para a leitura e foram elaboradas para uma rápida inspeção pelo operador.

Layout:
- a coluna da esquerda contém `Case overview`, `Payment summary`, `Retry schedule`, `Attempt timeline` e `Technical metadata`
- a coluna da direita contém `Subscription summary`, `Renewal summary` e `Order / payment summary` como cartões interligados no estilo Medusa, nos casos em que existem registros interligados

## 3. Ações detalhadas

### Menu de ações

O menu de ações da página de detalhes inclui:
- `Retry now`
- `Mark recovered`
- `Mark unrecovered`
- `Edit retry schedule`

### Disponibilidade da ação

Regras de ação atuais na interface do usuário:

- `Retry now`
  Disponível para casos ativos que permitem repetição e bloqueado para estados terminais ou em andamento.
- `Mark recovered`
  Disponível para casos ativos não terminais e bloqueado enquanto a repetição estiver em andamento.
- `Mark unrecovered`
  Disponível para casos ativos não terminais e bloqueado enquanto a repetição estiver em andamento.
- `Edit retry schedule`
  Disponível para casos não terminais e bloqueado enquanto a repetição estiver em andamento.

As ações ficam desativadas enquanto a mutação correspondente estiver pendente.

## 4. Gavetas e fluxos de confirmação

A página de detalhes utiliza avisos de confirmação para ações de risco e um menu deslizante para a edição da programação de novas tentativas.

Isso segue o padrão do Medusa de manter os fluxos de edição em “Drawers”, em vez de inline.

### Confirmação para tentar novamente agora

Objetivo:
- impedir que o administrador tente efetuar o pagamento imediatamente

Comportamento:
- a ação exibe uma janela de confirmação antes da modificação;
- a ação fica desativada enquanto a modificação estiver pendente

### Marca de confirmação de recuperação

Objetivo:
- garantir o fechamento manual de um caso conforme recuperado

Comportamento:
- a ação exibe uma janela de confirmação antes da modificação;
- a ação fica desativada enquanto a modificação estiver pendente

### Marcar confirmação não recuperada

Objetivo:
- impedir o encerramento manual de um caso como “não recuperado”

Comportamento:
- a ação exibe uma janela de confirmação antes da modificação;
- a ação fica desativada enquanto a modificação estiver pendente

### Painel de programação de novas tentativas

Objetivo:
- editar os intervalos de repetição e o número máximo de tentativas para um caso

Campos:
- opcional `reason`
- `intervals`
- `max_attempts`

Comportamento:
- a gaveta carrega seus próprios dados de consulta
- ao enviar, é exibido um indicador explícito de carregamento
- a gaveta exibe uma interface de validação e aviso para substituições de programação que apresentam risco
- é exibida uma confirmação final antes de salvar a substituição

## 5. Carregamento de dados

A interface de usuário administrativa `Dunning` segue o padrão de exibição e consulta do Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada no momento da montagem
- a consulta de exibição de detalhes é carregada no momento da montagem
- a gaveta “retry-schedule” possui sua própria consulta dedicada
- as mutações bem-sucedidas invalidam tanto as consultas de lista quanto as de detalhes
- a consulta da gaveta “retry-schedule” também é invalidada após alterações na programação
- as consultas de exibição não dependem do estado da interface do usuário (UI) modal ou da gaveta

Detalhes de implementação:
- o carregamento de dados ocorre em `src/admin/routes/subscriptions/dunning/data-loading.ts`
- a invalidação compartilhada atualiza o estado das consultas da fila, dos detalhes e do formulário de programação

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

### Seção “Estados vazios”

A página de detalhes também apresenta estados de vazio explícitos para:
- sem renovação vinculada;
- sem pedido vinculado;
- sem tentativas de repetição;
- sem metadados;
- sem programação de repetição

Isso evita que apareçam espaços em branco nas telas operacionais.

## 7. Notas sobre a experiência do usuário

A interface de usuário do Dunning implementada mantém-se intencionalmente alinhada com a linguagem de administração existente usada em outras partes do plug-in:
- ela está aninhada sob `Subscriptions`
- utiliza os mesmos padrões de composição de `DataTable` e da página de detalhes que `Renewals`
- depende de mutações baseadas no fluxo de trabalho e de cargas de dados atualizadas da página de detalhes
- utiliza avisos de confirmação e menus deslizantes, em vez de padrões de interação personalizados

Isso mantém o comportamento do operador consistente entre `Subscriptions`, `Plans & Offers`, `Renewals` e `Dunning`.
