import { describe, expect, it } from "vitest";
import { swAllowed } from "./pwa";
describe("swAllowed", () => {
  it("bloqueia em dev", () => expect(swAllowed("mlist.vercel.app", "", false, false)).toBe(false));
  it("bloqueia prévia do Lovable", () => expect(swAllowed("id-preview--abc.lovable.app", "", true, false)).toBe(false));
  it("bloqueia com ?sw=off", () => expect(swAllowed("mlist.vercel.app", "?sw=off", true, false)).toBe(false));
  it("bloqueia em iframe", () => expect(swAllowed("mlist.vercel.app", "", true, true)).toBe(false));
  it("permite produção publicada", () => expect(swAllowed("mlist.lovable.app", "", true, false)).toBe(true));
});
