# Arquitetura de assinaturas

Este documento descreve a arquitetura atual da área `Subscriptions` no plugin `Reorder`.

Ele se concentra no sistema implementado e não nas suposições iniciais do projeto.

## Meta

A área `Subscriptions` fornece aos usuários administradores uma visão operacional sobre assinaturas recorrentes.

A implementação atual suporta:
- listando assinaturas
- visualizar detalhes da assinatura
- mostrando o contexto da assinatura nos detalhes padrão do pedido da Medusa
- mostrando o contexto do desconto de assinatura nos detalhes padrão do pedido da Medusa
- pausando assinaturas
- retomando assinaturas
- cancelamento de assinaturas
- agendamento de mudanças no plano
- editando o endereço de entrega
- pular a próxima entrega
- criação de assinaturas a partir de carrinhos de loja
- API da Loja voltada para o cliente para ações de contas de assinatura

## Visão Geral da Arquitetura

A implementação é dividida em cinco camadas principais:

1. módulo de domínio
2. fluxos de trabalho
3. API de administração
4. armazenar API
5. IU de administração

Cada camada tem uma responsabilidade clara:

- o módulo de domínio possui o modelo de dados de assinatura e persistência
- fluxos de trabalho possuem mutações de negócios
- API admin expõe endpoints de leitura e gravação para o painel
- a API da loja expõe endpoints de leitura e gravação seguros para a conta do cliente e PDP
- UI administrativa renderiza visualizações de lista e detalhes e chama os endpoints administrativos

## 1. Módulo de Domínio

O módulo personalizado `subscription` é o proprietário do domínio de assinatura recorrente.

Ele contém:
- tipos de domínio
- modelo de dados
- serviço
- exportação de módulo

Escolha principal do design:
- a entidade de assinatura armazena o estado operacional exigido pelo Admin e os fluxos de renovação futuros diretamente em seu próprio modelo
- Os modelos de leitura administrativa usam enriquecimento em tempo real de registros vinculados de clientes e produtos, quando disponíveis
- os instantâneos persistentes permanecem na assinatura como substituto operacional e contexto histórico

Isso mantém o modelo operacional estável enquanto permite que o administrador mostre dados atuais de clientes e produtos vinculados.

## 2. Modelo de dados

O modelo `subscription` armazena:
- campos de identidade e ciclo de vida
- campos de cadência
- campos de agendamento
- sinalizadores operacionais
- instantâneos usados pelo administrador e renovações futuras

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
-`trial_ends_at`

Os campos JSON de instantâneo incluem:
- `customer_snapshot`
- `product_snapshot`
- `pricing_snapshot`
- `shipping_address`
- `pending_update_data`
- `metadata`

Por que os instantâneos são usados:
- o administrador deve exibir uma imagem estável da assinatura, mesmo que o cliente ou produto vinculado mude posteriormente
- a lógica de renovação futura precisa de dados operacionais locais para a assinatura
- os modelos atuais de leitura de administrador usam substituto de instantâneo quando os registros vinculados estão ausentes ou não resolvidos

## 3. Leia o caminho

O caminho de leitura é otimizado para lista de administradores e visualizações detalhadas.

Componentes principais:
- manipuladores de rota administrativa em `src/api/admin/subscriptions`
- auxiliares de normalização em `src/api/admin/subscriptions/utils.ts`
- ajudantes de consulta em `src/modules/subscription/utils/admin-query.ts`

### Fluxo de lista

Para a visualização de lista:
1. a UI Admin envia parâmetros de consulta para `GET /admin/subscriptions`
2. A rota administrativa valida e normaliza a entrada da consulta
3. `listAdminSubscriptions(...)` cria filtros e regras de classificação
4. A camada de consulta lê assinaturas por meio de `query.graph(...)`
5. Os dados de exibição de clientes e produtos ao vivo são enriquecidos por meio de leituras em tempo de consulta com retorno de instantâneo
6. Os registros são mapeados para Admin DTOs usados pelo DataTable

Os recursos suportados incluem:
- paginação
- pesquisar
- filtragem
- classificação

Parte da classificação é realizada no banco de dados, enquanto alguns campos derivados são classificados na memória.

### Fluxo detalhado

Para a visualização detalhada:
1. a IU do administrador solicita `GET /admin/subscriptions/:id`
2. A rota resolve a assinatura por meio do auxiliar de consulta
3. o resultado é mapeado para um DTO detalhado
4. a página de detalhes do administrador exibe o estado atual da assinatura e a visualização da alteração do plano pendente

