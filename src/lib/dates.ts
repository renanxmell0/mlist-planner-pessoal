import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
export const ymd = (d: Date = new Date()) => format(d, "yyyy-MM-dd");
export const fmt = (d: Date | string, f: string) => format(typeof d === "string" ? parseISO(d) : d, f, { locale: ptBR });
export const minutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export const dayOfWeek = (date: string) => parseISO(date).getDay();
