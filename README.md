# 사입노트 (Sailp)

동대문 도매 사입 현장에서 **사진 · 가게 · 금액 · 메모**를 기록하는 모바일 웹앱(PWA)입니다.  
기기 간 동기화는 **Supabase 무료 클라우드**, 배포는 **Vercel**을 사용합니다.

## 비전공자용 설명서 (필독)

👉 **[사용가이드.md](./사용가이드.md)**

1. 프로젝트 개요  
2. 기능 정리  
3. 배포 방법  
4. 클라우드 방법  
5. 이후 기능 수정 및 반영  

## 저장소

https://github.com/vacagencyofficial/AccountBook

## 빠른 기능 요약

- 카메라 촬영 / 갤러리 첨부
- 가게 · 단가 · 수량 · 메모 · 카테고리
- 오늘/월 합계, 필터
- 엑셀 내보내기 · 불러오기
- ZIP 백업/복원
- 홈 화면 설치(PWA)
- 워크스페이스 코드로 클라우드 동기화

## 로컬에서 실행 (개발자)

```bash
npm install
cp .env.example .env.local   # Supabase 키 (없으면 로컬만)
npm run dev
```

`http://localhost:43123`

클라우드만 빠르게 보려면: **[CLOUD_SETUP.md](./CLOUD_SETUP.md)**

## 기술

Vite · React · Tailwind · Dexie · Supabase · vite-plugin-pwa
