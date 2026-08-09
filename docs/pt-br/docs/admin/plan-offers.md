# UI do administrador: planos e ofertas

Este documento descreve a UI Admin implementada para a área `Plans & Offers` no plugin `Reorder`.

Ele se concentra no comportamento da tela, nos fluxos do usuário, nas ações, no carregamento de dados e no tratamento do estado da IU.

## Propósito

A UI Admin `Plans & Offers` oferece aos operadores um espaço de trabalho dedicado para:
- navegue nas configurações de oferta de assinatura existentes
- inspecionar o comportamento eficaz da configuração
- criar ofertas em nível de produto e em nível de variante
- editar a configuração da oferta existente
- ativar ou desativar ofertas

A UI é implementada como uma rota personalizada do Medusa Admin e segue os padrões do painel do Medusa o mais próximo possível.

## Mapa de rotas

Rota implementada:
- `/subscriptions/plans-offers`

Comportamento de navegação:
- a rota está registrada como uma página aninhada em `Subscriptions`
- a página inclui uma ação secundária com link para `Subscriptions`
- não existe uma rota detalhada separada para uma oferta
- a edição acontece no local por meio de uma gaveta em vez da navegação para outra página

## 1. Página da lista

### Propósito

A página é a visualização operacional e de configuração das ofertas de assinatura.

É implementado com Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- ações da barra de ferramentas
- planeja e oferece DataTable
- paginação
- modais de seleção de produtos e variantes
- criar modais
- editar gaveta

### Ações de cabeçalho

O cabeçalho da página inclui:
- `View Subscriptions`
- `Create`

`View Subscriptions` é uma ação de navegação secundária.

`Create` abre o fluxo de criação em um `FocusModal`.

## 2. Página da lista

### Finalidade da Tabela

A tabela é a visão geral principal de todas as ofertas configuradas.

Destina-se a:
- comparar ofertas em nível de produto e em nível de variante
- encontrar configurações desabilitadas ou incompatíveis
- abrindo fluxos de edição rapidamente
- inspecionar qual registro de origem está atualmente em vigor

### Colunas

A tabela exibe atualmente:
- `Name`
- `Target`
- `Status`
- `Frequencies`
- `Effective source`
- `Updated`
- menu de ação de linha

A renderização da coluna segue padrões compactos no estilo Medusa:
- valor primário na primeira linha
- apoiar o contexto em texto sutil na segunda linha, quando útil

### Coluna de origem efetiva

A coluna `Effective source` é um resumo orientado para leitura.

Mostra se a configuração vencedora atual é:
- `Product`
- `Variant`
- `Inactive`

Isso é útil quando um registro de origem está desabilitado, mas ainda tem um substituto no nível do produto ou quando não existe nenhuma oferta ativa para o contexto de destino.

## 3. Pesquisa, filtros e classificação

### Procurar

A página inclui uma entrada de pesquisa DataTable no canto superior direito.

A pesquisa destina-se a pesquisas amplas e atualmente abrange:
- nome da oferta
- título do produto
- título da variante
-SKU

### Filtros

A lista usa o padrão de interação Medusa `Add filter`.

Filtros implementados:
- `Status`
- `Scope`
- `Frequency`
- `Discount range`
- `Product`
- `Variant`

Os filtros aplicados são mostrados como chips de filtro removíveis na barra de ferramentas.

A página também expõe `Clear all` quando qualquer filtro está ativo.

### Filtros de produtos e variantes

Os filtros de produtos e variantes não usam correspondência de texto livre fraca.

Em vez disso:
- `Product` abre um modal seletor com pesquisa e paginação
- `Variant` abre um seletor de variante com escopo para o produto selecionado

Isso segue o padrão Medusa de usar seleção estruturada para conjuntos de dados maiores.

### Classificação

A lista usa o menu de classificação padrão do DataTable.

Ele oferece suporte à classificação de campos expostos pela camada de consulta de back-end, incluindo:
- `Name`
- `Status`
- `Product`
- `Updated`

## 4. Ações de linha

Cada linha expõe um menu de ação final.

Ações de linha implementadas:
- `Edit`
- `Enable`
- `Disable`

### Editar

`Edit` abre a oferta existente em uma gaveta.

### Alternar

`Enable` e `Disable` são ações operacionais de caráter destrutivo, protegidas por uma solicitação de confirmação.

Antes que a mutação seja executada, o usuário deve confirmar a ação.

Enquanto a mutação estiver pendente:
- o rótulo da ação da linha afetada muda para `Enabling...` ou `Disabling...`
- ações repetidas na mesma linha são bloqueadas

## 5. Criar fluxo

O fluxo de criação utiliza um `FocusModal`.

Isso segue o padrão Medusa para a criação de novas entidades.

### Objetivo

O fluxo de criação é usado para definir uma nova oferta de origem para:
- um produto
- uma variante específica

### Seções principais

Atualmente, o modal suporta:
- `Name`
- `Scope`
- `Product`
- `Variant` (opcional)
- `Offer enabled`
- `Frequencies`
- `Rules`

### Frequências e descontos

O formulário de criação suporta várias linhas de frequência.

Cada linha pode definir:
- intervalo de frequência
- valor da frequência
- desconto opcional
- tipo de desconto
- valor do desconto

O usuário pode:
- adicionar linhas
- remover linhas com confirmação

### Seção de Regras

A área de regras oferece suporte a:
- número mínimo de ciclos
- versão de avaliação ativada/desativada
- dias de avaliação
- política de acumulação

