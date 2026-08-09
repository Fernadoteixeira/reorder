<div align="center">
  <a href="https://www.reorderjs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/f3420397-bfb7-4358-be41-aa2d9d22623c">
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/60cebea7-3f45-40cb-8382-301b52376e82">
    <img alt="Reordenar logotipo" src="https://github.com/user-attachments/assets/f3420397-bfb7-4358-be41-aa2d9d22623c">
  </picture>
  </a>
  <h1> Plug-in Medusa de assinatura de código aberto </h1> 
  <a href="https://github.com/reorder-js/reorder?tab=MIT-1-ov-file">
    <img alt="Licença" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  </a>
  <a href="https://github.com/reorder-js/reorder/issues">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="Aceitamos PRs!" />
  <a href="https://www.reorderjs.com/contact">
    <img alt="Suporte" src="https://img.shields.io/badge/support-contact%20author-blue.svg" />
  </a>
</div>

<h4 align="center">
  <a href="https://www.reorderjs.com">Site</a> | 
  <a href="https://docs.reorderjs.com">Documentação</a>

  &nbsp;

  <img width="800" height="600" alt="subscriptions-page-crop" src="https://github.com/user-attachments/assets/a7817f86-7524-4ccf-90f2-9beca34b50c4" />
</h4>

&nbsp;

## O que é o Reorder?

`Reorder` é um plug-in de assinatura de código aberto para o Medusa.

Ele adiciona recursos de comércio recorrente a uma loja Medusa, incluindo assinaturas, planos e ofertas, renovações, cobranças em atraso, fluxos de cancelamento e retenção, registros de atividades e análises.

O `Reorder` é desenvolvido como um plug-in do Medusa, com módulos do Medusa, mutações baseadas em fluxos de trabalho, rotas da API de administração, tarefas agendadas e extensões da interface de usuário de administração.

&nbsp;

## O que está incluído

- `Subscriptions`
- `Plans & Offers`
- `Renewals`
- `Dunning`
- `Cancellation & Retention`
- `Activity Log`
- `Analytics`

&nbsp;

## Escopo atual

Atualmente, o `Reorder` concentra-se em operações comerciais recorrentes gerenciadas a partir do Medusa Admin.

Atualmente, o plugin oferece ampla cobertura administrativa em todos os domínios implementados. Os fluxos de autoatendimento ao cliente serão introduzidos em breve como um `Reorder Subscription Starter`.

&nbsp;

## Destaques dos recursos

- Gerenciamento do ciclo de vida das assinaturas
- Planos e ofertas configuráveis
- Coordenação de renovações
- Novas tentativas de cobrança e ferramentas de recuperação
- Fluxos de cancelamento com ofertas de retenção
- Registros de atividades operacionais
- Análises e relatórios de assinaturas

&nbsp;

## Instalação

O `Reorder` destina-se a ser instalado em um projeto Medusa já existente.

### 1. Instale o plugin

Com `npm`:

```bash
npm install @reorderjs/reorder
```

Com `yarn`:

```bash
yarn add @reorderjs/reorder
```

### 2. Adicione o plug-in ao `medusa-config.ts`

```ts
plugins: [
  // other plugins
  {
    resolve: "@reorderjs/reorder",
    options: {},
  },
]
```

### 3. Executar migrações

Com `npm`:

```bash npm
npx medusa db:migrate
```

Com `yarn`:

```bash yarn
yarn medusa db:migrate
```

### 4. Inicie seu aplicativo Medusa

Depois de adicionar o plugin, execute o fluxo normal de configuração do Medusa no projeto da sua loja.

## Desenvolvimento local

Se você quiser trabalhar no próprio plugin localmente:

### 1. Clone o repositório

```bash
git clone https://github.com/reorder-js/reorder.git
cd reorder
```

### 2. Instalar dependências

```bash
yarn install
```

### 3. Publicar o plug-in local

```bash
yarn medusa plugin:publish
```

### 4. Adicione o plugin à sua loja Medusa

```bash
yarn medusa plugin:add reorder
```

### 5. Adicione a configuração do plug-in ao `medusa-config.ts`

```ts
plugins: [
  // other plugins
  {
    resolve: "reorder",
    options: {},
  },
]
```

### 6. Instalar as dependências da loja

```bash
yarn install
```

### 7. Comece sua loja Medusa

```bash
yarn dev
```

&nbsp;

## Requisitos

- Mínimo: Medusa `2.3+`
- Recomendado: compatível com `@medusajs/medusa >= 2.4.0`

&nbsp;

## Arquitetura

O `Reorder` está organizado em torno de blocos de construção nativos do Medusa:

- módulos de domínio para dados de assinatura e registros operacionais
- fluxos de trabalho para alterações nos negócios e orquestração
- rotas da API de administração para operações de plug-ins
- extensões da interface de usuário de administração para fluxos de gerenciamento
- tarefas agendadas para renovações, cobranças e processamento de análises

&nbsp;

## Documentação

A documentação do projeto está localizada em `docs/`.

Pontos de partida úteis:

- `docs/README.md`
- `docs/architecture/`
- `docs/api/`
- `docs/admin/`
- `docs/testing/`
- `docs/roadmap/implementation-plan.md`

&nbsp;

## Como contribuir

Problemas e pull requests são bem-vindos.

Antes de mudar o comportamento:

- ler a documentação do runtime em `docs/`
- manter a implementação alinhada com o comportamento documentado
- seguir as melhores práticas do Medusa para módulos, fluxos de trabalho, rotas e extensões da interface de usuário administrativa
