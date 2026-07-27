import { timingSafeEqual } from "node:crypto";

const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = "SHA-256";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: DIGEST },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPlanPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2_${DIGEST}.${ITERATIONS}.${toBase64(salt)}.${toBase64(hash)}`;
}

export async function verifyPlanPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, count, saltText, hashText] = stored.split(".");
  if (scheme !== `pbkdf2_${DIGEST}` || !count || !saltText || !hashText) return false;
  const expected = fromBase64(hashText);
  const actual = await derive(password, fromBase64(saltText), Number(count));
  return expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function validatePlanPassword(password: string): string | null {
  if (password.length < 4) return "비밀번호는 4자 이상 입력해 주세요.";
  if (password.length > 72) return "비밀번호는 72자 이하로 입력해 주세요.";
  return null;
}
