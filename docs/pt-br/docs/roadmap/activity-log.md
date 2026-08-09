# Roteiro do Registro de Atividades

Este documento descreve o roteiro de ações futuras para a área `Activity Log` após a implementação atual da v1.

Ele é intencionalmente mais conciso do que o roteiro principal do projeto e se concentra apenas nas melhorias a serem implementadas em seguida nessa área.

## Situação atual

A versão `Activity Log` v1 está implementada e inclui:
- armazenamento `subscription_log` somente para adição de dados
- emissão de eventos baseada em fluxo de trabalho
- API de leitura para administradores
- lista global de administradores
- detalhamento de eventos
- linha do tempo por assinatura
- cobertura de testes de back-end e de integração

## Modelo operacional atual

O modelo operacional atual é intencionalmente conservador:
- modelo de leitura com prioridade no snapshot
- sem limpeza automática de retenção
- sem ferramentas de exportação
- sem recursos de filtragem personalizada

Trata-se de uma delimitação deliberada da versão 1, e não de um descuido.

## Próximas melhorias lógicas

### 1. Retenção e arquivamento

Possíveis trabalhos futuros:
- tarefa de arquivamento explícita
- política de eliminação explícita
- configuração de retenção visível ao operador

Isso só deve ser implementado quando:
- o aumento do armazenamento se tornar significativo do ponto de vista operacional;
- houver exigência de conformidade ou de política do cliente

### 2. Exportar

Possíveis trabalhos futuros:
- Exportação em CSV para visualizações de logs filtradas
- Exportação da linha do tempo de uma assinatura

Isso seria útil para:
- operações de suporte
- análise de incidentes
- fluxos de trabalho de sucesso do cliente

### 3. Interligações mais abrangentes

Possíveis trabalhos futuros:
- links diretos da página de detalhes do evento para as seguintes páginas relacionadas:
  - detalhes da renovação
  - detalhes do caso de cobrança
  - detalhes do caso de cancelamento

Isso deve permanecer leve e não deve transformar o modelo de leitura em um enriquecimento pesado em tempo de execução.

### 4. Filtros e predefinições salvos

Possíveis trabalhos futuros:
- predefinições persistentes de operadores
- visualizações filtradas por equipe

Isso só é útil depois que a lista básica for comprovadamente estável do ponto de vista operacional.

### 5. Análise operacional

Possíveis trabalhos futuros:
- reavaliar os índices caso o volume de consultas aumente
- reavaliar o comportamento da pesquisa caso a pesquisa atual, que prioriza os snapshots, se torne muito limitada
- adicionar painéis ou alertas explícitos assim que as linhas de base operacionais forem conhecidas

## O que não deve ser objetivo na próxima iteração

A próxima versão ainda deve evitar:
- transformar `Activity Log` em telemetria geral
- armazenar instantâneos agregados completos
- incorporar o estado com links profundos de cada domínio em cada resposta de leitura

Essa área deve servir, antes de tudo, como um registro de auditoria comercial.
