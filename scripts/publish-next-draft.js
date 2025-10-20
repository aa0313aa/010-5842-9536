#!/usr/bin/env node
/**
 * scripts/publish-next-draft.js
 * - drafts/*.html 중 알파벳순 첫 파일을 오늘 날짜로 blog/에 게시
 * - 제목/설명/og:image, canonical/og:url 보정
 * - posts.json 선두에 항목 추가
 * - sitemap.xml, rss.xml 재생성은 워크플로에서 실행하거나 여기서 선택 실행 가능(옵션)
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const DRAFTS = path.join(ROOT, 'drafts');
const BLOG = path.join(ROOT, 'blog');
const POSTS = path.join(ROOT, 'posts.json');
const SITE_URL = 'https://pay24.store/';

function ymd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function readPosts() {
  try {
    const raw = fs.readFileSync(POSTS, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json : [];
  } catch (e) {
    return [];
  }
}

function writePosts(arr) {
  fs.writeFileSync(POSTS, JSON.stringify(arr, null, 2), 'utf8');
}

function toAbsoluteUrl(rel) {
  return SITE_URL.replace(/\/$/, '') + '/' + rel.replace(/^\//, '');
}

function publishOneDraft() {
  ensureDir(DRAFTS); ensureDir(BLOG);
  const files = fs.readdirSync(DRAFTS).filter(f => f.toLowerCase().endsWith('.html')).sort();
  if (files.length === 0) {
    console.log('No drafts to publish.');
    return { changed: false };
  }

  const first = files[0];
  const draftPath = path.join(DRAFTS, first);
  const raw = fs.readFileSync(draftPath, 'utf8');
  const $ = cheerio.load(raw);

  // Extract metadata
  const title = ($('head > title').first().text() || '').trim() || first.replace(/\.html$/i, '');
  const desc = ($('meta[name="description"]').attr('content') || '').trim();
  const ogImg = ($('meta[property="og:image"]').attr('content') || '').trim() || '/img/og-image.jpg';

  // Compose new filename with today's date
  const today = ymd();
  const baseSlug = first.replace(/\.html$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const newName = `${today}-${baseSlug}.html`;
  const relUrl = `blog/${newName}`;
  const absUrl = toAbsoluteUrl(relUrl);

  // Ensure canonical and og:url exist and correct
  let head = $('head');
  if (head.length === 0) {
    $('html').prepend('<head></head>');
    head = $('head');
  }
  // canonical
  if (head.find('link[rel="canonical"]').length === 0) {
    head.append(`<link rel="canonical" href="${absUrl}">`);
  } else {
    head.find('link[rel="canonical"]').attr('href', absUrl);
  }
  // og:url
  if (head.find('meta[property="og:url"]').length === 0) {
    head.append(`<meta property="og:url" content="${absUrl}">`);
  } else {
    head.find('meta[property="og:url"]').attr('content', absUrl);
  }
  // title
  if (head.find('title').length === 0) { head.append(`<title>${title}</title>`); }
  // description
  if (desc && head.find('meta[name="description"]').length === 0) {
    head.append(`<meta name="description" content="${desc}">`);
  }

  // Write blog file
  const outPath = path.join(BLOG, newName);
  fs.writeFileSync(outPath, $.html(), 'utf8');

  // Remove draft
  fs.unlinkSync(draftPath);

  // Update posts.json (prepend)
  const posts = readPosts();
  const newPost = {
    title,
    date: today,
    description: desc || title,
    url: relUrl,
    image: ogImg || '/img/og-image.jpg',
    imageWidth: 1198,
    imageHeight: 406,
    ogImage: '/img/og-image-og.webp'
  };
  posts.unshift(newPost);
  writePosts(posts);

  console.log('Published:', relUrl);
  return { changed: true, relUrl };
}

(async function main(){
  const res = publishOneDraft();
  if (!res.changed) process.exit(0);
})();
