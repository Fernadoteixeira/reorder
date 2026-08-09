# Reordenar: UI de administração de assinatura e especificações de API

Este documento completa a etapa `2.1.1` de `documentation/implementation_plan.md` e define a especificação de dados para a área `Subscriptions` no Admin de uma forma mais próxima dos padrões oficiais da Medusa.

Artefatos produzidos nesta etapa:
- Tipos de DTO de administrador: `reorder/src/admin/types/subscription.ts`
- este documento como especificação de colunas, ações, filtros e formas de solicitação para etapas posteriores

Nota:
- Medusa não requer um artefato de `contrato` separado
- na prática, a estrutura usa uma combinação de `tipos`, `validadores Zod`, `WorkflowInput` e definições de rota de UI/DataTable
- este documento é uma especificação de design, não um artefato Medusa em nível de estrutura

## 1. Administrador DTO

Os tipos de UI foram movidos para:
- `SubscriptionAdminStatus`
- `SubscriptionFrequencyInterval`
- `SubscriptionAdminListItem`
- `SubscriptionAdminDetail`
- `SubscriptionAdminListResponse`
- `SubscriptionAdminDetailResponse`

Arquivo:
- `reorder/src/admin/types/subscription.ts`

## 2. Lista de `Assinaturas`

A lista é baseada em `DataTable` e usa as seguintes colunas:

| Coluna | Visível por padrão | Classificável | Notas |
|---|---:|---:|---|
| `assinatura` | sim | sim | `referência` + identificador estável |
| `estado` | sim | sim | emblema de status |
| `cliente` | não | sim | disponível no DTO e na classificação/pesquisa de back-end, mas atualmente não renderizado como uma coluna de lista visível |
| `produto` | sim | sim | produto + variante + SKU opcional |
| `frequência` | sim | sim | por exemplo `A cada 2 meses` |
| `next_renewal_at` | sim | sim | próxima data de renovação |
| `julgamento` | sim | sim | sinalizador + `trial_ends_at` |
| `desconto` | sim | sim | instantâneo de desconto de assinatura |
| `skip_next_cycle` | sim | sim | booleano |
| `atualizado_em` | não | sim | campo de classificação do auxiliar técnico, não renderizado como uma coluna de lista visível |

Registro mínimo da lista:
- `id`
- `referência`
- `estado`
- `cliente`
- `produto`
- `frequência`
- `próxima_renovação_em`
- `teste`
- `desconto`
- `skip_next_cycle`
- `atualizado_em`

## 3. Status

Os status de administrador do MVP são:
- `ativo`
- `pausado`
- `cancelado`
- `passado_vencido`

Notas:
- `cancelado` permanece na grafia britânica porque esse status já é usado no plano e nos documentos do produto
- `expired` não faz parte do contrato desta etapa porque não está no escopo atual do MVP `Subscriptions`

## 4. Ações de linha/ações de visualização de detalhes

Ações definidas:

| Ação | Status permitidos | Confirmar | Finalidade |
|---|---|---:|---|
| `pausa` | `ativo`, `passado_vencido` | sim | impedir futuras renovações |
| `currículo` | `pausado` | sim | retomar a assinatura |
| `cancelar` | `ativo`, `pausado`, `passado_devido` | sim | encerrar a assinatura |
| `schedule_plan_change` | `ativo`, `pausado`, `passado_devido` | não | agendar uma alteração de variante/frequência |
| `update_shipping_address` | `ativo`, `pausado`, `passado_devido` | não | atualizar o endereço de entrega |

`cancelled` não possui ações de mutação nesta visualização MVP.

## 5. Editar campos

### 5.1 Mudança de plano de cronograma

Campos:
- `plan_variant_id` - obrigatório
- `frequency_interval` - obrigatório, enum: `week | mês | ano`
- `frequency_value` - obrigatório, número positivo
- `pending_change_efficient_at` - data e hora ISO opcional

### 5.2 Atualizar endereço de entrega

Campos:
- `primeiro_nome` - obrigatório
- `sobrenome` - obrigatório
- `empresa` - opcional
- `endereço_1` - obrigatório
- `endereço_2` - opcional
- `cidade` - obrigatório
- `código_postal` - obrigatório
- `província` - opcional
- `código_país` - obrigatório
- `telefone` - opcional

## 6. Filtros e classificação

Filtros de lista:
- `q`
- `estado[]`
- `ID_do_cliente`
- `id_produto`
- `variant_id`
- `próxima_renovação_de`
- `próxima_renovação_para`
- `is_trial`
- `skip_next_cycle`

Classificação:
- `criado_em`
- `atualizado_em`
- `estado`
- `nome_do_cliente`
- `cliente_email`
- `título_do_produto`
- `variant_title`
- `intervalo_frequência`
- `valor_frequência`
- `próxima_renovação_em`
- `trial_ends_at`
- `valor_desconto`
- `skip_next_cycle`

Contrato de consulta de lista:
- `limite`
- `deslocamento`
- `ordem`
- `direção`
- todos os filtros listados acima

## 7. Cargas úteis de mutação

As cargas abaixo são uma especificação para etapas posteriores.
Sua implementação deve ser adicionada aos validadores Zod em `src/api/admin/subscriptions/**/validators.ts` ou arquivos de middleware seguindo os padrões Medusa.

### `pausa`
```json
{
  "reason": "customer requested temporary stop",
  "effective_at": "2026-04-01T00:00:00.000Z"
}
```

### `resume`
```json
{
  "resume_at": "2026-04-15T00:00:00.000Z",
  "preserve_billing_anchor": true
}
```

### `cancelar`
```json
{
  "reason": "retention flow failed",
  "effective_at": "end_of_cycle"
}
```

### `schedule_plan_change`
```json
{
  "variant_id": "variant_123",
  "frequency_interval": "month",
  "frequency_value": 2,
  "effective_at": "2026-05-01T00:00:00.000Z"
}
```

### `update_shipping_address`
```json
{
  "first_name": "Jan",
  "last_name": "Kowalski",
  "company": "ACME",
  "address_1": "Nowa 1",
  "address_2": null,
  "city": "Warszawa",
  "postal_code": "00-001",
  "province": "Mazowieckie",
  "country_code": "PL",
  "phone": "+48123123123"
}
```

## 8. Carga útil detalhada

Os detalhes da assinatura estendem o registro da lista com:
- `criado_em`
- `começou_em`
- `pausado_em`
- `cancelado_em`
- `última_renovação_em`
- `endereço_de_envio`
- `pending_update_data`

`pending_update_data` armazena uma prévia da mudança de plano agendada:
- `variant_id`
- `variant_title`
- `intervalo_frequência`
- `valor_frequência`
- `efetivo_em`

Na UI de detalhes atual, o instantâneo do `produto` é renderizado como um cartão estilo Medusa vinculado à página de detalhes da variante padrão, com `sku` mostrado separadamente abaixo dele.

## 9. Impacto nas etapas posteriores

Este contrato significa que a próxima etapa `2.1.2` deve projetar pelo menos estes endpoints:
- `GET /admin/subscrições`
- `GET /admin/subscrições/:id`
- `POST /admin/subscriptions/:id/pause`
- `POST /admin/subscriptions/:id/resume`
- `POST /admin/subscriptions/:id/cancel`
- `POST /admin/subscriptions/:id/schedule-plan-change`
- `POST /admin/subscriptions/:id/update-shipping-address`
