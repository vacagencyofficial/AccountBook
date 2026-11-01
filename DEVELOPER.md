# 사입노트 — 개발자 안내

동대문 도매 사입 현장용 개인 모바일 웹앱(PWA)입니다.
서버 없이 IndexedDB(Dexie)에 저장하며, 오프라인에서 동작합니다.

## 실행

```bash
npm install
npm run dev
```

- 바인딩: `0.0.0.0:43123` (LAN의 다른 기기에서 접속 가능)
- 로컬: `http://localhost:43123`
- 네트워크: `http://<host-ip>:43123`

```bash
npm run build
npm start    # preview on 0.0.0.0:43123
```

## 기술 스택

- Vite + React (JavaScript)
- Tailwind CSS
- react-router-dom
- Dexie (IndexedDB)
- exceljs / jszip
- vite-plugin-pwa

## 주요 경로

| 경로 | 설명 |
|---|---|
| `/` | 오늘/월 요약 홈 |
| `/capture` | 촬영 + 빠른 등록 |
| `/shops` | 가게 목록 |
| `/shops/:id` | 가게 상세 |
| `/history` | 장부·필터·엑셀 |
| `/settings` | 백업·복원·설정 |

## 코드 모양

```bash
npm run format       # 모든 파일을 같은 모양으로 (prettier)
npm run format:check # 모양만 검사 (CI에서도 확인)
```

## 시험(테스트)

```bash
npm test          # 아래 둘을 한 번에
npm run test:sync # 동기화(폰 두 대 흉내)·계산·백업 알림·예산 — vitest
npm run test:sql  # supabase/secure.sql 보안·동기화 함수 — PGlite
npm run test:e2e  # 화면 점검: 예시 데이터 앱을 띄워 실제로 눌러 봄 — Playwright (e2e/)
```

- 브라우저 없이 돌아갑니다. 폰 DB는 `fake-indexeddb`, Supabase 서버는 `@electric-sql/pglite`로 흉내 냅니다.
- GitHub에 올리거나 PR을 만들면 `.github/workflows/ci.yml`이 코드 검사 → 빌드 → 시험을 자동으로 돌립니다.

### 화면 점검 (e2e)

- `e2e/` 폴더: 상품 입력, 여러 개 한 번에 적기(사진·색·크기·판매가), 가계부·반복·장부·찾기·통계, 외상 갚은 날 결산, 엑셀 받기·넣기, 설정(분류별 예산·반복 고치기)
- `npm run test:e2e`가 `build:demo`(예시 데이터)로 빌드한 앱을 43124 포트에 띄워 점검합니다. 「오늘」은 2026-10-15로 고정됩니다(`e2e/helpers.js`).
- 처음 한 번은 브라우저 설치가 필요합니다: `npx playwright install chromium`
- GitHub에서는 CI의 `e2e` 작업이 PR마다 자동으로 돌고, 실패하면 화면 사진·기록(`playwright-report`)을 내려받을 수 있습니다.
- 화면 문구나 버튼 이름을 바꾸면 e2e도 같이 고쳐야 합니다.

## 배포

- Vercel / Netlify: `vercel.json`, `netlify.toml` 포함
- Build: `npm run build` → `dist`

## 주의

- 데이터는 기기별 IndexedDB에만 저장됩니다
- iOS는 Safari에서 홈 화면에 추가 후 사용 권장
- 사진: 장변 1280px, JPEG 압축
- HTTP(LAN IP)에서는 PWA 설치/오프라인이 제한될 수 있습니다. 공용 사용은 HTTPS 배포를 권장합니다.
