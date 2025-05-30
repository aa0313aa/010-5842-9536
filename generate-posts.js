const fs = require('fs');
const path = require('path');
const blogDir = path.join(__dirname, 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));

const posts = files.map(filename => {
  const filePath = path.join(blogDir, filename);
  const html = fs.readFileSync(filePath, 'utf8');
  const title = (html.match(/<title>(.*?)<\/title>/) || [,''])[1].trim();
  const date = (html.match(/<meta\s+name="date"\s+content="([^"]+)"/) || [,''])[1].trim();
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]+)"/) || [,''])[1].trim();
  return {
    title: title || filename.replace('.html',''),
    date: date || '',
    description: description || '',
    url: `blog/${filename}`
  };
}).sort((a, b) => b.date.localeCompare(a.date));

fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2), 'utf8');
console.log('posts.json 생성 완료');
