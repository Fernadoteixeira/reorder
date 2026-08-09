# Arquitetura de configurações

Este documento descreve o limite arquitetônico previsto para a área `Settings` no plug-in `Reorder`.

É a fonte de verdade em tempo de execução para:
- regras de propriedade e de fonte de verdade
- escopo de `SubscriptionSettings`
- semântica de leitura em tempo de execução versus semântica de processo persistido
- limites de efeito voltados para operadores em caso de alterações de configuração

## Objetivo

A área `Settings` fornece configuração global em tempo de execução para o comportamento do comércio recorrente gerenciado pelo plug-in.

Seu objetivo é:
- disponibilizar um único local para valores padrão globais e valores de política
- permitir que usuários com privilégios de administrador gerenciem o comportamento em tempo de execução sem precisar reimplantar o store
- fornecer valores de configuração estáveis para `Subscriptions`, `Renewals`, `Dunning` e `Cancellation & Retention`

Seu objetivo não é:
- tornar-se a fonte de verdade para o estado do domínio
- reescrever retroativamente assinaturas ativas ou registros de processo
- substituir decisões operacionais persistentes já armazenadas nos módulos do domínio

## Função de arquitetura

`SubscriptionSettings` são um registro de política global de tempo de execução.

Eles se destinam a conter:
- valores padrão globais
- limites globais
- comportamentos padrão globais utilizados quando uma nova operação é iniciada

Eles não se destinam a controlar:
- o estado do ciclo de vida da assinatura
- o estado do ciclo de renovação
- o estado do caso de cobrança
- o estado do caso de cancelamento

Isso significa que a área `Settings` é um domínio de configuração, e não um domínio operacional.

## Escopo

Para o MVP, `SubscriptionSettings` deve ser:
- global
- singleton
- válido para todo o plugin

Isso significa:
- um único registro de configurações ativo para todo o tempo de execução do plugin `Reorder`
- nenhum registro de configurações por assinatura
- nenhum registro de configurações por produto
- nenhum registro de configurações por loja no MVP

A abordagem de singleton global é preferível porque:
- o restante do plug-in segue, atualmente, um único limite de comércio recorrente
- os recursos implementados ainda não modelam a propriedade separada da configuração no nível da loja
- ela mantém o comportamento em tempo de execução previsível e mais simples de operar

## Regras da “Fonte da Verdade”

A área `Settings` segue estas regras de “fonte de verdade”:

- `SubscriptionSettings` são a fonte de referência para os padrões globais de tempo de execução e os valores das políticas.
- Os módulos de domínio continuam sendo a fonte de referência para o estado operacional persistido.
- Um instantâneo persistido local do processo tem precedência sobre uma alteração posterior nas configurações globais.

Essa regra é fundamental.

Isso impede que uma atualização da configuração global reescreva silenciosamente o estado operacional ativo em:
- `Renewals`
- `Dunning`
- `Cancellation & Retention`

## Relação com os módulos existentes

### Relação com `Subscriptions`

`Subscriptions` continuam sendo a fonte de verdade para:
- estado do ciclo de vida
- cadência
- semântica de cancelamento efetivo
- instantâneos persistidos no agregado da assinatura

`SubscriptionSettings` pode fornecer:
- valores de teste padrão
- valores padrão futuros em tempo de execução, utilizados ao criar ou preparar novas operações de assinatura

`SubscriptionSettings` não deve reescrever retroativamente:
- registros de assinatura existentes;
- valores de avaliação existentes já armazenados em uma assinatura

### Relação com `Renewals`

`Renewals` continua sendo a fonte de referência para:
- estado do ciclo de renovação
- estado de aprovação
- resultados da execução

`SubscriptionSettings` pode fornecer:
- comportamento padrão de renovação aplicado quando uma nova operação de renovação é iniciada

O `SubscriptionSettings` não deve reescrever retroativamente:
- registros do `RenewalCycle` já criados;
- decisões de renovação ou estado de execução já armazenados

### Relação com `Dunning`

