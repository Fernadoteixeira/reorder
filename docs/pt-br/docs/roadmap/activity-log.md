# Roteiro do registro de atividades

Este documento descreve o roteiro de acompanhamento para a área `Activity Log` após a implementação atual da v1.

É intencionalmente mais curto do que o roteiro principal do projeto e concentra-se apenas nas melhorias dos próximos passos para esta área.

## Status atual

`Activity Log` v1 é implementado e inclui:
- armazenamento `subscription_log` somente para acréscimos
- emissão de eventos apoiados por fluxo de trabalho
- API de leitura do administrador
- lista global de administradores
- detalhamento do evento
- cronograma por assinatura
- cobertura de testes de back-end e integração

## Modelo operacional atual

O modelo operacional atual é intencionalmente conservador:
- modelo de leitura instantânea
- sem limpeza automática de retenção
- sem ferramentas de exportação
- sem recursos de filtragem personalizados

Este é um limite v1 deliberado, não um descuido.

## Próximas melhorias lógicas

### 1. Retenção e Arquivamento

Potencial trabalho futuro:
- trabalho de arquivamento explícito
- política de eliminação explícita
- configuração de retenção visível ao operador

Isto só deve ser implementado quando:
- o crescimento do armazenamento torna-se operacionalmente significativo
- a conformidade ou a política do cliente exigem isso

### 2. Exportar

Potencial trabalho futuro:
- Exportação CSV para visualizações de log filtradas
- exportação de um cronograma de assinatura

Isso seria útil para:
- operações de apoio
- revisão de incidentes
- fluxos de trabalho de sucesso do cliente

### 3. Links cruzados mais ricos

Potencial trabalho futuro:
- links diretos dos detalhes do evento para:
  - detalhes de renovação
  - detalhes do caso de cobrança
  - detalhes do caso de cancelamento

Isso deve permanecer leve e não transformar o modelo de leitura em um enriquecimento pesado de tempo de execução.

### 4. Filtros e predefinições salvos

Potencial trabalho futuro:
- predefinições de operador persistentes
- visualizações filtradas em nível de equipe

Isto é útil somente depois que a lista base for comprovadamente estável operacionalmente.

### 5. Revisão Operacional

Potencial trabalho futuro:
- revisitar os índices se o volume de consultas aumentar
- revisitar o comportamento de pesquisa se a pesquisa atual que prioriza o instantâneo se tornar muito limitada
- adicionar painéis explícitos ou alertas assim que as linhas de base operacionais forem conhecidas

## Não metas para a próxima iteração

A próxima iteração ainda deve evitar:
- transformando `Activity Log` em telemetria geral
- armazenar instantâneos agregados completos
- incorporação de estado de link profundo de cada domínio em cada resposta de leitura

A área deve primeiro manter uma trilha de auditoria empresarial.
