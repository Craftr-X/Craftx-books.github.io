---
name: local-book-import
description: Import a local technical booklet or EPUB ebook into this VitePress books site with full validation.
---

# Local Book Import

Use this skill whenever importing a technical booklet or EPUB ebook into this repository. The finished state must be a working VitePress book under `docs/books/<slug>/`, registered in `books.json` and `sidebar-generated.json`, listed in `README.md`, with images, chapter navigation, page content, and build validation all passing.

## Design Boundary

- Scope each import to one book slug unless the user explicitly asks for multiple books.
- Expected changed files for a normal import:
  - `docs/books/<slug>/`
  - `books.json`
  - `sidebar-generated.json`
  - `README.md`
  - `scripts/import-book.mjs` and `scripts/import-book.test.mjs` only when importer behavior must be fixed.
- Do not edit existing book content, site theme, VitePress config, deploy settings, comments, search, or generated `dist/` unless the user explicitly asks or the import cannot work without a narrowly scoped fix.
- Do not overwrite an existing `docs/books/<slug>/` unless the user explicitly requests replacement and `--force` is appropriate.
- Do not commit private source books, credentials, local logs, `dist/`, dependencies, or caches.
- Follow the branch workflow in `AGENTS.md`: do not commit directly to `main`.

## Input Types

- Markdown folder: import `.md` pages and required local assets.
- EPUB file: use `scripts/import-book.mjs`; it converts EPUB HTML to Markdown and copies image assets.
- Mixed local folder: create a temporary Markdown-only source before import, excluding PDFs, audio, TXT sidecars, logs, and unrelated files.
- Unsupported source: stop and report clearly.

## Import Contract

The imported book must provide:

- **Book registry**: one `books.json` entry with stable lowercase kebab-case `slug`, clear `title`, concise `desc`, and correct `category` (`booklet` for Markdown folders, `ebook` for EPUBs unless the user says otherwise).
- **Book directory**: `docs/books/<slug>/index.md` plus numbered chapter Markdown files such as `01-开篇.md`.
- **Left chapter sidebar**: `sidebar-generated.json` must include `/books/<slug>/` with all chapter pages in reading order.
- **Center content**: each chapter must render as normal VitePress Markdown, not raw EPUB HTML fragments.
- **Right page outline**: preserve or generate meaningful Markdown headings from the source so VitePress can show the page outline. Do not disable `aside` on chapter pages. A book `index.md` may use `aside: false`.
- **Images**: all referenced local images must exist beside the book, commonly in `_assets/` or `images/`, and render through VitePress.
- **Internal links**: EPUB source links such as `text00000.html#filepos...` must be rewritten to generated Markdown links such as `./05-章节.md`, or removed if they cannot be resolved safely.
- **README**: add one row to the correct README table, matching `books.json` category and linking to `./docs/books/<slug>/`.

## Workflow

1. Inspect current state.
   - Run `git status --short --branch`.
   - If on `main`, create a feature/docs branch before edits.
   - Check whether `docs/books/<slug>/` already exists.

2. Inspect the source path.
   - Directory: scan recursively for `.md` files and asset directories such as `images/`, `_assets/`, `assets/`, `img/`.
   - EPUB: run the existing importer first; do not hand-convert unless the importer fails and needs a fix.
   - Confirm title, slug, description, and category. Prefer user-provided values.

3. Prepare input when needed.
   - For mixed folders, copy only Markdown pages and required assets to a temp source.
   - Preserve relative image paths.
   - Exclude non-page source files unless Markdown directly requires them.

4. Import.
   - Run:
     ```bash
     npm run import:book -- "<input-path>" --slug <slug> --title "<title>" --desc "<desc>"
     ```
   - Add `--force` only for an intentional replacement.
   - Confirm importer updated `docs/books/<slug>/`, `books.json`, and `sidebar-generated.json`.

5. Validate and repair generated content.
   - Search for missing-resource placeholders and EPUB source links:
     ```bash
     rg -n "\\[图片：|\\[缺失资源：|缺失资源|图片未找到|text[0-9]+\\.html|filepos" docs/books/<slug>
     ```
   - Validate all local Markdown links and image links resolve from each Markdown file.
   - Fix unresolved internal links to point at generated `.md` files.
   - Fix missing images by copying assets from the source or restoring Markdown image syntax.

6. Update documentation.
   - Add the book to `README.md` under `技术小册` or `电子书`.
   - Keep the row concise: title, short description, `./docs/books/<slug>/`.

7. Test and validate.
   - If import scripts changed, add focused `node:test` coverage and run:
     ```bash
     node --test scripts/import-book.test.mjs
     ```
   - Run the automated verification script:
     ```bash
     node scripts/verify-import.mjs <slug>
     ```
   - Fix any failed checks before proceeding.
   - Always run:
     ```bash
     npm run build
     ```
   - Existing syntax-highlight warnings such as unloaded `vbnet` are non-blocking only if the build succeeds.

8. Runtime verification when feasible.
   - Start preview or serve the built site.
   - Confirm the book index and representative chapters return HTTP 200.
   - Confirm at least one imported image URL returns HTTP 200.
   - Check a representative chapter has left sidebar, center content, images, and right outline when the chapter has headings.

9. Final checks.
   - Run:
     ```bash
     git status --short --branch
     git diff --stat
     ```
   - Ensure changes stay inside the intended import boundary.

## EPUB Quality Rules

- Prefer EPUB navigation/NCX titles over generic spine filenames.
- If one EPUB HTML file contains multiple TOC anchor chapters, split it into separate numbered Markdown files.
- If TOC anchors cannot be found in HTML, do not drop content. Import the full spine file as one chapter and record a warning.
- Decode HTML entities in titles, links, and image alt text.
- Rewrite EPUB internal links after final Markdown filenames are known.
- Never leave source `.html` links or `filepos` anchors in generated Markdown.
- Add or update tests when changing EPUB parsing, splitting, title extraction, asset mapping, or internal link rewriting.

## Completion Criteria

The import is complete only when all are true:

- `docs/books/<slug>/index.md` exists and links to all chapters.
- `books.json`, `sidebar-generated.json`, and `README.md` include the new book.
- No missing-resource placeholders, unresolved local images, source EPUB HTML links, or broken local Markdown links remain in the imported book.
- `node scripts/verify-import.mjs <slug>` reports all checks passed.
- `node --test scripts/import-book.test.mjs` passes if import code changed.
- `npm run build` passes.
- Existing books and shared site behavior were not changed outside the documented scope.
