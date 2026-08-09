# Interface de usuário administrativa: Assinaturas

Este documento descreve a interface de usuário administrativa implementada para a área `Subscriptions` no plug-in `Reorder`.

Ele se concentra no comportamento das telas, nos fluxos de usuários, nas ações e no gerenciamento do estado da interface do usuário.

## Objetivo

A interface de usuário administrativa `Subscriptions` oferece aos operadores um espaço de trabalho dedicado para:
- visualizar assinaturas;
- verificar os detalhes das assinaturas;
- realizar ações relacionadas ao ciclo de vida operacional;
- programar alterações futuras nos planos;
- editar o endereço de entrega da assinatura

A interface do usuário foi implementada como rotas personalizadas do Medusa Admin e segue os padrões do painel do Medusa da forma mais fiel possível.

## Mapa da rota

Rotas implementadas:
- `/app/subscriptions`
- `/app/subscriptions/:id`

Rotas relacionadas a operações recorrentes no mesmo grupo de navegação:
- `/app/subscriptions/renewals`
- `/app/subscriptions/dunning`
- `/app/subscriptions/cancellations`

Personalização relacionada à página de administração integrada:
- `Order detail` exibe um widget `Subscription` deste plugin

Comportamento de navegação:
- a rota da lista está disponível como uma página na barra lateral
- clicar em uma linha da lista leva à rota de detalhes
- a rota de detalhes exibe uma trilha de navegação de volta à lista

Limitação atual:
- nas rotas detalhadas dinâmicas deste grupo de navegação personalizado, o estado ativo da barra lateral volta a ser `Subscriptions`

## 1. Página de lista

### Objetivo

A página da lista é a visão geral operacional de todas as assinaturas.

É implementado com o Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas de lista
- DataTable de assinaturas
- paginação

### Colunas

Atualmente, a lista exibe:
- `Reference`
- `Product`
- `Status`
- `Frequency`
- `Next renewal`
- menu de ações da linha

A exibição das colunas utiliza células compactas no estilo Medusa:
- valor principal na primeira linha
- valor complementar em texto discreto na segunda linha, quando aplicável

### Pesquisar

A lista possui um campo de pesquisa na área superior direita da barra de ferramentas.

A função de pesquisa destina-se a buscas gerais e, atualmente, abrange:
- referência da assinatura
- nome do cliente
- e-mail do cliente
- título do produto
- título da variante
- SKU

### Filtros

A lista utiliza o padrão de interação padrão do Medusa, `Add filter`.

Filtros implementados:
- `Status`
- `Trial`
- `Skip next cycle`
- `Next renewal`

Os filtros aplicados são exibidos como ícones na barra de ferramentas e podem ser removidos individualmente.

A lista também expõe `Clear all` quando qualquer filtro está ativo.

### Classificação

A lista utiliza o menu de classificação padrão da barra de ferramentas.

Ele suporta a classificação por campos expostos pela camada de consulta do backend, incluindo:
- `Status`
- `Product`
- `Next renewal`
- `Updated` como uma chave de classificação técnica do backend, mesmo que não seja exibida como uma coluna visível

### Ações na linha

Cada linha exibe um menu de ações na parte inferior.

Ações da lista implementadas:
- `Pause`
- `Resume`
- `Cancel`

A disponibilidade das ações depende do status da assinatura:
- `active` -> `Pause`, `Cancel`
- `paused` -> `Resume`, `Cancel`
- `cancelled` -> não há mais ações de mutação do ciclo de vida

### Navegação por linhas

Ao clicar em uma linha, a página de detalhes dessa assinatura é aberta.

O menu de ações da linha não aciona a navegação.

## 2. Página de detalhes

### Objetivo

A página de detalhes é a tela operacional principal de uma única assinatura.

Ele combina:
- visibilidade do status
- ações do ciclo de vida
- dados de assinatura somente para leitura
- painéis de edição para fluxos de mutação compatíveis

### Cabeçalho

O cabeçalho de detalhes contém:
- referência da assinatura
- breve descrição
- indicador de status
- menu de ações

Isso segue o padrão Medusa, com o título à esquerda e o status e as ações à direita.

### Seções principais

