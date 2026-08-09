# Roteiro de reordenação

O `Reorder` é um plug-in do Medusa.js voltado para operações comerciais recorrentes gerenciadas pelo Painel de Administração.

Este roteiro é o plano de implementação público do projeto. Ele se destina a usuários e colaboradores do código aberto que desejam entender o que já está disponível, o que será desenvolvido em seguida e como se espera que o plug-in evolua.

Este documento descreve a direção do produto, não uma promessa de datas de entrega.

## Situação atual

As primeiras sete áreas principais do plug-in, `Subscriptions`, `Plans & Offers`, `Renewals`, `Dunning`, `Cancellation & Retention`, `Activity Log` e `Analytics`, estão concluídas e testadas.

Implementado hoje:
- modelo de domínio e armazenamento de assinaturas
- rotas da API de administração para ações de lista, detalhes e assinaturas
- interface de usuário de administração para fluxos de lista e detalhes de assinaturas
- ações de pausar, retomar e cancelar
- agendamento de alteração de plano
- edição de endereço de entrega
- filtragem, classificação, paginação e gerenciamento do estado da interface de usuário
- testes de integração do back-end e cobertura de integração dos fluxos de administração
- modelo de domínio e armazenamento de ofertas de planos
- rotas da API de administração para lista, detalhes, criação, atualização e alternância de ofertas de planos
- interface de usuário de administração para gerenciamento de planos e ofertas
- resolução eficaz de configuração com semântica `variant > product`
- testes de integração de back-end e cobertura de integração dos fluxos de administração para `Plans & Offers`
- integração de nível básico entre `Plans & Offers` e `Subscriptions`
- modelo de domínio e armazenamento do ciclo de renovação
- rotas da API de administração para fila de renovações, detalhes, forçar, aprovar e rejeitar fluxos
- interface de usuário de administração para fila de renovações e fluxos de detalhes
- ações de aprovação, rejeição e execução forçada na administração
- testes de integração de back-end e cobertura de integração de fluxos de administração para `Renewals`
- integração de nível básico entre `Renewals`, `Subscriptions` e `Plans & Offers`
- preparação para produção do agendador de renovações e dos fluxos de execução manual
- modelo de domínio e armazenamento de casos de cobrança
- rotas da API de administração para lista de cobranças, detalhes, repetição imediata, marcação como recuperado, marcação como não recuperado e substituição da programação de repetição
- interface de usuário de administração para a fila de cobranças e fluxos de detalhes aninhados sob `Subscriptions`
- execução de repetições de cobrança, tanto por meio do agendador quanto manualmente
- testes de integração de back-end e cobertura de integração de fluxos de administração para `Dunning`
- integração de nível básico entre `Dunning`, `Renewals` e `Subscriptions`
- fortalecimento da produção para o agendador de cobranças e fluxos de repetição manual
- modelo de domínio e armazenamento do snapshot diário de análises
- rotas da API de administração para fluxos de KPIs de análises, tendências, exportação e reconstrução
- Interface de usuário administrativa para a página de relatórios analíticos aninhada em `Subscriptions`
- Testes de integração de back-end e cobertura de integração do fluxo administrativo para `Analytics`
- Ganchos de invalidação de cache entre módulos para que os relatórios permaneçam alinhados após alterações no ciclo de vida da assinatura

Próximos passos planejados:
- página dedicada à análise e visualizações de relatórios para `Cancellation & Retention`

## Áreas de produtos

### 1. Assinaturas

Status: `Completed`

Esta área fornece a base operacional para o comércio recorrente no Painel de Administração. Ela inclui:
- uma visualização da lista de assinaturas com filtragem, classificação, paginação e ações nas linhas
- uma visualização dos detalhes da assinatura
- ações operacionais, como pausar, retomar e cancelar
- visualização prévia e agendamento de alterações pendentes no plano
- edição do endereço de entrega
- rotas de API, fluxos de trabalho e testes de suporte

Essa área é considerada a base estável atual do plug-in.

### 2. Planos e ofertas

Status: `Completed`

Esta seção define quais produtos e variantes podem ser vendidos como assinaturas e em que condições.

Escopo implementado:
- configuração de assinaturas no nível do produto e da variante
- frequências de cobrança permitidas
- configuração de descontos no nível da oferta
- regras adicionais de oferta, como configurações de período de teste e acumulação de descontos
- resolução eficaz da configuração com prioridade `variant > product`
- interface de usuário de gerenciamento administrativo para planos e ofertas
- alterações e validações baseadas em fluxo de trabalho para combinações suportadas
- testes de integração de back-end e cobertura do fluxo administrativo
- integração com a validação de mudança de plano `Subscriptions`

Essa área fornece a camada de configuração comercial utilizada pelas assinaturas e pelos futuros trabalhos relacionados à loja virtual.

