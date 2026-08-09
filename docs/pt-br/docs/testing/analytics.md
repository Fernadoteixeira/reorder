# Teste: Análise

Este documento descreve a estratégia de teste atual para a área `Analytics` no plugin `Reorder`.

Abrange:
- camadas de teste
- arquivos de teste
- comandos
- escopo de cobertura
- estratégia de fixação e cenário
- limitações conhecidas

## Propósito

A configuração de testes do Analytics destina-se a proteger:
- Semântica de cálculo de KPI
- comportamento de tendência e filtro
- comportamento de reconstrução de instantâneo
- Contratos de rota de análise administrativa
- Fluxos de relatórios administrativos em nível de cenário

O projeto atualmente conta com:
- testes de integração de módulos
- Testes de integração HTTP Medusa

Atualmente, não inclui automação administrativa baseada em navegador.

## 1. Estratégia de teste

A área `Analytics` está atualmente protegida em quatro camadas:

1. Testes de modelo de leitura em nível de módulo
2. reconstruir testes de integração de fluxo de trabalho
3. Testes de integração de rota administrativa
4. Testes de integração de fluxo administrativo

Esta divisão corresponde à mesma filosofia de testes já utilizada pelas outras áreas de plugins.

## 2. Ferramentas de teste

A configuração atual usa:
- `Jest`
- `@medusajs/test-utils`
- `moduleIntegrationTestRunner`
- `medusaIntegrationTestRunner`

Arquivos de repositório envolvidos na configuração:
- [pacote.json](../../pacote.json)
- [jest.config.js](../../jest.config.js)
- [testes de integração/setup.js](../../testes de integração/setup.js)
- [testes de integração/medusa-config.ts](../../integration-tests/medusa-config.ts)

## 3. Arquivos de teste atuais

### 3.1 Testes de modelo de leitura de módulo

Arquivo atual:
- [admin-query.spec.ts](../../src/modules/analytics/__tests__/admin-query.spec.ts)

Esta camada cobre:
- `MRR`
- `churn_rate`
- `LTV`
- `active_subscriptions_count`
- `created_subscriptions_count`
- agrupamento de intervalos para `day`, `week` e `month`
- filtros para `status`, `product_id` e `frequency`
- buckets de dias de assinatura criada com zero preenchimento
- comportamento em moeda mista
- comportamento do conjunto de dados vazio
- intervalo inválido e semântica de frequência inválida

### 3.2 Reconstruir testes de integração de fluxo de trabalho

Arquivo atual:
- [analytics-workflows.spec.ts](../../integration-tests/http/analytics-workflows.spec.ts)

Esta camada cobre:
- fluxo de trabalho de reconstrução compartilhado para um intervalo de dias
- repetições idempotentes
- semântica de substituição completa
- tratamento de falhas parciais
- reutilização manual da rota de reconstrução do mesmo fluxo de trabalho compartilhado

### 3.3 Testes de rota da API Admin

Arquivo atual:
- [subscription-analytics-routes.spec.ts](../../integration-tests/http/subscription-analytics-routes.spec.ts)

Esta camada cobre:
- `GET /admin/subscription-analytics/kpis`
- `GET /admin/subscription-analytics/trends`
- `GET /admin/subscription-analytics/export`
- validação de consulta
- padrões para `group_by` e `UTC`
- limite máximo da janela
- exportar consistência de carga útil em filtros ativos

### 3.4 Testes de integração de fluxo administrativo

Arquivo atual:
- [subscription-analytics-admin-flow.spec.ts](../../integration-tests/http/subscription-analytics-admin-flow.spec.ts)

Esta camada cobre:
- leituras de KPI filtradas
- leituras de tendências filtradas
- exportar `CSV` e `JSON` sob demanda
- cenários de resultado vazio
- cenários de consulta inválida
- confirmação de que a exportação não substitui ou invalida o contrato de leitura e exibição por si só

## 4. Estratégia de jogos

Os testes de análise reutilizam dispositivos reais de comércio recorrente sempre que possível.

A estratégia preferida é:
- criar assinaturas e fatos de domínio relacionados por meio de ajudantes existentes
- reconstruir instantâneos analíticos por meio do fluxo de trabalho compartilhado
- afirmar o comportamento de leitura do conjunto de dados `subscription_metrics_daily` resultante

Isso mantém os testes alinhados com os limites reais do tempo de execução do recurso.

## 5. Resumo da cobertura

### Leia a cobertura do modelo

Coberto:
- Fórmulas de KPI
- semântica do balde
- semântica de filtro
- semântica de agregação diária de assinatura criada
- nulidade para moedas mistas e dados de receitas insuficientes
- comportamento do conjunto de dados vazio

### Cobertura do gasoduto

Coberto:
- reconstrução de alcance
- substituição em nível diurno
- executar novamente a idempotência
- resumo de falha parcial
- reutilização de fluxo de trabalho de reconstrução manual

### Cobertura da API Admin

Coberto:
- endpoints de leitura analítica
- terminal de exportação
- padrões e limites de validação
- estabilidade do contrato de exportação

### Cobertura do fluxo administrativo

Coberto:
- KPI -> tendências -> fluxo do cenário de exportação
- leituras orientadas por filtro
- cenários de solicitação vazia e inválida

## 6. Comandos

Execute todos os testes de integração HTTP:

```bash
yarn test:integration:http
```

Execute todos os testes de integração do módulo:

```bash
yarn test:integration:modules
```

Execute testes do módulo analítico:

```bash
TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand src/modules/analytics/__tests__/admin-query.spec.ts
```

Execute testes de integração de fluxo de trabalho analítico:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/analytics-workflows.spec.ts
```

Execute testes de integração de rotas analíticas:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscription-analytics-routes.spec.ts
```

Execute testes de fluxo administrativo de análise:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscription-analytics-admin-flow.spec.ts
```

## 7. Limitações conhecidas

A estratégia atual de testes analíticos não inclui:
- Dramaturgo
- testes de componentes administrativos baseados em navegador
- teste de regressão visual
- monitoramento externo ou verificação de alertas

Limitação atual importante:
- o repositório não fornece atualmente um equipamento de teste Admin React baseado em `jsdom`
- portanto, `subscription-analytics-admin-flow.spec.ts` é implementado como um teste de fluxo HTTP, não um teste de componente React

## 8. Como estender a cobertura

Use esta regra prática:

- estender a especificação do módulo quando a semântica de KPI, bucket ou filtro mudar
- estender a especificação do fluxo de trabalho quando a semântica da reconstrução do snapshot mudar
- estender a especificação da rota quando a validação da solicitação ou os contratos de resposta mudarem
- estender a especificação do fluxo administrativo quando o fluxo esperado do operador for alterado

## 9. Resumo

`Analytics` está atualmente protegido nas camadas que são importantes para este plugin:
- fórmula e correção do modelo de leitura
- correção do pipeline de reconstrução
- Correção do contrato da API Admin
- correção do fluxo de relatórios administrativos em nível de cenário

Isso oferece boa proteção para a superfície analítica do MVP implementada sem adicionar ferramentas de navegador não suportadas.
