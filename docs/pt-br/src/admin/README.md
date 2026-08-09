# Personalizações do administrador

É possível ampliar o Medusa Admin para adicionar widgets e novas páginas. Suas personalizações interagem com as rotas da API para oferecer funcionalidades personalizadas aos comerciantes.

## Exemplo: Criar um widget

Um widget é um componente React que pode ser inserido em uma página existente no painel de administração.

Por exemplo, crie o arquivo `src/admin/widgets/product-widget.tsx` com o seguinte conteúdo:

```tsx title="src/admin/widgets/product-widget.tsx"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

// The widget
const ProductWidget = () => {
  return (
    <div>
      <h2>Product Widget</h2>
    </div>
  )
}

// The widget's configurations
export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductWidget
```

Isso insere um widget com o texto “Widget do produto” no final da página de detalhes de um produto.