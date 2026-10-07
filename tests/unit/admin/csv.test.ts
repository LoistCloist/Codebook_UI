import { describe, expect, it } from "vitest";
import { csvCell, csvResponse, toCsv } from "@/lib/admin/csv";

describe("csvCell escaping", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("abc")).toBe("abc");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(12.5)).toBe("12.5");
    expect(csvCell(true)).toBe("true");
    expect(csvCell(false)).toBe("false");
  });

  it("renders null, undefined and non-finite numbers as empty cells", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(NaN)).toBe("");
    expect(csvCell(Infinity)).toBe("");
  });

  it("quotes cells containing commas, quotes or line breaks", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });

  it("keeps an empty string empty", () => {
    expect(csvCell("")).toBe("");
  });
});

describe("csvCell formula-injection guard", () => {
  it.each(["=SUM(A1:A2)", "+1", "-1", "@cmd", "\tx"])("prefixes %j with a quote", (v) => {
    expect(csvCell(v).replace(/^"|"$/g, "").startsWith("'")).toBe(true);
    expect(csvCell(v)).toContain(`'${v}`);
  });

  it("guards and quotes at the same time", () => {
    expect(csvCell('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
    expect(csvCell("\rfoo")).toBe(`"'\rfoo"`);
  });

  it("does not touch dangerous characters that are not at the start", () => {
    expect(csvCell("a=b")).toBe("a=b");
    expect(csvCell("swerve_left")).toBe("swerve_left");
    expect(csvCell("2026-09-28T00:00:00.000Z")).toBe("2026-09-28T00:00:00.000Z");
  });
});

describe("toCsv", () => {
  it("joins header and rows with CRLF and a trailing CRLF", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          [1, null],
          ["x,y", "=1"],
        ],
      ),
    ).toBe('a,b\r\n1,\r\n"x,y",\'=1\r\n');
  });

  it("returns just the header when there are no rows", () => {
    expect(toCsv(["a"], [])).toBe("a\r\n");
  });
});

describe("csvResponse", () => {
  it("sets download and no-cache headers", async () => {
    const res = csvResponse("a\r\n", "responses.csv");
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="responses.csv"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("a\r\n");
  });
});
