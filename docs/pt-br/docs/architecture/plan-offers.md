# Planos e Ofertas de Arquitetura

Este documento descreve a arquitetura atual da área `Plans & Offers` no plug-in `Reorder`.

Ele se concentra no sistema implementado, e não nos pressupostos iniciais do projeto.

## Objetivo

A área `Plans & Offers` fornece a camada de configuração comercial para produtos habilitados para assinatura no Admin.

A implementação atual oferece suporte a:
- configuração de ofertas de assinatura no nível do produto
- configuração de ofertas de assinatura no nível da variante
- definição das frequências de cobrança permitidas
- definição de regras de desconto por frequência
- definição de regras adicionais de oferta, como política de período de teste e política de acumulação de descontos
- listagem, verificação, criação, edição e ativação/desativação de ofertas de planos na área de administração
- resolução da configuração de assinatura em vigor com prioridade `variant > product`
- aplicação da configuração da oferta ativa durante os fluxos de alteração do plano de assinatura

## Visão geral da arquitetura

A implementação está dividida em quatro camadas principais:

1. módulo de domínio
2. fluxos de trabalho
3. API de administração
4. interface de usuário de administração

Cada camada tem uma responsabilidade bem definida:

- o módulo de domínio é responsável pelo modelo de dados `plan_offer` e pela persistência
- os fluxos de trabalho são responsáveis pelas mutações e pela validação de negócios
- a API de administração expõe rotas de leitura e gravação para usuários do painel de controle
- a interface de usuário de administração exibe a página de gerenciamento e os fluxos de criação/edição

## 1. Módulo de domínio

O módulo personalizado `planOffer` é o responsável pela configuração da oferta de assinatura.

Ele contém:
- tipos de domínio
- o modelo de dados `plan_offer`
- o serviço do módulo
- auxiliares de utilidade no nível do módulo para modelos de leitura e resolução eficaz de configuração

Principais escolhas de projeto:
- a fonte de verdade persistida é sempre `PlanOffer`
- a configuração efetiva da assinatura é derivada no momento da leitura
- não é utilizado nenhum modelo persistido separado para a configuração resolvida

Isso mantém o domínio simples e torna explícito o comportamento de fallback.

## 2. Modelo de dados

O modelo `plan_offer` armazena:
- campos de identidade e segmentação
- estado de ativação
- configuração de frequência
- configuração de desconto
- regras e metadados adicionais

Os campos principais incluem:
- `id`
- `name`
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`
- `allowed_frequencies`
- `frequency_intervals`
- `discount_per_frequency`
- `rules`
- `metadata`

### Modelo de escopo

O modelo oferece dois escopos de segmentação:

- `product`
- `variant`

Os registros com escopo de produto se aplicam a um produto como um todo.

Os registros com escopo de variante se aplicam a uma variante específica e têm precedência sobre a configuração com escopo de produto durante a resolução efetiva da configuração.

### Por que existem tanto o `allowed_frequencies` quanto o `frequency_intervals`

`allowed_frequencies` armazena a configuração lógica completa, incluindo o intervalo e o valor numérico da cadência.

`frequency_intervals` armazena o conjunto simplificado de nomes de intervalos usado para agilizar a filtragem no Admin.

Trata-se de uma otimização deliberada do modelo de leitura para consultas em listas.

### Estratégia de indexação

O modelo atual e as migrações oferecem suporte à indexação para:
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`
- `name`
- `created_at`
- `updated_at`
- `frequency_intervals`

A arquitetura também utiliza restrições específicas para evitar a duplicação de alvos ativos na camada de persistência:
- uma oferta no âmbito do produto por produto
- uma oferta no âmbito da variante por variante

## 3. Semântica de configuração efetiva

A área `Plans & Offers` distingue entre:
- registros de origem persistentes
- candidatos de fallback
- configuração efetiva resolvida

A única fonte de verdade persistente é `PlanOffer`.

A configuração efetiva resolvida é um estado derivado representado por `ProductSubscriptionConfig`.

### Prioridade da resolução

A configuração efetiva segue uma ordem de prioridade rigorosa:

1. oferta ativa com escopo de variante
2. oferta ativa com escopo de produto
3. resultado inativo ou vazio

Isso significa que a configuração efetiva utiliza a semântica de `variant > product`.

### Semântica sem mesclagem

A configuração efetiva utiliza a semântica de registro completo.

Se uma oferta no nível da variante for selecionada, todos os campos efetivos serão provenientes desse registro no nível da variante.

Se uma oferta no nível do produto for selecionada, todos os campos válidos serão provenientes desse registro no nível do produto.

