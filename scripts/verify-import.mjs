#!/usr/bin/env node
/**
 * verify-import.mjs — Post-import verification for a book slug.
 *
 * Usage:
 *   node scripts/verify-import.mjs <slug>
 *
 * Checks every requirement from the Book Import Quality Contract and outputs
 * a JSON report with pass/fail per check. Exit code 0 = all passed, 1 = any failed.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const BOOKS_DIR = join(ROOT, 'docs', 'books');

function fail(check, detail) {
  return { check, status: 'fail', detail };
}

function pass(check) {
  return { check, status: 'pass' };
}

/**
 * Recursively collect all .md files in a directory.
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
 * Extract markdown links [text](target) from content.
 */
function extractLinks(content) {
  const re = /\[(?:[^\]]*)\]\(([^)]+)\)/g;
  const links = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    links.push(m[1]);
  }
  return links;
}

/**
 * Extract image references ![alt](src) from content.
 */
function extractImages(content) {
  const re = /!\[(?:[^\]]*)\]\(([^)]+)\)/g;
  const images = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    images.push(m[1]);
  }
  return images;
}

/**
 * Check for residual placeholders and EPUB source links.
 */
function findResiduals(content, filePath) {
  const patterns = [
    { re: /\[图片：[^\]]*\]/g, label: '[图片：...]' },
    { re: /\[缺失资源：[^\]]*\]/g, label: '[缺失资源：...]' },
    { re: /缺失资源/g, label: '缺失资源' },
    { re: /图片未找到/g, label: '图片未找到' },
    { re: /text\d+\.html/g, label: 'text*.html' },
    { re: /filepos/g, label: 'filepos' },
  ];
  const hits = [];
  for (const { re, label } of patterns) {
    if (re.test(content)) {
      hits.push(label);
    }
  }
  return hits;
}

