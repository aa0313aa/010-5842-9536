const fs = require('fs');
const path = require('path');

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch(e) { return null; }
}

function reportIssue(reports, file, msg) {
  if (!reports[file]) reports[file] = [];
  reports[file].push(msg);
}

function hasTag(content, regex) {
  return regex.test(content);
}

const files = [
  'index.html',
  'blog/index.html',
  'blog/post-template-template.html'
];

const reports = {};
for (const f of files) {
  const p = path.join(__dirname, '..', f);
  const c = read(p);
  if (!c) { reportIssue(reports, f, '파일을 찾을 수 없습니다'); continue; }
  // title
  if (!hasTag(c, /<title>.*?<\/title>/i)) reportIssue(reports, f, 'title 태그가 없습니다');
  // description
  if (!hasTag(c, /<meta[^>]+name=["']description["'][^>]*>/i)) reportIssue(reports, f, 'meta description이 없습니다');
  // canonical
  if (!hasTag(c, /<link[^>]+rel=["']canonical["'][^>]*>/i)) reportIssue(reports, f, 'canonical 링크가 없습니다');
  // og:image
  if (!hasTag(c, /<meta[^>]+property=["']og:image["'][^>]*>/i)) reportIssue(reports, f, 'og:image이 없습니다');
  // twitter card
  if (!hasTag(c, /<meta[^>]+name=["']twitter:card["'][^>]*>/i)) reportIssue(reports, f, 'twitter:card가 없습니다');
  // JSON-LD publisher/logo
  if (!hasTag(c, /application\/ld\+json/i) || !/logo/.test(c)) reportIssue(reports, f, 'JSON-LD 또는 publisher logo 선언이 없습니다');
}

// posts.json image meta check
const postsPath = path.join(__dirname, '..', 'posts.json');
let posts = [];
try { posts = JSON.parse(fs.readFileSync(postsPath, 'utf8')); } catch(e) { reports['posts.json'] = ['posts.json을 읽을 수 없음']; }

let fixed = false;
if (Array.isArray(posts)) {
  posts.forEach((p, idx) => {
    if (!p.image) { reportIssue(reports, `posts.json[${idx}]`, 'image 필드가 없습니다'); }
    if (!p.imageWidth || !p.imageHeight) {
      // attempt to infer common OG size fallback
      p.imageWidth = p.imageWidth || 1200;
      p.imageHeight = p.imageHeight || 630;
      fixed = true;
      reportIssue(reports, `posts.json[${idx}]`, `imageWidth/imageHeight가 없어서 기본값을 채웠습니다: ${p.imageWidth}x${p.imageHeight}`);
    }
    // normalize url (ensure blog/ prefix)
    if (p.url && !p.url.startsWith('blog/') && !p.url.startsWith('/')) {
      p.url = 'blog/' + p.url;
      fixed = true;
      reportIssue(reports, `posts.json[${idx}]`, `url 경로를 정규화: ${p.url}`);
    }
  });
}

if (fixed) fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2), 'utf8');

// write report
const out = { generatedAt: new Date().toISOString(), reports };
fs.writeFileSync(path.join(__dirname, '..', 'seo-report.json'), JSON.stringify(out, null, 2), 'utf8');
console.log('SEO 검사 완료 — seo-report.json 생성됨');
if (fixed) console.log('posts.json에 변경사항이 적용되었습니다.');
