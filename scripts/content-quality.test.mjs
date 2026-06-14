import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateSidebar, regenerateBookIndex } from './generate-sidebar.mjs'
import { generateContentStats } from './generate-content-stats.mjs'
import { verify } from './verify-import.mjs'

function makeProject() {
  const root = mkdtempSync(join(tmpdir(), 'craftx-quality-'))
  mkdirSync(join(root, 'docs', 'books'), { recursive: true })
  return root
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

test('generateContentStats counts registered books and chapters', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [
      { slug: 'alpha', title: 'Alpha', category: 'booklet' },
      { slug: 'beta', title: 'Beta', category: 'ebook' },
      { slug: 'gamma', title: 'Gamma' },
    ])
    mkdirSync(join(root, 'docs', 'books', 'alpha'))
    mkdirSync(join(root, 'docs', 'books', 'beta'))
    mkdirSync(join(root, 'docs', 'books', 'gamma'))
    writeFileSync(join(root, 'docs', 'books', 'alpha', 'index.md'), '# Alpha\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '01-a.md'), '# A\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '02-b.md'), '# B\n')
    writeFileSync(join(root, 'docs', 'books', 'beta', '01-c.md'), '# C\n')
    writeFileSync(join(root, 'docs', 'books', 'gamma', '01-d.md'), '# D\n')

    const stats = generateContentStats({ root, generatedAt: '2026-06-13T00:00:00.000Z' })

    assert.deepEqual(stats, {
      bookletCount: 2,
      ebookCount: 1,
      bookCount: 3,
      chapterCount: 4,
      generatedAt: '2026-06-13T00:00:00.000Z',
    })
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'content-stats.json'), 'utf8')), stats)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateContentStats preserves generatedAt when counts do not change', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'booklet' }])
    mkdirSync(join(root, 'docs', 'books', 'alpha'))
    writeFileSync(join(root, 'docs', 'books', 'alpha', '01-a.md'), '# A\n')

    generateContentStats({ root, generatedAt: '2026-06-13T00:00:00.000Z' })
    const stats = generateContentStats({ root, generatedAt: '2026-06-14T00:00:00.000Z' })

    assert.equal(stats.generatedAt, '2026-06-13T00:00:00.000Z')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateSidebar refreshes existing book entries', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'booklet' }])
    writeJson(join(root, 'sidebar-generated.json'), {
      '/books/alpha/': [{ text: 'Old Alpha', items: [{ text: 'Old', link: '/books/alpha/old' }] }],
    })
    mkdirSync(join(root, 'docs', 'books', 'alpha'))
    writeFileSync(join(root, 'docs', 'books', 'alpha', 'index.md'), '# Alpha\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '02-second.md'), '# Second\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '01-first.md'), '# First\n')

    const sidebar = generateSidebar({ root })

    assert.deepEqual(sidebar['/books/alpha/'], [{
      text: 'Alpha',
      collapsible: true,
      items: [
        { text: 'first', link: '/books/alpha/01-first' },
        { text: 'second', link: '/books/alpha/02-second' },
      ],
    }])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateSidebar skips hidden pages while preserving numbered order', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    writeJson(join(root, 'sidebar-generated.json'), {})
    mkdirSync(join(root, 'docs', 'books', 'alpha'))
    writeFileSync(join(root, 'docs', 'books', 'alpha', '01-cover.md'), [
      '---',
      'sidebar: false',
      '---',
      '# Cover',
      '',
    ].join('\n'))
    writeFileSync(join(root, 'docs', 'books', 'alpha', '02-preface.md'), '# Preface\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '03-body.md'), '# Body\n')

    const sidebar = generateSidebar({ root })

    assert.deepEqual(sidebar['/books/alpha/'][0].items, [
      { text: 'preface', link: '/books/alpha/02-preface' },
      { text: 'body', link: '/books/alpha/03-body' },
    ])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('verifyImport accepts a complete imported book', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'booklet' }])
    writeJson(join(root, 'sidebar-generated.json'), {
      '/books/alpha/': [{ text: 'Alpha', items: [{ text: '01-first', link: '/books/alpha/01-first' }] }],
    })
    writeFileSync(join(root, 'README.md'), '[Alpha](./docs/books/alpha/)\n')
    mkdirSync(join(root, 'docs', 'books', 'alpha', '_assets'), { recursive: true })
    writeFileSync(join(root, 'docs', 'books', 'alpha', '_assets', 'cover.png'), 'png')
    writeFileSync(join(root, 'docs', 'books', 'alpha', 'index.md'), '- [First](./01-first.md)\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '01-first.md'), [
      '# First',
      '',
      '![cover](_assets/cover.png)',
      '[Index](./index.md)',
      '',
    ].join('\n'))

    const results = verify('alpha', { root, runBuild: false })

    assert.equal(results.filter(result => result.status === 'fail').length, 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('verifyImport does not require hidden numbered pages in index.md', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    writeJson(join(root, 'sidebar-generated.json'), {
      '/books/alpha/': [{ text: 'Alpha', items: [{ text: '02-body', link: '/books/alpha/02-body' }] }],
    })
    writeFileSync(join(root, 'README.md'), '[Alpha](./docs/books/alpha/)\n')
    mkdirSync(join(root, 'docs', 'books', 'alpha'), { recursive: true })
    writeFileSync(join(root, 'docs', 'books', 'alpha', 'index.md'), '- [Body](./02-body.md)\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '01-cover.md'), [
      '---',
      'sidebar: false',
      '---',
      '# Cover',
      '',
    ].join('\n'))
    writeFileSync(join(root, 'docs', 'books', 'alpha', '02-body.md'), '# Body\n')

    const results = verify('alpha', { root, runBuild: false })
    const indexCheck = results.find(result => result.check === 'index.md links to all chapters')

    assert.equal(indexCheck.status, 'pass')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('verifyImport rejects broken local assets, links, and EPUB leftovers', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    writeJson(join(root, 'sidebar-generated.json'), {})
    writeFileSync(join(root, 'README.md'), 'No books yet.\n')
    mkdirSync(join(root, 'docs', 'books', 'alpha'), { recursive: true })
    writeFileSync(join(root, 'docs', 'books', 'alpha', 'index.md'), '# Alpha\n')
    writeFileSync(join(root, 'docs', 'books', 'alpha', '01-first.md'), [
      '# First',
      '',
      '![missing](_assets/missing.png)',
      '[Broken](./missing.md)',
      '[Source](text00000.html#filepos123)',
      '[图片：_assets/missing.png]',
      '',
    ].join('\n'))

    const results = verify('alpha', { root, runBuild: false })
    const failures = results
      .filter(result => result.status === 'fail')
      .map(result => `${result.check}: ${result.detail || ''}`)
      .join('\n')

    assert.match(failures, /all images resolve/)
    assert.match(failures, /no source HTML links/)
    assert.match(failures, /no residual placeholders/)
    assert.match(failures, /sidebar contains slug/)
    assert.match(failures, /README\.md contains slug/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('regenerateBookIndex preserves existing chapter order and custom display text', () => {
  const root = makeProject()
  try {
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), [
      '---',
      'layout: doc',
      'title: Alpha',
      'aside: false',
      '---',
      '# Alpha',
      '',
      '## 📖 目录',
      '',
      '- [开篇](./00-开篇.md)',
      '- [第一章](./01-第一章.md)',
      '- [尾声](./99-尾声.md)',
      '',
    ].join('\n'))
    writeFileSync(join(bookDir, '00-开篇.md'), '# 开篇\n')
    writeFileSync(join(bookDir, '01-第一章.md'), '# 第一章\n')
    writeFileSync(join(bookDir, '99-尾声.md'), '# 尾声\n')

    const items = [
      { text: '开篇', link: '/books/alpha/00-开篇' },
      { text: '第一章', link: '/books/alpha/01-第一章' },
      { text: '尾声', link: '/books/alpha/99-尾声' },
    ]
    const changed = regenerateBookIndex(root, 'alpha', items)

    assert.equal(changed, true)
    const content = readFileSync(join(bookDir, 'index.md'), 'utf8')
    // 标题样式统一为 ## 目录
    assert.match(content, /## 目录\n/)
    assert.doesNotMatch(content, /📖/)
    // 自定义显示文本和顺序都保留
    const lines = content.split('\n')
    const itemLines = lines.filter(l => l.startsWith('- ['))
    assert.deepEqual(itemLines, [
      '- [开篇](./00-开篇.md)',
      '- [第一章](./01-第一章.md)',
      '- [尾声](./99-尾声.md)',
    ])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('regenerateBookIndex is idempotent', () => {
  const root = makeProject()
  try {
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), [
      '# Alpha',
      '',
      '## 目录',
      '',
      '- [first](./01-first.md)',
      '',
    ].join('\n'))
    writeFileSync(join(bookDir, '01-first.md'), '# First\n')

    const items = [{ text: 'first', link: '/books/alpha/01-first' }]
    regenerateBookIndex(root, 'alpha', items)
    const changed = regenerateBookIndex(root, 'alpha', items)

    assert.equal(changed, false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('regenerateBookIndex keeps chapters absent from index appended, in sidebar order', () => {
  const root = makeProject()
  try {
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), [
      '# Alpha',
      '',
      '## 目录',
      '',
      '- [intro](./01-intro.md)',
      '',
    ].join('\n'))
    writeFileSync(join(bookDir, '01-intro.md'), '# Intro\n')
    writeFileSync(join(bookDir, '02-new.md'), '# New\n')

    // sidebar 包含一个 index.md 没有的新章节
    const items = [
      { text: 'intro', link: '/books/alpha/01-intro' },
      { text: 'new', link: '/books/alpha/02-new' },
    ]
    regenerateBookIndex(root, 'alpha', items)

    const content = readFileSync(join(bookDir, 'index.md'), 'utf8')
    const itemLines = content.split('\n').filter(l => l.startsWith('- ['))
    assert.deepEqual(itemLines, [
      '- [intro](./01-intro.md)', // 已有顺序保留
      '- [new](./02-new.md)',     // 新章节追加
    ])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('regenerateBookIndex skips index.md without a TOC block', () => {
  const root = makeProject()
  try {
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    const original = [
      '---',
      'title: Alpha',
      '---',
      '# Alpha',
      '',
      'No TOC here, just prose.',
      '',
    ].join('\n')
    writeFileSync(join(bookDir, 'index.md'), original)

    const changed = regenerateBookIndex(root, 'alpha', [
      { text: 'first', link: '/books/alpha/01-first' },
    ])

    assert.equal(changed, false)
    assert.equal(readFileSync(join(bookDir, 'index.md'), 'utf8'), original)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('regenerateBookIndex preserves content after the TOC block', () => {
  const root = makeProject()
  try {
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), [
      '# Alpha',
      '',
      '## 目录',
      '',
      '- [first](./01-first.md)',
      '',
      '## 后记',
      '',
      '这是一段后记内容。',
      '',
    ].join('\n'))
    writeFileSync(join(bookDir, '01-first.md'), '# First\n')

    regenerateBookIndex(root, 'alpha', [
      { text: 'first', link: '/books/alpha/01-first' },
    ])

    const content = readFileSync(join(bookDir, 'index.md'), 'utf8')
    // 后记区块完整保留（标题和正文）
    assert.match(content, /## 后记[\s\S]*这是一段后记内容。/)
    // 目录项在两个区块之间
    const firstIdx = content.indexOf('- [first](./01-first.md)')
    const afterIdx = content.indexOf('## 后记')
    assert.ok(firstIdx > 0 && afterIdx > firstIdx)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

// ===== E1: 长书侧边栏 collapsible 分组 =====

test('generateSidebar keeps short books flat (no grouping)', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), '# Alpha\n')
    // 5 章：远低于 20 章阈值，应保持扁平
    for (let i = 1; i <= 5; i += 1) {
      writeFileSync(join(bookDir, `${String(i).padStart(2, '0')}-ch${i}.md`), `# Ch${i}\n`)
    }

    const sidebar = generateSidebar({ root })
    const section = sidebar['/books/alpha/'][0]

    assert.equal(section.collapsible, true) // 顶层 section 始终可折叠
    // items 应全部是叶子节点（带 link），无嵌套分组
    const hasNestedGroup = section.items.some(item => item.items && !item.link)
    assert.equal(hasNestedGroup, false)
    assert.equal(section.items.length, 5)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateSidebar does not group at exactly GROUP_THRESHOLD (20 chapters stays flat)', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), '# Alpha\n')
    // 恰好 20 章：阈值是 > 20 才分组，20 章应保持扁平
    for (let i = 1; i <= 20; i += 1) {
      writeFileSync(join(bookDir, `${String(i).padStart(2, '0')}-ch${i}.md`), `# Ch${i}\n`)
    }

    const sidebar = generateSidebar({ root })
    const section = sidebar['/books/alpha/'][0]
    const hasNestedGroup = section.items.some(item => item.items && !item.link)

    assert.equal(hasNestedGroup, false)
    assert.equal(section.items.length, 20)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateSidebar groups at GROUP_THRESHOLD + 1 (21 chapters triggers grouping)', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), '# Alpha\n')
    // 21 章：超过阈值，应分组为 01-10、11-20、21-30（尾组 1 章）
    for (let i = 1; i <= 21; i += 1) {
      writeFileSync(join(bookDir, `${String(i).padStart(2, '0')}-ch${i}.md`), `# Ch${i}\n`)
    }

    const sidebar = generateSidebar({ root })
    const section = sidebar['/books/alpha/'][0]
    const groups = section.items.filter(item => item.items)

    assert.equal(groups.length, 3)
    assert.equal(groups[2].text, '第 21-30 章')
    assert.equal(groups[2].items.length, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateSidebar groups long books into collapsible decades', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), '# Alpha\n')
    // 25 章：超过 20 章阈值，应分组
    for (let i = 1; i <= 25; i += 1) {
      writeFileSync(join(bookDir, `${String(i).padStart(2, '0')}-ch${i}.md`), `# Ch${i}\n`)
    }

    const sidebar = generateSidebar({ root })
    const section = sidebar['/books/alpha/'][0]

    assert.equal(section.collapsible, true)
    // 应有 3 个分组：01-10、11-20、21-30（最后一组只有 5 章）
    const groups = section.items.filter(item => item.items)
    assert.equal(groups.length, 3)
    assert.equal(groups[0].text, '第 01-10 章')
    assert.equal(groups[0].collapsible, true)
    assert.equal(groups[1].text, '第 11-20 章')
    assert.equal(groups[1].items.length, 10)
    assert.equal(groups[2].text, '第 21-30 章')
    assert.equal(groups[2].items.length, 5)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateSidebar puts non-numbered chapters in an 其他 group', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), '# Alpha\n')
    // 无数字前缀的章节（开篇词、序）+ 22 个数字章节（触发分组）
    writeFileSync(join(bookDir, '开篇词.md'), '# 开篇词\n')
    writeFileSync(join(bookDir, '序.md'), '# 序\n')
    for (let i = 1; i <= 22; i += 1) {
      writeFileSync(join(bookDir, `${String(i).padStart(2, '0')}-ch${i}.md`), `# Ch${i}\n`)
    }

    const sidebar = generateSidebar({ root })
    const section = sidebar['/books/alpha/'][0]
    const groups = section.items.filter(item => item.items)

    // 第一个分组应是「其他」，包含无前缀章节
    assert.equal(groups[0].text, '其他')
    assert.equal(groups[0].items.length, 2)
    assert.equal(groups[0].collapsed, false) // 其他组默认展开
    // 后续分组按数字前缀
    assert.equal(groups[1].text, '第 01-10 章')
    assert.equal(groups[2].text, '第 11-20 章')
    assert.equal(groups[3].text, '第 21-30 章')
    assert.equal(groups[3].items.length, 2)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('generateSidebar keeps index.md flat even when sidebar is grouped', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'), '# Alpha\n\n## 目录\n')
    for (let i = 1; i <= 25; i += 1) {
      writeFileSync(join(bookDir, `${String(i).padStart(2, '0')}-ch${i}.md`), `# Ch${i}\n`)
    }

    generateSidebar({ root })

    const indexContent = readFileSync(join(bookDir, 'index.md'), 'utf8')
    const itemLines = indexContent.split('\n').filter(l => l.startsWith('- ['))
    // index.md 应是 25 个扁平链接，不含分组标题
    assert.equal(itemLines.length, 25)
    assert.ok(itemLines.every(l => /\]\(\.\/\d{2}-ch\d+\.md\)$/.test(l)))
    // 不应出现分组标题作为链接
    assert.doesNotMatch(indexContent, /- \[第 \d+-\d+ 章\]/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('verify accepts a long book with grouped sidebar', () => {
  const root = makeProject()
  try {
    writeJson(join(root, 'books.json'), [{ slug: 'alpha', title: 'Alpha', category: 'ebook' }])
    writeJson(join(root, 'sidebar-generated.json'), {})
    writeFileSync(join(root, 'README.md'), '[Alpha](./docs/books/alpha/)\n')
    const bookDir = join(root, 'docs', 'books', 'alpha')
    mkdirSync(bookDir, { recursive: true })
    writeFileSync(join(bookDir, 'index.md'),
      '# Alpha\n\n## 目录\n\n' + Array.from({ length: 25 }, (_, i) =>
        `- [ch${i + 1}](./${String(i + 1).padStart(2, '0')}-ch${i + 1}.md)`
      ).join('\n') + '\n')
    for (let i = 1; i <= 25; i += 1) {
      writeFileSync(join(bookDir, `${String(i).padStart(2, '0')}-ch${i}.md`), `# Ch${i}\n`)
    }

    // 先生成带分组的 sidebar
    generateSidebar({ root })
    // verify 应能递归遍历分组结构，所有链接都解析成功
    const results = verify('alpha', { root, runBuild: false })
    const sidebarCheck = results.find(r => r.check === 'sidebar links resolve')
    assert.equal(sidebarCheck.status, 'pass')
    const indexCheck = results.find(r => r.check === 'index.md links to all chapters')
    assert.equal(indexCheck.status, 'pass')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
