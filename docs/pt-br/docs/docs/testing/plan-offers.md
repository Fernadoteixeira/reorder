# Teste: Planos e Ofertas

Este documento descreve a estratégia de teste atual para a área `Planos e Ofertas` no plugin `Reorder`.

Abrange:
- camadas de teste
- arquivos de teste
- comandos
- estratégia de fixação
- escopo de cobertura
- não objetivos conhecidos

## Propósito

A configuração de teste para `Planos e Ofertas` foi projetada para proteger o plugin nas camadas oficialmente suportadas pelas ferramentas de teste da Medusa.

O projeto atualmente conta com:
- testes de integração de módulos
- Testes de integração HTTP

Atualmente, não inclui testes de IU baseados em navegador.

## 1. Estratégia de teste

A área `Planos e Ofertas` é testada em duas camadas principais:

1. módulo/camada de serviço
2. Camada de integração de aplicativos Medusa

Isso dá cobertura para:
- comportamento do modelo de dados
- comportamento de serviço
- resolução de configuração eficaz
- ajudantes de consulta
- fluxos de trabalho
- rotas personalizadas da API Admin
- fluxo de back-end de ponta a ponta usado pela UI do administrador
- integração entre áreas com `Assinaturas`

Esta camada é a principal proteção para o comportamento do administrador implementado e o limite atual de integração da oferta de assinatura.

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
- verificar o serviço do módulo `planOffer` isoladamente dos fluxos administrativos completos

Arquivo atual:
- [service.spec.ts](../../src/modules/plan-offer/__tests__/service.spec.ts)

Esta camada é o lugar certo para:
- comportamento de criação de serviço
- comportamento de recuperação de serviço
- comportamento de persistência em nível de módulo
- comportamento de atualização adjacente ao modelo

### 3.2 Testes de integração HTTP

Objetivo:
- execute um aplicativo Medusa completo em modo de teste
- chame rotas administrativas personalizadas reais
- executar fluxos de trabalho e consultar auxiliares em um aplicativo em execução
- verifique o comportamento usado pela UI do administrador

Arquivos atuais:
- [plan-offers-workflows.spec.ts](../../integration-tests/http/plan-offers-workflows.spec.ts)
- [plan-offers-routes.spec.ts](../../integration-tests/http/plan-offers-routes.spec.ts)

Cobertura de integração relacionada para comportamento entre áreas:
- [subscriptions-workflows.spec.ts](../../integration-tests/http/subscriptions-workflows.spec.ts)
- [subscriptions-routes.spec.ts](../../integration-tests/http/subscriptions-routes.spec.ts)

## 4. Estratégia de jogos

Os auxiliares de dados de teste são definidos em:
- [plan-offer-fixtures.ts](../../integration-tests/helpers/plan-offer-fixtures.ts)
- [subscription-fixtures.ts](../../integration-tests/helpers/subscription-fixtures.ts)

Os ajudantes atuais incluem:
- criação de cabeçalho de autenticação de administrador
- criação de produtos e variantes
- planejar a criação de ofertas de sementes
- criação de sementes de assinatura para cenários de integração

Esses ajudantes estão acostumados a:
- reduzir a duplicação em testes de integração
- manter os testes de rota e fluxo de trabalho focados no comportamento
- fornecer registros de origem realistas e contexto de produto vinculado
- apoiar a integração do nível de fumaça com `Assinaturas`

## 5. Cobertura Atual

### Cobertura do Módulo

Coberto na camada de módulo/serviço:
- planejar a criação de ofertas
- planejar a recuperação de ofertas
- atualizações em campos escalares e baseados em JSON
- atualizações em campos auxiliares como `frequency_intervals`

### Consulta e cobertura de fluxo de trabalho

Coberto por meio de testes de integração:
- comportamento de consulta de lista
- comportamento detalhado da consulta
- comportamento eficaz de fallback de configuração
- criar ou atualizar fluxo de trabalho
- atualizar fluxo de trabalho
- alternar fluxo de trabalho
- combinações de frequência inválidas
- validação de incompatibilidade de produto e variante
- validação de faixa de desconto
- comportamento upsert para um alvo existente

### Cobertura da API Admin

Coberto por meio de testes de integração HTTP:
- `GET /admin/subscription-offers`
- `GET /admin/subscription-offers/:id`
- `POST /admin/ofertas de assinatura`
- `POST /admin/subscription-offers/:id`
- `POST /admin/subscription-offers/:id/toggle`

Isso inclui:
- caminhos de sucesso
- solicitar falhas de validação
- falhas de validação de domínio
- comportamento da lista filtrada

