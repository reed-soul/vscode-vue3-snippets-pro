import * as path from 'path';
import * as fs from 'fs';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main(): Promise<void> {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        const testWorkspace = path.resolve(__dirname, '../../test-workspace');
        
        // 创建测试工作区
        if (!fs.existsSync(testWorkspace)) {
            fs.mkdirSync(testWorkspace, { recursive: true });
        }

        // 创建测试文件
        const testFile = path.join(testWorkspace, 'test.vue');
        if (!fs.existsSync(testFile)) {
            fs.writeFileSync(testFile, `<script setup lang="ts">
// Test file for Vue 3 Snippets Pro
</script>

<template>
  <div>Test Component</div>
</template>`);
        }

        // 下载并安装 VS Code
        const vscodeExecutablePath = await downloadAndUnzipVSCode();
        
        // 运行测试
        await runTests({
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                testWorkspace,
                '--install-extension=' + extensionDevelopmentPath,
                '--disable-workspace-trust',
                '--enable-proposed-api',
                '--user-data-dir=' + path.resolve(__dirname, '../../.vscode-test/user-data')
            ],
            extensionTestsEnv: {
                EXTENSION_DEVELOPMENT: 'true',
                EXTENSION_ID: 'lushiqiang.vue3-snippets-pro',
                VSCODE_EXTENSION_PATH: extensionDevelopmentPath,
                NODE_ENV: 'test'
            }
        });
    } catch (err) {
        process.exit(1);
    }
}

void main(); 