# Reordenação: Especificação da estratégia de novas tentativas de cobrança

Este documento aborda a etapa `2.4.8` do arquivo `documentation/implementation_plan.md`.

Objetivo:
- definir exatamente o que é repetido no Medusa durante o processo de cobrança
- definir qual artefato de pagamento serve como ponto de partida para a repetição
- definir se a repetição reutiliza ou recria os artefatos de pagamento
- definir regras de idempotência para a repetição do pagamento
- definir quais resultados de pagamento significam falha temporária, falha permanente ou recuperação

Esta especificação se baseia em:
- `reorder/docs/specs/dunning/trigger-entry.md`
- `reorder/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/specs/dunning/module-links.md`
- `reorder/docs/specs/dunning/state-machine.md`

A orientação segue os padrões do Medusa:
- os fluxos de pagamento devem utilizar os fluxos de trabalho de pagamento do Medusa e as APIs do módulo de pagamento
- a recuperação de pagamentos vinculados a pedidos deve começar a partir do limite entre o pedido e a cobrança do pagamento
- uma nova tentativa deve ser representada como uma nova tentativa de pagamento, e não como uma alteração no histórico de tentativas anteriores
- tanto a idempotência no nível do fluxo de trabalho quanto as proteções contra concorrência no nível do domínio devem ser explícitas

Status da implementação:
- `Dunning` está implementado
- este documento continua sendo uma especificação de fase de projeto e histórico de decisões para o comportamento de repetição de pagamentos
- a fonte de referência em tempo de execução está localizada em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Semântica básica de repetição de tentativas

O `Dunning` deve tentar novamente a cobrança da dívida de renovação pendente por cada `RenewalCycle` que tenha falhado.

Em termos do Medusa, a operação de nova tentativa deve ter como objetivo:
- cobrar o pagamento do pedido de renovação associado ao evento de inadimplência
- utilizar o contexto de pagamento fora da sessão salvo na assinatura
- gerar uma nova tentativa concreta de cobrança no histórico `DunningAttempt`

Isso significa que o `Dunning` não está repetindo:
- todo o fluxo de trabalho de renovação desde o início;
- o `RenewalCycle` original;
- alterações genéricas no ciclo de vida da assinatura

Está tentando novamente:
- o fluxo de cobrança do pedido de renovação já criado

## 2. O que exatamente é uma nova tentativa?

### Decisão final

A unidade de repetição deve:
- criar uma nova sessão de pagamento para a cobrança do pedido de renovação;
- autorizar essa sessão de pagamento com o método de pagamento fora de sessão salvo;
- capturar o pagamento resultante quando a autorização for bem-sucedida

Isso reflete as etapas de pagamento já utilizadas no fluxo de renovação atual:
- cobrança do pagamento
- sessão de pagamento
- autorização
- captura

Mas, no caso de `Dunning`, o pedido já deve existir; portanto, a principal estratégia de recuperação é tentar novamente o pagamento no contexto de pagamento desse pedido existente.

## 3. Tentar iniciar o artefato novamente

### Decisão final

A nova tentativa deve começar a partir do `payment_collection` do pedido de renovação.

Do ponto de vista operacional:
- `renewal_order_id` é a referência comercial do caso
- a cobrança vinculada ao pedido é o artefato técnico inicial para a repetição da tentativa de pagamento

Por que essa abordagem é preferível:
- O modelo de pedido-pagamento da Medusa associa naturalmente a cobrança do pagamento ao pedido
- A cobrança do pagamento é o ponto em que novas sessões de pagamento são criadas
- Isso evita a recriação de todo o pedido a cada nova tentativa
- Mantém o evento de dívida vinculado ao mesmo contexto do pedido de renovação

## 4. Por que a nova tentativa não deve partir da sessão de pagamento anterior

A nova tentativa não deve, em primeiro lugar, reutilizar a sessão de pagamento que falhou anteriormente como principal mecanismo de nova tentativa.

