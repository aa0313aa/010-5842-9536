#!/usr/bin/env node
/**
 * 일괄 편집기: 기존 블로그 글에 연락처 블록과 Organization JSON-LD를 삽입
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');
const BUSINESS = {
  name: '오렌지Pay',
  phoneDisplay: '010-5842-9536',
  phoneIntl: '+82-10-5842-9536',
  kakaoLink: '/contact.html#kakao'
};

function ensureContactBlock(html){
  if (html.includes('id="contact"') || html.includes('카카오톡 상담')) return html; // 이미 있음
  const contactHtml = `\n      <section id="contact" class="mb-8 p-6 rounded-lg border border-orange-200 bg-orange-50">\n        <h2 class="text-2xl font-bold text-orange-700 mb-3">빠르게 상담 받기</h2>\n        <p class="text-gray-800 mb-3"><strong>${BUSINESS.name}</strong> · 전화: <a class="underline" href="tel:${BUSINESS.phoneDisplay}">${BUSINESS.phoneDisplay}</a></p>\n        <p class="text-gray-700 mb-4">카카오톡 상담 및 기타 연락처는 고객센터 페이지에서 확인하세요.</p>\n        <div class="flex flex-wrap gap-3">\n          <a href="tel:${BUSINESS.phoneDisplay}" class="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700">전화하기</a>\n          <a href="${BUSINESS.kakaoLink}" class="inline-flex items-center px-4 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600">카카오톡 상담</a>\n          <a href="/contact.html" class="inline-flex items-center px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-900">고객센터</a>\n        </div>\n      </section>`;
  // related 섹션 앞에 삽입
  return html.replace(/(<section id="related"[\s\S]*?)/, contactHtml + '\n$1');
}

function ensureOrgJsonLd(html){
  if (html.includes('"@type":"Organization"') && html.includes('contactPoint')) return html;
  const orgJson = {
    "@context":"https://schema.org",
    "@type":"Organization",
    "name": BUSINESS.name,
    "url": 'https://pay24.store/',
    "contactPoint":[{
      "@type":"ContactPoint",
      "telephone": BUSINESS.phoneIntl,
      "contactType":"customer service",
      "areaServed":"KR",
      "availableLanguage":["ko"]
    }]
  };
  const block = `\n  <script type="application/ld+json">\n  ${JSON.stringify(orgJson)}\n  </script>`;
  // </head> 직전에 삽입
  return html.replace(/<\/head>/i, block + '\n</head>');
}

function run(){
  const files = fs.readdirSync(BLOG).filter(f => f.endsWith('.html'));
  let updated = 0;
  files.forEach(file => {
    const p = path.join(BLOG, file);
    let html = fs.readFileSync(p, 'utf8');
    const before = html;
    html = ensureContactBlock(html);
    html = ensureOrgJsonLd(html);
    if (html !== before){
      fs.writeFileSync(p, html, 'utf8');
      updated++;
      console.log('updated', file);
    }
  });
  console.log('done. updated files:', updated);
}

run();