A validação do lado do cliente garante a consistência das regras antes do envio.

### Comportamento do modal

O modal de criação:
- reinicializa o estado do formulário ao ser fechado
- mantém a seleção do produto e da variante separada da consulta de exibição principal
- desativa o envio enquanto a mutação estiver pendente
- exibe mensagens de sucesso e erro por meio de notificações pop-up

## 6. Fluxo de edição

O fluxo de edição utiliza um `Drawer`.

Isso segue o padrão do Medusa para a edição de entidades existentes.

### Objetivo

A guia “Drawer” é usada para atualizar um registro de origem existente sem sair da página de lista.

### O que pode ser editado

O fluxo de edição oferece suporte a:
- nome
- estado ativado
- frequências
- descontos
- regras

O destino em si é somente leitura na gaveta.

Isso significa:
- o contexto do produto e da variante é exibido
- a retargeting de produto/variante não faz parte do fluxo de edição

### Comportamento da gaveta

A gaveta:
- busca dados detalhados somente quando abertos
- preenche previamente o formulário a partir do registro de origem atual
- mostra o estado de carregamento embutido enquanto a consulta detalhada é resolvida
- mostra o estado de erro embutido por meio de `Alert` se o carregamento de detalhes falhar
- invalida as consultas de exibição e de detalhes após um salvamento bem-sucedido

## 7. UX de seleção de produtos e variantes

A página usa fluxos de seleção dedicados em vez de entradas de texto de formato livre.

### Seletor de produtos

O seletor de produtos:
- usa um `FocusModal`
- exibe um DataTable selecionável
- suporta pesquisa
- suporta paginação
- aplica um único produto selecionado de volta ao fluxo ativo

### Seletor de variantes

O seletor de variantes:
- usa um `FocusModal`
- carrega variantes apenas para o produto selecionado
- mostra um DataTable compacto
- permite a seleção de uma variante por vez

### Por que a seleção estruturada é usada

Este padrão é preferido porque:
- produtos e variantes não são pequenos conjuntos de opções estáticas
- IDs e títulos devem vir de dados reais do administrador
- a UX permanece alinhada com a abordagem da Medusa para selecionar entidades de conjuntos de dados maiores

## 8. Estados de carregamento, vazio e erro

A IU segue o tratamento de estado no estilo Medusa.

### Página da lista

Comportamento da lista:
- O carregamento do DataTable é orientado pela consulta de exibição
- falhas de carregamento no nível da rota são renderizadas por meio de um `Alert` embutido
- a tabela fornece dois estados vazios:
- `No plan offers yet`
- `No matching plan offers`

Isso mantém as mensagens vazias e vazias filtradas distintas, preservando o shell da página.

### Gavetas e modais

Comportamento modal e de gaveta:
- o modal de criação mantém seu próprio estado pendente e de validação
- a gaveta de edição fornece um estado de carregamento local
- a gaveta de edição fornece um estado de erro local

Esses estados não bloqueiam a página da lista principal.

## 9. Carregamento de dados e invalidação de consulta

A página segue o padrão de carregamento de dados do painel Medusa.

### Exibir consulta

A consulta de exibição da lista:
- cargas na montagem
- não está condicionalmente vinculado ao estado modal ou gaveta
- usa `sdk.client.fetch()` na rota administrativa personalizada
- usa `keepPreviousData` para paginação mais suave e alterações de filtragem

### Consultas de interação

Os dados modais e de gaveta são separados por responsabilidade:
- a consulta de seleção de produtos é carregada somente quando o seletor de produtos está aberto
- a consulta de seleção de variante é carregada somente quando o seletor de variante está aberto
- a consulta detalhada é carregada somente quando a gaveta de edição está aberta

Essa separação evita o acoplamento da renderização da página principal a dados somente modais.

### Estratégia de invalidação

Após criação, atualização ou alternância bem-sucedida:
- a consulta da lista de planos e ofertas é invalidada
- a consulta detalhada relevante é invalidada quando aplicável

Isso garante:
- a tabela é atualizada após mutações
- a gaveta de edição permanece consistente após salvar

## 10. Convenções UI e UX

A página segue as convenções estabelecidas do painel Medusa.

### Componentes

A implementação usa blocos de construção da UI Medusa, como:
- `Container`
- `DataTable`
- `FocusModal`
- `Drawer`
- `Alert`
- `StatusBadge`
- `Text`
- `Button`

### Modelo de interação

A IU separa intencionalmente:
- criar fluxos para novas entidades
- editar fluxos para entidades existentes
- exibir consultas de consultas somente modais
- ações rápidas de edição baseada em formulário

### Botões e padrões de status

A página segue o tratamento de ação no estilo Medusa:
- pequenos botões de ação
- brindes semânticos de sucesso e erro
- avisos de confirmação para ações arriscadas
- status mostrado através de `StatusBadge`

### Estilo de layout

A página segue a mesma abordagem prática de layout de administração da Medusa usada em outras partes do plugin:
- cabeçalho e descrição no topo
- barra de ferramentas com filtros, pesquisa e classificação
- DataTable como principal superfície operacional

## Documentos Relacionados

- [Visão geral dos documentos](../README.md)
- [Arquitetura de Planos e Ofertas](../architecture/plan-offers.md)
- [API de administração de planos e ofertas](../api/admin-plan-offers.md)
- [Teste de planos e ofertas](../testing/plan-offers.md)
- [Roteiro](../roadmap/implementation-plan.md)
