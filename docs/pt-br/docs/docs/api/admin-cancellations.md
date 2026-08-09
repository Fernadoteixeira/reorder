# API de cancelamentos de administrador

Este documento descreve o contrato Admin API implementado para a área `Cancelamento e Retenção` do plugin `Reordenar`.

É a fonte atual de verdade em tempo de execução para:
- parâmetros de solicitação
- solicitar órgãos
- formas de resposta
- cenários de erro comuns

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminho Básico

Todas as rotas estão em:

`/admin/cancelamentos`

## Autenticação

Todas as rotas são rotas somente para administradores.

Em termos de implementação:
- as rotas usam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio de middleware Medusa e esquemas Zod
- todas as mutações são executadas por meio de fluxos de trabalho, em vez de alterar os dados diretamente no manipulador de rotas

## DTOs compartilhados

As respostas da API são baseadas nos Admin DTOs definidos em:

- `src/admin/types/cancellation.ts`

Principais tipos de resposta:
- `CancellationCaseAdminListResponse`
- `CancellationCaseAdminDetailResponse`
- `CancellationCaseAdminListItem`
- `CancellationCaseAdminDetail`
- `CancellationAdminOfferEventRecord`
- `CancelamentoAdminSubscriptionSummary`
- `CancelamentoAdminDunningSummary`
- `CancellationAdminRenewalSummary`

## Valores de domínio compartilhado

### Valores de status do caso

Status de casos de cancelamento suportados:
- `solicitado`
- `avaliando_retenção`
- `retenção_oferecida`
- `retido`
- `pausado`
- `cancelado`

### Valores do Resultado Final

Resultados finais apoiados:
- `retido`
- `pausado`
- `cancelado`

### Oferecer valores de status de decisão

Status de decisão de oferta de retenção com suporte:
- `proposto`
- `aceito`
- `rejeitado`
- `aplicado`
- `expirado`

### Valores de categoria de motivo

Categorias de motivos suportadas:
- `preço`
- `produto_ajuste`
- `entrega`
- `faturamento`
- `pausa_temporária`
- `switched_competitor`
- `outro`

## 1. Listar casos de cancelamento

### Ponto final

- Método: `GET`
- Caminho: `/admin/cancelamentos`

### Propósito

Retorna a fila de cancelamento paginada usada pelo DataTable Admin `Cancellation & Retention`.

### Parâmetros de consulta

Paginação e pesquisa:
- `limite?: número`
- `deslocamento ?: número`
- `q?: string`

Classificação:
- `ordem?: string`
- `direção?: "asc" | "desc"`

Filtros:
- `status?: string | string[]`
- `resultado_final?: string | string[]`
- `categoria_motivo?: string | string[]`
- `tipo_oferta?: string | string[]`
- `id_de_assinatura?:string`
- `criado_de?: string`
- `criado_para?: string`

### Campos de classificação suportados

Baseado em banco de dados:
- `criado_em`
- `atualizado_em`
- `estado`
- `resultado_final`
- `razão_categoria`
- `finalizado_em`

Na memória:
- `referência_de_assinatura`
- `nome_do_cliente`
- `título_do_produto`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "cancellations": [
    {
      "id": "cc_123",
      "status": "evaluating_retention",
      "reason": "Customer says the price is too high",
      "reason_category": "price",
      "final_outcome": null,
      "subscription": {
        "subscription_id": "sub_123",
        "reference": "SUB-001",
        "status": "active",
        "customer_name": "Jane Doe",
        "product_title": "Coffee Subscription",
        "variant_title": "1 kg",
        "sku": "COFFEE-1KG",
        "next_renewal_at": "2026-04-15T10:00:00.000Z",
        "last_renewal_at": "2026-03-15T10:00:00.000Z",
        "paused_at": null,
        "cancelled_at": null,
        "cancel_effective_at": null
      },
      "created_at": "2026-04-01T10:00:00.000Z",
      "finalized_at": null,
      "updated_at": "2026-04-01T10:05:00.000Z"
    }
  ],
  "count": 1,
  "limit": 20,
  "offset": 0
}
```

### Erros Comuns

- `400 dados_inválidos`
  Formato de parâmetro de consulta inválido ou valor de consulta incompatível.
- `400 dados_inválidos`
  Campo de classificação não suportado.

## 2. Obtenha detalhes do caso de cancelamento

### Ponto final

- Método: `GET`
- Caminho: `/admin/cancelamentos/:id`

### Propósito

Retorna a carga completa de detalhes do administrador para um único caso de cancelamento.

### Parâmetros de caminho

- `id: string`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "cancellation": {
    "id": "cc_123",
    "status": "retained",
    "reason": "Customer asked for a lower price",
    "reason_category": "price",
    "final_outcome": "retained",
    "subscription": {
      "subscription_id": "sub_123",
      "reference": "SUB-001",
      "status": "active",
      "customer_name": "Jane Doe",
      "product_title": "Coffee Subscription",
      "variant_title": "1 kg",
      "sku": "COFFEE-1KG",
      "next_renewal_at": "2026-04-15T10:00:00.000Z",
      "last_renewal_at": "2026-03-15T10:00:00.000Z",
      "paused_at": null,
      "cancelled_at": null,
      "cancel_effective_at": null
    },
    "created_at": "2026-04-01T10:00:00.000Z",
    "finalized_at": "2026-04-01T10:20:00.000Z",
    "updated_at": "2026-04-01T10:20:00.000Z",
    "notes": "Customer accepted a temporary retention discount",
    "finalized_by": "user_123",
    "cancellation_effective_at": null,
    "dunning": null,
    "renewal": {
      "renewal_cycle_id": "re_123",
      "status": "scheduled",
      "scheduled_for": "2026-04-15T10:00:00.000Z",
      "approval_status": null,
      "generated_order_id": null
    },
    "offers": [
      {
        "id": "roe_123",
        "offer_type": "discount_offer",
        "offer_payload": {
          "discount_offer": {
            "discount_type": "percentage",
            "discount_value": 10,
            "duration_cycles": 2,
            "note": null
          }
        },
        "decision_status": "applied",
        "decision_reason": "Customer accepted the offer",
        "decided_at": "2026-04-01T10:15:00.000Z",
        "decided_by": "user_123",
        "applied_at": "2026-04-01T10:15:00.000Z",
        "metadata": null,
        "created_at": "2026-04-01T10:15:00.000Z",
        "updated_at": "2026-04-01T10:15:00.000Z"
      }
    ],
    "metadata": {
      "manual_actions": []
    }
  }
}
```

