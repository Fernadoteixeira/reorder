# Reordenar documentos

`Reorder` é um plugin Medusa.js para fluxos de comércio recorrentes gerenciados pelo Admin.

Agora ele também expõe rotas de API da Loja voltadas para o cliente para check-out de assinatura, ações de conta de assinatura e resolução de oferta de assinatura PDP.

No momento, as seguintes áreas estão implementadas e testadas:
- `Assinaturas`
- `Planos e Ofertas`
- `Renovações`
- `Cobrança`
- `Cancelamento e Retenção`
- `Registro de atividades`
- `Analítica`

## Status atual

Concluído:
- Modelo de domínio `Assinaturas`
- Rotas da API administrativa de `Assinaturas`
- UI de administração de `Assinaturas`: lista, detalhes, ações, mudança de plano, edição de endereço de entrega e widget de assinatura com detalhes do pedido
- Testes de integração de back-end de `Assinaturas`
- Teste de integração do fluxo administrativo de `Assinaturas`
- Modelo de domínio `Planos e Ofertas`
- Rotas da API de administração `Planos e Ofertas`
- UI de administração `Planos e ofertas`: listar, criar, editar, alternar, filtrar, classificar e selecionar fluxos
- Testes de integração de back-end de `Planos e Ofertas`
- Cobertura de integração de fluxo administrativo de `Planos e Ofertas`
- integração de nível de fumaça entre `Planos e Ofertas` e `Assinaturas`
- Modelo de domínio `Renovações`
- Rotas da API administrativa de `renovações`
- UI de administração de `Renovações`: fluxos de fila, detalhe, aprovação, rejeição e força
- Testes de integração de back-end de `Renovações`
- Cobertura de integração de fluxo administrativo de `renovações`
- integração de nível de fumaça entre `Renovações`, `Assinaturas` e `Planos e Ofertas`
- Fortalecimento operacional de `renovações` para fluxos de agendamento e execução manual
- Modelo de domínio `Dunning`
- Rotas da API de administração `Dunning`
- UI de administração `Dunning`: fila, detalhes, tentar novamente agora, marcar como recuperado, marcar como não recuperado e substituir a programação de novas tentativas
- Testes de integração de back-end `Dunning`
- Cobertura de integração de fluxo administrativo `Dunning`
- integração de nível de fumaça entre `Dunning`, `Renovações` e `Assinaturas`
- Proteção operacional `Dunning` para fluxos de agendador e de repetição manual
- Modelo de domínio `Cancelamento e Retenção`
- Rotas da API administrativa `Cancelamento e retenção`
- UI de administração `Cancelamento e retenção`: fluxos de fila, detalhes, aplicação de oferta, finalização e atualização de motivo
- Testes de integração de back-end `Cancelamento e Retenção`
- Cobertura de integração de fluxo administrativo `Cancelamento e retenção`
- integração de nível de fumaça entre `Cancelamento e Retenção`, `Assinaturas`, `Renovações` e `Dunning`
- Reforço operacional de `Cancelamento e Retenção` para trilha de auditoria, registro estruturado e métricas de resumo do agendador
- Modelo de domínio e armazenamento `Registro de atividades`
- Criação de eventos com base no fluxo de trabalho `Registro de atividades` em `Assinaturas`, check-out de assinaturas de lojas, `Renovações`, `Dunning` e `Cancelamento e retenção`
- Rotas da API administrativa do `Registro de atividades`
- UI de administração `Registro de atividades`: lista global, detalhes do evento e cronograma por assinatura
- Testes de integração de back-end `Log de atividades` e cobertura de integração de fluxo administrativo
- Documentação operacional `Registro de atividades` para retenção, monitoramento e limites do roteiro
- Modelo de domínio `Analytics` e armazenamento diário de snapshots
- Rotas de API administrativa `Analytics` para KPI, tendências, exportação e fluxos de reconstrução
- UI de administração `Analytics`: página de análise dedicada com filtros, cartões KPI, visualização de tendências e ações de exportação
- Testes de integração de back-end `Analytics` e cobertura de integração de fluxo administrativo
- Integração de invalidação de cache `Analytics` com `Assinaturas`, `Renovações`, `Dunning` e `Cancelamento e Retenção`

Em andamento:
- página de análise dedicada e visualizações de relatórios para `Cancelamento e retenção`
- futuras extensões operacionais para `Registro de atividades`, como arquivamento ou exportação

## Mapa de documentação

Use estes documentos dependendo do que você precisa:

- `especificações/`
  Documentos iniciais de projeto e planejamento criados antes ou durante a implementação.
- `arquitetura/`
  Documentação técnica que descreve como cada área de domínio está estruturada.
- `api/`
  Contratos de API atuais usados pelo administrador e outros consumidores.
- `administrador/`
  Comportamento da UI do administrador, telas, ações, filtros e convenções de UX.
- `testando/`
  Como os testes são estruturados, o que é abordado e como executá-los.

Documentos de fonte de verdade em tempo de execução existem atualmente para:

- `Assinaturas`
  - `arquitetura/subscrições.md`
  - `api/admin-subscriptions.md`
  - `admin/subscrições.md`
  - `testing/subscriptions.md`
- `Planos e Ofertas`
  - `arquitetura/plan-offers.md`
  - `api/admin-plan-offers.md`
  - `admin/plan-offers.md`
  - `testing/plan-offers.md`
- `Renovações`
  - `arquitetura/renovações.md`
  - `api/admin-renewals.md`
  - `admin/renovações.md`
  - `testes/renovações.md`
- `Cobrança`
  - `arquitetura/dunning.md`
  - `api/admin-dunning.md`
  - `admin/dunning.md`
  - `testing/dunning.md`
