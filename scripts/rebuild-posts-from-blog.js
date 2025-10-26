#!/usr/bin/env node
/**
 * Rebuild posts.json by scanning blog/*.html
 * - Extracts title/description/category/tags/og:image from meta tags
 * - Uses date from filename prefix (YYYY-MM-DD) to ensure ordering reflects publish date on site
 * - Keeps a consistent shape with existing posts.json
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const OUT = path.join(ROOT, 'posts.json');

function readHtml(file){
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function pick($, sel, attr){
  try {
    const el = $(sel).first();
    return attr ? (el.attr(attr) || '') : (el.text() || '');
  } catch { return ''; }
}

function getDateFromFilename(name){
  const m = String(name).match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : '';
}

function fileExists(p){
  try { return fs.existsSync(p); } catch { return false; }
}

function buildPostFromFile(filename){
  const filePath = path.join(BLOG, filename);
  const html = readHtml(filePath);
  const $ = cheerio.load(html);

  const title = pick($, 'meta[property="og:title"]', 'content') || pick($,'title');
  const description = pick($, 'meta[name="description"]', 'content');
  const ogImage = pick($, 'meta[property="og:image"]', 'content');
  const category = pick($, 'meta[name="article:section"]', 'content');
  const kw = pick($, 'meta[name="keywords"]', 'content');
  const tags = kw ? kw.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const date = getDateFromFilename(filename) || pick($, 'meta[property="article:published_time"]', 'content').slice(0,10);
  const base = path.basename(filename, path.extname(filename));
  const aiRel = '/img/ai/' + base + '.webp';
  const aiAbs = path.join(ROOT, aiRel.replace(/^\//,''));
  const aiImage = fileExists(aiAbs) ? aiRel : undefined;

  return {
    title: title || base,
    date: date || '',
    description: description || title || base,
    url: 'blog/' + filename,
    image: '/img/og-image.jpg',
    imageWidth: 1198,
    imageHeight: 406,
    ogImage: ogImage || '/img/og-image-og.webp',
    ...(aiImage ? { aiImage } : {}),
    category: category || '뉴스',
    ...(tags.length ? { tags } : {})
  };
}

function main(){
  const files = fs.readdirSync(BLOG)
    .filter(f => f.endsWith('.html'))
    .filter(f => f !== 'post-template.html' && f !== 'post-template-template.html' && f !== 'index.html');

  const posts = files.map(buildPostFromFile)
    .filter(p => p.title && p.date && p.description)
    .sort((a,b) => b.date.localeCompare(a.date));

  fs.writeFileSync(OUT, JSON.stringify(posts, null, 2), 'utf8');
  console.log('posts.json 재생성 완료. 총 항목:', posts.length);
}

if (require.main === module){
  try { main(); } catch(e){ console.error('rebuild failed:', e); process.exit(1); }
}
