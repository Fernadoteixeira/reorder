# Reordenar: consulta de advertência e especificação do modelo de leitura administrativa

Este documento cobre a etapa `2.4.10` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de leitura Admin para `Dunning`
- definir auxiliares de consulta separados para lista de casos, detalhes do caso e histórico de tentativas
- definir como a assinatura vinculada, a renovação e os resumos de pedidos são enriquecidos
- definir qual classificação e filtragem deve acontecer no banco de dados versus na memória
- fornecer um modelo estável para endpoints posteriores da API Admin

Esta especificação se baseia em:
- `reordenar/docs/specs/dunning/domain-model.md`
- `reordenar/docs/specs/dunning/data-model.md`
- `reordenar/docs/specs/dunning/module-links.md`
- `reordenar/docs/specs/dunning/state-machine.md`

A direção segue os padrões da Medusa:
- A lógica de leitura do administrador deve residir em auxiliares de consulta dedicados, não em manipuladores de rota
- `query.graph()` deve ser o principal mecanismo de leitura para enriquecimento entre módulos
- o módulo personalizado continua sendo a raiz do modelo de leitura
- a classificação baseada em banco de dados deve ser preferida para campos escalares explícitos
- a classificação na memória deve ser reservada para campos somente de exibição enriquecidos

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para o modelo de leitura
- a fonte da verdade do tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Raiz do modelo de leitura

O modelo de leitura Admin para `Dunning` deve usar `dunning_case` como entidade raiz.

Por quê:
- a fila é centrada no caso
- a página de detalhes é centrada no caso
- status de nova tentativa, tempo da próxima tentativa, estado de encerramento e erro de pagamento mais recente, todos pertencem ao caso
- as tentativas são o histórico filho, não a raiz da lista primária

Isso significa:
- Mapa de linhas da lista de administradores de `DunningCase`
- Detalhes do administrador carregam um `DunningCase`
- Os dados `DunningAttempt` são anexados como histórico detalhado

## 2. Divisão do auxiliar de consulta

A divisão do modelo de leitura recomendada é:

- `listAdminDunningCases`
- `getAdminDunningCaseDetail`
- `listDunningAttemptsForCase`
- funções auxiliares para enriquecimento de resumo vinculado

Isso reflete o padrão existente já usado em:
- `Assinaturas`
- `Planos e Ofertas`
- `Renovações`

## 3. Localização do arquivo

Os ajudantes do modelo de leitura devem residir em:

- `src/modules/dunning/utils/admin-query.ts`

Os auxiliares de mapeamento de suporte podem residir no mesmo arquivo, a menos que se tornem grandes o suficiente para serem divididos posteriormente.

## 4. Auxiliar de consulta de lista de casos

### Ajudante proposto

```ts
listAdminDunningCases(container, input)
```

### Responsabilidade

Este ajudante deve:
- consultar registros `dunning_case` para a fila Admin
- aplicar filtros de fila
- aplicar paginação
- aplicar classificação suportada
- enriquecer linhas com resumos vinculados compactos
- retornar uma resposta de lista já moldada para mapeamento Admin DTO

### Listar campos raiz

A lista de filas deve ler principalmente:
- `id`
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `estado`
- `tentativa_contagem`
- `max_attempts`
- `next_retry_at`
- `último_pagamento_error_code`
- `último_pagamento_erro_mensagem`
- `última_tentativa_em`
- `recuperado_em`
- `fechado_em`
- `motivo_de_recuperação`
- `criado_em`
- `atualizado_em`

### A lista de filas não deve carregar

A consulta da lista não deve carregar ansiosamente:
- histórico completo de tentativas
- detalhes completos da assinatura vinculada
- detalhes completos da renovação vinculada
- detalhes completos do pedido vinculado
- blobs JSON desnecessários, a menos que sejam diretamente necessários para exibição de lista

A lista deve permanecer leve e orientada para filas.

## 5. Auxiliar de consulta detalhada

### Ajudante proposto

```ts
getAdminDunningCaseDetail(container, id)
```

### Responsabilidade

Este ajudante deve:
- recupera um `dunning_case`
- anexar resumo do cronograma de novas tentativas
- anexar resumo compacto da assinatura vinculada
- anexar resumo compacto de renovação vinculado
- anexar resumo compacto do pedido vinculado
- anexar histórico de tentativas
- retornar um registro de administrador em forma de detalhe

### Campos raiz detalhados

O ajudante detalhado deve incluir:
- todos os campos raiz da lista de filas
- `retry_schedule`
- `metadados`

A consulta detalhada pode ser mais pesada que a lista de filas.

## 6. Auxiliar de consulta de histórico de tentativas

### Ajudante proposto

