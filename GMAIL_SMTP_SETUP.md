# Journey Vault AI - Gmail SMTP 설정

이 버전은 여행계획 저장 시 Firestore의 `mail` 컬렉션에 이메일 발송 요청 문서를 만들고, Firebase Trigger Email Extension이 Gmail SMTP를 통해 실제 메일을 보냅니다.

구조:

`Journey Vault -> Vercel API -> Firestore mail -> Firebase Trigger Email -> Gmail SMTP -> 수신자`

## 1. Gmail 계정 준비

개인 Gmail 계정을 사용합니다. 가능하면 Journey Vault 전용 Gmail 계정을 권장합니다.

1. Google 계정 > 보안 및 로그인으로 이동합니다.
2. 2단계 인증을 켭니다.
3. Google 계정에서 `앱 비밀번호`를 검색합니다.
4. 앱 이름에 `Journey Vault Firebase`를 입력합니다.
5. 생성된 16자리 앱 비밀번호를 안전하게 보관합니다.

일반 Gmail 비밀번호를 SMTP 비밀번호로 사용하지 않습니다.

## 2. Firebase Blaze 요금제

Firebase Extension 설치를 위해 프로젝트가 Blaze 요금제여야 합니다.

Firebase Console > 프로젝트 > 사용량 및 결제에서 Blaze로 업그레이드합니다.

## 3. Trigger Email Extension 설치

Firebase Console > Extensions에서 `Trigger Email` 또는 `firestore-send-email`을 찾아 설치합니다.

설치 중 다음 값을 사용합니다.

- Email documents collection: `mail`
- SMTP host: `smtp.gmail.com`
- SMTP port: `465`
- SMTP security: SSL / SMTPS
- SMTP username: 본인의 전체 Gmail 주소
- SMTP password: Google에서 만든 16자리 앱 비밀번호
- Default FROM address: `Journey Vault AI <본인Gmail주소>`
- Default REPLY-TO address: 필요하면 본인 Gmail 주소

Extension 화면에서 SMTP connection URI를 한 줄로 요구하면 개념적으로 `smtps://GMAIL주소@smtp.gmail.com:465`를 사용하고, 비밀번호 입력칸에는 16자리 앱 비밀번호를 넣습니다. 화면에서 Username/Host/Port를 각각 받는 경우 각각 분리하여 입력합니다.

## 4. Journey Vault 로컬 설정

`.env.local`에는 Firebase 서버 연결 값이 있어야 합니다.

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."
FIREBASE_MAIL_COLLECTION=mail
```

Gmail 주소와 앱 비밀번호는 `.env.local`, GitHub 또는 Vercel에 넣지 않습니다. Firebase Trigger Email Extension 설정에만 입력합니다.

## 5. 코드 받기

```powershell
git switch v3-firebase
git pull origin v3-firebase
npm.cmd run dev
```

브라우저에서 `/planner`를 열면 열람 비밀번호 아래에 `이메일로 일정 보내기 · 선택사항`이 다시 표시됩니다.

## 6. 테스트

1. 테스트 여행계획을 만듭니다.
2. 이메일 입력란에 본인의 다른 이메일 주소를 입력합니다.
3. 여행계획을 저장합니다.
4. Firebase Console > Firestore Database > Data > `mail`을 확인합니다.
5. 새 문서의 `delivery.state`가 `SUCCESS`가 되는지 확인합니다.
6. 수신 메일함과 스팸함을 확인합니다.

정상 처리 상태는 `PENDING -> PROCESSING -> SUCCESS` 순서입니다. 실패 시 `ERROR`와 오류 메시지를 확인합니다.

## 7. 보안

- Gmail 일반 비밀번호를 사용하지 않습니다.
- 16자리 앱 비밀번호를 GitHub에 올리지 않습니다.
- 앱 비밀번호 화면을 캡처해 공유하지 않습니다.
- Google 계정 비밀번호를 변경하면 기존 앱 비밀번호가 폐기될 수 있으므로 새 앱 비밀번호를 만들어 Firebase Extension에 다시 입력합니다.
