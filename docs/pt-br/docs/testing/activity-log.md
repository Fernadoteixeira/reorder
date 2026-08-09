# Teste: Log de atividades

Este documento descreve a estratégia de teste atual para a área `Activity Log` no plugin `Reorder`.

Abrange:
- camadas de teste
- arquivos de teste
- comandos
- estratégia de fixação
- escopo de cobertura
- não objetivos conhecidos

## Propósito

A configuração de teste para `Activity Log` foi projetada para proteger a camada de auditoria de negócios nos limites oficialmente suportados pelas ferramentas de teste da Medusa.

O projeto atualmente conta com:
- testes de integração de módulos
- Testes de integração HTTP

Atualmente, não inclui automação de UI baseada em navegador.

## 1. Estratégia de teste

A área `Activity Log` é testada em duas camadas principais:

1. Testes de back-end adjacentes ao módulo e ao fluxo de trabalho
2. Testes de integração de aplicativos Medusa

Isso dá cobertura para:
- normalização de eventos
- semântica de desduplicação
- comportamento de gravação central apenas para acréscimos
- emissão de eventos apoiados por fluxo de trabalho
- rotas de leitura de administrador personalizadas
- verificação de fluxo administrativo em estilo de cenário

## 2. Ferramentas de teste

A configuração atual usa ferramentas de teste suportadas pela Medusa:
- `Jest`
- `@medusajs/test-utils`
- `moduleIntegrationTestRunner`
- `medusaIntegrationTestRunner`

Arquivos de repositório envolvidos na configuração:
- [pacote.json](../../pacote.json)
- [jest.config.js](../../jest.config.js)
- [testes de integração/setup.js](../../testes de integração/setup.js)
- [testes de integração/medusa-config.ts](../../integration-tests/medusa-config.ts)

## 3. Camadas de teste

### 3.1 Testes de Integração de Módulo

Objetivo:
- verificar a normalização e o comportamento central de criação de eventos isoladamente dos fluxos administrativos completos

Arquivos atuais:
- [normalize-log-event.spec.ts](../../src/modules/activity-log/__tests__/normalize-log-event.spec.ts)
- [criar-subscrição-log-event.spec.ts](../../src/modules/activity-log/__tests__/create-subscription-log-event.spec.ts)

Esta camada é o lugar certo para:
- `dedupe_key` estabilidade
- redação de campos sensíveis
- construção `changed_fields`
- idempotente cria semântica
- comportamento de compensação

### 3.2 Testes de integração HTTP

Objetivo:
- execute um aplicativo Medusa completo em modo de teste
- execute fluxos de trabalho reais e rotas administrativas personalizadas
- verifique os mesmos contratos de leitura usados pela UI Admin

Arquivos atuais:
- [subscriptions-workflows.spec.ts](../../integration-tests/http/subscriptions-workflows.spec.ts)
- [renewals-workflows.spec.ts](../../integration-tests/http/renewals-workflows.spec.ts)
- [cancellations-workflows.spec.ts](../../integration-tests/http/cancellations-workflows.spec.ts)
- [subscription-logs-routes.spec.ts](../../integration-tests/http/subscription-logs-routes.spec.ts)
- [subscriptions-admin-flow.spec.ts](../../integration-tests/http/subscriptions-admin-flow.spec.ts)

Esta camada é a principal proteção para:
- emissão de eventos apoiados por fluxo de trabalho
- Lista de administradores, detalhes e contratos de API de cronograma
- lista -> detalhe -> consistência do fluxo do cronograma

## 4. Estratégia de jogos

Os auxiliares de dados de teste reutilizados pela cobertura `Activity Log` são definidos em:
- [plan-offer-fixtures.ts](../../integration-tests/helpers/plan-offer-fixtures.ts)
- [renovação-fixtures.ts](../../integration-tests/helpers/renewal-fixtures.ts)
- [cancellation-fixtures.ts](../../integration-tests/helpers/cancellation-fixtures.ts)
- [dunning-fixtures.ts](../../integration-tests/helpers/dunning-fixtures.ts)

Os testes `Activity Log` preferem intencionalmente:
- criar eventos através de fluxos de trabalho reais quando possível
- utilizar a criação direta de módulos somente quando o foco do teste for a própria API de leitura

