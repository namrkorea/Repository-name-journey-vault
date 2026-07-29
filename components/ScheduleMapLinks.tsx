"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PLACE_SELECTOR = 'input[placeholder="장소·식당·숙소"]';

function googleMapsSearchUrl(place: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

export default function ScheduleMapLinks() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/planner") return;

    function enhanceScheduleRows() {
      const placeInputs = document.querySelectorAll<HTMLInputElement>(PLACE_SELECTOR);

      placeInputs.forEach((placeInput) => {
        const row = placeInput.parentElement;
        if (!row) return;

        row.classList.add("schedule-map-row");

        let mapButton = row.querySelector<HTMLButtonElement>(
          '[data-schedule-map-button="true"]',
        );

        if (!mapButton) {
          mapButton = document.createElement("button");
          mapButton.type = "button";
          mapButton.dataset.scheduleMapButton = "true";
          mapButton.className = "schedule-map-button";
          mapButton.setAttribute("aria-label", "이 장소를 Google 지도에서 보기");
          mapButton.title = "Google 지도에서 보기";
          mapButton.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path>
              <circle cx="12" cy="10" r="2.5"></circle>
            </svg>
            <span>지도</span>
          `;

          mapButton.addEventListener("click", () => {
            const place = placeInput.value.trim();
            if (!place) {
              placeInput.focus();
              return;
            }

            window.open(
              googleMapsSearchUrl(place),
              "_blank",
              "noopener,noreferrer",
            );
          });

          const deleteButton = row.querySelector<HTMLButtonElement>(
            'button[aria-label="일정 항목 삭제"]',
          );
          row.insertBefore(mapButton, deleteButton ?? null);
        }

        mapButton.disabled = placeInput.value.trim().length === 0;
      });
    }

    enhanceScheduleRows();

    const observer = new MutationObserver(enhanceScheduleRows);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const handleInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches(PLACE_SELECTOR)) return;
      enhanceScheduleRows();
    };

    document.addEventListener("input", handleInput);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleInput);
      document
        .querySelectorAll('[data-schedule-map-button="true"]')
        .forEach((button) => button.remove());
      document
        .querySelectorAll(".schedule-map-row")
        .forEach((row) => row.classList.remove("schedule-map-row"));
    };
  }, [pathname]);

  return null;
}
