# Planos e ofertas Admin UX Spec

## 1. Objetivo

Este documento define o Admin UX para a área `Plans & Offers`.

O objetivo é seguir as convenções de administração da Medusa o mais fielmente possível e permanecer alinhado visual e comportamentalmente com a UI `Subscriptions` já implementada neste plugin.

Esta é apenas uma especificação de UX e interação. Ainda não implementa a página Admin.

## 2. Fonte de verdade para direção UX

A principal referência de UX para este recurso é a implementação `Subscriptions` Admin existente neste plugin.

Por quê:
- já segue bem as convenções de administração da Medusa
- corresponde à arquitetura de informação existente da base de código
- define o padrão de qualidade para espaçamento, padrões de tabela, tratamento de erros, estados de carregamento e mutações

Referências de implementação:
- `reorder/src/admin/routes/subscriptions/page.tsx`
- `reorder/src/admin/routes/subscriptions/[id]/page.tsx`
- `reorder/src/admin/routes/subscriptions/data-loading.ts`

## 3. Arquitetura da informação

`Plans & Offers` não deve ser apresentado como uma área administrativa de nível superior.

Deve ser uma rota Admin aninhada em `Subscriptions`, semelhante a como o Medusa mostra páginas filhas em áreas pai existentes, como:
- `Products`
- `Collections`
- `Categories`

### Estrutura de rota alvo

Rota recomendada:
- `/subscriptions/plans-offers`

Configuração de rota de administrador recomendada:
- rótulo: `Plans & Offers`
- aninhado: `/subscriptions`

Por quê:
- isso mantém o recurso agrupado conceitualmente com o gerenciamento de assinaturas
- evita a dispersão da configuração relacionada à assinatura em áreas separadas de nível superior
- corresponde à IA esperada do usuário

## 4. Comportamento de navegação

Quando o usuário abre a área `Subscriptions` na barra lateral Admin:
- `Subscriptions` permanece a entrada pai
- `Plans & Offers` aparece como uma rota filha aninhada abaixo dela

Comportamento esperado:
- o usuário pode mover-se entre a lista de assinaturas e a área de configuração do plano-oferta sem sair do domínio de assinatura mais amplo
- a rota secundária deve herdar o cromo e o espaçamento padrão da página Medusa
- nenhum sistema de navegação personalizado deve ser introduzido se a navegação da barra lateral aninhada já atender à necessidade

## 5. Responsabilidades da página

### 5.1 Página de assinaturas

A página `Subscriptions` existente permanece responsável por:
- listando assinaturas
- abertura de detalhes da assinatura
- realizar ações do ciclo de vida da assinatura

### 5.2 Página Planos e Ofertas

A nova página `Plans & Offers` é responsável por:
- listando registros de origem `PlanOffer`
- expondo ações de criação e edição
- expor ações de ativação/desativação
- mostrando resumos de configuração eficazes

Ela não deve tentar se comportar como uma página de detalhes da assinatura.

## 6. Separação entre criação e edição

Criar e editar devem ser separados intencionalmente.

### Criar fluxo

Objetivo:
- crie uma nova configuração de origem para:
  - um produto
  - uma variante

O fluxo de criação possui:
- seleção de alvo
- configuração inicial do plano-oferta
- validação inicial UX

### Editar fluxo

Objetivo:
- atualizar um registro de origem `PlanOffer` existente

O fluxo de edição possui:
- edição de campos de configuração mutáveis
- preservar a identidade alvo do registro

O fluxo de edição não deve permitir alterações:
- `scope`
- `product_id`
- `variant_id`

Alterar o destino é semanticamente equivalente a criar um registro diferente.

## 7. Decisões modais de contêineres

### 7.1 Criar usa `FocusModal`

O fluxo de criação deve usar `FocusModal`.

Por quê:
- Os padrões Medusa Admin recomendam `FocusModal` para criar formulários
- criar é uma tarefa primária com mais contexto de configuração do que uma edição in-line rápida
- o usuário precisa de espaço focado para:
  - seleção de alvo
  - pesquisa de produto/variante
  - frequências e configuração de descontos
  - definição de regras

### 7.2 Editar usa `Drawer`

O fluxo de edição deve usar `Drawer`.

Por quê:
- Os padrões Medusa Admin recomendam `Drawer` para edição/atualização de formulários
- a edição é contextual a uma linha que já existe na lista
- o usuário se beneficia ao manter o contexto da lista visível enquanto altera a configuração

## 8. UX da página da lista de planos e ofertas

