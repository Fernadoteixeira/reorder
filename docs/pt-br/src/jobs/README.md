# Tarefas agendadas personalizadas

Uma tarefa agendada é uma função executada em um intervalo de tempo especificado em segundo plano no seu aplicativo Medusa.

Uma tarefa agendada é criada em um arquivo TypeScript ou JavaScript no diretório `src/jobs`.

Por exemplo, crie o arquivo `src/jobs/hello-world.ts` com o seguinte conteúdo:

```ts
import {
  MedusaContainer
} from "@medusajs/framework/types";

export default async function myCustomJob(container: MedusaContainer) {
  const productService = container.resolve("product")

  const products = await productService.listAndCountProducts();

  // Do something with the products
}

export const config = {
  name: "daily-product-report",
  schedule: "0 0 * * *", // Every day at midnight
};
```

Um arquivo de tarefa agendada deve exportar:

- A função a ser executada sempre que chegar a hora de executar a tarefa agendada.
- Um objeto de configuração que define a tarefa. Ele possui três propriedades:
  - `name`: um nome exclusivo para a tarefa.
  - `schedule`: uma [expressão cron](https://crontab.guru/).
  - `numberOfExecutions`: um número inteiro opcional, que especifica quantas vezes a tarefa será executada antes de ser removida

O `handler` é uma função que aceita um parâmetro, `container`, que é uma instância de `MedusaContainer` usada para resolver serviços.
