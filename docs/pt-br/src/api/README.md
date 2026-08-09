# Rotas personalizadas da API

Uma rota de API é um endpoint de API REST.

Uma rota de API é criada em um arquivo TypeScript ou JavaScript no diretório `/src/api` do seu aplicativo Medusa. O nome do arquivo deve ser `route.ts` ou `route.js`.

Por exemplo, para criar uma rota de API `GET` em `/store/hello-world`, crie o arquivo `src/api/store/hello-world/route.ts` com o seguinte conteúdo:

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({
    message: "Hello world!",
  });
}
```

## Métodos HTTP compatíveis

O roteamento baseado em arquivos suporta os seguintes métodos HTTP:

- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS
- HEAD

É possível definir um manipulador para cada um desses métodos exportando uma função com o nome do método no arquivo de caminhos `route.ts`.

Por exemplo:

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Handle GET requests
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Handle POST requests
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  // Handle PUT requests
}
```

## Parâmetros

Para criar uma rota de API que aceite um parâmetro de caminho, crie um diretório dentro do caminho da rota cujo nome siga o formato `[param]`.

Por exemplo, se você quiser definir uma rota que receba um parâmetro chamado `productId`, pode fazer isso criando um arquivo chamado `/api/products/[productId]/route.ts`:

```ts
import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { productId } = req.params;

  res.json({
    message: `You're looking for product ${productId}`
  })
}
```

Para criar uma rota de API que aceite vários parâmetros de caminho, crie, dentro do caminho do arquivo, vários diretórios cujos nomes sigam o formato `[param]`.

Por exemplo, se você quiser definir uma rota que aceite tanto o parâmetro `productId` quanto o parâmetro `variantId`, pode fazer isso criando um arquivo chamado `/api/products/[productId]/variants/[variantId]/route.ts`.

## Como usar o contêiner

O contêiner Medusa está disponível no `req.scope`. Use-o para acessar os principais serviços dos módulos e outros recursos registrados:

```ts
import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const productModuleService = req.scope.resolve("product")

  const [, count] = await productModuleService.listAndCount()

  res.json({
    count,
  })
}
```

## Middleware

Você pode aplicar middleware às suas rotas criando um arquivo chamado `/api/middlewares.ts`. Esse arquivo deve exportar um objeto de configuração indicando quais middlewares você deseja aplicar a quais rotas.

Por exemplo, se quiser aplicar uma função de middleware personalizada à rota `/store/custom`, você pode fazer isso adicionando o seguinte ao seu arquivo `/api/middlewares.ts`:

```ts
import { defineMiddlewares } from "@medusajs/framework/http"
import type {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http";

async function logger(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  console.log("Request received");
  next();
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/custom",
      middlewares: [logger],
    },
  ],
})
```

A propriedade `matcher` pode ser uma string ou uma expressão regular. A propriedade `middlewares` aceita um array de funções de middleware.