Os modelos de leitura agora expõem ambos:
- `next_renewal_at` como âncora técnica de faturamento usada pelo processamento de renovação
- `effective_next_renewal_at` como a próxima entrega projetada mostrada em Admin e Storefront quando `skip_next_cycle` está ativado

## 4. Escrever caminho

Todas as operações de alteração de estado são roteadas por meio de fluxos de trabalho.

Mutações implementadas:
- `pause`
- `resume`
- `cancel`
- `schedule-plan-change`
- `update-shipping-address`
- `skip-next-delivery`
- `create-subscription-from-cart`

Padrão de caminho de gravação:
1. a UI Admin envia uma mutação para uma rota administrativa personalizada
2. a rota valida a carga útil da solicitação
3. a rota chama um fluxo de trabalho
4. o fluxo de trabalho realiza validação de negócios e atualiza a assinatura
5. A rota retorna a carga útil atualizada dos detalhes da assinatura

Isso mantém a lógica de negócios fora dos manipuladores HTTP.

### Fluxo de compra na loja

O fluxo de criação da loja usa:
- `POST /store/carts/:id/sync-subscription-pricing`
- `POST /store/carts/:id/subscribe`
- `create-subscription-from-cart`

O fluxo valida os metadados da assinatura no item de linha, sincroniza o preço do carrinho para a cadência selecionada, bloqueia o uso misto do carrinho, completa o carrinho em uma Medusa padrão `order`, verifica a idempotência por meio do link `subscription-order`, cria o `subscription`, registra um evento de log de atividades `subscription.created` para assinaturas recém-criadas com o cliente da loja como ator, vincula-o a `customer`, `cart` e `order` e cria o primeiro `renewal_cycle` futuro.

A sincronização de preços é feita por um fluxo de trabalho dedicado:
- carregar itens de linha de assinatura do carrinho
- resolver a configuração `Plans & Offers` efetiva para a cadência selecionada
- aplicar ou remover o ajuste manual do item de linha
- atualize os itens do carrinho, impostos e cobrança de pagamentos antes que a finalização da compra continue

Semântica de ajuste atual:
- identidade de ajuste usa `provider_id = "subscription_discount"`
- a descrição do ajuste é `Subscription discount`
- o valor do ajuste é armazenado incluindo impostos
- os ajustes no carrinho evitam intencionalmente `code`, portanto os fluxos promocionais da Medusa não os tratam como códigos promocionais

### Armazenar fluxo da conta do cliente

O fluxo atual da conta da loja usa:
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

Estas rotas:
- exigir autenticação do cliente
- validar a propriedade em relação ao cliente autenticado
- reutilizar fluxos de trabalho existentes sempre que possível
- devolver DTOs seguros para vitrines em vez de contratos detalhados de administração
- expor campos de modelo de leitura projetados, como `effective_next_renewal_at`
- expor `scheduled_plan_change` quando já existir uma atualização de plano pendente

### Armazenar fluxo de oferta PDP

O fluxo de oferta PDP atual usa:
- `GET /store/products/:id/subscription-offer`

A rota resolve a configuração `Plans & Offers` efetiva com precedência `variant > product` e retorna dados de oferta seguros para loja para preços de PDP e seleção de cadência.

## 5. Fluxos de trabalho

Os fluxos de trabalho são o limite de mutação da área `Subscriptions`.

Eles são responsáveis por:
- validação de transições legais de estado
- atualização dos campos do ciclo de vida da assinatura
- atualização de dados de alterações de plano pendentes
- atualização dos dados do endereço de entrega
- retornando um resultado de assinatura consistente para a camada API

A camada de rota permanece fina e focada na orquestração.

## 6. Arquitetura da API de administração

A API Admin expõe rotas personalizadas dedicadas às páginas `Subscriptions`.

Rotas de leitura implementadas:
- `GET /admin/subscriptions`
- `GET /admin/subscriptions/:id`

Rotas de mutação implementadas:
- `POST /admin/subscriptions/:id/pause`
- `POST /admin/subscriptions/:id/resume`
- `POST /admin/subscriptions/:id/cancel`
- `POST /admin/subscriptions/:id/schedule-plan-change`
- `POST /admin/subscriptions/:id/update-shipping-address`

A camada API usa:
- Validadores Zod
- solicitações de administrador autenticadas
- ajudantes de consulta para leituras
- fluxos de trabalho para gravações

## 7. Arquitetura de API da loja

A API Store expõe rotas personalizadas de vitrine dedicadas a:
- checkout de assinatura
- lista e detalhes de assinatura da conta do cliente
- ações de assinatura de conta de cliente
- Resolução de oferta de assinatura PDP

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

