"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";

function isPlanSaveRequest(url: string, method: string): boolean {
  const pathname = new URL(url, window.location.origin).pathname;
  return (
    (pathname === "/api/plans" && method === "POST") ||
    (/^\/api\/plans\/[^/]+$/.test(pathname) && method === "PUT")
  );
}

export default function PlanEmailBridge() {
  const pathname = usePathname();
  const active =
    pathname === "/planner" || /^\/plans\/[^/]+\/edit$/.test(pathname);
  const [email, setEmail] = useState("");
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const emailRef = useRef("");

  useEffect(() => {
    emailRef.current = email;
  }, [email]);

  useEffect(() => {
    if (!active) {
      setMountNode(null);
      return;
    }

    let container: HTMLDivElement | null = null;

    const attach = () => {
      const submitButton = document.querySelector<HTMLButtonElement>(
        'form button[type="submit"]',
      );
      if (!submitButton?.parentElement) return false;

      const existing = document.querySelector<HTMLDivElement>(
        "[data-plan-email-field]",
      );
      if (existing) {
        container = existing;
        setMountNode(existing);
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
  }, [active, pathname]);

  useEffect(() => {
    if (!active) return;

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
      let nextInit = init;

      if (planSave && typeof init?.body === "string") {
        try {
          const body = JSON.parse(init.body) as Record<string, unknown>;
          nextInit = {
            ...init,
            body: JSON.stringify({ ...body, recipientEmail }),
          };
        } catch {
          nextInit = init;
        }
      }

      const response = await originalFetch(input, nextInit);

      if (planSave && recipientEmail && response.ok) {
        try {
          const data = (await response.clone().json()) as {
            email?: { sent?: boolean; error?: string };
          };

          if (data.email?.sent) {
            window.alert(
              `여행계획을 저장하고 ${recipientEmail} 주소로 이메일을 전송했습니다.`,
            );
          } else {
            window.alert(
              `여행계획은 저장되었지만 이메일 전송에 실패했습니다.\n${data.email?.error || "메일 설정을 확인해 주세요."}`,
            );
          }
        } catch {
          // 저장 응답이 JSON이 아니어도 원래 요청 처리는 계속합니다.
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [active]);

  if (!active || !mountNode) return null;

  return createPortal(
    <div className="mt-6 rounded-2xl border border-sky-300/20 bg-sky-400/[0.07] p-4">
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
        이메일을 입력하면 저장과 함께 일정 내용 및 열람 링크를 전송합니다.
        비밀번호는 보안을 위해 이메일에 포함하지 않습니다. 비워두면 저장만
        수행합니다.
      </p>
    </div>,
    mountNode,
  );
}
