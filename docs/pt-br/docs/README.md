# Reordenar documentos

`Reorder` é um plugin Medusa.js para fluxos comerciais recorrentes gerenciados pelo Admin.

Agora ele também expõe rotas de API da Loja voltadas para o cliente para check-out de assinatura, ações de conta de assinatura e resolução de oferta de assinatura PDP.

No momento, as seguintes áreas estão implementadas e testadas:
- `Subscriptions`
- `Plans & Offers`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`
- `Activity Log`
- `Analytics`

## Status atual

Concluído:
- modelo de domínio `Subscriptions`
- `Subscriptions` rotas de API de administração
- `Subscriptions` Admin UI: lista, detalhes, ações, mudança de plano, edição de endereço de entrega e widget de assinatura com detalhes do pedido
- `Subscriptions` testes de integração de back-end
- `Subscriptions` teste de integração de fluxo administrativo
- modelo de domínio `Plans & Offers`
- `Plans & Offers` rotas de API de administração
- `Plans & Offers` Admin UI: listar, criar, editar, alternar, filtrar, classificar e selecionar fluxos
- `Plans & Offers` testes de integração de back-end
- `Plans & Offers` cobertura de integração de fluxo administrativo
- integração do nível de fumaça entre `Plans & Offers` e `Subscriptions`
- modelo de domínio `Renewals`
- `Renewals` rotas de API de administração
- `Renewals` UI Admin: fila, detalhes, aprovação, rejeição e fluxos forçados
- `Renewals` testes de integração de back-end
- `Renewals` cobertura de integração de fluxo administrativo
- integração do nível de fumaça entre `Renewals`, `Subscriptions` e `Plans & Offers`
- `Renewals` fortalecimento operacional para agendadores e fluxos de execução manual
- modelo de domínio `Dunning`
- `Dunning` rotas de API de administração
- `Dunning` UI de administração: fila, detalhes, tentar novamente agora, marcar como recuperado, marcar como não recuperado e substituir a programação de novas tentativas
- `Dunning` testes de integração de back-end
- `Dunning` cobertura de integração de fluxo administrativo
- integração do nível de fumaça entre `Dunning`, `Renewals` e `Subscriptions`
- `Dunning` fortalecimento operacional para agendador e fluxos de repetição manual
- modelo de domínio `Cancellation & Retention`
- `Cancellation & Retention` rotas de API de administração
- `Cancellation & Retention` UI de administração: fluxos de fila, detalhes, aplicação de oferta, finalização e atualização de motivo
- `Cancellation & Retention` testes de integração de back-end
- `Cancellation & Retention` cobertura de integração de fluxo administrativo
- integração do nível de fumaça entre `Cancellation & Retention`, `Subscriptions`, `Renewals` e `Dunning`
- `Cancellation & Retention` fortalecimento operacional para trilha de auditoria, registro estruturado e métricas de resumo do agendador
- `Activity Log` modelo de domínio e armazenamento
- `Activity Log` criação de eventos apoiados por fluxo de trabalho em `Subscriptions`, checkout de assinatura de loja, `Renewals`, `Dunning` e `Cancellation & Retention`
- `Activity Log` rotas de API de administração
- `Activity Log` Admin UI: lista global, detalhes do evento e cronograma por assinatura
- `Activity Log` testes de integração de back-end e cobertura de integração de fluxo administrativo
- `Activity Log` documentação operacional para retenção, monitoramento e limites do roteiro
- Modelo de domínio `Analytics` e armazenamento diário de snapshots
- `Analytics` rotas de API administrativa para KPI, tendências, exportação e fluxos de reconstrução
- `Analytics` Admin UI: página de análise dedicada com filtros, cartões KPI, visualização de tendências e ações de exportação
- `Analytics` testes de integração de back-end e cobertura de integração de fluxo administrativo
- Integração de invalidação de cache `Analytics` com `Subscriptions`, `Renewals`, `Dunning` e `Cancellation & Retention`

Em andamento:
- página de análise dedicada e visualizações de relatórios para `Cancellation & Retention`
- futuras extensões operacionais para `Activity Log`, como arquivamento ou exportação

## Mapa de documentação

Use estes documentos dependendo do que você precisa:

- `specs/`
  Documentos iniciais de projeto e planejamento criados antes ou durante a implementação.
- `architecture/`
  Documentação técnica que descreve como cada área de domínio está estruturada.
- `api/`
  Contratos de API atuais usados pelo administrador e outros consumidores.
- `admin/`
  Comportamento da UI do administrador, telas, ações, filtros e convenções de UX.
- `testing/`
  Como os testes são estruturados, o que é abordado e como executá-los.

Documentos de fonte de verdade em tempo de execução existem atualmente para:

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
  -`architecture/dunning.md`
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

Para um novo desenvolvedor ingressando no projeto:
1. Leia este arquivo.
2. Leia o documento de arquitetura da área em que você trabalha.
3. Leia o documento da API dessa área.
4. Leia o documento Admin UI se você tocar nos fluxos do painel.
5. Leia o documento de teste antes de mudar de comportamento.

## Desenvolvimento Local

Para desenvolvimento rápido em contêineres usando Docker:
- Consulte `docs/development/docker.md` ou execute `docker compose up -d --build` para ativar o PostgreSQL, Redis e o servidor de desenvolvimento Medusa com o plug-in Reorder e a UI Admin pré-configurados.

Para usar o plugin `reorder` local em um backend externo da Medusa durante o desenvolvimento:

- adicione esta dependência no backend Medusa `package.json`:
  - `"@reorderjs/reorder": "file:../reorder"`
- execute `yarn install` no backend do Medusa após adicionar ou atualizar essa dependência

Quando você fizer alterações neste repositório `reorder` e quiser que o backend do Medusa use a versão local mais recente, use esta sequência:

1. Em `reorder`, execute `yarn medusa plugin:publish`
2. No back-end do Medusa, execute `yarn medusa db:migrate`
3. No back-end do Medusa, execute `yarn install`

Não presuma que o back-end do Medusa está usando o código do plug-in local mais recente até que a sequência seja concluída.


## Áreas Implementadas

As áreas atualmente implementadas são `Subscriptions`, `Plans & Offers`, `Renewals`, `Dunning`, `Cancellation & Retention`, `Activity Log` e `Analytics`.

`Activity Log` agora é implementado de ponta a ponta como uma trilha de auditoria de negócios com APIs de leitura de administrador, uma página de administração dedicada e um cronograma de nível de assinatura.

### Assinaturas

Esta área inclui:
- lista de assinaturas no Admin
- página de detalhes da assinatura
- widget de assinatura com detalhes do pedido na página de pedido padrão da Medusa
- pausar, retomar e cancelar ações
- mudança de plano de cronograma
- editar endereço de entrega
- filtros, classificação, paginação e estados de carregamento/erro

### Planos e Ofertas

Esta área inclui:
- configuração de oferta de assinatura em nível de produto e variante
- frequências permitidas e descontos por frequência
- oferecer regras como ciclos mínimos, configurações de teste e política de empilhamento
- Página de gerenciamento administrativo com criação, edição, filtragem, classificação e alternância de fluxos
- resolução de configuração eficaz com semântica `variant > product`
- integração com validação de mudança de plano `Subscriptions`

### Renovações

Esta área inclui:
- fila do ciclo de renovação no Admin
- página de detalhes do ciclo de renovação
- aprovar e rejeitar fluxos para alterações pendentes
- forçar o fluxo de renovação
- execução de renovação manual e apoiada por agendador
- histórico de tentativas e resumos de assinaturas/pedidos vinculados
- integração com elegibilidade `Subscriptions` e alterações pendentes
- integração com validação de política `Plans & Offers` em tempo de execução
- criação automática de casos `Dunning` para falhas de renovação qualificadas para pagamento
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

### Cobrança

Esta área inclui:
- lista de casos de cobrança no Admin
- página de detalhes do caso de cobrança
- ação repetir agora
- marcar recuperadas e marcar ações não recuperadas
- tentar novamente a substituição do agendamento
- execução de nova tentativa apoiada pelo agendador
- histórico de tentativas e resumos de assinaturas, renovações e pedidos vinculados
- integração com `Renewals` falhas qualificadas para pagamento
- integração com o estado do ciclo de vida `Subscriptions` através de `past_due` e recuperação de volta para `active`
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

### Cancelamento e retenção

Esta área inclui:
- lista de casos de cancelamento no Admin
- página de detalhes do caso de cancelamento
- aplicar fluxo de oferta de retenção para `pause`, `discount` e `bonus`
- atualizar o fluxo do motivo
- finalizar o fluxo de cancelamento
- oferecer histórico e cronograma do resultado final
- integração com o estado do ciclo de vida `Subscriptions`
- integração com `Renewals` por meio de resumo de renovação e efeitos de elegibilidade de renovação
- integração com `Dunning` através da coexistência de casos ativos e resumo de cobrança vinculado
- fortalecimento operacional por meio de trilha de auditoria, logs estruturados e métricas de resumo do agendador

### Registro de atividades

Esta área inclui:
- armazenamento `subscription_log` somente para acréscimos e criação de eventos com suporte de fluxo de trabalho
- cobertura de auditoria empresarial entre domínios para `Subscriptions`, `Renewals`, `Dunning` e `Cancellation & Retention`
- Página da lista de administradores com filtragem, classificação, paginação e detalhes do evento
- cronograma por assinatura na página de detalhes da assinatura
- modelo de leitura instantânea e rotas de API de leitura administrativa
- cobertura de back-end para normalização, criação de eventos, contratos de API e integração de fluxo administrativo

### Análise

Esta área inclui:
- armazenamento diário de instantâneos analíticos e suporte ao fluxo de trabalho de reconstrução
- Relatórios de KPI para `MRR`, `Churn Rate`, `LTV` e `Active Subscriptions`
- relatórios de tendências agrupados por `day`, `week` e `month`
- Página de análise de administração com filtros, cartões KPI, visualização de tendências e ações de exportação
- Rotas da API Admin para fluxos de KPI, tendências, exportação e reconstrução
- cobertura de back-end para fórmulas analíticas, modelos de leitura, contratos de API e fluxos de relatórios administrativos

## Notas

- Os documentos em `specs/` são documentos em tempo de design. São úteis para contextualizar, mas não devem ser tratados como a fonte final da verdade depois que a implementação evolui.
- Os documentos em `architecture/`, `api/`, `admin/` e `testing/` são a fonte de verdade em tempo de execução para o comportamento implementado.
- O plano de implementação continua sendo o roteiro para trabalhos futuros, enquanto a documentação do tempo de execução deve descrever o estado atual do plugin.
