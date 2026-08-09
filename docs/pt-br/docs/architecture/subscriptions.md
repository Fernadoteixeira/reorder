# Arquitetura de assinaturas

Este documento descreve a arquitetura atual da área `Subscriptions` no plug-in `Reorder`.

Ele se concentra no sistema implementado, e não nos pressupostos iniciais do projeto.

## Objetivo

A área `Subscriptions` oferece aos usuários com permissão de administrador uma visão operacional das assinaturas recorrentes.

A implementação atual oferece suporte a:
- listagem de assinaturas;
- visualização dos detalhes da assinatura;
- exibição das informações da assinatura nos detalhes padrão do pedido do Medusa;
- exibição das informações sobre o desconto da assinatura nos detalhes padrão do pedido do Medusa;
- suspensão de assinaturas;
- retomada de assinaturas;
- cancelamento de assinaturas;
- agendamento de alterações no plano;
- edição do endereço de entrega;
- pular a próxima entrega;
- criação de assinaturas a partir dos carrinhos da loja;
- API da loja voltada para o cliente para ações relacionadas à conta de assinatura

## Visão geral da arquitetura

A implementação está dividida em cinco camadas principais:

1. módulo de domínio
2. fluxos de trabalho
3. API de administração
4. API da loja
5. interface de usuário de administração

Cada camada tem uma responsabilidade bem definida:

- o módulo de domínio é responsável pelo modelo de dados de assinatura e pela persistência
- os fluxos de trabalho são responsáveis pelas alterações de negócios
- a API de administração expõe pontos de extremidade de leitura e gravação para o painel de controle
- a API da loja expõe pontos de extremidade de leitura e gravação seguros para a loja virtual, relativos à conta do cliente e à página de perfil do produto (PDP)
- a interface de usuário de administração exibe visualizações de lista e de detalhes e aciona os pontos de extremidade de administração

## 1. Módulo de domínio

O módulo personalizado `subscription` é o proprietário do domínio de assinatura recorrente.

Contém:
- tipos de domínio
- modelo de dados
- serviço
- exportação de módulo

Escolha-chave de projeto:
- a entidade de assinatura armazena o estado operacional exigido pelos fluxos do Admin e de renovações futuras diretamente em seu próprio modelo
- os modelos de leitura do Admin utilizam o enriquecimento em tempo real a partir de registros vinculados de clientes e produtos, quando disponíveis
- os instantâneos persistidos permanecem na assinatura como plano de contingência operacional e contexto histórico

Isso mantém o modelo operacional estável, ao mesmo tempo em que permite que o Admin exiba os dados atuais dos clientes e produtos vinculados.

## 2. Modelo de dados

O modelo `subscription` armazena:
- campos de identidade e ciclo de vida
- campos de cadência
- campos de programação
- indicadores operacionais
- instantâneos utilizados pelo Admin e renovações futuras

Os campos escalares principais incluem:
- `id`
- `reference`
- `status`
- `customer_id`
- `product_id`
- `variant_id`
- `frequency_interval`
- `frequency_value`
- `started_at`
- `next_renewal_at`
- `last_renewal_at`
- `paused_at`
- `cancelled_at`
- `cancel_effective_at`
- `skip_next_cycle`
- `is_trial`
- `trial_ends_at`

Os campos JSON do Snapshot incluem:
- `customer_snapshot`
- `product_snapshot`
- `pricing_snapshot`
- `shipping_address`
- `pending_update_data`
- `metadata`

Por que os instantâneos são utilizados:
- o Admin deve exibir uma visão estável da assinatura, mesmo que o cliente ou produto vinculado seja alterado posteriormente
- a lógica de renovação futura necessita de dados operacionais específicos da assinatura
- os modelos de leitura atuais do Admin utilizam o recurso de fallback de instantâneo quando os registros vinculados estão ausentes ou não foram resolvidos

## 3. Caminho de leitura

O caminho de leitura está otimizado para as visualizações de lista e detalhes do Admin.

Principais componentes:
- manipuladores de rotas de administração em `src/api/admin/subscriptions`
- auxiliares de normalização em `src/api/admin/subscriptions/utils.ts`
- auxiliares de consulta em `src/modules/subscription/utils/admin-query.ts`