`Dunning` continua sendo a fonte de referência para:
- status do caso de cobrança
- histórico de tentativas de repetição
- programações de repetição armazenadas em casos ativos

`SubscriptionSettings` pode fornecer:
- a programação padrão de novas tentativas para casos de cobrança recém-criados
- a política padrão de número máximo de tentativas utilizada quando um novo processo de cobrança é iniciado

O `SubscriptionSettings` não deve reescrever retroativamente:
- os cronogramas de novas tentativas de registros do `DunningCase` já ativos;
- o estado que já foi persistido em um processo de cobrança

Isso é especialmente importante para a segurança operacional.

A alteração das configurações globais de cobrança não deve alterar silenciosamente os fluxos de recuperação já em andamento.

### Relação com `Cancellation & Retention`

`Cancellation & Retention` continua sendo a fonte de referência para:
- estado do caso de cancelamento
- estado da recomendação e do resultado
- decisões de retenção armazenadas

`SubscriptionSettings` pode fornecer:
- comportamento padrão de cancelamento utilizado quando um novo fluxo de cancelamento é iniciado

`SubscriptionSettings` não deve reescrever retroativamente:
- casos de cancelamento já abertos;
- resultados de retenção ou cancelamento já finalizados

### Relação com `Activity Log`

`Activity Log` continua sendo a fonte de referência para:
- histórico de auditoria, apenas para acréscimos, das atualizações de configurações e operações do domínio

O `Settings` deve gerar eventos de auditoria para:
- quem alterou as configurações;
- quando as configurações foram alteradas;
- quais campos foram alterados

Mas `Activity Log` não é a fonte de referência para o próprio registro de configurações.

## Semântica de leitura em tempo de execução versus semântica de instantâneo persistido

A área `Settings` deve distinguir explicitamente entre:
- valores lidos em tempo de execução quando uma nova operação é iniciada
- valores já capturados em um instantâneo de um processo existente

### Configurações de leitura em tempo de execução

Esses são valores que devem ser lidos de `SubscriptionSettings` quando uma nova operação é iniciada.

Exemplos:
- comportamento padrão do período de teste para uma nova operação relacionada à assinatura
- comportamento padrão de renovação para um caminho de renovação recém-iniciado
- comportamento padrão de cancelamento para um fluxo de cancelamento recém-iniciado
- programação padrão de novas tentativas de cobrança para um caso de cobrança recém-criado

### Instantâneos de processos persistentes

Assim que um fluxo de trabalho persiste o estado operacional em uma entidade de domínio ou em um agregado de processo, esse estado persistido passa a ser determinante para esse processo.

Exemplos:
- um `DunningCase.retry_schedule` já armazenado em um caso ativo
- uma recomendação ou caminho padrão já gravado em um `CancellationCase`
- um registro de execução de renovação já criado com seu próprio contexto de decisão

Nesses casos:
- o estado do processo armazenado prevalece
- uma atualização posterior nas configurações globais não sobrescreve esse processo existente

## Semântica do Tempo Efetivo

No MVP, as alterações nas configurações devem se aplicar a:
- operações futuras
- estado do processo recém-criado

Elas não devem ser aplicadas automaticamente a:
- assinaturas já registradas;
- processos de cobrança já em andamento;
- processos de cancelamento já em andamento;
- ciclos de renovação já criados nos quais a decisão relevante já tenha sido registrada

Este é o modelo de operação mais seguro e mais claro.

Isso evita atualizações em massa ocultas e mantém estável o comportamento histórico do processo.

## Histórico de auditoria e registro de alterações

Para o MVP, `SubscriptionSettings`, use um modelo leve de registro de alterações.

A trilha de auditoria implementada consiste em:
- campos de registro escalares:
  - `version`
  - `updated_by`
  - `updated_at`
- `metadata.audit_log` como o histórico de alterações armazenado de forma persistente
- `metadata.last_update` como um instantâneo de conveniência da alteração mais recente
- eventos estruturados do log operacional:
  - `settings.update`

### Decisão sobre o MVP

No MVP, `metadata.audit_log` é o registro de alterações.

