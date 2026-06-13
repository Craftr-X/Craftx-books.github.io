import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { extname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function walkMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out
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

function generateContentStats(options = {}) {
  const root = options.root || defaultRoot
  const books = readJson(join(root, 'books.json'), [])
  const docsBooksDir = join(root, 'docs', 'books')
  const statsPath = join(root, 'content-stats.json')
  const previous = readJson(statsPath, {})
  const counts = {
    bookletCount: books.filter(book => (book.category || 'booklet') === 'booklet').length,
    ebookCount: books.filter(book => (book.category || 'booklet') === 'ebook').length,
    bookCount: books.length,
    chapterCount: books.reduce((sum, book) => sum + walkMarkdown(join(docsBooksDir, book.slug)).length, 0),
  }
  const countsChanged = Object.entries(counts).some(([key, value]) => previous[key] !== value)
  const stats = {
    ...counts,
    generatedAt: countsChanged
      ? options.generatedAt || new Date().toISOString()
      : previous.generatedAt || options.generatedAt || new Date().toISOString(),
  }

  writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`, 'utf8')
  return stats
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateContentStats()
}

export { generateContentStats }
