const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../blog');
const LOG_FILE = path.join(__dirname, '../news-log.json');
const CSS_PATH = '../css/style.css';

// SEO constants
const GEO_TAGS = `
  <meta name="geo.region" content="KR-41">
  <meta name="geo.placename" content="Seoul">
  <meta name="geo.position" content="37.5665;126.9780">
  <meta name="ICBM" content="37.5665, 126.9780">
`;

// Regex patterns
const TAILWIND_CDN_REGEX = /<script\s+src=["']https:\/\/cdn\.tailwindcss\.com["'][^>]*><\/script>/i;
// Removed matching separate config block as it might be variable. We will just attempt to remove it if found or rely on the fact that built CSS covers it.
// Actually, I should remove the tailwind config script block too if it exists.
const TAILWIND_CONFIG_REGEX = /<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*<\/script>/i;

function getBreadcrumbLD(title, relativeUrl) {
    const absUrl = 'https://pay24.store/' + relativeUrl.replace(/^(\.\.\/|\/)/, '');
    return `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "홈",
      "item": "https://pay24.store/"
    },{
      "@type": "ListItem",
      "position": 2,
      "name": "블로그",
      "item": "https://pay24.store/blog/"
    },{
      "@type": "ListItem",
      "position": 3,
      "name": "${title.replace(/"/g, '\\"')}",
      "item": "${absUrl}"
    }]
  }
  </script>`;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Replace Tailwind CDN with Static CSS
    if (TAILWIND_CDN_REGEX.test(content)) {
        content = content.replace(TAILWIND_CDN_REGEX, `<link rel="preload" href="${CSS_PATH}" as="style">\n  <link rel="stylesheet" href="${CSS_PATH}">`);
    } else if (content.includes('href="../css/tailwind.min.css"')) {
        // Some templates used this
        content = content.replace('href="../css/tailwind.min.css"', `href="${CSS_PATH}"`);
    }

    // 2. Remove Tailwind Config Script if present
    if (TAILWIND_CONFIG_REGEX.test(content)) {
        content = content.replace(TAILWIND_CONFIG_REGEX, '');
    }

    // 3. Inject Geo Tags (if not present)
    if (!content.includes('name="geo.region"')) {
        content = content.replace('</head>', `${GEO_TAGS}\n</head>`);
    }

    // 4. Inject Breadcrumb (extract title first)
    // Simple RegEx to grab title
    const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'News';
    const relativePath = 'blog/' + path.basename(filePath);

    if (!content.includes('"@type": "BreadcrumbList"')) {
        const breadcrumbJSON = getBreadcrumbLD(title, relativePath);
        content = content.replace('</head>', `${breadcrumbJSON}\n</head>`);
    }

    // 5. Inject Preload for CSS if not already done in step 1 replace
    if (!content.includes('rel="preload" href="../css/style.css"')) {
        content = content.replace('<link rel="stylesheet" href="../css/style.css">', `<link rel="preload" href="../css/style.css" as="style">\n  <link rel="stylesheet" href="../css/style.css">`);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.basename(filePath)}`);
        return true;
    }
    return false;
}

const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
let count = 0;
files.forEach(f => {
    if (processFile(path.join(BLOG_DIR, f))) count++;
});

console.log(`Retrofit complete. Updated ${count} files.`);
