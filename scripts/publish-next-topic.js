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
  kakaoLink: 'https://pf.kakao.com/_SBFexb/chat'
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

  // 자동 확장 섹션 (길이·실용성 보강)
  const keypoints = (keywords && keywords.length) ? keywords.slice(0,3).map(k=>`<li>${htmlEscape(k)} 핵심 포인트 정리</li>`).join('') : '<li>수수료·시간·안전 체크</li><li>정책·약관 준수</li><li>증빙/기록 유지</li>';
  const extendedHtml = `
      <section id="summary" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">요약 핵심 포인트</h2>
        <p>본문의 주요 내용을 1분 만에 훑어볼 수 있도록 핵심만 정리했습니다.</p>
        <ul class="list-disc pl-6">${keypoints}</ul>
      </section>
      <section id="scenario" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">사례 시나리오</h2>
        <p>예: 30만원 규모로 진행하려는 사용자가 수수료·시간·안전을 균형 있게 고려하는 방법.</p>
        <ol class="list-decimal pl-6">
          <li>사전 준비: 본인확인 수단, 결제 가능 한도, 고객센터/약관 확인</li>
          <li>조건 확인: 총비용(수수료+부대비용), 정산 시간, 환불/민원 절차</li>
          <li>진행/정산: 증빙 확보(견적/영수증/대화 캡처), 기록 정리</li>
        </ol>
        <p class="text-gray-600">과장·불법 유도 문구, 원격제어/과다 개인정보 요구 등 위험 신호는 즉시 중단하세요.</p>
      </section>
      <section id="checklist" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">실전 체크리스트</h2>
        <ul class="list-disc pl-6">
          <li>견적 전 총 정산액/추가비용 유무 확인</li>
          <li>환불/민원 절차 및 기한 명시</li>
          <li>개인정보 최소 제공, 비정상 요구 거절</li>
          <li>증빙(영수증/내역) 보관 및 기록 관리</li>
        </ul>
      </section>`;

  const contactHtml = `
      <section id="contact" class="mb-8 p-6 rounded-lg border border-orange-200 bg-orange-50">
        <h2 class="text-2xl font-bold text-orange-700 mb-3">빠르게 상담 받기</h2>
        <p class="text-gray-800 mb-2"><strong>${htmlEscape(BUSINESS.name)}</strong> · 전화: <a class="underline" href="tel:${htmlEscape(BUSINESS.phoneDisplay)}">${htmlEscape(BUSINESS.phoneDisplay)}</a></p>
        <p class="text-gray-800 mb-3">오렌지Pay가 도와드리는 부분은 <strong>비상금 소액결제</strong>, <strong>비상금 카드현금화</strong> 입니다.</p>
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

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(description)}">
  ${keywords?`<meta name="keywords" content="${htmlEscape(keywords.join(', '))}">`:''}
  <meta name="article:section" content="블로그">
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
      <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-3">${htmlEscape(title)}</h1>
      <div class="flex items-center gap-3 text-gray-600 mb-2">
        <span class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">블로그 가이드</span>
        <span>${today}</span>
        <span class="text-slate-400">|</span>
        <span>오렌지Pay</span>
      </div>
      <p class="text-sm text-slate-500 mb-6">이 글은 <strong>뉴스 요약</strong>이 아닌, 이용자 안내를 위한 <strong>블로그 가이드</strong>입니다.</p>
  ${sectionHtml}
  ${extendedHtml}
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
    ogImage: '/img/og-image-og.webp',
    category: '블로그',
    tags: Array.isArray(keywords) ? keywords : []
  });
  saveJson(POSTS, posts);

  // save trimmed topics
  saveJson(TOPICS, topics);

  console.log('Published from topic:', built.relUrl);
}

main();
