# Reordenar roteiro

`Reorder` é um plugin Medusa.js focado em operações comerciais recorrentes gerenciadas pelo Admin.

Este roteiro é o plano de implementação pública do projeto. Ele é destinado a usuários e contribuidores de código aberto que desejam entender o que já está disponível, o que será construído a seguir e como o plugin deverá evoluir.

Este documento descreve a direção do produto, não uma promessa de datas de entrega.

## Status atual

As primeiras sete áreas principais do plugin, `Assinaturas`, `Planos e Ofertas`, `Renovações`, `Dunning`, `Cancelamento e Retenção`, `Registro de Atividades` e `Analítica`, estão completas e testadas.

Implementado hoje:
- modelo de domínio de assinatura e armazenamento
- rotas de API de administração para ações de lista, detalhes e assinatura
- UI de administração para lista de assinaturas e fluxos detalhados
- pausar, retomar e cancelar ações
- mudança de plano de cronograma
- editar endereço de entrega
- filtragem, classificação, paginação e manipulação de estado da interface do usuário
- testes de integração de back-end e cobertura de integração de fluxo administrativo
- planejar, oferecer modelo de domínio e armazenamento
- rotas de API de administração para lista de ofertas de planos, detalhes, criação, atualização e alternância
- Admin UI para gerenciamento de planos e ofertas
- resolução de configuração eficaz com semântica `variant > product`
- testes de integração de backend e cobertura de integração de fluxo administrativo para `Planos e Ofertas`
- integração de nível de fumaça entre `Planos e Ofertas` e `Assinaturas`
- modelo de domínio e armazenamento do ciclo de renovação
- rotas de API administrativas para fila de renovação, detalhe, força, aprovação e rejeição de fluxos
- UI de administração para fila de renovações e fluxos detalhados
- ações de aprovação, rejeição e execução forçada no Admin
- testes de integração de backend e cobertura de integração de fluxo administrativo para `Renovações`
- integração de nível de fumaça entre `Renovações`, `Assinaturas` e `Planos e Ofertas`
- fortalecimento da produção para agendador de renovação e fluxos de execução manual
- modelo de domínio e armazenamento de caso de cobrança
- rotas de API de administração para lista de cobrança, detalhes, tentar novamente agora, marcar como recuperado, marcar como não recuperado e substituir a programação de novas tentativas
- UI de administração para fila de cobrança e fluxos detalhados aninhados em `Assinaturas`
- execução de novas tentativas de cobrança manual e apoiada por agendador
- testes de integração de back-end e cobertura de integração de fluxo administrativo para `Dunning`
- integração de nível de fumaça entre `Dunning`, `Renovações` e `Assinaturas`
- fortalecimento da produção para agendador de cobrança e fluxos de novas tentativas manuais
- modelo de domínio e armazenamento de instantâneo diário analítico
- rotas de API administrativas para KPI analítico, tendências, exportação e fluxos de reconstrução
- UI de administração para a página de relatórios analíticos aninhada em `Assinaturas`
- testes de integração de back-end e cobertura de integração de fluxo administrativo para `Analytics`
- Ganchos de invalidação de cache entre módulos para que os relatórios permaneçam alinhados após mutações no ciclo de vida da assinatura

Planejado a seguir:
- página de análise dedicada e visualizações de relatórios para `Cancelamento e retenção`

## Áreas de Produtos

### 1. Assinaturas

Status: `Concluído`

Esta área fornece a base operacional para o comércio recorrente no Admin. Inclui:
- uma visualização de lista de assinaturas com filtragem, classificação, paginação e ações de linha
- uma visualização de detalhes da assinatura
- ações operacionais como pausar, retomar e cancelar
- visualização e agendamento de alterações de plano pendentes
- edição do endereço de entrega
- suporte a rotas, fluxos de trabalho e testes de API

Esta área é considerada a base estável atual do plugin.

### 2. Planos e ofertas

Status: `Concluído`

Esta área define quais produtos e variantes podem ser vendidos como assinaturas e sob quais termos.

Escopo implementado:
- configuração de assinatura em nível de produto e variante
- frequências de cobrança permitidas
- configuração de desconto em nível de oferta
- regras de oferta adicionais, como configurações de teste e empilhamento
- resolução de configuração eficaz com prioridade `variant> product`
- UI de gerenciamento administrativo para planos e ofertas
- mutações apoiadas por fluxo de trabalho e validação para combinações suportadas
- testes de integração de back-end e cobertura de fluxo administrativo
- integração com validação de mudança de plano de `Assinaturas`

