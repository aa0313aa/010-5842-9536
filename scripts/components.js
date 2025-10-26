// scripts/components.js
const path = require('path');

function htmlEscape(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function encQ(s){ return encodeURIComponent(String(s||'')); }

function hashCode(str){
  let h = 0; const s = String(str||'');
  for (let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h|=0; }
  return Math.abs(h);
}

function chooseCtaVariant(slug){
  const v = hashCode(slug) % 3;
  return v === 0 ? 'top' : (v === 1 ? 'middle' : 'bottom');
}

function buildKeywordList(category){
  const base = [
    { label: '휴대폰 소액결제', q: '휴대폰 소액결제' },
    { label: '정보이용료', q: '정보이용료' },
    { label: '신용카드 현금화', q: '신용카드 현금화' },
    { label: '비상금', q: '비상금' },
    { label: '수수료 비교', q: '수수료 비교' },
    { label: '정산 시간', q: '정산 시간' }
  ];
  const cat = String(category||'뉴스');
  // 가중치 기반 재정렬
  const weights = new Map();
  for (const k of base) weights.set(k.label, 1);
  if (/소액결제/.test(cat)){
    inc(weights,'휴대폰 소액결제',3); inc(weights,'정보이용료',2); inc(weights,'정산 시간',2);
  } else if (/신용카드/.test(cat)){
    inc(weights,'신용카드 현금화',3); inc(weights,'수수료 비교',2);
  } else if (/사기/.test(cat)){
    inc(weights,'휴대폰 소액결제',2); inc(weights,'비상금',1); // 안전·대응 키워드는 검색페이지 일반화
  } else if (/민생/.test(cat)){
    inc(weights,'비상금',2); inc(weights,'수수료 비교',2);
  }
  const ranked = base
    .map(k=>({ ...k, w: weights.get(k.label)||1 }))
    .sort((a,b)=> b.w - a.w)
    .slice(0,6);
  return ranked;
}

function inc(map, key, add){ map.set(key, (map.get(key)||0) + (add||1)); }

function renderKeywordCTA({ category, phone='010-5842-9536' }){
  const items = buildKeywordList(category);
  const pairs = [];
  for (let i=0;i<items.length;i+=2){
    const a = items[i];
    const b = items[i+1];
    const li = `
          <li><a class="underline text-orange-700" href="/search.html?q=${encQ(a.q)}">${htmlEscape(a.label)}</a>${b?` · <a class="underline text-orange-700" href="/search.html?q=${encQ(b.q)}">${htmlEscape(b.label)}</a>`:''}</li>`;
    pairs.push(li);
  }
  return `
      <section id="keyword-ads" class="prose prose-lg max-w-none mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">키워드 바로가기</h2>
        <ul class="list-disc pl-6">
          ${pairs.join('\n')}
        </ul>
        <p class="mt-3 text-sm text-gray-600">상담이 필요하시면 <a class="underline" href="/contact.html">고객센터</a> 또는 <a class="underline" href="tel:${htmlEscape(phone)}">${htmlEscape(phone)}</a>으로 연락주세요.</p>
      </section>`;
}

module.exports = { renderKeywordCTA, chooseCtaVariant, buildKeywordList, hashCode };
