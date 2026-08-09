# Reorganizar documentos

O `Reorder` é um plug-in do Medusa.js para fluxos de comércio recorrentes gerenciados pelo Painel de Administração.

Agora, ela também disponibiliza rotas da API da Loja voltadas para o cliente para finalização de compra de assinaturas, ações relacionadas à conta de assinatura e resolução de ofertas de assinatura na página de detalhes do produto (PDP).

No momento, as seguintes áreas estão implementadas e testadas:
- `Assinaturas`
- `Planos e ofertas`
- `Renovações`
- `Cobranças em atraso`
- `Cancelamento e retenção`
- `Registro de atividades`
- `Análises`

## Situação atual

Concluído:
- Modelo de domínio `Assinaturas`
- Rotas da API de administração de `Assinaturas`
- Interface de usuário de administração de `Assinaturas`: lista, detalhes, ações, alteração de plano, edição de endereço de entrega e widget de assinatura nos detalhes do pedido
- Testes de integração do back-end de `Assinaturas`
- Teste de integração do fluxo de administração de `Assinaturas`
- Modelo de domínio `Planos e Ofertas`
- Rotas da API de administração de `Planos e Ofertas`
- Interface de usuário de administração de `Planos e Ofertas`: lista, criação, edição, ativação/desativação, filtragem, classificação e fluxos de seleção
- Testes de integração de back-end de `Planos e Ofertas`
- Cobertura de integração do fluxo de administração de `Planos e Ofertas`
- Integração de nível básico entre `Planos e Ofertas` e `Assinaturas`
- Modelo de domínio `Renovações`
- Rotas da API administrativa de `Renovações`
- Interface do usuário administrativa de `Renovações`: fluxos de fila, detalhes, aprovação, rejeição e forçamento
- Testes de integração do back-end de `Renovações`
- Cobertura de integração do fluxo administrativo de `Renovações`
- Integração de nível básico entre `Renovações`, `Assinaturas` e `Planos e Ofertas`
- Fortalecimento operacional de `Renovações` para fluxos de agendamento e execução manual
- Modelo de domínio `Cobranças`
- Rotas da API de administração de `Cobranças`
- Interface de usuário de administração de `Cobranças`: fila, detalhes, tentar novamente agora, marcar como recuperado, marcar como não recuperado e substituir agendamento de nova tentativa
- Testes de integração do backend de `Dunning`
- Cobertura de integração do fluxo administrativo de `Dunning`
- Integração de nível básico entre `Dunning`, `Renewals` e `Subscriptions`
- Fortalecimento operacional de `Dunning` para os fluxos do agendador e de repetição manual de tentativas
- Modelo de domínio de `Cancellation & Retention`
- Rotas da API administrativa de `Cancellation & Retention`
- Interface de usuário administrativa de `Cancelamento e Retenção`: fluxos de fila, detalhes, aplicação de oferta, finalização e atualização do motivo
- Testes de integração do backend de `Cancelamento e Retenção`
- Cobertura de integração dos fluxos administrativos de `Cancelamento e Retenção`
- Integração de nível básico entre `Cancelamento e Retenção`, `Assinaturas`, `Renovações` e `Cobrança`
- Fortalecimento operacional de `Cancelamento e Retenção` para trilha de auditoria, registro estruturado e métricas de resumo do agendador
- Modelo de domínio e armazenamento do `Registro de Atividades`
- Criação de eventos baseada em fluxo de trabalho do `Registro de Atividades` em `Assinaturas`, finalização de compra de assinatura na loja, `Renovações`, `Cobranças em atraso` e `Cancelamento e Retenção`
- Rotas da API de administração do `Registro de Atividades`
- Interface de usuário de administração do `Registro de Atividades`: lista global, detalhes do evento e linha do tempo por assinatura
- Testes de integração do back-end do `Registro de Atividades` e cobertura de integração do fluxo de administração
- Documentação operacional do `Registro de Atividades` para retenção, monitoramento e limites do roteiro de desenvolvimento
- Modelo de domínio do `Analytics` e armazenamento de instantâneos diários
- Rotas da API de administração do `Analytics` para fluxos de KPIs, tendências, exportação e reconstrução
- Interface de usuário de administração do `Analytics`: página dedicada à análise com filtros, cartões de KPIs, visualização de tendências e ações de exportação
- Testes de integração do back-end do `Analytics` e cobertura de integração dos fluxos de administração
- Integração da invalidação de cache de `Analytics` com `Assinaturas`, `Renovações`, `Cobranças em atraso` e `Cancelamento e retenção`

