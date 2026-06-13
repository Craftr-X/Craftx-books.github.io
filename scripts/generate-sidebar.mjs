import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join, relative, resolve, sep } from 'path'
import { fileURLToPath } from 'url'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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
  return basename(file, '.md').replace(/^\d+-/, '')
}

function sidebarVisible(file) {
  const content = readFileSync(file, 'utf8')
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatter) return true
  return !/^sidebar:\s*false\s*$/m.test(frontmatter[1])
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

function toLink(docsBooksDir, slug, file) {
  const rel = relative(join(docsBooksDir, slug), file)
  const withoutExt = rel.slice(0, -extname(rel).length).split(sep).join('/')
  return `/books/${slug}/${withoutExt}`
}

function existingTextByLink(sidebarEntry) {
  const map = new Map()
  for (const section of sidebarEntry || []) {
    for (const item of section.items || []) {
      if (item.link && item.text) map.set(item.link, item.text)
    }
  }
  return map
}

function pathsFor(root) {
  return {
    docsBooksDir: join(root, 'docs', 'books'),
    booksPath: join(root, 'books.json'),
    sidebarPath: join(root, 'sidebar-generated.json'),
  }
}

function generateSidebar(options = {}) {
  const root = options.root || defaultRoot
  const { docsBooksDir, booksPath, sidebarPath } = pathsFor(root)
  const books = readJson(booksPath, [])
  const sidebar = readJson(sidebarPath, {})
  const activeBookKeys = new Set()

  for (const book of books) {
    const bookDir = join(docsBooksDir, book.slug)
    if (!existsSync(bookDir)) continue
    const key = `/books/${book.slug}/`
    activeBookKeys.add(key)

    const existingTexts = existingTextByLink(sidebar[key])
    const items = walkMarkdown(bookDir)
      .sort(sortMarkdown)
      .filter(sidebarVisible)
      .map(file => {
        const link = toLink(docsBooksDir, book.slug, file)
        return {
          text: existingTexts.get(link) || titleFromMarkdown(file),
          link,
        }
      })

    sidebar[key] = [
      {
        text: book.title,
        items,
      },
    ]
  }

  for (const key of Object.keys(sidebar)) {
    if (key.startsWith('/books/') && !activeBookKeys.has(key)) {
      delete sidebar[key]
    }
  }

  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`, 'utf8')
  return sidebar
}

export function updateSidebarForBook(book, options = {}) {
  const root = options.root || defaultRoot
  const { docsBooksDir, sidebarPath } = pathsFor(root)
  const bookDir = join(docsBooksDir, book.slug)
  if (!existsSync(bookDir)) throw new Error(`书籍目录不存在：${bookDir}`)

  const sidebar = readJson(sidebarPath, {})
  const items = walkMarkdown(bookDir)
    .sort(sortMarkdown)
    .filter(sidebarVisible)
    .map(file => ({
      text: titleFromMarkdown(file),
      link: toLink(docsBooksDir, book.slug, file),
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

export { generateSidebar }
