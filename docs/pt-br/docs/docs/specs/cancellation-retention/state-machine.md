# Reordenar: especificações da máquina de estado de cancelamento e retenção

Este documento cobre a etapa `2.5.7` de `documentation/implementation_plan.md`.

Objetivo:
- definir o modelo de status de negócios para `CancellationCase`
- definir o modelo de status do evento para `RetentionOfferEvent`
- definir transições de estado legais e ilegais
- definir quando as ações de retenção ainda poderão ser propostas
- definir quando o caso é considerado terminal

Esta especificação se baseia em:
- `reordenar/docs/specs/cancellation-retention/domain-model.md`
- `reordenar/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reordenar/docs/specs/cancellation-retention/trigger-entry.md`

A direção segue os padrões da Medusa:
- o estado agregado operacional deve permanecer explícito e consultável
- o estado do histórico de eventos deve permanecer separado do estado agregado
- os resultados finais dos negócios devem ser claramente modelados no agregado
- as ações manuais do administrador devem reutilizar as mesmas regras de domínio em vez de inventar semânticas paralelas

Status de implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte de verdade em tempo de design para a semântica de status e transição da área futura

## 1. Visão geral do modelo de estado

A área `Cancelamento e Retenção` usa duas dimensões de estado separadas:

- `CancellationCase.status`
- `RetentionOfferEvent.decision_status`

Essas dimensões não devem ser recolhidas em um campo.

Por quê:
- respostas sobre o status do caso onde todo o processo de tratamento de cancelamento está atualmente
- o status do evento responde ao que aconteceu com uma oferta de retenção concreta
- o estado agregado e o histórico de ofertas devem permanecer separados para leituras limpas do administrador e regras de fluxo de trabalho

## 2. `CancellationCase.status`

`CancellationCase.status` é o status do processo agregado de uma jornada de cancelamento gerenciada pelo operador.

### Valores permitidos

- `solicitado`
- `avaliando_retenção`
- `retenção_oferecida`
- `retido`
- `pausado`
- `cancelado`

### Significado de cada valor

#### `solicitado`

O caso existe, mas o operador ainda não avançou para a avaliação da retenção activa ou para o resultado final.

Este é o estado de entrada.

Exemplos típicos:
- a operadora iniciou o tratamento de cancelamentos da lista de assinaturas
- o caso foi criado a partir da página de detalhes e está aguardando revisão estruturada

#### `avaliando_retenção`

O caso está ativo e sendo avaliado para ações de salvamento ou direção de desligamento.

Isso significa:
- o caso não é terminal
- o operador poderá ainda optar pela retenção ou cancelamento direto
- a lógica de recomendação ainda pode mudar

#### `retenção_oferecida`

O caso está ativo e pelo menos uma oferta concreta de retenção foi proposta.

Isso significa:
- o processo permanece aberto
- o caso entrou em uma filial orientada por oferta
- o resultado ainda não é definitivo

#### `retido`

O caso foi encerrado com sucesso com o cliente retido sem pausa como caminho final.

Isso significa:
- o processo de cancelamento é terminal
- o relacionamento com o cliente permanece ativo no sentido retido
- nenhuma outra ação de retenção deve ser proposta neste caso

#### `pausado`

O caso foi encerrado com sucesso com pausa como resultado final da retenção.

Isso significa:
- o processo de cancelamento é terminal
- espera-se que a assinatura se materialize no estado de ciclo de vida pausado
- nenhuma outra ação de retenção deve ser proposta neste caso

#### `cancelado`

O caso foi encerrado com cancelamento final.

Isso significa:
- o processo de cancelamento é terminal
- espera-se que a assinatura se materialize no estado de ciclo de vida cancelado
- nenhuma outra ação de retenção deve ser proposta neste caso

## 3. Por que não existe `fechado`

### Decisão final

`CancellationCase` não deve usar um status `fechado` separado no MVP.

Por que isso é preferido:
- `retido`, `pausado` e `cancelado` já expressam resultados de negócios terminais diretamente
- um estatuto genérico «fechado» forçaria o sistema a reconstruir o resultado comercial real a partir de outros campos
- o estilo atual do plugin favorece valores de status explícitos e consultáveis com significado operacional direto

Interpretação recomendada:
- `retido`, `pausado` e `cancelado` são os status do terminal
- `final_outcome` continua sendo um campo de resumo do terminal, mas não precisa de um status genérico de wrapper como `closed`

## 4. `RetentionOfferEvent.decision_status`

`RetentionOfferEvent.decision_status` é o estado de decisão de uma proposta concreta de oferta de retenção.

