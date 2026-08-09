# Teste: Renovações

Este documento descreve a estratégia de teste atual para a área `Renovações` no plugin `Reorder`.

Abrange:
- camadas de teste
- arquivos de teste
- comandos
- estratégia de fixação
- escopo de cobertura
- não objetivos conhecidos

## Propósito

A configuração de teste para `Renewals` foi projetada para proteger o plugin nas camadas oficialmente suportadas pelas ferramentas de teste da Medusa.

O projeto atualmente conta com:
- testes de integração de módulos
- Testes de integração HTTP

Atualmente, não inclui testes de IU baseados em navegador.

## 1. Estratégia de teste

A área `Renovações` é testada em duas camadas principais:

1. módulo/camada de serviço
2. Camada de integração de aplicativos Medusa

Isso dá cobertura para:
- comportamento do modelo de dados
- comportamento de serviço
- ajudantes de consulta
- fluxos de trabalho
- rotas personalizadas da API Admin
- fluxo de back-end de ponta a ponta usado pela UI do administrador
- integração de nível de fumaça com `Assinaturas` e `Planos e Ofertas`

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
- verificar o serviço do módulo `renovação` isoladamente dos fluxos administrativos completos

Arquivo atual:
- [service.spec.ts](../../src/modules/renewal/__tests__/service.spec.ts)

Esta camada é o lugar certo para:
- comportamento de criação do ciclo de renovação
- comportamento de criação de tentativa de renovação
- comportamento de persistência em nível de módulo
- comportamento de serviço adjacente ao modelo

### 3.2 Testes de integração HTTP

Objetivo:
- execute um aplicativo Medusa completo em modo de teste
- chame as rotas administrativas personalizadas reais
- verificar fluxos de trabalho, leituras voltadas ao agendador e comportamento da API conforme usado pela UI do administrador

Arquivos atuais:
- [renewals-workflows.spec.ts](../../integration-tests/http/renewals-workflows.spec.ts)
- [renewals-routes.spec.ts](../../integration-tests/http/renewals-routes.spec.ts)
- [renovações-admin-flow.spec.ts](../../integration-tests/http/renewals-admin-flow.spec.ts)
- [renovações-smoke.spec.ts](../../integration-tests/http/renewals-smoke.spec.ts)

Esta camada é a principal proteção para o comportamento do administrador implementado e o limite de execução da renovação.

## 4. Estratégia de jogos

Os auxiliares de dados de teste são definidos em:
- [renovação-fixtures.ts](../../integration-tests/helpers/renewal-fixtures.ts)
- [subscription-fixtures.ts](../../integration-tests/helpers/subscription-fixtures.ts)
- [plan-offer-fixtures.ts](../../integration-tests/helpers/plan-offer-fixtures.ts)

Os ajudantes atuais incluem:
- criação de cabeçalho de autenticação de administrador
- criação de produtos e variantes
- criação de sementes de assinatura
- criação de sementes do ciclo de renovação
- tentativa de renovação de criação de sementes
- planejar a criação de ofertas de sementes

Esses ajudantes estão acostumados a:
- reduzir a duplicação em testes de integração
- manter os testes de rota e fluxo de trabalho focados no comportamento
- fornecer dados iniciais realistas para fluxos de aprovação, nova tentativa e execução
- apoiar a integração de nível de fumaça em `Renovações`, `Assinaturas`, `Planos e Ofertas` e `Cancelamento e Retenção`

## 5. Cobertura Atual

### Cobertura do Módulo

Coberto na camada de módulo/serviço:
- criação de ciclo de renovação
- criação de tentativa de renovação
- comportamento de recuperação e persistência para registros de renovação

### Consulta e cobertura de fluxo de trabalho

Coberto por meio de testes de integração:
- comportamento de consulta de lista
- comportamento detalhado da consulta
- resolução do resumo da última tentativa
- execução de renovação bem-sucedida
- falha na execução da renovação
- tentar novamente o caminho após falha
- execução duplicada bloqueada
- já processando conflito
- aprovação de transições necessárias, aprovadas e rejeitadas
- forçar rota de execução e comportamento do fluxo de trabalho

### Cobertura da API Admin

Coberto por meio de testes de integração HTTP:
- `GET /admin/renovações`
- `GET /admin/renovações/:id`
- `POST /admin/renovações/:id/force`
- `POST /admin/renewals/:id/approve-changes`
- `POST /admin/renewals/:id/reject-changes`

