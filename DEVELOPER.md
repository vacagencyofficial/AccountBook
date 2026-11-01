# 사입노트 — 개발자 안내

동대문 도매 사입 현장용 모바일 웹앱(PWA)입니다. 상품 사입 기록과 가계부(지출·수입)를 함께 적습니다.

- 기록은 **폰 안 IndexedDB(Dexie)** 에 먼저 저장되어 인터넷 없이도 동작합니다.
- 「다른 폰과 같이 쓰기」를 켜면 **Supabase**(장부 번호로 여는 `sailp_*` 서버 함수)와 맞춥니다.
- 사용자용 안내: [사용가이드.md](./사용가이드.md), [쉬운 사용 안내 PDF](./docs/사입노트_쉬운안내.pdf), 앱 안 「설정 → 도움말」

## 실행

```bash
npm install
cp .env.example .env.local   # 같이 쓰기를 시험하려면 Supabase 값 채우기 (없으면 이 폰에만 저장)
npm run dev
```

- 바인딩: `0.0.0.0:43123` (LAN의 다른 기기에서 접속 가능)
- 로컬: `http://localhost:43123`
- 예시 데이터: 개발 모드(`npm run dev`)와 `npm run build:demo`에서만 처음 한 번 들어갑니다. 실사용 배포(`npm run build`)에는 들어가지 않습니다.

```bash
npm run build        # 실사용 배포용
npm run build:demo   # 예시 데이터가 들어가는 체험·점검용
npm start            # 만든 결과를 0.0.0.0:43123 으로 미리 보기
```

## 기술 스택

- Vite + React 19 (JavaScript), Tailwind CSS v4, react-router-dom
- Dexie (IndexedDB) — 폰 안 저장
- Supabase — 같이 쓰기(동기화)·사진 저장소. 보안 설정은 `supabase/secure.sql`
- exceljs / jszip — 엑셀·백업
- vite-plugin-pwa — 홈 화면 추가·오프라인
- 시험: vitest + fake-indexeddb + PGlite, Playwright(화면 점검)

## 화면 주소

| 경로 | 화면 |
|---|---|
| `/` | 홈 (오늘 쓴 돈·이번 달·이번 주, 돈 쓴 것/들어온 것) |
| `/capture` | 상품 입력 (가게 → 가격 → 이름·사진) |
| `/capture/many` | 여러 개 한 번에 적기 (줄마다 이름·가격·개수·종류·사진·더 적기) |
| `/items/:itemId` | 상품 자세히·고치기·외상 갚기 |
| `/money/new?type=expense\|income` · `/money/:entryId` | 가계부 적기·고치기 |
| `/history` | 장부 (결산·달력·목록·사진·찾기·엑셀·백업) |
| `/stats` | 비교·통계 (지난달·작년·한 해·달마다 흐름·분류별 예산) |
| `/shops` · `/shops/new` · `/shops/:shopId` · `/shops/report` | 가게 목록·새 가게·가게 자세히·가게별 리포트 |
| `/settings` · `/help` | 설정 · 도움말 |
| `/join/:code` | 초대 주소로 같이 쓰기 연결 |

## 폴더

| 폴더 | 내용 |
|---|---|
| `src/pages/` | 화면 하나에 파일 하나 |
| `src/components/` | 여러 화면이 같이 쓰는 부분 (`history/`·`settings/`·`stats/`는 그 화면의 칸별 부분) |
| `src/hooks/` | 화면 계산 (`useHistoryData`, `useLedgerStats`, `useStorageInfo`, `useRegisterForm` 등) |
| `src/db/` | Dexie 표(`index.js`), 쓰기(`mutations.js`), 동기화(`cloudSync.js`), 예시 데이터(`seed.js`) |
| `src/lib/` | 폰에 기억하는 설정 (예산·반복·가계부 분류·글씨 크기·장부 번호 등) |
| `src/utils/` | 계산·형식·엑셀·백업·사진 줄이기 |
| `supabase/` | `schema.sql`(처음 한 번) → `secure.sql`(보안·서버 함수, 바뀌면 다시 실행) |
| `tests/` | vitest·SQL 시험 |
| `e2e/` | Playwright 화면 점검 |
| `docs/` | 쉬운 사용 안내 PDF |