Isso significa que:
- ainda não adicionamos uma entidade `settings_change` separada, apenas para acréscimos;
- ainda não adicionamos uma tabela dedicada ao histórico de configurações;
- o registro de configurações continua sendo a fonte de verdade para a configuração atual;
- `metadata.audit_log` continua sendo a fonte de verdade para o histórico de alterações simplificado

Isso é proposital.

Ao contrário de:
- histórico de execuções de renovação
- histórico de tentativas de cobrança de cobranças em atraso
- histórico de ofertas de retenção
- eventos comerciais de assinatura em `Activity Log`

O histórico de versões das configurações ainda não é um domínio operacional autônomo com requisitos independentes de consulta ou fluxo de trabalho.

### Contrato de Registro de Auditoria

Cada entrada `metadata.audit_log` deve utilizar o mesmo contrato estável:
- `action`
- `who`
- `when`
- `reason`
- `previous_version`
- `next_version`
- `change_summary`

O `change_summary` foi concebido para ser compacto e de fácil compreensão pelo operador.

Para o MVP, deve-se descrever:
- quais campos foram alterados
- o valor escalar ou de lista anterior
- o próximo valor escalar ou de lista

Não deve tentar armazenar:
- cópias completas do histórico de todo o registro de configurações
- diferenças arbitrárias de metadados
- linhas de histórico separadas, desvinculadas do agregado de configurações

### Função do `version`

`version` não é o próprio registro de alterações.

Ele existe principalmente para:
- bloqueio otimista
- ordenação de alterações
- correlação de entradas de auditoria com atualizações persistidas

A legibilidade histórica provém de:
- `metadata.audit_log`
- `metadata.last_update`
- `settings.update` registros estruturados

### Caminho de progressão futuro

Se os requisitos futuros incluírem:
- navegação pelo histórico extenso de configurações na área de administração
- filtragem por responsável ou tipo de alteração
- regras de retenção e paginação para o histórico
- pontos de extremidade de consulta separados para o histórico de configurações
- armazenamento do tipo “somente acréscimo”, orientado por conformidade

nesse caso, o próximo passo correto é um registro `settings_change` dedicado, apenas para acréscimos.

Esse modelo futuro complementaria o registro de configurações único, em vez de substituí-lo.

## Semântica da comunicação entre operadores

A interface de usuário administrativa deve indicar claramente os limites de efeito.

A mensagem pretendida é:
- as alterações se aplicam a operações futuras
- os casos ativos existentes mantêm sua configuração armazenada

Texto recomendado para a interface de usuário de Configurações:

`Changes apply to future operations and newly created process state. Existing active cases keep their persisted configuration.`

Essa redação deve ser refletida em:
- a experiência do usuário (UX) ao salvar na página de Configurações
- mensagens de confirmação para alterações significativas
- documentação e expectativas de teste

## Decisão arquitetônica para o MVP

Para o MVP, a área `Settings` deve seguir esta decisão:

- um registro singleton global `SubscriptionSettings`
- fonte de verdade em tempo de execução respaldada pelo banco de dados
- valores padrão opcionais de fallback apenas quando o registro ainda não existir
- configurações lidas no início da operação para uso futuro
- sem reescrita retroativa do estado operacional persistido
- instantâneos persistidos locais ao processo têm precedência sobre alterações posteriores nas configurações globais

Isso mantém o recurso alinhado com:
- os princípios de isolamento de módulos do Medusa
- a arquitetura de plug-ins existente
- um comportamento operacional seguro para `Renewals`, `Dunning` e `Cancellation & Retention`

## Fonte de verdade em tempo de execução e Bootstrap

A fonte de verdade implementada em tempo de execução é:
- o registro singleton `subscription_settings` armazenado persistentemente no módulo `settings`

Semântica atual do bootstrap:
- o registro do banco de dados é a principal fonte de verdade em tempo de execução
- os valores padrão de fallback são usados apenas quando o registro singleton ainda não existe
- `GET /admin/subscription-settings` retorna as configurações efetivas, e não `404`
- o singleton é criado de forma preguiçosa na primeira atualização bem-sucedida

