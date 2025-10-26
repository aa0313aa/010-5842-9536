#!/usr/bin/env node
/**
 * scripts/publish-news-multi.js
 * - 뉴스 포스트를 한 번에 N개 연속 발행
 * - 옵션: --count N (기본 4), --filters "사기,신용카드,소액결제,민생" (없으면 내부 기본 사용)
 * - 각 회차마다 publish-news.js를 호출하며, 실패해도 다음 회차 진행
 * - 마지막에 sitemap/rss 재생성은 상위 npm 스크립트에서 수행 권장
 */
const { spawnSync } = require('child_process');

function parseArgs(){
  const argv = process.argv.slice(2);
  const getVal = (key) => {
    const i = argv.indexOf(key);
    return i !== -1 && argv[i+1] ? argv[i+1] : null;
  };
  const countStr = getVal('--count');
  const filtersStr = getVal('--filters');
  const count = Math.max(1, Math.min(10, parseInt(countStr||'4', 10) || 4));
  const filters = (filtersStr ? filtersStr.split(',') : ['신용카드','소액결제','사기','민생']).map(s=>s.trim()).filter(Boolean);
  return { count, filters };
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.error) {
    console.error('Command error:', res.error.message || String(res.error));
    return false;
  }
  if (res.status !== 0) {
    console.error(`Command failed (code ${res.status}): ${cmd} ${args.join(' ')}`);
    return false;
  }
  return true;
}

async function main(){
  const { count, filters } = parseArgs();
  console.log(`Multi publish start: count=${count}, filters=[${filters.join(', ')}]`);
  let published = 0;
  for (let i=0; i<count; i++){
    const filter = filters[i % filters.length];
    console.log(`\n=== [${i+1}/${count}] Publishing (filter: ${filter}) ===`);
    const args = ['scripts/publish-news.js'];
    if (filter) args.push('--filter', filter);
    const ok = run('node', args);
    if (ok) published++;
  }
  console.log(`\nMulti publish completed. Success: ${published}/${count}`);
}

main().catch(err=>{ console.error(err); process.exit(1); });
