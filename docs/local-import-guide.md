# 本地导入工具使用说明

这个工具用于把本地 Markdown 文件夹或 EPUB 文件导入为本站标准 VitePress 阅读内容。导入后内容会生成到 `docs/books/<book-slug>/`，并自动更新 `books.json` 与 `sidebar-generated.json`。

线上站点仍然是 GitHub Pages 静态发布，不提供网页上传后台。

## 支持范围

当前只支持两类输入：

- Markdown 文件夹：目录内至少包含一个 `.md` 文件。
- EPUB 文件：仅支持无 DRM 的 `.epub` 文件。

其他格式会直接拒绝，并提示“仅支持 Markdown 文件夹或 EPUB 文件”。

## 基本命令

在项目根目录执行：

```bash
npm run import:book -- <输入路径> --slug <book-slug>
```

示例：

```bash
npm run import:book -- ./source/my-book --slug my-book
npm run import:book -- ./source/my-book.epub --slug my-book
```

导入成功后会生成：

```text
docs/books/my-book/
books.json
sidebar-generated.json
```

同时会写入内容分类：

- Markdown 文件夹默认写入 `category: "booklet"`，归入“技术小册”。
- EPUB 文件默认写入 `category: "ebook"`，归入“电子书”。

## 常用参数

| 参数 | 说明 |
| --- | --- |
| `--slug <slug>` | 指定书籍目录名，推荐必填，例如 `my-book`。 |
| `--title <title>` | 指定书名。不传时，Markdown 会优先取第一篇的一级标题，EPUB 会优先取元数据标题。 |
| `--desc <desc>` | 指定书籍简介，会写入 `books.json` 和书籍首页。 |
| `--dry-run` | 只预览，不写入文件。 |
| `--force` | 覆盖已有同名 `docs/books/<book-slug>/`。默认禁止覆盖。 |

查看帮助：

```bash
npm run import:book -- --help
```

## 推荐流程

1. 先预览导入结果：

```bash
npm run import:book -- ./source/my-book --slug my-book --title "我的小册" --dry-run
```

重点检查输出里的书名、slug、章节数量、目标路径和可疑项。

2. 确认无误后正式导入：

```bash
npm run import:book -- ./source/my-book --slug my-book --title "我的小册" --desc "这本小册的简介"
```

3. 本地构建验证：

```bash
npm run build
```

4. 检查改动：

```bash
git diff --stat
git diff -- docs/books/my-book books.json sidebar-generated.json
```

5. 如需发布，提交并推送：

```bash
git add docs/books/my-book books.json sidebar-generated.json README.md
git commit -m "Add my-book"
git push
```

README 的“内容目录”表格目前仍需要人工维护；站点顶部导航和首页数量会根据 `books.json` 自动更新。

## Markdown 文件夹导入

输入目录要求：

- 至少包含一个 `.md` 文件。
- 图片、附件等相对资源可以放在 Markdown 同级或子目录中。
- 已有 `index.md` 会被导入工具重新生成，用作书籍首页和目录页。

示例目录：

```text
source/my-book/
├── 01-intro.md
├── 02-start.md
└── assets/
    └── cover.png
```

导入命令：

```bash
npm run import:book -- ./source/my-book --slug my-book --title "我的小册"
```

章节排序规则：

- 文件名以数字开头时，按数字顺序排序，例如 `01-xxx.md`、`02-xxx.md`。
- 否则按文件名排序。
- 侧边栏标题使用文件名去掉 `.md` 后的文本。
- 书籍首页目录优先使用 Markdown 内的一级标题。

## EPUB 导入

输入文件要求：

- 文件扩展名必须是 `.epub`。
- EPUB 不能有 DRM 或加密。
- EPUB 内部章节需要有标准阅读顺序。

导入命令：

```bash
npm run import:book -- ./source/my-book.epub --slug my-book --title "我的小册"
```

EPUB 转换会尽量保留：

- 章节阅读顺序。
- 标题和正文。
- 图片资源。
- 普通链接。

EPUB 转换不承诺完整保留复杂样式，例如：

- CSS 排版细节。
- 复杂表格。
- 特殊字体。
- 脚注或交互内容。
- EPUB 内部复杂跳转。

导入预览中的“可疑项”会提示可能无法可靠转换的内容。

## 覆盖已有书籍

默认情况下，如果目标目录已存在，导入会失败：

```text
目标书籍已存在：docs/books/my-book。如需覆盖，请显式传入 --force。
```

确认要覆盖时执行：

```bash
npm run import:book -- ./source/my-book --slug my-book --force
```

覆盖会替换 `docs/books/<book-slug>/`，并更新对应的 `books.json` 和 `sidebar-generated.json` 条目。执行前建议先确认当前 Git 工作区没有未保存的重要改动。

## 手动维护项

导入工具会自动维护：

- `docs/books/<book-slug>/`
- `books.json`
- `sidebar-generated.json`
- 顶部导航分组
- 首页技术小册和电子书数量

仍建议人工检查或维护：

- `README.md` 的“内容目录”表格。
- 首页 `docs/index.md` 的精选推荐是否需要展示新书。
- 导入后的章节标题、图片路径和排版效果。

## 常见问题

### 提示仅支持 Markdown 文件夹或 EPUB 文件

说明输入不是目录，也不是 `.epub` 文件。请确认路径是否正确。

### Markdown 文件夹被拒绝

目录内没有 `.md` 文件。请确认 Markdown 文件没有放错目录，扩展名是 `.md`。

### EPUB 导入失败

常见原因：

- EPUB 有 DRM 或加密。
- EPUB 文件损坏。
- EPUB 内部 ZIP 结构不兼容当前导入器。
- EPUB 缺少标准 OPF 元数据或阅读顺序。

可以先用常规 EPUB 工具重新导出或重新打包，再尝试导入。

### 导入后导航里看不到新书

先确认 `books.json` 和 `sidebar-generated.json` 是否包含新书 slug，然后运行：

```bash
npm run build
```

如果构建正常，再检查 `books.json` 里的 `category` 是否正确，必要时更新 `README.md` 或首页精选推荐。

### 图片不显示

Markdown 导入会保留相对资源。请检查图片路径是否仍然相对于章节 Markdown 文件可访问。

EPUB 导入会把图片复制到 `_assets/` 目录。若图片缺失，导入报告或章节正文中会出现图片未找到提示。

## 发布前检查清单

- `npm run build` 通过。
- `docs/books/<book-slug>/index.md` 存在。
- 章节 Markdown 文件存在且排序符合预期。
- 图片资源可以访问。
- `books.json` 包含新书元数据。
- `sidebar-generated.json` 包含新书侧边栏。
- README 内容目录表格按需更新。
