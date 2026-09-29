import { describe, expect, it } from "vitest";
import { checkRequest, fail, isJsonContentType, isSameOrigin, issueFields, ok, readJson } from "@/lib/http";

const ORIGIN = "http://localhost:3000";
const req = (headers: Record<string, string>, body = "{}") =>
  new Request(`${ORIGIN}/api/x`, { method: "POST", headers, body });

describe("isSameOrigin", () => {
  it("accepts an exact match", () => {
    expect(isSameOrigin(req({ origin: ORIGIN }), ORIGIN)).toBe(true);
    expect(isSameOrigin(req({ origin: ORIGIN }), `${ORIGIN}/some/path`)).toBe(true);
  });
  it("rejects missing, null, other and look-alike origins", () => {
    expect(isSameOrigin(req({}), ORIGIN)).toBe(false);
    expect(isSameOrigin(req({ origin: "null" }), ORIGIN)).toBe(false);
    expect(isSameOrigin(req({ origin: "https://evil.example" }), ORIGIN)).toBe(false);
    expect(isSameOrigin(req({ origin: "http://localhost:3001" }), ORIGIN)).toBe(false);
    expect(isSameOrigin(req({ origin: "https://localhost:3000" }), ORIGIN)).toBe(false);
    expect(isSameOrigin(req({ origin: "not a url" }), ORIGIN)).toBe(false);
  });
});

describe("isJsonContentType", () => {
  it("accepts application/json with or without params", () => {
    expect(isJsonContentType(req({ "content-type": "application/json" }))).toBe(true);
    expect(isJsonContentType(req({ "content-type": "Application/JSON; charset=utf-8" }))).toBe(true);
  });
  it("rejects form posts and text", () => {
    expect(isJsonContentType(req({ "content-type": "application/x-www-form-urlencoded" }))).toBe(false);
    expect(isJsonContentType(req({ "content-type": "text/plain" }))).toBe(false);
  });
});

describe("checkRequest", () => {
  it("checks origin before content type", async () => {
    const r = checkRequest(req({ origin: "https://evil.example", "content-type": "text/plain" }), ORIGIN);
    expect(r?.status).toBe(403);
    expect(await r?.json()).toEqual({ ok: false, error: "bad_origin" });
  });
  it("415 for a wrong content type", async () => {
    const r = checkRequest(req({ origin: ORIGIN, "content-type": "text/plain" }), ORIGIN);
    expect(r?.status).toBe(415);
    expect(await r?.json()).toEqual({ ok: false, error: "unsupported_media_type" });
  });
  it("null when both pass", () => {
    expect(checkRequest(req({ origin: ORIGIN, "content-type": "application/json" }), ORIGIN)).toBeNull();
  });
});

describe("responses and helpers", () => {
  it("ok / fail shapes", async () => {
    expect(await ok("/primer").json()).toEqual({ ok: true, next: "/primer" });
    const f = fail(409, "study_completed", { next: "/completed" });
    expect(f.status).toBe(409);
    expect(f.headers.get("cache-control")).toBe("no-store");
    expect(await f.json()).toEqual({ ok: false, error: "study_completed", next: "/completed" });
  });
  it("readJson reports invalid JSON", async () => {
    expect(await readJson(req({}, "{bad"))).toEqual({ ok: false });
    expect(await readJson(req({}, '{"a":1}'))).toEqual({ ok: true, data: { a: 1 } });
  });
  it("issueFields lists paths only", () => {
    expect(issueFields([{ path: ["answers", 1] }, { path: [] }, { path: ["answers", 1] }])).toEqual([
      "answers.1",
      "(root)",
    ]);
  });
});
