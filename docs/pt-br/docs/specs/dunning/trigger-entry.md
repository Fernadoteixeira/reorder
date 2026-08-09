# Reordenar: especificações de entrada do gatilho de cobrança

Este documento cobre a etapa `2.4.1` de `documentation/implementation_plan.md`.

Objetivo:
- definir quando um `Renewal` com falha deve entrar em `Dunning`
- distinguir falhas de recuperação de pagamento de falhas de renovação de não pagamento
- definir como as falhas do provedor de pagamento e dos artefatos de pagamento da Medusa são classificadas
- definir se `Dunning` inicia apenas a partir da primeira falha no pagamento de renovação ou também a partir de tentativas de recuperação posteriores

Esta especificação se baseia em:
- `reorder/docs/specs/subscriptions/domain-model.md`
- `reorder/docs/specs/renewals/source-of-truth-semantics.md`
- `reorder/docs/architecture/renewals.md`

A direção segue os padrões da Medusa:
- as operações de pagamento devem ser expressas através de fluxos de trabalho de pagamento Medusa e APIs de módulo de pagamento
- os fluxos de recuperação de negócios devem distinguir falhas de pagamento de falhas de pedidos e domínios
- os fluxos de trabalho permanecem no limite da mutação, enquanto os módulos possuem o estado do domínio
- As áreas operacionais voltadas para o administrador devem usar o status explícito e a classificação de falhas, em vez de analisar as suposições da IU

Status de implementação:
- `Dunning` é implementado
- este documento continua sendo uma especificação de tempo de design e histórico de decisão para o limite do gatilho
- a fonte da verdade em tempo de execução reside em `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/admin/dunning.md` e `docs/testing/dunning.md`

## 1. Definição de gatilho

`Dunning` inicia somente quando uma tentativa de renovação falha porque a recuperação do pagamento comercial falhou.

Em termos práticos:
- a tentativa de renovação já atingiu a fase de pagamento
- a falha vem da inicialização, autorização ou captura do pagamento
- a falha significa que a assinatura ainda pode ser recuperada por meio de uma nova tentativa posterior ou ação manual do operador

`Dunning` não inicia para falhas de renovação que acontecem antes da fase de pagamento ou fora da semântica de recuperação de pagamento.

## 2. Limite de responsabilidade

As três áreas mantêm responsabilidades separadas:

- `Subscriptions` possui o ciclo de vida da assinatura do cliente e o estado operacional
- `Renewals` possui um ciclo de faturamento vencido, seu histórico de execução e se uma tentativa de renovação falhou
- `Dunning` possui recuperação de tentativas de pagamento de renovação malsucedidas após uma falha qualificada de pagamento

Isso significa:
- nem toda renovação fracassada se torna um caso de cobrança
- `Dunning` é uma camada de recuperação especializada para falhas de pagamento, não um intervalo genérico de novas tentativas para todos os erros de renovação
- o evento de origem para `Dunning` é uma tentativa de renovação malsucedida com um motivo de falha classificado como pagamento

## 3. Categorias de falha de renovação

Para `Dunning`, as falhas de renovação são divididas em dois grupos de nível superior:

### 3.1 Falhas qualificadas para pagamento

Essas falhas se qualificam para a criação ou atualização de `DunningCase`.

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
- a falha deve ser tratada em `Renewals`, `Subscriptions` ou observabilidade operacional
- tentar novamente o pagamento mais tarde não resolveria o problema subjacente

## 4. Classificação das fases de pagamento

O fluxo de renovação atual em `reorder` usa estas etapas relacionadas ao pagamento:

1. criar ou atualizar cobrança de pagamento para o pedido de renovação
2. crie uma sessão de pagamento para o provedor selecionado
3. autorizar sessão de pagamento
4. capturar pagamento

Para `Dunning`, o limite do acionador é definido por estágio conforme a seguir.

### 4.1 Etapa de cobrança do pagamento

A falha ao criar ou anexar a cobrança de pagamento de renovação **não** é um gatilho de cobrança por padrão.

Raciocínio:
- a criação de cobrança de pagamento ainda é uma configuração de pagamento, não uma tentativa real de cobrança
- falha aqui geralmente significa um problema de fluxo de trabalho, configuração ou artefato de pedido/pagamento
- isso deve permanecer como uma falha `Renewal` até que uma implementação posterior prove que já existe uma dívida recuperável nesta fase

Decisão:
- `createOrUpdateOrderPaymentCollectionWorkflow` falha => `renewal failed`, não `dunning`
- falta de cobrança de pagamento após o fluxo de trabalho => `renewal failed`, não `dunning`

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
- configuração local ou falha na configuração do fluxo de trabalho => `renewal failed`

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
- fluxos de estilo `requires_more` explícitos que precisam de interação com o cliente e não são recuperáveis fora da sessão na renovação orientada pelo administrador

