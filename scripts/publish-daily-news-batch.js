#!/usr/bin/env node
/**
 * Publish one news item per target category in a single run.
 * Categories: 신용카드, 소액결제, 사기, 민생
 * After publishing, run OG generation and advise to regenerate indices.
 */
const { spawnSync } = require('child_process');

const CATEGORIES = ['신용카드', '소액결제', '사기', '민생'];

function run(cmd, args, opts={}){
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
  return res.status === 0;
}

async function main(){
  let success = 0;
  for (const cat of CATEGORIES){
    console.log(`\n=== Publishing category: ${cat} ===`);
    const ok = run('node', ['scripts/publish-news.js', '--filter', cat]);
    if (ok) success++;
  }
  console.log(`\nPublished ${success}/${CATEGORIES.length} categories.`);
  // Generate OG images for any posts missing proper ogImage mapping
  console.log('\n=== Generating OG images ===');
  run('node', ['scripts/generate-og-images.js']);
  console.log('\nDone. Consider regenerating sitemap/rss if not part of npm script.');
}

main().catch(err=>{ console.error(err); process.exit(1); });
