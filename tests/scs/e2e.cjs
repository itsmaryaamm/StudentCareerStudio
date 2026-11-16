// Browser end-to-end test of the five beta workflows, through the real UI.
// Requires: server on :3001 (SCS_BETA_INVITE_CODE=beta-code-1), stand-in Gemini on :4010, Postgres, playwright.
const { chromium } = require("playwright");
const fs = require("node:fs");
const BASE = process.env.BASE || "http://localhost:3001";
const SHOTS = process.env.SHOTS || "/tmp/claude-0/e2e";
const stamp = Date.now().toString(36);
const EMAIL = `student${stamp}@example.com`;
const PASSWORD = "Sup3rSecret!pass";
const NAME = "Layla Hassan";
const results = [];
const check = (name, ok, extra = "") => {
	results.push([name, !!ok]);
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + extra}`);
	return !!ok;
};

(async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 860 },
		acceptDownloads: true,
		permissions: ["clipboard-read", "clipboard-write"],
	});
	const page = await ctx.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));
	page.on("console", (m) => {
		if (m.type() === "error" && !/favicon|Failed to load resource.*(40[134]|429|503)/.test(m.text()))
			errors.push("console: " + m.text().slice(0, 200));
	});
	const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });

	// ===== Workflow 1: sign up -> save account -> sign back in =====
	await page.goto(`${BASE}/`);
	await page.waitForURL(/\/auth\/login/);
	check("W1 landing redirects a visitor to sign-in", true);
	await page.goto(`${BASE}/auth/register`);
	await page.getByLabel("Name", { exact: true }).fill(NAME);
	await page.getByLabel("Email address").fill(EMAIL);
	await page.locator('input[type="password"]').first().fill(PASSWORD);
	await page.getByLabel("Invite code").fill("wrong-code");
	await page.getByRole("button", { name: "Create account" }).click();
	await page.waitForTimeout(1500);
	check("W1 wrong invite code is rejected in the UI", /\/auth\/register/.test(page.url()));
	await shot("w1-wrong-code");
	await page.getByLabel("Invite code").fill("beta-code-1");
	await page.getByRole("button", { name: "Create account" }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
	check("W1 sign-up with invite code lands on the dashboard", true);
	// First sign-in is a chat-only onboarding: name -> stage -> what they have -> contact -> guided steps -> dashboard.
	await page.getByText("What should I call you?").waitFor();
	check(
		"W1 first sign-in shows only the coach chat (no navigation)",
		(await page.getByRole("link", { name: "Documents" }).count()) === 0,
	);
	await page.getByLabel("Your name").fill("Layla");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page.getByText("Which stage are you at").waitFor();
	await page.getByRole("button", { name: "A student looking for a co-op" }).click();
	await page.getByText("Do you already have any of these?").waitFor();
	check(
		"W1 the coach asks what they already have (résumé / LinkedIn / portfolio)",
		await page.getByRole("button", { name: "A LinkedIn profile" }).isVisible(),
	);
	await page.getByRole("button", { name: "A résumé" }).click();
	await page.getByRole("button", { name: "Continue" }).click();
	await page.getByText("contact details").waitFor();
	await page.getByLabel("Phone").fill("555-0100");
	await page.getByRole("button", { name: "Continue" }).click();
	await page.getByText("Let's start with your résumé").waitFor();
	check("W1 the coach starts with the document they have", true);
	await page.getByRole("button", { name: "Skip this", exact: true }).click();
	await page.getByRole("button", { name: "Go to my dashboard" }).click();
	await page.getByText("Welcome, Layla").waitFor();
	check(
		"W1 after the chat they reach the dashboard with the coach on the side",
		await page.getByRole("complementary", { name: "Career coach" }).isVisible(),
	);
	await shot("w1-onboarding");
	// sign out via settings, then sign back in
	await ctx.clearCookies();
	await page.goto(`${BASE}/dashboard`);
	await page.waitForURL(/\/auth\/login/);
	await page
		.getByLabel(/Email|Username/i)
		.first()
		.fill(EMAIL);
	await page.locator('input[type="password"]').first().fill(PASSWORD);
	await page.getByRole("button", { name: /^Sign in$/ }).click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
	check("W1 signing back in works and shows the dashboard", true);
	await shot("w1-signed-back-in");

	// ===== Workflow 2: chat with Gemini -> approve career facts -> see saved profile =====
	await page.getByRole("link", { name: "AI Career Chat" }).first().click();
	await page.getByText("Before you use the AI coach").waitFor();
	check("W2 the Gemini data notice is shown before any AI use", true);
	await shot("w2-consent");
	await page.getByRole("button", { name: /I understand/ }).click();
	const box = page.getByLabel("Message to your career coach");
	await box.waitFor();
	await box.fill("I organized a university event called Tech Week.");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page.getByText("What were you personally responsible for").first().waitFor({ timeout: 15000 });
	check("W2 the coach replies in the conversation", true);
	await page.getByText("Verify before saving").first().waitFor();
	check(
		"W2 a proposed fact appears for verification (not yet saved)",
		await page.getByText("Organized Tech Week at university").first().isVisible(),
	);
	await shot("w2-proposed");
	await box.fill("I was in charge of the speakers.");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page
		.getByText(/Earlier you said/)
		.first()
		.waitFor({ timeout: 15000 });
	check("W2 the coach remembers earlier turns of the conversation", true);
	check(
		"W2 the daily allowance counter went down",
		await page.getByText("5 of 7 messages left today").first().isVisible(),
	);
	await page.getByRole("button", { name: "Save to profile" }).first().click();
	await page.getByText("Verified", { exact: true }).first().waitFor();
	check("W2 approving saves the fact to the profile as Verified", true);
	await page.reload();
	await page.getByText("Organized Tech Week at university").first().waitFor();
	check(
		"W2 the saved profile survives a page reload",
		await page.getByText("Verified", { exact: true }).first().isVisible(),
	);
	await shot("w2-profile");
	// document analysis
	fs.writeFileSync("/tmp/claude-0/sample.pdf", "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
	await page.locator("#chat-file").setInputFiles("/tmp/claude-0/sample.pdf");
	await page
		.getByText(/A résumé for a computer science student/)
		.first()
		.waitFor({ timeout: 15000 });
	check(
		"W2 uploading a PDF returns a summary and proposes facts to review",
		await page.getByText("B.Sc. Computer Science, expected May 2027").first().isVisible(),
	);
	await shot("w2-upload");

	// ===== Workflow 3: create résumé -> edit -> download a real PDF =====
	await page.goto(`${BASE}/dashboard/documents`);
	await page.getByRole("button", { name: "Start blank" }).click();
	await page.waitForURL(/\/builder\//, { timeout: 20000 });
	check("W3 creating a résumé opens the editor", true);
	await page.getByRole("button", { name: "Education", exact: true }).click();
	await page.getByLabel("School").fill("King Saud University");
	await page.getByLabel("Degree").fill("B.Sc.");
	await page.getByLabel("Area of study").fill("Computer Science");
	await page.getByText(/Saved/).first().waitFor({ timeout: 15000 });
	await page.waitForTimeout(1800); // autosave debounce
	check("W3 the editor confirms autosave ('Saved')", await page.getByText(/Saved/).first().isVisible());
	await shot("w3-editor");
	await page.reload();
	await page.getByRole("button", { name: "Education", exact: true }).click();
	check(
		"W3 edits persisted: reloading the editor keeps the school",
		(await page
			.getByLabel("School")
			.inputValue()
			.catch(() => "")) === "King Saud University" ||
			(await page.getByText("King Saud University").first().isVisible()),
	);
	const [download] = await Promise.all([
		page.waitForEvent("download", { timeout: 60000 }),
		page
			.getByRole("button", { name: /Download PDF/ })
			.first()
			.click(),
	]);
	const pdfPath = "/tmp/claude-0/e2e/resume.pdf";
	await download.saveAs(pdfPath);
	const pdf = fs.readFileSync(pdfPath);
	check(
		"W3 the download is a real PDF (%PDF header, > 5 KB)",
		pdf.subarray(0, 5).toString() === "%PDF-" && pdf.length > 5000,
		`${pdf.length} bytes`,
	);
	const text = require("node:child_process").execFileSync("pdftotext", [pdfPath, "-"]).toString();
	check(
		"W3 the PDF contains the edited content and the student's name",
		/King Saud University/.test(text) && /Layla Hassan/.test(text),
		text.slice(0, 200),
	);
	check("W3 the PDF is named sensibly", /\.pdf$/i.test(download.suggestedFilename()), download.suggestedFilename());

	// ===== Workflow 4: résumé -> LinkedIn Studio -> generate and copy =====
	await page.goto(`${BASE}/dashboard/linkedin`);
	await page.getByRole("button", { name: "Add from my résumés" }).click();
	await page
		.getByText(/Found \d+ items? in your résumés/)
		.first()
		.waitFor({ timeout: 15000 });
	check(
		"W4 'Add from my résumés' proposes profile facts from the résumé",
		await page
			.getByText(/King Saud University/)
			.first()
			.isVisible(),
	);
	await page.getByRole("button", { name: "Save to profile" }).first().click();
	await page.waitForTimeout(800);
	await page.getByRole("button", { name: /Suggest a headline/ }).click();
	await page
		.getByText("Computer Science student building data tools people actually use")
		.first()
		.waitFor({ timeout: 15000 });
	check(
		"W4 Gemini suggestions appear, with 'Based on' provenance",
		await page
			.getByText(/Based on:/)
			.first()
			.isVisible(),
	);
	await shot("w4-suggestions");
	await page.getByRole("button", { name: "Accept" }).first().click();
	check(
		"W4 accepting puts the suggestion in the editable headline",
		(await page.locator("#li-text").inputValue()).startsWith("Computer Science student"),
	);
	await page
		.getByText(/Saved at/)
		.first()
		.waitFor({ timeout: 10000 });
	check("W4 the draft autosaves with a visible confirmation", true);
	await page.getByRole("button", { name: "Copy to clipboard" }).click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	check("W4 'Copy to clipboard' really copies the headline", clip.startsWith("Computer Science student"), clip);
	await page.reload();
	await page.waitForTimeout(800);
	check(
		"W4 the saved draft is still there after reload",
		(await page.locator("#li-text").inputValue()).startsWith("Computer Science student"),
	);

	// ===== Workflow 5: personalized career prompts for ChatGPT and Claude =====
	const before = await page.evaluate(() => fetch("/api/openapi/scs/usage").then((r) => r.json()));
	await page.goto(`${BASE}/dashboard/prompts`);
	await page.getByLabel("Roles & interests").fill("data analyst");
	await page.getByLabel("Location preferences").fill("Riyadh");
	await page.getByRole("radio", { name: "ChatGPT" }).click();
	await page.getByRole("button", { name: "Copy prompt" }).click();
	const gpt = await page.evaluate(() => navigator.clipboard.readText());
	check(
		"W5 the ChatGPT prompt includes the student's approved facts and preferences",
		/Organized Tech Week/.test(gpt) &&
			/King Saud University/.test(gpt) &&
			/data analyst/.test(gpt) &&
			/Riyadh/.test(gpt),
		gpt.slice(0, 200),
	);
	check("W5 the ChatGPT prompt tells it to browse for current info", /Use web search/.test(gpt));
	await page.getByRole("radio", { name: "Claude" }).click();
	await page.getByRole("button", { name: "Copy prompt" }).click();
	const claude = await page.evaluate(() => navigator.clipboard.readText());
	check("W5 the Claude prompt is tailored differently", /If web search is available/.test(claude) && claude !== gpt);
	await page.getByRole("checkbox", { name: /Organized Tech Week/ }).uncheck();
	await page.getByRole("button", { name: "Copy prompt" }).click();
	const trimmed = await page.evaluate(() => navigator.clipboard.readText());
	check(
		"W5 an unticked fact is NOT in the copied prompt",
		!/Organized Tech Week/.test(trimmed) && /King Saud University/.test(trimmed),
	);
	await page.getByRole("radio", { name: /Help me apply/ }).check({ force: true });
	await page.getByLabel("Paste the job post").fill("Junior data analyst at Acme.");
	await page.getByRole("button", { name: "Copy prompt" }).click();
	check(
		"W5 the 'apply' prompt embeds the pasted job post",
		/Junior data analyst at Acme/.test(await page.evaluate(() => navigator.clipboard.readText())),
	);
	await shot("w5-prompts");
	const after = await page.evaluate(() => fetch("/api/openapi/scs/usage").then((r) => r.json()));
	check(
		"W5 building prompts used none of the AI allowance",
		before.chat.used === after.chat.used && before.upload.used === after.upload.used,
		JSON.stringify([before.chat, after.chat]),
	);

	// ===== Extra: feedback, data export, account deletion (UI) =====
	await page.goto(`${BASE}/dashboard`);
	await page.getByRole("button", { name: "Send feedback" }).first().click();
	await page.getByRole("radio", { name: "5 out of 5" }).click();
	await page.getByLabel("Your message").fill("The coach felt natural. Please add Arabic.");
	await page.getByRole("button", { name: "Send", exact: true }).click();
	await page
		.getByText(/Thank you/)
		.first()
		.waitFor({ timeout: 10000 });
	check("X1 feedback can be sent from the app shell", true);
	await page.goto(`${BASE}/dashboard/settings/privacy`);
	const [exp] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Download my data" }).click(),
	]);
	const data = JSON.parse(fs.readFileSync(await exp.path(), "utf8"));
	check(
		"X2 'Download my data' returns profile, chats, résumés and feedback",
		data.careerProfile.length >= 2 &&
			data.chatMessages.length >= 4 &&
			data.resumes.length === 1 &&
			data.feedback.length === 1,
		JSON.stringify(Object.keys(data)),
	);
	await page.goto(`${BASE}/dashboard/settings/account`);
	await page
		.getByRole("button", { name: /Delete (my )?account/i })
		.first()
		.click();
	await page.getByRole("textbox").last().fill("delete");
	await page
		.getByRole("button", { name: /Delete (my )?account|Delete forever|Delete/ })
		.last()
		.click();
	await page.waitForURL((u) => !/dashboard/.test(u.pathname), { timeout: 20000 });
	check("X3 deleting the account in the UI signs the student out", true);
	const signin = await page.evaluate(
		async ({ email, password }) =>
			(
				await fetch("/api/auth/sign-in/email", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email, password }),
				})
			).status,
		{ email: EMAIL, password: PASSWORD },
	);
	check("X3 the deleted account can no longer sign in", signin !== 200, String(signin));
	console.log("\nCONSOLE/PAGE ERRORS:", errors.length ? errors : "none");
	const failed = results.filter(([, ok]) => !ok);
	console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
	await browser.close();
	process.exit(failed.length ? 1 : 0);
})().catch((e) => {
	console.error("E2E CRASH:", e.message.split("\n").slice(0, 6).join("\n"));
	process.exit(2);
});
