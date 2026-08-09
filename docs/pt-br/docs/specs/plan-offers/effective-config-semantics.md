# Reordenar: planos e ofertas de especificações de semântica de configuração eficazes

Este documento cobre a etapa `2.2.4` de `documentation/implementation_plan.md`.

Objetivo:
- definir como a oferta final é resolvida para uma variante e para uma assinatura
- definir o que conta como registro de origem
- definir o que conta como candidato substituto
- definir o que a configuração efetiva resolvida representa
- definir como as leituras do administrador e os futuros fluxos de trabalho de assinatura devem usar a configuração resolvida

Esta especificação se baseia em:
- `reorder/docs/specs/plan-offers/admin-spec.md`
- `reorder/docs/specs/plan-offers/domain-model.md`
- `reorder/docs/specs/plan-offers/data-model-override.md`

## 1. Semântica central

A área `Plans & Offers` possui três conceitos distintos:

- registro de origem
- candidato substituto
- configuração efetiva resolvida

Esses conceitos não devem ser misturados.

### Registro de origem

Um registro de origem é um registro `PlanOffer` persistente que pode potencialmente definir a oferta de assinatura final.

Existem dois tipos de registro de origem válidos:
- um registro de origem em nível de produto
- um registro de origem em nível de variante

### Candidato substituto

Um candidato substituto é um registro de origem que não obteve a primeira prioridade, mas ainda pode se tornar a fonte final se o registro de prioridade mais alta estiver ausente ou inativo.

Na prática:
- para resolução de variantes, a fonte em nível de produto é a candidata substituta
- para resolução do produto, não há candidato substituto de prioridade mais baixa

### Configuração efetiva resolvida

A configuração efetiva resolvida é a configuração derivada final retornada pela camada de leitura após a resolução.

É:
- não é uma fonte persistente de verdade
- não é um registro editável
- não é um instantâneo de uma assinatura

É um resultado calculado com base nos registros de origem atualmente disponíveis.

## 2. Fonte da verdade

A única fonte de verdade persistente é `PlanOffer`.

`ProductSubscriptionConfig` é um estado derivado.

Isso significa:
- Operações de criação/edição/alternância do administrador modificam `PlanOffer`
- consultas e lógica de validação podem ser `ProductSubscriptionConfig`
- as assinaturas não devem manter uma referência ativa à configuração efetiva como seu estado comercial de longo prazo

## 3. Entradas de resolução

A resolução de configuração efetiva deve aceitar uma das duas entradas:

- contexto do produto
- contexto variante

### Contexto do produto

Contexto do produto significa:
- `product_id` é conhecido
- `variant_id` não faz parte da entrada de resolução

### Contexto variante

Contexto variante significa:
- `product_id` é conhecido
- `variant_id` é conhecido

O contexto variante é o caminho de resolução mais importante para a criação futura de assinaturas e validação de alterações de plano.

## 4. Configuração eficaz para contexto do produto

Ao resolver a configuração eficaz de um produto:

1. leia o registro de origem no nível do produto para `product_id`
2. se o registro existir e estiver habilitado, ele se tornará a configuração efetiva resolvida
3. se o registro não existir, não há configuração efetiva
4. se o registro existir, mas estiver desabilitado, não há configuração ativa efetiva

### Semântica de resultados do contexto do produto

Se existir uma origem válida no nível do produto:
- `source_scope = product`
- `source_offer_id = product record id`
- todos os campos efetivos vêm do registro de origem no nível do produto

Se não existir nenhuma fonte válida:
- `source_scope = null`
- `source_offer_id = null`
- o resultado está inativo ou vazio

## 5. Configuração eficaz para contexto variante

Ao resolver a configuração efetiva de uma variante:

1. leia o registro de origem em nível de variante para `variant_id`
2. se existir e estiver habilitado, ganha imediatamente
3. caso contrário, leia o registro de origem no nível do produto para `product_id`
4. Se o registro no nível do produto existir e estiver habilitado, ele se tornará a fonte substituta
5. caso contrário, não há configuração ativa e efetiva

### Semântica de resultados de contexto variante

Se o registro no nível da variante vencer:
- `source_scope = variant`
- `source_offer_id = variant record id`
- todos os campos efetivos vêm do registro de origem no nível da variante

