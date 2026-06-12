# 内容质量与组织效率技术开发方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不把 CraftX Books 做复杂的前提下，补齐内容质量检查、目录组织自动化和内容发现能力，让新增书籍、校对书籍、发布站点的成本更低。

**Architecture:** 保持当前 VitePress 静态站架构，优先增强 `scripts/` 里的离线工具和 `books.json` 元数据，再用 VitePress 首页/导航消费这些结构化数据。所有质量检查都在本地和 CI 构建前完成，不引入服务端后台。

**Tech Stack:** VitePress 1.x、Vue 3、Node.js ES modules、Node built-in test runner、Markdown 文件体系、GitHub Actions。

---

## 1. 当前判断

当前站点已经具备阅读站的基础闭环：

- `books.json` 作为书籍元数据中心。
- `sidebar-generated.json` 作为章节侧边栏缓存。
- `scripts/import-book.mjs` 支持 Markdown 文件夹和 EPUB 导入。
- `scripts/generate-sidebar.mjs` 支持根据书籍目录生成侧边栏。
- `npm run build` 会先执行 Markdown 兼容处理和缺失资源占位处理。
- VitePress 配置已经包含顶部导航、本地搜索、页面目录、上一篇/下一篇、最后更新时间和评论能力。

因此下一阶段不建议优先做复杂功能，例如登录、在线上传、云端阅读历史或后台管理。更应该先做三件事：

1. 让内容质量问题在发布前自动暴露。
2. 让 README、首页、书籍索引不再依赖人工同步。
3. 让读者更容易从大量书籍里找到合适内容。

## 2. 建设原则

- **静态优先：** 所有能力尽量在构建期生成，避免服务端依赖。
- **元数据优先：** `books.json` 是唯一书籍元数据入口，README、首页、导航和后续索引页都从它派生。
- **检查优先于修复：** 对内容问题先生成报告和失败条件，不自动大规模改正文档正文，避免误伤原书内容。
- **少量增强，不重做系统：** 沿用 VitePress 默认主题和现有脚本风格，不引入大型内容管理框架。
- **可测试：** 新增脚本要有 Node `node:test` 覆盖关键路径。

## 3. 目标功能清单

### 3.1 内容质量检查

新增 `scripts/check-content-quality.mjs`，扫描 `docs/books/`、`books.json`、`sidebar-generated.json`，输出结构化问题报告。

首期检查项：

- `books.json` 中的 slug 是否都有对应 `docs/books/<slug>/`。
- `docs/books/<slug>/` 是否都有对应 `books.json` 记录。
- 每本书是否存在 `index.md`。
- 每本书至少有一个非 `index.md` 的章节 Markdown。
- Markdown 图片相对路径是否存在。
- Markdown 本地链接是否指向存在的 Markdown 或资源。
- 章节文件名是否存在重复序号，例如同一本书内同时存在 `01-xxx.md` 和 `01-yyy.md`。
- `sidebar-generated.json` 是否覆盖所有 `books.json` 中存在的书。
- 首页统计里的文章总数是否为硬编码。

输出形式：

```text
内容质量检查
- ERROR: books.json 中的 slug "xxx" 缺少 docs/books/xxx
- WARN: docs/books/yyy 未登记到 books.json
- ERROR: docs/books/aaa/02.md 图片不存在：./images/a.png
- WARN: docs/.vitepress/theme/components/HomePage.vue 文章总数为硬编码

结果：2 error, 2 warning
```

退出码规则：

- 有 `ERROR` 时退出码为 `1`。
- 只有 `WARN` 或无问题时退出码为 `0`。

### 3.2 内容统计生成

新增 `scripts/generate-content-stats.mjs`，生成 `content-stats.json`，作为首页和质量报告的统一统计来源。

建议字段：

```json
{
  "bookletCount": 15,
  "ebookCount": 2,
  "bookCount": 17,
  "chapterCount": 368,
  "generatedAt": "2026-06-12T00:00:00.000Z"
}
```

消费方式：

- `HomePage.vue` 从 `content-stats.json` 读取文章总数，替换当前 `368+` 硬编码。
- README 可以在后续自动生成内容目录时引用该统计。

### 3.3 README 内容目录自动同步

新增 `scripts/generate-readme-books.mjs`，根据 `books.json` 自动维护 README 的“内容目录”区块，降低导入新书后的人工同步成本。

推荐用显式标记保护人工内容：

```markdown
<!-- books-list:start -->
自动生成的书籍表格
<!-- books-list:end -->
```

脚本行为：

- 读取 `books.json`。
- 按 `category` 分为“技术小册”和“电子书”。
- 生成与当前 README 风格一致的 Markdown 表格。
- 只替换标记区间内内容。
- 如果 README 缺少标记，给出明确错误，不直接猜测替换范围。

