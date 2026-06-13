import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateSidebar } from './generate-sidebar.mjs'
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
