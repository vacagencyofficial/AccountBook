# 사입노트

동대문 도매 사입 현장에서 **사진 · 가게 · 금액 · 메모**를 빠르게 기록하고, PC에서 **엑셀**로 정리하는 개인용 모바일 웹앱(PWA)입니다.

AI 자동 인식 없이, 현장에서 직접 찍고 직접 적는 장부입니다.

## 주요 기능

- 카메라 촬영 후 가게·단가·수량·메모·카테고리 저장
- 오늘/이번 달 합계, 가게별·카테고리별 집계
- 내역 필터·검색, 엑셀 내보내기(요약 시트 포함)
- ZIP 백업/복원, 오프라인 PWA

## 실행 (로컬 · 같은 Wi‑Fi의 다른 기기)

```bash
npm install
npm run dev
```

서버는 `0.0.0.0:43123`에 바인딩됩니다.

- 이 PC: `http://localhost:43123`
- 같은 네트워크의 폰/다른 PC: `http://<이-PC-의-IP>:43123`

IP 확인 예:

```bash
# macOS / Linux
ipconfig getifaddr en0   # 또는
hostname -I
```

방화벽이 있다면 **43123** 포트 인바운드를 허용하세요.

## 빌드 후 실행 (다른 네트워크/배포용)

```bash
npm run build
npm start
```

`npm start`도 `0.0.0.0:43123`에서 정적 빌드를 제공합니다.

### 인터넷에 올려서 어디서든 쓰기

정적 사이트이므로 Vercel / Netlify에 올리면 됩니다.

- Build: `npm run build`
- Output: `dist`
- SPA 리다이렉트 설정은 `vercel.json` / `netlify.toml`에 포함되어 있습니다

## 기술 스택

- Vite + React
- Tailwind CSS
- Dexie (IndexedDB)
- exceljs / jszip
- vite-plugin-pwa

## 데이터

모든 데이터는 **접속한 기기 로컬 IndexedDB**에 저장됩니다. 서버·로그인·동기화는 없습니다.
기기마다 데이터가 따로 있으니, 옮길 때는 설정에서 ZIP 백업/복원을 사용하세요.