- `Cancelamento e Retenção`
  - `arquitetura/cancelamento.md`
  - `api/admin-cancellations.md`
  - `admin/cancelamentos.md`
  - `testing/cancelamentos.md`
- `Registro de atividades`
  - `arquitetura/log de atividades.md`
  - `api/admin-activity-log.md`
  - `admin/log de atividades.md`
  - `testing/log de atividades.md`
  - `roteiro/log de atividades.md`
- `Analítica`
  - `arquitetura/analítica.md`
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
- Consulte `docs/development/docker.md` ou execute `docker compose up -d --build` para ativar PostgreSQL, Redis e o servidor de desenvolvimento Medusa com o plugin Reorder e Admin UI pré-configurados.

Para usar o plugin `reorder` local em um backend externo da Medusa durante o desenvolvimento:

- adicione esta dependência no backend Medusa `package.json`:
  - `"@reorderjs/reordenar": "arquivo:../reordenar"`
- execute `yarn install` no backend do Medusa após adicionar ou atualizar essa dependência

Quando você fizer alterações neste repositório `reorder` e quiser que o backend do Medusa use a versão local mais recente, use esta sequência:

1. Em `reorder`, execute `yarn medusa plugin:publish`
2. No backend do Medusa, execute `yarn medusa db:migrate`
3. No backend do Medusa, execute `yarn install`

Não presuma que o back-end do Medusa está usando o código do plug-in local mais recente até que a sequência seja concluída.


## Áreas Implementadas

As áreas atualmente implementadas são `Assinaturas`, `Planos e Ofertas`, `Renovações`, `Cobrança`, `Cancelamento e Retenção`, `Registro de Atividades` e `Analítica`.

O `Registro de atividades` agora é implementado de ponta a ponta como uma trilha de auditoria de negócios com APIs de leitura de administrador, uma página de administração dedicada e um cronograma de nível de assinatura.

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
- integração com validação de mudança de plano de `Assinaturas`

### Renovações

Esta área inclui:
- fila do ciclo de renovação no Admin
- página de detalhes do ciclo de renovação
- aprovar e rejeitar fluxos para alterações pendentes
- forçar o fluxo de renovação
- execução de renovação manual e apoiada por agendador
- histórico de tentativas e resumos de assinaturas/pedidos vinculados
- integração com elegibilidade para `Assinaturas` e alterações pendentes
- integração com validação de política `Planos e Ofertas` em tempo de execução
- criação automática de casos de cobrança para falhas de renovação qualificadas para pagamento
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

### Cobrança

Esta área inclui:
- lista de casos de cobrança em Admin
- página de detalhes do caso de cobrança
- ação “repetir agora”
- ações “marcar como recuperado” e “marcar como não recuperado”
- substituição da programação de novas tentativas;
- execução de novas tentativas por meio do agendador;
- histórico de tentativas e resumos vinculados de assinaturas, renovações e pedidos;
- integração com falhas qualificadas para pagamento em `Renovações`;
- integração com o estado do ciclo de vida em `Assinaturas` por meio de `past_due` e recuperação para `ativo`;
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

### Cancelamento e retenção

Esta área inclui:
- lista de casos de cancelamento na Administração
- página de detalhes do caso de cancelamento
- fluxo de aplicação de ofertas de retenção para `pausa`, `desconto` e `bônus`
- fluxo de atualização do motivo;
- fluxo de finalização do cancelamento;
- histórico de ofertas e linha do tempo do resultado final;
- integração com o estado do ciclo de vida de `Assinaturas`;
- integração com `Renovações` por meio do resumo de renovações e dos efeitos de elegibilidade para renovação;
- integração com `Cobranças` por meio da coexistência de casos ativos e do resumo de cobranças vinculado;
- fortalecimento operacional por meio de trilha de auditoria, logs estruturados e métricas de resumo do agendador

### Registro de atividades

Esta área inclui:
- armazenamento `subscription_log` somente para adição e criação de eventos com suporte de fluxo de trabalho
- cobertura de auditoria de negócios entre domínios para `Assinaturas`, `Renovações`, `Cobranças em atraso` e `Cancelamento e Retenção`
- página de lista de administradores com filtragem, classificação, paginação e detalhes de eventos
- linha do tempo por assinatura na página de detalhes da assinatura
- modelo de leitura “snapshot-first” e rotas da API de leitura para administradores
- cobertura de back-end para normalização, criação de eventos, contratos de API e integração do fluxo administrativo

### Análises

Esta área inclui:
- armazenamento de instantâneos diários de análises e suporte ao fluxo de trabalho de reconstrução;
- relatórios de KPIs para `MRR`, `Taxa de cancelamento`, `LTV` e `Assinaturas ativas`;
- relatórios de tendências agrupados por `dia`, `semana` e `mês`;
- página de análises de administração com filtros, cartões de KPIs, visualização de tendências e ações de exportação;
- rotas da API de administração para KPIs, tendências, exportação e fluxos de reconstrução;
- cobertura de back-end para fórmulas de análise, modelos de leitura, contratos de API e fluxos de relatórios de administração

## Notas

- Os documentos na pasta `specs/` são documentos de fase de projeto. Eles são úteis para contextualização, mas não devem ser considerados como a fonte definitiva de informação à medida que a implementação evolui.
- Os documentos nas pastas `architecture/`, `api/`, `admin/` e `testing/` constituem a fonte definitiva de informação em tempo de execução para o comportamento implementado.
- O plano de implementação continua sendo o roteiro para trabalhos futuros, enquanto a documentação de tempo de execução deve descrever o estado atual do plug-in.