A implementação não combina frequências, descontos ou regras entre os registros de origem.

### Semântica de resultados inativos

Se não houver nenhum registro de fonte ativo, o resultado da resolução é explícito, e não nulo:

- `source_offer_id = null`
- `source_scope = null`
- `is_enabled = false`
- `allowed_frequencies = []`
- `discount_per_frequency = []`
- `rules = null`

Isso simplifica a validação posterior em fluxos de trabalho que utilizam a configuração da oferta.

## 4. Caminho de leitura

O caminho de leitura está otimizado para a exibição da lista e dos detalhes do Admin.

Principais componentes:
- manipuladores de rotas de administração em `src/api/admin/subscription-offers`
- utilitários de rotas em `src/api/admin/subscription-offers/utils.ts`
- auxiliares de leitura em `src/modules/plan-offer/utils/admin-query.ts`
- resolução eficaz da configuração em `src/modules/plan-offer/utils/effective-config.ts`

### Fluxo da lista

Para a visualização em lista:
1. a interface de usuário de administração envia parâmetros de consulta para `GET /admin/subscription-offers`
2. a rota valida e normaliza a entrada da consulta
3. `listAdminPlanOffers(...)` aplica filtros, ordenação e paginação
4. a camada de consulta lê os registros de `plan_offer` por meio de `query.graph(...)`
5. os dados de exibição do produto e da variante são resolvidos separadamente
6. cada item é mapeado para o DTO da lista de administração, incluindo o resumo da configuração efetiva

A lista oferece os seguintes recursos:
- paginação
- pesquisa
- filtros
- classificação com base no banco de dados
- classificação na memória para campos derivados selecionados

### Fluxo de detalhes

Para a visualização detalhada:
1. a interface de usuário administrativa solicita `GET /admin/subscription-offers/:id`
2. a rota identifica o registro de origem por meio do auxiliar de consulta
3. os dados a serem exibidos e a configuração efetiva são identificados
4. o resultado é mapeado para o DTO de detalhes da interface de usuário administrativa

A carga útil de detalhes representa:
- o registro de origem editável
- os dados de exibição do produto e da variante de destino
- o resumo da configuração efetiva derivado das regras de resolução atuais

### Resolução eficaz da configuração

A resolução eficaz de configurações é implementada como um utilitário reutilizável do domínio, em vez de um auxiliar exclusivo para administradores.

Isso permite que a mesma lógica de resolução seja utilizada por:
- modelos de leitura do administrador;
- fluxos de trabalho de assinatura;
- futuros fluxos de validação da loja virtual ou de renovação

## 5. Caminho de gravação

Todas as operações que alteram o estado são encaminhadas por meio de fluxos de trabalho.

Alterações implementadas:
- criar ou atualizar (upsert) uma oferta de plano
- atualizar uma oferta de plano
- ativar ou desativar o estado de uma oferta de plano

Padrão de caminho de gravação:
1. A interface de usuário administrativa envia uma mutação para uma rota administrativa personalizada
2. A rota valida a carga útil da solicitação
3. A rota chama um fluxo de trabalho
4. A etapa do fluxo de trabalho realiza a validação de negócios e grava a alteração
5. A rota retorna a carga útil dos detalhes atualizados

Isso mantém a lógica de negócios fora dos manipuladores HTTP.

## 6. Fluxos de trabalho

Os fluxos de trabalho constituem o limite de mutação da área `Plans & Offers`.

A camada de mutação atual é estruturada em torno de três fluxos de trabalho:
- `create-or-upsert-plan-offer`
- `update-plan-offer`
- `toggle-plan-offer`

Eles são responsáveis por:
- validar a exatidão do destino
- normalizar os dados relativos à frequência, ao desconto e às regras
- persistir as alterações nos registros de origem
- retornar um resultado consistente do plano-oferta para a camada de API

### Lógica de validação compartilhada

Os fluxos de trabalho utilizam auxiliares compartilhados para:
- normalização de escopo
- normalização de frequência
- normalização de descontos
- normalização de regras
- validação da existência do alvo
- detecção de alvos duplicados
- preparação da carga útil de compensação

A validação comercial inclui:
- correção da correspondência entre produto e variante
- atribuição de variantes ao produto selecionado
- valores de frequência inteiros positivos
- combinações únicas de frequência
- descontos apenas para frequências permitidas
- verificações do intervalo de valores de desconto
- consistência das regras de avaliação

Lacuna atual:
- As mutações `Plans & Offers` ainda não geram eventos de auditoria e não são visíveis em `Activity Log`.

### Compensação e reversão

Os fluxos de criação e atualização armazenam o estado anterior para fins de compensação.

