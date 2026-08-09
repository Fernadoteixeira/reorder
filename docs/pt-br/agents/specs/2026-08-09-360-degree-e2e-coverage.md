# Especificações: Cobertura completa de 360 graus, desempenho e fortalecimento da arquitetura

## Resumo e visão geral

O plug-in `Reorder` implementa, atualmente, sete módulos principais do domínio (`Assinaturas`, `Planos e Ofertas`, `Renovações`, `Cobranças em atraso`, `Cancelamento e Retenção`, `Registro de atividades` e `Análises`), além de pontos de extremidade da API da loja virtual para finalização de compra de assinaturas, ações no portal do cliente e resolução de ofertas na página de detalhes do produto (PDP).

Embora existam testes de integração de rotas de administração individuais e por unidade, há lacunas notáveis de cobertura e arquitetura em:
1. **Testes de integração de ponta a ponta da loja virtual**: Atualmente, não há testes de integração automatizados que validem as rotas voltadas para o cliente, como `/store/customers/me/subscriptions/*`, `/store/products/:id/subscription-offer` ou `/store/carts/:id/subscribe`.
2. **Proteções contra concorrência e condições de corrida**: alterações simultâneas (por exemplo, cobrança do ciclo de renovação versus cancelamento pelo cliente ou mudança de plano) exigem isolamento explícito e verificação de bloqueio.
3. **Automação e confiabilidade de tarefas agendadas**: As tarefas em segundo plano (`src/jobs/`) precisam de testes operacionais dedicados para condições extremas (tempos limite de bloqueio, limites de lote, recuperação de falhas).
4. **Desempenho e otimização de consultas**: Indexação do banco de dados e eliminação de consultas N+1 em resolvedores de links e análises de instantâneos.

Esta especificação descreve uma execução de engenharia sistemática e em fases para levar toda a base de código a uma cobertura de teste E2E de 360 graus, com desempenho máximo e alta confiabilidade.

---

## Arquitetura proposta e estrutura de cobertura

### 1. Conjunto de testes de integração HTTP da Storefront
Localização: `integration-tests/http/`
- `store-subscription-routes.spec.ts`: Valida a autenticação do cliente, a recuperação da assinatura, a pausa, a retomada, a alteração de endereço, a alteração de frequência, o salto da próxima entrega e a troca de produto.
- `store-subscription-checkout.spec.ts`: Valida a normalização de preços (`sync-subscription-pricing`), o cálculo de descontos, a finalização do carrinho, a vinculação entre pedido e assinatura e a validação de carrinhos mistos.
- `store-product-offers.spec.ts`: Valida a resolução de ofertas na página de detalhes do produto (PDP), substituições de variantes, níveis de frequência e regras de desconto.
- `store-customer-cancellations.spec.ts`: Valida o cancelamento iniciado pelo cliente, recomendações de ofertas de retenção, aceitação de ofertas de retenção e registro final de cancelamento.

### 2. Conjunto de testes de integração para tarefas agendadas e concorrência
Localização: `integration-tests/http/`
- `scheduled-jobs-resilience.spec.ts`: Valida a execução agendada de `process-renewal-cycles`, `process-dunning-retries`, `process-analytics-daily-snapshots` e `process-cancellation-operational-metrics`.
- `concurrency-guards.spec.ts`: Valida a semântica de bloqueio otimista/pessimista quando ocorrem mutações simultâneas.

### 3. Desempenho e fortalecimento do modelo de leitura
- Auditar os índices compostos do banco de dados nas tabelas de domínio (`subscription`, `renewal_cycle`, `dunning_case`, `cancellation_case`, `subscription_log`, `subscription_metrics_daily`).
- Validar os planos de execução das consultas e garantir que não haja nenhuma resolução de entidade N+1 nos links do Medusa.

---

## Plano de implementação passo a passo

### Fase 1: Cobertura de integração de ponta a ponta da loja virtual
- [x] Implementar `integration-tests/http/store-subscriptions-routes.spec.ts`
- [x] Implementar `integration-tests/http/store-subscription-checkout.spec.ts`
- [x] Implementar `integration-tests/http/store-product-offers.spec.ts`
- [x] Implementar `integration-tests/http/store-customer-cancellations.spec.ts`

### Fase 2: Orquestração, tarefas agendadas e testes de concorrência
- [x] Implementar `integration-tests/http/scheduled-jobs-resilience.spec.ts`
- [x] Implementar `integration-tests/http/concurrency-guards.spec.ts`

### Fase 3: Desempenho, Anti-N+1 e Verificação do Modelo de Leitura
- [x] Auditar os modelos de banco de dados dos módulos e os resolvedores de links de entidades do Medusa
- [x] Garantir que a paginação, a filtragem e a indexação de instantâneos estejam otimizadas

### Fase 4: Validação completa e lições aprendidas
- [x] Validação da verificação de tipos (`npx tsc --noEmit` é aprovado em 100%)
- [x] Verificação da compilação para produção (`yarn build` é aprovado em 100%)
- [x] Atualização da documentação de tempo de execução em `docs/` e `.agents/lessons.md`

---

## Verificação e testes
Todas as fases são rigorosamente verificadas por meio de testes de integração do Medusa v2, utilizando o Jest e o `@medusajs/test-utils`.
Comandos:
```bash
yarn build
yarn test:integration:http
```
