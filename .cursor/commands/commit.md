# Commit Message

## Commit Message Format

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，生成规范的 commit message。

### 格式模板

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- **feat**: 新功能（feature）
- **fix**: 修复 bug
- **docs**: 文档更新
- **style**: 代码格式调整（不影响代码运行）
- **refactor**: 代码重构（既不是新功能也不是修复 bug）
- **perf**: 性能优化
- **test**: 添加或修改测试
- **chore**: 构建过程或辅助工具的变动
- **ci**: CI 配置文件和脚本的变更
- **build**: 影响构建系统或外部依赖的更改
- **revert**: 回退之前的 commit

### Scope 范围（可选）

根据项目模块选择，例如：
- `router`: 路由相关
- `component`: 组件相关
- `api`: API 相关
- `i18n`: 国际化相关
- `style`: 样式相关
- `config`: 配置相关
- `deps`: 依赖相关

### Subject 主题

- 使用**祈使语气**（动词原形），如 "Add" 而非 "Added"
- **首字母小写**（除非是专有名词）
- **不超过 50 个字符**
- **不以句号结尾**

### Body 正文（可选）

- 详细说明**为什么**做这个改动，而不仅仅是**做了什么**
- 每行不超过 72 个字符
- 使用空行分隔段落

### Footer 页脚（可选）

- 引用相关的 issue: `Closes #123` 或 `Fixes #456`
- 标记破坏性变更: `BREAKING CHANGE: <description>`

### 示例

#### 简单示例
```
feat(router): add Vue Router configuration
```

#### 完整示例
```
feat(component): add coordinate converter component

- Implement WGS84, GCJ-02, BD-09 coordinate conversion
- Add batch processing support
- Include input validation and error handling

Closes #42
```

#### 修复示例
```
fix(api): handle file upload timeout error

Previously, large file uploads would timeout without proper error handling.
Now we catch timeout exceptions and return appropriate error messages.

Fixes #78
```

### 最佳实践

1. ✅ **Subject 行要简洁明了**：一眼就能看出改动的核心内容
2. ✅ **Body 解释原因**：说明为什么需要这个改动，而不仅仅是做了什么
3. ✅ **一个 commit 一个目的**：避免在一个 commit 中混合多个不相关的改动
4. ✅ **使用合适的 type**：准确分类改动类型，便于后续查找和统计
5. ✅ **关联 issue**：在 footer 中引用相关的 issue 编号