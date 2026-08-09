# Reordenar: especificações do modelo de domínio de cancelamento e retenção

Este documento cobre as etapas `2.5.3`, `2.5.4`, `2.5.5` e `2.5.6` de `documentation/implementation_plan.md`.

Objetivo:
- definir o contrato de domínio para `CancellationCase`
- definir o contrato de domínio para `RetentionOfferEvent`
- definir a taxonomia e a semântica de `reason_category`
- definir a semântica das ações de retenção
- decidir quais dados pertencem aos campos regulares do modelo
- decidir quais dados devem permanecer fora do agregado e passar para registros históricos futuros
- fornecer uma base estável para fluxos de trabalho, leituras administrativas e histórico posterior de ofertas de retenção

Esta especificação se baseia em:
- `reordenar/docs/specs/cancellation-retention/trigger-entry.md`
- `reordenar/docs/specs/cancellation-retention/source-of-truth-semantics.md`
- `reordenar/docs/specs/subscriptions/domain-model.md`
- `reordenar/docs/specs/dunning/domain-model.md`

O design segue os padrões da Medusa:
- um módulo personalizado deve possuir um agregado operacional explícito
- os campos usados para filtragem, classificação e transições de estado devem ser armazenados explicitamente
- o histórico somente de acréscimo deve ser modelado separadamente do estado agregado quando tiver seu próprio ciclo de vida
- JSON é apropriado para `metadados`, não para máquina de estado primária ou campos de relatório

Status de implementação:
- `Cancelamento e Retenção` ainda não foi implementado
- este documento é a fonte da verdade em tempo de design para o contrato de domínio `CancellationCase`

## 1. Suposições arquitetônicas

A área `Cancelamento & Retenção` possui dois níveis conceituais:

- `Caso de cancelamento`
- `RetentionOfferEvent`

`CancellationCase` é o registro operacional primário que será persistido no futuro módulo de cancelamento.

`RetentionOfferEvent` será o registro do histórico filho persistido separadamente do caso em uma etapa posterior.

Na prática:
- um caso representa um cancelamento gerenciado pela operadora ou uma jornada de economia de fluxo para uma assinatura
- um caso pode ter zero ou mais eventos futuros de oferta de retenção
- um caso agrega o estado atual do processo e o resumo final do processo
- eventos de oferta de retenção preservam o histórico de decisões somente anexados

Esta divisão é intencional:
- o caso é o agregado de processo e decisão
- os registros de eventos futuros são a trilha de auditoria de ações e decisões individuais de salvamento

## 2. Limites de responsabilidade

### `Caso de cancelamento`

`CancellationCase` é responsável por:
- identificar a assinatura que está entrando no tratamento de cancelamento
- armazenar o estado atual do ciclo de vida do processo de tratamento de cancelamento
- armazenar o motivo da rotatividade e a classificação da rotatividade
- armazenar notas do operador e estado de recomendação
- armazenar o resumo do resultado do terminal
- armazenar campos de conveniência atuais usados pelo administrador e fluxos de trabalho

`CancellationCase` não é responsável por:
- o estado completo do ciclo de vida da assinatura
- o histórico completo de ofertas e decisões de retenção
- estado de recuperação de pagamento
- estado de execução do ciclo de renovação

### `RetentionOfferEvent`

`RetentionOfferEvent` é responsável por:
- armazenar uma proposta concreta de oferta de retenção ou salvar registro de ação
- registrar carimbos de data e hora de decisão e aplicação
- preservando o histórico de auditoria por oferta

`RetentionOfferEvent` não é responsável por:
- ser a fonte da verdade para o status do caso
- substituindo o estado agregado armazenado em `CancellationCase`
- possuir o status do ciclo de vida final da assinatura

## 3. Por que é preferível um histórico futuro agregado e separado

A estrutura de domínio recomendada usa:
- uma entidade primária agora: `CancellationCase`
- uma entidade de histórico filho posteriormente: `RetentionOfferEvent`

Por que isso é preferido:
- o estado do processo e o histórico da oferta são preocupações diferentes
- A lista de administradores e os detalhes do administrador precisarão de requisitos de leitura diferentes
- múltiplas ofertas ou tentativas de salvamento não devem substituir um campo mutável
- a filtragem em nível de caso permanece simples
- a auditoria em nível de oferta pode permanecer apenas anexada e explícita

