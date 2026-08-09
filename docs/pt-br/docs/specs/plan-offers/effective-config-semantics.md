# Reordenação: Especificação de semântica de configuração eficaz para planos e ofertas

Este documento abrange a etapa `2.2.4` de `documentation/implementation_plan.md`.

Objetivo:
- definir como a oferta final é resolvida para uma variante e para uma assinatura
- definir o que é considerado um registro de origem
- definir o que é considerado um candidato de fallback
- definir o que representa a configuração efetiva resolvida
- definir como o Admin interpreta a configuração resolvida e como os futuros fluxos de trabalho de assinatura devem utilizá-la

Esta especificação se baseia em:
- `reorder/docs/specs/plan-offers/admin-spec.md`
- `reorder/docs/specs/plan-offers/domain-model.md`
- `reorder/docs/specs/plan-offers/data-model-override.md`

## 1. Semântica básica

A área `Plans & Offers` abrange três conceitos distintos:

- registro de origem
- candidato alternativo
- configuração efetiva resolvida

Esses conceitos não devem ser confundidos.

### Registro de origem

Um registro de origem é um registro `PlanOffer` armazenado que pode, potencialmente, definir a oferta final de assinatura.

Existem dois tipos válidos de registro de origem:
- um registro de origem no nível do produto
- um registro de origem no nível da variante

### Candidato alternativo

Um candidato alternativo é um registro de origem que não obteve a primeira prioridade, mas que ainda pode se tornar a fonte final caso o registro de maior prioridade esteja ausente ou inativo.

Na prática:
- para a resolução de variantes, a fonte no nível do produto é a candidata de fallback
- para a resolução de produtos, não há candidata de fallback com prioridade inferior

### Configuração válida

A configuração efetiva resolvida é a configuração final derivada, retornada pela camada de leitura após a resolução.

É:
- não é uma fonte de verdade persistente
- não é um registro editável
- não é um instantâneo de uma assinatura

Trata-se de um resultado calculado com base nos registros de fontes disponíveis atualmente.

## 2. Fonte da verdade

A única fonte de verdade persistente é `PlanOffer`.

`ProductSubscriptionConfig` é um estado derivado.

Isso significa que:
- As operações de criação, edição e ativação/desativação realizadas pelo administrador modificam `PlanOffer`
- As consultas e a lógica de validação podem ler `ProductSubscriptionConfig`
- As assinaturas não devem manter uma referência ativa à configuração vigente como seu estado operacional de longo prazo

## 3. Dados de resolução

A resolução eficaz da configuração deve aceitar uma das duas entradas:

- contexto do produto
- contexto da variante

### Contexto do produto

O contexto do produto significa que:
- `product_id` é conhecido
- `variant_id` não faz parte da entrada de resolução

### Contexto da variante

O contexto de variante significa:
- `product_id` é conhecido
- `variant_id` é conhecido

O contexto da variante é a via de resolução mais importante para a criação futura de assinaturas e a validação de alterações de plano.

## 4. Configuração eficaz para o contexto do produto

Ao definir a configuração efetiva de um produto:

1. ler o registro de origem no nível do produto para `product_id`
2. se o registro existir e estiver habilitado, ele se torna a configuração efetiva resolvida
3. se o registro não existir, não há configuração efetiva
4. se o registro existir, mas estiver desabilitado, não há configuração efetiva ativa

### Semântica dos resultados no contexto do produto

Se houver uma fonte válida no nível do produto:
- `source_scope = product`
- `source_offer_id = product record id`
- todos os campos efetivos provêm do registro da fonte no nível do produto

Se não houver nenhuma fonte válida:
- `source_scope = null`
- `source_offer_id = null`
- o resultado fica inativo ou vazio

## 5. Configuração eficaz para o contexto de variantes

Ao determinar a configuração efetiva para uma variante:

1. ler o registro de origem no nível da variante para `variant_id`
2. se ele existir e estiver habilitado, ele prevalece imediatamente
3. caso contrário, ler o registro de origem no nível do produto para `product_id`
4. se o registro no nível do produto existir e estiver habilitado, ele se torna a fonte alternativa
5. caso contrário, não há nenhuma configuração ativa e em vigor

### Semântica dos resultados no contexto das variantes

Se o registro no nível da variante prevalecer:
- `source_scope = variant`
- `source_offer_id = variant record id`
- todos os campos efetivos provêm do registro de origem no nível da variante

