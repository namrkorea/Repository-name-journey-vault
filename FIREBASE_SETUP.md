# Journey Vault AI v3 Firebase 전환 가이드

이 브랜치는 `v2-ai-planner` 화면과 기능을 유지하면서 여행계획 저장소만 Supabase에서 Firebase Cloud Firestore로 교체한 버전입니다.

## 1. 브랜치

- 기존 안정 버전: `v2-ai-planner`
- Firebase 전환 버전: `v3-firebase`

`v2-ai-planner`는 수정하지 않습니다.

## 2. Firebase 설정

Firebase 프로젝트에서 Cloud Firestore를 사용하고, 서버 연결용 서비스 계정 JSON의 다음 3개 값을 로컬/Vercel 환경변수로 등록합니다.

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

여행계획 데이터는 `travel_plans` 컬렉션에 저장됩니다.

## 3. 로컬 PC

```powershell
git fetch origin
git switch v3-firebase
git pull origin v3-firebase
npm.cmd install
```

`.env.local`에는 기존 Firebase, Google Maps, OpenAI, 관리자 설정을 유지합니다.

## 4. 기존 Supabase 일정 이전

필요한 경우 한 번만 실행합니다.

```powershell
npm.cmd run migrate:firebase
```

기존 일정 ID와 비밀번호 해시를 그대로 옮깁니다.

## 5. Firebase 연결 테스트

```powershell
npm.cmd run dev
```

브라우저에서 다음을 확인합니다.

```text
http://localhost:3000/api/firebase/health
```

정상 응답:

```json
{"ok":true,"backend":"firebase-firestore"}
```

## 6. Gmail SMTP 직접 발송

Firebase Trigger Email Extension은 사용하지 않습니다.
Journey Vault의 Next.js 서버가 Gmail SMTP에 직접 연결해 이메일을 보냅니다.

`.env.local`에 아래 2개를 추가합니다.

```env
GMAIL_SMTP_USER=본인Gmail주소@gmail.com
GMAIL_SMTP_APP_PASSWORD=Google앱비밀번호16자리
```

Google 계정에는 2단계 인증이 켜져 있어야 하며, 일반 Gmail 로그인 비밀번호가 아니라 앱 비밀번호를 사용합니다.

상세 절차는 `GMAIL_SMTP_SETUP.md`를 참고합니다.

## 7. Vercel 설정

Vercel 프로젝트 > Settings > Environment Variables에 기존 Firebase 변수와 함께 다음 2개를 추가합니다.

```text
GMAIL_SMTP_USER
GMAIL_SMTP_APP_PASSWORD
```

처음에는 `Preview` 환경에서 `v3-firebase` 브랜치를 테스트한 뒤 정상 확인 후 Production에도 적용합니다.

환경변수 변경 후에는 새 배포가 필요합니다.

## 8. 더 이상 필요 없는 이메일 항목

새 Gmail SMTP 직접 발송 코드에서는 다음 항목을 사용하지 않습니다.

```text
FIREBASE_MAIL_COLLECTION
Firebase Trigger Email Extension
RESEND_API_KEY
RESEND_FROM_EMAIL
```

기존 값이 남아 있어도 새 코드에서는 참조하지 않습니다.

## 9. 전환 완료

Firebase 저장/조회/수정/삭제와 Gmail 이메일 전송을 Preview에서 모두 확인한 다음 Production으로 전환합니다.

기존 `v2-ai-planner` 브랜치는 삭제하지 않습니다.
