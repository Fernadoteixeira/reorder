# Arquitetura de Planos e Ofertas

Este documento descreve a arquitetura atual da área `Plans & Offers` no plugin `Reorder`.

Ele se concentra no sistema implementado e não nas suposições iniciais do projeto.

## Meta

A área `Plans & Offers` fornece a camada de configuração comercial para produtos habilitados para assinatura no Admin.

A implementação atual suporta:
- configurar ofertas de assinatura em nível de produto
- configurar ofertas de assinatura em nível de variante
- definir frequências de cobrança permitidas
- definição de regras de desconto por frequência
- definir regras de oferta adicionais, como política de teste e política de empilhamento
- listar, inspecionar, criar, editar e alternar ofertas de planos no Admin
- resolver a configuração de assinatura efetiva com prioridade `variant > product`
- impor configuração de oferta ativa durante fluxos de mudança de plano de assinatura

## Visão Geral da Arquitetura

A implementação é dividida em quatro camadas principais:

1. módulo de domínio
2. fluxos de trabalho
3. API de administração
4. IU de administração

Cada camada tem uma responsabilidade clara:

- o módulo de domínio possui o modelo de dados e persistência `plan_offer`
- fluxos de trabalho próprios mutações e validação de negócios
- a API administrativa expõe rotas de leitura e gravação para consumidores do painel
- a UI do administrador renderiza a página de gerenciamento e cria/edita fluxos

## 1. Módulo de Domínio

O módulo personalizado `planOffer` é o proprietário da configuração da oferta de assinatura.

Ele contém:
- tipos de domínio
- o modelo de dados `plan_offer`
- o serviço do módulo
- auxiliares utilitários em nível de módulo para modelos de leitura e resolução de configuração eficaz

Escolha principal do design:
- a fonte persistente da verdade é sempre `PlanOffer`
- a configuração efetiva da assinatura é derivada no momento da leitura
- nenhum modelo persistente separado é usado para configuração resolvida

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

### Modelo de Escopo

O modelo oferece suporte a dois escopos de segmentação:

- `product`
- `variant`

Os registros com escopo de produto se aplicam a um produto como um todo.

Os registros com escopo de variante aplicam-se a uma variante concreta e têm precedência sobre a configuração com escopo de produto durante a resolução efetiva da configuração.

### Por que `allowed_frequencies` e `frequency_intervals` existem

`allowed_frequencies` armazena a configuração lógica completa, incluindo intervalo e valor numérico de cadência.

`frequency_intervals` armazena o conjunto nivelado de nomes de intervalos usados ​​para oferecer suporte a uma filtragem mais rápida no Admin.

Esta é uma otimização deliberada do modelo de leitura para consultas de lista.

### Estratégia de indexação

O modelo atual e as migrações suportam indexação para:
- `scope`
- `product_id`
- `variant_id`
- `is_enabled`
- `name`
- `created_at`
- `updated_at`
- `frequency_intervals`

A arquitetura também usa restrições exclusivas para evitar alvos ativos duplicados na camada de persistência:
- uma oferta com escopo de produto por produto
- uma oferta com escopo de variante por variante

## 3. Semântica de configuração eficaz

A área `Plans & Offers` distingue entre:
- registros de origem persistentes
- candidatos substitutos
- configuração efetiva resolvida

A única fonte de verdade persistente é `PlanOffer`.

A configuração efetiva resolvida é o estado derivado representado por `ProductSubscriptionConfig`.

### Prioridade de resolução

A configuração efetiva segue uma ordem de prioridade estrita:

1. oferta ativa com escopo de variante
2. oferta ativa com escopo de produto
3. resultado inativo ou vazio

Isso significa que a configuração efetiva usa semântica `variant > product`.

### Sem semântica de mesclagem

A configuração eficaz usa semântica de registro completo.

Se uma oferta no nível da variante for vencedora, todos os campos efetivos virão desse registro no nível da variante.

Se uma oferta no nível do produto for vencedora, todos os campos efetivos virão desse registro no nível do produto.

A implementação não mescla frequências, descontos ou regras nos registros de origem.

### Semântica de resultados inativos

Se não existir nenhum registro de origem ativo, o resultado resolvido será explícito em vez de anulável:

