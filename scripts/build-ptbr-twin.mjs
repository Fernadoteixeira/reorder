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

const mdFiles = getAllMdFiles(".")
console.log(`Found ${mdFiles.length} markdown files to replicate in twin structure.`)

for (const filePath of mdFiles) {
  const normPath = filePath.replace(/^[.\\/]+/, "")
  const destPath = path.join(TARGET_BASE, normPath)
  const destDir = path.dirname(destPath)
  fs.mkdirSync(destDir, { recursive: true })
}

console.log(`Successfully initialized all twin directories inside ${TARGET_BASE}`)
