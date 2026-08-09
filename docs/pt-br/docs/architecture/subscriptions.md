# Arquitetura de Assinaturas (Subscriptions)

Este documento descreve a arquitetura atual da área de `Assinaturas` (`Subscriptions`) no plugin `Reorder`.

O foco está no sistema implementado em produção, e não nas premissas iniciais de design.

## Objetivo

A área de `Assinaturas` fornece aos usuários do painel administrativo (Admin) uma visão operacional completa sobre as assinaturas recorrentes.

A implementação atual suporta:
- Listagem de assinaturas com filtros, busca e paginação
- Visualização detalhada de cada assinatura
- Exibição de contexto de assinatura na tela padrão de detalhes de pedido do Medusa
- Exibição de contexto de desconto de assinatura na tela padrão de pedidos do Medusa
- Pausar assinaturas (`pause`)
- Retomar assinaturas (`resume`)
- Cancelar assinaturas (`cancel`)
- Agendamento de alterações de plano (`schedule-plan-change`)
- Edição do endereço de entrega (`shipping_address`)
- Pular a próxima entrega (`skip-next-delivery`)
- Criação de assinaturas a partir de carrinhos da loja (`carts`)
- API Store voltada ao cliente para ações de autoatendimento da assinatura e consulta de ofertas PDP

## Visão Geral da Arquitetura

A implementação está dividida em cinco camadas principais:

1. **Módulo de Domínio (`domain module`)**
2. **Workflows (`workflows`)**
3. **API Admin (`admin API`)**
4. **API Store (`store API`)**
5. **Interface do Admin (`admin UI`)**

Cada camada possui uma responsabilidade clara e bem delimitada:

- O **módulo de domínio** é proprietário do modelo de dados de assinatura e da persistência no banco de dados.
- Os **workflows** gerenciam as mutações de regras de negócio de forma transacional e orquestrada.
- A **API Admin** expõe endpoints de leitura e escrita seguros para o painel de administração.
- A **API Store** expõe endpoints seguros para a vitrine/storefront voltados ao portal do cliente e à PDP.
- A **UI do Admin** renderiza as visões de lista e detalhes, consumindo os endpoints da API Admin.

---

## 1. Módulo de Domínio

O módulo customizado `subscription` é a fonte proprietária do domínio de comércio recorrente.

Ele contém:
- Tipos de domínio estritos (`types/`)
- Modelo de dados relacional (`models/`)
- Camada de serviço de banco de dados (`service.ts`)
- Definição e exportação do módulo Medusa (`index.ts`)

### Decisão Principal de Design:
- A entidade de assinatura armazena o estado operacional necessário para o Admin e para os futuros fluxos de renovação diretamente no seu próprio modelo.
- Os modelos de leitura do Admin realizam enriquecimento em tempo de execução a partir de registros vinculados de clientes e produtos quando disponíveis.
- *Snapshots* persistidos permanecem na assinatura como fallback operacional e contexto histórico imutável.

Isso mantém o modelo operacional estável e desacoplado, permitindo que o Admin exiba dados dinâmicos do cliente e do catálogo de produtos.

---

## 2. Modelo de Dados

O modelo `subscription` armazena:
- Campos de identidade e ciclo de vida
- Campos de frequência e recorrência
- Campos de agendamento de cobrança
- Flags operacionais de controle
- *Snapshots* em formato JSON utilizados pelo Admin e pelo motor de renovação

### Campos Escalares Principais:
- `id`: Identificador único da assinatura (ex: `sub_01...`)
- `reference`: Código de referência legível para humanos (ex: `SUB-1001`)
- `status`: Estado atual (`active`, `paused`, `past_due`, `cancelled`)
- `customer_id`: Identificador do cliente vinculado no Medusa
- `product_id`: Identificador do produto base
- `variant_id`: Identificador da variante de produto vinculada
- `frequency_interval`: Unidade de intervalo (`week`, `month`, `year`)
- `frequency_value`: Valor multiplicador da frequência (ex: a cada `2` meses)
- `started_at`: Timestamp de início da assinatura
- `next_renewal_at`: Timestamp da próxima cobrança/renovação agendada
- `last_renewal_at`: Timestamp da última renovação executada com sucesso
- `paused_at`: Timestamp de quando a assinatura foi pausada
- `cancelled_at`: Timestamp de quando a assinatura foi cancelada
- `cancel_effective_at`: Data efetiva de encerramento dos benefícios
- `skip_next_cycle`: Flag booleana indicando se o próximo ciclo deve ser pulado
- `is_trial`: Flag booleana indicando se a assinatura está em período de teste
- `trial_ends_at`: Data de término do período de teste

### Campos de Snapshot JSON:
- `customer_snapshot`: Dados cadastrais do cliente no momento da contratação
- `product_snapshot`: Título do produto, título da variante e SKU
- `pricing_snapshot`: Informações de desconto aplicado, tipo e valor
- `shipping_address`: Snapshot completo do endereço de entrega
- `pending_update_data`: Detalhes de alterações de plano agendadas
- `metadata`: Metadados customizados adicionais

