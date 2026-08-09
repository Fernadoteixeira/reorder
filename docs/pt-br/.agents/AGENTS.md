# Diretrizes para a reordenação de agentes

Este arquivo define como os agentes de codificação devem funcionar no repositório oficial `reorder`.

## Sempre

- Escreva todo o código, comentários, especificações, arquivos Markdown, lições e mensagens de commit exclusivamente em inglês, independentemente do idioma utilizado no chat.
- **Antes de propor um commit ou um git push, apresente uma mensagem de commit no formato Conventional Commits `type(scope): description` (por exemplo, `feat(ai): add create-spec skill`, `fix(dunning): resolve retry loop`) e aguarde a aprovação explícita do usuário.**
- Identifique qual área do Reorder você está alterando e verifique o Roteador de Tarefas abaixo antes de começar.
- Leia a documentação de tempo de execução relevante em `docs/` antes de ler os arquivos de implementação.
- Consulte `docs/README.md` para obter uma visão geral do plugin, o escopo atual e os domínios implementados.
- Entre no modo de planejamento para tarefas não triviais (3 ou mais etapas ou decisões arquitetônicas) e use a habilidade `create-spec` para elaborar uma especificação em `.agents/specs/` antes de escrever o código.
- Verifique `.agents/lessons.md` no início da sessão para evitar repetir erros do passado.
- Após corrigir qualquer bug ou resolver um problema complexo, atualize o `.agents/lessons.md` com a lição aprendida e uma regra para evitar que isso se repita no futuro.
- Use as habilidades de agente da Medusa sempre que forem adequadas à tarefa.
- Mantenha as alterações mínimas e restritas à área afetada.
- Siga as convenções do Medusa (roteamento baseado em arquivos com `route.ts`, resolução Awilix, módulos personalizados em `src/modules/<domain>/`, modelos em `models/`, migrações em `migrations/`, fluxos de trabalho em `src/workflows/`, tarefas em `src/jobs/`).
- Escreva testes de integração para novos recursos (dando preferência a testes de integração HTTP em `integration-tests/http/`). Mantenha-os independentes.
- Se houver alterações no comportamento, atualize a documentação de tempo de execução correspondente em `docs/`.

## Pergunte primeiro

- Peça autorização antes de alterar a automação de branches/PRs, rótulos do pipeline, fluxos de controle de qualidade ou comportamentos de lançamento.
- Peça autorização antes de fazer alterações que abranjam vários domínios ou módulos sem uma especificação pré-definida.
- Peça autorização antes de adicionar novas dependências externas ao `package.json`.
- Peça autorização antes de modificar modelos de banco de dados ou introduzir migrações complexas de esquema.

## Nunca

- Nunca use `any` no código TypeScript. Dê preferência a tipos de domínio descritivos e estritos.
- Nunca escreva regras de negócio diretamente em manipuladores de rota ou componentes React; mantenha-as em fluxos de trabalho ou camadas de serviço.
- Nunca ignore proteções contra mutações ou limites de domínio (não introduza acoplamento entre domínios desnecessário).
- Nunca modifique arquivos gerados manualmente.
- Nunca refatore arquivos não relacionados ao corrigir um problema local.
- Nunca documente comportamentos futuros pretendidos; documente apenas comportamentos estáveis e já implementados.

## Comandos de validação

Execute o menor comando de validação relevante para suas alterações:

```bash
yarn build
yarn test:integration:http
yarn test:integration:modules
```

## Roteador de tarefas

Associe a tarefa a todas as linhas relevantes antes de pesquisar ou codificar.