- `source_offer_id = null`
- `source_scope = null`
- `is_enabled = false`
- `allowed_frequencies = []`
- `discount_per_frequency = []`
- `rules = null`

Isto simplifica a validação downstream em fluxos de trabalho que consomem configuração de oferta.

## 4. Leia o caminho

O caminho de leitura é otimizado para lista de administradores e renderização de detalhes.

Componentes principais:
- manipuladores de rota administrativa em `src/api/admin/subscription-offers`
- rotear utilitários em `src/api/admin/subscription-offers/utils.ts`
- leia ajudantes em `src/modules/plan-offer/utils/admin-query.ts`
- resolução de configuração efetiva em `src/modules/plan-offer/utils/effective-config.ts`

### Fluxo de lista

Para a visualização de lista:
1. a UI Admin envia parâmetros de consulta para `GET /admin/subscription-offers`
2. A rota valida e normaliza a entrada da consulta
3. `listAdminPlanOffers(...)` aplica filtros, classificação e paginação
4. A camada de consulta lê registros `plan_offer` até `query.graph(...)`
5. Os dados de exibição do produto e da variante são resolvidos separadamente
6. cada item é mapeado para o DTO da lista de administradores, incluindo o resumo de configuração efetivo

A lista suporta:
- paginação
- pesquisar
- filtros
- classificação baseada em banco de dados
- classificação na memória para campos derivados selecionados

### Fluxo detalhado

Para a visualização detalhada:
1. a IU do administrador solicita `GET /admin/subscription-offers/:id`
Segundo, a rota resolve o registro de origem por meio do auxiliar de consulta
3. Dados de exibição e configuração efetiva são resolvidos
4. o resultado é mapeado para o DTO de detalhes do administrador

A carga detalhada representa:
- o registro de origem editável
- dados de exibição do produto alvo e da variante
- resumo de configuração eficaz derivado das regras de resolução atuais

### Resolução de configuração efetiva

A resolução de configuração eficaz é implementada como um utilitário de domínio reutilizável, em vez de um auxiliar somente de administrador.

Isso permite que a mesma lógica de resolução seja usada por:
- Modelos de leitura de administrador
- fluxos de trabalho de assinatura
- futuros fluxos de validação de vitrine ou renovação

## 5. Escrever caminho

Todas as operações de alteração de estado são roteadas por meio de fluxos de trabalho.

Mutações implementadas:
- criar ou atualizar a oferta do plano
- oferta de plano de atualização
- alternar o estado ativado da oferta do plano

Padrão de caminho de gravação:
1. a UI Admin envia uma mutação para uma rota administrativa personalizada
2. a rota valida a carga útil da solicitação
3. a rota chama um fluxo de trabalho
4. A etapa do fluxo de trabalho realiza a validação de negócios e persiste a mudança
5. A rota retorna a carga detalhada atualizada

Isso mantém a lógica de negócios fora dos manipuladores HTTP.

## 6. Fluxos de trabalho

Os fluxos de trabalho são o limite de mutação da área `Plans & Offers`.

A camada de mutação atual é construída em torno de três fluxos de trabalho:
- `create-or-upsert-plan-offer`
- `update-plan-offer`
- `toggle-plan-offer`

Eles são responsáveis por:
- validando a exatidão do alvo
- normalização de cargas úteis de frequência, desconto e regras
- alterações persistentes no registro de origem
- retornar um resultado de oferta de plano consistente para a camada API

### Lógica de validação compartilhada

Os fluxos de trabalho usam auxiliares compartilhados para:
- normalização de escopo
- normalização de frequência
- normalização de descontos
- normalização de regras
- validação da existência do alvo
- detecção de alvo duplicado
- preparação de carga útil de compensação

A validação de negócios inclui:
- correção do alvo do produto versus variante
- propriedade variante do produto selecionado
- valores de frequência inteiros positivos
- combinações de frequência únicas
- descontos apenas para frequências permitidas
- verificações de faixa de valor de desconto
- consistência da regra de teste

Lacuna atual:
- As mutações `Plans & Offers` ainda não emitem eventos de auditoria e não são visíveis em `Activity Log`.

### Compensação e reversão

Os fluxos de criação e atualização armazenam o estado anterior para compensação.

Isso mantém o comportamento do fluxo de trabalho alinhado com o modelo de mutação e reversão da Medusa.

