# Reordenar: especificações de entrada do acionador de cancelamento e retenção

Este documento cobre a etapa `2.5.1` de `documentation/implementation_plan.md`.

Objetivo:
- definir quando uma assinatura deve entrar em `Cancelamento e Retenção`
- definir se o fluxo inicia apenas a partir de uma ação do Admin ou também a partir de triggers de domínio
- definir se cada intenção de cancelamento cria um `CancellationCase`
- definir se o cancelamento final direto pode contornar o fluxo de casos

Esta especificação se baseia em:
- `reordenar/docs/specs/subscriptions/domain-model.md`
- `reordenar/docs/specs/renewals/source-of-truth-semantics.md`
- `reordenar/docs/specs/dunning/source-of-truth-semantics.md`
- `reorder/docs/architecture/subscriptions.md`
- `reorder/docs/architecture/dunning.md`

A orientação segue os padrões do Medusa:
- processos operacionais com várias etapas devem utilizar registros explícitos do domínio, em vez de um estado implícito restrito à interface do usuário
- os fluxos de trabalho continuam sendo o limite de mutação, enquanto os módulos são responsáveis pelo estado do processo
- as áreas operacionais voltadas para a administração devem utilizar uma semântica explícita de entrada no processo
- resultados destrutivos, como o cancelamento definitivo, devem permanecer auditáveis e respaldados por fluxos de trabalho

Status da implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte de referência oficial, na fase de projeto, para os limites de acionamento da futura área

## 1. Definição de gatilho

O processo de `Cancelamento e Retenção` só é iniciado quando um usuário administrador inicia explicitamente um processo de cancelamento de uma assinatura.

Em termos práticos:
- o gatilho é uma ação manual do administrador
- a ação representa uma intenção consciente de cancelamento
- o fluxo é iniciado antes que o cancelamento definitivo seja aplicado à assinatura

O `Cancelamento e Retenção` não é iniciado automaticamente a partir de eventos de domínio do lado do sistema no MVP.

## 2. Limite de responsabilidade

As quatro áreas têm responsabilidades distintas:

- `Assinaturas` é responsável pelo estado do ciclo de vida da assinatura e pelos dados operacionais da assinatura
- `Renovações` é responsável pela execução do ciclo de renovação e pelo estado de aprovação
- `Cobrança` é responsável pela recuperação de pagamentos de renovação com falha
- `Cancelamento e Retenção` é responsável pelo processo de desativação e retenção assim que um operador inicia o tratamento do cancelamento

Isso significa que:
- nem toda alteração no ciclo de vida é registrada em `Cancelamento e Retenção`
- `Cancelamento e Retenção` não é um grupo genérico de eventos para problemas relacionados a assinaturas
- o evento de origem para `Cancelamento e Retenção` é uma intenção explícita de cancelamento por parte do administrador

## 3. Apenas entrada manual pelo administrador

No MVP, o campo `Cancelamento e Retenção` deve ser preenchido apenas por meio de uma ação manual do administrador.

Fontes de acionamento recomendadas:
- ação de cancelamento da lista de assinaturas
- ação de cancelamento da página de detalhes da assinatura
- qualquer ponto de entrada dedicado do Admin, a ser implementado no futuro, explicitamente identificado como o início do processamento do cancelamento

Não são válidos como gatilhos automáticos no MVP:
- falha na renovação por si só
- `DunningCase` aberto ou terminal
- decisões do agendador
- webhooks
- heurísticas de inatividade do cliente
- tarefas de pontuação de rotatividade ou de recomendação

Fundamentação:
- o recurso foi projetado como um fluxo de trabalho do operador, e não como um mecanismo automático de ciclo de vida
- o processo requer intervenção humana deliberada, como `motivo`, notas, revisão de recomendações e seleção do resultado
- a inserção automática misturaria recuperação, análise de rotatividade e aplicação do ciclo de vida antes que as regras do domínio estivessem totalmente definidas

## 4. Toda solicitação de cancelamento deve ser tratada como um caso

Toda intenção explícita de cancelar uma assinatura deve criar ou reutilizar um `CancellationCase`.

Decisão final:
- cada solicitação de cancelamento entra no fluxo de casos
- o sistema cria um novo `CancellationCase` ativo quando não houver nenhum
- se já existir um caso ativo para a assinatura, o operador deve dar continuidade a esse caso, em vez de abrir outro

Isso significa que:
- `CancellationCase` é o registro de processo obrigatório para o tratamento de cancelamentos
- o caso não é um metadado opcional relacionado ao cancelamento
- o caso é o registro permanente que registra a jornada do operador

## 5. O cancelamento direto não deve ignorar o caso

O cancelamento final sem retenção ainda deverá passar por `CancellationCase`.

Isso significa:
- não há fluxo de cancelamento direto separado fora do processo de caso no design de destino `Cancelamento e Retenção`
- mesmo quando o operador sabe que deseja cancelar imediatamente, o processo ainda abre ou usa um caso primeiro
- o cancelamento final torna-se um resultado do caso, não um caminho paralelo