A página da lista deve usar a mesma estrutura geral de página de `Subscriptions`:
- `Container`
- cabeçalho da página com título e CTA principal
- `DataTable`
- estados de vazio, carregamento e erro consistentes com as convenções da UI do Medusa

### Cabeçalho

Conteúdo do cabeçalho:
- título: `Plans & Offers`
- legenda ou texto de apoio são opcionais, somente se adicionarem clareza real
- botão de ação principal: `Create`

### Finalidade da tabela

A tabela representa registros de origem, não configurações derivadas.

Cada linha deve comunicar:
- a qual público-alvo a oferta pertence
- se o registro de origem está habilitado
- quais frequências e descontos define
- qual fonte vence na configuração efetiva

## 9. Separação de carregamento de dados

A página deve seguir o mesmo padrão de `Subscriptions` e da orientação de habilidades do Medusa Admin:

- exibir cargas de consulta na montagem
- criar consulta auxiliar é separada
- a consulta de ajuda/detalhe de edição é separada

### 9.1 Exibir consulta

Exibir responsabilidades de consulta:
- lista de ofertas de planos
- filtros
- classificação
- paginação
- resumo de configuração eficaz usado na lista

Esta consulta deve ser carregada imediatamente na montagem da página.

### 9.2 Criar consulta auxiliar

Crie responsabilidades de consulta auxiliar:
- dados de pesquisa de produto
- dados de pesquisa de variantes, se necessário
- quaisquer metadados auxiliares leves para seleção de formulário

Esta consulta deve carregar somente quando o modal de criação for aberto.

### 9.3 Editar consulta auxiliar

Edite as responsabilidades da consulta auxiliar:
- buscar os detalhes do registro de origem atual
- buscar todos os dados auxiliares necessários ao formulário da gaveta

Esta consulta deve ser carregada somente quando a gaveta de edição for aberta.

## 10. Crie UX de fluxo

### Ponto de entrada

CTA principal na página `Plans & Offers`:
- `Create`

### Contêiner

`FocusModal`

### Estrutura do formulário

Seções recomendadas:
- alvo
- frequências de cobrança
- descontos
- regras
- metadados avançados, se expostos

### Seção de destino

Campos:
- `scope`
- `product_id`
- `variant_id`

Comportamento:
- se `scope = product`, a seleção de variante está oculta ou desativada
- se `scope = variant`, a seleção de variante é necessária

### Comportamento de envio

Ao enviar com sucesso:
- feche o `FocusModal`
- invalidar a consulta de exibição do plano-oferta
- opcionalmente invalidar consultas detalhadas relevantes se armazenadas em cache
- mostrar brinde de sucesso

Ao enviar erro:
- mantenha o modal aberto
- mostrar erros de campo embutidos quando possível
- mostrar brinde para falhas de back-end/domínio

## 11. Editar UX do fluxo

### Ponto de entrada

De uma ação de linha:
- `Edit`

### Contêiner

`Drawer`

### Comportamento do formulário

A gaveta é aberta com valores pré-preenchidos do registro de origem selecionado.

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
- `metadata` se exposto

### Comportamento de envio

Ao enviar com sucesso:
- fechar gaveta
- invalidar consulta de exibição
- invalidar consulta de detalhes afetados
- mostrar brinde de sucesso

Ao enviar erro:
- mantenha a gaveta aberta
- mostrar feedback de erro sem perder o estado do formulário

## 12. Ações de linha

Ações de linha recomendadas:
- `Edit`
- `Enable` ou `Disable`

Opcional:
- `View details` somente se a página posteriormente obtiver uma rota de detalhes dedicada ou painel lateral

Nesta fase, as ações mínimas exigidas são:
- editar a configuração existente
- alternar estado ativado

## 13. Estados de vazio, carregamento e erro

### Carregando

A lista deve mostrar o comportamento padrão de carregamento da Medusa:
- carregando `DataTable`
- não é um espaço reservado para estado vazio durante o primeiro carregamento

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

Para manter a consistência com a experiência do usuário (UX) existente do `Subscriptions`:
- evite misturar as funções de criação e edição no mesmo contêiner
- evite abrir o formulário de criação em uma gaveta
- evite permitir a reatribuição de destino na edição
- evite vincular os dados de exibição da página às consultas auxiliares de criação/edição

## 16. Orientações de implementação decorrentes

A próxima etapa de implementação deve resultar em:
- uma rota Admin aninhada sob `Subscriptions`
- uma página baseada em `DataTable` para `Plans & Offers`
- um formulário de criação `FocusModal`
- um formulário de edição `Drawer`
- consultas separadas para exibição e auxiliares
- invalidação de consultas e feedback por toast consistentes com `Subscriptions`
