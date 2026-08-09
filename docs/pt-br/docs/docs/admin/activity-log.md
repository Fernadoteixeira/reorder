# UI do administrador: registro de atividades

Este documento descreve a UI Admin implementada para a área `Log de atividades` no plugin `Reorder`.

Ele se concentra em:
- comportamento da tela
- fluxos de usuários
- carregamento de dados
- Manipulação do estado da UI
- Limites de UX

## Propósito

A interface de administração do `Log de atividades` oferece aos operadores uma superfície de auditoria orientada para leitura para eventos do ciclo de vida da assinatura em:
- `Assinaturas`
- `Renovações`
- `Cobrança`
- `Cancelamento e Retenção`

Destina-se a ajudar os operadores:
- revisar o que mudou
- entender quem ou o que causou a mudança
- passar de uma visão de auditoria global para um cronograma de assinatura

A UI é implementada como rotas personalizadas do Medusa Admin e segue os mesmos padrões de painel já usados ​​por outras áreas de plugins.

## Mapa de rotas

Rotas e superfícies implementadas:
- `/app/subscrições/log de atividades`
- Seção `Registro de atividades` dentro de `/app/subscriptions/:id`

Comportamento de navegação:
- a página global está aninhada em `Assinaturas`
- clicar em uma linha na página global abre os detalhes do evento em uma gaveta
- a página de detalhes da assinatura expõe uma seção dedicada `Registro de atividades` para revisão por assinatura

## 1. Página de registro de atividades globais

### Propósito

A página global é a fila de auditoria de assinaturas cruzadas para operadores.

É implementado com Medusa `DataTable`.

### Principais elementos da interface do usuário

A página inclui:
- título da página e breve descrição
- barra de ferramentas da lista
- registro de atividades DataTable
- paginação
- gaveta de detalhes do evento

### Colunas

A tabela exibe atualmente:
- `Assinatura`
- `Criado`
- `Ator`
- `Evento`
- `Razão`

A renderização de colunas segue o mesmo padrão compacto de estilo Medusa usado nas outras páginas da lista de administradores:
- valor primário na primeira linha
- valor de apoio em texto sutil na segunda linha, quando útil

### Procurar

A página possui uma entrada de pesquisa na área superior direita da barra de ferramentas.

A pesquisa destina-se a pesquisas amplas e atualmente abrange:
- referência de assinatura
- nome do cliente
- razão

### Filtros

A página usa o mesmo padrão de interação `Adicionar filtro` que as páginas de lista de administradores existentes.

Filtros implementados:
- `Evento`
- `Ator`

A página também expõe entradas de data dedicadas para:
- `Criado a partir de`
- `Criado para`

Estas entradas de data:
- são aplicados como filtros de lista
- são mostrados embutidos na área da barra de ferramentas
- não são intencionalmente renderizados como chips segmentados

Os filtros sem data aplicados são renderizados como chips de filtro segmentados, consistentes com `Cancelamento e retenção`.

A apresentação `Actor` prefere o valor de exibição resolvido do modelo de leitura:
- para usuários administradores, normalmente é o e-mail do administrador
- se nenhum enriquecimento de exibição estiver disponível, a UI volta para `actor_id`

A célula `Event` renderiza apenas o emblema do evento na visualização de tabela.

O rótulo do domínio não é mostrado como linha secundária na célula da tabela.

A barra de ferramentas também expõe:
- `Adicionar filtro`
- `Limpar tudo`
- menu de classificação

### Predefinições rápidas

A página oferece suporte a predefinições rápidas de eventos para:
- `Assinaturas`
- `Renovações`
- `Cobrança`
- `Cancelamento`

Essas predefinições são implementadas como seleções agrupadas de `event_type` e exibidas da mesma forma que os outros filtros ativos.

### Classificação

A página utiliza o menu de classificação padrão na barra de ferramentas.

A ordenação padrão da lista é:
- `Criado (descendente)`

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

A página de detalhes da assinatura inclui uma seção chamada `Registro de atividades`, que exibe o histórico de auditoria de uma determinada assinatura.

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
- `Criado`
- `Evento`
- `Responsável`
- `Resumo`

Os registros são ordenados por:
- `created_at desc`

### Apresentação do ator

A linha do tempo distingue:
- `admin`
- `system`
- `scheduler`

Ela utiliza a mesma linguagem de ícones de status e a mesma semântica de cores da página global `Registro de Atividades`.

A célula do ator dá preferência ao valor de exibição resolvido:
- e-mail de administrador, quando disponível
- `actor_id` apenas como alternativa

A célula do evento exibe apenas o ícone do evento.

A célula de resumo é voltada para o operador:
- ela prioriza um resumo legível em vez de nomes de campos internos brutos
- chaves técnicas, como `pending_update_data`, são traduzidas antes da exibição
- a linha secundária é exibida apenas quando existe um `motivo` explícito
- as diferenças no endereço de entrega são mostradas no formato legível `antigo -> novo`
- eventos de “pular próxima entrega” mostram a transição `skip_next_cycle` de forma legível

### Filtros da linha do tempo

A linha do tempo da assinatura não exibe, intencionalmente, um campo de pesquisa.

Suporta:
- filtro de domínio
- filtro de ator
- `Criado a partir de`
- `Criado para`

Os filtros de data nem sempre ficam visíveis.

Em vez disso:
- eles são adicionados por meio de `Adicionar filtro`
- uma vez adicionados, o campo de data e hora correspondente é exibido abaixo da barra de ferramentas
- se removidos, o campo desaparece novamente

### Detalhamento

Ao clicar em uma entrada da linha do tempo, é exibida uma janela de eventos com:
- `previous_state`
- `new_state`
- `changed_fields`
- `metadata`

Isso utiliza uma consulta detalhada específica e mantém a linha do tempo principal compacta.

## 3. Carregamento de dados

A interface de usuário de administração do `Registro de Atividades` segue o padrão de exibição e consulta Medusa.

Comportamento implementado:
- a lista global é carregada no momento da montagem;
- a linha do tempo da assinatura é carregada no momento da montagem, juntamente com a página de detalhes da assinatura;
- os detalhes do evento utilizam uma consulta separada sob demanda;
- as mutações de administração bem-sucedidas invalidam a lista global e a linha do tempo da assinatura relevante

Detalhes de implementação:
- o carregamento de dados da lista global está em `src/admin/routes/subscriptions/activity-log/data-loading.ts`
- o carregamento de dados da linha do tempo de assinaturas está em `src/admin/routes/subscriptions/data-loading.ts`

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