### Fluxo da lista

Para a visualização em lista:
1. a interface de usuário do administrador envia parâmetros de consulta para `GET /admin/subscriptions`
2. a rota de administração valida e normaliza a entrada da consulta
3. `listAdminSubscriptions(...)` cria filtros e regras de classificação
4. a camada de consulta lê as assinaturas por meio de `query.graph(...)`
5. os dados exibidos em tempo real sobre clientes e produtos são enriquecidos por meio de leituras no momento da consulta, com recurso de snapshot como fallback
6. os registros são mapeados para DTOs de administração usados pela DataTable

Os recursos suportados incluem:
- paginação
- pesquisa
- filtragem
- ordenação

Parte da classificação é realizada no banco de dados, enquanto alguns campos derivados são classificados na memória.

### Fluxo de detalhes

Para a visualização detalhada:
1. a interface de usuário administrativa solicita `GET /admin/subscriptions/:id`
2. a rota resolve a assinatura por meio do auxiliar de consulta
3. o resultado é mapeado para um DTO de detalhes
4. a página de detalhes da interface de usuário administrativa exibe o estado atual da assinatura e uma prévia da alteração de plano pendente

Os modelos “Read” agora expõem ambos:
- `next_renewal_at` como a referência técnica de cobrança utilizada pelo processamento de renovação
- `effective_next_renewal_at` como a próxima entrega prevista, exibida no Painel de Administração e na Loja Virtual quando `skip_next_cycle` está habilitado

## 4. Caminho de gravação

Todas as operações que alteram o estado são encaminhadas por meio de fluxos de trabalho.

Mutações implementadas:
- `pause`
- `resume`
- `cancel`
- `schedule-plan-change`
- `update-shipping-address`
- `skip-next-delivery`
- `create-subscription-from-cart`

Padrão de caminho de gravação:
1. A interface de usuário administrativa envia uma mutação para uma rota administrativa personalizada
2. A rota valida a carga útil da solicitação
3. A rota chama um fluxo de trabalho
4. O fluxo de trabalho realiza a validação de negócios e atualiza a assinatura
5. A rota retorna a carga útil com os detalhes atualizados da assinatura

Isso mantém a lógica de negócios fora dos manipuladores HTTP.

### Fluxo de compra na loja

O fluxo de criação da loja utiliza:
- `POST /store/carts/:id/sync-subscription-pricing`
- `POST /store/carts/:id/subscribe`
- `create-subscription-from-cart`

O fluxo valida os metadados da assinatura no item de linha, sincroniza os preços do carrinho para a cadência selecionada, bloqueia o uso misto do carrinho, finaliza o carrinho em um Medusa padrão `order`, verifica a idempotência por meio do link `subscription-order`, cria o `subscription`, registra um evento de log de atividade `subscription.created` para assinaturas recém-criadas com o cliente da loja virtual como ator, vincula-o a `customer`, `cart` e `order` e cria o primeiro próximo `renewal_cycle`.

A sincronização de preços é realizada por meio de um fluxo de trabalho dedicado:
- carregar os itens de assinatura do carrinho
- determinar a configuração efetiva de `Plans & Offers` para a cadência selecionada
- aplicar ou remover o ajuste manual do item de assinatura
- atualizar os itens do carrinho, os impostos e a cobrança do pagamento antes de prosseguir com a finalização da compra

Semântica atual dos ajustes:
- a identidade do ajuste usa `provider_id = "subscription_discount"`
- a descrição do ajuste é `Subscription discount`
- o valor do ajuste é armazenado com impostos incluídos
- os ajustes no carrinho evitam intencionalmente `code`, para que os fluxos de promoção do Medusa não os tratem como códigos promocionais

### Fluxo da conta do cliente da loja

O fluxo atual da conta da loja utiliza:
- `GET /store/customers/me/subscriptions`
- `GET /store/customers/me/subscriptions/:id`
- `POST /store/customers/me/subscriptions/:id/pause`
- `POST /store/customers/me/subscriptions/:id/resume`
- `POST /store/customers/me/subscriptions/:id/change-frequency`
- `POST /store/customers/me/subscriptions/:id/change-address`
- `POST /store/customers/me/subscriptions/:id/skip-next-delivery`
- `POST /store/customers/me/subscriptions/:id/swap-product`
- `POST /store/customers/me/subscriptions/:id/retry-payment`
- `POST /store/customers/me/subscriptions/:id/cancellation`

