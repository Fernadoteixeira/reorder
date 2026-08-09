# Arquitetura de Renovações

Este documento descreve a arquitetura atual da área `Renewals` no plugin `Reorder`.

Ele se concentra no sistema implementado e não nas suposições iniciais do projeto.

## Meta

A área `Renovações` fornece a camada de execução e revisão operacional para cobrança recorrente de assinaturas.

A implementação atual suporta:
- acompanhar ciclos de renovação e tentativas de renovação
- processamento agendado através de um trabalho Medusa
- execução manual de força do Admin
- aprovação e rejeição de alterações de assinatura pendentes antes da renovação
- Fila de administração e visualizações detalhadas para operações de renovação
- integração com `Assinaturas` e `Planos e Ofertas`
- integração com `Dunning` para falhas de renovação qualificadas para pagamento
- fortalecimento operacional por meio de bloqueio de fluxo de trabalho, IDs de correlação, logs estruturados e métricas de resumo do agendador

## Visão Geral da Arquitetura

A implementação é dividida em quatro camadas principais:

1. módulo de domínio
2. fluxos de trabalho e trabalho agendado
3. API de administração
4. IU de administração

Cada camada tem uma responsabilidade clara:

- o módulo de domínio possui `renewal_cycle` e `renewal_attempt`
- fluxos de trabalho possuem execução, aprovação, rejeição e mutações forçadas
- o trabalho agendado descobre ciclos de vencimento e aciona o fluxo de trabalho de execução compartilhado
- a API admin expõe rotas de leitura e mutação para usuários operacionais
- a UI administrativa renderiza as visualizações de fila e detalhes e chama os endpoints administrativos

## 1. Módulo de Domínio

O módulo personalizado `renovação` é o proprietário do domínio de execução da renovação.

Ele contém:
- tipos de domínio
- o modelo de dados `renewal_cycle`
- o modelo de dados `renewal_attempt`
- o serviço do módulo
- utilitários de modelo de leitura para leituras de fila de administração, detalhes e agendador

Principais opções de design:
- um ciclo de renovação representa uma unidade concreta de renovação devida para uma assinatura
- o histórico de tentativas é armazenado separadamente do agregado do ciclo
- o ciclo armazena diretamente o estado operacional e os campos de resumo de execução selecionados
- a assinatura continua sendo a fonte do estado ativo da assinatura, enquanto o ciclo continua sendo a fonte do histórico de execução

## 2. Modelo de dados

O modelo `renewal_cycle` armazena:
- campos de identidade e agendamento
- status de execução
- estado de aprovação
- referência de pedido gerada
- resumo do último erro
- instantâneo de alteração pendente aplicado
- contador de tentativas e metadados

Os campos principais `renewal_cycle` incluem:
- `id`
- `subscrição_id`
- `agendado_para`
- `processado_em`
- `estado`
- `aprovação_requerida`
- `status_aprovação`
- `aprovação_decidida_em`
- `aprovação_decidida_por`
- `motivo_aprovação`
- `generated_order_id`
- `applied_pending_update_data`
- `último_erro`
- `tentativa_contagem`
- `metadados`

O modelo `renewal_attempt` armazena:
- `id`
- `renovação_ciclo_id`
- `tentativa_não`
- `começou_em`
- `terminado_em`
- `estado`
- `código_erro`
- `mensagem_erro`
- `referência_de_pagamento`
- `order_id`
- `metadados`

### Estratégia de indexação

As migrações atuais e a configuração do modelo otimizam a fila de renovação para:
- pesquisa por `subscription_id`
- filtragem por `status`
- filtragem e ordenação por `scheduled_for`
- Filtragem administrativa e classificação por campos operacionais
- tentativa de pesquisa de histórico por `renewal_cycle_id`

## 3. Semântica de Execução

`Renovações` usam a assinatura como fonte do estado operacional atual e, opcionalmente, aplicam `pending_update_data` aprovados durante a execução.

A implementação atual segue estas regras:
- apenas assinaturas qualificadas podem ser renovadas
- as alterações pendentes só são consideradas quando entrarem em vigor para a data do ciclo
- a aprovação é aplicada quando o ciclo exige
- `Planos e Ofertas` são resolvidos novamente em tempo de execução antes que as alterações pendentes sejam aplicadas
- a execução bem-sucedida atualiza a cadência ativa da assinatura e limpa `pending_update_data` aplicado
- o ciclo registra se as alterações pendentes foram realmente aplicadas

