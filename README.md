# Journey Vault

Google 3D 지구본으로 여행지를 탐색하고, 개인 여행계획을 작성해 비밀번호로 보호하여 저장하는 Next.js 여행 플래너입니다.

## 주요 기능

### 여행지 탐색
- Google Maps JavaScript API 3D Maps 기반 지구본
- 장소 검색·자동완성·역지오코딩
- 주변 관광지, 식당, 카페, 호텔 검색
- Wikipedia 지역 소개
- PC·모바일 반응형 화면

### 개인 여행계획
- 여행 제목, 여행지, 기간, 인원, 예산, 여행 성향 입력
- 여행 날짜에 맞춘 일자별 일정 자동 생성
- 관광·식사·이동·숙소 등 세부 일정 작성
- 게시판 형태로 최신 일정부터 순서대로 표시
- 각 일정은 개별 열람 비밀번호로 보호
- 비밀번호는 원문이 아닌 PBKDF2-SHA-256 해시로 저장

### 관리자
- 환경변수 기반 관리자 로그인
- HTTP 전용 서명 쿠키로 관리자 세션 유지
- 모든 일정 전체 열람
- 일정 영구 삭제

---

## 프로젝트 구조

```text
app
├─ admin/page.tsx
├─ planner/page.tsx
├─ plans
│  ├─ page.tsx
│  └─ [id]/page.tsx
├─ api
│  ├─ plans
│  │  ├─ route.ts
│  │  └─ [id]/unlock/route.ts
│  └─ admin
│     ├─ login/route.ts
│     ├─ logout/route.ts
│     └─ plans
│        ├─ route.ts
│        └─ [id]/route.ts
├─ page.tsx
├─ layout.tsx
└─ globals.css

components
├─ AppHeader.tsx
├─ PlanDetailView.tsx
└─ 기존 Google 지도 컴포넌트

lib/server
├─ adminAuth.ts
├─ password.ts
├─ planStore.ts
└─ 기존 Google API 모듈

types
├─ plan.ts
└─ travel.ts
```

---

## 1. 환경변수

프로젝트 최상위의 `.env.local`에 입력합니다.

```env
# Google 3D 지도
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=브라우저용_지도_키
GOOGLE_MAPS_SERVER_API_KEY=서버용_지도_키
# GOOGLE_PLACES_API_KEY=기존_서버용_키

# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=서비스_역할_키

# 관리자
ADMIN_PASSWORD=관리자_비밀번호
ADMIN_SESSION_SECRET=32자_이상의_무작위_문자열
```

`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`에는 절대로 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

관리자 세션 비밀키 생성 예시:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Supabase 데이터베이스 만들기

1. Supabase에서 새 프로젝트를 만듭니다.
2. 왼쪽 메뉴에서 `SQL Editor`를 엽니다.
3. 아래 SQL을 실행합니다.

```sql
create table if not exists public.travel_plans (
  id uuid primary key,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  travelers integer not null check (travelers between 1 and 100),
  budget bigint,
  travel_style text,
  summary text,
  itinerary jsonb not null default '[]'::jsonb,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists travel_plans_created_at_idx
  on public.travel_plans (created_at desc);

alter table public.travel_plans enable row level security;
```

공개 사용자를 위한 RLS 정책은 만들지 않습니다. 브라우저에서는 Supabase에 직접 접속하지 않고, Next.js 서버 Route Handler만 서비스 역할 키를 사용합니다.

Supabase에서 복사할 값:

```text
Project Settings
→ API
→ Project URL                 → SUPABASE_URL
→ Service role secret         → SUPABASE_SERVICE_ROLE_KEY
```

서비스 역할 키는 화면이나 GitHub에 공개하면 안 됩니다.

---

## 3. Google Cloud API

활성화할 API:

```text
Maps JavaScript API
Places API (New)
Geocoding API
```

브라우저용 키는 웹사이트 HTTP 리퍼러 제한을 적용합니다.

```text
http://localhost:3000/*
https://repository-name-journey-vault.vercel.app/*
```

서버용 키는 Places API (New)와 Geocoding API만 허용합니다.

---

## 4. 로컬 설치 및 실행

```powershell
cd C:\Users\USER\journey-vault
npm.cmd install
npm.cmd run dev
```

브라우저:

```text
http://localhost:3000
```

프로덕션 빌드 확인:

```powershell
npm.cmd run build
```

---

## 5. Vercel 환경변수

Vercel 프로젝트에서 다음 경로로 들어갑니다.

```text
Settings
→ Environment Variables
```

아래 값을 `Production`, `Preview`, `Development`에 등록합니다.

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_SERVER_API_KEY
GOOGLE_PLACES_API_KEY        선택
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

저장 후 반드시 다시 배포합니다.

```text
Deployments
→ 최신 배포의 ···
→ Redeploy
```

---

## 6. 사용 순서

1. `/`에서 지구본으로 여행지를 탐색합니다.
2. `계획 만들기`에서 기본정보와 일자별 일정을 작성합니다.
3. 열람 비밀번호를 입력해 저장합니다.
4. `저장된 일정` 게시판에서 여행계획을 선택합니다.
5. 설정한 비밀번호를 입력하면 전체 일정이 표시됩니다.
6. `/admin`에서 관리자 비밀번호로 로그인하면 전체 자료를 열람하고 삭제할 수 있습니다.

---

## 보안 주의사항

- 여행 일정의 개별 비밀번호는 복구할 수 없습니다.
- 관리자 비밀번호와 Supabase 서비스 역할 키를 GitHub에 올리지 마세요.
- `.env.local`은 `.gitignore`에 의해 제외되어야 합니다.
- 공개 게시판에는 여행 제목, 여행지, 여행 기간, 인원과 여행 성향만 노출됩니다.
- 항공권 번호, 여권번호, 주민등록번호, 신용카드 정보 등 민감한 개인정보는 일정에 저장하지 않는 것이 안전합니다.
- 운영 단계에서는 Vercel Firewall 또는 별도 속도 제한 서비스를 추가해 반복적인 비밀번호 시도를 제한하는 것을 권장합니다.