## 코드 모양

```bash
npm run lint         # 코드 검사 (oxlint, 경고 0 유지)
npm run format       # 모든 파일을 같은 모양으로 (prettier)
npm run format:check # 모양만 검사 (CI에서도 확인)
```

## 시험(테스트)

```bash
npm test          # 아래 test:sync + test:sql 을 한 번에
npm run test:sync # 동기화(폰 두 대 흉내)·결산·반복·예산·백업 알림 — vitest
npm run test:sql  # supabase/secure.sql 보안·동기화 함수 — PGlite
npm run test:e2e  # 화면 점검: 예시 데이터 앱을 띄워 실제로 눌러 봄 — Playwright (e2e/)
```

- `npm test`는 브라우저 없이 돌아갑니다. 폰 DB는 `fake-indexeddb`, Supabase 서버는 `@electric-sql/pglite`로 흉내 냅니다.
- 날짜에 따라 결과가 바뀌는 시험은 날짜를 고정해 두세요 (실제 오늘 날짜에 기대면 달이 바뀔 때 깨집니다).
- GitHub에 올리거나 PR을 만들면 `.github/workflows/ci.yml`이 두 작업을 자동으로 돌립니다.
  - `check`: 코드 검사 → 모양 검사 → 빌드 → `npm test`
  - `e2e`: 화면 점검

### 화면 점검 (e2e)

- `e2e/` 폴더: 상품 입력, 여러 개 한 번에 적기(사진·색·크기·판매가), 가계부·반복·장부·찾기·통계, 외상 갚은 날 결산, 엑셀 받기·넣기, 설정(분류별 예산·반복 고치기)
- `npm run test:e2e`가 `build:demo`(예시 데이터)로 빌드한 앱을 43124 포트에 띄워 점검합니다. 「오늘」은 2026-10-15로 고정되고, 시험마다 화면 JS 오류가 없는지도 확인합니다(`e2e/helpers.js`).
- 처음 한 번은 브라우저 설치가 필요합니다: `npx playwright install chromium`
- GitHub에서 `e2e` 작업이 실패하면 화면 사진·기록(`playwright-report`)을 내려받을 수 있습니다.
- 화면 문구나 버튼 이름을 바꾸면 e2e도 같이 고쳐야 합니다.

## 배포

- Vercel(`vercel.json`) / Netlify(`netlify.toml`): Build `npm run build` → `dist`
- 환경 변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (같이 쓰기용)
- Vercel에서 Production 도메인 자동 연결이 꺼져 있으면, 새 배포마다 **Promote** 해야 실제 주소에 나옵니다.
- 서버 표·함수가 바뀐 업데이트는 Supabase SQL Editor에서 `supabase/secure.sql`을 다시 실행합니다 (여러 번 실행해도 안전).
- 자세한 체크리스트: [CLOUD_SETUP.md](./CLOUD_SETUP.md)

## 주의

- 같이 쓰기를 켜지 않으면 기록은 그 폰의 IndexedDB에만 있습니다. 「사진 포함 백업」이 유일한 되살리기 방법입니다.
- 매달·매주 반복 규칙, 예산, 가계부 분류는 폰마다 저장됩니다(사진 포함 백업에는 들어감). 글씨 크기·사진 선명도는 그 폰에만 남습니다. 반복은 같이 쓰는 폰 중 한 폰에서만 정하도록 안내합니다.
- 사진: 장변 1280px, JPEG 압축 (설정의 「선명하게」면 화질만 올라감)
- iOS는 Safari에서 홈 화면에 추가 후 사용을 권장합니다. HTTP(LAN IP)에서는 PWA 설치·오프라인이 제한될 수 있으니 공용 사용은 HTTPS 배포를 권장합니다.