Atualmente, a página de detalhes exibe:
- `Subscription`
- `Customer`
- `Product`
- `Shipping address`
- `Pending plan change`
- `Activity Log`

Essas seções são voltadas para a leitura e foram elaboradas para uma rápida inspeção pelo operador.

A seção `Product` utiliza um cartão vinculado no estilo Medusa que abre a página padrão de detalhes da variante do produto.
`SKU` permanece visível como um campo auxiliar separado abaixo do cartão.

Regra atual de resolução de dados:
- Os dados exibidos em `Customer` e `Product` são resolvidos em tempo real a partir dos registros vinculados do Medusa, quando disponíveis
- quando os registros vinculados não estiverem disponíveis, a interface do usuário recorre aos instantâneos de assinatura armazenados

### Widget de detalhes do pedido

O plugin também amplia a página padrão `Order detail` do Medusa.

O widget `Subscription` exibe:
- `Subscription order` com um cartão de assinatura vinculado quando o pedido estiver vinculado a uma assinatura
- o valor do desconto da assinatura atual, derivado de `pricing_snapshot`
- a data prevista para a próxima renovação
- `One-time order` quando não houver nenhum link `subscription_order`

## 3. Ações detalhadas

### Menu de ações

O menu de ações da página de detalhes inclui:
- `Pause`
- `Resume`
- `Schedule plan change`
- `Edit shipping address`
- `Cancel`

A disponibilidade das ações segue as mesmas regras de estado da lista, quando aplicável.

### Por que o `Schedule plan change` só aparece na seção “Detalhes”

`Schedule plan change` é exibido intencionalmente na página de detalhes, e não no menu da linha da lista.

Motivo:
- trata-se de um fluxo de edição com um formulário
- requer mais contexto do que uma ação leve em uma linha
- o padrão Medusa consiste em manter os fluxos do tipo edição nas páginas de detalhes e nos Drawers, em vez de inseri-los na lista quando não se trata de ações verdadeiramente rápidas

## 4. Gavetas

A página de detalhes utiliza o recurso “Drawers” para editar os dados das assinaturas existentes.

Isso segue o padrão Medusa para fluxos de edição.

### Gaveta de alteração do plano de programação

Objetivo:
- agendar um plano futuro ou uma atualização de cadência

Campos:
- variante
- intervalo de frequência
- valor de frequência
- em vigor a partir de

Comportamento:
- as variantes são carregadas somente quando a gaveta é aberta
- o formulário é pré-preenchido com os valores da assinatura atual ou com os dados do plano pendente
- a opção “Salvar” fica desativada durante o carregamento ou quando os dados necessários das variantes não estão disponíveis

### Painel “Editar endereço de entrega”

Objetivo:
- atualizar o registro do endereço de entrega atribuído à assinatura

Campos:
- nome
- sobrenome
- empresa
- endereço, linha 1
- endereço, linha 2
- cidade
- CEP
- província / estado
- código do país
- telefone

Comportamento:
- o menu lateral é preenchido automaticamente com o endereço de entrega da assinatura atual
- o formulário valida os campos obrigatórios antes do envio
- a ação de salvar é exibida no formulário padrão do rodapé do Medusa Drawer
- o evento resultante no registro de atividades armazena diferenças de endereço legíveis, como `Address: old -> new`

## 5. Seção de Registro de Atividades

A página de detalhes inclui uma seção específica, `Activity Log`, para uma assinatura.

Ela é implementada como uma visualização de auditoria baseada em tabela e segue o mesmo padrão de lista no estilo Medusa utilizado em todo o plug-in:
- linhas compactas da tabela
- classificação
- filtragem
- paginação
- detalhes do evento exibidos em uma gaveta

Atualmente, a seção:
- não exibe um campo de pesquisa
- permite a classificação por meio do menu de classificação
- suporta `Add filter` para filtros de domínio, agente e data opcional
- exibe os campos de entrada `Created from` e `Created to` somente após esses filtros serem adicionados pelo menu
- abre a gaveta de eventos quando uma linha é clicada
- exibe `Actor` como o valor de exibição resolvido, normalmente o e-mail do administrador
- exibe `Event` sem um subtítulo de domínio secundário na célula da tabela
- exibe `Summary` usando rótulos voltados para o operador, em vez de nomes de campos internos brutos, como `pending_update_data`

