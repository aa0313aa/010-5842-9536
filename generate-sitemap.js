// posts.json을 기반으로 sitemap.xml을 자동 생성하는 Node.js 스크립트
const fs = require('fs');
const siteUrl = 'https://pay24.store/';
const posts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));

const staticUrls = [
  { loc: siteUrl, changefreq: 'daily', priority: '1.0', lastmod: posts[0]?.date || '' },
  { loc: siteUrl + 'terms', changefreq: 'yearly', priority: '0.3' },
  { loc: siteUrl + 'privacy', changefreq: 'yearly', priority: '0.3' }
];

const postUrls = posts.map(post => `  <url>\n    <loc>${siteUrl}${post.url}</loc>\n    <lastmod>${post.date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`).join('\n');

const staticXml = staticUrls.map(u => {
  let xml = `  <url>\n    <loc>${u.loc}</loc>\n`;
  if (u.lastmod) xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
  xml += `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
  return xml;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticXml}\n${postUrls}\n</urlset>\n`;

fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
console.log('sitemap.xml 생성 완료');