Assim que o registro persistido existir:
- os valores padrão de fallback deixam de ser válidos
- as leituras em tempo de execução utilizam o singleton armazenado

## Modelo de persistência implementado

O modelo de persistência atual é:
- um único registro global (singleton)
- indexado por `settings_key = "global"`
- semântica de singleton exclusiva aplicada no nível do modelo de dados

Os registros armazenados:
- `default_trial_days`
- `dunning_retry_intervals`
- `max_dunning_attempts`
- `default_renewal_behavior`
- `default_cancellation_behavior`
- `version`
- `updated_by`
- `updated_at`
- `metadata`

A implementação atual não oferece suporte a:
- configurações específicas por loja
- configurações específicas por produto
- propriedade das configurações em ambiente multilocatário

## Semântica de serviços e atualizações

O limite do serviço implementado oferece:
- `getSettings()`
- `updateSettings()`
- `resetSettings()`

Comportamento atual:
- `getSettings()` retorna as configurações efetivas mesmo quando não há nenhum registro persistido
- `updateSettings()` realiza a criação diferida na primeira gravação
- `updateSettings()` incrementa `version` a cada atualização persistida bem-sucedida
- `resetSettings()` remove o singleton persistido e retorna os padrões de fallback efetivos

Atualmente, a validação e a normalização são aplicadas no módulo de configurações antes da persistência:
- `default_trial_days >= 0`
- `max_dunning_attempts > 0`
- `dunning_retry_intervals` devem ser números inteiros positivos
- os intervalos de repetição devem ser estritamente crescentes
- `max_dunning_attempts` deve corresponder ao número de intervalos de repetição

## Fluxo de trabalho e bloqueio otimista

As gravações de configurações são implementadas por meio do fluxo de trabalho dedicado:
- `update-subscription-settings`

Responsabilidades atuais do fluxo de trabalho:
- carregar as configurações atualmente em vigor
- validar `expected_version`
- salvar o próximo estado das configurações
- anexar metadados de auditoria
- gerar registros estruturados de `settings.update`
- compensar em caso de falha

Usos do bloqueio otimista:
- `expected_version`

Regras atuais:
- a primeira gravação persistida deve conter `0`
- as gravações posteriores devem corresponder ao valor `version` atualmente persistido
- a incompatibilidade de versão gera um conflito

Semântica de compensação:
- se um novo registro de configurações foi criado e uma etapa posterior falhar, a reversão retorna ao estado de fallback
- se um singleton existente foi atualizado e uma etapa posterior falhar, a reversão restaura o estado persistente anterior

## Implementação da conexão em tempo de execução

A integração atual no ambiente de execução está intencionalmente restrita ao comportamento na hora da criação ou no início da operação.

### Cobrança

O `Dunning` lê as configurações efetivas quando um novo `DunningCase` é criado.

Uso atual:
- programação padrão de novas tentativas
- número máximo padrão de tentativas

Esses valores são registrados nos metadados do caso criado da seguinte forma:
- `metadata.settings_policy`

Os casos de cobrança ativos existentes não são atualizados quando as configurações globais são alteradas posteriormente.

### Cancelamento

O `Cancellation & Retention` lê as configurações efetivas quando um novo `CancellationCase` é criado.

Uso atual:
- instantâneo do comportamento padrão de cancelamento

A política selecionada é armazenada nos metadados do caso.

Os casos de cancelamento ativos existentes não são reescritos quando as configurações globais são alteradas posteriormente.

### Renovações

`Renewals` lê as configurações em vigor quando um novo `RenewalCycle` é criado.

Uso atual:
- comportamento padrão de renovação no momento da criação

O comportamento selecionado é registrado nos metadados do ciclo.

Os ciclos existentes não são reescritos retroativamente apenas porque as configurações globais foram alteradas.

Se um ciclo existente precisar, posteriormente, de um recálculo do estado de aprovação devido a uma alteração na assinatura, ele será recalculado usando a política de configurações persistentes do ciclo, e não as configurações globais mais recentes, por padrão.

