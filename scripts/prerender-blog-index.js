#!/usr/bin/env node
/**
 * scripts/prerender-blog-index.js
 * - posts.json 상위 N개를 blog/index.html의 <ul id="blog-list"> 내부에 정적 LI로 주입
 * - JS가 동작하지 않아도 최소 목록이 보이도록 SSR 유사 스켈레톤 제공
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS = path.join(ROOT, 'posts.json');
const BLOG_INDEX = path.join(ROOT, 'blog', 'index.html');

function htmlEscape(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function loadPosts(){
  try {
    const arr = JSON.parse(fs.readFileSync(POSTS,'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch(e){ return []; }
}

function buildItems(posts, limit=5){
  const list = posts
    .slice()
    .sort((a,b)=> (b.date||'').localeCompare(a.date||''))
    .slice(0, limit);

  const defaultThumb = '/img/og-image.jpg';
  return list.map(p => {
    const url = '/' + String(p.url || 'blog').replace(/^\//,'');
    const title = htmlEscape(p.title || '제목 없음');
    const date = htmlEscape(p.date || '');
    const descRaw = String(p.description || '');
    const desc = htmlEscape(descRaw.length > 160 ? descRaw.slice(0,157) + '...' : descRaw);
    const img = htmlEscape(p.image || defaultThumb);
    return `
        <li class="py-6 px-6">
          <a href="${url}" class="block hover:bg-orange-50 rounded-lg transition p-2" aria-label="${title}">
            <div class="flex gap-4 items-start">
              <img src="${img}" alt="${title} 썸네일" class="w-24 h-16 object-cover rounded-md" loading="lazy" decoding="async" />
              <div class="flex-1">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 class="text-xl font-semibold text-orange-600">${title}</h3>
                  <time class="text-sm text-gray-500" datetime="${date}">${date}</time>
                </div>
                <p class="text-gray-600 mt-2">${desc}</p>
              </div>
            </div>
          </a>
        </li>`;
  }).join('\n');
}

function inject(html, items){
  const markerRe = /(<ul\s+id="blog-list"[\s\S]*?>)([\s\S]*?)(<\/ul>)/i;
  if (!markerRe.test(html)) return html; // 안전하게 그냥 통과
  const block = `\n        <!-- prerender:start -->\n${items}\n        <!-- prerender:end -->\n      `;
  return html.replace(markerRe, `$1${block}$3`);
}

function ensureBlogJsonLdCanonical(html){
  // blog/index.html 내부 JSON-LD에 url이 /blog/index.html 로 된 경우 /blog/ 로 정규화
  return html
    .replace(/"https:\/\/pay24\.store\/blog\/index\.html"/g, '"https://pay24.store/blog/"')
    .replace(/"https:\/\/pay24\.store\/blog\/index\.html"/g, '"https://pay24.store/blog/"')
    .replace(/"item":\s*"https:\/\/pay24\.store\/blog\/index\.html"/g, '"item":"https://pay24.store/blog/index.html"');
}

function main(){
  const posts = loadPosts();
  if (!posts.length) return;
  const items = buildItems(posts, 5);
  let html = fs.readFileSync(BLOG_INDEX,'utf8');
  html = inject(html, items);
  html = ensureBlogJsonLdCanonical(html);
  fs.writeFileSync(BLOG_INDEX, html, 'utf8');
  console.log('blog/index.html prerendered with', Math.min(posts.length,5), 'items');
}

main();
