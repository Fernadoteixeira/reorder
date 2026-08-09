# UI do administrador: registro de atividades

Este documento descreve a UI Admin implementada para a área `Activity Log` no plugin `Reorder`.

Ele se concentra em:
- comportamento da tela
- fluxos de usuários
- carregamento de dados
- Manipulação do estado da UI
- Limites de UX

## Propósito

A UI Admin `Activity Log` oferece aos operadores uma superfície de auditoria orientada para leitura para eventos do ciclo de vida da assinatura em:
- `Subscriptions`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`

Destina-se a ajudar os operadores:
- revisar o que mudou
- entender quem ou o que causou a mudança
- passar de uma visão de auditoria global para um cronograma de assinatura

A UI é implementada como rotas personalizadas do Medusa Admin e segue os mesmos padrões de painel já usados ​​por outras áreas de plugins.

## Mapa de rotas

Rotas e superfícies implementadas:
- `/app/subscriptions/activity-log`
- Seção `Activity Log` dentro de `/app/subscriptions/:id`

Comportamento de navegação:
- a página global está aninhada em `Subscriptions`
- clicar em uma linha na página global abre os detalhes do evento em uma gaveta
- a página de detalhes da assinatura expõe uma seção `Activity Log` dedicada para revisão por assinatura

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
- `Subscription`
- `Created`
- `Actor`
- `Event`
- `Reason`

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

A página usa o mesmo padrão de interação `Add filter` que as páginas de lista de administradores existentes.

Filtros implementados:
- `Event`
- `Actor`

A página também expõe entradas de data dedicadas para:
- `Created from`
- `Created to`

Estas entradas de data:
- são aplicados como filtros de lista
- são mostrados embutidos na área da barra de ferramentas
- não são intencionalmente renderizados como chips segmentados

Os filtros sem data aplicados são renderizados como chips de filtro segmentados, consistentes com `Cancellation & Retention`.

A apresentação `Actor` prefere o valor de exibição resolvido do modelo de leitura:
- para usuários administradores, normalmente é o e-mail do administrador
- se nenhum enriquecimento de exibição estiver disponível, a UI volta para `actor_id`

A célula `Event` renderiza apenas o emblema do evento na visualização de tabela.

O rótulo do domínio não é mostrado como linha secundária na célula da tabela.

A barra de ferramentas também expõe:
- `Add filter`
- `Clear all`
- menu de classificação

### Predefinições rápidas

A página oferece suporte a predefinições rápidas de eventos para:
- `Subscriptions`
- `Renewals`
- `Dunning`
- `Cancellation`

Essas predefinições são implementadas como seleções `event_type` agrupadas e renderizadas como os outros filtros ativos.

### Classificação

A página usa o menu de classificação padrão na barra de ferramentas.

A classificação da lista padrão é:
- `Created desc`

### Detalhamento detalhado

Clicar em uma linha abre uma gaveta para o evento selecionado.

A gaveta mostra:
- visão geral do evento
- instantâneo da assinatura
- `changed_fields`
- `previous_state`
- `new_state`
- `metadata`

Os eventos de endereço de entrega preferem valores de endereço legíveis em `changed_fields` em vez de apenas sinalizadores booleanos técnicos.

A gaveta usa uma consulta detalhada dedicada e não recarrega a lista inteira sozinha.

## 2. Cronograma de detalhes da assinatura

### Propósito

A página de detalhes da assinatura inclui uma seção `Activity Log` para mostrar o histórico de auditoria de uma assinatura em vigor.

Isso fornece aos operadores um contexto de auditoria local sem sair da visualização detalhada da assinatura.

### Principais elementos da interface do usuário

A seção inclui:
- cronograma baseado em tabela
- barra de ferramentas de filtro
- menu de classificação
- paginação
- estado de carregamento
- estado vazio
- alerta de erro embutido
- gaveta de detalhes do evento

### Conteúdo da linha do tempo

O cronograma de detalhes da assinatura agora usa um layout de tabela compacto em vez de uma lista de cartões.

A tabela mostra atualmente:
- `Created`
- `Event`
- `Actor`
- `Summary`

As inscrições são ordenadas por:
- `created_at desc`

### Apresentação do ator

A linha do tempo distingue:
- `admin`
- `system`
- `scheduler`

Ele usa a mesma linguagem de status e semântica de cores da página `Activity Log` global.

A célula ator prefere o valor de exibição resolvido:
- e-mail do administrador quando disponível
- `actor_id` apenas como alternativa

A célula do evento mostra apenas o crachá do evento.

A célula de resumo é voltada para o operador:
- prefere um resumo legível a nomes de campos internos brutos
- chaves técnicas como `pending_update_data` são traduzidas antes da renderização
- a linha secundária é mostrada apenas quando existe um `reason` explícito
- as diferenças de endereço de entrega são mostradas em um formato `old -> new` legível
- eventos next-delivery-skip mostram a transição `skip_next_cycle` em um formato legível

### Filtros de linha do tempo

A linha do tempo da assinatura não expõe intencionalmente uma entrada de pesquisa.

Suporta:
- filtro de domínio
- filtro de ator
- `Created from`
- `Created to`

Os filtros de data nem sempre estão visíveis.

Em vez disso:
- eles são adicionados através de `Add filter`
- uma vez adicionado, a entrada de data e hora correspondente é renderizada abaixo da barra de ferramentas
- se removido, a entrada desaparece novamente

### Detalhamento detalhado

Clicar em uma entrada da linha do tempo abre uma gaveta de eventos com:
- `previous_state`
- `new_state`
- `changed_fields`
- `metadata`

Isso usa uma consulta detalhada dedicada e mantém a linha do tempo base compacta.

## 3. Carregamento de dados

A UI Admin `Activity Log` segue o padrão de consulta de exibição Medusa.

Comportamento implementado:
- a lista global é carregada na montagem
- o cronograma da assinatura é carregado na montagem com a página de detalhes da assinatura
- os detalhes do evento usam uma consulta separada sob demanda
- mutações administrativas bem-sucedidas invalidam a lista global e o cronograma de assinatura relevante

Detalhe de implementação:
- o carregamento de dados da lista global reside em `src/admin/routes/subscriptions/activity-log/data-loading.ts`
- o carregamento de dados da linha do tempo da assinatura reside em `src/admin/routes/subscriptions/data-loading.ts`

## 4. Limites de UX

A UI implementada é intencionalmente orientada para leitura.

Atualmente não fornece:
- editar ações do próprio log
- exportação de eventos
- filtros salvos
- visualizações personalizadas
- seções de domínio agrupadas ou recolhidas

As prioridades atuais de UX são:
- consistência com páginas de administração existentes
- detalhamento rápido em um evento
- renderização estável do primeiro instantâneo

## 5. Decisão que prioriza o instantâneo

A IU é renderizada principalmente a partir dos instantâneos `subscription_log` armazenados.

Isso significa:
- a lista global não depende de consultas vinculadas ao vivo de outros módulos
- o cronograma de assinatura não depende de consultas vinculadas ao vivo de outros módulos
- a gaveta de eventos reflete a carga útil de auditoria de negócios armazenada

Isso é intencional.

Faz a trilha de auditoria:
- historicamente estável
- previsível para operar
- mais barato de ler do que uma UI de módulo cruzado altamente enriquecida
