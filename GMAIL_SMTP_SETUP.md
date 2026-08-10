# Journey Vault AI - Gmail SMTP 직접 발송 설정

이 버전은 Firebase Trigger Email Extension을 사용하지 않습니다.
여행계획 저장 후 Vercel/Next.js 서버가 Gmail SMTP(`smtp.gmail.com:465`)에 직접 연결하여 이메일을 전송합니다.

구조:

`Journey Vault -> Vercel Next.js API -> Gmail SMTP -> 수신자`

Firebase는 계속 여행계획 저장용 Firestore로 사용하며, 이메일 때문에 Blaze 요금제로 업그레이드할 필요는 없습니다.

## 1. Gmail 계정 준비

개인 Gmail 계정을 사용합니다. 가능하면 Journey Vault 전용 Gmail 계정을 권장합니다.

1. Google 계정 > 보안 및 로그인으로 이동합니다.
2. 2단계 인증을 켭니다.
3. Google 계정에서 `앱 비밀번호`를 검색합니다.
4. 앱 이름에 `Journey Vault`를 입력합니다.
5. 생성된 16자리 앱 비밀번호를 안전하게 보관합니다.

일반 Gmail 로그인 비밀번호를 SMTP 비밀번호로 사용하지 않습니다.

## 2. 로컬 PC 설정

프로젝트의 `.env.local`에 아래 2개만 추가합니다.

```env
GMAIL_SMTP_USER=본인Gmail주소@gmail.com
GMAIL_SMTP_APP_PASSWORD=16자리앱비밀번호
```

앱 비밀번호가 화면에서 `abcd efgh ijkl mnop`처럼 공백 포함으로 보이더라도 코드에서 공백은 자동 제거됩니다.

## 3. 코드 받기

```powershell
git switch v3-firebase
git pull origin v3-firebase
npm.cmd run dev
```

브라우저에서 `/planner`를 열면 `이메일로 일정 보내기 · 선택사항` 입력란이 표시됩니다.

## 4. 로컬 테스트

1. 테스트 여행계획을 만듭니다.
2. 이메일 입력란에 본인의 다른 이메일 주소를 입력합니다.
3. 여행계획 저장을 누릅니다.
4. `이메일 전송 완료` 메시지가 나오면 Gmail SMTP 서버가 메일을 접수한 것입니다.
5. 수신 메일함과 스팸함을 확인합니다.

## 5. Vercel 설정

Vercel > Journey Vault 프로젝트 > Settings > Environment Variables에서 아래 2개를 추가합니다.

```text
GMAIL_SMTP_USER
GMAIL_SMTP_APP_PASSWORD
```

처음에는 Preview 환경에 넣고 `v3-firebase` Preview로 테스트합니다.
정상 확인 후 Production 환경에도 같은 2개를 추가합니다.

환경변수를 추가하거나 변경한 뒤에는 새 배포가 필요합니다.

## 6. 더 이상 필요 없는 이메일 설정

이 Gmail SMTP 직접 발송 방식에서는 다음 항목이 필요하지 않습니다.

```text
FIREBASE_MAIL_COLLECTION
Firebase Trigger Email Extension
RESEND_API_KEY
RESEND_FROM_EMAIL
```

기존 값이 남아 있어도 새 메일 전송 코드는 사용하지 않습니다.

## 7. 보안

- Gmail 일반 비밀번호를 사용하지 않습니다.
- Gmail 앱 비밀번호를 GitHub에 올리지 않습니다.
- 앱 비밀번호 화면을 캡처해 공유하지 않습니다.
- `.env.local`은 GitHub에 커밋하지 않습니다.
- Google 계정 비밀번호 변경 등으로 앱 비밀번호가 무효화되면 새 앱 비밀번호를 만든 뒤 로컬과 Vercel 환경변수만 교체합니다.
