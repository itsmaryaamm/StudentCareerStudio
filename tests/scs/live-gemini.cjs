// Browser test against REAL Gemini (no stand-in). The server must run WITHOUT SCS_GEMINI_BASE_URL and with a valid
// GEMINI_API_KEY. Spends ~6 AI requests and 1 upload from one throwaway student. Assertions check behaviour, not wording.
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3001";
const CODE = process.env.INVITE || "beta-code-1";
const SHOTS = process.env.SHOTS || "/tmp/claude-0/live";
require("node:fs").mkdirSync(SHOTS, { recursive: true });
const stamp = Date.now().toString(36);
const EMAIL = `live${stamp}@example.com`;
const PASSWORD = "Sup3rSecret!pass";
const results = [];
const check = (name, ok, extra = "") => {
	results.push(!!ok);
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + String(extra).slice(0, 300)}`);
	return !!ok;
};
const T = 90000;

(async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 900 },
		permissions: ["clipboard-read", "clipboard-write"],
	});
	const page = await ctx.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
	const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
	const coachBubbles = () => page.locator('[role="log"] li', { hasText: /^Coach:/ });
	const idle = async () => {
		await page
			.getByText(/Coach is thinking|Reading your file/)
			.first()
			.waitFor({ state: "hidden", timeout: T })
			.catch(() => {});
	};
	const timed = async (label, fn) => {
		const t = Date.now();
		const r = await fn();
		console.log(`      (${label}: ${((Date.now() - t) / 1000).toFixed(1)}s)`);
		return r;
	};

	// real PDF with real text, made by the browser's own PDF engine
	const pdfPage = await ctx.newPage();
	await pdfPage.setContent(
		"<h1>Layla Hassan</h1><p>B.Sc. Computer Science, King Saud University, expected May 2027.</p><h2>Experience</h2><p>Data Analyst Intern, Northwind Analytics, Summer 2025. Built a weekly KPI dashboard in Power BI used by 12 managers.</p><h2>Skills</h2><p>Python, SQL, Power BI, React</p>",
	);
	await pdfPage.pdf({ path: `${SHOTS}/layla.pdf` });
	await pdfPage.close();

	await page.goto(`${BASE}/auth/register`);
	await page.getByLabel("Name", { exact: true }).fill("Layla Hassan");
	await page.getByLabel("Email address").fill(EMAIL);
	await page.locator('input[type="password"]').first().fill(PASSWORD);
	await page.getByLabel("Invite code").fill(CODE);
	await page.getByRole("button", { name: "Create account" }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 20000 });
	check("L0 sign-up works", true);

	// ----- chat -----
	await page.goto(`${BASE}/dashboard/chat`);
	await page.getByRole("button", { name: /I understand/ }).click();
	const box = page.getByLabel("Message to your career coach");
	await box.fill(
		"I led a team of 4 students to build a campus bike-sharing app. It reached 300 users in its first month. We used TypeScript and React.",
	);
	await timed("chat turn 1", async () => {
		await page.getByRole("button", { name: "Send", exact: true }).click();
		await coachBubbles().nth(1).waitFor({ timeout: T }); // greeting + this reply
		await idle();
	});
	const reply1 = await coachBubbles().nth(1).innerText();
	check(
		"L1 the real coach answers (non-empty, not an error)",
		reply1.replace(/^Coach:\s*/, "").trim().length > 20,
		reply1,
	);
	console.log("      coach said:", reply1.replace(/\s+/g, " ").slice(0, 220));
	await page.waitForTimeout(800);
	const cardText = (await page.locator("li", { hasText: "Verify before saving" }).allInnerTexts()).join(" | ");
	check("L2 it proposes facts for review, grounded in what was said", /bike/i.test(cardText), cardText);
	check(
		"L2b nothing was invented: no numbers other than the ones given (4, 300)",
		!(cardText.match(/\d+/g) || []).some((n) => !["4", "300"].includes(n)),
		cardText,
	);
	await shot("l2-proposed");
	await page.getByRole("button", { name: "Save to profile" }).first().click();
	await page.getByText("Verified", { exact: true }).first().waitFor();
	check("L3 approving saves it as Verified", true);

	await box.fill("Which project did I just tell you about, and how many people were on my team?");
	await timed("chat turn 2 (memory)", async () => {
		await page.getByRole("button", { name: "Send", exact: true }).click();
		await coachBubbles().nth(2).waitFor({ timeout: T });
		await idle();
	});
	const reply2 = await coachBubbles().nth(2).innerText();
	console.log("      coach said:", reply2.replace(/\s+/g, " ").slice(0, 220));
	check(
		"L4 conversation memory: it remembers the bike-sharing app and team of 4",
		/bike/i.test(reply2) && /\b(4|four)\b/i.test(reply2),
		reply2,
	);
	const proposedTexts = (await page.locator("li", { hasText: "Verify before saving" }).allInnerTexts()).map((t) =>
		t.replace(/\s+/g, " "),
	);
	check(
		"L5 no near-duplicate proposals after a recall question (<= 1 new)",
		proposedTexts.length <= 1,
		proposedTexts.join(" || "),
	);
	await shot("l4-memory");

	// ----- upload -----
	await timed("PDF analysis", async () => {
		await page.locator("#chat-file").setInputFiles(`${SHOTS}/layla.pdf`);
		await page
			.getByText("Reading your file")
			.waitFor({ timeout: 10000 })
			.catch(() => {});
		await page
			.getByText(/I read layla\.pdf/)
			.first()
			.waitFor({ timeout: T });
		await idle();
	});
	await page.waitForTimeout(1200);
	const body = await page.locator("main").innerText();
	check(
		"L6 PDF upload: real summary mentions content from the PDF",
		/Northwind|Power BI|King Saud|Computer Science/i.test(body),
		body.slice(-400),
	);
	const upFacts = (await page.locator("li", { hasText: "Verify before saving" }).allInnerTexts()).join(" | ");
	check(
		"L7 PDF upload proposes facts from the document (Northwind / Power BI / degree)",
		/Northwind|Power BI|Computer Science/i.test(upFacts),
		upFacts,
	);
	check(
		"L7b no fabricated numbers from the PDF (only numbers in the PDF (12, 2025, 2027) or the chat (300) allowed)",
		!(upFacts.match(/\d{2,}/g) || []).some((n) => !["12", "2025", "2027", "300"].includes(n)),
		upFacts,
	);
	await shot("l6-upload");

	// ----- LinkedIn -----
	await page
		.getByRole("button", { name: "Save to profile" })
		.first()
		.click()
		.catch(() => {});
	await page.goto(`${BASE}/dashboard/linkedin`);
	await page.getByRole("button", { name: /Suggest a headline/ }).click();
	await timed("LinkedIn headline", () =>
		page
			.getByText(/Based on:/)
			.first()
			.waitFor({ timeout: T }),
	);
	const sug = await page.locator("ul[aria-live] li").first().innerText();
	console.log("      headline:", sug.replace(/\s+/g, " ").slice(0, 200));
	check("L8 LinkedIn suggestion has provenance ('Based on' an approved fact)", /Based on:/.test(sug), sug);
	check("L8b headline respects the 220-character limit", sug.split("\n")[0].length <= 220, sug.split("\n")[0].length);
	check(
		'L8c headline does not inflate: no "300+"/"over 300", no invented title (Lead/Manager/Founder)',
		!/300\s*\+|\b(over|nearly|almost)\s+300|\b(project lead|manager|founder|ceo)\b/i.test(sug.split("\n")[0]),
		sug.split("\n")[0],
	);
	await page.getByRole("button", { name: "Accept" }).first().click();
	await page
		.getByText(/Saved at/)
		.first()
		.waitFor({ timeout: 10000 });
	await page.getByRole("button", { name: "Copy to clipboard" }).click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	check(
		"L9 accepted headline autosaves and copies",
		clip.length > 10 && clip === (await page.locator("#li-text").inputValue()),
		clip,
	);
	await shot("l8-linkedin");

	// ----- usage accounting -----
	const usage = await page.evaluate(() => fetch("/api/openapi/scs/usage").then((r) => r.json()));
	console.log("      usage:", JSON.stringify(usage));
	check(
		"L10 allowance counted exactly: 3 chat+LinkedIn (2 chats + 1 headline) and 1 upload",
		usage.chat.used === 3 && usage.upload.used === 1,
		JSON.stringify(usage),
	);

	console.log("\nPAGE ERRORS:", errors.length ? errors : "none");
	const failed = results.filter((r) => !r).length;
	console.log(`\n${results.length - failed} passed, ${failed} failed`);
	await browser.close();
	process.exit(failed ? 1 : 0);
})().catch((e) => {
	console.error("LIVE CRASH:", e.message.split("\n").slice(0, 5).join("\n"));
	process.exit(2);
});
