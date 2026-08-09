# Reordenar: UI de administração de renovações e especificações de API

Este documento cobre a etapa `2.3.1` de `documentation/implementation_plan.md`.

Objetivo:
- definir tipos de Admin DTO para `Renovações`
- definir o contrato de lista/detalhe para um Admin `DataTable`
- definir cargas úteis `force`, `approve-changes` e `reject-changes` para etapas posteriores de back-end
- definir um contrato UX alinhado com os padrões padrão do Medusa Admin

Artefatos produzidos nesta etapa:
- Tipos de DTO de administrador: `reorder/src/admin/types/renewal.ts`
- este documento como especificação para colunas, ações, filtros e formas de solicitação/resposta

Nota:
- esta é uma especificação de design para etapas posteriores, não a implementação final do módulo
- back-end, fluxos de trabalho e a rota da UI Admin serão implementados nas etapas posteriores `2.3`

Status de implementação:
- a área `Renovações` já está implementada
- tratar este documento como contexto de tempo de design e entrada de especificação histórica
- a fonte atual da verdade em tempo de execução reside em:
  - `reordenar/docs/architecture/renewals.md`
  - `reordenar/docs/api/admin-renewals.md`
  - `reordenar/docs/admin/renewals.md`
  - `reordenar/docs/testing/renewals.md`

## 1. Suposições de design

`Renovações` é uma visualização administrativa operacional usada para monitorar e controlar a execução de renovação de assinaturas.

No nível do contrato, assumimos:
- um registro Admin representa um ciclo de renovação
- um ciclo de renovação pertence a uma assinatura
- um ciclo de renovação pode ter múltiplas tentativas
- um ciclo de renovação pode gerar um pedido de renovação
- um ciclo de renovação pode exigir aprovação antes que as alterações pendentes possam ser aplicadas
- O administrador deve ser capaz de ver informações no nível da fila e detalhes no nível da tentativa

Seguindo as convenções da Medusa:
- a lista é baseada em `DataTable`
- endpoints de leitura retornam DTOs paginados para a tabela e página de detalhes
- mutações são expostas como rotas `POST` dedicadas
- as decisões de força e aprovação são ações operacionais, não edições inline
- a página de detalhes é a superfície principal para revisão de tentativas e estado de aprovação

## 2. Administrador DTO

Os tipos de UI são definidos como:
- `RenewalCycleAdminStatus`
- `RenewalAttemptAdminStatus`
- `RenewalApprovalStatus`
- `RenewalAdminSubscriptionSummary`
- `RenewalAdminOrderSummary`
- `RenewalAdminPendingChangeSummary`
- `RenewalAdminApprovalSummary`
- `RenewalAttemptAdminRecord`
- `RenewalCycleAdminListItem`
- `RenewalCycleAdminDetail`
- `RenewalCycleAdminListResponse`
- `RenewalCycleAdminDetailResponse`
- `ForceRenewalAdminRequest`
- `ApproveRenewalChangesAdminRequest`
- `RejectRenewalChangesAdminRequest`

Arquivo:
- `reordenar/src/admin/types/renewal.ts`

## 3. Formato de registro de lista

Registro mínimo da lista:
- `id`
- `estado`
- `assinatura`
- `agendado_para`
- `última_tentativa_status`
- `última_tentativa_em`
- `aprovação`
- `pedido_gerado`
- `atualizado_em`

### `assinatura`

O campo `subscription` agrupa os dados necessários para identificar a meta de renovação:

```ts
{
  subscription_id: string
  reference: string
  status: "active" | "paused" | "cancelled" | "past_due"
  customer_name: string
  product_title: string
  variant_title: string
  sku: string | null
}
```

Por quê:
- a tabela e a visualização detalhada devem identificar a assinatura sem exigir outro formato
- a UI pode renderizar um bloco consistente de `assinatura + contexto de comércio`

### `aprovação`

O campo `aprovação` é um resumo operacional compacto:

```ts
{
  status: "pending" | "approved" | "rejected" | null
  required: boolean
  decided_at: string | null
  decided_by: string | null
  reason: string | null
}
```

