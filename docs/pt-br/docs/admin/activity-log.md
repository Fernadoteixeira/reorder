# Interface do usuário de administração: Registro de atividades

Este documento descreve a interface de usuário administrativa implementada para a área `Activity Log` no plug-in `Reorder`.

O foco está em:
- comportamento da tela
- fluxos de usuários
- carregamento de dados
- gerenciamento do estado da interface do usuário (UI)
- limites da experiência do usuário (UX)

## Objetivo

A interface de usuário administrativa do `Activity Log` oferece aos operadores uma área de auditoria voltada para a leitura de eventos do ciclo de vida das assinaturas em:
- `Subscriptions`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`

O objetivo é ajudar os operadores a:
- analisar o que mudou;
- entender quem ou o que causou a mudança;
- passar de uma visão geral da auditoria para uma linha do tempo específica de uma assinatura

A interface do usuário foi implementada como rotas personalizadas do Medusa Admin e segue os mesmos padrões de painel já utilizados por outras áreas do plugin.

## Mapa da rota

Rotas e superfícies implementadas:
- `/app/subscriptions/activity-log`
- Seção `Activity Log` dentro de `/app/subscriptions/:id`

Comportamento de navegação:
- a página global está aninhada sob `Subscriptions`
- clicar em uma linha na página global abre os detalhes do evento em uma gaveta
- a página de detalhes da assinatura apresenta uma seção dedicada `Activity Log` para análise por assinatura

## 1. Página de Registro de Atividades Globais

### Objetivo

A página global é a fila de auditoria entre assinaturas destinada aos operadores.

É implementado com o Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas da lista
- DataTable do registro de atividades
- paginação
- menu deslizante de detalhes do evento

### Colunas

Atualmente, a tabela exibe:
- `Subscription`
- `Created`
- `Actor`
- `Event`
- `Reason`

A exibição das colunas segue o mesmo padrão compacto no estilo Medusa usado nas outras páginas de lista do Admin:
- valor principal na primeira linha
- valor complementar em texto discreto na segunda linha, quando for relevante

### Pesquisar

A página possui um campo de pesquisa na parte superior direita da barra de ferramentas.

A função de pesquisa destina-se a buscas gerais e, atualmente, abrange:
- referência da assinatura
- nome do cliente
- motivo

### Filtros

A página utiliza o mesmo padrão de interação `Add filter` que as páginas de lista do Admin já existentes.

Filtros implementados:
- `Event`
- `Actor`

A página também apresenta campos de entrada dedicados para datas:
- `Created from`
- `Created to`

Essas entradas de data:
- são aplicadas como filtros de lista
- são exibidas diretamente na área da barra de ferramentas
- não são exibidas como chips segmentados, de forma intencional

Os filtros sem data aplicados são exibidos como fichas de filtro segmentadas, em conformidade com `Cancellation & Retention`.

A apresentação de `Actor` dá preferência ao valor de exibição resolvido a partir do modelo de leitura:
- para usuários administradores, esse valor é normalmente o e-mail do administrador
- se não houver nenhum enriquecimento de exibição disponível, a interface do usuário recorre a `actor_id`

A célula `Event` exibe apenas o ícone do evento na visualização em tabela.

O rótulo do domínio não é exibido como uma linha secundária na célula da tabela.

A barra de ferramentas também exibe:
- `Add filter`
- `Clear all`
- menu de classificação

### Predefinições rápidas

A página oferece predefinições rápidas de eventos para:
- `Subscriptions`
- `Renewals`
- `Dunning`
- `Cancellation`

Essas predefinições são implementadas como seleções agrupadas de `event_type` e renderizadas da mesma forma que os outros filtros ativos.

### Classificação

A página utiliza o menu de classificação padrão na barra de ferramentas.

A ordenação padrão da lista é:
- `Created desc`

### Detalhamento

Ao clicar em uma linha, abre-se uma janela deslizante com o evento selecionado.

A janela exibe:
- visão geral do evento
- instantâneo da assinatura
- `changed_fields`
- `previous_state`
- `new_state`
- `metadata`

Os eventos relacionados ao endereço de entrega preferem valores de endereço legíveis em `changed_fields`, em vez de apenas indicadores booleanos técnicos.

A gaveta utiliza uma consulta de detalhes específica e não recarrega a lista inteira por conta própria.

## 2. Cronograma de detalhes da assinatura

### Objetivo

A página de detalhes da assinatura inclui uma seção `Activity Log` para exibir o histórico de auditoria de uma assinatura ativa.

Isso proporciona aos operadores um contexto de auditoria local sem que precisem sair da visualização dos detalhes da assinatura.

### Principais elementos da interface do usuário

A seção inclui:
- linha do tempo baseada em tabela
- barra de ferramentas de filtro
- menu de classificação
- paginação
- estado de carregamento
- estado vazio
- alerta de erro embutido
- painel de detalhes do evento

### Conteúdo da linha do tempo

A linha do tempo com os detalhes da assinatura agora usa um layout de tabela compacta, em vez de uma lista de cartões.

Atualmente, a tabela exibe:
- `Created`
- `Event`
- `Actor`
- `Summary`

As entradas são ordenadas por:
- `created_at desc`

### Apresentação do ator

A linha do tempo distingue:
- `admin`
- `system`
- `scheduler`

Ela utiliza a mesma linguagem de emblemas de status e a mesma semântica de cores da página global `Activity Log`.

A célula “ator” prefere o valor de exibição definido:
- e-mail de administrador, quando disponível
- `actor_id` apenas como alternativa

A célula do evento exibe apenas o ícone do evento.

A célula de resumo é voltada para o operador:
- ela prioriza um resumo legível em vez de nomes de campos internos brutos
- chaves técnicas, como `pending_update_data`, são traduzidas antes da renderização
- a linha secundária é exibida apenas quando existe um `reason` explícito
- as diferenças no endereço de entrega são exibidas de forma legível como `old -> new`
- os eventos de “pular próxima entrega” mostram a transição `skip_next_cycle` de forma legível

### Filtros da linha do tempo

A linha do tempo da assinatura não exibe, intencionalmente, um campo de pesquisa.

Suporta:
- filtro de domínio
- filtro de ator
- `Created from`
- `Created to`

Os filtros de data nem sempre ficam visíveis.

Em vez disso:
- eles são adicionados por meio de `Add filter`
- uma vez adicionados, o campo de entrada de data e hora correspondente é exibido abaixo da barra de ferramentas
- se removidos, o campo de entrada desaparece novamente

### Detalhamento

Ao clicar em uma entrada da linha do tempo, é exibida uma janela de eventos com:
- `previous_state`
- `new_state`
- `changed_fields`
- `metadata`

Isso utiliza uma consulta detalhada específica e mantém a linha do tempo básica compacta.

## 3. Carregamento de dados

A interface de usuário administrativa `Activity Log` segue o padrão de exibição e consulta do Medusa.

Comportamento implementado:
- a lista global é carregada no momento da montagem;
- a linha do tempo da assinatura é carregada no momento da montagem, juntamente com a página de detalhes da assinatura;
- os detalhes do evento utilizam uma consulta separada sob demanda;
- as mutações de administração bem-sucedidas invalidam a lista global e a linha do tempo da assinatura relevante

Detalhes de implementação:
- o carregamento de dados da lista global ocorre em `src/admin/routes/subscriptions/activity-log/data-loading.ts`
- o carregamento de dados da linha do tempo de assinaturas ocorre em `src/admin/routes/subscriptions/data-loading.ts`

## 4. Limites da experiência do usuário

A interface de usuário implementada foi projetada, de forma intencional, para facilitar a leitura.

Atualmente, ele não oferece:
- ações de edição diretamente no próprio registro;
- exportação de eventos;
- filtros salvos;
- visualizações personalizadas;
- seções de domínios agrupadas ou recolhidas

As prioridades atuais de experiência do usuário (UX) são:
- consistência com as páginas de administração existentes
- acesso rápido a detalhes de um evento específico
- renderização estável com prioridade no snapshot

## 5. Decisão com prioridade no instantâneo

A interface do usuário é renderizada principalmente a partir dos instantâneos `subscription_log` armazenados.

Isso significa que:
- a lista global não depende de consultas vinculadas em tempo real de outros módulos
- a linha do tempo da assinatura não depende de consultas vinculadas em tempo real de outros módulos
- a gaveta de eventos reflete a carga útil de auditoria de negócios armazenada

Isso é proposital.

Isso torna a trilha de auditoria:
- historicamente estável
- previsível em termos de operação
- mais econômica de ser analisada do que uma interface de usuário entre módulos com muitos recursos
