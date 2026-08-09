# Glossário de Tradução e Localização (PT-BR)

Este documento estabelece as decisões canônicas de tradução e terminologia técnica aplicadas em toda a base de documentação do Reorder.

## Diretrizes Fundamentais
1. **Preservação de Termos Técnicos e Identificadores:** Nomes de módulos, tipos, tabelas, rotas, variáveis, decorators, enums e packages (`@medusajs/framework`, `Subscription`, `CancellationCase`, `DunningExecution`, etc.) **NÃO** são traduzidos.
2. **Força Normativa:** Termos RFC (`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `REQUIRED`, `OPTIONAL`) mantêm força equivalente:
   - `MUST` / `REQUIRED` → `DEVE` / `OBRIGATÓRIO`
   - `MUST NOT` → `NÃO DEVE`
   - `SHOULD` → `DEVERIA` / `RECOMENDA-SE`
   - `OPTIONAL` → `OPCIONAL`

## Tabela Canônica de Terminologia

| Termo em Inglês | Tradução Padronizada PT-BR | Contexto / Observação |
| :--- | :--- | :--- |
| `subscription` | assinatura | Entidade de domínio central |
| `renewal` | renovação | Processamento de ciclo de faturamento |
| `dunning` | dunning / cobrança de inadimplência | Recuperação e retentativas de pagamento |
| `retention offer` | oferta de retenção | Fluxo de cancelamento e retenção de churn |
| `activity log` | registro de atividades | Trilha de auditoria e eventos |
| `billing anchor` | âncora de faturamento | Ponto temporal base de ciclo |
| `checkout` | checkout | Fluxo de finalização de compra |
| `storefront` | storefront | Interface pública da loja |
| `workflow` | workflow | Fluxo de execução orquestrado do Medusa |
| `subscriber` | subscriber / ouvinte de eventos | Mecanismo de eventos assíncronos |
| `provider` | provider / provedor | Integrações (e.g. Stripe, Resend) |
| `link` | link de módulo | Relacionamento entre módulos Medusa v2 |
| `data model` | modelo de dados | Estrutura relacional do banco de dados |
| `query read model` | modelo de leitura / query | Modelo otimizado para leitura e GraphQL/Remote Query |
| `state machine` | máquina de estados | Transições formais de ciclo de vida |
| `source of truth` | fonte da verdade | Entidade detentora do estado canônico |
| `retry` | nova tentativa / retentativa | Execução repetida após falha |
| `rollback` | rollback / reversão | Desfazimento atômico de transação |
| `deployment` | implantação / deploy | Publicação em ambiente de infraestrutura |
