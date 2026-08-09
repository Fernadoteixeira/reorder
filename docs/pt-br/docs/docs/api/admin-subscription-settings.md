# API de configurações de assinatura de administrador

Este documento descreve o contrato atual da API Admin para a área `Configurações de assinatura` do plugin `Reorder`.

Pretende ser a fonte atual de verdade para:
- formas de solicitação e resposta
- fallback versus semântica persistente
- comportamento de bloqueio otimista
- validação e mapeamento de erros

Todas as rotas descritas aqui são rotas administrativas personalizadas expostas pelo plugin e destinadas a usuários autenticados do Medusa Admin.

## Caminho Básico

Todas as rotas estão em:

`/admin/configurações-de-assinatura`

## Autenticação

A implementação atual utiliza rotas de administrador autenticadas.

Em termos de implementação:
- as rotas utilizam `AuthenticatedMedusaRequest`
- a validação da solicitação é feita por meio do middleware do Medusa e dos esquemas do Zod
- os manipuladores de rota permanecem leves e delegam tarefas ao serviço de configurações ou ao fluxo de trabalho de atualização

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
  Número inteiro de dias de período de teste.
- `dunning_retry_intervals`
  Intervalo de repetição expresso em minutos.
- `max_dunning_attempts`
  Número máximo de tentativas de repetição para fluxos de cobrança recém-criados.
- `default_renewal_behavior`
  Política global padrão de renovação para decisões de renovação no momento da criação.
- `default_cancellation_behavior`
  Política global padrão de cancelamento para decisões de cancelamento no momento da criação.
- `version`
  Versão monotônica usada para bloqueio otimista.
- `updated_by`
  ID do ator da última atualização persistida com sucesso ou `null` quando não houver nenhum registro persistido.
- `updated_at`
  Carimbo de data/hora da última atualização persistida com sucesso ou `null` quando não houver nenhum registro persistido.
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
- `default_trial_days?: número`
- `dunning_retry_intervals?: número[]`
- `max_dunning_attempts?: número`
- `default_renewal_behavior?: "process_immediately" | "require_review_for_pending_changes"`
- `default_cancellation_behavior?: "recommend_retention_first" | "allow_direct_cancellation"`
- `expected_version?: número`
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
- `versão_esperada >= 0`
- `dunning_retry_intervals` deve conter apenas números inteiros positivos
- `dunning_retry_intervals` deve ser estritamente crescente sem duplicatas
- `max_dunning_attempts` deve corresponder ao número de intervalos de repetição
- os campos de comportamento devem corresponder aos valores enum suportados

A validação é aplicada em duas camadas:
- Zod no limite da API
- validação de domínio no módulo de configurações e fluxo de trabalho

## Semântica de Erros

### `400 dados_inválidos`

Devolvido por:
- intervalos escalares inválidos
- valores enum inválidos
- listas de intervalos de repetição inválidas
- agendamento de novas tentativas inconsistente versus `max_dunning_attempts`

### `409 conflito`

Devolvido por:
- `versão_esperada` obsoleta
- incompatibilidade de bloqueio otimista entre a solicitação enviada e a versão atual das configurações persistentes

### `500 estado_inesperado`

Devolvido por:
- fluxo de trabalho inesperado ou falhas de persistência

## Limites atuais do MVP

A API atual intencionalmente não inclui:
- `POST /admin/configurações de assinatura/reset`
- endpoints de histórico separados
- endpoints de navegação dedicados no changelog
- restrições de rota baseadas em funções além do acesso de administrador autenticado
