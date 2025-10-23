#!/usr/bin/env node
/**
 * scripts/publish-news.js
 * - news-sources.json의 RSS를 조회하여 최신 미게시 뉴스를 1건 포스팅
 * - NewsArticle JSON-LD 포함, 원문 링크/출처 명시, 요약만 싣고 전체 복제 금지
 * - posts.json 선두 추가
 */
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const POSTS = path.join(ROOT, 'posts.json');
const SOURCES_FILE = path.join(ROOT, 'news-sources.json');
const LOG_FILE = path.join(ROOT, 'news-log.json');
const SITE_URL = 'https://pay24.store/';
const DEFAULT_OG = '/img/og-image.jpg';
const BUSINESS = {
  name: '오렌지Pay',
  phoneDisplay: '010-5842-9536',
  phoneIntl: '+82-10-5842-9536',
  kakaoLink: 'https://pf.kakao.com/_SBFexb/chat'
};

function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function ymd(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function toAbs(rel){ return SITE_URL.replace(/\/$/, '') + '/' + rel.replace(/^\//, ''); }
function htmlEscape(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function loadJson(file, fallback){ try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(e){ return fallback; } }
function saveJson(file, data){ fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function stripHtml(html){
  if (!html) return '';
  try {
    const $ = cheerio.load(String(html));
    return $('body').text().replace(/\s+/g,' ').trim();
  } catch(e){
    return String(html).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  }
}
function cut(str, max=280){
  const s = String(str||'').trim();
  if (s.length <= max) return s;
  return s.slice(0, max-1).trim() + '…';
}
function slugify(title){
  const base = String(title||'news').toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g,'')
    .replace(/\s+/g,'-')
    .replace(/-+/g,'-')
    .slice(0, 60)
    .replace(/^-+|-+$/g,'');
  return base || 'news';
}

async function fetchCandidates(){
  const parser = new Parser({ timeout: 15000 });
  const sources = loadJson(SOURCES_FILE, []);
  const log = loadJson(LOG_FILE, []);
  const seen = new Set(log.map(e => e.id || e.link));
  const now = Date.now();
  const sevenDays = 1000*60*60*24*7; // 7일
  const items = [];
  for (const src of sources){
    const { name, feed } = src;
    if (!feed) continue;
    try {
      const res = await parser.parseURL(feed);
      for (const it of res.items || []){
        const id = it.guid || it.id || it.link;
        if (!id || seen.has(id)) continue;
        const iso = it.isoDate || it.pubDate || it.published || null;
        const ts = iso ? Date.parse(iso) : NaN;
  // 최근 7일 이내만 우선 수집 (너무 오래된 것은 제외)
  if (!isNaN(ts) && (now - ts) > sevenDays) continue;
        const rawText = it.contentSnippet || it.content || it['content:encoded'] || '';
        const text = stripHtml(rawText);
        items.push({
          source: name || (res.title || 'RSS'),
          id, link: it.link, title: it.title || '(제목 없음)', isoDate: iso || new Date().toISOString(),
          summary: cut(text, 500)
        });
      }
    } catch (e) {
      console.warn('RSS fetch failed:', name || feed, String(e.message||e));
    }
  }
  items.sort((a,b)=> Date.parse(b.isoDate) - Date.parse(a.isoDate));
  return items;
}

function buildHtml({title, description, slug, pubIso, sourceName, sourceUrl, image=DEFAULT_OG}){
  const today = ymd();
  const fileName = `${today}-news-${slug}.html`;
  const relUrl = `blog/${fileName}`;
  const absUrl = toAbs(relUrl);
  const ogImg = image || DEFAULT_OG;

  const contactHtml = `
      <section id="contact" class="mb-8 p-6 rounded-lg border border-orange-200 bg-orange-50">
        <h2 class="text-2xl font-bold text-orange-700 mb-3">빠르게 상담 받기</h2>
        <p class="text-gray-800 mb-2"><strong>${htmlEscape(BUSINESS.name)}</strong> · 전화: <a class="underline" href="tel:${htmlEscape(BUSINESS.phoneDisplay)}">${htmlEscape(BUSINESS.phoneDisplay)}</a></p>
        <p class="text-gray-800 mb-4">카카오톡 1:1 상담: <a class="underline text-orange-700" href="${htmlEscape(BUSINESS.kakaoLink)}" target="_blank" rel="noopener nofollow">채팅 열기</a></p>
        <ul class="list-disc pl-6 text-gray-700 mb-4">
          <li>안전한 업체 · 24시간 친절 상담</li>
          <li>비상금 카드 할부 상담 가능</li>
          <li>휴대폰 비상금(소액결제) 상담 가능</li>
          <li>합법·약관 준수, 개인정보 최소 수집</li>
        </ul>
        <div class="flex flex-wrap gap-3">
          <a href="tel:${htmlEscape(BUSINESS.phoneDisplay)}" class="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700">전화하기</a>
          <a href="${htmlEscape(BUSINESS.kakaoLink)}" class="inline-flex items-center px-4 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600" target="_blank" rel="noopener nofollow">카카오톡 상담</a>
          <a href="/contact.html" class="inline-flex items-center px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-900">고객센터</a>
        </div>
      </section>`;

  // 확장 섹션: 키포인트/영향/체크리스트/도움 제공
  const keypoints = `
      <section id="summary" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">요약 핵심 포인트</h2>
        <ul class="list-disc pl-6">
          <li>${htmlEscape(description.slice(0, 80))}…</li>
          <li>관련 정책·수수료·보안 이슈 확인 권장</li>
          <li>영향 범위: 카드/소액결제 이용자, 정산 일정, 환불 정책</li>
        </ul>
      </section>`;

  const impact = `
      <section id="impact" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">이 소식이 주는 영향</h2>
        <p>해당 뉴스는 카드 결제·소액결제 환경에 직간접적 영향을 줄 수 있습니다. 진행 전 <strong>총비용(수수료+부대비용)</strong>, <strong>정산 시간</strong>, <strong>환불/민원 절차</strong>를 재확인하고, 약관과 정책 변경 사항을 체크하세요.</p>
      </section>`;

  const checklist = `
      <section id="checklist" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">실전 체크리스트</h2>
        <ul class="list-disc pl-6">
          <li>견적 전 총 정산액/추가비용 유무 확인</li>
          <li>환불/민원 절차 및 기한 명시</li>
          <li>개인정보 최소 제공, 비정상 요구 거절</li>
          <li>증빙(영수증/내역) 보관 및 기록 관리</li>
        </ul>
      </section>`;

  const assistance = `
      <section id="assistance" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">오렌지Pay가 도와드리는 부분</h2>
        <p class="mb-3">오렌지Pay가 도와드리는 부분은 <strong>비상금 소액결제</strong>, <strong>비상금 카드현금화</strong> 입니다.</p>
        <ul class="list-disc pl-6">
          <li>안전한 업체 · 24시간 친절 상담</li>
          <li>비상금 카드 할부·휴대폰 비상금(소액결제) 상담 가능</li>
          <li>합법·약관 준수 진행, 개인정보 최소 수집</li>
          <li>수수료·정산 시간·증빙 관리까지 실전 가이드</li>
        </ul>
        <p class="mt-3">궁금한 점은 아래 연락처로 1:1 상담하세요.</p>
      </section>`;

  // 본문 확장: 사건 개요/쟁점/타임라인/데이터/전문가 코멘트/독자 안내 등 추가
  const details = `
      <section id="overview" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">사건 개요</h2>
        <p>${htmlEscape(cut(description, 500))}</p>
        <p class="text-gray-600 mt-2">본 요약은 원문 기사를 바탕으로 핵심만 정리했으며, 세부 내용과 맥락은 아래 원문 링크를 참고하세요.</p>
      </section>
      <section id="issues" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">핵심 쟁점</h2>
        <ul class="list-disc pl-6">
          <li>정책/규제 변화에 따른 이용자·업계 영향</li>
          <li>수수료·정산·환불 등 비용/절차 측면 이슈</li>
          <li>보안/사기 리스크와 예방 수칙</li>
        </ul>
      </section>
      <section id="timeline" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">타임라인</h2>
        <ol class="list-decimal pl-6">
          <li>${ymd(new Date(pubIso))}: 보도/공지</li>
          <li>향후: 후속 점검·제도 보완·유관기관 안내 예정</li>
        </ol>
      </section>
      <section id="data" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">데이터/지표</h2>
        <ul class="list-disc pl-6">
          <li>이용자 범주: 카드/소액결제/취약계층/소상공인 등</li>
          <li>영향 항목: 총비용(수수료+부대비용), 정산 시간, 환불/민원 절차</li>
          <li>주의 신호: 과도한 개인정보 요구·비정상 원격 제어·허위 과장 광고</li>
        </ul>
      </section>
      <section id="expert" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">전문가 코멘트(요약)</h2>
        <p>민생 관점에서 불확실성 구간에서는 <strong>조건 재확인</strong>과 <strong>증빙 관리</strong>가 중요합니다. 가이드라인이 제시될 때까지는 
        무리한 진행보다 <strong>사전 상담</strong>과 <strong>정책 준수</strong>를 권장합니다.</p>
      </section>
      <section id="reader" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">독자 안내</h2>
        <p>아래 원문에서 상세 근거와 수치를 확인하세요. 본 페이지는 핵심 요약과 이용자 관점의 체크리스트를 제공합니다.</p>
        <div class="mt-3">
          <a href="${htmlEscape(sourceUrl)}" rel="nofollow noopener" target="_blank" class="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700">원문 기사 보기</a>
        </div>
      </section>`;

  const heroFigure = `
      <figure class="mb-8">
        <img src="/img/og-image-800.webp" alt="금융/민생 관련 참고 이미지" class="w-full h-auto rounded-lg shadow" loading="lazy">
        <figcaption class="text-sm text-gray-500 mt-2">이미지는 기사 이해를 돕기 위한 참고용 일러스트입니다.</figcaption>
      </figure>`;

  const extraFigure = `
      <figure class="mb-8">
        <img src="/img/KakaoTalk_20250318_163831180-800.webp" alt="상담/안내 일러스트" class="w-full h-auto rounded-lg shadow" loading="lazy">
        <figcaption class="text-sm text-gray-500 mt-2">상담·안내를 상징하는 일러스트(참고 이미지).</figcaption>
      </figure>`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(cut(description, 160))}">
  <link rel="canonical" href="${absUrl}">
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
    "isBasedOn": sourceUrl,
    "citation": sourceUrl
  })}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context":"https://schema.org",
    "@type":"Organization",
    "name": BUSINESS.name,
    "url": SITE_URL,
    "contactPoint":[{
      "@type":"ContactPoint",
      "telephone": BUSINESS.phoneIntl,
      "contactType":"customer service",
      "areaServed":"KR",
      "availableLanguage":["ko"]
    }]
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
            <a href="/blog/" class="hover:text-orange-600 transition-colors">블로그</a>
            <a href="/contact.html" class="hover:text-orange-600 transition-colors">고객센터</a>
          </nav>
        </div>
      </div>
    </header>
      <main class="max-w-2xl mx-auto bg-white p-8 mt-10 rounded-xl shadow-lg">
        <a href="../index.html#blog" class="inline-block mb-6 px-4 py-2 bg-orange-500 text-white rounded-md font-bold shadow hover:bg-orange-600 transition">← 블로그 목록으로 돌아가기</a>
        <article class="">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-6">${htmlEscape(title)}</h1>
      <div class="text-gray-600 mb-6">${ymd(new Date(pubIso))} · 출처: <a class="underline text-orange-700" href="${htmlEscape(sourceUrl)}" rel="nofollow noopener" target="_blank">${htmlEscape(sourceName)}</a></div>
          ${heroFigure}
          <section class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">핵심 요약</h2>
        <p>${htmlEscape(description)}</p>
        <p class="mt-4 text-sm text-gray-500">본 페이지는 기사의 일부 요약과 링크만 제공합니다. 전체 내용은 원문을 참고하세요.</p>
        <div class="mt-5">
          <a href="${htmlEscape(sourceUrl)}" rel="nofollow noopener" target="_blank" class="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700">원문 기사 보기</a>
        </div>
          </section>
      ${keypoints}
      ${impact}
      ${checklist}
        ${details}
        ${extraFigure}
      ${assistance}
      ${contactHtml}
    </article>
  </main>
  <footer class="bg-slate-900 text-slate-400 mt-16">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
      <div class="mb-4">
        <a href="/terms.html" class="text-sm hover:text-white mx-2 transition-colors">이용약관</a>
        <span class="text-slate-600">|</span>
        <a href="/privacy.html" class="text-sm hover:text-white mx-2 transition-colors">개인정보처리방침</a>
      </div>
      <p class="text-sm">&copy; <span id="current-year"></span> 오렌지Pay. All Rights Reserved.</p>
      <p class="text-xs mt-2 text-slate-500">
        본 사이트는 합법적인 금융 정보 제공을 목적으로 하며, 불법적인 '카드깡' 등 여신전문금융업법 위반 행위를 중개하거나 권유하지 않습니다. 모든 서비스는 관련 법령 및 약관을 준수하여 안전하게 진행됩니다.
      </p>
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

  return { fileName, relUrl, absUrl, html };
}

