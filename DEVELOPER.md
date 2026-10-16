# 사입노트 — 개발자 안내

동대문 도매 사입 현장용 개인 모바일 웹앱(PWA)입니다.
서버 없이 IndexedDB(Dexie)에 저장하며, 오프라인에서 동작합니다.

## 실행

```bash
npm install
npm run dev
```

`http://localhost:43123`

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

## 데이터 모델

- `shops` — 가게/상가
- `items` — 품명, 카테고리, 단가, 수량, 상태, 메모
- `photos` — 상품 사진 Blob

## 주의

- 데이터는 기기별 IndexedDB에만 저장됩니다
- iOS는 Safari에서 홈 화면에 추가 후 사용 권장
- 사진: 장변 1280px, JPEG 압축
