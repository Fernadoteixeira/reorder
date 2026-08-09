# Teste: cobrança

Este documento descreve a estratégia de teste atual para a área `Dunning` no plugin `Reorder`.

Abrange:
- camadas de teste
- arquivos de teste
- comandos
- estratégia de fixação
- escopo de cobertura
- não objetivos conhecidos

## Propósito

A configuração de teste para `Dunning` foi projetada para proteger o plugin nas camadas oficialmente suportadas pelas ferramentas de teste da Medusa.

O projeto atualmente conta com:
- Testes de integração HTTP

Atualmente, não inclui testes de IU baseados em navegador.

## 1. Estratégia de teste

A área `Dunning` está atualmente testada na camada de integração de aplicativos Medusa.

Isso dá cobertura para:
- fluxos de trabalho
- rotas personalizadas da API Admin
- Fluxos de back-end de administração usados pela IU
- integração de nível de fumaça com `Renovações` e `Assinaturas`

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
- verificar fluxos de trabalho, processamento programado e comportamento da API conforme usado pela UI do administrador

Arquivos atuais:
- [dunning-workflows.spec.ts](../../integration-tests/http/dunning-workflows.spec.ts)
- [dunning-routes.spec.ts](../../integration-tests/http/dunning-routes.spec.ts)
- [dunning-smoke.spec.ts](../../integration-tests/http/dunning-smoke.spec.ts)

Esta camada é a principal proteção para o comportamento de cobrança implementado.

## 4. Estratégia de jogos

Os auxiliares de dados de teste são definidos em:
- [dunning-fixtures.ts](../../integration-tests/helpers/dunning-fixtures.ts)
- [renovação-fixtures.ts](../../integration-tests/helpers/renewal-fixtures.ts)
- [subscription-fixtures.ts](../../integration-tests/helpers/subscription-fixtures.ts)

Os ajudantes atuais incluem:
- criação de cabeçalho de autenticação de administrador
- criação de sementes de assinatura
- criação de sementes do ciclo de renovação
- criação de sementes de caso de cobrança
- tentativa de cobrança de criação de sementes
- semente de agendamento de repetição padrão

Esses ajudantes estão acostumados a:
- reduzir a duplicação em testes de integração
- manter os testes de rota e fluxo de trabalho focados no comportamento
- fornecer configuração realista de caso, tentativa e renovação
- apoiar a integração do nível de fumaça em `Dunning`, `Renovações`, `Assinaturas` e `Cancelamento e Retenção`

## 5. Cobertura Atual

### Cobertura do fluxo de trabalho

Coberto por meio de testes de integração:
- caminho de sucesso do `start-dunning`
- atualização idempotente de um caso existente para o mesmo ciclo de renovação
- caso ativo duplicado bloqueado
- caminho de recuperação `run-dunning-retry`
- falha temporária `run-dunning-retry` e caminho de reagendamento
- exaustão por tentativa máxima e fechamento não recuperado
- manual `marca recuperada`
- manual `marca não recuperada`
- substituição de agendamento de nova tentativa
- cobrança de ajudantes de consulta de modelo de leitura

Premissas atuais de classificação de pagamentos:
- `insufficient_funds`, `generic_decline` e `do_not_honor` podem ser tentados novamente e devem reagendar o caso
- `requires_more`, método de pagamento ausente e detalhes de pagamento expirados são terminais e devem encerrar o caso como `não recuperados`

### Cobertura da API Admin

Coberto por meio de testes de integração HTTP:
- `GET /admin/dunning`
- `GET /admin/dunning/:id`
- `POST /admin/dunning/:id/retry-now`
- `POST /admin/dunning/:id/mark-recuperado`
- `POST /admin/dunning/:id/mark-unrecovered`
- `POST /admin/dunning/:id/retry-schedule`

Isso inclui:
- caminhos de sucesso
- solicitar falhas de validação
- falhas de validação de domínio
- comportamento da lista filtrada
- detalhar o comportamento da carga útil

### Cobertura do fluxo administrativo

O arquivo [dunning-routes.spec.ts](../../integration-tests/http/dunning-routes.spec.ts) cobre os principais fluxos de back-end em estilo de cenário usados pela UI do administrador:
- listar casos de cobrança
- detalhe do caso aberto
- tente novamente agora
- marca recuperada
- marca não recuperada
- atualizar detalhes e lista
- verificar o estado final

Este não é um teste de navegador.

É um teste de fluxo em nível de integração que usa ferramentas suportadas pela Medusa e os mesmos endpoints administrativos personalizados usados ​​pela UI.

### Cobertura de fumaça entre áreas

O arquivo [dunning-smoke.spec.ts](../../integration-tests/http/dunning-smoke.spec.ts) protege o limite principal do tempo de execução com outras áreas de plugins.

Comportamento coberto:
- uma renovação qualificada com falha começa a ser cobrada
- a recuperação bem-sucedida do pagamento encerra o caso e restaura a assinatura para "ativa"
- o encerramento não recuperado deixa a assinatura em `past_due` e preserva o resultado da renovação com falha
- a cobrança ativa pode coexistir com o tratamento de cancelamento na mesma assinatura sem sobreposição de propriedade

Esta é intencionalmente uma verificação de integração em nível de fumaça, não um navegador completo ou teste de sistema.

O arquivo [cancellations-smoke.spec.ts](../../integration-tests/http/cancellations-smoke.spec.ts) também protege um limite de tempo de execução compartilhado do lado do cancelamento.

O comportamento coberto inclui:
- Assinaturas `past_due` ainda podem entrar em fluxos de cancelamento e retenção
- o `DunningCase` ativo permanece visível e não é controlado por fluxos de trabalho de cancelamento

## 6. Comandos

Execute todos os testes de integração HTTP:

```bash
yarn test:integration:http
```

Execute o arquivo de integração de fluxos de trabalho:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/dunning-workflows.spec.ts
```

Execute o arquivo de integração de rotas administrativas:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/dunning-routes.spec.ts
```

Execute o arquivo de verificação de fumaça:

```bash
TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules yarn jest --runInBand integration-tests/http/dunning-smoke.spec.ts
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

- adicionar ou estender um teste de integração HTTP quando o comportamento depender de rotas reais, fluxos de trabalho, autenticação, validação ou módulos Medusa vinculados
- adicione um teste de cenário quando quiser proteger um fluxo administrativo operacional completo em vários endpoints
- estender a verificação de fumaça quando as alterações afetarem o limite do tempo de execução com `Renovações`, `Assinaturas` ou `Cancelamento e retenção`

Para a nova funcionalidade `Dunning`:
- prefira estender os arquivos de teste `dunning-*` existentes se a mudança corresponder ao seu escopo
- crie um novo arquivo de teste focado somente quando o fluxo se tornar grande o suficiente para merecer seu próprio cenário

## 9. Resumo

A área `Dunning` é atualmente testada através de camadas de integração HTTP suportadas pela Medusa, em vez de automação do navegador.

Isso fornece proteção forte para:
- fluxos de trabalho de recuperação de pagamento
- Rotas de leitura e mutação do administrador
- fluxos de operadores em estilo cenário
- o limite de integração de tempo de execução com `Renovações`, `Assinaturas` e `Cancelamento e Retenção`