Essas rotas:
- exigem autenticação do cliente
- validam a propriedade em relação ao cliente autenticado
- reutilizam fluxos de trabalho existentes sempre que possível
- retornam DTOs seguros para a interface do usuário, em vez de contratos de detalhes administrativos
- expõem campos projetados do modelo de leitura, como `effective_next_renewal_at`
- expõem `scheduled_plan_change` quando já existe uma atualização de plano pendente

### Fluxo de ofertas da PDP da loja

O fluxo de ofertas atual do PDP utiliza:
- `GET /store/products/:id/subscription-offer`

A rota resolve a configuração efetiva `Plans & Offers` com precedência `variant > product` e retorna dados de oferta compatíveis com a loja virtual para definição de preços na página de detalhes do produto (PDP) e seleção da cadência.

## 5. Fluxos de trabalho

Os fluxos de trabalho constituem o limite de mutação da área `Subscriptions`.

Eles são responsáveis por:
- validar as transições de status legais
- atualizar os campos do ciclo de vida da assinatura
- atualizar os dados de alterações pendentes no plano
- atualizar os dados do endereço de entrega
- retornar um resultado consistente da assinatura para a camada de API

A camada de rota continua sendo enxuta e voltada para a orquestração.

## 6. Arquitetura da API de administração

A API de administração disponibiliza rotas personalizadas dedicadas às páginas `Subscriptions`.

Rotas de leitura implementadas:
- `GET /admin/subscriptions`
- `GET /admin/subscriptions/:id`

Rotas de mutação implementadas:
- `POST /admin/subscriptions/:id/pause`
- `POST /admin/subscriptions/:id/resume`
- `POST /admin/subscriptions/:id/cancel`
- `POST /admin/subscriptions/:id/schedule-plan-change`
- `POST /admin/subscriptions/:id/update-shipping-address`

A camada de API utiliza:
- validadores Zod
- solicitações administrativas autenticadas
- auxiliares de consulta para leituras
- fluxos de trabalho para gravações

## 7. Arquitetura da API da loja

A API da Loja disponibiliza rotas personalizadas da vitrine dedicadas a:
- finalização da compra de assinaturas;
- lista e detalhes das assinaturas da conta do cliente;
- ações relacionadas às assinaturas da conta do cliente;
- resolução de ofertas de assinatura na página de produto (PDP).

Rotas de leitura implementadas:
- `GET /store/customers/me/subscriptions`
- `GET /store/customers/me/subscriptions/:id`
- `GET /store/products/:id/subscription-offer`

Rotas de mutação implementadas:
- `POST /store/carts/:id/sync-subscription-pricing`
- `POST /store/carts/:id/subscribe`
- `POST /store/customers/me/subscriptions/:id/pause`
- `POST /store/customers/me/subscriptions/:id/resume`
- `POST /store/customers/me/subscriptions/:id/change-frequency`
- `POST /store/customers/me/subscriptions/:id/change-address`
- `POST /store/customers/me/subscriptions/:id/skip-next-delivery`
- `POST /store/customers/me/subscriptions/:id/swap-product`
- `POST /store/customers/me/subscriptions/:id/retry-payment`
- `POST /store/customers/me/subscriptions/:id/cancellation`

A camada da API da loja utiliza:
- middleware de autenticação de clientes
- mapeamento de DTOs específico para a loja virtual
- mutações baseadas em fluxo de trabalho
- verificações de propriedade antes da execução da mutação

## 8. Arquitetura da interface de usuário administrativa

A interface de usuário administrativa foi implementada como rotas personalizadas do Medusa Admin.

Telas atuais:
- página da lista de assinaturas
- página de detalhes da assinatura

Além disso, ele amplia a página integrada do Medusa `Order detail` com um widget que resolve o link `subscription_order` e exibe o status da assinatura, além de um link para a assinatura em questão.

### Página de lista

A página da lista foi criada com o Medusa `DataTable`.