```ts
listDunningAttemptsForCase(container, dunning_case_id)
```

### Responsabilidade

Este ajudante deve:
- recuperar todas as tentativas de um caso
- classifique-os em ordem de execução
- mapeie-os em itens de linha do tempo/detalhe

### Campos necessários

- `id`
- `dunning_case_id`
- `tentativa_não`
- `começou_em`
- `terminado_em`
- `estado`
- `código_erro`
- `mensagem_erro`
- `referência_de_pagamento`
- `metadados`
- `criado_em`
- `atualizado_em`

### Regra de ordenação

A ordem padrão recomendada é:
- `tentativa_sem ASC`

Isso mantém a linha do tempo detalhada estável e fácil de ler.

## 7. Resumo da assinatura vinculada

O modelo de leitura deve enriquecer a fila e detalhar os registros com um resumo de assinatura vinculado.

### Campos de resumo para lista

Resumo recomendado em nível de lista:
- assinatura `id`
- assinatura `referência`
- `status` da assinatura
- nome do cliente de `customer_snapshot`
- título do produto e título da variante de `product_snapshot`

### Campos de resumo para detalhes

A visualização detalhada também pode incluir:
- `próxima_renovação_em`
- `última_renovação_em`
- instantâneos de assinatura estáveis selecionados já pertencentes ao módulo `subscription` quando necessário para exibição

### Limite importante

Os dados de assinatura vinculados são apenas para enriquecimento de exibição.

Não deve substituir:
- `DunningCase.status`
- `DunningCase.next_retry_at`
- `DunningCase.last_payment_error_code`
- `DunningCase.last_payment_error_message`

## 8. Resumo de renovação vinculado

O modelo de leitura também deve enriquecer os registros com um resumo de renovação vinculado.

### Campos de resumo para lista

Resumo recomendado em nível de lista:
- ciclo de renovação `id`
- `estado`
- `agendado_para`
- `generated_order_id`

### Campos de resumo para detalhes

A visualização detalhada também pode incluir:
- `processado_em`
- `aprovação_requerida`
- `status_aprovação`
- `último_erro`

Tal como acontece com o enriquecimento de assinatura, este continua sendo um enriquecimento somente de exibição.

## 9. Resumo do pedido vinculado

O modelo de leitura deve enriquecer os registros com um resumo do pedido vinculado quando existir `renewal_order_id`.

### Campos de resumo para lista

Resumo recomendado em nível de lista:
- pedir `id`
- `display_id`
- `estado`

### Campos de resumo para detalhes

A visualização detalhada também pode incluir:
- `criado_em`
- `status_pagamento`
- `fulfillment_status`
- `total`
- `código_moeda`

Isso continua sendo um enriquecimento somente de exibição.

## 10. Escolha do mecanismo de consulta

### Mecanismo primário

Use `query.graph()` como mecanismo principal para:
- lendo `dunning_case`
- lendo `dunning_attempt`
- enriquecimento de assinaturas vinculadas, renovação e resumos de pedidos

Por quê:
- o modelo de leitura precisa de enriquecimento entre módulos
- corresponde ao padrão de leitura recomendado pelo administrador da Medusa
- os filtros atuais estão principalmente em campos escalares de propriedade do módulo

### Quando não usar `query.index()`

O modelo inicial de leitura Admin `Dunning` não deve exigir `query.index()` por padrão.

Razão:
- a filtragem entre módulos ainda não é o formato de consulta principal
- a lista está enraizada nos campos da fila de propriedade do módulo
- registros vinculados são enriquecimentos de resumo, não raízes de filtro

Se os requisitos administrativos posteriores exigirem filtragem por campos vinculados de assinatura, renovação ou pedido, isso poderá ser adicionado como uma extensão de design posterior.

## 11. Estratégia de filtragem

### Filtros baseados em banco de dados

A lista de filas deve suportar filtros baseados em banco de dados para:
- `estado`
- `subscrição_id`
- `renovação_ciclo_id`
- `renovação_pedido_id`
- `tentativa_contagem`
- `max_attempts`
- intervalos de datas `next_retry_at`
- intervalos de datas `last_attempt_at`
- intervalos de datas `recovered_at`
- intervalos de datas `closed_at`

Estes campos pertencem ao módulo `dunning` e devem ser filtrados na camada do banco de dados.

### Procurar

Para o MVP, a pesquisa completa de texto livre nos campos vinculados de assinatura, renovação ou pedido não deve ser o requisito padrão.

Direção recomendada:
- filtros exatos nos campos escalares raiz primeiro
- pesquisa de campo vinculado somente mais tarde se o Admin UX realmente exigir

Isso mantém o modelo de primeira leitura mais simples e previsível.