### 3. Renovações

Status: `Completed`

Esta área abrange a execução de renovações recorrentes e as operações de renovação no Admin.

Escopo implementado:
- acompanhamento do ciclo de renovação
- execução de renovações programadas e manuais
- fluxo de aprovação para alterações pendentes na assinatura antes da renovação
- Filas de administração e visualizações detalhadas para operações de renovação
- Ações de aprovação, rejeição e forçamento no painel de administração
- Testes de integração de back-end para sucesso, falha, repetição, aprovação, idempotência e comportamento de rota
- Cobertura de integração do fluxo de administração
- Integração de nível básico com `Subscriptions` e `Plans & Offers`
- Fortalecimento da produção por meio de bloqueio de fluxo de trabalho, IDs de correlação, registro estruturado e métricas de resumo do agendador

Esta área fornece a camada de execução operacional para assinaturas ativas.

### 4. Cobrança

Status: `Completed`

Esta área gerencia pagamentos de renovação com falha e os fluxos de novas tentativas.

Escopo implementado:
- acompanhamento de casos de cobrança
- agendamento e execução de novas tentativas
- ações manuais de recuperação no Admin
- visualizações da fila de administração e dos detalhes aninhadas sob `Subscriptions`
- ações “retentar agora”, “marcar como recuperado”, “marcar como não recuperado” e “substituir programação de retentativas”
- testes de integração de back-end para o comportamento do fluxo de trabalho, da rota e do fluxo administrativo
- integração de nível básico com `Renewals` e `Subscriptions`
- fortalecimento da produção por meio de bloqueios, IDs de correlação, registro estruturado e métricas de resumo do agendador

Essa área reduz a rotatividade causada por falhas de pagamento e oferece um fluxo de trabalho específico para a recuperação de pagamentos em casos de renovações com falha.

### 5. Cancelamento e retenção

Status: `Completed`

Esta área se concentra no gerenciamento da rotatividade e nos fluxos de trabalho de retenção.

Escopo implementado:
- modelo de domínio e armazenamento de casos de cancelamento
- modelo de domínio e armazenamento de eventos de ofertas de retenção
- limites da fonte de verdade com `Subscriptions`, `Renewals` e `Dunning`
- tratamento estruturado de motivos de cancelamento e categorias de motivos
- fluxo de trabalho inteligente de recomendação de cancelamento
- fluxos de oferta de retenção para `pause`, `discount` e `bonus`
- fluxo de trabalho de cancelamento final com semântica de motivo obrigatória
- rotas da API de administração para lista de cancelamentos, detalhes, recomendações, solicitação de oferta, finalização e atualizações de motivos
- interface de usuário de administração para fila de cancelamentos e detalhes do caso em `Subscriptions`
- testes de integração de back-end, cobertura de integração do fluxo de administração e cobertura de testes de fumaça entre módulos
- fortalecimento operacional por meio de trilha de auditoria, registro estruturado, métricas de resumo do agendador e registros com alertas para picos de cancelamento

Escopo diferido:
- página dedicada à análise e visualizações de relatórios para KPIs de rotatividade

Essa área agora oferece suporte a decisões deliberadas de desligamento e retenção por meio de operações administrativas apoiadas por fluxos de trabalho.

### 6. Registro de atividades

Status: `Completed`

Esta área fornece um histórico de auditoria empresarial que abrange várias áreas para as operações de assinatura.

Escopo implementado:
- modelo de domínio e armazenamento `subscription_log` somente para adição de dados
- criação de eventos baseada em fluxo de trabalho em `Subscriptions`, `Renewals`, `Dunning` e `Cancellation & Retention`
- normalização centralizada, supressão de dados e semântica de gravação idempotente
- rotas da API de administração para:
  - lista global
  - detalhes do evento
  - linha do tempo por assinatura
- Interface de usuário de administração para:
  - página global de registro de atividades
  - painel de detalhes do evento
  - linha do tempo de detalhes da assinatura
- testes de back-end para normalização, semântica de gravação e cargas úteis de eventos emitidos
- cobertura de integração da API de administração e do fluxo de administração
- documentação operacional para retenção, monitoramento e limites de extensão futura

Escopo adiado:
- tarefas de arquivamento ou retenção
- ferramentas de exportação
- filtros salvos e links cruzados mais abrangentes

Essa área agora fornece a trilha de auditoria voltada para o operador relativa aos eventos do ciclo de vida da assinatura, sem retirar a responsabilidade dos módulos de domínio subjacentes.

### 7. Análise de dados

Status: `Completed`

Esta área oferece visualizações de KPIs e tendências voltadas para relatórios para operações de comércio recorrente na seção Admin.