### 3.4 书籍索引页增强

新增或改造一个站内书库页，例如 `docs/books/index.md` + Vue 组件 `BookLibrary.vue`。

首期能力：

- 按分类展示全部书籍。
- 显示标题、简介、分类、章节数。
- 支持简单关键词过滤。
- 支持分类切换：全部、技术小册、电子书。

不做：

- 不做复杂标签系统。
- 不做用户收藏。
- 不做服务端搜索。

### 3.5 书籍元数据轻量扩展

把 `books.json` 从当前最小字段扩展为更适合组织内容的轻量模型。

建议新增字段：

```json
{
  "slug": "mysql-running",
  "title": "MySQL 是怎样运行的",
  "desc": "从根儿上理解 MySQL",
  "category": "booklet",
  "status": "complete",
  "featured": true,
  "order": 30,
  "tags": ["数据库", "MySQL", "后端"]
}
```

字段含义：

- `status`: `complete`、`serializing`、`draft`、`archived`。
- `featured`: 是否进入首页精选。
- `order`: 首页和书库页排序权重，数字越小越靠前。
- `tags`: 轻量主题标签，用于书库页展示和筛选。

兼容策略：

- 所有新增字段都可选。
- 旧数据不需要一次性补齐。
- UI 层必须对缺省值做兜底。

### 3.6 导入流程增强

扩展 `scripts/import-book.mjs` 参数：

```bash
npm run import:book -- ./source/my-book \
  --slug my-book \
  --title "我的小册" \
  --desc "简介" \
  --status complete \
  --tags "前端,工程化" \
  --featured
```

新增行为：

- 导入后自动运行或提示运行内容统计生成。
- 导入后更新 README 书籍表格。
- `--dry-run` 时展示即将写入的完整元数据。
- 对未知 `status` 给出错误。
- `tags` 统一保存为数组，并去掉空白项。

### 3.7 CI 与本地命令整合

调整 `package.json`：

```json
{
  "scripts": {
    "generate:stats": "node scripts/generate-content-stats.mjs",
    "generate:readme": "node scripts/generate-readme-books.mjs",
    "check:content": "node scripts/check-content-quality.mjs",
    "prebuild": "node scripts/generate-content-stats.mjs && node scripts/escape-vitepress-braces.mjs && node scripts/normalize-missing-assets.mjs && node scripts/check-content-quality.mjs"
  }
}
```

注意事项：

- `check-content-quality.mjs` 首期不要把所有历史问题都设为 ERROR，否则可能阻塞已有发布。
- 可以先把缺失图片设为 WARN，缺失书籍目录、缺失 `index.md`、JSON 不一致设为 ERROR。
- README 自动生成建议由导入脚本和显式命令触发，不建议放进 `prebuild` 自动改文件，避免构建时产生工作区变更。

## 4. 文件结构规划

### 新增文件

- `docs/plans/content-quality-organization-efficiency-plan.md`  
  本方案文档。

- `scripts/content-utils.mjs`  
  放置共享工具：读取书籍、遍历 Markdown、解析本地链接、统计章节、排序书籍。

- `scripts/generate-content-stats.mjs`  
  生成 `content-stats.json`。

- `scripts/check-content-quality.mjs`  
  输出内容质量检查结果。

- `scripts/generate-readme-books.mjs`  
  自动维护 README 的书籍目录区块。

- `scripts/content-quality.test.mjs`  
  覆盖内容统计、链接检查、README 区块替换。

- `docs/.vitepress/theme/components/BookLibrary.vue`  
  书库页交互组件。

- `docs/books/index.md`  
  全部书籍索引入口。

- `content-stats.json`  
  构建期生成的内容统计文件。

### 修改文件

- `books.json`  
  逐步补充 `status`、`featured`、`order`、`tags`。

- `package.json`  
  增加生成和检查命令，调整 `prebuild`。

- `README.md`  
  增加 `books-list` 自动生成标记，后续由脚本维护。

- `docs/index.md`  
  首页精选从静态 feature 列表逐步迁移到 `books.json` 的 `featured` 字段。

- `docs/.vitepress/config.mts`  
  顶部导航增加“全部书籍”入口，必要时根据 `order` 排序。

- `docs/.vitepress/theme/components/HomePage.vue`  
  使用 `content-stats.json` 替代硬编码文章总数。

- `scripts/import-book.mjs`  
  支持更多元数据参数，并在导入完成后更新 README 和统计。

- `scripts/import-book.test.mjs`  
  补充新增参数的测试。

## 5. 分阶段实施计划

### Task 1: 抽取内容工具函数

