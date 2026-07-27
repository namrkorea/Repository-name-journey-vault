# World Travel Explorer

Google Maps Platform의 **3D Maps**, Places API (New), Geocoding API와 Wikipedia를 결합한 반응형 여행 탐색 홈페이지입니다.

## 주요 기능

- 전체 화면 HYBRID 모드 3D 지구본
- 마우스·손가락 회전, 휠·핀치 확대/축소
- 초기 자동 회전 및 사용자 조작 시 중지
- 장소 자동완성 최대 5개
- 지구본 클릭 좌표 역지오코딩
- 검색 위치로 자연스러운 카메라 비행
- 주변 관광지·박물관·공원·식당·카페·호텔 검색
- 3D 마커 및 상세 정보
- Google Places 사진과 사진 제공자 표기
- 한국어 Wikipedia 우선, 없으면 영어 Wikipedia
- 최근 검색 10개 localStorage 저장 및 삭제
- PC 우측 패널 / 모바일 바텀시트
- 다크·라이트 모드

---

## 1. 프로젝트 폴더 구조

```text
world-travel-explorer
├─ app
│  ├─ api
│  │  ├─ autocomplete/route.ts
│  │  ├─ country/route.ts
│  │  ├─ nearby/route.ts
│  │  ├─ photo/route.ts
│  │  ├─ place/route.ts
│  │  ├─ reverse-geocode/route.ts
│  │  ├─ search/route.ts
│  │  └─ wiki/route.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components
│  ├─ ErrorMessage.tsx
│  ├─ FallbackGlobe.tsx
│  ├─ GlobeMap.tsx
│  ├─ LoadingOverlay.tsx
│  ├─ LocationPanel.tsx
│  ├─ MobileBottomSheet.tsx
│  ├─ NearbyMarkers.tsx
│  ├─ PhotoGallery.tsx
│  ├─ PlaceCard.tsx
│  ├─ PlaceDetail.tsx
│  ├─ RecentSearches.tsx
│  ├─ SearchBar.tsx
│  └─ SearchSuggestions.tsx
├─ lib
│  ├─ server
│  │  ├─ google.ts
│  │  └─ normalize.ts
│  ├─ clientApi.ts
│  ├─ format.ts
│  └─ googleMapsLoader.ts
├─ types/travel.ts
├─ .env.example
├─ .gitignore
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ README.md
└─ tsconfig.json
```

---

## 2. Google Cloud에서 활성화할 API

프로젝트에서 다음 세 API를 활성화합니다.

1. **Maps JavaScript API** — 브라우저의 3D 지구본
2. **Places API (New)** — 자동완성, 장소 상세, 주변 검색, 사진
3. **Geocoding API** — 지구본 클릭 위치의 역지오코딩

결제 계정도 해당 Google Cloud 프로젝트에 연결해야 합니다.

---

## 3. API 키를 두 개로 분리

### A. 브라우저 지도용 키

- API 제한: `Maps JavaScript API`
- 애플리케이션 제한: `웹사이트`
- 허용 리퍼러 예시:

```text
http://localhost:3000/*
https://내-프로젝트.vercel.app/*
https://내도메인.com/*
```

### B. 서버용 비밀 키

- API 제한: `Places API (New)`, `Geocoding API`
- 이 키는 `.env.local`과 Vercel 환경변수에만 저장합니다.
- `NEXT_PUBLIC_`을 붙이면 안 됩니다.

---

## 4. 환경변수 만들기

