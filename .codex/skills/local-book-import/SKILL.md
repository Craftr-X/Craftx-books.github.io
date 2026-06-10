---
name: local-book-import
description: Project-specific workflow for importing a local technical booklet into this VitePress books site. Use when the user gives a local folder or EPUB path and asks Codex to import it, convert EPUB to Markdown when needed, preserve local images, filter non-page files such as PDF/audio/text, validate rendered pages and image resources, and update README.md with the new booklet.
---

# Local Book Import

Use this skill to import one local booklet into this repository. The finished state must be a working VitePress book under `docs/books/<slug>/`, registered in `books.json` and `sidebar-generated.json`, with images rendering correctly, build passing, and `README.md` updated.

## Core Rules

- Treat "Markdown only" as "Markdown pages plus required image assets". Do not drop images referenced by Markdown.
- Filter non-page source files by default: `.pdf`, `.mp3`, `.wav`, `.m4a`, `.txt`, and similar sidecar files.
- Preserve or copy only assets required by Markdown whenever practical. Copying the whole image asset directory is acceptable when selective copying is risky or time-sensitive.
- Never leave `[图片：...]`, `[缺失资源：...]`, `alt="缺失资源"`, or broken local image links in the imported book.
- Do not overwrite an existing `docs/books/<slug>/` unless the user explicitly requests replacement or `--force` is appropriate.
- Verify with commands, not visual assumption.

## Workflow

1. Inspect the source path.
   - If it is a directory, scan recursively for `.md` files and local asset directories such as `images/`, `_assets/`, `assets/`, `img/`.
   - If it is an `.epub`, use the existing importer first because `scripts/import-book.mjs` supports EPUB conversion.
   - If it is neither a Markdown folder nor EPUB, stop and report the unsupported type.

2. Choose slug, title, and description.
   - Prefer a user-provided slug/title if present.
   - Otherwise derive title from the folder/file name or the first Markdown heading.
   - Use a stable lowercase hyphen slug.

3. Prepare Markdown-folder input when needed.
   - For a mixed local folder, create a temporary md-only import source.
   - Copy all `.md` files that should become pages.
   - Copy local image assets referenced by those Markdown files, preserving relative paths.
   - Do not copy PDFs, audio, TXT course sidecars, or unrelated files.
   - Before import, confirm the temp source contains `.md` and image files only, unless another asset type is explicitly required by Markdown.

4. Import.
   - Run:
     ```powershell
     npm.cmd run import:book -- "<input-path>" --slug <slug> --title "<title>" --desc "<desc>"
     ```
   - For replacement only when intended, add `--force`.
   - The importer should update `docs/books/<slug>/`, `books.json`, and `sidebar-generated.json`.

5. Restore and validate image paths.
   - Search imported Markdown for placeholder text:
     ```powershell
     rg -n -F "[图片：" docs\books\<slug>
     rg -n -F "[缺失资源：" docs\books\<slug>
     rg -n -F "缺失资源" docs\books\<slug>
     ```
   - If placeholders exist because a previous pass normalized missing assets, restore Markdown image syntax and copy the referenced assets from the source.
   - Validate local image references resolve from each Markdown file's directory.

6. Build.
   - Run:
     ```powershell
     npm.cmd run build
     ```
   - Fix any unresolved asset, Markdown, or VitePress error before proceeding.
   - Existing syntax-highlight warnings such as unloaded `vbnet` are non-blocking if the build succeeds.

7. Runtime verification.
   - Start or reuse local preview. Prefer the project static server after build:
     ```powershell
     node scripts\serve-built.mjs
     ```
     It serves `http://127.0.0.1:4173/Craftx-books.github.io/` unless the port is already occupied.
   - Request the book index and representative chapters with `Invoke-WebRequest`.
   - Inspect rendered HTML or built JS for imported image URLs under `/Craftx-books.github.io/assets/...`, then request at least one representative image URL and confirm HTTP `200`.
   - For higher confidence, scan all imported Markdown image references and ensure the source files exist before build; build success then verifies VitePress can bundle them.

8. Update `README.md`.
   - Add the new booklet to the existing technical booklet list/table using the repository's current format.
   - Include the title, slug/link, and concise description.
   - Keep README changes scoped to the new booklet entry.

9. Final checks.
   - Run:
     ```powershell
     git status --short
     git diff --stat
     ```
   - Confirm the expected changed files normally include:
     - `docs/books/<slug>/`
     - `books.json`
     - `sidebar-generated.json`
     - `README.md`
     - any narrowly scoped script fix if required

## Common Fixes

### Markdown Imported Without Images

If pages show text like `[图片：images/foo.png]`, the previous import dropped images and the missing-asset normalizer converted image Markdown to text. Fix by copying the source image directory or referenced files into `docs/books/<slug>/`, then replace:

```text
[图片：images/foo.png] -> ![图片](images/foo.png)
[缺失资源：images/foo.png] -> ![图片](images/foo.png)
```

Also normalize `![缺失资源](images/foo.png)` to `![图片](images/foo.png)`.

### EPUB Import

Use `npm run import:book` directly on the EPUB first. The importer converts EPUB content to Markdown and copies EPUB images into the generated book. After import, still run the same build and image verification steps. If EPUB extraction produces missing image markers, fix the extracted asset mapping before declaring success.

## Completion Criteria

The task is complete only when:

- `npm.cmd run build` succeeds.
- The new book index and at least one chapter page return HTTP `200` in local preview.
- At least one imported image URL from the rendered page returns HTTP `200`.
- The imported book contains no `[图片：...]`, `[缺失资源：...]`, or `缺失资源` residue.
- `README.md` mentions the new technical booklet.
