# UI do administrador: renovações

Este documento descreve a UI Admin implementada para a área `Renewals` no plugin `Reorder`.

Ele se concentra no comportamento da tela, nos fluxos do usuário, nas ações e no tratamento do estado da IU.

## Propósito

A UI Admin `Renewals` oferece aos operadores um espaço de trabalho dedicado para:
- navegue pelos ciclos de renovação programados e com falha
- inspecionar o histórico de execução e registros vinculados
- revisar alterações pendentes e estado de aprovação
- forçar manualmente uma renovação
- aprovar ou rejeitar alterações pendentes antes da renovação

A UI é implementada como rotas personalizadas do Medusa Admin e segue os padrões do painel Medusa o mais próximo possível.

## Mapa de rotas

Rotas implementadas:
- `/app/subscriptions/renewals`
- `/app/subscriptions/renewals/:id`

Comportamento de navegação:
- a página de renovações está aninhada em `Subscriptions`
- clicar em uma linha na fila de renovações navega para os detalhes do ciclo
- a rota detalhada mostra a localização atual da fila de renovações

## 1. Página da fila

### Propósito

A página da fila é a visão geral operacional dos ciclos de renovação.

É implementado com Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas da lista
- fila de renovação DataTable
- paginação
- entradas de data programada dedicadas

### Colunas

A fila exibe atualmente:
- `Scheduled`
- `Subscription`
- `Status`
- `Approval`
- `Last attempt`

A renderização de colunas usa células compactas no estilo Medusa:
- valor primário na primeira linha
- valor de apoio em texto sutil na segunda linha, quando aplicável

### Procurar

A fila possui uma entrada de pesquisa na área superior direita da barra de ferramentas.

A pesquisa destina-se a pesquisas amplas e atualmente abrange campos de exibição vinculados à renovação, como:
- referência de assinatura
- nome do cliente
- título do produto
- título da variante
-SKU

### Filtros

A fila usa o padrão de interação Medusa `Add filter`.

Filtros implementados:
- `Status`
- `Approval`
- `Last attempt`

A página também expõe entradas de data dedicadas para:
- `Scheduled from`
- `Scheduled to`

Estas entradas de data:
- são aplicados como filtros de lista
- são inicializados no carregamento da página para `now - 30 days 00:00` e `now + 30 days 00:00`
- não são intencionalmente renderizados como chips de filtro da barra de ferramentas

Os filtros sem data aplicados são mostrados como ícones na barra de ferramentas e podem ser removidos individualmente.

A lista também expõe `Clear all` quando qualquer filtro está ativo.

### Classificação

A fila usa o menu de classificação padrão na barra de ferramentas.

Ele oferece suporte à classificação de campos expostos pela camada de consulta de back-end, incluindo:
- `Scheduled`
- `Subscription`
- `Status`
- `Approval`
- `Last attempt`

### Navegação de linha

Clicar em uma linha abre a página de detalhes desse ciclo de renovação.

Não há menu de ação de linha separado na página da fila.

## 2. Página de detalhes

### Propósito

A página de detalhes é a tela operacional principal para um único ciclo de renovação.

Combina:
- visibilidade do estado de execução
- visibilidade do estado de aprovação
- dados vinculados somente leitura
- histórico de tentativas
- ações operacionais

### Cabeçalho

O cabeçalho de detalhes contém:
- ID do ciclo de renovação
- breve descrição
- emblema de status
- menu de ação

Isto segue o padrão Medusa de título à esquerda e status mais ações à direita.

### Seções principais

A página de detalhes renderiza atualmente:
- `Cycle overview`
- `Approval summary`
- `Subscription summary`
- `Generated order summary`
- `Pending changes`
- `Attempt history`
- `Technical metadata`

Estas seções são orientadas para leitura e projetadas para inspeção rápida do operador.

Disposição:
- a coluna da esquerda contém `Cycle overview`, `Approval summary`, `Pending changes`, `Attempt history` e `Technical metadata`
- a coluna da direita contém `Subscription summary` e `Generated order summary` como cartas vinculadas no estilo Medusa

## 3. Ações detalhadas

### Menu de Ação

O menu de ação da página de detalhes inclui:
- `Force renewal`
- `Approve changes`
- `Reject changes`

### Disponibilidade de ação

Regras de ação atuais na IU:

- `Force renewal`
  Disponível quando o status do ciclo é `scheduled` ou `failed`.
- `Approve changes`
  Disponível somente quando a aprovação é necessária e o status de aprovação é `pending`.
- `Reject changes`
  Disponível somente quando a aprovação é necessária e o status de aprovação é `pending`.

As ações ficam desativadas enquanto uma mutação estiver pendente.

## 4. Gavetas e Fluxos de Confirmação

A página de detalhes usa Gavetas para decisões de aprovação e confirma solicitações de ações arriscadas.

Isso segue o padrão Medusa de manter os fluxos de edição ou decisão em gavetas, em vez de inline.

### Aprovar gaveta de alterações

Objetivo:
- registrar a decisão de aprovação para alterações pendentes

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

A página de detalhes também fornece estados vazios explícitos para:
- sem alterações pendentes
- sem tentativas
- sem metadados
- nenhum pedido gerado

Isso evita lacunas vazias nas telas operacionais.

## 7. Notas de experiência do usuário

A UI atual mantém intencionalmente `Renewals` como uma página operacional em `Subscriptions`, semelhante a `Plans & Offers`.

Isso mantém a navegação do plugin estruturada em torno de:
- assinaturas como área pai operacional
- renovações como fila e subárea de revisão

Os padrões visuais implementados correspondem ao resto do plugin:
-Medusa`DataTable`
- `StatusBadge`
- detalhar seções `Container`
- Gavetas para decisões
- solicita ações arriscadas

Arquivos de rota implementados:
- `src/admin/routes/subscriptions/renewals/page.tsx`
- `src/admin/routes/subscriptions/renewals/[id]/page.tsx`

## Documentos Relacionados

- [Arquitetura de renovações](../architecture/renewals.md)
- [API de renovações de administrador](../api/admin-renewals.md)
- [Teste de renovações](../testing/renewals.md)
- [Especificações de renovações](../specs/renewals/admin-spec.md)
