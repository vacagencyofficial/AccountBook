# 사입노트 — 무료 클라우드 설정 (Supabase + Vercel)

비전공자용 전체 설명은 **[사용가이드.md](./사용가이드.md)** 를 보세요.  
이 문서는 체크리스트용 요약입니다.

## 1) Supabase (무료)

1. https://supabase.com 가입 후 **New project**
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
3. Storage에 `photos` 버킷이 생겼는지 확인 (스크립트가 생성)
4. **Project Settings → API**
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`

## 2) Vercel (무료 Hobby)

1. https://vercel.com 가입
2. 이 저장소 Import 또는 Claim 링크로 프로젝트 가져오기
3. Environment Variables에 위 두 키 추가
4. Redeploy

로컬 테스트:

```bash
cp .env.example .env.local
# 값 채우기
npm run dev
```

## 3) 앱에서 연결

1. 설정 → **이 장부 클라우드에 저장하기**
2. **카톡·문자로 초대 보내기** 또는 QR 표시
3. 다른 기기는 초대 링크(`/join/SAILP-…`)만 열면 자동 연결
4. (선택) Safari/Chrome → **홈 화면에 추가** 로 PWA 설치

## 요금

- Supabase Free / Vercel Hobby 기준 **비용 0원**으로 시작
- 트래픽·용량이 커지면 각 서비스 유료 플랜으로 전환