/**
 * Parse YAML-ish frontmatter to extract aside value.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const asideMatch = yaml.match(/aside:\s*(true|false)/);
  return {
    aside: asideMatch ? asideMatch[1] === 'true' : undefined,
  };
}

function verify(slug) {
  const results = [];
  const bookDir = join(BOOKS_DIR, slug);

  // 1. Book directory exists
  if (!existsSync(bookDir)) {
    results.push(fail('book directory exists', `${bookDir} not found`));
    return results;
  }
  results.push(pass('book directory exists'));

  // 2. index.md exists
  const indexPath = join(bookDir, 'index.md');
  if (!existsSync(indexPath)) {
    results.push(fail('index.md exists', `${indexPath} not found`));
    return results;
  }
  results.push(pass('index.md exists'));

  // 3. Chapter files exist and are numbered
  const chapterFiles = readdirSync(bookDir)
    .filter(f => /^\d{2,}-.+\.md$/.test(f))
    .sort();
  if (chapterFiles.length === 0) {
    results.push(fail('chapter files exist', 'No numbered .md files found'));
  } else {
    results.push(pass('chapter files exist'));
  }

  // 4. index.md links to all chapters
  const indexContent = readFileSync(indexPath, 'utf-8');
  const indexLinks = extractLinks(indexContent);
  const chapterBasenames = new Set(chapterFiles.map(f => f.replace(/\.md$/, '')));
  const linkedChapters = new Set();
  for (const link of indexLinks) {
    // Normalize: ./01-Foo.md -> 01-Foo, /books/slug/01-Foo -> 01-Foo, etc.
    const normalized = link
      .replace(/^\.\//, '')
      .replace(/\.md$/, '')
      .replace(/^\/books\/[^/]+\//, '');
    if (chapterBasenames.has(normalized)) {
      linkedChapters.add(normalized);
    }
  }
  const unlinked = [...chapterBasenames].filter(c => !linkedChapters.has(c));
  if (unlinked.length > 0) {
    results.push(fail('index.md links to all chapters', `Missing links: ${unlinked.join(', ')}`));
  } else {
    results.push(pass('index.md links to all chapters'));
  }

  // 5. books.json contains this slug
  const booksPath = join(ROOT, 'books.json');
  let books = [];
  try {
    books = JSON.parse(readFileSync(booksPath, 'utf-8'));
  } catch (e) {
    results.push(fail('books.json readable', e.message));
    return results;
  }
  const bookEntry = books.find(b => b.slug === slug);
  if (!bookEntry) {
    results.push(fail('books.json contains slug', `${slug} not found in books.json`));
  } else {
    results.push(pass('books.json contains slug'));
    // 5b. Category is valid
    if (bookEntry.category !== 'booklet' && bookEntry.category !== 'ebook') {
      results.push(fail('books.json category valid', `Invalid category: ${bookEntry.category}`));
    } else {
      results.push(pass('books.json category valid'));
    }
  }

  // 6. sidebar-generated.json contains this slug
  const sidebarPath = join(ROOT, 'sidebar-generated.json');
  let sidebar = {};
  try {
    sidebar = JSON.parse(readFileSync(sidebarPath, 'utf-8'));
  } catch (e) {
    results.push(fail('sidebar-generated.json readable', e.message));
    return results;
  }
  const sidebarKey = `/books/${slug}/`;
  const sidebarEntry = sidebar[sidebarKey];
  if (!sidebarEntry) {
    results.push(fail('sidebar contains slug', `${sidebarKey} not found`));
  } else {
    results.push(pass('sidebar contains slug'));
    // 6b. All sidebar links resolve to real files
    const sidebarItems = sidebarEntry.flatMap(section => section.items || []);
    const brokenLinks = [];
    for (const item of sidebarItems) {
      const link = item.link;
      if (!link) continue;
      // Convert VitePress link back to file path
      const relPath = link.replace(`/books/${slug}/`, '').replace(/^\//, '');
      const mdFile = join(bookDir, `${relPath}.md`);
      if (!existsSync(mdFile)) {
        brokenLinks.push(`${link} -> ${mdFile}`);
      }
    }
    if (brokenLinks.length > 0) {
      results.push(fail('sidebar links resolve', `Broken: ${brokenLinks.join('; ')}`));
    } else {
      results.push(pass('sidebar links resolve'));
    }
  }

  // 7. README.md contains this slug
  const readmePath = join(ROOT, 'README.md');
  if (existsSync(readmePath)) {
    const readmeContent = readFileSync(readmePath, 'utf-8');
    if (readmeContent.includes(slug)) {
      results.push(pass('README.md contains slug'));
    } else {
      results.push(fail('README.md contains slug', `${slug} not found in README.md`));
    }
  } else {
    results.push(fail('README.md exists', 'README.md not found'));
  }

  // 8. No residual placeholders or EPUB source links
  const allMdFiles = collectMarkdownFiles(bookDir);
  const residualFiles = [];
  for (const file of allMdFiles) {
    const content = readFileSync(file, 'utf-8');
    const hits = findResiduals(content, file);
    if (hits.length > 0) {
      const rel = relative(ROOT, file);
      residualFiles.push(`${rel}: ${hits.join(', ')}`);
    }
  }
  if (residualFiles.length > 0) {
    results.push(fail('no residual placeholders', residualFiles.join('\n')));
  } else {
    results.push(pass('no residual placeholders'));
  }

  // 9. All image references resolve to existing files
  const brokenImages = [];
  for (const file of allMdFiles) {
    const content = readFileSync(file, 'utf-8');
    const images = extractImages(content);
    const fileDir = dirname(file);
    for (const img of images) {
      // Skip external URLs
      if (img.startsWith('http://') || img.startsWith('https://')) continue;
      const imgPath = resolve(fileDir, img);
      if (!existsSync(imgPath)) {
        const rel = relative(ROOT, file);
        brokenImages.push(`${rel}: ${img}`);
      }
    }
  }
  if (brokenImages.length > 0) {
    results.push(fail('all images resolve', brokenImages.join('\n')));
  } else {
    results.push(pass('all images resolve'));
  }

  // 10. No source .html links remaining
  const htmlLinkFiles = [];
  for (const file of allMdFiles) {
    const content = readFileSync(file, 'utf-8');
    if (/\.html(?:#|$|\s)/.test(content) || /filepos/.test(content)) {
      const rel = relative(ROOT, file);
      htmlLinkFiles.push(rel);
    }
  }
  if (htmlLinkFiles.length > 0) {
    results.push(fail('no source HTML links', htmlLinkFiles.join(', ')));
  } else {
    results.push(pass('no source HTML links'));
  }

  // 11. Chapter pages: aside not set to false (index.md is allowed)
  const asideViolations = [];
  for (const file of allMdFiles) {
    if (file === indexPath) continue; // index.md is exempt
    const content = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(content);
    if (fm.aside === false) {
      const rel = relative(ROOT, file);
      asideViolations.push(rel);
    }
  }
  if (asideViolations.length > 0) {
    results.push(fail('chapters aside not false', asideViolations.join(', ')));
  } else {
    results.push(pass('chapters aside not false'));
  }

  // 12. Build passes
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    results.push(pass('npm run build passes'));
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString().slice(0, 500) : '';
    results.push(fail('npm run build passes', stderr));
  }

  return results;
}

// --- CLI ---

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/verify-import.mjs <slug>');
  process.exit(2);
}

const results = verify(slug);
const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;

const report = {
  slug,
  passed,
  failed,
  results,
};

console.log(JSON.stringify(report, null, 2));

if (failed > 0) {
  process.exit(1);
}