Escopo implementado:
- modelo de instantâneo de análise derivado para fatos diários de comércio recorrente
- rotas da API de administração para:
  - resumo de KPIs
  - tendências
  - exportação
  - reconstrução
- interface de usuário de administração para:
  - página de análise aninhada em `Subscriptions`
  - cartões de KPIs orientados por filtros
  - visualização de tendências
  - exportação sob demanda em CSV e JSON
- testes de back-end para fórmulas, semântica de buckets, filtros, comportamento de reconstrução e contratos de rota
- cobertura de integração do fluxo de administração para cenários de relatórios analíticos
- integração de invalidação de cache com `Subscriptions`, `Renewals`, `Dunning` e `Cancellation & Retention`

Escopo adiado:
- página de análises específica para cancelamentos e visualizações de relatórios para detalhamento das operações de rotatividade
- relatórios comparativos entre períodos
- visualizações salvas
- enfileiramento de exportação assíncrona

Essa área agora serve como a principal interface de relatórios para a análise de KPIs do comércio recorrente, sem retirar a responsabilidade dos módulos do domínio de origem.

## Princípios do roteiro

O roteiro segue alguns princípios no âmbito do projeto:

- Priorize o domínio.
  As regras de negócios são definidas nos módulos e fluxos de trabalho do Medusa antes de serem expostas na interface de usuário administrativa.
- Mantenha o comportamento da interface administrativa alinhado aos padrões do Medusa.
  Tabelas, páginas de detalhes, menus deslizantes, ações e carregamento de dados devem seguir as convenções do Medusa.
- Dê preferência a modelos de leitura estáveis e fluxos de mutação explícitos.
  As visualizações de lista e de detalhes devem ser respaldadas por contratos de consulta claros e mutações orientadas por fluxos de trabalho.
- Realize testes no limite de integração.
  Cada área deve ser validada por meio de testes de integração oficiais suportados pelo Medusa.
- Entregue em fatias verticais.
  Cada área principal deve estar completa em termos de modelo de domínio, API, interface de usuário administrativa e testes antes que a próxima seja considerada concluída.

## O que significa “Concluído”

Uma área é considerada concluída quando inclui:
- um modelo de domínio estável
- migrações e índices, quando necessário
- rotas de API voltadas para a administração
- interface de usuário administrativa para os fluxos de trabalho previstos
- validação e tratamento de erros de domínio
- testes de integração que abrangem os caminhos críticos
- documentação atualizada

## Notas sobre as contribuições

Se você quiser contribuir:

- considerar os documentos em `architecture/`, `api/`, `admin/` e `testing/` como a fonte de referência para o comportamento implementado
- considerar `specs/` como um contexto histórico de projeto, e não como documentação definitiva
- alinhar a nova interface de usuário administrativa aos padrões estabelecidos do painel do Medusa
- dar preferência a pequenas partes completas em vez de mudanças amplas e parcialmente implementadas

## Documentos relacionados

- [Visão geral da documentação](../README.md)
- [Arquitetura de assinaturas](../architecture/subscriptions.md)
- [API de administração de assinaturas](../api/admin-subscriptions.md)
- [Interface de usuário de administração de assinaturas](../admin/subscriptions.md)
- [Testes de assinaturas](../testing/subscriptions.md)
- [Arquitetura de planos e ofertas](../architecture/plan-offers.md)
- [API de planos e ofertas para administradores](../api/admin-plan-offers.md)
- [Interface do usuário de planos e ofertas para administradores](../admin/plan-offers.md)
- [Testes de planos e ofertas](../testing/plan-offers.md)
- [Arquitetura de cancelamentos](../architecture/cancellation.md)
- [API de cancelamentos de administração](../api/admin-cancellations.md)
- [Interface de usuário de cancelamentos de administração](../admin/cancellations.md)
- [Testes de cancelamentos](../testing/cancellations.md)
- [Arquitetura de cobrança de atrasados](../architecture/dunning.md)
- [API de cobrança de inadimplência para administradores](../api/admin-dunning.md)
- [Interface de usuário de cobrança de inadimplência para administradores](../admin/dunning.md)
- [Testes de cobrança de inadimplência](../testing/dunning.md)
- [Arquitetura do registro de atividades](../architecture/activity-log.md)
- [API de registro de atividades de administração](../api/admin-activity-log.md)
- [Interface de usuário do registro de atividades de administração](../admin/activity-log.md)
- [Testes do registro de atividades](../testing/activity-log.md)
- [Roteiro do registro de atividades](./activity-log.md)
- [Arquitetura de análise](../architecture/analytics.md)
- [API de análise administrativa](../api/admin-analytics.md)
- [Interface de usuário de análise administrativa](../admin/analytics.md)
- [Testes de análise](../testing/analytics.md)
