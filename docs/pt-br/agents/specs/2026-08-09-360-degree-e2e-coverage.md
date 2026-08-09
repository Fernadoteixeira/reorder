# Especificação: Cobertura ponta a ponta de 360 ​​graus, desempenho e endurecimento arquitetônico

## TLDR e visão geral

O plugin `Reorder` atualmente implementa 7 módulos de domínio principais (`Assinaturas`, `Planos e Ofertas`, `Renovações`, `Dunning`, `Cancelamento e Retenção`, `Registro de Atividades` e `Analytics`), bem como endpoints de API Storefront para checkout de assinaturas, ações do portal do cliente e resolução de ofertas PDP.

Embora existam testes de integração de rotas administrativas unitárias e individuais, há lacunas notáveis de cobertura e arquitetura em:
1. **Teste de integração ponta a ponta da vitrine**: Nenhum teste de integração automatizado atualmente valida rotas `/store/customers/me/subscriptions/*`, `/store/products/:id/subscription-offer` voltadas para o cliente ou `/store/carts/:id/subscribe`.
2. **Protetores de simultaneidade e condições de corrida**: Mutações simultâneas (por exemplo, cobrança do ciclo de renovação vs. cancelamento do cliente/mudança de plano) exigem isolamento explícito e verificação de bloqueio.
3. **Automação e Confiabilidade de Trabalhos Programados**: Trabalhos em segundo plano (`src/jobs/`) precisam de testes operacionais dedicados para condições de borda (tempo limite de bloqueio, limites de lote, recuperação de falhas).
4. **Otimização de desempenho e consulta**: Indexação de banco de dados e eliminação de consultas N+1 em resolvedores de links e análises de snapshots.

Esta especificação descreve uma execução de engenharia sistemática e em fases para trazer toda a base de código para uma cobertura de teste E2E de 360 ​​graus com desempenho máximo e alta confiabilidade.

---

## Arquitetura Proposta e Estrutura de Cobertura

### 1. Conjunto de testes de integração HTTP Storefront
Localização: `integration-tests/http/`
- `store-subscription-routes.spec.ts`: Valida a autenticação do cliente, recuperação de assinatura, pausa, retomada, alteração de endereço, frequência de alteração, pular próxima entrega e troca de produto.
- `store-subscription-checkout.spec.ts`: Valida a normalização de preços (`sync-subscription-pricing`), cálculo de desconto, conclusão do carrinho, vinculação do pedido à assinatura e validação de carrinho misto.
- `store-product-offers.spec.ts`: Valida a resolução da oferta PDP, substituições de variantes, níveis de frequência e regras de desconto.
- `store-customer-cancellations.spec.ts`: Valida o cancelamento iniciado pelo cliente, recomendações de ofertas de retenção, aceitação de ofertas de retenção e registro final de rotatividade.

### 2. Trabalhos agendados e conjunto de integração de simultaneidade
Localização: `integration-tests/http/`
- `scheduled-jobs-resilience.spec.ts`: Valida a execução agendada de `process-renewal-cycles`, `process-dunning-retries`, `process-analytics-daily-snapshots` e `process-cancellation-operative-metrics`.
- `concurrency-guards.spec.ts`: Valida a semântica de bloqueio otimista/pessimista quando ocorrem mutações simultâneas.

### 3. Desempenho e endurecimento do modelo de leitura
- Auditar índices compostos de banco de dados em tabelas de domínio (`subscription`, `renewal_cycle`, `dunning_case`, `cancellation_case`, `subscription_log`, `subscription_metrics_daily`).
- Validar planos de execução de consultas e garantir zero resoluções de entidades N+1 em links Medusa.

---

## Plano de implementação passo a passo

### Fase 1: Cobertura de integração E2E da vitrine
- [x] Implementar `integration-tests/http/store-subscriptions-routes.spec.ts`
- [x] Implementar `integration-tests/http/store-subscription-checkout.spec.ts`
- [x] Implementar `integration-tests/http/store-product-offers.spec.ts`
- [x] Implementar `integration-tests/http/store-customer-cancellations.spec.ts`

### Fase 2: orquestração, trabalhos agendados e testes de simultaneidade
- [x] Implementar `integration-tests/http/scheduled-jobs-resilience.spec.ts`
- [x] Implementar `integration-tests/http/concurrency-guards.spec.ts`

### Fase 3: Verificação de desempenho, Anti-N+1 e modelo de leitura
- [x] Modelos de banco de dados de módulo de auditoria e resolvedores de link de entidade Medusa
- [x] Garantir que a paginação, a filtragem e a indexação de instantâneos sejam ideais

### Fase 4: Validação completa e lições aprendidas
- [x] Validação de verificação de tipo (`npx tsc --noEmit` passa 100%)
- [x] Verificação de construção de produção (`construção de fio` passa 100%)
- [x] Atualizar a documentação do tempo de execução em `docs/` e `.agents/lessons.md`

---

## Verificação e teste
Todas as fases são rigorosamente verificadas através de testes de integração Medusa v2 usando Jest e `@medusajs/test-utils`.
Comandos:
```bash
yarn build
yarn test:integration:http
```