Alternativa rejeitada:
- armazenar todo o histórico de ofertas de retenção apenas em `CancellationCase.metadata`

Por que é pior:
- mais difícil de inspecionar operacionalmente
- auditabilidade mais fraca
- renderização de linha do tempo mais difícil
- menos alinhado com o padrão estabelecido de `Renovações` e `Dunning`

## 4. Contrato de domínio `CancellationCase`

Contrato de domínio mínimo:

- `id`
- `subscrição_id`
- `estado`
- `razão`
- `razão_categoria`
- `notas`
- `ação_recomendada`
- `resultado_final`
- `finalizado_em`
- `finalizado_por`
- `cancelamento_efetivo_em`
- `metadados`

### Forma lógica proposta

```ts
type CancellationCase = {
  id: string
  subscription_id: string
  status:
    | "requested"
    | "evaluating_retention"
    | "retention_offered"
    | "retained"
    | "paused"
    | "canceled"
    | "closed"
  reason: string | null
  reason_category:
    | "price"
    | "product_fit"
    | "delivery"
    | "billing"
    | "temporary_pause"
    | "switched_competitor"
    | "other"
    | null
  notes: string | null
  recommended_action:
    | "pause_offer"
    | "discount_offer"
    | "bonus_offer"
    | "direct_cancel"
    | null
  final_outcome:
    | "retained"
    | "paused"
    | "canceled"
    | "abandoned"
    | null
  finalized_at: string | null
  finalized_by: string | null
  cancellation_effective_at: string | null
  metadata: Record<string, unknown> | null
}
```

## 5. Campos regulares `CancellationCase`

Os seguintes campos devem ser colunas de modelo regulares:

- `id`
- `subscrição_id`
- `estado`
- `razão`
- `razão_categoria`
- `notas`
- `ação_recomendada`
- `resultado_final`
- `finalizado_em`
- `finalizado_por`
- `cancelamento_efetivo_em`

Por quê:
- eles são necessários para filtragem e classificação do administrador
- eles são necessários para transições de estado operacional
- eles são necessários para finalização e resumo de auditoria
- eles expressam o estado explícito do processo em vez da configuração flexível

## 6. Por que `subscription_id` deve ser um campo escalar

O modelo deve armazenar:

- `subscrição_id`

como um campo escalar explícito.

Por quê:
- simplifica a filtragem e indexação
- simplifica consultas administrativas e de fluxo de trabalho
- preserva o mesmo padrão prático Medusa já usado em `Assinaturas`, `Renovações` e `Dunning`
- links de módulos ainda podem ser adicionados posteriormente sem perder o acesso eficiente ao registro de origem

## 7. `status`

`status` é o campo da máquina de estado em nível de caso.

Ele responde:
- qual é o estado operacional atual do processo de tratamento de cancelamentos

Deve ser um campo enum escalar, não JSON.

Por quê:
- o status do caso impulsionará a elegibilidade do fluxo de trabalho
- o status do caso orientará as ações do administrador
- o status do caso é um campo primário de filtragem e classificação

As regras exatas de transição pertencem a uma etapa posterior, mas o contrato de domínio deve reservar estes valores:

- `solicitado`
- `avaliando_retenção`
- `retenção_oferecida`
- `retido`
- `pausado`
- `cancelado`
- `fechado`

## 8. `razão`

`motivo` é o motivo comercial no nível do caso inserido ou selecionado para esta jornada de cancelamento.

Deve ser um campo de texto anulável regular.

Por quê:
- o processo pode começar antes que o operador registre o motivo
- o campo ainda faz parte do contrato comercial principal e não deve ser incluído nos metadados
- Detalhes do administrador, filtragem, exportações de relatórios e visualizações de auditoria podem precisar de acesso direto posteriormente

Nota importante:
- `motivo` não é a categoria de relatório normalizada
- que pertence a `reason_category`

## 9. `motivo_categoria`

`reason_category` é a classificação normalizada do motivo do churn.

Deve ser um campo enum escalar, não JSON.

Por quê:
- A lista de administradores e as análises precisarão de filtragem estruturada
- a categoria normalizada não deve ser inferida posteriormente do texto de formato livre
- este campo pertence ao contrato do processo, não aos metadados flexíveis

