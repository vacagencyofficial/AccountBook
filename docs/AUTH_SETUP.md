# 간편 로그인 설정 (카카오 · Google · Apple)

로그인은 **선택**이에요. 로그인하지 않아도 지금처럼 이 폰에만 저장하며 쓸 수 있고,
장부 번호·초대 링크로 같이 쓰는 방식도 그대로 동작해요.

## 1) SQL 실행

Supabase → SQL Editor에서 순서대로 실행 (여러 번 실행해도 안전):

1. `supabase/schema.sql`
2. `supabase/secure.sql`
3. **`supabase/auth.sql`** ← 새로 추가 (계정 ↔ 장부 연결, 회원 탈퇴)

## 2) 돌아올 주소 등록

Supabase → **Authentication → URL Configuration**

- Site URL: `https://<배포 도메인>`
- Redirect URLs에 추가
  - `https://<배포 도메인>/auth/callback`
  - `http://localhost:43123/auth/callback` (로컬 개발)

각 로그인 회사 콘솔에는 Supabase 주소를 등록해요:
`https://<프로젝트>.supabase.co/auth/v1/callback`

## 3) 로그인 회사별 설정

Supabase → **Authentication → Sign In / Providers** 에서 켜고 키를 넣어요.

### 카카오
1. https://developers.kakao.com → 애플리케이션 추가
2. 앱 키의 **REST API 키** → Supabase Kakao의 Client ID
3. 카카오 로그인 → 활성화, Redirect URI에 위 Supabase 주소 등록
4. 보안 → **Client Secret** 발급·활성화 → Supabase의 Client Secret
5. 동의항목: 닉네임·프로필 사진. 이메일(account_email)은 비즈 앱 전환이 필요할 수 있어요.
   이메일 없이 쓰려면 Supabase Kakao 설정의 이메일 없는 사용자 허용 옵션을 켜 주세요.

### Google
1. Google Cloud Console → API 및 서비스 → OAuth 동의 화면 설정
2. 사용자 인증 정보 → OAuth 클라이언트 ID(웹 애플리케이션)
3. 승인된 리디렉션 URI에 위 Supabase 주소 등록
4. Client ID / Secret → Supabase Google 설정

### Apple (iOS 앱 출시 시 필수)
1. Apple Developer(유료 계정) → Identifiers에서 **Services ID** 생성, Sign in with Apple 켜기
2. Return URL에 위 Supabase 주소 등록
3. Keys에서 Sign in with Apple 키 생성
4. Supabase Apple 설정에 Services ID와 키 정보 입력
5. Apple의 Client Secret은 **6개월마다 다시 만들어야** 해요 (만료되면 Apple 로그인만 막힘)

## 4) 앱에 보일 버튼 고르기

`.env.local` 또는 Vercel 환경 변수:

```
VITE_AUTH_PROVIDERS=kakao,google        # Apple 준비 전이면 이렇게
```

비워 두면 세 가지 모두 보여요. Supabase에서 켜지 않은 회사 버튼을 누르면 오류가 나니,
켠 것만 적어 주세요.

## 동작 요약

| 상황 | 로그인하면 |
|---|---|
| 처음 쓰는 폰, 게스트 기록 있음 | 계정에 새 장부를 만들고 이 폰 기록을 올림 |
| 장부 번호로 같이 쓰던 폰 | 그 장부를 계정에 연결 |
| 새 폰(빈 폰) | 계정 장부를 불러옴 |
| 다른 장부를 쓰던 폰 | 「합치기 / 이 폰 기록 지우기」 중 고름 |
| 로그인한 채 초대 링크 열기 | 초대받은 장부를 계정에도 연결 |
| 로그아웃 | 남은 기록을 올린 뒤 이 폰 기록을 지움 (계정 장부는 그대로) |
| 회원 탈퇴 | 혼자 쓰던 장부·사진·계정 삭제, 다른 계정과 같이 쓰던 장부는 연결만 끊음 |