Se o registro no nível do produto for o vencedor:
- `source_scope = product`
- `source_offer_id = product record id`
- todos os campos efetivos são provenientes do registro de origem no nível do produto

Se nenhum dos dois vencer:
- `source_scope = null`
- `source_offer_id = null`
- o resultado fica inativo ou vazio

## 6. Semântica de registros desativados

Os registros desativados são tratados como registros de origem inativos.

Isso significa que:
- um registro desativado no nível da variante não pode prevalecer na resolução;
- um registro desativado no nível do produto não pode prevalecer na resolução;
- um registro desativado no nível da variante não impede o recurso de fallback para um registro ativado no nível do produto

Isso é importante porque `is_enabled` representa uma política ativa, e não um estado de substituição que bloqueia.

## 7. Ausência de semântica de mesclagem

Foi decidido que a configuração efetiva deve utilizar a semântica de registro completo.

Isso significa que:
- se o registro no nível da variante prevalecer, todos os campos de configuração finais serão provenientes desse registro no nível da variante
- se o registro no nível do produto prevalecer, todos os campos de configuração finais serão provenientes desse registro no nível do produto

Não oferecemos suporte a:
- fusão de frequências de produtos com descontos de variantes
- herança de regras de produtos ao substituir apenas um campo de variante
- fusão parcial entre dois registros de origem

Essa é uma restrição deliberada do MVP.

## 8. Contrato de saída de configuração eficaz

A saída resolvida deve corresponder ao contrato lógico de `ProductSubscriptionConfig`.

Potência efetiva recomendada:

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

### Semântica de campos

`product_id`
- identifica o contexto do produto do resultado

`variant_id`
- identifica o contexto da variante do resultado, quando aplicável

`source_offer_id`
- identifica o registro exato `PlanOffer` que gerou o resultado

`source_scope`
- identifica se o resultado provém de uma fonte no nível do produto ou no nível da variante

`is_enabled`
- indica se a configuração resolvida está ativa e pronta para uso
- se não houver nenhuma fonte válida, isso deve ser resolvido como `false`

`allowed_frequencies`
- frequências finais permitidas de cobrança

`discount_per_frequency`
- descontos finais correspondentes ao registro de origem vencedor

`rules`
- regras da oferta final correspondentes ao registro de origem vencedor

## 9. Semântica de resultados vazios ou inativos

Caso não exista nenhum registro de origem válido, o modelo de leitura ainda deve possuir semântica determinística.

Significado recomendado:
- `source_offer_id = null`
- `source_scope = null`
- `is_enabled = false`
- `allowed_frequencies = []`
- `discount_per_frequency = []`
- `rules = null`

Isso facilita a validação posterior do fluxo de trabalho, pois a condição “não há oferta” pode ser representada como uma configuração inativa explícita.

## 10. Diferença entre detalhe de origem e detalhe efetivo

Essas são questões distintas relacionadas à leitura:

### Detalhes da fonte

Os detalhes da fonte correspondem aos detalhes administrativos de um registro concreto de `PlanOffer`.

Ele responde:
- o que foi explicitamente configurado neste registro;
- a qual destino este registro pertence;
- se este registro de origem está ativado

### Detalhe eficaz

O detalhe efetivo é a configuração final definida para um produto ou variante.

Isso responde:
- qual configuração está efetivamente em vigor no momento;
- se essa configuração final provém de uma fonte no nível do produto ou no nível da variante;
- quais critérios uma futura ação de assinatura deve verificar

O administrador pode exibir ambos, mas eles não devem ser tratados como o mesmo objeto.

## 11. Semântica administrativa

A lista de administradores para `Plans & Offers` deve continuar sendo baseada nos registros de origem.

Significado:
- cada linha representa um `PlanOffer`
- a classificação e a filtragem se aplicam aos registros de origem
- as ações nas linhas permitem editar, alternar ou inspecionar um registro de origem

A visualização detalhada do Admin também pode exibir:
- resumo da configuração efetiva resolvida
- proveniência da fonte
- informações de fallback

Mas o administrador continua editando apenas o registro original.

## 12. Semântica da assinatura

As assinaturas devem utilizar a configuração vigente no momento da decisão, e não como uma dependência permanentemente ativa.

Existem dois momentos críticos:
- criação da assinatura
- alteração do plano de assinatura