Isso significa:
- `Assinaturas` possui estado de assinatura ativa
- Validação da política atual própria de `Planos e Ofertas`
- Estado de execução próprio e histórico de resultados de `renovações`

A área implementada de `Cancelamento e Retenção` não altera a propriedade de `Renovações`.

Limite atual com `Cancelamento e Retenção`:
- `Renovações` não possuem estado do processo de cancelamento
- `Cancelamento e Retenção` não possui histórico de execução do ciclo de renovação
- a elegibilidade do ciclo futuro é derivada do estado do ciclo de vida da `Assinatura`, e não da transferência da propriedade do ciclo para o módulo de cancelamento

Em termos de tempo de execução:
- os ciclos futuros devem respeitar `Subscription.status`
- os ciclos futuros devem respeitar `cancel_efficient_at`
- os ciclos futuros devem respeitar `next_renewal_at`
- `pause` e `cancel` afetam a elegibilidade, não a propriedade dos registros `renewal_cycle`

## 4. Leia o caminho

O caminho de leitura é otimizado para a fila de renovação do administrador e detalhes do ciclo.

Componentes principais:
- manipuladores de rota administrativa em `src/api/admin/renewals`
- auxiliares de normalização em `src/api/admin/renewals/utils.ts`
- ajudantes de consulta em `src/modules/renewal/utils/admin-query.ts`
- auxiliar de consulta específico do agendador em `src/modules/renewal/utils/scheduler-query.ts`

### Fluxo da fila

Para a visualização da fila:
1. a UI Admin envia parâmetros de consulta para `GET /admin/renewals`
2. A rota valida e normaliza a entrada da consulta
3. `listAdminRenewals(...)` aplica filtros, classificação, paginação e resolução de resumo vinculado
4. A camada de consulta lê os ciclos de renovação e as últimas tentativas
5. a resposta é mapeada para Admin DTOs usados pela fila DataTable

O modelo de leitura Admin distingue entre:
- `scheduled_for` como a data do ciclo operacional pertencente a `renewal_cycle`
- `efficient_scheduled_for` como a data de entrega projetada mostrada quando a assinatura vinculada tem `skip_next_cycle = true`

Os recursos de fila suportados incluem:
- paginação
- pesquisar
- filtragem
- classificação
- resolução resumida da última tentativa

### Fluxo detalhado

Para a visualização detalhada:
1. a UI do administrador solicita `GET /admin/renewals/:id`
2. A rota resolve o ciclo por meio do auxiliar de consulta detalhada
3. assinatura vinculada e resumos de pedidos gerados são resolvidos
4. O histórico de tentativas e o resumo de alterações pendentes são mapeados no DTO detalhado

A carga detalhada representa:
- o agregado do ciclo
- resumo de aprovação
- resumo de assinatura vinculado
- resumo do pedido vinculado
- alterações pendentes
- histórico de tentativas
- metadados

Isso mantém intacta a fonte da verdade do ciclo operacional, ao mesmo tempo que permite que a UI do administrador mostre a data de entrega projetada após o salto.

### Fluxo de leitura do agendador

O trabalho agendado usa uma consulta do agendador dedicada em vez do modelo de leitura Admin.

Ele seleciona os ciclos devidos por:
- `status em [agendado, falhou]`
- `agendado_para <= agora`
- estado elegível para aprovação quando a aprovação é necessária

Isso mantém a descoberta do agendador leve e separada das preocupações de exibição do administrador.

Como `Cancelamento e Retenção` pode materializar os estados `pausado` e `cancelado` de volta à `Assinatura`, o comportamento do escalonador deve tratar esses campos do ciclo de vida como a porta operacional.

Implicações atuais:
- Assinaturas `pausadas` normalmente não são elegíveis para execução de renovação
- Assinaturas `canceladas` não são elegíveis para execução de renovação
- os ciclos devidos após o cancelamento efetivo não devem ser executados
- os registros de ciclo ainda podem existir historicamente mesmo quando não são mais elegíveis

## 5. Escrever caminho

Todas as operações de renovação que alteram o estado são roteadas por meio de fluxos de trabalho.

Mutações implementadas:
- ciclo de renovação do processo
- ciclo de renovação de força
- aprovar alterações de renovação
- rejeitar alterações de renovação

