import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// 版本类型
type VersionType = 'patch' | 'minor' | 'major';

// 更新版本号
function updateVersion(type: VersionType) {
    execSync(`pnpm version ${type} --no-git-tag-version`);
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return pkg.version;
}

// 更新 CHANGELOG.md
function updateChangelog(version: string) {
    const date = new Date().toISOString().split('T')[0];
    const template = `\n## [${version}] - ${date}\n### Added\n- \n\n### Changed\n- \n\n### Fixed\n- \n`;
    
    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
    const updatedChangelog = changelog.replace(
        '# Change Log\n',
        '# Change Log\n' + template
    );
    
    fs.writeFileSync('CHANGELOG.md', updatedChangelog);
}

// 清理构建文件
function clean() {
    execSync('rimraf *.vsix out dist');
}

// 构建项目
function build() {
    execSync('pnpm run compile');
}

// 打包扩展
function packageExtension(version: string) {
    const outDir = 'dist';
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }
    
    execSync(`pnpm exec vsce package --no-dependencies --out dist/vue3-snippets-pro-${version}.vsix`);
}

// 添加重试函数
async function retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 2000,
    onRetry?: (attempt: number) => void
): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < retries - 1) {
                if (onRetry) {
                    onRetry(i + 1);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError!;
}

// 修改发布函数
async function publishExtension(version: string) {
    await retry(
        () => {
            execSync(
                `pnpm exec vsce publish --packagePath dist/vue3-snippets-pro-${version}.vsix --no-dependencies`,
                { stdio: 'inherit' }
            );
            return Promise.resolve();
        },
        3,
        5000,
        (attempt) => {
            console.log(`Publishing failed, retrying (${attempt}/3)...`);
        }
    );
}

// 修改主函数
async function main() {
    try {
        const versionType = process.argv[2] as VersionType || 'patch';
        
        // 1. 清理旧文件
        clean();
        
        // 2. 更新版本号
        const newVersion = updateVersion(versionType);
        console.log(`Updating to version ${newVersion}`);
        
        // 3. 更新 CHANGELOG
        updateChangelog(newVersion);
        console.log('Updated CHANGELOG.md');
        
        // 4. 构建项目
        build();
        console.log('Build completed');
        
        // 5. 打包扩展
        packageExtension(newVersion);
        console.log('Package created');
        
        // 6. 发布扩展（使用重试机制）
        await publishExtension(newVersion);
        console.log('Published successfully');
        
        // 7. 提交变更
        execSync('git add .');
        execSync(`git commit -m "chore: release v${newVersion}" --no-verify`);
        execSync(`git tag v${newVersion}`);
        execSync('git push && git push --tags');
        
        console.log('All done!');
        
        // 在更新版本号之后，生成 changelog
        console.log('Generating changelog...');
        execSync('pnpm run changelog', { stdio: 'inherit' });
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main(); 