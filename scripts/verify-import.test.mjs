import test from 'node:test'
import assert from 'node:assert/strict'
import { findSourceHtmlLinks } from './verify-import.mjs'

test('findSourceHtmlLinks ignores external https URLs ending in .html', () => {
  // Government whitepaper references cited in a bibliography must not be
  // mistaken for source EPUB links.
  const content = '数据来源：https://www5.cao.go.jp/keizai3/whitepaper2.html#keizai_a\n'
  assert.deepEqual(findSourceHtmlLinks(content), [])
})

test('findSourceHtmlLinks ignores external http URLs ending in .html', () => {
  const content = '参见 http://example.gov/report/index.html 更多说明。\n'
  assert.deepEqual(findSourceHtmlLinks(content), [])
})

test('findSourceHtmlLinks flags relative EPUB source .html links and filepos', () => {
  const content = '详见 text00001.html#filepos123\n'
  const hits = findSourceHtmlLinks(content)
  assert.ok(hits.includes('source .html link'), JSON.stringify(hits))
  assert.ok(hits.includes('filepos'), JSON.stringify(hits))
})

test('findSourceHtmlLinks flags a bare filepos anchor without .html', () => {
  const content = '锚点 #filepos456 在此。\n'
  assert.ok(findSourceHtmlLinks(content).includes('filepos'))
})

test('findSourceHtmlLinks flags a relative .html link alongside external URLs', () => {
  // A genuine source link must still be caught even when the same chapter
  // also references external .html URLs.
  const content =
    '外部：https://www.meti.go.jp/report/whitepaper/index.html\n' +
    '内部残留：see part2.html\n'
  assert.ok(findSourceHtmlLinks(content).includes('source .html link'))
})