Isso inclui:
- caminhos de sucesso
- solicitar falhas de validação
- falhas de validação de domínio
- comportamento da lista filtrada
- fluxos de decisão de aprovação

### Cobertura do fluxo administrativo

O arquivo [renewals-admin-flow.spec.ts](../../integration-tests/http/renewals-admin-flow.spec.ts) cobre os principais fluxos de back-end em estilo de cenário usados pela UI do administrador:
- listar renovações
- detalhe de renovação aberta
- aprovar alterações
- rejeitar alterações
- renovação forçada
- atualizar detalhes e lista
- verificar o estado final

Este não é um teste de navegador.

É um teste de fluxo em nível de integração que usa ferramentas suportadas pela Medusa e os mesmos endpoints administrativos personalizados usados ​​pela UI.

### Cobertura de fumaça entre áreas

O arquivo [renewals-smoke.spec.ts](../../integration-tests/http/renewals-smoke.spec.ts) protege o limite principal de integração com outras áreas de plugins.

Comportamento coberto:
- a renovação respeita o estado operacional da assinatura
- a renovação aplica alterações pendentes aprovadas de volta ao estado da assinatura
- a renovação não ignora a política ativa de "Planos e Ofertas"
- falha no pagamento da renovação qualificada inicia `Dunning`
- a execução de renovações futuras respeita os efeitos do ciclo de vida provenientes de `Cancelamento e Retenção`

Esta é intencionalmente uma verificação de integração em nível de fumaça, não um navegador completo ou teste de sistema.

Esta verificação de fumaça é a principal proteção para o limite de renovação com:
- regras de elegibilidade de assinatura
- materialização de mudança pendente aprovada
- revalidação da política de oferta atual em tempo de execução
- inicialização de cobrança após falha na renovação qualificada para pagamento
- pausa motivada por cancelamento e efeitos de elegibilidade de cancelamento

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
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/renewals-admin-flow.spec.ts
```

Execute o arquivo de integração do fluxo de trabalho:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/renewals-workflows.spec.ts
```

Execute o arquivo de verificação de fumaça:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/renewals-smoke.spec.ts
```

Execute o arquivo de teste do módulo:

```bash
TEST_TYPE=integration:modules NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand src/modules/renewal/__tests__/service.spec.ts
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
- adicione um teste de integração HTTP quando o comportamento depender de rotas reais, fluxos de trabalho, autenticação, validação de solicitação ou módulos Medusa vinculados
- adicione um teste de cenário quando quiser proteger um fluxo administrativo operacional completo em vários endpoints
- estender a verificação quando as alterações afetarem a integração com `Assinaturas`, `Planos e Ofertas` ou `Cancelamento e Retenção`

Para a nova funcionalidade `Renovações`:
- prefira estender os arquivos de teste `renewals-*` existentes se a mudança corresponder ao seu escopo
- crie um novo arquivo de teste focado somente quando o fluxo se tornar grande o suficiente para merecer seu próprio cenário

## 9. Orientação prática para futuros colaboradores

Ao alterar a área `Renovações`:
Primeiro, atualize ou adicione um teste de módulo se o comportamento do serviço mudar
2. atualizar ou adicionar um teste de integração HTTP se o comportamento da rota, validadores, consultas, fluxos de trabalho ou comportamento voltado para o agendador mudarem
3. atualize o fluxo do cenário se o fluxo do operador Admin principal for alterado
4. atualizar a verificação de fumaça se a semântica de renovação mudar no limite com `Assinaturas`, `Planos e Ofertas` ou `Cancelamento e Retenção`

Se um recurso alterar o contrato de:
- filtragem de fila
- classificação de fila
- regras de aprovação
- regras de execução forçada
- carga útil detalhada retornada
- semântica de execução de renovação

então os testes de integração correspondentes devem ser atualizados no mesmo conjunto de alterações.

## 10. Resumo

A área `Renovações` é atualmente testada através de camadas de integração suportadas pela Medusa, em vez de automação do navegador.

Isso fornece proteção forte para:
- comportamento do domínio
- comportamento do fluxo de trabalho
- Contrato de API de administrador
- o principal fluxo operacional do administrador
- o limite de integração com `Assinaturas` e `Planos e Ofertas`

Ele não tenta validar detalhes de renderização no navegador.
