import fs from 'fs/promises'
import path from 'path'
import glob from 'glob'

type SnippetBody = string | string[]
type SnippetPrefix = string | string[]

interface Snippet {
  prefix: SnippetPrefix
  body: SnippetBody
  description?: string
}

interface ValidationIssue {
  file: string
  name: string
  message: string
}

interface ValidationResult {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

const ROOT = path.resolve(__dirname, '..')
const SNIPPET_GLOB = path.join(ROOT, 'extension', 'snippets', '*.json')

async function readJson(file: string): Promise<Record<string, Snippet>> {
  const content = await fs.readFile(file, 'utf-8')
  return JSON.parse(content) as Record<string, Snippet>
}

function normalizeBody(body: SnippetBody): string[] {
  if (Array.isArray(body)) return body
  return body.split('\n')
}

function prefixesFrom(prefix: SnippetPrefix): string[] {
  return Array.isArray(prefix) ? prefix : [prefix]
}

function validateSnippet(
  name: string,
  snippet: Snippet,
  file: string,
  prefixMap: Map<string, { file: string; name: string }[]>
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!snippet.prefix) {
    issues.push({ file, name, message: '缺少 prefix' })
  }

  if (!snippet.body || (Array.isArray(snippet.body) && snippet.body.length === 0)) {
    issues.push({ file, name, message: '缺少 body 或 body 为空' })
  }

  if (!snippet.description || snippet.description.trim().length === 0) {
    issues.push({ file, name, message: '缺少 description' })
  }

  const prefixes = snippet.prefix ? prefixesFrom(snippet.prefix) : []
  prefixes.forEach((p) => {
    if (typeof p !== 'string' || p.trim().length === 0) {
      issues.push({ file, name, message: 'prefix 必须是非空字符串' })
      return
    }
    const bucket = prefixMap.get(p) ?? []
    bucket.push({ file, name })
    prefixMap.set(p, bucket)
  })

  if (snippet.body) {
    const bodyLines = normalizeBody(snippet.body)
    for (const line of bodyLines) {
      // 重新创建正则以避免 lastIndex 在多行间串扰
      const placeholderPattern = /\${(\d+)(:[^}]*)?}/g
      let match: RegExpExecArray | null
      while ((match = placeholderPattern.exec(line)) !== null) {
        const index = Number(match[1])
        if (!Number.isInteger(index) || index <= 0) {
          issues.push({ file, name, message: `占位符序号需为正整数: ${match[0]}` })
        }
      }
    }
  }

  return issues
}

async function validate(): Promise<ValidationResult> {
  const files = glob.sync(SNIPPET_GLOB)
  const prefixMap = new Map<string, { file: string; name: string }[]>()
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []

  for (const file of files) {
    const snippets = await readJson(file)
    for (const [name, snippet] of Object.entries(snippets)) {
      const issues = validateSnippet(name, snippet, path.relative(ROOT, file), prefixMap)
      errors.push(...issues)
    }
  }

  // 重复前缀检查
  for (const [prefix, list] of prefixMap.entries()) {
    if (list.length > 1) {
      const locations = list.map((l) => `${l.name}@${l.file}`).join(', ')
      errors.push({
        file: list[0].file,
        name: list[0].name,
        message: `前缀重复: ${prefix} 出现在 ${locations}`
      })
    }
  }

  return { errors, warnings }
}

async function main(): Promise<void> {
  const result = await validate()
  if (result.errors.length === 0) {
    console.log('✅ 所有 snippets 通过校验')
    return
  }

  console.error('❌ 校验失败，详情如下：')
  result.errors.forEach((e) => {
    console.error(`- [${e.file}] ${e.name}: ${e.message}`)
  })
  process.exitCode = 1
}

void main().catch((err) => {
  console.error('校验执行异常', err)
  process.exitCode = 1
})

