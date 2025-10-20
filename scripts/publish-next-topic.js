#!/usr/bin/env node
/**
 * scripts/publish-next-topic.js
 * - topics.json에서 맨 앞 토픽을 꺼내 오늘 날짜로 신규 포스트를 생성/게시
 * - 블로그 HTML 생성(Article/FAQ/Breadcrumb JSON-LD, 메타/OG)
 * - posts.json 갱신(선두 추가)
 * - topics.json에서 게시한 토픽 제거
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const POSTS = path.join(ROOT, 'posts.json');
const TOPICS = path.join(ROOT, 'topics.json');
const SITE_URL = 'https://pay24.store/';
const BUSINESS = {
  name: '오렌지Pay',
  phoneDisplay: '010-5842-9536',
  phoneIntl: '+82-10-5842-9536',
  kakaoLink: '/contact.html#kakao'
};

function ymd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function toAbs(rel){ return SITE_URL.replace(/\/$/, '') + '/' + rel.replace(/^\//, ''); }

function loadJson(file, fallback){
  try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(e){ return fallback; }
}
function saveJson(file, data){ fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }

function htmlEscape(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildHtml({title, description, slug, keywords, sections=[], faqs=[], image='/img/og-image.jpg'}){
  const today = ymd();
  const fileName = `${today}-${slug}.html`;
  const relUrl = `blog/${fileName}`;
  const absUrl = toAbs(relUrl);
  const ogImg = image || '/img/og-image.jpg';

  const faqJson = faqs.map(f => ({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}));
  const breadcrumb = [
    {"@type":"ListItem","position":1,"name":"홈","item":toAbs('')},
    {"@type":"ListItem","position":2,"name":"블로그","item":toAbs('blog/')},
    {"@type":"ListItem","position":3,"name":title, "item":absUrl}
  ];

  const sectionHtml = sections.map(s => `
      <section id="${htmlEscape(s.id)}" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">${htmlEscape(s.title)}</h2>
        ${(s.paragraphs||[]).map(p => `<p>${p}</p>`).join('\n')}
        ${(s.list && s.list.length)? `<ul class="list-disc pl-6">${s.list.map(li=>`<li>${li}</li>`).join('')}</ul>`:''}
      </section>`).join('\n');

  const contactHtml = `
      <section id="contact" class="mb-8 p-6 rounded-lg border border-orange-200 bg-orange-50">
        <h2 class="text-2xl font-bold text-orange-700 mb-3">빠르게 상담 받기</h2>
        <p class="text-gray-800 mb-3"><strong>${htmlEscape(BUSINESS.name)}</strong> · 전화: <a class="underline" href="tel:${htmlEscape(BUSINESS.phoneDisplay)}">${htmlEscape(BUSINESS.phoneDisplay)}</a></p>
        <p class="text-gray-700 mb-4">카카오톡 상담 및 기타 연락처는 고객센터 페이지에서 확인하세요.</p>
        <div class="flex flex-wrap gap-3">
          <a href="tel:${htmlEscape(BUSINESS.phoneDisplay)}" class="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700">전화하기</a>
          <a href="${htmlEscape(BUSINESS.kakaoLink)}" class="inline-flex items-center px-4 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600">카카오톡 상담</a>
          <a href="/contact.html" class="inline-flex items-center px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-900">고객센터</a>
        </div>
      </section>`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(description)}">
  ${keywords?`<meta name="keywords" content="${htmlEscape(keywords.join(', '))}">`:''}
  <link rel="canonical" href="${absUrl}">
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(description)}">
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
    "@type":"Article",
    "headline":title,
    "description":description,
    "image":toAbs(ogImg),
    "datePublished":today,
    "dateModified":today,
    "author":{"@type":"Organization","name":"오렌지Pay","url":SITE_URL},
    "publisher":{"@type":"Organization","name":"오렌지Pay","logo":{"@type":"ImageObject","url":toAbs('img/logo.png')}} ,
    "mainEntityOfPage":{"@type":"WebPage","@id":absUrl}
  })}
  </script>
  ${faqs.length?`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqJson})}</script>`:''}
  <script type="application/ld+json">
  ${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":breadcrumb})}
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
  <header class="bg-orange-500 text-white py-4">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between">
        <a href="/" class="text-2xl font-bold">오렌지Pay</a>
        <nav class="hidden md:flex space-x-6">
          <a href="/" class="hover:text-orange-200">홈</a>
          <a href="/blog/" class="hover:text-orange-200">블로그</a>
          <a href="/contact.html" class="hover:text-orange-200">고객센터</a>
        </nav>
      </div>
    </div>
  </header>
  <main class="container mx-auto px-4 py-8 max-w-4xl">
    <article class="bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-6">${htmlEscape(title)}</h1>
      <div class="text-gray-600 mb-8"><i class="fas fa-calendar-alt mr-2"></i>${today} <span class="mx-4">|</span><i class="fas fa-user mr-2"></i>오렌지Pay</div>
      ${sectionHtml}
      ${contactHtml}
      <section id="related" class="mb-4">
        <h2 class="text-xl font-semibold mb-2">함께 보면 좋아요</h2>
        <ul class="list-disc pl-5 text-orange-700">
          <li><a class="underline" href="/blog/2025-10-15-emergency-card-cash-guide.html">비상금 카드현금화 2025 가이드</a></li>
          <li><a class="underline" href="/blog/2025-10-17-creditcard-installment-cash-guide.html">신용카드 무이자 할부로 현금 마련 2025</a></li>
          <li><a class="underline" href="/blog/2025-10-06-creditcard-cash-guide.html">신용카드 현금화 종합 가이드</a></li>
        </ul>
      </section>
    </article>
  </main>
  <footer class="text-center text-slate-500 text-sm my-8">
    <a class="hover:text-orange-500" href="/blog/">← 블로그로 돌아가기</a>
  </footer>
</body>
</html>`;

  return { fileName, relUrl, absUrl, html };
}

function main(){
  ensureDir(BLOG);
  const topics = loadJson(TOPICS, []);
  if (!Array.isArray(topics) || topics.length === 0) {
    console.log('No topics to publish.');
    process.exit(0);
  }
  const topic = topics.shift(); // dequeue
  const {title, description, slug, keywords, sections, faqs, image} = topic;
  if (!slug || !title) {
    console.error('Topic missing slug/title');
    process.exit(0);
  }

  const built = buildHtml({title, description, slug, keywords, sections, faqs, image});
  const outPath = path.join(BLOG, built.fileName);
  fs.writeFileSync(outPath, built.html, 'utf8');

  // update posts.json
  const posts = loadJson(POSTS, []);
  posts.unshift({
    title,
    date: ymd(),
    description: description || title,
    url: built.relUrl,
    image: image || '/img/og-image.jpg',
    imageWidth: 1198,
    imageHeight: 406,
    ogImage: '/img/og-image-og.webp'
  });
  saveJson(POSTS, posts);

  // save trimmed topics
  saveJson(TOPICS, topics);

  console.log('Published from topic:', built.relUrl);
}

main();
