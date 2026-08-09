# API de configurações de assinatura de administrador

Este documento descreve o contrato atual da API Admin para a área `Subscription Settings` do plugin `Reorder`.

Pretende ser a fonte atual de verdade para:
- formas de solicitação e resposta
- fallback versus semântica persistente
- comportamento de bloqueio otimista
- validação e mapeamento de erros

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminho Básico

Todas as rotas estão em:

`/admin/subscription-settings`

## Autenticação

A implementação atual usa rotas administrativas autenticadas.

Em termos de implementação:
- as rotas usam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio de middleware Medusa e esquemas Zod
- os manipuladores de rotas permanecem limitados e delegam ao serviço de configurações ou ao fluxo de trabalho de atualização

O MVP atual ainda não adiciona uma camada de permissão dedicada baseada em função além do acesso de administrador autenticado.

## Forma DTO compartilhada

A API atual retorna um único objeto de nível superior:

```json
{
  "subscription_settings": {
    "settings_key": "global",
    "default_trial_days": 0,
    "dunning_retry_intervals": [1440, 4320, 10080],
    "max_dunning_attempts": 3,
    "default_renewal_behavior": "process_immediately",
    "default_cancellation_behavior": "recommend_retention_first",
    "version": 0,
    "updated_by": null,
    "updated_at": null,
    "metadata": null,
    "is_persisted": false
  }
}
```

## Semântica de campo compartilhado

- `settings_key`
  Sempre `global` no MVP.
- `default_trial_days`
  Número inteiro de dias de avaliação.
- `dunning_retry_intervals`
  Programação de novas tentativas expressa em minutos.
- `max_dunning_attempts`
  Número máximo de novas tentativas para fluxos de cobrança recém-criados.
- `default_renewal_behavior`
  Política de renovação padrão global para decisões de renovação no momento da criação.
- `default_cancellation_behavior`
  Política de cancelamento padrão global para decisões de cancelamento no momento da criação.
- `version`
  Versão monotônica usada para bloqueio otimista.
- `updated_by`
  ID do ator da última atualização persistente bem-sucedida ou `null` quando não existe nenhum registro persistido.
- `updated_at`
  Carimbo de data/hora da última atualização persistente bem-sucedida ou `null` quando não existe nenhum registro persistido.
- `metadata`
  Metadados técnicos incluindo `audit_log` e `last_update`.
- `is_persisted`
  `false` quando a resposta é construída a partir de padrões de fallback, `true` quando vem do singleton armazenado.

## 1. Obtenha configurações eficazes

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-settings`

### Propósito

Retorna a carga útil de configurações efetiva usada pela página Configurações de administrador e pelos consumidores de tempo de execução.

### Resposta de sucesso

Estado:
- `200 OK`

Comportamento:
- retorna padrões de fallback quando não existe singleton persistente
- nunca retorna `404` só porque o registro de configurações ainda não foi criado

### Exemplo de resposta substituta

```json
{
  "subscription_settings": {
    "settings_key": "global",
    "default_trial_days": 0,
    "dunning_retry_intervals": [1440, 4320, 10080],
    "max_dunning_attempts": 3,
    "default_renewal_behavior": "process_immediately",
    "default_cancellation_behavior": "recommend_retention_first",
    "version": 0,
    "updated_by": null,
    "updated_at": null,
    "metadata": null,
    "is_persisted": false
  }
}
```

### Exemplo de resposta persistente

```json
{
  "subscription_settings": {
    "settings_key": "global",
    "default_trial_days": 21,
    "dunning_retry_intervals": [45, 180, 720],
    "max_dunning_attempts": 3,
    "default_renewal_behavior": "require_review_for_pending_changes",
    "default_cancellation_behavior": "allow_direct_cancellation",
    "version": 1,
    "updated_by": "user_01ABC",
    "updated_at": "2026-04-03T14:00:00.000Z",
    "metadata": {
      "audit_log": [],
      "last_update": null
    },
    "is_persisted": true
  }
}
```

## 2. Atualizar configurações

### Ponto final

- Método: `POST`
- Caminho: `/admin/subscription-settings`

### Propósito

Persiste um registro de configurações singleton novo ou atualizado por meio do fluxo de trabalho dedicado.

### Corpo da solicitação

Campos suportados:
- `default_trial_days?: number`
- `dunning_retry_intervals?: number[]`
- `max_dunning_attempts?: number`
- `default_renewal_behavior?: "process_immediately" | "require_review_for_pending_changes"`
- `default_cancellation_behavior?: "recommend_retention_first" | "allow_direct_cancellation"`
- `expected_version?: number`
- `reason?: string | null`

Notas:
- `expected_version` é usado para bloqueio otimista.
- os campos de configurações omitidos mantêm seu valor efetivo atual.
- `updated_by` é derivado do ator Admin autenticado.

### Semântica de criação na primeira gravação

O primeiro `POST` bem-sucedido cria o registro singleton.

Expectativa atual:
- a primeira atualização persistente deve usar `expected_version = 0`

### Resposta de sucesso

Estado:
- `200 OK`

Forma:

```json
{
  "subscription_settings": {
    "settings_key": "global",
    "default_trial_days": 21,
    "dunning_retry_intervals": [45, 180, 720],
    "max_dunning_attempts": 3,
    "default_renewal_behavior": "require_review_for_pending_changes",
    "default_cancellation_behavior": "allow_direct_cancellation",
    "version": 1,
    "updated_by": "user_01ABC",
    "updated_at": "2026-04-03T14:00:00.000Z",
    "metadata": {
      "audit_log": [
        {
          "action": "update_settings",
          "who": "user_01ABC",
          "when": "2026-04-03T14:00:00.000Z",
          "reason": "admin_save",
          "previous_version": 0,
          "next_version": 1,
          "change_summary": [
            {
              "field": "default_trial_days",
              "from": 0,
              "to": 21
            }
          ]
        }
      ],
      "last_update": {
        "action": "update_settings",
        "who": "user_01ABC",
        "when": "2026-04-03T14:00:00.000Z",
        "reason": "admin_save",
        "previous_version": 0,
        "next_version": 1,
        "change_summary": [
          {
            "field": "default_trial_days",
            "from": 0,
            "to": 21
          }
        ]
      }
    },
    "is_persisted": true
  }
}
```

## Regras de validação

Regras atuais de validação de solicitação:
- `default_trial_days >= 0`
- `max_dunning_attempts > 0`
- `expected_version >= 0`
- `dunning_retry_intervals` deve conter apenas números inteiros positivos
- `dunning_retry_intervals` deve ser estritamente crescente sem duplicatas
- `max_dunning_attempts` deve corresponder ao número de intervalos de repetição
- os campos de comportamento devem corresponder aos valores enum suportados

A validação é aplicada em duas camadas:
- Zod no limite da API
- validação de domínio no módulo de configurações e fluxo de trabalho

## Semântica de Erros

### `400 invalid_data`

Devolvido por:
- intervalos escalares inválidos
- valores enum inválidos
- listas de intervalos de repetição inválidas
- agendamento de novas tentativas inconsistente versus `max_dunning_attempts`

### `409 conflict`

Devolvido por:
- obsoleto `expected_version`
- incompatibilidade de bloqueio otimista entre a solicitação enviada e a versão atual das configurações persistentes

### `500 unexpected_state`

Devolvido por:
- fluxo de trabalho inesperado ou falhas de persistência

## Limites atuais do MVP

A API atual intencionalmente não inclui:
- `POST /admin/subscription-settings/reset`
- endpoints de histórico separados
- endpoints de navegação dedicados no changelog
- restrições de rota baseadas em funções além do acesso de administrador autenticado