Por que:
- uma sessão com falha representa uma tentativa registrada no histórico
- uma nova tentativa deve criar um novo limite para a tentativa de pagamento
- o estado da sessão de pagamento do lado do provedor pode já estar em fase terminal ou desatualizado
- reutilizar sessões antigas torna o histórico de tentativas e os diagnósticos menos claros

Isso significa que:
- a sessão de pagamento anterior permanece como contexto histórico
- a nova tentativa deve criar uma nova sessão na mesma coleção de pagamentos, sempre que possível

## 5. Reutilização versus recriação de cobranças

### Decisão final

No MVP, o `Dunning` deve reutilizar a cobrança do pedido de renovação existente e criar uma nova sessão de pagamento para cada tentativa de repetição.

Comportamento recomendado:
- reutilizar `payment_collection`
- criar uma nova `payment_session`
- autorizar a nova sessão
- capturar o pagamento resultante

Por que essa opção é preferível:
- está alinhada com o modelo de pagamento da Medusa, que envolve coleções contendo várias sessões e pagamentos ao longo do tempo
- mantém o evento de dívida vinculado ao mesmo contexto de pagamento no nível do pedido
- evita a proliferação desnecessária de coleções de pagamentos

## 6. Quando a recriação da cobrança não é a configuração padrão

Recriar a cobrança do pagamento não deve ser a estratégia padrão de nova tentativa no MVP.

Por que:
- o pedido já possui seu próprio contexto de cobrança
- o problema de recuperação geralmente é “é necessária outra tentativa de pagamento”, e não “o pedido precisa de uma estrutura de pagamento totalmente nova”
- recriar a cobrança aumentaria a complexidade sem trazer benefícios claros para o escopo atual

Isso não descarta exceções futuras, mas elas estão fora do escopo do MVP.

## 7. Estratégia de sessão de pagamento

### Decisão final

Cada nova tentativa de cobrança deve criar uma nova sessão de pagamento.

Fluxo recomendado:
1. carregue o pedido de renovação
2. resolver a cobrança do pedido
3. crie uma nova sessão de pagamento nessa coleção
4. passe o provedor de pagamento armazenado e o contexto do método de pagamento salvo
5. autorizar a nova sessão
6. capturar o pagamento se a autorização for bem-sucedida

Isso fornece uma tentativa técnica limpa por nova tentativa de cobrança.

## 8. Fonte do contexto de pagamento

A nova tentativa deve usar o contexto de pagamento salvo da assinatura como fonte para identificadores de provedor e método de pagamento.

Contexto necessário atualmente disponível no plugin:
- `payment_provider_id`
- `referência_método_de_pagamento`
- campos opcionais de contexto de pagamento do cliente relacionados

Por que isso é preferido:
- `Assinatura` já possui contexto de pagamento recorrente para cobrança fora da sessão
- o caso de cobrança não deve se tornar o proprietário de longo prazo das credenciais do provedor ou da identidade do método de pagamento salva
- isso mantém o contexto de pagamento consistente com o fluxo de renovação já implementado no plugin

## 9. Fluxo de repetição sugerido da Medusa

O fluxo MVP recomendado é:

1. resolva `renewal_order_id` de `DunningCase`
2. consulte `payment_collection` vinculado ao pedido
3. crie uma nova sessão de pagamento com:
   - o ID de cobrança do pagamento do pedido
   - ID do provedor do contexto de pagamento da assinatura
   - ID do cliente da assinatura
   - dados do provedor, incluindo método de pagamento salvo e sinalizadores fora da sessão
4. autorizar a nova sessão de pagamento
5. capturar o pagamento resultante se a autorização for bem-sucedida
6. armazene um `DunningAttempt`
7. atualize `DunningCase` de acordo com o resultado do pagamento

Este fluxo está alinhado com a atual implementação de renovação e com os fluxos de trabalho de pagamento da Medusa.

## 10. Estratégia de idempotência

A nova tentativa de pagamento deve ser idempotente em dois níveis:

