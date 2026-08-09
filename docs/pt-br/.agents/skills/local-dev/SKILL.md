---
name: local-dev
description: Guidelines for local development and testing of the reorder plugin in an external Medusa backend project. Use this skill only when the task involves deploying, syncing, or locally running the plugin with a backend.
---

# Desenvolvimento local no backend do Medusa

Esta habilidade descreve como sincronizar alterações locais no plugin `reorder` com um backend externo do Medusa durante o desenvolvimento local.

## Pré-requisitos

No arquivo `package.json` do backend do Medusa, declare a dependência do plug-in usando um caminho local do arquivo:
```json
"@reorderjs/reorder": "file:../reorder"
```
Certifique-se de executar o `yarn install` no projeto do backend do Medusa após adicionar ou atualizar esse caminho.

## Fluxo de trabalho de sincronização

Quando você modifica o código neste repositório (`reorder`) e deseja que o backend externo do Medusa importe as alterações mais recentes:

1. No repositório `reorder`, execute:
   ```bash
   yarn medusa plugin:publish
   ```
2. No diretório do projeto de backend do Medusa, execute:
   ```bash
   yarn medusa db:migrate
   ```
3. No diretório do projeto de backend do Medusa, reinstale o pacote a partir do sistema de arquivos:
   ```bash
   yarn install
   ```

> [!IMPORTANTE]
> Não presuma que o backend do Medusa esteja utilizando o código mais recente do plug-in local até que toda essa sequência de comandos tenha sido concluída com sucesso.

## Comandos úteis do plugin

No diretório `reorder`, você pode executar:
- `yarn dev` – Executa o processo no modo de desenvolvimento.
- `yarn build` – Compila os arquivos do plug-in para produção.
