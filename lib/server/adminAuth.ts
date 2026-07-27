import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ADMIN_COOKIE = "journey_vault_admin";
const SESSION_SECONDS = 60 * 60 * 8;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET을 32자 이상의 임의 문자열로 설정해 주세요.",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD가 설정되지 않았습니다.");
  }
  return safeEqual(input, expected);
}

export function createAdminSessionToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = randomBytes(18).toString("base64url");
  const payload = Buffer.from(`${expiresAt}:${nonce}`).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function isAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`));

  if (!cookie) return false;

  const token = decodeURIComponent(cookie.slice(ADMIN_COOKIE.length + 1));
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) {
    return false;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const [expiresAtText] = decoded.split(":");
    const expiresAt = Number(expiresAtText);

    return Number.isFinite(expiresAt) && expiresAt > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function adminSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearAdminSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
