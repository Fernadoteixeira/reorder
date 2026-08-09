## Provedores de módulos

Você pode criar provedores de módulos, como Notification ou File Module Providers em um subdiretório deste diretório. Por exemplo, `src/providers/my-notification`.

Em seguida, você os registra no aplicativo Medusa como `plugin-name/providers/my-notification`:

```ts
module.exports = defineConfig({
  // ...
  modules: [
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@myorg/plugin-name/providers/my-notification",
            id: "my-notification",
            options: {
              channels: ["email"],
              // provider options...
            },
          },
        ],
      },
    },
  ],
})
```

Saiba mais nesta documentação](https://docs.medusajs.com/learn/fundamentals/plugins/create).
