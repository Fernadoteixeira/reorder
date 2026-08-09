# UI do administrador: assinaturas

Este documento descreve a UI Admin implementada para a área `Subscriptions` no plugin `Reorder`.

Ele se concentra no comportamento da tela, nos fluxos do usuário, nas ações e no tratamento do estado da IU.

## Propósito

A UI Admin `Subscriptions` oferece aos operadores um espaço de trabalho dedicado para:
- navegar por assinaturas
- inspecionar detalhes da assinatura
- executar ações do ciclo de vida operacional
- agendar mudanças futuras no plano
- edite o endereço de envio da assinatura

A UI é implementada como rotas personalizadas do Medusa Admin e segue os padrões do painel Medusa o mais próximo possível.

## Mapa de rotas

Rotas implementadas:
- `/app/subscriptions`
- `/app/subscriptions/:id`

Rotas de operações recorrentes relacionadas no mesmo grupo de navegação:
- `/app/subscriptions/renewals`
- `/app/subscriptions/dunning`
- `/app/subscriptions/cancellations`

Personalização integrada da página Admin relacionada:
- `Order detail` mostra um widget `Subscription` deste plugin

Comportamento de navegação:
- a rota da lista está disponível como uma página da barra lateral
- clicar em uma linha na lista navega para a rota detalhada
- a rota detalhada mostra a localização atual da lista

Limitação atual:
- em rotas de detalhes dinâmicos neste grupo de navegação personalizado, o estado ativo da barra lateral volta para `Subscriptions`

## 1. Página da lista

### Propósito

A página da lista é a visão geral operacional de todas as assinaturas.

É implementado com Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas da lista
- assinaturas DataTable
- paginação

### Colunas

A lista exibe atualmente:
- `Reference`
- `Product`
- `Status`
- `Frequency`
- `Next renewal`
- menu de ação de linha

A renderização de colunas usa células compactas no estilo Medusa:
- valor primário na primeira linha
- valor de apoio em texto sutil na segunda linha, quando aplicável

### Procurar

A lista possui uma entrada de pesquisa na área superior direita da barra de ferramentas.

A pesquisa destina-se a pesquisas amplas e atualmente abrange:
- referência de assinatura
- nome do cliente
- e-mail do cliente
- título do produto
- título da variante
-SKU

### Filtros

A lista usa o padrão de interação Medusa `Add filter`.

Filtros implementados:
- `Status`
- `Trial`
- `Skip next cycle`
- `Next renewal`

Os filtros aplicados são mostrados como chips na barra de ferramentas e podem ser removidos individualmente.

A lista também expõe `Clear all` quando qualquer filtro está ativo.

### Classificação

A lista usa o menu de classificação padrão na barra de ferramentas.

Ele oferece suporte à classificação de campos expostos pela camada de consulta de back-end, incluindo:
- `Status`
- `Product`
- `Next renewal`
- `Updated` como uma chave de classificação técnica de backend, mesmo que não seja mostrada como uma coluna visível

### Ações de linha

Cada linha expõe um menu de ação final.

Ações de lista implementadas:
- `Pause`
- `Resume`
- `Cancel`

A disponibilidade da ação depende do status da assinatura:
- `active` -> `Pause`, `Cancel`
- `paused` -> `Resume`, `Cancel`
- `cancelled` -> nenhuma outra ação de mutação do ciclo de vida

### Navegação de linha

Clicar em uma linha abre a página de detalhes dessa assinatura.

O menu de ação de linha não aciona a navegação.

## 2. Página de detalhes

### Propósito

A página de detalhes é a tela operacional principal de uma única assinatura.

Combina:
- visibilidade do status
- ações do ciclo de vida
- dados de assinatura somente leitura
- editar gavetas para fluxos de mutação suportados

### Cabeçalho

O cabeçalho de detalhes contém:
- referência de assinatura
- breve descrição
- emblema de status
- menu de ação