Se o registro no nível do produto vencer:
- `source_scope = product`
- `source_offer_id = product record id`
- todos os campos efetivos vêm do registro de origem no nível do produto

Se nenhum deles vencer:
- `source_scope = null`
- `source_offer_id = null`
- o resultado está inativo ou vazio

## 6. Semântica de registro desativada

Os registros desativados são tratados como registros de origem inativos.

Isso significa:
- um registro de nível de variante desabilitado não pode obter resolução
- um registro de nível de produto desativado não pode obter resolução
- um registro desativado em nível de variante não bloqueia o substituto para um registro ativado em nível de produto

Isto é importante porque `is_enabled` expressa uma política ativa, não um estado de substituição de bloqueio.

## 7. Sem semântica de mesclagem

A configuração efetiva resolvida deve usar semântica de registro completo.

Isso significa:
- se o registro no nível da variante vencer, todos os campos de configuração finais virão desse registro no nível da variante
- se o registro no nível do produto vencer, todos os campos de configuração finais virão desse registro no nível do produto

Não apoiamos:
- mesclar frequências de produtos com descontos variantes
- herdar regras de produto enquanto substitui apenas um campo de variante
- mesclagem parcial entre dois registros de origem

Esta é uma restrição deliberada do MVP.

## 8. Contrato de saída de configuração eficaz

A saída resolvida deve ser mapeada para o contrato lógico de `ProductSubscriptionConfig`.

Resultado efetivo recomendado:

```ts
type ProductSubscriptionConfig = {
  product_id: string
  variant_id: string | null
  source_offer_id: string | null
  source_scope: "product" | "variant" | null
  is_enabled: boolean
  allowed_frequencies: SubscriptionFrequencyOption[]
  discount_per_frequency: SubscriptionDiscountPerFrequency[]
  rules: PlanOfferRules | null
}
```

### Semântica de campo

`product_id`
- identifica o contexto do produto do resultado

`variant_id`
- identifica o contexto variante do resultado quando aplicável

`source_offer_id`
- identifica o registro `PlanOffer` exato que produziu o resultado

`source_scope`
- identifica se o resultado veio da origem no nível do produto ou no nível da variante

`is_enabled`
- indica se a configuração resolvida está ativa e utilizável
- se não existir nenhuma fonte válida, isso deve resolver para `false`

`allowed_frequencies`
- frequências finais de cobrança permitidas

`discount_per_frequency`
- descontos finais correspondentes ao registo da fonte vencedora

`rules`
- regras de oferta final correspondentes ao registro de origem vencedor

## 9. Semântica de resultados vazios ou inativos

Se não existir nenhum registro de origem válido, o modelo de leitura ainda deverá ter semântica determinística.

Significado recomendado:
- `source_offer_id = null`
- `source_scope = null`
- `is_enabled = false`
- `allowed_frequencies = []`
- `discount_per_frequency = []`
- `rules = null`

Isso facilita a validação posterior do fluxo de trabalho porque “não existe oferta” pode ser representado como uma configuração inativa explícita.

## 10. Diferença entre detalhes de origem e detalhes efetivos

Estas são preocupações de leitura separadas:

### Detalhe da fonte

O detalhe da origem é o detalhe do administrador de um registro `PlanOffer` concreto.

Ele responde:
- o que foi explicitamente configurado neste registro
- a que alvo este registro pertence
- se este registro de origem está habilitado

### Detalhe eficaz

O detalhe efetivo é a configuração final resolvida para um contexto de produto ou variante.

Ele responde:
- qual configuração realmente se aplica agora
- se a configuração final veio da origem no nível do produto ou no nível da variante
- contra o que uma ação de assinatura futura deve validar

Admin pode exibir ambos, mas eles não devem ser tratados como o mesmo objeto.

## 11. Semântica administrativa

A lista de administradores para `Plans & Offers` deve permanecer baseada no registro de origem.

Significado:
- cada linha representa um `PlanOffer`
- classificação e filtragem aplicam-se aos registros de origem
- ações de linha editam, alternam ou inspecionam um registro de origem

A visualização de detalhes do administrador também pode mostrar:
- resumo de configuração eficaz resolvido
- proveniência da fonte
- informações alternativas

Mas o Admin ainda edita apenas o registro de origem.

## 12. Semântica de assinatura

As assinaturas devem consumir configuração efetiva no momento da decisão, não como uma dependência sempre ativa.

