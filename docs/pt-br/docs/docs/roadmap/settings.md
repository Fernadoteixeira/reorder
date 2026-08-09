# Roteiro: Configurações de assinatura

Este documento captura os limites atuais do MVP e a evolução planejada da área `Configurações de assinatura` no plugin `Reorder`.

Pretende-se esclarecer:
- o que é implementado hoje
- o que está intencionalmente fora do escopo do MVP
- quais próximos passos são mais prováveis após a estabilização do MVP

## Limites atuais do MVP

O MVP atual para intencionalmente em uma implementação leve de configurações globais.

Implementado hoje:
- um registro global de configurações singleton
- padrões de fallback quando não existe nenhum registro persistente
- atualizações baseadas em fluxo de trabalho com bloqueio otimista
- trilha de auditoria em `metadata.audit_log`
- integração em tempo de execução para:
  - `Cobrança`
  - `Cancelamento`
  - `Renovações`
- Página de configurações de administrador para fluxos de leitura e atualização

O MVP intencionalmente não inclui as seguintes extensões.

### 1. Redefinir ponto final

Estado atual:
- o serviço do módulo suporta `resetSettings()`
- a API Admin pública não expõe uma rota de redefinição
- a página Admin não expõe uma ação de redefinição

Por que está fora do escopo do MVP:
- reset é uma operação global e merece um contrato dedicado de UX e mutação
- uma ação de reinicialização deve ser explícita sobre o seu efeito em operações futuras
- o fluxo de salvamento atual é mais seguro sem um botão de reinicialização destrutivo

### 2. Modelo de permissão mais rico

Estado atual:
- as rotas dependem de acesso de administrador autenticado
- ainda não existe um portão de permissão específico para configurações dedicadas

Por que está fora do escopo do MVP:
- o repositório ainda não fornece um padrão RBAC de rota personalizada compartilhada para rotas administrativas de propriedade do plug-in
- adicionar um modelo de permissão completo apenas para `Configurações de assinatura` introduziria uma nova preocupação transversal no final do MVP

### 3. Changelog dedicado ou modelo de histórico

Estado atual:
- `metadata.audit_log` atua como o changelog
- `metadata.last_update` fornece um instantâneo conveniente das alterações mais recentes
- `versão` suporta bloqueio e ordenação otimistas

Por que está fora do escopo do MVP:
- o histórico de configurações ainda não é um domínio operacional independente
- não há necessidade atual de consultas de histórico separadas, políticas de retenção ou APIs de histórico de administração paginadas

### 4. Configurações por loja

Estado atual:
- a implementação é um singleton global
- o escopo abrange todo o plug-in, não por loja ou locatário

Por que está fora do escopo do MVP:
- o resto do plugin atualmente segue um limite global de comércio recorrente
- a semântica existente de administração e tempo de execução é mais simples e segura com uma fonte global de verdade

### 5. Navegação avançada de auditoria no Admin

Estado atual:
- a página Configurações mostra o estado atual do registro
- não há cronograma de changelog dedicado, tabela de histórico ou visualizador de diferenças no Admin

Por que está fora do escopo do MVP:
- a necessidade atual do operador é a capacidade de edição da configuração global, e não a navegação histórica
- adicionar navegação no histórico implicaria requisitos mais fortes em relação à paginação, filtragem e controle de acesso

## Roteiro futuro

A seguir estão as próximas etapas mais naturais após a estabilização do MVP.

### 1. Adicionar API de redefinição e UX de administrador

Adições futuras do candidato:
- `POST /admin/configurações de assinatura/reset`
- fluxo de trabalho de redefinição dedicado
- confirmação explícita de UX na página Configurações
- mensagens para reativação padrão de fallback

Objetivo de design esperado:
- tornar a reinicialização segura, explícita e reversível no nível operacional

### 2. Adicione um modelo de permissão mais rico

Adições futuras do candidato:
- função específica de configurações ou portão de permissão
- níveis de acesso separados para leitura versus gravação
- ajudantes de guarda compartilhados para rotas administrativas personalizadas do plugin

Objetivo de design esperado:
- restringir o acesso à configuração global a um conjunto de operadores menor
- evite espalhar a lógica de permissão específica da rota em endpoints personalizados

### 3. Adicione um modelo de histórico dedicado somente para acréscimos

Adições futuras do candidato:
- novo `settings_change` ou registro similar apenas para acréscimos
- ator explícito, versão, motivo e carga útil diferente por mudança
- endpoint de consulta de histórico e suporte para visualização de administrador

Objetivo de design esperado:
- suporta auditabilidade mais forte, retenção de histórico mais longa e navegação mais fácil no changelog

### 4. Adicionar escopo de configurações por loja

Adições futuras do candidato:
- registros de configurações com escopo `store_id`
- regras de resolução para o contexto atual da loja
- Admin UX para propriedade de configuração com escopo definido

Objetivo de design esperado:
- suporte a configurações de comércio recorrente com reconhecimento de locatário em várias lojas ou mais complexas, sem reescrever cegamente a semântica global atual

### 5. Adicionar navegação avançada de auditoria administrativa

Adições futuras do candidato:
- linha do tempo do changelog de configurações
- comparação de versões
- filtrar por ator ou campo alterado
- detalhamento “última alteração por”

Objetivo de design esperado:
- tornar o histórico de configuração fácil de usar quando as alterações nas configurações se tornarem uma preocupação operacional de maior volume

## Resumo da decisão

A direção atual do roteiro para `Configurações de assinatura` é:
- manter o MVP pequeno e global
- mantenha o histórico de auditoria leve, mas útil
- adiar a redefinição destrutiva do UX
- adiar o armazenamento de histórico independente
- adiar modelos mais ricos de permissão e escopo

Isto é consistente com o nível de maturidade atual do plugin e com a arquitetura já escolhida para o recurso Configurações.
