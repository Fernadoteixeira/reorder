# Arquitetura de configurações

Este documento descreve o limite arquitetônico pretendido para a área `Settings` no plugin `Reorder`.

É a fonte da verdade em tempo de execução para:
- regras de propriedade e fonte da verdade
- escopo de `SubscriptionSettings`
- semântica de leitura em tempo de execução versus processo persistente
- limites de efeito voltados para o operador para alterações de configuração

## Meta

A área `Configurações` fornece configuração global de tempo de execução para comportamento de comércio recorrente gerenciado pelo plugin.

Seu objetivo é:
- expor um único local para padrões globais e valores de política
- permitir que usuários administradores gerenciem o comportamento do tempo de execução sem reimplantar a loja
- fornecer entradas de configuração estáveis para `Assinaturas`, `Renovações`, `Dunning` e `Cancelamento e Retenção`

Seu objetivo não é:
- tornar-se a fonte da verdade para o estado do domínio
- reescrever retroativamente assinaturas ativas ou processar registros
- substituir decisões operacionais persistentes já armazenadas em módulos de domínio

## Papel arquitetônico

`SubscriptionSettings` são um registro de política de tempo de execução global.

Destinam-se a possuir:
- valores padrão globais
- limites globais
- padrões de comportamento global usados quando uma nova operação começa

Eles não se destinam a possuir:
- estado do ciclo de vida da assinatura
- estado do ciclo de renovação
- estado do caso de cobrança
- estado do caso de cancelamento

Isso significa que a área `Configurações` é um domínio de configuração, não um domínio operacional.

## Escopo

Para MVP, `SubscriptionSettings` deve ser:
- global
- único
- em todo o plugin

Isso significa:
- um registro de configurações ativas para todo o tempo de execução do plugin `Reorder`
- nenhum registro de configurações por assinatura
- nenhum registro de configurações por produto
- nenhum registro de configurações por loja no MVP

A abordagem singleton global é preferida porque:
- o resto do plugin atualmente segue um limite de comércio recorrente
- os recursos implementados ainda não modelam a propriedade separada da configuração no nível da loja
- mantém o comportamento do tempo de execução previsível e mais simples de operar

## Regras da Fonte da Verdade

A área `Configurações` segue estas regras de fonte da verdade:

- `SubscriptionSettings` são a fonte da verdade para padrões globais de tempo de execução e valores de política.
- Os módulos de domínio continuam sendo a fonte da verdade para o estado operacional persistente.
- Um instantâneo persistente local do processo tem precedência sobre uma alteração posterior nas configurações globais.

Esta regra é crítica.

Impede que uma atualização de configuração global reescreva silenciosamente o estado operacional ativo em:
- `Renovações`
- `Cobrança`
- `Cancelamento e Retenção`

## Relação com módulos existentes

### Relação com `Assinaturas`

As `assinaturas` continuam sendo a fonte da verdade para:
- estado do ciclo de vida
- cadência
- semântica eficaz para cancelamento
- snapshots persistentes no agregado de assinaturas

`SubscriptionSettings` pode fornecer:
- valores de teste padrão
- padrões de tempo de execução futuros usados ao criar ou preparar novas operações de assinatura

`SubscriptionSettings` não deve reescrever retroativamente:
- registros de assinatura existentes
- valores de avaliação existentes já persistidos em uma assinatura

### Relação com `Renovações`

As `renovações` continuam a ser a fonte da verdade para:
- estado do ciclo de renovação
- estado de aprovação
- resultados de execução

`SubscriptionSettings` pode fornecer:
- comportamento de renovação padrão aplicado quando uma nova operação de renovação começa

`SubscriptionSettings` não deve reescrever retroativamente:
- registros `RenewalCycle` já criados
- decisões de renovação ou estado de execução já persistentes

### Relação com `Dunning`

`Dunning` continua sendo a fonte da verdade para:
- estado do caso de cobrança
- tentar novamente o histórico de tentativas
- agendamentos de novas tentativas persistentes em casos ativos

`SubscriptionSettings` pode fornecer:
- o agendamento de novas tentativas padrão para casos de cobrança recém-criados
- a política padrão de tentativa máxima usada quando um novo processo de cobrança é iniciado

