# Reordenar diretrizes do agente

Este arquivo define como os agentes de codificação devem funcionar no repositório oficial `reorder`.

## Sempre

- Escreva todos os códigos, comentários, especificações, arquivos markdown, lições e mensagens de commit somente em inglês, independentemente do idioma usado no chat.
- **Antes de propor um commit ou git push, apresente uma mensagem de commit no formato Convencional Commits `type(scope): description` (por exemplo, `feat(ai): add create-spec skill`, `fix(dunning): resolve retry loop`) e aguarde a aprovação explícita do usuário.**
- Identifique qual área de Reordenação você está alterando e verifique o Roteador de Tarefas abaixo antes de iniciar.
- Leia a documentação de tempo de execução relevante em `docs/` antes de ler os arquivos de implementação.
- Consulte `docs/README.md` para visão geral do plugin, escopo atual e domínios implementados.
- Entre no modo de planejamento para tarefas não triviais (mais de 3 etapas ou decisões arquitetônicas) e use a habilidade `create-spec` para esboçar uma especificação em `.agents/specs/` antes de escrever o código.
- Marque `.agents/lessons.md` no início da sessão para evitar repetir erros passados.
- Após corrigir qualquer bug ou resolver um problema complexo, atualize `.agents/lessons.md` com a lição aprendida e uma regra para evitá-lo no futuro.
- Use as habilidades de agente da Medusa sempre que forem adequadas à tarefa.
- Mantenha as alterações mínimas e locais na área afetada.
- Siga as convenções da Medusa (roteamento baseado em arquivo com `route.ts`, resolução Awilix, módulos customizados em `src/modules/<domain>/`, modelos em `models/`, migrações em `migrations/`, fluxos de trabalho em `src/workflows/`, jobs em `src/jobs/`).
- Escrever testes de integração para novos recursos (preferindo testes de integração HTTP em `integration-tests/http/`). Mantenha-os independentes.
- Se o comportamento mudar, atualize a documentação de tempo de execução correspondente em `docs/`.

## Pergunte primeiro

- Pergunte antes de alterar a automação de filiais/PR, rótulos de pipeline, fluxos de controle de qualidade ou comportamentos de liberação.
- Pergunte antes de fazer alterações que abranjam vários domínios ou módulos sem uma especificação existente.
- Pergunte antes de adicionar novas dependências externas a `package.json`.
- Pergunte antes de modificar modelos de banco de dados ou introduzir migrações de esquema complexas.

## Nunca

- Nunca use `any` em código TypeScript. Prefira tipos de domínio descritivos e estritos.
- Nunca escreva regras de negócios diretamente em manipuladores de rotas ou componentes React; mantenha-os em fluxos de trabalho ou camadas de serviço.
- Nunca ignore guardas de mutação ou limites de domínio (não introduza acoplamento desnecessário entre domínios).
- Nunca modifique os arquivos gerados manualmente.
- Nunca refatore arquivos não relacionados enquanto corrige um problema local.
- Nunca documente o comportamento futuro pretendido; documente apenas comportamento estável e implementado.

## Comandos de validação

Execute o menor comando de validação relevante para suas alterações:

```bash
yarn build
yarn test:integration:http
yarn test:integration:modules
```

## Roteador de tarefas

Combine a tarefa com todas as linhas relevantes antes de pesquisar ou codificar.

| Tarefa | Leia primeiro / Ação |
|------|------------|
| Visão geral do plugin, escopo atual, domínios implementados | `docs/README.md` |
| Mudanças no domínio da assinatura | `docs/architecture/subscriptions.md`, `docs/api/admin-subscriptions.md`, `docs/testing/subscriptions.md` |
| Planejar e oferecer mudanças | `docs/architecture/plan-offers.md`, `docs/api/admin-plan-offers.md`, `docs/testing/plan-offers.md` |
| Mudanças de renovação | `docs/architecture/renewals.md`, `docs/api/admin-renewals.md`, `docs/testing/renewals.md` |
| Alterações na cobrança | `docs/architecture/dunning.md`, `docs/api/admin-dunning.md`, `docs/testing/dunning.md` |
| Alterações de cancelamento e retenção | `docs/architecture/cancellation.md`, `docs/api/admin-cancellations.md`, `docs/testing/cancellations.md` |
| Alterações no log de atividades | `docs/architecture/activity-log.md`, `docs/api/admin-activity-log.md`, `docs/testing/activity-log.md` |
| Mudanças analíticas | `docs/architecture/analytics.md`, `docs/api/admin-analytics.md`, `docs/testing/analytics.md` |
| Alterações nas configurações de assinatura | `docs/architecture/settings.md`, `docs/api/admin-subscription-settings.md`, `docs/testing/subscription-settings.md` |
| APIs de assinatura de vitrine e conta de cliente | `docs/api/store-subscription-checkout.md`, `docs/api/store-subscription-offers.md`, `docs/api/store-customer-cancellations.md`, `docs/architecture/subscriptions.md` |
| Rotas e widgets da UI do administrador | arquivos correspondentes em `docs/admin/`, então `src/admin/README.md` |
| Implementação de rota de API de administrador ou loja | `src/api/README.md`, então correspondendo a `docs/api/*.md` |
| Mutações apoiadas por fluxo de trabalho | `src/workflows/README.md`, então correspondência de arquitetura e documentos de API |
| Mudanças de módulo ou modelo | `src/modules/README.md`, então documento de arquitetura correspondente |
| Jobs e processamento programado | documento de arquitetura correspondente e documento de teste correspondente |
| Executando testes e validação de integração | Usar habilidade `run-tests` (`.agents/skills/run-tests/SKILL.md`) |
| Teste local e sincronização com backend Medusa | Usar habilidade `local-dev` (`.agents/skills/local-dev/SKILL.md`) |
| Escrever especificações de design antes da codificação | Usar habilidade `create-spec` (`.agents/skills/create-spec/SKILL.md`) |

