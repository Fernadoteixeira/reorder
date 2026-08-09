---
name: create-spec
description: Instructions for creating design specifications (SPECs) before coding (Spec-driven development). Use this skill at the start of any non-trivial task (requiring >3 steps or architectural decisions) to align on architecture and requirements before implementation.
---

# Desenvolvimento orientado a especificações (Design Antes da Codificação)

Essa habilidade reforça a abordagem de “especificação antes do código” inspirada nas melhores práticas do OpenMercato. Evita erros de design e fornece estrutura ao processo de implementação.

## Quando criar uma especificação?

Para qualquer tarefa não trivial (por exemplo, adicionar uma nova entidade, modificar a lógica de renovação de assinatura, integrar um gateway de pagamento) que exija **pelo menos três etapas de implementação** ou **decisões arquitetônicas**, você deve primeiro escrever uma especificação técnica.

## Fluxo de trabalho

1. **Crie uma especificação de esqueleto**:
   - Crie um arquivo em `.agents/specs/{date}-{title}.md`.
   - Use o formato `AAAA-MM-DD` para `data` e kebab-case para o `título`.
   - O esqueleto deve incluir uma breve descrição (TLDR/Visão Geral) e objetivos principais.

2. **Seção de Perguntas Abertas**:
   - Antes de expandir a especificação completa, liste as chaves desconhecidas como uma lista numerada (`Q1`, `Q2`...).
   - Concentre-se em questões sobre arquitetura, modelos de dados ou escopo, onde uma suposição incorreta forçaria você a reescrever grandes partes do código.
   - **PARE** e peça ao usuário respostas para essas perguntas. Não escreva o código ou a especificação completa até que o usuário responda.

3. **Complete a Especificação**:
   - Após receber as respostas do usuário, preencha o arquivo de especificação com detalhes técnicos (esquema de banco de dados, contratos de API, etapas de implementação).
   - Remova a seção Perguntas Abertas.

4. **Fases de Implementação**:
   - Divida o trabalho em fases (por exemplo, Fase 1: Configuração do banco de dados e módulos, Fase 2: Fluxos de trabalho e APIs, Fase 3: Integração da UI).
   - Cada etapa deve representar uma unidade de trabalho testável.

## Modelo de Especificação

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
