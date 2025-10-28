// generate-news-sitemap.js
// 최근 48시간 이내 뉴스 포스트만 포함하는 Google News 전용 sitemap (news.xml)
const fs = require('fs');
const path = require('path');

const siteUrl = 'https://pay24.store/';
const postsPath = path.join(__dirname, 'posts.json');
const outPath = path.join(__dirname, 'news.xml');

function toAbs(loc){
  if (!loc) return '';
  if (/^https?:\/\//i.test(loc)) return loc;
  return siteUrl.replace(/\/$/, '') + '/' + String(loc).replace(/^\//,'');
}
function ymd(dt){ try { return new Date(dt).toISOString().slice(0,10); } catch { return ''; } }

let posts = [];
try {
  posts = JSON.parse(fs.readFileSync(postsPath,'utf8'));
  if (!Array.isArray(posts)) posts = [];
} catch(e){
  console.error('posts.json read error:', e.message);
  process.exit(1);
}

const now = Date.now();
const cutoff = now - 48*60*60*1000; // 48시간

// 뉴스만: category !== '블로그' 또는 URL에 'news-' 포함
const newsPosts = posts.filter(p => {
  const isNews = (p.category && p.category !== '블로그') || /\bnews-/i.test(String(p.url||''));
  if (!isNews) return false;
  const d = new Date(p.date || Date.now());
  return !isNaN(d) && d.getTime() >= cutoff;
}).slice(0,100);

const publication = {
  name: '오렌지Pay 뉴스',
  language: 'ko'
};

const urlItems = newsPosts.map(p => `  <url>
    <loc>${toAbs(p.url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${publication.name}</news:name>
        <news:language>${publication.language}</news:language>
      </news:publication>
      <news:publication_date>${ymd(p.date||new Date())}</news:publication_date>
      <news:title>${(p.title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</news:title>
    </news:news>
  </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlItems}\n</urlset>\n`;

try {
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log('news.xml 생성 완료:', outPath);
} catch (e){
  console.error('news.xml write error:', e.message);
  process.exit(1);
}
