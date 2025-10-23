#!/usr/bin/env node
/**
 * Remove inline <figure>...</figure> blocks from existing news posts
 * to honor the "이미지 빼주세요" requirement (OG only remains).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG = path.join(ROOT, 'blog');

function listFiles(dir){
  try { return fs.readdirSync(dir); } catch(e){ return []; }
}

function removeFigures(html){
  if (!html) return html;
  // Remove all <figure ...> ... </figure> blocks (non-greedy, dotall)
  // Use multiple passes to be safe
  let out = String(html);
  const re = /<figure[\s\S]*?<\/figure>/gi;
  out = out.replace(re, '');
  // Tidy consecutive blank lines
  out = out.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return out;
}

function run(){
  const files = listFiles(BLOG).filter(f => /-news-/.test(f) && f.endsWith('.html'));
  if (!files.length){
    console.log('No existing news files found.');
    return;
  }
  let changed = 0;
  for (const f of files){
    const p = path.join(BLOG, f);
    const before = fs.readFileSync(p, 'utf8');
    const after = removeFigures(before);
    if (after !== before){
      fs.writeFileSync(p, after, 'utf8');
      console.log('Updated:', f);
      changed++;
    }
  }
  console.log('Backfill complete. Files updated:', changed);
}

run();
