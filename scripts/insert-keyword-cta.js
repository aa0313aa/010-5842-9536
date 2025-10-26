#!/usr/bin/env node
/**
 * scripts/insert-keyword-cta.js
 * - 기존 blog/*-news-*.html 에 키워드/CTA 블록이 없으면 삽입
 * - 기본 위치: 요약 섹션 뒤(top). 파일별 해시로 위치 분산 가능(--ab 옵션)
 * 옵션: --dry-run, --limit N, --ab (top/middle/bottom 분산)
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { renderKeywordCTA, chooseCtaVariant } = require('./components');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');

function listNewsFiles(){
  const files = fs.readdirSync(BLOG).filter(f => /-news-.*\.html$/.test(f));
  return files.map(f => path.join(BLOG, f));
}

function insertCta(html, opts){
  const $ = cheerio.load(html);
  if ($('#keyword-ads').length) return { html, changed: false };
  const h2s = $('h2');
  let target = null;
  h2s.each((i,el)=>{
    const t = $(el).text().trim();
    if (/핵심 요약|요약 핵심 포인트/.test(t) && !target) target = $(el);
  });
  const categoryMeta = $('meta[name="article:section"]').attr('content') || '뉴스';
  const title = $('title').text() || '';
  const slug = path.basename(opts.filePath).replace(/\.html$/,'');
  const variant = opts.ab ? chooseCtaVariant(slug) : 'top';
  const cta = renderKeywordCTA({ category: categoryMeta });

  function placeTop(){
    if (target){
      const sec = target.closest('section');
      if (sec && sec.length){ sec.after(cta); return true; }
      target.after(cta); return true;
    }
    $('main article').first().prepend(cta); return true;
  }
  function placeMiddle(){
    const checklist = $('#checklist');
    if (checklist.length){ checklist.after(cta); return true; }
    return placeTop();
  }
  function placeBottom(){
    const contact = $('#contact');
    if (contact.length){ contact.before(cta); return true; }
    $('main article').first().append(cta); return true;
  }

  if (variant==='top') placeTop();
  else if (variant==='middle') placeMiddle();
  else placeBottom();

  return { html: $.html(), changed: true };
}

async function main(){
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const ab = argv.includes('--ab');
  const limIdx = argv.indexOf('--limit');
  const limit = (limIdx !== -1 && argv[limIdx+1]) ? parseInt(argv[limIdx+1],10) : null;

  const files = listNewsFiles();
  const pick = limit ? files.slice(0, Math.max(0, limit)) : files;
  let changed = 0, skipped = 0;
  for (const filePath of pick){
    const html = fs.readFileSync(filePath, 'utf8');
    const res = insertCta(html, { filePath, ab });
    if (!res.changed){ skipped++; continue; }
    if (dryRun){
      console.log(`[DRY] would insert CTA: ${path.basename(filePath)}`);
      continue;
    }
    fs.writeFileSync(filePath, res.html, 'utf8');
    changed++;
    console.log(`[ok] inserted CTA: ${path.basename(filePath)}`);
  }
  if (!dryRun) console.log(`Done. changed=${changed}, skipped=${skipped}`);
}

main().catch(err=>{ console.error('insert-keyword-cta failed:', err); process.exit(1); });
