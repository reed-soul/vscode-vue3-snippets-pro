import * as vscode from 'vscode'
import fs from 'fs/promises'
import path from 'path'

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

interface LoadedSnippet {
    id: string
    name: string
    prefixes: string[]
    description: string
    bodyLines: string[]
    file: string
    category: SnippetCategory
}

type SnippetCategory = 'core' | 'pinia' | 'router' | 'ui' | 'tests' | 'performance'

type SnippetFilter = SnippetCategory | 'all'

export function activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel('Vue 3 Snippets Pro')
    context.subscriptions.push(output)

    context.subscriptions.push(
        vscode.commands.registerCommand('vue3snippets.showSnippets', () => {
            vscode.commands.executeCommand('editor.action.triggerSuggest')
        })
    )

    context.subscriptions.push(
        vscode.commands.registerCommand('vue3snippets.searchSnippets', async () => {
            await searchSnippets(context.extensionPath)
        })
    )

    context.subscriptions.push(
        vscode.commands.registerCommand('vue3snippets.validateSnippets', async () => {
            const result = await validateAllSnippets(context.extensionPath)
            if (result.length === 0) {
                vscode.window.showInformationMessage('All snippets passed validation')
                output.appendLine('✅ All snippets passed validation')
                return
            }

            output.clear()
            output.appendLine('Snippet validation failed:')
            result.forEach((issue) => {
                output.appendLine(`- [${issue.file}] ${issue.name}: ${issue.message}`)
            })
            output.show()
            vscode.window.showErrorMessage(
                `Snippet validation failed: ${result.length} issue${result.length > 1 ? 's' : ''} found`
            )
        })
    )
}

async function searchSnippets(root: string): Promise<void> {
    const preferences = readPreferences()
    const snippets = await loadSnippets(root, 'all')
    if (snippets.length === 0) {
        vscode.window.showInformationMessage('No snippets found')
        return
    }

    const category = await vscode.window.showQuickPick(
        [
            { label: '全部', value: 'all' },
            { label: '核心', value: 'core' },
            { label: 'Pinia', value: 'pinia' },
            { label: 'Router', value: 'router' },
            { label: 'UI 框架', value: 'ui' },
            { label: '测试', value: 'tests' },
            { label: '性能', value: 'performance' }
        ],
        { placeHolder: '选择分类过滤（可输入前缀继续模糊搜索）' }
    )

    if (!category) return

    const filtered = snippets.filter(
        (item) => category.value === 'all' || item.category === category.value
    )
    if (filtered.length === 0) {
        vscode.window.showWarningMessage('当前分类下没有可用片段')
        return
    }

    const sorted = sortSnippets(filtered, preferences.frameworkPriority)
    const items: (vscode.QuickPickItem & { snippet: LoadedSnippet })[] = sorted.map(
        (snippet) => ({
            label: snippet.prefixes.join(', '),
            description: snippet.description || snippet.name,
            detail: buildPreview(snippet),
            snippet
        })
    )

    const picked = await vscode.window.showQuickPick(items, {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: `输入前缀或描述来搜索片段（当前风格预设：${preferences.stylePreset}）`
    })

    if (!picked?.snippet) return

    const editor = vscode.window.activeTextEditor
    if (!editor) {
        vscode.window.showWarningMessage('No active editor to insert snippet')
        return
    }

    const snippetString = new vscode.SnippetString(picked.snippet.bodyLines.join('\n'))
    await editor.insertSnippet(snippetString)
}

async function loadSnippets(root: string, filter: SnippetFilter): Promise<LoadedSnippet[]> {
    const snippetDir = path.join(root, 'extension', 'snippets')
    const files = (await fs.readdir(snippetDir)).filter((file) => file.endsWith('.json'))
    const results: LoadedSnippet[] = []

    for (const fileName of files) {
        const category = inferCategory(fileName)
        if (filter !== 'all' && category !== filter) continue

        const fullPath = path.join(snippetDir, fileName)
        const raw = await fs.readFile(fullPath, 'utf-8')
        let json: Record<string, Snippet>
        try {
            json = JSON.parse(raw) as Record<string, Snippet>
        } catch {
            continue
        }

        for (const [name, snippet] of Object.entries(json)) {
            results.push({
                id: `${fileName}-${name}`,
                name,
                prefixes: snippet.prefix ? prefixesFrom(snippet.prefix) : [],
                description: snippet.description ?? '',
                bodyLines: normalizeBody(snippet.body ?? ''),
                file: fileName,
                category
            })
        }
    }

    return results
}

function inferCategory(fileName: string): SnippetCategory {
    if (fileName.includes('pinia')) return 'pinia'
    if (fileName.includes('router')) return 'router'
    if (fileName.includes('performance')) return 'performance'
    if (fileName.includes('test')) return 'tests'
    if (
        fileName.includes('element-plus') ||
        fileName.includes('ant-design') ||
        fileName.includes('naive') ||
        fileName.includes('vant') ||
        fileName.includes('vuetify') ||
        fileName.includes('primevue') ||
        fileName.includes('arco')
    ) {
        return 'ui'
    }
    return 'core'
}