### Valores permitidos

- `proposto`
- `aceito`
- `rejeitado`
- `aplicado`
- `expirado`

### Significado de cada valor

#### `proposto`

A oferta foi criada e aguarda decisão.

Isso significa:
- a oferta existe no cronograma do caso
- nenhuma decisão final foi ainda registrada sobre essa oferta

#### `aceito`

A oferta foi aceita, mas ainda não foi necessariamente aplicada.

Isso significa:
- ocorreu aceitação pelo operador ou pelo cliente
- a materialização do negócio ainda pode estar pendente

#### `rejeitado`

A oferta foi explicitamente rejeitada.

Isso significa:
- o evento é terminal
- o mesmo evento de oferta não deve entrar novamente no fluxo ativo

#### `aplicado`

A oferta foi realmente materializada em um efeito comercial.

Isso significa:
- o evento é terminal
- `applied_at` deve estar presente
- a oferta não é mais apenas uma proposta

#### `expirado`

A oferta não é mais válida ou relevante sem ser aplicada.

Isso significa:
- o evento é terminal
- a oferta pode ter expirado ou sido substituída por decisões de processo posteriores

## 5. Por que `aplicado` é um status separado

### Decisão final

`applied` deve continuar sendo um status explícito do evento, e não apenas um significado derivado de `applied_at != null`.

Por que essa abordagem é preferível:
- As visualizações de detalhes administrativos e de auditoria se beneficiam de um resultado de evento que pode ser consultado diretamente
- A aceitação e a aplicação nem sempre ocorrem no mesmo momento
- O estado do evento não deve exigir a derivação de um status semântico a partir de um campo de carimbo de data/hora

Interpretação recomendada:
- `aceito` significa que a decisão é positiva
- `aplicado` significa que o efeito comercial foi efetivamente executado

## 6. Transições legais de `CancellationCase.status`

Transições jurídicas recomendadas:

- `solicitado -> em_avaliação_de_retenção`
- `solicitado -> cancelado`
- `em_avaliação_de_retenção -> retenção_oferecida`
- `em_avaliação_de_retenção -> retido`
- `em_avaliação_de_retenção -> pausado`
- `em_avaliação_de_retenção -> cancelado`
- `retention_offered -> evaluating_retention`
- `retention_offered -> retained`
- `retention_offered -> paused`
- `retention_offered -> canceled`

### `solicitado -> em avaliação de retenção`

Permitido quando:
- o operador entra na avaliação estruturada das ações de salvamento
- o caso permanece ativo e ainda não está encerrado

### `solicitado -> cancelado`

Permitido quando:
- o operador ignora intencionalmente o tratamento de retenção e finaliza o cancelamento
- o fluxo de cancelamento ainda segue adiante

### `avaliação_da_retenção -> retenção_oferecida`

Permitido quando:
- for proposta e registrada uma oferta concreta de retenção
- o caso passa da fase de avaliação para o tratamento orientado pela oferta

### `avaliação_da_retenção -> retido`

Permitido quando:
- o processo for concluído com sucesso, sem a necessidade de manter o caso aberto para novas ofertas
- o resultado comercial for a retenção sem interrupção

### `avaliação_da_retenção -> em pausa`

Permitido quando:
- o processo for concluído com sucesso, tendo “pausa” como resultado de retenção escolhido

### `avaliação_de_retenção -> cancelado`

Permitido quando:
- o operador ou o fluxo de trabalho determina que o caso deve ser encerrado com cancelamento definitivo

### `retention_offered -> evaluating_retention`

Permitido quando:
- a oferta atualmente proposta foi rejeitada ou expirou
- o caso retorna a um estado de avaliação geral para a decisão sobre a próxima etapa

### `retention_offered -> retained`

Permitido quando:
- uma oferta concreta de retenção for bem-sucedida e o resultado comercial final for mantido

### `retention_offered -> pausado`

Permitido quando:
- uma oferta de pausa ou caminho de salvamento equivalente é bem-sucedida e a pausa se torna o resultado final da transação

### `retention_offered -> cancelado`

Permitido quando:
- as medidas de retenção propostas não resolveram o caso
- o operador decide, em vez disso, pelo cancelamento

## 7. Transições ilegais de `CancellationCase.status`

As seguintes transições devem ser consideradas inválidas:

- `solicitado -> retido`
- `solicitado -> pausado`
- `retenção_oferecida -> solicitado`
- `retido -> avaliando_retenção`
- `retido -> retenção_oferecida`
- `retido -> cancelado`
- `pausado -> avaliando_retenção`
- `pausado -> retenção_oferecida`
- `pausado -> cancelado`
- `cancelado -> avaliando_retenção`
- `cancelado -> retenção_oferecida`
- `cancelado -> retido`

