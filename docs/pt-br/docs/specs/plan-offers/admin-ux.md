# Especificações de experiência do usuário (UX) para a área de planos e ofertas

## 1. Objetivo

Este documento define a experiência do usuário (UX) do administrador para a área `Plans & Offers`.

O objetivo é seguir as convenções do Medusa Admin o mais fielmente possível e manter a coerência visual e funcional com a interface de usuário `Subscriptions` já implementada neste plug-in.

Este é apenas um documento de especificações de experiência do usuário (UX) e interação. A página de administração ainda não foi implementada.

## 2. Referência definitiva para a orientação da experiência do usuário

A principal referência de experiência do usuário (UX) para esse recurso é a implementação existente do `Subscriptions` Admin neste plugin.

Por que:
- já segue bem as convenções do Medusa Admin
- está alinhado com a arquitetura de informação existente na base de código
- define o padrão de qualidade para espaçamento, padrões de tabelas, tratamento de erros, estados de carregamento e mutações

Referências de implementação:
- `reorder/src/admin/routes/subscriptions/page.tsx`
- `reorder/src/admin/routes/subscriptions/[id]/page.tsx`
- `reorder/src/admin/routes/subscriptions/data-loading.ts`

## 3. Arquitetura da informação

O `Plans & Offers` não deve ser introduzido como uma área administrativa de nível superior.

Deve ser uma rota de administração aninhada sob `Subscriptions`, semelhante à forma como o Medusa exibe páginas filhas sob áreas-pai existentes, tais como:
- `Products`
- `Collections`
- `Categories`

### Estrutura da rota alvo

Rota recomendada:
- `/subscriptions/plans-offers`

Configuração recomendada da rota de administração:
- label: `Plans & Offers`
- nested: `/subscriptions`

Por que:
- isso mantém o recurso conceitualmente agrupado com o gerenciamento de assinaturas
- evita que as configurações relacionadas às assinaturas fiquem espalhadas por áreas distintas de nível superior
- corresponde à arquitetura da informação (IA) esperada pelo usuário

## 4. Comportamento de navegação

Quando o usuário abre a área `Subscriptions` na barra lateral de administração:
- `Subscriptions` continua sendo a entrada pai
- `Plans & Offers` aparece como uma rota filha aninhada abaixo dela

Comportamento esperado:
- o usuário pode alternar entre a lista de assinaturas e a área de configuração de planos e ofertas sem sair do domínio mais amplo de assinaturas
- a rota filha deve herdar o estilo e o espaçamento padrão das páginas do Medusa
- nenhum sistema de navegação personalizado deve ser introduzido se a navegação por barra lateral aninhada já atender à necessidade

## 5. Responsabilidades da página

### 5.1 Página de assinaturas

A página `Subscriptions` existente continua sendo responsável por:
- listar assinaturas;
- abrir os detalhes da assinatura;
- realizar ações relacionadas ao ciclo de vida da assinatura

### 5.2 Página “Planos e ofertas”

A nova página `Plans & Offers` é responsável por:
- listar registros de origem `PlanOffer`
- disponibilizar as ações de criação e edição
- disponibilizar as ações de ativação/desativação
- exibir resumos da configuração em vigor

Ela não deve tentar funcionar como uma página de detalhes de assinatura.

## 6. Separação entre criação e edição

As funções de criação e edição devem ser separadas de forma intencional.

### Criar fluxo

Objetivo:
- criar uma nova configuração de fonte para:
  - um produto
  - uma variante

O fluxo de criação é responsável por:
- seleção do destino
- configuração inicial da proposta do plano
- validação inicial da experiência do usuário (UX)

### Fluxo de edição

Objetivo:
- atualizar um registro de origem `PlanOffer` existente

O fluxo de edição é responsável por:
- editar campos de configuração mutáveis
- preservar a identidade de destino do registro

O fluxo de edição não deve permitir a alteração de:
- `scope`
- `product_id`
- `variant_id`

Alterar o destino é semanticamente equivalente a criar um registro diferente.

## 7. Decisões sobre contêineres modais

### 7.1 A função `create` utiliza ``FocusModal``

O fluxo de criação deve usar `FocusModal`.

Por que:
- Os padrões do Medusa Admin recomendam o uso de `FocusModal` para formulários de criação
- A criação é uma tarefa principal que envolve mais contexto de configuração do que uma edição rápida em linha
- O usuário precisa de um espaço dedicado para:
  - seleção do destino
  - pesquisa de produtos/variantes
  - configuração de frequências e descontos
  - definição de regras

### 7.2 A função `edit` utiliza ``Drawer``

O fluxo de edição deve usar `Drawer`.

Por que:
- Os padrões do Medusa Admin recomendam o uso de `Drawer` em formulários de edição/atualização
- A ação de edição está relacionada a uma linha que já existe na lista
- O usuário se beneficia ao manter o contexto da lista visível enquanto altera a configuração

## 8. Experiência do usuário (UX) da página de lista de planos e ofertas

A página de lista deve seguir a mesma estrutura geral de página que `Subscriptions`:
- `Container`
- cabeçalho da página com título e CTA principal
- `DataTable`
- estados vazio, carregando e de erro, de acordo com as convenções da interface do usuário do Medusa

### Cabeçalho

Conteúdo do cabeçalho:
- título: `Plans & Offers`
- o subtítulo ou texto complementar é opcional, apenas se contribuir para maior clareza
- botão de ação principal: `Create`