function buildPreview(snippet: LoadedSnippet): string {
    const lines = snippet.bodyLines.slice(0, 6)
    const trimmed = lines.map((line) => line.trimEnd())
    const suffix = snippet.bodyLines.length > 6 ? '\n…' : ''
    return `${snippet.file} • ${snippet.description || snippet.name}\n${trimmed.join('\n')}${suffix}`
}

function readPreferences(): { frameworkPriority: string[]; stylePreset: string } {
    const config = vscode.workspace.getConfiguration('vue3SnippetsPro')
    const frameworkPriority = config.get<string[]>('frameworkPriority') ?? []
    const stylePreset = config.get<string>('stylePreset') ?? 'element-plus-scss'
    return { frameworkPriority, stylePreset }
}

function sortSnippets(snippets: LoadedSnippet[], priority: string[]): LoadedSnippet[] {
    const priorityMap = new Map<string, number>()
    priority.forEach((fw, index) => priorityMap.set(fw, index))

    return [...snippets].sort((a, b) => {
        const weightA = uiWeight(a, priorityMap)
        const weightB = uiWeight(b, priorityMap)
        if (weightA !== weightB) return weightA - weightB
        return a.prefixes.join(', ').localeCompare(b.prefixes.join(', '))
    })
}

function uiWeight(snippet: LoadedSnippet, priority: Map<string, number>): number {
    if (snippet.category !== 'ui') return 0
    const framework = inferFramework(snippet.file)
    if (!framework) return priority.size
    return priority.get(framework) ?? priority.size
}

function inferFramework(fileName: string): string | undefined {
    if (fileName.includes('element-plus')) return 'element-plus'
    if (fileName.includes('ant-design')) return 'ant-design-vue'
    if (fileName.includes('naive')) return 'naive-ui'
    if (fileName.includes('vant')) return 'vant'
    if (fileName.includes('primevue')) return 'primevue'
    if (fileName.includes('vuetify')) return 'vuetify'
    if (fileName.includes('arco')) return 'arco'
    return undefined
}

async function validateAllSnippets(root: string): Promise<ValidationIssue[]> {
    const snippetDir = path.join(root, 'extension', 'snippets')
    const files = (await fs.readdir(snippetDir)).filter((file) => file.endsWith('.json'))

    const prefixMap = new Map<string, { file: string; name: string }[]>()
    const issues: ValidationIssue[] = []

    for (const fileName of files) {
        const fullPath = path.join(snippetDir, fileName)
        const raw = await fs.readFile(fullPath, 'utf-8')
        let json: Record<string, Snippet>
        try {
            json = JSON.parse(raw) as Record<string, Snippet>
        } catch (error) {
            issues.push({
                file: path.relative(root, fullPath),
                name: 'file',
                message: 'JSON 解析失败'
            })
            continue
        }

        for (const [name, snippet] of Object.entries(json)) {
            issues.push(
                ...validateSnippet(
                    name,
                    snippet,
                    path.relative(root, fullPath),
                    prefixMap
                )
            )
        }
    }

    for (const [prefix, list] of prefixMap.entries()) {
        if (list.length > 1) {
            const locations = list.map((l) => `${l.name}@${l.file}`).join(', ')
            issues.push({
                file: list[0].file,
                name: list[0].name,
                message: `Duplicate prefix: ${prefix} in ${locations}`
            })
        }
    }

    return issues
}

function validateSnippet(
    name: string,
    snippet: Snippet,
    file: string,
    prefixMap: Map<string, { file: string; name: string }[]>
): ValidationIssue[] {
    const localIssues: ValidationIssue[] = []

    if (!snippet.prefix) {
        localIssues.push({ file, name, message: 'Missing prefix' })
    }

    if (!snippet.body || (Array.isArray(snippet.body) && snippet.body.length === 0)) {
        localIssues.push({ file, name, message: 'Missing body' })
    }

    if (!snippet.description || snippet.description.trim().length === 0) {
        localIssues.push({ file, name, message: 'Missing description' })
    }

    const prefixes = snippet.prefix ? prefixesFrom(snippet.prefix) : []
    prefixes.forEach((p) => {
        if (typeof p !== 'string' || p.trim().length === 0) {
            localIssues.push({ file, name, message: 'Prefix must be non-empty string' })
            return
        }
        const bucket = prefixMap.get(p) ?? []
        bucket.push({ file, name })
        prefixMap.set(p, bucket)
    })

    if (snippet.body) {
        const bodyLines = normalizeBody(snippet.body)
        const placeholderPattern = /\${(\d+)(:[^}]*)?}/g
        for (const line of bodyLines) {
            let match: RegExpExecArray | null
            while ((match = placeholderPattern.exec(line)) !== null) {
                const index = Number(match[1])
                if (!Number.isInteger(index) || index <= 0) {
                    localIssues.push({
                        file,
                        name,
                        message: `Placeholder index must be positive integer: ${match[0]}`
                    })
                }
            }
        }
    }

    return localIssues
}

function normalizeBody(body: SnippetBody): string[] {
    return Array.isArray(body) ? body : body.split('\n')
}

function prefixesFrom(prefix: SnippetPrefix): string[] {
    return Array.isArray(prefix) ? prefix : [prefix]
}
 