---
name: local-dev
description: Guidelines for local development and testing of the reorder plugin in an external Medusa backend project. Use this skill only when the task involves deploying, syncing, or locally running the plugin with a backend.
---

# Desenvolvimento local no backend da Medusa

Esta habilidade descreve como sincronizar alterações locais no plugin `reorder` com um backend externo da Medusa durante o desenvolvimento local.

## Pré-requisitos

No arquivo `package.json` do backend Medusa, declare a dependência do plugin usando um caminho de arquivo local:
```json
"@reorderjs/reorder": "file:../reorder"
```
Certifique-se de executar `yarn install` no projeto backend Medusa após adicionar ou atualizar este caminho.

## Fluxo de trabalho de sincronização

Quando você modifica o código neste repositório (`reorder`) e deseja que o backend externo do Medusa importe as alterações mais recentes:

1. No repositório `reorder`, execute:
   ```bash
   yarn medusa plugin:publish
   ```
2. No diretório do projeto backend Medusa, execute:
   ```bash
   yarn medusa db:migrate
   ```
3. No diretório do projeto backend Medusa, reinstale o pacote do sistema de arquivos:
   ```bash
   yarn install
   ```

> [!IMPORTANTE]
> Não presuma que o backend do Medusa está usando o código do plug-in local mais recente até que toda a sequência de comandos seja concluída com êxito.

## Comandos úteis de plug-in

No diretório `reorder`, você pode executar:
- `yarn dev` – Executa o processo em modo de desenvolvimento.
- `yarn build` – Constrói os arquivos do plugin para produção.
