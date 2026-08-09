# Teste: Cancelamento e Retenção

Este documento descreve a estratégia de teste atual para a área `Cancelamento e Retenção` no plugin `Reordenar`.

Abrange:
- camadas de teste
- arquivos de teste
- comandos
- estratégia de fixação
- escopo de cobertura
- não objetivos conhecidos

## Propósito

A configuração de teste para `Cancelamento e Retenção` foi projetada para proteger o plugin nas camadas oficialmente suportadas pelas ferramentas de teste da Medusa.

O projeto atualmente conta com:
- Testes de integração HTTP

Atualmente, não inclui testes de IU baseados em navegador.

## 1. Estratégia de teste

A área `Cancelamento e Retenção` está atualmente testada na camada de integração de aplicativos Medusa.

Isso dá cobertura para:
- fluxos de trabalho
- rotas personalizadas da API Admin
- Fluxos de back-end de administração usados pela IU
- integração de nível de fumaça com `Assinaturas`, `Renovações` e `Dunning`

## 2. Ferramentas de teste

A configuração atual usa ferramentas de teste suportadas pela Medusa:
- `Jest`
- `@medusajs/test-utils`
- `medusaIntegrationTestRunner`

Arquivos de repositório envolvidos na configuração:
- [pacote.json](../../pacote.json)
- [jest.config.js](../../jest.config.js)
- [testes de integração/setup.js](../../testes de integração/setup.js)
- [testes de integração/medusa-config.ts](../../integration-tests/medusa-config.ts)

## 3. Testes de integração HTTP

Objetivo:
- execute um aplicativo Medusa completo em modo de teste
- chame as rotas administrativas personalizadas reais
- verificar fluxos de trabalho, modelos de leitura e comportamento da API usados pela UI do administrador

Arquivos atuais:
- [cancellations-workflows.spec.ts](../../integration-tests/http/cancellations-workflows.spec.ts)
- [cancellations-routes.spec.ts](../../integration-tests/http/cancellations-routes.spec.ts)
- [cancellations-admin-flow.spec.ts](../../integration-tests/http/cancellations-admin-flow.spec.ts)
- [cancelamentos-smoke.spec.ts](../../integration-tests/http/cancellations-smoke.spec.ts)

Esta camada é a principal proteção para o comportamento de cancelamento e retenção implementado.

## 4. Estratégia de jogos

Os auxiliares de dados de teste são definidos em:
- [cancellation-fixtures.ts](../../integration-tests/helpers/cancellation-fixtures.ts)
- [subscription-fixtures.ts](../../integration-tests/helpers/subscription-fixtures.ts)
- [renovação-fixtures.ts](../../integration-tests/helpers/renewal-fixtures.ts)
- [dunning-fixtures.ts](../../integration-tests/helpers/dunning-fixtures.ts)

Os ajudantes atuais incluem:
- criação de cabeçalho de autenticação de administrador
- criação de sementes de assinatura
- criação de sementes de caso de cancelamento
- criação de sementes de eventos de oferta de retenção
- criação de sementes do ciclo de renovação
- criação de sementes de caso de cobrança

Esses ajudantes estão acostumados a:
- reduzir a duplicação em testes de integração
- manter os testes de rota e fluxo de trabalho focados no comportamento
- fornecer configuração realista de caso, oferta, assinatura, renovação e cobrança
- apoiar a integração do nível de fumaça em `Cancelamento e retenção`, `Assinaturas`, `Renovações` e `Dunning`

## 5. Cobertura Atual

### Cobertura do fluxo de trabalho

Coberto por meio de testes de integração:
- caminho de sucesso do `start-cancellation-case`
- reutilização ou atualização idempotente de um caso ativo existente
- guarda de caso ativa duplicada
- Caminhos de sucesso de `apply-retention-offer`
- Falhas na política `apply-retention-offer`
- caminho de sucesso `finalize-cancellation`
- comportamento do motivo obrigatório `finalize-cancellation`
- Comportamento `motivo de cancelamento de atualização`

### Cobertura da API Admin

Coberto por meio de testes de integração HTTP:
- `GET /admin/cancelamentos`
- `GET /admin/cancelamentos/:id`
- `POST /admin/cancelamentos/:id/apply-offer`
- `POST /admin/cancelamentos/:id/finalize`
- `POST /admin/cancelamentos/:id/motivo`

Isso inclui:
- caminhos de sucesso
- solicitar falhas de validação
- falhas de validação de domínio
- comportamento da lista filtrada
- detalhar o comportamento da carga útil

