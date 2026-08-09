# Interface do administrador: Renovações

Este documento descreve a interface de usuário administrativa implementada para a área `Renewals` no plug-in `Reorder`.

Ele se concentra no comportamento das telas, nos fluxos de usuários, nas ações e no gerenciamento do estado da interface do usuário.

## Objetivo

A interface de usuário administrativa `Renewals` oferece aos operadores um espaço de trabalho dedicado para:
- consultar ciclos de renovação programados e com falha;
- verificar o histórico de execução e os registros vinculados;
- analisar alterações pendentes e o status de aprovação;
- forçar manualmente uma renovação;
- aprovar ou rejeitar alterações pendentes antes da renovação

A interface do usuário foi implementada como rotas personalizadas do Medusa Admin e segue os padrões do painel do Medusa da forma mais fiel possível.

## Mapa da rota

Rotas implementadas:
- `/app/subscriptions/renewals`
- `/app/subscriptions/renewals/:id`

Comportamento de navegação:
- a página de renovações está aninhada sob `Subscriptions`
- clicar em uma linha na fila de renovações leva à página de detalhes do ciclo
- a rota de detalhes exibe uma trilha de navegação de volta à fila de renovações

## 1. Página da fila

### Objetivo

A página da fila apresenta uma visão geral operacional dos ciclos de renovação.

É implementado com o Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas de lista
- DataTable da fila de renovações
- paginação
- campos de entrada dedicados para datas programadas

### Colunas

A fila exibe atualmente:
- `Scheduled`
- `Subscription`
- `Status`
- `Approval`
- `Last attempt`

A exibição das colunas utiliza células compactas no estilo Medusa:
- valor principal na primeira linha
- valor complementar em texto discreto na segunda linha, quando aplicável

### Pesquisar

A fila possui um campo de pesquisa na área superior direita da barra de ferramentas.

A função de pesquisa destina-se a consultas gerais e, atualmente, abrange campos de exibição relacionados à renovação, tais como:
- referência da assinatura
- nome do cliente
- título do produto
- título da variante
- SKU

### Filtros

A fila utiliza o padrão de interação padrão do Medusa, `Add filter`.

Filtros implementados:
- `Status`
- `Approval`
- `Last attempt`

A página também apresenta campos de entrada dedicados para datas:
- `Scheduled from`
- `Scheduled to`

Esses campos de entrada de data:
- são aplicados como filtros de lista
- são inicializados no carregamento da página com os valores `now - 30 days 00:00` e `now + 30 days 00:00`
- não são exibidos intencionalmente como ícones de filtro na barra de ferramentas

Os filtros que não são de data aplicados são exibidos como ícones na barra de ferramentas e podem ser removidos individualmente.

A lista também expõe `Clear all` quando qualquer filtro está ativo.

### Classificação

A fila utiliza o menu de classificação padrão da barra de ferramentas.

Ele oferece suporte à classificação por campos expostos pela camada de consulta do backend, incluindo:
- `Scheduled`
- `Subscription`
- `Status`
- `Approval`
- `Last attempt`

### Navegação por linhas

Ao clicar em uma linha, a página de detalhes desse ciclo de renovação é aberta.

Não há um menu de ações por linha na página da fila.

## 2. Página de detalhes

### Objetivo

A página de detalhes é a tela operacional principal para um único ciclo de renovação.

Ele combina:
- visibilidade do status de execução
- visibilidade do status de aprovação
- dados vinculados somente para leitura
- histórico de tentativas
- ações operacionais

### Cabeçalho

O cabeçalho de detalhes contém:
- ID do ciclo de renovação
- descrição resumida
- indicador de status
- menu de ações

Isso segue o padrão Medusa, com o título à esquerda e o status e as ações à direita.

### Seções principais

Atualmente, a página de detalhes exibe:
- `Cycle overview`
- `Approval summary`
- `Subscription summary`
- `Generated order summary`
- `Pending changes`
- `Attempt history`
- `Technical metadata`

Essas seções são voltadas para a leitura e foram elaboradas para uma rápida inspeção pelo operador.

Layout:
- a coluna da esquerda contém `Cycle overview`, `Approval summary`, `Pending changes`, `Attempt history` e `Technical metadata`
- a coluna da direita contém `Subscription summary` e `Generated order summary` como cartas interligadas no estilo Medusa