`SubscriptionSettings` não deve reescrever retroativamente:
- novas tentativas de agendamentos de registros `DunningCase` já ativos
- indicar que já persistiu em um processo de cobrança

Isto é especialmente importante para a segurança operacional.

A alteração das configurações de cobrança globais não deve alterar silenciosamente os fluxos de recuperação já em andamento.

### Relação com `Cancelamento e Retenção`

`Cancelamento e Retenção` continua sendo a fonte da verdade para:
- estado do caso de cancelamento
- recomendação e estado do resultado
- decisões de retenção persistentes

`SubscriptionSettings` pode fornecer:
- comportamento de cancelamento padrão usado quando um novo fluxo de cancelamento é iniciado

`SubscriptionSettings` não deve reescrever retroativamente:
- casos de cancelamento já abertos
- resultados de retenção ou cancelamento já finalizados

### Relação com `Registro de atividades`

`Registro de atividades` continua sendo a fonte da verdade para:
- histórico de auditoria somente anexado de atualizações de configurações e operações de domínio

`Settings` deve emitir eventos de auditoria para:
- quem alterou as configurações
- quando as configurações foram alteradas
- quais campos foram alterados

Mas o `Registro de atividades` não é a fonte da verdade para o registro das configurações em si.

## Leitura em tempo de execução vs semântica de instantâneo persistente

A área `Configurações` deve distinguir explicitamente entre:
- valores lidos em tempo de execução quando uma nova operação é iniciada
- valores já capturados em um processo existente

### Configurações de leitura em tempo de execução

Estes são valores que devem ser lidos em `SubscriptionSettings` quando uma nova operação começa.

Exemplos:
- comportamento de teste padrão para uma nova operação relacionada à assinatura
- comportamento de renovação padrão para um caminho de renovação recém-iniciado
- comportamento de cancelamento padrão para um fluxo de cancelamento recém-aberto
- agendamento de nova tentativa de cobrança padrão para um caso de cobrança recém-criado

### Instantâneos de processos persistentes

Depois que um fluxo de trabalho tiver persistido o estado operacional em uma entidade de domínio ou agregado de processo, esse estado persistente se tornará oficial para esse processo.

Exemplos:
- um `DunningCase.retry_schedule` já armazenado em um caso ativo
- uma recomendação ou caminho padrão já persistido em um `CancellationCase`
- um registro de execução de renovação já criado com seu próprio contexto de decisão

Nestes casos:
- o estado do processo persistente vence
- uma atualização posterior nas configurações globais não reescreve o processo existente

## Semântica de Tempo Efetivo

Para MVP, as alterações nas configurações devem ser aplicadas a:
- operações futuras
- estado do processo recém-criado

Não devem aplicar-se automaticamente a:
- assinaturas já persistidas
- casos de cobrança já abertos
- casos de cancelamento já abertos
- ciclos de renovação já criados onde a decisão relevante foi persistida

Este é o modelo de operador mais seguro e claro.

Ele evita atualizações em massa ocultas e mantém estável o comportamento histórico do processo.

## Trilha de auditoria e registro de alterações

Para MVP, `SubscriptionSettings` usa um modelo leve de changelog.

A trilha de auditoria implementada consiste em:
- campos de registro escalar:
  - `versão`
  - `atualizado_por`
  - `atualizado_em`
- `metadata.audit_log` como o histórico de alterações persistentes
- `metadata.last_update` como um instantâneo conveniente da última alteração
- eventos de registro operacional estruturado:
  - `configurações.atualização`

### Decisão MVP

Para MVP, `metadata.audit_log` é o changelog.

Isso significa:
- ainda não adicionamos uma entidade `settings_change` separada somente para acréscimos
- ainda não adicionamos uma tabela dedicada de histórico de configurações
- o registro de configurações continua sendo a fonte da verdade para a configuração atual
- `metadata.audit_log` continua sendo a fonte da verdade para um histórico de alterações leve

Isso é intencional.

Ao contrário de:
- histórico de execução de renovação
- histórico de novas tentativas de cobrança
- histórico de ofertas de retenção
- eventos de negócios de assinatura em `Registro de atividades`

o histórico de versões de configurações ainda não é um domínio operacional independente com consultas independentes ou requisitos de fluxo de trabalho.

### Contrato de registro de auditoria