Isto segue o padrão Medusa de título à esquerda e status mais ações à direita.

### Seções principais

A página de detalhes renderiza atualmente:
- `Subscription`
- `Customer`
- `Product`
- `Shipping address`
- `Pending plan change`
- `Activity Log`

Estas seções são orientadas para leitura e projetadas para inspeção rápida do operador.

A seção `Product` usa um cartão vinculado no estilo Medusa que abre a página de detalhes da variante padrão do produto.
`SKU` permanece visível como um campo auxiliar separado abaixo do cartão.

Regra atual de resolução de dados:
- Os dados de exibição de `Customer` e `Product` são resolvidos ao vivo a partir de registros Medusa vinculados, quando disponíveis
- quando os registros vinculados não estão disponíveis, a IU recorre aos instantâneos de assinatura persistentes

### Widget de detalhes do pedido

O plugin também estende a página padrão Medusa `Order detail`.

O widget `Subscription` mostra:
- `Subscription order` com cartão de assinatura vinculado quando o pedido estiver vinculado a uma assinatura
- rótulo de desconto de assinatura atual derivado de `pricing_snapshot`
- próxima data de renovação projetada
- `One-time order` quando não existe nenhum link `subscription_order`

## 3. Ações detalhadas

### Menu de Ação

O menu de ação da página de detalhes inclui:
- `Pause`
- `Resume`
- `Schedule plan change`
- `Edit shipping address`
- `Cancel`

A disponibilidade da ação segue as mesmas regras estaduais da lista, quando relevante.

### Por que `Schedule plan change` vive apenas nos detalhes

`Schedule plan change` é exposto intencionalmente na página de detalhes, não no menu da linha da lista.

Razão:
- é um fluxo de edição com um formulário
- requer mais contexto do que uma ação de linha leve
- o padrão Medusa é manter os fluxos de estilo de edição nas páginas de detalhes e gavetas, em vez de colocá-los na lista quando não são ações realmente rápidas

## 4. Gavetas

A página de detalhes usa Gavetas para editar dados de assinatura existentes.

Isso segue o padrão Medusa para fluxos de edição.

### Gaveta de alteração de plano de cronograma

Objetivo:
- agende um plano futuro ou atualização de cadência

Campos:
- variante
- intervalo de frequência
- valor de frequência
- eficaz em

Comportamento:
- as variantes são carregadas somente quando a gaveta é aberta
- o formulário é pré-preenchido com valores de assinatura atuais ou dados de plano pendentes
- o salvamento é desativado durante o carregamento ou quando os dados da variante necessária não estão disponíveis

### Editar gaveta de endereço de entrega

Objetivo:
- atualizar o instantâneo do endereço de entrega atribuído à assinatura

Campos:
- primeiro nome
- sobrenome
- empresa
- linha de endereço 1
- linha de endereço 2
- cidade
- código postal
- província/estado
- código do país
- telefone

Comportamento:
- a gaveta é pré-preenchida com o endereço de envio da assinatura atual
- o formulário valida os campos obrigatórios antes de enviar
- a ação de salvar é mostrada no formato de rodapé padrão da Medusa Drawer
- o evento de log de atividades resultante armazena diferenças de endereços legíveis, como `Address: old -> new`

## 5. Seção de registro de atividades

A página de detalhes inclui uma seção `Activity Log` dedicada para uma assinatura.

Ele é implementado como uma visualização de auditoria baseada em tabela e segue o mesmo padrão de lista estilo Medusa usado no plugin:
- linhas compactas da tabela
- classificação
- filtragem
- paginação
- detalhe do evento baseado em gaveta

