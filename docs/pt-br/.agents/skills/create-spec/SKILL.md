---
name: create-spec
description: Instructions for creating design specifications (SPECs) before coding (Spec-driven development). Use this skill at the start of any non-trivial task (requiring >3 steps or architectural decisions) to align on architecture and requirements before implementation.
---

# Desenvolvimento orientado por especificações (Projetar antes de programar)

Essa habilidade promove a abordagem “especificação antes do código”, inspirada nas melhores práticas do OpenMercato. Ela evita erros de projeto e proporciona estrutura ao processo de implementação.

## Quando criar uma especificação?

Para qualquer tarefa não trivial (por exemplo, adicionar uma nova entidade, modificar a lógica de renovação de assinaturas, integrar um gateway de pagamento) que exija **pelo menos três etapas de implementação** ou **decisões arquitetônicas**, é necessário primeiro redigir uma especificação técnica.

## Fluxo de trabalho

1. **Criar um esboço de especificação**:
   - Crie um arquivo com o nome `.agents/specs/{date}-{title}.md`.
   - Use o formato `YYYY-MM-DD` para `date` e o formato “kebab-case” para `title`.
   - O esboço deve incluir uma breve descrição (TLDR/Visão geral) e os principais objetivos.

2. **Seção de Questões em Aberto**:
   - Antes de expandir a especificação completa, liste as principais incógnitas em uma lista numerada (`Q1`, `Q2`...).
   - Concentre-se em questões relacionadas à arquitetura, modelos de dados ou escopo, nas quais uma suposição incorreta o forçaria a reescrever grandes partes do código.
   - **PARE** e peça ao usuário respostas para essas perguntas. Não escreva código nem a especificação completa até que o usuário responda.

3. **Concluir a especificação**:
   - Após receber as respostas do usuário, preencha o arquivo de especificação com os detalhes técnicos (esquema do banco de dados, contratos de API, etapas de implementação).
   - Remova a seção “Questões em aberto”.

4. **Fases de implementação**:
   - Divida o trabalho em fases (por exemplo, Fase 1: Configuração do banco de dados e dos módulos; Fase 2: Fluxos de trabalho e APIs; Fase 3: Integração da interface do usuário).
   - Cada etapa deve representar uma unidade de trabalho testável.

## Modelo de especificação

Cada arquivo de especificação deve seguir esta estrutura:

```markdown
# Spec: [Feature Name]

## TLDR & Overview
A brief summary of the problem and the proposed solution.

## Open Questions (Skeleton Phase Only - remove after resolving)
- Q1: ...
- Q2: ...

## Proposed Architecture & Data Model
Describe new database tables, entity changes, module services, new workflows, or API endpoints.

## Step-by-Step Implementation Plan
### Phase 1: [Phase Name]
- [ ] Step 1 (e.g., database migration & entities)
- [ ] Step 2
### Phase 2: [Phase Name]
- [ ] Step 1 (e.g., API route.ts)

## Verification & Testing
How will you verify correctness? What integration HTTP tests will be added?
```
