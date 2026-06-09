import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsBooksDir = join(root, 'docs', 'books')
const booksPath = join(root, 'books.json')
const sidebarPath = join(root, 'sidebar-generated.json')

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function walkMarkdown(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walkMarkdown(full, out)
    } else if (extname(entry).toLowerCase() === '.md' && entry.toLowerCase() !== 'index.md') {
      out.push(full)
    }
  }
  return out
}

function titleFromMarkdown(file) {
  return basename(file, '.md')
}

function orderKey(file) {
  const name = basename(file, '.md')
  const numeric = name.match(/^(\d+)/)
  return {
    numeric: numeric ? Number(numeric[1]) : Number.MAX_SAFE_INTEGER,
    name,
  }
}

function sortMarkdown(a, b) {
  const ak = orderKey(a)
  const bk = orderKey(b)
  if (ak.numeric !== bk.numeric) return ak.numeric - bk.numeric
  return ak.name.localeCompare(bk.name, 'zh-CN', { numeric: true })
}

function toLink(slug, file) {
  const rel = relative(join(docsBooksDir, slug), file)
  const withoutExt = rel.slice(0, -extname(rel).length).split(sep).join('/')
  return `/books/${slug}/${withoutExt}`
}

function generateSidebar() {
  const books = readJson(booksPath, [])
  const sidebar = readJson(sidebarPath, {})
  const activeBookKeys = new Set()

  for (const book of books) {
    const bookDir = join(docsBooksDir, book.slug)
    if (!existsSync(bookDir)) continue
    const key = `/books/${book.slug}/`
    activeBookKeys.add(key)

    const items = walkMarkdown(bookDir)
      .sort(sortMarkdown)
      .map(file => ({
        text: titleFromMarkdown(file),
        link: toLink(book.slug, file),
      }))

    if (!sidebar[key]) {
      sidebar[key] = [
        {
          text: book.title,
          items,
        },
      ]
    }
  }

  for (const key of Object.keys(sidebar)) {
    if (key.startsWith('/books/') && !activeBookKeys.has(key)) {
      delete sidebar[key]
    }
  }

  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`, 'utf8')
  return sidebar
}

export function updateSidebarForBook(book) {
  const bookDir = join(docsBooksDir, book.slug)
  if (!existsSync(bookDir)) throw new Error(`书籍目录不存在：${bookDir}`)

  const sidebar = readJson(sidebarPath, {})
  const items = walkMarkdown(bookDir)
    .sort(sortMarkdown)
    .map(file => ({
      text: titleFromMarkdown(file),
      link: toLink(book.slug, file),
    }))

  sidebar[`/books/${book.slug}/`] = [
    {
      text: book.title,
      items,
    },
  ]

  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`, 'utf8')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateSidebar()
}
