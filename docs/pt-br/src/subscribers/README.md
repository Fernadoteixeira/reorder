# Assinantes personalizados

Os assinantes tratam de eventos emitidos no aplicativo Medusa.

O assinante é criado em um arquivo TypeScript ou JavaScript no diretório `src/subscribers`.

Por exemplo, crie o arquivo `src/subscribers/product-created.ts` com o seguinte conteúdo:

```ts
import {
  type SubscriberConfig,
} from "@medusajs/framework"

// subscriber function
export default async function productCreateHandler() {
  console.log("A product was created")
}

// subscriber config
export const config: SubscriberConfig = {
  event: "product.created",
}
```

Um arquivo de assinante deve exportar:

- A função de assinante que é uma função assíncrona executada sempre que o evento associado é acionado.
- Um objeto de configuração que define o evento que este assinante está ouvindo.

## Parâmetros do Assinante

Um assinante recebe um objeto com as seguintes propriedades:

- `event`: Um objeto que contém os detalhes do evento. Possui uma propriedade `data`, que é a carga útil de dados do evento.
- `container`: O contêiner Medusa. Use-o para resolver os principais serviços dos módulos e outros recursos registrados.

```ts
import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

export default async function productCreateHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id

  const productModuleService = container.resolve("product")

  const product = await productModuleService.retrieveProduct(productId)

  console.log(`The product ${product.title} was created`)
}

export const config: SubscriberConfig = {
  event: "product.created",
}
```