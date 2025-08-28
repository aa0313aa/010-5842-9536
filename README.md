# [홈페이지1](https://aa0313aa.github.io/01058429536)
# [홈페이지2](https://aa0313aa.github.io/010-5842-9536)
# [홈페이지3](https://sites.google.com/view/k090912k/)
# [홈페이지4](https://aa0313.github.io/-/)
# [홈페이지5](https://aa0313.github.io/-/21.html)
# [홈페이지6](https://cardcashing.kr/)
# [홈페이지7](http://cardcashing.shop)
# [홈페이지8](https://sk6070.wordpress.com/)
# [홈페이지9](https://9536kklk.blogspot.com/)
# [홈페이지10](https://aa0313.ivyro.net/)
# [홈페이지11](http://cardcashing.shop)
# [네이버스토어](https://litt.ly/aa0313)


---

# [새 텍스트 문서 - 복사본 (2).md](새 텍스트 문서 - 복사본 (2).md)
# [새 텍스트 문서 - 복사본.md](새 텍스트 문서 - 복사본.md)
# [새 텍스트 문서.md](새 텍스트 문서.md)
# [홈페이지1.md](홈페이지1.md)

## CI & Deployment

이 저장소는 아래 자동화 워크플로를 포함합니다:

- `Auto optimize images & generate sitemap` (`.github/workflows/auto-optimize-and-sitemap.yml`)
	- 트리거: `push` 또는 `pull_request` on `main`
	- 작업: `npm install` → `npm run optimize:images` (이미지 webp 및 리사이즈 생성) → `npm run generate:sitemap` → 생성물(`img/*.webp`, `sitemap.xml`) 커밋 및 푸시

- `Deploy to GitHub Pages` (`.github/workflows/deploy-pages.yml`)
	- 트리거: `Auto optimize images & generate sitemap` 워크플로가 성공적으로 완료되면 실행
	- 작업: 저장소 최상위 콘텐츠를 GitHub Pages로 배포

확인 및 권한
- 액션 로그: GitHub > Actions 탭에서 워크플로 실행 기록과 로그를 확인하세요.
- 자동 커밋/푸시를 위해 레포 설정에서 Actions 권한이 허용되어야 합니다(관리자 또는 레포 소유자 설정 필요).
- Pages 배포가 정상 동작하려면 리포지토리의 Pages 설정에서 배포 소스 및 권한을 확인하세요.

로컬에서 수동으로 실행하려면

```powershell
# 의존성 설치
npm install

# 이미지 최적화
npm run optimize:images

# sitemap 생성
npm run generate:sitemap
```

문의: 자동화 관련 문제가 발생하면 Actions 로그를 첨부해 주세요. 제가 로그를 보고 원인을 진단해 드리겠습니다.