Por quê:
- os status dos terminais devem permanecer terminais
- o caso não deve retroceder para um estado de entrada menos informado
- um resultado comercial final não deve ser transformado em um novo resultado conflitante no mesmo caso

## 8. Transições legais `RetentionOfferEvent.decision_status`

Transições legais recomendadas:

- `proposto -> aceito`
- `proposto -> rejeitado`
- `proposto -> expirado`
- `aceito -> aplicado`
- `aceito -> expirado`

### `proposto -> aceito`

Permitido quando:
- a oferta foi aceita positivamente pelo operador ou pelo fluxo de decisão voltado para o cliente

### `proposto -> rejeitado`

Permitido quando:
- a oferta foi explicitamente recusada

### `proposto -> expirado`

Permitido quando:
- a oferta deixou de ser relevante sem ser aceita ou aplicada
- o processo avançou e este evento deverá encerrar sem sucesso

### `aceito -> aplicado`

Permitido quando:
- a oferta aceita é realmente materializada por meio de lógica de negócios apoiada por fluxo de trabalho

### `aceito -> expirado`

Permitido quando:
- uma oferta aceita não pode mais ser aplicada e torna-se inválida antes da materialização

## 9. Transições `RetentionOfferEvent.decision_status` ilegais

As seguintes transições devem ser tratadas como inválidas:

- `proposto -> aplicado`
- `rejeitado -> *`
- `expirado -> *`
- `aplicado -> *`

Por quê:
- a aplicação deve seguir um estado explícito de aceitação
- os resultados dos eventos terminais devem permanecer terminais
- o histórico de eventos deve permanecer apenas anexado e semanticamente limpo

## 10. Quando ações de retenção ainda poderão ser propostas

Novas ações de retenção só poderão ser propostas enquanto o caso estiver ativo.

Status ativos recomendados:
- `solicitado`
- `avaliando_retenção`
- `retenção_oferecida`

Regra prática:
- em `requested`, o processo pode entrar na avaliação e propor o primeiro caminho de salvamento
- em `evaluating_retention`, o processo pode propor uma nova ação concreta de retenção
- em `retention_offered`, o processo pode propor uma oferta posterior somente após o caminho da oferta atualmente relevante ter sido resolvido ou o caso ter voltado para a lógica de avaliação

## 11. Quando as ações de retenção não devem mais ser propostas

Nenhuma nova ação de retenção deve ser proposta quando o status do caso for:

- `retido`
- `pausado`
- `cancelado`

Por quê:
- estes são resultados de negócios terminais
- o caso não é mais um processo de decisão ativo
- qualquer outra ação de salvamento pertenceria a um novo caso futuro, e não ao encerrado

## 12. Semântica de caso terminal

`CancellationCase` é terminal quando seu status é:

- `retido`
- `pausado`
- `cancelado`

Terminal significa:
- nenhuma nova oferta de retenção
- sem retorno aos estados de processo ativo
- nenhuma outra mutação no resultado do negócio dentro do mesmo caso

O caso permanece legível para:
- Detalhes do administrador
- auditorias
- análise de rotatividade

## 13. Relação entre o estado do evento e o estado do caso

`RetentionOfferEvent.decision_status` não dita automaticamente `CancellationCase.status`.

Por quê:
- um caso pode ter vários eventos de oferta ao longo do tempo
- uma oferta rejeitada ou expirada não encerra o caso por si só
- o resultado agregado só deve mudar quando o fluxo de trabalho decidir que o caso atingiu um resultado comercial final

Interpretação recomendada:
- o estado do evento informa as decisões do fluxo de trabalho
- o estado do caso continua sendo a fonte da verdade para todo o processo

## 14. Decisão sumária

A máquina de estado `Cancelamento e Retenção` para MVP é:

- `CancellationCase.status`:
  - `solicitado`
  - `avaliando_retenção`
  - `retenção_oferecida`
  - `retido`
  - `pausado`
  - `cancelado`
- `RetentionOfferEvent.decision_status`:
  - `proposto`
  - `aceito`
  - `rejeitado`
  - `aplicado`
  - `expirado`

Com estas regras:
- `retido`, `pausado` e `cancelado` são estados de casos terminais
- `proposto`, `aceito`, `rejeitado`, `aplicado` e `expirado` são estados em nível de evento
- novas ações de retenção só são permitidas enquanto o caso estiver ativo
- estados de casos terminais não permitem novas ofertas ou retorno ao fluxo ativo
