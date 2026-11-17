import { describe, expect, it } from "vitest";
import { cleanLine, cleanPhone, cleanPlain, cleanText, looksLikeEmail, safeHttpUrl } from "./text-clean";

describe("text cleaning", () => {
	it("removes tags and unfinished tags from single-line fields", () => {
		expect(cleanLine("Maya <img src=x onerror=alert(1)><script>alert(2)</script> Chen")).toBe("Maya alert(2) Chen");
		expect(cleanLine("Hi <svg onload=alert(3)")).toBe("Hi");
		expect(cleanLine("GPA > 3.5, a < b")).toBe("GPA \uFF1E 3.5, a \uFF1C b");
	});

	it("removes hidden and direction-changing characters, keeps normal text and accents", () => {
		expect(cleanText("a\u0000b​c‮d\u007Fe")).toBe("abcde");
		expect(cleanLine("Zoë  Müller\n\tCS")).toBe("Zoë Müller CS");
	});

	it("keeps line breaks in plain and free text", () => {
		expect(cleanPlain("one\n\n\n\ntwo <b>bold</b>")).toBe("one\n\ntwo bold");
		expect(cleanText("a\r\nb")).toBe("a\nb");
	});

	it("accepts only web links", () => {
		expect(safeHttpUrl("example.com/me")).toBe("https://example.com/me");
		expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
		expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
		expect(safeHttpUrl("data:text/html,<script>1</script>")).toBeNull();
		expect(safeHttpUrl("https://user:pw@example.com")).toBeNull();
		expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
		expect(safeHttpUrl("not a link")).toBeNull();
	});

	it("keeps phone numbers to phone characters", () => {
		expect(cleanPhone("+1 (416) 555-0142<script>")).toBe("+1 (416) 555-0142");
	});

	it("checks emails loosely but safely", () => {
		expect(looksLikeEmail("maya@university.edu")).toBe(true);
		expect(looksLikeEmail('"><script>@x.co')).toBe(false);
		expect(looksLikeEmail("no-at-sign")).toBe(false);
	});
});

describe("plain multi-line cleaning", () => {
	it("also neutralises leftover angle brackets", () => {
		expect(cleanPlain("Nice <b>one</b> \"'> x")).toBe("Nice one \"'\uFF1E x");
	});
});
