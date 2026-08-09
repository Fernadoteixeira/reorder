# Interface do administrador: Planos e ofertas

Este documento descreve a interface de usuário administrativa implementada para a área `Plans & Offers` no plug-in `Reorder`.

Ele se concentra no comportamento das telas, nos fluxos de usuários, nas ações, no carregamento de dados e no gerenciamento do estado da interface do usuário.

## Objetivo

A interface de usuário administrativa `Plans & Offers` oferece aos operadores um espaço de trabalho dedicado para:
- consultar as configurações existentes de ofertas de assinatura
- verificar o comportamento efetivo das configurações
- criar ofertas no nível do produto e no nível da variante
- editar configurações de ofertas existentes
- ativar ou desativar ofertas

A interface do usuário foi implementada como uma rota personalizada do Medusa Admin e segue os padrões do painel do Medusa da forma mais fiel possível.

## Mapa da rota

Rota implementada:
- `/subscriptions/plans-offers`

Comportamento de navegação:
- a rota é registrada como uma página aninhada em `Subscriptions`
- a página inclui uma ação secundária que redireciona para `Subscriptions`
- não há uma rota de detalhes separada para uma oferta
- a edição é feita no próprio local, por meio de um Drawer, em vez de navegar para outra página

## 1. Página de lista

### Objetivo

Esta página apresenta a visualização operacional e de configuração das ofertas de assinatura.

É implementado com o Medusa `DataTable`.

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
- `View Subscriptions`
- `Create`

`View Subscriptions` é uma ação de navegação secundária.

`Create` abre o fluxo de criação em um `FocusModal`.

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
- `Name`
- `Target`
- `Status`
- `Frequencies`
- `Effective source`
- `Updated`
- menu de ações da linha

A apresentação das colunas segue padrões compactos no estilo Medusa:
- valor principal na primeira linha
- contexto complementar em texto discreto na segunda linha, quando for relevante

### Coluna “Fonte efetiva”

A coluna `Effective source` é um resumo voltado para a leitura.

Mostra se a configuração vencedora atual é:
- `Product`
- `Variant`
- `Inactive`

Isso é útil quando um registro de origem está desativado, mas ainda possui uma opção alternativa no nível do produto, ou quando não há nenhuma oferta ativa para o contexto de destino.

## 3. Pesquisa, filtros e ordenação

### Pesquisar

A página inclui um campo de pesquisa do DataTable no canto superior direito.

A função de pesquisa destina-se a pesquisas gerais e, atualmente, abrange:
- nome da oferta
- título do produto
- título da variante
- SKU

### Filtros

A lista utiliza o padrão de interação padrão do Medusa, `Add filter`.

Filtros implementados:
- `Status`
- `Scope`
- `Frequency`
- `Discount range`
- `Product`
- `Variant`

Os filtros aplicados são exibidos como ícones de filtro removíveis na barra de ferramentas.

A página também expõe `Clear all` quando qualquer filtro está ativo.

### Filtros de produtos e variantes

Os filtros de produtos e variantes não utilizam a correspondência fraca de texto livre.

Em vez disso:
- `Product` abre um modal de seleção com pesquisa e paginação
- `Variant` abre um seletor de variantes restrito ao produto selecionado

Isso segue o padrão do Medusa, que utiliza seleção estruturada para conjuntos de dados maiores.

### Classificação

A lista utiliza o menu padrão de classificação do DataTable.

Ele oferece suporte à classificação por campos expostos pela camada de consulta do backend, incluindo:
- `Name`
- `Status`
- `Product`
- `Updated`

## 4. Ações na linha

Cada linha exibe um menu de ações na parte inferior.

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
- mantém a seleção de produtos e variantes separada da consulta de exibição principal
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
- exibe uma DataTable com opções selecionáveis
- oferece suporte à pesquisa
- oferece suporte à paginação
- reincorpora o único produto selecionado ao fluxo ativo

### Seletor de variantes