## Interface de administração e carregamento de dados

A página de administração implementada está localizada em:
- `/app/settings/subscription-settings`

A interface do usuário segue as convenções atuais da página de administração do Medusa:
- exibição da consulta carregada na montagem
- fluxo de salvamento baseado em mutação
- validação inline
- mensagens de aviso e impacto
- invalidação da consulta após a atualização

A página informa os limites do efeito pretendido:
- as alterações se aplicam a operações futuras
- o estado atual do processo ativo mantém sua configuração persistida

## Limites atuais do MVP

A implementação atual não inclui, intencionalmente:
- armazenamento dedicado do tipo “somente adição” (`settings_change`)
- consultas separadas ao histórico de configurações
- endpoint de redefinição na API de administração
- restrição de rotas baseada em funções além do acesso de administrador autenticado
- configuração por loja

Esses continuam sendo pontos de expansão futura, e não requisitos atuais de tempo de execução.

## Colocação de administradores

A interface de usuário de configurações deve ficar na seção Medusa Admin `Settings`, e não na seção `Subscriptions`.

Esse é o limite correto porque:
- o registro é global
- a página é orientada à configuração, e não à fila ou ao registro
- ela se encaixa no padrão da página de configurações de administração do Medusa

## Contrato `SubscriptionSettings`

Para o MVP, o registro `SubscriptionSettings` deve expor este contrato:

- `default_trial_days: number`
- `dunning_retry_intervals: number[]`
- `max_dunning_attempts: number`
- `default_renewal_behavior: SubscriptionRenewalBehavior`
- `default_cancellation_behavior: SubscriptionCancellationBehavior`
- `version: number`
- `updated_by: string | null`
- `updated_at: string`

Este contrato deve permanecer estável em:
- o modelo de banco de dados
- o serviço de configurações
- o fluxo de trabalho de atualização
- a API de administração
- o formulário de administração

## Semântica de campos

### `default_trial_days`

`default_trial_days` significa:
- a duração padrão global do período de teste em dias

Regras:
- número inteiro
- `>= 0`
- `0` significa que não há tentativa padrão

Esse valor deve ser usado apenas quando:
- uma nova operação precisar de um valor padrão global para o teste

Não deve:
- reescrever retroativamente os valores de teste já armazenados nas assinaturas existentes

### `dunning_retry_intervals`

`dunning_retry_intervals` significa:
- a programação padrão de novas tentativas para processos de cobrança recém-criados

A unidade canônica para o MVP deve ser:
- minutos

Essa opção é preferível porque o código de execução atual do sistema de cobrança já modela os intervalos de repetição como valores numéricos de programação compatíveis com a semântica baseada em minutos.

Regras:
- matriz de números inteiros positivos
- estritamente crescente
- sem valores zero
- sem valores negativos
- sem valores repetidos

Exemplo:
- `[1440, 4320, 10080]`

Esse valor deve ser usado apenas quando:
- for criada uma nova programação de repetição `DunningCase` ou equivalente

Não deve:
- reescrever retroativamente os cronogramas de novas tentativas já armazenados em casos de cobrança pendentes

### `max_dunning_attempts`

`max_dunning_attempts` significa:
- o número máximo de tentativas de repetição permitidas para processos de cobrança recém-criados

Regras:
- número inteiro positivo
- deve ser consistente com `dunning_retry_intervals`

Regra MVP recomendada:
- `max_dunning_attempts === dunning_retry_intervals.length`

Isso mantém o contrato simples e elimina ambiguidades quanto à interpretação do cronograma de novas tentativas.

### `version`

`version` significa:
- o número de versão monotônico do registro de configurações singleton

Destina-se a:
- bloqueio otimista
- detecção de conflitos de atualização
- rastreabilidade operacional

Regras:
- número inteiro
- incrementado a cada atualização bem-sucedida

Esta não é uma versão de recurso nem uma versão de produto.

Trata-se apenas da versão do registro de configurações.

### `updated_by`

`updated_by` significa:
- o ator administrador ou o ator do sistema que atualizou as configurações pela última vez