### Objetivo da tabela

A tabela representa registros de origem, e não configurações derivadas.

Cada linha deve indicar:
- a qual público-alvo a oferta pertence
- se o registro de origem está ativado
- quais frequências e descontos ela define
- qual origem prevalece na configuração efetiva

## 9. Separação do carregamento de dados

A página deve seguir o mesmo padrão de `Subscriptions` e das orientações da habilidade Medusa Admin:

- exibir as cargas de consulta na montagem
- a consulta auxiliar de criação é separada
- a consulta auxiliar de edição/detalhes é separada

### 9.1 Exibição da consulta

Responsabilidades da consulta de exibição:
- lista de ofertas de planos
- filtros
- ordenação
- paginação
- resumo da configuração efetiva utilizada na lista

Essa consulta deve ser carregada imediatamente ao carregar a página.

### 9.2 Criar consulta auxiliar

Criar responsabilidades de consultas auxiliares:
- dados de consulta de produtos
- dados de consulta de variantes, se necessário
- quaisquer metadados auxiliares simples para seleção em formulários

Essa consulta deve ser carregada somente quando o modal de criação for aberto.

### 9.3 Editar consulta auxiliar

Editar as responsabilidades da consulta auxiliar:
- buscar os detalhes do registro de origem atual
- buscar quaisquer dados auxiliares necessários para o formulário do drawer

Essa consulta deve ser carregada somente quando a aba de edição for aberta.

## 10. Criar uma experiência do usuário fluida

### Ponto de entrada

CTA principal na página `Plans & Offers`:
- `Create`

### Contêiner

`FocusModal`

### Estrutura do formulário

Seções recomendadas:
- destino
- frequências de cobrança
- descontos
- regras
- metadados avançados, caso estejam disponíveis

### Seção “Destino”

Campos:
- `scope`
- `product_id`
- `variant_id`

Comportamento:
- se for `scope = product`, a seleção de variantes fica oculta ou desativada
- se for `scope = variant`, a seleção de variantes é obrigatória

### Comportamento do envio

Ao enviar com sucesso:
- fechar o `FocusModal`
- invalidar a consulta de exibição da oferta do plano
- opcionalmente, invalidar as consultas de detalhes relevantes, caso estejam em cache
- exibir uma notificação de sucesso

Em caso de erro ao enviar:
- manter a janela modal aberta
- exibir erros nos campos diretamente, quando possível
- exibir uma notificação pop-up para falhas no backend ou no domínio

## 11. Experiência do usuário (UX) do fluxo de edição

### Ponto de entrada

De uma ação de linha:
- `Edit`

### Contêiner

`Drawer`

### Comportamento do formulário

A gaveta é aberta com valores pré-preenchidos a partir do registro de origem selecionado.

Campos bloqueados:
- `scope`
- `product_id`
- `variant_id`

Campos editáveis:
- `name`
- `is_enabled`
- `allowed_frequencies`
- `discounts`
- `rules`
- `metadata`, se estiver visível

### Comportamento do envio

Ao enviar com sucesso:
- fechar a gaveta
- invalidar a consulta de exibição
- invalidar a consulta de detalhes afetada
- exibir uma notificação de sucesso

Em caso de erro ao enviar:
- manter a gaveta aberta
- exibir o feedback do erro sem perder o estado do formulário

## 12. Ações em linhas

Ações recomendadas para a linha:
- `Edit`
- `Enable` ou `Disable`

Opcional:
- `View details` somente se a página vier a receber posteriormente uma rota de detalhes dedicada ou um painel lateral

Nesta fase, as ações mínimas necessárias são:
- editar a configuração existente
- ativar ou desativar o estado

## 13. Estados vazio, carregando e de erro

### Carregando

A lista deve apresentar o comportamento padrão de carregamento do Medusa:
- carregando `DataTable`
- não exibe um espaço reservado para o estado vazio durante o primeiro carregamento

### Vazio

A tela vazia deve:
- explicar claramente que ainda não há nenhuma oferta de plano disponível
- incluir uma chamada à ação (CTA) principal para criar a primeira oferta de plano

### Erro

A mensagem de erro deve seguir as convenções da interface do usuário do Medusa:
- `Alert`
- texto conciso e específico para o domínio

## 14. Invalidação de consultas

Após criar/editar/alternar:
- invalidar a consulta de exibição da lista
- invalidar a consulta de detalhes do registro de origem afetado, quando for o caso

Não confie apenas nas atualizações de estado do modal-local.

A fonte de verdade continua sendo o modelo de leitura do backend.

## 15. Restrições de interação

Para manter a coerência com a experiência do usuário (UX) existente do `Subscriptions`:
- evite misturar as funções de criação e edição no mesmo contêiner
- evite abrir o formulário de criação em uma gaveta
- evite permitir a reatribuição de destino na edição
- evite vincular os dados exibidos na página às consultas auxiliares de criação/edição

## 16. Orientações de implementação decorrentes

A próxima etapa de implementação deve resultar em:
- uma rota Admin aninhada sob `Subscriptions`
- uma página baseada em `DataTable` para `Plans & Offers`
- um formulário de criação `FocusModal`
- um formulário de edição `Drawer`
- consultas separadas para exibição e auxiliares
- invalidação de consultas e feedback por toast consistentes com `Subscriptions`
