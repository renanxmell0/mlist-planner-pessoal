/** Único ponto de registro do service worker. Nunca registra em dev, iframe ou prévias do Lovable. */
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
export function swAllowed(hostname: string, search: string, prod: boolean, inIframe: boolean): boolean {
  const h = hostname.toLowerCase();
  if (!prod || inIframe || new URLSearchParams(search).get("sw") === "off") return false;
  if (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h)) {
    const label = h.split(".")[0] ?? "";
    if (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label)) return false;
  }
  if (h === "id-preview--f6f698f5-0dbb-4150-8ae8-a441ae47f4b6.lovable.app") return false;
  for (const d of ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) if (h === d || h.endsWith(`.${d}`)) return false;
  return true;
}
async function unregisterApp() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => (r.active ?? r.installing ?? r.waiting)?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
}
export function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inIframe = true; try { inIframe = window.self !== window.top; } catch { /* cross-origin */ }
  if (!swAllowed(window.location.hostname, window.location.search, import.meta.env.PROD, inIframe)) { void unregisterApp(); return; }
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
}