Esta área fornece a camada de configuração comercial usada por assinaturas e trabalhos futuros de vitrine.

### 3. Renovações

Status: `Concluído`

Esta área abrange a execução recorrente de renovações e operações de renovação no Admin.

Escopo implementado:
- acompanhamento do ciclo de renovação
- execução de renovação programada e manual
- fluxo de aprovação para alterações de assinatura pendentes antes da renovação
- Fila de administração e visualizações detalhadas para operações de renovação
- aprovar, rejeitar e forçar ações no Admin
- testes de integração de back-end para sucesso, falha, nova tentativa, aprovação, idempotência e comportamento de rota
- cobertura de integração de fluxo administrativo
- integração de nível de fumaça com `Assinaturas` e `Planos e Ofertas`
- fortalecimento da produção por meio de bloqueio de fluxo de trabalho, IDs de correlação, registro estruturado e métricas de resumo do agendador

Esta área fornece a camada de execução operacional para assinaturas ativas.

### 4. Cobrança

Status: `Concluído`

Esta área gerencia pagamentos de renovação com falha e fluxos de novas tentativas.

Escopo implementado:
- acompanhamento de casos de cobrança
- tentar novamente o agendamento e tentar novamente a execução
- ações de recuperação manual no Admin
- fila de administração e visualizações detalhadas aninhadas em `Assinaturas`
- tentar novamente agora, marcar como recuperado, marcar como não recuperado e tentar novamente ações de substituição de agendamento
- testes de integração de back-end para comportamento de fluxo de trabalho, rota e fluxo administrativo
- integração de nível de fumaça com `Renovações` e `Assinaturas`
- fortalecimento da produção por meio de bloqueios, IDs de correlação, registro estruturado e métricas de resumo do agendador

Esta área reduz a rotatividade causada por falhas de pagamento e fornece um fluxo de trabalho dedicado de recuperação de pagamentos para renovações com falha.

### 5. Cancelamento e retenção

Status: `Concluído`

Esta área se concentra no gerenciamento de rotatividade e fluxos de trabalho de retenção.

Escopo implementado:
- modelo de domínio e armazenamento de caso de cancelamento
- modelo de domínio de evento de oferta de retenção e armazenamento
- limites da fonte da verdade com `Assinaturas`, `Renovações` e `Dunning`
- motivo de rotatividade estruturado e tratamento de categoria de motivo
- fluxo de trabalho de recomendação de cancelamento inteligente
- fluxos de oferta de retenção para `pausa`, `desconto` e `bônus`
- fluxo de trabalho de cancelamento final com semântica do motivo necessário
- rotas de API de administração para lista de cancelamento, detalhes, recomendação, aplicação de oferta, finalização e atualizações de motivo
- Interface do administrador para fila de cancelamento e detalhes do caso em `Assinaturas`
- testes de integração de back-end, cobertura de integração de fluxo administrativo e cobertura de fumaça entre módulos
- fortalecimento operacional por meio de trilha de auditoria, registro estruturado, métricas de resumo do agendador e registros de alerta de pico de rotatividade

Escopo diferido:
- página de análise dedicada e visualizações de relatórios para KPIs de rotatividade

Esta área agora oferece suporte a decisões deliberadas de desligamento e retenção por meio de operações administrativas apoiadas por fluxo de trabalho.

### 6. Registro de atividades

Status: `Concluído`

Esta área fornece uma trilha de auditoria comercial entre domínios para operações de assinatura.

Escopo implementado:
- modelo de domínio e armazenamento `subscription_log` somente anexado
- criação de eventos apoiados por fluxo de trabalho em `Assinaturas`, `Renovações`, `Cobrança` e `Cancelamento e Retenção`
- normalização centralizada, redação e semântica de gravação idempotente
- rotas de API de administração para:
  - lista global
  - detalhe do evento
  - cronograma por assinatura
- UI de administração para:
  - página de registro de atividades global
  - gaveta de detalhes do evento
  - cronograma de detalhes da assinatura
- testes de back-end para normalização, semântica de gravação e cargas úteis de eventos emitidos
- API de administração e cobertura de integração de fluxo de administração
- documentação operacional para retenção, monitoramento e limites de extensão futura

Escopo diferido:
- trabalhos de arquivamento ou retenção
- ferramentas de exportação
- filtros salvos e links cruzados mais ricos

Esta área agora fornece a trilha de auditoria voltada para o operador para eventos do ciclo de vida da assinatura sem retirar a propriedade dos módulos de domínio subjacentes.

### 7. Análise

Status: `Concluído`

Esta área fornece KPI orientados a relatórios e visualizações de tendências para operações de comércio recorrente no Admin.