**Files:**

- Create: `scripts/content-utils.mjs`
- Test: `scripts/content-quality.test.mjs`

- [ ] 新增 `readJson(file, fallback)`，统一 JSON 读取逻辑。
- [ ] 新增 `walkFiles(dir, predicate)`，用于递归扫描文件。
- [ ] 新增 `walkMarkdown(bookDir)`，排除 `index.md`。
- [ ] 新增 `sortMarkdown(a, b)`，复用现有章节排序规则。
- [ ] 新增 `loadBooks(root)`，读取并返回 `books.json`。
- [ ] 新增 `countChapters(root, slug)`，统计单本书章节数。
- [ ] 编写 Node test 验证章节排序和统计逻辑。
- [ ] 运行 `node --test scripts/content-quality.test.mjs`。

### Task 2: 生成内容统计

**Files:**

- Create: `scripts/generate-content-stats.mjs`
- Create/Modify: `content-stats.json`
- Modify: `package.json`

- [ ] 编写统计生成脚本，读取 `books.json` 和 `docs/books/`。
- [ ] 统计 `bookletCount`、`ebookCount`、`bookCount`、`chapterCount`。
- [ ] 写入 `content-stats.json`，JSON 使用 2 空格缩进。
- [ ] 增加 npm 命令：`generate:stats`。
- [ ] 编写测试覆盖统计结果。
- [ ] 运行 `npm run generate:stats`。
- [ ] 运行 `node --test scripts/content-quality.test.mjs`。

### Task 3: 首页统计去硬编码

**Files:**

- Modify: `docs/.vitepress/theme/components/HomePage.vue`
- Modify: `content-stats.json`

- [ ] 在组件中导入 `content-stats.json`。
- [ ] `技术小册`、`电子书`、`文章总数` 都从统计文件读取。
- [ ] 保留 `持续更新` 静态展示。
- [ ] 保证统计文件不存在时构建不会静默给出错误数据；推荐让构建失败，提醒先运行生成脚本。
- [ ] 运行 `npm run build`。

### Task 4: 内容质量检查脚本

**Files:**

- Create: `scripts/check-content-quality.mjs`
- Modify: `package.json`
- Test: `scripts/content-quality.test.mjs`

- [ ] 实现 `ERROR` / `WARN` 两级问题模型。
- [ ] 检查 `books.json` slug 与 `docs/books/` 目录一致性。
- [ ] 检查每本书存在 `index.md`。
- [ ] 检查每本书至少有一个章节 Markdown。
- [ ] 检查图片相对路径是否存在。
- [ ] 检查 Markdown 本地链接目标是否存在。
- [ ] 检查重复章节序号。
- [ ] 检查 `sidebar-generated.json` 是否覆盖所有书籍。
- [ ] 检查首页文章总数是否仍是硬编码。
- [ ] 增加 npm 命令：`check:content`。
- [ ] 首期将缺图和普通本地链接问题设为 WARN，将元数据/目录结构问题设为 ERROR。
- [ ] 运行 `npm run check:content`。
- [ ] 运行 `node --test scripts/content-quality.test.mjs`。

### Task 5: README 目录自动生成

**Files:**

- Create: `scripts/generate-readme-books.mjs`
- Modify: `README.md`
- Modify: `package.json`
- Test: `scripts/content-quality.test.mjs`

- [ ] 在 README 的“内容目录”位置加入 `<!-- books-list:start -->` 和 `<!-- books-list:end -->`。
- [ ] 脚本读取 `books.json`，按 `category` 分组。
- [ ] 生成“技术小册”和“电子书”两个 Markdown 表格。
- [ ] 每行包含书名、简介、阅读链接。
- [ ] 如果标记缺失，脚本退出码为 `1` 并输出明确错误。
- [ ] 增加 npm 命令：`generate:readme`。
- [ ] 编写测试覆盖区块替换和缺失标记报错。
- [ ] 运行 `npm run generate:readme`。
- [ ] 运行 `node --test scripts/content-quality.test.mjs`。

### Task 6: 扩展书籍元数据

**Files:**

- Modify: `books.json`
- Modify: `scripts/content-utils.mjs`
- Modify: `docs/.vitepress/config.mts`

- [ ] 在工具函数中定义书籍归一化逻辑。
- [ ] 缺省 `category` 为 `booklet`。
- [ ] 缺省 `status` 为 `complete`。
- [ ] 缺省 `featured` 为 `false`。
- [ ] 缺省 `order` 为数组下标顺序。
- [ ] 缺省 `tags` 为空数组。
- [ ] 顶部导航按 `order` 排序，再按原数组顺序兜底。
- [ ] 给已有重点书籍逐步补 `featured` 和 `tags`，不强制一次性补齐所有书。
- [ ] 运行 `npm run build`。

