# 사입노트 (Sailp)

동대문 **사입(상품)** 과 일상 **가계부(지출·수입)** 를 한곳에서 적는 모바일 장부입니다.  
**Supabase**로 다른 폰과 맞추고, **Vercel**로 배포합니다.

## 안내서

👉 **[사용가이드.md](./사용가이드.md)** — 최신판  
👉 **[쉬운 사용 안내 PDF](./docs/사입노트_쉬운안내.pdf)** — 처음 쓰는 분용 (화면 사진 · 큰 글씨)  
앱 안에서도 **설정 → 도움말**을 볼 수 있습니다.

## 저장소

https://github.com/vacagencyofficial/AccountBook

## 되는 것 (요약)

- 상품 입력 (사진 · 가게 · 가격 · 개수)
- 돈 쓴 것 / 돈 들어온 것 (분류 · 반복 매달·매주)
- 한 달 결산 · 이번 주 비교 · 통계(지난달·작년·한 해)
- 예산 · 분류별 예산 · 외상 갚기
- 엑셀 받기/넣기(월별 결산 시트 포함) · 사진 포함 백업
- 사진 모아 보기 · 별표 · 판매가·남는 돈
- 초대 링크·QR로 다른 폰과 같이 쓰기
- 글씨 크기 · 홈 화면 추가

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:43123`

클라우드: **[CLOUD_SETUP.md](./CLOUD_SETUP.md)** (`schema.sql` 후 `secure.sql` 필수)

## 기술

Vite · React · Tailwind · Dexie · Supabase · vite-plugin-pwa
