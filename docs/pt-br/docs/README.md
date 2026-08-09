# Reorganizar documentos

`Reorder` é um plug-in do Medusa.js para fluxos de comércio recorrentes gerenciados pelo Painel de Administração.

Agora, ela também disponibiliza rotas da API da Loja voltadas para o cliente para finalização de compra de assinaturas, ações relacionadas à conta de assinatura e resolução de ofertas de assinatura na página de detalhes do produto (PDP).

No momento, as seguintes áreas estão implementadas e testadas:
- `Subscriptions`
- `Plans & Offers`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`
- `Activity Log`
- `Analytics`

## Situação atual

Concluído:
- `Subscriptions` modelo de domínio
- `Subscriptions` rotas da API de administração
- `Subscriptions` Interface de usuário de administração: lista, detalhes, ações, alteração de plano, edição de endereço de entrega e widget de detalhes do pedido para assinaturas
- `Subscriptions` testes de integração do backend
- Teste de integração do fluxo administrativo: `Subscriptions`
- Modelo de domínio: `Plans & Offers`
- Rotas da API administrativa: `Plans & Offers`
- Interface do usuário administrativa: fluxos de lista, criação, edição, alternância, filtragem, classificação e seleção: `Plans & Offers`
- Testes de integração do back-end: `Plans & Offers`
- `Plans & Offers` cobertura de integração do fluxo administrativo
- integração de nível básico entre `Plans & Offers` e `Subscriptions`
- `Renewals` modelo de domínio
- `Renewals` rotas da API administrativa
- `Renewals` Interface de usuário administrativa: fluxos de fila, detalhes, aprovação, rejeição e força
- `Renewals` testes de integração do back-end
- `Renewals` cobertura de integração dos fluxos administrativos
- integração de nível básico entre `Renewals`, `Subscriptions` e `Plans & Offers`
- `Renewals` fortalecimento operacional para o agendador e fluxos de execução manual
- `Dunning` modelo de domínio
- `Dunning` rotas da API de administração
- `Dunning` Interface de usuário de administração: fila, detalhes, tentar novamente agora, marcar como recuperado, marcar como não recuperado e substituir agendamento de nova tentativa
- `Dunning` testes de integração do backend
- `Dunning` cobertura de integração do fluxo administrativo
- integração de nível básico entre `Dunning`, `Renewals` e `Subscriptions`
- `Dunning` fortalecimento operacional para o agendador e fluxos de repetição manual
- `Cancellation & Retention` modelo de domínio
- `Cancellation & Retention` rotas da API administrativa
- `Cancellation & Retention` Interface do usuário administrativa: fluxos de fila, detalhes, aplicação de oferta, finalização e atualização de motivo
- `Cancellation & Retention` testes de integração do backend
- Cobertura de integração do fluxo de administração
- Integração de nível básico entre `Cancellation & Retention`, `Subscriptions`, `Renewals` e `Dunning`
- `Cancellation & Retention` fortalecimento operacional para trilha de auditoria, registro estruturado e métricas de resumo do agendador
- `Activity Log` modelo de domínio e armazenamento
- `Activity Log` criação de eventos baseada em fluxo de trabalho entre `Subscriptions`, finalização da assinatura da loja, `Renewals`, `Dunning` e `Cancellation & Retention`
- `Activity Log` rotas da API de administração
- `Activity Log` Interface de usuário de administração: lista global, detalhes do evento e linha do tempo por assinatura
- `Activity Log` testes de integração do back-end e cobertura de integração do fluxo de administração
- `Activity Log` documentação operacional para retenção, monitoramento e limites do roteiro de desenvolvimento
- `Analytics` modelo de domínio e armazenamento de instantâneos diários
- `Analytics` rotas da API de administração para KPIs, tendências, exportação e fluxos de reconstrução
- `Analytics` Interface de usuário de administração: página dedicada à análise com filtros, cartões de KPIs, visualização de tendências e ações de exportação
- `Analytics` testes de integração de back-end e cobertura de integração dos fluxos de administração
- `Analytics` integração da invalidação de cache com `Subscriptions`, `Renewals`, `Dunning` e `Cancellation & Retention`

Em andamento:
- página dedicada à análise e visualizações de relatórios para `Cancellation & Retention`
- futuras extensões operacionais para `Activity Log`, como arquivamento ou exportação

## Mapa da documentação

Utilize esses documentos de acordo com a sua necessidade:

- `specs/`
  Documentos iniciais de projeto e planejamento criados antes ou durante a implementação.
- `architecture/`
  Documentação técnica que descreve como cada área de domínio está estruturada.
- `api/`
  Contratos de API atuais utilizados pelo Admin e por outros usuários.
- `admin/`
  Comportamento da interface do usuário do Admin, telas, ações, filtros e convenções de experiência do usuário.
- `testing/`
  Como os testes são estruturados, o que eles abrangem e como executá-los.

Atualmente, existem documentos de referência oficial de tempo de execução para:

- `Subscriptions`
  - `architecture/subscriptions.md`
  - `api/admin-subscriptions.md`
  - `admin/subscriptions.md`
  - `testing/subscriptions.md`
- `Plans & Offers`
  - `architecture/plan-offers.md`
  - `api/admin-plan-offers.md`
  - `admin/plan-offers.md`
  - `testing/plan-offers.md`
- `Renewals`
  - `architecture/renewals.md`
  - `api/admin-renewals.md`
  - `admin/renewals.md`
  - `testing/renewals.md`
- `Dunning`
  - `architecture/dunning.md`
  - `api/admin-dunning.md`
  - `admin/dunning.md`
  - `testing/dunning.md`
- `Cancellation & Retention`
  - `architecture/cancellation.md`
  - `api/admin-cancellations.md`
  - `admin/cancellations.md`
  - `testing/cancellations.md`
- `Activity Log`
  - `architecture/activity-log.md`
  - `api/admin-activity-log.md`
  - `admin/activity-log.md`
  - `testing/activity-log.md`
  - `roadmap/activity-log.md`
- `Analytics`
  - `architecture/analytics.md`
  - `api/admin-analytics.md`
  - `admin/analytics.md`
  - `testing/analytics.md`

## Ordem de leitura recomendada

Para um novo desenvolvedor que esteja ingressando no projeto:
1. Leia este arquivo.
2. Leia o documento de arquitetura referente à área em que você trabalha.
3. Leia o documento da API referente a essa área.
4. Leia o documento da interface de usuário administrativa caso você trabalhe com fluxos do painel de controle.
5. Leia o documento de testes antes de alterar qualquer comportamento.

## Desenvolvimento local

Para um desenvolvimento rápido em contêineres usando o Docker:
- Consulte `docs/development/docker.md` ou execute `docker compose up -d --build` para iniciar o PostgreSQL, o Redis e o servidor de desenvolvimento do Medusa com o plug-in Reorder e a interface de usuário administrativa pré-configurados.

Para usar o plugin local `reorder` em um backend externo do Medusa durante o desenvolvimento:

- adicione esta dependência no backend do Medusa `package.json`:
  - `"@reorderjs/reorder": "file:../reorder"`
- execute `yarn install` no backend do Medusa após adicionar ou atualizar essa dependência

Quando você fizer alterações neste repositório `reorder` e quiser que o backend do Medusa utilize a versão local mais recente, siga esta sequência:

1. No `reorder`, execute o `yarn medusa plugin:publish`
2. No backend do Medusa, execute o `yarn medusa db:migrate`
3. No backend do Medusa, execute o `yarn install`

Não presuma que o backend do Medusa esteja utilizando o código mais recente do plug-in local até que essa sequência tenha sido concluída.


## Áreas implementadas

As áreas atualmente implementadas são `Subscriptions`, `Plans & Offers`, `Renewals`, `Dunning`, `Cancellation & Retention`, `Activity Log` e `Analytics`.

O `Activity Log` agora está implementado de ponta a ponta como um registro de auditoria de negócios, com APIs de leitura para administradores, uma página dedicada à administração e uma linha do tempo no nível da assinatura.

### Assinaturas

Esta área inclui:
- lista de assinaturas na seção Admin
- página de detalhes da assinatura
- widget de detalhes da assinatura na página padrão de pedidos do Medusa
- ações para pausar, retomar e cancelar
- agendar alteração do plano
- editar endereço de entrega
- filtros, ordenação, paginação e estados de carregamento/erro

### Planos e ofertas

Esta área inclui:
- configuração de ofertas de assinatura no nível do produto e no nível da variante
- frequências permitidas e descontos por frequência
- regras de oferta, como ciclos mínimos, configurações de período de teste e política de acumulação
- página de gerenciamento administrativo com funções para criar, editar, filtrar, classificar e ativar/desativar fluxos
- resolução eficaz da configuração com a semântica de `variant > product`
- integração com a validação de mudança de plano de `Subscriptions`

### Renovações

Esta área inclui:
- fila do ciclo de renovação na Administração
- página de detalhes do ciclo de renovação
- fluxos de aprovação e rejeição para alterações pendentes
- fluxo de renovação forçada
- execução de renovações por meio do agendador e manualmente
- histórico de tentativas e resumos de assinaturas/pedidos vinculados
- integração com a elegibilidade de `Subscriptions` e alterações pendentes
- integração com a validação de políticas do `Plans & Offers` no momento da execução
- criação automática de casos do `Dunning` para falhas de renovação qualificadas para pagamento
- fortalecimento operacional por meio de bloqueio de fluxos de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

### Cobrança

Esta área inclui:
- lista de casos de cobrança em Admin
- página de detalhes do caso de cobrança
- ação “repetir agora”
- ações “marcar como recuperado” e “marcar como não recuperado”
- substituição da programação de repetição
- execução de repetição por meio do agendador
- histórico de tentativas e resumos vinculados de assinaturas, renovações e pedidos
- integração com falhas qualificadas para pagamento `Renewals`
- integração com o estado do ciclo de vida `Subscriptions` por meio de `past_due` e recuperação de volta para `active`
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

### Cancelamento e retenção

Esta área inclui:
- lista de casos de cancelamento na Administração
- página de detalhes do caso de cancelamento
- fluxo de aplicação da oferta de retenção para `pause`, `discount` e `bonus`
- fluxo de atualização do motivo
- fluxo de finalização do cancelamento
- histórico de ofertas e linha do tempo do resultado final
- integração com o estado do ciclo de vida de `Subscriptions`
- integração com `Renewals` por meio do resumo de renovação e dos efeitos sobre a elegibilidade para renovação
- integração com `Dunning` por meio da coexistência de casos ativos e do resumo de cobranças vinculadas
- fortalecimento operacional por meio de trilha de auditoria, registros estruturados e métricas de resumo do agendador

### Registro de atividades

Esta área inclui:
- armazenamento `subscription_log` somente para adição e criação de eventos apoiada por fluxo de trabalho
- cobertura de auditoria de negócios entre domínios para `Subscriptions`, `Renewals`, `Dunning` e `Cancellation & Retention`
- página de lista de administradores com filtragem, classificação, paginação e detalhes de eventos
- linha do tempo por assinatura na página de detalhes da assinatura
- modelo de leitura “snapshot-first” e rotas da API de leitura para administradores
- cobertura de back-end para normalização, criação de eventos, contratos de API e integração do fluxo administrativo

### Análises

Esta área inclui:
- armazenamento de instantâneos diários de análises e suporte ao fluxo de trabalho de reconstrução;
- relatórios de KPIs para `MRR`, `Churn Rate`, `LTV` e `Active Subscriptions`;
- relatórios de tendências agrupados por `day`, `week` e `month`;
- página de análises de administração com filtros, cartões de KPIs, visualização de tendências e ações de exportação
- rotas da API de administração para fluxos de KPIs, tendências, exportação e reconstrução
- cobertura de back-end para fórmulas de análise, modelos de leitura, contratos de API e fluxos de relatórios de administração

## Notas

- Os documentos em `specs/` são documentos de fase de projeto. Eles são úteis para contextualização, mas não devem ser considerados como a fonte definitiva de informação à medida que a implementação evolui.
- Os documentos em `architecture/`, `api/`, `admin/` e `testing/` constituem a fonte definitiva de informação em tempo de execução para o comportamento implementado.
- O plano de implementação continua sendo o roteiro para trabalhos futuros, enquanto a documentação de tempo de execução deve descrever o estado atual do plug-in.