Valores iniciais recomendados:
- `preço`
- `produto_ajuste`
- `entrega`
- `faturamento`
- `pausa_temporária`
- `switched_competitor`
- `outro`

A taxonomia pode evoluir numa etapa posterior dedicada, mas o contrato de domínio já deve tratar isto como um campo estruturado de primeira classe.

## 10. Decisão de taxonomia `reason_category`

Para MVP, `reason_category` deve ser uma predefinição fixa ou enum em `CancellationCase`, não um dicionário gerenciado pelo administrador.

### Decisão final

Abordagem recomendada:
- mantenha `reason_category` como uma predefinição estável no agregado
- manter `razão` como campo de apoio de texto livre
- não introduza um módulo separado de configurações de motivo no MVP

Por que isso é preferido:
- a ramificação do fluxo de trabalho precisa de valores estáveis e previsíveis
- Filtros administrativos e relatórios precisam de uma taxonomia pequena e consultável
- adicionar um dicionário gerenciado pelo administrador introduziria um domínio de configurações separado e uma superfície CRUD sem ser necessário para o fluxo de cancelamento do MVP
- isso mantém o modelo alinhado com o estilo atual do plugin, onde os campos operacionais primários são explícitos e estáveis

### Por que não um dicionário gerenciado pelo administrador no MVP

Um dicionário de motivos gerenciado pelo administrador só faria sentido se o produto precisasse explicitamente de:
- uma área de configurações configuráveis
- catálogos de motivos específicos do inquilino
- regras de localização ou rotulagem independentes da lógica do processo
- mudanças freqüentes no catálogo de motivos pelas operadoras

Isso está mais próximo dos conceitos de motivos gerenciados da Medusa, como motivos de reembolso ou devolução.

Para o escopo atual do plugin:
- `Cancelamento e Retenção` ainda está definindo seu contrato de processo principal
- a escolha menor e mais estável é uma taxonomia predefinida

## 11. Categorias operacionais versus categorias de relatórios

O MVP deve usar uma taxonomia compartilhada, mas as categorias ainda podem ter diferentes funções práticas.

### Categorias operacionalmente significativas

Estas categorias podem influenciar a recomendação do fluxo de trabalho ou a orientação do operador:

- `preço`
- `produto_ajuste`
- `entrega`
- `faturamento`
- `pausa_temporária`

Por quê:
- eles mapeiam naturalmente diferentes estratégias de salvamento, como pausa, desconto ou cancelamento direto
- eles podem posteriormente apoiar heurísticas de recomendação em `cancelamento inteligente`

### Categorias voltadas principalmente para relatórios

Estas categorias ainda são valores agregados válidos, mas são menos propensos a exigir lógica de ramificação especial:

- `switched_competitor`
- `outro`

Por quê:
- eles são importantes para análises de rotatividade
- eles podem não precisar de regras de recomendação dedicadas no MVP

### Regra de modelagem importante

Isso não requer dois campos diferentes.

Regra recomendada:
- um campo: `reason_category`
- uma taxonomia predefinida compartilhada
- diferentes fluxos de trabalho e semânticas de relatórios são aplicados por regras de negócios, e não pela divisão do modelo

## 12. Relacionamento entre `razão` e `razão_categoria`

`reason_category` e `reason` devem ter responsabilidades separadas.

### `categoria_motivo`

`reason_category` responde:
- a que classe de rotatividade este caso pertence

É o campo que deve conduzir:
- Filtros de administração
- relatórios agrupados
- Agregação de KPI
- ramificação do fluxo de trabalho e heurísticas de recomendação posteriormente

### `razão`

`razão` responde:
- o que o operador ou cliente realmente disse neste caso específico

É o campo que deve apoiar:
- contexto qualitativo
- auditabilidade
- legibilidade da página de detalhes
- comentários em nível de exportação

A `razão` não deve ser tratada como a principal fonte de relatórios estruturados.

## 13. Regra de relatório para `motivo` em texto livre

Os relatórios devem ser baseados principalmente em `reason_category`, não na análise de `reason`.

### Decisão final

Regra recomendada:
- operadores selecionam `reason_category`
- os operadores podem fornecer opcionalmente ou condicionalmente o `motivo`
- reportar agregados em `reason_category`
- a “razão” em texto livre permanece apoiando o contexto qualitativo

