# Interface do administrador: Configurações de assinatura

Este documento descreve a interface de usuário administrativa implementada para a área `Subscription Settings` no plug-in `Reorder`.

O foco está em:
- posicionamento da página
- comportamento dos formulários
- fluxo de salvamento
- mensagens com efeito em tempo de execução
- limites atuais da experiência do usuário

## Objetivo

A página `Subscription Settings` oferece aos operadores um único local para gerenciar as configurações padrão globais de comércio recorrente para:
- períodos de teste
- política de novas tentativas de cobrança
- comportamento de renovação
- configurações padrão de cancelamento

A página tem como objetivo oferecer suporte a:
- alterações seguras na configuração global
- feedback claro sobre o salvamento
- semântica previsível do tipo “apenas operações futuras”

## Mapa da rota

Rota implementada:
- `/app/settings/subscription-settings`

Comportamento de navegação:
- a página está localizada na área `Settings` do Medusa Admin
- trata-se de uma página de configuração dedicada, e não de um subpainel de detalhes da assinatura

## 1. Estrutura da página

A página atual inclui:
- cabeçalho e descrição da página
- painel de informações sobre o estado das configurações salvas
- formulário de configurações
- área de ação para salvar
- mensagens de aviso e de ajuda

O layout segue as convenções atuais do Medusa Admin:
- seções `Container`
- estrutura compacta da página de configurações
- nenhum fluxo principal baseado em modais

## 2. Seções do formulário

O formulário atual está dividido em quatro seções:
- `Trial`
- `Dunning`
- `Renewals`
- `Cancellation Defaults`

### Versão de avaliação

Campo atual:
- `default_trial_days`

### Cobrança

Campos atuais:
- `dunning_retry_intervals`
- `max_dunning_attempts`

Os intervalos de nova tentativa são editados como uma lista ordenada de valores em minutos.

### Renovações

Campo atual:
- `default_renewal_behavior`

Valores suportados:
- `process_immediately`
- `require_review_for_pending_changes`

### Padrões de cancelamento

Campo atual:
- `default_cancellation_behavior`

Valores suportados:
- `recommend_retention_first`
- `allow_direct_cancellation`

## 3. Carregamento de dados

A página segue o padrão de exibição e consulta do Medusa Admin.

Comportamento atual:
- a carga útil das configurações efetivas é carregada na montagem
- a página utiliza um auxiliar de consulta dedicado para configurações
- o salvamento utiliza um auxiliar de mutação separado
- o salvamento bem-sucedido invalida a consulta de configurações
- as leituras de exibição não estão vinculadas ao estado local incidental da interface do usuário

Atualmente, a página não depende de:
- estado do modal
- estado da gaveta
- sinalizadores condicionais `enabled` não relacionados à própria consulta de configurações

## 4. Preservar a experiência do usuário

A experiência atual de salvamento inclui:
- botão `Save` desativado quando não há alterações
- estado de carregamento e desativado enquanto o salvamento está em andamento
- validação de formulário em linha
- notificações de sucesso e erro em forma de toast
- painel de informações exibindo:
  - `version`
  - `updated_at`
  - `updated_by`

## 5. Mensagens com efeito em tempo de execução

A página comunica de forma clara e intencional os limites da configuração.

As mensagens atuais enfatizam:
- as alterações se aplicam a operações futuras
- o estado do processo recém-criado utilizará a configuração salva
- os estados ativos existentes dos processos de cobrança, cancelamento e renovação mantêm sua configuração persistida

Isso está alinhado com a semântica de tempo de execução implementada:
- `DunningCase` captura as configurações no momento da criação
- `CancellationCase` captura as configurações no momento da criação
- `RenewalCycle` utiliza as configurações no momento da criação e mantém seu contexto de política persistido

## 6. Comportamento de alerta

A página exibe um resumo com foco em alertas sobre alterações pendentes que podem causar impacto.

O objetivo é tornar as alterações globais mais explícitas quando o operador edita campos que afetam:
- o comportamento de cobrança
- o comportamento de renovação
- as configurações padrão de cancelamento

A experiência do usuário (UX) atual apresenta isso como um bloco de aviso embutido, em vez de uma janela modal de confirmação que bloqueia a tela.

## 7. Indicadores de estado persistente

A página indica se as configurações atuais são:
- padrões de fallback
- estado persistido de singleton

Principais indicadores visíveis ao operador:
- `version`
- `updated_at`
- `updated_by`

Esses valores ajudam a distinguir:
- o comportamento do bootstrap na primeira inicialização
- a configuração de tempo de execução já armazenada

## 8. Limites atuais da experiência do usuário

A página “Configurações” atual não inclui, intencionalmente:
- ação de redefinição;
- navegador do histórico de alterações das configurações;
- interface de usuário para comparar duas versões;
- interface de usuário dedicada ao gerenciamento de permissões;
- visualizações em tempo de execução embutidas para todos os módulos

As prioridades de experiência do usuário (UX) implementadas são:
- consistência com as páginas de configurações do Medusa Admin
- edições seguras na configuração global
- comunicação clara do escopo e do efeito
