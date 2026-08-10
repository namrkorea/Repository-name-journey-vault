"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { FileText, Mail } from "lucide-react";
import { downloadTravelPlanWord } from "@/lib/client/planWord";
import type { ItineraryDay, TravelPlanCreateInput } from "@/types/plan";

const EMAIL_FIELD_SELECTOR = "[data-plan-email-field]";
const BRIDGE_OWNER_KEY = "__journeyVaultPlanEmailBridgeOwner";

type BridgeWindow = Window & {
  [BRIDGE_OWNER_KEY]?: string;
};

type SaveResponse = {
  email?: { sent?: boolean; error?: string };
};

function isPlanSaveRequest(url: string, method: string): boolean {
  const pathname = new URL(url, window.location.origin).pathname;
  return (
    (pathname === "/api/plans" && method === "POST") ||
    (/^\/api\/plans\/[^/]+$/.test(pathname) && method === "PUT")
  );
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toWordPlan(body: Record<string, unknown>): Omit<TravelPlanCreateInput, "password"> {
  return {
    title: text(body.title),
    destination: text(body.destination),
    startDate: text(body.startDate),
    endDate: text(body.endDate),
    travelers: Number(body.travelers) || 0,
    budget: numberOrNull(body.budget),
    travelStyle: text(body.travelStyle),
    summary: text(body.summary),
    days: Array.isArray(body.days) ? (body.days as ItineraryDay[]) : [],
  };
}

export default function PlanEmailBridge() {
  const pathname = usePathname();
  const active =
    pathname === "/planner" || /^\/plans\/[^/]+\/edit$/.test(pathname);
  const ownerIdRef = useRef(
    `plan-email-bridge-${Math.random().toString(36).slice(2)}`,
  );
  const [ownsBridge, setOwnsBridge] = useState(false);
  const [email, setEmail] = useState("");
  const [wordFileName, setWordFileName] = useState("");
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const emailRef = useRef("");
  const wordFileNameRef = useRef("");

  useEffect(() => {
    emailRef.current = email;
  }, [email]);

  useEffect(() => {
    wordFileNameRef.current = wordFileName;
  }, [wordFileName]);

  useEffect(() => {
    if (!active) {
      setOwnsBridge(false);
      return;
    }

    const bridgeWindow = window as BridgeWindow;
    const ownerId = ownerIdRef.current;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const claimBridge = () => {
      if (cancelled) return;

      const currentOwner = bridgeWindow[BRIDGE_OWNER_KEY];
      if (!currentOwner || currentOwner === ownerId) {
        bridgeWindow[BRIDGE_OWNER_KEY] = ownerId;
        setOwnsBridge(true);
        return;
      }

      retryTimer = setTimeout(claimBridge, 120);
    };

    claimBridge();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (bridgeWindow[BRIDGE_OWNER_KEY] === ownerId) {
        delete bridgeWindow[BRIDGE_OWNER_KEY];
      }
      setOwnsBridge(false);
    };
  }, [active, pathname]);

  useEffect(() => {
    if (!active || !ownsBridge) {
      setMountNode(null);
      return;
    }

    let container: HTMLDivElement | null = null;

    const attach = () => {
      const submitButton = document.querySelector<HTMLButtonElement>(
        'form button[type="submit"]',
      );
      if (!submitButton?.parentElement) return false;

      const existingFields = Array.from(
        document.querySelectorAll<HTMLDivElement>(EMAIL_FIELD_SELECTOR),
      );

      if (existingFields.length > 0) {
        container = existingFields[0];
        existingFields.slice(1).forEach((field) => field.remove());
        setMountNode(container);
        return true;
      }

      container = document.createElement("div");
      container.dataset.planEmailField = "true";
      submitButton.parentElement.insertBefore(container, submitButton);
      setMountNode(container);
      return true;
    };

    if (!attach()) {
      const observer = new MutationObserver(() => {
        if (attach()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
        container?.remove();
        setMountNode(null);
      };
    }

    return () => {
      container?.remove();
      setMountNode(null);
    };
  }, [active, ownsBridge, pathname]);

  useEffect(() => {
    if (!active || !ownsBridge) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = (
        init?.method || (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      const planSave = isPlanSaveRequest(url, method);
      const recipientEmail = emailRef.current.trim();
      const requestedWordFileName = wordFileNameRef.current.trim();
      let nextInit = init;
      let requestBody: Record<string, unknown> | null = null;

      if (planSave && typeof init?.body === "string") {
        try {
          requestBody = JSON.parse(init.body) as Record<string, unknown>;
          nextInit = {
            ...init,
            body: JSON.stringify({ ...requestBody, recipientEmail }),
          };
        } catch {
          nextInit = init;
        }
      }

      const response = await originalFetch(input, nextInit);

      if (
        planSave &&
        response.ok &&
        (recipientEmail || requestedWordFileName)
      ) {
        const successMessages: string[] = [];
        const failureMessages: string[] = [];

        if (recipientEmail) {
          try {
            const data = (await response.clone().json()) as SaveResponse;
            if (data.email?.sent) {
              successMessages.push(`${recipientEmail} 주소로 이메일 전송 완료`);
            } else {
              failureMessages.push(
                `이메일 전송 실패: ${data.email?.error || "Gmail SMTP 설정을 확인해 주세요."}`,
              );
            }
          } catch {
            failureMessages.push("이메일 전송 결과를 확인하지 못했습니다.");
          }
        }

        if (requestedWordFileName) {
          if (!requestBody) {
            failureMessages.push("워드 문서 생성에 필요한 일정 정보를 읽지 못했습니다.");
          } else {
            try {
              const savedFileName = downloadTravelPlanWord(
                toWordPlan(requestBody),
                requestedWordFileName,
              );
              successMessages.push(`${savedFileName} 워드 문서 저장 완료`);
            } catch (caught) {
              failureMessages.push(
                `워드 문서 저장 실패: ${
                  caught instanceof Error ? caught.message : "파일을 만들지 못했습니다."
                }`,
              );
            }
          }
        }

        const lines = ["여행계획이 저장되었습니다."];
        if (successMessages.length > 0) {
          lines.push("", ...successMessages.map((message) => `✓ ${message}`));
        }
        if (failureMessages.length > 0) {
          lines.push("", ...failureMessages.map((message) => `- ${message}`));
        }
        window.alert(lines.join("\n"));
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [active, ownsBridge]);

  if (!active || !ownsBridge || !mountNode) return null;

  return createPortal(
    <div className="mt-6 space-y-3">
      <div className="rounded-2xl border border-sky-300/20 bg-sky-400/[0.07] p-4">
        <label className="block space-y-2">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-100">
            <Mail size={17} /> 이메일로 일정 보내기 · 선택사항
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="예: travel@example.com"
            autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-sky-300/60 focus:ring-2 focus:ring-sky-400/15"
          />
        </label>
        <p className="mt-2 text-xs leading-6 text-white/50">
          이메일을 입력하면 여행계획 저장 후 Gmail SMTP를 통해 바로 전송합니다.
          일정 내용과 열람 링크를 보내며 비밀번호는 이메일에 포함하지 않습니다.
          비워두면 저장만 수행합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.07] p-4">
        <label className="block space-y-2">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-violet-100">
            <FileText size={17} /> 워드 문서 저장 · 선택사항
          </span>
          <input
            type="text"
            value={wordFileName}
            onChange={(event) => setWordFileName(event.target.value)}
            placeholder="예: 후쿠오카_5일_여행계획"
            maxLength={120}
            autoComplete="off"
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/60 focus:ring-2 focus:ring-violet-400/15"
          />
        </label>
        <p className="mt-2 text-xs leading-6 text-white/50">
          파일이름을 입력하면 일정 저장이 성공한 뒤 같은 내용의 Word 문서를
          내려받습니다. <span className="text-violet-200">.docx</span> 확장자는
          자동으로 붙으며, 비워두면 워드 문서를 만들지 않습니다.
        </p>
      </div>
    </div>,
    mountNode,
  );
}