## 12. Estratégia de classificação

### Classificação baseada em banco de dados

Campos de classificação de banco de dados preferenciais:
- `estado`
- `tentativa_contagem`
- `max_attempts`
- `next_retry_at`
- `última_tentativa_em`
- `recuperado_em`
- `fechado_em`
- `criado_em`
- `atualizado_em`

Por quê:
- estes são campos escalares raiz explícitos
- o banco de dados pode classificá-los de forma eficiente
- eles atendem às filas e detalham as necessidades operacionais

### Classificação na memória

A classificação na memória deve ser reservada para campos enriquecidos somente para exibição, como:
- referência de assinatura
- nome do cliente
- título do produto
- data programada de renovação, se disponível apenas por meio da composição do resumo vinculado
- etiqueta de exibição do pedido

Não deve ser o caminho padrão.

Se uma classificação na memória for adicionada:
- deve ser explicitamente validado
- deve operar somente após os registros raiz paginados serem buscados
- deve ser limitado a campos que o banco de dados não pode classificar sem complexidade de consulta entre módulos

## 13. Estratégia de mapeamento DTO

Os auxiliares de consulta devem mapear registros em formas normalizadas orientadas pelo administrador, em vez de expor registros de consulta brutos.

Direção recomendada:
- manter o mapeamento de consulta e DTO próximos na camada auxiliar
- centralizar o mapeamento de enum/status em funções auxiliares
- normalizar estruturas de nulidade e resumo antes que a camada de rota retorne a carga útil

Isso mantém os manipuladores de rotas finos e consistentes com outras áreas de plugins.

## 14. Estratégia de montagem detalhada

O ajudante detalhado deve montar a resposta final nesta ordem:

1. carregue um `DunningCase`
2. carregar registros filhos `DunningAttempt`
3. enriquecer o resumo da assinatura vinculada
4. enriquecer o resumo de renovação vinculado
5. enriquecer o resumo do pedido vinculado
6. mapeie todas as peças em um DTO detalhado

Por que isso é preferido:
- a raiz de origem permanece explícita
- o histórico do mesmo módulo permanece separado do enriquecimento externo
- pesquisas vinculadas podem permanecer opcionais dependendo das referências disponíveis

## 15. Limites de leitura do administrador

O modelo de leitura do administrador deve manter limites claros:

- `DunningCase` é a fonte da verdade para o ciclo de vida de recuperação
- `DunningAttempt` é a fonte da verdade para o histórico de tentativas
- `Assinatura` está apenas vinculado ao contexto operacional
- `RenewalCycle` é apenas vinculado ao contexto de evento de origem
- `Pedido` está apenas vinculado ao contexto de pagamento/pedido

Isto preserva os limites agregados já estabelecidos em decisões anteriores de Dunning.

## 16. Orientação sobre estratégia de consulta

Estratégia de consulta recomendada para implementação posterior:

### Lista/detalhe de fontes

Use `DunningCase` como raiz da consulta de origem.

Use campos diretos para:
- filtragem
- classificação
- paginação
- seleção de fila orientada ao agendador

### Histórico do mesmo módulo

Use a relação interna `DunningAttempt` ou consultas dedicadas do mesmo módulo para recuperar:
- tentativa de cronograma
- estado da última tentativa
- tente ordenar por `attempt_no` ou carimbos de data e hora

### Enriquecimento vinculado

Use links de módulos e leituras vinculadas para enriquecer o resultado com:
- referência de assinatura e contexto de exibição
- originando o contexto do ciclo de renovação
- contexto de exibição do pedido de renovação

### Filtragem entre módulos

Se a filtragem por campos vinculados for necessária:
- use `query.index()` ou uma estratégia de consulta vinculada dedicada
- não presuma que `query.graph()` pode lidar com toda a filtragem vinculada da raiz de origem de forma escalonável

## 17. Recomendação final

O modelo de leitura recomendado do MVP Admin é:

- entidade raiz:
  - `DunningCase`
- história infantil:
  - `Tentativa de Dunning`
- enriquecimento vinculado:
  - `Assinatura`
  - `Ciclo de Renovação`
  - `Ordem`
- divisão auxiliar:
  - `listAdminDunningCases`
  - `getAdminDunningCaseDetail`
  - `listDunningAttemptsForCase`
- classificação:
  - Baseado em banco de dados para campos escalares raiz
  - na memória apenas para campos enriquecidos somente para exibição

Isto é preferido porque:
- corresponde ao padrão de leitura Admin estilo Medusa estabelecido no plugin
- mantém o módulo personalizado como raiz da consulta
- evita a complexidade prematura da filtragem entre módulos
- suporta Admin UX orientado a filas e orientado a detalhes