Regras:
- `string | null`
- `null` é permitido para fluxos de inicialização de bootstrap ou padrão

### `updated_at`

`updated_at` significa:
- o carimbo de data/hora da última atualização bem-sucedida das configurações

É a fonte de verdade para:
- informações sobre a “última atualização” destinadas aos operadores
- correlação de auditorias

## `SubscriptionRenewalBehavior`

Para o MVP, `default_renewal_behavior` deve usar esta enumeração:

- `process_immediately`
- `require_review_for_pending_changes`

### `process_immediately`

Significado:
- quando uma operação de renovação é iniciada e nenhuma decisão específica sobre renovação, armazenada no sistema, a substitui, o sistema pode tratar a renovação como passível de processamento imediato, de acordo com as configurações globais

Isso não significa:
- ignorar as validações do fluxo de trabalho
- ignorar as verificações da política de ofertas
- ignorar as regras de aprovação já armazenadas em um `RenewalCycle`

Trata-se apenas de um comportamento padrão global.

### `require_review_for_pending_changes`

Significado:
- quando uma operação de renovação é iniciada e há um contexto de alteração passível de revisão, como `pending_update_data`, o sistema deve seguir, por padrão, o caminho de revisão/aprovação

Isso não significa:
- reescrever o estado de aprovação em um `RenewalCycle` já criado
- alterar retroativamente ciclos já gravados no estado de tempo de execução

## `SubscriptionCancellationBehavior`

Para o MVP, `default_cancellation_behavior` deve usar esta enumeração:

- `recommend_retention_first`
- `allow_direct_cancellation`

### `recommend_retention_first`

Significado:
- quando um novo fluxo de cancelamento é iniciado, a postura padrão do operador/sistema é dar início a um tratamento voltado para a retenção

Isso pode influenciar:
- as configurações padrão iniciais da interface do usuário
- a postura inicial de recomendação
- a seleção do caminho padrão no início do fluxo

Isso não significa:
- obrigar o cliente a aceitar a retenção;
- impedir o cancelamento definitivo;
- alterar um pedido de cancelamento já em andamento

### `allow_direct_cancellation`

Significado:
- quando um novo fluxo de cancelamento é iniciado, o sistema pode permitir um caminho de cancelamento direto como postura padrão

Isso não significa:
- ignorar as validações de cancelamento
- cancelar automaticamente sem levar em conta o contexto
- reescrever casos de cancelamento já em andamento

## Limites do contrato

Este contrato deve ser interpretado como:
- um contrato de política de tempo de execução global
- e não um instantâneo de política persistido por processo

Isso significa que:
- o registro de configurações define os valores padrão para operações futuras;
- os registros de domínio mantêm a propriedade das decisões operacionais já armazenadas

## Observação importante sobre o MVP

`default_renewal_behavior` é válido como campo de contrato para o MVP, mas só deve permanecer na interface de configurações implementada se puder ser integrado de forma clara à semântica de tempo de execução da renovação posteriormente, sem a necessidade de uma ampliação artificial do domínio.

Isso deve ser validado quando a etapa de integração em tempo de execução for implementada.

## Fonte da Verdade e Bootstrap

Para o MVP, a área `Settings` deve utilizar uma única hierarquia de fonte de verdade em tempo de execução:

1. registro persistido no banco de dados
2. valores padrão de substituição apenas quando o registro não existir

Essa hierarquia deve permanecer explícita e determinística.

## Fonte Primária da Verdade

A principal fonte de verdade para `SubscriptionSettings` deve ser:
- um registro único armazenado no banco de dados

Este registro do banco de dados deve ser considerado como:
- a configuração canônica de tempo de execução
- o registro utilizado pelas atualizações do Admin
- a fonte utilizada pelos fluxos de trabalho e tarefas, uma vez que esteja disponível

Isso é preferível porque:
- Os usuários administradores precisam de uma configuração editável em tempo de execução
- As configurações não devem exigir uma implantação para serem alteradas
- A configuração deve ser auditável e versionada