Por quê:
- a lista deve mostrar rapidamente se o ciclo está bloqueado por aprovação
- a visualização detalhada pode expandir o mesmo objeto sem inventar outra forma

### `pedido_gerado`

O resumo do pedido gerado é anulável porque um ciclo pode ainda não ter criado um pedido:

```ts
{
  order_id: string
  display_id: number | string
  status: string
} | null
```

Por quê:
- a visualização da fila deve vincular um ciclo bem-sucedido à ordem resultante
- ciclos com falha ou ainda não processados devem permanecer explícitos em vez de sobrecarregar strings de espaço reservado

## 4. Forma detalhada

O DTO detalhado estende o registro da lista com:
- `criado_em`
- `processado_em`
- `último_erro`
- `mudanças_pendentes`
- `tentativas`
- `metadados`

A visualização detalhada deve suportar:
- rever o estado de renovação atual
- inspecionar o histórico de tentativas
- revisar alterações pendentes e estado de aprovação
- desencadear ações operacionais a partir de uma única página de detalhes do ciclo

### `mudanças_pendentes`

As alterações pendentes são representadas como uma visualização normalizada da alteração da assinatura que pode ser aplicada durante a renovação:

```ts
{
  variant_id: string
  variant_title: string
  frequency_interval: "week" | "month" | "year"
  frequency_value: number
  effective_at: string | null
} | null
```

### `tentativas`

As tentativas são representadas como uma lista ordenada de registros de execução técnica:

```ts
Array<{
  id: string
  attempt_no: number
  status: "processing" | "succeeded" | "failed"
  started_at: string
  finished_at: string | null
  error_code: string | null
  error_message: string | null
  payment_reference: string | null
  order_id: string | null
}>
```

Por quê:
- a página de detalhes deve mostrar um cronograma operacional
- a análise de novas tentativas e falhas não deve ser compactada em um campo de erro de nível superior

## 5. Status

### 5.1 Status do ciclo

Nesta fase, os estados do ciclo de renovação são:
- `agendado`
- `processamento`
- `sucesso`
- `falhou`

Esses status descrevem o estado de execução, não o estado de aprovação.

### 5.2 Status de tentativa

Os status de tentativa são:
- `processamento`
- `sucesso`
- `falhou`

### 5.3 Status de aprovação

Os status de aprovação são:
- `pendente`
- `aprovado`
- `rejeitado`

Se a aprovação não for necessária para um ciclo:
- `aprovação.required = false`
- `aprovação.status = null`

Isto mantém o estado de aprovação explícito sem sobrecarregar a máquina de status do ciclo.

## 6. Lista de `renovações`

A lista é baseada em `DataTable` e deve expor as seguintes colunas:

| Coluna | Visível por padrão | Classificável | Notas |
|---|---:|---:|---|
| `assinatura` | sim | sim | referência + cliente + contexto do produto |
| `agendado_para` | sim | sim | data prevista de processamento |
| `estado` | sim | sim | emblema de status do ciclo de renovação |
| `última_attempt_status` | sim | sim | último resultado de execução conhecido |
| `aprovação` | sim | sim | pendente/aprovado/rejeitado/não obrigatório |
| `ordem_gerada` | sim | sim | pedido criado a partir de renovação, se houver |
| `atualizado_em` | não | sim | coluna de ajudante técnico |

### Renderização de coluna

`assinatura`
- primeira linha: referência de assinatura
- segunda linha: nome do cliente
- terceira linha: título do produto + título da variante ou SKU quando útil

`agendado_para`
- data e hora formatadas compactas

`estado`
- `StatusBadge`

`última_tentativa_status`
- resumo compacto de sucesso/falha/processamento

`aprovação`
- `Aprovação pendente`
- `Aprovado`
- `Rejeitado`
- `Não obrigatório`

`pedido_gerado`
- exibir ID quando disponível
- texto substituto sutil quando nenhum pedido foi gerado

## 7. Ações

Listar/detalhar ações:

