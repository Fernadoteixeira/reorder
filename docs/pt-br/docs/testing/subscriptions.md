# Teste: Assinaturas

Este documento descreve a estratégia de teste atual para a área `Subscriptions` no plugin `Reorder`.

Abrange:
- camadas de teste
- arquivos de teste
- comandos
- estratégia de fixação
- escopo de cobertura
- não objetivos conhecidos

## Propósito

A configuração de teste para `Subscriptions` foi projetada para proteger o plugin nas camadas oficialmente suportadas pelas ferramentas de teste da Medusa.

O projeto atualmente conta com:
- testes de integração de módulos
- Testes de integração HTTP

Atualmente, não inclui testes de IU baseados em navegador.

## 1. Estratégia de teste

A área `Subscriptions` é testada em duas camadas principais:

1. módulo/camada de serviço
2. Camada de integração de aplicativos Medusa

Isso dá cobertura para:
- comportamento do modelo de dados
- comportamento de serviço
- ajudantes de consulta
- fluxos de trabalho
- rotas personalizadas da API Admin
- fluxo de back-end de ponta a ponta usado pela UI do administrador

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
- verificar o serviço do módulo `subscription` isoladamente dos fluxos administrativos completos

Arquivo atual:
- [service.spec.ts](../../src/modules/subscription/__tests__/service.spec.ts)

Esta camada é o lugar certo para:
- comportamento de criação/atualização de serviço
- comportamento de persistência em nível de módulo
- lógica adjacente ao modelo

### 3.2 Testes de integração HTTP

Objetivo:
- execute um aplicativo Medusa completo em modo de teste
- chame as rotas administrativas personalizadas reais
- verificar os fluxos de trabalho e o comportamento da API usados pela interface do administrador

Arquivos atuais:
- [subscriptions-routes.spec.ts](../../integration-tests/http/subscriptions-routes.spec.ts)
- [subscriptions-workflows.spec.ts](../../integration-tests/http/subscriptions-workflows.spec.ts)
- [subscriptions-admin-flow.spec.ts](../../integration-tests/http/subscriptions-admin-flow.spec.ts)

Esta camada é a principal proteção para o comportamento do administrador implementado.

O checkout da loja agora emite a entrada inicial do log de atividades `subscription.created` por meio do fluxo de trabalho de checkout de assinatura. Ao alterar esse fluxo, estenda o fluxo de trabalho ou a camada de integração HTTP para proteger o evento emitido.

## 4. Estratégia de jogos

Os auxiliares de dados de teste são definidos em:
- [subscription-fixtures.ts](../../integration-tests/helpers/subscription-fixtures.ts)

Os ajudantes atuais incluem:
- criação de cabeçalho de autenticação de administrador
- criação de produtos e variantes
- criação de sementes de assinatura

Esses ajudantes estão acostumados a:
- reduzir a duplicação em testes de integração
- mantenha os testes de rota administrativa focados no comportamento
- fornecer dados iniciais realistas para ciclo de vida e fluxos de mutação

## 5. Cobertura Atual

### Cobertura do Módulo

Coberto na camada de módulo/serviço:
- criação de assinatura
- recuperação de assinatura
- atualizações de assinatura através do serviço do módulo

### Consulta e cobertura de fluxo de trabalho

Coberto por meio de testes de integração:
- comportamento de consulta de lista
- comportamento detalhado da consulta
- enriquecimento ao vivo de clientes e produtos com substituto de instantâneo para leituras de administrador
- pausar o fluxo de trabalho
- retomar o fluxo de trabalho
- cancelar fluxo de trabalho
- agendar fluxo de trabalho de mudança de plano
- atualizar o fluxo de trabalho do endereço de entrega
- transições de estado inválidas

### Cobertura da API Admin

Coberto por meio de testes de integração HTTP:
- `GET /admin/subscriptions`
- `GET /admin/subscriptions/:id`
- `POST /admin/subscriptions/:id/pause`
- `POST /admin/subscriptions/:id/resume`
- `POST /admin/subscriptions/:id/cancel`
- `POST /admin/subscriptions/:id/schedule-plan-change`
- `POST /admin/subscriptions/:id/update-shipping-address`

Acompanhamento de checkout na loja:
- `POST /store/carts/:id/subscribe` agora existe como rota de compra de assinatura dedicada
- a rota espera metadados de assinatura no item de linha do carrinho
- a finalização da compra única permanece após a conclusão padrão do carrinho Medusa

### Cobertura do fluxo administrativo

O arquivo [subscriptions-admin-flow.spec.ts](../../integration-tests/http/subscriptions-admin-flow.spec.ts) cobre o principal fluxo de back-end de ponta a ponta usado pela UI do administrador:
- listar assinaturas
- detalhes da assinatura aberta
- pausa
- currículo
- mudança de plano de cronograma
- editar endereço de entrega
- cancelar

Este não é um teste de navegador.

É um teste de fluxo em nível de integração que usa ferramentas suportadas pela Medusa e os mesmos endpoints administrativos personalizados usados ​​pela UI.

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
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/subscriptions-admin-flow.spec.ts
```

Execute um arquivo de teste de módulo único:

```bash
TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand src/modules/subscription/__tests__/service.spec.ts
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
- adicione um teste de cenário quando quiser proteger um fluxo operacional completo em vários endpoints

Para a nova funcionalidade `Subscriptions`:
- prefira estender os arquivos de teste `subscriptions-*` existentes se a mudança corresponder ao seu escopo
- crie um novo arquivo de teste focado somente quando o fluxo se tornar grande o suficiente para merecer seu próprio cenário

## 9. Orientação prática para futuros colaboradores

Ao alterar a área `Subscriptions`:
Primeiro, atualize ou adicione um teste de módulo se o comportamento do serviço mudar
2. atualizar ou adicionar um teste de integração HTTP se o comportamento da rota, validadores ou fluxos de trabalho mudarem
3. atualize o teste de cenário se o fluxo do operador Admin principal mudar

Se um recurso alterar o contrato de:
- filtragem de lista
- classificação
- regras de mutação
- carga útil detalhada retornada

então os testes de integração correspondentes devem ser atualizados no mesmo conjunto de alterações.

## 10. Resumo

A área `Subscriptions` é atualmente testada por meio de camadas de integração suportadas pela Medusa, em vez de automação do navegador.

Isso fornece proteção forte para:
- comportamento do domínio
- comportamento do fluxo de trabalho
- Contrato de API de administrador
- o principal fluxo operacional do administrador

Ele não tenta validar detalhes de renderização no navegador.
