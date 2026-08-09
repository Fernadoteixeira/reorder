# Roteiro de análise

Este documento descreve o roteiro de ações futuras para a área `Analytics` após a implementação atual do MVP.

O documento se concentra em:
- os limites atuais do MVP
- os recursos adiados de forma consciente
- as próximas melhorias lógicas para relatórios e operações

## Situação atual

O `Analytics` MVP foi implementado e inclui:
- instantâneos diários do `subscription_metrics_daily`
- fluxo de trabalho compartilhado de reconstrução
- tarefa agendada de reconstrução
- gatilhos de reconstrução incremental para fluxos de trabalho de domínios selecionados
- API de leitura administrativa para KPIs, tendências, exportação e reconstrução manual
- página de análise administrativa com filtros, cartões de KPIs, tendências e exportação
- cobertura de testes para módulos, fluxos de trabalho, rotas e fluxos administrativos
- verificações de qualidade de dados, controle de versões de métricas e observabilidade estruturada

## Limites atuais do MVP

A implementação atual é intencionalmente conservadora.

Atualmente, ele pressupõe ou impõe as seguintes restrições:
- uma moeda de relatório válida por conjunto de resultados para `MRR` e `LTV`
- apenas exportação síncrona
- verificações de anomalias baseadas em limites
- ausência de interface de usuário para comparação entre períodos
- ausência de segmentação avançada além dos filtros atuais

Esses limites são escolhas deliberadas do MVP, e não omissões acidentais.

## 1. Relatórios em várias moedas

Limitação atual:
- `MRR` e `LTV` passam a ser `null` para conjuntos de dados com moedas mistas que não tenham uma base válida em uma única moeda

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
- exportação assíncrona integrada ao fluxo de trabalho
- processamento em segundo plano para intervalos extensos
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
- Picos e quedas de `MRR`
- Picos de `churn_rate`
- Dias de snapshot vazios ou incompletos

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

Possíveis trabalhos futuros:
- segmentação por coortes de clientes
- segmentação por plano ou oferta
- segmentação por resultado de cobrança ou cancelamento de assinatura
- widgets de detalhamento de nível superior por produto, periodicidade ou categoria de motivo

Isso só deve ser implementado após se confirmar que o modelo de snapshot e os índices continuam eficientes para as dimensões ampliadas.

## 6. Melhorias operacionais futuras

Possíveis trabalhos futuros:
- integração mais robusta de alertas com base em logs de análise estruturados
- painéis específicos para latência de reconstrução e resultados de verificações de qualidade
- limites de anomalias configuráveis
- ferramentas de preenchimento retroativo de instantâneos com progresso visível para o operador

Essas melhorias devem se basear no atual modelo estruturado de observabilidade, em vez de substituí-lo.

## O que não deve ser objetivo na próxima iteração

A próxima iteração ainda deve evitar:
- transformar a análise de dados em uma segunda fonte de verdade para o estado do ciclo de vida
- reintroduzir junções pesadas entre módulos em tempo real no caminho de leitura do Admin
- introduzir comportamentos ocultos de FX sem aprovação explícita da área de negócios
- complicar excessivamente a detecção de anomalias antes que a linha de base operacional atual seja compreendida

A área deve permanecer:
- orientada para a leitura
- com prioridade para instantâneos
- explícita quanto à semântica de negócios
