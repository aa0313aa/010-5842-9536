// posts.json을 기반으로 rss.xml을 자동 생성하는 Node.js 스크립트
const fs = require('fs');
const siteUrl = 'https://pay24.store/';
const posts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));

function toRfc822(dateStr) {
  // YYYY-MM-DD → RFC822
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T09:00:00+09:00');
  return d.toUTCString().replace('GMT', '+0900');
}

const items = posts.map(post => `    <item>\n      <title>${post.title}</title>\n      <link>${siteUrl}${post.url}</link>\n      <description><![CDATA[${post.description}]]></description>\n      <pubDate>${toRfc822(post.date)}</pubDate>\n      <guid isPermaLink=\"true\">${siteUrl}${post.url}</guid>\n    </item>`).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>오렌지Pay 블로그</title>\n    <link>${siteUrl}</link>\n    <atom:link href="${siteUrl}rss.xml" rel="self" type="application/rss+xml" />\n    <description>오렌지Pay 공식 블로그 - 신용카드 현금화, 소액결제, 후기, 안전한 현금화 정보 제공</description>\n    <language>ko</language>\n    <lastBuildDate>${toRfc822(posts[0]?.date)}</lastBuildDate>\n    <generator>오렌지Pay RSS Generator</generator>\n${items}\n  </channel>\n</rss>\n`;

fs.writeFileSync('rss.xml', rss, 'utf8');
console.log('rss.xml 생성 완료');
