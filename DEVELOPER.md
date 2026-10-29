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

## 시험(테스트)

```bash
npm test          # 아래 둘을 한 번에
npm run test:sync # 동기화(폰 두 대 흉내)·계산·백업 알림·예산 — vitest
npm run test:sql  # supabase/secure.sql 보안·동기화 함수 36가지 — PGlite
```

- 브라우저 없이 돌아갑니다. 폰 DB는 `fake-indexeddb`, Supabase 서버는 `@electric-sql/pglite`로 흉내 냅니다.
- GitHub에 올리거나 PR을 만들면 `.github/workflows/ci.yml`이 코드 검사 → 빌드 → 시험을 자동으로 돌립니다.

## 배포

- Vercel / Netlify: `vercel.json`, `netlify.toml` 포함
- Build: `npm run build` → `dist`

## 주의

- 데이터는 기기별 IndexedDB에만 저장됩니다
- iOS는 Safari에서 홈 화면에 추가 후 사용 권장
- 사진: 장변 1280px, JPEG 압축
- HTTP(LAN IP)에서는 PWA 설치/오프라인이 제한될 수 있습니다. 공용 사용은 HTTPS 배포를 권장합니다.