Cada entrada `metadata.audit_log` deve usar o mesmo contrato estável:
- `ação`
- `quem`
- `quando`
- `razão`
- `versão_anterior`
- `próxima_versão`
- `change_summary`

`change_summary` pretende permanecer compacto e legível pelo operador.

Para MVP deve descrever:
- quais campos foram alterados
- o valor escalar ou de lista anterior
- o próximo escalar ou valor de lista

Não deve tentar armazenar:
- cópias históricas completas de todo o registro de configurações
- diferenças arbitrárias de metadados
- linhas separadas do histórico separadas do agregado de configurações

### Papel da `versão`

`version` não é o changelog em si.

Existe principalmente para:
- bloqueio otimista
- ordenar alterações
- correlacionando entradas de auditoria com atualizações persistentes

A legibilidade histórica vem de:
- `metadata.audit_log`
- `metadata.last_update`
- registros estruturados `settings.update`

### Caminho de escalada futuro

Se os requisitos posteriores incluírem:
- navegando no longo histórico de configurações no Admin
- filtragem por ator ou tipo de mudança
- regras de retenção e paginação para histórico
- endpoints de consulta separados para histórico de configuração
- armazenamento somente de anexos orientado por conformidade

então o próximo passo correto é um registro `settings_change` dedicado apenas para acréscimos.

Esse modelo futuro complementaria o registro de configurações singleton, em vez de substituí-lo.

## Semântica de comunicação do operador

A UI Admin deve comunicar claramente o limite do efeito.

A mensagem pretendida é:
- alterações se aplicam a operações futuras
- os casos ativos existentes mantêm sua configuração persistente

Redação recomendada para a IU de configurações:

`As alterações se aplicam a operações futuras e ao estado do processo recém-criado. Os casos ativos existentes mantêm sua configuração persistente.`

Esta redação deve ser refletida em:
- a página Configurações salva UX
- mensagens de confirmação para mudanças impactantes
- documentação e expectativas de teste

## Decisão Arquitetônica para MVP

Para o MVP, a área `Settings` deve seguir esta decisão:

- um registro singleton global `SubscriptionSettings`
- Fonte de verdade em tempo de execução apoiada por banco de dados
- padrões de fallback opcionais somente quando o registro ainda não existe
- configurações lidas no início da operação para trabalhos futuros
- nenhuma reescrita retroativa do estado operacional persistente
- instantâneos persistentes locais do processo têm precedência sobre alterações posteriores nas configurações globais

Isso mantém o recurso alinhado com:
- Princípios de isolamento do módulo Medusa
- a arquitetura de plugins existente
- comportamento operacional seguro para `Renovações`, `Dunning` e `Cancelamento e Retenção`

## Fonte de verdade em tempo de execução e Bootstrap

A fonte da verdade em tempo de execução implementada é:
- registro persistido singleton `subscription_settings` no módulo `settings`

Current bootstrap semantics:
- o registro do banco de dados é a principal fonte de verdade em tempo de execução
- os padrões de fallback são usados somente quando o registro singleton ainda não existe
- `GET /admin/subscription-settings` retorna configurações efetivas, não `404`
- o singleton é criado preguiçosamente na primeira atualização bem-sucedida

Assim que o registro persistido existir:
- os padrões de fallback não são mais oficiais
- leituras em tempo de execução usam o singleton armazenado

## Modelo de Persistência Implementado

O modelo de persistência atual é:
- um registro singleton global
- digitado por `settings_key = "global"`
- semântica singleton exclusiva aplicada no nível do modelo de dados

Os armazenamentos de registros persistentes:
- `default_trial_days`
- `dunning_retry_intervals`
- `max_dunning_attempts`
- `default_renewal_behavior`
- `default_cancellation_behavior`
- `versão`
- `atualizado_por`
- `atualizado_em`
- `metadados`

A implementação atual não suporta:
- configurações por loja
- configurações por produto
- propriedade de configurações multilocatários

## Semântica de serviço e atualização

O limite de serviço implementado fornece:
- `getSettings()`
- `atualizarConfigurações()`
- `resetSettings()`

Comportamento atual:
- `getSettings()` retorna configurações efetivas mesmo quando não existe registro persistente
- `updateSettings()` executa criação lenta na primeira gravação
- `updateSettings()` incrementa `version` em cada atualização persistente bem-sucedida
- `resetSettings()` remove o singleton persistente e retorna padrões de fallback efetivos