Por que isso é preferido:
- analisar o texto em categorias posteriormente é frágil
- as análises tornam-se instáveis quando dependem do texto
- O design operacional no estilo Medusa favorece campos estruturados explícitos para filtragem e relatórios

### Regra alternativa

Se a explicação do texto não for mapeada corretamente para a taxonomia predefinida:
- use `reason_category = outro`
- preservar a nuance na `razão`

Isso mantém o agregado estável, ao mesmo tempo que permite notas de caixa ricas.

## 14. `notas`

`notes` armazena o contexto do operador de formato livre para o caso.

Deve ser um campo de texto anulável regular.

Por quê:
- este é um contexto de negócios de propriedade do processo
- pode precisar de exibição direta em visualizações detalhadas
- não deve ser escondido dentro de metadados se for esperado que os operadores os revisem

## 15. `ação_recomendada`

`recommended_action` é o estado de recomendação atual para o caso.

Deve descrever o que o processo recomenda a seguir, e não o que já foi aplicado.

Deve ser um campo enum escalar, não JSON.

Valores recomendados:
- `pausa_oferta`
- `oferta_desconto`
- `bonus_offer`
- `cancelamento_direto`

Por quê:
- a recomendação faz parte do estado de decisão atual do agregado
- os fluxos de trabalho e a interface do administrador podem precisar ser ramificados
- não são metadados técnicos flexíveis

Nota importante:
- o histórico real da oferta e as ações aplicadas devem residir posteriormente em `RetentionOfferEvent`
- `recommended_action` não substitui esse histórico

## 16. Semântica da ação de retenção

As ações de retenção devem ser entendidas em dois níveis semânticos distintos:

- estado de recomendação em `CancellationCase`
- oferta concreta ou instantâneo de ação em `RetentionOfferEvent`

### Estado de recomendação

`CancellationCase.recommended_action` responde:
- qual ação o processo recomenda a seguir

Isso não significa:
- uma oferta já foi construída
- o cliente aceitou qualquer coisa
- a ação já foi aplicada à assinatura

### Oferta concreta ou instantâneo de ação

`RetentionOfferEvent` responde:
- que oferta concreta ou ação de salvamento foi proposta
- que carga útil continha
- que decisão foi tomada sobre isso
- se e quando foi aplicado

Isso significa:
- a recomendação é uma orientação em nível agregado
- o evento é o instantâneo da ação de negócios persistente

Esta divisão é preferida porque corresponde ao mesmo padrão já estabelecido no plugin:
- a raiz agregada armazena o estado atual do processo
- o registro do histórico filho armazena a execução concreta ou o histórico de decisões

## 17. `pause_offer`

### Semântica

`pause_offer` significa:
- propor pausar a assinatura em vez de cancelá-la
- manter vivo o relacionamento com o cliente enquanto interrompe temporariamente o ciclo de vida recorrente ativo

É uma ação de retenção, não apenas uma alternância direta do ciclo de vida de `Assinaturas`.

Significado comercial:
- o cliente não está pronto para continuar agora
- mas o objetivo é evitar a rotatividade total em vez de finalizar o cancelamento

### Nível de recomendação

Como recomendação:
- `recommended_action = pause_offer` significa que o processo atualmente considera a pausa como a melhor próxima opção de salvamento

### Nível de oferta concreto

Como um evento concreto:
- a oferta deve ser representada por um `RetentionOfferEvent`
- a carga útil deve conter parâmetros específicos de pausa, como:
  - número de ciclos de pausa, ou
  - data de currículo,
  - nota opcional

### Restrições

Restrições recomendadas:
- não proponha `pause_offer` para uma assinatura `cancelada`
- não trate uma assinatura já "pausada" como um novo alvo normal de oferta de retenção de pausa
- a aplicação de `pause_offer` deve se materializar posteriormente por meio de um fluxo de trabalho no estado do ciclo de vida da assinatura
- `pause_offer` não deve alterar a política comercial global como `PlanOffer`

## 18. `oferta_desconto`

### Semântica

`oferta_desconto` significa:
- propor uma concessão temporária de preços para manter o cliente inscrito

Significado comercial:
- o cliente pode continuar se o custo se tornar mais aceitável
- esta é uma medida de retenção no escopo do caso, não uma alteração no catálogo global de ofertas de assinatura

### Nível de recomendação

