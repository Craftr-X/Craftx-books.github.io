# CraftX Books

[![VitePress](https://img.shields.io/badge/VitePress-1.6.4-646cff?logo=vite&logoColor=white)](https://vitepress.dev/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222?logo=github)](https://github.com/Craftr-X/Craftx-books.github.io/actions)

CraftX Books 是一个基于 VitePress 构建的在线阅读站点，发布到 GitHub Pages。站点聚合技术小册和 EPUB 转 Markdown 的电子书，支持在线阅读、目录导航、本地搜索、深浅色主题切换和章节评论讨论，适合沉浸式阅读与系统化学习。

> 仓库地址：<https://github.com/Craftr-X/Craftx-books.github.io>

## ✨ 主要特性

- 📚 技术小册与电子书在线阅读：所有内容统一放在 `docs/books/` 下，按目录生成阅读路径。
- 🧭 自动化导航：通过 VitePress 导航、侧边栏和页面目录提供清晰的章节浏览体验。
- 🗂️ 内容分类：`books.json` 使用 `category` 区分 `booklet` 技术小册和 `ebook` 电子书，顶部导航和首页统计会自动分组。
- 🔎 本地搜索：使用 VitePress 内置 local search，支持站内内容检索。
- 💬 评论讨论：章节页接入 Giscus，基于 GitHub Discussions 承载读者交流。
- 🌓 主题切换：沿用 VitePress 深色/浅色模式，评论主题跟随系统偏好。
- 🧩 内容预处理：构建前自动处理 Markdown 兼容问题和缺失资源占位。
- 🚀 自动部署：推送到 `main` 分支后通过 GitHub Actions 构建并发布到 GitHub Pages。

## 📖 内容目录

以下顺序与站点导航配置保持一致。

### 技术小册

| 小册 | 简介 | 阅读链接 |
| --- | --- | --- |
| Claude Code 企业级全链路开发实战 | 一个人用 Claude Code 造一个简版 Dify | [开始阅读](./docs/books/claude-code-dev/) |
| Claude Code 企业级老项目改造实战 | 用 AI 重构遗留代码的实战指南 | [开始阅读](./docs/books/claude-code-legacy/) |
| MySQL 是怎样运行的 | 从根儿上理解 MySQL | [开始阅读](./docs/books/mysql-running/) |
| TypeScript 入门教程 | 从 JavaScript 到 TypeScript 的第一步 | [开始阅读](./docs/books/typescript-intro/) |
| TypeScript 全面进阶指南 | 深入理解 TypeScript 类型系统 | [开始阅读](./docs/books/typescript-advanced/) |
| 从 0 打造通用型低代码产品 | 低代码平台架构与实现 | [开始阅读](./docs/books/low-code-platform/) |
| 从 0 到 1 实现一套 CI/CD 流程 | Jenkins + Kubernetes 持续集成部署 | [开始阅读](./docs/books/cicd-guide/) |
| 说透 Redis 7 | 深度解析 Redis 核心原理与实战 | [开始阅读](./docs/books/redis7/) |
| 你不知道的 Chrome 调试技巧 | 提升前端调试效率的实用技巧 | [开始阅读](./docs/books/chrome-devtools/) |
| 开发者必备的 Docker 实践指南 | 容器化技术从入门到实践 | [开始阅读](./docs/books/docker-guide/) |
| 程序员的必修课 | 计算机基础与编程素养 | [开始阅读](./docs/books/programmer-essential/) |
| 程序员职业小白书 | 如何规划和经营你的职业 | [开始阅读](./docs/books/career-guide/) |
| 微信小程序开发入门 | 从 0 到 1 实现天气小程序 | [开始阅读](./docs/books/wechat-miniprogram/) |
| 从0开始构建AgentHarness | 从零开始构建 Agent Harness 的完整指南 | [开始阅读](./docs/books/build-agent-harness/) |
| AI 大模型之美 | 大语言模型与生成式 AI 应用实战 | [开始阅读](./docs/books/ai-model-beauty/) |
| 技术人求职指南 | 技术人求职全流程指南，从市场认知到入职抉择 | [开始阅读](./docs/books/technology-career-guide/) |

### 电子书

| 电子书 | 简介 | 阅读链接 |
| --- | --- | --- |
| 小狗钱钱 | 博多·舍费尔财商教育童话 | [开始阅读](./docs/books/money-dog/) |
| 富爸爸穷爸爸 | 全球最佳财商教育系列 | [开始阅读](./docs/books/rich-dad-poor-dad/) |
| 认知觉醒 | 开启自我改变的原动力 | [开始阅读](./docs/books/renzhi-juexing/) |
| 认知驱动 | 《认知觉醒》姊妹篇，有效行动，用实践创造可控人生 | [开始阅读](./docs/books/renzhi-qudong/) |
| 置身钉内 | 钉钉 ONE 项目复盘与产品、设计、协作实践记录 | [开始阅读](./docs/books/zhi-shen-ding-nei/) |
| 学会提问 | 批判性思维入门经典，原书第12版 | [开始阅读](./docs/books/xuehui-tiwen/) |
| 乡土中国（修订本） | 费孝通社会学经典，中国乡土社会结构与文化深层解读 | [开始阅读](./docs/books/xiangtu-zhongguo/) |
| 疾病原理 | 中医基础理论与疾病成因解析 | [开始阅读](./docs/books/jibing-yuanli/) |
| 无悔追踪 | 作者：张策 | [开始阅读](./docs/books/wuhui-zhuizong/) |
| 以日为鉴 | 借鉴日本“失去的三十年”在就业、学历、医疗、出海等领域的经验教训，写给普通人的经济衰退期生存与抉择指南 | [开始阅读](./docs/books/yi-ri-wei-jian/) |
| 盐铁论 | 西汉·桓宽撰，记录汉昭帝时期盐铁专卖政策大辩论，经济思想与治国方略的千古名篇 | [开始阅读](./docs/books/yan-tie-lun/) |

## 🚀 快速开始

环境要求：

- Node.js 20 或更高版本
- npm

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

## 💬 评论功能说明

评论组件位于：

```text
docs/.vitepress/theme/components/BookComment.vue
```

当前使用 Giscus，并绑定到以下 GitHub 仓库与 Discussions 分类：

```text
repo: Craftr-X/Craftx-books.github.io
category: Announcements
mapping: pathname
theme: preferred_color_scheme
lang: zh-CN
```

评论默认在普通章节页渲染，首页、页面型内容以及各小册首页不会显示评论区。评论能力依赖目标仓库开启 GitHub Discussions，并正确安装或启用 Giscus。

## 🖼️ 页面截图

> 网站地址：<https://craftr-x.github.io/Craftx-books.github.io/>

![screenshot](./docs/public/index.png)

## 🧱 技术栈

- VitePress `^1.6.4`
- Vue 3 / VitePress 默认主题扩展
- Markdown 内容体系
- Giscus + GitHub Discussions
- GitHub Actions
- GitHub Pages
- Node.js 20

## 📁 项目结构

```text
.
├── docs/                         # VitePress 文档站点源码
│   ├── .vitepress/               # VitePress 配置、主题和组件
│   ├── books/                    # 技术小册与电子书正文
│   ├── public/                   # 静态资源
│   └── index.md                  # 首页入口
├── scripts/                      # 构建前处理脚本
├── sidebar-generated.json        # 侧边栏配置
├── package.json                  # npm 脚本与依赖
└── .github/workflows/deploy.yml  # GitHub Pages 自动部署流程
```

根目录下的原始中文书籍文件夹只作为本地素材保留，已经在 `.gitignore` 中排除，不会随站点源码提交。

## 🛠️ 构建说明

`npm run build` 会先执行 `prebuild`：

```bash
node scripts/escape-vitepress-braces.mjs
node scripts/normalize-missing-assets.mjs
```

这两个脚本用于处理 VitePress 构建前的 Markdown 内容兼容问题和缺失资源占位问题。最终产物输出到 `dist/`。

构建过程中可能出现代码块语言名降级警告，例如部分 Markdown 使用了不标准的语言标识。这类警告不影响站点发布。

## 🧹 Markdown Lint

全站 Markdown 通过 [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) 检查纯格式问题。CI 会在每次 PR 自动执行 `npm run lint`。

```bash
npm run lint       # 检查全站 Markdown 格式（CI 使用）
npm run lint:fix   # 自动修复可修复的格式问题（行尾空格、空行、换行等）
```

配置在 [`.markdownlint-cli2.yaml`](./.markdownlint-cli2.yaml)，遵循「只管纯格式、不碰结构和内容」的原则：

- **保留开启**：行尾空格、多余空行、标题/列表/代码块前后空行、文件结尾换行、硬 tab 等机械格式规则。
- **关闭的结构性规则**：MD001（标题跳级）、MD025（多 H1）、MD041（首行须 H1）—— 中文小册源（EPUB/掘金）的标题结构已定，章节标题由文件名承载。
- **关闭的内容治理类规则**：见下方 TODO。

lint 与 `prebuild` 隔离，不会修改 `escape-vitepress-braces.mjs` / `normalize-missing-assets.mjs` 的产物；`lint:fix` 应在本地独立运行后再提交。

### 待治理的内容问题（未纳入 lint）

以下问题属于书源内容残留，无法机械修复，已记为 TODO，留待后续梯队单独治理：

- **代码块缺语言标识**（MD040，约 800 处）：影响 VitePress 语法高亮，需按书内容推断补全（如 redis7→`c`、mysql-running→`sql`）。
- **图片缺 alt 文本**（MD045，约 900 处）：EPUB/掘金迁移的 `![]()` 空_alt，需语义补全以改善无障碍访问。
- **裸 HTML 标签**（约 174 文件）：主要是 `<p align=center><img></p>` 居中图片，可批量转为 VitePress 兼容写法；少量孤例坏链接（MD042）、未用引用定义（MD053）同属此类。
- **标题风格/重复**：书源评论区的 `----` 分隔线（MD003 误报）、不同章节同名小标题（MD024）等结构特性，已关闭对应规则。

## 🚢 GitHub Pages 部署

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

## 🔧 维护说明

- 修改首页：`docs/index.md`
- 修改主题样式：`docs/.vitepress/theme/custom.css`
- 修改 VitePress 配置：`docs/.vitepress/config.mts`
- 修改内容目录：`docs/books/`
- 修改侧边栏：`sidebar-generated.json`
- 修改内容元数据：`books.json`
- 修改评论组件：`docs/.vitepress/theme/components/BookComment.vue`

本地导入技术小册或电子书时，使用 CLI：

```bash
npm run import:book -- ./path/to/markdown-folder --slug my-book
npm run import:book -- ./path/to/book.epub --slug my-book
```

导入工具仅支持 Markdown 文件夹或无 DRM 的 EPUB 文件。默认禁止覆盖已有 `docs/books/<book-slug>/`，需要覆盖时显式添加 `--force`；只预览不写入时添加 `--dry-run`。导入完成后会写入 `docs/books/<book-slug>/`，并更新 `books.json` 和 `sidebar-generated.json`。

分类规则：

- Markdown 文件夹导入默认写入 `category: "booklet"`，归入顶部导航的“技术小册”，首页技术小册数量自动更新。
- EPUB 文件导入默认写入 `category: "ebook"`，归入顶部导航的“电子书”，首页电子书数量自动更新。

完整说明见：[`docs/local-import-guide.md`](./docs/local-import-guide.md)

新增内容后，建议人工同步更新本 README 的“内容目录”表格；站点顶部导航和首页数量会从 `books.json` 自动更新。

更新内容后建议先执行：

```bash
npm run build
```

确认本地构建通过后再提交推送。

## 📄 开源协议

本项目采用「代码」与「内容」分离的**混合许可**（详见 [`LICENSE`](./LICENSE)）：

- **代码**（`scripts/`、`docs/.vitepress/`、构建脚本、配置文件等）采用 **MIT License** —— 可自由复用、修改、再分发。
- **内容**（`docs/books/` 下的电子书与小册正文、图片等）采用 **CC BY-NC 4.0** —— 允许署名后演绎与分享，但**禁止商业使用**。涉及第三方原著版权的资料，相关权利仍归原作者所有，本仓库仅以学习交流为目的收录。

如需超出上述范围（例如商业使用内容），请先与仓库维护者联系确认。

## 🤝 致谢 / 贡献指南

欢迎通过 Issue 或 Pull Request 反馈错别字、失效链接、章节排版问题或新增小册内容。提交前请先运行 `npm run build`，确保站点可以正常构建。