## 6. Regras de ação por status

Regras atuais do ciclo de vida na interface do usuário:

- `active`
  - pode pausar
  - pode cancelar
  - pode agendar uma mudança de plano
  - pode editar o endereço de entrega

- `paused`
  - pode retomar
  - pode cancelar
  - pode agendar uma mudança de plano
  - pode editar o endereço de entrega

- `past_due`
  - é possível agendar uma alteração no plano
  - é possível editar o endereço de entrega
  - o cancelamento continua disponível na página de detalhes, desde que permitido pelas regras do backend

- `cancelled`
  - não há outras transições no ciclo de vida
  - a visualização de detalhes somente para leitura continua disponível

## 7. Estados de carregamento, vazio e de erro

A interface do usuário segue o modelo de gerenciamento de estados do Medusa.

### Página de lista

Comportamento da lista:
- O carregamento da DataTable é controlado pela consulta de exibição
- Os estados vazios filtrados são exibidos pela tabela
- Falhas de carregamento no nível da rota são exibidas como `Alert` embutido

### Página de detalhes

Comportamento dos detalhes:
- o carregamento no nível da página utiliza `Spinner` e um texto sutil indicando carregamento
- os erros no nível da página são exibidos inline por meio de `Alert`
- existe um estado de aviso preventivo caso os dados detalhados não estejam disponíveis

### Gavetas

Comportamento da gaveta:
- a gaveta de alteração de plano exibe um indicador de carregamento enquanto carrega as variantes
- erros específicos da gaveta são exibidos diretamente no texto como `Alert`
- quando não há variantes disponíveis, o usuário vê um estado vazio e claro e não pode salvar

## 8. Retroalimentação de mutações

A interface do usuário fornece feedback imediato após as alterações.

Comportamento implementado:
- solicitações de confirmação para ações destrutivas do ciclo de vida
- ações desativadas enquanto uma mutação estiver pendente
- notificações de sucesso após uma mutação bem-sucedida
- notificações de erro quando uma mutação falha
- invalidação da consulta tanto para a visualização em lista quanto para a visualização detalhada após o sucesso da mutação

## 9. Decisões de experiência do usuário

### Responsabilidades gerais vs. responsabilidades específicas

A lista foi projetada para:
- descoberta
- pesquisa
- filtragem
- classificação
- ações rápidas relacionadas ao ciclo de vida

A página de detalhes foi projetada para:
- inspeção
- edições por meio de formulários
- ações com forte contexto

### Por que os seletores “Cliente” e “Produto” ainda não são seletores separados `Add filter`

Atualmente, a lista utiliza a função de pesquisa para localizar clientes e produtos, em vez de filtros de seleção específicos.

Motivo:
- o contrato de backend atual espera `customer_id` e `product_id`
- adicionar pseudo-filtros baseados em texto prejudicaria a experiência do usuário (UX)
- uma implementação adequada no estilo Medusa exigiria seletores de entidade dedicados

## 10. Fluxos de usuários testados

A interface do usuário implementada é suportada pela cobertura de integração do fluxo de administração subjacente:
- listar assinaturas
- abrir detalhes
- pausar
- retomar
- agendar alteração de plano
- editar endereço de entrega
- cancelar

Atualmente, a interface do usuário do navegador em si não é suportada pelo Playwright.

O projeto atual conta com testes de integração HTTP baseados no Medusa para a validação do fluxo de back-end de ponta a ponta.

## 11. Limite com cancelamento e retenção

A área de administração `Subscriptions` ainda possui ações diretas relacionadas ao ciclo de vida, tais como:
- pausar
- retomar
- cancelar

Ao mesmo tempo, o gerenciamento de cancelamentos agora conta com seu próprio espaço de trabalho dedicado em `Subscriptions`:
- `Cancellation & Retention`

Isso significa que:
- as operações diretas do ciclo de vida da assinatura continuam disponíveis na página de detalhes da assinatura
- as recomendações de retenção, as ofertas de retenção, a análise de casos de cancelamento e os fluxos de operadores específicos para casos de cancelamento agora estão no espaço de trabalho dedicado ao cancelamento