- guarda de execução de caso em nível de domínio
- guarda de execução de tentativa de pagamento

### 10.1 Idempotência em nível de domínio

O fluxo de trabalho de nova tentativa de cobrança deve impor:
- uma nova tentativa em voo por `DunningCase`
- nenhum agendador duplicado/execução manual para o mesmo caso ao mesmo tempo

Mecanismo recomendado:
- chave de bloqueio de fluxo de trabalho com escopo para `dunning:${dunning_case_id}`
- transição do status do caso para `repetindo` antes do início da execução do pagamento

Isso corresponde ao padrão de simultaneidade já usado em `Renovações`.

### 10.2 Idempotência de tentativa de pagamento

Cada nova tentativa de cobrança deve criar no máximo uma nova sessão de pagamento para uma execução de nova tentativa lógica.

Regra recomendada:
- um `DunningAttempt` corresponde a uma execução lógica de nova tentativa de pagamento
- se o fluxo de trabalho for repetido internamente devido a uma falha técnica antes de uma tentativa de pagamento ser confirmada, a mesma tentativa lógica não deverá gerar várias capturas de pagamento bem-sucedidas

Interpretação prática do MVP:
- crie o `DunningAttempt` antes de iniciar a execução do pagamento
- registrar referências de provedor/pagamento nessa tentativa, quando disponível
- se uma execução de nova tentativa já produziu um resultado de tentativa terminal, bloquear a reentrada duplicada para a mesma tentativa e exigir uma nova ação explícita de nova tentativa

## 11. Semântica manual de repetição agora

A nova tentativa manual agora deve reutilizar a mesma estratégia de nova tentativa de pagamento que o agendador.

Deve diferir apenas em:
- quem iniciou a nova tentativa
- se as verificações do devido prazo são ignoradas

Não deve usar um caminho de pagamento separado.

Isso mantém:
- comportamento de pagamento consistente
- classificação de falha consistente
- histórico de tentativas de cobrança comparável entre ações do agendador e do administrador

## 12. Falha temporária, falha permanente e recuperação

Os resultados do pagamento devem ser classificados em três grupos:

- `recuperação`
- `falha_temporária`
- `falha_permanente`

### 12.1 Recuperação

Recuperação significa:
- autorização bem sucedida
- a captura for bem-sucedida ou o pagamento atingir a condição de sucesso exigida pela estratégia do fornecedor
- o evento de dívida é resolvido

Exemplos recomendados:
- pagamento autorizado e capturado com sucesso
- pagamento confirmado como cobrado através do caminho normal de sucesso do fornecedor

Efeito de domínio:
- `DunningAttempt.status = bem sucedido`
- `DunningCase.status = recuperado`

### 12.2 Falha temporária

Falha temporária significa:
- o pagamento não foi bem sucedido agora
- outra nova tentativa ainda pode ser apropriada

Exemplos recomendados:
- interrupção transitória do provedor
- problema temporário de processador/rede
- declínio suave que a política trata como passível de nova tentativa
- autorização temporária ou falha de captura que não invalide o próprio meio de pagamento

Efeito de domínio:
- `DunningAttempt.status = falhou`
- `DunningCase` geralmente faz a transição para `retry_scheduled`

### 12.3 Falha permanente

Falha permanente significa:
- o pagamento não foi bem sucedido
- repetir automaticamente a mesma estratégia não é apropriado sem intervenção humana ou alteração do método de pagamento

Exemplos recomendados:
- cartão expirado
- forma de pagamento desvinculada ou inválida
- o provedor indica que a substituição do cartão ou do mandato é necessária
- recusa brusca classificada como não repetível pela política

Efeito de domínio:
- `DunningAttempt.status = falhou`
- `DunningCase` geralmente faz a transição para `awaiting_manual_resolution`
  ou `não recuperado` dependendo da política e da estratégia do operador

## 13. Como tratar `requires_more`