| Tarefa | Ler primeiro / Ação |
|------|------------|
| Visão geral do plugin, escopo atual, domínios implementados | `docs/README.md` |
| Alterações no domínio da assinatura | `docs/architecture/subscriptions.md`, `docs/api/admin-subscriptions.md`, `docs/testing/subscriptions.md` |
| Alterações no plano e na oferta | `docs/architecture/plan-offers.md`, `docs/api/admin-plan-offers.md`, `docs/testing/plan-offers.md` |
| Alterações na renovação | `docs/architecture/renewals.md`, `docs/api/admin-renewals.md`, `docs/testing/renewals.md` |
| Alterações no cobrança | `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/testing/dunning.md` |
| Alterações de cancelamento e retenção | `docs/architecture/cancellation.md`, `docs/api/admin-cancellations.md`, `docs/testing/cancellations.md` |
| Alterações no registro de atividades | `docs/architecture/activity-log.md`, `docs/api/admin-activity-log.md`, `docs/testing/activity-log.md` |
| Alterações nas análises | `docs/architecture/analytics.md`, `docs/api/admin-analytics.md`, `docs/testing/analytics.md` |
| Alterações nas configurações de assinatura | `docs/architecture/settings.md`, `docs/api/admin-subscription-settings.md`, `docs/testing/subscription-settings.md` |
| APIs de loja virtual e assinatura de contas de clientes | `docs/api/store-subscription-checkout.md`, `docs/api/store-subscription-offers.md`, `docs/api/store-customer-cancellations.md`, `docs/architecture/subscriptions.md` |
| Rotas e widgets da interface de administração | arquivos correspondentes em `docs/admin/`, depois em `src/admin/README.md` |
| Implementação de rotas da API de administração ou da loja | `src/api/README.md`, depois correspondência com `docs/api/*.md` |
| Mutações baseadas em fluxo de trabalho | `src/workflows/README.md`, em seguida, documentação correspondente de arquitetura e API |
| Alterações em módulos ou modelos | `src/modules/README.md`, em seguida, documentação correspondente de arquitetura |
| Tarefas e processamento agendado | documentação correspondente de arquitetura e documentação correspondente de testes |
| Execução de testes e validação de integração | Use a habilidade `run-tests` (`.agents/skills/run-tests/SKILL.md`) |
| Testes locais e sincronização com o backend do Medusa | Use a habilidade `local-dev` (`.agents/skills/local-dev/SKILL.md`) |
| Elaboração de especificações de projeto antes da codificação | Use a habilidade `create-spec` (`.agents/skills/create-spec/SKILL.md`) |

## Mapa do repositório

Áreas importantes:

- `src/modules/` módulos de domínio e persistência
- `src/workflows/` mutações de negócios e orquestração
- `src/api/admin/` rotas da API de administração
- `src/api/store/` rotas da API da loja
- `src/admin/` rotas, widgets, tipos e auxiliares de cliente do painel de administração
- `src/jobs/` processamento agendado
- `src/links/` Links de entidades do Medusa
- `integration-tests/` Cobertura de integração
- `docs/` Documentação de tempo de execução

## Regras de arquitetura

- Mantenha as regras de negócios nos fluxos de trabalho ou nos serviços dos módulos, e não nos manipuladores de rota ou nos componentes React.
- Os manipuladores de rota devem validar as entradas, resolver dependências a partir de `req.scope`, chamar fluxos de trabalho ou serviços e retornar DTOs.
- Mantenha clara a propriedade do domínio:
  - `subscription`
  - `plan-offer`
  - `renewal`
  - `dunning`
  - `cancellation`
  - `activity-log`
  - `analytics`
  - `settings`
- Reutilize padrões de fluxo de trabalho existentes para operações que alteram o estado.
- Preserve os modelos de leitura baseados em instantâneos nos casos em que a documentação os descreva.
- Mantenha as respostas do armazenamento separadas dos DTOs de administração.
- Não introduza acoplamento entre domínios desnecessário quando já houver um fluxo de trabalho ou limite de ligação existente.

## Convenções da Medusa

- As rotas baseadas em arquivos devem usar `route.ts`.
- Use `req.scope.resolve(...)` para serviços Medusa e recursos registrados.
- Mantenha os módulos personalizados em `src/modules/<domain>/`.
- Coloque os modelos dos módulos em `models/`, as migrações em `migrations/` e os auxiliares compartilhados em `utils/` ou `types/`.
- Mantenha os fluxos de trabalho em `src/workflows/` e as etapas em `src/workflows/steps/`.
- As tarefas agendadas devem ficar em `src/jobs/`.
- As extensões de administração devem ficar em `src/admin/`.

## Regras de codificação

- Dê preferência aos tipos de domínio e validadores existentes.
- Evite o uso de `any`.
- Mantenha a nomenclatura consistente com os domínios, DTOs e nomes de rotas existentes.
- Use nomes explícitos e descritivos.
- Dê preferência a pequenos auxiliares em vez de lógica embutida profundamente aninhada.
- Siga os formatos de resposta existentes para cada área.
- Não refatore arquivos não relacionados ao corrigir um problema local.

## Regras de documentação

- Se o comportamento mudar, atualize a documentação de tempo de execução correspondente em `docs/`.
- Documente o comportamento implementado, não o comportamento futuro pretendido.
- Use a terminologia do repositório de maneira consistente:
  - `subscription`
  - `plan`
  - `offer`
  - `renewal cycle`
  - `dunning case`
  - `cancellation case`
  - `activity log`

## Regras de teste

- Sempre que possível, execute testes específicos para a área em que você fez alterações.
- Dê preferência aos padrões de teste de integração existentes no `integration-tests/http/`.
- Adicione ou atualize testes ao alterar:
  - contratos de API
  - comportamento do fluxo de trabalho
  - lógica do agendador
  - transições de estado entre domínios
- Mantenha os testes independentes. Não dependa de dados pré-inseridos.
- Se você alterar o comportamento documentado, verifique se a implementação e a documentação permanecem alinhadas.
