import test from 'node:test'
import assert from 'node:assert/strict'
import {
  statusOf,
  trimByLRU,
  mergeProgress,
  READ_THRESHOLD,
  START_THRESHOLD,
  MAX_ENTRIES,
  STORAGE_KEY,
} from '../docs/.vitepress/theme/readingProgressCore.mjs'

// ===== statusOf 阈值判定 =====

test('statusOf returns unread for null progress', () => {
  assert.equal(statusOf(null), 'unread')
})

test('statusOf returns read when maxScrollRatio >= READ_THRESHOLD', () => {
  assert.equal(statusOf({ scrollRatio: 0.9, maxScrollRatio: 0.9, updatedAt: 0 }), 'read')
  // 恰好等于阈值也算已读
  assert.equal(
    statusOf({ scrollRatio: READ_THRESHOLD, maxScrollRatio: READ_THRESHOLD, updatedAt: 0 }),
    'read',
  )
})

test('statusOf returns unread when maxScrollRatio < START_THRESHOLD', () => {
  assert.equal(statusOf({ scrollRatio: 0.1, maxScrollRatio: 0.1, updatedAt: 0 }), 'unread')
  assert.equal(
    statusOf({ scrollRatio: 0.14, maxScrollRatio: 0.14, updatedAt: 0 }),
    'unread',
  )
})

test('statusOf returns reading for middle ratios', () => {
  assert.equal(statusOf({ scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 0 }), 'reading')
  assert.equal(statusOf({ scrollRatio: 0.2, maxScrollRatio: 0.2, updatedAt: 0 }), 'reading')
  assert.equal(statusOf({ scrollRatio: 0.84, maxScrollRatio: 0.84, updatedAt: 0 }), 'reading')
})

test('statusOf uses maxScrollRatio (not current scrollRatio)', () => {
  // 曾经读到 90%（已读），即使现在滚回顶部仍是已读
  assert.equal(
    statusOf({ scrollRatio: 0.05, maxScrollRatio: 0.9, updatedAt: 0 }),
    'read',
  )
})

test('statusOf boundary: exactly START_THRESHOLD counts as reading', () => {
  assert.equal(
    statusOf({ scrollRatio: START_THRESHOLD, maxScrollRatio: START_THRESHOLD, updatedAt: 0 }),
    'reading',
  )
})

// ===== mergeProgress =====

test('mergeProgress creates new record when prev is null', () => {
  const result = mergeProgress(null, 0.3)
  assert.equal(result.scrollRatio, 0.3)
  assert.equal(result.maxScrollRatio, 0.3)
  assert.equal(typeof result.updatedAt, 'number')
})

test('mergeProgress keeps the larger maxScrollRatio', () => {
  const prev = { scrollRatio: 0.8, maxScrollRatio: 0.8, updatedAt: 1000 }
  const result = mergeProgress(prev, 0.2) // 滚回去了
  assert.equal(result.scrollRatio, 0.2)
  assert.equal(result.maxScrollRatio, 0.8) // 保留历史最大
})

test('mergeProgress updates maxScrollRatio when scrolling further', () => {
  const prev = { scrollRatio: 0.3, maxScrollRatio: 0.3, updatedAt: 1000 }
  const result = mergeProgress(prev, 0.6)
  assert.equal(result.scrollRatio, 0.6)
  assert.equal(result.maxScrollRatio, 0.6)
})

// ===== trimByLRU =====

test('trimByLRU returns input unchanged when within limit', () => {
  const map = {
    '/a': { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 1 },
    '/b': { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 2 },
  }
  assert.equal(trimByLRU(map, 5), map)
})

test('trimByLRU evicts oldest entries beyond the limit', () => {
  const map = {
    '/old': { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 1 },
    '/mid': { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 2 },
    '/new': { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 3 },
  }
  const trimmed = trimByLRU(map, 2)
  assert.deepEqual(Object.keys(trimmed).sort(), ['/mid', '/new'])
})

test('trimByLRU default limit is MAX_ENTRIES', () => {
  // 构造 MAX_ENTRIES + 5 条
  const map = {}
  for (let i = 0; i < MAX_ENTRIES + 5; i += 1) {
    map[`/ch${i}`] = { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: i }
  }
  const trimmed = trimByLRU(map)
  assert.equal(Object.keys(trimmed).length, MAX_ENTRIES)
  // 最旧的 5 条被淘汰
  assert.equal(trimmed['/ch0'], undefined)
  assert.equal(trimmed['/ch4'], undefined)
  assert.ok(trimmed['/ch5'])
})

test('trimByLRU does not mutate the original map', () => {
  const map = {
    '/old': { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 1 },
    '/new': { scrollRatio: 0.5, maxScrollRatio: 0.5, updatedAt: 2 },
  }
  const trimmed = trimByLRU(map, 1)
  assert.ok(map['/old']) // 原对象未变
  assert.ok(trimmed['/new']) // 返回的是新对象
  assert.notEqual(trimmed, map)
})

// ===== 常量导出 =====

test('exported constants have expected values', () => {
  assert.equal(READ_THRESHOLD, 0.85)
  assert.equal(START_THRESHOLD, 0.15)
  assert.equal(MAX_ENTRIES, 200)
  assert.equal(STORAGE_KEY, 'craftx:reading-progress')
})
