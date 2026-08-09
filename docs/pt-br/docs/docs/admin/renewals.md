# Interface do administrador: Renovações

Este documento descreve a interface de usuário administrativa implementada para a área `Renovações` no plug-in `Reorder`.

Ele se concentra no comportamento das telas, nos fluxos de usuários, nas ações e no gerenciamento do estado da interface do usuário.

## Objetivo

A interface de usuário administrativa “Renovações” oferece aos operadores um espaço de trabalho dedicado para:
- visualizar os ciclos de renovação programados e com falha;
- verificar o histórico de execução e os registros vinculados;
- analisar as alterações pendentes e o status de aprovação;
- forçar manualmente uma renovação;
- aprovar ou rejeitar alterações pendentes antes da renovação

A interface do usuário foi implementada como rotas personalizadas do Medusa Admin e segue os padrões do painel do Medusa da forma mais fiel possível.

## Mapa da rota

Rotas implementadas:
- `/app/subscriptions/renewals`
- `/app/subscriptions/renewals/:id`

Comportamento de navegação:
- a página de renovações está aninhada em `Assinaturas`
- clicar em uma linha na fila de renovações leva à página de detalhes do ciclo
- a rota de detalhes exibe uma trilha de navegação de volta à fila de renovações

## 1. Página da fila

### Objetivo

A página da fila apresenta uma visão geral operacional dos ciclos de renovação.

É implementado com o `DataTable` do Medusa.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas da lista
- DataTable da fila de renovações
- paginação
- campos de entrada dedicados para datas programadas

### Colunas

Atualmente, a fila exibe:
- `Agendado`
- `Assinatura`
- `Status`
- `Aprovação`
- `Última tentativa`

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

A fila utiliza o padrão de interação padrão do Medusa, `Adicionar filtro`.

Filtros implementados:
- `Status`
- `Aprovação`
- `Última tentativa`

A página também apresenta campos de data específicos para:
- `Programado de`
- `Programado até`

Esses campos de entrada de data:
- são aplicados como filtros de lista
- são inicializados ao carregar a página com os valores `hoje - 30 dias 00:00` e `hoje + 30 dias 00:00`
- não são exibidos intencionalmente como ícones de filtro na barra de ferramentas

Os filtros que não são de data aplicados são exibidos como ícones na barra de ferramentas e podem ser removidos individualmente.

A lista também exibe a opção `Limpar tudo` quando algum filtro estiver ativo.

### Classificação

A fila utiliza o menu de classificação padrão da barra de ferramentas.

Ele oferece suporte à ordenação por campos expostos pela camada de consulta do backend, incluindo:
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
- `Visão geral do ciclo`
- `Resumo de aprovações`
- `Resumo da assinatura`
- `Resumo dos pedidos gerados`
- `Alterações pendentes`
- `Histórico de tentativas`
- `Metadados técnicos`

Essas seções são voltadas para a leitura e foram elaboradas para uma rápida inspeção pelo operador.

Layout:
- a coluna da esquerda contém `Visão geral do ciclo`, `Resumo de aprovações`, `Alterações pendentes`, `Histórico de tentativas` e `Metadados técnicos`
- a coluna da direita contém `Resumo da assinatura` e `Resumo dos pedidos gerados` como cartões interligados no estilo Medusa

## 3. Ações detalhadas

### Menu de ações

O menu de ações da página de detalhes inclui:
- `Forçar renovação`
- `Aprovar alterações`
- `Rejeitar alterações`

### Disponibilidade da ação

Regras de ação atuais na interface do usuário:

- `Forçar renovação`
  Disponível quando o status do ciclo é `programado` ou `falha`.
- `Aprovar alterações`
  Disponível apenas quando a aprovação é necessária e o status da aprovação é `pendente`.
- `Rejeitar alterações`
  Disponível apenas quando a aprovação é necessária e o status da aprovação é `pendente`.

As ações ficam desativadas enquanto uma mutação estiver pendente.

## 4. Gavetas e fluxos de confirmação

A página de detalhes utiliza menus deslizantes para decisões de aprovação e solicitações de confirmação para ações de risco.

Isso segue o padrão Medusa, que consiste em manter os fluxos de edição ou decisão em “Drawers”, em vez de diretamente no código.

### Aprovar gaveta de alterações

Objetivo:
- registrar a decisão de aprovação para alterações pendentes

Campos:
- opcional `motivo`

Comportamento:
- a gaveta abre no menu de ação
- submit mostra um prompt de confirmação final
- os erros são exibidos em linha na gaveta e por meio de feedback do brinde
- a gaveta usa dados detalhados existentes e estado do formulário local em vez de uma consulta de exibição remota separada

### Gaveta de alterações rejeitadas

Objetivo:
- registrar a decisão de rejeição para alterações pendentes

Campos:
- `motivo` obrigatório

Comportamento:
- a gaveta abre no menu de ação
- `razão` é obrigatório antes do envio
- submit mostra um prompt de confirmação final
- os erros são exibidos em linha na gaveta e por meio de feedback do brinde
- a gaveta usa dados detalhados existentes e estado do formulário local em vez de uma consulta de exibição remota separada

### Forçar confirmação de renovação

Objetivo:
- proteger a execução manual de um ciclo de renovação

Comportamento:
- a ação abre um prompt de confirmação antes da mutação
- a ação é desativada enquanto a mutação estiver pendente

## 5. Carregamento de dados

A interface de administração `Renewals` segue o padrão de consulta de exibição Medusa.

Comportamento implementado:
- a consulta de exibição da fila é carregada na montagem
- a consulta de exibição de detalhes é carregada na montagem
- o estado da gaveta não controla a consulta de exibição principal
- mutações bem-sucedidas invalidam consultas de lista e detalhes

As gavetas de aprovação não possuem consultas de exibição remota separadas porque operam em:
- estado do formulário local
- dados já presentes na carga detalhada

Detalhe de implementação:
- o carregamento de dados reside em `src/admin/routes/subscriptions/renewals/data-loading.ts`
- ações bem-sucedidas usam invalidação compartilhada para atualizar o estado da fila e dos detalhes

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
- sem alterações pendentes
- sem tentativas
- sem metadados
- nenhum pedido gerado

Isso evita lacunas vazias nas telas operacionais.

## 7. Notas de experiência do usuário

A UI atual mantém intencionalmente `Renovações` como uma página operacional em `Assinaturas`, semelhante a `Planos e Ofertas`.

Isso mantém a navegação do plugin estruturada em torno de:
- assinaturas como área pai operacional
- renovações como fila e subárea de revisão

Os padrões visuais implementados correspondem ao resto do plugin:
- Medusa `DataTable`
- `StatusBadge`
- detalhar as seções do `Container`
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