Como recomendação:
- `recommended_action = desconto_oferta` significa que o processo atualmente considera uma concessão de preço a melhor próxima opção de economia

### Nível de oferta concreto

Como um evento concreto:
- a oferta deve ser representada por um `RetentionOfferEvent`
- a carga útil deve conter parâmetros específicos de desconto, como:
  - tipo de desconto
  - valor de desconto
  - duração em ciclos
  - nota opcional

### Restrições

Restrições recomendadas:
- o desconto deve ser temporário e com escopo explícito
- o desconto não deve substituir ou alterar os `Planos e Ofertas` globais
- o desconto deve ser validado em relação a proteções posteriores, como desconto de retenção máximo permitido
- a carga útil do evento deve ser explícita, em vez de inferida posteriormente a partir do estado de recomendação do caso

## 19. `bonus_offer`

### Semântica

`bonus_offer` significa:
- propor um benefício sem preço ou sem pausa para manter o cliente inscrito

Significado comercial:
- o cliente pode continuar se receber uma proposta de valor extra
- isso pode incluir benefícios como ciclo gratuito, crédito, presente ou bônus semelhante no escopo do caso

### Nível de recomendação

Como recomendação:
- `recommended_action = bonus_offer` significa que o processo atualmente considera um benefício extra a melhor próxima opção de salvamento

### Nível de oferta concreto

Como um evento concreto:
- a oferta deve ser representada por um `RetentionOfferEvent`
- a carga útil deve conter parâmetros específicos do bônus, como:
  - tipo de bônus
  - valor ou rótulo descritivo
  - duração opcional
  - nota opcional

### Restrições

Restrições recomendadas:
- o bônus deve ser explicitamente descrito na carga útil
- o bônus deve permanecer no escopo do caso e auditável
- o bônus não deve alterar a fonte da verdade da política de assinatura global
- o evento deverá preservar exatamente o benefício proposto no momento da oferta

## 20. Restrições compartilhadas para ações de retenção

As seguintes regras devem ser aplicadas a todas as ações de retenção:

- uma recomendação sobre `CancellationCase` nunca é suficiente por si só para contar como uma oferta concreta
- cada ação concreta de salvamento deve ser armazenada como um `RetentionOfferEvent` separado
- aceitação e aplicação são conceitos separados
- `applied_at` deve significar apenas que um efeito comercial real foi materializado
- as ações de retenção não devem substituir silenciosamente a propriedade de `DunningCase` ou `RenewalCycle`
- o impacto do ciclo de vida deve ser materializado posteriormente por meio de alterações baseadas no fluxo de trabalho em `Assinatura`

## 21. Limite com outros domínios

As ações de retenção devem permanecer no escopo de `Cancelamento e Retenção`.

Eles não devem substituir a propriedade de:
- `Assinaturas` para o estado final do ciclo de vida
- `Planos e Ofertas` para política de ofertas globais
- `Renovações` para execução de ciclo
- `Dunning` para recuperação de pagamento

Isso significa:
- ações de retenção são ações de salvamento no escopo do caso
- não são a nova fonte de verdade para a política comercial recorrente
- eles não são proprietários do estado do ciclo de vida de renovação ou cobrança

## 22. `resultado_final`

`final_outcome` é o resumo comercial terminal do caso.

É separado do `status`.

`status` responde:
- onde o processo está agora

`final_outcome` responde:
- como o processo finalmente terminou

Deve ser um campo enum escalar, não JSON.

Valores recomendados:
- `retido`
- `pausado`
- `cancelado`
- `abandonado`

Por quê:
- relatórios e revisão administrativa precisam de um campo de resultado terminal direto
- o estado atual do processo e o resultado final do negócio não devem ser resumidos em um único campo
- isso corresponde ao padrão geral de manter o estado agregado e o resumo final distintos

## 23. `finalized_at` e `finalized_by`

Estes são campos de auditoria de finalização em nível de caso.

Devem ser colunas escalares regulares.

Por quê:
- pertencem ao resumo terminal do agregado
- Detalhes do administrador e filtragem posterior podem precisar deles diretamente
- eles não devem ser enterrados nos metadados se fizerem parte do contrato do processo principal

## 24. `cancelamento_efetivo_em`

`cancellation_efficient_at` é o tempo efetivo no nível do processo escolhido para o resultado final do cancelamento.

