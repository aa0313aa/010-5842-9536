#!/usr/bin/env node
/**
 * scripts/retrofit-news-template.js
 * 기존 blog/*-news-*.html 페이지를 새 뉴스 브리핑 템플릿으로 재생성합니다.
 * 데이터 소스: posts.json + 기존 페이지의 JSON-LD/출처 링크 파싱
 * 옵션: --dry-run, --limit N
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const POSTS = path.join(ROOT, 'posts.json');
const SITE_URL = 'https://pay24.store/';
const DEFAULT_OG = '/img/og-image.jpg';

function loadJson(file, fallback){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(e){ return fallback; } }
function saveJson(file, data){ fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function htmlEscape(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function cut(str, max=160){ const s=String(str||'').trim(); return s.length<=max?s:s.slice(0,max-1).trim()+"…"; }
function ymd(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function toAbs(rel){ return SITE_URL.replace(/\/$/, '') + '/' + String(rel||'').replace(/^\//,''); }
function splitIntoParas(text){
  const t = String(text||'').trim();
  if (!t) return [];
  let sentences = t.replace(/\s+/g,' ').split(/(?<=[\.\?\!])\s+|(?<=다\.)\s+/);
  sentences = sentences.filter(s=>s && s.trim());
  if (sentences.length <= 2) return [t];
  const paras = [];
  let cur = '';
  for (const s of sentences){
    if ((cur + ' ' + s).length > 260) { paras.push(cur.trim()); cur = s; }
    else cur = cur ? (cur + ' ' + s) : s;
  }
  if (cur.trim()) paras.push(cur.trim());
  return paras.slice(0, 4);
}

function buildHtml({ title, description, fileName, relUrl, pubIso, sourceName, sourceUrl, category='뉴스', tags=[], ogImg=DEFAULT_OG }){
  const absUrl = toAbs(relUrl);
  const lede = cut(description, 160);
  const paras = splitIntoParas(description);
  const tagsHtml = (tags && tags.length) ? `
    <div class="mt-6 flex flex-wrap gap-2 text-sm">
      ${tags.slice(0,6).map(t=>`<span class="px-2 py-1 rounded bg-slate-100 text-slate-600">#${htmlEscape(t)}</span>`).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(cut(description, 160))}">
  <link rel="canonical" href="${absUrl}">
  <meta name="article:section" content="${htmlEscape(category)}">
  ${tags && tags.length ? `<meta name="keywords" content="${htmlEscape(tags.join(', '))}">` : ''}
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(cut(description, 200))}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${absUrl}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:image:width" content="1198">
  <meta property="og:image:height" content="406">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="robots" content="index, follow">
  <link rel="stylesheet" href="../css/tailwind.min.css">
  <link rel="manifest" href="/site.webmanifest">

  <script type="application/ld+json">
  ${JSON.stringify({
    "@context":"https://schema.org",
    "@type":"NewsArticle",
    "headline": title,
    "description": cut(description, 200),
    "image": toAbs(ogImg),
    "datePublished": pubIso,
    "dateModified": pubIso,
    "author": {"@type":"Organization","name":"오렌지Pay","url": SITE_URL},
    "publisher": {"@type":"Organization","name":"오렌지Pay","logo":{"@type":"ImageObject","url": toAbs('img/logo.png')}} ,
    "mainEntityOfPage": {"@type":"WebPage","@id": absUrl},
    "isBasedOn": sourceUrl || undefined,
    "citation": sourceUrl || undefined,
    "keywords": tags
  })}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context":"https://schema.org",
    "@type":"Organization",
    "name":"오렌지Pay",
    "url": SITE_URL,
    "contactPoint":[{"@type":"ContactPoint","telephone":"+82-10-5842-9536","contactType":"customer service","areaServed":"KR","availableLanguage":["ko"]}]
  })}
  </script>
</head>
<body class="bg-gray-50 text-gray-900">
  <header class="bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <a href="/" class="flex items-center gap-2">
          <span class="text-2xl font-extrabold text-slate-800 tracking-tight">오렌지Pay</span>
        </a>
        <nav class="hidden md:flex items-center gap-6 text-slate-700">
          <a href="/" class="hover:text-orange-600 transition-colors">홈</a>
          <a href="/news/" class="hover:text-orange-600 transition-colors">뉴스</a>
          <a href="/blog/" class="hover:text-orange-600 transition-colors">블로그</a>
          <a href="/contact.html" class="hover:text-orange-600 transition-colors">고객센터</a>
        </nav>
      </div>
    </div>
  </header>
  <div class="mx-auto max-w-[1400px] px-2 sm:px-4 lg:px-6 py-6">
    <div class="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_220px] gap-4">
      <aside class="hidden xl:block">
        <div class="sticky top-24">
          <div class="h-[600px] rounded-lg border bg-slate-50 text-slate-400 flex items-center justify-center text-sm">광고 영역</div>
        </div>
      </aside>
      <main class="mx-auto w-full max-w-[820px] bg-white p-6 md:p-8 mt-4 rounded-xl shadow-lg">
        <a href="/news/" class="inline-block mb-6 px-4 py-2 bg-orange-500 text-white rounded-md font-bold shadow hover:bg-orange-600 transition">← 뉴스 목록으로 돌아가기</a>
        <article>
          <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-3">${htmlEscape(title)}</h1>
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-6">
            <span class="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700">${htmlEscape(category||'뉴스')}</span>
            <span>${ymd(new Date(pubIso))}</span>
            ${sourceUrl ? `<span>·</span><a class="underline text-orange-700" href="${htmlEscape(sourceUrl)}" rel="nofollow noopener" target="_blank">${htmlEscape(sourceName||'출처')}</a>` : ''}
          </div>
          <p class="text-lg text-gray-800 leading-relaxed mb-6">${htmlEscape(lede)}</p>
          <section class="prose prose-lg max-w-none">
            ${paras.map(p=>`<p>${htmlEscape(p)}</p>`).join('\n')}
          </section>
          ${tagsHtml}
          ${sourceUrl ? `
          <div class="mt-8 p-4 rounded-md bg-slate-50 text-sm text-slate-600">
            이 페이지는 원문 기사를 바탕으로 핵심 내용을 간략히 정리한 뉴스 브리핑입니다. 자세한 내용은 출처를 참고하세요.
            <div class="mt-3">
              <a href="${htmlEscape(sourceUrl)}" rel="nofollow noopener" target="_blank" class="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-600 text-white hover:bg-orange-700">원문 기사 보기</a>
            </div>
          </div>` : ''}
        </article>
      </main>
      <aside class="hidden xl:block">
        <div class="sticky top-24">
          <div class="h-[600px] rounded-lg border bg-slate-50 text-slate-400 flex items-center justify-center text-sm">광고 영역</div>
        </div>
      </aside>
    </div>
  </div>
  <footer class="bg-slate-900 text-slate-400 mt-16">
    <div class="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8 py-10 text-center">
      <div class="mb-4">
        <a href="/terms.html" class="text-sm hover:text-white mx-2 transition-colors">이용약관</a>
        <span class="text-slate-600">|</span>
        <a href="/privacy.html" class="text-sm hover:text-white mx-2 transition-colors">개인정보처리방침</a>
      </div>
      <p class="text-sm">&copy; <span id="current-year"></span> 오렌지Pay. All Rights Reserved.</p>
      <p class="text-xs mt-2 text-slate-500">본 사이트는 합법적인 금융 정보 제공을 목적으로 하며, 불법적인 '카드깡' 등 여신전문금융업법 위반 행위를 중개하거나 권유하지 않습니다. 모든 서비스는 관련 법령 및 약관을 준수하여 안전하게 진행됩니다.</p>
    </div>
  </footer>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      var yearSpan = document.getElementById('current-year');
      if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    });
  </script>
</body>
</html>`;
}

function guessSourceFromHtml(html){
  try {
    const $ = cheerio.load(html);
    // 1) JSON-LD NewsArticle
    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts){
      try {
        const json = JSON.parse($(el).contents().text());
        const obj = Array.isArray(json) ? json.find(x=>x && x['@type']==='NewsArticle') : json;
        if (obj && obj['@type']==='NewsArticle'){
          const url = obj.isBasedOn || obj.citation || null;
          if (url) return { sourceUrl: String(url), sourceName: null };
        }
      } catch(_){}
    }
    // 2) 출처: <a ...> 형태
    const srcBlock = $('a[rel*="nofollow"][target="_blank"]').filter((i,el)=>/원문|기사|보기/.test($(el).text()));
    if (srcBlock.length){
      const href = $(srcBlock[0]).attr('href');
      const name = $(srcBlock[0]).text().trim();
      return { sourceUrl: href || null, sourceName: name || null };
    }
    // 3) 아무것도 없으면 null
    return { sourceUrl: null, sourceName: null };
  } catch(e){
    return { sourceUrl: null, sourceName: null };
  }
}

async function main(){
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const limIdx = argv.indexOf('--limit');
  const limit = (limIdx !== -1 && argv[limIdx+1]) ? parseInt(argv[limIdx+1],10) : null;

  const posts = loadJson(POSTS, []);
  const targets = posts
    .map((p, idx)=>({ idx, p }))
    .filter(({p})=> p && typeof p.url === 'string' && /^blog\/\d{4}-\d{2}-\d{2}-news-.*\.html$/.test(p.url))
    .filter(({p})=> fs.existsSync(path.join(ROOT, p.url)));

  const pick = limit ? targets.slice(0, Math.max(0, limit)) : targets;
  if (!pick.length){
    console.log('No news pages to retrofit.');
    return;
  }

  let changed = 0;
  for (const { idx, p } of pick){
    const filePath = path.join(ROOT, p.url);
    const oldHtml = fs.readFileSync(filePath, 'utf8');
    const { sourceUrl, sourceName } = guessSourceFromHtml(oldHtml);

    const title = p.title || (cheerio.load(oldHtml)('title').text() || '뉴스');
    const description = p.description || title;
    const ogImg = p.ogImage || p.image || DEFAULT_OG;
    const category = p.category || '뉴스';
    const tags = Array.isArray(p.tags) ? p.tags : [];
    // Use posts.json date if present, else derive from filename
    let pubIso = (p.date ? `${p.date}T09:00:00+09:00` : null);
    if (!pubIso){
      const m = path.basename(p.url).match(/^(\d{4}-\d{2}-\d{2})-/);
      if (m) pubIso = `${m[1]}T09:00:00+09:00`; else pubIso = new Date().toISOString();
    }

    const relUrl = p.url;
    const fileName = path.basename(relUrl);
    const newHtml = buildHtml({ title, description, fileName, relUrl, pubIso, sourceName, sourceUrl, category, tags, ogImg });

    if (dryRun){
      console.log(`[DRY] ${fileName} -> will retrofit (src=${sourceUrl ? 'yes' : 'no'})`);
      continue;
    }

    fs.writeFileSync(filePath, newHtml, 'utf8');
    changed++;
    console.log(`[ok] retrofitted ${fileName}`);
  }

  if (!dryRun) console.log(`Done. Retrofitted ${changed} files.`);
}

main().catch(err=>{ console.error('retrofit-news-template failed:', err); process.exit(1); });
