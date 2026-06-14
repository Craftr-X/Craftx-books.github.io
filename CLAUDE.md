# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start VitePress dev server
- `npm run build` — prebuild fixes + VitePress static build to `dist/` (run this before committing)
- `npm run preview` — preview the built site
- `npm run generate:sidebar` — regenerate `sidebar-generated.json` from `docs/books/` structure
- `node --test scripts/import-book.test.mjs` — run import script tests
- `npm run import:book -- ./path/to/folder --slug my-book` — import a Markdown folder (category: booklet)
- `npm run import:book -- ./path/to/book.epub --slug my-book` — import an EPUB (category: ebook)
- `node scripts/verify-import.mjs <slug>` — run post-import verification (pass/fail JSON report)

## Architecture

**VitePress static site** for online book reading, published to GitHub Pages.

### Data Flow

Three files drive the site configuration:

1. **`books.json`** — master book registry. Each entry has `slug`, `title`, `desc`, `category` (`booklet` or `ebook`). The `config.mts` reads this at build time to generate the top nav items.
2. **`sidebar-generated.json`** — auto-generated sidebar config keyed by `/books/<slug>/`. Read by `config.mts` at build time.
3. **`docs/books/<slug>/`** — each book's Markdown files + auto-generated `index.md`.

The import script (`scripts/import-book.mjs`) writes all three: book content to `docs/books/`, updates `books.json`, and calls `updateSidebarForBook()` from `generate-sidebar.mjs` to update the sidebar JSON.

### Prebuild Pipeline

`npm run build` runs `prebuild` first, which executes two content-fixing scripts in order:

1. `scripts/escape-vitepress-braces.mjs` — replaces `{{` / `}}` in Markdown with zero-width-space-escaped versions to prevent VitePress/Vue template interpolation errors.
2. `scripts/normalize-missing-assets.mjs` — converts image/audio references pointing to nonexistent `_assets/` or `images/` files into placeholder text like `[缺失资源：path]`.

The VitePress config (`docs/.vitepress/config.mts`) has a custom Markdown-it rule `renderMissingAssetPlaceholders` that renders those placeholders as styled cards in the browser.

### Theme & Config

- **Config**: `docs/.vitepress/config.mts` — site title, base path (`/Craftx-books.github.io/`), nav, sidebar, search, outline.
- **Theme entry**: `docs/.vitepress/theme/index.ts` — extends default theme, registers `medium-zoom` for image zoom and mounts the Giscus comment component.
- **Comments**: `docs/.vitepress/theme/components/BookComment.vue` — Giscus integration, renders on chapter pages only (not on index/home pages).

### Content Conventions

- Book slugs: lowercase kebab-case (e.g., `typescript-intro`, `redis7`)
- Chapter files: numbered prefix + readable name (e.g., `01-开篇.md`, `02-基础概念.md`)
- `books.json` category determines nav placement: `booklet` → "技术小册" dropdown, `ebook` → "电子书" dropdown
- Images for books go in `docs/books/<slug>/images/` or `docs/books/<slug>/_assets/`
- After importing a book, run `npm run build` to verify before committing

### Book Import Quality Contract

Use this contract for every technical booklet, Markdown folder, or EPUB ebook import.

**Input type**

- EPUB file → run `npm run import:book` to convert EPUB HTML to Markdown, then import.
- Markdown folder → import `.md` pages and required image assets directly.
- Mixed folder → copy Markdown pages and required assets to a temp source, excluding PDFs, audio, TXT sidecars, logs, and unrelated files, then import.

**Scope and boundaries**

- Import one book slug at a time unless the user explicitly asks for more.
- A normal import should only change `docs/books/<slug>/`, `books.json`, `sidebar-generated.json`, `README.md`, and narrowly scoped importer/test files when importer behavior needs a fix.
- Do not edit existing books, theme files, VitePress config, comments, search, deployment, or `dist/` unless the user explicitly asks or the import cannot work without a narrowly scoped fix.
- Never overwrite `docs/books/<slug>/` without an explicit replacement request and `--force`.