Deve ser um campo regular de data e hora anulável.

Por quê:
- é uma decisão comercial de primeira classe do processo de cancelamento
- pode ser necessário no detalhe do caso e na lógica do fluxo de trabalho
- deve permanecer explícito e questionável

Nota importante:
- este campo representa o ponto de decisão em nível de caso
- não substitui `Subscription.cancel_efficient_at`
- fluxos de trabalho posteriores podem materializar esse valor no estado do ciclo de vida da assinatura quando o cancelamento final for aplicado

## 25. `metadados`

`metadados` continua sendo um campo JSON padrão.

Por quê:
- segue o padrão Medusa para dados extras não essenciais
- pode armazenar auditoria suplementar ou contexto técnico
- não deve armazenar campos necessários para filtragem primária, classificação ou transições de estado

## 26. Contrato de domínio `RetentionOfferEvent`

Contrato de domínio mínimo:

- `id`
- `cancelamento_caso_id`
- `tipo_oferta`
- `offer_payload`
- `status_decisão`
- `motivo_decisão`
- `decidiu_em`
- `decidido_por`
- `aplicado_em`
- `metadados`

### Forma lógica proposta

```ts
type RetentionOfferEvent = {
  id: string
  cancellation_case_id: string
  offer_type: "pause_offer" | "discount_offer" | "bonus_offer"
  offer_payload: {
    pause_offer?: {
      pause_cycles: number | null
      resume_at: string | null
      note: string | null
    }
    discount_offer?: {
      discount_type: "percentage" | "fixed"
      discount_value: number
      duration_cycles: number | null
      note: string | null
    }
    bonus_offer?: {
      bonus_type: "free_cycle" | "gift" | "credit"
      value: number | null
      label: string | null
      duration_cycles: number | null
      note: string | null
    }
  } | null
  decision_status: "proposed" | "accepted" | "rejected" | "applied" | "expired"
  decision_reason: string | null
  decided_at: string | null
  decided_by: string | null
  applied_at: string | null
  metadata: Record<string, unknown> | null
}
```

## 27. Campos regulares `RetentionOfferEvent`

Os seguintes campos devem ser colunas de modelo regulares:

- `id`
- `cancelamento_caso_id`
- `tipo_oferta`
- `status_decisão`
- `motivo_decisão`
- `decidiu_em`
- `decidido_por`
- `aplicado_em`

Por quê:
- eles são necessários para leituras de cronograma e histórico de auditoria
- eles são necessários para renderização de detalhes do administrador e filtragem posterior
- eles expressam estado de evento explícito em vez de configuração flexível

## 28. Por que `cancellation_case_id` deve ser um campo escalar

O modelo deve armazenar:

- `cancelamento_caso_id`

como um campo escalar explícito.

Por quê:
- simplifica a filtragem e indexação
- simplifica as consultas da linha do tempo para um caso
- preserva o mesmo padrão prático já utilizado por `RenewalAttempt` e `DunningAttempt`
- relações posteriores do mesmo módulo ainda podem ser definidas sem perder o acesso eficiente ao registro de origem

## 29. `tipo_oferta`

`offer_type` identifica que tipo de ação de salvamento este evento representa.

Deve ser um campo enum escalar, não JSON.

Valores recomendados:
- `pausa_oferta`
- `oferta_desconto`
- `bonus_offer`

Por quê:
- o cronograma do evento e os detalhes do administrador precisam de um discriminador de tipo direto
- o formato da carga útil depende do tipo de oferta
- relatórios e filtragem não devem inferir o tipo da estrutura JSON

Nota importante:
- `direct_cancel` não deve fazer parte de `RetentionOfferEvent`
- o cancelamento direto é um caminho de processo em nível de caso, não uma oferta de retenção

## 30. `offer_payload`

`offer_payload` é o instantâneo estruturado da oferta concreta proposta neste evento.

Deve ser armazenado como JSON.

Por quê:
- o formato da carga útil varia de acordo com `offer_type`
- o campo representa um objeto de negócios estruturado
- dividi-lo em muitas colunas escalares anuláveis tornaria o modelo mais difícil de evoluir e mais difícil de raciocinar

Nota importante:
- esta carga útil é um instantâneo da oferta proposta no momento do evento
- não deve ser reconstruído posteriormente a partir do estado de recomendação atual ou das regras de negócios atuais