### Por que Snapshots são Utilizados:
- O Admin deve exibir uma imagem consistente e auditável da assinatura, mesmo se o produto ou cliente forem alterados ou deletados posteriormente no catálogo.
- A lógica de renovação automática necessita de dados operacionais locais à assinatura para processamento offline.
- O modelo de leitura utiliza o snapshot como contingência (*fallback*) caso os registros do Medusa estejam temporariamente inacessíveis.

---

## 3. Fluxo de Leitura (Read Path)

O fluxo de leitura é otimizado para alto desempenho e paginação no Admin:

### Componentes Principais:
- Handlers de rotas sob `src/api/admin/subscriptions`
- Utilitários de normalização em `src/api/admin/subscriptions/utils.ts`
- Helpers de consulta em `src/modules/subscription/utils/admin-query.ts`

### Fluxo de Listagem (`List Flow`):
1. A interface Admin envia parâmetros de consulta para `GET /admin/subscriptions`.
2. A rota valida e normaliza os filtros recebidos.
3. A função `listAdminSubscriptions(...)` constrói as cláusulas de filtragem e ordenação.
4. A camada de consulta lê as assinaturas via `query.graph(...)` do Medusa.
5. Os dados de exibição do cliente e do produto são enriquecidos em tempo de consulta com fallback para snapshots.
6. Os registros são mapeados para DTOs consumidos pelo componente `DataTable`.

### Fluxo de Detalhes (`Detail Flow`):
1. A interface Admin requisita `GET /admin/subscriptions/:id`.
2. A rota resolve a assinatura por meio do helper de consulta do grafo.
3. O resultado é transformado no DTO detalhado de assinatura.
4. A página de detalhes renderiza o estado da assinatura e a prévia de alterações de plano pendentes.

Os modelos de leitura expõem:
- `next_renewal_at`: A âncora técnica de faturamento utilizada pelo scheduler de renovação.
- `effective_next_renewal_at`: A data de entrega projetada visível no Admin e no Storefront quando `skip_next_cycle` está ativo.

---

## 4. Fluxo de Escrita (Write Path)

Todas as operações de alteração de estado são canalizadas exclusivamente através de **Workflows**:

### Mutações Implementadas:
- `pause`: Pausa uma assinatura ativa
- `resume`: Retoma uma assinatura pausada
- `cancel`: Cancela a assinatura
- `schedule-plan-change`: Agenda a troca de variante ou frequência
- `update-shipping-address`: Atualiza o endereço de entrega
- `skip-next-delivery`: Pula a próxima data de ciclo
- `create-subscription-from-cart`: Criação de assinatura originada de checkout na loja

### Padrão do Fluxo de Escrita:
1. A interface Admin submete a mutação para a rota administrativa.
2. A rota valida o corpo da requisição via schema Zod.
3. A rota executa o workflow correspondente injetando o escopo do container.
4. O workflow executa validações de transição de estado, grava os logs de auditoria e persiste as alterações.
5. A rota retorna o payload atualizado da assinatura.

---

## 5. Fluxos da Storefront (API Store)

### 1. Fluxo de Compra e Checkout (`Store Purchase Flow`):
- `POST /store/carts/:id/sync-subscription-pricing`
- `POST /store/carts/:id/subscribe`
- `create-subscription-from-cart`

O fluxo valida os metadados da assinatura no item do carrinho, sincroniza o desconto para a frequência selecionada, bloqueia carrinhos mistos não suportados, conclui o pedido padrão do Medusa (`order`), verifica a idempotência via link `subscription-order`, cria a `subscription`, registra o evento no `activity-log` e agenda o primeiro `renewal_cycle`.

### 2. Fluxo do Portal do Cliente (`Customer Account Flow`):
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

Estas rotas exigem autenticação do cliente, validam o isolamento de tenant (IDOR), reutilizam os workflows centrais e retornam DTOs específicos e seguros para o cliente final.

### 3. Fluxo de Ofertas na Página do Produto (`Store PDP Offer Flow`):
- `GET /store/products/:id/subscription-offer`

Resolve a configuração efetiva com precedência `variante > produto` e retorna opções de frequências e descontos para o seletor da PDP.

---

## 6. Limites de Responsabilidade do Módulo

O módulo `Subscriptions` gerencia diretamente:
- A entidade principal de assinatura e seus campos de ciclo de vida
- Gestão operacional e mutações manuais do Admin
- Alterações de plano agendadas e edição de endereço
- Materialização de status (`active`, `paused`, `past_due`, `cancelled`)

Ele **não gerencia** diretamente (delegando aos módulos especializados):
- Regras de catálogo e matrizes de desconto -> Delegado ao módulo `Plan & Offer`
- Execução de cobrança e agendamento em lote -> Delegado ao módulo `Renewals`
- Recuperação de falha de pagamento -> Delegado ao módulo `Dunning`
- Máquina de estados de retenção e pesquisa de motivos -> Delegado ao módulo `Cancellation & Retention`
- Auditoria centralizada -> Delegado ao módulo `Activity Log`
- Métricas e KPIs -> Delegado ao módulo `Analytics`
