// Robust posts.json generator
// - Scans blog/*.html
// - Prefers embedded <script id="post-meta"> JSON if present
// - Falls back to meta tags (og:title/description/article:section/keywords, og:image)
// - Uses filename date (YYYY-MM-DD-*) when available to ensure correct ordering

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const blogDir = path.join(__dirname, 'blog');
const outPath = path.join(__dirname, 'posts.json');

function getDateFromFilename(name){
  const m = String(name).match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : '';
}

function pick($, sel, attr){
  try { const el = $(sel).first(); return attr ? (el.attr(attr) || '') : (el.text() || ''); } catch { return ''; }
}

function buildFromHtml(filename, html){
  // Try post-meta JSON first
  const metaMatch = html.match(/<script[^>]*id=["']post-meta["'][^>]*>([\s\S]*?)<\/script>/i);
  let meta = {};
  if (metaMatch) {
    try { meta = JSON.parse(metaMatch[1]); } catch {}
  }

  const $ = cheerio.load(html);
  const title = meta.title || pick($, 'meta[property="og:title"]', 'content') || pick($,'title') || filename.replace('.html','');
  const description = meta.description || pick($, 'meta[name="description"]', 'content') || title;
  const category = meta.category || pick($, 'meta[name="article:section"]', 'content') || '뉴스';
  const ogImage = meta.ogImage || pick($, 'meta[property="og:image"]', 'content') || '/img/og-image-og.webp';
  const kw = meta.tags ? meta.tags.join(',') : pick($, 'meta[name="keywords"]', 'content');
  const tags = kw ? kw.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const date = meta.date || getDateFromFilename(filename) || pick($, 'meta[property="article:published_time"]', 'content').slice(0,10);

  return {
    title,
    date: date || '',
    description,
    url: `blog/${filename}`,
    image: '/img/og-image.jpg',
    imageWidth: 1198,
    imageHeight: 406,
    ogImage,
    ...(tags.length ? { tags } : {}),
    category,
    draft: Boolean(meta.draft)
  };
}

const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

const posts = files
  .filter(filename => filename !== 'post-template.html' && filename !== 'post-template-template.html' && filename !== 'index.html')
  .map(filename => {
    const filePath = path.join(blogDir, filename);
    const html = fs.readFileSync(filePath, 'utf8');
    return buildFromHtml(filename, html);
  })
  .filter(post => post.title && post.date && post.description && !post.draft)
  .sort((a, b) => b.date.localeCompare(a.date))
  .map(({draft, ...rest}) => rest);

fs.writeFileSync(outPath, JSON.stringify(posts, null, 2), 'utf8');
console.log('posts.json 생성 완료: 총', posts.length, '개');
