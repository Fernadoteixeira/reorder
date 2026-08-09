# UI do administrador: configurações de assinatura

Este documento descreve a UI de administração implementada para a área `Configurações de assinatura` no plugin `Reorder`.

Ele se concentra em:
- posicionamento da página
- comportamento de forma
- salvar fluxo
- mensagens de efeito de tempo de execução
- limites atuais de UX

## Propósito

A página `Configurações de assinatura` oferece às operadoras um local para gerenciar padrões globais de comércio recorrente para:
- testes
- política de nova tentativa de cobrança
- comportamento de renovação
- padrões de cancelamento

A página tem como objetivo apoiar:
- alterações seguras na configuração global
- limpar feedback de salvamento
- semântica previsível “somente operações futuras”

## Mapa de rotas

Rota implementada:
- `/app/settings/subscription-settings`

Comportamento de navegação:
- a página fica na área `Configurações` do administrador da Medusa
- é uma página de configuração dedicada, não um subpainel de detalhes de assinatura

## 1. Estrutura da página

A página atual inclui:
- cabeçalho e descrição da página
- painel de informações para estado de configurações persistentes
- formulário de configurações
- salvar área de ação
- mensagens de aviso e ajuda

O layout segue as convenções atuais do Medusa Admin:
- Seções `Container`
- estrutura compacta da página de configurações
- nenhum fluxo primário orientado por modal

## 2. Seções do formulário

O formulário atual está dividido em quatro seções:
- `Teste`
- `Cobrança`
- `Renovações`
- `Padrões de cancelamento`

### Julgamento

Campo atual:
- `default_trial_days`

### Cobrança

Campos atuais:
- `dunning_retry_intervals`
- `max_dunning_attempts`

Os intervalos de novas tentativas são editados como uma lista ordenada de valores em minutos.

### Renovações

Campo atual:
- `default_renewal_behavior`

Valores suportados:
- `process_imediatamente`
- `require_review_for_pending_changes`

### Padrões de cancelamento

Campo atual:
- `default_cancellation_behavior`

Valores suportados:
- `recomendar_retenção_primeiro`
- `allow_direct_cancellation`

## 3. Carregamento de dados

A página segue o padrão de consulta de exibição do Medusa Admin.

Comportamento atual:
- as configurações efetivas de carga útil na montagem
- a página usa um auxiliar de consulta de configurações dedicado
- save usa um auxiliar de mutação separado
- o salvamento bem-sucedido invalida a consulta de configurações
- as leituras de exibição não estão vinculadas ao estado incidental da UI local

A página atualmente não depende de:
- estado modal
- estado da gaveta
- sinalizadores condicionais `enabled` não relacionados à consulta de configurações em si

## 4. Salvar experiência do usuário

A experiência de salvamento atual inclui:
- botão `Salvar` desativado quando não há alterações
- carregamento e estado desativado enquanto o salvamento está em andamento
- validação de formulário embutido
- brinde ao sucesso e feedback de erros
- painel de informações mostrando:
  - `versão`
  - `atualizado_em`
  - `atualizado_por`

## 5. Mensagens de efeito de tempo de execução

A página comunica intencionalmente o limite das configurações de forma clara.

As mensagens atuais enfatizam:
- alterações se aplicam a operações futuras
- o estado do processo recém-criado usará a configuração salva
- o estado ativo existente do processo de cobrança, cancelamento e renovação mantém sua configuração persistente

Isso está alinhado com a semântica de tempo de execução implementada:
- Configurações de instantâneos `DunningCase` quando criados
- Configurações de instantâneos `CancellationCase` quando criados
- `RenewalCycle` usa configurações no momento da criação e mantém seu contexto de política persistente

## 6. Comportamento de aviso

A página mostra um resumo orientado a avisos para alterações impactantes pendentes.

A intenção é tornar as alterações globais mais explícitas quando o operador edita campos que afetam:
- comportamento de cobrança
- comportamento de renovação
- padrões de cancelamento

O UX atual mantém isso como um bloco de aviso embutido em vez de um modal de confirmação de bloqueio.

## 7. Indicadores de estado persistentes

A página reflete se as configurações atuais são:
- padrões de reserva
- estado singleton persistente

Principais indicadores visíveis para o operador:
- `versão`
- `atualizado_em`
- `atualizado_por`

Esses valores ajudam a distinguir:
- comportamento de inicialização pela primeira vez
- configuração de tempo de execução já persistida

## 8. Limites atuais de UX

A página Configurações atual intencionalmente não inclui:
- ação de redefinição
- configurações do navegador changelog
- interface de comparação de duas versões
- UI dedicada de gerenciamento de permissões
- visualizações de tempo de execução inline para todos os módulos

As prioridades de UX implementadas são:
- consistência com as páginas de configurações do Medusa Admin
- edições seguras de configuração global
- comunicação clara de escopo e efeito