A validação e a normalização são atualmente aplicadas no módulo de configurações antes da persistência:
- `default_trial_days >= 0`
- `max_dunning_attempts > 0`
- `dunning_retry_intervals` devem ser números inteiros positivos
- os intervalos de repetição devem ser estritamente crescentes
- `max_dunning_attempts` deve corresponder ao número de intervalos de repetição

## Fluxo de trabalho e bloqueio otimista

As gravações de configurações são implementadas por meio do fluxo de trabalho dedicado:
- `configurações de assinatura de atualização`

Responsabilidades atuais do fluxo de trabalho:
- carregar configurações efetivas atuais
- validar `versão_esperada`
- persistir no próximo estado de configurações
- anexar metadados de auditoria
- emitir logs estruturados `settings.update`
- compensar em caso de falha

Usos de bloqueio otimista:
- `versão_esperada`

Regras atuais:
- a primeira gravação persistente espera `0`
- as gravações posteriores devem corresponder à `versão` persistente atual
- incompatibilidade de versão retorna um conflito

Semântica de remuneração:
- se um novo registro de configurações foi criado e uma etapa posterior falhar, a reversão retornará ao estado de fallback
- se um singleton existente foi atualizado e uma etapa posterior falhar, a reversão restaura o estado persistente anterior

## Fiação de tempo de execução implementada

A integração de tempo de execução atual tem escopo intencional para o comportamento de tempo de criação ou início de operação.

### Cobrança

`Dunning` lê as configurações efetivas quando um novo `DunningCase` é criado.

Uso atual:
- agendamento de novas tentativas padrão
- tentativas máximas padrão

Esses valores são capturados nos metadados do caso criado como:
- `metadata.settings_policy`

Os casos de cobrança ativos existentes não são reescritos quando as configurações globais são alteradas posteriormente.

### Cancelamento

`Cancellation & Retention` lê as configurações efetivas quando um novo `CancellationCase` é criado.

Uso atual:
- instantâneo do comportamento de cancelamento padrão

A política escolhida é armazenada nos metadados do caso.

Os casos de cancelamento ativos existentes não são reescritos quando as configurações globais são alteradas posteriormente.

### Renovações

`Renewals` lê as configurações efetivas quando um novo `RenewalCycle` é criado.

Uso atual:
- comportamento de renovação padrão no momento da criação

O comportamento escolhido é capturado nos metadados do ciclo.

Os ciclos existentes não são reescritos retroativamente apenas porque as configurações globais foram alteradas.

Se um ciclo existente precisar posteriormente de recálculo do estado de aprovação porque a assinatura foi alterada, ele será recalculado usando a política de configurações persistentes do ciclo, e não as configurações globais mais recentes por padrão.

## Superfície administrativa e carregamento de dados

A página Admin implementada fica em:
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
- armazenamento `settings_change` dedicado apenas para acréscimos;
- consultas separadas ao histórico de configurações;
- endpoint de redefinição na API de administração;
- restrição de rotas baseada em funções além do acesso de administrador autenticado;
- configuração por loja

Esses continuam sendo pontos de expansão futura, e não requisitos atuais de tempo de execução.

## Colocação de administradores

A interface de usuário de configurações deve ficar na seção `Configurações` do Medusa Admin, e não em `Assinaturas`.

Esse é o limite correto porque:
- o registro é global
- a página é orientada à configuração, e não à fila ou ao registro
- ela se encaixa no padrão da página de configurações de administração do Medusa

## Contrato `SubscriptionSettings`

No MVP, o registro `SubscriptionSettings` deve expor este contrato:

- `default_trial_days: número`
- `dunning_retry_intervals: número[]`
- `max_dunning_attempts: número`
- `default_renewal_behavior: SubscriptionRenewalBehavior`
- `default_cancellation_behavior: SubscriptionCancellationBehavior`
- `version: número`
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
- a duração padrão global do período de teste, em dias

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
- for criado um novo `DunningCase` ou uma programação de repetição equivalente

Não deve:
- reescrever retroativamente os cronogramas de novas tentativas já armazenados em casos de cobrança pendentes

### `max_dunning_attempts`

`max_dunning_attempts` significa:
- o número máximo de novas tentativas permitidas para processos de cobrança recém-criados

