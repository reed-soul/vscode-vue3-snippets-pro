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

export function activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel('Vue 3 Snippets Pro')
    context.subscriptions.push(output)

    context.subscriptions.push(
        vscode.commands.registerCommand('vue3snippets.showSnippets', () => {
            vscode.commands.executeCommand('editor.action.triggerSuggest')
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
 