Existem dois momentos críticos:
- criação de assinatura
- mudança de plano de assinatura

Nesses momentos, o sistema deverá:
1. resolver a configuração efetiva para o produto ou variante solicitada
2. validar a frequência solicitada ou as suposições de desconto em relação à configuração efetiva
3. persistir um instantâneo de assinatura ou dados de atualização pendentes derivados da escolha aceita

Isso significa:
- as assinaturas existentes não devem ser alteradas retroativamente apenas porque um registro de origem `PlanOffer` foi alterado posteriormente
- `PlanOffer` afeta decisões futuras, não o estado histórico da assinatura

## 13. Semântica de validação para fluxos de trabalho futuros

Os fluxos de trabalho futuros devem tratar a configuração eficaz como o contrato de validação.

Exemplos:
- ao criar uma assinatura, a frequência solicitada deve existir em `allowed_frequencies`
- ao agendar uma mudança de plano, a variante de destino deve ser resolvida para uma configuração ativa e efetiva
- se a configuração resolvida estiver inativa, o fluxo de trabalho deverá rejeitar a solicitação

O fluxo de trabalho não deve tentar validar em relação a:
- um registro de origem aleatório escolhido manualmente
- campos mistos de produtos e variantes
- Resumos do administrador DTO

Ele deve ser validado apenas com base na configuração efetiva resolvida.

## 14. Semântica de proveniência

A configuração efetiva resolvida deve preservar explicitamente a proveniência.

Campos de proveniência obrigatórios:
- `source_offer_id`
- `source_scope`

Semântica de apresentação opcional recomendada:
- `resolution_reason = "direct_variant" | "fallback_product" | "no_match"`

Essa semântica extra não precisa ser persistida no MVP, mas pode ser útil em auxiliares de consulta e UI de detalhes do administrador.

## 15. Semântica do instantâneo de assinatura

Quando uma assinatura é criada ou atualizada usando uma configuração efetiva:
- a assinatura deve armazenar seus próprios dados operacionais selecionados como instantâneo
- a assinatura não deve depender de uma nova resolução futura da mesma configuração para correção histórica

Exemplos de dados que podem ser capturados no estado de assinatura:
- identificadores e rótulos de variantes selecionados
- frequência selecionada
- instantâneo de preços
- consequências operacionais derivadas de regras, se necessário posteriormente

Isso mantém `Subscriptions` e `Plans & Offers` separados corretamente:
- `Plans & Offers` define a política atual
- `Subscriptions` armazena o estado operacional real aceito

## 16. Comportamento recomendado da camada de leitura

A camada de leitura deve expor pelo menos duas categorias de leituras:

- leituras de registros de origem
- leituras de configuração efetiva

### Leituras de registros de origem

Usado por:
- Lista de administradores
- Detalhe da origem do administrador
- edição de registro de origem

### Leituras de configuração efetiva

Usado por:
- resumo efetivo da oferta do plano nos detalhes do administrador
- validação de criação de assinatura futura
- validação de mudança de plano futuro
- qualquer UI ou API que precise da oferta final atualmente aplicável

## 17. Recomendação final

A semântica final de configuração efetiva para MVP deve ser:

1. `PlanOffer` é sempre o registro de origem.
2. `ProductSubscriptionConfig` é sempre um resultado derivado.
3. A resolução de variante tenta primeiro a origem da variante habilitada.
4. Se a origem da variante estiver ausente ou desabilitada, a resolução retornará à origem do produto habilitada.
5. Se nenhum deles existir, o resultado será uma configuração inativa explícita.
6. A resolução utiliza substituição completa do registro, nunca mesclagem em nível de campo.
7. O administrador gerencia registros de origem, não configurações efetivas derivadas.
8. Os fluxos de trabalho de assinatura são validados em relação à configuração efetiva resolvida e, em seguida, persistem seus próprios instantâneos.

## 18. Impacto nas etapas posteriores

Este contrato semântico significa que as etapas posteriores de implementação devem:
- adicione auxiliares de consulta que resolvam explicitamente a configuração eficaz
- evite persistir tabelas de configuração efetivas materializadas no MVP
- criar validação de fluxo de trabalho com base em uma resolução de configuração eficaz
- manter os DTOs administrativos claros sobre se eles representam o estado de origem ou resolvido
