import type { EncPayload } from "./types";
import { getSetting, setSetting } from "./repo";
import { db } from "./db";

interface LockConfig { salt: string; check: EncPayload; iterations: number }
let sessionKey: CryptoKey | null = null;
export const cryptoAvailable = () => typeof crypto !== "undefined" && !!crypto.subtle;
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const CHECK = "mlist-ok";

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function encryptWith(key: CryptoKey, text: string): Promise<EncPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { iv: b64(iv), data: b64(data) };
}
export async function decryptWith(key: CryptoKey, p: EncPayload) {
  const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(p.iv) as BufferSource }, key, unb64(p.data) as BufferSource);
  return new TextDecoder().decode(out);
}
export const getLock = () => getSetting<LockConfig | null>("lock", null);
export const isUnlocked = () => !!sessionKey;
export const getKey = () => sessionKey;
export const lockNow = () => { sessionKey = null; };

export async function setupLock(password: string) {
  if (!cryptoAvailable()) throw new Error("Criptografia indisponível neste navegador.");
  const salt = crypto.getRandomValues(new Uint8Array(16)); const iterations = 210000;
  const key = await derive(password, salt, iterations);
  await setSetting("lock", { salt: b64(salt), iterations, check: await encryptWith(key, CHECK) } satisfies LockConfig);
  sessionKey = key;
}
export async function unlock(password: string) {
  const cfg = await getLock(); if (!cfg) return true;
  const key = await derive(password, unb64(cfg.salt), cfg.iterations);
  try { if ((await decryptWith(key, cfg.check)) !== CHECK) return false; } catch { return false; }
  sessionKey = key; return true;
}
/** Remove o bloqueio: descriptografa entradas privadas antes (exige estar desbloqueado). */
export async function removeLock() {
  const key = sessionKey; if (!key) throw new Error("Desbloqueie primeiro.");
  const entries = await db.journal.filter((e) => !!e.enc).toArray();
  for (const e of entries) {
    const { title, content } = JSON.parse(await decryptWith(key, e.enc!));
    await db.journal.update(e.id, { title, content, enc: undefined, private: false });
  }
  await db.settings.delete("lock"); await db.settings.delete("webauthn"); sessionKey = null;
}

// WebAuthn: conveniência local para reabrir o app. Não substitui a senha para conteúdo criptografado.
export async function biometricSupported() {
  try { return typeof window !== "undefined" && !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
export async function registerBiometric() {
  const cred = (await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "MList" },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "mlist", displayName: "MList" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" }, timeout: 60000,
  } })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Cancelado"); await setSetting("webauthn", b64(cred.rawId));
}
export async function verifyBiometric() {
  const id = await getSetting<string | null>("webauthn", null); if (!id) return false;
  try { const r = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: "public-key", id: unb64(id) as BufferSource }], userVerification: "required", timeout: 60000 } }); return !!r; } catch { return false; }
}
