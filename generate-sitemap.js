// generate-sitemap.js
// posts.json을 읽어 sitemap.xml을 생성합니다.
const fs = require('fs');
const path = require('path');

const siteUrl = 'https://pay24.store/';
const postsPath = path.join(__dirname, 'posts.json');
const outPath = path.join(__dirname, 'sitemap.xml');

function normalizeLoc(loc) {
  if (!loc) return '';
  // if loc already absolute, return as-is
  if (/^https?:\/\//i.test(loc)) return loc;
  // ensure no leading slash duplication
  return siteUrl.replace(/\/$/, '') + '/' + loc.replace(/^\//, '');
}

function formatDate(d) {
  if (!d) return '';
  // Accept YYYY-MM-DD or ISO strings; return YYYY-MM-DD
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toISOString().slice(0,10);
  } catch(e) { return ''; }
}

let posts = [];
try {
  posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
  if (!Array.isArray(posts)) posts = [];
} catch (err) {
  console.error('posts.json을 읽는 동안 오류가 발생했습니다:', err.message);
  process.exitCode = 1;
}

// dedupe by url
const seen = new Set();
const entries = [];
for (const p of posts) {
  const rawUrl = p && p.url ? String(p.url).trim() : '';
  if (!rawUrl) continue;
  if (seen.has(rawUrl)) continue;
  seen.add(rawUrl);
  entries.push({ loc: normalizeLoc(rawUrl), lastmod: formatDate(p.date), changefreq: 'monthly', priority: '0.8' });
}

// static pages
const latest = entries[0]?.lastmod || formatDate(new Date().toISOString().slice(0,10));
const staticPages = [
  { loc: normalizeLoc('/'), lastmod: latest, changefreq: 'daily', priority: '1.0' },
  { loc: normalizeLoc('/news/'), lastmod: latest, changefreq: 'hourly', priority: '0.8' },
  { loc: normalizeLoc('/blog/'), lastmod: latest, changefreq: 'weekly', priority: '0.7' },
  { loc: normalizeLoc('/about.html'), changefreq: 'yearly', priority: '0.3' },
  { loc: normalizeLoc('/contact.html'), changefreq: 'yearly', priority: '0.4' },
  { loc: normalizeLoc('/terms.html'), changefreq: 'yearly', priority: '0.3' },
  { loc: normalizeLoc('/privacy.html'), changefreq: 'yearly', priority: '0.3' },
  { loc: normalizeLoc('/visamastercard/virtualvisa-prepaid.html'), lastmod: formatDate('2025-09-10'), changefreq: 'monthly', priority: '0.9' }
];

// build xml
function urlToXml(u) {
  let xml = '  <url>\n    <loc>' + u.loc + '</loc>\n';
  if (u.lastmod) xml += '    <lastmod>' + u.lastmod + '</lastmod>\n';
  if (u.changefreq) xml += '    <changefreq>' + u.changefreq + '</changefreq>\n';
  if (u.priority) xml += '    <priority>' + u.priority + '</priority>\n';
  xml += '  </url>';
  return xml;
}

const allUrls = [].concat(staticPages, entries);

const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  allUrls.map(urlToXml).join('\n') + '\n</urlset>\n';

try {
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('sitemap.xml 생성 완료:', outPath);
} catch (err) {
  console.error('sitemap.xml을 쓸 수 없습니다:', err.message);
  process.exitCode = 1;
}
