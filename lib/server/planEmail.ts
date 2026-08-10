import { getFirestoreDb } from "@/lib/server/firebaseAdmin";
import type { TravelPlanCreateInput } from "@/types/plan";

type EmailPlan = Omit<TravelPlanCreateInput, "password">;

type SendPlanEmailInput = {
  to: string;
  planId: string;
  planUrl: string;
  plan: EmailPlan;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBudget(value: number | null): string {
  if (value === null) return "미입력";
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function buildHtml(plan: EmailPlan, planUrl: string): string {
  const days = plan.days
    .map((day, dayIndex) => {
      const items = day.items
        .map(
          (item) => `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;vertical-align:top;">${escapeHtml(item.time || "--:--")}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;vertical-align:top;">${escapeHtml(item.category)}</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
                <strong>${escapeHtml(item.place || "장소 미정")}</strong>
                ${item.notes ? `<div style="margin-top:4px;color:#64748b;line-height:1.55;">${escapeHtml(item.notes)}</div>` : ""}
              </td>
            </tr>`,
        )
        .join("");

      return `
        <section style="margin-top:24px;">
          <div style="font-size:12px;font-weight:700;color:#0284c7;">DAY ${dayIndex + 1}</div>
          <h3 style="margin:4px 0 4px;font-size:18px;color:#0f172a;">${escapeHtml(day.title || `${dayIndex + 1}일차`)}</h3>
          <div style="margin-bottom:10px;font-size:13px;color:#64748b;">${escapeHtml(day.date || "")}</div>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;color:#1e293b;">
            <tbody>${items || '<tr><td style="padding:10px;color:#64748b;">등록된 일정이 없습니다.</td></tr>'}</tbody>
          </table>
        </section>`;
    })
    .join("");

  return `<!doctype html>
  <html lang="ko">
    <body style="margin:0;background:#f1f5f9;font-family:Arial,'Noto Sans KR',sans-serif;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;padding:28px 14px;">
        <div style="border-radius:22px;background:#ffffff;padding:28px;box-shadow:0 12px 36px rgba(15,23,42,.08);">
          <div style="font-size:11px;font-weight:800;letter-spacing:.18em;color:#0284c7;">JOURNEY VAULT AI</div>
          <h1 style="margin:8px 0 6px;font-size:26px;line-height:1.3;">${escapeHtml(plan.title)}</h1>
          <div style="color:#475569;">${escapeHtml(plan.destination)}</div>

          <table role="presentation" style="width:100%;margin-top:22px;border-collapse:separate;border-spacing:8px;font-size:13px;">
            <tbody>
              <tr>
                <td style="padding:14px;border-radius:14px;background:#f8fafc;"><div style="color:#64748b;">여행 기간</div><strong>${escapeHtml(plan.startDate)} ~ ${escapeHtml(plan.endDate)}</strong></td>
                <td style="padding:14px;border-radius:14px;background:#f8fafc;"><div style="color:#64748b;">여행 인원</div><strong>${plan.travelers}명</strong></td>
              </tr>
              <tr>
                <td style="padding:14px;border-radius:14px;background:#f8fafc;"><div style="color:#64748b;">예산</div><strong>${escapeHtml(formatBudget(plan.budget))}</strong></td>
                <td style="padding:14px;border-radius:14px;background:#f8fafc;"><div style="color:#64748b;">여행 성향</div><strong>${escapeHtml(plan.travelStyle || "자유여행")}</strong></td>
              </tr>
            </tbody>
          </table>

          ${
            plan.summary
              ? `<div style="margin-top:20px;padding:16px;border-radius:14px;background:#f8fafc;line-height:1.65;white-space:pre-wrap;">${escapeHtml(plan.summary)}</div>`
              : ""
          }

          ${days}

          <div style="margin-top:28px;text-align:center;">
            <a href="${escapeHtml(planUrl)}" style="display:inline-block;padding:13px 22px;border-radius:14px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:700;">저장된 일정 열기</a>
          </div>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.65;color:#64748b;text-align:center;">
            일정 열람 비밀번호는 보안을 위해 이메일에 포함하지 않았습니다.<br />작성자에게 별도로 전달받으세요.
          </p>
        </div>
      </div>
    </body>
  </html>`;
}

function buildText(plan: EmailPlan, planUrl: string): string {
  const days = plan.days
    .map(
      (day, index) =>
        `DAY ${index + 1} ${day.date} ${day.title}\n${day.items
          .map(
            (item) =>
              `- ${item.time || "--:--"} [${item.category}] ${item.place || "장소 미정"}${item.notes ? ` / ${item.notes}` : ""}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");

  return `${plan.title}\n${plan.destination}\n${plan.startDate} ~ ${plan.endDate}\n여행 인원: ${plan.travelers}명\n예산: ${formatBudget(plan.budget)}\n\n${plan.summary}\n\n${days}\n\n저장된 일정 열기: ${planUrl}\n\n열람 비밀번호는 이메일에 포함하지 않았습니다. 작성자에게 별도로 전달받으세요.`;
}

export function normalizeRecipientEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const email = value.trim().slice(0, 254);
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("이메일 주소 형식이 올바르지 않습니다.");
  }
  return email;
}

export async function sendTravelPlanEmail({
  to,
  planId,
  planUrl,
  plan,
}: SendPlanEmailInput): Promise<string> {
  const collectionName = process.env.FIREBASE_MAIL_COLLECTION?.trim() || "mail";
  const db = getFirestoreDb();

  const doc = await db.collection(collectionName).add({
    to: [to],
    message: {
      subject: `[Journey Vault] ${plan.title}`,
      html: buildHtml(plan, planUrl),
      text: buildText(plan, planUrl),
    },
    metadata: {
      source: "journey-vault",
      planId,
      requestedAt: new Date().toISOString(),
    },
  });

  return doc.id;
}
