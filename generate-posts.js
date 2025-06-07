const fs = require('fs');
const path = require('path');
const blogDir = path.join(__dirname, 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

const posts = files
  .filter(filename => filename !== 'post-template.html')
  .map(filename => {
    const filePath = path.join(blogDir, filename);
    const html = fs.readFileSync(filePath, 'utf8');
    // post-meta JSON 추출
    const metaMatch = html.match(/<script[^>]*id=["']post-meta["'][^>]*>([\s\S]*?)<\/script>/i);
    let meta = {};
    if (metaMatch) {
      try {
        meta = JSON.parse(metaMatch[1]);
      } catch (e) {}
    }
    return {
      title: meta.title || filename.replace('.html',''),
      date: meta.date || '',
      description: meta.description || '',
      url: `blog/${filename}`,
      draft: meta.draft || false
    };
  })
  .filter(post => post.title && post.date && post.description && !post.draft)
  .sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync('posts.json', JSON.stringify(posts.map(({draft, ...rest}) => rest), null, 2), 'utf8');
console.log('posts.json 생성 완료');