Isto mantém o foco dos testes e evita duplicação desnecessária de fluxos de sementes.

## 5. Cobertura Atual

### Cobertura do Módulo

Coberto na camada do módulo:
- geração de diferenças compactas
- redação de dados confidenciais
- lista de permissões de metadados
- serialização de data em cargas normalizadas
- `dedupe_key` estabilidade e diferenciação
- criação central de eventos sem duplicatas
- comportamento de compensação para registros criados versus registros existentes

### Fluxo de trabalho e cobertura de back-end

Coberto por meio de testes de integração:
- Emissão de evento `Subscriptions` para:
  - pausa
  - currículo
  - cancelar
  - mudança de plano de cronograma
  - atualizar endereço de entrega
- correção da carga útil para esses eventos de assinatura:
  - `event_type`
  - `reason`
  - `actor_type`
  - `changed_fields`
  - `metadata`
  - redação de campos confidenciais de endereço de entrega

Já existe cobertura adicional em suítes específicas para áreas para:
- `Renewals` emissão de eventos e registro de resultados
- Emissão de eventos `Cancellation & Retention` e presença de carga útil
- armazenar a normalização da carga útil de criação de checkout na camada do módulo para `subscription.created`

### Cobertura da API Admin

Coberto por meio de testes de integração HTTP:
- `GET /admin/subscription-logs`
- `GET /admin/subscription-logs/:id`
- `GET /admin/subscriptions/:id/logs`

Isso inclui:
- filtros
- classificação
- paginação
- recuperação detalhada da carga útil
- escopo da linha do tempo
- `404` para registros de detalhes ausentes

### Cobertura do fluxo administrativo

A cobertura atual em nível de fluxo verifica:
- lista global
- detalhe do evento
- cronograma de assinatura
- consistência de um evento nesses três caminhos de leitura

Este não é um teste de navegador.

É um teste de fluxo em nível de integração que usa ferramentas suportadas pela Medusa e os mesmos endpoints administrativos usados ​​pela UI.

## 6. Comandos

Execute todos os testes de integração HTTP:

```bash
yarn test:integration:http
```

Execute todos os testes de integração do módulo:

```bash
yarn test:integration:modules
```

Execute a cobertura da rota do registro de atividades:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscription-logs-routes.spec.ts
```

Execute a cobertura do fluxo de trabalho de assinatura que declara logs emitidos:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscriptions-workflows.spec.ts
```

Execute os testes do módulo de log de atividades:

```bash
TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand src/modules/activity-log/__tests__/normalize-log-event.spec.ts
```

```bash
TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand src/modules/activity-log/__tests__/create-subscription-log-event.spec.ts
```

## 7. O que não é coberto intencionalmente

A estratégia atual não inclui:
- Dramaturgo
- Automação administrativa baseada em navegador
- teste de regressão visual
- comportamento de trabalho de arquivamento ou retenção

Razão:
- o projeto atualmente segue o caminho de teste Medusa com suporte oficial baseado em `@medusajs/test-utils`
- a implementação atual de `Activity Log` é validada por meio de integração de back-end e fluxos de API Admin

## 8. Como adicionar novos testes

Use esta regra prática:

- adicionar ou estender um teste de módulo ao alterar o comportamento de normalização, redação ou desduplicação
- adicionar ou estender um teste de integração HTTP ao alterar a emissão de eventos, contratos de rota, filtros, classificação ou comportamento da linha do tempo
- estender um conjunto de fluxo de trabalho específico de área quando um novo fluxo de trabalho de domínio emitir um novo evento de log de atividades
- estender o conjunto de rotas quando o contrato de leitura do administrador for alterado

## 9. Resumo

`Activity Log` está atualmente protegido nas camadas que são importantes para este plugin:
- criação de eventos normalizados
- comportamento de gravação apoiado por fluxo de trabalho
- Comportamento de leitura da API pelo administrador
- consistência do fluxo de leitura em nível de cenário

Isso oferece boa proteção para a superfície de trilha de auditoria implementada sem introduzir ferramentas de navegador não suportadas.
