# Google 로그인/회원가입 시 400 에러 해결 (Clerk + Google OAuth)

회원가입 또는 로그인에서 **"400. That's an error."** (Bad Request)가 나오면, 대부분 **Google Cloud Console의 리디렉트 URI 설정**이 Clerk와 맞지 않아서입니다.

## 해결 순서

### 1. Clerk 대시보드에서 Google 리디렉트 URI 확인

1. [Clerk Dashboard](https://dashboard.clerk.com) 로그인
2. **User & Authentication** → **Social connections** (또는 **SSO**) 이동
3. **Google** 선택 후 **Configure** (또는 "Use custom credentials" 사용 시)
4. **Authorized redirect URI** 로 표시된 URL을 **그대로 복사** (예: `https://xxxx.clerk.accounts.dev/v1/oauth_callback` 형태)

### 2. Google Cloud Console에서 OAuth 클라이언트 설정

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. **OAuth 2.0 Client IDs**에서 사용 중인 클라이언트 선택 (또는 **Create Credentials** → **OAuth client ID**)
3. **Application type**: **Web application** 선택
4. **Authorized redirect URIs**에 **1번에서 복사한 Clerk 리디렉트 URI를 그대로 붙여넣기**
   - 한 글자도 틀리면 400 에러 발생 (http/https, 끝의 `/` 유무 등 정확히 일치해야 함)
5. **Authorized JavaScript origins**에 다음 추가:
   - 로컬: `http://localhost:3000` (사용 중인 포트로 변경)
   - 운영: `https://your-domain.com` (실제 서비스 도메인)
6. **Save** 후 변경 사항 반영까지 1~2분 기다리기

### 3. Clerk에 Google Client ID / Secret 입력

1. Google Cloud Console에서 해당 OAuth 클라이언트의 **Client ID**, **Client secret** 복사
2. Clerk Dashboard → Google 설정 화면에서 **Client ID**, **Client secret** 입력 후 저장

### 4. 확인 사항

- **리디렉트 URI**: Clerk에 표시된 값과 Google Console에 등록한 값이 **완전히 동일**한지 확인
- **JavaScript origins**: 앱이 뜨는 주소(예: `http://localhost:3000`)가 등록되어 있는지 확인
- 개발용과 운영용을 다른 OAuth 클라이언트로 쓰는 경우, 각각에 맞는 리디렉트 URI를 모두 등록

이후 브라우저 캐시를 비우거나 시크릿 창에서 다시 **회원가입/로그인**을 시도해 보세요.