**Required output**

- `docs/books/<slug>/index.md` plus numbered chapter Markdown files.
- `books.json` entry with stable lowercase kebab-case `slug`, clear `title`, concise `desc`, and correct `category` (`booklet` for Markdown folders, `ebook` for EPUBs unless the user says otherwise).
- `sidebar-generated.json` entry under `/books/<slug>/` so the left chapter sidebar lists all chapters in reading order.
- Chapter pages with readable Markdown content in the center area and meaningful headings for the right page outline. Do not set `aside: false` on chapter pages. A book `index.md` may use `aside: false`.
- Images copied into `_assets/`, `images/`, or another local book asset folder, with all Markdown image links resolving.
- EPUB internal links rewritten from source paths like `text00000.html#filepos...` to generated Markdown links like `./05-章节.md`, or removed if they cannot be resolved safely.
- `README.md` row added to the correct table with title, short description, and `./docs/books/<slug>/`.

**Validation checklist**

- Run a residual scan and fix every match:

  ```bash
  rg -n "\\[图片：|\\[缺失资源：|缺失资源|图片未找到|text[0-9]+\\.html|filepos" docs/books/<slug>
  ```

- Validate local Markdown links and image references from each imported Markdown file. Build does not catch every bad link because `ignoreDeadLinks: true` is enabled.
- If `scripts/import-book.mjs` changes, add focused coverage in `scripts/import-book.test.mjs` and run `node --test scripts/import-book.test.mjs`.
- Always run `npm run build`; existing code-block language warnings are non-blocking only when the build exits successfully.

**EPUB conversion rules**

- Prefer EPUB nav/NCX titles over generic spine filenames.
- Split one HTML spine file into multiple Markdown chapters when the TOC points to anchors inside that file.
- If TOC anchors are missing in HTML, do not drop content; import the full spine file as one chapter and report a warning.
- Decode HTML entities in titles, links, and alt text.
- After final Markdown filenames are known, rewrite EPUB internal links to those generated files.
- Never leave source `.html` links or `filepos` anchors in generated Markdown.

**Completion criteria**

The import is complete only when all are true:

- `docs/books/<slug>/index.md` exists and links to all chapters.
- `books.json`, `sidebar-generated.json`, and `README.md` include the new book.
- No missing-resource placeholders, unresolved local images, source EPUB HTML links, or broken local Markdown links remain in the imported book.
- `node scripts/verify-import.mjs <slug>` reports all checks passed.
- `node --test scripts/import-book.test.mjs` passes if import code changed.
- `npm run build` passes.
- Existing books and shared site behavior were not changed outside the documented scope.

### Scripts

All scripts in `scripts/` are ES modules (`.mjs`). Key exports from `import-book.mjs`: `parseOpf`, `parseNavDocToc`, `parseNcxToc`, `cleanTitle`, `normalizeHref`, `safeFileName`, `titleFileSegment` — these are used by the test file.

## Commit Conventions

- Conventional Commits prefixes: `docs:`, `fix:`, `feat:`, `chore:`, `update:`
- Create a feature branch from `main`, never commit directly to `main`
- Branch naming: `feat/xxx`, `fix/xxx`, `docs/xxx`, `chore/xxx`
- Open a PR to `main`; CI validates with `npm run build` + tests before merge
- After merge to `main`, GitHub Actions auto-deploys to GitHub Pages

## Important Notes

- `ignoreDeadLinks: true` is set in config — broken internal links won't fail the build but should still be fixed.
- The site base path is `/Craftx-books.github.io/` — all internal links must account for this.
- `sidebar-generated.json` (~86KB) is committed to the repo and regenerated by the import script or `npm run generate:sidebar`.
- Build may emit code-block language name downgrade warnings; these are non-blocking.
