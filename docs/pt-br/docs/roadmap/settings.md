# Roteiro: Configurações de assinatura

Este documento descreve os limites atuais do MVP e a evolução planejada da área `Subscription Settings` no plug-in `Reorder`.

O objetivo é esclarecer:
- o que está implementado atualmente
- o que foi intencionalmente deixado fora do escopo do MVP
- quais são os próximos passos mais prováveis após a estabilização do MVP

## Limites atuais do MVP

A versão MVP atual se limita intencionalmente a uma implementação leve das configurações globais.

Implementado hoje:
- um registro de configurações global do tipo singleton
- valores padrão de fallback quando não houver nenhum registro persistido
- atualizações baseadas em fluxo de trabalho com bloqueio otimista
- trilha de auditoria em `metadata.audit_log`
- integração em tempo de execução para:
  - `Dunning`
  - `Cancellation`
  - `Renewals`
- Página de configurações de administração para fluxos de leitura e atualização

O MVP não inclui, intencionalmente, as seguintes extensões.

### 1. Reinicializar o endpoint

Situação atual:
- o serviço do módulo suporta `resetSettings()`
- a API pública de administração não expõe uma rota de redefinição
- a página de administração não expõe uma ação de redefinição

Por que isso está fora do escopo do MVP:
- a redefinição é uma operação global e merece uma experiência do usuário (UX) e um contrato de mutação dedicados
- uma ação de redefinição deve ser explícita quanto ao seu efeito sobre operações futuras
- o fluxo atual de salvamento é mais seguro sem um botão de redefinição destrutivo

### 2. Modelo de permissões mais abrangente

Situação atual:
- as rotas dependem de acesso de administrador autenticado
- ainda não existe um mecanismo de controle de permissões específico para as configurações

Por que isso está fora do escopo do MVP:
- o repositório ainda não oferece um padrão RBAC de rota personalizada compartilhada para rotas de administração pertencentes a plug-ins
- adicionar um modelo de permissão completo apenas para `Subscription Settings` introduziria uma nova preocupação transversal em uma fase tardia do MVP

### 3. Modelo dedicado de registro de alterações ou histórico

Situação atual:
- `metadata.audit_log` funciona como o registro de alterações
- `metadata.last_update` fornece um instantâneo prático da alteração mais recente
- `version` oferece suporte ao bloqueio otimista e à ordenação

Por que isso está fora do escopo do MVP:
- o histórico de configurações ainda não é um domínio operacional independente
- não há necessidade, no momento, de consultas separadas ao histórico, políticas de retenção ou APIs paginadas para o histórico de administração

### 4. Configurações por loja

Situação atual:
- a implementação é um singleton global
- o escopo abrange todo o plugin, não é específico para cada loja ou locatário

Por que isso está fora do escopo do MVP:
- o restante do plug-in segue, atualmente, um único limite global de comércio recorrente
- a semântica existente na área administrativa e em tempo de execução é mais simples e segura com uma única fonte global de verdade

### 5. Navegação avançada em auditorias no painel de administração

Estado atual:
- a página “Configurações” exibe o estado atual do registro
- não há uma linha do tempo dedicada ao registro de alterações, tabela de histórico ou visualizador de diferenças na área de administração

Por que isso está fora do escopo do MVP:
- a necessidade atual dos operadores é a capacidade de editar a configuração global, e não a navegação pelo histórico
- adicionar a navegação pelo histórico implicaria em requisitos mais complexos em relação à paginação, filtragem e controle de acesso

## Roteiro para o futuro

A seguir, apresentamos os próximos passos mais naturais após a estabilização do MVP.

### 1. Adicionar a API de redefinição e a experiência do usuário (UX) de administração

Possíveis adições futuras:
- `POST /admin/subscription-settings/reset`
- fluxo de trabalho dedicado para reinicialização
- interface de usuário com confirmação explícita na página de Configurações
- mensagens para reativação do padrão de fallback

Objetivo de projeto esperado:
- tornar a reinicialização segura, explícita e reversível no nível operacional

### 2. Adicionar um modelo de permissões mais abrangente

Possíveis adições futuras:
- controle de funções ou permissões específico para configurações
- níveis de acesso distintos para leitura e gravação
- auxiliares de proteção compartilhados para rotas de administração personalizadas de plug-ins

Objetivo esperado do projeto:
- restringir o acesso à configuração global a um conjunto menor de operadores
- evitar a dispersão da lógica de permissões específicas de rotas por pontos de extremidade personalizados

### 3. Adicionar um modelo de histórico dedicado apenas para gravação

Possíveis adições futuras:
- novo registro `settings_change` ou similar, do tipo “somente adição”
- informações explícitas sobre o executor, a versão, o motivo e a diferença por alteração
- endpoint para consulta do histórico e suporte à visualização de administrador

Objetivo de projeto esperado:
- oferecer maior rastreabilidade, retenção de histórico por mais tempo e navegação mais fácil pelo registro de alterações

### 4. Adicionar escopo de configurações por loja

Possíveis adições futuras:
- Registros de configurações com escopo `store_id`
- Regras de resolução para o contexto atual da loja
- Experiência do usuário (UX) de administração para propriedade de configurações com escopo

Objetivo de projeto esperado:
- oferecer suporte a configurações de comércio recorrente com várias lojas ou mais complexas, que levem em conta os locatários, sem reescrever cegamente a semântica global atual

### 5. Adicionar navegação avançada de auditoria administrativa

Possíveis adições futuras:
- linha do tempo do histórico de alterações nas configurações
- comparação de versões
- filtragem por responsável ou campo alterado
- detalhamento de “última alteração feita por”

Objetivo de projeto esperado:
- tornar o histórico de configurações mais fácil de usar para os operadores, uma vez que as alterações nas configurações se tornem uma preocupação operacional de maior volume

## Resumo da decisão

A direção atual do roteiro para o `Subscription Settings` é:
- manter o MVP pequeno e global
- manter o histórico de auditoria leve, mas útil
- adiar a redefinição destrutiva da experiência do usuário
- adiar o armazenamento independente do histórico
- adiar modelos mais avançados de permissão e escopo

Isso está de acordo com o atual nível de maturidade do plug-in e com a arquitetura já escolhida para o recurso “Configurações”.