Em andamento:
- página dedicada à análise e visualizações de relatórios para `Cancelamento e Retenção`
- futuras extensões operacionais para o `Registro de Atividades`, como arquivamento ou exportação

## Mapa da documentação

Utilize esses documentos de acordo com a sua necessidade:

- `specs/`
  Documentos iniciais de projeto e planejamento criados antes ou durante a implementação.
- `architecture/`
  Documentação técnica que descreve como cada área de domínio está estruturada.
- `api/`
  Contratos de API atuais utilizados pelo Admin e outros usuários.
- `admin/`
  Comportamento da interface do usuário do Admin, telas, ações, filtros e convenções de experiência do usuário.
- `testing/`
  Como os testes são estruturados, o que é coberto e como executá-los.

Atualmente, existem documentos de referência oficial de tempo de execução para:

- `Assinaturas`
  - `architecture/subscriptions.md`
  - `api/admin-subscriptions.md`
  - `admin/subscriptions.md`
  - `testing/subscriptions.md`
- `Planos e ofertas`
  - `architecture/plan-offers.md`
  - `api/admin-plan-offers.md`
  - `admin/plan-offers.md`
  - `testing/plan-offers.md`
- `Renovações`
  - `architecture/renewals.md`
  - `api/admin-renewals.md`
  - `admin/renewals.md`
  - `testing/renewals.md`
- `Cobrança de atrasados`
  - `architecture/dunning.md`
  - `api/admin-dunning.md`
  - `admin/dunning.md`
  - `testing/dunning.md`
- `Cancelamento e retenção`
  - `architecture/cancellation.md`
  - `api/admin-cancellations.md`
  - `admin/cancellations.md`
  - `testing/cancellations.md`
- `Registro de atividades`
  - `architecture/activity-log.md`
  - `api/admin-activity-log.md`
  - `admin/activity-log.md`
  - `testing/activity-log.md`
  - `roadmap/activity-log.md`
- `Análises`
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

- adicione esta dependência ao arquivo `package.json` do backend do Medusa:
  - `"@reorderjs/reorder": "file:../reorder"`
- execute `yarn install` no backend do Medusa após adicionar ou atualizar essa dependência

Quando você fizer alterações neste repositório `reorder` e quiser que o backend do Medusa utilize a versão local mais recente, siga esta sequência:

1. No `reorder`, execute `yarn medusa plugin:publish`
2. No backend do Medusa, execute `yarn medusa db:migrate`
3. No backend do Medusa, execute `yarn install`

Não presuma que o backend do Medusa esteja utilizando o código mais recente do plug-in local até que essa sequência tenha sido concluída.


## Áreas implementadas

As áreas atualmente implementadas são `Assinaturas`, `Planos e ofertas`, `Renovações`, `Cobranças em atraso`, `Cancelamento e retenção`, `Registro de atividades` e `Análises`.

O `Registro de Atividades` agora está implementado de ponta a ponta como uma trilha de auditoria de negócios, com APIs de leitura para administradores, uma página dedicada aos administradores e uma linha do tempo por nível de assinatura.

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
- regras de oferta, como ciclos mínimos, configurações de período de teste e política de acumulação de descontos
- página de gerenciamento administrativo com funções para criar, editar, filtrar, classificar e ativar/desativar fluxos
- resolução eficaz da configuração com a semântica `variante > produto`
- integração com a validação de alteração de plano do módulo `Subscriptions`

### Renovações

Esta área inclui:
- fila do ciclo de renovação na Administração
- página de detalhes do ciclo de renovação
- fluxos de aprovação e rejeição para alterações pendentes
- fluxo de renovação forçada
- execução de renovações por meio do agendador e manualmente
- histórico de tentativas e resumos de assinaturas/pedidos vinculados
- integração com a elegibilidade de `Assinaturas` e alterações pendentes
- integração com a validação de políticas de `Planos e Ofertas` no momento da execução
- criação automática de casos de `Cobrança` para falhas de renovação com pagamento qualificado
- fortalecimento operacional por meio de bloqueio de fluxos de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

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
- integração com o estado do ciclo de vida em `Assinaturas` por meio de `past_due` e recuperação para o estado `ativo`;
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
