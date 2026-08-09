---
name: run-tests
description: Instructions for running and writing unit and integration tests for the reorder plugin. Use this skill when your task requires code validation, writing new tests, or diagnosing test errors.
---

# Instruções de teste para reordenar

Essa habilidade ajuda o agente de IA a escrever, executar e verificar testes para o projeto `reorder` de maneira eficaz.

## Regras básicas de teste

1. **Execute testes específicos** para a área que você modificou sempre que possível.
2. **Prefira testes HTTP de integração** localizados no diretório `integration-tests/http/`.
3. **Sempre adicione ou atualize testes** se você introduzir alterações em:
   - Contratos API (manipuladores de rotas)
   - Comportamentos de fluxo de trabalho (fluxos de trabalho)
   - Lógica de agendamento de tarefas (tarefas do agendador)
   - Transições de estado entre diferentes domínios
4. **Testes independentes**: Os testes não devem depender de dados pré-projetados no banco de dados ou dos resultados de outros testes. Prepare todos os acessórios necessários no bloco `beforeAll` / `beforeEach` e limpe depois.
5. **Alinhamento da documentação**: Se você modificar o comportamento do plugin descrito na documentação (`docs/`), certifique-se de que os testes reflitam essas alterações.

## Comandos para execução de testes

Use os seguintes scripts de `package.json` no diretório `reorder`:

- Execute testes HTTP de integração:
  ```bash
  yarn test:integration:http
  ```
- Execute testes de módulos de integração:
  ```bash
  yarn test:integration:modules
  ```
- Execute todos os testes:
  ```bash
  yarn test
  ```

Para executar um único arquivo de teste, use Jest com o caminho do arquivo, por exemplo:
```bash
yarn jest integration-tests/http/subscriptions.spec.ts
```