Padrão de caminho de gravação:
1. o agendador ou rota Admin envia uma entrada de fluxo de trabalho
2. o fluxo de trabalho valida o ciclo atual e o estado da assinatura
3. o fluxo de trabalho aplica lógica de execução ou decisão
4. a rota retorna a carga atualizada de detalhes de renovação para mutações de administrador

Isso mantém a lógica de negócios fora das rotas e centraliza as regras de mutação nos fluxos de trabalho.

## 6. Fluxos de trabalho

A atual camada de mutação de renovação é construída em torno de:
- `ciclo de renovação de processo`
- `ciclo de renovação forçada`
- `aprovar-renovações-mudanças`
- `rejeitar alterações de renovação`

### Fluxo de trabalho de execução principal

`process-renewal-cycle` é o fluxo de trabalho de execução compartilhado usado por:
- o trabalho do agendador
- manual `forçar renovação`

É responsável por:
- validação de simultaneidade e estado
- validando a elegibilidade da assinatura
- validação de requisitos de aprovação
- revalidação da política `Planos e Ofertas` para alterações pendentes
- criando a tentativa de renovação
- atualizando o status do ciclo
- criar o pedido de renovação quando aplicável
- iniciar a `Cobrança` quando ocorrerem falhas de renovação qualificadas para pagamento após a criação do pedido
- atualização da cadência e dos instantâneos da assinatura
- registrar sucesso ou fracasso

Detalhe da implementação atual:
- o fluxo de trabalho adquire um bloqueio de fluxo de trabalho Medusa com a chave `renewal:${renewal_cycle_id}`
- as configurações de bloqueio atuais são `timeout = 10` segundos e `ttl = 120` segundos
- este bloqueio compartilhado protege a execução do agendador e a execução manual forçada

### Fluxos de trabalho de aprovação

`alterações de aprovação de renovação` e `alterações de renovação de rejeição` são o limite de mutação para decisões de aprovação.

Eles são responsáveis por:
- validar que a aprovação é necessária
- bloqueando decisões duplicadas
- armazenar quem decidiu, quando e por quê
- atualizando o estado de aprovação do ciclo

### Forçar fluxo de trabalho

`force-renewal-cycle` é a mutação operacional voltada para o administrador.

É responsável por:
- validar que o ciclo pode ser forçado manualmente
- fazer cumprir os requisitos de aprovação antes da execução forçada
- delegar a execução real ao fluxo de trabalho de renovação principal compartilhado
- anexar um ID de correlação de operação manual usado pelo registro operacional estruturado

## 7. Processamento Agendado

`Renovações` são processadas pelo trabalho agendado:

- `src/jobs/process-renewal-cycles.ts`

O trabalho:
- funciona a cada cinco minutos
- descobre ciclos devidos em lotes
- executa o fluxo de trabalho de renovação compartilhado para cada ciclo
- registra resultados por ciclo
- emite um resumo estruturado da execução com contadores e duração

O agendador não implementa um fluxo de negócios separado. Ele reutiliza a mesma lógica de execução básica da força manual.

## 8. Simultaneidade e fortalecimento operacional

O fluxo de trabalho de execução de renovação já usa o bloqueio de fluxo de trabalho Medusa em torno do caminho crítico de execução.

O endurecimento atual inclui:
- chave de bloqueio baseada em `renewal_cycle_id`
- anti-duplicação através de validação de estado
- registro operacional estruturado
- IDs de correlação gerados para agendadores e fluxos de força manuais
- registro de resultados por ciclo e por trabalho
- contadores de resumo para:
  - contagem de sucesso
  - contagem de falhas
  - contagem bloqueada
  - duração do processamento

A classificação de log orientada a alertas atualmente distingue entre:
- já processando
- execução duplicada
- assinatura não elegível
- aprovação bloqueada
- política de oferta bloqueada
- falha na criação do pedido
- falha inesperada no tempo de execução

Nota de implementação operacional:
- a observabilidade da renovação estruturada reside em `src/modules/renewal/utils/observability.ts`
- o trabalho do agendador registra resumos por execução e por ciclo
- a etapa central de execução e o fluxo de força manual emitem eventos operacionais com reconhecimento de correlação

## 8.1 Limite com cancelamento e retenção