O seletor de variantes:
- utiliza um `FocusModal`
- carrega variantes apenas para o produto selecionado
- exibe uma DataTable compacta
- permite a seleção de uma variante por vez

### Por que se utiliza a seleção estruturada

Esse padrão é preferível porque:
- produtos e variantes não são pequenos conjuntos estáticos de opções
- os IDs e títulos devem ser provenientes de dados reais do Admin
- a experiência do usuário (UX) permanece alinhada com a abordagem do Medusa para a seleção de entidades a partir de conjuntos de dados maiores

## 8. Estados de carregamento, vazio e de erro

A interface do usuário segue o modelo de gerenciamento de estados do Medusa.

### Página de lista

Comportamento da lista:
- O carregamento da DataTable é controlado pela consulta de exibição
- Falhas de carregamento no nível da rota são representadas por meio de um `Alert` embutido
- A tabela oferece dois estados vazios:
- `No plan offers yet`
- `No matching plan offers`

Isso mantém a distinção entre mensagens vazias e mensagens filtradas como vazias, ao mesmo tempo em que preserva a estrutura da página.

### Gavetas e janelas modais

Comportamento dos modais e das gavetas:
- o modal de criação mantém seu próprio estado de pendência e validação
- a gaveta de edição fornece um estado de carregamento local
- a gaveta de edição fornece um estado de erro local

Esses estados não bloqueiam a página principal da lista.

## 9. Carregamento de dados e invalidação de consultas

A página segue o padrão de carregamento de dados do painel do Medusa.

### Exibir consulta

A consulta de exibição da lista:
- é carregada na montagem
- não está vinculada condicionalmente ao estado do modal ou da gaveta
- utiliza `sdk.client.fetch()` na rota personalizada do Admin
- utiliza `keepPreviousData` para tornar as alterações de paginação e filtragem mais fluidas

### Consultas de interação

Os dados dos modais e das gavetas são separados por função:
- a consulta de seleção de produto é carregada somente quando o seletor de produtos está aberto
- a consulta de seleção de variantes é carregada somente quando o seletor de variantes está aberto
- a consulta de detalhes é carregada somente quando a gaveta de edição está aberta

Essa separação evita vincular a renderização da página principal a dados exclusivos do modal.

### Estratégia de invalidação

Após a criação, atualização ou alteração bem-sucedida:
- a consulta à lista de planos e ofertas é invalidada
- a consulta aos detalhes relevantes é invalidada, quando aplicável

Isso garante que:
- a tabela seja atualizada após alterações;
- a gaveta de edição permaneça consistente após o salvamento

## 10. Convenções de interface do usuário (UI) e experiência do usuário (UX)

A página segue as convenções estabelecidas para o painel do Medusa.

### Componentes

A implementação utiliza blocos de construção da interface do usuário do Medusa, tais como:
- `Container`
- `DataTable`
- `FocusModal`
- `Drawer`
- `Alert`
- `StatusBadge`
- `Text`
- `Button`

### Modelo de interação

A interface do usuário separa intencionalmente:
- fluxos de criação para novas entidades
- fluxos de edição para entidades existentes
- exibição de consultas em modais exclusivos
- ações rápidas da edição baseada em formulário

### Padrões de botões e status

A página segue o estilo de tratamento de ações do Medusa:
- pequenos botões de ação
- notificações semânticas de sucesso e erro
- avisos de confirmação para ações de risco
- status exibido por meio de `StatusBadge`

### Estilo de layout

A página segue a mesma abordagem prática de layout de administração do Medusa utilizada em outras partes do plug-in:
- cabeçalho e descrição na parte superior
- barra de ferramentas com filtros, pesquisa e classificação
- DataTable como a principal interface operacional

## Documentos relacionados

- [Visão geral da documentação](../README.md)
- [Arquitetura de planos e ofertas](../architecture/plan-offers.md)
- [API de administração de planos e ofertas](../api/admin-plan-offers.md)
- [Testes de planos e ofertas](../testing/plan-offers.md)
- [Roteiro](../roadmap/implementation-plan.md)
