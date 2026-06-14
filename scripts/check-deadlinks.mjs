#!/usr/bin/env node
/**
 * check-deadlinks.mjs — 全站内部死链扫描器。
 *
 * Usage:
 *   node scripts/check-deadlinks.mjs                # 扫描全站，有死链退出码 1
 *   node scripts/check-deadlinks.mjs --json         # 仅输出 JSON 报告
 *   node scripts/check-deadlinks.mjs --help
 *
 * 只检查内部链接（不联网检查外部 http(s) 链接）：
 *   1. Markdown 链接 [text](./xxx.md) / [text](./xxx) / [text](/books/slug/xxx)
 *   2. 图片引用 ![](./xxx.png)
 *
 * 外部链接、纯锚点 #xxx、邮件/电话等非文件链接一律跳过，
 * 原因：避免 CI 因外部站点波动误报，且外部链接非本项目可控范围。
 *
 * 退出码：0 = 全部通过，1 = 发现死链。
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const DOCS_DIR = join(ROOT, 'docs');

function parseArgs(argv) {
  const args = { json: false, help: false };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

if (parseArgs(process.argv.slice(2)).help) {
  console.log([
    '用法：node scripts/check-deadlinks.mjs [--json]',
    '',
    '扫描 docs/ 下所有 Markdown 的内部链接与图片引用是否指向真实存在的文件。',
    '外部 http(s) 链接不联网检查；纯锚点 #xxx 跳过。',
    '退出码：0 = 全部通过，1 = 发现死链。',
  ].join('\n'));
  process.exit(0);
}

/**
 * 递归收集目录下所有 .md 文件。
 */
function collectMarkdownFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 从 markdown 中抽取所有链接目标（含图片），返回 [{target, line, isImage}]。
 * 通过逐行正则匹配保证 line 准确。
 */
function extractLinkTargets(content) {
  const out = [];
  const lines = content.split('\n');
  // 链接/图片语法：![alt](target) 或 [text](target)；忽略代码块/反引号内
  const linkRe = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (let i = 0; i < lines.length; i += 1) {
    let m;
    linkRe.lastIndex = 0;
    const line = lines[i];
    // 跳过代码块行（```、~~~、缩进 4 格的代码）和行内代码段
    if (/^\s*(```|~~~)/.test(line)) continue;
    while ((m = linkRe.exec(line)) !== null) {
      out.push({
        target: m[3],
        isImage: m[1] === '!',
        line: i + 1,
      });
    }
  }
  return out;
}

/**
 * 判断是否需要跳过该 target。
 * 跳过：外部 http(s)、协议链接 mailto/tel、纯锚点 #、data: URI、空白。
 */
function shouldSkip(target) {
  if (!target) return true;
  // markdown 允许 [text](<url>) 形式，剥掉尖括号再判断协议
  const stripped = target.trim().replace(/^<(.+)>$/, '$1').trim();
  if (!stripped) return true;
  if (/^(https?:|mailto:|tel:|ftp:|data:|javascript:)/i.test(stripped)) return true;
  if (stripped.startsWith('#')) return true; // 纯锚点
  // 启发式：含正则量词字符的不可能是文件路径（避免正则表达式被误识别为链接）
  if (/[*+?{}|]/.test(stripped)) return true;
  return false;
}

/**
 * 把链接 target 解析为 docs 目录下的绝对文件路径（用于存在性校验）。
 * 处理 cleanUrls 下的两种形态：
 *   - ./xxx.md / ../yyy/xxx.md / xxx.md
 *   - /books/slug/01-标题（cleanUrls，无 .md）
 * 返回 {path, strippedAnchor}，path 为应存在的文件绝对路径（含 .md）。
 */
function resolveTarget(fromFile, target, docsDir) {
  let t = target.trim();
  let anchor = '';
  const hashIdx = t.indexOf('#');
  if (hashIdx >= 0) {
    anchor = t.slice(hashIdx + 1);
    t = t.slice(0, hashIdx);
  }
  let base;
  if (t.startsWith('/')) {
    // 站内绝对路径：以 docs 为根
    base = join(docsDir, t.replace(/^\//, ''));
  } else {
    base = resolve(dirname(fromFile), t);
  }
  // 补 .md 后缀（cleanUrls 下链接通常不带后缀）
  const candidates = [];
  if (extname(base)) {
    candidates.push(base);
  } else {
    candidates.push(`${base}.md`);
    candidates.push(join(base, 'index.md'));
    // 图片可能无后缀的情况少，但也兜底尝试常见后缀
    for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']) {
      candidates.push(`${base}${ext}`);
    }
  }
  return { candidates, anchor };
}

function scan(options = {}) {
  const docsDir = options.docsDir || DOCS_DIR;
  const root = options.root || ROOT;
  if (!existsSync(docsDir)) {
    return { files: 0, dead: [], error: 'docs/ 目录不存在' };
  }
  const mdFiles = collectMarkdownFiles(docsDir);
  const dead = [];
  for (const file of mdFiles) {
    const content = readFileSync(file, 'utf-8');
    const targets = extractLinkTargets(content);
    for (const item of targets) {
      if (shouldSkip(item.target)) continue;
      const { candidates } = resolveTarget(file, item.target, docsDir);
      const ok = candidates.some(p => existsSync(p));
      if (!ok) {
        dead.push({
          file: relative(root, file),
          line: item.line,
          target: item.target,
          kind: item.isImage ? 'image' : 'link',
          candidates: candidates.map(c => relative(root, c)),
        });
      }
    }
  }
  return { files: mdFiles.length, dead };
}

const args = parseArgs(process.argv.slice(2));
const result = scan();
const report = {
  scannedFiles: result.files,
  deadLinkCount: result.dead.length,
  dead: result.dead,
  ...(result.error ? { error: result.error } : {}),
};

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  if (result.error) {
    console.error(`✗ ${result.error}`);
    process.exit(1);
  }
  console.log(`扫描完成：${result.files} 个 Markdown 文件，${result.dead.length} 处死链。`);
  if (result.dead.length > 0) {
    console.log('');
    // 按文件分组打印
    const byFile = new Map();
    for (const d of result.dead) {
      if (!byFile.has(d.file)) byFile.set(d.file, []);
      byFile.get(d.file).push(d);
    }
    for (const [file, items] of byFile) {
      console.log(`▼ ${file}`);
      for (const it of items) {
        const tag = it.kind === 'image' ? '[图片]' : '[链接]';
        console.log(`  ${it.line.toString().padStart(4)}行  ${tag}  ${it.target}`);
      }
      console.log('');
    }
    console.log(`共 ${result.dead.length} 处死链分布在 ${byFile.size} 个文件中。`);
  } else {
    console.log('✓ 未发现内部死链。');
  }
}

if (result.dead.length > 0) process.exit(1);

export { scan, extractLinkTargets, shouldSkip };