`Cancelamento e Retenção` agora participa do limite de tempo de execução do comércio recorrente, mas faz isso por meio de efeitos do ciclo de vida da assinatura, em vez de assumir a propriedade da renovação.

Divisão de tempo de execução atual:
- `RenewalCycle` continua sendo a fonte da verdade para o agendamento de renovações e histórico de execução
- `CancellationCase` continua sendo a fonte da verdade para decisões de tratamento de rotatividade
- os campos do ciclo de vida da assinatura são o ponto de integração entre esses domínios

## 9. Arquitetura da API de administração

A API Admin expõe rotas personalizadas dedicadas ao monitoramento de renovação e ações operacionais.

Rotas de leitura implementadas:
- `GET /admin/renovações`
- `GET /admin/renovações/:id`

Rotas de mutação implementadas:
- `POST /admin/renovações/:id/force`
- `POST /admin/renewals/:id/approve-changes`
- `POST /admin/renewals/:id/reject-changes`

A camada API usa:
- Validadores Zod
- solicitações de administrador autenticadas
- ajudantes de consulta para leituras
- fluxos de trabalho para mutações

## 10. Arquitetura da UI do administrador

A UI Admin é implementada como rotas Medusa Admin personalizadas aninhadas em `Assinaturas`.

Telas atuais:
- página da fila de renovações
- página de detalhes do ciclo de renovação

### Página da fila

A página da fila é construída com Medusa `DataTable`.

Suporta:
- paginação
- pesquisar
- filtros
- classificação
- navegação de linha para detalhes
- intervalo de datas agendado padrão na montagem

Arquivo de rota implementado:
- `src/admin/routes/subscriptions/renewals/page.tsx`

### Página de detalhes

A página de detalhes contém:
- visão geral do ciclo
- resumo de aprovação
- resumo da assinatura
- resumo do pedido gerado
- alterações pendentes
- histórico de tentativas
- metadados técnicos
- menu de ação com `force`, `approve` e `reject`

Os fluxos de decisão usam gavetas e confirmam prompts no estilo Medusa padrão.

Arquivo de rota implementado:
- `src/admin/routes/subscriptions/renewals/[id]/page.tsx`

## 11. Estratégia de invalidação de consulta

A UI Admin usa invalidação explícita para listas de renovação e consultas detalhadas.

Após uma mutação bem-sucedida:
- a consulta da lista de renovações é invalidada
- a consulta de detalhes da renovação é invalidada

Isso mantém o estado da fila e o estado detalhado sincronizados após as ações do operador.

Detalhe de implementação:
- consultas de exibição de lista e detalhes são centralizadas em `src/admin/routes/subscriptions/renewals/data-loading.ts`
- a invalidação é compartilhada através de `invalidateAdminRenewalsQueries(...)`
- as gavetas de aprovação usam o estado do formulário local e dados detalhados já carregados, em vez de uma consulta de exibição remota separada

## 12. Tratamento de erros e carregamento

A UI `Renewals` segue o tratamento de estado no estilo Medusa:
- a fila usa carregamento de DataTable e estados vazios
- a página de detalhes mostra carregamento explícito e estados de erro
- gavetas de decisão mostram carregamento local e estados de erro em linha
- ações arriscadas exigem confirmação do operador

Isso mantém os dados de exibição separados do estado do formulário somente gaveta e corresponde aos padrões Admin UX existentes usados ​​em outras partes do plug-in.

## 13. Estratégia de teste

As `renovações` são protegidas através de:
- testes de integração de módulos
- Testes de integração HTTP para auxiliares de consulta, fluxos de trabalho e rotas
- um teste de integração de fluxo administrativo
- um teste de integração de nível de fumaça contra `Assinaturas` e `Planos e Ofertas`

Arquivos de teste implementados:
- `src/modules/renewal/__tests__/service.spec.ts`
- `integration-tests/http/renewals-workflows.spec.ts`
- `integration-tests/http/renewals-routes.spec.ts`
- `integration-tests/http/renewals-admin-flow.spec.ts`
- `testes de integração/http/renewals-smoke.spec.ts`

Documentos relacionados:
- [API de renovações de administrador](../api/admin-renewals.md)
- [IU de renovações de administrador](../admin/renewals.md)
- [Teste de renovações](../testing/renewals.md)
- [Especificações de renovações](../specs/renewals/admin-spec.md)
