#!/usr/bin/env node
// scripts/generate-image-metadata.js
// Read posts.json, for each post.image get image metadata (width/height) and write back into posts.json as imageWidth/imageHeight
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const workspace = path.join(__dirname, '..');
const postsFile = path.join(workspace, 'posts.json');

async function getMeta(absPath) {
  try {
    const meta = await sharp(absPath).metadata();
    return { width: meta.width || null, height: meta.height || null };
  } catch (err) {
    return null;
  }
}

async function main(){
  if (!fs.existsSync(postsFile)) {
    console.error('posts.json not found at', postsFile);
    process.exit(1);
  }
  const posts = JSON.parse(fs.readFileSync(postsFile,'utf8'));
  let changed = false;
  for (const p of posts) {
    if (!p || !p.image) continue;
    const rel = p.image.replace(/^\//, '');
    const abs = path.join(workspace, rel);
    if (!fs.existsSync(abs)) {
      // try jpg->webp fallback
      const webp = abs.replace(/\.(jpe?g|png)$/i, '.webp');
      if (fs.existsSync(webp)) {
        const m = await getMeta(webp);
        if (m) { p.imageWidth = m.width; p.imageHeight = m.height; changed = true; continue; }
      }
      console.warn('image file not found for post', p.url, abs);
      continue;
    }
    const m = await getMeta(abs);
    if (m) {
      if (p.imageWidth !== m.width || p.imageHeight !== m.height) {
        p.imageWidth = m.width; p.imageHeight = m.height; changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2), 'utf8');
    console.log('posts.json updated with imageWidth/imageHeight');
  } else {
    console.log('No changes to posts.json');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