### Task 7: 书库索引页

**Files:**

- Create: `docs/books/index.md`
- Create: `docs/.vitepress/theme/components/BookLibrary.vue`
- Modify: `docs/.vitepress/config.mts`

- [ ] 新增 `docs/books/index.md`，使用 `layout: doc` 并挂载 `<BookLibrary />`。
- [ ] `BookLibrary.vue` 导入 `books.json` 和 `content-stats.json`。
- [ ] 展示全部书籍卡片，包含标题、简介、分类、章节数、状态、标签。
- [ ] 增加关键词输入框，匹配标题、简介、标签。
- [ ] 增加分类筛选按钮：全部、技术小册、电子书。
- [ ] 顶部导航增加“全部书籍”入口。
- [ ] 样式保持 VitePress 默认主题风格，不做重型视觉重构。
- [ ] 运行 `npm run build`。

### Task 8: 导入流程增强

**Files:**

- Modify: `scripts/import-book.mjs`
- Modify: `scripts/import-book.test.mjs`
- Modify: `docs/local-import-guide.md`
- Modify: `README.md`

- [ ] `parseArgs` 支持 `--status`、`--tags`、`--featured`、`--order`。
- [ ] 校验 `status` 只能是 `complete`、`serializing`、`draft`、`archived`。
- [ ] `--tags "a,b,c"` 转为数组并去掉空白项。
- [ ] `--featured` 写入布尔值 `true`。
- [ ] `--order` 转为数字；非数字时报错。
- [ ] `preview` 输出完整元数据。
- [ ] `updateBooks` 保留旧条目中未被命令覆盖的可选字段。
- [ ] 导入成功后调用 README 生成逻辑和统计生成逻辑。
- [ ] 更新 `docs/local-import-guide.md` 参数说明。
- [ ] 更新 README 维护说明。
- [ ] 运行 `node --test scripts/import-book.test.mjs`。
- [ ] 运行 `node --test scripts/content-quality.test.mjs`。
- [ ] 运行 `npm run build`。

### Task 9: CI 构建集成

**Files:**

- Modify: `package.json`
- Modify: `.github/workflows/deploy.yml`

- [ ] `prebuild` 先运行 `generate:stats`，再运行已有 Markdown 预处理，最后运行 `check:content`。
- [ ] CI 中保留 `npm ci` 和 `npm run build`。
- [ ] 如果希望 CI 独立暴露质量检查，可以在 build 前增加 `npm run check:content`，但避免重复过多输出。
- [ ] 运行 `npm run build`。

## 6. 验收标准

首期完成后，应满足：

- `npm run generate:stats` 能稳定生成 `content-stats.json`。
- 首页文章总数不再硬编码。
- `npm run check:content` 能发现目录、元数据、图片和本地链接问题。
- README 的书籍目录可以通过 `npm run generate:readme` 自动同步。
- 导入新书后，`books.json`、`sidebar-generated.json`、`content-stats.json`、README 内容目录能被自动或半自动维护。
- 新增脚本有 Node test 覆盖关键路径。
- `npm run build` 通过。

## 7. 建议优先级

推荐按这个顺序落地：

1. 内容统计生成和首页去硬编码。
2. 内容质量检查脚本。
3. README 自动生成。
4. 导入流程增强。
5. 书库索引页。
6. 书籍元数据逐步补全。

这个顺序的好处是先降低维护成本，再改善读者发现体验。元数据扩展不要一开始铺太大，否则容易变成填表工作。

## 8. 风险与处理

- **历史内容可能存在大量缺图或失效链接。**  
  首期将这类问题设为 WARN，先产出报告，不阻塞构建。

- **README 自动替换可能误伤人工内容。**  
  只替换显式标记区间，缺少标记时直接失败。

- **`books.json` 扩字段后旧代码不兼容。**  
  所有消费端都用缺省值兜底，新增字段全部可选。

- **首页和导航可能因为书籍数量增加而过载。**  
  顶部导航保持分类入口，完整列表放到“全部书籍”页，首页只放精选。

- **构建时自动生成文件可能造成工作区变更。**  
  `content-stats.json` 可以由 `prebuild` 生成并提交；README 生成不放进 `prebuild`，由导入脚本或显式命令触发。

## 9. 暂不做事项

- 不做用户账号。
- 不做云端阅读进度。
- 不做在线上传后台。
- 不做全文搜索服务端。
- 不做复杂标签运营系统。
- 不做评论以外的社区功能。

这些功能不是不能做，而是当前阶段收益低、复杂度高，会偏离“静态书库”的优势。
