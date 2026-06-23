import test from 'node:test'
import assert from 'node:assert/strict'
import { hasSidebarFalseFrontmatter } from './generate-sidebar.mjs'

test('LF 行尾的 sidebar:false frontmatter 被识别为隐藏', () => {
  const content = '---\nsidebar: false\n---\n正文内容'
  assert.equal(hasSidebarFalseFrontmatter(content), true)
})

test('CRLF 行尾的 sidebar:false frontmatter 被识别为隐藏', () => {
  const content = '---\r\nsidebar: false\r\n---\r\n正文内容'
  assert.equal(hasSidebarFalseFrontmatter(content), true)
})

test('sidebar:true 不视为隐藏', () => {
  const content = '---\nsidebar: true\n---\n正文'
  assert.equal(hasSidebarFalseFrontmatter(content), false)
})

test('无 frontmatter 不视为隐藏', () => {
  const content = '# 标题\n\n正文'
  assert.equal(hasSidebarFalseFrontmatter(content), false)
})