Se a autorização retornar um fluxo que requer interação do cliente, como `requires_more`:
- não deve contar como recuperação bem-sucedida
- não deve ser tratado como um sucesso normal de nova tentativa automática

Tratamento recomendado do MVP:
- classificá-lo como um resultado permanente ou com necessidade de intervenção manual para cobrança fora da sessão
- mova o caso para `awaiting_manual_resolution`

Por quê:
- o fluxo de cobrança é orientado pelo administrador e fora da sessão
- a recuperação interativa do cliente está fora do escopo atual do MVP

## 14. Capturar semântica de falha

Se a autorização for bem-sucedida, mas a captura falhar:

### Falha na captura temporária

Exemplos:
- problema transitório do provedor
- liquidação temporária ou indisponibilidade do processador

Manuseio recomendado:
- classificar como `temporary_failure`

### Falha permanente na captura

Exemplos:
- o provedor marca o pagamento como não cobrável nas condições atuais
- a política comercial trata a falha de captura como não passível de nova tentativa

Manuseio recomendado:
- classificar como `permanent_failure`

O caso ainda deverá permanecer ancorado no mesmo evento de dívida e contexto de ordem.

## 15. Por que toda a renovação não deve ser repetida

`Dunning` não deve executar novamente o fluxo de trabalho de renovação completo.

Por quê:
- o ciclo de renovação já possui o histórico original de execução com falha
- a ordem de renovação já deverá existir para o evento de dívida em recuperação
- executar novamente toda a renovação corre o risco de duplicar a criação de pedidos ou misturar domínios
- `Dunning` é uma camada de recuperação de pagamento, não uma segunda camada de execução de renovação

Isso preserva a separação:
- `Renovações` criam o evento de dívida
- `Dunning` recupera o pagamento desse evento de dívida

## 16. Relação com links de pagamento diferido

Esta estratégia não requer links de pagamento no MVP.

Por quê:
- `DunningCase` já possui `renewal_order_id`
- A Medusa já modela a ligação do pedido ao pagamento-cobrança
- `DunningAttempt.payment_reference` pode armazenar referências técnicas para diagnóstico

Se a implementação posterior provar que é necessário enriquecimento direto do módulo de pagamento:
- links de pagamento podem ser adicionados então
- mas eles não são obrigados a definir a estratégia de novas tentativas agora

## 17. Exemplos sugeridos de ciclo de vida

### 17.1 Tentar novamente a partir da cobrança de pagamento de pedido existente

- referências de caso `renewal_order_id`
- a cobrança do pagamento do pedido foi resolvida
- nova sessão de pagamento é criada nessa coleção
- autorização e captura bem-sucedidas
- o caso se torna `recuperado`

### 17.2 Tentar novamente com falha temporária do provedor

- nova sessão é criada na cobrança de pagamentos existente
- a autorização falha com um problema de provedor que pode ser repetido
- a tentativa é registrada como falhada
- o caso permanece ativo e passa para `retry_scheduled`

### 17.3 Tentar novamente com falha permanente na forma de pagamento

- nova sessão é criada na cobrança de pagamentos existente
- relatórios do provedor expiraram ou método de pagamento inutilizável
- a tentativa é registrada como falhada
- o caso passa para `awaiting_manual_resolution`

## 18. Recomendação final

Para a etapa `2.4.8`, a recomendação final é:

- tentar novamente o pagamento do pedido de renovação, e não todo o fluxo de trabalho de renovação
- comece a partir da `payment_collection` do pedido de renovação
- reutilizar a cobrança de pagamento existente
- crie uma nova sessão de pagamento para cada nova tentativa
- autorizar e capturar esse novo pagamento
- usar o contexto de pagamento de assinatura como fonte do provedor e dos dados salvos da forma de pagamento
- impor idempotência com:
  - um guarda de execução em voo em nível de caso
  - uma tentativa lógica de pagamento por `DunningAttempt`
- classificar os resultados em:
  - `recuperação`
  - `falha_temporária`
  - `falha_permanente`
