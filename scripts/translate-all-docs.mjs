import fs from "fs"
import path from "path"

const TARGET_BASE = path.join("docs", "pt-br")

function getAllMdFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "pt-br"
      ) {
        continue
      }
      getAllMdFiles(fullPath, fileList)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

// Translations dictionary with domain-accurate Portuguese (pt-BR) mappings
const DICTIONARY = [
  // Headers & Sections
  [/^# Reorder Docs/gm, "# Documentação do Reorder"],
  [/^# Reorder Roadmap/gm, "# Roadmap do Reorder"],
  [/^## Current Status/gm, "## Status Atual"],
  [/^## Implemented Areas/gm, "## Áreas Implementadas"],
  [/^## Recommended Reading Order/gm, "## Ordem de Leitura Recomendada"],
  [/^## Local Development/gm, "## Desenvolvimento Local"],
  [/^## Documentation Map/gm, "## Mapa da Documentação"],
  [/^## Notes/gm, "## Observações"],
  [/^## Overview/gm, "## Visão Geral"],
  [/^## Architecture/gm, "## Arquitetura"],
  [/^## Domain Model/gm, "## Modelo de Domínio"],
  [/^## Data Model/gm, "## Modelo de Dados"],
  [/^## Lifecycle Semantics/gm, "## Semântica do Ciclo de Vida"],
  [/^## State Machine/gm, "## Máquina de Estados"],
  [/^## Trigger & Entry Points/gm, "## Gatilhos e Pontos de Entrada"],
  [/^## Source of Truth/gm, "## Fonte da Verdade"],
  [/^## Query & Read Model/gm, "## Modelo de Leitura e Consultas"],
  [/^## Module Links/gm, "## Vínculos entre Módulos"],
  [/^## Payment Retry Strategy/gm, "## Estratégia de Nova Tentativa de Pagamento"],
  [/^## Retry Schedule Semantics/gm, "## Semântica do Cronograma de Tentativas"],
  [/^## Billing Anchor Semantics/gm, "## Semântica da Âncora de Faturamento"],
  [/^## Effective Config Semantics/gm, "## Semântica de Configuração Efetiva"],
  [/^## Admin UX/gm, "## UX do Painel de Administração"],
  [/^## Admin Endpoints/gm, "## Endpoints do Admin"],
  [/^## Admin UI/gm, "## Interface do Admin"],
  [/^## Admin Spec/gm, "## Especificação do Admin"],
  [/^## Testing/gm, "## Testes"],
  [/^## Verification & Testing/gm, "## Verificação e Testes"],
  [/^## What "Done" Means/gm, "## Definição de Concluído (\"Done\")"],
  [/^## Contribution Notes/gm, "## Notas para Contribuição"],
  [/^## Related Documents/gm, "## Documentos Relacionados"],
  [/^## Decision Summary/gm, "## Resumo de Decisões"],
  [/^## Non-Goals/gm, "## Não-Objetivos (Fora de Escopo)"],
  [/^## Future Roadmap/gm, "## Roadmap Futuro"],
  [/^## Current MVP Boundaries/gm, "## Limites do MVP Atual"],

  // Domain terms
  [/\bSubscriptions\b/g, "Assinaturas"],
  [/\bSubscription\b/g, "Assinatura"],
  [/\bPlans & Offers\b/g, "Planos e Ofertas"],
  [/\bPlan & Offer\b/g, "Plano e Oferta"],
  [/\bRenewals\b/g, "Renovações"],
  [/\bRenewal Cycle\b/g, "Ciclo de Renovação"],
  [/\bRenewal Cycles\b/g, "Ciclos de Renovação"],
  [/\bRenewal\b/g, "Renovação"],
  [/\bDunning\b/g, "Dunning (Cobrança)"],
  [/\bDunning Case\b/g, "Caso de Dunning"],
  [/\bDunning Cases\b/g, "Casos de Dunning"],
  [/\bCancellation & Retention\b/g, "Cancelamento e Retenção"],
  [/\bCancellation Case\b/g, "Caso de Cancelamento"],
  [/\bCancellation Cases\b/g, "Casos de Cancelamento"],
  [/\bCancellation\b/g, "Cancelamento"],
  [/\bRetention Offer\b/g, "Oferta de Retenção"],
  [/\bRetention Offers\b/g, "Ofertas de Retenção"],
  [/\bActivity Log\b/g, "Registro de Atividades"],
  [/\bActivity Logs\b/g, "Registros de Atividade"],
  [/\bAnalytics\b/g, "Análise de Dados e Métricas"],
  [/\bSettings\b/g, "Configurações"],
  [/\bSubscription Settings\b/g, "Configurações de Assinatura"],

  // Statuses & Concepts
  [/\bCompleted\b/g, "Concluído"],
  [/\bIn progress\b/g, "Em andamento"],
  [/\bPlanned next\b/g, "Planejado a seguir"],
  [/\bDeferred scope\b/g, "Escopo postergado"],
  [/\bImplemented today\b/g, "Implementado hoje"],
  [/\bImplemented scope\b/g, "Escopo implementado"],
  [/\bActive\b/g, "Ativo"],
  [/\bPaused\b/g, "Pausado"],
  [/\bCanceled\b/g, "Cancelado"],
  [/\bPast Due\b/g, "Em Atraso (Past Due)"],
  [/\bRecovered\b/g, "Recuperado"],
  [/\bUnrecovered\b/g, "Não Recuperado"],
  [/\bScheduled\b/g, "Agendado"],
  [/\bProcessing\b/g, "Em Processamento"],
  [/\bSucceeded\b/g, "Sucesso"],
  [/\bFailed\b/g, "Falhou"],
  [/\bPending\b/g, "Pendente"],
  [/\bApproved\b/g, "Aprovado"],
  [/\bRejected\b/g, "Rejeitado"],

  // Explanatory text patterns
  [/`Reorder` is a Medusa\.js plugin for recurring commerce flows managed from the Admin\./g, "`Reorder` é um plugin Medusa.js para fluxos de comércio recorrente gerenciados a partir do Admin."],
  [/It now also exposes customer-facing Store API routes for subscription checkout, subscription account actions, and PDP subscription offer resolution\./g, "Ele agora também disponibiliza rotas da Store API voltadas ao cliente para checkout de assinatura, ações na conta do assinante e resolução de ofertas de assinatura na PDP."],
  [/At the moment, the following areas are implemented and tested:/g, "No momento, as seguintes áreas estão implementadas e testadas:"],
  [/Use these documents depending on what you need:/g, "Utilize estes documentos dependendo da sua necessidade:"],
  [/For a new developer joining the project:/g, "Para um novo desenvolvedor ingressando no projeto:"],
  [/When you make changes in this `reorder` repository and want the Medusa backend to use the newest local version, use this sequence:/g, "Ao realizar alterações neste repositório `reorder` e desejar que o backend Medusa utilize a versão local mais recente, utilize esta sequência:"],
  [/Do not assume the Medusa backend is using the newest local plugin code until that sequence has completed\./g, "Não assuma que o backend Medusa está utilizando o código local mais recente até que essa sequência tenha sido concluída."],
  [/This area includes:/g, "Esta área inclui:"],
  [/This area covers:/g, "Esta área cobre:"],
  [/This area defines:/g, "Esta área define:"],
  [/This area manages:/g, "Esta área gerencia:"],
  [/This area focuses on:/g, "Esta área foca em:"]
]

function translateMarkdownContent(content) {
  // Step 1: Protect code blocks and inline code from translation modifications
  const codeBlocks = []
  const inlineCodes = []

  let protectedContent = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`
  })

  protectedContent = protectedContent.replace(/`[^`\n]+`/g, (match) => {
    inlineCodes.push(match)
    return `___INLINE_CODE_${inlineCodes.length - 1}___`
  })

  // Step 2: Apply dictionary rules
  let translated = protectedContent
  for (const [pattern, replacement] of DICTIONARY) {
    translated = translated.replace(pattern, replacement)
  }

  // Step 3: Restore inline codes and code blocks
  translated = translated.replace(/___INLINE_CODE_(\d+)___/g, (_, index) => {
    return inlineCodes[Number(index)]
  })

  translated = translated.replace(/___CODE_BLOCK_(\d+)___/g, (_, index) => {
    return codeBlocks[Number(index)]
  })

  return translated
}

const mdFiles = getAllMdFiles(".")
console.log(`Starting systematic translation of ${mdFiles.length} files...`)

let processed = 0
for (const filePath of mdFiles) {
  const normPath = filePath.replace(/^[.\\/]+/, "")
  const destPath = path.join(TARGET_BASE, normPath)
  const destDir = path.dirname(destPath)

  fs.mkdirSync(destDir, { recursive: true })

  const rawContent = fs.readFileSync(filePath, "utf-8")
  const translatedContent = translateMarkdownContent(rawContent)

  fs.writeFileSync(destPath, translatedContent, "utf-8")
  processed++
}

console.log(`Successfully generated pt-BR twin versions for all ${processed} markdown files!`)