| Ação | Disponível quando | Confirmar | Finalidade |
|---|---|---:|---|
| `força` | `agendado`, `falhou` | sim | acionar execução de renovação manual |
| `aprovar_mudanças` | aprovação necessária e `pendente` | sim | permitir que alterações pendentes sejam aplicadas |
| `reject_changes` | aprovação necessária e `pendente` | sim | impedir que alterações pendentes sejam aplicadas |

Notas:
- `approve_changes` e `reject_changes` são ações de decisão, não ações genéricas de edição
- `force` deve permanecer desabilitado enquanto o ciclo já estiver `processando`
- a confirmação é necessária porque todas as três ações têm consequências operacionais

## 8. Campos de visualização de detalhes

A página de detalhes deve expor estas seções:
- visão geral do ciclo
- resumo da assinatura
- resumo do pedido gerado
- resumo de aprovação
- alterações pendentes
- histórico de tentativas
- metadados técnicos

A visão geral deve incluir:
- status do ciclo
- data agendada
- data processada
- resumo do último erro

A página de detalhes é a principal superfície operacional para:
- revisão de falhas
- tomar decisões de aprovação
- forçando uma nova tentativa

## 9. Filtros e classificação

Filtros de lista:
- `q`
- `estado`
- `status_aprovação`
- `agendado_de`
- `agendado_para`
- `última_tentativa_status`
- `subscrição_id`
- `generated_order_id`

Significado do filtro:
- `q` pesquisa pelo menos referência de assinatura, nome do cliente, título do produto, título da variante e ID de exibição do pedido
- `status` filtra o estado de execução do ciclo
- `approval_status` filtra o estado da decisão de aprovação
- `scheduled_from` e `scheduled_to` restringem a fila por intervalo de datas
- `last_attempt_status` filtra pelo resultado da tentativa mais recente

Classificação:
- `agendado_para`
- `atualizado_em`
- `criado_em`
- `estado`
- `status_aprovação`
- `última_tentativa_status`
- `processado_em`
- `referência_de_assinatura`
- `nome_do_cliente`
- `título_do_produto`
- `order_display_id`

Contrato de consulta de lista:
- `limite`
- `deslocamento`
- `ordem`
- `direção`
- todos os filtros listados acima

## 10. Cargas úteis de mutação

As cargas abaixo são uma especificação para etapas posteriores.
Sua implementação deve ser adicionada aos validadores Zod em `src/api/admin/renewals/**/validators.ts` ou arquivos de middleware seguindo os padrões Medusa.

### `forçar`

```json
{
  "reason": "manual operator retry after payment issue review"
}
```

Notas:
- `razão` é opcional, mas recomendado para auditabilidade

### `approve_changes`

```json
{
  "reason": "pending plan change reviewed and approved"
}
```

Notas:
- `razão` é opcional
- a decisão ainda deve ser auditável através do ator e do carimbo de data/hora

### `reject_changes`

```json
{
  "reason": "pending changes are not valid for this renewal cycle"
}
```

Notas:
- `razão` é obrigatório
- rejeitar sem motivo deve ser tratado como inválido em etapas posteriores

## 11. Contrato de resposta detalhado

O detalhe da renovação estende o registro da lista com:
- carimbos de data e hora do ciclo de vida
- último texto de erro
- resumo completo da aprovação
- visualização de alterações pendentes
- matriz de tentativas
- metadados

Isso permite que a página de detalhes do administrador permaneça independente sem exigir formatos de solicitação ad hoc adicionais para tentativas ou estado de aprovação.

## 12. Impacto nas etapas posteriores

Este contrato significa que as próximas etapas `2.3` devem projetar pelo menos estes terminais:
- `GET /admin/renovações`
- `GET /admin/renovações/:id`
- `POST /admin/renovações/:id/force`
- `POST /admin/renewals/:id/approve-changes`
- `POST /admin/renewals/:id/reject-changes`

Isso também significa que o modelo de leitura posterior deve suportar:
- renderização de fila em nível de lista
- histórico de tentativas em nível de detalhe
- visibilidade de aprovação
- vincular um ciclo ao seu pedido de renovação gerado