### Cobertura do fluxo administrativo

O arquivo [plan-offers-routes.spec.ts](../../integration-tests/http/plan-offers-routes.spec.ts) inclui um fluxo de estilo de cenário que abrange:
- lista
- criar
- detalhe
- editar
- salvar
- atualizar
- verificação do valor final

Este não é um teste de navegador.

É um fluxo de back-end em nível de integração que usa os mesmos endpoints administrativos personalizados usados ​​pela IU.

### Assinaturas Smoke-Check

A estratégia de teste atual também inclui integração de nível de fumaça com `Assinaturas`.

Comportamento coberto:
- alterações no plano de assinatura são permitidas quando existe uma oferta ativa para o contexto de destino
- a frequência solicitada deve corresponder à configuração efetiva ativa
- alterações de plano são rejeitadas quando não existe oferta ativa

A cobertura total de permissão/bloqueio/oferta não ativa do nível de fumaça atualmente reside em:
- [subscriptions-routes.spec.ts](../../integration-tests/http/subscriptions-routes.spec.ts)

A cobertura positiva do caminho de fluxo de trabalho relacionada reside em:
- [subscriptions-workflows.spec.ts](../../integration-tests/http/subscriptions-workflows.spec.ts)

## 6. Comandos

Execute todos os testes de integração HTTP:

```bash
yarn test:integration:http
```

Execute todos os testes de integração do módulo:

```bash
yarn test:integration:modules
```

Execute um único arquivo de teste HTTP:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/plan-offers-routes.spec.ts
```

Execute o arquivo de integração de consulta e fluxo de trabalho:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/plan-offers-workflows.spec.ts
```

Execute o arquivo de teste do módulo:

```bash
TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand src/modules/plan-offer/__tests__/service.spec.ts
```

## 7. O que não é coberto intencionalmente

A estratégia de teste atual não inclui:
- Dramaturgo
- Automação da UI Admin baseada em navegador
- teste de regressão visual

Razão:
- o projeto atualmente segue o caminho de teste Medusa com suporte oficial baseado em `@medusajs/test-utils`
- o fluxo administrativo principal é validado por meio de testes de integração HTTP, em vez de automação do navegador

## 8. Como adicionar novos testes

Use esta regra prática:

- adicione um teste de módulo quando o comportamento pertencer ao próprio serviço do módulo
- adicione um teste de integração HTTP quando o comportamento depender de rotas reais, fluxos de trabalho, autenticação ou validação de solicitação
- estender o fluxo do cenário quando quiser proteger um fluxo completo do operador em vários endpoints
- estender a verificação de `Assinaturas` quando alterações na semântica da oferta afetarem alterações no plano de assinatura

Para a nova funcionalidade `Planos e Ofertas`:
- prefira estender os arquivos de teste `plan-offers-*` existentes se a mudança corresponder ao seu escopo
- crie um novo arquivo de teste focado somente quando o fluxo se tornar grande o suficiente para merecer seu próprio cenário

## 9. Orientação prática para futuros colaboradores

Ao alterar a área `Planos e Ofertas`:
Primeiro, atualize ou adicione um teste de módulo se o comportamento do serviço mudar
2. atualizar ou adicionar um teste de integração HTTP se o comportamento da rota, validadores, consultas ou fluxos de trabalho mudarem
3. atualize o fluxo do cenário se o fluxo do operador Admin principal for alterado
4. atualize a verificação de `Assinaturas` se a configuração efetiva ou o comportamento de mudança de plano mudarem

Se um recurso alterar o contrato de:
- filtragem de lista
- classificação
- semântica de configuração eficaz
- regras de mutação
- carga útil detalhada retornada

então os testes de integração correspondentes devem ser atualizados no mesmo conjunto de alterações.

## 10. Resumo

A área `Planos e Ofertas` é atualmente testada por meio de camadas de integração suportadas pela Medusa, em vez de automação do navegador.

Isso fornece proteção forte para:
- comportamento do domínio
- resolução de configuração eficaz
- comportamento do fluxo de trabalho
- Contrato de API de administrador
- o principal fluxo do operador Admin
- integração com `Assinaturas`

Ele não tenta validar detalhes de renderização no navegador.

## Documentos Relacionados

- [Visão geral dos documentos](../README.md)
- [Arquitetura de Planos e Ofertas](../architecture/plan-offers.md)
- [API de administração de planos e ofertas](../api/admin-plan-offers.md)
- [IU de administração de planos e ofertas](../admin/plan-offers.md)
- [Roteiro](../roadmap/implementation-plan.md)
