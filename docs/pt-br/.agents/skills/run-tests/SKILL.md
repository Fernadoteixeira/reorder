---
name: run-tests
description: Instructions for running and writing unit and integration tests for the reorder plugin. Use this skill when your task requires code validation, writing new tests, or diagnosing test errors.
---

# Instruções de teste para o Reorder

Essa habilidade ajuda o agente de IA a escrever, executar e verificar testes de forma eficaz para o projeto `reorder`.

## Regras básicas para testes

1. **Execute testes específicos** para a área que você modificou, sempre que possível.
2. **Dê preferência aos testes de integração HTTP** localizados no diretório `integration-tests/http/`.
3. **Sempre adicione ou atualize os testes** caso introduza alterações em:
   - Contratos de API (manipuladores de rota)
   - Comportamentos de fluxo de trabalho (fluxos de trabalho)
   - Lógica de agendamento de tarefas (tarefas do agendador)
   - Transições de estado entre diferentes domínios
4. **Testes autônomos**: os testes não devem depender de dados pré-inseridos no banco de dados nem dos resultados de outros testes. Prepare todos os fixtures necessários no bloco `beforeAll` / `beforeEach` e limpe tudo depois.
5. **Alinhamento com a documentação**: se você modificar o comportamento do plugin descrito na documentação (`docs/`), certifique-se de que os testes reflitam essas alterações.

## Comandos para executar testes

Utilize os seguintes scripts do diretório `package.json`, localizado no diretório `reorder`:

- Executar testes de integração HTTP:
  ```bash
  yarn test:integration:http
  ```
- Executar testes dos módulos de integração:
  ```bash
  yarn test:integration:modules
  ```
- Executar todos os testes:
  ```bash
  yarn test
  ```

Para executar um único arquivo de teste, use o Jest com o caminho do arquivo, por exemplo:
```bash
yarn jest integration-tests/http/subscriptions.spec.ts
```