## Mapa do repositório

Áreas importantes:

- `src/modules/` módulos de domínio e persistência
- `src/workflows/` mutações e orquestração de negócios
- `src/api/admin/` Rotas da API Admin
- `src/api/store/` Armazenar rotas de API
- `src/admin/` Rotas, widgets, tipos e auxiliares de cliente do painel de administração
- `src/jobs/` processamento agendado
- `src/links/` links de entidades Medusa
- `integration-tests/` cobertura de integração
- Documentação de tempo de execução `docs/`

## Regras de arquitetura

- Mantenha as regras de negócios em fluxos de trabalho ou serviços de módulo, não em manipuladores de rotas ou componentes React.
- Os manipuladores de rota devem validar a entrada, resolver dependências de `req.scope`, chamar fluxos de trabalho ou serviços e retornar DTOs.
- Mantenha a propriedade do domínio clara:
  - `subscription`
  - `plan-offer`
  - `renewal`
  - `dunning`
  - `cancellation`
  - `activity-log`
  - `analytics`
  - `settings`
- Reutilize padrões de fluxo de trabalho existentes para operações de mudança de estado.
- Preservar modelos de leitura baseados em instantâneos onde os documentos os descrevem.
- Mantenha as respostas da loja separadas dos DTOs administrativos.
- Não introduza acoplamento desnecessário entre domínios quando já existir um fluxo de trabalho ou limite de link existente.

## Convenções da Medusa

- Rotas baseadas em arquivo devem usar `route.ts`.
- Use `req.scope.resolve(...)` para serviços Medusa e recursos registrados.
- Mantenha os módulos personalizados em `src/modules/<domain>/`.
- Coloque modelos de módulos em `models/`, migrações em `migrations/` e auxiliares compartilhados em `utils/` ou `types/`.
- Mantenha os fluxos de trabalho em `src/workflows/` e as etapas em `src/workflows/steps/`.
- Os trabalhos agendados pertencem a `src/jobs/`.
- As extensões de administrador pertencem a `src/admin/`.

## Regras de codificação

- Prefira tipos de domínio e validadores existentes.
- Evite `any`.
- Mantenha a nomenclatura consistente com domínios, DTOs e nomes de rotas existentes.
- Use nomes explícitos e descritivos.
- Prefira pequenos ajudantes em vez de lógica inline profundamente aninhada.
- Siga os formatos de resposta existentes para cada área.
- Não refatore arquivos não relacionados ao corrigir um problema local.

## Regras de documentação

- Se o comportamento mudar, atualize os documentos de tempo de execução correspondentes em `docs/`.
- Documente o comportamento implementado, e não o comportamento futuro pretendido.
- Use a terminologia do repositório de forma consistente:
  - `subscription`
  - `plan`
  - `offer`
  - `renewal cycle`
  - `dunning case`
  - `cancellation case`
  - `activity log`

## Regras de teste

- Execute testes focados na área que você alterou sempre que possível.
- Prefira padrões de teste de integração existentes em `integration-tests/http/`.
- Adicionar ou atualizar testes ao alterar:
  - Contratos de API
  - comportamento do fluxo de trabalho
  - lógica do agendador
  - transições de estado entre domínios
- Mantenha os testes independentes. Não dependa de dados pré-projetados.
- Se você alterar o comportamento documentado, verifique se a implementação e os documentos permanecem alinhados.
