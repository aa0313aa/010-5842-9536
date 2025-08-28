#!/usr/bin/env node
// scripts/optimize-images.js
// posts.json에 명시된 이미지 파일들을 찾아 webp 변환 및 리사이즈(800/400) 버전을 생성합니다.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const workspace = __dirname + '/../';
const postsFile = path.join(workspace, 'posts.json');
const imgDir = path.join(workspace, 'img');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function processImage(srcPath) {
  if (!fs.existsSync(srcPath)) {
    console.warn('원본 이미지 없음:', srcPath);
    return;
  }
  const ext = path.extname(srcPath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    console.warn('지원하지 않는 확장자(생략):', srcPath);
    return;
  }

  const dir = path.dirname(srcPath);
  const base = path.basename(srcPath, ext);
  const webpPath = path.join(dir, base + '.webp');
  const webp800 = path.join(dir, base + '-800.webp');
  const webp400 = path.join(dir, base + '-400.webp');

  try {
    // 원본 크기 -> .webp
    await sharp(srcPath).webp({ quality: 80 }).toFile(webpPath);
    // resize 800
    await sharp(srcPath).resize({ width: 800 }).webp({ quality: 76 }).toFile(webp800);
    // resize 400
    await sharp(srcPath).resize({ width: 400 }).webp({ quality: 72 }).toFile(webp400);
    console.log('생성:', webpPath, webp800, webp400);
  } catch (err) {
    console.error('이미지 처리 중 오류:', srcPath, err.message);
  }
}

async function main() {
  if (!fs.existsSync(postsFile)) {
    console.error('posts.json을 찾을 수 없습니다:', postsFile);
    process.exit(1);
  }
  let posts = [];
  try { posts = JSON.parse(fs.readFileSync(postsFile,'utf8')); } catch(e){ console.error('posts.json 파싱 오류', e.message); process.exit(1); }

  const imgs = new Set();
  for (const p of posts) {
    if (p && p.image) imgs.add(p.image);
  }

  if (imgs.size === 0) {
    console.log('변환할 이미지가 없습니다. posts.json에 image 필드를 확인하세요.');
    return;
  }

  for (const rel of imgs) {
    // 상대경로 정리
    const relPath = rel.replace(/^\//, '');
    const abs = path.join(workspace, relPath);
    await processImage(abs);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
