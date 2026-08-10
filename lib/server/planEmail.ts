import { randomUUID } from "node:crypto";
import { connect as connectTls, type TLSSocket } from "node:tls";
import type { TravelPlanCreateInput } from "@/types/plan";

type EmailPlan = Omit<TravelPlanCreateInput, "password">;

type SendPlanEmailInput = {
  to: string;
  planId: string;
  planUrl: string;
  plan: EmailPlan;
};

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;
const SMTP_TIMEOUT_MS = 15000;

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

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} 환경변수를 설정해 주세요.`);
  }
  return value;
}

function validateEmail(value: string, label: string): string {
  const email = value.trim().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${label} 이메일 주소 형식이 올바르지 않습니다.`);
  }
  return email;
}

function wrapBase64(value: string): string {
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return encoded.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildMimeMessage(input: {
  fromEmail: string;
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}): string {
  const boundary = `journey-vault-${randomUUID()}`;
  const lines = [
    `From: Journey Vault AI <${input.fromEmail}>`,
    `To: <${input.toEmail}>`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${input.messageId}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(input.html),
    `--${boundary}--`,
    "",
  ];

  return lines.join("\r\n");
}

function readSmtpResponse(socket: TLSSocket): Promise<{ code: number; text: string }> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("Gmail SMTP 연결이 예기치 않게 종료되었습니다."));
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n").filter(Boolean);
      const finalLine = lines.findLast((line) => /^\d{3} /.test(line));
      if (!finalLine) return;

      cleanup();
      resolve({ code: Number(finalLine.slice(0, 3)), text: buffer.trim() });
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Gmail SMTP 응답 시간이 초과되었습니다."));
    }, SMTP_TIMEOUT_MS);

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function sendCommand(
  socket: TLSSocket,
  command: string,
  expectedCodes: number[],
): Promise<string> {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`Gmail SMTP 오류 (${response.code}): ${response.text}`);
  }
  return response.text;
}

async function connectGmailSmtp(): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = connectTls({
      host: SMTP_HOST,
      port: SMTP_PORT,
      servername: SMTP_HOST,
      rejectUnauthorized: true,
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("Gmail SMTP 서버 연결 시간이 초과되었습니다."));
    }, SMTP_TIMEOUT_MS);

    socket.once("secureConnect", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function sendViaGmailSmtp(input: {
  fromEmail: string;
  appPassword: string;
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
}): Promise<void> {
  const socket = await connectGmailSmtp();

  try {
    const greeting = await readSmtpResponse(socket);
    if (greeting.code !== 220) {
      throw new Error(`Gmail SMTP 연결 실패 (${greeting.code}): ${greeting.text}`);
    }

    await sendCommand(socket, "EHLO journey-vault.local", [250]);
    await sendCommand(socket, "AUTH LOGIN", [334]);
    await sendCommand(
      socket,
      Buffer.from(input.fromEmail, "utf8").toString("base64"),
      [334],
    );
    await sendCommand(
      socket,
      Buffer.from(input.appPassword, "utf8").toString("base64"),
      [235],
    );
    await sendCommand(socket, `MAIL FROM:<${input.fromEmail}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${input.toEmail}>`, [250, 251]);
    await sendCommand(socket, "DATA", [354]);

    const mime = buildMimeMessage(input)
      .split("\r\n")
      .map((line) => (line.startsWith(".") ? `.${line}` : line))
      .join("\r\n");

    socket.write(`${mime}\r\n.\r\n`);
    const queued = await readSmtpResponse(socket);
    if (queued.code !== 250) {
      throw new Error(`Gmail SMTP 발송 실패 (${queued.code}): ${queued.text}`);
    }

    try {
      await sendCommand(socket, "QUIT", [221]);
    } catch {
      // 메일이 이미 Gmail 서버에 접수된 뒤 QUIT 응답이 끊겨도 발송 성공으로 처리합니다.
    }
  } finally {
    socket.end();
  }
}

export function normalizeRecipientEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const email = value.trim().slice(0, 254);
  if (!email) return "";
  return validateEmail(email, "수신자");
}

export async function sendTravelPlanEmail({
  to,
  planId,
  planUrl,
  plan,
}: SendPlanEmailInput): Promise<string> {
  const fromEmail = validateEmail(requireEnv("GMAIL_SMTP_USER"), "발신자");
  const appPassword = requireEnv("GMAIL_SMTP_APP_PASSWORD").replace(/\s+/g, "");
  if (appPassword.length !== 16) {
    throw new Error("GMAIL_SMTP_APP_PASSWORD에는 Google 앱 비밀번호 16자리를 입력해 주세요.");
  }

  const messageId = `${planId}.${Date.now()}.${randomUUID()}@journey-vault.local`;

  await sendViaGmailSmtp({
    fromEmail,
    appPassword,
    toEmail: to,
    subject: `[Journey Vault] ${plan.title}`,
    text: buildText(plan, planUrl),
    html: buildHtml(plan, planUrl),
    messageId,
  });

  return messageId;
}