## 3. Ações detalhadas

### Menu de ações

O menu de ações da página de detalhes inclui:
- `Force renewal`
- `Approve changes`
- `Reject changes`

### Disponibilidade da ação

Regras de ação atuais na interface do usuário:

- `Force renewal`
  Disponível quando o status do ciclo é `scheduled` ou `failed`.
- `Approve changes`
  Disponível apenas quando a aprovação é necessária e o status da aprovação é `pending`.
- `Reject changes`
  Disponível apenas quando a aprovação é necessária e o status da aprovação é `pending`.

As ações ficam desativadas enquanto houver uma mutação pendente.

## 4. Gavetas e fluxos de confirmação

A página de detalhes utiliza menus deslizantes para decisões de aprovação e solicitações de confirmação para ações de risco.

Isso segue o padrão Medusa, que consiste em manter os fluxos de edição ou decisão em “Drawers”, em vez de diretamente no código.

### Gaveta “Aprovar alterações”

Objetivo:
- registrar a decisão de aprovação das alterações pendentes

Campos:
- opcional `reason`

Comportamento:
- a gaveta é aberta a partir do menu de ações
- ao clicar em “Enviar”, é exibida uma mensagem de confirmação final
- os erros são exibidos diretamente na gaveta e por meio de notificações pop-up
- a gaveta utiliza os dados de detalhes existentes e o estado local do formulário, em vez de realizar uma consulta remota separada para exibição

### Painel “Rejeitar alterações”

Objetivo:
- registrar a decisão de rejeição das alterações pendentes

Campos:
- obrigatório `reason`

Comportamento:
- a gaveta é aberta a partir do menu de ações
- é necessário preencher `reason` antes do envio
- ao enviar, é exibida uma mensagem de confirmação final
- os erros são exibidos diretamente na gaveta e por meio de notificações pop-up
- a gaveta utiliza os dados de detalhes existentes e o estado local do formulário, em vez de uma consulta remota separada para exibição

### Forçar a confirmação da renovação

Objetivo:
- garantir a execução manual de um ciclo de renovação

Comportamento:
- a ação exibe uma janela de confirmação antes da modificação;
- a ação fica desativada enquanto a modificação estiver pendente

## 5. Carregamento de dados

A interface de usuário administrativa `Renewals` segue o padrão de exibição e consulta do Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada no momento da montagem
- a consulta de exibição de detalhes é carregada no momento da montagem
- o estado da gaveta não controla a consulta de exibição principal
- as alterações bem-sucedidas invalidam tanto a consulta da lista quanto a de detalhes

As guias de aprovação não possuem consultas separadas à tela remota, pois operam com base em:
- estado local do formulário
- dados já presentes na carga útil de detalhes

Detalhes da implementação:
- o carregamento de dados ocorre em `src/admin/routes/subscriptions/renewals/data-loading.ts`
- as ações bem-sucedidas utilizam a invalidação compartilhada para atualizar tanto a fila quanto o estado dos detalhes

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

A página de detalhes também apresenta estados vazios explícitos para:
- nenhuma alteração pendente
- nenhuma tentativa
- nenhum metadado
- nenhum pedido gerado

Isso evita que apareçam espaços em branco nas telas operacionais.

## 7. Notas sobre a experiência do usuário

A interface do usuário atual mantém intencionalmente o `Renewals` como uma página operacional sob o `Subscriptions`, da mesma forma que o `Plans & Offers`.

Isso mantém a navegação do plug-in estruturada em torno de:
- assinaturas, como área principal operacional;
- renovações, como uma subárea de fila e revisão

Os padrões visuais implementados estão em consonância com o restante do plug-in:
- Medusa `DataTable`
- `StatusBadge`
- seções detalhadas `Container`
- menus suspensos para decisões
- avisos para ações de risco

Arquivos de rota implementados:
- `src/admin/routes/subscriptions/renewals/page.tsx`
- `src/admin/routes/subscriptions/renewals/[id]/page.tsx`

## Documentos relacionados

- [Arquitetura de renovações](../architecture/renewals.md)
- [API de renovações para administradores](../api/admin-renewals.md)
- [Testes de renovações](../testing/renewals.md)
- [Especificações de renovações](../specs/renewals/admin-spec.md)