Escopo implementado:
- modelo de instantâneo analítico derivado para fatos diários de comércio recorrente
- Rotas da API Admin para:
  - Resumo de KPI
  - tendências
  - exportar
  - reconstruir
- UI de administração para:
  - página de análise aninhada em `Assinaturas`
  - cartões KPI orientados por filtros
  - visualização de tendências
  - exportação CSV e JSON sob demanda
- testes de back-end para fórmulas, semântica de bucket, filtros, comportamento de reconstrução e contratos de rota
- cobertura de integração de fluxo administrativo para cenários de relatórios analíticos
- integração de invalidação de cache com `Assinaturas`, `Renovações`, `Dunning` e `Cancelamento e Retenção`

Escopo diferido:
- página de análise dedicada específica para cancelamento e visualizações de relatórios para detalhamento de operações de rotatividade
- relatórios de período de comparação
- visualizações salvas
- enfileiramento de exportação assíncrona

Esta área agora fornece a principal superfície de relatórios para revisão de KPI de comércio recorrente sem retirar a propriedade dos módulos de domínio de origem.

## Princípios do Roteiro

O roteiro segue alguns princípios em nível de projeto:

- Construa o domínio primeiro.
  As regras de negócios residem nos módulos e fluxos de trabalho do Medusa antes de serem expostas na interface do administrador.
- Mantenha o comportamento do administrador alinhado aos padrões da Medusa.
  Tabelas, páginas de detalhes, gavetas, ações e carregamento de dados devem seguir as convenções da Medusa.
- Prefira modelos de leitura estáveis ​​e fluxos de mutação explícitos.
  As visualizações de lista e detalhes devem ser apoiadas por contratos de consulta claros e mutações orientadas pelo fluxo de trabalho.
- Teste no limite de integração.
  Cada área deve ser validada através de testes de integração oficiais apoiados pela Medusa.
- Envie em fatias verticais.
  Cada área principal deve ser concluída no modelo de domínio, API, UI de administração e testes antes que a próxima seja considerada concluída.

## O que significa "Pronto"

Uma área é considerada completa quando inclui:
- um modelo de domínio estável
- migrações e índices quando necessário
- rotas de API voltadas para o administrador
- UI de administração para os fluxos de trabalho pretendidos
- validação e tratamento de erros de domínio
- testes de integração cobrindo os caminhos críticos
- documentação atualizada

## Notas de contribuição

Se você quiser contribuir:

- tratar os documentos em `architecture/`, `api/`, `admin/` e `testing/` como a fonte da verdade para o comportamento implementado
- trate `especificações/` como contexto histórico de design, não como documentação final
- alinhar a nova interface de administração com os padrões estabelecidos do painel da Medusa
- preferir fatias pequenas e completas a mudanças amplas parcialmente implementadas

## Documentos Relacionados

- [Visão geral dos documentos](../README.md)
- [Arquitetura de assinaturas](../architecture/subscriptions.md)
- [API de assinaturas de administrador](../api/admin-subscriptions.md)
- [IU de assinaturas de administrador](../admin/subscriptions.md)
- [Teste de assinaturas](../testing/subscriptions.md)
- [Arquitetura de Planos e Ofertas](../architecture/plan-offers.md)
- [API de planos e ofertas de administração](../api/admin-plan-offers.md)
- [IU de planos e ofertas de administração](../admin/plan-offers.md)
- [Teste de planos e ofertas](../testing/plan-offers.md)
- [Arquitetura de cancelamento](../architecture/cancellation.md)
- [API de cancelamentos de administrador](../api/admin-cancellations.md)
- [IU de cancelamentos do administrador](../admin/cancellations.md)
- [Teste de cancelamentos](../testing/cancellations.md)
- [Arquitetura de Dunning](../architecture/dunning.md)
- [API de cobrança de administrador](../api/admin-dunning.md)
- [UI de cobrança do administrador](../admin/dunning.md)
- [Teste de cobrança](../testing/dunning.md)
- [Arquitetura de log de atividades](../architecture/activity-log.md)
- [API de registro de atividades do administrador](../api/admin-activity-log.md)
- [IU do registro de atividades do administrador](../admin/activity-log.md)
- [Teste de registro de atividades](../testing/activity-log.md)
- [Roteiro do registro de atividades](./activity-log.md)
- [Arquitetura analítica](../architecture/analytics.md)
- [API de análise administrativa](../api/admin-analytics.md)
- [IU do administrador do Analytics](../admin/analytics.md)
- [Teste analítico](../testing/analytics.md)