### Erros Comuns

- `404 não_encontrado`
  O caso de cancelamento não existe.

## 3. Aplicar oferta de retenção

### Ponto final

- Método: `POST`
- Caminho: `/admin/cancellations/:id/apply-offer`

### Propósito

Aplica uma ação de retenção concreta, cria um `RetentionOfferEvent`, atualiza a assinatura e fecha o caso como `retido` ou `pausado`.

### Corpo da solicitação

Cargas suportadas:

#### Pausar oferta

```json
{
  "offer_type": "pause_offer",
  "offer_payload": {
    "pause_offer": {
      "pause_cycles": 2,
      "resume_at": null,
      "note": "Customer wants a short break"
    }
  },
  "decided_by": "user_123",
  "decision_reason": "Pause accepted by customer"
}
```

#### Oferta de desconto

```json
{
  "offer_type": "discount_offer",
  "offer_payload": {
    "discount_offer": {
      "discount_type": "percentage",
      "discount_value": 10,
      "duration_cycles": 2,
      "note": "Temporary save offer"
    }
  },
  "decided_by": "user_123",
  "decision_reason": "Customer accepted a lower price"
}
```

#### Oferta de bônus

```json
{
  "offer_type": "bonus_offer",
  "offer_payload": {
    "bonus_offer": {
      "bonus_type": "free_cycle",
      "value": 1,
      "label": null,
      "duration_cycles": 1,
      "note": null
    }
  },
  "decided_by": "user_123",
  "decision_reason": "Customer accepted a free cycle"
}
```

### Notas de validação

A validação atual da API impõe:
- `pause_offer` requer `pause_cycles` ou `resume_at`
- descontos percentuais não podem exceder `50`
- `desconto_valor` deve ser positivo
- `duration_cycles` deve ser positivo quando fornecido
- Os valores `bonus_offer` devem ser não negativos
- `free_cycle` e `credit` requerem `value`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:
- o mesmo que `GET /admin/cancellations/:id`

### Erros Comuns

- `404 não_encontrado`
  O caso não existe.
- `409 estado_inválido`
  O caso é terminal ou não pode aceitar uma nova oferta.
- `409 oferta_out_of_policy`
  A carga útil da oferta viola as regras da política de retenção.

## 4. Finalizar cancelamento

### Ponto final

- Método: `POST`
- Caminho: `/admin/cancellations/:id/finalize`

### Propósito

Finaliza o caso como `cancelado`, atualiza o ciclo de vida da assinatura, calcula `cancel_efficient_at` e limpa a elegibilidade para renovação.

### Corpo da solicitação

```json
{
  "reason": "Customer is switching to another provider",
  "reason_category": "switched_competitor",
  "notes": "No retention offer accepted",
  "finalized_by": "user_123",
  "effective_at": "immediately"
}
```

### Notas

- O `motivo` é exigido pelas regras do domínio para o cancelamento final.
- Se omitido no corpo, o fluxo de trabalho poderá utilizar o motivo do caso existente.
- `efetivo_at` suporta:
  - `imediatamente`
  - `fim_do_ciclo`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:
- o mesmo que `GET /admin/cancellations/:id`

### Erros Comuns

- `404 não_encontrado`
  O caso não existe.
- `409 estado_inválido`
  O caso é terminal ou não é elegível para cancelamento final.
- `400 dados_inválidos`
  Falta o motivo após a resolução do corpo e dos dados do caso existente.

## 5. Motivo de cancelamento da atualização

### Ponto final

- Método: `POST`
- Caminho: `/admin/cancelamentos/:id/motivo`

### Propósito

Atualiza o motivo da rotatividade, a categoria do motivo normalizado e as notas do caso.

### Corpo da solicitação

```json
{
  "reason": "The subscription no longer fits the customer needs",
  "reason_category": "product_fit",
  "notes": "Customer wants to stop after current cycle",
  "updated_by": "user_123",
  "update_reason": "Operator clarified churn classification"
}
```

### Resposta de sucesso

Estado:
- `200 OK`

Forma:
- o mesmo que `GET /admin/cancellations/:id`

### Erros Comuns

- `404 não_encontrado`
  O caso não existe.
- `409 estado_inválido`
  O caso é terminal ou não pode ser editado.

## 7. Cenários comuns de erros de domínio

Nas rotas de mutação, o tempo de execução atual expõe erros de reconhecimento de domínio para:

- `duplicado_active_case`
  Existe mais de um caso ativo para a mesma assinatura.
- `estado_inválido`
  A mutação solicitada não é legal para o estado atual do caso.
- `já_finalizado`
  O caso já é terminal.
- `offer_out_of_policy`
  A oferta de retenção solicitada viola a política.
- `não_encontrado`
  O caso ou o registro de origem vinculado não existe.

As rotas mapeiam-nas para respostas HTTP por meio de auxiliares de erro compartilhados em:
- `src/api/admin/cancellations/utils.ts`
