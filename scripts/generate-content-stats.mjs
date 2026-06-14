import { readFileSync, writeFileSync } from 'fs'
import { basename, dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { estimateMinutes } from './reading-time-core.mjs'
import { readJson, walkMarkdown } from './content-utils.mjs'

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 计算单本书的阅读时长明细。
 * 返回 { chapterCount, readingMinutes, chapters: { "<basename 无 .md>": minutes } }
 */
function bookReadingStats(bookDir) {
  const files = walkMarkdown(bookDir)
  const chapters = {}
  let readingMinutes = 0
  for (const file of files) {
    const key = basename(file, '.md')
    const raw = readFileSync(file, 'utf8')
    const minutes = estimateMinutes(raw)
    chapters[key] = minutes
    readingMinutes += minutes
  }
  return {
    chapterCount: files.length,
    readingMinutes,
    chapters,
  }
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

  // 按书计算阅读时长明细
  const booksDetail = {}
  let totalReadingMinutes = 0
  for (const book of books) {
    const detail = bookReadingStats(join(docsBooksDir, book.slug))
    booksDetail[book.slug] = detail
    totalReadingMinutes += detail.readingMinutes
  }

  const stats = {
    ...counts,
    totalReadingMinutes,
    books: booksDetail,
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
