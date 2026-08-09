# Teste: configurações de assinatura

Este documento descreve a estratégia de teste atual para a área `Configurações de assinatura` no plugin `Reorder`.

Abrange:
- camadas de teste
- arquivos de teste atuais
- cobertura de efeito de tempo de execução
- Cobertura do fluxo administrativo
- limitações conhecidas

## Propósito

A configuração de teste de Configurações destina-se a proteger:
- semântica de validação e normalização
- comportamento de bootstrap substituto
- semântica de atualização singleton
- bloqueio otimista
- efeitos de tempo de execução em renovações, cobranças e cancelamentos
- API Admin e fluxos administrativos em nível de cenário

O projeto atualmente conta com:
- testes de integração de módulos
- Testes de integração HTTP Medusa

Atualmente, não inclui automação administrativa baseada em navegador.

## 1. Estratégia de teste

A área `Configurações de assinatura` está atualmente protegida em cinco camadas:

Primeiro, testes de configurações em nível de módulo
2. testes de integração de fluxo de trabalho
3. Testes de integração de rota administrativa
4. Testes de integração de efeito de tempo de execução
5. Testes de integração de fluxo administrativo

Esta divisão corresponde à mesma filosofia geral de testes usada por outras áreas de plugins.

## 2. Arquivos de teste atuais

### 2.1 Testes do Módulo

Arquivos atuais:
- [normalize-settings.spec.ts](../../src/modules/settings/__tests__/normalize-settings.spec.ts)
- [service.spec.ts](../../src/modules/settings/__tests__/service.spec.ts)

Esta camada cobre:
- validação e normalização
- padrões de reserva
- `getSettings()`
- `atualizarConfigurações()`
- `resetSettings()`
- comportamento singleton de criação preguiçosa
- semântica de leitura persistente

### 2.2 Testes de Fluxo de Trabalho

Arquivo atual:
- [subscription-settings-workflows.spec.ts](../../integration-tests/http/subscription-settings-workflows.spec.ts)

Esta camada cobre:
- bloqueio otimista através de `expected_version`
- metadados de auditoria acrescentam semântica
- comportamento de reversão e compensação
- restauração do estado persistente anterior após um caminho de fluxo de trabalho com falha

### 2.3 Testes de rota da API Admin

Arquivo atual:
- [subscription-settings-routes.spec.ts](../../integration-tests/http/subscription-settings-routes.spec.ts)

Esta camada cobre:
- `GET /admin/configurações de assinatura`
- `POST /admin/configurações de assinatura`
- padrões de fallback na leitura
- falhas de validação
- `409 conflito` para `expected_version` obsoleto

### 2.4 Testes de efeito em tempo de execução

Arquivo atual:
- [subscription-settings-runtime-effects.spec.ts](../../integration-tests/http/subscription-settings-runtime-effects.spec.ts)

Esta camada cobre:
- Configurações de leitura de `Dunning` para criação de novo `DunningCase`
- Comportamento padrão do instantâneo `Cancellation` para o novo `CancellationCase`
- `Renovações` usando configurações no momento da criação
- falta de reescrita retroativa do estado do processo existente após alterações posteriores nas configurações

### 2.5 Testes de fluxo administrativo

Arquivo atual:
- [subscription-settings-admin-flow.spec.ts](../../integration-tests/http/subscription-settings-admin-flow.spec.ts)

Esta camada cobre:
- `ler -> editar -> salvar -> atualizar`
- atualização persistente visível após salvar
- efeito de tempo de execução após a alteração das configurações por meio de um fluxo representativo de `Dunning`
- confirmação de que o contrato de leitura das configurações está estável em leituras repetidas do administrador

## 3. Comandos

Execute todos os testes de integração HTTP:

```bash
yarn test:integration:http
```

Execute todos os testes de integração do módulo:

```bash
yarn test:integration:modules
```

Execute testes do módulo de configurações:

```bash
TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand src/modules/settings/__tests__
```

Execute testes de fluxo de trabalho de configurações:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscription-settings-workflows.spec.ts
```

Execute testes de rota de configurações:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscription-settings-routes.spec.ts
```

Execute testes de efeito de tempo de execução:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscription-settings-runtime-effects.spec.ts
```

Execute testes de fluxo administrativo:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscription-settings-admin-flow.spec.ts
```

## 4. Resumo da cobertura

### Módulo e cobertura de serviço

Coberto:
- padrões e fallback de bootstrap
- regras de validação
- tentar novamente a normalização do cronograma
- semântica de persistência singleton

### Cobertura do fluxo de trabalho

Coberto:
- bloqueio otimista
- persistência da trilha de auditoria
- reversão para fallback após falha na criação
- reversão para o estado persistente anterior após falha na atualização

### Cobertura da API Admin

Coberto:
- configurações eficazes lidas
- gravação de atualização persistente
- manipulação de carga útil inválida
- comportamento de conflito de versão obsoleta

### Cobertura de tempo de execução

Coberto:
- Integração `Dunning`
- Integração de `Cancelamento`
- Semântica de snapshot no momento da criação de `renovações`

### Cobertura do fluxo administrativo

Coberto:
- fluxo do operador principal para leitura e salvamento de configurações
- comportamento persistente de leitura após gravação
- efeito de tempo de execução representativo após salvar

## 5. Limitações conhecidas

A estratégia atual de teste de configurações não inclui:
- Dramaturgo
- testes de componentes administrativos baseados em navegador
- teste de regressão visual
- testes de permissão ou RBAC para controle de acesso futuro baseado em função

Limitação atual importante:
- o repositório não fornece atualmente um equipamento de teste Admin React baseado em `jsdom`
- portanto `subscription-settings-admin-flow.spec.ts` é implementado como um teste de fluxo HTTP, não um teste de componente React

## 6. Como estender a cobertura

Use esta regra prática:

- estender as especificações do módulo quando a validação ou os padrões mudarem
- estender as especificações do fluxo de trabalho quando a semântica otimista de bloqueio, auditoria ou reversão for alterada
- estender a especificação da rota quando a validação da solicitação ou os contratos de resposta mudarem
- estender a especificação do efeito de tempo de execução quando um novo módulo começar a consumir configurações
- estender a especificação do fluxo administrativo quando o operador esperado salvar alterações no fluxo

## 7. Resumo

As `Configurações de assinatura` estão atualmente protegidas nas camadas que são importantes para este plugin:
- correção do módulo
- correção do fluxo de trabalho
- Correção da API Admin
- correção de integração em tempo de execução
- correção do fluxo administrativo em nível de cenário

Isso oferece uma boa cobertura para o MVP de configurações implementado sem adicionar ferramentas de navegador não suportadas.
