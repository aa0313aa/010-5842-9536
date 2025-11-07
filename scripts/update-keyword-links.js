const fs = require('fs');
const path = require('path');

// 검색할 디렉토리
const blogDir = './blog';

// 교체할 URL 매핑
const replacements = [
  {
    search: '/search.html?q=%ED%9C%B4%EB%8C%80%ED%8F%B0%20%EC%86%8C%EC%95%A1%EA%B2%B0%EC%A0%9C',
    replace: '/blog/2025-06-11-mobile-giftcard-cash-guide.html'
  },
  {
    search: '/search.html?q=%EC%A0%95%EB%B3%B4%EC%9D%B4%EC%9A%A9%EB%A3%8C',
    replace: '/blog/2025-10-20-phone-micro-payment-cash-guide.html'
  },
  {
    search: '/search.html?q=%EC%8B%A0%EC%9A%A9%EC%B9%B4%EB%93%9C%20%ED%98%84%EA%B8%88%ED%99%94',
    replace: '/신용카드-현금화-업체-가이드-2025.html'
  },
  {
    search: '/search.html?q=%EB%B9%84%EC%83%81%EA%B8%88',
    replace: '/blog/2025-08-29-cardcash-orangepay.html'
  },
  {
    search: '/search.html?q=%EC%88%98%EC%88%98%EB%A3%8C%20%EB%B9%84%EA%B5%90',
    replace: '/blog/2025-10-22-cardcash-fee-compare-2025.html'
  },
  {
    search: '/search.html?q=%EC%A0%95%EC%82%B0%20%EC%8B%9C%EA%B0%84',
    replace: '/blog/2025-10-20-cardcash-fee-calculator-legal-checklist.html'
  }
];

function updateKeywordLinksInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // 각 교체 매핑에 대해 처리
    for (const replacement of replacements) {
      if (content.includes(replacement.search)) {
        content = content.replaceAll(replacement.search, replacement.replace);
        hasChanges = true;
      }
    }

    // 변경사항이 있으면 파일에 저장
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${path.basename(filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processAllNewsFiles() {
  try {
    const files = fs.readdirSync(blogDir);
    let totalUpdated = 0;

    for (const file of files) {
      // 뉴스 파일만 처리 (news- 패턴)
      if (file.includes('-news-') && file.endsWith('.html')) {
        const filePath = path.join(blogDir, file);
        
        if (updateKeywordLinksInFile(filePath)) {
          totalUpdated++;
        }
      }
    }

    console.log(`\n🎉 Processing completed!`);
    console.log(`📊 Total news files updated: ${totalUpdated}`);
    
    // 변경된 키워드 매핑 요약 출력
    console.log(`\n📋 Keyword link mappings:`);
    replacements.forEach(r => {
      console.log(`  • ${decodeURIComponent(r.search.split('=')[1])} → ${r.replace}`);
    });

  } catch (error) {
    console.error('Error processing files:', error.message);
  }
}

// 스크립트 실행
if (require.main === module) {
  processAllNewsFiles();
}

module.exports = { updateKeywordLinksInFile, processAllNewsFiles };