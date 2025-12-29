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
let sharp = null; // lazy load for optional OG generation

const ROOT = path.join(__dirname, '..');
const { renderKeywordCTA, chooseCtaVariant } = require('./components');
const BLOG = path.join(ROOT, 'blog');
const POSTS = path.join(ROOT, 'posts.json');
const SOURCES_FILE = path.join(ROOT, 'news-sources.json');
const LOG_FILE = path.join(ROOT, 'news-log.json');
const SITE_URL = 'https://pay24.store/';
const DEFAULT_OG = '/img/og-image.jpg';
const OG_OUT_DIR = path.join(ROOT, 'img', 'og');
const AI_OUT_DIR = path.join(ROOT, 'img', 'ai');
const BUSINESS = {
  name: '오렌지Pay',
  phoneDisplay: '010-5842-9536',
  phoneIntl: '+82-10-5842-9536',
  kakaoLink: 'https://pf.kakao.com/_SBFexb/chat'
};

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function ymd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function toAbs(rel) { return SITE_URL.replace(/\/$/, '') + '/' + rel.replace(/^\//, ''); }
function htmlEscape(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function loadJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; } }
function saveJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function stripHtml(html) {
  if (!html) return '';
  try {
    const $ = cheerio.load(String(html));
    return $('body').text().replace(/\s+/g, ' ').trim();
  } catch (e) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
function cut(str, max = 280) {
  const s = String(str || '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trim() + '…';
}
function slugify(title) {
  const base = String(title || 'news').toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return base || 'news';
}

function svgEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 텍스트 기반 카테고리 추출 (뉴스 분류 보조)
function categorizeFromText(text) {
  const t = String(text || '').toLowerCase();
  const has = (kw) => t.includes(kw);
  if (has('민생') || has('물가') || has('서민') || has('취약') || has('지원')) return '민생';
  if (has('피싱') || has('스미싱') || has('보이스피싱') || has('사기') || has('카드깡')) return '사기';
  if (has('소액결제') || has('정보이용료') || has('휴대폰')) return '소액결제';
  if (has('신용카드') || has('카드사') || has('가맹점') || has('수수료') || has('카드 ')) return '신용카드';
  return '뉴스';
}

async function generateOgForPost({ baseName, title, category }) {
  // Create branded OG image from title/category as SVG → WEBP/JPG
  try {
    if (!sharp) sharp = require('sharp');
    ensureDir(OG_OUT_DIR);
    const outBase = path.join(OG_OUT_DIR, baseName);
    const outWebp = outBase + '-og.webp';
    const outJpg = outBase + '-og.jpg';
    // Skip if already exists
    if (fs.existsSync(outWebp) && fs.existsSync(outJpg)) {
      return { webp: '/img/og/' + baseName + '-og.webp', jpg: '/img/og/' + baseName + '-og.jpg' };
    }
    const bgGrad = `linear-gradient(135deg, #ffedd5, #fde68a)`;
    // SVG template
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffedd5"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect x="40" y="40" width="1120" height="550" rx="20" fill="white" opacity="0.82"/>
  <text x="60" y="120" fill="#f97316" font-size="36" font-weight="700">${svgEscape(category || '뉴스')}</text>
  <text x="60" y="180" fill="#0f172a" font-size="56" font-weight="800">
    <tspan>${svgEscape(String(title || '').slice(0, 30))}</tspan>
  </text>
  <text x="60" y="250" fill="#0f172a" font-size="42" font-weight="700">
    <tspan>${svgEscape(String(title || '').slice(30, 70))}</tspan>
  </text>
  <text x="60" y="310" fill="#334155" font-size="32" font-weight="600">
    <tspan>${svgEscape(String(title || '').slice(70, 120))}</tspan>
  </text>
  <text x="60" y="520" fill="#475569" font-size="28" font-weight="600">오렌지Pay</text>
  <text x="60" y="560" fill="#64748b" font-size="22">pay24.store</text>
</svg>`;
    const svgBuf = Buffer.from(svg);
    await sharp(svgBuf).resize(1200, 630).webp({ quality: 92 }).toFile(outWebp);
    await sharp(svgBuf).resize(1200, 630).jpeg({ quality: 88 }).toFile(outJpg);
    return { webp: '/img/og/' + baseName + '-og.webp', jpg: '/img/og/' + baseName + '-og.jpg' };
  } catch (e) {
    console.warn('Per-post OG 생성 스킵:', e && e.message ? e.message : e);
    return { webp: '/img/og-image-og.webp', jpg: '/img/og-image-og.jpg' };
  }
}

async function tryGenerateAIImage({ title, summary, category, baseName }) {
  // Optionally generate an AI thumbnail using OpenAI if OPENAI_API_KEY is present.
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    ensureDir(AI_OUT_DIR);
    const outWebp = path.join(AI_OUT_DIR, baseName + '.webp');
    if (fs.existsSync(outWebp)) return '/img/ai/' + baseName + '.webp';
    const prompt = `한국어: 다음 뉴스의 주제에 맞는 상징적이고 안전한 썸네일 이미지를 생성해주세요. 선정성, 얼굴 클로즈업, 로고/브랜드는 피하고, 간결한 일러스트/사진 스타일로.\n카테고리: ${category}\n제목: ${title}\n요약: ${summary || ''}`;
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x576', response_format: 'b64_json' })
    });
    if (!resp.ok) { console.warn('AI image gen failed:', resp.status); return null; }
    const data = await resp.json();
    const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) return null;
    const buf = Buffer.from(b64, 'base64');
    if (!sharp) sharp = require('sharp');
    await sharp(buf).resize(1200, 675, { fit: 'cover' }).webp({ quality: 86 }).toFile(outWebp);
    return '/img/ai/' + baseName + '.webp';
  } catch (e) {
    console.warn('AI 이미지 생성 스킵:', e && e.message ? e.message : e);
    return null;
  }
}

async function fetchCandidates(opts = {}) {
  const { filter = '', windowDaysOverride = null, seenIds = new Set() } = opts;
  const parser = new Parser({ timeout: 15000 });
  const sources = loadJson(SOURCES_FILE, []);
  const now = Date.now();
  // 기본 7일, 필터 지정 시 30일로 확대해서 하루 1건 보장을 높임
  const windowDays = windowDaysOverride || (filter ? 30 : 7);
  const windowMs = 1000 * 60 * 60 * 24 * windowDays;
  const items = [];
  for (const src of sources) {
    const { name, feed } = src;
    if (!feed) continue;
    try {
      const res = await parser.parseURL(feed);
      for (const it of res.items || []) {
        const id = it.guid || it.id || it.link;
        if (!id || seenIds.has(id)) continue;
        const iso = it.isoDate || it.pubDate || it.published || null;
        const ts = iso ? Date.parse(iso) : NaN;
        // 최근 windowDays 이내만 우선 수집 (너무 오래된 것은 제외)
        if (!isNaN(ts) && now - ts > windowMs) continue;
        const rawText = it.contentSnippet || it.content || it['content:encoded'] || '';
        const text = stripHtml(rawText);
        items.push({
          source: name || (res.title || 'RSS'),
          id,
          link: it.link,
          title: it.title || '(제목 없음)',
          isoDate: iso || new Date().toISOString(),
          summary: cut(text, 500)
        });
      }
    } catch (e) {
      console.warn('RSS fetch failed:', name || feed, String(e.message || e));
    }
  }
  items.sort((a, b) => Date.parse(b.isoDate) - Date.parse(a.isoDate));
  return items;
}

function buildHtml({ title, description, slug, pubIso, sourceName, sourceUrl, image = DEFAULT_OG, category = '뉴스', tags = [], perPostOgRel = null }) {
  const today = ymd();
  const fileName = `${today}-news-${slug}.html`;
  const relUrl = `blog/${fileName}`;
  const absUrl = toAbs(relUrl);
  const ogImg = perPostOgRel || image || DEFAULT_OG;
  const ctaVariant = chooseCtaVariant(slug || title || today);
  const keywordHtml = renderKeywordCTA({ category, phone: BUSINESS.phoneDisplay });

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

  // 본문 내 일러스트는 사용자 요청으로 비표시 처리 (OG 이미지만 유지)

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(cut(description, 160))}">
  <link rel="canonical" href="${absUrl}">
  <meta name="article:section" content="${htmlEscape(category)}">
  ${tags && tags.length ? `<meta name="keywords" content="${htmlEscape(tags.join(', '))}">` : ''}
  
  <!-- Open Graph -->
  <meta property="og:title" content="${htmlEscape(title)}">
  <meta property="og:description" content="${htmlEscape(cut(description, 200))}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${absUrl}">
  <meta property="og:image" content="${ogImg}">
  <meta property="og:image:width" content="1198">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="오렌지Pay">
  <meta property="og:locale" content="ko_KR">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${htmlEscape(title)}">
  <meta name="twitter:description" content="${htmlEscape(cut(description, 200))}">
  <meta name="twitter:image" content="${ogImg}">

  <!-- Geo Meta Tags (Seoul, Korea) -->
  <meta name="geo.region" content="KR-41">
  <meta name="geo.placename" content="Seoul">
  <meta name="geo.position" content="37.5665;126.9780">
  <meta name="ICBM" content="37.5665, 126.9780">
  
  <meta name="robots" content="index, follow">

  <!-- Performance: Static CSS & Preload -->
  <link rel="preload" href="../css/style.css" as="style">
  <link rel="stylesheet" href="../css/style.css">
  
  <link rel="manifest" href="/site.webmanifest">

  <!-- JSON-LD: NewsArticle -->
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title,
    "description": cut(description, 200),
    "image": toAbs(ogImg),
    "datePublished": pubIso,
    "dateModified": pubIso,
    "author": { "@type": "Organization", "name": "오렌지Pay", "url": SITE_URL },
    "publisher": { "@type": "Organization", "name": "오렌지Pay", "logo": { "@type": "ImageObject", "url": toAbs('img/logo.png') } },
    "mainEntityOfPage": { "@type": "WebPage", "@id": absUrl },
    "isBasedOn": sourceUrl,
    "citation": sourceUrl,
    "keywords": tags
  })}
  </script>

  <!-- JSON-LD: BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "홈",
      "item": "${SITE_URL}"
    },{
      "@type": "ListItem",
      "position": 2,
      "name": "블로그",
      "item": "${SITE_URL}blog/"
    },{
      "@type": "ListItem",
      "position": 3,
      "name": "${htmlEscape(title)}",
      "item": "${absUrl}"
    }]
  }
  </script>

  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": BUSINESS.name,
    "url": SITE_URL,
    "contactPoint": [{
      "@type": "ContactPoint",
      "telephone": BUSINESS.phoneIntl,
      "contactType": "customer service",
      "areaServed": "KR",
      "availableLanguage": ["ko"]
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
      <!-- 3열 셸: 좌/우 광고 + 가운데 본문 -->
      <div class="mx-auto max-w-[1400px] px-2 sm:px-4 lg:px-6 py-6">
        <div class="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_220px] gap-4">
          <aside class="hidden xl:block">
            <div class="sticky top-24">
              <div class="h-[600px] rounded-lg border bg-slate-50 text-slate-400 flex items-center justify-center text-sm">광고 영역</div>
            </div>
          </aside>
          <main class="mx-auto w-full max-w-[820px] bg-white p-6 md:p-8 mt-4 rounded-xl shadow-lg">
            <a href="../index.html#blog" class="inline-block mb-6 px-4 py-2 bg-orange-500 text-white rounded-md font-bold shadow hover:bg-orange-600 transition">← 블로그 목록으로 돌아가기</a>
            <article class="">
      <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-6">${htmlEscape(title)}</h1>
      <div class="text-gray-600 mb-6">${ymd(new Date(pubIso))} · 출처: <a class="underline text-orange-700" href="${htmlEscape(sourceUrl)}" rel="nofollow noopener" target="_blank">${htmlEscape(sourceName)}</a></div>
          <section class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">핵심 요약</h2>
        <p>${htmlEscape(description)}</p>
        <p class="mt-4 text-sm text-gray-500">본 페이지는 기사의 일부 요약과 링크만 제공합니다. 전체 내용은 원문을 참고하세요.</p>
        <div class="mt-5">
          <a href="${htmlEscape(sourceUrl)}" rel="nofollow noopener" target="_blank" class="inline-flex items-center px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700">원문 기사 보기</a>
        </div>
        </section>
      ${ctaVariant === 'top' ? keywordHtml : ''}
      ${keypoints}
      ${impact}
      ${checklist}
    ${ctaVariant === 'middle' ? keywordHtml : ''}
  ${details}
      ${assistance}
    ${ctaVariant === 'bottom' ? keywordHtml : ''}
      ${contactHtml}
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

function normalizeTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const stop = new Set([
    '기사', '보도', '속보', '단독', '전문', '영상', '사진', '네이트', '연합뉴스', 'news', '뉴스', 'com', 'co', 'kr', 'www',
    'http', 'https', '관련', '최신', '정리', '해설', '분석', '인터뷰', '공식', '발표', '업데이트', '추가', '전체', '요약'
  ]);
  return normalizeTitle(text)
    .split(' ')
    .map(t => t.trim())
    .filter(t => t && t.length >= 2 && !stop.has(t));
}

function jaccardSimilarity(a, b) {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return inter / union;
}

async function main() {
  ensureDir(BLOG);
  const posts = loadJson(POSTS, []);
  const log = loadJson(LOG_FILE, []);
  const seen = new Set(log.map(e => e.id || e.link));
  // Optional filter by CLI arg or env
  const argv = process.argv.slice(2);
  let filter = process.env.NEWS_FILTER || '';
  let dryRun = false;
  let maxAgeDays = null;
  const idx = argv.indexOf('--filter');
  if (idx !== -1 && argv[idx + 1]) filter = argv[idx + 1];
  const dryIdx = argv.indexOf('--dry-run');
  if (dryIdx !== -1) dryRun = true;
  const madIdx = argv.indexOf('--max-age-days');
  if (madIdx !== -1 && argv[madIdx + 1]) {
    const n = parseInt(argv[madIdx + 1], 10);
    if (!isNaN(n) && n > 0) maxAgeDays = n;
  }

  let candidates = await fetchCandidates({ filter, windowDaysOverride: maxAgeDays, seenIds: seen });
  if (filter) {
    const lower = filter.toLowerCase();
    candidates = candidates.filter(c => (c.title || '').toLowerCase().includes(lower) || (c.summary || '').toLowerCase().includes(lower));
  }
  if (!candidates.length) {
    console.log('No new news within 7 days. Trying older items as fallback...');
    // fallback: 가장 최신 1건을 가져오기 위해 seen 무시하고 각 피드에서 1개씩 시도
    try {
      const parser = new Parser({ timeout: 15000 });
      const sources = loadJson(SOURCES_FILE, []);
      for (const src of sources) {
        const res = await parser.parseURL(src.feed);
        if (res.items && res.items.length) {
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
    } catch (e) { /* ignore */ }
  }
  // re-apply filter after fallback selection
  if (filter && candidates.length) {
    const lower = filter.toLowerCase();
    candidates = candidates.filter(c => (c.title || '').toLowerCase().includes(lower) || (c.summary || '').toLowerCase().includes(lower));
  }
  if (!candidates.length) {
    console.log('No news available from sources.');
    return;
  }
  // 중복 방지: 최근 14일 내 게시물과 제목 유사(정규화 후 동일) 항목은 제외하고 선택
  const RECENT_DAYS = 14;
  const SIM_CUTOFF_DAYS = 2; // 최근 2일간은 유사 제목도 강하게 제외
  const SIM_THRESHOLD = 0.6; // 제목 유사도 임계치
  const DIVERSITY_WINDOW = 10; // 최근 N개 내 카테고리 비율 상한 적용 창
  const MAX_CATEGORY_RATIO = 0.5; // 예: 최근 10개 중 동일 카테고리는 최대 5개
  const SOURCE_COOLDOWN_DAYS = 2; // 최근 2일 내 동일 매체 제외
  const KEYWORD_WINDOW = 15; // 키워드 편중 측정 창 크기(최근 N개 제목)
  const KEYWORD_REPEAT_THRESHOLD = 3; // 특정 키워드가 최근 창에서 N회 이상이면 패널티
  const KEYWORD_EXCLUDE = new Set(['휴대폰소액결제', '소액결제', '신용카드현금화', '비상금', '현금화', '소액급전']);
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const simCutoff = Date.now() - SIM_CUTOFF_DAYS * 24 * 60 * 60 * 1000;
  const recentTitleSet = new Set(posts
    .filter(p => {
      const ts = Date.parse(p.date);
      return !isNaN(ts) ? (ts >= cutoff) : true;
    })
    .map(p => normalizeTitle(p.title))
  );
  const recentForSim = posts.filter(p => {
    const ts = Date.parse(p.date);
    return !isNaN(ts) ? (ts >= simCutoff) : false;
  });
  // 최근 소스(매체) 쿨다운 대상 수집: 최근 SOURCE_COOLDOWN_DAYS 내 게시의 태그에서 매체 유추
  const recentSources = new Set(posts.filter(p => {
    const ts = Date.parse(p.date);
    return !isNaN(ts) ? (ts >= simCutoff) : false;
  }).flatMap(p => Array.isArray(p.tags) ? p.tags : []));
  // 카테고리 다양성 측정용: 최근 DIVERSITY_WINDOW 포스트 카테고리 카운트
  const recentWindow = posts.slice(0, DIVERSITY_WINDOW); // posts는 선두에 최신이 unshift됨
  const catCount = recentWindow.reduce((acc, p) => {
    const c = p.category || '기타';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const maxPerCat = Math.floor(DIVERSITY_WINDOW * MAX_CATEGORY_RATIO);
  // 키워드 편중 측정: 최근 KEYWORD_WINDOW 제목 토큰 빈도
  const recentKw = posts.slice(0, KEYWORD_WINDOW).reduce((acc, p) => {
    const toks = tokenize(p.title);
    for (const t of toks) {
      if (KEYWORD_EXCLUDE.has(t)) continue;
      acc[t] = (acc[t] || 0) + 1;
    }
    return acc;
  }, {});
  let picked = null;
  // 1) 동일 제목(정규화) 제외 + 2) 최근 2일 내 유사 제목 제외
  // 후보에 카테고리 사전 주입
  const enriched = candidates.map(c => ({
    ...c,
    _cat: (filter ? filter : categorizeFromText(`${c.title} ${c.summary || ''}`))
  }));

  const filtered = enriched.filter(c => {
    const norm = normalizeTitle(c.title);
    if (recentTitleSet.has(norm)) return false;
    for (const rp of recentForSim) {
      if (jaccardSimilarity(rp.title, c.title) >= SIM_THRESHOLD) return false;
    }
    return true;
  });
  // 동일 매체 쿨다운: 최근 SOURCE_COOLDOWN_DAYS 내에 같은 source가 태그에 존재하면 제외
  const afterSource = (filtered.length ? filtered : enriched).filter(c => !recentSources.has(c.source));
  // 카테고리 다양성: 허용치 초과 카테고리는 제외(단, 모든 후보가 제외되면 완화)
  const nonOverrep = afterSource.filter(c => (catCount[c._cat] || 0) < maxPerCat);
  const diversityStage = nonOverrep.length ? nonOverrep : afterSource;
  // 키워드 편중: 최근 창에서 고빈도 키워드를 과다 포함한 제목은 제외(단, 모두 제외되면 완화)
  const kwFiltered = diversityStage.filter(c => {
    const toks = tokenize(c.title).filter(t => !KEYWORD_EXCLUDE.has(t));
    // 고빈도 토큰이 하나라도 임계 이상이면 제외
    return !toks.some(t => (recentKw[t] || 0) >= KEYWORD_REPEAT_THRESHOLD);
  });
  const finalStage = kwFiltered.length ? kwFiltered : diversityStage;

  for (const c of (finalStage.length ? finalStage : enriched)) {
    if (!recentTitleSet.has(normalizeTitle(c.title))) {
      picked = c;
      break;
    }
  }
  if (!picked) picked = candidates[0];
  const slug = slugify(picked.title);
  // derive category/tags for meta and posts.json
  function categorizeFromText(text) {
    const t = String(text || '').toLowerCase();
    const has = (kw) => t.includes(kw);
    if (has('민생') || has('물가') || has('서민') || has('취약') || has('지원')) return '민생';
    if (has('피싱') || has('스미싱') || has('보이스피싱') || has('사기') || has('카드깡')) return '사기';
    if (has('소액결제') || has('정보이용료') || has('휴대폰')) return '소액결제';
    if (has('신용카드') || has('카드사') || has('가맹점') || has('수수료') || has('카드 ')) return '신용카드';
    return '뉴스';
  }
  const cat = filter ? filter : categorizeFromText(`${picked.title} ${picked.summary}`);
  const tags = Array.from(new Set([
    cat,
    (picked.source || '').replace(/\s+/g, ' ').trim(),
    ...((picked.title || '').split(/\s+/).filter(w => w.length >= 2).slice(0, 5))
  ].filter(Boolean)));
  const built = buildHtml({
    title: picked.title,
    description: picked.summary || picked.title,
    slug,
    pubIso: picked.isoDate,
    sourceName: picked.source,
    sourceUrl: picked.link,
    image: DEFAULT_OG,
    category: cat,
    tags,
    perPostOgRel: null // will be set after OG generation below
  });
  if (dryRun) {
    console.log('[DRY RUN] Would publish:', built.relUrl);
    console.log('[DRY RUN] Title:', picked.title);
    console.log('[DRY RUN] Category:', cat, 'Tags:', tags.join(', '));
    return;
  }

  // (skip initial write; we will write final HTML after OG generation)
  // First, generate per-post OG image (based on filename base)
  const baseName = path.basename(built.fileName, path.extname(built.fileName));
  const ogRes = await generateOgForPost({ baseName, title: picked.title, category: cat });

  // Rebuild HTML with per-post OG path
  const builtWithOg = buildHtml({
    title: picked.title,
    description: picked.summary || picked.title,
    slug,
    pubIso: picked.isoDate,
    sourceName: picked.source,
    sourceUrl: picked.link,
    image: DEFAULT_OG,
    category: cat,
    tags,
    perPostOgRel: ogRes.webp
  });
  const outPathFinal = path.join(BLOG, builtWithOg.fileName);
  fs.writeFileSync(outPathFinal, builtWithOg.html, 'utf8');
  // Optional AI thumbnail
  const aiThumbRel = await tryGenerateAIImage({ title: picked.title, summary: picked.summary, category: cat, baseName });

  posts.unshift({
    title: picked.title,
    date: ymd(), // 사이트 게시 날짜를 사용해 /news 에 오늘 날짜가 노출되도록
    description: picked.summary || picked.title,
    url: builtWithOg.relUrl,
    image: DEFAULT_OG,
    imageWidth: 1198,
    imageHeight: 406,
    ogImage: ogRes.webp,
    aiImage: aiThumbRel || undefined,
    category: cat,
    tags
  });
  saveJson(POSTS, posts);

  log.push({ id: picked.id || picked.link, link: picked.link, title: picked.title, date: picked.isoDate, page: built.relUrl });
  saveJson(LOG_FILE, log);

  console.log('Published news:', built.relUrl);

  // Ensure OG image exists for default site image to avoid social preview delay
  try {
    if (!sharp) sharp = require('sharp');
    const ogSrcRel = DEFAULT_OG.replace(/^\//, '');
    const ogSrcAbs = path.join(ROOT, ogSrcRel);
    const outBase = path.join(path.dirname(ogSrcAbs), path.basename(ogSrcAbs, path.extname(ogSrcAbs)));
    const outWebp = outBase + '-og.webp';
    const outJpg = outBase + '-og.jpg';
    const needWebp = !fs.existsSync(outWebp);
    const needJpg = !fs.existsSync(outJpg);
    if (fs.existsSync(ogSrcAbs) && (needWebp || needJpg)) {
      await sharp(ogSrcAbs).resize(1200, 630, { fit: 'cover' }).webp({ quality: 88 }).toFile(outWebp);
      await sharp(ogSrcAbs).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 86 }).toFile(outJpg);
      console.log('OG 기본 이미지 생성 완료:', outWebp, outJpg);
    }
  } catch (e) {
    // sharp 미설치 등 환경 이슈 시 게시 흐름은 계속
    console.warn('OG 생성 스킵:', e && e.message ? e.message : e);
  }
}

main().catch(err => { console.error('publish-news failed:', err); process.exit(1); });
