#!/usr/bin/env node
// scripts/generate-og-images.js
// posts.json에 명시된 image에서 1200x630 OG용 webp 및 jpg(대체)를 생성하고 posts.json에 ogImage 필드를 추가합니다.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const workspace = __dirname + '/../';
const postsFile = path.join(workspace, 'posts.json');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function generateOg(srcPath, outBase) {
  try {
    // Skip if outputs exist and are up-to-date
    const outWebp = outBase + '-og.webp';
    const outJpg = outBase + '-og.jpg';
    const srcStat = fs.statSync(srcPath);
    const webpFresh = fs.existsSync(outWebp) && fs.statSync(outWebp).mtimeMs >= srcStat.mtimeMs;
    const jpgFresh = fs.existsSync(outJpg) && fs.statSync(outJpg).mtimeMs >= srcStat.mtimeMs;
    if (webpFresh && jpgFresh) {
      return false; // no change
    }
    await sharp(srcPath).resize(1200, 630, { fit: 'cover' }).webp({ quality: 88 }).toFile(outBase + '-og.webp');
    await sharp(srcPath).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 86 }).toFile(outBase + '-og.jpg');
    console.log('OG 생성:', outBase + '-og.webp', outBase + '-og.jpg');
    return true;
  } catch (err) {
    console.error('OG 이미지 생성 실패:', srcPath, err.message);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(postsFile)) {
    console.error('posts.json을 찾을 수 없습니다:', postsFile);
    process.exit(1);
  }
  let posts = [];
  try { posts = JSON.parse(fs.readFileSync(postsFile,'utf8')); } catch(e){ console.error('posts.json 파싱 오류', e.message); process.exit(1); }

  let changed = false;

  for (const p of posts) {
    if (!p || !p.image) continue;
    const relPath = p.image.replace(/^\//, '');
    const abs = path.join(workspace, relPath);
    if (!fs.existsSync(abs)) { console.warn('원본 이미지 없음:', abs); continue; }

    const dir = path.dirname(abs);
    const ext = path.extname(abs);
    const base = path.basename(abs, ext);
    const outBase = path.join(dir, base);
    ensureDir(dir);
    const ok = await generateOg(abs, outBase);
    if (ok) {
      // set ogImage relative path
      const ogRel = '/' + path.join(path.relative(workspace, dir), base + '-og.webp').replace(/\\/g,'/');
      if (p.ogImage !== ogRel) {
        p.ogImage = ogRel;
        changed = true;
      }
    } else {
      // ensure ogImage field is present even if not regenerated
      const ogRel = '/' + path.join(path.relative(workspace, dir), base + '-og.webp').replace(/\\/g,'/');
      if (!p.ogImage) {
        p.ogImage = ogRel;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2), 'utf8');
    console.log('posts.json 업데이트됨 (ogImage 필드 추가)');
  } else {
    console.log('변경사항 없음');
  }
}

main().catch(err=>{ console.error(err); process.exit(1); });
