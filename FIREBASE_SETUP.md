# Journey Vault AI v3 Firebase 전환 가이드

이 브랜치는 `v2-ai-planner` 화면과 기능을 유지하면서 여행계획 저장소만 Supabase에서 Firebase Cloud Firestore로 교체한 버전입니다.

## 1. 브랜치

- 기존 안정 버전: `v2-ai-planner`
- Firebase 전환 버전: `v3-firebase`

`v2-ai-planner`는 수정하지 않습니다.

## 2. Firebase에서 사용자가 해야 하는 작업

### 2-1. Firebase 프로젝트 만들기

1. Firebase Console에 로그인합니다.
2. **프로젝트 추가**를 누릅니다.
3. 프로젝트 이름 예: `journey-vault-ai`.
4. Google Analytics는 필요하지 않으면 사용 안 함으로 둬도 됩니다.

### 2-2. Cloud Firestore 만들기

1. Firebase 프로젝트 왼쪽 메뉴에서 **빌드 > Firestore Database**를 엽니다.
2. **데이터베이스 만들기**를 누릅니다.
3. **프로덕션 모드**를 선택합니다.
4. 위치는 한국/일본에서 가까운 지원 리전을 선택합니다.
5. 생성 완료 후 데이터 탭이 열리면 정상입니다.

별도로 `travel_plans` 컬렉션을 직접 만들 필요는 없습니다. Journey Vault가 첫 저장 때 자동으로 생성합니다.

### 2-3. Firebase 서비스 계정 키 받기

1. Firebase Console 왼쪽 위 톱니바퀴 > **프로젝트 설정**.
2. **서비스 계정** 탭.
3. **새 비공개 키 생성**.
4. JSON 파일을 PC에 안전하게 저장합니다.
5. JSON에서 다음 3개 값만 사용합니다.
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

JSON 파일 자체와 private key는 GitHub에 올리지 않습니다.

## 3. 로컬 PC 설정

### 3-1. 최신 v3 브랜치 받기

```powershell
git fetch origin
git switch v3-firebase
git pull origin v3-firebase
```

### 3-2. Firebase 패키지 설치

```powershell
npm.cmd install
```

이 명령으로 `firebase-admin`도 설치됩니다.

### 3-3. `.env.local` 수정

기존 Google Maps, OpenAI, Resend, 관리자 변수는 그대로 둡니다.

아래 3개를 추가합니다.

```env
FIREBASE_PROJECT_ID=서비스계정JSON의_project_id
FIREBASE_CLIENT_EMAIL=서비스계정JSON의_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n중간키값\n-----END PRIVATE KEY-----\n"
```

`private_key`가 JSON에서 `\n` 문자를 포함하고 있으면 그 형태를 유지해서 한 줄로 넣는 것이 가장 쉽습니다.

기존 Supabase 데이터를 이전하려면 마이그레이션이 끝날 때까지만 아래 값도 남겨 둡니다.

```env
SUPABASE_URL=https://기존프로젝트.supabase.co
SUPABASE_SERVICE_ROLE_KEY=기존서비스롤키
```

## 4. 기존 Supabase 일정 Firebase로 이전

로컬 PC에서 한 번만 실행합니다.

```powershell
npm.cmd run migrate:firebase
```

정상 예:

```text
Supabase 여행계획을 읽는 중...
총 5건을 찾았습니다.
5 / 5건 이전 완료
Firebase Firestore 이전이 완료되었습니다.
```

기존 일정의 ID와 `password_hash`를 그대로 옮기므로 기존 비밀번호와 일정 ID가 유지됩니다.

Firebase Console > Firestore Database > 데이터에서 `travel_plans` 컬렉션이 생겼는지 확인합니다.

## 5. 로컬 서버 테스트

```powershell
npm.cmd run dev
```

브라우저:

```text
http://localhost:3000/api/firebase/health
```

정상이면:

```json
{"ok":true,"backend":"firebase-firestore"}
```

그 다음 아래 기능을 순서대로 시험합니다.

1. 저장된 일정 목록 열기
2. 기존 일정 비밀번호로 열기
3. 새 여행계획 저장
4. AI 일정 수정 후 덮어쓰기
5. 관리자에서 목록 확인
6. 테스트 일정 삭제

## 6. Vercel 설정

Vercel의 `journey-vault-ai` 프로젝트 > **Environment Variables**에 다음 3개를 추가합니다.

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

적용 환경은 v3 시험 중에는 최소 `Preview`를 선택합니다.

`FIREBASE_PRIVATE_KEY` Value에는 서비스 계정 JSON의 `private_key` 값을 넣습니다. Vercel은 멀티라인 값도 저장할 수 있습니다.

기존 환경변수는 그대로 유지합니다.

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_SERVER_API_KEY
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
OPENAI_API_KEY
OPENAI_MODEL
RESEND_API_KEY
RESEND_FROM_EMAIL
```

Firebase 전환 확인이 끝난 뒤에는 실행용 환경에서 다음 Supabase 변수는 더 이상 필요하지 않습니다.

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

단, 데이터 이전을 다시 실행할 가능성이 있으면 로컬 `.env.local`에는 잠시 보관할 수 있습니다.

## 7. Vercel Preview 확인

`v3-firebase` 브랜치를 push하면 Vercel Git 연동이 되어 있는 경우 Preview 배포가 자동 생성됩니다.

배포 후 다음 주소를 확인합니다.

```text
https://Preview주소/api/firebase/health
```

`ok: true`이면 Firebase 서버 연결이 정상입니다.

그 다음 실제 Journey Vault 화면에서 저장/열기/수정/삭제를 시험합니다.

## 8. Firestore 보안

이 버전은 브라우저에서 Firestore를 직접 연결하지 않습니다.

```text
브라우저 → Vercel Next.js API → Firebase Admin SDK → Firestore
```

따라서 Firestore는 클라이언트 직접 접근을 허용할 필요가 없습니다. 저장소의 `firestore.rules`는 모든 직접 클라이언트 read/write를 거부하도록 작성되어 있습니다.

## 9. 전환 완료 후

Firebase Preview에서 모든 기능이 정상임을 확인한 다음에만 Production으로 전환합니다.

기존 `v2-ai-planner` 브랜치는 삭제하지 않습니다. 문제가 생기면 언제든 기존 버전으로 돌아갈 수 있습니다.