## O papel de `env` e da configuração estática

`env` ou a configuração estática não devem ser consideradas uma segunda fonte de verdade equivalente.

No MVP, `env/config` só pode ser usado como:
- valores padrão de fallback do bootstrap

Isso significa que:
- se não houver nenhum registro de configurações no banco de dados, as configurações efetivas poderão ser definidas com base nos valores padrão de fallback;
- se houver um registro de configurações no banco de dados, esse registro sempre prevalecerá

Depois que um registro é criado no banco de dados:
- `env/config` deixa de ser uma referência válida em tempo de execução

Isso evita o comportamento típico de uma configuração de “cérebro dividido”.

## Comportamento de `GET` quando falta um registro

Se ainda não houver nenhum registro de configuração:
- `GET /admin/subscription-settings` não deve retornar `404`

Em vez disso, ele deve retornar:
- uma carga útil de configurações efetiva
- criada a partir dos padrões e da configuração alternativa opcional

Isso oferece aos operadores de administração:
- uma página de configurações pronta para uso na primeira inicialização
- valores iniciais previsíveis
- ausência de um estado de erro específico para “registro ausente”

No âmbito do contrato, a resposta deve, posteriormente, distinguir entre:
- configurações persistentes
- configurações alternativas em vigor

Exemplos de metadados de resposta futuros aceitáveis:
- `is_persisted: boolean`
- ou `source: "database" | "fallback"`

## Estratégia de Bootstrap

No caso do MVP, o registro de configurações do singleton não deve ser criado pela migração.

Estratégia recomendada:
- criação diferida na primeira atualização

Motivos:
- as migrações não são o local adequado para padrões de negócios que podem variar de acordo com o ambiente
- isso simplifica a instalação de plug-ins
- os padrões de fallback continuam disponíveis mesmo antes da primeira gravação
- não há necessidade de vincular a criação do esquema do banco de dados à inserção de políticas de negócios

Isso significa que:
- o sistema pode iniciar mesmo sem uma linha `subscription_settings` existente
- o Admin `GET` continua funcionando por meio das configurações de fallback em vigor
- o primeiro `POST` bem-sucedido cria o registro canônico único

## Semântica das configurações efetivas

O sistema deve distinguir entre:
- configurações persistentes
- configurações alternativas em vigor

### Configurações salvas

Configurações persistentes significam que:
- existe um registro no banco de dados;
- ele é oficial;
- ele contém os valores reais persistidos `version`, `updated_by` e `updated_at`

### Configurações de fallback eficazes

Configurações de fallback eficazes significam:
- ainda não existe nenhum registro no banco de dados
- o sistema cria uma carga útil válida a partir dos valores padrão e da configuração opcional
- a carga útil está legível, mas ainda não foi gravada

Semântica MVP recomendada para cargas de fallback:
- `version = 0`
- `updated_by = null`
- `updated_at = null`

Isso garante a integridade do contrato e deixa claro que ainda não ocorreu nenhuma alteração persistente.

## Regras de precedência

As regras de precedência para `SubscriptionSettings` devem ser:

1. se houver um registro no banco de dados, use-o
2. se não houver nenhum registro no banco de dados, use os valores padrão de fallback válidos
3. uma atualização cria ou atualiza o singleton do banco de dados
4. depois que o singleton existir, a configuração de fallback não substitui mais o comportamento em tempo de execução

Essas regras devem permanecer estáveis em:
- o serviço de configurações
- o fluxo de trabalho de atualização
- o comportamento da API de administração
- as leituras em tempo de execução nos fluxos de trabalho de domínio

## Decisão arquitetônica para o MVP

Para o MVP, a fonte definitiva de verdade e a decisão inicial são:

- `subscription_settings` no banco de dados é a principal fonte de execução
- os valores padrão de fallback são permitidos apenas antes da existência do singleton
- `GET` retorna as configurações efetivas, e não `404`
- o singleton é criado de forma preguiçosa na primeira atualização
- uma vez persistido, o registro do banco de dados passa a ser a única fonte de execução oficial