## 31. `status_decisão`

`decision_status` é o estado de decisão em nível de evento para uma proposta de oferta concreta.

Deve ser um campo enum escalar, não JSON.

Valores recomendados:
- `proposto`
- `aceito`
- `rejeitado`
- `aplicado`
- `expirado`

Por quê:
- o evento precisa de seu próprio ciclo de vida separado do agregado do caso
- Os detalhes do administrador mostrarão posteriormente um cronograma de propostas e seus resultados
- este campo deve permanecer diretamente consultável e auditável

Nota importante:
- `decision_status` não é o mesmo que `CancellationCase.status`
- descreve um evento de oferta, não toda a jornada de cancelamento

## 32. `motivo_decisão`

`decision_reason` armazena a razão por trás do resultado deste evento concreto.

Deve ser um campo de texto anulável regular.

Por quê:
- o operador pode precisar explicar por que uma oferta foi aceita, rejeitada ou expirada
- o campo pertence ao contrato do evento, não aos metadados flexíveis

Nota importante:
- `decision_reason` não é o mesmo que o `reason` de rotatividade em `CancellationCase`
- `CancellationCase.reason` explica por que a assinatura entrou no tratamento de cancelamento
- `decision_reason` explica por que um evento de oferta específico terminou daquela maneira

## 33. `decidiu_em`, `decidiu_por` e `aplicado_em`

Esses são campos de auditoria e materialização em nível de evento.

Devem ser colunas escalares regulares.

Por quê:
- uma decisão e um pedido podem acontecer em momentos diferentes
- Os detalhes do administrador e o histórico de auditoria devem poder mostrar ambos os momentos diretamente
- esses carimbos de data/hora são campos de processo de primeira classe, não metadados

### `decidiu_em`

Representa:
- quando o evento passou de proposta para um estado de decisão, como aceito ou rejeitado

### `decidido_por`

Representa:
- quem tomou a decisão sobre o evento de oferta

### `aplicado_em`

Representa:
- quando a oferta aceita foi efetivamente materializada em um efeito comercial

Isto é intencionalmente separado de `decided_at`.

## 34. `metadados`

`metadados` continua sendo um campo JSON padrão.

Por quê:
- segue o padrão Medusa para dados extras não essenciais
- pode armazenar contexto técnico ou de auditoria suplementar
- não deve armazenar campos necessários para filtragem primária, classificação ou transições de estado de evento

## 35. O que deve ficar fora de `RetentionOfferEvent`

Os dados a seguir não devem ser armazenados como campos mutáveis ​​principais em `RetentionOfferEvent`:

- o agregado `CancellationCase.status`
- o agregado `CancellationCase.final_outcome`
- o estado do ciclo de vida da assinatura
- estado de nova tentativa de cobrança
- estado de execução da renovação

Por quê:
- estes pertencem a outros agregados
- duplicá-los enfraqueceria os limites da fonte da verdade já definidos em `2.5.2`

## 36. O que deve ficar fora de `CancellationCase`

Os seguintes dados não devem ser armazenados como campos mutáveis ​​principais em `CancellationCase`:

- histórico de oferta de retenção somente anexado
- cronograma de decisão completo para cada oferta
- status atual do ciclo de vida da assinatura como um campo duplicado
- estado de nova tentativa de cobrança
- estado de execução da renovação

Por quê:
- estes pertencem a outros agregados ou ao futuro `RetentionOfferEvent`
- duplicá-los enfraqueceria os limites da fonte da verdade já definidos em `2.5.2`

## 37. Implicações da consulta

### Os campos diretos devem suportar:

- Filtragem da lista de administradores por `status`
- Filtragem da lista de administradores por `reason_category`
- Filtragem da lista de administradores por `final_outcome`
- classificação por carimbos de data e hora de criação e finalização
- pesquisa em nível de caso por `subscription_id`
- pesquisa na linha do tempo do evento por `cancellation_case_id`
- ordenação em nível de evento por `decided_at` e `applied_at` posteriormente em visualizações detalhadas

### `metadados` não devem ser usados ​​para:

- filtros de administração primários
- transições de estado atual
- campos críticos para relatórios

Isso mantém o modelo de leitura futura alinhado com os mesmos princípios já usados ​​em `Assinaturas`, `Renovações` e `Dunning`.
