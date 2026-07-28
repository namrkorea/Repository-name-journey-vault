import {
  pbkdf2,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST_LABEL = "SHA-256";
const NODE_DIGEST = "sha256";
const pbkdf2Async = promisify(pbkdf2);

function toBase64(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Buffer> {
  return pbkdf2Async(
    password,
    Buffer.from(salt),
    iterations,
    KEY_LENGTH,
    NODE_DIGEST,
  );
}

export async function hashPlanPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, ITERATIONS);

  return `pbkdf2_${DIGEST_LABEL}.${ITERATIONS}.${toBase64(salt)}.${toBase64(hash)}`;
}

export async function verifyPlanPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, count, saltText, hashText] = stored.split(".");
  const iterations = Number(count);

  if (
    scheme !== `pbkdf2_${DIGEST_LABEL}` ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  const expected = fromBase64(hashText);
  const salt = fromBase64(saltText);
  const actual = await derive(password, salt, iterations);

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}

export function validatePlanPassword(password: string): string | null {
  if (password.length < 4) return "비밀번호는 4자 이상 입력해 주세요.";
  if (password.length > 72) return "비밀번호는 72자 이하로 입력해 주세요.";
  return null;
}
