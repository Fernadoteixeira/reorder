# Links do módulo

Um link de módulo estabelece uma associação entre dois modelos de dados de módulos diferentes, mantendo o isolamento dos módulos.

Saiba mais sobre links nesta [documentação](https://docs.medusajs.com/learn/fundamentals/module-links)

Por exemplo:

```ts
import BlogModule from "../modules/blog"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  ProductModule.linkable.product,
  BlogModule.linkable.post
)
```

Isso define uma ligação entre o modelo de dados `product` do Módulo de Produtos e o modelo de dados `post` do Módulo de Blog (módulo personalizado).

Em seguida, no aplicativo Medusa que utiliza esse plug-in, execute o seguinte comando para sincronizar os links com o banco de dados:

```bash
npx medusa db:migrate
```