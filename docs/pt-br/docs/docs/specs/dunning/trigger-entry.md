# Reordenar: especificações de entrada do gatilho de cobrança

Este documento cobre a etapa `2.4.1` de `documentation/implementation_plan.md`.

Objetivo:
- definir quando uma `Renovação` falhada deve entrar em `Dunning`
- distinguir falhas de recuperação de pagamento de falhas de renovação de não pagamento
- definir como as falhas do provedor de pagamento e dos artefatos de pagamento da Medusa são classificadas
- definir se a `Dunning` começa apenas a partir do primeiro pagamento de renovação falhado ou também a partir de tentativas de recuperação posteriores

Esta especificação se baseia em:
- `reordenar/docs/specs/subscriptions/domain-model.md`
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`
- `reordenar/docs/architecture/renewals.md`

A direção segue os padrões da Medusa:
- as operações de pagamento devem ser expressas através de fluxos de trabalho de pagamento Medusa e APIs de módulo de pagamento
- os fluxos de recuperação de negócios devem distinguir falhas de pagamento de falhas de pedidos e domínios
- os fluxos de trabalho permanecem no limite da mutação, enquanto os módulos possuem o estado do domínio
- As áreas operacionais voltadas para o administrador devem usar o status explícito e a classificação de falhas, em vez de analisar as suposições da IU

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para o limite do gatilho
- a fonte da verdade do tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Definição de gatilho

A `cobrança` começa somente quando uma tentativa de renovação falha porque a recuperação do pagamento comercial falhou.

Em termos práticos:
- a tentativa de renovação já atingiu a fase de pagamento
- a falha vem da inicialização, autorização ou captura do pagamento
- a falha significa que a assinatura ainda pode ser recuperada por meio de uma nova tentativa posterior ou ação manual do operador

A `cobrança` não é iniciada para falhas de renovação que ocorrem antes da fase de pagamento ou fora da semântica de recuperação de pagamento.

## 2. Limite de responsabilidade

As três áreas mantêm responsabilidades separadas:

- `Assinaturas` controlam o ciclo de vida da assinatura do cliente e o estado operacional
- `Renovações` possuem um ciclo de faturamento devido, seu histórico de execução e se uma tentativa de renovação falhou
- `Dunning` possui recuperação de tentativas de pagamento de renovação malsucedidas após uma falha qualificada de pagamento

Isso significa:
- nem toda renovação fracassada se torna um caso de cobrança
- `Dunning` é uma camada de recuperação especializada para falhas de pagamento, não um intervalo genérico de novas tentativas para todos os erros de renovação
- o evento de origem de `Dunning` é uma tentativa de renovação malsucedida com um motivo de falha classificado como pagamento

## 3. Categorias de falha de renovação

Para `Dunning`, as falhas de renovação são divididas em dois grupos de nível superior:

### 3.1 Falhas qualificadas para pagamento

Essas falhas se qualificam para a criação ou atualização de um `DunningCase`.

Eles incluem:
- falha na inicialização da sessão de pagamento para cobrança de renovação
- rejeição do provedor durante autorização de pagamento
- falha do provedor ou do módulo de pagamento durante a captura do pagamento
- tentativas posteriores de pagamento de recuperação com falha para um caso de cobrança já aberto

Significado comercial comum:
- o pedido de renovação e o caminho de pagamento eram válidos o suficiente para tentar a cobrança
- a falha indica que a dívida é cobrável em princípio, mas a cobrança não foi bem-sucedida agora
- tentativas posteriores, atualizações da forma de pagamento ou ações do operador podem recuperar a assinatura

### 3.2 Falhas na renovação por falta de pagamento

Essas falhas não se qualificam para `Dunning`.

Eles incluem:
- assinatura não elegível para renovação
- aprovação não concedida para alterações pendentes aplicáveis
- a política de oferta ativa não permite mais renovação ou alteração pendente
- os dados do carrinho de origem ou da assinatura são inválidos ou incompletos
- falha na criação do pedido de renovação antes que a recuperação do pagamento possa começar
- simultaneidade, execução duplicada ou conflitos de bloqueio
- falhas inesperadas de infraestrutura não relacionadas à tentativa de pagamento

Significado comercial comum:
- ainda não há dívida de pagamento cobrável
- a falha deve ser tratada em `Renovações`, `Assinaturas` ou observabilidade operacional
- tentar novamente o pagamento mais tarde não resolveria o problema subjacente

## 4. Classificação das fases de pagamento

O fluxo de renovação atual em `reordenar` usa estas etapas relacionadas ao pagamento:

1. criar ou atualizar cobrança de pagamento para o pedido de renovação
2. crie uma sessão de pagamento para o provedor selecionado
3. autorizar sessão de pagamento
4. capturar pagamento

Para `Dunning`, o limite do gatilho é definido por estágio da seguinte forma.

### 4.1 Etapa de cobrança do pagamento

A falha ao criar ou anexar a cobrança de pagamento de renovação **não** é um gatilho de cobrança por padrão.

Raciocínio:
- a criação de cobrança de pagamento ainda é uma configuração de pagamento, não uma tentativa real de cobrança
- falha aqui geralmente significa um problema de fluxo de trabalho, configuração ou artefato de pedido/pagamento
- isto deverá continuar a ser um fracasso da «renovação» até que uma implementação posterior prove que já existe uma dívida recuperável nesta fase

Decisão:
- Falha `createOrUpdateOrderPaymentCollectionWorkflow` => `falha na renovação`, não `dunning`
- falta de cobrança de pagamento após o fluxo de trabalho => `falha na renovação`, não `cobrança`

### 4.2 Estágio da sessão de pagamento

A falha ao criar a sessão de pagamento é um gatilho de cobrança somente quando a falha está relacionada ao pagamento do fornecedor.

Qualifica-se para `Dunning`:
- o provedor rejeita a inicialização de uma cobrança fora da sessão
- o método de pagamento armazenado é inválido, expirou, foi desconectado ou inutilizável
- o provedor retorna uma falha específica de pagamento ao criar a sessão

Não se qualifica para `Dunning`:
- o provedor de pagamento está ausente no contexto de pagamento de assinatura
- a entrada do fluxo de trabalho é estruturalmente inválida
- a configuração de região, pedido ou cobrança de pagamento é inconsistente

Decisão:
- rejeição do provedor/método de pagamento durante a inicialização da sessão => `dunning`
- falha na configuração local ou na configuração do fluxo de trabalho => `falha na renovação`

### 4.3 Estágio de autorização

A falha durante `authorizePaymentSession` é um gatilho de cobrança por padrão, a menos que a falha claramente não seja uma falha de recuperação de pagamento.

Qualifica-se para `Dunning`:
- fundos insuficientes
- cartão expirado
- cartão recusado
- forma de pagamento requer substituição
- autorização fora da sessão rejeitada pelo provedor
- autorização temporariamente indisponível, mas ainda relacionada ao pagamento

Não se qualifica para `Dunning`:
- uso indevido de código ou estado de fluxo de trabalho inválido
- identificadores de provedor/sessão ausentes devido à corrupção de dados locais
- fluxos explícitos no estilo `requires_more` que precisam de interação com o cliente e não são recuperáveis fora da sessão na renovação orientada pelo administrador

Decisão:
- rejeição de autorização em nível de provedor => `dunning`
- uso indevido técnico da API de autorização por não pagamento => `falha na renovação`

### 4.4 Estágio de captura

A falha durante a captura é um gatilho de cobrança somente quando a autorização foi bem-sucedida, mas os fundos não foram capturados devido a um problema de recuperação de pagamento.

Qualifica-se para `Dunning`:
- rejeição de captura do provedor após autorização bem-sucedida
- falha temporária na captura do processador de pagamento
- erro de pagamento relacionado à liquidação que ainda representa dívida não paga

Não se qualifica para `Dunning`:
- falha na invocação local não vinculada ao resultado da cobrança do provedor
- corrupção do estado do fluxo de trabalho interno não relacionada à cobrança de pagamentos

Decisão:
- rejeição de captura de provedor/pagamento => `dunning`
- falha local de não pagamento em torno da chamada de captura => `falha na renovação`

## 5. Mapeamento por fonte de falha

O gatilho deve classificar as falhas por origem, não apenas pelo texto bruto da mensagem.

Buckets de origem recomendados:

- `provedor_de_pagamento`
- `sessão_de_pagamento`
- `captura_de_pagamento`
- `cobrança_pagamento`
- `pedido_renovação`
- `subscrição_estado`
- `política_de_oferta`
- `aprovação_gate`
- `simultaneidade`
- `inesperado`

Regra de acionamento de cobrança recomendada:

- `payment_provider`, `payment_session` e falhas selecionadas de `payment_capture` podem abrir ou atualizar `Dunning`
- Falhas em `payment_collection` não abrem `Dunning` no MVP
- todos os outros buckets permanecem falhas simples de `renovação`

## 6. Exemplos de mapeamento

Os exemplos a seguir definem a semântica pretendida.

### Entra em `Cobrança`

- o provedor de pagamento recusa a autorização fora da sessão porque o cartão não tem fundos suficientes
- o método de pagamento armazenado expirou ou não pode mais ser usado no momento de início da sessão do provedor
- a autorização de pagamento falha com um código de recusa do provedor
- a captura falha após a autorização porque o provedor rejeita a liquidação
- um caso de cobrança aberto executa outra nova tentativa e o provedor rejeita a cobrança novamente

### Não entra `Dunning`

- a assinatura é pausada ou cancelada antes da data do ciclo
- a alteração pendente precisa de aprovação e a aprovação ainda está pendente ou rejeitada
- `PlanOffer` ativo não permite mais a frequência pendente
- não foi possível criar o pedido de renovação
- o ID do provedor de pagamento ou a referência do método de pagamento estão faltando nos dados de assinatura local
- o agendador atingiu uma execução duplicada ou conflito de bloqueio
- uma exceção genérica inesperada ocorre antes de qualquer semântica de tentativa de pagamento ser estabelecida

## 7. Tempo de disparo

A `cobrança` deve começar somente após uma tentativa fracassada de pagamento de renovação ser estabelecida.

Na semântica do MVP:
- a tentativa de renovação é criada primeiro
- o ciclo de renovação transita para `failed`
- a falha é classificada
- só então um fluxo de trabalho `start-dunning` pode criar ou atualizar um `DunningCase`

Isso preserva limites limpos:
- `Renovações` ainda registram a tentativa de execução falhada
- `Dunning` reage a um evento de falha classificado
- a mesma falha de renovação permanece auditável mesmo se a `Cobrança` for bem-sucedida posteriormente ou fechar sem recuperação

## 8. Primeira falha versus falhas de recuperação posteriores

A `cobrança` começa na primeira tentativa de renovação fracassada qualificada para pagamento e continua a possuir falhas de recuperação posteriores para o mesmo evento de dívida.

Decisão:
- a falha na renovação de qualificação inicial cria ou reutiliza o `DunningCase` ativo
- falhas de novas tentativas de cobrança posteriores não criam um novo ciclo de renovação
- falhas de novas tentativas posteriores atualizam o mesmo `DunningCase` e acrescentam `DunningAttempt`

Por quê:
- um evento de renovação de dívida não paga deve ser mapeado para um caso de recuperação ativo
- tentativas repetidas de recuperação fazem parte do histórico de cobrança, e não do histórico repetido de execução de renovação
- isso simplifica a revisão operacional do administrador e evita casos abertos duplicados para o mesmo pagamento perdido

## 9. Limite de evento de dívida

O evento de dívida para o MVP é a tentativa fracassada de pagamento de um `RenewalCycle` concreto.

Implicações:
- um caso de cobrança está vinculado a um ciclo de renovação fracassado
- o ciclo de renovação é o evento operacional originário
- tentativas posteriores podem usar artefatos de pedido ou pagamento, mas ainda pertencem ao mesmo evento de dívida originador

Este é o limite recomendado para a próxima etapa que define a fonte da verdade e a propriedade do caso.

## 10. Direção de implementação recomendada

Para implementação em etapas posteriores, o plug-in deve parar de depender apenas de erros amplos `renewal_failed` e introduzir classificação de falha explícita para caminhos relacionados a pagamentos.

Direção recomendada:
- classificar falhas de renovação próximas às operações de pagamento
- persistir dados de falha estruturados suficientes para decidir se a `Dunning` deve começar
- tratar problemas de recusa de provedores e métodos de pagamento como candidatos à recuperação de pagamento
- manter problemas de dados/configuração/elegibilidade apenas no domínio `Renovações`

Isso se alinha com os padrões da Medusa:
- a orquestração do fluxo de trabalho permanece explícita
- as preocupações com pagamentos são modeladas em torno de artefatos de pagamento e resultados do fornecedor
- a lógica de recuperação é orientada pela classificação do domínio, não pelo comportamento da UI

## 11. Resumo da decisão final

Para a etapa `2.4.1`, as decisões finais são:

- `Dunning` é inserido apenas para falhas qualificadas para pagamento
- `Dunning` não é uma área genérica de nova tentativa para todas as renovações com falha
- as falhas na criação de cobranças de pagamentos permanecem falhas de renovação simples no MVP
- falhas na sessão de pagamento entram em `Dunning` somente quando representam rejeição do provedor/método de pagamento
- falhas de autorização entram em `Dunning` por padrão quando vêm do provedor de pagamento
- falhas de captura entram em `Dunning` quando representam dívida não paga após autorização
- tentativas subsequentes de recuperação malsucedidas permanecem no mesmo caso de cobrança, em vez de criar novos casos de origem de renovação
