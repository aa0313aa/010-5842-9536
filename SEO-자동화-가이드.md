# 외부 신뢰도 백링크 자동화 가이드

아래의 신뢰도 높은 사이트/SNS/포털/커뮤니티/블로그 등에 pay24.store 메인/주요 글 링크를 남기면 SEO와 신뢰도가 크게 향상됩니다.

- 네이버 블로그/카페/포스트/지식인
- 티스토리/브런치/다음카페
- 인스타그램/페이스북/X(트위터)/유튜브/구글 사이트
- 각종 금융/재테크/정보 커뮤니티(클리앙, 뽐뿌, 루리웹 등)

## 자동화 예시
- 각 글 하단 공유 버튼 클릭 → URL 복사 → 위 사이트에 후기/정보/리뷰/링크 남기기
- 네이버 블로그/카페/포스트에 후기/정보성 글 작성 시 본문에 링크 삽입
- 인스타/페북/X/유튜브 등 SNS에 후기/정보/링크 업로드
- 구글 사이트/티스토리/브런치 등에도 정보성 글+링크 업로드

---

# Search Console/GA4 연동 자동화 가이드

1. Search Console(구글) 및 네이버 서치어드바이저에 pay24.store 등록
2. sitemap.xml 제출(자동화 스크립트로 최신화)
3. GA4 추적ID 발급 후 index.html, blog/index.html, 주요 글 <head>에 아래 코드 삽입

```html
<!-- GA4 추적 코드 템플릿 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');
</script>
```

4. Search Console/네이버 인증 메타태그도 <head>에 삽입(예시)

```html
<meta name="naver-site-verification" content="네이버인증코드" />
<meta name="google-site-verification" content="구글인증코드" />
```

---

# Lighthouse 성능/접근성 점수 개선 가이드

- 모든 이미지 alt/aria-label/width/height/lazy 속성 보강
- 버튼/링크 aria-label, role, tabindex 등 추가
- 불필요한 JS/CSS 제거, 필요시 minify
- critical CSS 인라인, preload/lazy 적극 활용
- 구조화데이터/OG/트위터/메타태그 중복 방지
- 후기/전문가 Q&A 등 실질 콘텐츠 보강

---

# 후기/전문가 Q&A 자동화 템플릿 예시

posts.json에 후기/faq/전문가Q&A 필드 추가 → generate-posts.js에서 각 글에 자동 반영
