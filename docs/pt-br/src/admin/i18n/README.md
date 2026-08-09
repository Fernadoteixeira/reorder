# Traduções das personalizações do administrador

O painel de administração do Medusa oferece suporte a vários idiomas em sua interface. O Medusa utiliza o [react-i18next](https://react.i18next.com/) para gerenciar as traduções no painel de administração.

Para adicionar traduções, crie arquivos de tradução em JSON para cada idioma no diretório `src/admin/i18n/json`. Por exemplo, crie o arquivo `src/admin/i18n/json/en.json` com o seguinte conteúdo:

```json
{
  "brands": {
    "title": "Brands",
    "description": "Manage your product brands"
  },
  "done": "Done"
}
```

Em seguida, exporte as traduções em `src/admin/i18n/index.ts`:

```ts
import en from "./json/en.json" with { type: "json" }

export default {
  en: {
    translation: en,
  },
}
```

Por fim, utilize traduções nos seus widgets de administração e rotas usando o hook `useTranslation`:

```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

const ProductWidget = () => {
  const { t } = useTranslation()
  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("brands.title")}</Heading>
        <p>{t("brands.description")}</p>
      </div>
      <div className="flex justify-end px-6 py-4">
        <Button variant="primary">{t("done")}</Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductWidget
```

Saiba mais sobre como traduzir extensões de administração na documentação [Traduzir personalizações de administração](https://docs.medusajs.com/learn/fundamentals/admin/translations).