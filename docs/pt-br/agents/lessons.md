# Lições aprendidas

Neste arquivo, registramos padrões recorrentes, problemas encontrados e erros a serem evitados ao trabalhar com o plugin Reorder.
Deve ser revisado no início de uma sessão e atualizado após a correção de qualquer bug ou resolução de um problema complexo.

## Regras para Agentes de IA

### Restrição de idioma do repositório

- **Regra**: Todos os arquivos, comentários de código, documentação, especificações, lições e mensagens de commit adicionados ou modificados no repositório no GitHub DEVEM ser escritos em inglês. Mesmo que o usuário interaja com você em outro idioma (por exemplo, polonês), não escreva comentários de código, arquivos de habilidades, especificações ou arquivos de repositório em polonês.
- **Contexto**: A base de código do repositório e sua metaconfiguração (como instruções dos agentes de IA) devem manter um padrão unificado de idioma inglês.

### Commits do Git e aprovação push

- **Regra**: Antes de propor um commit ou git push ao GitHub, sempre construa um formato de mensagem de Commits Convencionais: `type(scope): description` e apresente-o ao usuário. Aguarde a aprovação explícita do usuário antes de prosseguir com o commit e o push.
- **Contexto**: ajuda o usuário a auditar e aceitar alterações individuais, garantindo que apenas commits bem formados com escopos corretos sejam enviados.

## Lições Gerais

### Instalação de pacote com Yarn 4 no Windows

- **Lição**: Ao instalar dependências usando Yarn Berry (v4) com `nodeLinker: node-modules`, patches de compatibilidade TypeScript integrados podem desencadear conflitos de blocos em determinadas plataformas.
- **Regra**: Use `corepack yarn install --mode=skip-build` para ignorar patches de ciclo de vida conflitantes e garantir links limpos em `node_modules`.

### Autenticação de Cliente em Testes de Integração de Loja

- **Lição**: Rotas de loja autenticadas pelo cliente (`/store/customers/me/subscriptions/*`) requerem tokens JWT assinados com `actor_type: "customer"` e `auth_identity_id` vinculados à entidade do cliente.
- **Regra**: Sempre use o auxiliar de fixação `createCustomerAuthHeaders(container, customerId)` compartilhado para gerar autenticação de portador padrão para testes de integração de vitrine do cliente.

