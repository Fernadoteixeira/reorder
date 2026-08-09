# Lições aprendidas

Neste arquivo, registramos padrões recorrentes, problemas encontrados e erros a serem evitados ao trabalhar com o plugin Reorder.
Ele deve ser revisado no início de cada sessão e atualizado após a correção de qualquer bug ou a resolução de um problema complexo.

## Regras para agentes de IA

### Restrição de idioma do repositório

- **Regra**: Todos os arquivos, comentários de código, documentação, especificações, lições e mensagens de commit adicionados ou modificados no repositório no GitHub DEVEM ser escritos em inglês. Mesmo que o usuário interaja com você em outro idioma (por exemplo, português ou polonês), não escreva comentários de código, arquivos de habilidades, especificações ou arquivos do repositório em outro idioma que não seja o inglês.
- **Contexto**: A base de código do repositório e sua metaconfiguração (como instruções para agentes de IA) devem manter um padrão unificado de uso do inglês.

### Aprovação de commits e envios no Git

- **Regra**: Antes de propor um commit ou um `git push` para o GitHub, sempre elabore uma mensagem no formato Conventional Commits: `type(scope): description` e apresente-a ao usuário. Aguarde a aprovação explícita do usuário antes de prosseguir com o commit e o push.
- **Contexto**: Ajuda o usuário a revisar e aceitar alterações individuais, garantindo que apenas commits bem formados e com escopos corretos sejam enviados.

## Lições gerais

### Instalação de pacotes com o Yarn 4 no Windows e no Docker

- **Lição**: Ao instalar dependências usando o Yarn Berry (v4) com `nodeLinker: node-modules`, os patches de compatibilidade integrados do TypeScript podem causar conflitos de hunk no TypeScript 5.7+ (`Cannot apply hunk #1`).
- **Regra**: Fixe o `"typescript": "5.6.2"` e adicione o `"resolutions": { "typescript": "5.6.2" }` no `package.json`. Use o `corepack yarn install --mode=skip-build` para contornar patches de ciclo de vida conflitantes e garantir uma ligação limpa no `node_modules`.

### Registro do módulo Medusa v2 na configuração do plugin raiz

- **Lição**: Nas configurações do servidor de desenvolvimento do Medusa v2 (`medusa-config.ts`), os módulos de domínio personalizados devem ser registrados na matriz `modules` (`resolve: "./src/modules/<name>"`). NÃO defina `plugins: [{ resolve: projectRoot }]` na configuração raiz, pois o Medusa detectará os links duas vezes e apresentará uma falha com `Link module ... already exists`.
- **Regra**: Declare todos os módulos de domínio personalizados em `modules` e mantenha `plugins: []` na configuração raiz de desenvolvimento.

### Modo SSL do PostgreSQL em contêineres locais do Docker

- **Lição**: As conexões ao banco de dados do módulo Medusa v2 utilizam, por padrão, a negociação SSL caso não sejam especificadas, o que gera o erro `The server does not support SSL connections` ao se conectar a imagens padrão do Docker do PostgreSQL local.
- **Regra**: Sempre forneça `DATABASE_URL=postgres://.../dbname?sslmode=disable` e configure `databaseDriverOptions: { ssl: false }` em `medusa-config.ts`.

### Opções do compilador TypeScript para fluxos de trabalho do Medusa v2

- **Lição**: Os tipos de compensação das etapas do fluxo de trabalho do Medusa v2 (`CompensateFn<T>`) aceitam `T | undefined` como entrada quando a compensação é executada sem dados de retorno. Ativar o `"strict": true` genérico causa o erro TS2345 nas etapas de compensação, enquanto definir o `"moduleResolution": "bundler"` corrompe o `"module": "Node16"`.
- **Regra**: Mantenha `"module": "Node16"`, `"moduleResolution": "Node16"` e sinalizadores estritos granulares como `"strictNullChecks": true` em `tsconfig.json`.

### Autenticação do cliente nos testes de integração da loja

- **Lição**: As rotas da loja autenticadas pelo cliente (`/store/customers/me/subscriptions/*`) exigem tokens JWT assinados com `actor_type: "customer"` e `auth_identity_id` vinculados à entidade do cliente.
- **Regra**: Sempre use o auxiliar de fixture compartilhado `createCustomerAuthHeaders(container, customerId)` para gerar autenticação padrão do tipo “bearer” para testes de integração da loja virtual do cliente.
