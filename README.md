# 사입노트

동대문 도매 사입 현장에서 **사진 · 가게 · 금액 · 메모**를 빠르게 기록하고, PC에서 **엑셀**로 정리하는 개인용 모바일 웹앱(PWA)입니다.

AI 자동 인식 없이, 현장에서 직접 찍고 직접 적는 장부입니다.

## 주요 기능

- 카메라 촬영 후 가게·단가·수량·메모·카테고리 저장
- 오늘/이번 달 합계, 가게별·카테고리별 집계
- 내역 필터·검색, 엑셀 내보내기(요약 시트 포함)
- ZIP 백업/복원, 오프라인 PWA

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:43123` 접속

## 빌드

```bash
npm run build
npm run preview
```

## 기술 스택

- Vite + React
- Tailwind CSS
- Dexie (IndexedDB)
- exceljs / jszip
- vite-plugin-pwa

## 데이터

모든 데이터는 **기기 로컬 IndexedDB**에 저장됩니다. 서버·로그인·동기화는 없습니다.