Isso mantém o comportamento do fluxo de trabalho alinhado com o modelo de mutação e reversão do Medusa.

A camada de rota continua sendo enxuta e voltada para a orquestração.

## 7. Arquitetura da API de administração

A API de administração disponibiliza rotas personalizadas dedicadas à página `Plans & Offers`.

Rotas de leitura implementadas:
- `GET /admin/subscription-offers`
- `GET /admin/subscription-offers/:id`

Rotas de mutação implementadas:
- `POST /admin/subscription-offers`
- `POST /admin/subscription-offers/:id`
- `POST /admin/subscription-offers/:id/toggle`

A camada de API utiliza:
- validadores Zod
- solicitações administrativas autenticadas
- auxiliares de consulta para leituras
- fluxos de trabalho para gravações

Assim como em outras áreas do Medusa no plug-in, os manipuladores de rota mantêm-se simples e focados na orquestração.

## 8. Arquitetura da interface de usuário administrativa

A interface de usuário administrativa foi implementada como uma página personalizada do Medusa Admin para `Plans & Offers`.

A interface do usuário atual inclui:
- uma página de lista baseada no Medusa `DataTable`
- um fluxo de criação com um `FocusModal`
- um fluxo de edição com um `Drawer`
- fluxos dedicados à seleção de produtos e variantes

A página oferece os seguintes recursos:
- pesquisa
- filtragem
- ordenação
- paginação
- criar
- editar
- ativar ou desativar ações

O carregamento de dados segue o padrão do painel Medusa:
- a consulta de exibição é carregada no momento da montagem
- as consultas do modal e da gaveta são separadas da consulta principal de exibição
- as alterações bem-sucedidas invalidam explicitamente as consultas de exibição e de detalhes

## 9. Integração com assinaturas

`Plans & Offers` é a camada de configuração comercial utilizada pela área `Subscriptions`.

O ponto de integração implementado é o fluxo de alteração do plano de assinatura.

Durante o `schedule-plan-change`:
- o fluxo de trabalho de assinatura determina a configuração vigente para o produto de assinatura e a variante solicitada
- o fluxo de trabalho verifica se existe uma oferta ativa
- o fluxo de trabalho verifica se a frequência solicitada é permitida pela configuração vigente
- o fluxo de trabalho rejeita alterações no plano que violem a configuração da oferta ativa

Isso significa que o `Plans & Offers` já influencia o que pode ser programado para uma assinatura no Admin.

A divisão de responsabilidades permanece clara:
- `Plans & Offers` é responsável pela política de ofertas
- `Subscriptions` é responsável pelo estado do ciclo de vida da assinatura e pelas alterações pendentes no plano

## 10. Estratégia de invalidação de consultas

A interface de usuário administrativa utiliza a invalidação explícita de consultas após mutações bem-sucedidas.

Após criar, atualizar ou alternar:
- a consulta da lista de ofertas do plano é invalidada
- a consulta de detalhes afetada é invalidada

Isso garante que:
- a tabela reflita o estado atual mais recente;
- os fluxos de detalhes e edição permaneçam sincronizados após as operações de salvamento

## 11. Estratégia de testes

Atualmente, a área é abrangida por:
- testes de módulos/serviços
- testes de integração de fluxos de trabalho e consultas
- testes de integração HTTP de administração
- testes de integração de fluxos de administração baseados em cenários
- integração de nível básico com `Subscriptions`

Observação importante:
- não há camada E2E do navegador no plug-in atual
- o principal fluxo de negócios de ponta a ponta é verificado por meio de testes de integração compatíveis com o Medusa

## 12. Limites da responsabilidade

Atualmente, o `Plans & Offers` inclui:
- registros de origem das ofertas de assinatura
- segmentação de ofertas no nível do produto e da variante
- resolução eficaz da configuração
- gerenciamento administrativo da configuração das ofertas
- regras de validação para a estrutura das ofertas e combinações suportadas

Ainda não possui:
- fluxos de compra na loja virtual
- geração de pedidos recorrentes
- execução de renovações
- lógica de repetição de tentativas de pagamento
- execução de preços além da descrição da política de ofertas

## Documentos relacionados

- [Visão geral da documentação](../README.md)
- [API de administração de planos e ofertas](../api/admin-plan-offers.md)
- [Interface de usuário de administração de planos e ofertas](../admin/plan-offers.md)
- [Testes de planos e ofertas](../testing/plan-offers.md)
- [Roteiro](../roadmap/implementation-plan.md)
- [Especificações de planos e ofertas](../specs/plan-offers/admin-spec.md)
