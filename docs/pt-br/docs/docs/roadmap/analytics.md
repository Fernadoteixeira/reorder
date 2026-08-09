# Roteiro analítico

Este documento descreve o roteiro de acompanhamento para a área `Analytics` após a implementação atual do MVP.

Ele se concentra em:
- limites atuais do MVP
- capacidades conscientemente adiadas
- próximas melhorias lógicas para relatórios e operações

## Status atual

O MVP `Analytics` é implementado e inclui:
- instantâneos diários `subscription_metrics_daily`
- fluxo de trabalho de reconstrução compartilhado
- trabalho de reconstrução agendado
- gatilhos de reconstrução incremental para fluxos de trabalho de domínio selecionados
- API de leitura administrativa para KPI, tendências, exportação e reconstrução manual
- Página Admin Analytics com filtros, cartões KPI, tendências e exportação
- cobertura de teste de módulo, fluxo de trabalho, rota e fluxo administrativo
- verificações de qualidade de dados, controle de versão de métricas e observabilidade estruturada

## Limites atuais do MVP

A implementação atual é intencionalmente conservadora.

Atualmente, o sistema pressupõe ou impõe as seguintes restrições:
- uma moeda de relatório válida por conjunto de resultados para `MRR` e `LTV`
- apenas exportação síncrona
- verificações de anomalias baseadas em limites
- ausência de interface de usuário para comparação entre períodos
- ausência de segmentação avançada além dos filtros atuais

Esses limites são escolhas deliberadas do MVP, e não omissões acidentais.

## 1. Relatórios em várias moedas

Limitação atual:
- `MRR` e `LTV` assumem o valor `null` para conjuntos de dados com moedas mistas que não tenham uma base válida em uma única moeda

Possíveis trabalhos futuros:
- filtro explícito de moeda de relatório
- estratégia de normalização cambial
- instantâneos de normalização armazenados ou referências de taxas de câmbio
- especificações claras para exportações e gráficos com moedas mistas

Isso só deve ser implementado com uma regra de negócios documentada para:
- fonte da taxa;
- periodicidade da taxa;
- comportamento de reconstrução/preenchimento retroativo após alterações nas regras cambiais

## 2. Exportação assíncrona

Limitação atual:
- as exportações são síncronas e retornadas diretamente do endpoint de exportação do Admin

Possíveis trabalhos futuros:
- exportação assíncrona com suporte de fluxo de trabalho
- processamento em segundo plano para intervalos grandes
- histórico de exportações para download
- status da exportação visível para o operador

Isso se torna importante quando:
- o tamanho dos intervalos aumenta
- o volume de exportação aumenta
- a exportação síncrona começa a afetar a latência das solicitações

## 3. Detecção de anomalias mais abrangente

Limitação atual:
- as verificações de qualidade são baseadas em limites e intencionalmente simples

As verificações atuais se concentram em:
- Picos e quedas no `MRR`
- Picos na `churn_rate`
- Dias com instantâneos vazios ou incompletos

Possíveis trabalhos futuros:
- comparação com linhas de base móveis
- regras de anomalia semana a semana e mês a mês
- pontuação da gravidade das anomalias
- verificações de reconciliação mais detalhadas em relação às contagens do domínio de origem
- interfaces explícitas de anomalias voltadas para os operadores na área de administração

Isso deve continuar sendo explicável.

A camada de relatórios deve evitar uma pontuação de anomalias opaca que não possa ser justificada operacionalmente.

## 4. Comparar períodos

Limitação atual:
- o painel calcula internamente as comparações com o período anterior para as variações dos KPIs, mas não há um fluxo de trabalho dedicado à comparação entre períodos na interface do usuário

Possíveis trabalhos futuros:
- seletor explícito de período de comparação
- sobreposições do período anterior nas tendências
- predefinições de comparação com a última semana/último mês
- dados de exportação que levam em conta a comparação

Isso deve ser adicionado apenas se mantiver a consistência visual com os padrões do Medusa Admin e não sobrecarregar o painel.

## 5. Segmentação mais detalhada

Limitação atual:
- a segmentação está limitada a:
  - intervalo de datas
  - status da assinatura
  - produto
  - frequência
  - agrupamento por categorias

Potencial trabalho futuro:
- segmentação por coortes de clientes
- segmentação por plano ou oferta
- segmentação por resultado de cobrança ou rotatividade
- widgets detalhados de nível superior por produto, cadência ou categoria de motivo

Isto deve ser implementado somente após a confirmação de que o modelo de instantâneo e os índices permanecem eficientes para as dimensões expandidas.

## 6. Melhorias operacionais futuras

Potencial trabalho futuro:
- integração de alertas mais forte em registros analíticos estruturados
- painéis explícitos para latência de reconstrução e resultados de verificação de qualidade
- limites de anomalia configuráveis
- ferramentas de preenchimento instantâneo com progresso visível ao operador

Estas melhorias devem basear-se no atual modelo de observabilidade estruturada, em vez de substituí-lo.

## Não metas para a próxima iteração

A próxima iteração ainda deve evitar:
- transformar a análise em uma segunda fonte de verdade para o estado do ciclo de vida
- mixagem de módulos cruzados pesados ao vivo junta-se novamente ao caminho de leitura do administrador
- introdução de comportamento cambial oculto sem aprovação comercial explícita
- complicar demais a detecção de anomalias antes que a linha de base operacional atual seja compreendida

A área deverá permanecer:
- orientado para leitura
- instantâneo primeiro
- explícito sobre a semântica de negócios