A camada da API Store usa:
- middleware de autenticação do cliente
- mapeamento DTO específico da loja
- mutações apoiadas por fluxo de trabalho
- verificações de propriedade antes da execução da mutação

## 8. Arquitetura da UI do administrador

A UI Admin é implementada como rotas Medusa Admin personalizadas.

Telas atuais:
- página da lista de assinaturas
- página de detalhes da assinatura

Ele também estende a página Medusa `Order detail` integrada com um widget que resolve o link `subscription_order` e renderiza o status da assinatura mais um link para a assinatura vinculada.

### Página da lista

A página da lista é construída com Medusa `DataTable`.

Suporta:
- paginação
- pesquisar
- filtros
- classificação
- ações de linha
- navegação de linha para detalhes

O carregamento de dados segue o padrão Medusa:
- a consulta de exibição sempre carrega na montagem
- consultas modais e de gaveta são separadas da consulta de exibição principal

### Página de detalhes

A página de detalhes contém:
- visão geral da assinatura
- informações sobre clientes e produtos
- endereço de entrega
- visualização de alteração de plano pendente
- menu de ação no canto superior direito

Ele também fornece dois fluxos de edição por meio de gavetas:
- mudança de plano de cronograma
- editar endereço de entrega

Isso corresponde ao padrão Medusa de usar gavetas para editar dados existentes.

## 9. Estratégia de invalidação de consulta

A UI Admin usa invalidação de consulta explícita após mutações.

Após uma mutação bem-sucedida:
- a consulta da lista de assinaturas é invalidada
- a consulta de detalhes da assinatura é invalidada

Isso garante que:
- a página de detalhes permanece atualizada após as edições
- a lista reflete o status mais recente após a navegação de volta

## 10. Tratamento de erros e carregamento

A UI `Subscriptions` segue o tratamento de estado no estilo Medusa:
- páginas de lista usam carregamento de DataTable e estados vazios
- páginas de detalhes mostram carregamento explícito e estados de erro
- gavetas mostram carregamento local e estados de erro para dados somente modais

Isso evita o acoplamento do estado de exibição principal ao carregamento de dados somente da gaveta.

## 11. Estratégia de teste

A área é coberta por:
- testes de módulo/serviço
- testes de fluxo de trabalho e integração de consultas
- testes de integração HTTP administrativos
- teste de integração de fluxo administrativo baseado em cenário

Nota importante:
- não há camada E2E do navegador no plugin atual
- o principal fluxo de negócios ponta a ponta é verificado através de testes de integração apoiados pela Medusa

## 11. Limites de responsabilidade

`Subscriptions` atualmente possui:
- a entidade de assinatura
- Gerenciamento operacional administrativo de assinaturas
- alterações de plano pendentes
- atualizações de endereço de entrega
- materialização do ciclo de vida para `active`, `paused`, `past_due` e `cancelled`
- campos de ciclo de vida como `paused_at`, `cancelled_at`, `cancel_effective_at` e `next_renewal_at`

Ainda não possui:
- regras de definição de oferta e configuração de assinatura
- execução de renovação
- recuperação de pagamentos e cobrança
- estado do processo de cancelamento e retenção
- estado de recomendação de retenção
- histórico de ofertas de retenção
- fluxo de trabalho de classificação do motivo da rotatividade

Essas preocupações são intencionalmente deixadas para áreas posteriores:
- `Plans & Offers`
- `Renewals`
- `Dunning`

A área `Cancellation & Retention` implementada agora adiciona uma camada de processo separada no topo do ciclo de vida da assinatura.

Limite atual com `Cancellation & Retention`:
- `Subscription` continua sendo a fonte da verdade para o estado do ciclo de vida
- `CancellationCase` continua sendo a fonte da verdade para o estado do processo de cancelamento e retenção
- `RetentionOfferEvent` continua sendo a fonte da verdade para o histórico concreto de oferta de retenção

Isso significa:
- `paused` e `cancelled` podem ser materializados por fluxos de trabalho de cancelamento
- mas esses fluxos de trabalho se materializam em `Subscription`, eles não o substituem como proprietário do ciclo de vida
- cancelamento final define `cancel_effective_at`
- cancelamento final limpa `next_renewal_at`
- os resultados retidos não definem `cancel_effective_at`

## 12. Por que esta estrutura

Esta arquitetura mantém o sistema prático:
- as leituras são otimizadas para operações administrativas
- as gravações são centralizadas nos fluxos de trabalho
- O estado da UI é claramente separado da lógica do domínio
- a lógica futura de renovação e cobrança pode ser baseada no mesmo núcleo de assinatura sem reescrever a camada Admin