async function main(){
  ensureDir(BLOG);
  const posts = loadJson(POSTS, []);
  const log = loadJson(LOG_FILE, []);
  let candidates = await fetchCandidates();
  // Optional filter by CLI arg or env
  const argv = process.argv.slice(2);
  let filter = process.env.NEWS_FILTER || '';
  const idx = argv.indexOf('--filter');
  if (idx !== -1 && argv[idx+1]) filter = argv[idx+1];
  if (filter) {
    const lower = filter.toLowerCase();
    candidates = candidates.filter(c => (c.title||'').toLowerCase().includes(lower) || (c.summary||'').toLowerCase().includes(lower));
  }
  if (!candidates.length){
    console.log('No new news within 7 days. Trying older items as fallback...');
    // fallback: 가장 최신 1건을 가져오기 위해 seen 무시하고 각 피드에서 1개씩 시도
    try {
      const parser = new Parser({ timeout: 15000 });
      const sources = loadJson(SOURCES_FILE, []);
      for (const src of sources){
        const res = await parser.parseURL(src.feed);
        if (res.items && res.items.length){
          const it = res.items[0];
          candidates = [{
            source: src.name || (res.title || 'RSS'),
            id: it.guid || it.id || it.link,
            link: it.link,
            title: it.title || '(제목 없음)',
            isoDate: it.isoDate || it.pubDate || new Date().toISOString(),
            summary: cut(stripHtml(it.contentSnippet || it.content || it['content:encoded'] || ''), 500)
          }];
          break;
        }
      }
    } catch(e){ /* ignore */ }
  }
  if (!candidates.length){
    console.log('No news available from sources.');
    return;
  }
  const picked = candidates[0];
  const slug = slugify(picked.title);
  const built = buildHtml({
    title: picked.title,
    description: picked.summary || picked.title,
    slug,
    pubIso: picked.isoDate,
    sourceName: picked.source,
    sourceUrl: picked.link,
    image: DEFAULT_OG
  });
  const outPath = path.join(BLOG, built.fileName);
  fs.writeFileSync(outPath, built.html, 'utf8');

  posts.unshift({
    title: picked.title,
    date: ymd(new Date(picked.isoDate)),
    description: picked.summary || picked.title,
    url: built.relUrl,
    image: DEFAULT_OG,
    imageWidth: 1198,
    imageHeight: 406,
    ogImage: '/img/og-image-og.webp'
  });
  saveJson(POSTS, posts);

  log.push({ id: picked.id || picked.link, link: picked.link, title: picked.title, date: picked.isoDate, page: built.relUrl });
  saveJson(LOG_FILE, log);

  console.log('Published news:', built.relUrl);
}

main().catch(err=>{ console.error('publish-news failed:', err); process.exit(1); });