Regras:
- número inteiro positivo
- deve permanecer consistente com `dunning_retry_intervals`

Regra MVP recomendada:
- `max_dunning_attempts === dunning_retry_intervals.length`

Isso mantém o contrato simples e elimina a ambiguidade na forma como o cronograma de novas tentativas é interpretado.

### `versão`

`versão` significa:
- o número da versão monotônica do registro de configurações singleton

Destina-se a:
- bloqueio otimista
- atualizar detecção de conflitos
- rastreabilidade operacional

Regras:
- inteiro
- incrementado a cada atualização bem-sucedida

Esta não é uma versão de recurso ou versão de produto.

É apenas a versão do registro de configurações.

### `atualizado_por`

`atualizado_por` significa:
- o ator administrador ou ator do sistema que atualizou as configurações pela última vez

Regras:
- `string | nulo`
- `null` é permitido para bootstrap ou fluxos de inicialização padrão

### `atualizado_em`

`atualizado_em` significa:
- o carimbo de data/hora da última atualização de configurações bem-sucedida

É a fonte da verdade para:
- informações de “última atualização” voltadas para o operador
- correlação de auditoria

## `Comportamento de renovação de assinatura`

Para MVP, `default_renewal_behavior` deve usar este enum:

- `process_imediatamente`
- `require_review_for_pending_changes`

### `process_imediatamente`

Significado:
- quando uma operação de renovação é iniciada e nenhuma decisão específica de renovação persistente a substitui, o sistema pode tratar a renovação como imediatamente processável do ponto de vista das configurações globais

Isso não significa:
- ignorando validações de fluxo de trabalho
- ignorando verificações da política de oferta
- ignorando regras de aprovação já armazenadas em um `RenewalCycle`

É apenas um comportamento padrão global.

### `require_review_for_pending_changes`

Significado:
- quando uma operação de renovação é iniciada e há um contexto de mudança revisável, como `pending_update_data`, o sistema deve seguir um caminho de revisão/aprovação como padrão

Isso não significa:
- reescrever o estado de aprovação em um `RenewalCycle` já criado
- ciclos alterados retroativamente já persistidos no estado de tempo de execução

## `SubscriptionCancellationBehavior`

Para MVP, `default_cancellation_behavior` deve usar este enum:

- `recomendar_retenção_primeiro`
- `allow_direct_cancellation`

### `recommend_retention_first`

Significado:
- quando um novo fluxo de cancelamento é iniciado, a postura padrão do operador/sistema é começar com um tratamento orientado à retenção

Isto pode influenciar:
- padrões iniciais da interface do usuário
- postura de recomendação inicial
- seleção de caminho padrão no início do fluxo

Isso não significa:
- forçar o cliente a aceitar a retenção
- impedindo o cancelamento final
- reescrever um caso de cancelamento já aberto

### `allow_direct_cancellation`

Significado:
- quando um novo fluxo de cancelamento é iniciado, o sistema pode permitir um caminho de cancelamento direto como postura padrão

Isso não significa:
- ignorando validações de cancelamento
- cancelamento automático sem contexto
- reescrever casos de cancelamento existentes já em andamento

## Limite do contrato

Este contrato deve ser interpretado como:
- um contrato de política de tempo de execução global
- não é um instantâneo persistente da política por processo

Isso significa:
- o registro de configurações define padrões para operações futuras
- os registros de domínio mantêm a propriedade de decisões operacionais já persistentes

## Nota importante do MVP

`default_renewal_behavior` é válido como um campo de contrato para MVP, mas só deve permanecer na superfície de configurações implementadas se puder ser conectado de forma limpa à semântica do tempo de execução de renovação posteriormente, sem alongamento artificial do domínio.

Isso deve ser validado quando a etapa de integração em tempo de execução for implementada.

## Fonte da Verdade e Bootstrap

Para MVP, a área `Configurações` deve usar uma única hierarquia de fonte de verdade em tempo de execução:

1. registro de banco de dados persistente
2. padrão de fallback somente quando o registro não existe

Esta hierarquia deve permanecer explícita e determinística.

## Fonte Primária da Verdade

A principal fonte de verdade para `SubscriptionSettings` deve ser:
- um registro singleton armazenado no banco de dados

