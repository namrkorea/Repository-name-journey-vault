let loaderPromise: Promise<void> | null = null;

type GoogleMapsWindow = Window & {
  google?: {
    maps?: {
      importLibrary?: (libraryName: string) => Promise<unknown>;
    };
  };

  // Google 지도 로딩 완료 후 실행되는 전역 함수입니다.
  __worldTravelGoogleMapsReady?: () => void;
};

/**
 * Google Maps JavaScript API를 한 번만 불러옵니다.
 *
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY는 브라우저에 노출되는 키이므로
 * Google Cloud에서 HTTP 리퍼러 제한을 설정해야 합니다.
 */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google 지도는 브라우저에서만 불러올 수 있습니다."),
    );
  }

  const mapsWindow = window as GoogleMapsWindow;

  // 이미 Google Maps API가 준비된 경우 다시 불러오지 않습니다.
  if (mapsWindow.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  // 이미 불러오는 중이면 같은 작업을 기다립니다.
  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise<void>((resolve, reject) => {
    let completed = false;
    let timeoutId: number | undefined;

    function cleanup() {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      delete mapsWindow.__worldTravelGoogleMapsReady;
    }

    function fail(message: string) {
      if (completed) return;

      completed = true;
      cleanup();

      // 다음 시도에서 다시 로드할 수 있도록 초기화합니다.
      loaderPromise = null;

      reject(new Error(message));
    }

    // Google API가 완전히 준비된 후 호출됩니다.
    mapsWindow.__worldTravelGoogleMapsReady = () => {
      if (completed) return;

      if (!mapsWindow.google?.maps?.importLibrary) {
        fail(
          "Google Maps API는 불러왔지만 importLibrary를 사용할 수 없습니다.",
        );
        return;
      }

      completed = true;
      cleanup();
      resolve();
    };

    // 개발 중 이전 코드로 추가된 스크립트가 남아 있으면 제거합니다.
    document
      .querySelectorAll<HTMLScriptElement>(
        'script[data-world-travel-google-maps="true"]',
      )
      .forEach((script) => script.remove());

    const script = document.createElement("script");

    const params = new URLSearchParams({
      key: apiKey,
      loading: "async",
      libraries: "maps3d",
      language: "ko",
      region: "KR",

      // Google Maps API가 완전히 준비된 뒤 실행할 함수입니다.
      callback: "__worldTravelGoogleMapsReady",
    });

    script.src =
      `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

    script.async = true;
    script.dataset.worldTravelGoogleMaps = "true";

    script.onerror = () => {
      fail(
        "Google 지도 스크립트를 불러오지 못했습니다. API 키와 인터넷 연결을 확인해 주세요.",
      );
    };

    document.head.appendChild(script);

    // 무한정 기다리지 않도록 15초 후 오류 처리합니다.
    timeoutId = window.setTimeout(() => {
      fail(
        "Google 지도 로딩 시간이 초과되었습니다. API 키, 결제 및 웹사이트 제한을 확인해 주세요.",
      );
    }, 15_000);
  });

  return loaderPromise;
}