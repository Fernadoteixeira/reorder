# API de configurações de assinatura do administrador

Este documento descreve o contrato atual da API de administração para a área `Subscription Settings` do plug-in `Reorder`.

Este documento pretende ser a fonte oficial de referência atual para:
- formatos de solicitação e resposta
- semântica de fallback versus semântica persistida
- comportamento do bloqueio otimista
- validação e mapeamento de erros

Todas as rotas descritas aqui são rotas personalizadas do Admin expostas pelo plug-in e destinadas a usuários autenticados do Medusa Admin.

## Caminho base

Todas as rotas estão em:

`/admin/subscription-settings`

## Autenticação

A implementação atual utiliza rotas de administrador autenticadas.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação das solicitações é feita por meio do middleware Medusa e dos esquemas Zod
- os manipuladores de rota permanecem simples e delegam tarefas ao serviço de configurações ou ao fluxo de trabalho de atualização

O MVP atual ainda não inclui uma camada dedicada de permissões baseadas em funções além do acesso de administrador autenticado.

## Estrutura do DTO compartilhado

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

## Semântica de campos compartilhados

- `settings_key`
  Sempre `global` no MVP.
- `default_trial_days`
  Número inteiro de dias de avaliação.
- `dunning_retry_intervals`
  Intervalo entre tentativas, expresso em minutos.
- `max_dunning_attempts`
  Número máximo de tentativas de repetição para fluxos de cobrança recém-criados.
- `default_renewal_behavior`
  Política global padrão de renovação para decisões de renovação no momento da criação.
- `default_cancellation_behavior`
  Política global padrão de cancelamento para decisões de cancelamento no momento da criação.
- `version`
  Versão monotônica usada para bloqueio otimista.
- `updated_by`
  ID do ator da última atualização persistida bem-sucedida, ou `null` quando não houver nenhum registro persistido.
- `updated_at`
  Carimbo de data/hora da última atualização persistida bem-sucedida, ou `null` quando não houver nenhum registro persistido.
- `metadata`
  Metadados técnicos, incluindo `audit_log` e `last_update`.
- `is_persisted`
  `false` quando a resposta é construída a partir de padrões de fallback, `true` quando provém do singleton armazenado.

## 1. Defina configurações eficazes

### Ponto final

- Método: `GET`
- Caminho: `/admin/subscription-settings`

### Objetivo

Retorna a carga útil das configurações efetivas utilizada pela página “Configurações de administração” e pelos consumidores em tempo de execução.

### Resposta de sucesso

Status:
- `200 OK`

Comportamento:
- retorna valores padrão de fallback quando não existe nenhum singleton persistido
- nunca retorna `404` apenas porque o registro de configurações ainda não foi criado

### Exemplo de resposta alternativa

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

### Exemplo de resposta persistida

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

### Objetivo

Persiste um registro de configurações único, novo ou atualizado, por meio do fluxo de trabalho dedicado.

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
- Os campos de configuração omitidos mantêm seu valor efetivo atual.
- `updated_by` é derivado do ator Admin autenticado.

### Semântica “Create-on-First-Write”

O primeiro `POST` bem-sucedido cria o registro singleton.

Expectativa atual:
- a primeira atualização persistida deve usar `expected_version = 0`

### Resposta de sucesso

Status:
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

Regras atuais de validação da solicitação:
- `default_trial_days >= 0`
- `max_dunning_attempts > 0`
- `expected_version >= 0`
- `dunning_retry_intervals` deve conter apenas números inteiros positivos
- `dunning_retry_intervals` deve ser estritamente crescente e sem duplicatas
- `max_dunning_attempts` deve corresponder ao número de intervalos de repetição
- os campos de comportamento devem corresponder aos valores de enumeração suportados

A validação é aplicada em duas camadas:
- Zod no limite da API
- validação de domínio no módulo de configurações e no fluxo de trabalho

## Semântica dos erros

### `400 invalid_data`

Retornado devido a:
- intervalos escalares inválidos
- valores de enumeração inválidos
- listas de intervalos de repetição inválidas
- inconsistência na programação de repetições em relação a `max_dunning_attempts`

### `409 conflict`

Devolvido por:
- `expected_version` obsoleto
- incompatibilidade de bloqueio otimista entre a solicitação enviada e a versão atual das configurações persistidas

### `500 unexpected_state`

Devolvido por:
- falhas inesperadas no fluxo de trabalho ou na persistência

## Limites atuais do MVP

A API atual não inclui, intencionalmente:
- `POST /admin/subscription-settings/reset`
- endpoints separados para o histórico
- endpoints dedicados para navegação no changelog
- restrições de rota baseadas em funções além do acesso de administrador autenticado
