# Repository Guidelines

## Project Structure & Module Organization

This repository is a VitePress books site. Main site content lives in `docs/`, with the homepage at `docs/index.md`. Book chapters are grouped by slug under `docs/books/<book-slug>/`; each book should include an `index.md` plus numbered chapter Markdown files. VitePress configuration and theme customizations live in `docs/.vitepress/`. Static public assets belong in `docs/public/`; book-specific images should stay beside the book content, commonly under `images/` or `_assets/`. Helper scripts live in `scripts/`. Generated build output in `dist/`, dependencies, caches, logs, and IDE files should not be edited manually.

## Build, Test, and Development Commands

- `npm install`: install dependencies for local development.
- `npm run dev`: start the VitePress dev server for `docs/`.
- `npm run build`: run prebuild content fixes and build the static site to `dist/`.
- `npm run preview`: preview the built site locally.
- `npm run generate:sidebar`: regenerate `sidebar-generated.json` after content structure changes.
- `npm run import:book -- ./path/to/book --slug my-book`: import a Markdown folder or EPUB into `docs/books/`.
- `node --test scripts/import-book.test.mjs`: run the Node test suite for the import script.

## Coding Style & Naming Conventions

Use two-space indentation in JavaScript, TypeScript, Vue, JSON, and Markdown-adjacent config files. Scripts use ES modules (`.mjs`) and Node built-ins where possible. Keep Markdown filenames readable and ordered, for example `01-开篇.md`. Use lowercase kebab-case for book slugs such as `typescript-intro`. Preserve existing Chinese punctuation and titles.

## Testing Guidelines

There is no full site test framework; the required validation is `npm run build`. For script logic, add focused tests with Node’s built-in `node:test` and `node:assert/strict`, following `scripts/import-book.test.mjs`. Run script tests when changing import or normalization behavior, and run a full build before opening a PR.

## Branch & Workflow Guidelines

This project follows a **branch-based workflow**. Never commit directly to `main`.

1. **Create a feature branch** from `main` before making changes. Use descriptive branch names:
   - `feat/xxx` for new features
   - `fix/xxx` for bug fixes
   - `docs/xxx` for documentation or content updates
   - `chore/xxx` for maintenance tasks
2. **Commit and push** to the feature branch. Run `npm run build` locally to validate before pushing.
3. **Open a Pull Request** targeting `main`. The CI workflow will automatically run build validation and tests.
4. **After review and CI pass**, merge the PR into `main`. The deploy workflow will automatically build and publish to GitHub Pages.

## Commit & Pull Request Guidelines

Recent commits follow Conventional Commit-style prefixes such as `docs:`, `fix:`, and `feat:`. Use concise subject lines, for example `fix: normalize missing image assets`. Pull requests should describe the change, list validation commands run, link related issues when available, and include screenshots for visible site or theme changes. For new books, mention the slug and confirm `books.json`, `sidebar-generated.json`, and the README book list were updated when applicable.

## Security & Configuration Tips

Do not commit private source books, credentials, local logs, or generated `dist/` artifacts. Giscus and GitHub Pages settings are repository-level configuration; change them only with a clear deployment reason.