Decisão:
- rejeição de autorização em nível de provedor => `dunning`
- uso indevido técnico da API de autorização por não pagamento => `renewal failed`

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
- falha local de não pagamento em torno da chamada de captura => `renewal failed`

## 5. Mapeamento por fonte de falha

O gatilho deve classificar as falhas por origem, não apenas pelo texto bruto da mensagem.

Buckets de origem recomendados:

- `payment_provider`
- `payment_session`
- `payment_capture`
- `payment_collection`
- `renewal_order`
- `subscription_state`
- `offer_policy`
- `approval_gate`
- `concurrency`
- `unexpected`

Regra de acionamento de cobrança recomendada:

- Falhas `payment_provider`, `payment_session` e `payment_capture` selecionadas podem abrir ou atualizar `Dunning`
- Falhas `payment_collection` não abrem `Dunning` no MVP
- todos os outros buckets permanecem falhas `Renewal` simples

## 6. Exemplos de mapeamento

Os exemplos a seguir definem a semântica pretendida.

### Entra `Dunning`

- o provedor de pagamento recusa a autorização fora da sessão porque o cartão não tem fundos suficientes
- o método de pagamento armazenado expirou ou não pode mais ser usado no momento de início da sessão do provedor
- a autorização de pagamento falha com um código de recusa do provedor
- a captura falha após a autorização porque o provedor rejeita a liquidação
- um caso de cobrança aberto executa outra nova tentativa e o provedor rejeita a cobrança novamente

### Não entra `Dunning`

- a assinatura é pausada ou cancelada antes da data do ciclo
- a alteração pendente precisa de aprovação e a aprovação ainda está pendente ou rejeitada
- ativo `PlanOffer` não permite mais a frequência pendente
- não foi possível criar o pedido de renovação
- o ID do provedor de pagamento ou a referência do método de pagamento estão faltando nos dados de assinatura local
- o agendador atingiu uma execução duplicada ou conflito de bloqueio
- uma exceção genérica inesperada ocorre antes de qualquer semântica de tentativa de pagamento ser estabelecida

## 7. Tempo de disparo

`Dunning` deve começar somente depois que uma tentativa de pagamento de renovação com falha for estabelecida.

Na semântica do MVP:
- a tentativa de renovação é criada primeiro
- o ciclo de renovação transita para `failed`
- a falha é classificada
- somente então um fluxo de trabalho `start-dunning` poderá criar ou atualizar um `DunningCase`

Isso preserva limites limpos:
- `Renewals` ainda registra a tentativa de execução falhada
- `Dunning` reage a um evento de falha classificado
- a mesma falha de renovação permanece auditável mesmo se `Dunning` posteriormente for bem-sucedido ou fechar sem recuperação

## 8. Primeira falha versus falhas de recuperação posteriores

`Dunning` começa na primeira tentativa de renovação com falha qualificada para pagamento e continua a possuir falhas de recuperação posteriores para o mesmo evento de dívida.

Decisão:
- a falha na renovação de qualificação inicial cria ou reutiliza o `DunningCase` ativo
- falhas de novas tentativas de cobrança posteriores não criam um novo ciclo de renovação
- falhas de novas tentativas posteriores atualizam o mesmo `DunningCase` e acrescentam `DunningAttempt`

Por quê:
- um evento de renovação de dívida não paga deve ser mapeado para um caso de recuperação ativo
- tentativas repetidas de recuperação fazem parte do histórico de cobrança, e não do histórico repetido de execução de renovação
- isso simplifica a revisão operacional do administrador e evita casos abertos duplicados para o mesmo pagamento perdido

## 9. Limite de evento de dívida

O evento de dívida para MVP é a tentativa fracassada de pagamento de um `RenewalCycle` concreto.

Implicações:
- um caso de cobrança está vinculado a um ciclo de renovação fracassado
- o ciclo de renovação é o evento operacional originário
- tentativas posteriores podem usar artefatos de pedido ou pagamento, mas ainda pertencem ao mesmo evento de dívida originador

Este é o limite recomendado para a próxima etapa que define a fonte da verdade e a propriedade do caso.

## 10. Direção de implementação recomendada

Para implementação em etapas posteriores, o plug-in deve parar de depender apenas de erros `renewal_failed` amplos e introduzir classificação de falha explícita para caminhos relacionados a pagamentos.

Direção recomendada:
- classificar falhas de renovação próximas às operações de pagamento
- persistir dados de falha estruturados suficientes para decidir se `Dunning` deve iniciar
- tratar problemas de recusa de provedores e métodos de pagamento como candidatos à recuperação de pagamento
- manter problemas de dados/configuração/elegibilidade apenas no domínio `Renewals`

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