Nesses momentos, o sistema deve:
1. determinar a configuração válida para o produto ou variante solicitado
2. validar a frequência solicitada ou os pressupostos de desconto em relação à configuração válida
3. salvar um instantâneo da assinatura ou os dados da atualização pendente derivados da opção aceita

Isso significa que:
- as assinaturas existentes não devem ser alteradas retroativamente apenas porque um registro de origem `PlanOffer` foi alterado posteriormente
- `PlanOffer` afeta decisões futuras, não o estado histórico das assinaturas

## 13. Semântica de validação para fluxos de trabalho futuros

Os fluxos de trabalho futuros devem considerar a configuração efetiva como o contrato de validação.

Exemplos:
- ao criar uma assinatura, a frequência solicitada deve existir em `allowed_frequencies`
- ao agendar uma alteração no plano, a variante de destino deve corresponder a uma configuração ativa e válida
- se a configuração correspondente estiver inativa, o fluxo de trabalho deve rejeitar a solicitação

O fluxo de trabalho não deve tentar validar com base em:
- um registro de origem aleatório selecionado manualmente
- campos misturados de produto e variante
- resumos do DTO de administração

A validação deve ser feita apenas com base na configuração efetiva já definida.

## 14. Semântica de proveniência

A configuração efetiva finalizada deve preservar explicitamente a proveniência.

Campos obrigatórios de proveniência:
- `source_offer_id`
- `source_scope`

Semântica de apresentação opcional recomendada:
- `resolution_reason = "direct_variant" | "fallback_product" | "no_match"`

Essa informação semântica adicional não precisa ser armazenada no MVP, mas pode ser útil nos auxiliares de consulta e na interface de detalhes do Admin.

## 15. Semântica do instantâneo de assinatura

Quando uma assinatura é criada ou atualizada usando uma configuração válida:
- a assinatura deve armazenar seus próprios dados operacionais selecionados como um instantâneo
- a assinatura não deve depender de uma futura reavaliação da mesma configuração para garantir a exatidão histórica

Exemplos de dados que podem ser capturados no estado de assinatura:
- identificadores e rótulos das variantes selecionadas
- frequência selecionada
- instantâneo de preços
- consequências operacionais derivadas das regras, caso sejam necessárias posteriormente

Isso mantém `Subscriptions` e `Plans & Offers` corretamente separados:
- `Plans & Offers` define a política atual
- `Subscriptions` armazena o estado operacional efetivamente aceito

## 16. Comportamento recomendado da camada de leitura

A camada de leitura deve expor pelo menos duas categorias de leituras:

- leituras do registro de origem
- leituras da configuração efetiva

### Leituras do registro de origem

Utilizado por:
- Lista de administradores
- Detalhes da fonte do administrador
- Edição do registro da fonte

### Leituras do arquivo effective-config

Utilizado para:
- resumo eficaz da oferta do plano nos detalhes do Admin
- validação na criação de assinaturas futuras
- validação em futuras alterações de plano
- qualquer interface de usuário (UI) ou API que necessite da oferta final atualmente aplicável

## 17. Recomendação final

A semântica final da configuração efetiva para o MVP deve ser:

1. `PlanOffer` é sempre o registro de origem.
2. `ProductSubscriptionConfig` é sempre um resultado derivado.
3. A resolução de variantes tenta, primeiro, a fonte de variantes ativada.
4. Se a fonte da variante estiver ausente ou desativada, a resolução recorre à fonte do produto habilitada.
5. Se nenhuma das duas existir, o resultado é uma configuração explícita inativa.
6. A resolução utiliza a substituição do registro completo, nunca a fusão no nível do campo.
7. O administrador gerencia os registros de origem, não as configurações efetivas derivadas.
8. Os fluxos de trabalho de assinatura validam em relação à configuração efetiva resolvida e, em seguida, persistem seus próprios instantâneos.

## 18. Impacto nas etapas posteriores

Esse contrato semântico significa que as etapas de implementação posteriores devem:
- adicionar auxiliares de consulta que resolvam explicitamente a configuração efetiva
- evitar a persistência de tabelas materializadas de configuração efetiva no MVP
- construir a validação do fluxo de trabalho com base na resolução da configuração efetiva
- manter os DTOs de administração claros quanto ao fato de representarem o estado de origem ou o estado resolvido