Raciocínio:
- o objetivo do produto requer rastreamento:
  - motivos de cancelamento
  - recomendações de retenção
  - ações de salvamento aceitas ou rejeitadas
  - resultados finais de rotatividade
- ignorar o caso criaria lacunas de análise e auditoria
- uma entrada de processo consistente mantém o Admin UX previsível e alinhado com outros fluxos de casos operacionais no plugin

## 6. Por que a entrada baseada em caso é preferida

`Cancelamento e Retenção` não é apenas uma mutação de status em `Assinatura`.

É um fluxo de trabalho operacional de várias etapas que pode incluir:
- registrando o motivo da rotatividade
- decidir se deve oferecer uma pausa
- decidir se deve oferecer desconto ou retenção de bônus
- aplicando uma ação de salvar
- finalizar o cancelamento se a retenção não for bem-sucedida

Isso está mais próximo do papel desempenhado por `DunningCase` do que das mutações diretas do ciclo de vida em `Subscrições`.

Por que um caso dedicado é preferido:
- o processo tem seu próprio histórico e resultado, separados do status bruto da assinatura
- o processo precisa de uma fonte durável de verdade para decisões de retenção
- O administrador precisa de tratamento auditável do estilo `quem/quando/por que` posteriormente no fluxo
- a análise de rotatividade deve ser baseada em casos explícitos de desligamento, e não inferida apenas de `Subscription.status = cancelled`

## 7. Estados de entrada de assinatura permitidos

Na fase de acionamento, o fluxo só deve começar para assinaturas que ainda sejam operacionalmente capazes de entrar no tratamento de cancelamento.

Estados elegíveis recomendados:
- `ativo`
- `pausado`
- `passado_vencido`

Não elegível:
- `cancelado`

Raciocínio:
- `ativo` e `pausado` são candidatos normais ao cancelamento gerenciado pelo operador
- `past_due` ainda pode exigir uma decisão de desligamento gerenciada pelo operador e não deve ser excluído por padrão
- `cancelado` já representa um resultado do ciclo de vida do terminal e não deve abrir um novo caso de cancelamento

## 8. Relacionamento com outras áreas

### 8.1 `Assinaturas`

`Assinaturas` continuam a possuir:
- estado do ciclo de vida no registro de assinatura
- campos como `cancelled_at` e `cancel_efficient_at`

`Cancelamento e Retenção` possui:
- o processo que leva ao resultado `pausado`, `retido` ou `cancelado`
- histórico de decisões de captura e retenção de motivos

Isso significa:
- `Assinatura` continua sendo a fonte da verdade para o status final do ciclo de vida
- `CancellationCase` se torna a fonte da verdade para o processo de tratamento de cancelamento

### 8.2 `Renovações`

`Renovações` não abrem automaticamente `CancellationCase` no MVP.

Mesmo que o comportamento de renovação posteriormente influencie as recomendações do operador:
- uma renovação falhada ou bloqueada não é em si um gatilho de cancelamento
- o operador ainda deve iniciar explicitamente o tratamento do cancelamento

### 8.3 `Cobrança`

`Dunning` não abre automaticamente `CancellationCase` no MVP.

Mesmo que uma assinatura esteja `passada_vencida` ou tenha um processo de cobrança ativo:
- isso por si só não cria um caso de cancelamento
- o operador ainda deve inserir explicitamente o tratamento de cancelamento

Isso mantém:
- recuperação de pagamento
- execução de renovação
- tratamento de rotatividade

como fluxos operacionais separados com semântica de caso separada.

## 9. Tempo de disparo

`Cancelamento e Retenção` deve começar antes de qualquer mutação de cancelamento final ser aplicada à assinatura.

Na semântica do MVP:
- o operador expressa intenção de cancelamento
- o sistema cria ou reutiliza um `CancellationCase`
- o caso se torna o registro do processo para o fluxo restante
- um fluxo de trabalho posterior pode aplicar a retenção ou finalizar o cancelamento

Isso preserva limites limpos:
- o caso existe antes do resultado da assinatura do terminal
- o processo de cancelamento permanece auditável de ponta a ponta
- o cancelamento final torna-se um resultado possível do caso, e não o próprio gatilho de entrada

## 10. Decisão sumária

O limite de gatilho para MVP é:

- `Cancelamento e retenção` começa apenas a partir da intenção explícita do administrador
- não inicia a partir de gatilhos automáticos de domínio
- toda intenção de cancelamento cria ou reutiliza um `CancellationCase`
- o cancelamento final sem retenção ainda passa pelo caso

Isto dá à área futura uma forma operacional clara:
- um ponto de entrada deliberado
- um registro de processo durável
- um lugar para capturar o "motivo", as decisões de retenção e o resultado final da rotatividade