Oferece suporte a:
- paginação
- pesquisa
- filtros
- ordenação
- ações nas linhas
- navegação das linhas para detalhes

O carregamento de dados segue o padrão Medusa:
- a consulta de exibição é sempre carregada no momento da montagem
- as consultas modais e de gaveta são separadas da consulta principal de exibição

### Página de detalhes

A página de detalhes contém:
- visão geral da assinatura
- informações sobre o cliente e o produto
- endereço de entrega
- pré-visualização da alteração de plano pendente
- menu de ações no canto superior direito

Ele também oferece dois fluxos de edição por meio dos Drawers:
- alteração do plano de programação
- edição do endereço de entrega

Isso segue o padrão do Medusa de usar Drawers para editar dados existentes.

## 9. Estratégia de invalidação de consultas

A interface de usuário administrativa utiliza a invalidação explícita de consultas após mutações.

Após uma alteração bem-sucedida:
- a consulta à lista de assinaturas é invalidada
- a consulta aos detalhes da assinatura é invalidada

Isso garante que:
- a página de detalhes permaneça atualizada após as edições
- a lista reflita o status mais recente após voltar à página anterior

## 10. Tratamento de erros e carregamento

A interface do usuário `Subscriptions` segue o gerenciamento de estados no estilo Medusa:
- as páginas de lista utilizam os estados de carregamento e vazio do DataTable
- as páginas de detalhes exibem estados explícitos de carregamento e erro
- as gavetas exibem estados locais de carregamento e erro para dados exclusivos de modais

Isso evita vincular o estado da tela principal ao carregamento de dados exclusivo da gaveta.

## 11. Estratégia de testes

A área é abrangida por:
- testes de módulos/serviços
- testes de integração de fluxos de trabalho e consultas
- testes de integração HTTP de administração
- teste de integração do fluxo de administração baseado em cenários

Observação importante:
- não há camada E2E do navegador no plug-in atual
- o principal fluxo de negócios de ponta a ponta é verificado por meio de testes de integração compatíveis com o Medusa

## 11. Limites da responsabilidade

Atualmente, o `Subscriptions` é responsável por:
- a entidade de assinatura
- a gestão operacional administrativa das assinaturas
- alterações pendentes no plano
- atualizações do endereço de entrega
- a materialização do ciclo de vida para `active`, `paused`, `past_due` e `cancelled`
- campos do ciclo de vida, como `paused_at`, `cancelled_at`, `cancel_effective_at` e `next_renewal_at`

Ainda não possui:
- regras de definição de ofertas e configuração de assinaturas
- execução de renovações
- cobrança de pagamentos e notificação de inadimplência
- status do processo de cancelamento e retenção
- status da recomendação de retenção
- histórico de ofertas de retenção
- fluxo de trabalho de classificação dos motivos de cancelamento

Essas questões foram deixadas de propósito para seções posteriores:
- `Plans & Offers`
- `Renewals`
- `Dunning`

A área `Cancellation & Retention` implementada agora adiciona uma camada de processo separada ao ciclo de vida da assinatura.

Limites atuais com `Cancellation & Retention`:
- `Subscription` continua sendo a fonte de referência para o estado do ciclo de vida
- `CancellationCase` continua sendo a fonte de referência para o estado do processo de cancelamento e retenção
- `RetentionOfferEvent` continua sendo a fonte de referência para o histórico concreto das ofertas de retenção

Isso significa que:
- `paused` e `cancelled` podem ser materializados por fluxos de trabalho de cancelamento
- porém, esses fluxos de trabalho se materializam em `Subscription`, mas não o substituem como responsável pelo ciclo de vida
- o cancelamento final define `cancel_effective_at`
- o cancelamento final limpa `next_renewal_at`
- os resultados retidos não definem `cancel_effective_at`

## 12. Por que essa estrutura?

Essa arquitetura mantém o sistema prático:
- as leituras são otimizadas para operações administrativas
- as gravações são centralizadas nos fluxos de trabalho
- o estado da interface do usuário é claramente separado da lógica de domínio
- a lógica futura de renovação e cobrança poderá ser desenvolvida com base no mesmo núcleo de assinaturas, sem a necessidade de reescrever a camada administrativa
