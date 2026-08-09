<div alinhar="centro">
  <a href="https://www.reorderjs.com">
  <imagem>
    <source media="(prefere esquema de cores: escuro)" srcset="https://github.com/user-attachments/assets/f3420397-bfb7-4358-be41-aa2d9d22623c">
    <source media="(prefere esquema de cores: claro)" srcset="https://github.com/user-attachments/assets/60cebea7-3f45-40cb-8382-301b52376e82">
    <img alt="Reordenar logotipo" src="https://github.com/user-attachments/assets/f3420397-bfb7-4358-be41-aa2d9d22623c">
  </imagem>
  </a>
  <h1> Plug-in Medusa de assinatura de código aberto </h1> 
  <a href="https://github.com/reorder-js/reorder?tab=MIT-1-ov-file">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  </a>
  <a href="https://github.com/reorder-js/reorder/issues">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="RPs bem-vindos!" />
  <a href="https://www.reorderjs.com/contact">
    <img alt="Support" src="https://img.shields.io/badge/support-contact%20author-blue.svg" />
  </a>
</div>

<h4 alinhar="centro">
  <a href="https://www.reorderjs.com">Site</a> | 
  <a href="https://docs.reorderjs.com">Documentação</a>

 

<img width="800" height="600" alt="subscriptions-page-crop" src="https://github.com/user-attachments/assets/a7817f86-7524-4ccf-90f2-9beca34b50c4" />
</h4>

 

## O que é reordenar?

`Reorder` é um plugin de assinatura Medusa de código aberto.

Ele adiciona recursos de comércio recorrente a uma loja Medusa, incluindo assinaturas, planos e ofertas, renovações, cobrança, cancelamento e fluxos de retenção, registros de atividades e análises.

`Reorder` é construído como um plugin Medusa com módulos Medusa, mutações baseadas em fluxo de trabalho, rotas de API de administração, trabalhos agendados e extensões de UI de administração.

 

## O que inclui

- `Assinaturas`
- `Planos e Ofertas`
- `Renovações`
- `Cobrança`
- `Cancelamento e Retenção`
- `Registro de atividades`
- `Analítica`

 

## Escopo atual

`Reorder` atualmente se concentra em operações comerciais recorrentes gerenciadas pelo Medusa Admin.

Hoje, o plugin oferece forte cobertura administrativa em todos os domínios implementados. Os fluxos de autoatendimento do cliente serão introduzidos em um futuro próximo como um `Reorder Subscription Starter`.

 

## Destaques dos recursos

- Gerenciamento do ciclo de vida da assinatura
- Planos e ofertas configuráveis
- Orquestração de renovação
- Novas tentativas de cobrança e ferramentas de recuperação
- Fluxos de cancelamento com ofertas de retenção
- Registros de atividades operacionais
- Análise e relatórios de assinaturas

 

## Instalação

`Reorder` deve ser instalado em um projeto Medusa existente.

### 1. Instale o plugin

Com `npm`:

```bash
npm install @reorderjs/reorder
```

Com `fio`:

```bash
yarn add @reorderjs/reorder
```

### 2. Adicione o plugin em `medusa-config.ts`

```ts
plugins: [
  // other plugins
  {
    resolve: "@reorderjs/reorder",
    options: {},
  },
]
```

### 3. Execute migrações

Com `npm`:

```bash npm
npx medusa db:migrate
```

Com `fio`:

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

### 2. Instale dependências

```bash
yarn install
```

### 3. Publique o plugin local

```bash
yarn medusa plugin:publish
```

### 4. Adicione o plugin em sua loja Medusa

```bash
yarn medusa plugin:add reorder
```

### 5. Adicione a configuração do plugin em `medusa-config.ts`

```ts
plugins: [
  // other plugins
  {
    resolve: "reorder",
    options: {},
  },
]
```

### 6. Instale dependências de loja

```bash
yarn install
```

### 7. Comece sua loja Medusa

```bash
yarn dev
```

 

## Requisitos

- Mínimo: Medusa `2.3+`
- Recomendado: compatível com `@medusajs/medusa >= 2.4.0`

 

## Arquitetura

`Reordenar` é organizado em torno de blocos de construção nativos da Medusa:

- módulos de domínio para dados de assinatura e registros operacionais
- fluxos de trabalho para mutações e orquestração de negócios
- Rotas da API Admin para operações de plugins
- Extensões de interface de administração para fluxos de gerenciamento
- trabalhos agendados para renovações, cobranças e processamento de análises

 

## Documentação

A documentação do projeto reside em `docs/`.

Pontos de partida úteis:

- `docs/README.md`
- `docs/arquitetura/`
- `docs/api/`
- `docs/admin/`
- `docs/testes/`
- `docs/roadmap/implementation-plan.md`

 

## Contribuindo

Problemas e solicitações pull são bem-vindos.

Antes de mudar o comportamento:

- leia a documentação do tempo de execução em `docs/`
- manter a implementação alinhada com o comportamento documentado
- siga as práticas recomendadas da Medusa para módulos, fluxos de trabalho, rotas e extensões de interface de administração