Este registro do banco de dados deve ser tratado como:
- a configuração canônica do tempo de execução
- o registro usado pelas atualizações do administrador
- a fonte usada pelos fluxos de trabalho e trabalhos, uma vez existente

Isto é preferido porque:
- Os usuários administradores precisam de configuração editável em tempo de execução
- as configurações não devem exigir uma implantação para serem alteradas
- a configuração deve ser auditável e versionada

## Função de `env` e configuração estática

`env` ou configuração estática não devem ser tratados como uma segunda fonte igual de verdade.

Para MVP, `env/config` só pode ser usado como:
- padrões de fallback de inicialização

Isso significa:
- se não existir nenhum registro de configurações no banco de dados, configurações efetivas poderão ser criadas a partir de padrões substitutos
- se existir um registro de configurações no banco de dados, esse registro sempre vence

Depois que um registro existir no banco de dados:
- `env/config` não é mais autoritativo em tempo de execução

Isso evita o comportamento de configuração de cérebro dividido.

## Comportamento `GET` quando o registro está faltando

Se ainda não existir nenhum registro de configurações:
- `GET /admin/subscription-settings` não deve retornar `404`

Em vez disso, deve retornar:
- uma carga útil de configurações eficaz
- construído a partir de padrões e configuração alternativa opcional

Isso fornece aos operadores administrativos:
- uma página de configurações utilizável na primeira inicialização
- valores iniciais previsíveis
- nenhum estado de erro especial de “registro ausente”

Ao nível do contrato, a resposta deverá posteriormente distinguir entre:
- configurações persistentes
- configurações efetivas de fallback

Exemplos de metadados de respostas futuras aceitáveis:
- `é_persistido: booleano`
- ou `fonte: "banco de dados" | "substituição"`

## Estratégia de inicialização

Para MVP, o registro de configurações singleton não deve ser criado por migração.

Estratégia recomendada:
- criação lenta na primeira atualização

Razões:
- as migrações são o lugar errado para padrões de negócios que podem variar de acordo com o ambiente
- isso simplifica a instalação do plugin
- os padrões de fallback permanecem utilizáveis mesmo antes da primeira gravação
- não há necessidade de associar a criação de esquema de banco de dados à inserção de política de negócios

Isso significa:
- o sistema pode iniciar sem uma linha `subscription_settings` existente
- Admin `GET` ainda funciona através de configurações efetivas de fallback
- o primeiro `POST` bem-sucedido cria o registro singleton canônico

## Semântica de configurações eficazes

O sistema deve distinguir entre:
- configurações persistentes
- configurações de fallback eficazes

### Configurações persistidas

Configurações persistentes significam:
- existe um registro de banco de dados
- é autoritário
- carrega `versão`, `updated_by` e `updated_at` persistidos reais

### Configurações efetivas de fallback

Configurações de fallback eficazes significam:
- ainda não existe registro no banco de dados
- o sistema cria uma carga eficaz a partir de padrões e configurações opcionais
- a carga útil é legível, mas ainda não persistiu

Semântica MVP recomendada para cargas substitutas:
- `versão = 0`
- `atualizado_por = nulo`
- `atualizado_at = nulo`

Isso mantém o contrato honesto e deixa claro que nenhuma mudança persistente aconteceu ainda.

## Regras de Precedência

As regras de precedência para `SubscriptionSettings` devem ser:

Primeiro, se existir um registro de banco de dados, use-o
2. se não existir nenhum registro de banco de dados, use padrões de fallback efetivos
3. uma atualização cria ou atualiza o singleton do banco de dados
4. Depois que o singleton existir, a configuração substituta não substituirá mais o comportamento do tempo de execução

Estas regras devem permanecer estáveis em:
- o serviço de configurações
- o fluxo de trabalho de atualização
- Comportamento da API de administração
- leituras de tempo de execução em fluxos de trabalho de domínio

## Decisão Arquitetônica para MVP

Para o MVP, a decisão final sobre a fonte da verdade e o bootstrap é:

- `subscription_settings` no banco de dados é a principal fonte de tempo de execução
- padrões de fallback são permitidos somente antes que o singleton exista
- `GET` retorna configurações efetivas, não `404`
- o singleton é criado lentamente na primeira atualização
- uma vez persistido, o registro do banco de dados se torna a única fonte de tempo de execução autorizada