프로젝트 최상위에 `.env.local`을 만듭니다.

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=브라우저_지도용_키
GOOGLE_MAPS_SERVER_API_KEY=서버용_비밀_키
```

기존에 아래 이름으로 만든 키도 서버 코드가 읽습니다.

```env
GOOGLE_PLACES_API_KEY=기존_서버용_키
```

API 키가 보이는 화면은 사진으로 공유하지 마세요. 노출된 키는 Google Cloud에서 즉시 삭제하고 새로 발급합니다.

---

## 5. 설치와 실행

PowerShell 보안 정책 때문에 `npm` 실행이 차단되는 컴퓨터에서는 `.cmd`를 붙입니다.

```powershell
cd C:\Users\USER\world-travel-explorer
npm.cmd install
npm.cmd run dev
```

브라우저에서 엽니다.

```text
http://localhost:3000
```

일반 명령 프롬프트에서는 다음도 가능합니다.

```cmd
npm install
npm run dev
```

---

## 6. 기존 프로젝트에 적용하는 방법

1. 실행 중인 서버를 `Ctrl + C`로 중지합니다.
2. 기존 폴더를 별도 위치에 백업합니다.
3. 이 패키지의 `app`, `components`, `lib`, `types` 폴더와 설정 파일을 기존 프로젝트로 복사합니다.
4. 기존 `.env.local`은 삭제하지 말고 필요한 두 환경변수를 추가합니다.
5. 아래 명령을 실행합니다.

```powershell
npm.cmd install
npm.cmd run dev
```

---

## 7. 기능 확인 순서

1. 초기화면에 3D 지구본이 표시되는지 확인
2. 파리, 도쿄 등 인기 여행지 버튼 클릭
3. 검색창에 두 글자 이상 입력해 추천 목록 확인
4. 추천 결과를 선택했을 때 카메라가 이동하는지 확인
5. 지구본의 육지 위치를 클릭해 지역 패널이 열리는지 확인
6. 관광지·카페·식당·호텔 필터 변경
7. 장소 카드를 눌러 3D 마커 이동 및 상세 패널 확인
8. 모바일 개발자 도구에서 바텀시트 확인

---

## 8. 자주 발생하는 오류

### 3D 지구본 대신 안내용 지구가 보임

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`가 없거나 Maps JavaScript API가 비활성화된 상태입니다. 키를 넣은 뒤 서버를 다시 시작하세요.

```powershell
Ctrl + C
npm.cmd run dev
```

### 자동완성 또는 주변 검색 오류

- Places API (New) 활성화 여부
- 서버 키의 API 제한
- 결제 계정 연결 여부
- `.env.local`이 `package.json`과 같은 최상위에 있는지 확인

### 지구본 클릭 위치를 찾지 못함

바다나 매우 넓은 지역은 역지오코딩 결과가 없을 수 있습니다. 도시 또는 육지의 지명 근처를 클릭하세요.

### 사진이 보이지 않음

Place Photo 이름은 만료될 수 있으므로 사진 URL을 데이터베이스에 장기 저장하지 마세요. 이 프로젝트는 매 검색 응답에서 받은 최신 사진 이름을 사용합니다.

---

## 9. Vercel 배포

1. GitHub 저장소에 프로젝트를 업로드합니다. `.env.local`은 업로드하지 않습니다.
2. Vercel에서 `Add New Project` → GitHub 저장소 선택
3. Vercel `Settings` → `Environment Variables`에 아래 값을 추가

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_SERVER_API_KEY
```

4. 배포 후 브라우저 키의 HTTP 리퍼러에 Vercel 주소를 추가합니다.
5. 다시 배포합니다.

---

## 10. 비용과 보안

- Google API는 요청한 필드에 따라 과금될 수 있습니다.
- Route Handler는 필요한 FieldMask만 요청합니다.
- 자동완성은 360ms 디바운스와 최소 2글자 조건을 사용합니다.
- 요청 중복은 자동완성 디바운스로 줄이며, Wikipedia와 국가 기본정보만 서버 메모리 TTL 캐시를 사용합니다. Google Places 사진 이름과 장소 응답은 정책과 만료 가능성을 고려해 영구 저장하지 않습니다.
- 운영 서비스에서는 Google Cloud의 할당량, 예산 알림, API별 사용량을 설정하세요.
