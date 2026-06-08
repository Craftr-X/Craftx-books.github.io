# CraftX Books

技术小册合集站点，基于 VitePress 构建，发布到 GitHub Pages。

## 项目结构

```text
.
├── docs/                         # VitePress 文档站点源码
│   ├── .vitepress/               # VitePress 配置、主题和组件
│   ├── books/                    # 小册正文
│   ├── public/                   # 静态资源
│   └── index.md                  # 首页入口
├── scripts/                      # 构建前处理脚本
├── sidebar-generated.json        # 侧边栏配置
├── package.json                  # npm 脚本与依赖
└── .github/workflows/deploy.yml  # GitHub Pages 自动部署流程
```

根目录下的原始中文书籍文件夹只作为本地素材保留，已经在 `.gitignore` 中排除，不会随站点源码提交。

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

构建静态站点：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 构建说明

`npm run build` 会先执行 `prebuild`：

```bash
node scripts/escape-vitepress-braces.mjs
node scripts/normalize-missing-assets.mjs
```

这两个脚本用于处理 VitePress 构建前的 Markdown 内容兼容问题和缺失资源占位问题。最终产物输出到 `dist/`。

构建过程中可能出现代码块语言名降级警告，例如部分 Markdown 使用了不标准的语言标识。这类警告不影响站点发布。

## GitHub Pages 部署

当前仓库远端：

```bash
git@github.com:Craftr-X/Craftx-books.github.io.git
```

部署流程已经写在 `.github/workflows/deploy.yml` 中。每次推送到 `main` 分支后，GitHub Actions 会自动：

1. 安装 Node.js 20
2. 执行 `npm ci`
3. 执行 `npm run build`
4. 上传 `dist/`
5. 发布到 GitHub Pages

日常发布命令：

```bash
git status
npm run build
git add .
git commit -m "Update site"
git push
```

首次部署或排查部署时，到 GitHub 仓库中确认：

1. 进入 `Settings -> Pages`
2. Source 选择 `GitHub Actions`
3. 打开 `Actions` 查看 `Deploy VitePress to GitHub Pages` 是否成功

站点发布地址以 GitHub Pages 页面显示的 URL 为准。

## 评论配置

评论组件位于：

```text
docs/.vitepress/theme/components/BookComment.vue
```

当前使用 Giscus，仓库配置为：

```text
Craftr-X/Craftx-books.github.io
```

要让评论真正显示，需要在 Giscus 官网生成配置，并补全以下两个值：

```html
data-repo-id="..."
data-category-id="..."
```

补全位置在 `BookComment.vue` 中：

```ts
script.setAttribute('data-repo-id', '')
script.setAttribute('data-category-id', '')
```

同时需要确保目标 GitHub 仓库已开启 Discussions，并安装或启用 Giscus。

## 维护说明

- 修改首页：`docs/index.md`
- 修改主题样式：`docs/.vitepress/theme/custom.css`
- 修改 VitePress 配置：`docs/.vitepress/config.mts`
- 修改书籍目录：`docs/books/`
- 修改侧边栏：`sidebar-generated.json`

更新内容后建议先执行：

```bash
npm run build
```

确认本地构建通过后再提交推送。