A seção atualmente:
- não expõe uma entrada de pesquisa
- suporta classificação através do menu de classificação
- suporta `Add filter` para filtros de domínio, ator e data opcional
- mostra as entradas `Created from` e `Created to` somente depois que esses filtros são adicionados no menu
- abre a gaveta de eventos quando uma linha é clicada
- renderiza `Actor` como o valor de exibição resolvido, normalmente e-mail do administrador
- renderiza `Event` sem legenda de domínio secundário na célula da tabela
- renderiza `Summary` usando rótulos voltados para o operador em vez de nomes de campos internos brutos, como `pending_update_data`

## 6. Regras de ação por status

Regras atuais do ciclo de vida na IU:

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
  - pode agendar uma mudança de plano
  - pode editar o endereço de entrega
  - o cancelamento permanece disponível em detalhes quando suportado pelas regras de back-end

- `cancelled`
  - não há mais transições do ciclo de vida
  - a visualização de detalhes somente leitura permanece disponível

## 7. Estados de carregamento, vazio e erro

A IU segue o tratamento de estado no estilo Medusa.

### Página da lista

Comportamento da lista:
- O carregamento do DataTable é orientado pela consulta de exibição
- estados vazios filtrados são renderizados pela tabela
- falhas de carregamento no nível da rota são renderizadas como `Alert` inline

### Página de detalhes

Comportamento detalhado:
- o carregamento no nível da página usa `Spinner` e texto de carregamento sutil
- erros no nível da página são renderizados in-line por meio de `Alert`
- existe um estado de alerta defensivo se os dados detalhados não estiverem disponíveis

### Gavetas

Comportamento da gaveta:
- a gaveta de alteração de plano mostra um botão giratório ao carregar variantes
- erros específicos de gaveta são mostrados em linha como `Alert`
- quando nenhuma variante estiver disponível, o usuário verá um estado claro e vazio e não poderá salvar

## 8. Feedback de mutação

A IU fornece feedback imediato após as mutações.

Comportamento implementado:
- confirmar avisos para ações destrutivas do ciclo de vida
- ações desabilitadas enquanto uma mutação está pendente
- brindes de sucesso após mutação bem-sucedida
- brindes de erro quando uma mutação falha
- invalidação de consulta para visualizações de lista e detalhes após sucesso da mutação

## 9. Decisões de experiência do usuário

### Listar vs Detalhe Responsabilidades

A lista foi projetada para:
- descoberta
- pesquisar
- filtragem
- classificação
- ações rápidas do ciclo de vida

A página de detalhes foi projetada para:
- inspeção
- edições baseadas em formulário
- ações de contexto pesado

### Por que cliente e produto ainda não são seletores `Add filter` separados

A lista atualmente depende da pesquisa de clientes e produtos, em vez de filtros seletores dedicados.

Razão:
- o contrato de back-end atual espera `customer_id` e `product_id`
- adicionar pseudofiltros baseados em texto criaria uma UX fraca
- uma implementação adequada no estilo Medusa exigiria seletores de entidades dedicados

## 10. Fluxos de usuário testados

A UI implementada é suportada pela cobertura de integração para o fluxo administrativo subjacente:
- listar assinaturas
- detalhe aberto
- pausa
- currículo
- mudança de plano de cronograma
- editar endereço de entrega
- cancelar

A interface do navegador em si não é atualmente coberta pelo Playwright.

O projeto atual depende de testes de integração HTTP suportados pela Medusa para validação de fluxo de backend ponta a ponta.

## 11. Limite com cancelamento e retenção

A área administrativa `Subscriptions` ainda possui ações diretas do ciclo de vida, como:
- pausa
- currículo
- cancelar

Ao mesmo tempo, o tratamento de rotatividade agora tem seu próprio espaço de trabalho dedicado em `Subscriptions`:
- `Cancellation & Retention`

Isso significa:
- as operações diretas do ciclo de vida da assinatura permanecem disponíveis nos detalhes da assinatura
- recomendações de retenção, ofertas de retenção, análise de casos de cancelamento e fluxos de operadores específicos de rotatividade agora estão disponíveis no espaço de trabalho de cancelamento dedicado
