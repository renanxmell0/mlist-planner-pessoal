import { toast } from "sonner";
import { db } from "./db";

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;
export async function requestNotifications() { if (!notificationsSupported()) return "unsupported" as const; return Notification.requestPermission(); }

/** Verifica lembretes vencidos enquanto o app está aberto. */
export async function checkReminders() {
  const now = new Date().toISOString().slice(0, 16);
  const due = await db.reminders.filter((r) => !r.fired && !r.done && r.at <= now).toArray();
  for (const r of due) {
    toast(`⏰ ${r.title}`, { description: "Lembrete do MList", duration: 10000 });
    try { if (notificationsSupported() && Notification.permission === "granted") new Notification("MList", { body: r.title, icon: "/icons/icon-192.png" }); } catch { /* alguns navegadores só permitem via service worker */ }
    await db.reminders.update(r.id, { fired: true });
  }
}
