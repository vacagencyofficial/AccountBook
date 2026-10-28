# 사입노트

동대문 도매 사입 현장에서 **사진 · 가게 · 금액 · 메모**를 기록하고,  
**PWA(홈 화면 앱)** 으로 쓰며, **Supabase 무료 클라우드**로 기기 간 동기화할 수 있는 모바일 웹앱입니다.

## 기능

- 카메라 촬영 / 갤러리 첨부
- 가게·단가·수량·메모·카테고리 저장
- 오늘/월 합계, 필터, 엑셀 내보내기
- ZIP 백업/복원
- PWA 홈 화면 설치
- 클라우드 동기화 (워크스페이스 코드)

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # Supabase 키 입력 (없으면 로컬만 동작)
npm run dev
```

`http://localhost:43123`

## 클라우드·배포 (무료)

자세한 절차: **[CLOUD_SETUP.md](./CLOUD_SETUP.md)**

1. Supabase Free 프로젝트 + `supabase/schema.sql` 실행  
2. Vercel Hobby에 배포 + 환경 변수 2개  
3. 앱 설정에서 워크스페이스 코드로 동기화  
4. 폰에서 **홈 화면에 추가**

## 기술

- Vite + React + Tailwind
- Dexie (오프라인 IndexedDB)
- Supabase (Postgres + Storage)
- vite-plugin-pwa
