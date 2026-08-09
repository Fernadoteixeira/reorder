# Interface do administrador: Planos e ofertas

Este documento descreve a interface de usuário administrativa implementada para a área `Planos e Ofertas` no plug-in `Reorder`.

Ele se concentra no comportamento das telas, nos fluxos de usuários, nas ações, no carregamento de dados e no gerenciamento do estado da interface do usuário.

## Objetivo

A interface de usuário de administração “Planos e Ofertas” oferece às operadoras um espaço de trabalho dedicado para:
- consultar as configurações das ofertas de assinatura existentes
- verificar o comportamento das configurações em vigor
- criar ofertas no nível do produto e no nível da variante
- editar configurações de ofertas existentes
- ativar ou desativar ofertas

A interface do usuário foi implementada como uma rota personalizada do Medusa Admin e segue os padrões do painel do Medusa da forma mais fiel possível.

## Mapa da rota

Rota implementada:
- `/subscriptions/plans-offers`

Comportamento de navegação:
- a rota é registrada como uma página aninhada em `Assinaturas`
- a página inclui uma ação secundária que redireciona para `Assinaturas`
- não há uma rota de detalhes separada para uma oferta
- a edição é feita no próprio local, por meio de um Drawer, em vez de navegar para outra página

## 1. Página de lista

### Objetivo

Esta página apresenta a visualização operacional e de configuração das ofertas de assinatura.

É implementado com o `DataTable` do Medusa.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- ações da barra de ferramentas
- tabela de dados com planos e ofertas
- paginação
- modais de seleção de produtos e variantes
- modal de criação
- menu lateral de edição

### Ações do cabeçalho

O cabeçalho da página inclui:
- `Ver assinaturas`
- `Criar`

“Ver assinaturas” é uma ação da navegação secundária.

`Criar` abre o fluxo de criação em um `FocusModal`.

## 2. Página de lista

### Objetivo da tabela

A tabela apresenta uma visão geral de todas as ofertas configuradas.

Destina-se a:
- comparar ofertas no nível do produto e no nível da variante
- identificar configurações desativadas ou incompatíveis
- abrir fluxos de edição rapidamente
- verificar qual registro de origem está em vigor no momento

### Colunas

Atualmente, a tabela exibe:
- `Nome`
- `Destino`
- `Status`
- `Frequências`
- `Fonte efetiva`
- `Atualizado`
- menu de ações da linha

A apresentação das colunas segue padrões compactos no estilo Medusa:
- valor principal na primeira linha
- contexto complementar em texto discreto na segunda linha, quando for relevante

### Coluna “Fonte efetiva”

A coluna “Fonte efetiva” é um resumo voltado para a leitura.

Mostra se a configuração vencedora atual é:
- `Produto`
- `Variante`
- `Inativo`

Isso é útil quando um registro de origem está desativado, mas ainda possui um plano alternativo no nível do produto, ou quando não há nenhuma oferta ativa para o contexto de destino.

## 3. Pesquisa, filtros e ordenação

### Pesquisar

A página inclui um campo de pesquisa do DataTable no canto superior direito.

A função de pesquisa destina-se a pesquisas gerais e, atualmente, abrange:
- nome da oferta
- título do produto
- título da variante
- SKU

### Filtros

A lista utiliza o padrão de interação “Adicionar filtro” do Medusa.

Filtros implementados:
- `Status`
- `Escopo`
- `Frequência`
- `Faixa de desconto`
- `Produto`
- `Variante`

Os filtros aplicados são exibidos como ícones de filtro removíveis na barra de ferramentas.

A página também exibe a opção `Limpar tudo` quando algum filtro estiver ativo.

### Filtros de produtos e variantes

Os filtros de produtos e variantes não utilizam a correspondência fraca de texto livre.

Em vez disso:
- `Product` abre um modal de seleção com pesquisa e paginação
- `Variant` abre um seletor de variantes restrito ao produto selecionado

Isso segue o padrão do Medusa, que utiliza seleção estruturada para conjuntos de dados maiores.

### Classificação

A lista utiliza o menu padrão de classificação do DataTable.

Ele oferece suporte à ordenação por campos expostos pela camada de consulta do backend, incluindo:
- `Name`
- `Status`
- `Product`
- `Updated`

## 4. Ações na linha

Cada linha exibe um menu de ações na parte inferior.

Ações implementadas nas linhas:
- `Editar`
- `Ativar`
- `Desativar`

### Editar

`Editar` abre a oferta existente em uma janela deslizante.

### Alternar

`Ativar` e `Desativar` são ações operacionais de caráter destrutivo, protegidas por uma solicitação de confirmação.

Antes que a mutação seja executada, o usuário deve confirmar a ação.

Enquanto a mutação estiver pendente:
- o rótulo da ação da linha afetada muda para `Ativando...` ou `Desativando...`
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
- `Nome`
- `Escopo`
- `Produto`
- `Variante` (opcional)
- `Oferta ativada`
- `Frequências`
- `Regras`

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
- exibe feedback de sucesso e erro por meio de mensagens pop-up

## 6. Fluxo de edição

O fluxo de edição utiliza um `Drawer`.

Isso segue o padrão do Medusa para a edição de entidades existentes.

### Objetivo

A guia “Drawer” é usada para atualizar um registro de origem existente sem sair da página da lista.

### O que pode ser editado

O fluxo de edição oferece suporte a:
- nome
- estado ativado
- frequências
- descontos
- regras

O próprio destino é somente para leitura no Drawer.

Isso significa que:
- o contexto do produto e da variante é exibido
- o redirecionamento por produto/variante não faz parte do fluxo de edição

### Comportamento da gaveta

A Gaveta:
- busca os dados detalhados somente quando aberta
- preenche previamente o formulário com os dados do registro de origem atual
- exibe o status de carregamento diretamente no formulário enquanto a consulta de detalhes é processada
- exibe o status de erro diretamente no formulário por meio de `Alert` caso o carregamento dos detalhes falhe
- invalida tanto a consulta de exibição quanto a de detalhes após um salvamento bem-sucedido

## 7. Experiência do usuário na seleção de produtos e variantes

A página utiliza fluxos de seleção específicos em vez de campos de texto de preenchimento livre.

### Seletor de produtos

O seletor de produtos:
- utiliza um `FocusModal`
- exibe uma DataTable selecionável
- oferece suporte à pesquisa
- oferece suporte à paginação
- reincorpora o único produto selecionado ao fluxo ativo

### Seletor de variantes

O seletor de variantes:
- utiliza um `FocusModal`
- carrega variantes apenas para o produto selecionado
- exibe uma DataTable compacta
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
- falhas de carregamento no nível da rota são renderizadas por meio de um `Alert` in-line
- a tabela fornece dois estados vazios:
- `Nenhuma oferta de plano ainda`
- `Nenhuma oferta de plano correspondente`

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
- usa `sdk.client.fetch()` na rota Admin personalizada
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
- `Contêiner`
- `DataTable`
- `FocusModal`
- `Gaveta`
- `Alerta`
- `StatusBadge`
- `Texto`
- `Botão`

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