### Cobertura do fluxo administrativo

O arquivo [cancellations-admin-flow.spec.ts](../../integration-tests/http/cancellations-admin-flow.spec.ts) cobre os principais fluxos de back-end de estilo de cenário usados pela UI Admin:
- listar casos de cancelamento
- detalhe do caso aberto
- aplicar oferta de retenção
- finalizar o cancelamento
- atualizar detalhes e lista
- verificar o estado final

Este não é um teste de navegador.

É um teste de fluxo em nível de integração que usa ferramentas suportadas pela Medusa e os mesmos endpoints administrativos personalizados usados ​​pela UI.

### Cobertura de fumaça entre áreas

O arquivo [cancellations-smoke.spec.ts](../../integration-tests/http/cancellations-smoke.spec.ts) protege o limite principal do tempo de execução com outras áreas de plugins.

Comportamento coberto:
- pausar a retenção atualiza o ciclo de vida da assinatura para `pausado`
- `next_renewal_at` é preservado para assinaturas pausadas
- futuras renovações programadas são limpas de forma consistente após pausa ou cancelamento final
- cancelamento final define `cancel_efficient_at` e limpa `next_renewal_at`
- Assinaturas `past_due` ainda podem entrar no fluxo de cancelamento
- o `DunningCase` ativo coexiste com o fluxo de cancelamento ativo sem sobreposição de propriedade

Esta é intencionalmente uma verificação de integração em nível de fumaça, não um navegador completo ou teste de sistema.

## 6. Comandos

Execute todos os testes de integração HTTP:

```bash
yarn test:integration:http
```

Execute o arquivo de integração de fluxos de trabalho:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/cancellations-workflows.spec.ts
```

Execute o arquivo de integração de rotas administrativas:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/cancellations-routes.spec.ts
```

Execute o arquivo de fluxo administrativo:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/cancellations-admin-flow.spec.ts
```

Execute o arquivo de verificação de fumaça:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/cancellations-smoke.spec.ts
```

## 7. O que não é coberto intencionalmente

A estratégia de teste atual não inclui:
- Dramaturgo
- Automação da UI Admin baseada em navegador
- teste de regressão visual
- testes de serviço de módulo separados em `src/modules/cancellation/__tests__`

Razão:
- o projeto atualmente segue o caminho de teste Medusa com suporte oficial baseado em `@medusajs/test-utils`
- o fluxo administrativo principal é validado por meio de testes de integração HTTP, em vez de automação do navegador
- a proteção de maior valor para esse recurso está no fluxo de trabalho, na rota e no limite de integração entre módulos

## 8. Como adicionar novos testes

Use esta regra prática:

- adicionar ou estender um teste de integração HTTP quando o comportamento depender de rotas reais, fluxos de trabalho, autenticação, validação ou módulos Medusa vinculados
- adicione um teste de cenário quando quiser proteger um fluxo administrativo operacional completo em vários endpoints
- estender a verificação de fumaça quando as alterações afetarem o limite do tempo de execução com `Assinaturas`, `Renovações` ou `Dunning`

Para a nova funcionalidade `Cancelamento e Retenção`:
- prefira estender os arquivos de teste `cancellations-*` existentes se a mudança corresponder ao seu escopo
- crie um novo arquivo de teste focado somente quando o fluxo se tornar grande o suficiente para merecer seu próprio cenário

## 9. Orientação prática para futuros colaboradores

Ao alterar a área `Cancelamento e Retenção`:
1. atualizar ou adicionar um teste de integração HTTP se o comportamento da rota, validadores, consultas ou fluxos de trabalho mudarem
2. atualize o fluxo do cenário se o fluxo do operador Admin principal for alterado
3. atualize a verificação de fumaça se a semântica de cancelamento mudar no limite com `Assinaturas`, `Renovações` ou `Dunning`

Se um recurso alterar o contrato de:
- filtragem de fila
- classificação de fila
- regras de mutação
- carga útil detalhada retornada
- impacto do ciclo de vida na assinatura
- integração com renovações ou cobrança

então os testes de integração correspondentes devem ser atualizados no mesmo conjunto de alterações.

## 10. Resumo

A área `Cancelamento e Retenção` é atualmente testada por meio de camadas de integração HTTP suportadas pela Medusa, em vez de automação do navegador.

Isso fornece proteção forte para:
- fluxos de trabalho de cancelamento e retenção
- Rotas de leitura e mutação do administrador
- fluxos de operadores em estilo cenário
- o limite de integração de tempo de execução com `Assinaturas`, `Renovações` e `Dunning`
