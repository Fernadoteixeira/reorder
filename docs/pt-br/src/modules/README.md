# Módulo personalizado

Um módulo é um pacote de funcionalidades reutilizáveis. Ele pode ser integrado à sua aplicação Medusa sem afetar o sistema como um todo. É possível criar um módulo como parte de um plug-in.

Saiba mais sobre os módulos nesta [documentação](https://docs.medusajs.com/learn/fundamentals/modules).

Para criar um módulo:

## 1. Crie um modelo de dados

Um modelo de dados representa uma tabela no banco de dados. Você cria um modelo de dados em um arquivo TypeScript ou JavaScript no diretório `models` de um módulo.

Por exemplo, crie o arquivo `src/modules/blog/models/post.ts` com o seguinte conteúdo:

```ts
import { model } from "@medusajs/framework/utils"

const Post = model.define("post", {
  id: model.id().primaryKey(),
  title: model.text(),
})

export default Post
```

## 2. Crie um serviço

Um módulo deve definir um serviço. Um serviço é uma classe TypeScript ou JavaScript que contém métodos relacionados a uma lógica de negócios ou funcionalidade de comércio.

Por exemplo, crie o arquivo `src/modules/blog/service.ts` com o seguinte conteúdo:

```ts
import { MedusaService } from "@medusajs/framework/utils"
import Post from "./models/post"

class BlogModuleService extends MedusaService({
  Post,
}){
}

export default BlogModuleService
```

## 3. Definição do Módulo de Exportação

Um módulo deve ter um arquivo `index.ts` em seu diretório raiz que exporte sua definição. A definição especifica o serviço principal do módulo.

Por exemplo, crie o arquivo `src/modules/blog/index.ts` com o seguinte conteúdo:

```ts
import BlogModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const BLOG_MODULE = "blog"

export default Module(BLOG_MODULE, {
  service: BlogModuleService,
})
```

## 4. Gerar migrações

Para gerar migrações para o seu módulo, execute o seguinte comando no diretório do plugin:

```bash
npx medusa plugin:db:genreate
```

## Usar Módulo

Você pode utilizar o módulo em customizações dentro do plugin ou dentro da aplicação Medusa utilizando este plugin. Quando o plugin é adicionado a uma aplicação Medusa, todos os seus módulos também são registrados.

Por exemplo, para usar o módulo em uma rota de API:

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import BlogModuleService from "../../../modules/blog/service"
import { BLOG_MODULE } from "../../../modules/blog"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const blogModuleService: BlogModuleService = req.scope.resolve(
    BLOG_MODULE
  )

  const posts = await blogModuleService.listPosts()

  res.json({
    posts
  })
}
```

## Opções de módulo

Ao cadastrar o plugin no aplicativo Medusa, ele pode aceitar opções. Estas opções são passadas para os módulos dentro do plugin:

```ts
import { defineConfig } from "@medusajs/framework/utils"

module.exports = defineConfig({
  // ...
  plugins: [
    {
      resolve: "@myorg/plugin-name",
      options: {
        apiKey: process.env.API_KEY,
      },
    },
  ],
})
```

Saiba mais sobre as opções do módulo [nesta documentação](https://docs.medusajs.com/learn/fundamentals/modules/options).