A camada de rota permanece fina e focada na orquestração.

## 7. Arquitetura da API de administração

A API Admin expõe rotas personalizadas dedicadas à página `Plans & Offers`.

Rotas de leitura implementadas:
- `GET /admin/subscription-offers`
- `GET /admin/subscription-offers/:id`

Rotas de mutação implementadas:
- `POST /admin/subscription-offers`
- `POST /admin/subscription-offers/:id`
- `POST /admin/subscription-offers/:id/toggle`

A camada API usa:
- Validadores Zod
- solicitações de administrador autenticadas
- ajudantes de consulta para leituras
- fluxos de trabalho para gravações

Tal como acontece com outras áreas Medusa no plugin, os manipuladores de rotas permanecem finos e focados na orquestração.

## 8. Arquitetura da UI do administrador

A UI Admin é implementada como uma página Admin Medusa personalizada para `Plans & Offers`.

A IU atual inclui:
- uma página de lista apoiada por Medusa `DataTable`
- crie fluxo com um `FocusModal`
- edite o fluxo com um `Drawer`
- fluxos dedicados de seleção de produtos e variantes

A página suporta:
- pesquisar
- filtragem
- classificação
- paginação
- criar
- editar
- ativar ou desativar ações

O carregamento de dados segue o padrão do painel Medusa:
- a consulta de exibição é carregada na montagem
- consultas modais e de gaveta são separadas da consulta de exibição principal
- mutações bem-sucedidas invalidam explicitamente as consultas de exibição e detalhes

## 9. Integração com assinaturas

`Plans & Offers` é a camada de configuração comercial utilizada pela área `Subscriptions`.

O ponto de integração implementado é o fluxo de mudança de plano de assinatura.

Durante `schedule-plan-change`:
- o fluxo de trabalho de assinatura resolve a configuração efetiva do produto de assinatura e da variante solicitada
- o fluxo de trabalho verifica se existe uma oferta ativa
- o fluxo de trabalho verifica se a frequência solicitada é permitida pela configuração efetiva
- o fluxo de trabalho rejeita alterações no plano que violam a configuração da oferta ativa

Isso significa que `Plans & Offers` já influencia o que pode ser agendado para uma assinatura no Admin.

O limite de propriedade permanece claro:
- `Plans & Offers` possui política de ofertas
- `Subscriptions` possui o estado do ciclo de vida da assinatura e alterações pendentes no plano

## 10. Estratégia de invalidação de consulta

A UI Admin usa invalidação de consulta explícita após mutações bem-sucedidas.

Depois de criar, atualizar ou alternar:
- a consulta da lista de ofertas do plano é invalidada
- a consulta detalhada afetada é invalidada

Isso garante que:
- a tabela reflete o estado efetivo mais recente
- os fluxos de detalhe e edição permanecem sincronizados após as operações de salvamento

## 11. Estratégia de teste

A área é atualmente coberta por:
- testes de módulo/serviço
- testes de fluxo de trabalho e integração de consultas
- testes de integração HTTP administrativos
- teste de integração de fluxo administrativo baseado em cenário
- integração de nível de fumaça com `Subscriptions`

Nota importante:
- não há camada E2E do navegador no plugin atual
- o principal fluxo de negócios ponta a ponta é verificado através de testes de integração apoiados pela Medusa

## 12. Limites de responsabilidade

`Plans & Offers` atualmente possui:
- registros de origem de oferta de assinatura
- segmentação de oferta em nível de produto e variante
- resolução de configuração eficaz
- Gerenciamento administrativo da configuração da oferta
- regras de validação para estrutura de oferta e combinações suportadas

Ainda não possui:
- fluxos de compra na vitrine
- geração de pedidos recorrentes
- execução de renovação
- lógica de nova tentativa de pagamento
- execução de preços além da descrição da política de oferta

## Documentos Relacionados

- [Visão geral dos documentos](../README.md)
- [API de administração de planos e ofertas](../api/admin-plan-offers.md)
- [IU de administração de planos e ofertas](../admin/plan-offers.md)
- [Teste de planos e ofertas](../testing/plan-offers.md)
- [Roteiro](../roadmap/implementation-plan.md)
- [Especificações de planos e ofertas](../specs/plan-offers/admin-spec.md)
